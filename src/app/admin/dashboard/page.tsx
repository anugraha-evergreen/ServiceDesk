'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/session';
import { ServiceRequest } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import {
  ShieldCheck,
  Search,
  HardHat,
  Compass,
  FileText,
  Layers,
  ArrowRight,
  Banknote,
  Clock,
  Printer,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Download,
  Loader2,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { session, loading } = useSession();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);

  // Unified Filter: Default to 'pending' (all pending action upfront per requirement!)
  type FilterKey = 'pending' | 'construction' | 'other' | 'approved' | 'completed' | 'all';
  const [activeFilter, setActiveFilter] = useState<FilterKey>('pending');
  const [search, setSearch] = useState('');
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && (!session || session.role !== 'admin')) {
      router.push('/');
      return;
    }

    loadRequests();
  }, [session, loading, router]);

  const loadRequests = async () => {
    // 1. Instant Cache Hydration: Read from sessionStorage for snappy 0ms paint
    try {
      const cached = sessionStorage.getItem('aelra_cache_admin_requests');
      if (cached) {
        setRequests(JSON.parse(cached));
        setFetching(false);
      }
    } catch {}

    try {
      const res = await fetch('/api/requests?role=admin');
      const data = await res.json();
      if (data.requests) {
        setRequests(data.requests);
        try {
          sessionStorage.setItem('aelra_cache_admin_requests', JSON.stringify(data.requests));
        } catch {}
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  };

  const [approvingId, setApprovingId] = useState<string | null>(null);

  const handleQuickApprove = async (req: ServiceRequest) => {
    setApprovingId(req.id);
    try {
      let bodyData: any = { role: 'admin', status: 'approved' };
      if (req.type === 'construction_noc') {
        const existingChk = req.preConstructionChecklist;
        bodyData = {
          role: 'admin',
          status: 'approved',
          preConstructionChecklist: {
            ...(existingChk || {}),
            docsVerified: true,
            membershipFeeCleared: true,
            maintenanceDuesCleared: true,
            securityDepositPaid: true,
            depositTransactionId: existingChk?.depositTransactionId?.trim() || `AEOWA-DEP-${req.plotNumber}`,
            depositDate: existingChk?.depositDate || new Date().toISOString().split('T')[0],
            depositBank: existingChk?.depositBank || 'Verified via Escrow',
            labourerToiletInstalled: true,
            bescomWaterArrangementVerified: true,
            labourersRegistered: true,
            verifiedBy: 'Hon. General Secretary, AEOWA',
            verifiedAt: new Date().toISOString(),
          },
          generatedNocCertificateId: req.generatedNocCertificateId || `AEOWA/NOC/2026/${req.plotNumber}`,
          generatedNocPdfUrl: `/api/pdf/noc?requestId=${req.id}&role=admin`,
        };
      } else if (req.type === 'sale_deed' || req.type === 'plot_amalgamation') {
        bodyData = { role: 'admin', status: 'completed' };
      }

      const res = await fetch(`/api/requests/${req.id}?role=admin`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin',
        },
        body: JSON.stringify(bodyData),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || 'Failed to approve request');
      }
      const data = await res.json();
      const updatedReq = data.request;

      setRequests((prev) => prev.map((r) => (r.id === req.id ? updatedReq : r)));
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('aelra_cache_admin_requests');
      }
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Error approving request');
    } finally {
      setApprovingId(null);
    }
  };

  // Grouped Counts: What's Pending (Not Done) vs What's Done
  const isPendingReq = (r: ServiceRequest) =>
    r.status === 'submitted' || r.status === 'under_review' || r.status === 'checklist_pending';

  const pendingConstructionCount = requests.filter(
    (r) => r.type === 'construction_noc' && isPendingReq(r)
  ).length;

  const pendingOtherCount = requests.filter(
    (r) => r.type !== 'construction_noc' && isPendingReq(r)
  ).length;

  const totalPendingCount = pendingConstructionCount + pendingOtherCount;

  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const completedCount = requests.filter((r) => r.status === 'completed').length;

  const totalEscrowDeposits = requests.reduce((sum, r) => {
    if (r.preConstructionChecklist?.securityDepositPaid) return sum + 20000;
    return sum;
  }, 0);

  // Filtered List logic across ALL requests
  const filteredRequests = requests.filter((r) => {
    let matchesFilter = true;
    if (activeFilter === 'pending') {
      matchesFilter = isPendingReq(r);
    } else if (activeFilter === 'construction') {
      matchesFilter = r.type === 'construction_noc';
    } else if (activeFilter === 'other') {
      matchesFilter = r.type !== 'construction_noc';
    } else if (activeFilter === 'approved') {
      matchesFilter = r.status === 'approved';
    } else if (activeFilter === 'completed') {
      matchesFilter = r.status === 'completed';
    }

    const q = search.toLowerCase();
    const matchesSearch =
      r.plotNumber.toLowerCase().includes(q) ||
      r.ownerName.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q);

    return matchesFilter && matchesSearch;
  });

  if (loading || fetching) {
    return (
      <div className="py-20 text-center text-sm text-gray-500 animate-pulse">
        Loading AEOWA Management Queue...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & External Actions on the outside */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-emerald-100 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>AEOWA Managing Committee</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            Association Requests &amp; Compliance Queue
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Filterable request list with pending actions shown upfront.
          </p>
        </div>

        {/* External Quick Actions on the outside */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/pdf/noc?requestId=blank&blank=true&type=construction_noc&role=admin"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition whitespace-nowrap"
            title="Download blank physical copy to fill manually post-printing"
          >
            <Printer className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Print Blank Construction NOC</span>
          </a>

          <a
            href="/api/pdf/noc?requestId=blank&blank=true&type=remeasurement_noc&role=admin"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-xl bg-white hover:bg-blue-50 text-blue-800 border border-blue-300 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition whitespace-nowrap"
            title="Download blank physical survey copy to fill manually post-printing"
          >
            <Printer className="w-4 h-4 text-blue-700 shrink-0" />
            <span>Print Blank Re-Measurement NOC</span>
          </a>

          <Link
            href="/admin/refunds"
            className="px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition whitespace-nowrap"
          >
            <Banknote className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>Deposit Refund Ledger</span>
          </Link>
        </div>
      </div>

      {/* DASHBOARD SUMMARY: 3-CARD BALANCED METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* CARD 1: PENDING ACTION */}
        <div className="bg-amber-50/50 rounded-2xl p-4 sm:p-5 border border-amber-200/80 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-700" />
              <span>Pending Action</span>
            </h2>
            <span className="whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold text-xs shrink-0">
              {totalPendingCount} Pending
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setActiveFilter('pending')}
              className="p-3 bg-white rounded-xl border border-amber-200 hover:border-amber-400 hover:shadow-xs transition text-left cursor-pointer flex flex-col justify-between"
            >
              <div>
                <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                  <HardHat className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span className="truncate">Construction</span>
                </span>
                <span className="text-xl font-black text-amber-700 mt-1 block font-mono">
                  {pendingConstructionCount}
                </span>
              </div>
              <span className="text-[10px] text-amber-800 font-medium mt-1 leading-tight line-clamp-1">
                Awaiting checklist &amp; deposit
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('other')}
              className="p-3 bg-white rounded-xl border border-amber-200 hover:border-amber-400 hover:shadow-xs transition text-left cursor-pointer flex flex-col justify-between"
            >
              <div>
                <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span className="truncate">Other</span>
                </span>
                <span className="text-xl font-black text-amber-700 mt-1 block font-mono">
                  {pendingOtherCount}
                </span>
              </div>
              <span className="text-[10px] text-amber-800 font-medium mt-1 leading-tight line-clamp-1">
                Surveys &amp; deeds
              </span>
            </button>
          </div>
        </div>

        {/* CARD 2: APPROVED & SETTLED */}
        <div className="bg-emerald-50/50 rounded-2xl p-4 sm:p-5 border border-emerald-200/80 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>Approved &amp; Settled</span>
            </h2>
            <span className="whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold text-xs shrink-0">
              {approvedCount + completedCount} Total
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setActiveFilter('approved')}
              className="p-3 bg-white rounded-xl border border-emerald-200 hover:border-emerald-400 hover:shadow-xs transition text-left cursor-pointer flex flex-col justify-between"
            >
              <div>
                <span className="text-[11px] font-bold text-emerald-900 block truncate">
                  Approved NOCs
                </span>
                <span className="text-xl font-black text-emerald-700 mt-1 block font-mono">
                  {approvedCount}
                </span>
              </div>
              <span className="text-[10px] text-emerald-600 font-medium mt-1">
                Work active on site
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('completed')}
              className="p-3 bg-white rounded-xl border border-emerald-200 hover:border-emerald-400 hover:shadow-xs transition text-left cursor-pointer flex flex-col justify-between"
            >
              <div>
                <span className="text-[11px] font-bold text-blue-900 block truncate">
                  Completed
                </span>
                <span className="text-xl font-black text-blue-700 mt-1 block font-mono">
                  {completedCount}
                </span>
              </div>
              <span className="text-[10px] text-blue-600 font-medium mt-1">
                Refunds settled
              </span>
            </button>
          </div>
        </div>

        {/* CARD 3: SECURITY DEPOSIT ESCROW */}
        <div className="bg-slate-50/70 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-emerald-700" />
              <span>Security Deposit Escrow</span>
            </h2>
            <span className="whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs shrink-0">
              Active Escrow
            </span>
          </div>

          <Link
            href="/admin/refunds"
            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-emerald-400 hover:shadow-xs transition text-left block group"
          >
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-600 block">
                  Total Deposits Under Custody
                </span>
                <span className="text-xl font-black text-slate-900 mt-1 block font-mono">
                  ₹{totalEscrowDeposits.toLocaleString('en-IN')}
                </span>
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5">
                Ledger &rarr;
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium mt-1.5 block">
              Held in Association custody for active construction plots
            </span>
          </Link>
        </div>
      </div>

      {/* SEARCH & FILTER BAR (Clean search with active filter indicator) */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Plot #, Owner Name, or Request ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-emerald-600 focus:bg-white transition"
          />
        </div>

        {/* Active Filter State & Reset */}
        <div className="flex items-center gap-2 shrink-0">
          {activeFilter !== 'all' ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Filtered by:</span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 text-xs font-bold inline-flex items-center gap-1">
                {activeFilter === 'pending' && `Pending Action (${totalPendingCount})`}
                {activeFilter === 'construction' && 'Construction Checklists'}
                {activeFilter === 'other' && 'Other Requests'}
                {activeFilter === 'approved' && 'Approved NOCs'}
                {activeFilter === 'completed' && 'Completed / Settled'}
              </span>
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className="text-xs text-emerald-800 hover:text-emerald-950 font-bold underline cursor-pointer ml-1"
              >
                Show All ({requests.length})
              </button>
            </div>
          ) : (
            <span className="text-xs text-gray-500 font-medium px-1">
              Showing all {requests.length} requests
            </span>
          )}
        </div>
      </div>

      {/* UNIFIED REQUESTS LIST */}
      <div className="space-y-3">
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center text-gray-500 text-xs">
            No requests found matching &quot;{activeFilter}&quot;.
          </div>
        ) : (
          filteredRequests.map((req) => {
            const chk = req.preConstructionChecklist;
            const isNocReady =
              chk?.docsVerified &&
              chk?.membershipFeeCleared &&
              chk?.maintenanceDuesCleared &&
              chk?.securityDepositPaid &&
              chk?.depositTransactionId &&
              chk?.labourerToiletInstalled &&
              chk?.bescomWaterArrangementVerified &&
              chk?.labourersRegistered;

            return (
              <div
                key={req.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 hover:border-emerald-300 shadow-2xs hover:shadow-xs transition space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        req.type === 'construction_noc'
                          ? 'bg-emerald-100 text-emerald-800'
                          : req.type === 'remeasurement_noc'
                          ? 'bg-blue-100 text-blue-800'
                          : req.type === 'sale_deed'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {req.type === 'construction_noc' && <HardHat className="w-4 h-4" />}
                      {req.type === 'remeasurement_noc' && <Compass className="w-4 h-4" />}
                      {req.type === 'sale_deed' && <FileText className="w-4 h-4" />}
                      {req.type === 'plot_amalgamation' && <Layers className="w-4 h-4" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm sm:text-base text-gray-900">
                          Plot No. {req.plotNumber}
                        </span>
                        <span className="text-[11px] font-mono text-gray-400">({req.id})</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        Owner: <strong>{req.ownerName}</strong> • Phone: +91 {req.phone}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <StatusBadge status={req.status} />
                  </div>
                </div>

                {/* Sub-Details Pill */}
                <div className="text-xs text-gray-600 bg-gray-50/70 p-3 rounded-xl border border-gray-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-800">
                      {req.type === 'construction_noc' && '🏗️ Construction NOC Application'}
                      {req.type === 'remeasurement_noc' && '📐 Boundary Re-Measurement & Survey'}
                      {req.type === 'sale_deed' && '📜 Sale Deed Transfer Registration'}
                      {req.type === 'plot_amalgamation' && '🧩 Plot Amalgamation Application'}
                    </span>
                    <span>•</span>
                    <span>
                      Submitted:{' '}
                      {new Date(req.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {req.type === 'construction_noc' && (
                    <div className="flex items-center gap-2">
                      {chk?.securityDepositPaid ? (
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded whitespace-nowrap">
                          ₹20k Deposit Cleared (UTR: {chk.depositTransactionId || 'Logged'})
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded whitespace-nowrap">
                          ₹20k Deposit Pending
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Footer */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    {req.type === 'construction_noc' && isNocReady && (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        Checklist complete — Pre-filled NOC PDF Unlocked
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {req.status !== 'approved' && req.status !== 'completed' ? (
                      <button
                        type="button"
                        disabled={approvingId === req.id}
                        onClick={() => handleQuickApprove(req)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-600/70 text-white shadow-xs transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                      >
                        {approvingId === req.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>{approvingId === req.id ? 'Approving...' : '1-Click Approve'}</span>
                      </button>
                    ) : (
                      <span className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Approved</span>
                      </span>
                    )}

                    {req.type === 'construction_noc' &&
                      (req.status === 'approved' || req.status === 'completed' || isNocReady) && (
                        <a
                          href={`/api/pdf/noc?requestId=${req.id}&role=admin`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs transition flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Download PDF</span>
                        </a>
                      )}

                    <Link
                      href={`/admin/requests/${req.id}`}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <span>
                        {req.status !== 'approved' && req.status !== 'completed'
                          ? 'Review Details'
                          : 'View Record'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
