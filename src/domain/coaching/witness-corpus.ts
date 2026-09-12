import { readFileSync } from "node:fs";
import { Ajv2020 } from "ajv/dist/2020.js";
import corpusSchema from "../../../data/schemas/league-witness-corpus.schema.json" with { type: "json" };
import { calculateLeagueReadiness, countLeagueWitnessEvidence } from "./league-calibration.ts";
import type { LeagueWitnessCorpus, WitnessCorpusIssue, WitnessCorpusResult } from "./types.ts";

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateShape = ajv.compile<LeagueWitnessCorpus>(corpusSchema);

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

export function validateLeagueWitnessCorpusJson(
  rawJson: string,
): WitnessCorpusResult<LeagueWitnessCorpus> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (e: unknown) {
    return {
      success: false,
      errors: [
        {
          code: "INVALID_JSON",
          path: "$",
          message: `Failed to parse JSON: ${e instanceof Error ? e.message : String(e)}`,
        },
      ],
    };
  }

  const isValidShape = validateShape(parsed);
  if (!isValidShape) {
    const errors: WitnessCorpusIssue[] = (validateShape.errors ?? []).map((err) => ({
      code: "SCHEMA_VALIDATION_FAILED",
      path: err.instancePath || "$",
      message: `${err.message ?? "Schema validation error"} (${err.schemaPath})`,
    }));
    return { success: false, errors };
  }

  const document = parsed as LeagueWitnessCorpus;
  const semanticErrors: WitnessCorpusIssue[] = [];

  // Policy leakage check (FR-012)
  if (document.usagePolicy === "evaluation_only") {
    for (const [i, deck] of document.deckWitnesses.entries()) {
      if (deck.usagePolicy === "training_allowed") {
        semanticErrors.push({
          code: "USAGE_POLICY_LEAKAGE",
          path: `$.deckWitnesses[${String(i)}].usagePolicy`,
          message: "Deck witness with 'training_allowed' found in 'evaluation_only' corpus",
        });
      }
    }
  }

  // Semantic checks on draftWitnesses
  for (const [dIdx, draft] of document.draftWitnesses.entries()) {
    if (draft.leagueId !== document.leagueCalibration.leagueId) {
      semanticErrors.push({
        code: "LEAGUE_MISMATCH",
        path: `$.draftWitnesses[${String(dIdx)}].leagueId`,
        message: `Draft witness leagueId '${draft.leagueId}' does not match corpus leagueId '${document.leagueCalibration.leagueId}'`,
      });
    }

    if (!document.leagueCalibration.memberCubes.includes(draft.cubeKey)) {
      semanticErrors.push({
        code: "CUBE_NOT_IN_LEAGUE",
        path: `$.draftWitnesses[${String(dIdx)}].cubeKey`,
        message: `Draft witness cubeKey '${draft.cubeKey}' is not a member of league '${document.leagueCalibration.leagueId}'`,
      });
    }

    const picks = draft.picks;

    if (picks.length !== 45) {
      semanticErrors.push({
        code: "INVALID_PICK_COUNT",
        path: `$.draftWitnesses[${String(dIdx)}].picks`,
        message: `Expected exactly 45 picks, found ${String(picks.length)}`,
      });
    }

    const pickedCardIdsFromPicks: string[] = [];

    for (const [pIdx, pick] of picks.entries()) {
      const expectedPack = Math.floor(pIdx / 15) + 1;
      const expectedPick = (pIdx % 15) + 1;

      if (pick.packNumber !== expectedPack || pick.pickNumber !== expectedPick) {
        semanticErrors.push({
          code: "INVALID_PICK_ORDER",
          path: `$.draftWitnesses[${String(dIdx)}].picks[${String(pIdx)}]`,
          message: `Expected pick P${String(expectedPack)}P${String(expectedPick)}, got P${String(pick.packNumber)}P${String(pick.pickNumber)}`,
        });
      }

      if (!pick.offeredCardIds.includes(pick.pickedCardId)) {
        semanticErrors.push({
          code: "PICK_NOT_OFFERED",
          path: `$.draftWitnesses[${String(dIdx)}].picks[${String(pIdx)}]`,
          message: `Picked card '${pick.pickedCardId}' is not among offeredCardIds`,
        });
      }

      pickedCardIdsFromPicks.push(pick.pickedCardId);
    }

    // Pool must contain 45 cards matching the 45 picks
    if (draft.poolCardIds.length !== 45) {
      semanticErrors.push({
        code: "INVALID_POOL_SIZE",
        path: `$.draftWitnesses[${String(dIdx)}].poolCardIds`,
        message: `Expected poolCardIds to have length 45, found ${String(draft.poolCardIds.length)}`,
      });
    } else {
      const sortedPicks = [...pickedCardIdsFromPicks].sort();
      const sortedPool = [...draft.poolCardIds].sort();
      const match = sortedPicks.every((val, idx) => val === sortedPool[idx]);
      if (!match) {
        semanticErrors.push({
          code: "POOL_MISMATCH",
          path: `$.draftWitnesses[${String(dIdx)}].poolCardIds`,
          message: "Pool card IDs do not match the sequence of picked card IDs",
        });
      }
    }

    // Final deck must have exactly 40 cards
    if (draft.finalDeckCardIds.length !== 40) {
      semanticErrors.push({
        code: "INVALID_FINAL_DECK_SIZE",
        path: `$.draftWitnesses[${String(dIdx)}].finalDeckCardIds`,
        message: `Expected finalDeckCardIds to have exactly 40 cards, found ${String(draft.finalDeckCardIds.length)}`,
      });
    }

    // Deck evaluation cards must contain all cards in finalDeckCardIds for offline resolution
    const evalCardIds = new Set(draft.deckEvaluationCards.map((c) => c.id));
    const missingEvaluationCards = draft.finalDeckCardIds.filter((id) => !evalCardIds.has(id));
    if (missingEvaluationCards.length > 0) {
      semanticErrors.push({
        code: "UNRESOLVED_DECK_CARD",
        path: `$.draftWitnesses[${String(dIdx)}].deckEvaluationCards`,
        message: `Missing evaluation inputs for deck cards: ${missingEvaluationCards.join(", ")}`,
      });
    }
  }

  // Semantic checks on deckWitnesses
  for (const [wIdx, deck] of document.deckWitnesses.entries()) {
    if (deck.leagueId !== document.leagueCalibration.leagueId) {
      semanticErrors.push({
        code: "LEAGUE_MISMATCH",
        path: `$.deckWitnesses[${String(wIdx)}].leagueId`,
        message: `Deck witness leagueId '${deck.leagueId}' does not match corpus leagueId '${document.leagueCalibration.leagueId}'`,
      });
    }

    if (!document.leagueCalibration.memberCubes.includes(deck.cubeKey)) {
      semanticErrors.push({
        code: "CUBE_NOT_IN_LEAGUE",
        path: `$.deckWitnesses[${String(wIdx)}].cubeKey`,
        message: `Deck witness cubeKey '${deck.cubeKey}' is not a member of league '${document.leagueCalibration.leagueId}'`,
      });
    }
  }

  // Verify readiness status against actual witnesses in the corpus
  const actualCounts = countLeagueWitnessEvidence(document);
  if (document.leagueCalibration.status === "ready") {
    const computedReadiness = calculateLeagueReadiness(
      actualCounts,
      document.leagueCalibration.readinessPolicy,
      document.leagueCalibration.memberCubes,
    );
    if (computedReadiness !== "ready") {
      semanticErrors.push({
        code: "INVALID_CALIBRATION_STATUS",
        path: "$.leagueCalibration.status",
        message:
          "Corpus declares league calibration status 'ready' but witness evidence counts do not meet readiness policy",
      });
    }
  }

  // Verify evidence counts consistency if declared
  if (document.leagueCalibration.evidenceCounts) {
    const declared = document.leagueCalibration.evidenceCounts;
    const declaredTierCoverage = declared.tierCoverage;
    for (const tier of ["S", "A", "B", "C", "D"] as const) {
      const declaredCount = declaredTierCoverage[tier];
      const actualCount = actualCounts.tierCoverage[tier];
      if (declaredCount !== actualCount) {
        semanticErrors.push({
          code: "EVIDENCE_COUNTS_MISMATCH",
          path: `$.leagueCalibration.evidenceCounts.tierCoverage.${tier}`,
          message: `Declared tierCoverage for ${tier} (${String(declaredCount)}) does not match actual witness count (${String(actualCount)})`,
        });
      }
    }
    for (const cubeKey of document.leagueCalibration.memberCubes) {
      const declaredDrafts = declared.draftsByCube[cubeKey] ?? 0;
      const actualDrafts = actualCounts.draftsByCube[cubeKey] ?? 0;
      if (declaredDrafts !== actualDrafts) {
        semanticErrors.push({
          code: "EVIDENCE_COUNTS_MISMATCH",
          path: `$.leagueCalibration.evidenceCounts.draftsByCube.${cubeKey}`,
          message: `Declared draftsByCube for ${cubeKey} (${String(declaredDrafts)}) does not match actual witness count (${String(actualDrafts)})`,
        });
      }
      const declaredDecks = declared.decksByCube[cubeKey] ?? 0;
      const actualDecks = actualCounts.decksByCube[cubeKey] ?? 0;
      if (declaredDecks !== actualDecks) {
        semanticErrors.push({
          code: "EVIDENCE_COUNTS_MISMATCH",
          path: `$.leagueCalibration.evidenceCounts.decksByCube.${cubeKey}`,
          message: `Declared decksByCube for ${cubeKey} (${String(declaredDecks)}) does not match actual witness count (${String(actualDecks)})`,
        });
      }
    }
  }

  if (semanticErrors.length > 0) {
    return { success: false, errors: semanticErrors };
  }

  deepFreeze(document);
  return { success: true, data: document };
}

export function loadLeagueWitnessCorpus(filePath: string): LeagueWitnessCorpus {
  const content = readFileSync(filePath, "utf8");
  const result = validateLeagueWitnessCorpusJson(content);
  if (!result.success) {
    const errorDetails = result.errors.map((e) => `[${e.code}] ${e.path}: ${e.message}`).join("; ");
    throw new Error(`Failed to load league witness corpus from '${filePath}': ${errorDetails}`);
  }
  return result.data;
}
