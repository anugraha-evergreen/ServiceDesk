import { NextRequest, NextResponse } from 'next/server';
import { getPlotByNumber } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const { plotNumber, ownerName, phone } = await req.json();

    if (!plotNumber || !ownerName || !phone) {
      return NextResponse.json(
        { error: 'Please enter Plot Number, Owner Name, and Phone Number.' },
        { status: 400 }
      );
    }

    const cleanInput = plotNumber.trim();
    const resolvedPlot = getPlotByNumber(cleanInput);

    const actualPlotNumber = resolvedPlot ? resolvedPlot.plotNumber : cleanInput;
    const wasAmalgamated = Boolean(resolvedPlot && resolvedPlot.plotNumber !== cleanInput);

    const session = {
      role: 'owner',
      plotNumber: actualPlotNumber,
      ownerName: ownerName.trim(),
      phone: phone.trim(),
      wasAmalgamated,
      originalPlotEntered: wasAmalgamated ? cleanInput : undefined,
      plotDetails: resolvedPlot || {
        plotNumber: cleanInput,
        primaryOwnerName: ownerName.trim(),
        phone: phone.trim(),
        status: 'vacant',
      },
    };

    const res = NextResponse.json({ success: true, session });
    res.cookies.set(
      'aelra_session',
      JSON.stringify({ role: 'owner', plotNumber: actualPlotNumber }),
      {
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      }
    );

    return res;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Login failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
