import { serverDb } from "./firebaseAdmin.ts";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { SystemHealthResponse, ServiceHealthStatus } from "../types/admin.ts";

export async function checkSystemHealth(): Promise<SystemHealthResponse> {
  const timestamp = new Date().toISOString();

  // 1. Check Firebase Auth Service (via Google JWKS securetoken endpoint)
  let authStatus: ServiceHealthStatus;
  const authStart = Date.now();
  try {
    const res = await fetch("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com", {
      signal: AbortSignal.timeout(3000)
    });
    const authLatency = Date.now() - authStart;
    if (res.ok) {
      authStatus = {
        status: authLatency > 1500 ? "warning" : "ok",
        latencyMs: authLatency,
        message: "Service Firebase Auth & JWKS opérationnel",
        details: { responseStatus: res.status }
      };
    } else {
      authStatus = {
        status: "error",
        latencyMs: authLatency,
        message: `Erreur HTTP lors de la vérification Auth : ${res.status}`
      };
    }
  } catch (err: any) {
    authStatus = {
      status: "error",
      latencyMs: Date.now() - authStart,
      message: `Impossible de contacter Firebase Auth : ${err.message}`
    };
  }

  // 2. Check Firestore Read latency (read-only probe to preserve daily write quotas)
  let firestoreStatus: ServiceHealthStatus;
  const dbStart = Date.now();
  try {
    const testDocRef = doc(serverDb, "users", "health_check");
    await getDoc(testDocRef);
    const dbLatency = Date.now() - dbStart;
    
    firestoreStatus = {
      status: dbLatency > 1500 ? "warning" : "ok",
      latencyMs: dbLatency,
      message: "Base de données Cloud Firestore connectée et opérationnelle",
      details: { readLatencyMs: dbLatency }
    };
  } catch (err: any) {
    const msg = err?.message || String(err);
    const isOnline = msg.includes("Missing or insufficient permissions") || msg.includes("permission-denied");
    const dbLatency = Date.now() - dbStart;
    firestoreStatus = {
      status: isOnline ? "ok" : "error",
      latencyMs: dbLatency,
      message: isOnline 
        ? "Base de données Cloud Firestore connectée et sécurisée par les règles Firestore" 
        : `Erreur d'accès Firestore : ${msg}`,
      details: { readLatencyMs: dbLatency }
    };
  }

  // 3. Check Gemini API
  let geminiStatus: ServiceHealthStatus;
  const geminiStart = Date.now();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    geminiStatus = {
      status: "warning",
      message: "Variable GEMINI_API_KEY non configurée. Moteur en mode déterministe/heuristique."
    };
  } else {
    try {
      // Lightweight probe to verify Gemini API readiness
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      const geminiLatency = Date.now() - geminiStart;
      if (res.ok) {
        geminiStatus = {
          status: geminiLatency > 2000 ? "warning" : "ok",
          latencyMs: geminiLatency,
          message: "API Google Gemini connectée et opérationnelle",
          details: { configured: true, keyLength: apiKey.length }
        };
      } else {
        const body = await res.text().catch(() => "");
        geminiStatus = {
          status: "warning",
          latencyMs: geminiLatency,
          message: `API Gemini a répondu avec le statut ${res.status}`,
          details: { errorSnippet: body.substring(0, 150) }
        };
      }
    } catch (err: any) {
      geminiStatus = {
        status: "warning",
        latencyMs: Date.now() - geminiStart,
        message: `Vérification Gemini non concluante : ${err.message}`
      };
    }
  }

  // 4. Check Express Server & Runtime
  const mem = process.memoryUsage();
  const memRssMb = Math.round(mem.rss / (1024 * 1024));
  const serverStatus: ServiceHealthStatus = {
    status: memRssMb > 800 ? "warning" : "ok",
    latencyMs: 1,
    message: "Serveur Express et moteur Node.js sains",
    details: {
      uptimeSeconds: Math.round(process.uptime()),
      memoryRssMb: memRssMb,
      nodeVersion: process.version,
      pid: process.pid
    }
  };

  return {
    timestamp,
    services: {
      firebaseAuth: authStatus,
      firestore: firestoreStatus,
      geminiApi: geminiStatus,
      serverApi: serverStatus
    }
  };
}
