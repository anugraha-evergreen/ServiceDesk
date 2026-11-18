'use client';

import React, { useState, useRef } from 'react';
import { PreConstructionChecklist, ServiceRequest, UploadedDoc } from '@/lib/types';
import {
  CheckCircle2,
  FileCheck,
  Download,
  ShieldCheck,
  AlertCircle,
  Save,
  Loader2,
  Lock,
  Upload,
  FileText,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
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
    depositBank: '',
    labourerToiletInstalled: false,
    bescomWaterArrangementVerified: false,
    labourersRegistered: false,
  };

  const [form, setForm] = useState<PreConstructionChecklist>(current);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if there is already an attached deposit receipt in request documents or form
  const existingDepositDoc =
    request.documents.find((d) => d.category === 'deposit_receipt') ||
    (form.depositReceiptUrl
      ? {
          id: 'form-receipt',
          category: 'deposit_receipt' as const,
          label: 'Security Deposit Receipt',
          fileName: form.depositReceiptFileName || 'deposit_receipt.jpg',
          fileSizeBytes: 0,
          mimeType: 'image/jpeg',
          driveWebViewLink: form.depositReceiptUrl,
          uploadedAt: new Date().toISOString(),
        }
      : null);

  const hasDepositProof =
    form.depositTransactionId?.trim().length > 0 ||
    Boolean(form.depositReceiptUrl) ||
    Boolean(existingDepositDoc);

  const allItemsChecked =
    form.docsVerified &&
    form.membershipFeeCleared &&
    form.maintenanceDuesCleared &&
    form.securityDepositPaid &&
    hasDepositProof &&
    form.labourerToiletInstalled &&
    form.bescomWaterArrangementVerified &&
    form.labourersRegistered;

  const isChecklistMet =
    allItemsChecked || request.status === 'approved' || request.status === 'completed';
  const [isExpanded, setIsExpanded] = useState<boolean>(!isChecklistMet);

  const handleToggle = (key: keyof PreConstructionChecklist) => {
    setForm((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setSaveSuccess(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('plotNumber', request.plotNumber);
      formData.append('category', 'deposit_receipt');
      formData.append('label', `Security Deposit Receipt - Plot ${request.plotNumber}`);

      const uploadRes = await fetch('/api/drive/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload screenshot to storage');
      }

      const uploadData = await uploadRes.json();
      const newDoc: UploadedDoc = uploadData.doc;

      // Update form state
      const updatedForm: PreConstructionChecklist = {
        ...form,
        securityDepositPaid: true,
        depositReceiptUrl: newDoc.driveWebViewLink || '',
        depositReceiptFileName: newDoc.fileName,
        depositTransactionId: form.depositTransactionId?.trim() || `PROOF-${newDoc.fileName.slice(0, 15)}`,
      };
      setForm(updatedForm);

      // Append newDoc to request.documents avoiding duplicates
      const updatedDocs = [
        ...request.documents.filter((d) => d.category !== 'deposit_receipt'),
        newDoc,
      ];

      // Save immediately to persist under plot record
      const patchRes = await fetch(`/api/requests/${request.id}?role=admin`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin',
        },
        body: JSON.stringify({
          role: 'admin',
          documents: updatedDocs,
          preConstructionChecklist: {
            ...updatedForm,
            verifiedBy: 'Hon. General Secretary, AEOWA',
            verifiedAt: new Date().toISOString(),
          },
        }),
      });

      if (!patchRes.ok) throw new Error('Failed to associate deposit receipt with plot request');
      const patchData = await patchRes.json();
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('aelra_cache_admin_requests');
      }
      onUpdate(patchData.request);
      setSaveSuccess(true);
    } catch (err) {
      console.error(err);
      alert('Error uploading deposit receipt screenshot');
    } finally {
      setUploadingReceipt(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveDepositDoc = async () => {
    if (!confirm('Remove this attached deposit receipt?')) return;

    const updatedForm: PreConstructionChecklist = {
      ...form,
      depositReceiptUrl: undefined,
      depositReceiptFileName: undefined,
    };
    setForm(updatedForm);

    const updatedDocs = request.documents.filter((d) => d.category !== 'deposit_receipt');

    try {
      const res = await fetch(`/api/requests/${request.id}?role=admin`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin',
        },
        body: JSON.stringify({
          role: 'admin',
          documents: updatedDocs,
          preConstructionChecklist: updatedForm,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('aelra_cache_admin_requests');
        }
        onUpdate(data.request);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (markApproved: boolean = false) => {
    setSaving(true);
    setSaveSuccess(false);

    try {
      const status = markApproved || allItemsChecked ? 'approved' : 'checklist_pending';
      const certId =
        request.generatedNocCertificateId || `AEOWA/NOC/2026/${request.plotNumber}`;

      const res = await fetch(`/api/requests/${request.id}?role=admin`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin',
        },
        body: JSON.stringify({
          role: 'admin',
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
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('aelra_cache_admin_requests');
      }
      onUpdate(data.request);
      setSaveSuccess(true);
    } catch (e) {
      console.error(e);
      alert('Error updating checklist');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAllAndApprove = async () => {
    const verifiedForm: PreConstructionChecklist = {
      ...form,
      docsVerified: true,
      membershipFeeCleared: true,
      maintenanceDuesCleared: true,
      securityDepositPaid: true,
      depositTransactionId: form.depositTransactionId?.trim() || `AEOWA-DEP-${request.plotNumber}`,
      depositDate: form.depositDate || new Date().toISOString().split('T')[0],
      depositBank: form.depositBank || 'Verified via Escrow',
      labourerToiletInstalled: true,
      bescomWaterArrangementVerified: true,
      labourersRegistered: true,
      verifiedBy: 'Hon. General Secretary, AEOWA',
      verifiedAt: new Date().toISOString(),
    };
    setForm(verifiedForm);
    setSaving(true);
    setSaveSuccess(false);

    try {
      const certId =
        request.generatedNocCertificateId || `AEOWA/NOC/2026/${request.plotNumber}`;

      const res = await fetch(`/api/requests/${request.id}?role=admin`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin',
        },
        body: JSON.stringify({
          role: 'admin',
          preConstructionChecklist: verifiedForm,
          status: 'approved',
          generatedNocCertificateId: certId,
          generatedNocPdfUrl: `/api/pdf/noc?requestId=${request.id}&role=admin`,
        }),
      });

      if (!res.ok) throw new Error('Failed to approve request');

      const data = await res.json();
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('aelra_cache_admin_requests');
      }
      onUpdate(data.request);
      setSaveSuccess(true);
    } catch (e) {
      console.error(e);
      alert('Error approving request');
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = () => {
    window.open(`/api/pdf/noc?requestId=${request.id}&role=admin`, '_blank');
  };

  if (isChecklistMet && !isExpanded) {
    return (
      <div className="bg-white rounded-2xl border border-emerald-200 p-4 sm:p-5 shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
          <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl shrink-0 mt-0.5 sm:mt-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-gray-900 text-base leading-snug">
                Pre-Construction Checklist Verified
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-200 whitespace-nowrap">
                All 7 Society Rules Cleared
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Plot #{request.plotNumber} • Security deposit verified &amp; all preconditions satisfied
            </p>
          </div>
        </div>

        {/* Two buttons stacked one below the other */}
        <div className="flex flex-col sm:items-end gap-2 shrink-0">
          <button
            type="button"
            onClick={downloadPdf}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Download NOC PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gray-50 hover:bg-emerald-50 text-emerald-900 border border-emerald-200 transition flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <span>View Checklist</span>
            <ChevronDown className="w-3.5 h-3.5 text-emerald-700" />
          </button>
        </div>
      </div>
    );
  }

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

        <div className="flex flex-wrap items-center gap-2">
          {isChecklistMet && (
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="text-xs text-emerald-900 hover:text-emerald-950 font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition flex items-center gap-1 cursor-pointer"
            >
              <span>Collapse Checklist</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          )}

          {!allItemsChecked && (
            <button
              type="button"
              onClick={() => {
                setForm((prev) => ({
                  ...prev,
                  docsVerified: true,
                  membershipFeeCleared: true,
                  maintenanceDuesCleared: true,
                  securityDepositPaid: true,
                  depositTransactionId: prev.depositTransactionId?.trim() || `AEOWA-DEP-${request.plotNumber}`,
                  labourerToiletInstalled: true,
                  bescomWaterArrangementVerified: true,
                  labourersRegistered: true,
                }));
              }}
              className="text-xs text-emerald-800 hover:text-emerald-950 font-bold px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 transition cursor-pointer"
            >
              ✓ Mark All 7 Verified
            </button>
          )}

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
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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

            {hasDepositProof && (
              <span className="self-start sm:self-auto px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-[11px] font-semibold flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Proof Verified</span>
              </span>
            )}
          </div>

          {form.securityDepositPaid && (
            <div className="pt-3 border-t border-emerald-100 space-y-3">
              <p className="text-xs text-emerald-900 font-medium">
                Provide deposit confirmation via <strong>manual bank details</strong> OR <strong>attach a screenshot/receipt</strong> (saved under Plot #{request.plotNumber}):
              </p>

              {/* Option A: Manual Entry */}
              <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-2">
                <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                  Option A: Bank Transfer / UTR Details
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Bank UTR / Transaction ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC20261116982341"
                      value={form.depositTransactionId}
                      onChange={(e) =>
                        setForm({ ...form, depositTransactionId: e.target.value.toUpperCase() })
                      }
                      className="w-full text-xs px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-emerald-600 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      value={form.depositDate}
                      onChange={(e) => setForm({ ...form, depositDate: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Depositor Bank
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SBI, HDFC, ICICI"
                      value={form.depositBank}
                      onChange={(e) => setForm({ ...form, depositBank: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Option B: Screenshot / Proof Attachment */}
              <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                    Option B: Attach Payment Screenshot / Slip
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    Storage: /plots/plot_{request.plotNumber}/
                  </span>
                </div>

                {existingDepositDoc ? (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 bg-emerald-200 text-emerald-900 rounded-lg shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-emerald-950 block truncate">
                          {existingDepositDoc.fileName}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-medium">
                          Saved under Plot #{request.plotNumber} • Security Deposit Proof
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {existingDepositDoc.driveWebViewLink && (
                        <a
                          href={`/api/documents/download?url=${encodeURIComponent(
                            existingDepositDoc.driveWebViewLink
                          )}&name=${encodeURIComponent(existingDepositDoc.fileName)}`}
                          download={existingDepositDoc.fileName}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>View / Download</span>
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={handleRemoveDepositDoc}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Remove attached receipt"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="deposit-screenshot-input"
                    />
                    <label
                      htmlFor="deposit-screenshot-input"
                      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        uploadingReceipt
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                          : 'bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-700 shadow-xs'
                      }`}
                    >
                      {uploadingReceipt ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Uploading screenshot to storage...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>Attach Deposit Screenshot / Receipt</span>
                        </>
                      )}
                    </label>
                    <span className="text-[11px] text-gray-500">
                      JPG, PNG or PDF. Automatically filed under Plot #{request.plotNumber}.
                    </span>
                  </div>
                )}
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
      <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 w-full">
        <div className="flex flex-wrap items-center gap-2">
          {request.status !== 'approved' && request.status !== 'completed' ? (
            <button
              type="button"
              disabled={saving}
              onClick={handleMarkAllAndApprove}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition flex items-center gap-2 cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Approve & Grant Construction NOC</span>
            </button>
          ) : (
            <span className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>NOC Officially Approved & On Record</span>
            </span>
          )}

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave(allItemsChecked)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 transition flex items-center gap-1.5 cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Draft</span>
          </button>

          {saveSuccess && (
            <span className="text-xs text-emerald-700 font-medium">✓ Saved successfully</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {request.status === 'approved' || request.status === 'completed' || saveSuccess || allItemsChecked ? (
            <button
              type="button"
              onClick={downloadPdf}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>Download Construction NOC PDF</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-500 text-xs font-medium">
              <Lock className="w-3.5 h-3.5 text-gray-400" />
              <span>Verify checklist to unlock PDF</span>
            </div>
          )}

          {isChecklistMet && (
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 transition flex items-center gap-1 cursor-pointer"
            >
              <span>Collapse Card</span>
              <ChevronUp className="w-3.5 h-3.5 text-gray-600" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
