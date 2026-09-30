import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

import { loadCoachContext } from "../../src/cubes/coach-context.ts";
import { analyzeDeckText } from "../../src/deck-lab/analyze-deck.ts";
import { SoloDraftSession } from "../../src/solo-draft/solo-draft-session.ts";

describe("draft and Deck Lab engine parity", () => {
  it("rates a finalized Solo deck identically and proposes the same local build", async () => {
    const loaded = await loadCoachContext(process.cwd(), "titou_tribal");
    if (!loaded.ok) throw new Error(loaded.error.message);
    const context = loaded.value;
    const catalog = { resolveCard: (name: string) => context.catalog.getCardByName(name) };
    const session = await SoloDraftSession.create({ playerName: "Parity", seed: 42 });
    for (let round = 0; round < 45; round++) {
      const card = session.getStateDto().currentBooster[0];
      if (!card) throw new Error("Missing draft booster");
      session.makePick(card.instanceId, { prefetchAdvice: false });
    }
    const pool = session.getStateDto().playerPool;
    const recommendation = session.getDeckRecommendation();
    const selected = new Set(recommendation.maindeckCardInstanceIds);
    const selectedCards = recommendation.maindeckCardInstanceIds.map((id) => {
      const card = pool.find((candidate) => candidate.instanceId === id);
      if (!card) throw new Error("Recommendation contains a card outside the pool");
      return card;
    });
    const deckText = [
      "Deck",
      ...selectedCards.map((card) => `1 ${card.name}`),
      ...Object.entries(recommendation.basicLands)
        .filter(([, count]) => count > 0)
        .map(([name, count]) => `${String(count)} ${name}`),
    ].join("\n");
    const rate = analyzeDeckText(deckText, "rate", catalog, context.deckEvaluationOptions);
    const scratchRoot = resolve(".scratch");
    await mkdir(scratchRoot, { recursive: true });
    const directory = await mkdtemp(join(scratchRoot, "deck-parity-"));
    try {
      const finalized = await session.buildDeckAndFinalize(
        {
          sessionId: session.sessionId,
          maindeckCardInstanceIds: recommendation.maindeckCardInstanceIds,
          basicLands: recommendation.basicLands,
          landCountRationale: "Construction adaptative du moteur commun.",
          publishToLeaderboard: false,
        },
        {
          customReportsDir: directory,
          customAdminDraftsPath: join(directory, "admin.json"),
        },
      );
      expect(finalized.evaluation.radar).toEqual(rate.rating.axes);
      expect(finalized.evaluation.overallScore).toBe(rate.rating.score);
      expect(finalized.evaluation.audit).toEqual(rate.rating.audit);

      const pimp = analyzeDeckText(
        `Deck\n${pool.map((card) => `1 ${card.name}`).join("\n")}`,
        "pimp",
        catalog,
        context.deckEvaluationOptions,
      );
      if (!("build" in pimp)) throw new Error("Missing Pimp build");
      expect(pimp.build.final.map((card) => card.name).sort()).toEqual(
        pool
          .filter((card) => selected.has(card.instanceId))
          .map((card) => card.name)
          .sort(),
      );
      expect(pimp.build.basicLands).toEqual(recommendation.basicLands);
    } finally {
      if (!directory.startsWith(`${scratchRoot}${sep}`))
        throw new Error("Unsafe test cleanup path");
      await rm(directory, { recursive: true, force: true });
    }
  }, 15_000);
});
