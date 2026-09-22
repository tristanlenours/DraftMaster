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
  type TournamentStoreCommitAttempt,
} from "../../../src/tournaments/index.ts";
import {
  buildTournamentCubeSnapshot,
  buildTournamentParticipant,
  buildTournamentProjection,
  createTournamentSequence,
  createTournamentTestClock,
} from "../../helpers/tournament-fixtures.ts";

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

function completedDrawMatch(
  matchId: string,
  participantAId: string,
  participantBId: string,
  tableNumber: number,
) {
  return {
    matchId,
    roundNumber: 1,
    tableNumber,
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
        requestId: `result-${matchId}`,
        replacesVersion: null,
        reason: null,
      },
    ],
    currentResultVersion: 1,
  };
}

function createLoadedCoordinator(initial: Readonly<TournamentProjection>): {
  readonly coordinator: TournamentCoordinator;
  readonly commits: TournamentStoreCommitAttempt[];
} {
  const commits: TournamentStoreCommitAttempt[] = [];
  let state = initial;
  let events: readonly Readonly<TournamentEvent>[] = [];
  const store: TournamentStore = {
    list: () => Promise.resolve({ ok: true, value: [] }),
    load: (tournamentId) =>
      Promise.resolve({
        ok: true,
        value: tournamentId === state.tournamentId ? { checkpoint: state, events } : null,
      }),
    commit: (attempt) => {
      commits.push(attempt);
      state = attempt.nextState;
      events = [...events, ...attempt.appendedEvents];
      return Promise.resolve({
        ok: true,
        value: { kind: "committed", tournament: attempt.response },
      });
    },
    checkReadiness: () => Promise.resolve({ ok: true, value: { ready: true } }),
  };
  const coordinator = createTournamentCoordinator({
    store,
    cubeCatalog: createCubeCatalog(),
    now: createTournamentTestClock("2026-09-21T19:00:00.000Z").now,
    createId: createTournamentSequence("round-two-match"),
    createSeed: () => 42,
  });
  return { coordinator, commits };
}

function createCubeCatalog(): TournamentCubeCatalog {
  const snapshot = buildTournamentCubeSnapshot();
  return {
    listCubes: () => Promise.resolve({ ok: true, value: [] }),
    loadSnapshot: () => Promise.resolve({ ok: true, value: snapshot }),
  };
}

async function createReadySwissTournament(
  participantCount: number,
  pairingSeed = 42,
): Promise<{ coordinator: TournamentCoordinator; tournamentId: string }> {
  const coordinator = createTournamentCoordinator({
    store: createInMemoryTournamentStore(),
    cubeCatalog: createCubeCatalog(),
    now: createTournamentTestClock().now,
    createId: createTournamentSequence("id"),
    createSeed: () => pairingSeed,
  });
  const created = await coordinator.createTournament({
    requestId: `create-${String(participantCount)}`,
    name: "Swiss de septembre",
  });
  if (!created.ok) throw new Error(created.error.message);
  const configured = await coordinator.execute({
    type: "replace-setup",
    requestId: `setup-${String(participantCount)}`,
    tournamentId: created.value.tournamentId,
    expectedRevision: 0,
    name: "Swiss de septembre",
    cubeKey: "titou_tribal",
    format: "swiss",
    plannedRoundCount: 3,
    participants: Array.from({ length: participantCount }, (_, index) => ({
      participantId: null,
      displayName: `Player ${String(index + 1)}`,
      deckName: `Deck ${String(index + 1)}`,
    })),
  });
  if (!configured.ok) throw new Error(configured.error.message);
  return { coordinator, tournamentId: created.value.tournamentId };
}

describe("Swiss pairing", () => {
  it("publishes a deterministic seeded first round with one automatic 2-0 bye", async () => {
    const first = await createReadySwissTournament(5, 42);
    const second = await createReadySwissTournament(5, 42);

    const start = (coordinator: TournamentCoordinator, tournamentId: string) =>
      coordinator.execute({
        type: "start" as const,
        requestId: "start-swiss",
        tournamentId,
        expectedRevision: 1,
      });
    const [firstResult, secondResult] = await Promise.all([
      start(first.coordinator, first.tournamentId),
      start(second.coordinator, second.tournamentId),
    ]);

    expect(firstResult).toMatchObject({
      ok: true,
      value: {
        revision: 2,
        status: "active",
        rounds: [
          {
            roundNumber: 1,
            status: "published",
            pairingEvidence: {
              engineVersion: "tournament-pairing@1",
              pairingSeed: 42,
            },
          },
        ],
      },
    });
    if (!firstResult.ok || !secondResult.ok) throw new Error("Le démarrage suisse doit réussir.");

    const round = firstResult.value.rounds[0];
    const replayedRound = secondResult.value.rounds[0];
    expect(round?.pairingEvidence.inputSha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(round?.matches).toHaveLength(3);
    expect(
      round?.matches.map(({ participantAId, participantBId }) => [participantAId, participantBId]),
    ).toEqual(
      replayedRound?.matches.map(({ participantAId, participantBId }) => [
        participantAId,
        participantBId,
      ]),
    );

    const appearances = round?.matches.flatMap(({ participantAId, participantBId }) =>
      participantBId === null ? [participantAId] : [participantAId, participantBId],
    );
    expect(new Set(appearances).size).toBe(5);
    expect(appearances).toHaveLength(5);

    const bye = round?.matches.find(({ participantBId }) => participantBId === null);
    expect(bye).toMatchObject({
      status: "confirmed",
      currentResultVersion: 1,
      resultVersions: [
        {
          version: 1,
          kind: "swiss-bye",
          gamesWonA: 2,
          gamesWonB: 0,
          drawnGames: 0,
          outcome: "a-win",
          requestId: "start-swiss",
        },
      ],
    });
    expect(round?.pairingEvidence.decisions).toContainEqual(
      expect.objectContaining({
        matchId: bye?.matchId,
        participantIds: [bye?.participantAId],
        reasons: ["swiss-bye"],
      }),
    );
    expect(
      firstResult.value.standings.find(
        ({ participantId }) => participantId === bye?.participantAId,
      ),
    ).toMatchObject({
      byes: 1,
      gamesWon: 2,
      matchPoints: 3,
      competitiveRank: 1,
    });
  });

  it("avoids a rematch that an adjacent greedy pairing would create", async () => {
    const participants = [
      buildTournamentParticipant("A", "Alice", "Aggro Boros", 0),
      buildTournamentParticipant("B", "Bob", "Izzet Wizards", 1),
      buildTournamentParticipant("C", "Charlie", "Mono Green", 2),
      buildTournamentParticipant("D", "Diane", "Azorius Control", 3),
    ];
    const standings = participants.map(({ participantId }, index) =>
      tiedStanding(participantId, index + 1),
    );
    const state = buildTournamentProjection({
      revision: 5,
      status: "active",
      format: "swiss",
      plannedRoundCount: 3,
      cube: buildTournamentCubeSnapshot(),
      participants,
      standings,
      startedAt: "2026-09-21T18:00:00.000Z",
      rounds: [
        {
          roundNumber: 1,
          status: "completed",
          sourceRevision: 2,
          publishedAt: "2026-09-21T18:00:00.000Z",
          completedAt: "2026-09-21T18:30:00.000Z",
          pairingEvidence: {
            engineVersion: "tournament-pairing@1",
            pairingSeed: 42,
            inputSha256: "b".repeat(64),
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
          matches: [
            completedDrawMatch("round-1-a-b", "A", "B", 1),
            completedDrawMatch("round-1-c-d", "C", "D", 2),
          ],
          pauses: [],
        },
      ],
    });
    const { coordinator } = createLoadedCoordinator(state);

    const result = await coordinator.execute({
      type: "publish-next-round",
      requestId: "publish-round-two",
      tournamentId: state.tournamentId,
      expectedRevision: 5,
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        revision: 6,
        rounds: [
          {},
          {
            roundNumber: 2,
            pairingEvidence: { cost: { rematches: 0 } },
          },
        ],
      },
    });
    if (!result.ok) throw new Error(result.error.message);
    const secondRound = result.value.rounds[1];
    const pairs = secondRound?.matches.map(({ participantAId, participantBId }) =>
      [participantAId, participantBId].sort().join(":"),
    );
    expect(pairs).not.toContain("A:B");
    expect(pairs).not.toContain("C:D");
    expect(
      new Set(secondRound?.matches.flatMap((match) => [match.participantAId, match.participantBId]))
        .size,
    ).toBe(4);
  });
});

describe("Three-player round robin", () => {
  it("publishes every pair once with one scoreless pause per participant", async () => {
    const coordinator = createTournamentCoordinator({
      store: createInMemoryTournamentStore(),
      cubeCatalog: createCubeCatalog(),
      now: createTournamentTestClock().now,
      createId: createTournamentSequence("round-robin"),
      createSeed: () => 42,
    });
    const created = await coordinator.createTournament({
      requestId: "create-round-robin",
      name: "Toutes rondes à trois",
    });
    if (!created.ok) throw new Error(created.error.message);
    const configured = await coordinator.execute({
      type: "replace-setup",
      requestId: "setup-round-robin",
      tournamentId: created.value.tournamentId,
      expectedRevision: created.value.revision,
      name: created.value.name,
      cubeKey: "titou_tribal",
      format: "round-robin-three",
      plannedRoundCount: 3,
      participants: [
        { participantId: null, displayName: "Alice", deckName: "Aggro Boros" },
        { participantId: null, displayName: "Bob", deckName: "Izzet Wizards" },
        { participantId: null, displayName: "Charlie", deckName: "Mono Green" },
      ],
    });
    if (!configured.ok) throw new Error(configured.error.message);

    const started = await coordinator.execute({
      type: "start",
      requestId: "start-round-robin",
      tournamentId: created.value.tournamentId,
      expectedRevision: configured.value.revision,
    });
    if (!started.ok) throw new Error(started.error.message);
    expect(started.value).toMatchObject({
      revision: 2,
      status: "active",
      rounds: [
        { roundNumber: 1, status: "published" },
        { roundNumber: 2, status: "published" },
        { roundNumber: 3, status: "published" },
      ],
    });
    const pairKeys = started.value.rounds.map((round) => {
      const match = round.matches[0];
      if (match?.participantBId == null) throw new Error("A played match is required.");
      return [match.participantAId, match.participantBId].sort().join(":");
    });
    expect(new Set(pairKeys).size).toBe(3);
    expect(started.value.rounds.flatMap(({ matches }) => matches)).toHaveLength(3);
    expect(started.value.rounds.flatMap(({ pauses }) => pauses)).toHaveLength(3);
    expect(
      new Set(
        started.value.rounds.flatMap(({ pauses }) =>
          pauses.map(({ participantId }) => participantId),
        ),
      ).size,
    ).toBe(3);
    expect(
      started.value.standings.every(
        ({ matchesPlayed, matchPoints, gamesWon }) =>
          matchesPlayed === 0 && matchPoints === 0 && gamesWon === 0,
      ),
    ).toBe(true);
  });

  it.each([2, 4])("rejects round-robin-three with %s participants", async (participantCount) => {
    const coordinator = createTournamentCoordinator({
      store: createInMemoryTournamentStore(),
      cubeCatalog: createCubeCatalog(),
      now: createTournamentTestClock().now,
      createId: createTournamentSequence("invalid-round-robin"),
      createSeed: () => 42,
    });
    const created = await coordinator.createTournament({
      requestId: `create-invalid-round-robin-${String(participantCount)}`,
      name: "Toutes rondes invalide",
    });
    if (!created.ok) throw new Error(created.error.message);

    await expect(
      coordinator.execute({
        type: "replace-setup",
        requestId: `setup-invalid-round-robin-${String(participantCount)}`,
        tournamentId: created.value.tournamentId,
        expectedRevision: created.value.revision,
        name: created.value.name,
        cubeKey: "titou_tribal",
        format: "round-robin-three",
        plannedRoundCount: 3,
        participants: Array.from({ length: participantCount }, (_, index) => ({
          participantId: null,
          displayName: `Player ${String(index + 1)}`,
          deckName: `Deck ${String(index + 1)}`,
        })),
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: "INVALID_PARTICIPANT_COUNT",
        details: { actual: participantCount, expected: 3 },
      },
    });
  });
});
