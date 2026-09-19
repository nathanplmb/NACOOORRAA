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
 * Heuristic classifier fallback when Gemini API is unavailable or rate limited.
 */
function analyzeWithHeuristics(
  rawContacts: Array<{ fullName: string; jobTitle: string; companyName: string }>,
  candidateProfile: CandidateProfile
) {
  const profileSchool = (candidateProfile.currentSituation || "").toLowerCase();
  const currentCompany = (candidateProfile.currentAlternance || "").toLowerCase();

  return rawContacts.map(c => {
    const job = (c.jobTitle || "").toLowerCase();
    const comp = (c.companyName || "").toLowerCase();
    const name = c.fullName || "Contact";

    let category: ContactCategory = "other";
    let relevanceScore = 45;
    const connectionPoints: string[] = [];
    let normalizedJobTitle = c.jobTitle || "Professionnel";

    // 1. Recruiter detection
    const isRecruiter = /recrut|talent|rh\b|drh|ressources humaines|headhunter|chasseur|campus manager|people|human resources/i.test(job);
    if (isRecruiter) {
      category = "recruiter";
      relevanceScore = 88;
      connectionPoints.push("Recruteur RH / Talent Acquisition");
      normalizedJobTitle = c.jobTitle.replace(/^(chargé de|responsable|directeur)\s+/i, (m) => m).trim();
    }

    // 2. Alumni detection (based on university / institute keywords)
    const isAlumni = (/iut|clermont|montluçon|uca|iae|polytech|auvergne/i.test(job) || /iut|clermont|montluçon|uca|auvergne/i.test(comp)) && 
                     (profileSchool.includes("iut") || profileSchool.includes("clermont") || profileSchool.includes("montluçon") || profileSchool.includes("uca"));
    if (isAlumni) {
      category = "alumni";
      relevanceScore = Math.max(relevanceScore, 95);
      connectionPoints.unshift("Réseau Alumni / Même établissement");
    }

    // 3. Sector pro detection (finance, banking, wealth management, fintech, insurance, audit)
    const isSectorPro = /patrimoine|wealth|banqu|financ|fintech|invest|credit|crédit|assurance|asset|portfolio|trading|analyste|cgp|gestion privée|auditeur|risk|conformité|m&a|private equity/i.test(job) ||
                        /crédit agricole|lcl|bnp|société générale|axa|palatine|bpifrance|luko|payplug|boursorama|revolut|bpce|caisse d'epargne|banque populaire|cic|rothschild|natixis/i.test(comp);
    if (isSectorPro && category === "other") {
      category = "sector_pro";
      relevanceScore = 82;
      connectionPoints.push("Professionnel du secteur cible (Banque / Finance / Patrimoine)");
    }

    // 4. Student / Intern detection
    const isStudent = /étudiant|etudiant|student|alternan|stagiaire|intern\b|apprenti|master\s*\d|but\s*tc|licence/i.test(job);
    if (isStudent && category === "other") {
      category = "student";
      relevanceScore = 65;
      connectionPoints.push("Étudiant / En recherche de parcours");
    } else if (category === "other" && job.length > 2) {
      category = "other_pro";
      relevanceScore = 52;
      connectionPoints.push("Contact réseau professionnel");
    }

    // Bonus score if in same company as target or current alternance
    if (currentCompany && currentCompany.length > 2 && comp.includes(currentCompany.substring(0, 8))) {
      relevanceScore = Math.min(100, relevanceScore + 12);
      connectionPoints.push(`Même groupe : ${c.companyName}`);
    }

    if (connectionPoints.length === 0) {
      connectionPoints.push("Contact importé LinkedIn");
    }

    return {
      fullName: name,
      normalizedJobTitle: normalizedJobTitle || c.jobTitle || "Professionnel",
      category,
      relevanceScore,
      connectionPoints,
      academicPath: isAlumni ? "IUT Clermont Auvergne" : "",
      previousCompanies: []
    };
  });
}

/**
 * Normalizes a list of imported LinkedIn contacts with model cascade and heuristic fallback.
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
  if (!rawContacts || rawContacts.length === 0) return [];

  const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!key) {
    return analyzeWithHeuristics(rawContacts, candidateProfile);
  }

  const prompt = `
    Tu es l'intelligence artificielle de NACORA, un accélérateur de carrière expert en finance, banque et fintech.
    Analyse les contacts LinkedIn ci-dessous et catégorise-les avec une haute précision par rapport au profil du candidat.
    
    Profil du Candidat :
    - Nom : ${candidateProfile.fullName || "Candidat"}
    - Situation / Études : ${candidateProfile.currentSituation || "Étudiant en BUT TC à l'IUT Clermont Auvergne"}
    - Alternance actuelle : ${candidateProfile.currentAlternance || "Banque"}
    - Masters ciblés : ${(candidateProfile.targetMasters || []).join(", ") || "Finance / Gestion de patrimoine / Fintech"}
    - Compétences clés : ${(candidateProfile.skills || []).join(", ")}

    Règles de classification :
    1. "recruiter" : Recruteur, RH, Talent Acquisition, Chargé de recrutement, Headhunter, DRH, People Lead.
    2. "alumni" : Personne issue du même établissement ou réseau académique (${candidateProfile.currentSituation || "IUT / Université / IAE"}).
    3. "student" : Étudiant, alternant, stagiaire ou apprenti.
    4. "sector_pro" : Professionnel exerçant dans les métiers ou entreprises cibles (Banque, Gestion de patrimoine, Finance de marché, FinTech, Assurance, Private Equity).
    5. "other_pro" : Professionnel d'un autre secteur d'activité (Industrie, Santé, Dev, etc.).
    6. "other" : Autre profil.

    Score de pertinence (0 à 100) :
    - Alumni même école : 88-98
    - Recruteur RH banque/finance : 85-95
    - Pro secteur cible : 75-90
    - Étudiant même filière : 60-75
    - Pro autre secteur : 45-60

    Points de connexion (connectionPoints) :
    - Liste courte de 1 à 3 points concrets et valorisants (ex: "Alumni IUT Clermont Auvergne", "Recruteur RH chez Crédit Agricole", "Expertise Gestion de Patrimoine").

    Format JSON attendu :
    [
      {
        "fullName": "Nom exact",
        "normalizedJobTitle": "Intitulé de poste professionnel clair",
        "category": "recruiter | alumni | student | sector_pro | other_pro | other",
        "relevanceScore": 90,
        "connectionPoints": ["Point 1", "Point 2"],
        "academicPath": "Parcours académique abrégé si identifiable",
        "previousCompanies": []
      }
    ]

    Contacts à analyser :
    ${JSON.stringify(rawContacts)}
  `;

  const modelCascade = [
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest"
  ];

  let ai: GoogleGenAI;
  try {
    ai = getAi();
  } catch (e) {
    return analyzeWithHeuristics(rawContacts, candidateProfile);
  }

  for (const modelName of modelCascade) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      });

      const text = response.text || "[]";
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure every contact is properly shaped
        return rawContacts.map((c, idx) => {
          const match = parsed[idx] || parsed.find(p => p.fullName === c.fullName);
          if (match) {
            return {
              fullName: match.fullName || c.fullName,
              normalizedJobTitle: match.normalizedJobTitle || c.jobTitle || "Professionnel",
              category: (["recruiter", "alumni", "student", "sector_pro", "other_pro", "other"].includes(match.category) 
                ? match.category 
                : "other") as ContactCategory,
              relevanceScore: typeof match.relevanceScore === "number" ? match.relevanceScore : 50,
              connectionPoints: Array.isArray(match.connectionPoints) && match.connectionPoints.length > 0
                ? match.connectionPoints 
                : ["Contact importé LinkedIn"],
              academicPath: match.academicPath || "",
              previousCompanies: Array.isArray(match.previousCompanies) ? match.previousCompanies : []
            };
          }
          return analyzeWithHeuristics([c], candidateProfile)[0];
        });
      }
    } catch (modelErr: any) {
      const errMsg = modelErr?.message || String(modelErr);
      const isQuota = errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("Quota exceeded");
      if (isQuota) {
        console.log(`[analyzeLinkedInContacts] Quota API atteint, bascule immédiate sur le moteur heuristique.`);
        return analyzeWithHeuristics(rawContacts, candidateProfile);
      }
      console.warn(`[analyzeLinkedInContacts] Modèle ${modelName} indisponible, passage au suivant:`, errMsg);
    }
  }

  // If all models failed, use deterministic heuristic engine
  return analyzeWithHeuristics(rawContacts, candidateProfile);
}

const CASCADE_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest"
];

/**
 * Deterministic fallback generator when Gemini API is under high demand (503 / 429) or unavailable.
 */
function generateFallbackMessage(
  contactName: string,
  contactCompany: string,
  contactJob: string,
  point: string,
  senderName: string,
  format: 'invite' | 'inmail' | 'followup',
  opportunityTitle?: string
): string {
  const firstName = contactName.split(" ")[0] || contactName;

  if (format === 'invite') {
    return `Bonjour ${firstName}, ayant un grand intérêt pour ${contactCompany || "vos activités"} (${point}), je serais ravi de vous rejoindre sur LinkedIn pour suivre vos actualités et échanger sur nos métiers. Bien cordialement, ${senderName}`;
  }

  if (format === 'followup') {
    return `Bonjour ${firstName},\n\nJe me permets de vous relancer suite à ma démarche récente. Évoluant dans le secteur et préparant mes prochaines étapes professionnelles, j'aurais beaucoup apprécié recueillir votre retour d'expérience sur ${contactCompany}.\n\nRestant à votre entière disposition,\nBien cordialement,\n${senderName}`;
  }

  // inmail
  return `Bonjour ${firstName},\n\nActuellement en parcours spécialisé et passionné par les enjeux de ${contactCompany}, je vous contacte car votre expérience en tant que ${contactJob} a tout particulièrement retenu mon attention (${point}).\n\n${opportunityTitle ? `Candidatant activement pour le poste de ${opportunityTitle}, ` : ""}Je serais très honoré de pouvoir échanger quelques minutes avec vous afin de bénéficier de vos précieux conseils sur les dynamiques du secteur.\n\nEn vous remerciant pour votre temps,\nBien cordialement,\n${senderName}`;
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
  opportunityTitle?: string,
  format: 'invite' | 'inmail' | 'followup' = 'invite'
): Promise<string> {
  const senderName = candidateProfile.fullName || "Nathan";
  const pointsSummary = connectionPoints && connectionPoints.length > 0 ? connectionPoints[0] : "votre parcours inspirant";

  try {
    const ai = getAi();
    const formatInstructions = format === 'invite'
      ? 'Court message d\'invitation LinkedIn (STRICTEMENT MOINS DE 280 CARACTÈRES espace compris pour tenir dans la limite de note d\'invitation LinkedIn).'
      : format === 'inmail'
      ? 'Message d\'approche InMail ou Email personnalisé (environ 100 à 150 mots), structuré en 2-3 courts paragraphes.'
      : 'Message de relance bienveillant et concis (environ 60 à 90 mots) faisant suite à un premier échange ou une candidature.';

    const prompt = `
      Tu es l'assistant de networking de NACORA.
      Rédige un message d'approche professionnel en français pour contacter cette personne sur LinkedIn ou par email.

      Format requis : ${formatInstructions}
      
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
      ${opportunityTitle ? `- Opportunité liée : Candidature pour ${opportunityTitle}` : ""}

      Consignes de style :
      - Ton professionnel, respectueux, direct et poli (vouvoiement).
      - Pas de pitch commercial agressif. Demande un court retour d'expérience ou échange de conseils.
      - Valorise subtilement le point de connexion si présent.

      Renvoie UNIQUEMENT le texte final du message sans aucun commentaire.
    `;

    for (const model of CASCADE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
        });

        if (response && response.text) {
          return response.text.trim();
        }
      } catch (err: any) {
        console.warn(`[generateOutreachMessage] Model ${model} failed, trying cascade:`, err?.message || err);
      }
    }

    return generateFallbackMessage(contactName, contactCompany, contactJob, pointsSummary, senderName, format, opportunityTitle);
  } catch (error) {
    console.warn("[generateOutreachMessage] AI models unavailable, generating smart fallback:", error);
    return generateFallbackMessage(contactName, contactCompany, contactJob, pointsSummary, senderName, format, opportunityTitle);
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

    for (const model of CASCADE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: geminiHistory,
          config: {
            systemInstruction: systemInstruction,
          }
        });

        if (response && response.text) {
          return response.text;
        }
      } catch (err: any) {
        console.warn(`[handlePersonaChat] Model ${model} error, trying cascade:`, err?.message || err);
      }
    }

    return "Je suis à votre écoute pour optimiser vos candidatures et préparer vos entretiens. N'hésitez pas à reformuler votre question ou préciser votre besoin.";
  } catch (error) {
    console.error("Error in handlePersonaChat:", error);
    return "Je suis à votre écoute pour optimiser vos candidatures et préparer vos entretiens. N'hésitez pas à reformuler votre question ou préciser votre besoin.";
  }
}
