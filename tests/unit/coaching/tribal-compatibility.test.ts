import { describe, expect, it } from "vitest";
import {
  isTribalCube,
  detectDraftedTribalContext,
  isCardTriballyIncompatible,
  COMPATIBLE_TRIBE_MAP,
} from "../../../src/domain/coaching/tribal-compatibility.ts";
import { buildDraftAdvicePrompt } from "../../../src/companion/coach-prompts.ts";
import { getUnifiedDraftAdvice } from "../../../src/domain/coaching/draft-coach-service.ts";
import type { CardEvaluationInput } from "../../../src/domain/coaching/types.ts";
import type { CompanionCard } from "../../../src/companion/card-resolver.ts";

describe("Tribal Compatibility Rules & AI Coach Input", () => {
  const goblinGuide: CardEvaluationInput = {
    id: "goblin-guide",
    name: "Goblin Guide",
    staticScore: 45,
    colors: ["R"],
    cmc: 1,
    types: ["Creature"],
    subtypes: ["Goblin", "Scout"],
    typeLine: "Creature — Goblin Scout",
    oracleText: "Haste. Whenever Goblin Guide attacks, defending player reveals top card...",
  };

  const goblinChieftain: CardEvaluationInput = {
    id: "goblin-chieftain",
    name: "Goblin Chieftain",
    staticScore: 42,
    colors: ["R"],
    cmc: 3,
    types: ["Creature"],
    subtypes: ["Goblin"],
    typeLine: "Creature — Goblin",
    oracleText: "Haste. Other Goblin creatures you control get +1/+1 and have haste.",
  };

  const muxus: CardEvaluationInput = {
    id: "muxus",
    name: "Muxus, Goblin Grandee",
    staticScore: 46,
    colors: ["R"],
    cmc: 6,
    types: ["Creature"],
    subtypes: ["Goblin", "Noble"],
    typeLine: "Legendary Creature — Goblin Noble",
    oracleText: "When Muxus enters, reveal top six cards...",
  };

  const immerwolf: CardEvaluationInput = {
    id: "immerwolf",
    name: "Immerwolf",
    staticScore: 40,
    colors: ["R", "G"],
    cmc: 3,
    types: ["Creature"],
    subtypes: ["Wolf"],
    typeLine: "Creature — Wolf",
    oracleText: "Other Wolf and Werewolf creatures you control get +1/+1.",
  };

  const glorybringer: CardEvaluationInput = {
    id: "glorybringer",
    name: "Glorybringer",
    staticScore: 44,
    colors: ["R"],
    cmc: 5,
    types: ["Creature"],
    subtypes: ["Dragon"],
    typeLine: "Creature — Dragon",
    oracleText: "Flying, haste. Exert Glorybringer to deal 4 damage to target non-Dragon.",
  };

  const spikefieldHazard: CardEvaluationInput = {
    id: "spikefield-hazard",
    name: "Spikefield Hazard",
    staticScore: 38,
    colors: ["R"],
    cmc: 1,
    types: ["Instant"],
    subtypes: [],
    typeLine: "Instant // Land",
    isLand: false,
    oracleText: "Spikefield Hazard deals 1 damage to any target. If it would die, exile it.",
  };

  const championOfParish: CardEvaluationInput = {
    id: "champion-parish",
    name: "Champion of the Parish",
    staticScore: 41,
    colors: ["W"],
    cmc: 1,
    types: ["Creature"],
    subtypes: ["Human", "Soldier"],
    typeLine: "Creature — Human Soldier",
    oracleText: "Whenever another Human enters under your control, put a +1/+1 counter...",
  };

  const serraAngel: CardEvaluationInput = {
    id: "serra-angel",
    name: "Serra Angel",
    staticScore: 39,
    colors: ["W"],
    cmc: 5,
    types: ["Creature"],
    subtypes: ["Angel"],
    typeLine: "Creature — Angel",
    oracleText: "Flying, vigilance.",
  };

  const snapcasterMage: CardEvaluationInput = {
    id: "snapcaster-mage",
    name: "Snapcaster Mage",
    staticScore: 43,
    colors: ["U"],
    cmc: 2,
    types: ["Creature"],
    subtypes: ["Human", "Wizard"],
    typeLine: "Creature — Human Wizard",
    oracleText: "Flash. When Snapcaster Mage enters, target instant or sorcery gets flashback.",
  };

  it("identifies Titou Tribal as a tribal cube, and standard cubes as non-tribal", () => {
    expect(isTribalCube("titou_tribal")).toBe(true);
    expect(isTribalCube("cedric_cube")).toBe(false);
    expect(isTribalCube("nico_candyshop")).toBe(false);
    expect(isTribalCube("hugues_pauper")).toBe(false);
    expect(isTribalCube(undefined)).toBe(false);
    expect(isTribalCube("custom_cube", { dominantMechanics: ["Tribal", "Lifegain"] })).toBe(true);
  });

  it("defines the exact compatible tribal pairs according to user rules", () => {
    expect(COMPATIBLE_TRIBE_MAP.Goblin).toEqual(["Goblin", "Dragon"]);
    expect(COMPATIBLE_TRIBE_MAP.Dragon).toEqual(["Dragon", "Goblin"]);
    expect(COMPATIBLE_TRIBE_MAP.Human).toEqual(["Human", "Angel", "Wizard"]);
    expect(COMPATIBLE_TRIBE_MAP.Angel).toEqual(["Angel", "Human"]);
    expect(COMPATIBLE_TRIBE_MAP.Wizard).toEqual(["Wizard", "Human"]);
  });

  it("detects tribal commitment when drafting Goblins on titou_tribal", () => {
    const context = detectDraftedTribalContext(
      [goblinGuide, goblinChieftain, muxus],
      "titou_tribal",
    );

    expect(context.isTribalCube).toBe(true);
    expect(context.isTribalEngaged).toBe(true);
    expect(context.dominantTribes).toEqual(["Goblin"]);
    expect(context.compatibleTribes).toContain("Goblin");
    expect(context.compatibleTribes).toContain("Dragon");
    expect(context.incompatibleTribes).toContain("Wolf");
    expect(context.incompatibleTribes).toContain("Elf");
    expect(context.incompatibleTribes).toContain("Zombie");
    expect(context.incompatibleTribes).toContain("Human");
    expect(context.promptGuideline).toContain("Gobelins + Dragons");
    expect(context.promptGuideline).toContain("Immerwolf");
  });

  it("does not engage tribal restrictions on a non-tribal cube even with multiple Goblins", () => {
    const context = detectDraftedTribalContext(
      [goblinGuide, goblinChieftain, muxus],
      "cedric_cube",
    );

    expect(context.isTribalCube).toBe(false);
    expect(context.isTribalEngaged).toBe(false);
  });

  it("detects Human & Wizard or Human & Angel compatible synergies", () => {
    const contextHW = detectDraftedTribalContext(
      [championOfParish, snapcasterMage, { ...snapcasterMage, id: "wiz-2" }],
      "titou_tribal",
    );
    expect(contextHW.isTribalEngaged).toBe(true);
    expect(contextHW.compatibleTribes).toContain("Human");
    expect(contextHW.compatibleTribes).toContain("Wizard");
    expect(contextHW.compatibleTribes).toContain("Angel");
    expect(contextHW.incompatibleTribes).toContain("Goblin");
  });

  it("correctly flags incompatible cards for a Goblin player", () => {
    const context = detectDraftedTribalContext([goblinGuide, goblinChieftain], "titou_tribal");

    // Immerwolf is a Wolf -> incompatible for Goblin drafter!
    expect(isCardTriballyIncompatible(immerwolf, context)).toBe(true);

    // Champion of the Parish is a Human -> incompatible for Goblin drafter!
    expect(isCardTriballyIncompatible(championOfParish, context)).toBe(true);

    // Glorybringer is a Dragon -> COMPATIBLE for Goblin drafter (Gobelins & Dragons)!
    expect(isCardTriballyIncompatible(glorybringer, context)).toBe(false);

    // Spikefield Hazard is a neutral MDFC instant/land -> COMPATIBLE!
    expect(isCardTriballyIncompatible(spikefieldHazard, context)).toBe(false);
  });

  it("allows Angels and Wizards for a Human player, and rejects Goblins", () => {
    const context = detectDraftedTribalContext(
      [championOfParish, { ...championOfParish, id: "thalia", name: "Thalia" }],
      "titou_tribal",
    );

    // Serra Angel -> Compatible (Humains & Anges)!
    expect(isCardTriballyIncompatible(serraAngel, context)).toBe(false);

    // Snapcaster Mage -> Compatible (Humains & Wizards)!
    expect(isCardTriballyIncompatible(snapcasterMage, context)).toBe(false);

    // Goblin Guide -> Incompatible!
    expect(isCardTriballyIncompatible(goblinGuide, context)).toBe(true);
  });

  it("formats buildDraftAdvicePrompt with tribal rules on titou_tribal", () => {
    const toComp = (c: CardEvaluationInput): CompanionCard => ({
      grpId: 1,
      name: c.name,
      manaCost: c.manaCost ?? "",
      cmc: c.cmc ?? 0,
      rarity: 2,
      colors: c.colors,
      isLand: Boolean(c.isLand),
      imageUrl: "",
      oracleText: c.oracleText,
      typeLine: c.typeLine,
      powerScore: c.staticScore,
    });

    const pool = [toComp(goblinGuide), toComp(goblinChieftain)];
    const pack = [toComp(spikefieldHazard), toComp(glorybringer), toComp(immerwolf)];

    const { system, user } = buildDraftAdvicePrompt(pack, pool, 2, 1, {
      cubeKey: "titou_tribal",
    });

    expect(system).toContain("RÈGLES STRICTES DE COMPATIBILITÉ TRIBALE");
    expect(system).toContain("Gobelins & Dragons");
    expect(system).toContain("Humains & Anges");
    expect(system).toContain("Humains & Sorciers / Wizards");
    expect(system).toContain("Immerwolf");

    expect(user).toContain("CONSIGNES STRICTES DE COMPATIBILITÉ TRIBALE");
    expect(user).toContain("Gobelin");
  });

  it("filters out Immerwolf in getUnifiedDraftAdvice when drafting Goblins on titou_tribal", async () => {
    const advice = await getUnifiedDraftAdvice({
      packCards: [immerwolf, spikefieldHazard, glorybringer],
      priorPool: [goblinGuide, goblinChieftain, muxus],
      packNumber: 2,
      pickNumber: 2,
      evaluationContext: {
        cubeKey: "titou_tribal",
      },
      skipLlm: true,
    });

    // Top pick must NOT be Immerwolf (it is an incompatible Wolf)
    expect(advice.topPickId).not.toBe("immerwolf");
    expect(advice.topPickName).not.toBe("Immerwolf");

    // Alternatives must not contain Immerwolf either
    const altNames = advice.alternatives.map((a) => a.name);
    expect(altNames).not.toContain("Immerwolf");
  });
});
