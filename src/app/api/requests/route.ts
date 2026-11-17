import { NextRequest, NextResponse } from 'next/server';
import { createServiceRequest, getAllRequests } from '@/lib/store';
import { UserRole } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = (searchParams.get('role') || 'owner') as UserRole;
    const plotNumber = searchParams.get('plotNumber') || undefined;

    const requests = await getAllRequests(role, plotNumber);
    return NextResponse.json({ success: true, requests });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to fetch requests';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { plotNumber, ownerName, phone, type, documents } = body;

    if (!plotNumber || !ownerName || !phone || !type) {
      return NextResponse.json(
        { error: 'Missing required request parameters (plotNumber, ownerName, phone, type)' },
        { status: 400 }
      );
    }

    const created = await createServiceRequest({
      plotNumber,
      ownerName,
      phone,
      type,
      status: 'submitted',
      rulesAcceptedAt: body.rulesAcceptedAt,
      ownerContactName: body.ownerContactName,
      ownerContactPhone: body.ownerContactPhone,
      contractorName: body.contractorName,
      contractorPhone: body.contractorPhone,
      supervisorPhone: body.supervisorPhone,
      emergencyPhone: body.emergencyPhone,
      documents: documents || [],
      preConstructionChecklist:
        type === 'construction_noc'
          ? {
              docsVerified: false,
              membershipFeeCleared: false,
              maintenanceDuesCleared: false,
              securityDepositPaid: false,
              depositTransactionId: '',
              depositDate: '',
              depositBank: '',
              labourerToiletInstalled: false,
              bescomWaterArrangementVerified: false,
              labourersRegistered: false,
            }
          : undefined,
      reMeasurementChecklist:
        type === 'remeasurement_noc'
          ? {
              boundaryCoordinatesVerified: false,
              encroachmentClearance: false,
              surveyStoneConfirmed: false,
            }
          : undefined,
      saleDeedDetails: body.saleDeedDetails,
      amalgamationDetails: body.amalgamationDetails,
      adminNotes: body.adminNotes,
    });

    return NextResponse.json({ success: true, request: created });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to create request';
    console.error('POST /api/requests error:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
