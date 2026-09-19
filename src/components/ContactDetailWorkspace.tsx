import React, { useState } from "react";
import { Contact, ContactCategory, ContactNetworkingStatus, Opportunity, CandidateProfile } from "../types";
import { dbStore } from "../dbStore";
import { GlassButton, Modal } from "./Shared";
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
  Award
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
  const [activeMessage, setActiveMessage] = useState<string>(contact.aiCustomMessage || "");
  const [messageType, setMessageType] = useState<"invite" | "inmail" | "followup">("invite");
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  const [hasCopiedMessage, setHasCopiedMessage] = useState(false);

  // Quick note input
  const [quickNoteText, setQuickNoteText] = useState("");
  const [notesDraft, setNotesDraft] = useState(contact.notes || "");
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  // Opportunities list for linking
  const opportunities = dbStore.getOpportunities();

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

  const getCategoryColor = (cat: ContactCategory) => {
    switch (cat) {
      case "recruiter":
        return "bg-[rgba(18,183,106,0.14)] text-[#12B76A] border-[rgba(18,183,106,0.28)]";
      case "alumni":
        return "bg-[rgba(14,165,233,0.12)] text-[#38bdf8] border-[rgba(14,165,233,0.25)]";
      case "sector_pro":
        return "bg-[rgba(247,144,9,0.14)] text-[#f79009] border-[rgba(247,144,9,0.28)]";
      case "student":
        return "bg-[rgba(147,51,234,0.14)] text-[#c084fc] border-[rgba(147,51,234,0.28)]";
      default:
        return "bg-white/[0.04] text-[#9AA0B2] border-white/10";
    }
  };

  const getNetworkingStatusConfig = (status?: ContactNetworkingStatus) => {
    switch (status) {
      case "contacted":
        return { label: "Message envoyé", color: "bg-[rgba(14,165,233,0.12)] text-[#38bdf8] border-[rgba(14,165,233,0.25)]" };
      case "exchanging":
        return { label: "Échange en cours", color: "bg-[rgba(147,51,234,0.14)] text-[#c084fc] border-[rgba(147,51,234,0.28)]" };
      case "interview_done":
        return { label: "Entretien réseau réalisé", color: "bg-[rgba(18,183,106,0.14)] text-[#12B76A] border-[rgba(18,183,106,0.28)]" };
      case "not_interested":
        return { label: "Sans suite", color: "bg-white/[0.04] text-[#9AA0B2] border-white/10" };
      case "to_contact":
      default:
        return { label: "À contacter", color: "bg-[rgba(247,144,9,0.14)] text-[#f79009] border-[rgba(247,144,9,0.28)]" };
    }
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

  // Generate customized message with Gemini AI
  const handleGenerateOutreach = async () => {
    setIsGeneratingMessage(true);
    showToast("Génération du message d'approche personnalisé par l'IA...", "ai");

    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "outreachMessage",
          payload: {
            contactName: contact.fullName,
            contactJob: contact.jobTitle,
            contactCompany: contact.companyName,
            connectionPoints: contact.connectionPoints || [],
            profile: profile,
            format: messageType
          }
        })
      });

      if (!response.ok) throw new Error("API message failed");
      const data = await response.json();
      const generated = data.message || "";

      setActiveMessage(generated);

      // Save to contact
      const historyEvent = {
        id: "hist_" + Math.random().toString(36).substring(2, 9),
        type: "message_generated" as const,
        label: `Message d'approche généré (${messageType === "invite" ? "Invitation LinkedIn" : messageType === "inmail" ? "InMail / Email" : "Relance"})`,
        timestamp: new Date().toISOString()
      };

      const updated: Contact = {
        ...contact,
        aiCustomMessage: generated,
        history: [historyEvent, ...(contact.history || [])]
      };
      dbStore.updateContact(updated);
      onUpdate(updated);

      showToast("Message personnalisé prêt !", "success");
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de la génération IA", "error");
    } finally {
      setIsGeneratingMessage(false);
    }
  };

  const handleCopyMessage = () => {
    if (!activeMessage) return;
    navigator.clipboard.writeText(activeMessage);
    setHasCopiedMessage(true);
    showToast("Message copié dans le presse-papiers !", "success");
    setTimeout(() => setHasCopiedMessage(false), 2500);
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
                onClick={handleGenerateOutreach}
                disabled={isGeneratingMessage}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-900/30 to-rose-900/30 hover:from-purple-900/45 hover:to-rose-900/45 text-purple-200 hover:text-white border border-purple-500/30 text-xs font-semibold shadow-[0_4px_16px_rgba(147,51,234,0.2)] transition-spring cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#C084FC] animate-pulse" />
                <span>{isGeneratingMessage ? "Génération..." : "Message IA"}</span>
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
            {/* 1. Catégorie */}
            <span className={`px-2.5 py-1 rounded-xl border font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 ${getCategoryColor(contact.category)}`}>
              <UserCheck className="w-3.5 h-3.5" />
              {getCategoryLabel(contact.category)}
            </span>

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
                <LinkIcon className="w-3.5 h-3.5 text-[#34D399]" />
                Offre : <span className="text-[#34D399] font-medium">{contact.opportunityTitle}</span>
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
                      className="text-[#38bdf8] hover:underline flex items-center gap-1 truncate"
                    >
                      <Linkedin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{contact.linkedInUrl.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "")}</span>
                    </a>
                  </div>
                )}

                {/* Email */}
                {contact.email && (
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <span className="text-[#9AA0B2] uppercase font-semibold text-[10px]">Email professionnel</span>
                    <a href={`mailto:${contact.email}`} className="text-[#38bdf8] hover:underline flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3 shrink-0" />
                      <span className="truncate">{contact.email}</span>
                    </a>
                  </div>
                )}

                {/* Téléphone */}
                {contact.phone && (
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <span className="text-[#9AA0B2] uppercase font-semibold text-[10px]">Téléphone</span>
                    <a href={`tel:${contact.phone}`} className="text-[#38bdf8] hover:underline flex items-center gap-1">
                      <Phone className="w-3 h-3 shrink-0" />
                      <span>{contact.phone}</span>
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
                <GraduationCap className="w-4 h-4 text-[#38BDF8]" />
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

            {/* SECTION 3: Pourquoi ce contact est pertinent (Analyse IA) */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/[0.12] to-white/[0.02] border border-purple-500/20 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#C084FC] flex items-center gap-2 font-display">
                  <Sparkles className="w-4 h-4 text-[#C084FC]" />
                  Pourquoi ce contact est pertinent
                </h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-500/30">
                  Score : {contact.relevanceScore}%
                </span>
              </div>

              <div className="space-y-3 text-xs">
                {/* Connection points list */}
                <div className="space-y-2">
                  <span className="text-[#9AA0B2] uppercase font-semibold text-[10px]">Points de connexion identifiés :</span>
                  {contact.connectionPoints && contact.connectionPoints.length > 0 ? (
                    <div className="space-y-1.5">
                      {contact.connectionPoints.map((pt, i) => (
                        <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-purple-500/15">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#C084FC] shrink-0 mt-0.5" />
                          <span className="text-[#F5F6FA] leading-relaxed">{pt}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#9AA0B2] italic">Aucun point de connexion spécifique détecté.</p>
                  )}
                </div>

                {/* Synthèse de classification */}
                <div className="p-3 rounded-xl bg-black/20 border border-white/5 space-y-1 text-[#9AA0B2] leading-relaxed">
                  <span className="text-[#F5F6FA] font-semibold text-[11px] block">Synthèse du profil :</span>
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
                </div>
              </div>
            </div>

            {/* SECTION 4: Relations avec NACORA */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F6FA] flex items-center gap-2 font-display">
                <Layers className="w-4 h-4 text-[#34D399]" />
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
                        className="text-[11px] text-[#F04438] hover:underline cursor-pointer"
                      >
                        Dissocier
                      </button>
                    )}
                  </div>

                  {contact.opportunityTitle ? (
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-[rgba(18,183,106,0.08)] border border-[rgba(18,183,106,0.25)]">
                      <div className="flex items-center gap-2 truncate">
                        <LinkIcon className="w-3.5 h-3.5 text-[#34D399] shrink-0" />
                        <span className="text-[#34D399] font-medium truncate">{contact.opportunityTitle}</span>
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
          {/* RIGHT COLUMN: Message d'approche IA, Notes & Suivi, Historique            */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* SECTION 6: Message d'approche IA (Gemini) */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-purple-500/20 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#C084FC] flex items-center gap-2 font-display">
                  <Sparkles className="w-4 h-4 text-[#C084FC]" />
                  Message d'Approche IA
                </h3>
                <GlassButton
                  variant="ai"
                  size="sm"
                  disabled={isGeneratingMessage}
                  onClick={handleGenerateOutreach}
                >
                  {isGeneratingMessage ? "Rédaction..." : "Générer avec Gemini"}
                </GlassButton>
              </div>

              {/* Format selection */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/30 border border-white/5 text-xs">
                <button
                  onClick={() => setMessageType("invite")}
                  className={`flex-1 py-1 px-2 rounded-lg text-center font-medium transition-all ${
                    messageType === "invite" 
                      ? "bg-white/10 text-[#F5F6FA] shadow-sm" 
                      : "text-[#9AA0B2] hover:text-[#F5F6FA]"
                  }`}
                >
                  Invitation (&lt;300 car.)
                </button>
                <button
                  onClick={() => setMessageType("inmail")}
                  className={`flex-1 py-1 px-2 rounded-lg text-center font-medium transition-all ${
                    messageType === "inmail" 
                      ? "bg-white/10 text-[#F5F6FA] shadow-sm" 
                      : "text-[#9AA0B2] hover:text-[#F5F6FA]"
                  }`}
                >
                  InMail / Email
                </button>
                <button
                  onClick={() => setMessageType("followup")}
                  className={`flex-1 py-1 px-2 rounded-lg text-center font-medium transition-all ${
                    messageType === "followup" 
                      ? "bg-white/10 text-[#F5F6FA] shadow-sm" 
                      : "text-[#9AA0B2] hover:text-[#F5F6FA]"
                  }`}
                >
                  Relance
                </button>
              </div>

              {/* Message display & live editing */}
              {activeMessage ? (
                <div className="space-y-3">
                  <textarea
                    value={activeMessage}
                    onChange={(e) => {
                      setActiveMessage(e.target.value);
                      const updated: Contact = { ...contact, aiCustomMessage: e.target.value };
                      dbStore.updateContact(updated);
                      onUpdate(updated);
                    }}
                    className="w-full min-h-[140px] glass-input p-3.5 text-xs text-[#F5F6FA] leading-relaxed focus:border-purple-400/50 resize-y"
                    placeholder="Message généré par Gemini..."
                  />

                  <div className="flex items-center justify-between text-xs">
                    <span className={`text-[11px] ${
                      messageType === "invite" && activeMessage.length > 300 
                        ? "text-[#F04438] font-semibold" 
                        : "text-[#9AA0B2]"
                    }`}>
                      {activeMessage.length} caractères {messageType === "invite" && "(limite LinkedIn : 300)"}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyMessage}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/30 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        {hasCopiedMessage ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#12B76A]" />
                            <span className="text-[#12B76A]">Copié !</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copier</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center space-y-2">
                  <p className="text-xs text-[#9AA0B2] leading-relaxed">
                    Cliquez sur <strong>"Générer avec Gemini"</strong> pour rédiger une approche ultra-personnalisée exploitant votre profil et les points de connexion avec ce contact.
                  </p>
                </div>
              )}
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
