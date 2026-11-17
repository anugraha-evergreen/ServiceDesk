'use client';

import React, { useState, useEffect } from 'react';
import { PostConstructionRefund, ServiceRequest, DeductionItem } from '@/lib/types';
import { DirectDriveUploader } from './DirectDriveUploader';
import {
  Banknote,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  FileCheck,
  Save,
  Loader2,
  X,
  ShieldCheck,
  Download,
} from 'lucide-react';

interface RefundCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: ServiceRequest;
  onUpdate: (updated: ServiceRequest) => void;
}

export const RefundCalculatorModal: React.FC<RefundCalculatorModalProps> = ({
  isOpen,
  onClose,
  request,
  onUpdate,
}) => {
  const baseDeposit = 20000;

  // Fresh initialization per request: NEVER carry forward deductions between plots!
  const [debrisRemoved, setDebrisRemoved] = useState(true);
  const [roadsUndamaged, setRoadsUndamaged] = useState(true);
  const [rwhVerified, setRwhVerified] = useState(true);
  const [inspectionDate, setInspectionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [deductions, setDeductions] = useState<DeductionItem[]>([]);
  const [newReason, setNewReason] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [refundTxId, setRefundTxId] = useState('');
  const [refundDate, setRefundDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [settled, setSettled] = useState(false);

  // Sync state whenever request changes or modal opens
  useEffect(() => {
    if (request && isOpen) {
      const ref = request.postConstructionRefund;
      if (ref) {
        setDebrisRemoved(ref.debrisRemoved ?? true);
        setRoadsUndamaged(ref.roadsDrainsCommonAreasUndamaged ?? true);
        setRwhVerified(ref.rainwaterHarvestingVerified ?? true);
        setInspectionDate(ref.inspectionDate || new Date().toISOString().split('T')[0]);
        // Strictly use saved deductions or empty array - NO carry over from other plots!
        setDeductions(ref.deductionBreakdown ? [...ref.deductionBreakdown] : []);
        setRefundTxId(ref.refundTransactionId || '');
        setRefundDate(ref.refundDate || new Date().toISOString().split('T')[0]);
        setRemarks(ref.remarks || '');
        setSettled(ref.refundStatus !== 'pending');
      } else {
        // Brand new clean state for this plot
        setDebrisRemoved(true);
        setRoadsUndamaged(true);
        setRwhVerified(true);
        setInspectionDate(new Date().toISOString().split('T')[0]);
        setDeductions([]);
        setRefundTxId('');
        setRefundDate(new Date().toISOString().split('T')[0]);
        setRemarks('');
        setSettled(false);
      }
      setNewReason('');
      setNewAmount('');
    }
  }, [request, isOpen]);

  if (!isOpen) return null;

  const totalDeductions = deductions.reduce((sum, d) => sum + Number(d.amount || 0), 0);

  let finalRefundAmount = 0;
  let excessDamageAmount = 0;
  let refundStatus: PostConstructionRefund['refundStatus'] = 'full_refund';

  if (totalDeductions === 0) {
    finalRefundAmount = baseDeposit;
    refundStatus = 'full_refund';
  } else if (totalDeductions <= baseDeposit) {
    finalRefundAmount = baseDeposit - totalDeductions;
    refundStatus = 'partial_refund';
  } else {
    finalRefundAmount = 0;
    excessDamageAmount = totalDeductions - baseDeposit;
    refundStatus = 'excess_damage_recovery';
  }

  const addDeduction = () => {
    if (!newReason.trim() || !newAmount || Number(newAmount) <= 0) return;
    setDeductions([
      ...deductions,
      { id: Date.now().toString(), reason: newReason.trim(), amount: Number(newAmount) },
    ]);
    setNewReason('');
    setNewAmount('');
  };

  const removeDeduction = (id: string) => {
    setDeductions(deductions.filter((d) => d.id !== id));
  };

  const handleSaveRefund = async () => {
    setSaving(true);
    try {
      const refundData: PostConstructionRefund = {
        inspectionDate,
        debrisRemoved,
        roadsDrainsCommonAreasUndamaged: roadsUndamaged,
        rainwaterHarvestingVerified: rwhVerified,
        initialDeposit: baseDeposit,
        deductionAmount: totalDeductions,
        deductionBreakdown: deductions,
        deductionReason: deductions.map((d) => `${d.reason} (₹${d.amount})`).join('; '),
        excessDamageAmount,
        finalRefundAmount,
        refundStatus,
        refundTransactionId: refundTxId || `TXN-${Date.now().toString().slice(-6)}`,
        refundDate,
        processedBy: 'AEOWA Treasurer & Works Committee',
        processedAt: new Date().toISOString(),
        remarks,
      };

      const res = await fetch(`/api/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postConstructionRefund: refundData,
          status: 'completed',
          refundSettlementPdfUrl: `/api/pdf/noc?requestId=${request.id}&type=refund_settlement&role=admin`,
        }),
      });

      if (!res.ok) throw new Error('Failed to save refund data');

      const data = await res.json();
      onUpdate(data.request);
      setSettled(true);
    } catch (e) {
      console.error(e);
      alert('Error updating post-construction refund');
    } finally {
      setSaving(false);
    }
  };

  const downloadSettlementPdf = () => {
    window.open(
      `/api/pdf/noc?requestId=${request.id}&type=refund_settlement&role=admin`,
      '_blank'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-emerald-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-700/80 rounded-lg">
              <Banknote className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold leading-tight">
                Deposit Refund & Site Clearance Module (AEOWA)
              </h2>
              <p className="text-xs text-emerald-200 font-mono">
                Plot #{request.plotNumber} • Owner: {request.ownerName} • Escrow: ₹20,000
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm text-gray-700 flex-1">
          {/* Settlement Complete Banner with PDF Download */}
          {settled && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-emerald-950 block">
                    Deposit Settlement Finalized & Signed-Off
                  </span>
                  <span className="text-[11px] text-emerald-800">
                    Official Settlement Voucher PDF generated with inspection sign-off & deduction details.
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={downloadSettlementPdf}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Download Settlement Voucher PDF</span>
              </button>
            </div>
          )}

          {/* Section 1: Managing Committee Inspection Checklist */}
          <div className="bg-emerald-50/60 rounded-xl p-4 border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                1. Managing Committee Site Inspection
              </h3>
              <input
                type="date"
                value={inspectionDate}
                onChange={(e) => setInspectionDate(e.target.value)}
                className="text-xs px-2 py-1 bg-white border border-emerald-300 rounded-lg font-medium"
              />
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={debrisRemoved}
                  onChange={(e) => setDebrisRemoved(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 accent-emerald-600"
                />
                <span className="text-xs font-medium text-gray-800">
                  All construction debris removed; plot surroundings clean & graded
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={roadsUndamaged}
                  onChange={(e) => setRoadsUndamaged(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 accent-emerald-600"
                />
                <span className="text-xs font-medium text-gray-800">
                  Layout asphalt roads, curbs & stormwater drains undamaged
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rwhVerified}
                  onChange={(e) => setRwhVerified(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 accent-emerald-600"
                />
                <span className="text-xs font-medium text-gray-800">
                  Rainwater Harvesting (RWH) setup & recharge pit verified on-site
                </span>
              </label>
            </div>
          </div>

          {/* Section 2: Deduction Calculator (FRESH FOR THIS PLOT) */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                2. Deduction Calculator (Plot #{request.plotNumber})
              </h3>
              <span className="text-[11px] text-gray-400">
                Fresh itemized ledger for this plot
              </span>
            </div>

            {/* List of deductions */}
            {deductions.length > 0 ? (
              <div className="space-y-2">
                {deductions.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-xs"
                  >
                    <span className="font-medium text-gray-800">{item.reason}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-rose-600">
                        -₹{item.amount.toLocaleString('en-IN')}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeDeduction(item.id)}
                        className="p-1 text-gray-400 hover:text-rose-600 rounded transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">
                Zero deductions recorded. Eligible for full ₹20,000 security deposit refund.
              </p>
            )}

            {/* Add deduction input */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-gray-100">
              <input
                type="text"
                placeholder="Reason (e.g. Road repair, Drain de-silting, Kerb stone fix)"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                className="w-full sm:flex-1 text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-emerald-600"
              />
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="number"
                  placeholder="Amount (₹)"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-32 text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-emerald-600 font-mono"
                />
                <button
                  type="button"
                  onClick={addDeduction}
                  className="px-3 py-2 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-800 transition flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Financial Summary Box */}
            <div className="mt-4 p-4 rounded-xl border border-gray-200 bg-gray-50/70 space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Initial Security Deposit Held:</span>
                <span className="font-mono font-semibold">₹20,000</span>
              </div>
              <div className="flex items-center justify-between text-xs text-rose-600">
                <span>Total Itemized Deductions:</span>
                <span className="font-mono font-semibold">
                  -₹{totalDeductions.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                {refundStatus === 'excess_damage_recovery' ? (
                  <div className="flex items-center gap-2 text-rose-800">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider block">
                        Excess Damage Recovery Required
                      </span>
                      <span className="text-[11px] text-rose-600">
                        Damage exceeds deposit by ₹{excessDamageAmount.toLocaleString('en-IN')}.
                        Demand notice to be issued to owner.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider block">
                        {refundStatus === 'full_refund' ? 'Full Refund Payable' : 'Partial Refund Payable'}
                      </span>
                      <span className="text-[11px] text-emerald-700">
                        Net amount to be returned to owner&apos;s bank account
                      </span>
                    </div>
                  </div>
                )}

                <span
                  className={`text-lg font-mono font-extrabold ${
                    refundStatus === 'excess_damage_recovery' ? 'text-rose-700' : 'text-emerald-700'
                  }`}
                >
                  {refundStatus === 'excess_damage_recovery'
                    ? `Demand: ₹${excessDamageAmount.toLocaleString('en-IN')}`
                    : `Refund: ₹${finalRefundAmount.toLocaleString('en-IN')}`}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Bank Transfer Details & Refund Proof Upload */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-3">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              3. Refund Payment Execution & Proof Upload
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Bank Transfer UTR / Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. AXIS20261118002931"
                  value={refundTxId}
                  onChange={(e) => setRefundTxId(e.target.value.toUpperCase())}
                  className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-emerald-600 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Payout Date
                </label>
                <input
                  type="date"
                  value={refundDate}
                  onChange={(e) => setRefundDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">
                Inspection & Payout Remarks
              </label>
              <textarea
                rows={2}
                placeholder="Notes on site clearance or debit ledger entry..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-emerald-600"
              />
            </div>

            {/* Direct Drive upload for refund receipt screenshot/proof */}
            <DirectDriveUploader
              plotNumber={request.plotNumber}
              category="refund_proof"
              label="Upload Bank Payout Voucher / Screenshot"
              description="Automatically organized into /Anugraha_Evergreen_Records/Plot_[Number]/Refund_Proofs/"
              onUploadComplete={(doc) => {
                setRemarks(
                  (prev) => `${prev} [Voucher uploaded: ${doc.fileName}]`
                );
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end">
          <div className="flex items-center gap-2.5">
            {settled ? (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveRefund}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 transition flex items-center gap-1.5 cursor-pointer"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Update Settlement</span>
                </button>

                <button
                  type="button"
                  onClick={downloadSettlementPdf}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Settlement PDF</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveRefund}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Sign Off & Settle Deposit</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
