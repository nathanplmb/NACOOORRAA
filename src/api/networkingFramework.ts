import { 
  Contact, 
  CandidateProfile, 
  NetworkingTone, 
  NetworkingTemplateId, 
  NetworkingFollowUpId, 
  NetworkingChannel, 
  NetworkingGoal, 
  NetworkingOutreachStrategy,
  Opportunity 
} from "../types.ts";
import { GoogleGenAI } from "@google/genai";

// ============================================================================
// NACORA NETWORKING & OUTREACH FRAMEWORK — MÉTHODOLOGIE DE RÉFÉRENCE INTERNE
// ============================================================================

export const NETWORKING_FRAMEWORK_SYSTEM_PROMPT = `
VOUS ÊTES LE MOTEUR DE NETWORKING, PROSPECTION ET OUTREACH DE LA PLATEFORME NACORA.

IMPORTANT :
Ce framework constitue la MÉTHODOLOGIE DE RÉFÉRENCE ABSOLUE de NACORA pour le réseautage, la prise de contact et les relances sur LinkedIn et par email.
Vous ne devez JAMAIS remplacer cette méthode arbitrairement par des conseils génériques ou des listes théoriques de 10 points.
Vous devez appliquer rigoureusement le workflow :
MÉTHODE DE RÉFÉRENCE ↓ CONTEXTE CANDIDAT ↓ ANALYSE DU CONTACT ↓ CHOIX STRATÉGIQUE ↓ PERSONNALISATION SANS INVENTION ↓ MESSAGE / ACTION ↓ RELANCE ↓ SUIVI.

RÈGLE D'OR DE VÉRITÉ (STRICTEMENT SANS INVENTION) :
- Ne JAMAIS inventer un point commun, une ville, une école partagée s'il n'existe pas dans les données réelles du contact ou du profil.
- Ne JAMAIS inventer une recommandation ou un échange intermédiaire avec une personne qui n'existe pas réellement dans le contexte.
- Ne JAMAIS inventer une transaction, une opération financière, un fait d'actualité ou un chiffre d'entreprise s'il n'est pas vérifié.
- Ne JAMAIS déduire ou afficher l'âge exact d'une personne (utiliser uniquement les titres professionnels et niveaux d'expérience).

RÈGLES DE TUTOIEMENT VS VOUVOIEMENT :
- Stagiaires, alternants, jeunes diplômés, jeunes employés / analystes juniors : Le tutoiement ("tu") est adapté et recommandé pour créer de la proximité naturelle.
- Personnes avec beaucoup de responsabilités, postes seniors, managers, directeurs, partners, Managing Directors, ou profil ayant plus d'une dizaine d'années d'expérience : Commencer OBLIGATOIREMENT par le vouvoiement ("vous").
- Si le contact répond ultérieurement en tutoyant le candidat : Recommander de passer naturellement au tutoiement.

LES 4 TEMPLATES DE RÉFÉRENCE DE PRISE DE CONTACT :

--------------------------------------------------------------------------------
TEMPLATE 1 — POINT COMMUN
Utilisation : Stagiaires, jeunes employés, ou personnes avec lesquelles l'utilisateur possède un point commun identifiable (même école/alumni, même ville, même ancienne entreprise).
Structure :
Bonjour [PRÉNOM], (ou "Hello [PRÉNOM]," si tutoiement)

J’ai vu que vous étiez [POINT COMMUN : de Nantes / diplômé d’Audencia / ancien étudiant de X], en [MÉTIER] chez [ENTREPRISE]. C’est toujours le cas ?

Je suis aussi de [POINT COMMUN].

J’aimerais beaucoup échanger avec vous sur votre expérience en [DOMAINE].

Vous seriez disponible pour un appel de 10min [TIMING : cette semaine / ce week-end] ?

À bientôt,
[TON PRÉNOM]
--------------------------------------------------------------------------------

--------------------------------------------------------------------------------
TEMPLATE 2 — OPPORTUNITÉ (DIRECT)
Utilisation : Objectif direct pour savoir si une équipe recrute des stagiaires / alternants.
Structure :
Hello [PRÉNOM],

J’ai vu que tu étais en [MÉTIER] chez [ENTREPRISE]. C’est toujours le cas ?

Je me permets de te contacter pour savoir si ton équipe recrute des stagiaires pour [DATE : juillet ou septembre 2026] ?

Je te remercie par avance pour ton temps.

Bien à toi,
[TON PRÉNOM]
--------------------------------------------------------------------------------

--------------------------------------------------------------------------------
TEMPLATE 3 — ALUMNI / RECOMMANDATION
Utilisation : Approcher une personne à fort pouvoir de décision (Manager / Directeur) après avoir échangé avec un collaborateur de son équipe ou un Alumni.
Structure :
Bonjour [PRÉNOM],

Je me permets de vous contacter après avoir échangé avec [PERSONNE], actuellement [POSTE] au sein de votre équipe.

Son retour sur [ÉQUIPE / MÉTIER / EXPÉRIENCE] correspond pleinement à ce que je recherche pour mon stage de [DATE].

Actuellement en [FORMATION] à [ÉCOLE] et je m’intéresse particulièrement à [DOMAINE].

Seriez-vous disponible pour un échange de 10 minutes cette semaine ?

Bien à vous,
[TON PRÉNOM]
*Règle : [PERSONNE] ne doit être utilisé que si cette personne existe réellement. Ne jamais inventer une conversation.*
--------------------------------------------------------------------------------

--------------------------------------------------------------------------------
TEMPLATE 4 — TRÈS PERSONNALISÉ
Utilisation : Approcher un profil senior / décideur (Managing Director, Directeur, Associé, Fondateur).
Structure :
Bonjour [PRÉNOM],

J’ai vu que [ENTREPRISE] était récemment intervenue sur [TRANSACTION / OPÉRATION / PROJET / ACTUALITÉ PRÉCISE].

[DÉTAIL PRÉCIS] m'a particulièrement marqué parce que [POURQUOI CELA T'INTÉRESSE / CE QUE TU AS COMPRIS].

Je suis actuellement étudiant en [FORMATION / ANNÉE] à [ÉCOLE], et je suis également [RÔLE] au sein de [ASSOCIATION / SOCIÉTÉ].

Ces expériences m’ont notamment permis de développer mes compétences en [COMPÉTENCE 1], [COMPÉTENCE 2] et [COMPÉTENCE 3].

Combinées à mon parcours en [DOMAINE 1] et [DOMAINE 2], elles m’ont préparé à contribuer aux opérations de [PÔLE / ÉQUIPE].

Je serais très intéressé par la possibilité de rejoindre [ENTREPRISE] dans le cadre d’un [STAGE / ALTERNANCE] de [DURÉE], entre le [DATE DÉBUT] et [DATE FIN].

Je serais ravi de vous envoyer mon CV pour vous montrer comment je peux aider [ENTREPRISE].

Merci pour votre temps.

Bien à vous,
[PRÉNOM NOM]
--------------------------------------------------------------------------------

LES 3 RELANCES STRUCTURÉES (J+7) :

--------------------------------------------------------------------------------
RELANCE 1 — SIMPLE (À envoyer à J+7 en l'absence de réponse)
Structure :
Bonjour [Prénom],

Je me permets une petite relance.

Avez-vous eu l’occasion de voir mon précédent message ?

Bien à vous,
[TON PRÉNOM]
--------------------------------------------------------------------------------

--------------------------------------------------------------------------------
RELANCE 2 — APPORTER QUELQUE CHOSE (À envoyer à J+14)
Structure :
Bonjour [Prénom],

Que ce soit [TÂCHE 1 / COMPÉTENCE RÉELLE] ou [TÂCHE 2 / COMPÉTENCE RÉELLE], je suis vraiment partant(e) pour aider l’équipe.

Mon CV est en PJ si vous voulez y jeter un œil.

Bonne journée,
[TON PRÉNOM]
*Règle : Les tâches et compétences doivent provenir des vraies compétences du profil candidat.*
--------------------------------------------------------------------------------

--------------------------------------------------------------------------------
RELANCE 3 — APPORTER QUELQUE CHOSE + EXEMPLES (À envoyer à J+21)
Structure :
Bonjour [Prénom],

Je voulais juste partager deux choses que j’ai faites récemment et que je peux apporter à [NOM DE L'ENTREPRISE] :

- [RÉALISATION 1 RÉELLE DU PROFIL]
- [RÉALISATION 2 RÉELLE DU PROFIL]

Si vous avez 10 minutes cette semaine, j’adorerais qu’on puisse en discuter !

Bonne journée,
[TON PRÉNOM]
--------------------------------------------------------------------------------

RÈGLES DE RÉDACTION ET STRATÉGIE GLOBALE :
1. FAIRE COURT : STRICTEMENT moins de 150 mots au global (< 300 caractères si note d'invitation LinkedIn).
2. TON HUMAIN ET NATUREL : Éviter les formules robotiques ou pompeuses de l'IA.
3. JOURS D'ENVOI : Privilégier le mardi au jeudi pour les envois et relances.
4. CANAUX : LinkedIn (visibilité du profil), Email (direct dans la boîte) ou Hybride LinkedIn + Email.
5. OBJET EMAIL :
   - Option 1 (Standard) : "[Nom prénom du destinataire] - [Ton prénom et nom]"
   - Option 2 (Personnalisé) : "[Élément précis / Poste ciblé : Candidature Alternance Conseiller Banque Privée]"
6. STRATÉGIE DE PROGRESSION : Recommander de commencer par des profils juniors / analystes pour obtenir des retours d'expérience et des recommandations, puis remonter progressivement vers les directeurs et décideurs.
`;

export interface OutreachGenerationOptions {
  templateId?: NetworkingTemplateId;
  tone?: NetworkingTone;
  channel?: NetworkingChannel;
  goal?: NetworkingGoal;
  customNewsOrDeal?: string;
  intermediaryPerson?: string;
  targetOpportunityTitle?: string;
}

export interface GeneratedOutreachResult {
  message: string;
  subjectStandard: string;
  subjectPersonalized: string;
  templateId: NetworkingTemplateId;
  tone: NetworkingTone;
  channel: NetworkingChannel;
  characterCount: number;
  wordCount: number;
  isCompliantLinkedinNote: boolean;
  missingDataQuestions?: string[];
  suggestedFollowUpDate: string;
}

export interface GeneratedFollowUpResult {
  message: string;
  followUpNumber: 1 | 2 | 3;
  tone: NetworkingTone;
  channel: NetworkingChannel;
  suggestedDate: string;
  realTasksUsed?: string[];
  realAchievementsUsed?: string[];
}

/**
 * Evaluates the seniority of a contact based strictly on available title and metadata.
 */
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
    "directeur", "director", "managing director", "md", "vp", "vice president", 
    "partner", "associé", "associe", "head of", "lead", "responsable", "chief", 
    "ceo", "cfo", "coo", "fondateur", "founder", "gérant", "gerant", "président", "president",
    "executive", "membre du directoire"
  ];

  if (juniorKeywords.some(k => title.includes(k)) || cat === "student") {
    return {
      level: 'junior_accessible',
      isJunior: true,
      isSenior: false,
      reason: "Profil junior, étudiant ou alternant accessible. Le tutoiement est naturel."
    };
  }

  if (seniorKeywords.some(k => title.includes(k))) {
    return {
      level: 'senior_decision_maker',
      isJunior: false,
      isSenior: true,
      reason: "Poste à responsabilités ou pouvoir de décision. Le vouvoiement est impératif."
    };
  }

  return {
    level: 'mid_level',
    isJunior: false,
    isSenior: false,
    reason: "Profil professionnel confirmé. Vouvoiement recommandé en premier contact."
  };
}

/**
 * Detects factual common points between candidate and contact without inventing anything.
 */
export function detectFactualCommonPoints(contact: Contact, profile: CandidateProfile): string[] {
  const points: string[] = [];

  // 1. Alumni / Same university or school
  const contactEdu = (contact.education || []).concat(contact.academicPath ? [contact.academicPath] : []).join(" ").toLowerCase();
  const profileEdus = (profile.educations || []).map(e => `${e.institution || ""} ${e.school || ""} ${e.degree || ""}`).concat([profile.currentSituation || ""]).join(" ").toLowerCase();

  if (
    (contactEdu.includes("uca") || contactEdu.includes("clermont") || contactEdu.includes("iut")) &&
    (profileEdus.includes("uca") || profileEdus.includes("clermont") || profileEdus.includes("iut"))
  ) {
    points.push("Alumni / Même université (IUT / Université Clermont Auvergne)");
  } else if (contact.category === "alumni" || (contact.connectionPoints && contact.connectionPoints.some(p => p.toLowerCase().includes("alumni") || p.toLowerCase().includes("école")))) {
    points.push("Même réseau académique / Alumni");
  }

  // 2. Same company / Past company
  const contactComp = (contact.companyName || "").toLowerCase();
  const profileComp = (profile.currentAlternance || "").toLowerCase();
  const pastComps = (profile.experiences || []).map(e => e.company.toLowerCase());

  if (contactComp && profileComp && (contactComp.includes(profileComp) || profileComp.includes(contactComp))) {
    points.push(`Même entreprise (${contact.companyName})`);
  } else if (pastComps.some(c => c && (contactComp.includes(c) || c.includes(contactComp)))) {
    points.push(`Ancienne entreprise en commun (${contact.companyName})`);
  }

  // 3. Location / Region
  const contactCity = (contact.professionalProfile?.company || contact.notes || "").toLowerCase();
  const profileCity = (profile.city || "").toLowerCase();
  if (profileCity && profileCity.length > 2 && contactCity.includes(profileCity)) {
    points.push(`Même ville / bassin (${profile.city})`);
  }

  // 4. Existing contact connection points
  if (contact.connectionPoints && contact.connectionPoints.length > 0) {
    contact.connectionPoints.forEach(cp => {
      if (cp && cp.trim() && !points.includes(cp)) {
        points.push(cp);
      }
    });
  }

  return points;
}

/**
 * Recommends the optimal networking strategy and template based on the NACORA framework.
 */
export function recommendNetworkingStrategy(
  contact: Contact,
  profile: CandidateProfile,
  goal: NetworkingGoal = "stage",
  preferredChannel: NetworkingChannel = "linkedin"
): NetworkingOutreachStrategy {
  const seniority = evaluateContactSeniority(contact);
  const commonPoints = detectFactualCommonPoints(contact, profile);

  // Determine tone
  const recommendedTone: NetworkingTone = seniority.isJunior ? "tutoiement" : "vouvoiement";
  const toneReason = seniority.isJunior
    ? "Profil junior, stagiaire ou jeune employé : le tutoiement permet de créer une proximité naturelle et engageante."
    : "Poste à responsabilités ou profil senior : commencer impérativement par le vouvoiement pour marquer le respect des usages professionnels.";

  // Determine template
  let recommendedTemplateId: NetworkingTemplateId = "point_commun";
  let templateReason = "";

  if (seniority.level === "senior_decision_maker") {
    // Check if we have an intermediary contact or news
    if (contact.opportunityTitle || goal === "recrutement_equipe") {
      recommendedTemplateId = "tres_personnalise";
      templateReason = "Destinataire à fort pouvoir de décision : le Template 4 (Très Personnalisé) est recommandé pour démontrer une préparation solide, valoriser des réalisations concrètes et justifier votre démarche.";
    } else {
      recommendedTemplateId = "tres_personnalise";
      templateReason = "Profil senior : privilégier une approche très personnalisée centrée sur ses actualités, son pôle ou son expertise plutôt qu'une demande générique.";
    }
  } else if (commonPoints.length > 0) {
    recommendedTemplateId = "point_commun";
    templateReason = `Un point de connexion vérifié a été détecté (${commonPoints[0]}) : le Template 1 permet d'engager la discussion naturellement avec un fort taux de réponse.`;
  } else if (goal === "recrutement_equipe" || goal === "stage" || goal === "alternance") {
    recommendedTemplateId = "opportunite";
    templateReason = "Pas de point commun direct identifié : le Template 2 (Opportunité directe) permet de poser la question simplement et courtoisement sans prétendre un lien inexistant.";
  } else {
    recommendedTemplateId = "point_commun";
    templateReason = "Template 1 recommandé pour solliciter un retour d'expérience de 10 minutes.";
  }

  // Channel recommendation
  let recommendedChannel: NetworkingChannel = preferredChannel;
  if (contact.linkedInUrl && contact.email) {
    recommendedChannel = "linkedin_email";
  } else if (contact.linkedInUrl) {
    recommendedChannel = "linkedin";
  } else if (contact.email) {
    recommendedChannel = "email";
  }

  // Subject line generation
  const contactName = contact.fullName || `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Contact";
  const userName = profile.fullName || `${profile.firstName || "Nathan"} ${profile.lastName || "Patrac"}`.trim();
  const targetTitle = profile.idealPositionSearch || profile.targetTitles?.[0] || "Conseiller Banque Privée";

  const standardSubject = `${contactName} - ${userName}`;
  const personalizedSubject = `Candidature ${goal === "alternance" ? "Alternance" : goal === "stage" ? "Stage" : "Poste"} ${targetTitle} | ${contact.companyName || "Votre équipe"}`;

  return {
    recommendedTemplateId,
    recommendedTone,
    recommendedChannel,
    toneReason,
    templateReason,
    seniorityLevel: seniority.level,
    commonPointsFound: commonPoints,
    suggestedSubjectLine: {
      standard: standardSubject,
      personalized: personalizedSubject
    },
    followUpPlan: {
      delayDays: 7,
      preferredDays: "Mardi au Jeudi",
      relance1: "Relance 1 (Simple) à J+7",
      relance2: "Relance 2 (Apporter quelque chose) à J+14",
      relance3: "Relance 3 (Apporter quelque chose + 2 Réalisations) à J+21"
    }
  };
}

/**
 * Generates the outreach message strictly following the NACORA template structures.
 */
export async function generateOutreachMessageWithFramework(
  contact: Contact,
  profile: CandidateProfile,
  options: OutreachGenerationOptions = {}
): Promise<GeneratedOutreachResult> {
  const strategy = recommendNetworkingStrategy(contact, profile, options.goal, options.channel);
  const templateId = options.templateId || strategy.recommendedTemplateId;
  const tone = options.tone || strategy.recommendedTone;
  const channel = options.channel || strategy.recommendedChannel;
  const goal = options.goal || "stage";

  const firstName = contact.firstName || contact.fullName.split(" ")[0] || "Bonjour";
  const userFirstName = profile.firstName || (profile.fullName ? profile.fullName.split(" ")[0] : "Nathan");
  const userFullName = profile.fullName || `${userFirstName} PATRAC`;
  const company = contact.companyName || "votre établissement";
  const job = contact.jobTitle || "votre métier";
  const userSchool = profile.currentSituation || "l'Université Clermont Auvergne";
  const userRole = profile.currentAlternance || "Conseiller Clientèle chez Crédit Agricole";
  const targetPeriod = profile.startDateTarget || "septembre 2026";
  const commonPoint = strategy.commonPointsFound[0] || (contact.category === "alumni" ? "de Clermont-Ferrand" : "du secteur bancaire");

  let message = "";
  const missingDataQuestions: string[] = [];

  // TEMPLATE 1 — POINT COMMUN
  if (templateId === "point_commun") {
    if (tone === "tutoiement") {
      message = `Hello ${firstName},

J’ai vu que tu étais ${commonPoint}, en ${job} chez ${company}. C’est toujours le cas ?

Je suis aussi ${commonPoint}.

J’aimerais beaucoup échanger avec toi sur ton expérience en ${contact.sector || "Banque & Finance"}.

Tu serais disponible pour un appel de 10min cette semaine ou ce week-end ?

À bientôt,
${userFirstName}`;
    } else {
      message = `Bonjour ${firstName},

J’ai vu que vous étiez ${commonPoint}, en ${job} chez ${company}. C’est toujours le cas ?

Je suis aussi ${commonPoint}.

J’aimerais beaucoup échanger avec vous sur votre expérience en ${contact.sector || "Banque & Finance"}.

Vous seriez disponible pour un appel de 10min cette semaine ?

À bientôt,
${userFirstName}`;
    }
  }

  // TEMPLATE 2 — OPPORTUNITÉ (DIRECT)
  else if (templateId === "opportunite") {
    const oppLabel = goal === "alternance" ? "alternants" : goal === "emploi" ? "collaborateurs" : "stagiaires";
    if (tone === "tutoiement") {
      message = `Hello ${firstName},

J’ai vu que tu étais en ${job} chez ${company}. C’est toujours le cas ?

Je me permets de te contacter pour savoir si ton équipe recrute des ${oppLabel} pour ${targetPeriod} ?

Je te remercie par avance pour ton temps.

Bien à toi,
${userFirstName}`;
    } else {
      message = `Bonjour ${firstName},

J’ai vu que vous étiez en ${job} chez ${company}. C’est toujours le cas ?

Je me permets de vous contacter pour savoir si votre équipe recrute des ${oppLabel} pour ${targetPeriod} ?

Je vous remercie par avance pour votre temps.

Bien à vous,
${userFirstName}`;
    }
  }

  // TEMPLATE 3 — ALUMNI / RECOMMANDATION
  else if (templateId === "alumni_recommandation") {
    const intermediary = options.intermediaryPerson || "un collaborateur";
    if (!options.intermediaryPerson) {
      missingDataQuestions.push("Pour utiliser le Template 3 (Recommandation), avez-vous le prénom et nom d'une personne réelle de l'équipe avec qui vous avez échangé ?");
    }

    message = `Bonjour ${firstName},

Je me permets de vous contacter après avoir échangé avec ${intermediary}, actuellement en poste au sein de votre équipe.

Son retour sur l'équipe et vos projets en ${contact.sector || "Banque & Finance"} correspond pleinement à ce que je recherche pour mon ${goal === "alternance" ? "alternance" : "stage"} de ${targetPeriod}.

Actuellement en formation à ${userSchool}, je m’intéresse particulièrement à vos activités.

Seriez-vous disponible pour un échange de 10 minutes cette semaine ?

Bien à vous,
${userFirstName}`;
  }

  // TEMPLATE 4 — TRÈS PERSONNALISÉ
  else if (templateId === "tres_personnalise") {
    const newsOrDeal = options.customNewsOrDeal || `le développement de votre pôle ${contact.sector || "Banque Privée & Gestion de Patrimoine"}`;
    if (!options.customNewsOrDeal) {
      missingDataQuestions.push("Quel projet, actualité récente ou opération précise chez " + company + " vous a marqué(e) ?");
    }

    const skills = (profile.hardSkills || []).map(s => s.name).slice(0, 3);
    const skillA = skills[0] || "Analyse financière";
    const skillB = skills[1] || "Réglementation & Conformité";
    const skillC = skills[2] || "Relation client patrimoniale";

    message = `Bonjour ${firstName},

J’ai vu que ${company} était récemment intervenue sur ${newsOrDeal}.

Cette dynamique m'a particulièrement marqué car elle illustre parfaitement les exigences d'excellence et de conseil sur ce marché.

Je suis actuellement étudiant à ${userSchool}, et je suis également en poste chez ${userRole}.

Ces expériences m’ont notamment permis de développer mes compétences en ${skillA}, ${skillB} et ${skillC}.

Combinées à mon parcours académique, elles m’ont préparé à contribuer activement aux opérations de votre équipe.

Je serais très intéressé par la possibilité de rejoindre ${company} dans le cadre d’un ${goal === "alternance" ? "contrat d'apprentissage" : "stage"} à compter de ${targetPeriod}.

Je serais ravi de vous envoyer mon CV pour vous montrer comment je peux aider ${company}.

Merci pour votre temps.

Bien à vous,
${userFullName}`;
  }

  // Calculate compliance
  const words = message.trim().split(/\s+/).length;
  const chars = message.length;
  const isCompliantLinkedinNote = chars <= 300;

  return {
    message,
    subjectStandard: strategy.suggestedSubjectLine.standard,
    subjectPersonalized: strategy.suggestedSubjectLine.personalized,
    templateId,
    tone,
    channel,
    characterCount: chars,
    wordCount: words,
    isCompliantLinkedinNote,
    missingDataQuestions: missingDataQuestions.length > 0 ? missingDataQuestions : undefined,
    suggestedFollowUpDate: calculateFollowUpDate(new Date(), 1)
  };
}

/**
 * Generates follow-up messages strictly following the NACORA Relances 1, 2, 3 methodology.
 */
export function generateFollowUpMessageWithFramework(
  contact: Contact,
  profile: CandidateProfile,
  followUpNumber: 1 | 2 | 3 = 1,
  options: { tone?: NetworkingTone; channel?: NetworkingChannel } = {}
): GeneratedFollowUpResult {
  const seniority = evaluateContactSeniority(contact);
  const tone = options.tone || (seniority.isJunior ? "tutoiement" : "vouvoiement");
  const channel = options.channel || (contact.linkedInUrl ? "linkedin" : "email");
  const firstName = contact.firstName || contact.fullName.split(" ")[0] || "Bonjour";
  const userFirstName = profile.firstName || (profile.fullName ? profile.fullName.split(" ")[0] : "Nathan");
  const company = contact.companyName || "l'entreprise";

  let message = "";
  let realTasksUsed: string[] | undefined;
  let realAchievementsUsed: string[] | undefined;

  // RELANCE 1 — SIMPLE (J+7)
  if (followUpNumber === 1) {
    if (tone === "tutoiement") {
      message = `Hello ${firstName},

Je me permets une petite relance.

As-tu eu l’occasion de voir mon précédent message ?

Bien à toi,
${userFirstName}`;
    } else {
      message = `Bonjour ${firstName},

Je me permets une petite relance.

Avez-vous eu l’occasion de voir mon précédent message ?

Bien à vous,
${userFirstName}`;
    }
  }

  // RELANCE 2 — APPORTER QUELQUE CHOSE (J+14)
  else if (followUpNumber === 2) {
    // Pull real tasks from profile
    const rawMissions = (profile.experiences || []).flatMap(e => e.missions || []);
    const task1 = rawMissions[0] ? rawMissions[0].replace(/^[-•*]\s*/, "").slice(0, 60) : "l'instruction des dossiers clients";
    const task2 = rawMissions[1] ? rawMissions[1].replace(/^[-•*]\s*/, "").slice(0, 60) : "l'analyse et la préparation des propositions de financement";
    realTasksUsed = [task1, task2];

    if (tone === "tutoiement") {
      message = `Hello ${firstName},

Que ce soit pour ${task1} ou ${task2}, je suis vraiment partant(e) pour aider l’équipe.

Mon CV est en PJ si tu veux y jeter un œil.

Bonne journée,
${userFirstName}`;
    } else {
      message = `Bonjour ${firstName},

Que ce soit pour ${task1} ou ${task2}, je suis vraiment partant(e) pour aider l’équipe.

Mon CV est en PJ si vous voulez y jeter un œil.

Bonne journée,
${userFirstName}`;
    }
  }

  // RELANCE 3 — APPORTER QUELQUE CHOSE + EXEMPLES (J+21)
  else if (followUpNumber === 3) {
    // Pull real achievements from profile
    const rawAch = (profile.experiences || []).flatMap(e => (e.achievements && e.achievements.length > 0) ? e.achievements : (e.missions || []));
    const ach1 = rawAch[0] ? `• ${rawAch[0].replace(/^[-•*]\s*/, "")}` : `• Gestion et conformité de portefeuilles clients chez ${profile.currentAlternance || "mon employeur actuel"}`;
    const ach2 = rawAch[1] ? `• ${rawAch[1].replace(/^[-•*]\s*/, "")}` : `• Réalisation d'analyses financières et optimisation des processus en agence`;
    realAchievementsUsed = [ach1, ach2];

    if (tone === "tutoiement") {
      message = `Hello ${firstName},

Je voulais juste partager deux choses que j’ai faites récemment et que je peux apporter à ${company} :

${ach1}
${ach2}

Si tu as 10 minutes cette semaine, j’adorerais qu’on puisse en discuter !

Bonne journée,
${userFirstName}`;
    } else {
      message = `Bonjour ${firstName},

Je voulais juste partager deux choses que j’ai faites récemment et que je peux apporter à ${company} :

${ach1}
${ach2}

Si vous avez 10 minutes cette semaine, j’adorerais qu’on puisse en discuter !

Bonne journée,
${userFirstName}`;
    }
  }

  return {
    message,
    followUpNumber,
    tone,
    channel,
    suggestedDate: calculateFollowUpDate(new Date(), followUpNumber),
    realTasksUsed,
    realAchievementsUsed
  };
}

/**
 * Calculates next follow-up date (J+7) optimizing for Tuesday - Thursday sending window.
 */
export function calculateFollowUpDate(fromDate: Date | string, stage: number = 1): string {
  const date = typeof fromDate === "string" ? new Date(fromDate) : new Date(fromDate.getTime());
  // Add 7 days
  date.setDate(date.getDate() + 7);

  // Check day of week: 0 = Sunday, 1 = Monday, 5 = Friday, 6 = Saturday
  const day = date.getDay();
  if (day === 5) { // Friday -> push to next Tuesday (+4)
    date.setDate(date.getDate() + 4);
  } else if (day === 6) { // Saturday -> push to Tuesday (+3)
    date.setDate(date.getDate() + 3);
  } else if (day === 0) { // Sunday -> push to Tuesday (+2)
    date.setDate(date.getDate() + 2);
  } else if (day === 1) { // Monday -> push to Tuesday (+1)
    date.setDate(date.getDate() + 1);
  }

  return date.toISOString().split("T")[0];
}
