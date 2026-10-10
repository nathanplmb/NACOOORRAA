import { AiUsageRecord } from "../types";

export function generateInitialAiUsageRecords(): AiUsageRecord[] {
  const records: AiUsageRecord[] = [
    {
      id: "req_init_1",
      timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      feature: "Génération message LinkedIn",
      featureCategory: "networking_messages",
      model: "gemini-3.8-flash",
      inputTokens: 2450,
      outputTokens: 630,
      totalTokens: 3080,
      isExact: true,
      costEstimatedEuro: 0.00045,
      status: "success",
      durationMs: 780,
      contextSnippet: "Accroche personnalisée pour contact BNP Paribas (Banque Privée)"
    },
    {
      id: "req_init_2",
      timestamp: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
      feature: "Analyse et reconstruction de conversation",
      featureCategory: "conversation_analysis",
      model: "gemini-3.8-flash",
      inputTokens: 4200,
      outputTokens: 1100,
      totalTokens: 5300,
      isExact: true,
      costEstimatedEuro: 0.00079,
      status: "success",
      durationMs: 1120,
      contextSnippet: "Reconstruction discussion 4 messages avec Sébastien Champroux"
    },
    {
      id: "req_init_3",
      timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      feature: "Analyse stratégique de contact",
      featureCategory: "contact_analysis",
      model: "gemini-3.8-flash",
      inputTokens: 1850,
      outputTokens: 480,
      totalTokens: 2330,
      isExact: true,
      costEstimatedEuro: 0.00034,
      status: "success",
      durationMs: 640,
      contextSnippet: "Diagnostic de profil et points d'accroche sectoriels"
    },
    {
      id: "req_init_4",
      timestamp: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
      feature: "Extraction intelligente d'offre",
      featureCategory: "job_extraction",
      model: "gemini-3.8-flash",
      inputTokens: 3100,
      outputTokens: 750,
      totalTokens: 3850,
      isExact: true,
      costEstimatedEuro: 0.00056,
      status: "success",
      durationMs: 910,
      contextSnippet: "Extraction fiche de poste Analyste M&A / Financement"
    },
    {
      id: "req_init_5",
      timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      feature: "Conseiller Carrière & Copilote",
      featureCategory: "ai_assistant",
      model: "gemini-3.8-flash",
      inputTokens: 1600,
      outputTokens: 520,
      totalTokens: 2120,
      isExact: true,
      costEstimatedEuro: 0.00033,
      status: "success",
      durationMs: 580,
      contextSnippet: "Session d'orientation sur le marché du Private Banking"
    }
  ];

  return records;
}
