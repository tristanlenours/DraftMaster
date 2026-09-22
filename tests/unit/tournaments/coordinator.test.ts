import { describe, expect, it } from "vitest";

import {
  createInMemoryTournamentStore,
  createTournamentCoordinator,
  type TournamentCoordinator,
  type TournamentCubeCatalog,
  type TournamentProjection,
} from "../../../src/tournaments/index.ts";
import {
  buildTournamentCubeSnapshot,
  createTournamentSequence,
  createTournamentTestClock,
} from "../../helpers/tournament-fixtures.ts";

function createUnusedCubeCatalog(): TournamentCubeCatalog {
  return {
    listCubes: () => Promise.reject(new Error("Creation must not load the cube catalog.")),
    loadSnapshot: () => Promise.reject(new Error("Creation must not load a Snapshot.")),
  };
}

function createCubeCatalog(): TournamentCubeCatalog {
  const snapshot = buildTournamentCubeSnapshot();
  return {
    listCubes: () =>
      Promise.resolve({
        ok: true,
        value: [
          {
            cubeKey: snapshot.cubeKey,
            cubeName: snapshot.cubeName,
            activeSnapshotId: snapshot.snapshotId,
          },
        ],
      }),
    loadSnapshot: (cubeKey) =>
      Promise.resolve(
        cubeKey === snapshot.cubeKey
          ? { ok: true as const, value: snapshot }
          : {
              ok: false as const,
              error: {
                code: "INVALID_CUBE" as const,
                message: "Cube inconnu.",
                details: { cubeKey },
              },
            },
      ),
  };
}

async function createStartedSwissTournament(): Promise<{
  readonly coordinator: TournamentCoordinator;
  readonly tournament: Readonly<TournamentProjection>;
}> {
  const coordinator = createTournamentCoordinator({
    store: createInMemoryTournamentStore(),
    cubeCatalog: createCubeCatalog(),
    now: createTournamentTestClock().now,
    createId: createTournamentSequence("result-id"),
    createSeed: () => 42,
  });
  const created = await coordinator.createTournament({
    requestId: "create-results",
    name: "Cube des résultats",
  });
  if (!created.ok) throw new Error(created.error.message);
  const configured = await coordinator.execute({
    type: "replace-setup",
    requestId: "setup-results",
    tournamentId: created.value.tournamentId,
    expectedRevision: created.value.revision,
    name: created.value.name,
    cubeKey: "titou_tribal",
    format: "swiss",
    plannedRoundCount: 3,
    participants: Array.from({ length: 6 }, (_, index) => ({
      participantId: null,
      displayName: `Player ${String(index + 1)}`,
      deckName: `Deck ${String(index + 1)}`,
    })),
  });
  if (!configured.ok) throw new Error(configured.error.message);
  const started = await coordinator.execute({
    type: "start",
    requestId: "start-results",
    tournamentId: created.value.tournamentId,
    expectedRevision: configured.value.revision,
  });
  if (!started.ok) throw new Error(started.error.message);
  return { coordinator, tournament: started.value };
}

describe("TournamentCoordinator", () => {
  it("lists selectable cubes without exposing their archived payload", async () => {
    const coordinator = createTournamentCoordinator({
      store: createInMemoryTournamentStore(),
      cubeCatalog: createCubeCatalog(),
      now: createTournamentTestClock().now,
      createId: createTournamentSequence("tournament"),
      createSeed: () => 42,
    });

    await expect(coordinator.listCubes()).resolves.toEqual({
      ok: true,
      value: [
        {
          cubeKey: "titou_tribal",
          cubeName: "titou's tribal and chromatic cube",
          activeSnapshotId: "titou_tribal@2026-09-21.1",
        },
      ],
    });
  });

  it("creates a tournament in preparation and makes it visible in history", async () => {
    const coordinator = createTournamentCoordinator({
      store: createInMemoryTournamentStore(),
      cubeCatalog: createUnusedCubeCatalog(),
      now: createTournamentTestClock().now,
      createId: createTournamentSequence("tournament"),
      createSeed: () => 42,
    });

    await expect(
      coordinator.createTournament({
        requestId: "create-september-cube",
        name: "  Cube de septembre  ",
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        tournamentId: "tournament-001",
        revision: 0,
        name: "Cube de septembre",
        status: "preparation",
        cube: null,
        participants: [],
        rounds: [],
      },
    });
    await expect(coordinator.listTournaments()).resolves.toMatchObject({
      ok: true,
      value: [
        {
          tournamentId: "tournament-001",
          name: "Cube de septembre",
          status: "preparation",
          revision: 0,
        },
      ],
    });
  });

  it("replaces setup while preserving participant identities", async () => {
    const coordinator = createTournamentCoordinator({
      store: createInMemoryTournamentStore(),
      cubeCatalog: createCubeCatalog(),
      now: createTournamentTestClock().now,
      createId: createTournamentSequence("id"),
      createSeed: () => 42,
    });
    const created = await coordinator.createTournament({
      requestId: "create-september-cube",
      name: "Cube de septembre",
    });
    if (!created.ok) throw new Error(created.error.message);

    const configured = await coordinator.execute({
      type: "replace-setup",
      requestId: "setup-september-cube",
      tournamentId: created.value.tournamentId,
      expectedRevision: 0,
      name: "Cube de septembre",
      cubeKey: "titou_tribal",
      format: "swiss",
      plannedRoundCount: 3,
      participants: [
        { participantId: null, displayName: "Alice", deckName: "Aggro Boros" },
        { participantId: null, displayName: "Bob", deckName: "Izzet Wizards" },
      ],
    });
    expect(configured).toMatchObject({
      ok: true,
      value: {
        revision: 1,
        format: "swiss",
        plannedRoundCount: 3,
        cube: { cubeKey: "titou_tribal" },
        participants: [
          {
            participantId: "id-002",
            displayName: "Alice",
            deck: { name: "Aggro Boros", keyCards: [] },
          },
          {
            participantId: "id-003",
            displayName: "Bob",
            deck: { name: "Izzet Wizards", keyCards: [] },
          },
        ],
      },
    });
    if (!configured.ok) throw new Error(configured.error.message);

    await expect(
      coordinator.execute({
        type: "replace-setup",
        requestId: "rename-bob-deck",
        tournamentId: created.value.tournamentId,
        expectedRevision: 1,
        name: "Cube de septembre",
        cubeKey: "titou_tribal",
        format: "swiss",
        plannedRoundCount: 3,
        participants: configured.value.participants.map((participant) => ({
          participantId: participant.participantId,
          displayName: participant.displayName,
          deckName: participant.displayName === "Bob" ? "Izzet Tempo" : participant.deck.name,
        })),
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        revision: 2,
        participants: [
          { participantId: "id-002", deck: { name: "Aggro Boros" } },
          { participantId: "id-003", deck: { name: "Izzet Tempo" } },
        ],
      },
    });
  });

  it("rejects normalized duplicate names without mutating valid setup", async () => {
    const coordinator = createTournamentCoordinator({
      store: createInMemoryTournamentStore(),
      cubeCatalog: createCubeCatalog(),
      now: createTournamentTestClock().now,
      createId: createTournamentSequence("id"),
      createSeed: () => 42,
    });
    const created = await coordinator.createTournament({
      requestId: "create-duplicates",
      name: "Cube des doublons",
    });
    if (!created.ok) throw new Error(created.error.message);

    await expect(
      coordinator.execute({
        type: "replace-setup",
        requestId: "reject-duplicates",
        tournamentId: created.value.tournamentId,
        expectedRevision: 0,
        name: "Cube des doublons",
        cubeKey: "titou_tribal",
        format: "swiss",
        plannedRoundCount: 2,
        participants: [
          { participantId: null, displayName: "Alice", deckName: "Aggro Boros" },
          { participantId: null, displayName: "  ALICE  ", deckName: "Azorius Control" },
        ],
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "NAME_TAKEN",
        message: "Ce nom de participant est déjà utilisé dans le tournoi.",
        details: { displayName: "ALICE" },
      },
    });
    await expect(coordinator.getTournament(created.value.tournamentId)).resolves.toMatchObject({
      ok: true,
      value: { revision: 0, cube: null, participants: [] },
    });
  });

  it.each([1, 33])(
    "rejects a setup with %s participants without mutating the tournament",
    async (participantCount) => {
      const coordinator = createTournamentCoordinator({
        store: createInMemoryTournamentStore(),
        cubeCatalog: createCubeCatalog(),
        now: createTournamentTestClock().now,
        createId: createTournamentSequence("id"),
        createSeed: () => 42,
      });
      const created = await coordinator.createTournament({
        requestId: `create-boundary-${String(participantCount)}`,
        name: "Cube des limites",
      });
      if (!created.ok) throw new Error(created.error.message);

      const participants = Array.from({ length: participantCount }, (_, index) => ({
        participantId: null,
        displayName: `Player ${String(index + 1)}`,
        deckName: `Deck ${String(index + 1)}`,
      }));
      await expect(
        coordinator.execute({
          type: "replace-setup",
          requestId: `reject-boundary-${String(participantCount)}`,
          tournamentId: created.value.tournamentId,
          expectedRevision: 0,
          name: "Cube des limites",
          cubeKey: "titou_tribal",
          format: "swiss",
          plannedRoundCount: 3,
          participants,
        }),
      ).resolves.toMatchObject({
        ok: false,
        error: {
          code: "INVALID_PARTICIPANT_COUNT",
          details: { actual: participantCount, maximum: 32, minimum: 2 },
        },
      });
      await expect(coordinator.getTournament(created.value.tournamentId)).resolves.toMatchObject({
        ok: true,
        value: { revision: 0, participants: [] },
      });
    },
  );

  it("starts atomically, locks setup and refuses a next round while matches are incomplete", async () => {
    const coordinator = createTournamentCoordinator({
      store: createInMemoryTournamentStore(),
      cubeCatalog: createCubeCatalog(),
      now: createTournamentTestClock().now,
      createId: createTournamentSequence("id"),
      createSeed: () => 42,
    });
    const created = await coordinator.createTournament({
      requestId: "create-start-lock",
      name: "Cube à verrouiller",
    });
    if (!created.ok) throw new Error(created.error.message);
    const configured = await coordinator.execute({
      type: "replace-setup",
      requestId: "setup-start-lock",
      tournamentId: created.value.tournamentId,
      expectedRevision: 0,
      name: "Cube à verrouiller",
      cubeKey: "titou_tribal",
      format: "swiss",
      plannedRoundCount: 3,
      participants: [
        { participantId: null, displayName: "Alice", deckName: "Aggro Boros" },
        { participantId: null, displayName: "Bob", deckName: "Izzet Wizards" },
        { participantId: null, displayName: "Charlie", deckName: "Mono Green" },
        { participantId: null, displayName: "Diane", deckName: "Azorius Control" },
      ],
    });
    if (!configured.ok) throw new Error(configured.error.message);

    await expect(
      coordinator.execute({
        type: "start",
        requestId: "start-lock",
        tournamentId: created.value.tournamentId,
        expectedRevision: 1,
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        revision: 2,
        status: "active",
        rounds: [{ roundNumber: 1, sourceRevision: 1, status: "published" }],
      },
    });

    await expect(
      coordinator.execute({
        type: "replace-setup",
        requestId: "mutate-locked-setup",
        tournamentId: created.value.tournamentId,
        expectedRevision: 2,
        name: "Nom interdit",
        cubeKey: "titou_tribal",
        format: "swiss",
        plannedRoundCount: 3,
        participants: configured.value.participants.map((participant) => ({
          participantId: participant.participantId,
          displayName: participant.displayName,
          deckName: participant.deck.name,
        })),
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: "INVALID_STATE" } });
    await expect(
      coordinator.execute({
        type: "publish-next-round",
        requestId: "publish-too-early",
        tournamentId: created.value.tournamentId,
        expectedRevision: 2,
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: "ROUND_INCOMPLETE" } });
    await expect(coordinator.getTournament(created.value.tournamentId)).resolves.toMatchObject({
      ok: true,
      value: { revision: 2, name: "Cube à verrouiller", rounds: [{ roundNumber: 1 }] },
    });
  });

  it("records played, drawn and forfeited results then completes the round", async () => {
    const { coordinator, tournament } = await createStartedSwissTournament();
    const [playedMatch, drawnMatch, forfeitedMatch] = tournament.rounds[0]?.matches ?? [];
    if (playedMatch === undefined || drawnMatch === undefined || forfeitedMatch === undefined) {
      throw new Error("Three first-round matches are required.");
    }

    const played = await coordinator.execute({
      type: "record-result",
      requestId: "result-played",
      tournamentId: tournament.tournamentId,
      expectedRevision: tournament.revision,
      matchId: playedMatch.matchId,
      kind: "played",
      gamesWonA: 2,
      gamesWonB: 1,
      drawnGames: 0,
    });
    if (!played.ok) throw new Error(played.error.message);
    expect(played.value).toMatchObject({ revision: 3 });
    expect(played.value.rounds[0]).toMatchObject({ status: "published" });
    expect(
      played.value.rounds[0]?.matches.find(({ matchId }) => matchId === playedMatch.matchId),
    ).toMatchObject({
      status: "confirmed",
      currentResultVersion: 1,
      resultVersions: [
        {
          version: 1,
          kind: "played",
          gamesWonA: 2,
          gamesWonB: 1,
          drawnGames: 0,
          outcome: "a-win",
          replacesVersion: null,
        },
      ],
    });

    const drawn = await coordinator.execute({
      type: "record-result",
      requestId: "result-draw",
      tournamentId: tournament.tournamentId,
      expectedRevision: played.value.revision,
      matchId: drawnMatch.matchId,
      kind: "played",
      gamesWonA: 1,
      gamesWonB: 1,
      drawnGames: 1,
    });
    if (!drawn.ok) throw new Error(drawn.error.message);
    expect(drawn.value).toMatchObject({ revision: 4 });
    expect(drawn.value.rounds[0]).toMatchObject({ status: "published" });
    expect(
      drawn.value.rounds[0]?.matches.find(({ matchId }) => matchId === drawnMatch.matchId),
    ).toMatchObject({
      currentResultVersion: 1,
      resultVersions: [{ outcome: "draw" }],
    });

    const forfeited = await coordinator.execute({
      type: "record-result",
      requestId: "result-forfeit",
      tournamentId: tournament.tournamentId,
      expectedRevision: drawn.value.revision,
      matchId: forfeitedMatch.matchId,
      kind: "forfeit",
      gamesWonA: 0,
      gamesWonB: 2,
      drawnGames: 0,
      reason: "Départ anticipé",
    });
    if (!forfeited.ok) throw new Error(forfeited.error.message);
    expect(forfeited.value).toMatchObject({ revision: 5 });
    expect(forfeited.value.rounds[0]?.status).toBe("completed");
    expect(forfeited.value.rounds[0]?.completedAt).not.toBeNull();
    expect(
      forfeited.value.rounds[0]?.matches.find(({ matchId }) => matchId === forfeitedMatch.matchId),
    ).toMatchObject({
      currentResultVersion: 1,
      resultVersions: [
        {
          kind: "forfeit",
          outcome: "b-win",
          reason: "Départ anticipé",
        },
      ],
    });
  });

  it.each([
    { label: "negative", kind: "played" as const, gamesWonA: -1, gamesWonB: 2, drawnGames: 0 },
    { label: "decimal", kind: "played" as const, gamesWonA: 1.5, gamesWonB: 1, drawnGames: 0 },
    { label: "above-nine", kind: "played" as const, gamesWonA: 10, gamesWonB: 0, drawnGames: 0 },
    { label: "empty", kind: "played" as const, gamesWonA: 0, gamesWonB: 0, drawnGames: 0 },
    {
      label: "invalid-forfeit",
      kind: "forfeit" as const,
      gamesWonA: 2,
      gamesWonB: 1,
      drawnGames: 0,
    },
  ])("rejects $label scores without mutation", async (score) => {
    const { coordinator, tournament } = await createStartedSwissTournament();
    const match = tournament.rounds[0]?.matches[0];
    if (match === undefined) throw new Error("A first-round match is required.");

    await expect(
      coordinator.execute({
        type: "record-result",
        requestId: `invalid-${score.label}`,
        tournamentId: tournament.tournamentId,
        expectedRevision: tournament.revision,
        matchId: match.matchId,
        kind: score.kind,
        gamesWonA: score.gamesWonA,
        gamesWonB: score.gamesWonB,
        drawnGames: score.drawnGames,
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: "INVALID_RESULT" } });
    const unchanged = await coordinator.getTournament(tournament.tournamentId);
    if (!unchanged.ok) throw new Error(unchanged.error.message);
    expect(unchanged.value).toMatchObject({ revision: tournament.revision });
    expect(unchanged.value.rounds[0]).toMatchObject({ status: "published" });
    expect(
      unchanged.value.rounds[0]?.matches.find(({ matchId }) => matchId === match.matchId),
    ).toMatchObject({ currentResultVersion: null, resultVersions: [] });
  });

  it("corrects a result append-only with a reason and preserves published pairings", async () => {
    const { coordinator, tournament } = await createStartedSwissTournament();
    const match = tournament.rounds[0]?.matches[0];
    const pairingEvidence = tournament.rounds[0]?.pairingEvidence;
    if (match?.participantBId == null || pairingEvidence === undefined) {
      throw new Error("A paired first-round match is required.");
    }
    const recorded = await coordinator.execute({
      type: "record-result",
      requestId: "result-before-correction",
      tournamentId: tournament.tournamentId,
      expectedRevision: tournament.revision,
      matchId: match.matchId,
      kind: "played",
      gamesWonA: 2,
      gamesWonB: 1,
      drawnGames: 0,
    });
    if (!recorded.ok) throw new Error(recorded.error.message);

    const corrected = await coordinator.execute({
      type: "record-result",
      requestId: "correct-inverted-score",
      tournamentId: tournament.tournamentId,
      expectedRevision: recorded.value.revision,
      matchId: match.matchId,
      kind: "played",
      gamesWonA: 0,
      gamesWonB: 2,
      drawnGames: 0,
      reason: "Score saisi à l'envers",
    });
    if (!corrected.ok) throw new Error(corrected.error.message);
    expect(corrected.value.revision).toBe(4);
    expect(corrected.value.rounds[0]?.pairingEvidence).toEqual(pairingEvidence);
    expect(corrected.value.rounds[0]?.matches.map(({ matchId }) => matchId)).toEqual(
      tournament.rounds[0]?.matches.map(({ matchId }) => matchId),
    );
    expect(
      corrected.value.rounds[0]?.matches.find(({ matchId }) => matchId === match.matchId),
    ).toMatchObject({
      status: "confirmed",
      currentResultVersion: 2,
      resultVersions: [
        {
          version: 1,
          gamesWonA: 2,
          gamesWonB: 1,
          outcome: "a-win",
          replacesVersion: null,
        },
        {
          version: 2,
          gamesWonA: 0,
          gamesWonB: 2,
          outcome: "b-win",
          replacesVersion: 1,
          reason: "Score saisi à l'envers",
        },
      ],
    });
    expect(
      corrected.value.standings.find(({ participantId }) => participantId === match.participantAId),
    ).toMatchObject({ losses: 1, matchPoints: 0 });
    expect(
      corrected.value.standings.find(({ participantId }) => participantId === match.participantBId),
    ).toMatchObject({ wins: 1, matchPoints: 3 });

    await expect(
      coordinator.execute({
        type: "record-result",
        requestId: "reject-unexplained-correction",
        tournamentId: tournament.tournamentId,
        expectedRevision: corrected.value.revision,
        matchId: match.matchId,
        kind: "played",
        gamesWonA: 2,
        gamesWonB: 0,
        drawnGames: 0,
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: "INVALID_RESULT" } });
    await expect(coordinator.getTournament(tournament.tournamentId)).resolves.toMatchObject({
      ok: true,
      value: { revision: corrected.value.revision },
    });
  });

  it("drops a participant, keeps current pairings and excludes them from future rounds", async () => {
    const { coordinator, tournament } = await createStartedSwissTournament();
    const firstRound = tournament.rounds[0];
    const droppedParticipant = tournament.participants[0];
    if (firstRound === undefined || droppedParticipant === undefined) {
      throw new Error("A started tournament is required.");
    }
    const originalPairings = firstRound.matches.map(
      ({ matchId, participantAId, participantBId }) => ({
        matchId,
        participantAId,
        participantBId,
      }),
    );

    const dropped = await coordinator.execute({
      type: "drop-participant",
      requestId: "drop-player-one",
      tournamentId: tournament.tournamentId,
      expectedRevision: tournament.revision,
      participantId: droppedParticipant.participantId,
      reason: "Départ anticipé",
    });
    if (!dropped.ok) throw new Error(dropped.error.message);
    expect(dropped.value.revision).toBe(3);
    expect(
      dropped.value.participants.find(
        ({ participantId }) => participantId === droppedParticipant.participantId,
      ),
    ).toMatchObject({ status: "dropped" });
    expect(
      dropped.value.rounds[0]?.matches.map(({ matchId, participantAId, participantBId }) => ({
        matchId,
        participantAId,
        participantBId,
      })),
    ).toEqual(originalPairings);

    let current = dropped.value;
    for (const match of firstRound.matches) {
      const droppedIsA = match.participantAId === droppedParticipant.participantId;
      const droppedIsB = match.participantBId === droppedParticipant.participantId;
      const recorded = await coordinator.execute({
        type: "record-result",
        requestId: `finish-${match.matchId}`,
        tournamentId: tournament.tournamentId,
        expectedRevision: current.revision,
        matchId: match.matchId,
        kind: droppedIsA || droppedIsB ? "forfeit" : "played",
        gamesWonA: droppedIsA ? 0 : 2,
        gamesWonB: droppedIsB ? 0 : droppedIsA ? 2 : 0,
        drawnGames: 0,
        ...(droppedIsA || droppedIsB ? { reason: "Abandon explicite" } : {}),
      });
      if (!recorded.ok) throw new Error(recorded.error.message);
      current = recorded.value;
    }
    expect(current.rounds[0]?.status).toBe("completed");

    const nextRound = await coordinator.execute({
      type: "publish-next-round",
      requestId: "round-after-drop",
      tournamentId: tournament.tournamentId,
      expectedRevision: current.revision,
    });
    if (!nextRound.ok) throw new Error(nextRound.error.message);
    const futureAppearances = nextRound.value.rounds[1]?.matches.flatMap(
      ({ participantAId, participantBId }) =>
        participantBId === null ? [participantAId] : [participantAId, participantBId],
    );
    expect(futureAppearances).toHaveLength(5);
    expect(futureAppearances).not.toContain(droppedParticipant.participantId);
    expect(new Set(futureAppearances).size).toBe(5);
  });

  it("completes every planned round and still allows an append-only correction afterward", async () => {
    const { coordinator, tournament } = await createStartedSwissTournament();
    await expect(
      coordinator.execute({
        type: "complete",
        requestId: "complete-too-early",
        tournamentId: tournament.tournamentId,
        expectedRevision: tournament.revision,
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: "ROUND_INCOMPLETE" } });

    let current = tournament;
    for (let roundNumber = 1; roundNumber <= 3; roundNumber += 1) {
      const round = current.rounds[roundNumber - 1];
      if (round === undefined) throw new Error(`Round ${String(roundNumber)} is missing.`);
      for (const match of round.matches) {
        const recorded = await coordinator.execute({
          type: "record-result",
          requestId: `complete-r${String(roundNumber)}-${match.matchId}`,
          tournamentId: tournament.tournamentId,
          expectedRevision: current.revision,
          matchId: match.matchId,
          kind: "played",
          gamesWonA: 2,
          gamesWonB: 0,
          drawnGames: 0,
        });
        if (!recorded.ok) throw new Error(recorded.error.message);
        current = recorded.value;
      }
      if (roundNumber < 3) {
        const published = await coordinator.execute({
          type: "publish-next-round",
          requestId: `publish-completion-round-${String(roundNumber + 1)}`,
          tournamentId: tournament.tournamentId,
          expectedRevision: current.revision,
        });
        if (!published.ok) throw new Error(published.error.message);
        current = published.value;
      }
    }
    const publishedPairings = current.rounds.map((round) =>
      round.matches.map(({ matchId, participantAId, participantBId }) => ({
        matchId,
        participantAId,
        participantBId,
      })),
    );
    const firstMatch = current.rounds[0]?.matches[0];
    if (firstMatch === undefined) throw new Error("A completed match is required.");

    const completed = await coordinator.execute({
      type: "complete",
      requestId: "complete-tournament",
      tournamentId: tournament.tournamentId,
      expectedRevision: current.revision,
    });
    if (!completed.ok) throw new Error(completed.error.message);
    expect(completed.value).toMatchObject({
      status: "completed",
      revision: current.revision + 1,
    });
    expect(completed.value.completedAt).not.toBeNull();

    const corrected = await coordinator.execute({
      type: "record-result",
      requestId: "correct-after-completion",
      tournamentId: tournament.tournamentId,
      expectedRevision: completed.value.revision,
      matchId: firstMatch.matchId,
      kind: "played",
      gamesWonA: 0,
      gamesWonB: 2,
      drawnGames: 0,
      reason: "Correction après vérification papier",
    });
    if (!corrected.ok) throw new Error(corrected.error.message);
    expect(corrected.value.status).toBe("completed");
    expect(corrected.value.completedAt).toBe(completed.value.completedAt);
    expect(
      corrected.value.rounds.map((round) =>
        round.matches.map(({ matchId, participantAId, participantBId }) => ({
          matchId,
          participantAId,
          participantBId,
        })),
      ),
    ).toEqual(publishedPairings);
    expect(
      corrected.value.rounds[0]?.matches.find(({ matchId }) => matchId === firstMatch.matchId),
    ).toMatchObject({
      currentResultVersion: 2,
      resultVersions: [
        { version: 1, outcome: "a-win" },
        {
          version: 2,
          outcome: "b-win",
          replacesVersion: 1,
          reason: "Correction après vérification papier",
        },
      ],
    });
  });

  it("publishes all three round-robin rounds atomically and accepts their results independently", async () => {
    const coordinator = createTournamentCoordinator({
      store: createInMemoryTournamentStore(),
      cubeCatalog: createCubeCatalog(),
      now: createTournamentTestClock().now,
      createId: createTournamentSequence("round-robin-id"),
      createSeed: () => 42,
    });
    const created = await coordinator.createTournament({
      requestId: "create-independent-round-robin",
      name: "Toutes rondes indépendantes",
    });
    if (!created.ok) throw new Error(created.error.message);
    const configured = await coordinator.execute({
      type: "replace-setup",
      requestId: "setup-independent-round-robin",
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
      requestId: "start-independent-round-robin",
      tournamentId: created.value.tournamentId,
      expectedRevision: configured.value.revision,
    });
    if (!started.ok) throw new Error(started.error.message);
    expect(started.value.revision).toBe(2);
    expect(
      started.value.rounds.map(({ roundNumber, status }) => ({ roundNumber, status })),
    ).toEqual([
      { roundNumber: 1, status: "published" },
      { roundNumber: 2, status: "published" },
      { roundNumber: 3, status: "published" },
    ]);

    const thirdRoundMatch = started.value.rounds[2]?.matches[0];
    if (thirdRoundMatch === undefined) throw new Error("The third round match is required.");
    const recorded = await coordinator.execute({
      type: "record-result",
      requestId: "record-third-round-first",
      tournamentId: created.value.tournamentId,
      expectedRevision: started.value.revision,
      matchId: thirdRoundMatch.matchId,
      kind: "played",
      gamesWonA: 2,
      gamesWonB: 0,
      drawnGames: 0,
    });
    if (!recorded.ok) throw new Error(recorded.error.message);
    expect(recorded.value.rounds.map(({ status }) => status)).toEqual([
      "published",
      "published",
      "completed",
    ]);

    let current = recorded.value;
    for (const roundIndex of [0, 1]) {
      const match = current.rounds[roundIndex]?.matches[0];
      if (match === undefined) throw new Error("A remaining round-robin match is required.");
      const result = await coordinator.execute({
        type: "record-result",
        requestId: `finish-round-robin-${String(roundIndex + 1)}`,
        tournamentId: created.value.tournamentId,
        expectedRevision: current.revision,
        matchId: match.matchId,
        kind: "played",
        gamesWonA: 2,
        gamesWonB: 1,
        drawnGames: 0,
      });
      if (!result.ok) throw new Error(result.error.message);
      current = result.value;
    }
    const completed = await coordinator.execute({
      type: "complete",
      requestId: "complete-independent-round-robin",
      tournamentId: created.value.tournamentId,
      expectedRevision: current.revision,
    });
    if (!completed.ok) throw new Error(completed.error.message);
    expect(completed.value).toMatchObject({ status: "completed" });
    expect(completed.value.rounds.every(({ status }) => status === "completed")).toBe(true);
    await expect(coordinator.getTournament(created.value.tournamentId)).resolves.toEqual({
      ok: true,
      value: completed.value,
    });
  });

  it("adds, deduplicates and replaces key cards while refusing Oracle IDs outside the snapshot", async () => {
    const { coordinator, tournament } = await createStartedSwissTournament();
    const participant = tournament.participants[0];
    const [firstCard, secondCard] = tournament.cube?.payload.cards ?? [];
    if (participant === undefined || firstCard === undefined || secondCard === undefined) {
      throw new Error("A participant and two snapshot cards are required.");
    }

    const added = await coordinator.execute({
      type: "update-key-cards",
      requestId: "add-key-cards",
      tournamentId: tournament.tournamentId,
      expectedRevision: tournament.revision,
      participantId: participant.participantId,
      oracleIds: [firstCard.oracleId, firstCard.oracleId, secondCard.oracleId],
    });
    if (!added.ok) throw new Error(added.error.message);
    expect(
      added.value.participants.find(
        ({ participantId }) => participantId === participant.participantId,
      )?.deck.keyCards,
    ).toEqual([
      { oracleId: firstCard.oracleId, name: firstCard.name },
      { oracleId: secondCard.oracleId, name: secondCard.name },
    ]);

    const replaced = await coordinator.execute({
      type: "update-key-cards",
      requestId: "replace-key-cards",
      tournamentId: tournament.tournamentId,
      expectedRevision: added.value.revision,
      participantId: participant.participantId,
      oracleIds: [secondCard.oracleId],
    });
    if (!replaced.ok) throw new Error(replaced.error.message);
    expect(
      replaced.value.participants.find(
        ({ participantId }) => participantId === participant.participantId,
      )?.deck.keyCards,
    ).toEqual([{ oracleId: secondCard.oracleId, name: secondCard.name }]);

    await expect(
      coordinator.execute({
        type: "update-key-cards",
        requestId: "reject-card-outside-snapshot",
        tournamentId: tournament.tournamentId,
        expectedRevision: replaced.value.revision,
        participantId: participant.participantId,
        oracleIds: ["oracle-not-in-locked-snapshot"],
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: "INVALID_INPUT",
        details: { unknownOracleIds: ["oracle-not-in-locked-snapshot"] },
      },
    });
    await expect(coordinator.getTournament(tournament.tournamentId)).resolves.toMatchObject({
      ok: true,
      value: {
        revision: replaced.value.revision,
      },
    });
    const reloaded = await coordinator.getTournament(tournament.tournamentId);
    if (!reloaded.ok) throw new Error(reloaded.error.message);
    expect(
      reloaded.value.participants.find(
        ({ participantId }) => participantId === participant.participantId,
      )?.deck.keyCards,
    ).toEqual([{ oracleId: secondCard.oracleId, name: secondCard.name }]);
  });

  it("keeps standings and published pairings bit-for-bit unchanged after key-card updates", async () => {
    const { coordinator, tournament } = await createStartedSwissTournament();
    const participant = tournament.participants[0];
    const card = tournament.cube?.payload.cards[0];
    if (participant === undefined || card === undefined) {
      throw new Error("A participant and a snapshot card are required.");
    }
    const roundsBefore = structuredClone(tournament.rounds);
    const standingsBefore = structuredClone(tournament.standings);

    const updated = await coordinator.execute({
      type: "update-key-cards",
      requestId: "invariance-key-card",
      tournamentId: tournament.tournamentId,
      expectedRevision: tournament.revision,
      participantId: participant.participantId,
      oracleIds: [card.oracleId],
    });
    if (!updated.ok) throw new Error(updated.error.message);
    expect(updated.value.rounds).toEqual(roundsBefore);
    expect(updated.value.standings).toEqual(standingsBefore);
    expect(
      updated.value.participants.find(
        ({ participantId }) => participantId === participant.participantId,
      )?.deck.keyCards,
    ).toEqual([{ oracleId: card.oracleId, name: card.name }]);
  });
});
