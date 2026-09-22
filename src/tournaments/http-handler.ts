import type { IncomingMessage, ServerResponse } from "node:http";

import { observeTournamentResult } from "./observability.ts";
import type { TournamentObservability } from "./observability.ts";
import type { TournamentCoordinator, TournamentResult } from "./types.ts";

export interface TournamentHttpHandlerDependencies {
  readonly coordinator: TournamentCoordinator;
  readonly observability?: TournamentObservability;
  readonly nowMs?: () => number;
}

export type TournamentHttpHandler = (
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
  result: TournamentResult<T>,
  project: (value: Readonly<T>) => Readonly<Record<string, unknown>>,
  successStatus = 200,
): void {
  if (result.ok) {
    sendJson(response, successStatus, { ok: true, ...project(result.value) });
    return;
  }
  const status =
    result.error.code === "STORE_UNAVAILABLE"
      ? 503
      : result.error.code === "TOURNAMENT_NOT_FOUND"
        ? 404
        : result.error.code === "INVALID_INPUT" ||
            result.error.code === "INVALID_CUBE" ||
            result.error.code === "INVALID_PARTICIPANT_COUNT" ||
            result.error.code === "NAME_TAKEN"
          ? 400
          : 409;
  sendJson(response, status, { ok: false, error: result.error });
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > 64 * 1024) throw new Error("REQUEST_TOO_LARGE");
    chunks.push(Uint8Array.from(buffer));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function getHeader(request: IncomingMessage, name: string): string | undefined {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSetupParticipant(
  value: unknown,
): value is { participantId: string | null; displayName: string; deckName: string } {
  return (
    isRecord(value) &&
    (value.participantId === null || typeof value.participantId === "string") &&
    typeof value.displayName === "string" &&
    typeof value.deckName === "string"
  );
}

function isTournamentStatusFilter(
  value: string,
): value is "all" | "preparation" | "active" | "completed" {
  return value === "all" || value === "preparation" || value === "active" || value === "completed";
}

function sendInvalidInput(response: ServerResponse, message: string): void {
  sendJson(response, 400, {
    ok: false,
    error: { code: "INVALID_INPUT", message, details: {} },
  });
}

export function createTournamentHttpHandler(
  dependencies: Readonly<TournamentHttpHandlerDependencies>,
): TournamentHttpHandler {
  return async (request, response) => {
    const startedAt = dependencies.nowMs?.() ?? performance.now();
    const observe = <T>(operation: string, result: TournamentResult<T>): void => {
      observeTournamentResult(
        dependencies.observability,
        operation,
        (dependencies.nowMs?.() ?? performance.now()) - startedAt,
        result,
      );
    };
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    if (!url.pathname.startsWith("/api/tournaments")) return false;

    if (url.pathname === "/api/tournaments/cubes" && request.method === "GET") {
      const result = await dependencies.coordinator.listCubes();
      observe("list-cubes", result);
      sendResult(response, result, (cubes) => ({ cubes }));
      return true;
    }

    if (url.pathname === "/api/tournaments" && request.method === "POST") {
      const requestId = getHeader(request, "idempotency-key")?.trim();
      if (!requestId) {
        sendInvalidInput(response, "L'en-tête Idempotency-Key est obligatoire.");
        return true;
      }
      try {
        const body = await readJsonBody(request);
        if (!isRecord(body) || typeof body.name !== "string") {
          sendInvalidInput(response, "Le nom du tournoi est obligatoire.");
          return true;
        }
        const result = await dependencies.coordinator.createTournament({
          requestId,
          name: body.name,
        });
        observe("create", result);
        sendResult(response, result, (tournament) => ({ tournament }), 201);
      } catch {
        sendInvalidInput(response, "Le corps JSON est invalide.");
      }
      return true;
    }

    const setupMatch = /^\/api\/tournaments\/([^/]+)\/setup$/u.exec(url.pathname);
    if (setupMatch && request.method === "PUT") {
      const requestId = getHeader(request, "idempotency-key")?.trim();
      if (!requestId) {
        sendInvalidInput(response, "L'en-tête Idempotency-Key est obligatoire.");
        return true;
      }
      try {
        const body = await readJsonBody(request);
        if (
          !isRecord(body) ||
          !Number.isInteger(body.expectedRevision) ||
          typeof body.name !== "string" ||
          typeof body.cubeKey !== "string" ||
          (body.format !== "swiss" && body.format !== "round-robin-three") ||
          !Number.isInteger(body.plannedRoundCount) ||
          !Array.isArray(body.participants) ||
          !body.participants.every(isSetupParticipant)
        ) {
          sendInvalidInput(response, "La configuration du tournoi est invalide.");
          return true;
        }
        const tournamentId = decodeURIComponent(setupMatch[1] ?? "");
        const result = await dependencies.coordinator.execute({
          type: "replace-setup",
          requestId,
          tournamentId,
          expectedRevision: Number(body.expectedRevision),
          name: body.name,
          cubeKey: body.cubeKey,
          format: body.format,
          plannedRoundCount: Number(body.plannedRoundCount),
          participants: body.participants,
        });
        observe("replace-setup", result);
        sendResult(response, result, (tournament) => ({ tournament }));
      } catch {
        sendInvalidInput(response, "Le corps JSON est invalide.");
      }
      return true;
    }

    const roundMutationMatch = /^\/api\/tournaments\/([^/]+)\/(start|rounds)$/u.exec(url.pathname);
    if (roundMutationMatch && request.method === "POST") {
      const requestId = getHeader(request, "idempotency-key")?.trim();
      if (!requestId) {
        sendInvalidInput(response, "L'en-tête Idempotency-Key est obligatoire.");
        return true;
      }
      try {
        const body = await readJsonBody(request);
        if (!isRecord(body) || !Number.isInteger(body.expectedRevision)) {
          sendInvalidInput(response, "La révision attendue du tournoi est obligatoire.");
          return true;
        }
        const tournamentId = decodeURIComponent(roundMutationMatch[1] ?? "");
        const result = await dependencies.coordinator.execute({
          type: roundMutationMatch[2] === "start" ? "start" : "publish-next-round",
          requestId,
          tournamentId,
          expectedRevision: Number(body.expectedRevision),
        });
        observe(roundMutationMatch[2] === "start" ? "start" : "publish-round", result);
        sendResult(response, result, (tournament) => ({ tournament }));
      } catch {
        sendInvalidInput(response, "Le corps JSON est invalide.");
      }
      return true;
    }

    const resultMatch = /^\/api\/tournaments\/([^/]+)\/matches\/([^/]+)\/result$/u.exec(
      url.pathname,
    );
    if (resultMatch && request.method === "POST") {
      const requestId = getHeader(request, "idempotency-key")?.trim();
      if (!requestId) {
        sendInvalidInput(response, "L'en-tête Idempotency-Key est obligatoire.");
        return true;
      }
      try {
        const body = await readJsonBody(request);
        if (
          !isRecord(body) ||
          !Number.isInteger(body.expectedRevision) ||
          (body.kind !== "played" && body.kind !== "forfeit") ||
          !Number.isInteger(body.gamesWonA) ||
          !Number.isInteger(body.gamesWonB) ||
          !Number.isInteger(body.drawnGames) ||
          (body.reason !== undefined && typeof body.reason !== "string")
        ) {
          sendInvalidInput(response, "Le résultat du match est invalide.");
          return true;
        }
        const result = await dependencies.coordinator.execute({
          type: "record-result",
          requestId,
          tournamentId: decodeURIComponent(resultMatch[1] ?? ""),
          expectedRevision: Number(body.expectedRevision),
          matchId: decodeURIComponent(resultMatch[2] ?? ""),
          kind: body.kind,
          gamesWonA: Number(body.gamesWonA),
          gamesWonB: Number(body.gamesWonB),
          drawnGames: Number(body.drawnGames),
          ...(typeof body.reason === "string" ? { reason: body.reason } : {}),
        });
        observe("record-result", result);
        sendResult(response, result, (tournament) => ({ tournament }));
      } catch {
        sendInvalidInput(response, "Le corps JSON est invalide.");
      }
      return true;
    }

    const dropMatch = /^\/api\/tournaments\/([^/]+)\/participants\/([^/]+)\/drop$/u.exec(
      url.pathname,
    );
    if (dropMatch && request.method === "POST") {
      const requestId = getHeader(request, "idempotency-key")?.trim();
      if (!requestId) {
        sendInvalidInput(response, "L'en-tête Idempotency-Key est obligatoire.");
        return true;
      }
      try {
        const body = await readJsonBody(request);
        if (
          !isRecord(body) ||
          !Number.isInteger(body.expectedRevision) ||
          typeof body.reason !== "string"
        ) {
          sendInvalidInput(response, "Le motif d'abandon est obligatoire.");
          return true;
        }
        const result = await dependencies.coordinator.execute({
          type: "drop-participant",
          requestId,
          tournamentId: decodeURIComponent(dropMatch[1] ?? ""),
          expectedRevision: Number(body.expectedRevision),
          participantId: decodeURIComponent(dropMatch[2] ?? ""),
          reason: body.reason,
        });
        observe("drop-participant", result);
        sendResult(response, result, (tournament) => ({ tournament }));
      } catch {
        sendInvalidInput(response, "Le corps JSON est invalide.");
      }
      return true;
    }

    const keyCardsMatch = /^\/api\/tournaments\/([^/]+)\/participants\/([^/]+)\/key-cards$/u.exec(
      url.pathname,
    );
    if (keyCardsMatch && request.method === "PUT") {
      const requestId = getHeader(request, "idempotency-key")?.trim();
      if (!requestId) {
        sendInvalidInput(response, "L'en-tête Idempotency-Key est obligatoire.");
        return true;
      }
      try {
        const body = await readJsonBody(request);
        if (
          !isRecord(body) ||
          !Number.isInteger(body.expectedRevision) ||
          !Array.isArray(body.oracleIds) ||
          !body.oracleIds.every((oracleId) => typeof oracleId === "string")
        ) {
          sendInvalidInput(response, "La liste des Cartes clés est invalide.");
          return true;
        }
        const result = await dependencies.coordinator.execute({
          type: "update-key-cards",
          requestId,
          tournamentId: decodeURIComponent(keyCardsMatch[1] ?? ""),
          expectedRevision: Number(body.expectedRevision),
          participantId: decodeURIComponent(keyCardsMatch[2] ?? ""),
          oracleIds: body.oracleIds,
        });
        observe("update-key-cards", result);
        sendResult(response, result, (tournament) => ({ tournament }));
      } catch {
        sendInvalidInput(response, "Le corps JSON est invalide.");
      }
      return true;
    }

    const completeMatch = /^\/api\/tournaments\/([^/]+)\/complete$/u.exec(url.pathname);
    if (completeMatch && request.method === "POST") {
      const requestId = getHeader(request, "idempotency-key")?.trim();
      if (!requestId) {
        sendInvalidInput(response, "L'en-tête Idempotency-Key est obligatoire.");
        return true;
      }
      try {
        const body = await readJsonBody(request);
        if (!isRecord(body) || !Number.isInteger(body.expectedRevision)) {
          sendInvalidInput(response, "La révision attendue du tournoi est obligatoire.");
          return true;
        }
        const result = await dependencies.coordinator.execute({
          type: "complete",
          requestId,
          tournamentId: decodeURIComponent(completeMatch[1] ?? ""),
          expectedRevision: Number(body.expectedRevision),
        });
        observe("complete", result);
        sendResult(response, result, (tournament) => ({ tournament }));
      } catch {
        sendInvalidInput(response, "Le corps JSON est invalide.");
      }
      return true;
    }

    if (url.pathname === "/api/tournaments" && request.method === "GET") {
      const status = url.searchParams.get("status") ?? "all";
      const limitText = url.searchParams.get("limit") ?? "100";
      const limit = Number(limitText);
      if (
        !isTournamentStatusFilter(status) ||
        !/^\d+$/u.test(limitText) ||
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 100
      ) {
        sendInvalidInput(response, "Les filtres de l'historique sont invalides.");
        return true;
      }
      const result = await dependencies.coordinator.listTournaments({ status, limit });
      observe("list", result);
      sendResult(response, result, (tournaments) => ({ tournaments }));
      return true;
    }

    const detailMatch = /^\/api\/tournaments\/([^/]+)$/u.exec(url.pathname);
    if (detailMatch && request.method === "GET") {
      try {
        const tournamentId = decodeURIComponent(detailMatch[1] ?? "");
        const result = await dependencies.coordinator.getTournament(tournamentId);
        observe("get", result);
        sendResult(response, result, (tournament) => ({ tournament }));
      } catch {
        sendInvalidInput(response, "L'identifiant du tournoi est invalide.");
      }
      return true;
    }

    return false;
  };
}
