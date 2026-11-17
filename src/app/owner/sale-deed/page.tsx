'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/session';
import { UploadedDoc } from '@/lib/types';
import { DirectDriveUploader } from '@/components/DirectDriveUploader';
import { FileText, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

export default function SaleDeedUploadPage() {
  const router = useRouter();
  const { session, loading } = useSession();

  const [saleDeedDoc, setSaleDeedDoc] = useState<UploadedDoc | null>(null);
  const [prevOwner, setPrevOwner] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [deedNumber, setDeedNumber] = useState('');
  const [regDate, setRegDate] = useState(new Date().toISOString().split('T')[0]);
  const [subRegistrarOffice, setSubRegistrarOffice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!session || session.role !== 'owner')) {
      router.push('/owner/login');
    }
    if (session?.ownerName) {
      setNewOwner(session.ownerName);
    }
  }, [session, loading, router]);

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
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        }),
      });

      if (!res.ok) throw new Error('Failed to submit Sale Deed');

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
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
          <FileText className="w-4 h-4" />
          <span>Title & Ownership Registry</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
          Registered Sale Deed Submission
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
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-gray-600"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center gap-2"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>Submit Sale Deed for Admin Verification</span>
          </button>
        </div>
      </form>
    </div>
  );
}
