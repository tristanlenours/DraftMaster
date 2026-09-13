import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  createLocalFileMultiplayerDraftStore,
  createMultiplayerDraftCoordinator,
  type MultiplayerDraftCoordinatorDependencies,
} from "../../src/multiplayer-draft/index.ts";
import {
  buildMultiplayerSnapshot,
  createSequenceFactory,
  createTestClock,
} from "../helpers/multiplayer-draft-fixtures.ts";

async function withRestartableCoordinator(
  run: (harness: {
    readonly restart: () => ReturnType<typeof createMultiplayerDraftCoordinator>;
    readonly clock: ReturnType<typeof createTestClock>;
    readonly store: ReturnType<typeof createLocalFileMultiplayerDraftStore>;
  }) => Promise<void>,
): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "draftmaster-multiplayer-restart-"));
  const store = createLocalFileMultiplayerDraftStore({ filePath: join(directory, "state.json") });
  const clock = createTestClock();
  const dependencies: MultiplayerDraftCoordinatorDependencies = {
    store,
    now: clock.now,
    createId: createSequenceFactory("participant"),
    createResumeToken: (requestId) => `resume-${requestId}`,
    createSessionId: () => "abcdef123456",
    createSeed: () => 42,
    loadSnapshot: () => Promise.resolve(buildMultiplayerSnapshot()),
  };

  try {
    await run({
      restart: () => createMultiplayerDraftCoordinator(dependencies),
      clock,
      store,
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

describe("redemarrage du Draft multijoueur", () => {
  it("reconstruit exactement le Salon, le Tour, les choix, les pools et le deckbuilding", async () => {
    await withRestartableCoordinator(async ({ restart, store }) => {
      let coordinator = restart();
      const alice = await coordinator.join({
        requestId: "join-alice",
        expectedRevision: 0,
        playerName: "Alice",
        cubeKey: "titou_tribal",
      });
      if (!alice.ok) throw new Error(alice.error.message);

      coordinator = restart();
      await expect(coordinator.getLobby()).resolves.toMatchObject({
        ok: true,
        value: {
          revision: 1,
          participants: [{ participantId: alice.value.participantId, seatId: 0 }],
        },
      });
      const bob = await coordinator.join({
        requestId: "join-bob",
        expectedRevision: 1,
        playerName: "Bob",
      });
      if (!bob.ok) throw new Error(bob.error.message);

      coordinator = restart();
      await coordinator.setReady({
        requestId: "ready-alice",
        expectedRevision: 2,
        resumeToken: alice.value.resumeToken,
        ready: true,
      });
      coordinator = restart();
      await expect(coordinator.getLobby()).resolves.toMatchObject({
        ok: true,
        value: {
          status: "open",
          participants: [
            { displayName: "Alice", ready: true },
            { displayName: "Bob", ready: false },
          ],
        },
      });
      const started = await coordinator.setReady({
        requestId: "ready-bob",
        expectedRevision: 3,
        resumeToken: bob.value.resumeToken,
        ready: true,
      });
      if (!started.ok) throw new Error(started.error.message);
      expect(started.value.seats).toHaveLength(8);

      const beforeRestart = await coordinator.getPlayerState(alice.value.resumeToken);
      if (!beforeRestart.ok) throw new Error(beforeRestart.error.message);
      const initialBooster = beforeRestart.value.currentBooster.map(({ instanceId }) => instanceId);

      coordinator = restart();
      const afterDraftRestart = await coordinator.getPlayerState(alice.value.resumeToken);
      expect(afterDraftRestart).toMatchObject({
        ok: true,
        value: { packNumber: 1, pickNumber: 1, seatId: 0, pickSubmitted: false },
      });
      if (!afterDraftRestart.ok || !afterDraftRestart.value.currentBooster[0]) {
        throw new Error("Le booster initial doit etre reconstruit.");
      }
      expect(afterDraftRestart.value.currentBooster.map(({ instanceId }) => instanceId)).toEqual(
        initialBooster,
      );
      const aliceFirstCard = afterDraftRestart.value.currentBooster[0].instanceId;
      const alicePick = await coordinator.submitPick({
        requestId: "pick-alice-1",
        expectedRevision: 4,
        resumeToken: alice.value.resumeToken,
        packNumber: 1,
        pickNumber: 1,
        cardInstanceId: aliceFirstCard,
      });
      if (!alicePick.ok) throw new Error(alicePick.error.message);

      coordinator = restart();
      await expect(coordinator.getPlayerState(alice.value.resumeToken)).resolves.toMatchObject({
        ok: true,
        value: { pickSubmitted: true, pool: [], waitingFor: ["Bob"] },
      });
      const bobFirstState = await coordinator.getPlayerState(bob.value.resumeToken);
      if (!bobFirstState.ok || !bobFirstState.value.currentBooster[0]) {
        throw new Error("Le booster de Bob doit etre reconstruit.");
      }
      const bobFirstPick = await coordinator.submitPick({
        requestId: "pick-bob-1",
        expectedRevision: 5,
        resumeToken: bob.value.resumeToken,
        packNumber: 1,
        pickNumber: 1,
        cardInstanceId: bobFirstState.value.currentBooster[0].instanceId,
      });
      if (!bobFirstPick.ok) throw new Error(bobFirstPick.error.message);

      coordinator = restart();
      const afterRoundRestart = await coordinator.getPlayerState(alice.value.resumeToken);
      expect(afterRoundRestart).toMatchObject({
        ok: true,
        value: {
          packNumber: 1,
          pickNumber: 2,
          pickSubmitted: false,
          pool: [{ instanceId: aliceFirstCard }],
        },
      });

      let revision = 6;
      for (let round = 2; round <= 45; round += 1) {
        const aliceState = await coordinator.getPlayerState(alice.value.resumeToken);
        const bobState = await coordinator.getPlayerState(bob.value.resumeToken);
        if (
          !aliceState.ok ||
          !bobState.ok ||
          !aliceState.value.currentBooster[0] ||
          !bobState.value.currentBooster[0]
        ) {
          throw new Error(`Tour ${String(round)} inaccessible apres redemarrage.`);
        }
        const aliceResult = await coordinator.submitPick({
          requestId: `pick-alice-${String(round)}`,
          expectedRevision: revision,
          resumeToken: alice.value.resumeToken,
          packNumber: aliceState.value.packNumber,
          pickNumber: aliceState.value.pickNumber,
          cardInstanceId: aliceState.value.currentBooster[0].instanceId,
        });
        if (!aliceResult.ok) throw new Error(aliceResult.error.message);
        revision += 1;
        const bobResult = await coordinator.submitPick({
          requestId: `pick-bob-${String(round)}`,
          expectedRevision: revision,
          resumeToken: bob.value.resumeToken,
          packNumber: bobState.value.packNumber,
          pickNumber: bobState.value.pickNumber,
          cardInstanceId: bobState.value.currentBooster[0].instanceId,
        });
        if (!bobResult.ok) throw new Error(bobResult.error.message);
        revision += 1;
      }

      const completedAlice = await coordinator.getPlayerState(alice.value.resumeToken);
      if (!completedAlice.ok) throw new Error(completedAlice.error.message);
      const completedPool = completedAlice.value.pool.map(({ instanceId }) => instanceId);
      expect(completedAlice.value.status).toBe("deckbuilding");
      expect(completedPool).toHaveLength(45);

      coordinator = restart();
      const restoredDeckbuilding = await coordinator.getPlayerState(alice.value.resumeToken);
      expect(restoredDeckbuilding).toMatchObject({
        ok: true,
        value: { status: "deckbuilding", seatId: 0 },
      });
      if (!restoredDeckbuilding.ok) throw new Error(restoredDeckbuilding.error.message);
      expect(restoredDeckbuilding.value.pool.map(({ instanceId }) => instanceId)).toEqual(
        completedPool,
      );
      await expect(coordinator.getLobby()).resolves.toMatchObject({
        ok: true,
        value: { status: "open", participants: [], activeSessionId: null },
      });

      const persisted = await store.load();
      expect(persisted?.sessions?.abcdef123456?.seatAssignments).toHaveLength(8);
    });
  }, 15_000);

  it("reprend normalement apres 24 heures sans choix automatique", async () => {
    await withRestartableCoordinator(async ({ restart, clock }) => {
      let coordinator = restart();
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
      if (!alice.ok || !bob.ok) throw new Error("Les deux amis doivent rejoindre le Salon.");
      await coordinator.setReady({
        requestId: "ready-alice",
        expectedRevision: 2,
        resumeToken: alice.value.resumeToken,
        ready: true,
      });
      await coordinator.setReady({
        requestId: "ready-bob",
        expectedRevision: 3,
        resumeToken: bob.value.resumeToken,
        ready: true,
      });
      const aliceState = await coordinator.getPlayerState(alice.value.resumeToken);
      const bobState = await coordinator.getPlayerState(bob.value.resumeToken);
      if (
        !aliceState.ok ||
        !bobState.ok ||
        !aliceState.value.currentBooster[0] ||
        !bobState.value.currentBooster[0]
      ) {
        throw new Error("Les boosters initiaux doivent etre disponibles.");
      }
      const aliceCard = aliceState.value.currentBooster[0].instanceId;
      const bobCard = bobState.value.currentBooster[0].instanceId;
      await coordinator.submitPick({
        requestId: "pick-alice",
        expectedRevision: 4,
        resumeToken: alice.value.resumeToken,
        packNumber: 1,
        pickNumber: 1,
        cardInstanceId: aliceCard,
      });

      clock.advanceBy(24 * 60 * 60 * 1_000);
      coordinator = restart();
      await expect(coordinator.getPlayerState(alice.value.resumeToken)).resolves.toMatchObject({
        ok: true,
        value: { pickSubmitted: true, pool: [], waitingFor: ["Bob"] },
      });
      await expect(coordinator.getPlayerState(bob.value.resumeToken)).resolves.toMatchObject({
        ok: true,
        value: { pickSubmitted: false, pool: [], waitingFor: ["Bob"] },
      });

      const resumed = await coordinator.submitPick({
        requestId: "pick-bob-after-24h",
        expectedRevision: 5,
        resumeToken: bob.value.resumeToken,
        packNumber: 1,
        pickNumber: 1,
        cardInstanceId: bobCard,
      });
      if (!resumed.ok) throw new Error(resumed.error.message);
      const nextAliceState = await coordinator.getPlayerState(alice.value.resumeToken);
      expect(nextAliceState).toMatchObject({
        ok: true,
        value: {
          packNumber: 1,
          pickNumber: 2,
          pickSubmitted: false,
          pool: [{ instanceId: aliceCard }],
        },
      });
    });
  });
});
