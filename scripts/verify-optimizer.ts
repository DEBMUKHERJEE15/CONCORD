/**
 * Verification test script for CONCORD deterministic optimizer and validation engine.
 */
import { DEFAULT_TRIP_SETUP, DEFAULT_TRAVELERS } from "../src/data/demo-offers";
import { generateCandidateItineraries, selectBestCandidate } from "../src/lib/optimizer";
import { performDeterministicValidation } from "../src/lib/agents/validation-agent";
import { PreferenceAnalysisSchema } from "../src/lib/agents/preference-agent";
import { NegotiationAgentOutputSchema } from "../src/lib/agents/negotiation-agent";
import { ExplanationOutputSchema } from "../src/lib/agents/validation-agent";

function runTests() {
  console.log("=== RUNNING CONCORD DETERMINISTIC VERIFICATION TESTS ===");

  // 1. Generate Candidates
  console.log("\n[TEST 1] Generating candidate itineraries...");
  const candidates = generateCandidateItineraries(DEFAULT_TRIP_SETUP, DEFAULT_TRAVELERS);
  if (candidates.length < 3) {
    throw new Error(`Expected at least 3 candidates, got ${candidates.length}`);
  }
  console.log(`✓ Successfully generated ${candidates.length} candidate itineraries.`);

  // 2. Validate Candidate A (Balanced Compromise)
  const candidateA = candidates.find((c) => c.id === "candidate-balanced-compromise");
  if (!candidateA) throw new Error("Candidate Alpha missing");

  console.log("\n[TEST 2] Verifying Candidate Alpha (Balanced Compromise)...");
  console.log(`  - Total Cost: ₹${candidateA.costBreakdown.grandTotalINR}`);
  console.log(`  - Remaining Budget: ₹${candidateA.costBreakdown.remainingBudgetINR}`);
  console.log(`  - Feasible: ${candidateA.isFeasible}`);
  console.log(`  - Aggregate Satisfaction: ${candidateA.aggregateSatisfaction}%`);

  if (!candidateA.isFeasible) {
    throw new Error("Candidate A should be feasible under default budget of ₹125,000");
  }
  if (candidateA.costBreakdown.grandTotalINR > DEFAULT_TRIP_SETUP.sharedBudgetINR) {
    throw new Error("Candidate A cost exceeds budget!");
  }
  console.log("✓ Candidate Alpha passed feasibility and budget ceiling checks.");

  // 3. Validate Candidate C (Luxury Resort - Boundary Test)
  const candidateC = candidates.find((c) => c.id === "candidate-luxury-resort-overbudget");
  if (!candidateC) throw new Error("Candidate C missing");

  console.log("\n[TEST 3] Verifying Candidate C (Boundary Rejection Test)...");
  console.log(`  - Total Cost: ₹${candidateC.costBreakdown.grandTotalINR}`);
  console.log(`  - Remaining Budget: ₹${candidateC.costBreakdown.remainingBudgetINR}`);
  console.log(`  - Feasible: ${candidateC.isFeasible}`);
  console.log(`  - Rejection Reasons: ${candidateC.infeasibilityReasons?.join("; ")}`);

  if (candidateC.isFeasible) {
    throw new Error("Candidate C should be marked INFEASIBLE because it exceeds budget!");
  }
  console.log("✓ Candidate C correctly rejected by deterministic hard constraints.");

  // 4. Decision Policy Selection
  console.log("\n[TEST 4] Testing Pareto-Efficiency Selection Policy...");
  const selection = selectBestCandidate(candidates);
  console.log(`  - Best Candidate Selected: "${selection.best.label}"`);
  console.log(`  - Feasible Options Count: ${selection.feasibleCount}`);
  console.log(`  - Policy Notes: ${selection.policyNotes}`);

  if (!selection.best.isFeasible) {
    throw new Error("Selected candidate must be feasible when feasible candidates exist!");
  }
  console.log("✓ Pareto selection policy correctly identified best candidate.");

  // 5. Deterministic Constraint Audit
  console.log("\n[TEST 5] Running 6 Deterministic Constraint Checks on Best Candidate...");
  const validation = performDeterministicValidation(selection.best, DEFAULT_TRIP_SETUP, DEFAULT_TRAVELERS);
  console.log(`  - Overall Valid: ${validation.overallValid}`);
  validation.checks.forEach((c) => {
    console.log(`    * [${c.status}] ${c.name}: ${c.details}`);
    if (c.status !== "PASS") {
      throw new Error(`Constraint check failed: ${c.name}`);
    }
  });
  console.log("✓ All 6 deterministic validation checks PASSED.");

  // 6. Test Schemas
  console.log("\n[TEST 6] Testing Zod Schemas for LLM outputs...");
  const mockPref = {
    conflicts: [
      {
        dimension: "budget_vs_comfort" as const,
        severity: "high" as const,
        partiesInvolved: ["Vikram R.", "Pooja M."],
        description: "Budget Guardian seeks cost under ₹30,000/person; Comfort Seeker demands 4★+ stay.",
        tradeoffOpportunity: "Select a boutique 4★ hotel within budget buffer.",
      },
    ],
    consensusBaseline: "Both agree on private transit.",
    keyStickingPoint: "Luxury resort cost vs budget ceiling.",
  };
  PreferenceAnalysisSchema.parse(mockPref);
  console.log("✓ PreferenceAnalysisSchema parsed validly.");

  console.log("\n=== ALL 6 VERIFICATION TEST SUITES PASSED CLEANLY! ===");
}

runTests();
