import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { dbStore } from "../dbStore";
import { Company, Contact, Opportunity, ContactCategory } from "../types";
import { GlassCard, Badge, GlassButton, Modal } from "./Shared";
import { getCompanyTheme } from "../utils/companyColors";
import { 
  Building2, 
  Search, 
  Users, 
  Briefcase, 
  FileText, 
  ChevronRight, 
  MapPin, 
  Globe, 
  Sparkles, 
  TrendingUp, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Award, 
  Target, 
  Landmark, 
  ShieldCheck, 
  ArrowRight,
  ExternalLink,
  Mail,
  Edit3,
  Check,
  Plus,
  Compass,
  GraduationCap,
  Calendar,
  Layers,
  Copy,
  Info,
  Flame,
  Bookmark,
  Building
} from "lucide-react";

interface CompanyDetailWorkspaceProps {
  company: Company;
  associatedContacts: Contact[];
  associatedOpps: Opportunity[];
  onClose: () => void;
  onUpdate: (updated: Company) => void;
  onSelectContact?: (contactId: string) => void;
  showToast: (message: string, type: "success" | "error" | "info" | "ai") => void;
}

export const CompanyDetailWorkspace: React.FC<CompanyDetailWorkspaceProps> = ({
  company,
  associatedContacts,
  associatedOpps,
  onClose,
  onUpdate,
  onSelectContact,
  showToast
}) => {
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"synthese" | "culture" | "actualites" | "ecosysteme" | "notes">("synthese");
  const [isEnriching, setIsEnriching] = useState(false);
  const [notesDraft, setNotesDraft] = useState(company.notes || "");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [hasCopiedEmail, setHasCopiedEmail] = useState(false);

  const theme = getCompanyTheme(company.sector, company.name);

  useEffect(() => {
    setNotesDraft(company.notes || "");
  }, [company.notes]);

  // AI Web Search Enrichment
  const handleEnrich = async () => {
    setIsEnriching(true);
    showToast(`Recherche web et analyse financière pour ${company.name}...`, "ai");
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enrichCompany", payload: { companyName: company.name } })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error && (data.error.includes("429") || data.error.includes("RESOURCE_EXHAUSTED") || data.error.includes("quota"))) {
          showToast("Quota Gemini temporairement sollicité. Données synthétisées de secours appliquées.", "info");
        } else {
          showToast(data.error || "Échec de la recherche web", "error");
        }
      }
      
      if (!data.description && !data.sector && !data.revenue) {
        showToast("Aucune information supplémentaire trouvée en ligne pour cette entreprise.", "info");
        setIsEnriching(false);
        return;
      }

      const sources = company.fieldSources || {};
      const keep = (field: string, newVal: any) => {
        if (sources[field] === "manual" && (company as any)[field]) return (company as any)[field];
        return newVal || (company as any)[field] || "";
      };

      const updated: Company = {
        ...company,
        sector: keep("sector", data.sector),
        description: keep("description", data.description),
        size: keep("size", data.size),
        website: keep("website", data.website),
        location: keep("location", data.location),
        foundingYear: keep("foundingYear", data.foundingYear),
        companyStatus: keep("companyStatus", data.companyStatus),
        geographicPresence: keep("geographicPresence", data.geographicPresence),
        parentGroup: keep("parentGroup", data.parentGroup),
        revenue: keep("revenue", data.revenue),
        recentDynamics: keep("recentDynamics", data.recentDynamics),
        notableClients: keep("notableClients", data.notableClients),
        values: keep("values", data.values),
        csrCommitment: keep("csrCommitment", data.csrCommitment),
        distinctions: keep("distinctions", data.distinctions),
        hrContactEmail: keep("hrContactEmail", data.hrContactEmail),
        careersPageUrl: keep("careersPageUrl", data.careersPageUrl),
        metrics: data.metrics && data.metrics.length > 0 ? data.metrics : company.metrics,
        lastEnrichedAt: new Date().toISOString(),
        enrichmentStatus: "enriched",
        fieldSources: {
          ...sources,
          ...(data.sector ? { sector: sources.sector === "manual" ? "manual" : "ai" } : {}),
          ...(data.description ? { description: sources.description === "manual" ? "manual" : "ai" } : {}),
          ...(data.revenue ? { revenue: sources.revenue === "manual" ? "manual" : "ai" } : {}),
          ...(data.values ? { values: sources.values === "manual" ? "manual" : "ai" } : {})
        }
      };

      dbStore.updateCompany(updated);
      onUpdate(updated);
      showToast(`Fiche entreprise ${company.name} enrichie avec succès !`, "success");
    } catch (e) {
      showToast("Échec de la recherche web", "error");
    } finally {
      setIsEnriching(false);
    }
  };

  // Direct Field Update
  const handleUpdateField = (field: keyof Company, value: any) => {
    const updated: Company = {
      ...company,
      [field]: value,
      fieldSources: {
        ...(company.fieldSources || {}),
        [field]: "manual"
      }
    };
    dbStore.updateCompany(updated);
    onUpdate(updated);
    showToast("Modification enregistrée", "success");
  };

  // Save Candidate Private Notes
  const handleSaveNotes = () => {
    const updated: Company = {
      ...company,
      notes: notesDraft
    };
    dbStore.updateCompany(updated);
    onUpdate(updated);
    setIsEditingNotes(false);
    showToast("Notes enregistrées", "success");
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setHasCopiedEmail(true);
    showToast("Adresse email copiée dans le presse-papiers !", "success");
    setTimeout(() => setHasCopiedEmail(false), 2000);
  };

  const handleCategoryBadge = (category: ContactCategory) => {
    switch (category) {
      case "recruiter":
        return <span className="px-2 py-0.5 rounded-lg border text-[10px] font-semibold bg-[rgba(18,183,106,0.12)] text-[#34D399] border-[rgba(18,183,106,0.28)]">{language === "en" ? "Recruiter / HR" : "Recruteur / RH"}</span>;
      case "alumni":
        return <span className="px-2 py-0.5 rounded-lg border text-[10px] font-semibold bg-[rgba(56,189,248,0.12)] text-[#38BDF8] border-[rgba(56,189,248,0.28)]">Alumni</span>;
      case "student":
        return <span className="px-2 py-0.5 rounded-lg border text-[10px] font-semibold bg-[rgba(192,132,252,0.12)] text-[#C084FC] border-[rgba(192,132,252,0.28)]">{language === "en" ? "Student" : "Étudiant"}</span>;
      case "sector_pro":
        return <span className="px-2 py-0.5 rounded-lg border text-[10px] font-semibold bg-[rgba(216,26,69,0.14)] text-[#FF6685] border-[rgba(216,26,69,0.30)]">{language === "en" ? "Target Sector Pro" : "Pro Secteur Cible"}</span>;
      case "other_pro":
        return <span className="px-2 py-0.5 rounded-lg border text-[10px] font-semibold bg-[rgba(247,144,9,0.12)] text-[#FBBF24] border-[rgba(247,144,9,0.28)]">{language === "en" ? "Other Sector Pro" : "Pro Autre Secteur"}</span>;
      default:
        return <span className="px-2 py-0.5 rounded-lg border text-[10px] font-semibold bg-white/[0.04] text-[#9AA0B2] border-white/10">{language === "en" ? "Other" : "Autre"}</span>;
    }
  };

  const getCompanyInitial = () => {
    return company.name ? company.name.substring(0, 1).toUpperCase() : "E";
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200 w-full mb-8">
      {/* 1. TOP BREADCRUMB NAVIGATION */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#9AA0B2] hover:text-[#F5F6FA] border border-white/10 text-xs font-semibold transition-colors cursor-pointer"
        >
          <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          <span>{language === "en" ? "Back to companies" : "Retour aux entreprises"}</span>
        </button>
        <span className="text-xs text-[#9AA0B2] font-medium hidden sm:inline-block">
          {language === "en" ? "Company Dossier & Interview Prep" : "Fiche Entreprise & Préparation aux Entretiens"}
        </span>
      </div>

      {/* 2. MAIN LIQUID GLASS WORKSPACE CONTAINER */}
      <div className="glass-panel p-5 sm:p-7 rounded-2xl flex flex-col gap-6 w-full relative overflow-hidden">
        {/* Subtle top specular accent */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

        {/* ========================================================================= */}
        {/* HEADER SECTION                                                            */}
        {/* ========================================================================= */}
        <div className="border-b border-white/10 pb-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            
            {/* Left Brand info */}
            <div className="flex items-start gap-4">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${theme.avatarGradient} border ${theme.avatarBorder} flex items-center justify-center ${theme.avatarText} font-black text-2xl font-display ${theme.avatarShadow} shrink-0`}>
                {getCompanyInitial()}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-[#F5F6FA] tracking-tight leading-snug font-display">
                    {company.name}
                  </h1>
                  {company.companyStatus && (
                    <span className="px-2.5 py-0.5 rounded-full border border-white/10 text-[11px] font-semibold bg-white/[0.04] text-[#9AA0B2]">
                      {company.companyStatus}
                    </span>
                  )}
                  {company.lastEnrichedAt && (
                    <span className="px-2.5 py-0.5 rounded-full border border-emerald-500/30 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 flex items-center gap-1 shadow-[0_0_12px_rgba(18,183,106,0.2)]">
                      <Sparkles className="w-3 h-3" />
                      <span>{language === "en" ? "AI Enriched" : "Enrichie IA"}</span>
                    </span>
                  )}
                </div>

                <p className="text-sm text-[#9AA0B2] font-medium flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-lg border text-xs font-semibold ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}>
                    {company.sector || theme.sectorLabel}
                  </span>
                  {company.location && (
                    <>
                      <span className="text-white/20">•</span>
                      <span className="flex items-center gap-1 text-[#9AA0B2]">
                        <MapPin className="w-3.5 h-3.5 text-[#38BDF8]" />
                        {company.location}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Right Action buttons */}
            <div className="flex flex-wrap items-center gap-2.5 self-start shrink-0">
              {company.website && (
                <a
                  href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#38BDF8] hover:text-white border border-white/10 text-xs font-semibold transition-all"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{language === "en" ? "Official site" : "Site web"}</span>
                  <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                </a>
              )}

              {company.careersPageUrl && (
                <a
                  href={company.careersPageUrl.startsWith("http") ? company.careersPageUrl : `https://${company.careersPageUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#C084FC] hover:text-white border border-white/10 text-xs font-semibold transition-all"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>{language === "en" ? "Careers" : "Carrières"}</span>
                  <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                </a>
              )}

              <GlassButton
                variant="primary"
                size="sm"
                onClick={handleEnrich}
                disabled={isEnriching}
                icon={isEnriching ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" /> : <Sparkles className="w-3.5 h-3.5 text-white" />}
              >
                {isEnriching ? t.companies.enriching : t.companies.enrichWeb}
              </GlassButton>
            </div>

          </div>

          {/* Monoline Metadata Ribbon */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none flex-nowrap pt-2 border-t border-white/5">
            {company.size && (
              <div className="px-3.5 py-1.5 rounded-xl backdrop-blur-xl bg-white/[0.03] border border-white/10 text-xs text-[#9AA0B2] flex items-center gap-1.5 shrink-0 shadow-[0_2px_10px_rgba(0,0,0,0.2)]">
                <Users className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span className="text-[#F5F6FA] font-medium">{company.size}</span>
              </div>
            )}

            {company.foundingYear && (
              <div className="px-3.5 py-1.5 rounded-xl backdrop-blur-xl bg-white/[0.03] border border-white/10 text-xs text-[#9AA0B2] flex items-center gap-1.5 shrink-0 shadow-[0_2px_10px_rgba(0,0,0,0.2)]">
                <Calendar className="w-3.5 h-3.5 text-[#FBBF24]" />
                <span>{language === "en" ? "Founded in" : "Fondée en"} <strong className="text-[#F5F6FA]">{company.foundingYear}</strong></span>
              </div>
            )}

            {company.revenue && (
              <div className="px-3.5 py-1.5 rounded-xl backdrop-blur-xl bg-[rgba(18,183,106,0.08)] border border-[rgba(18,183,106,0.25)] text-xs text-[#34D399] flex items-center gap-1.5 shrink-0 shadow-[0_2px_10px_rgba(18,183,106,0.12)] font-semibold">
                <TrendingUp className="w-3.5 h-3.5 text-[#34D399]" />
                <span>{company.revenue}</span>
              </div>
            )}

            {company.parentGroup && (
              <div className="px-3.5 py-1.5 rounded-xl backdrop-blur-xl bg-white/[0.03] border border-white/10 text-xs text-[#9AA0B2] flex items-center gap-1.5 shrink-0 shadow-[0_2px_10px_rgba(0,0,0,0.2)]">
                <Landmark className="w-3.5 h-3.5 text-[#C084FC]" />
                <span>{language === "en" ? "Group:" : "Groupe :"} <strong className="text-[#F5F6FA]">{company.parentGroup}</strong></span>
              </div>
            )}

            <button
              onClick={() => setActiveTab("ecosysteme")}
              className="px-3.5 py-1.5 rounded-xl backdrop-blur-xl bg-[rgba(216,26,69,0.08)] hover:bg-[rgba(216,26,69,0.14)] border border-[rgba(216,26,69,0.25)] text-xs text-[#FF6685] flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer shadow-[0_2px_10px_rgba(216,26,69,0.1)] font-semibold"
            >
              <Briefcase className="w-3.5 h-3.5 text-[#FF6685]" />
              <span><strong className="text-[#FF6685]">{associatedOpps.length}</strong> {language === "en" ? "Job Opps" : "Offres"}</span>
            </button>

            <button
              onClick={() => setActiveTab("ecosysteme")}
              className="px-3.5 py-1.5 rounded-xl backdrop-blur-xl bg-[rgba(56,189,248,0.08)] hover:bg-[rgba(56,189,248,0.14)] border border-[rgba(56,189,248,0.25)] text-xs text-[#38BDF8] flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer shadow-[0_2px_10px_rgba(56,189,248,0.1)] font-semibold"
            >
              <Users className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span><strong className="text-[#38BDF8]">{associatedContacts.length}</strong> {language === "en" ? "Contacts" : "Contacts"}</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TABS NAVIGATION                                                           */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto scrollbar-none flex-nowrap">
          {[
            { 
              id: "synthese", 
              label: language === "en" ? "Overview & Identity" : "Vue Synthétique & Identité", 
              icon: <Building2 className="w-3.5 h-3.5" />,
              color: "text-[#FF6685]" 
            },
            { 
              id: "culture", 
              label: language === "en" ? "Culture, Values & CSR" : "Culture, Valeurs & RSE", 
              icon: <ShieldCheck className="w-3.5 h-3.5" />,
              color: "text-[#C084FC]" 
            },
            { 
              id: "actualites", 
              label: language === "en" ? "Financial Dynamics & News" : "Dynamique & Actualités", 
              icon: <TrendingUp className="w-3.5 h-3.5" />,
              color: "text-[#34D399]" 
            },
            { 
              id: "ecosysteme", 
              label: language === "en" ? `Ecosystem (${associatedContacts.length + associatedOpps.length})` : `Écosystème Réseau (${associatedContacts.length + associatedOpps.length})`, 
              icon: <Layers className="w-3.5 h-3.5" />,
              color: "text-[#38BDF8]" 
            },
            { 
              id: "notes", 
              label: language === "en" ? "Candidate Notes & Contacts" : "Notes & Préparation", 
              icon: <Edit3 className="w-3.5 h-3.5" />,
              color: "text-[#FBBF24]" 
            }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                  isActive
                    ? "bg-white/[0.08] text-[#F5F6FA] border-white/20 shadow-[0_0_16px_rgba(255,255,255,0.06),inset_0_1px_1px_rgba(255,255,255,0.2)]"
                    : "bg-white/[0.02] hover:bg-white/[0.05] text-[#9AA0B2] hover:text-[#F5F6FA] border-white/5"
                }`}
              >
                <span className={isActive ? tab.color : "text-[#9AA0B2]"}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* TAB CONTENTS                                                              */}
        {/* ========================================================================= */}

        {/* TAB 1: VUE SYNTHÉTIQUE & IDENTITÉ */}
        {activeTab === "synthese" && (
          <div className="space-y-6">
            
            {/* Main Presentation / Description Card */}
            <div className="p-5 sm:p-6 rounded-2xl backdrop-blur-xl bg-white/[0.035] border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.15)] space-y-3 relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#FF6685] uppercase tracking-wider flex items-center gap-2 font-display">
                  <FileText className="w-4 h-4 text-[#FF6685]" />
                  {language === "en" ? "Business Activity & Value Proposition" : "Description de l'activité & Pitch Marché"}
                </span>
                {company.fieldSources?.description === "ai" && (
                  <span className="text-[10px] bg-[rgba(192,132,252,0.12)] text-[#C084FC] px-2.5 py-0.5 rounded-full border border-[rgba(192,132,252,0.25)] flex items-center gap-1 font-semibold">
                    <Sparkles className="w-3 h-3" /> IA
                  </span>
                )}
              </div>
              <EditableFieldCard
                label=""
                value={company.description}
                source={company.fieldSources?.description}
                isTextarea
                placeholder={language === "en" ? "Describe company core business, market position and value proposition..." : "Présentez l'activité clé de l'entreprise, son positionnement sur le marché et sa proposition de valeur..."}
                onSave={(val) => handleUpdateField("description", val)}
              />
            </div>

            {/* Key Metrics Grid if available */}
            {(() => {
              const displayMetrics = (company.metrics || []).filter((m) => {
                if (!m || !m.label || !m.value) return false;
                const l = m.label.toLowerCase().trim();
                const v = m.value.toLowerCase().trim();
                if (l === "statut" && v === "actif") return false;
                if (v === "actif" || v === "n/a" || v === "donnée synthétique" || v === "non précisé" || v === "non renseigné") return false;
                return true;
              });

              if (displayMetrics.length === 0) return null;

              return (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-[#34D399] uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#34D399]" />
                    {language === "en" ? "Key Figures & Indicators" : "Chiffres Clés & Indicateurs Clés"}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    {displayMetrics.map((metric, idx) => {
                      const colorSchemes = [
                        { text: "text-[#34D399]", bg: "bg-[rgba(18,183,106,0.08)]", border: "border-[rgba(18,183,106,0.25)]" },
                        { text: "text-[#38BDF8]", bg: "bg-[rgba(56,189,248,0.08)]", border: "border-[rgba(56,189,248,0.25)]" },
                        { text: "text-[#FF6685]", bg: "bg-[rgba(216,26,69,0.08)]", border: "border-[rgba(216,26,69,0.25)]" },
                        { text: "text-[#C084FC]", bg: "bg-[rgba(192,132,252,0.08)]", border: "border-[rgba(192,132,252,0.25)]" },
                      ];
                      const scheme = colorSchemes[idx % colorSchemes.length];

                      return (
                        <div 
                          key={idx} 
                          className={`p-4 rounded-2xl backdrop-blur-xl ${scheme.bg} border ${scheme.border} transition-all duration-200 text-center flex flex-col justify-between group shadow-[0_4px_16px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.12)] hover:-translate-y-0.5`}
                        >
                          <div className={`text-xl font-black ${scheme.text} font-display transition-transform group-hover:scale-105`}>
                            {metric.value}
                          </div>
                          <div className="text-[11px] text-[#9AA0B2] mt-1.5 font-medium leading-tight">
                            {metric.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Identity Structured Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <EditableFieldCard
                label={language === "en" ? "Industry / Sector" : "Secteur d'activité"}
                value={company.sector}
                source={company.fieldSources?.sector}
                placeholder={language === "en" ? "e.g. Fintech, Corporate Banking..." : "ex: FinTech, Banque d'investissement..."}
                onSave={(val) => handleUpdateField("sector", val)}
              />

              <EditableFieldCard
                label={language === "en" ? "Legal Status / Type" : "Statut / Structure"}
                value={company.companyStatus}
                source={company.fieldSources?.companyStatus}
                placeholder={language === "en" ? "Startup, SME, Scale-up, Large Corp..." : "Start-up, PME, Scale-up, Grand groupe..."}
                onSave={(val) => handleUpdateField("companyStatus", val)}
              />

              <EditableFieldCard
                label={language === "en" ? "Headquarters / City" : "Siège social / Ville"}
                value={company.location}
                source={company.fieldSources?.location}
                placeholder={language === "en" ? "e.g. Paris, France" : "ex: Paris, France"}
                onSave={(val) => handleUpdateField("location", val)}
              />

              <EditableFieldCard
                label={language === "en" ? "Number of Employees" : "Nombre d'employés"}
                value={company.size}
                source={company.fieldSources?.size}
                placeholder={language === "en" ? "e.g. 500-1000 employees" : "ex: 500-1000 collaborateurs"}
                onSave={(val) => handleUpdateField("size", val)}
              />

              <EditableFieldCard
                label={language === "en" ? "Geographic Presence" : "Présence géographique"}
                value={company.geographicPresence}
                source={company.fieldSources?.geographicPresence}
                placeholder={language === "en" ? "e.g. 15 countries, 4 regional hubs" : "ex: 15 pays, 4 hubs régionaux"}
                onSave={(val) => handleUpdateField("geographicPresence", val)}
              />

              <EditableFieldCard
                label={language === "en" ? "Parent Group / Holding" : "Groupe / Maison mère"}
                value={company.parentGroup}
                source={company.fieldSources?.parentGroup}
                placeholder={language === "en" ? "e.g. Independent or Subsidiary" : "ex: Indépendant ou Filiale de..."}
                onSave={(val) => handleUpdateField("parentGroup", val)}
              />
            </div>

          </div>
        )}

        {/* TAB 2: CULTURE & VALEURS (PRÉPARATION ENTRETIEN) */}
        {activeTab === "culture" && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl backdrop-blur-xl bg-[rgba(192,132,252,0.08)] border border-[rgba(192,132,252,0.25)] text-xs text-[#E2E8F0] flex items-start gap-3 shadow-[0_4px_20px_rgba(192,132,252,0.1)]">
              <Sparkles className="w-4 h-4 text-[#C084FC] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#C084FC] font-semibold">{language === "en" ? "Interview Argumentation Lever:" : "Levier pour vos entretiens :"}</strong>{" "}
                {language === "en" 
                  ? "Align your interview pitch with company values, ESG actions and recent labels to demonstrate cultural fit." 
                  : "Appuyez-vous sur les valeurs affichées, les engagements RSE et les distinctions de l'entreprise pour prouver votre adéquation culturelle lors des entretiens."}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EditableFieldCard
                label={language === "en" ? "Corporate Values" : "Valeurs d'entreprise affichées"}
                value={company.values}
                source={company.fieldSources?.values}
                isTextarea
                placeholder={language === "en" ? "e.g. Transparency, Excellence, Innovation, Impact..." : "ex: Transparence, Excellence, Innovation, Impact durable..."}
                onSave={(val) => handleUpdateField("values", val)}
              />

              <EditableFieldCard
                label={language === "en" ? "CSR / ESG Commitments" : "Engagements RSE & Environnementaux"}
                value={company.csrCommitment}
                source={company.fieldSources?.csrCommitment}
                isTextarea
                placeholder={language === "en" ? "e.g. Net Zero target, ethical investing, diversity programs..." : "ex: Objectif Net Zéro, investissement responsable, programmes d'inclusion..."}
                onSave={(val) => handleUpdateField("csrCommitment", val)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EditableFieldCard
                label={language === "en" ? "Awards, Labels & Certifications" : "Distinctions, Labels & Certifications"}
                value={company.distinctions}
                source={company.fieldSources?.distinctions}
                placeholder={language === "en" ? "e.g. Great Place to Work, B-Corp, Top Employer..." : "ex: Great Place to Work, B-Corp, Top Employer..."}
                onSave={(val) => handleUpdateField("distinctions", val)}
              />

              <EditableFieldCard
                label={language === "en" ? "Notable Clients & Key Partners" : "Clients & Partenaires Stratégiques"}
                value={company.notableClients}
                source={company.fieldSources?.notableClients}
                placeholder={language === "en" ? "e.g. CAC 40 companies, Tier 1 banks, Institutions..." : "ex: Entreprises du CAC 40, banques de premier rang, institutionnels..."}
                onSave={(val) => handleUpdateField("notableClients", val)}
              />
            </div>
          </div>
        )}

        {/* TAB 3: DYNAMIQUE & ACTUALITÉS ÉCONOMIQUES */}
        {activeTab === "actualites" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EditableFieldCard
                label={language === "en" ? "Revenue / Financial Health" : "Chiffre d'affaires & Santé Financière"}
                value={company.revenue}
                source={company.fieldSources?.revenue}
                placeholder={language === "en" ? "e.g. $45M (2024), profitable" : "ex: 45 M€ (2024), rentable"}
                onSave={(val) => handleUpdateField("revenue", val)}
              />

              <EditableFieldCard
                label={language === "en" ? "Recent Growth & Strategic Milestones" : "Croissance & Événements Récents"}
                value={company.recentDynamics}
                source={company.fieldSources?.recentDynamics}
                isTextarea
                placeholder={language === "en" ? "e.g. $20M Series B fundraising, international market expansion..." : "ex: Levée de fonds de 20M€ en Série B, ouverture d'un hub en Allemagne..."}
                onSave={(val) => handleUpdateField("recentDynamics", val)}
              />
            </div>
          </div>
        )}

        {/* TAB 4: ÉCOSYSTÈME RÉSEAU & OPPORTUNITÉS LIÉES */}
        {activeTab === "ecosysteme" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Contacts Associés */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#38BDF8] uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#38BDF8]" />
                  {language === "en" ? "Network Contacts at this Company" : "Contacts Réseau dans l'entreprise"} ({associatedContacts.length})
                </span>
              </div>

              {associatedContacts.length === 0 ? (
                <div className="p-6 rounded-2xl backdrop-blur-xl bg-white/[0.02] border border-dashed border-white/10 text-xs text-[#9AA0B2] text-center space-y-2">
                  <p>{language === "en" ? "No contacts recorded at this company yet." : "Aucun contact répertorié dans cette entreprise pour le moment."}</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {associatedContacts.map((contact) => (
                    <div
                      key={contact.id}
                      onClick={() => onSelectContact && onSelectContact(contact.id)}
                      className="p-4 rounded-2xl backdrop-blur-xl bg-white/[0.035] hover:bg-white/[0.07] border border-white/10 hover:border-white/20 transition-all cursor-pointer flex items-center justify-between group shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:-translate-y-0.5"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[#F5F6FA] group-hover:text-[#38BDF8] transition-colors">
                            {contact.fullName}
                          </span>
                          {handleCategoryBadge(contact.category)}
                        </div>
                        <p className="text-[11px] text-[#9AA0B2] truncate">
                          {contact.jobTitle}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {contact.relevanceScore && (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-lg bg-[rgba(56,189,248,0.1)] border border-[rgba(56,189,248,0.25)] text-[#38BDF8]">
                            {contact.relevanceScore}%
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-[#9AA0B2] group-hover:text-[#38BDF8] transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Opportunités Liées */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#FF6685] uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-[#FF6685]" />
                  {language === "en" ? "Linked Opportunities" : "Opportunités & Postes Liés"} ({associatedOpps.length})
                </span>
              </div>

              {associatedOpps.length === 0 ? (
                <div className="p-6 rounded-2xl backdrop-blur-xl bg-white/[0.02] border border-dashed border-white/10 text-xs text-[#9AA0B2] text-center space-y-2">
                  <p>{language === "en" ? "No linked jobs recorded yet." : "Aucune offre d'emploi ou alternance liée enregistrée pour le moment."}</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {associatedOpps.map((opp) => (
                    <div
                      key={opp.id}
                      className="p-4 rounded-2xl backdrop-blur-xl bg-white/[0.035] hover:bg-white/[0.07] border border-white/10 transition-all flex items-center justify-between shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-[#F5F6FA] block">
                          {opp.title}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-[#9AA0B2]">
                          <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[#F5F6FA]">{opp.contractType}</span>
                          {opp.location && (
                            <>
                              <span>•</span>
                              <span>{opp.location}</span>
                            </>
                          )}
                          {opp.salary && (
                            <>
                              <span>•</span>
                              <span className="text-[#34D399] font-semibold">{opp.salary}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border border-[rgba(216,26,69,0.25)] bg-[rgba(216,26,69,0.08)] text-[#FF6685]">
                        {opp.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 5: NOTES CANDIDAT & REPÈRES PRATIQUES */}
        {activeTab === "notes" && (
          <div className="space-y-6">
            
            {/* Practical Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl backdrop-blur-xl bg-white/[0.035] border border-white/10 space-y-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.12)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#38BDF8] uppercase tracking-wider flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#38BDF8]" />
                    {language === "en" ? "HR Contact / Recruitment Email" : "Contact RH / Email Recrutement"}
                  </span>
                  {company.hrContactEmail && (
                    <button
                      onClick={() => handleCopyEmail(company.hrContactEmail!)}
                      className="text-xs text-[#38BDF8] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    >
                      {hasCopiedEmail ? <Check className="w-3 h-3 text-[#34D399]" /> : <Copy className="w-3 h-3" />}
                      <span>{hasCopiedEmail ? (language === "en" ? "Copied" : "Copié") : (language === "en" ? "Copy" : "Copier")}</span>
                    </button>
                  )}
                </div>
                <EditableFieldCard
                  label=""
                  value={company.hrContactEmail}
                  source={company.fieldSources?.hrContactEmail}
                  placeholder={language === "en" ? "e.g. rh@company.com or talent@company.com" : "ex: recrutement@entreprise.com ou rh@entreprise.com"}
                  onSave={(val) => handleUpdateField("hrContactEmail", val)}
                />
              </div>

              <div className="p-5 rounded-2xl backdrop-blur-xl bg-white/[0.035] border border-white/10 space-y-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.12)]">
                <span className="text-xs font-bold text-[#C084FC] uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#C084FC]" />
                  {language === "en" ? "Careers Portal Link" : "Portail Carrières & Recrutement"}
                </span>
                <EditableFieldCard
                  label=""
                  value={company.careersPageUrl}
                  source={company.fieldSources?.careersPageUrl}
                  placeholder={language === "en" ? "e.g. https://company.com/careers" : "ex: https://entreprise.com/carrieres"}
                  onSave={(val) => handleUpdateField("careersPageUrl", val)}
                />
              </div>
            </div>

            {/* Candidate Private Notes */}
            <div className="p-5 sm:p-6 rounded-2xl backdrop-blur-xl bg-white/[0.035] border border-white/10 space-y-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.15)] relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
              
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#FBBF24] uppercase tracking-wider flex items-center gap-1.5">
                  <Bookmark className="w-4 h-4 text-[#FBBF24]" />
                  {language === "en" ? "Your Private Notes & Strategy" : "Vos Notes Personnelles & Stratégie Candidat"}
                </span>
                {!isEditingNotes && (
                  <button
                    onClick={() => setIsEditingNotes(true)}
                    className="text-xs text-[#FF6685] hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{language === "en" ? "Edit notes" : "Modifier mes notes"}</span>
                  </button>
                )}
              </div>

              {isEditingNotes ? (
                <div className="space-y-3">
                  <textarea
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    placeholder={language === "en" ? "Record your strategy, questions for the recruiter, key contacts to reach out to..." : "Consignez votre stratégie d'approche, questions à poser en entretien, contacts ciblés..."}
                    rows={4}
                    className="w-full p-3.5 rounded-xl bg-black/60 border border-[#FF6685]/50 text-xs text-[#F5F6FA] focus:outline-none focus:border-[#FF6685] transition-all resize-none leading-relaxed"
                  />
                  <div className="flex justify-end gap-2">
                    <GlassButton variant="secondary" size="sm" onClick={() => setIsEditingNotes(false)}>
                      {language === "en" ? "Cancel" : "Annuler"}
                    </GlassButton>
                    <GlassButton variant="primary" size="sm" onClick={handleSaveNotes}>
                      {language === "en" ? "Save notes" : "Enregistrer"}
                    </GlassButton>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => setIsEditingNotes(true)}
                  className="p-4 rounded-xl backdrop-blur-md bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 cursor-pointer text-xs text-[#F5F6FA] min-h-[70px] leading-relaxed transition-colors"
                >
                  {company.notes ? (
                    <span className="whitespace-pre-wrap">{company.notes}</span>
                  ) : (
                    <span className="italic text-[#9AA0B2]/60">
                      {language === "en" ? "No private notes yet. Click here to add your thoughts or interview prep notes." : "Aucune note personnelle. Cliquez ici pour ajouter vos réflexions ou éléments de préparation."}
                    </span>
                  )}
                </div>
              )}
            </div>

          </div>
        )}

        {/* Footer info strip */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/10 text-[11px] text-[#9AA0B2]">
          <span>
            {company.lastEnrichedAt ? (
              `${language === "en" ? "Last synchronized with web data:" : "Dernière actualisation des données :"} ${new Date(company.lastEnrichedAt).toLocaleDateString(language === "en" ? "en-US" : "fr-FR")} à ${new Date(company.lastEnrichedAt).toLocaleTimeString(language === "en" ? "en-US" : "fr-FR", { hour: "2-digit", minute: "2-digit" })}`
            ) : (
              language === "en" ? "Data not yet synchronized with AI" : "Données non encore synchronisées avec l'IA"
            )}
          </span>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-[#9AA0B2] hover:text-[#F5F6FA] transition-colors cursor-pointer"
          >
            {language === "en" ? "Back to company list" : "Retour à la liste"}
          </button>
        </div>

      </div>
    </div>
  );
};

// Inline Editable Field Component with subtle Liquid Glass style
const EditableFieldCard: React.FC<{
  label: string;
  value?: string;
  source?: "manual" | "ai";
  placeholder?: string;
  isTextarea?: boolean;
  onSave: (val: string) => void;
}> = ({ label, value, source, placeholder, isTextarea, onSave }) => {
  const { language } = useLanguage();
  const defaultPlaceholder = language === "en" ? "Not specified — Click to add" : "Non renseigné — Cliquer pour ajouter";
  const displayPlaceholder = placeholder || defaultPlaceholder;
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(value || "");

  useEffect(() => {
    setText(value || "");
  }, [value]);

  const handleBlur = () => {
    setIsEditing(false);
    if (text !== (value || "")) {
      onSave(text);
    }
  };

  return (
    <div className="p-4 rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all space-y-1.5 group shadow-[0_4px_16px_rgba(0,0,0,0.18),inset_0_1px_1px_rgba(255,255,255,0.1)] relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
      
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#9AA0B2] uppercase tracking-wider">{label}</span>
          <div className="flex items-center gap-1.5">
            {source === "ai" && (
              <span className="text-[9px] bg-[rgba(192,132,252,0.12)] text-[#C084FC] px-2 py-0.5 rounded-full border border-[rgba(192,132,252,0.25)] flex items-center gap-1 font-semibold">
                <Sparkles className="w-2.5 h-2.5" /> {language === "en" ? "AI" : "IA"}
              </span>
            )}
            {source === "manual" && (
              <span className="text-[9px] bg-white/5 text-[#9AA0B2] px-2 py-0.5 rounded-full border border-white/10">
                {language === "en" ? "Manual" : "Manuel"}
              </span>
            )}
            <button 
              onClick={() => setIsEditing(true)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-[#FF6685] hover:underline flex items-center gap-1 cursor-pointer font-semibold"
            >
              {language === "en" ? "Edit" : "Éditer"}
            </button>
          </div>
        </div>
      )}
      {isEditing ? (
        isTextarea ? (
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleBlur}
            className="w-full bg-black/70 border border-[#FF6685]/60 rounded-xl p-3 text-xs text-[#F5F6FA] focus:outline-none focus:border-[#FF6685] leading-relaxed"
            rows={3}
          />
        ) : (
          <input
            autoFocus
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => { if (e.key === "Enter") handleBlur(); }}
            className="w-full bg-black/70 border border-[#FF6685]/60 rounded-xl px-3 py-2 text-xs text-[#F5F6FA] focus:outline-none focus:border-[#FF6685]"
          />
        )
      ) : (
        <div 
          onClick={() => setIsEditing(true)}
          className="cursor-pointer text-xs text-[#F5F6FA] min-h-[22px] flex items-center"
        >
          {value ? (
            <span className="leading-relaxed font-normal">{value}</span>
          ) : (
            <span className="text-[#9AA0B2]/50 italic">{displayPlaceholder}</span>
          )}
        </div>
      )}
    </div>
  );
};
