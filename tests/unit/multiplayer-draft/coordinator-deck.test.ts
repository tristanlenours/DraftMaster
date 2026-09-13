import { describe, expect, it } from "vitest";

import { createMultiplayerDraftCoordinator } from "../../../src/multiplayer-draft/index.ts";
import {
  buildMultiplayerSnapshot,
  createMemoryMultiplayerDraftStore,
  createSequenceFactory,
  createTestClock,
} from "../../helpers/multiplayer-draft-fixtures.ts";

describe("MultiplayerDraftCoordinator deckbuilding", () => {
  it("recommande, modifie et finalise chaque deck independamment avant l'export MTGA", async () => {
    const coordinator = createMultiplayerDraftCoordinator({
      store: createMemoryMultiplayerDraftStore(),
      now: createTestClock().now,
      createId: createSequenceFactory("participant"),
      createResumeToken: (requestId) => `resume-${requestId}`,
      createSessionId: () => "abcdef123456",
      createSeed: () => 42,
      loadSnapshot: () => Promise.resolve(buildMultiplayerSnapshot()),
      loadCardPool: (_cubeKey, cards) =>
        Promise.resolve(
          cards.map((card, index) => ({
            id: card.instanceId,
            name: card.name,
            colors: index < 30 ? (["R"] as const) : (["G"] as const),
            staticScore: 50 - index / 10,
            cmc: index < 30 ? (index % 3 === 0 ? 2 : 1) : 4,
            manaCost: index < 30 ? "{R}" : "{3}{G}",
            typeLine: "Creature",
            isLand: false,
          })),
        ),
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

    const aliceRecommendation = await coordinator.recommendDeck({
      requestId: "recommend-alice",
      expectedRevision: revision++,
      resumeToken: alice.value.resumeToken,
    });
    if (!aliceRecommendation.ok) throw new Error(aliceRecommendation.error.message);
    expect(aliceRecommendation.value.recommendation.source).toBe("fallback");
    expect(aliceRecommendation.value.maindeckCardInstanceIds.length).toBeGreaterThan(0);
    expect(
      aliceRecommendation.value.maindeckCardInstanceIds.length +
        aliceRecommendation.value.basicLands.Plains +
        aliceRecommendation.value.basicLands.Island +
        aliceRecommendation.value.basicLands.Swamp +
        aliceRecommendation.value.basicLands.Mountain +
        aliceRecommendation.value.basicLands.Forest,
    ).toBe(40);

    const bobBefore = await coordinator.getPlayerState(bob.value.resumeToken);
    expect(bobBefore.ok && bobBefore.value.deckWorkspace).toBeUndefined();

    await expect(
      coordinator.finalizeDeck({
        requestId: "invalid-bob",
        expectedRevision: revision,
        resumeToken: bob.value.resumeToken,
        maindeckCardInstanceIds: ["invented"],
        basicLands: { Plains: 0, Island: 0, Swamp: 0, Mountain: 39, Forest: 0 },
        finalize: true,
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: "INVALID_DECK" } });

    const finalized = await coordinator.finalizeDeck({
      requestId: "finalize-alice",
      expectedRevision: revision++,
      resumeToken: alice.value.resumeToken,
      maindeckCardInstanceIds: aliceRecommendation.value.maindeckCardInstanceIds,
      basicLands: aliceRecommendation.value.basicLands,
      finalize: true,
    });
    expect(finalized).toMatchObject({ ok: true, value: { status: "finalized" } });

    const exported = await coordinator.getDeckExport(alice.value.resumeToken);
    expect(exported).toMatchObject({
      ok: true,
      value: { compatible: true, deckCount: 40, sideboardCount: 21 },
    });
    expect(exported.ok && exported.value.text).toContain("Deck\n");
    expect(exported.ok && exported.value.text).toContain("\n\nSideboard\n");
  });
});
