import { describe, expect, it } from "vitest";

import { buildDraftReport, replayDraft } from "../../src/draft/index.ts";
import { createMultiplayerDraftCoordinator } from "../../src/multiplayer-draft/index.ts";
import {
  buildMultiplayerSnapshot,
  createMemoryMultiplayerDraftStore,
  createSequenceFactory,
  createTestClock,
} from "../helpers/multiplayer-draft-fixtures.ts";

describe("Draft multijoueur complet", () => {
  it("termine 45 Tours synchronises avec huit pools distincts de 45 cartes", async () => {
    const backingStore = createMemoryMultiplayerDraftStore();
    const coordinator = createMultiplayerDraftCoordinator({
      store: backingStore,
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
    await coordinator.setReady({
      requestId: "ready-bob",
      expectedRevision: 3,
      resumeToken: bob.value.resumeToken,
      ready: true,
    });

    let revision = 4;
    for (let round = 1; round <= 45; round += 1) {
      const aliceState = await coordinator.getPlayerState(alice.value.resumeToken);
      const bobState = await coordinator.getPlayerState(bob.value.resumeToken);
      if (!aliceState.ok || !bobState.ok) throw new Error(`Tour ${String(round)} inaccessible.`);
      const aliceCard = aliceState.value.currentBooster[0];
      const bobCard = bobState.value.currentBooster[0];
      if (!aliceCard || !bobCard) throw new Error(`Tour ${String(round)} sans carte.`);
      await coordinator.submitPick({
        requestId: `pick-alice-${String(round)}`,
        expectedRevision: revision,
        resumeToken: alice.value.resumeToken,
        packNumber: aliceState.value.packNumber,
        pickNumber: aliceState.value.pickNumber,
        cardInstanceId: aliceCard.instanceId,
      });
      revision += 1;
      const completedRound = await coordinator.submitPick({
        requestId: `pick-bob-${String(round)}`,
        expectedRevision: revision,
        resumeToken: bob.value.resumeToken,
        packNumber: bobState.value.packNumber,
        pickNumber: bobState.value.pickNumber,
        cardInstanceId: bobCard.instanceId,
      });
      if (!completedRound.ok) throw new Error(JSON.stringify(completedRound.error));
      revision += 1;
    }

    const finalAlice = await coordinator.getPlayerState(alice.value.resumeToken);
    expect(finalAlice.ok).toBe(true);
    if (!finalAlice.ok) throw new Error(finalAlice.error.message);
    expect(finalAlice.value.status).toBe("deckbuilding");
    expect(finalAlice.value.pool).toHaveLength(45);
    const persistedFinal = await backingStore.load();
    if (!persistedFinal?.session) throw new Error("La Session finale doit etre persistee.");
    const replayed = replayDraft(persistedFinal.session.draftEvents);
    if (!replayed.ok) throw new Error(replayed.error.message);
    const report = buildDraftReport(replayed.value);
    if (!report.ok) throw new Error(report.error.message);
    expect(report.value.finalPools).toHaveLength(8);
    expect(report.value.finalPools.every((pool) => pool.cardInstanceIds.length === 45)).toBe(true);
    expect(new Set(report.value.finalPools.flatMap((pool) => pool.cardInstanceIds)).size).toBe(360);

    await expect(coordinator.getLobby()).resolves.toMatchObject({
      ok: true,
      value: { status: "open", participants: [], activeSessionId: null },
    });
    await expect(
      coordinator.join({
        requestId: "join-charlie",
        expectedRevision: revision,
        playerName: "Charlie",
        cubeKey: "titou_tribal",
      }),
    ).resolves.toMatchObject({ ok: true, value: { state: { generation: 2 } } });
    const aliceDeckbuilding = await coordinator.getPlayerState(alice.value.resumeToken);
    expect(aliceDeckbuilding.ok && aliceDeckbuilding.value.pool).toHaveLength(45);
  });
});
