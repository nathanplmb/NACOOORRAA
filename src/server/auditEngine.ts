import { serverDb, safeServerWrite } from "./firebaseAdmin.ts";
import { collection, doc, setDoc, getDocs, query, orderBy, limit as firestoreLimit } from "firebase/firestore";
import { AdminAuditLog, AdminAuditAction, SystemActivity } from "../types/admin.ts";

// In-memory buffer to retain logs during Firestore write quota limits
const memoryAuditLogs: AdminAuditLog[] = [];
const memoryActivities: SystemActivity[] = [];

function cleanForDb<T extends Record<string, any>>(obj: T): T {
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      clean[k] = v;
    }
  }
  return clean as T;
}

export async function recordAuditLog(params: {
  adminUserId: string;
  adminEmail: string;
  action: AdminAuditAction;
  targetUserId?: string;
  targetUserEmail?: string;
  metadata?: Record<string, any>;
}): Promise<AdminAuditLog> {
  const logId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const logEntry: AdminAuditLog = {
    id: logId,
    adminUserId: params.adminUserId,
    adminEmail: params.adminEmail,
    action: params.action,
    targetUserId: params.targetUserId,
    targetUserEmail: params.targetUserEmail,
    metadata: params.metadata || {},
    createdAt: new Date().toISOString()
  };

  memoryAuditLogs.unshift(logEntry);
  if (memoryAuditLogs.length > 200) memoryAuditLogs.pop();

  await safeServerWrite(async () => {
    const logRef = doc(serverDb, "admin_audit_logs", logId);
    await setDoc(logRef, cleanForDb(logEntry));
  });

  return logEntry;
}

export async function recordSystemActivity(params: {
  userId?: string;
  userName?: string;
  type: string;
  description: string;
  metadata?: Record<string, any>;
}): Promise<SystemActivity> {
  const actId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const activityEntry: SystemActivity = {
    id: actId,
    userId: params.userId,
    userName: params.userName || "Système",
    type: params.type,
    description: params.description,
    metadata: params.metadata || {},
    createdAt: new Date().toISOString()
  };

  memoryActivities.unshift(activityEntry);
  if (memoryActivities.length > 200) memoryActivities.pop();

  await safeServerWrite(async () => {
    const actRef = doc(serverDb, "system_activities", actId);
    await setDoc(actRef, cleanForDb(activityEntry));
  });

  return activityEntry;
}

export async function getAuditLogs(maxCount = 100): Promise<AdminAuditLog[]> {
  const map = new Map<string, AdminAuditLog>();
  for (const log of memoryAuditLogs) {
    map.set(log.id, log);
  }

  try {
    const colRef = collection(serverDb, "admin_audit_logs");
    const q = query(colRef, orderBy("createdAt", "desc"), firestoreLimit(maxCount));
    const snap = await getDocs(q);
    snap.forEach(d => {
      const data = d.data() as AdminAuditLog;
      if (!map.has(data.id)) {
        map.set(data.id, data);
      }
    });
  } catch (_) {
    // Return memory logs if Firestore query is blocked or offline
  }

  const list = Array.from(map.values());
  return list
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, maxCount);
}

export async function getSystemActivities(maxCount = 100): Promise<SystemActivity[]> {
  const map = new Map<string, SystemActivity>();
  for (const act of memoryActivities) {
    map.set(act.id, act);
  }

  try {
    const colRef = collection(serverDb, "system_activities");
    const q = query(colRef, orderBy("createdAt", "desc"), firestoreLimit(maxCount));
    const snap = await getDocs(q);
    snap.forEach(d => {
      const data = d.data() as SystemActivity;
      if (!map.has(data.id)) {
        map.set(data.id, data);
      }
    });
  } catch (_) {
    // Return memory activities if query is blocked
  }

  const list = Array.from(map.values());
  return list
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, maxCount);
}
