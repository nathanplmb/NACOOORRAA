import React from "react";
import { CandidateProfile } from "../../types";
import { calculateProfileCompletion } from "../../dbStore";
import { CheckCircle2, Circle, ShieldCheck, ChevronRight } from "lucide-react";

interface ProfileCompletionCardProps {
  profile: CandidateProfile;
  onNavigateSection: (sectionId: string) => void;
}

export const ProfileCompletionCard: React.FC<ProfileCompletionCardProps> = ({
  profile,
  onNavigateSection,
}) => {
  const { score, completedSections, totalSections, sectionsStatus } = calculateProfileCompletion(profile);

  const rubrics = [
    {
      id: "identite",
      label: "Identité & Contact",
      status: sectionsStatus.identity,
      desc: "Prénom, nom, titre, coordonnées & réseaux"
    },
    {
      id: "objectifs",
      label: "Objectifs & Préférences",
      status: sectionsStatus.objectives,
      desc: "Postes ciblés, contrats, rémunération, mode de travail"
    },
    {
      id: "experiences",
      label: "Expériences professionnelles",
      status: sectionsStatus.experiences,
      desc: "Parcours en entreprise, stages, bénévolats"
    },
    {
      id: "formations",
      label: "Études & Formations",
      status: sectionsStatus.educations,
      desc: "Établissements, diplômes & spécialisations"
    },
    {
      id: "competences",
      label: "Compétences & Outils",
      status: sectionsStatus.skills,
      desc: "Hard skills, logiciels maîtrisés, soft skills"
    },
    {
      id: "langues",
      label: "Langues",
      status: sectionsStatus.languages,
      desc: "Langue maternelle, niveaux CECRL, TOEIC"
    },
    {
      id: "certifications",
      label: "Certifications",
      status: sectionsStatus.certifications,
      desc: "Accréditations, certifications professionnelles"
    },
    {
      id: "projets",
      label: "Projets & Engagements",
      status: sectionsStatus.projects,
      desc: "Projets personnels, hackathons & vie associative"
    },
    {
      id: "interets",
      label: "Centres d'intérêt",
      status: sectionsStatus.interests,
      desc: "Passions, sports, curiosités personnelles"
    }
  ];

  return (
    <div className="glass-panel relative overflow-hidden rounded-3xl p-6 md:p-8 space-y-6 before:absolute before:top-0 before:left-0 before:right-0 before:h-[1.5px] before:bg-gradient-to-r before:from-transparent before:via-white/45 before:to-transparent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#34D399]/15 border border-[#34D399]/30 flex items-center justify-center text-[#34D399] shadow-[0_0_15px_rgba(52,211,153,0.2)]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-[#F5F6FA] font-display">Score de complétude du profil</h3>
          </div>
          <p className="text-xs text-[#9AA0B2]">
            Un profil complété à 100% permet à NACORA de vous proposer un accompagnement ultra-personnalisé.
          </p>
        </div>

        {/* Global Progress Widget (Liquid Glass Container) */}
        <div className="glass-card-static flex items-center gap-5 p-4 w-full md:w-auto">
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            {/* SVG Donut Ring */}
            <svg className="w-16 h-16 transform -rotate-90 drop-shadow-[0_0_8px_rgba(216,26,69,0.3)]">
              <circle cx="32" cy="32" r="26" stroke="rgba(255,255,255,0.08)" strokeWidth="6" fill="transparent" />
              <circle
                cx="32"
                cy="32"
                r="26"
                stroke="url(#completionGrad)"
                strokeWidth="6"
                strokeDasharray="163.3"
                strokeDashoffset={163.3 - (163.3 * score) / 100}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-700 ease-out"
              />
              <defs>
                <linearGradient id="completionGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#D81A45" />
                  <stop offset="100%" stopColor="#34D399" />
                </linearGradient>
              </defs>
            </svg>
            <span className="absolute text-sm font-black text-[#F5F6FA] font-display">{score}%</span>
          </div>

          <div>
            <span className="text-xs font-bold text-[#F5F6FA] block font-display">
              {completedSections} / {totalSections} rubriques complétées
            </span>
            <span className="text-[11px] text-[#9AA0B2] block mt-0.5">
              {score === 100 ? "Profil d'excellence prêt pour la candidature !" : "Complétez les rubriques restantes"}
            </span>
          </div>
        </div>
      </div>

      {/* Categories Grid (Interactive Glass Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {rubrics.map((r) => (
          <div
            key={r.id}
            onClick={() => onNavigateSection(r.id)}
            className="group glass-card-interactive flex items-center justify-between p-3.5 hover:border-white/25 transition-all duration-300 cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0 pr-2">
              {r.status ? (
                <div className="w-6 h-6 rounded-lg bg-[#34D399]/15 border border-[#34D399]/30 flex items-center justify-center text-[#34D399] shrink-0 shadow-[0_0_12px_rgba(52,211,153,0.2)]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#9AA0B2]/40 shrink-0">
                  <Circle className="w-3.5 h-3.5" />
                </div>
              )}
              <div className="min-w-0">
                <span className="text-xs font-bold text-[#F5F6FA] block truncate font-display group-hover:text-white transition-colors">
                  {r.label}
                </span>
                <span className="text-[10px] text-[#9AA0B2] block truncate">
                  {r.status ? "Rubrique complétée" : "À renseigner"}
                </span>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigateSection(r.id);
              }}
              className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                r.status
                  ? "bg-white/5 text-[#9AA0B2] hover:text-[#F5F6FA] hover:bg-white/10 border border-white/10"
                  : "bg-[#D81A45]/20 text-[#FF6685] hover:bg-[#D81A45]/30 border border-[#D81A45]/40 shadow-[0_0_12px_rgba(216,26,69,0.2)]"
              }`}
            >
              <span>{r.status ? "Modifier" : "Compléter"}</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
