import type { IncomingMessage, ServerResponse } from "node:http";

import type { CoachLanguageModel } from "../coach-advice/coach-language-model.ts";
import type { FriendProfile } from "../bots/friends/profiles.ts";
import type { FinalDeckCoach } from "../coach-advice/final-deck-coach.ts";
import { SoloDraftSession } from "./solo-draft-session.ts";
import { isValidSoloSessionId, type SoloDraftStore } from "./solo-draft-store.ts";
import { createFileSoloResultOutputs, type SoloResultOutputs } from "./solo-result-outputs.ts";

export interface SoloDraftHttpDependencies {
  readonly store: SoloDraftStore;
  readonly finalDeckCoach: FinalDeckCoach;
  /** External advice provider; absent means deterministic engine only. */
  readonly languageModel?: CoachLanguageModel | undefined;
  readonly reportsDirectory: string;
  readonly reportsUrlPrefix: string;
  readonly adminDraftsPath?: string | undefined;
  readonly leaderboardPath?: string | undefined;
  /** Reports, admin archive and Wall of Records; defaults to files from the paths above. */
  readonly resultOutputs?: SoloResultOutputs | undefined;
  readonly log?: ((message: string) => void) | undefined;
}

const MAX_BODY_BYTES = 256 * 1024;
const CUBE_KEY_PATTERN = /^[a-z0-9_]{1,64}$/u;
const SESSION_NOT_FOUND = "Session de draft introuvable ou expirée.";

class SoloRequestError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type JsonBody = Readonly<Record<string, unknown>>;

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

async function readJsonBody(request: IncomingMessage): Promise<JsonBody> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    size += buffer.byteLength;
    if (size > MAX_BODY_BYTES) throw new SoloRequestError(413, "Requête trop volumineuse.");
    chunks.push(buffer);
  }
  if (size === 0) return {};
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new SoloRequestError(400, "Requête JSON invalide.");
    }
    return parsed as JsonBody;
  } catch (error: unknown) {
    if (error instanceof SoloRequestError) throw error;
    throw new SoloRequestError(400, "Requête JSON invalide.");
  }
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * HTTP adapter for the Solo Draft Coach (`/api/draft/*`). Keeps the live sessions
 * of this process in memory and makes every accepted mutation durable through
 * the injected store before answering.
 */
export function createSoloDraftHttpHandler(dependencies: Readonly<SoloDraftHttpDependencies>) {
  const { store } = dependencies;
  const log =
    dependencies.log ??
    ((message: string) => {
      console.log(message);
    });
  const resultOutputs =
    dependencies.resultOutputs ??
    createFileSoloResultOutputs({
      reportsDirectory: dependencies.reportsDirectory,
      reportsUrlPrefix: dependencies.reportsUrlPrefix,
      adminDraftsPath: dependencies.adminDraftsPath,
      leaderboardPath: dependencies.leaderboardPath,
    });
  const activeSessions = new Map<string, SoloDraftSession>();
  const restoring = new Map<string, Promise<SoloDraftSession | null>>();

  async function restoreFromStore(sessionId: string): Promise<SoloDraftSession | null> {
    const loaded = await store.load(sessionId);
    if (!loaded.ok) {
      if (loaded.code === "CORRUPT") {
        log(`[Persistence] Session ${sessionId} illisible : ${loaded.message}`);
      }
      return null;
    }
    const session = await SoloDraftSession.restore(loaded.value, {
      languageModel: dependencies.languageModel,
    });
    activeSessions.set(session.sessionId, session);
    log(
      `[Persistence] Session ${sessionId} restaurée (${String(loaded.value.humanPicks.length)} picks)`,
    );
    return session;
  }

  async function findSession(sessionId: unknown): Promise<SoloDraftSession> {
    if (!isValidSoloSessionId(sessionId)) throw new SoloRequestError(404, SESSION_NOT_FOUND);
    const active = activeSessions.get(sessionId);
    if (active) return active;

    let pending = restoring.get(sessionId);
    if (!pending) {
      pending = restoreFromStore(sessionId).finally(() => restoring.delete(sessionId));
      restoring.set(sessionId, pending);
    }
    const session = await pending;
    if (!session) throw new SoloRequestError(404, SESSION_NOT_FOUND);
    return session;
  }

  /** Persists after a mutation; on failure memory falls back to the durable state. */
  async function persist(session: SoloDraftSession): Promise<void> {
    try {
      await store.save(session.getPersistenceSnapshot());
    } catch (error: unknown) {
      activeSessions.delete(session.sessionId);
      log(`[Persistence] Échec de sauvegarde ${session.sessionId} : ${errorMessage(error)}`);
      throw new SoloRequestError(
        503,
        "La session n'a pas pu être enregistrée. Réessaie dans un instant.",
        "SESSION_NOT_PERSISTED",
      );
    }
  }

  /** A finished or abandoned session leaves memory first, then storage. */
  async function forget(sessionId: string): Promise<void> {
    activeSessions.delete(sessionId);
    try {
      await store.remove(sessionId);
    } catch (error: unknown) {
      log(`[Persistence] Échec de suppression ${sessionId} : ${errorMessage(error)}`);
    }
  }

  function requireSessionId(body: JsonBody): string {
    const sessionId = body.sessionId;
    if (typeof sessionId !== "string" || sessionId.length === 0) {
      throw new SoloRequestError(400, "Le paramètre 'sessionId' est obligatoire.");
    }
    return sessionId;
  }

  const routes: Record<
    string,
    {
      readonly method: "GET" | "POST";
      readonly failureStatus: number;
      readonly run: (request: IncomingMessage, url: URL) => Promise<unknown>;
    }
  > = {
    "/api/draft/start": {
      method: "POST",
      failureStatus: 500,
      run: async (request) => {
        const body = await readJsonBody(request);
        const playerName = optionalString(body.playerName)?.trim() ?? "";
        if (!playerName) throw new SoloRequestError(400, "Le nom du joueur est obligatoire.");
        const cubeKey = optionalString(body.cubeKey) ?? "titou_tribal";
        if (!CUBE_KEY_PATTERN.test(cubeKey)) throw new SoloRequestError(400, "Cube inconnu.");

        const session = await SoloDraftSession.create({
          playerName,
          magicienSlug: optionalString(body.magicienSlug),
          cubeKey,
          seed: typeof body.seed === "number" ? body.seed : undefined,
          randomizeSeats: typeof body.randomizeSeats === "boolean" ? body.randomizeSeats : true,
          seatAssignments: Array.isArray(body.seatAssignments)
            ? (body.seatAssignments as readonly (FriendProfile | null)[])
            : undefined,
          botIds: Array.isArray(body.botIds)
            ? body.botIds.filter((id): id is string => typeof id === "string")
            : undefined,
          languageModel: dependencies.languageModel,
        });
        activeSessions.set(session.sessionId, session);
        await persist(session);
        return { ok: true, session: session.getStateDto() };
      },
    },

    "/api/draft/session": {
      method: "GET",
      failureStatus: 500,
      run: async (_request, url) => {
        const sessionId = url.searchParams.get("sessionId");
        if (!sessionId) throw new SoloRequestError(400, "Paramètre 'sessionId' manquant.");
        const session = await findSession(sessionId);
        return { ok: true, session: session.getStateDto() };
      },
    },

    "/api/draft/pick": {
      method: "POST",
      failureStatus: 400,
      run: async (request) => {
        const body = await readJsonBody(request);
        const cardInstanceId = optionalString(body.cardInstanceId);
        if (typeof body.sessionId !== "string" || !body.sessionId || !cardInstanceId) {
          throw new SoloRequestError(
            400,
            "Les paramètres 'sessionId' et 'cardInstanceId' sont obligatoires.",
          );
        }
        const session = await findSession(body.sessionId);
        const nextState = session.makePick(cardInstanceId);
        await persist(session);
        return { ok: true, session: nextState };
      },
    },

    "/api/draft/advice": {
      method: "POST",
      failureStatus: 400,
      run: async (request) => {
        const session = await findSession(requireSessionId(await readJsonBody(request)));
        const advice = await session.getPickAdvice();
        // Asking for advice removes Homologation: that change must be durable.
        await persist(session);
        return { ok: true, advice };
      },
    },

    "/api/draft/recommend-deck": {
      method: "POST",
      failureStatus: 400,
      run: async (request) => {
        const session = await findSession(requireSessionId(await readJsonBody(request)));
        const recommendation = await session.getAssistedDeckRecommendation(
          dependencies.finalDeckCoach,
        );
        await persist(session);
        return { ok: true, recommendation, isHomologated: session.isHomologated };
      },
    },

    "/api/draft/deck": {
      method: "POST",
      failureStatus: 400,
      run: async (request) => {
        const body = await readJsonBody(request);
        const maindeck = body.maindeckCardInstanceIds;
        if (typeof body.sessionId !== "string" || !body.sessionId || !Array.isArray(maindeck)) {
          throw new SoloRequestError(
            400,
            "Paramètres 'sessionId' et 'maindeckCardInstanceIds' invalides.",
          );
        }
        const session = await findSession(body.sessionId);
        let result;
        try {
          result = await session.buildDeckAndFinalize(
            {
              sessionId: body.sessionId,
              maindeckCardInstanceIds: maindeck.filter(
                (id): id is string => typeof id === "string",
              ),
              basicLands:
                body.basicLands && typeof body.basicLands === "object"
                  ? body.basicLands
                  : undefined,
              landCountRationale: optionalString(body.landCountRationale),
              publishToLeaderboard: Boolean(body.publishToLeaderboard),
            },
            { outputs: resultOutputs },
          );
        } catch (error: unknown) {
          // The result is locked but an output failed: keep it so a retry finishes the job.
          if (session.status !== "completed") throw error;
          await persist(session);
          log(`[Résultat] Sorties en attente pour ${body.sessionId} : ${errorMessage(error)}`);
          throw new SoloRequestError(
            503,
            "Le deck est validé, mais son enregistrement n'est pas terminé. Réessaie dans un instant.",
            "RESULT_OUTPUT_PENDING",
          );
        }
        // A training result stays available for a later publication to the Wall of Records.
        if (result.isPublished) {
          await forget(body.sessionId);
        } else {
          await persist(session);
        }
        return { ok: true, result };
      },
    },

    "/api/draft/publish": {
      method: "POST",
      failureStatus: 400,
      run: async (request) => {
        const body = await readJsonBody(request);
        if (typeof body.sessionId !== "string" || !body.sessionId) {
          throw new SoloRequestError(400, "Paramètre 'sessionId' manquant.");
        }
        const session = await findSession(body.sessionId);
        const result = await session.publishToLeaderboard(resultOutputs);
        await forget(body.sessionId);
        return { ok: true, result };
      },
    },

    "/api/draft/abandon": {
      method: "POST",
      failureStatus: 400,
      run: async (request) => {
        const body = await readJsonBody(request);
        if (body.sessionId !== undefined && body.sessionId !== "") {
          if (!isValidSoloSessionId(body.sessionId)) {
            throw new SoloRequestError(400, "Identifiant de session invalide.");
          }
          await forget(body.sessionId);
        }
        return { ok: true, message: "Draft abandonné avec succès." };
      },
    },
  };

  return async (request: IncomingMessage, response: ServerResponse): Promise<boolean> => {
    const url = new URL(request.url ?? "/", "http://localhost");
    const route = routes[url.pathname];
    if (!route || request.method !== route.method) return false;

    try {
      sendJson(response, 200, await route.run(request, url));
    } catch (error: unknown) {
      if (error instanceof SoloRequestError) {
        sendJson(response, error.status, {
          ok: false,
          error: error.message,
          ...(error.code ? { code: error.code } : {}),
        });
      } else {
        sendJson(response, route.failureStatus, { ok: false, error: errorMessage(error) });
      }
    }
    return true;
  };
}
