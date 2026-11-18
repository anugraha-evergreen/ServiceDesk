export type UserRole = 'owner' | 'admin';

export interface Plot {
  id: string;
  plotNumber: string;
  primaryOwnerName: string;
  phone: string;
  email?: string;
  status: 'vacant' | 'under_construction' | 'constructed';
  mergedInto?: string;
  mergedPlots?: string[];
  membershipPaid: boolean;
}

export type RequestType =
  | 'construction_noc'
  | 'remeasurement_noc'
  | 'sale_deed'
  | 'plot_amalgamation';

export type RequestStatus =
  | 'submitted'
  | 'under_review'
  | 'checklist_pending'
  | 'approved'
  | 'rejected'
  | 'completed';

export interface UploadedDoc {
  id: string;
  category:
    | 'building_plan'
    | 'construction_permit'
    | 'tax_receipt'
    | 'neighbour_permission'
    | 'labourer_ids'
    | 'site_survey_map'
    | 'sale_deed_doc'
    | 'amalgamation_sanction'
    | 'refund_proof'
    | 'deposit_receipt'
    | 'supporting_doc'
    | 'other';
  label: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  driveFileId?: string;
  driveWebViewLink?: string; // STRICT: Only sent to Admin!
  uploadedAt: string;
}

export interface PreConstructionChecklist {
  docsVerified: boolean;
  membershipFeeCleared: boolean; // ₹1,000
  maintenanceDuesCleared: boolean;
  securityDepositPaid: boolean; // ₹20,000
  depositTransactionId: string;
  depositDate: string;
  depositBank: string;
  depositReceiptUrl?: string;
  depositReceiptFileName?: string;
  labourerToiletInstalled: boolean;
  bescomWaterArrangementVerified: boolean;
  labourersRegistered: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  adminNotes?: string;
}

export interface DeductionItem {
  id: string;
  categoryKey?: string;
  reason: string;
  amount: number;
}

export interface RefundInspectionPhoto {
  id: string;
  categoryKey?: string;
  categoryTitle?: string;
  caption?: string;
  imageUrl: string;
  fileName: string;
  uploadedAt: string;
}

export interface PostConstructionRefund {
  inspectionDate?: string;
  debrisRemoved: boolean;
  roadsDrainsCommonAreasUndamaged: boolean;
  rainwaterHarvestingVerified: boolean;
  initialDeposit: number; // default 20000
  deductionAmount: number;
  deductionReason?: string;
  deductionBreakdown?: DeductionItem[];
  excessDamageAmount: number; // when damage > 20000
  finalRefundAmount: number; // deposit - deduction (or 0 if excess)
  refundStatus: 'pending' | 'full_refund' | 'partial_refund' | 'excess_damage_recovery';
  refundProofFileName?: string;
  refundProofDriveLink?: string; // Admin only
  refundTransactionId?: string;
  refundDate?: string;
  processedBy?: string;
  processedAt?: string;
  remarks?: string;
  inspectionPhotos?: RefundInspectionPhoto[];
}

export interface MidConstructionInspectionItem {
  id: string;
  title: string;
  description: string;
  status: 'compliant' | 'violation' | 'pending';
  notes?: string;
  imageUrl?: string;
  imageFileName?: string;
  imageUrls?: string[];
  inspectedAt?: string;
  inspectedBy?: string;
}

export interface ReMeasurementChecklist {
  boundaryCoordinatesVerified: boolean;
  encroachmentClearance: boolean;
  surveyStoneConfirmed: boolean;
  surveyorAssigned?: string;
  inspectionDate?: string;
  adminNotes?: string;
}

export interface ServiceRequest {
  id: string;
  plotNumber: string;
  ownerName: string;
  phone: string;
  type: RequestType;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;

  // Construction NOC contacts: Owner Name/Phone + Contractor Name/Phone
  ownerContactName?: string;
  ownerContactPhone?: string;
  contractorName?: string;
  contractorPhone?: string;

  // Legacy fallback support
  supervisorPhone?: string;
  emergencyPhone?: string;

  rulesAcceptedAt?: string;
  preConstructionChecklist?: PreConstructionChecklist;
  postConstructionRefund?: PostConstructionRefund;
  midConstructionReviews?: MidConstructionInspectionItem[];
  reMeasurementChecklist?: ReMeasurementChecklist;

  saleDeedDetails?: {
    previousOwnerName: string;
    newOwnerName: string;
    deedNumber: string;
    registrationDate: string;
    subRegistrarOffice: string;
  };

  amalgamationDetails?: {
    secondaryPlotNumbers: string[];
    targetUnifiedPlotNumber: string;
    sanctionOrderNumber?: string;
    reason: string;
  };

  documents: UploadedDoc[];
  generatedNocPdfUrl?: string; // Admin only
  generatedNocCertificateId?: string;
  refundSettlementPdfUrl?: string; // Admin only
  adminNotes?: string;
}

export interface OwnerSession {
  role: 'owner';
  plotNumber: string;
  ownerName: string;
  phone: string;
  wasAmalgamated?: boolean;
  originalPlotEntered?: string;
}

export interface AdminSession {
  role: 'admin';
  name: string;
  loggedInAt: string;
}
