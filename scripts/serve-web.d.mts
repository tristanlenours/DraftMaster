import type { RequestListener, Server } from "node:http";

export interface CreateRequestHandlerOptions {
  readonly sitePassword?: string;
  readonly authEnabled?: boolean;
  readonly isTestEnv?: boolean;
}

export function createRequestHandler(options?: CreateRequestHandlerOptions): RequestListener;
export const server: Server;
