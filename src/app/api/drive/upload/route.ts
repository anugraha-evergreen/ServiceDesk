import { NextRequest, NextResponse } from 'next/server';
import { isDriveConfigured, uploadFileToDrive } from '@/lib/googleDrive';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const plotNumber = formData.get('plotNumber') as string | null;
    const category = formData.get('category') as string | null;

    if (!file || !plotNumber || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: file, plotNumber, or category' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Supabase Storage (Primary - direct, fast, reliable, zero service account quota restrictions)
    if (isSupabaseConfigured && supabase) {
      try {
        const bucketName = 'documents';
        // Auto-create bucket if not present
        await supabase.storage.createBucket(bucketName, { public: true }).catch(() => {});

        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `Plot_${plotNumber.replace(/\s+/g, '_')}/${category}/${Date.now()}_${sanitizedName}`;

        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(storagePath, buffer, {
            contentType: file.type || 'application/octet-stream',
            upsert: true,
          });

        if (!error && data) {
          const { data: publicUrlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(storagePath);

          return NextResponse.json({
            success: true,
            fileId: data.id || storagePath,
            webViewLink: publicUrlData.publicUrl,
            folderPath: `/${bucketName}/${storagePath}`,
            isMock: false,
            storageProvider: 'supabase_storage',
          });
        } else if (error) {
          console.error('Supabase storage upload error:', error);
          return NextResponse.json(
            {
              error: `Supabase Storage upload failed: ${error.message}. Please check if the 'documents' bucket exists in your Supabase project (Dashboard -> Storage -> New Bucket -> 'documents').`,
              details: error,
            },
            { status: 500 }
          );
        }
      } catch (sbErr) {
        console.error('Supabase storage exception:', sbErr);
        const msg = sbErr instanceof Error ? sbErr.message : String(sbErr);
        return NextResponse.json(
          { error: `Supabase storage error: ${msg}` },
          { status: 500 }
        );
      }
    }

    // 2. Google Drive Fallback
    if (isDriveConfigured()) {
      try {
        const result = await uploadFileToDrive({
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          buffer,
          plotNumber,
          category,
        });

        return NextResponse.json({
          success: true,
          fileId: result.fileId,
          webViewLink: result.webViewLink,
          folderPath: result.folderPath,
          isMock: false,
          storageProvider: 'google_drive',
        });
      } catch (driveErr: unknown) {
        const msg = driveErr instanceof Error ? driveErr.message : String(driveErr);
        console.warn('Google Drive rejected upload:', msg);
        if (process.env.NODE_ENV === 'production' && !isSupabaseConfigured) {
          return NextResponse.json(
            { error: `Google Drive upload error: ${msg}. Configure Supabase Storage instead.` },
            { status: 500 }
          );
        }
      }
    }

    // 3. Fallback mock record ONLY in local development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        {
          error:
            'Storage not configured. Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in Vercel, and a public bucket named "documents" exists in Supabase.',
        },
        { status: 500 }
      );
    }

    const mockFileId = `doc-mock-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const folderPath = `/Anugraha_Evergreen_Records/Plot_${plotNumber.replace(/\s+/g, '_')}/${category}/`;
    return NextResponse.json({
      success: true,
      fileId: mockFileId,
      webViewLink: `https://drive.google.com/file/d/mock-${category}-${plotNumber}/view`,
      folderPath,
      isMock: true,
      storageProvider: 'local_mock',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    console.error('Error in upload route:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
