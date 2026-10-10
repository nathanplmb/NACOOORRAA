import React, { useState, useEffect, useCallback } from "react";
import { adminService } from "../../services/adminService.ts";
import { AdminUserItem, UserStatus, UserRole, AccessTier, CreditMode } from "../../types/admin.ts";
import { 
  Users, 
  Search, 
  Filter, 
  UserPlus, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  MoreHorizontal, 
  CheckCircle, 
  Ban, 
  Key, 
  CreditCard, 
  Shield, 
  ExternalLink,
  Clock,
  Laptop
} from "lucide-react";

interface AdminUsersProps {
  onSelectUser: (uid: string) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export const AdminUsers: React.FC<AdminUsersProps> = ({ onSelectUser, showToast }) => {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Modal Create/Invite User state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "user" as UserRole,
    accessTier: "beta" as AccessTier,
    creditMode: "limited" as CreditMode,
    initialCredits: 0,
    notes: ""
  });
  const [submittingInvite, setSubmittingInvite] = useState(false);

  // Modal Adjust Credits state
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [creditTargetUser, setCreditTargetUser] = useState<AdminUserItem | null>(null);
  const [creditAdjustmentType, setCreditAdjustmentType] = useState<"add" | "deduct">("add");
  const [creditAmount, setCreditAmount] = useState<number>(50);
  const [creditReason, setCreditReason] = useState<string>("");
  const [submittingCredit, setSubmittingCredit] = useState(false);

  // Fetch users with server-side query params
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getUsers({
        page,
        pageSize,
        search,
        filter
      });
      setUsers(res.users);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      showToast(err.message || "Erreur de chargement des utilisateurs", "error");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, filter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // reset to page 1 on new search
  };

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setPage(1);
  };

  const handleToggleStatus = async (user: AdminUserItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (user.status === "disabled") {
        await adminService.enableUser(user.uid);
        showToast(`Compte ${user.email} réactivé.`, "success");
      } else {
        await adminService.disableUser(user.uid);
        showToast(`Compte ${user.email} désactivé et sessions révoquées.`, "info");
      }
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || "Erreur lors du changement de statut", "error");
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.email || !inviteForm.email.includes("@")) {
      showToast("Veuillez saisir une adresse email valide.", "error");
      return;
    }
    setSubmittingInvite(true);
    try {
      await adminService.createUser({
        firstName: inviteForm.firstName,
        lastName: inviteForm.lastName,
        email: inviteForm.email,
        role: inviteForm.role,
        accessTier: inviteForm.accessTier,
        creditMode: inviteForm.creditMode,
        initialCredits: Number(inviteForm.initialCredits),
        notes: inviteForm.notes
      });
      showToast(`Utilisateur ${inviteForm.email} invité avec succès (${inviteForm.initialCredits} crédits).`, "success");
      setIsInviteModalOpen(false);
      setInviteForm({
        firstName: "",
        lastName: "",
        email: "",
        role: "user",
        accessTier: "beta",
        creditMode: "limited",
        initialCredits: 0,
        notes: ""
      });
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || "Erreur lors de la création de l'utilisateur", "error");
    } finally {
      setSubmittingInvite(false);
    }
  };

  const handleOpenAdjustCredits = (user: AdminUserItem) => {
    setCreditTargetUser(user);
    setCreditAdjustmentType("add");
    setCreditAmount(50);
    setCreditReason("");
    setIsCreditModalOpen(true);
  };

  const handleAdjustCreditsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditTargetUser) return;
    if (typeof creditAmount !== "number" || isNaN(creditAmount) || creditAmount <= 0) {
      showToast("Veuillez saisir un montant de crédits supérieur à 0.", "error");
      return;
    }
    const cleanReason = creditReason.trim();
    if (!cleanReason || cleanReason.length < 5) {
      showToast("Le motif d'ajustement est obligatoire (au moins 5 caractères) pour la traçabilité.", "error");
      return;
    }

    setSubmittingCredit(true);
    const finalAmount = creditAdjustmentType === "add" ? creditAmount : -creditAmount;
    try {
      await adminService.addCredits(creditTargetUser.uid, finalAmount, cleanReason);
      showToast(
        `Crédits mis à jour pour ${creditTargetUser.email} (${finalAmount > 0 ? "+" : ""}${finalAmount} crédits).`,
        "success"
      );
      setIsCreditModalOpen(false);
      setCreditTargetUser(null);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || "Erreur lors de l'ajustement des crédits", "error");
    } finally {
      setSubmittingCredit(false);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }).format(d);
    } catch {
      return "—";
    }
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#F5F6FA] tracking-tight">Gestion des Utilisateurs</h1>
          <p className="text-xs text-[#9AA0B2] mt-0.5 font-mono">
            {total} compte{total > 1 ? 's' : ''} au total • Filtrage & pagination serveur
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchUsers()}
            disabled={loading}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#9AA0B2] hover:text-[#F5F6FA] transition-all cursor-pointer"
            title="Rafraîchir la liste"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#D81A45] hover:bg-[#D81A45]/90 text-white font-semibold text-xs transition-all shadow-[0_0_12px_rgba(216,26,69,0.3)] cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Inviter un utilisateur</span>
          </button>
        </div>
      </div>

      {/* Search and Filters toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 p-2 rounded-xl bg-white/[0.02] border border-white/10">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA0B2]" />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Rechercher par nom, prénom ou email..."
            className="w-full bg-white/[0.03] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60 focus:outline-none focus:border-[#FF6685]/50 transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 md:pb-0">
          {[
            { id: "all", label: "Tous" },
            { id: "active", label: "Actifs" },
            { id: "disabled", label: "Désactivés" },
            { id: "invited", label: "Invités" },
            { id: "admins", label: "Admins" },
            { id: "low_credits", label: "Crédits faibles (<50)" },
            { id: "exhausted_credits", label: "Crédits épuisés (0)" }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => handleFilterChange(f.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer ${
                filter === f.id 
                  ? "bg-white/15 text-[#F5F6FA] border border-white/20 shadow-sm" 
                  : "text-[#9AA0B2] hover:text-[#F5F6FA] hover:bg-white/5 border border-transparent"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table (Dense, functional, high-contrast) */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.03] border-b border-white/10 text-[11px] font-semibold text-[#9AA0B2] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Nom & Utilisateur</th>
                <th className="py-2.5 px-3">Email</th>
                <th className="py-2.5 px-3">Statut</th>
                <th className="py-2.5 px-3">Rôle</th>
                <th className="py-2.5 px-3">Accès</th>
                <th className="py-2.5 px-3">Crédits</th>
                <th className="py-2.5 px-3">Conso IA</th>
                <th className="py-2.5 px-3">Dernière Connexion</th>
                <th className="py-2.5 px-3">Dernière Activité</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#9AA0B2]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#FF6685] mb-2" />
                    <span>Chargement des utilisateurs en cours...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#9AA0B2]">
                    <Users className="w-6 h-6 mx-auto mb-2 text-slate-500" />
                    <span>Aucun utilisateur ne correspond aux critères de recherche.</span>
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr
                    key={u.uid}
                    onClick={() => onSelectUser(u.uid)}
                    className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                  >
                    {/* Nom & Titre */}
                    <td className="py-2.5 px-3 font-medium text-[#F5F6FA] whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center font-bold text-[10px] text-white">
                          {(u.fullName || u.email || "U")[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-[#F5F6FA] group-hover:text-[#FF6685] transition-colors">
                            {u.fullName || "Profil non initialisé"}
                          </div>
                          {u.title && (
                            <div className="text-[10px] text-[#9AA0B2] truncate max-w-[140px]">
                              {u.title}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-2.5 px-3 text-[#9AA0B2] font-mono text-[11px] whitespace-nowrap">
                      {u.email}
                    </td>

                    {/* Statut */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                        u.status === "active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        u.status === "disabled" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                        u.status === "invited" ? "bg-sky-500/10 text-sky-400 border border-sky-500/20" :
                        "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          u.status === "active" ? "bg-emerald-400" :
                          u.status === "disabled" ? "bg-rose-400" :
                          u.status === "invited" ? "bg-sky-400" : "bg-amber-400"
                        }`} />
                        {u.status}
                      </span>
                    </td>

                    {/* Rôle */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        u.role === "admin" ? "bg-purple-500/15 text-purple-300 font-bold" :
                        u.role === "support" ? "bg-blue-500/15 text-blue-300" :
                        u.role === "viewer" ? "bg-slate-500/15 text-slate-300" :
                        "text-[#9AA0B2]"
                      }`}>
                        {u.role === "admin" && <Shield className="w-2.5 h-2.5" />}
                        {u.role}
                      </span>
                    </td>

                    {/* Accès */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="text-[11px] font-mono text-[#F5F6FA] uppercase px-1.5 py-0.5 rounded bg-white/5">
                        {u.accessTier}
                      </span>
                    </td>

                    {/* Crédits */}
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono">
                      {u.creditMode === "unlimited" ? (
                        <span className="text-emerald-400 font-bold">Illimité</span>
                      ) : u.creditsBalance === undefined || u.creditsBalance === null ? (
                        <span className="text-[#9AA0B2] text-[10px]">Non initialisé</span>
                      ) : u.creditsBalance === 0 ? (
                        <span className="text-[#9AA0B2] text-xs">0 pt</span>
                      ) : (
                        <span className={`font-semibold ${
                          u.creditsBalance <= 50 ? "text-amber-400" : "text-[#F5F6FA]"
                        }`}>
                          {u.creditsBalance} <span className="text-[#9AA0B2] text-[10px]">pts</span>
                        </span>
                      )}
                    </td>

                    {/* Conso IA */}
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[#9AA0B2] text-[11px]">
                      <div>{u.totalAiCalls} appels</div>
                      <div className="text-[10px] text-emerald-400/80">{u.totalCostEuro.toFixed(3)} €</div>
                    </td>

                    {/* Dernière connexion */}
                    <td className="py-2.5 px-3 text-[#9AA0B2] whitespace-nowrap text-[11px] font-mono">
                      {formatDate(u.lastLoginAt)}
                    </td>

                    {/* Dernière activité */}
                    <td className="py-2.5 px-3 text-[#9AA0B2] whitespace-nowrap text-[11px] font-mono">
                      {formatDate(u.lastActivityAt)}
                    </td>

                    {/* Actions directes */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAdjustCredits(u);
                          }}
                          title="Ajuster les crédits (transaction atomique)"
                          className="p-1.5 rounded-md bg-white/5 hover:bg-purple-500/20 text-[#9AA0B2] hover:text-purple-300 transition-colors cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleToggleStatus(u, e)}
                          title={u.status === "disabled" ? "Réactiver le compte" : "Désactiver le compte"}
                          className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                            u.status === "disabled"
                              ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                              : "bg-white/5 text-[#9AA0B2] hover:text-rose-400 hover:bg-rose-500/10"
                          }`}
                        >
                          {u.status === "disabled" ? <CheckCircle className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => onSelectUser(u.uid)}
                          title="Voir la fiche détaillée"
                          className="p-1.5 rounded-md bg-white/5 hover:bg-white/15 text-[#9AA0B2] hover:text-[#F5F6FA] transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Server Pagination Toolbar */}
        <div className="py-2.5 px-4 bg-white/[0.01] border-t border-white/5 flex items-center justify-between text-xs text-[#9AA0B2]">
          <span>
            Affichage de {users.length > 0 ? (page - 1) * pageSize + 1 : 0} à {Math.min(page * pageSize, total)} sur {total} utilisateurs
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer text-[#F5F6FA]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-[11px] text-[#F5F6FA]">
              Page {page} / {totalPages || 1}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer text-[#F5F6FA]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Inviter / Créer Utilisateur */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-[#0B0F19] border border-white/15 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.9)] space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#FF6685]" />
                <h3 className="text-sm font-bold text-[#F5F6FA]">Inviter un nouvel utilisateur</h3>
              </div>
              <button 
                onClick={() => setIsInviteModalOpen(false)}
                className="text-[#9AA0B2] hover:text-[#F5F6FA] text-xs cursor-pointer"
              >
                Annuler
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#9AA0B2] mb-1 font-medium">Prénom</label>
                  <input
                    type="text"
                    value={inviteForm.firstName}
                    onChange={e => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                    placeholder="ex: Paul"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-[#F5F6FA] focus:outline-none focus:border-[#FF6685]"
                  />
                </div>
                <div>
                  <label className="block text-[#9AA0B2] mb-1 font-medium">Nom</label>
                  <input
                    type="text"
                    value={inviteForm.lastName}
                    onChange={e => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                    placeholder="ex: Durand"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-[#F5F6FA] focus:outline-none focus:border-[#FF6685]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#9AA0B2] mb-1 font-medium">Adresse Email *</label>
                <input
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="paul.durand@gmail.com"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-[#F5F6FA] focus:outline-none focus:border-[#FF6685]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#9AA0B2] mb-1 font-medium">Rôle</label>
                  <select
                    value={inviteForm.role}
                    onChange={e => setInviteForm({ ...inviteForm, role: e.target.value as UserRole })}
                    className="w-full bg-[#0B0F19] border border-white/10 rounded-lg px-2.5 py-2 text-[#F5F6FA] focus:outline-none"
                  >
                    <option value="user">User (Standard)</option>
                    <option value="admin">Admin</option>
                    <option value="support">Support</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#9AA0B2] mb-1 font-medium">Access Tier</label>
                  <select
                    value={inviteForm.accessTier}
                    onChange={e => setInviteForm({ ...inviteForm, accessTier: e.target.value as AccessTier })}
                    className="w-full bg-[#0B0F19] border border-white/10 rounded-lg px-2.5 py-2 text-[#F5F6FA] focus:outline-none"
                  >
                    <option value="beta">Beta</option>
                    <option value="internal">Internal</option>
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#9AA0B2] mb-1 font-medium">Mode Crédits</label>
                  <select
                    value={inviteForm.creditMode}
                    onChange={e => setInviteForm({ ...inviteForm, creditMode: e.target.value as CreditMode })}
                    className="w-full bg-[#0B0F19] border border-white/10 rounded-lg px-2.5 py-2 text-[#F5F6FA] focus:outline-none"
                  >
                    <option value="limited">Limited</option>
                    <option value="unlimited">Unlimited</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#9AA0B2] mb-1 font-medium">Crédits IA initiaux</label>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  value={inviteForm.initialCredits}
                  onChange={e => setInviteForm({ ...inviteForm, initialCredits: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-[#F5F6FA] focus:outline-none font-mono"
                />
                <span className="text-[10px] text-[#9AA0B2] mt-1 block">
                  Une transaction d'attribution initiale auditable sera automatiquement enregistrée dans le ledger.
                </span>
              </div>

              <div>
                <label className="block text-[#9AA0B2] mb-1 font-medium">Notes d'intégration / Contexte (optionnel)</label>
                <textarea
                  rows={2}
                  value={inviteForm.notes}
                  onChange={e => setInviteForm({ ...inviteForm, notes: e.target.value })}
                  placeholder="ex: Candidat alternance école d'ingénieurs, recommandation interne..."
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-[#F5F6FA] focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#9AA0B2] text-xs font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingInvite}
                  className="px-5 py-2 rounded-lg bg-[#D81A45] hover:bg-[#D81A45]/90 text-white text-xs font-bold transition-all shadow-[0_0_12px_rgba(216,26,69,0.3)] disabled:opacity-50 cursor-pointer"
                >
                  {submittingInvite ? "Création en cours..." : "Créer le compte & Attribuer les crédits"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ajuster les Crédits (Ledger atomique sécurisé) */}
      {isCreditModalOpen && creditTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#0B0F19] border border-white/15 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.9)] space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-[#F5F6FA]">Ajuster les crédits (Grand Livre)</h3>
              </div>
              <button 
                onClick={() => {
                  setIsCreditModalOpen(false);
                  setCreditTargetUser(null);
                }}
                className="text-[#9AA0B2] hover:text-[#F5F6FA] text-xs cursor-pointer"
              >
                Annuler
              </button>
            </div>

            <form onSubmit={handleAdjustCreditsSubmit} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                <div className="text-[11px] text-[#9AA0B2]">Compte cible :</div>
                <div className="text-xs font-semibold text-[#F5F6FA] flex items-center justify-between">
                  <span>{creditTargetUser.fullName}</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {creditTargetUser.creditMode === "unlimited" ? "Illimité" : `${creditTargetUser.creditsBalance} pts`}
                  </span>
                </div>
                <div className="font-mono text-[11px] text-[#9AA0B2]">{creditTargetUser.email}</div>
              </div>

              <div>
                <label className="block text-[#9AA0B2] mb-1.5 font-medium">Type d'opération</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreditAdjustmentType("add")}
                    className={`py-2 px-3 rounded-lg border font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      creditAdjustmentType === "add"
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-sm"
                        : "bg-white/[0.02] border-white/10 text-[#9AA0B2] hover:text-[#F5F6FA]"
                    }`}
                  >
                    <span>+ Ajouter (Dotation)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreditAdjustmentType("deduct")}
                    className={`py-2 px-3 rounded-lg border font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      creditAdjustmentType === "deduct"
                        ? "bg-rose-500/15 border-rose-500/40 text-rose-400 shadow-sm"
                        : "bg-white/[0.02] border-white/10 text-[#9AA0B2] hover:text-[#F5F6FA]"
                    }`}
                  >
                    <span>- Déduire (Débit)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[#9AA0B2] mb-1 font-medium">Montant en crédits</label>
                <input
                  type="number"
                  min="1"
                  max="100000"
                  value={creditAmount}
                  onChange={e => setCreditAmount(Math.max(1, parseInt(e.target.value) || 0))}
                  required
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-[#F5F6FA] font-mono focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-[#9AA0B2] mb-1 font-medium">
                  Motif obligatoire <span className="text-[#FF6685]">*</span>
                </label>
                <input
                  type="text"
                  value={creditReason}
                  onChange={e => setCreditReason(e.target.value)}
                  placeholder="ex: Dotation test bêta, régularisation ticket #42, geste commercial..."
                  required
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-[#F5F6FA] placeholder-[#9AA0B2]/50 focus:outline-none focus:border-purple-400"
                />
                <span className="text-[10px] text-[#9AA0B2] mt-1 block">
                  Ce motif est stocké de manière immuable dans la transaction atomique pour l'audit.
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#9AA0B2]">Nouveau solde calculé :</span>
                <span className="font-bold text-[#F5F6FA]">
                  {creditTargetUser.creditMode === "unlimited"
                    ? "Illimité"
                    : `${Math.max(0, creditTargetUser.creditsBalance + (creditAdjustmentType === "add" ? creditAmount : -creditAmount))} pts`}
                </span>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreditModalOpen(false);
                    setCreditTargetUser(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#9AA0B2] text-xs font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingCredit}
                  className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-[0_0_12px_rgba(168,85,247,0.3)] disabled:opacity-50 cursor-pointer"
                >
                  {submittingCredit ? "Transaction en cours..." : "Valider l'ajustement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
