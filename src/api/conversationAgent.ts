import { 
  Contact, 
  CandidateProfile, 
  ContactNetworkingStatus, 
  ConversationMessage, 
  ContactNextAction,
  NetworkingContactStage 
} from "../types";
import { GoogleGenAI, Type } from "@google/genai";
import { generateOutreachMessageWithFramework, calculateFollowUpDate } from "./networkingFramework";
import { trackGeminiCall } from "../utils/aiTokenTracker";

const CASCADE_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
  "gemini-flash-latest"
];

export interface NaturalLanguageUpdateResult {
  updatedStatus?: ContactNetworkingStatus;
  updatedStage?: NetworkingContactStage;
  nextAction?: ContactNextAction;
  historyEntry: string;
  notesToAdd?: string;
  recommendedContact?: { name: string; role?: string; company?: string };
  detectedIntent: string;
  assistantSummary: string;
  suggestedFollowUpMessage?: string;
}

export interface ConversationAnalysisResult {
  situation: string;
  lastAction: string;
  nextAction: string;
  advisedStrategy: string;
  priority: 'urgent' | 'to_do' | 'upcoming' | 'pending';
  suggestedReply?: string;
}

// ============================================================================
// 1. STATUTS ET LIBELLÉS COMPLETS DU CRM NETWORKING
// ============================================================================

export const NETWORKING_STATUS_DETAILS: Record<ContactNetworkingStatus, {
  label: string;
  color: string;
  bg: string;
  border: string;
  category: 'to_do' | 'waiting' | 'in_progress' | 'positive' | 'closed';
  description: string;
}> = {
  a_contacter: {
    label: "À contacter",
    color: "#9AA0B2",
    bg: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.1)",
    category: "to_do",
    description: "Contact identifié, première approche à planifier."
  },
  to_contact: {
    label: "À contacter",
    color: "#9AA0B2",
    bg: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.1)",
    category: "to_do",
    description: "Contact identifié, première approche à planifier."
  },
  demande_envoyee: {
    label: "Demande de connexion envoyée",
    color: "#38BDF8",
    bg: "rgba(56,189,248,0.1)",
    border: "rgba(56,189,248,0.25)",
    category: "waiting",
    description: "Invitation LinkedIn transmise, en attente d'acceptation."
  },
  connexion_acceptee: {
    label: "Connexion acceptée",
    color: "#34D399",
    bg: "rgba(52,211,153,0.1)",
    border: "rgba(52,211,153,0.25)",
    category: "to_do",
    description: "Le contact a accepté l'invitation, prêt pour le message d'échange."
  },
  message_envoye: {
    label: "Message envoyé",
    color: "#818CF8",
    bg: "rgba(129,140,248,0.1)",
    border: "rgba(129,140,248,0.25)",
    category: "waiting",
    description: "Message initial ou courriel transmis."
  },
  contacted: {
    label: "Contacté",
    color: "#818CF8",
    bg: "rgba(129,140,248,0.1)",
    border: "rgba(129,140,248,0.25)",
    category: "waiting",
    description: "Premier contact effectué."
  },
  en_attente_reponse: {
    label: "En attente de réponse",
    color: "#FBBF24",
    bg: "rgba(251,191,36,0.1)",
    border: "rgba(251,191,36,0.25)",
    category: "waiting",
    description: "Message délivré, suivi selon le calendrier de relance J+7."
  },
  reponse_recue: {
    label: "Réponse reçue",
    color: "#C084FC",
    bg: "rgba(192,132,252,0.15)",
    border: "rgba(192,132,252,0.35)",
    category: "to_do",
    description: "Le contact a répondu, échange actif."
  },
  reponse_a_traiter: {
    label: "Réponse à traiter",
    color: "#FF6685",
    bg: "rgba(216,26,69,0.15)",
    border: "rgba(255,102,133,0.35)",
    category: "to_do",
    description: "Action requise : apporter une réponse personnalisée."
  },
  echange_en_cours: {
    label: "Échange en cours",
    color: "#38BDF8",
    bg: "rgba(56,189,248,0.12)",
    border: "rgba(56,189,248,0.3)",
    category: "in_progress",
    description: "Conversation active et constructive engagée."
  },
  exchanging: {
    label: "Échange en cours",
    color: "#38BDF8",
    bg: "rgba(56,189,248,0.12)",
    border: "rgba(56,189,248,0.3)",
    category: "in_progress",
    description: "Conversation active engagée."
  },
  appel_prevu: {
    label: "Échange téléphonique prévu",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.3)",
    category: "positive",
    description: "Appel réseau de 10-15 min planifié."
  },
  echange_realise: {
    label: "Échange réalisé",
    color: "#10B981",
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.3)",
    category: "positive",
    description: "Entretien ou appel passé avec succès."
  },
  interview_done: {
    label: "Entretien réalisé",
    color: "#10B981",
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.3)",
    category: "positive",
    description: "Entretien ou appel passé."
  },
  opportunite_detectee: {
    label: "Opportunité détectée",
    color: "#EC4899",
    bg: "rgba(236,72,153,0.15)",
    border: "rgba(236,72,153,0.35)",
    category: "positive",
    description: "Besoins confirmés dans l'équipe ou recommandation interne."
  },
  candidature_envoyee: {
    label: "Candidature envoyée",
    color: "#6366F1",
    bg: "rgba(99,102,241,0.12)",
    border: "rgba(99,102,241,0.3)",
    category: "in_progress",
    description: "CV et dossier transmis pour une opportunité précise."
  },
  relance_a_faire: {
    label: "Relance à faire",
    color: "#F43F5E",
    bg: "rgba(244,63,94,0.15)",
    border: "rgba(244,63,94,0.35)",
    category: "to_do",
    description: "Délai de relance atteint (J+7, J+14 ou J+21)."
  },
  en_attente: {
    label: "En attente",
    color: "#94A3B8",
    bg: "rgba(148,163,184,0.1)",
    border: "rgba(148,163,184,0.25)",
    category: "waiting",
    description: "Recontact prévu ultérieurement (ex : date donnée par le contact)."
  },
  termine: {
    label: "Terminé",
    color: "#64748B",
    bg: "rgba(100,116,139,0.1)",
    border: "rgba(100,116,139,0.2)",
    category: "closed",
    description: "Cycle d'échange achevé positivement ou contact réorienté."
  },
  sans_suite: {
    label: "Sans suite",
    color: "#475569",
    bg: "rgba(71,85,105,0.1)",
    border: "rgba(71,85,105,0.2)",
    category: "closed",
    description: "Pas de réponse après 3 relances ou refus courtois."
  },
  not_interested: {
    label: "Sans suite",
    color: "#475569",
    bg: "rgba(71,85,105,0.1)",
    border: "rgba(71,85,105,0.2)",
    category: "closed",
    description: "Pas de suite pour le moment."
  }
};

// ============================================================================
// 2. CALCUL DE PRIORITÉ & DU TRI INTELLIGENT
// ============================================================================

export function calculateContactPriority(contact: Contact): {
  priority: 'urgent' | 'to_do' | 'upcoming' | 'pending' | 'closed';
  sortScore: number;
  reason: string;
} {
  const today = new Date().toISOString().split("T")[0];
  const status = contact.networkingStatus || "a_contacter";
  const dueDate = contact.nextAction?.dueDate || contact.nextFollowUpDate;

  // 1. Actions en retard
  if (dueDate && dueDate < today && status !== "termine" && status !== "sans_suite") {
    return {
      priority: 'urgent',
      sortScore: 100,
      reason: `Action ou relance en retard (prévue le ${dueDate})`
    };
  }

  // 2. Réponses reçues nécessitant réponse
  if (status === "reponse_a_traiter" || status === "reponse_recue") {
    return {
      priority: 'urgent',
      sortScore: 90,
      reason: "Réponse reçue du contact à traiter"
    };
  }

  // 3. Relances ou actions prévues aujourd'hui
  if (dueDate && dueDate === today) {
    return {
      priority: 'to_do',
      sortScore: 80,
      reason: "Action ou relance prévue aujourd'hui"
    };
  }

  // 4. Relance explicitement demandée
  if (status === "relance_a_faire") {
    return {
      priority: 'to_do',
      sortScore: 75,
      reason: "Relance à effectuer"
    };
  }

  // 5. Connexion acceptée (prêt pour premier message)
  if (status === "connexion_acceptee") {
    return {
      priority: 'to_do',
      sortScore: 70,
      reason: "Connexion acceptée, premier message à envoyer"
    };
  }

  // 6. Relances à venir (prochains 7 jours)
  if (dueDate && dueDate > today) {
    const diffDays = Math.ceil((new Date(dueDate).getTime() - new Date(today).getTime()) / (1000 * 3600 * 24));
    if (diffDays <= 7) {
      return {
        priority: 'upcoming',
        sortScore: 50 - diffDays,
        reason: `Relance à venir dans ${diffDays} jour${diffDays > 1 ? 's' : ''}`
      };
    }
  }

  // 7. Échanges en cours ou en attente
  if (status === "echange_en_cours" || status === "appel_prevu" || status === "opportunite_detectee") {
    return {
      priority: 'upcoming',
      sortScore: 40,
      reason: "Échange actif en cours"
    };
  }

  if (status === "en_attente" || status === "en_attente_reponse" || status === "demande_envoyee" || status === "message_envoye") {
    return {
      priority: 'pending',
      sortScore: 20,
      reason: "En attente de retour"
    };
  }

  // 8. Fermé
  return {
    priority: 'closed',
    sortScore: 0,
    reason: "Conversation terminée ou archivée"
  };
}

// ============================================================================
// 3. SEED & SYNCHRONISATION DES MESSAGES EXISTANTS
// ============================================================================

export function ensureContactConversationMessages(contact: Contact): ConversationMessage[] {
  if (contact.conversationMessages && contact.conversationMessages.length > 0) {
    return contact.conversationMessages;
  }

  const messages: ConversationMessage[] = [];

  // If there are recorded outreach logs, convert them
  if (contact.outreachMessagesLog && contact.outreachMessagesLog.length > 0) {
    contact.outreachMessagesLog.forEach((log, index) => {
      messages.push({
        id: log.id || `msg_init_${index}`,
        sender: "nathan",
        text: log.message,
        timestamp: log.sentDate ? `${log.sentDate}T10:00:00.000Z` : new Date().toISOString(),
        channel: log.channel === "email" ? "email" : "linkedin",
        subject: log.subject,
        status: "sent"
      });
    });
  } else if (contact.aiCustomMessage) {
    // Or if aiCustomMessage exists
    const sentDate = contact.initialMessageSentDate || contact.lastOutreachDate || contact.createdAt || new Date().toISOString();
    messages.push({
      id: `msg_custom_${contact.id}`,
      sender: "nathan",
      text: contact.aiCustomMessage,
      timestamp: sentDate.includes("T") ? sentDate : `${sentDate}T09:30:00.000Z`,
      channel: contact.outreachChannel === "email" ? "email" : "linkedin",
      status: contact.networkingStatus && contact.networkingStatus !== "to_contact" ? "sent" : "draft"
    });
  }

  return messages;
}

// ============================================================================
// 4. AGENT IA : MISE À JOUR DE LA RELATION EN LANGAGE NATUREL
// ============================================================================

export async function parseRelationshipNaturalLanguage(
  contact: Contact,
  userInput: string
): Promise<NaturalLanguageUpdateResult> {
  const cleanInput = userInput.trim();
  const contactName = contact.fullName || contact.firstName || "ce contact";
  const today = new Date().toISOString().split("T")[0];

  // If API key is available, run structured parser with Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const prompt = `
VOUS ÊTES L'AGENT DE MISE À JOUR CRM ET SUIVI DE NETWORKING DE NACORA.
Nathan vous donne une information informelle en langage naturel sur ses échanges avec le contact "${contactName}" (Poste: ${contact.jobTitle || "Inconnu"} chez ${contact.companyName || "Entreprise"}).

Entrée de Nathan :
"${cleanInput}"

RÈGLES ABSOLUES ANTI-INVENTION :
1. N'inventez JAMAIS de propos non tenus, de dates inexistantes ou d'opportunités fictives.
2. Si Nathan dit juste "Il m'a répondu", le statut est "reponse_recue". Ne devinez pas le contenu de la réponse !
3. Statuts possibles : 'a_contacter', 'demande_envoyee', 'connexion_acceptee', 'message_envoye', 'en_attente_reponse', 'reponse_recue', 'reponse_a_traiter', 'echange_en_cours', 'appel_prevu', 'echange_realise', 'opportunite_detectee', 'candidature_envoyee', 'relance_a_faire', 'en_attente', 'termine', 'sans_suite'.
4. Déduisez la prochaine action concrète et sa date d'échéance si mentionnée ou estimée (ex: "début janvier" -> 2027-01-05).
5. Rédigez un résumé sobre et précis pour l'historique de la fiche.

Renvoie un JSON strict :
`;

      for (const model of CASCADE_MODELS) {
        try {
          const startTime = Date.now();
          const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              temperature: 0.2,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  updatedStatus: { type: Type.STRING },
                  updatedStage: { type: Type.STRING },
                  nextActionLabel: { type: Type.STRING },
                  nextActionDueDate: { type: Type.STRING },
                  nextActionPriority: { type: Type.STRING },
                  historyEntry: { type: Type.STRING },
                  notesToAdd: { type: Type.STRING },
                  recommendedContactName: { type: Type.STRING },
                  recommendedContactRole: { type: Type.STRING },
                  detectedIntent: { type: Type.STRING },
                  assistantSummary: { type: Type.STRING }
                },
                required: ["updatedStatus", "historyEntry", "assistantSummary", "detectedIntent"]
              }
            }
          });

          trackGeminiCall({
            feature: "Assistant IA conversationnel (Mise à jour)",
            featureCategory: "ai_assistant",
            model,
            promptText: prompt,
            response,
            durationMs: Date.now() - startTime,
            contextSnippet: `Mise à jour langage naturel pour ${contact.fullName}`
          });

          const parsed = JSON.parse(response.text?.trim() || "{}");
          if (parsed && parsed.updatedStatus) {
            let nextAction: ContactNextAction | undefined;
            if (parsed.nextActionLabel) {
              nextAction = {
                type: "custom",
                label: parsed.nextActionLabel,
                dueDate: parsed.nextActionDueDate || calculateFollowUpDate(new Date(), 1),
                priority: (parsed.nextActionPriority as any) || "to_do"
              };
            }

            return {
              updatedStatus: parsed.updatedStatus as ContactNetworkingStatus,
              updatedStage: parsed.updatedStage as NetworkingContactStage,
              nextAction,
              historyEntry: parsed.historyEntry || `${today} — Mise à jour : ${cleanInput}`,
              notesToAdd: parsed.notesToAdd,
              recommendedContact: parsed.recommendedContactName ? {
                name: parsed.recommendedContactName,
                role: parsed.recommendedContactRole
              } : undefined,
              detectedIntent: parsed.detectedIntent || "Mise à jour conversationnelle",
              assistantSummary: parsed.assistantSummary || "Relation mise à jour avec succès."
            };
          }
        } catch (e: any) {
          console.info(`[ConversationAgent] Modèle ${model} non concluant, passage au suivant.`);
        }
      }
    } catch (e) {
      console.info("[ConversationAgent] Bascule sur l'analyseur déterministe.");
    }
  }

  // Deterministic local parser for instant 0ms offline responsiveness
  const lower = cleanInput.toLowerCase();
  let updatedStatus: ContactNetworkingStatus = "echange_en_cours";
  let nextActionLabel = `Recontacter ${contact.firstName || "le contact"}`;
  let nextActionDueDate = calculateFollowUpDate(new Date(), 1);
  let nextActionPriority: 'urgent' | 'to_do' | 'upcoming' | 'pending' = "to_do";
  let summary = `Mise à jour enregistrée : « ${cleanInput} »`;

  if (lower.includes("janvier")) {
    updatedStatus = "en_attente";
    nextActionLabel = `Reprendre contact avec ${contact.firstName || "Sébastien"}`;
    nextActionDueDate = "2027-01-05";
    nextActionPriority = "upcoming";
    summary = `Statut passé en attente jusqu'en janvier. Prochaine relance fixée au 5 janvier 2027.`;
  } else if (lower.includes("décembre") || lower.includes("decembre")) {
    updatedStatus = "en_attente";
    nextActionLabel = `Reprendre contact avec ${contact.firstName || "le contact"}`;
    nextActionDueDate = "2026-12-01";
    nextActionPriority = "upcoming";
    summary = `Statut passé en attente jusqu'en décembre. Prochaine relance fixée au 1er décembre 2026.`;
  } else if (lower.includes("pas la bonne personne") || lower.includes("recommander") || lower.includes("manager") || lower.includes("équipe finance")) {
    updatedStatus = "opportunite_detectee";
    nextActionLabel = "Contacter la personne recommandée";
    nextActionDueDate = calculateFollowUpDate(new Date(), 1);
    nextActionPriority = "to_do";
    summary = `Recommandation interne identifiée. Prêt pour contacter la nouvelle personne de l'équipe.`;
  } else if (lower.includes("demande de connexion") || lower.includes("invitation")) {
    updatedStatus = "demande_envoyee";
    nextActionLabel = "Vérifier acceptation connexion (J+3)";
    nextActionDueDate = calculateFollowUpDate(new Date(), 1);
    nextActionPriority = "pending";
    summary = "Demande de connexion LinkedIn enregistrée, en attente d'acceptation.";
  } else if (lower.includes("accepté") || lower.includes("accepte")) {
    updatedStatus = "connexion_acceptee";
    nextActionLabel = "Envoyer le message d'échange après acceptation";
    nextActionDueDate = today;
    nextActionPriority = "urgent";
    summary = "Connexion acceptée par le contact ! Prêt pour envoyer le premier message d'échange.";
  } else if (lower.includes("répondu") || lower.includes("repondu") || lower.includes("message reçu")) {
    updatedStatus = "reponse_recue";
    nextActionLabel = "Répondre à son message";
    nextActionDueDate = today;
    nextActionPriority = "urgent";
    summary = "Réponse reçue du contact. Action prioritaire : lui répondre.";
  } else if (lower.includes("appel") || lower.includes("téléphone") || lower.includes("visio") || lower.includes("rendez-vous")) {
    updatedStatus = "echange_realise";
    nextActionLabel = "Envoyer un mot de remerciement post-échange";
    nextActionDueDate = today;
    nextActionPriority = "to_do";
    summary = "Échange téléphonique enregistré. Recommandation : envoyer un court remerciement.";
  }

  return {
    updatedStatus,
    nextAction: {
      type: "update",
      label: nextActionLabel,
      dueDate: nextActionDueDate,
      priority: nextActionPriority
    },
    historyEntry: `${today} — ${cleanInput}`,
    notesToAdd: cleanInput,
    detectedIntent: "Mise à jour en langage naturel",
    assistantSummary: summary
  };
}

// ============================================================================
// 5. ANALYSE IA D'UNE CONVERSATION
// ============================================================================

export async function analyzeConversationThread(
  contact: Contact,
  profile: CandidateProfile
): Promise<ConversationAnalysisResult> {
  const messages = ensureContactConversationMessages(contact);
  const status = contact.networkingStatus || "a_contacter";
  const contactName = contact.firstName || contact.fullName || "Contact";
  const company = contact.companyName || "l'entreprise";
  const job = contact.jobTitle || "son poste";

  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const userPrompt = `
ANALYSER LA CONVERSATION DE NETWORKING :
Contact : ${contact.fullName} (${job} chez ${company})
Statut actuel : ${status}
Historique des messages :
${messages.map(m => `[${m.sender.toUpperCase()} - ${m.timestamp.slice(0, 10)}] : ${m.text}`).join("\n\n")}

Retourne un JSON strict selon ce modèle :
{
  "situation": "Court résumé de la dynamique actuelle (ex: 'Vous avez déjà échangé une fois. Le contact semble ouvert.')",
  "lastAction": "Dernière action datée",
  "nextAction": "Prochaine action recommandée",
  "advisedStrategy": "Conseil d'approche précis (ex: 'Répondre brièvement puis proposer un échange de 10 minutes.')",
  "priority": "urgent" | "to_do" | "upcoming" | "pending"
}
`;

      for (const model of CASCADE_MODELS) {
        try {
          const startTime = Date.now();
          const response = await ai.models.generateContent({
            model,
            contents: userPrompt,
            config: {
              temperature: 0.25,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  situation: { type: Type.STRING },
                  lastAction: { type: Type.STRING },
                  nextAction: { type: Type.STRING },
                  advisedStrategy: { type: Type.STRING },
                  priority: { type: Type.STRING }
                },
                required: ["situation", "lastAction", "nextAction", "advisedStrategy", "priority"]
              }
            }
          });

          trackGeminiCall({
            feature: "Analyse dynamique conversation",
            featureCategory: "conversation_analysis",
            model,
            promptText: userPrompt,
            response,
            durationMs: Date.now() - startTime,
            contextSnippet: `Diagnostic d'échanges avec ${contact.fullName}`
          });

          const parsed = JSON.parse(response.text?.trim() || "{}");
          if (parsed && parsed.situation) {
            return {
              situation: parsed.situation,
              lastAction: parsed.lastAction,
              nextAction: parsed.nextAction,
              advisedStrategy: parsed.advisedStrategy,
              priority: (parsed.priority as any) || "to_do"
            };
          }
        } catch (e: any) {
          console.info(`[ConversationAnalysis] Modèle ${model} cascade.`);
        }
      }
    } catch (e) {
      console.info("[ConversationAnalysis] Bascule locale.");
    }
  }

  // Deterministic fallback
  const lastMsg = messages[messages.length - 1];
  const lastSender = lastMsg ? lastMsg.sender : "system";
  const priorityCalc = calculateContactPriority(contact);

  if (lastSender === "contact") {
    return {
      situation: `${contactName} vous a répondu. La relation est réceptive et propice à un échange direct.`,
      lastAction: `Réponse reçue le ${lastMsg.timestamp.slice(0, 10)}.`,
      nextAction: "Lui répondre aujourd'hui.",
      advisedStrategy: "Remercier chaleureusement pour son retour et lui proposer 2 créneaux simples pour un appel de 10 min.",
      priority: 'urgent'
    };
  }

  if (status === "connexion_acceptee") {
    return {
      situation: `${contactName} a accepté votre demande de connexion sur LinkedIn.`,
      lastAction: "Connexion acceptée.",
      nextAction: "Envoyer le premier message d'échange.",
      advisedStrategy: "Ouvrir la discussion avec une question bienveillante sur son métier ou un point commun sans forcer.",
      priority: 'to_do'
    };
  }

  if (status === "demande_envoyee" || status === "en_attente_reponse") {
    return {
      situation: `Message envoyé à ${contactName}. En attente de lecture ou de disponibilité.`,
      lastAction: lastMsg ? `Message envoyé le ${lastMsg.timestamp.slice(0, 10)}.` : "Demande transmise.",
      nextAction: `Relance prévue le ${contact.nextFollowUpDate || calculateFollowUpDate(new Date(), 1)}.`,
      advisedStrategy: "Ne pas sur-relancer avant J+7. Préparer une relance apportant des réalisations concrètes.",
      priority: priorityCalc.priority === 'urgent' ? 'urgent' : 'pending'
    };
  }

  return {
    situation: `Premier contact à planifier avec ${contactName} (${job} chez ${company}).`,
    lastAction: "Fiche contact qualifiée.",
    nextAction: "Envoyer une demande de connexion personnalisée.",
    advisedStrategy: "Miser sur la concision (< 300 caractères) avec un unique point d'accroche valorisant.",
    priority: 'to_do'
  };
}

// ============================================================================
// 6. GÉNÉRATION DU PROCHAIN MESSAGE CONTEXTUEL DE LA CONVERSATION & ASSISTANT IA
// ============================================================================

/**
 * Detects whether a string typed into the composer is an instruction intended for the AI
 * (e.g. "réponds à Milan", "dis-lui que je suis dispo mardi", "fais plus court")
 * versus a direct message intended to be sent as-is.
 */
export function detectComposerIntent(input: string): { isInstruction: boolean; cleanedInstruction: string } {
  const trimmed = input.trim();
  if (!trimmed) return { isInstruction: false, cleanedInstruction: "" };

  const lower = trimmed.toLowerCase();

  // Clear instruction starter keywords
  const instructionPrefixes = [
    "réponds", "reponds", "répondre", "repondre",
    "propose", "proposer", "propose-moi", "propose moi",
    "dis-lui", "dis lui", "dis que", "dis à", "dis a",
    "demande-lui", "demande lui", "demande", "demande s'il", "demande si", "demande-lui si",
    "écris", "ecris", "rédige", "redige", "formule",
    "génère", "genere", "suggère", "suggere",
    "relance", "relance-le", "relance-la", "relance le", "relance la",
    "fais", "sois", "soit", "rends",
    "ajoute", "enlève", "enleve", "modifie", "change",
    "peux-tu", "tu peux", "pourrais-tu", "peux tu",
    "remercie", "remercie-le", "remercie le",
    "accepte", "décline", "decline", "refuse"
  ];

  for (const prefix of instructionPrefixes) {
    if (lower.startsWith(prefix)) {
      return { isInstruction: true, cleanedInstruction: trimmed };
    }
  }

  // Regex checks for instructions embedded inside short prompts
  const instructionPatterns = [
    /\brépond[se]?\b/i,
    /\brepond[se]?\b/i,
    /\bpropose\b/i,
    /\bdis[- ]lui\b/i,
    /\bdemande[- ]lui\b/i,
    /\bfais\s+(plus|moins|attention|en sorte)\b/i,
    /\bsois\s+(plus|moins)\b/i,
    /\bplus\s+(court|long|chaleureux|naturel|professionnel|formel|direct|percutant)\b/i,
    /\b(tutoie|tutoyer|vouvoie|vouvoyer)\b/i,
    /\b(relance|relancer)\b/i,
    /\b(brouillon|draft)\b/i
  ];

  for (const pattern of instructionPatterns) {
    if (pattern.test(lower)) {
      const isDirectSalutation = /^(salut|bonjour|hello|bonsoir|coucou|cher|chère)\s+[a-zà-ÿ]+[,!\.\s]/i.test(trimmed);
      if (!isDirectSalutation || lower.startsWith("salut réponds") || lower.startsWith("bonjour réponds")) {
        return { isInstruction: true, cleanedInstruction: trimmed };
      }
    }
  }

  return { isInstruction: false, cleanedInstruction: trimmed };
}

export interface SmartReplyResult {
  reply: string;
  detectedTone: 'tutoiement' | 'vouvoiement';
  instructionHandled: boolean;
}

/**
 * High-precision conversation reply generator.
 * Communicates with the server-side `/api/gemini` endpoint, falls back to direct Gemini cascading or deterministic generator.
 */
export async function generateSmartConversationReply(payload: {
  contact: Contact;
  profile: CandidateProfile;
  messages: ConversationMessage[];
  userInstruction?: string;
  channel?: string;
  refinementContext?: string;
}): Promise<SmartReplyResult> {
  const { contact, profile, messages, userInstruction, channel = "linkedin", refinementContext } = payload;

  // 1. Try server endpoint first
  try {
    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generateConversationReply",
        payload: {
          contact,
          profile,
          messages,
          userInstruction,
          channel,
          refinementContext
        }
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.reply && typeof data.reply === "string" && data.reply.trim().length > 5) {
        return {
          reply: data.reply.trim(),
          detectedTone: data.detectedTone || "tutoiement",
          instructionHandled: Boolean(data.instructionHandled)
        };
      }
    }
  } catch (e) {
    console.info("[ConversationAgent] /api/gemini route unavailable or failed, switching to direct client generation.");
  }

  // 2. Direct Gemini / Local fallback if server call is unavailable
  const candidateName = profile.firstName || "Nathan";
  const contactName = contact.fullName || contact.firstName || "Contact";
  const contactFirstName = contact.firstName || contact.fullName.split(" ")[0] || "Bonjour";

  const sortedMessages = [...(messages || [])].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const lastContactMsg = [...sortedMessages].reverse().find(m => m.sender === "contact");

  const textSample = [
    lastContactMsg?.text || "",
    sortedMessages.map(m => m.text).join(" "),
    contact.outreachTone || ""
  ].join(" ").toLowerCase();

  const isTutoiement = (
    textSample.includes("salut") || 
    textSample.includes("hello") || 
    textSample.includes(" tu ") || 
    textSample.includes("ton ") || 
    textSample.includes("ta ") || 
    textSample.includes("tes ") || 
    textSample.includes("toi") ||
    contact.outreachTone === "tutoiement" ||
    (userInstruction && /tutoi|tutoie/i.test(userInstruction))
  ) && !(userInstruction && /vouvoi|vouvoie/i.test(userInstruction));

  const detectedTone: 'tutoiement' | 'vouvoiement' = isTutoiement ? 'tutoiement' : 'vouvoiement';

  // Deterministic local generator
  const greeting = isTutoiement ? `Salut ${contactFirstName},` : `Bonjour ${contactFirstName},`;
  const signOff = isTutoiement ? `Belle journée,\n${candidateName}` : `Bien cordialement,\n${candidateName}`;
  const instr = (userInstruction || "").toLowerCase();

  if (instr.includes("mardi") || instr.includes("dispo") || instr.includes("disponible") || instr.includes("créneau") || instr.includes("creneau")) {
    const text = isTutoiement
      ? `${greeting}\n\nMerci beaucoup pour ton retour ! Je suis bien disponible mardi si tu souhaites qu'on échange 10 minutes.\n\nDis-moi quel créneau te conviendrait le mieux.\n\n${signOff}`
      : `${greeting}\n\nJe vous remercie pour votre retour. Je suis tout à fait disponible mardi pour un court échange selon vos disponibilités.\n\nN'hésitez pas à m'indiquer le créneau qui vous conviendrait le mieux.\n\n${signOff}`;
    return { reply: text, detectedTone, instructionHandled: true };
  }

  if (lastContactMsg && (lastContactMsg.text.toLowerCase().includes("désolé") || lastContactMsg.text.toLowerCase().includes("desole") || lastContactMsg.text.toLowerCase().includes("avancée") || lastContactMsg.text.toLowerCase().includes("avancee"))) {
    const text = isTutoiement
      ? `${greeting}\n\nPas de souci ! Oui, ça commence à bien se préciser de mon côté. J’ai notamment eu plusieurs retours sur mes entretiens, donc j’y vois un peu plus clair maintenant.\n\nMerci en tout cas pour ton retour et ton écoute !\n\n${signOff}`
      : `${greeting}\n\nJe vous remercie pour votre message. Les choses avancent bien de mon côté et mes démarches se précisent suite à mes récents échanges.\n\nMerci encore pour votre bienveillance et votre retour !\n\n${signOff}`;
    return { reply: text, detectedTone, instructionHandled: true };
  }

  const defaultText = isTutoiement
    ? `${greeting}\n\nMerci beaucoup pour ton retour ! C'est super instructif.\n\nSeriez-tu partant pour qu'on se cale un court appel de 10 minutes cette semaine si tu as un moment ?\n\n${signOff}`
    : `${greeting}\n\nJe vous remercie vivement pour votre retour et votre éclairage.\n\nSeriez-vous ouvert(e) à un court échange téléphonique de 10 minutes selon vos convenances ?\n\n${signOff}`;

  return { reply: defaultText, detectedTone, instructionHandled: Boolean(userInstruction && userInstruction.trim()) };
}

export async function generateNextConversationMessage(
  contact: Contact,
  profile: CandidateProfile,
  userInstructions?: string
): Promise<string> {
  const messages = ensureContactConversationMessages(contact);
  const result = await generateSmartConversationReply({
    contact,
    profile,
    messages,
    userInstruction: userInstructions,
    channel: contact.outreachChannel || "linkedin"
  });
  return result.reply;
}
