import { describe, expect, it } from "vitest";

import { createInMemoryTournamentStore } from "../../src/tournaments/index.ts";
import type { TournamentStoreCommitAttempt } from "../../src/tournaments/types.ts";
import { buildTournamentProjection } from "../helpers/tournament-fixtures.ts";

describe("TournamentStore contract", () => {
  it("replays an identical commit without appending its events twice", async () => {
    const store = createInMemoryTournamentStore();
    const tournament = buildTournamentProjection();
    const attempt: TournamentStoreCommitAttempt = {
      scope: "tournaments",
      tournamentId: tournament.tournamentId,
      expectedRevision: null,
      requestId: "create-september-cube",
      requestFingerprint: "fingerprint-create-september-cube",
      snapshotArchives: [],
      appendedEvents: [
        {
          schemaVersion: 1,
          sequence: 1,
          tournamentId: tournament.tournamentId,
          revision: 0,
          requestId: "create-september-cube",
          occurredAt: tournament.createdAt,
          type: "TournamentCreated",
          name: tournament.name,
          pairingSeed: tournament.pairingSeed,
        },
      ],
      nextState: tournament,
      response: tournament,
    };

    await expect(store.commit(attempt)).resolves.toEqual({
      ok: true,
      value: { kind: "committed", tournament },
    });
    await expect(store.commit(attempt)).resolves.toEqual({
      ok: true,
      value: { kind: "replayed", tournament },
    });
    await expect(store.load(tournament.tournamentId)).resolves.toMatchObject({
      ok: true,
      value: { events: [{ type: "TournamentCreated" }] },
    });
  });

  it("rejects a non-contiguous next revision without creating the tournament", async () => {
    const store = createInMemoryTournamentStore();
    const tournament = buildTournamentProjection({ revision: 2 });

    await expect(
      store.commit({
        scope: "tournaments",
        tournamentId: tournament.tournamentId,
        expectedRevision: null,
        requestId: "create-with-invalid-revision",
        requestFingerprint: "fingerprint-create-with-invalid-revision",
        snapshotArchives: [],
        appendedEvents: [],
        nextState: tournament,
        response: tournament,
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "INVALID_INPUT",
        message: "La prochaine révision du tournoi n'est pas contiguë.",
        details: { actualRevision: 2, expectedRevision: 0 },
      },
    });
    await expect(store.load(tournament.tournamentId)).resolves.toEqual({
      ok: true,
      value: null,
    });
  });
});
