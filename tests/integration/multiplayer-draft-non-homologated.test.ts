import { describe, expect, it } from "vitest";

import { createMultiplayerDraftCoordinator } from "../../src/multiplayer-draft/index.ts";
import {
  buildMultiplayerSnapshot,
  createMemoryMultiplayerDraftStore,
  createSequenceFactory,
  createTestClock,
} from "../helpers/multiplayer-draft-fixtures.ts";

describe("Draft multijoueur non homologue", () => {
  it("conserve les politiques Friend-Bot et ne produit ni record ni trophee", async () => {
    const store = createMemoryMultiplayerDraftStore();
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
    await coordinator.setReady({
      requestId: "ready-bob",
      expectedRevision: 3,
      resumeToken: bob.value.resumeToken,
      ready: true,
    });
    const aliceState = await coordinator.getPlayerState(alice.value.resumeToken);
    const bobState = await coordinator.getPlayerState(bob.value.resumeToken);
    if (!aliceState.ok || !bobState.ok) throw new Error("Etat prive inaccessible.");
    const aliceCard = aliceState.value.currentBooster[0];
    const bobCard = bobState.value.currentBooster[0];
    if (!aliceCard || !bobCard) throw new Error("Booster vide.");
    await coordinator.submitPick({
      requestId: "pick-alice",
      expectedRevision: 4,
      resumeToken: alice.value.resumeToken,
      packNumber: 1,
      pickNumber: 1,
      cardInstanceId: aliceCard.instanceId,
    });
    await coordinator.submitPick({
      requestId: "pick-bob",
      expectedRevision: 5,
      resumeToken: bob.value.resumeToken,
      packNumber: 1,
      pickNumber: 1,
      cardInstanceId: bobCard.instanceId,
    });

    const persisted = await store.load();
    if (!persisted?.session) throw new Error("Session persistée manquante.");
    const picked = persisted.session.draftEvents.filter((event) => event.type === "CardPicked");
    expect(picked).toHaveLength(8);
    expect(
      picked
        .filter(({ seatId }) => seatId >= 2)
        .every(
          (event) => event.source.kind === "policy" && event.source.policyId.startsWith("friend:"),
        ),
    ).toBe(true);
    expect(persisted.events.map(({ type }) => type)).not.toContain("LeaderboardPublished");
    expect(persisted.events.map(({ type }) => type)).not.toContain("TrophyAwarded");
    expect(JSON.stringify(await coordinator.getLobby())).not.toMatch(/homolog|record|troph/i);
  });
});
