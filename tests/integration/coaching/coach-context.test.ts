import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { createPackEvaluationContext, loadCoachContext } from "../../../src/cubes/coach-context.ts";
import { evaluateCard, evaluatePack } from "../../../src/domain/coaching/dynamic-score.ts";
import type { CardEvaluationInput } from "../../../src/domain/coaching/types.ts";

const rootDir = resolve(process.cwd());

describe("CoachContext", () => {
  it("loads one snapshot-bound Titou context for picks and deck evaluation", async () => {
    const loaded = await loadCoachContext(rootDir, "titou_tribal");

    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;

    const context = loaded.value;
    expect(context.contextVersion).toBe("coach-context@1");
    expect(context.cubeKey).toBe("titou_tribal");
    expect(context.snapshotId).toBe("titou_tribal@2026-02-24.1");
    expect(context.provenance.snapshotSha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(context.provenance.profileSourceSha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(context.provenance.archetypeModelVersion).toBe("archetype-synergy@2");
    expect(context.provenance.catalogCardCount).toBe(1948);

    const unresolved = context.snapshot.cards.filter(
      (card) => context.catalog.getCardByOracleId(card.oracleId) === undefined,
    );
    expect(unresolved).toEqual([]);

    const goblins = context.synergyProfile?.archetypes.find(
      (archetype) => archetype.id === "titou:tribal_goblins",
    );
    expect(goblins).toBeDefined();
    expect(goblins?.requiredFamilies?.map(({ id }) => id)).toEqual([
      "payoff",
      "support",
      "density",
    ]);

    const affinityByName = new Map(goblins?.affinities?.map((card) => [card.name, card]));
    expect(affinityByName.get("Pashalik Mons")?.families).toContain("support");
    expect(affinityByName.get("Skirk Prospector")?.families).toContain("density");
    expect(affinityByName.get("Goblin Grenade")?.roles).not.toContain("body");
    expect(affinityByName.get("Goblin Grenade")?.families).not.toContain("density");
    expect(affinityByName.get("Cabal Slaver")?.roles).not.toContain("body");
    expect(affinityByName.get("Cabal Slaver")?.families).not.toContain("density");

    const packContext = createPackEvaluationContext(context, {
      packNumber: 2,
      pickNumber: 1,
      offeredCards: [],
      priorPool: [],
    });
    expect(packContext.cubeMeta).toBe(context.cubeMeta);
    expect(packContext.synergyProfile).toBe(context.synergyProfile);
    expect(context.deckEvaluationOptions.synergyProfile).toBe(context.synergyProfile);
    expect(context.deckEvaluationOptions.bombThreshold).toBeGreaterThan(0);

    const avacyn = context.catalog.getCardByName("Archangel Avacyn");
    expect(avacyn?.scryfallId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    );
    expect(avacyn?.manaCost).toBe("{3}{W}{W}");
    expect(avacyn?.oracleText).toContain("transform Archangel Avacyn");

    const greenSunsZenith = context.catalog.getCardByName("Green Sun's Zenith");
    expect(greenSunsZenith).toMatchObject({ cmc: 1, manaCost: "{X}{G}" });
  });

  it("uses the versioned archetype profile for pick-time Goblin guidance", async () => {
    const loaded = await loadCoachContext(rootDir, "titou_tribal");
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const context = loaded.value;

    const input = (name: string, id: string): CardEvaluationInput => {
      const card = context.catalog.getCardByName(name);
      if (!card) throw new Error(`Missing test card ${name}`);
      return {
        id,
        name: card.name,
        oracleId: card.oracleId,
        staticScore: card.powerScore.score,
        colors: card.colors,
        cmc: card.cmc,
        types: card.types,
        subtypes: card.subtypes,
        typeLine: card.typeLine,
        isLand: card.isLand,
        producesColors: card.producesColors,
        oracleText: card.oracleText,
        manaCost: card.manaCost,
      };
    };

    const priorPool = [
      "Pashalik Mons",
      "Goblin Rabblemaster",
      "Mad Auntie",
      "Goblin Chieftain",
      "Sling-Gang Lieutenant",
      "Goblin Trashmaster",
      "Skirk Prospector",
    ].map((name, index) => input(name, `pool-${String(index)}`));
    const offeredCards = [
      "Counterspell",
      "Muxus, Goblin Grandee",
      "Goblin Grenade",
      "Cabal Slaver",
    ].map((name, index) => input(name, `offer-${String(index)}`));

    const result = evaluatePack(
      createPackEvaluationContext(context, {
        packNumber: 2,
        pickNumber: 1,
        priorPool,
        offeredCards,
      }),
    );
    const byName = new Map(result.map((card) => [card.name, card]));
    const grenade = byName.get("Goblin Grenade");
    const counterspell = byName.get("Counterspell");
    const cabalSlaver = byName.get("Cabal Slaver");

    expect(grenade?.breakdown.archetypeSynergyBonus).toBeGreaterThan(0);
    expect(grenade?.breakdown.archetypeMatches?.[0]).toMatchObject({
      archetypeId: "titou:tribal_goblins",
      strength: "key",
    });
    if (!grenade || !counterspell) throw new Error("Les témoins de pick sont absents.");
    expect(grenade.dynamicScore).toBeGreaterThan(counterspell.dynamicScore);
    expect(cabalSlaver?.breakdown.tribalPenalty).toBeUndefined();
    expect(cabalSlaver?.breakdown.archetypeMatches?.[0]).toMatchObject({
      archetypeId: "titou:tribal_goblins",
      strength: "support",
    });
  });

  it("uses the cube curve and fixing priorities in pick scoring", async () => {
    const loaded = await loadCoachContext(rootDir, "titou_tribal");
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const context = loaded.value;
    const priorPool: CardEvaluationInput[] = Array.from({ length: 8 }, (_, index) => ({
      id: `expensive-${String(index)}`,
      name: `Expensive ${String(index)}`,
      staticScore: 25,
      colors: ["R"],
      cmc: 5,
      isLand: false,
    }));
    const twoDrop: CardEvaluationInput = {
      id: "two-drop",
      name: "Two Drop",
      staticScore: 25,
      colors: ["R"],
      cmc: 2,
      isLand: false,
    };
    const fiveDrop: CardEvaluationInput = {
      ...twoDrop,
      id: "five-drop",
      name: "Five Drop",
      cmc: 5,
    };
    const dualLand: CardEvaluationInput = {
      id: "dual",
      name: "Gruul Dual",
      staticScore: 25,
      colors: [],
      cmc: 0,
      isLand: true,
      producesColors: ["R", "G"],
    };
    priorPool.push({
      id: "green-spell",
      name: "Green Spell",
      staticScore: 25,
      colors: ["G"],
      cmc: 3,
      isLand: false,
    });

    const base = createPackEvaluationContext(context, {
      packNumber: 2,
      pickNumber: 1,
      offeredCards: [twoDrop, fiveDrop, dualLand],
      priorPool,
    });
    const twoDropResult = evaluateCard(twoDrop, base);
    const fiveDropResult = evaluateCard(fiveDrop, base);
    const dualResult = evaluateCard(dualLand, base);

    expect(twoDropResult.breakdown.curveBonus).toBeGreaterThan(0);
    expect(twoDropResult.breakdown.curveBonus).toBeGreaterThan(fiveDropResult.breakdown.curveBonus);
    expect(dualResult.breakdown.manaFixingBonus).toBe(5);
  });
});
