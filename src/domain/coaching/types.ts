export type MtGColor = "W" | "U" | "B" | "R" | "G";

export interface CardEvaluationInput {
  readonly id: string;
  readonly name: string;
  readonly staticScore: number;
  readonly colors: readonly MtGColor[];
  readonly cmc?: number;
  readonly types?: readonly string[];
  readonly subtypes?: readonly string[];
  readonly typeLine?: string;
  readonly isLand?: boolean;
  readonly producesColors?: readonly MtGColor[];
  readonly oracleText?: string;
  readonly manaCost?: string;
  readonly oracleId?: string;
}

export interface CoachingScoreBreakdown {
  readonly colorAffinityFactor: number;
  readonly colorPenalty: number;
  readonly manaFixingBonus: number;
  readonly curveBonus: number;
  readonly rawDynamicScore: number;
  readonly cubeScoreModifier?: number | undefined;
  readonly synergyBonus?: number | undefined;
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
  readonly formulaVersion: "deck-evaluation@4";
  readonly scoreMeaning: string;
  readonly power: PowerAxisAudit;
  readonly synergy: SynergyAxisAudit;
  readonly curve: CurveAxisAudit;
  readonly interaction: InteractionAxisAudit;
  readonly mana: ManaAxisAudit;
  readonly contributions: readonly DeckScoreContribution[];
}

export interface DeckEvaluationOptions {
  /** Top-5% cutoff computed from the immutable cube snapshot, ties included. */
  readonly bombThreshold?: number;
  /** Versioned, cube-specific archetype membership used by the Synergy axis. */
  readonly synergyProfile?: DeckSynergyProfile;
}

export interface DeckEvaluation {
  readonly deckSize: number;
  readonly spellsCount: number;
  readonly landsCount: number;
  readonly archetype: DeckArchetype;
  readonly radar: KiviatRadarScores;
  readonly overallScore: number;
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
