import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest) {
  // Read array buffer / stream to simulate receiving bytes
  try {
    await req.arrayBuffer();
    return NextResponse.json({
      status: 'uploaded',
      mock: true,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ error: 'Mock upload stream error' }, { status: 500 });
  }
}
