'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/session';
import { UploadedDoc } from '@/lib/types';
import { DirectDriveUploader } from '@/components/DirectDriveUploader';
import { ConstructionRulesModal } from '@/components/ConstructionRulesModal';
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
} from 'lucide-react';

export default function ConstructionNocPage() {
  const router = useRouter();
  const { session, loading } = useSession();

  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

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

  useEffect(() => {
    if (!loading && (!session || session.role !== 'owner')) {
      router.push('/');
      return;
    }
    if (session) {
      setOwnerContactName(session.ownerName || '');
      setOwnerContactPhone(session.phone || '');
    }
  }, [session, loading, router]);

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

      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit application');
      }

      router.push('/owner/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error submitting request';
      setFormError(msg);
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8 animate-in fade-in duration-200">
      {/* Title Header */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
          <HardHat className="w-4 h-4" />
          <span>New Application</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
          Application for Residential Construction NOC
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
        {/* Step 1: Mandatory Construction Rules (Displayed here when entering Construction NOC) */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              1. Mandatory Construction Rules & Guidelines Acceptance
            </h2>
            <span className="text-[11px] text-emerald-700 font-mono">
              Ver: {CONSTRUCTION_RULES_VERSION}
            </span>
          </div>

          <p className="text-xs text-gray-600 leading-relaxed">
            Layout bylaws mandate strict adherence to working hours (8 AM - 6 PM Mon-Sat), no heavy
            machinery on Sundays, on-site labourer toilets, and road protection.
          </p>

          <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs">
              <span className="font-semibold text-emerald-950 block">
                {CONSTRUCTION_RULES_TITLE}
              </span>
              <span className="text-[11px] text-emerald-800">
                Includes ₹20,000 security deposit terms, worker sanitation & road damage rules.
              </span>
            </div>

            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="px-3.5 py-2 bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-100 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer"
            >
              Read Rules & Guidelines
            </button>
          </div>

          <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={rulesAccepted}
              onChange={(e) => setRulesAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
            />
            <span className="text-xs sm:text-sm text-gray-800 font-medium">
              I have read, understood, and accept the{' '}
              <strong className="text-emerald-800">Mandatory Construction Rules & Guidelines</strong>{' '}
              on behalf of myself and my contractor. *
            </span>
          </label>
        </div>

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
            <span>Submit Construction NOC Application</span>
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
