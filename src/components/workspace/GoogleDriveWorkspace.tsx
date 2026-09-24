import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { dbStore } from "../../dbStore";
import { 
  listGoogleDriveFiles, 
  exportGoogleDocAsText, 
  uploadTextFileToDrive, 
  GoogleDriveFile 
} from "../../services/googleDriveService";
import { createGoogleDoc } from "../../services/googleDocsService";
import { GlassCard, GlassButton, Badge, Modal } from "../Shared";
import { 
  FolderGit2, 
  FileText, 
  Download, 
  Upload, 
  ExternalLink, 
  Search, 
  RefreshCw, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  FileCode, 
  Sparkles,
  Loader2,
  HardDrive
} from "lucide-react";

interface GoogleDriveWorkspaceProps {
  onDocumentImported?: (title: string) => void;
}

export const GoogleDriveWorkspace: React.FC<GoogleDriveWorkspaceProps> = ({ onDocumentImported }) => {
  const { accessToken, connectGoogleWorkspace } = useAuth();
  const { language } = useLanguage();

  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMime, setFilterMime] = useState<string>("ALL");
  const [error, setError] = useState<string | null>(null);

  // New Doc modal state
  const [isNewDocOpen, setIsNewDocOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocContent, setNewDocContent] = useState("");
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);

  // Import state
  const [importingId, setImportingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" | "ai" } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "ai" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadDriveFiles = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listGoogleDriveFiles(accessToken, { pageSize: 35 });
      setFiles(data);
    } catch (e: any) {
      console.error("Error loading drive files:", e);
      setError(e.message || "Erreur lors de la récupération des fichiers Google Drive.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      loadDriveFiles();
    }
  }, [accessToken]);

  const handleImportToNacora = async (file: GoogleDriveFile) => {
    if (!accessToken) return;
    setImportingId(file.id);
    try {
      let extractedText = "";
      if (file.mimeType === "application/vnd.google-apps.document") {
        extractedText = await exportGoogleDocAsText(accessToken, file.id);
      } else {
        extractedText = `Fichier Google Drive : ${file.name}\nLien : ${file.webViewLink || "Non disponible"}`;
      }

      const docType = file.name.toLowerCase().includes("cv") ? "CV" : 
                      file.name.toLowerCase().includes("lettre") || file.name.toLowerCase().includes("motivation") ? "LETTRE" : "AUTRE";

      dbStore.addDocument({
        title: file.name.replace(/\.[^/.]+$/, ""),
        type: docType as any,
        content: extractedText,
        fileName: file.name
      });

      showToast(`« ${file.name} » importé avec succès dans le Dossier IA !`, "ai");
      if (onDocumentImported) {
        onDocumentImported(file.name);
      }
    } catch (e: any) {
      console.error(e);
      showToast(`Erreur d'importation : ${e.message}`, "error");
    } finally {
      setImportingId(null);
    }
  };

  const handleCreateGoogleDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !newDocTitle.trim()) return;

    setIsCreatingDoc(true);
    try {
      const res = await createGoogleDoc(accessToken, newDocTitle.trim(), newDocContent.trim());
      showToast(`Google Doc « ${res.title} » créé avec succès !`, "success");
      setIsNewDocOpen(false);
      setNewDocTitle("");
      setNewDocContent("");
      await loadDriveFiles();
      
      // Open in new tab
      if (res.webViewLink) {
        window.open(res.webViewLink, "_blank", "noopener,noreferrer");
      }
    } catch (e: any) {
      showToast(`Erreur création Google Doc : ${e.message}`, "error");
    } finally {
      setIsCreatingDoc(false);
    }
  };

  const filteredFiles = files.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMime = 
      filterMime === "ALL" ? true :
      filterMime === "DOCS" ? f.mimeType.includes("document") :
      filterMime === "PDF" ? f.mimeType.includes("pdf") :
      filterMime === "SHEETS" ? f.mimeType.includes("spreadsheet") : true;
    return matchesSearch && matchesMime;
  });

  if (!accessToken) {
    return (
      <div className="space-y-6">
        <GlassCard className="p-8 text-center space-y-5 border-white/10 relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-[#38BDF8]/10 border border-[#38BDF8]/25 flex items-center justify-center mx-auto text-[#38BDF8] shadow-[0_0_25px_rgba(56,189,248,0.15)]">
            <HardDrive className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-[#F5F6FA]">Connecter Google Drive & Google Docs</h3>
            <p className="text-xs text-[#9AA0B2] leading-relaxed">
              Associez votre compte Google Workspace pour explorer vos fichiers Drive, créer des documents Google Docs et exporter directement vos fiches et CVs.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <GlassButton
              variant="primary"
              size="md"
              onClick={async () => {
                try {
                  await connectGoogleWorkspace();
                } catch (e: any) {
                  showToast(`Échec connexion : ${e.message}`, "error");
                }
              }}
              icon={<HardDrive className="w-4 h-4" />}
            >
              Connecter Google Workspace
            </GlassButton>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 backdrop-blur-xl animate-fade-in ${
          toastMsg.type === "success" 
            ? "bg-[#34D399]/15 border-[#34D399]/30 text-[#34D399]" 
            : toastMsg.type === "ai"
            ? "bg-[#C084FC]/15 border-[#C084FC]/30 text-[#C084FC]"
            : "bg-[#F87171]/15 border-[#F87171]/30 text-[#F87171]"
        }`}>
          {toastMsg.type === "ai" ? <Sparkles className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#38BDF8]/10 border border-[#38BDF8]/20 flex items-center justify-center text-[#38BDF8]">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#F5F6FA]">Google Drive & Google Docs</h3>
              <Badge variant="blue">Connecté</Badge>
            </div>
            <p className="text-xs text-[#9AA0B2]">
              Consultez vos CVs, lettres et importez-les dans votre Dossier IA NACORA
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <GlassButton
            variant="secondary"
            size="sm"
            onClick={loadDriveFiles}
            disabled={loading}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#38BDF8]" : ""}`} />}
          >
            Actualiser
          </GlassButton>
          <GlassButton
            variant="primary"
            size="sm"
            onClick={() => setIsNewDocOpen(true)}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Nouveau Google Doc
          </GlassButton>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9AA0B2]" />
          <input
            type="text"
            placeholder="Rechercher un fichier Drive..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-[#F5F6FA] placeholder-[#9AA0B2] focus:outline-none focus:border-[#38BDF8]/50"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-white/[0.02] border border-white/10 rounded-xl w-full sm:w-auto overflow-x-auto">
          {[
            { id: "ALL", label: "Tous" },
            { id: "DOCS", label: "Google Docs" },
            { id: "PDF", label: "PDF" },
            { id: "SHEETS", label: "Tableurs" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterMime(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filterMime === tab.id
                  ? "bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/30 shadow-[0_0_12px_rgba(56,189,248,0.15)]"
                  : "text-[#9AA0B2] hover:text-[#F5F6FA] hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Files List */}
      {loading && files.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-7 h-7 text-[#38BDF8] animate-spin" />
          <p className="text-xs text-[#9AA0B2]">Chargement de vos fichiers Google Drive...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-[#F87171]/10 border border-[#F87171]/20 text-xs text-[#F87171] space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">{error}</p>
              {error.includes("Google Drive API has not been used") && (
                <p className="text-[11px] text-[#F5F6FA]/80">
                  L'API Google Drive doit être activée dans votre projet Google Cloud (1 clic requis).
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <a
              href="https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=350691239439"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#38BDF8] text-[#060812] font-bold text-xs hover:bg-[#38BDF8]/90 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Activer l'API Google Drive dans Google Cloud</span>
            </a>
            <GlassButton size="sm" variant="secondary" onClick={loadDriveFiles}>
              Réessayer
            </GlassButton>
          </div>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="py-12 px-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center">
          <FileText className="w-8 h-8 text-[#9AA0B2]/40 mx-auto mb-2" />
          <p className="text-xs font-medium text-[#F5F6FA]">Aucun fichier trouvé</p>
          <p className="text-[11px] text-[#9AA0B2] mt-1">
            {searchQuery ? "Aucun résultat ne correspond à votre recherche." : "Votre Google Drive ne contient pas encore de document correspondant."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredFiles.map((file) => {
            const isDoc = file.mimeType.includes("document");
            const isPdf = file.mimeType.includes("pdf");
            const isSheet = file.mimeType.includes("spreadsheet");
            const isImporting = importingId === file.id;

            return (
              <div
                key={file.id}
                className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-white/20 transition-all group flex flex-col justify-between gap-3 shadow-lg"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isDoc ? "bg-[#38BDF8]/15 text-[#38BDF8]" :
                        isPdf ? "bg-[#F87171]/15 text-[#F87171]" :
                        isSheet ? "bg-[#34D399]/15 text-[#34D399]" :
                        "bg-white/10 text-[#9AA0B2]"
                      }`}>
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-[#F5F6FA] truncate" title={file.name}>
                          {file.name}
                        </h4>
                        <span className="text-[10px] text-[#9AA0B2]">
                          {isDoc ? "Google Doc" : isPdf ? "Document PDF" : isSheet ? "Google Sheet" : "Fichier"}
                        </span>
                      </div>
                    </div>

                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#9AA0B2] hover:text-[#38BDF8] transition-colors shrink-0"
                        title="Ouvrir dans Google Drive"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-[10px] text-[#9AA0B2]">
                    {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : ""}
                  </span>

                  <GlassButton
                    size="sm"
                    variant={isDoc ? "primary" : "secondary"}
                    disabled={isImporting}
                    onClick={() => handleImportToNacora(file)}
                    icon={isImporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-[#C084FC]" />}
                  >
                    {isImporting ? "Importation..." : "Importer pour l'IA"}
                  </GlassButton>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nouveau Google Doc */}
      <Modal
        isOpen={isNewDocOpen}
        onClose={() => setIsNewDocOpen(false)}
        title="Créer un nouveau Google Doc"
      >
        <form onSubmit={handleCreateGoogleDoc} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#F5F6FA] mb-1">
              Titre du document *
            </label>
            <input
              type="text"
              required
              placeholder="ex: Lettre de motivation - Lead Developer"
              value={newDocTitle}
              onChange={(e) => setNewDocTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-[#F5F6FA] placeholder-[#9AA0B2] focus:outline-none focus:border-[#38BDF8]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#F5F6FA] mb-1">
              Contenu initial (optionnel)
            </label>
            <textarea
              rows={6}
              placeholder="Rédigez ou collez le texte à insérer directement dans votre nouveau Google Doc..."
              value={newDocContent}
              onChange={(e) => setNewDocContent(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-[#F5F6FA] placeholder-[#9AA0B2] focus:outline-none focus:border-[#38BDF8]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <GlassButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsNewDocOpen(false)}
            >
              Annuler
            </GlassButton>
            <GlassButton
              type="submit"
              variant="primary"
              size="sm"
              disabled={isCreatingDoc || !newDocTitle.trim()}
              icon={isCreatingDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
            >
              {isCreatingDoc ? "Création en cours..." : "Créer et ouvrir dans Google Docs"}
            </GlassButton>
          </div>
        </form>
      </Modal>
    </div>
  );
};
