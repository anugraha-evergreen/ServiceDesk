import { NextRequest, NextResponse } from 'next/server';
import { getRequestById } from '@/lib/store';
import {
  generateConstructionNocPdfBytes,
  generateReMeasurementNocPdfBytes,
  generateRefundSettlementPdfBytes,
} from '@/lib/pdfGenerator';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get('requestId');
    const role = searchParams.get('role');
    const docType = searchParams.get('type'); // 'refund_settlement' | 'construction_noc' | 'remeasurement_noc'
    const isBlank = searchParams.get('blank') === 'true';
    const pdfOptions = { blankTemplate: isBlank };

    // STRICT PRIVACY: Only Association Admin can generate or download PDFs
    if (role !== 'admin') {
      return NextResponse.json(
        {
          error:
            'Access Denied: Strict privacy policy restricts PDF certificate generation and downloading exclusively to the Association Admin.',
        },
        { status: 403 }
      );
    }

    if (!requestId) {
      return NextResponse.json({ error: 'Missing requestId parameter' }, { status: 400 });
    }

    let request = requestId !== 'blank' ? await getRequestById(requestId, 'admin') : null;
    if (!request && isBlank) {
      request = {
        id: 'AEOWA-BLANK',
        plotNumber: '____',
        ownerName: 'Valued Resident',
        phone: '',
        type: (docType as 'construction_noc' | 'remeasurement_noc') || 'construction_noc',
        status: 'submitted',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        documents: [],
      };
    } else if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    let pdfBytes: Uint8Array;
    let fileName = isBlank
      ? `AEOWA_Doc_Blank_Template.pdf`
      : `AEOWA_Doc_Plot_${request.plotNumber}.pdf`;

    // 1. Refund Settlement Voucher PDF
    if (docType === 'refund_settlement') {
      pdfBytes = await generateRefundSettlementPdfBytes(request, pdfOptions);
      fileName = isBlank
        ? `AEOWA_Deposit_Refund_Settlement_Blank_Template.pdf`
        : `AEOWA_Deposit_Refund_Settlement_Plot_${request.plotNumber}.pdf`;
    }
    // 2. Construction NOC PDF (Enforces complete checklist for pre-filled certificates)
    else if (request.type === 'construction_noc') {
      const chk = request.preConstructionChecklist;
      const isComplete =
        chk?.docsVerified &&
        chk?.membershipFeeCleared &&
        chk?.maintenanceDuesCleared &&
        chk?.securityDepositPaid &&
        chk?.depositTransactionId &&
        chk?.labourerToiletInstalled &&
        chk?.bescomWaterArrangementVerified &&
        chk?.labourersRegistered;

      if (!isBlank && !isComplete && request.status !== 'approved' && request.status !== 'completed') {
        return NextResponse.json(
          {
            error:
              'Checklist incomplete: All 7 Admin Pre-Construction Checklist items must be verified and saved before generating the Construction NOC PDF.',
          },
          { status: 400 }
        );
      }

      pdfBytes = await generateConstructionNocPdfBytes(request, pdfOptions);
      fileName = isBlank
        ? `AEOWA_Construction_NOC_Blank_Template.pdf`
        : `AEOWA_Construction_NOC_Plot_${request.plotNumber}.pdf`;
    }
    // 3. Re-Measurement NOC PDF
    else if (request.type === 'remeasurement_noc') {
      pdfBytes = await generateReMeasurementNocPdfBytes(request, pdfOptions);
      fileName = isBlank
        ? `AEOWA_ReMeasurement_NOC_Blank_Template.pdf`
        : `AEOWA_ReMeasurement_NOC_Plot_${request.plotNumber}.pdf`;
    } else {
      return NextResponse.json(
        { error: `No PDF template configured for request type ${request.type}` },
        { status: 400 }
      );
    }

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'PDF generation error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
