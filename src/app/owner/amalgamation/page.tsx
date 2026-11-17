'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/lib/session';
import { Plot, UploadedDoc } from '@/lib/types';
import { DirectDriveUploader } from '@/components/DirectDriveUploader';
import { Layers, FileText, CheckCircle2, Loader2, AlertCircle, Plus, X, Pencil, Lock } from 'lucide-react';

export default function PlotAmalgamationPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-sm text-gray-500 animate-pulse">
          Loading Plot Amalgamation application...
        </div>
      }
    >
      <PlotAmalgamationForm />
    </Suspense>
  );
}

function PlotAmalgamationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditing = Boolean(editId);

  const { session, loading } = useSession();

  const [allPlots, setAllPlots] = useState<Plot[]>([]);
  const [secondaryPlots, setSecondaryPlots] = useState<string[]>([]);
  const [customPlotInput, setCustomPlotInput] = useState('');
  const [sanctionDoc, setSanctionDoc] = useState<UploadedDoc | null>(null);
  const [reason, setReason] = useState(
    'Constructing a single unified residential dwelling across adjacent plots.'
  );
  const [sanctionNumber, setSanctionNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  useEffect(() => {
    if (!loading && (!session || session.role !== 'owner')) {
      router.push('/owner/login');
      return;
    }

    fetch('/api/plots')
      .then((r) => r.json())
      .then((d) => {
        if (d.plots) setAllPlots(d.plots);
      })
      .catch(console.error);
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
            if (req.amalgamationDetails) {
              if (Array.isArray(req.amalgamationDetails.secondaryPlotNumbers)) {
                setSecondaryPlots(req.amalgamationDetails.secondaryPlotNumbers);
              }
              if (req.amalgamationDetails.sanctionOrderNumber) {
                setSanctionNumber(req.amalgamationDetails.sanctionOrderNumber);
              }
              if (req.amalgamationDetails.reason) {
                setReason(req.amalgamationDetails.reason);
              }
            }
            if (req.documents && req.documents.length > 0) {
              setSanctionDoc(req.documents[0]);
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

  const addPlot = (pNum: string) => {
    const clean = pNum.trim();
    if (!clean || clean === session?.plotNumber || secondaryPlots.includes(clean)) return;
    setSecondaryPlots([...secondaryPlots, clean]);
    setCustomPlotInput('');
  };

  const removePlot = (pNum: string) => {
    setSecondaryPlots(secondaryPlots.filter((p) => p !== pNum));
  };

  const targetUnified =
    session?.plotNumber && secondaryPlots.length > 0
      ? `${session.plotNumber} & ${secondaryPlots.join(' & ')}`
      : session?.plotNumber || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (secondaryPlots.length === 0) {
      setError('Please add at least one additional adjacent plot to amalgamate.');
      return;
    }

    if (!sanctionDoc) {
      setError('Please upload the joint deed or statutory amalgamation sanction order.');
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = isEditing ? `/api/requests/${editId}?role=owner` : '/api/requests';
      const method = isEditing ? 'PATCH' : 'POST';
      const payload = isEditing
        ? {
            amalgamationDetails: {
              secondaryPlotNumbers: secondaryPlots,
              targetUnifiedPlotNumber: targetUnified,
              sanctionOrderNumber: sanctionNumber.trim(),
              reason: reason.trim(),
            },
            documents: [sanctionDoc],
          }
        : {
            plotNumber: session?.plotNumber,
            ownerName: session?.ownerName,
            phone: session?.phone,
            type: 'plot_amalgamation',
            amalgamationDetails: {
              secondaryPlotNumbers: secondaryPlots,
              targetUnifiedPlotNumber: targetUnified,
              sanctionOrderNumber: sanctionNumber.trim(),
              reason: reason.trim(),
            },
            documents: [sanctionDoc],
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
          <div className="p-3 w-12 h-12 rounded-2xl bg-purple-100 text-purple-800 mx-auto flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Application Locked (Approved)</h2>
          <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
            Application <strong>#{editId}</strong> has already been approved or processed by the AEOWA Management Committee. Once approved, applications cannot be altered directly by owners.
          </p>
          <button
            type="button"
            onClick={() => router.push('/owner/dashboard')}
            className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition cursor-pointer"
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
        <div className="p-4 rounded-2xl bg-purple-50 border border-purple-300 text-purple-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-100 rounded-xl text-purple-800 shrink-0">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-purple-200/80 px-2 py-0.5 rounded text-purple-900">
                  {editId}
                </span>
                <span className="text-xs font-bold text-purple-900">Editing Pre-Approval Request</span>
              </div>
              <p className="text-xs text-purple-800 mt-0.5">
                Update constituent plots, sanction number, or replace attached document and click &quot;Save Changes&quot;.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push('/owner/dashboard')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-purple-300 bg-white hover:bg-purple-100 text-purple-900 transition self-start sm:self-auto cursor-pointer"
          >
            Cancel Edit
          </button>
        </div>
      )}

      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold">
          <Layers className="w-4 h-4" />
          <span>{isEditing ? 'Edit Request' : 'Multi-Plot Unification'}</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
          {isEditing ? 'Modify Plot Amalgamation Request' : 'Request Plot Amalgamation'}
        </h1>
        <p className="text-xs text-gray-500">
          Primary Plot No. {session?.plotNumber} • Combines adjacent plots into a unified maintenance
          record
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Step 1: Select Secondary Plots */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            1. Select Adjacent Plots to Merge
          </h2>

          <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200 text-xs text-purple-950 space-y-1">
            <span className="font-bold">Proposed Unified Plot Number:</span>
            <div className="font-mono text-sm font-extrabold text-purple-900">{targetUnified}</div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Add Secondary Plot Number:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. 15 or 43"
                value={customPlotInput}
                onChange={(e) => setCustomPlotInput(e.target.value)}
                className="w-40 text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-emerald-600"
              />
              <button
                type="button"
                onClick={() => addPlot(customPlotInput)}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Plot</span>
              </button>
            </div>
          </div>

          {/* Selected Plots Badges */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Plots in this amalgamation:
            </span>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-100 text-emerald-900 text-xs font-bold border border-emerald-300">
                Plot #{session?.plotNumber} (Primary)
              </span>
              {secondaryPlots.map((sp) => (
                <span
                  key={sp}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-100 text-purple-900 text-xs font-bold border border-purple-300"
                >
                  <span>Plot #{sp}</span>
                  <button
                    type="button"
                    onClick={() => removePlot(sp)}
                    className="p-0.5 hover:bg-purple-200 rounded-full cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Step 2: Supporting Documents */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            2. Statutory Sanction or Joint Deed Upload
          </h2>

          <DirectDriveUploader
            plotNumber={session?.plotNumber || ''}
            category="amalgamation_sanction"
            label="BDA / Planning Authority Amalgamation Order or Combined Khata"
            description="Official sanction approving the amalgamation of adjacent sites"
            required
            existingDoc={sanctionDoc || undefined}
            onUploadComplete={(doc) => {
              setSanctionDoc(doc);
              setError(null);
            }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Sanction Order Number (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. BDA/TP/AML/2026/8942"
                value={sanctionNumber}
                onChange={(e) => setSanctionNumber(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-emerald-600 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Purpose of Amalgamation
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
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
            className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>{isEditing ? 'Save Changes to Amalgamation' : 'Submit Amalgamation Request'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
