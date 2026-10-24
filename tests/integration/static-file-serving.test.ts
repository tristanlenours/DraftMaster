import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, request, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { access, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createRequestHandler } from "../../scripts/serve-web.mjs";

// Raw request: fetch() would normalise the path before sending it.
function rawGet(port: number, path: string, method = "GET", body?: string) {
  return new Promise<{ status: number; body: string; headers: Record<string, unknown> }>(
    (resolvePromise, reject) => {
      const req = request(
        {
          host: "127.0.0.1",
          port,
          path,
          method,
          headers: {
            ...(body ? { "Content-Type": "application/json" } : {}),
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => chunks.push(chunk));
          res.on("end", () => {
            resolvePromise({
              status: res.statusCode ?? 0,
              body: Buffer.concat(chunks).toString("latin1"),
              headers: res.headers,
            });
          });
        },
      );
      req.on("error", reject);
      if (body) req.write(body);
      req.end();
    },
  );
}

describe("static file serving boundaries", () => {
  let server: Server;
  let port: number;

  beforeAll(async () => {
    server = createServer(createRequestHandler({ authEnabled: false }));
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await new Promise<void>((done, fail) => {
      server.close((error) => {
        if (error) fail(error);
        else done();
      });
    });
  });

  it.each([
    "/data/..%2Fpackage.json",
    "/data/..%2F.env",
    "/app.js/..%2F..%2F..%2Fpackage.json",
    "/reports/..%2Fpackage.json",
    "/data/cubes/..%5C..%5Cpackage.json",
  ])("refuses encoded traversal %s", async (path) => {
    const res = await rawGet(port, path);
    expect(res.status).toBe(404);
    expect(res.body).not.toContain('"name": "draftmaster"');
  });

  it.each([
    "/data/leaderboard.json",
    "/data/admin-drafts.json",
    "/data/match-history.json",
    "/data/draft-sessions/000000000000.json",
    "/data/multiplayer-draft/global.json",
  ])("does not expose private runtime data %s", async (path) => {
    const res = await rawGet(port, path);
    expect(res.status).toBe(404);
  });

  it("answers 400 to a malformed escape sequence instead of crashing", async () => {
    const res = await rawGet(port, "/data/%E0%A4%A");
    expect(res.status).toBe(400);
  });

  it("still serves public cube data and the web shell", async () => {
    expect((await rawGet(port, "/data/cubes/titou_tribal/cube-meta.json")).status).toBe(200);
    expect((await rawGet(port, "/app.js")).status).toBe(200);
    expect((await rawGet(port, "/draft")).status).toBe(200);
  });

  it("rejects a solo session id that would escape the sessions directory", async () => {
    const victimDir = resolve(process.cwd(), "data", "draft-sessions-victim");
    const victim = resolve(victimDir, "victim.json");
    await mkdir(victimDir, { recursive: true });
    await writeFile(victim, "{}", "utf8");
    try {
      const res = await rawGet(
        port,
        "/api/draft/abandon",
        "POST",
        JSON.stringify({ sessionId: "../draft-sessions-victim/victim" }),
      );
      expect(res.status).toBe(400);
      await expect(access(victim)).resolves.toBeUndefined();
    } finally {
      await rm(victimDir, { recursive: true, force: true });
    }
  });

  it("rejects a cube key that would leave the cubes directory", async () => {
    const res = await rawGet(
      port,
      "/api/draft/start",
      "POST",
      JSON.stringify({ playerName: "Traversal", cubeKey: "../../package" }),
    );
    expect(res.status).toBe(400);
  });

  it("does not grant cross-origin access to arbitrary sites", async () => {
    const res = await rawGet(port, "/health");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
