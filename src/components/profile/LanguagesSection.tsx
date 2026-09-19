import React, { useState } from "react";
import { CandidateProfile, LanguageItem } from "../../types";
import { Globe, Plus, Edit3, Trash2, Award } from "lucide-react";
import { ProfileModal } from "./ProfileModal";

interface LanguagesSectionProps {
  profile: CandidateProfile;
  onSave: (updated: Partial<CandidateProfile>) => void;
}

export const LanguagesSection: React.FC<LanguagesSectionProps> = ({ profile, onSave }) => {
  const [languagesList, setLanguagesList] = useState<LanguageItem[]>(
    profile.languagesList || [
      { language: "Français", level: "Langue maternelle" },
      { language: "Anglais", level: "B2", certification: "TOEIC Listening & Reading", score: "745 / 990" },
      { language: "Espagnol", level: "A2" },
    ]
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  // Form
  const [language, setLanguage] = useState("");
  const [level, setLevel] = useState("B2");
  const [certification, setCertification] = useState("");
  const [score, setScore] = useState("");

  const handleOpenAdd = () => {
    setEditingIdx(null);
    setLanguage("");
    setLevel("B2");
    setCertification("");
    setScore("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: LanguageItem, idx: number) => {
    setEditingIdx(idx);
    setLanguage(item.language);
    setLevel(item.level);
    setCertification(item.certification || "");
    setScore(item.score || "");
    setIsModalOpen(true);
  };

  const handleDelete = (idx: number) => {
    const updated = languagesList.filter((_, i) => i !== idx);
    setLanguagesList(updated);
    // Also sync string list
    const strList = updated.map((l) => `${l.language} (${l.level})`);
    onSave({ languagesList: updated, languages: strList });
  };

  const handleSubmit = () => {
    if (!language.trim()) return;

    const item: LanguageItem = {
      language: language.trim(),
      level,
      certification: certification.trim() || undefined,
      score: score.trim() || undefined,
    };

    let updated: LanguageItem[];
    if (editingIdx !== null) {
      updated = [...languagesList];
      updated[editingIdx] = item;
    } else {
      updated = [...languagesList, item];
    }

    setLanguagesList(updated);
    const strList = updated.map((l) => `${l.language} (${l.level})`);
    onSave({ languagesList: updated, languages: strList });
    setIsModalOpen(false);
  };

  const levelColor = {
    "Langue maternelle": "bg-[#34D399]/15 text-[#34D399] border-[#34D399]/30",
    "C2": "bg-[#C084FC]/15 text-[#C084FC] border-[#C084FC]/30",
    "C1": "bg-[#C084FC]/15 text-[#C084FC] border-[#C084FC]/30",
    "B2": "bg-[#38BDF8]/15 text-[#38BDF8] border-[#38BDF8]/30",
    "B1": "bg-[#38BDF8]/15 text-[#38BDF8] border-[#38BDF8]/30",
    "A2": "bg-[#FBBF24]/15 text-[#FBBF24] border-[#FBBF24]/30",
    "A1": "bg-[#9AA0B2]/15 text-[#9AA0B2] border-[#9AA0B2]/30",
  };

  return (
    <div id="langues" className="glass-panel relative overflow-hidden rounded-3xl p-6 md:p-8 space-y-6 before:absolute before:top-0 before:left-0 before:right-0 before:h-[1.5px] before:bg-gradient-to-r before:from-transparent before:via-white/45 before:to-transparent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/12">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FBBF24]/15 border border-[#FBBF24]/30 flex items-center justify-center text-[#FBBF24] shadow-[0_0_12px_rgba(251,191,36,0.2)]">
              <Globe className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-[#F5F6FA] font-display">Langues & Niveaux CECRL</h3>
          </div>
          <p className="text-xs text-[#9AA0B2]">Maîtrise linguistique et scores de certifications officielles.</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#D81A45] to-[#FF1A55] text-white font-bold text-xs shadow-[0_0_16px_rgba(216,26,69,0.3)] hover:scale-[1.02] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter une langue</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {languagesList.map((lang, idx) => (
          <div
            key={idx}
            className="group glass-card-static p-4 space-y-2 hover:border-white/25 transition-all duration-300 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-[#F5F6FA] font-display">{lang.language}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${levelColor[lang.level as keyof typeof levelColor] || "bg-white/10 text-white"}`}>
                  {lang.level}
                </span>
              </div>

              <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleOpenEdit(lang, idx)}
                  className="p-1 text-[#38BDF8] hover:bg-[#38BDF8]/10 rounded-md cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(idx)}
                  className="p-1 text-[#F04438] hover:bg-[#F04438]/10 rounded-md cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Certification / Score */}
            {lang.certification && (
              <div className="pt-1 flex items-center justify-between text-xs text-[#9AA0B2]">
                <span className="flex items-center gap-1 text-[#38BDF8]">
                  <Award className="w-3.5 h-3.5" />
                  <span>{lang.certification}</span>
                </span>
                {lang.score && (
                  <span className="font-bold text-[#34D399] bg-[#34D399]/10 px-2 py-0.5 rounded-md text-[11px]">
                    {lang.score}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal Form */}
      <ProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingIdx !== null ? "Modifier la langue" : "Ajouter une langue"}
        subtitle="Précise le niveau CECRL et les certifications associées"
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Langue *</label>
              <input
                type="text"
                required
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="ex: Anglais, Espagnol, Allemand..."
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Niveau (CECRL)</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA] bg-[#0B0F19]"
              >
                <option value="Langue maternelle">Langue maternelle</option>
                <option value="C2">C2 - Bilingue / Maîtrise</option>
                <option value="C1">C1 - Autonome / Avancé</option>
                <option value="B2">B2 - Indépendant / Intermédiaire supérieur</option>
                <option value="B1">B1 - Seuil / Intermédiaire</option>
                <option value="A2">A2 - Usuel / Élémentaire</option>
                <option value="A1">A1 - Débutant</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/10 pt-4">
            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Certification officielle (Optionnel)</label>
              <input
                type="text"
                value={certification}
                onChange={(e) => setCertification(e.target.value)}
                placeholder="ex: TOEIC Listening & Reading, TOEFL..."
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Score / Mention (Optionnel)</label>
              <input
                type="text"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="ex: 745 / 990"
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>
          </div>
        </div>
      </ProfileModal>
    </div>
  );
};
