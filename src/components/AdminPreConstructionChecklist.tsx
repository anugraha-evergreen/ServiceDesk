'use client';

import React, { useState } from 'react';
import { PreConstructionChecklist, ServiceRequest } from '@/lib/types';
import {
  CheckCircle2,
  FileCheck,
  Download,
  ShieldCheck,
  AlertCircle,
  Save,
  Loader2,
  Lock,
} from 'lucide-react';

interface AdminPreConstructionChecklistProps {
  request: ServiceRequest;
  onUpdate: (updated: ServiceRequest) => void;
}

export const AdminPreConstructionChecklist: React.FC<AdminPreConstructionChecklistProps> = ({
  request,
  onUpdate,
}) => {
  const current = request.preConstructionChecklist || {
    docsVerified: false,
    membershipFeeCleared: false,
    maintenanceDuesCleared: false,
    securityDepositPaid: false,
    depositTransactionId: '',
    depositDate: new Date().toISOString().split('T')[0],
    depositBank: 'HDFC Bank',
    labourerToiletInstalled: false,
    bescomWaterArrangementVerified: false,
    labourersRegistered: false,
  };

  const [form, setForm] = useState<PreConstructionChecklist>(current);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const allItemsChecked =
    form.docsVerified &&
    form.membershipFeeCleared &&
    form.maintenanceDuesCleared &&
    form.securityDepositPaid &&
    form.depositTransactionId.trim().length > 0 &&
    form.labourerToiletInstalled &&
    form.bescomWaterArrangementVerified &&
    form.labourersRegistered;

  const handleToggle = (key: keyof PreConstructionChecklist) => {
    setForm((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setSaveSuccess(false);
  };

  const handleSave = async (markApproved: boolean = false) => {
    setSaving(true);
    setSaveSuccess(false);

    try {
      const status = markApproved || allItemsChecked ? 'approved' : 'checklist_pending';
      const certId =
        request.generatedNocCertificateId || `AEOWA/NOC/2026/${request.plotNumber}`;

      const res = await fetch(`/api/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preConstructionChecklist: {
            ...form,
            verifiedBy: 'Hon. General Secretary, AEOWA',
            verifiedAt: new Date().toISOString(),
          },
          status,
          generatedNocCertificateId: certId,
          generatedNocPdfUrl: `/api/pdf/noc?requestId=${request.id}&role=admin`,
        }),
      });

      if (!res.ok) throw new Error('Failed to save checklist');

      const data = await res.json();
      onUpdate(data.request);
      setSaveSuccess(true);
    } catch (e) {
      console.error(e);
      alert('Error updating checklist');
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = () => {
    if (!allItemsChecked) {
      alert('Cannot download NOC PDF: All 7 checklist items must be checked and verified.');
      return;
    }
    window.open(`/api/pdf/noc?requestId=${request.id}&role=admin`, '_blank');
  };

  return (
    <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-100 rounded-xl text-emerald-800">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm sm:text-base">
              AEOWA Pre-Construction Verification Checklist
            </h3>
            <p className="text-xs text-gray-500">
              All 7 items must be fully verified and checked to unlock the Construction NOC PDF
            </p>
          </div>
        </div>

        {allItemsChecked ? (
          <span className="self-start sm:self-auto px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Checklist Complete (NOC Unlocked)</span>
          </span>
        ) : (
          <span className="self-start sm:self-auto px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Checklist Incomplete (NOC Locked)</span>
          </span>
        )}
      </div>

      {/* Checklist items */}
      <div className="space-y-3">
        {/* Item 1: Docs */}
        <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-emerald-50/30 cursor-pointer transition">
          <input
            type="checkbox"
            checked={form.docsVerified}
            onChange={() => handleToggle('docsVerified')}
            className="mt-0.5 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
          />
          <div>
            <span className="text-xs sm:text-sm font-semibold text-gray-900">
              1. Statutory Documents & Sanctions Verified
            </span>
            <p className="text-xs text-gray-500">
              Approved building plan, construction permit, and property tax receipt verified.
            </p>
          </div>
        </label>

        {/* Item 2: Membership */}
        <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-emerald-50/30 cursor-pointer transition">
          <input
            type="checkbox"
            checked={form.membershipFeeCleared}
            onChange={() => handleToggle('membershipFeeCleared')}
            className="mt-0.5 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
          />
          <div>
            <span className="text-xs sm:text-sm font-semibold text-gray-900">
              2. AEOWA Lifetime Membership Fee Cleared (₹1,000)
            </span>
            <p className="text-xs text-gray-500">
              Mandatory one-time registration fee credited to Association general account.
            </p>
          </div>
        </label>

        {/* Item 3: Maintenance */}
        <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-emerald-50/30 cursor-pointer transition">
          <input
            type="checkbox"
            checked={form.maintenanceDuesCleared}
            onChange={() => handleToggle('maintenanceDuesCleared')}
            className="mt-0.5 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
          />
          <div>
            <span className="text-xs sm:text-sm font-semibold text-gray-900">
              3. Layout Maintenance Dues Cleared
            </span>
            <p className="text-xs text-gray-500">
              Zero outstanding quarterly maintenance arrears for Plot #{request.plotNumber}.
            </p>
          </div>
        </label>

        {/* Item 4: Security Deposit */}
        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.securityDepositPaid}
              onChange={() => handleToggle('securityDepositPaid')}
              className="mt-0.5 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
            />
            <div>
              <span className="text-xs sm:text-sm font-semibold text-emerald-950">
                4. ₹20,000 Refundable Security Deposit Paid
              </span>
              <p className="text-xs text-emerald-800">
                Held in AEOWA escrow account to guarantee zero damage to layout roads & drains.
              </p>
            </div>
          </label>

          {form.securityDepositPaid && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-emerald-100">
              <div>
                <label className="text-[11px] font-semibold text-emerald-900 block mb-1">
                  Bank UTR / Transaction ID *
                </label>
                <input
                  type="text"
                  placeholder="e.g. HDFC20261116982341"
                  value={form.depositTransactionId}
                  onChange={(e) =>
                    setForm({ ...form, depositTransactionId: e.target.value.toUpperCase() })
                  }
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg focus:outline-emerald-600 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-emerald-900 block mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={form.depositDate}
                  onChange={(e) => setForm({ ...form, depositDate: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-emerald-900 block mb-1">
                  Depositor Bank
                </label>
                <input
                  type="text"
                  placeholder="e.g. SBI, HDFC, ICICI"
                  value={form.depositBank}
                  onChange={(e) => setForm({ ...form, depositBank: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg focus:outline-emerald-600"
                />
              </div>
            </div>
          )}
        </div>

        {/* Item 5: Toilet */}
        <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-emerald-50/30 cursor-pointer transition">
          <input
            type="checkbox"
            checked={form.labourerToiletInstalled}
            onChange={() => handleToggle('labourerToiletInstalled')}
            className="mt-0.5 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
          />
          <div>
            <span className="text-xs sm:text-sm font-semibold text-gray-900">
              5. On-Site Temporary Toilet / Bathroom Installed
            </span>
            <p className="text-xs text-gray-500">
              Connected to drainage chamber. Zero open sanitation in layout premises.
            </p>
          </div>
        </label>

        {/* Item 6: BESCOM */}
        <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-emerald-50/30 cursor-pointer transition">
          <input
            type="checkbox"
            checked={form.bescomWaterArrangementVerified}
            onChange={() => handleToggle('bescomWaterArrangementVerified')}
            className="mt-0.5 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
          />
          <div>
            <span className="text-xs sm:text-sm font-semibold text-gray-900">
              6. BESCOM Temporary Power & Water Supply Verified
            </span>
            <p className="text-xs text-gray-500">
              Authorized electricity meter setup. Zero unauthorized tapping from streetlights.
            </p>
          </div>
        </label>

        {/* Item 7: Labourers */}
        <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-emerald-50/30 cursor-pointer transition">
          <input
            type="checkbox"
            checked={form.labourersRegistered}
            onChange={() => handleToggle('labourersRegistered')}
            className="mt-0.5 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
          />
          <div>
            <span className="text-xs sm:text-sm font-semibold text-gray-900">
              7. Construction Labourers Registered with Site Contractor
            </span>
            <p className="text-xs text-gray-500">
              Roster & photo ID register deposited with AEOWA security desk.
            </p>
          </div>
        </label>
      </div>

      {/* Action Toolbar */}
      <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave(allItemsChecked)}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-800 hover:bg-emerald-900 text-white transition flex items-center gap-1.5 cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Checklist</span>
          </button>
          {saveSuccess && (
            <span className="text-xs text-emerald-700 font-medium">✓ Saved successfully</span>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {saveSuccess || (request.status === 'approved' && allItemsChecked) ? (
            <button
              type="button"
              onClick={downloadPdf}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Construction NOC PDF</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-500 text-xs font-medium">
              <Lock className="w-3.5 h-3.5 text-gray-400" />
              <span>{allItemsChecked ? 'Click "Save Checklist" to unlock PDF' : 'Complete & Save checklist to unlock PDF'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
