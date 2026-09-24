/**
 * Google Drive API v3 Service
 * Handles listing, downloading, and uploading files in Google Drive.
 */

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  size?: string;
}

export async function listGoogleDriveFiles(
  accessToken: string,
  options?: {
    pageSize?: number;
    query?: string;
    folderId?: string;
  }
): Promise<GoogleDriveFile[]> {
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.append("pageSize", String(options?.pageSize || 30));
  url.searchParams.append(
    "fields",
    "files(id, name, mimeType, webViewLink, iconLink, thumbnailLink, createdTime, modifiedTime, size)"
  );
  url.searchParams.append("orderBy", "modifiedTime desc");

  const qParts: string[] = ["trashed = false"];
  if (options?.query) {
    qParts.push(`name contains '${options.query.replace(/'/g, "\\'")}'`);
  }
  if (options?.folderId) {
    qParts.push(`'${options.folderId}' in parents`);
  }

  url.searchParams.append("q", qParts.join(" and "));

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message || `Google Drive API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return data.files || [];
}

export async function exportGoogleDocAsText(
  accessToken: string,
  fileId: string
): Promise<string> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Erreur lors de l'export du document Google: ${response.statusText}`);
  }

  return await response.text();
}

export async function uploadTextFileToDrive(
  accessToken: string,
  fileName: string,
  content: string,
  mimeType: string = "application/vnd.google-apps.document"
): Promise<GoogleDriveFile> {
  const metadata = {
    name: fileName,
    mimeType: mimeType,
  };

  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" })
  );
  form.append("file", new Blob([content], { type: "text/plain" }));

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erreur d'envoi vers Google Drive: ${response.statusText}`);
  }

  return await response.json();
}
