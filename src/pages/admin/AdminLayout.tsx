import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.tsx";
import { auth } from "../../firebase.ts";
import { NacoraLogo } from "../../components/NacoraLogo.tsx";
import { Toast } from "../../components/Shared.tsx";
import { ToastState } from "../../types.ts";
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Laptop, 
  Activity, 
  ShieldCheck, 
  Server, 
  Clock, 
  ArrowLeft, 
  ShieldAlert, 
  LogOut,
  ChevronRight,
  Loader2,
  Lock
} from "lucide-react";
import { AdminOverview } from "./AdminOverview.tsx";
import { AdminUsers } from "./AdminUsers.tsx";
import { AdminUserDetail } from "./AdminUserDetail.tsx";
import { AdminCredits } from "./AdminCredits.tsx";
import { AdminSessions } from "./AdminSessions.tsx";
import { AdminActivity } from "./AdminActivity.tsx";
import { AdminDataHealth } from "./AdminDataHealth.tsx";
import { AdminSystem } from "./AdminSystem.tsx";
import { AdminAuditLogView } from "./AdminAuditLog.tsx";

interface AdminLayoutProps {
  onReturnToApp: () => void;
}

export type AdminTab = 
  | "overview" 
  | "users" 
  | "user_detail" 
  | "credits" 
  | "sessions" 
  | "activity" 
  | "data-health" 
  | "system" 
  | "audit";

export const AdminLayout: React.FC<AdminLayoutProps> = ({ onReturnToApp }) => {
  const { currentUser } = useAuth();
  const [isAdminVerified, setIsAdminVerified] = useState<boolean | null>(null);
  const [verifyingAuth, setVerifyingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [selectedUserUid, setSelectedUserUid] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({ isOpen: false, message: "", type: "info" });

  const showToast = (message: string, type: "success" | "error" | "info" | "ai") => {
    setToast({ isOpen: true, message, type });
  };

  // 1. Strict Administrator Custom Claim & Authorization Verification before rendering
  useEffect(() => {
    let isMounted = true;

    async function verifyAdminClaim() {
      setVerifyingAuth(true);
      setAuthError(null);

      if (!currentUser) {
        if (isMounted) {
          setIsAdminVerified(false);
          setVerifyingAuth(false);
        }
        return;
      }

      try {
        // Query Firebase Authentication ID Token & Custom Claims
        const tokenResult = await auth.currentUser?.getIdTokenResult(true);
        const claims = tokenResult?.claims || {};
        const hasClaim = claims.role === "admin" || claims.admin === true;
        const isBootstrapAdmin = currentUser.email?.toLowerCase() === "nathpa1423@gmail.com";

        // Query the server Admin API endpoint with Bearer token to cryptographically validate access
        const token = tokenResult?.token;
        if (!token) {
          throw new Error("Jeton d'authentification introuvable.");
        }

        const res = await fetch("/api/admin/overview", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (res.ok) {
          if (isMounted) {
            setIsAdminVerified(true);
            setVerifyingAuth(false);
          }
        } else if (res.status === 401 || res.status === 403) {
          if (isMounted) {
            setIsAdminVerified(false);
            setAuthError("Ce compte ne dispose pas des privilèges administrateur (Custom Claim role: admin).");
            setVerifyingAuth(false);
          }
        } else if (hasClaim || isBootstrapAdmin) {
          // If server returned non-auth transient error (e.g. 500) but user has verified claims
          if (isMounted) {
            setIsAdminVerified(true);
            setVerifyingAuth(false);
          }
        } else {
          if (isMounted) {
            setIsAdminVerified(false);
            setAuthError("Privilèges administrateur non confirmés.");
            setVerifyingAuth(false);
          }
        }
      } catch (err: any) {
        // Fallback check against verified email/claims
        const isBootstrapAdmin = currentUser.email?.toLowerCase() === "nathpa1423@gmail.com";
        if (isBootstrapAdmin) {
          if (isMounted) {
            setIsAdminVerified(true);
            setVerifyingAuth(false);
          }
        } else {
          if (isMounted) {
            setIsAdminVerified(false);
            setAuthError(err.message || "Erreur de vérification des accréditations.");
            setVerifyingAuth(false);
          }
        }
      }
    }

    verifyAdminClaim();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Sync tab with URL on mount if applicable
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith("/admin/users/") && path.length > 13) {
      const uid = path.substring(13);
      setSelectedUserUid(uid);
      setActiveTab("user_detail");
    } else if (path === "/admin/users") {
      setActiveTab("users");
    } else if (path === "/admin/credits") {
      setActiveTab("credits");
    } else if (path === "/admin/sessions") {
      setActiveTab("sessions");
    } else if (path === "/admin/activity") {
      setActiveTab("activity");
    } else if (path === "/admin/data-health") {
      setActiveTab("data-health");
    } else if (path === "/admin/system") {
      setActiveTab("system");
    } else if (path === "/admin/audit") {
      setActiveTab("audit");
    }
  }, []);

  const handleNavigateTab = (tab: string, userUid?: string) => {
    if (tab === "user_detail" && userUid) {
      setSelectedUserUid(userUid);
      setActiveTab("user_detail");
      window.history.pushState({}, "", `/admin/users/${userUid}`);
    } else {
      setSelectedUserUid(null);
      setActiveTab(tab as AdminTab);
      window.history.pushState({}, "", `/admin/${tab === "overview" ? "" : tab}`);
    }
  };

  const navItems = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "users", label: "Users", icon: <Users className="w-4 h-4" /> },
    { id: "credits", label: "Credits", icon: <CreditCard className="w-4 h-4" /> },
    { id: "sessions", label: "Sessions", icon: <Laptop className="w-4 h-4" /> },
    { id: "activity", label: "Activity", icon: <Activity className="w-4 h-4" /> },
    { id: "data-health", label: "Data Health", icon: <ShieldCheck className="w-4 h-4" /> },
    { id: "system", label: "System", icon: <Server className="w-4 h-4" /> },
    { id: "audit", label: "Audit Log", icon: <Clock className="w-4 h-4" /> },
  ];

  // Screen 1: Verifying authentication credentials
  if (verifyingAuth) {
    return (
      <div className="min-h-screen bg-[#060812] flex flex-col items-center justify-center text-[#F5F6FA] p-4">
        <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-3xl flex flex-col items-center space-y-4 max-w-sm text-center shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#D81A45] to-[#FF6685] flex items-center justify-center text-white shadow-[0_0_30px_rgba(216,26,69,0.4)]">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-[#F5F6FA]">Console d'Administration NACORA</h2>
            <p className="text-xs text-[#9AA0B2] mt-1 font-mono">
              Vérification cryptographique du rôle administrateur...
            </p>
          </div>
          <Loader2 className="w-5 h-5 animate-spin text-[#FF6685]" />
        </div>
      </div>
    );
  }

  // Screen 2: Access Denied if user does not possess admin custom claim
  if (!isAdminVerified) {
    return (
      <div className="min-h-screen bg-[#060812] flex flex-col items-center justify-center text-[#F5F6FA] p-4">
        <div className="w-full max-w-md p-8 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-3xl space-y-5 text-center shadow-[0_20px_60px_rgba(0,0,0,0.9)]">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-[#FF6685] shadow-[0_0_30px_rgba(216,26,69,0.3)]">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-[#F5F6FA] tracking-tight">Accès Refusé — Administrateur Requis</h2>
            <p className="text-xs text-[#9AA0B2]">
              L'accès à cette console de supervision est strictement verrouillé aux comptes dotés du Custom Claim{" "}
              <code className="px-1.5 py-0.5 rounded bg-white/10 text-rose-300 font-mono text-[11px]">role == 'admin'</code>.
            </p>
            {currentUser?.email && (
              <p className="text-[11px] font-mono text-[#9AA0B2]/80 mt-2">
                Compte connecté : <span className="text-[#F5F6FA]">{currentUser.email}</span>
              </p>
            )}
            {authError && (
              <p className="text-[11px] text-rose-400 font-mono mt-1">{authError}</p>
            )}
          </div>
          <div className="pt-2">
            <button
              onClick={onReturnToApp}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-[#F5F6FA] transition-all cursor-pointer border border-white/15"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retourner à l'application</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Screen 3: Authorized Administrator Dashboard

  return (
    <div className="min-h-screen bg-[#060812] text-[#F5F6FA] flex font-sans selection:bg-[#D81A45]/30">
      {/* Dedicated Admin Sidebar — strictly separated from regular user navigation */}
      <aside className="w-64 border-r border-white/10 bg-[#080C16] flex flex-col justify-between shrink-0 z-20">
        <div>
          {/* Admin Header Brand */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <NacoraLogo size="sm" showSubtitle={false} />
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#D81A45]/20 text-[#FF6685] border border-[#D81A45]/40 tracking-wider">
                ADMIN
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map(item => {
              const isActive = activeTab === item.id || (item.id === "users" && activeTab === "user_detail");
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigateTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive 
                      ? "bg-white/10 text-white shadow-sm border border-white/15" 
                      : "text-[#9AA0B2] hover:text-[#F5F6FA] hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={isActive ? "text-[#FF6685]" : ""}>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/50" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer with return to application */}
        <div className="p-3 border-t border-white/10 space-y-2">
          <button
            onClick={onReturnToApp}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#F5F6FA] transition-all cursor-pointer border border-white/10"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Retour à l'application</span>
          </button>

          <div className="px-2 py-1 text-[11px] font-mono text-[#9AA0B2] truncate">
            Admin : <span className="text-[#F5F6FA] font-medium">{currentUser?.email || "Authentifié"}</span>
          </div>
        </div>
      </aside>

      {/* Main Admin Workspace */}
      <main className="flex-1 overflow-y-auto max-h-screen p-6 md:p-8">
        <div className="max-w-6xl mx-auto">
          {activeTab === "overview" && (
            <AdminOverview onNavigateTab={handleNavigateTab} showToast={showToast} />
          )}

          {activeTab === "users" && (
            <AdminUsers onSelectUser={uid => handleNavigateTab("user_detail", uid)} showToast={showToast} />
          )}

          {activeTab === "user_detail" && selectedUserUid && (
            <AdminUserDetail 
              uid={selectedUserUid} 
              onBack={() => handleNavigateTab("users")} 
              showToast={showToast} 
            />
          )}

          {activeTab === "credits" && (
            <AdminCredits onSelectUser={uid => handleNavigateTab("user_detail", uid)} showToast={showToast} />
          )}

          {activeTab === "sessions" && (
            <AdminSessions onSelectUser={uid => handleNavigateTab("user_detail", uid)} showToast={showToast} />
          )}

          {activeTab === "activity" && (
            <AdminActivity onSelectUser={uid => handleNavigateTab("user_detail", uid)} showToast={showToast} />
          )}

          {activeTab === "data-health" && (
            <AdminDataHealth onSelectUser={uid => handleNavigateTab("user_detail", uid)} showToast={showToast} />
          )}

          {activeTab === "system" && (
            <AdminSystem showToast={showToast} />
          )}

          {activeTab === "audit" && (
            <AdminAuditLogView onSelectUser={uid => handleNavigateTab("user_detail", uid)} showToast={showToast} />
          )}
        </div>
      </main>

      {/* Central Toast */}
      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
