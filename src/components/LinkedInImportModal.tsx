import React, { useState, useRef } from "react";
import { CandidateProfile, Contact, ContactCategory } from "../types";
import { dbStore } from "../dbStore";
import { GlassButton, Badge } from "./Shared";
import { 
  extractLinkedInContacts, 
  detectDuplicates, 
  LinkedInContactCandidate 
} from "../utils/linkedInCsvParser";
import { 
  Upload, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  Search, 
  Filter, 
  X, 
  FileSpreadsheet, 
  RefreshCw, 
  UserCheck, 
  GraduationCap, 
  Briefcase, 
  Building2, 
  Layers, 
  ArrowRight, 
  Check, 
  ChevronDown,
  Info
} from "lucide-react";

interface LinkedInImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateProfile: CandidateProfile;
  showToast: (message: string, type: "success" | "error" | "info" | "ai") => void;
}

type ImportStep = "upload" | "processing" | "preview" | "done";

export const LinkedInImportModal: React.FC<LinkedInImportModalProps> = ({
  isOpen,
  onClose,
  candidateProfile,
  showToast
}) => {
  const [step, setStep] = useState<ImportStep>("upload");
  const [inputMode, setInputMode] = useState<"file" | "paste">("file");
  const [pastedText, setPastedText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Analysis progress
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");

  // Processed candidate contacts
  const [candidates, setCandidates] = useState<LinkedInContactCandidate[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [duplicateFilter, setDuplicateFilter] = useState<boolean | null>(null);

  // Stats after import
  const [importSummary, setImportSummary] = useState<{
    added: number;
    updated: number;
    skipped: number;
  }>({ added: 0, updated: 0, skipped: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setStep("upload");
    setInputMode("file");
    setPastedText("");
    setFileName(null);
    setFileSize(null);
    setProgressPercent(0);
    setCurrentBatchIndex(0);
    setTotalBatches(0);
    setProcessedCount(0);
    setTotalCount(0);
    setCandidates([]);
    setSearchFilter("");
    setCategoryFilter("all");
    setDuplicateFilter(null);
    setImportSummary({ added: 0, updated: 0, skipped: 0 });
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Handle file reading
  const processRawCsvContent = async (rawCsv: string, name = "Connections.csv") => {
    if (!rawCsv.trim()) {
      showToast("Le fichier CSV est vide.", "error");
      return;
    }

    const rawRows = extractLinkedInContacts(rawCsv);
    if (rawRows.length === 0) {
      showToast("Aucun contact valide détecté dans le fichier. Vérifiez le format.", "error");
      return;
    }

    const existingContacts = dbStore.getContacts();
    const initialCandidates = detectDuplicates(rawRows, existingContacts);

    setCandidates(initialCandidates);
    setTotalCount(initialCandidates.length);
    setStep("processing");

    // Launch batch analysis with Gemini
    await runBatchAnalysis(initialCandidates);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileSize(`${(file.size / 1024).toFixed(1)} KB`);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processRawCsvContent(content, file.name);
    };
    reader.onerror = () => {
      showToast("Erreur lors de la lecture du fichier", "error");
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileSize(`${(file.size / 1024).toFixed(1)} KB`);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processRawCsvContent(content, file.name);
    };
    reader.onerror = () => {
      showToast("Erreur lors de la lecture du fichier", "error");
    };
    reader.readAsText(file);
  };

  const handlePasteSubmit = () => {
    if (!pastedText.trim()) {
      showToast("Veuillez coller les données CSV dans la zone de texte.", "error");
      return;
    }
    processRawCsvContent(pastedText, "Données_LinkedIn_Collees.csv");
  };

  // Batch analysis engine
  const runBatchAnalysis = async (allCandidates: LinkedInContactCandidate[]) => {
    const BATCH_SIZE = 25;
    const batches: LinkedInContactCandidate[][] = [];
    for (let i = 0; i < allCandidates.length; i += BATCH_SIZE) {
      batches.push(allCandidates.slice(i, i + BATCH_SIZE));
    }

    setTotalBatches(batches.length);
    setStatusMessage("Initialisation de l'analyse sémantique...");

    const enrichedCandidates: LinkedInContactCandidate[] = [...allCandidates];

    for (let bIdx = 0; bIdx < batches.length; bIdx++) {
      setCurrentBatchIndex(bIdx + 1);
      const currentBatch = batches[bIdx];
      const startIdx = bIdx * BATCH_SIZE;

      setStatusMessage(`Analyse du lot ${bIdx + 1} / ${batches.length} (${Math.min(startIdx + BATCH_SIZE, allCandidates.length)} / ${allCandidates.length} contacts)...`);

      try {
        const rawPayload = currentBatch.map(c => ({
          fullName: c.fullName,
          jobTitle: c.position || "Professionnel",
          companyName: c.company || "À préciser"
        }));

        const response = await fetch("/api/gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "analyzeLinkedIn",
            payload: {
              rawContacts: rawPayload,
              profile: candidateProfile
            }
          })
        });

        if (response.ok) {
          const analyzedBatch = await response.json();
          if (Array.isArray(analyzedBatch)) {
            analyzedBatch.forEach((item: any, itemIdx: number) => {
              const globalIdx = startIdx + itemIdx;
              if (enrichedCandidates[globalIdx]) {
                enrichedCandidates[globalIdx] = {
                  ...enrichedCandidates[globalIdx],
                  normalizedJobTitle: item.normalizedJobTitle || enrichedCandidates[globalIdx].position,
                  category: item.category || "other",
                  relevanceScore: typeof item.relevanceScore === "number" ? item.relevanceScore : 50,
                  connectionPoints: Array.isArray(item.connectionPoints) && item.connectionPoints.length > 0 
                    ? item.connectionPoints 
                    : ["Importé via LinkedIn"],
                  academicPath: item.academicPath || "",
                  previousCompanies: item.previousCompanies || []
                };
              }
            });
          }
        }
      } catch (err) {
        console.warn(`[LinkedIn Import] Erreur batch ${bIdx + 1}, conservation des heuristiques:`, err);
      }

      setProcessedCount(Math.min((bIdx + 1) * BATCH_SIZE, allCandidates.length));
      setProgressPercent(Math.round(((bIdx + 1) / batches.length) * 100));

      if (bIdx < batches.length - 1) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    setCandidates(enrichedCandidates);
    setStep("preview");
    showToast(`${enrichedCandidates.length} contacts LinkedIn analysés et classés avec succès !`, "success");
  };

  // Duplicate resolution controls
  const handleBulkDuplicateAction = (action: 'update' | 'skip' | 'create_new') => {
    setCandidates(prev => prev.map(c => c.isDuplicate ? { ...c, duplicateAction: action } : c));
    showToast(`Action des doublons appliquée : ${action === 'update' ? 'Mettre à jour' : action === 'skip' ? 'Ignorer' : 'Créer nouveau'}`, "info");
  };

  const handleSelectAll = (select: boolean) => {
    setCandidates(prev => prev.map(c => ({ ...c, selected: select })));
  };

  const handleSelectNewOnly = () => {
    setCandidates(prev => prev.map(c => ({ ...c, selected: !c.isDuplicate })));
  };

  const toggleCandidateSelection = (id: string) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c));
  };

  const updateCandidateCategory = (id: string, category: ContactCategory) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, category } : c));
  };

  const updateCandidateJob = (id: string, normalizedJobTitle: string) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, normalizedJobTitle } : c));
  };

  const updateCandidateDuplicateAction = (id: string, action: 'update' | 'skip' | 'create_new') => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, duplicateAction: action } : c));
  };

  // Perform Final Database Import
  const handleExecuteImport = () => {
    const selectedContacts = candidates.filter(c => c.selected);
    if (selectedContacts.length === 0) {
      showToast("Aucun contact sélectionné pour l'import.", "error");
      return;
    }

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    selectedContacts.forEach(item => {
      if (item.isDuplicate && item.duplicateAction === "skip") {
        skippedCount++;
        return;
      }

      // Link or create company
      const companyName = item.company || "Entreprise non spécifiée";
      const linkedCo = dbStore.getCompanyByNameOrCreate(companyName);

      if (item.isDuplicate && item.duplicateAction === "update" && item.existingContactId) {
        // Update existing contact
        const existing = dbStore.getContacts().find(c => c.id === item.existingContactId);
        if (existing) {
          const updatedContact: Contact = {
            ...existing,
            jobTitle: item.position || existing.jobTitle,
            normalizedJobTitle: item.normalizedJobTitle || item.position || existing.normalizedJobTitle,
            companyId: linkedCo.id,
            companyName: linkedCo.name,
            category: item.category || existing.category,
            relevanceScore: item.relevanceScore || existing.relevanceScore,
            connectionPoints: Array.from(new Set([...(existing.connectionPoints || []), ...(item.connectionPoints || [])])),
            email: item.email || existing.email,
            linkedInUrl: item.url || existing.linkedInUrl,
            academicPath: item.academicPath || existing.academicPath,
            notes: existing.notes ? `${existing.notes} | Actualisé via import LinkedIn (${new Date().toLocaleDateString('fr-FR')})` : "Importé et mis à jour via LinkedIn."
          };
          dbStore.updateContact(updatedContact);
          updatedCount++;
          return;
        }
      }

      // Create new contact
      dbStore.addContact({
        fullName: item.fullName,
        firstName: item.firstName || item.fullName.split(" ")[0] || "Inconnu",
        lastName: item.lastName || item.fullName.split(" ").slice(1).join(" ") || "",
        companyId: linkedCo.id,
        companyName: linkedCo.name,
        jobTitle: item.position || "Professionnel",
        normalizedJobTitle: item.normalizedJobTitle || item.position || "Professionnel",
        category: item.category || "other",
        relevanceScore: item.relevanceScore || 50,
        connectionPoints: item.connectionPoints || ["Importé via LinkedIn"],
        academicPath: item.academicPath || "",
        previousCompanies: item.previousCompanies || [],
        email: item.email || undefined,
        linkedInUrl: item.url || undefined,
        notes: `Importé via l'export LinkedIn officiel (${new Date().toLocaleDateString('fr-FR')}).`
      });
      addedCount++;
    });

    setImportSummary({ added: addedCount, updated: updatedCount, skipped: skippedCount });
    setStep("done");
    showToast(`Import terminé : ${addedCount} créés, ${updatedCount} mis à jour !`, "success");
  };

  // Filtered list for preview
  const filteredCandidates = candidates.filter(c => {
    // Text search
    const q = searchFilter.toLowerCase();
    const matchesSearch = !q || 
      c.fullName.toLowerCase().includes(q) || 
      c.company.toLowerCase().includes(q) || 
      (c.position && c.position.toLowerCase().includes(q)) ||
      (c.normalizedJobTitle && c.normalizedJobTitle.toLowerCase().includes(q));

    // Category filter
    const matchesCategory = categoryFilter === "all" || c.category === categoryFilter;

    // Duplicate filter
    const matchesDuplicate = duplicateFilter === null || c.isDuplicate === duplicateFilter;

    return matchesSearch && matchesCategory && matchesDuplicate;
  });

  // Calculate statistics for UI badges
  const totalDetected = candidates.length;
  const totalDuplicates = candidates.filter(c => c.isDuplicate).length;
  const totalNew = totalDetected - totalDuplicates;
  const totalAlumni = candidates.filter(c => c.category === "alumni").length;
  const totalRecruiters = candidates.filter(c => c.category === "recruiter").length;
  const totalSectorPros = candidates.filter(c => c.category === "sector_pro").length;
  const totalSelected = candidates.filter(c => c.selected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 pointer-events-auto">
      {/* Background Overlay - Translucent Liquid Backdrop */}
      <div 
        className="fixed inset-0 bg-[#060812]/60 backdrop-blur-md transition-opacity duration-300"
        onClick={handleClose}
      />

      {/* Modal Container: 75-85% width, max-h-[86vh], Centered, Liquid Glass */}
      <div className="relative w-[94%] sm:w-[84%] max-w-4xl max-h-[86vh] flex flex-col glass-modal overflow-hidden transition-all duration-300 z-10 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85)] border border-white/14">
        {/* Header - Fixed & Compact */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-white/10 bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[rgba(216,26,69,0.18)] border border-[rgba(216,26,69,0.35)] flex items-center justify-center text-[#ff6685] shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-[#F5F6FA] font-display truncate">
                Importation des connexions LinkedIn
              </h3>
              <p className="text-xs text-[#9AA0B2] truncate mt-0.5">
                {step === "upload" && "Importez votre fichier officiel Connections.csv de LinkedIn"}
                {step === "processing" && "Analyse des contacts en cours…"}
                {step === "preview" && "Vérifiez la liste des contacts et confirmez l'importation"}
                {step === "done" && "Importation finalisée dans votre espace réseau"}
              </p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#9AA0B2] hover:text-[#F5F6FA] border border-white/10 transition-spring cursor-pointer shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body - Scrollable Content Only */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
          {/* STEP 1: UPLOAD & DROP */}
          {step === "upload" && (
            <div className="space-y-4">
              {/* Instructions Guide */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#F5F6FA] uppercase tracking-wider">
                  <Info className="w-3.5 h-3.5 text-[#ff6685]" />
                  Comment obtenir votre fichier d'export LinkedIn :
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs text-[#9AA0B2]">
                  <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 space-y-0.5">
                    <span className="font-bold text-[#F5F6FA] text-[11px]">1. Réseau LinkedIn</span>
                    <p className="text-[11px] leading-snug">Rendez-vous sur LinkedIn &gt; Onglet <strong>Réseau</strong> &gt; <strong>Contacts</strong>.</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 space-y-0.5">
                    <span className="font-bold text-[#F5F6FA] text-[11px]">2. Exporter les données</span>
                    <p className="text-[11px] leading-snug">Cliquez sur <strong>Gérer mes contacts</strong> &gt; <strong>Exporter</strong>.</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 space-y-0.5">
                    <span className="font-bold text-[#F5F6FA] text-[11px]">3. Déposer le CSV</span>
                    <p className="text-[11px] leading-snug">Téléchargez l'archive et déposez <strong>Connections.csv</strong> ici.</p>
                  </div>
                </div>
              </div>

              {/* Mode Switcher */}
              <div className="flex items-center gap-2 p-1 bg-white/[0.03] rounded-xl border border-white/10 w-fit">
                <button
                  type="button"
                  onClick={() => setInputMode("file")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-spring cursor-pointer flex items-center gap-1.5 ${
                    inputMode === "file" 
                      ? "bg-white/15 text-[#F5F6FA] shadow-sm" 
                      : "text-[#9AA0B2] hover:text-[#F5F6FA]"
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Fichier Connections.csv
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("paste")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-spring cursor-pointer flex items-center gap-1.5 ${
                    inputMode === "paste" 
                      ? "bg-white/15 text-[#F5F6FA] shadow-sm" 
                      : "text-[#9AA0B2] hover:text-[#F5F6FA]"
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Copier-coller le texte CSV
                </button>
              </div>

              {/* Upload Zone */}
              {inputMode === "file" ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                    isDragging
                      ? "border-[#ff6685] bg-[rgba(216,26,69,0.08)] scale-[1.01]"
                      : "border-white/15 hover:border-white/30 bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".csv,.txt"
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-[#ff6685] shadow-inner">
                    <Upload className="w-6 h-6 animate-bounce" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm sm:text-base font-bold text-[#F5F6FA]">
                      Glissez et déposez votre fichier Connections.csv
                    </h4>
                    <p className="text-xs text-[#9AA0B2]">
                      ou cliquez pour parcourir vos fichiers (.csv ou .txt)
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-[#9AA0B2] bg-black/40 px-3 py-0.5 rounded-full border border-white/5">
                    <span>Compatible exports LinkedIn anglais & français</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder={`First Name,Last Name,URL,Email Address,Company,Position,Connected On\nSophie,Martin,https://www.linkedin.com/in/sophie-martin,sophie.martin@lcl.fr,LCL,Conseillère en Gestion de Patrimoine,14 May 2024\nMarc,Albaric,,marc.albaric@lcl.fr,LCL,Responsable Recrutement,18 May 2024`}
                    className="w-full min-h-[160px] max-h-[220px] glass-input p-3.5 text-xs font-mono text-[#F5F6FA] placeholder-[#9AA0B2]/50 leading-relaxed"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#9AA0B2]">
                      {pastedText ? `${pastedText.split('\n').filter(l => l.trim()).length} lignes saisies` : "Collez le contenu brut de votre fichier CSV"}
                    </span>
                    <GlassButton 
                      variant="primary" 
                      size="md" 
                      onClick={handlePasteSubmit}
                      icon={<ArrowRight className="w-4 h-4 text-white" />}
                    >
                      Analyser les contacts
                    </GlassButton>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: PROCESSING / BATCH PROGRESS */}
          {step === "processing" && (
            <div className="py-4 px-2 flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-[rgba(216,26,69,0.14)] border border-[rgba(216,26,69,0.3)] flex items-center justify-center text-[#ff6685] shadow-[0_0_20px_rgba(216,26,69,0.2)]">
                  <FileSpreadsheet className="w-6 h-6 text-[#ff6685]" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-lg bg-[#060812] border border-white/20 flex items-center justify-center">
                  <RefreshCw className="w-3 h-3 text-[#38bdf8] animate-spin" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-[#F5F6FA] font-display">
                  Analyse des contacts en cours…
                </h3>
                <p className="text-xs text-[#9AA0B2] font-medium">
                  {statusMessage || `Analyse du lot ${currentBatchIndex} sur ${totalBatches || 1}`}
                </p>
              </div>

              {/* Progress Bar - Liquid Bar */}
              <div className="w-full space-y-2">
                <div className="w-full h-2.5 rounded-full bg-white/[0.06] border border-white/10 overflow-hidden p-0.5">
                  <div 
                    className="h-full rounded-full liquid-bar transition-all duration-300"
                    style={{ width: `${Math.max(progressPercent, 5)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#9AA0B2]">
                  <span className="text-[#F5F6FA]">Lot {currentBatchIndex} sur {totalBatches || 1}</span>
                  <span>{processedCount} / {totalCount} contacts analysés</span>
                  <span className="text-[#FF6685] font-bold">{progressPercent}%</span>
                </div>
              </div>

              {/* Sober Informative Card */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-left w-full space-y-2">
                <span className="text-xs font-semibold text-[#F5F6FA] flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-[#ff6685]" />
                  Vérifications en cours :
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-[#9AA0B2]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff6685]" />
                    <span>Normalisation des informations</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
                    <span>Détection des Alumni</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#12B76A]" />
                    <span>Identification des profils pertinents</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f79009]" />
                    <span>Vérification des doublons</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW & CUSTOMIZATION */}
          {step === "preview" && (
            <div className="space-y-4">
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-0.5">
                  <span className="text-[10px] text-[#9AA0B2] uppercase font-semibold">Total détectés</span>
                  <p className="text-lg font-bold text-[#F5F6FA] font-display">{totalDetected}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-0.5">
                  <span className="text-[10px] text-[#12B76A] uppercase font-semibold">Nouveaux contacts</span>
                  <p className="text-lg font-bold text-[#12B76A] font-display">+{totalNew}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-0.5">
                  <span className="text-[10px] text-[#F79009] uppercase font-semibold">Doublons détectés</span>
                  <p className="text-lg font-bold text-[#F79009] font-display">{totalDuplicates}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-0.5">
                  <span className="text-[10px] text-[#38bdf8] uppercase font-semibold">Alumni</span>
                  <p className="text-lg font-bold text-[#38bdf8] font-display">{totalAlumni}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-0.5">
                  <span className="text-[10px] text-[#F5F6FA] uppercase font-semibold">Recruteurs RH</span>
                  <p className="text-lg font-bold text-[#F5F6FA] font-display">{totalRecruiters}</p>
                </div>
              </div>

              {/* Bulk Controls & Global Duplicate Selector */}
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAll(true)}
                    className="text-xs text-[#F5F6FA] hover:text-white px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer font-medium"
                  >
                    Tout sélectionner ({totalDetected})
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectNewOnly}
                    className="text-xs text-[#12B76A] hover:text-emerald-300 px-2.5 py-1 rounded-lg bg-emerald-950/30 hover:bg-emerald-950/50 border border-emerald-500/30 cursor-pointer font-medium"
                  >
                    Nouveaux uniquement ({totalNew})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectAll(false)}
                    className="text-xs text-[#9AA0B2] hover:text-[#F5F6FA] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer"
                  >
                    Désélectionner tout
                  </button>
                </div>

                {totalDuplicates > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[#9AA0B2] font-semibold whitespace-nowrap">Action doublons :</span>
                    <select
                      onChange={(e) => handleBulkDuplicateAction(e.target.value as any)}
                      defaultValue="update"
                      className="glass-input px-2.5 py-1 text-xs text-[#F5F6FA] bg-[#060812] border-white/15"
                    >
                      <option value="update" className="bg-[#060812] text-[#F5F6FA]">Mettre à jour l'existant</option>
                      <option value="skip" className="bg-[#060812] text-[#F5F6FA]">Ignorer les doublons</option>
                      <option value="create_new" className="bg-[#060812] text-[#F5F6FA]">Importer comme nouveau</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Search & Category Filter Pills */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-[#9AA0B2] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Filtrer par nom, poste, entreprise..."
                    className="w-full glass-input pl-8 pr-3 py-1.5 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
                  />
                  {searchFilter && (
                    <button 
                      onClick={() => setSearchFilter("")} 
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9AA0B2] hover:text-[#F5F6FA]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 shrink-0">
                  <button
                    type="button"
                    onClick={() => { setCategoryFilter("all"); setDuplicateFilter(null); }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-spring ${
                      categoryFilter === "all" && duplicateFilter === null
                        ? "bg-[#D81A45] text-white shadow-[0_0_12px_rgba(216,26,69,0.3)]"
                        : "bg-white/[0.04] text-[#9AA0B2] hover:text-[#F5F6FA] border border-white/10"
                    }`}
                  >
                    Tous ({totalDetected})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCategoryFilter("alumni"); setDuplicateFilter(null); }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-spring ${
                      categoryFilter === "alumni"
                        ? "bg-[rgba(14,165,233,0.2)] text-[#38bdf8] border border-[#38bdf8]/40"
                        : "bg-white/[0.04] text-[#9AA0B2] hover:text-[#F5F6FA] border border-white/10"
                    }`}
                  >
                    Alumni ({totalAlumni})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCategoryFilter("recruiter"); setDuplicateFilter(null); }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-spring ${
                      categoryFilter === "recruiter"
                        ? "bg-[rgba(18,183,106,0.2)] text-[#12B76A] border border-[#12B76A]/40"
                        : "bg-white/[0.04] text-[#9AA0B2] hover:text-[#F5F6FA] border border-white/10"
                    }`}
                  >
                    Recruteurs ({totalRecruiters})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCategoryFilter("sector_pro"); setDuplicateFilter(null); }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-spring ${
                      categoryFilter === "sector_pro"
                        ? "bg-[rgba(247,144,9,0.2)] text-[#f79009] border border-[#f79009]/40"
                        : "bg-white/[0.04] text-[#9AA0B2] hover:text-[#F5F6FA] border border-white/10"
                    }`}
                  >
                    Pro Secteur ({totalSectorPros})
                  </button>
                  {totalDuplicates > 0 && (
                    <button
                      type="button"
                      onClick={() => { setDuplicateFilter(true); setCategoryFilter("all"); }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-spring ${
                        duplicateFilter === true
                          ? "bg-[rgba(247,144,9,0.2)] text-[#f79009] border border-[#f79009]/40"
                          : "bg-white/[0.04] text-[#9AA0B2] hover:text-[#F5F6FA] border border-white/10"
                      }`}
                    >
                      Doublons ({totalDuplicates})
                    </button>
                  )}
                </div>
              </div>

              {/* List of Candidate Cards */}
              <div className="space-y-2.5">
                {filteredCandidates.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#9AA0B2] bg-white/[0.02] rounded-xl border border-white/5">
                    Aucun contact ne correspond aux filtres sélectionnés.
                  </div>
                ) : (
                  filteredCandidates.map(candidate => (
                    <div
                      key={candidate.id}
                      className={`p-3 sm:p-3.5 rounded-xl border transition-all ${
                        candidate.selected 
                          ? "bg-white/[0.04] border-white/15 shadow-sm" 
                          : "bg-black/20 border-white/5 opacity-60"
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                        {/* Left: Checkbox + Name + Details */}
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={candidate.selected}
                            onChange={() => toggleCandidateSelection(candidate.id)}
                            className="mt-1 w-4 h-4 rounded border-white/20 bg-white/5 text-[#D81A45] focus:ring-0 cursor-pointer shrink-0"
                          />

                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs sm:text-sm font-bold text-[#F5F6FA] font-display truncate">
                                {candidate.fullName}
                              </span>

                              {candidate.isDuplicate ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#F79009] bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-full">
                                  <AlertCircle className="w-2.5 h-2.5" />
                                  Doublon : {candidate.duplicateMatchReason || "Déjà en base"}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#12B76A] bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                  <CheckCircle className="w-2.5 h-2.5" />
                                  Nouveau
                                </span>
                              )}

                              <span className="text-[10px] font-bold text-[#9AA0B2] bg-black/40 px-2 py-0.5 rounded-full border border-white/5">
                                Score : {candidate.relevanceScore || 50}%
                              </span>
                            </div>

                            {/* Job & Company Input Fields */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                              <div className="flex items-center gap-1.5 text-xs text-[#9AA0B2]">
                                <Briefcase className="w-3 h-3 text-[#ff6685] shrink-0" />
                                <input
                                  type="text"
                                  value={candidate.normalizedJobTitle || candidate.position || ""}
                                  onChange={(e) => updateCandidateJob(candidate.id, e.target.value)}
                                  className="w-full glass-input px-2 py-0.5 text-xs text-[#F5F6FA] border-white/10"
                                  placeholder="Poste normalisé"
                                />
                              </div>

                              <div className="flex items-center gap-1.5 text-xs text-[#9AA0B2]">
                                <Building2 className="w-3 h-3 text-[#ff6685] shrink-0" />
                                <span className="text-xs font-semibold text-[#F5F6FA] truncate">
                                  {candidate.company || "Entreprise non spécifiée"}
                                </span>
                              </div>
                            </div>

                            {/* Connection Points Badges */}
                            {candidate.connectionPoints && candidate.connectionPoints.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                {candidate.connectionPoints.map((pt, pIdx) => (
                                  <span key={pIdx} className="text-[10px] text-[#9AA0B2] bg-white/[0.04] border border-white/10 px-2 py-0.5 rounded-md flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff6685] shrink-0" />
                                    <span>{pt}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: Category Selector & Duplicate Resolution Dropdown */}
                        <div className="flex flex-row md:flex-col items-end justify-between gap-1.5 shrink-0 pt-1.5 md:pt-0 border-t md:border-t-0 border-white/10">
                          {/* Category select */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-[#9AA0B2] hidden md:inline">Catégorie :</span>
                            <select
                              value={candidate.category || "other"}
                              onChange={(e) => updateCandidateCategory(candidate.id, e.target.value as ContactCategory)}
                              className="glass-input px-2 py-0.5 text-xs text-[#F5F6FA] bg-[#060812] border-white/15"
                            >
                              <option value="recruiter" className="bg-[#060812] text-[#F5F6FA]">Recruteur / RH</option>
                              <option value="alumni" className="bg-[#060812] text-[#F5F6FA]">Alumni</option>
                              <option value="student" className="bg-[#060812] text-[#F5F6FA]">Étudiant</option>
                              <option value="sector_pro" className="bg-[#060812] text-[#F5F6FA]">Pro Secteur Cible</option>
                              <option value="other_pro" className="bg-[#060812] text-[#F5F6FA]">Pro Autre Secteur</option>
                              <option value="other" className="bg-[#060812] text-[#F5F6FA]">Autre</option>
                            </select>
                          </div>

                          {/* Duplicate action selector */}
                          {candidate.isDuplicate && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-[#F79009] hidden md:inline">Doublon :</span>
                              <select
                                value={candidate.duplicateAction}
                                onChange={(e) => updateCandidateDuplicateAction(candidate.id, e.target.value as any)}
                                className="glass-input px-2 py-0.5 text-xs text-[#F79009] bg-[#060812] border-amber-500/30"
                              >
                                <option value="update" className="bg-[#060812] text-[#F5F6FA]">Mettre à jour existant</option>
                                <option value="skip" className="bg-[#060812] text-[#F5F6FA]">Ignorer</option>
                                <option value="create_new" className="bg-[#060812] text-[#F5F6FA]">Créer nouveau</option>
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* STEP 4: DONE */}
          {step === "done" && (
            <div className="py-6 px-4 text-center space-y-4 max-w-md mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-[#12B76A] flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(18,183,106,0.3)]">
                <Check className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-[#F5F6FA] font-display">
                  Importation terminée avec succès !
                </h3>
                <p className="text-xs text-[#9AA0B2]">
                  Vos contacts LinkedIn ont été intégrés à votre réseau NACORA et sont prêts pour les approches personnalisées.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-[#9AA0B2] uppercase">Créés</span>
                  <p className="text-base font-bold text-[#12B76A]">+{importSummary.added}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-[#9AA0B2] uppercase">Mis à jour</span>
                  <p className="text-base font-bold text-[#38bdf8]">{importSummary.updated}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-[#9AA0B2] uppercase">Ignorés</span>
                  <p className="text-base font-bold text-[#9AA0B2]">{importSummary.skipped}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer - Fixed & Compact */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3 border-t border-white/10 bg-white/[0.02] shrink-0">
          {step === "upload" && (
            <>
              <GlassButton variant="ghost" size="sm" onClick={handleClose}>
                Annuler
              </GlassButton>
              <div className="text-xs text-[#9AA0B2]">
                Glissez votre fichier pour démarrer
              </div>
            </>
          )}

          {step === "processing" && (
            <div className="w-full flex justify-center">
              <span className="text-xs text-[#9AA0B2] flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#ff6685]" />
                Veuillez patienter pendant l'analyse des contacts...
              </span>
            </div>
          )}

          {step === "preview" && (
            <>
              <GlassButton variant="ghost" size="sm" onClick={() => setStep("upload")}>
                Changer de fichier
              </GlassButton>

              <div className="flex items-center gap-3">
                <span className="text-xs text-[#9AA0B2]">
                  <strong>{totalSelected}</strong> contact(s) sélectionné(s)
                </span>
                <GlassButton
                  variant="primary"
                  size="sm"
                  disabled={totalSelected === 0}
                  onClick={handleExecuteImport}
                  icon={<CheckCircle className="w-3.5 h-3.5 text-white" />}
                >
                  Valider l'importation ({totalSelected})
                </GlassButton>
              </div>
            </>
          )}

          {step === "done" && (
            <div className="w-full flex justify-end">
              <GlassButton variant="primary" size="sm" onClick={handleClose}>
                Fermer & Explorer les contacts
              </GlassButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
