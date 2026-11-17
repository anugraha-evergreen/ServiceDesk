import { INITIAL_PLOTS, INITIAL_REQUESTS } from './mockData';
import { Plot, ServiceRequest, UserRole } from './types';

let memoryPlots: Plot[] = [...INITIAL_PLOTS];
let memoryRequests: ServiceRequest[] = [...INITIAL_REQUESTS];

const STORAGE_KEY_PLOTS = 'aeowa_plots_v2';
const STORAGE_KEY_REQUESTS = 'aeowa_requests_v2';

function getStoredPlots(): Plot[] {
  if (typeof window === 'undefined') return memoryPlots;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PLOTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_PLOTS, JSON.stringify(INITIAL_PLOTS));
      return INITIAL_PLOTS;
    }
    return JSON.parse(raw);
  } catch {
    return memoryPlots;
  }
}

function setStoredPlots(plots: Plot[]): void {
  memoryPlots = plots;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_PLOTS, JSON.stringify(plots));
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
  }
}

function getStoredRequests(): ServiceRequest[] {
  if (typeof window === 'undefined') return memoryRequests;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REQUESTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(INITIAL_REQUESTS));
      return INITIAL_REQUESTS;
    }
    return JSON.parse(raw);
  } catch {
    return memoryRequests;
  }
}

function setStoredRequests(requests: ServiceRequest[]): void {
  memoryRequests = requests;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(requests));
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
  }
}

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

export function getAllPlots(): Plot[] {
  return getStoredPlots();
}

/**
 * Resolves a plot by number.
 * If the plot was merged into an amalgamated plot, automatically returns the unified plot record.
 */
export function getPlotByNumber(plotNumber: string): Plot | undefined {
  const plots = getStoredPlots();
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

export function updatePlotRecord(updated: Plot): Plot {
  const plots = getStoredPlots();
  const index = plots.findIndex((p) => p.plotNumber === updated.plotNumber);
  if (index >= 0) {
    plots[index] = updated;
  } else {
    plots.push(updated);
  }
  setStoredPlots(plots);
  return updated;
}

export function getAllRequests(role: UserRole = 'owner', plotNumber?: string): ServiceRequest[] {
  let list = getStoredRequests();
  if (plotNumber) {
    const plot = getPlotByNumber(plotNumber);
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

export function getRequestById(id: string, role: UserRole = 'owner'): ServiceRequest | undefined {
  const list = getStoredRequests();
  const req = list.find((r) => r.id === id);
  if (!req) return undefined;

  if (role === 'owner') {
    return sanitizeRequestForOwner(req);
  }

  return req;
}

export function createServiceRequest(
  newReq: Omit<ServiceRequest, 'id' | 'createdAt' | 'updatedAt'>
): ServiceRequest {
  const list = getStoredRequests();
  const count = list.length + 101;
  const id = `REQ-2026-${String(count).padStart(3, '0')}`;
  const now = new Date().toISOString();

  const created: ServiceRequest = {
    ...newReq,
    id,
    createdAt: now,
    updatedAt: now,
  };

  list.unshift(created);
  setStoredRequests(list);
  return created;
}

export function updateServiceRequest(
  id: string,
  updates: Partial<ServiceRequest>
): ServiceRequest | undefined {
  const list = getStoredRequests();
  const index = list.findIndex((r) => r.id === id);
  if (index < 0) return undefined;

  const updated: ServiceRequest = {
    ...list[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  list[index] = updated;
  setStoredRequests(list);
  return updated;
}

/**
 * Plot Amalgamation:
 * Merges secondary plots into unified plot, keeping historical records intact.
 */
export function amalgamatePlots(
  primaryPlotNumber: string,
  secondaryPlotNumbers: string[],
  unifiedPlotNumber: string
): { success: boolean; message: string; unifiedPlotNumber: string } {
  const plots = getStoredPlots();
  const primary = plots.find((p) => p.plotNumber === primaryPlotNumber);
  if (!primary) {
    return { success: false, message: `Primary plot ${primaryPlotNumber} not found.`, unifiedPlotNumber };
  }

  const allMerged = [primaryPlotNumber, ...secondaryPlotNumbers];

  // Update primary plot with unified label and merged references
  primary.plotNumber = unifiedPlotNumber;
  primary.mergedPlots = allMerged;

  // Mark secondaries as mergedInto
  for (const sNum of secondaryPlotNumbers) {
    const sec = plots.find((p) => p.plotNumber === sNum);
    if (sec) {
      sec.mergedInto = unifiedPlotNumber;
    }
  }

  setStoredPlots(plots);
  return {
    success: true,
    message: `Plots ${allMerged.join(', ')} successfully amalgamated into ${unifiedPlotNumber}`,
    unifiedPlotNumber,
  };
}
