import React, { useState, useEffect } from "react";
import { adminService } from "../../services/adminService.ts";
import { AdminOverviewStats, SystemHealthResponse } from "../../types/admin.ts";
import { 
  Users, 
  Activity, 
  CreditCard, 
  Cpu, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  Server, 
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  XCircle,
  HelpCircle
} from "lucide-react";

interface AdminOverviewProps {
  onNavigateTab: (tab: string, userUid?: string) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({ onNavigateTab, showToast }) => {
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [overviewData, healthData] = await Promise.all([
        adminService.getOverview(),
        adminService.getSystemHealth()
      ]);
      setStats(overviewData);
      setHealth(healthData);
      if (isRefresh) showToast("Données d'administration actualisées.", "info");
    } catch (err: any) {
      showToast(err.message || "Impossible de charger les données du dashboard", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#9AA0B2] space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-[#FF6685]" />
        <span className="text-xs font-mono">Chargement des métriques administrateur...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#F5F6FA] tracking-tight">Console de Supervision</h1>
          <p className="text-xs text-[#9AA0B2] mt-0.5 font-mono">
            Environnement de lancement Bêta & pilotage des comptes
          </p>
        </div>
        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-[#F5F6FA] transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Primary KPI Grid (Dense, functional, no fluff) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div 
          onClick={() => onNavigateTab("users")}
          className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[#9AA0B2] mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Utilisateurs</span>
            <Users className="w-4 h-4 text-[#FF6685] group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-[#F5F6FA]">{stats?.totalUsers || 0}</div>
          <div className="text-[11px] text-[#9AA0B2] mt-1 flex items-center gap-1">
            <span className="text-emerald-400 font-semibold">{stats?.activeToday || 0}</span> actifs auj.
            <span className="text-white/20">•</span>
            <span className="text-sky-400">+{stats?.newUsersWeek || 0}</span> cette semaine
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab("sessions")}
          className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[#9AA0B2] mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Sessions Actives</span>
            <Activity className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-[#F5F6FA]">{stats?.activeSessions || 0}</div>
          <div className="text-[11px] text-emerald-400/90 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Connexions en temps réel
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab("credits")}
          className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[#9AA0B2] mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Crédits Consommés</span>
            <CreditCard className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-[#F5F6FA]">{stats?.totalCreditsConsumed || 0}</div>
          <div className="text-[11px] text-[#9AA0B2] mt-1">
            sur <span className="text-[#F5F6FA] font-medium">{stats?.totalCreditsGranted || 0}</span> attribués
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab("system")}
          className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[#9AA0B2] mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Appels IA & Coût</span>
            <Cpu className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-[#F5F6FA]">{stats?.totalAiCalls || 0}</div>
          <div className="text-[11px] text-[#9AA0B2] mt-1 font-mono">
            Coût estimé : <span className="text-emerald-400 font-semibold">{stats?.totalCostEuro || 0} €</span>
          </div>
        </div>
      </div>

      {/* Real-time System Health Strip */}
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#F5F6FA]">
              État Réel des Composants Système
            </span>
          </div>
          <button
            onClick={() => onNavigateTab("system")}
            className="text-xs text-[#FF6685] hover:underline flex items-center gap-1 font-medium"
          >
            <span>Détails & latences</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 text-xs">
          {health?.services ? (
            <>
              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <span className="text-[#9AA0B2]">Firebase Auth</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                  health.services.firebaseAuth.status === "ok" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                }`}>
                  {health.services.firebaseAuth.status === "ok" ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  {health.services.firebaseAuth.status.toUpperCase()}
                  {health.services.firebaseAuth.latencyMs && ` (${health.services.firebaseAuth.latencyMs}ms)`}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <span className="text-[#9AA0B2]">Cloud Firestore</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                  health.services.firestore.status === "ok" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                }`}>
                  {health.services.firestore.status === "ok" ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  {health.services.firestore.status.toUpperCase()}
                  {health.services.firestore.latencyMs && ` (${health.services.firestore.latencyMs}ms)`}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <span className="text-[#9AA0B2]">API Gemini (IA)</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                  health.services.geminiApi.status === "ok" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                }`}>
                  {health.services.geminiApi.status === "ok" ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  {health.services.geminiApi.status.toUpperCase()}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <span className="text-[#9AA0B2]">Serveur API Express</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                  health.services.serverApi.status === "ok" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                }`}>
                  {health.services.serverApi.status === "ok" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {health.services.serverApi.status.toUpperCase()}
                </span>
              </div>
            </>
          ) : (
            <div className="col-span-4 text-[#9AA0B2] text-xs">Vérification de l'état système en cours...</div>
          )}
        </div>
      </div>

      {/* Action shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div 
          onClick={() => onNavigateTab("users")}
          className="p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2 text-[#F5F6FA] font-semibold text-sm mb-1">
            <Users className="w-4 h-4 text-[#FF6685]" />
            <span>Gestion des Utilisateurs</span>
          </div>
          <p className="text-xs text-[#9AA0B2]">
            Inviter un profil, configurer les crédits de départ, suspendre ou révoquer les sessions.
          </p>
        </div>

        <div 
          onClick={() => onNavigateTab("data-health")}
          className="p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2 text-[#F5F6FA] font-semibold text-sm mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Diagnostic de Cohérence</span>
          </div>
          <p className="text-xs text-[#9AA0B2]">
            Contrôler les comptes orphelins, les discordances de solde et l'intégrité de la base.
          </p>
        </div>

        <div 
          onClick={() => onNavigateTab("audit")}
          className="p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2 text-[#F5F6FA] font-semibold text-sm mb-1">
            <Clock className="w-4 h-4 text-sky-400" />
            <span>Journal d'Audit Immuable</span>
          </div>
          <p className="text-xs text-[#9AA0B2]">
            Historique complet des actions administratives, attributions de crédits et révocations.
          </p>
        </div>
      </div>
    </div>
  );
};
