import React, { useState, useEffect } from "react";
import { dbStore, calculateProfileCompletion } from "../dbStore";
import { CandidateProfile, DetailedExperience, DetailedEducation } from "../types";
import { ProfileOverviewCard } from "../components/profile/ProfileOverviewCard";
import { ProfileCompletionCard } from "../components/profile/ProfileCompletionCard";
import { IdentitySection } from "../components/profile/IdentitySection";
import { ObjectivesSection } from "../components/profile/ObjectivesSection";
import { ExperiencesSection } from "../components/profile/ExperiencesSection";
import { EducationSection } from "../components/profile/EducationSection";
import { SkillsAndToolsSection } from "../components/profile/SkillsAndToolsSection";
import { LanguagesSection } from "../components/profile/LanguagesSection";
import { CertificationsSection } from "../components/profile/CertificationsSection";
import { ProjectsSection } from "../components/profile/ProjectsSection";
import { InterestsSection } from "../components/profile/InterestsSection";
import { CVImportCard } from "../components/profile/CVImportCard";
import { CVImportModal } from "../components/profile/CVImportModal";

import { 
  User, 
  Target, 
  Briefcase, 
  GraduationCap, 
  Sparkles, 
  Globe, 
  Award, 
  Rocket, 
  Heart,
  CheckCircle2,
  ShieldCheck,
  Save,
  Check
} from "lucide-react";

export const Profile: React.FC = () => {
  const [profile, setProfile] = useState<CandidateProfile>(dbStore.getProfile());
  const [activeSection, setActiveSection] = useState<string>("apercu");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCVModalOpen, setIsCVModalOpen] = useState<boolean>(false);

  useEffect(() => {
    setProfile(dbStore.getProfile());
    const unsub = dbStore.subscribe(() => {
      setProfile(dbStore.getProfile());
    });
    return unsub;
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleUpdateProfile = (updatedFields: Partial<CandidateProfile>) => {
    dbStore.updateProfile(updatedFields);
    showToast("Profil mis à jour avec succès");
  };

  const handleSaveExperiences = (updatedExperiences: DetailedExperience[]) => {
    dbStore.updateProfile({
      experiences: updatedExperiences,
    });
    showToast("Expériences mises à jour");
  };

  const handleSaveEducations = (updatedEducations: DetailedEducation[]) => {
    dbStore.updateProfile({
      educations: updatedEducations,
    });
    showToast("Formations mises à jour");
  };

  const { score, completedSections, totalSections, sectionsStatus } = calculateProfileCompletion(profile);

  const totalSkillsCount = (profile.hardSkills?.length || 0) + (profile.toolsAndSoftware?.length || 0) + (profile.softSkills?.length || 0);

  const navItems = [
    {
      id: "apercu",
      label: "Aperçu",
      icon: ShieldCheck,
      subtitle: `${score}% complété (${completedSections}/${totalSections})`,
      isCompleted: score === 100,
    },
    {
      id: "identite",
      label: "Identité",
      icon: User,
      subtitle: profile.fullName || "Informations de contact",
      isCompleted: Boolean(sectionsStatus.identity),
    },
    {
      id: "objectifs",
      label: "Objectifs",
      icon: Target,
      subtitle: `${profile.targetTitles?.length || 0} métier${(profile.targetTitles?.length || 0) > 1 ? 's' : ''}`,
      isCompleted: Boolean(sectionsStatus.objectives),
    },
    {
      id: "experiences",
      label: "Expériences",
      icon: Briefcase,
      subtitle: `${profile.experiences?.length || 0} expérience${(profile.experiences?.length || 0) > 1 ? 's' : ''}`,
      isCompleted: Boolean(sectionsStatus.experiences),
    },
    {
      id: "formations",
      label: "Formations",
      icon: GraduationCap,
      subtitle: `${profile.educations?.length || 0} formation${(profile.educations?.length || 0) > 1 ? 's' : ''}`,
      isCompleted: Boolean(sectionsStatus.educations),
    },
    {
      id: "competences",
      label: "Compétences",
      icon: Sparkles,
      subtitle: `${totalSkillsCount} compétence${totalSkillsCount > 1 ? 's' : ''}`,
      isCompleted: Boolean(sectionsStatus.skills),
    },
    {
      id: "langues",
      label: "Langues",
      icon: Globe,
      subtitle: `${profile.languagesList?.length || 0} langue${(profile.languagesList?.length || 0) > 1 ? 's' : ''}`,
      isCompleted: Boolean(sectionsStatus.languages),
    },
    {
      id: "certifications",
      label: "Certifications",
      icon: Award,
      subtitle: `${profile.certificationsList?.length || 0} certification${(profile.certificationsList?.length || 0) > 1 ? 's' : ''}`,
      isCompleted: Boolean(sectionsStatus.certifications),
    },
    {
      id: "projets",
      label: "Projets",
      icon: Rocket,
      subtitle: `${profile.projectsList?.length || 0} projet${(profile.projectsList?.length || 0) > 1 ? 's' : ''}`,
      isCompleted: Boolean(sectionsStatus.projects),
    },
    {
      id: "interets",
      label: "Centres d'intérêt",
      icon: Heart,
      subtitle: `${profile.interests?.length || 0} centre${(profile.interests?.length || 0) > 1 ? 's' : ''} d'intérêt`,
      isCompleted: Boolean(sectionsStatus.interests),
    },
  ];

  const activeItem = navItems.find((item) => item.id === activeSection) || navItems[0];

  const renderActiveSection = () => {
    switch (activeSection) {
      case "apercu":
        return (
          <div className="space-y-8 animate-fadeIn">
            <ProfileOverviewCard
              profile={profile}
              onEditClick={() => setActiveSection("identite")}
            />
            <CVImportCard
              onOpenImportModal={() => setIsCVModalOpen(true)}
            />
            <ProfileCompletionCard
              profile={profile}
              onNavigateSection={(secId) => setActiveSection(secId)}
            />
          </div>
        );
      case "identite":
        return (
          <div className="animate-fadeIn">
            <IdentitySection profile={profile} onSave={handleUpdateProfile} />
          </div>
        );
      case "objectifs":
        return (
          <div className="animate-fadeIn">
            <ObjectivesSection profile={profile} onSave={handleUpdateProfile} />
          </div>
        );
      case "experiences":
        return (
          <div className="animate-fadeIn">
            <ExperiencesSection
              experiences={profile.experiences || []}
              onSaveExperiences={handleSaveExperiences}
            />
          </div>
        );
      case "formations":
        return (
          <div className="animate-fadeIn">
            <EducationSection
              educations={profile.educations || []}
              onSaveEducations={handleSaveEducations}
            />
          </div>
        );
      case "competences":
        return (
          <div className="animate-fadeIn">
            <SkillsAndToolsSection profile={profile} onSave={handleUpdateProfile} />
          </div>
        );
      case "langues":
        return (
          <div className="animate-fadeIn">
            <LanguagesSection profile={profile} onSave={handleUpdateProfile} />
          </div>
        );
      case "certifications":
        return (
          <div className="animate-fadeIn">
            <CertificationsSection profile={profile} onSave={handleUpdateProfile} />
          </div>
        );
      case "projets":
        return (
          <div className="animate-fadeIn">
            <ProjectsSection profile={profile} onSave={handleUpdateProfile} />
          </div>
        );
      case "interets":
        return (
          <div className="animate-fadeIn">
            <InterestsSection profile={profile} onSave={handleUpdateProfile} />
          </div>
        );
      default:
        return (
          <div className="space-y-8 animate-fadeIn">
            <ProfileOverviewCard
              profile={profile}
              onEditClick={() => setActiveSection("identite")}
            />
            <ProfileCompletionCard
              profile={profile}
              onNavigateSection={(secId) => setActiveSection(secId)}
            />
          </div>
        );
    }
  };

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto space-y-6 pb-16">
      {/* Softened iOS-style Subtle Ambient Light Halos (Reduced as requested) */}
      <div className="fixed top-12 left-1/4 w-[450px] h-[450px] bg-[#D81A45]/5 rounded-full blur-[160px] pointer-events-none -z-10" />
      <div className="fixed top-1/3 right-10 w-[500px] h-[500px] bg-[#C084FC]/4 rounded-full blur-[180px] pointer-events-none -z-10" />
      <div className="fixed bottom-10 left-1/3 w-[400px] h-[400px] bg-[#38BDF8]/4 rounded-full blur-[150px] pointer-events-none -z-10" />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#12B76A]/90 text-white font-bold text-xs shadow-[0_8px_32px_rgba(18,183,106,0.4)] backdrop-blur-3xl border border-white/25 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Page Title Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-white/12 relative">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-[#F5F6FA] font-display tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">Mon Profil</h1>
            <span className="px-3.5 py-1 rounded-full bg-[#D81A45]/20 border border-[#D81A45]/40 text-[#FF6685] text-xs font-bold font-display shadow-[0_0_20px_rgba(216,26,69,0.3)] backdrop-blur-xl">
              {score}% complété
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#9AA0B2] max-w-3xl">
            Espace personnel de gestion de profil NACORA. Sélectionnez une rubrique à gauche pour la consulter ou la modifier.
          </p>
        </div>

        <button
          onClick={() => showToast("Toutes vos données sont enregistrées en temps réel.")}
          className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 hover:border-white/30 text-xs font-bold text-[#F5F6FA] backdrop-blur-2xl shadow-md transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
        >
          <Save className="w-4 h-4 text-[#34D399]" />
          <span>Sauvegarde automatique</span>
        </button>
      </div>

      {/* Mobile Horizontal Navigation Tabs (lg:hidden) */}
      <div className="lg:hidden glass-panel p-2.5 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.25)] overflow-x-auto custom-scrollbar flex items-center gap-2 scroll-smooth relative overflow-hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
                isActive
                  ? "bg-gradient-to-r from-[#D81A45] to-[#FF1A55] text-white shadow-[0_0_24px_rgba(216,26,69,0.55),inset_0_1px_1px_rgba(255,255,255,0.4)] border border-[#FF6685]/70"
                  : "bg-white/[0.05] hover:bg-white/[0.12] text-[#9AA0B2] hover:text-[#F5F6FA] border border-white/12 hover:border-white/25 backdrop-blur-xl"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
              {item.isCompleted && (
                <Check className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-[#34D399]"}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Sticky Sidebar (Desktop) */}
        <div className="hidden lg:block lg:col-span-4 xl:col-span-3 sticky top-20 z-20 space-y-4">
          <div className="glass-panel relative overflow-hidden p-3.5 rounded-3xl space-y-2.5 shadow-[0_25px_60px_-10px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.3)] before:absolute before:top-0 before:left-0 before:right-0 before:h-[1.5px] before:bg-gradient-to-r before:from-transparent before:via-white/45 before:to-transparent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent">
            {/* Top Gloss Reflection */}
            <div className="absolute top-0 left-0 w-full h-16 bg-gradient-to-b from-white/[0.12] to-transparent pointer-events-none" />

            <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#9AA0B2]/90 flex items-center justify-between border-b border-white/12 pb-2.5 relative z-10 font-display">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#D81A45] animate-pulse" />
                Rubriques du profil
              </span>
              <span className="text-[#34D399] font-bold px-2 py-0.5 rounded-full bg-[#34D399]/15 border border-[#34D399]/30 text-[10px]">
                {completedSections}/{totalSections} renseignées
              </span>
            </div>

            <div className="space-y-1.5 pt-1 relative z-10">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full text-left flex items-center justify-between gap-3 p-3 rounded-2xl transition-all duration-300 group cursor-pointer relative overflow-hidden ${
                      isActive
                        ? "bg-gradient-to-r from-[#D81A45]/35 via-[#D81A45]/20 to-white/[0.06] border border-[#FF6685]/60 shadow-[0_8px_25px_rgba(216,26,69,0.4),inset_0_1px_1px_rgba(255,255,255,0.35)] backdrop-blur-3xl"
                        : "bg-white/[0.04] border border-white/10 hover:border-white/30 hover:bg-white/[0.12] hover:translate-x-1.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.25)] backdrop-blur-2xl"
                    }`}
                  >
                    {/* Active highlight vertical glow bar */}
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#FF6685] via-[#D81A45] to-[#D81A45] shadow-[0_0_16px_#FF6685]" />
                    )}

                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                          isActive
                            ? "bg-gradient-to-br from-[#FF1A55] to-[#D81A45] text-white shadow-[0_0_20px_rgba(216,26,69,0.7)] scale-105 border border-white/40"
                            : "bg-white/[0.06] border border-white/12 text-[#9AA0B2] group-hover:text-white group-hover:bg-white/15 group-hover:border-white/25"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <div
                          className={`text-xs leading-tight font-bold transition-colors truncate ${
                            isActive ? "text-white drop-shadow-sm font-display" : "text-[#F5F6FA]/90 group-hover:text-white"
                          }`}
                        >
                          {item.label}
                        </div>
                        <div className="text-[11px] leading-tight text-[#9AA0B2] truncate">
                          {item.subtitle}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.isCompleted ? (
                        <div className="w-5 h-5 rounded-full bg-[#34D399]/20 border border-[#34D399]/40 flex items-center justify-center text-[#34D399] shadow-[0_0_12px_rgba(52,211,153,0.3)]">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full bg-white/15 border border-white/20 group-hover:bg-white/40 group-hover:border-white/50 transition-all" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Progress Indicator Box (Liquid Glass) */}
          <div className="glass-panel relative overflow-hidden p-4.5 rounded-2xl space-y-3 shadow-[0_20px_50px_rgba(0,0,0,0.75),inset_0_1px_1px_rgba(255,255,255,0.3)] before:absolute before:top-0 before:left-0 before:right-0 before:h-[1.5px] before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#F5F6FA] font-display flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FF6685] shadow-[0_0_8px_#FF6685]" />
                Niveau du profil
              </span>
              <span className="font-black text-[#FF6685] drop-shadow-[0_0_10px_rgba(255,102,133,0.5)] px-2 py-0.5 rounded-lg bg-[#D81A45]/20 border border-[#D81A45]/40 text-xs">{score}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden p-0.5 border border-white/18 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
              <div
                className="h-full bg-gradient-to-r from-[#D81A45] via-[#FF6685] to-[#34D399] transition-all duration-500 rounded-full shadow-[0_0_16px_rgba(216,26,69,0.7)]"
                style={{ width: `${score}%` }}
              />
            </div>
            <p className="text-[11px] text-[#9AA0B2] leading-relaxed">
              Un profil complet augmente significativement la pertinence des opportunités et des correspondances IA.
            </p>
          </div>
        </div>

        {/* Right Content Column */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
          {/* Breadcrumb / Active Rubric Header Bar */}
          <div className="glass-panel relative overflow-hidden flex items-center justify-between p-4.5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.3)] before:absolute before:top-0 before:left-0 before:right-0 before:h-[1.5px] before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#D81A45]/25 border border-[#D81A45]/50 flex items-center justify-center text-[#FF6685] shadow-[0_0_20px_rgba(216,26,69,0.3)]">
                <activeItem.icon className="w-4.5 h-4.5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#F5F6FA] font-display flex items-center gap-2">
                  <span>{activeItem.label}</span>
                  {activeItem.isCompleted && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#34D399]/20 border border-[#34D399]/40 text-[#34D399] text-[10px] font-bold shadow-[0_0_12px_rgba(52,211,153,0.2)]">
                      <Check className="w-3 h-3" /> Complété
                    </span>
                  )}
                </h2>
                <p className="text-xs text-[#9AA0B2]">{activeItem.subtitle}</p>
              </div>
            </div>

            {activeSection !== "apercu" && (
              <button
                onClick={() => setActiveSection("apercu")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs font-bold text-[#9AA0B2] hover:text-[#F5F6FA] transition-all cursor-pointer shadow-sm hover:border-white/30"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" />
                <span>Retour à l'aperçu</span>
              </button>
            )}
          </div>

          {/* Render Active Rubric Section Content */}
          <div className="min-w-0">
            {renderActiveSection()}
          </div>
        </div>
      </div>

      {/* CV Import & AI Parsing Modal */}
      <CVImportModal
        isOpen={isCVModalOpen}
        onClose={() => setIsCVModalOpen(false)}
        existingProfile={profile}
        onMergeSuccess={(updatedProfile, msg) => {
          setProfile(updatedProfile);
          showToast(msg);
        }}
      />
    </div>
  );
};
