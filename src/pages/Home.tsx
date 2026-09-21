import React, { useState, useEffect } from "react";
import { dbStore } from "../dbStore";
import { CandidateProfile, Opportunity, CalendarEvent, Contact } from "../types";
import { Badge, GlassButton } from "../components/Shared";
import { useLanguage } from "../context/LanguageContext";
import { 
  generateLocalDailyBrief, 
  DailyBriefData, 
  DailyBriefAction 
} from "../api/gemini";
import { 
  Sparkles, 
  Briefcase, 
  Users, 
  Calendar as CalendarIcon, 
  ChevronRight, 
  TrendingUp, 
  Clock,
  ArrowRight,
  RefreshCw,
  User,
  AlertCircle,
  CheckCircle2,
  ListTodo
} from "lucide-react";

interface HomeProps {
  onNavigate: (view: string, personaId?: string) => void;
  showToast: (message: string, type: "success" | "error" | "info" | "ai") => void;
}

const STORAGE_KEY = "nacora_daily_brief";

export const Home: React.FC<HomeProps> = ({ onNavigate, showToast }) => {
  const { language, t } = useLanguage();
  const [profile, setProfile] = useState<CandidateProfile>(dbStore.getProfile());
  const [opportunities, setOpportunities] = useState<Opportunity[]>(dbStore.getOpportunities());
  const [events, setEvents] = useState<CalendarEvent[]>(dbStore.getCalendarEvents());
  const [contacts, setContacts] = useState<Contact[]>(dbStore.getContacts());

  const [briefData, setBriefData] = useState<DailyBriefData | null>(null);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [challengeAnswered, setChallengeAnswered] = useState<boolean | null>(null);

  // Load initial store data and brief from cache/generator
  useEffect(() => {
    const p = dbStore.getProfile();
    const o = dbStore.getOpportunities();
    const e = dbStore.getCalendarEvents();
    const c = dbStore.getContacts();

    setProfile(p);
    setOpportunities(o);
    setEvents(e);
    setContacts(c);

    // Check cached brief in localStorage
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        setBriefData(JSON.parse(cached));
      } catch (err) {
        console.warn("Erreur de lecture du Daily Brief en cache:", err);
        const initial = generateLocalDailyBrief({ profile: p, opportunities: o, contacts: c, calendarEvents: e });
        setBriefData(initial);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      }
    } else {
      const initial = generateLocalDailyBrief({ profile: p, opportunities: o, contacts: c, calendarEvents: e });
      setBriefData(initial);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    }

    const unsub = dbStore.subscribe(() => {
      setProfile(dbStore.getProfile());
      setOpportunities(dbStore.getOpportunities());
      setEvents(dbStore.getCalendarEvents());
      setContacts(dbStore.getContacts());
    });
    return unsub;
  }, []);

  // Regenerate brief on-demand via Server API (or local fallback)
  const handleRegenerateBrief = async () => {
    setIsRegenerating(true);
    showToast(language === "en" ? "Analyzing your activity and updating your overview..." : "Actualisation de votre synthèse d'activité en cours...", "info");

    const payload = {
      profile,
      opportunities,
      contacts,
      calendarEvents: events
    };

    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generateDailyBrief", payload })
      });

      if (!response.ok) {
        throw new Error(`API server returned code ${response.status}`);
      }

      const data: DailyBriefData = await response.json();
      if (data && data.summaryText && Array.isArray(data.actions)) {
        setBriefData(data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        showToast(language === "en" ? "Your daily overview has been successfully refreshed!" : "Votre synthèse a été mise à jour avec succès !", "success");
      } else {
        throw new Error("Invalid structure returned");
      }
    } catch (err) {
      console.warn("[Home] Fallback local lors de la régénération du brief:", err);
      const fallback = generateLocalDailyBrief(payload);
      setBriefData(fallback);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
      showToast(language === "en" ? "Summary updated from your recent data." : "Synthèse mise à jour à partir de vos données récentes.", "info");
    } finally {
      setIsRegenerating(false);
    }
  };

  // Handle clicking on prioritized action cards
  const handleActionClick = (action: DailyBriefAction) => {
    showToast(`${language === "en" ? "Action" : "Action"} : ${action.title}`, "info");

    switch (action.actionType) {
      case "opportunity":
        onNavigate("opportunities");
        break;
      case "contact":
        onNavigate("contacts");
        break;
      case "profile":
        onNavigate("profile");
        break;
      case "calendar":
        onNavigate("calendrier");
        break;
      case "hub_ia":
        onNavigate("hub_ia");
        break;
      default:
        onNavigate("opportunities");
    }
  };

  // Real statistics calculation
  const activeCandidatures = opportunities.filter(
    o => o.status === "to_prepare" || o.status === "to_apply" || o.status === "to_study"
  ).length;

  const toPrepareCount = opportunities.filter(o => o.status === "to_prepare").length;
  const toApplyCount = opportunities.filter(o => o.status === "to_apply").length;

  const interviewCount = events.filter(e => e.type === "interview" && !e.completed).length;
  const alumniCount = contacts.filter(c => c.category === "alumni" || (c as any).academicPath).length;

  const upcomingEvents = events
    .filter(e => !e.completed)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Helper for priority badges
  const getPriorityBadge = (priority: DailyBriefAction["priority"]) => {
    switch (priority) {
      case "high":
        return <Badge variant="amber" className="bg-amber-500/[0.08] text-amber-300/80 border-amber-500/20 text-[10px] px-2 py-0.5">{t.home.priorityHigh}</Badge>;
      case "medium":
        return <Badge variant="purple" className="bg-purple-500/[0.08] text-purple-300/80 border-purple-500/20 text-[10px] px-2 py-0.5">{t.home.priorityMedium}</Badge>;
      case "low":
      default:
        return <Badge variant="blue" className="bg-sky-500/[0.08] text-sky-300/80 border-sky-500/20 text-[10px] px-2 py-0.5">{t.home.priorityNormal}</Badge>;
    }
  };

  // Helper for action icons
  const getActionIcon = (type: DailyBriefAction["actionType"]) => {
    switch (type) {
      case "opportunity":
        return <Briefcase className="w-4 h-4 text-emerald-300/80" />;
      case "contact":
        return <Users className="w-4 h-4 text-sky-300/80" />;
      case "profile":
        return <User className="w-4 h-4 text-rose-300/80" />;
      case "calendar":
        return <CalendarIcon className="w-4 h-4 text-amber-300/80" />;
      case "hub_ia":
      default:
        return <Sparkles className="w-4 h-4 text-purple-300/80" />;
    }
  };

  return (
    <div className="relative z-10 w-full space-y-3.5">

      {/* 2. Central Daily Brief IA Section */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-7 space-y-5 border border-white/[0.12] bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.15)]">
        {/* Soft liquid ambient lighting */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-white/[0.05] border border-white/[0.12] text-purple-300/80 backdrop-blur-md shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base md:text-lg font-bold text-[#F5F6FA] font-display tracking-tight">
                  {t.home.dailyBriefTitle}
                </h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.05] text-purple-300/80 border border-white/[0.08] backdrop-blur-md">
                  {t.home.liveSync}
                </span>
              </div>
              {briefData?.generatedAt && (
                <p className="text-[11px] text-[#9AA0B2] mt-0.5">{briefData.generatedAt}</p>
              )}
            </div>
          </div>

          <GlassButton
            onClick={handleRegenerateBrief}
            disabled={isRegenerating}
            variant="secondary"
            className="text-xs px-4 py-2 flex items-center gap-2 cursor-pointer self-start sm:self-auto shrink-0 bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.1] text-purple-200/90 transition-all shadow-sm backdrop-blur-md rounded-xl"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-purple-300/80 ${isRegenerating ? "animate-spin" : ""}`} />
            <span>{isRegenerating ? t.home.generating : t.home.regenBrief}</span>
          </GlassButton>
        </div>

        {/* Narrative Summary Text */}
        {briefData?.summaryText && (
          <div className="relative z-10 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl text-[#F5F6FA] text-xs sm:text-sm leading-relaxed font-medium shadow-sm">
            <p className="relative z-10">{briefData.summaryText}</p>
          </div>
        )}

        {/* Prioritized Actions List (Always 3 in full-screen view) */}
        <div className="relative z-10 space-y-3.5 pt-1">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold text-[#9AA0B2] uppercase tracking-wider flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-300/70" />
              <ListTodo className="w-3.5 h-3.5 text-purple-300/80" />
              <span>{t.home.recommendedActions}</span>
            </h3>
            <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-white/[0.04] text-[#9AA0B2] border border-white/[0.08] backdrop-blur-md">
              {t.home.keyActionsCount}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {briefData?.actions && briefData.actions.length > 0 ? (
              briefData.actions.slice(0, 3).map((action) => (
                <div
                  key={action.id}
                  onClick={() => handleActionClick(action)}
                  className="glass-card-interactive p-4 sm:p-5 flex flex-col justify-between space-y-3 cursor-pointer group hover:border-white/[0.18] hover:bg-white/[0.05] transition-all duration-300 rounded-2xl bg-white/[0.025] border border-white/[0.08] backdrop-blur-xl"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-purple-300/80 group-hover:bg-white/[0.08] transition-colors shrink-0">
                          {getActionIcon(action.actionType)}
                        </div>
                        <span className="text-[11px] font-semibold text-[#9AA0B2] capitalize tracking-wide">
                          {action.actionType === "opportunity" ? t.home.application :
                           action.actionType === "contact" ? t.home.network :
                           action.actionType === "profile" ? t.home.profile :
                           action.actionType === "calendar" ? t.home.agenda : t.home.aiCareer}
                        </span>
                      </div>
                      {getPriorityBadge(action.priority)}
                    </div>

                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-[#F5F6FA] group-hover:text-white transition-colors leading-snug font-display">
                        {action.title}
                      </h4>
                      <p className="text-[11px] text-[#9AA0B2] line-clamp-2 mt-1 leading-relaxed">
                        {action.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 flex items-center justify-between border-t border-white/[0.06]">
                    <span className="text-[11px] font-semibold text-purple-300/80 group-hover:text-white flex items-center gap-1.5 transition-colors">
                      <span>{action.buttonText ? (language === "en" && (action.buttonText === "Consulter" || action.buttonText === "Voir") ? "View" : action.buttonText) : (language === "en" ? "View" : "Consulter")}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform" />
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 p-6 text-center text-xs text-[#9AA0B2] bg-white/[0.02] rounded-2xl border border-white/[0.06]">
                {t.home.noActions}
              </div>
            )}
          </div>
        </div>

        {/* Interactive Dynamic Challenge Card */}
        <div className="relative z-10 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-purple-950/30 via-white/[0.03] to-white/[0.02] border border-purple-500/25 backdrop-blur-xl shadow-lg space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-purple-500/20 border border-purple-500/35 text-[#C084FC] shrink-0">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#C084FC] uppercase tracking-wider">{t.home.challengeTag}</span>
                <h4 className="text-sm sm:text-base font-bold text-[#F5F6FA] font-display mt-0.5">
                  {t.home.challengeQuestion}
                </h4>
              </div>
            </div>
            
            <div className="flex items-center gap-2.5 shrink-0">
              {challengeAnswered === null ? (
                <>
                  <button
                    onClick={() => {
                      setChallengeAnswered(true);
                      showToast(language === "en" ? "🎉 Great! Your networking engagement has been recorded." : "🎉 Parfait ! Votre prise de contact a été enregistrée.", "success");
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500/20 border border-emerald-500/35 text-emerald-300 hover:bg-emerald-500/30 transition-all cursor-pointer"
                  >
                    {t.home.challengeYes}
                  </button>
                  <button
                    onClick={() => {
                      setChallengeAnswered(false);
                      localStorage.setItem("nacora_initial_ai_prompt", language === "en" 
                        ? "I haven't reached out to my priority network contact this week. Can you help me prepare my hook and identify the best target?" 
                        : "Je n'ai pas encore réalisé mon contact réseau prioritaire cette semaine. Peux-tu m'aider à préparer mon accroche et identifier la meilleure cible ?");
                      showToast(language === "en" ? "Opening Networking Module to structure your approach..." : "Accès au module Réseau pour préparer votre prise de contact...", "info");
                      onNavigate("hub_ia", "networking");
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.05] border border-white/[0.12] text-purple-200 hover:bg-white/[0.1] transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{t.home.challengeNo}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : challengeAnswered ? (
                <div className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{t.home.challengeValidated}</span>
                </div>
              ) : (
                <button
                  onClick={() => {
                    localStorage.setItem("nacora_initial_ai_prompt", language === "en" 
                      ? "I haven't reached out to my priority network contact this week. Can you help me prepare my hook and identify the best target?" 
                      : "Je n'ai pas encore réalisé mon contact réseau prioritaire cette semaine. Peux-tu m'aider à préparer mon accroche et identifier la meilleure cible ?");
                    onNavigate("hub_ia", "networking");
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-purple-500/20 border border-purple-500/30 text-[#C084FC] hover:bg-purple-500/30 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>{t.home.challengeLaunchAi}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <p className="text-[11px] text-[#9AA0B2] leading-relaxed">
            {t.home.challengeHelpText}
          </p>
        </div>
      </div>

      {/* 4. Prochaines Échéances (Real Calendar Data) */}
      <div className="glass-panel p-3.5 sm:p-4 space-y-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 font-display">
            <CalendarIcon className="w-4 h-4 text-[#FBBF24]" />
            <span>{t.home.upcomingDeadlines}</span>
          </h3>
          <button 
            onClick={() => onNavigate("calendrier")}
            className="text-xs text-[#9AA0B2] hover:text-white cursor-pointer transition-colors flex items-center gap-1 font-semibold"
          >
            <span>{t.home.viewFullCalendar}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {upcomingEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {upcomingEvents.slice(0, 3).map(event => (
              <div 
                key={event.id}
                onClick={() => onNavigate("calendrier")}
                className="glass-card-interactive p-3 flex items-center gap-3 cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-slate-950 border border-white/10 text-center min-w-[46px] shrink-0">
                  <span className="block text-[9px] uppercase font-bold text-[#FBBF24]">
                    {new Date(event.date).toLocaleDateString(language === "en" ? "en-US" : "fr-FR", { month: "short" })}
                  </span>
                  <span className="block text-sm font-extrabold text-white leading-none mt-0.5">
                    {new Date(event.date).getDate()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-[#F5F6FA] truncate">{event.title}</h4>
                  <p className="text-[10px] text-[#9AA0B2] line-clamp-1 mt-0.5">{event.notes || (language === "en" ? "Recorded deadline" : "Échéance enregistrée")}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      event.type === 'interview' ? 'bg-purple-950 text-[#C084FC] border border-purple-500/30' :
                      event.type === 'deadline' ? 'bg-amber-950 text-[#FBBF24] border border-amber-500/30' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {event.type === 'interview' ? t.home.interview : t.home.deadline}
                    </span>
                    {event.time && (
                      <span className="text-[10px] text-[#9AA0B2]">{event.time}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-2.5 px-3.5 text-xs text-[#9AA0B2] bg-white/[0.02] rounded-lg border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#FBBF24]/70 shrink-0" />
              <span>{t.home.noDeadlines}</span>
            </div>
            <button
              onClick={() => onNavigate("calendrier")}
              className="text-[#FF6685] hover:text-[#FF809B] font-semibold cursor-pointer shrink-0 flex items-center gap-1 transition-colors"
            >
              <span>{t.home.addEvent}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
