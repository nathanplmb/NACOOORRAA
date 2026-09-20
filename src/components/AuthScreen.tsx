import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Shield, ArrowRight, Loader2, Sparkles, CheckCircle2 } from "lucide-react";

export const AuthScreen: React.FC<{ onOpenPrivacy?: () => void; onOpenTerms?: () => void }> = ({ onOpenPrivacy, onOpenTerms }) => {
  const { loginWithGoogle, authError, clearError } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    clearError();
    setIsLoading(true);
    try {
      await loginWithGoogle();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#060812] flex items-center justify-center p-4 md:p-8 overflow-hidden text-[#F5F6FA] font-sans">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#D81A45]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md mx-auto space-y-8">
        
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#D81A45] to-[#FF6685] font-black text-white text-3xl shadow-[0_0_40px_rgba(216,26,69,0.4)] border border-white/20 mb-1">
            N
          </div>
          <h1 className="text-3xl font-black text-[#F5F6FA] tracking-wider font-display">NACORA</h1>
          <p className="text-sm text-[#9AA0B2] max-w-xs mx-auto">
            Plateforme haut de gamme de pilotage de candidatures et networking intelligent.
          </p>
        </div>

        {/* Auth Card */}
        <div className="relative rounded-3xl bg-[#0B0F19]/90 border border-white/10 p-8 shadow-[0_25px_60px_-10px_rgba(0,0,0,0.85)] backdrop-blur-2xl space-y-6">
          
          {authError && (
            <div className="p-4 rounded-2xl bg-[#D81A45]/10 border border-[#D81A45]/30 text-xs text-[#FF6685] flex items-center space-x-3">
              <span className="flex-1">{authError}</span>
            </div>
          )}

          <div className="space-y-4 text-center">
            <h2 className="text-lg font-bold text-white tracking-wide">Connexion sécurisée</h2>
            <p className="text-xs text-[#9AA0B2]">
              Accédez instantanément à votre espace candidat personnalisé avec votre compte Google.
            </p>
          </div>

          {/* Google Sign-in Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full relative group overflow-hidden rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/15 py-4 px-6 transition-all duration-300 flex items-center justify-center space-x-3 shadow-lg cursor-pointer active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-white/[0.08] opacity-0 group-hover:opacity-100 transition-opacity" />
            
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-[#D81A45] animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.19v3.15C3.17 21.36 7.23 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.19C.43 8.1 0 9.99 0 12s.43 3.9 1.19 5.42l4.09-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.23 0 3.17 2.64 1.19 6.58l4.09 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span className="text-sm font-bold text-white tracking-wide">
                  Continuer avec Google
                </span>
                <ArrowRight className="w-4 h-4 text-[#9AA0B2] group-hover:text-white group-hover:translate-x-1 transition-all" />
              </>
            )}
          </button>

          {/* Feature Highlights */}
          <div className="pt-4 border-t border-white/10 space-y-2.5">
            <div className="flex items-center space-x-2.5 text-xs text-[#9AA0B2]">
              <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0" />
              <span>Synchronisation cloud temps réel et multi-appareils</span>
            </div>
            <div className="flex items-center space-x-2.5 text-xs text-[#9AA0B2]">
              <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0" />
              <span>Importation de CV par IA et extraction automatique</span>
            </div>
          </div>

          {/* Footer Security Note */}
          <div className="flex items-center justify-center space-x-2 text-[11px] text-[#9AA0B2]/70 pt-2">
            <Shield className="w-3.5 h-3.5 text-[#D81A45]" />
            <span>Sécurité renforcée et conformité RGPD</span>
          </div>

        </div>

        {/* Legal Links */}
        <div className="text-center text-xs text-[#9AA0B2] space-x-4">
          {onOpenPrivacy && (
            <button onClick={onOpenPrivacy} className="hover:text-white transition-colors cursor-pointer">
              Politique de confidentialité
            </button>
          )}
          {onOpenTerms && (
            <button onClick={onOpenTerms} className="hover:text-white transition-colors cursor-pointer">
              Conditions d'utilisation
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
