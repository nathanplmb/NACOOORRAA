import React, { useState } from "react";
import { DetailedEducation } from "../../types";
import { GraduationCap, Calendar, MapPin, Plus, Trash2, Edit3, ArrowUp, ArrowDown, Award } from "lucide-react";
import { ProfileModal } from "./ProfileModal";

interface EducationSectionProps {
  educations: DetailedEducation[];
  onSaveEducations: (updated: DetailedEducation[]) => void;
}

export const EducationSection: React.FC<EducationSectionProps> = ({
  educations,
  onSaveEducations,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Form Fields
  const [institution, setInstitution] = useState("");
  const [degree, setDegree] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("En cours");
  const [description, setDescription] = useState("");

  const handleOpenAdd = () => {
    setEditingIndex(null);
    setInstitution("");
    setDegree("");
    setFieldOfStudy("");
    setLocation("");
    setStartDate("");
    setEndDate("");
    setStatus("En cours");
    setDescription("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (edu: DetailedEducation, index: number) => {
    setEditingIndex(index);
    setInstitution(edu.institution || "");
    setDegree(edu.degree || "");
    setFieldOfStudy(edu.fieldOfStudy || "");
    setLocation(edu.location || "");
    setStartDate(edu.startDate || "");
    setEndDate(edu.endDate || "");
    setStatus(edu.status || "En cours");
    setDescription(edu.description || "");
    setIsModalOpen(true);
  };

  const handleDelete = (index: number) => {
    const updated = educations.filter((_, i) => i !== index);
    onSaveEducations(updated);
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= educations.length) return;
    const updated = [...educations];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    onSaveEducations(updated);
  };

  const handleSubmit = () => {
    let periodStr = "";
    if (startDate && endDate) {
      periodStr = `${startDate} - ${endDate}`;
    } else if (startDate) {
      periodStr = startDate;
    }

    const item: DetailedEducation = {
      id: editingIndex !== null ? educations[editingIndex].id : "edu_" + Math.random().toString(36).substring(2, 9),
      institution,
      degree,
      fieldOfStudy,
      location,
      startDate,
      endDate,
      period: periodStr,
      status,
      description,
    };

    if (editingIndex !== null) {
      const updated = [...educations];
      updated[editingIndex] = item;
      onSaveEducations(updated);
    } else {
      onSaveEducations([item, ...educations]);
    }

    setIsModalOpen(false);
  };

  return (
    <div id="formations" className="glass-panel relative overflow-hidden rounded-3xl p-6 md:p-8 space-y-6 before:absolute before:top-0 before:left-0 before:right-0 before:h-[1.5px] before:bg-gradient-to-r before:from-transparent before:via-white/45 before:to-transparent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/12">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#38BDF8]/15 border border-[#38BDF8]/30 flex items-center justify-center text-[#38BDF8] shadow-[0_0_12px_rgba(56,189,248,0.2)]">
              <GraduationCap className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-[#F5F6FA] font-display">Études & Formations</h3>
          </div>
          <p className="text-xs text-[#9AA0B2]">Ton parcours académique, diplômes et spécialisations.</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#D81A45] to-[#FF1A55] text-white font-bold text-xs shadow-[0_0_20px_rgba(216,26,69,0.4)] border border-[#FF6685]/50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer backdrop-blur-xl"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter une formation</span>
        </button>
      </div>

      {/* List */}
      <div className="space-y-4">
        {educations.length === 0 ? (
          <div className="text-center py-8 p-6 rounded-2xl bg-white/[0.02] border border-dashed border-white/10">
            <GraduationCap className="w-8 h-8 text-[#9AA0B2]/40 mx-auto mb-2" />
            <p className="text-xs text-[#9AA0B2]">Aucune formation renseignée pour le moment.</p>
          </div>
        ) : (
          educations.map((edu, index) => (
            <div
              key={edu.id || index}
              className="glass-card-static p-5 space-y-2.5 hover:border-white/25 transition-all duration-300 hover:-translate-y-0.5 group"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base font-bold text-[#F5F6FA] font-display">{edu.degree}</h4>
                    {edu.status && (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          edu.status === "En cours"
                            ? "bg-[#38BDF8]/15 border-[#38BDF8]/30 text-[#38BDF8]"
                            : "bg-[#34D399]/15 border-[#34D399]/30 text-[#34D399]"
                        }`}
                      >
                        {edu.status}
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-bold text-[#FF6685]">{edu.institution}</p>
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
                    disabled={index === educations.length - 1}
                    title="Descendre"
                    className="p-1.5 text-[#9AA0B2] hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(edu, index)}
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
                {edu.fieldOfStudy && (
                  <span className="flex items-center gap-1 font-medium text-[#C084FC]">
                    <span>Domaine: {edu.fieldOfStudy}</span>
                  </span>
                )}
                {(edu.period || edu.startDate) && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#FBBF24]" />
                    <span>{edu.period || `${edu.startDate} - ${edu.endDate || "Présent"}`}</span>
                  </span>
                )}
                {edu.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#38BDF8]" />
                    <span>{edu.location}</span>
                  </span>
                )}
              </div>

              {/* Description */}
              {edu.description && (
                <p className="text-xs text-[#F5F6FA]/90 leading-relaxed font-sans pt-1">
                  {edu.description}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal Form */}
      <ProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingIndex !== null ? "Modifier la formation" : "Ajouter une formation"}
        subtitle="Détaille le diplôme, l'école et la spécialisation"
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Établissement *</label>
              <input
                type="text"
                required
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="ex: NEOMA Business School"
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Diplôme / Programme *</label>
              <input
                type="text"
                required
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                placeholder="ex: Programme Grande École (Master in Management)"
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Domaine / Spécialité</label>
              <input
                type="text"
                value={fieldOfStudy}
                onChange={(e) => setFieldOfStudy(e.target.value)}
                placeholder="ex: Corporate Finance & Market Strategy"
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Localisation</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="ex: Reims, France"
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Date de début</label>
              <input
                type="text"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="ex: 2024"
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Date de fin</label>
              <input
                type="text"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="ex: 2027"
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Statut</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA] bg-[#0B0F19]"
              >
                <option value="En cours">En cours</option>
                <option value="Complété">Complété / Obtenu</option>
                <option value="Diplômé">Diplômé</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Description / Cours phares</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Détaille les matières clés, projets tuteurés ou mentions..."
              className="w-full min-h-[80px] glass-input p-3 text-xs text-[#F5F6FA] leading-relaxed"
            />
          </div>
        </div>
      </ProfileModal>
    </div>
  );
};
