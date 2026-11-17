'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/session';
import { Plot, ServiceRequest } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Building2,
  HardHat,
  Compass,
  FileText,
  Layers,
  Clock,
  Shield,
  FileCheck2,
  Calendar,
  Lock,
  Pencil,
  Trash2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

export default function OwnerDashboardPage() {
  const router = useRouter();
  const { session, loading } = useSession();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [plot, setPlot] = useState<Plot | null>(null);
  const [fetching, setFetching] = useState(true);

  // Deletion modal state
  const [deleteConfirmReq, setDeleteConfirmReq] = useState<ServiceRequest | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!session || session.role !== 'owner')) {
      router.push('/');
      return;
    }

    if (session?.plotNumber) {
      loadData(session.plotNumber);
    }
  }, [session, loading, router]);

  const loadData = async (plotNum: string) => {
    // 1. Instant Cache Hydration: Read from sessionStorage if present for 0ms initial paint
    const cacheKey = `aelra_cache_owner_${plotNum.trim().toLowerCase()}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.requests) setRequests(parsed.requests);
        if (parsed.plot) setPlot(parsed.plot);
        setFetching(false);
      }
    } catch {}

    try {
      // 2. Ultra-fast parallel network revalidation
      const [plotRes, reqRes] = await Promise.all([
        fetch('/api/plots'),
        fetch(`/api/requests?role=owner&plotNumber=${encodeURIComponent(plotNum)}`),
      ]);

      const [plotData, reqData] = await Promise.all([plotRes.json(), reqRes.json()]);

      let matchedPlot: Plot | null = null;
      if (plotData.plots) {
        matchedPlot =
          plotData.plots.find(
            (p: Plot) =>
              p.plotNumber.toLowerCase() === plotNum.toLowerCase() ||
              (p.mergedPlots && p.mergedPlots.includes(plotNum))
          ) || null;
        if (matchedPlot) setPlot(matchedPlot);
      }

      const freshRequests = reqData.requests || [];
      setRequests(freshRequests);

      // Save to cache for instant 0ms subsequent navigations
      try {
        sessionStorage.setItem(
          cacheKey,
          JSON.stringify({ plot: matchedPlot, requests: freshRequests })
        );
      } catch {}
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!deleteConfirmReq || !session?.plotNumber) return;
    setDeleting(true);
    setDeleteError(null);

    const targetId = deleteConfirmReq.id;

    // Optimistically remove from state immediately for snappy response
    const prevRequests = [...requests];
    setRequests((prev) => prev.filter((r) => r.id !== targetId));

    try {
      const res = await fetch(
        `/api/requests/${targetId}?role=owner&plotNumber=${encodeURIComponent(session.plotNumber)}`,
        { method: 'DELETE' }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        // Rollback optimistic state on failure
        setRequests(prevRequests);
        throw new Error(data.error || 'Failed to delete request');
      }

      // Update sessionStorage cache
      const cacheKey = `aelra_cache_owner_${session.plotNumber.trim().toLowerCase()}`;
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          parsed.requests = (parsed.requests || []).filter((r: ServiceRequest) => r.id !== targetId);
          sessionStorage.setItem(cacheKey, JSON.stringify(parsed));
        }
      } catch {}

      setDeleteConfirmReq(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete application';
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  if (loading || fetching) {
    return (
      <div className="py-20 text-center text-sm text-gray-500 animate-pulse">
        Loading plot details & compliance records...
      </div>
    );
  }

  // Construction Security Escrow: Only show if applied for Construction NOC and not refunded yet
  const constructionNocReq = requests.find((r) => r.type === 'construction_noc');
  const isRefundSettled =
    constructionNocReq?.postConstructionRefund &&
    constructionNocReq.postConstructionRefund.refundStatus !== 'pending';
  const showEscrowBadge = !!constructionNocReq && !isRefundSettled;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Plot Profile Header Card */}
      <div className="bg-gradient-to-r from-emerald-800 to-green-800 rounded-3xl p-5 sm:p-7 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-700/80 text-emerald-200 text-xs font-medium">
              <span>AEOWA Plot Console</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Plot No. {session?.plotNumber}
            </h1>
            <p className="text-xs text-emerald-100 font-medium">
              Registered Owner: {session?.ownerName}
            </p>
            {session?.wasAmalgamated && (
              <p className="text-[11px] text-emerald-200 font-medium">
                Note: You logged in with original plot #{session.originalPlotEntered}, resolved to unified amalgamated record.
              </p>
            )}
          </div>

          {showEscrowBadge && (
            <div className="flex flex-wrap gap-2 text-xs">
              <div className="px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10">
                <span className="text-emerald-200 block text-[10px] font-semibold uppercase tracking-wider">
                  Construction Security Escrow
                </span>
                <span className="font-bold text-sm">₹20,000 (Refundable)</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Strict Privacy Protection Notice */}
      <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-start gap-3">
        <Shield className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-950 space-y-0.5">
          <p className="font-bold">Strict Privacy & Document Confidentiality Enforced</p>
          <p className="text-emerald-800 leading-relaxed">
            As a plot owner, you can raise requests, submit required documents, and monitor live review
            status badges. Submitted files and generated certificates are kept confidential for
            AEOWA Management Committee verification.
          </p>
        </div>
      </div>

      {/* 4 Clean Action Cards: Choose What You Need */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
            Choose What You Need
          </h2>
          <span className="text-xs text-gray-500">Tap an option to proceed</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/owner/construction-noc"
            className="p-4 bg-white rounded-2xl border border-emerald-200 hover:border-emerald-500 hover:shadow-xs transition group text-left flex flex-col justify-between"
          >
            <div className="p-2 w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 mb-2 group-hover:scale-105 transition">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-xs sm:text-sm text-gray-900 block group-hover:text-emerald-800">
                Construction NOC
              </span>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Mandatory rules, ₹20k deposit & building plan upload
              </p>
            </div>
          </Link>

          <Link
            href="/owner/remeasurement-noc"
            className="p-4 bg-white rounded-2xl border border-gray-200 hover:border-blue-400 hover:shadow-xs transition group text-left flex flex-col justify-between"
          >
            <div className="p-2 w-9 h-9 rounded-xl bg-blue-100 text-blue-800 mb-2 group-hover:scale-105 transition">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-xs sm:text-sm text-gray-900 block group-hover:text-blue-800">
                Re-Measurement
              </span>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Request site survey & boundary demarcation
              </p>
            </div>
          </Link>

          <Link
            href="/owner/sale-deed"
            className="p-4 bg-white rounded-2xl border border-gray-200 hover:border-amber-400 hover:shadow-xs transition group text-left flex flex-col justify-between"
          >
            <div className="p-2 w-9 h-9 rounded-xl bg-amber-100 text-amber-800 mb-2 group-hover:scale-105 transition">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-xs sm:text-sm text-gray-900 block group-hover:text-amber-800">
                Sale Deed Upload
              </span>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Ownership transfer & title deed recording
              </p>
            </div>
          </Link>

          <Link
            href="/owner/amalgamation"
            className="p-4 bg-white rounded-2xl border border-gray-200 hover:border-purple-400 hover:shadow-xs transition group text-left flex flex-col justify-between"
          >
            <div className="p-2 w-9 h-9 rounded-xl bg-purple-100 text-purple-800 mb-2 group-hover:scale-105 transition">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-xs sm:text-sm text-gray-900 block group-hover:text-purple-800">
                Amalgamate Plots
              </span>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Merge multiple adjacent plots into one
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Submitted Requests List */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
            Your Requests & Status Badges
          </h2>
          <span className="text-xs text-gray-500">{requests.length} requests on record</span>
        </div>

        {requests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-3">
            <FileCheck2 className="w-10 h-10 text-gray-400 mx-auto" />
            <h3 className="font-bold text-gray-800 text-sm">No Active Requests</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              You haven&apos;t raised any requests for Plot #{session?.plotNumber} yet. Tap one of the
              options above to submit your request.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-xs space-y-3 hover:border-emerald-300 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {req.id}
                    </span>
                    <span className="font-bold text-sm text-gray-900">
                      {req.type === 'construction_noc' && 'Construction NOC Application'}
                      {req.type === 'remeasurement_noc' && 'Boundary Re-Measurement NOC'}
                      {req.type === 'sale_deed' && 'Sale Deed & Title Registration'}
                      {req.type === 'plot_amalgamation' && 'Plot Amalgamation Request'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={req.status} />

                    {req.status !== 'approved' && req.status !== 'completed' ? (
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={
                            req.type === 'construction_noc'
                              ? `/owner/construction-noc?edit=${req.id}`
                              : req.type === 'remeasurement_noc'
                              ? `/owner/remeasurement-noc?edit=${req.id}`
                              : req.type === 'sale_deed'
                              ? `/owner/sale-deed?edit=${req.id}`
                              : `/owner/amalgamation?edit=${req.id}`
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold transition cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Edit</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteConfirmReq(req);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition cursor-pointer"
                          title="Withdraw and delete this request and its files from storage"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Delete</span>
                        </button>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-50 border border-gray-200 text-gray-500 text-[11px] font-medium">
                        <Lock className="w-3 h-3 text-gray-400" />
                        <span>Locked (Approved)</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Submission Meta */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 pt-1 border-t border-gray-100">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Submitted: {new Date(req.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  {req.contractorName && (
                    <span>Contractor: <strong>{req.contractorName}</strong></span>
                  )}
                  {req.rulesAcceptedAt && (
                    <span className="text-emerald-700 font-medium">
                      ✓ Construction Rules (16 Nov 2026) Accepted
                    </span>
                  )}
                </div>

                {/* Uploaded Documents Badges (STRICT: no download links for owner) */}
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-gray-700">
                      Uploaded Documents ({req.documents.length})
                    </span>
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-emerald-600" />
                      Encrypted in storage (Admin Access Only)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {req.documents.map((doc) => (
                      <span
                        key={doc.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-xs text-gray-700"
                      >
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span className="font-medium">{doc.label || doc.fileName}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Pre-construction checklist progress */}
                {req.type === 'construction_noc' && (
                  <div className="text-xs text-gray-600 flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-700">Checklist Status:</span>
                    {req.status === 'approved' || req.status === 'completed' ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        ✓ All 7 Pre-Construction Items Cleared by Association
                      </span>
                    ) : (
                      <span className="text-amber-700">
                        Pending Managing Committee Verification (Deposit UTR, BESCOM, worker toilet & membership)
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Application Confirmation Modal */}
      {deleteConfirmReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-gray-900">
                  Delete Application #{deleteConfirmReq.id}?
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Are you sure you want to delete this application for Plot #{deleteConfirmReq.plotNumber}? All <strong>{deleteConfirmReq.documents.length} attached documents</strong> will be permanently purged from storage.
                </p>
              </div>
            </div>

            {/* Document list warning */}
            {deleteConfirmReq.documents && deleteConfirmReq.documents.length > 0 && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 space-y-1.5">
                <span className="font-semibold text-gray-800 block text-[11px] uppercase tracking-wider">
                  Files to be deleted from storage:
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-gray-600">
                  {deleteConfirmReq.documents.map((d) => (
                    <li key={d.id} className="truncate">
                      {d.label || d.fileName}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setDeleteConfirmReq(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-xs font-semibold text-gray-700 transition cursor-pointer disabled:opacity-50"
              >
                Keep Application
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteRequest}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting Files & Record...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete & Wipe Files</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
