import React, { useState } from "react";
import { CandidateProfile, CertificationItem } from "../../types";
import { Award, Plus, Edit3, Trash2, Calendar, Link as LinkIcon, Building2 } from "lucide-react";
import { ProfileModal } from "./ProfileModal";

interface CertificationsSectionProps {
  profile: CandidateProfile;
  onSave: (updated: Partial<CandidateProfile>) => void;
}

export const CertificationsSection: React.FC<CertificationsSectionProps> = ({ profile, onSave }) => {
  const [certificationsList, setCertificationsList] = useState<CertificationItem[]>(
    profile.certificationsList || [
      { name: "SPSC - Saïd Business School", issuer: "University of Oxford", date: "2024" },
      { name: "Inbound Marketing Certified", issuer: "HubSpot Academy", date: "2024" },
      { name: "TOEIC Listening & Reading (745 pts)", issuer: "ETS Global", date: "2023" },
    ]
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  // Form
  const [name, setName] = useState("");
  const [issuer, setIssuer] = useState("");
  const [date, setDate] = useState("");
  const [credentialId, setCredentialId] = useState("");
  const [verificationUrl, setVerificationUrl] = useState("");

  const handleOpenAdd = () => {
    setEditingIdx(null);
    setName("");
    setIssuer("");
    setDate("");
    setCredentialId("");
    setVerificationUrl("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: CertificationItem, idx: number) => {
    setEditingIdx(idx);
    setName(item.name);
    setIssuer(item.issuer || "");
    setDate(item.date || "");
    setCredentialId(item.credentialId || "");
    setVerificationUrl(item.verificationUrl || "");
    setIsModalOpen(true);
  };

  const handleDelete = (idx: number) => {
    const updated = certificationsList.filter((_, i) => i !== idx);
    setCertificationsList(updated);
    const strList = updated.map((c) => c.name);
    onSave({ certificationsList: updated, certifications: strList });
  };

  const handleSubmit = () => {
    if (!name.trim()) return;

    const item: CertificationItem = {
      name: name.trim(),
      issuer: issuer.trim() || undefined,
      date: date.trim() || undefined,
      credentialId: credentialId.trim() || undefined,
      verificationUrl: verificationUrl.trim() || undefined,
    };

    let updated: CertificationItem[];
    if (editingIdx !== null) {
      updated = [...certificationsList];
      updated[editingIdx] = item;
    } else {
      updated = [...certificationsList, item];
    }

    setCertificationsList(updated);
    const strList = updated.map((c) => c.name);
    onSave({ certificationsList: updated, certifications: strList });
    setIsModalOpen(false);
  };

  return (
    <div id="certifications" className="glass-panel relative overflow-hidden rounded-3xl p-6 md:p-8 space-y-6 before:absolute before:top-0 before:left-0 before:right-0 before:h-[1.5px] before:bg-gradient-to-r before:from-transparent before:via-white/45 before:to-transparent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/12">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#34D399]/15 border border-[#34D399]/30 flex items-center justify-center text-[#34D399] shadow-[0_0_12px_rgba(52,211,153,0.2)]">
              <Award className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-[#F5F6FA] font-display">Certifications & Accréditations</h3>
          </div>
          <p className="text-xs text-[#9AA0B2]">Tes diplômes complémentaires, certifications en ligne et examens officiels.</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#D81A45] to-[#FF1A55] text-white font-bold text-xs shadow-[0_0_20px_rgba(216,26,69,0.4)] border border-[#FF6685]/50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer backdrop-blur-xl"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter une certification</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {certificationsList.map((cert, idx) => (
          <div
            key={idx}
            className="group glass-card-static p-4 space-y-2 hover:border-white/25 transition-all duration-300 hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <h4 className="text-sm font-bold text-[#F5F6FA] font-display line-clamp-2">{cert.name}</h4>
                {cert.issuer && (
                  <span className="text-xs font-semibold text-[#34D399] flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    <span>{cert.issuer}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={() => handleOpenEdit(cert, idx)}
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

            <div className="flex flex-wrap items-center justify-between text-xs text-[#9AA0B2] pt-1">
              {cert.date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#FBBF24]" />
                  <span>Obtenu en {cert.date}</span>
                </span>
              )}

              {cert.verificationUrl && (
                <a
                  href={cert.verificationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[#38BDF8] hover:underline"
                >
                  <LinkIcon className="w-3 h-3" />
                  <span>Vérifier</span>
                </a>
              )}
            </div>

            {cert.credentialId && (
              <p className="text-[10px] text-[#9AA0B2] pt-0.5">
                ID: <span className="text-[#F5F6FA] font-mono">{cert.credentialId}</span>
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Modal Form */}
      <ProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingIdx !== null ? "Modifier la certification" : "Ajouter une certification"}
        subtitle="Renseigne l'organisme émetteur et les liens de vérification"
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Nom de la certification *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Inbound Marketing Certified, Saïd Business School..."
              className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Organisme émetteur</label>
              <input
                type="text"
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
                placeholder="ex: HubSpot Academy, University of Oxford..."
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Date d'obtention</label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="ex: 2024"
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">ID d'accréditation (Optionnel)</label>
              <input
                type="text"
                value={credentialId}
                onChange={(e) => setCredentialId(e.target.value)}
                placeholder="ex: ID-984210"
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#F5F6FA] mb-1">Lien de vérification (Optionnel)</label>
              <input
                type="text"
                value={verificationUrl}
                onChange={(e) => setVerificationUrl(e.target.value)}
                placeholder="https://..."
                className="w-full glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
              />
            </div>
          </div>
        </div>
      </ProfileModal>
    </div>
  );
};
