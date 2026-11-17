import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const status: Record<string, any> = {
    isSupabaseConfigured,
    supabaseUrl: supabaseUrl ? supabaseUrl.replace(/^(https?:\/\/[^.]+).*/, '$1***') : null,
    hasAnonKey,
    hasServiceRoleKey,
    bucketFound: false,
    writeTestSuccess: false,
    instructions: [],
  };

  if (!isSupabaseConfigured || !supabase) {
    status.error = 'Supabase environment variables are missing in Vercel.';
    status.instructions.push(
      'Add NEXT_PUBLIC_SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY (recommended) or NEXT_PUBLIC_SUPABASE_ANON_KEY to Vercel Environment Variables.'
    );
    return NextResponse.json(status);
  }

  try {
    // 1. Check existing buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      status.listBucketsError = listError.message;
    } else {
      status.availableBuckets = buckets?.map((b) => b.name) || [];
      status.bucketFound = (buckets || []).some((b) => b.name === 'documents');
    }

    // 2. If bucket not found, attempt to auto-create
    if (!status.bucketFound) {
      const { data: createData, error: createError } = await supabase.storage.createBucket('documents', {
        public: true,
      });
      if (!createError) {
        status.bucketFound = true;
        status.bucketCreatedNow = true;
      } else {
        status.createBucketError = createError.message;
        status.instructions.push(
          'Bucket "documents" was not found. Please log in to your Supabase Dashboard -> Storage -> Click "New Bucket" -> Name: "documents" -> Toggle "Public bucket" to ON -> Save.'
        );
      }
    }

    // 3. Test write access
    const testFileName = `test_${Date.now()}.txt`;
    const testContent = Buffer.from('AEOWA Storage Health Check');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(testFileName, testContent, {
        contentType: 'text/plain',
        upsert: true,
      });

    if (uploadError) {
      status.writeTestError = uploadError.message;
      if (uploadError.message.includes('row-level security') || uploadError.message.includes('policy')) {
        status.instructions.push(
          'Row Level Security blocked the upload. Either add SUPABASE_SERVICE_ROLE_KEY to your Vercel env vars, OR run the storage policies from supabase_schema.sql in the Supabase SQL Editor.'
        );
      }
    } else {
      status.writeTestSuccess = true;
      // Clean up test file
      await supabase.storage.from('documents').remove([testFileName]).catch(() => {});
    }
  } catch (err: unknown) {
    status.unexpectedError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(status);
}
