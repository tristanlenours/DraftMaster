import type { RequestListener, Server } from "node:http";
import type { MultiplayerDraftCoordinator } from "../src/multiplayer-draft/index.ts";
import type { FinalDeckCoach } from "../src/multiplayer-draft/final-deck-coach.ts";
import type { TournamentCoordinator, TournamentObservability } from "../src/tournaments/index.ts";

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
}

export function createRequestHandler(options?: CreateRequestHandlerOptions): RequestListener;
export const server: Server;
