import { GoogleGenAI } from "@google/genai";
import { 
  ExtractedJobInfo, 
  CandidateProfile, 
  ContactCategory, 
  ContactCategoryItem, 
  NetworkingRelevanceItem, 
  ProfessionalProfileDetails, 
  Opportunity, 
  Contact, 
  CalendarEvent 
} from "../types.ts";
import { computePrimaryCategory } from "../utils/contactMerger.ts";
import { CV_FRAMEWORK_SYSTEM_PROMPT } from "./cvFramework.ts";
import { 
  NETWORKING_FRAMEWORK_SYSTEM_PROMPT,
  recommendNetworkingStrategy,
  generateOutreachMessageWithFramework
} from "./networkingFramework.ts";

// Lazy-initialize Gemini AI to prevent startup crashes if key is missing
let aiClient: GoogleGenAI | null = null;

export const CASCADE_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
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

export interface RawLinkedInContactInput {
  id?: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  jobTitle: string;
  companyName: string;
  linkedInUrl?: string;
  email?: string;
  connectedOn?: string;
  existingContact?: Partial<Contact>;
}

export interface AnalyzedLinkedInContact {
  id?: string;
  fullName: string;
  normalizedJobTitle: string;
  category: ContactCategory;
  categories: ContactCategoryItem[];
  professionalProfile: ProfessionalProfileDetails;
  pastCompanies: string[];
  education: string[];
  companySector: string;
  networkingRelevance: NetworkingRelevanceItem[];
  summary: string;
  relevanceScore: number;
  connectionPoints: string[];
  academicPath: string;
  previousCompanies: string[];
}

/**
 * Robust multidimensional heuristic classifier fallback when Gemini API is unavailable or rate limited.
 * Evaluates all 8 dimensions independently with confidence levels and factual justifications:
 * 1. Statut / Parcours
 * 2. Recrutement / RH
 * 3. Fonction Professionnelle
 * 4. Niveau / Seniorité
 * 5. Secteur
 * 6. Alumni / Relation Académique
 * 7. Relation Professionnelle
 * 8. Intérêt Réseau
 */
export function analyzeWithHeuristics(
  rawContacts: RawLinkedInContactInput[],
  candidateProfile: CandidateProfile
): AnalyzedLinkedInContact[] {
  const profileSchool = (candidateProfile.currentSituation || "").toLowerCase();
  const currentCompany = (candidateProfile.currentAlternance || "").toLowerCase();
  const targetSectors = (candidateProfile.targetSectors || ["Banque", "Finance", "FinTech", "Gestion de Patrimoine"]).map(s => s.toLowerCase());
  const targetCompanies = (candidateProfile.targetCompanies || []).map(c => c.toLowerCase());

  return rawContacts.map(c => {
    const rawJob = (c.jobTitle || "").trim();
    const rawComp = (c.companyName || "").trim();
    const job = rawJob.toLowerCase();
    const comp = rawComp.toLowerCase();
    const name = c.fullName || "Contact";

    const categories: ContactCategoryItem[] = [];
    const networkingRelevance: NetworkingRelevanceItem[] = [];
    const connectionPoints: string[] = [];
    let normalizedJobTitle = rawJob || "Professionnel";
    let academicPath = "";
    let relevanceScore = 50;

    // --- 1. STATUT / PARCOURS ---
    const isEducationStaff = /(enseignant|professeur|directeur|directrice|responsable.*formation|responsable.*p[eé]dagogique|responsable.*parcours|responsable.*d[eé]partement|intervenant|formateur|formatrice|ma[iî]tre.*conf[eé]rences|chercheur|chercheuse|coordinat|doyen|secr[eé]taire.*p[eé]dagogique|charg[eé]e? d'enseignement)/i.test(job);
    const isStudent = !isEducationStaff && /(^|\b|\s)(étudiant|etudiant|student|alternant|alternante|stagiaire|intern\b|apprenti|apprentie|master\s*\d|but\s*tc|licence|en recherche d'alternance|en recherche de stage)($|\b|\s)/i.test(job);

    if (isStudent) {
      categories.push({
        category: "status",
        subcategory: /alternan/i.test(job) ? "Alternant" : /stagiaire|intern/i.test(job) ? "Stagiaire" : "Étudiant",
        confidence: "high",
        reason: `Statut étudiant ou alternant explicitement indiqué dans l'intitulé : "${rawJob}"`
      });
      connectionPoints.push("Parcours de formation / Alternance");
    } else if (isEducationStaff) {
      categories.push({
        category: "status",
        subcategory: "Enseignant / Cadre pédagogique",
        confidence: "high",
        reason: `Poste académique ou enseignement supérieur : "${rawJob}"`
      });
      connectionPoints.push("Cadre de l'enseignement supérieur");
    } else {
      categories.push({
        category: "status",
        subcategory: "Professionnel en activité",
        confidence: "high",
        reason: `Activité professionnelle continue chez ${rawComp || "son organisation"}`
      });
    }

    // --- 2. RECRUTEMENT / RH ---
    // Strict distinction: Operational bankers, client advisors, wealth managers are NEVER recruiters
    const isOperationalBanking = /(conseill[eè]re?|charg[eé]e? de client[eè]le|charg[eé]e? d'affaires|banqu|patrimoine|wealth|cr[eé]dit|credit|analyste|directeur d'agence|directrice d'agence|courtier|trader)/i.test(job);
    const hasExplicitHRRole = /(talent acquisition|charg[eé]e? de recrutement|responsable recrutement|directeur.*recrutement|consultant.*recrutement|cabinet.*recrutement|headhunter|chasseur de t[eê]tes|campus recruiter|campus manager|drh\b|directeur.*rh\b|directrice.*rh\b|responsable rh\b|charg[eé]e? rh\b|gestionnaire rh\b|assistant.*rh\b|human resources|people & culture|people lead|people partner|talent partner|talent manager|recruiter|recruitment)/i.test(job);

    const isRecruiter = hasExplicitHRRole && !isOperationalBanking;

    if (isRecruiter) {
      let sub = "Recruteur / Talent Acquisition";
      if (/responsable|directeur|head|lead|drh/i.test(job)) sub = "Responsable Recrutement / RH";
      else if (/campus/i.test(job)) sub = "Campus Recruiter";

      categories.push({
        category: "recruitment",
        subcategory: sub,
        confidence: "high",
        reason: `Rôle explicite en ressources humaines et recrutement : "${rawJob}"`
      });
      networkingRelevance.push({
        type: "Recrutement",
        pillar: "Recrutement RH",
        context: comp ? `Opportunités de carrière chez ${rawComp}` : "Opportunités de stage, alternance ou premier emploi",
        recommendation: "Point de contact prioritaire pour faire part de votre candidature et solliciter un créneau d'échange.",
        confidence: "high",
        reason: "Contact RH clé pour des opportunités de recrutement"
      });
      connectionPoints.push(comp ? `Recrutement RH chez ${rawComp}` : "Recruteur RH");
    }

    // --- 3. FONCTION PROFESSIONNELLE ---
    const isFinanceOrBanking = /(patrimoine|wealth|banqu|financ|fintech|invest|cr[eé]dit|assurance|asset|portfolio|trading|analyste.*financ|cgp|gestion priv[eé]e|auditeur|audit|risk|conformit[eé]|m&a|private equity|courtier|actuaire|charg[eé]e? d'affaires|conseiller.*client[eè]le|gestionnaire.*compte)/i.test(job) ||
      /(cr[eé]dit agricole|lcl\b|bnp|soci[eé]t[eé] g[eé]n[eé]rale|axa\b|palatine|bpifrance|boursorama|revolut|bpce|caisse d'epargne|banque populaire|cic\b|rothschild|natixis|allianz|generali|swiss life|qonto|spendesk|trade republic|finary)/i.test(comp);

    const isCommercial = /(commercial|business dev|sales|account executive|charg[eé] d'affaires|n[eé]gociat|d[eé]veloppement commercial)/i.test(job);
    const isMarketing = /(marketing|communication|brand|m[eé]dia|growth|crm)/i.test(job);
    const isTech = /(d[eé]veloppeur|developer|software|data|ing[eé]nieur|tech|product|it\b|architecte)/i.test(job);
    const isConsulting = /(consultant|conseil|advisory|strategy|strat[eé]gie)/i.test(job);

    if (isFinanceOrBanking) {
      categories.push({
        category: "professional_function",
        subcategory: "Finance & Banque",
        confidence: "high",
        reason: `Activité directe dans le domaine bancaire, financier ou patrimonial`
      });
    } else if (isCommercial) {
      categories.push({
        category: "professional_function",
        subcategory: "Commercial & Business Development",
        confidence: "high",
        reason: `Fonction commerciale ou développement d'affaires : "${rawJob}"`
      });
    } else if (isMarketing) {
      categories.push({
        category: "professional_function",
        subcategory: "Marketing & Communication",
        confidence: "high",
        reason: `Rôle en marketing, communication ou stratégie de marque : "${rawJob}"`
      });
    } else if (isTech) {
      categories.push({
        category: "professional_function",
        subcategory: "Tech, Data & Produit",
        confidence: "high",
        reason: `Fonction technique, ingénierie ou produit numérique : "${rawJob}"`
      });
    } else if (isConsulting) {
      categories.push({
        category: "professional_function",
        subcategory: "Conseil & Stratégie",
        confidence: "high",
        reason: `Activité de conseil ou accompagnement stratégique : "${rawJob}"`
      });
    }

    // --- 4. NIVEAU / SENIORITÉ ---
    const isExecutive = /(fondateur|fondatrice|founder|co-founder|ceo|cfo|cro|coo|cto|président|president|directeur g[eé]n[eé]ral|partner|associ[eé])/i.test(job);
    const isManager = !isExecutive && /(directeur|directrice|head of|lead|responsable|manager|chef de|superviseur)/i.test(job);
    const isSenior = !isExecutive && !isManager && /(senior|expert|principal|confirm[eé]|sp[eé]cialiste)/i.test(job);
    const isJunior = !isExecutive && !isManager && !isSenior && (isStudent || /(junior|d[eé]butant|assistant|analyste)/i.test(job));

    if (isExecutive) {
      categories.push({
        category: "seniority",
        subcategory: "C-Level / Fondateur / Dirigeant",
        confidence: "high",
        reason: `Fonction de très haute direction ou création d'entreprise : "${rawJob}"`
      });
    } else if (isManager) {
      categories.push({
        category: "seniority",
        subcategory: "Manager / Direction d'équipe",
        confidence: "high",
        reason: `Poste d'encadrement ou de management d'équipe : "${rawJob}"`
      });
    } else if (isSenior) {
      categories.push({
        category: "seniority",
        subcategory: "Senior / Expert",
        confidence: "medium",
        reason: `Expertise confirmée sur son périmètre`
      });
    } else if (isJunior) {
      categories.push({
        category: "seniority",
        subcategory: "Junior / En formation",
        confidence: "medium",
        reason: `Début de parcours ou poste d'entrée dans le métier`
      });
    }

    // --- 5. SECTEUR D'ACTIVITÉ ---
    let detectedSector = "Secteur tertiaire";
    let isTargetSector = false;

    if (/(cr[eé]dit agricole|lcl|bnp|soci[eé]t[eé] g[eé]n[eé]rale|bpce|banque populaire|caisse d'epargne|cic|rothschild|palatine|boursorama|banqu)/i.test(comp + " " + job)) {
      detectedSector = "Banque & Services financiers";
      isTargetSector = true;
    } else if (/(patrimoine|wealth|gestion priv[eé]e|cgp|cabinet.*patrimoine)/i.test(comp + " " + job)) {
      detectedSector = "Gestion de Patrimoine";
      isTargetSector = true;
    } else if (/(fintech|revolut|trade republic|finary|qonto|spendesk|payfit|klarna)/i.test(comp + " " + job)) {
      detectedSector = "FinTech & Néo-finance";
      isTargetSector = true;
    } else if (/(assurance|axa|generali|allianz|swiss life|maif|macif|groupama)/i.test(comp + " " + job)) {
      detectedSector = "Assurance & Prévoyance";
      isTargetSector = true;
    } else if (/(universit[eé]|iut|uca|iae|polytech|lyc[eé]e|ecole|formation)/i.test(comp + " " + job)) {
      detectedSector = "Enseignement Supérieur & Recherche";
    }

    // Check if company matches target companies
    const isTargetCompany = targetCompanies.some(tc => tc && comp.includes(tc));
    if (isTargetCompany) isTargetSector = true;

    categories.push({
      category: "sector",
      subcategory: detectedSector,
      confidence: isTargetSector ? "high" : "medium",
      reason: isTargetSector 
        ? `Secteur aligné avec les objectifs du candidat (${detectedSector})` 
        : `Secteur identifié à partir de l'entreprise "${rawComp || "Non précisée"}"`
    });

    // --- 6. ALUMNI / RELATION ACADÉMIQUE ---
    const isAlumniLink = (
      /iut|clermont|montlu[cç]on|uca\b|iae\b|polytech|auvergne/i.test(job) || 
      /iut|clermont|montlu[cç]on|uca\b|auvergne/i.test(comp)
    ) && (
      profileSchool.includes("iut") || 
      profileSchool.includes("clermont") || 
      profileSchool.includes("montluçon") || 
      profileSchool.includes("uca")
    );

    if (isAlumniLink) {
      academicPath = "IUT / UCA Clermont Auvergne";
      categories.push({
        category: "academic",
        subcategory: isEducationStaff ? "Enseignant / Cadre de l'établissement" : "Alumni même établissement",
        confidence: "high",
        reason: `Lien direct vérifié avec le réseau académique (${academicPath})`
      });
      networkingRelevance.push({
        type: "Alumni",
        pillar: "Réseau Alumni",
        context: isEducationStaff ? "Corps enseignant / Cadre académique" : "Alumni partageant votre alma mater",
        recommendation: "Solliciter un retour d'expérience sur l'insertion professionnelle et des conseils d'orientation.",
        confidence: "high",
        reason: `Partage le même réseau universitaire (${academicPath})`
      });
      connectionPoints.unshift(isEducationStaff ? "Enseignant IUT/UCA" : "Alumni IUT Clermont Auvergne");
    }

    // --- 7. RELATION PROFESSIONNELLE ---
    if (currentCompany && currentCompany.length > 2 && comp.includes(currentCompany.substring(0, 8))) {
      categories.push({
        category: "professional_relation",
        subcategory: "Collègue même entreprise",
        confidence: "high",
        reason: `Actif au sein de la même entreprise que le candidat : ${rawComp}`
      });
      connectionPoints.push(`Même entreprise : ${rawComp}`);
      networkingRelevance.push({
        type: "Collègue",
        pillar: "Synergie Interne",
        context: `Actif chez ${rawComp}`,
        recommendation: "Échanger sur les opportunités internes, la culture d'entreprise et les passerelles de mobilité.",
        confidence: "high",
        reason: `Même entreprise actuelle (${rawComp})`
      });
    } else if (isManager || isExecutive) {
      categories.push({
        category: "professional_relation",
        subcategory: "Mentor potentiel / Décideur",
        confidence: "medium",
        reason: "Position de direction ou de management pouvant offrir des conseils stratégiques"
      });
      networkingRelevance.push({
        type: "Décideur",
        pillar: "Leadership & Conseil",
        context: "Cadre dirigeant ou responsable d'équipe",
        recommendation: "Approche orientée conseil métier, veille stratégique et vision du secteur.",
        confidence: "medium",
        reason: "Position de direction ou d'encadrement"
      });
    }

    // --- 8. INTÉRÊT RÉSEAU ---
    if (isTargetSector) {
      networkingRelevance.push({
        type: "Opportunité professionnelle",
        pillar: "Secteur Cible",
        context: `Écosystème ${detectedSector}`,
        recommendation: `Acteur du secteur ${detectedSector} à mobiliser pour des partages de tendances et opportunités de stage/alternance.`,
        confidence: "high",
        reason: `Évolue dans le secteur ciblé (${detectedSector})`
      });
    }
    if (networkingRelevance.length === 0) {
      networkingRelevance.push({
        type: "Networking",
        pillar: "Réseau Professionnel",
        context: "Contact de l'écosystème étendu",
        recommendation: "Entretenir la relation et maintenir une veille active sur les évolutions réciproques.",
        confidence: "medium",
        reason: "Contact professionnel dans l'écosystème"
      });
    }

    // Primary category derivation
    const primaryCat = computePrimaryCategory(categories, isRecruiter ? "recruiter" : isAlumniLink ? "alumni" : isFinanceOrBanking ? "sector_pro" : isStudent ? "student" : isEducationStaff ? "other_pro" : "other");

    // Relevance score computation
    if (primaryCat === "recruiter" && isTargetSector) relevanceScore = 95;
    else if (primaryCat === "alumni" && isTargetSector) relevanceScore = 96;
    else if (primaryCat === "alumni") relevanceScore = 90;
    else if (primaryCat === "recruiter") relevanceScore = 88;
    else if (primaryCat === "sector_pro") relevanceScore = 85;
    else if (isManager || isExecutive) relevanceScore = 82;
    else if (primaryCat === "student") relevanceScore = 65;
    else relevanceScore = 55;

    // Summary sentence
    const roleDesc = isRecruiter ? "Recruteur RH" : isExecutive ? "Dirigeant" : isManager ? "Manager" : "Professionnel";
    const compDesc = rawComp ? `chez ${rawComp}` : "";
    const sectorDesc = detectedSector !== "Secteur tertiaire" ? `dans le secteur ${detectedSector}` : "";
    const summary = `${roleDesc} (${rawJob}) ${compDesc} ${sectorDesc}. Contact à forte valeur d'échange pour votre parcours.`.replace(/\s+/g, " ").trim();

    return {
      id: c.id,
      fullName: name,
      normalizedJobTitle: normalizedJobTitle || rawJob || "Professionnel",
      category: primaryCat,
      categories,
      professionalProfile: {
        currentFunction: rawJob || "Professionnel",
        level: isExecutive ? "C-Level" : isManager ? "Manager" : isSenior ? "Senior" : isStudent ? "Étudiant / Alternant" : "Confirmé",
        sector: detectedSector,
        company: rawComp || "Organisation",
        isTargetSector
      },
      pastCompanies: [],
      education: academicPath ? [academicPath] : [],
      companySector: detectedSector,
      networkingRelevance,
      summary,
      relevanceScore,
      connectionPoints: connectionPoints.length > 0 ? connectionPoints : ["Contact importé LinkedIn"],
      academicPath,
      previousCompanies: []
    };
  });
}

/**
 * Normalizes and comprehensively enriches a list of imported LinkedIn contacts
 * using Gemini with full multidimensional classification across all 8 dimensions,
 * confidence ratings, justifications, and deterministic heuristic fallback.
 */
export async function analyzeLinkedInContacts(
  rawContacts: RawLinkedInContactInput[],
  candidateProfile: CandidateProfile
): Promise<AnalyzedLinkedInContact[]> {
  if (!rawContacts || rawContacts.length === 0) return [];

  const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!key) {
    return analyzeWithHeuristics(rawContacts, candidateProfile);
  }

  const prompt = `
    Tu es le moteur de classification multidimensionnelle et d'enrichissement réseau de NACORA, plateforme d'accélération de carrière spécialisée en Banque, Finance, Gestion de Patrimoine et FinTech.

    OBJECTIF :
    Pour chaque contact importé depuis LinkedIn, produis une analyse EXTRÊMEMENT PRÉCISE et MULTIDIMENSIONNELLE.
    UN CONTACT NE DOIT PLUS ÊTRE PLACÉ DANS UNE SEULE CATÉGORIE.
    Un contact peut et DOIT avoir plusieurs catégories et sous-catégories simultanées s'il remplit les critères.
    Exemple : Une personne peut être simultanément :
    - Alumni (Même école)
    - Professionnel du secteur ciblé (Banque / Finance)
    - Manager (Niveau)
    - Recruteur potentiel
    - Enseignant / Cadre pédagogique

    RÈGLES STRICTES DE VÉRITÉ :
    - Ne JAMAIS inventer une expérience, une école, un diplôme, un poste, une entreprise ou une compétence.
    - Base chaque classification UNIQUEMENT sur les faits réellement présents dans l'intitulé, l'entreprise ou l'historique disponible.
    - Pour chaque catégorie attribuée, renseigne obligatoirement un niveau de confiance ("high" | "medium" | "low") et une justification courte ("reason").

    PROFIL DU CANDIDAT (POUR LA COMPARAISON) :
    - Nom : ${candidateProfile.fullName || "Candidat"}
    - Situation actuelle / Écoles : ${candidateProfile.currentSituation || "Étudiant en BUT TC à l'IUT Clermont Auvergne (Montluçon)"}
    - Alternance actuelle : ${candidateProfile.currentAlternance || "Crédit Agricole"}
    - Masters ciblés : ${(candidateProfile.targetMasters || []).join(", ") || "Finance / Gestion de patrimoine / Fintech"}
    - Secteurs visés : ${(candidateProfile.targetSectors || []).join(", ") || "Banque, Finance, FinTech, Patrimoine"}
    - Entreprises ciblées : ${(candidateProfile.targetCompanies || []).join(", ") || "Revolut, Trade Republic, Finary, Qonto, BNP Paribas, Société Générale"}
    - Compétences clés : ${(candidateProfile.skills || []).join(", ")}

    LES 8 DIMENSIONS D'ANALYSE INDÉPENDANTES :
    1. STATUT / PARCOURS : "Étudiant", "Alternant", "Stagiaire", "Jeune diplômé", "Diplômé", "Doctorant", "Chercheur", "Enseignant", "Professeur", "Responsable pédagogique", "Alumni".
       Attention : Ne confonds JAMAIS un enseignant ou cadre d'école avec un étudiant !
    2. RECRUTEMENT / RH : "Recruteur", "Talent Acquisition", "Campus Recruiter", "Recruitment Manager", "HR", "HR Manager", "HR Business Partner", "Talent Manager", "Employer Branding", "Direction RH".
       Attention ABSOLUE : Un conseiller bancaire, chargé de clientèle, banquier privé ou conseiller en agence N'EST PAS un recruteur ni un RH ! Ne classe JAMAIS un conseiller financier/bancaire dans "recruitment". Classe-le dans "Finance & Banque" (Fonction) et "Banque & Services financiers" (Secteur).
       Ne classe PAS non plus une personne en marketing ou ingénierie comme recruteur simplement parce qu'elle mentionne "Talent Program".
    3. FONCTION PROFESSIONNELLE : "Finance & Banque", "Gestion de Patrimoine", "Assurance", "FinTech", "Audit & Comptabilité", "Commercial & Sales", "Marketing & Communication", "Tech, Data & Produit", "Conseil & Stratégie", "Direction & Management", "Juridique", "Opérations".
    4. NIVEAU / SENIORITÉ : "Junior", "Confirmé", "Senior", "Manager", "Director", "Executive", "C-Level / Fondateur", "Partner".
    5. SECTEUR D'ACTIVITÉ : "Banque & Services financiers", "Gestion de Patrimoine", "FinTech & Néo-finance", "Assurance", "Conseil", "Tech & SaaS", "Enseignement Supérieur", etc. Indique si le secteur correspond aux secteurs ciblés par le candidat ("isTargetSector": true|false).
    6. ALUMNI / RELATION ACADÉMIQUE : Évalue si le contact provient du même établissement (${candidateProfile.currentSituation || "IUT Clermont Auvergne / UCA"}). Règle stricte : Ne jamais déclarer "Alumni" sans correspondance fiable.
    7. RELATION PROFESSIONNELLE : "Collègue même entreprise" (si même entreprise que l'alternance du candidat), "Ancien collègue", "Manager", "Partenaire", "Mentor potentiel".
    8. INTÉRÊT RÉSEAU : "Recrutement", "Opportunité professionnelle", "Alumni", "Conseil carrière", "Mentor potentiel", "Networking", "Entreprise ciblée".

    FORMAT JSON STRICT ATTENDU (un tableau d'objets) :
    [
      {
        "fullName": "Nom du contact",
        "normalizedJobTitle": "Titre professionnel clarifié",
        "professionalProfile": {
          "currentFunction": "Fonction actuelle",
          "level": "Junior | Confirmé | Senior | Manager | Director | C-Level | Fondateur",
          "sector": "Secteur",
          "company": "Entreprise actuelle",
          "isTargetSector": true
        },
        "categories": [
          {
            "category": "status | recruitment | professional_function | seniority | sector | academic | professional_relation | networking",
            "subcategory": "Libellé de la sous-catégorie",
            "confidence": "high | medium | low",
            "reason": "Explication factuelle basée sur le titre ou l'entreprise"
          }
        ],
        "pastCompanies": [],
        "education": [],
        "companySector": "Secteur de l'entreprise",
        "networkingRelevance": [
          {
            "type": "Recrutement | Alumni | Opportunité professionnelle | Networking | Conseil carrière",
            "pillar": "Axe stratégique (ex: Recrutement RH, Réseau Alumni, Secteur Cible, Mentorat)",
            "context": "Contexte précis de l'intérêt réseau avec ce contact",
            "recommendation": "Conseil d'action concret pour entrer en contact",
            "confidence": "high | medium | low",
            "reason": "Justification"
          }
        ],
        "summary": "Synthèse professionnelle en 1 ou 2 phrases percutantes",
        "relevanceScore": 88,
        "connectionPoints": ["Point 1", "Point 2"],
        "academicPath": "Établissement si identifiable ou vide"
      }
    ]

    Contacts à analyser :
    ${JSON.stringify(rawContacts.map(c => ({
      id: c.id,
      fullName: c.fullName,
      jobTitle: c.jobTitle,
      companyName: c.companyName,
      linkedInUrl: c.linkedInUrl,
      email: c.email,
      connectedOn: c.connectedOn
    })))}
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
      let cleanText = text.trim();
      if (cleanText.startsWith("```json")) cleanText = cleanText.replace(/^```json/, "").replace(/```$/, "").trim();
      else if (cleanText.startsWith("```")) cleanText = cleanText.replace(/^```/, "").replace(/```$/, "").trim();

      const parsed = JSON.parse(cleanText);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return rawContacts.map((c, idx) => {
          const match = parsed[idx] || parsed.find((p: any) => p.fullName === c.fullName);
          if (match) {
            const rawCategories: ContactCategoryItem[] = Array.isArray(match.categories) ? match.categories.map((cat: any) => ({
              category: cat.category || "other",
              subcategory: cat.subcategory || "Général",
              confidence: (["high", "medium", "low"].includes(cat.confidence) ? cat.confidence : "medium") as any,
              reason: cat.reason || "Classification identifiée"
            })) : [];

            // Compute primary category for backwards compatibility
            const primaryCat = computePrimaryCategory(rawCategories, "other_pro");

            return {
              id: c.id,
              fullName: match.fullName || c.fullName,
              normalizedJobTitle: match.normalizedJobTitle || c.jobTitle || "Professionnel",
              category: primaryCat,
              categories: rawCategories,
              professionalProfile: {
                currentFunction: match.professionalProfile?.currentFunction || c.jobTitle || "Professionnel",
                level: match.professionalProfile?.level || "Confirmé",
                sector: match.professionalProfile?.sector || match.companySector || "Secteur tertiaire",
                company: match.professionalProfile?.company || c.companyName || "Organisation",
                isTargetSector: Boolean(match.professionalProfile?.isTargetSector)
              },
              pastCompanies: Array.isArray(match.pastCompanies) ? match.pastCompanies : [],
              education: Array.isArray(match.education) ? match.education : (match.academicPath ? [match.academicPath] : []),
              companySector: match.companySector || match.professionalProfile?.sector || "Secteur tertiaire",
              networkingRelevance: Array.isArray(match.networkingRelevance) && match.networkingRelevance.length > 0 ? match.networkingRelevance.map((nr: any) => ({
                type: nr.type || "Networking",
                pillar: nr.pillar || nr.type || "Opportunité Réseau",
                context: nr.context || nr.reason || `Relation professionnelle (${c.companyName || "Organisation"})`,
                recommendation: nr.recommendation || "Échanger sur votre parcours et identifier des synergies mutuelles.",
                confidence: (["high", "medium", "low"].includes(nr.confidence) ? nr.confidence : "medium") as any,
                reason: nr.reason || nr.context || "Contact pertinent pour votre développement professionnel"
              })) : [
                {
                  type: "Networking",
                  pillar: "Réseau Professionnel",
                  context: `Professionnel chez ${c.companyName || "Entreprise"}`,
                  recommendation: "Établir un premier contact professionnel pour développer votre réseau.",
                  confidence: "medium",
                  reason: "Contact réseau pertinent"
                }
              ],
              summary: match.summary || `${c.fullName} - ${c.jobTitle} chez ${c.companyName}`,
              relevanceScore: typeof match.relevanceScore === "number" ? match.relevanceScore : 75,
              connectionPoints: Array.isArray(match.connectionPoints) && match.connectionPoints.length > 0
                ? match.connectionPoints 
                : ["Contact importé LinkedIn"],
              academicPath: match.academicPath || "",
              previousCompanies: Array.isArray(match.pastCompanies) ? match.pastCompanies : []
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

  // Fallback to deterministic heuristic engine
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
 * Generates a highly personalized outreach message for LinkedIn adhering strictly to the NACORA Networking Framework.
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
  const dummyContact: Contact = {
    id: "temp_outreach",
    fullName: contactName,
    firstName: contactName.split(" ")[0] || contactName,
    lastName: contactName.split(" ").slice(1).join(" ") || "",
    companyId: "",
    companyName: contactCompany,
    jobTitle: contactJob,
    normalizedJobTitle: contactJob,
    category: "sector_pro",
    relevanceScore: 85,
    connectionPoints: connectionPoints,
    previousCompanies: [],
    notes: "",
    createdAt: new Date().toISOString(),
    opportunityTitle: opportunityTitle
  };

  const result = await generateOutreachMessageWithFramework(dummyContact, candidateProfile, {
    targetOpportunityTitle: opportunityTitle,
    channel: format === 'invite' ? 'linkedin' : 'email'
  });

  return result.message;
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
        .map(d => {
          const contentExcerpt = (d as any).content ? `\n    Extrait de contenu :\n    """${((d as any).content || "").substring(0, 1500)}"""` : "";
          return `  * [${d.type}] ${d.title}${contentExcerpt}`;
        })
        .join("\n\n");

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
        specialistRole = "Coach CV & Expert Lettres NACORA";
        specialistInstructions = `
${CV_FRAMEWORK_SYSTEM_PROMPT}

RÔLE OPÉRATIONNEL DANS CETTE DISCUSSION :
- Tu es le Coach CV & Expert Lettres de NACORA.
- Quand le candidat te demande d'analyser, de reformuler ou d'optimiser une expérience, un projet ou un CV :
  1. Applique scrupuleusement la règle anti-invention.
  2. Structure les puces au format [VERBE D'ACTION FORT] + [CONTEXTE OPÉRATIONNEL] + [RÉSULTAT CHIFFRÉ (si fourni)].
  3. Ajoute la ligne obligatoire de compétences en italique (*Compétences transférables : ...*).
  4. Si un résultat mesurable ou un chiffre manque, pose une question de précision bienveillante plutôt que d'inventer.
`;
        break;

      case "networking":
        specialistRole = "Stratège Réseau NACORA";
        specialistInstructions = `
${NETWORKING_FRAMEWORK_SYSTEM_PROMPT}

RÔLE OPÉRATIONNEL DANS CETTE DISCUSSION :
Tu es le Stratège Réseau & LinkedIn de NACORA.
Quand le candidat te sollicite pour une prise de contact, une recommandation de profil à contacter, un choix de canal ou une relance :
1. Applique scrupuleusement la méthodologie de référence NACORA (Templates 1 à 4 et Relances 1 à 3).
2. Applique les règles de tutoiement (juniors/stagiaires) vs vouvoiement (seniors/managers).
3. Ne propose JAMAIS d'inventer un lien, une actualité ou un résultat non vérifié.
4. Explique pourquoi tu recommandes un template spécifique et propose directement le message prêt à envoyer.
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

Directives de réponse (STYLE CLAUDE & CONCISION MAXIMALE) :
- Tu t'adresses directement à ${candidateProfile.fullName || "le candidat"}.
- SOIS EXTRÊMEMENT CONCIS ET DIRECT : Maximum 3 à 4 phrases ou puces courtes par réponse. Pas de longs discours, va droit à l'essentiel.
- Évite les préambules inutiles. Zéro blabla.
- N'utilise pas de titres Markdown encombrants (#). Privilégie le texte direct, le gras et des puces courtes.
- RÈGLE ABSOLUE POUR LES ACTIONS : À la toute fin de CHAQUE réponse, tu DOIS obligatoirement inclure des boutons d'actions rapides sous la forme [ACTIONS: "..." | "..."] qui sont 100% personnalisés et directement liés au sujet exact dont tu viens de parler (propositions de question-réponse enchaînées pour creuser, rédiger ou simuler la suite). Jamais de suggestions génériques.
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

/**
 * Lit et extrait les informations d'un CV (et éventuellement d'un profil LinkedIn) sous forme de données structurées JSON
 */
export async function parseCV(cvText: string, linkedinText?: string): Promise<any> {
  try {
    const ai = getAi();
    const isMultiSource = Boolean(linkedinText && linkedinText.trim().length > 10);
    
    const prompt = `
Tu es un expert mondial en extraction ATS, vérification de CV et structuration de profils professionnels haut de gamme.
${isMultiSource ? "Tu disposes de deux sources d'informations : 1) Le CV principal, 2) Le profil / export LinkedIn." : "Analyse le texte du CV ci-dessous."}
Extrait TOUTES les informations réelles sans omission sous la forme d'un objet JSON strict respectant la structure ci-dessous.

RÈGLES ABSOLUES ET CONSIGNES DE FIDÉLITÉ :
1. NE JAMAIS RÉSUMER NI COMPRESSER LES MISSIONS : Si une expérience contient 8 bullet points ou missions dans le document source, conserve les 8 éléments distincts dans le tableau "missions". Ne transforme JAMAIS plusieurs missions en une seule phrase générique.
2. SÉPARATION MISSIONS vs RÉALISATIONS / KPI :
   - "missions" : les tâches et responsabilités régulières.
   - "achievements" et "kpis" : les résultats concrets, chiffres, pourcentages, volumes, montants (€), nombres de clients, objectifs atteints. N'invente JAMAIS un chiffre.
3. DÉTECTION EXHAUSTIVE DES CERTIFICATIONS ET TESTS STANDARDISÉS :
   - Recherche les certifications dans TOUT le document (y compris dans les rubriques Langues, Formations, En-tête, Résumé, Compétences).
   - Détecte obligatoirement tous les tests et examens officiels : TOEIC, TAGE MAGE, TOEFL, IELTS, Cambridge, AMF, CFA, GMAT, GRE, Linguaskill, Google Analytics, etc.
   - Pour le TOEIC (ex: "Anglais B2 - TOEIC 745/990") : Renseigne à la fois l'objet dans "languages" ET un objet complet dans "certifications" avec name: "TOEIC", score: "745/990", maxScore: "990".
   - Pour le TAGE MAGE (ex: "TAGE MAGE 337/600") : Crée une certification avec name: "TAGE MAGE", score: "337/600", maxScore: "600".
4. FIDÉLITÉ ET NON-HALLUCINATION : N'invente AUCUNE information absente. Si un champ n'est pas mentionné, laisse "" ou [].
${isMultiSource ? "5. CONFLITS & SOURCES : Compare le CV et LinkedIn. Indique la source principale pour chaque élément ('cv', 'linkedin', ou 'combined'). Si une date ou un poste diffère entre le CV et LinkedIn, note le conflit dans un champ 'conflictNote'." : ""}

FORMAT JSON ATTENDU STRICT :
{
  "parsed": {
    "identity": {
      "firstName": "Prénom du candidat",
      "lastName": "Nom du candidat",
      "fullName": "Prénom Nom",
      "email": "Email",
      "phone": "Téléphone",
      "title": "Titre professionnel principal",
      "bio": "Synthèse ou résumé du profil",
      "city": "Ville",
      "country": "Pays",
      "linkedInUrl": "Lien LinkedIn",
      "githubUrl": "Lien GitHub",
      "portfolioUrl": "Lien portfolio / site web"
    },
    "experiences": [
      {
        "role": "Intitulé exact du poste",
        "company": "Nom de l'entreprise",
        "location": "Ville, Pays",
        "contractType": "CDI | CDD | Alternance | Stage | Bénévolat | Autre",
        "startDate": "YYYY-MM ou YYYY",
        "endDate": "YYYY-MM ou YYYY ou vide",
        "isCurrent": false,
        "description": "Description générale ou paragraphe de présentation de l'expérience",
        "missions": ["Mission détaillée 1", "Mission détaillée 2", "Mission détaillée 3"],
        "responsibilities": ["Responsabilité principale 1", ...],
        "achievements": ["Réalisation concrète 1", ...],
        "kpis": ["Chiffre clé ou résultat mesurable 1 (ex: 40 appels/jour, 15 RDV)", ...],
        "skills": ["Compétence mobilisée 1", ...],
        "tools": ["Outil / logiciel utilisé 1", ...],
        "sector": "Secteur d'activité",
        "context": "Contexte de l'équipe ou du service",
        "source": "cv"
      }
    ],
    "educations": [
      {
        "school": "Nom de l'établissement / Université / École",
        "degree": "Intitulé du diplôme ou titre obtenu",
        "domain": "Domaine d'études ou spécialité",
        "location": "Ville, Pays",
        "startDate": "YYYY",
        "endDate": "YYYY",
        "isCurrent": false,
        "description": "Détails sur les options, projets académiques ou mentions"
      }
    ],
    "hardSkills": [
      {
        "name": "Nom de la compétence",
        "level": "Débutant" | "Intermédiaire" | "Avancé" | "Expert",
        "category": "Commercial" | "Finance" | "Gestion" | "Marketing" | "Technique" | "Général"
      }
    ],
    "toolsAndSoftware": ["Microsoft Excel", "Salesforce CRM", "Canva", ...],
    "softSkills": ["Rigueur", "Esprit d'équipe", "Aisance relationnelle", ...],
    "languages": [
      {
        "language": "Nom de la langue",
        "level": "B2",
        "certification": "TOEIC Listening & Reading",
        "score": "745/990"
      }
    ],
    "certifications": [
      {
        "name": "Intitulé de la certification ou du test (ex: TOEIC, TAGE MAGE, AMF)",
        "issuer": "Organisme émetteur (ex: ETS Global, FNEGE, AMF)",
        "date": "YYYY",
        "score": "Score obtenu (ex: 745/990, 337/600)",
        "maxScore": "Score maximum (ex: 990, 600)",
        "level": "Niveau (ex: B2, Avancé)",
        "credentialId": "Identifiant du certificat",
        "verificationUrl": "URL de vérification si présente"
      }
    ],
    "projects": [
      {
        "name": "Nom du projet",
        "description": "Description du projet",
        "role": "Rôle dans le projet",
        "date": "YYYY",
        "technologies": ["Outil 1", "Outil 2"],
        "results": "Résultats ou note obtenue"
      }
    ],
    "volunteerWork": [
      {
        "organization": "Nom de l'association",
        "role": "Rôle / Responsabilité",
        "dates": "YYYY - YYYY",
        "description": "Missions bénévoles accomplies",
        "achievements": "Réalisations marquantes"
      }
    ],
    "interests": ["Centre d'intérêt 1", ...]
  }
}

${isMultiSource ? `Source 1 - CV :\n${cvText}\n\nSource 2 - LinkedIn :\n${linkedinText}` : `Texte du CV :\n${cvText}`}
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
        const json = JSON.parse(text);
        if (json && json.parsed) {
          return json;
        }
      } catch (err: any) {
        console.warn(`[parseCV] Échec du modèle ${model}, tentative suivante...`, err?.message);
      }
    }

    return { parsed: null };
  } catch (err) {
    console.error("[parseCV] Erreur d'analyse:", err);
    return { parsed: null };
  }
}

// ============================================================================
// DAILY BRIEF IA - GÉNÉRATION SUR MESURE & FALLBACK LOCAL
// ============================================================================

export interface DailyBriefPayload {
  profile: CandidateProfile;
  opportunities: Opportunity[];
  contacts: Contact[];
  calendarEvents: CalendarEvent[];
  documentsCount?: number;
}

export interface DailyBriefAction {
  id: string;
  title: string;
  description: string;
  actionType: "opportunity" | "contact" | "profile" | "calendar" | "hub_ia";
  targetId?: string;
  priority: "high" | "medium" | "low";
  buttonText: string;
}

export interface DailyBriefData {
  summaryText: string;
  actions: DailyBriefAction[];
  generatedAt: string;
}

export function generateLocalDailyBrief(payload: DailyBriefPayload): DailyBriefData {
  const { profile, opportunities, contacts, calendarEvents } = payload;
  
  const name = profile.fullName ? profile.fullName.split(" ")[0] : "Candidat";
  const currentAlternance = (profile.currentAlternance || "").trim();

  // Raw target companies with fallback
  const rawTargetCompanies = (profile.targetCompanies && profile.targetCompanies.length > 0)
    ? profile.targetCompanies
    : ["Revolut", "Trade Republic", "Finary", "Qonto", "BNP Paribas", "Société Générale"];

  // Helper to check if a company is the current employer (Crédit Agricole, etc.)
  const isCurrentEmployer = (companyName?: string) => {
    if (!companyName) return false;
    const compLower = companyName.toLowerCase().trim();
    const currLower = currentAlternance.toLowerCase().trim();
    if (compLower.includes("crédit agricole") || compLower.includes("credit agricole")) return true;
    if (currLower.length > 3 && compLower.includes(currLower)) return true;
    return false;
  };

  // Exclude current employer from target companies
  const targetCompanies = rawTargetCompanies.filter(tc => !isCurrentEmployer(tc));

  // Helper to check if a company matches target companies
  const isTargetCompany = (companyName?: string) => {
    if (!companyName) return false;
    const compLower = companyName.toLowerCase().trim();
    return targetCompanies.some(tc => {
      const tcLower = tc.toLowerCase().trim();
      return compLower.includes(tcLower) || tcLower.includes(compLower);
    });
  };

  // Helper to check high responsibility job title (CEO, Founder, Director, Manager, Recruiter, etc.)
  const isHighResponsibility = (jobTitle?: string) => {
    if (!jobTitle) return false;
    const jobLower = jobTitle.toLowerCase().trim();
    return (
      jobLower.includes("ceo") ||
      jobLower.includes("fondateur") ||
      jobLower.includes("founder") ||
      jobLower.includes("directeur") ||
      jobLower.includes("director") ||
      jobLower.includes("head") ||
      jobLower.includes("manager") ||
      jobLower.includes("vp") ||
      jobLower.includes("président") ||
      jobLower.includes("president") ||
      jobLower.includes("lead") ||
      jobLower.includes("recruteur") ||
      jobLower.includes("rh") ||
      jobLower.includes("talent")
    );
  };

  // Classify and rank contacts based on strict priorities
  const rankedContacts = (contacts || []).map(c => {
    const comp = c.companyName || "";
    const job = c.normalizedJobTitle || c.jobTitle || "";
    const currEmp = isCurrentEmployer(comp);
    const targetComp = isTargetCompany(comp);
    const highResp = isHighResponsibility(job);
    const recruiterOrAlumni = c.category === "recruiter" || c.category === "alumni";

    let priorityScore = 100;
    if (currEmp) {
      priorityScore = -100; // Exclude current employer from job search priorities
    } else if (targetComp && highResp) {
      priorityScore = 1000 + (c.relevanceScore || 50); // Top Priority: High responsibility at target company
    } else if (targetComp) {
      priorityScore = 800 + (c.relevanceScore || 50);  // Priority 1: Contact at target company
    } else if (recruiterOrAlumni) {
      priorityScore = 600 + (c.relevanceScore || 50);  // Priority 2: Recruiter/Alumni
    } else if (c.category === "sector_pro") {
      priorityScore = 400 + (c.relevanceScore || 50);  // Priority 3: Sector pro
    } else {
      priorityScore = 100 + (c.relevanceScore || 0);   // Priority 4: Standard
    }

    return {
      contact: c,
      priorityScore,
      targetComp,
      highResp,
      currEmp
    };
  }).sort((a, b) => b.priorityScore - a.priorityScore);

  const topValidContacts = rankedContacts.filter(rc => rc.priorityScore > 0);

  // Active opportunities analysis
  const stagnantOpps = opportunities.filter(o => o.status === "to_prepare" || o.status === "to_apply");
  const upcomingInterviews = calendarEvents.filter(e => e.type === "interview" && !e.completed);
  const upcomingEvents = calendarEvents.filter(e => !e.completed);
  const profileScore = profile.profileCompletionScore || 80;

  // Build Narrative Summary
  let summary = `Bonjour ${name} ! `;
  const sentences: string[] = [];

  const topTargetCompanyContact = topValidContacts.find(rc => rc.targetComp);
  if (topTargetCompanyContact) {
    const c = topTargetCompanyContact.contact;
    const jobStr = c.normalizedJobTitle || c.jobTitle || "";
    if (topTargetCompanyContact.highResp) {
      sentences.push(`Un contact à très fort impact stratégique (${jobStr} chez ${c.companyName}) a été identifié dans tes entreprises ciblées. C'est le moment idéal pour engager le dialogue !`);
    } else {
      sentences.push(`Tu as un contact actif (${c.fullName} chez ${c.companyName}) dans l'une de tes entreprises ciblées.`);
    }
  }

  if (stagnantOpps.length > 0) {
    const oppNames = stagnantOpps.slice(0, 2).map(o => o.companyName).join(" et ");
    sentences.push(`Tu as ${stagnantOpps.length} candidature${stagnantOpps.length > 1 ? 's' : ''} en attente (${oppNames}).`);
  } else if (opportunities.length > 0) {
    sentences.push(`Tes candidatures en cours sont parfaitement à jour.`);
  }

  if (upcomingInterviews.length > 0) {
    sentences.push(`Un entretien approche dans ton agenda, prépare tes réponses avec la méthode STAR.`);
  } else if (sentences.length < 2 && profileScore < 100) {
    sentences.push(`Compléter la rubrique Objectifs de ton profil affinera l'analyse de NACORA AI.`);
  }

  if (sentences.length === 0) {
    sentences.push(`Bienvenue sur ton tableau de bord. NACORA AI est prêt à analyser tes prochaines démarches.`);
  }

  summary += sentences.join(" ");

  // Build Actions List
  const actions: DailyBriefAction[] = [];

  // Action 1: Top High-Value Contact at Target Company
  if (topValidContacts.length > 0) {
    const topItem = topValidContacts[0];
    const c = topItem.contact;
    const jobStr = c.normalizedJobTitle || c.jobTitle || "Contact";
    
    actions.push({
      id: "act_cont_" + c.id,
      title: topItem.highResp 
        ? `Échanger avec ${c.fullName} (${jobStr} chez ${c.companyName})`
        : `Contacter ${c.fullName} chez ${c.companyName}`,
      description: topItem.highResp
        ? `Poste à haute responsabilité (${jobStr}) au sein de ton entreprise cible ${c.companyName}. Levier majeur pour une recommandation.`
        : `Contact réseau dans ton entreprise cible ${c.companyName}. Score de pertinence : ${c.relevanceScore || 90}%.`,
      actionType: "contact",
      targetId: c.id,
      priority: "high",
      buttonText: "Contacter le profil"
    });
  }

  // Action 2: Second Target Company Contact (if available) or Top Opportunity
  if (topValidContacts.length > 1 && topValidContacts[1].targetComp) {
    const c2 = topValidContacts[1].contact;
    const jobStr2 = c2.normalizedJobTitle || c2.jobTitle || "Contact";
    actions.push({
      id: "act_cont_" + c2.id,
      title: `Échanger avec ${c2.fullName} chez ${c2.companyName}`,
      description: `Contact chez ${c2.companyName} (${jobStr2}), entreprise ciblée dans tes préférences.`,
      actionType: "contact",
      targetId: c2.id,
      priority: "high",
      buttonText: "Contacter le profil"
    });
  } else if (stagnantOpps.length > 0) {
    const opp = stagnantOpps[0];
    actions.push({
      id: "act_opp_" + opp.id,
      title: `Préparer la candidature chez ${opp.companyName}`,
      description: `Poste "${opp.title}" actuellement en statut "${opp.status === 'to_prepare' ? 'À préparer' : 'À postuler'}".`,
      actionType: "opportunity",
      targetId: opp.id,
      priority: "high",
      buttonText: "Ouvrir l'opportunité"
    });
  }

  // Action 3: Upcoming Interview or Calendar Event
  if (upcomingInterviews.length > 0) {
    const ev = upcomingInterviews[0];
    actions.push({
      id: "act_cal_" + ev.id,
      title: `Préparer l'entretien : ${ev.title}`,
      description: `Échéance fixée au ${new Date(ev.date).toLocaleDateString("fr-FR")}. Entraîne-toi avec le Coach IA.`,
      actionType: "calendar",
      targetId: ev.id,
      priority: "high",
      buttonText: "S'entraîner avec l'IA"
    });
  } else if (upcomingEvents.length > 0 && actions.length < 3) {
    const ev = upcomingEvents[0];
    actions.push({
      id: "act_cal_" + ev.id,
      title: `Échéance proche : ${ev.title}`,
      description: `Prévue pour le ${new Date(ev.date).toLocaleDateString("fr-FR")}.`,
      actionType: "calendar",
      targetId: ev.id,
      priority: "medium",
      buttonText: "Consulter l'agenda"
    });
  }

  // Action 4: Profile Completion or Hub IA
  if (actions.length < 4) {
    if (profileScore < 100) {
      actions.push({
        id: "act_prof_1",
        title: "Compléter la rubrique Objectifs de ton profil",
        description: `Dossier complété à ${profileScore}%. Renseigne tes entreprises et métiers cibles pour affiner les recommandations.`,
        actionType: "profile",
        priority: profileScore < 80 ? "high" : "low",
        buttonText: "Mettre à jour mon profil"
      });
    } else {
      actions.push({
        id: "act_hub_1",
        title: "Préparer un message d'approche personnalisé",
        description: "Utilise le module Réseau & Contacts pour structurer ton accroche et contacter tes profils cibles.",
        actionType: "hub_ia",
        priority: "medium",
        buttonText: "Accéder au module Coaching"
      });
    }
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

  return {
    summaryText: summary,
    actions: actions.slice(0, 4),
    generatedAt: `Généré le ${dateStr} à ${timeStr}`
  };
}

export async function generateDailyBrief(payload: DailyBriefPayload): Promise<DailyBriefData> {
  try {
    const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!key) {
      return generateLocalDailyBrief(payload);
    }

    const { profile, opportunities, contacts, calendarEvents } = payload;

    const currentAlternance = (profile.currentAlternance || "").trim();
    const rawTargetCompanies = (profile.targetCompanies && profile.targetCompanies.length > 0)
      ? profile.targetCompanies
      : ["Revolut", "Trade Republic", "Finary", "Qonto", "BNP Paribas", "Société Générale"];

    // Filter out current employer (Crédit Agricole) from target companies list
    const targetCompanies = rawTargetCompanies.filter(tc => {
      const tcLower = tc.toLowerCase().trim();
      return !tcLower.includes("crédit agricole") && !tcLower.includes("credit agricole") &&
             (currentAlternance.length === 0 || !currentAlternance.toLowerCase().includes(tcLower));
    });

    const activeOpps = (opportunities || []).map(o => ({
      id: o.id,
      title: o.title,
      company: o.companyName,
      status: o.status,
      updatedAt: o.updatedAt,
      applicationDeadline: o.deadline
    }));

    const relevantContacts = (contacts || []).map(c => ({
      id: c.id,
      name: c.fullName,
      job: c.normalizedJobTitle || c.jobTitle,
      company: c.companyName,
      category: c.category,
      relevanceScore: c.relevanceScore,
      status: c.networkingStatus
    }));

    const events = (calendarEvents || []).map(e => ({
      id: e.id,
      title: e.title,
      date: e.date,
      type: e.type,
      completed: e.completed
    }));

    const prompt = `
Tu es l'agent d'intelligence "Daily Brief" de NACORA.
Croise l'ensemble des données réelles du candidat ci-dessous et génère un Daily Brief synthétique, hyper-personnalisé et orienté action.

PROFIL DU CANDIDAT :
- Nom : ${profile.fullName || "Candidat"}
- Situation : ${profile.currentSituation || "Non spécifiée"}
- EMPLOYEUR / ALTERNANCE ACTUELLE (EXCLURE DES RECHERCHES D'EMPLOI ACTIVE) : ${profile.currentAlternance || "Crédit Agricole Centre France"}
- Objectifs de poste : ${(profile.targetTitles || []).join(", ") || "Finance / Banque"}
- Secteurs visés : ${(profile.targetSectors || []).join(", ")}
- ENTREPRISES CIBLÉES EN PRIORITÉ STRATÉGIQUE : ${targetCompanies.join(", ")}
- Score de complétude du dossier : ${profile.profileCompletionScore || 80}%

OPPORTUNITÉS EN COURS (${activeOpps.length}) :
${JSON.stringify(activeOpps)}

CONTACTS RÉSEAU COMPLETS (${relevantContacts.length}) :
${JSON.stringify(relevantContacts)}

ÉCHÉANCES CALENDRIER (${events.length}) :
${JSON.stringify(events)}

HÉRARCHIE STRICTE DES RÈGLES DE PRIORISATION DES ACTIONS (Ordre décroissant) :

1. PRIORITÉ MAXIMALE (priority: "high") :
   - Tout contact ou opportunité au sein d'une entreprise figurant EXPLICITEMENT dans "ENTREPRISES CIBLÉES EN PRIORITÉ STRATÉGIQUE" (${targetCompanies.join(", ")}).
   - RÈGLE SPÉCIFIQUE IMPÉRATIVE SUR LES CONTACTS À FORTE VALEUR : Tu DOIS obligatoirement croiser la liste des "Entreprises ciblées" avec TOUS les contacts enregistrés. Tout contact occupant un poste à responsabilité (CEO, Fondateur, Directeur, Head of, Manager, Recruteur) au sein d'une entreprise ciblée (notamment Trade Republic, Revolut, Finary, Qonto) DOIT IMPÉRATIVEMENT APPARAÎTRE dans la liste des actions recommandées en Priorité Haute !
   - EXEMPLE CONCRET : Si la base de contacts contient le "CEO de Trade Republic" ou un contact chez "Revolut", il DOIT OBLIGATOIREMENT être l'action #1 ou #2 recommandée avec "priority": "high".

2. PRIORITÉ HAUTE (priority: "high") :
   - Contacts avec un score de pertinence élevé déjà calculé (Recruteurs/RH et Alumni) dans un secteur cible.
   - Candidatures actives en attente de préparation ou de postulation ("to_prepare", "to_apply") chez des entreprises cibles.

3. PRIORITÉ MODÉRÉE (priority: "medium") :
   - Contacts dans le même secteur d'activité (Banque, Fintech, Start-up), sans lien direct avec une entreprise ciblée précise.
   - Échéances de calendrier (entretiens, jalons).

4. PRIORITÉ BASSE OU À EXCLURE (priority: "low" / EXCLUSION) :
   - AVERTISSEMENT DE NON-CIBLAGE : L'entreprise d'alternance actuelle du candidat (${profile.currentAlternance || "Crédit Agricole"}) est son employeur actuel et N'EST PAS une cible de recherche d'emploi active. Un contact chez Crédit Agricole ne doit JAMAIS être mis en avant comme une priorité de réseautage stratégique pour une recherche d'emploi !
   - Contacts dans des entreprises hors cible et sans opportunité active.

INSTRUCTIONS DE GÉNÉRATION DU DAILY BRIEF :
1. "summaryText" : Un texte de synthèse narratif court (2 à 4 phrases maximum) tutoyant le candidat ("Tu..."), stimulant et direct. Fais explicitement référence aux contacts stratégiques identifiés chez tes entreprises ciblées (ex: le CEO de Trade Republic ou les contacts chez Revolut).
2. "actions" : Une liste ordonnée de 2 à 4 actions concrètes et priorisées.
   - "id" : identifiant unique (ex: "act_1")
   - "title" : Libellé clair et valorisant de l'action (ex: "Echanger avec le CEO de Trade Republic", "Contacter le recruteur chez Revolut")
   - "description" : Explication de l'intérêt stratégique (1 phrase)
   - "actionType" : "opportunity" | "contact" | "profile" | "calendar" | "hub_ia"
   - "targetId" : l'identifiant (id) du contact ou de l'opportunité
   - "priority" : "high" | "medium" | "low"
   - "buttonText" : Libellé du bouton (ex: "Contacter le profil", "Ouvrir l'opportunité")

Format JSON strict attendu :
{
  "summaryText": "Texte narratif...",
  "actions": [
    {
      "id": "act_1",
      "title": "Titre action",
      "description": "Description contextuelle",
      "actionType": "contact",
      "targetId": "cont_xxx",
      "priority": "high",
      "buttonText": "Contacter le profil"
    }
  ]
}
`;

    const ai = getAi();
    for (const model of CASCADE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.2
          }
        });

        const text = response.text || "{}";
        const json = JSON.parse(text);
        if (json && json.summaryText && Array.isArray(json.actions)) {
          const now = new Date();
          const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
          const dateStr = now.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

          return {
            summaryText: json.summaryText,
            actions: json.actions,
            generatedAt: `Généré le ${dateStr} à ${timeStr}`
          };
        }
      } catch (err: any) {
        console.warn(`[generateDailyBrief] Modèle ${model} indisponible, tentative suivante...`);
      }
    }

    return generateLocalDailyBrief(payload);
  } catch (err) {
    console.error("[generateDailyBrief] Erreur:", err);
    return generateLocalDailyBrief(payload);
  }
}

/**
 * Parses raw pasted text (LinkedIn lists, contact lists, tables, documents) into structured contacts.
 */
export async function parseContactsFromText(
  text: string,
  candidateProfile: CandidateProfile
): Promise<Array<{
  firstName: string;
  lastName: string;
  fullName: string;
  jobTitle: string;
  companyName: string;
  category: ContactCategory;
  industry?: string;
  location?: string;
  linkedinUrl?: string;
  email?: string;
  phone?: string;
  contactUrl?: string;
  education?: string;
  notes?: string;
  relevanceScore?: number;
  connectionPoints?: string[];
}>> {
  if (!text || !text.trim()) return [];

  const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (key) {
    const prompt = `
      Tu es l'extracteur de contacts intelligent de NACORA, plateforme d'accélération de carrière en Banque, Finance et Gestion de Patrimoine.
      Analyse le texte brut ci-dessous (provenant de profils LinkedIn, de listes de contacts, de documents, de sites web ou de tableaux) et extrait toutes les personnes mentionnées de manière structurée.

      Règles absolues :
      - N'invente JAMAIS aucune information. Si une donnée n'est pas présente, laisse le champ vide ou null.
      - **Consignes globales / Liens communs** : Si le texte contient une instruction indiquant un lien internet ou un portail commun pour tous les contacts (ex: "relier tous les contacts suivants via ce lien [URL]" ou mentionnant un lien global au début ou dans le texte), tu DOIS reporter cette même URL dans le champ 'contactUrl' de **tous** les contacts extraits.
      - Pour la catégorie ("category"), choisis strictement parmi : "recruiter", "alumni", "student", "sector_pro", "other_pro", "other".
      - Ne classe JAMAIS quelqu'un comme "recruiter" ou "RH" à moins qu'il n'exerce explicitement un métier de recrutement/RH.
      - Extrait les champs : firstName, lastName, fullName, jobTitle, company, category, industry, location, linkedinUrl, email, phone, contactUrl (lien internet, URL de portail de contact ou site web vers lequel contacter cette personne lorsque le mail direct n'est pas disponible, y compris le lien global s'il s'applique à tous), education, notes.

      Texte à analyser :
      """
      ${text}
      """

      Réponds UNIQUEMENT sous forme d'un objet JSON valide respectant cette structure exacte :
      {
        "contacts": [
          {
            "firstName": "...",
            "lastName": "...",
            "fullName": "...",
            "jobTitle": "...",
            "company": "...",
            "category": "alumni" | "recruiter" | "student" | "sector_pro" | "other_pro" | "other",
            "industry": "...",
            "location": "...",
            "linkedinUrl": "...",
            "email": "...",
            "phone": "...",
            "contactUrl": "...",
            "education": "...",
            "notes": "..."
          }
        ]
      }
    `;

    const ai = getAi();
    for (const model of CASCADE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.1
          }
        });

        if (response && response.text) {
          let cleanJson = response.text.trim();
          if (cleanJson.startsWith("```json")) cleanJson = cleanJson.replace(/^```json/, "").replace(/```$/, "").trim();
          else if (cleanJson.startsWith("```")) cleanJson = cleanJson.replace(/^```/, "").replace(/```$/, "").trim();

          const parsed = JSON.parse(cleanJson);
          if (parsed && Array.isArray(parsed.contacts)) {
            return parsed.contacts.map((c: any) => {
              const fullName = c.fullName || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Contact importé";
              const firstName = c.firstName || fullName.split(" ")[0] || "";
              const lastName = c.lastName || fullName.split(" ").slice(1).join(" ") || "";
              return {
                firstName,
                lastName,
                fullName,
                jobTitle: c.jobTitle || "Professionnel",
                companyName: c.company || c.companyName || "Entreprise",
                category: c.category || "other_pro",
                industry: c.industry || "",
                location: c.location || "",
                linkedinUrl: c.linkedinUrl || "",
                email: c.email || "",
                phone: c.phone || "",
                contactUrl: c.contactUrl || "",
                education: c.education || "",
                notes: c.notes || "Importé par texte",
                relevanceScore: c.category === "alumni" ? 90 : c.category === "recruiter" ? 85 : 75,
                connectionPoints: ["Importé par texte NACORA"]
              };
            });
          }
        }
      } catch (err) {
        console.info(`[parseContactsFromText] Model ${model} failed, trying next.`);
      }
    }
  }

  // Heuristic Fallback Parser
  return parseContactsWithHeuristics(text);
}

function parseContactsWithHeuristics(text: string) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  
  // Look for global URL in text (e.g. "via ce lien https://..." or standalone URL)
  let globalContactUrl = "";
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const allUrls = text.match(urlRegex) || [];
  if (allUrls.length > 0) {
    const nonLinkedinUrl = allUrls.find(u => !u.toLowerCase().includes("linkedin.com"));
    if (nonLinkedinUrl) {
      globalContactUrl = nonLinkedinUrl;
    } else if (allUrls[0]) {
      globalContactUrl = allUrls[0];
    }
  }

  const contacts = [];
  let currentName = "";
  let currentJob = "";
  let currentCompany = "";
  let currentLinkedIn = "";
  let currentEmail = "";

  for (const line of lines) {
    if (line.toLowerCase().includes("linkedin.com/")) {
      currentLinkedIn = line;
      continue;
    }
    // If line starts with http and isn't the global url already assigned or linkedin
    if (line.startsWith("http") && line !== globalContactUrl) {
      if (!currentLinkedIn && line.toLowerCase().includes("linkedin")) {
        currentLinkedIn = line;
      }
      continue;
    }
    if (line.includes("@")) {
      currentEmail = line;
      continue;
    }

    if (!currentName) {
      currentName = line;
    } else if (!currentJob) {
      currentJob = line;
    } else if (!currentCompany) {
      currentCompany = line;
      const nameParts = currentName.split(" ");
      contacts.push({
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        fullName: currentName,
        jobTitle: currentJob || "Professionnel",
        companyName: currentCompany || "Entreprise",
        category: "other_pro" as ContactCategory,
        linkedinUrl: currentLinkedIn,
        email: currentEmail,
        contactUrl: globalContactUrl || undefined,
        notes: "Importé par texte",
        relevanceScore: 65,
        connectionPoints: ["Importé par texte"]
      });
      currentName = "";
      currentJob = "";
      currentCompany = "";
      currentLinkedIn = "";
      currentEmail = "";
    }
  }

  if (currentName) {
    const nameParts = currentName.split(" ");
    contacts.push({
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" ") || "",
      fullName: currentName,
      jobTitle: currentJob || "Professionnel",
      companyName: currentCompany || "Entreprise",
      category: "other_pro" as ContactCategory,
      linkedinUrl: currentLinkedIn,
      email: currentEmail,
      contactUrl: globalContactUrl || undefined,
      notes: "Importé par texte",
      relevanceScore: 60,
      connectionPoints: ["Importé par texte"]
    });
  }

  if (contacts.length === 0 && text.trim().length > 0) {
    contacts.push({
      firstName: "Contact",
      lastName: "Importé",
      fullName: text.trim().substring(0, 40),
      jobTitle: "Professionnel",
      companyName: "Organisation",
      category: "other" as ContactCategory,
      contactUrl: globalContactUrl || undefined,
      notes: text.trim(),
      relevanceScore: 50,
      connectionPoints: ["Import textuel"]
    });
  }

  return contacts;
}

export interface EnrichedCompanyData {
  sector: string;
  description: string;
  size: string;
  website: string;
  location: string;
  foundingYear: string;
  companyStatus: string;
  geographicPresence: string;
  parentGroup: string;
  revenue: string;
  recentDynamics: string;
  notableClients: string;
  values: string;
  csrCommitment: string;
  distinctions: string;
  hrContactEmail: string;
  careersPageUrl: string;
  metrics: Array<{ label: string; value: string }>;
}

export async function enrichCompanyWithWebSearch(companyName: string): Promise<EnrichedCompanyData> {
  const cleanName = (companyName || "").trim();
  if (!cleanName) {
    return {
      sector: "",
      description: "",
      size: "",
      website: "",
      location: "",
      foundingYear: "",
      companyStatus: "",
      geographicPresence: "",
      parentGroup: "",
      revenue: "",
      recentDynamics: "",
      notableClients: "",
      values: "",
      csrCommitment: "",
      distinctions: "",
      hrContactEmail: "",
      careersPageUrl: "",
      metrics: []
    };
  }

  const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (key) {
    const ai = getAi();
    const prompt = `
      Tu es un analyste de données économiques et financières d'entreprise.
      Effectue une recherche Google approfondie pour trouver les informations factuelles, officielles et réelles sur l'entreprise "${cleanName}".

      RÈGLES STRICTES :
      - Recherche les données réelles en ligne (site officiel, actualités, données financières, effectif, siège, dirigeants).
      - N'INVENTE AUCUNE DONNÉE. Si une information n'est pas publiquement vérifiable ou trouvable, laisse le champ strictement vide ("").
      - Ne génère aucun texte de remplissage, ni de phrases génériques.
      - Les métriques ("metrics") doivent contenir UNIQUEMENT des indicateurs chiffrés ou factuels réels (ex: "Chiffre d'affaires", "Effectif", "Création", "Clients", "Implantations"). Ne mets JAMAIS de fausses métriques comme "Statut: Actif" ou "Donnée synthétique".

      Réponds STRICTEMENT sous la forme d'un objet JSON valide (commençant par { et finissant par }), sans balises markdown :
      {
        "sector": "Secteur d'activité précis ou vide",
        "description": "Synthèse factuelle et claire de l'activité principale et du positionnement (2 à 4 phrases) ou vide",
        "foundingYear": "Année de création exacte (ex: 2015) ou vide",
        "companyStatus": "Statut / Forme juridique (ex: Scale-up, Grand groupe, PME, ETI, Filiale...) ou vide",
        "size": "Effectif réel estimé (ex: 350 salariés, +15 000 collaborateurs) ou vide",
        "geographicPresence": "Présence géographique / pays d'implantation ou vide",
        "parentGroup": "Groupe de rattachement / maison mère si applicable ou vide",
        "revenue": "Chiffre d'affaires ou PNB le plus récent (ex: 150 M€ en 2023) ou vide",
        "recentDynamics": "Événements récents réels (levée de fonds, acquisitions, lancements, résultats) ou vide",
        "notableClients": "Clients ou partenaires clés ou vide",
        "values": "Valeurs ou engagements d'entreprise ou vide",
        "csrCommitment": "Engagements RSE / environnementaux ou vide",
        "distinctions": "Labels, prix ou certifications ou vide",
        "hrContactEmail": "Contact RH ou carrières vérifiable ou vide",
        "careersPageUrl": "URL de la page carrières ou offres ou vide",
        "website": "URL du site officiel ou vide",
        "location": "Siège social (Ville, Pays) ou vide",
        "metrics": [
          { "label": "Nom de la métrique", "value": "Valeur réelle" }
        ]
      }
    `;

    // Priorité aux modèles supportant le Google Search Grounding
    const searchModels = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
    let lastError: any = null;

    for (const model of searchModels) {
      try {
        let responseText = "";
        let webUrlFromGrounding = "";

        // 1. Tentative avec Google Search Grounding (SANS responseMimeType incompatible)
        try {
          console.info(`[enrichCompanyWithWebSearch] Recherche Google en direct avec ${model} pour "${cleanName}"...`);
          const searchResponse = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              tools: [{ googleSearch: {} }],
              temperature: 0.1
            }
          });

          responseText = searchResponse?.text || "";

          // Extraction des sources URLs trouvées par Google Search
          const chunks = searchResponse?.candidates?.[0]?.groundingMetadata?.groundingChunks;
          if (Array.isArray(chunks)) {
            for (const c of chunks) {
              if (c?.web?.uri && !webUrlFromGrounding) {
                webUrlFromGrounding = c.web.uri;
                break;
              }
            }
          }
        } catch (searchToolErr: any) {
          const searchToolMsg = searchToolErr?.message || String(searchToolErr);
          if (searchToolMsg.includes("429") || searchToolMsg.includes("RESOURCE_EXHAUSTED") || searchToolMsg.includes("Quota exceeded")) {
            throw searchToolErr;
          }
          console.info(`[enrichCompanyWithWebSearch] Google Search grounding direct indisponible sur ${model}, essai en mode JSON direct.`);
          
          // 2. Fallback sans outil de recherche (connaissances internes directes du modèle)
          const directResponse = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              temperature: 0.1
            }
          });
          responseText = directResponse?.text || "";
        }

        if (responseText) {
          let clean = responseText.trim();
          if (clean.startsWith("```json")) clean = clean.replace(/^```json/, "").replace(/```$/, "").trim();
          else if (clean.startsWith("```")) clean = clean.replace(/^```/, "").replace(/```$/, "").trim();

          const firstBrace = clean.indexOf("{");
          const lastBrace = clean.lastIndexOf("}");
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            clean = clean.substring(firstBrace, lastBrace + 1);
          }

          const parsed = JSON.parse(clean);

          // Nettoyage strict des métriques factuelles (élimination de tout placeholder bidon)
          const validMetrics = (Array.isArray(parsed.metrics) ? parsed.metrics : [])
            .filter((m: any) => {
              if (!m || typeof m !== "object") return false;
              const label = String(m.label || "").trim();
              const val = String(m.value || "").trim();
              if (!label || !val) return false;
              const lowerLabel = label.toLowerCase();
              const lowerVal = val.toLowerCase();
              if (lowerLabel === "statut" && lowerVal === "actif") return false;
              if (lowerVal === "actif" || lowerVal === "n/a" || lowerVal === "non précisé" || lowerVal === "donnée synthétique" || lowerVal === "non renseigné") return false;
              return true;
            })
            .map((m: any) => ({
              label: String(m.label).trim(),
              value: String(m.value).trim()
            }));

          const websiteCandidate = (parsed.website && typeof parsed.website === "string" && parsed.website.startsWith("http")) 
            ? parsed.website 
            : (webUrlFromGrounding || "");

          return {
            sector: parsed.sector && parsed.sector !== "Secteur à préciser" ? parsed.sector : "",
            description: parsed.description || "",
            size: parsed.size || "",
            website: websiteCandidate,
            location: parsed.location || "",
            foundingYear: parsed.foundingYear || "",
            companyStatus: parsed.companyStatus || "",
            geographicPresence: parsed.geographicPresence || "",
            parentGroup: parsed.parentGroup || "",
            revenue: parsed.revenue || "",
            recentDynamics: parsed.recentDynamics || "",
            notableClients: parsed.notableClients || "",
            values: parsed.values || "",
            csrCommitment: parsed.csrCommitment || "",
            distinctions: parsed.distinctions || "",
            hrContactEmail: parsed.hrContactEmail || "",
            careersPageUrl: parsed.careersPageUrl || "",
            metrics: validMetrics
          };
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("Quota exceeded")) {
          console.info(`[enrichCompanyWithWebSearch] Quota API atteint sur ${model}.`);
          break;
        }
        console.info(`[enrichCompanyWithWebSearch] Erreur sur modèle ${model}, passage au suivant: ${errMsg}`);
      }
    }

    if (lastError) {
      const errMsg = lastError?.message || String(lastError);
      if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("Quota exceeded")) {
        console.info(`[enrichCompanyWithWebSearch] Quota Gemini temporairement restreint. Utilisation de la base de connaissances institutionnelles NACORA pour "${cleanName}".`);
      } else {
        console.info(`[enrichCompanyWithWebSearch] Recherche en ligne non concluante pour "${cleanName}", basculement sur la base de connaissances.`);
      }

      const lowerName = cleanName.toLowerCase();
      
      // Trade Republic
      if (lowerName.includes("trade republic") || lowerName.includes("traderepublic")) {
        return {
          sector: "Fintech / Néo-courtier & Épargne",
          description: "Trade Republic est une plateforme d'épargne et d'investissement européenne de premier plan offrant l'accès aux actions, ETF, obligations et plans d'épargne programmés sans commission.",
          size: "700-1 000 salariés",
          website: "https://traderepublic.com",
          location: "Berlin, Allemagne (Bureaux à Paris)",
          foundingYear: "2015",
          companyStatus: "Scale-up / Établissement de crédit agréé BCE",
          geographicPresence: "17 pays européens",
          parentGroup: "Indépendant",
          revenue: "Rentable (Volume d'épargne > 35 Mds €)",
          recentDynamics: "Obtention de la licence bancaire complète de la BCE et lancement de la carte de paiement avec Saveback.",
          notableClients: "Plus de 4 millions d'utilisateurs actifs en Europe",
          values: "Accessibilité, transparence, autonomie financière",
          csrCommitment: "Démocratisation de l'accès aux marchés financiers et éducation financière",
          distinctions: "Licence bancaire BCE / BaFin",
          hrContactEmail: "careers@traderepublic.com",
          careersPageUrl: "https://traderepublic.com/fr-fr/carrieres",
          metrics: [
            { label: "Siège", value: "Berlin" },
            { label: "Création", value: "2015" },
            { label: "Clients", value: "+4M" }
          ]
        };
      }

      // Revolut
      if (lowerName.includes("revolut")) {
        return {
          sector: "Fintech / Néo-banque mondiale",
          description: "Revolut est une super-app financière globale proposant comptes multidevises, cartes de paiement, investissements, crédits et solutions professionnelles.",
          size: "+8 000 collaborateurs",
          website: "https://www.revolut.com",
          location: "Londres, Royaume-Uni (Filiale UE en Lituanie / Paris)",
          foundingYear: "2015",
          companyStatus: "Licence bancaire européenne (BCE)",
          geographicPresence: "Plus de 35 pays",
          parentGroup: "Revolut Group Holdings",
          revenue: "Plus de 2,2 milliards $ de CA",
          recentDynamics: "Forte rentabilité opérationnelle, déploiement des IBAN locaux et expansion B2B Revolut Business.",
          notableClients: "Plus de 45 millions de clients particuliers et 500k entreprises",
          values: "Get It Done, Never Settle, Stronger Together",
          csrCommitment: "Inclusion financière numérique et compensation carbone",
          distinctions: "Licence bancaire européenne, FinTech Unicorn",
          hrContactEmail: "careers@revolut.com",
          careersPageUrl: "https://www.revolut.com/careers",
          metrics: [
            { label: "Clients", value: "+45M" },
            { label: "Création", value: "2015" },
            { label: "Salariés", value: "+8 000" }
          ]
        };
      }

      // BNP Paribas
      if (lowerName.includes("bnp") || lowerName.includes("paribas")) {
        return {
          sector: "Banque universelle & Services financiers",
          description: "BNP Paribas est la première banque de l'Union européenne et un acteur clé de la banque internationale, intervenant en banque de détail, gestion de fortune et banque d'investissement.",
          size: "+180 000 collaborateurs",
          website: "https://group.bnpparibas",
          location: "Paris, France",
          foundingYear: "2000 (Origines 1848)",
          companyStatus: "Grand groupe coté (CAC 40)",
          geographicPresence: "Présent dans 65 pays",
          parentGroup: "BNP Paribas SA",
          revenue: "+45 milliards d'euros de PNB",
          recentDynamics: "Plan stratégique GTS 2025 axé sur la technologie, la finance durable et la gestion d'actifs.",
          notableClients: "Particuliers, professionnels, PME et grandes multinationales",
          values: "Responsabilité, rigueur, agilité, esprit d'équipe",
          csrCommitment: "Leader européen de la transition écologique et des obligations vertes",
          distinctions: "Banque européenne de référence",
          hrContactEmail: "recrutement@bnpparibas.com",
          careersPageUrl: "https://group.bnpparibas/emploi-carriere",
          metrics: [
            { label: "Effectif", value: "+180k" },
            { label: "Pays", value: "65" }
          ]
        };
      }

      // Société Générale
      if (lowerName.includes("societe generale") || lowerName.includes("société générale") || lowerName.includes("socgen")) {
        return {
          sector: "Banque universelle, Financement & Investissement",
          description: "Société Générale est l'un des premiers groupes européens de services financiers, acteur majeur de l'économie depuis plus de 150 ans, spécialisé en banque de détail, CIB et mobilité (Ayvens).",
          size: "+125 000 collaborateurs",
          website: "https://www.societegenerale.com",
          location: "Paris / La Défense, France",
          foundingYear: "1864",
          companyStatus: "Grand groupe coté (CAC 40)",
          geographicPresence: "66 pays",
          parentGroup: "Société Générale S.A.",
          revenue: "+25 milliards d'euros de PNB",
          recentDynamics: "Fusion des réseaux SG en France, développement de BoursoBank et accélération sur l'ESG.",
          notableClients: "25 millions de clients particuliers et institutionnels",
          values: "Engagement, Responsabilité, Esprit d'équipe, Innovation",
          csrCommitment: "Objectifs stricts de décarbonation des portefeuilles et finance à impact positif",
          distinctions: "Pionnier des dérivés actions et de la finance structurée",
          hrContactEmail: "carrieres@socgen.com",
          careersPageUrl: "https://careers.societegenerale.com",
          metrics: [
            { label: "Effectif", value: "+125k" },
            { label: "Création", value: "1864" },
            { label: "Implantations", value: "66 pays" }
          ]
        };
      }

      // Crédit Agricole
      if (lowerName.includes("credit agricole") || lowerName.includes("crédit agricole") || lowerName.includes("amundi")) {
        return {
          sector: "Banque mutualiste, Gestion d'actifs & Assurance",
          description: "Le Crédit Agricole est le premier groupe bancaire en France, leader de la banque de proximité en Europe et premier gestionnaire d'actifs européen via sa filiale Amundi.",
          size: "+145 000 collaborateurs",
          website: "https://www.credit-agricole.com",
          location: "Montrouge, France",
          foundingYear: "1894",
          companyStatus: "Groupe coopératif et mutualiste",
          geographicPresence: "46 pays",
          parentGroup: "Groupe Crédit Agricole",
          revenue: "+25 milliards d'euros de PNB",
          recentDynamics: "Accélération des financements d'énergies renouvelables et leadership européen dans la gestion d'actifs.",
          notableClients: "53 millions de clients dans le monde",
          values: "Proximité, responsabilité, solidarité mutualiste",
          csrCommitment: "Projet Sociétal axé sur la transition énergétique et l'inclusion des jeunes",
          distinctions: "1er financeur de l'économie française, 10e banque mondiale",
          hrContactEmail: "recrutement@credit-agricole.fr",
          careersPageUrl: "https://www.groupecreditagricole.jobs",
          metrics: [
            { label: "Clients", value: "53M" },
            { label: "Salariés", value: "+145k" },
            { label: "Création", value: "1894" }
          ]
        };
      }

      // BPCE / Natixis
      if (lowerName.includes("bpce") || lowerName.includes("natixis") || lowerName.includes("banque populaire") || lowerName.includes("caisse d'epargne")) {
        return {
          sector: "Banque coopérative, Gestion d'actifs & Financement",
          description: "Le Groupe BPCE est le 2e groupe bancaire en France, regroupant la Banque Populaire, la Caisse d'Épargne et Natixis (Corporate & Investment Banking, Asset Management).",
          size: "+100 000 collaborateurs",
          website: "https://groupebpce.com",
          location: "Paris, France",
          foundingYear: "2009",
          companyStatus: "Groupe bancaire mutualiste",
          geographicPresence: "40 pays",
          parentGroup: "Groupe BPCE",
          revenue: "+24 milliards d'euros de PNB",
          recentDynamics: "Plan stratégique Vision 2030, digitalisation des parcours clients et partenariat avec Paris 2024.",
          notableClients: "35 millions de clients",
          values: "Solidarité, esprit d'entreprendre, ancrage territorial",
          csrCommitment: "Banque engagée dans la transition écologique locale et les investissements durables",
          distinctions: "2e groupe bancaire français",
          hrContactEmail: "recrutement@groupebpce.fr",
          careersPageUrl: "https://groupebpce.com/carrieres",
          metrics: [
            { label: "Clients", value: "35M" },
            { label: "Salariés", value: "+100k" },
            { label: "Création", value: "2009" }
          ]
        };
      }

      // Qonto
      if (lowerName.includes("qonto")) {
        return {
          sector: "Fintech / Gestion financière pour PME & Indépendants",
          description: "Qonto est le leader européen de la gestion financière des entreprises, combinant compte professionnel, facturation, comptabilité et gestion des dépenses d'équipe.",
          size: "+1 400 salariés",
          website: "https://qonto.com",
          location: "Paris, France",
          foundingYear: "2016",
          companyStatus: "Établissement de paiement agréé ACPR",
          geographicPresence: "France, Allemagne, Italie, Espagne",
          parentGroup: "Olinda SAS",
          revenue: "En forte croissance (+500k entreprises clientes)",
          recentDynamics: "Acquisition de Penta en Allemagne et consolidation de la position de leader européen B2B.",
          notableClients: "Plus de 500 000 entreprises clientes (TPE, PME, indépendants)",
          values: "Ambition, Customer Focus, Mastery, Integrity",
          csrCommitment: "Engagements RSE certifiés B-Corp, parité et sobriété numérique",
          distinctions: "Next40 / FT120, Agréé ACPR Banque de France",
          hrContactEmail: "careers@qonto.com",
          careersPageUrl: "https://qonto.com/fr/careers",
          metrics: [
            { label: "Clients", value: "+500k" },
            { label: "Création", value: "2016" },
            { label: "Effectif", value: "+1 400" }
          ]
        };
      }

      // Finary
      if (lowerName.includes("finary")) {
        return {
          sector: "Fintech / Gestion de patrimoine digitale",
          description: "Finary est une plateforme moderne de suivi de patrimoine global permettant de centraliser et d'optimiser l'ensemble des actifs (immobilier, bourse, crypto, comptes bancaires).",
          size: "50-100 salariés",
          website: "https://finary.com",
          location: "Paris, France",
          foundingYear: "2020",
          companyStatus: "Scale-up FinTech / CIF & PSAN",
          geographicPresence: "France, Europe, US",
          parentGroup: "Indépendant",
          revenue: "Plusieurs dizaines de milliards d'euros suivis sur la plateforme",
          recentDynamics: "Lancement de Finary One (gestion privée) et de l'assurance-vie Finary Life.",
          notableClients: "+250 000 investisseurs et conseillers en gestion de patrimoine",
          values: "Transparence, indépendance, rigueur financière",
          csrCommitment: "Éducation financière et démocratisation de la gestion privée",
          distinctions: "Membre du French Tech 2030, agréé AMF/ORIAS",
          hrContactEmail: "contact@finary.com",
          careersPageUrl: "https://finary.com/fr/careers",
          metrics: [
            { label: "Siège", value: "Paris" },
            { label: "Création", value: "2020" },
            { label: "Investisseurs", value: "+250k" }
          ]
        };
      }

      // Rothschild & Co
      if (lowerName.includes("rothschild")) {
        return {
          sector: "Banque d'affaires, Conseil M&A & Gestion de fortune",
          description: "Rothschild & Co est un groupe financier indépendant de premier plan mondial, spécialisé dans le conseil financier (fusions-acquisitions, restructuration), la gestion de fortune et le private equity.",
          size: "+4 200 collaborateurs",
          website: "https://www.rothschildandco.com",
          location: "Paris / Londres",
          foundingYear: "1811 (Plus de 200 ans d'histoire)",
          companyStatus: "Société en commandite par actions / Contrôle familial",
          geographicPresence: "Présent dans plus de 40 pays",
          parentGroup: "Rothschild & Co",
          revenue: "+2,5 milliards d'euros de chiffre d'affaires",
          recentDynamics: "Retrait réussi de la cote parisienne par la famille fondatrice pour préserver l'indépendance à long terme.",
          notableClients: "Grandes entreprises, fonds de private equity, gouvernements, familles fortunées",
          values: "Excellence, discrétion, vision long terme, indépendance",
          csrCommitment: "Intégration systématique des critères ESG dans les opérations de conseil et d'investissement",
          distinctions: "Leader mondial et européen en nombre d'opérations de fusions-acquisitions (M&A)",
          hrContactEmail: "recruitment@rothschildandco.com",
          careersPageUrl: "https://www.rothschildandco.com/en/careers",
          metrics: [
            { label: "Création", value: "1811" },
            { label: "Effectif", value: "+4 200" },
            { label: "Pays", value: "+40" }
          ]
        };
      }

      // Lazard
      if (lowerName.includes("lazard")) {
        return {
          sector: "Banque d'investissement & Gestion d'actifs",
          description: "Lazard est l'une des plus anciennes et prestigieuses maisons de conseil financier et de gestion d'actifs au monde, reconnue pour son expertise en M&A, conseil stratégique et souverain.",
          size: "+3 300 collaborateurs",
          website: "https://www.lazard.com",
          location: "Paris / New York",
          foundingYear: "1848",
          companyStatus: "Société cotée (NYSE)",
          geographicPresence: "41 villes dans 26 pays",
          parentGroup: "Lazard Ltd",
          revenue: "+2,7 milliards $ de revenus",
          recentDynamics: "Nomination de Peter Orszag en tant que CEO et renforcement des franchises tech et transition énergétique.",
          notableClients: "Multinationales, institutions publiques, États souverains, investisseurs institutionnels",
          values: "Excellence intellectuelle, intégrité, relation de confiance durable",
          csrCommitment: "Leadership en conseil sur les restructurations écologiques et la gouvernance d'entreprise",
          distinctions: "Référence mondiale en conseil stratégique et conseil souverain",
          hrContactEmail: "recruitment@lazard.com",
          careersPageUrl: "https://www.lazard.com/careers",
          metrics: [
            { label: "Création", value: "1848" },
            { label: "Effectif", value: "+3 300" },
            { label: "Implantations", value: "26 pays" }
          ]
        };
      }

      // AXA
      if (lowerName.includes("axa")) {
        return {
          sector: "Assurance, Gestion d'actifs & Prévoyance",
          description: "AXA est l'un des leaders mondiaux de l'assurance et de la gestion d'actifs, accompagnant particuliers et entreprises pour protéger leurs biens, leur santé et leur patrimoine.",
          size: "+145 000 collaborateurs",
          website: "https://www.axa.com",
          location: "Paris, France",
          foundingYear: "1985 (Origines 1817)",
          companyStatus: "Grand groupe coté (CAC 40)",
          geographicPresence: "Présent dans 51 pays",
          parentGroup: "AXA S.A.",
          revenue: "+102 milliards d'euros de chiffre d'affaires",
          recentDynamics: "Plan stratégique Unlock the Future axé sur les risques climatiques et la santé numérique.",
          notableClients: "Plus de 94 millions de clients dans le monde",
          values: "Customer first, Courage, Integrity, One AXA",
          csrCommitment: "Pionnier de la sortie du charbon et de l'assurance climat",
          distinctions: "1re marque mondiale d'assurance, composante clé du CAC 40",
          hrContactEmail: "recrutement@axa.fr",
          careersPageUrl: "https://recrutement.axa.fr",
          metrics: [
            { label: "Clients", value: "94M" },
            { label: "Salariés", value: "+145k" },
            { label: "Pays", value: "51" }
          ]
        };
      }
    }
  }

  return {
    sector: "",
    description: "",
    size: "",
    website: "",
    location: "",
    foundingYear: "",
    companyStatus: "",
    geographicPresence: "",
    parentGroup: "",
    revenue: "",
    recentDynamics: "",
    notableClients: "",
    values: "",
    csrCommitment: "",
    distinctions: "",
    hrContactEmail: "",
    careersPageUrl: "",
    metrics: []
  };
}

/**
 * Evaluates strategic networking relevance pillars for a given contact and candidate profile with Gemini.
 */
export async function evaluateContactStrategicInterests(
  contact: any,
  profile: CandidateProfile
): Promise<{
  networkingRelevance: NetworkingRelevanceItem[];
  connectionPoints: string[];
  summary: string;
  relevanceScore: number;
}> {
  const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!key) {
    const { computeStrategicInterests } = await import("../utils/strategicInterests");
    return computeStrategicInterests(contact, profile);
  }

  const prompt = `
Tu es l'expert en stratégie de networking et d'insertion professionnelle de NACORA (plateforme spécialisée en Banque, Finance et Gestion de Patrimoine).
Analyse en profondeur ce contact par rapport au profil du candidat et génère des axes stratégiques réseau concrets et actionnables.

Profil du candidat :
- Formation / Situation : ${profile.currentSituation || "Étudiant / Alternant en Finance"}
- Alternance / Entreprise actuelle : ${profile.currentAlternance || "Non précisée"}
- Objectif / Secteurs cibles : ${(profile.targetSectors || ["Banque", "Finance"]).join(", ")}
- Postes visés : ${(profile.targetTitles || ["Chargé de clientèle", "Conseiller patrimonial"]).join(", ")}

Contact à analyser :
- Nom : ${contact.fullName}
- Poste : ${contact.jobTitle}
- Entreprise : ${contact.companyName}
- Catégorie : ${contact.category}
- Formation / Écoles : ${contact.academicPath || "Non renseignée"}
- Secteur : ${contact.sector || "Banque / Finance"}
- Notes : ${contact.notes || "Aucune"}

Format JSON attendu :
{
  "networkingRelevance": [
    {
      "pillar": "Nom explicite du pilier (ex: Opportunités Directes & Recrutement, Mentorat Alumni, Veille Métier)",
      "type": "Recrutement | Alumni | Secteur Cible | Décideur | Entraide",
      "context": "Contexte précis liant le profil du contact et celui du candidat",
      "recommendation": "Conseil d'action précis (ex: quel message envoyer, comment l'aborder)",
      "confidence": "high"
    }
  ],
  "connectionPoints": ["Point commun 1", "Point commun 2"],
  "summary": "Synthèse analytique de 1-2 phrases sur l'intérêt stratégique de ce contact",
  "relevanceScore": 88
}
Génère entre 2 et 3 piliers stratégiques très pertinents.
`;

  try {
    const ai = getAi();
    for (const model of CASCADE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.3
          }
        });

        const text = response.text || "{}";
        const json = JSON.parse(text);
        if (Array.isArray(json.networkingRelevance) && json.networkingRelevance.length > 0) {
          return {
            networkingRelevance: json.networkingRelevance,
            connectionPoints: Array.isArray(json.connectionPoints) ? json.connectionPoints : [],
            summary: json.summary || "",
            relevanceScore: typeof json.relevanceScore === "number" ? json.relevanceScore : 85
          };
        }
      } catch (err) {
        console.warn(`[evaluateContactStrategicInterests] model ${model} failed, trying next...`, err);
      }
    }
  } catch (e) {
    console.warn("Error calling Gemini in evaluateContactStrategicInterests:", e);
  }

  const { computeStrategicInterests } = await import("../utils/strategicInterests");
  return computeStrategicInterests(contact, profile);
}



