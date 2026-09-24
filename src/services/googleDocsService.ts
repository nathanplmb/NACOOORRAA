/**
 * Google Docs API v1 Service
 * Handles creating, reading, and formatting Google Docs.
 */

export interface GoogleDoc {
  documentId: string;
  title: string;
  body?: {
    content?: any[];
  };
}

export async function createGoogleDoc(
  accessToken: string,
  title: string,
  initialContent?: string
): Promise<{ documentId: string; title: string; webViewLink: string }> {
  // 1. Create document
  const createRes = await fetch("https://docs.googleapis.com/v1/documents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: title || "Document NACORA",
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erreur lors de la création du Google Doc: ${createRes.statusText}`);
  }

  const docData = await createRes.json();
  const documentId = docData.documentId;

  // 2. Insert initial content if provided
  if (initialContent && initialContent.trim().length > 0) {
    await insertTextInDoc(accessToken, documentId, initialContent, 1);
  }

  return {
    documentId,
    title: docData.title,
    webViewLink: `https://docs.google.com/document/d/${documentId}/edit`,
  };
}

export async function getGoogleDoc(
  accessToken: string,
  documentId: string
): Promise<GoogleDoc> {
  const res = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erreur lecture Google Doc: ${res.statusText}`);
  }

  return await res.json();
}

export async function insertTextInDoc(
  accessToken: string,
  documentId: string,
  text: string,
  index: number = 1
): Promise<void> {
  const requests = [
    {
      insertText: {
        location: {
          index: index,
        },
        text: text,
      },
    },
  ];

  const updateRes = await fetch(
    `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requests }),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erreur mise à jour Google Doc: ${updateRes.statusText}`);
  }
}

/**
 * Extracts plain text from Google Doc AST body content
 */
export function extractTextFromGoogleDoc(doc: GoogleDoc): string {
  if (!doc.body?.content) return "";
  let fullText = "";

  for (const element of doc.body.content) {
    if (element.paragraph?.elements) {
      for (const pElem of element.paragraph.elements) {
        if (pElem.textRun?.content) {
          fullText += pElem.textRun.content;
        }
      }
    }
  }

  return fullText.trim();
}
