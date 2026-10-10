import React, { useState, useEffect, useMemo } from "react";
import { dbStore } from "./dbStore";
import { CandidateProfile, ToastState } from "./types";
import { useAuth } from "./context/AuthContext";
import { useLanguage } from "./context/LanguageContext";
import { AuthScreen } from "./components/AuthScreen";
import { Home } from "./pages/Home";
import { Opportunities } from "./pages/Opportunities";
import { Contacts } from "./pages/Contacts";
import { Messages } from "./pages/Messages";
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
import { Toast, Badge, Modal } from "./components/Shared";
import { NacoraLogo, NacoraIcon, NacoraWordmark } from "./components/NacoraLogo";
import { NotificationCenterModal } from "./components/NotificationCenterModal";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { adminService } from "./services/adminService";
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
  Settings as SettingsIcon, 
  Target,
  ExternalLink,
  Bell,
  Shield
} from "lucide-react";

export default function App() {
  const { currentUser, loading, logout } = useAuth();

  const [currentView, setCurrentView] = useState<string>(() => {
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
      return "admin";
    }
    return "accueil";
  });
  const [activePersona, setActivePersona] = useState<string>("general");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [profile, setProfile] = useState<CandidateProfile>(dbStore.getProfile());
  const [contacts, setContacts] = useState(dbStore.getContacts());
  const { language, t } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [toast, setToast] = useState<ToastState>({ isOpen: false, message: "", type: "info" });
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  // Sync browser back/forward buttons with admin view
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== "undefined") {
        if (window.location.pathname.startsWith("/admin")) {
          setCurrentView("admin");
        } else if (currentView === "admin") {
          setCurrentView("accueil");
        }
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [currentView]);

  const pendingNotificationsCount = useMemo(() => {
    let count = 0;
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    // Contact replies & followups
    contacts.forEach(c => {
      if (c.networkingStatus === "reponse_recue" || c.networkingStatus === "reponse_a_traiter") count++;
      else if (c.networkingStatus === "relance_a_faire" || (c.nextFollowUpDate && c.nextFollowUpDate <= todayStr)) count++;
    });

    // Opportunities deadlines under 7 days
    const opps = dbStore.getOpportunities();
    opps.forEach(o => {
      if (o.deadline) {
        const d = new Date(o.deadline);
        const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 7) count++;
      }
    });

    return count;
  }, [contacts]);

  const isExpanded = sidebarOpen || isSidebarHovered;

  // Initialize DB store and record active session on authenticated user login
  useEffect(() => {
    if (currentUser) {
      dbStore.initializeForUser(
        currentUser.uid,
        currentUser.email,
        currentUser.displayName
      );
      // Asynchronously track application session in backend
      adminService.recordClientSession(
        currentUser.uid,
        currentUser.email || undefined,
        currentUser.displayName || undefined
      );
    } else {
      dbStore.clearUser();
    }
  }, [currentUser]);

  const [syncStatus, setSyncStatus] = useState(dbStore.getSyncStatus());

  useEffect(() => {
    setProfile(dbStore.getProfile());
    setContacts(dbStore.getContacts());
    setSyncStatus(dbStore.getSyncStatus());
    const unsub = dbStore.subscribe(() => {
      setProfile(dbStore.getProfile());
      setContacts(dbStore.getContacts());
      setSyncStatus(dbStore.getSyncStatus());
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
    if (view === "admin") {
      setCurrentView("admin");
      window.history.pushState({}, "", "/admin");
      setSidebarOpen(false);
      return;
    }
    if (currentView === "admin") {
      window.history.pushState({}, "", "/");
    }
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

  // 3. Isolated Admin workspace view: Render dedicated Admin Console with dedicated Admin Sidebar
  if (currentView === "admin") {
    return (
      <AdminLayout 
        onReturnToApp={() => {
          setCurrentView("accueil");
          window.history.pushState({}, "", "/");
        }} 
      />
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

  // Count contacts needing urgent attention (reply or follow-up due)
  const urgentContactsCount = contacts.filter(c => 
    c.networkingStatus === "reponse_recue" || 
    c.networkingStatus === "reponse_a_traiter" || 
    c.networkingStatus === "relance_a_faire"
  ).length;

  // Sidebar navigation items definitions
  const primaryNav = [
    { id: "accueil", label: t.nav.home, icon: <HomeIcon className="w-4 h-4" /> },
    { id: "opportunities", label: t.nav.opportunities, icon: <Briefcase className="w-4 h-4" /> },
    { 
      id: "messages", 
      label: t.nav.messages, 
      icon: <MessageSquare className="w-4 h-4" />,
      badge: urgentContactsCount > 0 ? urgentContactsCount : undefined
    },
    { id: "calendrier", label: t.nav.calendar, icon: <CalendarIcon className="w-4 h-4" /> },
    { id: "documents", label: t.nav.documents, icon: <FileText className="w-4 h-4" /> },
    { id: "contacts", label: t.nav.contacts, icon: <Users className="w-4 h-4" /> },
    { id: "entreprises", label: t.nav.companies, icon: <Building2 className="w-4 h-4" /> },
    { id: "settings", label: t.nav.settings, icon: <SettingsIcon className="w-4 h-4" /> },
    { id: "admin", label: "Console Admin", icon: <Shield className="w-4 h-4 text-[#FF6685]" /> }
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
      case "messages": return { label: "Messages & Suivi", icon: <MessageSquare className="w-4 h-4 text-[#FF6685]" /> };
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

        <div className="flex items-center gap-2">
          {/* Bouton Notification Mobile (iOS 27 Glass) */}
          <button
            onClick={() => setIsNotificationModalOpen(true)}
            className="relative p-2.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-[#9AA0B2] hover:text-[#F5F6FA] transition-all cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.25)] backdrop-blur-2xl active:scale-95"
            title="Notifications & Alertes"
          >
            <Bell className="w-4 h-4" />
            {pendingNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-0.5 rounded-full bg-gradient-to-tr from-[#D81A45] to-[#FF6685] text-white text-[9px] font-black flex items-center justify-center shadow-[0_0_8px_rgba(216,26,69,0.7),inset_0_1px_1px_rgba(255,255,255,0.4)] ring-2 ring-[#0B0F19]">
                {pendingNotificationsCount}
              </span>
            )}
          </button>

          {(syncStatus.cloudStatus === "offline" || syncStatus.cloudStatus === "quota_exceeded") && (
            <button 
              onClick={() => setIsQuotaModalOpen(true)}
              className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 font-medium cursor-pointer hover:bg-amber-500/20 transition-colors"
              title="Cliquez pour voir les détails du mode local et des quotas"
            >
              Mode local
            </button>
          )}
          <div 
            onClick={() => handleNavigate("profile")}
            className="flex items-center gap-2 cursor-pointer p-1 rounded-xl hover:bg-white/5 transition-colors"
            title="Mon profil"
          >
            <div className="w-8 h-8 rounded-xl bg-[rgba(216,26,69,0.15)] border border-[rgba(216,26,69,0.3)] text-[#FF6685] font-bold text-xs flex items-center justify-center shadow-[0_0_10px_rgba(216,26,69,0.2)]">
              {userInitials}
            </div>
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
                    <span className="shrink-0 relative">
                      {item.icon}
                      {(item as any).badge && !isExpanded && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#FF6685] ring-2 ring-[#0B0F19]" />
                      )}
                    </span>
                    <span className={`transition-all duration-300 whitespace-nowrap flex-1 flex items-center justify-between ${
                      isExpanded ? 'opacity-100 max-w-[160px]' : 'opacity-0 max-w-0 overflow-hidden pointer-events-none'
                    }`}>
                      <span>{item.label}</span>
                      {(item as any).badge && (
                        <span className="px-1.5 py-0.2 rounded-full bg-[rgba(216,26,69,0.2)] text-[#FF6685] border border-[rgba(216,26,69,0.35)] text-[10px] font-bold">
                          {(item as any).badge}
                        </span>
                      )}
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

            {/* Non-blocking Offline / Cloud Sync Indicator */}
            {(syncStatus.cloudStatus === "offline" || syncStatus.cloudStatus === "quota_exceeded") && (
              <button 
                onClick={() => setIsQuotaModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 transition-all cursor-pointer"
                title="Cliquez pour voir les détails du mode local et des quotas"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-[11px] font-semibold hidden md:inline">
                  {syncStatus.cloudStatus === "quota_exceeded" ? "Quota Firestore atteint — Mode local" : "Synchronisation cloud indisponible — Mode local"}
                </span>
                <span className="text-[11px] font-semibold md:hidden">Mode local</span>
              </button>
            )}
            {syncStatus.cloudStatus === "connected" && (
              <div className="hidden 2xl:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[11px] font-semibold">Cloud synchronisé</span>
              </div>
            )}

            {/* Notification Bell Button (Desktop iOS 27 Glass) */}
            <button
              onClick={() => setIsNotificationModalOpen(true)}
              className="relative p-2.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 hover:border-white/25 text-[#9AA0B2] hover:text-[#F5F6FA] transition-all cursor-pointer group shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.25)] backdrop-blur-2xl active:scale-95"
              title="Notifications & Alertes"
            >
              <Bell className="w-4 h-4 text-[#9AA0B2] group-hover:text-white transition-colors" />
              {pendingNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-tr from-[#D81A45] to-[#FF6685] text-white text-[10px] font-black flex items-center justify-center shadow-[0_0_10px_rgba(216,26,69,0.7),inset_0_1px_1px_rgba(255,255,255,0.4)] ring-2 ring-[#0B0F19] animate-pulse">
                  {pendingNotificationsCount}
                </span>
              )}
            </button>

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
          {currentView === "messages" && (
            <Messages 
              showToast={showToast} 
              searchTerm={searchTerm} 
              initialContactId={selectedContactId}
              onClearInitialContact={() => setSelectedContactId(null)}
              onNavigateToContacts={(contactId?: string) => {
                if (contactId) setSelectedContactId(contactId);
                handleNavigate("contacts");
              }}
            />
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
            "messages", 
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

      {/* 6. Modal d'information Quota Firestore & Mode Local */}
      {isQuotaModalOpen && (
        <Modal
          isOpen={isQuotaModalOpen}
          onClose={() => setIsQuotaModalOpen(false)}
          title="Mode Hors-Ligne & Synchronisation Cloud"
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 mt-1 shrink-0 animate-pulse" />
              <div className="space-y-1">
                <span className="font-bold text-amber-300 block">
                  Quota gratuit journalier Firestore atteint (Spark Plan)
                </span>
                <p className="text-[#F5F6FA] leading-relaxed">
                  La limite quotidienne gratuite d'écritures Firestore a été atteinte pour aujourd'hui. 
                  L'application a automatiquement basculé sur le mode local sécurisé.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-1.5">
              <span className="font-bold text-emerald-300 block">
                ✓ Vos données sont protégées (0 perte de données)
              </span>
              <p className="text-[#9AA0B2] leading-relaxed">
                Toutes vos actions, contacts, messages, relances et opportunités sont instantanément enregistrés dans le stockage local de votre navigateur (LocalStorage). Vous pouvez continuer à utiliser l'application normalement.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9AA0B2] block">
                Que va-t-il se passer ?
              </span>
              <ul className="space-y-1.5 text-[#9AA0B2] list-disc list-inside">
                <li>Le quota cloud gratuit se réinitialise automatiquement chaque jour (toutes les 24h).</li>
                <li>Dès réinitialisation, la synchronisation cloud reprendra sans action requise de votre part.</li>
                <li>Vous pouvez également consulter votre base ou activer la facturation Firebase (Blaze) pour lever les plafonds gratuits.</li>
              </ul>
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-3">
              <a
                href="https://console.firebase.google.com/project/sturdy-turbine-17dgj/firestore/databases/ai-studio-nacora-b2fd733f-7ae2-4600-af7a-5faf7bad6765/data?openUpgradeDialog=true"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors"
              >
                <span>Ouvrir la console Firebase</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={() => setIsQuotaModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#D81A45] hover:bg-[#D81A45]/90 text-white font-bold text-xs cursor-pointer transition-all shadow-[0_0_12px_rgba(216,26,69,0.25)]"
              >
                Compris
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Centre de Notifications Liquid Glass global */}
      <NotificationCenterModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        contacts={contacts}
        opportunities={dbStore.getOpportunities()}
        companies={dbStore.getCompanies()}
        onNavigate={(view, targetId) => {
          if (view === "messages" && targetId) {
            setSelectedContactId(targetId);
          }
          handleNavigate(view);
        }}
        showToast={showToast}
      />
    </div>
  );
}
