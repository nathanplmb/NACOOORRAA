import React from "react";
import { FileText, ArrowLeft, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";

interface TermsOfServiceProps {
  onBack?: () => void;
}

export function TermsOfService({ onBack }: TermsOfServiceProps) {
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
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display text-white">Conditions Générales d'Utilisation (CGU)</h1>
              <p className="text-xs text-[#9AA0B2] mt-1">Dernière mise à jour : 20 septembre 2026</p>
            </div>
          </div>

          <div className="space-y-6 text-sm text-[#9AA0B2] leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#34d399]" />
                1. Objet et Description du Service
              </h2>
              <p>
                <strong className="text-white">NACORA</strong> est un accélérateur de carrière intelligent fournissant aux utilisateurs des outils de pilotage de recherche d'emploi, d'analyse de CV, de préparation d'entretiens et d'enrichissement d'opportunités professionnelles assistés par IA.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#FBBF24]" />
                2. Limitation de Responsabilité et Contenus IA
              </h2>
              <p>
                Les fonctionnalités d'intelligence artificielle (génération de lettres, suggestions d'entretien, enrichissement d'entreprises) fournissent des contenus à titre indicatif et d'aide à la décision. <strong className="text-white">NACORA ne garantit pas l'exhaustivité, l'exactitude absolue ou l'adéquation parfaite des informations générées par l'IA.</strong> L'utilisateur demeure seul responsable des candidatures qu'il soumet, des messages qu'il envoie et des informations transmises à des tiers.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#FF6685]" />
                3. Règles d'Usage Acceptable
              </h2>
              <p>
                L'utilisateur s'engage à utiliser NACORA dans le respect des lois en vigueur. Sont strictement interdits :
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                <li>L'utilisation de scripts automatisés pour surcharger les serveurs ou l'API.</li>
                <li>L'importation de contenus illicites, diffamatoires ou portant atteinte aux droits de tiers.</li>
                <li>Toute tentative de compromission de la sécurité de la plateforme.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#34d399]" />
                4. Propriété Intellectuelle
              </h2>
              <p>
                L'ensemble des éléments graphiques, de l'interface, du code source et de la marque NACORA est protégé par le droit d'auteur. Toute reproduction non autorisée est interdite.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
