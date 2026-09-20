import React, { useState, useRef } from "react";
import { 
  X, 
  Upload, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ChevronRight, 
  Check, 
  Briefcase, 
  GraduationCap, 
  Award, 
  Globe, 
  Rocket, 
  Heart,
  ShieldCheck,
  Info,
  ChevronDown,
  Trash2,
  FileCode,
  Layers,
  Zap
} from "lucide-react";
import { CandidateProfile } from "../../types";
import { 
  extractTextFromFile, 
  analyzeCVWithAI, 
  compareWithExistingProfile, 
  applyCVMerge, 
  CVMergeProposal, 
  ParsedCVData 
} from "../../services/cvParser";

interface CVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingProfile: CandidateProfile;
  onMergeSuccess: (updatedProfile: CandidateProfile, message: string) => void;
}

type ModalStep = 'input' | 'processing' | 'preview';

export const CVImportModal: React.FC<CVImportModalProps> = ({
  isOpen,
  onClose,
  existingProfile,
  onMergeSuccess
}) => {
  const [step, setStep] = useState<ModalStep>('input');
  const [inputMode, setInputMode] = useState<'file' | 'text'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState<string>('');
  const [linkedinUrl, setLinkedinUrl] = useState<string>(existingProfile.linkedInUrl || '');
  const [linkedinText, setLinkedinText] = useState<string>('');
  const [linkedinNotice, setLinkedinNotice] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Processing Progress States
  const [currentProgressStep, setCurrentProgressStep] = useState<number>(0);
  const [progressLog, setProgressLog] = useState<string[]>([]);

  // Result & Comparison
  const [proposal, setProposal] = useState<CVMergeProposal | null>(null);
  const [mergeStrategy, setMergeStrategy] = useState<'merge' | 'add_new_only'>('merge');
  const [activePreviewTab, setActivePreviewTab] = useState<string>('experiences');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['pdf', 'docx', 'txt'].includes(ext)) {
      setErrorMessage("Format non supporté. Seuls les fichiers PDF, DOCX et TXT sont acceptés.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage("Fichier trop volumineux (maximum 15 Mo).");
      return;
    }
    setErrorMessage(null);
    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const runAnalysisPipeline = async () => {
    let rawText = '';
    let extractedLinkedinText = linkedinText;
    setErrorMessage(null);
    setLinkedinNotice(null);

    if (inputMode === 'file') {
      if (!selectedFile) {
        setErrorMessage("Veuillez sélectionner un fichier CV.");
        return;
      }
    } else {
      if (!pastedText.trim() || pastedText.trim().length < 30) {
        setErrorMessage("Veuillez coller un texte de CV valide (au moins 30 caractères).");
        return;
      }
      rawText = pastedText.trim();
    }

    setStep('processing');
    setCurrentProgressStep(1);
    setProgressLog(["✓ Préparation du document"]);

    try {
      // Étape 1: Extraction du texte du fichier
      if (inputMode === 'file' && selectedFile) {
        setProgressLog(prev => [...prev, "● Lecture et extraction du texte du fichier..."]);
        rawText = await extractTextFromFile(selectedFile);
      }

      // Étape 1.5: Tentative d'extraction LinkedIn si URL renseignée et pas de texte collé
      if (linkedinUrl.trim() && !extractedLinkedinText.trim()) {
        try {
          setProgressLog(prev => [...prev, "● Analyse complémentaire du profil LinkedIn..."]);
          const scrapeRes = await fetch('/api/scrape-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: linkedinUrl.trim() })
          });
          const scrapeData = await scrapeRes.json();
          if (scrapeRes.ok && scrapeData.text) {
            extractedLinkedinText = scrapeData.text;
            setProgressLog(prev => [...prev, "✓ Texte du profil LinkedIn récupéré avec succès !"]);
          } else {
            setLinkedinNotice(
              "Le profil LinkedIn n'est pas directement accessible publiquement par URL sans authentification. Vous pouvez copier-coller les informations de votre profil LinkedIn ou glisser-déposer votre export LinkedIn ci-dessous pour enrichir votre profil."
            );
          }
        } catch {
          setLinkedinNotice(
            "Le profil LinkedIn n'est pas directement accessible publiquement par URL sans authentification. Vous pouvez copier-coller les informations de votre profil LinkedIn ou glisser-déposer votre export LinkedIn ci-dessous pour enrichir votre profil."
          );
        }
      }

      setCurrentProgressStep(2);
      setProgressLog(prev => [
        ...prev.map(l => l.replace('●', '✓')),
        "● Analyse structurée et approfondie par l'IA..."
      ]);

      // Étape 2: Analyse IA via Gemini avec support multi-source
      const parsedData: ParsedCVData = await analyzeCVWithAI(rawText, extractedLinkedinText);

      setCurrentProgressStep(3);
      setProgressLog(prev => [
        ...prev.map(l => l.replace('●', '✓')),
        "● Extraction exhaustive des missions, KPI et certifications (TOEIC, TAGE MAGE)..."
      ]);

      await new Promise(r => setTimeout(r, 400)); // Smooth UI transition

      setCurrentProgressStep(4);
      setProgressLog(prev => [
        ...prev.map(l => l.replace('●', '✓')),
        "● Détection des enrichissements et mise en correspondance..."
      ]);

      // Étape 3: Comparaison avec le profil existant
      const mergeProp = compareWithExistingProfile(parsedData, existingProfile);
      setProposal(mergeProp);

      await new Promise(r => setTimeout(r, 300));

      setCurrentProgressStep(5);
      setProgressLog(prev => [
        ...prev.map(l => l.replace('●', '✓')),
        "✓ Préparation de la prévisualisation terminée !"
      ]);

      setStep('preview');
    } catch (err: any) {
      console.error("[CVImportModal] Pipeline error:", err);
      setStep('input');
      setErrorMessage(
        err.message || "Impossible d'analyser ce document. Vérifiez qu'il contient bien du texte ou essayez de coller le texte directement."
      );
    }
  };

  const handleConfirmMerge = () => {
    if (!proposal) return;

    try {
      const updated = applyCVMerge(proposal, existingProfile, mergeStrategy);
      const newItemsTotal = proposal.stats.newItemsCount;
      onMergeSuccess(
        updated,
        `CV importé avec succès ! ${newItemsTotal} élément${newItemsTotal > 1 ? 's' : ''} ajouté${newItemsTotal > 1 ? 's' : ''} ou mis à jour.`
      );
      onClose();
    } catch (err: any) {
      setErrorMessage("Erreur lors de la fusion des données : " + err.message);
    }
  };

  const resetModalState = () => {
    setStep('input');
    setSelectedFile(null);
    setPastedText('');
    setProposal(null);
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#060812]/80 backdrop-blur-2xl overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-[#0B0F19]/95 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-[0_16px_60px_rgba(0,0,0,0.8)] backdrop-blur-3xl text-[#F5F6FA] my-auto overflow-hidden">
        
        {/* Ambient Top Glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#D81A45] via-[#C084FC] to-[#38BDF8]" />
        <div className="absolute -top-24 right-10 w-72 h-72 bg-[#D81A45]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#D81A45]/15 border border-[#D81A45]/30 text-[#FF6685]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#F5F6FA] flex items-center gap-2">
                Import & Analyse Intelligente de CV
              </h2>
              <p className="text-xs text-[#9AA0B2]">
                Pré-remplissage automatique sans altération de vos données existantes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/10 text-[#9AA0B2] hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert if any */}
        {errorMessage && (
          <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <div className="flex-1">{errorMessage}</div>
            <button onClick={() => setErrorMessage(null)} className="underline text-rose-200 text-xs">Masquer</button>
          </div>
        )}

        {/* STEP 1: INPUT MODE */}
        {step === 'input' && (
          <div className="mt-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar pr-1">
            {/* Input Method Tabs */}
            <div className="flex items-center gap-2 p-1 rounded-xl bg-white/[0.04] border border-white/10 w-fit">
              <button
                onClick={() => setInputMode('file')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  inputMode === 'file'
                    ? 'bg-[#D81A45] text-white shadow-[0_2px_12px_rgba(216,26,69,0.4)]'
                    : 'text-[#9AA0B2] hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Fichier (PDF, DOCX, TXT)</span>
              </button>

              <button
                onClick={() => setInputMode('text')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  inputMode === 'text'
                    ? 'bg-[#D81A45] text-white shadow-[0_2px_12px_rgba(216,26,69,0.4)]'
                    : 'text-[#9AA0B2] hover:text-white'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Coller le texte du CV</span>
              </button>
            </div>

            {/* Mode 1: File Drag & Drop */}
            {inputMode === 'file' && (
              <div className="space-y-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                />

                {!selectedFile ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative flex flex-col items-center justify-center p-10 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center group ${
                      isDragging
                        ? 'border-[#D81A45] bg-[#D81A45]/10 scale-[1.01]'
                        : 'border-white/15 bg-white/[0.02] hover:border-[#D81A45]/50 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/10 text-[#FF6685] group-hover:scale-110 transition-transform mb-3">
                      <Upload className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-semibold text-[#F5F6FA] mb-1">
                      Déposez votre CV ici ou <span className="text-[#FF6685] underline">parcourez vos fichiers</span>
                    </p>
                    <p className="text-xs text-[#9AA0B2] max-w-sm">
                      Formats supportés : PDF, Word (.docx) ou Fichier texte (.txt). Taille max : 15 Mo.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.05] border border-[#D81A45]/40">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-[#D81A45]/20 text-[#FF6685]">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#F5F6FA]">{selectedFile.name}</p>
                        <p className="text-xs text-[#9AA0B2]">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} Mo • Fichier prêt pour l'analyse
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedFile(null)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                      title="Supprimer le fichier"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Mode 2: Paste Raw Text */}
            {inputMode === 'text' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#9AA0B2]">
                  Collez ci-dessous l'intégralité du texte de votre CV :
                </label>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Copiez-collez le contenu textuel de votre CV ici (expériences, formations, compétences...)..."
                  rows={8}
                  className="w-full p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-sm text-[#F5F6FA] placeholder-[#9AA0B2]/50 focus:outline-none focus:border-[#D81A45] focus:ring-1 focus:ring-[#D81A45] transition-all resize-none font-sans"
                />
              </div>
            )}

            {/* Optional LinkedIn Enrichment Block */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#F5F6FA] flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#38BDF8]" />
                  <span>Enrichissement optionnel via LinkedIn</span>
                </label>
                <span className="text-[10px] font-semibold text-[#38BDF8] bg-[#38BDF8]/10 px-2.5 py-0.5 rounded-md border border-[#38BDF8]/20">
                  Optionnel
                </span>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-[#9AA0B2] block mb-1">
                    URL du profil LinkedIn :
                  </label>
                  <input
                    type="text"
                    value={linkedinUrl}
                    onChange={(e) => {
                      setLinkedinUrl(e.target.value);
                      setLinkedinNotice(null);
                    }}
                    placeholder="https://www.linkedin.com/in/votre-profil"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/50 focus:outline-none focus:border-[#38BDF8] transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-semibold text-[#F5F6FA]">
                      Collez ici le contenu complet de votre profil LinkedIn :
                    </label>
                    <span className="text-[10px] text-[#9AA0B2]">
                      Expériences, formations, compétences, certifications...
                    </span>
                  </div>
                  <textarea
                    value={linkedinText}
                    onChange={(e) => setLinkedinText(e.target.value)}
                    placeholder={`Collez ici le contenu de votre profil LinkedIn :\n\nExpérience\nMarketing Manager — Michelin\n...\n...\nFormation\nMaster Marketing & Stratégie — Université Paris Dauphine\n...`}
                    rows={7}
                    className="w-full p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/40 focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8] transition-all resize-y font-sans leading-relaxed min-h-[140px] max-h-[300px] overflow-y-auto custom-scrollbar"
                  />
                </div>
              </div>

              {linkedinNotice && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2 animate-fadeIn">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{linkedinNotice}</span>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 text-xs text-[#9AA0B2]">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Aucune donnée ne sera écrasée sans votre confirmation.</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#9AA0B2] text-xs font-semibold transition-all cursor-pointer"
                >
                  Annuler
                </button>

                <button
                  onClick={runAnalysisPipeline}
                  disabled={inputMode === 'file' ? !selectedFile : !pastedText.trim()}
                  className={`px-6 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 shadow-lg ${
                    (inputMode === 'file' ? selectedFile : pastedText.trim())
                      ? 'bg-[#D81A45] hover:bg-[#E62250] text-white shadow-[0_4px_20px_rgba(216,26,69,0.4)] cursor-pointer active:scale-95'
                      : 'bg-white/10 text-white/40 cursor-not-allowed'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Analyser mon CV</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: PROCESSING PIPELINE */}
        {step === 'processing' && (
          <div className="py-12 px-4 flex flex-col items-center justify-center text-center space-y-6">
            <div className="relative flex items-center justify-center">
              <div className="w-20 h-20 rounded-full border-4 border-white/10 border-t-[#D81A45] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-[#FF6685]">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>
            </div>

            <div className="space-y-2 max-w-md">
              <h3 className="text-lg font-bold text-[#F5F6FA]">
                Traitement et Extraction du CV
              </h3>
              <p className="text-xs text-[#9AA0B2]">
                L'IA analyse le contenu de votre CV et prépare la structure de votre profil NACORA.
              </p>
            </div>

            {/* Progress Log Box */}
            <div className="w-full max-w-md bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-left font-mono text-xs space-y-2 text-[#9AA0B2]">
              {progressLog.map((log, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={log.startsWith('✓') ? 'text-emerald-400 font-bold' : log.startsWith('●') ? 'text-[#FF6685] font-bold animate-pulse' : ''}>
                    {log}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: PREVIEW & MERGE COMPARISON */}
        {step === 'preview' && proposal && (
          <div className="mt-6 space-y-6">
            {/* Header Metrics Summary Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-white/[0.04] to-white/[0.02] border border-emerald-500/30 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#F5F6FA]">Analyse du CV terminée</h4>
                  <p className="text-xs text-[#9AA0B2]">
                    {proposal.stats.newItemsCount} nouvel{proposal.stats.newItemsCount > 1 ? 's' : ''} élément{proposal.stats.newItemsCount > 1 ? 's' : ''} prêt{proposal.stats.newItemsCount > 1 ? 's' : ''} à être fusionné{proposal.stats.newItemsCount > 1 ? 's' : ''} • {proposal.stats.duplicateCount} correspondance{proposal.stats.duplicateCount > 1 ? 's' : ''} détectée{proposal.stats.duplicateCount > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Stats badges */}
              <div className="flex items-center gap-2 text-xs">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  +{proposal.stats.newItemsCount} Nouveaux
                </span>
                {proposal.stats.duplicateCount > 0 && (
                  <span className="px-3 py-1 rounded-full bg-white/10 text-white/70 font-medium border border-white/15">
                    {proposal.stats.duplicateCount} Déjà présents
                  </span>
                )}
              </div>
            </div>

            {/* Category Navigation Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-white/10 text-xs">
              <button
                onClick={() => setActivePreviewTab('experiences')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition-all shrink-0 cursor-pointer ${
                  activePreviewTab === 'experiences'
                    ? 'bg-[#D81A45] text-white'
                    : 'bg-white/5 text-[#9AA0B2] hover:text-white'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Expériences ({proposal.experiences.length})</span>
              </button>

              <button
                onClick={() => setActivePreviewTab('formations')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition-all shrink-0 cursor-pointer ${
                  activePreviewTab === 'formations'
                    ? 'bg-[#D81A45] text-white'
                    : 'bg-white/5 text-[#9AA0B2] hover:text-white'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Formations ({proposal.educations.length})</span>
              </button>

              <button
                onClick={() => setActivePreviewTab('competences')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition-all shrink-0 cursor-pointer ${
                  activePreviewTab === 'competences'
                    ? 'bg-[#D81A45] text-white'
                    : 'bg-white/5 text-[#9AA0B2] hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Compétences & Outils ({proposal.hardSkills.length + proposal.toolsAndSoftware.length})</span>
              </button>

              <button
                onClick={() => setActivePreviewTab('langues_certs')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition-all shrink-0 cursor-pointer ${
                  activePreviewTab === 'langues_certs'
                    ? 'bg-[#D81A45] text-white'
                    : 'bg-white/5 text-[#9AA0B2] hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Langues & Certifications</span>
              </button>

              <button
                onClick={() => setActivePreviewTab('identite')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition-all shrink-0 cursor-pointer ${
                  activePreviewTab === 'identite'
                    ? 'bg-[#D81A45] text-white'
                    : 'bg-white/5 text-[#9AA0B2] hover:text-white'
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                <span>Identité & Profil</span>
              </button>
            </div>

            {/* TAB CONTENT: EXPERIENCES */}
            {activePreviewTab === 'experiences' && (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {proposal.experiences.length === 0 ? (
                  <p className="text-xs text-[#9AA0B2] py-6 text-center italic">Aucune expérience détectée dans ce document.</p>
                ) : (
                  proposal.experiences.map((itemStatus, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border transition-all ${
                        itemStatus.status === 'new'
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : itemStatus.status === 'enriched'
                          ? 'bg-purple-500/10 border-purple-500/30'
                          : 'bg-white/[0.02] border-white/10 opacity-80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h5 className="text-sm font-bold text-[#F5F6FA] flex items-center gap-2">
                            <span>{itemStatus.item.role}</span>
                            {itemStatus.item.contractType && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/10 text-[#9AA0B2]">
                                {itemStatus.item.contractType}
                              </span>
                            )}
                          </h5>
                          <p className="text-xs font-semibold text-[#FF6685]">{itemStatus.item.company}</p>
                        </div>

                        {itemStatus.status === 'new' ? (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider shrink-0">
                            + Nouvelle expérience
                          </span>
                        ) : itemStatus.status === 'enriched' ? (
                          <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold uppercase tracking-wider shrink-0 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-purple-400" />
                            Missions enrichies
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-white/10 text-white/60 border border-white/10 text-[10px] font-semibold shrink-0">
                            = Déjà présente
                          </span>
                        )}
                      </div>

                      {/* Missions Detail Bullets */}
                      {itemStatus.item.missions && itemStatus.item.missions.length > 0 ? (
                        <div className="mt-2.5 space-y-1 bg-black/20 p-3 rounded-xl border border-white/5">
                          <p className="text-[11px] font-bold text-[#F5F6FA] mb-1">Missions & Tâches extraites ({itemStatus.item.missions.length}) :</p>
                          <ul className="space-y-1 text-xs text-[#9AA0B2]">
                            {itemStatus.item.missions.map((m, mIdx) => (
                              <li key={mIdx} className="flex items-start gap-1.5 leading-relaxed">
                                <span className="text-[#FF6685] shrink-0 mt-0.5">•</span>
                                <span>{m}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : itemStatus.item.description ? (
                        <p className="text-xs text-[#9AA0B2] mt-1 line-clamp-3">{itemStatus.item.description}</p>
                      ) : null}

                      {/* KPI Chips */}
                      {itemStatus.item.kpis && itemStatus.item.kpis.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {itemStatus.item.kpis.map((kpi, kIdx) => (
                            <span key={kIdx} className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-medium flex items-center gap-1">
                              <span>📊</span>
                              <span>{kpi}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB CONTENT: FORMATIONS */}
            {activePreviewTab === 'formations' && (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {proposal.educations.length === 0 ? (
                  <p className="text-xs text-[#9AA0B2] py-6 text-center italic">Aucune formation détectée.</p>
                ) : (
                  proposal.educations.map((itemStatus, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border transition-all ${
                        itemStatus.status === 'new'
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : 'bg-white/[0.02] border-white/10 opacity-80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div>
                          <h5 className="text-sm font-bold text-[#F5F6FA]">{itemStatus.item.degree}</h5>
                          <p className="text-xs text-[#9AA0B2]">{itemStatus.item.school}</p>
                        </div>

                        {itemStatus.status === 'new' ? (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider shrink-0">
                            + Nouvelle donnée
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-white/10 text-white/60 border border-white/10 text-[10px] font-semibold shrink-0">
                            = Déjà présente
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB CONTENT: COMPETENCES */}
            {activePreviewTab === 'competences' && (
              <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                <div>
                  <h5 className="text-xs font-semibold text-[#9AA0B2] uppercase tracking-wider mb-2">Compétences clés</h5>
                  <div className="flex flex-wrap gap-2">
                    {proposal.hardSkills.map((sk, idx) => (
                      <span
                        key={idx}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-medium ${
                          sk.status === 'new'
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                            : 'bg-white/5 border-white/10 text-white/60'
                        }`}
                      >
                        {sk.item.name} {sk.status === 'new' && '✨'}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-semibold text-[#9AA0B2] uppercase tracking-wider mb-2">Outils & Logiciels</h5>
                  <div className="flex flex-wrap gap-2">
                    {proposal.toolsAndSoftware.map((tool, idx) => (
                      <span
                        key={idx}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-medium ${
                          tool.status === 'new'
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                            : 'bg-white/5 border-white/10 text-white/60'
                        }`}
                      >
                        {tool.item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: LANGUES & CERTS */}
            {activePreviewTab === 'langues_certs' && (
              <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                <div>
                  <h5 className="text-xs font-semibold text-[#9AA0B2] uppercase tracking-wider mb-2">Langues</h5>
                  <div className="space-y-2">
                    {proposal.languages.map((l, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
                        <span className="font-bold text-[#F5F6FA]">{l.item.language}</span>
                        <span className="text-[#9AA0B2]">{l.item.level} {l.item.score && `(${l.item.score})`}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-semibold text-[#9AA0B2] uppercase tracking-wider mb-2">Certifications & Tests de Langue / Gestion</h5>
                  <div className="space-y-2">
                    {proposal.certifications.length === 0 ? (
                      <p className="text-xs text-[#9AA0B2] italic">Aucune certification détectée.</p>
                    ) : (
                      proposal.certifications.map((c, idx) => (
                        <div key={idx} className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div>
                            <span className="font-bold text-[#F5F6FA] block">{c.item.name}</span>
                            <span className="text-[#9AA0B2]">{c.item.issuer || "Organisme non spécifié"} {c.item.date && `• ${c.item.date}`}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {c.item.score && (
                              <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold">
                                Score : {c.item.score} {c.item.maxScore && `/ ${c.item.maxScore}`} {c.item.level && `(${c.item.level})`}
                              </span>
                            )}
                            {c.status === 'new' ? (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                                + Nouveau
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/60 text-[10px]">
                                Existant
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: IDENTITE */}
            {activePreviewTab === 'identite' && (
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[#9AA0B2]">Titre professionnel détecté :</span>
                    <p className="font-semibold text-[#F5F6FA]">{proposal.identity.detected.title || "Non spécifié"}</p>
                  </div>
                  <div>
                    <span className="text-[#9AA0B2]">Email / Téléphone :</span>
                    <p className="font-semibold text-[#F5F6FA]">{proposal.identity.detected.email || existingProfile.email} • {proposal.identity.detected.phone || existingProfile.phone}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Merge Strategy Choice */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <label className="text-xs font-bold text-[#F5F6FA] block">Stratégie de fusion :</label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <button
                  onClick={() => setMergeStrategy('merge')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    mergeStrategy === 'merge'
                      ? 'bg-[#D81A45]/15 border-[#D81A45] text-white shadow-[0_2px_12px_rgba(216,26,69,0.3)]'
                      : 'bg-white/5 border-white/10 text-[#9AA0B2] hover:text-white'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <Layers className="w-3.5 h-3.5 text-[#FF6685]" />
                    <span>Fusion intelligente (Recommandé)</span>
                  </div>
                  <p className="text-[11px] text-[#9AA0B2]">
                    Conserve vos données existantes, ajoute les nouveaux éléments et enrichit les champs manquants.
                  </p>
                </button>

                <button
                  onClick={() => setMergeStrategy('add_new_only')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    mergeStrategy === 'add_new_only'
                      ? 'bg-[#D81A45]/15 border-[#D81A45] text-white shadow-[0_2px_12px_rgba(216,26,69,0.3)]'
                      : 'bg-white/5 border-white/10 text-[#9AA0B2] hover:text-white'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <Zap className="w-3.5 h-3.5 text-[#C084FC]" />
                    <span>Ajouter uniquement le nouveau</span>
                  </div>
                  <p className="text-[11px] text-[#9AA0B2]">
                    Ajoute uniquement les éléments strictement absents sans toucher à l'identité existante.
                  </p>
                </button>
              </div>
            </div>

            {/* Bottom Modal Confirmation Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <button
                onClick={resetModalState}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#9AA0B2] text-xs font-semibold transition-all cursor-pointer flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Recommencer</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#9AA0B2] text-xs font-semibold transition-all cursor-pointer"
                >
                  Annuler
                </button>

                <button
                  onClick={handleConfirmMerge}
                  className="px-6 py-2.5 rounded-xl bg-[#D81A45] hover:bg-[#E62250] text-white text-xs font-semibold shadow-[0_4px_20px_rgba(216,26,69,0.4)] transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirmer et fusionner avec mon profil</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
