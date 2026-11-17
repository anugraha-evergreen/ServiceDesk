'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/session';
import { ServiceRequest } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { AdminPreConstructionChecklist } from '@/components/AdminPreConstructionChecklist';
import { RefundCalculatorModal } from '@/components/RefundCalculatorModal';
import {
  ShieldCheck,
  ArrowLeft,
  Compass,
  FileText,
  Layers,
  ExternalLink,
  Download,
  Calendar,
  Phone,
  CheckCircle2,
  Banknote,
  Lock,
  Printer,
} from 'lucide-react';

export default function AdminRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { session, loading } = useSession();

  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [fetching, setFetching] = useState(true);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Re-measurement state
  const [boundaryCoords, setBoundaryCoords] = useState(false);
  const [encroachmentClear, setEncroachmentClear] = useState(false);
  const [surveyStoneOk, setSurveyStoneOk] = useState(false);
  const [surveyorName, setSurveyorName] = useState('');

  useEffect(() => {
    if (!loading && (!session || session.role !== 'admin')) {
      router.push('/');
      return;
    }

    loadRequest();
  }, [id, session, loading, router]);

  const loadRequest = async () => {
    setFetching(true);
    try {
      const res = await fetch(`/api/requests/${id}?role=admin`);
      const data = await res.json();
      if (data.request) {
        setRequest(data.request);
        if (data.request.reMeasurementChecklist) {
          setBoundaryCoords(data.request.reMeasurementChecklist.boundaryCoordinatesVerified);
          setEncroachmentClear(data.request.reMeasurementChecklist.encroachmentClearance);
          setSurveyStoneOk(data.request.reMeasurementChecklist.surveyStoneConfirmed);
          setSurveyorName(data.request.reMeasurementChecklist.surveyorAssigned || '');
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  };

  const handleUpdate = (updated: ServiceRequest) => {
    setRequest(updated);
  };

  const handleApproveConstructionNoc = async () => {
    if (!request) return;
    try {
      const existingChk = request.preConstructionChecklist;
      const currentChk = {
        docsVerified: true,
        membershipFeeCleared: true,
        maintenanceDuesCleared: true,
        securityDepositPaid: true,
        depositTransactionId: existingChk?.depositTransactionId?.trim() || `AEOWA-DEP-${request.plotNumber}`,
        depositDate: existingChk?.depositDate || new Date().toISOString().split('T')[0],
        depositBank: existingChk?.depositBank || '',
        labourerToiletInstalled: true,
        bescomWaterArrangementVerified: true,
        labourersRegistered: true,
        verifiedBy: 'Hon. General Secretary, AEOWA',
        verifiedAt: new Date().toISOString(),
      };

      const certId =
        request.generatedNocCertificateId || `AEOWA/NOC/2026/${request.plotNumber}`;

      const res = await fetch(`/api/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          preConstructionChecklist: currentChk,
          generatedNocCertificateId: certId,
          generatedNocPdfUrl: `/api/pdf/noc?requestId=${request.id}&role=admin`,
        }),
      });

      if (!res.ok) throw new Error('Failed to approve construction NOC');
      const data = await res.json();
      setRequest(data.request);
      setActionSuccess('Construction NOC Approved! The official pre-filled certificate is unlocked for download.');
    } catch (e) {
      console.error(e);
      alert('Error approving construction NOC');
    }
  };

  const handleApproveReMeasurement = async () => {
    if (!request) return;
    try {
      const res = await fetch(`/api/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          reMeasurementChecklist: {
            boundaryCoordinatesVerified: boundaryCoords,
            encroachmentClearance: encroachmentClear,
            surveyStoneConfirmed: surveyStoneOk,
            surveyorAssigned: surveyorName,
            inspectionDate: new Date().toISOString().split('T')[0],
          },
        }),
      });

      if (!res.ok) throw new Error('Failed to approve re-measurement');
      const data = await res.json();
      setRequest(data.request);
      setActionSuccess('Re-Measurement NOC Approved! You can now download the certificate.');
    } catch (e) {
      console.error(e);
      alert('Error approving re-measurement');
    }
  };

  const handleApproveSaleDeed = async () => {
    if (!request || !request.saleDeedDetails) return;
    try {
      const res = await fetch(`/api/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      const data = await res.json();
      setRequest(data.request);

      await fetch('/api/plots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          plot: {
            plotNumber: request.plotNumber,
            primaryOwnerName: request.saleDeedDetails.newOwnerName,
            phone: request.phone,
            status: 'vacant',
          },
        }),
      });

      setActionSuccess(
        `Sale deed verified! Master ownership for Plot #${request.plotNumber} successfully updated to ${request.saleDeedDetails.newOwnerName}.`
      );
    } catch (e) {
      console.error(e);
      alert('Error updating sale deed record');
    }
  };

  const handleApproveAmalgamation = async () => {
    if (!request || !request.amalgamationDetails) return;
    try {
      const res = await fetch('/api/plots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'amalgamate',
          primaryPlotNumber: request.plotNumber,
          secondaryPlotNumbers: request.amalgamationDetails.secondaryPlotNumbers,
          unifiedPlotNumber: request.amalgamationDetails.targetUnifiedPlotNumber,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Amalgamation failed');

      const reqRes = await fetch(`/api/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      const reqData = await reqRes.json();
      setRequest(reqData.request);

      setActionSuccess(
        `Plots merged successfully into unified record "${request.amalgamationDetails.targetUnifiedPlotNumber}" for maintenance tracking!`
      );
    } catch (e) {
      console.error(e);
      alert('Error approving amalgamation');
    }
  };

  if (loading || fetching || !request) {
    return (
      <div className="py-20 text-center text-sm text-gray-500 animate-pulse">
        Loading compliance inspection record...
      </div>
    );
  }

  const chk = request.preConstructionChecklist;
  const isChecklistComplete =
    chk?.docsVerified &&
    chk?.membershipFeeCleared &&
    chk?.maintenanceDuesCleared &&
    chk?.securityDepositPaid &&
    chk?.depositTransactionId &&
    chk?.labourerToiletInstalled &&
    chk?.bescomWaterArrangementVerified &&
    chk?.labourersRegistered;

  const isRefundSettled =
    request.postConstructionRefund &&
    request.postConstructionRefund.refundStatus !== 'pending';

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <div>
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Request Queue</span>
        </Link>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs sm:text-sm text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
          <span className="font-semibold">{actionSuccess}</span>
        </div>
      )}

      {/* Header Profile Box */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {request.id}
            </span>
            <StatusBadge status={request.status} />
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            Plot No. {request.plotNumber} —{' '}
            {request.type === 'construction_noc' && 'Construction NOC Review'}
            {request.type === 'remeasurement_noc' && 'Site Re-Measurement NOC'}
            {request.type === 'sale_deed' && 'Sale Deed Transfer Verification'}
            {request.type === 'plot_amalgamation' && 'Plot Amalgamation Review'}
          </h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 pt-1">
            <span>Primary Owner: <strong>{request.ownerName}</strong></span>
            <span>Registered Phone: <strong>+91 {request.phone}</strong></span>
            <span>
              Submitted:{' '}
              {new Date(request.createdAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Primary 1-Click Approve Action Button for Admin */}
          {request.status !== 'approved' && request.status !== 'completed' ? (
            <button
              type="button"
              onClick={
                request.type === 'construction_noc'
                  ? handleApproveConstructionNoc
                  : request.type === 'remeasurement_noc'
                  ? handleApproveReMeasurement
                  : request.type === 'sale_deed'
                  ? handleApproveSaleDeed
                  : handleApproveAmalgamation
              }
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {request.type === 'construction_noc' && 'Approve & Issue Construction NOC'}
                {request.type === 'remeasurement_noc' && 'Approve & Issue Re-Measurement NOC'}
                {request.type === 'sale_deed' && 'Verify & Approve Sale Deed'}
                {request.type === 'plot_amalgamation' && 'Approve Amalgamation'}
              </span>
            </button>
          ) : (
            <span className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Request Approved & On Record</span>
            </span>
          )}

          {request.type === 'construction_noc' && isChecklistComplete && (
            <a
              href={`/api/pdf/noc?requestId=${request.id}&role=admin`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Download Construction NOC PDF (Pre-filled)</span>
            </a>
          )}

          {request.type === 'construction_noc' && (
            <a
              href={`/api/pdf/noc?requestId=${request.id}&blank=true&role=admin`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
              title="Prints blank underline spaces for Owner Name and Plot Number to fill manually post-printing"
            >
              <Printer className="w-4 h-4" />
              <span>Print Blank Template (Fill post-printing)</span>
            </a>
          )}

          {request.type === 'remeasurement_noc' && (
            <>
              <a
                href={`/api/pdf/noc?requestId=${request.id}&role=admin`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Download Re-Measurement NOC (Pre-filled)</span>
              </a>
              <a
                href={`/api/pdf/noc?requestId=${request.id}&blank=true&role=admin`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Blank Template</span>
              </a>
            </>
          )}

          {isRefundSettled && (
            <a
              href={`/api/pdf/noc?requestId=${request.id}&type=refund_settlement&role=admin`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Download Refund Settlement PDF</span>
            </a>
          )}

          {request.type === 'construction_noc' && (
            <button
              type="button"
              onClick={() => setRefundModalOpen(true)}
              className="px-4 py-2 bg-emerald-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Banknote className="w-4 h-4 text-emerald-300" />
              <span>Deposit Refund Module</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid: Document Previews in Supabase Cloud + Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Uploaded Documents in Supabase Storage (Admin Only) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-700" />
                Uploaded Documents
              </h2>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                Admin Exclusive
              </span>
            </div>

            <p className="text-[11px] text-gray-500">
              Stored in storage • Secure resident document archive
            </p>

            <div className="space-y-3 pt-1">
              {request.documents.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No files attached to this request.</p>
              ) : (
                request.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 hover:border-emerald-300 transition space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-gray-900 leading-tight">
                        {doc.label || doc.fileName}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono shrink-0">
                        {(doc.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
                      </span>
                    </div>

                    <span className="text-[11px] text-gray-500 font-mono block truncate">
                      {doc.fileName}
                    </span>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <a
                        href={`/api/documents/download?url=${encodeURIComponent(
                          doc.driveWebViewLink || ''
                        )}&name=${encodeURIComponent(doc.fileName)}`}
                        download={doc.fileName}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download File</span>
                      </a>

                      {doc.driveWebViewLink && !doc.driveWebViewLink.includes('mock') && (
                        <a
                          href={doc.driveWebViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold transition"
                        >
                          <ExternalLink className="w-3 h-3 text-gray-500" />
                          <span>Preview</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Site Contacts */}
          {request.type === 'construction_noc' && (
            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-3">
              <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-emerald-700" />
                Site & Management Contacts
              </h2>

              <div className="space-y-2 text-xs">
                <div className="py-1.5 border-b border-gray-100">
                  <span className="text-gray-500 block text-[11px]">Plot Owner Contact:</span>
                  <span className="font-semibold text-gray-900 block">
                    {request.ownerContactName || request.ownerName}
                  </span>
                  <span className="font-mono text-gray-600">
                    +91 {request.ownerContactPhone || request.phone}
                  </span>
                </div>

                <div className="py-1.5">
                  <span className="text-gray-500 block text-[11px]">Contractor Contact:</span>
                  <span className="font-semibold text-gray-900 block">
                    {request.contractorName || 'Registered Contractor'}
                  </span>
                  <span className="font-mono text-gray-600">
                    +91 {request.contractorPhone || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Verification Checklists & Actions */}
        <div className="lg:col-span-2 space-y-5">
          {request.type === 'construction_noc' && (
            <AdminPreConstructionChecklist request={request} onUpdate={handleUpdate} />
          )}

          {request.type === 'remeasurement_noc' && (
            <div className="bg-white rounded-2xl p-5 border border-blue-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-blue-700" />
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                    Boundary & Encroachment Verification Checklist
                  </h3>
                </div>
                <StatusBadge status={request.status} />
              </div>

              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={boundaryCoords}
                    onChange={(e) => setBoundaryCoords(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                  <div>
                    <span className="text-xs sm:text-sm font-semibold text-gray-900">
                      1. Revenue Coordinates & Setbacks Cross-Checked
                    </span>
                    <p className="text-xs text-gray-500">
                      Matches layout master approval plan and road alignments.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={encroachmentClear}
                    onChange={(e) => setEncroachmentClear(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                  <div>
                    <span className="text-xs sm:text-sm font-semibold text-gray-900">
                      2. Zero Encroachment on Common Drain or Roads
                    </span>
                    <p className="text-xs text-gray-500">
                      Adjoining plot offsets inspected; zero physical boundary violations.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={surveyStoneOk}
                    onChange={(e) => setSurveyStoneOk(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                  <div>
                    <span className="text-xs sm:text-sm font-semibold text-gray-900">
                      3. Survey Stones In-Place & Confirmed
                    </span>
                    <p className="text-xs text-gray-500">
                      Corner stones planted and marked with AEOWA emblem.
                    </p>
                  </div>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Assigned Surveyor: <strong>{surveyorName}</strong>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleApproveReMeasurement}
                    className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    Approve & Issue Re-Measurement NOC
                  </button>
                  {request.status === 'approved' && (
                    <a
                      href={`/api/pdf/noc?requestId=${request.id}&role=admin`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download NOC PDF</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {request.type === 'sale_deed' && request.saleDeedDetails && (
            <div className="bg-white rounded-2xl p-5 border border-amber-200 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-700" />
                <span>Sale Deed Conveyance Particulars</span>
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs p-4 rounded-xl bg-amber-50/40 border border-amber-200">
                <div>
                  <span className="text-gray-500 block">Seller (Previous Owner):</span>
                  <span className="font-bold text-gray-900">{request.saleDeedDetails.previousOwnerName}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Purchaser (New Owner):</span>
                  <span className="font-bold text-emerald-900">{request.saleDeedDetails.newOwnerName}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Deed / Doc Number:</span>
                  <span className="font-mono font-bold text-gray-800">{request.saleDeedDetails.deedNumber}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Registration Date:</span>
                  <span className="font-bold text-gray-800">{request.saleDeedDetails.registrationDate}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500 block">Sub-Registrar Office:</span>
                  <span className="font-bold text-gray-800">{request.saleDeedDetails.subRegistrarOffice}</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleApproveSaleDeed}
                  className="px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify Deed & Update Master Plot Record</span>
                </button>
              </div>
            </div>
          )}

          {request.type === 'plot_amalgamation' && request.amalgamationDetails && (
            <div className="bg-white rounded-2xl p-5 border border-purple-200 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-700" />
                <span>Plot Amalgamation Request Details</span>
              </h3>

              <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Primary Plot:</span>
                  <span className="font-bold text-gray-900">Plot #{request.plotNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Secondary Plots to Merge:</span>
                  <span className="font-bold text-purple-900">
                    {request.amalgamationDetails.secondaryPlotNumbers.map((p) => `Plot #${p}`).join(', ')}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-purple-100">
                  <span className="text-gray-700 font-bold">Target Unified Plot ID:</span>
                  <span className="font-mono font-black text-purple-900 text-sm">
                    {request.amalgamationDetails.targetUnifiedPlotNumber}
                  </span>
                </div>
                <div className="pt-1">
                  <span className="text-gray-500 block">Amalgamation Purpose:</span>
                  <span className="text-gray-800">{request.amalgamationDetails.reason}</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleApproveAmalgamation}
                  className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Layers className="w-4 h-4" />
                  <span>Approve & Merge Plots into Unified Master Record</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <RefundCalculatorModal
        isOpen={refundModalOpen}
        onClose={() => setRefundModalOpen(false)}
        request={request}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
