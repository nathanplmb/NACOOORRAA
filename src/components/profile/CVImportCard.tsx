import React from "react";
import { Sparkles, FileText, Upload, ShieldCheck, CheckCircle2, ArrowRight } from "lucide-react";

interface CVImportCardProps {
  onOpenImportModal: () => void;
}

export const CVImportCard: React.FC<CVImportCardProps> = ({ onOpenImportModal }) => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-white/[0.01] p-6 backdrop-blur-2xl transition-all duration-300 hover:border-[#D81A45]/40 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] group">
      {/* Specular Top Hairline */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      
      {/* Subtle Background Accent Light Glow */}
      <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-[#D81A45]/10 rounded-full blur-3xl pointer-events-none group-hover:bg-[#D81A45]/20 transition-all duration-500" />
      <div className="absolute -left-10 -top-10 w-40 h-40 bg-[#C084FC]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D81A45]/10 border border-[#D81A45]/25 text-[#FF6685] text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-[#FF6685]" />
            <span>Analyse IA & Extraction Automatique</span>
          </div>

          <h3 className="text-xl font-bold text-[#F5F6FA] tracking-tight flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-[#D81A45]" />
            CV Structuré & Import
          </h3>

          <p className="text-sm text-[#9AA0B2] leading-relaxed">
            Importez votre CV (PDF, DOCX ou texte) pour pré-remplir automatiquement l'ensemble de votre profil NACORA : identité, expériences, formations, compétences et langues.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-[#9AA0B2]">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-white/80 font-mono">
              PDF
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-white/80 font-mono">
              DOCX
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-white/80 font-mono">
              TXT
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4" />
              Conservation garantie des données existantes
            </span>
          </div>
        </div>

        <div className="w-full md:w-auto flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
          <button
            onClick={onOpenImportModal}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#D81A45] to-[#B01235] hover:from-[#E62250] hover:to-[#C2153C] text-white font-semibold text-sm shadow-[0_4px_20px_rgba(216,26,69,0.35)] hover:shadow-[0_6px_28px_rgba(216,26,69,0.5)] transition-all duration-200 flex items-center justify-center gap-2.5 group/btn cursor-pointer active:scale-[0.98]"
          >
            <Upload className="w-4 h-4 transition-transform group-hover/btn:-translate-y-0.5" />
            <span>Importer un CV</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1 opacity-80" />
          </button>
        </div>
      </div>
    </div>
  );
};
