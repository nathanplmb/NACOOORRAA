import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, setLogLevel } from "firebase/firestore";
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

// Suppress internal gRPC stream verbose logging in console
try {
  setLogLevel("silent");
} catch (_) {}

// Neutralize legacy 24-hour quota lock key from LocalStorage safely without touching user data
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("nacora_quota_exceeded_timestamp");
  } catch (_) {}
}
