'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/session';
import { ServiceRequest } from '@/lib/types';
import { RefundCalculatorModal } from '@/components/RefundCalculatorModal';
import {
  Banknote,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Download,
} from 'lucide-react';

export default function AdminRefundsPage() {
  const router = useRouter();
  const { session, loading } = useSession();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [selectedReq, setSelectedReq] = useState<ServiceRequest | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && (!session || session.role !== 'admin')) {
      router.push('/');
      return;
    }
    loadData();
  }, [session, loading, router]);

  const loadData = async () => {
    setFetching(true);
    try {
      const res = await fetch('/api/requests?role=admin');
      const data = await res.json();
      if (data.requests) {
        const constructionList = data.requests.filter(
          (r: ServiceRequest) => r.type === 'construction_noc'
        );
        setRequests(constructionList);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  };

  const handleOpenCalculator = (req: ServiceRequest) => {
    setSelectedReq(req);
    setModalOpen(true);
  };

  const handleUpdate = (updated: ServiceRequest) => {
    setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  if (loading || fetching) {
    return (
      <div className="py-20 text-center text-sm text-gray-500 animate-pulse">
        Loading security deposit & escrow refund ledger...
      </div>
    );
  }

  let totalDepositsReceived = 0;
  let totalRefundsPaid = 0;
  let totalDeductionsRetained = 0;
  let activeEscrowPlotsCount = 0;

  requests.forEach((r) => {
    if (r.preConstructionChecklist?.securityDepositPaid) {
      const deposit = r.postConstructionRefund?.initialDeposit ?? 20000;
      totalDepositsReceived += deposit;
      const ref = r.postConstructionRefund;
      if (ref && ref.refundStatus && ref.refundStatus !== 'pending') {
        totalRefundsPaid += ref.finalRefundAmount || 0;
        totalDeductionsRetained += ref.deductionAmount || 0;
      } else {
        activeEscrowPlotsCount += 1;
      }
    }
  });

  const totalEscrowHeld = Math.max(0, totalDepositsReceived - totalRefundsPaid);
  const activeDepositsAmount = Math.max(0, totalEscrowHeld - totalDeductionsRetained);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <div>
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Request Queue</span>
        </Link>
      </div>

      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold mb-1">
          <Banknote className="w-3.5 h-3.5" />
          <span>AEOWA Financial Escrow Ledger</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
          ₹20,000 Construction Security Deposit & Refund Module
        </h1>
        <p className="text-xs text-gray-500">
          Track incoming deposit UTRs, calculate site-specific deductions, and download official settlement vouchers.
        </p>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            Total Deposits Received
          </span>
          <span className="text-xl font-black text-gray-900 mt-1 block font-mono">
            ₹{totalDepositsReceived.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-gray-400 mt-0.5 block">
            Across {requests.filter((r) => r.preConstructionChecklist?.securityDepositPaid).length} construction plots
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            Refunds Settled &amp; Paid
          </span>
          <span className="text-xl font-black text-blue-700 mt-1 block font-mono">
            ₹{totalRefundsPaid.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-gray-400 mt-0.5 block">
            ₹{totalDeductionsRetained.toLocaleString('en-IN')} deductions retained
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider block">
            Total in Escrow Custody
          </span>
          <span className="text-xl font-black text-emerald-800 mt-1 block font-mono">
            ₹{totalEscrowHeld.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-emerald-700 mt-0.5 block font-medium">
            ₹{activeDepositsAmount.toLocaleString('en-IN')} active + ₹{totalDeductionsRetained.toLocaleString('en-IN')} deductions
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {requests.map((req) => {
          const chk = req.preConstructionChecklist;
          const ref = req.postConstructionRefund;
          const isSettled = ref && ref.refundStatus !== 'pending';

          return (
            <div
              key={req.id}
              className="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs hover:border-emerald-300 transition space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-base font-black text-gray-900">
                    Plot #{req.plotNumber}
                  </span>
                  <span className="text-xs text-gray-500">({req.ownerName})</span>
                  <span className="font-mono text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                    {req.id}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isSettled && (
                    <a
                      href={`/api/pdf/noc?requestId=${req.id}&type=refund_settlement&role=admin`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Settlement PDF</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenCalculator(req)}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Banknote className="w-4 h-4 text-emerald-200" />
                    <span>{isSettled ? 'Edit Settlement & Calculator' : 'Open Deduction Calculator'}</span>
                  </button>
                </div>
              </div>

              {/* Deposit Intake vs Refund Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Deposit Inflow */}
                <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950 uppercase tracking-wider text-[11px]">
                      Deposit Received (Inflow)
                    </span>
                    <span className="font-mono font-bold text-emerald-700">₹20,000</span>
                  </div>
                  <div className="text-gray-600 space-y-0.5 text-[11px]">
                    <div>
                      Status:{' '}
                      <strong className="text-emerald-800">
                        {chk?.securityDepositPaid ? 'Verified & Held in Escrow' : 'Pending Verification'}
                      </strong>
                    </div>
                    <div>
                      Bank UTR: <span className="font-mono">{chk?.depositTransactionId || 'N/A'}</span>
                    </div>
                    <div>
                      Date: {chk?.depositDate || 'N/A'} • Bank: {chk?.depositBank || 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Refund Outflow */}
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
                      Post-Construction Settlement
                    </span>
                    {ref ? (
                      <span
                        className={`font-mono font-bold ${
                          ref.refundStatus === 'excess_damage_recovery'
                            ? 'text-rose-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {ref.refundStatus === 'excess_damage_recovery'
                          ? `Excess Demand: ₹${ref.excessDamageAmount}`
                          : `Refund: ₹${ref.finalRefundAmount}`}
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-400">Awaiting Civil Work Completion</span>
                    )}
                  </div>

                  <div className="text-gray-600 space-y-0.5 text-[11px]">
                    <div>
                      Managing Committee Inspection:{' '}
                      <strong>
                        {ref?.inspectionDate ? `Completed on ${ref.inspectionDate}` : 'Pending Inspection'}
                      </strong>
                    </div>
                    {ref && ref.deductionAmount > 0 && (
                      <div className="text-rose-600 font-medium">
                        Deductions: -₹{ref.deductionAmount} ({ref.deductionReason})
                      </div>
                    )}
                    {ref?.refundTransactionId && (
                      <div className="text-emerald-800 font-medium">
                        Payout UTR: <span className="font-mono">{ref.refundTransactionId}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedReq && (
        <RefundCalculatorModal
          key={selectedReq.id}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          request={selectedReq}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}
