import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import { afterEach, describe, expect, it } from "vitest";

import { createRequestHandler } from "../../scripts/serve-web.mjs";
import {
  createInMemoryTournamentStore,
  createTournamentCoordinator,
  createTournamentHttpHandler,
  type DeclaredDeckCard,
  type DeckPhotoRecognizer,
  type TournamentCubeCatalog,
  type TournamentResult,
  type TournamentStore,
} from "../../src/tournaments/index.ts";
import {
  buildTournamentCubeSnapshot,
  createTournamentSequence,
  createTournamentTestClock,
} from "../helpers/tournament-fixtures.ts";

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

function createCubeCatalog(): TournamentCubeCatalog {
  const snapshot = buildTournamentCubeSnapshot();
  return {
    listCubes: () =>
      Promise.resolve({
        ok: true,
        value: [
          {
            cubeKey: snapshot.cubeKey,
            cubeName: snapshot.cubeName,
            activeSnapshotId: snapshot.snapshotId,
          },
        ],
      }),
    loadSnapshot: () => Promise.resolve({ ok: true, value: snapshot }),
  };
}

async function startHttpServer(
  deckRecognizer?: DeckPhotoRecognizer,
): Promise<{ readonly baseUrl: string }> {
  const coordinator = createTournamentCoordinator({
    store: createInMemoryTournamentStore(),
    cubeCatalog: createCubeCatalog(),
    now: createTournamentTestClock().now,
    createId: createTournamentSequence("id"),
    createSeed: () => 42,
  });
  const tournamentHandler = createTournamentHttpHandler({
    coordinator,
    deckRecognizer: deckRecognizer ?? {
      recognizeDeck: () =>
        Promise.resolve({
          ok: true,
          value: {
            archetype: "Aggro Boros",
            cards: [
              {
                name: "Champion of the Parish",
                count: 2,
                cmc: 1,
                isLand: false,
                oracleId: "faeaa3eb-6eb8-4621-98c7-0c6f58bbff85",
              },
            ],
            basicLands: {
              Plains: 8,
              Mountain: 8,
              Island: 0,
              Swamp: 0,
              Forest: 0,
            },
            totalCount: 18,
            confidence: 0.98,
          },
        }),
    },
  });
  const server = createServer((request, response) => {
    void tournamentHandler(request, response).then((handled) => {
      if (!handled) response.writeHead(404).end();
    });
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as AddressInfo;
  return { baseUrl: `http://127.0.0.1:${String(address.port)}` };
}

async function startMainServer(store: TournamentStore): Promise<{ readonly baseUrl: string }> {
  const coordinator = createTournamentCoordinator({
    store,
    cubeCatalog: createCubeCatalog(),
    now: createTournamentTestClock().now,
    createId: createTournamentSequence("readiness"),
    createSeed: () => 42,
  });
  const server = createServer(
    createRequestHandler({
      authEnabled: false,
      isTestEnv: true,
      tournamentCoordinator: coordinator,
    }),
  );
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as AddressInfo;
  return { baseUrl: `http://127.0.0.1:${String(address.port)}` };
}

describe("Tournament management HTTP", () => {
  it("reports tournament store readiness without changing liveness", async () => {
    const readyServer = await startMainServer(createInMemoryTournamentStore());
    const ready = await fetch(`${readyServer.baseUrl}/health/ready`);
    expect(ready.status).toBe(200);
    await expect(ready.json()).resolves.toMatchObject({
      status: "ready",
      tournaments: { ready: true },
    });

    const unavailable = (): Promise<TournamentResult<never>> =>
      Promise.resolve({
        ok: false,
        error: {
          code: "STORE_UNAVAILABLE",
          message: "Sensitive database message",
          details: { secret: "must-not-leak" },
        },
      });
    const unavailableStore: TournamentStore = {
      list: unavailable,
      load: unavailable,
      commit: unavailable,
      delete: unavailable,
      checkReadiness: unavailable,
    };
    const unavailableServer = await startMainServer(unavailableStore);
    const notReady = await fetch(`${unavailableServer.baseUrl}/health/ready`);
    expect(notReady.status).toBe(503);
    const readinessText = await notReady.text();
    expect(JSON.parse(readinessText)).toMatchObject({
      status: "unavailable",
      tournaments: { ready: false, errorCode: "STORE_UNAVAILABLE" },
    });
    expect(readinessText).not.toContain("Sensitive");
    expect(readinessText).not.toContain("must-not-leak");
    const live = await fetch(`${unavailableServer.baseUrl}/health/live`);
    expect(live.status).toBe(200);
  });

  it("lists selectable cubes without caching their active snapshot metadata", async () => {
    const { baseUrl } = await startHttpServer();

    const response = await fetch(`${baseUrl}/api/tournaments/cubes`);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      ok: true,
      cubes: [
        {
          cubeKey: "titou_tribal",
          cubeName: "titou's tribal and chromatic cube",
          activeSnapshotId: "titou_tribal@2026-09-21.1",
        },
      ],
    });
  });

  it("creates a preparation tournament through an idempotent request", async () => {
    const { baseUrl } = await startHttpServer();

    const response = await fetch(`${baseUrl}/api/tournaments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "create-september-cube",
      },
      body: JSON.stringify({ name: "Cube de septembre" }),
    });

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      tournament: {
        tournamentId: "id-001",
        revision: 0,
        name: "Cube de septembre",
        status: "preparation",
        cube: null,
        participants: [],
        rounds: [],
      },
    });
  });

  it("replaces the complete mutable setup while the tournament is in preparation", async () => {
    const { baseUrl } = await startHttpServer();
    await fetch(`${baseUrl}/api/tournaments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "create-setup-cube",
      },
      body: JSON.stringify({ name: "Cube de septembre" }),
    });

    const response = await fetch(`${baseUrl}/api/tournaments/id-001/setup`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "configure-setup-cube",
      },
      body: JSON.stringify({
        expectedRevision: 0,
        name: "Cube de septembre",
        cubeKey: "titou_tribal",
        format: "swiss",
        plannedRoundCount: 3,
        participants: [
          { participantId: null, displayName: "Alice", deckName: "Aggro Boros" },
          { participantId: null, displayName: "Bob", deckName: "Izzet Wizards" },
        ],
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      tournament: {
        tournamentId: "id-001",
        revision: 1,
        format: "swiss",
        plannedRoundCount: 3,
        cube: { cubeKey: "titou_tribal" },
        participants: [
          { participantId: "id-002", displayName: "Alice", deck: { name: "Aggro Boros" } },
          { participantId: "id-003", displayName: "Bob", deck: { name: "Izzet Wizards" } },
        ],
      },
    });
  });

  it("returns tournament history summaries and a complete tournament detail", async () => {
    const { baseUrl } = await startHttpServer();
    await fetch(`${baseUrl}/api/tournaments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "create-history-cube",
      },
      body: JSON.stringify({ name: "Cube de septembre" }),
    });
    await fetch(`${baseUrl}/api/tournaments/id-001/setup`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "configure-history-cube",
      },
      body: JSON.stringify({
        expectedRevision: 0,
        name: "Cube de septembre",
        cubeKey: "titou_tribal",
        format: "swiss",
        plannedRoundCount: 3,
        participants: [
          { participantId: null, displayName: "Alice", deckName: "Aggro Boros" },
          { participantId: null, displayName: "Bob", deckName: "Izzet Wizards" },
        ],
      }),
    });

    const listResponse = await fetch(`${baseUrl}/api/tournaments?status=all&limit=100`);
    expect(listResponse.status).toBe(200);
    await expect(listResponse.json()).resolves.toMatchObject({
      ok: true,
      tournaments: [
        {
          tournamentId: "id-001",
          name: "Cube de septembre",
          status: "preparation",
          format: "swiss",
          participantCount: 2,
          revision: 1,
        },
      ],
    });

    const detailResponse = await fetch(`${baseUrl}/api/tournaments/id-001`);
    expect(detailResponse.status).toBe(200);
    await expect(detailResponse.json()).resolves.toMatchObject({
      ok: true,
      tournament: {
        tournamentId: "id-001",
        cube: { cubeKey: "titou_tribal" },
        participants: [
          { displayName: "Alice", deck: { name: "Aggro Boros" } },
          { displayName: "Bob", deck: { name: "Izzet Wizards" } },
        ],
      },
    });
  });

  it("serializes concurrent starts and rejects the next round while the current one is incomplete", async () => {
    const { baseUrl } = await startHttpServer();
    await fetch(`${baseUrl}/api/tournaments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "create-concurrent-start",
      },
      body: JSON.stringify({ name: "Swiss concurrent" }),
    });
    await fetch(`${baseUrl}/api/tournaments/id-001/setup`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "setup-concurrent-start",
      },
      body: JSON.stringify({
        expectedRevision: 0,
        name: "Swiss concurrent",
        cubeKey: "titou_tribal",
        format: "swiss",
        plannedRoundCount: 3,
        participants: [
          { participantId: null, displayName: "Alice", deckName: "Aggro Boros" },
          { participantId: null, displayName: "Bob", deckName: "Izzet Wizards" },
          { participantId: null, displayName: "Charlie", deckName: "Mono Green" },
          { participantId: null, displayName: "Diane", deckName: "Azorius Control" },
        ],
      }),
    });
    const start = (requestId: string) =>
      fetch(`${baseUrl}/api/tournaments/id-001/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": requestId,
        },
        body: JSON.stringify({ expectedRevision: 1 }),
      });

    const [firstStart, secondStart] = await Promise.all([
      start("start-from-tab-one"),
      start("start-from-tab-two"),
    ]);
    expect([firstStart.status, secondStart.status].sort()).toEqual([200, 409]);
    const failedStart = firstStart.status === 409 ? firstStart : secondStart;
    await expect(failedStart.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "REVISION_CONFLICT", details: { currentRevision: 2 } },
    });

    const nextRound = await fetch(`${baseUrl}/api/tournaments/id-001/rounds`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "publish-round-two-too-early",
      },
      body: JSON.stringify({ expectedRevision: 2 }),
    });
    expect(nextRound.status).toBe(409);
    await expect(nextRound.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "ROUND_INCOMPLETE" },
    });
  });

  it("records, retries, corrects concurrently, drops and completes through HTTP", async () => {
    const { baseUrl } = await startHttpServer();
    await fetch(`${baseUrl}/api/tournaments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "create-result-http",
      },
      body: JSON.stringify({ name: "Swiss HTTP" }),
    });
    await fetch(`${baseUrl}/api/tournaments/id-001/setup`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "setup-result-http",
      },
      body: JSON.stringify({
        expectedRevision: 0,
        name: "Swiss HTTP",
        cubeKey: "titou_tribal",
        format: "swiss",
        plannedRoundCount: 1,
        participants: [
          { participantId: null, displayName: "Alice", deckName: "Aggro Boros" },
          { participantId: null, displayName: "Bob", deckName: "Izzet Wizards" },
        ],
      }),
    });
    const startResponse = await fetch(`${baseUrl}/api/tournaments/id-001/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "start-result-http",
      },
      body: JSON.stringify({ expectedRevision: 1 }),
    });
    const started = (await startResponse.json()) as {
      readonly tournament: {
        readonly rounds: readonly [{ readonly matches: readonly [{ readonly matchId: string }] }];
        readonly participants: readonly [{ readonly participantId: string }];
      };
    };
    const matchId = started.tournament.rounds[0].matches[0].matchId;
    const participantId = started.tournament.participants[0].participantId;
    const resultUrl = `${baseUrl}/api/tournaments/id-001/matches/${matchId}/result`;
    const recordResult = () =>
      fetch(resultUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "record-http-result",
        },
        body: JSON.stringify({
          expectedRevision: 2,
          kind: "played",
          gamesWonA: 2,
          gamesWonB: 1,
          drawnGames: 0,
        }),
      });

    const firstResult = await recordResult();
    const retriedResult = await recordResult();
    expect([firstResult.status, retriedResult.status]).toEqual([200, 200]);
    await expect(retriedResult.json()).resolves.toMatchObject({
      ok: true,
      tournament: {
        revision: 3,
        rounds: [{ matches: [{ currentResultVersion: 1, resultVersions: [{ version: 1 }] }] }],
      },
    });

    const correct = (requestId: string, gamesWonA: number, gamesWonB: number) =>
      fetch(resultUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": requestId,
        },
        body: JSON.stringify({
          expectedRevision: 3,
          kind: "played",
          gamesWonA,
          gamesWonB,
          drawnGames: 0,
          reason: "Correction concurrente",
        }),
      });
    const [firstCorrection, secondCorrection] = await Promise.all([
      correct("correction-tab-one", 0, 2),
      correct("correction-tab-two", 2, 0),
    ]);
    expect([firstCorrection.status, secondCorrection.status].sort()).toEqual([200, 409]);
    const failedCorrection = firstCorrection.status === 409 ? firstCorrection : secondCorrection;
    await expect(failedCorrection.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "REVISION_CONFLICT", details: { currentRevision: 4 } },
    });

    const dropResponse = await fetch(
      `${baseUrl}/api/tournaments/id-001/participants/${participantId}/drop`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "drop-http-player",
        },
        body: JSON.stringify({ expectedRevision: 4, reason: "Départ après la ronde" }),
      },
    );
    expect(dropResponse.status).toBe(200);
    const droppedBody = (await dropResponse.json()) as {
      readonly ok: true;
      readonly tournament: {
        readonly revision: number;
        readonly participants: readonly {
          readonly participantId: string;
          readonly status: string;
        }[];
      };
    };
    expect(droppedBody.tournament.revision).toBe(5);
    expect(droppedBody.tournament.participants).toHaveLength(2);
    expect(
      droppedBody.tournament.participants.find(
        (participant) => participant.participantId === participantId,
      ),
    ).toMatchObject({ status: "dropped" });

    const complete = () =>
      fetch(`${baseUrl}/api/tournaments/id-001/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "complete-http-tournament",
        },
        body: JSON.stringify({ expectedRevision: 5 }),
      });
    const completeResponse = await complete();
    const retriedCompleteResponse = await complete();
    expect([completeResponse.status, retriedCompleteResponse.status]).toEqual([200, 200]);
    await expect(retriedCompleteResponse.json()).resolves.toMatchObject({
      ok: true,
      tournament: { revision: 6, status: "completed" },
    });
  });

  it("publishes the complete three-player round-robin calendar through HTTP", async () => {
    const { baseUrl } = await startHttpServer();
    await fetch(`${baseUrl}/api/tournaments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "create-round-robin-http",
      },
      body: JSON.stringify({ name: "Toutes rondes HTTP" }),
    });
    const setup = await fetch(`${baseUrl}/api/tournaments/id-001/setup`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "setup-round-robin-http",
      },
      body: JSON.stringify({
        expectedRevision: 0,
        name: "Toutes rondes HTTP",
        cubeKey: "titou_tribal",
        format: "round-robin-three",
        plannedRoundCount: 3,
        participants: [
          { participantId: null, displayName: "Alice", deckName: "Aggro Boros" },
          { participantId: null, displayName: "Bob", deckName: "Izzet Wizards" },
          { participantId: null, displayName: "Charlie", deckName: "Mono Green" },
        ],
      }),
    });
    expect(setup.status).toBe(200);

    const started = await fetch(`${baseUrl}/api/tournaments/id-001/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "start-round-robin-http",
      },
      body: JSON.stringify({ expectedRevision: 1 }),
    });
    expect(started.status).toBe(200);
    const body = (await started.json()) as {
      readonly tournament: {
        readonly format: string;
        readonly rounds: readonly {
          readonly matches: readonly { readonly participantBId: string | null }[];
          readonly pauses: readonly { readonly participantId: string; readonly reason: string }[];
        }[];
        readonly standings: readonly {
          readonly matchesPlayed: number;
          readonly matchPoints: number;
        }[];
      };
    };
    expect(body.tournament.format).toBe("round-robin-three");
    expect(body.tournament.rounds).toHaveLength(3);
    expect(body.tournament.rounds.flatMap(({ matches }) => matches)).toHaveLength(3);
    expect(
      body.tournament.rounds
        .flatMap(({ matches }) => matches)
        .every(({ participantBId }) => participantBId !== null),
    ).toBe(true);
    expect(body.tournament.rounds.flatMap(({ pauses }) => pauses)).toHaveLength(3);
    expect(
      body.tournament.standings.every(
        ({ matchesPlayed, matchPoints }) => matchesPlayed === 0 && matchPoints === 0,
      ),
    ).toBe(true);
  });

  it("replaces deck key cards through an idempotent HTTP route", async () => {
    const { baseUrl } = await startHttpServer();
    const snapshotCard = buildTournamentCubeSnapshot().payload.cards[0];
    if (snapshotCard === undefined) throw new Error("A snapshot card is required.");
    await fetch(`${baseUrl}/api/tournaments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": "create-key-cards" },
      body: JSON.stringify({ name: "Cartes clés HTTP" }),
    });
    await fetch(`${baseUrl}/api/tournaments/id-001/setup`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Idempotency-Key": "setup-key-cards" },
      body: JSON.stringify({
        expectedRevision: 0,
        name: "Cartes clés HTTP",
        cubeKey: "titou_tribal",
        format: "swiss",
        plannedRoundCount: 1,
        participants: [
          { participantId: null, displayName: "Alice", deckName: "Aggro Boros" },
          { participantId: null, displayName: "Bob", deckName: "Izzet Wizards" },
        ],
      }),
    });
    const update = () =>
      fetch(`${baseUrl}/api/tournaments/id-001/participants/id-002/key-cards`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "update-key-cards-http",
        },
        body: JSON.stringify({
          expectedRevision: 1,
          oracleIds: [snapshotCard.oracleId, snapshotCard.oracleId],
        }),
      });

    const updated = await update();
    const replayed = await update();
    expect([updated.status, replayed.status]).toEqual([200, 200]);
    await expect(replayed.json()).resolves.toMatchObject({
      ok: true,
      tournament: {
        revision: 2,
        participants: [
          {
            participantId: "id-002",
            deck: { keyCards: [{ oracleId: snapshotCard.oracleId, name: snapshotCard.name }] },
          },
          { participantId: "id-003" },
        ],
      },
    });

    const rejected = await fetch(
      `${baseUrl}/api/tournaments/id-001/participants/id-002/key-cards`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "reject-key-card-http",
        },
        body: JSON.stringify({ expectedRevision: 2, oracleIds: ["outside-snapshot"] }),
      },
    );
    expect(rejected.status).toBe(400);
    await expect(rejected.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "INVALID_INPUT", details: { unknownOracleIds: ["outside-snapshot"] } },
    });
  });

  it("deletes an existing tournament via DELETE /api/tournaments/:id", async () => {
    const { baseUrl } = await startHttpServer();
    const creation = await fetch(`${baseUrl}/api/tournaments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "to-be-deleted",
      },
      body: JSON.stringify({ name: "Tournoi éphémère" }),
    });
    expect(creation.status).toBe(201);
    const body = (await creation.json()) as { tournament: { tournamentId: string } };
    const tournamentId = body.tournament.tournamentId;

    const deletion = await fetch(`${baseUrl}/api/tournaments/${tournamentId}`, {
      method: "DELETE",
    });
    expect(deletion.status).toBe(200);
    await expect(deletion.json()).resolves.toMatchObject({
      ok: true,
      deleted: true,
    });

    const getAfterDelete = await fetch(`${baseUrl}/api/tournaments/${tournamentId}`);
    expect(getAfterDelete.status).toBe(404);
  });

  it("recognizes a deck from an uploaded photo via POST /api/tournaments/recognize-deck", async () => {
    const { baseUrl } = await startHttpServer();
    const response = await fetch(`${baseUrl}/api/tournaments/recognize-deck`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: "data:image/jpeg;base64,aGVsbG8=",
        cubeKey: "titou_tribal",
      }),
    });
    expect(response.status).toBe(200);
    interface RecognizeDeckResponse {
      readonly ok: boolean;
      readonly archetype: string;
      readonly cards: readonly DeclaredDeckCard[];
      readonly basicLands: Record<string, number>;
      readonly totalCount: number;
    }
    const body = (await response.json()) as RecognizeDeckResponse;
    expect(body.ok).toBe(true);
    expect(body.archetype).toBe("Aggro Boros");
    expect(body.cards.length).toBeGreaterThan(0);
    expect(body.cards[0]?.name).toBe("Champion of the Parish");
    expect(body.basicLands.Plains).toBe(8);
    expect(body.totalCount).toBe(18);
  });

  it("returns 503 when the deck recognition provider is unavailable", async () => {
    const { baseUrl } = await startHttpServer({
      recognizeDeck: () =>
        Promise.resolve({
          ok: false,
          error: {
            code: "STORE_UNAVAILABLE",
            message: "Gemini est temporairement indisponible (HTTP 503).",
            details: {},
          },
        }),
    });
    const response = await fetch(`${baseUrl}/api/tournaments/recognize-deck`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: "data:image/jpeg;base64,aGVsbG8=" }),
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: {
        code: "STORE_UNAVAILABLE",
        message: "Gemini est temporairement indisponible (HTTP 503).",
      },
    });
  });

  it("previews pasted MTGA main deck without saving it or losing unknown names", async () => {
    const { baseUrl } = await startHttpServer();
    const response = await fetch(`${baseUrl}/api/tournaments/parse-deck`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "About\nName Arena Draft\n\nDeck\n1 Karakas\n1 Uncatalogued Test Dragon\n8 Plains\n\nSideboard\n2 Lightning Bolt\n",
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      deckName: "Arena Draft",
      cards: [
        { name: "Karakas", count: 1 },
        { name: "Uncatalogued Test Dragon", count: 1 },
      ],
      basicLands: { Plains: 8 },
      totalCount: 10,
      sideboardCount: 2,
      unverifiedNames: ["Uncatalogued Test Dragon"],
    });
    const tournaments = await fetch(`${baseUrl}/api/tournaments`);
    await expect(tournaments.json()).resolves.toMatchObject({
      ok: true,
      tournaments: [],
    });
  });

  it("rejects a partial MTGA export before any deck mutation", async () => {
    const { baseUrl } = await startHttpServer();
    const response = await fetch(`${baseUrl}/api/tournaments/parse-deck`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "# Export MTGA partiel non importable\nDeck\n1 Karakas" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "INVALID_INPUT" },
    });
  });

  it("updates a participant's deck via PUT /api/tournaments/:id/participants/:participantId/deck", async () => {
    const { baseUrl } = await startHttpServer();
    await fetch(`${baseUrl}/api/tournaments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "setup-deck-update-test",
      },
      body: JSON.stringify({ name: "Tournoi Deck" }),
    });

    await fetch(`${baseUrl}/api/tournaments/id-001/setup`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "setup-deck-update",
      },
      body: JSON.stringify({
        expectedRevision: 0,
        name: "Tournoi Deck",
        cubeKey: "titou_tribal",
        format: "swiss",
        plannedRoundCount: 3,
        participants: [
          { participantId: null, displayName: "Alice", deckName: "Unknown" },
          { participantId: null, displayName: "Bob", deckName: "Unknown" },
        ],
      }),
    });

    const updateRes = await fetch(`${baseUrl}/api/tournaments/id-001/participants/id-002/deck`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "update-alice-deck",
      },
      body: JSON.stringify({
        expectedRevision: 1,
        deckName: "Aggro Boros",
        cards: [{ name: "Champion of the Parish", count: 2, cmc: 1 }],
        basicLands: { Plains: 8, Mountain: 8 },
      }),
    });

    expect(updateRes.status).toBe(200);
    interface UpdateParticipantDeckResponse {
      readonly ok: boolean;
      readonly tournament: {
        readonly participants: readonly {
          readonly displayName: string;
          readonly deck: {
            readonly name: string;
            readonly cards: readonly DeclaredDeckCard[];
            readonly basicLands: Record<string, number>;
          };
        }[];
      };
    }
    const updated = (await updateRes.json()) as UpdateParticipantDeckResponse;
    expect(updated.ok).toBe(true);
    const alice = updated.tournament.participants.find((p) => p.displayName === "Alice");
    expect(alice?.deck.name).toBe("Aggro Boros");
    expect(alice?.deck.cards.length).toBe(1);
    expect(alice?.deck.cards[0]?.name).toBe("Champion of the Parish");
    expect(alice?.deck.basicLands.Plains).toBe(8);
  });
});
