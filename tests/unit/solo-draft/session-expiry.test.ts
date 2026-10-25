import { afterEach, describe, expect, it, vi } from "vitest";
import {
  soloSessionTtlMs,
  startSoloSessionExpiry,
} from "../../../src/solo-draft/session-expiry.ts";
import { createInMemorySoloDraftStore } from "../../../src/solo-draft/solo-draft-store.ts";

const DAY = 24 * 60 * 60 * 1000;
const snapshot = {
  sessionId: "abc123def456",
  seed: 42,
  playerName: "Expiry Tester",
  humanPicks: [],
};

afterEach(() => {
  vi.useRealTimers();
});

describe("soloSessionTtlMs", () => {
  it("defaults to 7 days and accepts a positive SOLO_SESSION_TTL_DAYS", () => {
    expect(soloSessionTtlMs({})).toBe(7 * DAY);
    expect(soloSessionTtlMs({ SOLO_SESSION_TTL_DAYS: "30" })).toBe(30 * DAY);
    expect(soloSessionTtlMs({ SOLO_SESSION_TTL_DAYS: "0" })).toBe(7 * DAY);
    expect(soloSessionTtlMs({ SOLO_SESSION_TTL_DAYS: "soon" })).toBe(7 * DAY);
  });
});

describe("startSoloSessionExpiry", () => {
  it("purges expired sessions at start and then on every interval", async () => {
    vi.useFakeTimers();
    let now = Date.parse("2026-10-01T00:00:00Z");
    const store = createInMemorySoloDraftStore({ now: () => now });
    await store.save(snapshot);
    const logs: string[] = [];

    const stop = startSoloSessionExpiry(store, {
      maxAgeMs: 7 * DAY,
      intervalMs: 6 * 60 * 60 * 1000,
      now: () => now,
      log: (message) => logs.push(message),
    });
    await vi.advanceTimersByTimeAsync(0);
    expect((await store.load(snapshot.sessionId)).ok).toBe(true);

    now += 8 * DAY;
    await vi.advanceTimersByTimeAsync(6 * 60 * 60 * 1000);
    expect(await store.load(snapshot.sessionId)).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(logs.join("\n")).toMatch(/1 session/u);
    stop();
  });

  it("logs a failed purge instead of crashing the server", async () => {
    vi.useFakeTimers();
    const store = {
      ...createInMemorySoloDraftStore(),
      removeExpired: () => Promise.reject(new Error("disk unavailable")),
    };
    const logs: string[] = [];
    const stop = startSoloSessionExpiry(store, {
      maxAgeMs: DAY,
      intervalMs: 1000,
      log: (message) => logs.push(message),
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(logs.join("\n")).toMatch(/disk unavailable/u);
    stop();
  });
});
