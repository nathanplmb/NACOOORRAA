import React, { useState, useMemo } from "react";
import { 
  Sparkles, 
  Cpu, 
  Layers, 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Filter, 
  Search, 
  Download, 
  Trash2, 
  Sliders, 
  Eye, 
  X, 
  HelpCircle, 
  BarChart3, 
  PieChart, 
  Zap, 
  Send, 
  MessageSquare, 
  UserCheck, 
  Briefcase, 
  FileText, 
  Mail, 
  ShieldCheck, 
  RefreshCw,
  Info,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ExternalLink
} from "lucide-react";
import { dbStore } from "../dbStore";
import { 
  AiUsageRecord, 
  AiUsageSettings, 
  AiFeatureCategory 
} from "../types";
import { 
  getAiUsageSummary, 
  FEATURE_CATEGORY_DETAILS, 
  MODEL_PRICING_RATES, 
  calculateEstimatedCostEuro 
} from "../utils/aiTokenTracker";

interface AiUsageSettingsSectionProps {
  showToast: (message: string, type: "success" | "error" | "info" | "ai") => void;
  language?: "fr" | "en";
}

export const AiUsageSettingsSection: React.FC<AiUsageSettingsSectionProps> = ({ 
  showToast,
  language = "fr"
}) => {
  // Période sélectionnée
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | '7days' | '30days' | 'month' | 'all'>('month');

  // Filtres d'historique
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [selectedModelFilter, setSelectedModelFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'tokens_desc' | 'cost_desc'>('date_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal de détail d'une requête
  const [selectedRecord, setSelectedRecord] = useState<AiUsageRecord | null>(null);

  // Modal de configuration des quotas / alertes
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [customLimitInput, setCustomLimitInput] = useState<string>("");
  const [selectedThresholds, setSelectedThresholds] = useState<number[]>([50, 75, 90, 100]);

  // Modal de confirmation de réinitialisation
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Force re-render key
  const [refreshKey, setRefreshKey] = useState(0);

  // Résumé calculé en temps réel
  const summary = useMemo(() => {
    return getAiUsageSummary(selectedPeriod);
  }, [selectedPeriod, refreshKey]);

  // Settings actuels
  const currentSettings = dbStore.getAiUsageSettings();
  const allRecords = dbStore.getAiUsageRecords();

  // Filtrage et tri de l'historique
  const filteredRecords = useMemo(() => {
    let result = [...allRecords];

    // Recherche textuelle
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(r => 
        r.feature.toLowerCase().includes(q) ||
        r.model.toLowerCase().includes(q) ||
        (r.contextSnippet && r.contextSnippet.toLowerCase().includes(q)) ||
        r.id.toLowerCase().includes(q)
      );
    }

    // Filtre catégorie
    if (selectedCategoryFilter !== "all") {
      result = result.filter(r => r.featureCategory === selectedCategoryFilter);
    }

    // Filtre modèle
    if (selectedModelFilter !== "all") {
      result = result.filter(r => r.model === selectedModelFilter);
    }

    // Tri
    result.sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      if (sortBy === 'date_asc') return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      if (sortBy === 'tokens_desc') return b.totalTokens - a.totalTokens;
      if (sortBy === 'cost_desc') return b.costEstimatedEuro - a.costEstimatedEuro;
      return 0;
    });

    return result;
  }, [allRecords, searchQuery, selectedCategoryFilter, selectedModelFilter, sortBy, refreshKey]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage]);

  // Actions de sauvegarde des quotas / alertes
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedLimit = customLimitInput.trim() ? parseInt(customLimitInput.replace(/\s+/g, ""), 10) : null;
    dbStore.updateAiUsageSettings({
      monthlyTokenLimit: parsedLimit && !isNaN(parsedLimit) ? parsedLimit : null,
      alertThresholds: selectedThresholds
    });
    setIsConfigModalOpen(false);
    setRefreshKey(prev => prev + 1);
    showToast(
      parsedLimit 
        ? `Limite IA mensuelle configurée à ${parsedLimit.toLocaleString("fr-FR")} tokens.` 
        : "Limite IA réinitialisée (aucune limite artificielle imposée).",
      "success"
    );
  };

  // Export CSV / JSON
  const handleExportData = (format: 'csv' | 'json') => {
    if (format === 'json') {
      const dataStr = JSON.stringify(allRecords, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nacora-ai-tokens-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ["ID", "Date", "Heure", "Fonctionnalité", "Catégorie", "Modèle", "Input Tokens", "Output Tokens", "Total Tokens", "Coût Estimé (€)", "Source Donnée", "Statut", "Contexte"];
      const rows = allRecords.map(r => {
        const d = new Date(r.timestamp);
        return [
          r.id,
          d.toLocaleDateString("fr-FR"),
          d.toLocaleTimeString("fr-FR"),
          `"${r.feature.replace(/"/g, '""')}"`,
          r.featureCategory,
          r.model,
          r.inputTokens,
          r.outputTokens,
          r.totalTokens,
          r.costEstimatedEuro.toFixed(6),
          r.isExact ? "API Exacte (usageMetadata)" : "Estimation",
          r.status,
          `"${(r.contextSnippet || "").replace(/"/g, '""')}"`
        ];
      });
      const csvContent = [headers.join(";"), ...rows.map(row => row.join(";"))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nacora-ai-tokens-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    showToast(`Rapport de consommation exporté avec succès (${format.toUpperCase()}).`, "success");
  };

  // Réinitialisation de l'historique
  const handleResetHistory = () => {
    dbStore.clearAiUsageRecords();
    setShowResetConfirm(false);
    setRefreshKey(prev => prev + 1);
    showToast("L'historique des appels IA a été réinitialisé.", "info");
  };

  // Helper de rendu icône catégorie
  const renderCategoryIcon = (cat: AiFeatureCategory, className = "w-4 h-4") => {
    switch (cat) {
      case "networking_messages": return <Send className={className} />;
      case "conversation_analysis": return <MessageSquare className={className} />;
      case "contact_analysis": return <UserCheck className={className} />;
      case "ai_assistant": return <Sparkles className={className} />;
      case "job_extraction": return <Briefcase className={className} />;
      case "cv_optimization": return <FileText className={className} />;
      case "email_classification": return <Mail className={className} />;
      default: return <Cpu className={className} />;
    }
  };

  // Calculs de coût estimé rapide
  const costToday = useMemo(() => {
    const todaySummary = getAiUsageSummary('today');
    return todaySummary.totalCostEstimatedEuro;
  }, [refreshKey]);

  const costWeek = useMemo(() => {
    const weekSummary = getAiUsageSummary('7days');
    return weekSummary.totalCostEstimatedEuro;
  }, [refreshKey]);

  const costMonth = useMemo(() => {
    const monthSummary = getAiUsageSummary('month');
    return monthSummary.totalCostEstimatedEuro;
  }, [refreshKey]);

  return (
    <section id="ai-tokens" className="glass-panel rounded-3xl p-6 sm:p-8 backdrop-blur-3xl space-y-8 shadow-[0_20px_50px_rgba(0,0,0,0.7)] border border-white/12 relative overflow-hidden">
      {/* Halo d'ambiance Violet IA signature NACORA */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#C084FC] via-[#A855F7] to-[#D81A45]" />
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. EN-TÊTE DE LA SECTION & BOUTONS D'ACTIONS                        */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-[#C084FC] flex items-center justify-center font-bold shadow-[0_0_20px_rgba(192,132,252,0.25)]">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-white tracking-wide">Utilisation IA & Tokens</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-[#C084FC] text-[10px] font-bold tracking-wide flex items-center gap-1">
                <Sparkles className="w-3 h-3 animate-pulse" />
                Live Tracker
              </span>
            </div>
            <p className="text-xs text-[#9AA0B2]">
              Suivi exact de la consommation en temps réel, répartition par fonctionnalité et limites configurées.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Bouton Configurer Limites / Alertes */}
          <button
            type="button"
            onClick={() => {
              setCustomLimitInput(currentSettings.monthlyTokenLimit ? String(currentSettings.monthlyTokenLimit) : "");
              setSelectedThresholds(currentSettings.alertThresholds || [50, 75, 90, 100]);
              setIsConfigModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/12 text-xs font-semibold text-white transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:border-purple-500/30"
          >
            <Sliders className="w-3.5 h-3.5 text-[#C084FC]" />
            <span>Paramétrer les quotas</span>
          </button>

          {/* Bouton Export */}
          <button
            type="button"
            onClick={() => handleExportData('json')}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/12 text-[#9AA0B2] hover:text-white transition-all cursor-pointer"
            title="Exporter l'historique en JSON"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Bouton Refresh */}
          <button
            type="button"
            onClick={() => {
              setRefreshKey(prev => prev + 1);
              showToast("Métriques IA actualisées.", "info");
            }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/12 text-[#9AA0B2] hover:text-white transition-all cursor-pointer"
            title="Actualiser les compteurs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. BANNIÈRE D'ALERTES SI SEUIL ATTEINT                              */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {summary.activeAlerts.length > 0 && (
        <div className="space-y-2">
          {summary.activeAlerts.map((alertText, idx) => (
            <div 
              key={idx}
              className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-200 animate-fade-in"
            >
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-amber-300">Alerte Quota IA</p>
                <p className="text-amber-200/90 leading-relaxed">{alertText}</p>
                <p className="text-[10px] text-amber-300/70">
                  Cette alerte est purement informative : NACORA ne bloque pas vos requêtes sauf si votre fournisseur API applique une restriction stricte.
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. RÉSUMÉ PRINCIPAL (SPEC EXACTE 1 & 2)                             */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* CARTE 1 : TOKENS UTILISÉS */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-purple-500/30 transition-all space-y-2 relative overflow-hidden group">
          <div className="flex items-center justify-between text-[#9AA0B2]">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#9AA0B2]">Tokens utilisés</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-[#C084FC]">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
              {summary.totalTokens.toLocaleString("fr-FR")}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#9AA0B2]">
            <span>Input : <strong className="text-white font-mono">{summary.inputTokens.toLocaleString("fr-FR")}</strong></span>
            <span>•</span>
            <span>Output : <strong className="text-white font-mono">{summary.outputTokens.toLocaleString("fr-FR")}</strong></span>
          </div>
        </div>

        {/* CARTE 2 : LIMITE CONFIGURÉE & SOURCE */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-purple-500/30 transition-all space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-[#9AA0B2]">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#9AA0B2]">Limite configurée</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            {summary.configuredLimitTokens ? (
              <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                {summary.configuredLimitTokens.toLocaleString("fr-FR")}
              </span>
            ) : (
              <span className="text-base font-bold text-[#9AA0B2] pt-1">
                Limite non configurée
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#9AA0B2] truncate" title={`Source : ${summary.limitSource}`}>
            Source : <strong className="text-white font-medium">{summary.limitSource}</strong>
          </p>
        </div>

        {/* CARTE 3 : UTILISATION (%) & RESTANT */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-purple-500/30 transition-all space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-[#9AA0B2]">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#9AA0B2]">Utilisation</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            {summary.usagePercentage !== null ? (
              <div className="flex items-center gap-2">
                <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                  summary.usagePercentage >= 90 ? "text-rose-400" : summary.usagePercentage >= 75 ? "text-amber-400" : "text-[#34D399]"
                }`}>
                  {summary.usagePercentage} %
                </span>
                <span className="text-[10px] text-[#9AA0B2]">
                  ({summary.remainingTokens?.toLocaleString("fr-FR")} restants)
                </span>
              </div>
            ) : (
              <span className="text-sm font-semibold text-emerald-400">
                Non plafonnée
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#9AA0B2]">
            {summary.estimatedDaysLeft !== null 
              ? `Épuisement estimé : ~${summary.estimatedDaysLeft} jours`
              : "Estimation épuisement indisponible"}
          </p>
        </div>

        {/* CARTE 4 : PÉRIODE DE CONSOMMATION */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-purple-500/30 transition-all space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-[#9AA0B2]">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#9AA0B2]">Période</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-lg font-bold text-white block capitalize">
              {selectedPeriod === 'today' ? "Aujourd'hui" :
               selectedPeriod === '7days' ? "7 derniers jours" :
               selectedPeriod === '30days' ? "30 derniers jours" :
               selectedPeriod === 'month' ? "Ce mois-ci" : "Historique global"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#9AA0B2]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{summary.requestsCount} requêtes enregistrées</span>
          </div>
        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 4. COÛT ESTIMÉ & TRANSPARENCE (SPEC EXACTE 8 & 18)                  */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Coût Estimé & Transparence
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
              <Info className="w-3 h-3" />
              Calculé sur la tarification officielle Google Gemini API
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
            <span className="text-[10px] font-semibold text-[#9AA0B2] block">Coût estimé aujourd'hui</span>
            <span className="text-lg font-black text-white font-mono">
              {costToday.toFixed(4)} €
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
            <span className="text-[10px] font-semibold text-[#9AA0B2] block">Coût estimé cette semaine (7j)</span>
            <span className="text-lg font-black text-white font-mono">
              {costWeek.toFixed(4)} €
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
            <span className="text-[10px] font-semibold text-[#9AA0B2] block">Coût estimé ce mois</span>
            <span className="text-lg font-black text-[#34D399] font-mono">
              {costMonth.toFixed(4)} €
            </span>
          </div>
        </div>

        <div className="text-[11px] text-[#9AA0B2] leading-relaxed bg-white/[0.01] p-3 rounded-xl border border-white/5">
          <strong className="text-white font-semibold">Note de transparence :</strong> Les coûts affichés ci-dessus sont des estimations indicatives calculées à partir du volume réel de tokens d'entrée/sortie et des barèmes publics Google Gemini (ex: ~0,092 € / 1M tokens sur Flash). Si vous utilisez une clé API avec crédits gratuits Google AI Studio, votre coût facturé réel est de <strong>0,00 €</strong>.
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 5. GRAPHIQUE D'ÉVOLUTION DE CONSOMMATION (SPEC EXACTE 7)             */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#C084FC]" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Évolution de la consommation de tokens
            </h3>
          </div>

          {/* Filtres de période pour le graphique */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 self-start sm:self-auto">
            {[
              { id: "today", label: "Aujourd'hui" },
              { id: "7days", label: "7 jours" },
              { id: "30days", label: "30 jours" },
              { id: "month", label: "Mois" },
              { id: "all", label: "Tout" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPeriod(p.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedPeriod === p.id
                    ? "bg-[#C084FC] text-slate-950 font-bold shadow-sm"
                    : "text-[#9AA0B2] hover:text-white hover:bg-white/5"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Visualisation SVG simple, élégante et fluide */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
          <div className="h-48 w-full flex items-end gap-2 sm:gap-3 pt-6 pb-2 px-2">
            {summary.timeline.map((point, idx) => {
              const maxTokens = Math.max(...summary.timeline.map(t => t.tokens), 1000);
              const heightPct = Math.min(100, Math.max(8, Math.round((point.tokens / maxTokens) * 100)));
              
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-[#0B0F19] border border-purple-500/40 px-2.5 py-1.5 rounded-lg text-[10px] text-white shadow-xl pointer-events-none z-20 whitespace-nowrap text-center">
                    <p className="font-bold text-[#C084FC]">{point.tokens.toLocaleString("fr-FR")} tokens</p>
                    <p className="text-[#9AA0B2]">{point.requestsCount} requêtes ({point.costEstimatedEuro} €)</p>
                  </div>

                  {/* Barre avec gradient Liquid Glass */}
                  <div 
                    style={{ height: `${heightPct}%` }}
                    className="w-full max-w-[40px] rounded-t-lg bg-gradient-to-t from-purple-600/40 via-[#C084FC] to-[#FF6685] group-hover:brightness-125 transition-all shadow-[0_0_15px_rgba(192,132,252,0.3)] relative"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-white/60 rounded-t-lg" />
                  </div>

                  {/* Label Date */}
                  <span className="text-[10px] text-[#9AA0B2] truncate max-w-full font-medium">
                    {point.displayDate}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#9AA0B2] pt-2 border-t border-white/5 px-2">
            <span>Période : <strong className="text-white">{summary.periodLabel}</strong></span>
            <span>Total période : <strong className="text-[#C084FC] font-mono">{summary.totalTokens.toLocaleString("fr-FR")} tokens</strong></span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 6. RÉPARTITION PAR FONCTIONNALITÉ & CE QUI CONSOMME LE PLUS (4 & 11) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Colonne Gauche : "Ce qui consomme le plus" (Spec 11) */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-[#FF6685]" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Ce qui consomme le plus
            </h3>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
            {summary.topConsumingFeatures.length === 0 ? (
              <p className="text-xs text-[#9AA0B2] text-center py-6">Aucune donnée sur la période sélectionnée.</p>
            ) : (
              summary.topConsumingFeatures.map((feat, idx) => (
                <div key={feat.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-white flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-white">{feat.label}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-[#9AA0B2] text-[11px]">{feat.tokens.toLocaleString("fr-FR")} tok.</span>
                      <span className="font-bold text-white">{feat.percentage} %</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                    <div 
                      style={{ 
                        width: `${Math.max(3, feat.percentage)}%`,
                        backgroundColor: feat.color || "#C084FC" 
                      }}
                      className="h-full rounded-full transition-all shadow-[0_0_10px_currentColor]"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Colonne Droite : "Consommation par modèle" (Spec 5) */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#38BDF8]" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Consommation par modèle Gemini
            </h3>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            {summary.byModel.length === 0 ? (
              <p className="text-xs text-[#9AA0B2] text-center py-6">Aucun modèle utilisé sur cette période.</p>
            ) : (
              summary.byModel.map((m) => {
                const pricing = MODEL_PRICING_RATES[m.model];
                return (
                  <div key={m.model} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38BDF8]" />
                        <span className="font-bold text-white">{m.name}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-white">
                        {m.tokens.toLocaleString("fr-FR")} tokens ({m.percentage}%)
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-[10px] text-[#9AA0B2] pt-1 border-t border-white/5">
                      <span>{m.requestsCount} requêtes exécutées</span>
                      {pricing && (
                        <span>Limites tier : {pricing.rpmLimit} RPM • {pricing.contextWindowTokens.toLocaleString("fr-FR")} ctx</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 7. TABLEAU D'HISTORIQUE COMPLET (SPEC EXACTE 6 & 12)                 */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#34D399]" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Historique détaillé des appels IA ({filteredRecords.length})
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleExportData('csv')}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs text-[#F87171] font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Effacer</span>
            </button>
          </div>
        </div>

        {/* Barre d'outils de filtres et recherche */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-[#9AA0B2] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Rechercher par fonctionnalité, modèle, snippet..."
              className="w-full glass-input pl-10 pr-3.5 py-2 text-xs text-white"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedCategoryFilter}
              onChange={(e) => {
                setSelectedCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full glass-input px-3 py-2 text-xs text-white bg-[#0B0F19]"
            >
              <option value="all">Toutes les fonctionnalités</option>
              {Object.entries(FEATURE_CATEGORY_DETAILS).map(([key, item]) => (
                <option key={key} value={key}>{item.label}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={selectedModelFilter}
              onChange={(e) => {
                setSelectedModelFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full glass-input px-3 py-2 text-xs text-white bg-[#0B0F19]"
            >
              <option value="all">Tous modèles</option>
              <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
              <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
              <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
              <option value="gemini-flash-latest">Gemini Flash Latest</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full glass-input px-3 py-2 text-xs text-white bg-[#0B0F19]"
            >
              <option value="date_desc">Plus récents</option>
              <option value="date_asc">Plus anciens</option>
              <option value="tokens_desc">Plus de tokens</option>
              <option value="cost_desc">Coût élevé</option>
            </select>
          </div>
        </div>

        {/* Tableau Responsive */}
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.01]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#9AA0B2]">
              <thead className="bg-white/5 text-[10px] uppercase font-bold text-[#9AA0B2] border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Date & Heure</th>
                  <th className="py-3 px-4">Fonctionnalité</th>
                  <th className="py-3 px-4">Modèle</th>
                  <th className="py-3 px-4 text-right font-mono">Input</th>
                  <th className="py-3 px-4 text-right font-mono">Output</th>
                  <th className="py-3 px-4 text-right font-mono text-white">Total</th>
                  <th className="py-3 px-4 text-right font-mono">Coût est.</th>
                  <th className="py-3 px-4 text-center">Source</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-xs text-[#9AA0B2]">
                      Aucun enregistrement ne correspond aux critères de recherche.
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((r) => {
                    const d = new Date(r.timestamp);
                    const formattedDate = !isNaN(d.getTime()) 
                      ? d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) 
                      : "--/--";
                    const formattedTime = !isNaN(d.getTime())
                      ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
                      : "--:--";
                    const featInfo = FEATURE_CATEGORY_DETAILS[r.featureCategory] || FEATURE_CATEGORY_DETAILS.other;

                    return (
                      <tr 
                        key={r.id}
                        onClick={() => setSelectedRecord(r)}
                        className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-4 text-white whitespace-nowrap">
                          <span className="font-semibold">{formattedDate}</span>{" "}
                          <span className="text-[10px] text-[#9AA0B2]">{formattedTime}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span 
                              style={{ color: featInfo.color }}
                              className="p-1 rounded-md bg-white/5 shrink-0"
                            >
                              {renderCategoryIcon(r.featureCategory, "w-3 h-3")}
                            </span>
                            <span className="font-semibold text-white truncate max-w-[200px]" title={r.feature}>
                              {r.feature}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-white font-mono">
                            {r.model}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[11px]">
                          {r.inputTokens.toLocaleString("fr-FR")}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[11px]">
                          {r.outputTokens.toLocaleString("fr-FR")}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white text-xs">
                          {r.totalTokens.toLocaleString("fr-FR")}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-400 text-[11px]">
                          {r.costEstimatedEuro < 0.0001 ? "< 0,0001 €" : `${r.costEstimatedEuro.toFixed(4)} €`}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            r.isExact 
                              ? "bg-purple-500/10 border-purple-500/25 text-[#C084FC]"
                              : "bg-amber-500/10 border-amber-500/25 text-amber-300"
                          }`}>
                            {r.isExact ? "API Reçue" : "Estimé"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRecord(r);
                            }}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#9AA0B2] hover:text-white transition-colors"
                            title="Voir les détails complets"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-3.5 border-t border-white/5 flex items-center justify-between text-xs text-[#9AA0B2]">
              <span>
                Affichage de {(currentPage - 1) * itemsPerPage + 1} à {Math.min(currentPage * itemsPerPage, filteredRecords.length)} sur {filteredRecords.length}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-bold text-white">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 8. MODAL DÉTAIL D'UNE REQUÊTE (SPEC EXACTE 12)                      */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rounded-3xl bg-[#0B0F19] border border-purple-500/30 p-6 sm:p-7 max-w-xl w-full shadow-2xl space-y-6 animate-scale-up">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-[#C084FC] flex items-center justify-center font-bold">
                  {renderCategoryIcon(selectedRecord.featureCategory, "w-5 h-5")}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedRecord.feature}</h3>
                  <p className="text-[10px] text-[#9AA0B2] font-mono">ID: {selectedRecord.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-2 rounded-xl text-[#9AA0B2] hover:text-white bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[10px] text-[#9AA0B2] block">Modèle utilisé</span>
                <span className="text-xs font-bold text-white font-mono">{selectedRecord.model}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[10px] text-[#9AA0B2] block">Date et Heure</span>
                <span className="text-xs font-bold text-white">
                  {new Date(selectedRecord.timestamp).toLocaleDateString("fr-FR")} {new Date(selectedRecord.timestamp).toLocaleTimeString("fr-FR")}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[10px] text-[#9AA0B2] block">Durée d'exécution</span>
                <span className="text-xs font-bold text-white font-mono">
                  {selectedRecord.durationMs ? `${selectedRecord.durationMs} ms` : "N/A"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[10px] text-[#9AA0B2] block">Tokens Input</span>
                <span className="text-xs font-bold text-white font-mono">{selectedRecord.inputTokens.toLocaleString("fr-FR")}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[10px] text-[#9AA0B2] block">Tokens Output</span>
                <span className="text-xs font-bold text-white font-mono">{selectedRecord.outputTokens.toLocaleString("fr-FR")}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[10px] text-[#9AA0B2] block">Total Tokens</span>
                <span className="text-xs font-black text-[#C084FC] font-mono">{selectedRecord.totalTokens.toLocaleString("fr-FR")}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#9AA0B2]">Coût estimé :</span>
                <span className="font-mono font-bold text-emerald-400">{selectedRecord.costEstimatedEuro.toFixed(6)} €</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#9AA0B2]">Statut & Fiabilité :</span>
                <span className="font-semibold text-white">
                  {selectedRecord.isExact ? "Fourni par l'API officielle (usageMetadata)" : "Estimation technique"}
                </span>
              </div>
            </div>

            {selectedRecord.contextSnippet && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#9AA0B2]">Aperçu du contexte (non sensible) :</label>
                <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs text-[#F5F6FA] font-mono leading-relaxed max-h-32 overflow-y-auto">
                  {selectedRecord.contextSnippet}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 9. MODAL PARAMÉTRAGE QUOTAS & ALERTES (SPEC EXACTE 2 & 9)           */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveSettings} className="rounded-3xl bg-[#0B0F19] border border-purple-500/30 p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-6 animate-scale-up">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-[#C084FC] flex items-center justify-center font-bold">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Quotas & Seuils d'Alerte</h3>
                  <p className="text-[11px] text-[#9AA0B2]">Personnalisez vos objectifs de consommation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="p-2 rounded-xl text-[#9AA0B2] hover:text-white bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-white">
                  Limite mensuelle de tokens (Optionnel)
                </label>
                <input
                  type="text"
                  value={customLimitInput}
                  onChange={(e) => setCustomLimitInput(e.target.value)}
                  placeholder="Ex: 50000000 (Laissez vide pour aucune limite)"
                  className="w-full glass-input px-3.5 py-2.5 text-xs text-white font-mono"
                />
                <p className="text-[10px] text-[#9AA0B2] leading-relaxed">
                  Si vous laissez ce champ vide, le système affichera <strong>"Limite non configurée"</strong>. Aucune fausse limite n'est inventée par NACORA.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <label className="font-semibold text-white">
                  Seuils d'alertes informatives
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[50, 75, 90, 100].map((th) => {
                    const isChecked = selectedThresholds.includes(th);
                    return (
                      <button
                        key={th}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            setSelectedThresholds(selectedThresholds.filter(t => t !== th));
                          } else {
                            setSelectedThresholds([...selectedThresholds, th].sort((a, b) => a - b));
                          }
                        }}
                        className={`py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isChecked 
                            ? "bg-purple-500/20 border-purple-500/40 text-[#C084FC]"
                            : "bg-white/5 border-white/10 text-[#9AA0B2]"
                        }`}
                      >
                        {th} %
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-[#9AA0B2]">
                  Les alertes sont déclenchées lorsque votre consommation franchit ces paliers.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#9AA0B2] hover:text-white transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-[#D81A45] hover:opacity-90 text-xs font-bold text-white transition-all shadow-lg shadow-purple-600/30 cursor-pointer"
              >
                Enregistrer les quotas
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 10. MODAL CONFIRMATION RESET HISTORIQUE                             */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rounded-3xl bg-[#0B0F19] border border-red-500/40 p-6 max-w-md w-full shadow-2xl space-y-5 animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-[#F87171]">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Réinitialiser l'historique IA ?</h3>
              <p className="text-xs text-[#9AA0B2] leading-relaxed">
                Cette action effacera les journaux d'appels IA locaux. Les fonctionnalités existantes continueront de fonctionner normalement et de nouveaux enregistrements seront créés dès vos prochains appels.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleResetHistory}
                className="px-4.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white transition-all shadow-lg shadow-red-600/30 cursor-pointer"
              >
                Confirmer l'effacement
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
};
