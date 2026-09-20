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
  readonly rankingScore: number;
  readonly rankingFactors: readonly RankingFactor[];
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
  readonly rankingScore: number;
  readonly rankingFactors: readonly RankingFactor[];
}

export interface RankingFactor {
  readonly key:
    | "power"
    | "role_alignment"
    | "mana_efficiency"
    | "tribal_coherence"
    | "recent_release"
    | "peer_benchmark"
    | "popularity"
    | "elo"
    | "direct_replacement"
    | "archetype_match";
  readonly points: number;
}

export interface AdvisorSourceFingerprint {
  readonly id: string;
  readonly version: string;
  readonly sha256: string;
  readonly license: string;
  readonly method: string;
}

export interface AdvisorRunContext {
  readonly generatedAt: string;
  readonly catalog: AdvisorSourceFingerprint;
  readonly releaseMetadata: AdvisorSourceFingerprint;
  readonly benchmarks: AdvisorSourceFingerprint;
  readonly cubeCobra: AdvisorSourceFingerprint;
}

export interface CubeSuggestionsReport {
  readonly schemaVersion: 2;
  readonly engineVersion: "cube-upgrade-advisor@3";
  readonly cubeKey: string;
  readonly snapshotId: string;
  readonly generatedAt: string;
  readonly sourceProvenance: AdvisorRunContext & {
    readonly recentWindow: {
      readonly years: 3;
      readonly referenceYear: number | null;
      readonly earliestYear: number | null;
    };
  };
  readonly sourceCoverage: {
    readonly catalogCards: number;
    readonly availableCandidates: number;
    readonly benchmarkCards: number;
    readonly benchmarkCardsInCatalog: number;
    readonly missingBenchmarkCards: number;
    readonly benchmarkCoveragePercentage: number;
  };
  readonly stats: {
    readonly totalUpgrades: number;
    readonly totalMaybeboard: number;
    readonly recentUpgradesCount: number;
    readonly benchmarkMatchesCount: number;
    readonly recentMaybeboardCount: number;
    readonly directReplacementMaybeboardCount: number;
  };
  readonly upgrades: Record<string, UpgradeProposal>;
  readonly maybeboard: readonly MaybeboardSuggestion[];
}

export interface AdvisorCubeMeta {
  readonly cubeKey: string;
  readonly activeSnapshotId?: string | undefined;
  readonly archetypes?: readonly {
    readonly id: string;
    readonly name: string;
    readonly primaryColors?: readonly string[];
    readonly splashColors?: readonly string[];
    readonly creatureTypes?: readonly string[];
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

const MIN_INTERESTING_CARD_SCORE = 25;
const UPGRADE_RECENCY_BONUS = 6;
const MAYBEBOARD_RECENCY_BONUS = 6;
const RECENT_WINDOW_YEARS = 3;
const MAX_DISCOVERY_SCORE_GAP = 6;

function getRecentReferenceYear(
  releaseMetadataMap?: ReadonlyMap<string, CardReleaseInfo>,
): number | undefined {
  if (!releaseMetadataMap) return undefined;
  const years = [...releaseMetadataMap.values()]
    .map((release) => release.firstPrintYear)
    .filter((year) => Number.isInteger(year));
  return years.length > 0 ? Math.max(...years) : undefined;
}

function isRecentRelease(
  releaseInfo: CardReleaseInfo | undefined,
  referenceYear: number | undefined,
): boolean {
  return (
    releaseInfo !== undefined &&
    referenceYear !== undefined &&
    releaseInfo.firstPrintYear >= referenceYear - (RECENT_WINDOW_YEARS - 1)
  );
}

function sumRankingFactors(factors: readonly RankingFactor[]): number {
  return factors.reduce((sum, factor) => sum + factor.points, 0);
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
  // Multi-color: a candidate may keep the same colors or reduce color requirements.
  return candidateColors.every((color) => targetColors.includes(color));
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

  for (const preservedType of ["Artifact", "Enchantment", "Battle"] as const) {
    if (target.types.includes(preservedType) && !candidate.types.includes(preservedType)) {
      return false;
    }
  }

  const specializedSubtypes = new Set([
    "Aura",
    "Class",
    "Clue",
    "Equipment",
    "Food",
    "Map",
    "Saga",
    "Treasure",
    "Vehicle",
  ]);
  const targetSpecializations = target.subtypes.filter((subtype) =>
    specializedSubtypes.has(subtype),
  );
  const candidateSpecializations = candidate.subtypes.filter((subtype) =>
    specializedSubtypes.has(subtype),
  );
  if (
    (targetSpecializations.length > 0 || candidateSpecializations.length > 0) &&
    !targetSpecializations.some((subtype) => candidateSpecializations.includes(subtype))
  ) {
    return false;
  }

  const targetIsInstantOrSorcery =
    target.types.includes("Instant") || target.types.includes("Sorcery");
  const candIsInstantOrSorcery =
    candidate.types.includes("Instant") || candidate.types.includes("Sorcery");
  if (targetIsInstantOrSorcery && !candIsInstantOrSorcery) return false;
  if (!targetIsInstantOrSorcery && candIsInstantOrSorcery) return false;

  return true;
}

type RulesFunction =
  | "blink"
  | "card_selection"
  | "counterspell"
  | "discard"
  | "mana"
  | "reanimation"
  | "removal"
  | "tokens";

function getRulesFunctions(card: MasterCatalogCard): ReadonlySet<RulesFunction> {
  const text = card.oracleText.toLowerCase();
  const functions = new Set<RulesFunction>();

  if (
    text.includes("destroy target") ||
    text.includes("exile target") ||
    /deals? [^.]*(?:damage to any target|damage to target)/.test(text)
  ) {
    functions.add("removal");
  }
  if (text.includes("counter target spell")) functions.add("counterspell");
  if (
    text.includes("draw a card") ||
    text.includes("draw two cards") ||
    text.includes("draw three cards") ||
    text.includes("scry ") ||
    text.includes("surveil ") ||
    text.includes("look at the top")
  ) {
    functions.add("card_selection");
  }
  if (
    text.includes("add {") ||
    text.includes("add one mana") ||
    text.includes("add two mana") ||
    /search your library for [^.]*land card[^.]*battlefield/.test(text)
  ) {
    functions.add("mana");
  }
  if (/from (?:a|your) graveyard to the battlefield/.test(text)) {
    functions.add("reanimation");
  }
  if (text.includes("exile") && text.includes("you control") && text.includes("return")) {
    functions.add("blink");
  }
  if (/create [^.]* token/.test(text)) functions.add("tokens");
  if (text.includes("opponent discards") || text.includes("target player discards")) {
    functions.add("discard");
  }

  return functions;
}

function areRulesFunctionsCompatible(
  target: MasterCatalogCard,
  candidate: MasterCatalogCard,
): boolean {
  const targetFunctions = getRulesFunctions(target);
  const candidateFunctions = getRulesFunctions(candidate);
  if (targetFunctions.size === 0 || candidateFunctions.size === 0) return true;
  return [...targetFunctions].some((role) => candidateFunctions.has(role));
}

const ALL_MANA_COLORS = ["W", "U", "B", "R", "G"] as const;

function getLandManaColors(card: MasterCatalogCard): readonly string[] {
  if (card.producesColors.length > 0) return card.producesColors;
  const text = card.oracleText.toLowerCase();
  if (text.includes("any color") || text.includes("basic land card")) return ALL_MANA_COLORS;
  return card.colorIdentity;
}

function preservesLandManaAccess(target: MasterCatalogCard, candidate: MasterCatalogCard): boolean {
  if (!target.isLand && !target.types.includes("Land")) return true;
  const targetColors = getLandManaColors(target);
  const candidateColors = getLandManaColors(candidate);
  if (targetColors.length === 0) return candidateColors.length === 0;
  return targetColors.every((color) => candidateColors.includes(color));
}

const FUNCTIONAL_ROLE_FAMILIES = [
  ["premium_removal", "situational_removal"],
  ["engine", "card_advantage"],
  ["mana_ramp", "mana_fixing"],
  ["bomb", "finisher", "beater"],
  ["cantrip"],
  ["synergy_payoff", "synergy_enabler"],
] as const;

function getRoleAlignmentBonus(target: MasterCatalogCard, candidate: MasterCatalogCard): number {
  const targetRoles = new Set(target.objectiveAnalysis.roles);
  const candidateRoles = new Set(candidate.objectiveAnalysis.roles);
  const alignedFamilies = FUNCTIONAL_ROLE_FAMILIES.filter(
    (family) =>
      family.some((role) => targetRoles.has(role)) &&
      family.some((role) => candidateRoles.has(role)),
  ).length;
  return Math.min(12, alignedFamilies * 8);
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

function isCandidateAllowedByPolicy(
  card: MasterCatalogCard,
  policy: AdvisorCubePolicy,
  releaseInfo: CardReleaseInfo | undefined,
  hasBenchmarkMatch: boolean,
): boolean {
  if (policy.rarity === "pauper" && !isPauperLegal(card, releaseInfo, hasBenchmarkMatch)) {
    return false;
  }
  if (policy.rarity === "peasant" && !isPeasantLegal(card, releaseInfo, hasBenchmarkMatch)) {
    return false;
  }
  return (
    policy.allowsRestrictedFastMana ||
    !POWER_9_AND_RESTRICTED_FAST_MANA.has(card.name.toLowerCase())
  );
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
  "Shapeshifter",
]);

export const TITOU_TRIBAL_SECONDARY_TRIBES = new Set(["Human", "Cleric"]);

function getSupportedCreatureTypes(cubeMeta?: AdvisorCubeMeta): ReadonlySet<string> {
  const configuredTypes =
    cubeMeta?.archetypes?.flatMap((archetype) => archetype.creatureTypes ?? []) ?? [];
  if (configuredTypes.length > 0) return new Set(configuredTypes);
  return new Set([...TITOU_TRIBAL_SPECIFIC_TRIBES, ...TITOU_TRIBAL_SECONDARY_TRIBES]);
}

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
  const choosesCreatureType =
    text.includes("choose a creature type") ||
    text.includes("chosen creature type") ||
    text.includes("choisissez un type de créature") ||
    text.includes("du type choisi");
  if (!choosesCreatureType) return false;

  const typeLine = "typeLine" in card ? card.typeLine.toLowerCase() : "";
  if (typeLine.includes("creature") || typeLine.includes("créature")) {
    return (
      text.includes("this creature is the chosen type") ||
      text.includes("cette créature est du type choisi")
    );
  }

  return !text.includes("opponents control") && !text.includes("vos adversaires contrôlent");
}

function getCardTribes(
  card: MasterCatalogCard,
  supportedCreatureTypes: ReadonlySet<string>,
): string[] {
  if (isChangelingCard(card)) {
    return ["*changeling*"];
  }

  // 1. Check creature subtypes for specific primary tribes (Dragon, Goblin, Elf, Vampire, Angel, Wizard, etc.)
  if (Array.isArray(card.subtypes)) {
    const specific = (card.subtypes as readonly string[]).filter((st) =>
      supportedCreatureTypes.has(st),
    );
    if (specific.length > 0) {
      if (specific.includes("Wolf") || specific.includes("Werewolf")) {
        return ["Wolf", "Werewolf"];
      }
      return [...specific];
    }
  }

  // 2. Non-creature cards with explicit dedication to one of the cube's supported tribes.
  const text = card.oracleText.toLowerCase();
  const typeLine = card.typeLine.toLowerCase();

  for (const tribe of supportedCreatureTypes) {
    const lower = tribe.toLowerCase();
    const reg = new RegExp(`\\b${lower}s?\\b`, "i");
    if (reg.test(text) || reg.test(typeLine)) {
      if (tribe === "Wolf" || tribe === "Werewolf") {
        return ["Wolf", "Werewolf"];
      }
      return [tribe];
    }
  }

  return [];
}

function areTribalCardsCompatible(
  target: MasterCatalogCard,
  candidate: MasterCatalogCard,
  supportedCreatureTypes: ReadonlySet<string>,
): boolean {
  const targetIsUniversal = isChangelingCard(target) || isUniversalTribalCard(target);
  const candidateIsUniversal = isChangelingCard(candidate) || isUniversalTribalCard(candidate);
  if (targetIsUniversal) {
    return candidateIsUniversal;
  }
  if (candidateIsUniversal) {
    return true;
  }

  const targetTribes = getCardTribes(target, supportedCreatureTypes);
  // If target is not a tribal card (e.g. generic removal, fetchland, signet), allow standard replacement
  if (targetTribes.length === 0) {
    return true;
  }

  const candTribes = getCardTribes(candidate, supportedCreatureTypes);
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

function findMatchedArchetypeIds(
  card: MasterCatalogCard,
  archetypes: NonNullable<AdvisorCubeMeta["archetypes"]>,
  preserveCreatureTypes: boolean,
  supportedCreatureTypes: ReadonlySet<string>,
): string[] {
  const cardTribes = getCardTribes(card, supportedCreatureTypes);
  const universalTribal = isChangelingCard(card) || isUniversalTribalCard(card);

  return archetypes
    .filter((archetype) => {
      const allowedColors = [...(archetype.primaryColors ?? []), ...(archetype.splashColors ?? [])];
      const colorMatch =
        card.colors.length === 0 || card.colors.every((color) => allowedColors.includes(color));
      if (!colorMatch) return false;

      if (!preserveCreatureTypes || !card.types.includes("Creature")) {
        return card.colors.length > 0;
      }

      const archetypeTypes = archetype.creatureTypes ?? [];
      return (
        archetypeTypes.length > 0 &&
        (universalTribal || cardTribes.some((tribe) => archetypeTypes.includes(tribe)))
      );
    })
    .map((archetype) => archetype.id);
}

function findAffectedArchetypes(
  cand: MasterCatalogCard,
  cubeMeta?: AdvisorCubeMeta,
): readonly string[] {
  if (!cubeMeta?.archetypes) return [];
  const policy = getAdvisorCubePolicy(cubeMeta.cubeKey);
  const supportedCreatureTypes = getSupportedCreatureTypes(cubeMeta);
  return findMatchedArchetypeIds(
    cand,
    cubeMeta.archetypes,
    policy.preserveCreatureTypes,
    supportedCreatureTypes,
  )
    .map((id) => cubeMeta.archetypes?.find((archetype) => archetype.id === id)?.name ?? id)
    .slice(0, 3);
}

function generateMetaAddedValue(
  target: MasterCatalogCard,
  cand: MasterCatalogCard,
  scoreDelta: number,
  cubeMeta?: AdvisorCubeMeta,
  relInfo?: CardReleaseInfo,
  benchmarks: readonly string[] = [],
  recentReferenceYear?: number,
): MetaAddedValueAnalysis {
  const roundedDelta = Math.round(scoreDelta * 10) / 10;
  const strategicRole = generateStrategicRole(cand);
  const affected = findAffectedArchetypes(cand, cubeMeta);
  const yr = relInfo?.firstPrintYear;
  const isRecent = isRecentRelease(relInfo, recentReferenceYear);

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
  recentReferenceYear?: number,
): UpgradeCardRef {
  const yr = relInfo?.firstPrintYear;
  const isRecent = isRecentRelease(relInfo, recentReferenceYear);
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
  const supportedCreatureTypes = getSupportedCreatureTypes(cubeMeta);
  const recentReferenceYear = getRecentReferenceYear(releaseMetadataMap);

  for (const target of eligibleTargets) {
    const targetScore = getCardScore(target);
    let bestCandidate: MasterCatalogCard | null = null;
    let bestScore = -Infinity;
    let bestIsTribal = false;
    let bestRelInfo: CardReleaseInfo | undefined = undefined;
    let bestBenchmarks: readonly string[] = [];
    let bestRankingFactors: readonly RankingFactor[] = [];

    for (const cand of candidatePool) {
      const candLower = cand.name.toLowerCase();
      const relInfo = releaseMetadataMap?.get(candLower);
      const benchmarks = benchmarkCardsMap?.get(candLower) ?? [];
      const hasBenchmark = benchmarks.length > 0;

      if (!isCandidateAllowedByPolicy(cand, policy, relInfo, hasBenchmark)) continue;

      // Strict Tribal Coherence for Titou's Tribal Cube:
      // Tribal cards can ONLY be replaced by cards of the same tribe (or Changelings)
      if (
        policy.preserveCreatureTypes &&
        !areTribalCardsCompatible(target, cand, supportedCreatureTypes)
      )
        continue;

      // Color compatibility
      if (!areColorsCompatible(target.colors, cand.colors)) continue;
      if (!preservesLandManaAccess(target, cand)) continue;

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
      if (!areRulesFunctionsCompatible(target, cand)) continue;

      const candScore = getCardScore(cand);
      const scoreDelta = candScore - targetScore;

      if (candScore < MIN_INTERESTING_CARD_SCORE) continue;

      // Minimum power improvement threshold (+5.0 points)
      if (scoreDelta < 5.0) continue;

      // Calculate the auditable composite score.
      const rankingFactors: RankingFactor[] = [{ key: "power", points: candScore }];
      const roleAlignmentBonus = getRoleAlignmentBonus(target, cand);
      if (roleAlignmentBonus > 0) {
        rankingFactors.push({ key: "role_alignment", points: roleAlignmentBonus });
      }

      // Mana efficiency bonus (prefer equal or lower CMC)
      if (cmcDelta < 0) rankingFactors.push({ key: "mana_efficiency", points: 3 });
      else if (cmcDelta === 0) rankingFactors.push({ key: "mana_efficiency", points: 1 });

      // Tribal affinity bonus for Titou's Tribal
      let isTribalMatch = false;
      if (policy.preserveCreatureTypes) {
        const targetTribes = getCardTribes(target, supportedCreatureTypes);
        if (targetTribes.length > 0 || isUniversalTribalCard(target)) {
          rankingFactors.push({ key: "tribal_coherence", points: 30 });
          isTribalMatch = true;
        }
      }

      // Recency only separates otherwise close candidates.
      const isRecent = isRecentRelease(relInfo, recentReferenceYear);
      if (isRecent) {
        rankingFactors.push({ key: "recent_release", points: UPGRADE_RECENCY_BONUS });
      }

      // Peer CubeCobra benchmark bonus: proven staples in popular cubes
      if (benchmarks.length > 0) {
        rankingFactors.push({ key: "peer_benchmark", points: 15 });
      }

      // CubeCobra stats bonus if available
      const stats = cubeCobraStatsMap?.get(candLower);
      if (stats?.popularity) {
        rankingFactors.push({ key: "popularity", points: Math.min(5, stats.popularity) });
      }

      const matchScore = sumRankingFactors(rankingFactors);

      if (matchScore > bestScore) {
        bestScore = matchScore;
        bestCandidate = cand;
        bestIsTribal = isTribalMatch;
        bestRelInfo = relInfo;
        bestBenchmarks = benchmarks;
        bestRankingFactors = rankingFactors;
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
        recentReferenceYear,
      );

      proposals[target.name] = {
        targetCard: toCardRef(
          target,
          cubeKey,
          releaseMetadataMap?.get(target.name.toLowerCase()),
          thresholds,
          recentReferenceYear,
        ),
        suggestedCard: toCardRef(
          bestCandidate,
          cubeKey,
          bestRelInfo,
          thresholds,
          recentReferenceYear,
        ),
        swapType,
        scoreDelta: Math.round(delta * 10) / 10,
        reason: generateSwapReason(target, bestCandidate, delta, bestIsTribal),
        metaAddedValue,
        releaseYear: bestRelInfo?.firstPrintYear,
        isRecent: isRecentRelease(bestRelInfo, recentReferenceYear),
        benchmarkCubes: bestBenchmarks.length > 0 ? bestBenchmarks : undefined,
        cubeCobraStats: candStats,
        rankingScore: Math.round(bestScore * 100) / 100,
        rankingFactors: bestRankingFactors,
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
  const supportedCreatureTypes = getSupportedCreatureTypes(cubeMeta);
  const recentReferenceYear = getRecentReferenceYear(releaseMetadataMap);

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
    rankingFactors: readonly RankingFactor[];
  }[] = [];

  for (const cand of candidatePool) {
    const candLower = cand.name.toLowerCase();
    const relInfo = releaseMetadataMap?.get(candLower);
    const benchmarks = benchmarkCardsMap?.get(candLower) ?? [];
    const hasBenchmark = benchmarks.length > 0;

    if (!isCandidateAllowedByPolicy(cand, policy, relInfo, hasBenchmark)) continue;

    const score = getCardScore(cand);
    const replacesList = replacesByCardName.get(cand.name);
    const isReplacement = Boolean(replacesList && replacesList.length > 0);

    // For Titou's Tribal Cube: any creature in Maybeboard must belong to a recognized tribe, be universal tribal or changeling
    if (policy.preserveCreatureTypes && cand.types.includes("Creature") && !isReplacement) {
      const candTribes = getCardTribes(cand, supportedCreatureTypes);
      const isUniversal = isUniversalTribalCard(cand);
      if (candTribes.length === 0 && !isUniversal) continue;
    }

    // Only consider solid cards (score >= 25) unless it's a dedicated upgrade replacement
    if (score < MIN_INTERESTING_CARD_SCORE && !isReplacement) continue;

    const rankingFactors: RankingFactor[] = [{ key: "power", points: score }];
    if (isReplacement) {
      rankingFactors.push({ key: "direct_replacement", points: 30 });
    }

    const matchedArchetypes = findMatchedArchetypeIds(
      cand,
      archetypes,
      policy.preserveCreatureTypes,
      supportedCreatureTypes,
    );
    if (matchedArchetypes.length > 0) {
      rankingFactors.push({ key: "archetype_match", points: matchedArchetypes.length * 4 });
    }

    const isRecent = isRecentRelease(relInfo, recentReferenceYear);

    // Recency is deliberately bounded so it cannot replace a much stronger card.
    if (isRecent) {
      rankingFactors.push({ key: "recent_release", points: MAYBEBOARD_RECENCY_BONUS });
    }

    // Benchmark bonus: "priorité aux cubes similaires populaires"
    if (benchmarks.length > 0) {
      rankingFactors.push({ key: "peer_benchmark", points: 14 });
    }

    const stats = cubeCobraStatsMap?.get(candLower);
    if (stats?.popularity) {
      rankingFactors.push({ key: "popularity", points: Math.min(10, stats.popularity * 1.5) });
    }
    if (stats?.elo) {
      rankingFactors.push({ key: "elo", points: (stats.elo - 1200) / 100 });
    }

    const compositeScore = sumRankingFactors(rankingFactors);

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
      rankingFactors,
    });
  }

  scoredCandidates.sort((a, b) => b.compositeScore - a.compositeScore);

  const targetCount = Math.max(0, maxSuggestions);
  const selectedCards = new Map<string, (typeof scoredCandidates)[0]>();
  const discoverySlots = Math.ceil(targetCount / 3);
  const bestNonReplacementScore = scoredCandidates.find(
    (item) => !replacesByCardName.has(item.cand.name),
  )?.compositeScore;

  // 1. Keep a stable share for recent cards that are not already direct replacements.
  for (const item of scoredCandidates) {
    if (selectedCards.size >= discoverySlots) break;
    const isRecentDiscovery =
      !replacesByCardName.has(item.cand.name) && isRecentRelease(item.relInfo, recentReferenceYear);
    const isCompetitiveDiscovery =
      bestNonReplacementScore === undefined ||
      item.compositeScore >= bestNonReplacementScore - MAX_DISCOVERY_SCORE_GAP;
    if (isRecentDiscovery && isCompetitiveDiscovery) {
      selectedCards.set(item.cand.name, item);
    }
  }

  // 2. Prioritize direct replacements without exceeding the curated list size.
  for (const item of scoredCandidates) {
    if (selectedCards.size >= targetCount) break;
    if (replacesByCardName.has(item.cand.name)) {
      selectedCards.set(item.cand.name, item);
    }
  }

  // 3. Complete with highest compositeScore candidates up to targetCount.
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
      recentReferenceYear,
    );

    const yr = item.relInfo?.firstPrintYear;
    const isRecent = isRecentRelease(item.relInfo, recentReferenceYear);

    results.push({
      card: toCardRef(cand, cubeKey, item.relInfo, thresholds, recentReferenceYear),
      archetypes: item.matchedArchetypes,
      role: item.role,
      rationale,
      metaAddedValue,
      releaseYear: yr,
      isRecent,
      benchmarkCubes: item.benchmarks.length > 0 ? item.benchmarks : undefined,
      cubeCobraStats: stats,
      replacesCards: replacesCards && replacesCards.length > 0 ? replacesCards : undefined,
      rankingScore: Math.round(item.compositeScore * 100) / 100,
      rankingFactors: item.rankingFactors,
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
  runContext?: AdvisorRunContext,
): CubeSuggestionsReport {
  if (!cubeMeta?.activeSnapshotId) {
    throw new Error(`Missing active snapshot ID for cube suggestion report ${cubeKey}`);
  }
  if (!runContext) {
    throw new Error(`Missing source provenance for cube suggestion report ${cubeKey}`);
  }
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
  const catalogCardNames = new Set(catalogCards.map((card) => card.name.toLowerCase()));
  const benchmarkCards = benchmarkCardsMap?.size ?? 0;
  const benchmarkCardsInCatalog = benchmarkCardsMap
    ? [...benchmarkCardsMap.keys()].filter((cardName) =>
        catalogCardNames.has(cardName.toLowerCase()),
      ).length
    : 0;
  const missingBenchmarkCards = benchmarkCards - benchmarkCardsInCatalog;
  const recentReferenceYear = getRecentReferenceYear(releaseMetadataMap);

  return {
    schemaVersion: 2,
    engineVersion: "cube-upgrade-advisor@3",
    cubeKey,
    snapshotId: cubeMeta.activeSnapshotId,
    generatedAt: runContext.generatedAt,
    sourceProvenance: {
      ...runContext,
      recentWindow: {
        years: RECENT_WINDOW_YEARS,
        referenceYear: recentReferenceYear ?? null,
        earliestYear:
          recentReferenceYear === undefined
            ? null
            : recentReferenceYear - (RECENT_WINDOW_YEARS - 1),
      },
    },
    sourceCoverage: {
      catalogCards: catalogCards.length,
      availableCandidates: catalogCards.filter((card) => !card.presentInCubes.includes(cubeKey))
        .length,
      benchmarkCards,
      benchmarkCardsInCatalog,
      missingBenchmarkCards,
      benchmarkCoveragePercentage:
        benchmarkCards === 0 ? 100 : Math.round((benchmarkCardsInCatalog / benchmarkCards) * 100),
    },
    stats: {
      totalUpgrades: upgradeValues.length,
      totalMaybeboard: maybeboard.length,
      recentUpgradesCount,
      benchmarkMatchesCount,
      recentMaybeboardCount: maybeboard.filter((suggestion) => suggestion.isRecent).length,
      directReplacementMaybeboardCount: maybeboard.filter(
        (suggestion) => (suggestion.replacesCards?.length ?? 0) > 0,
      ).length,
    },
    upgrades,
    maybeboard,
  };
}
