import React, { useState, useEffect } from "react";
import { Contact, ContactCategory, ContactNetworkingStatus, Opportunity, CandidateProfile, NetworkingRelevanceItem } from "../types";
import { dbStore } from "../dbStore";
import { getCategoryBadgeStyle } from "../utils/contactMerger";
import { 
  ensureContactStrategicRelevance, 
  requestAiStrategicInterests, 
  computeStrategicInterests 
} from "../utils/strategicInterests";
import { GlassButton, Modal } from "./Shared";
import { NetworkingMessageGenerator } from "./network/NetworkingMessageGenerator";
import { 
  Building2, 
  Briefcase, 
  MapPin, 
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
  MessageSquare, 
  History, 
  FileText, 
  Link as LinkIcon, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  ArrowRight,
  UserCheck,
  Award,
  RefreshCw,
  Compass
} from "lucide-react";

interface ContactDetailWorkspaceProps {
  contact: Contact;
  profile: CandidateProfile;
  onClose: () => void;
  onUpdate: (updatedContact: Contact) => void;
  onDelete: (contactId: string) => void;
  showToast: (message: string, type: "success" | "error" | "info" | "ai") => void;
}

export const ContactDetailWorkspace: React.FC<ContactDetailWorkspaceProps> = ({
  contact,
  profile,
  onClose,
  onUpdate,
  onDelete,
  showToast
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Strategic networking relevance state
  const [isAnalyzingStrategic, setIsAnalyzingStrategic] = useState(false);
  const [isAddPillarModalOpen, setIsAddPillarModalOpen] = useState(false);
  const [newPillarTitle, setNewPillarTitle] = useState("");
  const [newPillarType, setNewPillarType] = useState("Opportunité");
  const [newPillarContext, setNewPillarContext] = useState("");
  const [newPillarRecommendation, setNewPillarRecommendation] = useState("");

  // Quick note input
  const [quickNoteText, setQuickNoteText] = useState("");
  const [notesDraft, setNotesDraft] = useState(contact.notes || "");
  const [isEditingNotes, setIsEditingNotes] = useState(false);

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

  // Helper for Category badge display
  const getCategoryLabel = (cat: ContactCategory) => {
    switch (cat) {
      case "recruiter": return "Recruteur / RH";
      case "alumni": return "Alumni";
      case "sector_pro": return "Pro Secteur Cible";
      case "student": return "Étudiant";
      case "other_pro": return "Pro Autre Secteur";
      default: return "Autre contact";
    }
  };

  // Refined Liquid Glass semantic color coding for category identification
  const getCategoryColor = (cat: ContactCategory) => {
    switch (cat) {
      case "recruiter":
        return "bg-[rgba(18,183,106,0.12)] text-[#34D399] border-[rgba(18,183,106,0.28)] shadow-[0_0_12px_rgba(18,183,106,0.12)]";
      case "alumni":
        return "bg-[rgba(56,189,248,0.12)] text-[#38BDF8] border-[rgba(56,189,248,0.28)] shadow-[0_0_12px_rgba(56,189,248,0.12)]";
      case "sector_pro":
        return "bg-[rgba(216,26,69,0.14)] text-[#FF6685] border-[rgba(216,26,69,0.30)] shadow-[0_0_12px_rgba(216,26,69,0.14)]";
      case "student":
        return "bg-[rgba(192,132,252,0.12)] text-[#C084FC] border-[rgba(192,132,252,0.28)] shadow-[0_0_12px_rgba(192,132,252,0.12)]";
      case "other_pro":
        return "bg-[rgba(247,144,9,0.12)] text-[#FBBF24] border-[rgba(247,144,9,0.28)] shadow-[0_0_12px_rgba(247,144,9,0.12)]";
      default:
        return "bg-white/[0.05] text-[#E2E8F0] border-white/15 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]";
    }
  };

  const getNetworkingStatusConfig = (status?: ContactNetworkingStatus) => {
    switch (status) {
      case "contacted":
        return { 
          label: "Message envoyé", 
          color: "bg-[rgba(56,189,248,0.12)] text-[#38BDF8] border-[rgba(56,189,248,0.28)] shadow-[0_0_12px_rgba(56,189,248,0.10)]" 
        };
      case "exchanging":
        return { 
          label: "Échange en cours", 
          color: "bg-[rgba(192,132,252,0.12)] text-[#C084FC] border-[rgba(192,132,252,0.28)] shadow-[0_0_12px_rgba(192,132,252,0.10)]" 
        };
      case "interview_done":
        return { 
          label: "Entretien réseau réalisé", 
          color: "bg-[rgba(18,183,106,0.14)] text-[#34D399] border-[rgba(18,183,106,0.30)] shadow-[0_0_12px_rgba(18,183,106,0.14)]" 
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
          color: "bg-[rgba(247,144,9,0.12)] text-[#FBBF24] border-[rgba(247,144,9,0.28)] shadow-[0_0_12px_rgba(247,144,9,0.10)]" 
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

  // Change networking status quickly
  const handleUpdateNetworkingStatus = (newStatus: ContactNetworkingStatus) => {
    const historyEvent = {
      id: "hist_" + Math.random().toString(36).substring(2, 9),
      type: "category_changed" as const,
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

    const historyEvent = {
      id: "hist_" + Math.random().toString(36).substring(2, 9),
      type: "opportunity_linked" as const,
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
    const historyEvent = {
      id: "hist_" + Math.random().toString(36).substring(2, 9),
      type: "note_added" as const,
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

    const historyEvent = {
      id: "hist_" + Math.random().toString(36).substring(2, 9),
      type: "note_added" as const,
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
    showToast("Note consignée dans le suivi", "success");
  };

  // Strategic networking relevance evaluation & custom pillars
  const handleRefreshStrategic = async () => {
    setIsAnalyzingStrategic(true);
    showToast("Analyse stratégique du profil et détection des axes réseau par l'IA...", "ai");
    try {
      const result = await requestAiStrategicInterests(contact, profile);
      const historyEvent = {
        id: "hist_" + Math.random().toString(36).substring(2, 9),
        type: "category_changed" as const,
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
      showToast("Intérêts stratégiques réseau actualisés avec succès !", "success");
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
    showToast("Recommandation intégrée au message d'approche !", "success");
  };

  const currentStatusConfig = getNetworkingStatusConfig(contact.networkingStatus);

  return (
    <div className="space-y-4 animate-in fade-in duration-200 w-full mb-8">
      {/* Top navigation breadcrumb */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#9AA0B2] hover:text-[#F5F6FA] border border-white/10 text-xs font-semibold transition-colors cursor-pointer"
        >
          <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          <span>Retour aux contacts</span>
        </button>
        <span className="text-xs text-[#9AA0B2] font-medium hidden sm:inline-block">
          Fiche Contact & Espace Réseau NACORA
        </span>
      </div>

      {/* Main Glass Workspace Panel */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl flex flex-col gap-6 w-full">
        
        {/* ========================================================================= */}
        {/* HEADER SECTION                                                            */}
        {/* ========================================================================= */}
        <div className="border-b border-white/10 pb-5 space-y-3.5">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#FF6685] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#FF6685]" />
                  {contact.companyName}
                </span>
                {contact.sector && (
                  <>
                    <span className="text-white/20">•</span>
                    <span className="text-xs text-[#9AA0B2]">{contact.sector}</span>
                  </>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#F5F6FA] tracking-tight leading-snug font-display">
                {contact.fullName}
              </h2>
              <p className="text-sm text-[#9AA0B2] font-medium">
                {contact.jobTitle}
              </p>
            </div>

            {/* Top Right Actions */}
            <div className="flex flex-wrap items-center gap-2 self-start shrink-0">
              {contact.linkedInUrl && (
                <a
                  href={contact.linkedInUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[rgba(14,165,233,0.12)] hover:bg-[rgba(14,165,233,0.22)] text-[#38bdf8] border border-[rgba(14,165,233,0.25)] text-xs font-semibold transition-colors"
                >
                  <Linkedin className="w-3.5 h-3.5" />
                  <span>Profil LinkedIn</span>
                  <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                </a>
              )}

              <button
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#F5F6FA] hover:text-white border border-white/10 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#9AA0B2]" />
                <span>Modifier</span>
              </button>

              <button
                onClick={() => {
                  const el = document.getElementById("networking-workspace-section");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-900/30 to-rose-900/30 hover:from-purple-900/45 hover:to-rose-900/45 text-purple-200 hover:text-white border border-purple-500/30 text-xs font-semibold shadow-[0_4px_16px_rgba(147,51,234,0.2)] transition-spring cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#C084FC] animate-pulse" />
                <span>Framework Réseau</span>
              </button>

              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="p-1.5 rounded-xl bg-[rgba(240,68,56,0.1)] hover:bg-[rgba(240,68,56,0.2)] text-[#F04438] border border-[rgba(240,68,56,0.2)] transition-colors cursor-pointer"
                title="Supprimer le contact"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onClick={onClose}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#9AA0B2] hover:text-white border border-white/10 transition-colors cursor-pointer ml-1"
                title="Fermer la fiche"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Monoline Metadata Banner */}
          <div className="flex items-center gap-2 pt-1 text-xs overflow-x-auto pb-1 lg:pb-0 scrollbar-none flex-nowrap">
            {/* 1. Catégories multidimensionnelles ou catégorie principale */}
            {contact.categories && contact.categories.length > 0 ? (
              contact.categories.map((cat, cIdx) => {
                const style = getCategoryBadgeStyle(cat.category, cat.subcategory);
                return (
                  <span
                    key={cIdx}
                    title={`${cat.reason || style.label} (Confiance : ${cat.confidence === 'high' ? 'Haute' : cat.confidence === 'medium' ? 'Moyenne' : 'Basse'})`}
                    className={`px-2.5 py-1 rounded-xl border font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 ${style.bgColor} ${style.textColor} ${style.borderColor}`}
                  >
                    <span>{style.label}</span>
                  </span>
                );
              })
            ) : (
              <span className={`px-2.5 py-1 rounded-xl border font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 ${getCategoryColor(contact.category)}`}>
                <UserCheck className="w-3.5 h-3.5" />
                {getCategoryLabel(contact.category)}
              </span>
            )}

            {/* 2. Score de pertinence */}
            <span className="px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-[#F5F6FA] font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0">
              <Award className="w-3.5 h-3.5 text-[#FF6685]" />
              Pertinence : <span className="text-[#FF6685]">{contact.relevanceScore}%</span>
            </span>

            {/* 3. Entreprise */}
            <span className="px-2.5 py-1 rounded-xl bg-[rgba(216,26,69,0.14)] border border-[rgba(216,26,69,0.30)] text-[#FF6685] font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0">
              <Building2 className="w-3.5 h-3.5 text-[#FF6685]" />
              {contact.companyName}
            </span>

            {/* 4. Statut Networking */}
            <span className={`px-2.5 py-1 rounded-xl border font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 ${currentStatusConfig.color}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {currentStatusConfig.label}
            </span>

            {/* 5. Opportunité liée */}
            {contact.opportunityTitle ? (
              <span className="px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-[#F5F6FA] flex items-center gap-1.5 whitespace-nowrap shrink-0">
                <LinkIcon className="w-3.5 h-3.5 text-[#FF6685]" />
                Offre : <span className="text-[#F5F6FA] font-medium">{contact.opportunityTitle}</span>
              </span>
            ) : null}

            {/* 6. Date d'import / création */}
            <span className="px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-[#9AA0B2] flex items-center gap-1.5 whitespace-nowrap shrink-0">
              <Calendar className="w-3.5 h-3.5 text-[#9AA0B2]" />
              Ajouté le {new Date(contact.createdAt).toLocaleDateString("fr-FR")}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2-COLUMN MAIN WORKSPACE GRID                                              */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ========================================================================= */}
          {/* LEFT COLUMN: Informations, Parcours, Pertinence IA, Relations             */}
          {/* ========================================================================= */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* SECTION 1: Informations principales */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F6FA] flex items-center gap-2 font-display">
                  <Briefcase className="w-4 h-4 text-[#FF6685]" />
                  Informations Principales
                </h3>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="text-xs text-[#9AA0B2] hover:text-[#F5F6FA] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Modifier</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Poste */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-[#9AA0B2] uppercase font-semibold text-[10px]">Poste Actuel</span>
                  <p className="text-[#F5F6FA] font-medium">{contact.jobTitle}</p>
                </div>

                {/* Entreprise */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-[#9AA0B2] uppercase font-semibold text-[10px]">Entreprise</span>
                  <p className="text-[#FF6685] font-semibold">{contact.companyName}</p>
                </div>

                {/* Secteur */}
                {contact.sector && (
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <span className="text-[#9AA0B2] uppercase font-semibold text-[10px]">Secteur d'activité</span>
                    <p className="text-[#F5F6FA]">{contact.sector}</p>
                  </div>
                )}

                {/* Profil Level */}
                {contact.profileLevel && (
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <span className="text-[#9AA0B2] uppercase font-semibold text-[10px]">Niveau / Type</span>
                    <p className="text-[#F5F6FA]">{contact.profileLevel}</p>
                  </div>
                )}

                {/* LinkedIn */}
                {contact.linkedInUrl && (
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <span className="text-[#9AA0B2] uppercase font-semibold text-[10px]">Profil LinkedIn</span>
                    <a 
                      href={contact.linkedInUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-[#F5F6FA] hover:text-[#FF6685] hover:underline flex items-center gap-1.5 truncate transition-colors"
                    >
                      <Linkedin className="w-3.5 h-3.5 text-[#9AA0B2] shrink-0" />
                      <span className="truncate">{contact.linkedInUrl.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "")}</span>
                    </a>
                  </div>
                )}

                {/* Email */}
                {contact.email && (
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <span className="text-[#9AA0B2] uppercase font-semibold text-[10px]">Email professionnel</span>
                    <a 
                      href={`mailto:${contact.email}`} 
                      className="text-[#F5F6FA] hover:text-[#FF6685] hover:underline flex items-center gap-1.5 truncate transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5 text-[#9AA0B2] shrink-0" />
                      <span className="truncate">{contact.email}</span>
                    </a>
                  </div>
                )}

                {/* Téléphone */}
                {contact.phone && (
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <span className="text-[#9AA0B2] uppercase font-semibold text-[10px]">Téléphone</span>
                    <a 
                      href={`tel:${contact.phone}`} 
                      className="text-[#F5F6FA] hover:text-[#FF6685] hover:underline flex items-center gap-1.5 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#9AA0B2] shrink-0" />
                      <span>{contact.phone}</span>
                    </a>
                  </div>
                )}

                {/* Lien web / Portail de contact */}
                {contact.contactUrl && (
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 sm:col-span-2">
                    <span className="text-[#9AA0B2] uppercase font-semibold text-[10px]">Lien / Portail de contact</span>
                    <a 
                      href={contact.contactUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-[#F5F6FA] hover:text-[#FF6685] hover:underline flex items-center gap-1.5 truncate font-medium transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#9AA0B2] shrink-0" />
                      <span className="truncate">{contact.contactUrl}</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Statut de démarche interactif */}
              <div className="pt-3 border-t border-white/5 space-y-2">
                <span className="text-[#9AA0B2] uppercase font-semibold text-[10px]">Statut de la démarche</span>
                <div className="flex flex-wrap gap-2">
                  {(["to_contact", "contacted", "exchanging", "interview_done", "not_interested"] as ContactNetworkingStatus[]).map((st) => {
                    const cfg = getNetworkingStatusConfig(st);
                    const isCurrent = (contact.networkingStatus || "to_contact") === st;
                    return (
                      <button
                        key={st}
                        onClick={() => handleUpdateNetworkingStatus(st)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                          isCurrent 
                            ? `${cfg.color} ring-1 ring-white/20 shadow-[0_0_12px_rgba(255,255,255,0.08)]` 
                            : "bg-white/[0.02] hover:bg-white/[0.06] text-[#9AA0B2] border-white/5"
                        }`}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* SECTION 2: Parcours & Formation (Real data only) */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F6FA] flex items-center gap-2 font-display">
                <GraduationCap className="w-4 h-4 text-[#9AA0B2]" />
                Parcours & Établissements
              </h3>

              <div className="space-y-3 text-xs">
                {/* Formation */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-[#9AA0B2] uppercase font-semibold text-[10px]">Formation / Écoles</span>
                  <p className="text-[#F5F6FA] leading-relaxed">
                    {contact.academicPath || "Information non renseignée lors de l'import."}
                  </p>
                </div>

                {/* Entreprises précédentes */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                  <span className="text-[#9AA0B2] uppercase font-semibold text-[10px]">Entreprises Précédentes</span>
                  {contact.previousCompanies && contact.previousCompanies.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {contact.previousCompanies.map((co, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-[#F5F6FA] text-xs">
                          {co}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#9AA0B2] italic">Aucune entreprise précédente identifiée</p>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 3: Pourquoi ce contact est pertinent & Intérêt Stratégique Réseau */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F6FA] flex items-center gap-2 font-display">
                  <Sparkles className="w-4 h-4 text-[#FF6685]" />
                  Pourquoi ce contact est pertinent
                </h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/[0.05] text-[#F5F6FA] border border-white/10">
                  Score : <span className="text-[#FF6685]">{contact.relevanceScore}%</span>
                </span>
              </div>

              <div className="space-y-4 text-xs">
                {/* Multidimensional Classifications */}
                {contact.categories && contact.categories.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[#9AA0B2] uppercase font-semibold text-[10px]">Classifications Multidimensionnelles :</span>
                    <div className="grid grid-cols-1 gap-2">
                      {contact.categories.map((cat, idx) => {
                        const style = getCategoryBadgeStyle(cat.category, cat.subcategory);
                        return (
                          <div key={idx} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <span className={`px-2 py-0.5 rounded-lg border text-[11px] font-semibold ${style.bgColor} ${style.textColor} ${style.borderColor}`}>
                                  {style.label}
                                </span>
                                {cat.subcategory && cat.subcategory !== style.label && (
                                  <span className="text-[11px] text-[#F5F6FA] font-medium bg-white/[0.04] px-2 py-0.5 rounded-lg border border-white/10">
                                    {cat.subcategory}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium text-[#9AA0B2] bg-white/[0.04] border border-white/10">
                                Confiance : {cat.confidence === "high" ? "Haute" : cat.confidence === "medium" ? "Moyenne" : "Basse"}
                              </span>
                            </div>
                            {cat.reason && (
                              <p className="text-[#9AA0B2] text-[11px] leading-relaxed pl-0.5">
                                {cat.reason}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sub-Panel: Intérêt Stratégique Réseau (Actionable and Interactive) */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/8 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <Compass className="w-4 h-4 text-[#FF6685]" />
                      <span className="text-[#F5F6FA] font-bold text-xs uppercase tracking-wider font-display">
                        Intérêt Stratégique Réseau
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleRefreshStrategic}
                        disabled={isAnalyzingStrategic}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/10 text-[#F5F6FA] border border-white/10 text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        title="Réévaluer les opportunités de réseautage avec l'IA"
                      >
                        <RefreshCw className={`w-3 h-3 ${isAnalyzingStrategic ? "animate-spin text-[#FF6685]" : ""}`} />
                        <span>{isAnalyzingStrategic ? "Analyse..." : "Actualiser (IA)"}</span>
                      </button>
                      <button
                        onClick={() => setIsAddPillarModalOpen(true)}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/10 text-[#F5F6FA] border border-white/10 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                        title="Ajouter manuellement un axe de valeur"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Ajouter un axe</span>
                      </button>
                    </div>
                  </div>

                  {contact.networkingRelevance && contact.networkingRelevance.length > 0 ? (
                    <div className="space-y-2.5 pt-1">
                      {contact.networkingRelevance.map((rel, rIdx) => {
                        const pillarLabel = rel.pillar || rel.type || "Opportunité Réseau";
                        const contextText = rel.context || rel.reason || `Relation professionnelle (${contact.companyName || "Entreprise"})`;
                        return (
                          <div 
                            key={rIdx} 
                            className="relative overflow-hidden p-3.5 rounded-xl bg-white/[0.03] border border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.12)] space-y-2 group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${getPillarBadgeStyle(pillarLabel)}`}>
                                  {pillarLabel}
                                </span>
                                {rel.type && rel.type !== pillarLabel && (
                                  <span className="text-[10px] text-[#9AA0B2] uppercase font-semibold">
                                    • {rel.type}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => handleRemovePillar(rIdx)}
                                className="text-[#9AA0B2] hover:text-[#FF6685] opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                                title="Supprimer cet axe"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>

                            <p className="text-[#F5F6FA] font-medium text-[11px] leading-relaxed">
                              {contextText}
                            </p>

                            {rel.recommendation && (
                              <div className="p-2.5 rounded-lg bg-black/20 border border-white/5 flex items-start justify-between gap-2.5">
                                <p className="text-[#9AA0B2] text-[11px] leading-relaxed flex-1">
                                  <strong className="text-[#F5F6FA] font-semibold">Recommandation : </strong>
                                  {rel.recommendation}
                                </p>
                                <button
                                  onClick={() => handleApplyRecommendationToMessage(rel.recommendation!)}
                                  className="px-2 py-1 rounded-md bg-white/[0.06] hover:bg-white/12 text-[#F5F6FA] border border-white/10 text-[10px] font-medium flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                                  title="Insérer cette recommandation dans le message d'approche"
                                >
                                  <span>Insérer</span>
                                  <ArrowRight className="w-2.5 h-2.5 text-[#FF6685]" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center space-y-2.5">
                      <p className="text-xs text-[#9AA0B2]">
                        Aucun axe stratégique calculé pour l'instant.
                      </p>
                      <button
                        onClick={handleRefreshStrategic}
                        disabled={isAnalyzingStrategic}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/10 text-[#F5F6FA] border border-white/10 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#FF6685]" />
                        <span>Calculer les axes d'intérêt stratégique avec l'IA</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Connection points list */}
                <div className="space-y-2">
                  <span className="text-[#9AA0B2] uppercase font-semibold text-[10px]">Points de connexion identifiés :</span>
                  {contact.connectionPoints && contact.connectionPoints.length > 0 ? (
                    <div className="space-y-1.5">
                      {contact.connectionPoints.map((pt, i) => (
                        <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#9AA0B2] shrink-0 mt-0.5" />
                          <span className="text-[#F5F6FA] leading-relaxed">{pt}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#9AA0B2] italic">Aucun point de connexion spécifique détecté.</p>
                  )}
                </div>

                {/* Synthèse de classification */}
                <div className="p-3.5 rounded-xl bg-black/20 border border-white/5 space-y-1.5 text-[#9AA0B2] leading-relaxed">
                  <span className="text-[#F5F6FA] font-semibold text-[11px] block">Synthèse du profil :</span>
                  {contact.summary ? (
                    <p className="text-[#F5F6FA] leading-relaxed">{contact.summary}</p>
                  ) : (
                    <>
                      {contact.category === "recruiter" && (
                        <p>Ce profil intervient sur les fonctions de recrutement et ressources humaines. Il constitue un point de contact stratégique pour des candidatures spontanées ou le suivi d'offres en cours.</p>
                      )}
                      {contact.category === "alumni" && (
                        <p>Partage le même parcours académique ou réseau d'études. Idéal pour solliciter un échange d'expérience, des retours sur le secteur ou un parrainage professionnel.</p>
                      )}
                      {contact.category === "sector_pro" && (
                        <p>Évolue dans votre secteur cible (Banque, Finance, Gestion de patrimoine). Excellent contact pour élargir votre visibilité et votre veille sectorielle.</p>
                      )}
                      {contact.category === "student" && (
                        <p>Étudiant ou pair dans votre filière, utile pour l'entraide, le partage d'opportunités et les retours d'expériences de stages.</p>
                      )}
                      {contact.category === "other_pro" || contact.category === "other" ? (
                        <p>Contact issu de votre réseau étendu, à conserver pour de futures synergies interprofessionnelles.</p>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 4: Relations avec NACORA */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F6FA] flex items-center gap-2 font-display">
                <Layers className="w-4 h-4 text-[#9AA0B2]" />
                Relations avec NACORA
              </h3>

              <div className="space-y-3 text-xs">
                {/* Associé à une opportunité */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[#9AA0B2] uppercase font-semibold text-[10px]">Opportunité Liée</span>
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
                        <div className="flex items-center gap-2">
                          <select
                            onChange={(e) => {
                              if (e.target.value) handleLinkOpportunity(e.target.value);
                            }}
                            defaultValue=""
                            className="glass-input px-3 py-1.5 text-xs text-[#F5F6FA] bg-[#060812] max-w-xs"
                          >
                            <option value="" disabled>Lier à une opportunité existante...</option>
                            {opportunities.map(o => (
                              <option key={o.id} value={o.id} className="bg-[#060812] text-[#F5F6FA]">
                                {o.title} ({o.companyName})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Entreprise suivie */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[#9AA0B2] uppercase font-semibold text-[10px]">Entreprise associée</span>
                    <p className="text-[#F5F6FA] font-medium flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#FF6685]" />
                      {contact.companyName}
                    </p>
                  </div>
                  <span className="text-[11px] text-[#9AA0B2] bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                    Fiche Entreprise Active
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: Message d'approche IA (Framework NACORA), Notes & Suivi, Historique */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* SECTION 6: Framework Réseau NACORA (LinkedIn & Email) */}
            <div id="networking-workspace-section">
              <NetworkingMessageGenerator
                contact={contact}
                profile={profile}
                onUpdate={onUpdate}
                showToast={showToast}
              />
            </div>

            {/* SECTION 5: Notes & Suivi */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F6FA] flex items-center gap-2 font-display">
                  <FileText className="w-4 h-4 text-[#FF6685]" />
                  Notes de Suivi
                </h3>
                {isEditingNotes ? (
                  <button
                    onClick={handleSaveNotes}
                    className="text-xs text-[#12B76A] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Enregistrer</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditingNotes(true)}
                    className="text-xs text-[#9AA0B2] hover:text-[#F5F6FA] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Modifier</span>
                  </button>
                )}
              </div>

              {/* Quick note addition */}
              <form onSubmit={handleAddQuickNote} className="flex gap-2">
                <input
                  type="text"
                  value={quickNoteText}
                  onChange={(e) => setQuickNoteText(e.target.value)}
                  placeholder="Consigner un échange (ex: Invitation acceptée...)"
                  className="glass-input flex-1 px-3 py-1.5 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
                />
                <GlassButton type="submit" size="sm" variant="primary" disabled={!quickNoteText.trim()}>
                  <Plus className="w-3.5 h-3.5 text-white" />
                </GlassButton>
              </form>

              {/* Notes content */}
              {isEditingNotes ? (
                <textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  className="w-full min-h-[120px] glass-input p-3 text-xs text-[#F5F6FA] leading-relaxed"
                  placeholder="Saisissez vos notes libres..."
                />
              ) : (
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-[#F5F6FA] whitespace-pre-line leading-relaxed min-h-[80px]">
                  {notesDraft || <span className="text-[#9AA0B2] italic">Aucune note enregistrée. Utilisez le champ ci-dessus pour consigner vos échanges.</span>}
                </div>
              )}
            </div>

            {/* SECTION 8: Historique Réel */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F6FA] flex items-center gap-2 font-display">
                <History className="w-4 h-4 text-[#9AA0B2]" />
                Historique d'Activité
              </h3>

              <div className="space-y-2.5 text-xs">
                {contact.history && contact.history.length > 0 ? (
                  <div className="space-y-2">
                    {contact.history.slice(0, 5).map((ev) => (
                      <div key={ev.id} className="flex items-start gap-2.5 p-2 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#FF6685] shrink-0 mt-1.5" />
                        <div className="flex-1 space-y-0.5">
                          <p className="text-[#F5F6FA] leading-snug">{ev.label}</p>
                          <span className="text-[10px] text-[#9AA0B2] block">
                            {new Date(ev.timestamp).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FF6685] shrink-0 mt-1.5" />
                    <div className="space-y-0.5">
                      <p className="text-[#F5F6FA]">Contact enregistré dans votre réseau NACORA</p>
                      <span className="text-[10px] text-[#9AA0B2]">
                        {new Date(contact.createdAt).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* --- EDIT MODAL --- */}
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

      {/* --- DELETE CONFIRMATION MODAL --- */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Supprimer le contact"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-200 leading-relaxed">
            Êtes-vous sûr de vouloir supprimer définitivement le contact <strong className="text-white font-bold">{contact.fullName}</strong> ({contact.companyName}) ?
            Cette action est irréversible.
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
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

      {/* --- ADD STRATEGIC PILLAR MODAL --- */}
      <Modal
        isOpen={isAddPillarModalOpen}
        onClose={() => setIsAddPillarModalOpen(false)}
        title="Ajouter un axe d'intérêt stratégique"
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#9AA0B2] uppercase">
              Pilier / Thématique *
            </label>
            <input
              type="text"
              value={newPillarTitle}
              onChange={(e) => setNewPillarTitle(e.target.value)}
              placeholder="Ex: Opportunité de mentorat, Décideur recrutement..."
              className="glass-input w-full px-3 py-2 text-xs text-[#F5F6FA]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#9AA0B2] uppercase">
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
            <label className="text-xs font-semibold text-[#9AA0B2] uppercase">
              Contexte & Rationale
            </label>
            <textarea
              value={newPillarContext}
              onChange={(e) => setNewPillarContext(e.target.value)}
              placeholder="Pourquoi cet axe est particulièrement pertinent pour ce contact..."
              rows={2}
              className="glass-input w-full p-2.5 text-xs text-[#F5F6FA] resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#9AA0B2] uppercase">
              Recommandation d'action
            </label>
            <textarea
              value={newPillarRecommendation}
              onChange={(e) => setNewPillarRecommendation(e.target.value)}
              placeholder="Ex: Proposer un échange court sur l'évolution du marché..."
              rows={2}
              className="glass-input w-full p-2.5 text-xs text-[#F5F6FA] resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={() => setIsAddPillarModalOpen(false)}
            >
              Annuler
            </GlassButton>
            <GlassButton
              variant="primary"
              size="sm"
              disabled={!newPillarTitle.trim()}
              onClick={handleAddCustomPillar}
            >
              Enregistrer l'axe
            </GlassButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// =========================================================================
// CONTACT EDIT MODAL
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

    const linkedCo = dbStore.getCompanyByNameOrCreate(companyName);

    const historyEvent = {
      id: "hist_" + Math.random().toString(36).substring(2, 9),
      type: "profile_updated" as const,
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
            <label className="text-xs text-[#9AA0B2] font-semibold">Poste actuel *</label>
            <input
              type="text"
              required
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
            />
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
              className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA] bg-[#060812]"
            >
              <option value="recruiter" className="bg-[#060812] text-[#F5F6FA]">Recruteur / RH</option>
              <option value="alumni" className="bg-[#060812] text-[#F5F6FA]">Alumni</option>
              <option value="sector_pro" className="bg-[#060812] text-[#F5F6FA]">Pro Secteur Cible</option>
              <option value="student" className="bg-[#060812] text-[#F5F6FA]">Étudiant</option>
              <option value="other_pro" className="bg-[#060812] text-[#F5F6FA]">Pro Autre Secteur</option>
              <option value="other" className="bg-[#060812] text-[#F5F6FA]">Autre</option>
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
              className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA] bg-[#060812]"
            >
              <option value="to_contact" className="bg-[#060812] text-[#F5F6FA]">À contacter</option>
              <option value="contacted" className="bg-[#060812] text-[#F5F6FA]">Message envoyé</option>
              <option value="exchanging" className="bg-[#060812] text-[#F5F6FA]">Échange en cours</option>
              <option value="interview_done" className="bg-[#060812] text-[#F5F6FA]">Entretien réalisé</option>
              <option value="not_interested" className="bg-[#060812] text-[#F5F6FA]">Sans suite</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#9AA0B2] font-semibold">Secteur</label>
            <input
              type="text"
              placeholder="ex: Banque Privée, Fintech..."
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#9AA0B2] font-semibold">Niveau / Type de profil</label>
            <input
              type="text"
              placeholder="ex: Manager, Consultant Senior, RH..."
              value={profileLevel}
              onChange={(e) => setProfileLevel(e.target.value)}
              className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
            />
          </div>

          <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
            <label className="text-xs text-[#9AA0B2] font-semibold">Formation / Parcours académique</label>
            <input
              type="text"
              placeholder="ex: IUT Clermont Auvergne, Master Finance..."
              value={academicPath}
              onChange={(e) => setAcademicPath(e.target.value)}
              className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
            />
          </div>

          <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
            <label className="text-xs text-[#9AA0B2] font-semibold">Entreprises précédentes (séparées par des virgules)</label>
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
              placeholder="ex: contact@entreprise.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#9AA0B2] font-semibold">Téléphone</label>
            <input
              type="tel"
              placeholder="ex: 06 12 34 56 78"
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
            <label className="text-xs text-[#9AA0B2] font-semibold">Lien internet / Site web / Portail de contact (optionnel)</label>
            <input
              type="url"
              placeholder="ex: https://entreprise.fr/candidature"
              value={contactUrl}
              onChange={(e) => setContactUrl(e.target.value)}
              className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
          <GlassButton type="button" variant="ghost" onClick={onClose}>
            Annuler
          </GlassButton>
          <GlassButton type="submit" variant="primary">
            Enregistrer les modifications
          </GlassButton>
        </div>
      </form>
    </Modal>
  );
};
