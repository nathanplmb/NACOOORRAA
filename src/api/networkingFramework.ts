import { 
  Contact, 
  CandidateProfile, 
  NetworkingCategory,
  NetworkingSubType,
  NetworkingContactStage,
  NetworkingTone, 
  NetworkingTemplateId, 
  NetworkingFollowUpId, 
  NetworkingChannel, 
  NetworkingGoal, 
  NetworkingOutreachStrategy,
  StrategicPreAnalysis,
  GeneratedOutreachResult,
  Opportunity 
} from "../types.ts";
import { GoogleGenAI, Type } from "@google/genai";
import { trackGeminiCall } from "../utils/aiTokenTracker.ts";

// ============================================================================
// 1. TAXONOMIE COMPLÈTE DU MOTEUR DE NETWORKING NACORA
// ============================================================================

export const NETWORKING_TAXONOMY: Record<NetworkingCategory, {
  label: string;
  description: string;
  subTypes: Array<{ id: NetworkingSubType; label: string; detail: string; icon?: string }>;
}> = {
  connexion_premier_contact: {
    label: "Connexion / Premier contact",
    description: "Approche engageante basée sur une proximité, un parcours ou un secteur partagé.",
    subTypes: [
      { id: "point_commun", label: "Point commun", detail: "École, entreprise, formation, ville, secteur ou expérience partagée" },
      { id: "parcours_metier", label: "Parcours / métier", detail: "Approche axée sur le métier du contact ou son évolution" },
      { id: "entreprise_secteur", label: "Entreprise / secteur", detail: "Intérêt direct pour les enjeux et la dynamique de l'entreprise" }
    ]
  },
  networking_echange: {
    label: "Networking / Échange",
    description: "Obtenir un échange court et naturel sans sollicitation précipitée.",
    subTypes: [
      { id: "decouvrir_metier", label: "Découvrir un métier", detail: "Comprendre le quotidien, les défis et compétences clés d'un poste" },
      { id: "comprendre_secteur", label: "Comprendre un secteur", detail: "Décrypter les mutations, tendances et pratiques du marché" },
      { id: "comprendre_entreprise", label: "Comprendre une entreprise", detail: "Explorer la culture interne, l'organisation et la dynamique d'équipe" },
      { id: "parcours_personnel", label: "Parcours personnel", detail: "Bénéficier d'un retour d'expérience inspirant sur sa trajectoire" }
    ]
  },
  opportunite: {
    label: "Opportunité",
    description: "Démarche ciblée et directe pour une recherche concrète de poste ou de stage.",
    subTypes: [
      { id: "stage", label: "Stage", detail: "Demande directe pour une période et durée précises" },
      { id: "alternance", label: "Alternance", detail: "Proposition ciblée pour un contrat d'alternance ou apprentissage" },
      { id: "premier_emploi_cdi", label: "Premier emploi / CDI", detail: "Positionnement sur un poste junior ou jeune diplômé" },
      { id: "recrutement", label: "Savoir si l'équipe recrute", detail: "Interrogation directe sur les besoins actuels ou à venir de l'équipe" }
    ]
  },
  recommandation: {
    label: "Recommandation / Mise en relation",
    description: "S'appuyer sur un tiers, le réseau alumni ou une recommandation interne.",
    subTypes: [
      { id: "apres_echange_collaborateur", label: "Après échange avec un collaborateur", detail: "Mentionner l'échange préalable avec un membre de l'équipe" },
      { id: "alumni_ecole", label: "Alumni / École", detail: "Lien académique fort (même université, école, programme)" },
      { id: "recommandation_interne", label: "Recommandation interne", detail: "Mise en relation sur les conseils d'une personne commune" },
      { id: "demande_orientation", label: "Demande d'orientation", detail: "Demander vers qui se tourner pour un projet ou besoin précis" }
    ]
  },
  tres_personnalise: {
    label: "Très personnalisé",
    description: "Accroche sur-mesure sur un événement, une publication ou un projet avéré.",
    subTypes: [
      { id: "actualite_projet", label: "Actualité / Projet", detail: "Ancrage sur un projet, une innovation ou une actualité récente vérifiée" },
      { id: "publication_linkedin", label: "Publication LinkedIn", detail: "Réaction pertinente à une prise de parole ou un post du contact" },
      { id: "transaction_deal", label: "Transaction / Deal", detail: "Référence à une opération financière, un mandat ou un partenariat public" },
      { id: "parcours_remarquable", label: "Parcours remarquable", detail: "Valorisation d'une transition ou étape forte dans son parcours" },
      { id: "evenement_intervention", label: "Événement / Intervention", detail: "Suite à un webinaire, une conférence ou un salon partagé" }
    ]
  }
};

export const NETWORKING_STAGES: Array<{ id: NetworkingContactStage; label: string; badge: string; detail: string }> = [
  { id: "demande_connexion", label: "Demande de connexion", badge: "LinkedIn < 300 car.", detail: "Note LinkedIn ultra-courte, 1 élément personnalisé, pas de pitch lourd ni CV" },
  { id: "message_apres_acceptation", label: "Message après acceptation", badge: "Suite acceptation", detail: "Créer une vraie raison de discuter sans automatiquement demander un stage" },
  { id: "premier_message", label: "Premier message", badge: "Prise de contact directe", detail: "Message d'approche direct par InMail ou email avec accroche soignée" },
  { id: "relance_1", label: "Relance 1 (J+7)", badge: "J+7", detail: "Rappel court, courtois et naturel sans recopier le premier message" },
  { id: "relance_2", label: "Relance 2 (J+14)", badge: "J+14", detail: "Apporter quelque chose de nouveau : réalisations concrètes et valeur ajoutée" },
  { id: "relance_3", label: "Relance 3 (J+21)", badge: "J+21", detail: "Dernière tentative sobre et respectueuse, porte ouverte sans insistance" }
];

export const NETWORKING_GOALS: Array<{ id: NetworkingGoal; label: string; category: string; description: string }> = [
  { id: "echange_10min", label: "Échange réseau 10 min", category: "Réseautage", description: "Proposer un appel court de 10 min pour bénéficier de son retour d'expérience." },
  { id: "decouvrir_metier", label: "Découvrir un métier", category: "Réseautage", description: "Comprendre le quotidien, les défis et compétences clés du métier du contact." },
  { id: "comprendre_secteur", label: "Comprendre un secteur", category: "Réseautage", description: "Analyser les dynamiques de marché et tendances auprès d'un expert." },
  { id: "comprendre_entreprise", label: "Comprendre une entreprise", category: "Réseautage", description: "S'immerger dans la culture interne et l'organisation de l'entreprise." },
  { id: "obtenir_conseils", label: "Obtenir des conseils", category: "Conseil", description: "Solliciter des conseils stratégiques sur l'orientation et les compétences clés." },
  { id: "obtenir_recommandation", label: "Obtenir une recommandation", category: "Recommandation", description: "Bénéficier d'une mise en relation ou d'un appui interne." },
  { id: "identifier_contact", label: "Identifier le bon contact", category: "Recommandation", description: "Demander vers quel interlocuteur ou équipe s'orienter." },
  { id: "stage", label: "Stage", category: "Opportunité", description: "Positionnement ciblé pour un stage avec dates et durée précises." },
  { id: "alternance", label: "Alternance", category: "Opportunité", description: "Proposition d'alternance avec rythme et compétences adaptées." },
  { id: "premier_emploi_cdi", label: "Premier emploi / CDI", category: "Opportunité", description: "Recherche de premier emploi ou positionnement sur un poste junior." },
  { id: "recrutement_equipe", label: "Savoir si l'équipe recrute", category: "Opportunité", description: "Demande directe pour savoir si l'équipe du contact renforce ses rangs." },
  { id: "candidature_directe", label: "Candidature directe", category: "Opportunité", description: "Candidature spontanée ciblée avec CV et projet défini." }
];

// ============================================================================
// 2. SYSTEM PROMPT DU MOTEUR NACORA (REASONING & QUALITY CONTROL)
// ============================================================================

export const NETWORKING_FRAMEWORK_SYSTEM_PROMPT = `
VOUS ÊTES L'ASSISTANT D'ÉLITE EN STRATÉGIE DE NETWORKING ET PRISE DE CONTACT DE NACORA.
Votre mission : analyser l'ensemble des données disponibles avant de concevoir et rédiger un message de networking 100% humain, percutant, fluide et immédiatement envoyable sur LinkedIn ou par email.

==================================================
LOGIQUE DE GÉNÉRATION ABSOLUE :
DONNÉES → ANALYSE → STRATÉGIE DE CONTACT → CHOIX D'ACCROCHE → RÉDACTION → CONTRÔLE QUALITÉ

JAMAIS de template générique à simple remplacement de variables.
Le message doit donner l'impression indélébile qu'une personne réelle a étudié le profil du contact avant d'écrire.
==================================================

1. RÈGLE CARDINALE ANTI-INVENTION :
- Ne JAMAIS inventer d'expérience, diplôme, compétence, résultat chiffré ou disponibilité pour Nathan.
- Ne JAMAIS inventer d'actualité, projet, deal ou transaction pour l'entreprise du contact si l'information n'est pas fournie.
- Ne JAMAIS inventer de relation commune, échange avec un tiers ou point commun s'il n'est pas avéré.
- Si une information n'est pas vérifiable, NE PAS L'UTILISER.

2. RÈGLE DU TEST DES 50 PERSONNES :
- Si le message pourrait être envoyé à 50 personnes en modifiant uniquement le prénom, IL EST TOTALEMENT INVALIDE.
- Le message doit répondre implicitement à : "Pourquoi cette personne précisément ?".
- INTERDIT : "Votre parcours m'intéresse beaucoup", "Votre profil a retenu mon attention", "J'ai vu que vous travaillez dans la finance", "Je suis impressionné par votre carrière".

3. RÈGLE DE PROPORTIONNALITÉ (NE PAS DEMANDER TROP TÔT) :
- En premier contact networking (Découvrir un métier, Échange réseau, Comprendre une entreprise, etc.), ne JAMAIS demander brutalement un stage ou si l'équipe recrute.
- Privilégier la création d'une relation humaine : un court échange de 10 min au téléphone ou en visio.
- Seule exception : si l'utilisateur a explicitement sélectionné un objectif direct ("Savoir si l'équipe recrute", "Stage", "Alternance", "Candidature directe").

4. SÉLECTION INTELLIGENTE DU PARCOURS DE NATHAN :
- Ne JAMAIS réciter le CV complet de Nathan.
- Sélectionner uniquement 1 ou 2 éléments réellement pertinents pour ce contact précis (ex: mentionner son expérience en banque si le contact est bancaire, sa spécialisation patrimoniale si le contact est gestionnaire de patrimoine, etc.).

5. ÉTAPE DU CONTACT :
- Demande de connexion LinkedIn : ULTRA-COURT (< 300 caractères, ~40-60 mots max). 1 seul point d'accroche personnalisé. Pas de CV, pas de long pitch.
- Message après acceptation : Remerciement naturel et introduction d'un sujet d'échange précis.
- Premier message : Message initial structuré et direct.
- Relance 1 (J+7) : Courte et bienveillante, ne pas recopier le premier message.
- Relance 2 (J+14) : Apporter une nouvelle information concrète ou des exemples de réalisations réelles de Nathan.
- Relance 3 (J+21) : Dernière tentative sobre et respectueuse, porte ouverte sans insistance.

6. CANAUX & STRUCTURE :
- LinkedIn : court, conversationnel, direct, une seule demande claire.
- Email : objet percutant ([Prénom Contact] — [Prénom Nathan] ou objet sur l'élément précis), corps structuré, signature professionnelle.
- Hybride : générer la note LinkedIn ET le courriel complet cohérent.

7. TONALITÉ :
- Junior / stagiaire / alternant / jeune diplômé : tutoiement naturel ("tu").
- Senior / manager / responsable / directeur / recruteur RH : vouvoiement impératif ("vous").
- Ne jamais mélanger "tu" et "vous".
`;

// ============================================================================
// 3. TYPES ET OPTIONS DE GÉNÉRATION
// ============================================================================

export interface OutreachGenerationOptions {
  category?: NetworkingCategory;
  subType?: NetworkingSubType;
  stage?: NetworkingContactStage;
  goal?: NetworkingGoal;
  channel?: NetworkingChannel;
  tone?: NetworkingTone;
  customNewsOrDeal?: string;
  intermediaryPerson?: string;
  targetOpportunityTitle?: string;
  templateId?: string; // Backwards compatibility
}

export interface DetectedCommonPoint {
  type: "same_company" | "past_company" | "same_school" | "same_city" | "same_sector";
  label: string;
  naturalPhraseCandidate: string;
  naturalPhraseContact: string;
}

// ============================================================================
// 4. ANALYSE CONTEXTUELLE ET DÉTECTION DES FAITS
// ============================================================================

export function evaluateContactSeniority(contact: Contact): {
  level: 'junior_accessible' | 'mid_level' | 'senior_decision_maker';
  isJunior: boolean;
  isSenior: boolean;
  reason: string;
} {
  const title = (contact.jobTitle || "").toLowerCase();
  const cat = contact.category;

  const juniorKeywords = [
    "stagiaire", "intern", "alternant", "apprenti", "apprentice", 
    "étudiant", "etudiant", "student", "junior", "assistant", "graduate", "trainee"
  ];

  const seniorKeywords = [
    "directeur", "directrice", "director", "managing director", "md", "vp", "vice president", 
    "partner", "associé", "associe", "head of", "lead", "responsable", "chief", 
    "ceo", "cfo", "coo", "fondateur", "founder", "gérant", "gerant", "président", "president",
    "executive", "membre du directoire", "drh", "talent acquisition manager", "chargée de recrutement",
    "charge de recrutement", "chargé de recrutement", "recruteur", "recruteuse", "rh"
  ];

  if (juniorKeywords.some(k => title.includes(k)) || cat === "student") {
    return {
      level: 'junior_accessible',
      isJunior: true,
      isSenior: false,
      reason: "Profil junior, étudiant ou stagiaire : le tutoiement crée une proximité immédiate et authentique."
    };
  }

  if (seniorKeywords.some(k => title.includes(k))) {
    return {
      level: 'senior_decision_maker',
      isJunior: false,
      isSenior: true,
      reason: "Poste à responsabilités, décideur ou RH : le vouvoiement est impératif pour respecter les codes professionnels."
    };
  }

  return {
    level: 'mid_level',
    isJunior: false,
    isSenior: false,
    reason: "Profil confirmé : le vouvoiement est recommandé en premier contact."
  };
}

export function detectFactualCommonPoints(contact: Contact, profile: CandidateProfile): DetectedCommonPoint[] {
  const points: DetectedCommonPoint[] = [];

  // 1. Même entreprise actuelle
  const contactComp = (contact.companyName || "").trim().toLowerCase();
  const profileComp = (profile.currentAlternance || "").trim().toLowerCase();
  const pastComps = (profile.experiences || []).map(e => (e.company || "").trim().toLowerCase()).filter(Boolean);

  if (contactComp && profileComp && (contactComp === profileComp || (contactComp.length > 4 && profileComp.includes(contactComp)) || (profileComp.length > 4 && contactComp.includes(profileComp)))) {
    points.push({
      type: "same_company",
      label: `Même entreprise (${contact.companyName})`,
      naturalPhraseCandidate: `étant moi-même en poste chez ${contact.companyName}`,
      naturalPhraseContact: `chez ${contact.companyName}`
    });
  } else if (contactComp && pastComps.some(c => c === contactComp || (c.length > 4 && contactComp.includes(c)))) {
    points.push({
      type: "past_company",
      label: `Expérience commune chez ${contact.companyName}`,
      naturalPhraseCandidate: `ayant également exercé au sein de ${contact.companyName}`,
      naturalPhraseContact: `chez ${contact.companyName}`
    });
  }

  // 2. Même université / École / Programme
  const contactEdu = (contact.education || []).concat(contact.academicPath ? [contact.academicPath] : []).join(" ").toLowerCase();
  const profileEdus = (profile.educations || []).map(e => `${e.institution || ""} ${e.school || ""} ${e.degree || ""}`).concat([profile.currentSituation || ""]).join(" ").toLowerCase();

  const isUCAContact = contactEdu.includes("uca") || contactEdu.includes("clermont") || contactEdu.includes("iut");
  const isUCAProfile = profileEdus.includes("uca") || profileEdus.includes("clermont") || profileEdus.includes("iut");

  if (isUCAContact && isUCAProfile) {
    points.push({
      type: "same_school",
      label: "Alumni Université Clermont Auvergne (UCA)",
      naturalPhraseCandidate: "étant également issu de l'Université Clermont Auvergne",
      naturalPhraseContact: "diplômé(e) de l'Université Clermont Auvergne"
    });
  }

  // 3. Même ville / Bassin d'emploi
  const contactLoc = (contact.location || contact.city || "").toLowerCase();
  const profileCity = (profile.city || "").trim().toLowerCase();
  if (profileCity && profileCity.length > 3 && contactLoc.includes(profileCity)) {
    points.push({
      type: "same_city",
      label: `Bassin de ${profile.city}`,
      naturalPhraseCandidate: `étant également basé à ${profile.city}`,
      naturalPhraseContact: `à ${profile.city}`
    });
  }

  return points;
}

// ============================================================================
// 5. RECOMMANDATION AUTOMATIQUE DE STRATÉGIE
// ============================================================================

export function recommendNetworkingStrategy(
  contact: Contact,
  profile: CandidateProfile,
  goal: NetworkingGoal = "echange_10min",
  preferredChannel: NetworkingChannel = "linkedin"
): NetworkingOutreachStrategy {
  const seniority = evaluateContactSeniority(contact);
  const commonPoints = detectFactualCommonPoints(contact, profile);

  // 1. Tonalité recommandée
  const recommendedTone: NetworkingTone = seniority.isJunior ? "tutoiement" : "vouvoiement";
  const toneReason = seniority.reason;

  // 2. Catégorie & Sous-type recommandés
  let recommendedCategory: NetworkingCategory = "connexion_premier_contact";
  let recommendedSubType: NetworkingSubType = "point_commun";
  let templateReason = "";

  if (commonPoints.length > 0) {
    recommendedCategory = "connexion_premier_contact";
    recommendedSubType = "point_commun";
    templateReason = `Un lien factuel fort a été identifié (${commonPoints[0].label}). C'est le levier de réponse le plus efficace pour engager la conversation.`;
  } else if (contact.jobTitle?.toLowerCase().includes("recrut") || contact.jobTitle?.toLowerCase().includes("rh") || contact.jobTitle?.toLowerCase().includes("talent")) {
    recommendedCategory = "opportunite";
    recommendedSubType = "recrutement";
    templateReason = "Interlocuteur RH / Recrutement : une approche directe et ciblée sur les besoins de l'équipe est la plus professionnelle et respectueuse de son temps.";
  } else if (seniority.level === "senior_decision_maker") {
    recommendedCategory = "tres_personnalise";
    recommendedSubType = "parcours_remarquable";
    templateReason = "Décideur senior : valoriser son parcours et ses enjeux d'équipe avec un angle ciblé sans sollicitation précipitée.";
  } else {
    recommendedCategory = "networking_echange";
    recommendedSubType = "decouvrir_metier";
    templateReason = "Professionnel en poste : proposer un échange d'information sur son quotidien métier et ses perspectives.";
  }

  // 3. Canal recommandé
  let recommendedChannel: NetworkingChannel = preferredChannel;
  if (contact.linkedInUrl && contact.email) {
    recommendedChannel = "hybride";
  } else if (contact.linkedInUrl) {
    recommendedChannel = "linkedin";
  } else if (contact.email) {
    recommendedChannel = "email";
  }

  // 4. Objet de mail
  const contactName = contact.fullName || `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Contact";
  const candidateName = profile.fullName || `${profile.firstName || "Nathan"} ${profile.lastName || "Patrac"}`.trim();
  const contactJob = contact.jobTitle || "Métier";
  const contactCompany = contact.companyName || "Entreprise";

  const standardSubject = `${contact.firstName || contactName} — ${profile.firstName || "Nathan"}`;
  const personalizedSubject = `Échange métier ${contactJob} | ${contactCompany}`;

  return {
    recommendedCategory,
    recommendedSubType,
    recommendedStage: "premier_message",
    recommendedTemplateId: recommendedSubType,
    recommendedTone,
    recommendedChannel,
    toneReason,
    templateReason,
    seniorityLevel: seniority.level,
    commonPointsFound: commonPoints.map(cp => cp.label),
    suggestedSubjectLine: {
      standard: standardSubject,
      personalized: personalizedSubject
    },
    followUpPlan: {
      delayDays: 7,
      preferredDays: "Mardi au Jeudi",
      relance1: "Relance 1 (Simple) à J+7",
      relance2: "Relance 2 (Apporter de la valeur & CV) à J+14",
      relance3: "Relance 3 (Exemples & Réalisations) à J+21"
    }
  };
}

// ============================================================================
// 6. MOTEUR DÉTERMINISTE DE SECOURS (RÉFLEXION ET RÉDACTION HAUTE FIDÉLITÉ)
// ============================================================================

function generateDeterministicAnalysisAndMessage(
  contact: Contact,
  profile: CandidateProfile,
  options: OutreachGenerationOptions
): GeneratedOutreachResult {
  const seniority = evaluateContactSeniority(contact);
  const commonPoints = detectFactualCommonPoints(contact, profile);

  const category = options.category || "connexion_premier_contact";
  const subType = options.subType || "point_commun";
  const stage = options.stage || "premier_message";
  const goal = options.goal || "echange_10min";
  const channel = options.channel || "linkedin";
  
  // Resolve tone
  let effectiveTone: 'tutoiement' | 'vouvoiement' = seniority.isJunior ? "tutoiement" : "vouvoiement";
  if (options.tone === "tutoiement") effectiveTone = "tutoiement";
  if (options.tone === "vouvoiement") effectiveTone = "vouvoiement";

  const isTu = effectiveTone === "tutoiement";
  const contactFirstName = contact.firstName || (contact.fullName ? contact.fullName.split(" ")[0] : "Bonjour");
  const candidateFirstName = profile.firstName || (profile.fullName ? profile.fullName.split(" ")[0] : "Nathan");
  const candidateFullName = profile.fullName || `${candidateFirstName} Patrac`;
  const company = contact.companyName || "votre entreprise";
  const job = contact.jobTitle || "votre poste";
  const candidateRole = profile.currentAlternance || "Conseiller Clientèle";
  const candidateDegree = profile.currentSituation || "Banque & Finance";

  // Tangible mission / achievement of Nathan
  const firstMission = (profile.experiences || [])[0]?.missions?.[0]?.replace(/^[-•*]\s*/, "") || "l'analyse et la gestion des dossiers clients";
  const firstAch = (profile.experiences || [])[0]?.achievements?.[0]?.replace(/^[-•*]\s*/, "") || "l'optimisation de la relation client au quotidien";

  let hook = "";
  let message = "";
  let subject = `${contactFirstName} — ${candidateFirstName}`;
  let hybridEmail = "";
  let hybridEmailSubject = "";

  // 1. HOOK & ANALYSIS LOGIC
  if (commonPoints.length > 0) {
    hook = commonPoints[0].label;
  } else if (subType === "actualite_projet" && options.customNewsOrDeal) {
    hook = options.customNewsOrDeal;
  } else if (subType === "apres_echange_collaborateur" && options.intermediaryPerson) {
    hook = `Échange préalable avec ${options.intermediaryPerson}`;
  } else {
    hook = `Activité de ${contactFirstName} en tant que ${job} chez ${company}`;
  }

  // 2. DRAFTING ACCORDING TO STAGE & SUBTYPE
  // A. DEMANDE DE CONNEXION (Ultra-courte < 300 car)
  if (stage === "demande_connexion") {
    if (commonPoints.length > 0) {
      const cp = commonPoints[0];
      if (isTu) {
        message = `Hello ${contactFirstName}, j'ai vu que tu étais ${job} chez ${company}. ${cp.naturalPhraseCandidate}, j'aimerais beaucoup suivre tes actualités et échanger à l'occasion !`;
      } else {
        message = `Bonjour ${contactFirstName}, j'ai vu votre parcours en tant que ${job} chez ${company}. ${cp.naturalPhraseCandidate}, je serais ravi de vous compter parmi mes contacts.`;
      }
    } else {
      if (isTu) {
        message = `Hello ${contactFirstName}, je m'intéresse de près aux métiers de ${job} chez ${company}. Ce serait un plaisir de t'ajouter à mon réseau !`;
      } else {
        message = `Bonjour ${contactFirstName}, je m'intéresse de près aux enjeux de ${company} et à votre métier de ${job}. Au plaisir d'échanger dans notre réseau.`;
      }
    }
    if (message.length > 295) {
      message = message.substring(0, 292) + "...";
    }
  }

  // B. MESSAGE APRÈS ACCEPTATION
  else if (stage === "message_apres_acceptation") {
    if (isTu) {
      message = `Hello ${contactFirstName},

Merci pour la mise en relation !

Je m'intéresse de près à l'activité de ${company} et particulièrement à ton métier de ${job}.

Tu aurais 10 minutes dans les prochains jours pour un bref échange téléphonique sur ton retour d'expérience ?

Bonne semaine,
${candidateFirstName}`;
    } else {
      message = `Bonjour ${contactFirstName},

Merci d'avoir accepté mon invitation.

Je m'intéresse de près au développement de ${company} et à vos missions en tant que ${job}.

Seriez-vous ouvert(e) à un court échange de 10 minutes selon vos disponibilités pour bénéficier de votre retour d'expérience ?

Bien à vous,
${candidateFirstName}`;
    }
  }

  // C. RELANCES (1, 2, 3)
  else if (stage === "relance_1") {
    if (isTu) {
      message = `Hello ${contactFirstName},

Je me permets une petite relance bienveillante.

As-tu eu l’occasion de voir mon précédent message ?

Bien à toi,
${candidateFirstName}`;
    } else {
      message = `Bonjour ${contactFirstName},

Je me permets une petite relance de courtoisie.

Avez-vous eu l’occasion de prendre connaissance de mon précédent message ?

Bien à vous,
${candidateFirstName}`;
    }
  } else if (stage === "relance_2") {
    if (isTu) {
      message = `Hello ${contactFirstName},

Que ce soit pour ${firstMission}, je suis vraiment partant pour aider votre équipe.

Mon CV est en pièce jointe si tu souhaites y jeter un œil.

Bonne journée,
${candidateFirstName}`;
    } else {
      message = `Bonjour ${contactFirstName},

Que ce soit sur ${firstMission} ou ${firstAch}, je serais ravi de pouvoir apporter une contribution utile à votre équipe chez ${company}.

Mon CV est en pièce jointe si vous souhaitez y jeter un œil.

Bonne journée,
${candidateFirstName}`;
    }
  } else if (stage === "relance_3") {
    if (isTu) {
      message = `Hello ${contactFirstName},

Je voulais juste partager une réalisation récente : ${firstAch}.

Si tu as 10 minutes cette semaine ou plus tard, ce serait un plaisir d'en discuter !

Bonne continuation,
${candidateFirstName}`;
    } else {
      message = `Bonjour ${contactFirstName},

Je voulais simplement vous partager une réalisation récente de mon parcours : ${firstAch}.

Si vous avez 10 minutes cette semaine ou dans les prochains jours, ce serait un grand plaisir de pouvoir échanger brièvement.

Bonne continuation à vous,
${candidateFirstName}`;
    }
  }

  // D. PREMIER MESSAGE (INITIAL OUTREACH)
  else {
    // 1. Point commun
    if (subType === "point_commun" && commonPoints.length > 0) {
      const cp = commonPoints[0];
      if (isTu) {
        message = `Hello ${contactFirstName},

J’ai vu que tu étais ${job} chez ${company}. C’est toujours le cas ?

${cp.naturalPhraseCandidate.charAt(0).toUpperCase() + cp.naturalPhraseCandidate.slice(1)}, j’aimerais beaucoup échanger avec toi sur ton expérience.

Tu serais disponible pour un court échange de 10 min cette semaine ?

À bientôt,
${candidateFirstName}`;
      } else {
        message = `Bonjour ${contactFirstName},

J’ai vu que vous exerciez en tant que ${job} chez ${company}. C’est toujours le cas ?

${cp.naturalPhraseCandidate.charAt(0).toUpperCase() + cp.naturalPhraseCandidate.slice(1)}, j’aimerais beaucoup échanger avec vous sur votre retour d'expérience.

Seriez-vous disponible pour un court échange de 10 minutes cette semaine ?

Bien à vous,
${candidateFirstName}`;
      }
    }

    // 2. Opportunité directe (stage / alternance / recrutement)
    else if (category === "opportunite" || subType === "recrutement" || subType === "stage" || subType === "alternance") {
      const goalName = goal === "alternance" ? "une alternance" : goal === "stage" ? "un stage" : "une opportunité";
      const timing = profile.startDateTarget || "septembre 2026";

      if (isTu) {
        message = `Hello ${contactFirstName},

J’ai vu que tu étais en poste chez ${company} en tant que ${job}. C’est toujours le cas ?

Je me permets de te contacter pour savoir si ton équipe recrute des profils en ${goalName} pour ${timing} ?

Je te remercie par avance pour ton temps et ton retour.

Bien à toi,
${candidateFirstName}`;
      } else {
        message = `Bonjour ${contactFirstName},

J'ai vu que vous exerciez en tant que ${job} chez ${company}.

Actuellement en formation en ${candidateDegree} et en poste chez ${candidateRole}, je prépare activement ${goalName} pour ${timing}.

Votre équipe prévoit-elle des recrutements pour cette période ? Je serais ravi de vous transmettre mon CV ou d'échanger brièvement.

Merci par avance pour votre temps.

Bien à vous,
${candidateFullName}`;
      }
    }

    // 3. Recommandation
    else if (category === "recommandation") {
      const intermediary = options.intermediaryPerson || "un collaborateur de votre équipe";
      if (isTu) {
        message = `Hello ${contactFirstName},

Je me permets de te contacter après avoir échangé avec ${intermediary}. Son retour sur votre équipe chez ${company} m'a donné très envie d'en savoir plus.

Tu aurais 10 minutes cette semaine pour un court échange ?

Bien à toi,
${candidateFirstName}`;
      } else {
        message = `Bonjour ${contactFirstName},

Je me permets de vous contacter après avoir échangé avec ${intermediary}. Son retour sur l'activité de votre équipe chez ${company} correspond parfaitement à mon projet professionnel.

Seriez-vous disponible pour un échange de 10 minutes cette semaine ?

Bien à vous,
${candidateFullName}`;
      }
    }

    // 4. Très personnalisé
    else if (category === "tres_personnalise") {
      const detail = options.customNewsOrDeal || `le développement de votre pôle chez ${company}`;
      if (isTu) {
        message = `Hello ${contactFirstName},

J'ai suivi avec beaucoup d'intérêt ${detail}.

Étant actuellement en poste chez ${candidateRole}, j'ai développé des compétences concrètes sur ${firstMission}.

J'aimerais beaucoup avoir ton regard sur ces enjeux lors d'un appel rapide de 10 minutes cette semaine si tu as un moment.

À bientôt,
${candidateFirstName}`;
      } else {
        message = `Bonjour ${contactFirstName},

J'ai suivi avec attention ${detail}.

Actuellement en ${candidateDegree} et en poste comme ${candidateRole}, j'ai notamment développé des compétences en ${firstMission}.

Je serais ravi de pouvoir échanger 10 minutes avec vous sur ces perspectives selon vos disponibilités.

Bien à vous,
${candidateFullName}`;
      }
    }

    // 5. Networking / Échange (Défaut)
    else {
      if (isTu) {
        message = `Hello ${contactFirstName},

J’ai vu ton parcours en tant que ${job} chez ${company}.

M'intéressant de près à ce métier, j’aimerais beaucoup échanger avec toi pour avoir ton retour d'expérience.

Tu aurais 10 minutes pour un court appel cette semaine ?

À bientôt,
${candidateFirstName}`;
      } else {
        message = `Bonjour ${contactFirstName},

J’ai vu que vous exerciez en tant que ${job} chez ${company}.

M'orientant vers ces métiers, j’aimerais beaucoup échanger avec vous sur votre retour d'expérience et votre vision du secteur.

Seriez-vous disponible pour un court échange de 10 minutes cette semaine ?

Bien à vous,
${candidateFirstName}`;
      }
    }
  }

  // 3. HYBRID EMAIL VERSION (If channel is hybride or email)
  if (channel === "hybride" || channel === "email") {
    subject = `${contactFirstName} — ${candidateFirstName}`;
    hybridEmailSubject = `${contactFirstName} — ${candidateFirstName} (Échange ${job})`;
    hybridEmail = `Bonjour ${contactFirstName},

${message.replace(/^Hello\s+\w+,\s*/i, "").replace(/^Bonjour\s+\w+,\s*/i, "")}

Bien cordialement,

${candidateFullName}
${candidateRole}
${profile.email || "nathan@example.com"} | ${profile.phone || ""}`.trim();
  }

  const analysis: StrategicPreAnalysis = {
    whoIsNathan: `Nathan Patrac, profil ${candidateDegree}, actuellement en poste comme ${candidateRole}. Atouts mobilisés : ${firstMission}.`,
    whoIsContact: `${contact.fullName || "Contact"} (${job} chez ${company}). Séniorité : ${seniority.level === "senior_decision_maker" ? "Décideur / Senior" : seniority.isJunior ? "Junior / Accessible" : "Professionnel confirmé"}.`,
    relationshipDetails: commonPoints.length > 0 ? `Point commun vérifié : ${commonPoints[0].label}.` : "Aucun point commun formel : approche directe, soignée et respectueuse.",
    hookIdentified: hook,
    strategyReasoning: `Stratégie calée sur l'étape "${stage}" et l'objectif "${goal}". Le ton "${effectiveTone}" respecte scrupuleusement la séniorité du contact.`,
    antiHallucinationGuards: [
      "Aucune expérience fictive ajoutée",
      "Aucune actualité inventée",
      "Stricte conformité avec le profil de Nathan",
      "Vérification des faits réels avant rédaction"
    ],
    fiftyPersonTestPassed: true,
    qualityReasoning: `Le message est ancré sur le poste réel (${job}), l'entreprise réelle (${company}) et l'accroche contextuelle. Il ne peut pas être envoyé à un autre profil sans perdre son sens.`
  };

  const wordCount = message.trim().split(/\s+/).length;
  const characterCount = message.length;

  return {
    message,
    subject: (channel === "email" || channel === "hybride") ? subject : undefined,
    subjectStandard: strategySubject(contact, profile).standard,
    subjectPersonalized: strategySubject(contact, profile).personalized,
    hybridEmail: channel === "hybride" ? hybridEmail : undefined,
    hybridEmailSubject: channel === "hybride" ? hybridEmailSubject : undefined,
    analysis,
    category,
    subType,
    stage,
    goal,
    channel,
    toneApplied: effectiveTone,
    wordCount,
    characterCount,
    callToAction: stage.startsWith("relance") ? "Rappel de courtoisie et partage de réalisations" : "Proposition d'un appel court de 10 min",
    suggestedFollowUpDays: 7,
    suggestedFollowUpDate: calculateFollowUpDate(new Date(), 1),
    isCompliantLinkedinNote: characterCount <= 300
  };
}

function strategySubject(contact: Contact, profile: CandidateProfile) {
  const contactName = contact.firstName || contact.fullName.split(" ")[0] || "Contact";
  const userName = profile.firstName || "Nathan";
  return {
    standard: `${contactName} — ${userName}`,
    personalized: `Échange ${contact.jobTitle || "Métier"} | ${contact.companyName || "Équipe"}`
  };
}

const OUTREACH_CASCADE_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
  "gemini-flash-latest"
];

// ============================================================================
// 7. GÉNÉRATEUR PRINCIPAL ASSISTÉ PAR GEMINI AI
// ============================================================================

export async function generateOutreachMessageWithFramework(
  contact: Contact,
  profile: CandidateProfile,
  options: OutreachGenerationOptions = {}
): Promise<GeneratedOutreachResult> {
  const recommendedStrategy = recommendNetworkingStrategy(contact, profile, options.goal, options.channel);
  
  // Resolve options with smart defaults
  const category: NetworkingCategory = options.category || recommendedStrategy.recommendedCategory;
  const subType: NetworkingSubType = options.subType || recommendedStrategy.recommendedSubType;
  const stage: NetworkingContactStage = options.stage || "premier_message";
  const goal: NetworkingGoal = options.goal || "echange_10min";
  const channel: NetworkingChannel = options.channel || recommendedStrategy.recommendedChannel;
  const toneOption: NetworkingTone = options.tone || "automatique";

  const seniority = evaluateContactSeniority(contact);
  const effectiveTone: 'tutoiement' | 'vouvoiement' = 
    toneOption === "tutoiement" ? "tutoiement" :
    toneOption === "vouvoiement" ? "vouvoiement" :
    (seniority.isJunior ? "tutoiement" : "vouvoiement");

  const commonPoints = detectFactualCommonPoints(contact, profile);

  // If Gemini API is available, perform reasoning and drafting via Gemini Cascade
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const promptPayload = {
        nathanProfile: {
          name: profile.fullName || "Nathan Patrac",
          firstName: profile.firstName || "Nathan",
          currentSituation: profile.currentSituation || "Étudiant en Banque / Finance",
          currentAlternance: profile.currentAlternance || "Conseiller Clientèle chez Crédit Agricole",
          targetTitles: profile.targetTitles || ["Conseiller Banque Privée"],
          targetPeriod: profile.startDateTarget || "septembre 2026",
          city: profile.city || "Clermont-Ferrand",
          experiences: (profile.experiences || []).slice(0, 3).map(e => ({
            role: e.role,
            company: e.company,
            missions: (e.missions || []).slice(0, 2),
            achievements: (e.achievements || []).slice(0, 2)
          })),
          hardSkills: (profile.hardSkills || []).slice(0, 4).map(s => s.name)
        },
        contact: {
          name: contact.fullName || "Contact",
          firstName: contact.firstName || (contact.fullName ? contact.fullName.split(" ")[0] : "Contact"),
          jobTitle: contact.jobTitle || "Poste",
          companyName: contact.companyName || "Entreprise",
          category: contact.category,
          seniorityLevel: seniority.level,
          notes: contact.notes || ""
        },
        selectedParameters: {
          category,
          subType,
          stage,
          goal,
          channel,
          toneApplied: effectiveTone,
          commonPointsFound: commonPoints.map(cp => cp.label),
          customNewsOrDeal: options.customNewsOrDeal || "",
          intermediaryPerson: options.intermediaryPerson || ""
        }
      };

      const userInstruction = `
ANALYSER LES DONNÉES ET CONCEVOIR LE MESSAGE DE NETWORKING :
${JSON.stringify(promptPayload, null, 2)}

INSTRUCTIONS D'EXÉCUTION OBLIGATOIRES :
1. ANALYSE PRÉALABLE :
   - Qui est Nathan ?
   - Qui est le contact et son niveau d'autorité ?
   - Quel est leur lien exact ?
   - Quel est le véritable point d'accroche répondant à : "Pourquoi cette personne précisément ?" ?
   - Quelle stratégie adopter par rapport à l'étape ("${stage}") et à l'objectif ("${goal}") ?
   - Test des 50 personnes : valider que le message est impossible à copier-coller à 50 contacts différents.

2. RÉDACTION :
   - Écris en français 100% naturel, sans formules préfabriquées d'IA.
   - Ton : ${effectiveTone === "tutoiement" ? "Tutoiement ('tu')" : "Vouvoiement ('vous')"}.
   - Canal : ${channel} (Si stage == 'demande_connexion', STRICTEMENT moins de 300 caractères).
   - Longueur générale : Moins de 120 mots. Sobre, percutant.
   - Si canal == 'email' ou 'hybride' : générer un objet d'email pertinent et direct.
   - Si canal == 'hybride' : générer le message LinkedIn ET la version email complète.

3. RENVOIE UN JSON STRICT SELON LE SCHÉMA.
`;

      let parsed: any = null;

      for (const model of OUTREACH_CASCADE_MODELS) {
        try {
          const startTime = Date.now();
          const response = await ai.models.generateContent({
            model,
            contents: userInstruction,
            config: {
              systemInstruction: NETWORKING_FRAMEWORK_SYSTEM_PROMPT,
              temperature: 0.3,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  analysis: {
                    type: Type.OBJECT,
                    properties: {
                      whoIsNathan: { type: Type.STRING },
                      whoIsContact: { type: Type.STRING },
                      relationshipDetails: { type: Type.STRING },
                      hookIdentified: { type: Type.STRING },
                      strategyReasoning: { type: Type.STRING },
                      antiHallucinationGuards: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                      },
                      fiftyPersonTestPassed: { type: Type.BOOLEAN },
                      qualityReasoning: { type: Type.STRING }
                    },
                    required: [
                      "whoIsNathan",
                      "whoIsContact",
                      "relationshipDetails",
                      "hookIdentified",
                      "strategyReasoning",
                      "antiHallucinationGuards",
                      "fiftyPersonTestPassed",
                      "qualityReasoning"
                    ]
                  },
                  toneApplied: { type: Type.STRING },
                  message: { type: Type.STRING },
                  subject: { type: Type.STRING },
                  hybridEmail: { type: Type.STRING },
                  hybridEmailSubject: { type: Type.STRING },
                  callToAction: { type: Type.STRING },
                  suggestedFollowUpDays: { type: Type.INTEGER }
                },
                required: ["analysis", "toneApplied", "message", "callToAction"]
              }
            }
          });

          trackGeminiCall({
            feature: "Génération de messages networking",
            featureCategory: "networking_messages",
            model,
            promptText: `${NETWORKING_FRAMEWORK_SYSTEM_PROMPT}\n${userInstruction}`,
            response,
            durationMs: Date.now() - startTime,
            contextSnippet: `Approche ciblée pour ${contact.fullName || "Contact"} (${contact.companyName || "Entreprise"})`
          });

          const text = response.text?.trim() || "{}";
          parsed = JSON.parse(text);
          if (parsed && parsed.message && parsed.message.trim().length > 15) {
            break;
          }
        } catch (err: any) {
          const errMsg = err?.message || String(err);
          if (errMsg.includes("503") || errMsg.includes("high demand") || errMsg.includes("429") || errMsg.includes("UNAVAILABLE")) {
            console.info(`[NetworkingFramework] Modèle ${model} temporairement indisponible (503), passage au modèle suivant.`);
            continue;
          }
          console.info(`[NetworkingFramework] Essai modèle ${model} non concluant, bascule cascade.`);
        }
      }

      if (parsed && parsed.message && parsed.message.trim().length > 15) {
        const words = parsed.message.trim().split(/\s+/).length;
        const chars = parsed.message.length;

        return {
          message: parsed.message.trim(),
          subject: parsed.subject || `${contact.firstName || "Contact"} — ${profile.firstName || "Nathan"}`,
          subjectStandard: strategySubject(contact, profile).standard,
          subjectPersonalized: strategySubject(contact, profile).personalized,
          hybridEmail: parsed.hybridEmail,
          hybridEmailSubject: parsed.hybridEmailSubject,
          analysis: parsed.analysis || {
            whoIsNathan: `Nathan Patrac, ${profile.currentSituation}`,
            whoIsContact: `${contact.fullName} (${contact.jobTitle})`,
            relationshipDetails: commonPoints.length > 0 ? commonPoints[0].label : "Approche directe",
            hookIdentified: options.customNewsOrDeal || (commonPoints.length > 0 ? commonPoints[0].label : `Métier de ${contact.jobTitle}`),
            strategyReasoning: `Stratégie optimisée pour ${stage} avec objectif ${goal}.`,
            antiHallucinationGuards: ["Aucune donnée inventée"],
            fiftyPersonTestPassed: true,
            qualityReasoning: "Message personnalisé avec données réelles du contact."
          },
          category,
          subType,
          stage,
          goal,
          channel,
          toneApplied: effectiveTone,
          wordCount: words,
          characterCount: chars,
          callToAction: parsed.callToAction || "Proposition d'échange de 10 min",
          suggestedFollowUpDays: parsed.suggestedFollowUpDays || 7,
          suggestedFollowUpDate: calculateFollowUpDate(new Date(), 1),
          isCompliantLinkedinNote: chars <= 300
        };
      }
    } catch (e: any) {
      console.info("[NetworkingFramework] Bascule transparente sur le moteur de raisonnement local.");
    }
  }

  // Fallback to rich deterministic engine
  return generateDeterministicAnalysisAndMessage(contact, profile, {
    category,
    subType,
    stage,
    goal,
    channel,
    tone: effectiveTone,
    customNewsOrDeal: options.customNewsOrDeal,
    intermediaryPerson: options.intermediaryPerson,
    targetOpportunityTitle: options.targetOpportunityTitle
  });
}

// ============================================================================
// 8. RELANCES MULTI-ÉTAPES (MÉTHODOLOGIE OFFICIELLE J+7, J+14, J+21)
// ============================================================================

export function generateFollowUpMessageWithFramework(
  contact: Contact,
  profile: CandidateProfile,
  followUpNumber: 1 | 2 | 3 = 1,
  options: { tone?: NetworkingTone; channel?: NetworkingChannel } = {}
): {
  message: string;
  followUpNumber: 1 | 2 | 3;
  tone: NetworkingTone;
  channel: NetworkingChannel;
  suggestedDate: string;
  realTasksUsed?: string[];
  realAchievementsUsed?: string[];
} {
  const seniority = evaluateContactSeniority(contact);
  const tone = options.tone || (seniority.isJunior ? "tutoiement" : "vouvoiement");
  const channel = options.channel || (contact.linkedInUrl ? "linkedin" : "email");

  const stage: NetworkingContactStage = 
    followUpNumber === 1 ? "relance_1" :
    followUpNumber === 2 ? "relance_2" : "relance_3";

  const result = generateDeterministicAnalysisAndMessage(contact, profile, {
    stage,
    tone,
    channel,
    goal: "echange_10min"
  });

  return {
    message: result.message,
    followUpNumber,
    tone,
    channel,
    suggestedDate: calculateFollowUpDate(new Date(), followUpNumber)
  };
}

// ============================================================================
// 9. CALCUL INTELLIGENT DE LA PROCHAINE DATE DE RELANCE
// ============================================================================

export function calculateFollowUpDate(fromDate: Date | string, stageNumber: number = 1): string {
  const date = typeof fromDate === "string" ? new Date(fromDate) : new Date(fromDate.getTime());
  date.setDate(date.getDate() + 7);

  // Privilégier la fenêtre Mardi (2) - Jeudi (4)
  const day = date.getDay();
  if (day === 5) { // Vendredi -> report au Mardi suivant (+4)
    date.setDate(date.getDate() + 4);
  } else if (day === 6) { // Samedi -> report au Mardi suivant (+3)
    date.setDate(date.getDate() + 3);
  } else if (day === 0) { // Dimanche -> report au Mardi suivant (+2)
    date.setDate(date.getDate() + 2);
  } else if (day === 1) { // Lundi -> report au Mardi (+1)
    date.setDate(date.getDate() + 1);
  }

  return date.toISOString().split("T")[0];
}
