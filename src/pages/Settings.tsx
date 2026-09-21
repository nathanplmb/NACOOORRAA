import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { dbStore } from "../dbStore";
import { 
  User, 
  Shield, 
  Bell, 
  Monitor, 
  Download, 
  Upload,
  Link2, 
  HelpCircle, 
  AlertTriangle, 
  Check, 
  ChevronRight, 
  LogOut, 
  Trash2, 
  Globe, 
  Moon, 
  Mail, 
  Key, 
  Laptop, 
  ExternalLink,
  X
} from "lucide-react";

interface SettingsProps {
  showToast: (message: string, type: "success" | "error" | "info" | "ai") => void;
  onNavigate: (view: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({ showToast, onNavigate }) => {
  const { currentUser, logout } = useAuth();
  const profile = dbStore.getProfile();

  // Local state for settings form fields & toggles
  const [firstName, setFirstName] = useState(profile.fullName?.split(" ")[0] || currentUser?.displayName?.split(" ")[0] || "Candidat");
  const [lastName, setLastName] = useState(profile.fullName?.split(" ").slice(1).join(" ") || currentUser?.displayName?.split(" ").slice(1).join(" ") || "NACORA");
  const [email, setEmail] = useState(currentUser?.email || profile.email || "candidat@nacora.app");
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Notification toggles
  const [notifs, setNotifs] = useState({
    general: true,
    opportunities: true,
    applications: true,
    reminders: true,
    network: false,
    ai: true,
    email: true
  });

  // App preferences (Language real functionality)
  const { language, setLanguage } = useLanguage();

  const handleLanguageChange = (lang: "fr" | "en") => {
    setLanguage(lang);
    showToast(lang === "en" ? "Interface successfully switched to English." : "Interface basculée en Français.", "success");
  };

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedName = `${firstName.trim()} ${lastName.trim()}`;
    dbStore.updateProfile({ fullName: updatedName, email: email.trim() });
    setIsEditingProfile(false);
    showToast(language === "en" ? "Profile updated successfully." : "Informations du profil mises à jour avec succès.", "success");
  };

  const handleExportData = () => {
    showToast(language === "en" ? "Preparing personal data export..." : "Préparation de l'export des données personnelles en cours...", "info");
    setTimeout(() => {
      const dataDump = {
        exportDate: new Date().toISOString(),
        user: currentUser,
        profile: dbStore.getProfile(),
        opportunities: dbStore.getOpportunities(),
        contacts: dbStore.getContacts(),
        companies: dbStore.getCompanies(),
        calendarEvents: dbStore.getCalendarEvents(),
        documents: dbStore.getDocuments(),
        chatSessions: dbStore.getChatSessions()
      };
      const blob = new Blob([JSON.stringify(dataDump, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nacora-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(language === "en" ? "Export downloaded successfully." : "Export des données téléchargé avec succès.", "success");
    }, 800);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const success = dbStore.importFullBackup(parsed);
        if (success) {
          showToast(language === "en" ? "Data successfully imported and synced to Firebase!" : "Données importées et synchronisées avec succès sur Firebase !", "success");
        } else {
          showToast(language === "en" ? "Invalid backup file format." : "Format de fichier de sauvegarde invalide.", "error");
        }
      } catch (err) {
        console.error("Import error:", err);
        showToast(language === "en" ? "Error reading JSON file." : "Erreur lors de la lecture du fichier JSON.", "error");
      }
    };
    reader.readAsText(file);
    // Reset file input value to allow re-uploading the same file if needed
    e.target.value = "";
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmText !== "SUPPRIMER" && deleteConfirmText !== "DELETE") {
      showToast(language === "en" ? "Please type exactly SUPPRIMER/DELETE to confirm." : "Veuillez saisir exactement SUPPRIMER pour confirmer.", "error");
      return;
    }
    setShowDeleteModal(false);
    showToast(language === "en" ? "Account deletion requested. Logging out..." : "Demande de suppression prise en compte. Déconnexion...", "info");
    setTimeout(() => {
      logout();
    }, 1500);
  };

  const t = {
    fr: {
      title: "Paramètres du compte & Préférences",
      subtitle: "Gérez votre identité NACORA, vos préférences de sécurité et vos intégrations.",
      synced: "Compte Synchronisé",
      account: "Mon Compte",
      accountSub: "Informations personnelles et identité de connexion",
      edit: "Modifier",
      cancel: "Annuler",
      save: "Enregistrer les modifications",
      firstName: "Prénom",
      lastName: "Nom",
      emailGoogle: "Adresse e-mail (gérée par Google)",
      emailNotice: "L'adresse e-mail est liée à votre authentification Google sécurisée.",
      status: "Statut",
      active: "Actif",
      memberSince: "Membre depuis",
      googleConnected: "Connecté avec Google",
      security: "Sécurité & Sessions",
      securitySub: "Authentification Google et gestion de vos accès",
      passwordTitle: "Mot de passe et authentification",
      passwordNotice: "Votre compte utilise Google pour l'authentification. La gestion de votre mot de passe et de la double authentification (2FA) s'effectue directement depuis votre compte Google.",
      activeSessions: "Sessions actives",
      currentSession: "Session active actuelle",
      sessionSecure: "Connexion sécurisée via Google",
      thisSession: "Cette session",
      notifications: "Notifications",
      notificationsSub: "Personnalisez vos alertes et canaux de réception",
      notifGeneral: "Notifications générales",
      notifGeneralDesc: "Annonces importantes et mises à jour NACORA",
      notifOpp: "Nouvelles opportunités",
      notifOppDesc: "Alertes sur les offres correspondant à votre profil",
      notifApp: "Suivi des candidatures",
      notifAppDesc: "Changements de statut et relances planifiées",
      notifRem: "Rappels et entretiens",
      notifRemDesc: "Notifications d'agenda avant vos rendez-vous",
      notifNet: "Réseau et contacts",
      notifNetDesc: "Activité de vos contacts et recruteurs cibles",
      notifAi: "Notifications IA",
      notifAiDesc: "Synthèses hebdomadaires et suggestions intelligentes",
      notifEmail: "Notifications par e-mail",
      notifEmailDesc: "Recevoir un récapitulatif par e-mail",
      appPrefs: "Préférences de l'application",
      appPrefsSub: "Apparence visuelle et langue de l'interface",
      themeTitle: "Thème de l'application",
      darkGlass: "Liquid Glass Sombre",
      darkGlassDesc: "Thème immersif haut de gamme NACORA",
      languageLabel: "Langue de l'interface",
      dataExport: "Données et Export",
      dataExportSub: "Téléchargez une copie complète de vos données personnelles",
      dataExportDesc: "Conformément au RGPD, vous pouvez à tout moment exporter l'ensemble des données enregistrées dans votre espace NACORA.",
      includedData: "Données incluses dans l'export :",
      exportBtn: "Exporter mes données (JSON)",
      importBtn: "Importer une sauvegarde (JSON)",
      connections: "Connexions & Intégrations",
      connectionsSub: "Services tiers liés à votre compte NACORA",
      support: "Support & Ressources",
      supportSub: "Assistance et documentation officielle",
      helpCenter: "Centre d'aide & FAQ",
      contactSupport: "Contacter le support",
      reportIssue: "Signaler un problème",
      privacyPolicy: "Politique de confidentialité",
      dangerZone: "Zone Dangereuse",
      dangerSub: "Actions sensibles relatives à votre session et votre compte",
      logout: "Se déconnecter",
      deleteAccount: "Supprimer définitivement mon compte",
      deleteDesc: "Efface définitivement toutes vos données de nos serveurs",
      deleteModalTitle: "Supprimer votre compte ?",
      deleteModalDesc: "Cette action supprimera définitivement votre compte NACORA ainsi que l'ensemble des données qui lui sont associées (candidatures, contacts, documents).",
      deleteWarning: "Cette action est irréversible.",
      typeDelete: "Tapez SUPPRIMER pour confirmer :",
      confirmDeleteBtn: "Supprimer définitivement"
    },
    en: {
      title: "Account Settings & Preferences",
      subtitle: "Manage your NACORA identity, security preferences and integrations.",
      synced: "Account Synced",
      account: "My Account",
      accountSub: "Personal information and connection identity",
      edit: "Edit",
      cancel: "Cancel",
      save: "Save changes",
      firstName: "First Name",
      lastName: "Last Name",
      emailGoogle: "Email address (managed by Google)",
      emailNotice: "Email address is linked to your secure Google authentication.",
      status: "Status",
      active: "Active",
      memberSince: "Member since",
      googleConnected: "Connected with Google",
      security: "Security & Sessions",
      securitySub: "Google authentication and access management",
      passwordTitle: "Password & Authentication",
      passwordNotice: "Your account uses Google for authentication. Password and 2FA management is handled directly through your Google account.",
      activeSessions: "Active Sessions",
      currentSession: "Current active session",
      sessionSecure: "Secure connection via Google",
      thisSession: "This session",
      notifications: "Notifications",
      notificationsSub: "Customize your alerts and reception channels",
      notifGeneral: "General notifications",
      notifGeneralDesc: "Important NACORA announcements and updates",
      notifOpp: "New opportunities",
      notifOppDesc: "Alerts on job offers matching your profile",
      notifApp: "Application tracking",
      notifAppDesc: "Status updates and scheduled follow-ups",
      notifRem: "Reminders & interviews",
      notifRemDesc: "Calendar notifications before your meetings",
      notifNet: "Network & contacts",
      notifNetDesc: "Activity from your contacts and target recruiters",
      notifAi: "AI notifications",
      notifAiDesc: "Weekly summaries and smart suggestions",
      notifEmail: "Email notifications",
      notifEmailDesc: "Receive summary emails",
      appPrefs: "Application Preferences",
      appPrefsSub: "Visual appearance and interface language",
      themeTitle: "Application Theme",
      darkGlass: "Liquid Glass Dark",
      darkGlassDesc: "NACORA premium immersive theme",
      languageLabel: "Interface Language",
      dataExport: "Data & Export",
      dataExportSub: "Download a complete copy of your personal data",
      dataExportDesc: "In accordance with GDPR, you can export all your NACORA workspace data at any time.",
      includedData: "Data included in export:",
      exportBtn: "Export my data (JSON)",
      importBtn: "Import backup (JSON)",
      connections: "Connections & Integrations",
      connectionsSub: "Third-party services linked to your NACORA account",
      support: "Support & Resources",
      supportSub: "Assistance and official documentation",
      helpCenter: "Help Center & FAQ",
      contactSupport: "Contact Support",
      reportIssue: "Report an issue",
      privacyPolicy: "Privacy Policy",
      dangerZone: "Danger Zone",
      dangerSub: "Sensitive actions related to your session and account",
      logout: "Log out",
      deleteAccount: "Delete my account permanently",
      deleteDesc: "Permanently erase all your data from our servers",
      deleteModalTitle: "Delete your account?",
      deleteModalDesc: "This action will permanently delete your NACORA account and all associated data (applications, contacts, documents).",
      deleteWarning: "This action is irreversible.",
      typeDelete: "Type DELETE to confirm:",
      confirmDeleteBtn: "Permanently delete"
    }
  }[language];

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto space-y-6 pb-16 animate-fade-in">
      {/* Softened Neutral Ambient Light Halos */}
      <div className="fixed top-12 left-1/4 w-[450px] h-[450px] bg-white/[0.02] rounded-full blur-[160px] pointer-events-none -z-10" />
      <div className="fixed top-1/3 right-10 w-[500px] h-[500px] bg-white/[0.015] rounded-full blur-[180px] pointer-events-none -z-10" />
      <div className="fixed bottom-10 left-1/3 w-[400px] h-[400px] bg-white/[0.02] rounded-full blur-[150px] pointer-events-none -z-10" />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-white/12 relative">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-[#F5F6FA] font-display tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-white/15 flex items-center justify-center text-[#9AA0B2] shadow-lg">
                <User className="w-5 h-5" />
              </div>
              {t.title}
            </h1>
            <span className="px-3.5 py-1 rounded-full bg-white/[0.06] border border-white/15 text-[#9AA0B2] text-xs font-bold font-display backdrop-blur-xl">
              {t.synced}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#9AA0B2] max-w-3xl">
            {t.subtitle}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Quick Navigation Anchor List */}
        <div className="hidden lg:block lg:col-span-4 xl:col-span-3 sticky top-20 z-20 space-y-4">
          <div className="glass-panel relative overflow-hidden p-3.5 rounded-3xl space-y-2 shadow-[0_25px_60px_-10px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.3)] border border-white/12">
            <div className="absolute top-0 left-0 w-full h-16 bg-gradient-to-b from-white/[0.12] to-transparent pointer-events-none" />

            <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#9AA0B2]/90 flex items-center justify-between border-b border-white/10 pb-2.5 relative z-10 font-display">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#9AA0B2]" />
                Navigation
              </span>
            </div>

            <div className="space-y-1 relative z-10">
              {[
                { href: "#compte", label: t.account, icon: User },
                { href: "#securite", label: t.security, icon: Shield },
                { href: "#notifications", label: t.notifications, icon: Bell },
                { href: "#apparence", label: t.appPrefs, icon: Monitor },
                { href: "#donnees", label: t.dataExport, icon: Download },
                { href: "#connexions", label: t.connections, icon: Link2 },
                { href: "#support", label: t.support, icon: HelpCircle },
                { href: "#danger", label: t.dangerZone, icon: AlertTriangle },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#9AA0B2] hover:text-[#F5F6FA] bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-white/15 transition-all shadow-sm"
                  >
                    <Icon className="w-4 h-4 text-[#9AA0B2] shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Settings Sections */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
          
          {/* 1. MON COMPTE */}
          <section id="compte" className="glass-panel rounded-3xl p-6 sm:p-8 backdrop-blur-3xl space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.7)] border border-white/12 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#D81A45] via-[#FF6685] to-transparent" />
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#D81A45]/20 border border-[#D81A45]/30 text-[#FF6685] flex items-center justify-center font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-wide">{t.account}</h2>
                  <p className="text-[11px] text-[#9AA0B2]">{t.accountSub}</p>
                </div>
              </div>
              {!isEditingProfile && (
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-semibold text-white transition-all cursor-pointer shadow-sm"
                >
                  {t.edit}
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#D81A45] to-[#FF6685] text-white flex items-center justify-center font-black text-2xl shadow-lg border border-white/25">
                  {firstName[0]}{lastName[0]}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#34D399] border-2 border-[#060812] flex items-center justify-center" title="Actif">
                  <Check className="w-3 h-3 text-slate-950 font-bold" />
                </div>
              </div>

              <div className="flex-1 space-y-2 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h3 className="text-base font-bold text-white">{firstName} {lastName}</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-[10px] font-semibold">
                    {t.googleConnected}
                  </span>
                </div>
                <p className="text-xs text-[#9AA0B2] flex items-center justify-center sm:justify-start gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#9AA0B2]" />
                  {email}
                </p>
                <div className="text-[11px] text-[#9AA0B2] pt-1 flex items-center justify-center sm:justify-start gap-4">
                  <span>{t.status} : <strong className="text-emerald-400 font-semibold">{t.active}</strong></span>
                  <span>{t.memberSince} : <strong className="text-white font-semibold">Septembre 2026</strong></span>
                </div>
              </div>
            </div>

            {isEditingProfile && (
              <form onSubmit={handleSaveProfile} className="pt-4 border-t border-white/10 space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#9AA0B2]">{t.firstName}</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full glass-input px-3 py-2 text-xs text-white"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#9AA0B2]">{t.lastName}</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full glass-input px-3 py-2 text-xs text-white"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#9AA0B2]">{t.emailGoogle}</label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full glass-input px-3 py-2 text-xs text-[#9AA0B2] bg-white/[0.02] cursor-not-allowed"
                  />
                  <p className="text-[10px] text-[#9AA0B2]/70">{t.emailNotice}</p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#9AA0B2] hover:text-white transition-colors cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#D81A45] hover:bg-[#c0153c] text-xs font-bold text-white transition-colors shadow-lg shadow-[#D81A45]/30 cursor-pointer"
                  >
                    {t.save}
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* 2. SÉCURITÉ */}
          <section id="securite" className="glass-panel rounded-3xl p-6 sm:p-8 backdrop-blur-3xl space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.7)] border border-white/12 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#38BDF8] via-[#34D399] to-transparent" />
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
              <div className="w-10 h-10 rounded-2xl bg-[#38BDF8]/20 border border-[#38BDF8]/30 text-[#38BDF8] flex items-center justify-center font-bold">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">{t.security}</h2>
                <p className="text-[11px] text-[#9AA0B2]">{t.securitySub}</p>
              </div>
            </div>

            {/* Mot de passe (Google Auth notice) */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Key className="w-4 h-4 text-[#38BDF8]" />
                <span>{t.passwordTitle}</span>
              </div>
              <p className="text-xs text-[#9AA0B2] leading-relaxed">
                {t.passwordNotice}
              </p>
            </div>

            {/* Sessions actives */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">{t.activeSessions}</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-xs">
                  <div className="flex items-center gap-3">
                    <Laptop className="w-4 h-4 text-[#34D399]" />
                    <div>
                      <p className="font-semibold text-white">{t.currentSession}</p>
                      <p className="text-[10px] text-[#9AA0B2]">{t.sessionSecure}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md bg-[#34D399]/10 text-[#34D399] text-[10px] font-bold">
                    {t.thisSession}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* 3. NOTIFICATIONS */}
          <section id="notifications" className="glass-panel rounded-3xl p-6 sm:p-8 backdrop-blur-3xl space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.7)] border border-white/12 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FBBF24] via-[#F59E0B] to-transparent" />
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
              <div className="w-10 h-10 rounded-2xl bg-[#FBBF24]/20 border border-[#FBBF24]/30 text-[#FBBF24] flex items-center justify-center font-bold">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">{t.notifications}</h2>
                <p className="text-[11px] text-[#9AA0B2]">{t.notificationsSub}</p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { id: "general", label: t.notifGeneral, desc: t.notifGeneralDesc },
                { id: "opportunities", label: t.notifOpp, desc: t.notifOppDesc },
                { id: "applications", label: t.notifApp, desc: t.notifAppDesc },
                { id: "reminders", label: t.notifRem, desc: t.notifRemDesc },
                { id: "network", label: t.notifNet, desc: t.notifNetDesc },
                { id: "ai", label: t.notifAi, desc: t.notifAiDesc },
                { id: "email", label: t.notifEmail, desc: t.notifEmailDesc },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-xs font-bold text-white">{item.label}</p>
                    <p className="text-[10px] text-[#9AA0B2]">{item.desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNotifs(prev => ({ ...prev, [item.id]: !prev[item.id as keyof typeof notifs] }));
                      showToast(language === "en" ? "Notification preference updated." : "Préférence de notification mise à jour.", "info");
                    }}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                      notifs[item.id as keyof typeof notifs] ? 'bg-[#D81A45]' : 'bg-white/10'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      notifs[item.id as keyof typeof notifs] ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* 4. PRÉFÉRENCES DE L'APPLICATION */}
          <section id="apparence" className="glass-panel rounded-3xl p-6 sm:p-8 backdrop-blur-3xl space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.7)] border border-white/12 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#34D399] via-[#10B981] to-transparent" />
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
              <div className="w-10 h-10 rounded-2xl bg-[#34D399]/20 border border-[#34D399]/30 text-[#34D399] flex items-center justify-center font-bold">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">{t.appPrefs}</h2>
                <p className="text-[11px] text-[#9AA0B2]">{t.appPrefsSub}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Thème Liquid Glass (Standard Nacora) */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#9AA0B2]">{t.themeTitle}</label>
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <Moon className="w-4 h-4 text-[#FF6685]" />
                    <div>
                      <p className="font-semibold text-white">{t.darkGlass}</p>
                      <p className="text-[10px] text-[#9AA0B2]">{t.darkGlassDesc}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#D81A45]/20 text-[#FF6685] text-[10px] font-bold">
                    Actif
                  </span>
                </div>
              </div>

              {/* Langue */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#9AA0B2]">{t.languageLabel}</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "fr", label: "Français" },
                    { id: "en", label: "English" },
                  ].map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => handleLanguageChange(l.id as any)}
                      className={`flex items-center justify-center p-3.5 rounded-2xl border text-xs font-semibold transition-all cursor-pointer ${
                        language === l.id 
                          ? 'bg-gradient-to-r from-[#D81A45] to-[#FF1A55] text-white shadow-[0_0_20px_rgba(216,26,69,0.5)] border-[#FF6685]/70' 
                          : 'bg-white/5 border-white/10 text-[#9AA0B2] hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5 mr-2 text-[#9AA0B2]" />
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 5. DONNÉES ET EXPORT */}
          <section id="donnees" className="glass-panel rounded-3xl p-6 sm:p-8 backdrop-blur-3xl space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.7)] border border-white/12 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#38BDF8] via-[#0284C7] to-transparent" />
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
              <div className="w-10 h-10 rounded-2xl bg-[#38BDF8]/20 border border-[#38BDF8]/30 text-[#38BDF8] flex items-center justify-center font-bold">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">{t.dataExport}</h2>
                <p className="text-[11px] text-[#9AA0B2]">{t.dataExportSub}</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-[#9AA0B2] leading-relaxed">
                {t.dataExportDesc}
              </p>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-xs space-y-2">
                <p className="font-semibold text-white">{t.includedData}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-[#9AA0B2]">
                  <span>• Profil candidat</span>
                  <span>• Expériences</span>
                  <span>• Formations</span>
                  <span>• Compétences</span>
                  <span>• Contacts</span>
                  <span>• Opportunités</span>
                  <span>• Candidatures</span>
                  <span>• Préférences</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleExportData}
                  className="px-4.5 py-3 rounded-2xl bg-[#38BDF8] hover:bg-[#2597cc] text-slate-950 font-bold text-xs transition-all flex items-center gap-2 shadow-[0_0_25px_rgba(56,189,248,0.4)] cursor-pointer hover:-translate-y-0.5"
                >
                  <Download className="w-4 h-4" />
                  {t.exportBtn}
                </button>

                <label className="px-4.5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-all flex items-center gap-2 border border-white/15 cursor-pointer hover:-translate-y-0.5 shadow-sm">
                  <Upload className="w-4 h-4 text-[#38BDF8]" />
                  {t.importBtn}
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </section>

          {/* 6. CONNEXIONS */}
          <section id="connexions" className="glass-panel rounded-3xl p-6 sm:p-8 backdrop-blur-3xl space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.7)] border border-white/12 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#34D399] via-[#059669] to-transparent" />
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
              <div className="w-10 h-10 rounded-2xl bg-[#34D399]/20 border border-[#34D399]/30 text-[#34D399] flex items-center justify-center font-bold">
                <Link2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">{t.connections}</h2>
                <p className="text-[11px] text-[#9AA0B2]">{t.connectionsSub}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.19v3.15C3.17 21.36 7.23 24 12 24z" />
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.19C.43 8.1 0 9.99 0 12s.43 3.9 1.19 5.42l4.09-3.15z" />
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.23 0 3.17 2.64 1.19 6.58l4.09 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Google Account</h3>
                    <p className="text-[10px] text-[#9AA0B2]">{t.sessionSecure}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-[#34D399]/10 border border-[#34D399]/25 text-[#34D399] text-[10px] font-bold">
                    Connecté
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* 7. SUPPORT */}
          <section id="support" className="glass-panel rounded-3xl p-6 sm:p-8 backdrop-blur-3xl space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.7)] border border-white/12 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FBBF24] via-[#D97706] to-transparent" />
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
              <div className="w-10 h-10 rounded-2xl bg-[#FBBF24]/20 border border-[#FBBF24]/30 text-[#FBBF24] flex items-center justify-center font-bold">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">{t.support}</h2>
                <p className="text-[11px] text-[#9AA0B2]">{t.supportSub}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <button
                type="button"
                onClick={() => showToast(language === "en" ? "Redirecting to help center." : "Redirection vers le centre d'aide NACORA.", "info")}
                className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 transition-all text-white font-medium cursor-pointer"
              >
                <span>{t.helpCenter}</span>
                <ChevronRight className="w-4 h-4 text-[#9AA0B2]" />
              </button>

              <button
                type="button"
                onClick={() => showToast(language === "en" ? "Opening support." : "Ouverture du support technique NACORA.", "info")}
                className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 transition-all text-white font-medium cursor-pointer"
              >
                <span>{t.contactSupport}</span>
                <ChevronRight className="w-4 h-4 text-[#9AA0B2]" />
              </button>

              <button
                type="button"
                onClick={() => showToast(language === "en" ? "Report form opened." : "Formulaire de signalement ouvert.", "info")}
                className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 transition-all text-white font-medium cursor-pointer"
              >
                <span>{t.reportIssue}</span>
                <ChevronRight className="w-4 h-4 text-[#9AA0B2]" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate("politique-confidentialite")}
                className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 transition-all text-white font-medium cursor-pointer"
              >
                <span>{t.privacyPolicy}</span>
                <ExternalLink className="w-4 h-4 text-[#9AA0B2]" />
              </button>
            </div>
          </section>

          {/* 8. ZONE DANGEREUSE */}
          <section id="danger" className="glass-panel rounded-3xl p-6 sm:p-8 backdrop-blur-3xl space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.7)] border border-red-500/30 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-rose-600 to-transparent" />
            <div className="flex items-center gap-3 pb-4 border-b border-red-500/20">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/30 text-[#F87171] flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#F87171] tracking-wide">{t.dangerZone}</h2>
                <p className="text-[11px] text-[#9AA0B2]">{t.dangerSub}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-2 border-b border-white/5">
              <div>
                <p className="text-xs font-bold text-white">{t.logout}</p>
                <p className="text-[10px] text-[#9AA0B2]">Ferme votre session actuelle sur cet appareil</p>
              </div>
              <button
                type="button"
                onClick={() => logout()}
                className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-semibold text-white transition-all cursor-pointer flex items-center gap-2"
              >
                <LogOut className="w-4 h-4 text-[#9AA0B2]" />
                {t.logout}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-2">
              <div>
                <p className="text-xs font-bold text-[#F87171]">{t.deleteAccount}</p>
                <p className="text-[10px] text-[#9AA0B2]">{t.deleteDesc}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="px-4.5 py-2.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-bold text-[#F87171] transition-all cursor-pointer flex items-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
              >
                <Trash2 className="w-4 h-4" />
                {t.deleteAccount}
              </button>
            </div>
          </section>

        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rounded-3xl bg-[#0B0F19] border border-red-500/40 p-6 max-w-md w-full shadow-2xl space-y-6 animate-scale-up">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-[#F87171]">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-2 rounded-xl text-[#9AA0B2] hover:text-white bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-white">{t.deleteModalTitle}</h3>
              <p className="text-xs text-[#9AA0B2] leading-relaxed">
                {t.deleteModalDesc} <strong className="text-red-400">{t.deleteWarning}</strong>
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#9AA0B2]">
                {t.typeDelete}
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="SUPPRIMER"
                className="w-full glass-input px-3.5 py-2.5 text-xs text-white uppercase font-mono tracking-widest border-red-500/40 focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                }}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== "SUPPRIMER" && deleteConfirmText !== "DELETE"}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  deleteConfirmText === "SUPPRIMER" || deleteConfirmText === "DELETE"
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 cursor-pointer'
                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                }`}
              >
                {t.confirmDeleteBtn}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
