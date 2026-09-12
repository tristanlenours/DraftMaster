import type {
  CubeEvaluationContext,
  DeckTier,
  LeagueCalibration,
  LeagueCalibrationStatus,
  LeagueReadinessPolicy,
  LeagueWitnessEvidenceCounts,
} from "./types.ts";

const CANONICAL_TIERS: readonly DeckTier[] = ["S", "A", "B", "C", "D"];

export function calculateLeagueReadiness(
  counts: LeagueWitnessEvidenceCounts | undefined,
  policy: LeagueReadinessPolicy,
  memberCubes: readonly string[],
): LeagueCalibrationStatus {
  if (!counts) {
    return "provisional";
  }

  for (const tier of CANONICAL_TIERS) {
    const tierCount = counts.tierCoverage[tier];
    if (tierCount < policy.minWitnessesPerTier) {
      return "provisional";
    }
  }

  for (const cubeKey of memberCubes) {
    const draftCount = counts.draftsByCube[cubeKey] ?? 0;
    if (draftCount < policy.minDraftWitnessesPerCube) {
      return "provisional";
    }
    const deckCount = counts.decksByCube[cubeKey] ?? 0;
    if (deckCount < policy.minDeckWitnessesPerCube) {
      return "provisional";
    }
  }

  return "ready";
}

export function validateLeagueCalibration(calibration: LeagueCalibration): void {
  const { tierThresholds, status, readinessPolicy, memberCubes, evidenceCounts } = calibration;

  const thresholds = [
    { tier: "S", value: tierThresholds.S },
    { tier: "A", value: tierThresholds.A },
    { tier: "B", value: tierThresholds.B },
    { tier: "C", value: tierThresholds.C },
  ];

  for (const { tier, value } of thresholds) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
      throw new Error(
        `Invalid threshold for tier ${tier}: must be a finite number between 0 and 100 (received ${String(value)})`,
      );
    }
  }

  if (!(
    tierThresholds.S > tierThresholds.A &&
    tierThresholds.A > tierThresholds.B &&
    tierThresholds.B > tierThresholds.C
  )) {
    throw new Error(
      `Thresholds must be strictly descending S > A > B > C (got S=${String(tierThresholds.S)}, A=${String(tierThresholds.A)}, B=${String(tierThresholds.B)}, C=${String(tierThresholds.C)})`,
    );
  }

  if (status === "ready") {
    const computedReadiness = calculateLeagueReadiness(
      evidenceCounts,
      readinessPolicy,
      memberCubes,
    );
    if (computedReadiness !== "ready") {
      throw new Error(
        "Cannot declare league calibration status 'ready' when readiness policy conditions are not met",
      );
    }
  }
}

export function classifyLeagueTier(score: number, calibration: LeagueCalibration): DeckTier {
  const { tierThresholds } = calibration;
  if (score >= tierThresholds.S) return "S";
  if (score >= tierThresholds.A) return "A";
  if (score >= tierThresholds.B) return "B";
  if (score >= tierThresholds.C) return "C";
  return "D";
}

export function assertCubeLeagueMembership(
  context: CubeEvaluationContext,
  calibration: LeagueCalibration,
): void {
  if (context.leagueId !== calibration.leagueId) {
    throw new Error(
      `Mismatched league: context declares league '${context.leagueId}' but calibration is for league '${calibration.leagueId}'`,
    );
  }

  if (!calibration.memberCubes.includes(context.cubeKey)) {
    throw new Error(
      `Cube '${context.cubeKey}' is not a member of league '${calibration.leagueId}' (member cubes: ${calibration.memberCubes.join(", ")})`,
    );
  }
}

export function countLeagueWitnessEvidence(corpus: {
  readonly deckWitnesses: readonly { readonly expectedTier: DeckTier; readonly cubeKey: string }[];
  readonly draftWitnesses: readonly { readonly cubeKey: string }[];
  readonly leagueCalibration: { readonly memberCubes: readonly string[] };
}): LeagueWitnessEvidenceCounts {
  const tierCoverage: Record<DeckTier, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 };
  const draftsByCube: Record<string, number> = {};
  const decksByCube: Record<string, number> = {};

  for (const cubeKey of corpus.leagueCalibration.memberCubes) {
    draftsByCube[cubeKey] = 0;
    decksByCube[cubeKey] = 0;
  }

  for (const deck of corpus.deckWitnesses) {
    tierCoverage[deck.expectedTier] += 1;
    decksByCube[deck.cubeKey] = (decksByCube[deck.cubeKey] ?? 0) + 1;
  }

  for (const draft of corpus.draftWitnesses) {
    draftsByCube[draft.cubeKey] = (draftsByCube[draft.cubeKey] ?? 0) + 1;
  }

  return {
    tierCoverage,
    draftsByCube,
    decksByCube,
  };
}
