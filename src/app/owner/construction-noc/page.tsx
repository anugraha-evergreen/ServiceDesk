'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/lib/session';
import { UploadedDoc } from '@/lib/types';
import { DirectDriveUploader } from '@/components/DirectDriveUploader';
import { ConstructionRulesModal } from '@/components/ConstructionRulesModal';
import { OwnerConstructionRuleCards } from '@/components/OwnerConstructionRuleCards';
import {
  CONSTRUCTION_RULES_TITLE,
  CONSTRUCTION_RULES_VERSION,
} from '@/lib/constructionRules';
import {
  HardHat,
  ShieldCheck,
  FileText,
  User,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Lock,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
} from 'lucide-react';

export default function ConstructionNocPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-sm text-gray-500 animate-pulse">
          Loading Construction NOC application...
        </div>
      }
    >
      <ConstructionNocForm />
    </Suspense>
  );
}

function ConstructionNocForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditing = Boolean(editId);

  const { session, loading } = useSession();

  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  // Requirement 3: Just Contractor Name/Number and Owner Name/Number
  const [ownerContactName, setOwnerContactName] = useState('');
  const [ownerContactPhone, setOwnerContactPhone] = useState('');
  const [contractorName, setContractorName] = useState('');
  const [contractorPhone, setContractorPhone] = useState('');

  // Requirement 4: Optional section expandable & COLLAPSED by default
  const [showOptionalUploads, setShowOptionalUploads] = useState(false);

  // Uploaded docs list
  const [docs, setDocs] = useState<Record<string, UploadedDoc>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Deletion modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!editId || !session?.plotNumber) return;
    setDeleting(true);
    setFormError(null);
    try {
      const res = await fetch(
        `/api/requests/${editId}?role=owner&plotNumber=${encodeURIComponent(session.plotNumber)}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete application');
      }
      try {
        sessionStorage.removeItem(`aelra_cache_owner_${session.plotNumber.trim().toLowerCase()}`);
      } catch {}
      router.push('/owner/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete application';
      setFormError(msg);
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  useEffect(() => {
    if (!loading && (!session || session.role !== 'owner')) {
      router.push('/');
      return;
    }
    if (session && !isEditing) {
      setOwnerContactName(session.ownerName || '');
      setOwnerContactPhone(session.phone || '');
    }
  }, [session, loading, router, isEditing]);

  // Load existing request data if in edit mode
  useEffect(() => {
    if (editId) {
      setLoadingEdit(true);
      fetch(`/api/requests/${editId}?role=owner`)
        .then((res) => res.json())
        .then((data) => {
          if (data.request) {
            const req = data.request;
            if (req.status === 'approved' || req.status === 'completed') {
              setIsLocked(true);
            }
            if (req.rulesAcceptedAt) setRulesAccepted(true);
            if (req.ownerContactName) setOwnerContactName(req.ownerContactName);
            else if (session?.ownerName) setOwnerContactName(session.ownerName);

            if (req.ownerContactPhone) setOwnerContactPhone(req.ownerContactPhone);
            else if (session?.phone) setOwnerContactPhone(session.phone);

            if (req.contractorName) setContractorName(req.contractorName);
            if (req.contractorPhone) setContractorPhone(req.contractorPhone);

            if (req.documents && Array.isArray(req.documents)) {
              const docMap: Record<string, UploadedDoc> = {};
              req.documents.forEach((d: UploadedDoc) => {
                docMap[d.category] = d;
              });
              setDocs(docMap);
              if (docMap.neighbour_permission || docMap.labourer_ids) {
                setShowOptionalUploads(true);
              }
            }
          } else {
            setFormError('Request not found or unavailable for editing.');
          }
        })
        .catch((err) => {
          console.error(err);
          setFormError('Failed to load application details.');
        })
        .finally(() => setLoadingEdit(false));
    }
  }, [editId, session]);

  const handleDocUploaded = (doc: UploadedDoc) => {
    setDocs((prev) => ({
      ...prev,
      [doc.category]: doc,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!rulesAccepted) {
      setFormError('You must review and accept the Mandatory Construction Rules (16 Nov 2026).');
      return;
    }

    // Verify required statutory uploads
    if (!docs.building_plan) {
      setFormError('Please upload the Government-approved building plan.');
      return;
    }
    if (!docs.construction_permit) {
      setFormError('Please upload the local authority construction license / permit.');
      return;
    }
    if (!docs.tax_receipt) {
      setFormError('Please upload the latest property tax paid receipt.');
      return;
    }

    if (!ownerContactName.trim() || !ownerContactPhone.trim()) {
      setFormError('Please provide the Owner contact name and phone number.');
      return;
    }

    if (!contractorName.trim() || !contractorPhone.trim()) {
      setFormError('Please provide the Contractor name and phone number.');
      return;
    }

    setSubmitting(true);
    try {
      const documentsList = Object.values(docs);

      const endpoint = isEditing ? `/api/requests/${editId}?role=owner` : '/api/requests';
      const method = isEditing ? 'PATCH' : 'POST';
      const payload = isEditing
        ? {
            ownerContactName: ownerContactName.trim(),
            ownerContactPhone: ownerContactPhone.trim(),
            contractorName: contractorName.trim(),
            contractorPhone: contractorPhone.trim(),
            documents: documentsList,
          }
        : {
            plotNumber: session?.plotNumber,
            ownerName: session?.ownerName,
            phone: session?.phone,
            type: 'construction_noc',
            rulesAcceptedAt: new Date().toISOString(),
            ownerContactName: ownerContactName.trim(),
            ownerContactPhone: ownerContactPhone.trim(),
            contractorName: contractorName.trim(),
            contractorPhone: contractorPhone.trim(),
            documents: documentsList,
          };

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || (isEditing ? 'Failed to update application' : 'Failed to submit application'));
      }

      router.push('/owner/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error submitting request';
      setFormError(msg);
      setSubmitting(false);
    }
  };

  if (loading || loadingEdit) {
    return (
      <div className="py-20 text-center text-sm text-gray-500 animate-pulse">
        {loadingEdit ? 'Loading application for editing...' : 'Loading plot details...'}
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-12 text-center animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm space-y-4">
          <div className="p-3 w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 mx-auto flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Application Locked (Approved)</h2>
          <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
            Application <strong>#{editId}</strong> has already been approved or finalized by the AEOWA Management Committee. Once approved, applications cannot be altered directly by owners.
          </p>
          <button
            type="button"
            onClick={() => router.push('/owner/dashboard')}
            className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8 animate-in fade-in duration-200">
      {/* Edit Mode Alert Banner */}
      {isEditing && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 rounded-xl text-amber-800 shrink-0">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-amber-200/80 px-2 py-0.5 rounded text-amber-900">
                  {editId}
                </span>
                <span className="text-xs font-bold text-amber-900">Editing Pre-Approval Application</span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                Update your contact details or uploaded files below and click &quot;Save Changes&quot;.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 transition flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Delete Application</span>
            </button>
            <button
              type="button"
              onClick={() => router.push('/owner/dashboard')}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 transition cursor-pointer"
            >
              Cancel Edit
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-gray-900">
                  Delete Application #{editId}?
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Are you sure you want to permanently delete this application? All uploaded construction permits, building plans, and tax receipts will be purged from storage.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-xs font-semibold text-gray-700 transition cursor-pointer disabled:opacity-50"
              >
                Keep Application
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
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

      {/* Title Header */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
          <HardHat className="w-4 h-4" />
          <span>{isEditing ? 'Edit Application' : 'New Application'}</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
          {isEditing ? 'Modify Construction NOC Application' : 'Application for Residential Construction NOC'}
        </h1>
        <p className="text-xs text-gray-500">
          Plot No. {session?.plotNumber} • Applicant: {session?.ownerName}
        </p>
      </div>

      {formError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Mandatory Construction Rules Progressive Card Deck */}
        <OwnerConstructionRuleCards
          rulesAccepted={rulesAccepted}
          onAcceptChange={setRulesAccepted}
          isEditing={isEditing}
        />

        {/* Step 2: Required Document Uploads */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-700" />
              2. Mandatory Statutory Uploads
            </h2>
            <span className="text-[11px] text-rose-500 font-bold">* Required</span>
          </div>

          <p className="text-xs text-gray-500">
            Files are uploaded directly to Google Drive via browser-to-Drive resumable sync (bypasses
            file size limits for camera photos).
          </p>

          <DirectDriveUploader
            plotNumber={session?.plotNumber || ''}
            category="building_plan"
            label="Government-Approved Building Plan"
            description="Sanctioned architectural drawing / blueprint with approved setbacks"
            required
            existingDoc={docs.building_plan}
            onUploadComplete={handleDocUploaded}
          />

          <DirectDriveUploader
            plotNumber={session?.plotNumber || ''}
            category="construction_permit"
            label="Local Authority Construction License / Permit"
            description="Commencement Certificate (CC) or Panchayat / BBMP sanction permit"
            required
            existingDoc={docs.construction_permit}
            onUploadComplete={handleDocUploaded}
          />

          <DirectDriveUploader
            plotNumber={session?.plotNumber || ''}
            category="tax_receipt"
            label="Latest Property Tax Paid Receipt"
            description="Up-to-date property tax receipt for FY 2026-27"
            required
            existingDoc={docs.tax_receipt}
            onUploadComplete={handleDocUploaded}
          />
        </div>

        {/* Step 3: Owner & Contractor Contacts (Simplified per requirement) */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-emerald-700" />
              3. Owner & Contractor Contacts
            </h2>
            <span className="text-[11px] text-rose-500 font-bold">* Required</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Owner Details */}
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
              <span className="text-xs font-bold text-gray-900 block">Plot Owner Information</span>
              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                  Owner Name *
                </label>
                <input
                  type="text"
                  placeholder="Full Owner Name"
                  value={ownerContactName}
                  onChange={(e) => setOwnerContactName(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-emerald-600"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                  Owner Phone Number *
                </label>
                <input
                  type="tel"
                  placeholder="10-digit mobile"
                  value={ownerContactPhone}
                  onChange={(e) => setOwnerContactPhone(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-emerald-600"
                  required
                />
              </div>
            </div>

            {/* Contractor Details */}
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
              <span className="text-xs font-bold text-gray-900 block">Contractor Information</span>
              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                  Contractor Name / Firm *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Reddy (Reddy Builders)"
                  value={contractorName}
                  onChange={(e) => setContractorName(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-emerald-600"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                  Contractor Phone Number *
                </label>
                <input
                  type="tel"
                  placeholder="10-digit mobile"
                  value={contractorPhone}
                  onChange={(e) => setContractorPhone(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-emerald-600"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Step 4: Optional Supporting Uploads (COLLAPSED BY DEFAULT per Requirement 4) */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setShowOptionalUploads(!showOptionalUploads)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition cursor-pointer"
          >
            <div>
              <span className="text-xs font-bold text-gray-900 uppercase tracking-wider block">
                4. Optional Supporting Uploads (Expand to View)
              </span>
              <span className="text-[11px] text-gray-500">
                Neighbour permission letters, masked labourer photo IDs
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
              <span>{showOptionalUploads ? 'Collapse' : 'Expand'}</span>
              {showOptionalUploads ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>

          {showOptionalUploads && (
            <div className="p-5 pt-0 border-t border-gray-100 space-y-4 mt-2">
              <DirectDriveUploader
                plotNumber={session?.plotNumber || ''}
                category="neighbour_permission"
                label="Neighbour Permission / Consent Letter"
                description="Recommended if scaffolding or construction overhang borders adjacent plots"
                existingDoc={docs.neighbour_permission}
                onUploadComplete={handleDocUploaded}
              />

              <DirectDriveUploader
                plotNumber={session?.plotNumber || ''}
                category="labourer_ids"
                label="Masked Labourer Photo IDs / Security Roster"
                description="Government ID cards with numbers masked for security checkpoint clearance"
                existingDoc={docs.labourer_ids}
                onUploadComplete={handleDocUploaded}
              />
            </div>
          )}
        </div>

        {/* Strict Privacy Guarantee Box */}
        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-900 leading-tight">
            <strong>Strict Privacy Policy:</strong> Once submitted, your files are securely stored in
            AEOWA Google Drive. You can monitor verification status badges on your dashboard. Actual
            files and the issued NOC PDF are held exclusively for Association Admin review.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/owner/dashboard')}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>
              {isEditing ? 'Save Changes to Application' : 'Submit Construction NOC Application'}
            </span>
          </button>
        </div>
      </form>

      {/* Rules Modal */}
      <ConstructionRulesModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        accepted={rulesAccepted}
        onAccept={() => setRulesAccepted(true)}
      />
    </div>
  );
}
