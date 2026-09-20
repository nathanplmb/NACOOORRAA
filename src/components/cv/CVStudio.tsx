import React, { useState, useEffect } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { dbStore } from "../../dbStore";
import { CandidateProfile, DetailedExperience, DetailedEducation } from "../../types";
import { GlassCard, GlassButton, Badge, Modal } from "../Shared";
import { 
  FileText, 
  Sparkles, 
  Printer, 
  CheckCircle, 
  AlertCircle, 
  Plus, 
  Trash2, 
  HelpCircle, 
  ArrowRight, 
  Sliders, 
  Layers, 
  TrendingUp, 
  ShieldCheck, 
  Briefcase, 
  GraduationCap, 
  Code, 
  Globe, 
  Award, 
  Send, 
  Loader2,
  Check
} from "lucide-react";
import { 
  auditProfileAgainstFramework, 
  CVAuditResult, 
  OptimizedExperienceResult 
} from "../../api/cvFramework";

interface CVStudioProps {
  onNotify?: (msg: string, type: "success" | "error" | "info" | "ai") => void;
}

export const CVStudio: React.FC<CVStudioProps> = ({ onNotify }) => {
  const { language } = useLanguage();
  const [profile, setProfile] = useState<CandidateProfile>(dbStore.getProfile());
  const [audit, setAudit] = useState<CVAuditResult | null>(null);
  const [optimizingExpId, setOptimizingExpId] = useState<string | null>(null);
  const [optimizedDrafts, setOptimizedDrafts] = useState<Record<string, OptimizedExperienceResult>>({});
  const [answeringQuestions, setAnsweringQuestions] = useState<Record<string, Record<number, string>>>({});
  const [selectedTargetOffer, setSelectedTargetOffer] = useState<string>("");

  useEffect(() => {
    const current = dbStore.getProfile();
    setProfile(current);
    runAudit(current);

    const unsub = dbStore.subscribe(() => {
      const p = dbStore.getProfile();
      setProfile(p);
    });
    return unsub;
  }, []);

  const runAudit = async (p: CandidateProfile) => {
    try {
      const res = await auditProfileAgainstFramework(p);
      setAudit(res);
    } catch (e) {
      console.warn("Audit error:", e);
    }
  };

  const opportunities = dbStore.getOpportunities();

  // Trigger AI Optimization for a specific experience
  const handleOptimizeExperience = async (exp: DetailedExperience) => {
    setOptimizingExpId(exp.id);
    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "optimizeCVExperience",
          payload: {
            experience: exp,
            profile,
            targetOfferTitle: selectedTargetOffer
          }
        })
      });

      if (!response.ok) throw new Error("Erreur serveur");
      const result: OptimizedExperienceResult = await response.json();
      
      setOptimizedDrafts(prev => ({ ...prev, [exp.id]: result }));
      if (onNotify) {
        onNotify(language === "en" ? "Experience optimized with NACORA CV Framework" : "Expérience optimisée selon le standard NACORA", "ai");
      }
    } catch (err) {
      console.error("Optimization failed:", err);
      if (onNotify) {
        onNotify(language === "en" ? "Optimization failed" : "Échec de l'optimisation", "error");
      }
    } finally {
      setOptimizingExpId(null);
    }
  };

  // Apply optimized draft into candidate profile
  const handleApplyDraft = (expId: string) => {
    const draft = optimizedDrafts[expId];
    if (!draft) return;

    const updatedExperiences = (profile.experiences || []).map(exp => {
      if (exp.id === expId) {
        return {
          ...exp,
          missions: draft.bulletPoints,
          description: `${draft.bulletPoints.join("\n")}\n\n${draft.skillsAndToolsLine}`,
          skills: Array.from(new Set([...(exp.skills || []), ...draft.atsKeywords]))
        };
      }
      return exp;
    });

    const updatedProfile = { ...profile, experiences: updatedExperiences };
    dbStore.updateProfile(updatedProfile);
    runAudit(updatedProfile);

    // Clean draft
    setOptimizedDrafts(prev => {
      const copy = { ...prev };
      delete copy[expId];
      return copy;
    });

    if (onNotify) {
      onNotify(language === "en" ? "Modifications saved to your CV" : "Modifications intégrées à votre CV", "success");
    }
  };

  // Submit missing data answers to inject into the draft
  const handleInjectAnswer = (expId: string, qIndex: number) => {
    const answer = answeringQuestions[expId]?.[qIndex]?.trim();
    if (!answer) return;

    const draft = optimizedDrafts[expId];
    if (!draft) return;

    // Inject metric into bullet points
    const updatedBullets = draft.bulletPoints.map((b, idx) => {
      if (idx === 0 || b.includes("[") || idx === qIndex) {
        return `${b} (${answer})`;
      }
      return b;
    });

    const updatedQuestions = draft.missingInfoQuestions.filter((_, i) => i !== qIndex);

    setOptimizedDrafts(prev => ({
      ...prev,
      [expId]: {
        ...draft,
        bulletPoints: updatedBullets,
        missingInfoQuestions: updatedQuestions
      }
    }));

    setAnsweringQuestions(prev => ({
      ...prev,
      [expId]: {
        ...(prev[expId] || {}),
        [qIndex]: ""
      }
    }));

    if (onNotify) {
      onNotify(language === "en" ? "Data incorporated into bullet point" : "Donnée chiffrée intégrée dans la puce", "success");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header with Framework Quality Badge & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-white/[0.04] via-white/[0.02] to-transparent border border-white/10">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="p-1.5 rounded-lg bg-[rgba(216,26,69,0.15)] text-[#FF6685] border border-[rgba(216,26,69,0.3)]">
              <Sparkles className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-[#F5F6FA] font-display">
              NACORA CV Studio & Format 1-Page
            </h2>
            <Badge variant="blue">Méthodologie NACORA</Badge>
          </div>
          <p className="text-xs text-[#9AA0B2] max-w-2xl leading-relaxed">
            Éditeur structuré encodant les règles de concision 1-page, la formule <strong className="text-[#F5F6FA]">Action → Contexte → Résultat</strong>, la ligne de compétences en <em className="text-[#C084FC]">italique</em> et l'interdiction stricte de toute invention.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <GlassButton 
            variant="ghost" 
            size="sm" 
            onClick={handlePrint}
            icon={<Printer className="w-3.5 h-3.5" />}
          >
            {language === "en" ? "Export 1-Page PDF" : "Exporter / Imprimer 1-Page"}
          </GlassButton>
        </div>
      </div>

      {/* Target Offer Selector & Audit Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Alignment Selector */}
        <GlassCard className="p-4 flex flex-col justify-between" hoverable>
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-[#F5F6FA] flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-[#38BDF8]" />
                {language === "en" ? "Align with an Opportunity" : "Aligner sur une Opportunité"}
              </span>
              <span className="text-[10px] text-[#9AA0B2]">{opportunities.length} disponibles</span>
            </div>
            <p className="text-[11px] text-[#9AA0B2] mb-3">
              Sélectionnez une opportunité pour orienter l'optimisation des mots-clés ATS et verbes d'action.
            </p>
            <select
              value={selectedTargetOffer}
              onChange={(e) => setSelectedTargetOffer(e.target.value)}
              className="w-full glass-input px-3 py-2 text-xs text-[#F5F6FA] bg-[#060812]"
            >
              <option value="" className="bg-[#060812] text-[#9AA0B2]">Toutes opportunités (Général Banque & Finance)</option>
              {opportunities.map(o => (
                <option key={o.id} value={o.title} className="bg-[#060812] text-[#F5F6FA]">
                  {o.title} — {o.companyName}
                </option>
              ))}
            </select>
          </div>
        </GlassCard>

        {/* Audit Metrics */}
        {audit && (
          <GlassCard className="p-4 lg:col-span-2" hoverable>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#34D399]" />
                <span className="text-xs font-bold text-[#F5F6FA]">
                  Audit de Conformité au CV Framework
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-bold text-[#34D399]">{audit.overallScore}%</span>
                <span className="text-[10px] text-[#9AA0B2]">score de qualité</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-[10px] text-[#9AA0B2] block">Verbes d'Action</span>
                <span className="text-sm font-black font-mono text-[#F5F6FA]">{audit.actionVerbsScore}%</span>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-[10px] text-[#9AA0B2] block">Quantification</span>
                <span className="text-sm font-black font-mono text-[#FBBF24]">{audit.quantificationScore}%</span>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-[10px] text-[#9AA0B2] block">Format 1-Page</span>
                <span className="text-sm font-black font-mono text-[#38BDF8]">{audit.onePageDensityScore}%</span>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-[10px] text-[#9AA0B2] block">Optimisation ATS</span>
                <span className="text-sm font-black font-mono text-[#C084FC]">{audit.atsOptimizationScore}%</span>
              </div>
            </div>

            {audit.improvements.length > 0 && (
              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center gap-2 text-[11px] text-[#9AA0B2]">
                <AlertCircle className="w-3.5 h-3.5 text-[#FBBF24] shrink-0" />
                <span className="truncate">Conseil clé : {audit.improvements[0]}</span>
              </div>
            )}
          </GlassCard>
        )}
      </div>

      {/* Structured CV Workspace Preview (Printable 1-Page Sheet) */}
      <div className="p-6 sm:p-10 rounded-2xl bg-[#090C16] border border-white/10 shadow-2xl relative">
        <div className="max-w-4xl mx-auto space-y-6 text-[#F5F6FA]">
          
          {/* CV HEADER */}
          <div className="border-b border-white/10 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-display">
                  {profile.fullName || "Prénom NOM"}
                </h1>
                <p className="text-sm font-bold text-[#FF6685] tracking-wide mt-0.5">
                  {profile.title || "Conseiller Clientèle / Analyste Financier en Alternance"}
                </p>
              </div>

              <div className="text-[11px] text-[#9AA0B2] space-y-0.5 sm:text-right font-mono">
                <div>{profile.email} • {profile.phone || "Téléphone"}</div>
                <div>{profile.city || "Ville"}, {profile.country || "France"} {profile.mobility ? `(${profile.mobility})` : ""}</div>
                <div>{profile.linkedInUrl ? "LinkedIn vérifié" : "LinkedIn"} • Permis B</div>
              </div>
            </div>

            {/* Pitch Profil (2-3 lines max) */}
            <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-[#9AA0B2] leading-relaxed">
              <strong className="text-white">Profil : </strong>
              {profile.bio || `Actuellement en ${profile.currentSituation || "formation Banque & Finance"} chez ${profile.currentAlternance || "établissement bancaire"}, je prépare l'intégration d'un Master en Finance/Banque pour approfondir mes compétences en analyse financière et relation client.`}
            </div>
          </div>

          {/* EXPÉRIENCES PROFESSIONNELLES */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#FF6685] flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5" />
                Expériences Professionnelles
              </h3>
              <span className="text-[10px] text-[#9AA0B2]">Structure Action → Contexte → Résultat</span>
            </div>

            {(!profile.experiences || profile.experiences.length === 0) ? (
              <p className="text-xs text-[#9AA0B2] italic py-2">
                Aucune expérience ajoutée pour le moment.
              </p>
            ) : (
              profile.experiences.map((exp) => {
                const draft = optimizedDrafts[exp.id];
                const isOptimizing = optimizingExpId === exp.id;

                return (
                  <div key={exp.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all space-y-3">
                    
                    {/* Header line */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{exp.role}</span>
                        <span className="text-xs text-[#9AA0B2]">• {exp.company}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-[#9AA0B2]">
                          {exp.period || (exp.startDate ? `${exp.startDate} - ${exp.endDate || "Présent"}` : "")}
                        </span>
                        
                        <button
                          onClick={() => handleOptimizeExperience(exp)}
                          disabled={isOptimizing}
                          className="px-2.5 py-1 rounded-lg bg-[rgba(216,26,69,0.15)] hover:bg-[rgba(216,26,69,0.25)] text-[#FF6685] border border-[rgba(216,26,69,0.3)] text-[10px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                          title="Optimiser selon le standard NACORA"
                        >
                          {isOptimizing ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Optimisation...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3" />
                              <span>Optimiser avec l'IA</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Active Draft or Current Bullets */}
                    {draft ? (
                      <div className="p-3.5 rounded-xl bg-[rgba(216,26,69,0.06)] border border-[rgba(216,26,69,0.25)] space-y-3 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-[#FF6685] flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3" />
                            Proposition optimisée NACORA
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleApplyDraft(exp.id)}
                              className="px-2.5 py-1 rounded-lg bg-[#12B76A] hover:bg-[#12B76A]/90 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              Valider & Intégrer
                            </button>
                            <button
                              onClick={() => {
                                setOptimizedDrafts(prev => {
                                  const c = { ...prev };
                                  delete c[exp.id];
                                  return c;
                                });
                              }}
                              className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#9AA0B2] text-[10px]"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>

                        {/* Bullet points */}
                        <ul className="space-y-1.5 text-xs text-[#F5F6FA]">
                          {draft.bulletPoints.map((b, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-[#FF6685] font-bold mt-0.5">•</span>
                              <span className="leading-relaxed">{b}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Italicized line of skills & tools */}
                        <div className="pt-1.5 border-t border-white/5 text-[11px] text-[#C084FC] italic">
                          {draft.skillsAndToolsLine}
                        </div>

                        {/* Missing information interactive questions */}
                        {draft.missingInfoQuestions.length > 0 && (
                          <div className="p-3 rounded-lg bg-black/40 border border-white/10 space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#FBBF24] flex items-center gap-1.5">
                              <HelpCircle className="w-3 h-3" />
                              Questions de précision (Règle Anti-Invention)
                            </span>
                            <div className="space-y-2">
                              {draft.missingInfoQuestions.map((q, qIdx) => (
                                <div key={qIdx} className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                                  <span className="text-[#9AA0B2] flex-1">{q}</span>
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="text"
                                      placeholder="Votre réponse / chiffre réel..."
                                      value={answeringQuestions[exp.id]?.[qIdx] || ""}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setAnsweringQuestions(prev => ({
                                          ...prev,
                                          [exp.id]: {
                                            ...(prev[exp.id] || {}),
                                            [qIdx]: val
                                          }
                                        }));
                                      }}
                                      className="glass-input px-2.5 py-1 text-xs text-white max-w-[200px]"
                                    />
                                    <button
                                      onClick={() => handleInjectAnswer(exp.id, qIdx)}
                                      className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                                      title="Intégrer"
                                    >
                                      <Send className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Render standard bullets */}
                        <ul className="space-y-1 text-xs text-[#9AA0B2]">
                          {(exp.missions && exp.missions.length > 0 ? exp.missions : (exp.description || "").split("\n").filter(Boolean)).map((m, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-[#9AA0B2]">•</span>
                              <span className="leading-relaxed text-[#E2E8F0]">{m.replace(/^[-•*]\s*/, "")}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Italicized line if available */}
                        {(exp.skills && exp.skills.length > 0 || exp.tools && exp.tools.length > 0) && (
                          <div className="text-[11px] text-[#C084FC] italic pt-1">
                            *Compétences & Outils : {[...(exp.skills || []), ...(exp.tools || [])].join(", ")}*
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* FORMATIONS & DIPLÔMES */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#38BDF8] flex items-center gap-2">
                <GraduationCap className="w-3.5 h-3.5" />
                Formations & Diplômes
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(profile.educations || []).map((edu) => (
                <div key={edu.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{edu.degree}</span>
                    <span className="text-[10px] font-mono text-[#9AA0B2]">{edu.period || edu.endDate}</span>
                  </div>
                  <div className="text-[11px] text-[#9AA0B2]">{edu.school || edu.institution}</div>
                  {edu.description && (
                    <p className="text-[10px] text-[#9AA0B2]/80 line-clamp-2">{edu.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* COMPÉTENCES, OUTILS & LANGUES */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* Hard Skills */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#34D399]">
                Compétences Clés
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {(profile.hardSkills || []).map((sk, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/5 text-[10px] text-[#F5F6FA]">
                    {sk.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Outils Logiciels */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#C084FC]">
                Logiciels & Progiciels
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {(profile.toolsAndSoftware || []).map((tool, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/5 text-[10px] text-[#C084FC]">
                    {tool}
                  </span>
                ))}
              </div>
            </div>

            {/* Langues */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#FBBF24]">
                Langues
              </h4>
              <div className="space-y-1 text-xs text-[#9AA0B2]">
                {(profile.languagesList || []).map((lang, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <span className="text-white">{lang.language}</span>
                    <span className="font-mono text-[#9AA0B2]">{lang.level}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
