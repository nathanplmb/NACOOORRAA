import { serverDb, adminAuth, safeServerWrite } from "./firebaseAdmin.ts";
import { collection, doc, setDoc, getDocs, query, where, orderBy, limit as firestoreLimit } from "firebase/firestore";
import { UserSession } from "../types/admin.ts";
import { recordAuditLog, recordSystemActivity } from "./auditEngine.ts";

// In-memory cache for sessions to guarantee instant access even during Firestore quota limits
const memorySessions = new Map<string, UserSession>();

function cleanForDb<T extends Record<string, any>>(obj: T): T {
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      clean[k] = v;
    }
  }
  return clean as T;
}

export function parseUserAgent(ua: string): { device: string; browser: string; os: string } {
  if (!ua) return { device: "Desktop", browser: "Inconnu", os: "Inconnu" };

  let os = "Inconnu";
  if (ua.includes("Windows NT 10.0")) os = "Windows 10/11";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("Linux")) os = "Linux";

  let browser = "Navigateur Web";
  if (ua.includes("Edg/")) browser = "Microsoft Edge";
  else if (ua.includes("Chrome/") && !ua.includes("Edg/")) browser = "Google Chrome";
  else if (ua.includes("Safari/") && !ua.includes("Chrome/")) browser = "Apple Safari";
  else if (ua.includes("Firefox/")) browser = "Mozilla Firefox";

  let device = "Desktop";
  if (ua.includes("Mobile") || ua.includes("iPhone") || ua.includes("Android")) {
    device = ua.includes("iPad") || ua.includes("Tablet") ? "Tablette" : "Mobile";
  }

  return { device, browser, os };
}

export async function recordUserSession(params: {
  userId: string;
  userEmail?: string;
  userName?: string;
  userAgent?: string;
  ip?: string;
  sessionId?: string;
}): Promise<UserSession> {
  const ua = params.userAgent || "";
  const { device, browser, os } = parseUserAgent(ua);
  
  // Mask IP for privacy (e.g. 192.168.1.10 -> 192.168.***)
  const maskedIp = params.ip 
    ? params.ip.replace(/(\d+)\.(\d+)\.(\d+)\.(\d+)/, "$1.$2.***.***") 
    : undefined;

  const id = params.sessionId || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date().toISOString();

  const sessionData: UserSession = {
    id,
    userId: params.userId,
    userEmail: params.userEmail,
    userName: params.userName,
    createdAt: now,
    lastSeenAt: now,
    revokedAt: null,
    userAgent: ua.substring(0, 200),
    device,
    browser,
    os,
    ip: maskedIp,
    status: "active"
  };

  // Always keep in memory registry
  memorySessions.set(id, sessionData);

  // Safely attempt Firestore persistence with quota exhaustion circuit breaker
  await safeServerWrite(async () => {
    const sessionRef = doc(serverDb, "user_sessions", id);
    await setDoc(sessionRef, cleanForDb(sessionData));

    // Update user document: set lastLoginAt and lastActivityAt
    const userDocRef = doc(serverDb, "users", params.userId);
    await setDoc(userDocRef, {
      lastLoginAt: now,
      lastActivityAt: now,
      lastSeenDevice: `${device} • ${browser} (${os})`,
      updatedAt: now
    }, { merge: true });
  });

  await recordSystemActivity({
    userId: params.userId,
    userName: params.userName || params.userEmail || "Utilisateur",
    type: "login",
    description: `Connexion depuis ${device} (${browser}, ${os})`,
    metadata: { sessionId: id, device, browser, os }
  });

  return sessionData;
}

export async function touchUserActivity(userId: string, sessionId?: string) {
  const now = new Date().toISOString();
  if (sessionId && memorySessions.has(sessionId)) {
    const s = memorySessions.get(sessionId)!;
    s.lastSeenAt = now;
  }
  await safeServerWrite(async () => {
    if (sessionId) {
      const sessionRef = doc(serverDb, "user_sessions", sessionId);
      await setDoc(sessionRef, { lastSeenAt: now }, { merge: true });
    }
    const userDocRef = doc(serverDb, "users", userId);
    await setDoc(userDocRef, { lastActivityAt: now }, { merge: true });
  });
}

export async function getUserSessions(userId: string): Promise<UserSession[]> {
  const resultsMap = new Map<string, UserSession>();

  // Add memory sessions
  for (const s of memorySessions.values()) {
    if (s.userId === userId) {
      resultsMap.set(s.id, s);
    }
  }

  try {
    const colRef = collection(serverDb, "user_sessions");
    const q = query(colRef, where("userId", "==", userId));
    const snap = await getDocs(q);
    snap.forEach(d => {
      const data = d.data() as UserSession;
      if (!resultsMap.has(data.id)) {
        resultsMap.set(data.id, data);
      }
    });
  } catch (err) {
    // Graceful fallback to memory registry
  }

  const list = Array.from(resultsMap.values());
  return list.sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime());
}

export async function getAllSessions(maxCount = 100): Promise<UserSession[]> {
  const resultsMap = new Map<string, UserSession>();

  // Add all memory sessions
  for (const s of memorySessions.values()) {
    resultsMap.set(s.id, s);
  }

  try {
    const colRef = collection(serverDb, "user_sessions");
    const snap = await getDocs(colRef);
    snap.forEach(d => {
      const data = d.data() as UserSession;
      if (!resultsMap.has(data.id)) {
        resultsMap.set(data.id, data);
      }
    });
  } catch (err) {
    // Graceful fallback to memory registry
  }

  const list = Array.from(resultsMap.values());
  return list
    .sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime())
    .slice(0, maxCount);
}

export async function revokeAllUserSessions(params: {
  userId: string;
  adminUserId: string;
  adminEmail: string;
  targetUserEmail?: string;
  reason?: string;
}) {
  const now = new Date().toISOString();

  // 1. Try Firebase Auth native token revocation
  try {
    await adminAuth.revokeRefreshTokens(params.userId);
  } catch (_) {}

  // 2. Mark all application sessions in memory as revoked
  for (const s of memorySessions.values()) {
    if (s.userId === params.userId && s.status === "active") {
      s.status = "revoked";
      s.revokedAt = now;
    }
  }

  // 3. Mark in Firestore safely
  await safeServerWrite(async () => {
    const sessions = await getUserSessions(params.userId);
    for (const s of sessions) {
      if (s.status === "active") {
        const sRef = doc(serverDb, "user_sessions", s.id);
        await setDoc(sRef, {
          status: "revoked",
          revokedAt: now
        }, { merge: true });
      }
    }

    const userDocRef = doc(serverDb, "users", params.userId);
    await setDoc(userDocRef, {
      sessionsRevokedAt: now,
      updatedAt: now
    }, { merge: true });
  });

  // 4. Log in Audit trail
  await recordAuditLog({
    adminUserId: params.adminUserId,
    adminEmail: params.adminEmail,
    action: "sessions_revoked",
    targetUserId: params.userId,
    targetUserEmail: params.targetUserEmail,
    metadata: {
      reason: params.reason || "Action administrative",
      revokedAt: now
    }
  });

  return { success: true, message: `Sessions révoquées pour ${params.targetUserEmail || params.userId}` };
}
