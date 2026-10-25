import { describe, expect, it } from "vitest";
import { SoloDraftSession } from "../../../src/solo-draft/solo-draft-session.ts";
import type { SoloResultOutputs } from "../../../src/solo-draft/solo-result-outputs.ts";
import type { LeaderboardEntry } from "../../../src/solo-draft/solo-draft-types.ts";

const LAND_RATIONALE = "Deck de test : terrains draftés conservés tels quels.";

async function draftToDeckbuilding(playerName: string): Promise<SoloDraftSession> {
  const session = await SoloDraftSession.create({ playerName, seed: 42 });
  for (let round = 0; round < 45; round++) {
    const card = session.getStateDto().currentBooster[0];
    if (!card) throw new Error("Booster card missing");
    session.makePick(card.instanceId, { prefetchAdvice: false });
  }
  return session;
}

function maindeckOf(session: SoloDraftSession): string[] {
  return session
    .getStateDto()
    .playerPool.slice(0, 23)
    .map((card) => card.instanceId);
}

/** Records every call; each step can be told to fail a given number of times. */
function createFakeOutputs(failures: { admin?: number; leaderboard?: number } = {}) {
  const calls = { reports: 0, admin: 0, leaderboard: 0 };
  const remaining = { admin: failures.admin ?? 0, leaderboard: failures.leaderboard ?? 0 };
  const entries = new Map<string, LeaderboardEntry>();
  const outputs: SoloResultOutputs = {
    writeReports: (_report, baseName) => {
      calls.reports++;
      return Promise.resolve({
        walkthroughPath: `/tmp/${baseName}.html`,
        boostersPath: `/tmp/${baseName}-boosters.html`,
        walkthroughUrl: `/reports/${baseName}.html`,
        boostersUrl: `/reports/${baseName}-boosters.html`,
      });
    },
    recordAdminDraft: () => {
      calls.admin++;
      if (remaining.admin > 0) {
        remaining.admin--;
        return Promise.reject(new Error("admin archive unavailable"));
      }
      return Promise.resolve();
    },
    publishLeaderboard: (entryId, payload) => {
      calls.leaderboard++;
      if (remaining.leaderboard > 0) {
        remaining.leaderboard--;
        return Promise.reject(new Error("leaderboard unavailable"));
      }
      const entry: LeaderboardEntry = { ...payload, id: entryId, rank: 1 };
      entries.set(entryId, entry);
      return Promise.resolve({ entry, isNewHighScore: true });
    },
  };
  return { outputs, calls, entries };
}

describe("Solo locked result", () => {
  it("locks the result once and finishes failed outputs on retry without recomputing", async () => {
    const session = await draftToDeckbuilding("Retry Tester");
    const fake = createFakeOutputs({ admin: 1 });
    const input = {
      sessionId: session.sessionId,
      maindeckCardInstanceIds: maindeckOf(session),
      landCountRationale: LAND_RATIONALE,
      publishToLeaderboard: true,
    };

    await expect(session.buildDeckAndFinalize(input, { outputs: fake.outputs })).rejects.toThrow(
      /admin archive unavailable/u,
    );
    // The result is locked as soon as the reports exist: no second evaluation.
    expect(session.status).toBe("completed");
    const pending = session.getPersistenceSnapshot().lockedResult;
    expect(pending?.publication).toEqual({ adminRecorded: false, leaderboardPublished: false });

    const retried = await session.buildDeckAndFinalize(input, { outputs: fake.outputs });
    expect(fake.calls).toEqual({ reports: 1, admin: 2, leaderboard: 1 });
    expect(retried.evaluation).toEqual(pending?.result.evaluation);
    expect(retried.isPublished).toBe(true);
    expect(fake.entries.size).toBe(1);
    expect(session.getPersistenceSnapshot().lockedResult?.publication).toEqual({
      adminRecorded: true,
      leaderboardPublished: true,
    });
  }, 30_000);

  it("publishes a training result later exactly once, even when asked twice", async () => {
    const session = await draftToDeckbuilding("Late Publisher");
    const fake = createFakeOutputs();
    const result = await session.buildDeckAndFinalize(
      {
        sessionId: session.sessionId,
        maindeckCardInstanceIds: maindeckOf(session),
        landCountRationale: LAND_RATIONALE,
      },
      { outputs: fake.outputs },
    );
    expect(result.isPublished).toBe(false);
    expect(fake.calls.leaderboard).toBe(0);

    const first = await session.publishToLeaderboard(fake.outputs);
    const second = await session.publishToLeaderboard(fake.outputs);
    expect(second).toEqual(first);
    expect(fake.calls.leaderboard).toBe(1);
    expect(first.entry.id).toBe(`rec-${session.sessionId}`);
  }, 30_000);

  it("restores a locked result from its snapshot, including timing, and can still publish it", async () => {
    const session = await draftToDeckbuilding("Restart Survivor");
    const fake = createFakeOutputs();
    const result = await session.buildDeckAndFinalize(
      {
        sessionId: session.sessionId,
        maindeckCardInstanceIds: maindeckOf(session),
        landCountRationale: LAND_RATIONALE,
      },
      { outputs: fake.outputs },
    );
    const snapshot = JSON.parse(JSON.stringify(session.getPersistenceSnapshot())) as ReturnType<
      typeof session.getPersistenceSnapshot
    >;

    const restored = await SoloDraftSession.restore(snapshot);
    expect(restored.status).toBe("completed");
    expect(restored.startedAtTimestamp).toBe(session.startedAtTimestamp);
    expect(restored.draftDurationSeconds).toBe(session.draftDurationSeconds);

    const published = await restored.publishToLeaderboard(fake.outputs);
    expect(published.entry.overallScore).toBe(result.evaluation.overallScore);
    expect(fake.calls.reports).toBe(1);
  }, 30_000);

  it("restores a randomized table exactly, so replayed picks see the same boosters", async () => {
    const session = await SoloDraftSession.create({
      playerName: "Random Table",
      seed: 1234,
      randomizeSeats: true,
    });
    for (let round = 0; round < 20; round++) {
      const card = session.getStateDto().currentBooster[0];
      if (!card) throw new Error("Booster card missing");
      session.makePick(card.instanceId, { prefetchAdvice: false });
    }
    const snapshot = JSON.parse(JSON.stringify(session.getPersistenceSnapshot())) as ReturnType<
      typeof session.getPersistenceSnapshot
    >;

    const restored = await SoloDraftSession.restore(snapshot);
    const ids = (s: SoloDraftSession) => s.getStateDto().currentBooster.map((c) => c.instanceId);
    expect(restored.roundIndex).toBe(20);
    expect(ids(restored)).toEqual(ids(session));
  }, 30_000);

  it("refuses to publish before a result is locked", async () => {
    const session = await SoloDraftSession.create({ playerName: "Too Early", seed: 42 });
    await expect(session.publishToLeaderboard(createFakeOutputs().outputs)).rejects.toThrow(
      /Aucun résultat/u,
    );
  });

  it("keeps lifecycle fields read-only for callers", async () => {
    const session = await SoloDraftSession.create({ playerName: "Read Only", seed: 42 });
    expect(() => {
      // @ts-expect-error status is owned by the session
      session.status = "completed";
    }).toThrow(TypeError);
    expect(() => {
      // @ts-expect-error Homologation can only be lost through Coaching
      session.isHomologated = false;
    }).toThrow(TypeError);
    expect(() => {
      // @ts-expect-error picks are recorded by makePick only
      session.humanPicks.push("forged"); // eslint-disable-line @typescript-eslint/no-unsafe-call
    }).toThrow(TypeError);
    expect(session.status).toBe("drafting");
    expect(session.isHomologated).toBe(true);
    expect(session.humanPicks).toEqual([]);
  });
});
