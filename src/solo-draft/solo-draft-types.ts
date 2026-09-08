import type { EnrichedCard, FinalDeckSummary } from "../simulation/detailed-simulation.ts";
import type { DeckArchetype, KiviatRadarScores, MtGColor } from "../domain/coaching/types.ts";

export type SoloDraftStatus = "drafting" | "deckbuilding" | "completed";

export interface BasicLandCounts {
  readonly Plains: number;
  readonly Island: number;
  readonly Swamp: number;
  readonly Mountain: number;
  readonly Forest: number;
}

export interface SoloDraftStartInput {
  readonly playerName: string;
  readonly cubeKey?: string | undefined;
  readonly seed?: number | undefined;
  readonly magicienSlug?: string | undefined;
}

export interface SoloDraftPickInput {
  readonly sessionId: string;
  readonly cardInstanceId: string;
}

export interface SoloDeckBuildInput {
  readonly sessionId: string;
  readonly maindeckCardInstanceIds: readonly string[];
  readonly basicLands?: Partial<BasicLandCounts> | undefined;
  readonly publishToLeaderboard?: boolean | undefined;
}

export interface SoloDraftStateDto {
  readonly sessionId: string;
  readonly seed: number;
  readonly cubeKey: string;
  readonly cubeName: string;
  readonly playerName: string;
  readonly magicienSlug?: string | undefined;
  readonly status: SoloDraftStatus;
  readonly roundIndex: number;
  readonly packNumber: 1 | 2 | 3;
  readonly pickNumber: number;
  readonly totalRounds: 45;
  readonly direction: "left" | "right";
  readonly nextBoosterFromBotName: string;
  readonly currentBooster: readonly EnrichedCard[];
  readonly playerPool: readonly EnrichedCard[];
  readonly elapsedSeconds: number;
  readonly isHomologated: boolean;
  readonly lastPickedCard?: EnrichedCard | undefined;
}

export interface LeaderboardDeckCard {
  readonly instanceId: string;
  readonly name: string;
  readonly cmc: number;
  readonly typeLine: string;
  readonly colors: readonly MtGColor[];
  readonly isLand: boolean;
  readonly imageUrl?: string | undefined;
}

export interface LeaderboardEntry {
  readonly id: string;
  readonly rank?: number | undefined;
  readonly magicienSlug?: string | undefined;
  readonly playerName: string;
  readonly overallScore: number;
  readonly macroAxes: {
    readonly power: number;
    readonly synergy: number;
    readonly consistency: number;
  };
  readonly radar: KiviatRadarScores;
  readonly archetype: DeckArchetype;
  readonly draftDurationSeconds: number;
  readonly totalDurationSeconds: number;
  readonly seed: number;
  readonly cubeKey: string;
  readonly occurredAt: string;
  readonly isHomologated: boolean;
  readonly reports: {
    readonly walkthroughUrl: string;
    readonly boostersUrl: string;
  };
  readonly maindeckCards: readonly LeaderboardDeckCard[];
  readonly basicLands: BasicLandCounts;
}

export interface SoloDraftFinalResult {
  readonly sessionId: string;
  readonly playerName: string;
  readonly seed: number;
  readonly evaluation: FinalDeckSummary;
  readonly leaderboardEntry?: LeaderboardEntry | undefined;
  readonly isPublished: boolean;
  readonly isNewHighScore: boolean;
  readonly reports: {
    readonly walkthroughPath: string;
    readonly boostersPath: string;
    readonly walkthroughUrl: string;
    readonly boostersUrl: string;
  };
}

export interface AdminDraftSeatSummary {
  readonly seatId: number;
  readonly isBot: boolean;
  readonly botId: string;
  readonly botName: string;
  readonly title: string;
  readonly quote: string;
  readonly level: string;
  readonly preferredColors: readonly MtGColor[];
  readonly deck: FinalDeckSummary;
}

export interface AdminDraftEntry {
  readonly id: string;
  readonly sessionId: string;
  readonly seed: number;
  readonly cubeKey: string;
  readonly cubeName: string;
  readonly playerName: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly draftDurationSeconds: number;
  readonly totalDurationSeconds: number;
  readonly reports: {
    readonly walkthroughUrl: string;
    readonly boostersUrl: string;
  };
  readonly seats: readonly AdminDraftSeatSummary[];
}
