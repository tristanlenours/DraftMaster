import { describe, expect, it } from "vitest";

import { createMultiplayerDraftCoordinator } from "../../../src/multiplayer-draft/index.ts";
import {
  createMemoryMultiplayerDraftStore,
  createSequenceFactory,
  createTestClock,
  buildMultiplayerSnapshot,
} from "../../helpers/multiplayer-draft-fixtures.ts";

function createCoordinator() {
  return createMultiplayerDraftCoordinator({
    store: createMemoryMultiplayerDraftStore(),
    now: createTestClock().now,
    createId: createSequenceFactory("participant"),
    createResumeToken: (requestId) => `resume-${requestId}`,
  });
}

describe("MultiplayerDraftCoordinator ready", () => {
  it("refuse de confirmer le depart avec moins de deux humains", async () => {
    const coordinator = createCoordinator();
    const alice = await coordinator.join({
      requestId: "join-alice",
      expectedRevision: 0,
      playerName: "Alice",
      cubeKey: "titou_tribal",
    });
    if (!alice.ok) throw new Error(alice.error.message);

    await expect(
      coordinator.setReady({
        requestId: "ready-alice",
        expectedRevision: 1,
        resumeToken: alice.value.resumeToken,
        ready: true,
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "NOT_ENOUGH_PLAYERS",
        message: "Au moins deux amis sont necessaires pour demarrer le draft.",
        details: { participantCount: 1 },
      },
    });
    await expect(coordinator.getLobby()).resolves.toMatchObject({
      ok: true,
      value: { revision: 1, participants: [{ displayName: "Alice", ready: false }] },
    });
  });

  it("remet tous les accords a non pret quand la composition change", async () => {
    const coordinator = createCoordinator();
    const alice = await coordinator.join({
      requestId: "join-alice",
      expectedRevision: 0,
      playerName: "Alice",
      cubeKey: "titou_tribal",
    });
    if (!alice.ok) throw new Error(alice.error.message);
    await coordinator.join({
      requestId: "join-bob",
      expectedRevision: 1,
      playerName: "Bob",
    });

    await expect(
      coordinator.setReady({
        requestId: "ready-alice",
        expectedRevision: 2,
        resumeToken: alice.value.resumeToken,
        ready: true,
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        revision: 3,
        participants: [
          { displayName: "Alice", ready: true },
          { displayName: "Bob", ready: false },
        ],
      },
    });

    await expect(
      coordinator.join({
        requestId: "join-charlie",
        expectedRevision: 3,
        playerName: "Charlie",
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        state: {
          revision: 4,
          participants: [
            { displayName: "Alice", ready: false },
            { displayName: "Bob", ready: false },
            { displayName: "Charlie", ready: false },
          ],
        },
      },
    });
  });

  it("cree une seule session avec six bots quand le dernier des deux amis est pret", async () => {
    let persisted = null as Awaited<
      ReturnType<ReturnType<typeof createMemoryMultiplayerDraftStore>["load"]>
    >;
    const backingStore = createMemoryMultiplayerDraftStore();
    const store = {
      load: async () => backingStore.load(),
      commit: async (command: Parameters<typeof backingStore.commit>[0]) => {
        const result = await backingStore.commit(command);
        if (result.ok) persisted = result.value;
        return result;
      },
    };
    const coordinator = createMultiplayerDraftCoordinator({
      store,
      now: createTestClock().now,
      createId: createSequenceFactory("participant"),
      createResumeToken: (requestId) => `resume-${requestId}`,
      createSessionId: () => "abcdef123456",
      createSeed: () => 42,
      loadSnapshot: () => Promise.resolve(buildMultiplayerSnapshot()),
    });
    const alice = await coordinator.join({
      requestId: "join-alice",
      expectedRevision: 0,
      playerName: "Alice",
      cubeKey: "titou_tribal",
    });
    const bob = await coordinator.join({
      requestId: "join-bob",
      expectedRevision: 1,
      playerName: "Bob",
    });
    if (!alice.ok || !bob.ok) throw new Error("Le Salon de test doit etre rejoint.");
    await coordinator.setReady({
      requestId: "ready-alice",
      expectedRevision: 2,
      resumeToken: alice.value.resumeToken,
      ready: true,
    });

    const lastReadyCommand = {
      requestId: "ready-bob",
      expectedRevision: 3,
      resumeToken: bob.value.resumeToken,
      ready: true,
    } as const;
    const [started, duplicate] = await Promise.all([
      coordinator.setReady(lastReadyCommand),
      coordinator.setReady(lastReadyCommand),
    ]);
    expect(started).toMatchObject({
      ok: true,
      value: {
        revision: 4,
        status: "drafting",
        activeSessionId: "abcdef123456",
        seats: [
          { kind: "human", displayName: "Alice" },
          { kind: "human", displayName: "Bob" },
          { kind: "bot" },
          { kind: "bot" },
          { kind: "bot" },
          { kind: "bot" },
          { kind: "bot" },
          { kind: "bot" },
        ],
      },
    });
    expect(duplicate).toEqual(started);
    expect(persisted?.events.filter((event) => event.type === "DraftStarted")).toHaveLength(1);
    expect(persisted?.session?.draftEvents.some((event) => event.type === "BoostersDealt")).toBe(
      true,
    );
  });
});
