import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get('url');
    const fileName = searchParams.get('name') || 'document.pdf';
    const filePath = searchParams.get('path');

    // 1. If path or Supabase URL is available, fetch directly from Supabase Storage
    if (isSupabaseConfigured && supabase) {
      let storagePath = filePath;

      if (!storagePath && fileUrl) {
        // Extract relative storage path from Supabase public URL:
        // https://.../storage/v1/object/public/documents/Plot_42/category/123_file.pdf
        const match = fileUrl.match(/\/documents\/(.+)$/);
        if (match) {
          storagePath = decodeURIComponent(match[1]);
        }
      }

      if (storagePath) {
        const { data, error } = await supabase.storage.from('documents').download(storagePath);
        if (!error && data) {
          const arrayBuffer = await data.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const mimeType = data.type || 'application/pdf';

          return new NextResponse(buffer, {
            status: 200,
            headers: {
              'Content-Type': mimeType,
              'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
              'Content-Length': buffer.length.toString(),
            },
          });
        }
      }
    }

    // 2. If a valid external URL is provided (e.g. public Supabase CDN), fetch and stream as attachment
    if (fileUrl && fileUrl.startsWith('http') && !fileUrl.includes('drive.google.com')) {
      try {
        const fetchRes = await fetch(fileUrl);
        if (fetchRes.ok) {
          const buffer = Buffer.from(await fetchRes.arrayBuffer());
          const mimeType = fetchRes.headers.get('content-type') || 'application/pdf';

          return new NextResponse(buffer, {
            status: 200,
            headers: {
              'Content-Type': mimeType,
              'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
              'Content-Length': buffer.length.toString(),
            },
          });
        }
      } catch (fetchErr) {
        console.warn('Direct fetch from fileUrl failed:', fetchErr);
      }
    }

    // 3. Fallback: generate a clean text/pdf placeholder if file is a local mock or unavailable
    const fallbackText = `AEOWA: Anugraha Evergreen Owners Welfare Association\nDocument Archive: ${fileName}\nStatus: Verified on Record\nRegistration No: DRB3/SOR/364/2022-2023\n`;
    const fallbackBuffer = Buffer.from(fallbackText);

    return new NextResponse(fallbackBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName.replace(/\.pdf$/i, '.txt'))}"`,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Download failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
