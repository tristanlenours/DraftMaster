import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { createMultiplayerDraftCoordinator } from "../../../src/multiplayer-draft/index.ts";
import {
  buildMultiplayerSnapshot,
  createMemoryMultiplayerDraftStore,
  createSequenceFactory,
  createTestClock,
} from "../../helpers/multiplayer-draft-fixtures.ts";

describe("proprietes des choix multijoueurs", () => {
  it("conserve 8 sieges x 45 cartes uniques et les rotations gauche/droite/gauche", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 0x7fffffff }), async (seed) => {
        const store = createMemoryMultiplayerDraftStore();
        const coordinator = createMultiplayerDraftCoordinator({
          store,
          now: createTestClock().now,
          createId: createSequenceFactory(`participant-${String(seed)}`),
          createResumeToken: (requestId) => `resume-${requestId}`,
          createSessionId: () => seed.toString(16).padStart(12, "0"),
          createSeed: () => seed,
          loadSnapshot: () => Promise.resolve(buildMultiplayerSnapshot()),
        });
        const alice = await coordinator.join({
          requestId: `join-alice-${String(seed)}`,
          expectedRevision: 0,
          playerName: "Alice",
          cubeKey: "titou_tribal",
        });
        const bob = await coordinator.join({
          requestId: `join-bob-${String(seed)}`,
          expectedRevision: 1,
          playerName: "Bob",
        });
        if (!alice.ok || !bob.ok) throw new Error("Le Salon de propriete doit etre rejoint.");
        await coordinator.setReady({
          requestId: `ready-alice-${String(seed)}`,
          expectedRevision: 2,
          resumeToken: alice.value.resumeToken,
          ready: true,
        });
        await coordinator.setReady({
          requestId: `ready-bob-${String(seed)}`,
          expectedRevision: 3,
          resumeToken: bob.value.resumeToken,
          ready: true,
        });

        let revision = 4;
        for (let round = 1; round <= 45; round += 1) {
          const aliceState = await coordinator.getPlayerState(alice.value.resumeToken);
          const bobState = await coordinator.getPlayerState(bob.value.resumeToken);
          if (
            !aliceState.ok ||
            !bobState.ok ||
            !aliceState.value.currentBooster[0] ||
            !bobState.value.currentBooster[0]
          ) {
            throw new Error(`Tour de propriete ${String(round)} inaccessible.`);
          }
          const alicePick = await coordinator.submitPick({
            requestId: `pick-alice-${String(seed)}-${String(round)}`,
            expectedRevision: revision,
            resumeToken: alice.value.resumeToken,
            packNumber: aliceState.value.packNumber,
            pickNumber: aliceState.value.pickNumber,
            cardInstanceId: aliceState.value.currentBooster[0].instanceId,
          });
          if (!alicePick.ok) throw new Error(alicePick.error.message);
          revision += 1;
          const bobPick = await coordinator.submitPick({
            requestId: `pick-bob-${String(seed)}-${String(round)}`,
            expectedRevision: revision,
            resumeToken: bob.value.resumeToken,
            packNumber: bobState.value.packNumber,
            pickNumber: bobState.value.pickNumber,
            cardInstanceId: bobState.value.currentBooster[0].instanceId,
          });
          if (!bobPick.ok) throw new Error(bobPick.error.message);
          revision += 1;
        }

        const persisted = await store.load();
        const events = persisted?.session?.draftEvents ?? [];
        const picked = events.filter((event) => event.type === "CardPicked");
        expect(picked).toHaveLength(8 * 45);
        expect(new Set(picked.map(({ cardInstanceId }) => cardInstanceId)).size).toBe(8 * 45);
        for (let seatId = 0; seatId < 8; seatId += 1) {
          expect(picked.filter((event) => event.seatId === seatId)).toHaveLength(45);
        }

        const passed = events.filter((event) => event.type === "BoostersPassed");
        expect(passed).toHaveLength(42);
        for (const event of passed) {
          const expectedDelta = event.packNumber === 2 ? 7 : 1;
          expect(
            event.movements.every(
              ({ fromSeatId, toSeatId }) => (fromSeatId + expectedDelta) % 8 === toSeatId,
            ),
          ).toBe(true);
        }
      }),
      { interruptAfterTimeLimit: 20_000, numRuns: 5 },
    );
  }, 30_000);
});
