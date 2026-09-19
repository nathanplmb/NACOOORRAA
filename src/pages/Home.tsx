import React, { useState, useEffect } from "react";
import { dbStore } from "../dbStore";
import { CandidateProfile, Opportunity, CalendarEvent } from "../types";
import { GlassCard, Badge, GlassButton } from "../components/Shared";
import { 
  Sparkles, 
  Briefcase, 
  Users, 
  Calendar as CalendarIcon, 
  Award, 
  ChevronRight, 
  TrendingUp, 
  CheckCircle2, 
  Clock,
  ArrowRight,
  GraduationCap
} from "lucide-react";

interface HomeProps {
  onNavigate: (view: string) => void;
  showToast: (message: string, type: "success" | "error" | "info" | "ai") => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate, showToast }) => {
  const [profile, setProfile] = useState<CandidateProfile>(dbStore.getProfile());
  const [opportunities, setOpportunities] = useState<Opportunity[]>(dbStore.getOpportunities());
  const [events, setEvents] = useState<CalendarEvent[]>(dbStore.getCalendarEvents());

  useEffect(() => {
    setProfile(dbStore.getProfile());
    setOpportunities(dbStore.getOpportunities());
    setEvents(dbStore.getCalendarEvents());

    const unsub = dbStore.subscribe(() => {
      setProfile(dbStore.getProfile());
      setOpportunities(dbStore.getOpportunities());
      setEvents(dbStore.getCalendarEvents());
    });
    return unsub;
  }, []);

  // Quick stats
  const savedCount = opportunities.filter(o => o.status === "saved").length;
  const activeCandidatures = opportunities.filter(o => o.status === "to_prepare" || o.status === "to_apply").length;
  const interviewCount = events.filter(e => e.type === "interview" && !e.completed).length;

  return (
    <div className="relative z-10 w-full space-y-4">
      {/* 1. Welcome Header */}
      <div className="relative overflow-hidden glass-panel p-4 md:p-5">
        <div className="glow-spot-coral -top-20 -left-20" />
        <div className="glow-spot-lavender -bottom-20 -right-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <Badge variant="purple" className="mb-1 text-[10px]">Tableau de bord intelligent</Badge>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#F5F6FA] tracking-tight font-display">
              Bonjour, {profile.fullName || "Bienvenue"}
            </h1>
            <p className="text-xs sm:text-sm text-[#9AA0B2] max-w-xl leading-relaxed">
              {profile.currentAlternance ? (
                <>Prépare ta transition vers tes opportunités cibles. Ton expérience chez <span className="text-[#12B76A] font-semibold">{profile.currentAlternance}</span> est un atout clé à valoriser.</>
              ) : (
                <>Pilote l'ensemble de tes candidatures d'élite, optimise tes CV et prépare tes entretiens grâce aux modèles IA de pointe.</>
              )}
            </p>
          </div>
          
          {/* Dossier Completion Score Widget */}
          <div className="flex items-center gap-3 bg-white/[0.03] p-3 rounded-2xl border border-white/10 backdrop-blur-xl shrink-0">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-[#060812] border border-white/10 shadow-inner">
              <span className="text-sm font-extrabold text-[#FF6685] font-display">{profile.profileCompletionScore}%</span>
              <svg className="absolute w-12 h-12 -rotate-90">
                <circle 
                  cx="24" 
                  cy="24" 
                  r="20" 
                  stroke="rgba(255,255,255,0.06)" 
                  strokeWidth="3.5" 
                  fill="transparent" 
                />
                <circle 
                  cx="24" 
                  cy="24" 
                  r="20" 
                  stroke="#D81A45" 
                  strokeWidth="3.5" 
                  fill="transparent" 
                  strokeDasharray={2 * Math.PI * 20}
                  strokeDashoffset={2 * Math.PI * 20 * (1 - profile.profileCompletionScore / 100)}
                />
              </svg>
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#F5F6FA]">Dossier de candidature</h4>
              <p className="text-[11px] text-[#9AA0B2]">Complété à {profile.profileCompletionScore}%</p>
              <button 
                onClick={() => onNavigate("profile")}
                className="text-[11px] text-[#FF6685] hover:text-[#FF809B] mt-0.5 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Finaliser mon dossier</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-6 relative overflow-hidden" hoverable>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-[#9AA0B2] uppercase tracking-wider mb-1">Candidatures Actives</p>
              <h3 className="text-3xl font-extrabold text-[#F5F6FA] font-display">{activeCandidatures}</h3>
              <p className="text-xs text-[#9AA0B2] mt-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-[#12B76A]" />
                <span>En préparation d'envoi</span>
              </p>
            </div>
            <div className="p-3 bg-[rgba(216,26,69,0.18)] border border-[rgba(216,26,69,0.35)] rounded-2xl text-[#FF6685] shadow-[0_0_15px_rgba(216,26,69,0.2)]">
              <Briefcase className="w-6 h-6" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 relative overflow-hidden" hoverable>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-[#9AA0B2] uppercase tracking-wider mb-1">Entretiens Planifiés</p>
              <h3 className="text-3xl font-extrabold text-[#F5F6FA] font-display">{interviewCount}</h3>
              <p className="text-xs text-[#9AA0B2] mt-2 flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#F79009]" />
                <span>Méthode STAR recommandée</span>
              </p>
            </div>
            <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-2xl text-[#C084FC] shadow-[0_0_15px_rgba(147,51,234,0.2)]">
              <Award className="w-6 h-6" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 relative overflow-hidden" hoverable>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-[#9AA0B2] uppercase tracking-wider mb-1">Contacts Utiles</p>
              <h3 className="text-3xl font-extrabold text-[#F5F6FA] font-display">3</h3>
              <p className="text-xs text-[#9AA0B2] mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[#12B76A]" />
                <span>2 Alumni de l'IUT identifiés</span>
              </p>
            </div>
            <div className="p-3 bg-sky-950/30 border border-sky-500/30 rounded-2xl text-[#38BDF8] shadow-[0_0_15px_rgba(14,165,233,0.2)]">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* 3. Main Split Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: AI recommendations from Gemini */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Conseils personnalisés de NACORA AI
            </h3>
          </div>

          <div className="space-y-4">
            <GlassCard className="p-5 border-glass-luminous-coral relative overflow-hidden" hoverable={false}>
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-purple-950/40 flex items-center justify-center text-purple-300 flex-shrink-0 border border-purple-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Ajustement de Profil</span>
                    <Badge variant="purple">IA Suggestion</Badge>
                  </div>
                  <h4 className="text-sm font-bold text-slate-100">
                    {profile.currentAlternance ? `Valorise ton expérience chez ${profile.currentAlternance}` : "Complète tes expériences dans ton profil"}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {profile.currentAlternance ? (
                      <>Les recruteurs et jurys apprécient grandement l'expérience de terrain acquise en entreprise ({profile.currentAlternance}). Demande au <strong>Coach Entretien</strong> de t'entraîner sur la formulation d'exemples STAR concrets.</>
                    ) : (
                      <>Renseigne tes expériences passées et tes compétences dans l'onglet Profil pour obtenir des recommandations d'entretiens et de CV ultra-personnalisées.</>
                    )}
                  </p>
                  <div className="pt-2 flex gap-3">
                    <button 
                      onClick={() => onNavigate("interview_coach")}
                      className="text-xs bg-purple-950/30 hover:bg-purple-900/40 text-purple-300 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-spring cursor-pointer"
                    >
                      <span>Simuler un entretien</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5 relative overflow-hidden" hoverable={false}>
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-blue-950/40 flex items-center justify-center text-blue-300 flex-shrink-0 border border-blue-500/20">
                  <Users className="w-5 h-5" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#60a5fa] uppercase tracking-wider">Opportunité Réseau</span>
                    <Badge variant="blue">Alumni</Badge>
                  </div>
                  <h4 className="text-sm font-bold text-slate-100">Prends contact avec Clara Dubois</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Clara Dubois est une professionnelle de ton réseau cible travaillant chez <strong>Luko</strong>, une entreprise dans laquelle une offre d'Analyste Épargne est disponible. C'est l'accroche idéale pour échanger sur le secteur de la fintech et du patrimoine.
                  </p>
                  <div className="pt-2">
                    <button 
                      onClick={() => onNavigate("networking")}
                      className="text-xs bg-blue-950/30 hover:bg-blue-900/40 text-blue-300 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-spring cursor-pointer"
                    >
                      <span>Générer un message d'approche</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Right: Calendar timeline events */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-[#f87171]" />
              Prochaines Échéances
            </h3>
            <button 
              onClick={() => onNavigate("calendrier")}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Voir tout
            </button>
          </div>

          <div className="space-y-4">
            {events.slice(0, 3).map(event => (
              <div 
                key={event.id}
                className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-spring"
              >
                <div className="p-2 rounded-lg bg-slate-950 border border-white/5 text-center min-w-[50px]">
                  <span className="block text-[10px] uppercase font-bold text-slate-500">
                    {new Date(event.date).toLocaleDateString("fr-FR", { month: "short" })}
                  </span>
                  <span className="block text-sm font-extrabold text-white">
                    {new Date(event.date).getDate()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-100 truncate">{event.title}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{event.notes}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      event.type === 'interview' ? 'bg-purple-950 text-[#c084fc]' :
                      event.type === 'deadline' ? 'bg-rose-950 text-[#f87171]' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {event.type === 'interview' ? 'Entretien' : 'Échéance'}
                    </span>
                    {event.time && (
                      <span className="text-[10px] text-slate-500">{event.time}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
