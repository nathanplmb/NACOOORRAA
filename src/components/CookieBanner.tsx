import React, { useState, useEffect } from "react";
import { ShieldCheck, X } from "lucide-react";

export function CookieBanner() {
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("nacora_cookie_consent");
    if (consent) {
      setAccepted(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("nacora_cookie_consent", "true");
    setAccepted(true);
  };

  const handleDecline = () => {
    localStorage.setItem("nacora_cookie_consent", "false");
    setAccepted(true);
  };

  if (accepted) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 p-5 rounded-2xl bg-[#0B0F19]/95 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-slate-100 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 text-[#FF6685]">
          <ShieldCheck className="w-5 h-5 flex-shrink-0" />
          <h3 className="font-semibold text-sm tracking-wide text-white">Transparence & Confidentialité</h3>
        </div>
        <button 
          onClick={handleDecline} 
          className="text-slate-400 hover:text-white transition-colors"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-[#9AA0B2] leading-relaxed">
        NACORA utilise uniquement le stockage local de votre navigateur (<code className="text-slate-300 bg-white/5 px-1 py-0.5 rounded">localStorage</code> / <code className="text-slate-300 bg-white/5 px-1 py-0.5 rounded">IndexedDB</code> via Firebase Auth) pour maintenir votre session sécurisée et stocker vos opportunités de carrière. Aucun cookie publicitaire ou traceur tiers n'est utilisé.
      </p>
      <div className="flex items-center justify-end gap-3 pt-1">
        <button
          onClick={handleDecline}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-[#9AA0B2] hover:text-white hover:bg-white/5 transition-colors"
        >
          Refuser
        </button>
        <button
          onClick={handleAccept}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#D81A45] hover:bg-[#b51337] text-white shadow-lg shadow-[#D81A45]/25 transition-all"
        >
          Tout accepter
        </button>
      </div>
    </div>
  );
}
