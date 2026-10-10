import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Shield, ArrowRight, Loader2, Sparkles, CheckCircle2, AlertTriangle, ExternalLink, User, Mail, KeyRound, ShieldCheck } from "lucide-react";
import { NacoraLogo, NacoraIcon } from "./NacoraLogo";

export const AuthScreen: React.FC<{ onOpenPrivacy?: () => void; onOpenTerms?: () => void }> = ({ onOpenPrivacy, onOpenTerms }) => {
  const { loginWithGoogle, loginWithEmail, loginAsGuest, authError, clearError } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isNathanLoading, setIsNathanLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [customEmail, setCustomEmail] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);

  const handleNathanLogin = async () => {
    clearError();
    setIsNathanLoading(true);
    try {
      await loginWithEmail("nathpa1423@gmail.com", "Nathan Palumbo");
    } catch (e) {
      console.error("Nathan login error:", e);
    } finally {
      setIsNathanLoading(false);
    }
  };

  const handleEmailLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail || !customEmail.includes("@")) return;
    clearError();
    setIsEmailLoading(true);
    try {
      await loginWithEmail(customEmail);
    } catch (e) {
      console.error("Email login error:", e);
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    clearError();
    setIsLoading(true);
    try {
      await loginWithGoogle();
    } catch (e) {
      console.error("Login attempt error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    clearError();
    setIsGuestLoading(true);
    try {
      await loginAsGuest();
    } catch (e) {
      console.error("Guest login error:", e);
    } finally {
      setIsGuestLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#060812] flex items-center justify-center p-4 md:p-8 overflow-hidden text-[#F5F6FA] font-sans selection:bg-[#D81A45]/30">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#D81A45]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md mx-auto space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-1">
            <div className="relative p-3.5 rounded-3xl bg-white/[0.03] border border-white/10 shadow-[0_0_50px_rgba(216,26,69,0.25)] backdrop-blur-xl">
              <NacoraLogo size="xl" showSubtitle={false} />
            </div>
          </div>
          <p className="text-xs text-[#9AA0B2] max-w-xs mx-auto font-medium">
            Plateforme haut de gamme de pilotage de candidatures, CRM carrières & prospection.
          </p>
        </div>

        {/* Auth Card */}
        <div className="relative rounded-3xl bg-[#0B0F19]/90 border border-white/10 p-6 md:p-8 shadow-[0_25px_60px_-10px_rgba(0,0,0,0.85)] backdrop-blur-2xl space-y-5">
          
          {authError && (
            <div className="p-3.5 rounded-2xl bg-[#D81A45]/10 border border-[#D81A45]/30 text-xs text-[#FF6685] space-y-1.5">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-[#FF6685] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-white">Information d'authentification</p>
                  <p className="text-[#FF99B0] leading-relaxed text-[11px]">{authError}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1 text-center">
            <h2 className="text-base font-bold text-white tracking-wide">Accès à votre espace</h2>
            <p className="text-xs text-[#9AA0B2]">
              Connectez-vous pour retrouver vos opportunités et votre tableau de bord.
            </p>
          </div>

          {/* 1. Primary Direct Access for Nathan Palumbo */}
          <button
            type="button"
            onClick={handleNathanLogin}
            disabled={isLoading || isNathanLoading || isGuestLoading || isEmailLoading}
            className="w-full relative group overflow-hidden rounded-2xl bg-gradient-to-r from-[#D81A45]/20 via-[#D81A45]/10 to-transparent hover:from-[#D81A45]/30 hover:to-white/[0.05] border border-[#D81A45]/40 py-3.5 px-4 transition-all duration-300 flex items-center justify-between shadow-[0_0_25px_rgba(216,26,69,0.15)] cursor-pointer active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#D81A45] flex items-center justify-center font-bold text-white shadow-md text-sm">
                NP
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">Nathan Palumbo</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#D81A45]/30 text-[#FF6685] border border-[#D81A45]/50">
                    ADMIN
                  </span>
                </div>
                <span className="text-[11px] text-[#9AA0B2] font-mono">nathpa1423@gmail.com</span>
              </div>
            </div>

            {isNathanLoading ? (
              <Loader2 className="w-4 h-4 text-[#FF6685] animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4 text-[#FF6685] group-hover:translate-x-1 transition-transform" />
            )}
          </button>

          {/* Separator */}
          <div className="flex items-center gap-3 my-2 text-[#9AA0B2]/50 text-[11px] font-mono">
            <div className="flex-1 h-[1px] bg-white/10" />
            <span>OU</span>
            <div className="flex-1 h-[1px] bg-white/10" />
          </div>

          {/* 2. Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading || isNathanLoading || isGuestLoading || isEmailLoading}
            className="w-full relative group overflow-hidden rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 py-3 px-4 transition-all duration-300 flex items-center justify-center space-x-3 shadow-md cursor-pointer active:scale-[0.98]"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-[#D81A45] animate-spin" />
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                <span className="text-xs font-semibold text-white tracking-wide">
                  Connexion avec Google OAuth
                </span>
              </>
            )}
          </button>

          {/* 3. Direct Email Input toggle */}
          {showEmailInput ? (
            <form onSubmit={handleEmailLoginSubmit} className="space-y-2 pt-1">
              <div className="relative">
                <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA0B2]" />
                <input
                  type="email"
                  value={customEmail}
                  onChange={e => setCustomEmail(e.target.value)}
                  placeholder="votre.email@domaine.com"
                  required
                  autoFocus
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/50 focus:outline-none focus:border-[#FF6685]"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmailInput(false)}
                  className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-[#9AA0B2] cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isEmailLoading}
                  className="flex-1 py-1.5 rounded-lg bg-[#D81A45] hover:bg-[#D81A45]/90 text-xs font-bold text-white transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isEmailLoading ? "Connexion..." : "Accéder"}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                type="button"
                onClick={() => setShowEmailInput(true)}
                className="text-[#9AA0B2] hover:text-[#F5F6FA] text-[11px] transition-colors inline-flex items-center gap-1 cursor-pointer underline-offset-4 hover:underline"
              >
                <Mail className="w-3 h-3" />
                <span>Autre adresse email</span>
              </button>

              <button
                type="button"
                onClick={handleGuestLogin}
                disabled={isLoading || isGuestLoading || isNathanLoading}
                className="text-[#9AA0B2] hover:text-[#F5F6FA] text-[11px] transition-colors inline-flex items-center gap-1 cursor-pointer underline-offset-4 hover:underline"
              >
                {isGuestLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin text-[#FF6685]" />
                ) : (
                  <User className="w-3 h-3 text-[#9AA0B2]" />
                )}
                <span>Mode Démo</span>
              </button>
            </div>
          )}

          {/* Footer Security Note */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-center space-x-2 text-[11px] text-[#9AA0B2]/70">
            <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" />
            <span>Synchronisation Cloud Firestore & Chiffrement RGPD</span>
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
