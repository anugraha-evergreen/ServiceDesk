'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/session';
import { UploadedDoc } from '@/lib/types';
import { DirectDriveUploader } from '@/components/DirectDriveUploader';
import { Compass, FileText, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

export default function ReMeasurementNocPage() {
  const router = useRouter();
  const { session, loading } = useSession();

  const [optionalDoc, setOptionalDoc] = useState<UploadedDoc | null>(null);
  const [reason, setReason] = useState('Boundary fencing & physical survey verification');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!session || session.role !== 'owner')) {
      router.push('/');
    }
  }, [session, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    setSubmitting(true);
    try {
      const documentsList = optionalDoc ? [optionalDoc] : [];

      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plotNumber: session?.plotNumber,
          ownerName: session?.ownerName,
          phone: session?.phone,
          type: 'remeasurement_noc',
          documents: documentsList,
          adminNotes: reason,
        }),
      });

      if (!res.ok) throw new Error('Failed to submit re-measurement request');

      router.push('/owner/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error submitting request';
      setError(msg);
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8 animate-in fade-in duration-200">
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
          <Compass className="w-4 h-4" />
          <span>Survey & Boundary Clearance</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
          Application for Site Re-Measurement NOC
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
            className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-emerald-600"
            required
          />
        </div>

        {/* Optional Document Upload - Open for any document per requirement 5 */}
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
            <span>Submit Re-Measurement Request</span>
          </button>
        </div>
      </form>
    </div>
  );
}
