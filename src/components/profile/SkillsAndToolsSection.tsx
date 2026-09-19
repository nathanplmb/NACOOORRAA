import React, { useState } from "react";
import { CandidateProfile, HardSkillItem } from "../../types";
import { Sparkles, Wrench, HeartHandshake, Plus, X, Edit3, Trash2 } from "lucide-react";
import { ProfileModal } from "./ProfileModal";

interface SkillsAndToolsSectionProps {
  profile: CandidateProfile;
  onSave: (updated: Partial<CandidateProfile>) => void;
}

export const SkillsAndToolsSection: React.FC<SkillsAndToolsSectionProps> = ({ profile, onSave }) => {
  // Hard Skills state
  const [hardSkills, setHardSkills] = useState<HardSkillItem[]>(
    profile.hardSkills || [
      { name: "Analyse financière & Diagnostic d'entreprise", level: "Avancé", category: "Finance" },
      { name: "Vente & Négociation commerciale", level: "Avancé", category: "Commercial" },
      { name: "Gestion de projet & Événementiel", level: "Avancé", category: "Management" },
      { name: "Stratégie Marketing & Communication", level: "Intermédiaire", category: "Marketing" },
      { name: "Relation client & Conseil patrimonial", level: "Avancé", category: "Finance" },
    ]
  );

  // Tools & Software chips
  const [tools, setTools] = useState<string[]>(
    profile.toolsAndSoftware || ["Excel", "PowerPoint", "Word", "Canva", "CapCut", "Premiere Rush", "Notion", "Google Analytics"]
  );
  const [newToolInput, setNewToolInput] = useState("");

  // Soft Skills chips
  const [softSkills, setSoftSkills] = useState<string[]>(
    profile.softSkills || [
      "Sens commercial & Négociation",
      "Rigueur & Esprit d'analyse",
      "Adaptabilité & Réactivité",
      "Organisation & Gestion du temps",
      "Aisance relationnelle & Écoute active",
      "Esprit d'équipe & Leadership",
    ]
  );
  const [newSoftSkillInput, setNewSoftSkillInput] = useState("");

  // Modal State for Hard Skill CRUD
  const [isHardSkillModalOpen, setIsHardSkillModalOpen] = useState(false);
  const [editingSkillIdx, setEditingSkillIdx] = useState<number | null>(null);
  const [skillName, setSkillName] = useState("");
  const [skillLevel, setSkillLevel] = useState<"Débutant" | "Intermédiaire" | "Avancé" | "Expert">("Avancé");
  const [skillCategory, setSkillCategory] = useState("Finance & BizDev");

  const handleOpenAddHardSkill = () => {
    setEditingSkillIdx(null);
    setSkillName("");
    setSkillLevel("Avancé");
    setSkillCategory("Finance & BizDev");
    setIsHardSkillModalOpen(true);
  };

  const handleOpenEditHardSkill = (s: HardSkillItem, idx: number) => {
    setEditingSkillIdx(idx);
    setSkillName(s.name);
    setSkillLevel(s.level || "Avancé");
    setSkillCategory(s.category || "Finance & BizDev");
    setIsHardSkillModalOpen(true);
  };

  const handleDeleteHardSkill = (idx: number) => {
    const updated = hardSkills.filter((_, i) => i !== idx);
    setHardSkills(updated);
    onSave({ hardSkills: updated });
  };

  const handleSaveHardSkill = () => {
    if (!skillName.trim()) return;
    const item: HardSkillItem = {
      name: skillName.trim(),
      level: skillLevel,
      category: skillCategory.trim(),
    };

    let updated: HardSkillItem[];
    if (editingSkillIdx !== null) {
      updated = [...hardSkills];
      updated[editingSkillIdx] = item;
    } else {
      updated = [...hardSkills, item];
    }

    setHardSkills(updated);
    // Also update simple skills string array for backward compatibility
    const simpleSkills = updated.map((hs) => hs.name);
    onSave({ hardSkills: updated, skills: simpleSkills });
    setIsHardSkillModalOpen(false);
  };

  // Tools helpers
  const handleAddTool = () => {
    if (!newToolInput.trim()) return;
    if (!tools.includes(newToolInput.trim())) {
      const updated = [...tools, newToolInput.trim()];
      setTools(updated);
      onSave({ toolsAndSoftware: updated });
    }
    setNewToolInput("");
  };

  const handleRemoveTool = (t: string) => {
    const updated = tools.filter((item) => item !== t);
    setTools(updated);
    onSave({ toolsAndSoftware: updated });
  };

  // Soft skills helpers
  const handleAddSoftSkill = () => {
    if (!newSoftSkillInput.trim()) return;
    if (!softSkills.includes(newSoftSkillInput.trim())) {
      const updated = [...softSkills, newSoftSkillInput.trim()];
      setSoftSkills(updated);
      onSave({ softSkills: updated });
    }
    setNewSoftSkillInput("");
  };

  const handleRemoveSoftSkill = (s: string) => {
    const updated = softSkills.filter((item) => item !== s);
    setSoftSkills(updated);
    onSave({ softSkills: updated });
  };

  const levelColor = {
    Débutant: "bg-[#9AA0B2]/15 text-[#9AA0B2] border-[#9AA0B2]/30",
    Intermédiaire: "bg-[#38BDF8]/15 text-[#38BDF8] border-[#38BDF8]/30",
    Avancé: "bg-[#34D399]/15 text-[#34D399] border-[#34D399]/30",
    Expert: "bg-[#C084FC]/15 text-[#C084FC] border-[#C084FC]/30",
  };

  return (
    <div id="competences" className="glass-panel relative overflow-hidden rounded-3xl p-6 md:p-8 space-y-8 before:absolute before:top-0 before:left-0 before:right-0 before:h-[1.5px] before:bg-gradient-to-r before:from-transparent before:via-white/45 before:to-transparent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/12">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#C084FC]/15 border border-[#C084FC]/30 flex items-center justify-center text-[#C084FC] shadow-[0_0_12px_rgba(192,132,252,0.2)]">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-[#F5F6FA] font-display">Compétences & Outils</h3>
          </div>
          <p className="text-xs text-[#9AA0B2]">Tes expertises métiers, logiciels maîtrisés et qualités relationnelles.</p>
        </div>
      </div>

      {/* 1. Hard Skills Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-[#C084FC] uppercase tracking-wider flex items-center gap-1.5 font-display">
            <Sparkles className="w-4 h-4" />
            Hard Skills / Compétences Métiers
          </h4>
          <button
            onClick={handleOpenAddHardSkill}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.14] border border-white/18 text-xs font-bold text-[#F5F6FA] backdrop-blur-xl transition-all cursor-pointer hover:-translate-y-0.5"
          >
            <Plus className="w-3.5 h-3.5 text-[#C084FC]" />
            <span>Ajouter une compétence</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {hardSkills.map((hs, idx) => (
            <div
              key={idx}
              className="group glass-card-static p-3.5 flex items-center justify-between gap-2 hover:border-white/25 transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="space-y-1 min-w-0">
                <span className="text-xs font-bold text-[#F5F6FA] block truncate font-display">
                  {hs.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${levelColor[hs.level || "Avancé"]}`}>
                    {hs.level || "Avancé"}
                  </span>
                  {hs.category && (
                    <span className="text-[10px] text-[#9AA0B2] truncate">
                      • {hs.category}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleOpenEditHardSkill(hs, idx)}
                  className="p-1 text-[#38BDF8] hover:bg-[#38BDF8]/10 rounded-md cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleDeleteHardSkill(idx)}
                  className="p-1 text-[#F04438] hover:bg-[#F04438]/10 rounded-md cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Software & Tools */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <h4 className="text-xs font-bold text-[#38BDF8] uppercase tracking-wider flex items-center gap-1.5 font-display">
          <Wrench className="w-4 h-4" />
          Logiciels & Outils Maîtrisés
        </h4>

        <div className="flex flex-wrap gap-2">
          {tools.map((tool, idx) => (
            <div
              key={idx}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs font-bold text-[#F5F6FA] hover:border-white/20 transition-all"
            >
              <span>💻 {tool}</span>
              <button
                onClick={() => handleRemoveTool(tool)}
                className="text-[#9AA0B2] hover:text-[#FF6685] cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 max-w-md pt-1">
          <input
            type="text"
            value={newToolInput}
            onChange={(e) => setNewToolInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTool();
              }
            }}
            placeholder="ex: Photoshop, Figma, SAP..."
            className="flex-1 glass-input px-3.5 py-1.5 text-xs text-[#F5F6FA]"
          />
          <button
            onClick={handleAddTool}
            className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-bold text-white rounded-xl cursor-pointer"
          >
            Ajouter un outil
          </button>
        </div>
      </div>

      {/* 3. Soft Skills */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <h4 className="text-xs font-bold text-[#34D399] uppercase tracking-wider flex items-center gap-1.5 font-display">
          <HeartHandshake className="w-4 h-4" />
          Soft Skills & Savoir-être
        </h4>

        <div className="flex flex-wrap gap-2">
          {softSkills.map((ss, idx) => (
            <div
              key={idx}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#34D399]/10 border border-[#34D399]/25 text-xs font-semibold text-[#34D399]"
            >
              <span>✨ {ss}</span>
              <button
                onClick={() => handleRemoveSoftSkill(ss)}
                className="text-[#34D399]/70 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 max-w-md pt-1">
          <input
            type="text"
            value={newSoftSkillInput}
            onChange={(e) => setNewSoftSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddSoftSkill();
              }
            }}
            placeholder="ex: Résolution de problèmes, Empathie..."
            className="flex-1 glass-input px-3.5 py-1.5 text-xs text-[#F5F6FA]"
          />
          <button
            onClick={handleAddSoftSkill}
            className="px-4 py-1.5 bg-[#34D399]/20 hover:bg-[#34D399]/30 text-xs font-bold text-[#34D399] rounded-xl cursor-pointer"
          >
            Ajouter un soft skill
          </button>
        </div>
      </div>

      {/* Hard Skill Modal */}
      <ProfileModal
        isOpen={isHardSkillModalOpen}
        onClose={() => setIsHardSkillModalOpen(false)}
        title={editingSkillIdx !== null ? "Modifier la compétence" : "Ajouter une compétence technique"}
        subtitle="Renseigne l'intitulé et le niveau de maîtrise"
        onSubmit={handleSaveHardSkill}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Nom de la compétence *</label>
            <input
              type="text"
              required
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              placeholder="ex: Analyse financière & Diagnostic d'entreprise"
              className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Niveau de maîtrise</label>
              <select
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value as any)}
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA] bg-[#0B0F19]"
              >
                <option value="Débutant">Débutant</option>
                <option value="Intermédiaire">Intermédiaire</option>
                <option value="Avancé">Avancé</option>
                <option value="Expert">Expert</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Catégorie</label>
              <input
                type="text"
                value={skillCategory}
                onChange={(e) => setSkillCategory(e.target.value)}
                placeholder="ex: Finance, Commercial, Management..."
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>
          </div>
        </div>
      </ProfileModal>
    </div>
  );
};
