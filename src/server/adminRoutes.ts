import { Router, Response } from "express";
import { requireAdmin, AdminRequest } from "./adminAuth.ts";
import { serverDb, adminAuth, safeServerWrite } from "./firebaseAdmin.ts";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit 
} from "firebase/firestore";
import { 
  AdminUserItem, 
  AdminUsersListResponse, 
  UserStatus, 
  UserRole, 
  AccessTier, 
  CreditMode,
  AdminOverviewStats 
} from "../types/admin.ts";
import { 
  getUserCreditSummary, 
  getUserCreditTransactions, 
  addCreditTransaction 
} from "./creditsEngine.ts";
import { 
  getUserSessions, 
  getAllSessions, 
  revokeAllUserSessions 
} from "./sessionEngine.ts";
import { 
  recordAuditLog, 
  recordSystemActivity, 
  getAuditLogs, 
  getSystemActivities 
} from "./auditEngine.ts";
import { checkSystemHealth } from "./systemEngine.ts";
import { runDataHealthAudit } from "./dataHealthEngine.ts";

export const adminRouter = Router();

// Apply requireAdmin to ALL /api/admin routes
adminRouter.use(requireAdmin(["admin", "support", "viewer"]));

// ============================================================================
// 1. OVERVIEW DASHBOARD STATS
// ============================================================================
adminRouter.get("/overview", async (req: AdminRequest, res: Response) => {
  try {
    const usersSnap = await getDocs(collection(serverDb, "users"));
    let totalUsers = 0;
    let activeToday = 0;
    let newUsersWeek = 0;
    let totalCreditsGranted = 0;
    let totalCreditsConsumed = 0;
    let totalAiCalls = 0;
    let totalCostEuro = 0;

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 1000;

    usersSnap.forEach(d => {
      totalUsers++;
      const u = d.data();
      const lastAct = u.lastActivityAt ? new Date(u.lastActivityAt).getTime() : 0;
      if (lastAct > oneDayAgo) activeToday++;

      const createdAt = u.createdAt ? new Date(u.createdAt).getTime() : 0;
      if (createdAt > sevenDaysAgo) newUsersWeek++;

      totalAiCalls += (u.totalAiCalls || 0);
      totalCostEuro += (u.totalCostEuro || 0);
    });

    // Sessions count
    const sessions = await getAllSessions(200);
    const activeSessions = sessions.filter(s => s.status === "active").length;

    // Credit totals from transactions
    const txSnap = await getDocs(collection(serverDb, "credit_transactions"));
    txSnap.forEach(d => {
      const tx = d.data();
      if (tx.amount > 0) totalCreditsGranted += tx.amount;
      else if (tx.amount < 0) totalCreditsConsumed += Math.abs(tx.amount);
    });

    const stats: AdminOverviewStats = {
      totalUsers,
      activeToday,
      newUsersWeek,
      activeSessions,
      totalCreditsGranted,
      totalCreditsConsumed,
      totalAiCalls,
      totalCostEuro: Math.round(totalCostEuro * 100) / 100,
      systemErrorsCount: 0
    };

    return res.json({ success: true, stats });
  } catch (error: any) {
    console.error("[AdminAPI] Error loading overview stats:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 2. USERS LIST (Server-side search, filtering, pagination)
// ============================================================================
adminRouter.get("/users", async (req: AdminRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(5, parseInt(req.query.pageSize as string) || 15));
    const search = ((req.query.search as string) || "").trim().toLowerCase();
    const filter = (req.query.filter as string) || "all";

    // 1. Attempt to query Firebase Authentication directly via Admin SDK
    let authUsersList: Array<{
      uid: string;
      email?: string;
      displayName?: string;
      creationTime?: string;
      lastSignInTime?: string;
      disabled?: boolean;
    }> | null = null;

    try {
      const listRes = await adminAuth.listUsers(1000);
      if (listRes && Array.isArray(listRes.users)) {
        authUsersList = listRes.users.map((u: any) => ({
          uid: u.uid,
          email: u.email,
          displayName: u.displayName,
          creationTime: u.metadata?.creationTime,
          lastSignInTime: u.metadata?.lastSignInTime,
          disabled: u.disabled
        }));
      }
    } catch (_) {
      // Cloud Run runtime service account doesn't have IAM access to Identity Toolkit listUsers API
      authUsersList = null;
    }

    const allUsers: AdminUserItem[] = [];

    if (authUsersList && authUsersList.length > 0) {
      // Map strictly from Firebase Authentication users as single source of truth
      for (const aUser of authUsersList) {
        const userDocRef = doc(serverDb, "users", aUser.uid);
        const docSnap = await getDoc(userDocRef);
        const d = docSnap.exists() ? docSnap.data() : null;
        const dProfile = d?.profile;

        const email = (aUser.email || d?.email || dProfile?.email || "").toLowerCase();
        const hasProfile = Boolean(dProfile && (dProfile.fullName || dProfile.firstName || dProfile.lastName));
        const fullName = hasProfile
          ? (dProfile.fullName || `${dProfile.firstName || ''} ${dProfile.lastName || ''}`.trim())
          : (aUser.displayName || (email ? email.split("@")[0] : "") || "Profil non initialisé");

        const status: UserStatus = aUser.disabled ? "disabled" : (d?.status || "active");
        const role: UserRole = d?.role || "user";
        const accessTier: AccessTier = d?.accessTier || "beta";
        const creditMode: CreditMode = d?.creditMode || "limited";
        const creditLimit = typeof d?.creditLimit === "number" ? d.creditLimit : 0;
        const creditsBalance = typeof d?.creditsBalance === "number" ? d.creditsBalance : 0;

        const userItem: AdminUserItem = {
          uid: aUser.uid,
          email,
          fullName,
          firstName: d?.profile?.firstName,
          lastName: d?.profile?.lastName,
          title: d?.profile?.title || (hasProfile ? "Candidat" : "Compte créé (profil en attente)"),
          status,
          role,
          accessTier,
          creditMode,
          creditLimit,
          creditsBalance,
          totalAiCalls: d?.totalAiCalls || 0,
          totalTokensUsed: d?.totalTokensUsed || 0,
          totalCostEuro: d?.totalCostEuro || 0,
          createdAt: aUser.creationTime || d?.createdAt || d?.updatedAt || new Date().toISOString(),
          lastLoginAt: aUser.lastSignInTime || d?.lastLoginAt,
          lastActivityAt: d?.lastActivityAt || d?.updatedAt || aUser.lastSignInTime,
          lastSeenDevice: d?.lastSeenDevice
        };

        // Apply Search
        if (search) {
          const matchesName = fullName.toLowerCase().includes(search);
          const matchesEmail = email.toLowerCase().includes(search);
          if (!matchesName && !matchesEmail) continue;
        }

        // Apply Filter
        if (filter === "active" && status !== "active") continue;
        if (filter === "disabled" && status !== "disabled") continue;
        if (filter === "invited" && status !== "invited") continue;
        if (filter === "admins" && role !== "admin") continue;
        if (filter === "low_credits" && (creditsBalance > 50 || creditMode === "unlimited")) continue;
        if (filter === "exhausted_credits" && (creditsBalance > 0 || creditMode === "unlimited")) continue;

        allUsers.push(userItem);
      }
    } else {
      // When Identity Toolkit list API is restricted, load verified user accounts from Firestore
      const usersCol = collection(serverDb, "users");
      const snapshot = await getDocs(usersCol);

      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        const uid = docSnap.id;
        const email = (d.email || d.profile?.email || "").toLowerCase();

        // STRICT VALIDATION: Do not consider non-user documents or test artifacts as real users
        if (!email || !email.includes("@")) {
          return;
        }

        const hasProfile = Boolean(d.profile && (d.profile.fullName || d.profile.firstName || d.profile.lastName));
        const fullName = hasProfile
          ? (d.profile.fullName || `${d.profile.firstName || ''} ${d.profile.lastName || ''}`.trim())
          : (email ? email.split("@")[0] : "Profil non initialisé");

        const status: UserStatus = d.status || "active";
        const role: UserRole = d.role || "user";
        const accessTier: AccessTier = d.accessTier || "beta";
        const creditMode: CreditMode = d.creditMode || "limited";
        
        // Zero or actual recorded credits, NEVER an invented 500 default
        const creditLimit = typeof d.creditLimit === "number" ? d.creditLimit : 0;
        const creditsBalance = typeof d.creditsBalance === "number" ? d.creditsBalance : 0;

        const userItem: AdminUserItem = {
          uid,
          email,
          fullName,
          firstName: d.profile?.firstName,
          lastName: d.profile?.lastName,
          title: d.profile?.title || (hasProfile ? "Candidat" : "Profil non initialisé"),
          status,
          role,
          accessTier,
          creditMode,
          creditLimit,
          creditsBalance,
          totalAiCalls: d.totalAiCalls || 0,
          totalTokensUsed: d.totalTokensUsed || 0,
          totalCostEuro: d.totalCostEuro || 0,
          createdAt: d.createdAt || d.updatedAt || new Date().toISOString(),
          lastLoginAt: d.lastLoginAt,
          lastActivityAt: d.lastActivityAt || d.updatedAt,
          lastSeenDevice: d.lastSeenDevice
        };

        // Apply Search
        if (search) {
          const matchesName = fullName.toLowerCase().includes(search);
          const matchesEmail = email.toLowerCase().includes(search);
          if (!matchesName && !matchesEmail) return;
        }

        // Apply Filter
        if (filter === "active" && status !== "active") return;
        if (filter === "disabled" && status !== "disabled") return;
        if (filter === "invited" && status !== "invited") return;
        if (filter === "admins" && role !== "admin") return;
        if (filter === "low_credits" && (creditsBalance > 50 || creditMode === "unlimited")) return;
        if (filter === "exhausted_credits" && (creditsBalance > 0 || creditMode === "unlimited")) return;

        allUsers.push(userItem);
      });
    }

    // Sort by last activity / creation desc
    allUsers.sort((a, b) => {
      const timeA = new Date(a.lastActivityAt || a.createdAt).getTime();
      const timeB = new Date(b.lastActivityAt || b.createdAt).getTime();
      return timeB - timeA;
    });

    const total = allUsers.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const paginatedUsers = allUsers.slice(startIndex, startIndex + pageSize);

    const responseData: AdminUsersListResponse = {
      users: paginatedUsers,
      total,
      page,
      pageSize,
      totalPages
    };

    return res.json({ success: true, ...responseData });
  } catch (error: any) {
    console.error("[AdminAPI] Error fetching users:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 3. CREATE / INVITE USER (POST /api/admin/users)
// ============================================================================
adminRouter.post("/users", requireAdmin(["admin"]), async (req: AdminRequest, res: Response) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      role = "user", 
      accessTier = "beta", 
      creditMode = "limited", 
      initialCredits = 0,
      notes 
    } = req.body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ success: false, error: "Adresse email valide requise." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const newUid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const fullName = `${(firstName || '').trim()} ${(lastName || '').trim()}`.trim() || cleanEmail.split("@")[0];
    const now = new Date().toISOString();
    const grantAmount = Number(initialCredits) > 0 ? Number(initialCredits) : 0;

    const userDocRef = doc(serverDb, "users", newUid);
    const existingSnap = await getDoc(userDocRef);
    if (existingSnap.exists()) {
      return res.status(409).json({ success: false, error: "Cet utilisateur existe déjà." });
    }

    const userData = {
      userId: newUid,
      email: cleanEmail,
      status: "invited" as UserStatus,
      role: role as UserRole,
      accessTier: accessTier as AccessTier,
      creditMode: creditMode as CreditMode,
      creditLimit: grantAmount,
      creditsBalance: grantAmount,
      totalAiCalls: 0,
      totalTokensUsed: 0,
      totalCostEuro: 0,
      createdAt: now,
      updatedAt: now,
      notes: notes || "",
      profile: {
        id: "profile",
        fullName,
        firstName: firstName || "",
        lastName: lastName || "",
        email: cleanEmail,
        title: "Membre invité Bêta NACORA",
        city: "",
        country: "France",
        experiences: [],
        educations: [],
        hardSkills: [],
        contractTypes: ["Alternance", "CDI"]
      },
      opportunities: [],
      contacts: [],
      companies: [],
      chatSessions: []
    };

    await safeServerWrite(async () => {
      await setDoc(userDocRef, userData);
    });

    // Initial Ledger transaction only if credits were explicitly granted
    if (grantAmount > 0) {
      await addCreditTransaction({
        userId: newUid,
        type: "grant",
        amount: grantAmount,
        reason: "Dotation initiale d'invitation Bêta",
        createdBy: req.adminUser!.uid,
        adminEmail: req.adminUser!.email
      });
    }

    // If invited as admin/support/viewer, register in /admins/{uid}
    if (["admin", "support", "viewer"].includes(role)) {
      await safeServerWrite(async () => {
        await setDoc(doc(serverDb, "admins", newUid), {
          uid: newUid,
          email: cleanEmail,
          role,
          grantedBy: req.adminUser!.uid,
          createdAt: now,
          updatedAt: now
        });
      });
    }

    await recordAuditLog({
      adminUserId: req.adminUser!.uid,
      adminEmail: req.adminUser!.email || "admin",
      action: "user_created",
      targetUserId: newUid,
      targetUserEmail: cleanEmail,
      metadata: { role, accessTier, creditMode, initialCredits }
    });

    return res.status(201).json({
      success: true,
      message: `Utilisateur ${fullName} (${cleanEmail}) créé avec succès.`,
      user: {
        uid: newUid,
        email: cleanEmail,
        fullName,
        status: "invited",
        role,
        accessTier,
        creditsBalance: initialCredits
      }
    });
  } catch (err: any) {
    console.error("[AdminAPI] Error creating user:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 4. USER DETAIL (GET /api/admin/users/:uid)
// ============================================================================
adminRouter.get("/users/:uid", async (req: AdminRequest, res: Response) => {
  try {
    const { uid } = req.params;
    const userDocRef = doc(serverDb, "users", uid);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
      return res.status(404).json({ success: false, error: "Utilisateur introuvable." });
    }

    const userData = userSnap.data();
    const creditSummary = await getUserCreditSummary(uid);
    const sessions = await getUserSessions(uid);
    const recentTransactions = await getUserCreditTransactions(uid, 50);

    return res.json({
      success: true,
      user: {
        uid,
        ...userData,
        creditSummary,
        activeSessionsCount: sessions.filter(s => s.status === "active").length,
        recentSessions: sessions.slice(0, 10),
        recentTransactions
      }
    });
  } catch (error: any) {
    console.error("[AdminAPI] Error retrieving user details:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 5. UPDATE USER ACCESS & SETTINGS (PATCH /api/admin/users/:uid)
// ============================================================================
adminRouter.patch("/users/:uid", requireAdmin(["admin"]), async (req: AdminRequest, res: Response) => {
  try {
    const { uid } = req.params;
    const { role, accessTier, creditMode, creditLimit, status } = req.body;

    const userDocRef = doc(serverDb, "users", uid);
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) {
      return res.status(404).json({ success: false, error: "Utilisateur introuvable." });
    }

    const oldData = userSnap.data();
    const updates: Record<string, any> = { updatedAt: new Date().toISOString() };

    if (role && ["admin", "support", "viewer", "user"].includes(role)) {
      updates.role = role;

      // Safely assign Custom User Claims via Firebase Admin SDK
      try {
        await adminAuth.setCustomUserClaims(uid, {
          role,
          admin: role === "admin"
        });
      } catch (claimErr: any) {
        console.warn("[AdminAuth] setCustomUserClaims:", claimErr.message || claimErr);
      }

      // Sync with /admins collection
      if (["admin", "support", "viewer"].includes(role)) {
        await safeServerWrite(async () => {
          await setDoc(doc(serverDb, "admins", uid), {
            uid,
            email: oldData.email || "",
            role,
            grantedBy: req.adminUser!.uid,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        });
      }
    }
    if (accessTier && ["internal", "beta", "free", "pro", "enterprise"].includes(accessTier)) {
      updates.accessTier = accessTier;
    }
    if (creditMode && ["limited", "unlimited"].includes(creditMode)) {
      updates.creditMode = creditMode;
    }
    if (typeof creditLimit === "number" && creditLimit >= 0) {
      updates.creditLimit = creditLimit;
    }
    if (status && ["active", "disabled", "invited", "suspended"].includes(status)) {
      updates.status = status;
    }

    await safeServerWrite(async () => {
      await setDoc(userDocRef, updates, { merge: true });
    });

    await recordAuditLog({
      adminUserId: req.adminUser!.uid,
      adminEmail: req.adminUser!.email || "admin",
      action: "role_changed",
      targetUserId: uid,
      targetUserEmail: oldData.email,
      metadata: { previous: oldData.role, newUpdates: updates }
    });

    return res.json({ success: true, message: "Paramètres utilisateur mis à jour.", updates });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 6. DISABLE USER (POST /api/admin/users/:uid/disable)
// ============================================================================
adminRouter.post("/users/:uid/disable", requireAdmin(["admin"]), async (req: AdminRequest, res: Response) => {
  try {
    const { uid } = req.params;
    const userDocRef = doc(serverDb, "users", uid);
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) return res.status(404).json({ success: false, error: "Utilisateur introuvable." });

    const email = userSnap.data()?.email;
    await safeServerWrite(async () => {
      await setDoc(userDocRef, { status: "disabled", updatedAt: new Date().toISOString() }, { merge: true });
    });

    // Revoke active sessions immediately
    await revokeAllUserSessions({
      userId: uid,
      adminUserId: req.adminUser!.uid,
      adminEmail: req.adminUser!.email || "admin",
      targetUserEmail: email,
      reason: "Compte désactivé"
    });

    await recordAuditLog({
      adminUserId: req.adminUser!.uid,
      adminEmail: req.adminUser!.email || "admin",
      action: "user_disabled",
      targetUserId: uid,
      targetUserEmail: email
    });

    return res.json({ success: true, message: `Compte ${email || uid} désactivé avec succès.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 7. ENABLE USER (POST /api/admin/users/:uid/enable)
// ============================================================================
adminRouter.post("/users/:uid/enable", requireAdmin(["admin"]), async (req: AdminRequest, res: Response) => {
  try {
    const { uid } = req.params;
    const userDocRef = doc(serverDb, "users", uid);
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) return res.status(404).json({ success: false, error: "Utilisateur introuvable." });

    const email = userSnap.data()?.email;
    await safeServerWrite(async () => {
      await setDoc(userDocRef, { status: "active", updatedAt: new Date().toISOString() }, { merge: true });
    });

    await recordAuditLog({
      adminUserId: req.adminUser!.uid,
      adminEmail: req.adminUser!.email || "admin",
      action: "user_enabled",
      targetUserId: uid,
      targetUserEmail: email
    });

    return res.json({ success: true, message: `Compte ${email || uid} réactivé avec succès.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 8. ADD / ADJUST CREDITS (POST /api/admin/users/:uid/credits)
// ============================================================================
adminRouter.post("/users/:uid/credits", requireAdmin(["admin"]), async (req: AdminRequest, res: Response) => {
  try {
    const { uid } = req.params;
    const { amount, reason } = req.body;

    if (typeof amount !== "number" || amount === 0) {
      return res.status(400).json({ success: false, error: "Montant de crédit non nul requis." });
    }
    if (!reason || typeof reason !== "string") {
      return res.status(400).json({ success: false, error: "Motif d'attribution requis pour la traçabilité." });
    }

    const type = amount > 0 ? "grant" : "adjustment";
    const tx = await addCreditTransaction({
      userId: uid,
      type,
      amount,
      reason: reason.trim(),
      createdBy: req.adminUser!.uid,
      adminEmail: req.adminUser!.email
    });

    return res.json({
      success: true,
      message: `${amount > 0 ? '+' : ''}${amount} crédits appliqués avec succès.`,
      transaction: tx
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 9. GET USER CREDITS LEDGER (GET /api/admin/users/:uid/credits)
// ============================================================================
adminRouter.get("/users/:uid/credits", async (req: AdminRequest, res: Response) => {
  try {
    const { uid } = req.params;
    const summary = await getUserCreditSummary(uid);
    const transactions = await getUserCreditTransactions(uid, 200);

    return res.json({
      success: true,
      summary,
      transactions
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 10. GET USER AI USAGE (GET /api/admin/users/:uid/usage)
// ============================================================================
adminRouter.get("/users/:uid/usage", async (req: AdminRequest, res: Response) => {
  try {
    const { uid } = req.params;
    const userDocRef = doc(serverDb, "users", uid);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) return res.status(404).json({ success: false, error: "Utilisateur introuvable." });

    const u = snap.data();
    const aiUsageHistory = Array.isArray(u.aiUsageHistory) ? u.aiUsageHistory : [];

    return res.json({
      success: true,
      totalCalls: u.totalAiCalls || aiUsageHistory.length,
      totalTokens: u.totalTokensUsed || 0,
      totalCostEuro: u.totalCostEuro || 0,
      history: aiUsageHistory
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 11. USER SESSIONS & ALL SESSIONS (GET /api/admin/sessions & /users/:uid/sessions)
// ============================================================================
adminRouter.get("/sessions", async (req: AdminRequest, res: Response) => {
  try {
    const sessions = await getAllSessions(100);
    return res.json({ success: true, sessions });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.get("/users/:uid/sessions", async (req: AdminRequest, res: Response) => {
  try {
    const { uid } = req.params;
    const sessions = await getUserSessions(uid);
    return res.json({ success: true, sessions });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 12. REVOKE SESSIONS (POST /api/admin/users/:uid/revoke-sessions)
// ============================================================================
adminRouter.post("/users/:uid/revoke-sessions", requireAdmin(["admin"]), async (req: AdminRequest, res: Response) => {
  try {
    const { uid } = req.params;
    const { reason } = req.body;

    const userDocRef = doc(serverDb, "users", uid);
    const snap = await getDoc(userDocRef);
    const email = snap.exists() ? snap.data()?.email : undefined;

    const result = await revokeAllUserSessions({
      userId: uid,
      adminUserId: req.adminUser!.uid,
      adminEmail: req.adminUser!.email || "admin",
      targetUserEmail: email,
      reason: reason || "Révocation demandée depuis la console admin"
    });

    return res.json({
      success: true,
      message: `Sessions révoquées pour l'utilisateur ${email || uid}.`,
      result
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 13. ACTIVITY TIMELINE (GET /api/admin/activity)
// ============================================================================
adminRouter.get("/activity", async (req: AdminRequest, res: Response) => {
  try {
    const limitCount = parseInt(req.query.limit as string) || 100;
    const activities = await getSystemActivities(limitCount);
    return res.json({ success: true, activities });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 14. AUDIT LOG (GET /api/admin/audit)
// ============================================================================
adminRouter.get("/audit", async (req: AdminRequest, res: Response) => {
  try {
    const limitCount = parseInt(req.query.limit as string) || 100;
    const logs = await getAuditLogs(limitCount);
    return res.json({ success: true, logs });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 15. SYSTEM HEALTH DASHBOARD (GET /api/admin/system)
// ============================================================================
adminRouter.get("/system", async (req: AdminRequest, res: Response) => {
  try {
    const health = await checkSystemHealth();
    return res.json({ success: true, health });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 16. DATA HEALTH AUDIT (GET /api/admin/data-health)
// ============================================================================
adminRouter.get("/data-health", async (req: AdminRequest, res: Response) => {
  try {
    const report = await runDataHealthAudit();
    return res.json({ success: true, report });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
