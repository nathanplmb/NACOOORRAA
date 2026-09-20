import { Contact, CandidateProfile, NetworkingRelevanceItem } from "../types";
import { isHumanResourcesRole, isBankingAndFinanceRole } from "./contactMerger";

/**
 * Computes deep, sector-relevant strategic networking pillars tailored to
 * Banking, Finance, Wealth Management, and Corporate ecosystem.
 */
export function computeStrategicInterests(
  contact: Partial<Contact>,
  profile?: Partial<CandidateProfile>
): {
  networkingRelevance: NetworkingRelevanceItem[];
  connectionPoints: string[];
  summary: string;
  relevanceScore: number;
} {
  const job = (contact.jobTitle || "").toLowerCase();
  const company = (contact.companyName || "").trim();
  const compLower = company.toLowerCase();
  const category = contact.category || "other";

  const pillars: NetworkingRelevanceItem[] = [];
  const connectionPoints: string[] = [...(contact.connectionPoints || [])];

  // Strict role detection: Bank advisor is NEVER a recruiter
  const isFinanceBanking = isBankingAndFinanceRole(contact.jobTitle, contact.companyName) ||
    /(patrimoine|wealth|banqu|financ|crédit|credit|invest|assurance|cgp|gestion privée|m&a|analyste|audit|trésor|trading|risk)/i.test(
      job + " " + (contact.sector || "")
    ) ||
    /(crédit agricole|lcl|bnp|société générale|axa|palatine|bpifrance|bpce|caisse d'epargne|banque populaire|cic|rothschild|natixis|allianz|swiss life)/i.test(
      compLower
    );

  const isRecruiter = isHumanResourcesRole(contact.jobTitle) ||
    (category === "recruiter" && !isFinanceBanking);

  const isAlumni =
    category === "alumni" ||
    Boolean(contact.academicPath) ||
    /alumni|uca|clermont|iut|iae|école|diplôm/i.test(job + " " + (contact.notes || ""));

  const isExecutive = /(directeur|directrice|director|ceo|dg\b|fondateur|founder|associé|partner|président|board|cfo|coo)/i.test(job);
  const isManager = /(manager|responsable|lead|chef de|head of|superviseur)/i.test(job);
  const isStudent = category === "student" || /(étudiant|alternan|stagiaire|intern\b|apprenti)/i.test(job);

  // 1. Recruiter
  if (isRecruiter) {
    pillars.push({
      type: "Recrutement",
      pillar: "Opportunités Directes & Recrutement",
      context: company ? `Recrutement & gestion des talents chez ${company}` : "Pôle recrutement et carrières",
      recommendation: "Point de contact prioritaire pour présenter votre profil ciblé, solliciter un échange informel ou appuyer une candidature active.",
      confidence: "high",
      reason: "Décideur RH ou Talent Acquisition pouvant débloquer des opportunités"
    });
    pillars.push({
      type: "Marché Caché",
      pillar: "Veille Pré-recrutement & Détection",
      context: company ? `Anticipation des besoins en alternance et stage chez ${company}` : "Anticipation des besoins RH",
      recommendation: "Établir un premier contact courtois pour être identifié dans le vivier avant la parution des offres.",
      confidence: "high",
      reason: "Accès privilégié aux ouvertures de postes en préparation"
    });
    if (!connectionPoints.some(p => /recrut|rh/i.test(p))) {
      connectionPoints.push(company ? `Recrutement RH chez ${company}` : "Contact Recrutement / RH");
    }
  }

  // 2. Alumni
  if (isAlumni) {
    pillars.push({
      type: "Alumni",
      pillar: "Mentorat & Partage d'Expérience",
      context: `Réseau académique commun (${contact.academicPath || profile?.currentSituation || "Enseignement Supérieur"})`,
      recommendation: "Solliciter un échange de 15 minutes sur les réalités du poste, la culture d'entreprise et les clés de réussite aux entretiens.",
      confidence: "high",
      reason: "Proximité académique et bienveillance naturelle d'alumni"
    });
    pillars.push({
      type: "Cooptation",
      pillar: "Recommandation Interne (Cooptation)",
      context: company ? `Présence active au sein de ${company}` : "Positionnement interne en entreprise",
      recommendation: "Une mise en relation ou une cooptation par un alumni augmente considérablement le taux de conversion en entretien.",
      confidence: "high",
      reason: "Levier de cooptation interne puissant"
    });
    if (!connectionPoints.some(p => /alumni|école|formation/i.test(p))) {
      connectionPoints.push(contact.academicPath ? `Alumni : ${contact.academicPath}` : "Réseau Alumni");
    }
  }

  // 3. Sector Pro (Finance, Banque, Patrimoine)
  if (isFinanceBanking && !isRecruiter) {
    pillars.push({
      type: "Secteur Cible",
      pillar: "Veille Métier & Enjeux Opérationnels",
      context: `Expertise métier (${contact.jobTitle || "Finance"} ${company ? `chez ${company}` : ""})`,
      recommendation: "Échanger sur les évolutions techniques, réglementaires ou commerciales du secteur pour affûter votre discours d'entretien.",
      confidence: "high",
      reason: "Praticien du secteur cible avec vision terrain opérationnelle"
    });
    pillars.push({
      type: "Synergie",
      pillar: "Accès au Réseau Métier",
      context: `Écosystème Banque, Finance & Gestion de Patrimoine`,
      recommendation: "Entretenir un contact régulier par des commentaires constructifs ou partages de veille pour rester dans son radar.",
      confidence: "medium",
      reason: "Connexion clé dans votre secteur de spécialisation"
    });
    if (!connectionPoints.some(p => /secteur|métier|banque|finance/i.test(p))) {
      connectionPoints.push(company ? `Expertise métier chez ${company}` : "Acteur du secteur cible");
    }
  }

  // 4. Executive / Manager
  if ((isExecutive || isManager) && !isRecruiter && !isAlumni) {
    pillars.push({
      type: "Décideur",
      pillar: "Vision Stratégique & Décideur",
      context: `${isExecutive ? "Cadre Dirigeant" : "Manager Opérationnel"} ${company ? `chez ${company}` : ""}`,
      recommendation: "Adopter une posture d'écoute et d'apprentissage en valorisant votre compréhension de ses enjeux d'équipe.",
      confidence: "high",
      reason: "Pouvoir d'arbitrage ou d'influence sur les embauches"
    });
  }

  // 5. Student / Alternant
  if (isStudent && !isRecruiter && !isAlumni) {
    pillars.push({
      type: "Entraide",
      pillar: "Entraide & Retours de Stages / Alternance",
      context: `Pair étudiant ou alternant dans le secteur`,
      recommendation: "Partager des retours d'expérience sur les missions, le processus de recrutement et les contacts utiles dans son entreprise.",
      confidence: "medium",
      reason: "Pair favorisant le partage d'opportunités et d'astuces de candidatures"
    });
  }

  // Fallback if empty
  if (pillars.length === 0) {
    pillars.push({
      type: "Réseau",
      pillar: "Élargissement du Réseau Professionnel",
      context: `Écosystème professionnel étendu ${company ? `(${company})` : ""}`,
      recommendation: "Maintenir une veille relationnelle bienveillante et saisir les occasions de rebondir sur des évolutions de carrière.",
      confidence: "medium",
      reason: "Contact de l'écosystème à potentiel de synergie future"
    });
  }

  // Score computation
  let calculatedScore = contact.relevanceScore || 50;
  if (isAlumni && isFinanceBanking) calculatedScore = Math.max(calculatedScore, 95);
  else if (isRecruiter && isFinanceBanking) calculatedScore = Math.max(calculatedScore, 92);
  else if (isAlumni) calculatedScore = Math.max(calculatedScore, 90);
  else if (isRecruiter) calculatedScore = Math.max(calculatedScore, 88);
  else if (isFinanceBanking) calculatedScore = Math.max(calculatedScore, 85);
  else if (isExecutive || isManager) calculatedScore = Math.max(calculatedScore, 80);
  else if (isStudent) calculatedScore = Math.max(calculatedScore, 65);

  // Summary
  const roleLabel = isRecruiter
    ? "Recruteur RH"
    : isAlumni
    ? "Alumni & Professionnel"
    : isFinanceBanking
    ? "Professionnel Banque & Finance"
    : isExecutive
    ? "Dirigeant"
    : isManager
    ? "Manager"
    : "Contact professionnel";

  const summary =
    contact.summary ||
    `${roleLabel} (${contact.jobTitle || "Poste non précisé"})${company ? ` chez ${company}` : ""}. Profil stratégique offrant des opportunités concrètes de mise en relation, de veille métier et de développement réseau.`;

  return {
    networkingRelevance: pillars,
    connectionPoints: connectionPoints.length > 0 ? connectionPoints : ["Contact professionnel répertorié"],
    summary,
    relevanceScore: calculatedScore
  };
}

/**
 * Ensures contact has populated strategic interests, connection points, and summary.
 */
export function ensureContactStrategicRelevance(
  contact: Contact,
  profile?: CandidateProfile
): Contact {
  if (
    contact.networkingRelevance &&
    contact.networkingRelevance.length > 0 &&
    contact.connectionPoints &&
    contact.connectionPoints.length > 0
  ) {
    return contact;
  }

  const computed = computeStrategicInterests(contact, profile);

  return {
    ...contact,
    networkingRelevance:
      contact.networkingRelevance && contact.networkingRelevance.length > 0
        ? contact.networkingRelevance
        : computed.networkingRelevance,
    connectionPoints:
      contact.connectionPoints && contact.connectionPoints.length > 0
        ? contact.connectionPoints
        : computed.connectionPoints,
    summary: contact.summary || computed.summary,
    relevanceScore: contact.relevanceScore || computed.relevanceScore
  };
}

/**
 * Calls Gemini API or heuristic fallback to evaluate and update strategic interests for a contact.
 */
export async function requestAiStrategicInterests(
  contact: Contact,
  profile: CandidateProfile
): Promise<{
  networkingRelevance: NetworkingRelevanceItem[];
  connectionPoints: string[];
  summary: string;
  relevanceScore: number;
}> {
  try {
    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "evaluateContactStrategicInterests",
        payload: {
          contact: {
            fullName: contact.fullName,
            jobTitle: contact.jobTitle,
            companyName: contact.companyName,
            category: contact.category,
            academicPath: contact.academicPath,
            sector: contact.sector,
            notes: contact.notes
          },
          profile
        }
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.networkingRelevance) && data.networkingRelevance.length > 0) {
        return {
          networkingRelevance: data.networkingRelevance,
          connectionPoints: Array.isArray(data.connectionPoints) && data.connectionPoints.length > 0
            ? data.connectionPoints
            : (contact.connectionPoints || []),
          summary: data.summary || contact.summary || "",
          relevanceScore: typeof data.relevanceScore === "number" ? data.relevanceScore : (contact.relevanceScore || 85)
        };
      }
    }
  } catch (err) {
    console.warn("AI strategic evaluation fallback to local heuristics:", err);
  }

  // Fallback to rich local computation
  return computeStrategicInterests(contact, profile);
}
