import { google } from 'googleapis';

const ROOT_FOLDER_NAME = 'Anugraha_Evergreen_Records';

interface DriveConfig {
  clientEmail?: string;
  privateKey?: string;
  rootFolderId?: string;
}

function getDriveConfig(): DriveConfig {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;
  if (privateKey) {
    // Replace escaped newlines if passed in single-line env var
    privateKey = privateKey.replace(/\\n/g, '\n');
  }
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

  return { clientEmail, privateKey, rootFolderId };
}

export function isDriveConfigured(): boolean {
  const { clientEmail, privateKey } = getDriveConfig();
  return Boolean(clientEmail && privateKey);
}

function getDriveClient() {
  const { clientEmail, privateKey } = getDriveConfig();
  if (!clientEmail || !privateKey) {
    throw new Error('Google Drive Service Account is not configured in environment.');
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

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
  const client = drive.context._options.auth as InstanceType<typeof google.auth.JWT>;
  const token = await client.getAccessToken();

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
