import { validateSnapshot, type CubeSnapshot } from "../../src/cubes/validate-snapshot.ts";
import type {
  TournamentCubeSnapshot,
  TournamentParticipant,
  TournamentProjection,
} from "../../src/tournaments/types.ts";
import { buildSyntheticSnapshot } from "../fixtures/cube-fixtures.ts";

export interface TournamentTestClock {
  readonly now: () => string;
  readonly advanceBy: (milliseconds: number) => void;
}

export function createTournamentTestClock(
  initial = "2026-09-21T18:00:00.000Z",
): TournamentTestClock {
  let current = Date.parse(initial);
  return {
    now: () => new Date(current).toISOString(),
    advanceBy: (milliseconds) => {
      current += milliseconds;
    },
  };
}

export function createTournamentSequence(prefix: string): () => string {
  let sequence = 0;
  return () => `${prefix}-${String(++sequence).padStart(3, "0")}`;
}

export function buildTournamentSourceSnapshot(): Readonly<CubeSnapshot> {
  const result = validateSnapshot(buildSyntheticSnapshot(360, "2026-09-21.1"));
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.value;
}

export function buildTournamentCubeSnapshot(): Readonly<TournamentCubeSnapshot> {
  const payload = buildTournamentSourceSnapshot();
  return {
    cubeKey: payload.cubeKey,
    cubeName: payload.source.cubeName,
    snapshotId: payload.snapshotId,
    canonicalSha256: payload.integrity.canonicalSha256,
    payload,
  };
}

export function buildTournamentParticipant(
  participantId = "participant-001",
  displayName = "Alice",
  deckName = "Aggro Boros",
  registrationOrder = 0,
): Readonly<TournamentParticipant> {
  return {
    participantId,
    displayName,
    normalizedName: displayName.trim().toLocaleLowerCase("fr-FR").replace(/\s+/gu, " "),
    registrationOrder,
    status: "active",
    deck: { name: deckName, keyCards: [] },
  };
}

export function buildTournamentProjection(
  overrides: Partial<TournamentProjection> = {},
): Readonly<TournamentProjection> {
  return {
    schemaVersion: 1,
    tournamentId: "tournament-001",
    revision: 0,
    name: "Soirée Cube",
    status: "preparation",
    format: null,
    plannedRoundCount: null,
    pairingSeed: 42,
    pairingEngineVersion: "tournament-pairing@1",
    cube: null,
    participants: [],
    rounds: [],
    standings: [],
    createdAt: "2026-09-21T18:00:00.000Z",
    updatedAt: "2026-09-21T18:00:00.000Z",
    startedAt: null,
    completedAt: null,
    ...overrides,
  };
}
