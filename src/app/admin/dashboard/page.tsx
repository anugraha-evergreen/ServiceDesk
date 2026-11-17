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
      router.push('/admin/login');
      return;
    }

    loadRequests();
  }, [session, loading, router]);

  const loadRequests = async () => {
    setFetching(true);
    try {
      const res = await fetch('/api/requests?role=admin');
      const data = await res.json();
      if (data.requests) setRequests(data.requests);
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
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
            <span>AEOWA Management Committee</span>
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

      {/* DASHBOARD SUMMARY: WHAT'S DONE vs WHAT'S NOT DONE (Grouped correctly per requirement) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* GROUP 1: PENDING ACTION (WHAT'S NOT DONE YET) */}
        <div className="bg-amber-50/50 rounded-2xl p-4 sm:p-5 border border-amber-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-700" />
              <span>Pending Action (What&apos;s Not Done Yet)</span>
            </h2>
            {/* Single line pill with whitespace-nowrap so it NEVER breaks onto 2 lines */}
            <span className="whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold text-xs shrink-0">
              {totalPendingCount} Pending
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setActiveFilter('pending')}
              className="p-3 bg-white rounded-xl border border-amber-200 hover:border-amber-400 hover:shadow-xs transition text-left cursor-pointer flex flex-col justify-between"
            >
              <div>
                <span className="text-[11px] font-bold text-amber-900 block flex items-center gap-1">
                  <HardHat className="w-3.5 h-3.5 text-amber-700" />
                  Construction Checklists
                </span>
                <span className="text-xl font-black text-amber-700 mt-1 block font-mono">
                  {pendingConstructionCount}
                </span>
              </div>
              <span className="text-[10px] text-amber-800 font-medium mt-1">
                Awaiting checklist &amp; deposit verification
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('other')}
              className="p-3 bg-white rounded-xl border border-amber-200 hover:border-amber-400 hover:shadow-xs transition text-left cursor-pointer flex flex-col justify-between"
            >
              <div>
                <span className="text-[11px] font-bold text-amber-900 block flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-amber-700" />
                  Other Requests
                </span>
                <span className="text-xl font-black text-amber-700 mt-1 block font-mono">
                  {pendingOtherCount}
                </span>
              </div>
              <span className="text-[10px] text-amber-800 font-medium mt-1">
                Surveys, deeds &amp; amalgamations
              </span>
            </button>
          </div>
        </div>

        {/* GROUP 2: WHAT'S DONE & FINANCIALS (APPROVED & SETTLED) */}
        <div className="bg-emerald-50/50 rounded-2xl p-4 sm:p-5 border border-emerald-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>Approved &amp; Settled (What&apos;s Done)</span>
            </h2>
            <span className="whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold text-xs shrink-0">
              {approvedCount + completedCount} Done
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setActiveFilter('approved')}
              className="p-3 bg-white rounded-xl border border-emerald-200 hover:border-emerald-400 hover:shadow-xs transition text-left cursor-pointer"
            >
              <span className="text-[11px] font-bold text-emerald-900 block">
                Approved NOCs
              </span>
              <span className="text-xl font-black text-emerald-700 mt-1 block font-mono">
                {approvedCount}
              </span>
              <span className="text-[10px] text-emerald-600">Work active</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('completed')}
              className="p-3 bg-white rounded-xl border border-emerald-200 hover:border-emerald-400 hover:shadow-xs transition text-left cursor-pointer"
            >
              <span className="text-[11px] font-bold text-blue-900 block">
                Completed
              </span>
              <span className="text-xl font-black text-blue-700 mt-1 block font-mono">
                {completedCount}
              </span>
              <span className="text-[10px] text-blue-600">Refunds settled</span>
            </button>

            <Link
              href="/admin/refunds"
              className="p-3 bg-white rounded-xl border border-emerald-200 hover:border-emerald-400 hover:shadow-xs transition text-left block"
            >
              <span className="text-[11px] font-bold text-gray-700 block">
                Escrow Held
              </span>
              <span className="text-xl font-black text-gray-900 mt-1 block font-mono">
                ₹{(totalEscrowDeposits / 1000).toFixed(0)}k
              </span>
              <span className="text-[10px] text-gray-500">Security deposits</span>
            </Link>
          </div>
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

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/requests/${req.id}`}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white shadow-2xs transition flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <span>Open Review Console</span>
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
