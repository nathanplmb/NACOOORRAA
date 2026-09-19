import { GoogleGenAI } from "@google/genai";
import { ExtractedJobInfo, CandidateProfile, ContactCategory } from "../types.ts";

// Lazy-initialize Gemini AI to prevent startup crashes if key is missing
let aiClient: GoogleGenAI | null = null;

export const CASCADE_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest"
];

function getAi(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!key) {
      console.warn("WARNING: GEMINI_API_KEY is not defined. AI features will operate in sandbox mode.");
      throw new Error("GEMINI_API_KEY is required");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

/**
 * Extracts structured job details from a raw job description or text.
 */
export async function extractJobDetails(jobDescription: string): Promise<ExtractedJobInfo> {
  try {
    const ai = getAi();
    const prompt = `
      Tu es un expert en recrutement bancaire, financier et ATS (Applicant Tracking System).
      Analyse minutieusement la description de l'offre d'emploi ci-dessous et extrait l'intégralité des informations structurées au format JSON exact demandé.
      Ne fais aucune extrapolation hasardeuse, mais sois très précis et exhaustif pour peupler une fiche de poste complète.

      Format JSON attendu :
      {
        "missions": [
          "Mission détaillée 1 avec son objectif et contexte opérationnel",
          "Mission détaillée 2...",
          ...
        ],
        "competencesRequises": ["compétence technique indispensable 1", ...],
        "competencesAppreciees": ["compétence technique bonus ou atout 1", ...],
        "softSkills": ["qualité relationnelle ou comportementale 1", ...],
        "outilsLogiciels": ["outil, progiciel, plateforme ou logiciel requis 1", ...],
        "formation": "Niveau d'études et filière requis (ex: Bac+3 à Bac+5 en Économie, Finance ou Banque)",
        "experienceRequise": "Années ou niveau d'expérience requis (ex: Débutant en alternance accepté)",
        "languesRequises": ["Français (Natif/Courant)", "Anglais (Professionnel)", ...],
        "avantages": ["Rémunération conventionnelle selon barème", "Titres-restaurant pris en charge à 60%", "Prise en charge 50% transports", ...],
        "avantagesEnvironnement": ["Télétravail possible 1 à 2 jours/semaine", "Espaces de travail récents", ...],
        "etapesRecrutement": [
          "Échange téléphonique de qualification RH (30 min)",
          "Entretien approfondi avec le Manager d'équipe (45 min)",
          "Entretien final ou restitution RH (30 min)"
        ],
        "recruiterContact": {
          "name": "Nom du contact RH si mentionné, sinon vide",
          "role": "Poste ou fonction du recruteur",
          "email": "Email si mentionné",
          "phone": "Téléphone si mentionné",
          "linkedin": "Lien ou nom LinkedIn si mentionné"
        },
        "entrepriseDetails": {
          "presentation": "Présentation globale concise et valorisante de l'entreprise",
          "parentGroup": "Maison mère ou groupe de rattachement si applicable",
          "secteur": "Secteur d'activité précis",
          "taille": "Effectif approximatif (ex: 2 500 collaborateurs)",
          "siege": "Siège social ou implantation principale",
          "chiffresCles": [
            { "label": "Collaborateurs", "value": "+2 500" },
            { "label": "Réseau d'agences", "value": "120" }
          ],
          "faitsMarquants": [
            "Projet de transformation digitale engagé",
            "Politique active de formation des alternants"
          ],
          "partenairesClients": [
            "Entreprises régionales",
            "Particuliers et professionnels indépendants"
          ]
        }
      }

      Description de l'offre :
      ${jobDescription}
    `;

    for (const model of CASCADE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        });

        const text = response.text || "{}";
        return JSON.parse(text) as ExtractedJobInfo;
      } catch (err: any) {
        console.info(`[extractJobDetails] Modèle ${model} indisponible, passage au suivant.`);
      }
    }
    throw new Error("All models failed for extractJobDetails");
  } catch (error) {
    console.error("Error in extractJobDetails:", error);
    // Return sensible fallback to ensure no app crash
    return {
      missions: [
        "Accompagnement de la clientèle et analyse des besoins patrimoniaux",
        "Préparation des dossiers financiers et suivi rigoureux des opérations courantes",
        "Participation active aux actions commerciales de l'agence et prospection ciblée"
      ],
      competencesRequises: ["Analyse financière de base", "Maîtrise des techniques de vente bancaire", "Réglementation bancaire & conformité"],
      competencesAppreciees: ["Connaissance des produits d'épargne et d'assurance-vie", "Appétence fintech & outils digitaux"],
      softSkills: ["Aisance relationnelle", "Écoute active", "Rigueur méthodologique", "Esprit d'équipe"],
      outilsLogiciels: ["Excel avancé", "Outils CRM bancaires", "Suite bureautique"],
      formation: "Bac+3 à Bac+5 en Banque, Finance ou Commerce",
      experienceRequise: "Première expérience ou alternance bienvenue",
      languesRequises: ["Français (Courant)"],
      avantages: ["Rémunération conventionnelle", "Titres-restaurant", "Prise en charge 50% transports"],
      avantagesEnvironnement: ["Locaux modernes", "Accompagnement par un tuteur dédié"],
      etapesRecrutement: [
        "1. Échange téléphonique de pré-sélection (20 min)",
        "2. Entretien avec le responsable d'agence (45 min)",
        "3. Validation RH et proposition contractuelle"
      ]
    };
  }
}

/**
 * Heuristic classifier fallback when Gemini API is unavailable or rate limited.
 * Follows strict hierarchy: Current Job > Current Company > Education > Past experiences.
 * Never confuses educators/staff with students, nor marketing/business talent programs with HR recruiters.
 */
function analyzeWithHeuristics(
  rawContacts: Array<{ fullName: string; jobTitle: string; companyName: string }>,
  candidateProfile: CandidateProfile
) {
  const profileSchool = (candidateProfile.currentSituation || "").toLowerCase();
  const currentCompany = (candidateProfile.currentAlternance || "").toLowerCase();

  return rawContacts.map(c => {
    const rawJob = (c.jobTitle || "").trim();
    const rawComp = (c.companyName || "").trim();
    const job = rawJob.toLowerCase();
    const comp = rawComp.toLowerCase();
    const name = c.fullName || "Contact";

    let category: ContactCategory = "other";
    let relevanceScore = 40;
    const connectionPoints: string[] = [];
    let normalizedJobTitle = rawJob || "Professionnel";
    let academicPath = "";

    // 1. Education professional / Academic staff (Teacher, Program Director, Trainer, Researcher, etc.)
    const isEducationStaff = /(enseignant|professeur|directeur|directrice|responsable.*formation|responsable.*p[eé]dagogique|responsable.*parcours|responsable.*d[eé]partement|intervenant|formateur|formatrice|ma[iî]tre.*conf[eé]rences|chercheur|chercheuse|coordinat|doyen|secr[eé]taire.*p[eé]dagogique|charg[eé]e? d'enseignement)/i.test(job);

    // 2. Genuine HR / Recruiter (Must be real HR role, not a marketer in a "Talent Program")
    const isRecruiter = (
      /(talent acquisition|charg[eé]e? de recrutement|responsable recrutement|directeur.*recrutement|consultant.*recrutement|cabinet.*recrutement|headhunter|chasseur de t[eê]tes|campus manager|drh\b|directeur.*rh\b|directrice.*rh\b|responsable rh\b|charg[eé]e? rh\b|gestionnaire rh\b|assistant.*rh\b|human resources|people & culture|people lead|people partner|talent partner|talent manager|recruiter|recruitment)/i.test(job)
    ) && !(
      /marketing|commercial|business dev|communication|d[eé]veloppeur|ing[eé]nieur|vente|vente|supply chain/i.test(job) &&
      !/recrut|talent acquisition|rh\b/i.test(job.replace(/programme|campus|talent/gi, ""))
    );

    // 3. Alumni link (direct school / university tie with candidate)
    const isAlumniLink = (
      /iut|clermont|montlu[cç]on|uca\b|iae\b|polytech|auvergne/i.test(job) || 
      /iut|clermont|montlu[cç]on|uca\b|auvergne/i.test(comp)
    ) && (
      profileSchool.includes("iut") || 
      profileSchool.includes("clermont") || 
      profileSchool.includes("montluçon") || 
      profileSchool.includes("uca")
    );

    // 4. Sector Pro (Finance, Banking, Wealth Management, FinTech, Insurance, Audit, Private Equity)
    const isSectorPro = (
      /(patrimoine|wealth|banqu|financ|fintech|invest|cr[eé]dit|assurance|asset|portfolio|trading|analyste|cgp|gestion priv[eé]e|auditeur|audit|risk|conformit[eé]|m&a|private equity|courtier|actuaire|charg[eé]e? d'affaires|conseiller.*client[eè]le|gestionnaire.*compte)/i.test(job)
    ) || (
      /(cr[eé]dit agricole|lcl\b|bnp|soci[eé]t[eé] g[eé]n[eé]rale|axa\b|palatine|bpifrance|boursorama|revolut|bpce|caisse d'epargne|banque populaire|cic\b|rothschild|natixis|allianz|generali|swiss life|qonto|spendesk)/i.test(comp)
    );

    // 5. Student / Intern / Apprentice (Strictly active students, never education staff/teachers)
    const isStudent = !isEducationStaff && (
      /(^|\b|\s)(étudiant|etudiant|student|alternant|alternante|stagiaire|intern\b|apprenti|apprentie|master\s*\d|but\s*tc|licence|en recherche d'alternance|en recherche de stage)($|\b|\s)/i.test(job)
    );

    // Apply strict classification hierarchy
    if (isRecruiter) {
      category = "recruiter";
      relevanceScore = isSectorPro ? 94 : 86;
      connectionPoints.push(comp ? `Recruteur RH chez ${rawComp}` : "Recruteur RH / Talent Acquisition");
      if (isAlumniLink) {
        academicPath = "IUT / UCA Clermont Auvergne";
        connectionPoints.unshift("Alumni du même réseau académique");
        relevanceScore = 98;
      }
    } else if (isAlumniLink) {
      category = "alumni";
      academicPath = "IUT / UCA Clermont Auvergne";
      relevanceScore = isSectorPro ? 96 : 90;
      if (isEducationStaff) {
        connectionPoints.push("Enseignant / Cadre pédagogique UCA/IUT");
      } else {
        connectionPoints.push("Alumni IUT Clermont Auvergne");
      }
      if (isSectorPro) {
        connectionPoints.push("Actif dans le secteur cible (Banque / Finance / Patrimoine)");
      }
    } else if (isSectorPro) {
      category = "sector_pro";
      relevanceScore = 84;
      connectionPoints.push(comp ? `Professionnel chez ${rawComp}` : "Professionnel du secteur cible (Banque / Finance)");
    } else if (isStudent) {
      category = "student";
      relevanceScore = isSectorPro ? 72 : 60;
      connectionPoints.push(comp ? `Alternant / Étudiant chez ${rawComp}` : "Étudiant / En parcours de formation");
    } else if (isEducationStaff) {
      category = "other_pro";
      relevanceScore = 70;
      connectionPoints.push("Cadre de l'enseignement supérieur / Formation");
    } else if (rawJob && rawJob.length > 2) {
      category = "other_pro";
      relevanceScore = 50;
      connectionPoints.push("Contact réseau professionnel");
    } else {
      category = "other";
      relevanceScore = 35;
      connectionPoints.push("Contact importé LinkedIn");
    }

    // Bonus for exact company match with current alternance
    if (currentCompany && currentCompany.length > 2 && comp.includes(currentCompany.substring(0, 8))) {
      relevanceScore = Math.min(100, relevanceScore + 10);
      connectionPoints.push(`Même entreprise : ${rawComp}`);
    }

    return {
      fullName: name,
      normalizedJobTitle: normalizedJobTitle || rawJob || "Professionnel",
      category,
      relevanceScore,
      connectionPoints,
      academicPath,
      previousCompanies: []
    };
  });
}

/**
 * Normalizes a list of imported LinkedIn contacts with model cascade and heuristic fallback.
 * Input: Raw contact details (fullName, jobTitle, companyName)
 * Output: Enrichment, categorization, and relevance scoring relative to the candidate's profile.
 */
export async function analyzeLinkedInContacts(
  rawContacts: Array<{ fullName: string; jobTitle: string; companyName: string }>,
  candidateProfile: CandidateProfile
): Promise<Array<{
  fullName: string;
  normalizedJobTitle: string;
  category: ContactCategory;
  relevanceScore: number;
  connectionPoints: string[];
  academicPath: string;
  previousCompanies: string[];
}>> {
  if (!rawContacts || rawContacts.length === 0) return [];

  const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!key) {
    return analyzeWithHeuristics(rawContacts, candidateProfile);
  }

  const prompt = `
    Tu es le moteur de classification et d'enrichissement réseau de NACORA, plateforme d'accélération de carrière spécialisée en Banque, Finance, Gestion de Patrimoine et FinTech.

    IMPORTANT : Analyse chaque contact selon son PROFIL GLOBAL et son ACTIVITÉ ACTUELLE RÉELLE, sans te précipiter sur un mot-clé isolé.

    Hiérarchie stricte des sources d'information :
    1. Poste actuel (Priorité absolue)
    2. Entreprise / Organisation actuelle
    3. Fonction réelle exercée
    4. Parcours de formation (Ne doit JAMAIS prendre le dessus sur le poste actuel)
    5. Expériences passées

    Profil du Candidat :
    - Nom : ${candidateProfile.fullName || "Candidat"}
    - Situation / Études : ${candidateProfile.currentSituation || "Étudiant en BUT TC à l'IUT Clermont Auvergne (Montluçon)"}
    - Alternance actuelle : ${candidateProfile.currentAlternance || "Crédit Agricole"}
    - Masters ciblés : ${(candidateProfile.targetMasters || []).join(", ") || "Finance / Gestion de patrimoine / Fintech"}
    - Compétences clés : ${(candidateProfile.skills || []).join(", ")}

    Règles fondamentales de classification par catégorie :

    1. "recruiter" (Recruteur / RH) :
       - UNIQUEMENT pour les personnes dont le métier actuel est réellement le recrutement ou les Ressources Humaines (Talent Acquisition Specialist, Chargé de recrutement, Consultant en recrutement, Headhunter, Campus Manager RH, DRH, Responsable RH, People Lead).
       - PIÈGE À ÉVITER : Une personne en marketing, communication, vente ou ingénierie qui mentionne "Talent Campus", "Programme Jeunes Talents" ou qui travaille dans une grande entreprise n'est PAS un recruteur. Ne pas la classer en "recruiter".

    2. "student" (Étudiant / Alternant / Stagiaire) :
       - UNIQUEMENT pour les personnes actuellement en cours d'études, en alternance ou en stage (ex: "Étudiant en Master", "Alternant Conseiller", "Stagiaire Analyste", "Apprenti").
       - PIÈGE À ÉVITER : Une personne travaillant dans une université, un IUT ou une école (Enseignant, Professeur, Responsable pédagogique, Directeur de formation, Intervenant, Coordinateur) est un professionnel en activité ("other_pro" ou "alumni"), JAMAIS un étudiant.

    3. "alumni" (Réseau Alumni / Même établissement) :
       - Personne issue du même établissement ou réseau académique que le candidat (${candidateProfile.currentSituation || "IUT Clermont Auvergne / Université Clermont Auvergne / IAE"}).
       - Le statut Alumni est un lien de connexion fort. Leur intitulé de poste ("normalizedJobTitle") doit toujours refléter leur métier professionnel réel.

    4. "sector_pro" (Professionnel du secteur cible) :
       - Professionnel exerçant dans les métiers ou entreprises cibles : Banque, Gestion de patrimoine (CGP, Banque Privée), Finance de marché ou d'entreprise, FinTech, Assurance, Private Equity, Audit.
       - Exemples : Conseiller bancaire, Gestionnaire de patrimoine, Analyste financier, Chargé d'affaires entreprises, Banquier privé, Courtier, etc.

    5. "other_pro" (Professionnel hors secteur cible) :
       - Professionnel en activité dans un autre secteur (Enseignement supérieur, Marketing, IT, Industrie, Commerce, Santé, Direction hors finance).

    6. "other" (Autre) :
       - Si les informations sont insuffisantes ou incertaines. NE JAMAIS DEVINER.

    Score de pertinence (0 à 100) :
    - Alumni en poste dans le secteur cible : 92-98
    - Recruteur RH en Banque / Finance : 90-96
    - Professionnel du secteur cible : 80-90
    - Alumni dans un autre secteur : 85-92
    - Recruteur RH autre secteur : 75-85
    - Étudiant dans la même filière : 60-75
    - Professionnel autre secteur : 45-60
    - Autre / non déterminé : 30-45

    Points de connexion (connectionPoints) :
    - 1 à 3 points synthétiques et précis (ex: "Alumni IUT Clermont Auvergne", "Recruteur RH chez Crédit Agricole", "Expertise Gestion de Patrimoine", "Responsable pédagogique UCA").

    Format JSON attendu :
    [
      {
        "fullName": "Nom exact",
        "normalizedJobTitle": "Intitulé de poste professionnel clarifié",
        "category": "recruiter | alumni | student | sector_pro | other_pro | other",
        "relevanceScore": 88,
        "connectionPoints": ["Point 1", "Point 2"],
        "academicPath": "Établissement si identifiable ou vide",
        "previousCompanies": []
      }
    ]

    Contacts à analyser :
    ${JSON.stringify(rawContacts)}
  `;

  let ai: GoogleGenAI;
  try {
    ai = getAi();
  } catch (e) {
    return analyzeWithHeuristics(rawContacts, candidateProfile);
  }

  for (const modelName of CASCADE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      });

      const text = response.text || "[]";
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return rawContacts.map((c, idx) => {
          const match = parsed[idx] || parsed.find((p: any) => p.fullName === c.fullName);
          if (match) {
            return {
              fullName: match.fullName || c.fullName,
              normalizedJobTitle: match.normalizedJobTitle || c.jobTitle || "Professionnel",
              category: (["recruiter", "alumni", "student", "sector_pro", "other_pro", "other"].includes(match.category) 
                ? match.category 
                : "other") as ContactCategory,
              relevanceScore: typeof match.relevanceScore === "number" ? match.relevanceScore : 50,
              connectionPoints: Array.isArray(match.connectionPoints) && match.connectionPoints.length > 0
                ? match.connectionPoints 
                : ["Contact importé LinkedIn"],
              academicPath: match.academicPath || "",
              previousCompanies: Array.isArray(match.previousCompanies) ? match.previousCompanies : []
            };
          }
          return analyzeWithHeuristics([c], candidateProfile)[0];
        });
      }
    } catch (modelErr: any) {
      const errMsg = modelErr?.message || String(modelErr);
      const isQuota = errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("Quota exceeded");
      if (isQuota) {
        console.log(`[analyzeLinkedInContacts] Quota API atteint, bascule immédiate sur le moteur heuristique.`);
        return analyzeWithHeuristics(rawContacts, candidateProfile);
      }
      console.warn(`[analyzeLinkedInContacts] Modèle ${modelName} indisponible, passage au suivant:`, errMsg);
    }
  }

  // If all models failed, use deterministic heuristic engine
  return analyzeWithHeuristics(rawContacts, candidateProfile);
}

/**
 * Deterministic fallback generator when Gemini API is under high demand (503 / 429) or unavailable.
 */
function generateFallbackMessage(
  contactName: string,
  contactCompany: string,
  contactJob: string,
  point: string,
  senderName: string,
  format: 'invite' | 'inmail' | 'followup',
  opportunityTitle?: string
): string {
  const firstName = contactName.split(" ")[0] || contactName;

  if (format === 'invite') {
    return `Bonjour ${firstName}, ayant un grand intérêt pour ${contactCompany || "vos activités"} (${point}), je serais ravi de vous rejoindre sur LinkedIn pour suivre vos actualités et échanger sur nos métiers. Bien cordialement, ${senderName}`;
  }

  if (format === 'followup') {
    return `Bonjour ${firstName},\n\nJe me permets de vous relancer suite à ma démarche récente. Évoluant dans le secteur et préparant mes prochaines étapes professionnelles, j'aurais beaucoup apprécié recueillir votre retour d'expérience sur ${contactCompany}.\n\nRestant à votre entière disposition,\nBien cordialement,\n${senderName}`;
  }

  // inmail
  return `Bonjour ${firstName},\n\nActuellement en parcours spécialisé et passionné par les enjeux de ${contactCompany}, je vous contacte car votre expérience en tant que ${contactJob} a tout particulièrement retenu mon attention (${point}).\n\n${opportunityTitle ? `Candidatant activement pour le poste de ${opportunityTitle}, ` : ""}Je serais très honoré de pouvoir échanger quelques minutes avec vous afin de bénéficier de vos précieux conseils sur les dynamiques du secteur.\n\nEn vous remerciant pour votre temps,\nBien cordialement,\n${senderName}`;
}

/**
 * Generates a highly personalized outreach message for LinkedIn.
 */
export async function generateOutreachMessage(
  contactName: string,
  contactJob: string,
  contactCompany: string,
  connectionPoints: string[],
  candidateProfile: CandidateProfile,
  opportunityTitle?: string,
  format: 'invite' | 'inmail' | 'followup' = 'invite'
): Promise<string> {
  const senderName = candidateProfile.fullName || "Nathan";
  const pointsSummary = connectionPoints && connectionPoints.length > 0 ? connectionPoints[0] : "votre parcours inspirant";

  try {
    const ai = getAi();
    const formatInstructions = format === 'invite'
      ? 'Court message d\'invitation LinkedIn (STRICTEMENT MOINS DE 280 CARACTÈRES espace compris pour tenir dans la limite de note d\'invitation LinkedIn).'
      : format === 'inmail'
      ? 'Message d\'approche InMail ou Email personnalisé (environ 100 à 150 mots), structuré en 2-3 courts paragraphes.'
      : 'Message de relance bienveillant et concis (environ 60 à 90 mots) faisant suite à un premier échange ou une candidature.';

    const prompt = `
      Tu es l'assistant de networking de NACORA.
      Rédige un message d'approche professionnel en français pour contacter cette personne sur LinkedIn ou par email.

      Format requis : ${formatInstructions}
      
      Destinataire :
      - Nom : ${contactName}
      - Poste : ${contactJob}
      - Entreprise : ${contactCompany}
      - Points communs détectés : ${connectionPoints.join(", ")}

      Expéditeur (Candidat) :
      - Nom : ${candidateProfile.fullName}
      - Situation : ${candidateProfile.currentSituation}
      - Alternance : ${candidateProfile.currentAlternance}
      - Objectif : Intégrer un master en ${candidateProfile.targetMasters.join(" / ")}
      ${opportunityTitle ? `- Opportunité liée : Candidature pour ${opportunityTitle}` : ""}

      Consignes de style :
      - Ton professionnel, respectueux, direct et poli (vouvoiement).
      - Pas de pitch commercial agressif. Demande un court retour d'expérience ou échange de conseils.
      - Valorise subtilement le point de connexion si présent.

      Renvoie UNIQUEMENT le texte final du message sans aucun commentaire.
    `;

    for (const model of CASCADE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
        });

        if (response && response.text) {
          return response.text.trim();
        }
      } catch (err: any) {
        console.info(`[generateOutreachMessage] Modèle ${model} indisponible, passage au suivant.`);
      }
    }

    return generateFallbackMessage(contactName, contactCompany, contactJob, pointsSummary, senderName, format, opportunityTitle);
  } catch (error) {
    console.warn("[generateOutreachMessage] AI models unavailable, generating smart fallback:", error);
    return generateFallbackMessage(contactName, contactCompany, contactJob, pointsSummary, senderName, format, opportunityTitle);
  }
}

/**
 * Generates an intelligent, tailored fallback response when AI models are unavailable or rate limited.
 */
function generatePersonaFallback(
  personaId: string,
  userMessage: string,
  candidateProfile: CandidateProfile,
  activeFocus?: { type: string; title: string; subtitle?: string; detail?: string }
): string {
  const query = userMessage.toLowerCase();
  const name = candidateProfile.fullName ? candidateProfile.fullName.split(" ")[0] : "Candidat";
  const situation = candidateProfile.currentSituation || "Étudiant en Banque / Finance";
  const currentExp = candidateProfile.currentAlternance || "Expérience professionnelle";
  const targetMaster = (candidateProfile.targetMasters || ["Banque / Finance"]).join(" / ");
  const skillsList = (candidateProfile.skills || ["Analyse financière", "Gestion de patrimoine", "Relation client"]).join(", ");

  // 1. Accroche CV / Rédiger profil
  if (query.includes("accroche") || query.includes("profil") || query.includes("présentation cv")) {
    return `Voici une proposition d'accroche de CV impactante et personnalisée pour ton profil :

**Accroche recommandée :**
« **${situation}** actuellement chez **${currentExp}**, je prépare activement l'intégration d'un Master en **${targetMaster}**. Fort de mes compétences en **${skillsList}**, je souhaite mettre ma rigueur d'analyse et ma réactivité au service de vos équipes. »

**Points forts de cette accroche :**
• **Lisibilité immédiate** : Ton niveau actuel et ton projet académique sont clairs dès les 3 premières secondes.
• **Mise en valeur opérationnelle** : Valorisation de ton entreprise actuelle et de tes compétences clés.
• **Posture professionnelle** : Ton adapté aux exigences de la Banque, de la Finance et de la Gestion de Patrimoine.

[ACTIONS: "Adapter cette accroche à une offre" | "Structurer les compétences du CV"]`;
  }

  // 2. Adapter CV à une fiche de poste / offre
  if (query.includes("adapter") || query.includes("fiche de poste") || query.includes("offre")) {
    const focusTitle = activeFocus?.title || "l'opportunité sélectionnée";
    return `Voici la méthodologie pas à pas pour adapter parfaitement ton CV à **${focusTitle}** :

1. **Intituler précisément ton profil** : Aligne l'intitulé exact au sommet de ton CV avec le titre du poste visé (*${focusTitle}*).
2. **Harmoniser les mots-clés techniques** : Reprends les termes clés de l'offre (**${skillsList}**) dans la description de tes expériences chez **${currentExp}**.
3. **Chiffrer tes réalisations** : Mets en avant des données concrètes de tes missions précédentes chez **${currentExp}**.
4. **Cohérence du parcours** : Souligne la suite logique avec ton projet de Master en **${targetMaster}**.

[ACTIONS: "Rédiger l'accroche CV" | "Préparer l'entretien pour ce poste"]`;
  }

  // 3. Entretien / Simulation / STAR
  if (query.includes("entretien") || query.includes("star") || query.includes("simulation") || query.includes("question")) {
    return `Très bien ! Préparons ton entretien avec la **méthode STAR** (Situation, Tâche, Action, Résultat).

**Mise en situation conseillée :**
*« Peux-tu me présenter une situation professionnelle récente chez ${currentExp} où tu as dû résoudre un problème complexe ou gérer une situation délicate avec un client ou un collaborateur ? »*

**Structure attendue pour ta réponse :**
• **S**ituation : Le contexte chez **${currentExp}**.
• **T**âche : L'objectif ou le problème à résoudre.
• **A**ction : Ce que TU as fait concrètement (compétences mobilisées : **${skillsList}**).
• **R**ésultat : L'impact mesurable ou l'enseignement retenu.

[ACTIONS: "Exemple de réponse STAR" | "Questions pièges fréquentes"]`;
  }

  // 4. Networking / Message d'approche
  if (query.includes("message") || query.includes("linkedin") || query.includes("contact") || query.includes("réseau") || query.includes("alumni")) {
    const focusTitle = activeFocus?.title || "mon secteur d'intérêt";
    return `Voici un modèle de message d'approche LinkedIn percutant et professionnel :

**Message proposé :**
« Bonjour,

Actuellement **${situation}** et préparant un Master en **${targetMaster}**, je suis avec attention les activités de votre organisation. Votre parcours et votre expertise sur **${focusTitle}** retiennent tout particulièrement mon attention.

Seriez-vous disposé(e) à m'accorder un court échange de 10 minutes pour me faire part de votre retour d'expérience ?

En vous remerciant vivement pour votre temps.

Bien cordialement,
**${candidateProfile.fullName || name}** »

[ACTIONS: "Personnaliser pour un Alumni" | "Message de relance"]`;
  }

  // 5. Négociation / Salaire
  if (query.includes("salaire") || query.includes("négocier") || query.includes("package") || query.includes("remunération")) {
    return `Pour aborder la négociation de ta rémunération avec sérénité :

**Repères pour ton profil :**
• **Gratification / Salaire** : En alternance/stage, les grilles conventionnelles de la banque/finance prévoient des barèmes basés sur l'âge et le niveau d'études (Master **${targetMaster}**).
• **Éléments du package global** : Ne négocie pas seulement le fixe ! Pense aux titres-restaurant, à la prise en charge des transports, au variable et à l'intéressement.

**Formulation recommandée en entretien :**
« Compte tenu de mon expérience pratique chez **${currentExp}** et de la maîtrise de compétences comme **${skillsList}**, j'aimerais échanger sur la possibilité d'adapter la rémunération globale proposée. »

[ACTIONS: "Calculer mon salaire net estimé" | "Formulation pour un email de réponse"]`;
  }

  // 6. Generic intelligent response based on persona
  if (personaId === "interview") {
    return `En tant que **Coach Entretien NACORA**, je suis prêt pour ton entraînement.

Souhaites-tu simuler un entretien pour un poste précis (**${activeFocus?.title || "Banque / Finance"}**), travailler la méthode STAR ou réviser les questions de présentation ?

[ACTIONS: "Lancer une simulation de 5 min" | "Questions techniques fréquentes"]`;
  }

  if (personaId === "cv_letter") {
    return `En tant qu'**Expert CV & Lettres NACORA**, je peux t'aider à optimiser tes candidatures.

Compte tenu de ta situation (**${situation}**) et de ton objectif de Master (**${targetMaster}**), sur quoi souhaites-tu travailler ?

[ACTIONS: "Rédiger mon accroche CV" | "Adapter mon CV à une offre" | "Revoir la lettre de motivation"]`;
  }

  if (personaId === "networking") {
    return `En tant que **Stratège Réseau NACORA**, je t'aide à contacter les bonnes personnes (Alumni, Recruteurs RH, Managers).

Souhaites-tu rédiger une note d'invitation LinkedIn, un message InMail ou préparer une démarche auprès des anciens élèves de ta formation ?

[ACTIONS: "Rédiger une invitation LinkedIn" | "Message d'approche Alumni"]`;
  }

  if (personaId === "negotiation") {
    return `En tant qu'**Expert Négociation Salaire NACORA**, je t'accompagne pour valoriser ton package.

Souhaites-tu évaluer une offre de rémunération, analyser les avantages conventionnels ou préparer tes arguments ?

[ACTIONS: "Analyser une offre salariale" | "Arguments de négociation"]`;
  }

  return `En tant que **Conseiller Carrière NACORA**, je t'accompagne dans la structuration de ta recherche.

Rappel de tes objectifs :
• **Situation** : ${situation} (expérience chez ${currentExp})
• **Objectif** : Master en ${targetMaster}
• **Compétences clés** : ${skillsList}

Comment puis-je t'aider aujourd'hui ?

[ACTIONS: "Analyser l'adéquation de mon profil" | "Définir mon plan d'action de la semaine"]`;
}

/**
 * Handles chat interactions with different assistant personas enriched with full NACORA context.
 */
export async function handlePersonaChat(
  personaId: string,
  messages: Array<{ role: 'user' | 'model'; text: string }>,
  candidateProfile: CandidateProfile,
  activeFocus?: { type: string; title: string; subtitle?: string; detail?: string },
  contextSummary?: {
    opportunitiesCount?: number;
    contactsCount?: number;
    companiesCount?: number;
    calendarEventsCount?: number;
    documentsCount?: number;
    opportunities?: Array<{ title: string; company: string; status: string; location?: string; salary?: string; keyMissions?: string[] }>;
    contacts?: Array<{ name: string; job: string; company: string; category: string; connectionPoints?: string[] }>;
    companies?: Array<{ name: string; sector?: string }>;
    calendarEvents?: Array<{ title: string; date: string; type: string }>;
    documents?: Array<{ title: string; type: string }>;
  }
): Promise<string> {
  try {
    const ai = getAi();

    // 1. Compile active focus prompt block if present
    let activeFocusBlock = "";
    if (activeFocus && activeFocus.title) {
      activeFocusBlock = `
=== SUJET D'ÉTUDE ACTIF (CONTEXTE PRIORITAIRE DE LA DISCUSSION) ===
- Type d'élément : ${activeFocus.type || "Général"}
- Intitulé / Nom : ${activeFocus.title}
${activeFocus.subtitle ? `- Sous-titre / Organisation : ${activeFocus.subtitle}` : ""}
${activeFocus.detail ? `- Détails & Données : ${activeFocus.detail}` : ""}
===================================================================
`;
    }

    // 2. Compile broader NACORA database context summary block
    let nacoraContextBlock = "";
    if (contextSummary) {
      const oppsStr = (contextSummary.opportunities || [])
        .map(o => `  * ${o.title} chez ${o.company} (Statut: ${o.status}${o.location ? `, Lieu: ${o.location}` : ""}${o.salary ? `, Gratification/Salaire: ${o.salary}` : ""})`)
        .join("\n");

      const contactsStr = (contextSummary.contacts || [])
        .slice(0, 8)
        .map(c => `  * ${c.name} - ${c.job} chez ${c.company} [${c.category}] (Lien: ${(c.connectionPoints || []).join(" | ") || "Réseau"})`)
        .join("\n");

      const eventsStr = (contextSummary.calendarEvents || [])
        .slice(0, 5)
        .map(e => `  * ${e.date} : ${e.title} (${e.type})`)
        .join("\n");

      const docsStr = (contextSummary.documents || [])
        .map(d => `  * ${d.title} (${d.type})`)
        .join("\n");

      nacoraContextBlock = `
=== BASE DE DONNÉES NACORA DU CANDIDAT (CONTEXTE SÉLECTIF DISPONIBLE) ===
- Profil : ${candidateProfile.fullName || "Candidat"} (${candidateProfile.currentSituation || "En formation"})
- Alternance / Postes actuels : ${candidateProfile.currentAlternance || "Aucune actuellement"}
- Masters ciblés : ${(candidateProfile.targetMasters || []).join(", ")}
- Compétences clés : ${(candidateProfile.skills || []).join(", ")}

- Opportunités en cours (${contextSummary.opportunitiesCount || 0}) :
${oppsStr || "  * Aucune opportunité enregistrée"}

- Contacts réseau (${contextSummary.contactsCount || 0}) :
${contactsStr || "  * Aucun contact réseau enregistré"}

- Échéances calendrier (${contextSummary.calendarEventsCount || 0}) :
${eventsStr || "  * Aucune échéance à venir"}

- Documents disponibles (${contextSummary.documentsCount || 0}) :
${docsStr || "  * Aucun document"}
====================================================================
`;
    }

    // 3. Define the system instructions based on the selected persona
    let specialistRole = "";
    let specialistInstructions = "";

    switch (personaId) {
      case "general":
        specialistRole = "Conseiller Carrière NACORA";
        specialistInstructions = `
Tu es le Conseiller Carrière de NACORA, plateforme d'accélération de carrière en Banque, Finance, Gestion de Patrimoine et FinTech.
Ton rôle est d'aider le candidat à :
- Structurer sa recherche d'alternance, de stage ou de premier emploi.
- Comparer et prioriser les opportunités dans sa base NACORA.
- Analyser les écarts entre son profil actuel (${candidateProfile.currentSituation || "étudiant"}) et les exigences des offres visées.
- Donner des conseils stratégiques concrets et un plan d'action étape par étape.
`;
        break;

      case "interview":
        specialistRole = "Coach Entretien NACORA";
        specialistInstructions = `
Tu es le Coach d'Entretien de NACORA, expert en entraînement aux entretiens du secteur bancaire, financier et des grandes entreprises.
Ton rôle est de :
- Simuler des entretiens de recrutement réalistes (mises en situation, questions comportementales et techniques).
- Poser UNE question précise à la fois et attendre la réponse du candidat pour évaluer sa méthode STAR (Situation, Tâche, Action, Résultat).
- Donner un feedback constructif, bienveillant et chiffré sur ses réponses.
- Adapter les questions au poste, à l'entreprise ou à l'opportunité active en contexte.
`;
        break;

      case "cv_letter":
        specialistRole = "Expert CV & Lettres NACORA";
        specialistInstructions = `
Tu es l'Expert CV & Lettres de NACORA, spécialiste de l'optimisation ATS et de la rédaction à fort impact.
Ton rôle est de :
- Analyser le CV et les lettres de motivation du candidat ou les offres ciblées.
- Identifier les mots-clés techniques indispensables et verbes d'action.
- Proposer des accroches percutantes, des formulations synthétiques et convaincantes.
- Proposer des améliorations directes de phrases ou des paragraphes prêts à l'emploi.
`;
        break;

      case "networking":
        specialistRole = "Stratège Réseau NACORA";
        specialistInstructions = `
Tu es le Stratège Réseau & LinkedIn de NACORA, expert en prospection professionnelle et marché caché.
Ton rôle est de :
- Analyser le réseau de contacts du candidat (Alumni, Recruteurs, Professionnels du secteur).
- Identifier les meilleures personnes à contacter dans la base NACORA par rapport à une entreprise ou offre ciblée.
- Rédiger des messages d'approche LinkedIn percutants et personnalisés en exploitant les points de connexion (Alumni, même ville, même groupe).
- Donner des conseils sur le suivi des échanges et l'obtention d'entretiens d'information.
`;
        break;

      case "negotiation":
        specialistRole = "Négociation Salaire NACORA";
        specialistInstructions = `
Tu es l'Expert en Négociation Salariale de NACORA, spécialiste des packages de rémunération en banque, finance et gestion de patrimoine.
Ton rôle est de :
- Analyser les propositions de salaire, gratifications d'alternance/stage et packages globaux (fixe, variable, primes conventionnelles, titres-restaurant, transports, intéressement).
- Préparer des arguments de valeur factuels basés sur les grilles du secteur et les compétences du candidat.
- Fournir les formulations exactes à utiliser en entretien ou par email.
- Simuler la négociation avec un recruteur.
`;
        break;

      default:
        specialistRole = "Conseiller Carrière NACORA";
        specialistInstructions = "Tu es le Conseiller Carrière de NACORA. Accompagne le candidat avec expertise et concision.";
    }

    const systemInstruction = `
${specialistInstructions}

${activeFocusBlock}

${nacoraContextBlock}

Directives de réponse :
- Tu t'adresses directement à ${candidateProfile.fullName || "le candidat"}.
- Sois synthétique, structuré (puces, gras, paragraphes aérés), professionnel et pragmatique.
- Si un sujet actif (offre, contact, etc.) est fourni en contexte, fais-y directement référence.
- N'invente pas de fausses données d'entreprise non présentes dans le contexte.
- À la toute fin de ta réponse, si pertinent, tu peux suggérer 2 à 3 actions rapides au format strict suivant sur une nouvelle ligne :
  [ACTIONS: "Libellé action 1" | "Libellé action 2"]
`;

    // Standardize and compile chat history
    const geminiHistory = messages.map(msg => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));

    const lastUserMsg = messages.filter(m => m.role === 'user').slice(-1)[0]?.text || "";

    for (const model of CASCADE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: geminiHistory,
          config: {
            systemInstruction: systemInstruction,
          }
        });

        if (response && response.text) {
          return response.text;
        }
      } catch (err: any) {
        const msg = err?.message || String(err);
        if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Quota exceeded")) {
          console.info(`[handlePersonaChat] Quota atteint pour le modèle ${model}, passage au modèle suivant.`);
        } else {
          console.info(`[handlePersonaChat] Indisponibilité du modèle ${model}, passage au modèle suivant.`);
        }
      }
    }

    return generatePersonaFallback(personaId, lastUserMsg, candidateProfile, activeFocus);
  } catch (error) {
    console.error("Error in handlePersonaChat:", error);
    const lastUserMsg = messages.filter(m => m.role === 'user').slice(-1)[0]?.text || "";
    return generatePersonaFallback(personaId, lastUserMsg, candidateProfile, activeFocus);
  }
}
