import {
  scoreToTier,
  type CardEvaluationInput,
  type CurveAxisAudit,
  type DeckSynergyArchetypeProfile,
  type DeckSynergyProfile,
  type DeckArchetype,
  type DeckEvaluation,
  type DeckEvaluationOptions,
  type InteractionAxisAudit,
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
import { memoizeByCard } from "./card-memo.ts";
import { INTERACTION_COVERAGE_ORDER, classifyInteraction } from "./interaction-classifier.ts";
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

const isManaDorkOrRock = memoizeByCard((card: CardEvaluationInput): boolean => {
  if (card.isLand || isLandEquivalent(card)) return false;
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
});

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

const estimateFastManaGain = memoizeByCard((card: CardEvaluationInput): number => {
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
});

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

const isCreatureCheatEnabler = memoizeByCard((card: CardEvaluationInput): boolean => {
  const text = (card.oracleText ?? "").toLowerCase();
  return (
    /put (?:an? )?(?:artifact, )?creature(?:, enchantment, or land)? card from (?:your|their) hand onto the battlefield/.test(
      text,
    ) ||
    (text.includes("each player may put") && text.includes("from their hand onto the battlefield"))
  );
});

const isSelectionOrTutor = memoizeByCard((card: CardEvaluationInput): boolean => {
  const text = (card.oracleText ?? "").toLowerCase();
  return /search your library|draw (?:a|one|two|three|\d+) card|scry|surveil|look at the top/.test(
    text,
  );
});

const isGraveyardSetup = memoizeByCard((card: CardEvaluationInput): boolean => {
  const text = (card.oracleText ?? "").toLowerCase();
  return (
    /put (?:that|a|target) card into your graveyard/.test(text) ||
    /additional cost[^.]*discard a card/.test(text) ||
    /draw (?:a|one|two|three|\d+) cards?(?:, then|\.\s*if you do,) discard/.test(text) ||
    text.includes("each player discards a card")
  );
});

const isReanimationEffect = memoizeByCard((card: CardEvaluationInput): boolean => {
  const text = (card.oracleText ?? "").toLowerCase();
  return (
    /(?:put|return) target (?:nonlegendary )?creature card from (?:a|your) graveyard (?:onto|to) the battlefield/.test(
      text,
    ) ||
    /enchant creature card in a graveyard[\s\S]*return enchanted creature card to the battlefield/.test(
      text,
    )
  );
});

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

interface ArchetypeIdSets {
  readonly keyIds: ReadonlySet<string>;
  readonly supportIds: ReadonlySet<string>;
  readonly familyIds: readonly ReadonlySet<string>[];
}

const archetypeIdSetCache = new WeakMap<DeckSynergyArchetypeProfile, ArchetypeIdSets>();

function archetypeIdSets(archetype: DeckSynergyArchetypeProfile): ArchetypeIdSets {
  const cached = archetypeIdSetCache.get(archetype);
  if (cached) return cached;
  const sets = {
    keyIds: new Set(archetype.keyCards),
    supportIds: new Set(archetype.supportCards),
    familyIds: (archetype.requiredFamilies ?? []).map((family) => new Set(family.cardIds)),
  };
  archetypeIdSetCache.set(archetype, sets);
  return sets;
}

function analyzeArchetypeSynergy(
  spells: readonly CardEvaluationInput[],
  profile: DeckSynergyProfile | undefined,
  packages: readonly StrategicPackageAudit[],
): { readonly score: number; readonly audit: SynergyAxisAudit } {
  const archetypes = (profile?.archetypes ?? [])
    .map((archetype) => {
      const { keyIds, supportIds, familyIds } = archetypeIdSets(archetype);
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
      const families = (archetype.requiredFamilies ?? []).map((family, index) => {
        const ids = familyIds[index];
        const matchedCards = spells
          .filter((card) => card.oracleId && ids?.has(card.oracleId))
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
      evaluated: (profile?.archetypes.length ?? 0) > 0,
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

const CURVE_BUCKET_LABELS = ["≤1", "2", "3", "4", "5", "6+"] as const;

// Share of spells expected at each mana value bucket in a 40-card cube deck of each category.
const CURVE_TARGETS: Readonly<Record<DeckArchetype["category"], readonly number[]>> = {
  aggro: [0.22, 0.36, 0.24, 0.12, 0.04, 0.02],
  midrange: [0.12, 0.28, 0.25, 0.18, 0.1, 0.07],
  control: [0.14, 0.28, 0.22, 0.16, 0.11, 0.09],
  ramp: [0.16, 0.24, 0.18, 0.12, 0.1, 0.2],
  combo: [0.18, 0.3, 0.25, 0.15, 0.07, 0.05],
};
// Points lost per mana-value step the curve sits above, then below, its reference.
const CURVE_HEAVY_PENALTY = 45;
const CURVE_LIGHT_PENALTY = 15;

function curveBucket(cmc: number): number {
  return Math.min(CURVE_BUCKET_LABELS.length - 1, Math.max(0, Math.round(cmc) - 1));
}

function analyzeCurve(
  spells: readonly CardEvaluationInput[],
  packages: readonly StrategicPackageAudit[],
  category: DeckArchetype["category"],
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

  // Earth mover's distance between the effective curve and its reference, split by direction:
  // cumulative shortfalls mean mana sits later than expected, surpluses earlier.
  const distribution = CURVE_BUCKET_LABELS.map(() => 0);
  for (const cmc of effectiveCmcs) {
    const bucket = curveBucket(cmc);
    distribution[bucket] = (distribution[bucket] ?? 0) + 1;
  }
  const target = CURVE_TARGETS[category];
  const spellCount = Math.max(1, effectiveCmcs.length);
  let deckShare = 0;
  let targetShare = 0;
  let heavyExcess = 0;
  let lightExcess = 0;
  for (let bucket = 0; bucket < CURVE_BUCKET_LABELS.length - 1; bucket++) {
    deckShare += (distribution[bucket] ?? 0) / spellCount;
    targetShare += target[bucket] ?? 0;
    if (deckShare < targetShare) heavyExcess += targetShare - deckShare;
    else lightExcess += deckShare - targetShare;
  }

  return {
    printedAverageCmc: roundTo(mean(printedCmcs, 3)),
    effectiveAverageCmc: roundTo(mean(effectiveCmcs, 3)),
    earlyActionCount: effectiveCmcs.filter((cmc) => cmc <= 2).length,
    effectiveCostAdjustments,
    distribution,
    targetDistribution: target.map((share) => roundTo(share * effectiveCmcs.length, 1)),
    heavyExcess: roundTo(heavyExcess),
    lightExcess: roundTo(lightExcess),
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

const isLandEquivalent = memoizeByCard((card: CardEvaluationInput): boolean => {
  if (card.isLand) return false;
  return (
    /(?:basic )?landcycling|plainscycling|islandcycling|swampcycling|mountaincycling|forestcycling/i.test(
      card.oracleText ?? "",
    ) ||
    /\/\/\s*(?:basic\s+)?land\b/i.test(card.typeLine ?? "") ||
    /\b(?:as|when) (?:this|that) land enters\b/i.test(card.oracleText ?? "")
  );
});

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
      if (usedColors.includes(color) && text.includes(landName)) colors.add(color);
    }
  }

  return ALL_COLORS.filter((color) => colors.has(color));
}

// Colored sources needed to cast a spell on curve about 90% of the time in a 40-card deck with
// 17 lands, after Frank Karsten's tables. Rows are pip counts, columns mana values 1 to 6+.
const SOURCES_FOR_PIPS: Readonly<Record<1 | 2 | 3 | 4, readonly number[]>> = {
  1: [9, 8, 7, 7, 6, 6],
  2: [13, 13, 11, 10, 9, 9],
  3: [15, 15, 15, 13, 12, 11],
  4: [15, 15, 15, 15, 14, 13],
};

function requiredSources(pips: number, manaValue: number): number {
  const row = SOURCES_FOR_PIPS[Math.min(4, pips) as 1 | 2 | 3 | 4];
  return row[Math.min(6, Math.max(manaValue, pips, 1)) - 1] ?? 6;
}

const MANA_SYMBOL = /\{([^}]+)\}|o(\([^)]*\)|\d+|[A-Z])/g;

interface ManaFace {
  readonly manaValue: number;
  /** Colored pips; a hybrid pip lists every color that pays it. */
  readonly pips: readonly (readonly MtGColor[])[];
}

const parseManaFaces = memoizeByCard((card: CardEvaluationInput): readonly ManaFace[] | null => {
  const faces = (card.manaCost ?? "").split(/\s*\/\/\s*|\{SPLIT\}/iu).filter(Boolean);
  if (faces.length === 0) return null;
  return faces.map((face) => {
    const pips: MtGColor[][] = [];
    let manaValue = 0;
    for (const match of face.matchAll(MANA_SYMBOL)) {
      const symbol = (match[1] ?? match[2] ?? "").replace(/[()]/gu, "").toUpperCase();
      if (/^\d+$/u.test(symbol)) {
        manaValue += Number(symbol);
        continue;
      }
      if (symbol === "X") continue;
      manaValue += 1;
      const options = symbol
        .split("/")
        .filter((part): part is MtGColor => ALL_COLORS.includes(part as MtGColor));
      if (options.length === 0 || symbol.includes("P") || /\d/u.test(symbol)) continue;
      pips.push(options);
    }
    return { manaValue, pips };
  });
});

/**
 * Colored source requirements of each castable face. Hybrid pips are paid with the
 * better-supplied color; Phyrexian and generic-hybrid pips need no colored source.
 */
function getColoredRequirements(
  card: CardEvaluationInput,
  sourcesByColor: Readonly<Record<MtGColor, number>>,
): readonly (readonly (readonly [MtGColor, number])[])[] {
  const faces = parseManaFaces(card);
  if (faces === null) {
    return card.colors.length === 0
      ? []
      : [card.colors.map((color) => [color, requiredSources(1, card.cmc ?? 1)] as const)];
  }
  return faces.flatMap(({ manaValue, pips: facePips }) => {
    const pips: Record<MtGColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    for (const options of facePips) {
      const paidWith = options.reduce((left, right) =>
        sourcesByColor[right] > sourcesByColor[left] ? right : left,
      );
      pips[paidWith] += 1;
    }
    const requirements = ALL_COLORS.filter((color) => pips[color] > 0).map(
      (color) => [color, requiredSources(pips[color], manaValue)] as const,
    );
    return requirements.length > 0 ? [requirements] : [];
  });
}

function computeLandCountAdequacy(effectiveLandCount: number, fastManaCount = 0): number {
  const lowLandAdjusted =
    effectiveLandCount < 16
      ? Math.min(16, effectiveLandCount + Math.min(1, fastManaCount * 0.25))
      : effectiveLandCount;
  if (lowLandAdjusted >= 16 && lowLandAdjusted <= 18) return 1;
  if (lowLandAdjusted < 16) return Math.max(0, 1 - (16 - lowLandAdjusted) * 0.15);
  return Math.max(0, 1 - (lowLandAdjusted - 18) * 0.1);
}

function countColorSources(
  spells: readonly CardEvaluationInput[],
  lands: readonly CardEvaluationInput[],
  usedColors: readonly MtGColor[],
): Record<MtGColor, number> {
  const sourcesByColor: Record<MtGColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const land of lands) {
    for (const color of getManaAccessColors(land, usedColors)) sourcesByColor[color] += 1;
  }
  for (const card of spells.filter(isManaDorkOrRock)) {
    for (const color of getManaAccessColors(card, usedColors)) sourcesByColor[color] += 0.6;
  }
  for (const card of spells.filter(isLandEquivalent)) {
    for (const color of getManaAccessColors(card, usedColors)) sourcesByColor[color] += 0.75;
  }
  return sourcesByColor;
}

/** Mean per-spell castability (best face, capped at 1) and the source target of each color. */
function measureCastability(
  spells: readonly CardEvaluationInput[],
  sourcesByColor: Readonly<Record<MtGColor, number>>,
): { readonly sourceAdequacy: number; readonly targetSourcesByColor: Record<MtGColor, number> } {
  const targetSourcesByColor: Record<MtGColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  const castabilities: number[] = [];
  for (const spell of spells) {
    const faces = getColoredRequirements(spell, sourcesByColor);
    if (faces.length === 0) continue;
    let best = 0;
    for (const face of faces) {
      let castability = 1;
      for (const [color, required] of face) {
        targetSourcesByColor[color] = Math.max(targetSourcesByColor[color], required);
        castability = Math.min(castability, sourcesByColor[color] / required);
      }
      best = Math.max(best, Math.min(1, castability));
    }
    castabilities.push(best);
  }
  return { sourceAdequacy: mean(castabilities, 1), targetSourcesByColor };
}

/**
 * Splits basic lands among the allowed colors the spells actually use, one land at a time,
 * where it raises the Mana axis castability most. Sources already provided by nonbasic lands,
 * accelerators and land-equivalent spells count first; once every spell is castable, the
 * remaining basics follow pip demand.
 */
export function allocateBasicLands(
  spells: readonly CardEvaluationInput[],
  lands: readonly CardEvaluationInput[],
  allowedColors: readonly MtGColor[],
  count: number,
): Readonly<Record<MtGColor, number>> {
  const allocation: Record<MtGColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  const usedColors = ALL_COLORS.filter((color) =>
    spells.some((card) => card.colors.includes(color)),
  );
  const usedAllowed = allowedColors.filter((color) => usedColors.includes(color));
  const eligible = usedAllowed.length > 0 ? usedAllowed : allowedColors.slice(0, 1);
  const [firstColor] = eligible;
  if (firstColor === undefined) return allocation;

  const pipDemand: Record<MtGColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const spell of spells) {
    const faces = parseManaFaces(spell);
    if (faces === null) {
      for (const color of spell.colors) pipDemand[color] += 1;
      continue;
    }
    for (const options of faces.flatMap((face) => face.pips)) {
      for (const color of options) pipDemand[color] += 1 / options.length;
    }
  }

  const sources = countColorSources(spells, lands, usedColors);
  for (let index = 0; index < count; index++) {
    let best = firstColor;
    let bestAdequacy = -1;
    let bestDemand = -1;
    for (const color of eligible) {
      sources[color] += 1;
      const adequacy = measureCastability(spells, sources).sourceAdequacy;
      sources[color] -= 1;
      const demand = pipDemand[color] / (sources[color] + 1);
      if (
        adequacy > bestAdequacy + 1e-9 ||
        (Math.abs(adequacy - bestAdequacy) <= 1e-9 && demand > bestDemand)
      ) {
        best = color;
        bestAdequacy = adequacy;
        bestDemand = demand;
      }
    }
    allocation[best] += 1;
    sources[best] += 1;
  }
  return allocation;
}

function analyzeMana(
  spells: readonly CardEvaluationInput[],
  lands: readonly CardEvaluationInput[],
): ManaAxisAudit {
  const usedColors = ALL_COLORS.filter((color) =>
    spells.some((card) => card.colors.includes(color)),
  );
  const sourcesByColor = countColorSources(spells, lands, usedColors);
  const accelerators = spells.filter(isManaDorkOrRock).map((card) => ({
    name: card.name,
    cmc: card.cmc ?? 0,
    producesColors: getManaAccessColors(card, usedColors),
  }));
  const landEquivalents = spells.filter(isLandEquivalent);
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
  // Two colors run on basics in cube; dedicated fixing is only demanded from the third color on.
  const requiredFixerUnits = usedColors.length >= 3 ? (usedColors.length - 1) * 2 : 0;
  const fixingAdequacy =
    requiredFixerUnits === 0 ? 1 : roundTo(Math.min(1, fixerUnits / requiredFixerUnits));

  const castability = measureCastability(spells, sourcesByColor);
  const targetSourcesByColor = castability.targetSourcesByColor;
  const sourceAdequacy = roundTo(castability.sourceAdequacy);
  const fastManaCount = accelerators.filter((accelerator) => accelerator.cmc <= 1).length;

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
    landCountAdequacy: roundTo(computeLandCountAdequacy(effectiveLandCount, fastManaCount)),
  };
}

function computeManaScore(mana: ManaAxisAudit): number {
  const colorPressure = mana.requiredFixerUnits === 0 ? 0 : (mana.usedColors.length - 1) / 4;
  const fixingFactor = 1 - colorPressure * (1 - mana.fixingAdequacy);
  return clamp(100 * mana.landCountAdequacy * mana.sourceAdequacy * fixingFactor);
}

/**
 * Computes the 5 mathematical axes of the Kiviat Radar.
 */
const CATEGORY_LABELS: Readonly<Record<DeckArchetype["category"], string>> = {
  aggro: "aggro",
  midrange: "midrange",
  control: "contrôle",
  ramp: "rampe",
  combo: "combo",
};

const COLOR_LABELS: Readonly<Record<MtGColor, string>> = {
  W: "blanc",
  U: "bleu",
  B: "noir",
  R: "rouge",
  G: "vert",
};

const BASIC_NAME_BY_COLOR: Readonly<Record<MtGColor, string>> = {
  W: "Plains",
  U: "Island",
  B: "Swamp",
  R: "Mountain",
  G: "Forest",
};

/** Below this share of its Karsten sources, a spell is unlikely to be cast on curve. */
const STRAINED_CASTABILITY = 0.85;

function formatSources(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".", ",");
}

/** Basic lands of the deck that tap for exactly one given color. */
function basicsOfColor(
  lands: readonly CardEvaluationInput[],
  color: MtGColor,
): CardEvaluationInput[] {
  return lands.filter((land) => {
    const produced = getEffectiveProducingColors(land);
    return (
      produced.length === 1 &&
      produced[0] === color &&
      (/\bbasic\b/iu.test(land.typeLine ?? "") || land.name === BASIC_NAME_BY_COLOR[color])
    );
  });
}

/**
 * Names each color short of its Karsten target with the spell that sets it, then the basic land
 * switch that fixes it when another color has spare basics.
 */
function adviseMana(
  spells: readonly CardEvaluationInput[],
  lands: readonly CardEvaluationInput[],
  mana: ManaAxisAudit,
): { readonly weaknesses: readonly string[]; readonly recommendations: readonly string[] } {
  const weaknesses: string[] = [];
  const recommendations: string[] = [];
  const surplus = (color: MtGColor) =>
    mana.sourcesByColor[color] - mana.targetSourcesByColor[color];
  // Spells unlikely to be cast on curve, per limiting color, judged on their most castable face.
  const strained = new Map<MtGColor, { card: CardEvaluationInput; ratio: number }[]>();
  for (const spell of spells) {
    const faces = getColoredRequirements(spell, mana.sourcesByColor);
    const castability = (face: (typeof faces)[number]) =>
      Math.min(1, ...face.map(([color, required]) => mana.sourcesByColor[color] / required));
    const best = faces.reduce<(typeof faces)[number] | undefined>(
      (left, right) =>
        left === undefined || castability(right) > castability(left) ? right : left,
      undefined,
    );
    for (const [color, required] of best ?? []) {
      const ratio = mana.sourcesByColor[color] / required;
      if (ratio < STRAINED_CASTABILITY) {
        strained.set(color, [...(strained.get(color) ?? []), { card: spell, ratio }]);
      }
    }
  }
  for (const color of mana.usedColors) {
    const sources = mana.sourcesByColor[color];
    const target = mana.targetSourcesByColor[color];
    // One demanding card is a deckbuilding choice; a color problem strains several spells.
    const affected = (strained.get(color) ?? []).sort(
      (left, right) => left.ratio - right.ratio || left.card.name.localeCompare(right.card.name),
    );
    if (affected.length < 2) continue;
    const examples = affected.slice(0, 2).map(({ card }) => card.name);
    weaknesses.push(
      `Sources de ${COLOR_LABELS[color]} insuffisantes : ${formatSources(sources)} pour ${String(target)} requises ; ${String(affected.length)} sorts difficiles à lancer à temps (${examples.join(" et ")}).`,
    );
    const donor = mana.usedColors
      .filter((other) => other !== color && surplus(other) >= 1)
      .sort((left, right) => surplus(right) - surplus(left))[0];
    const donorBasics = donor ? basicsOfColor(lands, donor) : [];
    const switched = donor
      ? Math.min(Math.ceil(target - sources), Math.floor(surplus(donor)), donorBasics.length)
      : 0;
    if (donor && switched > 0) {
      const from = donorBasics[0]?.name ?? BASIC_NAME_BY_COLOR[donor];
      const to = basicsOfColor(lands, color)[0]?.name ?? BASIC_NAME_BY_COLOR[color];
      recommendations.push(
        `Remplacer ${String(switched)} ${from} par ${String(switched)} ${to} : le ${COLOR_LABELS[color]} passe à ${formatSources(sources + switched)} sources sans faire passer le ${COLOR_LABELS[donor]} sous ${String(mana.targetSourcesByColor[donor])}.`,
      );
    } else {
      recommendations.push(
        `Ajouter des sources de ${COLOR_LABELS[color]} (bi-terrains, accélérateurs) ou alléger les cartes exigeantes : ${examples.join(" et ")}.`,
      );
    }
  }
  if (mana.fixingAdequacy < 1) {
    recommendations.push(
      `Fixing : ${formatSources(mana.fixerUnits)} unité(s) pour ${String(mana.requiredFixerUnits)} attendues à ${String(mana.usedColors.length)} couleurs ; ajouter des bi-terrains de ces couleurs.`,
    );
  }
  if (mana.effectiveLandCount < 16 || mana.effectiveLandCount > 18) {
    recommendations.push(
      `Jouer 16 à 18 terrains (actuellement ${formatSources(mana.effectiveLandCount)} en comptant les cartes terrain).`,
    );
  }
  return { weaknesses, recommendations };
}

/**
 * Points at the most overloaded and the most lacking mana values of the curve and the weakest
 * spells of the overloaded one.
 */
function adviseCurve(
  spells: readonly CardEvaluationInput[],
  curve: CurveAxisAudit,
  category: DeckArchetype["category"],
): { readonly weakness: string; readonly recommendation: string | null } {
  const gaps = curve.distribution.map((count, bucket) => ({
    bucket,
    gap: count - (curve.targetDistribution[bucket] ?? 0),
  }));
  const over = [...gaps].sort((left, right) => right.gap - left.gap)[0];
  const under = [...gaps].sort((left, right) => left.gap - right.gap)[0];
  if (!over || !under || over.gap < 1) {
    return { weakness: "Déséquilibre dans la courbe de mana.", recommendation: null };
  }
  const label = (bucket: number) => CURVE_BUCKET_LABELS[bucket] ?? "?";
  const heavy = curve.heavyExcess >= curve.lightExcess;
  const effectiveByName = new Map(
    curve.effectiveCostAdjustments.map((adjustment) => [adjustment.name, adjustment.effectiveCmc]),
  );
  const cuts = spells
    .filter((card) => curveBucket(effectiveByName.get(card.name) ?? card.cmc ?? 0) === over.bucket)
    .sort(
      (left, right) => left.staticScore - right.staticScore || left.name.localeCompare(right.name),
    )
    .slice(0, 2)
    .map((card) => card.name);
  return {
    weakness: `Courbe trop ${heavy ? "lourde" : "basse"} : ${String(curve.distribution[over.bucket] ?? 0)} sorts à ${label(over.bucket)} pour environ ${String(Math.round(curve.targetDistribution[over.bucket] ?? 0))} attendus en ${CATEGORY_LABELS[category]}.`,
    recommendation: `Remplacer des sorts à ${label(over.bucket)} par des sorts à ${label(under.bucket)}${cuts.length > 0 ? ` ; couper en priorité ${cuts.join(" et ")}` : ""}.`,
  };
}

interface DeckAxisAnalysis {
  readonly radar: KiviatRadarScores;
  readonly spells: readonly CardEvaluationInput[];
  readonly lands: readonly CardEvaluationInput[];
  readonly powerAnalysis: ReturnType<typeof analyzePower>;
  readonly packages: readonly StrategicPackageAudit[];
  readonly synergyAnalysis: ReturnType<typeof analyzeArchetypeSynergy>;
  readonly curveAnalysis: CurveAxisAudit;
  readonly interactionAnalysis: ReturnType<typeof analyzeInteraction>;
  readonly manaAnalysis: ManaAxisAudit;
}

function analyzeDeckAxes(
  deck: readonly CardEvaluationInput[],
  archetype: DeckArchetype,
  options: DeckEvaluationOptions,
): DeckAxisAnalysis {
  const spells = deck.filter((c) => !c.isLand);
  const lands = deck.filter((c) => c.isLand);
  const bombThreshold = options.bombThreshold ?? options.cubeContext?.bombThreshold;
  const synergyProfile = options.synergyProfile ?? options.cubeContext?.synergyProfile;
  const powerAnalysis = analyzePower(spells, bombThreshold);
  const packages = analyzeStrategicPackages(spells);
  const curveAnalysis = analyzeCurve(spells, packages, archetype.category);
  const interactionAnalysis = analyzeInteraction(spells, archetype);
  const manaAnalysis = analyzeMana(spells, lands);
  const synergyAnalysis = analyzeArchetypeSynergy(deck, synergyProfile, packages);

  // 1. Puissance Brute (20%)
  const power = powerAnalysis.score;

  // 2. Synergies d'Archétype (25%) - 3 points per key card, 1 per support card.
  const synergy = synergyAnalysis.score;

  // 3. Fluidité de Courbe (20%) - continuous distance to the archetype's reference curve.
  // Ramp still needs accelerators to carry its heavier top end.
  const missingAccelerators =
    archetype.category === "ramp" ? Math.max(0, 3 - spells.filter(isManaDorkOrRock).length) : 0;
  const curve = clamp(
    100 -
      CURVE_HEAVY_PENALTY * curveAnalysis.heavyExcess -
      CURVE_LIGHT_PENALTY * curveAnalysis.lightExcess -
      5 * missingAccelerators,
  );

  // 4. Base de Mana (20%) - land count, colored-source coverage, and fixing density
  const mana = computeManaScore(manaAnalysis);

  // 5. Densité d'Interaction (15%)
  const interaction = interactionAnalysis.score;

  return {
    radar: { power, synergy, curve, mana, interaction },
    spells,
    lands,
    powerAnalysis,
    packages,
    synergyAnalysis,
    curveAnalysis,
    interactionAnalysis,
    manaAnalysis,
  };
}

export function computeKiviatRadar(
  deck: readonly CardEvaluationInput[],
  archetype: DeckArchetype,
  options: DeckEvaluationOptions = {},
): KiviatRadarScores {
  return analyzeDeckAxes(deck, archetype, options).radar;
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

  const archetype = detectArchetype(deck);
  const {
    radar,
    spells,
    lands,
    powerAnalysis,
    packages,
    synergyAnalysis,
    curveAnalysis,
    interactionAnalysis,
    manaAnalysis,
  } = analyzeDeckAxes(deck, archetype, options);

  // Without a cube synergy profile the synergy axis is unknown, not zero: the remaining axes
  // keep their relative weights and share the whole score.
  const synergyEvaluated = synergyAnalysis.audit.evaluated;
  const scoredWeights = DECK_AXIS_WEIGHTS.filter(
    ([axis]) => synergyEvaluated || axis !== "synergy",
  );
  const totalWeight = scoredWeights.reduce((sum, [, weight]) => sum + weight, 0);
  const contributions = DECK_AXIS_WEIGHTS.map(([axis, baseWeight]) => {
    const weight = synergyEvaluated || axis !== "synergy" ? baseWeight / totalWeight : 0;
    return {
      axis,
      score: radar[axis],
      weight: roundTo(weight, 4),
      weightedPoints: roundTo(radar[axis] * weight),
    };
  });
  const overallScore = Math.round(
    scoredWeights.reduce((sum, [axis, weight]) => sum + radar[axis] * weight, 0) / totalWeight,
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
    const best = synergyAnalysis.audit.bestArchetype;
    const missingFamilies = best.families.filter((family) => !family.complete);
    weaknesses.push(
      `Archétype ${best.name} amorcé, mais incomplet : ${missingFamilies.map((family) => family.name).join(", ")}.`,
    );
    const profile = (
      options.synergyProfile ?? options.cubeContext?.synergyProfile
    )?.archetypes.find((archetype) => archetype.id === best.id);
    const namesByOracleId = new Map(
      (profile?.affinities ?? []).map((affinity) => [affinity.oracleId, affinity.name]),
    );
    const deckOracleIds = new Set(deck.flatMap((card) => (card.oracleId ? [card.oracleId] : [])));
    for (const family of missingFamilies) {
      const candidates = (
        profile?.requiredFamilies?.find((required) => required.id === family.id)?.cardIds ?? []
      )
        .filter((oracleId) => !deckOracleIds.has(oracleId))
        .flatMap((oracleId) => {
          const name = namesByOracleId.get(oracleId);
          return name ? [name] : [];
        })
        .slice(0, 4);
      recommendations.push(
        `Compléter la famille ${family.name} (${String(family.matchedCount)}/${String(family.minimum)})${
          candidates.length > 0
            ? ` : cartes du cube qui la remplissent : ${candidates.join(" ; ")}`
            : ""
        }.`,
      );
    }
  }
  for (const strategicPackage of packages) {
    if (strategicPackage.fragilityPenalty === 0) continue;
    const pieces = [...strategicPackage.enablers, ...strategicPackage.supportCards];
    weaknesses.push(
      `Plan ${strategicPackage.label} fragile : il repose sur peu de pièces (${pieces.join(", ")}) pour ${String(strategicPackage.payoffs.length)} cible(s).`,
    );
    recommendations.push(
      `Ajouter de la redondance au plan ${strategicPackage.label} ou réduire le nombre de cibles qui en dépendent.`,
    );
  }
  if (radar.curve >= 85) strengths.push("Courbe de mana idéalement proportionnée.");
  if (radar.mana >= 85) strengths.push("Base de mana solide avec sources fiables.");
  if (radar.interaction >= 85) strengths.push("Riche panoplie de réponses et contresorts.");

  const manaAdvice = adviseMana(spells, lands, manaAnalysis);
  weaknesses.push(...manaAdvice.weaknesses);
  recommendations.push(...manaAdvice.recommendations);
  if (radar.mana < 75 && manaAdvice.weaknesses.length === 0) {
    weaknesses.push("Tension sur les sources de mana coloré.");
  }

  const interactionCount = interactionAnalysis.audit.cards.length;
  const interactionRange = interactionAnalysis.audit.targetRange;
  if (radar.interaction < 70) {
    weaknesses.push("Nombre de réponses (removals/contresorts) insuffisant.");
  }
  if (interactionCount < interactionRange.minimum) {
    recommendations.push(
      `Interaction : ${String(interactionCount)} ${interactionCount === 1 ? "réponse" : "réponses"} pour ${String(interactionRange.minimum)} à ${String(interactionRange.maximum)} attendues en ${CATEGORY_LABELS[archetype.category]} ; ajouter au moins ${String(interactionRange.minimum - interactionCount)} removal(s) ou contresort(s).`,
    );
  } else if (radar.interaction < 70) {
    recommendations.push(
      "Interaction : privilégier des réponses moins chères ou à vitesse d'éphémère.",
    );
  }

  if (radar.curve < 80) {
    const curveAdvice = adviseCurve(spells, curveAnalysis, archetype.category);
    weaknesses.push(curveAdvice.weakness);
    if (curveAdvice.recommendation) recommendations.push(curveAdvice.recommendation);
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
      formulaVersion: "deck-evaluation@7",
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
