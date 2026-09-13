import type { IncomingMessage, ServerResponse } from "node:http";

import type { MultiplayerDraftCoordinator, MultiplayerResult } from "./types.ts";

export interface MultiplayerDraftHttpHandlerDependencies {
  readonly coordinator: MultiplayerDraftCoordinator;
}

export type MultiplayerDraftHttpHandler = (
  request: IncomingMessage,
  response: ServerResponse,
) => Promise<boolean>;

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function sendResult<T>(
  response: ServerResponse,
  result: MultiplayerResult<T>,
  project: (value: Readonly<T>) => Readonly<Record<string, unknown>>,
): void {
  if (result.ok) {
    sendJson(response, 200, { ok: true, ...project(result.value) });
    return;
  }
  const status =
    result.error.code === "STORE_UNAVAILABLE"
      ? 503
      : result.error.code === "INVALID_INPUT"
        ? 400
        : result.error.code === "INVALID_RESUME_TOKEN"
          ? 401
          : 409;
  sendJson(response, status, {
    ok: false,
    error: result.error,
  });
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > 64 * 1024) {
      throw new Error("REQUEST_TOO_LARGE");
    }
    chunks.push(Uint8Array.from(buffer));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function getHeader(request: IncomingMessage, name: string): string | undefined {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function getBearerToken(request: IncomingMessage): string | undefined {
  const authorization = getHeader(request, "authorization");
  if (!authorization?.startsWith("Bearer ")) return undefined;
  const token = authorization.slice("Bearer ".length).trim();
  return token === "" ? undefined : token;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sendInvalidInput(response: ServerResponse, message: string): void {
  sendJson(response, 400, {
    ok: false,
    error: { code: "INVALID_INPUT", message, details: {} },
  });
}

function isBasicLandCounts(value: unknown): value is {
  readonly Plains: number;
  readonly Island: number;
  readonly Swamp: number;
  readonly Mountain: number;
  readonly Forest: number;
} {
  if (!isRecord(value)) return false;
  return ["Plains", "Island", "Swamp", "Mountain", "Forest"].every(
    (name) => Number.isInteger(value[name]) && Number(value[name]) >= 0,
  );
}

export function createMultiplayerDraftHttpHandler(
  dependencies: Readonly<MultiplayerDraftHttpHandlerDependencies>,
): MultiplayerDraftHttpHandler {
  return async (request, response) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    if (!url.pathname.startsWith("/api/multiplayer/")) {
      return false;
    }

    if (url.pathname === "/api/multiplayer/lobby" && request.method === "GET") {
      const result = await dependencies.coordinator.getLobby();
      sendResult(response, result, (state) => ({ state }));
      return true;
    }

    if (url.pathname === "/api/multiplayer/lobby/join" && request.method === "POST") {
      const requestId = getHeader(request, "idempotency-key")?.trim();
      if (requestId === undefined || requestId === "") {
        sendInvalidInput(response, "L'en-tete Idempotency-Key est obligatoire.");
        return true;
      }
      try {
        const body = await readJsonBody(request);
        if (
          !isRecord(body) ||
          typeof body.playerName !== "string" ||
          !Number.isInteger(body.expectedRevision) ||
          Number(body.expectedRevision) < 0 ||
          (body.cubeKey !== undefined && typeof body.cubeKey !== "string")
        ) {
          sendInvalidInput(response, "Le contenu de la commande join est invalide.");
          return true;
        }
        const result = await dependencies.coordinator.join({
          requestId,
          expectedRevision: Number(body.expectedRevision),
          playerName: body.playerName,
          ...(typeof body.cubeKey === "string" ? { cubeKey: body.cubeKey } : {}),
        });
        sendResult(response, result, ({ participantId, resumeToken, state }) => ({
          participantId,
          resumeToken,
          state,
        }));
      } catch {
        sendInvalidInput(response, "Le corps JSON est invalide.");
      }
      return true;
    }

    if (url.pathname === "/api/multiplayer/lobby/cube" && request.method === "POST") {
      const requestId = getHeader(request, "idempotency-key")?.trim();
      const resumeToken = getBearerToken(request);
      if (!requestId || !resumeToken) {
        sendInvalidInput(response, "Idempotency-Key et l'Acces de reprise sont obligatoires.");
        return true;
      }
      try {
        const body = await readJsonBody(request);
        if (
          !isRecord(body) ||
          typeof body.cubeKey !== "string" ||
          !Number.isInteger(body.expectedRevision) ||
          Number(body.expectedRevision) < 0
        ) {
          sendInvalidInput(response, "Le contenu de la commande cube est invalide.");
          return true;
        }
        const result = await dependencies.coordinator.changeCube({
          requestId,
          resumeToken,
          cubeKey: body.cubeKey,
          expectedRevision: Number(body.expectedRevision),
        });
        sendResult(response, result, (state) => ({ state }));
      } catch {
        sendInvalidInput(response, "Le corps JSON est invalide.");
      }
      return true;
    }

    if (url.pathname === "/api/multiplayer/ready" && request.method === "POST") {
      const requestId = getHeader(request, "idempotency-key")?.trim();
      const resumeToken = getBearerToken(request);
      if (!requestId || !resumeToken) {
        sendInvalidInput(response, "Idempotency-Key et l'Acces de reprise sont obligatoires.");
        return true;
      }
      try {
        const body = await readJsonBody(request);
        if (
          !isRecord(body) ||
          typeof body.ready !== "boolean" ||
          !Number.isInteger(body.expectedRevision) ||
          Number(body.expectedRevision) < 0
        ) {
          sendInvalidInput(response, "Le contenu de la commande ready est invalide.");
          return true;
        }
        const result = await dependencies.coordinator.setReady({
          requestId,
          resumeToken,
          ready: body.ready,
          expectedRevision: Number(body.expectedRevision),
        });
        sendResult(response, result, (state) => ({ state }));
      } catch {
        sendInvalidInput(response, "Le corps JSON est invalide.");
      }
      return true;
    }

    if (url.pathname === "/api/multiplayer/lobby/leave" && request.method === "POST") {
      const requestId = getHeader(request, "idempotency-key")?.trim();
      const resumeToken = getBearerToken(request);
      if (!requestId || !resumeToken) {
        sendInvalidInput(response, "Idempotency-Key et l'Acces de reprise sont obligatoires.");
        return true;
      }
      try {
        const body = await readJsonBody(request);
        if (
          !isRecord(body) ||
          !Number.isInteger(body.expectedRevision) ||
          Number(body.expectedRevision) < 0
        ) {
          sendInvalidInput(response, "La revision de depart du Salon est invalide.");
          return true;
        }
        const result = await dependencies.coordinator.leave({
          requestId,
          resumeToken,
          expectedRevision: Number(body.expectedRevision),
        });
        sendResult(response, result, (state) => ({ state }));
      } catch {
        sendInvalidInput(response, "Le corps JSON est invalide.");
      }
      return true;
    }

    if (url.pathname === "/api/multiplayer/state" && request.method === "GET") {
      const resumeToken = getBearerToken(request);
      if (resumeToken) {
        const result = await dependencies.coordinator.getPlayerState(resumeToken);
        sendResult(response, result, (state) => ({ state }));
      } else {
        const result = await dependencies.coordinator.getLobby();
        sendResult(response, result, (state) => ({ state }));
      }
      return true;
    }

    if (url.pathname === "/api/multiplayer/pick" && request.method === "POST") {
      const requestId = getHeader(request, "idempotency-key")?.trim();
      const resumeToken = getBearerToken(request);
      if (!requestId || !resumeToken) {
        sendInvalidInput(response, "Idempotency-Key et l'Acces de reprise sont obligatoires.");
        return true;
      }
      try {
        const body = await readJsonBody(request);
        if (
          !isRecord(body) ||
          typeof body.cardInstanceId !== "string" ||
          !Number.isInteger(body.expectedRevision) ||
          !Number.isInteger(body.packNumber) ||
          !Number.isInteger(body.pickNumber)
        ) {
          sendInvalidInput(response, "Le contenu de la commande pick est invalide.");
          return true;
        }
        const result = await dependencies.coordinator.submitPick({
          requestId,
          resumeToken,
          cardInstanceId: body.cardInstanceId,
          expectedRevision: Number(body.expectedRevision),
          packNumber: Number(body.packNumber),
          pickNumber: Number(body.pickNumber),
        });
        sendResult(response, result, (state) => ({ state }));
      } catch {
        sendInvalidInput(response, "Le corps JSON est invalide.");
      }
      return true;
    }

    if (url.pathname === "/api/multiplayer/deck/recommend" && request.method === "POST") {
      const requestId = getHeader(request, "idempotency-key")?.trim();
      const resumeToken = getBearerToken(request);
      if (!requestId || !resumeToken) {
        sendInvalidInput(response, "Idempotency-Key et l'Acces de reprise sont obligatoires.");
        return true;
      }
      try {
        const body = await readJsonBody(request);
        if (
          !isRecord(body) ||
          !Number.isInteger(body.expectedRevision) ||
          Number(body.expectedRevision) < 0
        ) {
          sendInvalidInput(response, "La revision de recommandation est invalide.");
          return true;
        }
        const result = await dependencies.coordinator.recommendDeck({
          requestId,
          expectedRevision: Number(body.expectedRevision),
          resumeToken,
        });
        sendResult(response, result, (workspace) => ({ workspace }));
      } catch {
        sendInvalidInput(response, "Le corps JSON est invalide.");
      }
      return true;
    }

    if (url.pathname === "/api/multiplayer/deck" && request.method === "PUT") {
      const requestId = getHeader(request, "idempotency-key")?.trim();
      const resumeToken = getBearerToken(request);
      if (!requestId || !resumeToken) {
        sendInvalidInput(response, "Idempotency-Key et l'Acces de reprise sont obligatoires.");
        return true;
      }
      try {
        const body = await readJsonBody(request);
        if (
          !isRecord(body) ||
          !Array.isArray(body.maindeckCardInstanceIds) ||
          !body.maindeckCardInstanceIds.every((id) => typeof id === "string") ||
          !isBasicLandCounts(body.basicLands) ||
          typeof body.finalize !== "boolean" ||
          !Number.isInteger(body.expectedRevision) ||
          Number(body.expectedRevision) < 0 ||
          (body.landCountRationale !== undefined && typeof body.landCountRationale !== "string")
        ) {
          sendInvalidInput(response, "La selection de deck est invalide.");
          return true;
        }
        const result = await dependencies.coordinator.finalizeDeck({
          requestId,
          expectedRevision: Number(body.expectedRevision),
          resumeToken,
          maindeckCardInstanceIds: body.maindeckCardInstanceIds,
          basicLands: body.basicLands,
          finalize: body.finalize,
          ...(typeof body.landCountRationale === "string"
            ? { landCountRationale: body.landCountRationale }
            : {}),
        });
        sendResult(response, result, (workspace) => ({ workspace }));
      } catch {
        sendInvalidInput(response, "Le corps JSON est invalide.");
      }
      return true;
    }

    if (url.pathname === "/api/multiplayer/deck/export.mtga" && request.method === "GET") {
      const resumeToken = getBearerToken(request);
      if (!resumeToken) {
        sendInvalidInput(response, "L'Acces de reprise est obligatoire.");
        return true;
      }
      const result = await dependencies.coordinator.getDeckExport(resumeToken);
      if (!result.ok) {
        sendResult(response, result, () => ({}));
        return true;
      }
      if (!result.value.compatible) {
        sendJson(response, 409, {
          ok: false,
          error: {
            code: "INVALID_DECK",
            message: "La Liste contient des cartes incompatibles avec Magic Arena.",
            details: {
              warnings: result.value.warnings,
              incompatibleCards: result.value.incompatibleCards,
              partialText: result.value.text,
            },
          },
        });
        return true;
      }
      response.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Disposition": 'attachment; filename="draftmaster.mtga.txt"',
      });
      response.end(result.value.text);
      return true;
    }

    if (url.pathname === "/api/multiplayer/abandon" && request.method === "POST") {
      const requestId = getHeader(request, "idempotency-key")?.trim();
      const resumeToken = getBearerToken(request);
      if (!requestId || !resumeToken) {
        sendInvalidInput(response, "Idempotency-Key et l'Acces de reprise sont obligatoires.");
        return true;
      }
      try {
        const body = await readJsonBody(request);
        if (
          !isRecord(body) ||
          body.confirmed !== true ||
          !Number.isInteger(body.expectedRevision)
        ) {
          sendInvalidInput(response, "L'abandon confirme et sa revision sont obligatoires.");
          return true;
        }
        const result = await dependencies.coordinator.abandon({
          requestId,
          resumeToken,
          confirmed: true,
          expectedRevision: Number(body.expectedRevision),
        });
        sendResult(response, result, (state) => ({ state }));
      } catch {
        sendInvalidInput(response, "Le corps JSON est invalide.");
      }
      return true;
    }

    return false;
  };
}
