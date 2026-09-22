import { describe, expect, it } from "vitest";

import {
  createTournamentCoordinator,
  type MatchResultKind,
  type TournamentCoordinator,
  type TournamentEvent,
  type TournamentMatch,
  type TournamentProjection,
  type TournamentRound,
  type TournamentStore,
} from "../../../src/tournaments/index.ts";
import {
  buildTournamentCubeSnapshot,
  buildTournamentParticipant,
  buildTournamentProjection,
  createTournamentSequence,
  createTournamentTestClock,
} from "../../helpers/tournament-fixtures.ts";

function completedMatch(input: {
  matchId: string;
  roundNumber: number;
  tableNumber: number;
  participantAId: string;
  participantBId: string | null;
  gamesWonA: number;
  gamesWonB: number;
  drawnGames: number;
  kind?: MatchResultKind;
}): TournamentMatch {
  const outcome =
    input.gamesWonA === input.gamesWonB
      ? "draw"
      : input.gamesWonA > input.gamesWonB
        ? "a-win"
        : "b-win";
  return {
    matchId: input.matchId,
    roundNumber: input.roundNumber,
    tableNumber: input.tableNumber,
    participantAId: input.participantAId,
    participantBId: input.participantBId,
    status: "confirmed",
    resultVersions: [
      {
        version: 1,
        kind: input.kind ?? "played",
        gamesWonA: input.gamesWonA,
        gamesWonB: input.gamesWonB,
        drawnGames: input.drawnGames,
        outcome,
        recordedAt: "2026-09-21T18:30:00.000Z",
        requestId: `result-${input.matchId}`,
        replacesVersion: null,
        reason: null,
      },
    ],
    currentResultVersion: 1,
  };
}

function completedRound(roundNumber: number, matches: readonly TournamentMatch[]): TournamentRound {
  return {
    roundNumber,
    status: "completed",
    sourceRevision: roundNumber,
    publishedAt: "2026-09-21T18:00:00.000Z",
    completedAt: "2026-09-21T18:30:00.000Z",
    pairingEvidence: {
      engineVersion: "tournament-pairing@1",
      pairingSeed: 42,
      inputSha256: "d".repeat(64),
      standingsBefore: [],
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
    cubeCatalog: {
      listCubes: () => Promise.resolve({ ok: true, value: [] }),
      loadSnapshot: () => Promise.reject(new Error("Unused in standings tests.")),
    },
    now: createTournamentTestClock().now,
    createId: createTournamentSequence("standing-match"),
    createSeed: () => 42,
  });
}

async function publishNextRound(state: Readonly<TournamentProjection>) {
  return coordinatorFromState(state).execute({
    type: "publish-next-round",
    requestId: "publish-after-results",
    tournamentId: state.tournamentId,
    expectedRevision: state.revision,
  });
}

describe("Tournament standings", () => {
  it("derives points, exact percentages, opponent floors and an opponent-free bye average", async () => {
    const participants = [
      buildTournamentParticipant("A", "Alice", "Aggro Boros", 0),
      buildTournamentParticipant("B", "Bob", "Izzet Wizards", 1),
      buildTournamentParticipant("C", "Charlie", "Mono Green", 2),
    ];
    const state = buildTournamentProjection({
      revision: 3,
      status: "active",
      format: "swiss",
      plannedRoundCount: 3,
      cube: buildTournamentCubeSnapshot(),
      participants,
      standings: [],
      startedAt: "2026-09-21T18:00:00.000Z",
      rounds: [
        completedRound(1, [
          completedMatch({
            matchId: "A-B",
            roundNumber: 1,
            tableNumber: 1,
            participantAId: "A",
            participantBId: "B",
            gamesWonA: 2,
            gamesWonB: 1,
            drawnGames: 0,
          }),
          completedMatch({
            matchId: "C-bye",
            roundNumber: 1,
            tableNumber: 2,
            participantAId: "C",
            participantBId: null,
            gamesWonA: 2,
            gamesWonB: 0,
            drawnGames: 0,
            kind: "swiss-bye",
          }),
        ]),
      ],
    });

    const result = await publishNextRound(state);
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) throw new Error(result.error.message);
    const standingsBefore = result.value.rounds.at(-1)?.pairingEvidence.standingsBefore ?? [];
    const byId = new Map(standingsBefore.map((standing) => [standing.participantId, standing]));
    expect(byId.get("A")).toMatchObject({
      wins: 1,
      matchPoints: 3,
      matchWinPercentage: { numerator: 1, denominator: 1 },
      gameWinPercentage: { numerator: 2, denominator: 3 },
      opponentsMatchWinPercentage: { numerator: 1, denominator: 3 },
      opponentsGameWinPercentage: { numerator: 1, denominator: 3 },
      competitiveRank: 1,
    });
    expect(byId.get("B")).toMatchObject({
      losses: 1,
      matchPoints: 0,
      matchWinPercentage: { numerator: 0, denominator: 1 },
      gameWinPercentage: { numerator: 1, denominator: 3 },
      opponentsMatchWinPercentage: { numerator: 1, denominator: 1 },
      opponentsGameWinPercentage: { numerator: 2, denominator: 3 },
      competitiveRank: 3,
    });
    expect(byId.get("C")).toMatchObject({
      matchesPlayed: 1,
      wins: 1,
      byes: 1,
      gamesWon: 2,
      matchPoints: 3,
      matchWinPercentage: { numerator: 1, denominator: 1 },
      gameWinPercentage: { numerator: 1, denominator: 1 },
      opponentsMatchWinPercentage: { numerator: 0, denominator: 1 },
      opponentsGameWinPercentage: { numerator: 0, denominator: 1 },
      competitiveRank: 2,
    });
  });

  it("assigns the same competitive rank when every exact criterion is tied", async () => {
    const participantIds = ["A", "B", "C", "D"];
    const participants = participantIds.map((participantId, index) =>
      buildTournamentParticipant(
        participantId,
        `Player ${participantId}`,
        `Deck ${participantId}`,
        index,
      ),
    );
    const state = buildTournamentProjection({
      revision: 5,
      status: "active",
      format: "swiss",
      plannedRoundCount: 3,
      cube: buildTournamentCubeSnapshot(),
      participants,
      standings: [],
      startedAt: "2026-09-21T18:00:00.000Z",
      rounds: [
        completedRound(1, [
          completedMatch({
            matchId: "A-B",
            roundNumber: 1,
            tableNumber: 1,
            participantAId: "A",
            participantBId: "B",
            gamesWonA: 2,
            gamesWonB: 0,
            drawnGames: 0,
          }),
          completedMatch({
            matchId: "C-D",
            roundNumber: 1,
            tableNumber: 2,
            participantAId: "C",
            participantBId: "D",
            gamesWonA: 2,
            gamesWonB: 0,
            drawnGames: 0,
          }),
        ]),
        completedRound(2, [
          completedMatch({
            matchId: "A-C",
            roundNumber: 2,
            tableNumber: 1,
            participantAId: "A",
            participantBId: "C",
            gamesWonA: 2,
            gamesWonB: 0,
            drawnGames: 0,
          }),
          completedMatch({
            matchId: "B-D",
            roundNumber: 2,
            tableNumber: 2,
            participantAId: "B",
            participantBId: "D",
            gamesWonA: 2,
            gamesWonB: 0,
            drawnGames: 0,
          }),
        ]),
      ],
    });

    const result = await publishNextRound(state);
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) throw new Error(result.error.message);
    const byId = new Map(
      result.value.standings.map((standing) => [standing.participantId, standing]),
    );
    expect(byId.get("A")?.competitiveRank).toBe(1);
    expect(byId.get("B")).toMatchObject({
      matchPoints: 3,
      opponentsMatchWinPercentage: { numerator: 2, denominator: 3 },
      gameWinPercentage: { numerator: 1, denominator: 2 },
      opponentsGameWinPercentage: { numerator: 2, denominator: 3 },
      competitiveRank: 2,
    });
    expect(byId.get("C")).toMatchObject({
      matchPoints: 3,
      opponentsMatchWinPercentage: { numerator: 2, denominator: 3 },
      gameWinPercentage: { numerator: 1, denominator: 2 },
      opponentsGameWinPercentage: { numerator: 2, denominator: 3 },
      competitiveRank: 2,
    });
    expect(byId.get("D")?.competitiveRank).toBe(4);
  });

  it("awards one match point for a draw and keeps 4/9 game points exactly", async () => {
    const participants = [
      buildTournamentParticipant("A", "Alice", "Control", 0),
      buildTournamentParticipant("B", "Bob", "Midrange", 1),
    ];
    const state = buildTournamentProjection({
      revision: 3,
      status: "active",
      format: "swiss",
      plannedRoundCount: 2,
      cube: buildTournamentCubeSnapshot(),
      participants,
      standings: [],
      startedAt: "2026-09-21T18:00:00.000Z",
      rounds: [
        completedRound(1, [
          completedMatch({
            matchId: "draw",
            roundNumber: 1,
            tableNumber: 1,
            participantAId: "A",
            participantBId: "B",
            gamesWonA: 1,
            gamesWonB: 1,
            drawnGames: 1,
          }),
        ]),
      ],
    });

    const result = await publishNextRound(state);
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.standings).toHaveLength(2);
    for (const standing of result.value.standings) {
      expect(standing).toMatchObject({
        matchesPlayed: 1,
        draws: 1,
        matchPoints: 1,
        matchWinPercentage: { numerator: 1, denominator: 3 },
        opponentsMatchWinPercentage: { numerator: 1, denominator: 3 },
        gameWinPercentage: { numerator: 4, denominator: 9 },
        opponentsGameWinPercentage: { numerator: 4, denominator: 9 },
        competitiveRank: 1,
      });
    }
  });
});
