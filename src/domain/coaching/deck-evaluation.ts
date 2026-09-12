import {
  scoreToTier,
  type CardEvaluationInput,
  type CurveAxisAudit,
  type DeckSynergyProfile,
  type DeckArchetype,
  type DeckEvaluation,
  type DeckEvaluationOptions,
  type InteractionAxisAudit,
  type InteractionCoverage,
  type KiviatRadarScores,
  type ManaAxisAudit,
  type ManaFixerAuditEntry,
  type MtGColor,
  type PowerAxisAudit,
  type StrategicPackageAudit,
  type SynergyAxisAudit,
} from "./types.ts";
import { MAX_POWER_SCORE } from "../../cards/power-harmonizer.ts";
import { detectArchetype } from "./deck-archetypes.ts";
import { ALL_COLORS, getEffectiveProducingColors } from "./dynamic-score.ts";
import {
  assertCubeLeagueMembership,
  classifyLeagueTier,
  validateLeagueCalibration,
} from "./league-calibration.ts";

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

const DECK_AXIS_WEIGHTS = [
  ["power", 0.2],
  ["synergy", 0.25],
  ["curve", 0.2],
  ["mana", 0.2],
  ["interaction", 0.15],
] as const satisfies readonly (readonly [keyof KiviatRadarScores, number])[];

function isManaDorkOrRock(card: CardEvaluationInput): boolean {
  if (card.isLand) return false;
  const produces = getEffectiveProducingColors(card);
  const text = (card.oracleText ?? "").toLowerCase();
  if (/(?:\{o?t\}|ot|sacrifice [^:]+): add/i.test(text)) return (card.cmc ?? 0) <= 3;
  if (/search your library for (?:(?:a|two) )?basic land/i.test(text)) return true;
  return (
    text.length === 0 &&
    produces.length > 0 &&
    (card.cmc ?? 0) <= 3 &&
    [card.types?.includes("Creature"), card.typeLine?.includes("Artifact")].some(Boolean)
  );
}

const INTERACTION_COVERAGE_ORDER: readonly InteractionCoverage[] = [
  "créatures",
  "permanents",
  "pile",
  "main",
  "cimetières",
  "sweeper",
];

function classifyInteraction(card: CardEvaluationInput): readonly InteractionCoverage[] {
  const text = (card.oracleText ?? "").toLowerCase();
  const coverage = new Set<InteractionCoverage>();
  if (
    /target creature|all creatures|damage to (?:any|target)|target .* gets? (?:<[^>]+>)*-\d|sacrifices? (?:(?:a|target) )?creatures?/.test(
      text,
    )
  ) {
    coverage.add("créatures");
  }
  if (
    /(?:destroy|exile|return|put) target (?:nonland )?permanent|(?:gain control of |target )(?:artifact|enchantment|planeswalker)/.test(
      text,
    )
  ) {
    coverage.add("permanents");
  }
  if (/counter target|return target spell/.test(text)) coverage.add("pile");
  if (
    /target player[^.]*discard|opponent[^.]*discard|players discard|reveals? (?:their|his|her) hand|look at target opponent's hand/.test(
      text,
    )
  ) {
    coverage.add("main");
  }
  if (/exile target card from (?:a|target player's) graveyard/.test(text)) {
    coverage.add("cimetières");
  }
  if (/(?:destroy|exile) all|players[^.]*sacrifice creatures/.test(text)) coverage.add("sweeper");
  return INTERACTION_COVERAGE_ORDER.filter((category) => coverage.has(category));
}

function roundTo(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function mean(values: readonly number[], fallback = 0): number {
  return values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : fallback;
}

function normalizeStaticScore(score: number): number {
  return clamp((score / MAX_POWER_SCORE) * 100);
}

function estimateFastManaGain(card: CardEvaluationInput): number {
  if (card.isLand || (card.cmc ?? 0) > 1) return 0;
  const text = card.oracleText ?? "";
  if (!/\badd\b/i.test(text)) return 0;

  const wordAmount = /\badd (one|two|three|four|five) mana\b/i.exec(text)?.[1]?.toLowerCase();
  const amounts: Readonly<Record<string, number>> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
  };
  if (wordAmount) return amounts[wordAmount] ?? 1;

  const addClause = /\badd\b(?<mana>[^.\n]*)/i.exec(text)?.groups?.mana ?? "";
  const symbolCount = addClause.match(/\{(?:[WUBRGC]|\d+)\}|o[WUBRGC]/gi)?.length ?? 0;
  if (symbolCount > 0) return symbolCount;
  return (card.producesColors?.length ?? 0) > 0 ? 1 : 0;
}

function analyzePower(
  spells: readonly CardEvaluationInput[],
  bombThreshold: number | undefined,
): { readonly score: number; readonly audit: PowerAxisAudit } {
  const scores = spells
    .map((card) => card.staticScore)
    .filter((score) => Number.isFinite(score))
    .sort((a, b) => a - b);
  const meanStaticScore = mean(scores, 30);
  const middle = Math.floor(scores.length / 2);
  const medianStaticScore =
    scores.length === 0
      ? 30
      : scores.length % 2 === 0
        ? mean([scores[middle - 1] ?? 30, scores[middle] ?? 30], 30)
        : (scores[middle] ?? 30);
  const topFiveMean = mean(scores.slice(-Math.min(5, scores.length)), meanStaticScore);
  const bombCards =
    bombThreshold === undefined
      ? []
      : spells
          .filter((card) => card.staticScore >= bombThreshold)
          .map((card) => card.name)
          .sort((a, b) => a.localeCompare(b));
  const fastManaCards = spells
    .map((card) => ({ name: card.name, manaGain: estimateFastManaGain(card) }))
    .filter((card) => card.manaGain > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  const averageQuality = normalizeStaticScore(meanStaticScore);
  const ceiling = normalizeStaticScore(topFiveMean);
  const medianQuality = normalizeStaticScore(medianStaticScore);
  const bombDensityBonus = bombThreshold === undefined ? 0 : Math.min(12, bombCards.length * 2.5);
  const totalFastMana = fastManaCards.reduce((sum, card) => sum + card.manaGain, 0);
  const fastManaBonus = Math.min(10, totalFastMana * 1.5);
  const score = clamp(
    averageQuality * 0.4 + ceiling * 0.4 + medianQuality * 0.2 + bombDensityBonus + fastManaBonus,
  );

  return {
    score,
    audit: {
      meanStaticScore: roundTo(meanStaticScore),
      medianStaticScore: roundTo(medianStaticScore),
      topFiveMean: roundTo(topFiveMean),
      bombThreshold: bombThreshold ?? null,
      bombCards,
      fastManaCards,
      components: {
        averageQuality,
        ceiling,
        medianQuality,
        bombDensityBonus: roundTo(bombDensityBonus),
        fastManaBonus: roundTo(fastManaBonus),
      },
    },
  };
}

function isCreature(card: CardEvaluationInput): boolean {
  return card.types?.includes("Creature") ?? card.typeLine?.includes("Creature") ?? false;
}

function isCreatureCheatEnabler(card: CardEvaluationInput): boolean {
  const text = (card.oracleText ?? "").toLowerCase();
  return (
    /put (?:an? )?(?:artifact, )?creature(?:, enchantment, or land)? card from (?:your|their) hand onto the battlefield/.test(
      text,
    ) ||
    (text.includes("each player may put") && text.includes("from their hand onto the battlefield"))
  );
}

function isSelectionOrTutor(card: CardEvaluationInput): boolean {
  const text = (card.oracleText ?? "").toLowerCase();
  return /search your library|draw (?:a|one|two|three|\d+) card|scry|surveil|look at the top/.test(
    text,
  );
}

function isGraveyardSetup(card: CardEvaluationInput): boolean {
  const text = (card.oracleText ?? "").toLowerCase();
  return (
    /put (?:that|a|target) card into your graveyard/.test(text) ||
    /additional cost[^.]*discard a card/.test(text)
  );
}

function isReanimationEffect(card: CardEvaluationInput): boolean {
  const text = (card.oracleText ?? "").toLowerCase();
  return /(?:put|return) target creature card from (?:a|your) graveyard (?:onto|to) the battlefield/.test(
    text,
  );
}

function analyzeStrategicPackages(
  spells: readonly CardEvaluationInput[],
): readonly StrategicPackageAudit[] {
  const packages: StrategicPackageAudit[] = [];
  const cheatEnablers = spells.filter(isCreatureCheatEnabler);
  const cheatPayoffs = spells.filter((card) => isCreature(card) && (card.cmc ?? 0) >= 7);

  if (cheatEnablers.length > 0 && cheatPayoffs.length >= 2) {
    const supportCards = spells.filter(
      (card) =>
        !cheatEnablers.includes(card) && !cheatPayoffs.includes(card) && isSelectionOrTutor(card),
    );
    const contribution = Math.min(
      12,
      cheatEnablers.length * 2.5 + cheatPayoffs.length + Math.min(4, supportCards.length * 0.5),
    );
    const fragilityPenalty = cheatEnablers.length === 1 ? Math.min(4, cheatPayoffs.length - 1) : 0;
    packages.push({
      id: "creature-cheat",
      label: "Triche de créatures",
      enablers: cheatEnablers.map((card) => card.name),
      payoffs: cheatPayoffs.map((card) => card.name),
      supportCards: supportCards.map((card) => card.name),
      contribution: roundTo(contribution),
      fragilityPenalty,
    });
  }

  const graveyardSetup = spells.filter(isGraveyardSetup);
  const reanimationEffects = spells.filter(isReanimationEffect);
  const reanimationPayoffs = spells.filter((card) => isCreature(card) && (card.cmc ?? 0) >= 6);
  if (
    graveyardSetup.length > 0 &&
    reanimationEffects.length > 0 &&
    reanimationPayoffs.length >= 2
  ) {
    const contribution = Math.min(
      12,
      graveyardSetup.length * 2 + reanimationEffects.length * 2.5 + reanimationPayoffs.length,
    );
    const fragilityPenalty =
      graveyardSetup.length === 1 || reanimationEffects.length === 1
        ? Math.min(4, reanimationPayoffs.length - 1)
        : 0;
    packages.push({
      id: "reanimation",
      label: "Réanimation",
      enablers: graveyardSetup.map((card) => card.name),
      payoffs: reanimationPayoffs.map((card) => card.name),
      supportCards: reanimationEffects.map((card) => card.name),
      contribution: roundTo(contribution),
      fragilityPenalty,
    });
  }

  const equipmentTutors = spells.filter((card) =>
    /search your library for an? equipment card/i.test(card.oracleText ?? ""),
  );
  const equipmentPayoffs = spells.filter((card) => card.typeLine?.includes("Equipment"));
  if (equipmentTutors.length > 0 && equipmentPayoffs.length > 0) {
    const carriers = spells.filter(
      (card) => !equipmentTutors.includes(card) && isCreature(card) && (card.cmc ?? 0) <= 3,
    );
    packages.push({
      id: "equipment-tutor",
      label: "Tuteur d'équipements",
      enablers: equipmentTutors.map((card) => card.name),
      payoffs: equipmentPayoffs.map((card) => card.name),
      supportCards: carriers.map((card) => card.name),
      contribution: roundTo(
        Math.min(
          10,
          equipmentTutors.length * 3 + equipmentPayoffs.length * 2 + carriers.length * 0.15,
        ),
      ),
      fragilityPenalty: equipmentPayoffs.length === 1 && carriers.length < 4 ? 2 : 0,
    });
  }

  const rampEnablers = spells.filter(isManaDorkOrRock);
  const rampPayoffs = spells.filter((card) => (card.cmc ?? 0) >= 6);
  if (rampEnablers.length >= 3 && rampPayoffs.length >= 2) {
    const rampSupport = spells.filter(
      (card) =>
        !rampEnablers.includes(card) && !rampPayoffs.includes(card) && isSelectionOrTutor(card),
    );
    packages.push({
      id: "mana-ramp",
      label: "Accélération vers payoffs",
      enablers: rampEnablers.map((card) => card.name),
      payoffs: rampPayoffs.map((card) => card.name),
      supportCards: rampSupport.map((card) => card.name),
      contribution: roundTo(
        Math.min(
          12,
          rampEnablers.length * 0.8 + rampPayoffs.length * 1.2 + rampSupport.length * 0.5,
        ),
      ),
      fragilityPenalty: rampEnablers.length < rampPayoffs.length ? 2 : 0,
    });
  }

  const drawDenialCards = spells.filter((card) => {
    const text = (card.oracleText ?? "").toLowerCase();
    return /opponent would draw a card[^.]*instead/.test(text);
  });
  const wheelCards = spells.filter((card) => {
    const text = (card.oracleText ?? "").toLowerCase();
    return /each player[^.]*draws? (?:seven|7) cards/.test(text);
  });
  if (drawDenialCards.length > 0 && wheelCards.length > 0) {
    const wheelSupport = spells.filter(
      (card) =>
        !drawDenialCards.includes(card) &&
        !wheelCards.includes(card) &&
        /draw (?:a|one|two|three|\d+) card[^.]*discard/i.test(card.oracleText ?? ""),
    );
    packages.push({
      id: "asymmetric-wheel",
      label: "Pioche asymétrique",
      enablers: drawDenialCards.map((card) => card.name),
      payoffs: wheelCards.map((card) => card.name),
      supportCards: wheelSupport.map((card) => card.name),
      contribution: roundTo(
        Math.min(
          10,
          drawDenialCards.length * 3 + wheelCards.length * 3 + wheelSupport.length * 0.5,
        ),
      ),
      fragilityPenalty: drawDenialCards.length === 1 && wheelCards.length === 1 ? 2 : 0,
    });
  }

  return packages;
}

const DEFAULT_ARCHETYPE_TARGET_POINTS = 18;

function analyzeArchetypeSynergy(
  spells: readonly CardEvaluationInput[],
  profile: DeckSynergyProfile | undefined,
  packages: readonly StrategicPackageAudit[],
): { readonly score: number; readonly audit: SynergyAxisAudit } {
  const archetypes = (profile?.archetypes ?? [])
    .map((archetype) => {
      const keyIds = new Set(archetype.keyCards);
      const supportIds = new Set(archetype.supportCards);
      const keyCards = spells.filter((card) => card.oracleId && keyIds.has(card.oracleId));
      const supportCards = spells.filter(
        (card) => card.oracleId && !keyIds.has(card.oracleId) && supportIds.has(card.oracleId),
      );
      const keyCardCount = keyCards.length;
      const supportCardCount = supportCards.length;
      const alignedCardCount = keyCardCount + supportCardCount;
      const points = keyCardCount * 3 + supportCardCount;
      const targetPoints = archetype.targetPoints ?? DEFAULT_ARCHETYPE_TARGET_POINTS;
      let score = clamp((points / targetPoints) * 100);
      const families = (archetype.requiredFamilies ?? []).map((family) => {
        const familyIds = new Set(family.cardIds);
        const matchedCards = spells
          .filter((card) => card.oracleId && familyIds.has(card.oracleId))
          .map((card) => card.name);
        return {
          id: family.id,
          name: family.name,
          minimum: family.minimum,
          matchedCards,
          matchedCount: matchedCards.length,
          complete: matchedCards.length >= family.minimum,
        };
      });
      const missingRequiredFamilyCount = families.filter((family) => !family.complete).length;
      if (keyCardCount === 0) score = Math.min(score, 50);
      if (alignedCardCount < 5) score = Math.min(score, 35);
      if (missingRequiredFamilyCount === 1) score = Math.min(score, 45);
      if (missingRequiredFamilyCount >= 2) score = Math.min(score, 25);

      return {
        id: archetype.id,
        name: archetype.name,
        keyCards: keyCards.map((card) => card.name),
        supportCards: supportCards.map((card) => card.name),
        keyCardCount,
        supportCardCount,
        alignedCardCount,
        points,
        targetPoints,
        families,
        missingRequiredFamilyCount,
        score,
      };
    })
    .filter((archetype) => archetype.alignedCardCount > 0)
    .sort((left, right) => right.score - left.score || right.points - left.points);
  const bestArchetype = archetypes[0] ?? null;

  return {
    score: bestArchetype?.score ?? 0,
    audit: {
      profile:
        profile?.modelVersion && profile.cubeKey && profile.cubeSnapshotId
          ? {
              modelVersion: profile.modelVersion,
              cubeKey: profile.cubeKey,
              cubeSnapshotId: profile.cubeSnapshotId,
            }
          : null,
      packages,
      bestArchetype,
      archetypes,
    },
  };
}

function analyzeCurve(
  spells: readonly CardEvaluationInput[],
  packages: readonly StrategicPackageAudit[],
): CurveAxisAudit {
  const effectivePayoffs = new Map<string, string>();
  for (const strategicPackage of packages) {
    if (strategicPackage.id === "creature-cheat" || strategicPackage.id === "reanimation") {
      for (const payoff of strategicPackage.payoffs) {
        effectivePayoffs.set(payoff, strategicPackage.label);
      }
    }
  }
  const effectiveCostAdjustments = spells
    .filter((card) => effectivePayoffs.has(card.name) && (card.cmc ?? 0) > 3)
    .map((card) => ({
      name: card.name,
      printedCmc: card.cmc ?? 0,
      effectiveCmc: 3,
      reason: `Déploiement visé via le package ${effectivePayoffs.get(card.name) ?? "identifié"}.`,
    }));
  const effectiveByName = new Map(
    effectiveCostAdjustments.map((adjustment) => [adjustment.name, adjustment.effectiveCmc]),
  );
  const printedCmcs = spells.map((card) => card.cmc ?? 0);
  const effectiveCmcs = spells.map((card) => effectiveByName.get(card.name) ?? card.cmc ?? 0);

  return {
    printedAverageCmc: roundTo(mean(printedCmcs, 3)),
    effectiveAverageCmc: roundTo(mean(effectiveCmcs, 3)),
    earlyActionCount: effectiveCmcs.filter((cmc) => cmc <= 2).length,
    effectiveCostAdjustments,
  };
}

const INTERACTION_TARGETS: Readonly<
  Record<DeckArchetype["category"], InteractionAxisAudit["targetRange"]>
> = {
  aggro: { minimum: 2, ideal: 4, maximum: 7 },
  midrange: { minimum: 3, ideal: 5, maximum: 8 },
  control: { minimum: 6, ideal: 8, maximum: 12 },
  ramp: { minimum: 1, ideal: 3, maximum: 6 },
  combo: { minimum: 2, ideal: 4, maximum: 6 },
};

function analyzeInteraction(
  spells: readonly CardEvaluationInput[],
  archetype: DeckArchetype,
): { readonly score: number; readonly audit: InteractionAxisAudit } {
  const cards = spells
    .map((card) => {
      const coverage = classifyInteraction(card);
      const cmc = card.cmc ?? 0;
      let quality = 50;
      if (cmc <= 1) quality += 25;
      else if (cmc <= 2) quality += 18;
      else if (cmc <= 3) quality += 10;
      if (card.typeLine?.includes("Instant")) quality += 10;
      quality += coverage.length * 5;
      if (coverage.includes("permanents") || coverage.includes("sweeper")) quality += 5;
      return { name: card.name, cmc, quality: clamp(quality), coverage };
    })
    .filter((card) => card.coverage.length > 0);
  const targetRange = INTERACTION_TARGETS[archetype.category];
  const count = cards.length;
  let planAdequacy = 0;
  if (count > 0 && count < targetRange.minimum) {
    planAdequacy = clamp(40 + (count / targetRange.minimum) * 50);
  } else if (count >= targetRange.minimum && count <= targetRange.maximum) {
    planAdequacy = clamp(100 - Math.abs(count - targetRange.ideal) * 5);
  } else if (count > targetRange.maximum) {
    // Interaction beyond the preferred range has an opportunity cost, but it still fulfils
    // the interaction plan. Other axes account for what the deck gave up to make room for it.
    planAdequacy = clamp(100 - (count - targetRange.maximum) * 2);
  }
  const averageQuality = roundTo(mean(cards.map((card) => card.quality)));
  const score = clamp(averageQuality * 0.65 + planAdequacy * 0.35);
  const coverageSet = new Set(cards.flatMap((card) => card.coverage));

  return {
    score,
    audit: {
      cards,
      averageQuality,
      coverage: INTERACTION_COVERAGE_ORDER.filter((category) => coverageSet.has(category)),
      targetRange,
      planAdequacy,
    },
  };
}

function isLandEquivalent(card: CardEvaluationInput): boolean {
  return /(?:basic )?landcycling|plainscycling|islandcycling|swampcycling|mountaincycling|forestcycling/i.test(
    card.oracleText ?? "",
  );
}

const BASIC_LAND_COLOR_BY_NAME: Readonly<Record<string, MtGColor>> = {
  plains: "W",
  island: "U",
  swamp: "B",
  mountain: "R",
  forest: "G",
};

function getManaAccessColors(
  card: CardEvaluationInput,
  usedColors: readonly MtGColor[],
): readonly MtGColor[] {
  const colors = new Set(
    getEffectiveProducingColors(card).filter((color) => usedColors.includes(color)),
  );
  const text = (card.oracleText ?? "").toLowerCase();

  if (/basic land card|basic landcycling|mana of any color/.test(text)) {
    for (const color of usedColors) colors.add(color);
  } else if (/search your library|cycling/.test(text)) {
    for (const [landName, color] of Object.entries(BASIC_LAND_COLOR_BY_NAME)) {
      if (text.includes(landName)) colors.add(color);
    }
  }

  return ALL_COLORS.filter((color) => colors.has(color));
}

function computeLandCountAdequacy(effectiveLandCount: number): number {
  if (effectiveLandCount >= 16 && effectiveLandCount <= 18) return 1;
  if (effectiveLandCount < 16) return Math.max(0, 1 - (16 - effectiveLandCount) * 0.15);
  return Math.max(0, 1 - (effectiveLandCount - 18) * 0.1);
}

function analyzeMana(
  spells: readonly CardEvaluationInput[],
  lands: readonly CardEvaluationInput[],
): ManaAxisAudit {
  const usedColors = ALL_COLORS.filter((color) =>
    spells.some((card) => card.colors.includes(color)),
  );
  const sourcesByColor: Record<MtGColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const land of lands) {
    for (const color of getManaAccessColors(land, usedColors)) {
      sourcesByColor[color] += 1;
    }
  }

  const accelerators = spells.filter(isManaDorkOrRock).map((card) => {
    const producesColors = getManaAccessColors(card, usedColors);
    for (const color of producesColors) sourcesByColor[color] += 0.6;
    return { name: card.name, cmc: card.cmc ?? 0, producesColors };
  });
  const landEquivalents = spells.filter(isLandEquivalent);
  for (const card of landEquivalents) {
    for (const color of getManaAccessColors(card, usedColors)) sourcesByColor[color] += 0.75;
  }
  const landEquivalentCards = landEquivalents.map((card) => card.name);
  const effectiveLandCount = roundTo(lands.length + landEquivalentCards.length * 0.75);

  const fixersById = new Map<string, ManaFixerAuditEntry>();
  for (const land of lands) {
    const colors = getManaAccessColors(land, usedColors);
    if (colors.length >= 2) {
      fixersById.set(land.id, {
        name: land.name,
        kind: "multicolor-land",
        colors,
        contribution: 1,
      });
    }
  }
  for (const card of spells.filter(isManaDorkOrRock)) {
    const colors = getManaAccessColors(card, usedColors);
    if (colors.length >= 2) {
      fixersById.set(card.id, {
        name: card.name,
        kind: "accelerator",
        colors,
        contribution: 0.6,
      });
    }
  }
  for (const card of landEquivalents) {
    const colors = getManaAccessColors(card, usedColors);
    if (colors.length >= 2 && !fixersById.has(card.id)) {
      fixersById.set(card.id, {
        name: card.name,
        kind: "land-equivalent",
        colors,
        contribution: 0.75,
      });
    }
  }
  const fixers = [...fixersById.values()];
  const fixerUnits = roundTo(fixers.reduce((sum, fixer) => sum + fixer.contribution, 0));
  const requiredFixerUnits = Math.max(0, (usedColors.length - 1) * 2);
  const fixingAdequacy =
    requiredFixerUnits === 0 ? 1 : roundTo(Math.min(1, fixerUnits / requiredFixerUnits));

  const demandByColor: Record<MtGColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const spell of spells) {
    for (const color of spell.colors) demandByColor[color] += 1;
  }
  const totalDemand = Object.values(demandByColor).reduce((sum, demand) => sum + demand, 0);
  const targetSourcesByColor: Record<MtGColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const color of usedColors) {
    const demandShare = totalDemand === 0 ? 0 : demandByColor[color] / totalDemand;
    targetSourcesByColor[color] = Math.max(2, Math.ceil(effectiveLandCount * demandShare));
  }
  const sourceAdequacy = roundTo(
    usedColors.length === 0
      ? 1
      : Math.min(
          ...usedColors.map((color) =>
            Math.min(1, sourcesByColor[color] / targetSourcesByColor[color]),
          ),
        ),
  );

  return {
    landCount: lands.length,
    landEquivalentCards,
    effectiveLandCount,
    accelerators,
    sourcesByColor: {
      W: roundTo(sourcesByColor.W),
      U: roundTo(sourcesByColor.U),
      B: roundTo(sourcesByColor.B),
      R: roundTo(sourcesByColor.R),
      G: roundTo(sourcesByColor.G),
    },
    usedColors,
    targetSourcesByColor,
    sourceAdequacy,
    fixers,
    fixerUnits,
    requiredFixerUnits,
    fixingAdequacy,
    landCountAdequacy: roundTo(computeLandCountAdequacy(effectiveLandCount)),
  };
}

function computeManaScore(mana: ManaAxisAudit): number {
  const colorPressure = Math.max(0, (mana.usedColors.length - 1) / 4);
  const fixingFactor = 1 - colorPressure * (1 - mana.fixingAdequacy);
  return clamp(100 * mana.landCountAdequacy * mana.sourceAdequacy * fixingFactor);
}

/**
 * Computes the 5 mathematical axes of the Kiviat Radar.
 */
export function computeKiviatRadar(
  deck: readonly CardEvaluationInput[],
  archetype: DeckArchetype,
  options: DeckEvaluationOptions = {},
): KiviatRadarScores {
  const spells = deck.filter((c) => !c.isLand);
  const lands = deck.filter((c) => c.isLand);
  const bombThreshold = options.bombThreshold ?? options.cubeContext?.bombThreshold;
  const synergyProfile = options.synergyProfile ?? options.cubeContext?.synergyProfile;
  const packages = analyzeStrategicPackages(spells);
  const curveAnalysis = analyzeCurve(spells, packages);
  const interactionAnalysis = analyzeInteraction(spells, archetype);
  const manaAnalysis = analyzeMana(spells, lands);
  const synergyAnalysis = analyzeArchetypeSynergy(deck, synergyProfile, packages);

  // 1. Puissance Brute (20%)
  const power = analyzePower(spells, bombThreshold).score;

  // 2. Synergies d'Archétype (25%) - 3 points per key card, 1 per support card.
  const synergy = synergyAnalysis.score;

  // 3. Fluidité de Courbe (20%) - Adjusted to archetype
  let curveScore = 80;
  const adjustedCmcByName = new Map(
    curveAnalysis.effectiveCostAdjustments.map((adjustment) => [
      adjustment.name,
      adjustment.effectiveCmc,
    ]),
  );
  const cmcs = spells.map((card) => adjustedCmcByName.get(card.name) ?? card.cmc ?? 0);
  const avgCmc = cmcs.length > 0 ? cmcs.reduce((a, b) => a + b, 0) / cmcs.length : 3;

  if (archetype.category === "aggro") {
    // Aggro demands low average CMC (<= 2.3 is ideal) and high 1-2 drops
    if (avgCmc <= 2.3) curveScore = 95;
    else if (avgCmc <= 2.6) curveScore = 88;
    else if (avgCmc <= 3.0) curveScore = 72;
    else curveScore = 55;
  } else if (archetype.category === "ramp") {
    // Ramp accommodates higher CMC because of mana accelerators
    const dorks = spells.filter(isManaDorkOrRock).length;
    if (dorks >= 5) curveScore = 90;
    else if (dorks >= 3) curveScore = 82;
    else curveScore = 65;
  } else if (archetype.category === "combo") {
    if (avgCmc <= 3 && curveAnalysis.earlyActionCount >= 8) curveScore = 92;
    else if (avgCmc <= 3.5 && curveAnalysis.earlyActionCount >= 6) curveScore = 84;
    else curveScore = 68;
  } else {
    // Control & Midrange: smooth distribution across 1 to 5
    const cmcCounts: Record<number, number> = {};
    for (const cmc of cmcs) cmcCounts[cmc] = (cmcCounts[cmc] ?? 0) + 1;
    const early = (cmcCounts[1] ?? 0) + (cmcCounts[2] ?? 0);
    const mid = (cmcCounts[3] ?? 0) + (cmcCounts[4] ?? 0);
    const late = (cmcCounts[5] ?? 0) + (cmcCounts[6] ?? 0) + (cmcCounts[7] ?? 0);
    if (early >= 8 && mid >= 6 && late >= 2) curveScore = 92;
    else if (early >= 5 && mid >= 4) curveScore = 82;
    else curveScore = 68;
  }
  const curve = clamp(curveScore);

  // 4. Base de Mana (20%) - land count, colored-source coverage, and fixing density
  const mana = computeManaScore(manaAnalysis);

  // 5. Densité d'Interaction (15%)
  const interaction = interactionAnalysis.score;

  return {
    power,
    synergy,
    curve,
    mana,
    interaction,
  };
}

/**
 * Evaluates a complete 40-card deck with archetype classification,
 * 5-axis Kiviat radar scores, overall rating out of 100, and feedback.
 */
export function evaluateDeck(
  deck: readonly CardEvaluationInput[],
  options: DeckEvaluationOptions = {},
): DeckEvaluation {
  if (options.leagueCalibration) {
    validateLeagueCalibration(options.leagueCalibration);
    if (options.cubeContext) {
      assertCubeLeagueMembership(options.cubeContext, options.leagueCalibration);
    }
  }

  const bombThreshold = options.bombThreshold ?? options.cubeContext?.bombThreshold;
  const synergyProfile = options.synergyProfile ?? options.cubeContext?.synergyProfile;

  const archetype = detectArchetype(deck);
  const radar = computeKiviatRadar(deck, archetype, options);

  const spells = deck.filter((c) => !c.isLand);
  const lands = deck.filter((c) => c.isLand);
  const powerAnalysis = analyzePower(spells, bombThreshold);
  const packages = analyzeStrategicPackages(spells);
  const synergyAnalysis = analyzeArchetypeSynergy(deck, synergyProfile, packages);
  const curveAnalysis = analyzeCurve(spells, packages);
  const interactionAnalysis = analyzeInteraction(spells, archetype);
  const manaAnalysis = analyzeMana(spells, lands);

  const contributions = DECK_AXIS_WEIGHTS.map(([axis, weight]) => ({
    axis,
    score: radar[axis],
    weight,
    weightedPoints: roundTo(radar[axis] * weight),
  }));
  const overallScore = Math.round(
    contributions.reduce((sum, contribution) => sum + contribution.weightedPoints, 0),
  );

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  if (radar.power >= 80) strengths.push("Très haute puissance brute globale.");
  if (radar.synergy >= 85 && synergyAnalysis.audit.bestArchetype) {
    strengths.push(
      `Excellente cohésion de l'archétype ${synergyAnalysis.audit.bestArchetype.name}.`,
    );
  }
  if (
    synergyAnalysis.audit.bestArchetype &&
    synergyAnalysis.audit.bestArchetype.missingRequiredFamilyCount > 0
  ) {
    const missingFamilies = synergyAnalysis.audit.bestArchetype.families
      .filter((family) => !family.complete)
      .map((family) => family.name);
    weaknesses.push(
      `Archétype ${synergyAnalysis.audit.bestArchetype.name} amorcé, mais incomplet : ${missingFamilies.join(", ")}.`,
    );
    recommendations.push(
      "Compléter les familles de rôles manquantes avant d'ajouter du soutien redondant.",
    );
  }
  if (radar.curve >= 85) strengths.push("Courbe de mana idéalement proportionnée.");
  if (radar.mana >= 85) strengths.push("Base de mana solide avec sources fiables.");
  if (radar.interaction >= 85) strengths.push("Riche panoplie de réponses et contresorts.");

  if (radar.mana < 75) {
    weaknesses.push("Tension sur les sources de mana coloré.");
    recommendations.push("Ajouter des terrains de fixation bicolores ou des accélérateurs.");
  }
  if (radar.interaction < 70) {
    weaknesses.push("Nombre de réponses (removals/contresorts) insuffisant.");
    recommendations.push(
      "Intégrer des sorts d'interaction légers pour contrer les menaces adverses.",
    );
  }
  if (radar.curve < 75) {
    weaknesses.push("Déséquilibre dans la courbe de mana.");
    recommendations.push("Ajuster le ratio de créatures à 2 manas pour assurer un départ fluide.");
  }

  const overallTier = options.leagueCalibration
    ? classifyLeagueTier(overallScore, options.leagueCalibration)
    : scoreToTier(overallScore).tier;
  const radarTiers = {
    power: scoreToTier(radar.power).tier,
    synergy: scoreToTier(radar.synergy).tier,
    curve: scoreToTier(radar.curve).tier,
    mana: scoreToTier(radar.mana).tier,
    interaction: scoreToTier(radar.interaction).tier,
  };

  return {
    deckSize: deck.length,
    spellsCount: spells.length,
    landsCount: lands.length,
    archetype,
    radar,
    overallScore,
    overallTier,
    radarTiers,
    audit: {
      formulaVersion: "deck-evaluation@5",
      scoreMeaning:
        "Heuristique explicable sur 100 : ni une probabilité de victoire, ni un percentile statistique.",
      power: powerAnalysis.audit,
      synergy: synergyAnalysis.audit,
      curve: curveAnalysis,
      interaction: interactionAnalysis.audit,
      mana: manaAnalysis,
      contributions,
      ...(options.leagueCalibration
        ? {
            leagueId: options.leagueCalibration.leagueId,
            calibrationVersion: options.leagueCalibration.calibrationVersion,
            calibrationStatus: options.leagueCalibration.status,
          }
        : {}),
      ...(options.cubeContext
        ? {
            cubeKey: options.cubeContext.cubeKey,
            cubeSnapshotId: options.cubeContext.cubeSnapshotId,
          }
        : {}),
    },
    strengths,
    weaknesses,
    recommendations,
  };
}
