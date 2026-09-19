import React, { useState } from "react";
import { CandidateProfile } from "../../types";
import { Target, Briefcase, Calendar, DollarSign, Laptop, AlertTriangle, Plus, X, Edit3, ShieldAlert } from "lucide-react";
import { ProfileModal } from "./ProfileModal";

interface ObjectivesSectionProps {
  profile: CandidateProfile;
  onSave: (updated: Partial<CandidateProfile>) => void;
}

export const ObjectivesSection: React.FC<ObjectivesSectionProps> = ({ profile, onSave }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Target Arrays
  const [targetTitles, setTargetTitles] = useState<string[]>(profile.targetTitles || []);
  const [newTitleInput, setNewTitleInput] = useState("");

  const [targetSectors, setTargetSectors] = useState<string[]>(profile.targetSectors || []);
  const [newSectorInput, setNewSectorInput] = useState("");

  const [targetCompanies, setTargetCompanies] = useState<string[]>(profile.targetCompanies || []);
  const [newCompanyInput, setNewCompanyInput] = useState("");

  // Contracts
  const availableContracts = ["Stage", "Alternance", "CDI", "CDD", "VIE", "Graduate Program", "Freelance"];
  const [contractTypes, setContractTypes] = useState<string[]>(profile.contractTypes || ["Alternance", "Stage"]);

  const [startDateTarget, setStartDateTarget] = useState(profile.startDateTarget || "Septembre 2025");
  const [durationTarget, setDurationTarget] = useState(profile.durationTarget || "12 à 24 mois");
  const [minSalary, setMinSalary] = useState(profile.minSalary || "1 400 € / mois");
  const [workMode, setWorkMode] = useState<"hybride" | "remote" | "presentiel" | "indifferent">(profile.workMode || "hybride");

  // Free text
  const [idealPositionSearch, setIdealPositionSearch] = useState(profile.idealPositionSearch || "");

  // Red Flags
  const [avoidSectors, setAvoidSectors] = useState<string[]>(profile.avoidSectors || []);
  const [newAvoidInput, setNewAvoidInput] = useState("");

  const [redFlags, setRedFlags] = useState<string[]>(profile.redFlags || []);
  const [newRedFlagInput, setNewRedFlagInput] = useState("");

  const handleOpen = () => {
    setTargetTitles(profile.targetTitles || []);
    setTargetSectors(profile.targetSectors || []);
    setTargetCompanies(profile.targetCompanies || []);
    setContractTypes(profile.contractTypes || ["Alternance", "Stage"]);
    setStartDateTarget(profile.startDateTarget || "Septembre 2025");
    setDurationTarget(profile.durationTarget || "12 à 24 mois");
    setMinSalary(profile.minSalary || "1 400 € / mois");
    setWorkMode(profile.workMode || "hybride");
    setIdealPositionSearch(profile.idealPositionSearch || "");
    setAvoidSectors(profile.avoidSectors || []);
    setRedFlags(profile.redFlags || []);
    setIsModalOpen(true);
  };

  const handleToggleContract = (c: string) => {
    if (contractTypes.includes(c)) {
      setContractTypes(contractTypes.filter((type) => type !== c));
    } else {
      setContractTypes([...contractTypes, c]);
    }
  };

  const handleAddChip = (list: string[], setList: (l: string[]) => void, input: string, setInput: (s: string) => void) => {
    if (!input.trim()) return;
    if (!list.includes(input.trim())) {
      setList([...list, input.trim()]);
    }
    setInput("");
  };

  const handleRemoveChip = (list: string[], setList: (l: string[]) => void, item: string) => {
    setList(list.filter((i) => i !== item));
  };

  const handleSubmit = () => {
    onSave({
      targetTitles,
      targetSectors,
      targetCompanies,
      contractTypes,
      startDateTarget,
      durationTarget,
      minSalary,
      workMode,
      idealPositionSearch,
      avoidSectors,
      redFlags,
    });
    setIsModalOpen(false);
  };

  const workModeLabels = {
    hybride: "Hybride",
    remote: "100% Remote",
    presentiel: "Présentiel",
    indifferent: "Indifférent",
  };

  return (
    <div id="objectifs" className="glass-panel relative overflow-hidden rounded-3xl p-6 md:p-8 space-y-6 before:absolute before:top-0 before:left-0 before:right-0 before:h-[1.5px] before:bg-gradient-to-r before:from-transparent before:via-white/45 before:to-transparent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/12">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#38BDF8]/15 border border-[#38BDF8]/30 flex items-center justify-center text-[#38BDF8] shadow-[0_0_12px_rgba(56,189,248,0.2)]">
              <Target className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-[#F5F6FA] font-display">Objectifs & Préférences</h3>
          </div>
          <p className="text-xs text-[#9AA0B2]">Définis ce que tu recherches afin de structurer ton projet professionnel.</p>
        </div>

        <button
          onClick={handleOpen}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.14] border border-white/18 hover:border-white/35 text-xs font-bold text-[#F5F6FA] backdrop-blur-2xl shadow-[0_4px_16px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.28)] transition-all cursor-pointer hover:-translate-y-0.5"
        >
          <Edit3 className="w-3.5 h-3.5 text-[#38BDF8]" />
          <span>Modifier</span>
        </button>
      </div>

      {/* Grid view */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Postes & Secteurs */}
        <div className="glass-card-static p-5 space-y-4 hover:border-white/25 transition-all duration-300 hover:-translate-y-0.5">
          <h4 className="text-xs font-bold text-[#38BDF8] uppercase tracking-wider font-display">
            Postes & Secteurs Ciblés
          </h4>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[#9AA0B2] block text-[10px] uppercase font-bold mb-1.5">Intitulés de postes recherchés</span>
              <div className="flex flex-wrap gap-1.5">
                {(profile.targetTitles || []).length > 0 ? (
                  profile.targetTitles?.map((t, i) => (
                    <span key={i} className="glass-pill px-2.5 py-1 bg-[#38BDF8]/15 border-[#38BDF8]/35 text-[#38BDF8] font-semibold text-[11px]">
                      {t}
                    </span>
                  ))
                ) : (
                  <span className="text-[#9AA0B2] italic">Aucun poste spécifié</span>
                )}
              </div>
            </div>

            <div>
              <span className="text-[#9AA0B2] block text-[10px] uppercase font-bold mb-1.5">Domaines / Secteurs d'activité</span>
              <div className="flex flex-wrap gap-1.5">
                {(profile.targetSectors || []).length > 0 ? (
                  profile.targetSectors?.map((s, i) => (
                    <span key={i} className="glass-pill px-2.5 py-1 bg-white/10 border-white/15 text-[#F5F6FA] font-medium text-[11px]">
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-[#9AA0B2] italic">Aucun secteur spécifié</span>
                )}
              </div>
            </div>

            <div>
              <span className="text-[#9AA0B2] block text-[10px] uppercase font-bold mb-1.5">Entreprises ciblées</span>
              <div className="flex flex-wrap gap-1.5">
                {(profile.targetCompanies || []).length > 0 ? (
                  profile.targetCompanies?.map((c, i) => (
                    <span key={i} className="glass-pill px-2.5 py-1 bg-[#C084FC]/15 border-[#C084FC]/35 text-[#C084FC] font-semibold text-[11px]">
                      {c}
                    </span>
                  ))
                ) : (
                  <span className="text-[#9AA0B2] italic">Aucune entreprise spécifiée</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contrats & Modalités */}
        <div className="glass-card-static p-5 space-y-4 hover:border-white/25 transition-all duration-300 hover:-translate-y-0.5">
          <h4 className="text-xs font-bold text-[#FBBF24] uppercase tracking-wider font-display">
            Contrat & Disponibilité
          </h4>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[#9AA0B2] block text-[10px] uppercase font-bold mb-1.5">Contrats recherchés</span>
              <div className="flex flex-wrap gap-1.5">
                {(profile.contractTypes || []).map((ct, i) => (
                  <span key={i} className="glass-pill px-2.5 py-1 bg-[#FBBF24]/15 border-[#FBBF24]/35 text-[#FBBF24] font-bold text-[11px]">
                    {ct}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-[#9AA0B2] block text-[10px] uppercase font-bold">Début souhaité</span>
                <span className="text-[#F5F6FA] font-semibold">{profile.startDateTarget || "Dès que possible"}</span>
              </div>
              <div>
                <span className="text-[#9AA0B2] block text-[10px] uppercase font-bold">Durée</span>
                <span className="text-[#F5F6FA] font-semibold">{profile.durationTarget || "Indifférente"}</span>
              </div>
              <div>
                <span className="text-[#9AA0B2] block text-[10px] uppercase font-bold">Rémunération min</span>
                <span className="text-[#34D399] font-bold">{profile.minSalary || "À négocier"}</span>
              </div>
              <div>
                <span className="text-[#9AA0B2] block text-[10px] uppercase font-bold">Mode de travail</span>
                <span className="text-[#F5F6FA] font-semibold">{workModeLabels[profile.workMode || "hybride"]}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Free Text Ideal Position */}
      {profile.idealPositionSearch && (
        <div className="glass-card-static p-4 space-y-1.5 border-white/12">
          <span className="text-xs font-bold text-[#34D399] uppercase tracking-wider block font-display">
            Ce que je recherche vraiment
          </span>
          <p className="text-xs text-[#F5F6FA]/90 leading-relaxed italic">
            "{profile.idealPositionSearch}"
          </p>
        </div>
      )}

      {/* Avoid Sectors & Red Flags */}
      {((profile.avoidSectors || []).length > 0 || (profile.redFlags || []).length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {profile.avoidSectors && profile.avoidSectors.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-[#F04438]/5 border border-[#F04438]/20 space-y-2">
              <span className="text-xs font-bold text-[#F04438] uppercase tracking-wider flex items-center gap-1.5 font-display">
                <AlertTriangle className="w-3.5 h-3.5" />
                Secteurs à éviter
              </span>
              <div className="flex flex-wrap gap-1.5">
                {profile.avoidSectors.map((sec, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-lg bg-[#F04438]/10 text-[#FF6685] text-[11px] font-medium">
                    {sec}
                  </span>
                ))}
              </div>
            </div>
          )}

          {profile.redFlags && profile.redFlags.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-[#F04438]/5 border border-[#F04438]/20 space-y-2">
              <span className="text-xs font-bold text-[#F04438] uppercase tracking-wider flex items-center gap-1.5 font-display">
                <ShieldAlert className="w-3.5 h-3.5" />
                Critères rédhibitoires
              </span>
              <div className="flex flex-wrap gap-1.5">
                {profile.redFlags.map((rf, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-lg bg-[#F04438]/10 text-[#FF6685] text-[11px] font-medium">
                    {rf}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      <ProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Modifier Objectifs & Préférences"
        subtitle="Définis tes cibles professionnelles et critères de recherche"
        onSubmit={handleSubmit}
      >
        <div className="space-y-5">
          {/* Postes */}
          <div>
            <label className="block text-xs font-bold text-[#F5F6FA] mb-1">
              Intitulés de postes / Métiers recherchés *
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {targetTitles.map((t, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#38BDF8]/15 text-[#38BDF8] text-xs font-semibold">
                  <span>{t}</span>
                  <button type="button" onClick={() => handleRemoveChip(targetTitles, setTargetTitles, t)} className="hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTitleInput}
                onChange={(e) => setNewTitleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddChip(targetTitles, setTargetTitles, newTitleInput, setNewTitleInput);
                  }
                }}
                placeholder="ex: Analyste Financier, Conseiller Clientèle..."
                className="flex-1 glass-input px-3.5 py-1.5 text-xs text-[#F5F6FA]"
              />
              <button
                type="button"
                onClick={() => handleAddChip(targetTitles, setTargetTitles, newTitleInput, setNewTitleInput)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-bold text-white rounded-xl"
              >
                Ajouter
              </button>
            </div>
          </div>

          {/* Secteurs */}
          <div>
            <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Domaines / Secteurs d'activité</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {targetSectors.map((s, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 text-white text-xs font-medium">
                  <span>{s}</span>
                  <button type="button" onClick={() => handleRemoveChip(targetSectors, setTargetSectors, s)} className="hover:text-red-400">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSectorInput}
                onChange={(e) => setNewSectorInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddChip(targetSectors, setTargetSectors, newSectorInput, setNewSectorInput);
                  }
                }}
                placeholder="ex: Banque & Assurance, Fintech..."
                className="flex-1 glass-input px-3.5 py-1.5 text-xs text-[#F5F6FA]"
              />
              <button
                type="button"
                onClick={() => handleAddChip(targetSectors, setTargetSectors, newSectorInput, setNewSectorInput)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-bold text-white rounded-xl"
              >
                Ajouter
              </button>
            </div>
          </div>

          {/* Entreprises */}
          <div>
            <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Entreprises ciblées</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {targetCompanies.map((c, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#C084FC]/20 text-[#C084FC] text-xs font-semibold">
                  <span>{c}</span>
                  <button type="button" onClick={() => handleRemoveChip(targetCompanies, setTargetCompanies, c)} className="hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCompanyInput}
                onChange={(e) => setNewCompanyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddChip(targetCompanies, setTargetCompanies, newCompanyInput, setNewCompanyInput);
                  }
                }}
                placeholder="ex: Crédit Agricole, BNP Paribas..."
                className="flex-1 glass-input px-3.5 py-1.5 text-xs text-[#F5F6FA]"
              />
              <button
                type="button"
                onClick={() => handleAddChip(targetCompanies, setTargetCompanies, newCompanyInput, setNewCompanyInput)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-bold text-white rounded-xl"
              >
                Ajouter
              </button>
            </div>
          </div>

          {/* Contrats Cards */}
          <div className="border-t border-white/10 pt-4">
            <label className="block text-xs font-bold text-[#FBBF24] uppercase tracking-wider mb-2">
              Types de contrat recherchés
            </label>
            <div className="flex flex-wrap gap-2">
              {availableContracts.map((ct) => {
                const isSelected = contractTypes.includes(ct);
                return (
                  <button
                    key={ct}
                    type="button"
                    onClick={() => handleToggleContract(ct)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#FBBF24] text-[#0B0F19] shadow-[0_0_12px_rgba(251,191,36,0.3)]"
                        : "bg-white/5 border border-white/10 text-[#9AA0B2] hover:text-white"
                    }`}
                  >
                    {ct}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Date de début</label>
              <input
                type="text"
                value={startDateTarget}
                onChange={(e) => setStartDateTarget(e.target.value)}
                placeholder="ex: Septembre 2025"
                className="w-full glass-input px-3 py-1.5 text-xs text-[#F5F6FA]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Durée souhaitée</label>
              <input
                type="text"
                value={durationTarget}
                onChange={(e) => setDurationTarget(e.target.value)}
                placeholder="ex: 12 à 24 mois"
                className="w-full glass-input px-3 py-1.5 text-xs text-[#F5F6FA]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Rémunération min</label>
              <input
                type="text"
                value={minSalary}
                onChange={(e) => setMinSalary(e.target.value)}
                placeholder="ex: 1 400 € / mois"
                className="w-full glass-input px-3 py-1.5 text-xs text-[#F5F6FA]"
              />
            </div>
          </div>

          {/* Work Mode */}
          <div>
            <label className="block text-xs font-bold text-[#F5F6FA] mb-2">Mode de travail préféré</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(["hybride", "remote", "presentiel", "indifferent"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setWorkMode(mode)}
                  className={`p-2.5 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer ${
                    workMode === mode
                      ? "bg-[#38BDF8]/20 border-[#38BDF8] text-[#38BDF8] shadow-[0_0_12px_rgba(56,189,248,0.2)]"
                      : "bg-white/5 border-white/10 text-[#9AA0B2] hover:text-white"
                  }`}
                >
                  {workModeLabels[mode]}
                </button>
              ))}
            </div>
          </div>

          {/* Free Text Search */}
          <div>
            <label className="block text-xs font-bold text-[#34D399] mb-1">Ce que je recherche vraiment</label>
            <textarea
              value={idealPositionSearch}
              onChange={(e) => setIdealPositionSearch(e.target.value)}
              placeholder="Décris librement le type de poste, d'environnement, d'équipe et de missions que tu recherches..."
              className="w-full min-h-[90px] glass-input p-3 text-xs text-[#F5F6FA] leading-relaxed"
            />
          </div>

          {/* Avoid & Red Flags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/10 pt-4">
            <div>
              <label className="block text-xs font-bold text-[#F04438] mb-1">Secteurs à éviter</label>
              <div className="flex flex-wrap gap-1 mb-2">
                {avoidSectors.map((a, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#F04438]/20 text-[#FF6685] text-xs font-medium">
                    <span>{a}</span>
                    <button type="button" onClick={() => handleRemoveChip(avoidSectors, setAvoidSectors, a)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newAvoidInput}
                  onChange={(e) => setNewAvoidInput(e.target.value)}
                  placeholder="ex: Téléprospection..."
                  className="flex-1 glass-input px-3 py-1 text-xs text-[#F5F6FA]"
                />
                <button
                  type="button"
                  onClick={() => handleAddChip(avoidSectors, setAvoidSectors, newAvoidInput, setNewAvoidInput)}
                  className="px-2.5 py-1 bg-white/10 text-xs font-bold text-white rounded-lg"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#F04438] mb-1">Critères rédhibitoires</label>
              <div className="flex flex-wrap gap-1 mb-2">
                {redFlags.map((rf, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#F04438]/20 text-[#FF6685] text-xs font-medium">
                    <span>{rf}</span>
                    <button type="button" onClick={() => handleRemoveChip(redFlags, setRedFlags, rf)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newRedFlagInput}
                  onChange={(e) => setNewRedFlagInput(e.target.value)}
                  placeholder="ex: Pas de télétravail..."
                  className="flex-1 glass-input px-3 py-1 text-xs text-[#F5F6FA]"
                />
                <button
                  type="button"
                  onClick={() => handleAddChip(redFlags, setRedFlags, newRedFlagInput, setNewRedFlagInput)}
                  className="px-2.5 py-1 bg-white/10 text-xs font-bold text-white rounded-lg"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      </ProfileModal>
    </div>
  );
};
