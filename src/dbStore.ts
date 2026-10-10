import { 
  CandidateProfile, 
  Opportunity, 
  Contact, 
  Company, 
  CalendarEvent, 
  DocumentFile, 
  ChatSession,
  ProspectLead,
  ProspectList,
  SavedSearch,
  ProspectActivityLog,
  ProspectingSettings,
  AiUsageRecord,
  AiUsageSettings
} from "./types";
import { db, auth } from "./firebase";
import { 
  doc, 
  setDoc, 
  getDoc,
  disableNetwork
} from "firebase/firestore";
import { isHumanResourcesRole, isBankingAndFinanceRole } from "./utils/contactMerger";
import { classifyContactFunction } from "./utils/contactTaxonomy";
import { resolveCompany, isSameCompany } from "./utils/companyResolver";
import { isSponsoredOrAdvertisingName, mergeContactData, normalizePersonName } from "./utils/contactResolver";
import { SEED_CONTACTS } from "./data/initialContacts";
import { generateInitialAiUsageRecords } from "./data/initialAiUsage";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

export const calculateProfileCompletion = (p: CandidateProfile): { score: number; completedSections: number; totalSections: number; sectionsStatus: Record<string, boolean> } => {
  const sectionsStatus = {
    identity: Boolean(p.fullName && p.email && p.title && p.city),
    objectives: Boolean((p.targetTitles && p.targetTitles.length > 0) && (p.contractTypes && p.contractTypes.length > 0)),
    experiences: Boolean(p.experiences && p.experiences.length > 0),
    educations: Boolean(p.educations && p.educations.length > 0),
    skills: Boolean((p.hardSkills && p.hardSkills.length > 0) || (p.skills && p.skills.length > 0)),
    languages: Boolean((p.languagesList && p.languagesList.length > 0) || (p.languages && p.languages.length > 0)),
    certifications: Boolean((p.certificationsList && p.certificationsList.length > 0) || (p.certifications && p.certifications.length > 0)),
    projects: Boolean((p.projectsList && p.projectsList.length > 0) || (p.volunteerWork && p.volunteerWork.length > 0) || (p.projects && p.projects.length > 0)),
    interests: Boolean(p.interests && p.interests.length > 0)
  };

  const completedSections = Object.values(sectionsStatus).filter(Boolean).length;
  const totalSections = 9;
  const score = Math.round((completedSections / totalSections) * 100);

  return { score, completedSections, totalSections, sectionsStatus };
};

export const createDefaultProfile = (
  id: string = "profile",
  email: string = "",
  fullName: string = ""
): CandidateProfile => {
  const baseProfile: CandidateProfile = {
    id,
    firstName: fullName ? fullName.split(" ")[0] : "",
    lastName: fullName ? fullName.split(" ").slice(1).join(" ") : "",
    fullName: fullName || "",
    email: email || "",
    phone: "",
    title: "Candidat(e) en recherche d'opportunités",
    avatarUrl: "",
    driverLicense: "",
    city: "",
    country: "France",
    mobility: "France entière",
    linkedInUrl: "",
    portfolioUrl: "",
    githubUrl: "",

    currentSituation: "",
    currentAlternance: "",
    bio: "",

    targetTitles: [],
    targetSectors: [],
    targetCompanies: [],
    contractTypes: ["Alternance", "Stage", "CDI", "VIE"],
    startDateTarget: "",
    durationTarget: "",
    minSalary: "",
    workMode: "hybride",
    idealPositionSearch: "",
    avoidSectors: [],
    redFlags: [],

    experiences: [],
    educations: [],
    hardSkills: [],
    toolsAndSoftware: [],
    softSkills: [],
    languagesList: [],
    certificationsList: [],
    projectsList: [],
    volunteerWork: [],
    interests: [],

    skills: [],
    targetMasters: [],
    languages: [],
    certifications: [],
    projects: [],

    profileCompletionScore: 0
  };

  const { score } = calculateProfileCompletion(baseProfile);
  baseProfile.profileCompletionScore = score;
  return baseProfile;
};

function cleanForFirestore<T>(input: T): T {
  if (input === undefined) {
    return null as any;
  }
  if (input === null || typeof input !== "object") {
    return input;
  }
  if (Array.isArray(input)) {
    return input.map(item => cleanForFirestore(item)) as any;
  }
  const cleanObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(input as Record<string, any>)) {
    if (value !== undefined) {
      cleanObj[key] = cleanForFirestore(value);
    }
  }
  return cleanObj as T;
}

const INITIAL_PROFILE = createDefaultProfile();
const INITIAL_COMPANIES: Company[] = [
  {
    id: "comp_ca_cf",
    name: "Crédit Agricole Centre France",
    sector: "Banque & Finance",
    location: "Clermont-Ferrand",
    description: "Banque coopérative et mutualiste régionale leader sur l'Auvergne.",
    notes: "",
    createdAt: "2026-09-20T09:00:00.000Z",
    opportunityCount: 0,
    contactCount: 1,
    noteCount: 0
  }
];
const INITIAL_OPPORTUNITIES: Opportunity[] = [];
const INITIAL_CONTACTS: Contact[] = [...SEED_CONTACTS];
const INITIAL_CALENDAR: CalendarEvent[] = [];

const INITIAL_SESSIONS: ChatSession[] = [
  {
    id: "sess_welcome",
    personaId: "general",
    personaName: "Conseiller Carrière",
    title: "Bienvenue sur NACORA AI",
    messages: [
      {
        id: "msg_1",
        role: "model",
        text: "Bonjour ! Je suis ton conseiller de carrière intelligent NACORA. Je suis là pour t'accompagner dans la recherche, la préparation et le suivi de tes opportunités d'alternance, de stage ou de premier emploi. Comment puis-je t'aider aujourd'hui ?",
        timestamp: new Date().toISOString()
      }
    ],
    updatedAt: new Date().toISOString()
  }
];

const INITIAL_PROSPECT_LISTS: ProspectList[] = [
  {
    id: "list_fintech",
    name: "FinTech & Banking Leaders",
    description: "Décideurs et directeurs RH/Talent des institutions financières",
    color: "#38BDF8",
    leadsCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "list_saas",
    name: "SaaS & Scale-ups France",
    description: "Fondateurs et VP Sales / Marketing de scale-ups",
    color: "#C084FC",
    leadsCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const INITIAL_SAVED_SEARCHES: SavedSearch[] = [
  {
    id: "search_1",
    title: "Directeurs Marketing FinTech France",
    queryText: "Directeurs Marketing chez des fintechs en France",
    type: "people",
    filters: {
      jobTitle: "Directeur Marketing",
      industry: "FinTech",
      country: "France",
      department: "marketing"
    },
    resultsCount: 14,
    createdAt: new Date().toISOString(),
    lastRunAt: new Date().toISOString()
  },
  {
    id: "search_2",
    title: "Banques & Assurances Paris (500+ empl.)",
    queryText: "Banques et assurances à Paris plus de 500 employés",
    type: "companies",
    filters: {
      industry: "Banque / Finance",
      city: "Paris",
      companySize: "500+"
    },
    resultsCount: 8,
    createdAt: new Date().toISOString(),
    lastRunAt: new Date().toISOString()
  }
];

const INITIAL_PROSPECT_ACTIVITIES: ProspectActivityLog[] = [
  {
    id: "act_init",
    type: "search",
    title: "Moteur de prospection initialisé",
    description: "Moteur de recherche de décideurs et vérification certifiée opérationnel",
    provider: "nacora_engine",
    status: "success",
    timestamp: new Date().toISOString()
  }
];

const INITIAL_PROSPECTING_SETTINGS: ProspectingSettings = {
  activeProvider: "hybrid",
  autoVerifyEmails: true,
  remainingCredits: 100,
  usedCredits: 0,
  planName: "Registre NACORA Vérifié",
  emailAccount: "",
  lastCheckedAt: new Date().toISOString()
};

const INITIAL_AI_USAGE_SETTINGS: AiUsageSettings = {
  monthlyTokenLimit: null, // Ne jamais inventer une limite par défaut
  dailyTokenLimit: null,
  alertThresholds: [50, 75, 90, 100],
  providerLimitSource: "Google AI Studio / Gemini API"
};

class DBStore {
  private profile: CandidateProfile = INITIAL_PROFILE;
  private opportunities: Opportunity[] = [];
  private contacts: Contact[] = [];
  private companies: Company[] = [];
  private calendarEvents: CalendarEvent[] = [];
  private documents: DocumentFile[] = [];
  private chatSessions: ChatSession[] = INITIAL_SESSIONS;

  // B2B Prospecting Engine Collections
  private prospectLeads: ProspectLead[] = [];
  private prospectLists: ProspectList[] = INITIAL_PROSPECT_LISTS;
  private savedSearches: SavedSearch[] = INITIAL_SAVED_SEARCHES;
  private prospectActivities: ProspectActivityLog[] = INITIAL_PROSPECT_ACTIVITIES;
  private prospectingSettings: ProspectingSettings = INITIAL_PROSPECTING_SETTINGS;

  // Suivi de consommation IA & Tokens
  private aiUsageRecords: AiUsageRecord[] = generateInitialAiUsageRecords();
  private aiUsageSettings: AiUsageSettings = INITIAL_AI_USAGE_SETTINGS;

  private currentUserId: string | null = null;
  private isInitializingUserId: string | null = null;
  private syncTimeout: any = null;
  private listeners: Set<() => void> = new Set();
  private isQuotaExceeded: boolean = false;
  private syncBackoffUntil: number = 0;
  private isSyncing: boolean = false;
  private needsAnotherSync: boolean = false;
  private lastSyncSuccess: boolean = true;
  private cloudStatus: "connected" | "offline" | "error" | "quota_exceeded" = "offline";
  private lastCloudSyncTime: string | null = null;
  private lastCloudError: string | null = null;

  private checkQuotaExceeded(): boolean {
    if (this.isQuotaExceeded) return true;
    try {
      if (typeof window !== "undefined") {
        const storedTimestamp = localStorage.getItem("nacora_quota_exceeded_timestamp");
        if (storedTimestamp) {
          const timestamp = parseInt(storedTimestamp, 10);
          // Quotas reset daily (24 hours). If recorded in the last 24 hours, treat as exceeded.
          if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
            this.isQuotaExceeded = true;
            this.cloudStatus = "quota_exceeded";
            this.lastCloudError = "Quota journalier Firestore atteint. Sauvegarde locale active.";
            return true;
          } else {
            localStorage.removeItem("nacora_quota_exceeded_timestamp");
          }
        }
      }
    } catch (_) {}
    return false;
  }

  private markQuotaExceeded(reason?: string) {
    this.isQuotaExceeded = true;
    this.cloudStatus = "quota_exceeded";
    this.lastCloudError = reason || "Quota journalier Firestore atteint. Sauvegarde locale active.";
    this.lastSyncSuccess = false;
    this.syncBackoffUntil = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("nacora_quota_exceeded_timestamp", String(Date.now()));
      }
    } catch (_) {}
    try {
      disableNetwork(db).catch(() => {});
    } catch (_) {}
    this.notifyListenersOnly();
  }

  constructor() {
    if (this.checkQuotaExceeded()) {
      try {
        disableNetwork(db).catch(() => {});
      } catch (_) {}
    }
    this.loadFromLocalStorage();
  }

  // Subscribe to changes
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSyncStatus() {
    return {
      isQuotaExceeded: this.isQuotaExceeded,
      lastSyncSuccess: this.lastSyncSuccess,
      cloudStatus: this.cloudStatus,
      lastCloudSyncTime: this.lastCloudSyncTime,
      lastCloudError: this.lastCloudError,
      hasUser: Boolean(this.currentUserId),
      userId: this.currentUserId
    };
  }

  private notifyListenersOnly() {
    this.listeners.forEach(listener => listener());
  }

  private notify() {
    this.notifyListenersOnly();
    if (this.currentUserId) {
      this.saveToUserLocalStorage(this.currentUserId);
      if (this.checkQuotaExceeded()) {
        return;
      }
      if (this.syncTimeout) clearTimeout(this.syncTimeout);
      this.syncTimeout = setTimeout(() => {
        if (this.currentUserId && !this.checkQuotaExceeded() && Date.now() >= this.syncBackoffUntil) {
          this.syncToFirestore(this.currentUserId);
        }
      }, 1500);
    } else {
      this.saveToLocalStorage();
    }
  }

  // Initialize for authenticated user (Dual-layer persistence: localStorage + Cloud Firestore)
  async initializeForUser(userId: string, email?: string | null, displayName?: string | null) {
    this.currentUserId = userId;
    
    // 1. Load IMMEDIATELY from user local storage for 0ms offline-first responsiveness
    this.loadFromUserLocalStorage(userId);
    if (!this.profile.email && email) {
      this.profile.email = email;
    }
    if ((!this.profile.firstName || !this.profile.fullName) && displayName) {
      this.profile.fullName = displayName;
      this.profile.firstName = displayName.split(" ")[0];
      this.profile.lastName = displayName.split(" ").slice(1).join(" ");
    }

    // Immediately notify React components to render local data without waiting for network
    this.notifyListenersOnly();

    // Check if Firestore quota is already exceeded for today
    if (this.checkQuotaExceeded()) {
      this.recalculateCompanyCounters();
      this.saveToUserLocalStorage(userId);
      this.cloudStatus = "quota_exceeded";
      this.lastCloudError = "Quota journalier Firestore atteint. Sauvegarde locale active.";
      this.notifyListenersOnly();
      return;
    }

    // Prevent concurrent duplicate initialization
    if (this.isInitializingUserId === userId) {
      return;
    }
    this.isInitializingUserId = userId;

    const cleanEmail = (email || this.profile.email || "").trim().toLowerCase().replace(/[^a-zA-Z0-9_]/g, "_");

    // 2. Background sync with Cloud Firestore with 2.5s maximum timeout
    try {
      const userRef = doc(db, "users", userId);
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("FIRESTORE_TIMEOUT")), 2500)
      );

      let snapshot = await Promise.race([
        getDoc(userRef),
        timeoutPromise
      ]);

      // If document by UID not found, check fallback by email document
      if (!snapshot.exists() && cleanEmail) {
        try {
          const emailRef = doc(db, "users_by_email", cleanEmail);
          const emailSnap = await Promise.race([
            getDoc(emailRef),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error("FIRESTORE_TIMEOUT")), 1500))
          ]);
          if (emailSnap.exists()) {
            snapshot = emailSnap;
          }
        } catch (_) {}
      }

      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.profile && typeof data.profile === "object" && Object.keys(data.profile).length > 0) {
          this.profile = { ...this.profile, ...data.profile };
          const { score } = calculateProfileCompletion(this.profile);
          this.profile.profileCompletionScore = score;
        }
        if (Array.isArray(data.opportunities) && data.opportunities.length > 0) {
          this.opportunities = data.opportunities;
        }
        if (Array.isArray(data.contacts) && data.contacts.length > 0) {
          this.contacts = this.purgeSponsoredContacts(data.contacts);
        }
        this.reconcileContactCategories();
        if (Array.isArray(data.companies) && data.companies.length > 0) {
          this.companies = data.companies;
        }
        if (Array.isArray(data.calendarEvents) && data.calendarEvents.length > 0) {
          this.calendarEvents = data.calendarEvents;
        }
        if (Array.isArray(data.documents) && data.documents.length > 0) {
          this.documents = data.documents;
        }
        if (Array.isArray(data.chatSessions) && data.chatSessions.length > 0) {
          this.chatSessions = data.chatSessions;
        }
        if (Array.isArray(data.prospectLeads)) {
          this.prospectLeads = data.prospectLeads;
        }
        if (Array.isArray(data.prospectLists) && data.prospectLists.length > 0) {
          this.prospectLists = data.prospectLists;
        }
        if (Array.isArray(data.savedSearches) && data.savedSearches.length > 0) {
          this.savedSearches = data.savedSearches;
        }
        if (Array.isArray(data.prospectActivities) && data.prospectActivities.length > 0) {
          this.prospectActivities = data.prospectActivities;
        }
        if (data.prospectingSettings && typeof data.prospectingSettings === "object") {
          this.prospectingSettings = { ...this.prospectingSettings, ...data.prospectingSettings };
        }

        this.cloudStatus = "connected";
        this.lastCloudSyncTime = new Date().toISOString();
        this.lastCloudError = null;
        this.lastSyncSuccess = true;
      } else {
        this.cloudStatus = "connected";
        this.lastCloudSyncTime = new Date().toISOString();
      }

      this.recalculateCompanyCounters();
      this.saveToUserLocalStorage(userId);
      this.notifyListenersOnly();
    } catch (e: any) {
      const errMsg = e?.message || String(e);
      if (errMsg.includes("resource-exhausted") || errMsg.includes("Quota limit exceeded") || errMsg.includes("quota") || errMsg.includes("overloading the backend")) {
        this.markQuotaExceeded("Quota journalier Firestore atteint. Sauvegarde locale active.");
      } else if (errMsg.includes("FIRESTORE_TIMEOUT") || errMsg.includes("timeout") || errMsg.includes("Timeout")) {
        this.cloudStatus = "offline";
        this.lastCloudError = "Synchronisation cloud indisponible — Mode local";
      } else if (errMsg.includes("not found") || errMsg.includes("not-found") || errMsg.includes("Database")) {
        this.cloudStatus = "offline";
        this.lastCloudError = "Base de données cloud en attente de provisionnement. Mode local actif.";
      } else {
        this.cloudStatus = "offline";
        this.lastCloudError = "Synchronisation cloud indisponible — Mode local";
        console.warn("Cloud sync offline mode, using local session data:", e);
      }
      this.lastSyncSuccess = false;
      this.loadFromUserLocalStorage(userId);
      this.notifyListenersOnly();
    } finally {
      this.isInitializingUserId = null;
    }
  }

  clearUser() {
    this.currentUserId = null;
    this.profile = createDefaultProfile();
    this.opportunities = [];
    this.contacts = [...SEED_CONTACTS];
    this.companies = [];
    this.calendarEvents = [];
    this.documents = [];
    this.chatSessions = INITIAL_SESSIONS;
    this.prospectLeads = [];
    this.prospectLists = INITIAL_PROSPECT_LISTS;
    this.savedSearches = INITIAL_SAVED_SEARCHES;
    this.prospectActivities = INITIAL_PROSPECT_ACTIVITIES;
    this.prospectingSettings = INITIAL_PROSPECTING_SETTINGS;
    this.aiUsageRecords = generateInitialAiUsageRecords();
    this.aiUsageSettings = INITIAL_AI_USAGE_SETTINGS;
    this.notifyListenersOnly();
  }

  // LocalStorage Fallback
  private loadFromLocalStorage() {
    if (typeof window === "undefined" || typeof localStorage === "undefined") return;
    try {
      const p = localStorage.getItem("nacora_profile");
      if (p) this.profile = JSON.parse(p);
      else this.profile = INITIAL_PROFILE;

      const c = localStorage.getItem("nacora_contacts");
      if (c) {
        try {
          const parsed = JSON.parse(c);
          this.contacts = Array.isArray(parsed) && parsed.length > 0 ? this.purgeSponsoredContacts(parsed) : [...SEED_CONTACTS];
        } catch {
          this.contacts = [...SEED_CONTACTS];
        }
      } else {
        this.contacts = [...SEED_CONTACTS];
      }
    } catch (e) {
      console.error("Error loading local storage:", e);
    }
  }

  private saveToLocalStorage() {
    if (typeof window === "undefined" || typeof localStorage === "undefined") return;
    try {
      localStorage.setItem("nacora_profile", JSON.stringify(this.profile));
    } catch (e) {
      console.error("Error writing local storage:", e);
    }
  }

  private loadFromUserLocalStorage(userId: string) {
    if (typeof window === "undefined" || typeof localStorage === "undefined") return;
    try {
      let p = localStorage.getItem(`nacora:user:${userId}:profile`) || localStorage.getItem(`nacora_${userId}_profile`);
      let o = localStorage.getItem(`nacora_${userId}_opportunities`);
      let c = localStorage.getItem(`nacora_${userId}_contacts`);
      let co = localStorage.getItem(`nacora_${userId}_companies`);
      let cal = localStorage.getItem(`nacora_${userId}_calendar`);
      let docu = localStorage.getItem(`nacora_${userId}_documents`);
      let sess = localStorage.getItem(`nacora_${userId}_sessions`);
      let leads = localStorage.getItem(`nacora_${userId}_prospect_leads`);
      let lists = localStorage.getItem(`nacora_${userId}_prospect_lists`);
      let searches = localStorage.getItem(`nacora_${userId}_prospect_searches`);
      let activities = localStorage.getItem(`nacora_${userId}_prospect_activities`);
      let psettings = localStorage.getItem(`nacora_${userId}_prospect_settings`);
      let aiRecords = localStorage.getItem(`nacora_${userId}_ai_usage_records`);
      let aiSettings = localStorage.getItem(`nacora_${userId}_ai_usage_settings`);

      // If this is a fresh user session without data, scan for previous data in localStorage
      let hasDirectData = false;
      try {
        if (o && JSON.parse(o).length > 0) hasDirectData = true;
        if (c && JSON.parse(c).length > 0) hasDirectData = true;
      } catch (_) {}

      if (!hasDirectData && typeof window !== "undefined") {
        // Look for any existing stored items in localStorage from guest or previous user sessions
        const keys = Object.keys(localStorage);
        for (const key of keys) {
          if (key !== `nacora_${userId}_opportunities` && key.startsWith("nacora_") && key.endsWith("_opportunities")) {
            const rawOpps = localStorage.getItem(key);
            if (rawOpps) {
              try {
                const parsed = JSON.parse(rawOpps);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  const prefix = key.replace("_opportunities", "");
                  if (!o || JSON.parse(o).length === 0) o = rawOpps;
                  if (!c || JSON.parse(c).length === 0) c = localStorage.getItem(`${prefix}_contacts`) || c;
                  if (!co || JSON.parse(co).length === 0) co = localStorage.getItem(`${prefix}_companies`) || co;
                  if (!cal || JSON.parse(cal).length === 0) cal = localStorage.getItem(`${prefix}_calendar`) || cal;
                  if (!docu || JSON.parse(docu).length === 0) docu = localStorage.getItem(`${prefix}_documents`) || docu;
                  if (!p) p = localStorage.getItem(`${prefix}_profile`) || p;
                  if (!sess) sess = localStorage.getItem(`${prefix}_sessions`) || sess;
                  break;
                }
              } catch (_) {}
            }
          }
        }
        
        // Also check legacy keys without user prefix
        if (!o) o = localStorage.getItem("nacora_opportunities");
        if (!c) c = localStorage.getItem("nacora_contacts");
        if (!co) co = localStorage.getItem("nacora_companies");
        if (!cal) cal = localStorage.getItem("nacora_calendar");
        if (!docu) docu = localStorage.getItem("nacora_documents");
        if (!p) p = localStorage.getItem("nacora_profile");
      }

      if (p) {
        try {
          const parsedProfile = JSON.parse(p);
          this.profile = { ...createDefaultProfile(userId), ...parsedProfile, id: userId };
        } catch {
          this.profile = createDefaultProfile(userId);
        }
      } else {
        this.profile = createDefaultProfile(userId);
      }

      if (o) {
        try { this.opportunities = JSON.parse(o); } catch { this.opportunities = []; }
      } else {
        this.opportunities = [];
      }

      if (c) {
        try { 
          const parsed = JSON.parse(c);
          this.contacts = Array.isArray(parsed) && parsed.length > 0 ? this.purgeSponsoredContacts(parsed) : [...SEED_CONTACTS];
        } catch { 
          this.contacts = [...SEED_CONTACTS]; 
        }
      } else {
        this.contacts = [...SEED_CONTACTS];
      }

      // Reconcile categories
      this.reconcileContactCategories();

      if (co) {
        try { this.companies = JSON.parse(co); } catch { this.companies = []; }
      } else {
        this.companies = [];
      }

      if (cal) {
        try { this.calendarEvents = JSON.parse(cal); } catch { this.calendarEvents = []; }
      } else {
        this.calendarEvents = [];
      }

      if (docu) {
        try { this.documents = JSON.parse(docu); } catch { this.documents = []; }
      } else {
        this.documents = [];
      }

      if (sess) {
        try { this.chatSessions = JSON.parse(sess); } catch { this.chatSessions = INITIAL_SESSIONS; }
      } else {
        this.chatSessions = INITIAL_SESSIONS;
      }

      if (leads) {
        try { this.prospectLeads = JSON.parse(leads); } catch { this.prospectLeads = []; }
      } else {
        this.prospectLeads = [];
      }

      if (lists) {
        try { this.prospectLists = JSON.parse(lists); } catch { this.prospectLists = INITIAL_PROSPECT_LISTS; }
      } else {
        this.prospectLists = INITIAL_PROSPECT_LISTS;
      }

      if (searches) {
        try { this.savedSearches = JSON.parse(searches); } catch { this.savedSearches = INITIAL_SAVED_SEARCHES; }
      } else {
        this.savedSearches = INITIAL_SAVED_SEARCHES;
      }

      if (activities) {
        try { this.prospectActivities = JSON.parse(activities); } catch { this.prospectActivities = INITIAL_PROSPECT_ACTIVITIES; }
      } else {
        this.prospectActivities = INITIAL_PROSPECT_ACTIVITIES;
      }

      if (psettings) {
        try { this.prospectingSettings = { ...INITIAL_PROSPECTING_SETTINGS, ...JSON.parse(psettings) }; } catch { this.prospectingSettings = INITIAL_PROSPECTING_SETTINGS; }
      } else {
        this.prospectingSettings = INITIAL_PROSPECTING_SETTINGS;
      }

      if (aiRecords) {
        try { 
          const parsed = JSON.parse(aiRecords);
          this.aiUsageRecords = Array.isArray(parsed) && parsed.length > 0 ? parsed : generateInitialAiUsageRecords();
        } catch { 
          this.aiUsageRecords = generateInitialAiUsageRecords(); 
        }
      } else {
        this.aiUsageRecords = generateInitialAiUsageRecords();
      }

      if (aiSettings) {
        try { this.aiUsageSettings = { ...INITIAL_AI_USAGE_SETTINGS, ...JSON.parse(aiSettings) }; } catch { this.aiUsageSettings = INITIAL_AI_USAGE_SETTINGS; }
      } else {
        this.aiUsageSettings = INITIAL_AI_USAGE_SETTINGS;
      }

      this.recalculateCompanyCounters();
      this.saveToUserLocalStorage(userId);
    } catch (e) {
      console.error("Error loading user local storage:", e);
    }
  }

  private saveToUserLocalStorage(userId: string) {
    if (typeof window === "undefined" || typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(`nacora:user:${userId}:profile`, JSON.stringify(this.profile));
      localStorage.setItem(`nacora_${userId}_profile`, JSON.stringify(this.profile));
      localStorage.setItem(`nacora_${userId}_opportunities`, JSON.stringify(this.opportunities));
      localStorage.setItem(`nacora_${userId}_contacts`, JSON.stringify(this.contacts));
      localStorage.setItem(`nacora_${userId}_companies`, JSON.stringify(this.companies));
      localStorage.setItem(`nacora_${userId}_calendar`, JSON.stringify(this.calendarEvents));
      localStorage.setItem(`nacora_${userId}_documents`, JSON.stringify(this.documents));
      localStorage.setItem(`nacora_${userId}_sessions`, JSON.stringify(this.chatSessions));
      localStorage.setItem(`nacora_${userId}_prospect_leads`, JSON.stringify(this.prospectLeads));
      localStorage.setItem(`nacora_${userId}_prospect_lists`, JSON.stringify(this.prospectLists));
      localStorage.setItem(`nacora_${userId}_prospect_searches`, JSON.stringify(this.savedSearches));
      localStorage.setItem(`nacora_${userId}_prospect_activities`, JSON.stringify(this.prospectActivities));
      localStorage.setItem(`nacora_${userId}_prospect_settings`, JSON.stringify(this.prospectingSettings));
      localStorage.setItem(`nacora_${userId}_ai_usage_records`, JSON.stringify(this.aiUsageRecords));
      localStorage.setItem(`nacora_${userId}_ai_usage_settings`, JSON.stringify(this.aiUsageSettings));
    } catch (e) {
      console.error("Error writing user local storage:", e);
    }
  }

  // Firebase Cloud Sync with single-flight concurrency and exponential backoff protection
  async syncToFirestore(userId: string) {
    if (this.checkQuotaExceeded() || Date.now() < this.syncBackoffUntil) return;
    
    // If a sync is already running, mark that another sync is needed when it finishes
    if (this.isSyncing) {
      this.needsAnotherSync = true;
      return;
    }

    this.isSyncing = true;
    try {
      const userRef = doc(db, "users", userId);
      const rawPayload = {
        userId,
        email: this.profile.email || "",
        profile: this.profile,
        opportunities: this.opportunities,
        contacts: this.contacts,
        companies: this.companies,
        calendarEvents: this.calendarEvents,
        documents: this.documents,
        chatSessions: this.chatSessions,
        prospectLeads: this.prospectLeads,
        prospectLists: this.prospectLists,
        savedSearches: this.savedSearches,
        prospectActivities: this.prospectActivities,
        prospectingSettings: this.prospectingSettings,
        updatedAt: new Date().toISOString()
      };
      const cleanPayload = cleanForFirestore(JSON.parse(JSON.stringify(rawPayload)));
      
      await setDoc(userRef, cleanPayload, { merge: true });

      this.lastSyncSuccess = true;
      this.cloudStatus = "connected";
      this.lastCloudSyncTime = new Date().toISOString();
      this.lastCloudError = null;
    } catch (e: any) {
      const errMsg = e?.message || String(e);
      const errCode = e?.code || "";
      if (errCode === "resource-exhausted" || errMsg.includes("resource-exhausted") || errMsg.includes("maximum allowed queued writes") || errMsg.includes("overloading the backend") || errMsg.includes("Quota limit exceeded") || errMsg.includes("quota")) {
        this.markQuotaExceeded("Quota journalier Firestore atteint. Sauvegarde locale active.");
      } else if (errMsg.includes("not found") || errMsg.includes("not-found") || errMsg.includes("Database")) {
        this.lastSyncSuccess = false;
        this.cloudStatus = "offline";
        this.lastCloudError = "Base de données cloud en attente de provisionnement. Mode local actif.";
      } else {
        this.lastSyncSuccess = false;
        this.cloudStatus = "offline";
        this.syncBackoffUntil = Date.now() + 10000; // 10s backoff for transient network issues
        this.lastCloudError = "Synchronisation cloud indisponible — Mode local";
      }
    } finally {
      this.isSyncing = false;
      if (this.needsAnotherSync && !this.checkQuotaExceeded() && this.currentUserId === userId) {
        this.needsAnotherSync = false;
        setTimeout(() => {
          if (this.currentUserId && !this.checkQuotaExceeded()) {
            this.syncToFirestore(this.currentUserId);
          }
        }, 1500);
      }
    }
  }

  // Helper to recalculate business analytics reactively
  private recalculateCompanyCounters() {
    this.companies = this.companies.map(co => {
      const oppCount = this.opportunities.filter(o => o.companyId === co.id || isSameCompany(o.companyName, co.name)).length;
      const contactCount = this.contacts.filter(c => c.companyId === co.id || isSameCompany(c.companyName, co.name)).length;
      return {
        ...co,
        opportunityCount: oppCount,
        contactCount: contactCount,
        noteCount: co.notes ? 1 : 0
      };
    });
  }

  // Profile Operations
  getProfile(): CandidateProfile {
    return this.profile;
  }

  updateProfile(p: Partial<CandidateProfile>) {
    this.profile = { ...this.profile, ...p };
    const { score } = calculateProfileCompletion(this.profile);
    this.profile.profileCompletionScore = score;
    this.saveToLocalStorage();
    if (this.currentUserId) {
      this.saveToUserLocalStorage(this.currentUserId);
      if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
        try {
          localStorage.setItem(`nacora:user:${this.currentUserId}:profile`, JSON.stringify(this.profile));
        } catch (_) {}
      }
    }
    this.notify();
  }

  async saveUserProfile(profileData: Partial<CandidateProfile>): Promise<CandidateProfile> {
    this.profile = { ...this.profile, ...profileData };
    const { score } = calculateProfileCompletion(this.profile);
    this.profile.profileCompletionScore = score;

    this.saveToLocalStorage();
    if (this.currentUserId) {
      this.saveToUserLocalStorage(this.currentUserId);
      if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
        try {
          localStorage.setItem(`nacora:user:${this.currentUserId}:profile`, JSON.stringify(this.profile));
        } catch (_) {}
      }
    }

    this.notifyListenersOnly();

    // Remote persistence directly linked to user.uid
    if (this.currentUserId && !this.checkQuotaExceeded() && Date.now() >= this.syncBackoffUntil) {
      try {
        const userRef = doc(db, "users", this.currentUserId);
        const cleanProf = cleanForFirestore(JSON.parse(JSON.stringify(this.profile)));
        await setDoc(userRef, { profile: cleanProf, updatedAt: new Date().toISOString() }, { merge: true });

        try {
          const profileSubRef = doc(db, "users", this.currentUserId, "profile", "main");
          await setDoc(profileSubRef, cleanProf, { merge: true });
        } catch (_) {}

        this.lastSyncSuccess = true;
        this.cloudStatus = "connected";
        this.lastCloudSyncTime = new Date().toISOString();
        this.lastCloudError = null;
      } catch (err: any) {
        console.error("[dbStore] Error writing user profile to Firestore:", err);
        this.lastSyncSuccess = false;
        throw err;
      }
    }

    return this.profile;
  }

  // Opportunity Operations
  getOpportunities(): Opportunity[] {
    return this.opportunities;
  }

  addOpportunity(opp: Omit<Opportunity, "id" | "createdAt" | "updatedAt">): Opportunity {
    const { company: resCo } = resolveCompany({ companyName: opp.companyName, companyId: opp.companyId });
    const newOpp: Opportunity = {
      ...opp,
      companyId: resCo.id,
      companyName: resCo.name,
      id: "opp_" + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.opportunities.push(newOpp);
    this.recalculateCompanyCounters();
    this.notify();
    return newOpp;
  }

  updateOpportunity(opp: Opportunity) {
    const { company: resCo } = resolveCompany({ companyName: opp.companyName, companyId: opp.companyId });
    const updatedOpp: Opportunity = {
      ...opp,
      companyId: resCo.id,
      companyName: resCo.name,
      updatedAt: new Date().toISOString()
    };
    this.opportunities = this.opportunities.map(o => o.id === updatedOpp.id ? updatedOpp : o);
    this.recalculateCompanyCounters();
    this.notify();
  }

  deleteOpportunity(id: string) {
    this.opportunities = this.opportunities.filter(o => o.id !== id);
    this.recalculateCompanyCounters();
    this.notify();
  }

  resetOpportunities() {
    this.opportunities = [];
    this.recalculateCompanyCounters();
    this.notify();
  }

  // Contact Operations
  purgeSponsoredContacts(list?: Contact[]): Contact[] {
    const source = list || this.contacts;
    // 1. Filtrer les contacts publicitaires, sponsorisés ou robots
    const nonSponsored = source.filter(c => {
      const name = (c.fullName || "").toLowerCase();
      const job = (c.jobTitle || "").toLowerCase();
      const co = (c.companyName || "").toLowerCase();
      if (
        name.includes("sponsored") ||
        name.includes("sponsoris") ||
        job.includes("sponsored") ||
        job.includes("sponsoris") ||
        co.includes("sponsored") ||
        isSponsoredOrAdvertisingName(c.fullName)
      ) {
        return false;
      }
      return true;
    });

    // 2. Dédupliquer automatiquement les contacts ayant le même nom normalisé
    const deduplicated: Contact[] = [];
    const seenMap = new Map<string, Contact>();

    for (const c of nonSponsored) {
      const normName = normalizePersonName(c.fullName || `${c.firstName || ""} ${c.lastName || ""}`);
      if (!normName) {
        deduplicated.push(c);
        continue;
      }

      const key = normName;
      if (seenMap.has(key)) {
        const existing = seenMap.get(key)!;
        // Fusionner non-destructivement les deux fiches (conserve messages, historique, statut)
        const merged = mergeContactData(existing, c);
        seenMap.set(key, merged);
        const idx = deduplicated.findIndex(item => item.id === existing.id);
        if (idx !== -1) {
          deduplicated[idx] = merged;
        }
      } else {
        seenMap.set(key, c);
        deduplicated.push(c);
      }
    }

    if (!list && deduplicated.length !== this.contacts.length) {
      this.contacts = deduplicated;
      if (this.currentUserId) {
        this.saveToUserLocalStorage(this.currentUserId);
      }
      this.recalculateCompanyCounters();
    }

    return deduplicated;
  }

  getContacts(): Contact[] {
    return this.purgeSponsoredContacts();
  }

  addContact(contact: Omit<Contact, "id" | "createdAt">): Contact {
    // 0. Rejet formel des messages publicitaires ou conversations sponsorisées
    if (
      isSponsoredOrAdvertisingName(contact.fullName) ||
      (contact.fullName && (contact.fullName.toLowerCase().includes("sponsored conversation") || contact.fullName.toLowerCase().includes("conversation sponsoris")))
    ) {
      console.warn("Création de contact refusée (conversation sponsorisée / pub) :", contact.fullName);
      throw new Error("Message publicitaire ou conversation sponsorisée ignorée");
    }

    // 1. Resolve company strictly to single source of truth
    const { company: resCo } = resolveCompany({
      companyName: contact.companyName,
      companyId: contact.companyId
    });

    // 2. Classify function if missing or unclassified
    let func = contact.function;
    let funcSource = contact.functionSource;
    let funcConfidence = contact.functionConfidence;
    let funcClassifiedAt = contact.functionClassifiedAt;

    if (!func || func === "Inconnue") {
      const classified = classifyContactFunction(contact.jobTitle, resCo.name);
      func = classified.function;
      funcSource = classified.functionSource;
      funcConfidence = classified.functionConfidence;
      funcClassifiedAt = classified.functionClassifiedAt;
    }

    const newContact: Contact = {
      ...contact,
      companyId: resCo.id,
      companyName: resCo.name,
      function: func,
      functionSource: funcSource || "rule_engine",
      functionConfidence: funcConfidence || "high",
      functionClassifiedAt: funcClassifiedAt || new Date().toISOString(),
      id: "cont_" + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString()
    };
    this.contacts.push(newContact);
    this.recalculateCompanyCounters();
    this.notify();
    return newContact;
  }

  updateContact(contact: Contact) {
    const { company: resCo } = resolveCompany({
      companyName: contact.companyName,
      companyId: contact.companyId
    });

    let func = contact.function;
    let funcSource = contact.functionSource;
    let funcConfidence = contact.functionConfidence;
    let funcClassifiedAt = contact.functionClassifiedAt;

    if (!func || func === "Inconnue") {
      const classified = classifyContactFunction(contact.jobTitle, resCo.name);
      func = classified.function;
      funcSource = classified.functionSource;
      funcConfidence = classified.functionConfidence;
      funcClassifiedAt = classified.functionClassifiedAt;
    }

    const updatedContact: Contact = {
      ...contact,
      companyId: resCo.id,
      companyName: resCo.name,
      function: func,
      functionSource: funcSource || contact.functionSource || "rule_engine",
      functionConfidence: funcConfidence || contact.functionConfidence || "high",
      functionClassifiedAt: funcClassifiedAt || contact.functionClassifiedAt || new Date().toISOString()
    };

    this.contacts = this.contacts.map(c => c.id === updatedContact.id ? updatedContact : c);
    this.recalculateCompanyCounters();
    this.notify();
  }

  /**
   * Reconciles all existing contacts with deep semantic HR & Recruiter rules.
   * Retroactively fixes misclassified contacts without losing any custom notes, relevance scores, or metadata.
   */
  reconcileContactCategories(): { updatedCount: number; affectedContacts: string[] } {
    let updatedCount = 0;
    const affectedContacts: string[] = [];

    this.contacts = this.contacts.map(c => {
      const isAlumni = c.category === "alumni" || Boolean(c.academicPath) || (c.connectionPoints || []).some(p => /alumni|iut|uca|clermont/i.test(p)) || (c.categories || []).some(cat => cat.category === "academic");
      const isHR = isHumanResourcesRole(c.jobTitle) || isHumanResourcesRole(c.normalizedJobTitle);
      const isBank = isBankingAndFinanceRole(c.jobTitle, c.companyName) || isBankingAndFinanceRole(c.normalizedJobTitle, c.companyName);

      let newCategory = c.category;

      if (isAlumni) {
        newCategory = "alumni";
      } else if (isHR) {
        newCategory = "recruiter";
      } else if (c.category === "recruiter" && isBank && !isHR) {
        newCategory = "sector_pro";
      }

      if (newCategory !== c.category) {
        updatedCount++;
        const name = c.fullName || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Contact";
        affectedContacts.push(`${name} (${c.jobTitle || "Poste non renseigné"} @ ${c.companyName || "Entreprise"}) : ${c.category} ➔ ${newCategory}`);

        let updatedConnectionPoints = [...(c.connectionPoints || [])];
        if (newCategory === "recruiter") {
          const hrPoint = c.companyName ? `Recrutement RH chez ${c.companyName}` : "Recrutement & Ressources Humaines";
          if (!updatedConnectionPoints.some(p => /recrut|rh|ressources humaines/i.test(p))) {
            updatedConnectionPoints.unshift(hrPoint);
          }
        }

        return {
          ...c,
          category: newCategory,
          connectionPoints: updatedConnectionPoints
        };
      }
      return c;
    });

    if (updatedCount > 0) {
      this.recalculateCompanyCounters();
      this.notify();
    }

    return { updatedCount, affectedContacts };
  }

  deleteContact(id: string) {
    this.contacts = this.contacts.filter(c => c.id !== id);
    this.recalculateCompanyCounters();
    this.notify();
  }

  // Company Operations
  getCompanies(): Company[] {
    return this.companies;
  }

  addCompany(company: Company): Company {
    const existing = this.companies.find(c => c.id === company.id || c.name.toLowerCase() === company.name.toLowerCase());
    if (existing) {
      const updated = { ...existing, ...company };
      this.updateCompany(updated);
      return updated;
    }
    this.companies.push(company);
    this.recalculateCompanyCounters();
    this.notify();
    return company;
  }

  getCompanyByNameOrCreate(name: string): Company {
    const { company } = resolveCompany({ companyName: name });
    return company;
  }

  updateCompany(company: Company) {
    this.companies = this.companies.map(c => c.id === company.id ? company : c);
    this.notify();
  }

  deleteCompany(id: string) {
    this.companies = this.companies.filter(c => c.id !== id);
    this.notify();
  }

  // Calendar Event Operations
  getCalendarEvents(): CalendarEvent[] {
    return this.calendarEvents;
  }

  addCalendarEvent(event: Omit<CalendarEvent, "id" | "createdAt">): CalendarEvent {
    const newEvent: CalendarEvent = {
      ...event,
      id: "cal_" + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString()
    };
    this.calendarEvents.push(newEvent);
    this.notify();
    return newEvent;
  }

  updateCalendarEvent(event: CalendarEvent) {
    this.calendarEvents = this.calendarEvents.map(e => e.id === event.id ? event : e);
    this.notify();
  }

  deleteCalendarEvent(id: string) {
    this.calendarEvents = this.calendarEvents.filter(e => e.id !== id);
    this.notify();
  }

  // Document Operations
  getDocuments(): DocumentFile[] {
    return this.documents;
  }

  addDocument(doc: Omit<DocumentFile, "id" | "uploadedAt">): DocumentFile {
    const newDoc: DocumentFile = {
      ...doc,
      id: "doc_" + Math.random().toString(36).substring(2, 9),
      uploadedAt: new Date().toISOString()
    };
    this.documents.push(newDoc);
    this.notify();
    return newDoc;
  }

  deleteDocument(id: string) {
    this.documents = this.documents.filter(d => d.id !== id);
    this.notify();
  }

  // Chat Session Operations
  getChatSessions(): ChatSession[] {
    return this.chatSessions;
  }

  addChatSession(personaId: string, title: string): ChatSession {
    const personaNames: Record<string, string> = {
      general: "Conseiller Carrière",
      interview: "Coach Entretien",
      cv_letter: "Expert CV & Lettre",
      networking: "Stratège Réseau",
      negotiation: "Expert Négociation"
    };

    const newSess: ChatSession = {
      id: "sess_" + Math.random().toString(36).substring(2, 9),
      personaId,
      personaName: personaNames[personaId] || "NACORA AI",
      title,
      messages: [],
      updatedAt: new Date().toISOString()
    };
    this.chatSessions.push(newSess);
    this.notify();
    return newSess;
  }

  addMessageToSession(sessionId: string, role: "user" | "model", text: string) {
    this.chatSessions = this.chatSessions.map(sess => {
      if (sess.id === sessionId) {
        const updatedMsgs = [
          ...sess.messages,
          {
            id: "msg_" + Math.random().toString(36).substring(2, 9),
            role,
            text,
            timestamp: new Date().toISOString()
          }
        ];
        return {
          ...sess,
          messages: updatedMsgs,
          updatedAt: new Date().toISOString()
        };
      }
      return sess;
    });
    this.notify();
  }

  deleteChatSession(id: string) {
    this.chatSessions = this.chatSessions.filter(s => s.id !== id);
    this.notify();
  }

  // ==========================================
  // B2B PROSPECTING ENGINE OPERATIONS
  // ==========================================

  getProspectLeads(): ProspectLead[] {
    return this.prospectLeads;
  }

  addProspectLead(leadData: Omit<ProspectLead, "id" | "createdAt" | "updatedAt">): ProspectLead {
    const newLead: ProspectLead = {
      ...leadData,
      id: "lead_" + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.prospectLeads.unshift(newLead);
    
    // Update list counters
    this.updateListLeadCounters();

    // Log activity
    this.addProspectActivity({
      type: "lead_created",
      title: `Prospect enregistré : ${newLead.fullName}`,
      description: `${newLead.jobTitle} chez ${newLead.companyName}`,
      provider: newLead.source,
      status: "success"
    });

    this.notify();
    return newLead;
  }

  updateProspectLead(lead: ProspectLead) {
    this.prospectLeads = this.prospectLeads.map(l => 
      l.id === lead.id ? { ...lead, updatedAt: new Date().toISOString() } : l
    );
    this.updateListLeadCounters();
    this.notify();
  }

  deleteProspectLead(id: string) {
    this.prospectLeads = this.prospectLeads.filter(l => l.id !== id);
    this.updateListLeadCounters();
    this.notify();
  }

  getProspectLists(): ProspectList[] {
    return this.prospectLists;
  }

  addProspectList(listData: Omit<ProspectList, "id" | "createdAt" | "updatedAt" | "leadsCount">): ProspectList {
    const newList: ProspectList = {
      ...listData,
      id: "list_" + Math.random().toString(36).substring(2, 9),
      leadsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.prospectLists.push(newList);
    this.notify();
    return newList;
  }

  updateProspectList(list: ProspectList) {
    this.prospectLists = this.prospectLists.map(l => 
      l.id === list.id ? { ...list, updatedAt: new Date().toISOString() } : l
    );
    this.notify();
  }

  deleteProspectList(id: string) {
    this.prospectLists = this.prospectLists.filter(l => l.id !== id);
    // Remove list ID from leads
    this.prospectLeads = this.prospectLeads.map(lead => ({
      ...lead,
      listIds: lead.listIds.filter(lid => lid !== id)
    }));
    this.notify();
  }

  private updateListLeadCounters() {
    this.prospectLists = this.prospectLists.map(list => {
      const count = this.prospectLeads.filter(lead => lead.listIds && lead.listIds.includes(list.id)).length;
      return { ...list, leadsCount: count };
    });
  }

  getSavedSearches(): SavedSearch[] {
    return this.savedSearches;
  }

  addSavedSearch(searchData: Omit<SavedSearch, "id" | "createdAt" | "lastRunAt">): SavedSearch {
    const newSearch: SavedSearch = {
      ...searchData,
      id: "search_" + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
      lastRunAt: new Date().toISOString()
    };
    this.savedSearches.unshift(newSearch);
    this.notify();
    return newSearch;
  }

  deleteSavedSearch(id: string) {
    this.savedSearches = this.savedSearches.filter(s => s.id !== id);
    this.notify();
  }

  getProspectActivities(): ProspectActivityLog[] {
    return this.prospectActivities;
  }

  addProspectActivity(activityData: Omit<ProspectActivityLog, "id" | "timestamp">): ProspectActivityLog {
    const newActivity: ProspectActivityLog = {
      ...activityData,
      id: "act_" + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString()
    };
    this.prospectActivities.unshift(newActivity);
    // Keep max 100 activities
    if (this.prospectActivities.length > 100) {
      this.prospectActivities = this.prospectActivities.slice(0, 100);
    }
    this.notify();
    return newActivity;
  }

  getProspectingSettings(): ProspectingSettings {
    return this.prospectingSettings;
  }

  updateProspectingSettings(settings: Partial<ProspectingSettings>) {
    this.prospectingSettings = { ...this.prospectingSettings, ...settings };
    this.notify();
  }

  // ==========================================
  // CROSS-MODULE BRIDGES & CONVERSIONS
  // ==========================================

  /**
   * Converts a ProspectLead into a real verified NACORA Contact
   */
  convertLeadToContact(leadId: string): Contact | null {
    const lead = this.prospectLeads.find(l => l.id === leadId);
    if (!lead) return null;

    // Check if company exists or create it
    const company = this.getCompanyByNameOrCreate(lead.companyName);

    // Determine category based on job title
    const isHR = /recrut|talent|rh|ressources humaines|people|hr/i.test(lead.jobTitle);
    const category = isHR ? "recruiter" : "sector_pro";

    const connectionPoints = [
      `Issu de la prospection B2B (${lead.source.toUpperCase()})`,
      lead.companyName ? `Entreprise : ${lead.companyName}` : ""
    ].filter(Boolean);

    if (lead.email) {
      connectionPoints.push(`Email vérifié (${lead.emailScore ? `${lead.emailScore}% score` : "Vérifié"})`);
    }

    const newContact = this.addContact({
      fullName: lead.fullName,
      firstName: lead.firstName || lead.fullName.split(" ")[0] || "",
      lastName: lead.lastName || lead.fullName.split(" ").slice(1).join(" ") || "",
      companyId: company.id,
      companyName: lead.companyName,
      jobTitle: lead.jobTitle,
      normalizedJobTitle: lead.jobTitle,
      category,
      relevanceScore: lead.emailScore ? Math.min(95, Math.max(70, lead.emailScore)) : 80,
      connectionPoints,
      previousCompanies: [],
      notes: `Converti depuis la Prospection NACORA le ${new Date().toLocaleDateString("fr-FR")}.\n${lead.notes || ""}`,
      email: lead.email,
      phone: lead.phone,
      linkedInUrl: lead.linkedinUrl,
      sector: company.sector
    });

    // Mark lead as converted
    this.updateProspectLead({
      ...lead,
      status: "converted",
      convertedContactId: newContact.id
    });

    this.addProspectActivity({
      type: "lead_converted",
      title: `Prospect converti en Contact NACORA`,
      description: `${lead.fullName} (${lead.companyName}) ajouté au carnet de contacts`,
      provider: "nacora",
      status: "success"
    });

    return newContact;
  }

  /**
   * Converts a ProspectLead into a new Opportunity in NACORA
   */
  convertLeadToOpportunity(leadId: string, customTitle?: string): Opportunity | null {
    const lead = this.prospectLeads.find(l => l.id === leadId);
    if (!lead) return null;

    const company = this.getCompanyByNameOrCreate(lead.companyName);

    const title = customTitle || `Contact stratégique — ${lead.companyName}`;

    const newOpp = this.addOpportunity({
      companyId: company.id,
      companyName: lead.companyName,
      title,
      contractType: "Autre",
      duration: "À définir",
      location: lead.location || company.location || "France",
      status: "to_prepare",
      notes: `Opportunité initiée via la Prospection B2B.\nContact clé : ${lead.fullName} (${lead.jobTitle})\nEmail : ${lead.email || "Non renseigné"}`,
      aiExtracted: false,
      recruiterContact: {
        name: lead.fullName,
        role: lead.jobTitle,
        email: lead.email,
        phone: lead.phone,
        linkedin: lead.linkedinUrl
      }
    });

    // Also update lead's convertedOpportunityId
    this.updateProspectLead({
      ...lead,
      convertedOpportunityId: newOpp.id
    });

    this.addProspectActivity({
      type: "lead_converted",
      title: `Opportunité créée depuis un prospect`,
      description: `${title} (${lead.companyName})`,
      provider: "nacora",
      status: "success"
    });

    return newOpp;
  }

  // ============================================================================
  // SUIVI DE LA CONSOMMATION IA & GESTION DES TOKENS
  // ============================================================================

  getAiUsageRecords(): AiUsageRecord[] {
    return [...this.aiUsageRecords];
  }

  addAiUsageRecord(record: AiUsageRecord): void {
    this.aiUsageRecords.unshift(record);
    // Keep reasonable history bound (e.g. 1000 records) to prevent local storage overflow
    if (this.aiUsageRecords.length > 1000) {
      this.aiUsageRecords = this.aiUsageRecords.slice(0, 1000);
    }
    this.notify();
  }

  clearAiUsageRecords(): void {
    this.aiUsageRecords = [];
    this.notify();
  }

  getAiUsageSettings(): AiUsageSettings {
    return { ...this.aiUsageSettings };
  }

  updateAiUsageSettings(partial: Partial<AiUsageSettings>): void {
    this.aiUsageSettings = { ...this.aiUsageSettings, ...partial };
    this.notify();
  }

  resetAiUsageSettings(): void {
    this.aiUsageSettings = INITIAL_AI_USAGE_SETTINGS;
    this.notify();
  }

  // Export Full Backup
  exportFullBackup(): string {
    const backupData = {
      version: "1.0",
      app: "NACORA",
      exportedAt: new Date().toISOString(),
      userId: this.currentUserId || "local_user",
      profile: this.profile,
      opportunities: this.opportunities,
      contacts: this.contacts,
      companies: this.companies,
      calendarEvents: this.calendarEvents,
      documents: this.documents,
      chatSessions: this.chatSessions,
      prospectLeads: this.prospectLeads,
      prospectLists: this.prospectLists,
      savedSearches: this.savedSearches,
      prospectActivities: this.prospectActivities,
      prospectingSettings: this.prospectingSettings,
      aiUsageRecords: this.aiUsageRecords,
      aiUsageSettings: this.aiUsageSettings
    };
    return JSON.stringify(backupData, null, 2);
  }

  // Force Cloud Sync to Firestore
  async forceCloudSync(): Promise<{ success: boolean; message: string }> {
    if (!this.currentUserId) {
      return { success: false, message: "Aucun utilisateur actif identifié pour la synchronisation Cloud." };
    }
    try {
      await this.syncToFirestore(this.currentUserId);
      return { success: true, message: "Toutes vos données ont été synchronisées avec succès sur Firestore Cloud." };
    } catch (e: any) {
      const msg = e?.message || String(e);
      return { success: false, message: `Erreur de synchronisation Cloud : ${msg}` };
    }
  }

  // Import Full Backup
  importFullBackup(data: any): boolean {
    try {
      if (!data || typeof data !== "object") return false;
      if (data.profile && typeof data.profile === "object") {
        this.profile = { ...this.profile, ...data.profile };
      }
      if (Array.isArray(data.opportunities)) {
        this.opportunities = data.opportunities;
      }
      if (Array.isArray(data.contacts)) {
        this.contacts = this.purgeSponsoredContacts(data.contacts);
        this.reconcileContactCategories();
      }
      if (Array.isArray(data.companies)) {
        this.companies = data.companies;
      }
      if (Array.isArray(data.calendarEvents)) {
        this.calendarEvents = data.calendarEvents;
      }
      if (Array.isArray(data.documents)) {
        this.documents = data.documents;
      }
      if (Array.isArray(data.chatSessions)) {
        this.chatSessions = data.chatSessions;
      }
      if (Array.isArray(data.prospectLeads)) {
        this.prospectLeads = data.prospectLeads;
      }
      if (Array.isArray(data.prospectLists)) {
        this.prospectLists = data.prospectLists;
      }
      if (Array.isArray(data.savedSearches)) {
        this.savedSearches = data.savedSearches;
      }
      if (Array.isArray(data.prospectActivities)) {
        this.prospectActivities = data.prospectActivities;
      }
      if (data.prospectingSettings && typeof data.prospectingSettings === "object") {
        this.prospectingSettings = { ...this.prospectingSettings, ...data.prospectingSettings };
      }
      if (Array.isArray(data.aiUsageRecords)) {
        this.aiUsageRecords = data.aiUsageRecords;
      }
      if (data.aiUsageSettings && typeof data.aiUsageSettings === "object") {
        this.aiUsageSettings = { ...this.aiUsageSettings, ...data.aiUsageSettings };
      }
      this.recalculateCompanyCounters();
      this.notify();
      if (this.currentUserId) {
        this.saveToUserLocalStorage(this.currentUserId);
        this.syncToFirestore(this.currentUserId);
      }
      return true;
    } catch (e) {
      console.error("Failed to import full backup:", e);
      return false;
    }
  }
}

export const dbStore = new DBStore();
