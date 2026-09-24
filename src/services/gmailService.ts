/**
 * Gmail API v1 Service
 * Handles listing messages, reading recruiter emails, sending emails, and creating drafts.
 */

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet?: string;
  subject?: string;
  from?: string;
  to?: string;
  date?: string;
  isUnread?: boolean;
}

export interface GmailFullMessage {
  id: string;
  threadId: string;
  snippet: string;
  headers: Record<string, string>;
  subject: string;
  from: string;
  to: string;
  date: string;
  bodyText: string;
}

export async function listGmailMessages(
  accessToken: string,
  options?: {
    q?: string;
    maxResults?: number;
    labelIds?: string[];
  }
): Promise<GmailMessageSummary[]> {
  const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  url.searchParams.append("maxResults", String(options?.maxResults || 20));

  if (options?.q) {
    url.searchParams.append("q", options.q);
  }
  if (options?.labelIds && options.labelIds.length > 0) {
    options.labelIds.forEach((l) => url.searchParams.append("labelIds", l));
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gmail API error: ${res.statusText}`);
  }

  const listData = await res.json();
  const rawList: { id: string; threadId: string }[] = listData.messages || [];

  if (rawList.length === 0) return [];

  // Fetch details in batch for the top messages (up to 10 for performance)
  const topList = rawList.slice(0, 15);
  const detailPromises = topList.map(async (item) => {
    try {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (!msgRes.ok) return null;
      const msgData = await msgRes.json();
      
      const headersMap: Record<string, string> = {};
      (msgData.payload?.headers || []).forEach((h: { name: string; value: string }) => {
        headersMap[h.name.toLowerCase()] = h.value;
      });

      return {
        id: msgData.id,
        threadId: msgData.threadId,
        snippet: msgData.snippet || "",
        subject: headersMap["subject"] || "(Sans objet)",
        from: headersMap["from"] || "Inconnu",
        to: headersMap["to"] || "",
        date: headersMap["date"] || "",
        isUnread: (msgData.labelIds || []).includes("UNREAD"),
      } as GmailMessageSummary;
    } catch {
      return null;
    }
  });

  const detailed = await Promise.all(detailPromises);
  return detailed.filter((m): m is GmailMessageSummary => m !== null);
}

export async function getGmailMessageDetails(
  accessToken: string,
  messageId: string
): Promise<GmailFullMessage> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Erreur récupération email: ${res.statusText}`);
  }

  const data = await res.json();
  const headersMap: Record<string, string> = {};
  (data.payload?.headers || []).forEach((h: { name: string; value: string }) => {
    headersMap[h.name.toLowerCase()] = h.value;
  });

  let bodyText = "";
  if (data.payload?.body?.data) {
    bodyText = decodeBase64Url(data.payload.body.data);
  } else if (data.payload?.parts) {
    bodyText = extractBodyFromParts(data.payload.parts);
  }

  return {
    id: data.id,
    threadId: data.threadId,
    snippet: data.snippet || "",
    headers: headersMap,
    subject: headersMap["subject"] || "(Sans objet)",
    from: headersMap["from"] || "",
    to: headersMap["to"] || "",
    date: headersMap["date"] || "",
    bodyText: bodyText || data.snippet || "",
  };
}

function extractBodyFromParts(parts: any[]): string {
  for (const part of parts) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      return decodeBase64Url(part.body.data);
    }
    if (part.parts) {
      const nested = extractBodyFromParts(part.parts);
      if (nested) return nested;
    }
  }
  return "";
}

function decodeBase64Url(str: string): string {
  try {
    const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    return decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch {
    return atob(str.replace(/-/g, "+").replace(/_/g, "/"));
  }
}

function encodeBase64Url(str: string): string {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function sendGmailEmail(
  accessToken: string,
  params: {
    to: string;
    subject: string;
    body: string;
    cc?: string;
  }
): Promise<{ id: string; threadId: string }> {
  const utf8Subject = `=?utf-8?B?${btoa(encodeURIComponent(params.subject).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))))}?=`;
  
  const emailLines = [
    `To: ${params.to}`,
    params.cc ? `Cc: ${params.cc}` : null,
    `Subject: ${utf8Subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    params.body,
  ].filter(Boolean);

  const rawEmail = emailLines.join("\r\n");
  const encodedEmail = encodeBase64Url(rawEmail);

  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw: encodedEmail,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erreur d'envoi Gmail: ${res.statusText}`);
  }

  return await res.json();
}
