import React, { useState, useRef } from "react";
import { CandidateProfile, Contact, ContactNetworkingStatus } from "../types";
import { dbStore } from "../dbStore";
import { GlassButton, Badge, Modal } from "./Shared";
import { 
  parseLinkedInMessagesCsv, 
  parseRawPastedConversation, 
  evaluateProfessionalRelevance,
  applyConversationImports,
  DetectedConversation, 
  ConversationImportSummary,
  ConversationImportSource,
  LinkedInCsvColumnMapping
} from "../utils/conversationImportEngine";
import { 
  Upload, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  Search, 
  Filter, 
  X, 
  FileSpreadsheet, 
  RefreshCw, 
  UserCheck, 
  Briefcase, 
  Building2, 
  ArrowRight, 
  Check, 
  ChevronDown, 
  ChevronRight,
  Info, 
  Linkedin, 
  Mail, 
  FileText, 
  Copy, 
  CornerDownRight, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Flame, 
  Plus, 
  CheckCheck,
  SlidersHorizontal,
  ExternalLink
} from "lucide-react";

interface ConversationImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateProfile: CandidateProfile;
  showToast: (message: string, type: "success" | "error" | "info" | "ai") => void;
  onConversationImported?: (targetContactId: string) => void;
}

type ImportWorkflowStep = "select_source" | "input" | "analyzing" | "preview" | "completed";

export const ConversationImportModal: React.FC<ConversationImportModalProps> = ({
  isOpen,
  onClose,
  candidateProfile,
  showToast,
  onConversationImported
}) => {
  // Navigation step
  const [step, setStep] = useState<ImportWorkflowStep>("select_source");
  const [source, setSource] = useState<ConversationImportSource>("paste");

  // Mode inputs
  const [pastedText, setPastedText] = useState("");
  const [pastedChannel, setPastedChannel] = useState<"linkedin" | "email">("linkedin");
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [rawCsvContent, setRawCsvContent] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);

  // Email simulation input
  const [emailSenderInput, setEmailSenderInput] = useState("");
  const [emailSubjectInput, setEmailSubjectInput] = useState("");
  const [emailBodyInput, setEmailBodyInput] = useState("");

  // Analysis results
  const [conversations, setConversations] = useState<DetectedConversation[]>([]);
  const [summary, setSummary] = useState<ConversationImportSummary | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<LinkedInCsvColumnMapping | null>(null);
  const [showMappingEditor, setShowMappingEditor] = useState(false);

  // Search & Filters in preview
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "auto" | "verify" | "new">("all");
  const [expandedConvoId, setExpandedConvoId] = useState<string | null>(null);

  // Loading state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");

  // Completed stats
  const [importStats, setImportStats] = useState<{
    updatedContacts: number;
    newContacts: number;
    totalMessages: number;
    firstContactId?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when closed or opened
  const handleReset = () => {
    setStep("select_source");
    setPastedText("");
    setRawCsvContent("");
    setCsvFileName(null);
    setConversations([]);
    setSummary(null);
    setShowMappingEditor(false);
    setImportStats(null);
    setExpandedConvoId(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // --------------------------------------------------------------------------
  // WORKFLOW A : Traitement du Copier-Coller
  // --------------------------------------------------------------------------
  const handleAnalyzePasted = async () => {
    if (!pastedText.trim()) {
      showToast("Veuillez coller le contenu de la discussion.", "error");
      return;
    }

    setIsProcessing(true);
    setStep("analyzing");
    setProgressMessage("Analyse IA des interlocuteurs, des messages et de la relation...");

    try {
      const contacts = dbStore.getContacts();
      const detected = await parseRawPastedConversation(
        pastedText,
        candidateProfile,
        contacts,
        pastedChannel
      );

      setConversations([detected]);
      setExpandedConvoId(detected.id);
      setSummary({
        totalMessagesProcessed: detected.messages.length,
        conversationsFound: 1,
        contactsAssociated: detected.matchStatus === "auto_matched" || detected.matchStatus === "proposed" ? 1 : 0,
        newContactsToCreate: detected.matchStatus === "new_contact" ? 1 : 0,
        matchesNeedingVerification: detected.matchStatus === "needs_verification" ? 1 : 0,
        duplicatesSkipped: detected.messages.filter(m => m.isDuplicate).length,
        nonProfessionalFiltered: detected.professionalRelevance < 60 ? 1 : 0
      });

      setStep("preview");
      showToast("Conversation analysée avec succès par NACORA AI !", "ai");
    } catch (e) {
      showToast("Erreur lors de l'analyse. Vérification en cours.", "error");
      setStep("input");
    } finally {
      setIsProcessing(false);
    }
  };

  // --------------------------------------------------------------------------
  // WORKFLOW B : Traitement Email
  // --------------------------------------------------------------------------
  const handleAnalyzeEmail = async () => {
    const raw = `${emailSubjectInput ? `Objet: ${emailSubjectInput}\n` : ""}${emailSenderInput ? `De: ${emailSenderInput}\n` : ""}\n${emailBodyInput}`;
    if (!emailBodyInput.trim()) {
      showToast("Veuillez renseigner le contenu de l'email.", "error");
      return;
    }

    setIsProcessing(true);
    setStep("analyzing");
    setProgressMessage("Filtrage professionnel et analyse IA de l'email...");

    try {
      const contacts = dbStore.getContacts();
      const detected = await parseRawPastedConversation(
        raw,
        candidateProfile,
        contacts,
        "email"
      );

      // Force email metadata
      if (emailSenderInput.includes("@")) {
        detected.contactCandidate.email = emailSenderInput.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)?.[1];
      }

      setConversations([detected]);
      setExpandedConvoId(detected.id);
      setSummary({
        totalMessagesProcessed: detected.messages.length,
        conversationsFound: 1,
        contactsAssociated: detected.matchStatus === "auto_matched" || detected.matchStatus === "proposed" ? 1 : 0,
        newContactsToCreate: detected.matchStatus === "new_contact" ? 1 : 0,
        matchesNeedingVerification: detected.matchStatus === "needs_verification" ? 1 : 0,
        duplicatesSkipped: detected.messages.filter(m => m.isDuplicate).length,
        nonProfessionalFiltered: detected.professionalRelevance < 60 ? 1 : 0
      });

      setStep("preview");
      showToast("Email professionnel analysé !", "ai");
    } catch (e) {
      showToast("Erreur lors de l'analyse.", "error");
      setStep("input");
    } finally {
      setIsProcessing(false);
    }
  };

  // --------------------------------------------------------------------------
  // WORKFLOW C : Traitement Fichier CSV LinkedIn
  // --------------------------------------------------------------------------
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelected(files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".txt")) {
      showToast("Veuillez sélectionner un fichier CSV (export LinkedIn)", "error");
      return;
    }
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRawCsvContent(text);
      triggerCsvAnalysis(text);
    };
    reader.readAsText(file, "UTF-8");
  };

  const triggerCsvAnalysis = (csvText: string, customMapping?: Partial<LinkedInCsvColumnMapping>) => {
    setIsProcessing(true);
    setStep("analyzing");
    setProgressMessage("Reconstruction des conversations, détection des interlocuteurs et déduplication...");

    setTimeout(() => {
      try {
        const contacts = dbStore.getContacts();
        const { conversations: detected, summary: sum, headers, detectedMapping } = parseLinkedInMessagesCsv(
          csvText,
          candidateProfile,
          contacts,
          customMapping
        );

        setConversations(detected);
        setSummary(sum);
        setCsvHeaders(headers);
        setColumnMapping(detectedMapping);
        setStep("preview");

        showToast(`${detected.length} conversation(s) LinkedIn reconstruite(s) !`, "success");
      } catch (err) {
        showToast("Erreur lors du traitement du fichier CSV.", "error");
        setStep("input");
      } finally {
        setIsProcessing(false);
      }
    }, 400);
  };

  // --------------------------------------------------------------------------
  // VALIDATION & COMMIT
  // --------------------------------------------------------------------------
  const handleCommitImport = () => {
    const selectedConvos = conversations.filter(c => c.selected);
    if (selectedConvos.length === 0) {
      showToast("Aucune conversation sélectionnée pour l'import.", "error");
      return;
    }

    const contacts = dbStore.getContacts();
    const result = applyConversationImports(selectedConvos, contacts, candidateProfile);

    setImportStats({
      updatedContacts: result.updatedContactsCount,
      newContacts: result.newContactsCount,
      totalMessages: result.importedMessagesCount,
      firstContactId: result.affectedContactIds[0]
    });

    setStep("completed");
    showToast(
      `Import réussi : ${result.importedMessagesCount} message(s) intégrés à la Messagerie !`,
      "success"
    );
  };

  // Toggle selection
  const handleToggleSelect = (convoId: string) => {
    setConversations(prev => prev.map(c => c.id === convoId ? { ...c, selected: !c.selected } : c));
  };

  // Toggle Action (merge vs create vs skip)
  const handleChangeAction = (convoId: string, action: "merge_existing" | "create_new" | "skip") => {
    setConversations(prev => prev.map(c => c.id === convoId ? { ...c, action, selected: action !== "skip" } : c));
  };

  // Change Contact Networking Status in preview
  const handleChangeStatus = (convoId: string, newStatus: ContactNetworkingStatus) => {
    setConversations(prev => prev.map(c => c.id === convoId ? { ...c, detectedStatus: newStatus } : c));
  };

  // Change Assigned Contact in preview
  const handleAssignExistingContact = (convoId: string, targetContactId: string) => {
    const contacts = dbStore.getContacts();
    const target = contacts.find(c => c.id === targetContactId) || null;

    setConversations(prev => prev.map(c => {
      if (c.id !== convoId) return c;
      return {
        ...c,
        matchedContactId: targetContactId,
        matchedContact: target,
        matchConfidence: 100,
        matchStatus: "auto_matched",
        matchReason: "Attribution manuelle vérifiée",
        action: "merge_existing"
      };
    }));
    showToast("Contact réassocié avec succès !", "info");
  };

  // Filtered preview list
  const filteredConversations = conversations.filter(c => {
    if (statusFilter === "auto" && c.matchStatus !== "auto_matched") return false;
    if (statusFilter === "verify" && c.matchStatus !== "needs_verification" && c.matchStatus !== "proposed") return false;
    if (statusFilter === "new" && c.matchStatus !== "new_contact") return false;

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchName = c.contactCandidate.fullName.toLowerCase().includes(q);
      const matchCo = (c.contactCandidate.companyName || "").toLowerCase().includes(q);
      const matchText = c.messages.some(m => m.text.toLowerCase().includes(q));
      if (!matchName && !matchCo && !matchText) return false;
    }

    return true;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title=""
      size="xl"
    >
      <div className="flex flex-col max-h-[85vh] -mx-4 -my-4 sm:-mx-6 sm:-my-6 text-[#F5F6FA] select-none">
        
        {/* ========================================================================= */}
        {/* HEADER MODAL                                                              */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[rgba(216,26,69,0.2)] to-[rgba(192,132,252,0.2)] border border-[rgba(216,26,69,0.35)] flex items-center justify-center text-[#FF6685] shrink-0 shadow-md">
              <Sparkles className="w-5 h-5 text-[#C084FC]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#F5F6FA] font-display">
                  Importer une conversation
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-[10px] font-bold text-purple-300">
                  Moteur IA NACORA
                </span>
              </div>
              <p className="text-xs text-[#9AA0B2]">
                Reconstruction, filtrage professionnel, déduplication et intégration automatique.
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#9AA0B2] hover:text-white border border-white/10 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* BODY                                                                      */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* STEP 1: CHOIX DE LA SOURCE */}
          {step === "select_source" && (
            <div className="space-y-6">
              <div className="text-center max-w-md mx-auto space-y-1">
                <h3 className="text-sm font-bold text-[#F5F6FA]">
                  Choisissez le canal de vos échanges
                </h3>
                <p className="text-xs text-[#9AA0B2]">
                  Sélectionnez la méthode d'import correspondant à la provenance de vos messages.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Option A: Copier-coller une discussion */}
                <div
                  onClick={() => {
                    setSource("paste");
                    setStep("input");
                  }}
                  className="p-5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-[#D81A45]/40 transition-all cursor-pointer group flex flex-col justify-between space-y-4 text-left shadow-lg hover:shadow-[0_8px_24px_rgba(216,26,69,0.1)]"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500/15 to-pink-600/15 border border-rose-500/30 flex items-center justify-center text-[#FF6685]">
                      <Copy className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#F5F6FA] group-hover:text-white flex items-center gap-1.5">
                        <span>Copier-coller</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#FF6685]" />
                      </h4>
                      <p className="text-xs text-[#9AA0B2] mt-1 leading-relaxed">
                        Collez directement le texte brut d'un échange LinkedIn, WhatsApp ou messagerie pro.
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-[#FF6685] font-semibold">
                    <span>Aucun nettoyage requis</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10">Instantané</span>
                  </div>
                </div>

                {/* Option B: Import CSV LinkedIn */}
                <div
                  onClick={() => {
                    setSource("linkedin_csv");
                    setStep("input");
                  }}
                  className="p-5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-[#38BDF8]/40 transition-all cursor-pointer group flex flex-col justify-between space-y-4 text-left shadow-lg hover:shadow-[0_8px_24px_rgba(56,189,248,0.1)]"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#0A66C2]/15 border border-[#0A66C2]/30 flex items-center justify-center text-[#38BDF8]">
                      <Linkedin className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#F5F6FA] group-hover:text-white flex items-center gap-1.5">
                        <span>CSV LinkedIn</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#38BDF8]" />
                      </h4>
                      <p className="text-xs text-[#9AA0B2] mt-1 leading-relaxed">
                        Importez votre fichier d'archive <code className="text-[#38BDF8] font-mono">messages.csv</code> exporté depuis LinkedIn.
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-[#38BDF8] font-semibold">
                    <span>Multi-conversations</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10">Archive complète</span>
                  </div>
                </div>

                {/* Option C: Connexion / Analyse Email */}
                <div
                  onClick={() => {
                    setSource("email");
                    setStep("input");
                  }}
                  className="p-5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-[#34D399]/40 transition-all cursor-pointer group flex flex-col justify-between space-y-4 text-left shadow-lg hover:shadow-[0_8px_24px_rgba(52,211,153,0.1)]"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-[#34D399]">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#F5F6FA] group-hover:text-white flex items-center gap-1.5">
                        <span>Échanges Email</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#34D399]" />
                      </h4>
                      <p className="text-xs text-[#9AA0B2] mt-1 leading-relaxed">
                        Analysez vos emails avec filtre strict anti-spam & détection de candidatures/recruteurs.
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-[#34D399] font-semibold">
                    <span>Filtre IA anti-pub</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10">Pertinence Pro</span>
                  </div>
                </div>

              </div>

              {/* Guarantees Box */}
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs text-[#9AA0B2] flex-wrap gap-2">
                <span className="flex items-center gap-1.5 text-white/80 font-medium">
                  <ShieldCheck className="w-4 h-4 text-[#34D399]" /> Déduplication automatique
                </span>
                <span className="flex items-center gap-1.5 text-white/80 font-medium">
                  <UserCheck className="w-4 h-4 text-[#C084FC]" /> Rapprochement intelligent avec votre CRM
                </span>
                <span className="flex items-center gap-1.5 text-white/80 font-medium">
                  <Flame className="w-4 h-4 text-[#FF6685]" /> Zéro donnée fictive inventée
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: INPUT PAR SOURCE */}
          {step === "input" && (
            <div className="space-y-5">
              
              {/* Top back selector */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <button
                  onClick={() => setStep("select_source")}
                  className="flex items-center gap-1.5 text-xs text-[#9AA0B2] hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  <span>Changer de source</span>
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">
                    {source === "paste" && "Mode Copier-Coller Brut"}
                    {source === "linkedin_csv" && "Mode Fichier CSV LinkedIn"}
                    {source === "email" && "Mode Analyse Email Professionnel"}
                  </span>
                </div>
              </div>

              {/* Input for SOURCE A: Paste */}
              {source === "paste" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <label className="text-xs font-semibold text-[#F5F6FA] block">
                      Collez ici votre conversation (LinkedIn, email ou autre échange) :
                    </label>
                    <div className="flex items-center bg-white/5 p-0.5 rounded-xl border border-white/10 text-xs shrink-0">
                      <button
                        onClick={() => setPastedChannel("linkedin")}
                        className={`px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all ${
                          pastedChannel === "linkedin" ? "bg-[#38BDF8]/20 text-[#38BDF8] font-bold" : "text-[#9AA0B2]"
                        }`}
                      >
                        <Linkedin className="w-3 h-3" />
                        <span>LinkedIn</span>
                      </button>
                      <button
                        onClick={() => setPastedChannel("email")}
                        className={`px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all ${
                          pastedChannel === "email" ? "bg-[#34D399]/20 text-[#34D399] font-bold" : "text-[#9AA0B2]"
                        }`}
                      >
                        <Mail className="w-3 h-3" />
                        <span>Email</span>
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    rows={8}
                    placeholder={`Exemple :\nSébastien Champroux\nBonjour Nathan, merci pour ton message...\n\nNathan\nBonjour Sébastien, je me permets de vous contacter...\n\nSébastien Champroux\nAvec plaisir, je peux échanger avec vous mardi.`}
                    className="w-full glass-input p-3.5 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/50 font-sans focus:border-[#D81A45]/50 rounded-2xl resize-none leading-relaxed"
                  />

                  <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-[11px] text-[#9AA0B2] leading-relaxed">
                    💡 <strong>Pas besoin de nettoyer :</strong> L'IA sépare automatiquement les messages, identifie qui parle, déduit le sens entrant/sortant, calcule le statut de l'échange et vérifie si le contact existe déjà dans votre répertoire.
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <GlassButton
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep("select_source")}
                    >
                      Annuler
                    </GlassButton>
                    <GlassButton
                      variant="primary"
                      size="sm"
                      onClick={handleAnalyzePasted}
                      disabled={!pastedText.trim()}
                      icon={<Sparkles className="w-3.5 h-3.5 text-[#C084FC]" />}
                    >
                      Lancer l'analyse IA
                    </GlassButton>
                  </div>
                </div>
              )}

              {/* Input for SOURCE B: Email */}
              {source === "email" && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-xs space-y-1">
                    <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" /> Filtre professionnel strict activé
                    </span>
                    <p className="text-[#9AA0B2]">
                      Les newsletters, publicités, spams et notifications d'achat sont automatiquement filtrés. Seuls les recruteurs, opportunités et contacts réseau sont qualifiés.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[#9AA0B2] block mb-1">De (Expéditeur) :</label>
                      <input
                        type="text"
                        value={emailSenderInput}
                        onChange={(e) => setEmailSenderInput(e.target.value)}
                        placeholder="ex: Sophie Martin <s.martin@bnpparibas.com>"
                        className="w-full glass-input px-3 py-2 text-xs text-[#F5F6FA] rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#9AA0B2] block mb-1">Objet :</label>
                      <input
                        type="text"
                        value={emailSubjectInput}
                        onChange={(e) => setEmailSubjectInput(e.target.value)}
                        placeholder="ex: Re: Candidature Alternance Analyste"
                        className="w-full glass-input px-3 py-2 text-xs text-[#F5F6FA] rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#F5F6FA] block mb-1">
                      Corps de l'email ou fil de discussion :
                    </label>
                    <textarea
                      value={emailBodyInput}
                      onChange={(e) => setEmailBodyInput(e.target.value)}
                      rows={6}
                      placeholder={`Bonjour Nathan,\n\nJ'ai bien reçu votre candidature et votre profil a retenu notre attention.\nSeriez-vous ouvert à un échange téléphonique jeudi matin ?\n\nBien cordialement,\nSophie`}
                      className="w-full glass-input p-3 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/50 rounded-2xl resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <GlassButton
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep("select_source")}
                    >
                      Annuler
                    </GlassButton>
                    <GlassButton
                      variant="primary"
                      size="sm"
                      onClick={handleAnalyzeEmail}
                      disabled={!emailBodyInput.trim()}
                      icon={<Sparkles className="w-3.5 h-3.5 text-[#34D399]" />}
                    >
                      Analyser l'email
                    </GlassButton>
                  </div>
                </div>
              )}

              {/* Input for SOURCE C: CSV LinkedIn */}
              {source === "linkedin_csv" && (
                <div className="space-y-4">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-3 ${
                      isDragging
                        ? "border-[#38BDF8] bg-sky-500/10 shadow-[0_0_24px_rgba(56,189,248,0.2)]"
                        : "border-white/15 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/30"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.txt"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelected(file);
                      }}
                    />

                    <div className="w-14 h-14 rounded-2xl bg-[#0A66C2]/15 border border-[#0A66C2]/30 flex items-center justify-center text-[#38BDF8] shadow-md">
                      <FileSpreadsheet className="w-7 h-7" />
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-[#F5F6FA]">
                        {csvFileName ? csvFileName : "Glissez-déposez votre fichier messages.csv"}
                      </h4>
                      <p className="text-xs text-[#9AA0B2] mt-1">
                        ou cliquez pour parcourir vos fichiers sur votre ordinateur
                      </p>
                    </div>

                    <div className="text-[11px] text-[#38BDF8] flex items-center gap-1 font-semibold">
                      <span>Export LinkedIn standard pris en charge</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-[11px] text-[#9AA0B2] flex items-start gap-2">
                    <Info className="w-4 h-4 text-[#38BDF8] shrink-0 mt-0.5" />
                    <div>
                      <strong>Comment obtenir ce fichier :</strong> Sur LinkedIn, rendez-vous dans <em>Paramètres et confidentialité ➔ Confidentialité des données ➔ Obtenir une copie de vos données ➔ Messages</em>.
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* STEP 3: ANALYSING SPINNER */}
          {step === "analyzing" && (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-[rgba(216,26,69,0.12)] border border-[rgba(216,26,69,0.35)] flex items-center justify-center text-[#FF6685] shadow-[0_0_30px_rgba(216,26,69,0.2)]">
                <RefreshCw className="w-8 h-8 animate-spin text-[#C084FC]" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-sm font-bold text-[#F5F6FA]">
                  Analyse IA en cours...
                </h3>
                <p className="text-xs text-[#9AA0B2]">
                  {progressMessage}
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: PREVIEW & VERIFICATION INTERACTIVE */}
          {step === "preview" && (
            <div className="space-y-5">
              
              {/* Global Summary Ribbon */}
              {summary && (
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider font-display">
                        Synthèse de l'import analysé
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-bold text-emerald-300">
                        {summary.conversationsFound} conversation{summary.conversationsFound > 1 ? "s" : ""}
                      </span>
                    </div>

                    {source === "linkedin_csv" && (
                      <button
                        onClick={() => setShowMappingEditor(!showMappingEditor)}
                        className="text-[11px] text-[#38BDF8] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <SlidersHorizontal className="w-3 h-3" />
                        <span>{showMappingEditor ? "Masquer colonnes" : "Ajuster colonnes CSV"}</span>
                      </button>
                    )}
                  </div>

                  {/* Summary Metric Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-[#9AA0B2] text-[10px] block">Messages analysés</span>
                      <span className="font-bold text-white text-sm">{summary.totalMessagesProcessed}</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-[#9AA0B2] text-[10px] block">Contacts associés</span>
                      <span className="font-bold text-emerald-400 text-sm">{summary.contactsAssociated}</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-[#9AA0B2] text-[10px] block">Nouveaux contacts</span>
                      <span className="font-bold text-[#FF6685] text-sm">{summary.newContactsToCreate}</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-[#9AA0B2] text-[10px] block">Doublons ignorés</span>
                      <span className="font-bold text-amber-300 text-sm">{summary.duplicatesSkipped}</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-[#9AA0B2] text-[10px] block">Pubs / Spam écartés</span>
                      <span className="font-bold text-sky-400 text-sm">{summary.nonProfessionalFiltered}</span>
                    </div>
                  </div>

                  {summary.nonProfessionalFiltered > 0 && (
                    <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 shrink-0 text-sky-400" />
                      <span>
                        <strong>{summary.nonProfessionalFiltered} conversation(s) publicitaire(s) ou sponsorisée(s)</strong> (Sponsored Conversations, InMails promotionnels) ont été automatiquement écartées pour ne pas polluer vos contacts.
                      </span>
                    </div>
                  )}

                  {/* Column mapping override drawer if requested */}
                  {showMappingEditor && columnMapping && (
                    <div className="pt-3 border-t border-white/5 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B2] block">
                        Mapping des colonnes CSV détectées :
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] text-[#9AA0B2] block">Expéditeur (From) :</label>
                          <select
                            value={columnMapping.fromCol}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setColumnMapping({ ...columnMapping, fromCol: val });
                              triggerCsvAnalysis(rawCsvContent, { fromCol: val });
                            }}
                            className="w-full glass-input px-2 py-1 text-[11px] rounded-lg"
                          >
                            {csvHeaders.map((h, i) => (
                              <option key={i} value={i} className="bg-[#090D1A]">{h}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] text-[#9AA0B2] block">Destinataire (To) :</label>
                          <select
                            value={columnMapping.toCol}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setColumnMapping({ ...columnMapping, toCol: val });
                              triggerCsvAnalysis(rawCsvContent, { toCol: val });
                            }}
                            className="w-full glass-input px-2 py-1 text-[11px] rounded-lg"
                          >
                            {csvHeaders.map((h, i) => (
                              <option key={i} value={i} className="bg-[#090D1A]">{h}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] text-[#9AA0B2] block">Date / Heure :</label>
                          <select
                            value={columnMapping.dateCol}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setColumnMapping({ ...columnMapping, dateCol: val });
                              triggerCsvAnalysis(rawCsvContent, { dateCol: val });
                            }}
                            className="w-full glass-input px-2 py-1 text-[11px] rounded-lg"
                          >
                            {csvHeaders.map((h, i) => (
                              <option key={i} value={i} className="bg-[#090D1A]">{h}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] text-[#9AA0B2] block">Message (Content) :</label>
                          <select
                            value={columnMapping.contentCol}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setColumnMapping({ ...columnMapping, contentCol: val });
                              triggerCsvAnalysis(rawCsvContent, { contentCol: val });
                            }}
                            className="w-full glass-input px-2 py-1 text-[11px] rounded-lg"
                          >
                            {csvHeaders.map((h, i) => (
                              <option key={i} value={i} className="bg-[#090D1A]">{h}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Filters for multiple conversations */}
              {conversations.length > 1 && (
                <div className="flex items-center justify-between gap-3 flex-wrap text-xs">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9AA0B2]" />
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Filtrer par contact, entreprise..."
                      className="w-full glass-input pl-8 pr-3 py-1.5 text-xs text-[#F5F6FA] rounded-xl"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    <button
                      onClick={() => setStatusFilter("all")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                        statusFilter === "all" ? "bg-white/20 text-white" : "text-[#9AA0B2] hover:bg-white/5"
                      }`}
                    >
                      Toutes ({conversations.length})
                    </button>
                    <button
                      onClick={() => setStatusFilter("auto")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                        statusFilter === "auto" ? "bg-emerald-500/20 text-emerald-300" : "text-[#9AA0B2] hover:bg-white/5"
                      }`}
                    >
                      Associées auto
                    </button>
                    <button
                      onClick={() => setStatusFilter("new")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                        statusFilter === "new" ? "bg-rose-500/20 text-rose-300" : "text-[#9AA0B2] hover:bg-white/5"
                      }`}
                    >
                      À créer
                    </button>
                  </div>
                </div>
              )}

              {/* List of Detected Conversations */}
              <div className="space-y-3">
                {filteredConversations.map((convo) => {
                  const isExpanded = expandedConvoId === convo.id;
                  const isAuto = convo.matchStatus === "auto_matched";
                  const isProposed = convo.matchStatus === "proposed";
                  const isVerify = convo.matchStatus === "needs_verification";
                  const isNew = convo.matchStatus === "new_contact";

                  return (
                    <div
                      key={convo.id}
                      className={`rounded-2xl border transition-all overflow-hidden ${
                        convo.selected
                          ? "bg-white/[0.04] border-white/15 shadow-md"
                          : "bg-white/[0.01] border-white/5 opacity-60"
                      }`}
                    >
                      {/* Conversation Header Bar */}
                      <div className="p-3.5 sm:p-4 flex items-start sm:items-center justify-between gap-3 flex-wrap">
                        
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Selection Checkbox */}
                          <input
                            type="checkbox"
                            checked={convo.selected}
                            onChange={() => handleToggleSelect(convo.id)}
                            className="w-4 h-4 rounded border-white/20 text-[#D81A45] focus:ring-[#D81A45] cursor-pointer"
                          />

                          {/* Channel Badge */}
                          {convo.channel === "linkedin" ? (
                            <span className="p-1.5 rounded-xl bg-[#0A66C2]/15 text-[#38BDF8] border border-[#0A66C2]/30 shrink-0" title="LinkedIn">
                              <Linkedin className="w-4 h-4" />
                            </span>
                          ) : (
                            <span className="p-1.5 rounded-xl bg-emerald-500/15 text-[#34D399] border border-emerald-500/30 shrink-0" title="Email">
                              <Mail className="w-4 h-4" />
                            </span>
                          )}

                          {/* Contact Info */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                                {convo.contactCandidate.fullName}
                              </h4>
                              {convo.contactCandidate.companyName && (
                                <span className="text-xs text-[#9AA0B2] truncate">
                                  · {convo.contactCandidate.companyName}
                                </span>
                              )}
                              <span className="text-[11px] font-mono text-[#9AA0B2]">
                                ({convo.messages.length} message{convo.messages.length > 1 ? "s" : ""})
                              </span>
                            </div>

                            {/* Match status pill */}
                            <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px]">
                              {isAuto && (
                                <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                                  <CheckCircle className="w-3 h-3" />
                                  <span>Associé à {convo.matchedContact?.fullName} ({convo.matchConfidence}%)</span>
                                </span>
                              )}
                              {isProposed && (
                                <span className="inline-flex items-center gap-1 text-sky-400 font-semibold">
                                  <Info className="w-3 h-3" />
                                  <span>Proposé : {convo.matchedContact?.fullName} ({convo.matchConfidence}%)</span>
                                </span>
                              )}
                              {isVerify && (
                                <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>À vérifier : {convo.matchedContact?.fullName} ({convo.matchConfidence}%)</span>
                                </span>
                              )}
                              {isNew && (
                                <span className="inline-flex items-center gap-1 text-[#FF6685] font-semibold">
                                  <Plus className="w-3 h-3" />
                                  <span>Nouveau contact à créer dans NACORA</span>
                                </span>
                              )}

                              {convo.professionalRelevance > 0 && (
                                <span className="text-[#9AA0B2]/60 hidden sm:inline">
                                  · Pertinence pro : {convo.professionalRelevance}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Quick Controls */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {/* Action Selector */}
                          <select
                            value={convo.action}
                            onChange={(e) => handleChangeAction(convo.id, e.target.value as any)}
                            className="glass-input px-2.5 py-1 text-xs text-[#F5F6FA] rounded-xl"
                          >
                            {convo.matchedContactId && (
                              <option value="merge_existing" className="bg-[#090D1A]">
                                Fusionner avec contact existant
                              </option>
                            )}
                            <option value="create_new" className="bg-[#090D1A]">
                              Créer comme nouveau contact
                            </option>
                            <option value="skip" className="bg-[#090D1A]">
                              Ignorer / Ne pas importer
                            </option>
                          </select>

                          {/* Toggle Details Expand */}
                          <button
                            onClick={() => setExpandedConvoId(isExpanded ? null : convo.id)}
                            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#9AA0B2] hover:text-white transition-colors cursor-pointer"
                            title={isExpanded ? "Replier" : "Déplier les messages"}
                          >
                            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          </button>
                        </div>
                      </div>

                      {/* Expanded View: AI Diagnostics + Thread Preview */}
                      {isExpanded && (
                        <div className="p-4 border-t border-white/10 bg-black/30 space-y-4 text-xs">
                          
                          {/* AI Diagnostics Box */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* Statut détecté */}
                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B2] block">
                                Statut relationnel
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-white">
                                  {convo.detectedStatus}
                                </span>
                              </div>
                              <span className="text-[10px] text-[#9AA0B2] block">
                                Déduit automatiquement du dernier message
                              </span>
                            </div>

                            {/* Prochaine action */}
                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B2] block">
                                Prochaine action
                              </span>
                              <span className="font-semibold text-[#FF6685] block truncate">
                                {convo.detectedNextAction?.label || "Répondre"}
                              </span>
                              <span className="text-[10px] text-[#9AA0B2] block">
                                Échéance : {convo.detectedNextAction?.dueDate || "Aujourd'hui"}
                              </span>
                            </div>

                            {/* Timing IA */}
                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B2] block">
                                Analyse du timing
                              </span>
                              <p className="text-[11px] text-[#F5F6FA] leading-snug">
                                {convo.timingAnalysis.timingAdvice}
                              </p>
                            </div>
                          </div>

                          {/* Reassign contact dropdown if user wants manual correction */}
                          <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex-wrap">
                            <span className="text-[#9AA0B2] text-xs">
                              Associer à une autre fiche contact existante :
                            </span>
                            <select
                              value={convo.matchedContactId || ""}
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleAssignExistingContact(convo.id, e.target.value);
                                }
                              }}
                              className="glass-input px-2.5 py-1 text-xs text-[#F5F6FA] rounded-xl max-w-xs"
                            >
                              <option value="" className="bg-[#090D1A]">Sélectionner un contact NACORA...</option>
                              {dbStore.getContacts().map(c => (
                                <option key={c.id} value={c.id} className="bg-[#090D1A]">
                                  {c.fullName} ({c.companyName || "Entreprise"})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Reconstructed Messages Thread Preview */}
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B2] block">
                              Fil des messages ({convo.messages.length}) :
                            </span>
                            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                              {convo.messages.map((m, mIdx) => {
                                const isNathan = m.sender === "nathan";
                                return (
                                  <div
                                    key={m.id || mIdx}
                                    className={`p-2.5 rounded-xl text-xs space-y-1 ${
                                      isNathan
                                        ? "bg-[rgba(216,26,69,0.12)] border border-[rgba(216,26,69,0.25)] text-[#F5F6FA] ml-4"
                                        : "bg-white/[0.04] border border-white/10 text-[#F5F6FA] mr-4"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between text-[10px] text-[#9AA0B2]">
                                      <span className="font-semibold text-white">
                                        {isNathan ? "Nathan (Vous)" : m.senderName}
                                      </span>
                                      <span className="font-mono">
                                        {new Date(m.timestamp).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                      </span>
                                    </div>
                                    <p className="whitespace-pre-line leading-relaxed text-[#F5F6FA]/90">
                                      {m.text}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Commit Action Buttons */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3 flex-wrap">
                <button
                  onClick={() => setStep("input")}
                  className="text-xs text-[#9AA0B2] hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  <span>Retour à la saisie</span>
                </button>

                <div className="flex items-center gap-3">
                  <GlassButton
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                  >
                    Annuler
                  </GlassButton>

                  <GlassButton
                    variant="primary"
                    size="sm"
                    onClick={handleCommitImport}
                    icon={<CheckCheck className="w-4 h-4" />}
                  >
                    Valider et importer ({conversations.filter(c => c.selected).length})
                  </GlassButton>
                </div>
              </div>

            </div>
          )}

          {/* STEP 5: COMPLETED CONFIRMATION */}
          {step === "completed" && importStats && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.2)]">
                <Check className="w-8 h-8" />
              </div>

              <div className="space-y-1.5 max-w-md">
                <h3 className="text-base font-bold text-white font-display">
                  Importation terminée avec succès !
                </h3>
                <p className="text-xs text-[#9AA0B2]">
                  Vos échanges ont été enregistrés, horodatés et rattachés aux relations NACORA.
                </p>
              </div>

              {/* Stat badges */}
              <div className="flex items-center justify-center gap-3 flex-wrap text-xs">
                <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 font-medium">
                  {importStats.totalMessages} message(s) intégrés
                </span>
                {importStats.updatedContacts > 0 && (
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-medium">
                    {importStats.updatedContacts} contact(s) mis à jour
                  </span>
                )}
                {importStats.newContacts > 0 && (
                  <span className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 font-medium">
                    {importStats.newContacts} nouveau(x) contact(s) créé(s)
                  </span>
                )}
              </div>

              <div className="pt-4 flex items-center justify-center gap-3">
                <GlassButton
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    handleClose();
                    if (importStats.firstContactId && onConversationImported) {
                      onConversationImported(importStats.firstContactId);
                    }
                  }}
                  icon={<CornerDownRight className="w-4 h-4" />}
                >
                  Ouvrir dans la Messagerie
                </GlassButton>
                <GlassButton
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                >
                  Fermer
                </GlassButton>
              </div>
            </div>
          )}

        </div>

      </div>
    </Modal>
  );
};
