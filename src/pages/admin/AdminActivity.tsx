import React, { useState, useEffect } from "react";
import { adminService } from "../../services/adminService.ts";
import { SystemActivity } from "../../types/admin.ts";
import { Activity, RefreshCw, Filter, Clock, Sparkles, LogIn, CreditCard, MessageSquare, Briefcase } from "lucide-react";

interface AdminActivityProps {
  onSelectUser: (uid: string) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export const AdminActivity: React.FC<AdminActivityProps> = ({ onSelectUser, showToast }) => {
  const [activities, setActivities] = useState<SystemActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");

  const loadActivities = async () => {
    setLoading(true);
    try {
      const data = await adminService.getActivity(100);
      setActivities(data);
    } catch (err: any) {
      showToast(err.message || "Erreur de chargement de l'activité", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);

  const filtered = activities.filter(a => {
    if (typeFilter !== "all" && a.type !== typeFilter) return false;
    return true;
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "login": return <LogIn className="w-3.5 h-3.5 text-emerald-400" />;
      case "credits_update": return <CreditCard className="w-3.5 h-3.5 text-amber-400" />;
      case "ai_generation": return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
      case "conversation_imported": return <MessageSquare className="w-3.5 h-3.5 text-sky-400" />;
      case "opportunity_created": return <Briefcase className="w-3.5 h-3.5 text-[#FF6685]" />;
      default: return <Activity className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      const hours = d.getHours().toString().padStart(2, "0");
      const mins = d.getMinutes().toString().padStart(2, "0");
      const dateStr = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
      return `${dateStr} à ${hours}:${mins}`;
    } catch {
      return "—";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#F5F6FA] tracking-tight">Timeline d'Activité Globale</h1>
          <p className="text-xs text-[#9AA0B2] mt-0.5 font-mono">
            Événements opérationnels majeurs enregistrés en continu
          </p>
        </div>
        <button
          onClick={loadActivities}
          disabled={loading}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#9AA0B2] hover:text-[#F5F6FA] text-xs cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none p-1.5 rounded-xl bg-white/[0.02] border border-white/10 text-xs">
        {[
          { id: "all", label: "Tous les événements" },
          { id: "login", label: "Connexions" },
          { id: "credits_update", label: "Crédits" },
          { id: "ai_generation", label: "Générations IA" },
          { id: "conversation_imported", label: "Imports" }
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setTypeFilter(f.id)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              typeFilter === f.id ? "bg-white/15 text-[#F5F6FA]" : "text-[#9AA0B2] hover:text-[#F5F6FA]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline List */}
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3 text-xs">
        {loading ? (
          <div className="py-12 text-center text-[#9AA0B2]">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#FF6685] mb-2" />
            <span>Chargement des événements récents...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-[#9AA0B2]">
            Aucun événement enregistré correspondant aux filtres.
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-white/10">
            {filtered.map(act => (
              <div key={act.id} className="relative flex items-start justify-between gap-3 group">
                <span className="absolute -left-6 top-0.5 p-1 rounded-full bg-[#0B0F19] border border-white/20">
                  {getActivityIcon(act.type)}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#F5F6FA]">{act.userName || "Système"}</span>
                    {act.userId && (
                      <button
                        onClick={() => onSelectUser(act.userId!)}
                        className="text-[10px] text-sky-400 hover:underline font-mono"
                      >
                        (profil)
                      </button>
                    )}
                    <span className="text-white/20">•</span>
                    <span className="text-[#9AA0B2] text-[11px]">{act.description}</span>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-[#9AA0B2] shrink-0">
                  {formatDate(act.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
