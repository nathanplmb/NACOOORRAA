import React from "react";
import { CandidateProfile } from "../../types";
import { MapPin, GraduationCap, Linkedin, Edit3, Sparkles } from "lucide-react";

interface ProfileOverviewCardProps {
  profile: CandidateProfile;
  onEditClick: () => void;
}

export const ProfileOverviewCard: React.FC<ProfileOverviewCardProps> = ({ profile, onEditClick }) => {
  const initials = (profile.fullName || "Nathan PALUMBO")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "NP";

  // Dynamic Statistics
  const expCount = profile.experiences?.length || 0;
  const eduCount = profile.educations?.length || 0;
  const skillCount = (profile.hardSkills?.length || 0) + (profile.toolsAndSoftware?.length || 0);
  const langCount = profile.languagesList?.length || profile.languages?.length || 0;
  const certCount = profile.certificationsList?.length || profile.certifications?.length || 0;
  const projCount = (profile.projectsList?.length || 0) + (profile.volunteerWork?.length || 0);

  return (
    <div className="glass-panel relative overflow-hidden rounded-3xl p-6 md:p-8 space-y-6 group transition-all duration-300 before:absolute before:top-0 before:left-0 before:right-0 before:h-[1.5px] before:bg-gradient-to-r before:from-transparent before:via-white/45 before:to-transparent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent">
      {/* Subtle Specular Sheen & Soft Glow */}
      <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-gradient-to-br from-white/[0.14] via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-white/[0.05] via-transparent to-transparent pointer-events-none" />

      {/* Reduced Faint Ambient Back-lights */}
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-[#D81A45]/8 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[#C084FC]/6 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Identity Row */}
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Liquid Glass Avatar Frame */}
          <div className="relative group shrink-0">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-[#FF6685]/60 via-[#D81A45]/40 to-[#C084FC]/50 opacity-80 blur-md group-hover:opacity-100 transition duration-500 shadow-[0_0_25px_rgba(216,26,69,0.35)]" />
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.fullName}
                className="relative w-20 h-20 rounded-2xl object-cover border border-white/30 shadow-[0_12px_28px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
              />
            ) : (
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#D81A45]/50 via-[#FF1A55]/30 to-[#C084FC]/30 text-[#FF6685] border border-white/30 flex items-center justify-center text-2xl font-black font-display shadow-[0_12px_28px_rgba(216,26,69,0.4)] backdrop-blur-2xl">
                {initials}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-6.5 h-6.5 rounded-xl bg-[#12B76A] border-2 border-[#0B0F19] flex items-center justify-center text-[10px] text-white font-bold shadow-[0_0_12px_rgba(18,183,106,0.4)]" title="Profil actif">
              ✓
            </div>
          </div>

          {/* User Text Info */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F5F6FA] font-display tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                {profile.fullName || `${profile.firstName} ${profile.lastName}`}
              </h2>
              {profile.driverLicense && (
                <span className="px-2.5 py-0.5 rounded-full bg-white/[0.08] border border-white/15 text-[11px] font-semibold text-[#9AA0B2] backdrop-blur-xl shadow-inner">
                  {profile.driverLicense}
                </span>
              )}
            </div>

            <p className="text-sm font-bold text-[#FF6685] font-display flex items-center gap-1.5">
              <span>{profile.title || "Étudiant PGE | Finance, Business Development & Fintech"}</span>
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#9AA0B2]">
              {profile.city && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span>{profile.city}{profile.country ? `, ${profile.country}` : ""}</span>
                </span>
              )}

              {profile.currentSituation && (
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-[#FBBF24]" />
                  <span>{profile.currentSituation}</span>
                </span>
              )}

              {profile.linkedInUrl && (
                <a
                  href={profile.linkedInUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[#38BDF8] hover:text-[#7DD3FC] hover:underline font-semibold transition-colors"
                >
                  <Linkedin className="w-3.5 h-3.5" />
                  <span>LinkedIn</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Liquid Glass Edit Button */}
        <button
          onClick={onEditClick}
          className="shrink-0 flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] border border-white/20 hover:border-white/40 text-xs font-bold text-[#F5F6FA] backdrop-blur-2xl shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_0_24px_rgba(216,26,69,0.35)] transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
        >
          <Edit3 className="w-3.5 h-3.5 text-[#FF6685]" />
          <span>Modifier le profil</span>
        </button>
      </div>

      {/* Dynamic Statistics Bar (Elevated Floating Glass Cards) */}
      <div className="relative z-10 pt-4 border-t border-white/12 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/12 hover:border-white/30 text-center backdrop-blur-xl shadow-lg hover:shadow-[0_12px_28px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-1 cursor-default group/stat relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover/stat:opacity-100 transition-opacity pointer-events-none" />
          <span className="text-xl font-black text-[#F5F6FA] font-display group-hover/stat:text-white transition-colors">{expCount}</span>
          <span className="text-[11px] text-[#9AA0B2] block font-medium mt-0.5">expérience{expCount > 1 ? "s" : ""}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/12 hover:border-[#38BDF8]/50 text-center backdrop-blur-xl shadow-lg hover:shadow-[0_12px_28px_rgba(56,189,248,0.2)] transition-all duration-300 hover:-translate-y-1 cursor-default group/stat relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#38BDF8]/10 to-transparent opacity-0 group-hover/stat:opacity-100 transition-opacity pointer-events-none" />
          <span className="text-xl font-black text-[#38BDF8] font-display group-hover/stat:scale-110 transition-transform">{eduCount}</span>
          <span className="text-[11px] text-[#9AA0B2] block font-medium mt-0.5">formation{eduCount > 1 ? "s" : ""}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/12 hover:border-[#C084FC]/50 text-center backdrop-blur-xl shadow-lg hover:shadow-[0_12px_28px_rgba(192,132,252,0.2)] transition-all duration-300 hover:-translate-y-1 cursor-default group/stat relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#C084FC]/10 to-transparent opacity-0 group-hover/stat:opacity-100 transition-opacity pointer-events-none" />
          <span className="text-xl font-black text-[#C084FC] font-display group-hover/stat:scale-110 transition-transform">{skillCount}</span>
          <span className="text-[11px] text-[#9AA0B2] block font-medium mt-0.5">compétences</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/12 hover:border-[#FBBF24]/50 text-center backdrop-blur-xl shadow-lg hover:shadow-[0_12px_28px_rgba(251,191,36,0.2)] transition-all duration-300 hover:-translate-y-1 cursor-default group/stat relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#FBBF24]/10 to-transparent opacity-0 group-hover/stat:opacity-100 transition-opacity pointer-events-none" />
          <span className="text-xl font-black text-[#FBBF24] font-display group-hover/stat:scale-110 transition-transform">{langCount}</span>
          <span className="text-[11px] text-[#9AA0B2] block font-medium mt-0.5">langue{langCount > 1 ? "s" : ""}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/12 hover:border-[#34D399]/50 text-center backdrop-blur-xl shadow-lg hover:shadow-[0_12px_28px_rgba(52,211,153,0.2)] transition-all duration-300 hover:-translate-y-1 cursor-default group/stat relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#34D399]/10 to-transparent opacity-0 group-hover/stat:opacity-100 transition-opacity pointer-events-none" />
          <span className="text-xl font-black text-[#34D399] font-display group-hover/stat:scale-110 transition-transform">{certCount}</span>
          <span className="text-[11px] text-[#9AA0B2] block font-medium mt-0.5">certification{certCount > 1 ? "s" : ""}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/12 hover:border-[#FF6685]/50 text-center backdrop-blur-xl shadow-lg hover:shadow-[0_12px_28px_rgba(255,102,133,0.2)] transition-all duration-300 hover:-translate-y-1 cursor-default group/stat relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#FF6685]/10 to-transparent opacity-0 group-hover/stat:opacity-100 transition-opacity pointer-events-none" />
          <span className="text-xl font-black text-[#FF6685] font-display group-hover/stat:scale-110 transition-transform">{projCount}</span>
          <span className="text-[11px] text-[#9AA0B2] block font-medium mt-0.5">projet{projCount > 1 ? "s" : ""}</span>
        </div>
      </div>
    </div>
  );
};
