import React, { useState, useEffect, useMemo, useRef } from "react";
import { dbStore } from "../dbStore";
import { 
  Contact, 
  ConversationMessage, 
  ContactNetworkingStatus, 
  CandidateProfile, 
  NetworkingChannel,
  ContactHistoryEvent
} from "../types";
import { 
  calculateContactPriority,
  ensureContactConversationMessages,
  generateSmartConversationReply,
  detectComposerIntent
} from "../api/conversationAgent";
import { 
  generateOutreachMessageWithFramework,
  calculateFollowUpDate 
} from "../api/networkingFramework";
import { ContactDetailWorkspace } from "../components/ContactDetailWorkspace";
import { ConversationImportModal } from "../components/ConversationImportModal";
import { GlassButton, Modal } from "../components/Shared";
import { 
  Search, 
  Sparkles, 
  Send, 
  Plus, 
  Copy, 
  Check, 
  CornerDownRight, 
  Linkedin, 
  Mail, 
  Phone, 
  Building2, 
  Calendar, 
  Clock, 
  ChevronDown, 
  X, 
  ArrowLeft,
  Bot,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  Info,
  CalendarClock,
  CheckCheck,
  AlertCircle,
  ShieldAlert,
  Flame,
  UserCheck,
  FileText,
  Trash2
} from "lucide-react";

interface MessagesProps {
  initialContactId?: string | null;
  onClearInitialContact?: () => void;
  showToast: (message: string, type: "success" | "error" | "info" | "ai") => void;
  searchTerm?: string;
  onNavigateToContacts?: (contactId?: string) => void;
}

// Conversation filter tabs as explicitly requested
type TabFilter = 
  | "all"              // Tous
  | "needs_reply"      // À répondre
  | "to_follow_up"     // À relancer
  | "request_sent"     // Demandes envoyées
  | "active_exchange"  // Échanges actifs
  | "interview"        // Entretiens
  | "closed";          // Terminés

// Networking statuses configuration
const NETWORKING_STATUS_DETAILS: Record<ContactNetworkingStatus, { 
  label: string; 
  color: string; 
  bg: string; 
  border: string;
  badgeClass: string;
}> = {
  a_contacter: { 
    label: "À contacter", 
    color: "#FBBF24", 
    bg: "rgba(247,144,9,0.08)", 
    border: "rgba(247,144,9,0.22)",
    badgeClass: "bg-amber-500/10 text-amber-300 border-amber-500/25"
  },
  to_contact: { 
    label: "À contacter", 
    color: "#FBBF24", 
    bg: "rgba(247,144,9,0.08)", 
    border: "rgba(247,144,9,0.22)",
    badgeClass: "bg-amber-500/10 text-amber-300 border-amber-500/25"
  },
  contacted: { 
    label: "Message envoyé", 
    color: "#60A5FA", 
    bg: "rgba(96,165,250,0.08)", 
    border: "rgba(96,165,250,0.22)",
    badgeClass: "bg-blue-500/10 text-blue-300 border-blue-500/25"
  },
  demande_envoyee: { 
    label: "Demande envoyée", 
    color: "#38BDF8", 
    bg: "rgba(56,189,248,0.08)", 
    border: "rgba(56,189,248,0.22)",
    badgeClass: "bg-sky-500/10 text-sky-300 border-sky-500/25"
  },
  connexion_acceptee: { 
    label: "Connexion acceptée", 
    color: "#34D399", 
    bg: "rgba(52,211,153,0.08)", 
    border: "rgba(52,211,153,0.22)",
    badgeClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
  },
  message_envoye: { 
    label: "Message envoyé", 
    color: "#60A5FA", 
    bg: "rgba(96,165,250,0.08)", 
    border: "rgba(96,165,250,0.22)",
    badgeClass: "bg-blue-500/10 text-blue-300 border-blue-500/25"
  },
  en_attente_reponse: { 
    label: "En attente de réponse", 
    color: "#9AA0B2", 
    bg: "rgba(154,160,178,0.08)", 
    border: "rgba(154,160,178,0.22)",
    badgeClass: "bg-white/5 text-[#9AA0B2] border-white/10"
  },
  reponse_recue: { 
    label: "À répondre", 
    color: "#C084FC", 
    bg: "rgba(192,132,252,0.12)", 
    border: "rgba(192,132,252,0.3)",
    badgeClass: "bg-purple-500/15 text-purple-300 border-purple-500/30 font-bold"
  },
  reponse_a_traiter: { 
    label: "À répondre", 
    color: "#C084FC", 
    bg: "rgba(192,132,252,0.12)", 
    border: "rgba(192,132,252,0.3)",
    badgeClass: "bg-purple-500/15 text-purple-300 border-purple-500/30 font-bold"
  },
  echange_en_cours: { 
    label: "Échange en cours", 
    color: "#34D399", 
    bg: "rgba(52,211,153,0.08)", 
    border: "rgba(52,211,153,0.22)",
    badgeClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
  },
  exchanging: { 
    label: "Échange en cours", 
    color: "#34D399", 
    bg: "rgba(52,211,153,0.08)", 
    border: "rgba(52,211,153,0.22)",
    badgeClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
  },
  appel_prevu: { 
    label: "Entretien / Appel prévu", 
    color: "#FBBF24", 
    bg: "rgba(251,191,36,0.1)", 
    border: "rgba(251,191,36,0.25)",
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30"
  },
  echange_realise: { 
    label: "Échange réalisé", 
    color: "#34D399", 
    bg: "rgba(52,211,153,0.08)", 
    border: "rgba(52,211,153,0.22)",
    badgeClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
  },
  interview_done: { 
    label: "Entretien réalisé", 
    color: "#34D399", 
    bg: "rgba(52,211,153,0.08)", 
    border: "rgba(52,211,153,0.22)",
    badgeClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
  },
  opportunite_detectee: { 
    label: "Opportunité détectée", 
    color: "#FF6685", 
    bg: "rgba(255,102,133,0.12)", 
    border: "rgba(255,102,133,0.3)",
    badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/30 font-bold"
  },
  candidature_envoyee: { 
    label: "Candidature envoyée", 
    color: "#38BDF8", 
    bg: "rgba(56,189,248,0.08)", 
    border: "rgba(56,189,248,0.22)",
    badgeClass: "bg-sky-500/10 text-sky-300 border-sky-500/25"
  },
  relance_a_faire: { 
    label: "À relancer", 
    color: "#FF6685", 
    bg: "rgba(255,102,133,0.12)", 
    border: "rgba(255,102,133,0.3)",
    badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/30 font-bold"
  },
  en_attente: { 
    label: "En attente", 
    color: "#9AA0B2", 
    bg: "rgba(154,160,178,0.08)", 
    border: "rgba(154,160,178,0.22)",
    badgeClass: "bg-white/5 text-[#9AA0B2] border-white/10"
  },
  termine: { 
    label: "Terminé", 
    color: "#64748B", 
    bg: "rgba(100,116,139,0.08)", 
    border: "rgba(100,116,139,0.2)",
    badgeClass: "bg-white/[0.04] text-[#9AA0B2] border-white/10"
  },
  sans_suite: { 
    label: "Sans suite", 
    color: "#64748B", 
    bg: "rgba(100,116,139,0.08)", 
    border: "rgba(100,116,139,0.2)",
    badgeClass: "bg-white/[0.04] text-[#9AA0B2] border-white/10"
  },
  not_interested: { 
    label: "Sans suite", 
    color: "#64748B", 
    bg: "rgba(100,116,139,0.08)", 
    border: "rgba(100,116,139,0.2)",
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

  // Format: "6 oct."
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

  // Drawers and Panels
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isContextDrawerOpen, setIsContextDrawerOpen] = useState(false);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isScheduleMenuOpen, setIsScheduleMenuOpen] = useState(false);
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

  // AI Assistant Drawer State (Zero automatic calls on open!)
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
            label: "Historique des messages de conversation effacé",
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

  // Reset composer & drawer state when selecting another contact
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

  // If no contact is selected on desktop, auto-select first one if available
  useEffect(() => {
    if (!selectedContactId && contacts.length > 0 && window.innerWidth >= 1024) {
      setSelectedContactId(contacts[0].id);
    }
  }, [selectedContactId, contacts]);

  // Selected Channel Filter for Multi-Canal Support (LinkedIn + Email = Une seule relation)
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<"all" | "linkedin" | "email">("all");

  // All messages of the selected contact
  const allContactMessages = useMemo(() => {
    if (!selectedContact) return [];
    return ensureContactConversationMessages(selectedContact);
  }, [selectedContact]);

  // Channel distribution for the relation
  const channelCounts = useMemo(() => {
    const linkedin = allContactMessages.filter(m => m.channel === "linkedin").length;
    const email = allContactMessages.filter(m => m.channel === "email").length;
    return { linkedin, email, total: allContactMessages.length };
  }, [allContactMessages]);

  // Current messages filtered by channel if requested
  const currentMessages = useMemo(() => {
    if (selectedChannelFilter === "all") return allContactMessages;
    return allContactMessages.filter(m => m.channel === selectedChannelFilter);
  }, [allContactMessages, selectedChannelFilter]);

  // Reset channel filter when contact changes
  useEffect(() => {
    setSelectedChannelFilter("all");
  }, [selectedContactId]);

  // Auto-scroll to bottom of chat when new message is added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages.length, selectedContactId]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setIsStatusMenuOpen(false);
      setIsPlusMenuOpen(false);
      setIsScheduleMenuOpen(false);
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Filter Helper
  const matchesTabFilter = (contact: Contact, tab: TabFilter): boolean => {
    const s = contact.networkingStatus || "a_contacter";
    const priority = calculateContactPriority(contact);

    switch (tab) {
      case "needs_reply":
        return s === "reponse_recue" || s === "reponse_a_traiter";
      case "to_follow_up":
        return s === "relance_a_faire" || priority.priority === "urgent";
      case "request_sent":
        return s === "demande_envoyee" || s === "message_envoye" || s === "en_attente_reponse";
      case "active_exchange":
        return s === "echange_en_cours" || s === "exchanging" || s === "connexion_acceptee" || s === "opportunite_detectee";
      case "interview":
        return s === "appel_prevu" || s === "echange_realise" || s === "interview_done" || s === "candidature_envoyee";
      case "closed":
        return s === "termine" || s === "sans_suite" || s === "not_interested";
      case "all":
      default:
        return true;
    }
  };

  // Tab counters for tab pills
  const tabCounts = useMemo(() => {
    return {
      all: contacts.length,
      needs_reply: contacts.filter(c => matchesTabFilter(c, "needs_reply")).length,
      to_follow_up: contacts.filter(c => matchesTabFilter(c, "to_follow_up")).length,
      request_sent: contacts.filter(c => matchesTabFilter(c, "request_sent")).length,
      active_exchange: contacts.filter(c => matchesTabFilter(c, "active_exchange")).length,
      interview: contacts.filter(c => matchesTabFilter(c, "interview")).length,
      closed: contacts.filter(c => matchesTabFilter(c, "closed")).length
    };
  }, [contacts]);

  // Filtered and Sorted list for left column
  const filteredContacts = useMemo(() => {
    return contacts
      .filter(contact => {
        if (!matchesTabFilter(contact, activeTab)) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const nameMatch = contact.fullName.toLowerCase().includes(q);
          const compMatch = (contact.companyName || "").toLowerCase().includes(q);
          const jobMatch = (contact.jobTitle || "").toLowerCase().includes(q);
          const msgsMatch = (contact.conversationMessages || []).some(m => m.text.toLowerCase().includes(q));
          const noteMatch = (contact.notes || "").toLowerCase().includes(q);
          if (!nameMatch && !compMatch && !jobMatch && !msgsMatch && !noteMatch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // 1. Attention priority (Urgent / To Do first)
        const priorityA = calculateContactPriority(a);
        const priorityB = calculateContactPriority(b);
        if (priorityA.sortScore !== priorityB.sortScore) {
          return priorityB.sortScore - priorityA.sortScore;
        }

        // 2. Most recent interaction
        const msgsA = a.conversationMessages || [];
        const lastA = msgsA[msgsA.length - 1];
        const timeA = lastA?.timestamp || a.lastOutreachDate || a.createdAt || "";

        const msgsB = b.conversationMessages || [];
        const lastB = msgsB[msgsB.length - 1];
        const timeB = lastB?.timestamp || b.lastOutreachDate || b.createdAt || "";

        return timeB.localeCompare(timeA);
      });
  }, [contacts, activeTab, searchQuery]);

  // Initials generator
  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length === 0) return "C";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Gradient for avatars
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
        sublabel: "Réponse reçue du contact",
        urgent: true,
        badgeClass: "bg-purple-500/15 text-purple-300 border-purple-500/30"
      };
    }

    if (status === "relance_a_faire" || priority.priority === "urgent") {
      return {
        label: formattedDueDate ? `À relancer · ${formattedDueDate}` : "À relancer",
        sublabel: "Aucun retour après délai",
        urgent: true,
        badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/30"
      };
    }

    if (status === "demande_envoyee") {
      return {
        label: "Demande en attente",
        sublabel: formattedDueDate ? `Vérif : ${formattedDueDate}` : "Invitation LinkedIn",
        urgent: false,
        badgeClass: "bg-sky-500/10 text-sky-300 border-sky-500/20"
      };
    }

    if (status === "connexion_acceptee") {
      return {
        label: "Envoyer 1er message",
        sublabel: "Connexion acceptée",
        urgent: true,
        badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      };
    }

    if (status === "appel_prevu") {
      return {
        label: formattedDueDate ? `Entretien · ${formattedDueDate}` : "Entretien à préparer",
        sublabel: "Échange calé",
        urgent: false,
        badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30"
      };
    }

    if (status === "echange_en_cours" || status === "exchanging") {
      return {
        label: "Échange en cours",
        sublabel: formattedDueDate ? `Relance : ${formattedDueDate}` : "Discussion active",
        urgent: false,
        badgeClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
      };
    }

    if (dueDate) {
      return {
        label: `Relance · ${formattedDueDate}`,
        sublabel: "Échéance programmée",
        urgent: false,
        badgeClass: "bg-white/5 text-[#9AA0B2] border-white/10"
      };
    }

    return {
      label: "En attente de retour",
      sublabel: "Pas d'action immédiate",
      urgent: false,
      badgeClass: "bg-white/5 text-[#9AA0B2] border-white/10"
    };
  };

  // Deep Contextual Analysis for NACORA AI
  const contextualAnalysis = useMemo(() => {
    if (!selectedContact) return null;

    const messages = currentMessages;
    const lastMsg = messages[messages.length - 1];
    const status = selectedContact.networkingStatus || "a_contacter";
    const contactName = selectedContact.firstName || selectedContact.fullName;

    // Days since last exchange
    let daysSinceLast = 0;
    if (lastMsg) {
      const lastDate = new Date(lastMsg.timestamp);
      daysSinceLast = Math.max(0, Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 3600 * 24)));
    }

    // Determine speaker & why
    let speaker = "Nathan";
    let recommendationType = "Prise de contact";
    let reason = "Vous n'avez pas encore envoyé de message direct à cette relation.";
    let goal = "Établir un premier pont professionnel crédible et susciter la curiosité.";
    let isTimingGood = true;
    let timingNote = "Le moment est optimal pour initier l'échange.";
    let toneAdvice = "Courtois, humble, percutant et ultra-concis (< 300 caractères si note LinkedIn).";
    let pitfalls = "Ne pas joindre de CV d'emblée, ne pas demander directement un job, éviter les formules pompeuses.";
    let keyAnchor = selectedContact.connectionPoints?.[0] || `Son rôle de ${selectedContact.jobTitle} chez ${selectedContact.companyName}`;

    if (lastMsg && lastMsg.sender === "contact") {
      speaker = "Nathan doit répondre";
      recommendationType = "Répondre au message reçu";
      reason = `${contactName} vous a répondu le ${formatShortDate(lastMsg.timestamp)}. La porte est ouverte !`;
      goal = "Rebondir avec chaleur et proposer 2 créneaux simples pour un échange téléphonique de 10 minutes.";
      isTimingGood = true;
      timingNote = "Répondre sous 24-48h pour entretenir la dynamique positive.";
      toneAdvice = "Réactif, enthousiaste mais professionnel.";
      pitfalls = "Ne pas laisser traîner la réponse, ne pas proposer un rendez-vous trop long (10-15 min max).";
    } else if (lastMsg && lastMsg.sender === "nathan") {
      if (daysSinceLast >= 7) {
        speaker = "Nathan doit relancer";
        recommendationType = "Relance recommandée (J+7)";
        reason = `Votre dernier message date d'il y a ${daysSinceLast} jours. Aucune réponse enregistrée à ce jour.`;
        goal = "Remonter dans le fil de discussion sans culpabiliser le contact, en apportant un élément nouveau ou une question légère.";
        isTimingGood = true;
        timingNote = "Délai de courtoisie respecté (>= 7 jours).";
        toneAdvice = "Bienveillant, décomplexant ('Je me permets de remonter notre fil au cas où...').";
        pitfalls = "Ne pas reprocher l'absence de réponse, ne pas renvoyer le même message identique.";
      } else {
        speaker = "En attente du contact";
        recommendationType = "Attente recommandée";
        reason = `Votre dernier message a été envoyé il y a ${daysSinceLast} jour${daysSinceLast > 1 ? "s" : ""}.`;
        goal = "Laisser le contact respirer et traiter sa messagerie.";
        isTimingGood = false;
        timingNote = `Trop tôt pour relancer (${daysSinceLast}j). Attendre au moins J+7 pour ne pas paraître intrusif.`;
        toneAdvice = "Patience.";
        pitfalls = "Ne surtout pas sur-relancer avant 7 jours pleins.";
      }
    } else if (status === "connexion_acceptee") {
      speaker = "Nathan doit écrire";
      recommendationType = "Premier message post-connexion";
      reason = `${contactName} vient d'accepter votre invitation LinkedIn.`;
      goal = "Remercier pour l'acceptation et initier l'échange sur un sujet valorisant pour lui.";
      isTimingGood = true;
      timingNote = "Idéal dans les 24h suivant l'acceptation.";
      toneAdvice = "Direct, reconnaissant, question ouverte.";
      pitfalls = "Ne pas envoyer de pavé générique de 500 mots.";
    }

    return {
      speaker,
      recommendationType,
      reason,
      goal,
      isTimingGood,
      timingNote,
      toneAdvice,
      pitfalls,
      keyAnchor,
      daysSinceLast
    };
  }, [selectedContact, currentMessages]);

  // Smart Conversation AI Reply Generation (Hybrid State A -> State B)
  const handleGenerateSmartReply = async (instructionOverride?: string) => {
    if (!selectedContact) return;
    const currentInstruction = (instructionOverride !== undefined ? instructionOverride : composerText).trim();
    setIsGeneratingAi(true);

    try {
      showToast("L'IA analyse la conversation et prépare la réponse...", "ai");
      const result = await generateSmartConversationReply({
        contact: selectedContact,
        profile,
        messages: currentMessages,
        userInstruction: currentInstruction,
        channel: composerChannel
      });

      if (result && result.reply) {
        setComposerText(result.reply);
        setAppliedInstruction(currentInstruction || "Réponse contextuelle au dernier échange");
        setComposerMode("draft");
        setAiGeneratedDraft(result.reply);
        showToast("Brouillon IA généré avec succès !", "ai");
      }
    } catch (e) {
      console.error("Error generating smart reply:", e);
      showToast("Erreur lors de la génération. Veuillez réessayer.", "error");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Refine existing draft in State B
  const handleRefineDraft = async (refinementText: string) => {
    if (!selectedContact || !composerText.trim()) return;
    setIsRefining(true);

    try {
      showToast("Ajustement du brouillon en cours...", "ai");
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

  // Discard draft / Reset composer to empty input mode
  const handleResetComposer = () => {
    setComposerText("");
    setAppliedInstruction("");
    setRefinementInput("");
    setComposerMode("input");
  };

  // AI Generation trigger from drawer (ONLY ON EXPLICIT BUTTON CLICK)
  const handleGenerateAiProposal = async (customInstructionOverride?: string) => {
    if (!selectedContact) return;
    setIsGeneratingAi(true);

    try {
      showToast("L'IA prépare une réponse adaptée...", "ai");
      
      const instructionParts: string[] = [];
      if (selectedExchangeGoal && selectedExchangeGoal !== "À définir") {
        instructionParts.push(`Objectif de l'échange : ${selectedExchangeGoal}`);
      }
      if (selectedActionType) {
        instructionParts.push(`Action choisie : ${selectedActionType}`);
      }
      if (selectedTemplate && selectedTemplate !== "free") {
        if (selectedTemplate === "point_commun") {
          instructionParts.push("Angle : point commun vérifié uniquement (ne rien inventer si absent)");
        } else if (selectedTemplate === "opportunite") {
          instructionParts.push("Angle : opportunité ou projet");
        } else if (selectedTemplate === "alumni") {
          instructionParts.push("Angle : alumni / école ou recommandation");
        } else if (selectedTemplate === "custom") {
          instructionParts.push("Angle : réponse très personnalisée");
        }
      }

      const activeText = (customInstructionOverride !== undefined ? customInstructionOverride : aiCustomInstructions).trim();
      if (activeText) {
        instructionParts.push(`Consigne utilisateur : ${activeText}`);
      }

      const combinedInstruction = instructionParts.join(". ") || "Réponds de manière naturelle et adaptée au dernier message de la relation.";

      const result = await generateSmartConversationReply({
        contact: selectedContact,
        profile,
        messages: currentMessages,
        userInstruction: combinedInstruction,
        channel: composerChannel
      });

      if (result && result.reply) {
        setAiGeneratedDraft(result.reply);
        showToast("Proposition générée !", "ai");
      }
    } catch (e) {
      console.error("Error in handleGenerateAiProposal:", e);
      showToast("Erreur lors de la génération.", "error");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Run on-demand factual analysis of the conversation (ONLY ON EXPLICIT USER CLICK)
  const handleRunExplicitAnalysis = () => {
    if (!selectedContact) return;
    setIsAnalyzingConvo(true);
    try {
      const lastContactMsg = [...currentMessages].reverse().find(m => m.sender === "contact");
      const isExistingRelation = currentMessages.length > 2;

      let summary = "";
      if (lastContactMsg) {
        summary = `Dernier message reçu de ${selectedContact.firstName || selectedContact.fullName} (${formatShortDate(lastContactMsg.timestamp)}). ${
          isExistingRelation ? "Échange régulier déjà en cours (relation existante)." : "Prise de contact en cours."
        } Ton détecté : ${selectedContact.outreachTone === 'tutoiement' ? 'familier / tutoiement' : 'professionnel / courtois'}.`;
      } else {
        summary = `Aucun message reçu pour le moment avec ${selectedContact.fullName}. Prêt pour rédiger un premier message selon l'objectif souhaité.`;
      }

      setAnalysisSummary(summary);
      showToast("Analyse factuelle prête !", "ai");
    } finally {
      setIsAnalyzingConvo(false);
    }
  };

  // Open AI Drawer (STRICT ZERO AUTOMATIC AI / GEMINI CALLS ON OPENING!)
  const handleOpenAiDrawer = () => {
    setIsAiDrawerOpen(true);
  };

  // Insert AI draft into composer
  const handleInsertDraftIntoComposer = () => {
    if (!aiGeneratedDraft) return;
    setComposerText(aiGeneratedDraft);
    setComposerMode("draft");
    setAppliedInstruction(
      aiCustomInstructions || 
      (selectedExchangeGoal !== "À définir" ? selectedExchangeGoal : "Proposition Assistant IA")
    );
    setIsAiDrawerOpen(false);
    showToast("Message inséré dans le composer !", "success");
  };

  // Save / Log Message (Nathan or Contact) with intelligent instruction interception
  const handleSaveMessage = (sender: "nathan" | "contact") => {
    if (!selectedContact || !composerText.trim()) return;

    // Check if the input is actually an instruction intended for AI rather than a message
    if (sender === "nathan" && composerMode === "input") {
      const intentCheck = detectComposerIntent(composerText);
      if (intentCheck.isInstruction) {
        showToast("Instruction détectée : génération de la réponse...", "ai");
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
        ? `Message consigné sur ${composerChannel === "email" ? "Email" : "LinkedIn"}`
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
    showToast(
      sender === "nathan" 
        ? (composerChannel === "linkedin" ? "Échange consigné dans le CRM (relance J+7 calée)" : "Message consigné !")
        : "Réponse enregistrée !", 
      "success"
    );
  };

  // Copy helper
  const handleCopyMessage = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    showToast("Copié dans le presse-papiers !", "info");
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
    showToast(`Statut mis à jour : ${config.label}`, "success");
  };

  // Reschedule follow-up
  const handleReschedule = (days: number) => {
    if (!selectedContact) return;
    const d = new Date();
    d.setDate(d.getDate() + days);
    const dateStr = d.toISOString().split("T")[0];

    const updated: Contact = {
      ...selectedContact,
      nextFollowUpDate: dateStr,
      nextAction: {
        type: "relance",
        label: `Relance prévue (${formatShortDate(dateStr)})`,
        dueDate: dateStr,
        priority: "upcoming"
      },
      history: [
        {
          id: "hist_" + Math.random().toString(36).substring(2, 9),
          type: "follow_up_scheduled",
          label: `Relance fixée au ${dateStr}`,
          timestamp: new Date().toISOString()
        },
        ...(selectedContact.history || [])
      ]
    };

    dbStore.updateContact(updated);
    setIsScheduleMenuOpen(false);
    showToast(`Relance programmée pour le ${formatShortDate(dateStr)}`, "success");
  };

  // Add quick note
  const handleAddQuickNote = () => {
    if (!selectedContact || !quickNoteText.trim()) return;

    const timestamp = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
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

  // Single next action of selected contact
  const selectedNextAction = selectedContact ? getSingleNextAction(selectedContact) : null;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -mx-4 -mt-4 sm:-mx-6 sm:-mt-4 overflow-hidden bg-[#060812] select-none text-[#F5F6FA]">
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER APP BAR : Messagerie & Suivi Networking                      */}
      {/* ========================================================================= */}
      <div className="h-14 border-b border-white/10 px-4 sm:px-6 flex items-center justify-between shrink-0 bg-[#0B0F19]/80 backdrop-blur-xl z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[rgba(216,26,69,0.18)] text-[#FF6685] border border-[rgba(216,26,69,0.35)] flex items-center justify-center font-bold shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold text-[#F5F6FA] font-display tracking-tight">
              Messagerie & Networking
            </h1>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-[#9AA0B2] font-mono">
              {contacts.length} conversations
            </span>
          </div>
        </div>

        {/* Global actions on top right */}
        <div className="flex items-center gap-2">
          {tabCounts.needs_reply > 0 && (
            <button
              onClick={() => setActiveTab("needs_reply")}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold hover:bg-purple-500/20 transition-all cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-[#C084FC] animate-pulse" />
              <span>{tabCounts.needs_reply} à répondre</span>
            </button>
          )}

          {tabCounts.to_follow_up > 0 && (
            <button
              onClick={() => setActiveTab("to_follow_up")}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold hover:bg-rose-500/20 transition-all cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-[#FF6685]" />
              <span>{tabCounts.to_follow_up} à relancer</span>
            </button>
          )}

          <GlassButton
            variant="ghost"
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            icon={<Sparkles className="w-3.5 h-3.5 text-[#C084FC]" />}
          >
            <span className="hidden sm:inline">Importer des conversations</span>
            <span className="sm:hidden">Importer</span>
          </GlassButton>

          <GlassButton
            variant="secondary"
            size="sm"
            onClick={() => setIsNewConvoModalOpen(true)}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            <span className="hidden sm:inline">Nouvelle conversation</span>
            <span className="sm:hidden">Nouveau</span>
          </GlassButton>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN 2-COLUMN MESSAGING WORKSPACE                                       */}
      {/* ========================================================================= */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        
        {/* ========================================================================= */}
        {/* COLONNE GAUCHE : LISTE DES CONVERSATIONS (Compacte type LinkedIn/WhatsApp) */}
        {/* ========================================================================= */}
        <div className={`w-full lg:w-[360px] xl:w-[390px] border-r border-white/10 flex flex-col shrink-0 bg-[#090D1A]/70 backdrop-blur-xl ${
          selectedContactId ? "hidden lg:flex" : "flex"
        }`}>
          
          {/* Header search bar */}
          <div className="p-3 border-b border-white/10 space-y-2 shrink-0 bg-white/[0.01]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9AA0B2]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une conversation, un contact ou une entreprise..."
                className="w-full glass-input pl-9 pr-8 py-2 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60 focus:border-[#D81A45]/50 transition-all rounded-xl"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9AA0B2] hover:text-white p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter chips requested by user */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap cursor-pointer transition-all ${
                  activeTab === "all"
                    ? "bg-[#D81A45] text-white shadow-[0_0_12px_rgba(216,26,69,0.3)] font-bold"
                    : "bg-white/5 text-[#9AA0B2] hover:bg-white/10 hover:text-[#F5F6FA] border border-white/5"
                }`}
              >
                Tous ({tabCounts.all})
              </button>

              <button
                onClick={() => setActiveTab("needs_reply")}
                className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                  activeTab === "needs_reply"
                    ? "bg-[#C084FC] text-black font-bold shadow-[0_0_12px_rgba(192,132,252,0.3)]"
                    : "bg-white/5 text-[#9AA0B2] hover:bg-white/10 hover:text-[#F5F6FA] border border-white/5"
                }`}
              >
                <span>À répondre</span>
                {tabCounts.needs_reply > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === "needs_reply" ? "bg-black/30 text-white" : "bg-purple-500/20 text-purple-300 font-bold"
                  }`}>
                    {tabCounts.needs_reply}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("to_follow_up")}
                className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                  activeTab === "to_follow_up"
                    ? "bg-[#FF6685] text-white shadow-[0_0_12px_rgba(255,102,133,0.3)] font-bold"
                    : "bg-white/5 text-[#9AA0B2] hover:bg-white/10 hover:text-[#F5F6FA] border border-white/5"
                }`}
              >
                <span>À relancer</span>
                {tabCounts.to_follow_up > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === "to_follow_up" ? "bg-black/30 text-white" : "bg-rose-500/20 text-rose-300 font-bold"
                  }`}>
                    {tabCounts.to_follow_up}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("request_sent")}
                className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap cursor-pointer transition-all ${
                  activeTab === "request_sent"
                    ? "bg-[#38BDF8] text-black font-bold shadow-[0_0_12px_rgba(56,189,248,0.3)]"
                    : "bg-white/5 text-[#9AA0B2] hover:bg-white/10 hover:text-[#F5F6FA] border border-white/5"
                }`}
              >
                Demandes envoyées ({tabCounts.request_sent})
              </button>

              <button
                onClick={() => setActiveTab("active_exchange")}
                className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap cursor-pointer transition-all ${
                  activeTab === "active_exchange"
                    ? "bg-[#34D399] text-black font-bold shadow-[0_0_12px_rgba(52,211,153,0.3)]"
                    : "bg-white/5 text-[#9AA0B2] hover:bg-white/10 hover:text-[#F5F6FA] border border-white/5"
                }`}
              >
                Échanges actifs ({tabCounts.active_exchange})
              </button>

              <button
                onClick={() => setActiveTab("interview")}
                className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap cursor-pointer transition-all ${
                  activeTab === "interview"
                    ? "bg-[#FBBF24] text-black font-bold shadow-[0_0_12px_rgba(251,191,36,0.3)]"
                    : "bg-white/5 text-[#9AA0B2] hover:bg-white/10 hover:text-[#F5F6FA] border border-white/5"
                }`}
              >
                Entretiens ({tabCounts.interview})
              </button>

              <button
                onClick={() => setActiveTab("closed")}
                className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap cursor-pointer transition-all ${
                  activeTab === "closed"
                    ? "bg-white/20 text-white font-bold"
                    : "bg-white/5 text-[#9AA0B2] hover:bg-white/10 hover:text-[#F5F6FA] border border-white/5"
                }`}
              >
                Terminés ({tabCounts.closed})
              </button>
            </div>
          </div>

          {/* List of contacts / conversations */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {filteredContacts.length === 0 ? (
              <div className="p-8 text-center text-[#9AA0B2] space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[#9AA0B2]/60">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <p className="text-xs">Aucune conversation dans cette vue.</p>
                <button
                  onClick={() => {
                    setActiveTab("all");
                    setSearchQuery("");
                  }}
                  className="text-xs text-[#FF6685] hover:underline cursor-pointer"
                >
                  Afficher toutes les conversations
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
                    className={`p-3 transition-all cursor-pointer relative group flex items-start gap-3 select-none ${
                      isSelected
                        ? "bg-white/[0.08] border-l-4 border-l-[#D81A45] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                        : "hover:bg-white/[0.03] border-l-4 border-l-transparent"
                    }`}
                  >
                    {/* Avatar with Status indicator */}
                    <div className="relative shrink-0 mt-0.5">
                      <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr border flex items-center justify-center font-bold text-xs shadow-md ${getAvatarGradient(contact.fullName)}`}>
                        {getInitials(contact.fullName)}
                      </div>
                      {isNeedsReply && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#C084FC] border-2 border-[#090D1A] animate-pulse" title="Réponse attendue" />
                      )}
                      {nextAction.urgent && !isNeedsReply && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#FF6685] border-2 border-[#090D1A]" title="Relance urgente" />
                      )}
                    </div>

                    {/* Main textual info */}
                    <div className="flex-1 min-w-0">
                      {/* Name & Time */}
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h2 className="text-xs font-bold text-[#F5F6FA] truncate group-hover:text-white transition-colors">
                          {contact.fullName}
                        </h2>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConversationToDelete(contact);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-[#9AA0B2] hover:text-[#FF6685] hover:bg-red-500/10 transition-all cursor-pointer"
                            title="Supprimer cette conversation"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <span className="text-[10px] text-[#9AA0B2] font-mono">
                            {formatShortDate(lastMsg?.timestamp || contact.lastOutreachDate || contact.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Job & Company */}
                      <p className="text-[11px] text-[#9AA0B2] truncate mb-1">
                        {contact.jobTitle || "Professionnel"} · <span className="text-white/70">{contact.companyName || "Entreprise"}</span>
                      </p>

                      {/* Last message preview snippet */}
                      <p className="text-[11px] text-[#F5F6FA]/70 line-clamp-1 italic mb-1.5">
                        {lastMsg ? (
                          <>
                            {lastMsg.sender === "nathan" && (
                              <span className="text-[#FF6685] not-italic font-medium">Vous : </span>
                            )}
                            « {lastMsg.text} »
                          </>
                        ) : (
                          <span className="text-[#9AA0B2]/50 not-italic">Pas encore d'échange</span>
                        )}
                      </p>

                      {/* Single clean Status / Next Action pill */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${nextAction.badgeClass}`}>
                          {nextAction.urgent && <Flame className="w-2.5 h-2.5 shrink-0" />}
                          <span className="truncate">{nextAction.label}</span>
                        </span>

                        {contact.outreachChannel === "email" ? (
                          <Mail className="w-3 h-3 text-[#34D399]/60 shrink-0" />
                        ) : (
                          <Linkedin className="w-3 h-3 text-[#38BDF8]/60 shrink-0" />
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
        {/* COLONNE CENTRALE : CONVERSATION (Chat style WhatsApp / LinkedIn)           */}
        {/* ========================================================================= */}
        <div className={`flex-1 flex flex-col min-w-0 bg-[#060812] overflow-hidden ${
          !selectedContactId ? "hidden lg:flex" : "flex"
        }`}>
          
          {!selectedContact ? (
            /* Empty State */
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div className="max-w-md space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-[rgba(216,26,69,0.12)] border border-[rgba(216,26,69,0.3)] flex items-center justify-center mx-auto text-[#FF6685] shadow-[0_0_24px_rgba(216,26,69,0.15)]">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h2 className="text-lg font-bold text-[#F5F6FA] font-display">
                  Sélectionnez une conversation
                </h2>
                <p className="text-xs text-[#9AA0B2] leading-relaxed">
                  Choisissez une relation dans la liste de gauche pour afficher l'historique complet des échanges, générer vos messages avec l'IA et piloter vos relances.
                </p>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <GlassButton
                    variant="primary"
                    size="sm"
                    onClick={() => setIsNewConvoModalOpen(true)}
                    icon={<Plus className="w-4 h-4" />}
                  >
                    Démarrer un échange
                  </GlassButton>
                  <GlassButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsImportModalOpen(true)}
                    icon={<Sparkles className="w-4 h-4 text-[#C084FC]" />}
                  >
                    Importer une conversation
                  </GlassButton>
                </div>
              </div>
            </div>
          ) : (
            /* Full Conversation View */
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              
              {/* 1. CONVERSATION HEADER */}
              <div className="h-16 border-b border-white/10 px-4 sm:px-6 flex items-center justify-between shrink-0 bg-[#0B0F19]/90 backdrop-blur-xl z-10">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back to List */}
                  <button
                    onClick={() => setSelectedContactId(null)}
                    className="p-1.5 rounded-xl bg-white/5 text-[#9AA0B2] hover:text-white border border-white/10 lg:hidden cursor-pointer shrink-0"
                    title="Retour aux conversations"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr border flex items-center justify-center font-bold text-xs shrink-0 ${getAvatarGradient(selectedContact.fullName)}`}>
                    {getInitials(selectedContact.fullName)}
                  </div>

                  {/* Contact Meta */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-[#F5F6FA] truncate font-display">
                        {selectedContact.fullName}
                      </h2>
                    </div>
                    <p className="text-xs text-[#9AA0B2] truncate">
                      {selectedContact.jobTitle || "Professionnel"} · <span className="text-[#F5F6FA]/80">{selectedContact.companyName}</span>
                    </p>
                  </div>
                </div>

                {/* Actions discrètes & Statut dans le Header */}
                <div className="flex items-center gap-2 shrink-0">
                  
                  {/* Single Next Action Pill / Status dropdown */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsStatusMenuOpen(!isStatusMenuOpen);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 text-xs font-medium cursor-pointer transition-all"
                      title="Modifier le statut"
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedContact.networkingStatus ? (NETWORKING_STATUS_DETAILS[selectedContact.networkingStatus]?.color || "#FF6685") : "#FF6685" }} />
                      <span className="text-[#F5F6FA] text-xs font-semibold">
                        {selectedContact.networkingStatus ? (NETWORKING_STATUS_DETAILS[selectedContact.networkingStatus]?.label || "À contacter") : "À contacter"}
                      </span>
                      <ChevronDown className="w-3 h-3 text-[#9AA0B2]" />
                    </button>

                    {isStatusMenuOpen && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-[#0F1424] border border-white/15 shadow-2xl p-2 z-50 backdrop-blur-2xl space-y-1"
                      >
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B2] px-2.5 py-1">
                          Modifier le statut de l'échange
                        </div>
                        <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                          {Object.entries(NETWORKING_STATUS_DETAILS).map(([key, details]) => (
                            <button
                              key={key}
                              onClick={() => handleUpdateStatus(key as ContactNetworkingStatus)}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors text-left cursor-pointer ${
                                selectedContact.networkingStatus === key ? "bg-white/10 font-bold text-white" : "hover:bg-white/5 text-[#9AA0B2] hover:text-[#F5F6FA]"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: details.color }} />
                                <span>{details.label}</span>
                              </div>
                              {selectedContact.networkingStatus === key && (
                                <Check className="w-3.5 h-3.5 text-[#34D399]" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Program follow-up dropdown */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsScheduleMenuOpen(!isScheduleMenuOpen);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 text-xs text-[#9AA0B2] hover:text-white cursor-pointer transition-all"
                      title="Programmer une relance"
                    >
                      <CalendarClock className="w-3.5 h-3.5 text-[#FF6685]" />
                      <span className="hidden sm:inline">Relance</span>
                      <ChevronDown className="w-3 h-3 text-[#9AA0B2]" />
                    </button>

                    {isScheduleMenuOpen && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-[#0F1424] border border-white/15 shadow-2xl p-2 z-50 backdrop-blur-2xl space-y-1"
                      >
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B2] px-2 py-1">
                          Planifier la relance
                        </div>
                        <button
                          onClick={() => handleReschedule(2)}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-xs text-[#F5F6FA] cursor-pointer"
                        >
                          + 2 jours (J+2)
                        </button>
                        <button
                          onClick={() => handleReschedule(5)}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-xs text-[#F5F6FA] cursor-pointer"
                        >
                          + 5 jours (J+5)
                        </button>
                        <button
                          onClick={() => handleReschedule(7)}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-xs text-[#F5F6FA] cursor-pointer"
                        >
                          + 7 jours (J+7 standard)
                        </button>
                      </div>
                    )}
                  </div>

                  {/* LinkedIn discrete link */}
                  {selectedContact.linkedInUrl && (
                    <a
                      href={selectedContact.linkedInUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-white/[0.04] text-[#38BDF8] hover:bg-[#38BDF8]/10 border border-white/10 transition-colors"
                      title="Ouvrir le profil LinkedIn"
                    >
                      <Linkedin className="w-4 h-4" />
                    </a>
                  )}

                  {/* Email discrete link */}
                  {selectedContact.email && (
                    <a
                      href={`mailto:${selectedContact.email}`}
                      className="p-2 rounded-xl bg-white/[0.04] text-[#34D399] hover:bg-[#34D399]/10 border border-white/10 transition-colors"
                      title={`Envoyer un email à ${selectedContact.email}`}
                    >
                      <Mail className="w-4 h-4" />
                    </a>
                  )}

                  {/* Voir la fiche contact */}
                  <button
                    onClick={() => setIsDetailModalOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.04] text-[#9AA0B2] hover:text-[#F5F6FA] hover:bg-white/10 border border-white/10 text-xs transition-colors cursor-pointer"
                    title="Voir la fiche contact complète"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Fiche</span>
                  </button>

                  {/* Contexte IA Trigger */}
                  <button
                    onClick={() => setIsContextDrawerOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 border border-purple-500/25 text-xs transition-all cursor-pointer font-medium"
                    title="Afficher le diagnostic & Contexte IA"
                  >
                    <Info className="w-3.5 h-3.5 text-[#C084FC]" />
                    <span className="hidden md:inline">Contexte IA</span>
                  </button>

                  {/* Supprimer la conversation */}
                  <button
                    onClick={() => setConversationToDelete(selectedContact)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-[#FF6685] hover:text-white border border-red-500/20 hover:border-red-500/40 text-xs transition-all cursor-pointer font-medium"
                    title="Supprimer cette conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Supprimer</span>
                  </button>
                </div>
              </div>

              {/* 2. PROCHAINE ACTION & CANAL BANNER (Discrete multi-channel ribbon) */}
              <div className="bg-white/[0.02] border-b border-white/10 px-4 sm:px-6 py-2 flex items-center justify-between gap-4 flex-wrap">
                {selectedNextAction ? (
                  <div className="flex items-center gap-2 text-xs truncate">
                    <span className="text-[#9AA0B2]">Prochaine action :</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${selectedNextAction.badgeClass}`}>
                      {selectedNextAction.label}
                    </span>
                    <span className="text-[#9AA0B2]/60 hidden sm:inline">
                      ({selectedNextAction.sublabel})
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-[#9AA0B2]">
                    Échanges consignés avec {selectedContact.fullName}
                  </div>
                )}

                {/* SÉLECTEUR MULTI-CANAL : LinkedIn + Email = Une seule relation */}
                {channelCounts.total > 0 && (
                  <div className="flex items-center gap-1 bg-white/[0.04] p-0.5 rounded-xl border border-white/10 text-xs">
                    <button
                      onClick={() => setSelectedChannelFilter("all")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                        selectedChannelFilter === "all" ? "bg-white/15 text-white" : "text-[#9AA0B2] hover:text-white"
                      }`}
                      title="Afficher l'historique complet de la relation"
                    >
                      Tous ({channelCounts.total})
                    </button>
                    {channelCounts.linkedin > 0 && (
                      <button
                        onClick={() => {
                          setSelectedChannelFilter("linkedin");
                          setComposerChannel("linkedin");
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                          selectedChannelFilter === "linkedin" ? "bg-[#38BDF8]/20 text-[#38BDF8]" : "text-[#9AA0B2] hover:text-[#38BDF8]"
                        }`}
                        title="Afficher uniquement les échanges LinkedIn"
                      >
                        <Linkedin className="w-3 h-3" />
                        <span>LinkedIn ({channelCounts.linkedin})</span>
                      </button>
                    )}
                    {channelCounts.email > 0 && (
                      <button
                        onClick={() => {
                          setSelectedChannelFilter("email");
                          setComposerChannel("email");
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                          selectedChannelFilter === "email" ? "bg-emerald-500/20 text-emerald-300" : "text-[#9AA0B2] hover:text-[#34D399]"
                        }`}
                        title="Afficher uniquement les échanges Email"
                      >
                        <Mail className="w-3 h-3" />
                        <span>Email ({channelCounts.email})</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Quick AI Trigger button */}
                <button
                  onClick={handleOpenAiDrawer}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-[rgba(216,26,69,0.15)] to-[rgba(192,132,252,0.15)] border border-[rgba(216,26,69,0.3)] hover:border-[#FF6685] text-xs text-[#FF6685] font-semibold transition-all cursor-pointer shrink-0"
                >
                  <Sparkles className="w-3 h-3 text-[#C084FC]" />
                  <span>Consulter l'IA</span>
                </button>
              </div>

              {/* 3. HISTORIQUE DES MESSAGES (Chat Bubbles with Date Dividers) */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#060812]">
                {currentMessages.length === 0 ? (
                  <div className="p-8 text-center max-w-sm mx-auto space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[#9AA0B2]">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-[#9AA0B2]">
                      Aucun message consigné pour le moment avec {selectedContact.fullName}.
                    </p>
                    <p className="text-[11px] text-[#9AA0B2]/60">
                      Rédigez un message ci-dessous ou cliquez sur le bouton [IA] pour générer une approche sur-mesure.
                    </p>
                  </div>
                ) : (
                  groupMessagesByDate(currentMessages).map((group, gIdx) => (
                    <div key={gIdx} className="space-y-3">
                      
                      {/* DATE SEPARATOR (Ex: "20 SEPTEMBRE") */}
                      <div className="flex items-center justify-center my-4">
                        <span className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[10px] font-mono tracking-wider font-semibold text-[#9AA0B2]">
                          {group.dateLabel}
                        </span>
                      </div>

                      {/* Messages within this date */}
                      {group.messages.map((msg, index) => {
                        const isNathan = msg.sender === "nathan";
                        const isSystem = msg.sender === "system" || msg.sender === "note";

                        if (isSystem) {
                          return (
                            <div key={msg.id || index} className="flex justify-center my-2">
                              <div className="px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-[#9AA0B2] text-[11px] font-medium flex items-center gap-2 max-w-md text-center">
                                <Clock className="w-3 h-3 text-[#FF6685]" />
                                <span>{msg.text}</span>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={msg.id || index}
                            className={`flex flex-col group ${isNathan ? "items-end" : "items-start"}`}
                          >
                            <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[70%]">
                              {!isNathan && (
                                <div className={`w-7 h-7 rounded-xl bg-gradient-to-tr border flex items-center justify-center font-bold text-[10px] shrink-0 mb-1 ${getAvatarGradient(selectedContact.fullName)}`}>
                                  {getInitials(selectedContact.fullName)}
                                </div>
                              )}

                              {/* Message Bubble (Light, modern) */}
                              <div
                                className={`rounded-2xl px-4 py-3 text-xs leading-relaxed relative ${
                                  isNathan
                                    ? "bg-gradient-to-br from-[rgba(216,26,69,0.18)] to-[rgba(216,26,69,0.06)] border border-[rgba(216,26,69,0.35)] text-[#F5F6FA] rounded-br-none shadow-[0_4px_16px_rgba(216,26,69,0.1)]"
                                    : "bg-white/[0.06] border border-white/10 text-[#F5F6FA] rounded-bl-none shadow-md"
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

                                {/* Bubble Footer */}
                                <div className="flex items-center justify-end gap-2 mt-2 pt-1 border-t border-white/5 text-[10px] text-[#9AA0B2]">
                                  <span className="font-mono">
                                    {new Date(msg.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                  {msg.channel === "email" ? (
                                    <span className="flex items-center gap-0.5 text-emerald-400">
                                      <Mail className="w-2.5 h-2.5" /> Email
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-0.5 text-sky-400">
                                      <Linkedin className="w-2.5 h-2.5" /> LinkedIn
                                    </span>
                                  )}
                                  {isNathan && (
                                    <CheckCheck className="w-3 h-3 text-[#34D399]" />
                                  )}

                                  {/* Quick Copy Message */}
                                  <button
                                    onClick={() => handleCopyMessage(msg.text, msg.id || String(index))}
                                    className="p-1 rounded hover:bg-white/10 text-[#9AA0B2] hover:text-white transition-colors cursor-pointer"
                                    title="Copier le message"
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
              {/* 4. COMPOSER UN MESSAGE (Interface Hybride : Instruction IA & Brouillon)   */}
              {/* ========================================================================= */}
              <div className="p-3 sm:p-4 border-t border-white/10 bg-[#0B0F19]/95 backdrop-blur-xl shrink-0">
                {composerMode === "draft" ? (
                  /* ========================================================================= */
                  /* ÉTAT B — BROUILLON GÉNÉRÉ PAR L'IA                                         */
                  /* ========================================================================= */
                  <div className="rounded-2xl border border-purple-500/35 bg-gradient-to-b from-[#0F1424] to-[#0B0F19] shadow-[0_4px_24px_rgba(192,132,252,0.08)] p-3 space-y-3 animate-in fade-in duration-200">
                    
                    {/* Draft Header Banner */}
                    <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-[#C084FC] flex items-center justify-center shrink-0 border border-purple-500/30">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-xs text-[#F5F6FA] font-display">
                          Brouillon IA
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          Éditable
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          composerChannel === "email" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-[#38BDF8]/15 text-[#38BDF8] border-[#38BDF8]/30"
                        }`}>
                          {composerChannel === "email" ? "Email" : "LinkedIn"}
                        </span>
                        {appliedInstruction && (
                          <span className="hidden md:inline-flex text-[11px] text-[#9AA0B2] bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10 truncate max-w-xs" title={`Instruction : ${appliedInstruction}`}>
                            Instruction : « {appliedInstruction} »
                          </span>
                        )}
                      </div>

                      {/* Discard / New message button */}
                      <button
                        onClick={handleResetComposer}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#9AA0B2] hover:text-[#F5F6FA] text-[11px] border border-white/10 transition-colors cursor-pointer"
                        title="Effacer le brouillon et recommencer"
                      >
                        <X className="w-3 h-3" />
                        <span>Nouveau message</span>
                      </button>
                    </div>

                    {/* Editable Draft Textarea */}
                    <div className="relative">
                      <textarea
                        value={composerText}
                        onChange={(e) => setComposerText(e.target.value)}
                        rows={3}
                        className="w-full bg-black/25 rounded-xl p-3 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60 border border-white/10 focus:border-[#C084FC]/60 focus:outline-none resize-none leading-relaxed font-sans"
                        placeholder="Texte de la réponse..."
                      />
                    </div>

                    {/* Refinement sub-toolbar */}
                    <div className="space-y-2 pt-1 border-t border-white/5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        {/* Quick Refinement Chips */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9AA0B2]">
                            Ajuster :
                          </span>
                          <button
                            onClick={() => handleRefineDraft("Fais une version plus courte et percutante")}
                            disabled={isRefining || isGeneratingAi}
                            className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-[#9AA0B2] hover:text-white border border-white/10 transition-all cursor-pointer disabled:opacity-50"
                          >
                            ⚡ Plus court
                          </button>
                          <button
                            onClick={() => handleRefineDraft("Adopte un ton encore plus chaleureux et naturel")}
                            disabled={isRefining || isGeneratingAi}
                            className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-[#9AA0B2] hover:text-white border border-white/10 transition-all cursor-pointer disabled:opacity-50"
                          >
                            🤝 Plus chaleureux
                          </button>
                          <button
                            onClick={() => handleRefineDraft("Propose un court appel téléphonique de 10 minutes cette semaine")}
                            disabled={isRefining || isGeneratingAi}
                            className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-[#9AA0B2] hover:text-white border border-white/10 transition-all cursor-pointer disabled:opacity-50"
                          >
                            📅 Proposer 10 min
                          </button>
                          <button
                            onClick={() => handleGenerateSmartReply(appliedInstruction)}
                            disabled={isRefining || isGeneratingAi}
                            className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-[#C084FC] border border-purple-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                          >
                            <RefreshCw className={`w-2.5 h-2.5 ${isGeneratingAi ? "animate-spin" : ""}`} />
                            <span>Autre version</span>
                          </button>
                        </div>

                        {/* Inline custom refinement input */}
                        <div className="flex items-center gap-1.5 w-full sm:w-auto sm:max-w-xs">
                          <input
                            type="text"
                            value={refinementInput}
                            onChange={(e) => setRefinementInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && refinementInput.trim()) {
                                e.preventDefault();
                                handleRefineDraft(refinementInput);
                              }
                            }}
                            placeholder="Autre consigne (ex: dis que je suis dispo mardi...)"
                            className="flex-1 sm:w-48 bg-white/5 px-2.5 py-1 rounded-lg text-[11px] text-[#F5F6FA] placeholder-[#9AA0B2]/50 border border-white/10 focus:border-[#C084FC]/50 focus:outline-none"
                          />
                          <button
                            onClick={() => refinementInput.trim() && handleRefineDraft(refinementInput)}
                            disabled={!refinementInput.trim() || isRefining}
                            className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-[#C084FC] border border-purple-500/30 text-[11px] font-semibold transition-all cursor-pointer disabled:opacity-40"
                          >
                            {isRefining ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Ajuster"}
                          </button>
                        </div>
                      </div>

                      {/* Bottom Draft Actions : Copy & Mark As Sent */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/5 gap-2 flex-wrap">
                        <div className="flex items-center gap-2 text-xs text-[#9AA0B2]">
                          {composerChannel === "linkedin" ? (
                            <span className="flex items-center gap-1 text-[11px]">
                              <Linkedin className="w-3 h-3 text-[#38BDF8]" />
                              <span>Envoi externe manuel · À coller sur LinkedIn</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[11px]">
                              <Mail className="w-3 h-3 text-[#34D399]" />
                              <span>Canal Email</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Open LinkedIn profile directly if URL exists */}
                          {composerChannel === "linkedin" && selectedContact.linkedInUrl && (
                            <a
                              href={selectedContact.linkedInUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#0A66C2]/15 hover:bg-[#0A66C2]/25 text-[#38BDF8] border border-[#0A66C2]/30 text-xs font-semibold transition-colors"
                              title="Ouvrir le profil ou la messagerie LinkedIn"
                            >
                              <Linkedin className="w-3.5 h-3.5" />
                              <span className="text-[11px]">Ouvrir LinkedIn</span>
                              <ExternalLink className="w-3 h-3 opacity-60" />
                            </a>
                          )}

                          {/* Primary Action: Copy to Clipboard */}
                          <button
                            onClick={() => handleCopyMessage(composerText, "composer_draft")}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#F5F6FA] font-bold text-xs border border-white/20 transition-all cursor-pointer shadow-sm"
                            title="Copier le message dans le presse-papiers pour le coller sur LinkedIn"
                          >
                            {copiedMessageId === "composer_draft" ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-[#34D399]" />
                                <span className="text-[#34D399]">Copié !</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-[#C084FC]" />
                                <span>Copier</span>
                              </>
                            )}
                          </button>

                          {/* Secondary Action: Mark as sent (Logs into conversation CRM + sets J+7 follow-up) */}
                          <button
                            onClick={() => handleSaveMessage("nathan")}
                            disabled={!composerText.trim()}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#D81A45] hover:bg-[#D81A45]/90 text-white font-bold text-xs transition-all cursor-pointer disabled:opacity-40 shadow-[0_0_14px_rgba(216,26,69,0.3)]"
                            title="Consigner le message dans l'historique de la relation et planifier la relance J+7"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>Marquer comme envoyé</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ========================================================================= */
                  /* ÉTAT A — MODE SAISIE / INSTRUCTION IA                                      */
                  /* ========================================================================= */
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] focus-within:border-[#C084FC]/50 transition-all p-2.5">
                    
                    {/* Textarea + Clearly identified [IA] button */}
                    <div className="relative">
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
                        placeholder={`Demander une réponse à l'IA (ex: réponds à ${selectedContact.firstName || selectedContact.fullName}, dis-lui que je suis dispo...) ou rédiger...`}
                        rows={2}
                        disabled={isGeneratingAi}
                        className="w-full bg-transparent text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60 focus:outline-none resize-none pr-28 leading-relaxed font-sans"
                      />

                      {/* Prominent IA Button inside the top right of composer */}
                      <button
                        onClick={() => handleGenerateSmartReply(composerText)}
                        disabled={isGeneratingAi}
                        className="absolute right-1 top-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[rgba(216,26,69,0.2)] to-[rgba(192,132,252,0.25)] hover:from-[rgba(216,26,69,0.35)] hover:to-[rgba(192,132,252,0.4)] border border-[#C084FC]/40 text-[#F5F6FA] text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer group disabled:opacity-50"
                        title="Demander à l'IA d'analyser la conversation et de rédiger la réponse"
                      >
                        {isGeneratingAi ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 text-[#C084FC] animate-spin" />
                            <span className="text-[11px]">Génération...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-[#C084FC] group-hover:rotate-12 transition-transform" />
                            <span>IA Générer</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Bottom bar of composer: Options [+] + LinkedIn/Email + Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5 gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        
                        {/* [+] Quick Actions Menu */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsPlusMenuOpen(!isPlusMenuOpen);
                            }}
                            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#9AA0B2] hover:text-white border border-white/10 transition-colors cursor-pointer flex items-center justify-center"
                            title="Actions rapides"
                          >
                            <Plus className="w-4 h-4" />
                          </button>

                          {isPlusMenuOpen && (
                            <div 
                              onClick={(e) => e.stopPropagation()}
                              className="absolute left-0 bottom-full mb-2 w-56 rounded-2xl bg-[#0F1424] border border-white/15 shadow-2xl p-2 z-50 backdrop-blur-2xl space-y-1"
                            >
                              <div className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B2] px-2 py-1">
                                Consigner un échange
                              </div>
                              <button
                                onClick={() => {
                                  handleSaveMessage("contact");
                                  setIsPlusMenuOpen(false);
                                }}
                                disabled={!composerText.trim()}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-xs text-[#34D399] flex items-center gap-2 cursor-pointer disabled:opacity-40"
                              >
                                <CornerDownRight className="w-3.5 h-3.5" />
                                <span>Consigner réponse reçue</span>
                              </button>
                              <button
                                onClick={() => {
                                  setIsContextDrawerOpen(true);
                                  setIsPlusMenuOpen(false);
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-xs text-[#F5F6FA] flex items-center gap-2 cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5 text-[#38BDF8]" />
                                <span>Ajouter une note interne</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Channel Selector: LinkedIn / Email */}
                        <div className="flex items-center bg-white/5 p-0.5 rounded-xl border border-white/10 text-xs">
                          <button
                            onClick={() => setComposerChannel("linkedin")}
                            className={`px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all ${
                              composerChannel === "linkedin" ? "bg-[#38BDF8]/20 text-[#38BDF8] font-bold" : "text-[#9AA0B2]"
                            }`}
                          >
                            <Linkedin className="w-3 h-3" />
                            <span className="text-[11px]">LinkedIn</span>
                          </button>
                          <button
                            onClick={() => setComposerChannel("email")}
                            className={`px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all ${
                              composerChannel === "email" ? "bg-[#34D399]/20 text-[#34D399] font-bold" : "text-[#9AA0B2]"
                            }`}
                          >
                            <Mail className="w-3 h-3" />
                            <span className="text-[11px]">Email</span>
                          </button>
                        </div>

                        {/* Character Count */}
                        <span className={`text-[10px] font-mono hidden sm:inline ${
                          composerChannel === "linkedin" && composerText.length > 300 ? "text-amber-400 font-bold" : "text-[#9AA0B2]/60"
                        }`}>
                          {composerText.length} car.{composerChannel === "linkedin" && composerText.length > 300 ? " (>300 note)" : ""}
                        </span>
                      </div>

                      {/* Right side: Actions based on text intent */}
                      <div className="flex items-center gap-2">
                        {composerText.trim() ? (
                          detectComposerIntent(composerText).isInstruction ? (
                            /* User typed an instruction -> Primary action is AI generation */
                            <button
                              onClick={() => handleGenerateSmartReply(composerText)}
                              disabled={isGeneratingAi}
                              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#D81A45] to-[#C084FC] hover:opacity-95 text-white font-bold text-xs transition-all cursor-pointer shadow-[0_0_14px_rgba(192,132,252,0.3)] disabled:opacity-50"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Générer la réponse</span>
                            </button>
                          ) : (
                            /* User typed a direct message */
                            <>
                              <button
                                onClick={() => handleCopyMessage(composerText, "composer")}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-[#F5F6FA] border border-white/10 transition-colors cursor-pointer"
                                title="Copier le texte"
                              >
                                <Copy className="w-3 h-3 text-[#9AA0B2]" />
                                <span className="text-[11px]">Copier</span>
                              </button>

                              <button
                                onClick={() => handleSaveMessage("nathan")}
                                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#D81A45] hover:bg-[#D81A45]/90 text-white font-bold text-xs transition-all cursor-pointer shadow-[0_0_14px_rgba(216,26,69,0.3)]"
                              >
                                <CheckCheck className="w-3.5 h-3.5" />
                                <span>{composerChannel === "linkedin" ? "Marquer comme envoyé" : "Consigner"}</span>
                              </button>
                            </>
                          )
                        ) : (
                          /* Field empty -> Quick AI Reply Button */
                          <button
                            onClick={() => handleGenerateSmartReply("")}
                            disabled={isGeneratingAi}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#C084FC] border border-purple-500/25 font-semibold text-xs transition-all cursor-pointer disabled:opacity-50"
                            title="Proposer automatiquement une réponse au dernier message"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Proposer une réponse</span>
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
      {/* 5. TIROIR / DRAWER : CONTEXTE IA & ASSISTANT NACORA (Pilotage Utilisateur) */}
      {/* ========================================================================= */}
      {isAiDrawerOpen && selectedContact && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            onClick={() => setIsAiDrawerOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer container */}
          <div className="relative w-full max-w-lg bg-[#090D1A] border-l border-white/15 h-full flex flex-col shadow-2xl z-10 overflow-hidden">
            
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#D81A45]/20 to-[#C084FC]/20 border border-[#C084FC]/30 flex items-center justify-center text-[#C084FC]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#F5F6FA] font-display">
                    Assistant IA & Contexte NACORA
                  </h3>
                  <p className="text-[11px] text-[#9AA0B2]">
                    Espace de contexte et d'assistance à la demande.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAiDrawerOpen(false)}
                className="p-1.5 rounded-xl bg-white/5 text-[#9AA0B2] hover:text-white border border-white/10 cursor-pointer"
                title="Fermer le panneau"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 text-xs">
              
              {/* 1. SECTION CONVERSATION (100% Locale, Zéro IA) */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B2] flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3 text-[#C084FC]" />
                    <span>Conversation</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    selectedContact.networkingStatus ? (NETWORKING_STATUS_DETAILS[selectedContact.networkingStatus]?.badgeClass || "bg-white/5 text-[#9AA0B2] border-white/10") : "bg-white/5 text-[#9AA0B2] border-white/10"
                  }`}>
                    {selectedContact.networkingStatus ? (NETWORKING_STATUS_DETAILS[selectedContact.networkingStatus]?.label || "À contacter") : "À contacter"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-[#9AA0B2] block text-[10px]">Contact :</span>
                    <span className="text-[#F5F6FA] font-semibold truncate block">
                      {selectedContact.fullName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#9AA0B2] block text-[10px]">Canal :</span>
                    <span className="text-[#F5F6FA] font-medium flex items-center gap-1">
                      {composerChannel === "email" ? (
                        <span className="text-emerald-400 flex items-center gap-1"><Mail className="w-3 h-3" /> Email</span>
                      ) : (
                        <span className="text-[#38BDF8] flex items-center gap-1"><Linkedin className="w-3 h-3" /> LinkedIn</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Dernier message réel */}
                <div className="pt-2 border-t border-white/5 space-y-1">
                  <span className="text-[10px] text-[#9AA0B2] uppercase font-bold block">
                    Dernier message :
                  </span>
                  {currentMessages.length > 0 ? (
                    (() => {
                      const lastMsg = currentMessages[currentMessages.length - 1];
                      const isContact = lastMsg.sender === "contact";
                      return (
                        <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-[#9AA0B2]">
                            <span className="font-semibold text-[#F5F6FA]">
                              {isContact ? selectedContact.fullName : "Vous (Nathan)"}
                            </span>
                            <span className="font-mono">{formatShortDate(lastMsg.timestamp)}</span>
                          </div>
                          <p className="text-[11px] text-[#F5F6FA]/90 line-clamp-3 leading-relaxed">
                            {lastMsg.text}
                          </p>
                        </div>
                      );
                    })()
                  ) : (
                    <p className="text-[11px] text-[#9AA0B2] italic">
                      Aucun message consigné pour le moment.
                    </p>
                  )}
                </div>
              </div>

              {/* 2. SECTION CONTEXTE CONNU (Strictement factuel & anti-invention) */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B2] flex items-center gap-1.5">
                    <Building2 className="w-3 h-3 text-[#38BDF8]" />
                    <span>Contexte connu</span>
                  </span>
                  <span className="text-[10px] text-[#9AA0B2]/60">Données vérifiées</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-xl bg-black/20 border border-white/5">
                    <span className="text-[#9AA0B2] block text-[10px]">Entreprise :</span>
                    <span className="text-[#F5F6FA] font-medium truncate block">
                      {selectedContact.companyName || "Non renseigné"}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-black/20 border border-white/5">
                    <span className="text-[#9AA0B2] block text-[10px]">Poste :</span>
                    <span className="text-[#F5F6FA] font-medium truncate block">
                      {selectedContact.jobTitle || "Non renseigné"}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-black/20 border border-white/5">
                    <span className="text-[#9AA0B2] block text-[10px]">Relation / Origine :</span>
                    <span className="text-[#F5F6FA] font-medium truncate block">
                      {selectedContact.connectionPoints?.[0] || (selectedContact.notes ? selectedContact.notes.split('\n')[0] : "Non renseigné")}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-black/20 border border-white/5">
                    <span className="text-[#9AA0B2] block text-[10px]">École / Formation :</span>
                    <span className="text-[#F5F6FA] font-medium truncate block">
                      {selectedContact.academicPath || "Non renseigné"}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-[#9AA0B2]/60 pt-1">
                  💡 Seules les informations réellement enregistrées sont affichées — aucune supposition automatique.
                </p>
              </div>

              {/* 3. SECTION OBJECTIF DE L'ÉCHANGE (L'utilisateur pilote) */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B2] flex items-center gap-1.5">
                    <Flame className="w-3 h-3 text-[#FF6685]" />
                    <span>Objectif de l'échange</span>
                  </span>
                  <span className="text-[10px] font-bold text-[#FF6685]">{selectedExchangeGoal}</span>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    "À définir",
                    "Répondre simplement",
                    "Continuer la conversation",
                    "Demander un conseil",
                    "Demander une mise en relation",
                    "Explorer une opportunité",
                    "Préparer un échange"
                  ].map((goal) => (
                    <button
                      key={goal}
                      onClick={() => setSelectedExchangeGoal(goal)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer border ${
                        selectedExchangeGoal === goal
                          ? "bg-[#D81A45]/20 text-white border-[#FF6685]/50 font-bold shadow-sm"
                          : "bg-white/5 text-[#9AA0B2] border-white/10 hover:text-[#F5F6FA] hover:bg-white/10"
                      }`}
                    >
                      {goal}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. SECTION QUE VEUX-TU FAIRE ? (Actions possibles & Templates) */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B2] block">
                  Que veux-tu faire ?
                </span>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Répondre au message", icon: "💬", prompt: "Réponds au dernier message de manière fluide et naturelle" },
                    { label: "Continuer l'échange", icon: "🔄", prompt: "Poursuis la discussion sur un ton convivial" },
                    { label: "Demander un conseil", icon: "💡", prompt: "Demande-lui un conseil bienveillant sur son domaine" },
                    { label: "Explorer une piste", icon: "🤝", prompt: "Oriente délicatement la discussion vers les opportunités de son équipe" }
                  ].map((act) => (
                    <button
                      key={act.label}
                      onClick={() => {
                        setSelectedActionType(act.label);
                        setAiCustomInstructions(act.prompt);
                      }}
                      className={`p-2 rounded-xl text-left transition-all border cursor-pointer flex items-center gap-2 ${
                        selectedActionType === act.label
                          ? "bg-purple-500/20 text-white border-purple-500/40 font-bold"
                          : "bg-white/5 text-[#9AA0B2] border-white/10 hover:bg-white/10 hover:text-[#F5F6FA]"
                      }`}
                    >
                      <span className="text-sm">{act.icon}</span>
                      <span className="text-[11px]">{act.label}</span>
                    </button>
                  ))}
                </div>

                {/* Templates optionnels */}
                <div className="pt-2 border-t border-white/5 space-y-1.5">
                  <span className="text-[10px] text-[#9AA0B2] uppercase font-bold block">
                    Angle ou Template (optionnel) :
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: "free", label: "Réponse libre / Naturelle" },
                      { id: "point_commun", label: "Point commun vérifié" },
                      { id: "opportunite", label: "Opportunité" },
                      { id: "alumni", label: "Alumni / Recommandation" },
                      { id: "custom", label: "Très personnalisée" }
                    ].map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => setSelectedTemplate(tpl.id)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] transition-all border cursor-pointer ${
                          selectedTemplate === tpl.id
                            ? "bg-[#C084FC]/20 text-purple-200 border-[#C084FC]/40 font-bold"
                            : "bg-white/5 text-[#9AA0B2] border-white/10 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>

                  {/* Warning if point commun selected but not verified */}
                  {selectedTemplate === "point_commun" && (!selectedContact.connectionPoints || selectedContact.connectionPoints.length === 0) && (
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 flex items-start gap-1.5">
                      <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                      <span>Aucun point commun vérifié n'est renseigné sur cette fiche. L'IA n'en inventera aucun.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 5. SECTION ASSISTANT IA (Déclenchement Explicite Uniquement) */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/25 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#F5F6FA] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#C084FC]" />
                    <span>Que veux-tu que NACORA fasse ?</span>
                  </span>
                </div>

                <div className="space-y-2">
                  <textarea
                    rows={2}
                    value={aiCustomInstructions}
                    onChange={(e) => setAiCustomInstructions(e.target.value)}
                    placeholder="Ex : réponds à son dernier message, sois naturel, dis que je suis dispo mardi, pas de demande d'appel..."
                    className="w-full bg-black/40 rounded-xl p-2.5 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/50 border border-white/10 focus:border-[#C084FC]/50 focus:outline-none resize-none leading-relaxed"
                  />

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    {/* Bouton Analyser la conversation (Optionnel) */}
                    <button
                      onClick={handleRunExplicitAnalysis}
                      disabled={isAnalyzingConvo}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#9AA0B2] hover:text-white border border-white/10 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                      title="Analyser les points clés de la conversation sans générer de message"
                    >
                      {isAnalyzingConvo ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Search className="w-3.5 h-3.5 text-[#38BDF8]" />
                      )}
                      <span>Analyser l'échange</span>
                    </button>

                    {/* Bouton Principal Générer la proposition */}
                    <button
                      onClick={() => handleGenerateAiProposal()}
                      disabled={isGeneratingAi}
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#D81A45] to-[#C084FC] hover:opacity-95 text-white text-xs font-bold shadow-[0_0_16px_rgba(192,132,252,0.3)] flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                    >
                      {isGeneratingAi ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Génération...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Générer la réponse</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Résumé d'analyse si demandé */}
                {analysisSummary && (
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-[11px] text-[#9AA0B2] space-y-1">
                    <span className="text-[#38BDF8] font-bold block">💡 Synthèse factuelle de l'échange :</span>
                    <p className="text-[#F5F6FA]/90 leading-relaxed">{analysisSummary}</p>
                  </div>
                )}
              </div>

              {/* 6. SECTION RÉSULTAT / BROUILLON GÉNÉRÉ */}
              {aiGeneratedDraft && (
                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-purple-500/30 space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#F5F6FA] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#C084FC]" />
                      <span>Brouillon proposé</span>
                    </span>
                    <span className="text-[10px] font-mono text-[#9AA0B2]">
                      Canal : {composerChannel === "email" ? "Email" : "LinkedIn"}
                    </span>
                  </div>

                  <textarea
                    rows={4}
                    value={aiGeneratedDraft}
                    onChange={(e) => setAiGeneratedDraft(e.target.value)}
                    className="w-full bg-black/30 rounded-xl p-2.5 text-xs text-[#F5F6FA] border border-white/10 focus:border-[#C084FC]/50 focus:outline-none resize-none leading-relaxed font-sans"
                  />

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                    <button
                      onClick={() => handleCopyMessage(aiGeneratedDraft, "ai_drawer")}
                      className="flex items-center gap-1 text-[11px] text-[#9AA0B2] hover:text-white cursor-pointer px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copier</span>
                    </button>

                    <button
                      onClick={handleInsertDraftIntoComposer}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#D81A45] to-[#C084FC] text-white text-xs font-bold shadow-md cursor-pointer hover:opacity-95 transition-opacity"
                    >
                      <CornerDownRight className="w-3.5 h-3.5" />
                      <span>Insérer dans le composer</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TIROIR / DRAWER : COORDONNÉES DÉTAILLÉES                                */}
      {/* ========================================================================= */}
      {isContextDrawerOpen && selectedContact && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            onClick={() => setIsContextDrawerOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          />

          <div className="relative w-full max-w-md bg-[#090D1A] border-l border-white/15 h-full flex flex-col shadow-2xl z-10 overflow-hidden">
            
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <Info className="w-4 h-4 text-[#C084FC]" />
                <h3 className="text-sm font-bold text-[#F5F6FA] font-display">
                  Contexte & Informations
                </h3>
              </div>
              <button
                onClick={() => setIsContextDrawerOpen(false)}
                className="p-1.5 rounded-xl bg-white/5 text-[#9AA0B2] hover:text-white border border-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
              
              {/* Coordonnées */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B2] block">
                  Coordonnées
                </span>
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                  {selectedContact.email ? (
                    <div className="flex items-center gap-2 text-[#F5F6FA]">
                      <Mail className="w-3.5 h-3.5 text-[#34D399] shrink-0" />
                      <span className="truncate">{selectedContact.email}</span>
                    </div>
                  ) : null}

                  {selectedContact.phone ? (
                    <div className="flex items-center gap-2 text-[#F5F6FA]">
                      <Phone className="w-3.5 h-3.5 text-[#FBBF24] shrink-0" />
                      <span>{selectedContact.phone}</span>
                    </div>
                  ) : null}

                  {selectedContact.location ? (
                    <div className="flex items-center gap-2 text-[#9AA0B2]">
                      <Building2 className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
                      <span>{selectedContact.location}</span>
                    </div>
                  ) : null}

                  {!selectedContact.email && !selectedContact.phone && !selectedContact.location && (
                    <p className="text-[11px] text-[#9AA0B2]/60 italic">
                      Coordonnées directes non renseignées. Contact via LinkedIn.
                    </p>
                  )}
                </div>
              </div>

              {/* Points d'accroche */}
              {selectedContact.connectionPoints && selectedContact.connectionPoints.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B2] block">
                    Points d'accroche identifiés
                  </span>
                  <div className="space-y-1.5">
                    {selectedContact.connectionPoints.map((pt, i) => (
                      <div key={i} className="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-[#F5F6FA] flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF6685] shrink-0 mt-1" />
                        <span>{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cycle de relance */}
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B2] block">
                  Cycle de relance
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-[#9AA0B2]">Étape actuelle :</span>
                  <span className="font-bold text-[#FF6685]">
                    {selectedContact.followUpStage === 0 ? "Prise de contact" : `Relance ${selectedContact.followUpStage}`}
                  </span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#D81A45] h-full transition-all"
                    style={{ width: `${Math.min(100, ((selectedContact.followUpStage || 0) + 1) * 25)}%` }}
                  />
                </div>
              </div>

              {/* Notes internes avec ajout rapide */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B2] block">
                  Notes internes
                </span>

                {/* Quick Add Note */}
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={quickNoteText}
                    onChange={(e) => setQuickNoteText(e.target.value)}
                    placeholder="Ajouter une note rapide..."
                    className="flex-1 glass-input px-2.5 py-1.5 text-xs text-[#F5F6FA] rounded-xl"
                  />
                  <button
                    onClick={handleAddQuickNote}
                    disabled={!quickNoteText.trim()}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs cursor-pointer disabled:opacity-40 shrink-0"
                  >
                    Ajouter
                  </button>
                </div>

                {selectedContact.notes ? (
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-[#9AA0B2] whitespace-pre-line leading-relaxed max-h-40 overflow-y-auto">
                    {selectedContact.notes}
                  </div>
                ) : (
                  <p className="text-[11px] text-[#9AA0B2]/60 italic">Aucune note pour le moment.</p>
                )}
              </div>

              {/* Bouton fiche complète */}
              <div className="pt-2">
                <GlassButton
                  variant="secondary"
                  size="sm"
                  className="w-full justify-center"
                  onClick={() => {
                    setIsContextDrawerOpen(false);
                    setIsDetailModalOpen(true);
                  }}
                  icon={<ExternalLink className="w-3.5 h-3.5" />}
                >
                  Ouvrir la fiche contact complète
                </GlassButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL : NOUVELLE CONVERSATION / SÉLECTIONNER UN CONTACT                  */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isNewConvoModalOpen}
        onClose={() => setIsNewConvoModalOpen(false)}
        title="Démarrer une conversation"
        size="md"
      >
        <div className="space-y-3">
          <p className="text-xs text-[#9AA0B2]">
            Sélectionnez une relation dans votre répertoire pour ouvrir son fil de discussion.
          </p>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9AA0B2]" />
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
              .map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedContactId(c.id);
                    setIsNewConvoModalOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-2.5 hover:bg-white/5 rounded-xl transition-colors text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr border flex items-center justify-center font-bold text-xs shrink-0 ${getAvatarGradient(c.fullName)}`}>
                      {getInitials(c.fullName)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#F5F6FA] truncate group-hover:text-white">
                        {c.fullName}
                      </div>
                      <div className="text-[11px] text-[#9AA0B2] truncate">
                        {c.jobTitle} · {c.companyName}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#9AA0B2] shrink-0 font-mono">
                    {c.networkingStatus}
                  </span>
                </button>
              ))}
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsNewConvoModalOpen(false);
                if (onNavigateToContacts) onNavigateToContacts();
              }}
            >
              Gérer tous mes contacts
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

      {/* ========================================================================= */}
      {/* 8. MODAL : FICHE CONTACT COMPLÈTE (ContactDetailWorkspace)                 */}
      {/* ========================================================================= */}
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

      {/* ========================================================================= */}
      {/* 9. MODAL : IMPORTATION & RECONSTRUCTION IA DE CONVERSATIONS                */}
      {/* ========================================================================= */}
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

      {/* ========================================================================= */}
      {/* 10. MODAL : SUPPRESSION DE CONVERSATION (Liquid Glass)                     */}
      {/* ========================================================================= */}
      {conversationToDelete && (
        <Modal
          isOpen={!!conversationToDelete}
          onClose={() => setConversationToDelete(null)}
          title=""
          size="md"
        >
          <div className="space-y-5 -m-2 sm:-m-4 p-4 text-[#F5F6FA]">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/25 text-[#FF6685] shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white font-display">
                  Supprimer la conversation
                </h3>
                <p className="text-xs text-[#9AA0B2] leading-relaxed">
                  Que souhaitez-vous faire avec l'échange lié à <strong className="text-white">{conversationToDelete.fullName}</strong> ?
                </p>
              </div>
            </div>

            {/* Options de suppression */}
            <div className="space-y-2.5">
              <div
                onClick={() => setDeleteMode("messages_only")}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  deleteMode === "messages_only"
                    ? "bg-white/[0.08] border-[#FF6685]/50 shadow-[0_0_16px_rgba(216,26,69,0.15)]"
                    : "bg-white/[0.02] hover:bg-white/[0.05] border-white/10"
                }`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                  deleteMode === "messages_only" ? "border-[#FF6685] bg-[#D81A45]" : "border-white/30"
                }`}>
                  {deleteMode === "messages_only" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">
                    Vider les messages uniquement
                  </div>
                  <div className="text-[11px] text-[#9AA0B2] mt-0.5 leading-relaxed">
                    Conserve la fiche contact dans votre carnet d'adresses NACORA, mais efface l'ensemble des messages et réinitialise l'historique de conversation.
                  </div>
                </div>
              </div>

              <div
                onClick={() => setDeleteMode("full_contact")}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  deleteMode === "full_contact"
                    ? "bg-red-500/10 border-red-500/50 shadow-[0_0_16px_rgba(216,26,69,0.2)]"
                    : "bg-white/[0.02] hover:bg-white/[0.05] border-white/10"
                }`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                  deleteMode === "full_contact" ? "border-[#FF6685] bg-[#D81A45]" : "border-white/30"
                }`}>
                  {deleteMode === "full_contact" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-[#FF6685]">
                    Supprimer définitivement le contact et ses messages
                  </div>
                  <div className="text-[11px] text-[#9AA0B2] mt-0.5 leading-relaxed">
                    Supprime intégralement la fiche contact, l'historique et tous les échanges associés de votre CRM. Idéal pour nettoyer les faux contacts ou imports indésirables.
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setConversationToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#9AA0B2] hover:text-white hover:bg-white/5 border border-transparent transition-all cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteConversation}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#D81A45] hover:bg-[#B01336] text-white shadow-[0_0_20px_rgba(216,26,69,0.35)] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmer la suppression</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
