import { describe, expect, it } from "vitest";

import { createMultiplayerDraftCoordinator } from "../../../src/multiplayer-draft/index.ts";
import {
  buildMultiplayerSnapshot,
  createMemoryMultiplayerDraftStore,
  createSequenceFactory,
  createTestClock,
} from "../../helpers/multiplayer-draft-fixtures.ts";

describe("MultiplayerDraftCoordinator reprise et abandon", () => {
  it("reprend le meme siege apres redemarrage puis abandonne sans reutiliser les choix", async () => {
    const store = createMemoryMultiplayerDraftStore();
    const dependencies = {
      store,
      now: createTestClock().now,
      createId: createSequenceFactory("participant"),
      createResumeToken: (requestId: string) => `resume-${requestId}`,
      createSessionId: () => "abcdef123456",
      createSeed: () => 42,
      loadSnapshot: () => Promise.resolve(buildMultiplayerSnapshot()),
    };
    const coordinator = createMultiplayerDraftCoordinator(dependencies);
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
    if (!aliceState.ok || !aliceState.value.currentBooster[0]) {
      throw new Error("Le booster d'Alice doit etre disponible.");
    }
    await coordinator.submitPick({
      requestId: "pick-alice",
      expectedRevision: 4,
      resumeToken: alice.value.resumeToken,
      packNumber: 1,
      pickNumber: 1,
      cardInstanceId: aliceState.value.currentBooster[0].instanceId,
    });

    const restarted = createMultiplayerDraftCoordinator(dependencies);
    await expect(restarted.getPlayerState(alice.value.resumeToken)).resolves.toMatchObject({
      ok: true,
      value: { participantId: alice.value.participantId, seatId: 0, pickSubmitted: true },
    });
    await expect(restarted.getPlayerState("resume-invalide")).resolves.toMatchObject({
      ok: false,
      error: { code: "INVALID_RESUME_TOKEN" },
    });

    await expect(
      restarted.abandon({
        requestId: "abandon-session",
        expectedRevision: 5,
        resumeToken: alice.value.resumeToken,
        confirmed: true,
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: { status: "open", participants: [], activeSessionId: null, revision: 6 },
    });
    await expect(
      restarted.submitPick({
        requestId: "pick-after-abandon",
        expectedRevision: 6,
        resumeToken: bob.value.resumeToken,
        packNumber: 1,
        pickNumber: 1,
        cardInstanceId: aliceState.value.currentBooster[0].instanceId,
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: "SESSION_ABANDONED" } });
    await expect(
      restarted.join({
        requestId: "join-charlie",
        expectedRevision: 6,
        playerName: "Charlie",
        cubeKey: "titou_tribal",
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: { state: { generation: 2, participants: [{ displayName: "Charlie" }] } },
    });
  });
});
