import React, { useState } from "react";
import { DetailedExperience } from "../../types";
import { Briefcase, Calendar, MapPin, Plus, Trash2, Edit3, ArrowUp, ArrowDown, CheckCircle2, TrendingUp, Sparkles } from "lucide-react";
import { ProfileModal } from "./ProfileModal";

interface ExperiencesSectionProps {
  experiences: DetailedExperience[];
  onSaveExperiences: (updated: DetailedExperience[]) => void;
}

export const ExperiencesSection: React.FC<ExperiencesSectionProps> = ({
  experiences,
  onSaveExperiences,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Form Fields
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [contractType, setContractType] = useState("Alternance");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCurrent, setIsCurrent] = useState(false);
  const [description, setDescription] = useState("");
  const [kpisInput, setKpisInput] = useState("");
  const [skillsInput, setSkillsInput] = useState("");

  const handleOpenAdd = () => {
    setEditingIndex(null);
    setRole("");
    setCompany("");
    setLocation("");
    setContractType("Alternance");
    setStartDate("");
    setEndDate("");
    setIsCurrent(false);
    setDescription("");
    setKpisInput("");
    setSkillsInput("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (exp: DetailedExperience, index: number) => {
    setEditingIndex(index);
    setRole(exp.role || "");
    setCompany(exp.company || "");
    setLocation(exp.location || "");
    setContractType(exp.contractType || "Alternance");
    setStartDate(exp.startDate || "");
    setEndDate(exp.endDate || "");
    setIsCurrent(exp.isCurrent || false);
    setDescription(exp.description || "");
    setKpisInput((exp.kpis || []).join(" | "));
    setSkillsInput((exp.skills || []).join(", "));
    setIsModalOpen(true);
  };

  const handleDelete = (index: number) => {
    const updated = experiences.filter((_, i) => i !== index);
    onSaveExperiences(updated);
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= experiences.length) return;
    const updated = [...experiences];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    onSaveExperiences(updated);
  };

  const handleSubmit = () => {
    const kpis = kpisInput
      .split("|")
      .map((k) => k.trim())
      .filter(Boolean);

    const skills = skillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    let periodStr = "";
    if (startDate) {
      if (isCurrent) {
        periodStr = `${startDate} → Aujourd'hui`;
      } else if (endDate) {
        periodStr = `${startDate} → ${endDate}`;
      } else {
        periodStr = startDate;
      }
    }

    const item: DetailedExperience = {
      id: editingIndex !== null ? experiences[editingIndex].id : "exp_" + Math.random().toString(36).substring(2, 9),
      role,
      company,
      location,
      contractType,
      startDate,
      endDate: isCurrent ? "" : endDate,
      isCurrent,
      period: periodStr,
      description,
      kpis,
      skills,
    };

    if (editingIndex !== null) {
      const updated = [...experiences];
      updated[editingIndex] = item;
      onSaveExperiences(updated);
    } else {
      onSaveExperiences([item, ...experiences]);
    }

    setIsModalOpen(false);
  };

  return (
    <div id="experiences" className="glass-panel relative overflow-hidden rounded-3xl p-6 md:p-8 space-y-6 before:absolute before:top-0 before:left-0 before:right-0 before:h-[1.5px] before:bg-gradient-to-r before:from-transparent before:via-white/45 before:to-transparent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/12">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#34D399]/15 border border-[#34D399]/30 flex items-center justify-center text-[#34D399] shadow-[0_0_12px_rgba(52,211,153,0.2)]">
              <Briefcase className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-[#F5F6FA] font-display">Expériences professionnelles</h3>
          </div>
          <p className="text-xs text-[#9AA0B2]">Tes missions, réalisations chiffrées et compétences développées.</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#D81A45] to-[#FF1A55] text-white font-bold text-xs shadow-[0_0_20px_rgba(216,26,69,0.4)] border border-[#FF6685]/50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer backdrop-blur-xl"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter une expérience</span>
        </button>
      </div>

      {/* Timeline List */}
      <div className="space-y-4">
        {experiences.length === 0 ? (
          <div className="text-center py-8 p-6 rounded-2xl bg-white/[0.02] border border-dashed border-white/10">
            <Briefcase className="w-8 h-8 text-[#9AA0B2]/40 mx-auto mb-2" />
            <p className="text-xs text-[#9AA0B2]">Aucune expérience renseignée pour le moment.</p>
          </div>
        ) : (
          experiences.map((exp, index) => (
            <div
              key={exp.id || index}
              className="glass-card-static p-5 space-y-3 hover:border-white/25 transition-all duration-300 hover:-translate-y-0.5 group"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base font-bold text-[#F5F6FA] font-display">{exp.role}</h4>
                    {exp.isCurrent && (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#34D399]/15 border border-[#34D399]/30 text-[#34D399] text-[10px] font-bold">
                        En cours
                      </span>
                    )}
                    {exp.contractType && (
                      <span className="px-2 py-0.5 rounded-lg bg-white/5 text-[#9AA0B2] text-[10px] font-semibold border border-white/10">
                        {exp.contractType}
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-bold text-[#FF6685]">{exp.company}</p>
                </div>

                {/* Actions & Reordering */}
                <div className="flex items-center gap-1 shrink-0 opacity-90 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleMove(index, "up")}
                    disabled={index === 0}
                    title="Monter"
                    className="p-1.5 text-[#9AA0B2] hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleMove(index, "down")}
                    disabled={index === experiences.length - 1}
                    title="Descendre"
                    className="p-1.5 text-[#9AA0B2] hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(exp, index)}
                    title="Modifier"
                    className="p-1.5 text-[#38BDF8] hover:bg-[#38BDF8]/10 rounded-lg cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(index)}
                    title="Supprimer"
                    className="p-1.5 text-[#F04438] hover:bg-[#F04438]/10 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Sub-meta */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#9AA0B2]">
                {(exp.period || exp.startDate) && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#FBBF24]" />
                    <span>{exp.period || `${exp.startDate} - ${exp.endDate || "Présent"}`}</span>
                  </span>
                )}
                {exp.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#38BDF8]" />
                    <span>{exp.location}</span>
                  </span>
                )}
              </div>

              {/* Missions Description */}
              {exp.description && (
                <p className="text-xs text-[#F5F6FA]/90 leading-relaxed font-sans pt-1">
                  {exp.description}
                </p>
              )}

              {/* KPIs & Achievements */}
              {exp.kpis && exp.kpis.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-bold text-[#34D399] uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Réalisations chiffrées & KPIs
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {exp.kpis.map((kpi, kIdx) => (
                      <span key={kIdx} className="px-2.5 py-1 rounded-lg bg-[#34D399]/10 border border-[#34D399]/25 text-[#34D399] text-[11px] font-semibold">
                        📈 {kpi}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills Used */}
              {exp.skills && exp.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {exp.skills.map((s, sIdx) => (
                    <span key={sIdx} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[#9AA0B2] text-[10px] font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal Form */}
      <ProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingIndex !== null ? "Modifier l'expérience" : "Ajouter une expérience"}
        subtitle="Renseigne les détails de ton poste, tes missions et tes résultats"
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Intitulé du poste *</label>
              <input
                type="text"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="ex: Alternant Assistant Clientèle"
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Entreprise / Organisation *</label>
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="ex: Crédit Agricole Centre France"
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Localisation</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="ex: Commentry, France"
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Type de contrat</label>
              <select
                value={contractType}
                onChange={(e) => setContractType(e.target.value)}
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA] bg-[#0B0F19]"
              >
                <option value="Alternance">Alternance</option>
                <option value="Stage">Stage</option>
                <option value="CDI">CDI</option>
                <option value="CDD">CDD</option>
                <option value="CDD Saisonnier">CDD Saisonnier</option>
                <option value="Job étudiant">Job étudiant</option>
                <option value="Bénévolat">Bénévolat</option>
                <option value="Freelance">Freelance</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Date de début</label>
              <input
                type="text"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="ex: 2025-09"
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Date de fin</label>
              <input
                type="text"
                disabled={isCurrent}
                value={isCurrent ? "Aujourd'hui" : endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="ex: 2026-08"
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA] disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isCurrent"
              checked={isCurrent}
              onChange={(e) => setIsCurrent(e.target.checked)}
              className="w-4 h-4 rounded bg-white/10 border-white/20 text-[#D81A45] focus:ring-0 cursor-pointer"
            />
            <label htmlFor="isCurrent" className="text-xs font-semibold text-[#F5F6FA] cursor-pointer">
              Poste actuel / En cours
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Missions & Responsabilités</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décris les tâches principales, ton périmètre et tes responsabilités..."
              className="w-full min-h-[90px] glass-input p-3 text-xs text-[#F5F6FA] leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#34D399] mb-1">
              Réalisations chiffrées / KPIs (séparés par un symbole '|')
            </label>
            <input
              type="text"
              value={kpisInput}
              onChange={(e) => setKpisInput(e.target.value)}
              placeholder="ex: +12% de ventes d'assurances | Taux de satisfaction 96%"
              className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
            />
            <p className="text-[10px] text-[#9AA0B2] mt-1">Sépare chaque objectif par une barre verticale '|'</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#38BDF8] mb-1">
              Compétences utilisées (séparées par une virgule)
            </label>
            <input
              type="text"
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              placeholder="ex: Relation client, Analyse financière, Négociation"
              className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
            />
          </div>
        </div>
      </ProfileModal>
    </div>
  );
};
