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

export const createDefaultProfile = (
  id: string = "profile",
  email: string = "",
  fullName: string = ""
): CandidateProfile => ({
  id,
  fullName: fullName || (email ? email.split("@")[0] : ""),
  email: email,
  phone: "",
  currentSituation: "",
  currentAlternance: "",
  targetMasters: ["Finance", "Gestion de patrimoine", "Fintech"],
  skills: [],
  languages: ["Français"],
  certifications: [],
  projects: [],
  experiences: [],
  bio: "",
  profileCompletionScore: 10
});

const DEMO_IDS = new Set([
  "opp_1", "opp_2", "opp_3", "opp_4", "opp_5", "opp_6", "opp_7", "opp_8", "opp_9",
  "cont_1", "cont_2", "cont_3",
  "co_ca", "co_lcl", "co_luko", "co_bnp", "co_sg", "co_palatine", "co_axa", "co_bpifrance", "co_payplug",
  "cal_1", "cal_2", "cal_3"
]);

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

// Helper to filter out legacy demo data
function filterOutDemoData<T extends { id?: string }>(items: T[] | undefined | null): T[] {
  if (!items || !Array.isArray(items)) return [];
  return items.filter(item => !item.id || !DEMO_IDS.has(item.id));
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
        text: "Bonjour ! Je suis ton conseiller de carrière intelligent NACORA. Je suis là pour t'accompagner dans la recherche, la préparation et le suivi de tes opportunités d'alternance, de stage ou de premier emploi en Finance, Fintech ou Gestion de Patrimoine. Comment puis-je t'aider aujourd'hui ?",
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

  private notifyListenersOnly() {
    this.listeners.forEach(listener => listener());
  }

  private notify() {
    this.notifyListenersOnly();
    if (this.currentUserId) {
      this.saveToUserLocalStorage(this.currentUserId);
      if (this.syncTimeout) clearTimeout(this.syncTimeout);
      this.syncTimeout = setTimeout(() => {
        if (this.currentUserId) {
          this.syncToFirestore(this.currentUserId);
        }
      }, 500);
    } else {
      this.saveToLocalStorage();
    }
  }

  // Initialize for authenticated user
  async initializeForUser(userId: string, email?: string | null, displayName?: string | null) {
    this.currentUserId = userId;
    try {
      // 1. Try to load from Firestore document
      const userRef = doc(db, "users", userId);
      const snapshot = await getDoc(userRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.profile) {
          this.profile = data.profile;
        } else {
          this.profile = createDefaultProfile(userId, email || "", displayName || "");
        }
        
        this.opportunities = filterOutDemoData(data.opportunities);
        this.contacts = filterOutDemoData(data.contacts);
        this.companies = filterOutDemoData(data.companies);
        this.calendarEvents = filterOutDemoData(data.calendarEvents);
        this.documents = data.documents || [];
        this.chatSessions = data.chatSessions || INITIAL_SESSIONS;
      } else {
        // 2. Check if user-scoped localStorage has cached state
        const localKey = `nacora_${userId}_profile`;
        if (localStorage.getItem(localKey)) {
          this.loadFromUserLocalStorage(userId);
        } else {
          // 3. Brand new account: initialize clean profile with empty collections
          this.profile = createDefaultProfile(userId, email || "", displayName || "");
          this.opportunities = [];
          this.contacts = [];
          this.companies = [];
          this.calendarEvents = [];
          this.documents = [];
          this.chatSessions = INITIAL_SESSIONS;
        }
      }
      this.recalculateCompanyCounters();
      this.saveToUserLocalStorage(userId);
      await this.syncToFirestore(userId);
      this.notifyListenersOnly();
    } catch (e) {
      console.error("Error initializing user store:", e);
      // Fallback to local storage if offline or firestore fails
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

  // LocalStorage Persistence (Fallback / Generic)
  private loadFromLocalStorage() {
    try {
      const p = localStorage.getItem("nacora_profile");
      if (p) this.profile = JSON.parse(p);
      else this.profile = INITIAL_PROFILE;

      const o = localStorage.getItem("nacora_opportunities");
      if (o) this.opportunities = filterOutDemoData(JSON.parse(o));
      else this.opportunities = [];

      const c = localStorage.getItem("nacora_contacts");
      if (c) this.contacts = filterOutDemoData(JSON.parse(c));
      else this.contacts = [];

      const co = localStorage.getItem("nacora_companies");
      if (co) this.companies = filterOutDemoData(JSON.parse(co));
      else this.companies = [];

      const cal = localStorage.getItem("nacora_calendar");
      if (cal) this.calendarEvents = filterOutDemoData(JSON.parse(cal));
      else this.calendarEvents = [];

      const docu = localStorage.getItem("nacora_documents");
      if (docu) this.documents = JSON.parse(docu);
      else this.documents = [];

      const sess = localStorage.getItem("nacora_sessions");
      if (sess) this.chatSessions = JSON.parse(sess);
      else this.chatSessions = INITIAL_SESSIONS;

      this.recalculateCompanyCounters();
    } catch (e) {
      console.error("Error loading local storage:", e);
    }
  }

  private saveToLocalStorage() {
    try {
      localStorage.setItem("nacora_profile", JSON.stringify(this.profile));
      localStorage.setItem("nacora_opportunities", JSON.stringify(this.opportunities));
      localStorage.setItem("nacora_contacts", JSON.stringify(this.contacts));
      localStorage.setItem("nacora_companies", JSON.stringify(this.companies));
      localStorage.setItem("nacora_calendar", JSON.stringify(this.calendarEvents));
      localStorage.setItem("nacora_documents", JSON.stringify(this.documents));
      localStorage.setItem("nacora_sessions", JSON.stringify(this.chatSessions));
    } catch (e) {
      console.error("Error writing local storage:", e);
    }
  }

  // User-scoped local storage
  private loadFromUserLocalStorage(userId: string) {
    try {
      const p = localStorage.getItem(`nacora_${userId}_profile`);
      if (p) this.profile = JSON.parse(p);
      else this.profile = createDefaultProfile(userId);

      const o = localStorage.getItem(`nacora_${userId}_opportunities`);
      if (o) this.opportunities = filterOutDemoData(JSON.parse(o));
      else this.opportunities = [];

      const c = localStorage.getItem(`nacora_${userId}_contacts`);
      if (c) this.contacts = filterOutDemoData(JSON.parse(c));
      else this.contacts = [];

      const co = localStorage.getItem(`nacora_${userId}_companies`);
      if (co) this.companies = filterOutDemoData(JSON.parse(co));
      else this.companies = [];

      const cal = localStorage.getItem(`nacora_${userId}_calendar`);
      if (cal) this.calendarEvents = filterOutDemoData(JSON.parse(cal));
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

  // Firebase Sync
  async syncToFirestore(userId: string) {
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
      console.log("State synced to Firestore successfully for user", userId);
    } catch (e) {
      console.error("Error syncing to Firestore:", e);
    }
  }

  async loadFromFirestore(userId: string) {
    try {
      const userRef = doc(db, "users", userId);
      const snapshot = await getDoc(userRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.profile) this.profile = data.profile;
        if (data.opportunities) this.opportunities = filterOutDemoData(data.opportunities);
        if (data.contacts) this.contacts = filterOutDemoData(data.contacts);
        if (data.companies) this.companies = filterOutDemoData(data.companies);
        if (data.calendarEvents) this.calendarEvents = filterOutDemoData(data.calendarEvents);
        if (data.documents) this.documents = data.documents;
        if (data.chatSessions) this.chatSessions = data.chatSessions;
        
        this.recalculateCompanyCounters();
        this.notifyListenersOnly();
      }
    } catch (e) {
      console.error("Error loading from Firestore:", e);
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
    
    // Recalculate profile completion score
    let score = 20;
    if (this.profile.fullName) score += 10;
    if (this.profile.phone) score += 10;
    if (this.profile.bio) score += 10;
    if (this.profile.skills.length > 3) score += 15;
    if (this.profile.experiences.length > 0) score += 15;
    if (this.profile.certifications.length > 0) score += 10;
    if (this.profile.languages.length > 0) score += 10;
    
    this.profile.profileCompletionScore = Math.min(score, 100);
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
