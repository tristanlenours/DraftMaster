import type { MtGColor } from "../domain/coaching/types.ts";

export type PowerScoreSource =
  "untapped" | "draftsmith" | "17lands_normalized" | "cubecobra_elo" | "expert_heuristic";

export type HarmonizationDegree = "native" | "calibrated_high" | "calibrated_medium" | "fallback";

export interface PowerScoreMeta {
  readonly score: number;
  readonly source: PowerScoreSource;
  readonly rawSourceScore?: number | undefined;
  readonly harmonizationDegree: HarmonizationDegree;
  readonly confidence: number;
  readonly updatedAt: string;
}

export type CardFunctionalRole =
  | "bomb"
  | "engine"
  | "premium_removal"
  | "situational_removal"
  | "mana_ramp"
  | "mana_fixing"
  | "beater"
  | "finisher"
  | "card_advantage"
  | "synergy_enabler"
  | "synergy_payoff"
  | "cantrip";

export interface QuadrantStrengths {
  readonly opening: number;
  readonly developing: number;
  readonly parity: number;
  readonly behind: number;
}

export interface ObjectiveCardAnalysis {
  readonly summary: string;
  readonly roles: readonly CardFunctionalRole[];
  readonly floorRating: number;
  readonly ceilingRating: number;
  readonly tempoImpact: "low" | "medium" | "high";
  readonly quadrantStrengths: QuadrantStrengths;
}

export type CubeCardFit = "staple" | "build_around" | "support" | "filler" | "trap";

export interface CardSynergyItem {
  readonly cardName: string;
  readonly synergyType?: string;
  readonly description: string;
}

export interface ArchetypeFitItem {
  readonly colors: readonly MtGColor[];
  readonly archetype: string;
  readonly grade: string;
  readonly winrateOrScore?: string;
  readonly comment?: string;
}

export interface CardPedagogy {
  readonly howToPlay?: string;
  readonly keySynergies?: readonly CardSynergyItem[];
  readonly archetypeFit?: readonly ArchetypeFitItem[];
}

export interface CubeSpecificCardAnalysis {
  readonly cubeKey: string;
  readonly fit: CubeCardFit;
  readonly tier?: string;
  readonly pedagogy?: CardPedagogy;
  readonly archetypes: readonly string[];
  readonly synergyTags: readonly string[];
  readonly scoreModifier: number;
  readonly analysis: string;
  readonly keyPairs?: readonly string[];
}

export interface CardImageInfo {
  readonly url: string;
  readonly localPath?: string;
  readonly artCropUrl?: string;
  readonly localArtPath?: string;
  readonly localFrenchPath?: string;
  readonly localFrenchArtPath?: string;
}

export interface MasterCatalogCard {
  readonly slug?: string;
  readonly oracleId: string;
  readonly name: string;
  readonly manaCost?: string;
  readonly cmc: number;
  readonly colors: readonly MtGColor[];
  readonly colorIdentity: readonly MtGColor[];
  readonly typeLine: string;
  readonly types: readonly string[];
  readonly subtypes: readonly string[];
  readonly oracleText: string;
  readonly frenchName?: string;
  readonly frenchText?: string;
  readonly frenchImageUrl?: string;
  readonly localFrenchPath?: string;
  readonly keywords: readonly string[];
  readonly power?: string;
  readonly toughness?: string;
  readonly loyalty?: string;
  readonly isLand: boolean;
  readonly producesColors: readonly MtGColor[];
  readonly powerScore: PowerScoreMeta;
  readonly image?: CardImageInfo;
  readonly imageUrl?: string;
  readonly presentInCubes: readonly string[];
  readonly objectiveAnalysis: ObjectiveCardAnalysis;
  readonly cubeAnalyses: Record<string, CubeSpecificCardAnalysis>;
}

export interface CardDocument extends MasterCatalogCard {
  readonly schemaVersion: 1;
  readonly slug: string;
  readonly image: CardImageInfo;
}

export interface MasterCardCatalog {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly cardCount: number;
  readonly cards: Record<string, MasterCatalogCard>;
}

export function cardNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
