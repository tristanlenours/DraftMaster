import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createRequestHandler } from "../../scripts/serve-web.mjs";
import {
  createInMemoryTournamentStore,
  createTournamentCoordinator,
  type TournamentCubeCatalog,
} from "../../src/tournaments/index.ts";
import {
  buildTournamentCubeSnapshot,
  createTournamentSequence,
  createTournamentTestClock,
} from "../helpers/tournament-fixtures.ts";

describe("Site Auth Gatekeeper & Guild Passcode Integration", () => {
  const TEST_PASSWORD = "DraftMaster007!";
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const snapshot = buildTournamentCubeSnapshot();
    const cubeCatalog: TournamentCubeCatalog = {
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
    const tournamentCoordinator = createTournamentCoordinator({
      store: createInMemoryTournamentStore(),
      cubeCatalog,
      now: createTournamentTestClock().now,
      createId: createTournamentSequence("tournament"),
      createSeed: () => 42,
    });
    const handler = createRequestHandler({
      authEnabled: true,
      sitePassword: TEST_PASSWORD,
      tournamentCoordinator,
    });
    server = createServer(handler);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        resolve();
      });
    });
    const addr = server.address() as AddressInfo;
    baseUrl = `http://localhost:${String(addr.port)}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  it("permits Railway health checks without credentials", async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("ok");

    const liveRes = await fetch(`${baseUrl}/health/live`);
    expect(liveRes.status).toBe(200);
  });

  it("reports protection active and unauthenticated state via /api/auth/status", async () => {
    const res = await fetch(`${baseUrl}/api/auth/status`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      protectionEnabled: boolean;
      authenticated: boolean;
    };
    expect(body.ok).toBe(true);
    expect(body.protectionEnabled).toBe(true);
    expect(body.authenticated).toBe(false);
  });

  it("serves the Gatekeeper HTML lock screen on GET / when unauthenticated", async () => {
    const res = await fetch(`${baseUrl}/`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("DraftMaster — Accès Réservé");
    expect(html).toContain("Mot de passe de guilde");
    expect(html).toContain("Déverrouiller le Cube");
  });

  it("rejects protected API calls with 401 when unauthenticated", async () => {
    const res = await fetch(`${baseUrl}/api/leaderboard`);
    expect(res.status).toBe(401);
    const body = (await res.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toContain("mot de passe");
  });

  it("protects tournament reads and mutations, then serves them after guild authentication", async () => {
    const unauthorizedRead = await fetch(`${baseUrl}/api/tournaments/cubes`);
    expect(unauthorizedRead.status).toBe(401);
    const unauthorizedWrite = await fetch(`${baseUrl}/api/tournaments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "unauthorized-tournament",
      },
      body: JSON.stringify({ name: "Tournoi interdit" }),
    });
    expect(unauthorizedWrite.status).toBe(401);

    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: TEST_PASSWORD }),
    });
    const cookie = login.headers.get("set-cookie")?.match(/dm_auth=([^;]+)/u)?.[1];
    expect(cookie).toBeTruthy();
    if (!cookie) throw new Error("Le cookie de guilde de test est absent.");

    const catalog = await fetch(`${baseUrl}/api/tournaments/cubes`, {
      headers: { Cookie: `dm_auth=${cookie}` },
    });
    expect(catalog.status).toBe(200);
    await expect(catalog.json()).resolves.toMatchObject({
      ok: true,
      cubes: [{ cubeKey: "titou_tribal" }],
    });

    const creation = await fetch(`${baseUrl}/api/tournaments`, {
      method: "POST",
      headers: {
        Cookie: `dm_auth=${cookie}`,
        "Content-Type": "application/json",
        "Idempotency-Key": "authenticated-tournament",
      },
      body: JSON.stringify({ name: "Tournoi autorisé" }),
    });
    expect(creation.status).toBe(201);
    await expect(creation.json()).resolves.toMatchObject({
      ok: true,
      tournament: { tournamentId: "tournament-001", name: "Tournoi autorisé" },
    });
  });

  it("rejects invalid password submissions with 401", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "wrong-password!" }),
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toContain("incorrect");
  });

  it("authenticates successfully with DraftMaster007! and sets session cookie", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: TEST_PASSWORD }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; message: string };
    expect(body.ok).toBe(true);

    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain("dm_auth=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Max-Age=");

    // Extract cookie
    const tokenMatch = setCookie?.match(/dm_auth=([^;]+)/);
    expect(tokenMatch).toBeTruthy();
    const token: string = tokenMatch?.[1] ?? "";
    expect(token.length).toBeGreaterThan(0);

    // Access protected API with cookie
    const apiRes = await fetch(`${baseUrl}/api/leaderboard`, {
      headers: { Cookie: `dm_auth=${token}` },
    });
    expect(apiRes.status).toBe(200);
    const apiBody = (await apiRes.json()) as { ok: boolean };
    expect(apiBody.ok).toBe(true);

    // Access main HTML page with cookie
    const pageRes = await fetch(`${baseUrl}/`, {
      headers: { Cookie: `dm_auth=${token}` },
    });
    expect(pageRes.status).toBe(200);
    const pageHtml = await pageRes.text();
    // It should now serve the real index.html, not the gatekeeper
    expect(pageHtml).toContain("LES MAGICIENS");
    expect(pageHtml).toContain('id="view-home"');

    // Check auth status with cookie
    const statusRes = await fetch(`${baseUrl}/api/auth/status`, {
      headers: { Cookie: `dm_auth=${token}` },
    });
    const statusBody = (await statusRes.json()) as {
      ok: boolean;
      protectionEnabled: boolean;
      authenticated: boolean;
    };
    expect(statusBody.authenticated).toBe(true);

    // Logout
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: `dm_auth=${token}` },
    });
    expect(logoutRes.status).toBe(200);
    const logoutSetCookie = logoutRes.headers.get("set-cookie");
    expect(logoutSetCookie).toContain("Max-Age=0");
  });

  it("remains freely accessible when authEnabled is false", async () => {
    const unauthHandler = createRequestHandler({ authEnabled: false });
    const freeServer = createServer(unauthHandler);
    await new Promise<void>((resolve) => {
      freeServer.listen(0, () => {
        resolve();
      });
    });
    const addr = freeServer.address() as AddressInfo;
    const freeUrl = `http://localhost:${String(addr.port)}`;

    try {
      const res = await fetch(`${freeUrl}/api/leaderboard`);
      expect(res.status).toBe(200);

      const statusRes = await fetch(`${freeUrl}/api/auth/status`);
      const statusBody = (await statusRes.json()) as {
        protectionEnabled: boolean;
        authenticated: boolean;
      };
      expect(statusBody.protectionEnabled).toBe(false);
      expect(statusBody.authenticated).toBe(true);
    } finally {
      await new Promise<void>((resolve) => {
        freeServer.close(() => {
          resolve();
        });
      });
    }
  });
});
