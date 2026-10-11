import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { 
  dbStore 
} from "../dbStore";
import { 
  Opportunity, 
  OpportunityStatus, 
  ExtractedJobInfo,
  Company,
  Contact
} from "../types";
import { 
  Badge, 
  GlassCard, 
  GlassButton, 
  Modal 
} from "../components/Shared";
import { JobExtractionModal } from "../components/JobExtractionModal";
import { NetworkingMessageGenerator } from "../components/network/NetworkingMessageGenerator";
import { computeOpportunityMatch } from "../api/cvFramework";
import { resolveContact } from "../utils/contactResolver";
import { 
  Plus, 
  Upload, 
  Briefcase, 
  MapPin, 
  Calendar, 
  Sparkles, 
  ExternalLink, 
  Search, 
  TrendingUp, 
  ChevronRight, 
  CheckCircle2, 
  FileText, 
  FileDown,
  Building2,
  Euro,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  GripVertical,
  Trash2,
  Eye,
  Mail,
  Phone,
  Linkedin,
  UserCheck,
  Coffee,
  Award,
  GraduationCap,
  Clock,
  Edit3,
  Save,
  AlertCircle,
  CalendarClock,
  ArrowUpRight,
  CheckSquare,
  Layers,
  Globe,
  Building,
  Users,
  Flame,
  ShieldCheck,
  Check,
  Info,
  FileCheck,
  HelpCircle,
  X
} from "lucide-react";

// Helper to map any status to one of the 4 main pipeline categories or archived/refused
export const getPipelineCategory = (status?: OpportunityStatus | string): 'to_explore' | 'to_prepare' | 'applied' | 'in_process' | 'archived_refused' => {
  switch (status) {
    case 'to_explore':
    case 'saved':
    case 'to_study':
      return 'to_explore';
    case 'to_prepare':
    case 'to_apply':
      return 'to_prepare';
    case 'applied':
    case 'candidated':
      return 'applied';
    case 'in_process':
    case 'interview_1':
    case 'interview_2':
    case 'interview_3':
    case 'interview':
    case 'proposal':
      return 'in_process';
    case 'refused':
    case 'archived':
      return 'archived_refused';
    default:
      return 'to_explore';
  }
};

interface OpportunitiesProps {
  showToast: (message: string, type: "success" | "error" | "info" | "ai") => void;
  searchTerm: string;
  onOpenContact?: (contactId: string) => void;
  initialSelectedOppId?: string | null;
  onClearInitialOpp?: () => void;
}

export const Opportunities: React.FC<OpportunitiesProps> = ({ 
  showToast, 
  searchTerm, 
  onOpenContact,
  initialSelectedOppId,
  onClearInitialOpp
}) => {
  const { language, t } = useLanguage();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [oppToDelete, setOppToDelete] = useState<Opportunity | null>(null);
  const [activeTab, setActiveTab] = useState<"offre" | "profil" | "entreprise" | "workflow" | "reseau">("offre");
  
  // Modals visibility
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAiExtractionModalOpen, setIsAiExtractionModalOpen] = useState(false);
  const [reExtractOpp, setReExtractOpp] = useState<Opportunity | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  // Contact association state
  const [isAssociateModalOpen, setIsAssociateModalOpen] = useState(false);
  const [associateSearch, setAssociateSearch] = useState("");
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [quickContactName, setQuickContactName] = useState("");
  const [quickContactRole, setQuickContactRole] = useState("");
  const [quickContactEmail, setQuickContactEmail] = useState("");
  const [quickContactPhone, setQuickContactPhone] = useState("");
  const [quickContactLinkedin, setQuickContactLinkedin] = useState("");

  // Form State for creating a new opportunity
  const [formTitle, setFormTitle] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formContract, setFormContract] = useState<Opportunity["contractType"]>("Apprentissage");
  const [formDuration, setFormDuration] = useState("12 mois");
  const [formLocation, setFormLocation] = useState("");
  const [formSalary, setFormSalary] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formStatus, setFormStatus] = useState<OpportunityStatus>("to_apply");
  const [formRecruiterName, setFormRecruiterName] = useState("");
  const [formRecruiterRole, setFormRecruiterRole] = useState("");
  const [formRecruiterEmail, setFormRecruiterEmail] = useState("");
  const [formRecruiterPhone, setFormRecruiterPhone] = useState("");
  const [formRecruiterLinkedin, setFormRecruiterLinkedin] = useState("");
  const [rawJobText, setRawJobText] = useState(""); // For Gemini extraction

  // Edit Form State
  const [editTitle, setEditTitle] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editContract, setEditContract] = useState<Opportunity["contractType"]>("Apprentissage");
  const [editDuration, setEditDuration] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editSalary, setEditSalary] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editStatus, setEditStatus] = useState<OpportunityStatus>("saved");
  const [editRecruiterName, setEditRecruiterName] = useState("");
  const [editRecruiterRole, setEditRecruiterRole] = useState("");
  const [editRecruiterEmail, setEditRecruiterEmail] = useState("");
  const [editRecruiterPhone, setEditRecruiterPhone] = useState("");
  const [editRecruiterLinkedin, setEditRecruiterLinkedin] = useState("");

  // Private note live editor state
  const [privateNoteText, setPrivateNoteText] = useState("");
  const [isEditingPrivateNote, setIsEditingPrivateNote] = useState(false);

  // CSV State
  const [csvText, setCsvText] = useState("");
  const [csvPreview, setCsvPreview] = useState<any[]>([]);

  // Drag and drop state & filters
  const [localSearch, setLocalSearch] = useState("");
  const [contractFilter, setContractFilter] = useState<string>("all");
  const [filterLate, setFilterLate] = useState<boolean>(false);
  const [draggedOppId, setDraggedOppId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<OpportunityStatus | null>(null);

  // Synchronize private note editor when selectedOpp changes
  useEffect(() => {
    if (selectedOpp) {
      setPrivateNoteText(selectedOpp.privateNotes || "");
      setIsEditingPrivateNote(false);
    }
  }, [selectedOpp]);

  const [candidateProfile, setCandidateProfile] = useState(dbStore.getProfile());
  const [candidateDocs, setCandidateDocs] = useState(dbStore.getDocuments());

  // Load opportunities from DBStore
  useEffect(() => {
    setOpportunities(dbStore.getOpportunities());
    setCandidateProfile(dbStore.getProfile());
    setCandidateDocs(dbStore.getDocuments());
    const unsub = dbStore.subscribe(() => {
      const all = dbStore.getOpportunities();
      setOpportunities(all);
      setCandidateProfile(dbStore.getProfile());
      setCandidateDocs(dbStore.getDocuments());
      // Keep selectedOpp in sync
      if (selectedOpp) {
        const fresh = all.find(o => o.id === selectedOpp.id);
        if (fresh) setSelectedOpp(fresh);
      }
    });
    return unsub;
  }, [selectedOpp?.id]);

  useEffect(() => {
    if (initialSelectedOppId && opportunities.length > 0) {
      const match = opportunities.find(o => o.id === initialSelectedOppId);
      if (match) {
        setSelectedOpp(match);
        if (onClearInitialOpp) onClearInitialOpp();
      }
    }
  }, [initialSelectedOppId, opportunities, onClearInitialOpp]);

  const getStatusLabelAndStyle = (status?: string) => {
    switch (status) {
      case "a_contacter":
      case "to_contact":
        return { label: "À contacter", style: "bg-amber-500/15 text-amber-300 border-amber-500/30" };
      case "demande_envoyee":
      case "contacted":
        return { label: "Demande envoyée", style: "bg-sky-500/15 text-sky-300 border-sky-500/30" };
      case "connexion_acceptee":
        return { label: "Connexion acceptée", style: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" };
      case "message_envoye":
        return { label: "Message envoyé", style: "bg-blue-500/15 text-blue-300 border-blue-500/30" };
      case "en_attente_reponse":
        return { label: "En attente de réponse", style: "bg-purple-500/15 text-purple-300 border-purple-500/30" };
      case "reponse_recue":
      case "reponse_a_traiter":
        return { label: "Réponse reçue", style: "bg-rose-500/15 text-rose-300 border-rose-500/30" };
      case "echange_en_cours":
      case "exchanging":
        return { label: "Échange en cours", style: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" };
      case "appel_prevu":
        return { label: "Appel prévu", style: "bg-teal-500/15 text-teal-300 border-teal-500/30" };
      case "echange_realise":
      case "interview_done":
        return { label: "Échange réalisé", style: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" };
      default:
        return { label: "Nouveau contact", style: "bg-white/10 text-slate-300 border-white/15" };
    }
  };

  const getOppAssociatedContacts = (opp: Opportunity): Contact[] => {
    const all = dbStore.getContacts();
    const cMap = new Map<string, Contact>();

    if (opp.contactIds && Array.isArray(opp.contactIds)) {
      opp.contactIds.forEach(id => {
        const found = all.find(c => c.id === id);
        if (found) cMap.set(found.id, found);
      });
    }

    if (opp.recruiterContact) {
      const recId = opp.recruiterContact.contactId || opp.recruiterContact.id;
      if (recId) {
        const found = all.find(c => c.id === recId);
        if (found) cMap.set(found.id, found);
      }
    }

    all.forEach(c => {
      if (c.opportunityId === opp.id || (c.opportunityIds && c.opportunityIds.includes(opp.id))) {
        cMap.set(c.id, c);
      }
    });

    return Array.from(cMap.values());
  };

  const handleAssociateContact = (contactId: string) => {
    if (!selectedOpp) return;
    dbStore.associateContactWithOpportunity(selectedOpp.id, contactId);
    showToast("Contact associé à l'opportunité avec succès", "success");
    setIsAssociateModalOpen(false);
  };

  const handleDisassociateContact = (contactId: string) => {
    if (!selectedOpp) return;
    dbStore.disassociateContactFromOpportunity(selectedOpp.id, contactId);
    showToast("Association retirée de l'opportunité", "info");
  };

  const handleQuickCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpp || !quickContactName.trim()) return;

    try {
      const nameParts = quickContactName.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const newContact = dbStore.addContact({
        fullName: quickContactName.trim(),
        firstName,
        lastName,
        companyId: selectedOpp.companyId || "",
        companyName: selectedOpp.companyName,
        jobTitle: quickContactRole.trim() || "Recruteur / Interlocuteur",
        normalizedJobTitle: quickContactRole.trim() || "Recruteur / Interlocuteur",
        category: "recruiter",
        relevanceScore: 85,
        connectionPoints: [`Associé à l'opportunité "${selectedOpp.title}"`],
        previousCompanies: [],
        notes: `Créé directement depuis la fiche de l'opportunité "${selectedOpp.title}".`,
        email: quickContactEmail.trim() || undefined,
        phone: quickContactPhone.trim() || undefined,
        linkedInUrl: quickContactLinkedin.trim() || undefined,
        opportunityId: selectedOpp.id,
        opportunityTitle: selectedOpp.title
      });

      dbStore.associateContactWithOpportunity(selectedOpp.id, newContact.id);
      showToast(`Contact "${newContact.fullName}" créé et associé`, "success");

      setQuickContactName("");
      setQuickContactRole("");
      setQuickContactEmail("");
      setQuickContactPhone("");
      setQuickContactLinkedin("");
      setIsQuickAddModalOpen(false);
    } catch (err: any) {
      showToast(err?.message || "Erreur lors de la création du contact", "error");
    }
  };

  // Open edit modal pre-filled
  const handleOpenEditModal = (opp: Opportunity) => {
    setEditTitle(opp.title);
    setEditCompany(opp.companyName);
    setEditContract(opp.contractType);
    setEditDuration(opp.duration || "");
    setEditLocation(opp.location);
    setEditSalary(opp.salary || "");
    setEditStartDate(opp.startDate || "");
    setEditDeadline(opp.deadline || "");
    setEditUrl(opp.url || "");
    setEditStatus(opp.status);
    setEditRecruiterName(opp.recruiterContact?.name || "");
    setEditRecruiterRole(opp.recruiterContact?.role || "");
    setEditRecruiterEmail(opp.recruiterContact?.email || "");
    setEditRecruiterPhone(opp.recruiterContact?.phone || "");
    setEditRecruiterLinkedin(opp.recruiterContact?.linkedinUrl || opp.recruiterContact?.linkedin || "");
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpp) return;

    const recruiterContact = (editRecruiterName || editRecruiterEmail || editRecruiterLinkedin) ? {
      ...(selectedOpp.recruiterContact || {}),
      name: editRecruiterName || undefined,
      role: editRecruiterRole || undefined,
      email: editRecruiterEmail || undefined,
      phone: editRecruiterPhone || undefined,
      linkedinUrl: editRecruiterLinkedin || undefined,
      linkedin: editRecruiterLinkedin || undefined
    } : selectedOpp.recruiterContact;

    const updated: Opportunity = {
      ...selectedOpp,
      title: editTitle,
      companyName: editCompany,
      contractType: editContract,
      duration: editDuration,
      location: editLocation,
      salary: editSalary || undefined,
      startDate: editStartDate || undefined,
      deadline: editDeadline || undefined,
      url: editUrl || undefined,
      status: editStatus,
      recruiterContact
    };

    try {
      dbStore.updateOpportunity(updated);
      setSelectedOpp(updated);
      setIsEditModalOpen(false);
      showToast("Opportunité et contact recruteur mis à jour et synchronisés !", "success");
    } catch (err: any) {
      showToast(`Erreur d'enregistrement : ${err?.message || "Échec de la sauvegarde"}`, "error");
    }
  };

  const handleSavePrivateNote = () => {
    if (!selectedOpp) return;
    const updated: Opportunity = {
      ...selectedOpp,
      privateNotes: privateNoteText
    };
    dbStore.updateOpportunity(updated);
    setSelectedOpp(updated);
    setIsEditingPrivateNote(false);
    showToast("Notes privées enregistrées", "success");
  };

  // State for showing archived/refused offers filter
  const [showArchived, setShowArchived] = useState<boolean>(false);

  // Filter opportunities based on search term, contract filter and late filter
  const filteredOpps = opportunities.filter(o => {
    const s = (localSearch || searchTerm).toLowerCase().trim();
    const matchesSearch = !s || (
      o.title.toLowerCase().includes(s) ||
      o.companyName.toLowerCase().includes(s) ||
      o.location.toLowerCase().includes(s) ||
      o.contractType.toLowerCase().includes(s)
    );
    const matchesContract = contractFilter === "all" || o.contractType === contractFilter;
    
    // Retards: opportunité avec deadline renseignée ou étape critique sans action
    const isLate = filterLate ? (
      (o.deadline && (o.deadline.toLowerCase().includes("juin") || o.deadline.toLowerCase().includes("passée"))) ||
      o.status === "to_prepare" ||
      (o.workflowStep && o.workflowStep >= 4 && o.workflowStep <= 5)
    ) : true;

    // Archived / Refused handling
    const category = getPipelineCategory(o.status);
    if (!showArchived && category === "archived_refused") {
      return false;
    }

    return matchesSearch && matchesContract && isLate;
  });

  // Kanban Columns in strict order: À explorer -> À préparer -> Candidaté -> En cours
  const columns: Array<{ 
    id: 'to_explore' | 'to_prepare' | 'applied' | 'in_process'; 
    title: string; 
    color: string; 
    badgeBg: string;
    borderActive: string;
    desc: string; 
  }> = [
    { 
      id: "to_explore", 
      title: "À explorer", 
      color: "text-sky-400", 
      badgeBg: "bg-sky-500/15 text-sky-300 border border-sky-500/30",
      borderActive: "border-sky-400/60 bg-sky-500/[0.04]",
      desc: language === "en" ? "Tracked & shortlisted offers" : "Offres repérées & à analyser" 
    },
    { 
      id: "to_prepare", 
      title: "À préparer", 
      color: "text-purple-400", 
      badgeBg: "bg-purple-500/15 text-purple-300 border border-purple-500/30",
      borderActive: "border-purple-400/60 bg-purple-500/[0.04]",
      desc: language === "en" ? "Application & CV in preparation" : "Dossier & CV en préparation" 
    },
    { 
      id: "applied", 
      title: "Candidaté", 
      color: "text-emerald-400", 
      badgeBg: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
      borderActive: "border-emerald-400/60 bg-emerald-500/[0.04]",
      desc: language === "en" ? "Submitted applications" : "Candidatures transmises" 
    },
    { 
      id: "in_process", 
      title: "En cours", 
      color: "text-amber-400", 
      badgeBg: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
      borderActive: "border-amber-400/60 bg-amber-500/[0.04]",
      desc: language === "en" ? "Interviews, tests & proposals" : "Entretiens, tests & propositions" 
    }
  ];

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, oppId: string) => {
    setDraggedOppId(oppId);
    e.dataTransfer.setData("text/plain", oppId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedOppId(null);
    setDragOverCol(null);
  };

  const handleDragOver = (e: React.DragEvent, colId: OpportunityStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverCol !== colId) {
      setDragOverCol(colId);
    }
  };

  const handleDragLeave = (colId: OpportunityStatus) => {
    if (dragOverCol === colId) {
      setDragOverCol(null);
    }
  };

  const handleDrop = (e: React.DragEvent, colId: OpportunityStatus) => {
    e.preventDefault();
    const oppId = e.dataTransfer.getData("text/plain") || draggedOppId;
    if (!oppId) return;
    const opp = opportunities.find(o => o.id === oppId);
    if (opp && getPipelineCategory(opp.status) !== colId) {
      handleMoveOpportunity(opp, colId as any);
    }
    setDraggedOppId(null);
    setDragOverCol(null);
  };

  // Drag and drop or quick move controls with intelligent workflow step synchronization
  const handleMoveOpportunity = (opp: Opportunity, targetCol: 'to_explore' | 'to_prepare' | 'applied' | 'in_process') => {
    let newStep = opp.workflowStep || 1;

    // Bi-directional step adjustments
    if (targetCol === 'to_explore') {
      if (newStep > 2) newStep = 1;
    } else if (targetCol === 'to_prepare') {
      if (newStep < 3 || newStep > 4) newStep = 3;
    } else if (targetCol === 'applied') {
      if (newStep < 5 || newStep > 6) newStep = 5;
    } else if (targetCol === 'in_process') {
      if (newStep < 7) newStep = 7;
    }

    const updated: Opportunity = { 
      ...opp, 
      status: targetCol,
      workflowStep: newStep
    };

    dbStore.updateOpportunity(updated);
    const colName = columns.find(c => c.id === targetCol)?.title || targetCol;
    showToast(`"${opp.title}" transférée vers "${colName}" (Étape ${newStep}/9)`, "success");
    if (selectedOpp?.id === opp.id) {
      setSelectedOpp(updated);
    }
  };

  // Gemini Extraction execution
  const handleExtractWithGemini = async () => {
    if (!rawJobText.trim()) {
      showToast("Veuillez coller le descriptif de l'offre d'abord", "error");
      return;
    }

    setIsExtracting(true);
    showToast("Analyse de l'offre d'emploi par NACORA AI...", "ai");

    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "extractJobDetails",
          payload: { jobDescription: rawJobText }
        })
      });

      if (!response.ok) throw new Error("Server error");
      const data: ExtractedJobInfo = await response.json();

      // Attempt to intelligently pre-fill title and company if found in text
      const lines = rawJobText.split("\n").slice(0, 5);
      const possibleTitle = lines.find(l => l.toLowerCase().includes("poste") || l.toLowerCase().includes("offre") || l.length < 50);
      if (possibleTitle && !formTitle) {
        setFormTitle(possibleTitle.replace(/poste|offre|:|h\/f/gi, "").trim());
      }

      showToast("Extraction IA réussie ! Les critères de l'offre sont injectés.", "success");
      
      // Update the form fields or save extracted state
      // We will attach these to the new opportunity
      (window as any)._lastExtractedInfo = data;
    } catch (e) {
      console.error(e);
      showToast("Erreur d'extraction IA. Utilisation d'un modèle standard.", "error");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleEnrichOpportunityCompany = async () => {
    if (!selectedOpp || !selectedOpp.companyName) return;
    showToast(`Recherche web pour ${selectedOpp.companyName}...`, "ai");
    try {
      const co = dbStore.getCompanyByNameOrCreate(selectedOpp.companyName);
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enrichCompany", payload: { companyName: selectedOpp.companyName } })
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();

      const cleanMetrics = (Array.isArray(data.metrics) ? data.metrics : []).filter((m: any) => {
        if (!m || !m.label || !m.value) return false;
        const l = String(m.label).toLowerCase().trim();
        const v = String(m.value).toLowerCase().trim();
        if (l === "statut" && v === "actif") return false;
        if (v === "actif" || v === "n/a" || v === "donnée synthétique" || v === "non précisé" || v === "non renseigné") return false;
        return true;
      });

      if (data.description || data.sector || data.revenue) {
        const updatedCo: Company = {
          ...co,
          sector: data.sector || co.sector,
          description: data.description || co.description,
          size: data.size || co.size,
          location: data.location || co.location,
          foundingYear: data.foundingYear || co.foundingYear,
          companyStatus: data.companyStatus || co.companyStatus,
          parentGroup: data.parentGroup || co.parentGroup,
          revenue: data.revenue || co.revenue,
          metrics: cleanMetrics.length > 0 ? cleanMetrics : co.metrics,
          enrichmentStatus: 'enriched',
          lastEnrichedAt: new Date().toISOString()
        };
        dbStore.updateCompany(updatedCo);
      }

      if (!data.description && !data.sector && !data.revenue) {
        showToast("Aucune information supplémentaire trouvée en ligne pour cette entreprise.", "info");
        return;
      }

      const currentDetails = selectedOpp.extractedInfo?.entrepriseDetails || {};
      const updatedDetails = {
        ...currentDetails,
        presentation: data.description || currentDetails.presentation,
        secteur: data.sector && data.sector !== "Secteur à préciser" ? data.sector : currentDetails.secteur,
        taille: data.size || currentDetails.taille,
        siege: data.location || currentDetails.siege,
        parentGroup: data.parentGroup || currentDetails.parentGroup,
        chiffresCles: cleanMetrics.length > 0 ? cleanMetrics : (currentDetails.chiffresCles || [])
      };

      const updatedOpp = {
        ...selectedOpp,
        extractedInfo: {
          ...(selectedOpp.extractedInfo || {
            missions: [],
            competencesRequises: [],
            competencesAppreciees: [],
            softSkills: [],
            outilsLogiciels: [],
            formation: "",
            experienceRequise: "",
            languesRequises: []
          }),
          entrepriseDetails: updatedDetails
        }
      };

      dbStore.updateOpportunity(updatedOpp);
      setSelectedOpp(updatedOpp);
      showToast(`Fiche entreprise ${selectedOpp.companyName} enrichie avec succès !`, "success");
    } catch (e) {
      showToast("Échec de la recherche web", "error");
    }
  };

  // Add Opportunity submit
  const handleAddOpportunity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formCompany) {
      showToast("Veuillez remplir au moins le titre et l'entreprise", "error");
      return;
    }

    try {
      const linkedCompany = dbStore.getCompanyByNameOrCreate(formCompany);
      const lastExtracted: ExtractedJobInfo | undefined = (window as any)._lastExtractedInfo;

      const recruiterContact = (formRecruiterName || formRecruiterEmail || formRecruiterLinkedin) ? {
        name: formRecruiterName || undefined,
        role: formRecruiterRole || undefined,
        email: formRecruiterEmail || undefined,
        phone: formRecruiterPhone || undefined,
        linkedinUrl: formRecruiterLinkedin || undefined,
        linkedin: formRecruiterLinkedin || undefined
      } : undefined;

      const newOpp = dbStore.addOpportunity({
        companyId: linkedCompany.id,
        companyName: linkedCompany.name,
        title: formTitle,
        contractType: formContract,
        duration: formDuration,
        location: formLocation || "Clermont-Ferrand",
        status: formStatus,
        salary: formSalary || undefined,
        url: formUrl || undefined,
        notes: formNotes || "Nouvelle offre ajoutée.",
        aiExtracted: !!lastExtracted,
        extractedInfo: lastExtracted,
        recruiterContact
      });

      const colTitle = columns.find(c => c.id === formStatus)?.title || formStatus;
      showToast(`"${formTitle}" ajouté à la colonne "${colTitle}" et contact synchronisé !`, "success");

      // Clear Form
      setFormTitle("");
      setFormCompany("");
      setFormContract("Apprentissage");
      setFormDuration("12 mois");
      setFormLocation("");
      setFormSalary("");
      setFormUrl("");
      setFormNotes("");
      setFormRecruiterName("");
      setFormRecruiterRole("");
      setFormRecruiterEmail("");
      setFormRecruiterPhone("");
      setFormRecruiterLinkedin("");
      setRawJobText("");
      (window as any)._lastExtractedInfo = undefined;
      setIsAddModalOpen(false);
    } catch (err: any) {
      showToast(`Erreur lors de la création : ${err?.message || "Échec de l'enregistrement"}`, "error");
    }
  };

  // Delete Opportunity
  const handleDeleteOpp = (oppId: string) => {
    dbStore.deleteOpportunity(oppId);
    showToast("Opportunité supprimée", "info");
    setSelectedOpp(null);
  };

  // CSV Parser
  const handleParseCsv = () => {
    if (!csvText.trim()) {
      showToast("Veuillez coller du texte au format CSV", "error");
      return;
    }

    try {
      const rows = csvText.split("\n").filter(r => r.trim());
      if (rows.length < 2) {
        showToast("Le CSV doit contenir au moins un en-tête et une ligne de données", "error");
        return;
      }

      const headers = rows[0].split(",").map(h => h.trim().toLowerCase());
      const previewData: any[] = [];

      for (let i = 1; i < rows.length; i++) {
        const cells = rows[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
        const rowObj: any = {};
        headers.forEach((h, idx) => {
          rowObj[h] = cells[idx] || "";
        });
        previewData.push(rowObj);
      }

      setCsvPreview(previewData);
      showToast(`${previewData.length} lignes CSV lues avec succès`, "info");
    } catch (e) {
      showToast("Erreur lors de l'analyse du CSV. Vérifiez le format (séparateur virgule)", "error");
    }
  };

  // CSV Import confirmation
  const handleConfirmImportCsv = () => {
    if (csvPreview.length === 0) return;

    csvPreview.forEach(item => {
      const companyName = item.entreprise || item.company || "Entreprise Inconnue";
      const title = item.poste || item.title || item.sujet || "Poste à préciser";
      const location = item.lieu || item.location || "Clermont-Ferrand";
      const contractType = (item.contrat || item.contract || "Apprentissage") as Opportunity["contractType"];
      const notes = item.notes || item.description || "Importé via CSV";

      const linkedCo = dbStore.getCompanyByNameOrCreate(companyName);
      dbStore.addOpportunity({
        companyId: linkedCo.id,
        companyName: linkedCo.name,
        title,
        contractType,
        duration: item.duree || "12 mois",
        location,
        status: "saved",
        salary: item.salaire || item.salary || undefined,
        url: item.url || undefined,
        notes,
        aiExtracted: false
      });
    });

    showToast(`${csvPreview.length} opportunités importées avec succès`, "success");
    setCsvText("");
    setCsvPreview([]);
    setIsImportModalOpen(false);
  };

  return (
    <div className="relative z-10 w-full">
      {!selectedOpp && (
        <>
          {/* Top Section - Unified compact row on desktop/wide screens */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl lg:text-3xl font-extrabold text-[#F5F6FA] tracking-tight font-display whitespace-nowrap">
            {t.opportunities.title}
          </h1>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-[#9AA0B2] whitespace-nowrap">
            {filteredOpps.length} {language === "en" ? (filteredOpps.length > 1 ? "opportunities" : "opportunity") : (filteredOpps.length > 1 ? "offres" : "offre")}
          </span>
          <span className="hidden xl:inline-block text-[#9AA0B2]/30">•</span>
          <p className="hidden xl:block text-[#9AA0B2] text-xs truncate max-w-sm 2xl:max-w-md">
            {t.opportunities.subtitle}
          </p>
        </div>

        {/* Action buttons on single horizontal row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none shrink-0 flex-nowrap">
          <GlassButton 
            variant="secondary" 
            size="md"
            onClick={() => setIsImportModalOpen(true)}
            icon={<Upload className="w-3.5 h-3.5 text-[#9AA0B2]" />}
          >
            {t.opportunities.importCsv}
          </GlassButton>

          <GlassButton
            variant="ai"
            size="md"
            onClick={() => {
              setReExtractOpp(null);
              setIsAiExtractionModalOpen(true);
            }}
            icon={<Sparkles className="w-3.5 h-3.5 text-[#C084FC] animate-pulse" />}
          >
            {t.opportunities.extractAi}
          </GlassButton>

          <GlassButton 
            variant="primary" 
            size="md"
            onClick={() => {
              setFormStatus("to_apply");
              setIsAddModalOpen(true);
            }}
            icon={<Plus className="w-4 h-4 text-white" />}
          >
            {t.opportunities.addOpportunity}
          </GlassButton>
        </div>
      </div>

      {/* Filter toolbar: Search, Contract Filter, Retards Filter, Counters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-4 glass-panel p-2">
        
        {/* Left: Live search input */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-3.5 h-3.5 text-[#9AA0B2] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder={t.opportunities.searchPlaceholder}
            className="w-full pl-9 pr-8 py-1.5 glass-input text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
          />
          {localSearch && (
            <button
              onClick={() => setLocalSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9AA0B2] hover:text-[#F5F6FA] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Center/Right: Contract filters & Retards toggle */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-white/10">
            {[
              { id: "all", label: t.opportunities.filterAll },
              { id: "Apprentissage", label: t.opportunities.filterApprenticeship },
              { id: "Stage", label: t.opportunities.filterInternship },
              { id: "CDI", label: "CDI" },
              { id: "CDD", label: "CDD" }
            ].map(chip => (
              <button
                key={chip.id}
                onClick={() => setContractFilter(chip.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-spring cursor-pointer ${
                  contractFilter === chip.id
                    ? "bg-gradient-to-b from-[#EC0040] to-[#D81A45] text-white shadow-[0_4px_14px_rgba(216,26,69,0.4)] border border-white/20"
                    : "text-[#9AA0B2] hover:text-[#F5F6FA] hover:bg-white/5"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Filter Retards */}
          <button
            onClick={() => setFilterLate(!filterLate)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-spring cursor-pointer border ${
              filterLate
                ? "bg-[rgba(240,68,56,0.18)] text-[#F04438] border-[rgba(240,68,56,0.4)] shadow-[0_0_12px_rgba(240,68,56,0.2)]"
                : "bg-white/5 text-[#9AA0B2] hover:text-[#F5F6FA] border-white/10 hover:bg-white/10"
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${filterLate ? "text-[#F04438] animate-pulse" : "text-[#9AA0B2]"}`} />
            <span>{t.opportunities.filterLate}</span>
            {filterLate && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#F04438] animate-ping ml-0.5" />
            )}
          </button>

          {/* Filter Refusées / Archivées Toggle */}
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-spring cursor-pointer border ${
              showArchived
                ? "bg-slate-800 text-slate-100 border-slate-600 shadow-sm"
                : "bg-white/5 text-[#9AA0B2] hover:text-[#F5F6FA] border-white/10 hover:bg-white/10"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#9AA0B2]" />
            <span>Refusées / Archivées</span>
          </button>

          {/* Total Counter badge */}
          <span className="text-[11px] text-[#9AA0B2] font-semibold px-2.5 py-1 glass-pill bg-white/[0.04]">
            {filteredOpps.length} / {opportunities.length} {language === "en" ? "opportunities" : "offres"}
          </span>
        </div>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {columns.map(col => {
          const colOpps = filteredOpps.filter(o => getPipelineCategory(o.status) === col.id);
          const isOver = dragOverCol === col.id;

          return (
            <div 
              key={col.id} 
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={() => handleDragLeave(col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`kanban-col flex flex-col rounded-2xl p-4 transition-spring min-h-[520px] ${
                isOver 
                  ? `border-2 border-dashed ${col.borderActive} scale-[1.01] bg-[#0c1020]/90 backdrop-blur-2xl` 
                  : "glass-panel"
              }`}
            >
              {/* Column Header */}
              <div className="flex items-start justify-between mb-3 pb-3 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${col.badgeBg}`}>
                      {col.title}
                    </span>
                    <span className="text-[#9AA0B2] text-xs font-bold bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                      {colOpps.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#9AA0B2] mt-1 font-normal">{col.desc}</p>
                </div>

                {/* Quick Add into this column */}
                <button
                  onClick={() => {
                    setFormStatus(col.id);
                    setIsAddModalOpen(true);
                  }}
                  title={`Ajouter directement dans "${col.title}"`}
                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#9AA0B2] hover:text-[#F5F6FA] border border-white/5 transition-spring cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Cards list with drag-and-drop support */}
              <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-270px)] pr-0.5">
                {colOpps.length === 0 ? (
                  <div className={`flex-1 flex flex-col items-center justify-center rounded-xl p-8 text-center transition-colors ${
                    isOver ? "bg-white/5 border border-dashed border-white/20" : "border-2 border-dashed border-white/[0.04]"
                  }`}>
                    <Briefcase className="w-8 h-8 text-slate-600 mb-2" />
                    <p className="text-xs text-[#9AA0B2] font-medium">{language === "en" ? "No offers" : "Aucune offre"}</p>
                    <p className="text-[11px] text-[#9AA0B2]/70 mt-1">{language === "en" ? "Drag an offer here" : "Glissez une offre ici"}</p>
                  </div>
                ) : (
                  colOpps.map(opp => {
                    const isBeingDragged = draggedOppId === opp.id;

                    const matchResult = computeOpportunityMatch(candidateProfile, opp, candidateDocs);
                    const matchColor = matchResult.score >= 80 ? "text-[#34D399] bg-[#34D399]/10 border-[#34D399]/30" : matchResult.score >= 65 ? "text-[#38BDF8] bg-[#38BDF8]/10 border-[#38BDF8]/30" : "text-[#FBBF24] bg-[#FBBF24]/10 border-[#FBBF24]/30";

                    return (
                      <div
                        key={opp.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, opp.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => {
                          setSelectedOpp(opp);
                          setActiveTab("offre");
                        }}
                        className={`group relative glass-card-interactive p-3.5 cursor-grab active:cursor-grabbing space-y-2 transition-all ${
                          isBeingDragged ? "opacity-40 scale-95 border-dashed border-white/40" : ""
                        }`}
                      >
                        {/* 1. Entreprise, Match IA & Action */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#FF6685] tracking-wide font-display truncate flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 shrink-0 text-[#FF6685]" />
                            <span className="truncate">{opp.companyName}</span>
                          </span>

                          <div className="flex items-center gap-1.5">
                            <span 
                              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border flex items-center gap-1 ${matchColor}`}
                              title={`Score de matching IA : ${matchResult.score}%\n- Compétences : ${matchResult.skillsMatch}%\n- Secteur : ${matchResult.sectorMatch}%`}
                            >
                              <Sparkles className="w-2.5 h-2.5" />
                              {matchResult.score}% Match
                            </span>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOppToDelete(opp);
                              }}
                              className="p-1 rounded-lg text-[#9AA0B2] hover:text-[#F04438] hover:bg-red-500/10 transition-colors cursor-pointer"
                              title={language === "en" ? "Delete this opportunity" : "Supprimer cette opportunité"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* 2. Intitulé du poste */}
                        <h4 className="text-[13px] sm:text-sm font-bold text-[#F5F6FA] group-hover:text-[#FF6685] transition-colors leading-snug line-clamp-2">
                          {opp.title}
                        </h4>

                        {/* 3. Type de contrat, Durée & Salaire en ligne compacte */}
                        <div className="flex items-center gap-2 text-xs text-[#9AA0B2] flex-wrap">
                          <span className="capitalize font-medium text-[#F5F6FA]/90">{opp.contractType}</span>
                          {opp.duration && (
                            <>
                              <span className="text-white/20">•</span>
                              <span className="text-[11px] text-[#9AA0B2]">{opp.duration}</span>
                            </>
                          )}
                          {opp.salary && (
                            <>
                              <span className="text-white/20">•</span>
                              <span className="text-[11px] text-[#34D399] font-medium truncate">{opp.salary}</span>
                            </>
                          )}
                        </div>

                        {/* 4. Localisation & Lien vers l'offre */}
                        <div className="text-[11px] text-[#9AA0B2] flex items-center justify-between gap-1.5 pt-0.5">
                          <span className="inline-flex items-center gap-1 min-w-0 truncate">
                            <MapPin className="w-3 h-3 text-[#9AA0B2] shrink-0" />
                            <span className="truncate">{opp.location}</span>
                          </span>
                          {opp.url && (
                            <a
                              href={opp.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[#38BDF8] hover:text-[#7DD3FC] hover:underline inline-flex items-center gap-1 text-[11px] font-medium transition-colors shrink-0"
                              title={language === "en" ? "Open job offer link" : "Ouvrir le lien de l'offre"}
                            >
                              <span>{language === "en" ? "Offer" : "Offre"}</span>
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            </a>
                          )}
                        </div>

                        {/* 5. Actions de déplacement directes : Sur une seule ligne (3 colonnes compactes) */}
                        <div 
                          className="pt-2 border-t border-white/10 grid grid-cols-3 gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {columns
                            .filter((c) => c.id !== getPipelineCategory(opp.status))
                            .map((c) => (
                              <button
                                key={c.id}
                                onClick={() => handleMoveOpportunity(opp, c.id)}
                                title={`${language === "en" ? "Move to" : "Déplacer vers"} ${c.title}`}
                                className="flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-[#9AA0B2] hover:text-[#F5F6FA] text-[11px] font-semibold border border-white/5 hover:border-white/15 transition-all group/btn text-center cursor-pointer min-w-0"
                              >
                                <span className="text-[#FF6685] group-hover/btn:translate-x-0.5 transition-transform font-bold text-[10px] shrink-0">→</span>
                                <span className="truncate">{c.title}</span>
                              </button>
                            ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Refusées & Archivées dedicated section */}
      {showArchived && (
        <div className="mt-6 p-5 glass-panel rounded-2xl border border-slate-700/50 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Offres Refusées & Archivées
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                {opportunities.filter(o => getPipelineCategory(o.status) === "archived_refused").length}
              </span>
            </div>
            <button
              onClick={() => setShowArchived(false)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Masquer</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {opportunities.filter(o => getPipelineCategory(o.status) === "archived_refused").length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 col-span-3 text-center">
                Aucune candidature refusée ou archivée.
              </p>
            ) : (
              opportunities.filter(o => getPipelineCategory(o.status) === "archived_refused").map(opp => (
                <div key={opp.id} className="p-3.5 rounded-xl bg-black/40 border border-white/10 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-[#FF6685]">{opp.companyName}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${opp.status === 'refused' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-slate-700 text-slate-300'}`}>
                        {opp.status === 'refused' ? 'Refusée' : 'Archivée'}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-200 leading-snug">{opp.title}</h4>
                    <p className="text-[11px] text-slate-400 mt-1">{opp.location} • {opp.contractType}</p>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    <button
                      onClick={() => handleMoveOpportunity(opp, 'to_explore')}
                      className="px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[11px] font-semibold hover:bg-sky-500/25 transition-colors cursor-pointer"
                    >
                      Restaurer vers À explorer
                    </button>
                    <button
                      onClick={() => handleMoveOpportunity(opp, 'to_prepare')}
                      className="px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[11px] font-semibold hover:bg-purple-500/25 transition-colors cursor-pointer"
                    >
                      Restaurer vers À préparer
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      </>
      )}

      {/* --- ADD OPPORTUNITY MODAL --- */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setRawJobText("");
          (window as any)._lastExtractedInfo = undefined;
        }}
        title="Ajouter une opportunité"
        size="xl"
      >
        <form onSubmit={handleAddOpportunity} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left side: AI Copilot parsing */}
            <div className="lg:col-span-5 flex flex-col gap-4 bg-white/[0.01] border border-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Extraction automatique de l'offre
                </label>
                {isExtracting && (
                  <span className="text-xs text-purple-400 animate-pulse">Analyse...</span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Collez la description de l'offre ou les missions ci-dessous pour pré-remplir automatiquement les informations clés du poste.
              </p>
              <textarea
                value={rawJobText}
                onChange={(e) => setRawJobText(e.target.value)}
                placeholder="Exemple : Nous recherchons un Conseiller Clientèle Patrimoniale Junior en alternance pour notre agence de Clermont-Ferrand... Vos missions consisteront à..."
                className="flex-1 w-full min-h-[160px] max-h-[300px] bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-400/50"
              />
              <GlassButton
                type="button"
                variant="ai"
                onClick={handleExtractWithGemini}
                disabled={isExtracting}
                size="sm"
                className="w-full"
              >
                {isExtracting ? "Analyse en cours..." : "Analyser et pré-remplir"}
              </GlassButton>
            </div>

            {/* Right side: standard manual form */}
            <div className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-300 font-semibold">Poste / Titre *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Conseiller Patrimonial Junior"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-400/50"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-300 font-semibold">Entreprise *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Crédit Agricole"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-400/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-300 font-semibold">Type de contrat</label>
                  <select
                    value={formContract}
                    onChange={(e) => setFormContract(e.target.value as any)}
                    className="bg-[#0b0f19] border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="Apprentissage">Apprentissage</option>
                    <option value="Professionnalisation">Professionnalisation</option>
                    <option value="Stage">Stage</option>
                    <option value="CDI">CDI</option>
                    <option value="CDD">CDD</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-300 font-semibold">Durée</label>
                  <input
                    type="text"
                    placeholder="ex: 12 mois, 6 mois"
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-300 font-semibold">Lieu</label>
                  <input
                    type="text"
                    placeholder="ex: Clermont-Fd, Paris"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-300 font-semibold">Rémunération (€)</label>
                  <input
                    type="text"
                    placeholder="ex: 1400€/mois"
                    value={formSalary}
                    onChange={(e) => setFormSalary(e.target.value)}
                    className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-xs text-slate-300 font-semibold">URL de l'offre (LinkedIn, etc.)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-300 font-semibold">Catégorie initiale du Pipeline</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="bg-[#0b0f19] border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="to_explore">À explorer</option>
                    <option value="to_prepare">À préparer</option>
                    <option value="applied">Candidaté</option>
                    <option value="in_process">En cours (Entretiens / Tests)</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-white/10 pt-3.5 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#FF6685]" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Contact / Recruteur associé (synchronisé avec « Contacts »)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Nom complet (ex: Valérie Bertrand)"
                    value={formRecruiterName}
                    onChange={(e) => setFormRecruiterName(e.target.value)}
                    className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25"
                  />
                  <input
                    type="text"
                    placeholder="Poste / Rôle (ex: Responsable Recrutement RH)"
                    value={formRecruiterRole}
                    onChange={(e) => setFormRecruiterRole(e.target.value)}
                    className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25"
                  />
                  <input
                    type="email"
                    placeholder="E-mail (ex: valerie.bertrand@entreprise.com)"
                    value={formRecruiterEmail}
                    onChange={(e) => setFormRecruiterEmail(e.target.value)}
                    className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25"
                  />
                  <input
                    type="text"
                    placeholder="Téléphone (ex: 06 12 34 56 78)"
                    value={formRecruiterPhone}
                    onChange={(e) => setFormRecruiterPhone(e.target.value)}
                    className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25"
                  />
                  <input
                    type="url"
                    placeholder="Profil LinkedIn (ex: https://linkedin.com/in/...)"
                    value={formRecruiterLinkedin}
                    onChange={(e) => setFormRecruiterLinkedin(e.target.value)}
                    className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25 col-span-1 sm:col-span-2"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-300 font-semibold">Notes / Informations complémentaires</label>
                <textarea
                  placeholder="Écris tes remarques..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full min-h-[80px] bg-black/30 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
            <GlassButton type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Annuler
            </GlassButton>
            <GlassButton type="submit" variant="primary">
              Ajouter l'opportunité
            </GlassButton>
          </div>
        </form>
      </Modal>

      {/* --- IMPORT CSV MODAL --- */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setCsvText("");
          setCsvPreview([]);
        }}
        title="Importer des candidatures par CSV"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Importe tes offres au format CSV. Colle les lignes séparées par des virgules ci-dessous.
          </p>
          <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5 text-[11px] text-[#fbbf24] leading-relaxed">
            <strong>Format attendu (première ligne = en-têtes exacts) :</strong><br />
            <code>entreprise, poste, lieu, contrat, duree, salaire, notes</code><br />
            <span className="text-slate-400">Exemple : LCL, Conseiller Patrimoine, Lyon, Apprentissage, 12 mois, 1500, Relance sous peu</span>
          </div>

          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="entreprise, poste, lieu, contrat, duree, salaire, notes&#10;LCL, Conseiller Patrimoine, Lyon, Apprentissage, 12 mois, 1500, Suivi en cours"
            className="w-full min-h-[150px] bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-400/50"
          />

          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">
              {csvPreview.length > 0 ? `${csvPreview.length} lignes prêtes` : "Aucune ligne lue"}
            </span>
            <div className="flex gap-2">
              <GlassButton type="button" size="sm" variant="secondary" onClick={handleParseCsv}>
                Vérifier le format
              </GlassButton>
              {csvPreview.length > 0 && (
                <GlassButton type="button" size="sm" variant="primary" onClick={handleConfirmImportCsv}>
                  Confirmer l'import ({csvPreview.length})
                </GlassButton>
              )}
            </div>
          </div>

          {csvPreview.length > 0 && (
            <div className="overflow-x-auto max-h-[180px] bg-black/30 border border-white/10 rounded-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-white/5 sticky top-0 text-slate-400">
                  <tr>
                    <th className="p-2 border-b border-white/5">Entreprise</th>
                    <th className="p-2 border-b border-white/5">Poste</th>
                    <th className="p-2 border-b border-white/5">Lieu</th>
                    <th className="p-2 border-b border-white/5">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {csvPreview.map((item, idx) => (
                    <tr key={idx} className="hover:bg-white/2">
                      <td className="p-2">{item.entreprise || item.company || "N/A"}</td>
                      <td className="p-2 font-medium text-slate-100">{item.poste || item.title || "N/A"}</td>
                      <td className="p-2">{item.lieu || item.location || "N/A"}</td>
                      <td className="p-2 text-xs">{item.contrat || item.contract || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

      {/* --- EDIT OPPORTUNITY MODAL --- */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Modifier l'opportunité"
        size="lg"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-300 font-semibold">Titre du poste *</label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-300 font-semibold">Entreprise *</label>
              <input
                type="text"
                required
                value={editCompany}
                onChange={(e) => setEditCompany(e.target.value)}
                className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-300 font-semibold">Type de contrat</label>
              <select
                value={editContract}
                onChange={(e) => setEditContract(e.target.value as any)}
                className="bg-[#0b0f19] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value="Apprentissage">Apprentissage</option>
                <option value="Stage">Stage</option>
                <option value="CDI">CDI</option>
                <option value="CDD">CDD</option>
                <option value="Alternance">Alternance</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-300 font-semibold">Durée</label>
              <input
                type="text"
                value={editDuration}
                onChange={(e) => setEditDuration(e.target.value)}
                placeholder="Ex. 12 mois, 6 mois"
                className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-300 font-semibold">Localisation</label>
              <input
                type="text"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-300 font-semibold">Salaire / Gratification</label>
              <input
                type="text"
                value={editSalary}
                onChange={(e) => setEditSalary(e.target.value)}
                placeholder="Ex. 1 350 € / mois"
                className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-300 font-semibold">Date de début</label>
              <input
                type="text"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                placeholder="Ex. Septembre 2026, Dès que possible"
                className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-300 font-semibold">Date limite (Deadline)</label>
              <input
                type="text"
                value={editDeadline}
                onChange={(e) => setEditDeadline(e.target.value)}
                placeholder="Ex. 30 Juin 2026"
                className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25"
              />
            </div>

            <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
              <label className="text-xs text-slate-300 font-semibold">Lien URL de l'offre</label>
              <input
                type="url"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                placeholder="https://..."
                className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25"
              />
            </div>

            <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
              <label className="text-xs text-slate-300 font-semibold">Statut Pipeline & Suivi</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as OpportunityStatus)}
                className="bg-[#0b0f19] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value="to_explore">À explorer</option>
                <option value="to_prepare">À préparer</option>
                <option value="applied">Candidaté</option>
                <option value="in_process">En cours (Entretiens / Tests / Négociation)</option>
                <option value="refused">Refusée</option>
                <option value="archived">Archivée</option>
              </select>
            </div>

            <div className="border-t border-white/10 pt-3.5 space-y-2.5 col-span-1 sm:col-span-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#FF6685]" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Contact / Recruteur associé (synchronisé avec « Contacts »)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Nom complet (ex: Valérie Bertrand)"
                  value={editRecruiterName}
                  onChange={(e) => setEditRecruiterName(e.target.value)}
                  className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25"
                />
                <input
                  type="text"
                  placeholder="Poste / Rôle (ex: Responsable Recrutement RH)"
                  value={editRecruiterRole}
                  onChange={(e) => setEditRecruiterRole(e.target.value)}
                  className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25"
                />
                <input
                  type="email"
                  placeholder="E-mail (ex: valerie.bertrand@entreprise.com)"
                  value={editRecruiterEmail}
                  onChange={(e) => setEditRecruiterEmail(e.target.value)}
                  className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25"
                />
                <input
                  type="text"
                  placeholder="Téléphone (ex: 06 12 34 56 78)"
                  value={editRecruiterPhone}
                  onChange={(e) => setEditRecruiterPhone(e.target.value)}
                  className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25"
                />
                <input
                  type="url"
                  placeholder="Profil LinkedIn (ex: https://linkedin.com/in/...)"
                  value={editRecruiterLinkedin}
                  onChange={(e) => setEditRecruiterLinkedin(e.target.value)}
                  className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25 col-span-1 sm:col-span-2"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
            <GlassButton type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>
              Annuler
            </GlassButton>
            <GlassButton type="submit" variant="primary">
              Enregistrer les modifications
            </GlassButton>
          </div>
        </form>
      </Modal>

      {/* --- DETAILED OPPORTUNITY VIEW (FULL SCREEN WORKSPACE) --- */}
      {selectedOpp && (
        <div className="space-y-4 animate-in fade-in duration-200 w-full mb-6">
          {/* Top navigation breadcrumb */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setSelectedOpp(null)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#9AA0B2] hover:text-[#F5F6FA] border border-white/10 text-xs font-semibold transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{language === "en" ? "Back to opportunities" : "Retour aux opportunités"}</span>
            </button>
            <span className="text-xs text-[#9AA0B2] font-medium hidden sm:inline-block">
              {language === "en" ? "Opportunity file & Application workspace" : "Fiche opportunité & Dossier de candidature"}
            </span>
          </div>

          <div className="glass-panel p-5 sm:p-6 rounded-2xl flex flex-col gap-5 w-full">
            
            {/* === 1. MODAL HEADER (COMMON TO ALL 4 TABS) === */}
            <div className="border-b border-white/10 pb-5 space-y-3.5">
              {/* Top Row: Title + Action buttons */}
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#FF6685] flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#FF6685]" />
                      {selectedOpp.companyName}
                    </span>
                    <span className="text-white/20">•</span>
                    <span className="text-xs text-[#9AA0B2] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#9AA0B2]" />
                      {selectedOpp.location}
                    </span>
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-black text-[#F5F6FA] tracking-tight leading-snug font-display">
                    {selectedOpp.title}
                  </h2>
                </div>

                {/* Top Right Actions: Modifier, Ré-extraire avec l'IA, Fermer */}
                <div className="flex flex-wrap items-center gap-2 self-start shrink-0">
                  <button
                    onClick={() => handleOpenEditModal(selectedOpp)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#F5F6FA] hover:text-white border border-white/10 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#9AA0B2]" />
                    <span>{language === "en" ? "Edit" : "Modifier"}</span>
                  </button>

                  <button
                    onClick={() => {
                      setReExtractOpp(selectedOpp);
                      setIsAiExtractionModalOpen(true);
                      showToast(language === "en" ? "Opening AI extractor for re-analysis..." : "Ouverture de l'extracteur IA pour ré-analyse...", "ai");
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-900/30 to-rose-900/30 hover:from-purple-900/45 hover:to-rose-900/45 text-purple-200 hover:text-white border border-purple-500/30 text-xs font-semibold shadow-[0_4px_16px_rgba(147,51,234,0.2)] transition-spring cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#C084FC] animate-pulse" />
                    <span>{language === "en" ? "Re-extract with AI" : "Ré-extraire avec l'IA"}</span>
                  </button>

                  {selectedOpp.url && (
                    <a
                      href={selectedOpp.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#9AA0B2] hover:text-[#F5F6FA] border border-white/10 text-xs font-semibold transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{language === "en" ? "Web offer" : "Offre web"}</span>
                    </a>
                  )}

                  <button
                    onClick={() => setSelectedOpp(null)}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#9AA0B2] hover:text-white border border-white/10 transition-colors cursor-pointer ml-1"
                    title={language === "en" ? "Close" : "Fermer la fiche"}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tag Banner: All badges fit on single line on fullscreen / desktop */}
              <div className="flex items-center gap-1.5 sm:gap-2 pt-1 text-xs overflow-x-auto pb-1 lg:pb-0 scrollbar-none flex-nowrap">
                {/* 1. Entreprise: Rouge NACORA */}
                <span className="px-2.5 py-1 rounded-xl bg-[rgba(216,26,69,0.14)] border border-[rgba(216,26,69,0.30)] text-[#FF6685] font-semibold flex items-center gap-1.5 shadow-[0_0_12px_rgba(216,26,69,0.15)] whitespace-nowrap shrink-0">
                  <Building2 className="w-3.5 h-3.5 text-[#FF6685]" />
                  {selectedOpp.companyName}
                </span>

                {/* 2. Type de contrat: Sobre Liquid Glass */}
                <span className="px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-[#F5F6FA] font-medium whitespace-nowrap shrink-0">
                  {selectedOpp.contractType}
                </span>

                {/* 3. Localisation: Sobre Liquid Glass */}
                <span className="px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-[#9AA0B2] flex items-center gap-1.5 whitespace-nowrap shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-[#9AA0B2]" />
                  {selectedOpp.location}
                </span>

                {/* 4. Salaire: Vert sémantique */}
                {selectedOpp.salary && (
                  <span className="px-2.5 py-1 rounded-xl bg-[rgba(18,183,106,0.14)] border border-[rgba(18,183,106,0.28)] text-[#34D399] font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0">
                    <Euro className="w-3.5 h-3.5 text-[#34D399]" />
                    {selectedOpp.salary}
                  </span>
                )}

                {/* 5. Durée: Sobre Liquid Glass */}
                {selectedOpp.duration && (
                  <span className="px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-[#9AA0B2] font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0">
                    <Clock className="w-3.5 h-3.5 text-[#9AA0B2]" />
                    {selectedOpp.duration}
                  </span>
                )}

                {/* 6. Date de début: Sobre Liquid Glass */}
                <span className="px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-[#9AA0B2] flex items-center gap-1.5 whitespace-nowrap shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-[#9AA0B2]" />
                  {language === "en" ? "Start:" : "Début :"} <span className="text-[#F5F6FA] font-medium">{selectedOpp.startDate || (language === "en" ? "As soon as possible" : "Dès que possible")}</span>
                </span>

                {/* 7. Deadline: Ambre sémantique si spécifiée */}
                <span className={`px-2.5 py-1 rounded-xl border font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  selectedOpp.deadline 
                    ? "bg-[rgba(247,144,9,0.12)] border-[rgba(247,144,9,0.28)] text-[#FBBF24]"
                    : "bg-white/[0.04] border-white/10 text-[#9AA0B2]"
                }`}>
                  <CalendarClock className={`w-3.5 h-3.5 ${selectedOpp.deadline ? "text-[#FBBF24]" : "text-[#9AA0B2]"}`} />
                  Deadline : <span className={selectedOpp.deadline ? "text-[#FBBF24] font-semibold" : "text-[#9AA0B2]"}>{selectedOpp.deadline || (language === "en" ? "Not specified" : "Non spécifiée")}</span>
                </span>

                {/* 8. Statut actuel: Couleurs sémantiques distinctes */}
                <span className={`px-2.5 py-1 rounded-xl font-semibold border flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  selectedOpp.status === 'saved' ? 'bg-white/[0.06] text-[#F5F6FA] border-white/15' :
                  selectedOpp.status === 'to_study' ? 'bg-[rgba(147,51,234,0.14)] text-[#C084FC] border-[rgba(147,51,234,0.28)]' :
                  selectedOpp.status === 'to_prepare' ? 'bg-[rgba(247,144,9,0.14)] text-[#F79009] border-[rgba(247,144,9,0.28)]' :
                  'bg-[rgba(216,26,69,0.18)] text-[#FF6685] border-[rgba(216,26,69,0.35)] shadow-[0_0_12px_rgba(216,26,69,0.2)]'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {columns.find(c => c.id === selectedOpp.status)?.title || selectedOpp.status}
                </span>

                {/* 9. Analyse IA: Violet IA subtil */}
                {selectedOpp.aiExtracted && (
                  <span className="px-2.5 py-1 rounded-xl bg-[rgba(147,51,234,0.12)] text-[#C084FC] border border-[rgba(147,51,234,0.25)] text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-[#C084FC]" />
                    {language === "en" ? "AI Analysis" : "Analyse IA"}
                  </span>
                )}
              </div>
            </div>

            {/* === 2. SEGMENTED WORKSPACE TABS (5 TABS) === */}
            <div className="flex flex-wrap gap-1.5 p-1 bg-black/40 rounded-xl self-start border border-white/10 backdrop-blur-xl">
              <button
                onClick={() => setActiveTab("offre")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-spring cursor-pointer ${
                  activeTab === 'offre' ? 'glass-pill bg-[rgba(216,26,69,0.18)] text-[#FF6685] border-[rgba(216,26,69,0.35)] shadow-[0_0_12px_rgba(216,26,69,0.2)]' : 'text-[#9AA0B2] hover:text-[#F5F6FA] hover:bg-white/5'
                }`}
              >
                {language === "en" ? "Offer & Missions" : "Offre & Missions"}
              </button>
              <button
                onClick={() => setActiveTab("profil")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-spring cursor-pointer ${
                  activeTab === 'profil' ? 'glass-pill bg-[rgba(216,26,69,0.18)] text-[#FF6685] border-[rgba(216,26,69,0.35)] shadow-[0_0_12px_rgba(216,26,69,0.2)]' : 'text-[#9AA0B2] hover:text-[#F5F6FA] hover:bg-white/5'
                }`}
              >
                {language === "en" ? "Candidate Profile" : "Profil & Recrutement"}
              </button>
              <button
                onClick={() => setActiveTab("entreprise")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-spring cursor-pointer ${
                  activeTab === 'entreprise' ? 'glass-pill bg-[rgba(216,26,69,0.18)] text-[#FF6685] border-[rgba(216,26,69,0.35)] shadow-[0_0_12px_rgba(216,26,69,0.2)]' : 'text-[#9AA0B2] hover:text-[#F5F6FA] hover:bg-white/5'
                }`}
              >
                {language === "en" ? "Company" : "Entreprise"}
              </button>
              <button
                onClick={() => setActiveTab("workflow")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-spring cursor-pointer ${
                  activeTab === 'workflow' ? 'glass-pill bg-[rgba(216,26,69,0.18)] text-[#FF6685] border-[rgba(216,26,69,0.35)] shadow-[0_0_12px_rgba(216,26,69,0.2)]' : 'text-[#9AA0B2] hover:text-[#F5F6FA] hover:bg-white/5'
                }`}
              >
                {language === "en" ? "Workflow & Tracking" : "Workflow & Suivi"}
              </button>
              <button
                onClick={() => setActiveTab("reseau")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-spring cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'reseau' ? 'glass-pill bg-[rgba(216,26,69,0.18)] text-[#FF6685] border-[rgba(216,26,69,0.35)] shadow-[0_0_12px_rgba(216,26,69,0.2)]' : 'text-[#9AA0B2] hover:text-[#F5F6FA] hover:bg-white/5'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#FF6685]" />
                {language === "en" ? "Outreach & Networking IA" : "Prise de Contact & Relances IA"}
              </button>
            </div>

            {/* === 3. ACTIVE TAB CONTENT === */}
            <div className="min-h-[360px]">

              {/* ===== TAB 1: OFFRE & MISSIONS ===== */}
              {activeTab === "offre" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Left 2 Cols: Missions principales + Documents demandés */}
                    <div className="lg:col-span-2 space-y-6">
                      
                      {/* Section Missions principales */}
                      <div className="space-y-4 bg-white/[0.02] border border-white/5 rounded-2xl p-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <CheckCircle2 className="w-5 h-5 text-rose-400" />
                            <h3 className="text-base font-bold text-white">Missions principales</h3>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 border border-rose-500/30 text-rose-300">
                            {selectedOpp.extractedInfo?.missions?.length || 4} missions extraites
                          </span>
                        </div>

                        <div className="space-y-3 pt-1">
                          {(selectedOpp.extractedInfo?.missions && selectedOpp.extractedInfo.missions.length > 0) ? (
                            selectedOpp.extractedInfo.missions.map((mission, idx) => (
                              <div 
                                key={idx} 
                                className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
                              >
                                <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-1 rounded-md mt-0.5 flex-shrink-0">
                                  {String(idx + 1).padStart(2, "0")}
                                </span>
                                <p className="text-xs text-slate-200 leading-relaxed font-normal">
                                  {mission}
                                </p>
                              </div>
                            ))
                          ) : (
                            <div className="p-4 rounded-xl bg-black/20 text-xs text-slate-400 leading-relaxed">
                              {selectedOpp.notes || "Aucune mission détaillée n'a été spécifiée pour cette opportunité."}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Section Documents demandés */}
                      <div className="space-y-3 bg-white/[0.02] border border-white/5 rounded-2xl p-5">
                        <div className="flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-sky-400" />
                          <h4 className="text-sm font-bold text-white">Documents demandés pour postuler</h4>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {selectedOpp.extractedInfo?.documentsDemandes && selectedOpp.extractedInfo.documentsDemandes.length > 0 ? (
                            selectedOpp.extractedInfo.documentsDemandes.map((doc, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-200">
                                <FileText className="w-3.5 h-3.5 text-sky-400" />
                                <span>{doc}</span>
                              </div>
                            ))
                          ) : (
                            <>
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300">
                                <FileText className="w-3.5 h-3.5 text-sky-400" />
                                <span>CV à jour (format PDF)</span>
                              </div>
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300">
                                <FileText className="w-3.5 h-3.5 text-sky-400" />
                                <span>Lettre de motivation ciblée</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right 1 Col: Contact RH & Avantages */}
                    <div className="space-y-6">
                      
                      {/* Contacts Associés */}
                      {(() => {
                        const associatedContacts = getOppAssociatedContacts(selectedOpp);

                        return (
                          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-[#FF6685]" />
                                Contacts associés ({associatedContacts.length})
                              </h4>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setIsAssociateModalOpen(true)}
                                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-[#F5F6FA] border border-white/10 flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Associer un contact existant"
                                >
                                  <Plus className="w-3 h-3 text-[#FF6685]" />
                                  <span>Lier</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setIsQuickAddModalOpen(true)}
                                  className="px-2.5 py-1 rounded-lg bg-[#D81A45]/15 hover:bg-[#D81A45]/25 text-xs text-[#FF6685] border border-[#D81A45]/30 flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Créer un nouveau contact"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Créer</span>
                                </button>
                              </div>
                            </div>

                            {associatedContacts.length > 0 ? (
                              <div className="space-y-3">
                                {associatedContacts.map(c => {
                                  const statusInfo = getStatusLabelAndStyle(c.networkingStatus);

                                  return (
                                    <div key={c.id} className="p-3.5 rounded-xl bg-black/30 border border-white/10 space-y-3">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#D81A45]/30 to-purple-500/20 text-[#FF6685] border border-white/10 flex items-center justify-center font-bold text-xs shrink-0">
                                            {c.fullName.slice(0, 2).toUpperCase()}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="text-xs font-bold text-white truncate">{c.fullName}</div>
                                            <div className="text-[11px] text-[#9AA0B2] truncate">{c.jobTitle} {c.companyName ? `• ${c.companyName}` : ''}</div>
                                          </div>
                                        </div>

                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${statusInfo.style}`}>
                                          {statusInfo.label}
                                        </span>
                                      </div>

                                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-[11px]">
                                        <div className="flex items-center gap-2 text-[#9AA0B2] truncate">
                                          {c.email && (
                                            <a href={`mailto:${c.email}`} className="hover:text-rose-300 transition-colors flex items-center gap-1 truncate" title={c.email}>
                                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                              <span className="truncate max-w-[120px]">{c.email}</span>
                                            </a>
                                          )}
                                          {c.phone && (
                                            <span className="flex items-center gap-1">
                                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                              <span>{c.phone}</span>
                                            </span>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                                          <button
                                            type="button"
                                            onClick={() => handleDisassociateContact(c.id)}
                                            className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                            title="Retirer l'association avec cette opportunité"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (onOpenContact) {
                                                onOpenContact(c.id);
                                              } else {
                                                showToast(`Fiche contact : ${c.fullName}`, "info");
                                              }
                                            }}
                                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[#F5F6FA] hover:text-white border border-white/15 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                            title="Ouvrir la fiche contact complète dans l'annuaire Contacts"
                                          >
                                            <span>Ouvrir la fiche</span>
                                            <ChevronRight className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="p-4 rounded-xl bg-black/20 border border-white/5 text-xs text-slate-400 space-y-2 text-center py-5">
                                <Users className="w-6 h-6 text-slate-500 mx-auto" />
                                <p className="font-medium text-slate-300">Aucun contact associé</p>
                                <p className="text-[11px] text-slate-500">
                                  Liez un contact de votre base de données ou créez-en un directement pour cette opportunité.
                                </p>
                                <div className="flex items-center justify-center gap-2 pt-2">
                                  <button
                                    type="button"
                                    onClick={() => setIsAssociateModalOpen(true)}
                                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-[#F5F6FA] border border-white/10 font-semibold cursor-pointer"
                                  >
                                    Lier un contact existant
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setIsQuickAddModalOpen(true)}
                                    className="px-3 py-1.5 rounded-xl bg-[#D81A45]/20 hover:bg-[#D81A45]/30 text-xs text-[#FF6685] border border-[#D81A45]/40 font-semibold cursor-pointer"
                                  >
                                    Créer un contact
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Avantages & Environnement */}
                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-amber-400" />
                          Avantages & Environnement
                        </h4>

                        <div className="flex flex-col gap-2 pt-1">
                          {((selectedOpp.extractedInfo?.avantagesEnvironnement || selectedOpp.extractedInfo?.avantages) && (selectedOpp.extractedInfo.avantagesEnvironnement || selectedOpp.extractedInfo.avantages)!.length > 0) ? (
                            (selectedOpp.extractedInfo.avantagesEnvironnement || selectedOpp.extractedInfo.avantages)!.map((adv: string, idx: number) => (
                              <div key={idx} className="flex items-start gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-slate-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                                <span>{adv}</span>
                              </div>
                            ))
                          ) : (
                            <>
                              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-slate-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                                <span>Rémunération conventionnelle selon barème d'apprentissage</span>
                              </div>
                              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-slate-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                                <span>Titres-restaurant pris en charge à 60%</span>
                              </div>
                              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-slate-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                                <span>Prise en charge 50% des abonnements de transport</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Section Notes Personnelles & Privées (En bas de l'onglet, distinct de l'IA) */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-indigo-400" />
                        <div>
                          <h4 className="text-sm font-bold text-white">Notes Personnelles & Privées</h4>
                          <p className="text-[11px] text-slate-400">
                            Espace réservé à tes remarques confidentielles, distinct du contenu extrait par l'IA
                          </p>
                        </div>
                      </div>

                      {!isEditingPrivateNote && (
                        <button
                          onClick={() => setIsEditingPrivateNote(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-medium transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Modifier mes notes</span>
                        </button>
                      )}
                    </div>

                    {isEditingPrivateNote ? (
                      <div className="space-y-3 pt-2">
                        <textarea
                          value={privateNoteText}
                          onChange={(e) => setPrivateNoteText(e.target.value)}
                          placeholder="Écris tes réflexions, arguments d'accroche, contacts informels, questions à poser lors de l'entretien..."
                          className="w-full min-h-[110px] bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-400/50"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setPrivateNoteText(selectedOpp.privateNotes || "");
                              setIsEditingPrivateNote(false);
                            }}
                            className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={handleSavePrivateNote}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Enregistrer</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-black/20 border border-white/5 text-xs text-slate-300 leading-relaxed">
                        {selectedOpp.privateNotes ? (
                          <div className="whitespace-pre-line">{selectedOpp.privateNotes}</div>
                        ) : (
                          <div className="flex items-center justify-between text-slate-500 italic">
                            <span>Aucune note privée renseignée pour le moment.</span>
                            <button
                              onClick={() => setIsEditingPrivateNote(true)}
                              className="not-italic text-xs text-indigo-400 hover:text-indigo-300 ml-2 font-medium cursor-pointer"
                            >
                              + Ajouter une note
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ===== TAB 2: PROFIL & RECRUTEMENT ===== */}
              {activeTab === "profil" && (
                <div className="space-y-6">
                  
                  {/* Grid: Compétences Indispensables & Compétences Appréciées */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Compétences indispensables / requises */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-rose-400" />
                        Compétences indispensables
                      </h4>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {selectedOpp.extractedInfo?.competencesRequises && selectedOpp.extractedInfo.competencesRequises.length > 0 ? (
                          selectedOpp.extractedInfo.competencesRequises.map((c, i) => (
                            <span key={i} className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-200 text-xs font-medium">
                              {c}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500 italic">Non spécifié</span>
                        )}
                      </div>
                    </div>

                    {/* Compétences appréciées / atouts (distinct visuellement) */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        Compétences appréciées & Atouts
                      </h4>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {selectedOpp.extractedInfo?.competencesAppreciees && selectedOpp.extractedInfo.competencesAppreciees.length > 0 ? (
                          selectedOpp.extractedInfo.competencesAppreciees.map((c, i) => (
                            <span key={i} className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-200 text-xs font-medium">
                              {c}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500 italic">Aucune compétence secondaire mentionnée</span>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Grid: Soft skills & Outils */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Qualités humaines & Soft skills */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-400" />
                        Qualités humaines & Soft Skills
                      </h4>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {selectedOpp.extractedInfo?.softSkills && selectedOpp.extractedInfo.softSkills.length > 0 ? (
                          selectedOpp.extractedInfo.softSkills.map((s, i) => (
                            <span key={i} className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-200 text-xs font-medium">
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500 italic">Non spécifié</span>
                        )}
                      </div>
                    </div>

                    {/* Outils, logiciels & plateformes */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-400" />
                        Outils, logiciels & plateformes
                      </h4>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {selectedOpp.extractedInfo?.outilsLogiciels && selectedOpp.extractedInfo.outilsLogiciels.length > 0 ? (
                          selectedOpp.extractedInfo.outilsLogiciels.map((t, i) => (
                            <span key={i} className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-200 text-xs font-medium">
                              {t}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500 italic">Non spécifié</span>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Formation, Expérience & Langues */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/[0.02] border border-white/5 rounded-2xl p-5">
                    
                    {/* Formation */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-slate-400">
                        <GraduationCap className="w-4 h-4 text-emerald-400" />
                        <span>Formation & Diplômes</span>
                      </div>
                      <p className="text-xs text-slate-200 font-medium leading-relaxed">
                        {selectedOpp.extractedInfo?.formation || "Bac+3 à Bac+5 en Économie, Gestion ou Finance"}
                      </p>
                    </div>

                    {/* Expérience requise */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-slate-400">
                        <Clock className="w-4 h-4 text-sky-400" />
                        <span>Expérience requise</span>
                      </div>
                      <p className="text-xs text-slate-200 font-medium leading-relaxed">
                        {selectedOpp.extractedInfo?.experienceRequise || "Profil débutant en alternance ou première expérience"}
                      </p>
                    </div>

                    {/* Langues requises */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-slate-400">
                        <Globe className="w-4 h-4 text-amber-400" />
                        <span>Langues requises</span>
                      </div>
                      <div className="flex flex-col gap-1.5 pt-0.5">
                        {selectedOpp.extractedInfo?.languesRequises && selectedOpp.extractedInfo.languesRequises.length > 0 ? (
                          selectedOpp.extractedInfo.languesRequises.map((l, i) => (
                            <span key={i} className="text-xs text-slate-200 font-medium">
                              {l}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">Français (Natif / Bilingue)</span>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Section Étapes du recrutement (numérotée avec nom, rôle, durée) */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarClock className="w-4 h-4 text-amber-400" />
                        <h4 className="text-sm font-bold text-white">Étapes du processus de recrutement</h4>
                      </div>
                      <span className="text-xs text-slate-400">
                        {selectedOpp.extractedInfo?.etapesRecrutement?.length || 4} étapes prévues
                      </span>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      {(selectedOpp.extractedInfo?.etapesRecrutement && selectedOpp.extractedInfo.etapesRecrutement.length > 0) ? (
                        selectedOpp.extractedInfo.etapesRecrutement.map((step, idx) => (
                          <div 
                            key={idx}
                            className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-black/20 border border-white/5"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                {idx + 1}
                              </span>
                              <span className="text-xs font-medium text-slate-200">
                                {step}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono">Étape {idx + 1}</span>
                          </div>
                        ))
                      ) : (
                        <div className="space-y-2 text-xs text-slate-300">
                          <div className="p-3 rounded-xl bg-black/20 border border-white/5 flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-amber-500/15 text-amber-300 text-xs font-bold flex items-center justify-center">1</span>
                            <span>1. Échange téléphonique de qualification RH (30')</span>
                          </div>
                          <div className="p-3 rounded-xl bg-black/20 border border-white/5 flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-amber-500/15 text-amber-300 text-xs font-bold flex items-center justify-center">2</span>
                            <span>2. Entretien avec le Manager d'équipe (45')</span>
                          </div>
                          <div className="p-3 rounded-xl bg-black/20 border border-white/5 flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-amber-500/15 text-amber-300 text-xs font-bold flex items-center justify-center">3</span>
                            <span>3. Échange de clôture et proposition contractuelle (30')</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* ===== TAB 3: ENTREPRISE ===== */}
              {activeTab === "entreprise" && (
                <div className="space-y-6">
                  
                  <div className="flex justify-end">
                    <button
                      onClick={handleEnrichOpportunityCompany}
                      className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-[#F5F6FA] hover:bg-white/10 hover:border-[#FF6685]/40 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#FF6685]" />
                      <span>Rechercher plus d'informations sur le web</span>
                    </button>
                  </div>

                  {/* Identité & Présentation */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-rose-400" />
                      <h4 className="text-sm font-bold text-white">Identité & Présentation de {selectedOpp.companyName}</h4>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {selectedOpp.extractedInfo?.entrepriseDetails?.presentation || 
                        `${selectedOpp.companyName} est une organisation de référence dans son secteur, reconnue pour ses perspectives d'évolution et sa politique d'accueil des alternants.`}
                    </p>
                  </div>

                  {/* 4 champs clés : Groupe, Secteur, Taille, Siège */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="text-[11px] font-semibold text-slate-400 mb-1">Groupe / Maison mère</div>
                      <div className="text-xs font-bold text-slate-100">
                        {selectedOpp.extractedInfo?.entrepriseDetails?.parentGroup || "Non spécifié"}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="text-[11px] font-semibold text-slate-400 mb-1">Secteur d'activité</div>
                      <div className="text-xs font-bold text-slate-100">
                        {selectedOpp.extractedInfo?.entrepriseDetails?.secteur || "Banque & Finance"}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="text-[11px] font-semibold text-slate-400 mb-1">Taille / Effectif</div>
                      <div className="text-xs font-bold text-slate-100">
                        {selectedOpp.extractedInfo?.entrepriseDetails?.taille || "Non spécifié"}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="text-[11px] font-semibold text-slate-400 mb-1">Localisation du siège</div>
                      <div className="text-xs font-bold text-slate-100">
                        {selectedOpp.extractedInfo?.entrepriseDetails?.siege || selectedOpp.location}
                      </div>
                    </div>
                  </div>

                  {/* Chiffres clés & Métriques */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      Chiffres clés & Métriques
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {selectedOpp.extractedInfo?.entrepriseDetails?.chiffresCles && selectedOpp.extractedInfo.entrepriseDetails.chiffresCles.length > 0 ? (
                        selectedOpp.extractedInfo.entrepriseDetails.chiffresCles.map((stat, i) => (
                          <div key={i} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                            <div className="text-xl font-extrabold text-white tracking-tight">{stat.value}</div>
                            <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                            <div className="text-xl font-extrabold text-white tracking-tight">+ 2 500</div>
                            <div className="text-xs text-slate-400 mt-1">Collaborateurs en région</div>
                          </div>
                          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                            <div className="text-xl font-extrabold text-white tracking-tight">1er</div>
                            <div className="text-xs text-slate-400 mt-1">Réseau bancaire régional</div>
                          </div>
                          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                            <div className="text-xl font-extrabold text-white tracking-tight">100%</div>
                            <div className="text-xs text-slate-400 mt-1">Ancrage territorial</div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Contexte de croissance & Faits marquants */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-rose-400" />
                      Contexte de croissance & Faits marquants
                    </h4>
                    <ul className="space-y-2 pt-1 text-xs text-slate-300">
                      {selectedOpp.extractedInfo?.entrepriseDetails?.faitsMarquants && selectedOpp.extractedInfo.entrepriseDetails.faitsMarquants.length > 0 ? (
                        selectedOpp.extractedInfo.entrepriseDetails.faitsMarquants.map((f, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))
                      ) : (
                        <>
                          <li className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
                            <span>Accélération des recrutements sur les métiers de la gestion de patrimoine et de l'analyse financière</span>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
                            <span>Transformation digitale des agences et des outils de relation client omnicanaux</span>
                          </li>
                        </>
                      )}
                    </ul>
                  </div>

                  {/* Partenaires & Clients cités */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-sky-400" />
                      Partenaires & Clients cités
                    </h4>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {selectedOpp.extractedInfo?.entrepriseDetails?.partenairesClients && selectedOpp.extractedInfo.entrepriseDetails.partenairesClients.length > 0 ? (
                        selectedOpp.extractedInfo.entrepriseDetails.partenairesClients.map((p, i) => (
                          <span key={i} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-200 font-medium">
                            {p}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">Entreprises régionales, professionnels indépendants et particuliers</span>
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* ===== TAB 4: WORKFLOW & SUIVI ===== */}
              {activeTab === "workflow" && (
                <div className="space-y-6">
                  
                  {/* Function to change workflow step with bi-directional pipeline sync */}
                  {(() => {
                    const workflowStepsList = [
                      { step: 1, name: "Découverte & Mise de côté", desc: "Offre repérée, enregistrée ou importée.", category: "À explorer", status: "to_explore" },
                      { step: 2, name: "Analyse de l'offre & Fit", desc: "Analyse des exigences, culture & adéquation.", category: "À explorer", status: "to_explore" },
                      { step: 3, name: "Préparation & Personnalisation", desc: "Rédaction LM, adaptation CV & fiche entreprise.", category: "À préparer", status: "to_prepare" },
                      { step: 4, name: "Relecture & Validation finale", desc: "Vérification des pièces & préparation de l'envoi.", category: "À préparer", status: "to_prepare" },
                      { step: 5, name: "Candidature envoyée", desc: "Transmission effective de la candidature.", category: "Candidaté", status: "applied" },
                      { step: 6, name: "Confirmation & Suivi post-envoi", desc: "Accusé de réception & planification de relance.", category: "Candidaté", status: "applied" },
                      { step: 7, name: "Entretiens & Évaluations", desc: "Entretiens (RH, Opérationnel), tests & cas pratiques.", category: "En cours", status: "in_process" },
                      { step: 8, name: "Proposition & Négociation", desc: "Offre reçue & négociation de contrat/dates.", category: "En cours", status: "in_process" },
                      { step: 9, name: "Déclaration & Intégration", desc: "Validation finale, signature & préparation d'arrivée.", category: "En cours", status: "in_process" }
                    ];

                    const currentStepIdx = (selectedOpp.workflowStep || 1) - 1;
                    const currentStepConfig = workflowStepsList[currentStepIdx] || workflowStepsList[0];

                    const handleSelectStep = (targetStep: number) => {
                      let newStatus: OpportunityStatus = selectedOpp.status;
                      if (targetStep <= 2) newStatus = "to_explore";
                      else if (targetStep <= 4) newStatus = "to_prepare";
                      else if (targetStep <= 6) newStatus = "applied";
                      else newStatus = "in_process";

                      const updated: Opportunity = {
                        ...selectedOpp,
                        workflowStep: targetStep,
                        status: newStatus
                      };

                      setSelectedOpp(updated);
                      dbStore.updateOpportunity(updated);
                      const targetName = workflowStepsList[targetStep - 1]?.name || `Étape ${targetStep}`;
                      const targetCat = workflowStepsList[targetStep - 1]?.category || "Pipeline";
                      showToast(`Étape ${targetStep}/9 activée : "${targetName}" (Catégorie : ${targetCat})`, "success");
                    };

                    return (
                      <>
                        {/* Bandeau Étape actuelle du workflow */}
                        <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-500/10 via-black/40 to-black/40 border border-rose-500/25 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300">Étape actuelle</span>
                                <span className="text-slate-600">•</span>
                                <span className="text-xs text-slate-300">
                                  Étape {selectedOpp.workflowStep || 1} sur 9
                                </span>
                                <span className="text-slate-600">•</span>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white/10 text-white">
                                  {currentStepConfig.category}
                                </span>
                              </div>
                              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                                <span>{currentStepConfig.name}</span>
                              </h3>
                              <p className="text-xs text-slate-400 mt-1">
                                {currentStepConfig.desc}
                              </p>
                            </div>

                            {/* Action contextuelle */}
                            <div className="flex items-center gap-2 self-start sm:self-center">
                              {selectedOpp.workflowStep && selectedOpp.workflowStep < 9 && (
                                <button
                                  onClick={() => handleSelectStep(Math.min(9, (selectedOpp.workflowStep || 1) + 1))}
                                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm shadow-rose-500/20"
                                >
                                  Passer à l'étape suivante (0{(selectedOpp.workflowStep || 1) + 1}) →
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Progress Bar 1 to 9 */}
                          <div className="space-y-1.5 pt-1">
                            <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                              <div 
                                className="h-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all duration-300"
                                style={{ width: `${((selectedOpp.workflowStep || 1) / 9) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Pipeline de suivi (9 étapes complètes) */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                              <Layers className="w-4 h-4 text-rose-400" />
                              Pipeline de suivi (9 étapes de candidature)
                            </h4>
                            <span className="text-[11px] text-slate-500">Clique sur une étape pour basculer la progression</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {workflowStepsList.map((item) => {
                              const currentStep = selectedOpp.workflowStep || 1;
                              const isCurrent = currentStep === item.step;
                              const isPast = currentStep > item.step;
                              const isFuture = currentStep < item.step;

                              return (
                                <button
                                  key={item.step}
                                  onClick={() => handleSelectStep(item.step)}
                                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                                    isCurrent
                                      ? "bg-rose-500/15 border-rose-500/50 shadow-md shadow-rose-500/10 ring-1 ring-rose-500/30"
                                      : isPast
                                      ? "bg-emerald-500/5 border-emerald-500/20 text-slate-300 hover:bg-emerald-500/10"
                                      : "bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/5"
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className={`text-xs font-mono font-bold ${isCurrent ? "text-rose-400" : isPast ? "text-emerald-400" : "text-slate-500"}`}>
                                      0{item.step}
                                    </span>
                                    {isCurrent && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white uppercase tracking-wider">
                                        En cours
                                      </span>
                                    )}
                                    {isPast && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
                                        Validée
                                      </span>
                                    )}
                                    {isFuture && (
                                      <span className="text-[10px] text-slate-500 font-medium">
                                        À venir
                                      </span>
                                    )}
                                  </div>
                                  <div className={`text-xs font-bold ${isCurrent ? "text-white" : "text-slate-200"}`}>
                                    {item.name}
                                  </div>
                                  <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                                    {item.desc}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono mt-1.5 pt-1 border-t border-white/5">
                                    Catégorie : {item.category}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  {/* Notes de workflow / Journal des échanges */}
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Journal des échanges & Remarques de suivi
                    </h5>
                    <textarea
                      value={selectedOpp.notes}
                      onChange={(e) => {
                        const updated = { ...selectedOpp, notes: e.target.value };
                        setSelectedOpp(updated);
                        dbStore.updateOpportunity(updated);
                      }}
                      className="w-full min-h-[100px] bg-black/30 border border-white/10 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-white/20"
                      placeholder="Ex: Candidature transmise par mail le 12, relance effectuée le 20 avec Sophie Martin, retour positif..."
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Sauvegarde automatique immédiate</span>
                      <span>Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>

                </div>
              )}

              {/* ===== TAB 5: PRISE DE CONTACT & RELANCES IA ===== */}
              {activeTab === "reseau" && (
                <div className="space-y-6">
                  {(() => {
                    const allContacts = dbStore.getContacts();
                    const recruiterId = selectedOpp.recruiterContact?.contactId || selectedOpp.recruiterContact?.id;
                    let realContact = allContacts.find(c => c.id === recruiterId || c.opportunityId === selectedOpp.id);

                    if (!realContact && selectedOpp.recruiterContact?.name) {
                      const res = resolveContact({
                        fullName: selectedOpp.recruiterContact.name,
                        email: selectedOpp.recruiterContact.email,
                        linkedInUrl: selectedOpp.recruiterContact.linkedinUrl || selectedOpp.recruiterContact.linkedin,
                        companyName: selectedOpp.companyName
                      }, allContacts);
                      if (res.matchedContact) {
                        realContact = res.matchedContact;
                      }
                    }

                    const oppRecruiterName = selectedOpp.recruiterContact?.name || realContact?.fullName || "";
                    const oppRecruiterRole = selectedOpp.recruiterContact?.role || realContact?.jobTitle || "Responsable du Recrutement";
                    
                    const oppContact: Contact = realContact || {
                      id: `opp_contact_${selectedOpp.id}`,
                      fullName: oppRecruiterName || `Recruteur ${selectedOpp.companyName}`,
                      firstName: oppRecruiterName ? oppRecruiterName.split(" ")[0] : "Responsable Recrutement",
                      lastName: oppRecruiterName ? oppRecruiterName.split(" ").slice(1).join(" ") : selectedOpp.companyName,
                      companyId: selectedOpp.companyId || "",
                      companyName: selectedOpp.companyName,
                      jobTitle: oppRecruiterRole,
                      normalizedJobTitle: oppRecruiterRole,
                      category: "recruiter",
                      relevanceScore: 92,
                      connectionPoints: [`Offre ciblée : ${selectedOpp.title} (${selectedOpp.contractType})`],
                      previousCompanies: [],
                      email: selectedOpp.recruiterContact?.email,
                      phone: selectedOpp.recruiterContact?.phone,
                      linkedInUrl: selectedOpp.recruiterContact?.linkedinUrl || selectedOpp.recruiterContact?.linkedin,
                      notes: `Opportunité : ${selectedOpp.title} chez ${selectedOpp.companyName} (${selectedOpp.contractType})`,
                      opportunityId: selectedOpp.id,
                      opportunityTitle: selectedOpp.title,
                      createdAt: new Date().toISOString()
                    };

                    return (
                      <div className="space-y-4">
                        {/* Synced Contact Card Banner */}
                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-[#FF6685]" />
                              <h4 className="text-xs font-bold uppercase tracking-wider text-[#F5F6FA] font-display">
                                Prise de contact ciblée pour {selectedOpp.title}
                              </h4>
                            </div>
                            <p className="text-[11px] text-[#9AA0B2]">
                              Génération contextuelle IA personnalisée selon votre profil, l'offre de {selectedOpp.companyName} et l'interlocuteur.
                            </p>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                            {realContact ? (
                              <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[rgba(18,183,106,0.14)] text-[#34D399] border border-[rgba(18,183,106,0.28)] flex items-center gap-1.5 shadow-[0_0_12px_rgba(18,183,106,0.15)]">
                                <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" />
                                Contact synchronisé dans l'annuaire
                              </span>
                            ) : selectedOpp.recruiterContact?.name ? (
                              <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
                                <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                                Contact RH : {selectedOpp.recruiterContact.name}
                              </span>
                            ) : (
                              <span className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white/5 text-[#9AA0B2] border border-white/10">
                                Contact à préciser
                              </span>
                            )}
                          </div>
                        </div>

                        <NetworkingMessageGenerator
                          contact={oppContact}
                          profile={candidateProfile}
                          opportunity={selectedOpp}
                          onUpdate={(updated) => {
                            if (updated.aiCustomMessage) {
                              const updatedOpp: Opportunity = {
                                ...selectedOpp,
                                notes: selectedOpp.notes 
                                  ? `${selectedOpp.notes}\n\n[Message Réseau généré] :\n${updated.aiCustomMessage}`
                                  : `[Message Réseau généré] :\n${updated.aiCustomMessage}`
                              };
                              setSelectedOpp(updatedOpp);
                              dbStore.updateOpportunity(updatedOpp);
                            }
                          }}
                          showToast={showToast}
                        />
                      </div>
                    );
                  })()}
                </div>
              )}

            </div>

            {/* === 4. MODAL FOOTER (COMMON TO ALL 4 TABS) === */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-5 border-t border-white/10">
              {/* Bottom Left: Supprimer l'opportunité */}
              <button
                onClick={() => setOppToDelete(selectedOpp)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer l'opportunité</span>
              </button>

              {/* Bottom Right Actions: Modifier, Ré-extraire avec l'IA, Fermer */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => handleOpenEditModal(selectedOpp)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-300" />
                  <span>Modifier</span>
                </button>

                <button
                  onClick={() => {
                    setReExtractOpp(selectedOpp);
                    setIsAiExtractionModalOpen(true);
                    showToast("Ouverture de l'extracteur IA pour ré-analyse...", "ai");
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-500/15 to-purple-500/15 hover:from-rose-500/25 hover:to-purple-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                  <span>Ré-extraire avec l'IA</span>
                </button>

                <GlassButton variant="secondary" onClick={() => setSelectedOpp(null)}>
                  Fermer
                </GlassButton>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* AI Extraction Modal (3 ingestion methods, cascade fallback, editable review form) */}
      <JobExtractionModal
        isOpen={isAiExtractionModalOpen}
        onClose={() => {
          setIsAiExtractionModalOpen(false);
          setReExtractOpp(null);
        }}
        showToast={showToast}
        initialText={reExtractOpp?.notes || ""}
        initialUrl={reExtractOpp?.url || ""}
        existingOpportunity={reExtractOpp}
        onSuccess={(saved) => {
          if (selectedOpp && selectedOpp.id === saved.id) {
            setSelectedOpp(saved);
          }
        }}
      />

      {/* Associate Existing Contact Modal */}
      <Modal
        isOpen={isAssociateModalOpen}
        onClose={() => {
          setIsAssociateModalOpen(false);
          setAssociateSearch("");
        }}
        title={`Associer un contact existant à "${selectedOpp?.title || "l'opportunité"}"`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9AA0B2]" />
            <input
              type="text"
              value={associateSearch}
              onChange={(e) => setAssociateSearch(e.target.value)}
              placeholder="Rechercher par nom, entreprise, rôle..."
              className="w-full bg-black/30 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-white/25"
            />
          </div>

          <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {(() => {
              const allContacts = dbStore.getContacts();
              const currentlyAssociatedIds = selectedOpp ? getOppAssociatedContacts(selectedOpp).map(c => c.id) : [];
              const unassociated = allContacts.filter(c => !currentlyAssociatedIds.includes(c.id));
              const filtered = unassociated.filter(c => {
                if (!associateSearch.trim()) return true;
                const query = associateSearch.toLowerCase();
                return (
                  c.fullName.toLowerCase().includes(query) ||
                  c.companyName.toLowerCase().includes(query) ||
                  c.jobTitle.toLowerCase().includes(query)
                );
              });

              if (filtered.length === 0) {
                return (
                  <div className="p-6 text-center text-xs text-slate-400 space-y-1">
                    <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-slate-300">Aucun contact disponible trouvé</p>
                    <p className="text-[11px] text-slate-500">
                      {associateSearch.trim() ? "Essayez une autre recherche." : "Tous vos contacts sont déjà associés ou vous n'avez pas encore de contact enregistré."}
                    </p>
                  </div>
                );
              }

              return filtered.map(c => (
                <div key={c.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 flex items-center justify-between gap-3 transition-colors">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{c.fullName}</div>
                    <div className="text-[11px] text-[#9AA0B2] truncate">{c.jobTitle} {c.companyName ? `• ${c.companyName}` : ''}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAssociateContact(c.id)}
                    className="px-3 py-1.5 rounded-lg bg-[#D81A45]/20 hover:bg-[#D81A45]/30 text-xs text-[#FF6685] font-semibold border border-[#D81A45]/40 flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Associer</span>
                  </button>
                </div>
              ));
            })()}
          </div>

          <div className="flex justify-end pt-2 border-t border-white/5">
            <GlassButton variant="ghost" size="sm" onClick={() => setIsAssociateModalOpen(false)}>
              Fermer
            </GlassButton>
          </div>
        </div>
      </Modal>

      {/* Quick Create Contact Modal */}
      <Modal
        isOpen={isQuickAddModalOpen}
        onClose={() => setIsQuickAddModalOpen(false)}
        title={`Créer & associer un contact à "${selectedOpp?.title || "l'opportunité"}"`}
        size="md"
      >
        <form onSubmit={handleQuickCreateContact} className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-300 font-semibold mb-1 block">Nom complet *</label>
              <input
                type="text"
                required
                placeholder="Ex: Sophie Martin"
                value={quickContactName}
                onChange={(e) => setQuickContactName(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/25"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold mb-1 block">Poste / Rôle</label>
              <input
                type="text"
                placeholder="Ex: Responsable Recrutement RH"
                value={quickContactRole}
                onChange={(e) => setQuickContactRole(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/25"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold mb-1 block">E-mail</label>
                <input
                  type="email"
                  placeholder="Ex: s.martin@entreprise.fr"
                  value={quickContactEmail}
                  onChange={(e) => setQuickContactEmail(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/25"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold mb-1 block">Téléphone</label>
                <input
                  type="text"
                  placeholder="Ex: 06 12 34 56 78"
                  value={quickContactPhone}
                  onChange={(e) => setQuickContactPhone(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/25"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold mb-1 block">Profil LinkedIn</label>
              <input
                type="url"
                placeholder="Ex: https://linkedin.com/in/..."
                value={quickContactLinkedin}
                onChange={(e) => setQuickContactLinkedin(e.target.value)}
                className="w-full bg-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/25"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
            <GlassButton type="button" variant="ghost" size="sm" onClick={() => setIsQuickAddModalOpen(false)}>
              Annuler
            </GlassButton>
            <GlassButton type="submit" variant="primary" size="sm">
              Créer et associer
            </GlassButton>
          </div>
        </form>
      </Modal>

      {/* Delete Opportunity Confirmation Modal */}
      <Modal
        isOpen={Boolean(oppToDelete)}
        onClose={() => setOppToDelete(null)}
        title="Supprimer l'opportunité"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-200 leading-relaxed">
            Êtes-vous sûr de vouloir supprimer définitivement l'offre <strong className="text-white font-bold">{oppToDelete?.title}</strong> chez {oppToDelete?.companyName} ?
            Cette action est irréversible.
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={() => setOppToDelete(null)}
            >
              Annuler
            </GlassButton>
            <GlassButton
              variant="danger"
              size="sm"
              onClick={() => {
                if (oppToDelete) {
                  handleDeleteOpp(oppToDelete.id);
                  setOppToDelete(null);
                }
              }}
            >
              Confirmer la suppression
            </GlassButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};
