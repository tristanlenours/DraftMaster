import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import { afterEach, describe, expect, it } from "vitest";

import { createRequestHandler } from "../../scripts/serve-web.mjs";
import {
  createMultiplayerDraftCoordinator,
  createMultiplayerDraftHttpHandler,
} from "../../src/multiplayer-draft/index.ts";
import {
  buildMultiplayerSnapshot,
  createMemoryMultiplayerDraftStore,
  createSequenceFactory,
  createTestClock,
} from "../helpers/multiplayer-draft-fixtures.ts";

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error === undefined) resolve();
            else reject(error);
          });
        }),
    ),
  );
});

async function startHttpServer() {
  const coordinator = createMultiplayerDraftCoordinator({
    store: createMemoryMultiplayerDraftStore(),
    now: createTestClock().now,
    createId: createSequenceFactory("participant"),
    createResumeToken: (requestId) => `private-${requestId}`,
    createSessionId: () => "abcdef123456",
    createSeed: () => 42,
    loadSnapshot: () => Promise.resolve(buildMultiplayerSnapshot()),
  });
  const multiplayerHandler = createMultiplayerDraftHttpHandler({ coordinator });
  const server = createServer((request, response) => {
    void multiplayerHandler(request, response).then((handled) => {
      if (!handled) response.writeHead(404).end();
    });
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as AddressInfo;
  return { baseUrl: `http://127.0.0.1:${String(address.port)}`, coordinator };
}

describe("Draft multijoueur HTTP", () => {
  it("expose le Salon public vide avec GET /api/multiplayer/lobby", async () => {
    const { baseUrl } = await startHttpServer();

    const response = await fetch(`${baseUrl}/api/multiplayer/lobby`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      state: {
        lobbyId: "global",
        generation: 0,
        revision: 0,
        status: "open",
        cubeKey: null,
        cubeLocked: false,
        activeSessionId: null,
        participants: [],
        seats: [null, null, null, null, null, null, null, null],
      },
    });
  });

  it("monte l'API multijoueur dans le serveur web principal", async () => {
    const coordinator = createMultiplayerDraftCoordinator({
      store: createMemoryMultiplayerDraftStore(),
      now: createTestClock().now,
      createId: createSequenceFactory("participant"),
      createResumeToken: (requestId) => `private-${requestId}`,
    });
    const server = createServer(createRequestHandler({ multiplayerCoordinator: coordinator }));
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${String(address.port)}/api/multiplayer/lobby`);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, state: { lobbyId: "global" } });
  });

  it("rend l'Acces de reprise seulement a l'appelant de POST /lobby/join", async () => {
    const { baseUrl } = await startHttpServer();

    const joinResponse = await fetch(`${baseUrl}/api/multiplayer/lobby/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "join-alice",
      },
      body: JSON.stringify({
        playerName: "Alice",
        cubeKey: "titou_tribal",
        expectedRevision: 0,
      }),
    });

    expect(joinResponse.status).toBe(200);
    expect(await joinResponse.json()).toMatchObject({
      ok: true,
      participantId: "participant-001",
      resumeToken: "private-join-alice",
      state: {
        revision: 1,
        participants: [{ displayName: "Alice", seatId: 0 }],
      },
    });

    const publicResponse = await fetch(`${baseUrl}/api/multiplayer/lobby`);
    const publicBody = await publicResponse.text();
    expect(publicResponse.status).toBe(200);
    expect(publicBody).not.toContain("private-join-alice");
    expect(publicBody).not.toContain("resumeToken");
    expect(publicBody).not.toContain("resumeTokenHash");
  });

  it("autorise le premier ami authentifie a changer le cube jusqu'a l'arrivee du second", async () => {
    const { baseUrl } = await startHttpServer();
    const aliceJoin = await fetch(`${baseUrl}/api/multiplayer/lobby/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": "join-alice" },
      body: JSON.stringify({
        playerName: "Alice",
        cubeKey: "titou_tribal",
        expectedRevision: 0,
      }),
    });
    const alice = (await aliceJoin.json()) as { resumeToken: string };

    const changeResponse = await fetch(`${baseUrl}/api/multiplayer/lobby/cube`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${alice.resumeToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": "change-cube",
      },
      body: JSON.stringify({ cubeKey: "nico_candyshop", expectedRevision: 1 }),
    });

    expect(changeResponse.status).toBe(200);
    expect(await changeResponse.json()).toMatchObject({
      ok: true,
      state: { revision: 2, cubeKey: "nico_candyshop", cubeLocked: false },
    });

    await fetch(`${baseUrl}/api/multiplayer/lobby/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": "join-bob" },
      body: JSON.stringify({ playerName: "Bob", expectedRevision: 2 }),
    });
    const lockedResponse = await fetch(`${baseUrl}/api/multiplayer/lobby/cube`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${alice.resumeToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": "change-cube-locked",
      },
      body: JSON.stringify({ cubeKey: "hugues_pauper", expectedRevision: 3 }),
    });

    expect(lockedResponse.status).toBe(409);
    expect(await lockedResponse.json()).toMatchObject({
      ok: false,
      error: { code: "CUBE_LOCKED" },
    });
  });

  it("demarre le draft avec POST /ready quand les deux amis ont confirme", async () => {
    const { baseUrl } = await startHttpServer();
    const join = async (name: string, revision: number) => {
      const response = await fetch(`${baseUrl}/api/multiplayer/lobby/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": `join-${name}` },
        body: JSON.stringify({
          playerName: name,
          expectedRevision: revision,
          ...(revision === 0 ? { cubeKey: "titou_tribal" } : {}),
        }),
      });
      return (await response.json()) as { resumeToken: string };
    };
    const alice = await join("Alice", 0);
    const bob = await join("Bob", 1);
    const ready = async (token: string, requestId: string, revision: number) =>
      fetch(`${baseUrl}/api/multiplayer/ready`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Idempotency-Key": requestId,
        },
        body: JSON.stringify({ ready: true, expectedRevision: revision }),
      });

    const aliceReady = await ready(alice.resumeToken, "ready-alice", 2);
    expect(aliceReady.status).toBe(200);
    const aliceReadyBody = (await aliceReady.json()) as {
      readonly ok: boolean;
      readonly state: {
        readonly revision: number;
        readonly participants: readonly { readonly displayName: string; readonly ready: boolean }[];
      };
    };
    expect(aliceReadyBody).toMatchObject({ ok: true, state: { revision: 3 } });
    expect(aliceReadyBody.state.participants).toContainEqual(
      expect.objectContaining({ displayName: "Alice", ready: true }),
    );

    const bobReady = await ready(bob.resumeToken, "ready-bob", 3);
    expect(bobReady.status).toBe(200);
    expect(await bobReady.json()).toMatchObject({
      ok: true,
      state: { revision: 4, status: "drafting", activeSessionId: "abcdef123456" },
    });

    const readState = (token: string) =>
      fetch(`${baseUrl}/api/multiplayer/state`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    const [aliceStateResponse, bobStateResponse] = await Promise.all([
      readState(alice.resumeToken),
      readState(bob.resumeToken),
    ]);
    expect(aliceStateResponse.status).toBe(200);
    const aliceState = (await aliceStateResponse.json()) as {
      ok: true;
      state: { currentBooster: { instanceId: string }[] };
    };
    const bobStateText = await bobStateResponse.text();
    const bobState = JSON.parse(bobStateText) as {
      state: { currentBooster: { instanceId: string }[] };
    };
    expect(aliceState.state.currentBooster).toHaveLength(15);
    expect(JSON.stringify(aliceState)).not.toContain(bobState.state.currentBooster[0]?.instanceId);

    const pickCommand = {
      cardInstanceId: aliceState.state.currentBooster[0]?.instanceId,
      expectedRevision: 4,
      packNumber: 1,
      pickNumber: 1,
    };
    const pick = () =>
      fetch(`${baseUrl}/api/multiplayer/pick`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${alice.resumeToken}`,
          "Content-Type": "application/json",
          "Idempotency-Key": "pick-alice-1",
        },
        body: JSON.stringify(pickCommand),
      });
    const firstPick = await pick();
    expect(firstPick.status).toBe(200);
    const firstPickBody: unknown = await firstPick.json();
    expect(firstPickBody).toMatchObject({
      ok: true,
      state: { revision: 5, pickSubmitted: true, waitingFor: ["Bob"] },
    });
    const retriedPick = await pick();
    expect(retriedPick.status).toBe(200);
    expect(await retriedPick.json()).toEqual(firstPickBody);

    const conflictingRetry = await fetch(`${baseUrl}/api/multiplayer/pick`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${alice.resumeToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": "pick-alice-1",
      },
      body: JSON.stringify({
        ...pickCommand,
        cardInstanceId: aliceState.state.currentBooster[1]?.instanceId,
      }),
    });
    expect(conflictingRetry.status).toBe(409);
    expect(await conflictingRetry.json()).toMatchObject({
      ok: false,
      error: { code: "IDEMPOTENCY_CONFLICT" },
    });

    const staleSecondTab = await fetch(`${baseUrl}/api/multiplayer/pick`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${alice.resumeToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": "pick-alice-second-tab",
      },
      body: JSON.stringify(pickCommand),
    });
    expect(staleSecondTab.status).toBe(409);
    expect(await staleSecondTab.json()).toMatchObject({
      ok: false,
      error: { code: "REVISION_CONFLICT", details: { currentRevision: 5 } },
    });

    const invalidTokenState = await fetch(`${baseUrl}/api/multiplayer/state`, {
      headers: { Authorization: "Bearer private-invalide" },
    });
    expect(invalidTokenState.status).toBe(401);
    expect(await invalidTokenState.json()).toMatchObject({
      ok: false,
      error: { code: "INVALID_RESUME_TOKEN" },
    });

    const abandon = await fetch(`${baseUrl}/api/multiplayer/abandon`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bob.resumeToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": "abandon-session",
      },
      body: JSON.stringify({ expectedRevision: 5, confirmed: true }),
    });
    expect(abandon.status).toBe(200);
    expect(await abandon.json()).toMatchObject({
      ok: true,
      state: { revision: 6, status: "open", participants: [] },
    });
  });

  it("tranche atomiquement le conflit entre un depart et le dernier accord Pret", async () => {
    const { baseUrl } = await startHttpServer();
    const join = async (name: string, revision: number) => {
      const response = await fetch(`${baseUrl}/api/multiplayer/lobby/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": `join-${name}` },
        body: JSON.stringify({
          playerName: name,
          expectedRevision: revision,
          ...(revision === 0 ? { cubeKey: "titou_tribal" } : {}),
        }),
      });
      return (await response.json()) as { resumeToken: string };
    };
    const alice = await join("Alice", 0);
    const bob = await join("Bob", 1);
    const aliceReady = await fetch(`${baseUrl}/api/multiplayer/ready`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${alice.resumeToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": "ready-alice",
      },
      body: JSON.stringify({ ready: true, expectedRevision: 2 }),
    });
    expect(aliceReady.status).toBe(200);

    const [lastReady, departure] = await Promise.all([
      fetch(`${baseUrl}/api/multiplayer/ready`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${bob.resumeToken}`,
          "Content-Type": "application/json",
          "Idempotency-Key": "ready-bob",
        },
        body: JSON.stringify({ ready: true, expectedRevision: 3 }),
      }),
      fetch(`${baseUrl}/api/multiplayer/lobby/leave`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${alice.resumeToken}`,
          "Content-Type": "application/json",
          "Idempotency-Key": "leave-alice",
        },
        body: JSON.stringify({ expectedRevision: 3 }),
      }),
    ]);

    expect([lastReady.status, departure.status].sort()).toEqual([200, 409]);
    const finalLobbyResponse = await fetch(`${baseUrl}/api/multiplayer/lobby`);
    const finalLobby = (await finalLobbyResponse.json()) as {
      readonly state: {
        readonly status: "open" | "drafting";
        readonly participants: readonly { readonly displayName: string; readonly ready: boolean }[];
      };
    };
    if (lastReady.status === 200) {
      expect(finalLobby.state).toMatchObject({
        status: "drafting",
        participants: [
          { displayName: "Alice", ready: true },
          { displayName: "Bob", ready: true },
        ],
      });
    } else {
      expect(finalLobby.state).toMatchObject({
        status: "open",
        participants: [{ displayName: "Bob", ready: false }],
      });
    }
  });

  it("rejoue un depart identique sans nouvelle mutation et annule les accords Pret", async () => {
    const { baseUrl } = await startHttpServer();
    const join = async (name: string, revision: number) => {
      const response = await fetch(`${baseUrl}/api/multiplayer/lobby/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": `join-${name}` },
        body: JSON.stringify({
          playerName: name,
          expectedRevision: revision,
          ...(revision === 0 ? { cubeKey: "titou_tribal" } : {}),
        }),
      });
      return (await response.json()) as { resumeToken: string };
    };
    const alice = await join("Alice", 0);
    const bob = await join("Bob", 1);
    await fetch(`${baseUrl}/api/multiplayer/ready`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${alice.resumeToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": "ready-alice",
      },
      body: JSON.stringify({ ready: true, expectedRevision: 2 }),
    });
    const leave = () =>
      fetch(`${baseUrl}/api/multiplayer/lobby/leave`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${bob.resumeToken}`,
          "Content-Type": "application/json",
          "Idempotency-Key": "leave-bob",
        },
        body: JSON.stringify({ expectedRevision: 3 }),
      });

    const first = await leave();
    expect(first.status).toBe(200);
    const firstBody: unknown = await first.json();
    expect(firstBody).toMatchObject({
      ok: true,
      state: {
        revision: 4,
        cubeKey: "titou_tribal",
        cubeLocked: true,
        participants: [{ displayName: "Alice", ready: false }],
      },
    });
    const retry = await leave();
    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual(firstBody);
  });

  it("expose le Coach final, la Liste validee et l'export MTGA prive", async () => {
    const { baseUrl, coordinator } = await startHttpServer();
    const alice = await coordinator.join({
      requestId: "join-alice-deck",
      expectedRevision: 0,
      playerName: "Alice",
      cubeKey: "titou_tribal",
    });
    const bob = await coordinator.join({
      requestId: "join-bob-deck",
      expectedRevision: 1,
      playerName: "Bob",
    });
    if (!alice.ok || !bob.ok) throw new Error("Le Salon de test doit etre rejoint.");
    await coordinator.setReady({
      requestId: "ready-alice-deck",
      expectedRevision: 2,
      resumeToken: alice.value.resumeToken,
      ready: true,
    });
    await coordinator.setReady({
      requestId: "ready-bob-deck",
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
        requestId: `http-pick-alice-${String(round)}`,
        expectedRevision: revision++,
        resumeToken: alice.value.resumeToken,
        packNumber: aliceState.value.packNumber,
        pickNumber: aliceState.value.pickNumber,
        cardInstanceId: aliceCard.instanceId,
      });
      await coordinator.submitPick({
        requestId: `http-pick-bob-${String(round)}`,
        expectedRevision: revision++,
        resumeToken: bob.value.resumeToken,
        packNumber: bobState.value.packNumber,
        pickNumber: bobState.value.pickNumber,
        cardInstanceId: bobCard.instanceId,
      });
    }

    const recommendationResponse = await fetch(`${baseUrl}/api/multiplayer/deck/recommend`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${alice.value.resumeToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": "http-recommend-alice",
      },
      body: JSON.stringify({ expectedRevision: revision++ }),
    });
    expect(recommendationResponse.status).toBe(200);
    const recommendationBody = (await recommendationResponse.json()) as {
      workspace: {
        maindeckCardInstanceIds: string[];
        basicLands: Record<string, number>;
      };
    };

    const finalizeResponse = await fetch(`${baseUrl}/api/multiplayer/deck`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${alice.value.resumeToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": "http-finalize-alice",
      },
      body: JSON.stringify({
        expectedRevision: revision++,
        maindeckCardInstanceIds: recommendationBody.workspace.maindeckCardInstanceIds,
        basicLands: recommendationBody.workspace.basicLands,
        finalize: true,
      }),
    });
    expect(finalizeResponse.status).toBe(200);
    expect(await finalizeResponse.json()).toMatchObject({
      ok: true,
      workspace: { status: "finalized" },
    });

    const exportResponse = await fetch(`${baseUrl}/api/multiplayer/deck/export.mtga`, {
      headers: { Authorization: `Bearer ${alice.value.resumeToken}` },
    });
    expect(exportResponse.status).toBe(200);
    expect(exportResponse.headers.get("content-type")).toContain("text/plain");
    expect(await exportResponse.text()).toMatch(/^Deck\n[\s\S]+\n\nSideboard\n/u);
  });
});
