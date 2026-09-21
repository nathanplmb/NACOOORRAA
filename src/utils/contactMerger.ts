import { Contact, ContactCategory, ContactCategoryItem, NetworkingRelevanceItem, ProfessionalProfileDetails } from "../types";

/**
 * Strict and exhaustive verification of whether a job title belongs to Human Resources / Recruitment / Talent.
 * Detects all French and English variations (Ressources Humaines, RH, DRH, RRH, HRBP, Talent Acquisition, Recrutement, etc.).
 */
export function isHumanResourcesRole(jobTitle?: string): boolean {
  if (!jobTitle) return false;
  const t = jobTitle.toLowerCase();

  // Comprehensive regular expression capturing all semantic HR & Recruitment roles and variants
  const hasExplicitHR = /(ressources?[\s-]humaines?|human[\s-]resources|\brh\b|\bdrh\b|\brrh\b|\barh\b|\bgrh\b|\bsirh\b|\bhrbp\b|\bhr\b|recrut|recruit|talent[\s-]acquisition|talent[\s-]attraction|talent[\s-]management|talent[\s-]partner|talent[\s-]lead|talent[\s-]manager|talent[\s-]specialist|talent[\s-]advisor|headhunter|chasseur[\s-]de[\s-]t[eê]tes|campus[\s-]recruiter|campus[\s-]manager|relations?[\s-][eé]coles|relations?[\s-]entreprises?|charg[eé]e?[\s-]de[\s-]recherche|people[\s-](&|and)[\s-]culture|people[\s-]lead|people[\s-]partner|people[\s-]ops|people[\s-]operations|chief[\s-]people|gestion[\s-]des[\s-]carri[eè]res|d[eé]veloppement[\s-]rh|relations?[\s-]sociales?|administration[\s-]du[\s-]personnel|paie[\s-](et|&)[\s-]rh|consultant[\s-]rh|conseill(er|ère)[\s-]en[\s-]recrutement)/i.test(t);

  return hasExplicitHR;
}

/**
 * Strict verification of whether a contact belongs to the Banking, Finance, and Wealth sector.
 * NOTE: If the contact is HR within a financial institution, HR priority takes precedence over banking advisor.
 */
export function isBankingAndFinanceRole(jobTitle?: string, companyName?: string): boolean {
  // If explicitly in HR, they are not an operational banking advisor
  if (jobTitle && isHumanResourcesRole(jobTitle)) {
    return false;
  }

  const combined = `${jobTitle || ""} ${companyName || ""}`.toLowerCase();
  
  const hasFinanceKeywords = /(conseill[eè]re?.*(banqu|client|financ|patrimoine|agence)|banqu|financ|patrimoine|wealth|cr[eé]dit|credit|assurance|gestion priv[eé]e|cgp|cgpc|analyste.*financ|charg[eé]e? d'affaires|charg[eé]e? de client[eè]le|directeur.*agence|directrice.*agence|courtier|actuaire|tr[eé]sor|m&a|private equity|invest|asset management|portfolio)/i.test(combined);

  const hasBankCompany = /(cr[eé]dit agricole|lcl\b|bnp|soci[eé]t[eé] g[eé]n[eé]rale|bpce|banque populaire|caisse d'epargne|cic\b|rothschild|palatine|boursorama|revolut|trade republic|finary|qonto|spendesk|axa\b|allianz|generali|swiss life)/i.test(combined);

  return hasFinanceKeywords || (hasBankCompany && !isHumanResourcesRole(jobTitle));
}

/**
 * Maps multidimensional categories to the primary legacy ContactCategory
 * ensuring complete backwards compatibility with all existing screens and strict role distinction.
 */
export function computePrimaryCategory(
  categories?: ContactCategoryItem[],
  fallback: ContactCategory = "other",
  jobTitle?: string,
  companyName?: string
): ContactCategory {
  // Check for alumni first (an alumnus working in banking is an Alumni with high networking value)
  const hasAlumni = categories?.some(
    c => c.category === "academic" && /alumni|m[eê]me [eé]tablissement|ancien/i.test(c.subcategory)
  );
  if (hasAlumni || fallback === "alumni") return "alumni";

  // Check for strict recruiter / HR (including HR within a bank or enterprise)
  if (jobTitle && isHumanResourcesRole(jobTitle)) return "recruiter";

  const hasRecruiter = categories?.some(
    c => c.category === "recruitment" && 
         /talent|recrut|recruit|ressources?[\s-]humaines?|\brh\b|\bdrh\b|\brrh\b|\bhrbp\b|\bhr\b|human resources|headhunter|campus manager/i.test(c.subcategory) &&
         !/conseill[eè]re?[\s-]client|client[eè]le|gestionnaire[\s-]patrimoine/i.test(c.subcategory)
  );
  if (hasRecruiter) return "recruiter";

  // Check for target sector professional (Banking, Finance, Wealth, FinTech)
  if (jobTitle && isBankingAndFinanceRole(jobTitle, companyName)) return "sector_pro";

  const hasTargetSector = categories?.some(
    c => (c.category === "sector" && /banque|finance|patrimoine|fintech|assurance/i.test(c.subcategory)) || 
         (c.category === "professional_function" && /banque|finance|patrimoine|fintech|assurance|audit|gestion|conseil/i.test(c.subcategory))
  );
  if (hasTargetSector) return "sector_pro";

  // Check for student / apprentice
  const hasStudent = categories?.some(
    c => c.category === "status" && /[eé]tudiant|alternant|stagiaire|apprenti/i.test(c.subcategory)
  );
  if (hasStudent) return "student";

  // Check for other professional
  const hasOtherPro = categories?.some(
    c => c.category === "professional_function" || c.category === "seniority" || c.category === "professional_relation"
  );
  if (hasOtherPro) return "other_pro";

  return fallback;
}

/**
 * Compares two confidence ratings ('high' > 'medium' > 'low')
 */
export function confidenceWeight(conf: "high" | "medium" | "low" = "low"): number {
  switch (conf) {
    case "high": return 3;
    case "medium": return 2;
    case "low": return 1;
    default: return 1;
  }
}

/**
 * Intelligent merger for existing contacts and fresh LinkedIn import data.
 * Respects strict non-destructive rule: never overwrites detailed existing data with empty or shorter fields.
 */
export function mergeContactData(existing: Contact, fresh: Partial<Contact>): Contact {
  // 1. Merge Categories
  const existingCats = existing.categories || [];
  const freshCats = fresh.categories || [];

  const categoryMap = new Map<string, ContactCategoryItem>();

  // Add existing first
  existingCats.forEach(cat => {
    const key = `${cat.category}::${cat.subcategory.toLowerCase().trim()}`;
    categoryMap.set(key, cat);
  });

  // Merge fresh categories (update if higher confidence or new)
  freshCats.forEach(cat => {
    const key = `${cat.category}::${cat.subcategory.toLowerCase().trim()}`;
    const prev = categoryMap.get(key);
    if (!prev || confidenceWeight(cat.confidence) >= confidenceWeight(prev.confidence)) {
      categoryMap.set(key, {
        category: cat.category,
        subcategory: cat.subcategory,
        confidence: cat.confidence || "medium",
        reason: cat.reason || prev?.reason || "Classification enrichie"
      });
    }
  });

  const mergedCategories = Array.from(categoryMap.values());

  // 2. Merge connection points
  const mergedConnectionPoints = Array.from(new Set([
    ...(existing.connectionPoints || []),
    ...(fresh.connectionPoints || [])
  ])).filter(Boolean);

  // 3. Merge previous companies
  const mergedPastCompanies = Array.from(new Set([
    ...(existing.previousCompanies || []),
    ...(fresh.previousCompanies || []),
    ...(existing.pastCompanies || []),
    ...(fresh.pastCompanies || [])
  ])).filter(Boolean);

  // 4. Merge education
  const mergedEducation = Array.from(new Set([
    ...(existing.education || []),
    ...(fresh.education || []),
    ...(existing.academicPath ? [existing.academicPath] : []),
    ...(fresh.academicPath ? [fresh.academicPath] : [])
  ])).filter(Boolean);

  // 5. Merge networking relevance
  const relevanceMap = new Map<string, NetworkingRelevanceItem>();
  (existing.networkingRelevance || []).forEach(item => {
    relevanceMap.set(item.type.toLowerCase().trim(), item);
  });
  (fresh.networkingRelevance || []).forEach(item => {
    const key = item.type.toLowerCase().trim();
    const prev = relevanceMap.get(key);
    if (!prev) {
      relevanceMap.set(key, item);
    } else {
      relevanceMap.set(key, {
        type: item.type || prev.type,
        pillar: item.pillar || prev.pillar || item.type,
        context: item.context || prev.context || item.reason || prev.reason,
        recommendation: item.recommendation || prev.recommendation,
        confidence: confidenceWeight(item.confidence) >= confidenceWeight(prev.confidence) ? item.confidence : prev.confidence,
        reason: item.reason || prev.reason || item.context || prev.context
      });
    }
  });

  // 6. Prefer the most detailed text field
  const pickBestString = (currentVal?: string, incomingVal?: string): string => {
    const c = (currentVal || "").trim();
    const i = (incomingVal || "").trim();
    if (!c) return i;
    if (!i) return c;
    // If incoming is substantially longer/better, choose incoming; otherwise preserve current
    return i.length > c.length ? i : c;
  };

  // 7. Calculate best relevance score
  const bestRelevance = Math.max(existing.relevanceScore || 50, fresh.relevanceScore || 50);

  // 8. History event for the merge
  const nowIso = new Date().toISOString();
  const dateFormatted = new Date().toLocaleDateString("fr-FR");
  const mergeHistoryEvent = {
    id: "hist_" + Math.random().toString(36).substring(2, 9),
    type: "profile_updated" as const,
    label: `Enrichissement multidimensionnel LinkedIn (${dateFormatted})`,
    timestamp: nowIso
  };

  const updatedNotes = existing.notes
    ? `${existing.notes}\n• [${dateFormatted}] Fusion intelligente avec export LinkedIn : profils et classifications consolidés.`
    : (fresh.notes || `Fiche enrichie via import LinkedIn (${dateFormatted}).`);

  return {
    ...existing,
    fullName: pickBestString(existing.fullName, fresh.fullName) || existing.fullName,
    firstName: existing.firstName || fresh.firstName || existing.fullName.split(" ")[0] || "Inconnu",
    lastName: existing.lastName || fresh.lastName || existing.fullName.split(" ").slice(1).join(" ") || "",
    companyName: pickBestString(existing.companyName, fresh.companyName) || existing.companyName,
    companyId: existing.companyId || fresh.companyId || "",
    jobTitle: pickBestString(existing.jobTitle, fresh.jobTitle) || existing.jobTitle,
    normalizedJobTitle: pickBestString(existing.normalizedJobTitle, fresh.normalizedJobTitle) || existing.normalizedJobTitle,
    category: computePrimaryCategory(mergedCategories, existing.category || fresh.category),
    categories: mergedCategories,
    relevanceScore: bestRelevance,
    connectionPoints: mergedConnectionPoints.length > 0 ? mergedConnectionPoints : ["Contact réseau LinkedIn"],
    academicPath: pickBestString(existing.academicPath, fresh.academicPath),
    previousCompanies: mergedPastCompanies,
    pastCompanies: mergedPastCompanies,
    education: mergedEducation,
    email: existing.email || fresh.email,
    phone: existing.phone || fresh.phone,
    linkedInUrl: existing.linkedInUrl || fresh.linkedInUrl,
    contactUrl: existing.contactUrl || fresh.contactUrl,
    notes: updatedNotes,
    sector: pickBestString(existing.sector, fresh.sector),
    profileLevel: pickBestString(existing.profileLevel, fresh.profileLevel),
    professionalProfile: {
      currentFunction: pickBestString(existing.professionalProfile?.currentFunction, fresh.professionalProfile?.currentFunction),
      level: pickBestString(existing.profileLevel || existing.professionalProfile?.level, fresh.profileLevel || fresh.professionalProfile?.level),
      sector: pickBestString(existing.sector || existing.professionalProfile?.sector, fresh.sector || fresh.professionalProfile?.sector),
      company: pickBestString(existing.companyName, fresh.companyName),
      isTargetSector: existing.professionalProfile?.isTargetSector ?? fresh.professionalProfile?.isTargetSector
    },
    networkingRelevance: Array.from(relevanceMap.values()),
    summary: pickBestString(existing.summary, fresh.summary),
    history: [mergeHistoryEvent, ...(existing.history || [])]
  };
}

/**
 * Returns visual badge styling conforming to NACORA Dark Liquid Glass design rules
 */
export function getCategoryBadgeStyle(category: string, subcategory?: string): {
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  label: string;
} {
  const normCat = (category || "").toLowerCase();
  const normSub = (subcategory || "").toLowerCase();

  const makeResult = (bg: string, text: string, border: string, lbl: string) => ({
    badgeBg: bg,
    badgeText: text,
    badgeBorder: border,
    bgColor: bg,
    textColor: text,
    borderColor: border,
    label: lbl
  });

  // Semantic Liquid Glass: Refined translucent tints for immediate visual identification
  if (normCat === "recruitment" || normSub.includes("recrut") || normSub.includes("talent") || normSub.includes("rh")) {
    return makeResult(
      "bg-[rgba(18,183,106,0.12)]",
      "text-[#34D399]",
      "border-[rgba(18,183,106,0.25)]",
      subcategory || "Recruteur / RH"
    );
  }

  if (normCat === "academic" || normSub.includes("alumni") || normSub.includes("ancien") || normSub.includes("uca") || normSub.includes("iut") || normSub.includes("école") || normSub.includes("diplôm")) {
    return makeResult(
      "bg-[rgba(56,189,248,0.12)]",
      "text-[#38BDF8]",
      "border-[rgba(56,189,248,0.25)]",
      subcategory || "Alumni"
    );
  }

  if (
    normCat === "professional_function" && (normSub.includes("finance") || normSub.includes("banque") || normSub.includes("patrimoine") || normSub.includes("crédit") || normSub.includes("gestion")) ||
    normCat === "sector" && (normSub.includes("banque") || normSub.includes("finance") || normSub.includes("fintech") || normSub.includes("assurance"))
  ) {
    return makeResult(
      "bg-[rgba(216,26,69,0.14)]",
      "text-[#FF6685]",
      "border-[rgba(216,26,69,0.28)]",
      subcategory || "Finance / Banque"
    );
  }

  if (normCat === "seniority" || normSub.includes("manager") || normSub.includes("directeur") || normSub.includes("head") || normSub.includes("lead") || normSub.includes("senior")) {
    return makeResult(
      "bg-[rgba(247,144,9,0.12)]",
      "text-[#FBBF24]",
      "border-[rgba(247,144,9,0.25)]",
      subcategory || "Manager / Dirigeant"
    );
  }

  if (normCat === "status" || normSub.includes("étudiant") || normSub.includes("etudiant") || normSub.includes("alternant") || normSub.includes("stagiaire") || normSub.includes("apprenti")) {
    return makeResult(
      "bg-[rgba(192,132,252,0.12)]",
      "text-[#C084FC]",
      "border-[rgba(192,132,252,0.25)]",
      subcategory || "Étudiant / Alternant"
    );
  }

  if (normCat === "networking" || normCat === "professional_relation") {
    return makeResult(
      "bg-[rgba(99,102,241,0.12)]",
      "text-[#818CF8]",
      "border-[rgba(99,102,241,0.25)]",
      subcategory || "Réseau Pro"
    );
  }

  return makeResult(
    "bg-white/[0.05]",
    "text-[#E2E8F0]",
    "border-white/12",
    subcategory || "Professionnel"
  );
}
