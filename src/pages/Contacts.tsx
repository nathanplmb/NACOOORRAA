import React, { useState, useEffect, useMemo } from "react";
import { useLanguage } from "../context/LanguageContext";
import { dbStore } from "../dbStore";
import { Contact, ContactCategory, ContactNetworkingStatus, CandidateProfile } from "../types";
import { getCategoryBadgeStyle, isHumanResourcesRole, isBankingAndFinanceRole } from "../utils/contactMerger";
import { GlassCard, GlassButton, Modal } from "../components/Shared";
import { LinkedInImportModal } from "../components/LinkedInImportModal";
import { ImportContactsTextModal } from "../components/ImportContactsTextModal";
import { ConversationImportModal } from "../components/ConversationImportModal";
import { ContactDetailWorkspace } from "../components/ContactDetailWorkspace";
import { computeStrategicInterests } from "../utils/strategicInterests";
import { classifyContactFunction, STANDARD_CONTACT_FUNCTIONS } from "../utils/contactTaxonomy";
import { resolveCompany } from "../utils/companyResolver";
import { 
  Users, 
  Search, 
  Sparkles, 
  Plus, 
  MessageSquare, 
  ChevronRight, 
  Linkedin, 
  Mail, 
  Phone, 
  Building2, 
  Briefcase, 
  GraduationCap, 
  X, 
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  Link as LinkIcon, 
  UserCheck, 
  Trash2, 
  Check, 
  RotateCcw, 
  Target, 
  Sliders,
  LayoutList,
  LayoutGrid,
  CheckSquare,
  Square,
  Copy,
  Download,
  MoreHorizontal,
  Edit3,
  ExternalLink,
  TrendingUp,
  Award,
  Layers,
  Calendar
} from "lucide-react";

export type ContactSortOption = "relevance" | "name" | "company" | "job" | "recent" | "status";
export type ContactSortDirection = "asc" | "desc";
export type ViewMode = "list" | "grid";

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

export const Contacts: React.FC<ContactsProps> = ({ 
  showToast, 
  searchTerm, 
  initialSelectedContactId, 
  onClearInitialContact 
}) => {
  const { language, t } = useLanguage();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [profile, setProfile] = useState<CandidateProfile>(dbStore.getProfile());
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // View mode (list is standard SaaS CRM, grid is visual cards)
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Selection state for multi-action
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Search & Filters
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
  const [onlyPhone, setOnlyPhone] = useState<boolean>(false);
  const [onlyOpportunityLinked, setOnlyOpportunityLinked] = useState<boolean>(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // Sorting
  const [sortBy, setSortBy] = useState<ContactSortOption>("relevance");
  const [sortOrder, setSortOrder] = useState<ContactSortDirection>("desc");

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isTextImportModalOpen, setIsTextImportModalOpen] = useState(false);
  const [isConversationImportModalOpen, setIsConversationImportModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<Contact | null>(null);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);

  // Add Contact Form State
  const [formName, setFormName] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formJob, setFormJob] = useState("");
  const [formFunction, setFormFunction] = useState<string>("auto");
  const [formCategory, setFormCategory] = useState<ContactCategory>("other");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formLinkedIn, setFormLinkedIn] = useState("");
  const [formContactUrl, setFormContactUrl] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Menu action state
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  useEffect(() => {
    dbStore.reconcileContactCategories();
    const allContacts = dbStore.getContacts();
    setContacts(allContacts);
    setProfile(dbStore.getProfile());

    if (initialSelectedContactId) {
      const match = allContacts.find((c: Contact) => c.id === initialSelectedContactId);
      if (match) {
        setSelectedContact(match);
        if (onClearInitialContact) onClearInitialContact();
      }
    }

    const unsub = dbStore.subscribe(() => {
      const freshContacts = dbStore.getContacts();
      setContacts(freshContacts);
      setProfile(dbStore.getProfile());

      if (selectedContact) {
        const fresh = freshContacts.find(c => c.id === selectedContact.id);
        if (fresh) setSelectedContact(fresh);
      }
    });
    return unsub;
  }, [initialSelectedContactId, selectedContact?.id]);

  // Distinct company list
  const companyOptions = useMemo(() => {
    return Array.from(new Set(contacts.map(c => c.companyName).filter(Boolean))).sort();
  }, [contacts]);

  // Category filter matcher
  const contactMatchesCategoryFilter = (c: Contact, filter: string): boolean => {
    if (filter === "all") return true;

    const isHR = isHumanResourcesRole(c.jobTitle) || isHumanResourcesRole(c.normalizedJobTitle);
    const isFinanceOrBank = isBankingAndFinanceRole(c.jobTitle, c.companyName) || isBankingAndFinanceRole(c.normalizedJobTitle, c.companyName);

    if (filter === "recruiter") {
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

  // Fine-grained filter matchers
  const matchFunction = (c: Contact, filterId: string): boolean => {
    if (filterId === "all") return true;
    const opt = FUNCTION_FILTER_OPTIONS.find(o => o.id === filterId);
    if (!opt || !opt.keywords) return true;
    
    // 1. Direct match on normalized function field
    if (c.function && c.function !== "Inconnue") {
      const fn = c.function.toLowerCase();
      if (opt.keywords.some(kw => fn.includes(kw)) || opt.label.toLowerCase().includes(fn)) return true;
    }

    // 2. Multidimensional categories & professional profile
    if (c.categories && c.categories.some(cat => {
      const sub = (cat.subcategory || "").toLowerCase();
      const reason = (cat.reason || "").toLowerCase();
      return opt.keywords!.some(kw => sub.includes(kw) || reason.includes(kw));
    })) {
      return true;
    }
    if (c.professionalProfile?.currentFunction) {
      const fn = c.professionalProfile.currentFunction.toLowerCase();
      if (opt.keywords.some(kw => fn.includes(kw))) return true;
    }
    const title = `${c.normalizedJobTitle || ""} ${c.jobTitle || ""}`.toLowerCase();
    return opt.keywords.some(kw => title.includes(kw));
  };

  const matchSeniority = (c: Contact, filterId: string): boolean => {
    if (filterId === "all") return true;
    const opt = SENIORITY_FILTER_OPTIONS.find(o => o.id === filterId);
    if (!opt || !opt.keywords) return true;

    if (c.categories && c.categories.some(cat => {
      if (cat.category === "seniority" || cat.category === "status") {
        const sub = (cat.subcategory || "").toLowerCase();
        if (opt.keywords!.some(kw => sub.includes(kw))) return true;
      }
      return false;
    })) {
      return true;
    }
    if (c.professionalProfile?.level) {
      const lvl = c.professionalProfile.level.toLowerCase();
      if (opt.keywords.some(kw => lvl.includes(kw))) return true;
    }
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

  // Real statistics calculations
  const totalCount = contacts.length;
  const activeCount = useMemo(() => {
    return contacts.filter(c => (c.networkingStatus || "to_contact") !== "not_interested").length;
  }, [contacts]);
  const uniqueCompaniesCount = useMemo(() => {
    return new Set(contacts.map(c => c.companyName.trim().toLowerCase()).filter(Boolean)).size;
  }, [contacts]);
  const alumniCount = useMemo(() => {
    return contacts.filter(c => contactMatchesCategoryFilter(c, "alumni")).length;
  }, [contacts]);
  const recruiterCount = useMemo(() => {
    return contacts.filter(c => contactMatchesCategoryFilter(c, "recruiter")).length;
  }, [contacts]);
  const sectorProCount = useMemo(() => {
    return contacts.filter(c => contactMatchesCategoryFilter(c, "sector_pro")).length;
  }, [contacts]);
  const studentCount = useMemo(() => {
    return contacts.filter(c => contactMatchesCategoryFilter(c, "student")).length;
  }, [contacts]);
  const linkedOppCount = useMemo(() => {
    return contacts.filter(c => Boolean(c.opportunityId)).length;
  }, [contacts]);

  // Active filters counting
  const activeAdvancedFilterCount = [
    functionFilter !== "all",
    seniorityFilter !== "all",
    academicFilter !== "all",
    companyFilter !== "all",
    statusFilter !== "all",
    minScoreFilter > 0,
    onlyLinkedIn,
    onlyEmail,
    onlyPhone,
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
    setOnlyPhone(false);
    setOnlyOpportunityLinked(false);
  };

  // Quick Sort Helper
  const handleQuickSort = (key: ContactSortOption) => {
    if (sortBy === key) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      if (key === "name" || key === "company" || key === "job") {
        setSortOrder("asc");
      } else {
        setSortOrder("desc");
      }
    }
  };

  // Filter & Sort contacts
  const effectiveSearch = (localSearch || searchTerm).toLowerCase().trim();

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const matchesSearch = !effectiveSearch || (
        c.fullName.toLowerCase().includes(effectiveSearch) ||
        c.companyName.toLowerCase().includes(effectiveSearch) ||
        c.jobTitle.toLowerCase().includes(effectiveSearch) ||
        (c.email && c.email.toLowerCase().includes(effectiveSearch)) ||
        (c.phone && c.phone.toLowerCase().includes(effectiveSearch)) ||
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
      const matchesPhone = !onlyPhone || Boolean(c.phone);
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
        matchesPhone &&
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
  }, [
    contacts, 
    effectiveSearch, 
    categoryFilter, 
    companyFilter, 
    statusFilter, 
    functionFilter, 
    seniorityFilter, 
    academicFilter, 
    minScoreFilter, 
    onlyLinkedIn, 
    onlyEmail, 
    onlyPhone,
    onlyOpportunityLinked,
    sortBy, 
    sortOrder
  ]);

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = () => {
    if (selectedIds.length === filteredContacts.length && filteredContacts.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredContacts.map(c => c.id));
    }
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  // Status badge styling
  const getStatusBadge = (status?: ContactNetworkingStatus) => {
    switch (status) {
      case "contacted":
        return { 
          label: "Message envoyé", 
          dotColor: "bg-[#38BDF8]",
          textColor: "text-[#38BDF8]",
          bg: "bg-[rgba(56,189,248,0.08)] border-[rgba(56,189,248,0.22)]"
        };
      case "exchanging":
        return { 
          label: "Échange en cours", 
          dotColor: "bg-[#C084FC]",
          textColor: "text-[#C084FC]",
          bg: "bg-[rgba(192,132,252,0.08)] border-[rgba(192,132,252,0.22)]"
        };
      case "interview_done":
        return { 
          label: "Entretien réalisé", 
          dotColor: "bg-[#34D399]",
          textColor: "text-[#34D399]",
          bg: "bg-[rgba(18,183,106,0.08)] border-[rgba(18,183,106,0.22)]"
        };
      case "not_interested":
        return { 
          label: "Sans suite", 
          dotColor: "bg-[#9AA0B2]",
          textColor: "text-[#9AA0B2]",
          bg: "bg-white/[0.03] border-white/8"
        };
      case "to_contact":
      default:
        return { 
          label: "À contacter", 
          dotColor: "bg-[#FBBF24]",
          textColor: "text-[#FBBF24]",
          bg: "bg-[rgba(247,144,9,0.08)] border-[rgba(247,144,9,0.22)]"
        };
    }
  };

  // Initial generator for Avatar
  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length === 0) return "C";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Avatar color generator based on name hash
  const getAvatarGradient = (name: string) => {
    const gradients = [
      "from-rose-500/20 to-pink-600/20 text-[#FF6685] border-[#FF6685]/30",
      "from-emerald-500/20 to-teal-600/20 text-[#34D399] border-[#34D399]/30",
      "from-sky-500/20 to-blue-600/20 text-[#38BDF8] border-[#38BDF8]/30",
      "from-purple-500/20 to-indigo-600/20 text-[#C084FC] border-[#C084FC]/30",
      "from-amber-500/20 to-orange-600/20 text-[#FBBF24] border-[#FBBF24]/30"
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % gradients.length;
    return gradients[idx];
  };

  // Add Contact action
  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formCompany || !formJob) {
      showToast("Veuillez remplir les informations obligatoires", "error");
      return;
    }

    const nameParts = formName.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const { company: linkedCo } = resolveCompany({ companyName: formCompany });

    const funcClassification = formFunction && formFunction !== "auto"
      ? {
          function: formFunction,
          functionSource: "manual" as const,
          functionConfidence: "high" as const,
          functionClassifiedAt: new Date().toISOString()
        }
      : classifyContactFunction(formJob.trim(), linkedCo.name);

    const strategic = computeStrategicInterests({
      fullName: formName.trim(),
      jobTitle: formJob.trim(),
      companyName: linkedCo.name,
      category: formCategory,
      notes: formNotes
    }, profile);

    dbStore.addContact({
      fullName: formName.trim(),
      firstName,
      lastName,
      companyId: linkedCo.id,
      companyName: linkedCo.name,
      jobTitle: formJob.trim(),
      normalizedJobTitle: formJob.trim(),
      function: funcClassification.function,
      functionSource: funcClassification.functionSource,
      functionConfidence: funcClassification.functionConfidence,
      functionClassifiedAt: funcClassification.functionClassifiedAt,
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
      sector: formLocation.trim() || undefined,
      networkingStatus: "to_contact",
      history: [
        {
          id: "hist_" + Math.random().toString(36).substring(2, 9),
          type: "import",
          label: "Contact ajouté manuellement",
          timestamp: new Date().toISOString()
        }
      ]
    });

    showToast(`Contact "${formName}" ajouté avec succès`, "success");
    setFormName("");
    setFormCompany("");
    setFormJob("");
    setFormFunction("auto");
    setFormCategory("other");
    setFormEmail("");
    setFormPhone("");
    setFormLinkedIn("");
    setFormContactUrl("");
    setFormLocation("");
    setFormNotes("");
    setIsAddModalOpen(false);
  };

  // Edit Contact action
  const handleUpdateContact = (updated: Contact) => {
    dbStore.updateContact(updated);
    setContacts(dbStore.getContacts());
    if (selectedContact?.id === updated.id) {
      setSelectedContact(updated);
    }
    setContactToEdit(null);
    showToast("Contact mis à jour", "success");
  };

  // Delete Contact action
  const handleDeleteContact = (id: string) => {
    dbStore.deleteContact(id);
    setSelectedIds(prev => prev.filter(item => item !== id));
    if (selectedContact?.id === id) {
      setSelectedContact(null);
    }
    setContactToDelete(null);
    showToast("Contact supprimé", "info");
  };

  // Batch Status Update
  const handleBatchStatusChange = (newStatus: ContactNetworkingStatus) => {
    if (selectedIds.length === 0) return;
    const all = dbStore.getContacts();
    selectedIds.forEach(id => {
      const c = all.find(item => item.id === id);
      if (c) {
        dbStore.updateContact({
          ...c,
          networkingStatus: newStatus,
          history: [
            {
              id: "hist_" + Math.random().toString(36).substring(2, 9),
              type: "category_changed",
              label: `Statut mis à jour par action groupée : ${getStatusBadge(newStatus).label}`,
              timestamp: new Date().toISOString()
            },
            ...(c.history || [])
          ]
        });
      }
    });
    setContacts(dbStore.getContacts());
    showToast(`${selectedIds.length} contact(s) mis à jour`, "success");
    setSelectedIds([]);
  };

  // Batch Delete
  const handleConfirmBatchDelete = () => {
    if (selectedIds.length === 0) return;
    selectedIds.forEach(id => {
      dbStore.deleteContact(id);
    });
    setContacts(dbStore.getContacts());
    showToast(`${selectedIds.length} contact(s) supprimé(s)`, "info");
    setSelectedIds([]);
    setIsBatchDeleteModalOpen(false);
  };

  // Batch Copy Emails
  const handleBatchCopyEmails = () => {
    const selectedContacts = contacts.filter(c => selectedIds.includes(c.id));
    const emails = selectedContacts.map(c => c.email).filter(Boolean);
    if (emails.length === 0) {
      showToast("Aucun email disponible parmi les contacts sélectionnés", "error");
      return;
    }
    navigator.clipboard.writeText(emails.join("; "));
    showToast(`${emails.length} adresse(s) email copiée(s) dans le presse-papier`, "success");
  };

  // Batch Export CSV
  const handleBatchExportCsv = () => {
    const targetContacts = selectedIds.length > 0 
      ? contacts.filter(c => selectedIds.includes(c.id))
      : filteredContacts;

    if (targetContacts.length === 0) {
      showToast("Aucun contact à exporter", "error");
      return;
    }

    const headers = ["Nom Complet", "Prénom", "Nom", "Poste", "Entreprise", "Email", "Téléphone", "LinkedIn", "Catégorie", "Statut", "Score Pertinence", "Date d'ajout"];
    const rows = targetContacts.map(c => [
      `"${c.fullName.replace(/"/g, '""')}"`,
      `"${(c.firstName || "").replace(/"/g, '""')}"`,
      `"${(c.lastName || "").replace(/"/g, '""')}"`,
      `"${(c.jobTitle || "").replace(/"/g, '""')}"`,
      `"${(c.companyName || "").replace(/"/g, '""')}"`,
      `"${(c.email || "").replace(/"/g, '""')}"`,
      `"${(c.phone || "").replace(/"/g, '""')}"`,
      `"${(c.linkedInUrl || "").replace(/"/g, '""')}"`,
      `"${(c.category || "").replace(/"/g, '""')}"`,
      `"${(c.networkingStatus || "to_contact").replace(/"/g, '""')}"`,
      c.relevanceScore || 0,
      `"${new Date(c.createdAt).toLocaleDateString("fr-FR")}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `contacts_nacora_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`${targetContacts.length} contact(s) exporté(s) au format CSV`, "success");
  };

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = () => setOpenActionMenuId(null);
    if (openActionMenuId) {
      window.addEventListener("click", handleOutsideClick);
    }
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [openActionMenuId]);

  // If a contact is selected, display the full-width workspace
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

  const isAllVisibleSelected = filteredContacts.length > 0 && selectedIds.length === filteredContacts.length;
  const isIndeterminateSelection = selectedIds.length > 0 && selectedIds.length < filteredContacts.length;

  return (
    <div className="relative z-10 w-full space-y-6 pb-24">
      
      {/* ========================================================================= */}
      {/* 1. HEADER                                                                 */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F5F6FA] tracking-tight font-display">
              {t.contacts.title}
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/[0.04] text-[#9AA0B2] border border-white/10 font-mono tabular-nums">
              {totalCount}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#9AA0B2] mt-0.5">
            {language === "en" 
              ? "Professional directory, recruiters, alumni and industry decision makers." 
              : "Répertoire intelligent de vos relations professionnelles, recruteurs, alumni et décideurs."}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <GlassButton 
            variant="ghost" 
            size="sm"
            onClick={() => setIsConversationImportModalOpen(true)}
            icon={<MessageSquare className="w-3.5 h-3.5 text-[#C084FC]" />}
          >
            {language === "en" ? "Import discussions" : "Importer discussions"}
          </GlassButton>
          
          <GlassButton 
            variant="ghost" 
            size="sm"
            onClick={() => setIsTextImportModalOpen(true)}
            icon={<Sparkles className="w-3.5 h-3.5 text-[#FF6685]" />}
          >
            {language === "en" ? "Text import" : "Importer texte"}
          </GlassButton>
          
          <button 
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="h-8 px-3 rounded-xl bg-[#0A66C2]/15 hover:bg-[#0A66C2]/25 text-[#38BDF8] font-semibold text-xs transition-all flex items-center gap-1.5 border border-[#0A66C2]/30 shadow-[0_2px_8px_rgba(10,102,194,0.15)] cursor-pointer shrink-0"
            title="Importer vos relations LinkedIn (.csv)"
          >
            <Linkedin className="w-3.5 h-3.5 fill-current shrink-0" />
            <span>LinkedIn (.csv)</span>
          </button>

          <GlassButton 
            variant="primary" 
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            icon={<Plus className="w-3.5 h-3.5 text-white" />}
          >
            {language === "en" ? "Add contact" : "Ajouter un contact"}
          </GlassButton>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SOBER STATS CARDS (Real Data Only)                                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total contacts */}
        <div className="relative overflow-hidden p-4 rounded-2xl bg-white/[0.025] backdrop-blur-xl border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.25)] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-[#9AA0B2] uppercase tracking-wider">Total Contacts</span>
            <Users className="w-3.5 h-3.5 text-[#9AA0B2]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#F5F6FA] font-mono tabular-nums">{totalCount}</span>
            <span className="text-[11px] text-[#9AA0B2]">enregistrés</span>
          </div>
        </div>

        {/* Contacts actifs */}
        <div className="relative overflow-hidden p-4 rounded-2xl bg-white/[0.025] backdrop-blur-xl border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.25)] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-[#9AA0B2] uppercase tracking-wider">Contacts Actifs</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#34D399]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#34D399] font-mono tabular-nums">{activeCount}</span>
            <span className="text-[11px] text-[#9AA0B2]">en cours</span>
          </div>
        </div>

        {/* Entreprises */}
        <div className="relative overflow-hidden p-4 rounded-2xl bg-white/[0.025] backdrop-blur-xl border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.25)] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-[#9AA0B2] uppercase tracking-wider">Entreprises</span>
            <Building2 className="w-3.5 h-3.5 text-[#38BDF8]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#38BDF8] font-mono tabular-nums">{uniqueCompaniesCount}</span>
            <span className="text-[11px] text-[#9AA0B2]">représentées</span>
          </div>
        </div>

        {/* Réseau Alumni & RH */}
        <div className="relative overflow-hidden p-4 rounded-2xl bg-white/[0.025] backdrop-blur-xl border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.25)] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-[#9AA0B2] uppercase tracking-wider">Alumni & RH</span>
            <GraduationCap className="w-3.5 h-3.5 text-[#FF6685]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#FF6685] font-mono tabular-nums">{alumniCount + recruiterCount}</span>
            <span className="text-[11px] text-[#9AA0B2]">stratégiques</span>
          </div>
        </div>

        {/* Liés aux offres */}
        <div className="relative overflow-hidden p-4 rounded-2xl bg-white/[0.025] backdrop-blur-xl border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.25)] flex flex-col justify-between col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-[#9AA0B2] uppercase tracking-wider">Liés aux Offres</span>
            <LinkIcon className="w-3.5 h-3.5 text-[#C084FC]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#C084FC] font-mono tabular-nums">{linkedOppCount}</span>
            <span className="text-[11px] text-[#9AA0B2]">opportunités</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SEARCH, QUICK TABS & FILTERS BAR                                       */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 space-y-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.28)]">
        
        {/* Top search & controls row */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          
          {/* Main search bar */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#9AA0B2] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher un contact, une entreprise, un poste..."
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
                  title="Effacer la recherche"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <span className="text-[11px] text-[#9AA0B2] font-mono tabular-nums px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/10">
                {filteredContacts.length} / {totalCount}
              </span>
            </div>
          </div>

          {/* Right Action Controls: View Switch + Filters Drawer Toggle + Sort */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0 justify-between lg:justify-end">
            
            {/* View Mode Switcher */}
            <div className="flex items-center p-0.5 rounded-xl bg-white/[0.04] border border-white/10">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === "list" 
                    ? "bg-white/[0.12] text-[#F5F6FA] shadow-sm" 
                    : "text-[#9AA0B2] hover:text-[#F5F6FA]"
                }`}
                title="Vue Liste CRM"
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === "grid" 
                    ? "bg-white/[0.12] text-[#F5F6FA] shadow-sm" 
                    : "text-[#9AA0B2] hover:text-[#F5F6FA]"
                }`}
                title="Vue Cartes"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* Advanced Filters Button */}
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(prev => !prev)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border cursor-pointer ${
                showAdvancedFilters || activeAdvancedFilterCount > 0
                  ? "bg-[rgba(216,26,69,0.15)] text-[#FF6685] border-[rgba(216,26,69,0.30)]"
                  : "bg-white/[0.04] hover:bg-white/[0.08] text-[#F5F6FA] border-white/10"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filtres</span>
              {activeAdvancedFilterCount > 0 && (
                <span className="bg-[#D81A45] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono">
                  {activeAdvancedFilterCount}
                </span>
              )}
            </button>

            {/* Sort Selector with Direction Toggle */}
            <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/10">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as ContactSortOption)}
                className="bg-transparent text-xs text-[#F5F6FA] py-1 px-2 border-none focus:outline-none cursor-pointer"
                title="Critère de tri"
              >
                <option value="relevance" className="bg-[#0B0F19] text-[#F5F6FA]">Pertinence IA</option>
                <option value="name" className="bg-[#0B0F19] text-[#F5F6FA]">Nom complet</option>
                <option value="company" className="bg-[#0B0F19] text-[#F5F6FA]">Entreprise</option>
                <option value="job" className="bg-[#0B0F19] text-[#F5F6FA]">Poste</option>
                <option value="recent" className="bg-[#0B0F19] text-[#F5F6FA]">Date d'ajout</option>
                <option value="status" className="bg-[#0B0F19] text-[#F5F6FA]">Statut relationnel</option>
              </select>

              <button
                type="button"
                onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#F5F6FA] transition-colors border border-white/5 cursor-pointer"
                title={sortOrder === "desc" ? "Ordre Décroissant" : "Ordre Croissant"}
              >
                {sortOrder === "desc" ? (
                  <ArrowDown className="w-3.5 h-3.5 text-[#FF6685]" />
                ) : (
                  <ArrowUp className="w-3.5 h-3.5 text-[#F5F6FA]" />
                )}
              </button>
            </div>

            {/* Reset Button */}
            {hasAnyFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-2 rounded-xl text-xs font-semibold text-[#9AA0B2] hover:text-[#FF6685] hover:bg-white/[0.04] transition-colors flex items-center gap-1 cursor-pointer"
                title="Réinitialiser tous les filtres"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">Effacer</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Segmented Controls (Buttons, interactive) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-nowrap pt-1 border-t border-white/5">
          {[
            { id: "all", label: `Tous (${totalCount})` },
            { id: "alumni", label: `Alumni (${alumniCount})` },
            { id: "recruiter", label: `Recruteurs RH (${recruiterCount})` },
            { id: "sector_pro", label: `Pro Secteur (${sectorProCount})` },
            { id: "student", label: `Étudiants (${studentCount})` },
            { id: "other_pro", label: "Autres Pro" }
          ].map((item) => {
            const isActive = categoryFilter === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCategoryFilter(item.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border cursor-pointer ${
                  isActive
                    ? "bg-white/[0.12] text-[#F5F6FA] border-white/20 shadow-sm"
                    : "bg-white/[0.02] hover:bg-white/[0.06] text-[#9AA0B2] hover:text-[#F5F6FA] border-white/5"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Collapsible Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-white/10 space-y-3 bg-black/20 p-3.5 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#F5F6FA] uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#FF6685]" />
                Filtres Avancés
              </span>
              <button
                type="button"
                onClick={() => setShowAdvancedFilters(false)}
                className="text-[11px] text-[#9AA0B2] hover:text-[#F5F6FA] flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Fermer</span>
              </button>
            </div>

            {/* Filter grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Entreprise */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#9AA0B2]">Entreprise</label>
                <select
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  className="glass-input px-3 py-2 text-xs text-[#F5F6FA] bg-[#0B0F19] cursor-pointer"
                >
                  <option value="all">Toutes les entreprises ({companyOptions.length})</option>
                  {companyOptions.map((co) => {
                    const coCount = contacts.filter(c => c.companyName.toLowerCase() === co.toLowerCase()).length;
                    return (
                      <option key={co} value={co} className="bg-[#0B0F19] text-[#F5F6FA]">
                        {co} ({coCount})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 2. Métier & Fonction */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#9AA0B2]">Métier & Fonction</label>
                <select
                  value={functionFilter}
                  onChange={(e) => setFunctionFilter(e.target.value)}
                  className="glass-input px-3 py-2 text-xs text-[#F5F6FA] bg-[#0B0F19] cursor-pointer"
                >
                  {FUNCTION_FILTER_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.id} className="bg-[#0B0F19] text-[#F5F6FA]">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Séniorité */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#9AA0B2]">Niveau & Séniorité</label>
                <select
                  value={seniorityFilter}
                  onChange={(e) => setSeniorityFilter(e.target.value)}
                  className="glass-input px-3 py-2 text-xs text-[#F5F6FA] bg-[#0B0F19] cursor-pointer"
                >
                  {SENIORITY_FILTER_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.id} className="bg-[#0B0F19] text-[#F5F6FA]">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Statut Relationnel */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#9AA0B2]">Statut de démarche</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="glass-input px-3 py-2 text-xs text-[#F5F6FA] bg-[#0B0F19] cursor-pointer"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="to_contact">À contacter</option>
                  <option value="contacted">Message envoyé</option>
                  <option value="exchanging">Échange en cours</option>
                  <option value="interview_done">Entretien réalisé</option>
                  <option value="not_interested">Sans suite</option>
                </select>
              </div>
            </div>

            {/* Second row: Academic & Channels */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-white/5 items-center">
              {/* Score threshold */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[#9AA0B2] block">Score IA minimum</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {MIN_SCORE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMinScoreFilter(opt.value)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
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
                <label className="text-[11px] font-semibold text-[#9AA0B2] block">Réseau Académique</label>
                <select
                  value={academicFilter}
                  onChange={(e) => setAcademicFilter(e.target.value)}
                  className="glass-input px-3 py-2 text-xs text-[#F5F6FA] bg-[#0B0F19] cursor-pointer w-full"
                >
                  {ACADEMIC_FILTER_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.id} className="bg-[#0B0F19] text-[#F5F6FA]">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Channels checkboxes */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[#9AA0B2] block">Coordonnées disponibles</label>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setOnlyEmail(prev => !prev)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                      onlyEmail
                        ? "bg-white/[0.12] text-[#F5F6FA] border-white/25"
                        : "bg-white/[0.03] text-[#9AA0B2] border-white/5 hover:bg-white/[0.06]"
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOnlyPhone(prev => !prev)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                      onlyPhone
                        ? "bg-white/[0.12] text-[#F5F6FA] border-white/25"
                        : "bg-white/[0.03] text-[#9AA0B2] border-white/5 hover:bg-white/[0.06]"
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Téléphone</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOnlyLinkedIn(prev => !prev)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                      onlyLinkedIn
                        ? "bg-white/[0.12] text-[#F5F6FA] border-white/25"
                        : "bg-white/[0.03] text-[#9AA0B2] border-white/5 hover:bg-white/[0.06]"
                    }`}
                  >
                    <Linkedin className="w-3.5 h-3.5" />
                    <span>LinkedIn</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOnlyOpportunityLinked(prev => !prev)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                      onlyOpportunityLinked
                        ? "bg-[rgba(216,26,69,0.2)] text-[#FF6685] border-[rgba(216,26,69,0.35)]"
                        : "bg-white/[0.03] text-[#9AA0B2] border-white/5 hover:bg-white/[0.06]"
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

        {/* Active Filters Summary */}
        {hasAnyFilterActive && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-white/5 text-xs">
            <span className="text-[11px] font-semibold text-[#9AA0B2] uppercase mr-1">Filtres actifs :</span>
            
            {localSearch && (
              <span className="px-2.5 py-1 rounded-xl bg-white/[0.05] border border-white/10 text-[#F5F6FA] flex items-center gap-1.5 text-[11px]">
                <span>Recherche: "{localSearch}"</span>
                <button onClick={() => setLocalSearch("")} className="text-[#9AA0B2] hover:text-[#FF6685] cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {categoryFilter !== "all" && (
              <span className="px-2.5 py-1 rounded-xl bg-[rgba(216,26,69,0.12)] border border-[rgba(216,26,69,0.25)] text-[#FF6685] flex items-center gap-1.5 text-[11px]">
                <span>Catégorie: {categoryFilter}</span>
                <button onClick={() => setCategoryFilter("all")} className="text-[#FF6685] hover:text-white cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {companyFilter !== "all" && (
              <span className="px-2.5 py-1 rounded-xl bg-white/[0.05] border border-white/10 text-[#F5F6FA] flex items-center gap-1.5 text-[11px]">
                <span>Entreprise: {companyFilter}</span>
                <button onClick={() => setCompanyFilter("all")} className="text-[#9AA0B2] hover:text-white cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {functionFilter !== "all" && (
              <span className="px-2.5 py-1 rounded-xl bg-white/[0.05] border border-white/10 text-[#F5F6FA] flex items-center gap-1.5 text-[11px]">
                <span>Fonction: {FUNCTION_FILTER_OPTIONS.find(o => o.id === functionFilter)?.label}</span>
                <button onClick={() => setFunctionFilter("all")} className="text-[#9AA0B2] hover:text-white cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {statusFilter !== "all" && (
              <span className="px-2.5 py-1 rounded-xl bg-white/[0.05] border border-white/10 text-[#F5F6FA] flex items-center gap-1.5 text-[11px]">
                <span>Statut: {getStatusBadge(statusFilter as ContactNetworkingStatus).label}</span>
                <button onClick={() => setStatusFilter("all")} className="text-[#9AA0B2] hover:text-white cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {minScoreFilter > 0 && (
              <span className="px-2.5 py-1 rounded-xl bg-white/[0.05] border border-white/10 text-[#F5F6FA] flex items-center gap-1.5 text-[11px]">
                <span>Score ≥ {minScoreFilter}%</span>
                <button onClick={() => setMinScoreFilter(0)} className="text-[#9AA0B2] hover:text-white cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {onlyEmail && (
              <span className="px-2.5 py-1 rounded-xl bg-white/[0.05] border border-white/10 text-[#F5F6FA] flex items-center gap-1.5 text-[11px]">
                <span>Email uniquement</span>
                <button onClick={() => setOnlyEmail(false)} className="text-[#9AA0B2] hover:text-white cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {onlyPhone && (
              <span className="px-2.5 py-1 rounded-xl bg-white/[0.05] border border-white/10 text-[#F5F6FA] flex items-center gap-1.5 text-[11px]">
                <span>Téléphone uniquement</span>
                <button onClick={() => setOnlyPhone(false)} className="text-[#9AA0B2] hover:text-white cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {onlyLinkedIn && (
              <span className="px-2.5 py-1 rounded-xl bg-white/[0.05] border border-white/10 text-[#F5F6FA] flex items-center gap-1.5 text-[11px]">
                <span>LinkedIn uniquement</span>
                <button onClick={() => setOnlyLinkedIn(false)} className="text-[#9AA0B2] hover:text-white cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] text-[#FF6685] hover:underline font-semibold ml-auto cursor-pointer"
            >
              Tout effacer
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. CONTACTS LIST / GRID PRESENTATION                                      */}
      {/* ========================================================================= */}
      {filteredContacts.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white/[0.02] border border-white/10 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto text-[#9AA0B2]">
            <Users className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#F5F6FA] font-display">
              {hasAnyFilterActive ? "Aucun contact ne correspond à votre recherche" : "Vous n'avez encore aucun contact"}
            </h3>
            <p className="text-xs text-[#9AA0B2] max-w-md mx-auto">
              {hasAnyFilterActive
                ? "Essayez de modifier vos critères de recherche ou réinitialisez les filtres."
                : "Commencez à bâtir votre carnet de relations professionnelles en ajoutant un contact ou en important votre réseau LinkedIn."}
            </p>
          </div>
          
          <div className="flex items-center justify-center gap-2 pt-2">
            {hasAnyFilterActive ? (
              <GlassButton variant="secondary" size="sm" onClick={handleResetFilters}>
                Réinitialiser les filtres
              </GlassButton>
            ) : (
              <>
                <GlassButton variant="primary" size="md" onClick={() => setIsAddModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
                  Ajouter un contact
                </GlassButton>
                <GlassButton variant="secondary" size="md" onClick={() => setIsImportModalOpen(true)} icon={<Linkedin className="w-4 h-4 text-[#38BDF8]" />}>
                  Importer LinkedIn
                </GlassButton>
              </>
            )}
          </div>
        </div>
      ) : viewMode === "list" ? (
        /* ========================================================================= */
        /* 4A. REFINED HIGH-DENSITY LIST VIEW (Modern SaaS CRM)                      */
        /* ========================================================================= */
        <div className="rounded-2xl bg-white/[0.025] border border-white/10 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.28)]">
          {/* List Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02] text-xs font-semibold text-[#9AA0B2]">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSelectAllVisible}
                className="text-[#9AA0B2] hover:text-[#F5F6FA] cursor-pointer"
                title={isAllVisibleSelected ? "Tout désélectionner" : "Tout sélectionner"}
              >
                {isAllVisibleSelected ? (
                  <CheckSquare className="w-4 h-4 text-[#FF6685]" />
                ) : isIndeterminateSelection ? (
                  <div className="w-4 h-4 rounded border border-[#FF6685] bg-[rgba(216,26,69,0.2)] flex items-center justify-center">
                    <div className="w-2 h-0.5 bg-[#FF6685]" />
                  </div>
                ) : (
                  <Square className="w-4 h-4" />
                )}
              </button>
              <span>Contact & Entreprise</span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <span className="w-36">Coordonnées</span>
              <span className="w-28 text-center">Score & Catégorie</span>
              <span className="w-28 text-right">Statut</span>
              <span className="w-16 text-right">Actions</span>
            </div>
          </div>

          {/* List Rows */}
          <div className="divide-y divide-white/5">
            {filteredContacts.map(contact => {
              const isSelected = selectedIds.includes(contact.id);
              const statusCfg = getStatusBadge(contact.networkingStatus);
              const initials = getInitials(contact.fullName);
              const avatarStyle = getAvatarGradient(contact.fullName);

              return (
                <div
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`flex flex-col md:flex-row md:items-center justify-between p-3.5 sm:px-4 sm:py-3 transition-colors cursor-pointer group hover:bg-white/[0.04] ${
                    isSelected ? "bg-[rgba(216,26,69,0.06)]" : ""
                  }`}
                >
                  {/* Left Identity: Checkbox, Avatar, Name, Job, Company */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Checkbox */}
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSelect(contact.id);
                      }}
                      className="shrink-0 p-0.5 text-[#9AA0B2] hover:text-[#F5F6FA] cursor-pointer"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#FF6685]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </div>

                    {/* Avatar with Initials */}
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarStyle} border flex items-center justify-center font-bold text-xs shrink-0 select-none shadow-sm`}>
                      {initials}
                    </div>

                    {/* Text Hierarchy: Name / Role · Company */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#F5F6FA] group-hover:text-white transition-colors truncate">
                          {contact.fullName}
                        </span>
                        {contact.opportunityTitle && (
                          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-[#FF6685] bg-[rgba(216,26,69,0.1)] px-1.5 py-0.2 rounded border border-[rgba(216,26,69,0.2)]">
                            <LinkIcon className="w-2.5 h-2.5" />
                            <span className="truncate max-w-[100px]">Offre liée</span>
                          </span>
                        )}
                      </div>

                      {/* Clean unboxed subtitle with · separator */}
                      <div className="flex items-center gap-1.5 text-xs text-[#9AA0B2] mt-0.5 truncate">
                        <span className="truncate">{contact.jobTitle}</span>
                        {contact.function && contact.function !== "Inconnue" && (
                          <>
                            <span aria-hidden="true" className="text-white/20">·</span>
                            <span className="px-1.5 py-0.2 rounded bg-[rgba(192,132,252,0.12)] border border-[rgba(192,132,252,0.25)] text-[#C084FC] text-[10px] font-semibold uppercase tracking-wider">
                              {contact.function}
                            </span>
                          </>
                        )}
                        <span aria-hidden="true" className="text-white/20">·</span>
                        <span className="text-[#FF6685] font-medium truncate flex items-center gap-1">
                          <Building2 className="w-3 h-3 shrink-0 inline" />
                          {contact.companyName}
                        </span>
                        {contact.sector && (
                          <>
                            <span aria-hidden="true" className="text-white/20 hidden lg:inline">·</span>
                            <span className="text-[#9AA0B2] hidden lg:inline truncate">{contact.sector}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle / Right Meta Details */}
                  <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-6 mt-3 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/5 text-xs shrink-0">
                    
                    {/* Coordonnées / Channels */}
                    <div className="w-auto md:w-36 flex items-center gap-2 text-[#9AA0B2]">
                      {contact.email ? (
                        <a
                          href={`mailto:${contact.email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded-lg hover:bg-white/10 text-[#9AA0B2] hover:text-[#F5F6FA] transition-colors"
                          title={`Email : ${contact.email}`}
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                      ) : null}

                      {contact.phone ? (
                        <a
                          href={`tel:${contact.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded-lg hover:bg-white/10 text-[#9AA0B2] hover:text-[#F5F6FA] transition-colors"
                          title={`Téléphone : ${contact.phone}`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      ) : null}

                      {contact.linkedInUrl ? (
                        <a
                          href={contact.linkedInUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded-lg hover:bg-[#0A66C2]/20 text-[#38BDF8] transition-colors"
                          title="Profil LinkedIn"
                        >
                          <Linkedin className="w-3.5 h-3.5" />
                        </a>
                      ) : null}

                      {contact.contactUrl ? (
                        <a
                          href={contact.contactUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded-lg hover:bg-white/10 text-[#9AA0B2] hover:text-[#F5F6FA] transition-colors"
                          title={`Lien portail : ${contact.contactUrl}`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : null}

                      {!contact.email && !contact.phone && !contact.linkedInUrl && !contact.contactUrl && (
                        <span className="text-[11px] text-[#9AA0B2]/50 italic">Aucun canal</span>
                      )}
                    </div>

                    {/* Score IA & Primary Category */}
                    <div className="w-auto md:w-28 flex flex-col items-center justify-center">
                      <span className="font-mono font-bold text-xs text-[#F5F6FA] tabular-nums">
                        {contact.relevanceScore || 50}%
                      </span>
                      <span className="text-[10px] text-[#9AA0B2] truncate max-w-[90px]">
                        {contact.category === "recruiter" ? "Recruteur" : 
                         contact.category === "alumni" ? "Alumni" : 
                         contact.category === "sector_pro" ? "Pro Secteur" : 
                         contact.category === "student" ? "Étudiant" : "Autre"}
                      </span>
                    </div>

                    {/* Networking Status */}
                    <div className="w-auto md:w-28 text-right">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${statusCfg.bg} ${statusCfg.textColor}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotColor}`} />
                        <span className="truncate">{statusCfg.label}</span>
                      </span>
                    </div>

                    {/* Row Context Menu / Actions */}
                    <div className="w-auto md:w-16 flex items-center justify-end gap-1 relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setContactToEdit(contact);
                        }}
                        className="p-1.5 rounded-lg text-[#9AA0B2] hover:text-[#F5F6FA] hover:bg-white/10 transition-colors"
                        title="Modifier"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setContactToDelete(contact);
                        }}
                        className="p-1.5 rounded-lg text-[#9AA0B2] hover:text-[#F04438] hover:bg-white/10 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* 4B. REFINED CARDS / GRID VIEW                                             */
        /* ========================================================================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map(contact => {
            const isSelected = selectedIds.includes(contact.id);
            const statusCfg = getStatusBadge(contact.networkingStatus);
            const initials = getInitials(contact.fullName);
            const avatarStyle = getAvatarGradient(contact.fullName);

            return (
              <GlassCard
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`relative overflow-hidden p-5 flex flex-col justify-between group transition-all duration-200 hover:-translate-y-0.5 ${
                  isSelected ? "border-[rgba(216,26,69,0.4)] bg-[rgba(216,26,69,0.06)]" : ""
                }`}
                hoverable
              >
                {/* Specular highlight rim */}
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

                <div className="space-y-3.5 relative z-10">
                  {/* Top Bar: Checkbox + Avatar + Score */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelect(contact.id);
                        }}
                        className="shrink-0 text-[#9AA0B2] hover:text-[#F5F6FA] cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#FF6685]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </div>

                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarStyle} border flex items-center justify-center font-bold text-xs shrink-0 select-none shadow-sm`}>
                        {initials}
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-[#F5F6FA] group-hover:text-white transition-colors truncate">
                          {contact.fullName}
                        </h3>
                        <p className="text-xs text-[#FF6685] font-semibold truncate flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 shrink-0" />
                          <span className="truncate">{contact.companyName}</span>
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-white/[0.04] text-[#F5F6FA] border border-white/10 font-mono tabular-nums shrink-0">
                      {contact.relevanceScore}%
                    </span>
                  </div>

                  {/* Role & Normalized Function */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-[#9AA0B2] truncate">{contact.jobTitle}</span>
                    {contact.function && contact.function !== "Inconnue" && (
                      <span className="px-1.5 py-0.2 rounded bg-[rgba(192,132,252,0.12)] border border-[rgba(192,132,252,0.25)] text-[#C084FC] text-[9px] font-semibold uppercase tracking-wider">
                        {contact.function}
                      </span>
                    )}
                  </div>

                  {/* Connection Points or Academic */}
                  {contact.connectionPoints && contact.connectionPoints.length > 0 ? (
                    <div className="pt-2 border-t border-white/5 space-y-1">
                      {contact.connectionPoints.slice(0, 1).map((pt, i) => (
                        <div key={i} className="text-[11px] text-[#9AA0B2] flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-[#FF6685] shrink-0" />
                          <span className="truncate">{pt}</span>
                        </div>
                      ))}
                    </div>
                  ) : contact.academicPath ? (
                    <div className="pt-2 border-t border-white/5 text-[11px] text-[#9AA0B2] flex items-center gap-1.5 truncate">
                      <GraduationCap className="w-3 h-3 text-[#38BDF8] shrink-0" />
                      <span className="truncate">{contact.academicPath}</span>
                    </div>
                  ) : null}
                </div>

                {/* Footer: Channels + Status + View */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs relative z-10">
                  {/* Channels */}
                  <div className="flex items-center gap-1.5">
                    {contact.linkedInUrl && (
                      <span className="p-1 rounded-lg bg-white/[0.04] text-[#38BDF8] border border-white/10" title="LinkedIn disponible">
                        <Linkedin className="w-3 h-3" />
                      </span>
                    )}
                    {contact.email && (
                      <span className="p-1 rounded-lg bg-white/[0.04] text-[#9AA0B2] border border-white/10" title="Email disponible">
                        <Mail className="w-3 h-3" />
                      </span>
                    )}
                    {contact.phone && (
                      <span className="p-1 rounded-lg bg-white/[0.04] text-[#9AA0B2] border border-white/10" title="Téléphone disponible">
                        <Phone className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  {/* Status & View */}
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-semibold ${statusCfg.bg} ${statusCfg.textColor}`}>
                      {statusCfg.label}
                    </span>
                    
                    <span className="p-1 rounded-lg text-[#9AA0B2] group-hover:text-[#F5F6FA] transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. FLOATING BATCH ACTION BAR (When contacts are selected)                 */}
      {/* ========================================================================= */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 pointer-events-none animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="pointer-events-auto flex items-center gap-3 p-2.5 px-4 rounded-2xl bg-[#0B0F19]/95 backdrop-blur-2xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-xs text-[#F5F6FA] max-w-2xl w-full justify-between flex-wrap">
            
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-[#FF6685] animate-pulse" />
              <span className="font-bold font-display">
                {selectedIds.length} contact{selectedIds.length > 1 ? "s" : ""} sélectionné{selectedIds.length > 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-[11px] text-[#9AA0B2] hover:text-white underline ml-1 cursor-pointer"
              >
                Désélectionner
              </button>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Batch status dropdown */}
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBatchStatusChange(e.target.value as ContactNetworkingStatus);
                    e.target.value = "";
                  }
                }}
                defaultValue=""
                className="glass-input px-2.5 py-1.5 text-xs text-[#F5F6FA] bg-[#060812] cursor-pointer rounded-xl"
              >
                <option value="" disabled>Changer statut...</option>
                <option value="to_contact" className="bg-[#0B0F19]">À contacter</option>
                <option value="contacted" className="bg-[#0B0F19]">Message envoyé</option>
                <option value="exchanging" className="bg-[#0B0F19]">Échange en cours</option>
                <option value="interview_done" className="bg-[#0B0F19]">Entretien réalisé</option>
                <option value="not_interested" className="bg-[#0B0F19]">Sans suite</option>
              </select>

              {/* Copy emails */}
              <button
                type="button"
                onClick={handleBatchCopyEmails}
                className="p-1.5 px-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-[#F5F6FA] border border-white/10 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                title="Copier les emails disponibles"
              >
                <Copy className="w-3.5 h-3.5 text-[#9AA0B2]" />
                <span className="hidden sm:inline">Emails</span>
              </button>

              {/* Export CSV */}
              <button
                type="button"
                onClick={handleBatchExportCsv}
                className="p-1.5 px-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-[#F5F6FA] border border-white/10 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                title="Exporter au format CSV"
              >
                <Download className="w-3.5 h-3.5 text-[#9AA0B2]" />
                <span className="hidden sm:inline">Export</span>
              </button>

              {/* Batch Delete */}
              <button
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(true)}
                className="p-1.5 px-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-[#F04438] border border-red-500/20 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                title="Supprimer les contacts sélectionnés"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Supprimer</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. ADD CONTACT MODAL                                                      */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Ajouter un contact"
        size="md"
      >
        <form onSubmit={handleAddContact} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#9AA0B2] font-semibold">Nom et prénom *</label>
            <input
              type="text"
              required
              placeholder="ex: Sophie Martin"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#9AA0B2] font-semibold">Entreprise *</label>
              <input
                type="text"
                required
                placeholder="ex: Crédit Agricole, BNP Paribas..."
                value={formCompany}
                onChange={(e) => setFormCompany(e.target.value)}
                className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#9AA0B2] font-semibold">Poste / Intitulé exact *</label>
              <input
                type="text"
                required
                placeholder="ex: Directeur de région, DRH..."
                value={formJob}
                onChange={(e) => setFormJob(e.target.value)}
                className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#9AA0B2] font-semibold flex items-center justify-between">
                <span>Fonction normalisée (taxonomie)</span>
                {formJob.trim() && formFunction === "auto" && (
                  <span className="text-[10px] text-[#C084FC] font-normal truncate max-w-[140px]">
                    Auto: {classifyContactFunction(formJob.trim(), formCompany.trim()).function}
                  </span>
                )}
              </label>
              <select
                value={formFunction}
                onChange={(e) => setFormFunction(e.target.value)}
                className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA] bg-[#0B0F19]"
              >
                <option value="auto" className="bg-[#0B0F19] text-[#F5F6FA]">
                  ✨ Déduction automatique (selon le poste)
                </option>
                {STANDARD_CONTACT_FUNCTIONS.map((fn) => (
                  <option key={fn} value={fn} className="bg-[#0B0F19] text-[#F5F6FA]">
                    {fn}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#9AA0B2] font-semibold">Catégorie relationnelle</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as ContactCategory)}
                className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA] bg-[#0B0F19]"
              >
                <option value="recruiter" className="bg-[#0B0F19] text-[#F5F6FA]">Recruteur / RH</option>
                <option value="alumni" className="bg-[#0B0F19] text-[#F5F6FA]">Alumni (Même formation / école)</option>
                <option value="sector_pro" className="bg-[#0B0F19] text-[#F5F6FA]">Professionnel Secteur Cible</option>
                <option value="student" className="bg-[#0B0F19] text-[#F5F6FA]">Étudiant</option>
                <option value="other_pro" className="bg-[#0B0F19] text-[#F5F6FA]">Professionnel Autre Secteur</option>
                <option value="other" className="bg-[#0B0F19] text-[#F5F6FA]">Autre</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#9AA0B2] font-semibold">Localisation / Secteur géographique</label>
            <input
              type="text"
              placeholder="ex: Clermont-Ferrand, Auvergne-Rhône-Alpes, Paris..."
              value={formLocation}
              onChange={(e) => setFormLocation(e.target.value)}
              className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#9AA0B2] font-semibold">Email professionnel</label>
              <input
                type="email"
                placeholder="contact@entreprise.fr"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#9AA0B2] font-semibold">Téléphone</label>
              <input
                type="tel"
                placeholder="06 12 34 56 78"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#9AA0B2] font-semibold">URL Profil LinkedIn</label>
              <input
                type="url"
                placeholder="https://www.linkedin.com/in/..."
                value={formLinkedIn}
                onChange={(e) => setFormLinkedIn(e.target.value)}
                className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#9AA0B2] font-semibold">Lien web / Portail</label>
              <input
                type="url"
                placeholder="https://entreprise.fr/carrieres"
                value={formContactUrl}
                onChange={(e) => setFormContactUrl(e.target.value)}
                className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#9AA0B2] font-semibold">Notes de contexte</label>
            <textarea
              placeholder="ex: Rencontrée lors du forum entreprises, contact très positif..."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="w-full min-h-[70px] glass-input p-3 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
            <GlassButton type="button" variant="ghost" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Annuler
            </GlassButton>
            <GlassButton type="submit" variant="primary" size="sm">
              Ajouter au carnet
            </GlassButton>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* 7. QUICK EDIT MODAL                                                       */}
      {/* ========================================================================= */}
      {contactToEdit && (
        <Modal
          isOpen={Boolean(contactToEdit)}
          onClose={() => setContactToEdit(null)}
          title={`Modifier ${contactToEdit.fullName}`}
          size="md"
        >
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdateContact(contactToEdit);
            }} 
            className="space-y-4"
          >
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#9AA0B2] font-semibold">Nom complet *</label>
              <input
                type="text"
                required
                value={contactToEdit.fullName}
                onChange={(e) => setContactToEdit({ ...contactToEdit, fullName: e.target.value })}
                className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[#9AA0B2] font-semibold">Entreprise *</label>
                <input
                  type="text"
                  required
                  value={contactToEdit.companyName}
                  onChange={(e) => setContactToEdit({ ...contactToEdit, companyName: e.target.value })}
                  className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[#9AA0B2] font-semibold">Poste *</label>
                <input
                  type="text"
                  required
                  value={contactToEdit.jobTitle}
                  onChange={(e) => setContactToEdit({ ...contactToEdit, jobTitle: e.target.value })}
                  className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[#9AA0B2] font-semibold">Statut Relationnel</label>
                <select
                  value={contactToEdit.networkingStatus || "to_contact"}
                  onChange={(e) => setContactToEdit({ ...contactToEdit, networkingStatus: e.target.value as ContactNetworkingStatus })}
                  className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA] bg-[#0B0F19]"
                >
                  <option value="to_contact">À contacter</option>
                  <option value="contacted">Message envoyé</option>
                  <option value="exchanging">Échange en cours</option>
                  <option value="interview_done">Entretien réalisé</option>
                  <option value="not_interested">Sans suite</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[#9AA0B2] font-semibold">Catégorie</label>
                <select
                  value={contactToEdit.category}
                  onChange={(e) => setContactToEdit({ ...contactToEdit, category: e.target.value as ContactCategory })}
                  className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA] bg-[#0B0F19]"
                >
                  <option value="recruiter">Recruteur / RH</option>
                  <option value="alumni">Alumni</option>
                  <option value="sector_pro">Pro Secteur Cible</option>
                  <option value="student">Étudiant</option>
                  <option value="other_pro">Pro Autre Secteur</option>
                  <option value="other">Autre</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[#9AA0B2] font-semibold">Email professionnel</label>
                <input
                  type="email"
                  value={contactToEdit.email || ""}
                  onChange={(e) => setContactToEdit({ ...contactToEdit, email: e.target.value })}
                  className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[#9AA0B2] font-semibold">Téléphone</label>
                <input
                  type="tel"
                  value={contactToEdit.phone || ""}
                  onChange={(e) => setContactToEdit({ ...contactToEdit, phone: e.target.value })}
                  className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#9AA0B2] font-semibold">URL Profil LinkedIn</label>
              <input
                type="url"
                value={contactToEdit.linkedInUrl || ""}
                onChange={(e) => setContactToEdit({ ...contactToEdit, linkedInUrl: e.target.value })}
                className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
              <GlassButton type="button" variant="ghost" size="sm" onClick={() => setContactToEdit(null)}>
                Annuler
              </GlassButton>
              <GlassButton type="submit" variant="primary" size="sm">
                Enregistrer
              </GlassButton>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 8. SINGLE DELETE MODAL                                                    */}
      {/* ========================================================================= */}
      {contactToDelete && (
        <Modal
          isOpen={Boolean(contactToDelete)}
          onClose={() => setContactToDelete(null)}
          title="Supprimer le contact"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-[#9AA0B2] leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement <strong className="text-[#F5F6FA]">{contactToDelete.fullName}</strong> ({contactToDelete.companyName}) ? Cette action est irréversible.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <GlassButton variant="ghost" size="sm" onClick={() => setContactToDelete(null)}>
                Annuler
              </GlassButton>
              <GlassButton
                variant="danger"
                size="sm"
                onClick={() => handleDeleteContact(contactToDelete.id)}
              >
                Supprimer
              </GlassButton>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 9. BATCH DELETE MODAL                                                     */}
      {/* ========================================================================= */}
      {isBatchDeleteModalOpen && (
        <Modal
          isOpen={isBatchDeleteModalOpen}
          onClose={() => setIsBatchDeleteModalOpen(false)}
          title={`Supprimer ${selectedIds.length} contact(s)`}
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-[#9AA0B2] leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement ces <strong className="text-[#F5F6FA]">{selectedIds.length} contacts</strong> ? Cette action est irréversible.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <GlassButton variant="ghost" size="sm" onClick={() => setIsBatchDeleteModalOpen(false)}>
                Annuler
              </GlassButton>
              <GlassButton
                variant="danger"
                size="sm"
                onClick={handleConfirmBatchDelete}
              >
                Confirmer la suppression
              </GlassButton>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 10. PRESERVED LINKEDIN & TEXT IMPORT MODALS                               */}
      {/* ========================================================================= */}
      <LinkedInImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        candidateProfile={profile}
        showToast={showToast}
      />

      <ImportContactsTextModal
        isOpen={isTextImportModalOpen}
        onClose={() => setIsTextImportModalOpen(false)}
        candidateProfile={profile}
        showToast={showToast}
      />

      <ConversationImportModal
        isOpen={isConversationImportModalOpen}
        onClose={() => setIsConversationImportModalOpen(false)}
        candidateProfile={profile}
        showToast={showToast}
        onConversationImported={() => {
          setContacts(dbStore.getContacts());
        }}
      />

    </div>
  );
};
