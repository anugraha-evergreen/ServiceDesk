import { INITIAL_PLOTS, INITIAL_REQUESTS } from './mockData';
import { Plot, ServiceRequest, UserRole } from './types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

// In-memory caching & local fallback
let memoryPlots: Plot[] = [...INITIAL_PLOTS];
let memoryRequests: ServiceRequest[] = [...INITIAL_REQUESTS];

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

// Helpers to map between DB row snake_case and TypeScript camelCase
function rowToServiceRequest(row: any): ServiceRequest {
  return {
    id: row.id,
    plotNumber: row.plot_number,
    ownerName: row.owner_name,
    phone: row.phone,
    type: row.type,
    status: row.status,
    rulesAcceptedAt: row.rules_accepted_at,
    ownerContactName: row.owner_contact_name,
    ownerContactPhone: row.owner_contact_phone,
    contractorName: row.contractor_name,
    contractorPhone: row.contractor_phone,
    supervisorPhone: row.supervisor_phone,
    emergencyPhone: row.emergency_phone,
    documents: row.documents || [],
    preConstructionChecklist: row.pre_construction_checklist,
    reMeasurementChecklist: row.re_measurement_checklist,
    postConstructionRefund: row.post_construction_refund,
    saleDeedDetails: row.sale_deed_details,
    amalgamationDetails: row.amalgamation_details,
    adminNotes: row.admin_notes,
    generatedNocPdfUrl: row.generated_noc_pdf_url,
    generatedNocCertificateId: row.generated_noc_certificate_id,
    refundSettlementPdfUrl: row.refund_settlement_pdf_url,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

function serviceRequestToRow(req: Partial<ServiceRequest>): any {
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
  if (req.updatedAt !== undefined) row.updated_at = req.updatedAt;
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
 * Fetch all registered plots (from Supabase if configured, or memory fallback)
 */
export async function getAllPlots(): Promise<Plot[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('plots').select('*');
      if (!error && data && data.length > 0) {
        return data.map(rowToPlot);
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
  let list = memoryRequests;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('service_requests')
        .select('*')
        .order('updated_at', { ascending: false });
      if (!error && data && data.length > 0) {
        list = data.map(rowToServiceRequest);
      }
    } catch (e) {
      console.warn('Supabase requests fetch error, using local fallback:', e);
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
  const count = memoryRequests.length + 101;
  const id = `REQ-2026-${String(count).padStart(3, '0')}`;
  const now = new Date().toISOString();

  const created: ServiceRequest = {
    ...newReq,
    id,
    createdAt: now,
    updatedAt: now,
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const dbRow = serviceRequestToRow(created);
      dbRow.created_at = now;
      const { error } = await supabase.from('service_requests').insert([dbRow]);
      if (error) console.error('Supabase request insert error:', error);
    } catch (e) {
      console.warn('Supabase request insert exception:', e);
    }
  }

  memoryRequests.unshift(created);
  return created;
}

export async function updateServiceRequest(
  id: string,
  updates: Partial<ServiceRequest>
): Promise<ServiceRequest | undefined> {
  const now = new Date().toISOString();
  let updatedReq: ServiceRequest | undefined;

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
      const dbRow = serviceRequestToRow(updates);
      dbRow.updated_at = now;
      const { data, error } = await supabase
        .from('service_requests')
        .update(dbRow)
        .eq('id', id)
        .select()
        .single();
      if (!error && data) {
        updatedReq = rowToServiceRequest(data);
      }
    } catch (e) {
      console.warn('Supabase request update error:', e);
    }
  }

  return updatedReq;
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
