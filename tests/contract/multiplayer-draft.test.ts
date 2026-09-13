import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  createLocalFileMultiplayerDraftStore,
  createMultiplayerDraftCoordinator,
  createSupabaseMultiplayerDraftStore,
  type MultiplayerDraftStore,
  type PersistedMultiplayerState,
} from "../../src/multiplayer-draft/index.ts";
import {
  createSequenceFactory,
  createTestClock,
  EMPTY_SEATS,
} from "../helpers/multiplayer-draft-fixtures.ts";

function createEmptyStore(): MultiplayerDraftStore {
  return {
    load: () => Promise.resolve(null),
    commit: () =>
      Promise.reject(new Error("The empty Salon read must not create persisted state.")),
  };
}

function createPreloadedStore(state: PersistedMultiplayerState): MultiplayerDraftStore {
  return {
    load: () => Promise.resolve(state),
    commit: () => Promise.reject(new Error("A read must not commit state.")),
  };
}

function createMemoryStore(): MultiplayerDraftStore {
  let state: Readonly<PersistedMultiplayerState> | null = null;
  return {
    load: () => Promise.resolve(state),
    commit: (command) => {
      state = command.nextState;
      return Promise.resolve({ ok: true as const, value: state });
    },
  };
}

describe("MultiplayerDraftCoordinator", () => {
  it("returns the empty global Salon without exposing private state", async () => {
    const clock = createTestClock();
    const coordinator = createMultiplayerDraftCoordinator({
      store: createEmptyStore(),
      now: clock.now,
      createId: createSequenceFactory("id"),
      createResumeToken: createSequenceFactory("resume"),
    });

    await expect(coordinator.getLobby()).resolves.toEqual({
      ok: true,
      value: {
        lobbyId: "global",
        generation: 0,
        revision: 0,
        status: "open",
        cubeKey: null,
        cubeLocked: false,
        activeSessionId: null,
        participants: [],
        seats: EMPTY_SEATS,
      },
    });
  });

  it("reconstructs the public Salon from its journal", async () => {
    const clock = createTestClock();
    const staleLobby = {
      lobbyId: "global",
      generation: 0,
      revision: 0,
      status: "open",
      cubeKey: null,
      cubeLocked: false,
      activeSessionId: null,
      participants: [],
      seats: EMPTY_SEATS,
    } as const;
    const coordinator = createMultiplayerDraftCoordinator({
      store: createPreloadedStore({
        lobby: staleLobby,
        events: [
          {
            schemaVersion: 1,
            sequence: 1,
            revision: 1,
            scopeId: "global",
            requestId: "join-alice",
            occurredAt: "2026-09-13T12:00:00.000Z",
            type: "LobbyOpened",
            generation: 1,
            cubeKey: "titou_tribal",
          },
          {
            schemaVersion: 1,
            sequence: 2,
            revision: 1,
            scopeId: "global",
            requestId: "join-alice",
            occurredAt: "2026-09-13T12:00:00.000Z",
            type: "ParticipantJoined",
            participantId: "participant-001",
            displayName: "Alice",
            normalizedName: "alice",
            resumeTokenHash: "secret-hash",
            seatId: 0,
          },
        ],
      }),
      now: clock.now,
      createId: createSequenceFactory("id"),
      createResumeToken: createSequenceFactory("resume"),
    });

    await expect(coordinator.getLobby()).resolves.toEqual({
      ok: true,
      value: {
        lobbyId: "global",
        generation: 1,
        revision: 1,
        status: "open",
        cubeKey: "titou_tribal",
        cubeLocked: false,
        activeSessionId: null,
        participants: [
          {
            participantId: "participant-001",
            displayName: "Alice",
            seatId: 0,
            ready: false,
            presence: "connected",
          },
        ],
        seats: [
          {
            seatId: 0,
            participantId: "participant-001",
            kind: "human",
            displayName: "Alice",
            ready: false,
            presence: "connected",
          },
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ],
      },
    });
  });

  it("lets the first participant choose the cube and join the global Salon", async () => {
    const clock = createTestClock();
    const coordinator = createMultiplayerDraftCoordinator({
      store: createMemoryStore(),
      now: clock.now,
      createId: createSequenceFactory("participant"),
      createResumeToken: createSequenceFactory("resume"),
    });

    const result = await coordinator.join({
      requestId: "join-alice",
      expectedRevision: 0,
      playerName: " Alice ",
      cubeKey: "titou_tribal",
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        participantId: "participant-001",
        resumeToken: "resume-001",
        state: {
          generation: 1,
          revision: 1,
          cubeKey: "titou_tribal",
          cubeLocked: false,
          participants: [
            {
              participantId: "participant-001",
              displayName: "Alice",
              seatId: 0,
              ready: false,
            },
          ],
        },
      },
    });
    await expect(coordinator.getLobby()).resolves.toMatchObject({
      ok: true,
      value: { revision: 1, participants: [{ displayName: "Alice" }] },
    });
  });

  it("assigns the second participant a distinct seat and locks the cube", async () => {
    const clock = createTestClock();
    const coordinator = createMultiplayerDraftCoordinator({
      store: createMemoryStore(),
      now: clock.now,
      createId: createSequenceFactory("participant"),
      createResumeToken: createSequenceFactory("resume"),
    });
    await coordinator.join({
      requestId: "join-alice",
      expectedRevision: 0,
      playerName: "Alice",
      cubeKey: "titou_tribal",
    });

    const result = await coordinator.join({
      requestId: "join-bob",
      expectedRevision: 1,
      playerName: "Bob",
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        participantId: "participant-002",
        state: {
          generation: 1,
          revision: 2,
          cubeKey: "titou_tribal",
          cubeLocked: true,
          participants: [
            { displayName: "Alice", seatId: 0 },
            { displayName: "Bob", seatId: 1 },
          ],
        },
      },
    });
  });

  it("rejects an empty participant name without opening the Salon", async () => {
    const store = createMemoryStore();
    const coordinator = createMultiplayerDraftCoordinator({
      store,
      now: createTestClock().now,
      createId: createSequenceFactory("participant"),
      createResumeToken: createSequenceFactory("resume"),
    });

    await expect(
      coordinator.join({
        requestId: "join-empty",
        expectedRevision: 0,
        playerName: "   ",
        cubeKey: "titou_tribal",
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "INVALID_INPUT",
        message: "Le nom du participant est obligatoire.",
        details: { field: "playerName" },
      },
    });
    await expect(store.load()).resolves.toBeNull();
  });

  it("requires the first participant to choose a cube", async () => {
    const store = createMemoryStore();
    const coordinator = createMultiplayerDraftCoordinator({
      store,
      now: createTestClock().now,
      createId: createSequenceFactory("participant"),
      createResumeToken: createSequenceFactory("resume"),
    });

    await expect(
      coordinator.join({
        requestId: "join-without-cube",
        expectedRevision: 0,
        playerName: "Alice",
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "INVALID_INPUT",
        message: "Le premier participant doit choisir un cube.",
        details: { field: "cubeKey" },
      },
    });
    await expect(store.load()).resolves.toBeNull();
  });

  it("rejects a duplicate participant name without reserving another seat", async () => {
    const store = createMemoryStore();
    const coordinator = createMultiplayerDraftCoordinator({
      store,
      now: createTestClock().now,
      createId: createSequenceFactory("participant"),
      createResumeToken: createSequenceFactory("resume"),
    });
    await coordinator.join({
      requestId: "join-alice",
      expectedRevision: 0,
      playerName: "Alice",
      cubeKey: "titou_tribal",
    });

    await expect(
      coordinator.join({
        requestId: "join-alice-again",
        expectedRevision: 1,
        playerName: "  ALICE ",
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "NAME_TAKEN",
        message: "Ce nom est deja utilise dans le Salon de draft.",
        details: { field: "playerName" },
      },
    });
    await expect(coordinator.getLobby()).resolves.toMatchObject({
      ok: true,
      value: { revision: 1, participants: [{ displayName: "Alice" }] },
    });
  });

  it("rejects a stale revision without mutating the Salon", async () => {
    const store = createMemoryStore();
    const coordinator = createMultiplayerDraftCoordinator({
      store,
      now: createTestClock().now,
      createId: createSequenceFactory("participant"),
      createResumeToken: createSequenceFactory("resume"),
    });
    await coordinator.join({
      requestId: "join-alice",
      expectedRevision: 0,
      playerName: "Alice",
      cubeKey: "titou_tribal",
    });

    await expect(
      coordinator.join({
        requestId: "join-bob-stale",
        expectedRevision: 0,
        playerName: "Bob",
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "REVISION_CONFLICT",
        message: "Le Salon de draft a change. Rechargez son etat.",
        details: { currentRevision: 1 },
      },
    });
    await expect(coordinator.getLobby()).resolves.toMatchObject({
      ok: true,
      value: { revision: 1, participants: [{ displayName: "Alice" }] },
    });
  });

  it("returns the original join result when the same command is retried", async () => {
    const coordinator = createMultiplayerDraftCoordinator({
      store: createMemoryStore(),
      now: createTestClock().now,
      createId: createSequenceFactory("participant"),
      createResumeToken: (requestId) => `resume-${requestId}`,
    });
    const command = {
      requestId: "join-alice",
      expectedRevision: 0,
      playerName: "Alice",
      cubeKey: "titou_tribal",
    } as const;

    const first = await coordinator.join(command);
    const retry = await coordinator.join(command);

    expect(retry).toEqual(first);
    await expect(coordinator.getLobby()).resolves.toMatchObject({
      ok: true,
      value: { revision: 1, participants: [{ displayName: "Alice" }] },
    });
  });

  it("reconstructs the Salon through a new coordinator after a file-store restart", async () => {
    const directory = await mkdtemp(join(tmpdir(), "draftmaster-multiplayer-"));
    const filePath = join(directory, "global.json");
    const clock = createTestClock();
    try {
      const firstCoordinator = createMultiplayerDraftCoordinator({
        store: createLocalFileMultiplayerDraftStore({ filePath }),
        now: clock.now,
        createId: createSequenceFactory("participant"),
        createResumeToken: createSequenceFactory("resume"),
      });
      await firstCoordinator.join({
        requestId: "join-alice",
        expectedRevision: 0,
        playerName: "Alice",
        cubeKey: "titou_tribal",
      });

      const restartedCoordinator = createMultiplayerDraftCoordinator({
        store: createLocalFileMultiplayerDraftStore({ filePath }),
        now: clock.now,
        createId: createSequenceFactory("after-restart"),
        createResumeToken: createSequenceFactory("after-restart"),
      });

      await expect(restartedCoordinator.getLobby()).resolves.toMatchObject({
        ok: true,
        value: {
          generation: 1,
          revision: 1,
          cubeKey: "titou_tribal",
          participants: [{ displayName: "Alice", seatId: 0 }],
        },
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("deduplicates the same join command submitted concurrently", async () => {
    const directory = await mkdtemp(join(tmpdir(), "draftmaster-multiplayer-"));
    const filePath = join(directory, "global.json");
    const command = {
      requestId: "join-alice",
      expectedRevision: 0,
      playerName: "Alice",
      cubeKey: "titou_tribal",
    } as const;
    const createCoordinator = () =>
      createMultiplayerDraftCoordinator({
        store: createLocalFileMultiplayerDraftStore({ filePath }),
        now: createTestClock().now,
        createId: () => "participant-alice",
        createResumeToken: (requestId: string) => `resume-${requestId}`,
      });
    try {
      const [first, duplicate] = await Promise.all([
        createCoordinator().join(command),
        createCoordinator().join(command),
      ]);

      expect(first).toEqual(duplicate);
      expect(first).toMatchObject({ ok: true, value: { participantId: "participant-alice" } });
      await expect(createCoordinator().getLobby()).resolves.toMatchObject({
        ok: true,
        value: { revision: 1, participants: [{ participantId: "participant-alice" }] },
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("persists coordinator behavior through the Supabase gateway", async () => {
    let state: PersistedMultiplayerState = {
      lobby: {
        lobbyId: "global",
        generation: 0,
        revision: 0,
        status: "open",
        cubeKey: null,
        cubeLocked: false,
        activeSessionId: null,
        participants: [],
        seats: EMPTY_SEATS,
      },
      events: [],
    };
    const gateway = {
      loadLobby: () => Promise.resolve({ data: state, error: null }),
      commitLobby: (input: { readonly nextState: PersistedMultiplayerState }) => {
        state = input.nextState;
        return Promise.resolve({ data: { ok: true as const, state }, error: null });
      },
    };
    const coordinator = createMultiplayerDraftCoordinator({
      store: createSupabaseMultiplayerDraftStore({ gateway }),
      now: createTestClock().now,
      createId: createSequenceFactory("participant"),
      createResumeToken: createSequenceFactory("resume"),
    });

    await expect(
      coordinator.join({
        requestId: "join-alice",
        expectedRevision: 0,
        playerName: "Alice",
        cubeKey: "titou_tribal",
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: { state: { revision: 1, participants: [{ displayName: "Alice" }] } },
    });
  });
});
