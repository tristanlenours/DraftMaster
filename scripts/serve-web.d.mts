import type { RequestListener, Server } from "node:http";

export function createRequestHandler(): RequestListener;
export const server: Server;
