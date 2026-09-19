import React, { useState, useEffect, useRef } from "react";
import { dbStore } from "../dbStore";
import { CandidateProfile, ChatSession, ChatMessage } from "../types";
import { GlassCard, GlassButton, Badge } from "../components/Shared";
import { 
  Sparkles, 
  Send, 
  User, 
  Bot, 
  Trash2, 
  Plus, 
  MessageSquare, 
  Target, 
  ShieldCheck, 
  HelpCircle,
  Briefcase
} from "lucide-react";

interface HubIAProps {
  showToast: (message: string, type: "success" | "error" | "info" | "ai") => void;
  initialPersona?: string;
}

export const HubIA: React.FC<HubIAProps> = ({ showToast, initialPersona }) => {
  const [profile, setProfile] = useState<CandidateProfile>(dbStore.getProfile());
  const [sessions, setSessions] = useState<ChatSession[]>(dbStore.getChatSessions());
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // List of Gemini AI personas/specialists available
  const personas = [
    { id: "general", name: "Conseiller Carrière", role: "Orientation & stratégie globale", desc: "T'aide à structurer ta recherche, affiner ta cible de masters et organiser ton calendrier.", color: "text-[#60a5fa] bg-blue-950/20" },
    { id: "interview", name: "Coach Entretien", role: "Simulations & Méthode STAR", desc: "T'entraîne en conditions réelles et évalue tes réponses avec la grille comportementale STAR.", color: "text-[#c084fc] bg-purple-950/20" },
    { id: "cv_letter", name: "Expert CV & Lettres", role: "Optimisation ATS & Verbes d'action", desc: "Analyse tes écrits professionnels, optimise l'accroche et déjoue les filtres des robots ATS.", color: "text-[#34d399] bg-emerald-950/20" },
    { id: "networking", name: "Stratège Réseau", role: "LinkedIn & Approches Directes", desc: "Génère des messages de connexion percutants pour les Alumni et t'enseigne à naviguer le marché caché.", color: "text-[#fbbf24] bg-amber-950/20" },
    { id: "negotiation", name: "Négociation Salaire", role: "Optimisation package & Grilles", desc: "Te donne les clés verbales et les arguments de valeur pour aborder la rémunération sereinement.", color: "text-[#f87171] bg-rose-950/20" }
  ];

  const activePersonaId = initialPersona || "general";

  // Reload data from store
  useEffect(() => {
    setProfile(dbStore.getProfile());
    const sess = dbStore.getChatSessions();
    setSessions(sess);

    // Default to the first session or active session of the initial persona if supplied
    if (sess.length > 0) {
      if (initialPersona) {
        const matchingSess = sess.find(s => s.personaId === initialPersona);
        if (matchingSess) {
          setActiveSessionId(matchingSess.id);
        } else {
          setActiveSessionId(sess[0].id);
        }
      } else {
        setActiveSessionId(sess[0].id);
      }
    }

    const unsub = dbStore.subscribe(() => {
      setProfile(dbStore.getProfile());
      setSessions(dbStore.getChatSessions());
    });
    return unsub;
  }, [initialPersona]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, activeSessionId]);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  // Send message to Gemini AI on the backend server
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeSessionId || isLoading) return;

    const userText = inputMessage;
    setInputMessage("");
    setIsLoading(true);

    // Save user message to database store locally
    dbStore.addMessageToSession(activeSessionId, "user", userText);
    showToast("Connexion à l'IA de NACORA...", "ai");

    try {
      const currentSess = dbStore.getChatSessions().find(s => s.id === activeSessionId);
      if (!currentSess) throw new Error("Session issue");

      // Post the chat request to server proxy
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat",
          payload: {
            personaId: currentSess.personaId,
            messages: currentSess.messages.map(m => ({ role: m.role, text: m.text })),
            profile: profile
          }
        })
      });

      if (!response.ok) throw new Error("API call failed");
      const data = await response.json();

      // Add AI reply to store
      dbStore.addMessageToSession(activeSessionId, "model", data.response);
      showToast("Réponse de NACORA AI reçue", "success");
    } catch (err) {
      console.error(err);
      dbStore.addMessageToSession(
        activeSessionId, 
        "model", 
        "Une erreur s'est produite lors de la communication avec l'IA. Assurez-vous d'avoir configuré votre clé d'API dans les paramètres."
      );
      showToast("Échec de connexion IA", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new session for a persona
  const handleCreateSession = (personaId: string) => {
    const selectedPersona = personas.find(p => p.id === personaId);
    const title = `${selectedPersona?.name} — ${new Date().toLocaleDateString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
    const newSess = dbStore.addChatSession(personaId, title);

    // Inject initial prompt message from model according to persona
    let greeting = "";
    const userName = profile.fullName || "candidat";
    if (personaId === "general") {
      const backgroundContext = profile.currentSituation || profile.currentAlternance 
        ? `En nous appuyant sur ton profil (${profile.currentSituation || profile.currentAlternance}), ` 
        : "";
      greeting = `Bonjour ${userName} ! Je suis ton Conseiller Carrière NACORA. ${backgroundContext}nous avons une excellente base pour préparer et optimiser tes candidatures en finance, banque, fintech ou gestion de patrimoine. Sur quel sujet veux-tu travailler aujourd'hui ?`;
    } else if (personaId === "interview") {
      greeting = `Prêt pour l'entraînement ${userName} ? Je suis ton Coach d'Entretien. Nous allons faire des simulations en utilisant la méthode STAR. Indique-moi le poste et l'entreprise ciblés, et je te poserai des questions comportementales et techniques sur-mesure !`;
    } else if (personaId === "cv_letter") {
      greeting = `Salut ${userName} ! Envoie-moi le texte de ton CV, de ta lettre de motivation ou colle une offre d'emploi. Je vais formuler des accroches percutantes avec des verbes d'action robustes et t'aider à maximiser ton score ATS !`;
    } else if (personaId === "networking") {
      greeting = `Bonjour ${userName} ! Je suis ton expert Stratégie Réseau & LinkedIn. Notre but est de repérer et aborder des professionnels clés et des alumni pour décrocher des échanges informels et des recommandations. Quel type de contact veux-tu aborder en premier ?`;
    } else if (personaId === "negotiation") {
      greeting = `Bonjour ${userName}. Parlons rémunération et négociation. Que souhaites-tu analyser : ton salaire de base, tes primes conventionnelles ou tes avantages périphériques ?`;
    }

    dbStore.addMessageToSession(newSess.id, "model", greeting);
    setActiveSessionId(newSess.id);
    showToast(`Nouvelle session lancée : ${selectedPersona?.name}`, "success");
  };

  // Delete a session
  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dbStore.deleteChatSession(id);
    showToast("Session supprimée", "info");
    
    const remaining = dbStore.getChatSessions();
    if (remaining.length > 0) {
      setActiveSessionId(remaining[0].id);
    } else {
      setActiveSessionId("");
    }
  };

  return (
    <div className="relative z-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-190px)]">
      
      {/* 1. Sidebar: Personas list & session histories (Span 4) */}
      <div className="lg:col-span-4 flex flex-col gap-5">
        
        {/* Persona Launcher Card */}
        <div className="glass-panel p-4 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-[#F5F6FA] select-none flex items-center gap-2 font-display">
            <Sparkles className="w-4 h-4 text-[#C084FC]" />
            Lancer un spécialiste IA
          </h3>
          <div className="flex flex-col gap-2">
            {personas.map(p => (
              <button
                key={p.id}
                onClick={() => handleCreateSession(p.id)}
                className="w-full text-left p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-spring flex items-start gap-2.5 cursor-pointer group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#F5F6FA] group-hover:text-[#FF6685] transition-spring">{p.name}</span>
                    <Badge variant={p.id === 'general' ? 'blue' : p.id === 'interview' ? 'purple' : p.id === 'cv_letter' ? 'green' : p.id === 'networking' ? 'amber' : 'brand'}>
                      {p.id === 'general' ? 'Carrière' : p.id === 'interview' ? 'STAR' : p.id === 'cv_letter' ? 'ATS' : p.id === 'networking' ? 'Réseau' : 'Salaire'}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-[#9AA0B2] truncate mt-1">{p.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Sessions History Card */}
        <div className="glass-panel p-4 flex-1 flex flex-col overflow-hidden">
          <h3 className="text-sm font-bold text-[#F5F6FA] mb-3 flex items-center gap-2 select-none font-display">
            <MessageSquare className="w-4 h-4 text-[#9AA0B2]" />
            Historique des échanges
          </h3>
          
          <div className="flex-1 overflow-y-auto space-y-2 max-h-[300px] lg:max-h-[calc(100vh-530px)] pr-1">
            {sessions.length === 0 ? (
              <div className="h-20 flex items-center justify-center border border-dashed border-white/10 rounded-xl text-xs text-[#9AA0B2]">
                Aucune session active
              </div>
            ) : (
              sessions.map(sess => {
                const isActive = sess.id === activeSessionId;
                return (
                  <div
                    key={sess.id}
                    onClick={() => setActiveSessionId(sess.id)}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-spring cursor-pointer ${
                      isActive 
                        ? 'bg-[rgba(216,26,69,0.18)] border-[rgba(216,26,69,0.35)] shadow-[0_0_12px_rgba(216,26,69,0.2)]' 
                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className={`text-xs font-bold truncate ${isActive ? 'text-[#FF6685]' : 'text-[#F5F6FA]'}`}>{sess.title}</div>
                      <div className="text-[9px] text-[#9AA0B2] mt-0.5">{sess.personaName}</div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSession(sess.id, e)}
                      className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#9AA0B2] hover:text-[#F04438] transition-spring cursor-pointer"
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
      </div>

      {/* 2. Primary Chat Area (Span 8) */}
      <div className="lg:col-span-8 flex flex-col glass-panel overflow-hidden shadow-2xl">
        
        {/* Chat Header */}
        <div className="p-4 bg-white/[0.02] border-b border-white/10 flex items-center justify-between">
          {activeSession ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-purple-950/40 border border-purple-500/30 flex items-center justify-center text-purple-300">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#F5F6FA] font-display">{activeSession.personaName}</h3>
                <p className="text-[10px] text-[#F79009] flex items-center gap-1 mt-0.5 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Contexte candidat normalisé injecté automatiquement
                </p>
              </div>
            </div>
          ) : (
            <div className="text-sm font-bold text-[#9AA0B2]">Aucun chat actif</div>
          )}
        </div>

        {/* Messages Logs view */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 max-h-[450px] lg:max-h-[calc(100vh-320px)] bg-black/20">
          {!activeSession ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
              <Sparkles className="w-12 h-12 text-[#C084FC] animate-pulse" />
              <h4 className="text-sm font-bold text-[#F5F6FA] font-display">Prêt à accélérer ton recrutement ?</h4>
              <p className="text-xs text-[#9AA0B2] max-w-sm">
                Sélectionne l'un de nos spécialistes IA dans le panneau de gauche pour démarrer une conversation personnalisée !
              </p>
              <GlassButton variant="ai" size="sm" onClick={() => handleCreateSession("general")}>
                Lancer le Conseiller Carrière
              </GlassButton>
            </div>
          ) : activeSession.messages.length === 0 ? (
            <div className="text-center text-xs text-[#9AA0B2] py-10">
              Début de la conversation. Écris ton message ci-dessous...
            </div>
          ) : (
            activeSession.messages.map(msg => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3.5 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${
                    isUser ? 'bg-[rgba(216,26,69,0.18)] border-[rgba(216,26,69,0.35)] text-[#FF6685]' : 'bg-purple-950/40 border-purple-500/30 text-[#c084fc]'
                  }`}>
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  
                  <div className={`rounded-2xl p-4 text-xs leading-relaxed ${
                    isUser 
                      ? 'bg-[rgba(216,26,69,0.18)] text-[#F5F6FA] border border-[rgba(216,26,69,0.3)] rounded-tr-none shadow-[0_0_15px_rgba(216,26,69,0.15)]' 
                      : 'bg-white/[0.05] text-[#F5F6FA] rounded-tl-none border border-white/10 backdrop-blur-md'
                  }`}>
                    {/* Preserve line breaks for elegant reading */}
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                    <div className="text-[8px] text-[#9AA0B2] mt-1.5 text-right">
                      {new Date(msg.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {isLoading && (
            <div className="flex gap-3 mr-auto max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-purple-950/40 border border-purple-500/30 flex items-center justify-center text-[#c084fc] animate-pulse">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none p-4 text-xs text-[#9AA0B2]">
                <span className="flex items-center gap-1.5 select-none font-semibold">
                  <span>NACORA AI est en train de réfléchir</span>
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce delay-100">.</span>
                  <span className="animate-bounce delay-200">.</span>
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Box */}
        <form onSubmit={handleSendMessage} className="p-4 bg-white/[0.02] border-t border-white/10 flex gap-3">
          <input
            type="text"
            required
            disabled={!activeSessionId || isLoading}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={activeSessionId ? "Pose ton excellente question..." : "Lancer un spécialiste IA d'abord"}
            className="flex-1 glass-input px-4 py-3 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60 focus:outline-none disabled:opacity-50"
          />
          <GlassButton
            type="submit"
            variant="ai"
            size="sm"
            disabled={!activeSessionId || isLoading || !inputMessage.trim()}
          >
            <Send className="w-4 h-4 text-purple-200" />
          </GlassButton>
        </form>
      </div>
    </div>
  );
};
