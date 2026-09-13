import type { RequestListener, Server } from "node:http";
import type { MultiplayerDraftCoordinator } from "../src/multiplayer-draft/index.ts";

export interface CreateRequestHandlerOptions {
  readonly sitePassword?: string;
  readonly authEnabled?: boolean;
  readonly isTestEnv?: boolean;
  readonly reportsDirectory?: string;
  readonly adminDraftsPath?: string;
  readonly leaderboardPath?: string;
  readonly multiplayerCoordinator?: MultiplayerDraftCoordinator;
  readonly multiplayerDraftPath?: string;
  readonly multiplayerResumeSecret?: string;
}

export function createRequestHandler(options?: CreateRequestHandlerOptions): RequestListener;
export const server: Server;
