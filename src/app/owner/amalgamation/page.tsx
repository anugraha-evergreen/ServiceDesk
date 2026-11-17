'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/session';
import { Plot, UploadedDoc } from '@/lib/types';
import { DirectDriveUploader } from '@/components/DirectDriveUploader';
import { Layers, FileText, CheckCircle2, Loader2, AlertCircle, Plus, X } from 'lucide-react';

export default function PlotAmalgamationPage() {
  const router = useRouter();
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
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        }),
      });

      if (!res.ok) throw new Error('Failed to submit amalgamation request');

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
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold">
          <Layers className="w-4 h-4" />
          <span>Multi-Plot Unification</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
          Request Plot Amalgamation
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
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition"
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
                    className="p-0.5 hover:bg-purple-200 rounded-full"
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
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-gray-600"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center gap-2"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>Submit Amalgamation Request</span>
          </button>
        </div>
      </form>
    </div>
  );
}
