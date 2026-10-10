import React, { useState, useEffect } from "react";
import { adminService } from "../../services/adminService.ts";
import { AdminAuditLog } from "../../types/admin.ts";
import { Clock, RefreshCw, Shield, Search, Filter } from "lucide-react";

interface AdminAuditLogProps {
  onSelectUser: (uid: string) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export const AdminAuditLogView: React.FC<AdminAuditLogProps> = ({ onSelectUser, showToast }) => {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await adminService.getAuditLogs(100);
      setLogs(data);
    } catch (err: any) {
      showToast(err.message || "Erreur lors du chargement des journaux d'audit", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(l => {
    if (actionFilter !== "all" && l.action !== actionFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        l.adminEmail.toLowerCase().includes(s) ||
        (l.targetUserEmail && l.targetUserEmail.toLowerCase().includes(s)) ||
        (l.targetUserId && l.targetUserId.toLowerCase().includes(s)) ||
        l.action.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const formatDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }).format(new Date(iso));
    } catch {
      return "—";
    }
  };

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case "user_created": return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      case "user_enabled": return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      case "user_disabled": return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
      case "credits_granted": return "bg-purple-500/10 text-purple-400 border border-purple-500/20";
      case "credits_adjusted": return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      case "sessions_revoked": return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
      case "role_changed": return "bg-sky-500/10 text-sky-400 border border-sky-500/20";
      default: return "bg-white/10 text-[#F5F6FA] border border-white/15";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#F5F6FA] tracking-tight">Journal d'Audit Administrateur</h1>
          <p className="text-xs text-[#9AA0B2] mt-0.5 font-mono">
            Historique d'audit immuable (append-only) des opérations d'administration
          </p>
        </div>
        <button
          onClick={loadLogs}
          disabled={loading}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#9AA0B2] hover:text-[#F5F6FA] text-xs cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/10">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA0B2]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par admin, cible, action..."
            className="w-full bg-white/[0.03] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
          {[
            { id: "all", label: "Toutes" },
            { id: "user_created", label: "Créations" },
            { id: "credits_granted", label: "Crédits +" },
            { id: "credits_adjusted", label: "Ajustements" },
            { id: "user_disabled", label: "Désactivations" },
            { id: "sessions_revoked", label: "Révocations" }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setActionFilter(f.id)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                actionFilter === f.id ? "bg-white/15 text-[#F5F6FA]" : "text-[#9AA0B2] hover:text-[#F5F6FA]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Table */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/[0.03] border-b border-white/10 text-[11px] font-semibold text-[#9AA0B2] uppercase">
            <tr>
              <th className="py-2.5 px-3">Horodatage</th>
              <th className="py-2.5 px-3">Administrateur</th>
              <th className="py-2.5 px-3">Action</th>
              <th className="py-2.5 px-3">Utilisateur Cible</th>
              <th className="py-2.5 px-3">Métadonnées / Contexte</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-sans">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-[#9AA0B2]">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#FF6685] mb-2" />
                  <span>Chargement du journal d'audit...</span>
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-[#9AA0B2]">
                  Aucune entrée d'audit enregistrée.
                </td>
              </tr>
            ) : (
              filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-white/[0.02]">
                  <td className="py-2 px-3 text-[#9AA0B2] font-mono text-[11px] whitespace-nowrap">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="py-2 px-3 font-medium text-[#F5F6FA] whitespace-nowrap">
                    <span className="font-mono text-[11px] text-sky-400">{log.adminEmail}</span>
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getActionBadgeClass(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    {log.targetUserId ? (
                      <button
                        onClick={() => onSelectUser(log.targetUserId!)}
                        className="text-[#F5F6FA] hover:underline font-mono text-[11px] cursor-pointer"
                      >
                        {log.targetUserEmail || log.targetUserId.substring(0, 14)}
                      </button>
                    ) : (
                      <span className="text-[#9AA0B2]">—</span>
                    )}
                  </td>
                  <td className="py-2 px-3 font-mono text-[10px] text-[#9AA0B2] max-w-md truncate">
                    {log.metadata ? JSON.stringify(log.metadata) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
