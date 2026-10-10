import React, { useState, useEffect } from "react";
import { adminService } from "../../services/adminService.ts";
import { 
  CreditTransaction, 
  UserSession, 
  UserStatus, 
  UserRole, 
  AccessTier, 
  CreditMode 
} from "../../types/admin.ts";
import { 
  ArrowLeft, 
  RefreshCw, 
  User, 
  CreditCard, 
  Activity, 
  Laptop, 
  Clock, 
  Database, 
  CheckCircle, 
  Ban, 
  PlusCircle, 
  MinusCircle, 
  Shield, 
  AlertTriangle,
  Lock,
  Calendar,
  Briefcase,
  FileText
} from "lucide-react";

interface AdminUserDetailProps {
  uid: string;
  onBack: () => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export const AdminUserDetail: React.FC<AdminUserDetailProps> = ({ uid, onBack, showToast }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "profile" | "credits" | "usage" | "sessions" | "activity" | "data">("overview");

  // Credit Modal state
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState(100);
  const [creditReason, setCreditReason] = useState("");
  const [submittingCredit, setSubmittingCredit] = useState(false);

  // Settings Edit state
  const [editingRole, setEditingRole] = useState<UserRole>("user");
  const [editingTier, setEditingTier] = useState<AccessTier>("beta");
  const [editingCreditMode, setEditingCreditMode] = useState<CreditMode>("limited");
  const [savingSettings, setSavingSettings] = useState(false);

  const loadUserDetails = async () => {
    setLoading(true);
    try {
      const u = await adminService.getUser(uid);
      setUser(u);
      setEditingRole(u.role || "user");
      setEditingTier(u.accessTier || "beta");
      setEditingCreditMode(u.creditMode || "limited");
    } catch (err: any) {
      showToast(err.message || "Erreur de chargement des détails utilisateur", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserDetails();
  }, [uid]);

  const handleToggleStatus = async () => {
    if (!user) return;
    try {
      if (user.status === "disabled") {
        await adminService.enableUser(uid);
        showToast("Compte utilisateur réactivé.", "success");
      } else {
        await adminService.disableUser(uid);
        showToast("Compte utilisateur désactivé et sessions révoquées.", "info");
      }
      loadUserDetails();
    } catch (err: any) {
      showToast(err.message || "Erreur lors du changement de statut", "error");
    }
  };

  const handleRevokeSessions = async () => {
    if (!confirm("Voulez-vous vraiment révoquer toutes les sessions actives de cet utilisateur ?")) return;
    try {
      await adminService.revokeUserSessions(uid, "Révocation explicite depuis User Detail");
      showToast("Toutes les sessions de l'utilisateur ont été révoquées.", "success");
      loadUserDetails();
    } catch (err: any) {
      showToast(err.message || "Erreur lors de la révocation des sessions", "error");
    }
  };

  const handleAddCreditsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditReason.trim()) {
      showToast("Le motif de l'ajustement est obligatoire pour le ledger d'audit.", "error");
      return;
    }
    setSubmittingCredit(true);
    try {
      await adminService.addCredits(uid, creditAmount, creditReason.trim());
      showToast(`${creditAmount > 0 ? '+' : ''}${creditAmount} crédits enregistrés dans le ledger.`, "success");
      setIsCreditModalOpen(false);
      setCreditReason("");
      loadUserDetails();
    } catch (err: any) {
      showToast(err.message || "Erreur lors de l'enregistrement de la transaction", "error");
    } finally {
      setSubmittingCredit(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await adminService.updateUser(uid, {
        role: editingRole,
        accessTier: editingTier,
        creditMode: editingCreditMode
      });
      showToast("Privilèges et paramètres d'accès mis à jour avec succès.", "success");
      loadUserDetails();
    } catch (err: any) {
      showToast(err.message || "Erreur lors de la mise à jour des paramètres", "error");
    } finally {
      setSavingSettings(false);
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    try {
      return new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(iso));
    } catch {
      return "—";
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#9AA0B2] space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-[#FF6685]" />
        <span className="text-xs font-mono">Chargement du dossier utilisateur {uid}...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-sm text-rose-400">Utilisateur introuvable ou document inexistant.</p>
        <button onClick={onBack} className="text-xs text-[#FF6685] underline">Retour à la liste</button>
      </div>
    );
  }

  const profile = user.profile || {};
  const creditSummary = user.creditSummary || {};
  const recentTransactions: CreditTransaction[] = user.recentTransactions || [];
  const recentSessions: UserSession[] = user.recentSessions || [];

  return (
    <div className="space-y-5">
      {/* Top navigation back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-[#9AA0B2] hover:text-[#F5F6FA] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à l'annuaire utilisateurs</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={loadUserDetails}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#9AA0B2] hover:text-[#F5F6FA] text-xs cursor-pointer"
            title="Rafraîchir"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setCreditAmount(100);
              setIsCreditModalOpen(true);
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 text-xs font-semibold cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Ajouter des crédits</span>
          </button>

          <button
            onClick={handleToggleStatus}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              user.status === "disabled"
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25"
                : "bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25"
            }`}
          >
            {user.status === "disabled" ? <CheckCircle className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
            <span>{user.status === "disabled" ? "Réactiver le compte" : "Désactiver le compte"}</span>
          </button>
        </div>
      </div>

      {/* User Header Card */}
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[rgba(216,26,69,0.15)] border border-[rgba(216,26,69,0.3)] text-[#FF6685] font-black text-lg flex items-center justify-center shadow-[0_0_15px_rgba(216,26,69,0.2)]">
            {(profile.fullName || user.email || "U")[0].toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#F5F6FA]">{profile.fullName || "Utilisateur"}</h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                user.status === "active" ? "bg-emerald-500/10 text-emerald-400" :
                user.status === "disabled" ? "bg-rose-500/10 text-rose-400" : "bg-sky-500/10 text-sky-400"
              }`}>
                {user.status}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/15 text-purple-300">
                {user.role}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-[#9AA0B2]">
                Tier: {user.accessTier}
              </span>
            </div>
            <div className="text-xs text-[#9AA0B2] font-mono mt-0.5">
              {user.email} • UID: <span className="text-[#F5F6FA] select-all">{uid}</span>
            </div>
          </div>
        </div>

        {/* Quick balance badge */}
        <div className="flex items-center gap-4 bg-white/[0.02] p-2.5 rounded-lg border border-white/5 font-mono text-xs">
          <div>
            <div className="text-[10px] text-[#9AA0B2] uppercase">Solde Ledger</div>
            <div className={`text-base font-bold ${
              user.creditMode === "unlimited" ? "text-emerald-400" :
              typeof creditSummary.recordedBalance !== "number" ? "text-[#9AA0B2]" :
              creditSummary.recordedBalance === 0 ? "text-[#9AA0B2]" :
              creditSummary.recordedBalance < 0 ? "text-rose-400" : "text-[#F5F6FA]"
            }`}>
              {user.creditMode === "unlimited" 
                ? "Illimité" 
                : typeof creditSummary.recordedBalance !== "number"
                  ? "Non initialisé"
                  : `${creditSummary.recordedBalance} pts`}
            </div>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div>
            <div className="text-[10px] text-[#9AA0B2] uppercase">Consommation IA</div>
            <div className="text-sm font-semibold text-emerald-400">
              {user.totalCostEuro ? user.totalCostEuro.toFixed(3) : 0} €
            </div>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-1 border-b border-white/10 overflow-x-auto scrollbar-none text-xs">
        {[
          { id: "overview", label: "Overview", icon: <User className="w-3.5 h-3.5" /> },
          { id: "profile", label: "Profil Candidat", icon: <FileText className="w-3.5 h-3.5" /> },
          { id: "credits", label: `Crédits & Ledger (${recentTransactions.length})`, icon: <CreditCard className="w-3.5 h-3.5" /> },
          { id: "usage", label: "Consommation IA", icon: <Activity className="w-3.5 h-3.5" /> },
          { id: "sessions", label: `Sessions (${recentSessions.length})`, icon: <Laptop className="w-3.5 h-3.5" /> },
          { id: "data", label: "Données Métier", icon: <Database className="w-3.5 h-3.5" /> }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-1.5 px-3.5 py-2 font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === t.id
                ? "border-[#FF6685] text-[#F5F6FA]"
                : "border-transparent text-[#9AA0B2] hover:text-[#F5F6FA]"
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F6FA] mb-2">
              Informations du Compte
            </h3>
            <div className="grid grid-cols-2 gap-y-2.5 text-[#9AA0B2]">
              <div>Nom complet</div>
              <div className="text-[#F5F6FA] font-medium">{profile.fullName || "—"}</div>
              <div>Email</div>
              <div className="text-[#F5F6FA] font-mono">{user.email}</div>
              <div>Statut du compte</div>
              <div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  user.status === "active" ? "bg-emerald-500/10 text-emerald-400" :
                  user.status === "disabled" ? "bg-rose-500/10 text-rose-400" : "bg-sky-500/10 text-sky-400"
                }`}>
                  {user.status}
                </span>
              </div>
              <div>Rôle actuel</div>
              <div className="text-[#F5F6FA] font-semibold">{user.role}</div>
              <div>Access Tier</div>
              <div className="text-[#F5F6FA] font-mono uppercase">{user.accessTier}</div>
              <div>Mode de crédit</div>
              <div className="text-[#F5F6FA]">{user.creditMode}</div>
              <div>Créé le</div>
              <div className="text-[#F5F6FA] font-mono">{formatDate(user.createdAt)}</div>
              <div>Dernière connexion</div>
              <div className="text-[#F5F6FA] font-mono">{formatDate(user.lastLoginAt)}</div>
              <div>Dernière activité</div>
              <div className="text-[#F5F6FA] font-mono">{formatDate(user.lastActivityAt)}</div>
              <div>Appareil / Navigateur</div>
              <div className="text-[#F5F6FA]">{user.lastSeenDevice || "—"}</div>
            </div>
          </div>

          {/* Quick permissions editor */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F6FA] mb-2 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#FF6685]" />
              <span>Gérer les Privilèges & Accès</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[#9AA0B2] mb-1">Rôle applicatif</label>
                <select
                  value={editingRole}
                  onChange={e => setEditingRole(e.target.value as UserRole)}
                  className="w-full bg-[#0B0F19] border border-white/10 rounded-lg px-2.5 py-1.5 text-[#F5F6FA]"
                >
                  <option value="user">Utilisateur standard</option>
                  <option value="viewer">Viewer (Consultation admin)</option>
                  <option value="support">Support (Assistance admin)</option>
                  <option value="admin">Administrateur complet</option>
                </select>
              </div>

              <div>
                <label className="block text-[#9AA0B2] mb-1">Tier d'accès</label>
                <select
                  value={editingTier}
                  onChange={e => setEditingTier(e.target.value as AccessTier)}
                  className="w-full bg-[#0B0F19] border border-white/10 rounded-lg px-2.5 py-1.5 text-[#F5F6FA]"
                >
                  <option value="beta">Beta (Lancement)</option>
                  <option value="internal">Internal (Équipe NACORA)</option>
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div>
                <label className="block text-[#9AA0B2] mb-1">Politique de Crédits</label>
                <select
                  value={editingCreditMode}
                  onChange={e => setEditingCreditMode(e.target.value as CreditMode)}
                  className="w-full bg-[#0B0F19] border border-white/10 rounded-lg px-2.5 py-1.5 text-[#F5F6FA]"
                >
                  <option value="limited">Limited (Plafond de crédits strict)</option>
                  <option value="unlimited">Unlimited (Pas de blocage, suivi réel)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  onClick={handleRevokeSessions}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/10 text-rose-400 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Révoquer toutes les sessions
                </button>

                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="px-4 py-1.5 rounded-lg bg-[#D81A45] hover:bg-[#D81A45]/90 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingSettings ? "Enregistrement..." : "Appliquer les modifications"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Profile */}
      {activeTab === "profile" && (
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-4 text-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
              <span className="text-[#9AA0B2] block text-[10px]">Titre visé</span>
              <span className="text-[#F5F6FA] font-medium">{profile.title || "—"}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
              <span className="text-[#9AA0B2] block text-[10px]">Ville / Mobilité</span>
              <span className="text-[#F5F6FA] font-medium">{profile.city || profile.mobility || "—"}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
              <span className="text-[#9AA0B2] block text-[10px]">Contrat recherché</span>
              <span className="text-[#F5F6FA] font-medium">{(profile.contractTypes || []).join(", ") || "—"}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
              <span className="text-[#9AA0B2] block text-[10px]">Complétion Profil</span>
              <span className="text-emerald-400 font-bold">{profile.profileCompletionScore || 0}%</span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#9AA0B2]">Compétences clés</h4>
            <div className="flex flex-wrap gap-1.5">
              {(profile.skills || profile.hardSkills || []).map((s: any, idx: number) => (
                <span key={idx} className="px-2 py-0.5 rounded bg-white/5 text-[#F5F6FA] text-[11px]">
                  {typeof s === "string" ? s : s.name}
                </span>
              ))}
              {(!profile.skills || profile.skills.length === 0) && (!profile.hardSkills || profile.hardSkills.length === 0) && (
                <span className="text-[#9AA0B2]">Aucune compétence renseignée</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#9AA0B2]">Expériences ({profile.experiences?.length || 0})</h4>
            <div className="space-y-1.5">
              {(profile.experiences || []).map((exp: any, i: number) => (
                <div key={i} className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className="font-semibold text-[#F5F6FA]">{exp.title} • {exp.company}</div>
                  <div className="text-[#9AA0B2] text-[11px]">{exp.period || exp.dates}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Credits & Ledger */}
      {activeTab === "credits" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-[#9AA0B2]">
              L'historique des crédits est immuable et permet d'expliquer l'intégralité du solde.
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setCreditAmount(-50);
                  setIsCreditModalOpen(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/10 text-rose-400 text-xs font-semibold cursor-pointer border border-white/10"
              >
                <MinusCircle className="w-3.5 h-3.5" />
                <span>Retirer des crédits</span>
              </button>
              <button
                onClick={() => {
                  setCreditAmount(500);
                  setIsCreditModalOpen(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold cursor-pointer border border-emerald-500/20"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+500 crédits</span>
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.03] border-b border-white/10 text-[11px] font-semibold text-[#9AA0B2] uppercase">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Montant</th>
                  <th className="py-2.5 px-3">Solde après</th>
                  <th className="py-2.5 px-3">Motif / Déclencheur</th>
                  <th className="py-2.5 px-3">Opérateur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#9AA0B2] font-sans">
                      Aucun mouvement (aucune transaction enregistrée dans le ledger pour cet utilisateur).
                    </td>
                  </tr>
                ) : (
                  recentTransactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-white/[0.02]">
                      <td className="py-2 px-3 text-[#9AA0B2] text-[11px]">
                        {formatDate(tx.createdAt)}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                          tx.type === "grant" ? "bg-emerald-500/10 text-emerald-400" :
                          tx.type === "consume" ? "bg-purple-500/10 text-purple-400" :
                          tx.type === "refund" ? "bg-sky-500/10 text-sky-400" :
                          "bg-amber-500/10 text-amber-400"
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-bold">
                        <span className={tx.amount > 0 ? "text-emerald-400" : "text-rose-400"}>
                          {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[#F5F6FA]">
                        {tx.balanceAfter} pts
                      </td>
                      <td className="py-2 px-3 text-[#9AA0B2] font-sans">
                        {tx.reason}
                        {tx.feature && <span className="ml-1 text-[10px] text-purple-300">({tx.feature})</span>}
                      </td>
                      <td className="py-2 px-3 text-[#9AA0B2] text-[10px]">
                        {tx.createdBy}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: AI Usage */}
      {activeTab === "usage" && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10">
              <span className="text-[#9AA0B2] text-[10px] uppercase font-mono">Appels API Totaux</span>
              <div className="text-xl font-bold text-[#F5F6FA]">{user.totalAiCalls || 0}</div>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10">
              <span className="text-[#9AA0B2] text-[10px] uppercase font-mono">Tokens Traités</span>
              <div className="text-xl font-bold text-[#F5F6FA] font-mono">{user.totalTokensUsed || 0}</div>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10">
              <span className="text-[#9AA0B2] text-[10px] uppercase font-mono">Coût Estimé</span>
              <div className="text-xl font-bold text-emerald-400 font-mono">
                {user.totalCostEuro ? user.totalCostEuro.toFixed(4) : 0} €
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 text-xs space-y-2">
            <h4 className="font-bold text-[#F5F6FA]">Journal des opérations IA récentes</h4>
            <div className="space-y-1 font-mono text-[11px]">
              {(user.aiUsageHistory || []).slice(0, 15).map((log: any, i: number) => (
                <div key={i} className="p-2 rounded bg-white/[0.02] flex items-center justify-between text-[#9AA0B2]">
                  <div>
                    <span className="text-[#F5F6FA] font-semibold">{log.feature}</span>
                    <span className="text-white/30 mx-1.5">•</span>
                    <span>{log.model}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>{log.totalTokens || 0} tokens</span>
                    <span className="text-emerald-400 font-bold">{log.costEstimatedEuro ? log.costEstimatedEuro.toFixed(4) : "0.0000"} €</span>
                    <span className="text-white/40">{formatDate(log.timestamp)}</span>
                  </div>
                </div>
              ))}
              {(!user.aiUsageHistory || user.aiUsageHistory.length === 0) && (
                <div className="text-[#9AA0B2] py-4 text-center">Aucun appel IA enregistré sur ce compte.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Sessions */}
      {activeTab === "sessions" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#9AA0B2]">
              Sessions actives et révoquées enregistrées côté serveur.
            </span>
            <button
              onClick={handleRevokeSessions}
              className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold cursor-pointer"
            >
              Révoquer toutes les sessions de ce compte
            </button>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.03] border-b border-white/10 text-[11px] font-semibold text-[#9AA0B2] uppercase">
                <tr>
                  <th className="py-2.5 px-3">Statut</th>
                  <th className="py-2.5 px-3">Appareil</th>
                  <th className="py-2.5 px-3">Navigateur & OS</th>
                  <th className="py-2.5 px-3">Date création</th>
                  <th className="py-2.5 px-3">Dernière activité</th>
                  <th className="py-2.5 px-3">IP (Masquée)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {recentSessions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#9AA0B2]">
                      Aucune session applicative enregistrée.
                    </td>
                  </tr>
                ) : (
                  recentSessions.map(s => (
                    <tr key={s.id} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          s.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                        }`}>
                          <span className={`w-1 h-1 rounded-full ${s.status === "active" ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
                          {s.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#F5F6FA] font-medium">{s.device}</td>
                      <td className="py-2.5 px-3 text-[#9AA0B2]">{s.browser} ({s.os})</td>
                      <td className="py-2.5 px-3 text-[#9AA0B2] font-mono text-[11px]">{formatDate(s.createdAt)}</td>
                      <td className="py-2.5 px-3 text-[#9AA0B2] font-mono text-[11px]">{formatDate(s.lastSeenAt)}</td>
                      <td className="py-2.5 px-3 text-[#9AA0B2] font-mono text-[11px]">{s.ip || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 6: Data métier */}
      {activeTab === "data" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-1">
            <span className="text-[#9AA0B2] text-[10px] uppercase">Opportunités / Candidatures</span>
            <div className="text-xl font-bold text-[#F5F6FA]">{user.opportunities?.length || 0}</div>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-1">
            <span className="text-[#9AA0B2] text-[10px] uppercase">Contacts Réseau</span>
            <div className="text-xl font-bold text-[#F5F6FA]">{user.contacts?.length || 0}</div>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-1">
            <span className="text-[#9AA0B2] text-[10px] uppercase">Entreprises Cibles</span>
            <div className="text-xl font-bold text-[#F5F6FA]">{user.companies?.length || 0}</div>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-1">
            <span className="text-[#9AA0B2] text-[10px] uppercase">Documents & CVs</span>
            <div className="text-xl font-bold text-[#F5F6FA]">{user.documents?.length || 0}</div>
          </div>
        </div>
      )}

      {/* Modal Ajouter / Ajuster Crédits */}
      {isCreditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#0B0F19] border border-white/15 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-[#F5F6FA]">Ajuster les crédits de {profile.fullName || user.email}</h3>
              <button onClick={() => setIsCreditModalOpen(false)} className="text-[#9AA0B2] hover:text-[#F5F6FA] text-xs cursor-pointer">
                Annuler
              </button>
            </div>

            <form onSubmit={handleAddCreditsSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#9AA0B2] mb-1 font-medium">Montant (positif pour ajouter, négatif pour retirer)</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={creditAmount}
                  onChange={e => setCreditAmount(parseInt(e.target.value) || 0)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-[#F5F6FA] font-mono text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#9AA0B2] mb-1 font-medium">Motif obligatoire (traçabilité audit)</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Dotation Bêta, compensation incident, attribution test..."
                  value={creditReason}
                  onChange={e => setCreditReason(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-[#F5F6FA] focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreditModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#9AA0B2] font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingCredit}
                  className="px-5 py-2 rounded-lg bg-[#D81A45] hover:bg-[#D81A45]/90 text-white font-bold disabled:opacity-50"
                >
                  {submittingCredit ? "Enregistrement..." : "Confirmer et inscrire au ledger"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
