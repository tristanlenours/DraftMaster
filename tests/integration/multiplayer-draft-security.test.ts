import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  createFinalDeckCoach,
  createMultiplayerDraftCoordinator,
  type FinalDeckCoachRequest,
} from "../../src/multiplayer-draft/index.ts";
import {
  buildMultiplayerSnapshot,
  createMemoryMultiplayerDraftStore,
  createSequenceFactory,
  createTestClock,
} from "../helpers/multiplayer-draft-fixtures.ts";

describe("Draft multijoueur confidentialite", () => {
  it("ne transmet au Coach que le pool du demandeur et ne persiste jamais les tokens bruts", async () => {
    const store = createMemoryMultiplayerDraftStore();
    const capturedRequests: FinalDeckCoachRequest[] = [];
    const fallbackCoach = createFinalDeckCoach();
    const coordinator = createMultiplayerDraftCoordinator({
      store,
      now: createTestClock().now,
      createId: createSequenceFactory("participant"),
      createResumeToken: (requestId) => `private-${requestId}`,
      createSessionId: () => "abcdef123456",
      createSeed: () => 42,
      loadSnapshot: () => Promise.resolve(buildMultiplayerSnapshot()),
      finalDeckCoach: {
        recommend: async (request) => {
          capturedRequests.push(request);
          return fallbackCoach.recommend(request);
        },
      },
    });
    const alice = await coordinator.join({
      requestId: "join-alice",
      expectedRevision: 0,
      playerName: "Alice Secret",
      cubeKey: "titou_tribal",
    });
    const bob = await coordinator.join({
      requestId: "join-bob",
      expectedRevision: 1,
      playerName: "Bob Secret",
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
      if (!aliceState.ok || !bobState.ok) throw new Error("Etat prive inaccessible.");
      const aliceCard = aliceState.value.currentBooster[0];
      const bobCard = bobState.value.currentBooster[0];
      if (!aliceCard || !bobCard) throw new Error("Booster vide.");
      await coordinator.submitPick({
        requestId: `pick-alice-${String(round)}`,
        expectedRevision: revision++,
        resumeToken: alice.value.resumeToken,
        packNumber: aliceState.value.packNumber,
        pickNumber: aliceState.value.pickNumber,
        cardInstanceId: aliceCard.instanceId,
      });
      await coordinator.submitPick({
        requestId: `pick-bob-${String(round)}`,
        expectedRevision: revision++,
        resumeToken: bob.value.resumeToken,
        packNumber: bobState.value.packNumber,
        pickNumber: bobState.value.pickNumber,
        cardInstanceId: bobCard.instanceId,
      });
    }

    const aliceFinal = await coordinator.getPlayerState(alice.value.resumeToken);
    const bobFinal = await coordinator.getPlayerState(bob.value.resumeToken);
    if (!aliceFinal.ok || !bobFinal.ok) throw new Error("Pools finaux inaccessibles.");
    const recommendation = await coordinator.recommendDeck({
      requestId: "recommend-alice",
      expectedRevision: revision,
      resumeToken: alice.value.resumeToken,
    });
    expect(recommendation.ok).toBe(true);
    expect(capturedRequests).toHaveLength(1);

    const coachPayload = JSON.stringify(capturedRequests[0]);
    expect(coachPayload).not.toContain("Alice Secret");
    expect(coachPayload).not.toContain("Bob Secret");
    expect(coachPayload).not.toContain(alice.value.resumeToken);
    expect(coachPayload).not.toContain(bob.value.resumeToken);
    expect(coachPayload).not.toContain("abcdef123456");
    for (const card of bobFinal.value.pool) {
      expect(coachPayload).not.toContain(card.instanceId);
    }
    for (const card of aliceFinal.value.pool) {
      expect(coachPayload).toContain(card.instanceId);
    }

    const persisted = await store.load();
    const persistedText = JSON.stringify(persisted);
    expect(persistedText).not.toContain(alice.value.resumeToken);
    expect(persistedText).not.toContain(bob.value.resumeToken);
    expect(persistedText).toContain(
      createHash("sha256").update(alice.value.resumeToken, "utf8").digest("hex"),
    );
    await expect(coordinator.getPlayerState("Alice Secret")).resolves.toMatchObject({
      ok: false,
      error: { code: "INVALID_RESUME_TOKEN", details: {} },
    });
  });
});
