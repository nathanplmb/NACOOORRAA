import {
  CareerContextPayload,
  buildCVPrompt,
  buildCoverLetterPrompt,
  buildEmailPrompt,
  buildNetworkingPrompt,
  buildInterviewPrompt
} from "../api/careerMethods.ts";

/**
 * ============================================================================
 * NACORA PHASE 4 FUNCTIONAL TEST SUITE
 * Validates prompt routing, intent handling, and context selection.
 * ============================================================================
 */

function runSuite() {
  console.log("=== EXÉCUTION DU SUITE DE TESTS FONCTIONNELS NACORA PHASE 4 ===");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. TEST ROUTAGE INTENTION : Préparation entretien vs Simulation
  const payload: CareerContextPayload = { candidateProfile: { fullName: "Test" } };
  const promptPrep = buildInterviewPrompt(payload, { mode: "prep_guide" });
  const promptSim = buildInterviewPrompt(payload, { mode: "simulation" });

  assert(promptPrep.includes("fiche de préparation"), "Test 1.1 : Routage vers préparation entretien");
  assert(promptSim.includes("simulation interactive"), "Test 1.2 : Routage vers simulation entretien");

  // 2. TEST ROUTAGE INTENTION : E-mail avec lettre vs CV seul
  const promptEmailWith = buildEmailPrompt(payload, { scenario: "with_cover_letter" });
  const promptEmailOnly = buildEmailPrompt(payload, { scenario: "cv_only" });

  assert(promptEmailWith.includes("with_cover_letter"), "Test 2.1 : Routage vers e-mail avec lettre");
  assert(promptEmailOnly.includes("cv_only"), "Test 2.2 : Routage vers e-mail CV seul");

  console.log(`\nTests passés : ${passed} | Tests échoués : ${failed}`);
}

runSuite();
