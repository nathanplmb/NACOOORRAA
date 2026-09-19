import React, { useState, useEffect } from "react";
import { dbStore } from "../dbStore";
import { CandidateProfile } from "../types";
import { GlassCard, Badge, GlassButton } from "../components/Shared";
import { 
  User, 
  MapPin, 
  Sparkles, 
  GraduationCap, 
  Building2, 
  Plus, 
  Trash2, 
  Award,
  ChevronRight,
  Bookmark
} from "lucide-react";

export const Profile: React.FC = () => {
  const [profile, setProfile] = useState<CandidateProfile>(dbStore.getProfile());
  const [isEditing, setIsEditing] = useState(false);

  // Editing state fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [currentSituation, setCurrentSituation] = useState("");
  const [currentAlternance, setCurrentAlternance] = useState("");

  // Skill creation
  const [newSkill, setNewSkill] = useState("");

  useEffect(() => {
    const p = dbStore.getProfile();
    setProfile(p);
    
    // Sync editor fields
    setFullName(p.fullName);
    setEmail(p.email);
    setPhone(p.phone);
    setBio(p.bio);
    setCurrentSituation(p.currentSituation);
    setCurrentAlternance(p.currentAlternance);

    const unsub = dbStore.subscribe(() => {
      setProfile(dbStore.getProfile());
    });
    return unsub;
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    dbStore.updateProfile({
      fullName,
      email,
      phone,
      bio,
      currentSituation,
      currentAlternance
    });
    setIsEditing(false);
  };

  const handleAddSkill = () => {
    if (!newSkill.trim() || profile.skills.includes(newSkill.trim())) return;
    dbStore.updateProfile({
      skills: [...profile.skills, newSkill.trim()]
    });
    setNewSkill("");
  };

  const handleRemoveSkill = (skill: string) => {
    dbStore.updateProfile({
      skills: profile.skills.filter(s => s !== skill)
    });
  };

  const initials = (profile.fullName || "Utilisateur")
    .split(" ")
    .filter(Boolean)
    .map(n => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

  return (
    <div className="relative z-10 w-full space-y-8">
      {/* Profile Overview Card with Gamified Score */}
      <div className="relative overflow-hidden rounded-3xl glass-panel p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-l-4 border-l-[#D81A45]">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[rgba(216,26,69,0.3)] to-[rgba(255,26,85,0.15)] text-[#FF6685] border border-[rgba(216,26,69,0.4)] flex items-center justify-center text-xl font-bold font-display shadow-glow-crimson">
            {initials}
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-extrabold text-[#F5F6FA] font-display">{profile.fullName || "Mon Profil"}</h2>
            <p className="text-xs text-[#9AA0B2] flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-[#FF6685]" />
              <span>{profile.currentSituation || "Situation académique / professionnelle à renseigner"}</span>
            </p>
          </div>
        </div>

        {/* Gamification Level Widget */}
        <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/10 flex items-center gap-4 backdrop-blur-md">
          <div className="p-2.5 bg-gradient-to-tr from-[rgba(247,144,9,0.2)] to-[rgba(247,144,9,0.05)] text-[#F79009] rounded-xl border border-[rgba(247,144,9,0.3)]">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#F5F6FA] uppercase tracking-wider font-display">Candidat Élite</h4>
            <span className="text-[10px] text-[#9AA0B2] block mt-0.5">Dossier complété à {profile.profileCompletionScore}%</span>
            <div className="w-32 bg-white/10 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div className="bg-gradient-to-r from-[#D81A45] to-[#FF1A55] h-1.5 rounded-full" style={{ width: `${profile.profileCompletionScore}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column: general profile info */}
        <div className="lg:col-span-8 space-y-6">
          <GlassCard className="p-6 space-y-6" hoverable={false}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#F5F6FA] uppercase tracking-wider flex items-center gap-2 font-display">
                <User className="w-4 h-4 text-[#FF6685]" />
                Informations du profil
              </h3>
              {!isEditing && (
                <GlassButton size="sm" variant="secondary" onClick={() => setIsEditing(true)}>
                  Modifier le profil
                </GlassButton>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-[#9AA0B2] font-semibold">Nom complet</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-[#9AA0B2] font-semibold">Situation académique</label>
                    <input
                      type="text"
                      value={currentSituation}
                      onChange={(e) => setCurrentSituation(e.target.value)}
                      className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-[#9AA0B2] font-semibold">E-mail</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-[#9AA0B2] font-semibold">Téléphone</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[#9AA0B2] font-semibold">Alternance actuelle</label>
                  <input
                    type="text"
                    value={currentAlternance}
                    onChange={(e) => setCurrentAlternance(e.target.value)}
                    className="glass-input px-3.5 py-2 text-xs text-[#F5F6FA]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[#9AA0B2] font-semibold">Biographie d'introduction</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full min-h-[100px] glass-input p-3 text-xs text-[#F5F6FA] leading-relaxed"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <GlassButton type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                    Annuler
                  </GlassButton>
                  <GlassButton type="submit" variant="primary" size="sm">
                    Sauvegarder
                  </GlassButton>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[#9AA0B2] block uppercase font-bold tracking-wider text-[10px]">E-mail</span>
                    <span className="text-[#F5F6FA]">{profile.email}</span>
                  </div>
                  <div>
                    <span className="text-[#9AA0B2] block uppercase font-bold tracking-wider text-[10px]">Téléphone</span>
                    <span className="text-[#F5F6FA]">{profile.phone}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[#9AA0B2] block text-[10px] uppercase font-bold tracking-wider mb-1">Alternance actuelle</span>
                  <p className="text-xs text-[#12B76A] font-medium">{profile.currentAlternance}</p>
                </div>

                <div>
                  <span className="text-[#9AA0B2] block text-[10px] uppercase font-bold tracking-wider mb-1">Introduction de candidature</span>
                  <p className="text-xs text-[#F5F6FA]/90 leading-relaxed">{profile.bio}</p>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Master targets */}
          <GlassCard className="p-6 space-y-4" hoverable={false}>
            <h3 className="text-sm font-bold text-[#F5F6FA] uppercase tracking-wider flex items-center gap-2 font-display">
              <GraduationCap className="w-4 h-4 text-[#FF6685]" />
              Formations & Masters Visés
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.targetMasters.map((m, i) => (
                <Badge key={i} variant="crimson">{m}</Badge>
              ))}
            </div>
            <p className="text-xs text-[#9AA0B2] leading-relaxed">
              Ces cibles académiques sont injectées dans NACORA AI pour orienter toutes les réponses et t'aider à structurer ton profil par rapport aux prérequis d'admission.
            </p>
          </GlassCard>
        </div>

        {/* Right column: skills & tools */}
        <div className="lg:col-span-4 space-y-6">
          <GlassCard className="p-6 space-y-4" hoverable={false}>
            <h3 className="text-sm font-bold text-[#F5F6FA] uppercase tracking-wider flex items-center gap-2 font-display">
              <Sparkles className="w-4 h-4 text-[#FF6685]" />
              Compétences clés
            </h3>
            
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill, i) => (
                <div key={i} className="inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/10 text-[#F5F6FA] px-3 py-1 rounded-xl text-xs backdrop-blur-md">
                  <span>{skill}</span>
                  <button onClick={() => handleRemoveSkill(skill)} className="text-[#9AA0B2] hover:text-[#F04438] ml-1 cursor-pointer">
                    &times;
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="ex: VBA, AMF..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                className="flex-1 glass-input px-3.5 py-2 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
              />
              <GlassButton size="sm" variant="secondary" onClick={handleAddSkill}>
                Ajouter
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
