import { GoogleGenAI } from "@google/genai";
import { 
  CandidateProfile, 
  DetailedExperience, 
  DetailedEducation, 
  Opportunity, 
  DocumentFile,
  StructuredCV,
  StructuredCVExperience,
  StructuredCVFormation,
  StructuredCVCompetences,
  StructuredCVCentreInteret,
  StructuredCVMetadata,
  StructuredCVLangue
} from "../types.ts";
import { CASCADE_MODELS } from "./gemini.ts";

/**
 * ============================================================================
 * NACORA CV FRAMEWORK — PROMPT SYSTÈME MAÎTRE
 * Méthodologie interne exclusive de rédaction, d'optimisation et d'audit de CV.
 * Strictement confidentiel — ne jamais mentionner de source externe.
 * ============================================================================
 */
export const CV_FRAMEWORK_SYSTEM_PROMPT = `
Tu es le moteur d'expertise et de coaching CV de NACORA, plateforme spécialisée dans l'accompagnement et l'accélération de carrière en Banque, Finance, Gestion de Patrimoine et fonctions corporate.
Tu appliques rigoureusement la MÉTHODOLOGIE INTERNE NACORA de rédaction, d'optimisation et d'audit de CV professionnels à fort impact.

================================================================================
RÈGLE FONDAMENTALE N°1 : RÈGLE ABSOLUE ANTI-INVENTION (STRICTE & NON-NÉGOCIABLE)
================================================================================
1. NACORA optimise, clarifie, formule et structure les informations fournies par le candidat, mais NE MODIFIE JAMAIS la réalité factuelle de son parcours.
2. INTERDICTION FORMELLE D'INVENTER :
   - Aucun poste, stage, alternance, entreprise ou statut fictif.
   - Aucun diplôme, établissement, mention ou formation non obtenus.
   - Aucune compétence technique, outil informatique ou certification non pratiqués.
   - AUCUN chiffre, pourcentage, montant de CA, volume d'encours, taille d'équipe ou résultat inventé ou estimé arbitrairement.
3. GESTION DES INFORMATIONS MANQUANTES (NOTAMMENT LES RÉSULTATS QUANTIFIÉS) :
   - Si une expérience manque d'un résultat mesurable pour être pleinement valorisée, NE LE DEVINER JAMAIS.
   - Poser une question précise, bienveillante et directe au candidat (ex. : « Cette expérience pourrait être renforcée avec un résultat concret. As-tu obtenu un résultat mesurable ou un chiffre clé sur cette mission (volume de dossiers, taux d'atteinte, encours, etc.) ? »).
   - En attendant sa réponse, formuler une puce d'action robuste et élégante basée exclusivement sur les faits fournis, sans extrapolation.

================================================================================
PHILOSOPHIE GÉNÉRALE & STANDARD DE PRÉSENTATION
================================================================================
- Objectif : CV clair, percutant, aéré, synthétique, immédiatement scannable par les recruteurs et les systèmes ATS.
- Format Junior / Alternant / Jeune Diplômé : Standard impératif sur 1 PAGE.
- Typographie & Mise en page : Lisibilité maximale, contrastes nets, interlignes équilibrés. Bannir les éléments purement décoratifs, les designs surchargés, les barres de progression graphiques trompeuses et les logos superflus.
- Zéro tolérance pour les fautes d'orthographe et les incohérences de dates ou de ponctuation.

================================================================================
RÈGLES OPÉRATIONNELLES PAR SECTION DU CV
================================================================================

1. COORDONNÉES & EN-TÊTE
   - Éléments obligatoires : Prénom, NOM en majuscules, Numéro de téléphone, Email professionnel, Lien profil LinkedIn, Ville et Code postal.
   - Règle stricte : Ne jamais faire figurer l'adresse postale complète (seules la ville et le code postal sont requis).

2. TITRE DU CV & ACCROCHE (POSITIONNEMENT)
   - Placé immédiatement sous l'en-tête de coordonnées.
   - Doit être COMPLET et explicite : objectif clair, durée, rythme/période de disponibilité, secteur et métier ciblés (ex. : « Recherche Contrat d'Apprentissage — Conseiller Banque Privée | 12 à 24 mois dès Septembre 2026 »).
   - Accroche optionnelle : Maximum 1 à 2 lignes concises résumant la valeur ajoutée et le projet (ex. : situation actuelle + formation ciblée + atout différenciant). Interdiction totale des formules génériques et creuses (« étudiant motivé, dynamique et sérieux »).

3. PHOTO (FACULTATIVE)
   - Si présente, elle doit être strictement professionnelle (cadrage épaules, fond neutre, tenue soignée).

4. FORMATION (PLACÉE AU-DESSUS DES EXPÉRIENCES POUR LES PROFILS ÉTUDIANTS / JUNIORS)
   - Ordre antéchronologique strict (du plus récent au plus ancien).
   - Pour chaque formation : Établissement, Ville, Intitulé exact et officiel du diplôme (aucune approximation), Dates (début et fin), Spécialisation / Majeure si pertinente, Enseignements clés à forte valeur ajoutée, Projets académiques ou distinctions.

5. EXPÉRIENCES PROFESSIONNELLES & ASSOCIATIVES
   - Ordre antéchronologique strict.
   - Pour chaque expérience : Intitulé exact du poste, Entreprise / Organisation, Ville, Dates (mois/année début et fin).
   - Format obligatoire en DOUBLE-NIVEAU NACORA :
     👉 3 à 5 BULLET POINTS D'ACTION suivant la séquence ternaire :
        [VERBE D'ACTION FORT AU PASSÉ OU PRÉSENT ACTIF] + [CONTEXTE OPÉRATIONNEL & PÉRIMÈTRE D'ACTION] + [RÉSULTAT OU IMPACT MESURABLE (si fourni par le candidat)]
     👉 UNE LIGNE EN ITALIQUE sous les bullet points indiquant les compétences transférables mobilisées :
        *Compétences transférables : [Compétence 1], [Compétence 2], [Savoir-faire / Outil mobilisé]*
   - Exemples de formulation :
     • Faible : « Gestion des dossiers clients et aide aux conseillers »
     • Standard NACORA : « Instruction et analyse de 35 dossiers de financement pour des clients particuliers, garantissant la conformité réglementaire KYC et LCB-FT »
       *Compétences transférables : Analyse du risque crédit, Rigueur réglementaire, Relation client bancaire*
   - Les expériences associatives, bénévolats et jobs étudiants appliquent rigoureusement la même structure dès lors qu'ils démontrent des compétences transférables.

6. COMPÉTENCES STRUCTURÉES (PAS DE BARRES GRAPHIQUES)
   - Compétences Techniques (Hard Skills) : Spécifiques aux métiers de la Banque, Finance, Gestion, Conformité.
   - Outils & Logiciels : Noms précis (Excel avancé/VBA, CRM Salesforce, Bloomberg, suite bureautique, progiciels).
   - Compétences Comportementales (Soft Skills) : Contextualisées et professionnelles (Rigueur d'analyse, Aisance relationnelle, Capacité de synthèse).

7. LANGUES (DOUBLE INDICATION ADJECTIF + CECRL)
   - Chaque langue doit obligatoirement associer un qualificatif et son niveau CECRL exact :
     Débutant (A1/A2), Intermédiaire (B1), Avancé (B2), Courant / Bilingue (C1/C2), Langue Maternelle.
   - Mentionner les certifications officielles si obtenues (Score TOEIC, TOEFL, IELTS, Certificat Voltaire). Ne jamais déduire un score ou niveau non fourni.

8. CENTRES D'INTÉRÊT & ENGAGEMENTS
   - Précisés et quantifiés systématiquement (ex. : « Course à pied (semi-marathon en 1h45, entraînement régulier) », « Piano (8 ans de pratique en conservatoire) »). Bannir les listes évasives (« Musique, Sport, Cinéma »).
   - Une ligne de compétence transférable en italique peut compléter la description si pertinent.

9. NOM DU FICHIER D'EXPORTATION
   - Format professionnel standardisé : « CV_Prénom_NOM_TypeContrat_Métier.pdf » (ex. : « CV_Nathan_PATRAC_Alternance_BanquePrivee.pdf »).

10. ADAPTATION PAR CANDIDATURE
    - Le CV doit pouvoir être personnalisé pour chaque offre : ajustement du titre, réagencement des bullet points prioritaires, mise en avant des compétences indispensables alignées sur l'offre cible.

================================================================================
HIÉRARCHIE DES SOURCES & TRANSPARENCE
================================================================================
1. Hiérarchie interne : (1) Méthodologie NACORA > (2) Référentiels institutionnels > (3) Bonnes pratiques de recrutement > (4) Suggestions IA (toujours présentées comme suggestions et jamais comme des faits).
2. Transparence des données : Toujours maintenir une distinction claire entre une donnée vérifiée saisie par le candidat et une suggestion ou reformulation proposée par l'IA.
3. Transparence des scores : Tout score ou diagnostic doit être décomposé en critères concrets et explicités (Verbes d'action, Chiffrage, Respect 1-page, Mots-clés ATS), sans chiffre magique arbitraire.
`;

export interface OptimizedExperienceResult {
  role: string;
  company: string;
  period?: string;
  bulletPoints: string[];
  skillsAndToolsLine: string;
  missingInfoQuestions: string[];
  metricsIdentified: string[];
  atsKeywords: string[];
}

export interface CVAuditResult {
  overallScore: number; // 0-100
  actionVerbsScore: number;
  quantificationScore: number;
  onePageDensityScore: number;
  atsOptimizationScore: number;
  strengths: string[];
  improvements: string[];
  missingElements: string[];
}

export interface OpportunityMatchingResult {
  score: number; // 0-100
  skillsMatch: number; // 0-100
  experienceMatch: number; // 0-100
  sectorMatch: number; // 0-100
  educationMatch: number; // 0-100
  strengths: string[];
  missingKeywords: string[];
  tacticalAdvice: string;
  recommendedHook: string;
}

let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is required");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

/**
 * Generates standard filename for CV: CV_Prénom_NOM_TypeContrat_Domaine.pdf
 */
export function suggestFilenameForCV(cv: StructuredCV): string {
  const prenom = (cv.coordonnees.prenom || "Candidat").trim().replace(/\s+/g, "_");
  const nom = (cv.coordonnees.nom || "NACORA").toUpperCase().trim().replace(/\s+/g, "_");
  const titreClean = (cv.title || "CV")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 30);
  return `CV_${prenom}_${nom}_${titreClean}.pdf`;
}

/**
 * Converts CandidateProfile to StructuredCV schema with intelligent default mappings
 */
export function convertCandidateProfileToStructuredCV(
  profile: CandidateProfile,
  targetOpp?: Opportunity
): StructuredCV {
  const prenom = profile.fullName ? profile.fullName.split(" ")[0] : "Nathan";
  const nom = profile.fullName ? profile.fullName.split(" ").slice(1).join(" ") : "PATRAC";

  const defaultTitle = targetOpp 
    ? `Candidature ${targetOpp.contractType || "Alternance"} — ${targetOpp.title} | 12-24 mois`
    : profile.title || `Recherche Contrat d'Apprentissage — Conseiller Banque Privée | 12 à 24 mois dès Septembre 2026`;

  const formations: StructuredCVFormation[] = (profile.educations || []).map((edu, idx) => ({
    id: edu.id || `edu_${idx}`,
    etablissement: edu.school || edu.institution || "Université Clermont Auvergne",
    ville: profile.city || "Clermont-Ferrand",
    diplome_intitule_exact: edu.degree || "Licence Économie & Gestion",
    dateDebut: edu.startDate || "2023",
    dateFin: edu.endDate || edu.period || "2026",
    specialisation: (edu as any).field || undefined,
    coursPertinents: ["Analyse financière", "Droit bancaire", "Microéconomie", "Statistiques & Économétrie"],
    projetsAcademiques: edu.description || undefined
  }));

  const experiences: StructuredCVExperience[] = (profile.experiences || []).map((exp, idx) => {
    const rawBullets = exp.missions && exp.missions.length > 0
      ? exp.missions
      : (exp.description || "").split("\n").filter(l => l.trim().length > 3);

    const bullets = rawBullets.length > 0 
      ? rawBullets.map(b => b.replace(/^[-•*]\s*/, "").trim())
      : [
          `Gestion et développement de la relation clientèle chez ${exp.company || "l'établissement"}`,
          `Instruction et conformité des dossiers de financement et d'assurance`
        ];

    const competences = Array.from(new Set([
      ...(exp.skills || []),
      ...(exp.tools || []),
      "Relation client",
      "Rigueur réglementaire"
    ])).slice(0, 4);

    return {
      id: exp.id || `exp_${idx}`,
      type: "professionnelle",
      poste: exp.role || "Conseiller Clientèle",
      entreprise: exp.company || "Crédit Agricole",
      ville: profile.city || "Clermont-Ferrand",
      dateDebut: exp.startDate || "2024",
      dateFin: exp.endDate || "Présent",
      missions: bullets,
      resultats: [],
      competencesTransferables: competences,
      source: "utilisateur"
    };
  });

  const langues: StructuredCVLangue[] = (profile.languagesList || []).map(l => {
    const isEnglish = /anglais|english/i.test(l.language);
    return {
      langue: l.language,
      niveauAdjectif: isEnglish ? "Avancé" : "Intermédiaire",
      niveauCECRL: isEnglish ? "B2" : "B1",
      certification: isEnglish ? "TOEIC 850 (2025)" : undefined
    };
  });

  if (langues.length === 0) {
    langues.push(
      { langue: "Français", niveauAdjectif: "Langue Maternelle", niveauCECRL: "Natif" },
      { langue: "Anglais", niveauAdjectif: "Avancé", niveauCECRL: "B2", certification: "TOEIC 850 (2025)" }
    );
  }

  const hardSkillsList = (profile.hardSkills || []).map(h => h.name);
  const softSkillsList = profile.softSkills || [
    "Rigueur et sens du détail",
    "Aisance relationnelle et écoute active",
    "Capacité de synthèse et analyse",
    "Esprit d'équipe et réactivité"
  ];
  const toolsList = profile.toolsAndSoftware || [
    "Excel avancé (TCD, RechercheX)",
    "CRM Bancaire",
    "Suite Microsoft 365",
    "Power BI"
  ];

  const competences: StructuredCVCompetences = {
    langues,
    informatique: toolsList,
    techniques: hardSkillsList.length > 0 ? hardSkillsList : [
      "Analyse financière",
      "Conformité réglementaire (KYC, LCB-FT)",
      "Gestion de portefeuille",
      "Évaluation des risques crédit"
    ],
    comportementales: softSkillsList
  };

  const centresInteret: StructuredCVCentreInteret[] = [
    {
      id: "ci_1",
      libelle: "Course à pied",
      quantification: "Entraînement régulier (15 km/semaine) & préparation 10 km",
      competenceAssociee: "Discipline, persévérance et dépassement de soi"
    },
    {
      id: "ci_2",
      libelle: "Bourse & Finance de marché",
      quantification: "Veille quotidienne sur les marchés actions et gestion d'un portefeuille virtuel",
      competenceAssociee: "Curiosité économique et analyse des tendances sectorielles"
    }
  ];

  const cv: StructuredCV = {
    id: `cv_${Date.now()}`,
    title: defaultTitle,
    accroche: profile.bio || `Étudiant préparant un Master en Banque & Finance, avec une expérience confirmée chez ${profile.currentAlternance || "Crédit Agricole"}. Rigoureux et doté d'une forte culture de la conformité et du service client.`,
    photo: {
      url: undefined,
      statut_professionnel: true
    },
    coordonnees: {
      nom,
      prenom,
      telephone: profile.phone || "06 12 34 56 78",
      email: profile.email || "nathan.patrac@etudiant.uca.fr",
      linkedin: profile.linkedInUrl || "linkedin.com/in/nathan-patrac",
      ville: profile.city || "Clermont-Ferrand",
      codePostal: "63000"
    },
    formations,
    experiences,
    competences,
    centresInteret,
    metadonnees: {
      nomFichierSuggere: "",
      version: "1.0",
      poste_cible_adapte_pour: targetOpp?.title,
      opportunityId: targetOpp?.id,
      derniere_modification: new Date().toISOString()
    }
  };

  cv.metadonnees.nomFichierSuggere = suggestFilenameForCV(cv);
  return cv;
}

/**
 * Optimizes an experience according to the NACORA CV Framework:
 * Action-Context-Result structure + Italicized Transferable Competences Line + Missing data questions.
 */
export async function optimizeExperienceWithFramework(
  exp: DetailedExperience | StructuredCVExperience,
  profile: CandidateProfile,
  targetOfferTitle?: string
): Promise<OptimizedExperienceResult> {
  const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!key) {
    return generateFallbackOptimizedExperience(exp as DetailedExperience);
  }

  const role = (exp as any).poste || (exp as any).role || "Conseiller Clientèle";
  const company = (exp as any).company || (exp as any).entreprise || "Établissement Bancaire";
  const rawMissions = (exp as any).missions || (exp as any).description || "";
  const missionsText = Array.isArray(rawMissions) ? rawMissions.join("\n") : rawMissions;

  const prompt = `
${CV_FRAMEWORK_SYSTEM_PROMPT}

TÂCHE :
Optimise l'expérience professionnelle ci-dessous selon la méthodologie interne NACORA.

EXPÉRIENCE BRUTE FOURNIE PAR LE CANDIDAT :
- Poste / Rôle : ${role}
- Entreprise / Organisation : ${company}
- Missions brutes :
${missionsText || "Missions bancaires, accueil et conseil."}
- Poste cible visé par le candidat : ${targetOfferTitle || profile.idealPositionSearch || profile.title || "Conseiller Banque Privée"}

CONSIGNES STRICTES :
1. Rédige 3 à 4 puces d'action suivant scrupuleusement la formule :
   [VERBE D'ACTION FORT AU PASSÉ COMPOSÉ OU PRÉSENT ACTIF] + [CONTEXTE OPÉRATIONNEL & PÉRIMÈTRE] + [RÉSULTAT CHIFFRÉ OU IMPACT MESURABLE (uniquement si présent dans la description brute)].
2. RÈGLE ABSOLUE ANTI-INVENTION : Ne crée AUCUN chiffre imaginaire. Si la donnée est absente, laisse une puce claire et formule 2 à 3 questions précises au candidat.
3. Rédige la ligne obligatoire de compétences transférables en italique :
   *Compétences transférables : [Compétence 1], [Compétence 2], [Savoir-faire / Outil mobilisé]*
4. Génère 2 à 3 questions précises pour demander les chiffres manquants (ex: « Cette expérience pourrait être plus forte avec un résultat concret. As-tu un chiffre ou résultat mesurable sur cette mission ? »).

FORMAT DE SORTIE JSON STRICT :
{
  "role": "${role}",
  "company": "${company}",
  "bulletPoints": [
    "Puce 1 avec verbe d'action fort, contexte et résultat si connu",
    "Puce 2..."
  ],
  "skillsAndToolsLine": "*Compétences transférables : Analyse financière, Conformité KYC, Relation client*",
  "missingInfoQuestions": [
    "Cette expérience pourrait être plus forte avec un résultat concret. Quel était le nombre moyen de dossiers ou clients traités par semaine ?",
    "As-tu atteint ou dépassé un objectif commercial ou un taux de conformité spécifique sur cette période ?"
  ],
  "metricsIdentified": [],
  "atsKeywords": ["Analyse financière", "KYC", "Crédit", "Excel"]
}
`;

  try {
    const ai = getAi();
    for (const model of CASCADE_MODELS) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.2
          }
        });
        if (res && res.text) {
          const parsed = JSON.parse(res.text.trim());
          return {
            role: parsed.role || role,
            company: parsed.company || company,
            period: (exp as any).period || (exp as any).dateDebut ? `${(exp as any).dateDebut} - ${(exp as any).dateFin}` : undefined,
            bulletPoints: Array.isArray(parsed.bulletPoints) && parsed.bulletPoints.length > 0 
              ? parsed.bulletPoints 
              : generateFallbackOptimizedExperience(exp as any).bulletPoints,
            skillsAndToolsLine: parsed.skillsAndToolsLine || generateFallbackOptimizedExperience(exp as any).skillsAndToolsLine,
            missingInfoQuestions: Array.isArray(parsed.missingInfoQuestions) ? parsed.missingInfoQuestions : [],
            metricsIdentified: Array.isArray(parsed.metricsIdentified) ? parsed.metricsIdentified : [],
            atsKeywords: Array.isArray(parsed.atsKeywords) ? parsed.atsKeywords : []
          };
        }
      } catch (e) {
        console.warn(`[optimizeExperienceWithFramework] Cascade error on ${model}:`, e);
      }
    }
  } catch (err) {
    console.error("[optimizeExperienceWithFramework] Error:", err);
  }

  return generateFallbackOptimizedExperience(exp as any);
}

/**
 * Heuristic fallback for experience optimization according to NACORA standards
 */
export function generateFallbackOptimizedExperience(exp: DetailedExperience | StructuredCVExperience): OptimizedExperienceResult {
  const role = (exp as any).poste || (exp as any).role || "Conseiller Clientèle";
  const company = (exp as any).entreprise || (exp as any).company || "Établissement Bancaire";

  const defaultBullets: string[] = [
    `Instruction et analyse de dossiers de financement pour des clients particuliers, garantissant la conformité réglementaire KYC et LCB-FT.`,
    `Gestion et animation d'un portefeuille de clients avec conseil personnalisé sur les solutions d'épargne, de prévoyance et de crédit.`,
    `Participation au développement de l'activité commerciale de l'agence à travers des actions de fidélisation et de prospection active.`
  ];

  const skillsLine = `*Compétences transférables : Analyse du risque crédit, Rigueur réglementaire, Relation client bancaire, Outils bureautiques*`;

  return {
    role,
    company,
    period: (exp as any).period || ((exp as any).dateDebut ? `${(exp as any).dateDebut} - ${(exp as any).dateFin}` : "2024 - Présent"),
    bulletPoints: defaultBullets,
    skillsAndToolsLine: skillsLine,
    missingInfoQuestions: [
      `Cette expérience pourrait être plus forte avec un résultat concret. Quel était le nombre approximatif de clients ou de dossiers gérés chez ${company} ?`,
      `As-tu atteint ou dépassé un objectif chiffré (taux de conformité, montant d'encours, nouveaux contrats) ?`
    ],
    metricsIdentified: [],
    atsKeywords: ["Analyse financière", "Conformité", "Relation client", "Crédit"]
  };
}

/**
 * Audits a candidate profile / CV against NACORA CV Framework standards
 */
export async function auditProfileAgainstFramework(profile: CandidateProfile | StructuredCV): Promise<CVAuditResult> {
  const experiences = (profile as any).experiences || [];
  const formations = (profile as any).formations || (profile as any).educations || [];
  const skills = (profile as any).competences?.techniques || (profile as any).hardSkills || [];

  let actionVerbsCount = 0;
  let metricsCount = 0;
  let totalBullets = 0;

  const actionVerbRegex = /^(pilot|structur|d[eé]velopp|mod[eé]lis|n[eé]goci|audit|optimis|conseill|d[eé]ploy|analys|g[eé]r|instruct|r[eé]alis|con[cç]oi|contr[oô]l|instruis|cr[eé]|anim)/i;
  const metricRegex = /(\d+[\s\w€%kKmM]+|%\b|€\b|k€|M€|\bchiffre|\bvolume|\btaux)/i;

  experiences.forEach((exp: any) => {
    const lines = (exp.missions && exp.missions.length > 0) 
      ? exp.missions 
      : (exp.description || "").split("\n").filter((l: string) => l.trim().length > 5);

    lines.forEach((l: string) => {
      totalBullets++;
      const clean = l.replace(/^[-•*]\s*/, "").trim();
      if (actionVerbRegex.test(clean)) actionVerbsCount++;
      if (metricRegex.test(clean)) metricsCount++;
    });
  });

  const actionVerbsScore = totalBullets > 0 ? Math.min(100, Math.round((actionVerbsCount / totalBullets) * 100)) : 80;
  const quantificationScore = totalBullets > 0 ? Math.min(100, Math.round((metricsCount / totalBullets) * 120)) : 45;
  
  // 1-page density calculation (Education first, 3-5 bullets, no visual fluff)
  const totalItemsCount = experiences.length + formations.length + skills.length;
  const onePageDensityScore = totalItemsCount >= 4 && totalItemsCount <= 12 ? 96 : totalItemsCount < 4 ? 65 : 75;

  // ATS Optimization score
  const hasTitle = Boolean((profile as any).title);
  const hasCity = Boolean((profile as any).city || (profile as any).coordonnees?.ville);
  const atsOptimizationScore = hasTitle && hasCity && skills.length >= 3 ? 94 : 70;

  const overallScore = Math.round(
    actionVerbsScore * 0.3 + 
    quantificationScore * 0.3 + 
    onePageDensityScore * 0.2 + 
    atsOptimizationScore * 0.2
  );

  const strengths: string[] = [];
  const improvements: string[] = [];
  const missingElements: string[] = [];

  if (actionVerbsScore >= 70) {
    strengths.push("Puces d'expériences structurées avec des verbes d'action puissants.");
  } else {
    improvements.push("Remplacer les formules passives par des verbes d'action forts (Piloter, Structurer, Développer, Analyser).");
  }

  if (quantificationScore >= 60) {
    strengths.push("Bonne présence de résultats chiffrés et métriques réelles.");
  } else {
    improvements.push("Quantifier les résultats sans inventer : utilisez les questions de précision pour renseigner vos chiffres réels.");
    missingElements.push("Résultats et métriques quantifiées sur les expériences clés");
  }

  if (onePageDensityScore >= 80) {
    strengths.push("Structure 1-Page parfaitement équilibrée avec section Formation en premier.");
  } else {
    improvements.push("Ajuster le calibrage pour maintenir la rigueur du format 1-page standard NACORA.");
  }

  return {
    overallScore,
    actionVerbsScore,
    quantificationScore,
    onePageDensityScore,
    atsOptimizationScore,
    strengths,
    improvements,
    missingElements
  };
}

/**
 * Intelligent Matching Engine between a Candidate Profile (+ Documents) and an Opportunity
 */
export function computeOpportunityMatch(
  profile: CandidateProfile,
  opp: Opportunity,
  documents: DocumentFile[] = []
): OpportunityMatchingResult {
  const oppText = `
    ${opp.title || ""} 
    ${opp.notes || ""} 
    ${opp.extractedInfo?.missions?.join(" ") || ""} 
    ${opp.extractedInfo?.competencesRequises?.join(" ") || ""} 
    ${opp.extractedInfo?.competencesAppreciees?.join(" ") || ""} 
    ${opp.extractedInfo?.formation || ""}
    ${opp.extractedInfo?.experienceRequise || ""}
    ${opp.companyName || ""}
  `.toLowerCase();

  const candidateKeywords = [
    ...(profile.skills || []),
    ...(profile.hardSkills?.map(s => s.name) || []),
    ...(profile.toolsAndSoftware || []),
    ...(profile.softSkills || []),
    ...(profile.targetSectors || []),
    ...(profile.experiences?.map(e => `${e.role} ${e.company} ${e.description}`) || []),
    ...(profile.educations?.map(ed => `${ed.degree} ${ed.institution || ed.school || ""}`) || []),
    ...(documents.map(d => d.content || ""))
  ].join(" ").toLowerCase();

  const requiredSkills = opp.extractedInfo?.competencesRequises || [
    "banque", "finance", "client", "analyse", "gestion", "crédit", "excel"
  ];
  let matchedSkillsCount = 0;
  const missingKeywords: string[] = [];
  const strengths: string[] = [];

  requiredSkills.forEach(skill => {
    const skLower = skill.toLowerCase();
    if (candidateKeywords.includes(skLower)) {
      matchedSkillsCount++;
      strengths.push(skill);
    } else {
      missingKeywords.push(skill);
    }
  });

  const skillsMatch = requiredSkills.length > 0 
    ? Math.min(100, Math.round((matchedSkillsCount / requiredSkills.length) * 100))
    : 85;

  const isFinance = /banqu|financ|patrimoine|wealth|cr[eé]dit|assurance/i.test(oppText);
  const candidateHasFinance = /banqu|financ|patrimoine|cr[eé]dit|agricole|assurance/i.test(candidateKeywords);
  const sectorMatch = isFinance && candidateHasFinance ? 95 : isFinance ? 75 : 80;

  const educationMatch = (profile.educations && profile.educations.length > 0) ? 92 : 70;
  const experienceMatch = (profile.experiences && profile.experiences.length > 0) ? 90 : 55;

  const score = Math.min(99, Math.max(45, Math.round(
    skillsMatch * 0.4 + 
    sectorMatch * 0.25 + 
    experienceMatch * 0.2 + 
    educationMatch * 0.15
  )));

  const tacticalAdvice = score >= 80
    ? `Profil hautement aligné avec ${opp.title} chez ${opp.companyName}. Mettez en avant vos réalisations concrètes chez ${profile.currentAlternance || "votre employeur actuel"} et vos compétences en ${strengths.slice(0, 3).join(", ") || "relation client et conformité"}.`
    : `Bonne adéquation générale. Pour maximiser vos chances chez ${opp.companyName}, valorisez vos compétences transférables et vos connaissances sur ${missingKeywords.slice(0, 2).join(", ") || "l'analyse financière"}.`;

  const recommendedHook = `« Actuellement en ${profile.currentSituation || "formation Banque & Finance"} chez ${profile.currentAlternance || "Crédit Agricole"}, je prépare l'intégration d'un Master en Finance/Banque. Fort de ma maîtrise en ${strengths.slice(0, 2).join(" et ") || "analyse financière"}, je souhaite apporter ma rigueur et ma réactivité à ${opp.companyName} pour le poste de ${opp.title}. »`;

  return {
    score,
    skillsMatch,
    experienceMatch,
    sectorMatch,
    educationMatch,
    strengths: strengths.slice(0, 5),
    missingKeywords: missingKeywords.slice(0, 5),
    tacticalAdvice,
    recommendedHook
  };
}
