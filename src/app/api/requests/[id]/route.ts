import { NextRequest, NextResponse } from 'next/server';
import { getRequestById, updateServiceRequest } from '@/lib/store';
import { UserRole } from '@/lib/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const role = (searchParams.get('role') || 'owner') as UserRole;

    const request = getRequestById(id, role);
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
    const updates = await req.json();

    const updated = updateServiceRequest(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, request: updated });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error updating request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
