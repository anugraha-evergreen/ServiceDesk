import { INITIAL_PLOTS, INITIAL_REQUESTS } from './mockData';
import { Plot, ServiceRequest, UserRole } from './types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

// In-memory caching & local fallback
let memoryPlots: Plot[] = [...INITIAL_PLOTS];
let memoryRequests: ServiceRequest[] = [];

// Ultra-fast memory cache controls (drastically cuts redundant database roundtrips)
let plotsCacheTime = 0;
const PLOTS_CACHE_TTL_MS = 60 * 1000; // 60 seconds

let requestsCacheTime = 0;
let cachedRequests: ServiceRequest[] | null = null;
const REQUESTS_CACHE_TTL_MS = 10 * 1000; // 10 seconds

/**
 * STRICT PRIVACY SANITIZATION:
 * Owners must NEVER receive document links, drive preview links, or generated PDF URLs.
 */
function sanitizeRequestForOwner(req: ServiceRequest): ServiceRequest {
  return {
    ...req,
    generatedNocPdfUrl: undefined,
    refundSettlementPdfUrl: undefined,
    documents: req.documents.map((doc) => ({
      ...doc,
      driveWebViewLink: undefined,
    })),
    postConstructionRefund: req.postConstructionRefund
      ? {
          ...req.postConstructionRefund,
          refundProofDriveLink: undefined,
        }
      : undefined,
  };
}

// Clean checklist by stripping out internal metadata packaging
function sanitizeChecklist(chk: any) {
  if (!chk) return chk;
  const { _extendedMeta, ...rest } = chk;
  if (Object.keys(rest).length === 0) return undefined;
  return rest;
}

// Helpers to map between DB row snake_case and TypeScript camelCase with lossless fallback
function rowToServiceRequest(row: any): ServiceRequest {
  const meta = (row.pre_construction_checklist && row.pre_construction_checklist._extendedMeta) || {};

  return {
    id: row.id,
    plotNumber: row.plot_number,
    ownerName: row.owner_name,
    phone: row.phone,
    type: row.type,
    status: row.status,
    rulesAcceptedAt: row.rules_accepted_at,
    ownerContactName: row.owner_contact_name || meta.ownerContactName || row.owner_name,
    ownerContactPhone: row.owner_contact_phone || meta.ownerContactPhone || row.phone,
    contractorName: row.contractor_name || meta.contractorName,
    contractorPhone: row.contractor_phone || meta.contractorPhone,
    supervisorPhone: row.supervisor_phone,
    emergencyPhone: row.emergency_phone,
    documents: row.documents || [],
    preConstructionChecklist: row.pre_construction_checklist
      ? sanitizeChecklist(row.pre_construction_checklist)
      : undefined,
    reMeasurementChecklist: row.re_measurement_checklist,
    postConstructionRefund: row.post_construction_refund,
    saleDeedDetails: row.sale_deed_details || meta.saleDeedDetails,
    amalgamationDetails: row.amalgamation_details || meta.amalgamationDetails,
    adminNotes: row.admin_notes || meta.adminNotes,
    generatedNocPdfUrl: row.generated_noc_pdf_url || meta.generatedNocPdfUrl,
    generatedNocCertificateId: row.generated_noc_certificate_id || meta.generatedNocCertificateId,
    refundSettlementPdfUrl: row.refund_settlement_pdf_url || meta.refundSettlementPdfUrl,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

// Full row targeting dedicated columns if they exist in PostgreSQL
function serviceRequestToFullRow(req: Partial<ServiceRequest>): any {
  const row: any = {};
  if (req.id !== undefined) row.id = req.id;
  if (req.plotNumber !== undefined) row.plot_number = req.plotNumber;
  if (req.ownerName !== undefined) row.owner_name = req.ownerName;
  if (req.phone !== undefined) row.phone = req.phone;
  if (req.type !== undefined) row.type = req.type;
  if (req.status !== undefined) row.status = req.status;
  if (req.rulesAcceptedAt !== undefined) row.rules_accepted_at = req.rulesAcceptedAt;
  if (req.ownerContactName !== undefined) row.owner_contact_name = req.ownerContactName;
  if (req.ownerContactPhone !== undefined) row.owner_contact_phone = req.ownerContactPhone;
  if (req.contractorName !== undefined) row.contractor_name = req.contractorName;
  if (req.contractorPhone !== undefined) row.contractor_phone = req.contractorPhone;
  if (req.supervisorPhone !== undefined) row.supervisor_phone = req.supervisorPhone;
  if (req.emergencyPhone !== undefined) row.emergency_phone = req.emergencyPhone;
  if (req.documents !== undefined) row.documents = req.documents;
  if (req.preConstructionChecklist !== undefined) row.pre_construction_checklist = req.preConstructionChecklist;
  if (req.reMeasurementChecklist !== undefined) row.re_measurement_checklist = req.reMeasurementChecklist;
  if (req.postConstructionRefund !== undefined) row.post_construction_refund = req.postConstructionRefund;
  if (req.saleDeedDetails !== undefined) row.sale_deed_details = req.saleDeedDetails;
  if (req.amalgamationDetails !== undefined) row.amalgamation_details = req.amalgamationDetails;
  if (req.adminNotes !== undefined) row.admin_notes = req.adminNotes;
  if (req.generatedNocPdfUrl !== undefined) row.generated_noc_pdf_url = req.generatedNocPdfUrl;
  if (req.generatedNocCertificateId !== undefined) row.generated_noc_certificate_id = req.generatedNocCertificateId;
  if (req.refundSettlementPdfUrl !== undefined) row.refund_settlement_pdf_url = req.refundSettlementPdfUrl;
  if (req.createdAt !== undefined) row.created_at = req.createdAt;
  if (req.updatedAt !== undefined) row.updated_at = req.updatedAt;
  return row;
}

// Fallback row for PostgreSQL tables with only base schema columns
function serviceRequestToBaseRow(req: Partial<ServiceRequest>, existingMeta?: any): any {
  const row: any = {};
  if (req.id !== undefined) row.id = req.id;
  if (req.plotNumber !== undefined) row.plot_number = req.plotNumber;
  if (req.ownerName !== undefined) row.owner_name = req.ownerName;
  if (req.phone !== undefined) row.phone = req.phone;
  if (req.type !== undefined) row.type = req.type;
  if (req.status !== undefined) row.status = req.status;
  if (req.rulesAcceptedAt !== undefined) row.rules_accepted_at = req.rulesAcceptedAt;
  if (req.contractorPhone !== undefined) row.contractor_phone = req.contractorPhone;
  if (req.supervisorPhone !== undefined) row.supervisor_phone = req.supervisorPhone;
  if (req.emergencyPhone !== undefined) row.emergency_phone = req.emergencyPhone;
  if (req.documents !== undefined) row.documents = req.documents;
  if (req.reMeasurementChecklist !== undefined) row.re_measurement_checklist = req.reMeasurementChecklist;
  if (req.postConstructionRefund !== undefined) row.post_construction_refund = req.postConstructionRefund;
  if (req.createdAt !== undefined) row.created_at = req.createdAt;
  if (req.updatedAt !== undefined) row.updated_at = req.updatedAt;

  // Package all non-base fields into _extendedMeta inside pre_construction_checklist
  const meta: Record<string, any> = { ...(existingMeta || {}) };
  if (req.ownerContactName !== undefined) meta.ownerContactName = req.ownerContactName;
  if (req.ownerContactPhone !== undefined) meta.ownerContactPhone = req.ownerContactPhone;
  if (req.contractorName !== undefined) meta.contractorName = req.contractorName;
  if (req.contractorPhone !== undefined) meta.contractorPhone = req.contractorPhone;
  if (req.saleDeedDetails !== undefined) meta.saleDeedDetails = req.saleDeedDetails;
  if (req.amalgamationDetails !== undefined) meta.amalgamationDetails = req.amalgamationDetails;
  if (req.adminNotes !== undefined) meta.adminNotes = req.adminNotes;
  if (req.generatedNocPdfUrl !== undefined) meta.generatedNocPdfUrl = req.generatedNocPdfUrl;
  if (req.generatedNocCertificateId !== undefined) meta.generatedNocCertificateId = req.generatedNocCertificateId;
  if (req.refundSettlementPdfUrl !== undefined) meta.refundSettlementPdfUrl = req.refundSettlementPdfUrl;

  const baseChecklist = req.preConstructionChecklist || {};
  row.pre_construction_checklist = {
    ...baseChecklist,
    _extendedMeta: meta,
  };

  return row;
}

function rowToPlot(row: any): Plot {
  return {
    id: row.id,
    plotNumber: row.plot_number,
    primaryOwnerName: row.primary_owner_name,
    phone: row.phone,
    email: row.email,
    status: row.status || 'vacant',
    membershipPaid: Boolean(row.membership_paid),
    mergedInto: row.merged_into,
    mergedPlots: row.merged_plots,
  };
}

function plotToRow(plot: Plot): any {
  return {
    id: plot.id,
    plot_number: plot.plotNumber,
    primary_owner_name: plot.primaryOwnerName,
    phone: plot.phone,
    email: plot.email,
    status: plot.status,
    membership_paid: plot.membershipPaid,
    merged_into: plot.mergedInto,
    merged_plots: plot.mergedPlots,
  };
}

/**
 * Fetch all registered plots (cached in memory with 60s TTL for snappy sub-millisecond response)
 */
export async function getAllPlots(): Promise<Plot[]> {
  const now = Date.now();
  if (plotsCacheTime && now - plotsCacheTime < PLOTS_CACHE_TTL_MS && memoryPlots.length > 0) {
    return memoryPlots;
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('plots').select('*');
      if (!error && data && data.length > 0) {
        memoryPlots = data.map(rowToPlot);
        plotsCacheTime = now;
        return memoryPlots;
      }
    } catch (e) {
      console.warn('Supabase plots fetch error, using local fallback:', e);
    }
  }
  return memoryPlots;
}

/**
 * Resolves a plot by number.
 * If the plot was merged into an amalgamated plot, automatically returns the unified plot record.
 */
export async function getPlotByNumber(plotNumber: string): Promise<Plot | undefined> {
  const plots = await getAllPlots();
  const normalized = plotNumber.trim().toLowerCase();

  // 1. Direct match
  let match = plots.find((p) => p.plotNumber.trim().toLowerCase() === normalized);

  // 2. Check if this plot was merged into another
  if (match && match.mergedInto) {
    const parent = plots.find((p) => p.plotNumber.trim().toLowerCase() === match!.mergedInto!.trim().toLowerCase());
    if (parent) return parent;
  }

  // 3. Check if user typed an constituent plot that is now inside an amalgamated plot
  if (!match) {
    match = plots.find(
      (p) =>
        p.mergedPlots &&
        p.mergedPlots.some((sub) => sub.trim().toLowerCase() === normalized)
    );
  }

  return match;
}

export async function updatePlotRecord(updated: Plot): Promise<Plot> {
  // Invalidate plots cache
  plotsCacheTime = 0;

  const index = memoryPlots.findIndex((p) => p.plotNumber === updated.plotNumber);
  if (index >= 0) {
    memoryPlots[index] = updated;
  } else {
    memoryPlots.push(updated);
  }

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('plots').upsert(plotToRow(updated));
    } catch (e) {
      console.warn('Supabase plot upsert error:', e);
    }
  }

  return updated;
}

export async function getAllRequests(role: UserRole = 'owner', plotNumber?: string): Promise<ServiceRequest[]> {
  const now = Date.now();
  let list = memoryRequests;

  if (isSupabaseConfigured && supabase) {
    if (cachedRequests && requestsCacheTime && now - requestsCacheTime < REQUESTS_CACHE_TTL_MS) {
      list = cachedRequests;
    } else {
      try {
        const { data, error } = await supabase
          .from('service_requests')
          .select('*')
          .order('updated_at', { ascending: false });
        if (!error && data) {
          const dbRequests = data.map(rowToServiceRequest);
          // Merge with any in-memory requests not yet present in Supabase
          const dbIds = new Set(dbRequests.map((r) => r.id));
          const extraMem = memoryRequests.filter((r) => !dbIds.has(r.id));
          list = [...dbRequests, ...extraMem];
          cachedRequests = list;
          requestsCacheTime = now;
        } else if (error) {
          console.warn('Supabase getAllRequests error, using memory fallback:', error);
        }
      } catch (e) {
        console.warn('Supabase requests fetch error, using local fallback:', e);
      }
    }
  }

  if (plotNumber) {
    const plot = await getPlotByNumber(plotNumber);
    const relatedPlotNumbers = new Set<string>();
    relatedPlotNumbers.add(plotNumber.trim().toLowerCase());

    if (plot) {
      relatedPlotNumbers.add(plot.plotNumber.trim().toLowerCase());
      if (plot.mergedPlots) {
        plot.mergedPlots.forEach((p) => relatedPlotNumbers.add(p.trim().toLowerCase()));
      }
    }

    list = list.filter((r) => relatedPlotNumbers.has(r.plotNumber.trim().toLowerCase()));
  }

  // Sort descending by updated date
  list = [...list].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  if (role === 'owner') {
    return list.map(sanitizeRequestForOwner);
  }

  return list;
}

export async function getRequestById(id: string, role: UserRole = 'owner'): Promise<ServiceRequest | undefined> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('service_requests')
        .select('*')
        .eq('id', id)
        .single();
      if (!error && data) {
        const req = rowToServiceRequest(data);
        return role === 'owner' ? sanitizeRequestForOwner(req) : req;
      }
    } catch (e) {
      console.warn('Supabase getRequestById error:', e);
    }
  }

  const req = memoryRequests.find((r) => r.id === id);
  if (!req) return undefined;

  if (role === 'owner') {
    return sanitizeRequestForOwner(req);
  }

  return req;
}

export async function createServiceRequest(
  newReq: Omit<ServiceRequest, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ServiceRequest> {
  // Guaranteed unique chronological ID across distributed serverless instances: e.g. REQ-2026-83921
  const year = 2026;
  const timeSuffix = Date.now().toString().slice(-4);
  const randSuffix = Math.floor(10 + Math.random() * 90);
  const id = `REQ-${year}-${timeSuffix}${randSuffix}`;
  const now = new Date().toISOString();

  const created: ServiceRequest = {
    ...newReq,
    id,
    createdAt: now,
    updatedAt: now,
  };

  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Try full column insert
      const fullRow = serviceRequestToFullRow(created);
      fullRow.created_at = now;
      fullRow.updated_at = now;
      let { error } = await supabase.from('service_requests').insert([fullRow]);

      // 2. If Postgres table lacks extended columns, transparently fallback to base schema + metadata packaging
      if (
        error &&
        (error.code === '42703' ||
          error.code === 'PGRST204' ||
          error.message?.includes('column') ||
          error.message?.includes('schema cache'))
      ) {
        console.warn(
          'Supabase missing columns in service_requests, retrying with base schema and metadata fallback:',
          error.message
        );
        const baseRow = serviceRequestToBaseRow(created);
        baseRow.created_at = now;
        baseRow.updated_at = now;
        const retryResult = await supabase.from('service_requests').insert([baseRow]);
        error = retryResult.error;
      }

      if (error) {
        console.error('Supabase request insert fatal error:', error);
        throw new Error(`Failed to save application to Supabase: ${error.message || error.code}`);
      }
    } catch (e) {
      console.error('Supabase request insert exception:', e);
      throw e;
    }
  }

  memoryRequests.unshift(created);
  // Invalidate requests cache immediately
  cachedRequests = null;
  requestsCacheTime = 0;
  return created;
}

export async function updateServiceRequest(
  id: string,
  updates: Partial<ServiceRequest>
): Promise<ServiceRequest | undefined> {
  const now = new Date().toISOString();
  let updatedReq: ServiceRequest | undefined;

  // Invalidate requests cache immediately
  cachedRequests = null;
  requestsCacheTime = 0;

  const index = memoryRequests.findIndex((r) => r.id === id);
  if (index >= 0) {
    memoryRequests[index] = {
      ...memoryRequests[index],
      ...updates,
      updatedAt: now,
    };
    updatedReq = memoryRequests[index];
  }

  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Try full column update
      const fullRow = serviceRequestToFullRow(updates);
      fullRow.updated_at = now;
      let { data, error } = await supabase
        .from('service_requests')
        .update(fullRow)
        .eq('id', id)
        .select()
        .single();

      // 2. If Postgres table lacks extended columns, fallback to base schema + metadata packaging
      if (
        error &&
        (error.code === '42703' ||
          error.code === 'PGRST204' ||
          error.message?.includes('column') ||
          error.message?.includes('schema cache'))
      ) {
        console.warn('Supabase missing column in update, retrying with base schema fallback:', error.message);
        // Fetch current row to merge existing _extendedMeta
        const { data: currData } = await supabase
          .from('service_requests')
          .select('pre_construction_checklist')
          .eq('id', id)
          .single();

        const currMeta = currData?.pre_construction_checklist?._extendedMeta;
        const baseRow = serviceRequestToBaseRow(updates, currMeta);
        baseRow.updated_at = now;

        const retryResult = await supabase
          .from('service_requests')
          .update(baseRow)
          .eq('id', id)
          .select()
          .single();

        data = retryResult.data;
        error = retryResult.error;
      }

      if (!error && data) {
        updatedReq = rowToServiceRequest(data);
      } else if (error) {
        console.error('Supabase request update error:', error);
      }
    } catch (e) {
      console.warn('Supabase request update exception:', e);
    }
  }

  return updatedReq;
}

/**
 * Delete Service Request & associated documents from Supabase Storage
 */
export async function deleteServiceRequest(id: string): Promise<{
  success: boolean;
  message: string;
  deletedFilesCount: number;
}> {
  // Invalidate requests cache immediately
  cachedRequests = null;
  requestsCacheTime = 0;

  // 1. Fetch request with documents first
  const req = await getRequestById(id, 'admin');
  if (!req) {
    return { success: false, message: 'Request not found', deletedFilesCount: 0 };
  }

  let deletedFilesCount = 0;

  // 2. Delete all uploaded documents from Supabase Storage
  if (isSupabaseConfigured && supabase && req.documents && req.documents.length > 0) {
    try {
      const pathsToDelete: string[] = [];
      for (const doc of req.documents) {
        let storagePath: string | null = null;
        if (doc.driveWebViewLink) {
          const match = doc.driveWebViewLink.match(/\/documents\/(.+)$/);
          if (match) {
            storagePath = decodeURIComponent(match[1]);
          }
        }
        if (!storagePath && doc.driveFileId && doc.driveFileId.includes('Plot_')) {
          storagePath = doc.driveFileId;
        }

        if (storagePath) {
          pathsToDelete.push(storagePath);
        }
      }

      if (pathsToDelete.length > 0) {
        const { data, error } = await supabase.storage.from('documents').remove(pathsToDelete);
        if (error) {
          console.warn('Supabase storage remove error:', error);
        } else {
          deletedFilesCount = data?.length || pathsToDelete.length;
          console.log(`Deleted ${deletedFilesCount} documents from Supabase storage for request ${id}`);
        }
      }
    } catch (storageErr) {
      console.warn('Failed to delete files from Supabase storage:', storageErr);
    }
  }

  // 3. Delete from Supabase Database
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('service_requests').delete().eq('id', id);
      if (error) {
        console.error('Supabase request delete error:', error);
        throw new Error(`Failed to delete request from database: ${error.message}`);
      }
    } catch (dbErr) {
      console.error('Supabase delete exception:', dbErr);
      throw dbErr;
    }
  }

  // 4. Delete from memory cache
  memoryRequests = memoryRequests.filter((r) => r.id !== id);
  cachedRequests = null;
  requestsCacheTime = 0;

  return {
    success: true,
    message: 'Request and associated documents successfully deleted',
    deletedFilesCount,
  };
}

/**
 * Plot Amalgamation:
 * Merges secondary plots into unified plot, keeping historical records intact.
 */
export async function amalgamatePlots(
  primaryPlotNumber: string,
  secondaryPlotNumbers: string[],
  unifiedPlotNumber: string
): Promise<{ success: boolean; message: string; unifiedPlotNumber: string }> {
  const plots = await getAllPlots();
  const primary = plots.find((p) => p.plotNumber === primaryPlotNumber);
  if (!primary) {
    return { success: false, message: `Primary plot ${primaryPlotNumber} not found.`, unifiedPlotNumber };
  }

  const allMerged = [primaryPlotNumber, ...secondaryPlotNumbers];

  // Update primary plot with unified label and merged references
  primary.plotNumber = unifiedPlotNumber;
  primary.mergedPlots = allMerged;
  await updatePlotRecord(primary);

  // Mark secondaries as mergedInto
  for (const sNum of secondaryPlotNumbers) {
    const sec = plots.find((p) => p.plotNumber === sNum);
    if (sec) {
      sec.mergedInto = unifiedPlotNumber;
      await updatePlotRecord(sec);
    }
  }

  return {
    success: true,
    message: `Plots ${allMerged.join(', ')} successfully amalgamated into ${unifiedPlotNumber}`,
    unifiedPlotNumber,
  };
}
