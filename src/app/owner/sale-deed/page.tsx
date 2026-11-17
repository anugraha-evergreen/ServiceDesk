'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/lib/session';
import { UploadedDoc } from '@/lib/types';
import { DirectDriveUploader } from '@/components/DirectDriveUploader';
import { FileText, CheckCircle2, Loader2, AlertCircle, Pencil, Lock } from 'lucide-react';

export default function SaleDeedUploadPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-sm text-gray-500 animate-pulse">
          Loading Sale Deed application...
        </div>
      }
    >
      <SaleDeedForm />
    </Suspense>
  );
}

function SaleDeedForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditing = Boolean(editId);

  const { session, loading } = useSession();

  const [saleDeedDoc, setSaleDeedDoc] = useState<UploadedDoc | null>(null);
  const [prevOwner, setPrevOwner] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [deedNumber, setDeedNumber] = useState('');
  const [regDate, setRegDate] = useState(new Date().toISOString().split('T')[0]);
  const [subRegistrarOffice, setSubRegistrarOffice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  useEffect(() => {
    if (!loading && (!session || session.role !== 'owner')) {
      router.push('/owner/login');
    }
    if (session?.ownerName && !isEditing) {
      setNewOwner(session.ownerName);
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
            if (req.saleDeedDetails) {
              setPrevOwner(req.saleDeedDetails.previousOwnerName || '');
              setNewOwner(req.saleDeedDetails.newOwnerName || '');
              setDeedNumber(req.saleDeedDetails.deedNumber || '');
              if (req.saleDeedDetails.registrationDate) {
                setRegDate(req.saleDeedDetails.registrationDate);
              }
              setSubRegistrarOffice(req.saleDeedDetails.subRegistrarOffice || '');
            }
            if (req.documents && req.documents.length > 0) {
              setSaleDeedDoc(req.documents[0]);
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
    if (!saleDeedDoc) {
      setError('Please upload your registered Sale Deed copy.');
      return;
    }

    if (!prevOwner.trim() || !newOwner.trim() || !deedNumber.trim() || !subRegistrarOffice.trim()) {
      setError('Please complete all conveyance registration details.');
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = isEditing ? `/api/requests/${editId}?role=owner` : '/api/requests';
      const method = isEditing ? 'PATCH' : 'POST';
      const payload = isEditing
        ? {
            saleDeedDetails: {
              previousOwnerName: prevOwner.trim(),
              newOwnerName: newOwner.trim(),
              deedNumber: deedNumber.trim(),
              registrationDate: regDate,
              subRegistrarOffice: subRegistrarOffice.trim(),
            },
            documents: [saleDeedDoc],
          }
        : {
            plotNumber: session?.plotNumber,
            ownerName: newOwner.trim(),
            phone: session?.phone,
            type: 'sale_deed',
            saleDeedDetails: {
              previousOwnerName: prevOwner.trim(),
              newOwnerName: newOwner.trim(),
              deedNumber: deedNumber.trim(),
              registrationDate: regDate,
              subRegistrarOffice: subRegistrarOffice.trim(),
            },
            documents: [saleDeedDoc],
          };

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || (isEditing ? 'Failed to update Sale Deed' : 'Failed to submit Sale Deed'));
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
          <div className="p-3 w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 mx-auto flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Application Locked (Approved)</h2>
          <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
            Application <strong>#{editId}</strong> has already been approved or processed by the AEOWA Management Committee. Once approved, applications cannot be altered directly by owners.
          </p>
          <button
            type="button"
            onClick={() => router.push('/owner/dashboard')}
            className="px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold transition cursor-pointer"
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
                Update conveyance details or replace attached deed document and click &quot;Save Changes&quot;.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push('/owner/dashboard')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 transition self-start sm:self-auto cursor-pointer"
          >
            Cancel Edit
          </button>
        </div>
      )}

      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
          <FileText className="w-4 h-4" />
          <span>{isEditing ? 'Edit Submission' : 'Title & Ownership Registry'}</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
          {isEditing ? 'Modify Sale Deed Submission' : 'Registered Sale Deed Submission'}
        </h1>
        <p className="text-xs text-gray-500">
          Plot No. {session?.plotNumber} • Updates Association Master Ownership Records
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            1. Registered Sale Deed Document
          </h2>

          <DirectDriveUploader
            plotNumber={session?.plotNumber || ''}
            category="sale_deed_doc"
            label="Complete Registered Sale Deed (PDF)"
            description="With Sub-Registrar seal & stamp duty pages"
            required
            existingDoc={saleDeedDoc || undefined}
            onUploadComplete={(doc) => {
              setSaleDeedDoc(doc);
              setError(null);
            }}
          />
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            2. Conveyance & Sub-Registrar Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Previous Owner Name (Seller) *
              </label>
              <input
                type="text"
                value={prevOwner}
                onChange={(e) => setPrevOwner(e.target.value)}
                placeholder="Name as per previous deed"
                className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-emerald-600"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                New Purchaser Name (Buyer) *
              </label>
              <input
                type="text"
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
                placeholder="Full legal owner name"
                className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-emerald-600"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Deed / Document Number *
              </label>
              <input
                type="text"
                value={deedNumber}
                onChange={(e) => setDeedNumber(e.target.value)}
                placeholder="e.g. KBL-1-04982-2026-27"
                className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-emerald-600 font-mono"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Registration Date *
              </label>
              <input
                type="date"
                value={regDate}
                onChange={(e) => setRegDate(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-emerald-600"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Sub-Registrar Office (SRO) *
              </label>
              <input
                type="text"
                value={subRegistrarOffice}
                onChange={(e) => setSubRegistrarOffice(e.target.value)}
                placeholder="e.g. Sub-Registrar Office, Bommanahalli / Anekal"
                className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-emerald-600"
                required
              />
            </div>
          </div>
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
            className="px-6 py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>{isEditing ? 'Save Changes to Sale Deed' : 'Submit Sale Deed for Admin Verification'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
