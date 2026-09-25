import type { IncomingMessage, ServerResponse } from "node:http";

import type { CardCatalog } from "../cards/card-catalog.ts";
import type { DeckEvaluationOptions, DeckSynergyProfile } from "../domain/coaching/types.ts";
import { MasterCardsIndex } from "../tournaments/deck-photo-recognition.ts";
import { parseMtgaDeckText } from "../web/mtga-deck-text.js";
import { analyzeDeckText, DeckLabInputError, type DeckLabMode } from "./analyze-deck.ts";

export interface DeckLabAnalysisContext {
  readonly cubeKey: string;
  readonly snapshotId: string | null;
  readonly snapshot?: { readonly cards: readonly { readonly oracleId: string }[] };
  readonly catalog: Pick<CardCatalog, "getCardByOracleId" | "getCardByName">;
  readonly deckEvaluationOptions: DeckEvaluationOptions;
  readonly synergyProfile?: DeckSynergyProfile;
  readonly coverage: "full" | "basic" | "catalog_only";
  readonly provenance: {
    readonly source: "coach-context@1" | "snapshot-catalog" | "catalog-only";
    readonly catalogCardCount: number;
    readonly catalogGeneratedAt: string;
    readonly snapshotSha256?: string;
    readonly snapshotSourceSha256?: string;
    readonly profileSourceSha256?: string;
    readonly archetypeModelVersion?: string;
    readonly archetypeGeneratorVersion?: string;
    readonly powerRankingId?: string;
  };
}

export interface DeckLabHttpDependencies {
  readonly projectRoot: string;
  readonly loadContext: (cubeKey: string) => Promise<Readonly<DeckLabAnalysisContext>>;
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > 128 * 1024) throw new DeckLabInputError("Liste trop volumineuse.");
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new DeckLabInputError("Requête JSON invalide.");
  }
}

export function createDeckLabHttpHandler(dependencies: Readonly<DeckLabHttpDependencies>) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<boolean> => {
    if (request.url?.split("?")[0] !== "/api/deck-lab/analyze") return false;
    if (request.method !== "POST") {
      sendJson(response, 405, {
        ok: false,
        error: { code: "METHOD_NOT_ALLOWED", message: "Méthode refusée." },
      });
      return true;
    }
    try {
      const body = await readBody(request);
      if (
        !body ||
        typeof body !== "object" ||
        !("text" in body) ||
        typeof body.text !== "string" ||
        !("mode" in body) ||
        (body.mode !== "rate" && body.mode !== "pimp") ||
        !("cubeKey" in body) ||
        typeof body.cubeKey !== "string" ||
        !/^[a-z0-9_]{1,64}$/u.test(body.cubeKey)
      ) {
        throw new DeckLabInputError("Choisissez un cube, un mode et une liste MTGA valide.");
      }
      const mode: DeckLabMode = body.mode;
      const context = await dependencies.loadContext(body.cubeKey);
      const index = MasterCardsIndex.getInstance(dependencies.projectRoot);
      const catalog = {
        resolveCard: (name: string) => {
          const exact = index.findExactCard(name);
          return (
            (exact?.oracleId ? context.catalog.getCardByOracleId(exact.oracleId) : undefined) ??
            context.catalog.getCardByName(name)
          );
        },
      };
      const result = analyzeDeckText(
        body.text,
        mode,
        catalog,
        context.deckEvaluationOptions,
        context.snapshot ? new Set(context.snapshot.cards.map((card) => card.oracleId)) : undefined,
      );
      const parsed = parseMtgaDeckText(body.text);
      const translations = Object.fromEntries(
        [...parsed.cards, ...parsed.sideboardCards].flatMap(({ name }) => {
          const document = catalog.resolveCard(name);
          return document?.frenchName ? [[document.name, document.frenchName]] : [];
        }),
      );
      Object.assign(translations, {
        Plains: "Plaine",
        Island: "Île",
        Swamp: "Marais",
        Mountain: "Montagne",
        Forest: "Forêt",
      });
      sendJson(response, 200, {
        ok: true,
        ...result,
        warnings: [
          ...result.warnings,
          ...(context.coverage === "basic"
            ? [
                "Le profil de synergie de ce cube n'est pas prêt : la note utilise les faits du catalogue sans affinités d'archétype du cube.",
              ]
            : context.coverage === "catalog_only"
              ? [
                  "Ce cube n'a pas de snapshot valide : la note utilise seulement le catalogue général, sans profil ni vérification d'appartenance au cube.",
                ]
              : []),
        ],
        translations,
        context: {
          cubeKey: context.cubeKey,
          snapshotId: context.snapshotId,
          profileVersion: context.synergyProfile?.modelVersion ?? null,
          coverage: context.coverage,
          provenance: context.provenance,
        },
      });
    } catch (error: unknown) {
      const invalid = error instanceof DeckLabInputError;
      sendJson(response, invalid ? 400 : 503, {
        ok: false,
        error: {
          code: invalid ? "INVALID_INPUT" : "CONTEXT_UNAVAILABLE",
          message: invalid
            ? error.message
            : "Le contexte de ce cube est momentanément indisponible pour l'analyse.",
        },
      });
    }
    return true;
  };
}
