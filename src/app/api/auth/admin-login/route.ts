import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { passcode, name } = await req.json();

    const expectedPasscode = process.env.ADMIN_PASSCODE || 'evergreen2026';

    if (passcode !== expectedPasscode) {
      return NextResponse.json({ error: 'Invalid Association Admin Passcode.' }, { status: 401 });
    }

    const session = {
      role: 'admin',
      name: name || 'Association Administrator',
      loggedInAt: new Date().toISOString(),
    };

    const res = NextResponse.json({ success: true, session });
    res.cookies.set('aelra_session', JSON.stringify({ role: 'admin', name: session.name }), {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Login failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
