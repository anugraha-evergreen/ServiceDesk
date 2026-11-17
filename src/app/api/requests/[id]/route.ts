import { NextRequest, NextResponse } from 'next/server';
import { getRequestById, updateServiceRequest, deleteServiceRequest } from '@/lib/store';
import { UserRole } from '@/lib/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const role = (searchParams.get('role') || 'owner') as UserRole;

    const request = await getRequestById(id, role);
    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, request });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error fetching request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const role = (searchParams.get('role') || 'owner') as UserRole;
    const body = await req.json();

    // Verify existing record
    const existing = await getRequestById(id, 'admin');
    if (!existing) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Role-based validation
    if (role === 'owner') {
      // 1. Strict edit lock: Owners cannot edit once approved or completed
      if (existing.status === 'approved' || existing.status === 'completed') {
        return NextResponse.json(
          {
            error:
              'This application has already been approved by AEOWA Management Committee and cannot be edited. Please contact layout administration for any further inquiries.',
          },
          { status: 400 }
        );
      }

      // 2. Strict sanitization: Owners can only update their applicant details & documents
      const ownerAllowedUpdates: Record<string, any> = {};
      if (body.ownerContactName !== undefined) ownerAllowedUpdates.ownerContactName = body.ownerContactName;
      if (body.ownerContactPhone !== undefined) ownerAllowedUpdates.ownerContactPhone = body.ownerContactPhone;
      if (body.contractorName !== undefined) ownerAllowedUpdates.contractorName = body.contractorName;
      if (body.contractorPhone !== undefined) ownerAllowedUpdates.contractorPhone = body.contractorPhone;
      if (body.supervisorPhone !== undefined) ownerAllowedUpdates.supervisorPhone = body.supervisorPhone;
      if (body.emergencyPhone !== undefined) ownerAllowedUpdates.emergencyPhone = body.emergencyPhone;
      if (body.documents !== undefined) ownerAllowedUpdates.documents = body.documents;
      if (body.saleDeedDetails !== undefined) ownerAllowedUpdates.saleDeedDetails = body.saleDeedDetails;
      if (body.amalgamationDetails !== undefined) ownerAllowedUpdates.amalgamationDetails = body.amalgamationDetails;
      if (body.adminNotes !== undefined) ownerAllowedUpdates.adminNotes = body.adminNotes;

      const updated = await updateServiceRequest(id, ownerAllowedUpdates);
      return NextResponse.json({ success: true, request: updated });
    }

    // Admin role updates
    const updated = await updateServiceRequest(id, body);
    if (!updated) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, request: updated });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error updating request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const role = (searchParams.get('role') || 'owner') as UserRole;
    const plotNumber = searchParams.get('plotNumber') || undefined;

    // 1. Verify existing record
    const existing = await getRequestById(id, 'admin');
    if (!existing) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // 2. Role-based permission checks
    if (role === 'owner') {
      // Cannot delete once approved or completed
      if (existing.status === 'approved' || existing.status === 'completed') {
        return NextResponse.json(
          {
            error:
              'Approved or completed applications cannot be deleted. Please contact the AEOWA Management Committee.',
          },
          { status: 400 }
        );
      }

      // Check plot authorization if plotNumber provided
      if (
        plotNumber &&
        existing.plotNumber.trim().toLowerCase() !== plotNumber.trim().toLowerCase()
      ) {
        return NextResponse.json(
          { error: 'Unauthorized to delete request for another plot.' },
          { status: 403 }
        );
      }
    }

    // 3. Delete from Supabase Storage and PostgreSQL
    const result = await deleteServiceRequest(id);

    return NextResponse.json({
      success: true,
      message: result.message,
      deletedFilesCount: result.deletedFilesCount,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error deleting request';
    console.error('DELETE /api/requests/[id] failed:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

