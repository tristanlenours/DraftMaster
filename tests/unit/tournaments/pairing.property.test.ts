import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  createInMemoryTournamentStore,
  createTournamentCoordinator,
  type TournamentCoordinator,
  type TournamentCubeCatalog,
  type TournamentEvent,
  type TournamentProjection,
  type TournamentStanding,
  type TournamentStore,
} from "../../../src/tournaments/index.ts";
import {
  buildTournamentCubeSnapshot,
  buildTournamentParticipant,
  buildTournamentProjection,
  createTournamentSequence,
  createTournamentTestClock,
} from "../../helpers/tournament-fixtures.ts";

function cubeCatalog(): TournamentCubeCatalog {
  const snapshot = buildTournamentCubeSnapshot();
  return {
    listCubes: () => Promise.resolve({ ok: true, value: [] }),
    loadSnapshot: () => Promise.resolve({ ok: true, value: snapshot }),
  };
}

async function startSwiss(participantCount: number, pairingSeed: number) {
  const coordinator = createTournamentCoordinator({
    store: createInMemoryTournamentStore(),
    cubeCatalog: cubeCatalog(),
    now: createTournamentTestClock().now,
    createId: createTournamentSequence("id"),
    createSeed: () => pairingSeed,
  });
  const created = await coordinator.createTournament({
    requestId: "create-property",
    name: "Property Swiss",
  });
  if (!created.ok) throw new Error(created.error.message);
  const configured = await coordinator.execute({
    type: "replace-setup",
    requestId: "setup-property",
    tournamentId: created.value.tournamentId,
    expectedRevision: 0,
    name: "Property Swiss",
    cubeKey: "titou_tribal",
    format: "swiss",
    plannedRoundCount: 5,
    participants: Array.from({ length: participantCount }, (_, index) => ({
      participantId: null,
      displayName: `Player ${String(index + 1)}`,
      deckName: `Deck ${String(index + 1)}`,
    })),
  });
  if (!configured.ok) throw new Error(configured.error.message);
  return coordinator.execute({
    type: "start",
    requestId: "start-property",
    tournamentId: created.value.tournamentId,
    expectedRevision: 1,
  });
}

function tiedStanding(participantId: string, displayOrder: number): TournamentStanding {
  return {
    participantId,
    matchesPlayed: 1,
    wins: 0,
    draws: 1,
    losses: 0,
    byes: 0,
    gamesWon: 1,
    gamesDrawn: 1,
    gamesLost: 1,
    matchPoints: 1,
    matchWinPercentage: { numerator: 1, denominator: 3 },
    opponentsMatchWinPercentage: { numerator: 1, denominator: 3 },
    gameWinPercentage: { numerator: 1, denominator: 3 },
    opponentsGameWinPercentage: { numerator: 1, denominator: 3 },
    competitiveRank: 1,
    displayOrder,
  };
}

function pairKey(left: string, right: string): string {
  return left < right ? `${left}:${right}` : `${right}:${left}`;
}

function hasPerfectMatchingWithoutRematches(
  participantIds: readonly string[],
  forbiddenPairs: ReadonlySet<string>,
): boolean {
  if (participantIds.length === 0) return true;
  const first = participantIds[0];
  if (first === undefined) return true;
  for (let index = 1; index < participantIds.length; index += 1) {
    const opponent = participantIds[index];
    if (opponent === undefined || forbiddenPairs.has(pairKey(first, opponent))) continue;
    const remaining = participantIds.filter(
      (participantId) => participantId !== first && participantId !== opponent,
    );
    if (hasPerfectMatchingWithoutRematches(remaining, forbiddenPairs)) return true;
  }
  return false;
}

function createRound(
  roundNumber: number,
  participantIds: readonly string[],
  rotation: number,
  standings: readonly TournamentStanding[],
) {
  const half = participantIds.length / 2;
  const left = participantIds.slice(0, half);
  const right = participantIds.slice(half);
  const matches = left.map((participantAId, index) => {
    const participantBId = right[(index + rotation) % half];
    if (participantBId === undefined) throw new Error("Synthetic opponent is missing.");
    return {
      matchId: `round-${String(roundNumber)}-${String(index + 1)}`,
      roundNumber,
      tableNumber: index + 1,
      participantAId,
      participantBId,
      status: "confirmed" as const,
      resultVersions: [
        {
          version: 1,
          kind: "played" as const,
          gamesWonA: 1,
          gamesWonB: 1,
          drawnGames: 1,
          outcome: "draw" as const,
          recordedAt: "2026-09-21T18:30:00.000Z",
          requestId: `result-${String(roundNumber)}-${String(index + 1)}`,
          replacesVersion: null,
          reason: null,
        },
      ],
      currentResultVersion: 1,
    };
  });
  return {
    roundNumber,
    status: "completed" as const,
    sourceRevision: roundNumber,
    publishedAt: "2026-09-21T18:00:00.000Z",
    completedAt: "2026-09-21T18:30:00.000Z",
    pairingEvidence: {
      engineVersion: "tournament-pairing@1" as const,
      pairingSeed: 42,
      inputSha256: "c".repeat(64),
      standingsBefore: standings,
      cost: {
        rematches: 0,
        repeatedRematches: 0,
        maximumMatchPointGap: 0,
        totalMatchPointGap: 0,
        totalRankGap: 0,
        seededOrderCost: 0,
      },
      decisions: [],
    },
    matches,
    pauses: [],
  };
}

function coordinatorFromState(initial: Readonly<TournamentProjection>): TournamentCoordinator {
  let state = initial;
  let events: readonly Readonly<TournamentEvent>[] = [];
  const store: TournamentStore = {
    list: () => Promise.resolve({ ok: true, value: [] }),
    load: () => Promise.resolve({ ok: true, value: { checkpoint: state, events } }),
    commit: (attempt) => {
      state = attempt.nextState;
      events = [...events, ...attempt.appendedEvents];
      return Promise.resolve({
        ok: true,
        value: { kind: "committed", tournament: attempt.response },
      });
    },
    checkReadiness: () => Promise.resolve({ ok: true, value: { ready: true } }),
  };
  return createTournamentCoordinator({
    store,
    cubeCatalog: cubeCatalog(),
    now: createTournamentTestClock().now,
    createId: createTournamentSequence("property-match"),
    createSeed: () => 42,
  });
}

describe("Swiss pairing properties", () => {
  it("keeps every participant unique, deterministic and auditable for 2 to 32 players", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 32 }),
        fc.integer({ min: -2_147_483_648, max: 2_147_483_647 }),
        async (participantCount, pairingSeed) => {
          const [first, replay] = await Promise.all([
            startSwiss(participantCount, pairingSeed),
            startSwiss(participantCount, pairingSeed),
          ]);
          expect(first.ok).toBe(true);
          expect(replay.ok).toBe(true);
          if (!first.ok || !replay.ok) return;
          const round = first.value.rounds[0];
          const replayedRound = replay.value.rounds[0];
          expect(round).toBeDefined();
          const appearances = round?.matches.flatMap(({ participantAId, participantBId }) =>
            participantBId === null ? [participantAId] : [participantAId, participantBId],
          );
          expect(appearances).toHaveLength(participantCount);
          expect(new Set(appearances).size).toBe(participantCount);
          expect(
            round?.matches.every((match) => match.participantAId !== match.participantBId),
          ).toBe(true);
          expect(
            round?.matches.filter(({ participantBId }) => participantBId === null),
          ).toHaveLength(participantCount % 2);
          expect(
            round?.matches.map(({ participantAId, participantBId }) => [
              participantAId,
              participantBId,
            ]),
          ).toEqual(
            replayedRound?.matches.map(({ participantAId, participantBId }) => [
              participantAId,
              participantBId,
            ]),
          );
          expect(
            round?.pairingEvidence.standingsBefore.map(({ displayOrder }) => displayOrder),
          ).toEqual(Array.from({ length: participantCount }, (_, index) => index + 1));
        },
      ),
      { numRuns: 30 },
    );
  });

  it("never chooses a rematch when an independent oracle finds a perfect fresh matching", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 6 }),
        fc.integer({ min: 1, max: 3 }),
        async (halfCount, requestedRoundCount) => {
          const participantCount = halfCount * 2;
          const participantIds = Array.from(
            { length: participantCount },
            (_, index) => `P${String(index + 1)}`,
          );
          const participants = participantIds.map((participantId, index) =>
            buildTournamentParticipant(
              participantId,
              `Player ${String(index + 1)}`,
              `Deck ${String(index + 1)}`,
              index,
            ),
          );
          const standings = participantIds.map((participantId, index) =>
            tiedStanding(participantId, index + 1),
          );
          const roundCount = Math.min(requestedRoundCount, halfCount - 1);
          const rounds = Array.from({ length: roundCount }, (_, index) =>
            createRound(index + 1, participantIds, index, standings),
          );
          const forbiddenPairs = new Set(
            rounds.flatMap(({ matches }) =>
              matches.map(({ participantAId, participantBId }) =>
                pairKey(participantAId, participantBId),
              ),
            ),
          );
          expect(hasPerfectMatchingWithoutRematches(participantIds, forbiddenPairs)).toBe(true);
          const state = buildTournamentProjection({
            revision: roundCount + 2,
            status: "active",
            format: "swiss",
            plannedRoundCount: 5,
            cube: buildTournamentCubeSnapshot(),
            participants,
            standings,
            rounds,
            startedAt: "2026-09-21T18:00:00.000Z",
          });
          const result = await coordinatorFromState(state).execute({
            type: "publish-next-round",
            requestId: "property-next-round",
            tournamentId: state.tournamentId,
            expectedRevision: state.revision,
          });
          expect(result).toMatchObject({ ok: true });
          if (!result.ok) return;
          expect(result.value.rounds.at(-1)?.pairingEvidence.cost.rematches).toBe(0);
        },
      ),
      { numRuns: 24 },
    );
  });
});
