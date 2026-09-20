import { 
  CandidateProfile, 
  Opportunity, 
  Contact, 
  Company, 
  CalendarEvent, 
  DocumentFile, 
  ChatSession 
} from "./types";
import { db } from "./firebase";
import { 
  doc, 
  setDoc, 
  getDoc 
} from "firebase/firestore";

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

class DBStore {
  private profile: CandidateProfile = INITIAL_PROFILE;
  private opportunities: Opportunity[] = [];
  private contacts: Contact[] = [];
  private companies: Company[] = [];
  private calendarEvents: CalendarEvent[] = [];
  private documents: DocumentFile[] = [];
  private chatSessions: ChatSession[] = INITIAL_SESSIONS;

  private currentUserId: string | null = null;
  private syncTimeout: any = null;
  private listeners: Set<() => void> = new Set();
  private isQuotaExceeded: boolean = false;
  private lastSyncSuccess: boolean = true;

  constructor() {
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
      lastSyncSuccess: this.lastSyncSuccess
    };
  }

  private notifyListenersOnly() {
    this.listeners.forEach(listener => listener());
  }

  private notify() {
    this.notifyListenersOnly();
    if (this.currentUserId) {
      this.saveToUserLocalStorage(this.currentUserId);
      if (this.syncTimeout) clearTimeout(this.syncTimeout);
      this.syncTimeout = setTimeout(() => {
        if (this.currentUserId && !this.isQuotaExceeded) {
          this.syncToFirestore(this.currentUserId);
        }
      }, 800);
    } else {
      this.saveToLocalStorage();
    }
  }

  // Initialize for authenticated user (Dual-layer persistence: localStorage + Cloud Firestore)
  async initializeForUser(userId: string, email?: string | null, displayName?: string | null) {
    this.currentUserId = userId;
    
    // 1. Load immediately from user local storage for zero-latency offline-first persistence
    this.loadFromUserLocalStorage(userId);
    if (!this.profile.email && email) {
      this.profile.email = email;
    }
    if ((!this.profile.firstName || !this.profile.fullName) && displayName) {
      this.profile.fullName = displayName;
      this.profile.firstName = displayName.split(" ")[0];
      this.profile.lastName = displayName.split(" ").slice(1).join(" ");
    }

    // 2. Sync with Cloud Firestore
    try {
      const userRef = doc(db, "users", userId);
      const snapshot = await getDoc(userRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.profile && Object.keys(data.profile).length > 0) {
          // If Firestore has a more complete profile or data, use it
          this.profile = { ...this.profile, ...data.profile };
        }
        if (data.opportunities && data.opportunities.length > 0) {
          this.opportunities = data.opportunities;
        }
        if (data.contacts && data.contacts.length > 0) {
          this.contacts = data.contacts;
        }
        if (data.companies && data.companies.length > 0) {
          this.companies = data.companies;
        }
        if (data.calendarEvents && data.calendarEvents.length > 0) {
          this.calendarEvents = data.calendarEvents;
        }
        if (data.documents && data.documents.length > 0) {
          this.documents = data.documents;
        }
        if (data.chatSessions && data.chatSessions.length > 0) {
          this.chatSessions = data.chatSessions;
        }
      } else if (!this.isQuotaExceeded) {
        // If not in cloud yet, persist current local data to cloud
        await this.syncToFirestore(userId);
      }

      this.recalculateCompanyCounters();
      this.saveToUserLocalStorage(userId);
      this.notifyListenersOnly();
    } catch (e: any) {
      const errMsg = e?.message || String(e);
      if (errMsg.includes("resource-exhausted") || errMsg.includes("Quota limit exceeded") || errMsg.includes("quota")) {
        this.isQuotaExceeded = true;
        console.warn("Firestore daily quota reached. Switched to offline-first local storage mode.");
      } else {
        console.warn("Cloud sync offline mode, using local session data:", e);
      }
      this.loadFromUserLocalStorage(userId);
      this.notifyListenersOnly();
    }
  }

  clearUser() {
    this.currentUserId = null;
    this.profile = createDefaultProfile();
    this.opportunities = [];
    this.contacts = [];
    this.companies = [];
    this.calendarEvents = [];
    this.documents = [];
    this.chatSessions = INITIAL_SESSIONS;
    this.notifyListenersOnly();
  }

  // LocalStorage Fallback
  private loadFromLocalStorage() {
    try {
      const p = localStorage.getItem("nacora_profile");
      if (p) this.profile = JSON.parse(p);
      else this.profile = INITIAL_PROFILE;
    } catch (e) {
      console.error("Error loading local storage:", e);
    }
  }

  private saveToLocalStorage() {
    try {
      localStorage.setItem("nacora_profile", JSON.stringify(this.profile));
    } catch (e) {
      console.error("Error writing local storage:", e);
    }
  }

  private loadFromUserLocalStorage(userId: string) {
    try {
      const p = localStorage.getItem(`nacora_${userId}_profile`);
      if (p) this.profile = JSON.parse(p);
      else this.profile = createDefaultProfile(userId);

      const o = localStorage.getItem(`nacora_${userId}_opportunities`);
      if (o) this.opportunities = JSON.parse(o);
      else this.opportunities = [];

      const c = localStorage.getItem(`nacora_${userId}_contacts`);
      if (c) this.contacts = JSON.parse(c);
      else this.contacts = [];

      const co = localStorage.getItem(`nacora_${userId}_companies`);
      if (co) this.companies = JSON.parse(co);
      else this.companies = [];

      const cal = localStorage.getItem(`nacora_${userId}_calendar`);
      if (cal) this.calendarEvents = JSON.parse(cal);
      else this.calendarEvents = [];

      const docu = localStorage.getItem(`nacora_${userId}_documents`);
      if (docu) this.documents = JSON.parse(docu);
      else this.documents = [];

      const sess = localStorage.getItem(`nacora_${userId}_sessions`);
      if (sess) this.chatSessions = JSON.parse(sess);
      else this.chatSessions = INITIAL_SESSIONS;

      this.recalculateCompanyCounters();
    } catch (e) {
      console.error("Error loading user local storage:", e);
    }
  }

  private saveToUserLocalStorage(userId: string) {
    try {
      localStorage.setItem(`nacora_${userId}_profile`, JSON.stringify(this.profile));
      localStorage.setItem(`nacora_${userId}_opportunities`, JSON.stringify(this.opportunities));
      localStorage.setItem(`nacora_${userId}_contacts`, JSON.stringify(this.contacts));
      localStorage.setItem(`nacora_${userId}_companies`, JSON.stringify(this.companies));
      localStorage.setItem(`nacora_${userId}_calendar`, JSON.stringify(this.calendarEvents));
      localStorage.setItem(`nacora_${userId}_documents`, JSON.stringify(this.documents));
      localStorage.setItem(`nacora_${userId}_sessions`, JSON.stringify(this.chatSessions));
    } catch (e) {
      console.error("Error writing user local storage:", e);
    }
  }

  // Firebase Cloud Sync
  async syncToFirestore(userId: string) {
    if (this.isQuotaExceeded) return;
    try {
      const userRef = doc(db, "users", userId);
      const rawPayload = {
        profile: this.profile,
        opportunities: this.opportunities,
        contacts: this.contacts,
        companies: this.companies,
        calendarEvents: this.calendarEvents,
        documents: this.documents,
        chatSessions: this.chatSessions,
        updatedAt: new Date().toISOString()
      };
      const cleanPayload = cleanForFirestore(JSON.parse(JSON.stringify(rawPayload)));
      await setDoc(userRef, cleanPayload, { merge: true });
      this.lastSyncSuccess = true;
    } catch (e: any) {
      const errMsg = e?.message || String(e);
      if (errMsg.includes("resource-exhausted") || errMsg.includes("Quota limit exceeded") || errMsg.includes("quota")) {
        this.isQuotaExceeded = true;
        this.lastSyncSuccess = false;
        console.warn("Firestore daily write quota reached for today. Local storage is safeguarding your data.");
      } else {
        console.error("Error syncing to Firestore cloud:", e);
      }
    }
  }

  // Helper to recalculate business analytics reactively
  private recalculateCompanyCounters() {
    this.companies = this.companies.map(co => {
      const oppCount = this.opportunities.filter(o => o.companyId === co.id).length;
      const contactCount = this.contacts.filter(c => c.companyId === co.id).length;
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
    this.notify();
  }

  // Opportunity Operations
  getOpportunities(): Opportunity[] {
    return this.opportunities;
  }

  addOpportunity(opp: Omit<Opportunity, "id" | "createdAt" | "updatedAt">): Opportunity {
    const newOpp: Opportunity = {
      ...opp,
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
    this.opportunities = this.opportunities.map(o => o.id === opp.id ? { ...opp, updatedAt: new Date().toISOString() } : o);
    this.recalculateCompanyCounters();
    this.notify();
  }

  deleteOpportunity(id: string) {
    this.opportunities = this.opportunities.filter(o => o.id !== id);
    this.recalculateCompanyCounters();
    this.notify();
    if (this.currentUserId) {
      this.syncToFirestore(this.currentUserId);
    }
  }

  resetOpportunities() {
    this.opportunities = [];
    this.recalculateCompanyCounters();
    this.notify();
    if (this.currentUserId) {
      this.syncToFirestore(this.currentUserId);
    }
  }

  // Contact Operations
  getContacts(): Contact[] {
    return this.contacts;
  }

  addContact(contact: Omit<Contact, "id" | "createdAt">): Contact {
    const newContact: Contact = {
      ...contact,
      id: "cont_" + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString()
    };
    this.contacts.push(newContact);
    this.recalculateCompanyCounters();
    this.notify();
    return newContact;
  }

  updateContact(contact: Contact) {
    this.contacts = this.contacts.map(c => c.id === contact.id ? contact : c);
    this.recalculateCompanyCounters();
    this.notify();
  }

  deleteContact(id: string) {
    this.contacts = this.contacts.filter(c => c.id !== id);
    this.recalculateCompanyCounters();
    this.notify();
    if (this.currentUserId) {
      this.syncToFirestore(this.currentUserId);
    }
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
    const cleanName = name.trim();
    let comp = this.companies.find(c => c.name.toLowerCase() === cleanName.toLowerCase());
    if (!comp) {
      comp = {
        id: "co_" + Math.random().toString(36).substring(2, 9),
        name: cleanName,
        sector: "Secteur à préciser",
        notes: "",
        createdAt: new Date().toISOString(),
        opportunityCount: 0,
        contactCount: 0,
        noteCount: 0
      };
      this.companies.push(comp);
      this.notify();
    }
    return comp;
  }

  updateCompany(company: Company) {
    this.companies = this.companies.map(c => c.id === company.id ? company : c);
    this.notify();
  }

  deleteCompany(id: string) {
    this.companies = this.companies.filter(c => c.id !== id);
    this.notify();
    if (this.currentUserId) {
      this.syncToFirestore(this.currentUserId);
    }
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
    if (this.currentUserId) {
      this.syncToFirestore(this.currentUserId);
    }
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
    if (this.currentUserId) {
      this.syncToFirestore(this.currentUserId);
    }
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
    if (this.currentUserId) {
      this.syncToFirestore(this.currentUserId);
    }
  }
}

export const dbStore = new DBStore();
