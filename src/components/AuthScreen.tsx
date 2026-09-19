import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { 
  Lock, 
  Mail, 
  User as UserIcon, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Briefcase, 
  GraduationCap, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Loader2
} from "lucide-react";

export const AuthScreen: React.FC = () => {
  const { 
    loginWithEmail, 
    registerWithEmail, 
    loginWithGoogle, 
    authError, 
    isOperationNotAllowed, 
    clearError 
  } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSwitchMode = (newMode: "login" | "register") => {
    setMode(newMode);
    clearError();
    setValidationError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!email.trim()) {
      setValidationError("Veuillez saisir votre adresse e-mail.");
      return;
    }

    if (!password) {
      setValidationError("Veuillez saisir votre mot de passe.");
      return;
    }

    if (mode === "register") {
      if (!fullName.trim()) {
        setValidationError("Veuillez renseigner votre nom complet.");
        return;
      }
      if (password.length < 6) {
        setValidationError("Le mot de passe doit comporter au moins 6 caractères.");
        return;
      }
      if (password !== confirmPassword) {
        setValidationError("Les mots de passe ne correspondent pas.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === "login") {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password, fullName);
      }
    } catch {
      // Error handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setValidationError(null);
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
    } catch {
      // Error handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 md:p-8 overflow-hidden text-[#F5F6FA] font-sans">
      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left column: Brand presentation & feature highlights */}
        <div className="lg:col-span-6 space-y-6 text-left">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#D81A45] to-[#FF1A55] flex items-center justify-center font-black text-white text-2xl shadow-[0_0_30px_rgba(216,26,69,0.5)] border border-white/20">
              N
            </div>
            <div>
              <span className="text-2xl font-black text-[#F5F6FA] tracking-wider block font-display">NACORA</span>
              <span className="text-xs text-[#FF6685] uppercase tracking-widest font-extrabold">Career AI Platform</span>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-black text-[#F5F6FA] tracking-tight leading-tight font-display">
              Pilotez vos candidatures d'élite en <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D81A45] via-[#FF6685] to-purple-400">Finance & Gestion de Patrimoine</span>
            </h1>
            <p className="text-sm text-[#9AA0B2] leading-relaxed max-w-lg">
              Rejoignez votre espace personnel sécurisé. Suivez vos opportunités, analysez vos offres avec Gemini, préparez vos entretiens et personnalisez votre profil candidat.
            </p>
          </div>

          {/* Key value props */}
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
              <div className="p-1.5 rounded-xl bg-[rgba(18,183,106,0.15)] text-[#12B76A] mt-0.5 border border-[rgba(18,183,106,0.3)]">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-[#F5F6FA] block">Espace 100% personnel & cloud</span>
                <span className="text-[#9AA0B2]">Vos candidatures, contacts et notes privées sont synchronisés en direct sur votre compte sécurisé.</span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
              <div className="p-1.5 rounded-xl bg-purple-950/40 text-purple-300 mt-0.5 border border-purple-500/30">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-[#F5F6FA] block">Extracteur d'offres IA sans effort</span>
                <span className="text-[#9AA0B2]">Collez n'importe quelle annonce de stage ou alternance, Gemini extrait instantanément 18+ métriques clés.</span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
              <div className="p-1.5 rounded-xl bg-sky-950/40 text-[#38BDF8] mt-0.5 border border-sky-500/30">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-[#F5F6FA] block">Profil & Masters cibles sur-mesure</span>
                <span className="text-[#9AA0B2]">Renseignez vos compétences, vos expériences et votre situation directement dans votre page Profil.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Auth card */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto">
          <div className="relative rounded-3xl glass-modal p-6 sm:p-8 shadow-[0_25px_60px_-10px_rgba(0,0,0,0.85)]">
            
            {/* Mode Switcher Tabs */}
            <div className="flex items-center p-1 bg-black/40 rounded-2xl border border-white/10 mb-6 backdrop-blur-xl">
              <button
                type="button"
                onClick={() => handleSwitchMode("login")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-spring cursor-pointer ${
                  mode === "login" 
                    ? "glass-nav-active shadow-md" 
                    : "text-[#9AA0B2] hover:text-[#F5F6FA]"
                }`}
              >
                Se connecter
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMode("register")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-spring cursor-pointer ${
                  mode === "register" 
                    ? "glass-nav-active shadow-md" 
                    : "text-[#9AA0B2] hover:text-[#F5F6FA]"
                }`}
              >
                Créer un compte
              </button>
            </div>

            {/* Error alerts */}
            {(authError || validationError) && (
              <div className="mb-5 p-3 rounded-xl bg-[rgba(240,68,56,0.15)] border border-[rgba(240,68,56,0.3)] text-[#F04438] text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">{authError || validationError}</p>
                </div>
              </div>
            )}

            {/* If Email/Password is not enabled in Firebase Console, show actionable guidance */}
            {isOperationNotAllowed && (
              <div className="mb-5 p-3.5 rounded-xl bg-[rgba(247,144,9,0.15)] border border-[rgba(247,144,9,0.3)] text-[#F79009] text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Activation requise pour Email / Mot de passe</span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">
                  Par défaut sur Firebase, seul le fournisseur Google est activé. Pour autoriser la création de compte par mot de passe :
                </p>
                <ol className="list-decimal list-inside text-[11px] opacity-80 space-y-1 font-medium pl-1">
                  <li>Ouvrez votre console Firebase</li>
                  <li>Allez dans <strong>Authentication</strong> → <strong>Sign-in method</strong></li>
                  <li>Cliquez sur <strong>Adresse e-mail/Mot de passe</strong> et cochez <strong>Activer</strong></li>
                </ol>
                <div className="pt-1 border-t border-[rgba(247,144,9,0.2)] flex items-center justify-between">
                  <span className="text-[10px] opacity-80">Alternative instantanée :</span>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="text-[11px] font-bold text-[#F5F6FA] underline hover:text-[#F79009] cursor-pointer"
                  >
                    Connexion Google en 1 clic →
                  </button>
                </div>
              </div>
            )}

            {/* Google 1-Click Sign-in */}
            <div className="space-y-3 mb-5">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-[#F5F6FA] text-slate-900 font-bold text-xs flex items-center justify-center gap-3 transition-spring shadow-md cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continuer avec Google</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="h-[1px] flex-1 bg-white/10" />
                <span className="text-[10px] uppercase font-bold text-[#9AA0B2] tracking-wider">
                  ou par e-mail
                </span>
                <div className="h-[1px] flex-1 bg-white/10" />
              </div>
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#9AA0B2] flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-[#9AA0B2]" />
                    Nom complet
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Alexandre Martin"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full glass-input px-3.5 py-2.5 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#9AA0B2] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#9AA0B2]" />
                  Adresse e-mail
                </label>
                <input
                  type="email"
                  required
                  placeholder="votre-email@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#9AA0B2] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#9AA0B2]" />
                  Mot de passe
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
                />
                {mode === "register" && (
                  <span className="text-[10px] text-[#9AA0B2] block">Minimum 6 caractères</span>
                )}
              </div>

              {mode === "register" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#9AA0B2] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#9AA0B2]" />
                    Confirmer le mot de passe
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full glass-input px-3.5 py-2.5 text-xs text-[#F5F6FA] placeholder-[#9AA0B2]/60"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 glass-btn-primary text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Traitement en cours...</span>
                  </>
                ) : (
                  <>
                    <span>{mode === "login" ? "Accéder à mon espace" : "Créer mon compte"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Footer switcher info */}
            <div className="mt-6 pt-4 border-t border-white/10 text-center">
              {mode === "login" ? (
                <p className="text-xs text-[#9AA0B2]">
                  Pas encore de compte ?{" "}
                  <button
                    type="button"
                    onClick={() => handleSwitchMode("register")}
                    className="font-bold text-[#FF6685] hover:underline cursor-pointer"
                  >
                    Créer un compte gratuitement
                  </button>
                </p>
              ) : (
                <p className="text-xs text-[#9AA0B2]">
                  Déjà un compte ?{" "}
                  <button
                    type="button"
                    onClick={() => handleSwitchMode("login")}
                    className="font-bold text-[#FF6685] hover:underline cursor-pointer"
                  >
                    Se connecter
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
