import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { dbStore } from "../dbStore";
import { Contact, ContactCategory, ContactNetworkingStatus, CandidateProfile } from "../types";
import { getCategoryBadgeStyle, isHumanResourcesRole, isBankingAndFinanceRole, computePrimaryCategory } from "../utils/contactMerger";
import { GlassCard, Badge, GlassButton, Modal } from "../components/Shared";
import { LinkedInImportModal } from "../components/LinkedInImportModal";
import { ImportContactsTextModal } from "../components/ImportContactsTextModal";
import { ContactDetailWorkspace } from "../components/ContactDetailWorkspace";
import { computeStrategicInterests } from "../utils/strategicInterests";
import { 
  Users, 
  Upload, 
  Search, 
  Sparkles, 
  CheckCircle, 
  Plus, 
  ChevronRight, 
  Linkedin, 
  Mail, 
  Phone, 
  Building2, 
  Briefcase, 
  GraduationCap, 
  Filter, 
  X, 
  ArrowUpDown, 
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  Award,
  Link as LinkIcon,
  UserCheck,
  Trash2,
  Check,
  RotateCcw,
  Target,
  BadgeCheck,
  Sliders
} from "lucide-react";

export type ContactSortOption = "relevance" | "name" | "company" | "job" | "recent" | "status";
export type ContactSortDirection = "asc" | "desc";

interface FilterOption {
  id: string;
  label: string;
  keywords?: string[];
}

const FUNCTION_FILTER_OPTIONS: FilterOption[] = [
  { id: "all", label: "Toutes les fonctions" },
  { id: "wealth_mgmt", label: "Gestion de Patrimoine", keywords: ["patrimoine", "wealth", "gestion privée", "banque privée", "private banking", "cgp", "cgpc", "patrimonial"] },
  { id: "banking", label: "Banque & Financement", keywords: ["banque", "bank", "crédit", "credit", "financement", "chargé de clientèle", "conseiller financier", "agence bancaire", "analyste crédit", "retail banking"] },
  { id: "corporate_finance", label: "Finance & Marché", keywords: ["finance", "financial", "m&a", "fusion", "trésorerie", "contrôle de gestion", "analyste", "trader", "invest"] },
  { id: "recruitment", label: "Recrutement & RH", keywords: ["recrut", "talent", "hr", "rh", "ressources humaines", "campus manager", "acquisition", "headhunter", "chasseur"] },
  { id: "sales", label: "Commercial & Business Dev", keywords: ["commercial", "business develop", "sales", "chargé d'affaires", "account manager", "prospection", "négociat"] },
  { id: "management", label: "Direction & C-Level", keywords: ["directeur", "director", "ceo", "dg", "fondateur", "founder", "associé", "partner", "président", "board", "cfo", "coo", "gérant"] },
  { id: "tech_data", label: "Tech, Data & IT", keywords: ["tech", "data", "developer", "développeur", "software", "ingénieur", "product", "informatique", "lead dev"] },
  { id: "academic", label: "Enseignement & Recherche", keywords: ["professeur", "enseignant", "formateur", "recherche", "chercheur", "conférences", "académique", "docteur"] }
];

const SENIORITY_FILTER_OPTIONS: FilterOption[] = [
  { id: "all", label: "Tous niveaux" },
  { id: "c_level", label: "C-Level / Dirigeant", keywords: ["fondateur", "founder", "ceo", "cfo", "coo", "directeur général", "associé", "partner", "president", "président", "co-fondateur", "gérant"] },
  { id: "manager", label: "Manager / Responsable", keywords: ["manager", "responsable", "head of", "lead", "chef", "directeur", "director", "team leader", "coordinateur"] },
  { id: "senior", label: "Senior / Expert", keywords: ["senior", "expert", "principal", "confirmé", "spécialiste", "specialist"] },
  { id: "junior_student", label: "Étudiant / Alternant / Junior", keywords: ["junior", "alternant", "stagiaire", "étudiant", "etudiant", "student", "intern", "apprentice", "apprenti", "débutant"] }
];

const ACADEMIC_FILTER_OPTIONS: FilterOption[] = [
  { id: "all", label: "Tous réseaux académiques" },
  { id: "alumni_network", label: "Réseau Alumni & Écoles" },
  { id: "uca_clermont", label: "IUT / UCA Clermont-Ferrand" }
];

const MIN_SCORE_OPTIONS = [
  { value: 0, label: "Tous scores" },
  { value: 70, label: "≥ 70% Adéquation" },
  { value: 80, label: "≥ 80% Forte valeur" },
  { value: 90, label: "≥ 90% Top profil" }
];

interface ContactsProps {
  showToast: (message: string, type: "success" | "error" | "info" | "ai") => void;
  searchTerm: string;
  initialSelectedContactId?: string | null;
  onClearInitialContact?: () => void;
}

export const Contacts: React.FC<ContactsProps> = ({ showToast, searchTerm, initialSelectedContactId, onClearInitialContact }) => {
  const { language, t } = useLanguage();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [profile, setProfile] = useState<CandidateProfile>(dbStore.getProfile());
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Filters & Search
  const [localSearch, setLocalSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [functionFilter, setFunctionFilter] = useState<string>("all");
  const [seniorityFilter, setSeniorityFilter] = useState<string>("all");
  const [academicFilter, setAcademicFilter] = useState<string>("all");
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [onlyLinkedIn, setOnlyLinkedIn] = useState<boolean>(false);
  const [onlyEmail, setOnlyEmail] = useState<boolean>(false);
  const [onlyOpportunityLinked, setOnlyOpportunityLinked] = useState<boolean>(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // Sorting
  const [sortBy, setSortBy] = useState<ContactSortOption>("relevance");
  const [sortOrder, setSortOrder] = useState<ContactSortDirection>("desc");

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isTextImportModalOpen, setIsTextImportModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

  // Add Contact Form State
  const [formName, setFormName] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formJob, setFormJob] = useState("");
  const [formCategory, setFormCategory] = useState<ContactCategory>("other");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formLinkedIn, setFormLinkedIn] = useState("");
  const [formContactUrl, setFormContactUrl] = useState("");
  const [formNotes, setFormNotes] = useState("");

  useEffect(() => {
    const allContacts = dbStore.getContacts();

    // Auto-reconcile misclassified contacts (e.g. bank advisors previously marked as recruiter)
    let hasUpdates = false;
    allContacts.forEach(c => {
      const isAlumni = c.category === "alumni" || Boolean(c.academicPath) || (c.connectionPoints || []).some(p => /alumni|iut|uca|clermont/i.test(p)) || (c.categories || []).some(cat => cat.category === "academic");
      const isHR = isHumanResourcesRole(c.jobTitle) || isHumanResourcesRole(c.normalizedJobTitle);
      const isBank = isBankingAndFinanceRole(c.jobTitle, c.companyName) || isBankingAndFinanceRole(c.normalizedJobTitle, c.companyName);
      
      if (isAlumni && c.category !== "alumni") {
        c.category = "alumni";
        dbStore.updateContact(c);
        hasUpdates = true;
      } else if (c.category === "recruiter" && isBank && !isHR) {
        c.category = isAlumni ? "alumni" : "sector_pro";
        dbStore.updateContact(c);
        hasUpdates = true;
      }
    });

    const refreshed = hasUpdates ? dbStore.getContacts() : allContacts;
    setContacts(refreshed);
    setProfile(dbStore.getProfile());

    if (initialSelectedContactId) {
      const match = refreshed.find(c => c.id === initialSelectedContactId);
      if (match) {
        setSelectedContact(match);
        if (onClearInitialContact) onClearInitialContact();
      }
    }

    const unsub = dbStore.subscribe(() => {
      const freshContacts = dbStore.getContacts();
      setContacts(freshContacts);
      setProfile(dbStore.getProfile());

      // Keep selected contact synced
      if (selectedContact) {
        const fresh = freshContacts.find(c => c.id === selectedContact.id);
        if (fresh) setSelectedContact(fresh);
      }
    });
    return unsub;
  }, [initialSelectedContactId, selectedContact?.id]);

  // Distinct company list from contacts for filter
  const companyOptions = Array.from(new Set(contacts.map(c => c.companyName).filter(Boolean))).sort();

  // Helper: check if contact matches a given category (primary, multidimensional, or contextual)
  const contactMatchesCategoryFilter = (c: Contact, filter: string): boolean => {
    if (filter === "all") return true;

    // Strict role detection
    const isHR = isHumanResourcesRole(c.jobTitle) || isHumanResourcesRole(c.normalizedJobTitle);
    const isFinanceOrBank = isBankingAndFinanceRole(c.jobTitle, c.companyName) || isBankingAndFinanceRole(c.normalizedJobTitle, c.companyName);

    if (filter === "recruiter") {
      // Must be actual HR / Talent Acquisition and NOT an operational banker/advisor
      if (isFinanceOrBank && !isHR) return false;
      if (isHR) return true;
      if (c.category === "recruiter" && !isFinanceOrBank) return true;
      if (c.categories && c.categories.some(cat => cat.category === "recruitment" && !/conseill|banqu|financ|client/i.test(cat.subcategory))) return true;
      return false;
    }

    if (filter === "sector_pro") {
      if (isFinanceOrBank && !isHR) return true;
      if (c.category === "sector_pro") return true;
      if (c.categories && c.categories.some(cat => 
        (cat.category === "sector" && /banque|finance|patrimoine|fintech|assurance/i.test(cat.subcategory)) ||
        (cat.category === "professional_function" && /banque|finance|patrimoine|fintech|assurance|audit|gestion|conseil/i.test(cat.subcategory))
      )) return true;
      const text = `${c.jobTitle || ""} ${c.companyName || ""}`.toLowerCase();
      return /banqu|financ|patrimoine|wealth|crédit|credit|assurance|gestion privée|cgp|analyste|conseill/i.test(text);
    }

    if (filter === "alumni") {
      if (c.category === "alumni") return true;
      if (Boolean(c.academicPath)) return true;
      if (c.categories && c.categories.some(cat => cat.category === "academic" || /alumni|école|diplôm/i.test(cat.subcategory))) return true;
      const text = `${c.academicPath || ""} ${c.notes || ""}`.toLowerCase();
      return /alumni|clermont|iut|uca|montluçon/i.test(text);
    }

    if (filter === "student") {
      if (c.category === "student") return true;
      if (c.categories && c.categories.some(cat => cat.category === "status" && /étudiant|alternant|stagiaire|apprenti/i.test(cat.subcategory))) return true;
      const text = `${c.jobTitle || ""}`.toLowerCase();
      return /étudiant|alternan|stagiaire|intern\b|apprenti/i.test(text);
    }

    if (filter === "other_pro") {
      if (c.category === "other_pro") return true;
      if (!isHR && !isFinanceOrBank && c.category !== "alumni" && c.category !== "student") return true;
      return false;
    }

    return c.category === filter;
  };

  // Statistics supporting multidimensional classifications
  const totalCount = contacts.length;
  const alumniCount = contacts.filter(c => contactMatchesCategoryFilter(c, "alumni")).length;
  const recruiterCount = contacts.filter(c => contactMatchesCategoryFilter(c, "recruiter")).length;
  const sectorProCount = contacts.filter(c => contactMatchesCategoryFilter(c, "sector_pro")).length;
  const studentCount = contacts.filter(c => contactMatchesCategoryFilter(c, "student")).length;
  const linkedOppCount = contacts.filter(c => Boolean(c.opportunityId)).length;

  const handleCategoryBadge = (category: ContactCategory) => {
    switch (category) {
      case "recruiter":
        return <Badge variant="green">{language === "en" ? "Recruiter / HR" : "Recruteur / RH"}</Badge>;
      case "alumni":
        return <Badge variant="blue">Alumni</Badge>;
      case "student":
        return <Badge variant="purple">{language === "en" ? "Student" : "Étudiant"}</Badge>;
      case "sector_pro":
        return <Badge variant="crimson">{language === "en" ? "Target Sector Pro" : "Pro Secteur Cible"}</Badge>;
      case "other_pro":
        return <Badge variant="amber">{language === "en" ? "Other Sector Pro" : "Pro Autre Secteur"}</Badge>;
      default:
        return <Badge variant="gray">{language === "en" ? "Other" : "Autre"}</Badge>;
    }
  };

  // Helper matchers for fine-grained filters
  const matchFunction = (c: Contact, filterId: string): boolean => {
    if (filterId === "all") return true;
    const opt = FUNCTION_FILTER_OPTIONS.find(o => o.id === filterId);
    if (!opt || !opt.keywords) return true;
    
    // Check in categories
    if (c.categories && c.categories.some(cat => {
      const sub = (cat.subcategory || "").toLowerCase();
      const reason = (cat.reason || "").toLowerCase();
      return opt.keywords!.some(kw => sub.includes(kw) || reason.includes(kw));
    })) {
      return true;
    }
    // Check in professionalProfile
    if (c.professionalProfile?.currentFunction) {
      const fn = c.professionalProfile.currentFunction.toLowerCase();
      if (opt.keywords.some(kw => fn.includes(kw))) return true;
    }
    // Check in job titles
    const title = `${c.normalizedJobTitle || ""} ${c.jobTitle || ""}`.toLowerCase();
    return opt.keywords.some(kw => title.includes(kw));
  };

  const matchSeniority = (c: Contact, filterId: string): boolean => {
    if (filterId === "all") return true;
    const opt = SENIORITY_FILTER_OPTIONS.find(o => o.id === filterId);
    if (!opt || !opt.keywords) return true;

    // Check in categories
    if (c.categories && c.categories.some(cat => {
      if (cat.category === "seniority" || cat.category === "status") {
        const sub = (cat.subcategory || "").toLowerCase();
        if (opt.keywords!.some(kw => sub.includes(kw))) return true;
      }
      return false;
    })) {
      return true;
    }
    // Check in professionalProfile
    if (c.professionalProfile?.level) {
      const lvl = c.professionalProfile.level.toLowerCase();
      if (opt.keywords.some(kw => lvl.includes(kw))) return true;
    }
    // Check in job title
    const title = `${c.normalizedJobTitle || ""} ${c.jobTitle || ""}`.toLowerCase();
    return opt.keywords.some(kw => title.includes(kw));
  };

  const matchAcademic = (c: Contact, filterId: string): boolean => {
    if (filterId === "all") return true;
    if (filterId === "alumni_network") {
      return (
        c.category === "alumni" ||
        Boolean(c.academicPath) ||
        (c.categories && c.categories.some(cat => cat.category === "academic" || /alumni|école|diplôme|étudiant/i.test(cat.subcategory))) ||
        (c.connectionPoints && c.connectionPoints.some(pt => /alumni|école|diplôme|étudiant|formation/i.test(pt)))
      );
    }
    if (filterId === "uca_clermont") {
      const textToScan = [
        c.academicPath || "",
        c.notes || "",
        ...(c.connectionPoints || []),
        ...(c.categories ? c.categories.map(cat => `${cat.subcategory} ${cat.reason}`) : [])
      ].join(" ").toLowerCase();
      return /clermont|uca|iut|auvergne|iae/i.test(textToScan);
    }
    return true;
  };

  // Active filter counters
  const activeAdvancedFilterCount = [
    functionFilter !== "all",
    seniorityFilter !== "all",
    academicFilter !== "all",
    companyFilter !== "all",
    statusFilter !== "all",
    minScoreFilter > 0,
    onlyLinkedIn,
    onlyEmail,
    onlyOpportunityLinked
  ].filter(Boolean).length;

  const hasAnyFilterActive = 
    Boolean(localSearch.trim() || searchTerm.trim()) || 
    categoryFilter !== "all" || 
    activeAdvancedFilterCount > 0;

  const handleResetFilters = () => {
    setLocalSearch("");
    setCategoryFilter("all");
    setCompanyFilter("all");
    setStatusFilter("all");
    setFunctionFilter("all");
    setSeniorityFilter("all");
    setAcademicFilter("all");
    setMinScoreFilter(0);
    setOnlyLinkedIn(false);
    setOnlyEmail(false);
    setOnlyOpportunityLinked(false);
  };

  // Quick Sort Helper with directional toggle
  const handleQuickSort = (key: ContactSortOption) => {
    if (sortBy === key) {
      // Toggle order
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      // Default natural order: A-Z for text, High-to-low for score/date
      if (key === "name" || key === "company" || key === "job") {
        setSortOrder("asc");
      } else {
        setSortOrder("desc");
      }
    }
  };

  // Filter & Sort contacts
  const effectiveSearch = (localSearch || searchTerm).toLowerCase().trim();

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = !effectiveSearch || (
      c.fullName.toLowerCase().includes(effectiveSearch) ||
      c.companyName.toLowerCase().includes(effectiveSearch) ||
      c.jobTitle.toLowerCase().includes(effectiveSearch) ||
      (c.academicPath && c.academicPath.toLowerCase().includes(effectiveSearch)) ||
      (c.connectionPoints && c.connectionPoints.some(pt => pt.toLowerCase().includes(effectiveSearch))) ||
      (c.categories && c.categories.some(cat => cat.subcategory.toLowerCase().includes(effectiveSearch) || (cat.reason && cat.reason.toLowerCase().includes(effectiveSearch))))
    );

    const matchesCategory = contactMatchesCategoryFilter(c, categoryFilter);
    const matchesCompany = companyFilter === "all" || c.companyName.toLowerCase() === companyFilter.toLowerCase();
    const matchesStatus = statusFilter === "all" || (c.networkingStatus || "to_contact") === statusFilter;
    const matchesFunction = matchFunction(c, functionFilter);
    const matchesSeniority = matchSeniority(c, seniorityFilter);
    const matchesAcademic = matchAcademic(c, academicFilter);
    const matchesScore = minScoreFilter === 0 || (c.relevanceScore || 0) >= minScoreFilter;
    const matchesLinkedIn = !onlyLinkedIn || Boolean(c.linkedInUrl);
    const matchesEmail = !onlyEmail || Boolean(c.email);
    const matchesOpportunity = !onlyOpportunityLinked || Boolean(c.opportunityId);

    return (
      matchesSearch &&
      matchesCategory &&
      matchesCompany &&
      matchesStatus &&
      matchesFunction &&
      matchesSeniority &&
      matchesAcademic &&
      matchesScore &&
      matchesLinkedIn &&
      matchesEmail &&
      matchesOpportunity
    );
  }).sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "relevance":
        comparison = (b.relevanceScore || 0) - (a.relevanceScore || 0);
        break;
      case "name":
        comparison = a.fullName.localeCompare(b.fullName, "fr", { sensitivity: "base" });
        break;
      case "company":
        comparison = (a.companyName || "").localeCompare(b.companyName || "", "fr", { sensitivity: "base" });
        break;
      case "job":
        const jobA = a.normalizedJobTitle || a.jobTitle || "";
        const jobB = b.normalizedJobTitle || b.jobTitle || "";
        comparison = jobA.localeCompare(jobB, "fr", { sensitivity: "base" });
        break;
      case "recent":
        comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        break;
      case "status":
        const orderMap: Record<string, number> = {
          to_contact: 1,
          contacted: 2,
          exchanging: 3,
          interview_done: 4,
          not_interested: 5
        };
        comparison = (orderMap[a.networkingStatus || "to_contact"] || 99) - (orderMap[b.networkingStatus || "to_contact"] || 99);
        break;
      default:
        comparison = 0;
    }

    if (sortBy === "name" || sortBy === "company" || sortBy === "job") {
      return sortOrder === "asc" ? comparison : -comparison;
    }
    return sortOrder === "desc" ? comparison : -comparison;
  });

  // Manual Add Contact
  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formCompany || !formJob) {
      showToast("Veuillez remplir les informations obligatoires", "error");
      return;
    }

    const nameParts = formName.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const linkedCo = dbStore.getCompanyByNameOrCreate(formCompany);

    const strategic = computeStrategicInterests({
      fullName: formName.trim(),
      jobTitle: formJob.trim(),
      companyName: linkedCo.name,
      category: formCategory,
      notes: formNotes
    }, profile);

    const newContact = dbStore.addContact({
      fullName: formName.trim(),
      firstName,
      lastName,
      companyId: linkedCo.id,
      companyName: linkedCo.name,
      jobTitle: formJob.trim(),
      normalizedJobTitle: formJob.trim(),
      category: formCategory,
      relevanceScore: strategic.relevanceScore,
      networkingRelevance: strategic.networkingRelevance,
      connectionPoints: strategic.connectionPoints,
      summary: strategic.summary,
      previousCompanies: [],
      notes: formNotes || "Ajouté manuellement",
      email: formEmail.trim() || undefined,
      phone: formPhone.trim() || undefined,
      linkedInUrl: formLinkedIn.trim() || undefined,
      contactUrl: formContactUrl.trim() || undefined,
      networkingStatus: "to_contact",
      history: [
        {
          id: "hist_" + Math.random().toString(36).substring(2, 9),
          type: "import",
          label: "Contact ajouté manuellement au carnet",
          timestamp: new Date().toISOString()
        }
      ]
    });

    showToast(`Contact "${formName}" ajouté avec succès`, "success");
    setFormName("");
    setFormCompany("");
    setFormJob("");
    setFormCategory("other");
    setFormEmail("");
    setFormPhone("");
    setFormLinkedIn("");
    setFormContactUrl("");
    setFormNotes("");
    setIsAddModalOpen(false);
  };

  // Delete Contact
  const handleDeleteContact = (id: string) => {
    dbStore.deleteContact(id);
    showToast("Contact supprimé", "info");
    setSelectedContact(null);
  };

  // If a contact is selected, display the full-width workspace (similar to Opportunities)
  if (selectedContact) {
    return (
      <div className="relative z-10 w-full">
        <ContactDetailWorkspace
          contact={selectedContact}
          profile={profile}
          onClose={() => setSelectedContact(null)}
          onUpdate={(updated) => {
            setSelectedContact(updated);
            setContacts(dbStore.getContacts());
          }}
          onDelete={handleDeleteContact}
          showToast={showToast}
        />
      </div>
    );
  }

  return (
    <div className="relative z-10 w-full space-y-5">
      
      {/* ========================================================================= */}
      {/* 1. HEADER SECTION                                                         */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-[#F5F6FA] tracking-tight font-display whitespace-nowrap">
            {t.contacts.title}
          </h1>
          <p className="text-[#9AA0B2] text-xs sm:text-sm mt-0.5">
            {t.contacts.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <GlassButton 
            variant="secondary" 
            size="md"
            onClick={() => setIsTextImportModalOpen(true)}
            icon={<Sparkles className="w-3.5 h-3.5 text-[#FF6685]" />}
          >
            {language === "en" ? "Import from text" : "Importer par texte"}
          </GlassButton>
          <GlassButton 
            variant="secondary" 
            size="md"
            onClick={() => setIsImportModalOpen(true)}
            icon={<Upload className="w-3.5 h-3.5 text-[#9AA0B2]" />}
          >
            {t.contacts.importLinkedin}
          </GlassButton>
          <GlassButton 
            variant="primary" 
            size="md"
            onClick={() => setIsAddModalOpen(true)}
            icon={<Plus className="w-3.5 h-3.5 text-white" />}
          >
            {t.contacts.addContact}
          </GlassButton>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. STATS BANNER (Liquid Glass iOS 27)                                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="relative overflow-hidden p-4 rounded-2xl bg-white/[0.02] backdrop-blur-md border border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.32),inset_0_1px_1px_rgba(255,255,255,0.16)] hover:bg-white/[0.04] hover:border-white/20 transition-all duration-300 flex flex-col justify-between group">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-[#9AA0B2] uppercase tracking-wider">{t.contacts.totalContacts}</span>
            <Users className="w-3.5 h-3.5 text-[#9AA0B2] group-hover:text-[#F5F6FA] transition-colors" />
          </div>
          <span className="text-2xl font-extrabold text-[#F5F6FA] font-display mt-2">{totalCount}</span>
        </div>

        <div className="relative overflow-hidden p-4 rounded-2xl bg-white/[0.02] backdrop-blur-md border border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.32),inset_0_1px_1px_rgba(255,255,255,0.16)] hover:bg-white/[0.04] hover:border-[rgba(56,189,248,0.3)] transition-all duration-300 flex flex-col justify-between group">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[rgba(56,189,248,0.4)] to-transparent pointer-events-none" />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-[#9AA0B2] uppercase tracking-wider">{t.contacts.alumni}</span>
            <GraduationCap className="w-3.5 h-3.5 text-[#38BDF8] transition-colors" />
          </div>
          <span className="text-2xl font-extrabold text-[#38BDF8] font-display mt-2">{alumniCount}</span>
        </div>

        <div className="relative overflow-hidden p-4 rounded-2xl bg-white/[0.02] backdrop-blur-md border border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.32),inset_0_1px_1px_rgba(255,255,255,0.16)] hover:bg-white/[0.04] hover:border-[rgba(18,183,106,0.3)] transition-all duration-300 flex flex-col justify-between group">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[rgba(18,183,106,0.4)] to-transparent pointer-events-none" />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-[#9AA0B2] uppercase tracking-wider">{t.contacts.recruiters}</span>
            <UserCheck className="w-3.5 h-3.5 text-[#34D399] transition-colors" />
          </div>
          <span className="text-2xl font-extrabold text-[#34D399] font-display mt-2">{recruiterCount}</span>
        </div>

        <div className="relative overflow-hidden p-4 rounded-2xl bg-white/[0.02] backdrop-blur-md border border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.32),inset_0_1px_1px_rgba(255,255,255,0.16)] hover:bg-white/[0.04] hover:border-[rgba(216,26,69,0.3)] transition-all duration-300 flex flex-col justify-between group">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[rgba(216,26,69,0.4)] to-transparent pointer-events-none" />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-[#9AA0B2] uppercase tracking-wider">{language === "en" ? "Sector Pros" : "Pro Secteur Cible"}</span>
            <Briefcase className="w-3.5 h-3.5 text-[#FF6685] transition-colors" />
          </div>
          <span className="text-2xl font-extrabold text-[#FF6685] font-display mt-2">{sectorProCount}</span>
        </div>

        <div className="relative overflow-hidden p-4 rounded-2xl bg-white/[0.02] backdrop-blur-md border border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.32),inset_0_1px_1px_rgba(255,255,255,0.16)] hover:bg-white/[0.04] hover:border-[rgba(192,132,252,0.3)] transition-all duration-300 flex flex-col justify-between col-span-2 sm:col-span-1 group">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[rgba(192,132,252,0.4)] to-transparent pointer-events-none" />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-[#9AA0B2] uppercase tracking-wider">{language === "en" ? "Linked to Jobs" : "Liés à des Offres"}</span>
            <LinkIcon className="w-3.5 h-3.5 text-[#C084FC] transition-colors" />
          </div>
          <span className="text-2xl font-extrabold text-[#C084FC] font-display mt-2">{linkedOppCount}</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. FILTERS, SEARCH & SORT BAR (Liquid Glass iOS 27)                       */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden p-4 rounded-2xl bg-white/[0.035] backdrop-blur-2xl border border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] space-y-3.5">
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

        {/* Top search & controls row */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          {/* Search input with dynamic result count */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#9AA0B2] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={language === "en" ? "Search by name, title, company, university, skills..." : "Rechercher par nom, poste, entreprise, école, compétences..."}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="glass-input pl-10 pr-24 py-2.5 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60 w-full rounded-xl"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {localSearch && (
                <button 
                  type="button"
                  onClick={() => setLocalSearch("")}
                  className="text-[#9AA0B2] hover:text-[#F5F6FA] cursor-pointer p-0.5"
                  title={language === "en" ? "Clear search" : "Effacer la recherche"}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <span className="text-[10px] text-[#9AA0B2] font-semibold bg-white/[0.05] px-2 py-0.5 rounded-lg border border-white/10 whitespace-nowrap backdrop-blur-sm">
                {filteredContacts.length} / {totalCount}
              </span>
            </div>
          </div>

          {/* Right controls: Advanced filters toggle + Sort Dropdown & Direction */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0 justify-between lg:justify-end">
            {/* Toggle Advanced Filters */}
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(prev => !prev)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border cursor-pointer backdrop-blur-xl ${
                showAdvancedFilters || activeAdvancedFilterCount > 0
                  ? "bg-[rgba(216,26,69,0.15)] text-[#FF6685] border-[rgba(216,26,69,0.30)] shadow-[0_0_14px_rgba(216,26,69,0.15),inset_0_1px_1px_rgba(255,255,255,0.2)]"
                  : "bg-white/[0.04] hover:bg-white/[0.08] text-[#F5F6FA] border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{language === "en" ? "Advanced Filters" : "Filtres avancés"}</span>
              {activeAdvancedFilterCount > 0 && (
                <span className="bg-[#D81A45] text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ml-0.5">
                  {activeAdvancedFilterCount}
                </span>
              )}
            </button>

            {/* Sort Selector with Direction Toggle */}
            <div className="flex items-center gap-1.5 bg-white/[0.03] p-1 rounded-xl border border-white/10 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
              <span className="text-[11px] text-[#9AA0B2] font-semibold pl-2 pr-1 hidden sm:inline-block">
                {language === "en" ? "Sort:" : "Trier :"}
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as ContactSortOption)}
                className="bg-transparent text-xs text-[#F5F6FA] py-1 px-2 border-none focus:outline-none cursor-pointer"
                title={language === "en" ? "Sort criterion" : "Critère de tri"}
              >
                <option value="relevance" className="bg-[#060812] text-[#F5F6FA]">{language === "en" ? "AI Relevance" : "Pertinence IA"}</option>
                <option value="name" className="bg-[#060812] text-[#F5F6FA]">{language === "en" ? "Name" : "Nom complet"}</option>
                <option value="company" className="bg-[#060812] text-[#F5F6FA]">{language === "en" ? "Company" : "Entreprise"}</option>
                <option value="job" className="bg-[#060812] text-[#F5F6FA]">{language === "en" ? "Job title" : "Intitulé de poste"}</option>
                <option value="recent" className="bg-[#060812] text-[#F5F6FA]">{language === "en" ? "Date added" : "Date d'ajout"}</option>
                <option value="status" className="bg-[#060812] text-[#F5F6FA]">{language === "en" ? "Networking status" : "Statut de contact"}</option>
              </select>

              {/* Direction button */}
              <button
                type="button"
                onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-[#F5F6FA] transition-colors border border-white/10 cursor-pointer"
                title={
                  sortOrder === "desc" 
                    ? (language === "en" ? "Order: Descending (click to switch)" : "Ordre : Décroissant (cliquez pour inverser)") 
                    : (language === "en" ? "Order: Ascending (click to switch)" : "Ordre : Croissant (cliquez pour inverser)")
                }
              >
                {sortOrder === "desc" ? (
                  <ArrowDown className="w-3.5 h-3.5 text-[#FF6685]" />
                ) : (
                  <ArrowUp className="w-3.5 h-3.5 text-[#F5F6FA]" />
                )}
              </button>
            </div>

            {/* Reset all filters button if any active */}
            {hasAnyFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-2 rounded-xl text-xs font-semibold text-[#9AA0B2] hover:text-[#FF6685] hover:bg-white/[0.04] transition-colors flex items-center gap-1 cursor-pointer"
                title={language === "en" ? "Reset all search criteria" : "Réinitialiser tous les filtres"}
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">{language === "en" ? "Reset" : "Effacer"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Major Category Pills + Quick Sort Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 border-t border-white/5">
          {/* Categories with Color Coded Liquid Glass Active States */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-nowrap">
            {[
              { 
                id: "all", 
                label: language === "en" ? `All (${totalCount})` : `Tous (${totalCount})`,
                activeColor: "bg-white/[0.10] text-[#F5F6FA] border-white/25 shadow-[0_0_12px_rgba(255,255,255,0.08)]"
              },
              { 
                id: "alumni", 
                label: `Alumni (${alumniCount})`,
                activeColor: "bg-[rgba(56,189,248,0.15)] text-[#38BDF8] border-[rgba(56,189,248,0.32)] shadow-[0_0_12px_rgba(56,189,248,0.15)]"
              },
              { 
                id: "recruiter", 
                label: language === "en" ? `Recruiters RH (${recruiterCount})` : `Recruteurs RH (${recruiterCount})`,
                activeColor: "bg-[rgba(18,183,106,0.15)] text-[#34D399] border-[rgba(18,183,106,0.32)] shadow-[0_0_12px_rgba(18,183,106,0.15)]"
              },
              { 
                id: "sector_pro", 
                label: language === "en" ? `Sector Pros (${sectorProCount})` : `Pro Secteur (${sectorProCount})`,
                activeColor: "bg-[rgba(216,26,69,0.15)] text-[#FF6685] border-[rgba(216,26,69,0.32)] shadow-[0_0_12px_rgba(216,26,69,0.15)]"
              },
              { 
                id: "student", 
                label: language === "en" ? `Students (${studentCount})` : `Étudiants (${studentCount})`,
                activeColor: "bg-[rgba(192,132,252,0.15)] text-[#C084FC] border-[rgba(192,132,252,0.32)] shadow-[0_0_12px_rgba(192,132,252,0.15)]"
              },
              { 
                id: "other_pro", 
                label: language === "en" ? "Other Pros" : "Autres Pro",
                activeColor: "bg-[rgba(247,144,9,0.15)] text-[#FBBF24] border-[rgba(247,144,9,0.32)] shadow-[0_0_12px_rgba(247,144,9,0.15)]"
              },
            ].map((item) => {
              const isActive = categoryFilter === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCategoryFilter(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer backdrop-blur-xl ${
                    isActive
                      ? `${item.activeColor} shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]`
                      : "bg-white/[0.03] hover:bg-white/[0.07] text-[#9AA0B2] hover:text-[#F5F6FA] border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Quick Sort Shortcuts */}
          <div className="flex items-center gap-1 shrink-0 overflow-x-auto scrollbar-none py-0.5">
            <span className="text-[10px] uppercase font-bold text-[#9AA0B2]/70 mr-1 hidden md:inline">
              {language === "en" ? "Quick sort:" : "Tri rapide :"}
            </span>
            <button
              type="button"
              onClick={() => handleQuickSort("relevance")}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1 border transition-all cursor-pointer backdrop-blur-xl ${
                sortBy === "relevance"
                  ? "bg-[rgba(216,26,69,0.16)] text-[#FF6685] border-[rgba(216,26,69,0.32)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]"
                  : "bg-white/[0.03] hover:bg-white/[0.07] text-[#9AA0B2] hover:text-[#F5F6FA] border-white/10"
              }`}
            >
              <Sparkles className="w-3 h-3 text-[#FF6685]" />
              <span>Pertinence</span>
              {sortBy === "relevance" && (
                <span className="text-[9px] font-bold">{sortOrder === "desc" ? "↓" : "↑"}</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleQuickSort("name")}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1 border transition-all cursor-pointer backdrop-blur-xl ${
                sortBy === "name"
                  ? "bg-white/[0.09] text-[#F5F6FA] border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"
                  : "bg-white/[0.03] hover:bg-white/[0.07] text-[#9AA0B2] hover:text-[#F5F6FA] border-white/10"
              }`}
            >
              <span>Nom</span>
              {sortBy === "name" ? (
                <span className="text-[9px] font-bold">{sortOrder === "asc" ? "A-Z" : "Z-A"}</span>
              ) : (
                <span className="text-[9px] text-[#9AA0B2]">A-Z</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleQuickSort("company")}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1 border transition-all cursor-pointer backdrop-blur-xl ${
                sortBy === "company"
                  ? "bg-white/[0.09] text-[#F5F6FA] border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"
                  : "bg-white/[0.03] hover:bg-white/[0.07] text-[#9AA0B2] hover:text-[#F5F6FA] border-white/10"
              }`}
            >
              <Building2 className="w-3 h-3" />
              <span>Entreprise</span>
              {sortBy === "company" && (
                <span className="text-[9px] font-bold">{sortOrder === "asc" ? "A-Z" : "Z-A"}</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleQuickSort("recent")}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1 border transition-all cursor-pointer backdrop-blur-xl ${
                sortBy === "recent"
                  ? "bg-white/[0.09] text-[#F5F6FA] border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"
                  : "bg-white/[0.03] hover:bg-white/[0.07] text-[#9AA0B2] hover:text-[#F5F6FA] border-white/10"
              }`}
            >
              <span>Récents</span>
              {sortBy === "recent" && (
                <span className="text-[9px] font-bold">{sortOrder === "desc" ? "↓" : "↑"}</span>
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Advanced Filters Drawer */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-white/10 space-y-3.5 bg-black/20 p-3.5 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#F5F6FA] uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#FF6685]" />
                {language === "en" ? "Refine candidate & contact search" : "Affiner la recherche de personnes"}
              </span>
              <button
                type="button"
                onClick={() => setShowAdvancedFilters(false)}
                className="text-[11px] text-[#9AA0B2] hover:text-[#F5F6FA] flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>{language === "en" ? "Close" : "Fermer"}</span>
              </button>
            </div>

            {/* Dropdown filters grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Function / Domain */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#9AA0B2] flex items-center gap-1">
                  <Briefcase className="w-3 h-3 text-[#9AA0B2]" />
                  <span>{language === "en" ? "Role & Function" : "Métier & Fonction"}</span>
                </label>
                <select
                  value={functionFilter}
                  onChange={(e) => setFunctionFilter(e.target.value)}
                  className="glass-input px-3 py-2 text-xs text-[#F5F6FA] bg-[#060812] cursor-pointer"
                >
                  {FUNCTION_FILTER_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.id} className="bg-[#060812] text-[#F5F6FA]">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Seniority / Level */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#9AA0B2] flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-[#9AA0B2]" />
                  <span>{language === "en" ? "Seniority Level" : "Niveau & Séniorité"}</span>
                </label>
                <select
                  value={seniorityFilter}
                  onChange={(e) => setSeniorityFilter(e.target.value)}
                  className="glass-input px-3 py-2 text-xs text-[#F5F6FA] bg-[#060812] cursor-pointer"
                >
                  {SENIORITY_FILTER_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.id} className="bg-[#060812] text-[#F5F6FA]">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Company */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#9AA0B2] flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-[#9AA0B2]" />
                  <span>{language === "en" ? "Company" : "Entreprise"}</span>
                </label>
                <select
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  className="glass-input px-3 py-2 text-xs text-[#F5F6FA] bg-[#060812] cursor-pointer"
                >
                  <option value="all" className="bg-[#060812] text-[#F5F6FA]">
                    {language === "en" ? "All companies" : "Toutes les entreprises"}
                  </option>
                  {companyOptions.map((co) => {
                    const coCount = contacts.filter(c => c.companyName.toLowerCase() === co.toLowerCase()).length;
                    return (
                      <option key={co} value={co} className="bg-[#060812] text-[#F5F6FA]">
                        {co} ({coCount})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 4. Networking Status */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#9AA0B2] flex items-center gap-1">
                  <Target className="w-3 h-3 text-[#9AA0B2]" />
                  <span>{language === "en" ? "Outreach Status" : "Statut relationnel"}</span>
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="glass-input px-3 py-2 text-xs text-[#F5F6FA] bg-[#060812] cursor-pointer"
                >
                  <option value="all" className="bg-[#060812] text-[#F5F6FA]">{language === "en" ? "All statuses" : "Tous les statuts"}</option>
                  <option value="to_contact" className="bg-[#060812] text-[#F5F6FA]">{language === "en" ? "To contact" : "À contacter"}</option>
                  <option value="contacted" className="bg-[#060812] text-[#F5F6FA]">{language === "en" ? "Message sent" : "Message envoyé"}</option>
                  <option value="exchanging" className="bg-[#060812] text-[#F5F6FA]">{language === "en" ? "In discussion" : "Échange en cours"}</option>
                  <option value="interview_done" className="bg-[#060812] text-[#F5F6FA]">{language === "en" ? "Interview held" : "Entretien réalisé"}</option>
                  <option value="not_interested" className="bg-[#060812] text-[#F5F6FA]">{language === "en" ? "Closed / No reply" : "Sans suite"}</option>
                </select>
              </div>
            </div>

            {/* Second row: Score Pills + Academic network + Toggle channels */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-white/5 items-center">
              {/* Score threshold */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[#9AA0B2] block">
                  {language === "en" ? "Minimum AI Relevance Score" : "Score de pertinence IA minimum"}
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {MIN_SCORE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMinScoreFilter(opt.value)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        minScoreFilter === opt.value
                          ? "bg-[rgba(216,26,69,0.2)] text-[#FF6685] border-[rgba(216,26,69,0.4)]"
                          : "bg-white/[0.03] hover:bg-white/[0.08] text-[#9AA0B2] border-white/5"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Academic network */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[#9AA0B2] flex items-center gap-1">
                  <GraduationCap className="w-3 h-3 text-[#9AA0B2]" />
                  <span>{language === "en" ? "Academic Network" : "Réseau Académique & Écoles"}</span>
                </label>
                <select
                  value={academicFilter}
                  onChange={(e) => setAcademicFilter(e.target.value)}
                  className="glass-input px-3 py-2 text-xs text-[#F5F6FA] bg-[#060812] cursor-pointer w-full"
                >
                  {ACADEMIC_FILTER_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.id} className="bg-[#060812] text-[#F5F6FA]">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Channels checkboxes */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[#9AA0B2] block">
                  {language === "en" ? "Required information" : "Données de contact disponibles"}
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setOnlyLinkedIn(prev => !prev)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer backdrop-blur-xl ${
                      onlyLinkedIn
                        ? "bg-white/[0.09] text-[#F5F6FA] border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"
                        : "bg-white/[0.03] text-[#9AA0B2] border-white/10 hover:bg-white/[0.07] hover:text-[#F5F6FA]"
                    }`}
                  >
                    <Linkedin className="w-3.5 h-3.5 text-[#9AA0B2]" />
                    <span>LinkedIn</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOnlyEmail(prev => !prev)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer backdrop-blur-xl ${
                      onlyEmail
                        ? "bg-white/[0.09] text-[#F5F6FA] border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"
                        : "bg-white/[0.03] text-[#9AA0B2] border-white/10 hover:bg-white/[0.07] hover:text-[#F5F6FA]"
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5 text-[#9AA0B2]" />
                    <span>Email</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOnlyOpportunityLinked(prev => !prev)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer backdrop-blur-xl ${
                      onlyOpportunityLinked
                        ? "bg-[rgba(216,26,69,0.16)] text-[#FF6685] border-[rgba(216,26,69,0.32)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"
                        : "bg-white/[0.03] text-[#9AA0B2] border-white/10 hover:bg-white/[0.07] hover:text-[#F5F6FA]"
                    }`}
                  >
                    <LinkIcon className="w-3.5 h-3.5 text-[#FF6685]" />
                    <span>Offre liée</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Filters Badges Row */}
        {hasAnyFilterActive && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-white/5 text-xs">
            <span className="text-[11px] font-semibold text-[#9AA0B2] uppercase mr-1">
              {language === "en" ? "Active filters:" : "Filtres actifs :"}
            </span>

            {localSearch && (
              <span className="px-2.5 py-1 rounded-xl bg-white/[0.05] border border-white/12 text-[#F5F6FA] flex items-center gap-1.5 text-[11px] backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                <span>Recherche: "{localSearch}"</span>
                <button onClick={() => setLocalSearch("")} className="text-[#9AA0B2] hover:text-[#FF6685] cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {categoryFilter !== "all" && (
              <span className="px-2.5 py-1 rounded-xl bg-[rgba(216,26,69,0.14)] border border-[rgba(216,26,69,0.28)] text-[#FF6685] flex items-center gap-1.5 text-[11px] backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.18)]">
                <span>Catégorie: {categoryFilter}</span>
                <button onClick={() => setCategoryFilter("all")} className="text-[#FF6685] hover:text-white cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {functionFilter !== "all" && (
              <span className="px-2.5 py-1 rounded-xl bg-white/[0.05] border border-white/12 text-[#F5F6FA] flex items-center gap-1.5 text-[11px] backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                <span>Fonction: {FUNCTION_FILTER_OPTIONS.find(o => o.id === functionFilter)?.label}</span>
                <button onClick={() => setFunctionFilter("all")} className="text-[#9AA0B2] hover:text-white cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {seniorityFilter !== "all" && (
              <span className="px-2.5 py-1 rounded-xl bg-white/[0.05] border border-white/12 text-[#F5F6FA] flex items-center gap-1.5 text-[11px] backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                <span>Niveau: {SENIORITY_FILTER_OPTIONS.find(o => o.id === seniorityFilter)?.label}</span>
                <button onClick={() => setSeniorityFilter("all")} className="text-[#9AA0B2] hover:text-white cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {companyFilter !== "all" && (
              <span className="px-2.5 py-1 rounded-xl bg-white/[0.05] border border-white/12 text-[#F5F6FA] flex items-center gap-1.5 text-[11px] backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                <span>Entreprise: {companyFilter}</span>
                <button onClick={() => setCompanyFilter("all")} className="text-[#9AA0B2] hover:text-[#FF6685] cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {statusFilter !== "all" && (
              <span className="px-2.5 py-1 rounded-xl bg-white/[0.05] border border-white/12 text-[#F5F6FA] flex items-center gap-1.5 text-[11px] backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                <span>Statut: {statusFilter}</span>
                <button onClick={() => setStatusFilter("all")} className="text-[#9AA0B2] hover:text-white cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {academicFilter !== "all" && (
              <span className="px-2.5 py-1 rounded-xl bg-white/[0.05] border border-white/12 text-[#F5F6FA] flex items-center gap-1.5 text-[11px] backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                <span>Académique: {ACADEMIC_FILTER_OPTIONS.find(o => o.id === academicFilter)?.label}</span>
                <button onClick={() => setAcademicFilter("all")} className="text-[#9AA0B2] hover:text-white cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {minScoreFilter > 0 && (
              <span className="px-2.5 py-1 rounded-xl bg-white/[0.05] border border-white/12 text-[#F5F6FA] flex items-center gap-1.5 text-[11px] backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                <span>Score ≥ {minScoreFilter}%</span>
                <button onClick={() => setMinScoreFilter(0)} className="text-[#9AA0B2] hover:text-white cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {onlyLinkedIn && (
              <span className="px-2.5 py-1 rounded-xl bg-white/[0.05] border border-white/12 text-[#F5F6FA] flex items-center gap-1.5 text-[11px] backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                <span>LinkedIn uniquement</span>
                <button onClick={() => setOnlyLinkedIn(false)} className="text-[#9AA0B2] hover:text-white cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {onlyEmail && (
              <span className="px-2.5 py-1 rounded-xl bg-white/[0.05] border border-white/12 text-[#F5F6FA] flex items-center gap-1.5 text-[11px] backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                <span>Email uniquement</span>
                <button onClick={() => setOnlyEmail(false)} className="text-[#9AA0B2] hover:text-white cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {onlyOpportunityLinked && (
              <span className="px-2.5 py-1 rounded-xl bg-[rgba(216,26,69,0.14)] border border-[rgba(216,26,69,0.28)] text-[#FF6685] flex items-center gap-1.5 text-[11px] backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.18)]">
                <span>Offre liée</span>
                <button onClick={() => setOnlyOpportunityLinked(false)} className="text-[#FF6685] hover:text-white cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] text-[#FF6685] hover:underline font-semibold ml-auto cursor-pointer"
            >
              {language === "en" ? "Clear all" : "Tout effacer"}
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. CONTACTS GRID                                                          */}
      {/* ========================================================================= */}
      {filteredContacts.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white/[0.02] border border-white/10 text-center space-y-3">
          <Users className="w-10 h-10 text-[#9AA0B2] mx-auto opacity-50" />
          <h3 className="text-base font-bold text-[#F5F6FA] font-display">{t.contacts.noContacts}</h3>
          <p className="text-xs text-[#9AA0B2] max-w-md mx-auto">
            {hasAnyFilterActive
              ? (language === "en" ? "No contacts match your current filters. Clear your filters to see more." : "Aucun contact ne correspond à vos filtres actuels. Réinitialisez vos critères de recherche.")
              : (language === "en" ? "Your contacts list is empty. Import from LinkedIn or add a contact manually." : "Votre carnet de contacts est actuellement vide. Importez vos relations LinkedIn ou ajoutez un contact manuellement.")}
          </p>
          {hasAnyFilterActive && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-[#FF6685] hover:underline font-semibold cursor-pointer"
            >
              {language === "en" ? "Reset filters" : "Réinitialiser les filtres"}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map(contact => (
            <GlassCard
              key={contact.id}
              onClick={() => setSelectedContact(contact)}
              className="relative overflow-hidden p-5 flex flex-col justify-between group transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_16px_36px_rgba(0,0,0,0.45),inset_0_1px_1px_rgba(255,255,255,0.22)]"
              hoverable
            >
              {/* Top specular reflection line - subtle rim highlight */}
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity" />

              <div className="space-y-3 relative z-10">
                {/* Top Badge Row: Color-Coded Category Badges + AI Relevance Score */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1 min-w-0">
                    {contact.categories && contact.categories.length > 0 ? (
                      <>
                        {contact.categories.slice(0, 2).map((cat, idx) => {
                          const style = getCategoryBadgeStyle(cat.category, cat.subcategory);
                          return (
                            <span 
                              key={idx} 
                              title={`${cat.reason || style.label} (Confiance : ${cat.confidence === 'high' ? 'Haute' : cat.confidence === 'medium' ? 'Moyenne' : 'Basse'})`}
                              className={`px-2.5 py-0.5 rounded-lg border text-[10px] font-semibold backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] flex items-center gap-1 ${style.bgColor} ${style.textColor} ${style.borderColor}`}
                            >
                              <span>{style.label}</span>
                            </span>
                          );
                        })}
                        {contact.categories.length > 2 && (
                          <span className="text-[10px] text-[#9AA0B2] bg-white/[0.04] px-1.5 py-0.5 rounded-lg border border-white/10 font-semibold backdrop-blur-sm">
                            +{contact.categories.length - 2}
                          </span>
                        )}
                      </>
                    ) : (
                      handleCategoryBadge(contact.category)
                    )}
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border backdrop-blur-md shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] ${
                    (contact.relevanceScore || 0) >= 80 
                      ? "bg-[rgba(216,26,69,0.14)] text-[#FF6685] border-[rgba(216,26,69,0.28)]" 
                      : (contact.relevanceScore || 0) >= 60 
                        ? "bg-[rgba(247,144,9,0.12)] text-[#FBBF24] border-[rgba(247,144,9,0.25)]" 
                        : "bg-white/[0.05] text-[#F5F6FA] border-white/12"
                  }`}>
                    {contact.relevanceScore}%
                  </span>
                </div>
                
                {/* Contact Identity: Exact requested hierarchy */}
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-[#F5F6FA] leading-snug font-display truncate group-hover:text-white transition-colors">
                    {contact.fullName}
                  </h3>
                  <p className="text-xs text-[#9AA0B2] line-clamp-1 mt-0.5">{contact.jobTitle}</p>
                  <p className="text-xs text-[#FF6685] font-semibold flex items-center gap-1.5 mt-0.5">
                    <Building2 className="w-3 h-3 text-[#FF6685] shrink-0" />
                    <span className="truncate">{contact.companyName}</span>
                  </p>
                </div>

                {/* Connection Points Highlights */}
                {contact.connectionPoints && contact.connectionPoints.length > 0 && (
                  <div className="pt-2.5 border-t border-white/5 space-y-1">
                    <span className="text-[10px] text-[#9AA0B2] uppercase font-semibold block">Points de connexion</span>
                    {contact.connectionPoints.slice(0, 2).map((pt, i) => (
                      <div key={i} className="text-[11px] text-[#9AA0B2] flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-[#9AA0B2]/80 group-hover:text-[#FF6685] transition-colors shrink-0" />
                        <span className="truncate">{pt}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer: Status or LinkedIn + View Action */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs relative z-10">
                <div className="flex items-center gap-1.5">
                  {contact.linkedInUrl && (
                    <span className="p-1 rounded-lg bg-white/[0.04] text-[#9AA0B2] group-hover:text-[#F5F6FA] border border-white/10 transition-colors" title="Profil LinkedIn disponible">
                      <Linkedin className="w-3.5 h-3.5" />
                    </span>
                  )}
                  {contact.contactUrl && (
                    <a
                      href={contact.contactUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="px-2 py-0.5 rounded-lg bg-white/[0.04] text-[#9AA0B2] group-hover:text-[#F5F6FA] border border-white/10 transition-colors flex items-center gap-1"
                      title={`Lien web de contact : ${contact.contactUrl}`}
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span className="truncate max-w-[85px] text-[11px]">Lien web</span>
                    </a>
                  )}
                  {contact.opportunityTitle && (
                    <span className="px-2 py-0.5 rounded-lg bg-[rgba(216,26,69,0.12)] border border-[rgba(216,26,69,0.25)] text-[#FF6685] flex items-center gap-1 text-[11px] backdrop-blur-sm" title={`Lié à : ${contact.opportunityTitle}`}>
                      <LinkIcon className="w-3 h-3" />
                      <span className="truncate max-w-[95px]">{language === "en" ? "Linked job" : "Offre liée"}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setContactToDelete(contact);
                    }}
                    className="p-1.5 rounded-xl text-[#9AA0B2] hover:text-[#F04438] hover:bg-white/[0.05] border border-transparent hover:border-white/10 transition-all cursor-pointer"
                    title={language === "en" ? "Delete this contact" : "Supprimer ce contact"}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <span className="px-3 py-1.5 rounded-xl bg-white/[0.05] group-hover:bg-white/[0.10] text-xs font-semibold text-[#F5F6FA] border border-white/10 group-hover:border-white/20 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.18)] flex items-center gap-1 transition-all cursor-pointer">
                    <span>{language === "en" ? "View" : "Consulter"}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#FF6685] group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ADD CONTACT MODAL                                                      */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={language === "en" ? "Add contact to network" : "Ajouter un contact au réseau"}
        size="md"
      >
        <form onSubmit={handleAddContact} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#9AA0B2] font-semibold">{language === "en" ? "Full name *" : "Nom complet *"}</label>
            <input
              type="text"
              required
              placeholder={language === "en" ? "e.g. Sarah Connor" : "ex: Sophie Martin"}
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#9AA0B2] font-semibold">{language === "en" ? "Company *" : "Entreprise *"}</label>
              <input
                type="text"
                required
                placeholder={language === "en" ? "e.g. BNP Paribas, Google..." : "ex: LCL, Crédit Agricole..."}
                value={formCompany}
                onChange={(e) => setFormCompany(e.target.value)}
                className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#9AA0B2] font-semibold">{language === "en" ? "Job title *" : "Poste *"}</label>
              <input
                type="text"
                required
                placeholder={language === "en" ? "e.g. Senior Wealth Advisor" : "ex: Conseillère Patrimoniale"}
                value={formJob}
                onChange={(e) => setFormJob(e.target.value)}
                className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#9AA0B2] font-semibold">{language === "en" ? "Category" : "Catégorie"}</label>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value as any)}
              className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA] bg-[#060812]"
            >
              <option value="alumni" className="bg-[#060812] text-[#F5F6FA]">{language === "en" ? "Alumni (Same school / university)" : "Alumni (Même formation / école)"}</option>
              <option value="recruiter" className="bg-[#060812] text-[#F5F6FA]">{language === "en" ? "Recruiter / HR" : "Recruteur / RH"}</option>
              <option value="sector_pro" className="bg-[#060812] text-[#F5F6FA]">{language === "en" ? "Target Sector Professional" : "Professionnel Secteur Cible"}</option>
              <option value="student" className="bg-[#060812] text-[#F5F6FA]">{language === "en" ? "Student" : "Étudiant"}</option>
              <option value="other_pro" className="bg-[#060812] text-[#F5F6FA]">{language === "en" ? "Other Sector Professional" : "Professionnel Autre Secteur"}</option>
              <option value="other" className="bg-[#060812] text-[#F5F6FA]">{language === "en" ? "Other" : "Autre"}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#9AA0B2] font-semibold">{language === "en" ? "Email (optional)" : "Email (optionnel)"}</label>
              <input
                type="email"
                placeholder={language === "en" ? "e.g. contact@company.com" : "ex: contact@entreprise.fr"}
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#9AA0B2] font-semibold">{language === "en" ? "Phone (optional)" : "Téléphone (optionnel)"}</label>
              <input
                type="tel"
                placeholder="ex: 06 12 34 56 78"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#9AA0B2] font-semibold">{language === "en" ? "LinkedIn profile URL (optional)" : "URL LinkedIn (optionnel)"}</label>
              <input
                type="url"
                placeholder="https://www.linkedin.com/in/..."
                value={formLinkedIn}
                onChange={(e) => setFormLinkedIn(e.target.value)}
                className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#9AA0B2] font-semibold">{language === "en" ? "Website / Portal link (optional)" : "Lien internet / Site web / Portail (optionnel)"}</label>
              <input
                type="url"
                placeholder="ex: https://entreprise.fr/candidature"
                value={formContactUrl}
                onChange={(e) => setFormContactUrl(e.target.value)}
                className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#9AA0B2] font-semibold">{language === "en" ? "Notes / Context notes" : "Notes / Informations de contexte"}</label>
            <textarea
              placeholder={language === "en" ? "e.g. Met at careers fair, great contact for industry insights..." : "ex: Rencontrée lors d'un forum carrières, très bon contact pour échange sur le secteur..."}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="w-full min-h-[75px] glass-input p-3 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
            <GlassButton type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              {language === "en" ? "Cancel" : "Annuler"}
            </GlassButton>
            <GlassButton type="submit" variant="primary">
              {t.contacts.addContact}
            </GlassButton>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* 6. IMPORT LINKEDIN MODAL (Preserved completely)                           */}
      {/* ========================================================================= */}
      <LinkedInImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        candidateProfile={profile}
        showToast={showToast}
      />

      {/* ========================================================================= */}
      {/* 6B. IMPORT TEXT MODAL                                                     */}
      {/* ========================================================================= */}
      <ImportContactsTextModal
        isOpen={isTextImportModalOpen}
        onClose={() => setIsTextImportModalOpen(false)}
        candidateProfile={profile}
        showToast={showToast}
      />

      {/* ========================================================================= */}
      {/* 7. DELETE CONFIRMATION MODAL                                              */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(contactToDelete)}
        onClose={() => setContactToDelete(null)}
        title={language === "en" ? "Delete contact" : "Supprimer le contact"}
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-200 leading-relaxed">
            {language === "en" ? (
              <>Are you sure you want to permanently delete the contact <strong className="text-white font-bold">{contactToDelete?.fullName}</strong> ({contactToDelete?.companyName})? This action is irreversible.</>
            ) : (
              <>Êtes-vous sûr de vouloir supprimer définitivement le contact <strong className="text-white font-bold">{contactToDelete?.fullName}</strong> ({contactToDelete?.companyName}) ? Cette action est irréversible.</>
            )}
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={() => setContactToDelete(null)}
            >
              {language === "en" ? "Cancel" : "Annuler"}
            </GlassButton>
            <GlassButton
              variant="danger"
              size="sm"
              onClick={() => {
                if (contactToDelete) {
                  handleDeleteContact(contactToDelete.id);
                  setContactToDelete(null);
                }
              }}
            >
              {language === "en" ? "Confirm deletion" : "Confirmer la suppression"}
            </GlassButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};
