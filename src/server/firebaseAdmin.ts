import { initializeApp as initAdminApp, getApps as getAdminApps } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { initializeApp as initClientApp, getApps as getClientApps } from "firebase/app";
import { getFirestore, Firestore, disableNetwork, setLogLevel } from "firebase/firestore";
import { createRequire } from "module";

try {
  setLogLevel("silent");
} catch (_) {}

// Suppress unhandled gRPC Write stream logs when daily write quota is reached
if (typeof process !== "undefined" && process.stderr) {
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  process.stderr.write = function (chunk: any, ...rest: any[]): boolean {
    const str = typeof chunk === "string" ? chunk : chunk?.toString?.() || "";
    if (
      str.includes("RESOURCE_EXHAUSTED") ||
      str.includes("Quota limit exceeded") ||
      str.includes("Free daily write units") ||
      str.includes("GrpcConnection RPC 'Write'")
    ) {
      markServerQuotaExceeded();
      return true; // Filtered gracefully
    }
    return (originalStderrWrite as any)(chunk, ...rest);
  };
}

const require = createRequire(import.meta.url);
const appletConfig = require("../../firebase-applet-config.json");

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

// Server-side Quota Circuit Breaker
// When Firestore daily write quota is reached (Free daily write units limit),
// pause network writes to prevent gRPC Write stream retry loops and resource-exhausted spam.
let serverQuotaExceededUntil = 0;

export function isServerQuotaExceeded(): boolean {
  return Date.now() < serverQuotaExceededUntil;
}

export function markServerQuotaExceeded(err?: any) {
  serverQuotaExceededUntil = Date.now() + 60 * 60 * 1000; // 1 hour pause on remote writes
  console.warn("[ServerFirestore] Daily write quota reached. Disabling network writes for 1 hour to prevent stream retry errors.");
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
    } else {
      console.warn("[ServerFirestore] Write error:", msg);
    }
    return false;
  }
}
