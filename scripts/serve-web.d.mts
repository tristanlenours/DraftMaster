import type { RequestListener, Server } from "node:http";

export interface CreateRequestHandlerOptions {
  readonly sitePassword?: string;
  readonly authEnabled?: boolean;
  readonly isTestEnv?: boolean;
  readonly reportsDirectory?: string;
  readonly adminDraftsPath?: string;
  readonly leaderboardPath?: string;
}

export function createRequestHandler(options?: CreateRequestHandlerOptions): RequestListener;
export const server: Server;
