import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { dbStore } from "../dbStore";
import { DocumentFile } from "../types";
import { GlassButton, Modal, GlassCard, Badge } from "../components/Shared";
import { 
  FileText, 
  Plus, 
  Trash2, 
  Upload, 
  Clock, 
  Sparkles, 
  Layers, 
  Eye, 
  Bot, 
  CheckCircle2, 
  Search,
  Filter,
  FileCheck,
  Send,
  Loader2
} from "lucide-react";
import { CVStudio } from "../components/cv/CVStudio";
import { MultiCVFusionModal } from "../components/profile/MultiCVFusionModal";

export const Documents: React.FC = () => {
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"dossier" | "cv_studio">("dossier");
  const [docs, setDocs] = useState<DocumentFile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  
  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isFusionOpen, setIsFusionOpen] = useState(false);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<DocumentFile | null>(null);

  // Add Doc Form State
  const [title, setTitle] = useState("");
  const [type, setType] = useState<DocumentFile["type"]>("CV");
  const [content, setContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: string } | null>(null);

  useEffect(() => {
    setDocs(dbStore.getDocuments());
    const unsub = dbStore.subscribe(() => {
      setDocs(dbStore.getDocuments());
    });
    return unsub;
  }, []);

  const showToast = (text: string, type: "success" | "error" | "info" | "ai" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleFileUpload = async (file: File) => {
    setFileName(file.name);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "));
    }
    setIsParsingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-document", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.text) {
        setContent(data.text);
        showToast("Texte extrait avec succès !", "success");
      } else {
        throw new Error(data.error || "Impossible d'extraire le texte");
      }
    } catch (e: any) {
      console.error(e);
      showToast(e.message || "Erreur lors de l'extraction", "error");
    } finally {
      setIsParsingFile(false);
    }
  };

  const handleAddDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    dbStore.addDocument({
      title,
      type,
      content,
      fileName: fileName || `${title.toLowerCase().replace(/\s+/g, "_")}.pdf`
    });

    setTitle("");
    setContent("");
    setFileName("");
    setIsAddOpen(false);
    showToast("Document indexé pour l'IA avec succès", "ai");
  };

  const handleDeleteDoc = (id: string) => {
    dbStore.deleteDocument(id);
    showToast("Document supprimé", "info");
  };

  const filteredDocs = docs.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (doc.content || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "ALL" || doc.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="relative z-10 w-full space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#090C16] border border-[#FF6685]/40 text-white shadow-2xl text-xs font-semibold animate-in slide-in-from-bottom-2">
          <Sparkles className="w-4 h-4 text-[#FF6685]" />
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl lg:text-3xl font-black text-[#F5F6FA] tracking-tight font-display">
              {language === "en" ? "Documents & CV Studio" : "Documents & CV Studio"}
            </h1>
            <Badge variant="crimson">Indexé IA</Badge>
          </div>
          <p className="text-[#9AA0B2] text-xs sm:text-sm mt-0.5">
            {language === "en" 
              ? "Manage your portfolio documents, leverage AI context indexing, and edit with the 1-page CV Studio."
              : "Gérez vos documents, profitez de l'indexation IA globale et optimisez votre parcours avec le CV Studio 1-page."}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5">
          <GlassButton 
            variant="ghost" 
            size="md" 
            onClick={() => setIsFusionOpen(true)}
            icon={<Layers className="w-3.5 h-3.5 text-[#38BDF8]" />}
          >
            {language === "en" ? "Multi-CV Fusion" : "Fusion Multi-CV"}
          </GlassButton>

          <GlassButton 
            variant="primary" 
            size="md" 
            onClick={() => setIsAddOpen(true)} 
            icon={<Plus className="w-3.5 h-3.5 text-white" />}
          >
            {language === "en" ? "Import Document" : "Importer un Document"}
          </GlassButton>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-white/[0.03] border border-white/10 w-fit">
        <button
          onClick={() => setActiveTab("dossier")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "dossier"
              ? "bg-[rgba(216,26,69,0.2)] text-[#FF6685] border border-[rgba(216,26,69,0.3)] shadow-sm"
              : "text-[#9AA0B2] hover:text-[#F5F6FA]"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Dossier Candidat & Indexation IA ({docs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("cv_studio")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "cv_studio"
              ? "bg-[rgba(216,26,69,0.2)] text-[#FF6685] border border-[rgba(216,26,69,0.3)] shadow-sm"
              : "text-[#9AA0B2] hover:text-[#F5F6FA]"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>NACORA CV Studio (1-Page)</span>
        </button>
      </div>

      {/* Tab 1: Dossier & Indexation */}
      {activeTab === "dossier" && (
        <div className="space-y-5">
          {/* Documents Dossier Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[rgba(216,26,69,0.12)] via-white/[0.02] to-transparent border border-[rgba(216,26,69,0.2)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[rgba(216,26,69,0.2)] text-[#FF6685] shrink-0">
                <FileCheck className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <strong className="text-[#F5F6FA] block">Dossier de candidature & documents centralisés</strong>
                <span className="text-[#9AA0B2]">
                  Vos synthèses d'activité, fiches de suivi et simulations d'entretien s'appuient sur ces éléments pour des conseils sur mesure.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-[#34D399] font-mono bg-[#34D399]/10 px-2.5 py-1 rounded-full border border-[#34D399]/30 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" />
                {docs.length} document(s) enregistré(s)
              </span>
            </div>
          </div>

          {/* Search & Filter bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-[#9AA0B2] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher dans vos documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full glass-input pl-10 pr-4 py-2 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {["ALL", "CV", "Lettre de Motivation", "Autre"].map(filterKey => (
                <button
                  key={filterKey}
                  onClick={() => setTypeFilter(filterKey)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                    typeFilter === filterKey
                      ? "bg-white/10 text-white border border-white/20"
                      : "text-[#9AA0B2] hover:text-white bg-white/[0.02]"
                  }`}
                >
                  {filterKey === "ALL" ? "Tous les types" : filterKey}
                </button>
              ))}
            </div>
          </div>

          {/* Grid of Documents */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDocs.length === 0 ? (
              <div className="col-span-full p-10 rounded-2xl border border-dashed border-white/10 text-center space-y-3">
                <FileText className="w-8 h-8 text-[#9AA0B2] mx-auto opacity-50" />
                <p className="text-[#9AA0B2] text-xs">
                  {searchQuery ? "Aucun document ne correspond à votre recherche." : "Aucun document dans votre dossier pour le moment."}
                </p>
                <GlassButton variant="primary" size="sm" onClick={() => setIsAddOpen(true)}>
                  Importer votre premier document
                </GlassButton>
              </div>
            ) : (
              filteredDocs.map(doc => (
                <GlassCard key={doc.id} className="p-5 flex flex-col justify-between" hoverable>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-gradient-to-tr from-[rgba(216,26,69,0.2)] to-[rgba(255,26,85,0.1)] text-[#FF6685] border border-[rgba(216,26,69,0.3)]">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-[#F5F6FA] font-display line-clamp-1">{doc.title}</h3>
                          <span className="text-[9px] text-[#9AA0B2] bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/5">
                            {doc.type}
                          </span>
                        </div>
                      </div>

                      <span className="text-[9px] text-[#34D399] bg-[#34D399]/10 px-2 py-0.5 rounded-md border border-[#34D399]/20 flex items-center gap-1 font-mono">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Indexé
                      </span>
                    </div>

                    {/* Excerpt */}
                    {doc.content ? (
                      <p className="text-[11px] text-[#9AA0B2] line-clamp-3 bg-black/20 p-2.5 rounded-lg border border-white/5 font-mono mb-3">
                        {doc.content}
                      </p>
                    ) : (
                      <p className="text-[10px] text-[#9AA0B2]/60 italic mb-3">Fichier indexé sans aperçu texte direct.</p>
                    )}

                    <div className="text-[10px] text-[#9AA0B2] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#9AA0B2]" />
                      <span>Ajouté le {new Date(doc.uploadedAt).toLocaleDateString(language === "en" ? "en-US" : "fr-FR")}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                    <span className="text-[10px] text-[#9AA0B2] truncate max-w-[140px] font-mono">{doc.fileName}</span>
                    <div className="flex items-center gap-1.5">
                      {doc.content && (
                        <button
                          onClick={() => setSelectedDocForPreview(doc)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#9AA0B2] hover:text-white transition-all cursor-pointer"
                          title="Aperçu complet"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button 
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-[rgba(240,68,56,0.15)] text-[#9AA0B2] hover:text-[#F04438] transition-all cursor-pointer border border-transparent hover:border-[rgba(240,68,56,0.3)]"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </GlassCard>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: CV Studio */}
      {activeTab === "cv_studio" && (
        <CVStudio onNotify={showToast} />
      )}

      {/* Modal Import Document */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Ajouter un document au dossier IA" size="md">
        <form onSubmit={handleAddDoc} className="space-y-4">
          {/* File Upload Zone */}
          <div className="p-4 rounded-xl border-2 border-dashed border-white/10 hover:border-[#FF6685]/50 bg-white/[0.02] text-center transition-all">
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              id="doc-file-upload"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />
            <label htmlFor="doc-file-upload" className="cursor-pointer flex flex-col items-center gap-1.5">
              <Upload className="w-4 h-4 text-[#FF6685]" />
              <span className="text-xs font-bold text-white">
                {isParsingFile ? "Extraction en cours..." : fileName ? fileName : "Déposer un fichier (PDF, Word, TXT)"}
              </span>
              <span className="text-[10px] text-[#9AA0B2]">L'IA extrait automatiquement le contenu textuel</span>
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#9AA0B2] font-semibold">Titre du document *</label>
            <input
              type="text"
              required
              placeholder="ex: CV Alternance Finance 2026, Lettre BNP..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="glass-input px-3.5 py-2.5 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#9AA0B2] font-semibold">Catégorie</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="glass-input px-3.5 py-2.5 text-xs text-[#F5F6FA] bg-[#060812]"
            >
              <option value="CV" className="bg-[#060812] text-[#F5F6FA]">CV</option>
              <option value="Lettre de Motivation" className="bg-[#060812] text-[#F5F6FA]">Lettre de Motivation</option>
              <option value="Autre" className="bg-[#060812] text-[#F5F6FA]">Autre (Bilan, Notes d'entretien...)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#9AA0B2] font-semibold">Contenu texte (utilisé pour le contexte IA global)</label>
            <textarea
              placeholder="Texte extrait ou collé du document..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-[130px] glass-input p-3 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60 leading-relaxed font-mono"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <GlassButton type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>
              Annuler
            </GlassButton>
            <GlassButton type="submit" variant="primary" disabled={isParsingFile}>
              {isParsingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Enregistrer & Indexer"}
            </GlassButton>
          </div>
        </form>
      </Modal>

      {/* Modal Preview Document Content */}
      {selectedDocForPreview && (
        <Modal 
          isOpen={true} 
          onClose={() => setSelectedDocForPreview(null)} 
          title={selectedDocForPreview.title}
          size="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-[#9AA0B2] border-b border-white/10 pb-2">
              <span>Type : <strong className="text-white">{selectedDocForPreview.type}</strong></span>
              <span className="font-mono text-[10px]">{selectedDocForPreview.fileName}</span>
            </div>
            <div className="p-4 rounded-xl bg-black/40 border border-white/5 max-h-[400px] overflow-y-auto text-xs text-[#F5F6FA] whitespace-pre-wrap font-mono leading-relaxed">
              {selectedDocForPreview.content || "Aucun contenu textuel."}
            </div>
            <div className="flex justify-end pt-2">
              <GlassButton variant="ghost" size="sm" onClick={() => setSelectedDocForPreview(null)}>
                Fermer
              </GlassButton>
            </div>
          </div>
        </Modal>
      )}

      {/* Multi-CV Fusion Modal */}
      <MultiCVFusionModal
        isOpen={isFusionOpen}
        onClose={() => setIsFusionOpen(false)}
        onSuccess={(msg) => showToast(msg, "ai")}
      />
    </div>
  );
};
