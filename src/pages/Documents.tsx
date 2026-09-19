import React, { useState, useEffect } from "react";
import { dbStore } from "../dbStore";
import { DocumentFile } from "../types";
import { GlassButton, Modal, GlassCard } from "../components/Shared";
import { FileText, Plus, Trash2, Upload, FileDown, Clock } from "lucide-react";

export const Documents: React.FC = () => {
  const [docs, setDocs] = useState<DocumentFile[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [type, setType] = useState<DocumentFile["type"]>("CV");
  const [content, setContent] = useState("");

  useEffect(() => {
    setDocs(dbStore.getDocuments());
    const unsub = dbStore.subscribe(() => {
      setDocs(dbStore.getDocuments());
    });
    return unsub;
  }, []);

  const handleAddDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    dbStore.addDocument({
      title,
      type,
      content,
      fileName: `${title.toLowerCase().replace(/\s+/g, "_")}.pdf`
    });

    setTitle("");
    setContent("");
    setIsAddOpen(false);
  };

  const handleDeleteDoc = (id: string) => {
    dbStore.deleteDocument(id);
  };

  return (
    <div className="relative z-10 w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-[#F5F6FA] tracking-tight font-display whitespace-nowrap">Bibliothèque de Documents</h1>
          <p className="text-[#9AA0B2] text-xs sm:text-sm mt-0.5">Gère tes versions de CV, tes modèles de lettres de motivation et tes diplômes officiels</p>
        </div>
        <GlassButton variant="primary" size="md" onClick={() => setIsAddOpen(true)} icon={<Plus className="w-3.5 h-3.5 text-white" />}>
          Ajouter un document
        </GlassButton>
      </div>

      {/* List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {docs.length === 0 ? (
          <div className="col-span-full p-8 rounded-2xl border border-dashed border-white/10 text-center text-[#9AA0B2] text-xs">
            Aucun document de téléversé. Ajoutes-en un pour l'avoir sous la main !
          </div>
        ) : (
          docs.map(doc => (
            <GlassCard key={doc.id} className="p-5 flex flex-col justify-between" hoverable>
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-gradient-to-tr from-[rgba(216,26,69,0.2)] to-[rgba(255,26,85,0.1)] text-[#FF6685] border border-[rgba(216,26,69,0.3)]">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#F5F6FA] font-display">{doc.title}</h3>
                    <span className="text-[9px] text-[#9AA0B2] bg-white/[0.04] px-2.5 py-0.5 rounded-full border border-white/5">
                      {doc.type}
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-[#9AA0B2] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#9AA0B2]" />
                  <span>Ajouté le {new Date(doc.uploadedAt).toLocaleDateString("fr-FR")}</span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-[10px] text-[#9AA0B2] truncate max-w-[150px] font-mono">{doc.fileName}</span>
                <button 
                  onClick={() => handleDeleteDoc(doc.id)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-[rgba(240,68,56,0.15)] text-[#9AA0B2] hover:text-[#F04438] transition-spring cursor-pointer border border-transparent hover:border-[rgba(240,68,56,0.3)]"
                  title="Supprimer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </GlassCard>
          ))
        )}
      </div>

      {/* --- ADD DOC MODAL --- */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Ajouter un document à mon dossier" size="md">
        <form onSubmit={handleAddDoc} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#9AA0B2] font-semibold">Titre du document *</label>
            <input
              type="text"
              required
              placeholder="ex: CV Alternance Finance 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="glass-input px-3.5 py-2.5 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#9AA0B2] font-semibold">Type de document</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="glass-input px-3.5 py-2.5 text-xs text-[#F5F6FA] bg-[#060812]"
            >
              <option value="CV" className="bg-[#060812] text-[#F5F6FA]">Curriculum Vitae (CV)</option>
              <option value="Lettre de Motivation" className="bg-[#060812] text-[#F5F6FA]">Lettre de Motivation</option>
              <option value="Autre" className="bg-[#060812] text-[#F5F6FA]">Autre (Diplôme, Certification)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#9AA0B2] font-semibold">Contenu texte (pour indexation par l'IA)</label>
            <textarea
              placeholder="Colle le texte brut de ton document ici afin que l'IA de NACORA puisse l'analyser..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-[140px] glass-input p-3.5 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60 leading-relaxed font-mono"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <GlassButton type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>
              Annuler
            </GlassButton>
            <GlassButton type="submit" variant="primary">
              Ajouter le document
            </GlassButton>
          </div>
        </form>
      </Modal>
    </div>
  );
};
