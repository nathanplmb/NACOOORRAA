import React, { useState, useEffect, useMemo } from "react";
import { 
  Contact, 
  ContactCategory, 
  ContactNetworkingStatus, 
  CandidateProfile, 
  NetworkingRelevanceItem, 
  ContactHistoryEvent 
} from "../types";
import { dbStore } from "../dbStore";
import { getCategoryBadgeStyle } from "../utils/contactMerger";
import { 
  ensureContactStrategicRelevance, 
  requestAiStrategicInterests 
} from "../utils/strategicInterests";
import { STANDARD_CONTACT_FUNCTIONS, classifyContactFunction } from "../utils/contactTaxonomy";
import { resolveCompany } from "../utils/companyResolver";
import { hasRealConversation } from "../utils/contactResolver";
import { GlassButton, Modal } from "./Shared";
import { NetworkingMessageGenerator } from "./network/NetworkingMessageGenerator";
import { 
  Building2, 
  Briefcase, 
  GraduationCap, 
  Linkedin, 
  Mail, 
  Phone, 
  Sparkles, 
  Layers, 
  Save, 
  X, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  Copy, 
  Check, 
  Calendar, 
  Clock, 
  Send, 
  History, 
  FileText, 
  Link as LinkIcon, 
  CheckCircle2, 
  Plus, 
  ArrowRight, 
  UserCheck, 
  Award, 
  RefreshCw, 
  Compass,
  ArrowLeft,
  MessageSquare,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  CheckCheck,
  User,
  AlertCircle
} from "lucide-react";

interface ContactDetailWorkspaceProps {
  contact: Contact;
  profile: CandidateProfile;
  onClose: () => void;
  onUpdate: (updatedContact: Contact) => void;
  onDelete: (contactId: string) => void;
  showToast: (message: string, type: "success" | "error" | "info" | "ai") => void;
  onStartConversation?: (contactId: string) => void;
}

export type ContactWorkspaceTab = "overview" | "networking" | "strategy" | "notes_history";

export const ContactDetailWorkspace: React.FC<ContactDetailWorkspaceProps> = ({
  contact,
  profile,
  onClose,
  onUpdate,
  onDelete,
  showToast,
  onStartConversation
}) => {
  // Navigation state (4 distinct spaces)
  const [activeTab, setActiveTab] = useState<ContactWorkspaceTab>("overview");

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Strategic networking relevance state
  const [isAnalyzingStrategic, setIsAnalyzingStrategic] = useState(false);
  const [isAddPillarModalOpen, setIsAddPillarModalOpen] = useState(false);
  const [newPillarTitle, setNewPillarTitle] = useState("");
  const [newPillarType, setNewPillarType] = useState("Opportunité");
  const [newPillarContext, setNewPillarContext] = useState("");
  const [newPillarRecommendation, setNewPillarRecommendation] = useState("");

  // Accordion collapses in Strategy tab
  const [isClassificationsOpen, setIsClassificationsOpen] = useState(true);
  const [isPillarsOpen, setIsPillarsOpen] = useState(true);
  const [isConnectionPointsOpen, setIsConnectionPointsOpen] = useState(true);
  const [isSummaryOpen, setIsSummaryOpen] = useState(true);

  // Notes state
  const [quickNoteText, setQuickNoteText] = useState("");
  const [notesDraft, setNotesDraft] = useState(contact.notes || "");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Opportunities list for linking
  const opportunities = dbStore.getOpportunities();

  // Auto-enrich strategic relevance on mount if absent
  useEffect(() => {
    if (!contact.networkingRelevance || contact.networkingRelevance.length === 0) {
      const enriched = ensureContactStrategicRelevance(contact, profile);
      dbStore.updateContact(enriched);
      onUpdate(enriched);
    }
  }, [contact.id]);

  // Keep notesDraft in sync with external contact updates
  useEffect(() => {
    setNotesDraft(contact.notes || "");
  }, [contact.notes]);

  // Avatar initial generator
  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length === 0) return "C";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

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

  const getNetworkingStatusConfig = (status?: ContactNetworkingStatus) => {
    switch (status) {
      case "contacted":
        return { 
          label: "Message envoyé", 
          color: "bg-[rgba(56,189,248,0.12)] text-[#38BDF8] border-[rgba(56,189,248,0.28)]" 
        };
      case "exchanging":
        return { 
          label: "Échange en cours", 
          color: "bg-[rgba(192,132,252,0.12)] text-[#C084FC] border-[rgba(192,132,252,0.28)]" 
        };
      case "interview_done":
        return { 
          label: "Entretien réalisé", 
          color: "bg-[rgba(18,183,106,0.14)] text-[#34D399] border-[rgba(18,183,106,0.30)]" 
        };
      case "not_interested":
        return { 
          label: "Sans suite", 
          color: "bg-white/[0.04] text-[#9AA0B2] border-white/10" 
        };
      case "to_contact":
      default:
        return { 
          label: "À contacter", 
          color: "bg-[rgba(247,144,9,0.12)] text-[#FBBF24] border-[rgba(247,144,9,0.28)]" 
        };
    }
  };

  const getPillarBadgeStyle = (pillarStr?: string) => {
    const p = (pillarStr || "").toLowerCase();
    if (p.includes("recrut") || p.includes("emploi") || p.includes("stage") || p.includes("alternan") || p.includes("décideur")) {
      return "bg-[rgba(18,183,106,0.14)] text-[#34D399] border-[rgba(18,183,106,0.28)]";
    }
    if (p.includes("alumni") || p.includes("école") || p.includes("réseau") || p.includes("relation") || p.includes("pair")) {
      return "bg-[rgba(56,189,248,0.14)] text-[#38BDF8] border-[rgba(56,189,248,0.28)]";
    }
    if (p.includes("métier") || p.includes("secteur") || p.includes("finance") || p.includes("stratég") || p.includes("marché")) {
      return "bg-[rgba(216,26,69,0.14)] text-[#FF6685] border-[rgba(216,26,69,0.28)]";
    }
    if (p.includes("conseil") || p.includes("mentor") || p.includes("expertise") || p.includes("partage")) {
      return "bg-[rgba(192,132,252,0.14)] text-[#C084FC] border-[rgba(192,132,252,0.28)]";
    }
    return "bg-[rgba(247,144,9,0.14)] text-[#FBBF24] border-[rgba(247,144,9,0.28)]";
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    showToast(`${label} copié !`, "info");
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Change networking status
  const handleUpdateNetworkingStatus = (newStatus: ContactNetworkingStatus) => {
    const historyEvent: ContactHistoryEvent = {
      id: "hist_" + Math.random().toString(36).substring(2, 9),
      type: "category_changed",
      label: `Statut networking mis à jour : ${getNetworkingStatusConfig(newStatus).label}`,
      timestamp: new Date().toISOString()
    };

    const updated: Contact = {
      ...contact,
      networkingStatus: newStatus,
      history: [historyEvent, ...(contact.history || [])]
    };
    dbStore.updateContact(updated);
    onUpdate(updated);
    showToast(`Statut mis à jour : ${getNetworkingStatusConfig(newStatus).label}`, "info");
  };

  // Link / Unlink Opportunity
  const handleLinkOpportunity = (oppId: string) => {
    const opp = opportunities.find(o => o.id === oppId);
    if (!opp) return;

    const historyEvent: ContactHistoryEvent = {
      id: "hist_" + Math.random().toString(36).substring(2, 9),
      type: "opportunity_linked",
      label: `Associé à l'opportunité : ${opp.title} (${opp.companyName})`,
      timestamp: new Date().toISOString()
    };

    const updated: Contact = {
      ...contact,
      opportunityId: opp.id,
      opportunityTitle: `${opp.title} - ${opp.companyName}`,
      history: [historyEvent, ...(contact.history || [])]
    };
    dbStore.updateContact(updated);
    onUpdate(updated);
    showToast(`Contact lié à "${opp.title}"`, "success");
  };

  const handleUnlinkOpportunity = () => {
    const updated: Contact = {
      ...contact,
      opportunityId: undefined,
      opportunityTitle: undefined
    };
    dbStore.updateContact(updated);
    onUpdate(updated);
    showToast("Association d'opportunité retirée", "info");
  };

  // Save manual notes
  const handleSaveNotes = () => {
    const historyEvent: ContactHistoryEvent = {
      id: "hist_" + Math.random().toString(36).substring(2, 9),
      type: "note_added",
      label: "Notes de suivi mises à jour",
      timestamp: new Date().toISOString()
    };

    const updated: Contact = {
      ...contact,
      notes: notesDraft,
      history: [historyEvent, ...(contact.history || [])]
    };
    dbStore.updateContact(updated);
    onUpdate(updated);
    setIsEditingNotes(false);
    showToast("Notes enregistrées", "success");
  };

  // Add quick timestamped note
  const handleAddQuickNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNoteText.trim()) return;

    const now = new Date();
    const dateFormatted = `${now.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} ${now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
    const newNoteLine = `• [${dateFormatted}] ${quickNoteText.trim()}`;
    const combinedNotes = notesDraft ? `${newNoteLine}\n${notesDraft}` : newNoteLine;

    const historyEvent: ContactHistoryEvent = {
      id: "hist_" + Math.random().toString(36).substring(2, 9),
      type: "note_added",
      label: `Note ajoutée : "${quickNoteText.slice(0, 35)}..."`,
      timestamp: new Date().toISOString()
    };

    const updated: Contact = {
      ...contact,
      notes: combinedNotes,
      history: [historyEvent, ...(contact.history || [])]
    };
    dbStore.updateContact(updated);
    onUpdate(updated);
    setNotesDraft(combinedNotes);
    setQuickNoteText("");
    showToast("Note enregistrée dans le carnet", "success");
  };

  // Re-evaluate strategic relevance with Gemini AI
  const handleRefreshStrategic = async () => {
    setIsAnalyzingStrategic(true);
    showToast("Analyse stratégique du profil et détection des axes réseau par l'IA...", "ai");
    try {
      const result = await requestAiStrategicInterests(contact, profile);
      const historyEvent: ContactHistoryEvent = {
        id: "hist_" + Math.random().toString(36).substring(2, 9),
        type: "category_changed",
        label: "Axes d'intérêt stratégique réseau réévalués avec l'IA",
        timestamp: new Date().toISOString()
      };
      const updated: Contact = {
        ...contact,
        networkingRelevance: result.networkingRelevance,
        connectionPoints: result.connectionPoints.length > 0 ? result.connectionPoints : (contact.connectionPoints || []),
        summary: result.summary || contact.summary,
        relevanceScore: result.relevanceScore || contact.relevanceScore,
        history: [historyEvent, ...(contact.history || [])]
      };
      dbStore.updateContact(updated);
      onUpdate(updated);
      showToast("Intérêts stratégiques réseau actualisés !", "success");
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de l'analyse stratégique", "error");
    } finally {
      setIsAnalyzingStrategic(false);
    }
  };

  const handleAddCustomPillar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPillarTitle.trim()) return;

    const newItem: NetworkingRelevanceItem = {
      pillar: newPillarTitle.trim(),
      type: newPillarType.trim() || "Axe personnalisé",
      context: newPillarContext.trim() || `Relation professionnelle avec ${contact.fullName}`,
      recommendation: newPillarRecommendation.trim() || "Conserver des échanges réguliers et structurés.",
      confidence: "high",
      reason: "Ajouté manuellement"
    };

    const updatedPillars = [...(contact.networkingRelevance || []), newItem];
    const updated: Contact = {
      ...contact,
      networkingRelevance: updatedPillars
    };
    dbStore.updateContact(updated);
    onUpdate(updated);
    setNewPillarTitle("");
    setNewPillarContext("");
    setNewPillarRecommendation("");
    setIsAddPillarModalOpen(false);
    showToast("Axe stratégique ajouté", "success");
  };

  const handleRemovePillar = (index: number) => {
    const updatedPillars = (contact.networkingRelevance || []).filter((_, i) => i !== index);
    const updated: Contact = { ...contact, networkingRelevance: updatedPillars };
    dbStore.updateContact(updated);
    onUpdate(updated);
    showToast("Axe stratégique retiré", "info");
  };

  const handleApplyRecommendationToMessage = (rec: string) => {
    const prev = contact.aiCustomMessage || "";
    const intro = `Bonjour ${contact.firstName || contact.fullName},\n\n`;
    const newMsg = !prev 
      ? `${intro}Je me permets de vous contacter car je prépare mon insertion dans le secteur ${contact.sector || "Banque & Finance"}.\n\n${rec}\n\nBien cordialement,\n${profile.fullName || ""}`
      : `${prev}\n\n[Approche recommandée : ${rec}]`;

    const updated: Contact = {
      ...contact,
      aiCustomMessage: newMsg
    };
    dbStore.updateContact(updated);
    onUpdate(updated);
    setActiveTab("networking");
    showToast("Recommandation intégrée au message !", "success");
  };

  // Mark next follow-up as done or schedule new follow-up
  const handleMarkFollowUpDone = () => {
    const historyEvent: ContactHistoryEvent = {
      id: "hist_" + Math.random().toString(36).substring(2, 9),
      type: "outreach_sent",
      label: `Prochaine action effectuée : Relance consignée`,
      timestamp: new Date().toISOString()
    };
    const updated: Contact = {
      ...contact,
      nextFollowUpDate: undefined,
      history: [historyEvent, ...(contact.history || [])]
    };
    dbStore.updateContact(updated);
    onUpdate(updated);
    showToast("Relance marquée comme effectuée !", "success");
  };

  // Timeline grouping by human readable date
  const groupedTimeline = useMemo(() => {
    const historyList = contact.history && contact.history.length > 0 ? contact.history : [
      {
        id: "initial_creation",
        type: "category_changed" as const,
        label: "Contact enregistré dans votre réseau NACORA",
        timestamp: contact.createdAt || new Date().toISOString()
      }
    ];

    const todayStr = new Date().toDateString();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toDateString();

    const groups: { [key: string]: { label: string; events: ContactHistoryEvent[] } } = {};

    historyList.forEach((ev) => {
      const d = new Date(ev.timestamp);
      const isDateValid = !isNaN(d.getTime());
      const dateKey = isDateValid ? d.toISOString().split("T")[0] : "legacy";

      let headerLabel = "";
      if (isDateValid) {
        if (d.toDateString() === todayStr) {
          headerLabel = "AUJOURD'HUI";
        } else if (d.toDateString() === yesterdayStr) {
          headerLabel = "HIER";
        } else {
          headerLabel = d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }).toUpperCase();
        }
      } else {
        headerLabel = "ACTIVITÉ ANTÉRIEURE";
      }

      if (!groups[dateKey]) {
        groups[dateKey] = { label: headerLabel, events: [] };
      }
      groups[dateKey].events.push(ev);
    });

    return Object.values(groups);
  }, [contact.history, contact.createdAt]);

  const currentStatusConfig = getNetworkingStatusConfig(contact.networkingStatus);
  const initials = getInitials(contact.fullName);
  const avatarStyle = getAvatarGradient(contact.fullName);

  // Next action computation helper
  const nextActionDetails = useMemo(() => {
    if (contact.nextFollowUpDate) {
      const parsed = new Date(contact.nextFollowUpDate);
      const isOverdue = !isNaN(parsed.getTime()) && parsed < new Date();
      return {
        hasDate: true,
        dateFormatted: !isNaN(parsed.getTime()) ? parsed.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : contact.nextFollowUpDate,
        title: contact.outreachStage?.includes("relance") ? "Relance à effectuer" : "Prochaine relance réseau",
        isOverdue
      };
    }
    if (contact.networkingStatus === "to_contact") {
      return {
        hasDate: false,
        title: "Premier message d'approche",
        dateFormatted: "À envoyer dès que possible",
        isOverdue: false
      };
    }
    if (contact.networkingStatus === "contacted") {
      return {
        hasDate: false,
        title: "Relance à programmer (J+7)",
        dateFormatted: "En attente de réponse",
        isOverdue: false
      };
    }
    return {
      hasDate: false,
      title: "Échange en cours",
      dateFormatted: "Maintenir le lien",
      isOverdue: false
    };
  }, [contact.nextFollowUpDate, contact.networkingStatus, contact.outreachStage]);

  return (
    <div className="space-y-4 animate-in fade-in duration-200 w-full mb-16">
      
      {/* ========================================================================= */}
      {/* 1. STICKY CLEAN & COMPACT HEADER (Always visible during scrolling)         */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-30 bg-[#060812]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.45)] px-4 py-3 sm:px-6 sm:py-4 transition-all space-y-3">
        
        {/* Top bar : Breadcrumb & Action icons */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#9AA0B2] hover:text-[#F5F6FA] border border-white/10 text-xs font-semibold transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Contacts</span>
          </button>

          <div className="flex items-center gap-2">
            {contact.linkedInUrl && (
              <a
                href={contact.linkedInUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0A66C2]/15 hover:bg-[#0A66C2]/25 text-[#38BDF8] border border-[#0A66C2]/30 text-xs font-semibold transition-colors shrink-0"
                title="Consulter le profil LinkedIn"
              >
                <Linkedin className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">LinkedIn</span>
                <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
              </a>
            )}

            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#F5F6FA] border border-white/10 text-xs font-semibold transition-colors cursor-pointer shrink-0"
              title="Modifier toutes les informations"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#9AA0B2]" />
              <span>Modifier</span>
            </button>

            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-[#F04438] border border-red-500/20 transition-colors cursor-pointer shrink-0"
              title="Supprimer le contact"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#9AA0B2] hover:text-[#F5F6FA] border border-white/10 transition-colors cursor-pointer shrink-0"
              title="Fermer la fiche"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Identity bar : Avatar + Name + Role + Score + Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-white/5">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${avatarStyle} border flex items-center justify-center font-black text-sm sm:text-base shrink-0 select-none shadow-md`}>
              {initials}
            </div>

            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-[#F5F6FA] tracking-tight font-display truncate">
                  {contact.fullName}
                </h1>
                
                {/* Score badge */}
                <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded-full bg-white/[0.05] text-[#F5F6FA] border border-white/10 tabular-nums shrink-0">
                  {contact.relevanceScore || 50}% Pertinence
                </span>

                {/* Outreach status badge */}
                <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 ${currentStatusConfig.color}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {currentStatusConfig.label}
                </span>
              </div>

              {/* Subtitle: Job · Function · Company · Sector */}
              <div className="flex items-center gap-2 text-xs text-[#9AA0B2] truncate flex-wrap">
                <span className="text-[#F5F6FA] font-medium truncate">{contact.jobTitle}</span>
                {contact.function && contact.function !== "Inconnue" && (
                  <>
                    <span aria-hidden="true" className="text-white/20">·</span>
                    <span className="px-2 py-0.5 rounded-md bg-[rgba(192,132,252,0.12)] border border-[rgba(192,132,252,0.25)] text-[#C084FC] text-[10px] font-semibold uppercase tracking-wider">
                      {contact.function}
                    </span>
                  </>
                )}
                <span aria-hidden="true" className="text-white/20">·</span>
                <span className="text-[#FF6685] font-semibold flex items-center gap-1 truncate">
                  <Building2 className="w-3 h-3 shrink-0 inline" />
                  {contact.companyName}
                </span>
                {contact.sector && (
                  <>
                    <span aria-hidden="true" className="text-white/20 hidden sm:inline">·</span>
                    <span className="truncate hidden sm:inline">{contact.sector}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick next action preview in header */}
          <div className="flex items-center gap-2 shrink-0 sm:self-center">
            {contact.nextFollowUpDate && (
              <button
                onClick={() => setActiveTab("networking")}
                className="px-3 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Accéder directement au message de relance"
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Relance : {nextActionDetails.dateFormatted}</span>
                <ArrowRight className="w-3 h-3 text-amber-400" />
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. THE 4 REAL NAVIGATION TABS (Strictly isolated workspaces)               */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-1 pt-2 border-t border-white/5 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`py-2 px-3.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === "overview"
                ? "bg-white/[0.14] text-[#F5F6FA] shadow-sm border border-white/20"
                : "text-[#9AA0B2] hover:text-[#F5F6FA] hover:bg-white/[0.04]"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>Vue d'ensemble</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("networking")}
            className={`py-2 px-3.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === "networking"
                ? "bg-[#D81A45] text-white shadow-sm"
                : "text-[#9AA0B2] hover:text-[#F5F6FA] hover:bg-white/[0.04]"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Networking & Messages</span>
            {contact.aiCustomMessage && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("strategy")}
            className={`py-2 px-3.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === "strategy"
                ? "bg-white/[0.14] text-[#F5F6FA] shadow-sm border border-white/20"
                : "text-[#9AA0B2] hover:text-[#F5F6FA] hover:bg-white/[0.04]"
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-[#FF6685]" />
            <span>Analyse & Stratégie</span>
            {contact.networkingRelevance && contact.networkingRelevance.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/10 text-white font-mono">
                {contact.networkingRelevance.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("notes_history")}
            className={`py-2 px-3.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === "notes_history"
                ? "bg-white/[0.14] text-[#F5F6FA] shadow-sm border border-white/20"
                : "text-[#9AA0B2] hover:text-[#F5F6FA] hover:bg-white/[0.04]"
            }`}
          >
            <History className="w-3.5 h-3.5 text-[#C084FC]" />
            <span>Historique de la relation</span>
            {((contact.history?.length || 0) + (contact.conversationMessages?.length || 0)) > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/10 text-white font-mono">
                {(contact.history?.length || 0) + (contact.conversationMessages?.length || 0)}
              </span>
            )}
          </button>
        </div>

      </header>

      {/* ========================================================================= */}
      {/* TAB 1: VUE D'ENSEMBLE (Comprendre le contact rapidement en 2 colonnes)     */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start animate-in fade-in duration-150">
          
          {/* GAUCHE : Informations principales, Coordonnées, Professionnel */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* 1. INFORMATIONS PRINCIPALES */}
            <div className="p-5 rounded-2xl bg-white/[0.025] border border-white/10 space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F6FA] flex items-center gap-2 font-display">
                  <UserCheck className="w-4 h-4 text-[#38BDF8]" />
                  Informations Principales
                </h3>
                <span className="text-[11px] text-[#9AA0B2] flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#9AA0B2]" />
                  Ajouté le {new Date(contact.createdAt).toLocaleDateString("fr-FR")}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Statut professionnel */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-[#9AA0B2] uppercase font-semibold text-[10px] block">Statut d'activité</span>
                  <p className="text-[#F5F6FA] font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#34D399]" />
                    Professionnel en activité
                  </p>
                </div>

                {/* Catégorisation / Rôle */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-[#9AA0B2] uppercase font-semibold text-[10px] block">Rôle clé identifié</span>
                  <p className="text-[#FF6685] font-semibold">
                    {contact.category === "recruiter" ? "Recruteur / Talent Acquisition" :
                     contact.category === "alumni" ? "Alumni & Réseau Académique" :
                     contact.category === "sector_pro" ? "Décideur Métier & Finance" :
                     contact.category === "student" ? "Pair / Étudiant" : "Professionnel Réseau"}
                  </p>
                </div>

                {/* Secteur d'activité */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-[#9AA0B2] uppercase font-semibold text-[10px] block">Secteur d'activité</span>
                  <p className="text-[#F5F6FA] font-medium">
                    {contact.sector || "Banque & Services financiers"}
                  </p>
                </div>

                {/* Niveau de séniorité */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-[#9AA0B2] uppercase font-semibold text-[10px] block">Niveau / Type</span>
                  <p className="text-[#F5F6FA] font-medium">
                    {contact.profileLevel || "Décideur confirmé"}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. COORDONNÉES & CANAUX DIRECTS */}
            <div className="p-5 rounded-2xl bg-white/[0.025] border border-white/10 space-y-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F6FA] flex items-center gap-2 font-display">
                <Mail className="w-4 h-4 text-[#FF6685]" />
                Coordonnées & Canaux Directs
              </h3>

              <div className="space-y-2 text-xs">
                {/* Email */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[#9AA0B2] text-[10px] uppercase font-semibold block">Email professionnel</span>
                    {contact.email ? (
                      <a href={`mailto:${contact.email}`} className="text-[#F5F6FA] hover:text-[#FF6685] font-medium truncate block">
                        {contact.email}
                      </a>
                    ) : (
                      <span className="text-[#9AA0B2]/60 italic">Non renseigné</span>
                    )}
                  </div>
                  {contact.email && (
                    <button 
                      onClick={() => handleCopyText(contact.email!, "Email")}
                      className="text-[#9AA0B2] hover:text-white p-1.5 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer shrink-0 transition-colors"
                      title="Copier l'email"
                    >
                      {copiedField === "Email" ? <Check className="w-3.5 h-3.5 text-[#34D399]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                {/* Téléphone */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[#9AA0B2] text-[10px] uppercase font-semibold block">Téléphone direct</span>
                    {contact.phone ? (
                      <a href={`tel:${contact.phone}`} className="text-[#F5F6FA] hover:text-[#FF6685] font-medium block">
                        {contact.phone}
                      </a>
                    ) : (
                      <span className="text-[#9AA0B2]/60 italic">Non renseigné</span>
                    )}
                  </div>
                  {contact.phone && (
                    <button 
                      onClick={() => handleCopyText(contact.phone!, "Téléphone")}
                      className="text-[#9AA0B2] hover:text-white p-1.5 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer shrink-0 transition-colors"
                      title="Copier le téléphone"
                    >
                      {copiedField === "Téléphone" ? <Check className="w-3.5 h-3.5 text-[#34D399]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                {/* LinkedIn */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[#9AA0B2] text-[10px] uppercase font-semibold block">Profil LinkedIn</span>
                    {contact.linkedInUrl ? (
                      <a
                        href={contact.linkedInUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#38BDF8] hover:underline font-medium truncate flex items-center gap-1.5"
                      >
                        <Linkedin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{contact.linkedInUrl.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "")}</span>
                      </a>
                    ) : (
                      <span className="text-[#9AA0B2]/60 italic">Non renseigné</span>
                    )}
                  </div>
                  {contact.linkedInUrl && (
                    <button 
                      onClick={() => handleCopyText(contact.linkedInUrl!, "LinkedIn")}
                      className="text-[#9AA0B2] hover:text-white p-1.5 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer shrink-0 transition-colors"
                      title="Copier le lien LinkedIn"
                    >
                      {copiedField === "LinkedIn" ? <Check className="w-3.5 h-3.5 text-[#34D399]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                {/* Portail / Site */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[#9AA0B2] text-[10px] uppercase font-semibold block">Lien web / Portail de recrutement</span>
                    {contact.contactUrl ? (
                      <a
                        href={contact.contactUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#F5F6FA] hover:text-[#FF6685] hover:underline flex items-center gap-1.5 truncate font-medium"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-[#9AA0B2] shrink-0" />
                        <span className="truncate">{contact.contactUrl}</span>
                      </a>
                    ) : (
                      <span className="text-[#9AA0B2]/60 italic">Non renseigné</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. INFORMATIONS PROFESSIONNELLES & PARCOURS */}
            <div className="p-5 rounded-2xl bg-white/[0.025] border border-white/10 space-y-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F6FA] flex items-center gap-2 font-display">
                <Briefcase className="w-4 h-4 text-[#38BDF8]" />
                Informations Professionnelles & Parcours
              </h3>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <span className="text-[#9AA0B2] uppercase font-semibold text-[10px]">Entreprise actuelle</span>
                    <p className="text-[#FF6685] font-semibold flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      {contact.companyName}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <span className="text-[#9AA0B2] uppercase font-semibold text-[10px]">Poste exact</span>
                    <p className="text-[#F5F6FA] font-medium">{contact.jobTitle}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <span className="text-[#9AA0B2] uppercase font-semibold text-[10px] flex items-center justify-between">
                      <span>Fonction normalisée</span>
                      {contact.functionConfidence && (
                        <span className="text-[9px] text-[#C084FC] uppercase font-bold">
                          {contact.functionConfidence === "high" ? "Confiance haute" : contact.functionConfidence === "medium" ? "Confiance moyenne" : "Confiance basse"}
                        </span>
                      )}
                    </span>
                    <p className="text-[#C084FC] font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-[#C084FC] shrink-0" />
                      {contact.function && contact.function !== "Inconnue" ? contact.function : "Non renseignée"}
                    </p>
                  </div>
                </div>

                {/* Formation & Écoles */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-[#9AA0B2] uppercase font-semibold text-[10px] flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-[#38BDF8]" />
                    Formation & Réseau Académique
                  </span>
                  <p className="text-[#F5F6FA] leading-relaxed">
                    {contact.academicPath || "Non renseigné lors de l'import (consultable via le profil LinkedIn)."}
                  </p>
                </div>

                {/* Entreprises précédentes */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                  <span className="text-[#9AA0B2] uppercase font-semibold text-[10px]">Entreprises Précédentes</span>
                  {contact.previousCompanies && contact.previousCompanies.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {contact.previousCompanies.map((co, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-[#F5F6FA] text-xs">
                          {co}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#9AA0B2]/60 italic">Aucune entreprise précédente renseignée</p>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* DROITE : Statut relationnel, Prochaine action clé, Relations NACORA */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* 1. PROCHAINE ACTION (Mise en avant prioritaire demandée) */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-white/[0.03] to-white/[0.01] border border-amber-500/30 space-y-3.5 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5 font-display">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Prochaine Action Recommandée
                </span>
                {nextActionDetails.hasDate && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/30 text-[10px] font-bold">
                    Planifiée
                  </span>
                )}
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                <h4 className="text-sm font-bold text-[#F5F6FA]">
                  {nextActionDetails.title}
                </h4>
                <p className="text-xs text-[#9AA0B2]">
                  Échéance : <strong className="text-amber-300">{nextActionDetails.dateFormatted}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <button
                  onClick={() => setActiveTab("networking")}
                  className="flex-1 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-[#F5F6FA] text-xs font-semibold border border-white/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#C084FC]" />
                  <span>{contact.aiCustomMessage ? "Voir le message" : "Préparer un message"}</span>
                </button>

                {onStartConversation && (
                  <button
                    onClick={() => {
                      onClose();
                      onStartConversation(contact.id);
                    }}
                    className="flex-1 px-3 py-2 rounded-xl bg-[#D81A45] hover:bg-[#FF6685] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                    title={hasRealConversation(contact) ? "Ouvrir l'échange existant dans Networking" : "Initialiser un échange dans Networking"}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{hasRealConversation(contact) ? "Ouvrir dans Networking" : "Démarrer une conversation"}</span>
                  </button>
                )}

                {nextActionDetails.hasDate && (
                  <button
                    onClick={handleMarkFollowUpDone}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-[#F5F6FA] text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
                    title="Marquer cette relance comme faite"
                  >
                    <Check className="w-3.5 h-3.5 text-[#34D399]" />
                  </button>
                )}
              </div>
            </div>

            {/* 2. STATUT DE DÉMARCHE & MISE À JOUR RAPIDE */}
            <div className="p-5 rounded-2xl bg-white/[0.025] border border-white/10 space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F6FA] flex items-center gap-2 font-display">
                  <Award className="w-4 h-4 text-[#FBBF24]" />
                  Statut de Démarche Actuel
                </h3>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[#9AA0B2] text-[10px] uppercase font-semibold">État de la relation</span>
                  <div className={`px-3 py-1 rounded-xl border text-xs font-bold inline-flex items-center gap-2 ${currentStatusConfig.color}`}>
                    <span className="w-2 h-2 rounded-full bg-current" />
                    {currentStatusConfig.label}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <span className="text-[#9AA0B2] uppercase font-semibold text-[10px] block">
                  Modifier le statut en un clic :
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {(["to_contact", "contacted", "exchanging", "interview_done", "not_interested"] as ContactNetworkingStatus[]).map((st) => {
                    const cfg = getNetworkingStatusConfig(st);
                    const isCurrent = (contact.networkingStatus || "to_contact") === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleUpdateNetworkingStatus(st)}
                        className={`px-3 py-2 rounded-xl text-left text-xs font-medium transition-all border cursor-pointer flex items-center justify-between ${
                          isCurrent 
                            ? `${cfg.color} ring-1 ring-white/20 shadow-sm font-bold` 
                            : "bg-white/[0.02] hover:bg-white/[0.06] text-[#9AA0B2] border-white/5"
                        }`}
                      >
                        <span>{cfg.label}</span>
                        {isCurrent && <Check className="w-3.5 h-3.5 text-current" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3. RELATIONS AVEC LA PLATEFORME NACORA */}
            <div className="p-5 rounded-2xl bg-white/[0.025] border border-white/10 space-y-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F6FA] flex items-center gap-2 font-display">
                <Layers className="w-4 h-4 text-[#9AA0B2]" />
                Relations avec la Plateforme NACORA
              </h3>

              <div className="space-y-3 text-xs">
                {/* Associé à une opportunité */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[#9AA0B2] uppercase font-semibold text-[10px]">Opportunité Associée</span>
                    {contact.opportunityId && (
                      <button
                        onClick={handleUnlinkOpportunity}
                        className="text-[11px] text-[#FF6685] hover:underline cursor-pointer"
                      >
                        Dissocier
                      </button>
                    )}
                  </div>

                  {contact.opportunityTitle ? (
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.04] border border-white/10">
                      <div className="flex items-center gap-2 truncate">
                        <LinkIcon className="w-3.5 h-3.5 text-[#FF6685] shrink-0" />
                        <span className="text-[#F5F6FA] font-medium truncate">{contact.opportunityTitle}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[#9AA0B2] text-xs">Aucune opportunité directement liée pour le moment.</p>
                      {opportunities.length > 0 && (
                        <select
                          onChange={(e) => {
                            if (e.target.value) handleLinkOpportunity(e.target.value);
                          }}
                          defaultValue=""
                          className="glass-input px-3 py-1.5 text-xs text-[#F5F6FA] bg-[#0B0F19] w-full"
                        >
                          <option value="" disabled>Lier à une opportunité existante...</option>
                          {opportunities.map(o => (
                            <option key={o.id} value={o.id} className="bg-[#0B0F19] text-[#F5F6FA]">
                              {o.title} ({o.companyName})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>

                {/* Entreprise associée */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[#9AA0B2] uppercase font-semibold text-[10px]">Entreprise du Répertoire</span>
                    <p className="text-[#F5F6FA] font-medium flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#FF6685]" />
                      {contact.companyName}
                    </p>
                  </div>
                  <span className="text-[11px] text-[#34D399] bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 font-semibold">
                    Fiche Active
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: NETWORKING & MESSAGES (Moteur complet réorganisé en étapes fluides)   */}
      {/* ========================================================================= */}
      {activeTab === "networking" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* Bannière de rappel Prochaine Action si programmée */}
          {contact.nextFollowUpDate && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-[#F5F6FA]">
                  Prochaine action programmée : <strong className="text-amber-300">{nextActionDetails.title} le {nextActionDetails.dateFormatted}</strong>
                </span>
              </div>
              <button
                onClick={handleMarkFollowUpDone}
                className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 text-xs font-semibold transition-colors cursor-pointer shrink-0"
              >
                Marquer comme effectuée
              </button>
            </div>
          )}

          {/* Moteur de networking & prise de contact */}
          <NetworkingMessageGenerator
            contact={contact}
            profile={profile}
            opportunity={contact.opportunityId ? opportunities.find(o => o.id === contact.opportunityId) : undefined}
            onUpdate={onUpdate}
            showToast={showToast}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ANALYSE & STRATÉGIE (Intelligence NACORA en blocs repliables)       */}
      {/* ========================================================================= */}
      {activeTab === "strategy" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* Header de l'espace analyse avec actualisation IA */}
          <div className="p-5 rounded-2xl bg-white/[0.025] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#F5F6FA] flex items-center gap-2 font-display">
                <Compass className="w-4 h-4 text-[#FF6685]" />
                Intérêts Stratégiques & Rationale Réseau
              </h3>
              <p className="text-xs text-[#9AA0B2]">
                Classifications multidimensionnelles, opportunités de connexion et recommandations d'approche.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefreshStrategic}
                disabled={isAnalyzingStrategic}
                className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-[#C084FC] border border-purple-500/25 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                title="Réévaluer les axes avec Gemini IA"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingStrategic ? "animate-spin text-[#FF6685]" : ""}`} />
                <span>{isAnalyzingStrategic ? "Analyse IA..." : "Actualiser avec IA"}</span>
              </button>

              <button
                onClick={() => setIsAddPillarModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#F5F6FA] border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#FF6685]" />
                <span>Ajouter un axe</span>
              </button>
            </div>
          </div>

          {/* 1. BLOC ACCORDÉON : CLASSIFICATIONS MULTIDIMENSIONNELLES */}
          <div className="rounded-2xl bg-white/[0.025] border border-white/10 overflow-hidden">
            <button
              onClick={() => setIsClassificationsOpen(!isClassificationsOpen)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-[#38BDF8]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#F5F6FA]">
                  Classifications Multidimensionnelles
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30">
                  {contact.categories?.length || 1} classification{(contact.categories?.length || 1) > 1 ? "s" : ""}
                </span>
              </div>
              {isClassificationsOpen ? <ChevronUp className="w-4 h-4 text-[#9AA0B2]" /> : <ChevronDown className="w-4 h-4 text-[#9AA0B2]" />}
            </button>

            {isClassificationsOpen && (
              <div className="p-4 pt-0 space-y-2.5 border-t border-white/5">
                {contact.categories && contact.categories.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                    {contact.categories.map((cat, idx) => {
                      const style = getCategoryBadgeStyle(cat.category, cat.subcategory);
                      return (
                        <div key={idx} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2.5 py-0.5 rounded-lg border text-[11px] font-semibold ${style.bgColor} ${style.textColor} ${style.borderColor}`}>
                                {style.label}
                              </span>
                              {cat.subcategory && cat.subcategory !== style.label && (
                                <span className="text-[11px] text-[#F5F6FA] font-medium bg-white/[0.04] px-2 py-0.5 rounded-lg border border-white/10">
                                  {cat.subcategory}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium text-[#9AA0B2] bg-white/[0.04] border border-white/10 font-mono">
                              Confiance : {cat.confidence === "high" ? "Haute" : cat.confidence === "medium" ? "Moyenne" : "Basse"}
                            </span>
                          </div>
                          {cat.reason && (
                            <p className="text-[#9AA0B2] text-[11px] leading-relaxed">
                              {cat.reason}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-[#9AA0B2]">
                    Catégorie principale : <strong className="text-white">{contact.category === "recruiter" ? "Recruteur / RH" : contact.category === "alumni" ? "Alumni" : "Professionnel"}</strong>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. BLOC ACCORDÉON : AXES D'INTÉRÊT & RECOMMANDATIONS D'APPROCHE */}
          <div className="rounded-2xl bg-white/[0.025] border border-white/10 overflow-hidden">
            <button
              onClick={() => setIsPillarsOpen(!isPillarsOpen)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-[#FF6685]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#F5F6FA]">
                  Axes d'Intérêt & Recommandations d'Approche
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FF6685]/15 text-[#FF6685] border border-[#FF6685]/30">
                  {contact.networkingRelevance?.length || 0} axe{(contact.networkingRelevance?.length || 0) > 1 ? "s" : ""}
                </span>
              </div>
              {isPillarsOpen ? <ChevronUp className="w-4 h-4 text-[#9AA0B2]" /> : <ChevronDown className="w-4 h-4 text-[#9AA0B2]" />}
            </button>

            {isPillarsOpen && (
              <div className="p-4 pt-0 space-y-3 border-t border-white/5">
                {contact.networkingRelevance && contact.networkingRelevance.length > 0 ? (
                  <div className="space-y-3">
                    {contact.networkingRelevance.map((rel, rIdx) => {
                      const pillarLabel = rel.pillar || rel.type || "Opportunité Réseau";
                      const contextText = rel.context || rel.reason || `Relation professionnelle (${contact.companyName})`;
                      return (
                        <div 
                          key={rIdx} 
                          className="p-4 rounded-xl bg-white/[0.02] border border-white/8 space-y-2.5 group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className={`px-2.5 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${getPillarBadgeStyle(pillarLabel)}`}>
                              {pillarLabel}
                            </span>
                            <button
                              onClick={() => handleRemovePillar(rIdx)}
                              className="text-[#9AA0B2] hover:text-[#FF6685] opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                              title="Supprimer cet axe"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <p className="text-[#F5F6FA] font-medium text-xs leading-relaxed">
                            {contextText}
                          </p>

                          {rel.recommendation && (
                            <div className="p-3 rounded-xl bg-black/30 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <p className="text-[#9AA0B2] text-xs leading-relaxed flex-1">
                                <strong className="text-[#F5F6FA] font-semibold">Approche : </strong>
                                {rel.recommendation}
                              </p>
                              <button
                                onClick={() => handleApplyRecommendationToMessage(rel.recommendation!)}
                                className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/15 text-[#F5F6FA] border border-white/10 text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer self-start sm:self-auto"
                                title="Insérer cette recommandation dans le message d'approche"
                              >
                                <span>Insérer dans le message</span>
                                <ArrowRight className="w-3 h-3 text-[#FF6685]" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl bg-white/[0.02] border border-white/5 text-center space-y-2 text-xs text-[#9AA0B2]">
                    <p>Aucun axe stratégique calculé pour le moment.</p>
                    <button
                      onClick={handleRefreshStrategic}
                      disabled={isAnalyzingStrategic}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/10 text-[#F5F6FA] border border-white/10 font-semibold cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#FF6685]" />
                      <span>Calculer les axes réseau avec l'IA</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. BLOC ACCORDÉON : POINTS DE CONNEXION */}
          <div className="rounded-2xl bg-white/[0.025] border border-white/10 overflow-hidden">
            <button
              onClick={() => setIsConnectionPointsOpen(!isConnectionPointsOpen)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#F5F6FA]">
                  Points de Connexion Détectés
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30">
                  {contact.connectionPoints?.length || 0} point{(contact.connectionPoints?.length || 0) > 1 ? "s" : ""}
                </span>
              </div>
              {isConnectionPointsOpen ? <ChevronUp className="w-4 h-4 text-[#9AA0B2]" /> : <ChevronDown className="w-4 h-4 text-[#9AA0B2]" />}
            </button>

            {isConnectionPointsOpen && (
              <div className="p-4 pt-0 space-y-2 border-t border-white/5">
                {contact.connectionPoints && contact.connectionPoints.length > 0 ? (
                  <div className="space-y-1.5">
                    {contact.connectionPoints.map((pt, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-[#F5F6FA]">
                        <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#9AA0B2]/60 italic p-2">Aucun point de connexion distinct enregistré.</p>
                )}
              </div>
            )}
          </div>

          {/* 4. BLOC ACCORDÉON : SYNTHÈSE DU PROFIL */}
          <div className="rounded-2xl bg-white/[0.025] border border-white/10 overflow-hidden">
            <button
              onClick={() => setIsSummaryOpen(!isSummaryOpen)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-[#C084FC]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#F5F6FA]">
                  Synthèse Globale du Profil
                </span>
              </div>
              {isSummaryOpen ? <ChevronUp className="w-4 h-4 text-[#9AA0B2]" /> : <ChevronDown className="w-4 h-4 text-[#9AA0B2]" />}
            </button>

            {isSummaryOpen && (
              <div className="p-4 pt-0 border-t border-white/5">
                <div className="p-3.5 rounded-xl bg-black/30 border border-white/5 text-xs text-[#F5F6FA] leading-relaxed">
                  {contact.summary ? (
                    <p>{contact.summary}</p>
                  ) : (
                    <p className="text-[#9AA0B2]">
                      {contact.category === "recruiter" && "Point de contact clé en recrutement & RH pour solliciter des opportunités ou candidatures spontanées."}
                      {contact.category === "alumni" && "Partage le même réseau académique. Idéal pour solliciter un échange d'expérience ou des retours sectoriels."}
                      {contact.category === "sector_pro" && "Évolue dans votre secteur cible (Banque, Finance, Gestion de patrimoine). Excellent pour élargir votre visibilité."}
                      {contact.category === "student" && "Étudiant ou pair dans votre filière, utile pour l'entraide et les retours d'expériences de stages."}
                      {(!contact.category || contact.category === "other_pro" || contact.category === "other") && "Contact issu de votre réseau étendu, à conserver pour de futures synergies professionnelles."}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: NOTES & ACTIVITÉ (Notes claires + Timeline visuelle par date)        */}
      {/* ========================================================================= */}
      {activeTab === "notes_history" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start animate-in fade-in duration-150">
          
          {/* GAUCHE : Notes de suivi & consignation d'échanges */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl bg-white/[0.025] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F6FA] flex items-center gap-2 font-display">
                  <FileText className="w-4 h-4 text-[#FF6685]" />
                  Notes & Échanges
                </h3>
                {isEditingNotes ? (
                  <button
                    onClick={handleSaveNotes}
                    className="text-xs text-[#34D399] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Enregistrer</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditingNotes(true)}
                    className="text-xs text-[#9AA0B2] hover:text-[#F5F6FA] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Modifier</span>
                  </button>
                )}
              </div>

              {/* Champ d'ajout rapide d'échange */}
              <form onSubmit={handleAddQuickNote} className="space-y-1.5">
                <label className="text-[10px] text-[#9AA0B2] uppercase font-semibold block">
                  Consigner un échange rapide :
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={quickNoteText}
                    onChange={(e) => setQuickNoteText(e.target.value)}
                    placeholder="Ex: Invitation acceptée, rdv téléphonique convenu..."
                    className="glass-input flex-1 px-3 py-2 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
                  />
                  <GlassButton type="submit" size="sm" variant="primary" disabled={!quickNoteText.trim()}>
                    <Plus className="w-3.5 h-3.5 text-white" />
                  </GlassButton>
                </div>
              </form>

              {/* Zone d'affichage des notes */}
              {isEditingNotes ? (
                <textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  className="w-full min-h-[160px] glass-input p-3 text-xs text-[#F5F6FA] leading-relaxed"
                  placeholder="Saisissez vos notes libres sur ce contact..."
                />
              ) : (
                <div className="p-4 rounded-xl bg-black/30 border border-white/5 text-xs text-[#F5F6FA] whitespace-pre-line leading-relaxed min-h-[100px]">
                  {notesDraft || <span className="text-[#9AA0B2] italic">Aucune note enregistrée pour ce contact pour le moment.</span>}
                </div>
              )}
            </div>

            {/* Échanges multi-canaux (LinkedIn & Email = Une seule relation) */}
            {contact.conversationMessages && contact.conversationMessages.length > 0 && (
              <div className="p-5 rounded-2xl bg-white/[0.025] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F6FA] flex items-center gap-2 font-display">
                    <MessageSquare className="w-4 h-4 text-[#38BDF8]" />
                    <span>Échanges multi-canaux</span>
                  </h3>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    {contact.conversationMessages.some(m => m.channel === "linkedin") && (
                      <span className="px-2 py-0.5 rounded-full bg-[#0A66C2]/15 text-[#38BDF8] border border-[#0A66C2]/30 flex items-center gap-1">
                        <Linkedin className="w-2.5 h-2.5" />
                        <span>{contact.conversationMessages.filter(m => m.channel === "linkedin").length}</span>
                      </span>
                    )}
                    {contact.conversationMessages.some(m => m.channel === "email") && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-[#34D399] border border-emerald-500/30 flex items-center gap-1">
                        <Mail className="w-2.5 h-2.5" />
                        <span>{contact.conversationMessages.filter(m => m.channel === "email").length}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {contact.conversationMessages.slice(-4).map((msg, mIdx) => (
                    <div
                      key={msg.id || mIdx}
                      className={`p-2.5 rounded-xl text-xs space-y-1 ${
                        msg.sender === "nathan"
                          ? "bg-rose-500/10 border border-rose-500/20 text-[#F5F6FA]"
                          : "bg-white/[0.03] border border-white/10 text-[#F5F6FA]"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-[#9AA0B2]">
                        <span className="font-semibold text-white">
                          {msg.sender === "nathan" ? "Nathan (Vous)" : contact.fullName}
                        </span>
                        <span className="flex items-center gap-1">
                          {msg.channel === "email" ? (
                            <span className="text-emerald-400 font-semibold">Email</span>
                          ) : (
                            <span className="text-sky-400 font-semibold">LinkedIn</span>
                          )}
                          <span>·</span>
                          <span className="font-mono">
                            {new Date(msg.timestamp).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                          </span>
                        </span>
                      </div>
                      <p className="line-clamp-2 text-[#9AA0B2] text-[11px] leading-relaxed">
                        {msg.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* DROITE : Historique d'activité en Timeline groupée par date */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-5 rounded-2xl bg-white/[0.025] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F6FA] flex items-center gap-2 font-display">
                  <History className="w-4 h-4 text-[#38BDF8]" />
                  Historique d'Activité (Timeline)
                </h3>
                <span className="text-[11px] text-[#9AA0B2]">
                  {contact.history?.length || 1} événement{(contact.history?.length || 1) > 1 ? "s" : ""}
                </span>
              </div>

              {/* Timeline visuelle structurée par date */}
              <div className="space-y-6 pt-2">
                {groupedTimeline.map((group, gIdx) => (
                  <div key={gIdx} className="space-y-3">
                    
                    {/* Header de date */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold tracking-wider text-[#FF6685] uppercase bg-[#FF6685]/10 px-2.5 py-0.5 rounded-md border border-[#FF6685]/20 font-mono">
                        {group.label}
                      </span>
                      <div className="h-px flex-1 bg-white/10" />
                    </div>

                    {/* Événements de la journée */}
                    <div className="relative pl-6 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-white/10">
                      {group.events.map((ev, evIdx) => {
                        const d = new Date(ev.timestamp);
                        const timeStr = !isNaN(d.getTime()) 
                          ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
                          : "--:--";

                        return (
                          <div key={ev.id || evIdx} className="relative group">
                            {/* Point sur la timeline */}
                            <div className="absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full bg-[#FF6685] border-2 border-[#0B0F19] ring-2 ring-[#FF6685]/30 group-hover:scale-125 transition-transform" />
                            
                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 hover:bg-white/[0.04] transition-colors">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[#F5F6FA] font-medium text-xs leading-snug">
                                  {ev.label}
                                </p>
                                <span className="text-[10px] text-[#9AA0B2] font-mono shrink-0">
                                  ● {timeStr}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                ))}
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODALS (Exhaustive & Preserved)                                         */}
      {/* ========================================================================= */}
      
      {/* EDIT MODAL */}
      {isEditModalOpen && (
        <ContactEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          contact={contact}
          onSave={(updated) => {
            onUpdate(updated);
            setIsEditModalOpen(false);
            showToast("Informations du contact mises à jour", "success");
          }}
        />
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Supprimer le contact"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-[#9AA0B2] leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement le contact <strong className="text-[#F5F6FA]">{contact.fullName}</strong> ({contact.companyName}) ? Cette action est irréversible.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <GlassButton
                variant="ghost"
                size="sm"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Annuler
              </GlassButton>
              <GlassButton
                variant="danger"
                size="sm"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  onDelete(contact.id);
                }}
              >
                Confirmer la suppression
              </GlassButton>
            </div>
          </div>
        </Modal>
      )}

      {/* ADD STRATEGIC PILLAR MODAL */}
      {isAddPillarModalOpen && (
        <Modal
          isOpen={isAddPillarModalOpen}
          onClose={() => setIsAddPillarModalOpen(false)}
          title="Ajouter un axe d'intérêt stratégique"
          size="md"
        >
          <form onSubmit={handleAddCustomPillar} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#9AA0B2]">
                Pilier / Thématique *
              </label>
              <input
                type="text"
                required
                value={newPillarTitle}
                onChange={(e) => setNewPillarTitle(e.target.value)}
                placeholder="Ex: Opportunité de mentorat, Décideur recrutement..."
                className="glass-input w-full px-3 py-2 text-xs text-[#F5F6FA]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#9AA0B2]">
                Type / Catégorie
              </label>
              <input
                type="text"
                value={newPillarType}
                onChange={(e) => setNewPillarType(e.target.value)}
                placeholder="Ex: Opportunité, Recrutement, Échange métier..."
                className="glass-input w-full px-3 py-2 text-xs text-[#F5F6FA]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#9AA0B2]">
                Contexte & Rationale
              </label>
              <textarea
                value={newPillarContext}
                onChange={(e) => setNewPillarContext(e.target.value)}
                placeholder="Pourquoi cet axe est particulièrement pertinent..."
                rows={2}
                className="glass-input w-full p-2.5 text-xs text-[#F5F6FA] resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#9AA0B2]">
                Recommandation d'action
              </label>
              <textarea
                value={newPillarRecommendation}
                onChange={(e) => setNewPillarRecommendation(e.target.value)}
                placeholder="Ex: Proposer un court échange de 15 minutes..."
                rows={2}
                className="glass-input w-full p-2.5 text-xs text-[#F5F6FA] resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
              <GlassButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsAddPillarModalOpen(false)}
              >
                Annuler
              </GlassButton>
              <GlassButton
                type="submit"
                variant="primary"
                size="sm"
                disabled={!newPillarTitle.trim()}
              >
                Enregistrer l'axe
              </GlassButton>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
};

// =========================================================================
// CONTACT EDIT MODAL (Exhaustive & completely preserved)
// =========================================================================
interface ContactEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact;
  onSave: (updated: Contact) => void;
}

const ContactEditModal: React.FC<ContactEditModalProps> = ({
  isOpen,
  onClose,
  contact,
  onSave
}) => {
  const [fullName, setFullName] = useState(contact.fullName);
  const [jobTitle, setJobTitle] = useState(contact.jobTitle);
  const [contactFunction, setContactFunction] = useState<string>(contact.function || "Inconnue");
  const [companyName, setCompanyName] = useState(contact.companyName);
  const [category, setCategory] = useState<ContactCategory>(contact.category);
  const [relevanceScore, setRelevanceScore] = useState(contact.relevanceScore || 50);
  const [sector, setSector] = useState(contact.sector || "");
  const [profileLevel, setProfileLevel] = useState(contact.profileLevel || "");
  const [academicPath, setAcademicPath] = useState(contact.academicPath || "");
  const [previousCompanies, setPreviousCompanies] = useState((contact.previousCompanies || []).join(", "));
  const [email, setEmail] = useState(contact.email || "");
  const [phone, setPhone] = useState(contact.phone || "");
  const [linkedInUrl, setLinkedInUrl] = useState(contact.linkedInUrl || "");
  const [contactUrl, setContactUrl] = useState(contact.contactUrl || "");
  const [networkingStatus, setNetworkingStatus] = useState<ContactNetworkingStatus>(contact.networkingStatus || "to_contact");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parts = fullName.trim().split(" ");
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || "";

    const { company: linkedCo } = resolveCompany({ companyName });

    const historyEvent: ContactHistoryEvent = {
      id: "hist_" + Math.random().toString(36).substring(2, 9),
      type: "profile_updated",
      label: "Fiche modifiée manuellement par l'utilisateur",
      timestamp: new Date().toISOString()
    };

    const updated: Contact = {
      ...contact,
      fullName: fullName.trim(),
      firstName,
      lastName,
      jobTitle: jobTitle.trim(),
      normalizedJobTitle: jobTitle.trim(),
      function: contactFunction && contactFunction !== "Inconnue" ? contactFunction : undefined,
      functionSource: "manual",
      functionConfidence: "high",
      functionClassifiedAt: new Date().toISOString(),
      companyId: linkedCo.id,
      companyName: linkedCo.name,
      category,
      relevanceScore: Number(relevanceScore),
      sector: sector.trim() || undefined,
      profileLevel: profileLevel.trim() || undefined,
      academicPath: academicPath.trim() || undefined,
      previousCompanies: previousCompanies.split(",").map(s => s.trim()).filter(Boolean),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      linkedInUrl: linkedInUrl.trim() || undefined,
      contactUrl: contactUrl.trim() || undefined,
      networkingStatus,
      history: [historyEvent, ...(contact.history || [])]
    };

    dbStore.updateContact(updated);
    onSave(updated);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Modifier la fiche contact"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#9AA0B2] font-semibold">Nom complet *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#9AA0B2] font-semibold">Poste actuel (intitulé exact) *</label>
            <input
              type="text"
              required
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#9AA0B2] font-semibold">Fonction normalisée (taxonomie)</label>
            <select
              value={contactFunction}
              onChange={(e) => setContactFunction(e.target.value)}
              className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA] bg-[#0B0F19]"
            >
              {STANDARD_CONTACT_FUNCTIONS.map((fn) => (
                <option key={fn} value={fn} className="bg-[#0B0F19] text-[#F5F6FA]">
                  {fn}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#9AA0B2] font-semibold">Entreprise *</label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#9AA0B2] font-semibold">Catégorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ContactCategory)}
              className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA] bg-[#0B0F19]"
            >
              <option value="recruiter" className="bg-[#0B0F19] text-[#F5F6FA]">Recruteur / RH</option>
              <option value="alumni" className="bg-[#0B0F19] text-[#F5F6FA]">Alumni</option>
              <option value="sector_pro" className="bg-[#0B0F19] text-[#F5F6FA]">Pro Secteur Cible</option>
              <option value="student" className="bg-[#0B0F19] text-[#F5F6FA]">Étudiant</option>
              <option value="other_pro" className="bg-[#0B0F19] text-[#F5F6FA]">Pro Autre Secteur</option>
              <option value="other" className="bg-[#0B0F19] text-[#F5F6FA]">Autre</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#9AA0B2] font-semibold">Score de pertinence ({relevanceScore}%)</label>
            <input
              type="range"
              min="0"
              max="100"
              value={relevanceScore}
              onChange={(e) => setRelevanceScore(Number(e.target.value))}
              className="w-full accent-[#FF6685]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#9AA0B2] font-semibold">Statut Networking</label>
            <select
              value={networkingStatus}
              onChange={(e) => setNetworkingStatus(e.target.value as ContactNetworkingStatus)}
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
            <label className="text-xs text-[#9AA0B2] font-semibold">Secteur / Localisation</label>
            <input
              type="text"
              placeholder="ex: Banque Privée, Clermont..."
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#9AA0B2] font-semibold">Niveau / Type</label>
            <input
              type="text"
              placeholder="ex: Senior, Manager, RH..."
              value={profileLevel}
              onChange={(e) => setProfileLevel(e.target.value)}
              className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
            />
          </div>

          <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
            <label className="text-xs text-[#9AA0B2] font-semibold">Formation / Écoles</label>
            <input
              type="text"
              placeholder="ex: IUT Clermont Auvergne, Master Finance..."
              value={academicPath}
              onChange={(e) => setAcademicPath(e.target.value)}
              className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
            />
          </div>

          <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
            <label className="text-xs text-[#9AA0B2] font-semibold">Entreprises précédentes (séparées par virgules)</label>
            <input
              type="text"
              placeholder="ex: BNP Paribas, Société Générale"
              value={previousCompanies}
              onChange={(e) => setPreviousCompanies(e.target.value)}
              className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#9AA0B2] font-semibold">Email professionnel</label>
            <input
              type="email"
              placeholder="contact@entreprise.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#9AA0B2] font-semibold">Téléphone</label>
            <input
              type="tel"
              placeholder="06 12 34 56 78"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
            />
          </div>

          <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
            <label className="text-xs text-[#9AA0B2] font-semibold">URL Profil LinkedIn</label>
            <input
              type="url"
              placeholder="https://www.linkedin.com/in/..."
              value={linkedInUrl}
              onChange={(e) => setLinkedInUrl(e.target.value)}
              className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
            />
          </div>

          <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
            <label className="text-xs text-[#9AA0B2] font-semibold">Lien portail / Site web</label>
            <input
              type="url"
              placeholder="https://entreprise.fr/carrieres"
              value={contactUrl}
              onChange={(e) => setContactUrl(e.target.value)}
              className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-4 border-t border-white/10">
          <GlassButton type="button" variant="ghost" size="sm" onClick={onClose}>
            Annuler
          </GlassButton>
          <GlassButton type="submit" variant="primary" size="sm">
            Enregistrer
          </GlassButton>
        </div>
      </form>
    </Modal>
  );
};
