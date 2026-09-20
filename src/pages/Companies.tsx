import React, { useState, useEffect, useMemo } from "react";
import { useLanguage } from "../context/LanguageContext";
import { dbStore } from "../dbStore";
import { Company, Contact, Opportunity } from "../types";
import { GlassCard, Badge, GlassButton, Modal } from "../components/Shared";
import { CompanyDetailWorkspace } from "../components/CompanyDetailWorkspace";
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
  Plus, 
  ArrowRight, 
  ExternalLink, 
  Layers, 
  Filter, 
  Check 
} from "lucide-react";

interface CompaniesProps {
  searchTerm: string;
  showToast: (message: string, type: "success" | "error" | "info" | "ai") => void;
  onSelectContact?: (contactId: string) => void;
}

export const Companies: React.FC<CompaniesProps> = ({ searchTerm, showToast, onSelectContact }) => {
  const { language, t } = useLanguage();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [associatedContacts, setAssociatedContacts] = useState<Contact[]>([]);
  const [associatedOpps, setAssociatedOpps] = useState<Opportunity[]>([]);
  
  // Filter & Search
  const [selectedSector, setSelectedSector] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State for Adding Company
  const [newName, setNewName] = useState("");
  const [newSector, setNewSector] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newDescription, setNewDescription] = useState("");

  useEffect(() => {
    setCompanies(dbStore.getCompanies());
    const unsub = dbStore.subscribe(() => {
      setCompanies(dbStore.getCompanies());
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      const allContacts = dbStore.getContacts();
      const allOpps = dbStore.getOpportunities();
      setAssociatedContacts(allContacts.filter(c => c.companyId === selectedCompany.id || c.companyName?.toLowerCase() === selectedCompany.name?.toLowerCase()));
      setAssociatedOpps(allOpps.filter(o => o.companyId === selectedCompany.id || o.companyName?.toLowerCase() === selectedCompany.name?.toLowerCase()));
    }
  }, [selectedCompany, companies]);

  // Unique list of available sectors for filtering
  const availableSectors = useMemo(() => {
    const sectorsSet = new Set<string>();
    companies.forEach(co => {
      if (co.sector && co.sector.trim().length > 0) {
        sectorsSet.add(co.sector.trim());
      }
    });
    return Array.from(sectorsSet);
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    return companies.filter(co => {
      const matchesSearch = 
        co.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (co.sector && co.sector.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (co.description && co.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (co.location && co.location.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesSector = 
        selectedSector === "all" || 
        (co.sector && co.sector.toLowerCase() === selectedSector.toLowerCase());

      return matchesSearch && matchesSector;
    });
  }, [companies, searchTerm, selectedSector]);

  // Stats calculation
  const totalEnriched = useMemo(() => {
    return companies.filter(c => !!c.lastEnrichedAt || c.enrichmentStatus === "enriched").length;
  }, [companies]);

  const totalOppsLinked = useMemo(() => {
    return companies.reduce((acc, curr) => acc + (curr.opportunityCount || 0), 0);
  }, [companies]);

  const totalContactsLinked = useMemo(() => {
    return companies.reduce((acc, curr) => acc + (curr.contactCount || 0), 0);
  }, [companies]);

  // Handle Add New Company
  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      showToast("Veuillez saisir le nom de l'entreprise", "error");
      return;
    }

    const newCompany: Company = {
      id: "comp_" + Math.random().toString(36).substring(2, 9),
      name: newName.trim(),
      sector: newSector.trim() || undefined,
      website: newWebsite.trim() || undefined,
      location: newLocation.trim() || undefined,
      description: newDescription.trim() || undefined,
      notes: "",
      createdAt: new Date().toISOString(),
      opportunityCount: 0,
      contactCount: 0,
      noteCount: 0,
      fieldSources: {
        name: "manual",
        ...(newSector ? { sector: "manual" } : {}),
        ...(newDescription ? { description: "manual" } : {})
      }
    };

    dbStore.addCompany(newCompany);
    setCompanies(dbStore.getCompanies());
    setSelectedCompany(newCompany);
    setIsAddModalOpen(false);
    setNewName("");
    setNewSector("");
    setNewWebsite("");
    setNewLocation("");
    setNewDescription("");
    showToast(`Entreprise "${newCompany.name}" créée !`, "success");
  };

  // If a company is selected, render the full-width workspace
  if (selectedCompany) {
    return (
      <div className="relative z-10 w-full">
        <CompanyDetailWorkspace
          company={selectedCompany}
          associatedContacts={associatedContacts}
          associatedOpps={associatedOpps}
          onClose={() => setSelectedCompany(null)}
          onUpdate={(updated) => {
            setSelectedCompany(updated);
            setCompanies(dbStore.getCompanies());
          }}
          onSelectContact={onSelectContact}
          showToast={showToast}
        />
      </div>
    );
  }

  return (
    <div className="relative z-10 w-full space-y-6">
      
      {/* 1. HEADER & ACTIONS SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-[#F5F6FA] tracking-tight font-display whitespace-nowrap">
            {t.companies.title}
          </h1>
          <p className="text-[#9AA0B2] text-xs sm:text-sm mt-0.5">
            {t.companies.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <GlassButton
            variant="primary"
            size="md"
            onClick={() => setIsAddModalOpen(true)}
            icon={<Plus className="w-3.5 h-3.5 text-white" />}
          >
            {language === "en" ? "Add company" : "Ajouter une entreprise"}
          </GlassButton>
        </div>
      </div>

      {/* 2. STATS BANNER */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[rgba(216,26,69,0.12)] border border-[rgba(216,26,69,0.25)] flex items-center justify-center text-[#FF6685] shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-[#F5F6FA] font-display">{companies.length}</div>
            <div className="text-[11px] text-[#9AA0B2] font-medium">{language === "en" ? "Target Companies" : "Entreprises ciblées"}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[rgba(192,132,252,0.12)] border border-[rgba(192,132,252,0.25)] flex items-center justify-center text-[#C084FC] shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-[#F5F6FA] font-display">{totalEnriched}</div>
            <div className="text-[11px] text-[#9AA0B2] font-medium">{language === "en" ? "AI Web Enriched" : "Fiches enrichies IA"}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[rgba(56,189,248,0.12)] border border-[rgba(56,189,248,0.25)] flex items-center justify-center text-[#38BDF8] shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-[#F5F6FA] font-display">{totalContactsLinked}</div>
            <div className="text-[11px] text-[#9AA0B2] font-medium">{language === "en" ? "Network Contacts" : "Contacts associés"}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[rgba(18,183,106,0.12)] border border-[rgba(18,183,106,0.25)] flex items-center justify-center text-[#34D399] shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-[#F5F6FA] font-display">{totalOppsLinked}</div>
            <div className="text-[11px] text-[#9AA0B2] font-medium">{language === "en" ? "Linked Job Opps" : "Offres répertoriées"}</div>
          </div>
        </div>
      </div>

      {/* 3. SECTOR FILTER CHIPS */}
      {availableSectors.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none flex-nowrap">
          <button
            onClick={() => setSelectedSector("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer border ${
              selectedSector === "all"
                ? "bg-white/[0.1] text-white border-white/25 shadow-[0_0_12px_rgba(255,255,255,0.08)]"
                : "bg-white/[0.02] hover:bg-white/[0.05] text-[#9AA0B2] hover:text-[#F5F6FA] border-white/5"
            }`}
          >
            {language === "en" ? "All Sectors" : "Tous les secteurs"} ({companies.length})
          </button>
          {availableSectors.map((sector) => {
            const count = companies.filter(c => c.sector === sector).length;
            const isSelected = selectedSector.toLowerCase() === sector.toLowerCase();
            return (
              <button
                key={sector}
                onClick={() => setSelectedSector(sector)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer border ${
                  isSelected
                    ? "bg-[rgba(216,26,69,0.15)] text-[#FF6685] border-[rgba(216,26,69,0.35)] shadow-[0_0_12px_rgba(216,26,69,0.2)]"
                    : "bg-white/[0.02] hover:bg-white/[0.05] text-[#9AA0B2] hover:text-[#F5F6FA] border-white/5"
                }`}
              >
                <span>{sector}</span>
                <span className="ml-1.5 opacity-60 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 4. COMPANY CARDS GRID */}
      {filteredCompanies.length === 0 ? (
        <div className="p-12 rounded-2xl backdrop-blur-xl bg-white/[0.02] border border-dashed border-white/10 text-center space-y-3">
          <Building2 className="w-8 h-8 text-[#9AA0B2] mx-auto opacity-50" />
          <h3 className="text-base font-bold text-[#F5F6FA]">
            {language === "en" ? "No companies found" : "Aucune entreprise trouvée"}
          </h3>
          <p className="text-xs text-[#9AA0B2] max-w-md mx-auto">
            {language === "en"
              ? "Try adjusting your search criteria or add a new company manually."
              : "Essayez de modifier votre recherche ou ajoutez une nouvelle entreprise manuellement."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCompanies.map((co) => {
            const initial = co.name ? co.name.substring(0, 1).toUpperCase() : "E";
            const theme = getCompanyTheme(co.sector, co.name);

            return (
              <div
                key={co.id}
                onClick={() => setSelectedCompany(co)}
                className="p-5 rounded-2xl backdrop-blur-2xl bg-white/[0.035] hover:bg-white/[0.07] border border-white/10 hover:border-white/20 transition-all duration-200 flex flex-col justify-between cursor-pointer group relative overflow-hidden shadow-[0_12px_32px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] hover:-translate-y-1"
              >
                {/* Specular top light reflex */}
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

                <div className="space-y-3.5">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${theme.avatarGradient} border ${theme.avatarBorder} flex items-center justify-center ${theme.avatarText} font-black text-xl font-display shrink-0 ${theme.avatarShadow} group-hover:scale-105 transition-transform`}>
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-[#F5F6FA] truncate font-display group-hover:text-white transition-colors">
                          {co.name}
                        </h3>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border inline-block truncate max-w-[180px] mt-0.5 ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}>
                          {co.sector || theme.sectorLabel}
                        </span>
                      </div>
                    </div>

                    {co.lastEnrichedAt && (
                      <span className="px-2 py-0.5 rounded-full border border-emerald-500/30 text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 flex items-center gap-1 shrink-0" title={language === "en" ? "Enriched data" : "Données enrichies"}>
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>IA</span>
                      </span>
                    )}
                  </div>

                  {/* Location & Size details if available */}
                  {(co.location || co.size) && (
                    <div className="flex items-center gap-2 text-[11px] text-[#9AA0B2]">
                      {co.location && (
                        <span className="flex items-center gap-1 text-[#38BDF8]">
                          <MapPin className="w-3 h-3 text-[#38BDF8]" />
                          <span className="truncate max-w-[140px] text-[#9AA0B2]">{co.location}</span>
                        </span>
                      )}
                      {co.location && co.size && <span className="text-white/20">•</span>}
                      {co.size && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-[#C084FC]" />
                          <span className="text-[#9AA0B2]">{co.size}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Description preview */}
                  {co.description ? (
                    <p className="text-xs text-[#9AA0B2] line-clamp-2 leading-relaxed">
                      {co.description}
                    </p>
                  ) : co.notes ? (
                    <p className="text-xs text-[#9AA0B2] line-clamp-2 leading-relaxed">
                      {co.notes}
                    </p>
                  ) : (
                    <p className="text-xs text-[#9AA0B2]/50 italic">
                      {language === "en" ? "Click to explore and enrich company details." : "Cliquer pour explorer et enrichir la fiche entreprise."}
                    </p>
                  )}
                </div>

                {/* Card Footer: Metrics & Action Link with rich color code */}
                <div className="pt-4 mt-4 border-t border-white/10 space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-[rgba(216,26,69,0.08)] p-2 rounded-xl border border-[rgba(216,26,69,0.20)] shadow-[0_2px_10px_rgba(216,26,69,0.08)]">
                      <span className="block text-xs font-bold text-[#FF6685]">{co.opportunityCount || 0}</span>
                      <span className="text-[9px] text-[#9AA0B2] uppercase font-semibold">{t.companies.jobs}</span>
                    </div>
                    <div className="bg-[rgba(56,189,248,0.08)] p-2 rounded-xl border border-[rgba(56,189,248,0.20)] shadow-[0_2px_10px_rgba(56,189,248,0.08)]">
                      <span className="block text-xs font-bold text-[#38BDF8]">{co.contactCount || 0}</span>
                      <span className="text-[9px] text-[#9AA0B2] uppercase font-semibold">{t.companies.contacts}</span>
                    </div>
                    <div className="bg-[rgba(18,183,106,0.08)] p-2 rounded-xl border border-[rgba(18,183,106,0.20)] shadow-[0_2px_10px_rgba(18,183,106,0.08)]">
                      <span className="block text-xs font-bold text-[#34D399]">{co.revenue ? "CA" : (co.noteCount || 0)}</span>
                      <span className="text-[9px] text-[#9AA0B2] uppercase font-semibold">{co.revenue ? "Info" : t.companies.notes}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-[#9AA0B2] group-hover:text-[#F5F6FA] transition-colors font-medium">
                      {language === "en" ? "Open company workspace" : "Ouvrir l'espace entreprise"}
                    </span>
                    <span className="text-xs font-bold text-[#FF6685] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 5. ADD COMPANY MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={language === "en" ? "Add Target Company" : "Ajouter une Entreprise Cible"}
      >
        <form onSubmit={handleCreateCompany} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#9AA0B2] mb-1">
              {language === "en" ? "Company Name *" : "Nom de l'entreprise *"}
            </label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="ex: Trade Republic, Revolut, BNP Paribas..."
              className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#9AA0B2] mb-1">
                {language === "en" ? "Sector / Industry" : "Secteur d'activité"}
              </label>
              <input
                type="text"
                value={newSector}
                onChange={(e) => setNewSector(e.target.value)}
                placeholder="ex: FinTech, Banque, Conseil..."
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9AA0B2] mb-1">
                {language === "en" ? "Location / City" : "Ville / Siège social"}
              </label>
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="ex: Paris, Berlin, Lyon..."
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9AA0B2] mb-1">
              {language === "en" ? "Website URL" : "Site web officiel"}
            </label>
            <input
              type="text"
              value={newWebsite}
              onChange={(e) => setNewWebsite(e.target.value)}
              placeholder="ex: https://traderepublic.com"
              className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9AA0B2] mb-1">
              {language === "en" ? "Short description or notes" : "Courte description ou notes"}
            </label>
            <textarea
              rows={3}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="ex: Leader européen du courtage en ligne, forte croissance..."
              className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA] resize-none"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
            <GlassButton
              variant="secondary"
              size="md"
              type="button"
              onClick={() => setIsAddModalOpen(false)}
            >
              {language === "en" ? "Cancel" : "Annuler"}
            </GlassButton>
            <GlassButton
              variant="primary"
              size="md"
              type="submit"
              icon={<Plus className="w-3.5 h-3.5 text-white" />}
            >
              {language === "en" ? "Create Company" : "Créer l'entreprise"}
            </GlassButton>
          </div>
        </form>
      </Modal>

    </div>
  );
};
