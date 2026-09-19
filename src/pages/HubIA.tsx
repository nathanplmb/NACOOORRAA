import React, { useState, useEffect, useRef } from "react";
import { dbStore } from "../dbStore";
import { CandidateProfile, ChatSession, Opportunity, Contact, DocumentFile, CalendarEvent } from "../types";
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
  Bot
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

export const HubIA: React.FC<HubIAProps> = ({ showToast, initialPersona }) => {
  const [profile, setProfile] = useState<CandidateProfile>(dbStore.getProfile());
  const [opportunities, setOpportunities] = useState<Opportunity[]>(dbStore.getOpportunities());
  const [contacts, setContacts] = useState<Contact[]>(dbStore.getContacts());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(dbStore.getCalendarEvents());
  const [documents, setDocuments] = useState<DocumentFile[]>(dbStore.getDocuments());
  const [sessions, setSessions] = useState<ChatSession[]>(dbStore.getChatSessions());

  const [activePersonaId, setActivePersonaId] = useState<string>(initialPersona || "general");
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [activeFocus, setActiveFocus] = useState<ActiveFocusItem | null>(null);
  
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [showMobileContextDrawer, setShowMobileContextDrawer] = useState(false);
  const [showFocusPicker, setShowFocusPicker] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // List of specialists as defined in directives
  const specialists = [
    {
      id: "general",
      name: "Conseiller Carrière",
      role: "Orientation & Stratégie",
      desc: "Structure ta recherche et affine ta stratégie professionnelle",
      icon: Compass,
      placeholder: "Ex: Comment analyser l'adéquation entre mon profil et mes offres ?"
    },
    {
      id: "interview",
      name: "Coach Entretien",
      role: "Simulation & Méthode STAR",
      desc: "Simule des entretiens et analyse tes réponses",
      icon: UserCheck,
      placeholder: "Ex: Entraîne-moi pour un entretien de 15 min en Banque Privée..."
    },
    {
      id: "cv_letter",
      name: "Expert CV & Lettres",
      role: "ATS & Verbes d'Action",
      desc: "Optimise tes candidatures et tes documents",
      icon: FileText,
      placeholder: "Ex: Rédige une accroche sur-mesure pour ma candidature chez LCL..."
    },
    {
      id: "networking",
      name: "Stratège Réseau",
      role: "LinkedIn & Alumni",
      desc: "Identifie les bonnes personnes et prépare tes prises de contact",
      icon: Users,
      placeholder: "Ex: Rédige un message LinkedIn pour contacter un Alumni UCA chez Crédit Agricole..."
    },
    {
      id: "negotiation",
      name: "Négociation Salaire",
      role: "Grilles & Argumentaire",
      desc: "Prépare tes arguments et tes marges de négociation",
      icon: TrendingUp,
      placeholder: "Ex: Comment négocier la gratification et les primes de mon contrat d'alternance ?"
    }
  ];

  // Selected specialist metadata
  const currentSpecialist = specialists.find(s => s.id === activePersonaId) || specialists[0];

  // Data reload subscription
  useEffect(() => {
    const refreshData = () => {
      setProfile(dbStore.getProfile());
      setOpportunities(dbStore.getOpportunities());
      setContacts(dbStore.getContacts());
      setCalendarEvents(dbStore.getCalendarEvents());
      setDocuments(dbStore.getDocuments());
      
      const currentSessions = dbStore.getChatSessions();
      setSessions(currentSessions);

      // Auto-select session for the active persona if none selected
      if (currentSessions.length > 0) {
        const matchingSess = currentSessions.find(s => s.personaId === activePersonaId);
        if (matchingSess) {
          setActiveSessionId(matchingSess.id);
        } else {
          setActiveSessionId(currentSessions[0].id);
        }
      }
    };

    refreshData();
    const unsub = dbStore.subscribe(refreshData);
    return unsub;
  }, [activePersonaId]);

  // Set default active focus from top opportunity if available
  useEffect(() => {
    if (!activeFocus && opportunities.length > 0) {
      const topOpp = opportunities[0];
      setActiveFocus({
        id: topOpp.id,
        type: "opportunity",
        title: `${topOpp.title} — ${topOpp.companyName}`,
        subtitle: `${topOpp.contractType || "Alternance"} • ${topOpp.location || "France"} • ${topOpp.salary || "Barème conventionnel"}`,
        detail: `Statut: ${topOpp.status}. Missions principales: ${(topOpp.extractedInfo?.missions || []).slice(0, 2).join(", ") || "Support gestion"}`
      });
    }
  }, [opportunities]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, activeSessionId, isLoading]);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  // Switch active specialist persona
  const handleSelectSpecialist = (personaId: string) => {
    setActivePersonaId(personaId);
    
    // Check if session exists for this persona
    const existing = sessions.find(s => s.personaId === personaId);
    if (existing) {
      setActiveSessionId(existing.id);
    } else {
      // Create a fresh session for this specialist
      handleCreateSession(personaId);
    }
  };

  // Create a new session for a specialist
  const handleCreateSession = (personaId: string = activePersonaId) => {
    const spec = specialists.find(s => s.id === personaId) || currentSpecialist;
    const title = `${spec.name} — ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`;
    const newSess = dbStore.addChatSession(personaId, title);

    const userName = profile.fullName ? profile.fullName.split(" ")[0] : "Candidat";
    let initialGreeting = "";

    if (personaId === "general") {
      initialGreeting = `Bonjour ${userName}. Je suis ton **Conseiller Carrière NACORA**.\n\nEnsemble, nous allons structurer tes candidatures, analyser l'adéquation de ton profil avec tes offres cibles (${profile.currentAlternance || "Finance / Banque"}) et bâtir une stratégie d'accélération sur-mesure. Par quel sujet souhaites-tu commencer ?\n\n[ACTIONS: "Analyser mes opportunités" | "Évaluer mon profil candidat" | "Définir mon plan d'action"]`;
    } else if (personaId === "interview") {
      initialGreeting = `Prêt pour l'entraînement, ${userName} ? Je suis ton **Coach Entretien**.\n\nNous allons simuler des questions comportementales et techniques en utilisant la méthode **STAR** (Situation, Tâche, Action, Résultat). Indique-moi l'offre ou l'entreprise ciblée, et je te poserai la première question de mise en situation.\n\n[ACTIONS: "Lancer une simulation STAR" | "Questions pièges RH" | "Présentation de 2 minutes"]`;
    } else if (personaId === "cv_letter") {
      initialGreeting = `Bonjour ${userName}. En tant qu'**Expert CV & Lettres**, je t'aide à optimiser la lisibilité ATS de ton CV, enrichir tes verbes d'action et rédiger des accroches percutantes pour tes candidatures.\n\nTransmets-moi ton texte ou demande-moi d'adapter ta lettre pour une offre précise.\n\n[ACTIONS: "Optimiser les verbes d'action" | "Rédiger une lettre sur-mesure" | "Analyse des mots-clés ATS"]`;
    } else if (personaId === "networking") {
      initialGreeting = `Ravi de t'accompagner ${userName}. Je suis ton **Stratège Réseau**.\n\nNous allons identifier les Alumni et recruteurs stratégiques dans tes entreprises cibles, puis rédiger des messages d'approche LinkedIn personnalisés et à fort taux de réponse.\n\n[ACTIONS: "Message d'approche Alumni" | "Identifier les recruteurs clés" | "Message de relance bienveillant"]`;
    } else if (personaId === "negotiation") {
      initialGreeting = `Bonjour ${userName}. Je suis l'**Expert Négociation Salariale** de NACORA.\n\nNous allons évaluer ton package global (fixe, primes, gratification conventionnelle, avantages) et préparer les meilleurs arguments chiffrés pour aborder la rémunération sereinement.\n\n[ACTIONS: "Évaluer mon offre actuelle" | "Arguments de rémunération" | "Simuler l'échange de négociation"]`;
    }

    dbStore.addMessageToSession(newSess.id, "model", initialGreeting);
    setActiveSessionId(newSess.id);
    showToast(`Session initialisée : ${spec.name}`, "info");
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

  // Build context summary payload for Gemini API
  const buildContextSummary = () => {
    const alumniCount = contacts.filter(c => c.category === "alumni" || (c.connectionPoints || []).some(p => p.toLowerCase().includes("alumni"))).length;
    const recruiterCount = contacts.filter(c => c.category === "recruiter").length;

    return {
      opportunitiesCount: opportunities.length,
      contactsCount: contacts.length,
      companiesCount: dbStore.getCompanies().length,
      calendarEventsCount: calendarEvents.length,
      documentsCount: documents.length,
      alumniCount,
      recruiterCount,
      opportunities: opportunities.slice(0, 8).map(o => ({
        title: o.title,
        company: o.companyName,
        status: o.status,
        location: o.location,
        salary: o.salary,
        keyMissions: (o.extractedInfo?.missions || []).slice(0, 3)
      })),
      contacts: contacts.slice(0, 10).map(c => ({
        name: c.fullName,
        job: c.jobTitle,
        company: c.companyName,
        category: c.category,
        connectionPoints: c.connectionPoints
      })),
      calendarEvents: calendarEvents.slice(0, 5).map(e => ({
        title: e.title,
        date: e.date,
        type: e.type
      })),
      documents: documents.slice(0, 5).map(d => ({
        title: d.title,
        type: d.type
      }))
    };
  };

  // Handle message submission
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    // Ensure session exists
    let targetSessionId = activeSessionId;
    if (!targetSessionId) {
      const title = `${currentSpecialist.name} — ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`;
      const newSess = dbStore.addChatSession(activePersonaId, title);
      targetSessionId = newSess.id;
      setActiveSessionId(targetSessionId);
    }

    setInputMessage("");
    setIsLoading(true);

    // Add user message
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
            contextSummary: buildContextSummary()
          }
        })
      });

      if (!response.ok) throw new Error("API communication error");
      const data = await response.json();

      dbStore.addMessageToSession(targetSessionId, "model", data.response || "Moteur d'intelligence prêt.");
    } catch (err) {
      console.error(err);
      dbStore.addMessageToSession(
        targetSessionId,
        "model",
        "Désolé, une interruption temporaire s'est produite lors de la génération. Tes données de contexte NACORA restent sauvegardées."
      );
      showToast("Erreur de connexion avec l'assistant", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Copy text helper
  const handleCopyText = (id: string, text: string) => {
    const cleanText = text.replace(/\[ACTIONS:.*?\]/gs, "").trim();
    navigator.clipboard.writeText(cleanText);
    setCopiedMsgId(id);
    showToast("Message copié dans le presse-papier", "info");
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // Format assistant response text nicely
  const renderFormattedText = (text: string) => {
    const textWithoutActions = text.replace(/\[ACTIONS:.*?\]/gs, "").trim();

    return textWithoutActions.split("\n\n").map((paragraph, pIdx) => (
      <p key={pIdx} className="mb-2.5 last:mb-0 leading-relaxed">
        {paragraph.split("\n").map((line, lIdx) => {
          if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
            const content = line.trim().substring(2);
            return (
              <span key={lIdx} className="flex items-start gap-2 my-1 pl-1">
                <span className="text-[#FF6685] font-bold mt-0.5">•</span>
                <span>{formatBoldText(content)}</span>
              </span>
            );
          }
          return (
            <React.Fragment key={lIdx}>
              {lIdx > 0 && <br />}
              {formatBoldText(line)}
            </React.Fragment>
          );
        })}
      </p>
    ));
  };

  const formatBoldText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-semibold text-[#F5F6FA]">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  // Extract action chips from assistant response
  const extractActionChips = (text: string): string[] => {
    const match = text.match(/\[ACTIONS:\s*([^\]]+)\]/);
    if (!match) return [];
    const raw = match[1];
    return raw
      .split("|")
      .map(s => s.replace(/["']/g, "").trim())
      .filter(Boolean);
  };

  // Calculations for Context used
  const activeOppsCount = opportunities.filter(o => o.status === "to_prepare" || o.status === "to_study" || o.status === "to_apply").length;
  const alumniCount = contacts.filter(c => c.category === "alumni" || (c.connectionPoints || []).some(p => p.toLowerCase().includes("alumni"))).length;
  const recruiterCount = contacts.filter(c => c.category === "recruiter").length;

  return (
    <div className="relative z-10 w-full min-h-[calc(100vh-140px)] flex flex-col gap-4 pb-6">
      
      {/* Mobile top action bar to open context drawer */}
      <div className="xl:hidden flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#F5F6FA]">
          <Sparkles className="w-4 h-4 text-[#C084FC]" />
          <span>Hub IA NACORA • {currentSpecialist.name}</span>
        </div>
        <button
          onClick={() => setShowMobileContextDrawer(!showMobileContextDrawer)}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[#FF6685] hover:bg-white/10 transition-colors"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Contexte actif ({opportunities.length} opp.)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 xl:grid-cols-12 gap-5 flex-1 items-stretch">
        
        {/* ========================================== */}
        {/* ZONE A : NAVIGATION DES SPÉCIALISTES (3 COLS) */}
        {/* ========================================== */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4">
          
          {/* Specialists List */}
          <div className="glass-panel p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#9AA0B2] flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#C084FC]" />
                Spécialistes IA
              </h2>
              <span className="text-[10px] text-[#FF6685] font-semibold bg-[rgba(216,26,69,0.12)] px-2 py-0.5 rounded-full border border-[rgba(216,26,69,0.25)]">
                5 experts
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {specialists.map(spec => {
                const IconComponent = spec.icon;
                const isActive = spec.id === activePersonaId;
                return (
                  <button
                    key={spec.id}
                    onClick={() => handleSelectSpecialist(spec.id)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all duration-200 flex items-start gap-3 cursor-pointer group ${
                      isActive
                        ? "bg-[rgba(216,26,69,0.12)] border-[rgba(216,26,69,0.35)] shadow-[0_0_20px_rgba(216,26,69,0.15)]"
                        : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20"
                    }`}
                  >
                    <div className={`p-2 rounded-xl border shrink-0 transition-colors ${
                      isActive 
                        ? "bg-[#D81A45] border-[#FF6685] text-white shadow-[0_0_12px_rgba(216,26,69,0.4)]" 
                        : "bg-white/5 border-white/10 text-[#9AA0B2] group-hover:text-[#F5F6FA]"
                    }`}>
                      <IconComponent className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold transition-colors ${isActive ? "text-[#FF6685]" : "text-[#F5F6FA] group-hover:text-[#FF6685]"}`}>
                          {spec.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#9AA0B2] leading-tight mt-1 line-clamp-2">
                        « {spec.desc} »
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sessions History (Collapsible & Masked by Default) */}
          {!showHistory ? (
            <div className="glass-panel p-3.5">
              <button
                onClick={() => setShowHistory(true)}
                className="w-full flex items-center justify-between text-xs font-semibold text-[#9AA0B2] hover:text-[#F5F6FA] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-[#FF6685]" />
                  <span>Historique des discussions ({sessions.length})</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-[#FF6685] font-semibold bg-[rgba(216,26,69,0.1)] group-hover:bg-[rgba(216,26,69,0.2)] px-2.5 py-1 rounded-xl border border-[rgba(216,26,69,0.25)] transition-all">
                  <span>Afficher</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>
          ) : (
            <div className="glass-panel p-4 flex-1 flex flex-col min-h-[220px]">
              <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-xs font-bold uppercase tracking-wider text-[#9AA0B2] hover:text-[#F5F6FA] flex items-center gap-2 cursor-pointer"
                >
                  <History className="w-3.5 h-3.5 text-[#FF6685]" />
                  <span>Historique ({sessions.length})</span>
                  <ChevronUp className="w-3.5 h-3.5 text-[#FF6685]" />
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCreateSession(activePersonaId)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#FF6685] transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                    title="Nouvelle conversation"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nouveau</span>
                  </button>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="text-[11px] text-[#9AA0B2] hover:text-[#F5F6FA] transition-colors cursor-pointer px-1.5 py-0.5 rounded-md hover:bg-white/5"
                  >
                    Masquer
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[240px] pr-1">
                {sessions.length === 0 ? (
                  <div className="h-20 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl text-[11px] text-[#9AA0B2] gap-1 p-2 text-center">
                    <span>Aucun échange archivé</span>
                    <button onClick={() => handleCreateSession()} className="text-[#FF6685] hover:underline font-semibold cursor-pointer">
                      Démarrer une session
                    </button>
                  </div>
                ) : (
                  sessions.map(sess => {
                    const isSessActive = sess.id === activeSessionId;
                    const spec = specialists.find(s => s.id === sess.personaId);
                    return (
                      <div
                        key={sess.id}
                        onClick={() => {
                          setActiveSessionId(sess.id);
                          if (sess.personaId) setActivePersonaId(sess.personaId);
                        }}
                        className={`w-full p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer ${
                          isSessActive
                            ? "bg-[rgba(216,26,69,0.15)] border-[rgba(216,26,69,0.3)] shadow-[0_0_12px_rgba(216,26,69,0.15)]"
                            : "bg-white/[0.02] border-white/5 hover:bg-white/[0.06]"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className={`text-xs font-bold truncate ${isSessActive ? "text-[#FF6685]" : "text-[#F5F6FA]"}`}>
                            {sess.title}
                          </div>
                          <div className="text-[10px] text-[#9AA0B2] mt-0.5 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FF6685]" />
                            <span>{spec?.name || sess.personaName}</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDeleteSession(sess.id, e)}
                          className="p-1 rounded-lg hover:bg-white/10 text-[#9AA0B2] hover:text-[#F04438] transition-colors cursor-pointer shrink-0"
                          title="Supprimer la session"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* ========================================== */}
        {/* ZONE B : ESPACE DE CONVERSATION (6 COLS) */}
        {/* ========================================== */}
        <div className="lg:col-span-8 xl:col-span-6 flex flex-col glass-panel overflow-hidden border border-white/10 shadow-2xl relative min-h-[580px]">
          
          {/* Header Minimal */}
          <div className="p-4 bg-white/[0.02] border-b border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[rgba(216,26,69,0.12)] border border-[rgba(216,26,69,0.3)] flex items-center justify-center text-[#FF6685] shadow-[0_0_15px_rgba(216,26,69,0.2)]">
                <currentSpecialist.icon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#F5F6FA] flex items-center gap-2">
                  <span>{currentSpecialist.name}</span>
                </h2>
                <p className="text-[11px] text-[#9AA0B2]">
                  Ton assistant carrière NACORA
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  showHistory
                    ? "bg-[rgba(216,26,69,0.14)] border-[rgba(216,26,69,0.35)] text-[#FF6685]"
                    : "bg-white/5 border-white/10 text-[#9AA0B2] hover:text-[#F5F6FA] hover:bg-white/10"
                }`}
                title="Afficher ou masquer l'historique"
              >
                <History className="w-3.5 h-3.5 text-[#FF6685]" />
                <span className="hidden sm:inline">{showHistory ? "Masquer l'historique" : `Historique (${sessions.length})`}</span>
              </button>

              <button
                onClick={() => handleCreateSession(activePersonaId)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#F5F6FA] hover:text-[#FF6685] transition-colors text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                title="Démarrer une nouvelle conversation"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Nouveau chat</span>
              </button>
            </div>
          </div>

          {/* Active Context Bar Indicator */}
          {activeFocus && (
            <div className="px-4 py-2 bg-[rgba(216,26,69,0.06)] border-b border-[rgba(216,26,69,0.15)] flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2 text-[#FF6685] font-medium truncate">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[#9AA0B2]">Sujet actif :</span>
                <span className="font-semibold text-[#F5F6FA] truncate">{activeFocus.title}</span>
              </div>
              <button
                onClick={() => setActiveFocus(null)}
                className="text-[10px] text-[#9AA0B2] hover:text-[#F04438] transition-colors underline cursor-pointer shrink-0 ml-2"
              >
                Désactiver
              </button>
            </div>
          )}

          {/* Message Thread Area */}
          <div className="flex-1 p-4 lg:p-5 overflow-y-auto space-y-4 bg-black/20 min-h-[380px] max-h-[560px]">
            {!activeSession || activeSession.messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 my-auto">
                <div className="w-14 h-14 rounded-3xl bg-[rgba(216,26,69,0.12)] border border-[rgba(216,26,69,0.3)] flex items-center justify-center text-[#FF6685] shadow-[0_0_30px_rgba(216,26,69,0.25)]">
                  <currentSpecialist.icon className="w-7 h-7" />
                </div>
                <div className="max-w-md space-y-1.5">
                  <h3 className="text-sm font-bold text-[#F5F6FA]">
                    {currentSpecialist.name} est à ton écoute
                  </h3>
                  <p className="text-xs text-[#9AA0B2]">
                    {currentSpecialist.desc}. Pose ta question ou choisis l'une des suggestions ci-dessous.
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-2 max-w-lg pt-2">
                  {currentSpecialist.id === "general" && (
                    <>
                      <button onClick={() => handleSendMessage("Analyser mes opportunités bancaires en cours")} className="glass-pill text-xs py-1.5 px-3 bg-white/5 border-white/10 hover:border-[#FF6685]/40 text-[#F5F6FA] hover:text-[#FF6685] cursor-pointer">
                        🎯 Analyser mes opportunités
                      </button>
                      <button onClick={() => handleSendMessage("Quels sont mes points forts pour les Masters Finance ?")} className="glass-pill text-xs py-1.5 px-3 bg-white/5 border-white/10 hover:border-[#FF6685]/40 text-[#F5F6FA] hover:text-[#FF6685] cursor-pointer">
                        🎓 Préparer mes candidatures Master
                      </button>
                    </>
                  )}
                  {currentSpecialist.id === "interview" && (
                    <>
                      <button onClick={() => handleSendMessage("Simule un entretien de 15 min pour le poste en banque privée")} className="glass-pill text-xs py-1.5 px-3 bg-white/5 border-white/10 hover:border-[#FF6685]/40 text-[#F5F6FA] hover:text-[#FF6685] cursor-pointer">
                        🎙️ Lancer une simulation STAR
                      </button>
                      <button onClick={() => handleSendMessage("Quelles questions pièges puis-je avoir en entretien RH ?")} className="glass-pill text-xs py-1.5 px-3 bg-white/5 border-white/10 hover:border-[#FF6685]/40 text-[#F5F6FA] hover:text-[#FF6685] cursor-pointer">
                        ❓ Questions pièges courantes
                      </button>
                    </>
                  )}
                  {currentSpecialist.id === "cv_letter" && (
                    <>
                      <button onClick={() => handleSendMessage("Peux-tu analyser les mots-clés ATS de mon offre ciblée ?")} className="glass-pill text-xs py-1.5 px-3 bg-white/5 border-white/10 hover:border-[#FF6685]/40 text-[#F5F6FA] hover:text-[#FF6685] cursor-pointer">
                        📄 Analyse des mots-clés ATS
                      </button>
                      <button onClick={() => handleSendMessage("Propose-moi une phrase d'accroche percutante pour ma lettre")} className="glass-pill text-xs py-1.5 px-3 bg-white/5 border-white/10 hover:border-[#FF6685]/40 text-[#F5F6FA] hover:text-[#FF6685] cursor-pointer">
                        ✍️ Accroche pour lettre de motivation
                      </button>
                    </>
                  )}
                  {currentSpecialist.id === "networking" && (
                    <>
                      <button onClick={() => handleSendMessage("Rédige un message d'approche LinkedIn pour un Alumni UCA")} className="glass-pill text-xs py-1.5 px-3 bg-white/5 border-white/10 hover:border-[#FF6685]/40 text-[#F5F6FA] hover:text-[#FF6685] cursor-pointer">
                        ✉️ Message d'approche Alumni
                      </button>
                      <button onClick={() => handleSendMessage("Comment relancer un recruteur après une candidature ?")} className="glass-pill text-xs py-1.5 px-3 bg-white/5 border-white/10 hover:border-[#FF6685]/40 text-[#F5F6FA] hover:text-[#FF6685] cursor-pointer">
                        🔄 Stratégie de relance
                      </button>
                    </>
                  )}
                  {currentSpecialist.id === "negotiation" && (
                    <>
                      <button onClick={() => handleSendMessage("Comment aborder la négociation de gratification pour mon alternance ?")} className="glass-pill text-xs py-1.5 px-3 bg-white/5 border-white/10 hover:border-[#FF6685]/40 text-[#F5F6FA] hover:text-[#FF6685] cursor-pointer">
                        💼 Évaluer mon package
                      </button>
                      <button onClick={() => handleSendMessage("Quels arguments de valeur chiffrés puis-je présenter ?")} className="glass-pill text-xs py-1.5 px-3 bg-white/5 border-white/10 hover:border-[#FF6685]/40 text-[#F5F6FA] hover:text-[#FF6685] cursor-pointer">
                        📊 Arguments de rémunération
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              activeSession.messages.map(msg => {
                const isUser = msg.role === "user";
                const actionChips = extractActionChips(msg.text);

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 max-w-[90%] sm:max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 ${
                      isUser
                        ? "bg-[#D81A45] border-[#FF6685] text-white shadow-[0_0_12px_rgba(216,26,69,0.3)]"
                        : "bg-white/[0.05] border-white/10 text-[#FF6685]"
                    }`}>
                      {isUser ? <User className="w-4 h-4" /> : <currentSpecialist.icon className="w-4 h-4" />}
                    </div>

                    <div className="space-y-2 flex-1 min-w-0">
                      <div className={`rounded-2xl p-4 text-xs leading-relaxed relative group backdrop-blur-xl ${
                        isUser
                          ? "bg-[rgba(216,26,69,0.14)] text-[#F5F6FA] border border-[rgba(216,26,69,0.25)] rounded-tr-none shadow-[0_0_15px_rgba(216,26,69,0.12)]"
                          : "bg-white/[0.04] text-[#F5F6FA] border border-white/10 rounded-tl-none shadow-lg"
                      }`}>
                        {/* Copy button */}
                        {!isUser && (
                          <button
                            onClick={() => handleCopyText(msg.id, msg.text)}
                            className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#9AA0B2] hover:text-[#F5F6FA] transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                            title="Copier le texte"
                          >
                            {copiedMsgId === msg.id ? <Check className="w-3.5 h-3.5 text-[#34D399]" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}

                        {renderFormattedText(msg.text)}

                        <div className="text-[9px] text-[#9AA0B2] mt-2 text-right">
                          {new Date(msg.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>

                      {/* Render action suggestion chips if present in response */}
                      {!isUser && actionChips.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1 pl-1">
                          {actionChips.map((chip, cIdx) => (
                            <button
                              key={cIdx}
                              onClick={() => handleSendMessage(chip)}
                              className="px-2.5 py-1 rounded-xl bg-[rgba(216,26,69,0.1)] hover:bg-[rgba(216,26,69,0.2)] border border-[rgba(216,26,69,0.25)] text-[#FF6685] text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>{chip}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {isLoading && (
              <div className="flex gap-3 mr-auto max-w-[85%]">
                <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-[#FF6685]">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-white/[0.04] border border-white/10 rounded-2xl rounded-tl-none p-4 text-xs text-[#9AA0B2] flex items-center gap-2">
                  <span>{currentSpecialist.name} analyse les données NACORA</span>
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF6685] animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF6685] animate-bounce delay-100" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF6685] animate-bounce delay-200" />
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Liquid Glass Input Form */}
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="p-3.5 bg-white/[0.02] border-t border-white/10 flex gap-2.5 items-center">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isLoading}
              placeholder={currentSpecialist.placeholder}
              className="flex-1 glass-input px-4 py-3 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="p-3 rounded-xl bg-[#D81A45] hover:bg-[#FF6685] disabled:opacity-40 text-white transition-all shadow-[0_0_15px_rgba(216,26,69,0.3)] cursor-pointer flex items-center justify-center shrink-0"
              title="Envoyer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* ========================================== */}
        {/* ZONE C : CONTEXTE ACTIF (3 COLS / DRAWER) */}
        {/* ========================================== */}
        <div className={`lg:col-span-12 xl:col-span-3 flex flex-col gap-4 ${showMobileContextDrawer ? "block" : "hidden xl:flex"}`}>
          
          {/* Context Used Panel */}
          <div className="glass-panel p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#9AA0B2] flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-[#38BDF8]" />
                Contexte utilisé
              </h3>
              <span className="text-[10px] text-[#34D399] font-semibold bg-[rgba(52,211,153,0.1)] px-2 py-0.5 rounded-full border border-[rgba(52,211,153,0.2)]">
                Temps réel
              </span>
            </div>

            {/* Live Data Summary Counts */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[#9AA0B2] flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-[#9AA0B2]" />
                  Profil candidat
                </span>
                <span className="font-semibold text-[#F5F6FA] text-[11px] truncate max-w-[130px]">
                  {profile.fullName || "Complété"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[#9AA0B2] flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-[#FF6685]" />
                  Opportunités
                </span>
                <span className="font-semibold text-[#F5F6FA]">
                  {opportunities.length} ({activeOppsCount} actives)
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[#9AA0B2] flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-[#FBBF24]" />
                  Contacts réseau
                </span>
                <span className="font-semibold text-[#F5F6FA]">
                  {contacts.length} ({alumniCount} alumni)
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[#9AA0B2] flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-[#C084FC]" />
                  Échéances agenda
                </span>
                <span className="font-semibold text-[#F5F6FA]">
                  {calendarEvents.length}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[#9AA0B2] flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-[#38BDF8]" />
                  Entreprises suivies
                </span>
                <span className="font-semibold text-[#F5F6FA]">
                  {dbStore.getCompanies().length}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[#9AA0B2] flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-[#34D399]" />
                  Documents
                </span>
                <span className="font-semibold text-[#F5F6FA]">
                  {documents.length}
                </span>
              </div>
            </div>

            {/* Active Subject Selector */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#F5F6FA]">Sujet d'étude actif</span>
                <button
                  onClick={() => setShowFocusPicker(!showFocusPicker)}
                  className="text-[11px] text-[#FF6685] hover:underline font-semibold cursor-pointer flex items-center gap-0.5"
                >
                  <span>{activeFocus ? "Changer" : "Sélectionner"}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>

              {/* Active Subject Display Card */}
              {activeFocus ? (
                <div className="p-3 rounded-2xl bg-[rgba(216,26,69,0.1)] border border-[rgba(216,26,69,0.3)] space-y-1.5 relative">
                  <div className="flex items-center justify-between text-[10px] text-[#FF6685] font-bold uppercase tracking-wider">
                    <span>{activeFocus.type === "opportunity" ? "Offre ciblée" : activeFocus.type === "contact" ? "Contact réseau" : "Document"}</span>
                    <button onClick={() => setActiveFocus(null)} className="text-[#9AA0B2] hover:text-[#F04438] cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h4 className="text-xs font-bold text-[#F5F6FA] line-clamp-1">{activeFocus.title}</h4>
                  {activeFocus.subtitle && <p className="text-[10px] text-[#9AA0B2] truncate">{activeFocus.subtitle}</p>}
                  {activeFocus.detail && <p className="text-[10px] text-[#9AA0B2] line-clamp-2 italic">{activeFocus.detail}</p>}
                </div>
              ) : (
                <div className="p-3 rounded-2xl border border-dashed border-white/10 text-[11px] text-[#9AA0B2] text-center">
                  Aucun sujet spécifique sélectionné. L'assistant utilise le contexte global de tes candidatures.
                </div>
              )}

              {/* Focus Picker Dropdown List */}
              {showFocusPicker && (
                <div className="p-2 rounded-2xl bg-[#0B0F19] border border-white/15 space-y-2 shadow-2xl max-h-[220px] overflow-y-auto mt-2">
                  <div className="text-[10px] font-bold text-[#9AA0B2] uppercase px-2 pt-1">Opportunités en cours</div>
                  {opportunities.map(opp => (
                    <button
                      key={opp.id}
                      onClick={() => {
                        setActiveFocus({
                          id: opp.id,
                          type: "opportunity",
                          title: `${opp.title} — ${opp.companyName}`,
                          subtitle: `${opp.contractType || "Alternance"} • ${opp.location || "France"} • ${opp.salary || "Barème"}`,
                          detail: `Statut: ${opp.status}. Missions: ${(opp.extractedInfo?.missions || []).slice(0, 2).join(", ") || "Aide gestion"}`
                        });
                        setShowFocusPicker(false);
                      }}
                      className="w-full text-left p-2 rounded-xl hover:bg-white/5 transition-colors text-xs text-[#F5F6FA] truncate cursor-pointer block"
                    >
                      💼 {opp.title} ({opp.companyName})
                    </button>
                  ))}

                  <div className="text-[10px] font-bold text-[#9AA0B2] uppercase px-2 pt-1 border-t border-white/10">Contacts récents</div>
                  {contacts.slice(0, 5).map(c => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setActiveFocus({
                          id: c.id,
                          type: "contact",
                          title: `${c.fullName} — ${c.companyName}`,
                          subtitle: `${c.jobTitle} • Categorie: ${c.category}`,
                          detail: `Points de connexion: ${(c.connectionPoints || []).join(" | ")}`
                        });
                        setShowFocusPicker(false);
                      }}
                      className="w-full text-left p-2 rounded-xl hover:bg-white/5 transition-colors text-xs text-[#F5F6FA] truncate cursor-pointer block"
                    >
                      👤 {c.fullName} ({c.jobTitle})
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
