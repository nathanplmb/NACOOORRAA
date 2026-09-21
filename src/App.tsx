import React, { useState, useEffect } from "react";
import { dbStore } from "./dbStore";
import { CandidateProfile, ToastState } from "./types";
import { useAuth } from "./context/AuthContext";
import { useLanguage } from "./context/LanguageContext";
import { AuthScreen } from "./components/AuthScreen";
import { Home } from "./pages/Home";
import { Opportunities } from "./pages/Opportunities";
import { Contacts } from "./pages/Contacts";
import { Companies } from "./pages/Companies";
import { Calendar } from "./pages/Calendar";
import { Documents } from "./pages/Documents";
import { HubIA } from "./pages/HubIA";
import { Profile } from "./pages/Profile";
import { Settings } from "./pages/Settings";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";
import { TermsOfService } from "./pages/TermsOfService";
import { NotFound } from "./pages/NotFound";
import { CookieBanner } from "./components/CookieBanner";
import { Toast, Badge } from "./components/Shared";
import { NacoraLogo, NacoraIcon, NacoraWordmark } from "./components/NacoraLogo";
import { 
  Home as HomeIcon, 
  Briefcase, 
  Calendar as CalendarIcon, 
  FileText, 
  Users, 
  Building2, 
  Sparkles, 
  User, 
  Search, 
  Menu, 
  X,
  Compass,
  MessageSquare,
  GraduationCap,
  ChevronRight,
  LogOut,
  Loader2,
  Settings as SettingsIcon
} from "lucide-react";

export default function App() {
  const { currentUser, loading, logout } = useAuth();

  const [currentView, setCurrentView] = useState<string>("accueil");
  const [activePersona, setActivePersona] = useState<string>("general");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [profile, setProfile] = useState<CandidateProfile>(dbStore.getProfile());
  const { language, t } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [toast, setToast] = useState<ToastState>({ isOpen: false, message: "", type: "info" });

  const isExpanded = sidebarOpen || isSidebarHovered;

  // Initialize DB store whenever authenticated user changes
  useEffect(() => {
    if (currentUser) {
      dbStore.initializeForUser(
        currentUser.uid,
        currentUser.email,
        currentUser.displayName
      );
    } else {
      dbStore.clearUser();
    }
  }, [currentUser]);

  useEffect(() => {
    setProfile(dbStore.getProfile());
    const unsub = dbStore.subscribe(() => {
      setProfile(dbStore.getProfile());
    });
    return unsub;
  }, []);

  // Show dynamic toast helper
  const showToast = (message: string, type: "success" | "error" | "info" | "ai") => {
    setToast({ isOpen: true, message, type });
  };

  const closeToast = () => {
    setToast((prev: ToastState) => ({ ...prev, isOpen: false }));
  };

  // Navigates and auto-closes mobile sidebar
  const handleNavigate = (view: string, personaId?: string) => {
    setCurrentView(view);
    if (personaId) {
      setActivePersona(personaId);
    }
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      dbStore.clearUser();
      showToast(t.nav.logoutConfirm, "info");
    } catch (e) {
      showToast(language === "en" ? "Error during sign out." : "Erreur lors de la déconnexion.", "error");
    }
  };

  // 1. Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-[#070913] flex flex-col items-center justify-center text-slate-100 p-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#E55B5B] to-[#FF8080] flex items-center justify-center font-black text-white text-2xl shadow-[0_0_40px_rgba(229,91,91,0.5)] mb-6 animate-pulse">
          N
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-300 font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-[#E55B5B]" />
          <span>{language === "en" ? "Loading your secure NACORA workspace..." : "Chargement de votre espace sécurisé NACORA..."}</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated state: show Auth screen or legal pages
  if (!currentUser) {
    if (currentView === "politique-confidentialite") {
      return (
        <>
          <PrivacyPolicy onBack={() => setCurrentView("accueil")} />
          <CookieBanner />
        </>
      );
    }
    if (currentView === "cgu") {
      return (
        <>
          <TermsOfService onBack={() => setCurrentView("accueil")} />
          <CookieBanner />
        </>
      );
    }
    return (
      <>
        <AuthScreen 
          onOpenPrivacy={() => setCurrentView("politique-confidentialite")}
          onOpenTerms={() => setCurrentView("cgu")}
        />
        <CookieBanner />
      </>
    );
  }

  // User display metadata
  const displayName = profile.fullName || currentUser.displayName || currentUser.email?.split("@")[0] || "Mon Profil";
  const userInitials = displayName
    .split(" ")
    .filter(Boolean)
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

  // Sidebar navigation items definitions
  const primaryNav = [
    { id: "accueil", label: t.nav.home, icon: <HomeIcon className="w-4 h-4" /> },
    { id: "opportunities", label: t.nav.opportunities, icon: <Briefcase className="w-4 h-4" /> },
    { id: "calendrier", label: t.nav.calendar, icon: <CalendarIcon className="w-4 h-4" /> },
    { id: "documents", label: t.nav.documents, icon: <FileText className="w-4 h-4" /> },
    { id: "contacts", label: t.nav.contacts, icon: <Users className="w-4 h-4" /> },
    { id: "entreprises", label: t.nav.companies, icon: <Building2 className="w-4 h-4" /> },
    { id: "settings", label: t.nav.settings, icon: <SettingsIcon className="w-4 h-4" /> }
  ];

  const aiNav = [
    { id: "general", label: t.nav.careerAiHub, icon: <Sparkles className="w-4 h-4 text-purple-400" /> },
    { id: "interview", label: t.nav.interviewCoach, icon: <GraduationCap className="w-4 h-4 text-[#c084fc]" /> },
    { id: "networking", label: t.nav.linkedinNetwork, icon: <Compass className="w-4 h-4 text-[#fbbf24]" /> },
    { id: "cv_letter", label: t.nav.cvLetterExpert, icon: <FileText className="w-4 h-4 text-[#34d399]" /> },
    { id: "negotiation", label: t.nav.salaryNegotiation, icon: <MessageSquare className="w-4 h-4 text-[#f87171]" /> }
  ];

  // Active view helper for top bar title & icon
  const activeViewInfo = (() => {
    switch (currentView) {
      case "accueil": return { label: t.nav.home, icon: <HomeIcon className="w-4 h-4 text-[#FF6685]" /> };
      case "opportunities": return { label: t.nav.opportunities, icon: <Briefcase className="w-4 h-4 text-[#38BDF8]" /> };
      case "calendrier": return { label: t.nav.calendar, icon: <CalendarIcon className="w-4 h-4 text-[#FBBF24]" /> };
      case "documents": return { label: `${t.nav.documents} & CV`, icon: <FileText className="w-4 h-4 text-[#34D399]" /> };
      case "contacts": return { label: `${t.nav.contacts} & ${language === "en" ? "Network" : "Réseau"}`, icon: <Users className="w-4 h-4 text-[#C084FC]" /> };
      case "entreprises": return { label: t.nav.companies, icon: <Building2 className="w-4 h-4 text-[#F87171]" /> };
      case "hub_ia": return { label: t.nav.careerAiHub, icon: <Sparkles className="w-4 h-4 text-[#C084FC]" /> };
      case "profile": return { label: t.nav.candidateProfile, icon: <User className="w-4 h-4 text-[#FF6685]" /> };
      case "settings": return { label: t.nav.settings, icon: <SettingsIcon className="w-4 h-4 text-[#38BDF8]" /> };
      default: return { label: t.nav.dashboard, icon: <Compass className="w-4 h-4 text-[#38BDF8]" /> };
    }
  })();

  return (
    <div className="relative min-h-screen text-[#F5F6FA] flex overflow-hidden font-sans">
      
      {/* 2. Responsive mobile navigation top bar (Only visible on mobile/tablet < lg) */}
      <header className="fixed top-0 left-0 right-0 h-14 glass-header z-40 flex items-center justify-between px-4 sm:px-6 lg:hidden">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl bg-white/5 text-[#9AA0B2] hover:text-[#F5F6FA] border border-white/10 hover:border-white/20 transition-all cursor-pointer flex items-center justify-center"
            title="Menu de navigation"
          >
            {sidebarOpen ? <X className="w-5 h-5 text-[#FF6685]" /> : <Menu className="w-5 h-5 text-[#F5F6FA]" />}
          </button>

          <div className="flex items-center gap-2">
            <NacoraLogo size="sm" showSubtitle={false} />
          </div>

          <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />

          <span className="text-xs font-semibold text-[#9AA0B2] hidden sm:flex items-center gap-1.5">
            {activeViewInfo.icon}
            <span>{activeViewInfo.label}</span>
          </span>
        </div>

        <div 
          onClick={() => handleNavigate("profile")}
          className="flex items-center gap-2 cursor-pointer p-1 rounded-xl hover:bg-white/5 transition-colors"
          title="Mon profil"
        >
          <div className="w-8 h-8 rounded-xl bg-[rgba(216,26,69,0.15)] border border-[rgba(216,26,69,0.3)] text-[#FF6685] font-bold text-xs flex items-center justify-center shadow-[0_0_10px_rgba(216,26,69,0.2)]">
            {userInitials}
          </div>
        </div>
      </header>

      {/* 3. Global Sidebar (Retractable Icon Dock collapsed by default, expands on hover) */}
      <aside 
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col
          glass-dock py-5 transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0 w-64 px-4' : '-translate-x-full lg:translate-x-0'}
          ${!sidebarOpen && (isSidebarHovered ? 'lg:w-64 px-4 shadow-[0_20px_60px_rgba(0,0,0,0.85)] border-r border-white/20' : 'lg:w-[72px] px-2.5 shadow-none')}
        `}
      >
        {/* Brand logo & title */}
        <div className={`flex items-center mb-6 pb-4 border-b border-white/10 transition-all duration-300 ${
          isExpanded ? 'px-2 gap-3' : 'justify-center px-0'
        }`}>
          <div className="relative shrink-0 flex items-center justify-center">
            <NacoraIcon className="w-9 h-9 drop-shadow-[0_0_16px_rgba(225,29,72,0.45)] cursor-pointer hover:scale-105 transition-transform" />
          </div>
          <div className={`overflow-hidden transition-all duration-300 ${
            isExpanded ? 'opacity-100 max-w-[160px]' : 'opacity-0 max-w-0 pointer-events-none'
          }`}>
            <NacoraWordmark className="h-5" />
            <span className="text-[10px] text-[#9AA0B2] uppercase tracking-widest font-semibold block mt-0.5 whitespace-nowrap">
              {language === "en" ? "Career Platform" : "Plateforme Carrière"}
            </span>
          </div>
        </div>

        {/* Sidebar Navigations */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden space-y-6 pr-0.5 no-scrollbar">
          
          {/* Main search and trackers */}
          <div className="space-y-1.5">
            <span className={`text-[10px] text-[#9AA0B2]/70 uppercase tracking-wider font-bold select-none px-2 block transition-all duration-300 whitespace-nowrap overflow-hidden ${
              isExpanded ? 'opacity-100 max-h-6 mb-1.5' : 'opacity-0 max-h-0 mb-0 pointer-events-none'
            }`}>
              {t.nav.searchAndTracking}
            </span>
            <div className="space-y-1">
              {primaryNav.map(item => {
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    title={!isExpanded ? item.label : undefined}
                    className={`
                      w-full text-left rounded-xl text-xs font-semibold flex items-center transition-all duration-200 cursor-pointer overflow-hidden
                      ${isExpanded ? 'px-3.5 py-2.5 gap-3' : 'p-2.5 justify-center'}
                      ${isActive 
                        ? 'glass-nav-active' 
                        : 'text-[#9AA0B2] hover:text-[#F5F6FA] hover:bg-white/5 border border-transparent'}
                    `}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <span className={`transition-all duration-300 whitespace-nowrap ${
                      isExpanded ? 'opacity-100 max-w-[160px]' : 'opacity-0 max-w-0 overflow-hidden pointer-events-none'
                    }`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI accelerators section */}
          <div className="space-y-1.5">
            <span className={`text-[10px] text-[#9AA0B2]/70 uppercase tracking-wider font-bold select-none px-2 flex items-center gap-1.5 transition-all duration-300 whitespace-nowrap overflow-hidden ${
              isExpanded ? 'opacity-100 max-h-6 mb-1.5' : 'opacity-0 max-h-0 mb-0 pointer-events-none'
            }`}>
              <Compass className="w-3.5 h-3.5 text-[#C084FC] shrink-0" />
              <span>{t.nav.aiAccelerators}</span>
            </span>
            <div className="space-y-1">
              {aiNav.map(item => {
                const isActive = currentView === "hub_ia" && activePersona === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate("hub_ia", item.id)}
                    title={!isExpanded ? item.label : undefined}
                    className={`
                      w-full text-left rounded-xl text-xs font-semibold flex items-center transition-all duration-200 cursor-pointer overflow-hidden
                      ${isExpanded ? 'px-3.5 py-2.5 gap-3' : 'p-2.5 justify-center'}
                      ${isActive 
                        ? 'glass-nav-active' 
                        : 'text-[#9AA0B2] hover:text-[#F5F6FA] hover:bg-white/5 border border-transparent'}
                    `}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <span className={`transition-all duration-300 whitespace-nowrap ${
                      isExpanded ? 'opacity-100 max-w-[160px]' : 'opacity-0 max-w-0 overflow-hidden pointer-events-none'
                    }`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* User profile & logout footer */}
        <div className={`mt-auto pt-4 border-t border-white/10 flex items-center transition-all duration-300 ${
          isExpanded ? 'justify-between gap-2 px-1' : 'justify-center px-0'
        }`}>
          <button 
            onClick={() => handleNavigate("profile")}
            className={`flex items-center rounded-xl hover:bg-white/5 transition-colors text-left cursor-pointer overflow-hidden ${
              isExpanded ? 'flex-1 gap-2.5 p-1.5 min-w-0' : 'p-1 justify-center'
            }`}
            title={t.nav.candidateProfile}
          >
            <div className="w-8 h-8 rounded-full bg-[rgba(216,26,69,0.18)] text-[#FF6685] border border-[rgba(216,26,69,0.35)] flex items-center justify-center font-bold text-xs shrink-0 shadow-[0_0_12px_rgba(216,26,69,0.2)]">
              {userInitials}
            </div>
            <div className={`min-w-0 flex-1 transition-all duration-300 ${
              isExpanded ? 'opacity-100 max-w-[120px]' : 'opacity-0 max-w-0 pointer-events-none overflow-hidden'
            }`}>
              <span className="block text-xs font-bold text-[#F5F6FA] truncate">{displayName}</span>
              <span className="block text-[10px] text-[#9AA0B2] truncate">{currentUser.email}</span>
            </div>
          </button>
          
          {isExpanded && (
            <button
              onClick={handleLogout}
              title={t.nav.logout}
              className="p-2 rounded-xl text-[#9AA0B2] hover:text-[#F04438] hover:bg-[rgba(240,68,56,0.12)] transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Legal links when sidebar is expanded */}
        {isExpanded && (
          <div className="pt-2 px-1 flex items-center justify-between text-[10px] text-[#9AA0B2] border-t border-white/5 mt-2">
            <button onClick={() => handleNavigate("politique-confidentialite")} className="hover:text-white transition-colors underline">
              {t.nav.privacy}
            </button>
            <span>•</span>
            <button onClick={() => handleNavigate("cgu")} className="hover:text-white transition-colors underline">
              {t.nav.terms}
            </button>
            <span>•</span>
            <span>v1.0</span>
          </div>
        )}
      </aside>

      {/* 4. Main Workspace (Scrollable Right Side, dynamically reclaiming space) */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen z-10 pt-14 lg:pt-0 pb-6 lg:pl-[72px] transition-all duration-300">
        
        {/* Harmonized Top bar (Desktop Only >= lg) */}
        <header className="hidden lg:flex h-14 glass-header px-6 items-center justify-between gap-6 sticky top-0 z-30 shrink-0">
          
          {/* Left section: Active View Context & Global Search Bar */}
          <div className="flex items-center gap-5 flex-1 max-w-2xl">
            {/* View Breadcrumb / Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 shrink-0">
              {activeViewInfo.icon}
              <span className="text-xs font-bold text-[#F5F6FA] whitespace-nowrap font-display">{activeViewInfo.label}</span>
            </div>

            <div className="h-4 w-px bg-white/10 shrink-0" />

            {/* Global Search Input with ⌘K shortcut */}
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9AA0B2]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t.nav.searchPlaceholder}
                className="w-full glass-input pl-9 pr-12 py-1.5 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60 focus:border-[#D81A45]/50 transition-all"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-semibold text-[#9AA0B2]/70 px-1.5 py-0.5 bg-white/5 border border-white/10 rounded-md pointer-events-none select-none">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Right section: Status indicators & Profile user card */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Candidate Space Status Pill */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/10 text-[#9AA0B2]">
              <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse" />
              <span className="text-[11px] font-semibold text-[#F5F6FA]">
                {profile.currentAlternance ? `${language === "en" ? "Contract" : "Alternance"} : ${profile.currentAlternance}` : t.nav.candidateSpace}
              </span>
            </div>

            {/* Connection Status Pill */}
            <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-semibold">{t.nav.aiActive}</span>
            </div>

            <div className="h-4 w-px bg-white/10 mx-0.5" />

            {/* User Profile Card */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleNavigate("profile")}
                className="flex items-center gap-2.5 cursor-pointer p-1.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group"
                title={t.nav.candidateProfile}
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#D81A45]/30 to-[#FF1A55]/20 text-[#FF6685] border border-[#D81A45]/40 flex items-center justify-center font-bold text-xs shadow-[0_0_12px_rgba(216,26,69,0.25)] group-hover:scale-105 transition-transform">
                  {userInitials}
                </div>
                <span className="text-xs font-bold text-[#F5F6FA] group-hover:text-white transition-colors truncate max-w-[130px]">
                  {displayName}
                </span>
              </button>

              <button
                onClick={handleLogout}
                title={t.nav.logout}
                className="p-2 rounded-xl text-[#9AA0B2] hover:text-[#F04438] hover:bg-[rgba(240,68,56,0.12)] border border-transparent hover:border-[rgba(240,68,56,0.2)] transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Central Workspace Canvas */}
        <div className="px-4 lg:px-6 pt-4 flex-1">
          {currentView === "accueil" && (
            <Home onNavigate={handleNavigate} showToast={showToast} />
          )}
          {currentView === "opportunities" && (
            <Opportunities showToast={showToast} searchTerm={searchTerm} />
          )}
          {currentView === "calendrier" && (
            <Calendar />
          )}
          {currentView === "documents" && (
            <Documents />
          )}
          {currentView === "contacts" && (
            <Contacts 
              showToast={showToast} 
              searchTerm={searchTerm} 
              initialSelectedContactId={selectedContactId}
              onClearInitialContact={() => setSelectedContactId(null)}
            />
          )}
          {currentView === "entreprises" && (
            <Companies 
              searchTerm={searchTerm} 
              showToast={showToast} 
              onSelectContact={(contactId) => {
                setSelectedContactId(contactId);
                handleNavigate("contacts");
              }}
            />
          )}
          {currentView === "hub_ia" && (
            <HubIA showToast={showToast} initialPersona={activePersona} />
          )}
          {currentView === "profile" && (
            <Profile />
          )}
          {currentView === "settings" && (
            <Settings showToast={showToast} onNavigate={handleNavigate} />
          )}
          {currentView === "politique-confidentialite" && (
            <PrivacyPolicy onBack={() => handleNavigate("accueil")} />
          )}
          {currentView === "cgu" && (
            <TermsOfService onBack={() => handleNavigate("accueil")} />
          )}
          {![
            "accueil", 
            "opportunities", 
            "calendrier", 
            "documents", 
            "contacts", 
            "entreprises", 
            "hub_ia", 
            "profile", 
            "settings",
            "politique-confidentialite", 
            "cgu"
          ].includes(currentView) && (
            <NotFound onGoHome={() => handleNavigate("accueil")} />
          )}
        </div>
      </main>

      {/* 5. Cookie banner & Central toast alert portal */}
      <CookieBanner />
      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={closeToast}
      />
    </div>
  );
}
