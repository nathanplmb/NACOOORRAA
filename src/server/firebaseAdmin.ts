import { initializeApp as initAdminApp, getApps as getAdminApps } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { initializeApp as initClientApp, getApps as getClientApps } from "firebase/app";
import { getFirestore, Firestore, disableNetwork, setLogLevel } from "firebase/firestore";
import fs from "fs";
import path from "path";

let appletConfig: any = {};
try {
  const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    appletConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  }
} catch (err) {
  console.warn("[FirebaseAdmin] Warning: Could not read firebase-applet-config.json", err);
}

// 1. Initialize Firebase Admin App for cryptographic ID Token verification
const adminApp = getAdminApps().length === 0 
  ? initAdminApp({ projectId: appletConfig.projectId || "sturdy-turbine-17dgj" })
  : getAdminApps()[0];

export const adminAuth = getAdminAuth(adminApp);

// 2. Initialize Firestore connection for server-side persistence using Web SDK client with project API key
const clientApp = getClientApps().length === 0
  ? initClientApp({
      apiKey: appletConfig.apiKey,
      authDomain: appletConfig.authDomain,
      projectId: appletConfig.projectId,
      storageBucket: appletConfig.storageBucket,
      messagingSenderId: appletConfig.messagingSenderId,
      appId: appletConfig.appId,
    }, "server-client-worker")
  : getClientApps()[0];

const databaseId = appletConfig.firestoreDatabaseId || "ai-studio-nacora-b2fd733f-7ae2-4600-af7a-5faf7bad6765";
export const serverDb: Firestore = getFirestore(clientApp, databaseId);

export async function verifyServerToken(token: string) {
  return await adminAuth.verifyIdToken(token);
}

// Server-side Quota Circuit Breaker & Permission Guard
// When Firestore daily write quota is reached or security rules restrict unauthenticated server writes,
// pause network writes to operate smoothly via in-memory server registries.
let serverQuotaExceededUntil = 0;
let serverRemoteWritesDisabled = false;

export function isServerQuotaExceeded(): boolean {
  return serverRemoteWritesDisabled || Date.now() < serverQuotaExceededUntil;
}

export function markServerQuotaExceeded(err?: any) {
  serverQuotaExceededUntil = Date.now() + 60 * 60 * 1000; // 1 hour pause on remote writes
  try {
    disableNetwork(serverDb).catch(() => {});
  } catch (_) {}
}

export function markServerWritesRestricted() {
  serverRemoteWritesDisabled = true;
  try {
    disableNetwork(serverDb).catch(() => {});
  } catch (_) {}
}

export async function safeServerWrite(writeFn: () => Promise<void>): Promise<boolean> {
  if (isServerQuotaExceeded()) {
    return false;
  }
  try {
    await writeFn();
    return true;
  } catch (err: any) {
    const msg = err?.message || String(err);
    const code = err?.code || "";
    if (
      code === "resource-exhausted" ||
      msg.includes("resource-exhausted") ||
      msg.includes("RESOURCE_EXHAUSTED") ||
      msg.includes("Quota limit exceeded") ||
      msg.includes("quota")
    ) {
      markServerQuotaExceeded(err);
    } else if (
      code === "permission-denied" ||
      code === 7 ||
      msg.includes("PERMISSION_DENIED") ||
      msg.includes("permission-denied") ||
      msg.includes("Missing or insufficient permissions")
    ) {
      // Unauthenticated server worker writes restricted by security rules.
      // Gracefully disable remote server writes and operate in server memory mode.
      markServerWritesRestricted();
    } else {
      // Log only unexpected server errors
      console.warn("[ServerFirestore] Unexpected write error:", msg);
    }
    return false;
  }
}
