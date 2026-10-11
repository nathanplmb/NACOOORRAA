import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLanguage } from "../context/LanguageContext";
import { dbStore } from "../dbStore";
import { CandidateProfile, ChatSession, Opportunity, Contact, DocumentFile, CalendarEvent, Company } from "../types";
import { GlassCard, GlassButton } from "../components/Shared";
import { 
  Compass, 
  UserCheck, 
  FileText, 
  Users, 
  TrendingUp, 
  Send, 
  User, 
  Sparkles, 
  Trash2, 
  Plus, 
  MessageSquare, 
  Copy, 
  Check, 
  Layers, 
  Briefcase, 
  ChevronDown, 
  ChevronUp,
  History,
  X, 
  ShieldCheck, 
  Target, 
  GraduationCap, 
  Building2, 
  Calendar, 
  Coins, 
  RotateCcw,
  Bot,
  Filter,
  CheckSquare,
  Square,
  Edit3,
  Save,
  Download,
  ExternalLink,
  Bookmark,
  Zap,
  BookOpen,
  FileCode,
  FolderPlus,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sliders,
  ChevronLeft,
  ChevronRight,
  PanelLeft,
  PanelRight,
  Maximize2,
  Minimize2,
  Sidebar,
  SlidersHorizontal
} from "lucide-react";

interface HubIAProps {
  showToast: (message: string, type: "success" | "error" | "info" | "ai") => void;
  initialPersona?: string;
}

export interface ActiveFocusItem {
  id: string;
  type: "opportunity" | "contact" | "document" | "company";
  title: string;
  subtitle?: string;
  detail?: string;
}

export type DeliverableType = 
  | "cover_letter" 
  | "action_plan" 
  | "outreach_script" 
  | "star_prep" 
  | "negotiation_battlecard" 
  | "custom_note";

export interface StudioDeliverable {
  id: string;
  title: string;
  type: DeliverableType;
  content: string;
  status: "draft" | "accepted" | "saved_in_nacora";
  targetOppId?: string;
  targetContactId?: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY_SOURCES = "nacora_studio_sources_v2";
const STORAGE_KEY_DELIVERABLES = "nacora_studio_deliverables_v2";

export const HubIA: React.FC<HubIAProps> = ({ showToast, initialPersona }) => {
  const { language, t } = useLanguage();

  // Core Data Stores
  const [profile, setProfile] = useState<CandidateProfile>(dbStore.getProfile());
  const [opportunities, setOpportunities] = useState<Opportunity[]>(dbStore.getOpportunities());
  const [contacts, setContacts] = useState<Contact[]>(dbStore.getContacts());
  const [companies, setCompanies] = useState<Company[]>(dbStore.getCompanies());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(dbStore.getCalendarEvents());
  const [documents, setDocuments] = useState<DocumentFile[]>(dbStore.getDocuments());
  const [sessions, setSessions] = useState<ChatSession[]>(dbStore.getChatSessions());

  // Active Specialist & Chat State
  const [activePersonaId, setActivePersonaId] = useState<string>(initialPersona || "general");
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [activeFocus, setActiveFocus] = useState<ActiveFocusItem | null>(null);
  
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Desktop Panels Collapsibility State (Right Studio panel collapsed by default for clean initial screen)
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(true);

  // Modals / Drawers State
  const [showSourcesModal, setShowSourcesModal] = useState(false);
  const [showExpertDropdown, setShowExpertDropdown] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // --------------------------------------------------------------------------
  // PANEL 1: SOURCES & CONTEXT MANAGEMENT STATE (PERSISTED LOCALLY & PER SESSION)
  // --------------------------------------------------------------------------
  const initialSourceState = useMemo(() => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_SOURCES);
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            opps: Array.isArray(parsed.opps) ? parsed.opps : [],
            contacts: Array.isArray(parsed.contacts) ? parsed.contacts : [],
            docs: Array.isArray(parsed.docs) ? parsed.docs : [],
            companies: Array.isArray(parsed.companies) ? parsed.companies : [],
            profile: typeof parsed.profile === "boolean" ? parsed.profile : true,
            calendar: typeof parsed.calendar === "boolean" ? parsed.calendar : true,
            notes: typeof parsed.notes === "string" ? parsed.notes : ""
          };
        }
      } catch (_) {}
    }
    return null;
  }, []);

  const [selectedOppIds, setSelectedOppIds] = useState<string[]>(initialSourceState?.opps || []);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>(initialSourceState?.contacts || []);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(initialSourceState?.docs || []);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>(initialSourceState?.companies || []);
  const [includeProfile, setIncludeProfile] = useState<boolean>(initialSourceState ? initialSourceState.profile : true);
  const [includeCalendar, setIncludeCalendar] = useState<boolean>(initialSourceState ? initialSourceState.calendar : true);
  const [customNotes, setCustomNotes] = useState<string>(initialSourceState?.notes || "");
  
  const [sourceSearchTerm, setSourceSearchTerm] = useState("");
  const [sourceCategoryTab, setSourceCategoryTab] = useState<"all" | "opportunities" | "contacts" | "documents" | "companies" | "notes">("all");

  // Save sources state globally to LocalStorage on change
  useEffect(() => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      try {
        const payload = {
          opps: selectedOppIds,
          contacts: selectedContactIds,
          docs: selectedDocIds,
          companies: selectedCompanyIds,
          profile: includeProfile,
          calendar: includeCalendar,
          notes: customNotes
        };
        localStorage.setItem(STORAGE_KEY_SOURCES, JSON.stringify(payload));
      } catch (_) {}
    }
  }, [selectedOppIds, selectedContactIds, selectedDocIds, selectedCompanyIds, includeProfile, includeCalendar, customNotes]);

  // --------------------------------------------------------------------------
  // PANEL 3: STUDIO & DELIVERABLES WORKSPACE STATE
  // --------------------------------------------------------------------------
  const [deliverables, setDeliverables] = useState<StudioDeliverable[]>(() => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_DELIVERABLES);
        if (saved) return JSON.parse(saved);
      } catch (_) {}
    }
    return [
      {
        id: "deliv_default_1",
        title: "Feuille de Route & Stratégie — Alternance Banque Privée",
        type: "action_plan",
        content: `**Plan d'Action Stratégique — Candidature Banque Privée & Gestion de Fortune**

**1. Objectif opérationnel** :
Positionner la candidature sur les postes d'Assistant Banquier Privé / Gestionnaire de Patrimoine Junior.

**2. Points forts à valoriser d'après vos sources** :
• Solide socle d'analyse financière et maîtrise des instruments d'épargne.
• Connaissance des enjeux de conformité réglementaire (MIFID II / LCB-FT).
• Proactivité dans le développement de relation client à forte valeur ajoutée.

**3. Séquence de démarche à J+30** :
• **Semaine 1** : Finaliser l'accroche sur-mesure pour les opportunités cibles.
• **Semaine 2** : Activer le réseau Alumni auprès des décideurs identifiés.
• **Semaine 3** : Lancer la pré-analyse STAR pour les simulations d'entretiens.
• **Semaine 4** : Préparer l'argumentaire et la battlecard de négociation.`,
        status: "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  });

  const [activeDeliverableModal, setActiveDeliverableModal] = useState<StudioDeliverable | null>(null);
  const [editedDeliverableContent, setEditedDeliverableContent] = useState<string>("");
  const [editedDeliverableTitle, setEditedDeliverableTitle] = useState<string>("");
  const [deliverableFilter, setDeliverableFilter] = useState<string>("all");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Specialists definitions with dedicated functional working formats
  const specialists = [
    {
      id: "general",
      name: language === "en" ? "Career Advisor" : "Conseiller Carrière",
      role: language === "en" ? "Orientation & Strategy" : "Orientation & Stratégie",
      desc: language === "en" ? "Structure your search and refine your career roadmap" : "Structure ta recherche et affine ta stratégie professionnelle",
      icon: Compass,
      placeholder: language === "en" ? "E.g. How to evaluate alignment between my profile and target roles?" : "Ex: Comment analyser l'adéquation entre mon profil et mes offres ?",
      formats: [
        { title: "Plan d'Action J+30 / Feuille de Route", type: "action_plan" as DeliverableType, desc: "Structure tes démarches étape par étape" },
        { title: "Bilan d'Adéquation Profil / Poste", type: "custom_note" as DeliverableType, desc: "Analyse tes écarts et points forts" }
      ]
    },
    {
      id: "interview",
      name: language === "en" ? "Interview Coach" : "Coach Entretien",
      role: language === "en" ? "Mock Interview & STAR Method" : "Simulation & Méthode STAR",
      desc: language === "en" ? "Practice interviews and analyze your responses" : "Simule des entretiens et analyse tes réponses",
      icon: UserCheck,
      placeholder: language === "en" ? "E.g. Train me for a 15-minute Private Banking interview..." : "Ex: Entraîne-moi pour un entretien de 15 min en Banque Privée...",
      formats: [
        { title: "Fiche de Préparation Méthode STAR", type: "star_prep" as DeliverableType, desc: "Mises en situation claires et structurées" },
        { title: "Guide Questions RH Pièges", type: "custom_note" as DeliverableType, desc: "Réponses clés aux questions de sélection" },
        { title: "Pitch Candidat de 2 Minutes", type: "custom_note" as DeliverableType, desc: "Accroche orale percutante pour l'entretien" }
      ]
    },
    {
      id: "cv_letter",
      name: language === "en" ? "Resume & Cover Letter Expert" : "Expert CV & Lettres",
      role: language === "en" ? "ATS & Action Verbs" : "ATS & Verbes d'Action",
      desc: language === "en" ? "Optimize your job applications and documents" : "Optimise tes candidatures et tes documents",
      icon: FileText,
      placeholder: language === "en" ? "E.g. Write a tailored opening hook for my application at LCL..." : "Ex: Rédige une accroche sur-mesure pour ma candidature chez LCL...",
      formats: [
        { title: "Lettre de Motivation Sur-Mesure", type: "cover_letter" as DeliverableType, desc: "Méthode Vous-Moi-Nous sur l'offre cible" },
        { title: "Mail de Candidature Professionnel", type: "custom_note" as DeliverableType, desc: "Rédigé pour candidature avec ou sans lettre" },
        { title: "Optimisation ATS (Verbes & KPI)", type: "custom_note" as DeliverableType, desc: "Mots-clés et verbes d'action chiffrés" }
      ]
    },
    {
      id: "networking",
      name: language === "en" ? "Networking Strategist" : "Stratège Réseau",
      role: language === "en" ? "LinkedIn & Alumni Outreach" : "LinkedIn & Alumni",
      desc: language === "en" ? "Identify the right connections and craft outreach messages" : "Identifie les bonnes personnes et prépare tes prises de contact",
      icon: Users,
      placeholder: language === "en" ? "E.g. Draft a LinkedIn message to contact a UCA alumnus at Crédit Agricole..." : "Ex: Rédige un message LinkedIn pour contacter un Alumni UCA chez Crédit Agricole...",
      formats: [
        { title: "Script d'Approche LinkedIn", type: "outreach_script" as DeliverableType, desc: "Message personnalisé direct de prise de contact" },
        { title: "Séquence de Relances Réseau J+7 / J+14", type: "outreach_script" as DeliverableType, desc: "Relances courtoises à forte valeur ajoutée" }
      ]
    },
    {
      id: "negotiation",
      name: language === "en" ? "Salary Negotiation" : "Négociation Salaire",
      role: language === "en" ? "Pay Scales & Pitch" : "Grilles & Argumentaire",
      desc: language === "en" ? "Prepare your numbers, leverage and talking points" : "Prépare tes arguments et tes marges de négociation",
      icon: TrendingUp,
      placeholder: language === "en" ? "E.g. How to negotiate compensation and bonuses for my work-study contract?" : "Ex: Comment négocier la gratification et les primes de mon contrat d'alternance ?",
      formats: [
        { title: "Battlecard de Négociation Chiffrée", type: "negotiation_battlecard" as DeliverableType, desc: "Arguments de valeur et grilles chiffrées" },
        { title: "Argumentaire Rémunération & Primes", type: "custom_note" as DeliverableType, desc: "Points de levier et prétentions salariales" }
      ]
    }
  ];

  const currentSpecialist = specialists.find(s => s.id === activePersonaId) || specialists[0];

  // Subscribe to dbStore data updates safely without wiping user source selection
  useEffect(() => {
    const refreshData = () => {
      setProfile(dbStore.getProfile());
      const opps = dbStore.getOpportunities();
      setOpportunities(opps);
      const conts = dbStore.getContacts();
      setContacts(conts);
      setCompanies(dbStore.getCompanies());
      setCalendarEvents(dbStore.getCalendarEvents());
      const docs = dbStore.getDocuments();
      setDocuments(docs);
      
      const currentSessions = dbStore.getChatSessions();
      setSessions(currentSessions);

      // Select active session if available
      if (currentSessions.length > 0 && !activeSessionId) {
        const matchingSess = currentSessions.find(s => s.personaId === activePersonaId);
        if (matchingSess) {
          setActiveSessionId(matchingSess.id);
        } else {
          setActiveSessionId(currentSessions[0].id);
        }
      }

      // Default fallback selection ONLY if user has no selections at all and no saved selections
      if (!initialSourceState) {
        setSelectedOppIds(prev => prev.length === 0 && opps.length > 0 ? opps.slice(0, 3).map(o => o.id) : prev);
        setSelectedContactIds(prev => prev.length === 0 && conts.length > 0 ? conts.slice(0, 3).map(c => c.id) : prev);
        setSelectedDocIds(prev => prev.length === 0 && docs.length > 0 ? docs.map(d => d.id) : prev);
      }
    };

    refreshData();
    const unsub = dbStore.subscribe(refreshData);
    return unsub;
  }, [activePersonaId, initialSourceState]);

  // Save deliverables to LocalStorage on change
  useEffect(() => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_DELIVERABLES, JSON.stringify(deliverables));
      } catch (_) {}
    }
  }, [deliverables]);

  // Set default active focus from top opportunity if available
  useEffect(() => {
    if (!activeFocus && opportunities.length > 0) {
      const topOpp = opportunities[0];
      setActiveFocus({
        id: topOpp.id,
        type: "opportunity",
        title: `${topOpp.title} — ${topOpp.companyName}`,
        subtitle: `${topOpp.contractType || "Alternance"} • ${topOpp.location || "France"} • ${topOpp.salary || "Barème"}`,
        detail: `Statut: ${topOpp.status}. Missions: ${(topOpp.extractedInfo?.missions || []).slice(0, 2).join(", ") || "Support gestion"}`
      });
    }
  }, [opportunities]);

  // Auto scroll chat thread
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, activeSessionId, isLoading]);

  // Re-hydrate session-isolated sources when active session changes
  useEffect(() => {
    if (!activeSessionId) return;
    const currentSess = sessions.find(s => s.id === activeSessionId);
    if (currentSess && currentSess.sourcesConfig) {
      const cfg = currentSess.sourcesConfig;
      if (Array.isArray(cfg.oppIds)) setSelectedOppIds(cfg.oppIds);
      if (Array.isArray(cfg.contactIds)) setSelectedContactIds(cfg.contactIds);
      if (Array.isArray(cfg.docIds)) setSelectedDocIds(cfg.docIds);
      if (Array.isArray(cfg.companyIds)) setSelectedCompanyIds(cfg.companyIds);
      if (typeof cfg.includeProfile === "boolean") setIncludeProfile(cfg.includeProfile);
      if (typeof cfg.includeCalendar === "boolean") setIncludeCalendar(cfg.includeCalendar);
      if (typeof cfg.notes === "string") setCustomNotes(cfg.notes);
      
      if (cfg.activeFocusId) {
        const foundOpp = opportunities.find(o => o.id === cfg.activeFocusId);
        if (foundOpp) {
          setActiveFocus({
            id: foundOpp.id,
            type: "opportunity",
            title: `${foundOpp.title} — ${foundOpp.companyName}`,
            subtitle: `${foundOpp.contractType || "Alternance"} • ${foundOpp.location || "France"} • ${foundOpp.salary || "Barème"}`,
            detail: `Statut: ${foundOpp.status}. Missions: ${(foundOpp.extractedInfo?.missions || []).join(", ") || "Support gestion"}`
          });
        } else {
          const foundContact = contacts.find(c => c.id === cfg.activeFocusId);
          if (foundContact) {
            setActiveFocus({
              id: foundContact.id,
              type: "contact",
              title: `${foundContact.fullName} — ${foundContact.companyName}`,
              subtitle: `${foundContact.jobTitle} • Catégorie: ${foundContact.category}`,
              detail: `Notes: ${foundContact.notes}`
            });
          }
        }
      }
    }
  }, [activeSessionId]);

  // Persist current source selection into active chat session's sourcesConfig
  useEffect(() => {
    if (!activeSessionId) return;
    const sourcesConfig = {
      oppIds: selectedOppIds,
      contactIds: selectedContactIds,
      docIds: selectedDocIds,
      companyIds: selectedCompanyIds,
      includeProfile,
      includeCalendar,
      notes: customNotes,
      activeFocusId: activeFocus?.id,
      activeFocusType: activeFocus?.type
    };
    dbStore.updateChatSessionSources(activeSessionId, sourcesConfig);
  }, [selectedOppIds, selectedContactIds, selectedDocIds, selectedCompanyIds, includeProfile, includeCalendar, customNotes, activeFocus, activeSessionId]);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  // Switch specialist persona
  const handleSelectSpecialist = (personaId: string) => {
    setActivePersonaId(personaId);
    setShowExpertDropdown(false);
    const existing = sessions.find(s => s.personaId === personaId);
    if (existing) {
      setActiveSessionId(existing.id);
    } else {
      handleCreateSession(personaId);
    }
  };

  // Create new session with isolated source snapshot
  const handleCreateSession = (personaId: string = activePersonaId) => {
    const spec = specialists.find(s => s.id === personaId) || currentSpecialist;
    const dateStr = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    const title = `${spec.name} — ${dateStr}`;

    const sourcesConfig = {
      oppIds: selectedOppIds,
      contactIds: selectedContactIds,
      docIds: selectedDocIds,
      companyIds: selectedCompanyIds,
      includeProfile,
      includeCalendar,
      notes: customNotes,
      activeFocusId: activeFocus?.id,
      activeFocusType: activeFocus?.type
    };

    const newSess = dbStore.addChatSession(personaId, title, sourcesConfig);

    const userName = profile.fullName ? profile.fullName.split(" ")[0] : "Candidat";
    let initialGreeting = "";

    if (personaId === "general") {
      initialGreeting = `Bonjour ${userName}. Je suis ton **Conseiller Carrière NACORA**.\n\nEnsemble, grâce à tes sources sélectionnées, nous pouvons structurer ta recherche et préparer tes prochaines étapes.\n\nPar quoi souhaites-tu commencer ?\n\n[ACTIONS: "Analyser mes opportunités cibles" | "Évaluer mon profil candidat" | "Générer un plan d'action J+30"]`;
    } else if (personaId === "interview") {
      initialGreeting = `Prêt pour l'entraînement, ${userName} ? Je suis ton **Coach Entretien**.\n\nNous pouvons simuler des questions comportementales et techniques avec la méthode **STAR**.\n\n[ACTIONS: "Lancer une simulation STAR" | "Questions pièges RH" | "Pitch de 2 minutes"]`;
    } else if (personaId === "cv_letter") {
      initialGreeting = `Bonjour ${userName}. En tant qu'**Expert CV & Lettres**, j'utilise tes sources pour optimiser tes mots-clés ATS et rédiger tes lettres.\n\n[ACTIONS: "Rédiger une lettre sur-mesure" | "Analyse ATS des mots-clés" | "Optimiser mes verbes d'action"]`;
    } else if (personaId === "networking") {
      initialGreeting = `Ravi de t'accompagner ${userName}. Je suis ton **Stratège Réseau NACORA**.\n\nJe crée pour toi des messages d'approche LinkedIn et des relances à forte valeur ajoutée.\n\n[ACTIONS: "Rédiger un message d'approche LinkedIn" | "Relance à J+7" | "Demande d'échange réseau"]`;
    } else if (personaId === "negotiation") {
      initialGreeting = `Bonjour ${userName}. Je suis l'**Expert Négociation Salariale**.\n\nNous allons évaluer ton package global et concevoir une battlecard de négociation chiffrée.\n\n[ACTIONS: "Générer une battlecard de négociation" | "Arguments rémunération" | "Simuler l'échange de négociation"]`;
    }

    dbStore.addMessageToSession(newSess.id, "model", initialGreeting);
    setActiveSessionId(newSess.id);
    showToast(`Studio initialisé : ${spec.name}`, "info");
  };

  // Delete session
  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dbStore.deleteChatSession(sessionId);
    showToast("Session supprimée", "info");
    const remaining = dbStore.getChatSessions();
    if (remaining.length > 0) {
      setActiveSessionId(remaining[0].id);
    } else {
      setActiveSessionId("");
    }
  };

  // --------------------------------------------------------------------------
  // SOURCES MANAGEMENT LOGIC
  // --------------------------------------------------------------------------
  const activeOpportunities = useMemo(() => {
    return opportunities.filter(o => selectedOppIds.includes(o.id));
  }, [opportunities, selectedOppIds]);

  const activeContacts = useMemo(() => {
    return contacts.filter(c => selectedContactIds.includes(c.id));
  }, [contacts, selectedContactIds]);

  const activeDocuments = useMemo(() => {
    return documents.filter(d => selectedDocIds.includes(d.id));
  }, [documents, selectedDocIds]);

  const activeCompanies = useMemo(() => {
    return companies.filter(c => selectedCompanyIds.includes(c.id));
  }, [companies, selectedCompanyIds]);

  const totalActiveSourcesCount = useMemo(() => {
    return (
      activeOpportunities.length +
      activeContacts.length +
      activeDocuments.length +
      activeCompanies.length +
      (includeProfile ? 1 : 0) +
      (includeCalendar ? 1 : 0) +
      (customNotes.trim() ? 1 : 0)
    );
  }, [activeOpportunities, activeContacts, activeDocuments, activeCompanies, includeProfile, includeCalendar, customNotes]);

  const handleToggleSelectAllSources = () => {
    if (totalActiveSourcesCount > 0) {
      setSelectedOppIds([]);
      setSelectedContactIds([]);
      setSelectedDocIds([]);
      setSelectedCompanyIds([]);
      setIncludeProfile(false);
      setIncludeCalendar(false);
      showToast("Toutes les sources ont été désactivées", "info");
    } else {
      setSelectedOppIds(opportunities.map(o => o.id));
      setSelectedContactIds(contacts.map(c => c.id));
      setSelectedDocIds(documents.map(d => d.id));
      setSelectedCompanyIds(companies.map(c => c.id));
      setIncludeProfile(true);
      setIncludeCalendar(true);
      showToast("Toutes les sources ont été activées dans le Studio", "success");
    }
  };

  // Build Context Summary payload for Gemini grounded strictly in active sources
  const buildGroundedContextSummary = () => {
    // Validate IDs against actual store objects to filter out stale/deleted items
    const validOpps = opportunities.filter(o => selectedOppIds.includes(o.id));
    const validContacts = contacts.filter(c => selectedContactIds.includes(c.id));
    const validDocs = documents.filter(d => selectedDocIds.includes(d.id));
    const validCompanies = companies.filter(comp => selectedCompanyIds.includes(comp.id));

    return {
      activeSourcesCount: (
        validOpps.length +
        validContacts.length +
        validDocs.length +
        validCompanies.length +
        (includeProfile ? 1 : 0) +
        (includeCalendar ? 1 : 0) +
        (customNotes.trim() ? 1 : 0)
      ),
      primaryFocusItem: activeFocus ? {
        id: activeFocus.id,
        type: activeFocus.type,
        title: activeFocus.title,
        subtitle: activeFocus.subtitle,
        detail: activeFocus.detail
      } : null,
      candidateProfile: includeProfile ? {
        fullName: profile.fullName,
        title: profile.title,
        situation: profile.currentSituation,
        currentAlternance: profile.currentAlternance,
        skills: profile.hardSkills || profile.skills,
        targetTitles: profile.targetTitles,
        contractTypes: profile.contractTypes,
        mobility: profile.mobility,
        educations: profile.educations?.map(e => ({
          school: e.school || e.institution,
          degree: e.degree,
          field: e.fieldOfStudy || e.domain,
          dates: `${e.startDate || ""} - ${e.endDate || (e.isCurrent ? "Présent" : "")}`
        })),
        experiences: profile.experiences?.map(exp => ({
          role: exp.role,
          company: exp.company,
          dates: `${exp.startDate || ""} - ${exp.endDate || (exp.isCurrent ? "Présent" : "")}`,
          missions: exp.missions?.slice(0, 3)
        }))
      } : null,
      selectedOpportunities: validOpps.map(o => ({
        id: o.id,
        title: o.title,
        company: o.companyName,
        status: o.status,
        contractType: o.contractType,
        location: o.location,
        salary: o.salary,
        descriptionText: (o.notes || o.privateNotes || o.extractedInfo?.entrepriseDetails?.presentation || "").substring(0, 3000),
        missions: o.extractedInfo?.missions || [],
        competencesRequises: o.extractedInfo?.competencesRequises || [],
        competencesAppreciees: o.extractedInfo?.competencesAppreciees || [],
        softSkills: o.extractedInfo?.softSkills || [],
        outilsLogiciels: o.extractedInfo?.outilsLogiciels || [],
        formation: o.extractedInfo?.formation,
        experienceRequise: o.extractedInfo?.experienceRequise,
        notes: o.notes || o.privateNotes,
        hasDetailedMissions: Boolean(o.extractedInfo?.missions && o.extractedInfo.missions.length > 0)
      })),
      selectedContacts: validContacts.map(c => ({
        id: c.id,
        name: c.fullName,
        job: c.normalizedJobTitle || c.jobTitle,
        company: c.companyName,
        category: c.category,
        connectionPoints: c.connectionPoints,
        notes: c.notes,
        networkingStatus: c.networkingStatus,
        academicPath: c.academicPath
      })),
      selectedDocuments: validDocs
        .filter(d => (d.content || "").trim().length > 0)
        .map(d => {
        const rawContent = (d.content || "").trim();
        const maxCharLimit = 8000;
        const isTruncated = rawContent.length > maxCharLimit;
        const text = isTruncated 
          ? rawContent.slice(0, maxCharLimit) + `\n\n[... DOCUMENT TRONQUÉ : 8 000 premiers caractères transmis sur ${rawContent.length} car. au total.]`
          : rawContent;
        return {
          id: d.id,
          title: d.title,
          type: d.type,
          content: text,
          snippet: text,
          isTruncated,
          totalLength: rawContent.length
        };
      }),
      selectedCompanies: validCompanies.map(comp => ({
        id: comp.id,
        name: comp.name,
        sector: comp.sector,
        location: comp.location,
        notes: comp.notes
      })),
      calendarEvents: includeCalendar ? calendarEvents.slice(0, 12).map(e => ({
        title: e.title,
        date: e.date,
        type: e.type,
        companyName: e.companyName
      })) : [],
      customNotes: customNotes.trim() || undefined
    };
  };

  // --------------------------------------------------------------------------
  // AI CHAT HANDLER
  // --------------------------------------------------------------------------
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    let targetSessionId = activeSessionId;
    if (!targetSessionId) {
      const title = `${currentSpecialist.name} — ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`;
      const newSess = dbStore.addChatSession(activePersonaId, title);
      targetSessionId = newSess.id;
      setActiveSessionId(targetSessionId);
    }

    setInputMessage("");
    setIsLoading(true);

    dbStore.addMessageToSession(targetSessionId, "user", text);

    try {
      const currentSess = dbStore.getChatSessions().find(s => s.id === targetSessionId);
      const messagesPayload = currentSess 
        ? currentSess.messages.map(m => ({ role: m.role, text: m.text }))
        : [{ role: "user" as const, text }];

      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat",
          payload: {
            personaId: activePersonaId,
            messages: messagesPayload,
            profile,
            activeFocus: activeFocus ? {
              type: activeFocus.type,
              title: activeFocus.title,
              subtitle: activeFocus.subtitle,
              detail: activeFocus.detail
            } : undefined,
            contextSummary: buildGroundedContextSummary()
          }
        })
      });

      if (!response.ok) throw new Error("Erreur de communication avec l'intelligence NACORA");
      const data = await response.json();
      const modelRespText = data.response || "Analyse terminée par l'assistant NACORA.";

      dbStore.addMessageToSession(targetSessionId, "model", modelRespText);

    } catch (err) {
      console.error(err);
      dbStore.addMessageToSession(
        targetSessionId,
        "model",
        "Une interruption temporaire s'est produite lors de la génération. Tes données de sources NACORA restent sauvegardées en sécurité."
      );
      showToast("Erreur de connexion avec l'assistant", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // GENERATE DEDICATED FUNCTIONAL STUDIO FORMAT DELIVERABLE
  // --------------------------------------------------------------------------
  const handleGenerateDeliverableFormat = async (formatTitle: string, formatType: DeliverableType, promptInstruction: string) => {
    if (isLoading) return;
    setIsLoading(true);
    // Auto-expand the Studio right panel when a deliverable is generated!
    setIsRightPanelCollapsed(false);
    showToast(`Génération du format : "${formatTitle}"...`, "ai");

    try {
      const groundedContext = buildGroundedContextSummary();
      
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat",
          payload: {
            personaId: activePersonaId,
            messages: [
              {
                role: "user",
                text: `CONSIGNE IMPÉRATIVE LIVRABLE : Rédige intégralement un document de travail professionnel intitulé "${formatTitle}" de type ${formatType}.\n\nInclusion obligatoire des données réelles sélectionnées : ${promptInstruction}.\n\nRédige le document complet prêt à l'emploi (sans préambule, sans phrases d'introduction comme 'Voici le document', directement le texte structuré avec sous-titres et puces claires).`
              }
            ],
            profile,
            activeFocus: activeFocus ? {
              type: activeFocus.type,
              title: activeFocus.title,
              subtitle: activeFocus.subtitle,
              detail: activeFocus.detail
            } : undefined,
            contextSummary: groundedContext,
            intent: formatType === 'cover_letter' ? 'email_with_letter' : formatType === 'outreach_script' ? 'networking_message' : formatType === 'action_plan' ? 'action_plan' : formatType === 'star_prep' ? 'interview_prep' : formatType === 'negotiation_battlecard' ? 'negotiation_prep' : 'general_chat'
          }
        })
      });

      let generatedContent = "";
      if (response.ok) {
        const data = await response.json();
        generatedContent = (data.response || "").replace(/\[ACTIONS:.*?\]/gs, "").trim();
        
        // Enforce strict 300-character limit on final displayed text for LinkedIn invitations
        if (formatTitle.toLowerCase().includes("linkedin") || formatTitle.toLowerCase().includes("invitation")) {
          let cleanNote = generatedContent.replace(/^(Voici|Note|Message|Proposition)\s*:?\s*/i, "").replace(/^["«](.*?)["»]$/s, "$1").trim();
          if (cleanNote.length > 295) {
            cleanNote = cleanNote.substring(0, 292) + "...";
          }
          generatedContent = cleanNote;
        }
      }

      if (!generatedContent || generatedContent.length < 50) {
        const topOpp = activeOpportunities[0];
        const focusName = activeFocus ? activeFocus.title : (topOpp ? `${topOpp.title} — ${topOpp.companyName}` : "Aucune source active");
        generatedContent = `**${formatTitle.toUpperCase()} — PRÉCISIONS REQUISES POUR LA GÉNÉRATION SUR-MESURE**\n\n` +
          `**Sujet analysé** : ${focusName}\n\n` +
          `**Statut** : Le moteur IA n'a pas pu générer automatiquement ce livrable en direct.\n\n` +
          `**Causes possibles** :\n` +
          `• Les sources actuellement sélectionnées dans le Studio ne contiennent pas suffisamment de détails spécifiques (ex: missions du poste ou exigences de l'offre non renseignées).\n` +
          `• La connexion avec le service d'Intelligence Artificielle est temporairement indisponible.\n\n` +
          `**Pour générer votre document sur-mesure** :\n` +
          `1. Vérifiez que l'opportunité active ou le document sélectionné contient le texte descriptif des missions.\n` +
          `2. Ajoutez une note d'instruction spécifique dans le panneau des Sources.\n` +
          `3. Relancez la génération du format "${formatTitle}".`;
      }

      const newDeliv: StudioDeliverable = {
        id: "deliv_" + Math.random().toString(36).substring(2, 9),
        title: formatTitle + (activeFocus ? ` — ${activeFocus.title.split("—")[0].trim()}` : ""),
        type: formatType,
        content: generatedContent,
        status: "draft",
        targetOppId: activeFocus?.type === "opportunity" ? activeFocus.id : activeOpportunities[0]?.id,
        targetContactId: activeFocus?.type === "contact" ? activeFocus.id : activeContacts[0]?.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setDeliverables(prev => [newDeliv, ...prev]);
      setActiveDeliverableModal(newDeliv);
      setEditedDeliverableTitle(newDeliv.title);
      setEditedDeliverableContent(newDeliv.content);
      showToast(`Format "${formatTitle}" généré et ouvert dans le Studio !`, "success");

    } catch (err) {
      console.error(err);
      showToast("Erreur lors de la génération du format", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // 1-Click Save Deliverable to NACORA Database
  const handleSaveDeliverableToNacora = (deliv: StudioDeliverable) => {
    try {
      if (deliv.type === "cover_letter" || deliv.type === "action_plan") {
        // Save as Document File in NACORA Documents Module
        dbStore.addDocument({
          title: deliv.title,
          type: "Lettre de Motivation",
          fileName: `${deliv.title}.txt`,
          content: deliv.content
        });
        if (deliv.targetOppId) {
          const opp = opportunities.find(o => o.id === deliv.targetOppId);
          if (opp) {
            dbStore.updateOpportunity({
              ...opp,
              privateNotes: (opp.privateNotes ? opp.privateNotes + "\n\n" : "") + `--- LIVRABLE STUDIO NACORA (${new Date().toLocaleDateString("fr-FR")}) ---\n` + deliv.content
            });
          }
        }
      } else if (deliv.type === "outreach_script" && deliv.targetContactId) {
        const contact = contacts.find(c => c.id === deliv.targetContactId);
        if (contact) {
          dbStore.updateContact({
            ...contact,
            aiCustomMessage: deliv.content,
            notes: (contact.notes ? contact.notes + "\n\n" : "") + `--- SCRIPT RÉSEAU STUDIO (${new Date().toLocaleDateString("fr-FR")}) ---\n` + deliv.content,
            history: [
              ...(contact.history || []),
              {
                id: "hist_" + Date.now(),
                type: "message_generated",
                label: `Livrable Studio généré : ${deliv.title}`,
                timestamp: new Date().toISOString()
              }
            ]
          });
        }
      } else {
        dbStore.addDocument({
          title: deliv.title,
          type: "Autre",
          fileName: `${deliv.title}.txt`,
          content: deliv.content
        });
      }

      setDeliverables(prev => prev.map(d => d.id === deliv.id ? { ...d, status: "saved_in_nacora" } : d));
      showToast(`Livrable "${deliv.title}" enregistré dans NACORA !`, "success");
      setActiveDeliverableModal(null);
    } catch (e) {
      console.error(e);
      showToast("Erreur lors de l'enregistrement", "error");
    }
  };

  // Format assistant response text nicely
  const renderFormattedText = (text: string) => {
    const textWithoutActions = text.replace(/\[ACTIONS:.*?\]/gs, "").trim();

    return textWithoutActions.split("\n\n").map((paragraph, pIdx) => {
      const cleanPara = paragraph.replace(/^#{1,6}\s+/gm, "");
      return (
        <div key={pIdx} className="mb-2.5 last:mb-0 leading-relaxed text-[#F5F6FA]">
          {cleanPara.split("\n").map((line, lIdx) => {
            const trimmed = line.trim();
            const cleanLine = trimmed.replace(/^#{1,6}\s+/, "");
            if (cleanLine.startsWith("* ") || cleanLine.startsWith("- ")) {
              const content = cleanLine.substring(2);
              return (
                <span key={lIdx} className="flex items-start gap-2 my-1 pl-1">
                  <span className="text-[#FF6685] font-bold mt-1 shrink-0">•</span>
                  <span className="text-white/90">{formatBoldText(content)}</span>
                </span>
              );
            }
            return <p key={lIdx} className="my-1 text-white/90">{formatBoldText(cleanLine)}</p>;
          })}
        </div>
      );
    });
  };

  const formatBoldText = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="text-[#F5F6FA] font-bold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  // Extract quick action buttons from assistant message
  const extractQuickActions = (text: string): string[] => {
    const match = text.match(/\[ACTIONS:\s*"(.*?)"\]/s);
    if (!match) return [];
    return match[1].split('" | "').map(a => a.trim()).filter(Boolean);
  };

  // Filter deliverables list
  const filteredDeliverables = useMemo(() => {
    if (deliverableFilter === "all") return deliverables;
    return deliverables.filter(d => d.type === deliverableFilter || d.status === deliverableFilter);
  }, [deliverables, deliverableFilter]);

  // Render Full Sources Management Modal Content
  const renderSourcesModalContent = () => (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <FolderPlus className="w-4 h-4 text-[#FF6685]" />
          <h3 className="text-sm font-bold text-[#F5F6FA] uppercase tracking-wider">Gestion des Sources ({totalActiveSourcesCount} actives)</h3>
        </div>
        <button
          onClick={handleToggleSelectAllSources}
          className="text-xs text-[#FF6685] hover:underline font-semibold cursor-pointer"
        >
          {totalActiveSourcesCount > 0 ? "Désactiver tout" : "Activer tout"}
        </button>
      </div>

      {/* Search & Category Filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#9AA0B2] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Rechercher une offre, un contact, un document..."
            value={sourceSearchTerm}
            onChange={(e) => setSourceSearchTerm(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/10 focus:border-white/20 rounded-xl pl-9 pr-3 py-2 text-xs text-[#F5F6FA] placeholder:text-[#9AA0B2]/50 outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: "all", label: "Toutes les sources" },
            { id: "opportunities", label: `Offres (${opportunities.length})` },
            { id: "contacts", label: `Réseau (${contacts.length})` },
            { id: "documents", label: `Docs (${documents.length})` },
            { id: "companies", label: `Entreprises (${companies.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSourceCategoryTab(tab.id as any)}
              className={`text-xs px-3 py-1 rounded-lg whitespace-nowrap transition-all cursor-pointer font-medium ${
                sourceCategoryTab === tab.id
                  ? "bg-white/10 text-white font-bold border border-white/20"
                  : "bg-white/[0.02] text-[#9AA0B2] hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sources List Grid */}
      <div className="flex-1 overflow-y-auto space-y-4 max-h-[50vh] pr-1">

        {/* Global Anchors */}
        {(sourceCategoryTab === "all" || sourceCategoryTab === "documents") && (
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase text-[#9AA0B2]">Ancrages Globaux</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div
                onClick={() => setIncludeProfile(!includeProfile)}
                className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                  includeProfile ? "bg-white/[0.08] border-white/20 text-white" : "bg-white/[0.02] border-white/5 text-[#9AA0B2]"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <User className="w-4 h-4 text-[#9AA0B2]" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{profile.fullName || "Profil Candidat"}</div>
                    <div className="text-[10px] text-[#9AA0B2] truncate">Compétences & Objectifs</div>
                  </div>
                </div>
                {includeProfile ? <CheckSquare className="w-4 h-4 text-[#FF6685]" /> : <Square className="w-4 h-4 text-[#9AA0B2]/40" />}
              </div>

              <div
                onClick={() => setIncludeCalendar(!includeCalendar)}
                className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                  includeCalendar ? "bg-white/[0.08] border-white/20 text-white" : "bg-white/[0.02] border-white/5 text-[#9AA0B2]"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Calendar className="w-4 h-4 text-[#9AA0B2]" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">Agenda ({calendarEvents.length})</div>
                    <div className="text-[10px] text-[#9AA0B2] truncate">Entretiens & Jalons</div>
                  </div>
                </div>
                {includeCalendar ? <CheckSquare className="w-4 h-4 text-[#FF6685]" /> : <Square className="w-4 h-4 text-[#9AA0B2]/40" />}
              </div>
            </div>
          </div>
        )}

        {/* Opportunities List */}
        {(sourceCategoryTab === "all" || sourceCategoryTab === "opportunities") && (
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase text-[#9AA0B2]">Opportunités ({opportunities.length})</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {opportunities
                .filter(o => !sourceSearchTerm || o.title.toLowerCase().includes(sourceSearchTerm.toLowerCase()) || o.companyName.toLowerCase().includes(sourceSearchTerm.toLowerCase()))
                .map(opp => {
                  const isSel = selectedOppIds.includes(opp.id);
                  return (
                    <div
                      key={opp.id}
                      onClick={() => setSelectedOppIds(prev => isSel ? prev.filter(i => i !== opp.id) : [...prev, opp.id])}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                        isSel ? "bg-white/[0.08] border-white/20 text-white" : "bg-white/[0.02] border-white/5 text-[#9AA0B2]"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Briefcase className="w-3.5 h-3.5 text-[#9AA0B2] shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{opp.title}</div>
                          <div className="text-[10px] text-[#9AA0B2] truncate">{opp.companyName} • {opp.status}</div>
                        </div>
                      </div>
                      {isSel ? <CheckSquare className="w-4 h-4 text-[#FF6685] shrink-0" /> : <Square className="w-4 h-4 text-[#9AA0B2]/40 shrink-0" />}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Contacts List */}
        {(sourceCategoryTab === "all" || sourceCategoryTab === "contacts") && (
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase text-[#9AA0B2]">Réseau ({contacts.length})</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {contacts
                .filter(c => !sourceSearchTerm || c.fullName.toLowerCase().includes(sourceSearchTerm.toLowerCase()) || c.companyName.toLowerCase().includes(sourceSearchTerm.toLowerCase()))
                .map(cont => {
                  const isSel = selectedContactIds.includes(cont.id);
                  return (
                    <div
                      key={cont.id}
                      onClick={() => setSelectedContactIds(prev => isSel ? prev.filter(i => i !== cont.id) : [...prev, cont.id])}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                        isSel ? "bg-white/[0.08] border-white/20 text-white" : "bg-white/[0.02] border-white/5 text-[#9AA0B2]"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Users className="w-3.5 h-3.5 text-[#9AA0B2] shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{cont.fullName}</div>
                          <div className="text-[10px] text-[#9AA0B2] truncate">{cont.jobTitle} chez {cont.companyName}</div>
                        </div>
                      </div>
                      {isSel ? <CheckSquare className="w-4 h-4 text-[#FF6685] shrink-0" /> : <Square className="w-4 h-4 text-[#9AA0B2]/40 shrink-0" />}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Documents List */}
        {(sourceCategoryTab === "all" || sourceCategoryTab === "documents") && (
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase text-[#9AA0B2]">Documents ({documents.length})</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {documents
                .filter(d => !sourceSearchTerm || d.title.toLowerCase().includes(sourceSearchTerm.toLowerCase()))
                .map(doc => {
                  const isSel = selectedDocIds.includes(doc.id);
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDocIds(prev => isSel ? prev.filter(i => i !== doc.id) : [...prev, doc.id])}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                        isSel ? "bg-white/[0.08] border-white/20 text-white" : "bg-white/[0.02] border-white/5 text-[#9AA0B2]"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-[#9AA0B2] shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{doc.title}</div>
                          <div className="text-[10px] text-[#9AA0B2] truncate">{doc.type}</div>
                        </div>
                      </div>
                      {isSel ? <CheckSquare className="w-4 h-4 text-[#FF6685] shrink-0" /> : <Square className="w-4 h-4 text-[#9AA0B2]/40 shrink-0" />}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Custom Notes Input */}
        <div className="space-y-1 pt-2 border-t border-white/10">
          <label className="text-[10px] font-bold uppercase text-[#9AA0B2] block">Instruction ou consigne spécifique</label>
          <textarea
            value={customNotes}
            onChange={(e) => setCustomNotes(e.target.value)}
            placeholder="Ex: Valoriser la maîtrise de la gestion de fortune..."
            rows={2}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-2 text-xs text-[#F5F6FA] placeholder:text-[#9AA0B2]/40 outline-none"
          />
        </div>
      </div>

      <div className="pt-3 border-t border-white/10 flex justify-end">
        <button
          onClick={() => setShowSourcesModal(false)}
          className="px-5 py-2 rounded-xl bg-[#D81A45] hover:bg-[#FF6685] text-xs font-bold text-white shadow-sm cursor-pointer transition-all"
        >
          Valider et fermer ({totalActiveSourcesCount} actives)
        </button>
      </div>
    </div>
  );

  // Render Studio Content inside right collapsible panel
  const renderStudioContent = () => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Studio Header */}
      <div className="p-3 border-b border-white/10 space-y-2 bg-white/[0.01]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-[#9AA0B2]" />
            <h2 className="text-xs font-bold text-[#F5F6FA] uppercase tracking-wider">Studio ({deliverables.length})</h2>
          </div>

          <button
            onClick={() => {
              const newD: StudioDeliverable = {
                id: "deliv_" + Math.random().toString(36).substring(2, 9),
                title: "Nouvelle Note de Travail",
                type: "custom_note",
                content: "Rédigez votre note ou collez votre document de travail ici...",
                status: "draft",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              setDeliverables(prev => [newD, ...prev]);
              setActiveDeliverableModal(newD);
              setEditedDeliverableTitle(newD.title);
              setEditedDeliverableContent(newD.content);
            }}
            className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#F5F6FA] border border-white/10 font-medium flex items-center gap-1 cursor-pointer transition-all"
          >
            <Plus className="w-3 h-3" />
            <span>Nouveau</span>
          </button>
        </div>

        {/* Deliverable Filters */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-0.5">
          {[
            { id: "all", label: "Tous" },
            { id: "cover_letter", label: "Lettres" },
            { id: "star_prep", label: "STAR" },
            { id: "action_plan", label: "Plans" },
            { id: "outreach_script", label: "Réseau" }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setDeliverableFilter(f.id)}
              className={`text-[10px] px-2 py-0.5 rounded-lg whitespace-nowrap transition-all cursor-pointer font-medium ${
                deliverableFilter === f.id
                  ? "bg-white/10 text-white font-bold border border-white/15"
                  : "bg-white/[0.02] text-[#9AA0B2] hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Formats Recommendations & Deliverables List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">

        {/* ZONE 1: Recommended Working Formats for Active Specialist */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B2] flex items-center justify-between">
            <span>Formats conseillés</span>
            <Sparkles className="w-3 h-3 text-[#C084FC]" />
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            {currentSpecialist.formats.map((fmt, idx) => (
              <div
                key={idx}
                onClick={() => handleGenerateDeliverableFormat(fmt.title, fmt.type, fmt.desc)}
                className="p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 flex items-center justify-between gap-2 group transition-all cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-[#F5F6FA] group-hover:text-white transition-colors truncate">{fmt.title}</div>
                  <div className="text-[10px] text-[#9AA0B2] truncate">{fmt.desc}</div>
                </div>
                <button className="px-2.5 py-1 rounded-lg bg-[#D81A45] hover:bg-[#FF6685] text-[10px] font-bold text-white transition-all shrink-0 cursor-pointer shadow-sm">
                  Générer
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ZONE 2: Generated Studio Deliverables */}
        <div className="space-y-1.5 pt-2 border-t border-white/10">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B2]">
            Livrables enregistrés ({filteredDeliverables.length})
          </div>

          {filteredDeliverables.length === 0 ? (
            <p className="text-[10px] text-[#9AA0B2] text-center py-5 border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
              Aucun livrable généré. Cliquez sur un format ci-dessus.
            </p>
          ) : (
            filteredDeliverables.map(deliv => (
              <div
                key={deliv.id}
                className="p-2.5 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-[#F5F6FA] truncate">{deliv.title}</div>
                    <div className="text-[10px] text-[#9AA0B2]">
                      {new Date(deliv.createdAt).toLocaleDateString("fr-FR")}
                    </div>
                  </div>

                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                    deliv.status === "saved_in_nacora"
                      ? "bg-[#12B76A]/20 text-[#34D399] border border-[#12B76A]/30"
                      : "bg-[#F79009]/20 text-[#FBBF24] border border-[#F79009]/30"
                  }`}>
                    {deliv.status === "saved_in_nacora" ? "Enregistré" : "Brouillon"}
                  </span>
                </div>

                <p className="text-[10px] text-[#9AA0B2] line-clamp-2 leading-relaxed font-mono bg-black/20 p-2 rounded-lg border border-white/5">
                  {deliv.content}
                </p>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
                  <button
                    onClick={() => {
                      setActiveDeliverableModal(deliv);
                      setEditedDeliverableTitle(deliv.title);
                      setEditedDeliverableContent(deliv.content);
                    }}
                    className="text-[10px] font-medium text-[#9AA0B2] hover:text-[#F5F6FA] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Modifier</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(deliv.content);
                        showToast("Livrable copié", "info");
                      }}
                      className="p-1 text-[#9AA0B2] hover:text-white transition-colors cursor-pointer"
                      title="Copier"
                    >
                      <Copy className="w-3 h-3" />
                    </button>

                    <button
                      onClick={() => handleSaveDeliverableToNacora(deliv)}
                      className="p-1 text-[#34D399] hover:text-[#12B76A] transition-colors cursor-pointer"
                      title="Enregistrer dans NACORA"
                    >
                      <Save className="w-3 h-3" />
                    </button>

                    <button
                      onClick={() => setDeliverables(prev => prev.filter(d => d.id !== deliv.id))}
                      className="p-1 text-[#9AA0B2] hover:text-[#F04438] transition-colors cursor-pointer"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );

  return (
    <div className="relative flex flex-col h-[calc(100vh-4rem)] bg-[#060812] text-[#F5F6FA] overflow-hidden before:absolute before:top-0 before:left-0 before:w-1/2 before:h-1/2 before:bg-sky-950/20 before:blur-[120px] before:pointer-events-none after:absolute after:bottom-0 after:right-0 after:w-1/2 after:h-1/2 after:bg-rose-950/20 after:blur-[120px] after:pointer-events-none">
      
      {/* ===================================================================== */}
      {/* MINIMALIST TOP HEADER BAR                                             */}
      {/* ===================================================================== */}
      <div className="h-14 px-4 bg-white/[0.02] border-b border-white/10 flex items-center justify-between gap-3 shrink-0 backdrop-blur-2xl z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#C084FC]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-bold text-[#F5F6FA] tracking-wide uppercase">NACORA Intelligence Studio</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#9AA0B2] border border-white/10 font-medium hidden sm:inline">
                Espace de Travail
              </span>
            </div>
          </div>
        </div>

        {/* Center: Compact Active Expert Dropdown Selector */}
        <div className="relative">
          <button
            onClick={() => setShowExpertDropdown(!showExpertDropdown)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/10 text-xs font-semibold text-[#F5F6FA] cursor-pointer transition-all"
          >
            <span className="text-[#9AA0B2]">Expert :</span>
            <span className="text-[#F5F6FA] font-bold">{currentSpecialist.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#9AA0B2]" />
          </button>

          {/* Expert Popover Dropdown */}
          {showExpertDropdown && (
            <div className="absolute top-11 left-1/2 -translate-x-1/2 w-64 p-2 bg-[#0B0F19]/95 border border-white/15 rounded-2xl shadow-2xl backdrop-blur-2xl z-50 space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold uppercase text-[#9AA0B2]">Changer d'expert IA</div>
              {specialists.map(spec => {
                const isSelected = spec.id === activePersonaId;
                const Icon = spec.icon;
                return (
                  <button
                    key={spec.id}
                    onClick={() => handleSelectSpecialist(spec.id)}
                    className={`w-full p-2 rounded-xl text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-white/10 text-white font-bold border border-white/20"
                        : "text-[#9AA0B2] hover:text-[#F5F6FA] hover:bg-white/[0.04]"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? "text-[#FF6685]" : "text-[#9AA0B2]"}`} />
                    <div className="text-left min-w-0">
                      <div className="truncate">{spec.name}</div>
                      <div className="text-[10px] text-[#9AA0B2] font-normal truncate">{spec.role}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Actions Bar */}
        <div className="flex items-center gap-2">
          {/* Active Sources Button */}
          <button
            onClick={() => setShowSourcesModal(true)}
            className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/10 text-xs font-medium text-[#F5F6FA] flex items-center gap-2 cursor-pointer transition-all"
          >
            <div className="w-2 h-2 rounded-full bg-[#34D399]" />
            <span>Sources ({totalActiveSourcesCount})</span>
          </button>

          {/* Toggle Studio Right Panel */}
          <button
            onClick={() => setIsRightPanelCollapsed(!isRightPanelCollapsed)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              !isRightPanelCollapsed
                ? "bg-white/10 text-white border-white/20"
                : "bg-white/[0.04] hover:bg-white/10 text-[#9AA0B2] hover:text-white border-white/10"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Studio ({deliverables.length})</span>
          </button>

          {/* Sessions History */}
          <button
            onClick={() => setShowHistoryModal(true)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#9AA0B2] hover:text-white transition-all cursor-pointer"
            title="Historique des sessions"
          >
            <History className="w-4 h-4" />
          </button>

          {/* New Session CTA in NACORA Red */}
          <button
            onClick={() => handleCreateSession()}
            className="px-3.5 py-1.5 rounded-xl bg-[#D81A45] hover:bg-[#FF6685] text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nouveau</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MAIN WORKSPACE: SPACIOUS CENTERED CONVERSATION                        */}
      {/* ===================================================================== */}
      <div className="flex-1 flex overflow-hidden">

        {/* ------------------------------------------------------------------- */}
        {/* LEFT COLUMN: MINIMALIST WORKSPACE SIDEBAR                           */}
        {/* ------------------------------------------------------------------- */}
        {!isLeftPanelCollapsed && (
          <div className="hidden md:flex flex-col w-60 lg:w-64 border-r border-white/10 bg-white/[0.015] backdrop-blur-xl shrink-0 p-3 space-y-3 overflow-y-auto">
            
            {/* Active Specialist Card */}
            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase text-[#9AA0B2]">
                <span>Spécialiste Actif</span>
                <SlidersHorizontal className="w-3 h-3" />
              </div>
              <div className="flex items-center gap-2">
                {React.createElement(currentSpecialist.icon, { className: "w-4 h-4 text-[#FF6685] shrink-0" })}
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#F5F6FA] truncate">{currentSpecialist.name}</div>
                  <div className="text-[10px] text-[#9AA0B2] truncate">{currentSpecialist.role}</div>
                </div>
              </div>
              <button
                onClick={() => setShowExpertDropdown(true)}
                className="w-full py-1 text-[10px] font-semibold text-[#9AA0B2] hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all cursor-pointer"
              >
                Changer d'expert
              </button>
            </div>

            {/* Sources Quick Action Card */}
            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase text-[#9AA0B2]">
                <span>Sources Ancrées</span>
                <span className="text-[#34D399]">{totalActiveSourcesCount} actives</span>
              </div>

              <div className="text-xs text-[#9AA0B2] space-y-1">
                <p>• {activeOpportunities.length} opportunité(s)</p>
                <p>• {activeContacts.length} contact(s)</p>
                <p>• {activeDocuments.length} document(s)</p>
              </div>

              <button
                onClick={() => setShowSourcesModal(true)}
                className="w-full py-1.5 text-xs font-bold text-[#F5F6FA] bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <FolderPlus className="w-3.5 h-3.5 text-[#FF6685]" />
                <span>Gérer les sources</span>
              </button>
            </div>

            {/* Quick Notes Input */}
            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1.5">
              <div className="text-[10px] font-bold uppercase text-[#9AA0B2]">Consigne rapide</div>
              <textarea
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Indiquez une consigne particulière..."
                rows={2}
                className="w-full bg-white/[0.03] border border-white/10 focus:border-white/20 rounded-xl p-2 text-xs text-[#F5F6FA] placeholder:text-[#9AA0B2]/40 outline-none resize-none"
              />
            </div>

            {/* Recent Sessions list */}
            <div className="flex-1 space-y-1 pt-2 border-t border-white/10 min-h-[120px]">
              <div className="text-[10px] font-bold uppercase text-[#9AA0B2] px-1">Sessions récentes</div>
              {sessions.slice(0, 4).map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveSessionId(s.id)}
                  className={`w-full p-2 rounded-xl text-left text-xs truncate transition-all cursor-pointer ${
                    s.id === activeSessionId
                      ? "bg-white/10 text-white font-semibold border border-white/15"
                      : "text-[#9AA0B2] hover:text-[#F5F6FA] hover:bg-white/[0.03]"
                  }`}
                >
                  {s.title}
                </button>
              ))}
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* CENTER STAGE: CONVERSATION WITH AI SPECIALIST                        */}
        {/* ------------------------------------------------------------------- */}
        <div className="flex-1 flex flex-col min-w-0 bg-transparent relative">

          {/* Sub-header inside Chat Column: Context pill & collapse toggles */}
          <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between gap-2 shrink-0 backdrop-blur-md">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
                className="p-1 rounded-lg text-[#9AA0B2] hover:text-white cursor-pointer"
                title={isLeftPanelCollapsed ? "Afficher le panneau latéral" : "Masquer le panneau latéral"}
              >
                <PanelLeft className="w-4 h-4" />
              </button>

              <div className="text-xs text-[#9AA0B2] truncate flex items-center gap-1">
                <span>Discussion ancrée dans :</span>
                <span className="text-[#F5F6FA] font-semibold">{totalActiveSourcesCount} sources réelles</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSourcesModal(true)}
                className="text-xs text-[#FF6685] hover:underline font-medium cursor-pointer"
              >
                Ajuster les sources
              </button>
            </div>
          </div>

          {/* Chat Messages Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-5 max-w-4xl mx-auto w-full">
            {(!activeSession || activeSession.messages.length === 0) ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-md mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#9AA0B2]">
                  <Compass className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#F5F6FA]">{currentSpecialist.name}</h3>
                  <p className="text-xs text-[#9AA0B2] mt-1 leading-relaxed">{currentSpecialist.desc}</p>
                </div>
                <button
                  onClick={() => handleCreateSession()}
                  className="px-5 py-2.5 rounded-xl bg-[#D81A45] hover:bg-[#FF6685] text-white text-xs font-bold cursor-pointer transition-all shadow-sm"
                >
                  Démarrer la discussion
                </button>
              </div>
            ) : (
              activeSession.messages.map((msg, idx) => {
                const isUser = msg.role === "user";
                const actions = !isUser ? extractQuickActions(msg.text) : [];

                return (
                  <div
                    key={msg.id || idx}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1`}
                  >
                    <div className="flex items-center gap-2 px-1 text-[10px] text-[#9AA0B2]">
                      <span className="font-semibold">{isUser ? "Vous" : currentSpecialist.name}</span>
                      <span>•</span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>

                    <div
                      className={`max-w-[88%] md:max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed border shadow-sm ${
                        isUser
                          ? "bg-white/[0.08] text-[#F5F6FA] border-white/15 rounded-tr-xs backdrop-blur-md"
                          : "bg-white/[0.03] text-[#F5F6FA] border-white/10 rounded-tl-xs backdrop-blur-md"
                      }`}
                    >
                      {renderFormattedText(msg.text)}

                      {/* Assistant Copy action bar */}
                      {!isUser && (
                        <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between gap-2 text-[10px] text-[#9AA0B2]">
                          <span className="flex items-center gap-1 text-[#34D399]">
                            <ShieldCheck className="w-3 h-3 text-[#12B76A]" />
                            Vérifié ({totalActiveSourcesCount} sources)
                          </span>

                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(msg.text.replace(/\[ACTIONS:.*?\]/gs, "").trim());
                              setCopiedMsgId(msg.id);
                              setTimeout(() => setCopiedMsgId(null), 2000);
                              showToast("Texte copié", "info");
                            }}
                            className="p-1 hover:text-white transition-colors cursor-pointer"
                            title="Copier le texte"
                          >
                            {copiedMsgId === msg.id ? <Check className="w-3.5 h-3.5 text-[#34D399]" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Quick suggested follow-up actions */}
                    {!isUser && actions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1 max-w-[85%]">
                        {actions.map((act, aIdx) => (
                          <button
                            key={aIdx}
                            onClick={() => handleSendMessage(act)}
                            className="px-2.5 py-1 rounded-xl bg-white/[0.03] hover:bg-white/10 border border-white/10 text-[10px] text-[#9AA0B2] hover:text-[#F5F6FA] font-medium flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <Zap className="w-3 h-3 text-[#C084FC]" />
                            <span>{act}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {isLoading && (
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-[#9AA0B2] w-fit backdrop-blur-md">
                <div className="w-3.5 h-3.5 border-2 border-[#C084FC] border-t-transparent rounded-full animate-spin" />
                <span>Analyse en cours...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Floating Bottom Input Dock Bar */}
          <div className="p-3.5 border-t border-white/10 bg-white/[0.015] backdrop-blur-2xl">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2 max-w-4xl mx-auto"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={currentSpecialist.placeholder}
                disabled={isLoading}
                className="flex-1 bg-white/[0.03] border border-white/10 focus:border-white/20 rounded-2xl px-4 py-3 text-xs text-[#F5F6FA] placeholder:text-[#9AA0B2]/50 outline-none transition-all"
              />

              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="p-3 rounded-2xl bg-[#D81A45] hover:bg-[#FF6685] text-white disabled:opacity-40 font-bold transition-all shadow-sm cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>

        {/* ------------------------------------------------------------------- */}
        {/* RIGHT COLUMN: ON-DEMAND STUDIO DELIVERABLES PANEL                   */}
        {/* ------------------------------------------------------------------- */}
        {!isRightPanelCollapsed && (
          <div className="hidden lg:flex flex-col w-72 lg:w-80 xl:w-84 border-l border-white/10 bg-white/[0.015] backdrop-blur-xl shrink-0 overflow-hidden transition-all duration-300">
            {renderStudioContent()}
          </div>
        )}

      </div>

      {/* =================================================================== */}
      {/* MODAL: SOURCES MANAGEMENT                                           */}
      {/* =================================================================== */}
      {showSourcesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className="bg-[#0B0F19]/95 border border-white/15 rounded-2xl w-full max-w-3xl p-6 shadow-2xl backdrop-blur-2xl">
            {renderSourcesModalContent()}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: EDIT & INSPECT STUDIO DELIVERABLE                           */}
      {/* =================================================================== */}
      {activeDeliverableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className="bg-[#0B0F19]/95 border border-white/15 rounded-2xl w-full max-w-2xl p-6 flex flex-col gap-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#9AA0B2]" />
                <h3 className="text-sm font-bold text-[#F5F6FA]">Livrable Studio NACORA</h3>
              </div>
              <button
                onClick={() => setActiveDeliverableModal(null)}
                className="text-[#9AA0B2] hover:text-white cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-[#9AA0B2] uppercase tracking-wider block mb-1">Titre du livrable</label>
                <input
                  type="text"
                  value={editedDeliverableTitle}
                  onChange={(e) => setEditedDeliverableTitle(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 focus:border-white/20 rounded-xl px-3 py-2 text-xs text-[#F5F6FA] outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#9AA0B2] uppercase tracking-wider block mb-1">Contenu texte</label>
                <textarea
                  value={editedDeliverableContent}
                  onChange={(e) => setEditedDeliverableContent(e.target.value)}
                  rows={14}
                  className="w-full bg-black/40 border border-white/10 focus:border-white/20 rounded-xl p-3.5 text-xs text-[#F5F6FA] font-mono leading-relaxed resize-y outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(editedDeliverableContent);
                  showToast("Texte copié dans le presse-papier", "info");
                }}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-[#F5F6FA] flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                <span>Copier le texte</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveDeliverableModal(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-[#9AA0B2] font-semibold cursor-pointer"
                >
                  Annuler
                </button>

                <button
                  onClick={() => {
                    const updated = {
                      ...activeDeliverableModal,
                      title: editedDeliverableTitle,
                      content: editedDeliverableContent,
                      updatedAt: new Date().toISOString()
                    };
                    setDeliverables(prev => prev.map(d => d.id === updated.id ? updated : d));
                    handleSaveDeliverableToNacora(updated);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#D81A45] hover:bg-[#FF6685] text-xs text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>Enregistrer dans NACORA</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: SESSIONS HISTORY                                            */}
      {/* =================================================================== */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className="bg-[#0B0F19]/95 border border-white/15 rounded-2xl w-full max-w-md p-5 flex flex-col gap-4 shadow-2xl max-h-[75vh]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#9AA0B2]" />
                <h3 className="text-sm font-bold text-[#F5F6FA]">Historique des sessions</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-[#9AA0B2] hover:text-white cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 max-h-[360px] pr-1">
              {sessions.length === 0 ? (
                <p className="text-xs text-[#9AA0B2] text-center py-6">Aucune session enregistrée.</p>
              ) : (
                sessions.map(sess => {
                  const isActive = sess.id === activeSessionId;
                  const spec = specialists.find(s => s.id === sess.personaId);
                  return (
                    <div
                      key={sess.id}
                      onClick={() => {
                        setActiveSessionId(sess.id);
                        if (sess.personaId) setActivePersonaId(sess.personaId);
                        setShowHistoryModal(false);
                      }}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer ${
                        isActive
                          ? "bg-white/10 border-white/20 text-white font-semibold"
                          : "bg-white/[0.02] border-white/5 hover:bg-white/[0.06] text-[#F5F6FA]"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold truncate">{sess.title}</div>
                        <div className="text-[10px] text-[#9AA0B2] mt-0.5">
                          {spec?.name || sess.personaName} • {new Date(sess.updatedAt).toLocaleDateString("fr-FR")}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSession(sess.id, e)}
                        className="p-1 rounded hover:bg-white/10 text-[#9AA0B2] hover:text-[#F04438] transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-white/10 text-right">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-[#F5F6FA] font-semibold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
