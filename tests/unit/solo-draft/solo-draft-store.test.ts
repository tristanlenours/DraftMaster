import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createFileSoloDraftStore,
  createInMemorySoloDraftStore,
  isValidSoloSessionId,
  type SoloDraftStore,
} from "../../../src/solo-draft/solo-draft-store.ts";
import type { SoloDraftPersistenceSnapshot } from "../../../src/solo-draft/solo-draft-types.ts";

const snapshot: SoloDraftPersistenceSnapshot = {
  sessionId: "abc123def456",
  seed: 42,
  playerName: "Store Tester",
  cubeKey: "titou_tribal",
  humanPicks: ["card-1", "card-2"],
  isHomologated: true,
  startedAtTimestamp: 1_700_000_000_000,
};

describe("isValidSoloSessionId", () => {
  it.each(["abc123def456", "session_1", "A-b"])("accepts %s", (id) => {
    expect(isValidSoloSessionId(id)).toBe(true);
  });

  it.each(["", "../leaderboard", "a/b", "a\\b", "x".repeat(65), 42, null, undefined])(
    "rejects %s",
    (id) => {
      expect(isValidSoloSessionId(id)).toBe(false);
    },
  );
});

function storeContract(name: string, makeStore: () => Promise<SoloDraftStore>) {
  describe(`${name} store contract`, () => {
    it("returns NOT_FOUND for an unknown session", async () => {
      const store = await makeStore();
      expect(await store.load("unknown00000")).toEqual({ ok: false, code: "NOT_FOUND" });
    });

    it("round-trips a saved snapshot", async () => {
      const store = await makeStore();
      await store.save(snapshot);
      expect(await store.load(snapshot.sessionId)).toEqual({ ok: true, value: snapshot });
    });

    it("removes a snapshot and tolerates removing it twice", async () => {
      const store = await makeStore();
      await store.save(snapshot);
      await store.remove(snapshot.sessionId);
      await store.remove(snapshot.sessionId);
      expect(await store.load(snapshot.sessionId)).toEqual({ ok: false, code: "NOT_FOUND" });
    });

    it("rejects an unsafe id on every operation without touching storage", async () => {
      const store = await makeStore();
      expect(await store.load("../escape")).toEqual({ ok: false, code: "INVALID_ID" });
      await expect(store.remove("../escape")).rejects.toThrow(/invalide/u);
      await expect(store.save({ ...snapshot, sessionId: "../escape" })).rejects.toThrow(
        /invalide/u,
      );
    });
  });
}

const tempDirs: string[] = [];
afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "solo-store-"));
  tempDirs.push(dir);
  return dir;
}

storeContract("in-memory", () => Promise.resolve(createInMemorySoloDraftStore()));
storeContract("file", async () => createFileSoloDraftStore(join(await makeTempDir(), "sessions")));

describe("file store specifics", () => {
  it("writes one JSON document per session inside its directory", async () => {
    const dir = await makeTempDir();
    await createFileSoloDraftStore(dir).save(snapshot);
    const written: unknown = JSON.parse(await readFile(join(dir, "abc123def456.json"), "utf8"));
    expect(written).toEqual(snapshot);
  });

  it("reports a corrupt document instead of pretending it does not exist", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "abc123def456.json"), "{ not json", "utf8");
    const result = await createFileSoloDraftStore(dir).load("abc123def456");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("CORRUPT");
  });

  it("surfaces write failures to the caller", async () => {
    const dir = await makeTempDir();
    const blocker = join(dir, "not-a-directory");
    await writeFile(blocker, "", "utf8");
    await expect(createFileSoloDraftStore(blocker).save(snapshot)).rejects.toThrow();
  });
});
