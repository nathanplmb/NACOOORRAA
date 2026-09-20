import React, { useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { dbStore } from "../../dbStore";
import { CandidateProfile, DetailedExperience, DetailedEducation, HardSkillItem } from "../../types";
import { GlassButton, Modal, Badge } from "../Shared";
import { 
  FileText, 
  Upload, 
  Sparkles, 
  Check, 
  Plus, 
  ArrowRight, 
  Layers, 
  Loader2, 
  AlertCircle,
  FileCheck,
  CheckSquare,
  Square
} from "lucide-react";

interface MultiCVFusionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

export const MultiCVFusionModal: React.FC<MultiCVFusionModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { language } = useLanguage();
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [cvText, setCvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [extractedData, setExtractedData] = useState<any | null>(null);

  // Selection states for merge
  const [selectedExps, setSelectedExps] = useState<Record<number, boolean>>({});
  const [selectedEdus, setSelectedEdus] = useState<Record<number, boolean>>({});
  const [selectedSkills, setSelectedSkills] = useState<Record<string, boolean>>({});
  const [selectedTools, setSelectedTools] = useState<Record<string, boolean>>({});

  const currentProfile = dbStore.getProfile();

  const handleFileUpload = async (file: File) => {
    setFileName(file.name);
    setIsParsing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-document", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.text) {
        setCvText(data.text);
        await parseCVWithAI(data.text);
      } else {
        throw new Error(data.error || "Impossible d'extraire le texte");
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Erreur de traitement du fichier");
      setIsParsing(false);
    }
  };

  const handleDirectParse = async () => {
    if (!cvText.trim()) return;
    setIsParsing(true);
    await parseCVWithAI(cvText);
  };

  const parseCVWithAI = async (text: string) => {
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "parseCV",
          payload: { cvText: text }
        })
      });

      const json = await res.json();
      if (json && json.parsed) {
        setExtractedData(json.parsed);

        // Pre-select new items by default
        const expMap: Record<number, boolean> = {};
        (json.parsed.experiences || []).forEach((_: any, i: number) => { expMap[i] = true; });
        setSelectedExps(expMap);

        const eduMap: Record<number, boolean> = {};
        (json.parsed.education || []).forEach((_: any, i: number) => { eduMap[i] = true; });
        setSelectedEdus(eduMap);

        const skillMap: Record<string, boolean> = {};
        (json.parsed.skills || []).forEach((s: string) => { skillMap[s] = true; });
        setSelectedSkills(skillMap);

        const toolMap: Record<string, boolean> = {};
        (json.parsed.toolsAndSoftware || []).forEach((t: string) => { toolMap[t] = true; });
        setSelectedTools(toolMap);

        setStep("review");
      } else {
        throw new Error("L'IA n'a pas pu structurer ce CV.");
      }
    } catch (err: any) {
      alert("Erreur lors de l'analyse IA : " + err.message);
    } finally {
      setIsParsing(false);
    }
  };

  const handleApplyFusion = () => {
    if (!extractedData) return;

    const existingExps = currentProfile.experiences || [];
    const newExpsToMerge: DetailedExperience[] = (extractedData.experiences || [])
      .filter((_: any, idx: number) => selectedExps[idx])
      .map((e: any) => ({
        id: `exp_fused_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        role: e.role || "Poste",
        company: e.company || "Entreprise",
        startDate: e.dates?.split("-")?.[0]?.trim() || "",
        endDate: e.dates?.split("-")?.[1]?.trim() || "",
        period: e.dates || "",
        description: e.description || (e.responsibilities || []).join("\n"),
        missions: e.responsibilities || (e.description ? e.description.split("\n") : []),
        skills: e.skillsUsed || [],
        tools: e.technologies || []
      }));

    const existingEdus = currentProfile.educations || [];
    const newEdusToMerge: DetailedEducation[] = (extractedData.education || [])
      .filter((_: any, idx: number) => selectedEdus[idx])
      .map((ed: any) => ({
        id: `edu_fused_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        degree: ed.degree || "Diplôme",
        institution: ed.school || ed.institution || "Établissement",
        school: ed.school || ed.institution || "Établissement",
        startDate: ed.dates?.split("-")?.[0]?.trim() || "",
        endDate: ed.dates?.split("-")?.[1]?.trim() || "",
        period: ed.dates || "",
        description: ed.description || ""
      }));

    // Deduplicate skills
    const existingHardSkills = currentProfile.hardSkills || [];
    const newHardSkillsToAdd: HardSkillItem[] = Object.keys(selectedSkills)
      .filter(k => selectedSkills[k])
      .filter(k => !existingHardSkills.some(eh => eh.name.toLowerCase() === k.toLowerCase()))
      .map(k => ({ name: k, level: "Avancé", category: "Général" }));

    // Deduplicate tools
    const existingTools = currentProfile.toolsAndSoftware || [];
    const newToolsToAdd = Object.keys(selectedTools)
      .filter(k => selectedTools[k])
      .filter(k => !existingTools.some(et => et.toLowerCase() === k.toLowerCase()));

    const mergedProfile: CandidateProfile = {
      ...currentProfile,
      experiences: [...existingExps, ...newExpsToMerge],
      educations: [...existingEdus, ...newEdusToMerge],
      hardSkills: [...existingHardSkills, ...newHardSkillsToAdd],
      toolsAndSoftware: [...existingTools, ...newToolsToAdd]
    };

    dbStore.updateProfile(mergedProfile);

    // Save as document in dossier
    dbStore.addDocument({
      title: fileName || `CV Version ${new Date().toLocaleDateString("fr-FR")}`,
      type: "CV",
      content: cvText,
      fileName: fileName || "cv_fused.pdf"
    });

    if (onSuccess) {
      onSuccess("Fusion multi-CV appliquée avec succès au profil !");
    }
    handleClose();
  };

  const handleClose = () => {
    setStep("upload");
    setCvText("");
    setFileName("");
    setExtractedData(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import & Fusion Multi-CV Intelligente"
      size="lg"
    >
      {step === "upload" ? (
        <div className="space-y-4">
          <p className="text-xs text-[#9AA0B2] leading-relaxed">
            Importez une nouvelle version de CV (ou variante sectorielle). L'IA extrait automatiquement les expériences, formations et compétences inédites pour les fusionner avec votre profil NACORA existant <strong className="text-white">sans écraser vos données déjà saisies</strong>.
          </p>

          {/* Drag and Drop Zone */}
          <div className="p-6 rounded-2xl border-2 border-dashed border-white/10 hover:border-[#FF6685]/50 bg-white/[0.02] text-center transition-all">
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              id="multi-cv-upload"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />
            <label htmlFor="multi-cv-upload" className="cursor-pointer flex flex-col items-center gap-2">
              <div className="p-3 rounded-full bg-[rgba(216,26,69,0.15)] text-[#FF6685]">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-white">
                {fileName ? fileName : "Cliquez ou déposez votre fichier (PDF, Word, TXT)"}
              </span>
              <span className="text-[10px] text-[#9AA0B2]">Extraction de texte automatique & sécurisée</span>
            </label>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink mx-4 text-[10px] text-[#9AA0B2] uppercase">ou collez le texte brut</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <textarea
            placeholder="Collez le texte de votre CV ici..."
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
            className="w-full min-h-[120px] glass-input p-3 text-xs text-white placeholder-[#9AA0B2]/60 font-mono"
          />

          <div className="flex justify-end gap-3 pt-3">
            <GlassButton variant="ghost" onClick={handleClose}>
              Annuler
            </GlassButton>
            <GlassButton
              variant="primary"
              onClick={handleDirectParse}
              disabled={isParsing || !cvText.trim()}
              icon={isParsing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            >
              {isParsing ? "Analyse IA en cours..." : "Analyser & Fusionner"}
            </GlassButton>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="p-3 rounded-xl bg-[rgba(216,26,69,0.06)] border border-[rgba(216,26,69,0.2)] flex items-center gap-2.5 text-xs text-[#FF6685]">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>Sélectionnez les éléments à intégrer dans votre profil NACORA :</span>
          </div>

          {/* Extracted Experiences */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white flex items-center justify-between">
              <span>Nouvelles Expériences Détectées ({extractedData.experiences?.length || 0})</span>
            </h4>
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {(extractedData.experiences || []).map((exp: any, idx: number) => (
                <div
                  key={idx}
                  onClick={() => setSelectedExps(prev => ({ ...prev, [idx]: !prev[idx] }))}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                    selectedExps[idx]
                      ? "bg-white/[0.04] border-[#FF6685]/50 text-white"
                      : "bg-white/[0.01] border-white/5 text-[#9AA0B2] opacity-60"
                  }`}
                >
                  <div className="mt-0.5 text-[#FF6685]">
                    {selectedExps[idx] ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-[#9AA0B2]" />}
                  </div>
                  <div className="flex-1 text-xs">
                    <div className="font-bold text-white">{exp.role} — {exp.company}</div>
                    <div className="text-[10px] text-[#9AA0B2]">{exp.dates}</div>
                    <p className="text-[11px] text-[#9AA0B2] mt-1 line-clamp-2">{exp.description || (exp.responsibilities || []).join(" ")}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Extracted Educations */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white">
              Formations & Diplômes ({extractedData.education?.length || 0})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(extractedData.education || []).map((edu: any, idx: number) => (
                <div
                  key={idx}
                  onClick={() => setSelectedEdus(prev => ({ ...prev, [idx]: !prev[idx] }))}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                    selectedEdus[idx]
                      ? "bg-white/[0.04] border-[#38BDF8]/50 text-white"
                      : "bg-white/[0.01] border-white/5 text-[#9AA0B2] opacity-60"
                  }`}
                >
                  <div className="text-[#38BDF8]">
                    {selectedEdus[idx] ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5 text-[#9AA0B2]" />}
                  </div>
                  <div className="text-xs">
                    <div className="font-semibold text-white">{edu.degree}</div>
                    <div className="text-[10px] text-[#9AA0B2]">{edu.school || edu.institution} ({edu.dates})</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Skills & Tools Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <h5 className="text-[11px] font-bold text-[#34D399] uppercase mb-1.5">Compétences à ajouter</h5>
              <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto">
                {(extractedData.skills || []).map((sk: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setSelectedSkills(prev => ({ ...prev, [sk]: !prev[sk] }))}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition-all ${
                      selectedSkills[sk]
                        ? "bg-[#34D399]/20 border-[#34D399]/40 text-[#34D399]"
                        : "bg-white/5 border-white/5 text-[#9AA0B2] line-through"
                    }`}
                  >
                    {sk}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h5 className="text-[11px] font-bold text-[#C084FC] uppercase mb-1.5">Outils / Logiciels</h5>
              <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto">
                {(extractedData.toolsAndSoftware || []).map((tool: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setSelectedTools(prev => ({ ...prev, [tool]: !prev[tool] }))}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition-all ${
                      selectedTools[tool]
                        ? "bg-[#C084FC]/20 border-[#C084FC]/40 text-[#C084FC]"
                        : "bg-white/5 border-white/5 text-[#9AA0B2] line-through"
                    }`}
                  >
                    {tool}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-white/10">
            <GlassButton variant="ghost" size="sm" onClick={() => setStep("upload")}>
              Retour
            </GlassButton>
            <GlassButton variant="primary" size="md" onClick={handleApplyFusion} icon={<Check className="w-3.5 h-3.5" />}>
              Valider la Fusion & Mettre à jour le Profil
            </GlassButton>
          </div>
        </div>
      )}
    </Modal>
  );
};
