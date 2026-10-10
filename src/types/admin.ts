export type UserStatus = 'active' | 'disabled' | 'invited' | 'suspended';
export type UserRole = 'admin' | 'support' | 'viewer' | 'user';
export type AccessTier = 'internal' | 'beta' | 'free' | 'pro' | 'enterprise';
export type CreditMode = 'limited' | 'unlimited';

export type CreditTransactionType = 'grant' | 'consume' | 'refund' | 'adjustment' | 'expiration';

export interface CreditTransaction {
  id: string;
  userId: string;
  type: CreditTransactionType;
  amount: number;
  balanceAfter: number;
  reason: string;
  feature?: string;
  model?: string;
  requestId?: string;
  createdAt: string;
  createdBy: string;
}

export interface UserSession {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  createdAt: string;
  lastSeenAt: string;
  revokedAt?: string | null;
  userAgent: string;
  device: string;
  browser: string;
  os: string;
  ip?: string;
  status: 'active' | 'revoked' | 'expired';
}

export type AdminAuditAction = 
  | 'user_created'
  | 'user_disabled'
  | 'user_enabled'
  | 'credits_granted'
  | 'credits_adjusted'
  | 'sessions_revoked'
  | 'role_changed'
  | 'data_accessed'
  | 'user_deleted';

export interface AdminAuditLog {
  id: string;
  adminUserId: string;
  adminEmail: string;
  action: AdminAuditAction;
  targetUserId?: string;
  targetUserEmail?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface SystemActivity {
  id: string;
  userId?: string;
  userName?: string;
  type: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface AdminUserItem {
  uid: string;
  email: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  status: UserStatus;
  role: UserRole;
  accessTier: AccessTier;
  creditMode: CreditMode;
  creditLimit: number;
  creditsBalance: number;
  totalAiCalls: number;
  totalTokensUsed: number;
  totalCostEuro: number;
  createdAt: string;
  lastLoginAt?: string;
  lastActivityAt?: string;
  lastSeenDevice?: string;
}

export interface AdminUsersListResponse {
  users: AdminUserItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ServiceHealthStatus {
  status: 'ok' | 'warning' | 'error';
  latencyMs?: number;
  message: string;
  details?: Record<string, any>;
}

export interface SystemHealthResponse {
  timestamp: string;
  services: {
    firebaseAuth: ServiceHealthStatus;
    firestore: ServiceHealthStatus;
    geminiApi: ServiceHealthStatus;
    serverApi: ServiceHealthStatus;
  };
}

export interface DataHealthIssue {
  id: string;
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  targetId?: string;
  metadata?: Record<string, any>;
}

export interface DataHealthReport {
  timestamp: string;
  orphanedAuthUsers: Array<{ uid: string; email: string; reason: string }>;
  orphanedProfiles: Array<{ id: string; email: string; reason: string }>;
  orphanedContacts: Array<{ id: string; name: string; company?: string }>;
  orphanedCompanies: Array<{ id: string; name: string }>;
  creditInconsistencies: Array<{ userId: string; email: string; recordedBalance: number; calculatedLedgerBalance: number; delta: number }>;
  orphanedTransactions: Array<{ id: string; userId: string; reason: string }>;
  orphanedSessions: Array<{ id: string; userId: string; reason: string }>;
  brokenReferences: Array<{ type: string; id: string; detail: string }>;
  summary: {
    totalIssues: number;
    severity: 'healthy' | 'minor_issues' | 'action_required';
  };
}

export interface AdminOverviewStats {
  totalUsers: number;
  activeToday: number;
  newUsersWeek: number;
  activeSessions: number;
  totalCreditsGranted: number;
  totalCreditsConsumed: number;
  totalAiCalls: number;
  totalCostEuro: number;
  systemErrorsCount: number;
}
