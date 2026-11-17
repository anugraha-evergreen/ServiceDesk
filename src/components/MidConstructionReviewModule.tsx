'use client';

import React, { useState, useEffect } from 'react';
import { ServiceRequest, MidConstructionInspectionItem } from '@/lib/types';
import {
  HardHat,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Camera,
  Trash2,
  Save,
  Loader2,
  ExternalLink,
  Plus,
  ShieldAlert,
  Image as ImageIcon,
  X,
} from 'lucide-react';

interface MidConstructionReviewModuleProps {
  request: ServiceRequest;
  onUpdate: (updated: ServiceRequest) => void;
}

export const DEFAULT_MID_CONSTRUCTION_CHECKPOINTS: Omit<
  MidConstructionInspectionItem,
  'status' | 'notes' | 'imageUrl' | 'imageFileName' | 'inspectedAt' | 'inspectedBy'
>[] = [
  {
    id: 'toilet',
    title: '1. On-Site Worker Sanitation & Toilet',
    description:
      'Temporary functioning toilet and bathroom connected to UGD inspection chamber or septic tank constructed on-site; zero open defecation anywhere in layout.',
  },
  {
    id: 'materials_road',
    title: '2. Building Materials Inside Plot Boundary',
    description:
      'All sand, blue metal, bricks, and steel stacked strictly inside plot boundaries; layout asphalt roads and pedestrian paths kept 100% clear.',
  },
  {
    id: 'concrete_mixing',
    title: '3. Zero Concrete Mixing on Asphalt Road',
    description:
      'Concrete or mortar mixing strictly conducted on mixing trays or tarps; zero cement slurry allowed to flow into layout stormwater drains.',
  },
  {
    id: 'debris_clearance',
    title: '4. Periodic Debris & Surplus Soil Clearance',
    description:
      'Regular carting away of excavated mud and construction rubble; no dumping on layout road shoulders or neighbouring vacant plots.',
  },
  {
    id: 'power_water',
    title: '5. Authorized BESCOM Electricity & Water Sourcing',
    description:
      'Legal temporary construction power drawn through official BESCOM meter; zero tapping from street light poles or neighbouring plots.',
  },
  {
    id: 'working_hours',
    title: '6. Permitted Working Hours & Sunday Quiet Policy',
    description:
      'Work strictly between 8:00 AM and 6:00 PM Mon-Sat; no heavy machinery, stone cutters, or noisy work on Sundays or layout holidays.',
  },
  {
    id: 'infra_protection',
    title: '7. Preservation of Road Curbs, Drains & Trees',
    description:
      'Asphalt road surface, concrete kerbs, culvert covers, and layout avenue plantation trees preserved intact without heavy vehicle impact.',
  },
];

export const MidConstructionReviewModule: React.FC<MidConstructionReviewModuleProps> = ({
  request,
  onUpdate,
}) => {
  // Initialize checklist items merging existing with defaults
  const [items, setItems] = useState<MidConstructionInspectionItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);

  // Custom checkpoint inputs
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customDesc, setCustomDesc] = useState('');

  // Sync state whenever request changes
  useEffect(() => {
    if (request) {
      const existing = request.midConstructionReviews || [];
      const merged: MidConstructionInspectionItem[] = DEFAULT_MID_CONSTRUCTION_CHECKPOINTS.map(
        (def) => {
          const found = existing.find((e) => e.id === def.id);
          if (found) return found;
          return {
            ...def,
            status: 'pending',
          };
        }
      );

      // Add any custom items that were saved previously
      existing.forEach((e) => {
        if (!merged.some((m) => m.id === e.id)) {
          merged.push(e);
        }
      });

      setItems(merged);
    }
  }, [request]);

  const handleStatusChange = (
    id: string,
    status: 'compliant' | 'violation' | 'pending'
  ) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              inspectedAt: new Date().toISOString(),
              inspectedBy: 'Managing Committee Site Inspector',
            }
          : item
      )
    );
    setSaveSuccess(false);
  };

  const handleNotesChange = (id: string, notes: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, notes } : item))
    );
    setSaveSuccess(false);
  };

  const handlePhotoUpload = async (id: string, file: File) => {
    setUploadingId(id);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('plotNumber', request.plotNumber);
      formData.append('category', 'supporting_doc');
      formData.append(
        'label',
        `Mid-Construction Review - Plot ${request.plotNumber} - ${id}`
      );

      const res = await fetch('/api/drive/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                imageUrl: data.webViewLink,
                imageFileName: file.name,
                inspectedAt: new Date().toISOString(),
              }
            : item
        )
      );
      setSaveSuccess(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Photo upload failed';
      alert(`Error uploading inspection photo: ${msg}`);
    } finally {
      setUploadingId(null);
    }
  };

  const handleRemovePhoto = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              imageUrl: undefined,
              imageFileName: undefined,
            }
          : item
      )
    );
    setSaveSuccess(false);
  };

  const handleAddCustom = () => {
    if (!customTitle.trim()) return;
    const newItem: MidConstructionInspectionItem = {
      id: `custom_${Date.now()}`,
      title: customTitle.trim(),
      description: customDesc.trim() || 'Custom site observation logged by Association inspector.',
      status: 'pending',
    };
    setItems((prev) => [...prev, newItem]);
    setCustomTitle('');
    setCustomDesc('');
    setShowAddCustom(false);
    setSaveSuccess(false);
  };

  const handleDeleteCustom = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/requests/${request.id}?role=admin`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin',
        },
        body: JSON.stringify({
          role: 'admin',
          midConstructionReviews: items,
        }),
      });

      if (!res.ok) throw new Error('Failed to save mid-construction review');
      const data = await res.json();

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('aelra_cache_admin_requests');
      }
      onUpdate(data.request);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      console.error(err);
      alert('Error saving mid-construction inspection findings');
    } finally {
      setSaving(false);
    }
  };

  const compliantCount = items.filter((i) => i.status === 'compliant').length;
  const violationCount = items.filter((i) => i.status === 'violation').length;
  const pendingCount = items.filter((i) => i.status === 'pending').length;

  return (
    <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-800">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
                <span>Mid-Construction Site Review & Field Compliance</span>
              </h3>
              <p className="text-xs text-gray-500">
                Plot #{request.plotNumber} • Ongoing layout bylaws monitoring & field photo evidence
              </p>
            </div>
          </div>
        </div>

        {/* Status Counters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{compliantCount} Compliant</span>
          </span>
          <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>{violationCount} Violations</span>
          </span>
          <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-gray-50 text-gray-600 border border-gray-200 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span>{pendingCount} Pending</span>
          </span>
        </div>
      </div>

      {/* Info notice about refund flow linkage */}
      <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="block text-amber-950 font-semibold">
            Linked to Security Deposit Refund Flow:
          </strong>
          Any violations and photo evidence logged here are automatically surfaced to the Association Committee during the ₹20,000 deposit refund inspection to substantiate repair deductions.
        </div>
      </div>

      {/* Checkpoints List */}
      <div className="space-y-3.5">
        {items.map((item) => {
          const isCompliant = item.status === 'compliant';
          const isViolation = item.status === 'violation';
          const isPending = item.status === 'pending';
          const isCustom = item.id.startsWith('custom_');

          return (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition space-y-3 ${
                isViolation
                  ? 'bg-rose-50/60 border-rose-300'
                  : isCompliant
                  ? 'bg-emerald-50/40 border-emerald-200'
                  : 'bg-gray-50/70 border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Row Top: Title + Action buttons */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-gray-900">
                      {item.title}
                    </span>
                    {isViolation && (
                      <span className="text-[10px] font-bold text-rose-800 bg-rose-100 border border-rose-300 px-1.5 py-0.5 rounded">
                        Violation Recorded
                      </span>
                    )}
                    {isCompliant && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded">
                        Verified Compliant
                      </span>
                    )}
                    {isCustom && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCustom(item.id)}
                        className="text-gray-400 hover:text-rose-600 transition p-0.5"
                        title="Delete custom checkpoint"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Status Toggle Buttons */}
                <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleStatusChange(item.id, 'compliant')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      isCompliant
                        ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500'
                        : 'bg-white hover:bg-emerald-50 text-gray-700 border border-gray-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Compliant</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange(item.id, 'violation')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      isViolation
                        ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-500'
                        : 'bg-white hover:bg-rose-50 text-gray-700 border border-gray-200'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Violation</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange(item.id, 'pending')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                      isPending
                        ? 'bg-gray-300 text-gray-800 shadow-xs'
                        : 'bg-white hover:bg-gray-100 text-gray-500 border border-gray-200'
                    }`}
                  >
                    <span>Pending</span>
                  </button>
                </div>
              </div>

              {/* Row Bottom: Inspector Notes & Photo Attachment */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-gray-200/60">
                <div className="md:col-span-2">
                  <input
                    type="text"
                    placeholder="Add inspector observation / rectification instructions..."
                    value={item.notes || ''}
                    onChange={(e) => handleNotesChange(item.id, e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-emerald-600 text-gray-800"
                  />
                  {item.inspectedAt && (
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      Logged:{' '}
                      {new Date(item.inspectedAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>

                {/* Photo attachment preview / button */}
                <div className="flex items-center justify-end gap-2">
                  {item.imageUrl ? (
                    <div className="flex items-center gap-2 p-1.5 bg-white border border-gray-200 rounded-lg shadow-2xs">
                      {/* Thumbnail button */}
                      <button
                        type="button"
                        onClick={() => setActivePreviewUrl(item.imageUrl || null)}
                        className="relative w-10 h-10 rounded-md overflow-hidden bg-gray-100 border border-gray-200 group shrink-0"
                        title="Click to view full photo"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.imageUrl}
                          alt="Inspection proof"
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                      </button>

                      <div className="max-w-[120px] text-left">
                        <span className="text-[11px] font-semibold text-gray-800 block truncate">
                          {item.imageFileName || 'Inspection Photo'}
                        </span>
                        <a
                          href={item.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-emerald-700 hover:underline flex items-center gap-0.5"
                        >
                          <span>Full View</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(item.id)}
                        className="p-1 text-gray-400 hover:text-rose-600 rounded transition"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
                        uploadingId === item.id
                          ? 'bg-gray-100 text-gray-400 border-gray-200 pointer-events-none'
                          : 'bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      {uploadingId === item.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Attach Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handlePhotoUpload(item.id, f);
                            }}
                          />
                        </>
                      )}
                    </label>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Custom Checkpoint Section */}
      {showAddCustom ? (
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-900">
              Add Custom Site Inspection Point
            </span>
            <button
              type="button"
              onClick={() => setShowAddCustom(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            placeholder="Checkpoint Title (e.g. Boundary Peg Displaced)"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-emerald-600"
          />
          <input
            type="text"
            placeholder="Details / context (optional)"
            value={customDesc}
            onChange={(e) => setCustomDesc(e.target.value)}
            className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-emerald-600"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddCustom(false)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddCustom}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800"
            >
              Add Checkpoint
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddCustom(true)}
          className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 flex items-center gap-1.5 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Custom Observation / Checkpoint</span>
        </button>
      )}

      {/* Save Action Footer */}
      <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          {saveSuccess && (
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Mid-construction review and photos successfully saved on record!</span>
            </span>
          )}
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-600/70 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{saving ? 'Saving Review Findings...' : 'Save Mid-Construction Review'}</span>
        </button>
      </div>

      {/* Photo Preview Lightbox Modal */}
      {activePreviewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setActivePreviewUrl(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] bg-black rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 bg-gray-900/90 text-white flex items-center justify-between">
              <span className="text-xs font-medium flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span>Field Inspection Photo • Plot #{request.plotNumber}</span>
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={activePreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-md text-emerald-200 transition"
                >
                  Open Original
                </a>
                <button
                  type="button"
                  onClick={() => setActivePreviewUrl(null)}
                  className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-2 overflow-auto flex items-center justify-center bg-black/90">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activePreviewUrl}
                alt="Enlarged field inspection evidence"
                className="max-h-[75vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
