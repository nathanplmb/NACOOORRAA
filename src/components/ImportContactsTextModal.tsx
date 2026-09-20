import React, { useState } from "react";
import { CandidateProfile, Contact, ContactCategory } from "../types";
import { dbStore } from "../dbStore";
import { computeStrategicInterests } from "../utils/strategicInterests";
import { GlassButton, Badge } from "./Shared";
import { 
  Sparkles, 
  X, 
  CheckCircle, 
  AlertCircle, 
  UserCheck, 
  Check, 
  Info
} from "lucide-react";

interface ImportContactsTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateProfile: CandidateProfile;
  showToast: (message: string, type: "success" | "error" | "info" | "ai") => void;
}

type ImportStep = "input" | "processing" | "preview" | "done";

interface ContactCandidate {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  jobTitle: string;
  companyName: string;
  category: ContactCategory;
  industry?: string;
  location?: string;
  linkedinUrl?: string;
  email?: string;
  phone?: string;
  contactUrl?: string;
  education?: string;
  notes?: string;
  relevanceScore?: number;
  connectionPoints?: string[];
  selected: boolean;
  isDuplicate: boolean;
  duplicateReason?: string;
  action: "import" | "skip" | "merge";
}

export const ImportContactsTextModal: React.FC<ImportContactsTextModalProps> = ({
  isOpen,
  onClose,
  candidateProfile,
  showToast
}) => {
  const [step, setStep] = useState<ImportStep>("input");
  const [pastedText, setPastedText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [candidates, setCandidates] = useState<ContactCandidate[]>([]);
  const [importSummary, setImportSummary] = useState({ added: 0, skipped: 0, merged: 0 });

  if (!isOpen) return null;

  const resetState = () => {
    setStep("input");
    setPastedText("");
    setIsAnalyzing(false);
    setCandidates([]);
    setImportSummary({ added: 0, skipped: 0, merged: 0 });
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleAnalyzeText = async () => {
    if (!pastedText.trim()) {
      showToast("Veuillez coller du texte contenant des contacts.", "error");
      return;
    }

    setStep("processing");
    setIsAnalyzing(true);

    try {
      let parsedContacts: any[] = [];
      try {
        const res = await fetch("/api/gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "parseContactsFromText",
            payload: { text: pastedText, profile: candidateProfile }
          })
        });

        if (res.ok) {
          parsedContacts = await res.json();
        }
      } catch (networkErr) {
        console.warn("Network request failed, falling back to local heuristic parser:", networkErr);
      }

      if (!Array.isArray(parsedContacts) || parsedContacts.length === 0) {
        // Fallback to local heuristic parser
        parsedContacts = parseContactsLocally(pastedText);
      }

      if (!Array.isArray(parsedContacts) || parsedContacts.length === 0) {
        showToast("Aucun contact n'a pu être extrait de ce texte. Essayez avec un format plus détaillé.", "error");
        setStep("input");
        setIsAnalyzing(false);
        return;
      }

      // Extract global fallback URL from pastedText if any
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const allUrls = pastedText.match(urlRegex) || [];
      const globalUrl = allUrls.find(u => !u.toLowerCase().includes("linkedin.com")) || allUrls[0] || "";

      // Check duplicates against existing database contacts
      const existingContacts = dbStore.getContacts();

      const mapped: ContactCandidate[] = parsedContacts.map((c: any, index: number) => {
        const nameMatch = existingContacts.find(
          existing => existing.fullName.toLowerCase() === c.fullName.toLowerCase() ||
                      (existing.firstName.toLowerCase() === c.firstName.toLowerCase() && existing.lastName.toLowerCase() === c.lastName.toLowerCase())
        );

        const linkedinMatch = c.linkedinUrl ? existingContacts.find(
          existing => existing.linkedInUrl && existing.linkedInUrl.toLowerCase() === c.linkedinUrl.toLowerCase()
        ) : null;

        const isDup = Boolean(nameMatch || linkedinMatch);
        const reason = nameMatch ? `Nom identique (${nameMatch.fullName})` : linkedinMatch ? "URL LinkedIn identique" : undefined;

        return {
          id: `cand_${index}_${Math.random().toString(36).substring(2, 7)}`,
          firstName: c.firstName || "",
          lastName: c.lastName || "",
          fullName: c.fullName || "Contact",
          jobTitle: c.jobTitle || "Professionnel",
          companyName: c.companyName || c.company || "Entreprise",
          category: c.category || "other_pro",
          industry: c.industry || "",
          location: c.location || "",
          linkedinUrl: c.linkedinUrl || "",
          email: c.email || "",
          phone: c.phone || "",
          contactUrl: c.contactUrl || globalUrl || "",
          education: c.education || "",
          notes: c.notes || "Importé par texte",
          relevanceScore: c.relevanceScore || 70,
          connectionPoints: c.connectionPoints || ["Importé par texte"],
          selected: !isDup, // auto-deselect duplicates by default
          isDuplicate: isDup,
          duplicateReason: reason,
          action: isDup ? "skip" : "import"
        };
      });

      setCandidates(mapped);
      setStep("preview");
      showToast(`${mapped.length} contacts détectés avec succès.`, "success");
    } catch (err: any) {
      console.error("Text import analysis error:", err);
      // Fallback local parsing on unhandled error
      try {
        const localParsed = parseContactsLocally(pastedText);
        if (localParsed.length > 0) {
          const existingContacts = dbStore.getContacts();
          const mapped: ContactCandidate[] = localParsed.map((c: any, index: number) => ({
            id: `cand_${index}_${Math.random().toString(36).substring(2, 7)}`,
            firstName: c.firstName || "",
            lastName: c.lastName || "",
            fullName: c.fullName || "Contact",
            jobTitle: c.jobTitle || "Professionnel",
            companyName: c.companyName || "Entreprise",
            category: c.category || "other_pro",
            linkedinUrl: c.linkedinUrl || "",
            email: c.email || "",
            contactUrl: c.contactUrl || "",
            notes: c.notes || "Importé par texte",
            relevanceScore: 65,
            connectionPoints: ["Importé par texte"],
            selected: true,
            isDuplicate: false,
            action: "import"
          }));
          setCandidates(mapped);
          setStep("preview");
          showToast(`${mapped.length} contacts détectés (mode local).`, "success");
          return;
        }
      } catch (fallbackErr) {
        console.error("Local fallback error:", fallbackErr);
      }

      showToast("Erreur d'analyse de texte. Veuillez réessayer.", "error");
      setStep("input");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c));
  };

  const handleSelectAll = (select: boolean) => {
    setCandidates(prev => prev.map(c => ({ ...c, selected: select })));
  };

  const handleActionChange = (id: string, action: "import" | "skip" | "merge") => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, action, selected: action !== "skip" } : c));
  };

  const handleConfirmImport = () => {
    const selectedCandidates = candidates.filter(c => c.selected && c.action !== "skip");
    if (selectedCandidates.length === 0) {
      showToast("Aucun contact sélectionné pour l'import.", "error");
      return;
    }

    let addedCount = 0;
    let mergedCount = 0;
    let skippedCount = candidates.filter(c => !c.selected || c.action === "skip").length;

    const existingContacts = dbStore.getContacts();

    for (const cand of selectedCandidates) {
      if (cand.action === "merge" && cand.isDuplicate) {
        const existing = existingContacts.find(e => e.fullName.toLowerCase() === cand.fullName.toLowerCase());
        if (existing) {
          const comp = dbStore.getCompanyByNameOrCreate(cand.companyName || existing.companyName);
          dbStore.updateContact({
            ...existing,
            companyId: comp.id,
            companyName: comp.name,
            jobTitle: cand.jobTitle || existing.jobTitle,
            normalizedJobTitle: cand.jobTitle || existing.normalizedJobTitle,
            linkedInUrl: cand.linkedinUrl || existing.linkedInUrl,
            email: cand.email || existing.email,
            phone: cand.phone || existing.phone,
            contactUrl: cand.contactUrl || existing.contactUrl,
            notes: `${existing.notes || ""}\n[Import texte]: ${cand.notes}`.trim()
          });
          mergedCount++;
          continue;
        }
      }

      // Add new contact (additive rule)
      const comp = dbStore.getCompanyByNameOrCreate(cand.companyName || "Entreprise");
      const strategic = computeStrategicInterests({
        fullName: cand.fullName,
        jobTitle: cand.jobTitle,
        companyName: comp.name,
        category: cand.category,
        notes: cand.notes
      }, candidateProfile);

      dbStore.addContact({
        firstName: cand.firstName,
        lastName: cand.lastName,
        fullName: cand.fullName,
        companyId: comp.id,
        companyName: comp.name,
        jobTitle: cand.jobTitle,
        normalizedJobTitle: cand.jobTitle,
        category: cand.category,
        relevanceScore: cand.relevanceScore || strategic.relevanceScore,
        networkingRelevance: strategic.networkingRelevance,
        connectionPoints: cand.connectionPoints && cand.connectionPoints.length > 0 ? cand.connectionPoints : strategic.connectionPoints,
        summary: strategic.summary,
        previousCompanies: [],
        notes: cand.notes || "Importé par texte",
        linkedInUrl: cand.linkedinUrl || "",
        email: cand.email || "",
        phone: cand.phone || "",
        contactUrl: cand.contactUrl || "",
        networkingStatus: "to_contact"
      });
      addedCount++;
    }

    setImportSummary({ added: addedCount, merged: mergedCount, skipped: skippedCount });
    setStep("done");
    showToast(`Import réussi : ${addedCount} ajoutés, ${mergedCount} fusionnés.`, "success");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#0B0F19] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#D81A45]/20 to-purple-500/20 border border-[#D81A45]/30 text-[#FF6685]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#F5F6FA]">Importer des contacts par texte</h2>
              <p className="text-xs text-[#9AA0B2]">Collez une liste de contacts ou n'importe quel texte. NACORA analysera automatiquement les informations.</p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 rounded-xl text-[#9AA0B2] hover:text-[#F5F6FA] hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {step === "input" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-[#9AA0B2] flex items-start gap-3">
                <Info className="w-5 h-5 text-[#FF6685] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-[#F5F6FA]">Astuce d'utilisation :</span> Vous pouvez copier-coller du texte directement depuis LinkedIn, un PDF, un e-mail ou un tableau. NACORA extrait intelligemment chaque profil sans altérer vos contacts existants.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9AA0B2] uppercase tracking-wider mb-2">
                  Collez votre texte brut ici
                </label>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Exemple :&#10;Jean Dupont - Directeur Financier chez BNP Paribas (jean.dupont@bnp.fr)&#10;Marie Curie - Responsable Recrutement chez Revolut&#10;Thomas Martin - Alternant M&A..."
                  rows={10}
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-[#F5F6FA] placeholder-[#9AA0B2]/50 text-sm focus:outline-none focus:border-[#D81A45] transition-colors resize-y font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <GlassButton variant="secondary" onClick={handleClose}>
                  Annuler
                </GlassButton>
                <GlassButton 
                  variant="primary" 
                  onClick={handleAnalyzeText}
                  disabled={!pastedText.trim()}
                  icon={<Sparkles className="w-4 h-4" />}
                >
                  Analyser avec l'IA NACORA
                </GlassButton>
              </div>
            </div>
          )}

          {step === "processing" && (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-[#D81A45]/20 animate-ping"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-[#D81A45] border-r-transparent border-b-[#C084FC] border-l-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-[#FF6685]">
                  <Sparkles className="w-8 h-8 animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-[#F5F6FA]">Analyse et extraction intelligente en cours...</h3>
                <p className="text-sm text-[#9AA0B2]">L'IA structure les profils, détecte les doublons et classe les contacts.</p>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/10">
                <div>
                  <h3 className="text-base font-semibold text-[#F5F6FA]">
                    {candidates.length} contact{candidates.length > 1 ? "s" : ""} détecté{candidates.length > 1 ? "s" : ""}
                  </h3>
                  <p className="text-xs text-[#9AA0B2]">
                    {candidates.filter(c => c.isDuplicate).length} doublon(s) potentiel(s) détecté(s).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleSelectAll(true)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 text-[#F5F6FA] transition-colors"
                  >
                    Tout sélectionner
                  </button>
                  <button 
                    onClick={() => handleSelectAll(false)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 text-[#9AA0B2] hover:text-[#F5F6FA] transition-colors"
                  >
                    Tout désélectionner
                  </button>
                </div>
              </div>

              {/* List of candidates */}
              <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                {candidates.map((cand) => (
                  <div 
                    key={cand.id}
                    className={`p-4 rounded-xl border transition-all ${
                      cand.selected 
                        ? "bg-white/[0.04] border-white/15 shadow-md" 
                        : "bg-white/[0.01] border-white/5 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <input 
                          type="checkbox"
                          checked={cand.selected}
                          onChange={() => handleToggleSelect(cand.id)}
                          className="mt-1 w-4 h-4 rounded border-white/20 bg-black/40 text-[#D81A45] focus:ring-[#D81A45]"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-[#F5F6FA]">{cand.fullName}</h4>
                            <Badge variant={
                              cand.category === "alumni" ? "blue" :
                              cand.category === "recruiter" ? "error" :
                              cand.category === "student" ? "purple" :
                              cand.category === "sector_pro" ? "green" : "gray"
                            }>
                              {cand.category}
                            </Badge>
                            {cand.isDuplicate && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                <AlertCircle className="w-3 h-3" /> Doublon : {cand.duplicateReason}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#9AA0B2] mt-1">
                            <span className="text-[#F5F6FA] font-medium">{cand.jobTitle}</span> chez <span className="text-[#F5F6FA] font-medium">{cand.companyName}</span>
                          </p>
                          {(cand.email || cand.linkedinUrl || cand.location) && (
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-[#9AA0B2]">
                              {cand.email && <span>📧 {cand.email}</span>}
                              {cand.location && <span>📍 {cand.location}</span>}
                              {cand.linkedinUrl && <span className="text-[#C084FC] truncate max-w-[200px]">🔗 {cand.linkedinUrl}</span>}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Duplicate action selector */}
                      {cand.isDuplicate ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <select
                            value={cand.action}
                            onChange={(e) => handleActionChange(cand.id, e.target.value as any)}
                            className="text-xs bg-black/50 border border-white/15 rounded-lg px-2.5 py-1.5 text-[#F5F6FA] focus:outline-none focus:border-[#D81A45]"
                          >
                            <option value="skip">Ignorer</option>
                            <option value="import">Ajouter quand même</option>
                            <option value="merge">Fusionner avec l'existant</option>
                          </select>
                        </div>
                      ) : (
                        <div className="shrink-0 text-xs text-emerald-400 font-medium flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Prêt
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-white/10">
                <GlassButton variant="secondary" onClick={() => setStep("input")}>
                  ← Retour au texte
                </GlassButton>
                <GlassButton 
                  variant="primary" 
                  onClick={handleConfirmImport}
                  disabled={candidates.filter(c => c.selected && c.action !== "skip").length === 0}
                  icon={<UserCheck className="w-4 h-4" />}
                >
                  Importer {candidates.filter(c => c.selected && c.action !== "skip").length} contact(s)
                </GlassButton>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-[#F5F6FA]">Importation terminée avec succès !</h3>
                <p className="text-sm text-[#9AA0B2]">
                  Vos contacts ont été ajoutés à NACORA en préservant vos contacts existants.
                </p>
              </div>

              <div className="flex gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/10 text-sm">
                <div><span className="font-bold text-emerald-400">{importSummary.added}</span> ajoutés</div>
                <div>•</div>
                <div><span className="font-bold text-[#C084FC]">{importSummary.merged}</span> fusionnés</div>
                <div>•</div>
                <div><span className="font-bold text-[#9AA0B2]">{importSummary.skipped}</span> ignorés</div>
              </div>

              <div className="pt-4">
                <GlassButton variant="primary" onClick={handleClose}>
                  Fermer et voir les contacts
                </GlassButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function parseContactsLocally(text: string) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  let globalContactUrl = "";
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const allUrls = text.match(urlRegex) || [];
  if (allUrls.length > 0) {
    const nonLinkedinUrl = allUrls.find(u => !u.toLowerCase().includes("linkedin.com"));
    if (nonLinkedinUrl) {
      globalContactUrl = nonLinkedinUrl;
    } else if (allUrls[0]) {
      globalContactUrl = allUrls[0];
    }
  }

  const contacts = [];
  let currentName = "";
  let currentJob = "";
  let currentCompany = "";
  let currentLinkedIn = "";
  let currentEmail = "";

  for (const line of lines) {
    if (line.toLowerCase().includes("linkedin.com/")) {
      currentLinkedIn = line;
      continue;
    }
    if (line.startsWith("http") && line !== globalContactUrl) {
      if (!currentLinkedIn && line.toLowerCase().includes("linkedin")) {
        currentLinkedIn = line;
      }
      continue;
    }
    if (line.includes("@")) {
      currentEmail = line;
      continue;
    }

    if (!currentName) {
      currentName = line;
    } else if (!currentJob) {
      currentJob = line;
    } else if (!currentCompany) {
      currentCompany = line;
      contacts.push({
        firstName: currentName.split(" ")[0] || "",
        lastName: currentName.split(" ").slice(1).join(" ") || "",
        fullName: currentName,
        jobTitle: currentJob || "Professionnel",
        companyName: currentCompany || "Entreprise",
        category: "other_pro" as const,
        linkedinUrl: currentLinkedIn,
        email: currentEmail,
        contactUrl: globalContactUrl || "",
        notes: "Importé par texte (mode local)",
        relevanceScore: 65,
        connectionPoints: ["Importé par texte"]
      });
      currentName = "";
      currentJob = "";
      currentCompany = "";
      currentLinkedIn = "";
      currentEmail = "";
    }
  }

  if (currentName) {
    contacts.push({
      firstName: currentName.split(" ")[0] || "",
      lastName: currentName.split(" ").slice(1).join(" ") || "",
      fullName: currentName,
      jobTitle: currentJob || "Professionnel",
      companyName: currentCompany || "Entreprise",
      category: "other_pro" as const,
      linkedinUrl: currentLinkedIn,
      email: currentEmail,
      contactUrl: globalContactUrl || "",
      notes: "Importé par texte (mode local)",
      relevanceScore: 60,
      connectionPoints: ["Importé par texte"]
    });
  }

  if (contacts.length === 0 && text.trim().length > 0) {
    contacts.push({
      firstName: "Contact",
      lastName: "Importé",
      fullName: text.trim().substring(0, 40),
      jobTitle: "Professionnel",
      companyName: "Organisation",
      category: "other" as const,
      contactUrl: globalContactUrl || "",
      notes: text.trim(),
      relevanceScore: 50,
      connectionPoints: ["Import textuel"]
    });
  }

  return contacts;
}
