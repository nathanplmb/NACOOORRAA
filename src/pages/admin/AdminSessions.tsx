import React, { useState, useEffect } from "react";
import { adminService } from "../../services/adminService.ts";
import { UserSession } from "../../types/admin.ts";
import { Laptop, RefreshCw, Ban, ShieldCheck, Search } from "lucide-react";

interface AdminSessionsProps {
  onSelectUser: (uid: string) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export const AdminSessions: React.FC<AdminSessionsProps> = ({ onSelectUser, showToast }) => {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await adminService.getAllSessions();
      setSessions(data);
    } catch (err: any) {
      showToast(err.message || "Erreur lors du chargement des sessions", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const filteredSessions = sessions.filter(s => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.userId.toLowerCase().includes(q) ||
        (s.userEmail && s.userEmail.toLowerCase().includes(q)) ||
        (s.userName && s.userName.toLowerCase().includes(q)) ||
        s.browser.toLowerCase().includes(q) ||
        s.os.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const formatDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(iso));
    } catch {
      return "—";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#F5F6FA] tracking-tight">Surveillance des Sessions</h1>
          <p className="text-xs text-[#9AA0B2] mt-0.5 font-mono">
            {sessions.filter(s => s.status === "active").length} session(s) active(s) en temps réel
          </p>
        </div>
        <button
          onClick={loadSessions}
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
            placeholder="Rechercher par utilisateur, email, navigateur, OS..."
            className="w-full bg-white/[0.03] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1">
          {["all", "active", "revoked"].map(t => (
            <button
              key={t}
              onClick={() => setStatusFilter(t)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                statusFilter === t ? "bg-white/15 text-[#F5F6FA]" : "text-[#9AA0B2] hover:text-[#F5F6FA]"
              }`}
            >
              {t === "all" ? "Toutes" : t === "active" ? "Actives" : "Révoquées"}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions Table */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/[0.03] border-b border-white/10 text-[11px] font-semibold text-[#9AA0B2] uppercase">
            <tr>
              <th className="py-2.5 px-3">Statut</th>
              <th className="py-2.5 px-3">Utilisateur</th>
              <th className="py-2.5 px-3">Appareil</th>
              <th className="py-2.5 px-3">Navigateur</th>
              <th className="py-2.5 px-3">OS</th>
              <th className="py-2.5 px-3">Créée le</th>
              <th className="py-2.5 px-3">Dernière activité</th>
              <th className="py-2.5 px-3">IP (Anonymisée)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-sans">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-[#9AA0B2]">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#FF6685] mb-2" />
                  <span>Chargement des sessions...</span>
                </td>
              </tr>
            ) : filteredSessions.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-[#9AA0B2]">
                  Aucune session trouvée.
                </td>
              </tr>
            ) : (
              filteredSessions.map(s => (
                <tr key={s.id} className="hover:bg-white/[0.02]">
                  <td className="py-2 px-3 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      s.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                    }`}>
                      <span className={`w-1 h-1 rounded-full ${s.status === "active" ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
                      {s.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-medium whitespace-nowrap">
                    <button
                      onClick={() => onSelectUser(s.userId)}
                      className="text-sky-400 hover:underline cursor-pointer font-mono text-[11px]"
                    >
                      {s.userName || s.userEmail || s.userId.substring(0, 12)}
                    </button>
                  </td>
                  <td className="py-2 px-3 text-[#F5F6FA] font-medium whitespace-nowrap">{s.device}</td>
                  <td className="py-2 px-3 text-[#9AA0B2] whitespace-nowrap">{s.browser}</td>
                  <td className="py-2 px-3 text-[#9AA0B2] whitespace-nowrap">{s.os}</td>
                  <td className="py-2 px-3 text-[#9AA0B2] font-mono text-[11px] whitespace-nowrap">{formatDate(s.createdAt)}</td>
                  <td className="py-2 px-3 text-[#F5F6FA] font-mono text-[11px] whitespace-nowrap">{formatDate(s.lastSeenAt)}</td>
                  <td className="py-2 px-3 text-[#9AA0B2] font-mono text-[11px] whitespace-nowrap">{s.ip || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
