/**
 * Taxonomie centralisée des fonctions professionnelles NACORA
 * Source unique de vérité pour la classification des contacts
 */

export const STANDARD_CONTACT_FUNCTIONS = [
  "Direction / Management",
  "Finance",
  "Banque / Finance d'entreprise",
  "Ressources humaines",
  "Recrutement",
  "Commercial / Sales",
  "Marketing",
  "Communication",
  "Produit",
  "Tech / IT",
  "Data / Analytics",
  "Opérations",
  "Conseil",
  "Juridique",
  "Achats",
  "Logistique / Supply Chain",
  "Audit",
  "Gestion de projet",
  "Stratégie",
  "Autre",
  "Inconnue"
] as const;

export type StandardContactFunction = typeof STANDARD_CONTACT_FUNCTIONS[number];

export type ContactFunctionSource = "rule_engine" | "ai_classification" | "manual" | "imported";
export type ContactFunctionConfidence = "high" | "medium" | "low";

export interface FunctionClassificationResult {
  function: StandardContactFunction;
  functionSource: ContactFunctionSource;
  functionConfidence: ContactFunctionConfidence;
  functionClassifiedAt: string;
}

/**
 * Normalise une chaîne pour l'analyse lexicale
 */
function clean(str?: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Classifie le poste d'un contact selon la taxonomie officielle NACORA.
 * RÈGLE ABSOLUE : Si le poste est ambigu (ex: "Associate", "Consultant", "Stagiaire"),
 * renvoie "Inconnue" avec confiance basse plutôt que d'inventer une catégorie.
 */
export function classifyContactFunction(
  jobTitle?: string,
  companyName?: string
): FunctionClassificationResult {
  const now = new Date().toISOString();

  if (!jobTitle || !jobTitle.trim()) {
    return {
      function: "Inconnue",
      functionSource: "rule_engine",
      functionConfidence: "low",
      functionClassifiedAt: now
    };
  }

  const j = clean(jobTitle);
  const c = clean(companyName);

  // 1. Recrutement (priorité haute pour distinguer RH généraliste et recrutement)
  if (
    j.includes("recrut") ||
    j.includes("talent acquisition") ||
    j.includes("campus recruiter") ||
    j.includes("campus manager") ||
    j.includes("headhunter") ||
    j.includes("chasseur de tetes") ||
    j.includes("charge de recherche") ||
    j.includes("talent lead")
  ) {
    return {
      function: "Recrutement",
      functionSource: "rule_engine",
      functionConfidence: "high",
      functionClassifiedAt: now
    };
  }

  // 2. Ressources humaines (généralistes)
  if (
    j.includes("drh") ||
    j.includes("ressources humaines") ||
    j.includes("hrbp") ||
    j.includes("hr business partner") ||
    j.includes("responsable rh") ||
    j.includes("gestionnaire rh") ||
    j.includes("assistant rh") ||
    j.includes("developpement rh") ||
    j.includes("formation rh") ||
    /\brh\b/.test(j) ||
    /\bhr\b/.test(j)
  ) {
    return {
      function: "Ressources humaines",
      functionSource: "rule_engine",
      functionConfidence: "high",
      functionClassifiedAt: now
    };
  }

  // 3. Direction / Management (Directeur de région, Directeur général, CEO, etc.)
  if (
    j.includes("directeur de region") ||
    j.includes("directrice de region") ||
    j.includes("directeur regional") ||
    j.includes("directrice regionale") ||
    j.includes("directeur general") ||
    j.includes("directrice generale") ||
    j.includes("directeur d'agence") ||
    j.includes("directeur de succursale") ||
    j.includes("directeur de centre") ||
    j.includes("directeur d'etablissement") ||
    j.includes("president") ||
    j.includes("fondateur") ||
    j.includes("co-fondateur") ||
    j.includes("managing director") ||
    /\bceo\b/.test(j) ||
    /\bdg\b/.test(j) ||
    /\bcoo\b/.test(j) ||
    j.includes("chef d'entreprise") ||
    j.includes("associe gerant") ||
    j.includes("partner")
  ) {
    return {
      function: "Direction / Management",
      functionSource: "rule_engine",
      functionConfidence: "high",
      functionClassifiedAt: now
    };
  }

  // 4. Banque & Finance patrimoniale / d'entreprise
  if (
    j.includes("patrimoine") ||
    j.includes("gestionnaire de patrimoine") ||
    j.includes("conseiller patrimonial") ||
    j.includes("banquier prive") ||
    j.includes("private banker") ||
    j.includes("conseiller bancaire") ||
    j.includes("charge de clientele") ||
    j.includes("charge d'affaires entreprise") ||
    j.includes("analyste credit") ||
    j.includes("banque de detail") ||
    j.includes("banque privee") ||
    j.includes("gestion privee") ||
    j.includes("wealth manager") ||
    j.includes("cgp")
  ) {
    return {
      function: "Banque / Finance d'entreprise",
      functionSource: "rule_engine",
      functionConfidence: "high",
      functionClassifiedAt: now
    };
  }

  // 5. Finance (M&A, Marché, Trésorerie, Contrôle de gestion, CFO)
  if (
    j.includes("directeur financier") ||
    /\bcfo\b/.test(j) ||
    j.includes("controleur de gestion") ||
    j.includes("tresorier") ||
    j.includes("analyste financier") ||
    j.includes("financial analyst") ||
    j.includes("fusion") ||
    j.includes("m&a") ||
    j.includes("corporate finance") ||
    j.includes("private equity") ||
    j.includes("asset management") ||
    j.includes("gerant de portefeuille") ||
    j.includes("trader") ||
    j.includes("investisseur") ||
    j.includes("comptable") ||
    j.includes("comptabilite")
  ) {
    return {
      function: "Finance",
      functionSource: "rule_engine",
      functionConfidence: "high",
      functionClassifiedAt: now
    };
  }

  // 6. Audit
  if (
    j.includes("audit") ||
    j.includes("auditeur") ||
    j.includes("commissaire aux comptes") ||
    j.includes("internal audit")
  ) {
    return {
      function: "Audit",
      functionSource: "rule_engine",
      functionConfidence: "high",
      functionClassifiedAt: now
    };
  }

  // 7. Commercial / Sales
  if (
    j.includes("account executive") ||
    j.includes("business developer") ||
    j.includes("commercial") ||
    j.includes("ingenieur commercial") ||
    j.includes("sales") ||
    j.includes("responsable des ventes") ||
    j.includes("charge d'affaires") ||
    j.includes("prospection") ||
    j.includes("account manager") ||
    j.includes("client success") ||
    j.includes("key account")
  ) {
    return {
      function: "Commercial / Sales",
      functionSource: "rule_engine",
      functionConfidence: "high",
      functionClassifiedAt: now
    };
  }

  // 8. Produit
  if (
    j.includes("product manager") ||
    j.includes("product owner") ||
    j.includes("chef de produit") ||
    j.includes("head of product") ||
    j.includes("vp product") ||
    /\bpo\b/.test(j)
  ) {
    return {
      function: "Produit",
      functionSource: "rule_engine",
      functionConfidence: "high",
      functionClassifiedAt: now
    };
  }

  // 9. Data / Analytics
  if (
    j.includes("data analyst") ||
    j.includes("data scientist") ||
    j.includes("data engineer") ||
    j.includes("business analyst") ||
    j.includes("data manager") ||
    j.includes("analytics") ||
    j.includes("bi analyst") ||
    j.includes("data architect")
  ) {
    return {
      function: "Data / Analytics",
      functionSource: "rule_engine",
      functionConfidence: "high",
      functionClassifiedAt: now
    };
  }

  // 10. Tech / IT
  if (
    j.includes("developpeur") ||
    j.includes("developer") ||
    j.includes("software engineer") ||
    j.includes("architecte it") ||
    j.includes("ingenieur logiciel") ||
    j.includes("devops") ||
    j.includes("fullstack") ||
    j.includes("frontend") ||
    j.includes("backend") ||
    j.includes("cto") ||
    j.includes("tech lead") ||
    j.includes("securite informatique") ||
    j.includes("cybersecurite") ||
    j.includes("sysadmin")
  ) {
    return {
      function: "Tech / IT",
      functionSource: "rule_engine",
      functionConfidence: "high",
      functionClassifiedAt: now
    };
  }

  // 11. Marketing
  if (
    j.includes("marketing") ||
    j.includes("growth") ||
    j.includes("traffic manager") ||
    j.includes("seo") ||
    j.includes("cmo") ||
    j.includes("acquisition marketing")
  ) {
    return {
      function: "Marketing",
      functionSource: "rule_engine",
      functionConfidence: "high",
      functionClassifiedAt: now
    };
  }

  // 12. Communication
  if (
    j.includes("communication") ||
    j.includes("relations presse") ||
    j.includes("community manager") ||
    j.includes("attache de presse") ||
    j.includes("charge de communication")
  ) {
    return {
      function: "Communication",
      functionSource: "rule_engine",
      functionConfidence: "high",
      functionClassifiedAt: now
    };
  }

  // 13. Gestion de projet
  if (
    j.includes("chef de projet") ||
    j.includes("project manager") ||
    j.includes("pmo") ||
    j.includes("gestionnaire de projet") ||
    j.includes("scrum master") ||
    j.includes("agile coach")
  ) {
    return {
      function: "Gestion de projet",
      functionSource: "rule_engine",
      functionConfidence: "high",
      functionClassifiedAt: now
    };
  }

  // 14. Juridique / Conformité
  if (
    j.includes("juriste") ||
    j.includes("avocat") ||
    j.includes("legal counsel") ||
    j.includes("responsable juridique") ||
    j.includes("conformite") ||
    j.includes("compliance") ||
    j.includes("dpo")
  ) {
    return {
      function: "Juridique",
      functionSource: "rule_engine",
      functionConfidence: "high",
      functionClassifiedAt: now
    };
  }

  // 15. Achats & Logistique / Supply Chain
  if (
    j.includes("acheteur") ||
    j.includes("achats") ||
    j.includes("procurement")
  ) {
    return {
      function: "Achats",
      functionSource: "rule_engine",
      functionConfidence: "high",
      functionClassifiedAt: now
    };
  }

  if (
    j.includes("supply chain") ||
    j.includes("logistique") ||
    j.includes("transport") ||
    j.includes("approvisionnement")
  ) {
    return {
      function: "Logistique / Supply Chain",
      functionSource: "rule_engine",
      functionConfidence: "high",
      functionClassifiedAt: now
    };
  }

  // 16. Stratégie & Conseil
  if (
    j.includes("strategie") ||
    j.includes("strategic planner") ||
    j.includes("chief strategy officer")
  ) {
    return {
      function: "Stratégie",
      functionSource: "rule_engine",
      functionConfidence: "high",
      functionClassifiedAt: now
    };
  }

  if (
    j.includes("conseil") ||
    j.includes("consultant en strategie") ||
    j.includes("consultant senior") ||
    j.includes("management consultant")
  ) {
    return {
      function: "Conseil",
      functionSource: "rule_engine",
      functionConfidence: "medium",
      functionClassifiedAt: now
    };
  }

  // 17. Opérations
  if (
    j.includes("operations") ||
    j.includes("directeur des operations") ||
    j.includes("responsable operationnel")
  ) {
    return {
      function: "Opérations",
      functionSource: "rule_engine",
      functionConfidence: "high",
      functionClassifiedAt: now
    };
  }

  // RÈGLE ANTI-INVENTION :
  // Si le poste est un statut ambigu (ex: "Associate", "Consultant", "Stagiaire", "Alternant", "Collaborateur")
  // sans indication fonctionnelle claire, NE PAS INVENTER une fonction.
  const ambiguousKeywords = [
    "associate",
    "consultant",
    "stagiaire",
    "intern",
    "alternant",
    "apprenti",
    "collaborateur",
    "employe",
    "cadre",
    "assistant",
    "officer",
    "member",
    "membre",
    "professionnel",
    "intervenant"
  ];

  if (ambiguousKeywords.some(k => j === k || j.startsWith(`${k} `) || j.endsWith(` ${k}`))) {
    return {
      function: "Inconnue",
      functionSource: "rule_engine",
      functionConfidence: "low",
      functionClassifiedAt: now
    };
  }

  return {
    function: "Autre",
    functionSource: "rule_engine",
    functionConfidence: "low",
    functionClassifiedAt: now
  };
}
