import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  createSupabaseTournamentStore,
  type PersistedTournament,
  type TournamentStoreCommitAttempt,
  type TournamentSupabaseGateway,
} from "../../src/tournaments/index.ts";
import {
  buildTournamentCubeSnapshot,
  buildTournamentParticipant,
  buildTournamentProjection,
} from "../helpers/tournament-fixtures.ts";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function buildConfiguredCommit(): {
  readonly persistedBefore: PersistedTournament;
  readonly attempt: TournamentStoreCommitAttempt;
} {
  const before = buildTournamentProjection();
  const cube = buildTournamentCubeSnapshot();
  const participants = [
    buildTournamentParticipant("participant-001", "Alice", "Aggro Boros", 0),
    buildTournamentParticipant("participant-002", "Bob", "Izzet Wizards", 1),
  ];
  const createdEvent = {
    schemaVersion: 1,
    sequence: 1,
    tournamentId: before.tournamentId,
    revision: 0,
    requestId: "create-september-cube",
    occurredAt: before.createdAt,
    type: "TournamentCreated",
    name: before.name,
    pairingSeed: before.pairingSeed,
  } as const;
  const configured = buildTournamentProjection({
    revision: 1,
    format: "swiss",
    plannedRoundCount: 3,
    cube,
    participants,
    updatedAt: "2026-09-21T18:05:00.000Z",
  });
  const setupEvent = {
    schemaVersion: 1,
    sequence: 2,
    tournamentId: before.tournamentId,
    revision: 1,
    requestId: "setup-september-cube",
    occurredAt: configured.updatedAt,
    type: "TournamentSetupReplaced",
    name: configured.name,
    format: "swiss",
    plannedRoundCount: 3,
    cube,
    participants,
  } as const;
  return {
    persistedBefore: { checkpoint: before, events: [createdEvent] },
    attempt: {
      scope: before.tournamentId,
      tournamentId: before.tournamentId,
      expectedRevision: 0,
      requestId: setupEvent.requestId,
      requestFingerprint: "a".repeat(64),
      snapshotArchives: [cube],
      appendedEvents: [setupEvent],
      nextState: configured,
      response: configured,
    },
  };
}

function createDurableGateway(initial: PersistedTournament): {
  readonly gateway: TournamentSupabaseGateway;
  readonly commitCalls: TournamentStoreCommitAttempt[];
  readonly archivedSnapshots: { readonly snapshotId: string; readonly canonicalSha256: string }[];
} {
  let persisted = clone(initial);
  const commitCalls: TournamentStoreCommitAttempt[] = [];
  const archivedSnapshots: { snapshotId: string; canonicalSha256: string }[] = [];
  const receipts = new Map<
    string,
    {
      readonly requestFingerprint: string;
      readonly response: TournamentStoreCommitAttempt["response"];
    }
  >();
  const gateway: TournamentSupabaseGateway = {
    listTournaments: () => Promise.resolve({ data: [], error: null }),
    loadTournament: (tournamentId) =>
      Promise.resolve({
        data: persisted.checkpoint.tournamentId === tournamentId ? clone(persisted) : null,
        error: null,
      }),
    commitTournament: (attempt) => {
      commitCalls.push(clone(attempt));
      const receiptKey = `${attempt.scope}\0${attempt.requestId}`;
      const receipt = receipts.get(receiptKey);
      if (receipt !== undefined) {
        return Promise.resolve({
          data:
            receipt.requestFingerprint === attempt.requestFingerprint
              ? { kind: "replayed" as const, tournament: clone(receipt.response) }
              : {
                  code: "IDEMPOTENCY_CONFLICT" as const,
                  details: { currentRevision: persisted.checkpoint.revision },
                },
          error: null,
        });
      }
      if (persisted.checkpoint.revision !== attempt.expectedRevision) {
        return Promise.resolve({
          data: {
            code: "REVISION_CONFLICT" as const,
            details: { currentRevision: persisted.checkpoint.revision },
          },
          error: null,
        });
      }
      archivedSnapshots.push(
        ...attempt.snapshotArchives.map(({ snapshotId, canonicalSha256 }) => ({
          snapshotId,
          canonicalSha256,
        })),
      );
      persisted = {
        checkpoint: clone(attempt.nextState),
        events: clone([...persisted.events, ...attempt.appendedEvents]),
      };
      receipts.set(receiptKey, {
        requestFingerprint: attempt.requestFingerprint,
        response: clone(attempt.response),
      });
      return Promise.resolve({
        data: { kind: "committed" as const, tournament: clone(attempt.response) },
        error: null,
      });
    },
    checkReadiness: () => Promise.resolve({ data: { ready: true as const }, error: null }),
  };
  return { gateway, commitCalls, archivedSnapshots };
}

describe("Tournament PostgreSQL storage integration", () => {
  it("commits checkpoint, event, receipt payload and snapshot archive atomically then reloads", async () => {
    const { persistedBefore, attempt } = buildConfiguredCommit();
    const durable = createDurableGateway(persistedBefore);
    const store = createSupabaseTournamentStore({ gateway: durable.gateway });

    await expect(store.commit(attempt)).resolves.toEqual({
      ok: true,
      value: { kind: "committed", tournament: attempt.response },
    });
    expect(durable.commitCalls).toEqual([attempt]);
    expect(durable.archivedSnapshots).toEqual([
      {
        snapshotId: attempt.snapshotArchives[0]?.snapshotId,
        canonicalSha256: attempt.snapshotArchives[0]?.canonicalSha256,
      },
    ]);

    const reloadedStore = createSupabaseTournamentStore({ gateway: durable.gateway });
    await expect(reloadedStore.load(attempt.tournamentId)).resolves.toEqual({
      ok: true,
      value: {
        checkpoint: attempt.nextState,
        events: [persistedBefore.events[0], attempt.appendedEvents[0]],
      },
    });
  });

  it("persists a correction receipt across adapter restart and replays it without duplicate event", async () => {
    const { persistedBefore, attempt } = buildConfiguredCommit();
    const durable = createDurableGateway(persistedBefore);
    const firstStore = createSupabaseTournamentStore({ gateway: durable.gateway });
    const configured = await firstStore.commit(attempt);
    if (!configured.ok) throw new Error(configured.error.message);

    const correctedState = {
      ...attempt.nextState,
      revision: 2,
      updatedAt: "2026-09-21T18:10:00.000Z",
    } as const;
    const correctionEvent = {
      schemaVersion: 1,
      sequence: 3,
      tournamentId: attempt.tournamentId,
      revision: 2,
      requestId: "correct-persisted-result",
      occurredAt: correctedState.updatedAt,
      type: "MatchResultCorrected",
      matchId: "match-001",
      result: {
        version: 2,
        kind: "played",
        gamesWonA: 0,
        gamesWonB: 2,
        drawnGames: 0,
        outcome: "b-win",
        recordedAt: correctedState.updatedAt,
        requestId: "correct-persisted-result",
        replacesVersion: 1,
        reason: "Score inversé",
      },
    } as const;
    const correctionAttempt: TournamentStoreCommitAttempt = {
      scope: attempt.tournamentId,
      tournamentId: attempt.tournamentId,
      expectedRevision: 1,
      requestId: correctionEvent.requestId,
      requestFingerprint: "b".repeat(64),
      snapshotArchives: [],
      appendedEvents: [correctionEvent],
      nextState: correctedState,
      response: correctedState,
    };

    const restartedStore = createSupabaseTournamentStore({ gateway: durable.gateway });
    await expect(restartedStore.commit(correctionAttempt)).resolves.toMatchObject({
      ok: true,
      value: { kind: "committed", tournament: { revision: 2 } },
    });
    const retriedStore = createSupabaseTournamentStore({ gateway: durable.gateway });
    await expect(retriedStore.commit(correctionAttempt)).resolves.toMatchObject({
      ok: true,
      value: { kind: "replayed", tournament: { revision: 2 } },
    });
    await expect(retriedStore.load(attempt.tournamentId)).resolves.toMatchObject({
      ok: true,
      value: {
        checkpoint: { revision: 2 },
        events: [
          { type: "TournamentCreated" },
          { type: "TournamentSetupReplaced" },
          {
            type: "MatchResultCorrected",
            result: { version: 2, replacesVersion: 1, reason: "Score inversé" },
          },
        ],
      },
    });
  });

  it("returns STORE_UNAVAILABLE instead of serving a cached or local fallback", async () => {
    const { persistedBefore } = buildConfiguredCommit();
    let available = true;
    const gateway: TournamentSupabaseGateway = {
      listTournaments: () => Promise.resolve({ data: [], error: null }),
      loadTournament: () =>
        Promise.resolve(
          available
            ? { data: persistedBefore, error: null }
            : { data: null, error: { message: "database unavailable" } },
        ),
      commitTournament: () =>
        Promise.resolve({ data: null, error: { message: "database unavailable" } }),
      checkReadiness: () =>
        Promise.resolve({ data: null, error: { message: "database unavailable" } }),
    };
    const store = createSupabaseTournamentStore({ gateway });
    await expect(store.load(persistedBefore.checkpoint.tournamentId)).resolves.toEqual({
      ok: true,
      value: persistedBefore,
    });

    available = false;
    await expect(store.load(persistedBefore.checkpoint.tournamentId)).resolves.toMatchObject({
      ok: false,
      error: { code: "STORE_UNAVAILABLE" },
    });
    await expect(store.checkReadiness()).resolves.toMatchObject({
      ok: false,
      error: { code: "STORE_UNAVAILABLE" },
    });
  });

  it("bounds a hung transaction and reports storage unavailability", async () => {
    const { persistedBefore, attempt } = buildConfiguredCommit();
    const gateway = createDurableGateway(persistedBefore).gateway;
    const hangingGateway: TournamentSupabaseGateway = {
      ...gateway,
      commitTournament: () => new Promise(() => undefined),
    };
    const store = createSupabaseTournamentStore({ gateway: hangingGateway, timeoutMs: 5 });

    await expect(store.commit(attempt)).resolves.toMatchObject({
      ok: false,
      error: { code: "STORE_UNAVAILABLE", details: { reason: "timeout" } },
    });
  });

  it("keeps tournament tables private and exposes only the transactional RPC to service_role", async () => {
    const migration = await readFile(
      resolve(process.cwd(), "supabase", "migrations", "202609210001_tournament_management.sql"),
      "utf8",
    );

    expect(migration).toContain("create table if not exists public.cube_snapshot_archive");
    expect(migration).toContain("create or replace function public.commit_tournament");
    expect(migration).toContain("security definer");
    for (const table of [
      "cube_snapshot_archive",
      "tournaments",
      "tournament_events",
      "tournament_command_receipts",
    ]) {
      expect(migration).toContain(`alter table public.${table} enable row level security;`);
      expect(migration).toContain(
        `revoke all on table public.${table} from public, anon, authenticated;`,
      );
    }
    expect(migration).toMatch(
      /revoke all on function public\.commit_tournament\([\s\S]+?\) from public, anon, authenticated;/u,
    );
    expect(migration).toMatch(
      /grant execute on function public\.commit_tournament\([\s\S]+?\) to service_role;/u,
    );
  });
});
