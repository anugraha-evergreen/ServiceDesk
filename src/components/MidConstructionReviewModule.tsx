'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ServiceRequest, MidConstructionInspectionItem } from '@/lib/types';
import {
  HardHat,
  AlertTriangle,
  Camera,
  Trash2,
  Save,
  Loader2,
  ExternalLink,
  Plus,
  X,
  Tag,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react';

interface MidConstructionReviewModuleProps {
  request: ServiceRequest;
  onUpdate: (updated: ServiceRequest) => void;
}

export const MID_CONSTRUCTION_TAG_OPTIONS = [
  'Worker Toilet Not Made / Sanitation Violation',
  'Building Materials on Road / Blocking Berm',
  'Concrete Mixing on Asphalt Road',
  'Construction Debris / Excavated Soil Not Cleared',
  'Illegal BESCOM Power or Water Tapping',
  'Working Outside Permitted Hours / Sunday Noise',
  'Road Curb, Stormwater Drain or Tree Damage',
  'Other Field Observation / Bylaw Violation',
];

export const MidConstructionReviewModule: React.FC<MidConstructionReviewModuleProps> = ({
  request,
  onUpdate,
}) => {
  // Existing logged items for this plot
  const [items, setItems] = useState<MidConstructionInspectionItem[]>([]);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [selectedTag, setSelectedTag] = useState(MID_CONSTRUCTION_TAG_OPTIONS[0]);
  const [notes, setNotes] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Photo viewer lightbox
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state with request
  useEffect(() => {
    if (request && request.midConstructionReviews) {
      setItems(request.midConstructionReviews);
    } else {
      setItems([]);
    }
  }, [request]);

  // Clean up object URLs on unmount / change
  useEffect(() => {
    return () => {
      previews.forEach((url) => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
    };
  }, [previews]);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    setSelectedFiles((prev) => [...prev, ...newFiles]);

    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
    setPreviews((prev) => [...prev, ...newPreviews]);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveSelectedFile = (index: number) => {
    if (previews[index]?.startsWith('blob:')) {
      URL.revokeObjectURL(previews[index]);
    }
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveObservation = async () => {
    if (!selectedTag) return;
    setSaving(true);
    setSaveSuccessMsg(null);

    try {
      const uploadedUrls: string[] = [];
      const uploadedNames: string[] = [];

      // Upload photos sequentially
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('plotNumber', request.plotNumber);
        formData.append('category', 'supporting_doc');
        formData.append(
          'label',
          `Mid-Construction - Plot ${request.plotNumber} - ${selectedTag}`
        );

        const res = await fetch('/api/drive/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (res.ok && data.success && data.webViewLink) {
          uploadedUrls.push(data.webViewLink);
          uploadedNames.push(file.name);
        }
      }

      const newEntry: MidConstructionInspectionItem = {
        id: `obs_${Date.now()}`,
        title: selectedTag,
        description: notes.trim() || selectedTag,
        status: 'violation',
        notes: notes.trim() || undefined,
        imageUrl: uploadedUrls[0] || undefined,
        imageUrls: uploadedUrls.length > 0 ? uploadedUrls : undefined,
        imageFileName: uploadedNames.join(', ') || undefined,
        inspectedAt: new Date().toISOString(),
        inspectedBy: 'Managing Committee Site Inspector',
      };

      const updatedItems = [newEntry, ...items];

      const res = await fetch(`/api/requests/${request.id}?role=admin`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin',
        },
        body: JSON.stringify({
          role: 'admin',
          midConstructionReviews: updatedItems,
        }),
      });

      if (!res.ok) throw new Error('Failed to save mid-construction review');
      const data = await res.json();

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('aelra_cache_admin_requests');
      }

      setItems(updatedItems);
      onUpdate(data.request);

      // Reset form fields
      setSelectedTag(MID_CONSTRUCTION_TAG_OPTIONS[0]);
      setNotes('');
      setSelectedFiles([]);
      setPreviews([]);
      setShowForm(false);
      setSaveSuccessMsg(
        `✓ Observation and ${uploadedUrls.length > 0 ? `${uploadedUrls.length} photo(s)` : 'findings'} saved to Plot #${request.plotNumber} record.`
      );
    } catch (err: unknown) {
      console.error(err);
      alert('Error saving inspection observation');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to remove this logged observation?')) return;

    try {
      const updatedItems = items.filter((i) => i.id !== itemId);
      const res = await fetch(`/api/requests/${request.id}?role=admin`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin',
        },
        body: JSON.stringify({
          role: 'admin',
          midConstructionReviews: updatedItems,
        }),
      });

      if (!res.ok) throw new Error('Failed to delete item');
      const data = await res.json();

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('aelra_cache_admin_requests');
      }

      setItems(updatedItems);
      onUpdate(data.request);
    } catch (e) {
      console.error(e);
      alert('Error deleting observation');
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm space-y-4">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-100 rounded-xl text-emerald-800 shrink-0">
            <HardHat className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
              <span>Mid-Construction Site Review &amp; Photo Log</span>
            </h3>
            <p className="text-xs text-gray-500">
              Plot #{request.plotNumber} • Ongoing layout bylaws monitoring &amp; field evidence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
            {items.length} {items.length === 1 ? 'Record Logged' : 'Records Logged'}
          </span>

          {!showForm && (
            <button
              type="button"
              onClick={() => {
                setShowForm(true);
                setSaveSuccessMsg(null);
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Observation / Photo</span>
            </button>
          )}
        </div>
      </div>

      {/* Save Confirmation Banner with prominent + for adding more */}
      {saveSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="font-semibold">{saveSuccessMsg}</span>
          </div>
          {!showForm && (
            <button
              type="button"
              onClick={() => {
                setShowForm(true);
                setSaveSuccessMsg(null);
              }}
              className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs shadow-2xs transition flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add More</span>
            </button>
          )}
        </div>
      )}

      {/* Ongoing Entry Form */}
      {showForm && (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-700" />
              <span>Log New Site Observation / Issue</span>
            </span>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition cursor-pointer"
              title="Close form"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tag Dropdown & Quick Chips */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700">
              Select What&apos;s Wrong / Field Category:
            </label>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full text-xs bg-white border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:outline-emerald-600 focus:border-emerald-600"
            >
              {MID_CONSTRUCTION_TAG_OPTIONS.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>

            {/* Quick-tap Tag Chips for common issues */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {MID_CONSTRUCTION_TAG_OPTIONS.slice(0, 5).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(tag)}
                  className={`text-[11px] px-2.5 py-0.5 rounded-full border transition cursor-pointer ${
                    selectedTag === tag
                      ? 'bg-rose-100 text-rose-900 border-rose-300 font-bold'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {tag.split('/')[0].trim()}
                </button>
              ))}
            </div>
          </div>

          {/* Notes / Description */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700">
              Observation Notes / Location Details (Optional):
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Concrete mixed directly on layout asphalt road; worker toilet shed not constructed; contractor notified."
              className="w-full text-xs bg-white border border-gray-300 rounded-xl p-2.5 text-gray-900 focus:outline-emerald-600 focus:border-emerald-600"
            />
          </div>

          {/* Multiple Photos Picker */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-700">
              Attach Evidence Photos (Multiple allowed):
            </label>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFilesSelected}
              className="hidden"
              id="mid-review-photo-input"
            />

            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor="mid-review-photo-input"
                className="px-3.5 py-2 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Camera className="w-4 h-4 text-emerald-700" />
                <span>Choose Photos (Camera / Gallery)</span>
              </label>
              <span className="text-[11px] text-gray-500">
                {selectedFiles.length > 0
                  ? `${selectedFiles.length} photo(s) selected`
                  : 'Add on-site photos of the condition'}
              </span>
            </div>

            {/* Selected Photo Thumbnails Preview */}
            {previews.length > 0 && (
              <div className="flex flex-wrap gap-2.5 pt-2">
                {previews.map((previewUrl, idx) => (
                  <div
                    key={idx}
                    className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-300 bg-gray-100 group shadow-2xs"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt={`Selected photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveSelectedFile(idx)}
                      className="absolute top-0.5 right-0.5 p-0.5 bg-black/70 hover:bg-rose-600 text-white rounded-full transition cursor-pointer"
                      title="Remove this photo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setShowForm(false);
                setSelectedFiles([]);
                setPreviews([]);
              }}
              className="text-xs text-gray-500 hover:text-gray-800 font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={handleSaveObservation}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-600/70 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading &amp; Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Observation</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ALL ADDED OBSERVATIONS PLACED IN ONE UNIFIED LIST */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
            Consolidated Field Observation History ({items.length})
          </span>
          {items.length > 0 && !showForm && (
            <button
              type="button"
              onClick={() => {
                setShowForm(true);
                setSaveSuccessMsg(null);
              }}
              className="text-xs text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Observation</span>
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="p-6 text-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 space-y-2">
            <HardHat className="w-7 h-7 text-gray-300 mx-auto" />
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              No mid-construction observations or photos logged yet for Plot #{request.plotNumber}.
              Click <strong>&quot;Add Observation / Photo&quot;</strong> to record layout bylaw observations during site visits.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              // Gather photos (support both item.imageUrls array and single item.imageUrl)
              const allPhotos = item.imageUrls && item.imageUrls.length > 0
                ? item.imageUrls
                : item.imageUrl
                ? [item.imageUrl]
                : [];

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-white border border-gray-200 hover:border-emerald-300 shadow-2xs transition space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>{item.title}</span>
                        </span>

                        {item.inspectedAt && (
                          <span className="text-[11px] text-gray-400 font-mono">
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

                      {item.notes && (
                        <p className="text-xs text-gray-700 leading-relaxed pt-0.5">
                          &ldquo;{item.notes}&rdquo;
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer shrink-0"
                      title="Remove this observation record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Photo Thumbnails Gallery */}
                  {allPhotos.length > 0 && (
                    <div className="pt-1">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1.5 font-semibold">
                        Field Photos ({allPhotos.length}):
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {allPhotos.map((url, pIdx) => (
                          <div key={pIdx} className="relative group">
                            <button
                              type="button"
                              onClick={() => setActivePreviewUrl(url)}
                              className="relative w-14 h-14 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 hover:border-emerald-500 shadow-2xs transition cursor-pointer block"
                              title="Click to view full photo"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt={`Evidence photo ${pIdx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition"
                              />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox Photo Preview Modal */}
      {activePreviewUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setActivePreviewUrl(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 bg-gray-900 text-white flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span>Field Observation Photo • Plot #{request.plotNumber}</span>
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={activePreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-300 hover:text-white flex items-center gap-1 px-2 py-1 rounded bg-gray-800 hover:bg-gray-700"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open Full Size</span>
                </a>
                <button
                  type="button"
                  onClick={() => setActivePreviewUrl(null)}
                  className="p-1 text-gray-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-2 bg-black flex items-center justify-center max-h-[75vh] overflow-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activePreviewUrl}
                alt="Enlarged field observation"
                className="max-h-[70vh] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
