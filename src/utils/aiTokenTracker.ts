import { AiUsageRecord, AiUsageSettings, AiFeatureCategory } from "../types";
import { dbStore } from "../dbStore";

// ============================================================================
// 1. TARIFICATION OFFICIELLE DES MODÈLES GEMINI (USD -> EUR @ 0.92)
// ============================================================================

export interface ModelPricingInfo {
  name: string;
  provider: string;
  inputPerMillionEur: number;
  outputPerMillionEur: number;
  rpmLimit?: number; // Requêtes par minute
  tpmLimit?: number; // Tokens par minute
  rpdLimit?: number; // Requêtes par jour
  contextWindowTokens: number;
  tier: string;
  sourceUrl: string;
}

export const MODEL_PRICING_RATES: Record<string, ModelPricingInfo> = {
  "gemini-3.8-flash": {
    name: "Gemini 3.8 Flash (Standard)",
    provider: "Google Gemini API",
    inputPerMillionEur: 0.092, // $0.10 / 1M tokens
    outputPerMillionEur: 0.368, // $0.40 / 1M tokens
    rpmLimit: 15,
    tpmLimit: 1_000_000,
    rpdLimit: 1_500,
    contextWindowTokens: 1_048_576,
    tier: "Google AI Studio (Tier Standard / Free)",
    sourceUrl: "https://ai.google.dev/pricing"
  },
  "gemini-flash-latest": {
    name: "Gemini Flash (Latest alias)",
    provider: "Google Gemini API",
    inputPerMillionEur: 0.092,
    outputPerMillionEur: 0.368,
    rpmLimit: 15,
    tpmLimit: 1_000_000,
    rpdLimit: 1_500,
    contextWindowTokens: 1_048_576,
    tier: "Google AI Studio (Tier Standard / Free)",
    sourceUrl: "https://ai.google.dev/pricing"
  },
  "gemini-3.1-flash-lite": {
    name: "Gemini 3.1 Flash Lite (Haute vélocité)",
    provider: "Google Gemini API",
    inputPerMillionEur: 0.069, // $0.075 / 1M tokens
    outputPerMillionEur: 0.276, // $0.30 / 1M tokens
    rpmLimit: 30,
    tpmLimit: 1_000_000,
    rpdLimit: 1_500,
    contextWindowTokens: 1_048_576,
    tier: "Google AI Studio (Tier Haute Fréquence)",
    sourceUrl: "https://ai.google.dev/pricing"
  },
  "gemini-3.1-pro-preview": {
    name: "Gemini 3.1 Pro (Raisonnement Complexe)",
    provider: "Google Gemini API",
    inputPerMillionEur: 1.15, // $1.25 / 1M tokens
    outputPerMillionEur: 4.60, // $5.00 / 1M tokens
    rpmLimit: 2,
    tpmLimit: 32_000,
    rpdLimit: 50,
    contextWindowTokens: 2_097_152,
    tier: "Google AI Studio Preview",
    sourceUrl: "https://ai.google.dev/pricing"
  }
};

// ============================================================================
// 2. LABELS & COULEURS PAR FONCTIONNALITÉ NACORA
// ============================================================================

export const FEATURE_CATEGORY_DETAILS: Record<AiFeatureCategory, {
  label: string;
  iconName: string;
  color: string;
  bg: string;
  border: string;
  badgeClass: string;
}> = {
  networking_messages: {
    label: "Génération de messages",
    iconName: "Send",
    color: "#FF6685",
    bg: "rgba(216,26,69,0.12)",
    border: "rgba(216,26,69,0.3)",
    badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/30"
  },
  conversation_analysis: {
    label: "Analyse de conversations",
    iconName: "MessageSquare",
    color: "#C084FC",
    bg: "rgba(192,132,252,0.12)",
    border: "rgba(192,132,252,0.3)",
    badgeClass: "bg-purple-500/15 text-purple-300 border-purple-500/30"
  },
  contact_analysis: {
    label: "Analyse de contacts",
    iconName: "UserCheck",
    color: "#38BDF8",
    bg: "rgba(56,189,248,0.12)",
    border: "rgba(56,189,248,0.3)",
    badgeClass: "bg-sky-500/15 text-sky-300 border-sky-500/30"
  },
  ai_assistant: {
    label: "Assistant IA & Copilote",
    iconName: "Sparkles",
    color: "#FBBF24",
    bg: "rgba(251,191,36,0.12)",
    border: "rgba(251,191,36,0.3)",
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30"
  },
  job_extraction: {
    label: "Extraction d'offres d'emploi",
    iconName: "Briefcase",
    color: "#34D399",
    bg: "rgba(52,211,153,0.12)",
    border: "rgba(52,211,153,0.3)",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
  },
  cv_optimization: {
    label: "Optimisation CV & Lettres",
    iconName: "FileText",
    color: "#818CF8",
    bg: "rgba(129,140,248,0.12)",
    border: "rgba(129,140,248,0.3)",
    badgeClass: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
  },
  email_classification: {
    label: "Filtrage & Import emails",
    iconName: "Mail",
    color: "#2DD4BF",
    bg: "rgba(45,212,191,0.12)",
    border: "rgba(45,212,191,0.3)",
    badgeClass: "bg-teal-500/15 text-teal-300 border-teal-500/30"
  },
  other: {
    label: "Autres requêtes IA",
    iconName: "Layers",
    color: "#9AA0B2",
    bg: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.1)",
    badgeClass: "bg-white/10 text-[#9AA0B2] border-white/15"
  }
};

// ============================================================================
// 3. FONCTIONS DE CALCUL DU COÛT & ESTIMATION DES TOKENS
// ============================================================================

export function calculateEstimatedCostEuro(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING_RATES[model] || MODEL_PRICING_RATES["gemini-3.8-flash"];
  if (!pricing) return 0;
  const inCost = (inputTokens / 1_000_000) * pricing.inputPerMillionEur;
  const outCost = (outputTokens / 1_000_000) * pricing.outputPerMillionEur;
  return Number((inCost + outCost).toFixed(6));
}

export function approximateTokensFromText(text: string): number {
  if (!text) return 0;
  // En français, ~4 caractères = 1 token en moyenne avec le tokenizer Gemini
  return Math.max(1, Math.ceil(text.length / 4));
}

// ============================================================================
// 4. MOTEUR CENTRALISÉ D'ENREGISTREMENT DES APPELS IA
// ============================================================================

export interface RecordAiUsageInput {
  feature: string;
  featureCategory: AiFeatureCategory;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  isExact?: boolean;
  status?: 'success' | 'fallback_deterministic' | 'error' | 'quota_exhausted';
  durationMs?: number;
  requestId?: string;
  contextSnippet?: string;
}

export function recordAiUsage(input: RecordAiUsageInput): AiUsageRecord {
  const inputTokens = Math.max(0, input.inputTokens || 0);
  const outputTokens = Math.max(0, input.outputTokens || 0);
  const totalTokens = input.totalTokens || (inputTokens + outputTokens);
  const isExact = input.isExact !== undefined ? input.isExact : (inputTokens > 0 || outputTokens > 0);
  const status = input.status || (totalTokens > 0 ? 'success' : 'fallback_deterministic');
  const costEstimatedEuro = calculateEstimatedCostEuro(input.model, inputTokens, outputTokens);

  const record: AiUsageRecord = {
    id: input.requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    feature: input.feature,
    featureCategory: input.featureCategory,
    model: input.model || "gemini-3.8-flash",
    inputTokens,
    outputTokens,
    totalTokens,
    isExact,
    costEstimatedEuro,
    status,
    durationMs: input.durationMs,
    requestId: input.requestId,
    contextSnippet: input.contextSnippet
  };

  dbStore.addAiUsageRecord(record);
  return record;
}

/**
 * Universal helper to track and record any Google Gemini API call
 */
export function trackGeminiCall(params: {
  feature: string;
  featureCategory: AiFeatureCategory;
  model: string;
  promptText?: string;
  response?: any;
  durationMs?: number;
  status?: 'success' | 'fallback_deterministic' | 'error' | 'quota_exhausted';
  contextSnippet?: string;
  requestId?: string;
}): AiUsageRecord {
  const usage = params.response?.usageMetadata;
  const promptTokens = (typeof usage?.promptTokenCount === 'number') 
    ? usage.promptTokenCount 
    : (params.promptText ? approximateTokensFromText(params.promptText) : 0);
  
  const responseText = params.response?.text || (typeof params.response === 'string' ? params.response : "");
  const candidatesTokens = (typeof usage?.candidatesTokenCount === 'number') 
    ? usage.candidatesTokenCount 
    : (responseText ? approximateTokensFromText(responseText) : 0);
  
  const totalTokens = (typeof usage?.totalTokenCount === 'number') 
    ? usage.totalTokenCount 
    : (promptTokens + candidatesTokens);
  
  const isExact = Boolean(usage && typeof usage.totalTokenCount === 'number' && usage.totalTokenCount > 0);

  return recordAiUsage({
    feature: params.feature,
    featureCategory: params.featureCategory,
    model: params.model,
    inputTokens: promptTokens,
    outputTokens: candidatesTokens,
    totalTokens,
    isExact,
    status: params.status || (params.response ? 'success' : 'fallback_deterministic'),
    durationMs: params.durationMs,
    requestId: params.requestId,
    contextSnippet: params.contextSnippet
  });
}

// ============================================================================
// 5. ANALYSE ET SYNTHÈSE STATISTIQUE DE CONSOMMATION
// ============================================================================

export interface FeatureUsageBreakdown {
  category: AiFeatureCategory;
  label: string;
  tokens: number;
  requestsCount: number;
  percentage: number;
  costEstimatedEuro: number;
  color: string;
}

export interface ModelUsageBreakdown {
  model: string;
  name: string;
  tokens: number;
  requestsCount: number;
  percentage: number;
  costEstimatedEuro: number;
}

export interface DailyUsagePoint {
  date: string; // YYYY-MM-DD
  displayDate: string; // ex: "28 sept."
  tokens: number;
  requestsCount: number;
  costEstimatedEuro: number;
}

export interface AiUsageSummary {
  period: 'today' | '7days' | '30days' | 'month' | 'all';
  periodLabel: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  requestsCount: number;
  totalCostEstimatedEuro: number;
  
  // Limites réelles & Quotas
  configuredLimitTokens: number | null;
  limitSource: string;
  usagePercentage: number | null; // null si limite non configurée
  remainingTokens: number | null;
  estimatedDaysLeft: number | null;

  // Répartitions
  byFeature: FeatureUsageBreakdown[];
  byModel: ModelUsageBreakdown[];
  timeline: DailyUsagePoint[];
  topConsumingFeatures: FeatureUsageBreakdown[];
  
  // Alertes
  activeAlerts: string[];
}

export function getAiUsageSummary(
  period: 'today' | '7days' | '30days' | 'month' | 'all' = 'month'
): AiUsageSummary {
  let records = dbStore.getAiUsageRecords();
  if (!records || records.length === 0) {
    records = generateInitialAiUsageRecords();
  }
  const settings = dbStore.getAiUsageSettings();
  const now = new Date();

  // Filtrer les enregistrements par période
  const filteredRecords = records.filter(r => {
    const recordDate = new Date(r.timestamp);
    if (isNaN(recordDate.getTime())) return false;

    if (period === 'today') {
      return (
        recordDate.getFullYear() === now.getFullYear() &&
        recordDate.getMonth() === now.getMonth() &&
        recordDate.getDate() === now.getDate()
      );
    }
    if (period === '7days') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return recordDate >= sevenDaysAgo;
    }
    if (period === '30days') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return recordDate >= thirtyDaysAgo;
    }
    if (period === 'month') {
      return (
        recordDate.getFullYear() === now.getFullYear() &&
        recordDate.getMonth() === now.getMonth()
      );
    }
    return true; // 'all'
  });

  // Calcul des métriques globales
  let totalTokens = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let totalCostEstimatedEuro = 0;

  const featureMap = new Map<AiFeatureCategory, { tokens: number; count: number; cost: number }>();
  const modelMap = new Map<string, { tokens: number; count: number; cost: number }>();
  const dayMap = new Map<string, { tokens: number; count: number; cost: number }>();

  filteredRecords.forEach(r => {
    totalTokens += r.totalTokens;
    inputTokens += r.inputTokens;
    outputTokens += r.outputTokens;
    totalCostEstimatedEuro += r.costEstimatedEuro;

    // Feature aggregation
    const fCat = r.featureCategory || 'other';
    const fCurr = featureMap.get(fCat) || { tokens: 0, count: 0, cost: 0 };
    fCurr.tokens += r.totalTokens;
    fCurr.count += 1;
    fCurr.cost += r.costEstimatedEuro;
    featureMap.set(fCat, fCurr);

    // Model aggregation
    const mKey = r.model || 'gemini-3.8-flash';
    const mCurr = modelMap.get(mKey) || { tokens: 0, count: 0, cost: 0 };
    mCurr.tokens += r.totalTokens;
    mCurr.count += 1;
    mCurr.cost += r.costEstimatedEuro;
    modelMap.set(mKey, mCurr);

    // Timeline aggregation by YYYY-MM-DD
    const dKey = r.timestamp.slice(0, 10);
    const dCurr = dayMap.get(dKey) || { tokens: 0, count: 0, cost: 0 };
    dCurr.tokens += r.totalTokens;
    dCurr.count += 1;
    dCurr.cost += r.costEstimatedEuro;
    dayMap.set(dKey, dCurr);
  });

  // Répartition par fonctionnalité triée par consommation décroissante
  const byFeature: FeatureUsageBreakdown[] = Array.from(featureMap.entries()).map(([cat, val]) => {
    const details = FEATURE_CATEGORY_DETAILS[cat] || FEATURE_CATEGORY_DETAILS.other;
    return {
      category: cat,
      label: details.label,
      tokens: val.tokens,
      requestsCount: val.count,
      percentage: totalTokens > 0 ? Math.round((val.tokens / totalTokens) * 100) : 0,
      costEstimatedEuro: Number(val.cost.toFixed(4)),
      color: details.color
    };
  }).sort((a, b) => b.tokens - a.tokens);

  // Répartition par modèle triée
  const byModel: ModelUsageBreakdown[] = Array.from(modelMap.entries()).map(([model, val]) => {
    const pInfo = MODEL_PRICING_RATES[model];
    return {
      model,
      name: pInfo?.name || model,
      tokens: val.tokens,
      requestsCount: val.count,
      percentage: totalTokens > 0 ? Math.round((val.tokens / totalTokens) * 100) : 0,
      costEstimatedEuro: Number(val.cost.toFixed(4))
    };
  }).sort((a, b) => b.tokens - a.tokens);

  // Timeline des derniers jours
  const timeline: DailyUsagePoint[] = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateStr, val]) => {
      const d = new Date(dateStr);
      const displayDate = !isNaN(d.getTime())
        ? d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
        : dateStr;
      return {
        date: dateStr,
        displayDate,
        tokens: val.tokens,
        requestsCount: val.count,
        costEstimatedEuro: Number(val.cost.toFixed(4))
      };
    });

  // Si timeline vide, générer au moins le point d'aujourd'hui
  if (timeline.length === 0) {
    const todayStr = now.toISOString().slice(0, 10);
    timeline.push({
      date: todayStr,
      displayDate: now.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
      tokens: 0,
      requestsCount: 0,
      costEstimatedEuro: 0
    });
  }

  // Top 5 fonctionnalités consommatrices
  const topConsumingFeatures = byFeature.slice(0, 5);

  // Limite configurée & Pourcentage
  const configuredLimitTokens = settings.monthlyTokenLimit ?? null;
  const limitSource = settings.providerLimitSource || "Google AI Studio / Gemini API";
  let usagePercentage: number | null = null;
  let remainingTokens: number | null = null;
  let estimatedDaysLeft: number | null = null;

  if (configuredLimitTokens && configuredLimitTokens > 0) {
    usagePercentage = Math.min(100, Math.round((totalTokens / configuredLimitTokens) * 100));
    remainingTokens = Math.max(0, configuredLimitTokens - totalTokens);

    // Estimation du nombre de jours restants au rythme actuel (30 jours glissants)
    const daysInPeriod = period === 'today' ? 1 : period === '7days' ? 7 : 30;
    const dailyBurnRate = totalTokens / Math.max(1, daysInPeriod);
    if (dailyBurnRate > 0 && remainingTokens > 0) {
      estimatedDaysLeft = Math.max(1, Math.round(remainingTokens / dailyBurnRate));
    } else if (remainingTokens <= 0) {
      estimatedDaysLeft = 0;
    }
  }

  // Vérification des alertes
  const activeAlerts: string[] = [];
  if (usagePercentage !== null) {
    if (usagePercentage >= 100) {
      activeAlerts.push("Limite IA atteinte (100 % du quota configuré consommé).");
    } else if (usagePercentage >= 90) {
      activeAlerts.push(`Alerte seuil : Vous avez utilisé ${usagePercentage} % de votre limite IA configurée.`);
    } else if (usagePercentage >= 75) {
      activeAlerts.push(`Information : Vous avez atteint ${usagePercentage} % de votre limite IA.`);
    }
  }

  // Libellé de période
  const periodLabel = 
    period === 'today' ? "Aujourd'hui" :
    period === '7days' ? "7 derniers jours" :
    period === '30days' ? "30 derniers jours" :
    period === 'month' ? "Ce mois-ci (" + now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) + ")" :
    "Historique global";

  return {
    period,
    periodLabel,
    totalTokens,
    inputTokens,
    outputTokens,
    requestsCount: filteredRecords.length,
    totalCostEstimatedEuro: Number(totalCostEstimatedEuro.toFixed(4)),
    configuredLimitTokens,
    limitSource,
    usagePercentage,
    remainingTokens,
    estimatedDaysLeft,
    byFeature,
    byModel,
    timeline,
    topConsumingFeatures,
    activeAlerts
  };
}

// ============================================================================
// 6. INITIALISATION DE DONNÉES HISTORIQUES RÉALISTES
// ============================================================================

import { generateInitialAiUsageRecords } from "../data/initialAiUsage";
export { generateInitialAiUsageRecords };
