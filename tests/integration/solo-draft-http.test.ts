import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createFinalDeckCoach } from "../../src/coach-advice/final-deck-coach.ts";
import { createSoloDraftHttpHandler } from "../../src/solo-draft/http-handler.ts";
import {
  createInMemorySoloDraftStore,
  type SoloDraftStore,
} from "../../src/solo-draft/solo-draft-store.ts";
import {
  createFileSoloResultOutputs,
  type SoloResultOutputs,
} from "../../src/solo-draft/solo-result-outputs.ts";

interface SessionDto {
  readonly sessionId: string;
  readonly roundIndex: number;
  readonly status: string;
  readonly currentBooster: readonly { readonly instanceId: string }[];
}

let storageDir: string;
const servers: Server[] = [];

beforeAll(async () => {
  storageDir = await mkdtemp(join(tmpdir(), "solo-http-"));
});

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((done) => {
          server.closeAllConnections();
          server.close(() => {
            done();
          });
        }),
    ),
  );
});

afterAll(async () => {
  await rm(storageDir, { recursive: true, force: true });
});

/** Each call is a fresh "process": a new handler with no in-memory sessions. */
async function startApi(store: SoloDraftStore, resultOutputs?: SoloResultOutputs) {
  const handler = createSoloDraftHttpHandler({
    store,
    resultOutputs,
    finalDeckCoach: createFinalDeckCoach(),
    reportsDirectory: join(storageDir, "reports"),
    reportsUrlPrefix: "/reports",
    adminDraftsPath: join(storageDir, "admin-drafts.json"),
    leaderboardPath: join(storageDir, "leaderboard.json"),
  });
  const server = createServer((req, res) => {
    void handler(req, res).then((handled) => {
      if (!handled) {
        res.writeHead(418);
        res.end();
      }
    });
  });
  servers.push(server);
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const base = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`;

  const post = async (path: string, body: unknown) => {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: res.status, data: (await res.json()) as Record<string, unknown> };
  };
  const getSession = async (sessionId: string) => {
    const res = await fetch(`${base}/api/draft/session?sessionId=${encodeURIComponent(sessionId)}`);
    return { status: res.status, data: (await res.json()) as { session?: SessionDto } };
  };
  return { base, post, getSession };
}

async function startDraft(api: Awaited<ReturnType<typeof startApi>>) {
  const { status, data } = await api.post("/api/draft/start", {
    playerName: "HTTP Store Tester",
    seed: 42,
  });
  expect(status).toBe(200);
  return data.session as SessionDto;
}

function firstCard(session: SessionDto): string {
  const card = session.currentBooster[0];
  if (!card) throw new Error("Empty booster");
  return card.instanceId;
}

describe("Solo draft HTTP handler", () => {
  it("leaves unrelated routes to the next handler", async () => {
    const api = await startApi(createInMemorySoloDraftStore());
    expect((await fetch(`${api.base}/api/leaderboard`)).status).toBe(418);
    expect((await fetch(`${api.base}/api/draft/pick`)).status).toBe(418);
  });

  it("persists a started draft and its picks, then resumes them after a restart", async () => {
    const store = createInMemorySoloDraftStore();
    const first = await startApi(store);
    const session = await startDraft(first);

    const saved = await store.load(session.sessionId);
    expect(saved.ok && saved.value.humanPicks).toEqual([]);

    const pick = await first.post("/api/draft/pick", {
      sessionId: session.sessionId,
      cardInstanceId: firstCard(session),
    });
    expect(pick.status).toBe(200);
    const afterPick = await store.load(session.sessionId);
    expect(afterPick.ok && afterPick.value.humanPicks).toEqual([firstCard(session)]);

    const restarted = await startApi(store);
    const resumed = await restarted.getSession(session.sessionId);
    expect(resumed.status).toBe(200);
    expect(resumed.data.session?.roundIndex).toBe(1);
  });

  it("never reports a pick as successful when it could not be persisted", async () => {
    const durable = createInMemorySoloDraftStore();
    let failSaves = false;
    const flaky: SoloDraftStore = {
      load: (id) => durable.load(id),
      remove: (id) => durable.remove(id),
      removeExpired: (cutoff) => durable.removeExpired(cutoff),
      save: (snapshot) =>
        failSaves ? Promise.reject(new Error("disk full")) : durable.save(snapshot),
    };
    const api = await startApi(flaky);
    const session = await startDraft(api);

    failSaves = true;
    const pick = await api.post("/api/draft/pick", {
      sessionId: session.sessionId,
      cardInstanceId: firstCard(session),
    });
    expect(pick.status).toBe(503);
    expect(pick.data).toMatchObject({ ok: false, code: "SESSION_NOT_PERSISTED" });

    // Memory falls back to the last durable state, so the same pick can be retried.
    failSaves = false;
    const current = await api.getSession(session.sessionId);
    expect(current.data.session?.roundIndex).toBe(0);
    const retry = await api.post("/api/draft/pick", {
      sessionId: session.sessionId,
      cardInstanceId: firstCard(session),
    });
    expect(retry.status).toBe(200);
  });

  it("does not hand out a session that could not be stored", async () => {
    const failing: SoloDraftStore = {
      ...createInMemorySoloDraftStore(),
      save: () => Promise.reject(new Error("read-only volume")),
    };
    const api = await startApi(failing);
    const start = await api.post("/api/draft/start", { playerName: "Nope", seed: 42 });
    expect(start.status).toBe(503);
    expect(start.data).toMatchObject({ ok: false, code: "SESSION_NOT_PERSISTED" });
  });

  it("rejects unsafe or unknown session ids without touching storage", async () => {
    const api = await startApi(createInMemorySoloDraftStore());
    expect((await api.post("/api/draft/abandon", { sessionId: "../leaderboard" })).status).toBe(
      400,
    );
    expect((await api.getSession("../leaderboard")).status).toBe(404);
    expect((await api.getSession("unknown00000")).status).toBe(404);
    expect(
      (await api.post("/api/draft/pick", { sessionId: "unknown00000", cardInstanceId: "x" }))
        .status,
    ).toBe(404);
  });

  it("answers 400 to a malformed JSON body", async () => {
    const api = await startApi(createInMemorySoloDraftStore());
    const res = await fetch(`${api.base}/api/draft/pick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ broken",
    });
    expect(res.status).toBe(400);
  });

  it("forgets an abandoned session in memory and in storage", async () => {
    const store = createInMemorySoloDraftStore();
    const api = await startApi(store);
    const session = await startDraft(api);

    expect((await api.post("/api/draft/abandon", { sessionId: session.sessionId })).status).toBe(
      200,
    );
    expect(await store.load(session.sessionId)).toEqual({ ok: false, code: "NOT_FOUND" });
    expect((await api.getSession(session.sessionId)).status).toBe(404);
  });

  async function draftToDeck(api: Awaited<ReturnType<typeof startApi>>) {
    let session = await startDraft(api);
    for (let round = 0; round < 45; round++) {
      const pick = await api.post("/api/draft/pick", {
        sessionId: session.sessionId,
        cardInstanceId: firstCard(session),
      });
      expect(pick.status).toBe(200);
      session = pick.data.session as SessionDto;
    }
    const reco = await api.post("/api/draft/recommend-deck", { sessionId: session.sessionId });
    const maindeck = (reco.data.recommendation as { maindeckCardInstanceIds: string[] })
      .maindeckCardInstanceIds;
    return { sessionId: session.sessionId, maindeck };
  }

  it("keeps a training result so it can be published later, then forgets it", async () => {
    const store = createInMemorySoloDraftStore();
    const api = await startApi(store);
    const { sessionId, maindeck } = await draftToDeck(api);

    const finalize = await api.post("/api/draft/deck", {
      sessionId,
      maindeckCardInstanceIds: maindeck,
    });
    expect(finalize.status).toBe(200);
    const stored = await store.load(sessionId);
    expect(stored.ok && stored.value.lockedResult?.result.isPublished).toBe(false);

    // Finalizing again returns the same locked result instead of re-evaluating it.
    const again = await api.post("/api/draft/deck", { sessionId, maindeckCardInstanceIds: [] });
    expect(again.status).toBe(200);
    expect(again.data.result).toEqual(finalize.data.result);

    // A restart in between must not lose the result (regression: publish answered 404).
    const restarted = await startApi(store);
    const publish = await restarted.post("/api/draft/publish", { sessionId });
    expect(publish.data.error).toBeUndefined();
    expect(publish.status).toBe(200);
    expect((publish.data.result as { entry: { id: string } }).entry.id).toBe(`rec-${sessionId}`);

    expect(await store.load(sessionId)).toEqual({ ok: false, code: "NOT_FOUND" });
    expect((await restarted.post("/api/draft/publish", { sessionId })).status).toBe(404);
  }, 60_000);

  it("answers 503 while a locked result's outputs are pending, and completes on retry", async () => {
    const store = createInMemorySoloDraftStore();
    const files = createFileSoloResultOutputs({
      reportsDirectory: join(storageDir, "reports"),
      reportsUrlPrefix: "/reports",
      adminDraftsPath: join(storageDir, "admin-drafts.json"),
      leaderboardPath: join(storageDir, "leaderboard.json"),
    });
    let adminFailures = 1;
    const flaky: SoloResultOutputs = {
      ...files,
      recordAdminDraft: (entry) => {
        if (adminFailures > 0) {
          adminFailures--;
          return Promise.reject(new Error("archive volume unavailable"));
        }
        return files.recordAdminDraft(entry);
      },
    };
    const api = await startApi(store, flaky);
    const { sessionId, maindeck } = await draftToDeck(api);

    const body = { sessionId, maindeckCardInstanceIds: maindeck, publishToLeaderboard: true };
    const failed = await api.post("/api/draft/deck", body);
    expect(failed.status).toBe(503);
    expect(failed.data).toMatchObject({ ok: false, code: "RESULT_OUTPUT_PENDING" });
    const pending = await store.load(sessionId);
    expect(pending.ok && pending.value.lockedResult?.publication.adminRecorded).toBe(false);

    const retried = await api.post("/api/draft/deck", body);
    expect(retried.status).toBe(200);
    expect((retried.data.result as { isPublished: boolean }).isPublished).toBe(true);
    expect(await store.load(sessionId)).toEqual({ ok: false, code: "NOT_FOUND" });
  }, 60_000);
});
