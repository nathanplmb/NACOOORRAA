import React from "react";
import { Compass, Home } from "lucide-react";

interface NotFoundProps {
  onGoHome: () => void;
}

export function NotFound({ onGoHome }: NotFoundProps) {
  return (
    <div className="min-h-screen bg-[#070913] text-[#F5F6FA] flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-xl shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#D81A45]/10 border border-[#D81A45]/30 flex items-center justify-center text-[#FF6685] mx-auto shadow-[0_0_30px_rgba(216,26,69,0.3)]">
          <Compass className="w-8 h-8 animate-pulse" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black font-display tracking-tight text-white">Page introuvable</h1>
          <p className="text-sm text-[#9AA0B2]">
            La page que vous recherchez n'existe pas ou a été déplacée dans l'écosystème NACORA.
          </p>
        </div>
        <button
          onClick={onGoHome}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#D81A45] hover:bg-[#b51337] text-white font-semibold shadow-lg shadow-[#D81A45]/30 transition-all text-sm"
        >
          <Home className="w-4 h-4" />
          Retour à l'accueil
        </button>
      </div>
    </div>
  );
}
