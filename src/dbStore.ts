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
import { DailyBriefData } from "./api/gemini";
import { db, auth } from "./firebase";
import { 
  doc, 
  setDoc, 
  getDoc,
  disableNetwork,
  onSnapshot
} from "firebase/firestore";
import { isHumanResourcesRole, isBankingAndFinanceRole } from "./utils/contactMerger";
import { classifyContactFunction } from "./utils/contactTaxonomy";
import { resolveCompany, isSameCompany } from "./utils/companyResolver";
import { isSponsoredOrAdvertisingName, mergeContactData, normalizePersonName, resolveContact, cleanPersonDisplayName } from "./utils/contactResolver";
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
const INITIAL_COMPANIES: Company[] = [];
const INITIAL_OPPORTUNITIES: Opportunity[] = [];
const INITIAL_CONTACTS: Contact[] = [];
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

  // Daily Brief IA personnalisé par utilisateur
  private dailyBrief: DailyBriefData | null = null;

  private currentUserId: string | null = null;
  private isInitializingUserId: string | null = null;
  private sessionSequenceId: number = 0;
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
    return this.isQuotaExceeded;
  }

  private markQuotaExceeded(reason?: string) {
    this.isQuotaExceeded = true;
    this.cloudStatus = "quota_exceeded";
    this.lastCloudError = reason || "Limite de quota Firestore atteinte. Mode local actif.";
    this.lastSyncSuccess = false;
    this.syncBackoffUntil = Date.now() + 15 * 60 * 1000; // 15 min retry backoff
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }
    this.notifyListenersOnly();
  }

  public retryCloudConnection() {
    this.isQuotaExceeded = false;
    this.syncBackoffUntil = 0;
    if (this.currentUserId) {
      this.initializeForUser(this.currentUserId, this.profile.email, this.profile.fullName);
    }
  }

  private createLocalBackup(userId: string) {
    if (typeof window === "undefined" || !userId) return;
    try {
      const backupData = {
        timestamp: new Date().toISOString(),
        profile: this.profile,
        opportunities: this.opportunities,
        contacts: this.contacts,
        companies: this.companies,
        calendarEvents: this.calendarEvents,
        documents: this.documents
      };
      localStorage.setItem(`nacora_backup_${userId}`, JSON.stringify(backupData));
    } catch (_) {}
  }

  private mergeEntitiesById<T extends { id: string; updatedAt?: string }>(cloudItems: T[] = [], localItems: T[] = []): T[] {
    const itemMap = new Map<string, T>();

    cloudItems.forEach(item => {
      if (item && item.id) {
        itemMap.set(item.id, item);
      }
    });

    localItems.forEach(localItem => {
      if (localItem && localItem.id) {
        if (!itemMap.has(localItem.id)) {
          itemMap.set(localItem.id, localItem);
        } else {
          const cloudItem = itemMap.get(localItem.id)!;
          const cloudTs = cloudItem.updatedAt ? new Date(cloudItem.updatedAt).getTime() : 0;
          const localTs = localItem.updatedAt ? new Date(localItem.updatedAt).getTime() : 0;
          if (localTs > cloudTs) {
            itemMap.set(localItem.id, localItem);
          }
        }
      }
    });

    return Array.from(itemMap.values());
  }

  constructor() {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("nacora_quota_exceeded_timestamp");
      }
    } catch (_) {}
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
    }
  }

  // Initialize for authenticated user (Dual-layer persistence: localStorage + Cloud Firestore)
  async initializeForUser(userId: string, email?: string | null, displayName?: string | null) {
    const currentSeq = ++this.sessionSequenceId;
    this.isInitializingUserId = userId;
    this.currentUserId = userId;

    // Reset all internal state synchronously
    this.profile = createDefaultProfile(userId, email || "", displayName || "");
    this.opportunities = [];
    this.contacts = [];
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
    this.dailyBrief = null;

    // 1. Load IMMEDIATELY from local storage
    this.loadFromUserLocalStorage(userId);
    this.notifyListenersOnly();

    // 2. Setup reactive sync and fetch
    try {
      const userRef = doc(db, "users", userId);
      
      onSnapshot(userRef, (snapshot) => {
        if (snapshot.exists()) {
            this.updateStateFromCloud(snapshot.data());
            this.notifyListenersOnly();
        }
      });

      const snapshot = await getDoc(userRef);

      if (currentSeq !== this.sessionSequenceId) return;

      if (snapshot.exists()) {
        this.updateStateFromCloud(snapshot.data());
        this.lastSyncSuccess = true;
        this.cloudStatus = "connected";
      } else {
        this.cloudStatus = "connected";
      }

      this.recalculateCompanyCounters();
      this.saveToUserLocalStorage(userId);
      this.notifyListenersOnly();
    } catch (e: any) {
      console.error("Firestore initializeForUser error:", e);
      this.cloudStatus = "offline";
      this.lastSyncSuccess = false;
      this.notifyListenersOnly();
    } finally {
      if (currentSeq === this.sessionSequenceId) {
        this.isInitializingUserId = null;
      }
    }
  }

  private updateStateFromCloud(data: any) {
    if (data.profile && typeof data.profile === "object" && Object.keys(data.profile).length > 0) {
      this.profile = { ...this.profile, ...data.profile };
      const { score } = calculateProfileCompletion(this.profile);
      this.profile.profileCompletionScore = score;
    }
    if (Array.isArray(data.opportunities)) {
      this.opportunities = this.mergeEntitiesById(data.opportunities, this.opportunities);
    }
    if (Array.isArray(data.contacts)) {
      this.contacts = this.purgeSponsoredContacts(this.mergeEntitiesById(data.contacts, this.contacts));
    }
    this.reconcileContactCategories();
    this.reconcileOpportunityContacts();
    if (Array.isArray(data.companies)) {
      this.companies = this.mergeEntitiesById(data.companies, this.companies);
    }
    if (Array.isArray(data.calendarEvents)) {
      this.calendarEvents = this.mergeEntitiesById(data.calendarEvents, this.calendarEvents);
    }
    if (Array.isArray(data.documents)) {
      this.documents = this.mergeEntitiesById(data.documents, this.documents);
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
    if (data.dailyBrief && typeof data.dailyBrief === "object") {
      this.dailyBrief = data.dailyBrief;
    }
  }

  clearUser() {
    this.sessionSequenceId++;
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }
    this.isSyncing = false;
    this.needsAnotherSync = false;
    this.isInitializingUserId = null;
    this.currentUserId = null;
    this.profile = createDefaultProfile();
    this.opportunities = [];
    this.contacts = [];
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
    this.dailyBrief = null;
    this.cloudStatus = "offline";
    this.lastCloudError = null;
    this.lastCloudSyncTime = null;
    this.notifyListenersOnly();
  }

  private loadFromUserLocalStorage(userId: string) {
    if (typeof window === "undefined" || typeof localStorage === "undefined") return;
    try {
      // Strictly load keys belonging to this exact userId - NEVER scan other keys or legacy global keys
      const p = localStorage.getItem(`nacora:v2:user:${userId}:profile`) || 
                localStorage.getItem(`nacora:user:${userId}:profile`) || 
                localStorage.getItem(`nacora_${userId}_profile`);
      const o = localStorage.getItem(`nacora:v2:user:${userId}:opportunities`) || 
                localStorage.getItem(`nacora_${userId}_opportunities`);
      const c = localStorage.getItem(`nacora:v2:user:${userId}:contacts`) || 
                localStorage.getItem(`nacora_${userId}_contacts`);
      const co = localStorage.getItem(`nacora:v2:user:${userId}:companies`) || 
                localStorage.getItem(`nacora_${userId}_companies`);
      const cal = localStorage.getItem(`nacora:v2:user:${userId}:calendar`) || 
                  localStorage.getItem(`nacora_${userId}_calendar`);
      const docu = localStorage.getItem(`nacora:v2:user:${userId}:documents`) || 
                   localStorage.getItem(`nacora_${userId}_documents`);
      const sess = localStorage.getItem(`nacora:v2:user:${userId}:sessions`) || 
                   localStorage.getItem(`nacora_${userId}_sessions`);
      const leads = localStorage.getItem(`nacora:v2:user:${userId}:prospect_leads`) || 
                    localStorage.getItem(`nacora_${userId}_prospect_leads`);
      const lists = localStorage.getItem(`nacora:v2:user:${userId}:prospect_lists`) || 
                    localStorage.getItem(`nacora_${userId}_prospect_lists`);
      const searches = localStorage.getItem(`nacora:v2:user:${userId}:prospect_searches`) || 
                       localStorage.getItem(`nacora_${userId}_prospect_searches`);
      const activities = localStorage.getItem(`nacora:v2:user:${userId}:prospect_activities`) || 
                          localStorage.getItem(`nacora_${userId}_prospect_activities`);
      const psettings = localStorage.getItem(`nacora:v2:user:${userId}:prospect_settings`) || 
                         localStorage.getItem(`nacora_${userId}_prospect_settings`);
      const aiRecords = localStorage.getItem(`nacora:v2:user:${userId}:ai_usage_records`) || 
                        localStorage.getItem(`nacora_${userId}_ai_usage_records`);
      const aiSettings = localStorage.getItem(`nacora:v2:user:${userId}:ai_usage_settings`) || 
                         localStorage.getItem(`nacora_${userId}_ai_usage_settings`);
      const b = localStorage.getItem(`nacora:v2:user:${userId}:daily_brief`) || 
                localStorage.getItem(`nacora_${userId}_daily_brief`);

      // Erase any legacy global brief that wasn't scoped by userId
      try {
        localStorage.removeItem("nacora_daily_brief");
      } catch (_) {}

      if (b) {
        try {
          this.dailyBrief = JSON.parse(b);
        } catch {
          this.dailyBrief = null;
        }
      } else {
        this.dailyBrief = null;
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
          this.contacts = Array.isArray(parsed) ? this.purgeSponsoredContacts(parsed) : [];
        } catch { 
          this.contacts = []; 
        }
      } else {
        this.contacts = [];
      }

      // Reconcile categories & opportunity contacts
      this.reconcileContactCategories();
      this.reconcileOpportunityContacts();

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
      // Standard canonical keys prefixed with user UID
      localStorage.setItem(`nacora:v2:user:${userId}:profile`, JSON.stringify(this.profile));
      localStorage.setItem(`nacora:v2:user:${userId}:opportunities`, JSON.stringify(this.opportunities));
      localStorage.setItem(`nacora:v2:user:${userId}:contacts`, JSON.stringify(this.contacts));
      localStorage.setItem(`nacora:v2:user:${userId}:companies`, JSON.stringify(this.companies));
      localStorage.setItem(`nacora:v2:user:${userId}:calendar`, JSON.stringify(this.calendarEvents));
      localStorage.setItem(`nacora:v2:user:${userId}:documents`, JSON.stringify(this.documents));
      localStorage.setItem(`nacora:v2:user:${userId}:sessions`, JSON.stringify(this.chatSessions));
      localStorage.setItem(`nacora:v2:user:${userId}:prospect_leads`, JSON.stringify(this.prospectLeads));
      localStorage.setItem(`nacora:v2:user:${userId}:prospect_lists`, JSON.stringify(this.prospectLists));
      localStorage.setItem(`nacora:v2:user:${userId}:prospect_searches`, JSON.stringify(this.savedSearches));
      localStorage.setItem(`nacora:v2:user:${userId}:prospect_activities`, JSON.stringify(this.prospectActivities));
      localStorage.setItem(`nacora:v2:user:${userId}:prospect_settings`, JSON.stringify(this.prospectingSettings));
      localStorage.setItem(`nacora:v2:user:${userId}:ai_usage_records`, JSON.stringify(this.aiUsageRecords));
      localStorage.setItem(`nacora:v2:user:${userId}:ai_usage_settings`, JSON.stringify(this.aiUsageSettings));
      if (this.dailyBrief) {
        localStorage.setItem(`nacora:v2:user:${userId}:daily_brief`, JSON.stringify(this.dailyBrief));
        localStorage.setItem(`nacora_${userId}_daily_brief`, JSON.stringify(this.dailyBrief));
      } else {
        localStorage.removeItem(`nacora:v2:user:${userId}:daily_brief`);
        localStorage.removeItem(`nacora_${userId}_daily_brief`);
      }

      // Backward compatibility keys (strictly scoped to this userId)
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
    if (this.currentUserId !== userId) return;
    if (this.checkQuotaExceeded() || Date.now() < this.syncBackoffUntil) return;
    
    // If a sync is already running, mark that another sync is needed when it finishes
    if (this.isSyncing) {
      this.needsAnotherSync = true;
      return;
    }

    this.isSyncing = true;
    const currentSeq = this.sessionSequenceId;

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
        dailyBrief: this.dailyBrief || null,
        updatedAt: new Date().toISOString()
      };
      const cleanPayload = cleanForFirestore(JSON.parse(JSON.stringify(rawPayload)));
      
      await setDoc(userRef, cleanPayload, { merge: true });

      if (currentSeq !== this.sessionSequenceId || this.currentUserId !== userId) {
        return;
      }

      this.lastSyncSuccess = true;
      this.cloudStatus = "connected";
      this.lastCloudSyncTime = new Date().toISOString();
      this.lastCloudError = null;
    } catch (e: any) {
      const errMsg = e?.message || String(e);
      const errCode = e?.code || "";
      if (errCode === "resource-exhausted" || errMsg.includes("resource-exhausted")) {
        this.markQuotaExceeded("Quota journalier Firestore atteint. Sauvegarde locale active.");
      } else if (errCode === "permission-denied" || errMsg.includes("permission-denied")) {
        this.lastSyncSuccess = false;
        this.cloudStatus = "error";
        this.lastCloudError = "Erreur de permissions d'accès Firestore";
      } else if (errCode === "unauthenticated" || errMsg.includes("unauthenticated")) {
        this.lastSyncSuccess = false;
        this.cloudStatus = "error";
        this.lastCloudError = "Session expirée — Veuillez vous reconnecter";
      } else if (errMsg.includes("not found") || errMsg.includes("not-found") || errMsg.includes("Database")) {
        this.lastSyncSuccess = false;
        this.cloudStatus = "offline";
        this.lastCloudError = "Base de données cloud en attente de provisionnement. Mode local actif.";
      } else {
        this.lastSyncSuccess = false;
        this.cloudStatus = "offline";
        this.syncBackoffUntil = Date.now() + 10000; // 10s backoff for transient network issues
        this.lastCloudError = "Connexion cloud temporairement indisponible — Mode local actif";
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
    if (this.currentUserId) {
      this.saveToUserLocalStorage(this.currentUserId);
    }
    this.notify();
  }

  // Daily Brief Operations
  getDailyBrief(): DailyBriefData | null {
    return this.dailyBrief;
  }

  setDailyBrief(brief: DailyBriefData | null) {
    this.dailyBrief = brief;
    if (this.currentUserId) {
      this.saveToUserLocalStorage(this.currentUserId);
      if (this.syncTimeout) clearTimeout(this.syncTimeout);
      this.syncTimeout = setTimeout(() => {
        if (this.currentUserId && !this.checkQuotaExceeded()) {
          this.syncToFirestore(this.currentUserId);
        }
      }, 1500);
    }
    this.notifyListenersOnly();
  }

  async saveUserProfile(profileData: Partial<CandidateProfile>): Promise<CandidateProfile> {
    this.profile = { ...this.profile, ...profileData };
    const { score } = calculateProfileCompletion(this.profile);
    this.profile.profileCompletionScore = score;

    if (this.currentUserId) {
      this.saveToUserLocalStorage(this.currentUserId);
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

  reconcileOpportunityContacts() {
    if (!Array.isArray(this.opportunities) || this.opportunities.length === 0) return;
    if (!Array.isArray(this.contacts)) return;

    let changed = false;

    this.opportunities = this.opportunities.map(opp => {
      const contactIdSet = new Set<string>(opp.contactIds || []);

      // 1. Check recruiterContact
      if (opp.recruiterContact) {
        const recId = opp.recruiterContact.contactId || opp.recruiterContact.id;
        if (recId) {
          contactIdSet.add(recId);
        } else {
          const rawName = (opp.recruiterContact.name || "").trim();
          const rawEmail = (opp.recruiterContact.email || "").trim().toLowerCase();
          const rawLinkedin = (opp.recruiterContact.linkedinUrl || opp.recruiterContact.linkedin || "").trim();
          if (rawName || rawEmail || rawLinkedin) {
            const res = resolveContact({
              fullName: rawName,
              email: rawEmail,
              linkedInUrl: rawLinkedin,
              companyName: opp.companyName
            }, this.contacts);
            if (res.matchedContact && (res.decision === "certain" || res.decision === "probable")) {
              contactIdSet.add(res.matchedContact.id);
              opp.recruiterContact.contactId = res.matchedContact.id;
              opp.recruiterContact.id = res.matchedContact.id;
              changed = true;
            }
          }
        }
      }

      // 2. Check contacts in this.contacts matching opp.id
      this.contacts.forEach(c => {
        if (c.opportunityId === opp.id || (c.opportunityIds && c.opportunityIds.includes(opp.id))) {
          contactIdSet.add(c.id);
        }
      });

      const finalContactIds = Array.from(contactIdSet);
      if (JSON.stringify(finalContactIds.sort()) !== JSON.stringify((opp.contactIds || []).sort())) {
        changed = true;
        opp.contactIds = finalContactIds;
      }

      // 3. Ensure contacts are back-linked
      finalContactIds.forEach(cId => {
        const cIdx = this.contacts.findIndex(c => c.id === cId);
        if (cIdx !== -1) {
          const contact = this.contacts[cIdx];
          let cChanged = false;
          if (contact.opportunityId !== opp.id) {
            contact.opportunityId = opp.id;
            cChanged = true;
          }
          if (contact.opportunityTitle !== opp.title) {
            contact.opportunityTitle = opp.title;
            cChanged = true;
          }
          const oppIds = new Set(contact.opportunityIds || []);
          if (!oppIds.has(opp.id)) {
            oppIds.add(opp.id);
            contact.opportunityIds = Array.from(oppIds);
            cChanged = true;
          }
          if (cChanged) {
            this.contacts[cIdx] = { ...contact };
            changed = true;
          }
        }
      });

      return opp;
    });

    if (changed && this.currentUserId) {
      this.saveToUserLocalStorage(this.currentUserId);
    }
  }

  syncOpportunityContactsInternal(opp: Opportunity): Opportunity {
    if (!opp) return opp;

    const contactIdSet = new Set<string>(opp.contactIds || []);
    const recruiter = opp.recruiterContact || opp.extractedInfo?.recruiterContact;

    if (recruiter) {
      const rawName = (recruiter.name || "").trim();
      const rawEmail = (recruiter.email || "").trim().toLowerCase();
      const rawLinkedin = (recruiter.linkedinUrl || recruiter.linkedin || "").trim();
      const rawRole = (recruiter.role || "").trim();
      const rawPhone = (recruiter.phone || "").trim();

      if (rawName || rawEmail || rawLinkedin) {
        const resolution = resolveContact(
          {
            fullName: rawName,
            email: rawEmail,
            linkedInUrl: rawLinkedin,
            companyName: opp.companyName
          },
          this.contacts
        );

        let targetContactId = recruiter.contactId || recruiter.id || "";

        if (resolution.matchedContact && (resolution.decision === "certain" || resolution.decision === "probable")) {
          const existing = resolution.matchedContact;
          targetContactId = existing.id;

          const merged = mergeContactData(existing, {
            email: rawEmail || existing.email,
            phone: rawPhone || existing.phone,
            linkedInUrl: rawLinkedin || existing.linkedInUrl,
            companyName: opp.companyName || existing.companyName,
            companyId: opp.companyId || existing.companyId,
            jobTitle: rawRole || existing.jobTitle,
            opportunityId: opp.id,
            opportunityTitle: opp.title
          });

          const currentHistory = merged.history || [];
          if (!currentHistory.some(h => h.label && h.label.includes(opp.title))) {
            merged.history = [
              ...currentHistory,
              {
                id: "hist_" + Math.random().toString(36).substring(2, 9),
                type: "opportunity_linked",
                label: `Associé à l'opportunité "${opp.title}" chez ${opp.companyName}`,
                timestamp: new Date().toISOString()
              }
            ];
          }
          merged.opportunityId = opp.id;
          merged.opportunityTitle = opp.title;
          const oppIds = new Set(merged.opportunityIds || []);
          oppIds.add(opp.id);
          merged.opportunityIds = Array.from(oppIds);

          this.contacts = this.contacts.map(c => c.id === targetContactId ? merged : c);
        } else {
          const cleanName = cleanPersonDisplayName(rawName) || rawName || `Contact ${opp.companyName}`;
          const nameParts = cleanName.split(" ").filter(Boolean);
          const firstName = nameParts[0] || "";
          const lastName = nameParts.slice(1).join(" ") || "";
          const isHR = /recrut|rh|ressources humaines|talent|people|headhunter/i.test(rawRole);

          const { company: resCo } = resolveCompany({ companyName: opp.companyName, companyId: opp.companyId });

          const newContact: Contact = {
            id: "cont_" + Math.random().toString(36).substring(2, 9),
            fullName: cleanName,
            firstName,
            lastName,
            companyId: resCo.id,
            companyName: resCo.name,
            jobTitle: rawRole || "Recruteur / Interlocuteur",
            normalizedJobTitle: rawRole || "Recruteur / Interlocuteur",
            category: isHR ? "recruiter" : "sector_pro",
            relevanceScore: 85,
            connectionPoints: [`Interlocuteur principal pour l'opportunité "${opp.title}"`],
            previousCompanies: [],
            notes: `Contact créé automatiquement lors de l'enregistrement de l'opportunité "${opp.title}" chez ${opp.companyName}.`,
            email: rawEmail || undefined,
            phone: rawPhone || undefined,
            linkedInUrl: rawLinkedin || undefined,
            opportunityId: opp.id,
            opportunityTitle: opp.title,
            opportunityIds: [opp.id],
            history: [
              {
                id: "hist_" + Math.random().toString(36).substring(2, 9),
                type: "opportunity_linked",
                label: `Créé automatiquement via l'opportunité "${opp.title}" chez ${opp.companyName}`,
                timestamp: new Date().toISOString()
              }
            ],
            createdAt: new Date().toISOString()
          };

          this.contacts.push(newContact);
          targetContactId = newContact.id;
        }

        contactIdSet.add(targetContactId);

        opp.recruiterContact = {
          ...recruiter,
          id: targetContactId,
          contactId: targetContactId,
          name: rawName || recruiter.name,
          role: rawRole || recruiter.role,
          email: rawEmail || recruiter.email,
          phone: rawPhone || recruiter.phone,
          linkedinUrl: rawLinkedin || recruiter.linkedinUrl || recruiter.linkedin
        };
      }
    }

    const finalContactIds = Array.from(contactIdSet);

    // Ensure all contacts in finalContactIds have this opportunity linked
    finalContactIds.forEach(cId => {
      const idx = this.contacts.findIndex(c => c.id === cId);
      if (idx !== -1) {
        const c = this.contacts[idx];
        const oppIds = new Set(c.opportunityIds || []);
        oppIds.add(opp.id);
        this.contacts[idx] = {
          ...c,
          opportunityId: c.opportunityId || opp.id,
          opportunityTitle: c.opportunityTitle || opp.title,
          opportunityIds: Array.from(oppIds)
        };
      }
    });

    return {
      ...opp,
      contactIds: finalContactIds
    };
  }

  associateContactWithOpportunity(opportunityId: string, contactId: string) {
    const opp = this.opportunities.find(o => o.id === opportunityId);
    if (!opp) return;

    const contactSet = new Set(opp.contactIds || []);
    contactSet.add(contactId);
    opp.contactIds = Array.from(contactSet);

    const contact = this.contacts.find(c => c.id === contactId);
    if (contact) {
      contact.opportunityId = opp.id;
      contact.opportunityTitle = opp.title;
      const oppIds = new Set(contact.opportunityIds || []);
      oppIds.add(opp.id);
      contact.opportunityIds = Array.from(oppIds);

      const history = contact.history || [];
      if (!history.some(h => h.label && h.label.includes(opp.title))) {
        history.push({
          id: "hist_" + Math.random().toString(36).substring(2, 9),
          type: "opportunity_linked",
          label: `Associé à l'opportunité "${opp.title}" chez ${opp.companyName}`,
          timestamp: new Date().toISOString()
        });
        contact.history = history;
      }
    }

    this.updateOpportunity(opp);
  }

  disassociateContactFromOpportunity(opportunityId: string, contactId: string) {
    const opp = this.opportunities.find(o => o.id === opportunityId);
    if (!opp) return;

    opp.contactIds = (opp.contactIds || []).filter(id => id !== contactId);
    if (opp.recruiterContact?.contactId === contactId || opp.recruiterContact?.id === contactId) {
      opp.recruiterContact = {
        ...opp.recruiterContact,
        contactId: undefined,
        id: undefined
      };
    }

    const contact = this.contacts.find(c => c.id === contactId);
    if (contact) {
      if (contact.opportunityId === opportunityId) {
        contact.opportunityId = undefined;
        contact.opportunityTitle = undefined;
      }
      if (contact.opportunityIds) {
        contact.opportunityIds = contact.opportunityIds.filter(id => id !== opportunityId);
      }
    }

    this.updateOpportunity(opp);
  }

  addOpportunity(opp: Omit<Opportunity, "id" | "createdAt" | "updatedAt">): Opportunity {
    const { company: resCo } = resolveCompany({ companyName: opp.companyName, companyId: opp.companyId });
    let newOpp: Opportunity = {
      ...opp,
      companyId: resCo.id,
      companyName: resCo.name,
      id: "opp_" + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    newOpp = this.syncOpportunityContactsInternal(newOpp);

    this.opportunities.push(newOpp);
    this.recalculateCompanyCounters();
    this.notify();
    return newOpp;
  }

  updateOpportunity(opp: Opportunity) {
    const { company: resCo } = resolveCompany({ companyName: opp.companyName, companyId: opp.companyId });
    let updatedOpp: Opportunity = {
      ...opp,
      companyId: resCo.id,
      companyName: resCo.name,
      updatedAt: new Date().toISOString()
    };

    updatedOpp = this.syncOpportunityContactsInternal(updatedOpp);

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

  // Calendar Event Operations & Global Synchronization Engine
  syncGlobalCalendarEvents(): CalendarEvent[] {
    const derivedMap = new Map<string, CalendarEvent>();
    const todayStr = new Date().toISOString().split("T")[0];

    const addDaysToIso = (dateStr: string, days: number): string => {
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) {
          const now = new Date();
          now.setDate(now.getDate() + days);
          return now.toISOString().split("T")[0];
        }
        d.setDate(d.getDate() + days);
        return d.toISOString().split("T")[0];
      } catch {
        const now = new Date();
        now.setDate(now.getDate() + days);
        return now.toISOString().split("T")[0];
      }
    };

    // 1. DÉRIVER LES ÉVÉNEMENTS DEPUIS LES OPPORTUNITÉS
    if (Array.isArray(this.opportunities)) {
      this.opportunities.forEach(opp => {
        const isClosed = opp.status === 'refused' || opp.status === 'archived';

        // A. Date limite d'opportunité (Deadline)
        if (opp.deadline) {
          const id = `evt_opp_${opp.id}_deadline`;
          derivedMap.set(id, {
            id,
            title: `Date limite : ${opp.title}`,
            date: opp.deadline,
            type: 'deadline',
            sourceType: 'opportunity',
            sourceId: opp.id,
            opportunityId: opp.id,
            opportunityTitle: opp.title,
            companyName: opp.companyName,
            companyId: opp.companyId,
            syncStatus: 'confirmed',
            priority: 'high',
            actionable: true,
            isAutoDerived: true,
            notes: `Échéance de candidature ou de réponse pour ${opp.title} chez ${opp.companyName}.`,
            completed: false,
            createdAt: opp.createdAt || new Date().toISOString()
          });
        }

        // B. Date de début de contrat / stage
        if (opp.startDate) {
          const id = `evt_opp_${opp.id}_start`;
          derivedMap.set(id, {
            id,
            title: `Prise de poste : ${opp.title}`,
            date: opp.startDate,
            type: 'event',
            sourceType: 'opportunity',
            sourceId: opp.id,
            opportunityId: opp.id,
            opportunityTitle: opp.title,
            companyName: opp.companyName,
            companyId: opp.companyId,
            syncStatus: 'confirmed',
            priority: 'medium',
            actionable: false,
            isAutoDerived: true,
            notes: `Prise de poste prévisionnelle pour le poste ${opp.title} chez ${opp.companyName}.`,
            completed: false,
            createdAt: opp.createdAt || new Date().toISOString()
          });
        }

        // C. Suivi & Relance après dépôt de candidature
        if (!isClosed && (opp.status === 'candidated' || opp.status === 'applied' || opp.status === 'to_apply')) {
          const followUpDate = addDaysToIso(opp.updatedAt || opp.createdAt || todayStr, 7);
          const id = `evt_opp_${opp.id}_followup`;
          derivedMap.set(id, {
            id,
            title: `Relance candidature : ${opp.title}`,
            date: followUpDate,
            type: 'follow_up',
            sourceType: 'opportunity',
            sourceId: opp.id,
            opportunityId: opp.id,
            opportunityTitle: opp.title,
            companyName: opp.companyName,
            companyId: opp.companyId,
            syncStatus: 'calculated',
            priority: 'medium',
            actionable: true,
            isAutoDerived: true,
            notes: `Relance conseillée à J+7 après votre candidature chez ${opp.companyName}.`,
            completed: false,
            createdAt: opp.createdAt || new Date().toISOString()
          });
        }

        // D. Entretiens prévus
        if (!isClosed && (opp.status === 'interview_1' || opp.status === 'interview_2' || opp.status === 'interview_3' || opp.status === 'interview' || opp.status === 'proposal')) {
          const id = `evt_opp_${opp.id}_interview`;
          const interviewDate = opp.recruiterContact?.meetingDate || addDaysToIso(opp.updatedAt || todayStr, 2);
          derivedMap.set(id, {
            id,
            title: opp.status === 'proposal' ? `Échéance proposition : ${opp.title}` : `Entretien : ${opp.title}`,
            date: interviewDate,
            type: opp.status === 'proposal' ? 'deadline' : 'interview',
            sourceType: 'opportunity',
            sourceId: opp.id,
            opportunityId: opp.id,
            opportunityTitle: opp.title,
            companyName: opp.companyName,
            companyId: opp.companyId,
            syncStatus: 'confirmed',
            priority: 'high',
            actionable: true,
            isAutoDerived: true,
            notes: `Session d'entretien ou point de décision pour ${opp.title} chez ${opp.companyName}.`,
            completed: false,
            createdAt: opp.createdAt || new Date().toISOString()
          });

          // Crénau dédié de préparation avant l'entretien (J-1)
          if (opp.status !== 'proposal') {
            const prepId = `evt_opp_${opp.id}_prep`;
            const prepDate = addDaysToIso(interviewDate, -1);
            derivedMap.set(prepId, {
              id: prepId,
              title: `Préparation entretien : ${opp.title}`,
              date: prepDate,
              type: 'preparation',
              sourceType: 'opportunity',
              sourceId: opp.id,
              opportunityId: opp.id,
              opportunityTitle: opp.title,
              companyName: opp.companyName,
              companyId: opp.companyId,
              syncStatus: 'calculated',
              priority: 'high',
              actionable: true,
              isAutoDerived: true,
              notes: `Temps dédié à la préparation de votre entretien chez ${opp.companyName} (J-1) : analyser l'offre, réviser la fiche entreprise et préparer vos questions.`,
              completed: false,
              createdAt: opp.createdAt || new Date().toISOString()
            });
          }
        }

        // E. Étapes du workflow
        if (Array.isArray(opp.workflowHistory)) {
          opp.workflowHistory.forEach((step, idx) => {
            const isCompleted = step.status === 'completed' || step.completed;
            const name = step.stepName || step.title || `Étape ${idx + 1}`;
            if (step.date && !isCompleted && !isClosed) {
              const id = `evt_opp_${opp.id}_step_${idx}`;
              derivedMap.set(id, {
                id,
                title: `${name} : ${opp.title}`,
                date: step.date,
                type: name.toLowerCase().includes('entretien') ? 'interview' : 'task',
                sourceType: 'opportunity',
                sourceId: opp.id,
                opportunityId: opp.id,
                opportunityTitle: opp.title,
                companyName: opp.companyName,
                companyId: opp.companyId,
                syncStatus: 'confirmed',
                priority: 'high',
                actionable: true,
                isAutoDerived: true,
                notes: step.notes || `Étape "${name}" du processus de recrutement chez ${opp.companyName}.`,
                completed: false,
                createdAt: step.date
              });
            }
          });
        }
      });
    }

    // 2. DÉRIVER LES ÉVÉNEMENTS DEPUIS LES CONTACTS & LE RÉSEAU
    if (Array.isArray(this.contacts)) {
      this.contacts.forEach(contact => {
        const isInactive = contact.networkingStatus === 'sans_suite' || contact.networkingStatus === 'not_interested';

        // A. Prochaine relance explicite
        if (contact.nextFollowUpDate && !isInactive) {
          const id = `evt_cont_${contact.id}_next_followup`;
          derivedMap.set(id, {
            id,
            title: `Relance réseau : ${contact.fullName}`,
            date: contact.nextFollowUpDate,
            type: 'follow_up',
            sourceType: 'contact',
            sourceId: contact.id,
            contactId: contact.id,
            companyName: contact.companyName,
            companyId: contact.companyId,
            opportunityId: contact.opportunityId,
            opportunityTitle: contact.opportunityTitle,
            syncStatus: 'confirmed',
            priority: 'high',
            actionable: true,
            isAutoDerived: true,
            notes: `Relance programmée avec ${contact.fullName} (${contact.jobTitle || "Contact"} chez ${contact.companyName || "Entreprise"}).`,
            completed: false,
            createdAt: contact.createdAt || new Date().toISOString()
          });
        }

        // B. Action réseau explicite
        if (contact.nextAction?.dueDate && !isInactive) {
          const id = `evt_cont_${contact.id}_next_action`;
          derivedMap.set(id, {
            id,
            title: `Action réseau : ${contact.nextAction.label || contact.fullName}`,
            date: contact.nextAction.dueDate,
            type: 'task',
            sourceType: 'contact',
            sourceId: contact.id,
            contactId: contact.id,
            companyName: contact.companyName,
            companyId: contact.companyId,
            opportunityId: contact.opportunityId,
            opportunityTitle: contact.opportunityTitle,
            syncStatus: 'confirmed',
            priority: 'medium',
            actionable: true,
            isAutoDerived: true,
            notes: `Action réseau prévue avec ${contact.fullName}.`,
            completed: false,
            createdAt: contact.createdAt || new Date().toISOString()
          });
        }

        // C. Réponse reçue à traiter
        if ((contact.networkingStatus === 'reponse_recue' || contact.networkingStatus === 'reponse_a_traiter') && !isInactive) {
          const id = `evt_cont_${contact.id}_reply_needed`;
          const replyDate = contact.lastOutreachDate ? contact.lastOutreachDate.split("T")[0] : todayStr;
          derivedMap.set(id, {
            id,
            title: `Réponse reçue : ${contact.fullName}`,
            date: replyDate,
            type: 'follow_up',
            sourceType: 'contact',
            sourceId: contact.id,
            contactId: contact.id,
            companyName: contact.companyName,
            companyId: contact.companyId,
            opportunityId: contact.opportunityId,
            opportunityTitle: contact.opportunityTitle,
            syncStatus: 'ai_suggestion',
            priority: 'high',
            actionable: true,
            isAutoDerived: true,
            notes: `${contact.fullName} a répondu à votre message. Répondez ou fixez un créneau d'échange.`,
            completed: false,
            createdAt: replyDate
          });
        }

        // D. Relance à faire basée sur la stratégie réseau
        if ((contact.networkingStatus === 'relance_a_faire' || contact.networkingStatus === 'a_contacter') && !contact.nextFollowUpDate && !isInactive) {
          const id = `evt_cont_${contact.id}_auto_followup`;
          const calcDate = addDaysToIso(contact.lastOutreachDate || contact.initialMessageSentDate || contact.createdAt || todayStr, 7);
          derivedMap.set(id, {
            id,
            title: `Relancer : ${contact.fullName}`,
            date: calcDate,
            type: 'follow_up',
            sourceType: 'contact',
            sourceId: contact.id,
            contactId: contact.id,
            companyName: contact.companyName,
            companyId: contact.companyId,
            opportunityId: contact.opportunityId,
            opportunityTitle: contact.opportunityTitle,
            syncStatus: 'calculated',
            priority: 'medium',
            actionable: true,
            isAutoDerived: true,
            notes: `Relance calculée à J+7 après le dernier message à ${contact.fullName}.`,
            completed: false,
            createdAt: contact.createdAt || new Date().toISOString()
          });
        }

        // E. Rendez-vous téléphonique / Café réseau
        if (contact.networkingStatus === 'appel_prevu' && !isInactive) {
          const id = `evt_cont_${contact.id}_call_scheduled`;
          const callDate = contact.nextFollowUpDate || addDaysToIso(todayStr, 1);
          derivedMap.set(id, {
            id,
            title: `Échange téléphonique / Café : ${contact.fullName}`,
            date: callDate,
            type: 'meeting',
            sourceType: 'contact',
            sourceId: contact.id,
            contactId: contact.id,
            companyName: contact.companyName,
            companyId: contact.companyId,
            opportunityId: contact.opportunityId,
            opportunityTitle: contact.opportunityTitle,
            syncStatus: 'confirmed',
            priority: 'high',
            actionable: true,
            isAutoDerived: true,
            notes: `Rendez-vous planifié avec ${contact.fullName} (${contact.companyName || "Entreprise"}).`,
            completed: false,
            createdAt: contact.createdAt || new Date().toISOString()
          });
        }
      });
    }

    // 3. FUSIONNER DÉTERMINISTEMENT SANS DOUBLONS & CONSERVER LES MODIFICATIONS
    const existingMap = new Map<string, CalendarEvent>();
    (this.calendarEvents || []).forEach(evt => {
      existingMap.set(evt.id, evt);
    });

    const finalEvents: CalendarEvent[] = [];

    // Conserver les événements manuels, Google, ou créés indépendamment
    existingMap.forEach((evt) => {
      if (!evt.isAutoDerived && evt.sourceType !== 'opportunity' && evt.sourceType !== 'contact') {
        finalEvents.push(evt);
      }
    });

    // Mettre à jour / ajouter les événements dérivés
    derivedMap.forEach((derivedEvt, id) => {
      const existing = existingMap.get(id);
      if (existing) {
        finalEvents.push({
          ...derivedEvt,
          completed: existing.completed ?? derivedEvt.completed,
          time: existing.time || derivedEvt.time,
          notes: existing.notes && existing.notes !== derivedEvt.notes ? existing.notes : derivedEvt.notes,
          updatedAt: new Date().toISOString()
        });
      } else {
        finalEvents.push(derivedEvt);
      }
    });

    this.calendarEvents = finalEvents;
    return this.calendarEvents;
  }

  getCalendarEvents(): CalendarEvent[] {
    return this.syncGlobalCalendarEvents();
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
    const prev = this.calendarEvents.find(e => e.id === event.id);
    this.calendarEvents = this.calendarEvents.map(e => e.id === event.id ? event : e);

    // Synchronisation bidirectionnelle vers la source
    if (prev && prev.completed !== event.completed) {
      if (event.sourceType === 'contact' && event.contactId) {
        const c = this.contacts.find(ct => ct.id === event.contactId);
        if (c && event.completed) {
          const updatedContact: Contact = {
            ...c,
            nextFollowUpDate: undefined,
            networkingStatus: c.networkingStatus === 'relance_a_faire' ? 'echange_en_cours' : c.networkingStatus,
            lastOutreachDate: new Date().toISOString()
          };
          this.updateContact(updatedContact);
        }
      } else if (event.sourceType === 'opportunity' && event.opportunityId) {
        const o = this.opportunities.find(opp => opp.id === event.opportunityId);
        if (o && event.completed && Array.isArray(o.workflowHistory)) {
          const updatedHistory = o.workflowHistory.map(step => {
            const stepTitle = (step.stepName || step.title || "").toLowerCase();
            if (stepTitle.includes('entretien') || stepTitle.includes('relance')) {
              return { ...step, status: 'completed' as const, completed: true };
            }
            return step;
          });
          this.updateOpportunity({ ...o, workflowHistory: updatedHistory });
        }
      }
    }

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

  addChatSession(personaId: string, title: string, sourcesConfig?: any): ChatSession {
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
      sourcesConfig: sourcesConfig || undefined,
      updatedAt: new Date().toISOString()
    };
    this.chatSessions.push(newSess);
    this.notify();
    return newSess;
  }

  updateChatSessionSources(sessionId: string, sourcesConfig: any) {
    this.chatSessions = this.chatSessions.map(sess => {
      if (sess.id === sessionId) {
        return {
          ...sess,
          sourcesConfig: { ...sourcesConfig },
          updatedAt: new Date().toISOString()
        };
      }
      return sess;
    });
    this.notify();
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
      dailyBrief: this.dailyBrief,
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
      if (data.dailyBrief && typeof data.dailyBrief === "object") {
        this.dailyBrief = data.dailyBrief;
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
