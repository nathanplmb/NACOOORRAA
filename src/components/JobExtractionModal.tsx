import React, { useState, useRef } from "react";
import { 
  Sparkles, 
  Upload, 
  FileText, 
  Globe, 
  Check, 
  X, 
  AlertCircle, 
  RefreshCw, 
  Code, 
  ArrowRight, 
  CheckCircle2, 
  Building2, 
  MapPin, 
  Clock, 
  Euro, 
  FileUp, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  ShieldCheck,
  Zap,
  Info,
  CalendarClock,
  Languages
} from "lucide-react";
import { Modal, GlassButton, Badge } from "./Shared";
import { 
  ExtractedJobOffer, 
  ExtractionResult, 
  calculateCompletenessScore 
} from "../api/jobExtractor";
import { dbStore } from "../dbStore";
import { Opportunity, OpportunityStatus, ExtractedJobInfo } from "../types";

interface JobExtractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (message: string, type: "success" | "error" | "info" | "ai") => void;
  initialText?: string;
  initialUrl?: string;
  existingOpportunity?: Opportunity | null;
  onSuccess?: (createdOpp: Opportunity) => void;
}

export const JobExtractionModal: React.FC<JobExtractionModalProps> = ({
  isOpen,
  onClose,
  showToast,
  initialText = "",
  initialUrl = "",
  existingOpportunity = null,
  onSuccess
}) => {
  // Step in the modal: "input" (choosing source) | "extracting" | "review" (editable form)
  const [step, setStep] = useState<"input" | "extracting" | "review">(
    initialText ? "input" : "input"
  );

  // Ingestion tabs
  const [ingestionTab, setIngestionTab] = useState<"text" | "file" | "url">("text");

  // Ingestion inputs
  const [rawText, setRawText] = useState(initialText);
  const [sourceUrl, setSourceUrl] = useState(initialUrl);
  const [fileLoading, setFileLoading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [urlScrapingError, setUrlScrapingError] = useState<string | null>(null);

  // Extraction results
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Editable Form State (initialized from extraction result)
  const [formOffer, setFormOffer] = useState<ExtractedJobOffer | null>(null);
  const [targetStatus, setTargetStatus] = useState<OpportunityStatus>(
    existingOpportunity ? existingOpportunity.status : "to_prepare"
  );

  // New item inputs for array fields
  const [newMission, setNewMission] = useState("");
  const [newRequiredSkill, setNewRequiredSkill] = useState("");
  const [newPreferredSkill, setNewPreferredSkill] = useState("");
  const [newTool, setNewTool] = useState("");
  const [newQuality, setNewQuality] = useState("");
  const [newBenefit, setNewBenefit] = useState("");
  const [newLanguageName, setNewLanguageName] = useState("");
  const [newLanguageLevel, setNewLanguageLevel] = useState("Courant");
  const [newStepDesc, setNewStepDesc] = useState("");
  const [newStepInterviewer, setNewStepInterviewer] = useState("");
  const [newStepDuration, setNewStepDuration] = useState("");
  const [newMetricLabel, setNewMetricLabel] = useState("");
  const [newMetricValue, setNewMetricValue] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when closing or opening
  const handleClose = () => {
    setStep("input");
    setRawText("");
    setSourceUrl("");
    setUploadedFileName(null);
    setUrlScrapingError(null);
    setExtractionResult(null);
    setFormOffer(null);
    setShowRawJson(false);
    onClose();
  };

  // --------------------------------------------------------------------------
  // INGESTION METHOD 1: Copier-coller de texte brut
  // --------------------------------------------------------------------------
  const handlePasteSample = (sampleType: "banque" | "gestion") => {
    if (sampleType === "banque") {
      setRawText(`Poste : Conseiller Clientèle Patrimoniale Junior (H/F)
Entreprise : Natixis Wealth Management
Groupe : Groupe BPCE
Localisation : Paris (75002) - Télétravail : 1 à 2 jours par semaine
Type de contrat : Alternance (Contrat d'apprentissage) - Durée : 12 à 24 mois
Rémunération : 1 450 € à 1 700 € / mois selon profil + Tickets restaurant + Remboursement 50% transports
Date limite de candidature : 15 Juin 2026

Missions principales :
- Accompagner une clientèle haut de gamme dans la structuration de leurs investissements financiers et immobiliers.
- Participer à la rédaction d'audits patrimoniaux complets et préparer les préconisations d'allocations d'actifs.
- Assurer la veille réglementaire fiscale et financière (assurance-vie, PEA, SCPI, fiscalité des plus-values).
- Collaborer activement avec les ingénieurs patrimoniaux et les banquiers privés seniors lors des comités d'investissement.

Profil recherché :
- En préparation d'un Bac+4 ou Bac+5 en Finance, Gestion de Patrimoine ou Banque d'Affaires.
- Solides connaissances en analyse financière, fiscalité des particuliers et mécanismes d'épargne.
- Aisance relationnelle, sens de l'écoute et rigueur analytique irréprochable.
- Outils : Maîtrise avancée d'Excel, PowerPoint, connaissance souhaitée de Bloomberg ou d'un CRM bancaire (Salesforce).
- Langues : Français courant requis, Anglais professionnel apprécié.

Avantages :
- Carte tickets restaurant Swile (10 € / jour pris en charge à 60%)
- Pass Navigo remboursé à 50%
- Accès aux formations internes de l'Académie BPCE et tuteur certifié AMF`);
    } else {
      setRawText(`Offre d'emploi : Assistant Conseiller en Gestion de Patrimoine
Entreprise : Crédit Agricole Centre France
Lieu : Clermont-Ferrand (63000)
Contrat : Alternance - 12 mois
Date de début : Septembre 2026
Gratification : 1350€ brut mensuel + intéressement

Descriptif des missions :
- Accueil et prise en charge des rendez-vous avec les sociétaires et clients patrimoniaux.
- Saisie et mise à jour des données patrimoniales dans le logiciel interne.
- Élaboration de propositions de défiscalisation et de diversification d'épargne.
- Participation aux opérations de prospection commerciale et phoning ciblé.

Compétences indispensables :
- Sens du service client et négociation commerciale
- Connaissance de la réglementation bancaire et des produits d'assurance-vie
- Maîtrise du pack Office

Diplôme souhaité : BUT TC, Licence Pro Banque ou Master 1 Finance.`);
    }
  };

  // --------------------------------------------------------------------------
  // INGESTION METHOD 2: Upload de fichier (PDF via pdfjs-dist, Word via mammoth)
  // --------------------------------------------------------------------------
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileLoading(true);
    setUploadedFileName(file.name);
    setUrlScrapingError(null);

    try {
      showToast(`Lecture et analyse du document ${file.name}...`, "info");

      // Read file as ArrayBuffer and convert to Base64 for server parsing
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );

      const response = await fetch("/api/parse-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Data: base64,
          fileName: file.name,
          fileType: file.type
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Échec de l'extraction du document");
      }

      setRawText(data.text);
      showToast(`Document "${file.name}" extrait avec succès (${data.text.length} caractères)`, "success");
      // Switch to text tab to show the extracted text to user
      setIngestionTab("text");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Erreur de lecture du fichier", "error");
      setUrlScrapingError(err.message || "Impossible d'extraire le texte du document.");
    } finally {
      setFileLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // --------------------------------------------------------------------------
  // INGESTION METHOD 3: URL avec scraping côté serveur (avec gestion anti-bot)
  // --------------------------------------------------------------------------
  const handleScrapeUrl = async () => {
    if (!sourceUrl.trim()) {
      showToast("Veuillez renseigner une URL valide", "error");
      return;
    }

    setFileLoading(true);
    setUrlScrapingError(null);
    showToast("Récupération du contenu de l'offre via l'URL...", "info");

    try {
      const response = await fetch("/api/scrape-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sourceUrl.trim() })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Impossible d'accéder au contenu de cette page");
      }

      setRawText(data.text);
      showToast("Texte de l'offre extrait avec succès depuis la page web", "success");
      setIngestionTab("text");
    } catch (err: any) {
      console.error(err);
      setUrlScrapingError(err.message || "Erreur lors du scraping de l'URL.");
      showToast("Impossible de scraper automatiquement cette URL", "error");
    } finally {
      setFileLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // TRIGGER AI EXTRACTION PIPELINE (CASCADE DE MODÈLES & FALLBACK)
  // --------------------------------------------------------------------------
  const handleRunExtraction = async () => {
    if (!rawText.trim()) {
      showToast("Veuillez fournir le texte d'une offre d'emploi avant de lancer l'extraction", "error");
      return;
    }

    setStep("extracting");
    showToast("Extraction IA haute précision en cours (cascade de modèles)...", "ai");

    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "extractJobOffer",
          payload: {
            jobDescription: rawText,
            sourceUrl: sourceUrl.trim() || undefined
          }
        })
      });

      if (!response.ok) {
        throw new Error("Le serveur d'extraction a rencontré une erreur");
      }

      const result: ExtractionResult = await response.json();
      setExtractionResult(result);
      setFormOffer(result.data);
      setStep("review");

      const completeness = calculateCompletenessScore(result.data);
      const engineLabel = result.isFallback ? "Moteur Heuristique (Fallback)" : result.modelUsed;
      showToast(`Extraction terminée avec succès (${completeness.score}% de complétude) via ${engineLabel}`, "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Erreur lors de l'extraction", "error");
      setStep("input");
    }
  };

  // --------------------------------------------------------------------------
  // FORM EDITING ACTIONS
  // --------------------------------------------------------------------------
  const handleUpdateField = (key: keyof ExtractedJobOffer, value: any) => {
    if (!formOffer) return;
    setFormOffer({
      ...formOffer,
      [key]: value
    });
  };

  const handleAddMission = () => {
    if (!newMission.trim() || !formOffer) return;
    setFormOffer({
      ...formOffer,
      missions: [...formOffer.missions, newMission.trim()]
    });
    setNewMission("");
  };

  const handleRemoveMission = (index: number) => {
    if (!formOffer) return;
    setFormOffer({
      ...formOffer,
      missions: formOffer.missions.filter((_, i) => i !== index)
    });
  };

  const handleAddRequiredSkill = () => {
    if (!newRequiredSkill.trim() || !formOffer) return;
    setFormOffer({
      ...formOffer,
      requiredSkills: [...formOffer.requiredSkills, newRequiredSkill.trim()]
    });
    setNewRequiredSkill("");
  };

  const handleRemoveRequiredSkill = (index: number) => {
    if (!formOffer) return;
    setFormOffer({
      ...formOffer,
      requiredSkills: formOffer.requiredSkills.filter((_, i) => i !== index)
    });
  };

  const handleAddPreferredSkill = () => {
    if (!newPreferredSkill.trim() || !formOffer) return;
    setFormOffer({
      ...formOffer,
      preferredSkills: [...formOffer.preferredSkills, newPreferredSkill.trim()]
    });
    setNewPreferredSkill("");
  };

  const handleRemovePreferredSkill = (index: number) => {
    if (!formOffer) return;
    setFormOffer({
      ...formOffer,
      preferredSkills: formOffer.preferredSkills.filter((_, i) => i !== index)
    });
  };

  const handleAddTool = () => {
    if (!newTool.trim() || !formOffer) return;
    setFormOffer({
      ...formOffer,
      tools: [...formOffer.tools, newTool.trim()]
    });
    setNewTool("");
  };

  const handleRemoveTool = (index: number) => {
    if (!formOffer) return;
    setFormOffer({
      ...formOffer,
      tools: formOffer.tools.filter((_, i) => i !== index)
    });
  };

  const handleAddQuality = () => {
    if (!newQuality.trim() || !formOffer) return;
    setFormOffer({
      ...formOffer,
      qualities: [...formOffer.qualities, newQuality.trim()]
    });
    setNewQuality("");
  };

  const handleRemoveQuality = (index: number) => {
    if (!formOffer) return;
    setFormOffer({
      ...formOffer,
      qualities: formOffer.qualities.filter((_, i) => i !== index)
    });
  };

  const handleAddBenefit = () => {
    if (!newBenefit.trim() || !formOffer) return;
    setFormOffer({
      ...formOffer,
      benefits: [...formOffer.benefits, newBenefit.trim()]
    });
    setNewBenefit("");
  };

  const handleRemoveBenefit = (index: number) => {
    if (!formOffer) return;
    setFormOffer({
      ...formOffer,
      benefits: formOffer.benefits.filter((_, i) => i !== index)
    });
  };

  const handleAddRecruitmentStep = () => {
    if (!newStepDesc.trim() || !formOffer) return;
    const nextOrder = formOffer.recruitmentSteps.length + 1;
    setFormOffer({
      ...formOffer,
      recruitmentSteps: [
        ...formOffer.recruitmentSteps,
        {
          order: nextOrder,
          description: newStepDesc.trim(),
          interviewer: newStepInterviewer.trim() || undefined,
          duration: newStepDuration.trim() || undefined
        }
      ]
    });
    setNewStepDesc("");
    setNewStepInterviewer("");
    setNewStepDuration("");
  };

  const handleRemoveRecruitmentStep = (index: number) => {
    if (!formOffer) return;
    const updated = formOffer.recruitmentSteps
      .filter((_, i) => i !== index)
      .map((s, idx) => ({ ...s, order: idx + 1 }));
    setFormOffer({
      ...formOffer,
      recruitmentSteps: updated
    });
  };

  const handleAddLanguage = () => {
    if (!newLanguageName.trim() || !formOffer) return;
    setFormOffer({
      ...formOffer,
      requiredLanguages: [
        ...formOffer.requiredLanguages,
        {
          language: newLanguageName.trim(),
          level: newLanguageLevel.trim() || "Courant",
          isRequired: true
        }
      ]
    });
    setNewLanguageName("");
  };

  const handleRemoveLanguage = (index: number) => {
    if (!formOffer) return;
    setFormOffer({
      ...formOffer,
      requiredLanguages: formOffer.requiredLanguages.filter((_, i) => i !== index)
    });
  };

  const handleAddCompanyMetric = () => {
    if (!newMetricLabel.trim() || !newMetricValue.trim() || !formOffer) return;
    setFormOffer({
      ...formOffer,
      companyMetrics: [
        ...formOffer.companyMetrics,
        {
          label: newMetricLabel.trim(),
          value: newMetricValue.trim()
        }
      ]
    });
    setNewMetricLabel("");
    setNewMetricValue("");
  };

  const handleRemoveCompanyMetric = (index: number) => {
    if (!formOffer) return;
    setFormOffer({
      ...formOffer,
      companyMetrics: formOffer.companyMetrics.filter((_, i) => i !== index)
    });
  };

  const handleCopyRawJson = () => {
    if (!extractionResult?.rawJson) return;
    navigator.clipboard.writeText(JSON.stringify(extractionResult.rawJson, null, 2));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
    showToast("JSON brut copié dans le presse-papier", "info");
  };

  // --------------------------------------------------------------------------
  // FINAL VALIDATION & SAVE TO FIRESTORE / STORE
  // --------------------------------------------------------------------------
  const handleSaveOpportunity = async () => {
    if (!formOffer) return;
    if (!formOffer.title.trim() || !formOffer.company.trim()) {
      showToast("Le titre et l'entreprise sont obligatoires", "error");
      return;
    }

    // Convert extracted data into the Opportunity format
    const company = dbStore.getCompanyByNameOrCreate(formOffer.company);

    // Map contract type to standard options
    let mappedContract: Opportunity["contractType"] = "Apprentissage";
    const cType = (formOffer.contractType || "").toLowerCase();
    if (cType.includes("stage")) mappedContract = "Stage";
    else if (cType.includes("pro") || cType.includes("professionnalisation")) mappedContract = "Professionnalisation";
    else if (cType.includes("cdi")) mappedContract = "CDI";
    else if (cType.includes("cdd")) mappedContract = "CDD";
    else if (cType.includes("apprentissage") || cType.includes("alternance")) mappedContract = "Apprentissage";
    else mappedContract = "Autre";

    // Format ExtractedJobInfo for the 4-tab modal view
    const extractedInfo: ExtractedJobInfo = {
      missions: formOffer.missions.length > 0 ? formOffer.missions : [
        "Prendre en charge les missions opérationnelles définies par le responsable.",
        "Contribuer activement au développement de l'activité du service."
      ],
      competencesRequises: formOffer.requiredSkills,
      competencesAppreciees: formOffer.preferredSkills,
      softSkills: formOffer.qualities,
      outilsLogiciels: formOffer.tools,
      formation: formOffer.educationRequirements || formOffer.educationLevel || "Formation supérieure en Finance, Banque ou Commerce",
      experienceRequise: formOffer.contractType?.includes("Alternance") || formOffer.contractType?.includes("Stage")
        ? "Débutant accepté / Première expérience valorisée" 
        : "Expérience selon profil",
      languesRequises: formOffer.requiredLanguages.map(l => `${l.language} (${l.level})`),
      avantages: formOffer.benefits,
      avantagesEnvironnement: formOffer.remotePolicy ? [formOffer.remotePolicy, formOffer.remoteDetails || ""].filter(Boolean) : [],
      entrepriseDetails: {
        presentation: formOffer.companyDescription || `Acteur reconnu dans le secteur ${formOffer.companySector || "bancaire et financier"}.`,
        parentGroup: formOffer.parentCompany || formOffer.groupName || undefined,
        secteur: formOffer.companySector || "Banque / Finance / Conseil",
        taille: formOffer.companySize || undefined,
        siege: formOffer.location || undefined,
        chiffresCles: formOffer.companyMetrics.length > 0 ? formOffer.companyMetrics : [
          { label: "Secteur", value: formOffer.companySector || "Finance" },
          { label: "Localisation", value: formOffer.location || "France" }
        ],
        faitsMarquants: [
          "Entreprise dynamique en développement",
          "Accompagnement attentif des profils juniors et alternants"
        ]
      },
      etapesRecrutement: formOffer.recruitmentSteps.length > 0 
        ? formOffer.recruitmentSteps.map(step => {
            const parts = [step.description];
            if (step.interviewer) parts.push(`(${step.interviewer})`);
            if (step.duration) parts.push(`[${step.duration}]`);
            return `${step.order}. ${parts.join(" ")}`;
          })
        : [
            "1. Examen du dossier et pré-sélection RH",
            "2. Entretien métier avec le manager opérationnel",
            "3. Échange de confirmation et proposition"
          ]
    };

    let savedOpp: Opportunity;

    if (existingOpportunity) {
      // Re-extraction update
      savedOpp = {
        ...existingOpportunity,
        title: formOffer.title,
        companyName: formOffer.company,
        companyId: company.id,
        contractType: mappedContract,
        duration: formOffer.duration || existingOpportunity.duration || "12 mois",
        location: formOffer.location || existingOpportunity.location || "France",
        salary: formOffer.salary || existingOpportunity.salary || undefined,
        startDate: formOffer.startDate || existingOpportunity.startDate || undefined,
        deadline: formOffer.applicationDeadline || existingOpportunity.deadline || undefined,
        url: sourceUrl || existingOpportunity.url || undefined,
        status: targetStatus,
        notes: rawText ? rawText.substring(0, 500) + "..." : existingOpportunity.notes,
        aiExtracted: true,
        extractedInfo: extractedInfo,
        updatedAt: new Date().toISOString()
      };
      dbStore.updateOpportunity(savedOpp);
      showToast(`Opportunité "${formOffer.title}" ré-extraite et mise à jour !`, "success");
    } else {
      // New opportunity creation
      savedOpp = dbStore.addOpportunity({
        companyId: company.id,
        companyName: formOffer.company,
        title: formOffer.title,
        contractType: mappedContract,
        duration: formOffer.duration || "12 mois",
        location: formOffer.location || "France",
        status: targetStatus,
        salary: formOffer.salary || undefined,
        startDate: formOffer.startDate || undefined,
        deadline: formOffer.applicationDeadline || undefined,
        url: sourceUrl || undefined,
        notes: rawText ? rawText.substring(0, 500) + "..." : "Offre extraite par IA.",
        aiExtracted: true,
        extractedInfo: extractedInfo
      });
      showToast(`Opportunité "${formOffer.title}" enregistrée dans vos candidatures !`, "success");
    }

    // Sync to Firestore for authenticated user
    try {
      await dbStore.syncToFirestore("nathan_profile");
      console.log("[JobExtractionModal] Synced opportunity to Firestore");
    } catch (e) {
      console.warn("[JobExtractionModal] Firestore sync fallback:", e);
    }

    if (onSuccess) onSuccess(savedOpp);
    handleClose();
  };

  // Completeness score for the editable form
  const completeness = formOffer ? calculateCompletenessScore(formOffer) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title=""
      size="xl"
    >
      <div className="flex flex-col gap-5 -mt-2">
        
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-purple-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {existingOpportunity ? "Ré-extraire l'offre avec l'IA" : "Extraction d'offre par Intelligence Artificielle"}
                </h3>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Haute Précision
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Cascade de modèles Gemini (3.8 Flash, Flash Latest, Lite) et moteur heuristique de repli.
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP 1: INGESTION INPUTS */}
        {step === "input" && (
          <div className="space-y-5">
            {/* INGESTION TABS */}
            <div className="flex items-center gap-2 p-1 rounded-xl bg-white/[0.03] border border-white/5">
              <button
                onClick={() => setIngestionTab("text")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  ingestionTab === "text"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>1. Copier-coller texte (Recommandé)</span>
              </button>

              <button
                onClick={() => setIngestionTab("file")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  ingestionTab === "file"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>2. Fichier (PDF / Word)</span>
              </button>

              <button
                onClick={() => setIngestionTab("url")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  ingestionTab === "url"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>3. URL de l'offre</span>
              </button>
            </div>

            {/* TAB 1: COPIER-COLLER */}
            {ingestionTab === "text" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <span>Texte brut de l'offre d'emploi</span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      (Évite les protections anti-bot des sites de recrutement)
                    </span>
                  </label>
                  
                  {/* Sample buttons for fast testing */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">Exemples :</span>
                    <button
                      type="button"
                      onClick={() => handlePasteSample("banque")}
                      className="text-[11px] px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 cursor-pointer"
                    >
                      Natixis (Alternance)
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePasteSample("gestion")}
                      className="text-[11px] px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 cursor-pointer"
                    >
                      Crédit Agricole (Clermont)
                    </button>
                  </div>
                </div>

                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Collez ici l'intégralité du texte de l'offre d'emploi (LinkedIn, Welcome to the Jungle, site carrière, email RH, etc.)..."
                  rows={10}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-rose-400/50 font-mono leading-relaxed"
                />

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{rawText.length} caractères • Pré-nettoyage automatique activé</span>
                  {rawText.length > 0 && (
                    <button
                      onClick={() => setRawText("")}
                      className="text-slate-400 hover:text-rose-400 cursor-pointer"
                    >
                      Effacer
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: FICHIER PDF / DOCX */}
            {ingestionTab === "file" && (
              <div className="space-y-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/15 hover:border-rose-500/40 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-white/[0.01] hover:bg-white/[0.03]"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-rose-400 mb-3">
                    <FileUp className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-white">
                    {uploadedFileName || "Glissez votre fiche de poste ou cliquez pour importer"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Formats acceptés : PDF (.pdf via pdfjs-dist) ou Word (.docx via mammoth)
                  </p>

                  {fileLoading && (
                    <div className="mt-4 flex items-center gap-2 text-xs text-rose-400 font-semibold">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Extraction du texte en cours...</span>
                    </div>
                  )}
                </div>

                {rawText && (
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Document prêt à être analysé ({rawText.length} caractères extraits)</span>
                    </div>
                    <button
                      onClick={() => setIngestionTab("text")}
                      className="text-xs text-rose-400 hover:underline cursor-pointer"
                    >
                      Voir le texte
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: URL SCRAPING */}
            {ingestionTab === "url" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Lien public de l'offre d'emploi
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="url"
                        value={sourceUrl}
                        onChange={(e) => setSourceUrl(e.target.value)}
                        placeholder="https://www.linkedin.com/jobs/view/... ou lien site carrière"
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-rose-400/50"
                      />
                    </div>
                    <GlassButton
                      type="button"
                      variant="secondary"
                      onClick={handleScrapeUrl}
                      disabled={fileLoading || !sourceUrl.trim()}
                    >
                      {fileLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        "Scraper l'URL"
                      )}
                    </GlassButton>
                  </div>
                </div>

                {urlScrapingError && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2.5 leading-relaxed">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-300">Scraping bloqué par le site</p>
                      <p className="mt-0.5 text-amber-200/90">{urlScrapingError}</p>
                      <button
                        type="button"
                        onClick={() => setIngestionTab("text")}
                        className="mt-2 inline-flex items-center gap-1 font-semibold text-white underline hover:text-amber-100 cursor-pointer"
                      >
                        Basculer vers le copier-coller de texte &rarr;
                      </button>
                    </div>
                  </div>
                )}

                {rawText && (
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Contenu extrait avec succès ({rawText.length} caractères)</span>
                    </div>
                    <button
                      onClick={() => setIngestionTab("text")}
                      className="text-xs text-rose-400 hover:underline cursor-pointer"
                    >
                      Voir le texte
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ACTION FOOTER */}
            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Anti-hallucination activé (température 0.0, extraction stricte)</span>
              </div>

              <div className="flex items-center gap-3">
                <GlassButton type="button" variant="ghost" onClick={handleClose}>
                  Annuler
                </GlassButton>
                <GlassButton
                  type="button"
                  variant="primary"
                  onClick={handleRunExtraction}
                  disabled={!rawText.trim()}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Lancer l'extraction IA</span>
                </GlassButton>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: EXTRACTING PROGRESS STATE */}
        {step === "extracting" && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-rose-500/30 to-purple-500/30 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-xl shadow-rose-500/10">
                <Sparkles className="w-8 h-8 animate-spin" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                <Zap className="w-3 h-3 text-emerald-400" />
              </div>
            </div>

            <div>
              <h4 className="text-base font-bold text-white">
                Analyse & Structuration de l'offre...
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                Interrogation du modèle Gemini 3.8 Flash avec application du schéma strict et garde-fous déterministes.
              </p>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-white/[0.02] px-3 py-1.5 rounded-full border border-white/5">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
              <span>Cascade : gemini-3.8-flash &rarr; flash-latest &rarr; 3.1-flash-lite &rarr; heuristique local</span>
            </div>
          </div>
        )}

        {/* STEP 3: EDITABLE REVIEW FORM WITH COMPLETENESS SCORE & RAW JSON */}
        {step === "review" && formOffer && (
          <div className="space-y-6 max-h-[72vh] overflow-y-auto pr-1">
            
            {/* TOP STATUS BAR WITH COMPLETENESS SCORE & MODEL BADGE */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs">
                    {completeness?.score}%
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">Score de complétude de l'offre</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        (completeness?.score || 0) >= 80 
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}>
                        {(completeness?.score || 0) >= 80 ? "Exhaustive" : "Partielle"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {completeness?.missingFields.length === 0 
                        ? "Tous les critères essentiels ont été extraits" 
                        : `Champs manquants dans l'offre : ${completeness?.missingFields.join(", ")}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Moteur d'analyse :</span>
                  <span className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                    extractionResult?.isFallback
                      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                      : "bg-purple-500/15 text-purple-300 border-purple-500/30"
                  }`}>
                    {extractionResult?.isFallback && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    )}
                    {extractionResult?.isFallback ? "Moteur Heuristique Déterministe (Fallback)" : (extractionResult?.modelUsed || "gemini-3.8-flash")}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowRawJson(!showRawJson)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs border border-white/10 cursor-pointer"
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>{showRawJson ? "Masquer JSON" : "Voir JSON"}</span>
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    (completeness?.score || 0) >= 80 ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                  style={{ width: `${completeness?.score || 0}%` }}
                />
              </div>
            </div>

            {/* RAW JSON VIEWER (COLLAPSIBLE) */}
            {showRawJson && extractionResult && (
              <div className="p-4 rounded-2xl bg-black/60 border border-white/15 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-mono font-bold text-purple-300 flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5" />
                    JSON Brut retourné par l'IA (strict adherence)
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyRawJson}
                    className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-white/10 hover:bg-white/15 text-slate-200 cursor-pointer"
                  >
                    {copySuccess ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copySuccess ? "Copié !" : "Copier JSON"}</span>
                  </button>
                </div>
                <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto max-h-56 p-2 rounded-lg bg-black/40">
                  {JSON.stringify(extractionResult.rawJson, null, 2)}
                </pre>
              </div>
            )}

            {/* 1. INFORMATIONS GÉNÉRALES DU POSTE (ÉDITABLE) */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                1. Informations Clés du Poste (Modifiables)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Intitulé du poste *</label>
                  <input
                    type="text"
                    value={formOffer.title}
                    onChange={(e) => handleUpdateField("title", e.target.value)}
                    className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400/50"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Entreprise qui recrute *</label>
                  <input
                    type="text"
                    value={formOffer.company}
                    onChange={(e) => {
                      handleUpdateField("company", e.target.value);
                      handleUpdateField("companyName", e.target.value);
                    }}
                    className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Groupe / Maison Mère</label>
                  <input
                    type="text"
                    placeholder="ex: Groupe BPCE"
                    value={formOffer.parentCompany || formOffer.groupName || ""}
                    onChange={(e) => handleUpdateField("parentCompany", e.target.value)}
                    className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Type de contrat</label>
                  <select
                    value={formOffer.contractType || "Alternance"}
                    onChange={(e) => handleUpdateField("contractType", e.target.value)}
                    className="bg-[#0c1020] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="Alternance">Alternance</option>
                    <option value="Stage">Stage</option>
                    <option value="CDI">CDI</option>
                    <option value="CDD">CDD</option>
                    <option value="VIE">V.I.E</option>
                    <option value="Freelance">Freelance</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Durée</label>
                  <input
                    type="text"
                    placeholder="ex: 12 mois, 6 mois"
                    value={formOffer.duration || ""}
                    onChange={(e) => handleUpdateField("duration", e.target.value)}
                    className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Lieu / Ville</label>
                  <input
                    type="text"
                    placeholder="ex: Paris, Clermont-Ferrand"
                    value={formOffer.location || ""}
                    onChange={(e) => handleUpdateField("location", e.target.value)}
                    className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Rémunération / Salaire</label>
                  <input
                    type="text"
                    placeholder="ex: 1 450 € / mois"
                    value={formOffer.salary || ""}
                    onChange={(e) => handleUpdateField("salary", e.target.value)}
                    className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-emerald-400 font-semibold focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Politique de télétravail</label>
                  <input
                    type="text"
                    placeholder="ex: 1 à 2 jours / semaine"
                    value={formOffer.remotePolicy || ""}
                    onChange={(e) => handleUpdateField("remotePolicy", e.target.value)}
                    className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Date limite de candidature</label>
                  <input
                    type="text"
                    placeholder="ex: 30 Juin 2026"
                    value={formOffer.applicationDeadline || ""}
                    onChange={(e) => handleUpdateField("applicationDeadline", e.target.value)}
                    className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-amber-400 font-semibold focus:outline-none"
                  />
                </div>
              </div>

              {/* Présentation entreprise & Chiffres clés */}
              <div className="pt-3 border-t border-white/5 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-300">Secteur d'activité</label>
                    <input
                      type="text"
                      placeholder="ex: Fintech, Gestion de patrimoine, Conseil..."
                      value={formOffer.companySector || ""}
                      onChange={(e) => handleUpdateField("companySector", e.target.value)}
                      className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-300">Taille / Effectif</label>
                    <input
                      type="text"
                      placeholder="ex: 85 collaborateurs, 250 salariés..."
                      value={formOffer.companySize || ""}
                      onChange={(e) => handleUpdateField("companySize", e.target.value)}
                      className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Description / Présentation de l'entreprise</label>
                  <textarea
                    rows={2}
                    placeholder="Présentation de l'entreprise, contexte, levée de fonds, mission..."
                    value={formOffer.companyDescription || ""}
                    onChange={(e) => handleUpdateField("companyDescription", e.target.value)}
                    className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none resize-none"
                  />
                </div>

                {/* Chiffres clés entreprise */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">
                    Chiffres clés & Données factuelles ({formOffer.companyMetrics.length})
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {formOffer.companyMetrics.map((cm, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        <span className="font-semibold text-slate-200">{cm.label} :</span>
                        <span>{cm.value}</span>
                        <button type="button" onClick={() => handleRemoveCompanyMetric(idx)} className="hover:text-white cursor-pointer ml-1">
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Libellé (ex: Effectif, Encours, CA)..."
                      value={newMetricLabel}
                      onChange={(e) => setNewMetricLabel(e.target.value)}
                      className="w-1/3 bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Valeur (ex: 85 collaborateurs, 450 M€)..."
                      value={newMetricValue}
                      onChange={(e) => setNewMetricValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCompanyMetric())}
                      className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                    />
                    <button type="button" onClick={handleAddCompanyMetric} className="px-2.5 py-1.5 rounded-xl bg-white/5 text-xs text-white cursor-pointer border border-white/10">
                      Ajouter
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. MISSIONS (ÉDITABLE) */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  2. Missions Principales ({formOffer.missions.length})
                </h4>
              </div>

              <div className="space-y-2">
                {formOffer.missions.map((mission, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-black/20 p-2.5 rounded-xl border border-white/5">
                    <span className="text-[10px] font-bold text-rose-400 mt-1">#{idx + 1}</span>
                    <textarea
                      value={mission}
                      rows={2}
                      onChange={(e) => {
                        const updated = [...formOffer.missions];
                        updated[idx] = e.target.value;
                        handleUpdateField("missions", updated);
                      }}
                      className="flex-1 bg-transparent text-xs text-slate-200 focus:outline-none resize-none leading-relaxed"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveMission(idx)}
                      className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add mission input */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Ajouter une mission manuellement..."
                  value={newMission}
                  onChange={(e) => setNewMission(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddMission())}
                  className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddMission}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold cursor-pointer border border-white/10 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter</span>
                </button>
              </div>
            </div>

            {/* 3. COMPÉTENCES, OUTILS & SOFT SKILLS (TAGS ÉDITABLES) */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                3. Compétences & Profil Recherché
              </h4>

              {/* Compétences indispensables */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">
                  Compétences indispensables ({formOffer.requiredSkills.length})
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {formOffer.requiredSkills.map((sk, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-rose-500/15 text-rose-300 border border-rose-500/30">
                      {sk}
                      <button type="button" onClick={() => handleRemoveRequiredSkill(idx)} className="hover:text-white cursor-pointer ml-1">
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ajouter une compétence indispensable..."
                    value={newRequiredSkill}
                    onChange={(e) => setNewRequiredSkill(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddRequiredSkill())}
                    className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                  />
                  <button type="button" onClick={handleAddRequiredSkill} className="px-2.5 py-1.5 rounded-xl bg-white/5 text-xs text-white cursor-pointer border border-white/10">
                    Ajouter
                  </button>
                </div>
              </div>

              {/* Compétences appréciées (un plus) */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <label className="text-xs font-semibold text-slate-300">
                  Compétences appréciées / Un plus ({formOffer.preferredSkills.length})
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {formOffer.preferredSkills.map((sk, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      {sk}
                      <button type="button" onClick={() => handleRemovePreferredSkill(idx)} className="hover:text-white cursor-pointer ml-1">
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ajouter une compétence appréciée (ex: Notions en fiscalité, première expérience patrimoniale)..."
                    value={newPreferredSkill}
                    onChange={(e) => setNewPreferredSkill(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddPreferredSkill())}
                    className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                  />
                  <button type="button" onClick={handleAddPreferredSkill} className="px-2.5 py-1.5 rounded-xl bg-white/5 text-xs text-white cursor-pointer border border-white/10">
                    Ajouter
                  </button>
                </div>
              </div>

              {/* Langues requises */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-emerald-400" />
                  Langues requises ({formOffer.requiredLanguages.length})
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {formOffer.requiredLanguages.map((lang, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      <span className="font-semibold">{lang.language}</span>
                      <span className="text-emerald-400/80">({lang.level})</span>
                      <button type="button" onClick={() => handleRemoveLanguage(idx)} className="hover:text-white cursor-pointer ml-1">
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Langue (ex: Anglais, Espagnol)..."
                    value={newLanguageName}
                    onChange={(e) => setNewLanguageName(e.target.value)}
                    className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                  />
                  <select
                    value={newLanguageLevel}
                    onChange={(e) => setNewLanguageLevel(e.target.value)}
                    className="bg-[#0c1020] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="Notions">Notions</option>
                    <option value="Professionnel">Professionnel</option>
                    <option value="Courant">Courant</option>
                    <option value="Bilingue">Bilingue</option>
                    <option value="Langue maternelle">Langue maternelle</option>
                  </select>
                  <button type="button" onClick={handleAddLanguage} className="px-2.5 py-1.5 rounded-xl bg-white/5 text-xs text-white cursor-pointer border border-white/10">
                    Ajouter
                  </button>
                </div>
              </div>

              {/* Outils & Logiciels */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <label className="text-xs font-semibold text-slate-300">
                  Outils & Logiciels concrets ({formOffer.tools.length})
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {formOffer.tools.map((tl, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-blue-500/15 text-blue-300 border border-blue-500/30">
                      {tl}
                      <button type="button" onClick={() => handleRemoveTool(idx)} className="hover:text-white cursor-pointer ml-1">
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ajouter un outil (ex: Excel, Bloomberg, Python, Salesforce)..."
                    value={newTool}
                    onChange={(e) => setNewTool(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTool())}
                    className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                  />
                  <button type="button" onClick={handleAddTool} className="px-2.5 py-1.5 rounded-xl bg-white/5 text-xs text-white cursor-pointer border border-white/10">
                    Ajouter
                  </button>
                </div>
              </div>

              {/* Qualités humaines */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <label className="text-xs font-semibold text-slate-300">
                  Qualités relationnelles & Soft skills ({formOffer.qualities.length})
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {formOffer.qualities.map((ql, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-purple-500/15 text-purple-300 border border-purple-500/30">
                      {ql}
                      <button type="button" onClick={() => handleRemoveQuality(idx)} className="hover:text-white cursor-pointer ml-1">
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ajouter une qualité (ex: Rigueur, Aisance relationnelle)..."
                    value={newQuality}
                    onChange={(e) => setNewQuality(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddQuality())}
                    className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                  />
                  <button type="button" onClick={handleAddQuality} className="px-2.5 py-1.5 rounded-xl bg-white/5 text-xs text-white cursor-pointer border border-white/10">
                    Ajouter
                  </button>
                </div>
              </div>

              {/* Formation & Diplôme */}
              <div className="pt-2 border-t border-white/5">
                <label className="text-xs font-semibold text-slate-300">Formation & Niveau d'études requis</label>
                <input
                  type="text"
                  placeholder="ex: Bac+4 à Bac+5 en Finance, Banque ou Gestion de Patrimoine"
                  value={formOffer.educationRequirements || formOffer.educationLevel || ""}
                  onChange={(e) => handleUpdateField("educationRequirements", e.target.value)}
                  className="w-full mt-1.5 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            {/* 4. AVANTAGES (BENEFITS) */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <Euro className="w-3.5 h-3.5" />
                4. Avantages & Bénéfices ({formOffer.benefits.length})
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {formOffer.benefits.map((bf, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    {bf}
                    <button type="button" onClick={() => handleRemoveBenefit(idx)} className="hover:text-white cursor-pointer ml-1">
                      &times;
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ajouter un avantage (ex: Titres restaurant, Prise en charge 50% transports, RTT)..."
                  value={newBenefit}
                  onChange={(e) => setNewBenefit(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddBenefit())}
                  className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                />
                <button type="button" onClick={handleAddBenefit} className="px-2.5 py-1.5 rounded-xl bg-white/5 text-xs text-white cursor-pointer border border-white/10">
                  Ajouter
                </button>
              </div>
            </div>

            {/* 5. PROCESSUS DE RECRUTEMENT (ÉDITABLE) */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5" />
                  5. Processus de Recrutement & Entretiens ({formOffer.recruitmentSteps.length})
                </h4>
              </div>

              {formOffer.recruitmentSteps.length > 0 ? (
                <div className="space-y-2">
                  {formOffer.recruitmentSteps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3 bg-black/25 p-3 rounded-xl border border-white/5">
                      <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-300 font-bold text-xs flex items-center justify-center shrink-0 border border-rose-500/30">
                        {step.order || idx + 1}
                      </div>
                      <div className="flex-1 space-y-1.5 min-w-0">
                        <input
                          type="text"
                          value={step.description}
                          onChange={(e) => {
                            const updated = [...formOffer.recruitmentSteps];
                            updated[idx] = { ...updated[idx], description: e.target.value };
                            setFormOffer({ ...formOffer, recruitmentSteps: updated });
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                          placeholder="Description de l'étape..."
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          <input
                            type="text"
                            value={step.interviewer || ""}
                            onChange={(e) => {
                              const updated = [...formOffer.recruitmentSteps];
                              updated[idx] = { ...updated[idx], interviewer: e.target.value || undefined };
                              setFormOffer({ ...formOffer, recruitmentSteps: updated });
                            }}
                            className="bg-black/30 border border-white/5 rounded-lg px-2 py-1 text-[11px] text-slate-300 focus:outline-none"
                            placeholder="Interlocuteur (ex: RRH, Manager, Associé...)"
                          />
                          <input
                            type="text"
                            value={step.duration || ""}
                            onChange={(e) => {
                              const updated = [...formOffer.recruitmentSteps];
                              updated[idx] = { ...updated[idx], duration: e.target.value || undefined };
                              setFormOffer({ ...formOffer, recruitmentSteps: updated });
                            }}
                            className="bg-black/30 border border-white/5 rounded-lg px-2 py-1 text-[11px] text-slate-300 focus:outline-none"
                            placeholder="Durée (ex: 30 min, 1h...)"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveRecruitmentStep(idx)}
                        className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer shrink-0"
                        title="Supprimer cette étape"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Aucune étape explicite détectée dans le texte. Vous pouvez en ajouter une ci-dessous.
                </p>
              )}

              {/* Ajouter une étape */}
              <div className="pt-2 border-t border-white/5 space-y-2">
                <label className="text-[11px] font-semibold text-slate-400">Ajouter une étape au processus :</label>
                <div className="flex flex-col md:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Description de l'étape (ex: Entretien de préqualification téléphonique)..."
                    value={newStepDesc}
                    onChange={(e) => setNewStepDesc(e.target.value)}
                    className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Interlocuteur (optionnel)..."
                    value={newStepInterviewer}
                    onChange={(e) => setNewStepInterviewer(e.target.value)}
                    className="w-full md:w-1/4 bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Durée (optionnel)..."
                    value={newStepDuration}
                    onChange={(e) => setNewStepDuration(e.target.value)}
                    className="w-full md:w-28 bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddRecruitmentStep}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-white cursor-pointer border border-white/10 flex items-center justify-center gap-1 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 6. COLONNE KANBAN DE DESTINATION */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-slate-300">Colonne Kanban initiale</label>
                <p className="text-[11px] text-slate-400 mt-0.5">Où placer l'offre dans votre tableau Kanban</p>
              </div>
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value as OpportunityStatus)}
                className="bg-[#0c1020] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="saved">Sauvegardée</option>
                <option value="to_study">À étudier</option>
                <option value="to_prepare">À préparer</option>
                <option value="to_apply">À candidater</option>
              </select>
            </div>

            {/* MODAL BOTTOM CONTROLS */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep("input")}
                className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
              >
                &larr; Modifier le texte source ou relancer
              </button>

              <div className="flex items-center gap-3">
                <GlassButton type="button" variant="ghost" onClick={handleClose}>
                  Annuler
                </GlassButton>
                <GlassButton type="button" variant="primary" onClick={handleSaveOpportunity}>
                  <Check className="w-4 h-4" />
                  <span>
                    {existingOpportunity ? "Valider la ré-extraction" : "Valider et enregistrer l'opportunité"}
                  </span>
                </GlassButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
