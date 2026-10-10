import { auth } from "../firebase.ts";
import { 
  AdminUserItem, 
  AdminUsersListResponse, 
  AdminOverviewStats, 
  SystemHealthResponse, 
  DataHealthReport, 
  AdminAuditLog, 
  SystemActivity, 
  UserSession, 
  CreditTransaction 
} from "../types/admin.ts";

async function getAuthHeader(): Promise<HeadersInit> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new Error("Authentification requise pour accéder à l'espace administrateur.");
  }
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
}

export const adminService = {
  // 1. Overview
  async getOverview(): Promise<AdminOverviewStats> {
    const headers = await getAuthHeader();
    const res = await fetch("/api/admin/overview", { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erreur lors de la récupération des métriques");
    return data.stats;
  },

  // 2. Users list with server pagination, search & filters
  async getUsers(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    filter?: string;
  }): Promise<AdminUsersListResponse> {
    const headers = await getAuthHeader();
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.pageSize) query.set("pageSize", String(params.pageSize));
    if (params.search) query.set("search", params.search);
    if (params.filter) query.set("filter", params.filter);

    const res = await fetch(`/api/admin/users?${query.toString()}`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erreur lors du chargement des utilisateurs");
    return data;
  },

  // 3. User detail
  async getUser(uid: string): Promise<any> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/admin/users/${uid}`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Utilisateur introuvable");
    return data.user;
  },

  // 4. Create / Invite user
  async createUser(payload: {
    firstName?: string;
    lastName?: string;
    email: string;
    role?: string;
    accessTier?: string;
    creditMode?: string;
    initialCredits?: number;
    notes?: string;
  }): Promise<any> {
    const headers = await getAuthHeader();
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Impossible de créer l'utilisateur");
    return data;
  },

  // 5. Update user settings
  async updateUser(uid: string, updates: Record<string, any>): Promise<any> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/admin/users/${uid}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Échec de mise à jour");
    return data;
  },

  // 6. Disable user
  async disableUser(uid: string): Promise<any> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/admin/users/${uid}/disable`, {
      method: "POST",
      headers
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Échec de désactivation");
    return data;
  },

  // 7. Enable user
  async enableUser(uid: string): Promise<any> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/admin/users/${uid}/enable`, {
      method: "POST",
      headers
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Échec de réactivation");
    return data;
  },

  // 8. Add or adjust credits
  async addCredits(uid: string, amount: number, reason: string): Promise<any> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/admin/users/${uid}/credits`, {
      method: "POST",
      headers,
      body: JSON.stringify({ amount, reason })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Échec de l'ajustement de crédits");
    return data;
  },

  async adjustCredits(uid: string, amount: number, reason: string): Promise<any> {
    return this.addCredits(uid, amount, reason);
  },

  // 9. Get user credits ledger
  async getUserCredits(uid: string): Promise<{ summary: any; transactions: CreditTransaction[] }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/admin/users/${uid}/credits`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Impossible de charger les transactions");
    return data;
  },

  // 10. Get user AI usage
  async getUserUsage(uid: string): Promise<any> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/admin/users/${uid}/usage`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Impossible de charger la consommation");
    return data;
  },

  // 11. Sessions
  async getAllSessions(): Promise<UserSession[]> {
    const headers = await getAuthHeader();
    const res = await fetch("/api/admin/sessions", { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Impossible de charger les sessions");
    return data.sessions;
  },

  async getUserSessions(uid: string): Promise<UserSession[]> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/admin/users/${uid}/sessions`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Impossible de charger les sessions");
    return data.sessions;
  },

  async revokeUserSessions(uid: string, reason?: string): Promise<any> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/admin/users/${uid}/revoke-sessions`, {
      method: "POST",
      headers,
      body: JSON.stringify({ reason })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Échec de la révocation");
    return data;
  },

  // 12. Activity timeline
  async getActivity(limit = 100): Promise<SystemActivity[]> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/admin/activity?limit=${limit}`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Impossible de charger l'activité");
    return data.activities;
  },

  // 13. Audit logs
  async getAuditLogs(limit = 100): Promise<AdminAuditLog[]> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/admin/audit?limit=${limit}`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Impossible de charger l'audit log");
    return data.logs;
  },

  // 14. System health
  async getSystemHealth(): Promise<SystemHealthResponse> {
    const headers = await getAuthHeader();
    const res = await fetch("/api/admin/system", { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Échec du diagnostic système");
    return data.health;
  },

  // 15. Data health audit
  async getDataHealth(): Promise<DataHealthReport> {
    const headers = await getAuthHeader();
    const res = await fetch("/api/admin/data-health", { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Échec de l'audit de cohérence");
    return data.report;
  },

  // 16. Track user session on login
  async recordClientSession(userId: string, userEmail?: string, userName?: string): Promise<void> {
    try {
      await fetch("/api/sessions/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, userEmail, userName })
      });
    } catch (_) {}
  }
};
