import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { ArchetypeSynergyProfileRegistry } from "../../../src/cubes/archetype-synergy-profile.ts";
import { evaluateDeck } from "../../../src/domain/coaching/deck-evaluation.ts";
import type { CardEvaluationInput } from "../../../src/domain/coaching/types.ts";

const rootDir = resolve(import.meta.dirname, "../../..");

function spell(id: string, name: string, oracleId = id): CardEvaluationInput {
  return { id, oracleId, name, staticScore: 30, colors: [], cmc: 2, isLand: false };
}

function deckWith(spells: readonly CardEvaluationInput[]): readonly CardEvaluationInput[] {
  const paddedSpells = [
    ...spells,
    ...Array.from({ length: 23 - spells.length }, (_, index) =>
      spell(`filler-${String(index)}`, `Carte isolée ${String(index)}`),
    ),
  ];
  const lands = Array.from({ length: 17 }, (_, index): CardEvaluationInput => ({
    id: `land-${String(index)}`,
    name: `Terrain ${String(index)}`,
    staticScore: 30,
    colors: [],
    cmc: 0,
    isLand: true,
  }));
  return [...paddedSpells, ...lands];
}

async function loadProfile(cubeKey: string): Promise<ArchetypeSynergyProfileRegistry> {
  const result = await ArchetypeSynergyProfileRegistry.fromFile(
    resolve(rootDir, `data/cubes/${cubeKey}/archetype-synergy-v1.json`),
  );
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

describe("cube archetype synergy witnesses", () => {
  it("rewards a Titou tribal deck that assembled payoff plus critical mass", async () => {
    const registry = await loadProfile("titou_tribal");
    const goblins = registry.document.archetypes.find(
      (archetype) => archetype.id === "titou:tribal_goblins",
    );
    expect(goblins).toBeDefined();
    if (!goblins) return;
    const coherentCards = goblins.cards
      .filter((card) => card.strength === "key")
      .slice(0, 3)
      .concat(goblins.cards.filter((card) => card.strength === "support").slice(0, 9))
      .map((card, index) => spell(`goblin-${String(index)}`, card.name, card.oracleId));

    const coherent = evaluateDeck(deckWith(coherentCards), {
      synergyProfile: registry.evaluationProfile,
    });
    const samePowerPile = evaluateDeck(deckWith([]), {
      synergyProfile: registry.evaluationProfile,
    });

    expect(coherent.radar.power).toBe(samePowerPile.radar.power);
    expect(coherent.radar.synergy).toBe(100);
    expect(coherent.audit.synergy.bestArchetype?.id).toBe("titou:tribal_goblins");
    expect(coherent.audit.synergy.bestArchetype?.missingRequiredFamilyCount).toBe(0);
    expect(samePowerPile.radar.synergy).toBe(0);
  });

  it("distinguishes complete Reanimator from a pile containing only reanimation spells", async () => {
    const registry = await loadProfile("nico_candyshop");
    const reanimator = registry.document.archetypes.find(
      (archetype) => archetype.id === "nico:reanimator",
    );
    expect(reanimator).toBeDefined();
    if (!reanimator) return;
    const cardsFor = (family: string, count: number) =>
      reanimator.cards
        .filter((card) => card.families.includes(family))
        .slice(0, count)
        .map((card, index) => spell(`${family}-${String(index)}`, card.name, card.oracleId));

    const complete = evaluateDeck(
      deckWith([...cardsFor("outlet", 2), ...cardsFor("reanimation", 2), ...cardsFor("target", 2)]),
      { synergyProfile: registry.evaluationProfile },
    );
    const oneBrickPile = evaluateDeck(deckWith(cardsFor("reanimation", 4)), {
      synergyProfile: registry.evaluationProfile,
    });

    expect(complete.radar.synergy).toBeGreaterThanOrEqual(90);
    expect(complete.audit.synergy.bestArchetype?.missingRequiredFamilyCount).toBe(0);
    expect(oneBrickPile.radar.synergy).toBeLessThanOrEqual(25);
    expect(oneBrickPile.audit.synergy.bestArchetype?.missingRequiredFamilyCount).toBe(2);
  });

  it("does not confuse a Power Nine pile with an assembled Nico artifact deck", async () => {
    const registry = await loadProfile("nico_candyshop");
    const artifacts = registry.document.archetypes.find(
      (archetype) => archetype.id === "nico:artifact_ramp",
    );
    expect(artifacts).toBeDefined();
    if (!artifacts) return;
    const powerNames = new Set([
      "Black Lotus",
      "Mox Pearl",
      "Mox Sapphire",
      "Mox Jet",
      "Mox Ruby",
      "Mox Emerald",
    ]);
    const power = artifacts.cards
      .filter((card) => powerNames.has(card.name))
      .map((card, index) => spell(`power-${String(index)}`, card.name, card.oracleId));

    const evaluation = evaluateDeck(deckWith(power), {
      synergyProfile: registry.evaluationProfile,
    });

    expect(evaluation.radar.synergy).toBeLessThanOrEqual(25);
    expect(evaluation.audit.synergy.bestArchetype?.missingRequiredFamilyCount).toBe(2);
  });

  it("counts nonbasic lands that are functional bricks of the Nico Lands archetype", async () => {
    const registry = await loadProfile("nico_candyshop");
    const landsProfile = registry.document.archetypes.find(
      (archetype) => archetype.id === "nico:lands",
    );
    expect(landsProfile).toBeDefined();
    if (!landsProfile) return;
    const wanted = new Set([
      "Fastbond",
      "Crucible of Worlds",
      "Titania, Protector of Argoth",
      "Dark Depths",
      "Thespian's Stage",
    ]);
    const selected = landsProfile.cards.filter((card) => wanted.has(card.name));
    const spells = selected
      .filter((card) => !["Dark Depths", "Thespian's Stage"].includes(card.name))
      .map((card, index) => spell(`lands-spell-${String(index)}`, card.name, card.oracleId));
    const packageLands = selected
      .filter((card) => ["Dark Depths", "Thespian's Stage"].includes(card.name))
      .map((card, index): CardEvaluationInput => ({
        ...spell(`lands-land-${String(index)}`, card.name, card.oracleId),
        isLand: true,
      }));
    const deck = [...deckWith(spells).slice(0, 23), ...packageLands, ...deckWith([]).slice(23, 38)];

    const evaluation = evaluateDeck(deck, { synergyProfile: registry.evaluationProfile });

    expect(evaluation.radar.synergy).toBe(100);
    expect(evaluation.audit.synergy.bestArchetype?.id).toBe("nico:lands");
    expect(evaluation.audit.synergy.bestArchetype?.keyCards).toEqual(
      expect.arrayContaining(["Dark Depths", "Thespian's Stage"]),
    );
  });
});
