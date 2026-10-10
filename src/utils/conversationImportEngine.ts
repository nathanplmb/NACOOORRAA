import { 
  Contact, 
  CandidateProfile, 
  ContactNetworkingStatus, 
  ConversationMessage, 
  ContactNextAction,
  ContactHistoryEvent 
} from "../types";
import { GoogleGenAI, Type } from "@google/genai";
import { parseCsvRows } from "./linkedInCsvParser";
import { calculateFollowUpDate } from "../api/networkingFramework";
import { dbStore } from "../dbStore";
import { trackGeminiCall } from "./aiTokenTracker";
import { 
  resolveContact, 
  shouldFilterOutLinkedInParticipant, 
  cleanPersonDisplayName, 
  normalizePersonName, 
  extractLinkedInSlug,
  isGenericLinkedInMember,
  isSponsoredOrAdvertisingName 
} from "./contactResolver";
import { resolveCompany } from "./companyResolver";
import { classifyContactFunction } from "./contactTaxonomy";

export type ConversationImportSource = "linkedin_csv" | "email" | "paste";
export type MatchStatus = "auto_matched" | "proposed" | "needs_verification" | "new_contact";

export interface ReconstructedMessageItem {
  id: string;
  sender: "nathan" | "contact";
  senderName: string;
  text: string;
  timestamp: string; // ISO
  channel: "linkedin" | "email" | "phone" | "in_person";
  subject?: string;
  isDuplicate?: boolean;
}

export interface DetectedConversation {
  id: string;
  source: ConversationImportSource;
  channel: "linkedin" | "email" | "phone" | "in_person";
  contactCandidate: {
    fullName: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    companyName?: string;
    jobTitle?: string;
    linkedInUrl?: string;
    phone?: string;
  };
  matchedContactId?: string;
  matchedContact?: Contact | null;
  matchConfidence: number; // 0 - 100
  matchStatus: MatchStatus;
  matchReason: string;
  messages: ReconstructedMessageItem[];
  detectedStatus: ContactNetworkingStatus;
  detectedNextAction: ContactNextAction;
  professionalRelevance: number; // 0 - 100
  relevanceCategory: "recruiter" | "alumni" | "opportunity" | "banking_finance" | "neutral_professional" | "unrelated_spam";
  relevanceReason: string;
  timingAnalysis: {
    daysSinceLast: number;
    isFollowUpRecommended: boolean;
    timingAdvice: string;
  };
  selected: boolean;
  action: "merge_existing" | "create_new" | "skip";
}

export interface ConversationImportSummary {
  totalMessagesProcessed: number;
  conversationsFound: number;
  contactsAssociated: number;
  newContactsToCreate: number;
  matchesNeedingVerification: number;
  duplicatesSkipped: number;
  nonProfessionalFiltered: number;
}

// ----------------------------------------------------------------------------
// 1. HELPERS DE NETTOYAGE ET NORMALISATION
// ----------------------------------------------------------------------------

export function normalizeString(str?: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function cleanMessageText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/^\s+|\s+$/g, "");
}

// Check message duplicates against existing messages
export function isMessageDuplicate(
  newText: string,
  newTimestamp: string,
  existingMessages: ConversationMessage[] = []
): boolean {
  if (!existingMessages || existingMessages.length === 0) return false;

  const normNew = normalizeString(newText).replace(/\s+/g, " ");
  if (normNew.length < 5) return false;

  for (const existing of existingMessages) {
    const normExisting = normalizeString(existing.text).replace(/\s+/g, " ");

    // Exact text match
    if (normNew === normExisting) return true;

    // High similarity (>85% matching prefix/substring)
    if (
      normNew.length > 20 &&
      normExisting.length > 20 &&
      (normNew.includes(normExisting.slice(0, 30)) || normExisting.includes(normNew.slice(0, 30)))
    ) {
      return true;
    }
  }

  return false;
}

// ----------------------------------------------------------------------------
// 2. MAPPING ET ASSOCIATION AUX CONTACTS NACORA (Score de confiance multi-signaux)
// ----------------------------------------------------------------------------

export function matchContactCandidate(
  candidate: DetectedConversation["contactCandidate"],
  existingContacts: Contact[]
): {
  matchedContact: Contact | null;
  confidence: number;
  status: MatchStatus;
  reason: string;
} {
  if (!existingContacts || existingContacts.length === 0) {
    return {
      matchedContact: null,
      confidence: 0,
      status: "new_contact",
      reason: "Aucun contact existant dans la base NACORA"
    };
  }

  // Utilisation de la source de vérité unique : resolveContact
  const res = resolveContact(candidate, existingContacts);

  let status: MatchStatus = "new_contact";
  if (res.matchScore >= 90) {
    status = "auto_matched";
  } else if (res.matchScore >= 70) {
    status = "proposed";
  } else if (res.matchScore >= 60) {
    status = "needs_verification";
  } else {
    status = "new_contact";
  }

  return {
    matchedContact: res.matchScore >= 60 ? res.matchedContact : null,
    confidence: res.matchScore,
    status,
    reason: res.reason
  };
}

// ----------------------------------------------------------------------------
// 3. FILTRE ET ANALYSE DE LA PERTINENCE PROFESSIONNELLE (Email & Copier-Coller)
// ----------------------------------------------------------------------------

export function evaluateProfessionalRelevance(
  text: string,
  subject?: string,
  sender?: string
): {
  relevanceScore: number;
  category: DetectedConversation["relevanceCategory"];
  reason: string;
  isIgnored: boolean;
} {
  const combined = normalizeString(`${subject || ""} ${sender || ""} ${text}`);

  // Patterns d'exclusion automatique (Spam, newsletters, pubs, commandes, messages sponsorisés)
  const spamKeywords = [
    "newsletter", "desabonner", "unsubscribe", "opt-out", "promotions", "remise de",
    "soldes", "bon de reduction", "livraison de votre commande", "confirmation de commande",
    "facture n", "paiement accepte", "votre colis", "suivi de colis", "no-reply@",
    "noreply@", "donotreply@", "notification facebook", "notification instagram",
    "offre speciale", "flash sale", "marketing@", "news@",
    "sponsored conversation", "conversation sponsorisee", "conversation sponsorisée",
    "sponsored inmail", "inmail sponsorise", "inmail sponsorisé", "message sponsorise",
    "message sponsorisé", "publicite linkedin", "publicité linkedin", "inmail publicitaire",
    "ce message est sponsorise", "ce message est une publicite", "promoted inmail",
    "promoted content", "linkedin ads", "linkedin marketing solutions"
  ];

  for (const kw of spamKeywords) {
    if (combined.includes(kw)) {
      return {
        relevanceScore: 12,
        category: "unrelated_spam",
        reason: `Contenu publicitaire ou notification automatique détectée (« ${kw} »)`,
        isIgnored: true
      };
    }
  }

  // Patterns professionnels très forts
  const recruiterKeywords = [
    "recrut", "talent acquisition", "rh", "ressources humaines", "candidature",
    "entretien", "cv", "curriculum", "poste", "opportunite", "alternance", "stage",
    "embauche", "salaire", "remuneration", "chasseur de tete", "cabinet de recrutement"
  ];

  const financeBankingKeywords = [
    "banque", "finance", "credit", "gestion de patrimoine", "private banking",
    "patrimoine", "marches financiers", "m&a", "analyste", "tresorerie", "cgp", "cgpc"
  ];

  const alumniNetworkingKeywords = [
    "alumni", "iae", "clermont", "universite", "diplome", "reseau", "echange",
    "partage d'experience", "court appel", "10 minutes", "parcours", "recommandation"
  ];

  let recruiterMatches = recruiterKeywords.filter(k => combined.includes(k)).length;
  let financeMatches = financeBankingKeywords.filter(k => combined.includes(k)).length;
  let alumniMatches = alumniNetworkingKeywords.filter(k => combined.includes(k)).length;

  if (recruiterMatches >= 2 || (recruiterMatches >= 1 && (combined.includes("alternance") || combined.includes("stage")))) {
    return {
      relevanceScore: 96,
      category: "recruiter",
      reason: "Échange de recrutement, candidature ou opportunité professionnelle identifié",
      isIgnored: false
    };
  }

  if (financeMatches >= 2) {
    return {
      relevanceScore: 92,
      category: "banking_finance",
      reason: "Échange sectoriel spécialisé Banque & Finance patrimoniale",
      isIgnored: false
    };
  }

  if (alumniMatches >= 2 || combined.includes("alumni")) {
    return {
      relevanceScore: 94,
      category: "alumni",
      reason: "Relation réseau / Alumni identifiée",
      isIgnored: false
    };
  }

  // Échange humain courtois général
  if (
    combined.includes("bonjour") ||
    combined.includes("cordialement") ||
    combined.includes("merci pour votre retour") ||
    combined.includes("disponibilite")
  ) {
    return {
      relevanceScore: 82,
      category: "neutral_professional",
      reason: "Communication professionnelle directe entre interlocuteurs",
      isIgnored: false
    };
  }

  // Ambigu
  return {
    relevanceScore: 64,
    category: "neutral_professional",
    reason: "Échange court nécessitant vérification de pertinence",
    isIgnored: false
  };
}

// ----------------------------------------------------------------------------
// 4. ANALYSE DU STATUT & DU TIMING DE RELANCE
// ----------------------------------------------------------------------------

export function analyzeConversationTimingAndStatus(
  messages: ReconstructedMessageItem[],
  contactName: string
): {
  status: ContactNetworkingStatus;
  nextAction: ContactNextAction;
  timing: DetectedConversation["timingAnalysis"];
} {
  const sorted = [...messages].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const lastMsg = sorted[sorted.length - 1];

  let daysSinceLast = 0;
  if (lastMsg && lastMsg.timestamp) {
    const lastDate = new Date(lastMsg.timestamp);
    if (!isNaN(lastDate.getTime())) {
      daysSinceLast = Math.max(0, Math.floor((Date.now() - lastDate.getTime()) / (1000 * 3600 * 24)));
    }
  }

  // Analyse multi-messages : prendre en compte les 3 derniers messages pour le contexte global
  const recentMessages = sorted.slice(-3);
  const combinedRecentText = recentMessages.map(m => normalizeString(m.text)).join(" ");

  // Compter le nombre de messages consécutifs envoyés par Nathan
  let consecutiveNathanCount = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].sender === "nathan") consecutiveNathanCount++;
    else break;
  }

  // Détection d'un délai promis ou d'une absence annoncée par le contact
  const hasPromisedDelay = 
    combinedRecentText.includes("reviens vers vous") ||
    combinedRecentText.includes("recontacte") ||
    combinedRecentText.includes("semaine prochaine") ||
    combinedRecentText.includes("fin de semaine") ||
    combinedRecentText.includes("en deplacement") ||
    combinedRecentText.includes("en conges") ||
    combinedRecentText.includes("en vacances") ||
    combinedRecentText.includes("d'ici quelques jours");

  // Détection d'un entretien ou appel convenu (les deux interlocuteurs sont d'accord)
  const hasCallKeywords = 
    combinedRecentText.includes("appel") || 
    combinedRecentText.includes("entretien") || 
    combinedRecentText.includes("visio") || 
    combinedRecentText.includes("mardi") || 
    combinedRecentText.includes("mercredi") || 
    combinedRecentText.includes("jeudi") || 
    combinedRecentText.includes("vendredi") || 
    combinedRecentText.includes("lundi") || 
    combinedRecentText.includes("rendez-vous") ||
    combinedRecentText.includes("echange telephonique");

  const hasAgreementKeywords = 
    combinedRecentText.includes("disponible") || 
    combinedRecentText.includes("convient") || 
    combinedRecentText.includes("avec plaisir") || 
    combinedRecentText.includes("creneau") ||
    combinedRecentText.includes("parfait") ||
    combinedRecentText.includes("entendu");

  if (hasCallKeywords && hasAgreementKeywords) {
    return {
      status: "appel_prevu",
      nextAction: {
        type: "appel",
        label: `Préparer l'entretien avec ${contactName}`,
        dueDate: calculateFollowUpDate(new Date(), 2),
        priority: "urgent"
      },
      timing: {
        daysSinceLast,
        isFollowUpRecommended: false,
        timingAdvice: "Un créneau d'échange / entretien a été convenu entre les deux parties. Priorité à la préparation, aucune relance requise."
      }
    };
  }

  // Détection du sens du dernier message
  const isLastFromNathan = lastMsg ? lastMsg.sender === "nathan" : false;

  // Contact a parlé en dernier -> Nathan doit répondre (JAMAIS relancer !)
  if (!isLastFromNathan && lastMsg) {
    return {
      status: "reponse_recue",
      nextAction: {
        type: "repondre",
        label: `Répondre au message de ${contactName}`,
        dueDate: new Date().toISOString().split("T")[0],
        priority: "urgent"
      },
      timing: {
        daysSinceLast,
        isFollowUpRecommended: false,
        timingAdvice: `${contactName} vous a répondu il y a ${daysSinceLast}j. Répondez sous 24-48h pour entretenir la dynamique.`
      }
    };
  }

  // Nathan a parlé en dernier
  if (isLastFromNathan) {
    // Si un délai annoncé est en cours (ex: "je reviens vers vous la semaine prochaine")
    if (hasPromisedDelay && daysSinceLast < 10) {
      return {
        status: "en_attente_reponse",
        nextAction: {
          type: "attendre",
          label: `Attendre le retour annoncé de ${contactName}`,
          dueDate: calculateFollowUpDate(new Date(), Math.max(2, 7 - daysSinceLast)),
          priority: "upcoming"
        },
        timing: {
          daysSinceLast,
          isFollowUpRecommended: false,
          timingAdvice: "Un délai ou un engagement de retour a été exprimé par le contact. Patientez sans relancer prématurément."
        }
      };
    }

    // Si Nathan a déjà relancé 2 fois de suite
    if (consecutiveNathanCount >= 2 && daysSinceLast < 14) {
      return {
        status: "en_attente_reponse",
        nextAction: {
          type: "attendre",
          label: `Laisser reposer le contact (${consecutiveNathanCount} envois récents)`,
          dueDate: calculateFollowUpDate(new Date(), 14 - daysSinceLast),
          priority: "upcoming"
        },
        timing: {
          daysSinceLast,
          isFollowUpRecommended: false,
          timingAdvice: `Vous avez déjà envoyé ${consecutiveNathanCount} messages consécutifs sans réponse. Évitez de sur-solliciter le contact pour préserver la relation.`
        }
      };
    }

    if (daysSinceLast >= 7) {
      return {
        status: "relance_a_faire",
        nextAction: {
          type: "relance",
          label: `Relancer ${contactName} (dernier envoi il y a ${daysSinceLast}j)`,
          dueDate: new Date().toISOString().split("T")[0],
          priority: "urgent"
        },
        timing: {
          daysSinceLast,
          isFollowUpRecommended: true,
          timingAdvice: `Délai de courtoisie respecté (${daysSinceLast} jours sans réponse). Une relance sobre et cordiale est recommandée.`
        }
      };
    } else {
      const waitDays = Math.max(1, 7 - daysSinceLast);
      return {
        status: "en_attente_reponse",
        nextAction: {
          type: "attendre",
          label: `Attendre la réponse (relance dans ${waitDays}j)`,
          dueDate: calculateFollowUpDate(new Date(), waitDays),
          priority: "upcoming"
        },
        timing: {
          daysSinceLast,
          isFollowUpRecommended: false,
          timingAdvice: `Votre dernier message date d'il y a ${daysSinceLast}j. Laissez le temps au contact de traiter son courrier avant de relancer.`
        }
      };
    }
  }

  // Cas par défaut
  return {
    status: "a_contacter",
    nextAction: {
      type: "premier_message",
      label: `Initier la prise de contact avec ${contactName}`,
      dueDate: new Date().toISOString().split("T")[0],
      priority: "to_do"
    },
    timing: {
      daysSinceLast: 0,
      isFollowUpRecommended: true,
      timingAdvice: "Prêt pour envoyer une première approche ciblée."
    }
  };
}

// ----------------------------------------------------------------------------
// 5. PARSER CSV LINKEDIN : Détection intelligente des colonnes
// ----------------------------------------------------------------------------

export interface LinkedInCsvColumnMapping {
  conversationIdCol: number;
  fromCol: number;
  toCol: number;
  dateCol: number;
  contentCol: number;
  subjectCol: number;
  senderUrlCol: number;
  conversationTitleCol: number;
}

export function detectLinkedInCsvColumns(headers: string[]): LinkedInCsvColumnMapping {
  const normHeaders = headers.map(h => normalizeString(h));

  const findIdx = (regexes: RegExp[]): number => {
    for (const r of regexes) {
      const idx = normHeaders.findIndex(h => r.test(h));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  return {
    conversationIdCol: findIdx([/conversation\s*id/i, /thread\s*id/i, /id\s*conversation/i, /identifiant.*conversation/i]),
    fromCol: findIdx([/^from$/i, /sender/i, /expediteur/i, /expéditeur/i, /^de$/i, /author/i, /auteur/i]),
    toCol: findIdx([/^to$/i, /recipient/i, /destinataire/i, /^a$/i, /^à$/i, /vers/i]),
    dateCol: findIdx([/date/i, /sent\s*at/i, /timestamp/i, /created/i, /heure/i, /envoye/i, /envoyé/i]),
    contentCol: findIdx([/content/i, /message\s*body/i, /body/i, /message/i, /text/i, /texte/i, /contenu/i]),
    subjectCol: findIdx([/^subject$/i, /^objet$/i, /subject/i, /objet/i]),
    senderUrlCol: findIdx([/sender.*profile/i, /profile.*url/i, /url.*profile/i, /linkedin.*url/i, /url.*expediteur/i, /url.*expéditeur/i]),
    conversationTitleCol: findIdx([/conversation\s*title/i, /titre\s*conversation/i, /^title$/i, /^titre$/i, /title/i])
  };
}

export function parseLinkedInMessagesCsv(
  rawCsvText: string,
  userProfile: CandidateProfile,
  existingContacts: Contact[],
  customMapping?: Partial<LinkedInCsvColumnMapping>
): {
  conversations: DetectedConversation[];
  summary: ConversationImportSummary;
  headers: string[];
  detectedMapping: LinkedInCsvColumnMapping;
} {
  const rows = parseCsvRows(rawCsvText);
  if (rows.length < 2) {
    return {
      conversations: [],
      summary: {
        totalMessagesProcessed: 0,
        conversationsFound: 0,
        contactsAssociated: 0,
        newContactsToCreate: 0,
        matchesNeedingVerification: 0,
        duplicatesSkipped: 0,
        nonProfessionalFiltered: 0
      },
      headers: [],
      detectedMapping: {
        conversationIdCol: -1,
        fromCol: -1,
        toCol: -1,
        dateCol: -1,
        contentCol: -1,
        subjectCol: -1,
        senderUrlCol: -1,
        conversationTitleCol: -1
      }
    };
  }

  const headers = rows[0];
  const autoMapping = detectLinkedInCsvColumns(headers);
  const mapping: LinkedInCsvColumnMapping = { ...autoMapping, ...(customMapping || {}) };

  // Fallbacks if columns are not named standards:
  // Usually from=1, to=2, date=3, content=4
  const fromIdx = mapping.fromCol !== -1 ? mapping.fromCol : 1;
  const toIdx = mapping.toCol !== -1 ? mapping.toCol : 2;
  const dateIdx = mapping.dateCol !== -1 ? mapping.dateCol : 3;
  const contentIdx = mapping.contentCol !== -1 ? mapping.contentCol : 4;
  const convoIdIdx = mapping.conversationIdCol;
  const subjectIdx = mapping.subjectCol;
  const senderUrlIdx = mapping.senderUrlCol;
  const convoTitleIdx = mapping.conversationTitleCol;

  const isSelfUser = (val: string): boolean => {
    if (!val) return false;
    const n = normalizePersonName(val);
    if (!n) return false;
    if (n === "me" || n === "moi" || n === "you" || n === "vous") return true;

    const userFull = normalizePersonName(userProfile.fullName);
    const userFirst = normalizePersonName(userProfile.firstName);
    const userLast = normalizePersonName(userProfile.lastName);

    if (userFull && (n === userFull || n.includes(userFull))) return true;
    if (userFirst && userLast) {
      if (n === `${userFirst} ${userLast}` || n === `${userLast} ${userFirst}`) return true;
    }
    if (userFirst && userFirst.length >= 3 && n === userFirst) return true;
    if (n.includes("nathan paillard") || n === "nathan") return true;
    return false;
  };

  const extractNonSelf = (raw: string): string => {
    if (!raw) return "";
    const parts = raw.split(/[,;]/).map(p => cleanPersonDisplayName(p.trim())).filter(Boolean);
    for (const part of parts) {
      if (!isSelfUser(part)) {
        return part;
      }
    }
    return cleanPersonDisplayName(parts[0] || "");
  };

  // Group rows by conversation key (either conversation ID, or participant tuple)
  const threadMap = new Map<string, Array<{ row: string[]; index: number }>>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length <= 1 && (!row[0] || !row[0].trim())) continue;

    const fromVal = row[fromIdx] || "";
    const toVal = row[toIdx] || "";
    const convoIdVal = convoIdIdx !== -1 ? row[convoIdIdx] : "";

    let threadKey = convoIdVal ? `id_${convoIdVal.trim()}` : "";
    if (!threadKey) {
      // Create participant pair key (sorted)
      const p1 = normalizePersonName(fromVal);
      const p2 = normalizePersonName(toVal);
      const sortedParts = [p1, p2].sort();
      threadKey = `pair_${sortedParts.join("_")}`;
    }

    if (!threadMap.has(threadKey)) {
      threadMap.set(threadKey, []);
    }
    threadMap.get(threadKey)!.push({ row, index: i });
  }

  const detectedConversations: DetectedConversation[] = [];
  let totalMessagesProcessed = 0;
  let duplicatesSkipped = 0;
  let nonProfessionalFiltered = 0;

  threadMap.forEach((entryList, threadKey) => {
    // Determine participants
    let contactName = "";
    let contactUrl = "";
    let convoTitle = "";

    const rawMessages: ReconstructedMessageItem[] = [];

    entryList.forEach(({ row, index }) => {
      totalMessagesProcessed++;
      const fromVal = (row[fromIdx] || "").trim();
      const toVal = (row[toIdx] || "").trim();
      const dateVal = (row[dateIdx] || "").trim();
      const contentVal = (row[contentIdx] || "").trim();
      const subjectVal = subjectIdx !== -1 ? (row[subjectIdx] || "").trim() : undefined;
      const urlVal = senderUrlIdx !== -1 ? (row[senderUrlIdx] || "").trim() : undefined;
      const titleVal = convoTitleIdx !== -1 ? (row[convoTitleIdx] || "").trim() : undefined;

      if (titleVal && !convoTitle) {
        convoTitle = titleVal;
      }

      if (!contentVal) return;

      const isSelf = isSelfUser(fromVal);

      if (!isSelf && fromVal) {
        const cleanFrom = cleanPersonDisplayName(fromVal, userProfile);
        // Le nom de l'expéditeur direct est le plus fiable
        if (cleanFrom && (!contactName || contactName.includes(",") || isGenericLinkedInMember(contactName))) {
          contactName = cleanFrom;
        }
        // Capture de l'URL du profil de l'interlocuteur
        if (urlVal && !contactUrl && !isSelfUser(urlVal)) {
          contactUrl = urlVal;
        }
      } else if (isSelf && toVal) {
        // Message envoyé par l'utilisateur -> destinataire dans toVal
        if (!contactName || isGenericLinkedInMember(contactName) || contactName.includes(",")) {
          const rec = extractNonSelf(toVal);
          if (rec) contactName = rec;
        }
      }

      // Parse timestamp safely
      let isoDate = new Date().toISOString();
      if (dateVal) {
        const parsed = new Date(dateVal);
        if (!isNaN(parsed.getTime())) {
          isoDate = parsed.toISOString();
        }
      }

      rawMessages.push({
        id: `msg_csv_${index}_${Math.random().toString(36).substring(2, 6)}`,
        sender: isSelf ? "nathan" : "contact",
        senderName: isSelf ? (userProfile.firstName || "Nathan") : (fromVal || contactName || "Contact"),
        text: contentVal,
        timestamp: isoDate,
        channel: "linkedin",
        subject: subjectVal
      });
    });

    if (rawMessages.length === 0) return;

    // En cas de participant non résolu ou générique, exploiter le titre de la conversation
    if ((!contactName || isGenericLinkedInMember(contactName)) && convoTitle) {
      const cleanTitle = convoTitle
        .replace(/^(conversation\s*(with|avec)\s*)/i, "")
        .replace(/^(échange\s*(avec|sur)\s*)/i, "")
        .trim();
      const extracted = extractNonSelf(cleanTitle);
      if (extracted) {
        contactName = extracted;
      }
    }

    contactName = cleanPersonDisplayName(contactName, userProfile);

    // Règle absolue anti-pollution : Éliminer les messages publicitaires et conversations sponsorisées
    if (
      isSponsoredOrAdvertisingName(contactName) ||
      isSponsoredOrAdvertisingName(convoTitle) ||
      /sponsor|publicit|promoted|annonce/i.test(convoTitle || "") ||
      /sponsor|publicit|promoted|annonce/i.test(contactName || "")
    ) {
      nonProfessionalFiltered++;
      return;
    }

    // Filter generic non-identifiable participants (e.g. "LinkedIn Member" without email/URL)
    const { shouldFilter } = shouldFilterOutLinkedInParticipant({
      fullName: contactName,
      linkedInUrl: contactUrl
    });
    if (shouldFilter) {
      nonProfessionalFiltered++;
      return;
    }

    // Default contact name if none found
    if (!contactName) {
      contactName = "Contact LinkedIn";
    }

    // Sort messages chronologically
    rawMessages.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    // Split first and last name
    const parts = contactName.trim().split(" ");
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || "";

    // Candidate structure
    const candidate = {
      fullName: contactName,
      firstName,
      lastName,
      linkedInUrl: contactUrl || undefined
    };

    // Match with NACORA contacts
    const match = matchContactCandidate(candidate, existingContacts);

    // Filter duplicates against existing messages of matched contact
    const finalMessages: ReconstructedMessageItem[] = [];
    const existingMsgs = match.matchedContact?.conversationMessages || [];

    rawMessages.forEach(m => {
      const isDup = isMessageDuplicate(m.text, m.timestamp, existingMsgs);
      if (isDup) {
        duplicatesSkipped++;
        m.isDuplicate = true;
      } else {
        finalMessages.push(m);
      }
    });

    // Timing and status analysis
    const { status, nextAction, timing } = analyzeConversationTimingAndStatus(rawMessages, contactName);

    // Evaluate relevance of the conversation content
    const sampleText = rawMessages.map(m => m.text).join(" ");
    const evalResult = evaluateProfessionalRelevance(sampleText, rawMessages[0]?.subject);

    // Règle 2 : Ignorer radicalement les conversations inutiles, publicitaires ou spam
    if (evalResult.isIgnored || evalResult.relevanceScore < 30) {
      nonProfessionalFiltered++;
      return;
    }

    detectedConversations.push({
      id: `convo_${threadKey}_${Math.random().toString(36).substring(2, 6)}`,
      source: "linkedin_csv",
      channel: "linkedin",
      contactCandidate: candidate,
      matchedContactId: match.matchedContact?.id,
      matchedContact: match.matchedContact,
      matchConfidence: match.confidence,
      matchStatus: match.status,
      matchReason: match.reason,
      messages: rawMessages,
      detectedStatus: status,
      detectedNextAction: nextAction,
      professionalRelevance: evalResult.relevanceScore,
      relevanceCategory: evalResult.category,
      relevanceReason: evalResult.reason,
      timingAnalysis: timing,
      selected: !evalResult.isIgnored,
      action: match.status === "new_contact" ? "create_new" : "merge_existing"
    });
  });

  // Calculate summary
  const summary: ConversationImportSummary = {
    totalMessagesProcessed,
    conversationsFound: detectedConversations.length,
    contactsAssociated: detectedConversations.filter(c => c.matchStatus === "auto_matched" || c.matchStatus === "proposed").length,
    newContactsToCreate: detectedConversations.filter(c => c.matchStatus === "new_contact").length,
    matchesNeedingVerification: detectedConversations.filter(c => c.matchStatus === "needs_verification").length,
    duplicatesSkipped,
    nonProfessionalFiltered
  };

  return {
    conversations: detectedConversations,
    summary,
    headers,
    detectedMapping: mapping
  };
}

// Helper to safely retrieve Gemini API key from various environments
export function getGeminiApiKey(): string | undefined {
  if (typeof process !== "undefined" && process.env) {
    if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
    if (process.env.VITE_GEMINI_API_KEY) return process.env.VITE_GEMINI_API_KEY;
  }
  try {
    const metaEnv = (import.meta as any).env;
    if (metaEnv?.VITE_GEMINI_API_KEY) return metaEnv.VITE_GEMINI_API_KEY;
    if (metaEnv?.GEMINI_API_KEY) return metaEnv.GEMINI_API_KEY;
  } catch (_) {}
  return undefined;
}

// Known sector companies for deterministic detection
const KNOWN_BANKS_AND_FIRMS = [
  "BNP Paribas", "Société Générale", "Rothschild & Co", "Lazard", "Crédit Agricole",
  "Bred", "CIC", "Natixis", "BPCE", "Amundi", "Morgan Stanley", "Goldman Sachs",
  "JP Morgan", "UBS", "Edmond de Rothschild", "ODDO BHF", "Bnp Paribas Wealth Management",
  "Banque Palatine", "Deloitte", "PwC", "EY", "KPMG", "Ardian", "Eurazeo"
];

// Known job title patterns
const KNOWN_JOB_TITLES = [
  "Directeur de Clientèle", "Banquier Privé", "Conseiller en Gestion de Patrimoine",
  "Analyste M&A", "Analyste Crédit", "Gérant de Portefeuille", "Chargé d'Affaires",
  "Talent Acquisition", "Responsable Recrutement", "Consultant Senior", "Directeur d'Agence"
];

// ----------------------------------------------------------------------------
// 6. ANALYSE IA D'UNE CONVERSATION COPIÉE-COLLÉE (OU EMAIL BRUT)
// ----------------------------------------------------------------------------

export async function parseRawPastedConversation(
  rawText: string,
  userProfile: CandidateProfile,
  existingContacts: Contact[],
  channelHint: "linkedin" | "email" = "linkedin"
): Promise<DetectedConversation> {
  const clean = cleanMessageText(rawText);
  const userFirst = userProfile.firstName || "Nathan";
  const userFull = userProfile.fullName || "Nathan Paillard";
  const apiKey = getGeminiApiKey();

  // If Gemini API is available, try AI extraction first
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });

      const prompt = `
VOUS ÊTES L'EXPERT EN ANALYSE DE CONVERSATIONS PROFESSIONNELLES DE NACORA.
Analysez cette discussion brute copiée-collée (LinkedIn, Email ou messagerie pro).
L'utilisateur principal de l'application est "${userFull}" (Prénom: "${userFirst}").

TEXTE BRUT :
"""
${clean}
"""

TÂCHES REQUISES :
1. Identifier l'interlocuteur principal (Nom, Prénom, Entreprise si mentionnée, Poste si mentionné, Email si présent). Ne jamais inventer d'information absente.
2. Détecter chaque message individuel dans l'ordre chronologique. Pour chaque message :
   - Indiquer si l'auteur est "nathan" ou "contact".
   - Extraire le texte propre sans les en-têtes parasites.
   - Extraire la date approximative si présente (sinon générer un horodatage récent cohérent).
3. Déterminer le statut actuel de la relation parmi : 'reponse_recue', 'echange_en_cours', 'relance_a_faire', 'en_attente_reponse', 'appel_prevu', 'demande_envoyee', 'a_contacter', 'termine'.
4. Déterminer la prochaine action concrète recommandée et son échéance.
5. Évaluer la pertinence professionnelle (0 à 100) et la catégorie.
6. Évaluer le timing : est-ce le moment de relancer ou trop tôt ?

Renvoie un JSON strict respectant ce schéma :
`;

      const startTime = Date.now();
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              contactName: { type: Type.STRING },
              contactCompany: { type: Type.STRING },
              contactJobTitle: { type: Type.STRING },
              contactEmail: { type: Type.STRING },
              contactPhone: { type: Type.STRING },
              channel: { type: Type.STRING },
              messages: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sender: { type: Type.STRING },
                    senderName: { type: Type.STRING },
                    text: { type: Type.STRING },
                    dateString: { type: Type.STRING },
                    subject: { type: Type.STRING }
                  },
                  required: ["sender", "text"]
                }
              },
              detectedStatus: { type: Type.STRING },
              nextActionLabel: { type: Type.STRING },
              nextActionDaysAhead: { type: Type.NUMBER },
              professionalRelevance: { type: Type.NUMBER },
              relevanceReason: { type: Type.STRING },
              timingAdvice: { type: Type.STRING }
            },
            required: ["contactName", "messages", "detectedStatus", "nextActionLabel", "professionalRelevance"]
          }
        }
      });

      trackGeminiCall({
        feature: "Analyse et reconstruction de conversation",
        featureCategory: "conversation_analysis",
        model: "gemini-3.8-flash",
        promptText: prompt,
        response,
        durationMs: Date.now() - startTime,
        contextSnippet: "Reconstruction intelligente et détection d'interlocuteur"
      });

      const parsed = JSON.parse(response.text?.trim() || "{}");
      if (parsed && parsed.contactName && Array.isArray(parsed.messages) && parsed.messages.length > 0) {
        const contactName = parsed.contactName.trim();
        const parts = contactName.split(" ");
        const firstName = parts[0] || "";
        const lastName = parts.slice(1).join(" ") || "";

        const reconstructedMessages: ReconstructedMessageItem[] = parsed.messages.map((m: any, idx: number) => {
          const isNathan = m.sender === "nathan" || normalizeString(m.senderName || "").includes("nathan");
          let isoTime = new Date().toISOString();
          if (m.dateString) {
            const d = new Date(m.dateString);
            if (!isNaN(d.getTime())) isoTime = d.toISOString();
          }

          return {
            id: `msg_paste_ai_${idx}_${Math.random().toString(36).substring(2, 6)}`,
            sender: isNathan ? "nathan" : "contact",
            senderName: isNathan ? "Nathan" : (m.senderName || contactName),
            text: m.text,
            timestamp: isoTime,
            channel: (parsed.channel === "email" ? "email" : channelHint) as any,
            subject: m.subject
          };
        });

        const candidate = {
          fullName: contactName,
          firstName,
          lastName,
          email: parsed.contactEmail || undefined,
          companyName: parsed.contactCompany || undefined,
          jobTitle: parsed.contactJobTitle || undefined,
          phone: parsed.contactPhone || undefined
        };

        const match = matchContactCandidate(candidate, existingContacts);
        const { timing } = analyzeConversationTimingAndStatus(reconstructedMessages, contactName);

        const daysAhead = typeof parsed.nextActionDaysAhead === "number" ? parsed.nextActionDaysAhead : 1;

        return {
          id: `convo_paste_${Math.random().toString(36).substring(2, 8)}`,
          source: "paste",
          channel: (parsed.channel === "email" ? "email" : channelHint) as any,
          contactCandidate: candidate,
          matchedContactId: match.matchedContact?.id,
          matchedContact: match.matchedContact,
          matchConfidence: match.confidence,
          matchStatus: match.status,
          matchReason: match.reason,
          messages: reconstructedMessages,
          detectedStatus: (parsed.detectedStatus as ContactNetworkingStatus) || "reponse_recue",
          detectedNextAction: {
            type: "action",
            label: parsed.nextActionLabel || `Répondre à ${contactName}`,
            dueDate: calculateFollowUpDate(new Date(), daysAhead),
            priority: "urgent"
          },
          professionalRelevance: parsed.professionalRelevance || 95,
          relevanceCategory: "neutral_professional",
          relevanceReason: parsed.relevanceReason || "Analyse IA de la conversation",
          timingAnalysis: {
            daysSinceLast: timing.daysSinceLast,
            isFollowUpRecommended: timing.isFollowUpRecommended,
            timingAdvice: parsed.timingAdvice || timing.timingAdvice
          },
          selected: true,
          action: match.status === "new_contact" ? "create_new" : "merge_existing"
        };
      }
    } catch (e) {
      console.info("[ConversationImportEngine] Gemini extraction fallback to deterministic parser.", e);
    }
  }

  // --------------------------------------------------------------------------
  // DETERMINISTIC LOCAL PARSER (0ms fallback, offline & quota resilient)
  // --------------------------------------------------------------------------
  return parseRawConversationDeterministic(clean, userProfile, existingContacts, channelHint);
}

// Robust deterministic fallback for raw conversations (Zéro invention de données)
export function parseRawConversationDeterministic(
  text: string,
  userProfile: CandidateProfile,
  existingContacts: Contact[],
  channelHint: "linkedin" | "email" = "linkedin"
): DetectedConversation {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const userFirst = normalizeString(userProfile.firstName || "Nathan");
  const userFullNorm = normalizeString(userProfile.fullName || "Nathan Paillard");

  let detectedContactName = "";
  let detectedEmail = "";
  let detectedSubject = "";
  let detectedCompany = "";
  let detectedJobTitle = "";

  // 1. Détection des en-têtes email (De:, À:, Objet:, Date:)
  for (const line of lines) {
    const emailMatch = line.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch && !detectedEmail) {
      detectedEmail = emailMatch[1];
      // Si email d'entreprise (ex: s.martin@bnpparibas.com)
      const domain = detectedEmail.split("@")[1]?.toLowerCase();
      if (domain && !domain.includes("gmail") && !domain.includes("outlook") && !domain.includes("yahoo") && !domain.includes("hotmail")) {
        const coName = domain.split(".")[0];
        if (coName && !detectedCompany) {
          detectedCompany = coName.charAt(0).toUpperCase() + coName.slice(1);
        }
      }
    }

    const fromMatch = line.match(/^(?:de|from)\s*:\s*(.+)$/i);
    if (fromMatch) {
      const rawName = fromMatch[1].replace(/<.*>/, "").replace(/\(.*?\)/g, "").trim();
      if (!normalizeString(rawName).includes(userFirst)) {
        detectedContactName = rawName;
      }
    }

    const subjMatch = line.match(/^(?:objet|subject)\s*:\s*(.+)$/i);
    if (subjMatch) {
      detectedSubject = subjMatch[1].trim();
    }
  }

  // 2. Détection de l'entreprise et du poste dans le texte brut
  for (const bank of KNOWN_BANKS_AND_FIRMS) {
    if (normalizeString(text).includes(normalizeString(bank))) {
      detectedCompany = bank;
      break;
    }
  }

  for (const title of KNOWN_JOB_TITLES) {
    if (normalizeString(text).includes(normalizeString(title))) {
      detectedJobTitle = title;
      break;
    }
  }

  // 3. Segmentation des messages par bloc / nom d'interlocuteur
  const messages: ReconstructedMessageItem[] = [];
  let currentSender: "nathan" | "contact" = "contact";
  let currentSenderName = "";
  let currentBlockLines: string[] = [];

  const flushBlock = () => {
    if (currentBlockLines.length === 0) return;
    const body = currentBlockLines.join("\n").trim();
    if (body.length > 0) {
      // Vérifier les salutations à l'intérieur du corps pour repérer les noms
      if (currentSender === "nathan" && !detectedContactName) {
        const saluteMatch = body.match(/bonjour\s+([A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+(?:\s+[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+)?)/i);
        if (saluteMatch && !normalizeString(saluteMatch[1]).includes(userFirst)) {
          detectedContactName = saluteMatch[1].trim();
        }
      } else if (currentSender === "contact" && !detectedContactName) {
        // Signature en fin de message contact
        const signLines = body.split("\n").map(l => l.trim()).filter(Boolean);
        const lastLine = signLines[signLines.length - 1] || "";
        if (lastLine.length < 35 && /^[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+(?:\s+[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+)+$/.test(lastLine)) {
          if (!normalizeString(lastLine).includes(userFirst)) {
            detectedContactName = lastLine;
          }
        }
      }

      messages.push({
        id: `msg_paste_det_${messages.length}_${Math.random().toString(36).substring(2, 6)}`,
        sender: currentSender,
        senderName: currentSender === "nathan" ? "Nathan" : (currentSenderName || detectedContactName || "Contact"),
        text: body,
        timestamp: new Date().toISOString(),
        channel: channelHint,
        subject: detectedSubject || undefined
      });
    }
    currentBlockLines = [];
  };

  for (const line of lines) {
    const rawClean = line.replace(/[:•\-\|].*$/, "").replace(/\(.*?\)/g, "").trim();
    const norm = normalizeString(rawClean);

    // Détection en-tête Nathan (Nathan, Nathan Paillard, Moi, De: Nathan...)
    const isNathanHeader = 
      norm === userFirst || 
      norm === userFullNorm || 
      norm.includes("nathan paillard") ||
      norm === "moi" ||
      norm === "me" ||
      /^de\s*:\s*nathan/i.test(line);

    // Détection en-tête Contact : ligne courte (2 à 40 caractères) sans ponctuation de phrase
    const looksLikeName = 
      rawClean.length >= 2 && 
      rawClean.length <= 40 && 
      !line.includes("?") && 
      !line.includes("!") &&
      !line.includes(";") &&
      (/^[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+(?:\s+[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+)*$/.test(rawClean) || /^de\s*:\s*.+/i.test(line));

    const isContactHeader = !isNathanHeader && looksLikeName;

    if (isNathanHeader) {
      flushBlock();
      currentSender = "nathan";
      currentSenderName = "Nathan";
    } else if (isContactHeader) {
      flushBlock();
      currentSender = "contact";
      currentSenderName = rawClean;
      if (!detectedContactName) detectedContactName = rawClean;
    } else {
      currentBlockLines.push(line);
    }
  }
  flushBlock();

  // Si aucun split explicite n'a eu lieu, traiter le texte entier comme un message unique
  if (messages.length === 0 && text.trim()) {
    messages.push({
      id: `msg_paste_single_${Math.random().toString(36).substring(2, 6)}`,
      sender: "contact",
      senderName: detectedContactName || "Contact",
      text: text.trim(),
      timestamp: new Date().toISOString(),
      channel: channelHint,
      subject: detectedSubject || undefined
    });
  }

  // Ne JAMAIS inventer un nom fictif arbitraire si rien n'a pu être extrait !
  if (!detectedContactName) {
    detectedContactName = "Contact non identifié";
  }

  const parts = detectedContactName.split(" ");
  const firstName = parts[0] !== "Contact" ? parts[0] : "";
  const lastName = parts.slice(1).join(" ") || "";

  const candidate = {
    fullName: detectedContactName,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    email: detectedEmail || undefined,
    companyName: detectedCompany || undefined,
    jobTitle: detectedJobTitle || undefined
  };

  const match = matchContactCandidate(candidate, existingContacts);
  const { status, nextAction, timing } = analyzeConversationTimingAndStatus(messages, detectedContactName);
  const evalResult = evaluateProfessionalRelevance(text, detectedSubject);

  return {
    id: `convo_paste_${Math.random().toString(36).substring(2, 8)}`,
    source: "paste",
    channel: channelHint,
    contactCandidate: candidate,
    matchedContactId: match.matchedContact?.id,
    matchedContact: match.matchedContact,
    matchConfidence: match.confidence,
    matchStatus: match.status,
    matchReason: match.reason,
    messages,
    detectedStatus: status,
    detectedNextAction: nextAction,
    professionalRelevance: evalResult.relevanceScore,
    relevanceCategory: evalResult.category,
    relevanceReason: evalResult.reason,
    timingAnalysis: timing,
    selected: !evalResult.isIgnored,
    action: match.status === "new_contact" ? "create_new" : "merge_existing"
  };
}

// ----------------------------------------------------------------------------
// 7. COMMIT & APPLICATION DES CONVERSATIONS DANS LE DBSTORE NACORA
// ----------------------------------------------------------------------------

export function applyConversationImports(
  conversationsToApply: DetectedConversation[],
  existingContacts: Contact[],
  userProfile: CandidateProfile
): {
  updatedContactsCount: number;
  newContactsCount: number;
  importedMessagesCount: number;
  skippedDuplicatesCount: number;
  affectedContactIds: string[];
} {
  let updatedContactsCount = 0;
  let newContactsCount = 0;
  let importedMessagesCount = 0;
  let skippedDuplicatesCount = 0;
  const affectedContactIds: string[] = [];

  for (const convo of conversationsToApply) {
    if (!convo.selected || convo.action === "skip") continue;

    // Filter duplicates
    const nonDuplicateMsgs = convo.messages.filter(m => !m.isDuplicate);
    if (nonDuplicateMsgs.length === 0) continue;

    // Format into ConversationMessage model
    const newConversationMessages: ConversationMessage[] = nonDuplicateMsgs.map(m => ({
      id: m.id,
      sender: m.sender,
      text: m.text,
      timestamp: m.timestamp,
      channel: m.channel,
      subject: m.subject,
      status: m.sender === "nathan" ? "sent" : "received",
      importSource: convo.source,
      importedAt: new Date().toISOString(),
      confidenceScore: convo.matchConfidence
    }));

    if (convo.action === "merge_existing" && convo.matchedContactId) {
      // Find and update existing contact
      const contact = existingContacts.find(c => c.id === convo.matchedContactId);
      if (contact) {
        const existingMessages = contact.conversationMessages || [];
        const mergedMessages = [...existingMessages, ...newConversationMessages];

        const historyItem: ContactHistoryEvent = {
          id: "hist_" + Math.random().toString(36).substring(2, 9),
          type: "import",
          label: `Import de ${newConversationMessages.length} message(s) (${convo.channel === "linkedin" ? "LinkedIn" : "Email"})`,
          timestamp: new Date().toISOString()
        };

        const updatedContact: Contact = {
          ...contact,
          networkingStatus: convo.detectedStatus || contact.networkingStatus,
          nextAction: convo.detectedNextAction || contact.nextAction,
          nextFollowUpDate: convo.detectedNextAction?.dueDate || contact.nextFollowUpDate,
          lastOutreachDate: newConversationMessages[newConversationMessages.length - 1]?.timestamp || contact.lastOutreachDate,
          conversationMessages: mergedMessages,
          history: [historyItem, ...(contact.history || [])]
        };

        dbStore.updateContact(updatedContact);
        updatedContactsCount++;
        importedMessagesCount += newConversationMessages.length;
        affectedContactIds.push(updatedContact.id);
      }
    } else if (convo.action === "create_new" || !convo.matchedContactId) {
      // Sécurité anti-doublon absolue : vérifier si le contact existe déjà dans la base existante
      const currentContacts = dbStore.getContacts();
      const existingMatch = resolveContact(convo.contactCandidate, currentContacts);
      
      const candNorm = normalizePersonName(convo.contactCandidate.fullName);
      const nameExact = currentContacts.find(c => {
        const cNorm = normalizePersonName(c.fullName);
        if (cNorm && cNorm === candNorm) return true;
        const cFirst = normalizePersonName(c.firstName);
        const cLast = normalizePersonName(c.lastName);
        if (cFirst && cLast && (`${cFirst} ${cLast}` === candNorm || `${cLast} ${cFirst}` === candNorm)) return true;
        return false;
      });

      const contactToMerge = (existingMatch.matchedContact && existingMatch.matchScore >= 60) ? existingMatch.matchedContact : nameExact;

      if (contactToMerge) {
        // Un contact correspondant existe dans NACORA -> fusionner les messages plutôt que de créer un doublon
        const contact = contactToMerge;
        const existingMessages = contact.conversationMessages || [];
        const mergedMessages = [...existingMessages, ...newConversationMessages];

        const historyItem: ContactHistoryEvent = {
          id: "hist_" + Math.random().toString(36).substring(2, 9),
          type: "import",
          label: `Import de ${newConversationMessages.length} message(s) (${convo.channel === "linkedin" ? "LinkedIn" : "Email"})`,
          timestamp: new Date().toISOString()
        };

        const updatedContact: Contact = {
          ...contact,
          linkedInUrl: contact.linkedInUrl || convo.contactCandidate.linkedInUrl,
          networkingStatus: convo.detectedStatus || contact.networkingStatus,
          nextAction: convo.detectedNextAction || contact.nextAction,
          nextFollowUpDate: convo.detectedNextAction?.dueDate || contact.nextFollowUpDate,
          lastOutreachDate: newConversationMessages[newConversationMessages.length - 1]?.timestamp || contact.lastOutreachDate,
          conversationMessages: mergedMessages,
          history: [historyItem, ...(contact.history || [])]
        };

        dbStore.updateContact(updatedContact);
        updatedContactsCount++;
        importedMessagesCount += newConversationMessages.length;
        affectedContactIds.push(updatedContact.id);
        continue;
      }

      // Create new contact in NACORA
      const cand = convo.contactCandidate;

      // Protection supplémentaire : ne jamais créer de contact sponsorisé ou publicitaire
      if (
        isSponsoredOrAdvertisingName(cand.fullName) ||
        (cand.fullName && (cand.fullName.toLowerCase().includes("sponsored") || cand.fullName.toLowerCase().includes("sponsoris")))
      ) {
        continue;
      }

      const { company: linkedCo } = resolveCompany({ companyName: cand.companyName || "Entreprise" });
      const funcClassification = classifyContactFunction(cand.jobTitle, linkedCo.name);

      const historyItem: ContactHistoryEvent = {
        id: "hist_" + Math.random().toString(36).substring(2, 9),
        type: "import",
        label: `Contact créé par import de conversation (${convo.channel === "linkedin" ? "LinkedIn" : "Email"})`,
        timestamp: new Date().toISOString()
      };

      const created = dbStore.addContact({
        fullName: cand.fullName,
        firstName: cand.firstName || cand.fullName.split(" ")[0] || "",
        lastName: cand.lastName || cand.fullName.split(" ").slice(1).join(" ") || "",
        jobTitle: cand.jobTitle || "Professionnel",
        normalizedJobTitle: cand.jobTitle || "Professionnel",
        function: funcClassification.function,
        functionSource: funcClassification.functionSource,
        functionConfidence: funcClassification.functionConfidence,
        functionClassifiedAt: funcClassification.functionClassifiedAt,
        companyId: linkedCo.id,
        companyName: linkedCo.name,
        category: "sector_pro",
        email: cand.email,
        phone: cand.phone,
        linkedInUrl: cand.linkedInUrl,
        notes: `Créé par import de conversation (${convo.source}) le ${new Date().toLocaleDateString("fr-FR")}.`,
        relevanceScore: convo.professionalRelevance || 85,
        connectionPoints: [
          `Échange ${convo.channel === "linkedin" ? "LinkedIn" : "Email"} consigné`,
          ...(linkedCo.name ? [`Entreprise : ${linkedCo.name}`] : [])
        ],
        previousCompanies: [],
        networkingStatus: convo.detectedStatus,
        nextAction: convo.detectedNextAction,
        nextFollowUpDate: convo.detectedNextAction?.dueDate,
        lastOutreachDate: newConversationMessages[newConversationMessages.length - 1]?.timestamp,
        conversationMessages: newConversationMessages,
        history: [historyItem]
      });

      newContactsCount++;
      importedMessagesCount += newConversationMessages.length;
      affectedContactIds.push(created.id);
    }
  }

  return {
    updatedContactsCount,
    newContactsCount,
    importedMessagesCount,
    skippedDuplicatesCount,
    affectedContactIds
  };
}
