import React from "react";
import { Shield, ArrowLeft, Lock, Database, Cpu, UserCheck, Mail } from "lucide-react";

interface PrivacyPolicyProps {
  onBack?: () => void;
}

export function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
  return (
    <div className="min-h-screen bg-[#070913] text-[#F5F6FA] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#9AA0B2] hover:text-white transition-colors bg-white/5 px-3 py-2 rounded-xl border border-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'application
          </button>
        )}

        <div className="p-8 rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#D81A45]/10 border border-[#D81A45]/30 flex items-center justify-center text-[#FF6685]">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display text-white">Politique de Confidentialité</h1>
              <p className="text-xs text-[#9AA0B2] mt-1">Dernière mise à jour : 20 septembre 2026 • Conformité RGPD</p>
            </div>
          </div>

          <div className="space-y-6 text-sm text-[#9AA0B2] leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#FF6685]" />
                1. Introduction et Responsable de Traitement
              </h2>
              <p>
                La plateforme <strong className="text-white">NACORA</strong> accorde une importance absolue à la protection de vos données personnelles. La présente Politique de Confidentialité décrit de manière transparente les données que nous collectons, l'utilisation qui en est faite, ainsi que vos droits en tant qu'utilisateur de notre accélérateur de carrière.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-[#FF6685]" />
                2. Données collectées
              </h2>
              <p>
                Dans le cadre de votre utilisation de NACORA, nous collectons et traitons les catégories de données suivantes :
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                <li><strong className="text-white">Données de profil et d'authentification</strong> : Votre adresse e-mail, nom, prénom et identifiant de compte sécurisé (gérés par Firebase Authentication).</li>
                <li><strong className="text-white">Documents professionnels</strong> : CV, lettres de motivation, et textes d'offres d'emploi que vous importez ou saisissez volontairement.</li>
                <li><strong className="text-white">Données de suivi de carrière</strong> : Opportunités professionnelles enregistrées, statuts de candidatures, contacts professionnels, notes d'entretien et agenda.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#FF6685]" />
                3. Traitement par l'Intelligence Artificielle (Gemini API)
              </h2>
              <p>
                NACORA intègre des fonctionnalités d'assistance intelligente propulsées par l'API Google Gemini. Lorsque vous utilisez nos outils d'analyse de CV, de coaching ou de génération de messages :
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                <li>Les données textuelles nécessaires sont transmises de manière sécurisée et chiffrée (HTTPS) aux serveurs de traitement pour générer les réponses.</li>
                <li>Aucune donnée personnelle n'est utilisée pour entraîner des modèles publics d'IA sans votre consentement explicite.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#FF6685]" />
                4. Vos droits (RGPD)
              </h2>
              <p>
                Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants concernant vos données personnelles :
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                <li><strong className="text-white">Droit d'accès et de rectification</strong> : Vous pouvez consulter et modifier vos informations à tout moment depuis votre profil.</li>
                <li><strong className="text-white">Droit à l'effacement</strong> : Vous pouvez demander la suppression intégrale de votre compte et de vos données associées dans Firebase.</li>
                <li><strong className="text-white">Droit à la portabilité</strong> : Exportez vos données à tout moment.</li>
              </ul>
            </section>

            <section className="space-y-3 pt-4 border-t border-white/10">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#FF6685]" />
                5. Contact DPO
              </h2>
              <p>
                Pour toute question relative à cette politique ou pour exercer vos droits, vous pouvez contacter notre équipe à l'adresse e-mail dédiée : <strong className="text-white">privacy@nacora.app</strong>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
