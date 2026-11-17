'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/lib/session';
import { UploadedDoc } from '@/lib/types';
import { DirectDriveUploader } from '@/components/DirectDriveUploader';
import { Compass, FileText, CheckCircle2, Loader2, AlertCircle, Pencil, Lock } from 'lucide-react';

export default function ReMeasurementNocPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-sm text-gray-500 animate-pulse">
          Loading Re-Measurement NOC application...
        </div>
      }
    >
      <ReMeasurementNocForm />
    </Suspense>
  );
}

function ReMeasurementNocForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditing = Boolean(editId);

  const { session, loading } = useSession();

  const [optionalDoc, setOptionalDoc] = useState<UploadedDoc | null>(null);
  const [reason, setReason] = useState('Boundary fencing & physical survey verification');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  useEffect(() => {
    if (!loading && (!session || session.role !== 'owner')) {
      router.push('/');
    }
  }, [session, loading, router]);

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
            if (req.adminNotes) {
              setReason(req.adminNotes);
            }
            if (req.documents && req.documents.length > 0) {
              setOptionalDoc(req.documents[0]);
            }
          } else {
            setError('Request not found or unavailable for editing.');
          }
        })
        .catch((err) => {
          console.error(err);
          setError('Failed to load application details.');
        })
        .finally(() => setLoadingEdit(false));
    }
  }, [editId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    setSubmitting(true);
    try {
      const documentsList = optionalDoc ? [optionalDoc] : [];

      const endpoint = isEditing ? `/api/requests/${editId}?role=owner` : '/api/requests';
      const method = isEditing ? 'PATCH' : 'POST';
      const payload = isEditing
        ? {
            adminNotes: reason.trim(),
            documents: documentsList,
          }
        : {
            plotNumber: session?.plotNumber,
            ownerName: session?.ownerName,
            phone: session?.phone,
            type: 'remeasurement_noc',
            documents: documentsList,
            adminNotes: reason.trim(),
          };

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || (isEditing ? 'Failed to update request' : 'Failed to submit request'));
      }

      router.push('/owner/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error submitting request';
      setError(msg);
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
          <div className="p-3 w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 mx-auto flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Application Locked (Approved)</h2>
          <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
            Application <strong>#{editId}</strong> has already been approved or processed by the AEOWA Management Committee. Once approved, applications cannot be altered directly by owners.
          </p>
          <button
            type="button"
            onClick={() => router.push('/owner/dashboard')}
            className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition cursor-pointer"
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
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-300 text-blue-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 rounded-xl text-blue-800 shrink-0">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-blue-200/80 px-2 py-0.5 rounded text-blue-900">
                  {editId}
                </span>
                <span className="text-xs font-bold text-blue-900">Editing Pre-Approval Request</span>
              </div>
              <p className="text-xs text-blue-800 mt-0.5">
                Update survey reason or replace attached document and click &quot;Save Changes&quot;.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push('/owner/dashboard')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-300 bg-white hover:bg-blue-100 text-blue-900 transition self-start sm:self-auto cursor-pointer"
          >
            Cancel Edit
          </button>
        </div>
      )}

      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
          <Compass className="w-4 h-4" />
          <span>{isEditing ? 'Edit Request' : 'Survey & Boundary Clearance'}</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
          {isEditing ? 'Modify Site Re-Measurement Request' : 'Application for Site Re-Measurement NOC'}
        </h1>
        <p className="text-xs text-gray-500">
          Plot No. {session?.plotNumber} • Applicant: {session?.ownerName}
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-3">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            1. Purpose / Details of Re-Measurement
          </h2>

          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Setting up boundary compound wall, checking survey stone alignment, verifying dimensions..."
            className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-blue-600"
            required
          />
        </div>

        {/* Optional Document Upload */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-600" />
              2. Supporting Documents (Optional)
            </h2>
            <span className="text-[11px] text-gray-400 font-medium">Optional</span>
          </div>

          <p className="text-xs text-gray-500">
            Upload any relevant site document, deed copy, sketch, or photo (if available).
          </p>

          <DirectDriveUploader
            plotNumber={session?.plotNumber || ''}
            category="supporting_doc"
            label="Upload Supporting Document (Optional)"
            description="PDF, JPG, PNG — e.g. sketch, deed page, site photo"
            required={false}
            existingDoc={optionalDoc || undefined}
            onUploadComplete={(doc) => {
              setOptionalDoc(doc);
              setError(null);
            }}
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => router.push('/owner/dashboard')}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-gray-600 cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>{isEditing ? 'Save Changes to Request' : 'Submit Re-Measurement Request'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
