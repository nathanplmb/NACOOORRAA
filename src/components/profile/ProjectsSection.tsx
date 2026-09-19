import React, { useState } from "react";
import { CandidateProfile, ProjectItem, VolunteerItem } from "../../types";
import { Rocket, Users, Plus, Edit3, Trash2, Calendar, Link as LinkIcon, Sparkles } from "lucide-react";
import { ProfileModal } from "./ProfileModal";

interface ProjectsSectionProps {
  profile: CandidateProfile;
  onSave: (updated: Partial<CandidateProfile>) => void;
}

export const ProjectsSection: React.FC<ProjectsSectionProps> = ({ profile, onSave }) => {
  // Projects state
  const [projectsList, setProjectsList] = useState<ProjectItem[]>(
    profile.projectsList || [
      {
        name: "Application Web de Career Management (NACORA)",
        description: "Conception d'une plateforme de gestion de carrière pour étudiants PGE et jeunes diplômés.",
        role: "Fondateur & Product Manager",
        date: "2024 - Présent",
        url: "https://nacora.app",
        technologies: ["React", "TypeScript", "Tailwind CSS", "Firebase"],
        results: "Prototype fonctionnel testé auprès de 30+ étudiants PGE."
      }
    ]
  );

  // Volunteer state
  const [volunteerWork, setVolunteerWork] = useState<VolunteerItem[]>(
    profile.volunteerWork || [
      {
        organization: "Association Étudiante - NEOMA Finance Club",
        role: "Responsable Événementiel & Partenariats",
        date: "2024 - 2025",
        description: "Organisation de conférences financières et gestion du réseau d'alumni.",
        achievements: "Organisation de 4 tables rondes réunissant 200+ étudiants."
      }
    ]
  );

  // Modal Project State
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProjIdx, setEditingProjIdx] = useState<number | null>(null);

  const [projName, setProjName] = useState("");
  const [projRole, setProjRole] = useState("");
  const [projDate, setProjDate] = useState("");
  const [projUrl, setProjUrl] = useState("");
  const [projDesc, setProjDesc] = useState("");
  const [projTechInput, setProjTechInput] = useState("");
  const [projResults, setProjResults] = useState("");

  // Modal Volunteer State
  const [isVolunteerModalOpen, setIsVolunteerModalOpen] = useState(false);
  const [editingVolIdx, setEditingVolIdx] = useState<number | null>(null);

  const [volOrg, setVolOrg] = useState("");
  const [volRole, setVolRole] = useState("");
  const [volDate, setVolDate] = useState("");
  const [volDesc, setVolDesc] = useState("");
  const [volAchieve, setVolAchieve] = useState("");

  // Handlers Project
  const handleOpenAddProj = () => {
    setEditingProjIdx(null);
    setProjName("");
    setProjRole("");
    setProjDate("");
    setProjUrl("");
    setProjDesc("");
    setProjTechInput("");
    setProjResults("");
    setIsProjectModalOpen(true);
  };

  const handleOpenEditProj = (item: ProjectItem, idx: number) => {
    setEditingProjIdx(idx);
    setProjName(item.name);
    setProjRole(item.role || "");
    setProjDate(item.date || "");
    setProjUrl(item.url || "");
    setProjDesc(item.description || "");
    setProjTechInput((item.technologies || []).join(", "));
    setProjResults(item.results || "");
    setIsProjectModalOpen(true);
  };

  const handleDeleteProj = (idx: number) => {
    const updated = projectsList.filter((_, i) => i !== idx);
    setProjectsList(updated);
    onSave({ projectsList: updated });
  };

  const handleSubmitProj = () => {
    if (!projName.trim()) return;

    const techs = projTechInput.split(",").map((t) => t.trim()).filter(Boolean);

    const item: ProjectItem = {
      name: projName.trim(),
      role: projRole.trim() || undefined,
      date: projDate.trim() || undefined,
      url: projUrl.trim() || undefined,
      description: projDesc.trim() || undefined,
      technologies: techs.length > 0 ? techs : undefined,
      results: projResults.trim() || undefined,
    };

    let updated: ProjectItem[];
    if (editingProjIdx !== null) {
      updated = [...projectsList];
      updated[editingProjIdx] = item;
    } else {
      updated = [...projectsList, item];
    }

    setProjectsList(updated);
    onSave({ projectsList: updated });
    setIsProjectModalOpen(false);
  };

  // Handlers Volunteer
  const handleOpenAddVol = () => {
    setEditingVolIdx(null);
    setVolOrg("");
    setVolRole("");
    setVolDate("");
    setVolDesc("");
    setVolAchieve("");
    setIsVolunteerModalOpen(true);
  };

  const handleOpenEditVol = (item: VolunteerItem, idx: number) => {
    setEditingVolIdx(idx);
    setVolOrg(item.organization);
    setVolRole(item.role || "");
    setVolDate(item.date || "");
    setVolDesc(item.description || "");
    setVolAchieve(item.achievements || "");
    setIsVolunteerModalOpen(true);
  };

  const handleDeleteVol = (idx: number) => {
    const updated = volunteerWork.filter((_, i) => i !== idx);
    setVolunteerWork(updated);
    onSave({ volunteerWork: updated });
  };

  const handleSubmitVol = () => {
    if (!volOrg.trim()) return;

    const item: VolunteerItem = {
      organization: volOrg.trim(),
      role: volRole.trim() || undefined,
      date: volDate.trim() || undefined,
      description: volDesc.trim() || undefined,
      achievements: volAchieve.trim() || undefined,
    };

    let updated: VolunteerItem[];
    if (editingVolIdx !== null) {
      updated = [...volunteerWork];
      updated[editingVolIdx] = item;
    } else {
      updated = [...volunteerWork, item];
    }

    setVolunteerWork(updated);
    onSave({ volunteerWork: updated });
    setIsVolunteerModalOpen(false);
  };

  return (
    <div id="projets" className="glass-panel relative overflow-hidden rounded-3xl p-6 md:p-8 space-y-8 before:absolute before:top-0 before:left-0 before:right-0 before:h-[1.5px] before:bg-gradient-to-r before:from-transparent before:via-white/45 before:to-transparent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/12">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FF6685]/15 border border-[#FF6685]/30 flex items-center justify-center text-[#FF6685] shadow-[0_0_12px_rgba(255,102,133,0.2)]">
              <Rocket className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-[#F5F6FA] font-display">Projets & Engagements</h3>
          </div>
          <p className="text-xs text-[#9AA0B2]">Projets personnels, initiatives freelance, hackathons & vie associative.</p>
        </div>
      </div>

      {/* 1. Personal Projects */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-[#FF6685] uppercase tracking-wider flex items-center gap-1.5 font-display">
            <Rocket className="w-4 h-4" />
            Projets Personnels, Freelance & Hackathons
          </h4>

          <button
            onClick={handleOpenAddProj}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.14] border border-white/18 text-xs font-bold text-[#F5F6FA] backdrop-blur-xl transition-all cursor-pointer hover:-translate-y-0.5"
          >
            <Plus className="w-3.5 h-3.5 text-[#FF6685]" />
            <span>Ajouter un projet</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {projectsList.map((proj, idx) => (
            <div
              key={idx}
              className="group glass-card-static p-5 space-y-2.5 hover:border-white/25 transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h5 className="text-sm font-bold text-[#F5F6FA] font-display">{proj.name}</h5>
                  {proj.role && <p className="text-xs font-semibold text-[#FF6685]">{proj.role}</p>}
                </div>

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => handleOpenEditProj(proj, idx)}
                    className="p-1 text-[#38BDF8] hover:bg-[#38BDF8]/10 rounded-md cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteProj(idx)}
                    className="p-1 text-[#F04438] hover:bg-[#F04438]/10 rounded-md cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#9AA0B2]">
                {proj.date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#FBBF24]" />
                    <span>{proj.date}</span>
                  </span>
                )}
                {proj.url && (
                  <a href={proj.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#38BDF8] hover:underline">
                    <LinkIcon className="w-3 h-3" />
                    <span>Lien du projet</span>
                  </a>
                )}
              </div>

              {proj.description && <p className="text-xs text-[#F5F6FA]/90 leading-relaxed">{proj.description}</p>}

              {proj.results && (
                <p className="text-xs font-semibold text-[#34D399] bg-[#34D399]/10 p-2 rounded-xl">
                  🎯 Résultat : {proj.results}
                </p>
              )}

              {proj.technologies && proj.technologies.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {proj.technologies.map((tech, tIdx) => (
                    <span key={tIdx} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-[#9AA0B2]">
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2. Associations & Volunteering */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-[#38BDF8] uppercase tracking-wider flex items-center gap-1.5 font-display">
            <Users className="w-4 h-4" />
            Associations Étudiantes & Engagements
          </h4>

          <button
            onClick={handleOpenAddVol}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.14] border border-white/18 text-xs font-bold text-[#F5F6FA] backdrop-blur-xl transition-all cursor-pointer hover:-translate-y-0.5"
          >
            <Plus className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>Ajouter un engagement</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {volunteerWork.map((vol, idx) => (
            <div
              key={idx}
              className="group glass-card-static p-5 space-y-2.5 hover:border-white/25 transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h5 className="text-sm font-bold text-[#F5F6FA] font-display">{vol.organization}</h5>
                  {vol.role && <p className="text-xs font-semibold text-[#38BDF8]">{vol.role}</p>}
                </div>

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => handleOpenEditVol(vol, idx)}
                    className="p-1 text-[#38BDF8] hover:bg-[#38BDF8]/10 rounded-md cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteVol(idx)}
                    className="p-1 text-[#F04438] hover:bg-[#F04438]/10 rounded-md cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {vol.date && (
                <span className="flex items-center gap-1 text-xs text-[#9AA0B2]">
                  <Calendar className="w-3 h-3 text-[#FBBF24]" />
                  <span>{vol.date}</span>
                </span>
              )}

              {vol.description && <p className="text-xs text-[#F5F6FA]/90 leading-relaxed">{vol.description}</p>}

              {vol.achievements && (
                <p className="text-xs font-semibold text-[#38BDF8] bg-[#38BDF8]/10 p-2 rounded-xl">
                  🌟 Réalisation : {vol.achievements}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Project Modal */}
      <ProfileModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        title={editingProjIdx !== null ? "Modifier le projet" : "Ajouter un projet"}
        subtitle="Renseigne les détails de ton projet personnel ou hackathon"
        onSubmit={handleSubmitProj}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Nom du projet *</label>
              <input
                type="text"
                required
                value={projName}
                onChange={(e) => setProjName(e.target.value)}
                placeholder="ex: Application Web NACORA"
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Rôle dans le projet</label>
              <input
                type="text"
                value={projRole}
                onChange={(e) => setProjRole(e.target.value)}
                placeholder="ex: Fondateur & Lead Dev"
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Date / Période</label>
              <input
                type="text"
                value={projDate}
                onChange={(e) => setProjDate(e.target.value)}
                placeholder="ex: 2024 - Présent"
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Lien du projet</label>
              <input
                type="text"
                value={projUrl}
                onChange={(e) => setProjUrl(e.target.value)}
                placeholder="https://..."
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Description</label>
            <textarea
              value={projDesc}
              onChange={(e) => setProjDesc(e.target.value)}
              placeholder="Explique le contexte, les fonctionnalités clés..."
              className="w-full min-h-[80px] glass-input p-3 text-xs text-[#F5F6FA] leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Technologies / Outils (virgules)</label>
              <input
                type="text"
                value={projTechInput}
                onChange={(e) => setProjTechInput(e.target.value)}
                placeholder="ex: React, TypeScript, Figma"
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Résultats obtenus</label>
              <input
                type="text"
                value={projResults}
                onChange={(e) => setProjResults(e.target.value)}
                placeholder="ex: 500 utilisateurs actifs"
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>
          </div>
        </div>
      </ProfileModal>

      {/* Volunteer Modal */}
      <ProfileModal
        isOpen={isVolunteerModalOpen}
        onClose={() => setIsVolunteerModalOpen(false)}
        title={editingVolIdx !== null ? "Modifier l'engagement" : "Ajouter un engagement"}
        subtitle="Renseigne ton rôle associatif ou engagement bénévole"
        onSubmit={handleSubmitVol}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Nom de l'association *</label>
              <input
                type="text"
                required
                value={volOrg}
                onChange={(e) => setVolOrg(e.target.value)}
                placeholder="ex: NEOMA Finance Club"
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Rôle / Mandat</label>
              <input
                type="text"
                value={volRole}
                onChange={(e) => setVolRole(e.target.value)}
                placeholder="ex: Responsable Événementiel"
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Période</label>
            <input
              type="text"
              value={volDate}
              onChange={(e) => setVolDate(e.target.value)}
              placeholder="ex: 2024 - 2025"
              className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Description des missions</label>
            <textarea
              value={volDesc}
              onChange={(e) => setVolDesc(e.target.value)}
              placeholder="Décris ton implication..."
              className="w-full min-h-[80px] glass-input p-3 text-xs text-[#F5F6FA] leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Réalisations majeures</label>
            <input
              type="text"
              value={volAchieve}
              onChange={(e) => setVolAchieve(e.target.value)}
              placeholder="ex: Organisation de 4 événements réunissant 200 personnes"
              className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
            />
          </div>
        </div>
      </ProfileModal>
    </div>
  );
};
