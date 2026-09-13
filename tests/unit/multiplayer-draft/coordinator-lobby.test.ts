import { describe, expect, it } from "vitest";

import { createMultiplayerDraftCoordinator } from "../../../src/multiplayer-draft/index.ts";
import {
  createMemoryMultiplayerDraftStore,
  createSequenceFactory,
  createTestClock,
} from "../../helpers/multiplayer-draft-fixtures.ts";

function createCoordinator() {
  return createMultiplayerDraftCoordinator({
    store: createMemoryMultiplayerDraftStore(),
    now: createTestClock().now,
    createId: createSequenceFactory("participant"),
    createResumeToken: createSequenceFactory("resume"),
  });
}

describe("MultiplayerDraftCoordinator Salon", () => {
  it("rejects a different cube from the second participant without changing the Salon", async () => {
    const coordinator = createCoordinator();
    await coordinator.join({
      requestId: "join-alice",
      expectedRevision: 0,
      playerName: "Alice",
      cubeKey: "titou_tribal",
    });

    await expect(
      coordinator.join({
        requestId: "join-bob",
        expectedRevision: 1,
        playerName: "Bob",
        cubeKey: "nico_candyshop",
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "CUBE_LOCKED",
        message: "Le cube est verrouille pour ce Salon de draft.",
        details: { cubeKey: "titou_tribal" },
      },
    });
    await expect(coordinator.getLobby()).resolves.toMatchObject({
      ok: true,
      value: { revision: 1, participants: [{ displayName: "Alice" }] },
    });
  });

  it("lets the first participant change the cube while alone", async () => {
    const coordinator = createCoordinator();
    const joined = await coordinator.join({
      requestId: "join-alice",
      expectedRevision: 0,
      playerName: "Alice",
      cubeKey: "titou_tribal",
    });
    if (!joined.ok) {
      throw new Error(joined.error.message);
    }

    await expect(
      coordinator.changeCube({
        requestId: "change-cube",
        expectedRevision: 1,
        resumeToken: joined.value.resumeToken,
        cubeKey: "nico_candyshop",
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        revision: 2,
        cubeKey: "nico_candyshop",
        cubeLocked: false,
        participants: [{ displayName: "Alice" }],
      },
    });
  });

  it("clears the cube when the last participant leaves and starts a fresh generation", async () => {
    const coordinator = createCoordinator();
    const joined = await coordinator.join({
      requestId: "join-alice",
      expectedRevision: 0,
      playerName: "Alice",
      cubeKey: "titou_tribal",
    });
    if (!joined.ok) {
      throw new Error(joined.error.message);
    }

    await expect(
      coordinator.leave({
        requestId: "leave-alice",
        expectedRevision: 1,
        resumeToken: joined.value.resumeToken,
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        generation: 1,
        revision: 2,
        cubeKey: null,
        cubeLocked: false,
        participants: [],
      },
    });
    await expect(
      coordinator.join({
        requestId: "join-bob",
        expectedRevision: 2,
        playerName: "Bob",
        cubeKey: "nico_candyshop",
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: { state: { generation: 2, cubeKey: "nico_candyshop" } },
    });
  });

  it("refuses a ninth participant without changing the full Salon", async () => {
    const coordinator = createCoordinator();
    for (let index = 0; index < 8; index += 1) {
      const result = await coordinator.join({
        requestId: `join-${String(index)}`,
        expectedRevision: index,
        playerName: `Joueur ${String(index + 1)}`,
        ...(index === 0 ? { cubeKey: "titou_tribal" } : {}),
      });
      expect(result.ok).toBe(true);
    }

    await expect(
      coordinator.join({
        requestId: "join-nine",
        expectedRevision: 8,
        playerName: "Joueur 9",
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "LOBBY_FULL",
        message: "Les huit sieges humains sont deja occupes.",
        details: { capacity: 8 },
      },
    });
    await expect(coordinator.getLobby()).resolves.toMatchObject({
      ok: true,
      value: { revision: 8 },
    });
    const lobby = await coordinator.getLobby();
    expect(lobby.ok && lobby.value.participants).toHaveLength(8);
  });

  it("keeps the cube locked and reuses the free seat when the first participant leaves", async () => {
    const coordinator = createCoordinator();
    const alice = await coordinator.join({
      requestId: "join-alice",
      expectedRevision: 0,
      playerName: "Alice",
      cubeKey: "titou_tribal",
    });
    if (!alice.ok) {
      throw new Error(alice.error.message);
    }
    await coordinator.join({
      requestId: "join-bob",
      expectedRevision: 1,
      playerName: "Bob",
    });

    await expect(
      coordinator.leave({
        requestId: "leave-alice",
        expectedRevision: 2,
        resumeToken: alice.value.resumeToken,
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        revision: 3,
        cubeKey: "titou_tribal",
        cubeLocked: true,
        participants: [{ displayName: "Bob", seatId: 1 }],
      },
    });

    const charlie = await coordinator.join({
      requestId: "join-charlie",
      expectedRevision: 3,
      playerName: "Charlie",
    });
    expect(charlie.ok).toBe(true);
    if (!charlie.ok) throw new Error(charlie.error.message);
    expect(charlie.value.state).toMatchObject({
      cubeKey: "titou_tribal",
      cubeLocked: true,
    });
    expect(charlie.value.state.participants).toHaveLength(2);
    expect(
      charlie.value.state.participants.find(({ displayName }) => displayName === "Bob"),
    ).toMatchObject({ seatId: 1 });
    expect(
      charlie.value.state.participants.find(({ displayName }) => displayName === "Charlie"),
    ).toMatchObject({ seatId: 0 });
  });
});
