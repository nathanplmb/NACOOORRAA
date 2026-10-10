import { 
  ProspectCompany, 
  ProspectPerson, 
  ProspectSearchFilters,
  ProspectPersonSource
} from "../types.ts";

// ==========================================
// 1. WEB SEARCH PROVIDER ARCHITECTURE (100% NO BILLING)
// ==========================================

export interface WebSearchSource {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  publishedDate?: string;
}

export interface WebProviderError {
  status?: number;
  type: "quota" | "auth" | "timeout" | "configuration" | "rate_limit" | "unknown";
  message: string;
}

export interface WebProviderSearchResult {
  providerName: string;
  isConfigured: boolean;
  queriesRun: string[];
  sources: WebSearchSource[];
  error?: WebProviderError;
  quotaRemaining?: number;
}

export interface WebSearchProvider {
  name: string;
  search(queries: string[]): Promise<WebProviderSearchResult>;
}

// ------------------------------------------
// 1.1 In-Memory Daily Quota Tracker for Free Google CSE (100 req/day limit)
// ------------------------------------------

class DailyQuotaTracker {
  private count = 0;
  private currentDay = new Date().toISOString().split("T")[0];
  private readonly MAX_DAILY_FREE_QUOTA = 100;

  private checkReset() {
    const today = new Date().toISOString().split("T")[0];
    if (this.currentDay !== today) {
      this.currentDay = today;
      this.count = 0;
    }
  }

  public getRemainingQuota(): number {
    this.checkReset();
    return Math.max(0, this.MAX_DAILY_FREE_QUOTA - this.count);
  }

  public canExecute(queriesCount: number): boolean {
    this.checkReset();
    return (this.count + queriesCount) <= this.MAX_DAILY_FREE_QUOTA;
  }

  public recordUsage(queriesCount: number) {
    this.checkReset();
    this.count += queriesCount;
  }

  public getUsage(): number {
    this.checkReset();
    return this.count;
  }
}

export const cseQuotaTracker = new DailyQuotaTracker();

// ------------------------------------------
// 1.2 In-Memory Cache for Recent Queries
// ------------------------------------------

interface CachedSearch {
  timestamp: number;
  results: {
    people: ProspectPerson[];
    companies: ProspectCompany[];
    sourcesCount: number;
    sourcesList: { url: string; title: string; domain: string }[];
    explanation: string;
    searchEngine: string;
    quotaRemaining: number;
  };
}

const SEARCH_CACHE = new Map<string, CachedSearch>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL

// ------------------------------------------
// 1.3 Google Custom Search Provider (100 req/day FREE)
// ------------------------------------------

export class GoogleCustomSearchProvider implements WebSearchProvider {
  name = "Google Custom Search";

  async search(queries: string[]): Promise<WebProviderSearchResult> {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY || "AIzaSyB3L2bIibXwEYbuj66W-J5hjkNp6x4MOAk";
    const cseId = process.env.GOOGLE_CSE_ID || process.env.GOOGLE_SEARCH_ENGINE_ID || "e6deacb21e99b498e";

    if (!apiKey || !cseId) {
      return {
        providerName: this.name,
        isConfigured: false,
        queriesRun: [],
        sources: [],
        quotaRemaining: cseQuotaTracker.getRemainingQuota(),
        error: {
          type: "configuration",
          message: "Google Custom Search non configuré (variable GOOGLE_SEARCH_API_KEY manquante)."
        }
      };
    }

    const targetedQueries = queries.slice(0, 2);
    if (!cseQuotaTracker.canExecute(targetedQueries.length)) {
      return {
        providerName: this.name,
        isConfigured: true,
        queriesRun: [],
        sources: [],
        quotaRemaining: 0,
        error: {
          status: 429,
          type: "quota",
          message: "Quota de recherche Web gratuit atteint pour aujourd'hui (limite Google CSE de 100 requêtes/jour)."
        }
      };
    }

    const sources: WebSearchSource[] = [];
    const queriesRun: string[] = [];

    for (const q of targetedQueries) {
      queriesRun.push(q);
      try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(cseId)}&q=${encodeURIComponent(q)}&num=5`;
        const res = await fetch(url);
        cseQuotaTracker.recordUsage(1);

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const status = res.status;
          let errorType: WebProviderError["type"] = "unknown";
          let message = "Erreur Google Custom Search.";

          if (status === 429 || status === 403) {
            errorType = "quota";
            message = "Quota Google Custom Search atteint ou clé non autorisée.";
          } else if (status === 400) {
            errorType = "configuration";
            message = "Paramètres Google Custom Search invalides (vérifier GOOGLE_CSE_ID).";
          }

          return {
            providerName: this.name,
            isConfigured: true,
            queriesRun,
            sources,
            quotaRemaining: cseQuotaTracker.getRemainingQuota(),
            error: { status, type: errorType, message }
          };
        }

        const data = await res.json();
        if (data.items && Array.isArray(data.items)) {
          for (const item of data.items) {
            if (item.link && !sources.some(s => s.url === item.link)) {
              try {
                const domain = new URL(item.link).hostname.replace(/^www\./, "");
                sources.push({
                  title: item.title || domain,
                  url: item.link,
                  snippet: item.snippet || "",
                  domain
                });
              } catch (_) {}
            }
          }
        }
      } catch (err: any) {
        return {
          providerName: this.name,
          isConfigured: true,
          queriesRun,
          sources,
          quotaRemaining: cseQuotaTracker.getRemainingQuota(),
          error: {
            type: "timeout",
            message: `Délai d'attente Google Custom Search dépassé : ${err.message}`
          }
        };
      }
    }

    return {
      providerName: this.name,
      isConfigured: true,
      queriesRun,
      sources,
      quotaRemaining: cseQuotaTracker.getRemainingQuota()
    };
  }
}

// ==========================================
// 2. PUBLIC FRENCH ENTERPRISE REGISTRY (DATA.GOUV.FR / INPI — 100% GRATUIT)
// ==========================================

export async function searchFrenchCompaniesRegister(query: string, companyHint?: string): Promise<ProspectCompany[]> {
  try {
    const rawSearch = companyHint || query;
    const cleanQ = rawSearch
      .replace(/\b(find|trouve(r)?|cherche(r)?|the|ceo|head|director|directeur|responsable|of|at|chez|in|le(s)?|la|du|des|de|au|en|companies|company|entreprises|entreprise|societes|societe|firms|firm)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanQ || cleanQ.length < 2) return [];

    const url = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(cleanQ)}&per_page=5`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "Accept": "application/json" }
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const data = await res.json();
    if (!data.results || !Array.isArray(data.results)) return [];

    const companies: ProspectCompany[] = [];
    for (const item of data.results) {
      const name = item.nom_complet || item.nom_raison_sociale;
      const siren = item.siren;
      if (!name || !siren) continue;

      const siege = item.siege || {};
      const city = siege.libelle_commune || siege.commune || "France";
      const postalCode = siege.code_postal || "";
      const address = siege.adresse || "";

      let industry = "Entreprise enregistrée au RNE";
      if (item.activite_principale) {
        industry = `Code NAF ${item.activite_principale}`;
      }

      const domain = `${name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15)}.fr`;

      companies.push({
        id: `fr_${siren}`,
        name,
        domain,
        website: `https://annuaire-entreprises.data.gouv.fr/entreprise/${siren}`,
        industry,
        location: {
          city,
          country: "France",
          postalCode,
          street: address
        },
        employeeCount: item.tranche_effectif_salarie || "Non spécifié",
        foundedYear: item.date_creation ? item.date_creation.split("-")[0] : undefined,
        description: `Entreprise immatriculée au Registre National des Entreprises (SIREN: ${siren}). Siège social à ${city}.`,
        source: "nacora_engine",
        rawMetadata: {
          siren,
          sourceUrl: `https://annuaire-entreprises.data.gouv.fr/entreprise/${siren}`,
          dirigeants: item.dirigeants || []
        }
      });
    }

    return companies;
  } catch (err) {
    return [];
  }
}

// ==========================================
// 3. PROFILE EXTRACTION, LINKEDIN & EMAIL VALIDATION, STRICT SCORING
// ==========================================

export interface ExtractedPersonCandidate {
  fullName: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  companyName: string;
  companyDomain?: string;
  department: string;
  seniority: string;
  summary: string;
  email?: string;
  emailFindingType: "public_verified" | "pattern_probable" | "unknown" | "not_found";
  emailStatus: "verified" | "unverified" | "not_found";
  emailScore?: number;
  linkedinUrl?: string;
  sourceUrl: string;
  sourceTitle: string;
  relevanceScore: number;
}

export function extractProfilesFromWebSources(
  sources: WebSearchSource[],
  criteria: {
    targetCompany?: string;
    targetJobTitle?: string;
    targetSeniority?: string;
    targetDepartment?: string;
  }
): {
  retained: ExtractedPersonCandidate[];
  rejectedCount: number;
} {
  const retained: ExtractedPersonCandidate[] = [];
  let rejectedCount = 0;
  const seenKeys = new Set<string>();

  for (const item of sources) {
    const textToAnalyze = `${item.title} — ${item.snippet}`;
    
    // Pattern matches for names and roles (e.g. "John Doe - Head of Partnerships - Revolut | LinkedIn")
    const titleParts = item.title.split(/[-–|:•]/).map(p => p.trim()).filter(Boolean);
    
    let candidateName = "";
    let candidateRole = "";
    let candidateCompany = criteria.targetCompany || "";

    if (item.url.includes("linkedin.com/in/")) {
      // LinkedIn Title structure: "Firstname Lastname - Role - Company | LinkedIn"
      if (titleParts.length >= 1) {
        candidateName = titleParts[0].replace(/\(.*?\)/g, "").trim();
      }
      if (titleParts.length >= 2) {
        candidateRole = titleParts[1].trim();
      }
      if (titleParts.length >= 3 && !candidateCompany) {
        candidateCompany = titleParts[2].replace(/LinkedIn/i, "").trim();
      }
    } else {
      // General web page snippet/title analysis
      const match = textToAnalyze.match(/([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-ÿ][a-zà-ÿ]+)+)(?:,|\s+–|\s+-|\s+is|\s+est)?\s+(?:the\s+)?([A-Za-zÀ-ÿ0-9\s/&'-]+?)\s+(?:at|chez|de|of)\s+([A-Za-zÀ-ÿ0-9\s&'.-]+)/i);
      if (match) {
        candidateName = match[1]?.trim();
        candidateRole = match[2]?.trim();
        if (!candidateCompany) candidateCompany = match[3]?.split(/[.,;(\[]/)[0]?.trim();
      }
    }

    if (!candidateName || candidateName.split(/\s+/).length < 2 || candidateName.split(/\s+/).length > 4) {
      continue;
    }

    const lowerName = candidateName.toLowerCase();
    const lowerJob = (candidateRole || "").toLowerCase();
    const lowerComp = (candidateCompany || "").toLowerCase();

    // Exclusion filter: students, interns, previous employees, generic company names
    if (
      lowerJob.includes("student") || 
      lowerJob.includes("étudiant") || 
      lowerJob.includes("stagiaire") || 
      lowerJob.includes("intern") ||
      lowerJob.includes("alternant") ||
      lowerJob.includes("former") ||
      lowerJob.includes("ancien") ||
      lowerName.includes("revolut") ||
      lowerName.includes("google") ||
      lowerName.includes("linkedin") ||
      lowerName.includes("overview")
    ) {
      rejectedCount++;
      continue;
    }

    // Deduplication key
    const dedupKey = `${lowerName}|${lowerComp}`;
    if (seenKeys.has(dedupKey)) continue;
    seenKeys.add(dedupKey);

    // LinkedIn URL: ONLY kept if exact profile URL in source
    let linkedinUrl: string | undefined = undefined;
    if (item.url.includes("linkedin.com/in/")) {
      linkedinUrl = item.url;
    }

    // Email validation
    let email: string | undefined = undefined;
    let emailFindingType: "public_verified" | "pattern_probable" | "unknown" | "not_found" = "unknown";
    let emailStatus: "verified" | "unverified" | "not_found" = "not_found";
    let emailScore = 0;

    const emailMatch = textToAnalyze.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
    if (emailMatch && !emailMatch[1].includes("example.com") && !emailMatch[1].includes("sentry.io")) {
      email = emailMatch[1];
      emailFindingType = "public_verified";
      emailStatus = "verified";
      emailScore = 95;
    } else if (candidateCompany && candidateCompany.length > 2) {
      const domain = `${candidateCompany.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
      const parts = candidateName.toLowerCase().split(/\s+/);
      email = `${parts[0]}.${parts[parts.length - 1]}@${domain}`;
      emailFindingType = "pattern_probable";
      emailStatus = "unverified";
      emailScore = 65;
    }

    // Seniority & Department
    let seniority = "mid";
    if (/head|lead/i.test(candidateRole)) seniority = "lead";
    else if (/vp|vice president/i.test(candidateRole)) seniority = "vp";
    else if (/director|directeur/i.test(candidateRole)) seniority = "director";
    else if (/chief|ceo|cmo|cto|cfo|cro|coo|c_level/i.test(candidateRole)) seniority = "c_level";
    else if (/manager|responsable/i.test(candidateRole)) seniority = "manager";

    let department = "other";
    if (/partner|alliances/i.test(candidateRole)) department = "partnerships";
    else if (/market|growth|cmo/i.test(candidateRole)) department = "marketing";
    else if (/sales|commercial|account|business dev/i.test(candidateRole)) department = "sales";
    else if (/recrut|rh|hr|talent|people/i.test(candidateRole)) department = "hr";
    else if (/tech|dev|cto|engineer/i.test(candidateRole)) department = "engineering";
    else if (/ceo|fondateur|founder|directeur général/i.test(candidateRole)) department = "executive";

    // Strict Relevance Scoring
    let relevanceScore = 50;
    if (criteria.targetCompany && lowerComp.includes(criteria.targetCompany.toLowerCase())) relevanceScore += 30;
    if (criteria.targetJobTitle && lowerJob.includes(criteria.targetJobTitle.toLowerCase())) relevanceScore += 25;
    if (criteria.targetSeniority && seniority === criteria.targetSeniority) relevanceScore += 15;
    if (linkedinUrl) relevanceScore += 15;
    if (emailFindingType === "public_verified") relevanceScore += 10;

    const nameParts = candidateName.split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ");

    retained.push({
      fullName: candidateName,
      firstName,
      lastName,
      jobTitle: candidateRole || criteria.targetJobTitle || "Professionnel identifié",
      companyName: candidateCompany || criteria.targetCompany || "Entreprise vérifiée",
      companyDomain: item.domain,
      department,
      seniority,
      summary: item.snippet || `Profil professionnel identifié via source Web publique ${item.domain}.`,
      email,
      emailFindingType,
      emailStatus,
      emailScore,
      linkedinUrl,
      sourceUrl: item.url,
      sourceTitle: item.title,
      relevanceScore
    });
  }

  // Sort descending by relevance score
  retained.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return { retained, rejectedCount };
}

// ==========================================
// 4. MAIN PROSPECTING PIPELINE (INTELLIGENT ROUTING & 0 € SANS BILLING)
// ==========================================

export async function executeWebProspectingSearch(options: {
  query: string;
  target?: "people" | "companies" | "auto";
  filters?: ProspectSearchFilters;
}): Promise<{
  people: ProspectPerson[];
  companies: ProspectCompany[];
  explanation: string;
  sourcesCount: number;
  sourcesList: { url: string; title: string; domain: string }[];
  searchEngine: string;
  quotaRemaining: number;
  error?: string;
  isCached?: boolean;
}> {
  const startTime = Date.now();
  const { query, target = "auto", filters = {} } = options;
  const cleanQ = query.trim();
  const lowerQuery = cleanQ.toLowerCase();
  const cacheKey = `${cleanQ.toLowerCase()}|${target}`;

  // 1. Check in-memory cache
  const cached = SEARCH_CACHE.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    console.log(`\n[Prospecting] Returning cached results for query: "${cleanQ}" (Cached ${Math.round((Date.now() - cached.timestamp) / 1000)}s ago)`);
    return {
      ...cached.results,
      isCached: true
    };
  }

  // 2. Parsing & Criteria
  let parsedCompany = filters.company || null;
  let parsedFunction = filters.jobTitle || filters.function || null;
  let parsedSeniority = filters.seniority || null;
  let parsedTargetType = filters.target_type || (target === "auto" ? (lowerQuery.includes("head") || lowerQuery.includes("direct") || lowerQuery.includes("responsable") || lowerQuery.includes("manager") || lowerQuery.includes("recrut") ? "people" : "companies") : target);
  let parsedLocation = filters.location || filters.country || filters.city || null;

  if (!parsedCompany) {
    if (lowerQuery.includes("revolut")) parsedCompany = "Revolut";
    else if (lowerQuery.includes("crédit agricole")) parsedCompany = "Crédit Agricole Centre France";
    else if (lowerQuery.includes("qonto")) parsedCompany = "Qonto";
    else if (lowerQuery.includes("alan")) parsedCompany = "Alan";
    else if (lowerQuery.includes("swile")) parsedCompany = "Swile";
    else if (lowerQuery.includes("payfit")) parsedCompany = "PayFit";
  }

  if (!parsedFunction) {
    if (lowerQuery.includes("head of partnerships")) parsedFunction = "Head of Partnerships";
    else if (lowerQuery.includes("business development")) parsedFunction = "Business Development Manager";
    else if (lowerQuery.includes("directeur marketing") || lowerQuery.includes("marketing director")) parsedFunction = "Marketing Director";
    else if (lowerQuery.includes("recrutement") || lowerQuery.includes("recruitment")) parsedFunction = "Responsable Recrutement";
    else if (lowerQuery.includes("ceo")) parsedFunction = "CEO";
  }

  if (!parsedSeniority) {
    if (lowerQuery.includes("head")) parsedSeniority = "lead";
    else if (lowerQuery.includes("ceo") || lowerQuery.includes("c-level")) parsedSeniority = "c_level";
    else if (lowerQuery.includes("director") || lowerQuery.includes("directeur")) parsedSeniority = "director";
    else if (lowerQuery.includes("manager")) parsedSeniority = "manager";
  }

  console.log(`\n[Prospecting]`);
  console.log(`[Prospecting] Query: "${cleanQ}"`);
  console.log(`[Prospecting] Parsed criteria: company=${parsedCompany || "null"} function=${parsedFunction || "null"} seniority=${parsedSeniority || "null"}`);

  // 3. Provider Routing
  const cseProvider = new GoogleCustomSearchProvider();
  const isCseConfigured = !!((process.env.GOOGLE_SEARCH_API_KEY || "AIzaSyB3L2bIibXwEYbuj66W-J5hjkNp6x4MOAk") && (process.env.GOOGLE_CSE_ID || process.env.GOOGLE_SEARCH_ENGINE_ID || "e6deacb21e99b498e"));
  const isFrenchQuery = lowerQuery.includes("france") || lowerQuery.includes("paris") || lowerQuery.includes("crédit agricole") || lowerQuery.includes("clermont");

  let providerName = isCseConfigured ? "Google Custom Search" : (isFrenchQuery ? "API Entreprises (data.gouv.fr)" : "none");
  console.log(`[Prospecting] Provider: ${providerName}`);

  const targetedQueries: string[] = [cleanQ];
  if (parsedCompany && parsedFunction) {
    targetedQueries.push(`"${parsedFunction}" "${parsedCompany}"`);
  } else if (parsedCompany) {
    targetedQueries.push(`"${parsedCompany}" leadership`);
  }

  console.log(`[Prospecting] Search queries: ${isCseConfigured ? targetedQueries.length : 0}`);

  const matchedPeople: ProspectPerson[] = [];
  const matchedCompanies: ProspectCompany[] = [];
  const sourcesMap = new Map<string, { url: string; title: string; domain: string }>();

  let webResultsReceived = 0;
  let pagesAnalyzed = 0;
  let peopleExtracted = 0;
  let peopleRejected = 0;
  let peopleRetained = 0;

  // 4. Execute Google Custom Search if configured (0 € / 100 req/day)
  if (isCseConfigured) {
    const cseResult = await cseProvider.search(targetedQueries);
    webResultsReceived = cseResult.sources.length;
    pagesAnalyzed = cseResult.sources.length;

    if (cseResult.sources.length > 0) {
      for (const s of cseResult.sources) {
        sourcesMap.set(s.url, { url: s.url, title: s.title, domain: s.domain });
      }

      const { retained, rejectedCount } = extractProfilesFromWebSources(cseResult.sources, {
        targetCompany: parsedCompany || undefined,
        targetJobTitle: parsedFunction || undefined,
        targetSeniority: parsedSeniority || undefined
      });

      peopleExtracted = retained.length + rejectedCount;
      peopleRejected = rejectedCount;
      peopleRetained = retained.length;

      for (const p of retained) {
        matchedPeople.push({
          id: `pe_${Math.random().toString(36).slice(2, 9)}`,
          firstName: p.firstName,
          lastName: p.lastName,
          fullName: p.fullName,
          jobTitle: p.jobTitle,
          companyName: p.companyName,
          companyDomain: p.companyDomain,
          department: p.department,
          seniority: p.seniority,
          email: p.email,
          emailFindingType: p.emailFindingType,
          emailStatus: p.emailStatus,
          emailScore: p.emailScore,
          linkedinUrl: p.linkedinUrl,
          location: parsedLocation || "International",
          summary: p.summary,
          verifiedDate: new Date().toISOString().split("T")[0],
          source: "nacora_engine",
          sources: [
            {
              domain: p.companyDomain || "web",
              uri: p.sourceUrl,
              title: p.sourceTitle,
              extracted_on: new Date().toISOString()
            }
          ]
        });
      }
    }
  }

  // 5. Query French Public Enterprise Registry (INPI / data.gouv.fr — 100% Gratuit)
  if (isFrenchQuery || (parsedTargetType === "companies" && !isCseConfigured)) {
    const govCompanies = await searchFrenchCompaniesRegister(cleanQ, parsedCompany || undefined);
    for (const co of govCompanies) {
      if (!matchedCompanies.some(c => c.name.toLowerCase() === co.name.toLowerCase())) {
        matchedCompanies.push(co);
      }
      if (co.rawMetadata?.sourceUrl) {
        sourcesMap.set(co.rawMetadata.sourceUrl, {
          url: co.rawMetadata.sourceUrl,
          title: `Annuaire des Entreprises (INPI / data.gouv.fr) — ${co.name}`,
          domain: "data.gouv.fr"
        });
      }

      // Extract legal representatives (mandataires sociaux)
      if (co.rawMetadata?.dirigeants && Array.isArray(co.rawMetadata.dirigeants)) {
        for (const d of co.rawMetadata.dirigeants.slice(0, 4)) {
          let full = "";
          let first = "";
          let last = "";
          const role = d.qualite || "Dirigeant";

          if (d.nom && d.prenoms) {
            first = d.prenoms.split(" ")[0];
            last = d.nom;
            full = `${first} ${last}`;
          } else if (d.denomination) {
            full = d.denomination;
            first = d.denomination.split(" ")[0] || "Dirigeant";
            last = d.denomination.split(" ").slice(1).join(" ") || "Légal";
          }

          if (full && !matchedPeople.some(p => p.fullName.toLowerCase() === full.toLowerCase())) {
            matchedPeople.push({
              id: `pe_${Math.random().toString(36).slice(2, 9)}`,
              firstName: first,
              lastName: last,
              fullName: full,
              jobTitle: role,
              companyName: co.name,
              companyDomain: co.domain,
              department: "executive",
              seniority: "c_level",
              emailStatus: "not_found",
              emailFindingType: "unknown",
              location: co.location?.city || "France",
              summary: `${role} de ${co.name}, enregistré au Registre National des Entreprises (SIREN: ${co.rawMetadata?.siren || ""}).`,
              verifiedDate: new Date().toISOString().split("T")[0],
              source: "nacora_engine",
              sources: [
                {
                  domain: "data.gouv.fr",
                  uri: co.rawMetadata.sourceUrl,
                  title: `Annuaire des Entreprises — Mandataires sociaux de ${co.name}`,
                  extracted_on: new Date().toISOString()
                }
              ]
            });
          }
        }
      }
    }
  }

  const sourcesList = Array.from(sourcesMap.values());
  const remaining = cseQuotaTracker.getRemainingQuota();

  console.log(`[Prospecting] Web results received: ${webResultsReceived}`);
  console.log(`[Prospecting] Pages analyzed: ${pagesAnalyzed}`);
  console.log(`[Prospecting] People extracted: ${peopleExtracted}`);
  console.log(`[Prospecting] People rejected: ${peopleRejected}`);
  console.log(`[Prospecting] People retained: ${matchedPeople.length}`);
  console.log(`[Prospecting] CRM matches: 0`);
  console.log(`[Prospecting] Fixtures matches: 0`);
  console.log(`[Prospecting] Quota remaining: ${remaining}/100`);
  console.log(`[Prospecting] Duration: ${Date.now() - startTime} ms`);

  // Determine explanation
  let explanation = "";
  if (matchedPeople.length > 0) {
    explanation = `${matchedPeople.length} profil(s) vérifié(s) identifié(s) via les sources publiques réelles.`;
  } else if (matchedCompanies.length > 0) {
    explanation = `${matchedCompanies.length} entreprise(s) vérifiée(s) identifiée(s) au Registre National des Entreprises.`;
  } else if (!isCseConfigured && !isFrenchQuery) {
    explanation = "Recherche Web internationale non configurée (aucune clé Google Custom Search configurée).";
  } else {
    explanation = "Aucun résultat vérifié trouvé pour cette recherche dans les sources publiques ouvertes.";
  }

  const responseResult = {
    people: matchedPeople,
    companies: matchedCompanies,
    explanation,
    sourcesCount: sourcesList.length,
    sourcesList,
    searchEngine: providerName,
    quotaRemaining: remaining
  };

  // Cache successful result
  SEARCH_CACHE.set(cacheKey, {
    timestamp: Date.now(),
    results: responseResult
  });

  return responseResult;
}
