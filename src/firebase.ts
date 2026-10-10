import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, disableNetwork, setLogLevel } from "firebase/firestore";
import appletConfig from "../firebase-applet-config.json";

const firebaseConfig = {
  apiKey: appletConfig.apiKey || "AIzaSyDSuWsOTSmd8PUkIsN6-P-OAklI9raLWY8",
  authDomain: appletConfig.authDomain || "sturdy-turbine-17dgj.firebaseapp.com",
  projectId: appletConfig.projectId || "sturdy-turbine-17dgj",
  storageBucket: appletConfig.storageBucket || "sturdy-turbine-17dgj.firebasestorage.app",
  messagingSenderId: appletConfig.messagingSenderId || "1073701319587",
  appId: appletConfig.appId || "1:1073701319587:web:024f693a0dfa73d1776016",
  measurementId: appletConfig.measurementId || ""
};

// Initialize Firebase with singleton pattern
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
const databaseId = appletConfig.firestoreDatabaseId || "ai-studio-nacora-b2fd733f-7ae2-4600-af7a-5faf7bad6765";
export const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);

// Suppress internal gRPC stream logging in the console
try {
  setLogLevel("silent");
} catch (_) {}

// Check if quota limit was reached today; if so, disable network immediately to prevent retry spam
if (typeof window !== "undefined") {
  const handleQuotaExceeded = () => {
    try {
      localStorage.setItem("nacora_quota_exceeded_timestamp", String(Date.now()));
      disableNetwork(db).catch(() => {});
    } catch (_) {}
  };

  try {
    const quotaTs = localStorage.getItem("nacora_quota_exceeded_timestamp");
    if (quotaTs) {
      const ts = parseInt(quotaTs, 10);
      if (Date.now() - ts < 24 * 60 * 60 * 1000) {
        disableNetwork(db).catch(() => {});
      } else {
        localStorage.removeItem("nacora_quota_exceeded_timestamp");
      }
    }
  } catch (_) {}

  // Filter console errors from Firestore gRPC backoff stream when quota is reached
  const originalConsoleError = console.error;
  console.error = function (...args: any[]) {
    const str = args.map(a => (typeof a === "object" ? (a?.message || a?.stack || JSON.stringify(a) || "") : String(a))).join(" ");
    if (
      str.includes("resource-exhausted") || 
      str.includes("RESOURCE_EXHAUSTED") || 
      str.includes("Quota limit exceeded") || 
      str.includes("overloading the backend") ||
      str.includes("GrpcConnection RPC 'Write'")
    ) {
      handleQuotaExceeded();
      return; // Handled gracefully by local fallback
    }
    originalConsoleError.apply(console, args);
  };

  // Global handler for unhandled promise rejections originating from Firestore writes
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const msg = reason?.message || String(reason || "");
    const code = reason?.code || "";
    if (
      code === "resource-exhausted" || 
      msg.includes("resource-exhausted") || 
      msg.includes("RESOURCE_EXHAUSTED") || 
      msg.includes("Quota limit exceeded") ||
      msg.includes("overloading the backend") ||
      msg.includes("stream 0x")
    ) {
      event.preventDefault();
      handleQuotaExceeded();
    }
  });
}
