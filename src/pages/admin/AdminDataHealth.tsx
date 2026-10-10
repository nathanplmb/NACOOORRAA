import React, { useState, useEffect } from "react";
import { adminService } from "../../services/adminService.ts";
import { DataHealthReport } from "../../types/admin.ts";
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  HelpCircle,
  Database,
  ArrowRight
} from "lucide-react";

interface AdminDataHealthProps {
  onSelectUser: (uid: string) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export const AdminDataHealth: React.FC<AdminDataHealthProps> = ({ onSelectUser, showToast }) => {
  const [report, setReport] = useState<DataHealthReport | null>(null);
  const [loading, setLoading] = useState(true);

  const runAudit = async () => {
    setLoading(true);
    try {
      const data = await adminService.getDataHealth();
      setReport(data);
      showToast("Audit d'intégrité de la base terminé.", "info");
    } catch (err: any) {
      showToast(err.message || "Erreur lors de l'exécution de l'audit", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAudit();
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#F5F6FA] tracking-tight">Diagnostic d'Intégrité des Données</h1>
          <p className="text-xs text-[#9AA0B2] mt-0.5 font-mono">
            Vérification réelle des discordances relationnelles et de la consistance des soldes
          </p>
        </div>
        <button
          onClick={runAudit}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-[#F5F6FA] transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Relancer l'audit complet</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-[#9AA0B2]">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#FF6685] mb-2" />
          <span className="text-xs font-mono">Analyse des collections Firestore et des soldes ledger...</span>
        </div>
      ) : !report ? (
        <div className="text-center py-12 text-[#9AA0B2] text-xs">Aucun rapport disponible.</div>
      ) : (
        <div className="space-y-4">
          {/* Status banner */}
          <div className={`p-4 rounded-xl border flex items-center justify-between ${
            report.summary.severity === "healthy" ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300" :
            report.summary.severity === "minor_issues" ? "bg-amber-500/10 border-amber-500/25 text-amber-300" :
            "bg-rose-500/10 border-rose-500/25 text-rose-300"
          }`}>
            <div className="flex items-center gap-3">
              {report.summary.severity === "healthy" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
              <div>
                <h3 className="font-bold text-sm">
                  {report.summary.severity === "healthy"
                    ? "Base de données saine : Aucune anomalie critique détectée"
                    : `${report.summary.totalIssues} anomalie(s) détectée(s)`}
                </h3>
                <p className="text-xs opacity-80 mt-0.5">
                  Audit exécuté le {new Date(report.timestamp).toLocaleTimeString("fr-FR")}
                </p>
              </div>
            </div>
            <div className="text-right font-mono text-xs">
              Sévérité : <span className="font-bold uppercase">{report.summary.severity}</span>
            </div>
          </div>

          {/* Cards for each check */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Credit inconsistencies */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
              <div className="flex items-center justify-between font-semibold text-[#F5F6FA]">
                <span>Incohérences de Crédits (Ledger vs Solde)</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  report.creditInconsistencies.length === 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                }`}>
                  {report.creditInconsistencies.length}
                </span>
              </div>
              <p className="text-[#9AA0B2] text-[11px]">
                Compare la somme mathématique des transactions du ledger avec le champ `creditsBalance` stocké.
              </p>
              {report.creditInconsistencies.length > 0 && (
                <div className="pt-2 space-y-1.5 font-mono text-[11px]">
                  {report.creditInconsistencies.map((c, i) => (
                    <div key={i} className="p-2 rounded bg-rose-500/10 border border-rose-500/20 flex justify-between">
                      <button onClick={() => onSelectUser(c.userId)} className="text-sky-300 underline">
                        {c.email}
                      </button>
                      <span className="text-rose-400 font-bold">Écart: {c.delta} pts</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Orphan Profiles */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
              <div className="flex items-center justify-between font-semibold text-[#F5F6FA]">
                <span>Profils Orphelins ou Incomplets</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  report.orphanedProfiles.length === 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                }`}>
                  {report.orphanedProfiles.length}
                </span>
              </div>
              <p className="text-[#9AA0B2] text-[11px]">
                Comptes utilisateurs sans objet 'profile' ou sans email valide.
              </p>
              {report.orphanedProfiles.length > 0 && (
                <div className="pt-2 space-y-1 text-[11px]">
                  {report.orphanedProfiles.map((p, i) => (
                    <div key={i} className="p-2 rounded bg-amber-500/10 text-amber-300">
                      ID: {p.id} — {p.reason}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Orphan Transactions */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
              <div className="flex items-center justify-between font-semibold text-[#F5F6FA]">
                <span>Transactions sans Utilisateur</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  report.orphanedTransactions.length === 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                }`}>
                  {report.orphanedTransactions.length}
                </span>
              </div>
              <p className="text-[#9AA0B2] text-[11px]">
                Lignes du grand livre associées à un identifiant utilisateur supprimé ou manquant.
              </p>
              {report.orphanedTransactions.length > 0 && (
                <div className="pt-2 space-y-1 text-[11px]">
                  {report.orphanedTransactions.map((tx, i) => (
                    <div key={i} className="p-2 rounded bg-rose-500/10 text-rose-300">
                      Tx: {tx.id} — {tx.reason}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Broken references */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
              <div className="flex items-center justify-between font-semibold text-[#F5F6FA]">
                <span>Références Relationnelles Métier</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  report.brokenReferences.length === 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-white/10 text-[#F5F6FA]"
                }`}>
                  {report.brokenReferences.length}
                </span>
              </div>
              <p className="text-[#9AA0B2] text-[11px]">
                Contacts attachés à une entreprise non répertoriée dans la collection entreprise de l'utilisateur.
              </p>
              {report.brokenReferences.length > 0 && (
                <div className="pt-2 space-y-1 text-[11px] max-h-32 overflow-y-auto">
                  {report.brokenReferences.slice(0, 5).map((br, i) => (
                    <div key={i} className="p-2 rounded bg-white/[0.03] text-[#9AA0B2]">
                      {br.detail}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
