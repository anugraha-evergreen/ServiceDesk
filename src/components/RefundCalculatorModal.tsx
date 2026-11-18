'use client';

import React, { useState, useEffect } from 'react';
import {
  PostConstructionRefund,
  ServiceRequest,
  DeductionItem,
  RefundInspectionPhoto,
  MidConstructionInspectionItem,
} from '@/lib/types';
import { DirectDriveUploader } from './DirectDriveUploader';
import {
  Banknote,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  FileCheck,
  Save,
  Loader2,
  X,
  ShieldCheck,
  Download,
  Camera,
  Image as ImageIcon,
  ExternalLink,
  HardHat,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface RefundCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: ServiceRequest;
  onUpdate: (updated: ServiceRequest) => void;
}

export const RefundCalculatorModal: React.FC<RefundCalculatorModalProps> = ({
  isOpen,
  onClose,
  request,
  onUpdate,
}) => {
  const baseDeposit = 20000;

  // 6 Core Managing Committee Site Inspection Categories
  const inspectionCategories = [
    {
      id: 'debris',
      name: '1. Debris Removal & Site Cleanliness',
      description: 'All construction waste, mud & surplus debris cleared; surrounding road berms graded and tidy.',
      defaultReason: 'Debris removal & surrounding site cleaning expenses',
      defaultAmount: 3000,
    },
    {
      id: 'roads',
      name: '2. Layout Asphalt Roads & Berms',
      description: 'Asphalt roads, road shoulders, and kerbs in front of plot undamaged; zero concrete spill stains.',
      defaultReason: 'Road repair & asphalt resurfacing rectification',
      defaultAmount: 5000,
    },
    {
      id: 'drains',
      name: '3. Stormwater Drains & Culverts',
      description: 'Stormwater drains, culvert slabs, and inspection chambers unblocked, clean and structurally intact.',
      defaultReason: 'Drain de-silting & culvert slab repair charges',
      defaultAmount: 2500,
    },
    {
      id: 'electrical',
      name: '4. Streetlights & Electrical Cabling',
      description: 'Street light poles, underground power supply cabling ducts, and feeder pillars undamaged.',
      defaultReason: 'Streetlight & layout electrical infrastructure repairs',
      defaultAmount: 4000,
    },
    {
      id: 'rwh',
      name: '5. Rainwater Harvesting (RWH) Setup',
      description: 'Mandatory groundwater recharge pit and rainwater piping verified functional on-site.',
      defaultReason: 'Rainwater harvesting (RWH) compliance penalty',
      defaultAmount: 5000,
    },
    {
      id: 'boundary_trees',
      name: '6. Boundary Stones & Avenue Trees',
      description: 'Layout boundary demarcation stones and avenue plantation trees preserved intact.',
      defaultReason: 'Boundary stone re-fixing & tree replacement penalty',
      defaultAmount: 2000,
    },
  ];

  const [categoryStatus, setCategoryStatus] = useState<Record<string, 'ok' | 'needs_fixing'>>({
    debris: 'ok',
    roads: 'ok',
    drains: 'ok',
    electrical: 'ok',
    rwh: 'ok',
    boundary_trees: 'ok',
  });

  const [inspectionDate, setInspectionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [deductions, setDeductions] = useState<DeductionItem[]>([]);
  const [newReason, setNewReason] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [refundTxId, setRefundTxId] = useState('');
  const [refundDate, setRefundDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [settled, setSettled] = useState(false);

  // Requirement 1 & 2: Inspection photos during refund checklist and mid-construction link
  const [inspectionPhotos, setInspectionPhotos] = useState<RefundInspectionPhoto[]>([]);
  const [uploadingInspectionPhoto, setUploadingInspectionPhoto] = useState(false);
  const [selectedPhotoCategory, setSelectedPhotoCategory] = useState<string>('debris');
  const [photoCaption, setPhotoCaption] = useState<string>('');
  const [activePhotoLightbox, setActivePhotoLightbox] = useState<string | null>(null);
  const [showMidConstructionLogs, setShowMidConstructionLogs] = useState(true);

  // Sync state whenever request changes or modal opens
  useEffect(() => {
    if (request && isOpen) {
      const ref = request.postConstructionRefund;
      if (ref) {
        setInspectionDate(ref.inspectionDate || new Date().toISOString().split('T')[0]);
        const existingDeductions = ref.deductionBreakdown ? [...ref.deductionBreakdown] : [];
        setDeductions(existingDeductions);
        setInspectionPhotos(ref.inspectionPhotos || []);

        // Derive OK / Needs Fixing status from existing deductions
        const statusMap: Record<string, 'ok' | 'needs_fixing'> = {
          debris: ref.debrisRemoved === false ? 'needs_fixing' : 'ok',
          roads: ref.roadsDrainsCommonAreasUndamaged === false ? 'needs_fixing' : 'ok',
          drains: ref.roadsDrainsCommonAreasUndamaged === false ? 'needs_fixing' : 'ok',
          electrical: 'ok',
          rwh: ref.rainwaterHarvestingVerified === false ? 'needs_fixing' : 'ok',
          boundary_trees: 'ok',
        };

        existingDeductions.forEach((d) => {
          if (d.categoryKey && statusMap[d.categoryKey] !== undefined) {
            statusMap[d.categoryKey] = 'needs_fixing';
          }
        });

        setCategoryStatus(statusMap);
        setRefundTxId(ref.refundTransactionId || '');
        setRefundDate(ref.refundDate || new Date().toISOString().split('T')[0]);
        setRemarks(ref.remarks || '');
        setSettled(ref.refundStatus !== 'pending');
      } else {
        // Clean default state: all categories OK, 0 deductions
        setCategoryStatus({
          debris: 'ok',
          roads: 'ok',
          drains: 'ok',
          electrical: 'ok',
          rwh: 'ok',
          boundary_trees: 'ok',
        });
        setInspectionDate(new Date().toISOString().split('T')[0]);
        setDeductions([]);
        setInspectionPhotos([]);
        setRefundTxId('');
        setRefundDate(new Date().toISOString().split('T')[0]);
        setRemarks('');
        setSettled(false);
      }
      setNewReason('');
      setNewAmount('');
      setPhotoCaption('');
    }
  }, [request, isOpen]);

  if (!isOpen) return null;

  const totalDeductions = deductions.reduce((sum, d) => sum + Number(d.amount || 0), 0);

  let finalRefundAmount = 0;
  let excessDamageAmount = 0;
  let refundStatus: PostConstructionRefund['refundStatus'] = 'full_refund';

  if (totalDeductions === 0) {
    finalRefundAmount = baseDeposit;
    refundStatus = 'full_refund';
  } else if (totalDeductions <= baseDeposit) {
    finalRefundAmount = baseDeposit - totalDeductions;
    refundStatus = 'partial_refund';
  } else {
    finalRefundAmount = 0;
    excessDamageAmount = totalDeductions - baseDeposit;
    refundStatus = 'excess_damage_recovery';
  }

  // Toggle Category OK vs Needs Fixing
  const handleToggleCategory = (
    cat: typeof inspectionCategories[0],
    targetStatus: 'ok' | 'needs_fixing'
  ) => {
    setCategoryStatus((prev) => ({ ...prev, [cat.id]: targetStatus }));

    if (targetStatus === 'needs_fixing') {
      // Auto-populate deduction row if not already present
      setDeductions((prev) => {
        const exists = prev.some((d) => d.categoryKey === cat.id);
        if (exists) return prev;
        return [
          ...prev,
          {
            id: `cat-${cat.id}`,
            categoryKey: cat.id,
            reason: cat.defaultReason,
            amount: cat.defaultAmount,
          },
        ];
      });
    } else {
      // Switched back to OK (Green): automatically remove deduction
      setDeductions((prev) => prev.filter((d) => d.categoryKey !== cat.id));
    }
  };

  const updateDeductionAmount = (id: string, amount: number) => {
    setDeductions((prev) =>
      prev.map((d) => (d.id === id ? { ...d, amount: Math.max(0, amount) } : d))
    );
  };

  const addCustomDeduction = () => {
    if (!newReason.trim() || !newAmount || Number(newAmount) <= 0) return;
    setDeductions([
      ...deductions,
      { id: Date.now().toString(), reason: newReason.trim(), amount: Number(newAmount) },
    ]);
    setNewReason('');
    setNewAmount('');
  };

  const removeDeduction = (id: string, categoryKey?: string) => {
    setDeductions(deductions.filter((d) => d.id !== id));
    if (categoryKey) {
      setCategoryStatus((prev) => ({ ...prev, [categoryKey]: 'ok' }));
    }
  };

  const handleUploadInspectionPhoto = async (file: File) => {
    setUploadingInspectionPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('plotNumber', request.plotNumber);
      formData.append('category', 'refund_proof');
      formData.append(
        'label',
        `Refund Inspection Proof - Plot ${request.plotNumber} - ${selectedPhotoCategory}`
      );

      const res = await fetch('/api/drive/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      const catObj = inspectionCategories.find((c) => c.id === selectedPhotoCategory);
      const catTitle = catObj ? catObj.name : 'General Site Inspection';

      const newPhoto: RefundInspectionPhoto = {
        id: `photo_${Date.now()}`,
        categoryKey: selectedPhotoCategory,
        categoryTitle: catTitle,
        caption: photoCaption.trim() || undefined,
        imageUrl: data.webViewLink,
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
      };

      setInspectionPhotos((prev) => [...prev, newPhoto]);
      setPhotoCaption('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      alert(`Error uploading inspection photo: ${msg}`);
    } finally {
      setUploadingInspectionPhoto(false);
    }
  };

  const handleRemoveInspectionPhoto = (id: string) => {
    setInspectionPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSaveRefund = async () => {
    setSaving(true);
    try {
      const refundData: PostConstructionRefund = {
        inspectionDate,
        debrisRemoved: categoryStatus.debris === 'ok',
        roadsDrainsCommonAreasUndamaged:
          categoryStatus.roads === 'ok' &&
          categoryStatus.drains === 'ok' &&
          categoryStatus.electrical === 'ok',
        rainwaterHarvestingVerified: categoryStatus.rwh === 'ok',
        initialDeposit: baseDeposit,
        deductionAmount: totalDeductions,
        deductionBreakdown: deductions,
        deductionReason:
          deductions.length > 0
            ? deductions.map((d) => `${d.reason} (₹${d.amount})`).join('; ')
            : 'Zero deductions / Inspection passed',
        excessDamageAmount,
        finalRefundAmount,
        refundStatus,
        refundTransactionId: refundTxId || `AEOWA-REF-${request.plotNumber}`,
        refundDate,
        processedBy: 'Managing Committee & Association Treasurer',
        processedAt: new Date().toISOString(),
        remarks,
        inspectionPhotos,
      };

      const res = await fetch(`/api/requests/${request.id}?role=admin`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin',
        },
        body: JSON.stringify({
          role: 'admin',
          postConstructionRefund: refundData,
          status: 'completed',
          refundSettlementPdfUrl: `/api/pdf/noc?requestId=${request.id}&type=refund_settlement&role=admin`,
        }),
      });

      if (!res.ok) throw new Error('Failed to save refund data');

      const data = await res.json();
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('aelra_cache_admin_requests');
      }
      onUpdate(data.request);
      setSettled(true);
    } catch (e) {
      console.error(e);
      alert('Error updating post-construction refund');
    } finally {
      setSaving(false);
    }
  };

  const downloadSettlementPdf = () => {
    window.open(
      `/api/pdf/noc?requestId=${request.id}&type=refund_settlement&role=admin`,
      '_blank'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-emerald-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-700/80 rounded-lg">
              <Banknote className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold leading-tight">
                Deposit Refund & Handover Inspection (AEOWA)
              </h2>
              <p className="text-xs text-emerald-200 font-mono">
                Plot #{request.plotNumber} • Owner: {request.ownerName} • Escrow: ₹20,000
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm text-gray-700 flex-1">
          {/* Settlement Complete Banner with PDF Download */}
          {settled && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-emerald-950 block">
                    Deposit Settlement Finalized & Signed-Off
                  </span>
                  <span className="text-[11px] text-emerald-800">
                    Official Settlement Voucher PDF generated with inspection sign-off & deduction details.
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={downloadSettlementPdf}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Download Settlement Voucher PDF</span>
              </button>
            </div>
          )}

          {/* Mid-Construction Review History & Photo Evidence */}
          {request.midConstructionReviews && request.midConstructionReviews.length > 0 && (
            <div className="bg-amber-50/80 rounded-xl p-4 border border-amber-300 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardHat className="w-4 h-4 text-amber-800" />
                  <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                    Mid-Construction Inspection Logs & Photo Evidence
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMidConstructionLogs((prev) => !prev)}
                  className="text-xs text-amber-900 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>{showMidConstructionLogs ? 'Hide Logs' : 'View Logs'}</span>
                  {showMidConstructionLogs ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <p className="text-[11px] text-amber-800">
                Field observations and photos recorded during ongoing construction for Plot #{request.plotNumber}.
                Review these to inform final deposit deduction decisions.
              </p>

              {showMidConstructionLogs && (
                <div className="space-y-2 pt-1">
                  {request.midConstructionReviews.map((item) => {
                    const isVio = item.status === 'violation';
                    const isComp = item.status === 'compliant';
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isVio
                            ? 'bg-rose-50 border-rose-200 text-rose-950'
                            : isComp
                            ? 'bg-white border-emerald-200 text-gray-800'
                            : 'bg-white border-gray-200 text-gray-600'
                        }`}
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{item.title}</span>
                            {isVio && (
                              <span className="text-[10px] font-bold text-rose-800 bg-rose-100 border border-rose-300 px-1.5 py-0.2 rounded">
                                Violation Logged
                              </span>
                            )}
                            {isComp && (
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.2 rounded">
                                Compliant
                              </span>
                            )}
                          </div>
                          {item.notes && (
                            <p className="text-[11px] italic text-gray-700">
                              &ldquo;{item.notes}&rdquo;
                            </p>
                          )}
                          {item.inspectedAt && (
                            <span className="text-[10px] text-gray-400 block font-mono">
                              Date:{' '}
                              {new Date(item.inspectedAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {((item.imageUrls && item.imageUrls.length > 0) ? item.imageUrls : item.imageUrl ? [item.imageUrl] : []).map((imgUrl, pIdx) => (
                            <div key={pIdx} className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setActivePhotoLightbox(imgUrl)}
                                className="relative w-9 h-9 rounded-md overflow-hidden bg-gray-100 border border-gray-300 group shadow-2xs cursor-pointer"
                                title="Click to view mid-construction photo"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={imgUrl}
                                  alt="Mid-construction evidence"
                                  className="w-full h-full object-cover group-hover:scale-105 transition"
                                />
                              </button>
                            </div>
                          ))}

                          {isVio && (
                            <button
                              type="button"
                              onClick={() => {
                                const exists = deductions.some((d) => d.id === `mid-${item.id}`);
                                if (!exists) {
                                  setDeductions((prev) => [
                                    ...prev,
                                    {
                                      id: `mid-${item.id}`,
                                      reason: `Mid-Construction: ${item.title} (${item.notes || 'Damage/Violation'})`,
                                      amount: 3000,
                                    },
                                  ]);
                                }
                              }}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[11px] font-bold transition shadow-2xs flex items-center gap-1 cursor-pointer"
                              title="Add this violation as an itemized refund deduction"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Deduction</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Section 1: Managing Committee Inspection Checklist with Okay / Needs Fixing Toggles */}
          <div className="bg-emerald-50/60 rounded-xl p-4 border border-emerald-200 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  1. Managing Committee Inspection Checklist
                </h3>
                <p className="text-[11px] text-emerald-800">
                  Mark each item as <strong>Okay (Green)</strong> or <strong>Needs Fixing (Red)</strong>. Any item marked Needs Fixing automatically populates the deduction section below.
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] text-emerald-900 font-medium">Date:</span>
                <input
                  type="date"
                  value={inspectionDate}
                  onChange={(e) => setInspectionDate(e.target.value)}
                  className="text-xs px-2 py-1 bg-white border border-emerald-300 rounded-lg font-medium"
                />
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              {inspectionCategories.map((cat) => {
                const isNeedsFixing = categoryStatus[cat.id] === 'needs_fixing';
                return (
                  <div
                    key={cat.id}
                    className={`p-3 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                      isNeedsFixing
                        ? 'bg-rose-50/70 border-rose-200'
                        : 'bg-white border-emerald-100 hover:border-emerald-200'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900">{cat.name}</span>
                        {isNeedsFixing && (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-100 border border-rose-300 px-1.5 py-0.2 rounded">
                            Deduction Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed">
                        {cat.description}
                      </p>
                    </div>

                    {/* OK / Needs Fixing Toggle Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleToggleCategory(cat, 'ok')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                          !isNeedsFixing
                            ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500'
                            : 'bg-gray-100 hover:bg-emerald-50 text-gray-600 border border-gray-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Okay</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleCategory(cat, 'needs_fixing')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                          isNeedsFixing
                            ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-500'
                            : 'bg-gray-100 hover:bg-rose-50 text-gray-600 border border-gray-200'
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Needs Fixing</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Site Inspection Photo Evidence Upload & Gallery */}
            <div className="pt-3.5 border-t border-emerald-200/80 space-y-3">
              <div>
                <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Upload Site Inspection Photos / Damage Evidence</span>
                </h4>
                <p className="text-[11px] text-emerald-800">
                  Attach photos of site cleanliness, road/curb damage, debris, or functional RWH pit to support deduction decisions.
                </p>
              </div>

              {/* Upload controls */}
              <div className="p-3 bg-white rounded-xl border border-emerald-200 flex flex-col sm:flex-row items-center gap-2.5">
                <select
                  value={selectedPhotoCategory}
                  onChange={(e) => setSelectedPhotoCategory(e.target.value)}
                  className="w-full sm:w-auto text-xs px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-lg font-medium text-gray-800 focus:outline-emerald-600 cursor-pointer"
                >
                  <option value="debris">1. Debris Removal</option>
                  <option value="roads">2. Layout Asphalt Roads</option>
                  <option value="drains">3. Stormwater Drains</option>
                  <option value="electrical">4. Streetlights & Cabling</option>
                  <option value="rwh">5. Rainwater Harvesting</option>
                  <option value="boundary_trees">6. Boundary & Trees</option>
                  <option value="general">General Inspection</option>
                </select>

                <input
                  type="text"
                  placeholder="Photo Caption (e.g. Broken asphalt curb, Drain silt)"
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  className="w-full sm:flex-1 text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-emerald-600"
                />

                <label
                  className={`w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                    uploadingInspectionPhoto
                      ? 'bg-gray-100 text-gray-400 border border-gray-200 pointer-events-none'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs'
                  }`}
                >
                  {uploadingInspectionPhoto ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5" />
                      <span>Upload Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadInspectionPhoto(f);
                        }}
                      />
                    </>
                  )}
                </label>
              </div>

              {/* Uploaded inspection photos gallery */}
              {inspectionPhotos.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {inspectionPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="p-2.5 bg-white rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => setActivePhotoLightbox(photo.imageUrl)}
                          className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 group shrink-0 cursor-pointer"
                          title="Click to view full photo"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.imageUrl}
                            alt="Inspection finding"
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                          />
                        </button>
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block truncate max-w-[150px]">
                            {photo.categoryTitle || 'Inspection Photo'}
                          </span>
                          <span className="text-xs font-semibold text-gray-900 block truncate">
                            {photo.caption || photo.fileName}
                          </span>
                          <button
                            type="button"
                            onClick={() => setActivePhotoLightbox(photo.imageUrl)}
                            className="text-[10px] text-emerald-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>Enlarge Image</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveInspectionPhoto(photo.id)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                        title="Delete photo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Deduction Calculator (Auto-Populated from Checklist) */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  2. Deduction Breakdown & Amounts to Reduce
                </h3>
                <p className="text-[11px] text-gray-500">
                  Items marked &quot;Needs Fixing&quot; above are populated here. Edit the deduction amounts as assessed by the Association.
                </p>
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 self-start sm:self-auto">
                Plot #{request.plotNumber}
              </span>
            </div>

            {/* List of deductions with inline editable amounts */}
            {deductions.length > 0 ? (
              <div className="space-y-2">
                {deductions.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      {item.categoryKey ? (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-100 border border-rose-200 px-1.5 py-0.5 rounded shrink-0">
                          Inspection Issue
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-700 bg-gray-200 px-1.5 py-0.5 rounded shrink-0">
                          Custom
                        </span>
                      )}
                      <span className="font-semibold text-gray-800">{item.reason}</span>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span className="text-xs font-semibold text-gray-500">Reduce:</span>
                      <div className="flex items-center gap-1 bg-white border border-rose-300 rounded-lg px-2 py-1">
                        <span className="font-mono text-xs font-bold text-rose-600">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={item.amount}
                          onChange={(e) => updateDeductionAmount(item.id, Number(e.target.value))}
                          className="w-24 text-xs font-mono font-bold text-rose-700 focus:outline-none"
                          placeholder="Amount"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDeduction(item.id, item.categoryKey)}
                        className="p-1 text-gray-400 hover:text-rose-600 rounded transition cursor-pointer"
                        title="Remove deduction"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  All inspection points are Okay. Zero deductions applied. Eligible for <strong>full ₹20,000</strong> deposit refund.
                </span>
              </div>
            )}

            {/* Add custom deduction input */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-gray-100">
              <input
                type="text"
                placeholder="Add other custom deduction (e.g. Broken water meter chamber)"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                className="w-full sm:flex-1 text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-emerald-600"
              />
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="number"
                  placeholder="Amount (₹)"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-32 text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-emerald-600 font-mono"
                />
                <button
                  type="button"
                  onClick={addCustomDeduction}
                  className="px-3 py-2 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-800 transition flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Financial Summary Box */}
            <div className="mt-4 p-4 rounded-xl border border-gray-200 bg-gray-50/70 space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Initial Security Deposit Held:</span>
                <span className="font-mono font-semibold">₹20,000</span>
              </div>
              <div className="flex items-center justify-between text-xs text-rose-600">
                <span>Total Itemized Deductions to Reduce:</span>
                <span className="font-mono font-semibold">
                  -₹{totalDeductions.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                {refundStatus === 'excess_damage_recovery' ? (
                  <div className="flex items-center gap-2 text-rose-800">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider block">
                        Excess Damage Recovery Required
                      </span>
                      <span className="text-[11px] text-rose-600">
                        Damage exceeds deposit by ₹{excessDamageAmount.toLocaleString('en-IN')}.
                        Demand notice to be issued to owner.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider block">
                        {refundStatus === 'full_refund' ? 'Full Refund Payable' : 'Partial Refund Payable'}
                      </span>
                      <span className="text-[11px] text-emerald-700">
                        Net amount to be returned to owner&apos;s bank account
                      </span>
                    </div>
                  </div>
                )}

                <span
                  className={`text-lg font-mono font-extrabold ${
                    refundStatus === 'excess_damage_recovery' ? 'text-rose-700' : 'text-emerald-700'
                  }`}
                >
                  {refundStatus === 'excess_damage_recovery'
                    ? `Demand: ₹${excessDamageAmount.toLocaleString('en-IN')}`
                    : `Refund: ₹${finalRefundAmount.toLocaleString('en-IN')}`}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Bank Transfer Details & Refund Proof Upload */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-3">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              3. Refund Payment Execution & Proof Upload
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Bank Transfer UTR / Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. AXIS20261118002931"
                  value={refundTxId}
                  onChange={(e) => setRefundTxId(e.target.value.toUpperCase())}
                  className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-emerald-600 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Payout Date
                </label>
                <input
                  type="date"
                  value={refundDate}
                  onChange={(e) => setRefundDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">
                Inspection & Payout Remarks
              </label>
              <textarea
                rows={2}
                placeholder="Notes on site clearance or debit ledger entry..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-emerald-600"
              />
            </div>

            {/* Direct Drive upload for refund receipt screenshot/proof */}
            <DirectDriveUploader
              plotNumber={request.plotNumber}
              category="refund_proof"
              label="Upload Bank Payout Voucher / Screenshot"
              description="Automatically organized into /Anugraha_Evergreen_Records/Plot_[Number]/Refund_Proofs/"
              onUploadComplete={(doc) => {
                setRemarks(
                  (prev) => `${prev} [Voucher uploaded: ${doc.fileName}]`
                );
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end">
          <div className="flex items-center gap-2.5">
            {settled ? (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveRefund}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 transition flex items-center gap-1.5 cursor-pointer"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Update Settlement</span>
                </button>

                <button
                  type="button"
                  onClick={downloadSettlementPdf}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Settlement PDF</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveRefund}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Sign Off & Settle Deposit</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Photo Preview Modal */}
      {activePhotoLightbox && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setActivePhotoLightbox(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] bg-black rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 bg-gray-900/90 text-white flex items-center justify-between">
              <span className="text-xs font-medium flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span>Site Inspection Photo Evidence • Plot #{request.plotNumber}</span>
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={activePhotoLightbox}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-md text-emerald-200 transition"
                >
                  Open Original
                </a>
                <button
                  type="button"
                  onClick={() => setActivePhotoLightbox(null)}
                  className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-2 overflow-auto flex items-center justify-center bg-black/90">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activePhotoLightbox}
                alt="Enlarged inspection evidence"
                className="max-h-[75vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
