import React, { useState, useEffect } from "react";
import { dbStore } from "../dbStore";
import { Company, Contact, Opportunity } from "../types";
import { GlassCard, Badge, GlassButton, Modal } from "../components/Shared";
import { Building2, Search, Users, Briefcase, FileText, ChevronRight, MapPin } from "lucide-react";

interface CompaniesProps {
  searchTerm: string;
  showToast: (message: string, type: "success" | "error" | "info" | "ai") => void;
}

export const Companies: React.FC<CompaniesProps> = ({ searchTerm, showToast }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [associatedContacts, setAssociatedContacts] = useState<Contact[]>([]);
  const [associatedOpps, setAssociatedOpps] = useState<Opportunity[]>([]);

  useEffect(() => {
    setCompanies(dbStore.getCompanies());
    const unsub = dbStore.subscribe(() => {
      setCompanies(dbStore.getCompanies());
    });
    return unsub;
  }, []);

  // Update bidirectionally linked entities when a company is selected
  useEffect(() => {
    if (selectedCompany) {
      const allContacts = dbStore.getContacts();
      const allOpps = dbStore.getOpportunities();
      setAssociatedContacts(allContacts.filter(c => c.companyId === selectedCompany.id));
      setAssociatedOpps(allOpps.filter(o => o.companyId === selectedCompany.id));
    }
  }, [selectedCompany, companies]);

  // Filter companies
  const filteredCompanies = companies.filter(co => 
    co.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (co.sector && co.sector.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="relative z-10 w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-[#F5F6FA] tracking-tight font-display">Entreprises de l'écosystème</h1>
        <p className="text-[#9AA0B2] text-sm mt-1">Explore les structures de ton réseau, croise les opportunités d'emploi et tes contacts influents</p>
      </div>

      {/* Grid of companies */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCompanies.map(co => (
          <GlassCard
            key={co.id}
            onClick={() => setSelectedCompany(co)}
            className="p-5 flex flex-col justify-between"
            hoverable
          >
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[rgba(216,26,69,0.2)] to-[rgba(255,26,85,0.1)] border border-[rgba(216,26,69,0.3)] flex items-center justify-center text-[#FF6685]">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#F5F6FA] truncate font-display">{co.name}</h3>
                  <span className="text-[10px] text-[#9AA0B2] bg-white/[0.04] px-2.5 py-0.5 rounded-full border border-white/5">
                    {co.sector || "Banque & Tech"}
                  </span>
                </div>
              </div>

              {co.notes && (
                <p className="text-xs text-[#9AA0B2] line-clamp-2 leading-relaxed mb-4">
                  {co.notes}
                </p>
              )}

              {/* Counters */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10 text-center">
                <div className="bg-white/[0.02] p-2 rounded-xl border border-white/5">
                  <span className="block text-xs font-bold text-[#F5F6FA]">{co.opportunityCount}</span>
                  <span className="text-[9px] text-[#9AA0B2] uppercase font-semibold">Offres</span>
                </div>
                <div className="bg-white/[0.02] p-2 rounded-xl border border-white/5">
                  <span className="block text-xs font-bold text-[#F5F6FA]">{co.contactCount}</span>
                  <span className="text-[9px] text-[#9AA0B2] uppercase font-semibold">Contacts</span>
                </div>
                <div className="bg-white/[0.02] p-2 rounded-xl border border-white/5">
                  <span className="block text-xs font-bold text-[#F5F6FA]">{co.noteCount}</span>
                  <span className="text-[9px] text-[#9AA0B2] uppercase font-semibold">Notes</span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <span className="text-xs font-bold text-[#FF6685] flex items-center gap-1 hover:text-[#F5F6FA] transition-spring cursor-pointer">
                <span>Consulter l'écosystème</span>
                <ChevronRight className="w-4 h-4" />
              </span>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* --- COMPANY DETAILED MODAL --- */}
      {selectedCompany && (
        <Modal
          isOpen={!!selectedCompany}
          onClose={() => setSelectedCompany(null)}
          title={`Fiche Entreprise : ${selectedCompany.name}`}
          size="xl"
        >
          <div className="space-y-6">
            
            {/* compact summary banner */}
            <div className="grid grid-cols-3 gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/10 text-center">
              <div>
                <span className="block text-2xl font-extrabold text-[#FF6685] font-display">{associatedOpps.length}</span>
                <span className="text-xs text-[#9AA0B2] font-semibold">Opportunités enregistrées</span>
              </div>
              <div>
                <span className="block text-2xl font-extrabold text-[#38BDF8] font-display">{associatedContacts.length}</span>
                <span className="text-xs text-[#9AA0B2] font-semibold">Contacts réseau</span>
              </div>
              <div>
                <span className="block text-2xl font-extrabold text-[#12B76A] font-display">{selectedCompany.noteCount}</span>
                <span className="text-xs text-[#9AA0B2] font-semibold">Notes d'écosystème</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs text-[#9AA0B2] uppercase font-bold tracking-wider">Description de la structure</h4>
              <textarea
                value={selectedCompany.notes}
                onChange={(e) => {
                  const updated = { ...selectedCompany, notes: e.target.value, noteCount: e.target.value ? 1 : 0 };
                  setSelectedCompany(updated);
                  dbStore.updateCompany(updated);
                }}
                className="w-full min-h-[100px] glass-input p-3.5 text-xs text-[#F5F6FA] leading-relaxed placeholder-[#9AA0B2]/60"
                placeholder="Renseigne des informations générales sur la politique de recrutement, les salaires d'embauche ou tes notes de veille sur cette entreprise..."
              />
            </div>

            {/* Bidirectional view of Contacts grid */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs text-[#9AA0B2] uppercase font-bold tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-[#38BDF8]" />
                Contacts associés (Réseau complet)
              </h4>
              {associatedContacts.length === 0 ? (
                <div className="p-4 rounded-2xl border border-dashed border-white/10 text-xs text-[#9AA0B2] text-center">
                  Aucun contact associé. Importe des relations LinkedIn ou ajoute un professionnel pour le lier à cette entreprise.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {associatedContacts.map(c => (
                    <div 
                      key={c.id}
                      className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-[#F5F6FA]">{c.fullName}</span>
                          <span className="text-[10px] text-[#9AA0B2]">{c.category === 'alumni' ? 'Alumni' : 'RH'}</span>
                        </div>
                        <p className="text-[11px] text-[#9AA0B2] truncate">{c.jobTitle}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bidirectional view of Opportunities grid */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs text-[#9AA0B2] uppercase font-bold tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#FF6685]" />
                Opportunités de recrutement associées
              </h4>
              {associatedOpps.length === 0 ? (
                <div className="p-4 rounded-2xl border border-dashed border-white/10 text-xs text-[#9AA0B2] text-center">
                  Aucune offre liée. Ajoute une offre d'emploi ou de stage pour démarrer le suivi.
                </div>
              ) : (
                <div className="space-y-3">
                  {associatedOpps.map(o => (
                    <div 
                      key={o.id}
                      className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-4"
                    >
                      <div>
                        <span className="text-xs font-bold text-[#F5F6FA] block font-display">{o.title}</span>
                        <span className="text-[10px] text-[#9AA0B2] mt-0.5 inline-flex items-center gap-2">
                          <span>{o.contractType}</span>
                          <span>&bull;</span>
                          <span>{o.location}</span>
                        </span>
                      </div>
                      <span className="text-[10px] uppercase font-bold bg-white/5 text-[#9AA0B2] px-2.5 py-1 rounded-full border border-white/5">
                        {o.status === 'saved' ? 'Sauvegardée' : o.status === 'to_study' ? 'À étudier' : o.status === 'to_prepare' ? 'À préparer' : 'À candidater'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-white/10">
              <GlassButton variant="secondary" onClick={() => setSelectedCompany(null)}>
                Fermer l'espace entreprise
              </GlassButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
