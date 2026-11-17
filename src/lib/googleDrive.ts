import { google } from 'googleapis';
import { Readable } from 'stream';

const ROOT_FOLDER_NAME = 'Anugraha_Evergreen_Records';

interface DriveConfig {
  clientEmail?: string;
  privateKey?: string;
  rootFolderId?: string;
}

/**
 * Robust cleaner for Google Service Account private key PEM strings.
 * Fixes OpenSSL 3 error: "error:1E08010C:DECODER routines::unsupported"
 * Handles Vercel env formatting, escaped newlines, raw JSON paste, and outer quotes.
 */
function cleanPrivateKey(raw?: string): string | undefined {
  if (!raw) return undefined;
  let str = raw.trim();

  // 1. If user pasted the entire service account JSON into GOOGLE_PRIVATE_KEY
  if (str.startsWith('{')) {
    try {
      const parsed = JSON.parse(str);
      if (parsed.private_key) str = parsed.private_key.trim();
    } catch {
      // not valid JSON, proceed as string
    }
  }

  // 2. Strip surrounding single or double quotes
  while (
    (str.startsWith('"') && str.endsWith('"')) ||
    (str.startsWith("'") && str.endsWith("'"))
  ) {
    str = str.slice(1, -1).trim();
  }

  // 3. Unescape escaped double quotes
  str = str.replace(/\\"/g, '"');

  // 4. Normalize all escaped newlines (\n, \\n, \r) to real newlines
  str = str.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r/g, '');

  // 5. Ensure valid PEM header and footer
  if (!str.includes('-----BEGIN PRIVATE KEY-----') && !str.includes('-----BEGIN RSA PRIVATE KEY-----')) {
    str = `-----BEGIN PRIVATE KEY-----\n${str}\n-----END PRIVATE KEY-----`;
  }

  // 6. Ensure real newlines after header and before footer
  str = str.replace(/(-----BEGIN [A-Z ]+-----)/g, '$1\n');
  str = str.replace(/(-----END [A-Z ]+-----)/g, '\n$1');

  // 7. Collapse consecutive duplicate newlines
  str = str.replace(/\n{2,}/g, '\n').trim() + '\n';

  return str;
}

function getDriveConfig(): DriveConfig {
  let clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  let rawKey = process.env.GOOGLE_PRIVATE_KEY?.trim();
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim();

  // If user pasted the full service account JSON into GOOGLE_PRIVATE_KEY or GOOGLE_SERVICE_ACCOUNT_EMAIL
  if (rawKey && rawKey.startsWith('{')) {
    try {
      const parsed = JSON.parse(rawKey);
      if (parsed.private_key) rawKey = parsed.private_key;
      if (!clientEmail && parsed.client_email) clientEmail = parsed.client_email;
    } catch {}
  }
  if (clientEmail && clientEmail.startsWith('{')) {
    try {
      const parsed = JSON.parse(clientEmail);
      if (parsed.client_email) clientEmail = parsed.client_email;
      if (!rawKey && parsed.private_key) rawKey = parsed.private_key;
    } catch {}
  }

  const privateKey = cleanPrivateKey(rawKey);
  return { clientEmail, privateKey, rootFolderId };
}

export function isDriveConfigured(): boolean {
  const { clientEmail, privateKey } = getDriveConfig();
  return Boolean(clientEmail && privateKey);
}

function getDriveAuth() {
  const { clientEmail, privateKey } = getDriveConfig();
  if (!clientEmail || !privateKey) {
    throw new Error('Google Drive Service Account is not configured in environment.');
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
}

function getDriveClient() {
  const auth = getDriveAuth();
  return google.drive({ version: 'v3', auth });
}

/**
 * Finds or creates a folder under a parent
 */
async function findOrCreateFolder(
  drive: ReturnType<typeof google.drive>,
  folderName: string,
  parentId?: string
): Promise<string> {
  const queryParts = [
    `name = '${folderName}'`,
    `mimeType = 'application/vnd.google-apps.folder'`,
    'trashed = false',
  ];
  if (parentId) {
    queryParts.push(`'${parentId}' in parents`);
  }

  const res = await drive.files.list({
    q: queryParts.join(' and '),
    fields: 'files(id, name)',
    spaces: 'drive',
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  // Create folder
  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentId ? [parentId] : undefined,
  };

  const folder = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id',
    supportsAllDrives: true,
  });

  return folder.data.id!;
}

/**
 * Resolves / creates the target directory:
 * /Anugraha_Evergreen_Records/Plot_[Number]/[Category]/
 */
export async function getTargetFolderId(
  plotNumber: string,
  category: string
): Promise<{ folderId: string; folderPath: string }> {
  const drive = getDriveClient();
  const { rootFolderId: configuredRootId } = getDriveConfig();

  // 1. Root folder
  const rootFolderId = configuredRootId || (await findOrCreateFolder(drive, ROOT_FOLDER_NAME));

  // 2. Plot subfolder: Plot_[Number]
  const plotFolderName = `Plot_${plotNumber.replace(/\s+/g, '_')}`;
  const plotFolderId = await findOrCreateFolder(drive, plotFolderName, rootFolderId);

  // 3. Category subfolder: [Category]
  const categoryFolderName = category.replace(/\s+/g, '_');
  const categoryFolderId = await findOrCreateFolder(drive, categoryFolderName, plotFolderId);

  const folderPath = `/${ROOT_FOLDER_NAME}/${plotFolderName}/${categoryFolderName}/`;
  return { folderId: categoryFolderId, folderPath };
}

/**
 * Initiates a Resumable Upload session with Google Drive.
 * Returns the resumable session URL so the mobile browser can upload directly
 * without passing heavy file binaries through Vercel serverless functions.
 */
export async function initiateResumableUpload(params: {
  fileName: string;
  mimeType: string;
  fileSizeBytes?: number;
  plotNumber: string;
  category: string;
}): Promise<{ uploadUrl: string; folderPath: string }> {
  const drive = getDriveClient();
  const { folderId, folderPath } = await getTargetFolderId(params.plotNumber, params.category);

  // Obtain access token
  const auth = getDriveAuth();
  const token = await auth.getAccessToken();

  if (!token.token) {
    throw new Error('Failed to retrieve Google Auth token');
  }

  // Request resumable upload session URI from Google Drive API
  const metadata = {
    name: params.fileName,
    parents: [folderId],
  };

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': params.mimeType,
        ...(params.fileSizeBytes ? { 'X-Upload-Content-Length': String(params.fileSizeBytes) } : {}),
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Drive API rejected resumable session: ${response.status} ${errorText}`);
  }

  const uploadUrl = response.headers.get('Location');
  if (!uploadUrl) {
    throw new Error('Google Drive did not return a Location header for resumable upload.');
  }

  return { uploadUrl, folderPath };
}

/**
 * Direct server-side upload to Google Drive using the service account.
 * 100% immune to browser CORS policies and adblockers.
 */
export async function uploadFileToDrive(params: {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  plotNumber: string;
  category: string;
}): Promise<{ fileId: string; webViewLink?: string; folderPath: string }> {
  const drive = getDriveClient();
  const { folderId, folderPath } = await getTargetFolderId(params.plotNumber, params.category);

  const stream = new Readable();
  stream.push(params.buffer);
  stream.push(null);

  const res = await drive.files.create({
    requestBody: {
      name: params.fileName,
      parents: [folderId],
    },
    media: {
      mimeType: params.mimeType,
      body: stream,
    },
    fields: 'id,name,webViewLink',
    supportsAllDrives: true,
  });

  return {
    fileId: res.data.id!,
    webViewLink: res.data.webViewLink || `https://drive.google.com/file/d/${res.data.id}/view`,
    folderPath,
  };
}

