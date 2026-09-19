import { GoogleGenAI } from "@google/genai";
import { ExtractedJobInfo, CandidateProfile, ContactCategory } from "../types.ts";

// Lazy-initialize Gemini AI to prevent startup crashes if key is missing
let aiClient: GoogleGenAI | null = null;

function getAi(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!key) {
      console.warn("WARNING: GEMINI_API_KEY is not defined. AI features will operate in sandbox mode.");
      throw new Error("GEMINI_API_KEY is required");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

/**
 * Extracts structured job details from a raw job description or text.
 */
export async function extractJobDetails(jobDescription: string): Promise<ExtractedJobInfo> {
  try {
    const ai = getAi();
    const prompt = `
      Tu es un expert en recrutement bancaire, financier et ATS (Applicant Tracking System).
      Analyse minutieusement la description de l'offre d'emploi ci-dessous et extrait l'intégralité des informations structurées au format JSON exact demandé.
      Ne fais aucune extrapolation hasardeuse, mais sois très précis et exhaustif pour peupler une fiche de poste complète.

      Format JSON attendu :
      {
        "missions": [
          "Mission détaillée 1 avec son objectif et contexte opérationnel",
          "Mission détaillée 2...",
          ...
        ],
        "competencesRequises": ["compétence technique indispensable 1", ...],
        "competencesAppreciees": ["compétence technique bonus ou atout 1", ...],
        "softSkills": ["qualité relationnelle ou comportementale 1", ...],
        "outilsLogiciels": ["outil, progiciel, plateforme ou logiciel requis 1", ...],
        "formation": "Niveau d'études et filière requis (ex: Bac+3 à Bac+5 en Économie, Finance ou Banque)",
        "experienceRequise": "Années ou niveau d'expérience requis (ex: Débutant en alternance accepté)",
        "languesRequises": ["Français (Natif/Courant)", "Anglais (Professionnel)", ...],
        "avantages": ["Rémunération conventionnelle selon barème", "Titres-restaurant pris en charge à 60%", "Prise en charge 50% transports", ...],
        "avantagesEnvironnement": ["Télétravail possible 1 à 2 jours/semaine", "Espaces de travail récents", ...],
        "etapesRecrutement": [
          "Échange téléphonique de qualification RH (30 min)",
          "Entretien approfondi avec le Manager d'équipe (45 min)",
          "Entretien final ou restitution RH (30 min)"
        ],
        "recruiterContact": {
          "name": "Nom du contact RH si mentionné, sinon vide",
          "role": "Poste ou fonction du recruteur",
          "email": "Email si mentionné",
          "phone": "Téléphone si mentionné",
          "linkedin": "Lien ou nom LinkedIn si mentionné"
        },
        "entrepriseDetails": {
          "presentation": "Présentation globale concise et valorisante de l'entreprise",
          "parentGroup": "Maison mère ou groupe de rattachement si applicable",
          "secteur": "Secteur d'activité précis",
          "taille": "Effectif approximatif (ex: 2 500 collaborateurs)",
          "siege": "Siège social ou implantation principale",
          "chiffresCles": [
            { "label": "Collaborateurs", "value": "+2 500" },
            { "label": "Réseau d'agences", "value": "120" }
          ],
          "faitsMarquants": [
            "Projet de transformation digitale engagé",
            "Politique active de formation des alternants"
          ],
          "partenairesClients": [
            "Entreprises régionales",
            "Particuliers et professionnels indépendants"
          ]
        }
      }

      Description de l'offre :
      ${jobDescription}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    return JSON.parse(text) as ExtractedJobInfo;
  } catch (error) {
    console.error("Error in extractJobDetails:", error);
    // Return sensible fallback to ensure no app crash
    return {
      missions: [
        "Accompagnement de la clientèle et analyse des besoins patrimoniaux",
        "Préparation des dossiers financiers et suivi rigoureux des opérations courantes",
        "Participation active aux actions commerciales de l'agence et prospection ciblée"
      ],
      competencesRequises: ["Analyse financière de base", "Maîtrise des techniques de vente bancaire", "Réglementation bancaire & conformité"],
      competencesAppreciees: ["Connaissance des produits d'épargne et d'assurance-vie", "Appétence fintech & outils digitaux"],
      softSkills: ["Aisance relationnelle", "Écoute active", "Rigueur méthodologique", "Esprit d'équipe"],
      outilsLogiciels: ["Excel avancé", "Outils CRM bancaires", "Suite bureautique"],
      formation: "Bac+3 à Bac+5 en Banque, Finance ou Commerce",
      experienceRequise: "Première expérience ou alternance bienvenue",
      languesRequises: ["Français (Courant)"],
      avantages: ["Rémunération conventionnelle", "Titres-restaurant", "Prise en charge 50% transports"],
      avantagesEnvironnement: ["Locaux modernes", "Accompagnement par un tuteur dédié"],
      etapesRecrutement: [
        "1. Échange téléphonique de pré-sélection (20 min)",
        "2. Entretien avec le responsable d'agence (45 min)",
        "3. Validation RH et proposition contractuelle"
      ]
    };
  }
}

/**
 * Normalizes a list of imported LinkedIn contacts.
 * Input: Raw contact details (fullName, jobTitle, companyName)
 * Output: Enrichment, categorization, and relevance scoring relative to the candidate's profile.
 */
export async function analyzeLinkedInContacts(
  rawContacts: Array<{ fullName: string; jobTitle: string; companyName: string }>,
  candidateProfile: CandidateProfile
): Promise<Array<{
  fullName: string;
  normalizedJobTitle: string;
  category: ContactCategory;
  relevanceScore: number;
  connectionPoints: string[];
  academicPath: string;
  previousCompanies: string[];
}>> {
  try {
    const ai = getAi();
    const prompt = `
      Tu es l'intelligence artificielle de NACORA, un accélérateur de carrière.
      Analyse les contacts importés ci-dessous et catégorise-les par rapport au profil du candidat.
      
      Profil du Candidat :
      - Nom : ${candidateProfile.fullName}
      - Situation : ${candidateProfile.currentSituation}
      - Alternance actuelle : ${candidateProfile.currentAlternance}
      - Masters ciblés : ${candidateProfile.targetMasters.join(", ")}
      - Compétences clés : ${candidateProfile.skills.join(", ")}

      Pour chaque contact, tu dois :
      1. Normaliser le titre du poste (ex: "Wealth Manager" -> "Conseiller en Gestion de Patrimoine").
      2. Le classer dans l'une des catégories suivantes :
         - "recruiter" (Recruteur, DRH, Talent Acquisition)
         - "alumni" (S'il a étudié au même endroit que le candidat : ${candidateProfile.currentSituation || "même filière/établissement"})
         - "student" (Étudiant actuellement en recherche ou dans la même filière)
         - "sector_pro" (Professionnel exerçant dans le secteur cible du candidat : ${candidateProfile.targetMasters.join(", ") || "Finance / Banque"})
         - "other_pro" (Professionnel d'un autre secteur)
         - "other" (Autre profil)
      3. Calculer un score de pertinence pondéré de 0 à 100 basé sur les facteurs : même établissement (Alumni = +35 pts), entreprise cible (${candidateProfile.currentAlternance || "secteur financier"} = +25 pts), catégorie recruteur = +30 pts, secteur d'activité concordant = +20 pts.
      4. Détecter des points de connexion réels à afficher (ex: "Même formation", "Travaille dans le secteur cible"). Ne rien inventer.
      5. Fournir un parcours académique abrégé plausible ou vide si non détectable.
      6. Extraire les entreprises précédentes listées (ou laisser vide si inconnu).

      Format JSON attendu :
      [
        {
          "fullName": "Nom du contact",
          "normalizedJobTitle": "Poste normalisé",
          "category": "recruiter | alumni | student | sector_pro | other_pro | other",
          "relevanceScore": 85,
          "connectionPoints": ["Point de connexion 1", ...],
          "academicPath": "IUT Clermont Auvergne",
          "previousCompanies": ["Entreprise A"]
        },
        ...
      ]

      Liste des contacts bruts à analyser :
      ${JSON.stringify(rawContacts)}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "[]";
    return JSON.parse(text);
  } catch (error) {
    console.error("Error in analyzeLinkedInContacts:", error);
    // Safe fallbacks
    return rawContacts.map(c => ({
      fullName: c.fullName,
      normalizedJobTitle: c.jobTitle || "Professionnel",
      category: "other" as ContactCategory,
      relevanceScore: 50,
      connectionPoints: ["Importé via LinkedIn"],
      academicPath: "Inconnu",
      previousCompanies: []
    }));
  }
}

/**
 * Generates a highly personalized outreach message for LinkedIn.
 */
export async function generateOutreachMessage(
  contactName: string,
  contactJob: string,
  contactCompany: string,
  connectionPoints: string[],
  candidateProfile: CandidateProfile,
  opportunityTitle?: string
): Promise<string> {
  try {
    const ai = getAi();
    const prompt = `
      Rédige un message d'approche LinkedIn personnalisé, court, professionnel et impactant (max 300 caractères pour respecter la limite d'invitation LinkedIn, ou max 600 caractères si avec option mail/inmail).
      
      Destinataire :
      - Nom : ${contactName}
      - Poste : ${contactJob}
      - Entreprise : ${contactCompany}
      - Points communs détectés : ${connectionPoints.join(", ")}

      Expéditeur (Candidat) :
      - Nom : ${candidateProfile.fullName}
      - Situation : ${candidateProfile.currentSituation}
      - Alternance : ${candidateProfile.currentAlternance}
      - Objectif : Intégrer un master en ${candidateProfile.targetMasters.join(" / ")}
      ${opportunityTitle ? `- Opportunité liée : Candidature en cours pour le poste de ${opportunityTitle}` : ""}

      Consignes de style :
      - Ton professionnel mais chaleureux, direct, poli.
      - Utilise le vouvoiement.
      - Ne fais pas de "pitch" trop agressif. Demande simplement un court échange de conseils sur son parcours ou sur l'entreprise.
      - Fais un lien subtil et intelligent avec les points communs ou l'intérêt pour le secteur.

      Renvoie UNIQUEMENT le texte du message d'invitation, sans fioritures, sans commentaires additionnels.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
    });

    return response.text?.trim() || "Bonjour, ravi de vous compter parmi mes contacts. Au plaisir d'échanger sur nos parcours respectifs.";
  } catch (error) {
    console.error("Error in generateOutreachMessage:", error);
    const senderName = candidateProfile.fullName || "Un candidat passionné";
    return `Bonjour ${contactName},\n\nAyant un vif intérêt pour vos activités au sein de ${contactCompany}, je serais ravi de vous rejoindre sur LinkedIn pour échanger sur vos parcours et opportunités dans ce secteur.\n\nBien cordialement,\n${senderName}`;
  }
}

/**
 * Handles chat interactions with different assistant personas.
 */
export async function handlePersonaChat(
  personaId: string,
  messages: Array<{ role: 'user' | 'model'; text: string }>,
  candidateProfile: CandidateProfile
): Promise<string> {
  try {
    const ai = getAi();
    
    // Define the system instructions based on the selected persona
    let systemInstruction = "";
    switch (personaId) {
      case "general":
        systemInstruction = `
          Tu es le Conseiller Carrière Général de NACORA. Ton but est de conseiller le candidat sur sa recherche d'alternance/emploi, d'optimiser ses choix de formation et de l'aider à construire sa stratégie de carrière.
          Le candidat s'appelle ${candidateProfile.fullName}.
          Sa situation actuelle : ${candidateProfile.currentSituation}.
          Son alternance actuelle : ${candidateProfile.currentAlternance}.
          Ses objectifs de master : ${candidateProfile.targetMasters.join(", ")}.
          Ses compétences : ${candidateProfile.skills.join(", ")}.

          Sois pragmatique, donne des conseils d'expert en recrutement, et adopte un ton encourageant et professionnel. Reste concis et structuré dans tes réponses.
        `;
        break;
      case "interview":
        systemInstruction = `
          Tu es le Coach d'Entretien d'Embauche de NACORA. Ton but est de simuler des entretiens et d'enseigner la méthode STAR (Situation, Tâche, Action, Résultat).
          Le candidat s'appelle ${candidateProfile.fullName || "le candidat"}.
          Sa situation : ${candidateProfile.currentSituation || "en recherche"}.
          Son expérience (${candidateProfile.currentAlternance || "expérience passée"}) et ses compétences (${candidateProfile.skills.join(", ") || "compétences clés"}) sont des atouts majeurs à valoriser.
          
          Tu peux proposer des questions d'entretien courantes dans la banque/finance/fintech et évaluer ses réponses en lui donnant un feedback constructif.
        `;
        break;
      case "cv_letter":
        systemInstruction = `
          Tu es l'Expert CV & Lettres de NACORA. Ton but est d'aider à concevoir et d'optimiser des CV conformes aux filtres ATS, de rédiger des lettres de motivation percutantes en utilisant des verbes d'action forts et des accroches convaincantes.
          Le candidat s'appelle ${candidateProfile.fullName || "le candidat"}.
          Tu connais son profil : ${candidateProfile.currentSituation || "étudiant"}, alternance/poste : ${candidateProfile.currentAlternance || "non renseigné"}, compétences : ${candidateProfile.skills.join(", ") || "non renseignées"}.
          
          Donne des conseils de mise en page, de formulation de phrases clés d'accroche et d'ajustement du CV par rapport aux offres visées.
        `;
        break;
      case "networking":
        systemInstruction = `
          Tu es le Stratège de Recherche & Réseau de NACORA. Ton rôle est de conseiller le candidat sur la prospection LinkedIn, l'approche du marché caché de l'emploi, et l'établissement de contacts clés (notamment avec les Alumni de son établissement).
          Candidat : ${candidateProfile.fullName || "le candidat"}.
          Situation : ${candidateProfile.currentSituation || "en études"}.
          
          Donne des modèles de messages, des techniques pour obtenir des entretiens d'information et des stratégies de suivi de réseau.
        `;
        break;
      case "negotiation":
        systemInstruction = `
          Tu es l'Expert en Négociation Salariale de NACORA. Ton rôle est de préparer le candidat à aborder la rémunération lors des entretiens d'alternance, de stage ou de premier emploi, en s'appuyant sur les grilles, la valeur ajoutée et les techniques de négociation bienveillante.
          Candidat : ${candidateProfile.fullName || "le candidat"}.
          Alternance/Poste actuel : ${candidateProfile.currentAlternance || "non renseigné"}.
          
          Donne des formulations précises, des arguments concrets de valeur, et des conseils pour évaluer un package global (fixe, primes, avantages).
        `;
        break;
      default:
        systemInstruction = `Tu es NACORA AI, un assistant d'accélération de carrière intelligent. Aide le candidat ${candidateProfile.fullName} dans ses démarches de recrutement.`;
    }

    // Standardize and compile chat history
    const geminiHistory = messages.map(msg => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));

    // Generate content using model with system instructions
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: geminiHistory,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    return response.text || "Désolé, je n'ai pas pu formuler de réponse. Veuillez réessayer.";
  } catch (error) {
    console.error("Error in handlePersonaChat:", error);
    return "Désolé, un problème de connexion avec l'IA de NACORA est survenu. Veuillez vous assurer que la clé d'API Gemini est correctement configurée.";
  }
}
