import React, { useState } from "react";
import { CandidateProfile } from "../../types";
import { Heart, Plus, X } from "lucide-react";

interface InterestsSectionProps {
  profile: CandidateProfile;
  onSave: (updated: Partial<CandidateProfile>) => void;
}

export const InterestsSection: React.FC<InterestsSectionProps> = ({ profile, onSave }) => {
  const [interests, setInterests] = useState<string[]>(
    profile.interests || [
      "Marchés financiers & Fintech",
      "Événementiel & Musique",
      "Sports d'équipe",
      "Voyages & Découvertes culturelles",
      "Nouvelles technologies & IA",
    ]
  );
  const [newInput, setNewInput] = useState("");

  const handleAdd = () => {
    if (!newInput.trim()) return;
    if (!interests.includes(newInput.trim())) {
      const updated = [...interests, newInput.trim()];
      setInterests(updated);
      onSave({ interests: updated });
    }
    setNewInput("");
  };

  const handleRemove = (item: string) => {
    const updated = interests.filter((i) => i !== item);
    setInterests(updated);
    onSave({ interests: updated });
  };

  return (
    <div id="interets" className="glass-panel relative overflow-hidden rounded-3xl p-6 md:p-8 space-y-6 before:absolute before:top-0 before:left-0 before:right-0 before:h-[1.5px] before:bg-gradient-to-r before:from-transparent before:via-white/45 before:to-transparent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/12">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FF6685]/15 border border-[#FF6685]/30 flex items-center justify-center text-[#FF6685] shadow-[0_0_12px_rgba(255,102,133,0.2)]">
              <Heart className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-[#F5F6FA] font-display">Centres d'intérêt & Passions</h3>
          </div>
          <p className="text-xs text-[#9AA0B2]">Tes centres d'intérêt personnels pour personnaliser les accroches en entretien.</p>
        </div>
      </div>

      {/* Chips list */}
      <div className="flex flex-wrap gap-2.5">
        {interests.map((item, idx) => (
          <div
            key={idx}
            className="glass-pill inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/5 border-white/15 text-xs font-semibold text-[#F5F6FA] hover:border-white/30 hover:scale-105 transition-all"
          >
            <span>❤️ {item}</span>
            <button
              onClick={() => handleRemove(item)}
              className="text-[#9AA0B2] hover:text-[#FF6685] cursor-pointer transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2 max-w-md pt-2">
        <input
          type="text"
          value={newInput}
          onChange={(e) => setNewInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="ex: Photographie, Échecs, Trail..."
          className="flex-1 glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
        />
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-[#D81A45]/20 hover:bg-[#D81A45]/30 text-xs font-bold text-[#FF6685] border border-[#D81A45]/30 rounded-xl cursor-pointer"
        >
          Ajouter
        </button>
      </div>
    </div>
  );
};
