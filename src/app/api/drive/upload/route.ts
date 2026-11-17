import { NextRequest, NextResponse } from 'next/server';
import { isDriveConfigured, uploadFileToDrive } from '@/lib/googleDrive';

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

    // Check if live Google Drive is configured
    if (!isDriveConfigured()) {
      const mockFileId = `drive-mock-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const folderPath = `/Anugraha_Evergreen_Records/Plot_${plotNumber.replace(/\s+/g, '_')}/${category}/`;
      return NextResponse.json({
        success: true,
        fileId: mockFileId,
        webViewLink: `https://drive.google.com/file/d/mock-${category}-${plotNumber}/view`,
        folderPath,
        isMock: true,
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

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
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    console.error('Error uploading file to Drive:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
