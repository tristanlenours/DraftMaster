import type { RequestListener, Server } from "node:http";
import type { MultiplayerDraftCoordinator } from "../src/multiplayer-draft/index.ts";
import type { FinalDeckCoach } from "../src/multiplayer-draft/final-deck-coach.ts";
import type { TournamentCoordinator, TournamentObservability } from "../src/tournaments/index.ts";
import type { CoachLanguageModel } from "../src/coach-advice/coach-language-model.ts";
import type { SoloDraftStore } from "../src/solo-draft/solo-draft-store.ts";

export interface CreateRequestHandlerOptions {
  readonly sitePassword?: string;
  readonly authEnabled?: boolean;
  readonly isTestEnv?: boolean;
  readonly reportsDirectory?: string;
  readonly adminDraftsPath?: string;
  readonly leaderboardPath?: string;
  readonly multiplayerCoordinator?: MultiplayerDraftCoordinator;
  readonly tournamentCoordinator?: TournamentCoordinator;
  readonly tournamentObservability?: TournamentObservability;
  readonly finalDeckCoach?: FinalDeckCoach;
  readonly multiplayerDraftPath?: string;
  readonly multiplayerResumeSecret?: string;
  /** Durable store for in-progress Solo sessions (defaults to data/draft-sessions/). */
  readonly soloDraftStore?: SoloDraftStore;
  readonly soloSessionsDirectory?: string;
  /** Advice provider for Solo; `null` forces the deterministic engine. */
  readonly soloLanguageModel?: CoachLanguageModel | null;
  /** Origins allowed to call the API cross-origin (defaults to CORS_ALLOWED_ORIGINS). */
  readonly corsAllowedOrigins?: string;
}

export function createRequestHandler(options?: CreateRequestHandlerOptions): RequestListener;
export const server: Server;
