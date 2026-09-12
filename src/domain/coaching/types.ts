export type MtGColor = "W" | "U" | "B" | "R" | "G";

export interface CardEvaluationInput {
  readonly id: string;
  readonly name: string;
  readonly staticScore: number;
  readonly colors: readonly MtGColor[];
  readonly cmc?: number | undefined;
  readonly types?: readonly string[] | undefined;
  readonly subtypes?: readonly string[] | undefined;
  readonly typeLine?: string | undefined;
  readonly isLand?: boolean | undefined;
  readonly producesColors?: readonly MtGColor[] | undefined;
  readonly oracleText?: string | undefined;
  readonly manaCost?: string | undefined;
  readonly oracleId?: string | undefined;
  readonly powerScore?: number | undefined;
  readonly tier?: string | undefined;
  readonly roles?: readonly string[] | undefined;
}

export interface CoachingScoreBreakdown {
  readonly colorAffinityFactor: number;
  readonly colorPenalty: number;
  readonly manaFixingBonus: number;
  readonly curveBonus: number;
  readonly rawDynamicScore: number;
  readonly cubeScoreModifier?: number | undefined;
  readonly synergyBonus?: number | undefined;
  readonly tribalPenalty?: number | undefined;
  readonly powerSource?: string | undefined;
  readonly harmonizationConfidence?: number | undefined;
}

export interface CardEvaluation {
  readonly id: string;
  readonly name: string;
  readonly staticScore: number;
  readonly dynamicScore: number;
  readonly delta: number;
  readonly breakdown: CoachingScoreBreakdown;
  readonly explanation: string;
}

export interface PackEvaluationContext {
  readonly packNumber: number;
  readonly pickNumber: number;
  readonly offeredCards: readonly CardEvaluationInput[];
  readonly priorPool: readonly CardEvaluationInput[];
  readonly cubeKey?: string | undefined;
  readonly catalog?: unknown;
  readonly cubeMeta?: unknown;
}

export type ArchetypeCategory = "aggro" | "midrange" | "control" | "ramp" | "combo";

export interface DeckArchetype {
  readonly category: ArchetypeCategory;
  readonly primaryColors: readonly MtGColor[];
  readonly splashColors: readonly MtGColor[];
  readonly label: string;
  readonly description: string;
}

export interface MidDraftReview {
  readonly packNumber: number;
  readonly poolSummary: string;
  readonly archetypeLabel: string;
  readonly curveStats: {
    readonly oneDrops: number;
    readonly twoDrops: number;
    readonly threeDrops: number;
    readonly fourPlusDrops: number;
    readonly landsCount: number;
    readonly avgCmc: number;
  };
  readonly curveAnalysis: string;
  readonly fixingStats: {
    readonly fixersCount: number;
    readonly isProportionGood: boolean;
    readonly targetRecommendation: string;
  };
  readonly fixingAnalysis: string;
  readonly priorities: readonly string[];
  readonly signalTip: string;
}

export interface KiviatRadarScores {
  readonly power: number;
  readonly synergy: number;
  readonly curve: number;
  readonly mana: number;
  readonly interaction: number;
}

export interface FastManaAuditEntry {
  readonly name: string;
  /** Mana produced by the first activation; costs and drawbacks remain separate audit facts. */
  readonly manaGain: number;
}

export interface PowerAxisAudit {
  readonly meanStaticScore: number;
  readonly medianStaticScore: number;
  readonly topFiveMean: number;
  readonly bombThreshold: number | null;
  readonly bombCards: readonly string[];
  readonly fastManaCards: readonly FastManaAuditEntry[];
  readonly components: {
    readonly averageQuality: number;
    readonly ceiling: number;
    readonly medianQuality: number;
    readonly bombDensityBonus: number;
    readonly fastManaBonus: number;
  };
}

export interface StrategicPackageAudit {
  readonly id: string;
  readonly label: string;
  readonly enablers: readonly string[];
  readonly payoffs: readonly string[];
  readonly supportCards: readonly string[];
  readonly contribution: number;
  readonly fragilityPenalty: number;
}

export interface DeckSynergyArchetypeProfile {
  readonly id: string;
  readonly name: string;
  readonly keyCards: readonly string[];
  readonly supportCards: readonly string[];
  readonly targetPoints?: number | undefined;
  readonly requiredFamilies?: readonly DeckSynergyFamilyProfile[] | undefined;
}

export interface DeckSynergyFamilyProfile {
  readonly id: string;
  readonly name: string;
  readonly minimum: number;
  readonly cardIds: readonly string[];
}

export interface DeckSynergyProfile {
  readonly modelVersion?: string | undefined;
  readonly cubeKey?: string | undefined;
  readonly cubeSnapshotId?: string | undefined;
  readonly archetypes: readonly DeckSynergyArchetypeProfile[];
}

export interface ArchetypeSynergyFamilyAudit {
  readonly id: string;
  readonly name: string;
  readonly minimum: number;
  readonly matchedCards: readonly string[];
  readonly matchedCount: number;
  readonly complete: boolean;
}

export interface ArchetypeSynergyAudit {
  readonly id: string;
  readonly name: string;
  readonly keyCards: readonly string[];
  readonly supportCards: readonly string[];
  readonly keyCardCount: number;
  readonly supportCardCount: number;
  readonly alignedCardCount: number;
  readonly points: number;
  readonly targetPoints: number;
  readonly families: readonly ArchetypeSynergyFamilyAudit[];
  readonly missingRequiredFamilyCount: number;
  readonly score: number;
}

export interface SynergyAxisAudit {
  readonly profile: {
    readonly modelVersion: string;
    readonly cubeKey: string;
    readonly cubeSnapshotId: string;
  } | null;
  readonly packages: readonly StrategicPackageAudit[];
  readonly bestArchetype: ArchetypeSynergyAudit | null;
  readonly archetypes: readonly ArchetypeSynergyAudit[];
}

export interface EffectiveCostAdjustment {
  readonly name: string;
  readonly printedCmc: number;
  readonly effectiveCmc: number;
  readonly reason: string;
}

export interface CurveAxisAudit {
  readonly printedAverageCmc: number;
  readonly effectiveAverageCmc: number;
  readonly earlyActionCount: number;
  readonly effectiveCostAdjustments: readonly EffectiveCostAdjustment[];
}

export type InteractionCoverage =
  "créatures" | "permanents" | "pile" | "main" | "cimetières" | "sweeper";

export interface InteractionCardAudit {
  readonly name: string;
  readonly cmc: number;
  readonly quality: number;
  readonly coverage: readonly InteractionCoverage[];
}

export interface InteractionAxisAudit {
  readonly cards: readonly InteractionCardAudit[];
  readonly averageQuality: number;
  readonly coverage: readonly InteractionCoverage[];
  readonly targetRange: {
    readonly minimum: number;
    readonly ideal: number;
    readonly maximum: number;
  };
  readonly planAdequacy: number;
}

export interface ManaAcceleratorAuditEntry {
  readonly name: string;
  readonly cmc: number;
  readonly producesColors: readonly MtGColor[];
}

export interface ManaFixerAuditEntry {
  readonly name: string;
  readonly kind: "multicolor-land" | "accelerator" | "land-equivalent";
  readonly colors: readonly MtGColor[];
  readonly contribution: number;
}

export interface ManaAxisAudit {
  readonly landCount: number;
  readonly landEquivalentCards: readonly string[];
  readonly effectiveLandCount: number;
  readonly accelerators: readonly ManaAcceleratorAuditEntry[];
  readonly sourcesByColor: Readonly<Record<MtGColor, number>>;
  readonly usedColors: readonly MtGColor[];
  readonly targetSourcesByColor: Readonly<Record<MtGColor, number>>;
  readonly sourceAdequacy: number;
  readonly fixers: readonly ManaFixerAuditEntry[];
  readonly fixerUnits: number;
  readonly requiredFixerUnits: number;
  readonly fixingAdequacy: number;
  readonly landCountAdequacy: number;
}

export interface DeckScoreContribution {
  readonly axis: keyof KiviatRadarScores;
  readonly score: number;
  readonly weight: number;
  readonly weightedPoints: number;
}

export interface DeckEvaluationAudit {
  readonly formulaVersion: "deck-evaluation@4" | "deck-evaluation@5";
  readonly scoreMeaning: string;
  readonly power: PowerAxisAudit;
  readonly synergy: SynergyAxisAudit;
  readonly curve: CurveAxisAudit;
  readonly interaction: InteractionAxisAudit;
  readonly mana: ManaAxisAudit;
  readonly contributions: readonly DeckScoreContribution[];
  readonly leagueId?: string | undefined;
  readonly calibrationVersion?: string | undefined;
  readonly calibrationStatus?: LeagueCalibrationStatus | undefined;
  readonly cubeKey?: string | undefined;
  readonly cubeSnapshotId?: string | undefined;
}

export type DeckTier = "S" | "A" | "B" | "C" | "D";

export interface RadarTiers {
  readonly power: DeckTier;
  readonly synergy: DeckTier;
  readonly curve: DeckTier;
  readonly mana: DeckTier;
  readonly interaction: DeckTier;
}

export function scoreToTier(score: number): {
  tier: DeckTier;
  label: string;
  css: string;
} {
  if (score >= 90) return { tier: "S", label: "TIER S", css: "grade-s" };
  if (score >= 80) return { tier: "A", label: "TIER A", css: "grade-a" };
  if (score >= 70) return { tier: "B", label: "TIER B", css: "grade-b" };
  if (score >= 60) return { tier: "C", label: "TIER C", css: "grade-c" };
  return { tier: "D", label: "TIER D", css: "grade-d" };
}

export type LeagueCalibrationStatus = "provisional" | "ready";

export interface LeagueTierThresholds {
  readonly S: number;
  readonly A: number;
  readonly B: number;
  readonly C: number;
}

export interface LeagueReadinessPolicy {
  readonly minWitnessesPerTier: number;
  readonly minDraftWitnessesPerCube: number;
  readonly minDeckWitnessesPerCube: number;
}

export interface LeagueWitnessEvidenceCounts {
  readonly tierCoverage: Readonly<Record<DeckTier, number>>;
  readonly draftsByCube: Readonly<Record<string, number>>;
  readonly decksByCube: Readonly<Record<string, number>>;
}

export interface LeagueCalibration {
  readonly leagueId: string;
  readonly calibrationVersion: string;
  readonly status: LeagueCalibrationStatus;
  readonly memberCubes: readonly string[];
  readonly tierThresholds: LeagueTierThresholds;
  readonly readinessPolicy: LeagueReadinessPolicy;
  readonly evidenceCounts?: LeagueWitnessEvidenceCounts | undefined;
}

export interface CubeEvaluationContext {
  readonly cubeKey: string;
  readonly cubeSnapshotId: string;
  readonly leagueId: string;
  readonly bombThreshold?: number | undefined;
  readonly synergyProfile?: DeckSynergyProfile | undefined;
}

export type WitnessUsagePolicy = "evaluation_only" | "calibration_eligible" | "training_allowed";

export type TierPlacement = "lower" | "middle" | "upper";

export interface WitnessAnnotation {
  readonly author: string;
  readonly role: string;
  readonly reviewedAt: string;
  readonly rationale: string;
  readonly strengths: readonly string[];
  readonly weaknesses: readonly string[];
  readonly confidence: "low" | "medium" | "high";
}

export interface ObservedMatchResult {
  readonly wins: number;
  readonly losses: number;
  readonly matchCount: number;
  readonly drawCount?: number | undefined;
  readonly context?: string | undefined;
}

export interface WitnessProvenance {
  readonly extractedAt: string;
  readonly method: string;
  readonly sourceHashes: Readonly<Record<string, string>>;
  readonly generatorVersion?: string | undefined;
}

export interface DraftPickRecord {
  readonly packNumber: number;
  readonly pickNumber: number;
  readonly offeredCardIds: readonly string[];
  readonly pickedCardId: string;
  readonly staticScore?: number | undefined;
  readonly dynamicScore?: number | undefined;
}

export interface WitnessCardIdentity {
  readonly id: string;
  readonly name: string;
  readonly manaCost?: string | undefined;
  readonly cmc?: number | undefined;
  readonly colors?: readonly MtGColor[] | undefined;
  readonly types?: readonly string[] | undefined;
  readonly isLand?: boolean | undefined;
}

export interface DraftWitness {
  readonly draftId: string;
  readonly source: string;
  readonly startedAt: string;
  readonly leagueId: string;
  readonly cubeKey: string;
  readonly cubeSnapshotId: string;
  readonly picks: readonly DraftPickRecord[];
  readonly poolCardIds: readonly string[];
  readonly finalDeckCardIds: readonly string[];
  readonly sideboardCardIds: readonly string[];
  readonly cardIdentities: Readonly<Record<string, WitnessCardIdentity>>;
  readonly deckEvaluationCards: readonly CardEvaluationInput[];
  readonly observedResults?: ObservedMatchResult | undefined;
  readonly provenance: WitnessProvenance;
}

export interface DeckWitness {
  readonly deckWitnessId: string;
  readonly draftId?: string | undefined;
  readonly leagueId: string;
  readonly cubeKey: string;
  readonly cubeSnapshotId: string;
  readonly expectedTier: DeckTier;
  readonly tierPlacement?: TierPlacement | undefined;
  readonly annotation: WitnessAnnotation;
  readonly hasPowerNine: boolean;
  readonly observedResult?: ObservedMatchResult | undefined;
  readonly usagePolicy: WitnessUsagePolicy;
  readonly finalDeckCardIds?: readonly string[] | undefined;
  readonly deckEvaluationCards?: readonly CardEvaluationInput[] | undefined;
}

export interface MemberCubeDeclaration {
  readonly cubeKey: string;
  readonly snapshotId: string;
  readonly name?: string | undefined;
}

export interface LeagueWitnessCorpus {
  readonly schemaVersion: 1;
  readonly corpusId: string;
  readonly corpusVersion: string;
  readonly leagueCalibration: LeagueCalibration;
  readonly cubes: readonly MemberCubeDeclaration[];
  readonly draftWitnesses: readonly DraftWitness[];
  readonly deckWitnesses: readonly DeckWitness[];
  readonly provenance: WitnessProvenance;
  readonly usagePolicy: WitnessUsagePolicy;
}

export interface WitnessCorpusIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export type WitnessCorpusResult<T> =
  | { readonly success: true; readonly data: T; readonly errors?: never }
  | {
      readonly success: false;
      readonly errors: readonly WitnessCorpusIssue[];
      readonly data?: never;
    };

export interface DeckEvaluationOptions {
  /** Top-5% cutoff computed from the immutable cube snapshot, ties included. */
  readonly bombThreshold?: number;
  /** Versioned, cube-specific archetype membership used by the Synergy axis. */
  readonly synergyProfile?: DeckSynergyProfile;
  /** League calibration used to evaluate overall deck tier. */
  readonly leagueCalibration?: LeagueCalibration;
  /** Cube context declaring cube, snapshot, and league membership. */
  readonly cubeContext?: CubeEvaluationContext;
}

export interface DeckEvaluation {
  readonly deckSize: number;
  readonly spellsCount: number;
  readonly landsCount: number;
  readonly archetype: DeckArchetype;
  readonly radar: KiviatRadarScores;
  readonly overallScore: number;
  readonly overallTier: DeckTier;
  readonly radarTiers: RadarTiers;
  readonly audit: DeckEvaluationAudit;
  readonly strengths: readonly string[];
  readonly weaknesses: readonly string[];
  readonly recommendations: readonly string[];
}

export interface DeckBuildOption {
  readonly position: number;
  readonly title: string;
  readonly maindeck: readonly string[];
  readonly sideboard: readonly string[];
  readonly evaluation: DeckEvaluation;
}
