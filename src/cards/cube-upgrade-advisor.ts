import type { MasterCatalogCard, CubeTier } from "./types.ts";
import {
  computeCubeTierThresholds,
  scoreToRelativeTierWithThresholds,
  type CubeTierThreshold,
} from "./relative-tier-engine.ts";

export type SwapType = "strict_upgrade" | "versatile_alternative" | "archetype_booster";

export interface CubeCobraStats {
  readonly elo?: number | undefined;
  readonly cubeCount?: number | undefined;
  readonly popularity?: number | undefined;
}

export interface CardReleaseInfo {
  readonly firstPrintYear: number;
  readonly released_at?: string | undefined;
  readonly set?: string | undefined;
  readonly setName?: string | undefined;
  readonly rarity?: string | undefined;
}

export interface MetaAddedValueAnalysis {
  readonly summary: string;
  readonly affectedArchetypes: readonly string[];
  readonly strategicRole: string;
  readonly benchmarkPresence?: string | undefined;
  readonly releaseContext: string;
}

export interface UpgradeCardRef {
  readonly oracleId: string;
  readonly name: string;
  readonly score: number;
  readonly tier?: CubeTier | undefined;
  readonly cmc: number;
  readonly typeLine: string;
  readonly imageUrl?: string | undefined;
  readonly frenchName?: string | undefined;
  readonly frenchImageUrl?: string | undefined;
  readonly colors: readonly string[];
  readonly releaseYear?: number | undefined;
  readonly set?: string | undefined;
  readonly isRecent?: boolean | undefined;
}

export interface UpgradeProposal {
  readonly targetCard: UpgradeCardRef;
  readonly suggestedCard: UpgradeCardRef;
  readonly swapType: SwapType;
  readonly scoreDelta: number;
  readonly reason: string;
  readonly metaAddedValue: MetaAddedValueAnalysis;
  readonly releaseYear?: number | undefined;
  readonly isRecent?: boolean | undefined;
  readonly benchmarkCubes?: readonly string[] | undefined;
  readonly cubeCobraStats?: CubeCobraStats | undefined;
}

export interface UpgradeTargetSummary {
  readonly name: string;
  readonly frenchName?: string | undefined;
  readonly score: number;
  readonly tier?: CubeTier | undefined;
  readonly scoreDelta: number;
  readonly reason: string;
}

export interface MaybeboardSuggestion {
  readonly card: UpgradeCardRef;
  readonly archetypes: readonly string[];
  readonly role: "staple" | "archetype_payoff" | "engine" | "premium_interaction";
  readonly rationale: string;
  readonly metaAddedValue: MetaAddedValueAnalysis;
  readonly releaseYear?: number | undefined;
  readonly isRecent?: boolean | undefined;
  readonly benchmarkCubes?: readonly string[] | undefined;
  readonly cubeCobraStats?: CubeCobraStats | undefined;
  readonly replacesCards?: readonly UpgradeTargetSummary[] | undefined;
}

export interface CubeSuggestionsReport {
  readonly schemaVersion: 1;
  readonly cubeKey: string;
  readonly generatedAt: string;
  readonly stats: {
    readonly totalUpgrades: number;
    readonly totalMaybeboard: number;
    readonly recentUpgradesCount: number;
    readonly benchmarkMatchesCount: number;
  };
  readonly upgrades: Record<string, UpgradeProposal>;
  readonly maybeboard: readonly MaybeboardSuggestion[];
}

export interface AdvisorCubeMeta {
  readonly cubeKey: string;
  readonly archetypes?: readonly {
    readonly id: string;
    readonly name: string;
    readonly primaryColors?: readonly string[];
    readonly splashColors?: readonly string[];
    readonly keyCards?: readonly string[];
    readonly supportCards?: readonly string[];
  }[];
  readonly dominantMechanics?: readonly string[];
}

interface AdvisorCubePolicy {
  readonly rarity: "pauper" | "peasant" | "unrestricted";
  readonly preserveCreatureTypes: boolean;
  readonly allowsRestrictedFastMana: boolean;
}

function getAdvisorCubePolicy(cubeKey: string): AdvisorCubePolicy {
  return {
    rarity:
      cubeKey === "hugues_pauper"
        ? "pauper"
        : cubeKey === "titou_arena_peasant_plus"
          ? "peasant"
          : "unrestricted",
    preserveCreatureTypes: cubeKey === "titou_tribal",
    allowsRestrictedFastMana: cubeKey === "nico_candyshop",
  };
}

function getCardScore(card: MasterCatalogCard): number {
  return Number.isFinite(card.powerScore.score) ? card.powerScore.score : 1;
}

function getCardTier(
  card: MasterCatalogCard,
  cubeKey: string,
  thresholds?: readonly CubeTierThreshold[],
): CubeTier {
  const ana = card.cubeAnalyses[cubeKey];
  if (ana?.relativeTier) return ana.relativeTier;
  if (ana?.tier) return ana.tier;
  if (thresholds && thresholds.length > 0) {
    const score = getCardScore(card);
    return scoreToRelativeTierWithThresholds(score, thresholds);
  }
  return "C";
}

function isWeakTarget(card: MasterCatalogCard, cubeKey: string): boolean {
  const score = getCardScore(card);
  const tier = getCardTier(card, cubeKey);
  const fit = card.cubeAnalyses[cubeKey]?.fit;

  if (fit === "trap") return true;
  if (["D+", "D", "D-", "F"].includes(tier)) return true;
  if (score <= 20) return true;
  return false;
}

function areColorsCompatible(
  targetColors: readonly string[],
  candidateColors: readonly string[],
): boolean {
  if (targetColors.length === 0) {
    // Colorless can only be replaced by colorless
    return candidateColors.length === 0;
  }
  if (candidateColors.length === 0) {
    // Colorless can sometimes replace colored, but prefer exact color
    return false;
  }
  if (targetColors.length === 1) {
    // Mono-color must be replaced by same mono-color
    return candidateColors.length === 1 && candidateColors[0] === targetColors[0];
  }
  // Multi-color: candidate colors must match or be a subset of target
  return (
    candidateColors.every((c) => targetColors.includes(c)) &&
    candidateColors.length === targetColors.length
  );
}

function areTypesCompatible(target: MasterCatalogCard, candidate: MasterCatalogCard): boolean {
  const targetIsCreature = target.types.includes("Creature");
  const candIsCreature = candidate.types.includes("Creature");
  if (targetIsCreature !== candIsCreature) return false;

  const targetIsLand = target.isLand || target.types.includes("Land");
  const candIsLand = candidate.isLand || candidate.types.includes("Land");
  if (targetIsLand !== candIsLand) return false;

  const targetIsPW = target.types.includes("Planeswalker");
  const candIsPW = candidate.types.includes("Planeswalker");
  if (targetIsPW !== candIsPW) return false;

  const targetIsInstantOrSorcery =
    target.types.includes("Instant") || target.types.includes("Sorcery");
  const candIsInstantOrSorcery =
    candidate.types.includes("Instant") || candidate.types.includes("Sorcery");
  if (targetIsInstantOrSorcery && !candIsInstantOrSorcery) return false;
  if (!targetIsInstantOrSorcery && candIsInstantOrSorcery) return false;

  return true;
}

function isPauperLegal(
  card: MasterCatalogCard,
  relInfo?: CardReleaseInfo,
  hasBenchmarkMatch = false,
): boolean {
  if (hasBenchmarkMatch) return true;
  if (card.presentInCubes.includes("hugues_pauper")) return true;
  if (card.types.includes("Planeswalker") || card.types.includes("Battle")) return false;
  if (card.subtypes.includes("Saga")) return false;

  const obj = card as unknown as { legalities?: Record<string, string>; rarity?: string };
  if (obj.legalities?.Pauper === "not_legal") return false;
  if (obj.rarity && obj.rarity !== "common") return false;

  if (relInfo?.rarity && relInfo.rarity !== "common") return false;
  return true;
}

function isPeasantLegal(
  card: MasterCatalogCard,
  relInfo?: CardReleaseInfo,
  hasBenchmarkMatch = false,
): boolean {
  if (hasBenchmarkMatch) return true;
  if (card.presentInCubes.includes("titou_arena_peasant_plus")) return true;
  if (card.isLand || card.types.includes("Land")) return true;
  if (card.types.includes("Planeswalker")) return false;

  const obj = card as unknown as { rarity?: string };
  if (obj.rarity && !["common", "uncommon"].includes(obj.rarity)) return false;
  if (relInfo?.rarity && !["common", "uncommon"].includes(relInfo.rarity)) return false;
  return true;
}

export const TITOU_TRIBAL_SPECIFIC_TRIBES = new Set([
  "Dragon",
  "Goblin",
  "Elf",
  "Vampire",
  "Angel",
  "Wizard",
  "Wolf",
  "Werewolf",
  "Zombie",
  "Merfolk",
  "Sliver",
  "Eldrazi",
  "Faerie",
  "Spirit",
]);

export const TITOU_TRIBAL_SECONDARY_TRIBES = new Set([
  "Human",
  "Cleric",
  "Knight",
  "Soldier",
  "Warrior",
  "Shaman",
  "Rogue",
  "Dinosaur",
]);

export const POWER_9_AND_RESTRICTED_FAST_MANA = new Set([
  "black lotus",
  "ancestral recall",
  "time walk",
  "timetwister",
  "mox pearl",
  "mox sapphire",
  "mox jet",
  "mox ruby",
  "mox emerald",
  "sol ring",
  "mana crypt",
  "mana vault",
  "library of alexandria",
  "bazaar of baghdad",
]);

function isChangelingCard(
  card: MasterCatalogCard | { typeLine?: string; oracleText?: string },
): boolean {
  const text = (card.oracleText ?? "").toLowerCase();
  const typeLine = (card.typeLine ?? "").toLowerCase();
  return (
    typeLine.includes("changeling") ||
    typeLine.includes("changelin") ||
    text.includes("changeling") ||
    text.includes("every creature type") ||
    text.includes("tous les types de créature")
  );
}

function isUniversalTribalCard(card: MasterCatalogCard | { oracleText?: string }): boolean {
  const text = (card.oracleText ?? "").toLowerCase();
  return (
    text.includes("choose a creature type") ||
    text.includes("chosen creature type") ||
    text.includes("choisissez un type de créature") ||
    text.includes("du type choisi")
  );
}

function getCardTribes(card: MasterCatalogCard): string[] {
  if (isChangelingCard(card)) {
    return ["*changeling*"];
  }

  // 1. Check creature subtypes for specific primary tribes (Dragon, Goblin, Elf, Vampire, Angel, Wizard, etc.)
  if (Array.isArray(card.subtypes)) {
    const specific = (card.subtypes as readonly string[]).filter((st) =>
      TITOU_TRIBAL_SPECIFIC_TRIBES.has(st),
    );
    if (specific.length > 0) {
      if (specific.includes("Wolf") || specific.includes("Werewolf")) {
        return ["Wolf", "Werewolf"];
      }
      return [...specific];
    }

    // 2. If no specific primary tribe, check secondary tribal archetypes (Human, Cleric, Knight, etc.)
    const secondary = (card.subtypes as readonly string[]).filter((st) =>
      TITOU_TRIBAL_SECONDARY_TRIBES.has(st),
    );
    if (secondary.length > 0) {
      return [...secondary];
    }
  }

  // 3. Non-creature cards with explicit tribal dedication (spells, enchantments, artifacts)
  const text = card.oracleText.toLowerCase();
  const typeLine = card.typeLine.toLowerCase();

  for (const tribe of TITOU_TRIBAL_SPECIFIC_TRIBES) {
    const lower = tribe.toLowerCase();
    const reg = new RegExp(`\\b${lower}s?\\b`, "i");
    if (reg.test(text) || reg.test(typeLine)) {
      if (tribe === "Wolf" || tribe === "Werewolf") {
        return ["Wolf", "Werewolf"];
      }
      return [tribe];
    }
  }

  for (const tribe of TITOU_TRIBAL_SECONDARY_TRIBES) {
    const lower = tribe.toLowerCase();
    const reg = new RegExp(`\\b${lower}s?\\b`, "i");
    if (reg.test(text) || reg.test(typeLine)) {
      return [tribe];
    }
  }

  return [];
}

function areTribalCardsCompatible(
  target: MasterCatalogCard,
  candidate: MasterCatalogCard,
): boolean {
  if (isChangelingCard(candidate) || isChangelingCard(target)) {
    return true;
  }

  const targetIsUniversal = isUniversalTribalCard(target);
  if (targetIsUniversal) {
    return isUniversalTribalCard(candidate) || isChangelingCard(candidate);
  }

  const targetTribes = getCardTribes(target);
  // If target is not a tribal card (e.g. generic removal, fetchland, signet), allow standard replacement
  if (targetTribes.length === 0) {
    return true;
  }

  const candTribes = getCardTribes(candidate);
  return targetTribes.some((t) => candTribes.includes(t));
}

function generateStrategicRole(cand: MasterCatalogCard): string {
  const roles = cand.objectiveAnalysis.roles;
  if (roles.includes("premium_removal")) return "Interaction & Retrait Premium Inconditionnel";
  if (roles.includes("engine")) return "Moteur de Synergie & Récurrence Continue";
  if (roles.includes("card_advantage")) return "Générateur de Card Advantage Actif";
  if (roles.includes("bomb") || roles.includes("finisher"))
    return "Menace Déterminante de Fin de Partie";
  if (roles.includes("mana_ramp") || roles.includes("mana_fixing"))
    return "Accélération & Fixation de Mana";
  if (roles.includes("beater")) return "Pression Aggro & Présence sur Table Efficace";
  if (roles.includes("cantrip")) return "Filtrage de Bibliothèque & Fluidité";
  if (roles.includes("synergy_payoff")) return "Payoff Clé d'Archétype";
  if (roles.includes("synergy_enabler")) return "Enabler Majeur de Synergies";
  return "Polyvalence Stratégique & Impact Supérieur";
}

function findAffectedArchetypes(
  cand: MasterCatalogCard,
  cubeMeta?: AdvisorCubeMeta,
): readonly string[] {
  if (!cubeMeta?.archetypes) return [];
  const matched: string[] = [];
  for (const arch of cubeMeta.archetypes) {
    const archColors = arch.primaryColors ?? [];
    const colorMatch =
      cand.colors.length === 0 ||
      cand.colors.every((c) => archColors.includes(c) || (arch.splashColors ?? []).includes(c));

    if (colorMatch) {
      const text = `${cand.oracleText} ${cand.typeLine}`.toLowerCase();
      const archNameLower = arch.name.toLowerCase();
      const isThematic =
        archNameLower.split(" ").some((word) => word.length > 3 && text.includes(word)) ||
        cand.subtypes.some((st) => archNameLower.includes(st.toLowerCase()));
      if (isThematic || cand.colors.length > 0) {
        matched.push(arch.name);
      }
    }
  }
  return matched.slice(0, 3);
}

function generateMetaAddedValue(
  target: MasterCatalogCard,
  cand: MasterCatalogCard,
  scoreDelta: number,
  cubeMeta?: AdvisorCubeMeta,
  relInfo?: CardReleaseInfo,
  benchmarks: readonly string[] = [],
): MetaAddedValueAnalysis {
  const roundedDelta = Math.round(scoreDelta * 10) / 10;
  const strategicRole = generateStrategicRole(cand);
  const affected = findAffectedArchetypes(cand, cubeMeta);
  const yr = relInfo?.firstPrintYear;
  const isRecent = yr !== undefined && yr >= 2023;

  const releaseContext = isRecent
    ? `✨ Nouveauté (${String(yr)}) — Veille active${relInfo?.set ? ` [${relInfo.set}]` : ""}`
    : yr !== undefined
      ? `Référence confirmée (${String(yr)})`
      : "Référence du format";

  const benchmarkPresence =
    benchmarks.length > 0 ? `Vu dans ${benchmarks.slice(0, 2).join(" & ")}` : undefined;

  let summary = "";
  const archText =
    affected.length > 0 ? ` les archétypes ${affected.join(" & ")}` : " la méta du cube";

  if (cand.cmc < target.cmc) {
    summary = `Accélère le tempo de la curve (${String(cand.cmc)} vs ${String(target.cmc)} mana) tout en renforçant${archText} (+${String(roundedDelta)} pts).`;
  } else if (cand.types.includes("Creature")) {
    summary = `Offre un body plus compétitif et un impact immédiat sur le board pour dynamiser${archText} (+${String(roundedDelta)} pts).`;
  } else {
    summary = `Apporte une flexibilité tactique et une efficacité accrue en optimisant${archText} (+${String(roundedDelta)} pts).`;
  }

  return {
    summary,
    affectedArchetypes: affected,
    strategicRole,
    benchmarkPresence,
    releaseContext,
  };
}

function generateSwapReason(
  target: MasterCatalogCard,
  cand: MasterCatalogCard,
  scoreDelta: number,
  isTribalMatch: boolean,
): string {
  const roundedDelta = Math.round(scoreDelta * 10) / 10;
  const candRoles = cand.objectiveAnalysis.roles;
  const targetRoles = target.objectiveAnalysis.roles;

  if (isTribalMatch) {
    const sharedSubtype = cand.subtypes.find((s) => target.subtypes.includes(s)) ?? "Tribal";
    return `Maintient la synergie ${sharedSubtype} tout en offrant une présence sur table et un impact considérablement supérieurs (+${String(roundedDelta)} pts).`;
  }

  if (cand.cmc < target.cmc) {
    return `Coût de mana plus agressif (${String(cand.cmc)} vs ${String(target.cmc)}) permettant d'accélérer le tempo et d'optimiser la curve (+${String(roundedDelta)} pts).`;
  }

  if (candRoles.includes("premium_removal") || targetRoles.includes("situational_removal")) {
    return `Gestion beaucoup plus polyvalente, inconditionnelle et fiable pour le même coût de mana (+${String(roundedDelta)} pts).`;
  }

  if (candRoles.includes("engine") || candRoles.includes("card_advantage")) {
    return `Moteur de card advantage et de récurrence moderne, remplaçant un effet ponctuel dépassé (+${String(roundedDelta)} pts).`;
  }

  return `Même coût de mana (${String(target.cmc)}), mais offre une polyvalence, des statistiques et un impact de jeu nettement supérieurs (+${String(roundedDelta)} pts).`;
}

function toCardRef(
  card: MasterCatalogCard,
  cubeKey: string,
  relInfo?: CardReleaseInfo,
  thresholds?: readonly CubeTierThreshold[],
): UpgradeCardRef {
  const yr = relInfo?.firstPrintYear;
  const isRecent = yr !== undefined && yr >= 2023;
  return {
    oracleId: card.oracleId,
    name: card.name,
    score: getCardScore(card),
    tier: getCardTier(card, cubeKey, thresholds),
    cmc: card.cmc,
    typeLine: card.typeLine,
    imageUrl: card.image?.url ?? card.imageUrl,
    frenchName: card.frenchName,
    frenchImageUrl: card.frenchImageUrl,
    colors: card.colors,
    releaseYear: yr,
    set: relInfo?.set,
    isRecent,
  };
}

export function generateCubeUpgradeProposals(
  cubeKey: string,
  catalogCards: readonly MasterCatalogCard[],
  cubeMeta?: AdvisorCubeMeta,
  cubeCobraStatsMap?: ReadonlyMap<string, CubeCobraStats>,
  releaseMetadataMap?: ReadonlyMap<string, CardReleaseInfo>,
  benchmarkCardsMap?: ReadonlyMap<string, readonly string[]>,
): Record<string, UpgradeProposal> {
  const proposals: Record<string, UpgradeProposal> = {};

  // 1. Identify target cards currently in the cube that are candidates for an upgrade
  const cubeCards = catalogCards.filter((c) => c.presentInCubes.includes(cubeKey));
  const thresholds = computeCubeTierThresholds(cubeCards);
  const eligibleTargets = cubeCards.filter((c) => isWeakTarget(c, cubeKey));

  // 2. Identify candidate pool: cards in catalog NOT in this cube
  const candidatePool = catalogCards.filter((c) => !c.presentInCubes.includes(cubeKey));

  const policy = getAdvisorCubePolicy(cubeKey);

  for (const target of eligibleTargets) {
    const targetScore = getCardScore(target);
    let bestCandidate: MasterCatalogCard | null = null;
    let bestScore = -Infinity;
    let bestIsTribal = false;
    let bestRelInfo: CardReleaseInfo | undefined = undefined;
    let bestBenchmarks: readonly string[] = [];

    for (const cand of candidatePool) {
      const candLower = cand.name.toLowerCase();
      const relInfo = releaseMetadataMap?.get(candLower);
      const benchmarks = benchmarkCardsMap?.get(candLower) ?? [];
      const hasBenchmark = benchmarks.length > 0;

      if (policy.rarity === "pauper" && !isPauperLegal(cand, relInfo, hasBenchmark)) continue;
      if (policy.rarity === "peasant" && !isPeasantLegal(cand, relInfo, hasBenchmark)) continue;

      // Fast mana & Power 9 restriction for unpowered cubes
      if (!policy.allowsRestrictedFastMana && POWER_9_AND_RESTRICTED_FAST_MANA.has(candLower)) {
        continue;
      }

      // Strict Tribal Coherence for Titou's Tribal Cube:
      // Tribal cards can ONLY be replaced by cards of the same tribe (or Changelings)
      if (policy.preserveCreatureTypes && !areTribalCardsCompatible(target, cand)) continue;

      // Color compatibility
      if (!areColorsCompatible(target.colors, cand.colors)) continue;

      // Mana curve constraint:
      // For creatures: preserve board curve tightly (|delta CMC| <= 1)
      // For non-creatures: allow cheaper efficient spells (target.cmc - 2 <= cand.cmc <= target.cmc + 1)
      const cmcDelta = cand.cmc - target.cmc;
      const isCreature = target.types.includes("Creature");
      if (isCreature) {
        if (Math.abs(cmcDelta) > 1) continue;
      } else {
        if (cmcDelta > 1 || cmcDelta < -2) continue;
      }

      // Type compatibility
      if (!areTypesCompatible(target, cand)) continue;

      const candScore = getCardScore(cand);
      const scoreDelta = candScore - targetScore;

      // Minimum power improvement threshold (+5.0 points)
      if (scoreDelta < 5.0) continue;

      // Calculate composite score
      let matchScore = candScore;

      // Mana efficiency bonus (prefer equal or lower CMC)
      if (cmcDelta < 0) matchScore += 3;
      else if (cmcDelta === 0) matchScore += 1;

      // Tribal affinity bonus for Titou's Tribal
      let isTribalMatch = false;
      if (policy.preserveCreatureTypes) {
        const targetTribes = getCardTribes(target);
        if (targetTribes.length > 0 || isUniversalTribalCard(target)) {
          matchScore += 30; // High priority to preserve tribal coherence
          isTribalMatch = true;
        }
      }

      // Recency bonus (< 3 years / year >= 2023): Active monitoring (veille) priority
      const firstPrintYear = relInfo?.firstPrintYear;
      const isRecent = firstPrintYear !== undefined && firstPrintYear >= 2023;
      if (isRecent) {
        matchScore += 20; // Strong preference for modern additions
      }

      // Peer CubeCobra benchmark bonus: proven staples in popular cubes
      if (benchmarks.length > 0) {
        matchScore += 15;
      }

      // CubeCobra stats bonus if available
      const stats = cubeCobraStatsMap?.get(candLower);
      if (stats?.popularity) matchScore += Math.min(5, stats.popularity);

      if (matchScore > bestScore) {
        bestScore = matchScore;
        bestCandidate = cand;
        bestIsTribal = isTribalMatch;
        bestRelInfo = relInfo;
        bestBenchmarks = benchmarks;
      }
    }

    if (bestCandidate) {
      const delta = getCardScore(bestCandidate) - targetScore;
      const swapType: SwapType =
        bestCandidate.cmc <= target.cmc && delta >= 15
          ? "strict_upgrade"
          : bestIsTribal
            ? "archetype_booster"
            : "versatile_alternative";

      const candStats = cubeCobraStatsMap?.get(bestCandidate.name.toLowerCase());
      const metaAddedValue = generateMetaAddedValue(
        target,
        bestCandidate,
        delta,
        cubeMeta,
        bestRelInfo,
        bestBenchmarks,
      );

      proposals[target.name] = {
        targetCard: toCardRef(
          target,
          cubeKey,
          releaseMetadataMap?.get(target.name.toLowerCase()),
          thresholds,
        ),
        suggestedCard: toCardRef(bestCandidate, cubeKey, bestRelInfo, thresholds),
        swapType,
        scoreDelta: Math.round(delta * 10) / 10,
        reason: generateSwapReason(target, bestCandidate, delta, bestIsTribal),
        metaAddedValue,
        releaseYear: bestRelInfo?.firstPrintYear,
        isRecent: bestRelInfo?.firstPrintYear !== undefined && bestRelInfo.firstPrintYear >= 2023,
        benchmarkCubes: bestBenchmarks.length > 0 ? bestBenchmarks : undefined,
        cubeCobraStats: candStats,
      };
    }
  }

  return proposals;
}

export function generateCubeMaybeboard(
  cubeKey: string,
  catalogCards: readonly MasterCatalogCard[],
  cubeMeta?: AdvisorCubeMeta,
  cubeCobraStatsMap?: ReadonlyMap<string, CubeCobraStats>,
  releaseMetadataMap?: ReadonlyMap<string, CardReleaseInfo>,
  benchmarkCardsMap?: ReadonlyMap<string, readonly string[]>,
  maxSuggestions = 30,
  upgrades?: Readonly<Record<string, UpgradeProposal>>,
): readonly MaybeboardSuggestion[] {
  const cubeCards = catalogCards.filter((c) => c.presentInCubes.includes(cubeKey));
  const thresholds = computeCubeTierThresholds(cubeCards);
  const candidatePool = catalogCards.filter((c) => !c.presentInCubes.includes(cubeKey));

  const policy = getAdvisorCubePolicy(cubeKey);
  const archetypes = cubeMeta?.archetypes ?? [];

  // Map suggested card name -> list of targets it replaces in the cube
  const replacesByCardName = new Map<string, UpgradeTargetSummary[]>();
  const effectiveUpgrades =
    upgrades ??
    generateCubeUpgradeProposals(
      cubeKey,
      catalogCards,
      cubeMeta,
      cubeCobraStatsMap,
      releaseMetadataMap,
      benchmarkCardsMap,
    );

  for (const up of Object.values(effectiveUpgrades)) {
    const suggName = up.suggestedCard.name;
    const list = replacesByCardName.get(suggName) ?? [];
    list.push({
      name: up.targetCard.name,
      frenchName: up.targetCard.frenchName,
      score: up.targetCard.score,
      tier: up.targetCard.tier,
      scoreDelta: up.scoreDelta,
      reason: up.reason,
    });
    replacesByCardName.set(suggName, list);
  }

  const scoredCandidates: {
    cand: MasterCatalogCard;
    compositeScore: number;
    matchedArchetypes: string[];
    role: MaybeboardSuggestion["role"];
    relInfo?: CardReleaseInfo | undefined;
    benchmarks: readonly string[];
  }[] = [];

  for (const cand of candidatePool) {
    const candLower = cand.name.toLowerCase();
    const relInfo = releaseMetadataMap?.get(candLower);
    const benchmarks = benchmarkCardsMap?.get(candLower) ?? [];
    const hasBenchmark = benchmarks.length > 0;

    if (policy.rarity === "pauper" && !isPauperLegal(cand, relInfo, hasBenchmark)) continue;
    if (policy.rarity === "peasant" && !isPeasantLegal(cand, relInfo, hasBenchmark)) continue;

    // Fast mana & Power 9 restriction for unpowered cubes
    if (!policy.allowsRestrictedFastMana && POWER_9_AND_RESTRICTED_FAST_MANA.has(candLower)) {
      continue;
    }

    const score = getCardScore(cand);
    const replacesList = replacesByCardName.get(cand.name);
    const isReplacement = Boolean(replacesList && replacesList.length > 0);

    // For Titou's Tribal Cube: any creature in Maybeboard must belong to a recognized tribe, be universal tribal or changeling
    if (policy.preserveCreatureTypes && cand.types.includes("Creature") && !isReplacement) {
      const candTribes = getCardTribes(cand);
      const isUniversal = isUniversalTribalCard(cand);
      if (candTribes.length === 0 && !isUniversal) continue;
    }

    // Only consider solid cards (score >= 25) unless it's a dedicated upgrade replacement
    if (score < 25 && !isReplacement) continue;

    let compositeScore = score;
    if (isReplacement) {
      compositeScore += 30; // Direct upgrade replacement in this cube!
    }

    const matchedArchetypes: string[] = [];

    // Check archetype color matches & text alignment
    for (const arch of archetypes) {
      const archColors = arch.primaryColors ?? [];
      const hasColorMatch =
        cand.colors.length > 0 && cand.colors.every((c) => archColors.includes(c));

      if (hasColorMatch) {
        matchedArchetypes.push(arch.id);
        compositeScore += 4;
      }
    }

    const firstPrintYear = relInfo?.firstPrintYear;
    const isRecent = firstPrintYear !== undefined && firstPrintYear >= 2023;

    // Recency bonus: "veille active des cartes < 3 ans"
    if (isRecent) {
      compositeScore += 16;
    }

    // Benchmark bonus: "priorité aux cubes similaires populaires"
    if (benchmarks.length > 0) {
      compositeScore += 14;
    }

    const stats = cubeCobraStatsMap?.get(candLower);
    if (stats?.popularity) compositeScore += Math.min(10, stats.popularity * 1.5);
    if (stats?.elo) compositeScore += (stats.elo - 1200) / 100;

    const roles = cand.objectiveAnalysis.roles;
    let role: MaybeboardSuggestion["role"] = "staple";
    if (roles.includes("premium_removal")) role = "premium_interaction";
    else if (roles.includes("engine")) role = "engine";
    else if (matchedArchetypes.length > 0) role = "archetype_payoff";

    scoredCandidates.push({
      cand,
      compositeScore,
      matchedArchetypes,
      role,
      relInfo,
      benchmarks,
    });
  }

  scoredCandidates.sort((a, b) => b.compositeScore - a.compositeScore);

  const targetCount = Math.max(maxSuggestions, replacesByCardName.size + 15);
  const selectedCards = new Map<string, (typeof scoredCandidates)[0]>();

  // 1. Guarantee inclusion of every unique card that was proposed as an upgrade
  for (const item of scoredCandidates) {
    if (replacesByCardName.has(item.cand.name)) {
      selectedCards.set(item.cand.name, item);
    }
  }

  // 2. Complete with highest compositeScore candidates up to targetCount
  for (const item of scoredCandidates) {
    if (selectedCards.size >= targetCount) break;
    if (!selectedCards.has(item.cand.name)) {
      selectedCards.set(item.cand.name, item);
    }
  }

  const selected = Array.from(selectedCards.values()).sort(
    (a, b) => b.compositeScore - a.compositeScore,
  );

  const results: MaybeboardSuggestion[] = [];

  for (const item of selected) {
    const cand = item.cand;
    const stats = cubeCobraStatsMap?.get(cand.name.toLowerCase());
    const score = getCardScore(cand);
    const replacesCards = replacesByCardName.get(cand.name);

    let rationale = `Carte de calibre compétitif (Score ${String(score)}/55), offrant une régularité et une puissance élevées pour dynamiser le format.`;
    if (replacesCards && replacesCards.length > 0 && replacesCards[0]) {
      const topReplaced = replacesCards[0];
      rationale = `Proposée en remplacement poste pour poste de ${topReplaced.name} (+${String(topReplaced.scoreDelta)} pts). ${topReplaced.reason}`;
    } else if (item.matchedArchetypes.length > 0) {
      const archNames = item.matchedArchetypes
        .map((id) => archetypes.find((a) => a.id === id)?.name ?? id)
        .slice(0, 2)
        .join(" et ");
      rationale = `Renforce directement les archétypes ${archNames} grâce à une excellente cohérence de tempo et d'impact.`;
    }

    const metaAddedValue = generateMetaAddedValue(
      cand,
      cand,
      score,
      cubeMeta,
      item.relInfo,
      item.benchmarks,
    );

    const yr = item.relInfo?.firstPrintYear;
    const isRecent = yr !== undefined && yr >= 2023;

    results.push({
      card: toCardRef(cand, cubeKey, item.relInfo, thresholds),
      archetypes: item.matchedArchetypes,
      role: item.role,
      rationale,
      metaAddedValue,
      releaseYear: yr,
      isRecent,
      benchmarkCubes: item.benchmarks.length > 0 ? item.benchmarks : undefined,
      cubeCobraStats: stats,
      replacesCards: replacesCards && replacesCards.length > 0 ? replacesCards : undefined,
    });
  }

  return results;
}

export function generateCubeSuggestionsReport(
  cubeKey: string,
  catalogCards: readonly MasterCatalogCard[],
  cubeMeta?: AdvisorCubeMeta,
  cubeCobraStatsMap?: ReadonlyMap<string, CubeCobraStats>,
  releaseMetadataMap?: ReadonlyMap<string, CardReleaseInfo>,
  benchmarkCardsMap?: ReadonlyMap<string, readonly string[]>,
): CubeSuggestionsReport {
  const upgrades = generateCubeUpgradeProposals(
    cubeKey,
    catalogCards,
    cubeMeta,
    cubeCobraStatsMap,
    releaseMetadataMap,
    benchmarkCardsMap,
  );
  const maybeboard = generateCubeMaybeboard(
    cubeKey,
    catalogCards,
    cubeMeta,
    cubeCobraStatsMap,
    releaseMetadataMap,
    benchmarkCardsMap,
    30,
    upgrades,
  );

  const upgradeValues = Object.values(upgrades);
  const recentUpgradesCount = upgradeValues.filter((u) => u.isRecent).length;
  const benchmarkMatchesCount = upgradeValues.filter(
    (u) => (u.benchmarkCubes?.length ?? 0) > 0,
  ).length;

  return {
    schemaVersion: 1,
    cubeKey,
    generatedAt: new Date().toISOString(),
    stats: {
      totalUpgrades: upgradeValues.length,
      totalMaybeboard: maybeboard.length,
      recentUpgradesCount,
      benchmarkMatchesCount,
    },
    upgrades,
    maybeboard,
  };
}
