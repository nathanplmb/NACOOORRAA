import React, { useState, useEffect, useMemo, useRef } from "react";
import { dbStore } from "../dbStore";
import { 
  Contact, 
  ConversationMessage, 
  ContactNetworkingStatus, 
  CandidateProfile, 
  ContactHistoryEvent
} from "../types";
import { 
  calculateContactPriority,
  ensureContactConversationMessages,
  generateSmartConversationReply,
  detectComposerIntent
} from "../api/conversationAgent";
import { 
  calculateFollowUpDate 
} from "../api/networkingFramework";
import { ContactDetailWorkspace } from "../components/ContactDetailWorkspace";
import { ConversationImportModal } from "../components/ConversationImportModal";
import { hasRealConversation } from "../utils/contactResolver";
import { GlassButton, Modal } from "../components/Shared";
import { 
  Search, 
  Sparkles, 
  Plus, 
  Copy, 
  Check, 
  CornerDownRight, 
  Linkedin, 
  Mail, 
  Phone, 
  Building2, 
  Clock, 
  ChevronDown, 
  X, 
  ArrowLeft,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  Info,
  CalendarClock,
  CheckCheck,
  AlertCircle,
  Flame,
  Trash2,
  MoreVertical
} from "lucide-react";

interface MessagesProps {
  initialContactId?: string | null;
  onClearInitialContact?: () => void;
  showToast: (message: string, type: "success" | "error" | "info" | "ai") => void;
  searchTerm?: string;
  onNavigateToContacts?: (contactId?: string) => void;
}

// Simplified Tab Categories for visual clarity
type TabFilter = "all" | "to_process" | "active" | "closed";

// Networking statuses configuration
const NETWORKING_STATUS_DETAILS: Record<ContactNetworkingStatus, { 
  label: string; 
  color: string; 
  badgeClass: string;
}> = {
  a_contacter: { 
    label: "À contacter", 
    color: "#FBBF24", 
    badgeClass: "bg-amber-500/10 text-amber-300 border-amber-500/20"
  },
  to_contact: { 
    label: "À contacter", 
    color: "#FBBF24", 
    badgeClass: "bg-amber-500/10 text-amber-300 border-amber-500/20"
  },
  contacted: { 
    label: "Message envoyé", 
    color: "#60A5FA", 
    badgeClass: "bg-blue-500/10 text-blue-300 border-blue-500/20"
  },
  demande_envoyee: { 
    label: "Demande envoyée", 
    color: "#38BDF8", 
    badgeClass: "bg-sky-500/10 text-sky-300 border-sky-500/20"
  },
  connexion_acceptee: { 
    label: "Connexion acceptée", 
    color: "#34D399", 
    badgeClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
  },
  message_envoye: { 
    label: "Message envoyé", 
    color: "#60A5FA", 
    badgeClass: "bg-blue-500/10 text-blue-300 border-blue-500/20"
  },
  en_attente_reponse: { 
    label: "En attente de réponse", 
    color: "#9AA0B2", 
    badgeClass: "bg-white/5 text-[#9AA0B2] border-white/10"
  },
  reponse_recue: { 
    label: "À répondre", 
    color: "#C084FC", 
    badgeClass: "bg-purple-500/15 text-purple-300 border-purple-500/30 font-bold"
  },
  reponse_a_traiter: { 
    label: "À répondre", 
    color: "#C084FC", 
    badgeClass: "bg-purple-500/15 text-purple-300 border-purple-500/30 font-bold"
  },
  echange_en_cours: { 
    label: "Échange en cours", 
    color: "#34D399", 
    badgeClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
  },
  exchanging: { 
    label: "Échange en cours", 
    color: "#34D399", 
    badgeClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
  },
  appel_prevu: { 
    label: "Entretien prévu", 
    color: "#FBBF24", 
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30"
  },
  echange_realise: { 
    label: "Échange réalisé", 
    color: "#34D399", 
    badgeClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
  },
  interview_done: { 
    label: "Entretien réalisé", 
    color: "#34D399", 
    badgeClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
  },
  opportunite_detectee: { 
    label: "Opportunité détectée", 
    color: "#FF6685", 
    badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/30 font-bold"
  },
  candidature_envoyee: { 
    label: "Candidature envoyée", 
    color: "#38BDF8", 
    badgeClass: "bg-sky-500/10 text-sky-300 border-sky-500/20"
  },
  relance_a_faire: { 
    label: "À relancer", 
    color: "#FF6685", 
    badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/30 font-bold"
  },
  en_attente: { 
    label: "En attente", 
    color: "#9AA0B2", 
    badgeClass: "bg-white/5 text-[#9AA0B2] border-white/10"
  },
  termine: { 
    label: "Terminé", 
    color: "#64748B", 
    badgeClass: "bg-white/[0.04] text-[#9AA0B2] border-white/10"
  },
  sans_suite: { 
    label: "Sans suite", 
    color: "#64748B", 
    badgeClass: "bg-white/[0.04] text-[#9AA0B2] border-white/10"
  },
  not_interested: { 
    label: "Sans suite", 
    color: "#64748B", 
    badgeClass: "bg-white/[0.04] text-[#9AA0B2] border-white/10"
  }
};

// Format short relative or calendar date
function formatShortDate(isoString?: string): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 3600 * 24));

  if (diffDays === 0) {
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Hier";
  if (diffDays === -1) return "Demain";
  if (diffDays > 1 && diffDays < 7) {
    return d.toLocaleDateString("fr-FR", { weekday: "short" });
  }

  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// Group messages by date dividers (ex: "20 SEPTEMBRE")
function groupMessagesByDate(messages: ConversationMessage[]) {
  const groups: { dateLabel: string; messages: ConversationMessage[] }[] = [];
  
  messages.forEach(msg => {
    const d = new Date(msg.timestamp);
    let dateLabel = "DATE NON PRÉCISÉE";
    if (!isNaN(d.getTime())) {
      dateLabel = d.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long"
      }).toUpperCase();
    }

    const last = groups[groups.length - 1];
    if (last && last.dateLabel === dateLabel) {
      last.messages.push(msg);
    } else {
      groups.push({ dateLabel, messages: [msg] });
    }
  });

  return groups;
}

export const Messages: React.FC<MessagesProps> = ({
  initialContactId,
  onClearInitialContact,
  showToast,
  onNavigateToContacts
}) => {
  // Global Store Data
  const [contacts, setContacts] = useState<Contact[]>(dbStore.getContacts());
  const [profile, setProfile] = useState<CandidateProfile>(dbStore.getProfile());

  // Listen to store updates
  useEffect(() => {
    const unsub = dbStore.subscribe(() => {
      setContacts(dbStore.getContacts());
      setProfile(dbStore.getProfile());
    });
    return () => unsub();
  }, []);

  // UI Selection & Navigation State
  const [selectedContactId, setSelectedContactId] = useState<string | null>(initialContactId || null);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Drawers and Overlays
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isContextDrawerOpen, setIsContextDrawerOpen] = useState(false);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isNewConvoModalOpen, setIsNewConvoModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [newConvoSearch, setNewConvoSearch] = useState("");

  // Composer Hybrid State Machine
  const [composerMode, setComposerMode] = useState<'input' | 'draft'>("input");
  const [composerText, setComposerText] = useState("");
  const [composerChannel, setComposerChannel] = useState<'linkedin' | 'email'>("linkedin");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [appliedInstruction, setAppliedInstruction] = useState<string>("");
  const [refinementInput, setRefinementInput] = useState<string>("");
  const [isRefining, setIsRefining] = useState(false);

  // Quick Note in Drawer
  const [quickNoteText, setQuickNoteText] = useState("");

  // AI Assistant Drawer State
  const [aiCustomInstructions, setAiCustomInstructions] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiGeneratedDraft, setAiGeneratedDraft] = useState("");
  const [selectedExchangeGoal, setSelectedExchangeGoal] = useState<string>("À définir");
  const [selectedActionType, setSelectedActionType] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("free");
  const [isAnalyzingConvo, setIsAnalyzingConvo] = useState(false);
  const [analysisSummary, setAnalysisSummary] = useState<string | null>(null);

  // Delete Conversation State
  const [conversationToDelete, setConversationToDelete] = useState<Contact | null>(null);
  const [deleteMode, setDeleteMode] = useState<"messages_only" | "full_contact">("messages_only");

  const handleConfirmDeleteConversation = () => {
    if (!conversationToDelete) return;

    if (deleteMode === "messages_only") {
      const updatedContact: Contact = {
        ...conversationToDelete,
        conversationMessages: [],
        networkingStatus: "to_contact",
        nextAction: undefined,
        history: [
          {
            id: "hist_" + Math.random().toString(36).substring(2, 9),
            type: "category_changed",
            label: "Historique des messages effacé",
            timestamp: new Date().toISOString()
          },
          ...(conversationToDelete.history || [])
        ]
      };
      dbStore.updateContact(updatedContact);
      setContacts(dbStore.getContacts());
      showToast(`Conversation avec ${conversationToDelete.fullName} effacée.`, "info");
    } else {
      dbStore.deleteContact(conversationToDelete.id);
      const remaining = dbStore.getContacts();
      setContacts(remaining);
      if (selectedContactId === conversationToDelete.id) {
        setSelectedContactId(remaining.length > 0 ? remaining[0].id : null);
      }
      showToast(`Contact et conversation avec ${conversationToDelete.fullName} supprimés.`, "info");
    }

    setConversationToDelete(null);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reset composer & drawer state on contact change
  useEffect(() => {
    setComposerMode("input");
    setComposerText("");
    setAppliedInstruction("");
    setRefinementInput("");
    setAiGeneratedDraft("");
    setAiCustomInstructions("");
    setSelectedExchangeGoal("À définir");
    setSelectedActionType("");
    setSelectedTemplate("free");
    setAnalysisSummary(null);
  }, [selectedContactId]);

  // Sync initialContactId
  useEffect(() => {
    if (initialContactId) {
      setSelectedContactId(initialContactId);
      if (onClearInitialContact) onClearInitialContact();
    }
  }, [initialContactId, onClearInitialContact]);

  // Selected contact object
  const selectedContact = useMemo(() => {
    return contacts.find(c => c.id === selectedContactId) || null;
  }, [contacts, selectedContactId]);

  // Real conversations only
  const realConversations = useMemo(() => {
    return contacts.filter(c => hasRealConversation(c));
  }, [contacts]);

  // Conversation list for left panel
  const conversationContacts = useMemo(() => {
    if (selectedContactId && !realConversations.some(c => c.id === selectedContactId)) {
      const draftTarget = contacts.find(c => c.id === selectedContactId);
      if (draftTarget) {
        return [draftTarget, ...realConversations];
      }
    }
    return realConversations;
  }, [contacts, realConversations, selectedContactId]);

  // Auto-select first contact on desktop
  useEffect(() => {
    if (!selectedContactId && realConversations.length > 0 && window.innerWidth >= 1024) {
      setSelectedContactId(realConversations[0].id);
    }
  }, [selectedContactId, realConversations]);

  // Selected Channel Filter
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<"all" | "linkedin" | "email">("all");

  // All messages of selected contact
  const allContactMessages = useMemo(() => {
    if (!selectedContact) return [];
    return ensureContactConversationMessages(selectedContact);
  }, [selectedContact]);

  // Channel distribution
  const channelCounts = useMemo(() => {
    const linkedin = allContactMessages.filter(m => m.channel === "linkedin").length;
    const email = allContactMessages.filter(m => m.channel === "email").length;
    return { linkedin, email, total: allContactMessages.length };
  }, [allContactMessages]);

  // Current messages filtered by channel
  const currentMessages = useMemo(() => {
    if (selectedChannelFilter === "all") return allContactMessages;
    return allContactMessages.filter(m => m.channel === selectedChannelFilter);
  }, [allContactMessages, selectedChannelFilter]);

  // Reset channel filter on contact change
  useEffect(() => {
    setSelectedChannelFilter("all");
  }, [selectedContactId]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages.length, selectedContactId]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setIsStatusMenuOpen(false);
      setIsMoreMenuOpen(false);
      setIsPlusMenuOpen(false);
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Simplified Tab Filtering Helper
  const matchesTabFilter = (contact: Contact, tab: TabFilter): boolean => {
    const s = contact.networkingStatus || "a_contacter";
    const priority = calculateContactPriority(contact);

    switch (tab) {
      case "to_process":
        // Combines "À répondre" and "À relancer" for streamlined clarity
        return s === "reponse_recue" || s === "reponse_a_traiter" || s === "relance_a_faire" || priority.priority === "urgent";
      case "active":
        return s === "echange_en_cours" || s === "exchanging" || s === "connexion_acceptee" || s === "demande_envoyee" || s === "message_envoye" || s === "en_attente_reponse" || s === "appel_prevu" || s === "opportunite_detectee";
      case "closed":
        return s === "termine" || s === "sans_suite" || s === "not_interested";
      case "all":
      default:
        return true;
    }
  };

  // Tab counters
  const tabCounts = useMemo(() => {
    return {
      all: realConversations.length,
      to_process: realConversations.filter(c => matchesTabFilter(c, "to_process")).length,
      active: realConversations.filter(c => matchesTabFilter(c, "active")).length,
      closed: realConversations.filter(c => matchesTabFilter(c, "closed")).length
    };
  }, [realConversations]);

  // Filtered and Sorted list
  const filteredContacts = useMemo(() => {
    return conversationContacts
      .filter(contact => {
        if (!matchesTabFilter(contact, activeTab)) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const nameMatch = contact.fullName.toLowerCase().includes(q);
          const compMatch = (contact.companyName || "").toLowerCase().includes(q);
          const jobMatch = (contact.jobTitle || "").toLowerCase().includes(q);
          const msgsMatch = (contact.conversationMessages || []).some(m => m.text.toLowerCase().includes(q));
          if (!nameMatch && !compMatch && !jobMatch && !msgsMatch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const priorityA = calculateContactPriority(a);
        const priorityB = calculateContactPriority(b);
        if (priorityA.sortScore !== priorityB.sortScore) {
          return priorityB.sortScore - priorityA.sortScore;
        }

        const msgsA = a.conversationMessages || [];
        const lastA = msgsA[msgsA.length - 1];
        const timeA = lastA?.timestamp || a.lastOutreachDate || a.createdAt || "";

        const msgsB = b.conversationMessages || [];
        const lastB = msgsB[msgsB.length - 1];
        const timeB = lastB?.timestamp || b.lastOutreachDate || b.createdAt || "";

        return timeB.localeCompare(timeA);
      });
  }, [conversationContacts, activeTab, searchQuery]);

  // Initials generator
  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length === 0) return "C";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Avatar Gradient
  const getAvatarGradient = (name: string) => {
    const gradients = [
      "from-rose-500/20 via-pink-600/15 to-rose-950/30 text-[#FF6685] border-[#FF6685]/30 shadow-sm",
      "from-emerald-500/20 via-teal-600/15 to-emerald-950/30 text-[#34D399] border-[#34D399]/30 shadow-sm",
      "from-sky-500/20 via-blue-600/15 to-sky-950/30 text-[#38BDF8] border-[#38BDF8]/30 shadow-sm",
      "from-purple-500/20 via-indigo-600/15 to-purple-950/30 text-[#C084FC] border-[#C084FC]/30 shadow-sm",
      "from-amber-500/20 via-orange-600/15 to-amber-950/30 text-[#FBBF24] border-[#FBBF24]/30 shadow-sm"
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
  };

  // Single next action display calculation
  const getSingleNextAction = (contact: Contact) => {
    const priority = calculateContactPriority(contact);
    const status = contact.networkingStatus || "a_contacter";
    const dueDate = contact.nextAction?.dueDate || contact.nextFollowUpDate;
    const formattedDueDate = dueDate ? formatShortDate(dueDate) : "";

    if (status === "reponse_recue" || status === "reponse_a_traiter") {
      return {
        label: "À répondre",
        sublabel: "Réponse reçue",
        urgent: true,
        badgeClass: "bg-purple-500/15 text-purple-200 border-purple-500/35 backdrop-blur-md"
      };
    }

    if (status === "relance_a_faire" || priority.priority === "urgent") {
      return {
        label: formattedDueDate ? `À relancer · ${formattedDueDate}` : "À relancer",
        sublabel: "Aucun retour",
        urgent: true,
        badgeClass: "bg-rose-500/15 text-rose-200 border-rose-500/35 backdrop-blur-md"
      };
    }

    if (status === "demande_envoyee") {
      return {
        label: "Demande en attente",
        sublabel: formattedDueDate ? `Vérif : ${formattedDueDate}` : "Invitation sent",
        urgent: false,
        badgeClass: "bg-sky-500/10 text-sky-300 border-sky-500/20 backdrop-blur-md"
      };
    }

    if (status === "connexion_acceptee") {
      return {
        label: "Envoyer 1er message",
        sublabel: "Connexion acceptée",
        urgent: true,
        badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 backdrop-blur-md"
      };
    }

    if (status === "appel_prevu") {
      return {
        label: formattedDueDate ? `Entretien · ${formattedDueDate}` : "Entretien prévu",
        sublabel: "Échange calé",
        urgent: false,
        badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30 backdrop-blur-md"
      };
    }

    if (status === "echange_en_cours" || status === "exchanging") {
      return {
        label: "Échange en cours",
        sublabel: formattedDueDate ? `Relance : ${formattedDueDate}` : "Discussion active",
        urgent: false,
        badgeClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20 backdrop-blur-md"
      };
    }

    if (dueDate) {
      return {
        label: `Relance · ${formattedDueDate}`,
        sublabel: "Échéance programmée",
        urgent: false,
        badgeClass: "bg-white/5 text-[#9AA0B2] border-white/10 backdrop-blur-md"
      };
    }

    return {
      label: "En attente",
      sublabel: "Pas d'action requise",
      urgent: false,
      badgeClass: "bg-white/5 text-[#9AA0B2] border-white/10 backdrop-blur-md"
    };
  };

  // Smart Conversation AI Reply Generation
  const handleGenerateSmartReply = async (instructionOverride?: string) => {
    if (!selectedContact) return;
    const currentInstruction = (instructionOverride !== undefined ? instructionOverride : composerText).trim();
    setIsGeneratingAi(true);

    try {
      showToast("L'IA prépare la réponse...", "ai");
      const result = await generateSmartConversationReply({
        contact: selectedContact,
        profile,
        messages: currentMessages,
        userInstruction: currentInstruction,
        channel: composerChannel
      });

      if (result && result.reply) {
        setComposerText(result.reply);
        setAppliedInstruction(currentInstruction || "Réponse basée sur le dernier message");
        setComposerMode("draft");
        setAiGeneratedDraft(result.reply);
        showToast("Brouillon prêt !", "ai");
      }
    } catch (e) {
      console.error("Error generating smart reply:", e);
      showToast("Erreur de génération. Réessayez.", "error");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Refine draft in State B
  const handleRefineDraft = async (refinementText: string) => {
    if (!selectedContact || !composerText.trim()) return;
    setIsRefining(true);

    try {
      showToast("Ajustement du brouillon...", "ai");
      const result = await generateSmartConversationReply({
        contact: selectedContact,
        profile,
        messages: currentMessages,
        userInstruction: composerText,
        refinementContext: refinementText,
        channel: composerChannel
      });

      if (result && result.reply) {
        setComposerText(result.reply);
        setAppliedInstruction(refinementText);
        setRefinementInput("");
        setAiGeneratedDraft(result.reply);
        showToast("Brouillon ajusté !", "ai");
      }
    } catch (e) {
      showToast("Impossible d'ajuster le texte.", "error");
    } finally {
      setIsRefining(false);
    }
  };

  // Reset composer
  const handleResetComposer = () => {
    setComposerText("");
    setAppliedInstruction("");
    setRefinementInput("");
    setComposerMode("input");
  };

  // Save / Log Message
  const handleSaveMessage = (sender: "nathan" | "contact") => {
    if (!selectedContact || !composerText.trim()) return;

    if (sender === "nathan" && composerMode === "input") {
      const intentCheck = detectComposerIntent(composerText);
      if (intentCheck.isInstruction) {
        showToast("Instruction détectée : génération...", "ai");
        handleGenerateSmartReply(composerText);
        return;
      }
    }

    const newMessage: ConversationMessage = {
      id: "msg_" + Math.random().toString(36).substring(2, 9),
      sender,
      text: composerText.trim(),
      timestamp: new Date().toISOString(),
      channel: composerChannel,
      status: sender === "nathan" ? "sent" : "received"
    };

    const updatedMessages = [...currentMessages, newMessage];

    let newStatus = selectedContact.networkingStatus;
    let newFollowUpDate = selectedContact.nextFollowUpDate;
    let nextAction = selectedContact.nextAction;

    if (sender === "nathan") {
      newFollowUpDate = calculateFollowUpDate(new Date(), 1);
      if (newStatus === "connexion_acceptee" || newStatus === "a_contacter" || newStatus === "to_contact") {
        newStatus = "message_envoye";
      } else if (newStatus === "reponse_recue" || newStatus === "reponse_a_traiter") {
        newStatus = "echange_en_cours";
      } else if (newStatus === "relance_a_faire") {
        newStatus = "en_attente_reponse";
      }

      nextAction = {
        type: "relance",
        label: `Relance prévue (${formatShortDate(newFollowUpDate)})`,
        dueDate: newFollowUpDate,
        priority: "upcoming"
      };
    } else {
      newStatus = "reponse_recue";
      nextAction = {
        type: "repondre",
        label: "Répondre à son message",
        dueDate: new Date().toISOString().split("T")[0],
        priority: "urgent"
      };
    }

    const historyEvent: ContactHistoryEvent = {
      id: "hist_" + Math.random().toString(36).substring(2, 9),
      type: "outreach_sent",
      label: sender === "nathan" 
        ? `Message consigné (${composerChannel === "email" ? "Email" : "LinkedIn"})`
        : "Réponse reçue consignée",
      timestamp: new Date().toISOString()
    };

    const updatedContact: Contact = {
      ...selectedContact,
      networkingStatus: newStatus,
      nextFollowUpDate: newFollowUpDate,
      nextAction,
      lastOutreachDate: new Date().toISOString(),
      conversationMessages: updatedMessages,
      history: [historyEvent, ...(selectedContact.history || [])]
    };

    dbStore.updateContact(updatedContact);
    handleResetComposer();
    setIsPlusMenuOpen(false);
    showToast(sender === "nathan" ? "Message consigné dans le CRM !" : "Réponse enregistrée !", "success");
  };

  // Copy helper
  const handleCopyMessage = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    showToast("Copié !", "info");
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // Change Contact Status
  const handleUpdateStatus = (newStatus: ContactNetworkingStatus) => {
    if (!selectedContact) return;
    const config = NETWORKING_STATUS_DETAILS[newStatus] || { label: newStatus };

    const updated: Contact = {
      ...selectedContact,
      networkingStatus: newStatus,
      history: [
        {
          id: "hist_" + Math.random().toString(36).substring(2, 9),
          type: "category_changed",
          label: `Statut : ${config.label}`,
          timestamp: new Date().toISOString()
        },
        ...(selectedContact.history || [])
      ]
    };

    dbStore.updateContact(updated);
    setIsStatusMenuOpen(false);
    showToast(`Statut : ${config.label}`, "success");
  };

  // Reschedule follow up
  const handleReschedule = (daysToAdd: number) => {
    if (!selectedContact) return;
    const targetDate = calculateFollowUpDate(new Date(), daysToAdd > 5 ? 1 : 0);
    const updated: Contact = {
      ...selectedContact,
      nextFollowUpDate: targetDate,
      nextAction: {
        type: "relance",
        label: `Relance (${formatShortDate(targetDate)})`,
        dueDate: targetDate,
        priority: "upcoming"
      },
      history: [
        {
          id: "hist_" + Math.random().toString(36).substring(2, 9),
          type: "follow_up_scheduled",
          label: `Relance au ${formatShortDate(targetDate)}`,
          timestamp: new Date().toISOString()
        },
        ...(selectedContact.history || [])
      ]
    };

    dbStore.updateContact(updated);
    setIsMoreMenuOpen(false);
    showToast(`Relance calée au ${formatShortDate(targetDate)}`, "info");
  };

  // Quick internal note
  const handleAddQuickNote = () => {
    if (!selectedContact || !quickNoteText.trim()) return;

    const timestamp = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    const newNoteLine = `[${timestamp}] ${quickNoteText.trim()}`;
    const combinedNotes = selectedContact.notes 
      ? `${newNoteLine}\n${selectedContact.notes}`
      : newNoteLine;

    const updated: Contact = {
      ...selectedContact,
      notes: combinedNotes,
      history: [
        {
          id: "hist_" + Math.random().toString(36).substring(2, 9),
          type: "note_added",
          label: "Note interne ajoutée",
          timestamp: new Date().toISOString()
        },
        ...(selectedContact.history || [])
      ]
    };

    dbStore.updateContact(updated);
    setQuickNoteText("");
    showToast("Note enregistrée !", "success");
  };

  const selectedNextAction = selectedContact ? getSingleNextAction(selectedContact) : null;

  return (
    <div className="relative flex flex-col h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] -mx-4 -mt-4 sm:-mx-6 sm:-mt-4 overflow-hidden bg-[#060812] select-none text-[#F5F6FA]">
      
      {/* Soft Ambient Background Reflections */}
      <div className="absolute top-0 left-1/4 w-[450px] h-[250px] bg-gradient-to-br from-[#D81A45]/8 to-purple-900/10 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 right-1/4 w-[350px] h-[250px] bg-gradient-to-tr from-blue-900/8 to-teal-900/8 blur-[100px] pointer-events-none rounded-full" />

      {/* ========================================================================= */}
      {/* 1. TOP APP BAR (Header Épuré)                                             */}
      {/* ========================================================================= */}
      <div className="h-14 border-b border-white/10 px-4 sm:px-6 flex items-center justify-between shrink-0 bg-[#0B0F19]/60 backdrop-blur-2xl z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-[#D81A45]/25 to-[#FF6685]/10 text-[#FF6685] border border-[#D81A45]/35 flex items-center justify-center font-bold shrink-0 shadow-[0_0_12px_rgba(216,26,69,0.2)]">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-sm sm:text-base font-bold text-[#F5F6FA] font-display tracking-tight">
              Networking
            </h1>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-[11px] text-[#9AA0B2] font-mono backdrop-blur-md">
              {tabCounts.all} conversations
            </span>
          </div>
        </div>

        {/* Global Action: Unified Single Primary Button (+ Nouveau) */}
        <div className="flex items-center gap-2">
          {tabCounts.to_process > 0 && (
            <button
              onClick={() => setActiveTab("to_process")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                activeTab === "to_process"
                  ? "bg-purple-500/20 text-purple-200 border-purple-500/40 shadow-sm"
                  : "bg-white/[0.04] text-[#9AA0B2] hover:text-purple-200 border-white/10"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#C084FC] animate-pulse" />
              <span>{tabCounts.to_process} à traiter</span>
            </button>
          )}

          <GlassButton
            variant="primary"
            size="sm"
            onClick={() => setIsNewConvoModalOpen(true)}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            <span>Nouveau</span>
          </GlassButton>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN WORKSPACE (2 Columns)                                             */}
      {/* ========================================================================= */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative z-10">
        
        {/* ========================================================================= */}
        {/* COLONNE GAUCHE : LISTE DES CONVERSATIONS (Liquid Glass Streamlined)      */}
        {/* ========================================================================= */}
        <div className={`w-full lg:w-[340px] xl:w-[380px] border-r border-white/10 flex flex-col shrink-0 bg-[#0B0F19]/50 backdrop-blur-2xl shadow-lg ${
          selectedContactId ? "hidden lg:flex" : "flex"
        }`}>
          
          {/* Search bar & 4 Clean Segmented Tabs */}
          <div className="p-3 border-b border-white/10 space-y-2.5 shrink-0 bg-white/[0.01]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9AA0B2]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="w-full bg-white/[0.04] backdrop-blur-xl border border-white/10 pl-8 pr-7 py-1.5 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60 focus:border-[#D81A45]/50 focus:bg-white/[0.06] focus:outline-none transition-all rounded-xl shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9AA0B2] hover:text-white p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Streamlined 4-Tab Control */}
            <div className="bg-white/[0.03] p-1 rounded-xl border border-white/10 grid grid-cols-4 gap-0.5 text-center">
              <button
                onClick={() => setActiveTab("all")}
                className={`py-1 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center justify-center gap-1 ${
                  activeTab === "all"
                    ? "bg-white/15 text-white font-bold border border-white/20 shadow-sm"
                    : "text-[#9AA0B2] hover:text-[#F5F6FA]"
                }`}
              >
                <span>Tous</span>
                <span className="text-[10px] opacity-70">({tabCounts.all})</span>
              </button>

              <button
                onClick={() => setActiveTab("to_process")}
                className={`py-1 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center justify-center gap-1 ${
                  activeTab === "to_process"
                    ? "bg-purple-500/25 text-purple-200 border border-purple-500/40 font-bold shadow-sm"
                    : "text-[#9AA0B2] hover:text-purple-300"
                }`}
              >
                <span>À traiter</span>
                {tabCounts.to_process > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C084FC] animate-pulse" />
                )}
              </button>

              <button
                onClick={() => setActiveTab("active")}
                className={`py-1 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center justify-center gap-1 ${
                  activeTab === "active"
                    ? "bg-emerald-500/25 text-emerald-200 border border-emerald-500/40 font-bold shadow-sm"
                    : "text-[#9AA0B2] hover:text-[#F5F6FA]"
                }`}
              >
                <span>En cours</span>
              </button>

              <button
                onClick={() => setActiveTab("closed")}
                className={`py-1 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center justify-center gap-1 ${
                  activeTab === "closed"
                    ? "bg-white/20 text-white border border-white/30 font-bold shadow-sm"
                    : "text-[#9AA0B2] hover:text-[#F5F6FA]"
                }`}
              >
                <span>Fermés</span>
              </button>
            </div>
          </div>

          {/* List of contacts */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredContacts.length === 0 ? (
              <div className="p-8 text-center text-[#9AA0B2] space-y-2">
                <p className="text-xs">Aucune conversation trouvée.</p>
                <button
                  onClick={() => {
                    setActiveTab("all");
                    setSearchQuery("");
                  }}
                  className="text-xs text-[#FF6685] hover:underline cursor-pointer"
                >
                  Afficher tout
                </button>
              </div>
            ) : (
              filteredContacts.map((contact) => {
                const isSelected = contact.id === selectedContactId;
                const msgs = contact.conversationMessages || [];
                const lastMsg = msgs[msgs.length - 1];
                const nextAction = getSingleNextAction(contact);
                const isNeedsReply = contact.networkingStatus === "reponse_recue" || contact.networkingStatus === "reponse_a_traiter";

                return (
                  <div
                    key={contact.id}
                    onClick={() => setSelectedContactId(contact.id)}
                    className={`p-2.5 rounded-xl transition-all duration-150 cursor-pointer relative group flex items-start gap-3 select-none ${
                      isSelected
                        ? "bg-white/[0.08] backdrop-blur-2xl border border-white/15 shadow-sm border-l-4 border-l-[#D81A45]"
                        : "hover:bg-white/[0.03] border border-transparent"
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0 mt-0.5">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr border flex items-center justify-center font-bold text-xs ${getAvatarGradient(contact.fullName)}`}>
                        {getInitials(contact.fullName)}
                      </div>
                      {isNeedsReply && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#C084FC] border-2 border-[#090D1A] animate-pulse" title="Réponse attendue" />
                      )}
                      {nextAction.urgent && !isNeedsReply && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#FF6685] border-2 border-[#090D1A]" title="Relance urgente" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h2 className="text-xs font-bold text-[#F5F6FA] truncate">
                          {contact.fullName}
                        </h2>
                        <span className="text-[10px] text-[#9AA0B2] font-mono shrink-0">
                          {formatShortDate(lastMsg?.timestamp || contact.lastOutreachDate || contact.createdAt)}
                        </span>
                      </div>

                      <p className="text-[11px] text-[#9AA0B2] truncate">
                        {contact.jobTitle || "Professionnel"} · <span className="text-white/70">{contact.companyName || "Entreprise"}</span>
                      </p>

                      <p className="text-[11px] text-[#F5F6FA]/70 line-clamp-1 italic my-0.5">
                        {lastMsg ? (
                          <>
                            {lastMsg.sender === "nathan" && <span className="text-[#FF6685] not-italic font-medium">Vous : </span>}
                            « {lastMsg.text} »
                          </>
                        ) : (
                          <span className="text-[#9AA0B2]/50 not-italic">Nouveau contact</span>
                        )}
                      </p>

                      <div className="flex items-center justify-between gap-1 pt-0.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-medium border ${nextAction.badgeClass}`}>
                          {nextAction.urgent && <Flame className="w-2.5 h-2.5 shrink-0" />}
                          <span className="truncate">{nextAction.label}</span>
                        </span>

                        {contact.outreachChannel === "email" ? (
                          <Mail className="w-3 h-3 text-[#34D399]/70 shrink-0" />
                        ) : (
                          <Linkedin className="w-3 h-3 text-[#38BDF8]/70 shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLONNE CENTRALE : CONVERSATION ACTIVE (Cleaned & Streamlined)            */}
        {/* ========================================================================= */}
        <div className={`flex-1 flex flex-col min-w-0 bg-[#060812] overflow-hidden ${
          !selectedContactId ? "hidden lg:flex" : "flex"
        }`}>
          
          {!selectedContact ? (
            /* Empty State */
            <div className="flex-1 flex items-center justify-center p-8 text-center relative z-10">
              <div className="max-w-md space-y-4 p-8 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-2xl shadow-2xl">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#D81A45]/20 to-[#FF6685]/10 border border-[#D81A45]/30 flex items-center justify-center mx-auto text-[#FF6685] shadow-[0_0_20px_rgba(216,26,69,0.2)]">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <h2 className="text-base font-bold text-[#F5F6FA] font-display">
                  Sélectionnez une conversation
                </h2>
                <p className="text-xs text-[#9AA0B2] leading-relaxed">
                  Choisissez une relation à gauche pour consulter l'historique et rédiger vos messages avec l'assistance de l'IA.
                </p>
                <GlassButton
                  variant="primary"
                  size="sm"
                  onClick={() => setIsNewConvoModalOpen(true)}
                  icon={<Plus className="w-3.5 h-3.5" />}
                >
                  Démarrer un échange
                </GlassButton>
              </div>
            </div>
          ) : (
            /* Active Conversation View */
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative z-10">
              
              {/* 1. HEADER CONVERSATION ACTIVE (Only 2 streamlined controls!) */}
              <div className="h-14 border-b border-white/10 px-4 sm:px-6 flex items-center justify-between shrink-0 bg-[#0B0F19]/65 backdrop-blur-2xl shadow-sm z-20">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setSelectedContactId(null)}
                    className="p-1 rounded-xl bg-white/5 text-[#9AA0B2] hover:text-white border border-white/10 lg:hidden cursor-pointer shrink-0"
                    title="Retour"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr border flex items-center justify-center font-bold text-xs shrink-0 ${getAvatarGradient(selectedContact.fullName)}`}>
                    {getInitials(selectedContact.fullName)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xs sm:text-sm font-bold text-[#F5F6FA] truncate font-display">
                        {selectedContact.fullName}
                      </h2>
                      {selectedContact.linkedInUrl && (
                        <a
                          href={selectedContact.linkedInUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#38BDF8] hover:text-white p-0.5"
                          title="LinkedIn"
                        >
                          <Linkedin className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <p className="text-[11px] text-[#9AA0B2] truncate">
                      {selectedContact.jobTitle || "Professionnel"} · <span className="text-[#F5F6FA]/80">{selectedContact.companyName}</span>
                    </p>
                  </div>
                </div>

                {/* Streamlined Right Controls (Only 2 main buttons!) */}
                <div className="flex items-center gap-2 shrink-0">
                  
                  {/* CONTROL 1: Status Pill */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsStatusMenuOpen(!isStatusMenuOpen);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.05] border border-white/10 hover:border-white/20 text-xs font-semibold cursor-pointer transition-all backdrop-blur-md"
                      title="Modifier le statut"
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedContact.networkingStatus ? (NETWORKING_STATUS_DETAILS[selectedContact.networkingStatus]?.color || "#FF6685") : "#FF6685" }} />
                      <span className="text-[#F5F6FA] text-xs">
                        {selectedContact.networkingStatus ? (NETWORKING_STATUS_DETAILS[selectedContact.networkingStatus]?.label || "À contacter") : "À contacter"}
                      </span>
                      <ChevronDown className="w-3 h-3 text-[#9AA0B2]" />
                    </button>

                    {isStatusMenuOpen && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-[#0F1424] border border-white/15 shadow-2xl p-2 z-50 backdrop-blur-2xl space-y-1"
                      >
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B2] px-2.5 py-1">
                          Modifier le statut
                        </div>
                        <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1">
                          {Object.entries(NETWORKING_STATUS_DETAILS).map(([key, details]) => (
                            <button
                              key={key}
                              onClick={() => handleUpdateStatus(key as ContactNetworkingStatus)}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                                selectedContact.networkingStatus === key ? "bg-white/10 font-bold text-white" : "hover:bg-white/5 text-[#9AA0B2] hover:text-[#F5F6FA]"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: details.color }} />
                                <span>{details.label}</span>
                              </div>
                              {selectedContact.networkingStatus === key && (
                                <Check className="w-3 h-3 text-[#34D399]" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CONTROL 2: Unified Menu (...) */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMoreMenuOpen(!isMoreMenuOpen);
                      }}
                      className="p-1.5 rounded-xl bg-white/[0.05] text-[#9AA0B2] hover:text-white border border-white/10 transition-colors cursor-pointer"
                      title="Options de la conversation"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {isMoreMenuOpen && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-full mt-2 w-52 rounded-2xl bg-[#0F1424] border border-white/15 shadow-2xl p-1.5 z-50 backdrop-blur-2xl space-y-1"
                      >
                        <button
                          onClick={() => {
                            setIsMoreMenuOpen(false);
                            setIsDetailModalOpen(true);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-xs text-[#F5F6FA] flex items-center gap-2 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-[#38BDF8]" />
                          <span>Fiche contact complète</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsMoreMenuOpen(false);
                            setIsAiDrawerOpen(true);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-xs text-[#C084FC] flex items-center gap-2 cursor-pointer font-medium"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Diagnostic & Contexte IA</span>
                        </button>

                        <button
                          onClick={() => handleReschedule(7)}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-xs text-[#F5F6FA] flex items-center gap-2 cursor-pointer"
                        >
                          <CalendarClock className="w-3.5 h-3.5 text-[#FBBF24]" />
                          <span>Planifier relance J+7</span>
                        </button>

                        <div className="border-t border-white/10 my-1" />

                        <button
                          onClick={() => {
                            setIsMoreMenuOpen(false);
                            setConversationToDelete(selectedContact);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 text-xs text-[#FF6685] flex items-center gap-2 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Supprimer la conversation</span>
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* 2. SUB-HEADER / BANNER (Action unique & Switcher) */}
              <div className="bg-white/[0.02] border-b border-white/10 backdrop-blur-xl px-4 sm:px-6 py-1.5 flex items-center justify-between gap-2 text-xs">
                {selectedNextAction ? (
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-[#9AA0B2] text-[11px]">Prochaine étape :</span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${selectedNextAction.badgeClass}`}>
                      {selectedNextAction.urgent && <Flame className="w-2.5 h-2.5 shrink-0" />}
                      <span className="truncate">{selectedNextAction.label}</span>
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-[#9AA0B2]">
                    Échanges consignés
                  </div>
                )}

                {/* Filter channel switcher */}
                {channelCounts.total > 1 && (
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      onClick={() => setSelectedChannelFilter("all")}
                      className={`px-2 py-0.5 rounded-md ${selectedChannelFilter === "all" ? "bg-white/15 text-white" : "text-[#9AA0B2]"}`}
                    >
                      Tous ({channelCounts.total})
                    </button>
                    <button
                      onClick={() => setSelectedChannelFilter("linkedin")}
                      className={`px-2 py-0.5 rounded-md ${selectedChannelFilter === "linkedin" ? "bg-[#38BDF8]/20 text-[#38BDF8]" : "text-[#9AA0B2]"}`}
                    >
                      LinkedIn ({channelCounts.linkedin})
                    </button>
                    <button
                      onClick={() => setSelectedChannelFilter("email")}
                      className={`px-2 py-0.5 rounded-md ${selectedChannelFilter === "email" ? "bg-emerald-500/20 text-emerald-300" : "text-[#9AA0B2]"}`}
                    >
                      Email ({channelCounts.email})
                    </button>
                  </div>
                )}
              </div>

              {/* 3. HISTORIQUE DES MESSAGES */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#060812]">
                {currentMessages.length === 0 ? (
                  <div className="p-8 text-center max-w-sm mx-auto space-y-2 my-auto">
                    <p className="text-xs text-[#9AA0B2]">
                      Aucun message pour le moment avec {selectedContact.fullName}.
                    </p>
                    <p className="text-[11px] text-[#9AA0B2]/60">
                      Entrez une consigne ci-dessous ou cliquez sur [✨ Générer IA].
                    </p>
                  </div>
                ) : (
                  groupMessagesByDate(currentMessages).map((group, gIdx) => (
                    <div key={gIdx} className="space-y-3">
                      
                      {/* DATE DIVIDER */}
                      <div className="flex items-center justify-center my-3">
                        <span className="px-3 py-0.5 rounded-full bg-white/[0.05] border border-white/10 backdrop-blur-xl text-[10px] font-mono tracking-wider text-[#9AA0B2]">
                          {group.dateLabel}
                        </span>
                      </div>

                      {/* Messages */}
                      {group.messages.map((msg, index) => {
                        const isNathan = msg.sender === "nathan";
                        const isSystem = msg.sender === "system" || msg.sender === "note";

                        if (isSystem) {
                          return (
                            <div key={msg.id || index} className="flex justify-center my-1">
                              <div className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[#9AA0B2] text-[10px] flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-[#FF6685]" />
                                <span>{msg.text}</span>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={msg.id || index}
                            className={`flex flex-col ${isNathan ? "items-end" : "items-start"}`}
                          >
                            <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[70%]">
                              {!isNathan && (
                                <div className={`w-6 h-6 rounded-lg bg-gradient-to-tr border flex items-center justify-center font-bold text-[9px] shrink-0 mb-1 ${getAvatarGradient(selectedContact.fullName)}`}>
                                  {getInitials(selectedContact.fullName)}
                                </div>
                              )}

                              <div
                                className={`rounded-2xl p-3.5 text-xs leading-relaxed relative ${
                                  isNathan
                                    ? "bg-gradient-to-br from-[rgba(216,26,69,0.2)] via-[rgba(216,26,69,0.12)] to-[rgba(216,26,69,0.05)] border border-[rgba(216,26,69,0.3)] text-[#F5F6FA] backdrop-blur-xl rounded-br-xs shadow-sm"
                                    : "bg-white/[0.06] border border-white/10 text-[#F5F6FA] backdrop-blur-xl rounded-bl-xs shadow-sm"
                                }`}
                              >
                                {msg.subject && (
                                  <div className="text-[11px] font-bold text-white mb-1.5 pb-1 border-b border-white/10">
                                    Objet : {msg.subject}
                                  </div>
                                )}

                                <p className="whitespace-pre-line select-text font-sans">
                                  {msg.text}
                                </p>

                                <div className="flex items-center justify-end gap-2 mt-2 pt-1 border-t border-white/5 text-[10px] text-[#9AA0B2]">
                                  <span className="font-mono">
                                    {new Date(msg.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                  {msg.channel === "email" ? (
                                    <span className="text-emerald-400">Email</span>
                                  ) : (
                                    <span className="text-sky-400">LinkedIn</span>
                                  )}
                                  {isNathan && <CheckCheck className="w-3 h-3 text-[#34D399]" />}

                                  <button
                                    onClick={() => handleCopyMessage(msg.text, msg.id || String(index))}
                                    className="p-0.5 rounded hover:bg-white/10 text-[#9AA0B2] hover:text-white cursor-pointer ml-1"
                                    title="Copier"
                                  >
                                    {copiedMessageId === (msg.id || String(index)) ? (
                                      <Check className="w-3 h-3 text-[#34D399]" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* ========================================================================= */}
              {/* 4. COMPOSER UN MESSAGE (Design Épuré & Intuitif)                          */}
              {/* ========================================================================= */}
              <div className="p-3 sm:p-4 border-t border-white/10 bg-[#0B0F19]/80 backdrop-blur-2xl shrink-0 shadow-lg">
                {composerMode === "draft" ? (
                  /* ÉTAT B — BROUILLON IA */
                  <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-b from-[#12162B]/90 to-[#0B0F19]/90 backdrop-blur-2xl p-3.5 space-y-2.5">
                    
                    <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-[#C084FC]" />
                        <span className="font-bold text-xs text-[#F5F6FA]">
                          Brouillon IA
                        </span>
                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          Éditable
                        </span>
                      </div>

                      <button
                        onClick={handleResetComposer}
                        className="p-1 rounded-lg hover:bg-white/10 text-[#9AA0B2] hover:text-white cursor-pointer"
                        title="Effacer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <textarea
                      value={composerText}
                      onChange={(e) => setComposerText(e.target.value)}
                      rows={3}
                      className="w-full bg-black/30 rounded-xl p-3 text-xs text-[#F5F6FA] border border-white/10 focus:border-[#C084FC]/50 focus:outline-none resize-none leading-relaxed font-sans"
                    />

                    {/* Quick Refinements */}
                    <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => handleRefineDraft("Plus court et percutant")}
                          disabled={isRefining}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-[#9AA0B2] hover:text-white border border-white/10 cursor-pointer"
                        >
                          ⚡ Plus court
                        </button>
                        <button
                          onClick={() => handleRefineDraft("Plus chaleureux et fluide")}
                          disabled={isRefining}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-[#9AA0B2] hover:text-white border border-white/10 cursor-pointer"
                        >
                          🤝 Plus chaleureux
                        </button>
                        <button
                          onClick={() => handleRefineDraft("Proposer un court échange de 10 min")}
                          disabled={isRefining}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-[#9AA0B2] hover:text-white border border-white/10 cursor-pointer"
                        >
                          📅 Proposer 10 min
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyMessage(composerText, "draft")}
                          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#F5F6FA] font-bold text-xs border border-white/20 cursor-pointer"
                        >
                          Copier
                        </button>

                        <button
                          onClick={() => handleSaveMessage("nathan")}
                          className="px-4 py-1.5 rounded-xl bg-[#D81A45] hover:bg-[#D81A45]/90 text-white font-bold text-xs cursor-pointer shadow-[0_0_12px_rgba(216,26,69,0.3)] flex items-center gap-1.5"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Marquer envoyé</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ÉTAT A — SAISIE & GÉNÉRATION */
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] focus-within:border-[#C084FC]/60 backdrop-blur-xl p-2.5 transition-all">
                    
                    <textarea
                      value={composerText}
                      onChange={(e) => setComposerText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (composerText.trim()) {
                            const check = detectComposerIntent(composerText);
                            if (check.isInstruction) {
                              handleGenerateSmartReply(composerText);
                            } else {
                              handleSaveMessage("nathan");
                            }
                          }
                        }
                      }}
                      placeholder={`Écrire ou donner une consigne à l'IA (ex: réponds à ${selectedContact.firstName || selectedContact.fullName}, dis-lui que je suis dispo mardi...)`}
                      rows={2}
                      disabled={isGeneratingAi}
                      className="w-full bg-transparent text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60 focus:outline-none resize-none leading-relaxed font-sans px-1"
                    />

                    {/* Bottom Toolbar */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5 gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        
                        {/* Canal switcher */}
                        <div className="flex items-center bg-white/5 p-0.5 rounded-lg border border-white/10 text-xs">
                          <button
                            onClick={() => setComposerChannel("linkedin")}
                            className={`px-2 py-0.5 rounded-md flex items-center gap-1 ${
                              composerChannel === "linkedin" ? "bg-[#38BDF8]/20 text-[#38BDF8] font-bold" : "text-[#9AA0B2]"
                            }`}
                          >
                            <Linkedin className="w-3 h-3" />
                            <span className="text-[10px]">LinkedIn</span>
                          </button>
                          <button
                            onClick={() => setComposerChannel("email")}
                            className={`px-2 py-0.5 rounded-md flex items-center gap-1 ${
                              composerChannel === "email" ? "bg-emerald-500/20 text-emerald-300 font-bold" : "text-[#9AA0B2]"
                            }`}
                          >
                            <Mail className="w-3 h-3" />
                            <span className="text-[10px]">Email</span>
                          </button>
                        </div>

                        {/* [+] Consigner réponse reçue */}
                        <button
                          onClick={() => handleSaveMessage("contact")}
                          disabled={!composerText.trim()}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#34D399] border border-white/10 text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-30 flex items-center gap-1"
                          title="Consigner une réponse reçue du contact"
                        >
                          <CornerDownRight className="w-3 h-3" />
                          <span>Réponse reçue</span>
                        </button>
                      </div>

                      {/* Right Action */}
                      <div>
                        {composerText.trim() ? (
                          detectComposerIntent(composerText).isInstruction ? (
                            <button
                              onClick={() => handleGenerateSmartReply(composerText)}
                              disabled={isGeneratingAi}
                              className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-[#C084FC]" />
                              <span>Générer réponse</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSaveMessage("nathan")}
                              className="px-4 py-1.5 rounded-xl bg-[#D81A45] hover:bg-[#D81A45]/90 text-white font-bold text-xs transition-all cursor-pointer shadow-[0_0_12px_rgba(216,26,69,0.3)] flex items-center gap-1.5"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                              <span>Marquer envoyé</span>
                            </button>
                          )
                        ) : (
                          <button
                            onClick={() => handleGenerateSmartReply("")}
                            disabled={isGeneratingAi}
                            className="px-3.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-[#C084FC] border border-purple-500/30 font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            {isGeneratingAi ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5" />
                            )}
                            <span>Proposer réponse IA</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. DRAWER : ASSISTANT IA & CONTEXTE                                       */}
      {/* ========================================================================= */}
      {isAiDrawerOpen && selectedContact && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            onClick={() => setIsAiDrawerOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          <div className="relative w-full max-w-lg bg-[#090D1A]/95 backdrop-blur-3xl border-l border-white/15 h-full flex flex-col shadow-2xl z-10 overflow-hidden">
            
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-[#C084FC]" />
                <h3 className="text-sm font-bold text-[#F5F6FA] font-display">
                  Assistant IA & Diagnostic
                </h3>
              </div>

              <button
                onClick={() => setIsAiDrawerOpen(false)}
                className="p-1.5 rounded-xl bg-white/5 text-[#9AA0B2] hover:text-white border border-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B2] block">
                  Contexte Contact
                </span>
                <p className="text-xs text-white font-semibold">{selectedContact.fullName}</p>
                <p className="text-[11px] text-[#9AA0B2]">{selectedContact.jobTitle} · {selectedContact.companyName}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B2] block">
                  Consigne personnalisée pour l'IA
                </span>
                <textarea
                  rows={2}
                  value={aiCustomInstructions}
                  onChange={(e) => setAiCustomInstructions(e.target.value)}
                  placeholder="Ex : Sois très chaleureux, propose de se téléphoner..."
                  className="w-full bg-black/40 rounded-xl p-2.5 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/50 border border-white/10 focus:outline-none"
                />

                <button
                  onClick={() => handleGenerateSmartReply(aiCustomInstructions)}
                  disabled={isGeneratingAi}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-[#D81A45] to-purple-600 text-white font-bold text-xs cursor-pointer"
                >
                  Générer le message
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* FICHE CONTACT COMPLÈTE */}
      {isDetailModalOpen && selectedContact && (
        <div className="fixed inset-0 z-50 bg-[#060812]/95 backdrop-blur-2xl overflow-y-auto">
          <ContactDetailWorkspace
            contact={selectedContact}
            profile={profile}
            onClose={() => setIsDetailModalOpen(false)}
            onUpdate={(updated) => {
              dbStore.updateContact(updated);
            }}
            onDelete={(deletedId) => {
              dbStore.deleteContact(deletedId);
              setIsDetailModalOpen(false);
              setSelectedContactId(null);
              showToast("Contact supprimé", "info");
            }}
            showToast={showToast}
          />
        </div>
      )}

      {/* IMPORTATION MODAL */}
      {isImportModalOpen && (
        <ConversationImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          candidateProfile={profile}
          showToast={showToast}
          onConversationImported={(targetContactId) => {
            setSelectedContactId(targetContactId);
            setContacts(dbStore.getContacts());
          }}
        />
      )}

      {/* MODAL NOUVELLE CONVERSATION */}
      <Modal
        isOpen={isNewConvoModalOpen}
        onClose={() => setIsNewConvoModalOpen(false)}
        title="Démarrer une conversation"
        size="md"
      >
        <div className="space-y-3">
          <p className="text-xs text-[#9AA0B2]">
            Sélectionnez un contact pour ouvrir sa conversation ou préparer un premier message.
          </p>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9AA0B2]" />
            <input
              type="text"
              value={newConvoSearch}
              onChange={(e) => setNewConvoSearch(e.target.value)}
              placeholder="Rechercher par nom ou entreprise..."
              className="w-full glass-input pl-9 pr-4 py-2 text-xs text-[#F5F6FA]"
            />
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-white/5 pr-1">
            {contacts
              .filter(c => {
                if (!newConvoSearch) return true;
                const q = newConvoSearch.toLowerCase();
                return c.fullName.toLowerCase().includes(q) || (c.companyName || "").toLowerCase().includes(q);
              })
              .map(c => {
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedContactId(c.id);
                      setIsNewConvoModalOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2 hover:bg-white/5 rounded-xl transition-colors text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr border flex items-center justify-center font-bold text-xs shrink-0 ${getAvatarGradient(c.fullName)}`}>
                        {getInitials(c.fullName)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#F5F6FA] truncate">
                          {c.fullName}
                        </div>
                        <div className="text-[11px] text-[#9AA0B2] truncate">
                          {c.jobTitle} · {c.companyName}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsNewConvoModalOpen(false);
                setIsImportModalOpen(true);
              }}
              icon={<Sparkles className="w-3.5 h-3.5 text-[#C084FC]" />}
            >
              Importer des messages
            </GlassButton>
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={() => setIsNewConvoModalOpen(false)}
            >
              Fermer
            </GlassButton>
          </div>
        </div>
      </Modal>

      {/* MODAL SUPPRESSION */}
      {conversationToDelete && (
        <Modal
          isOpen={!!conversationToDelete}
          onClose={() => setConversationToDelete(null)}
          title=""
          size="md"
        >
          <div className="space-y-4 p-2 text-[#F5F6FA]">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-[#FF6685] shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-display">
                  Supprimer la conversation
                </h3>
                <p className="text-xs text-[#9AA0B2] mt-0.5">
                  Supprimer l'échange avec <strong className="text-white">{conversationToDelete.fullName}</strong>.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setDeleteMode("messages_only")}
                className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  deleteMode === "messages_only" ? "bg-white/[0.08] border-[#FF6685]/50" : "bg-white/[0.02] border-white/10"
                }`}
              >
                <div className="text-xs font-bold text-white">Effacer les messages uniquement</div>
                <div className="text-[11px] text-[#9AA0B2]">Conserve la fiche contact dans le CRM.</div>
              </button>

              <button
                onClick={() => setDeleteMode("full_contact")}
                className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  deleteMode === "full_contact" ? "bg-red-500/10 border-red-500/50" : "bg-white/[0.02] border-white/10"
                }`}
              >
                <div className="text-xs font-bold text-[#FF6685]">Supprimer le contact et la conversation</div>
                <div className="text-[11px] text-[#9AA0B2]">Retire définitivement la fiche de votre CRM.</div>
              </button>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
              <GlassButton
                variant="ghost"
                size="sm"
                onClick={() => setConversationToDelete(null)}
              >
                Annuler
              </GlassButton>
              <button
                type="button"
                onClick={handleConfirmDeleteConversation}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#D81A45] hover:bg-red-600 text-white transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Confirmer</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
