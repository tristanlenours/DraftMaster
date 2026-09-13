import { describe, expect, it } from "vitest";

import { createMultiplayerDraftCoordinator } from "../../../src/multiplayer-draft/index.ts";
import {
  buildMultiplayerSnapshot,
  createMemoryMultiplayerDraftStore,
  createSequenceFactory,
  createTestClock,
} from "../../helpers/multiplayer-draft-fixtures.ts";

async function createStartedDraft() {
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
  return { coordinator, store, alice: alice.value, bob: bob.value };
}

describe("MultiplayerDraftCoordinator picks", () => {
  it("garde le booster prive et attend l'autre humain sans chrono apres un choix", async () => {
    const { coordinator, alice, bob } = await createStartedDraft();
    const aliceState = await coordinator.getPlayerState(alice.resumeToken);
    const bobState = await coordinator.getPlayerState(bob.resumeToken);
    if (!aliceState.ok || !bobState.ok)
      throw new Error("Les vues privees doivent etre accessibles.");
    expect(aliceState.value.currentBooster).toHaveLength(15);
    expect(bobState.value.currentBooster).toHaveLength(15);
    expect(aliceState.value.currentBooster).not.toEqual(bobState.value.currentBooster);
    const selectedCard = aliceState.value.currentBooster[0];
    if (!selectedCard) throw new Error("Le booster d'Alice doit contenir une carte.");

    await expect(
      coordinator.submitPick({
        requestId: "pick-alice-1",
        expectedRevision: 4,
        resumeToken: alice.resumeToken,
        packNumber: 1,
        pickNumber: 1,
        cardInstanceId: selectedCard.instanceId,
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        revision: 5,
        pickSubmitted: true,
        waitingFor: ["Bob"],
        pool: [],
      },
    });
    await expect(coordinator.getPlayerState(bob.resumeToken)).resolves.toMatchObject({
      ok: true,
      value: { pickSubmitted: false, waitingFor: ["Bob"] },
    });
  });

  it("soumet les huit decisions ensemble et fait passer les boosters apres le dernier humain", async () => {
    const { coordinator, store, alice, bob } = await createStartedDraft();
    const aliceBefore = await coordinator.getPlayerState(alice.resumeToken);
    const bobBefore = await coordinator.getPlayerState(bob.resumeToken);
    if (!aliceBefore.ok || !bobBefore.ok) throw new Error("Les boosters doivent etre disponibles.");
    const aliceCard = aliceBefore.value.currentBooster[0];
    const bobCard = bobBefore.value.currentBooster[0];
    if (!aliceCard || !bobCard) throw new Error("Chaque booster doit contenir une carte.");
    await coordinator.submitPick({
      requestId: "pick-alice-1",
      expectedRevision: 4,
      resumeToken: alice.resumeToken,
      packNumber: 1,
      pickNumber: 1,
      cardInstanceId: aliceCard.instanceId,
    });

    const round = await coordinator.submitPick({
      requestId: "pick-bob-1",
      expectedRevision: 5,
      resumeToken: bob.resumeToken,
      packNumber: 1,
      pickNumber: 1,
      cardInstanceId: bobCard.instanceId,
    });
    if (!round.ok) throw new Error(JSON.stringify(round.error));
    expect(round).toMatchObject({
      ok: true,
      value: {
        revision: 6,
        packNumber: 1,
        pickNumber: 2,
        pool: [expect.objectContaining({ instanceId: bobCard.instanceId })],
        pickSubmitted: false,
      },
    });
    expect(round.value.currentBooster).toHaveLength(14);
    const aliceAfter = await coordinator.getPlayerState(alice.resumeToken);
    expect(aliceAfter).toMatchObject({
      ok: true,
      value: {
        packNumber: 1,
        pickNumber: 2,
        pool: [expect.objectContaining({ instanceId: aliceCard.instanceId })],
      },
    });
    expect(aliceAfter.ok && aliceAfter.value.currentBooster).toHaveLength(14);

    const persisted = await store.load();
    const firstRoundPicks = persisted?.session?.draftEvents.filter(
      (event) => event.type === "CardPicked" && event.packNumber === 1 && event.pickNumber === 1,
    );
    const botPolicyIds =
      persisted?.session?.seatAssignments.flatMap((seat) =>
        seat.kind === "bot" ? [`friend:${seat.botId}`] : [],
      ) ?? [];
    expect(firstRoundPicks).toHaveLength(8);
    expect(botPolicyIds).toHaveLength(6);
    const serializedPicks = JSON.stringify(firstRoundPicks);
    expect(serializedPicks).toContain('"source":{"kind":"caller"}');
    expect(serializedPicks).toContain(`"policyId":"human:${bob.participantId}"`);
    for (const policyId of botPolicyIds) {
      expect(serializedPicks).toContain(`"policyId":"${policyId}"`);
    }
  });

  it("rend le choix humain immuable pendant l'attente", async () => {
    const { coordinator, alice } = await createStartedDraft();
    const before = await coordinator.getPlayerState(alice.resumeToken);
    if (!before.ok || !before.value.currentBooster[0] || !before.value.currentBooster[1]) {
      throw new Error("Le booster d'Alice doit contenir deux cartes.");
    }
    const confirmedCard = before.value.currentBooster[0].instanceId;
    await coordinator.submitPick({
      requestId: "pick-alice-1",
      expectedRevision: 4,
      resumeToken: alice.resumeToken,
      packNumber: 1,
      pickNumber: 1,
      cardInstanceId: confirmedCard,
    });

    await expect(
      coordinator.submitPick({
        requestId: "pick-alice-modified",
        expectedRevision: 5,
        resumeToken: alice.resumeToken,
        packNumber: 1,
        pickNumber: 1,
        cardInstanceId: before.value.currentBooster[1].instanceId,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "PICK_ALREADY_COMMITTED" },
    });
    await expect(coordinator.getPlayerState(alice.resumeToken)).resolves.toMatchObject({
      ok: true,
      value: { pickSubmitted: true, waitingFor: ["Bob"], pool: [] },
    });
  });
});
