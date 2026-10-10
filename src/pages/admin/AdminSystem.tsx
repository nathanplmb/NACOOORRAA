import React, { useState, useEffect } from "react";
import { adminService } from "../../services/adminService.ts";
import { SystemHealthResponse, ServiceHealthStatus } from "../../types/admin.ts";
import { Server, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Cpu, Database, Key } from "lucide-react";

interface AdminSystemProps {
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export const AdminSystem: React.FC<AdminSystemProps> = ({ showToast }) => {
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const data = await adminService.getSystemHealth();
      setHealth(data);
      showToast("Diagnostic des services système actualisé.", "info");
    } catch (err: any) {
      showToast(err.message || "Erreur lors de la vérification système", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const renderStatusBadge = (s: ServiceHealthStatus) => {
    if (s.status === "ok") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>OK</span>
          {s.latencyMs && <span className="font-mono font-normal">({s.latencyMs}ms)</span>}
        </span>
      );
    }
    if (s.status === "warning") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-xs">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>WARNING</span>
          {s.latencyMs && <span className="font-mono font-normal">({s.latencyMs}ms)</span>}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold text-xs">
        <XCircle className="w-3.5 h-3.5" />
        <span>ERROR</span>
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#F5F6FA] tracking-tight">Supervision Système & API</h1>
          <p className="text-xs text-[#9AA0B2] mt-0.5 font-mono">
            Contrôle technique en temps réel des dépendances cloud et des passerelles d'exécution
          </p>
        </div>
        <button
          onClick={checkHealth}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-[#F5F6FA] cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Vérifier maintenant</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-[#9AA0B2]">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#FF6685] mb-2" />
          <span className="text-xs font-mono">Ping réel de Firebase Auth, Firestore et Gemini API...</span>
        </div>
      ) : !health ? (
        <div className="py-12 text-center text-rose-400 text-xs">Données indisponibles</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Firebase Auth */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-[#F5F6FA]">
                <Key className="w-4 h-4 text-sky-400" />
                <span>Firebase Authentication & JWKS</span>
              </div>
              {renderStatusBadge(health.services.firebaseAuth)}
            </div>
            <p className="text-[#9AA0B2] text-[11px] leading-relaxed">
              {health.services.firebaseAuth.message}
            </p>
            {health.services.firebaseAuth.details && (
              <div className="p-2 rounded bg-black/30 font-mono text-[10px] text-[#9AA0B2]">
                Détails: {JSON.stringify(health.services.firebaseAuth.details)}
              </div>
            )}
          </div>

          {/* Firestore */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-[#F5F6FA]">
                <Database className="w-4 h-4 text-amber-400" />
                <span>Cloud Firestore Database</span>
              </div>
              {renderStatusBadge(health.services.firestore)}
            </div>
            <p className="text-[#9AA0B2] text-[11px] leading-relaxed">
              {health.services.firestore.message}
            </p>
            {health.services.firestore.details && (
              <div className="p-2 rounded bg-black/30 font-mono text-[10px] text-[#9AA0B2]">
                Test écriture/lecture doc: validé
              </div>
            )}
          </div>

          {/* Gemini API */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-[#F5F6FA]">
                <Cpu className="w-4 h-4 text-purple-400" />
                <span>Google Gemini API</span>
              </div>
              {renderStatusBadge(health.services.geminiApi)}
            </div>
            <p className="text-[#9AA0B2] text-[11px] leading-relaxed">
              {health.services.geminiApi.message}
            </p>
            {health.services.geminiApi.details && (
              <div className="p-2 rounded bg-black/30 font-mono text-[10px] text-[#9AA0B2]">
                Détails: {JSON.stringify(health.services.geminiApi.details)}
              </div>
            )}
          </div>

          {/* Express Node server */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-[#F5F6FA]">
                <Server className="w-4 h-4 text-emerald-400" />
                <span>Serveur Express & Runtime Node</span>
              </div>
              {renderStatusBadge(health.services.serverApi)}
            </div>
            <p className="text-[#9AA0B2] text-[11px] leading-relaxed">
              {health.services.serverApi.message}
            </p>
            {health.services.serverApi.details && (
              <div className="p-2 rounded bg-black/30 font-mono text-[10px] text-[#9AA0B2] space-y-0.5">
                <div>Uptime: {health.services.serverApi.details.uptimeSeconds} secondes</div>
                <div>Mémoire RSS: {health.services.serverApi.details.memoryRssMb} MB</div>
                <div>Version Node: {health.services.serverApi.details.nodeVersion}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
