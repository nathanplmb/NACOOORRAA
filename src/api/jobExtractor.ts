import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

// ============================================================================
// 1. SCHÉMA DE DONNÉES STRICT (ZOD)
// ============================================================================

export const RecruitmentStepSchema = z.object({
  order: z.number().default(1),
  description: z.string().min(1),
  interviewer: z.string().nullable().optional(),
  duration: z.string().nullable().optional()
});

export type RecruitmentStep = z.infer<typeof RecruitmentStepSchema>;

export const ExtractedJobOfferSchema = z.object({
  // Informations de base
  title: z.string().min(1, "Le titre est requis"),
  company: z.string().min(1, "L'entreprise est requise"),
  location: z.string().nullable().default(null),
  country: z.string().nullable().default(null),
  contractType: z.string().nullable().default(null),
  duration: z.string().nullable().default(null),
  startDate: z.string().nullable().default(null),
  endDate: z.string().nullable().default(null),
  salary: z.string().nullable().default(null),
  salaryMin: z.number().nullable().default(null),
  salaryMax: z.number().nullable().default(null),
  salaryCurrency: z.string().nullable().default(null),
  remotePolicy: z.string().nullable().default(null),
  remoteDetails: z.string().nullable().default(null),
  applicationDeadline: z.string().nullable().default(null),

  // Missions
  missions: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).nullable().default(null),

  // Compétences
  requiredSkills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  tools: z.array(z.string()).default([]),
  qualities: z.array(z.string()).default([]),
  educationRequirements: z.string().nullable().default(null),
  educationLevel: z.string().nullable().default(null),
  requiredLanguages: z.array(z.object({
    language: z.string(),
    level: z.string().default("Courant"),
    isRequired: z.boolean().default(true)
  })).default([]),

  // Entreprise & Contexte
  companyName: z.string().min(1, "Le nom d'entreprise est requis"),
  parentCompany: z.string().nullable().default(null),
  groupName: z.string().nullable().default(null),
  companyDescription: z.string().nullable().default(null),
  companySector: z.string().nullable().default(null),
  companySize: z.string().nullable().default(null),
  companyMetrics: z.array(z.object({
    label: z.string(),
    value: z.string()
  })).default([]),

  // Avantages
  benefits: z.array(z.string()).default([]),

  // Processus de recrutement
  recruitmentSteps: z.array(RecruitmentStepSchema).default([])
});

export type ExtractedJobOffer = z.infer<typeof ExtractedJobOfferSchema>;

// JSON Schema passed to the Gemini API
export const geminiJobOfferResponseSchema = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING", description: "Titre exact de l'offre d'emploi ou du poste" },
    company: { type: "STRING", description: "Nom de l'entreprise qui recrute directement" },
    location: { type: "STRING", description: "Lieu de travail ou ville", nullable: true },
    country: { type: "STRING", description: "Pays de l'offre", nullable: true },
    contractType: { 
      type: "STRING", 
      description: "Type de contrat : Stage, Alternance, CDD, CDI, VIE, Freelance", 
      nullable: true 
    },
    duration: { type: "STRING", description: "Durée du contrat (ex: 6 mois, 12 mois)", nullable: true },
    startDate: { type: "STRING", description: "Date de début prévue", nullable: true },
    endDate: { type: "STRING", description: "Date de fin si applicable", nullable: true },
    salary: { type: "STRING", description: "Salaire ou gratification textuelle", nullable: true },
    salaryMin: { type: "NUMBER", description: "Salaire minimum chiffré en brut annuel ou mensuel", nullable: true },
    salaryMax: { type: "NUMBER", description: "Salaire maximum chiffré", nullable: true },
    salaryCurrency: { type: "STRING", description: "Devise monétaire (€, $, etc.)", nullable: true },
    remotePolicy: { type: "STRING", description: "Politique de télétravail", nullable: true },
    remoteDetails: { type: "STRING", description: "Détails du télétravail", nullable: true },
    applicationDeadline: { type: "STRING", description: "Date limite explicite de candidature", nullable: true },
    missions: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Liste exhaustive de chaque point de mission du poste"
    },
    responsibilities: {
      type: "ARRAY",
      items: { type: "STRING" },
      nullable: true,
      description: "Responsabilités clés"
    },
    requiredSkills: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Compétences techniques et professionnelles indispensables UNIQUEMENT (ex: Maîtrise d'Excel avancé (TCD, formules complexes), modélisation financière, réglementation AMF, analyse financière). STRICTEMENT AUCUN soft skill ou trait de personnalité dans ce tableau : les qualités humaines (Rigueur, Autonomie, Esprit d'analyse, Bon relationnel, etc.) vont EXCLUSIVEMENT dans 'qualities'."
    },
    preferredSkills: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Compétences techniques appréciées ou atouts bonus (ex: Notions de VBA, PowerBI, certification AMF). ZÉRO doublon avec requiredSkills ni avec qualities."
    },
    tools: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Outils, logiciels, langages ou plateformes concrets (ex: Excel, Bloomberg, Python, Salesforce, Notion, PowerBI)"
    },
    qualities: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Qualités humaines, traits de personnalité, aptitudes comportementales et soft skills UNIQUEMENT (ex: Rigueur, Esprit d'analyse, Sens du détail, Bon relationnel, Capacité à vulgariser des données complexes, Autonomie, Force de proposition, Écoute active, Aisance relationnelle). Ne JAMAIS dupliquer dans requiredSkills."
    },
    educationRequirements: { type: "STRING", description: "Diplôme ou filière demandée", nullable: true },
    educationLevel: { type: "STRING", description: "Niveau de diplôme requis (Bac+3, Bac+5...)", nullable: true },
    requiredLanguages: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          language: { type: "STRING" },
          level: { type: "STRING" },
          isRequired: { type: "BOOLEAN" }
        },
        required: ["language", "level", "isRequired"]
      },
      description: "Langues demandées avec niveau et caractère obligatoire"
    },
    companyName: { type: "STRING", description: "Nom de l'entité recruteuse" },
    parentCompany: { type: "STRING", description: "Maison mère ou entité parente", nullable: true },
    groupName: { type: "STRING", description: "Groupe de rattachement", nullable: true },
    companyDescription: { type: "STRING", description: "Description de l'entreprise", nullable: true },
    companySector: { type: "STRING", description: "Secteur d'activité", nullable: true },
    companySize: { type: "STRING", description: "Taille ou effectif", nullable: true },
    companyMetrics: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          label: { type: "STRING" },
          value: { type: "STRING" }
        },
        required: ["label", "value"]
      },
      description: "Chiffres clés de l'entreprise"
    },
    benefits: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Avantages sociaux, tickets restaurant, transport, etc."
    },
    recruitmentSteps: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          order: { type: "INTEGER" },
          description: { type: "STRING" },
          interviewer: { type: "STRING" },
          duration: { type: "STRING" }
        },
        required: ["order", "description"]
      },
      description: "Étapes ordonnées du processus de recrutement (interlocuteur, durée le cas échéant)"
    }
  },
  required: [
    "title",
    "company",
    "missions",
    "requiredSkills",
    "preferredSkills",
    "tools",
    "qualities",
    "requiredLanguages",
    "companyName",
    "companyMetrics",
    "benefits",
    "recruitmentSteps"
  ]
};

// ============================================================================
// 2. SYSTEM & USER PROMPTS EXACTS
// ============================================================================

export const EXTRACTION_SYSTEM_PROMPT = `Tu es l'agent d'extraction haute précision de NACORA : "Opportunity Intelligence Extraction".
Ton unique mission est d'analyser le texte brut d'une offre d'emploi / stage / alternance et d'extraire TOUTES les informations factuelles de manière exhaustive, structurée et fidèle au texte selon le format JSON strict attendu.

RÈGLES ABSOLUES ET DIRECTIVES D'EXTRACTION :

1. STRICTE ADHÉRENCE AUX FAITS & ANTI-HALLUCINATION :
   - Tu ne dois utiliser QUE les informations explicitement présentes dans le texte de l'offre fourni.
   - Si le salaire est absent ou non chiffré -> salary: null, salaryMin: null, salaryMax: null.
   - Si la date limite est absente ou "Au fil de l'eau" -> applicationDeadline: null. Ne JAMAIS inventer la date du jour !
   - Si le télétravail est non spécifié -> remotePolicy: "Non spécifié" ou null.
   - Si aucune langue n'est demandée -> requiredLanguages: [].

2. DATES ET CALENDRIER :
   - startDate : Si une date ou période de début est mentionnée (ex: "Septembre 2026", "Dès que possible", "01/09/2026", "Automne 2026"), EXTRAIS-LA impérativement dans startDate.
   - applicationDeadline : Date limite de candidature si mentionnée explicitement.

3. ENTREPRISE, GROUPE & DONNÉES FACTUELLES (RÈGLE CRITIQUE) :
   - company / companyName : L'entité précise qui recrute (ex: "Finoria", "Natixis Wealth Management").
   - parentCompany / groupName : Le groupe de rattachement si mentionné (ex: "Groupe BPCE"). Ne jamais remplacer l'entreprise par son groupe.
   - companyDescription : Présentation textuelle complète de l'entreprise telle que décrite dans l'offre (son activité, sa mission, son histoire). Ne le laisse JAMAIS vide si l'offre présente l'entreprise !
   - companySector : Secteur d'activité précis (ex: "Fintech / Gestion de patrimoine", "Banque Privée", "Assurance").
   - companySize : Taille ou effectif mentionné (ex: "120 collaborateurs", "PME", "Groupe international de 5000 personnes").
   - companyMetrics : TOUTE information chiffrée ou factuelle sur l'entreprise présente dans le texte DOIT être extraite sous forme d'objets { label, value }.
     Exemples : { label: "Encours sous gestion", value: "850 M€" }, { label: "Clients actifs", value: "12 000" }, { label: "Effectif", value: "120 collaborateurs" }, { label: "Croissance annuelle", value: "+35%" }, { label: "Bureaux", value: "Paris, Lyon, Bordeaux" }.

4. MISSIONS EXHAUSTIVES :
   - Tu DOIS extraire CHAQUE mission, tâche ou responsabilité comme un élément distinct dans le tableau 'missions'.
   - Ne résume pas, ne tronque pas, conserve le détail opérationnel.

5. COMPÉTENCES TECHNIQUES VS QUALITÉS HUMAINES (RÈGLE CRITIQUE DE SÉPARATION STRICTE & ZÉRO DUPLICATION) :
   - requiredSkills et qualities sont deux champs TOTALEMENT DISTINCTS avec des rôles fondamentalement différents.
   - Tu DOIS classer chaque élément dans UN SEUL des deux champs selon sa nature exacte, SANS JAMAIS DUPLIQUER :

   A. requiredSkills (Compétences techniques & professionnelles indispensables UNIQUEMENT) :
      - Concerne UNIQUEMENT les compétences techniques concrètes, savoir-faire métier, méthodes, progiciels ou expertises explicitement exigés comme indispensables dans le texte de l'offre (ex: "Maîtrise d'Excel avancé (TCD, formules complexes)").
      - Ne PAS dupliquer les missions dans requiredSkills (les actions opérationnelles vont exclusivement dans le tableau 'missions').
      - Ne PAS inclure les filières d'études ou diplômes dans requiredSkills (ex: "Finance", "Gestion de Patrimoine", "Master 2" vont exclusivement dans 'educationRequirements' et 'educationLevel').
      - INTERDICTION FORMELLE ET ABSOLUE : Ne JAMAIS inclure de traits de caractère, qualités humaines, aptitudes relationnelles, comportementales ou soft skills dans requiredSkills (JAMAIS de "Rigueur", "Autonomie", "Esprit d'analyse", "Sens du détail", "Bon relationnel", "Capacité à vulgariser des données complexes", "Force de proposition" dans requiredSkills !).

   B. qualities (Qualités humaines, aptitudes comportementales & Soft Skills UNIQUEMENT) :
      - Concerne EXCLUSIVEMENT les qualités humaines, savoir-être, traits de personnalité, aptitudes relationnelles et comportementales (ex: "Rigueur", "Esprit d'analyse", "Sens du détail", "Bon relationnel", "Capacité à vulgariser des données complexes", "Autonomie", "Force de proposition", "Aisance relationnelle", "Écoute active", "Esprit d'équipe").
      - Ces éléments vont STRICTEMENT ET UNIQUEMENT dans 'qualities', et JAMAIS dans 'requiredSkills'.

   C. preferredSkills (Compétences techniques appréciées ou atouts bonus) :
      - Concerne les compétences techniques secondaires mentionnées comme un plus ou appréciées (ex: "Notions de VBA", "Connaissance de PowerBI", "Certification AMF appréciée").

   D. tools (Outils & Logiciels concrets) :
      - Concerne la liste des logiciels, outils, plateformes numériques et langages concrets (ex: "Excel", "PowerPoint", "Bloomberg", "Salesforce", "Python").

   E. ZÉRO CHEVAUCHEMENT / ZÉRO DUPLICATION :
      - Aucun élément ne doit se retrouver à la fois dans requiredSkills et dans qualities. Chaque item doit être classé selon sa nature dans sa liste exclusive.

   F. educationRequirements :
      - Niveau de diplôme et filières mentionnés (ex: "Bac+4 ou Bac+5 en Finance, Gestion de Patrimoine ou Banque").

6. LANGUES (Y COMPRIS DANS LE TEXTE EN PROSE) :
   - requiredLanguages : Si une langue est mentionnée dans le texte, MÊME au détour d'une phrase en prose (ex: "Une bonne maîtrise de l'anglais professionnel est requise pour échanger avec nos partenaires européens", "Anglais courant", "Français bilingue"), tu DOIS impérativement l'extraire sous forme :
     { language: "Anglais", level: "Professionnel" (ou "Courant" / "Bilingue"), isRequired: true/false selon le texte }.

7. PROCESSUS DE RECRUTEMENT (recruitmentSteps) :
   - Si l'offre décrit un processus ou des étapes de recrutement (ex: "1. Échange téléphonique RH (30 min)", "2. Cas pratique", "3. Entretien avec le Directeur Associé"), tu DOIS extraire CHAQUE étape dans 'recruitmentSteps' :
     { order: 1, description: "Échange téléphonique de préqualification", interviewer: "Chargée de recrutement RH", duration: "30 minutes" }.
   - Remplis 'interviewer' avec le nom et/ou le rôle de l'interlocuteur si mentionné.
   - Remplis 'duration' si une durée est précisée (ex: "30 min", "1 heure").

8. AVANTAGES SOCIAUX (benefits) :
   - Avantages classés strictement dans 'benefits' (titres-restaurant, pass transport 50%, prime d'intéressement, mutuelle, RTT, salle de sport, etc.), JAMAIS mélangés aux missions.

9. TYPE DE CONTRAT & DURÉE :
   - Type : Stage, Alternance, CDD, CDI, VIE, Freelance.
   - Priorité absolue Stage vs VIE : un stage à l'international reste un "Stage" sauf mention explicite de la formule V.I.E.

Renvoie UNIQUEMENT le JSON valide correspondant à la structure requise.`;

export function buildUserPrompt(cleanedText: string, sourceUrl?: string): string {
  return `Voici le texte brut de l'offre à analyser et structurer :

"""
${cleanedText}
"""

URL source fournie par l'utilisateur : ${sourceUrl || "Non spécifiée"}`;
}

// ============================================================================
// 3. PIPELINE DE POST-TRAITEMENT ET NETTOYAGE
// ============================================================================

/**
 * Nettoie le texte brut de l'offre avant envoi à l'IA en supprimant les bruits
 * de navigation web, bandeaux cookies, mentions parasites, scripts, etc.
 */
export function cleanOfferText(rawText: string): string {
  if (!rawText) return "";

  let text = rawText;

  // 1. Remove HTML tags if present
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
  text = text.replace(/<[^>]+>/g, " ");

  // 2. Remove common web boilerplate patterns
  const noisePatterns = [
    /aller au contenu principal/gi,
    /passer au contenu/gi,
    /skip to main content/gi,
    /accepter tous les cookies/gi,
    /gérer mes cookies/gi,
    /politique de confidentialité/gi,
    /privacy policy/gi,
    /tous droits réservés/gi,
    /all rights reserved/gi,
    /partager cette offre/gi,
    /sauvegarder cette offre/gi,
    /postuler maintenant/gi,
    /postuler en ligne/gi,
    /créer une alerte/gi,
    /offres similaires/gi
  ];

  for (const pattern of noisePatterns) {
    text = text.replace(pattern, "");
  }

  // 3. Normalize whitespace while preserving linebreaks for structure
  const lines = text.split("\n")
    .map(line => line.replace(/\s+/g, " ").trim())
    .filter(line => line.length > 0);

  return lines.join("\n");
}

/**
 * Garde-fous déterministes après extraction
 */
export function applyDeterministicGuards(rawText: string, extracted: ExtractedJobOffer): ExtractedJobOffer {
  const result: ExtractedJobOffer = { ...extracted };

  // 1. Garde-fou sur le titre : s'il ressemble à un élément d'interface
  const uiKeywords = [
    "postuler", "aller au contenu", "accueil", "offres d'emploi", "connexion", 
    "partager", "menu", "page", "recherche", "candidature", "login"
  ];
  const titleLower = (result.title || "").toLowerCase();
  const isSuspiciousTitle = uiKeywords.some(kw => titleLower === kw || titleLower.startsWith(kw + " ") || titleLower.endsWith(" " + kw));

  if (isSuspiciousTitle || !result.title || result.title.length < 3) {
    // Tente de trouver un vrai titre dans les premières lignes du texte brut
    const lines = rawText.split("\n").map(l => l.trim()).filter(Boolean);
    const candidateLine = lines.slice(0, 10).find(l => {
      const low = l.toLowerCase();
      return (
        !uiKeywords.some(kw => low.includes(kw)) &&
        l.length >= 5 && l.length <= 90 &&
        (low.includes("conseiller") || low.includes("analyste") || low.includes("chargé") || 
         low.includes("assistant") || low.includes("manager") || low.includes("gestionnaire") ||
         low.includes("développeur") || low.includes("consultant") || low.includes("stagiaire") ||
         low.includes("alternant") || low.includes("juriste") || low.includes("ingénieur"))
      );
    });

    if (candidateLine) {
      result.title = candidateLine.replace(/^(offre\s*:|poste\s*:|intitulé\s*:)/i, "").trim();
    } else if (lines[0] && lines[0].length < 80) {
      result.title = lines[0];
    }
  }

  // 2. Garde-fou sur l'entreprise fusionnée avec une métrique (ex: "15k employésBanque" ou "Natixis5000")
  if (result.company) {
    const fusionMatch = result.company.match(/^(.*?)(?:\s*[-–]\s*|\s+)?(\d+(?:k|K|\+)?\s*(?:salariés|collaborateurs|employés|agences))([A-ZÀ-Ÿ].*)?$/);
    if (fusionMatch) {
      const cleanCompany = fusionMatch[1]?.trim();
      const metricVal = fusionMatch[2]?.trim();
      const extraSector = fusionMatch[3]?.trim();

      if (cleanCompany) result.company = cleanCompany;
      if (cleanCompany) result.companyName = cleanCompany;

      if (metricVal) {
        if (!result.companyMetrics) result.companyMetrics = [];
        result.companyMetrics.push({ label: "Effectif", value: metricVal });
      }

      if (extraSector && !result.companySector) {
        result.companySector = extraSector;
      }
    }
  }

  // 3. Règle de priorité absolue Stage vs VIE :
  // Un stage à l'international reste un "Stage" sauf mention explicite de la formule V.I.E.
  const lowerText = rawText.toLowerCase();
  const hasExplicitVie = /\bv\.?i\.?e\b|\bvolontariat international en entreprise\b/i.test(rawText);
  const mentionsStage = lowerText.includes("stage") || lowerText.includes("stagiaire") || lowerText.includes("internship");

  if (result.contractType === "VIE" && !hasExplicitVie && mentionsStage) {
    result.contractType = "Stage";
  } else if (!result.contractType) {
    if (hasExplicitVie) result.contractType = "VIE";
    else if (lowerText.includes("alternance") || lowerText.includes("apprentissage") || lowerText.includes("contrat pro")) {
      result.contractType = "Alternance";
    } else if (mentionsStage) {
      result.contractType = "Stage";
    } else if (lowerText.includes("cdi")) {
      result.contractType = "CDI";
    } else if (lowerText.includes("cdd")) {
      result.contractType = "CDD";
    }
  }

  // 4. Disjonction stricte entre compétences techniques et qualités/soft skills
  // (Règle absolue : aucun soft skill ou qualité humaine dans requiredSkills / preferredSkills)
  const isSoftSkillOrQuality = (text: string): boolean => {
    const t = text.trim().toLowerCase();
    const softPatterns = [
      /rigueur|rigoureux|rigoureuse/i,
      /esprit d['’]analyse|sens de l['’]analyse|capacit[ée] d['’]analyse|capacit[ée] analytique|analytique/i,
      /sens du d[ée]tail|souci du d[ée]tail|minutie|m[ée]ticuleux|m[ée]ticuleuse/i,
      /bon relationnel|sens relationnel|aisance relationnelle|qualit[ée]s? relationnelles?|excellent relationnel|sens du contact|go[ûu]t du contact/i,
      /capacit[ée] [àa] vulgariser|vulgarisation|p[ée]dagogie|p[ée]dagogue|sens de la communication/i,
      /autonomie|autonome/i,
      /force de proposition|proactif|proactive|proactivit[ée]|prise d['’]initiative|sens de l['’]initiative/i,
      /esprit d['’][ée]quipe|travail en [ée]quipe|sens du collectif|collaboratif/i,
      /[ée]coute active|empathie|sens de l['’][ée]coute/i,
      /curiosit[ée]|adaptabilit[ée]|agilit[ée]|dynamisme|motivation/i,
      /sens de l['’]organisation|organis[ée]|m[ée]thodique/i,
      /r[ée]silience|gestion du stress|pers[ée]v[ée]rance/i
    ];
    return softPatterns.some(p => p.test(t));
  };

  const rawQualities = Array.isArray(result.qualities) ? [...result.qualities] : [];
  const rawRequired = Array.isArray(result.requiredSkills) ? [...result.requiredSkills] : [];
  const rawPreferred = Array.isArray(result.preferredSkills) ? [...result.preferredSkills] : [];

  const cleanQualities: string[] = [];
  const cleanRequired: string[] = [];
  const cleanPreferred: string[] = [];

  const addToQualities = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    const exists = cleanQualities.some(item => item.toLowerCase() === trimmed.toLowerCase());
    if (!exists) cleanQualities.push(trimmed);
  };

  // Traiter d'abord les qualités existantes
  rawQualities.forEach(q => addToQualities(q));

  // Traiter requiredSkills : migrer les soft skills vers qualities et retirer les doublons
  rawRequired.forEach(sk => {
    const trimmed = sk.trim();
    if (!trimmed) return;
    if (isSoftSkillOrQuality(trimmed)) {
      addToQualities(trimmed);
    } else {
      // Compétence technique valide : vérifier qu'elle n'est pas déjà dans les qualités
      const inQualities = cleanQualities.some(q => q.toLowerCase() === trimmed.toLowerCase());
      if (!inQualities && !cleanRequired.some(r => r.toLowerCase() === trimmed.toLowerCase())) {
        cleanRequired.push(trimmed);
      }
    }
  });

  // Traiter preferredSkills : migrer les soft skills vers qualities et retirer les doublons
  rawPreferred.forEach(sk => {
    const trimmed = sk.trim();
    if (!trimmed) return;
    if (isSoftSkillOrQuality(trimmed)) {
      addToQualities(trimmed);
    } else {
      const inQualities = cleanQualities.some(q => q.toLowerCase() === trimmed.toLowerCase());
      const inRequired = cleanRequired.some(r => r.toLowerCase() === trimmed.toLowerCase());
      if (!inQualities && !inRequired && !cleanPreferred.some(p => p.toLowerCase() === trimmed.toLowerCase())) {
        cleanPreferred.push(trimmed);
      }
    }
  });

  result.qualities = cleanQualities;
  result.requiredSkills = cleanRequired;
  result.preferredSkills = cleanPreferred;

  return result;
}

// ============================================================================
// 4. MOTEUR HEURISTIQUE LOCAL (FALLBACK ULTIME SANS API)
// ============================================================================

export function extractWithLocalHeuristics(rawText: string, sourceUrl?: string): ExtractedJobOffer {
  const cleaned = cleanOfferText(rawText);
  const lines = cleaned.split("\n").map(l => l.trim()).filter(Boolean);

  // 1. Titre
  let title = "Poste non spécifié";
  const explicitTitleMatch = cleaned.match(/(?:intitulé|poste|titre|métier|job title)\s*:\s*([^\n\r]+)/i);
  if (explicitTitleMatch && explicitTitleMatch[1].trim().length > 2) {
    title = explicitTitleMatch[1].trim();
  } else {
    for (const line of lines.slice(0, 10)) {
      if (line.length > 5 && line.length < 80 && !/cookies|menu|partager|entreprise|société|lieu|contrat/i.test(line)) {
        title = line.replace(/^(poste|offre|intitulé)\s*:\s*/i, "");
        break;
      }
    }
  }

  // 2. Entreprise
  let company = "Entreprise non renseignée";
  const explicitCompanyMatch = cleaned.match(/(?:entreprise|société|groupe|company)\s*:\s*([^\n\r]+)/i);
  if (explicitCompanyMatch && explicitCompanyMatch[1].trim().length > 1) {
    company = explicitCompanyMatch[1].trim();
  } else {
    const companyMatch = cleaned.match(/(?:chez|pour|entreprise|société|groupe)\s+([A-ZÀ-Ÿ][A-Za-z0-9\s&'-]{2,30})/i);
    if (companyMatch) {
      company = companyMatch[1].trim();
    }
  }

  // 3. Contrat
  let contractType: string | null = null;
  if (/apprentissage|alternance|contrat pro/i.test(cleaned)) contractType = "Alternance";
  else if (/\bv\.?i\.?e\b/i.test(cleaned)) contractType = "VIE";
  else if (/stage|stagiaire/i.test(cleaned)) contractType = "Stage";
  else if (/cdi/i.test(cleaned)) contractType = "CDI";
  else if (/cdd/i.test(cleaned)) contractType = "CDD";
  else if (/freelance|indépendant/i.test(cleaned)) contractType = "Freelance";

  // 4. Lieu
  let location: string | null = null;
  const locMatch = cleaned.match(/(?:lieu|localisation|poste basé à|basé à|à)\s*:\s*([A-Za-zÀ-ÿ\s-]+)/i);
  if (locMatch && locMatch[1].length < 40) {
    location = locMatch[1].trim();
  }

  // 5. Durée
  let duration: string | null = null;
  const durMatch = cleaned.match(/(\d+\s*(?:mois|semaines|an|ans))/i);
  if (durMatch) duration = durMatch[1].trim();

  // 6. Salaire
  let salary: string | null = null;
  let salaryMin: number | null = null;
  let salaryMax: number | null = null;
  const salMatch = cleaned.match(/(\d{3,5}(?:\s*[-–à]\s*\d{3,5})?\s*(?:€|euros|\$)(?:\s*\/\s*(?:mois|an))?)/i);
  if (salMatch) {
    salary = salMatch[1].trim();
    const numbers = salMatch[1].match(/\d+/g)?.map(Number);
    if (numbers && numbers.length === 1) salaryMin = numbers[0];
    if (numbers && numbers.length >= 2) {
      salaryMin = numbers[0];
      salaryMax = numbers[1];
    }
  }

  // 7. Missions (recherche de listes à puces)
  const missions: string[] = [];
  lines.forEach(line => {
    if (/^[-•*–]\s+/.test(line) && line.length > 20) {
      missions.push(line.replace(/^[-•*–]\s+/, ""));
    }
  });

  // 8. Compétences & Outils (détection de mots-clés distincts)
  const commonHardSkills = [
    "Analyse financière", "Gestion de patrimoine", "Comptabilité", "Relation client",
    "Négociation", "Gestion de projet", "Prospection", "Conformité", "Droit bancaire"
  ];
  const foundHardSkills = commonHardSkills.filter(s => new RegExp(`\\b${s}\\b`, "i").test(cleaned));

  const commonSoftSkills = [
    "Rigueur", "Esprit d'analyse", "Sens du détail", "Bon relationnel", "Capacité à vulgariser",
    "Autonomie", "Force de proposition", "Esprit d'équipe"
  ];
  const foundSoftSkills = commonSoftSkills.filter(s => new RegExp(`\\b${s}\\b`, "i").test(cleaned));

  const commonTools = ["Excel", "Word", "PowerPoint", "SQL", "Python", "Salesforce", "SAP", "Figma"];
  const foundTools = commonTools.filter(t => new RegExp(`\\b${t}\\b`, "i").test(cleaned));

  // 9. Langues
  const languages: Array<{ language: string; level: string; isRequired: boolean }> = [];
  if (/anglais/i.test(cleaned)) {
    languages.push({ language: "Anglais", level: "Professionnel", isRequired: /anglais requis|anglais obligatoire/i.test(cleaned) });
  }
  if (/français/i.test(cleaned)) {
    languages.push({ language: "Français", level: "Courant", isRequired: true });
  }

  // 10. Date limite
  let applicationDeadline: string | null = null;
  const dlMatch = cleaned.match(/(?:date limite|avant le|clôture)\s*:\s*([0-9]{1,2}[\/\-\s][0-9]{1,2}[\/\-\s][0-9]{2,4}|[0-9]{1,2}\s+[A-Za-zÀ-ÿ]+\s+[0-9]{4})/i);
  if (dlMatch) applicationDeadline = dlMatch[1].trim();

  return {
    title,
    company,
    location,
    country: "France",
    contractType,
    duration,
    startDate: null,
    endDate: null,
    salary,
    salaryMin,
    salaryMax,
    salaryCurrency: salary ? "€" : null,
    remotePolicy: /télétravail|remote/i.test(cleaned) ? "Télétravail mentionné" : null,
    remoteDetails: null,
    applicationDeadline,
    missions: missions.length > 0 ? missions : ["Découverte et analyse des missions selon le poste."],
    responsibilities: null,
    requiredSkills: foundHardSkills.slice(0, 3),
    preferredSkills: foundHardSkills.slice(3),
    tools: foundTools,
    qualities: foundSoftSkills.length > 0 ? foundSoftSkills : ["Rigueur", "Sens du relationnel"],
    educationRequirements: /bac\s*\+\s*\d/i.test(cleaned) ? cleaned.match(/bac\s*\+\s*\d/i)?.[0] || null : null,
    educationLevel: null,
    requiredLanguages: languages,
    companyName: company,
    parentCompany: null,
    groupName: null,
    companyDescription: null,
    companySector: null,
    companySize: null,
    companyMetrics: [],
    benefits: [],
    recruitmentSteps: []
  };
}

// ============================================================================
// 5. CASCADE OFFICIELLE DE MODÈLES AVEC REPLIS AUTOMATIQUES
// ============================================================================

export interface ExtractionResult {
  data: ExtractedJobOffer;
  rawJson: any;
  modelUsed: string;
  isFallback: boolean;
  cleanText: string;
  diagnosticLogs?: string[];
  modelErrors?: Array<{ model: string; error: string; status?: number }>;
}

export async function extractJobOfferWithCascade(
  rawJobText: string,
  sourceUrl?: string
): Promise<ExtractionResult> {
  const diagnosticLogs: string[] = [];
  const modelErrors: Array<{ model: string; error: string; status?: number }> = [];

  const logDiag = (msg: string) => {
    console.log(msg);
    diagnosticLogs.push(msg);
  };

  const cleanedText = cleanOfferText(rawJobText);
  const userPrompt = buildUserPrompt(cleanedText, sourceUrl);

  const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  // Vérification sécurisée de la clé d'environnement
  if (key) {
    const keyPrefix = key.substring(0, 7);
    const keySuffix = key.substring(key.length - 4);
    logDiag(`[Extractor Diagnostic] GEMINI_API_KEY est bien DÉFINIE (Longueur: ${key.length}, Format: ${keyPrefix}...${keySuffix})`);
  } else {
    logDiag(`[Extractor Diagnostic] ALERTE: GEMINI_API_KEY est INDÉFINIE ou vide`);
    const heuristicData = extractWithLocalHeuristics(rawJobText, sourceUrl);
    const guarded = applyDeterministicGuards(rawJobText, heuristicData);
    return {
      data: guarded,
      rawJson: guarded,
      modelUsed: "local-heuristic-engine (fallback)",
      isFallback: true,
      cleanText: cleanedText,
      diagnosticLogs,
      modelErrors: [{ model: "none", error: "GEMINI_API_KEY is undefined" }]
    };
  }

  const ai = new GoogleGenAI({ 
    apiKey: key,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });

  // Cascade ordonnée : on privilégie la haute disponibilité et la robustesse
  // gemini-3.1-flash-lite dispose de la plus grande disponibilité et rapidité, suivi de gemini-3.8-flash et gemini-flash-latest
  const modelCascade = [
    "gemini-3.1-flash-lite",
    "gemini-3.8-flash",
    "gemini-flash-latest"
  ];

  for (let i = 0; i < modelCascade.length; i++) {
    const modelName = modelCascade[i];
    try {
      logDiag(`[Extractor] Tentative d'appel du modèle : "${modelName}"...`);

      const response = await ai.models.generateContent({
        model: modelName,
        contents: userPrompt,
        config: {
          systemInstruction: EXTRACTION_SYSTEM_PROMPT,
          temperature: 0.0,
          responseMimeType: "application/json",
          responseSchema: geminiJobOfferResponseSchema as any,
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error(`Réponse vide du modèle ${modelName}`);
      }

      logDiag(`[Extractor] SUCCÈS avec le modèle "${modelName}" ! (Longueur réponse: ${responseText.length} caractères)`);
      const parsedJson = JSON.parse(responseText);

      // Validation Zod avec safeParse
      const validation = ExtractedJobOfferSchema.safeParse(parsedJson);

      let validatedData: ExtractedJobOffer;
      if (validation.success) {
        validatedData = validation.data;
      } else {
        console.warn(`[Extractor] Erreurs Zod non bloquantes:`, validation.error.format());
        validatedData = {
          ...parsedJson,
          title: parsedJson.title || "Poste à pourvoir",
          company: parsedJson.company || parsedJson.companyName || "Entreprise",
          companyName: parsedJson.companyName || parsedJson.company || "Entreprise",
          missions: Array.isArray(parsedJson.missions) ? parsedJson.missions : [],
          requiredSkills: Array.isArray(parsedJson.requiredSkills) ? parsedJson.requiredSkills : [],
          preferredSkills: Array.isArray(parsedJson.preferredSkills) ? parsedJson.preferredSkills : [],
          tools: Array.isArray(parsedJson.tools) ? parsedJson.tools : [],
          qualities: Array.isArray(parsedJson.qualities) ? parsedJson.qualities : [],
          requiredLanguages: Array.isArray(parsedJson.requiredLanguages) ? parsedJson.requiredLanguages : [],
          companyMetrics: Array.isArray(parsedJson.companyMetrics) ? parsedJson.companyMetrics : [],
          benefits: Array.isArray(parsedJson.benefits) ? parsedJson.benefits : [],
          recruitmentSteps: Array.isArray(parsedJson.recruitmentSteps) ? parsedJson.recruitmentSteps : []
        } as ExtractedJobOffer;
      }

      const finalGuardedData = applyDeterministicGuards(rawJobText, validatedData);

      return {
        data: finalGuardedData,
        rawJson: parsedJson,
        modelUsed: modelName,
        isFallback: false,
        cleanText: cleanedText,
        diagnosticLogs,
        modelErrors
      };
    } catch (err: any) {
      const errorMsg = err.message || JSON.stringify(err);
      const status = err.status || err.statusCode || (err.error && err.error.code);
      logDiag(`[Extractor] ÉCHEC du modèle "${modelName}" -> Erreur: ${errorMsg} (Status: ${status})`);

      modelErrors.push({
        model: modelName,
        error: errorMsg,
        status: status
      });
      // En cas d'erreur (503 surchargé, 429 quota, etc.), basculer immédiatement sur le modèle suivant de la cascade
    }
  }

  // Si les 3 modèles ont échoué
  logDiag(`[Extractor] Les 3 modèles (${modelCascade.join(", ")}) ont échoué. Déclenchement du repli heuristique local.`);
  const heuristicData = extractWithLocalHeuristics(rawJobText, sourceUrl);
  const guarded = applyDeterministicGuards(rawJobText, heuristicData);

  return {
    data: guarded,
    rawJson: guarded,
    modelUsed: "local-heuristic-engine (fallback)",
    isFallback: true,
    cleanText: cleanedText,
    diagnosticLogs,
    modelErrors
  };
}

// ============================================================================
// 6. CALCUL DU SCORE DE COMPLÉTUDE
// ============================================================================

export interface CompletenessReport {
  score: number; // 0 à 100
  filledFields: string[];
  missingFields: string[];
}

export function calculateCompletenessScore(offer: Partial<ExtractedJobOffer>): CompletenessReport {
  const criteria = [
    { label: "Intitulé du poste", check: !!offer.title && offer.title !== "Poste non spécifié" },
    { label: "Entreprise", check: !!offer.company && offer.company !== "Entreprise non renseignée" },
    { label: "Type de contrat", check: !!offer.contractType },
    { label: "Lieu", check: !!offer.location },
    { label: "Missions détaillées", check: Array.isArray(offer.missions) && offer.missions.length >= 2 },
    { label: "Compétences requises", check: Array.isArray(offer.requiredSkills) && offer.requiredSkills.length > 0 },
    { label: "Outils ou plateformes", check: Array.isArray(offer.tools) && offer.tools.length > 0 },
    { label: "Qualités humaines", check: Array.isArray(offer.qualities) && offer.qualities.length > 0 },
    { label: "Formation requise", check: !!offer.educationRequirements || !!offer.educationLevel },
    { label: "Rémunération", check: !!offer.salary || offer.salaryMin !== null },
    { label: "Date limite", check: !!offer.applicationDeadline },
    { label: "Avantages", check: Array.isArray(offer.benefits) && offer.benefits.length > 0 }
  ];

  const filled = criteria.filter(c => c.check).map(c => c.label);
  const missing = criteria.filter(c => !c.check).map(c => c.label);

  const score = Math.round((filled.length / criteria.length) * 100);

  return {
    score,
    filledFields: filled,
    missingFields: missing
  };
}
