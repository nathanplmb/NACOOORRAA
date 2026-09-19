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
  email: string = "nathpa1423@gmail.com",
  fullName: string = "Nathan PALUMBO"
): CandidateProfile => {
  const baseProfile: CandidateProfile = {
    id,
    firstName: "Nathan",
    lastName: "PALUMBO",
    fullName: fullName || "Nathan PALUMBO",
    email: email || "nathpa1423@gmail.com",
    phone: "06 12 34 56 78",
    title: "Étudiant PGE | Finance, Business Development & Fintech",
    avatarUrl: "",
    driverLicense: "Permis B (Véhiculé)",
    city: "Reims",
    country: "France",
    mobility: "Régionale (Auvergne-Rhône-Alpes / Grand Est), France entière",
    linkedInUrl: "https://www.linkedin.com/in/nathan-palumbo",
    portfolioUrl: "https://nathan-palumbo.fr",
    githubUrl: "https://github.com/nathanpalumbo",

    currentSituation: "Étudiant PGE à NEOMA Business School",
    currentAlternance: "Crédit Agricole Centre France — Agence de Commentry",
    bio: "Étudiant passionné par le secteur bancaire, la gestion de patrimoine et les innovations Fintech. Fort de plusieurs expériences en relation client, vente conseil et animation événementielle, je prépare activement mon intégration en Master Finance & Banque.",

    // Objectifs & Préférences
    targetTitles: ["Assistant Clientèle", "Conseiller Clientèle Patrimoniale", "Analyste Financier", "Business Developer", "Chargé d'Affaires Entreprises"],
    targetSectors: ["Banque & Assurance", "Finance de Marché", "Fintech", "Gestion de Patrimoine"],
    targetCompanies: ["Crédit Agricole", "BNP Paribas", "Société Générale", "LCL", "BPCE"],
    contractTypes: ["Alternance", "Stage", "CDI", "VIE"],
    startDateTarget: "Septembre 2025",
    durationTarget: "12 à 24 mois",
    minSalary: "1 400 € / mois",
    workMode: "hybride",
    idealPositionSearch: "Je recherche un poste d'alternant ou de conseiller bancaire/financier stimulant au sein d'une banque de réseau ou d'une banque privée, me permettant de conjuguer relation client haut de gamme, analyse financière rigoureuse et appétence pour les outils d'innovation Fintech.",
    avoidSectors: ["Démarchage agressif", "Téléprospection à froid intensive"],
    redFlags: ["Absence de perspectives d'évolution", "Encadrement inexistant"],

    // Expériences
    experiences: [
      {
        id: "exp_1",
        role: "Alternant : Assistant Clientèle",
        company: "Crédit Agricole Centre France — Agence de Commentry",
        location: "Commentry, France",
        contractType: "Alternance",
        startDate: "2025-09",
        endDate: "",
        isCurrent: true,
        period: "2025-09 → Aujourd'hui",
        description: "Gestion et développement d'un portefeuille clients particuliers. Accueil physique et téléphonique, conseil en produits d'épargne, crédits à la consommation et services bancaires du quotidien.",
        kpis: ["+12% de souscriptions d'assurances sur le trimestre", "Taux de satisfaction client de 96%"],
        skills: ["Relation client", "Analyse financière", "Vente conseil", "Logiciels bancaires"]
      },
      {
        id: "exp_2",
        role: "Stagiaire : Assistant Clientèle",
        company: "Crédit Agricole Centre France — Agence de Yzeure",
        location: "Yzeure, France",
        contractType: "Stage",
        startDate: "2024-04",
        endDate: "2024-06",
        isCurrent: false,
        period: "2024-04 → 2024-06",
        description: "Traitement des opérations courantes de guichet, accompagnement des clients dans la transition digitale et l'utilisation de l'application mobile Ma Banque.",
        kpis: ["Accompagnement de +150 clients vers la banque en ligne"],
        skills: ["Accueil clientèle", "Opérations bancaires", "Sensibilisation digitale"]
      },
      {
        id: "exp_3",
        role: "Chef de service : Communication & Médias",
        company: "Association étudiante PRO.TE.CO Montluçon",
        location: "Montluçon, France",
        contractType: "Bénévolat",
        startDate: "2023-09",
        endDate: "2024-06",
        isCurrent: false,
        period: "2023-09 → 2024-06",
        description: "Pilotage de l'équipe média (5 membres), création des campagnes de communication pour les événements étudiants et gestion du budget communication.",
        kpis: ["+45% d'engagement sur les réseaux sociaux", "Budget géré : 5 000 €"],
        skills: ["Management d'équipe", "Communication digitale", "Gestion de budget", "Montage vidéo"]
      },
      {
        id: "exp_4",
        role: "Membre du service : Communication & Médias",
        company: "Association étudiante PRO.TE.CO Montluçon",
        location: "Montluçon, France",
        contractType: "Bénévolat",
        startDate: "2022-09",
        endDate: "2023-06",
        isCurrent: false,
        period: "2022-09 → 2023-06",
        description: "Réalisation de visuels promotionnels, captations d'événements et rédaction de la newsletter mensuelle de l'IUT.",
        skills: ["Canva", "Création de contenu", "Réseaux sociaux"]
      },
      {
        id: "exp_5",
        role: "Vendeur / Responsable de boutique",
        company: "Bonhomme Boutique Vichy",
        location: "Vichy, France",
        contractType: "CDD Saisonnier",
        startDate: "2023-06",
        endDate: "2023-08",
        isCurrent: false,
        period: "2023-06 → 2023-08",
        description: "Conseil client haut de gamme en prêt-à-porter masculin, encaissement, gestion du réassort et merchandising vitrine.",
        skills: ["Vente conseil", "Négociation commerciale", "Gestion de stock"]
      },
      {
        id: "exp_6",
        role: "Stagiaire : Assistant commercial",
        company: "Ford Motor Company Toulon-sur-Allier",
        location: "Toulon-sur-Allier, France",
        contractType: "Stage",
        startDate: "2023-01",
        endDate: "2023-02",
        isCurrent: false,
        period: "2023-01 → 2023-02",
        description: "Accueil concession, qualification des prospects véhicules d'occasion et neufs, organisation des essais véhicules.",
        skills: ["Relance commerciale", "Prospection", "Secteur automobile"]
      },
      {
        id: "exp_7",
        role: "Employé polyvalent",
        company: "E.Leclerc Occasion Avermes",
        location: "Avermes, France",
        contractType: "Job étudiant",
        startDate: "2022-06",
        endDate: "2022-08",
        isCurrent: false,
        period: "2022-06 → 2022-08",
        description: "Test et mise en rayon des produits multimédias et informatiques, négociation de rachat auprès des particuliers.",
        skills: ["Évaluation de biens", "Négociation", "Service client"]
      },
      {
        id: "exp_8",
        role: "Opérateur de commande",
        company: "La Cabanne Avermes",
        location: "Avermes, France",
        contractType: "Job étudiant",
        startDate: "2021-06",
        endDate: "2021-08",
        isCurrent: false,
        period: "2021-06 → 2021-08",
        description: "Préparation de commandes, logistique et contrôle qualité des expéditions sous contraintes de délais stricts.",
        skills: ["Rigueur", "Organisation", "Logistique"]
      },
      {
        id: "exp_9",
        role: "Responsable de stand",
        company: "Festival Château Perché & Et Après Festival",
        location: "Avrilly, France",
        contractType: "Événementiel",
        startDate: "2023-08",
        endDate: "2024-08",
        isCurrent: false,
        period: "2023-08 & 2024-08",
        description: "Gestion de stand, accueil des festivaliers, tenue de caisse et coordination de l'équipe de bénévoles.",
        skills: ["Coordination", "Gestion du stress", "Management"]
      },
      {
        id: "exp_10",
        role: "Carrossier automobile",
        company: "Garage Cocquelet Avermes",
        location: "Avermes, France",
        contractType: "Stage découverte / Apprentissage",
        startDate: "2020-09",
        endDate: "2021-06",
        isCurrent: false,
        period: "2020-09 → 2021-06",
        description: "Réparation, ponçage, préparation de surfaces et travaux manuels minutieux sur véhicules de particuliers.",
        skills: ["Travail manuel", "Rigueur", "Précision"]
      }
    ],

    // Formations
    educations: [
      {
        id: "edu_1",
        school: "NEOMA Business School",
        degree: "Programme Grande École (PGE) - Master in Management",
        domain: "Finance, Business Development & Management",
        startDate: "2025",
        endDate: "2028",
        isCurrent: true,
        description: "Spécialisation Finance & Banque, analyse financière approfondie, stratégie d'entreprise et écosystème Fintech."
      },
      {
        id: "edu_2",
        school: "IUT Clermont Auvergne (Campus de Montluçon)",
        degree: "B.U.T. Techniques de Commercialisation",
        domain: "Marketing, Vente & Négociation",
        startDate: "2022",
        endDate: "2025",
        isCurrent: false,
        description: "Parcours Business Development et gestion de la relation client, option Banque & Assurance."
      }
    ],

    // Compétences Hard
    hardSkills: [
      { id: "hs_1", name: "Relation client", level: "Expert", category: "Commercial" },
      { id: "hs_2", name: "Négociation commerciale", level: "Avancé", category: "Commercial" },
      { id: "hs_3", name: "Vente de services", level: "Avancé", category: "Commercial" },
      { id: "hs_4", name: "Organisation", level: "Expert", category: "Gestion" },
      { id: "hs_5", name: "Communication digitale", level: "Avancé", category: "Marketing" },
      { id: "hs_6", name: "Gestion de projet", level: "Avancé", category: "Gestion" },
      { id: "hs_7", name: "Management d'équipe", level: "Intermédiaire", category: "Management" },
      { id: "hs_8", name: "Coordination", level: "Avancé", category: "Gestion" },
      { id: "hs_9", name: "Gestion de budget", level: "Intermédiaire", category: "Finance" },
      { id: "hs_10", name: "Prise de décision", level: "Avancé", category: "Management" },
      { id: "hs_11", name: "Création de contenu", level: "Avancé", category: "Marketing" },
      { id: "hs_12", name: "Réseaux sociaux", level: "Expert", category: "Marketing" },
      { id: "hs_13", name: "Montage vidéo", level: "Avancé", category: "Technique" }
    ],

    // Outils & Logiciels
    toolsAndSoftware: [
      "Microsoft Excel", "Microsoft PowerPoint", "Microsoft Word", 
      "Canva", "CapCut", "Adobe Premiere Rush", 
      "Notion", "Google Analytics", "CRM Bancaire", "LinkedIn Sales Navigator"
    ],

    // Soft Skills
    softSkills: [
      "Communication", "Esprit d'équipe", "Organisation", 
      "Adaptabilité", "Leadership", "Autonomie", "Rigueur", "Sens commercial"
    ],

    // Langues
    languagesList: [
      { id: "lang_1", language: "Français", level: "Langue maternelle", cefrLevel: "Langue maternelle" },
      { id: "lang_2", language: "Anglais", level: "B2", cefrLevel: "B2", certification: "TOEIC Listening & Reading", score: "745 / 990" },
      { id: "lang_3", language: "Espagnol", level: "A2", cefrLevel: "A2" }
    ],

    // Certifications
    certificationsList: [
      { id: "cert_1", name: "TOEIC Listening & Reading", title: "TOEIC Listening & Reading", issuer: "ETS Global", organization: "ETS Global", date: "2024", issueDate: "2024", credentialId: "TOEIC-745", verificationUrl: "" },
      { id: "cert_2", name: "TAGE MAGE", title: "TAGE MAGE", issuer: "FNEGE", organization: "FNEGE", date: "2024", issueDate: "2024", credentialId: "TM-337", verificationUrl: "" },
      { id: "cert_3", name: "Attestation de niveau d'anglais B2", title: "Attestation de niveau d'anglais B2", issuer: "IUT Clermont Auvergne", organization: "IUT Clermont Auvergne", date: "2024", issueDate: "2024", credentialId: "", verificationUrl: "" }
    ],

    // Projets
    projectsList: [
      {
        id: "proj_1",
        name: "Projet Tutoré : Banque & Innovation Digitale",
        title: "Projet Tutoré : Banque & Innovation Digitale",
        description: "Étude prospective sur la numérisation des agences bancaires de proximité et l'intégration des outils IA dans le parcours client.",
        role: "Chef de projet",
        date: "2024",
        technologies: ["Analyse financière", "Étude de marché", "PowerPoint"],
        results: "Présentation devant un jury de professionnels bancaires, note attribuée : 18/20."
      },
      {
        id: "proj_2",
        name: "Campagne Média PRO.TE.CO",
        title: "Campagne Média PRO.TE.CO",
        description: "Production d'une série de reportages vidéo et visuels pour la promotion de la vie étudiante et des initiatives associatives.",
        role: "Responsable Réalisation & Montage",
        date: "2023 - 2024",
        technologies: ["CapCut", "Premiere Rush", "Canva", "Instagram"],
        results: "+45% d'abonnés en 6 mois."
      }
    ],

    // Engagements
    volunteerWork: [
      {
        id: "vol_1",
        organization: "Association étudiante PRO.TE.CO Montluçon",
        role: "Chef de service Communication & Médias",
        dates: "2023 - 2024",
        description: "Organisation d'événements culturels et sportifs régionaux, gestion d'équipe et représentation auprès de la direction de l'IUT.",
        achievements: "Organisation réussie de 4 événements majeurs rassemblant +800 étudiants."
      },
      {
        id: "vol_2",
        organization: "Festival Château Perché & Et Après Festival",
        role: "Bénévole responsable de stand & accueil",
        dates: "2023 - 2024",
        description: "Accueil du public, gestion des flux et tenue de caisse sur des événements culturels de grande envergure.",
        achievements: "Encadrement fluide de +2 000 festivaliers par jour."
      }
    ],

    // Centres d'intérêt
    interests: [
      "Finance & Cryptomonnaies", "Fintech & Banques en ligne", 
      "Automobile & Carrosserie", "Production Vidéo & Montage", 
      "Événementiel culturel", "Voyages & Découvertes"
    ],

    // Legacy fields array fallbacks for compatibility
    skills: ["Relation client", "Négociation commerciale", "Vente de services", "Organisation", "Communication digitale", "Gestion de projet"],
    targetMasters: ["Finance", "Gestion de patrimoine", "Fintech"],
    languages: ["Français (Maternelle)", "Anglais (B2 - TOEIC 745)", "Espagnol (A2)"],
    certifications: ["TOEIC (745/990)", "TAGE MAGE (337/600)", "Attestation Anglais B2"],
    projects: [
      { id: "proj_1", title: "Projet Tutoré : Banque & Innovation Digitale", description: "Étude prospective sur la numérisation des agences bancaires de proximité." }
    ],

    profileCompletionScore: 100
  };

  const { score } = calculateProfileCompletion(baseProfile);
  baseProfile.profileCompletionScore = score;
  return baseProfile;
};

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
      // Check local storage first to prevent any loss of locally imported items
      const localContactsKey = `nacora_${userId}_contacts`;
      const localContactsRaw = localStorage.getItem(localContactsKey) || localStorage.getItem("nacora_contacts");
      const cachedContacts: Contact[] = localContactsRaw ? filterOutDemoData<Contact>(JSON.parse(localContactsRaw)) : [];

      const localOppsKey = `nacora_${userId}_opportunities`;
      const localOppsRaw = localStorage.getItem(localOppsKey) || localStorage.getItem("nacora_opportunities");
      const cachedOpps: Opportunity[] = localOppsRaw ? filterOutDemoData<Opportunity>(JSON.parse(localOppsRaw)) : [];

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
        
        const remoteOpps: Opportunity[] = filterOutDemoData<Opportunity>(data.opportunities);
        const remoteContacts: Contact[] = filterOutDemoData<Contact>(data.contacts);
        const remoteCompanies: Company[] = filterOutDemoData<Company>(data.companies);
        const remoteCalendar: CalendarEvent[] = filterOutDemoData<CalendarEvent>(data.calendarEvents);

        // Non-destructive merge between remote and cached local contacts
        const mergedContacts: Contact[] = [...remoteContacts];
        const seenContactIds = new Set(remoteContacts.map(c => c.id));
        const seenContactNames = new Set(remoteContacts.map(c => (c.fullName || "").toLowerCase().trim()));
        for (const localC of cachedContacts) {
          if (localC && localC.id && !seenContactIds.has(localC.id) && !seenContactNames.has((localC.fullName || "").toLowerCase().trim())) {
            mergedContacts.push(localC);
            seenContactIds.add(localC.id);
            seenContactNames.add((localC.fullName || "").toLowerCase().trim());
          }
        }
        this.contacts = mergedContacts;

        // Non-destructive merge for opportunities
        const mergedOpps: Opportunity[] = [...remoteOpps];
        const seenOppIds = new Set(remoteOpps.map(o => o.id));
        for (const localO of cachedOpps) {
          if (localO && localO.id && !seenOppIds.has(localO.id)) {
            mergedOpps.push(localO);
            seenOppIds.add(localO.id);
          }
        }
        this.opportunities = mergedOpps;

        this.companies = remoteCompanies;
        this.calendarEvents = remoteCalendar;
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
          this.opportunities = cachedOpps;
          this.contacts = cachedContacts;
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
    
    // Recalculate profile completion score dynamically
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
