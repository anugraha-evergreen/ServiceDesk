import { NextRequest, NextResponse } from 'next/server';
import { initiateResumableUpload, isDriveConfigured } from '@/lib/googleDrive';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fileName, mimeType, fileSizeBytes, plotNumber, category } = body;

    if (!fileName || !plotNumber || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: fileName, plotNumber, or category' },
        { status: 400 }
      );
    }

    // Check if live Google Drive is configured
    if (!isDriveConfigured()) {
      // Graceful local development fallback
      const mockFileId = `drive-mock-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const folderPath = `/Anugraha_Evergreen_Records/Plot_${plotNumber.replace(/\s+/g, '_')}/${category}/`;
      return NextResponse.json({
        uploadUrl: '/api/drive/mock-upload',
        fileId: mockFileId,
        folderPath,
        isMock: true,
        message: 'Running in Local Mode (Add Google Service Account to .env.local to activate direct Drive sync)',
      });
    }

    const { uploadUrl, folderPath } = await initiateResumableUpload({
      fileName,
      mimeType: mimeType || 'application/octet-stream',
      fileSizeBytes: fileSizeBytes ? Number(fileSizeBytes) : undefined,
      plotNumber,
      category,
    });

    return NextResponse.json({
      uploadUrl,
      folderPath,
      isMock: false,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload initialization failed';
    console.error('Error initiating Drive upload:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
