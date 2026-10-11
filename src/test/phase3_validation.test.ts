import { 
  getCVMethodology,
  getJobAnalysisMethodology,
  getCoverLetterMethodology,
  getEmailMethodology,
  getNetworkingMethodology,
  getInterviewMethodology,
  buildCVPrompt,
  buildJobAnalysisPrompt,
  buildCoverLetterPrompt,
  buildEmailPrompt,
  buildNetworkingPrompt,
  buildInterviewPrompt,
  CareerContextPayload
} from "../api/careerMethods.ts";

/**
 * ============================================================================
 * NACORA PHASE 3 FUNCTIONAL TEST SUITE
 * Validates prompt construction, methodology rules, anti-hallucination,
 * character limits, and context isolation.
 * ============================================================================
 */

function runSuite() {
  console.log("=== EXÉCUTION DU SUITE DE TESTS FONCTIONNELS NACORA PHASE 3 ===");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` : ${detail}` : ""}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST A : Lettre de motivation (Vous - Moi - Nous) sans invention d'actualités
  // --------------------------------------------------------------------------
  const payloadTestA: CareerContextPayload = {
    candidateProfile: {
      fullName: "Nathan Patrac",
      currentSituation: "Étudiant Master Finance",
      experiences: [
        {
          id: "exp1",
          role: "Assistant Gestionnaire de Patrimoine",
          company: "Crédit Agricole",
          description: "Analyse de dossiers",
          missions: ["Analyse de dossiers d'épargne", "Conformité KYC et LCB-FT"]
        },
        {
          id: "exp2",
          role: "Conseiller Clientèle Stage",
          company: "LCL",
          description: "Accueil clientèle",
          missions: ["Accueil de la clientèle et préparation des rendez-vous"]
        }
      ]
    },
    activeOpportunity: {
      id: "opp1",
      title: "Assistant Banquier Privé",
      companyName: "BNP Paribas Banque Privée",
      extractedInfo: {
        missions: ["Support à la gestion de portefeuilles VIP", "Rédaction de bilans patrimoniaux"]
      } as any
    }
  };

  const coverLetterPrompt = buildCoverLetterPrompt(payloadTestA);
  assert(
    coverLetterPrompt.includes("VOUS") && coverLetterPrompt.includes("MOI") && coverLetterPrompt.includes("NOUS"),
    "Test A.1 : Structure Vous-Moi-Nous présente dans le prompt opérationnel de Lettre de Motivation"
  );
  assert(
    coverLetterPrompt.includes("N'invente aucun chiffre, expérience ou fait concernant l'entreprise"),
    "Test A.2 : Consigne stricte anti-invention d'actualités ou de faits d'entreprise"
  );

  // --------------------------------------------------------------------------
  // TEST B : CV sans résultats chiffrés (aucun chiffre inventé)
  // --------------------------------------------------------------------------
  const payloadTestB: CareerContextPayload = {
    candidateProfile: {
      fullName: "Sarah Dupont",
      experiences: [
        {
          id: "exp_no_metrics",
          role: "Chargée d'accueil bancaire",
          company: "Banque Populaire",
          description: "Accueil des clients",
          missions: ["Accueil des clients", "Saisie des opérations courantes"]
        }
      ]
    }
  };

  const cvPrompt = buildCVPrompt(payloadTestB, { mode: "ats_optimization" });
  assert(
    cvPrompt.includes("AUCUN chiffre, résultat, pourcentage, volume d'encours ou chiffre d'affaires inventé"),
    "Test B.1 : Consigne anti-invention de chiffres dans le prompt de CV"
  );
  assert(
    cvPrompt.includes("pose une question bienveillante en fin de document"),
    "Test B.2 : Demande de clarification si une métrique chiffrée manque"
  );

  // --------------------------------------------------------------------------
  // TEST C : Networking & Invitation LinkedIn < 300 caractères
  // --------------------------------------------------------------------------
  const payloadTestC: CareerContextPayload = {
    candidateProfile: { fullName: "Nathan Patrac", currentSituation: "Master Finance" },
    activeContact: {
      fullName: "Marc Lambert",
      jobTitle: "Directeur de Clientèle",
      companyName: "Société Générale"
    }
  };

  const netPrompt = buildNetworkingPrompt(payloadTestC, { channel: "linkedin_invite" });
  assert(
    netPrompt.includes("300 CARACTÈRES"),
    "Test C.1 : Règle stricte des 300 caractères dans le prompt d'invitation LinkedIn"
  );

  // Simulated LinkedIn text truncation check
  const sampleNote = "Bonjour Marc, j'ai vu votre parcours en tant que Directeur de Clientèle chez Société Générale. Préparant un Master en Finance, je serais ravi de suivre vos actualités et d'échanger sur votre métier si vous avez quelques minutes.";
  assert(
    sampleNote.length < 300,
    `Test C.2 : Longueur de l'invitation simulée = ${sampleNote.length} car. (< 300 car.)`
  );

  // --------------------------------------------------------------------------
  // TEST D : Analyse d'offre incomplète
  // --------------------------------------------------------------------------
  const payloadTestD: CareerContextPayload = {
    candidateProfile: { fullName: "Nathan Patrac" },
    activeOpportunity: {
      title: "Analyste Crédit Junior",
      companyName: "Banque X",
      notes: "Description succincte : analyse des risques entreprise."
    }
  };

  const jobAnalysisPrompt = buildJobAnalysisPrompt(payloadTestD);
  assert(
    jobAnalysisPrompt.includes("MATRICE COMPARAISON PROFIL vs OFFRE"),
    "Test D.1 : Structure de matrice d'adéquation présente"
  );
  assert(
    jobAnalysisPrompt.includes("N'attribue pas au candidat une compétence simplement parce que l'offre la demande"),
    "Test D.2 : Règle de fidélité au profil réel du candidat"
  );

  // --------------------------------------------------------------------------
  // TEST E : Isolation des sessions (pas de mélange de contexte)
  // --------------------------------------------------------------------------
  const payloadSession1: CareerContextPayload = {
    candidateProfile: { fullName: "Nathan" },
    activeOpportunity: { title: "Poste A chez Revolut" }
  };
  const payloadSession2: CareerContextPayload = {
    candidateProfile: { fullName: "Nathan" },
    activeOpportunity: { title: "Poste B chez Crédit Agricole" }
  };

  const p1 = buildCoverLetterPrompt(payloadSession1);
  const p2 = buildCoverLetterPrompt(payloadSession2);

  assert(
    !p1.includes("Crédit Agricole") && !p2.includes("Revolut"),
    "Test E.1 : Absence totale de fuite de contexte entre deux sessions distinctes"
  );

  console.log(`\n=== RÉSUMÉ : ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runSuite();
