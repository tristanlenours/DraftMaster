import { createHash } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { join } from "node:path";

import { cardNameToSlug } from "../cards/types.ts";
import { isAllowedScryfallImageUrl, selectBestProxyVariants } from "./print-selector.ts";
import type {
  ProxyCardFallbackInput,
  ProxyCardFrenchData,
  ProxyScanEntry,
  ProxyScansCatalog,
  ProxyScanVariant,
  ScryfallPrint,
} from "./types.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const PRINTS_CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_OVERRIDE_BODY_BYTES = 128 * 1024;
const SCRYFALL_HEADERS = {
  "User-Agent": "DraftMaster/1.0 (proxy-scans-studio; github.com/tristanlenours/DraftMaster)",
  Accept: "application/json",
};

export interface ProxyScansHttpDependencies {
  readonly catalogPath: string;
  readonly imageCacheDir: string;
  readonly resolveCardFallback?: (
    oracleId: string | null,
    name: string | null,
  ) => Promise<ProxyCardFallbackInput | null>;
  readonly fetchImpl?: typeof fetch;
}

interface ScryfallSearchResponse {
  readonly data?: readonly ScryfallPrint[];
  readonly has_more?: boolean;
  readonly next_page?: string;
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > MAX_OVERRIDE_BODY_BYTES) {
      throw new Error("Requête trop volumineuse.");
    }
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function emptyCatalog(): ProxyScansCatalog {
  return {
    schemaVersion: 1,
    generatedAt: new Date(0).toISOString(),
    cardCount: 0,
    entries: {},
  };
}

function isValidVariant(value: unknown): value is ProxyScanVariant {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ProxyScanVariant>;
  return (
    typeof candidate.scryfallId === "string" &&
    candidate.scryfallId.length > 0 &&
    typeof candidate.pngUrl === "string" &&
    isAllowedScryfallImageUrl(candidate.pngUrl) &&
    typeof candidate.largeUrl === "string" &&
    isAllowedScryfallImageUrl(candidate.largeUrl) &&
    typeof candidate.lang === "string" &&
    typeof candidate.setCode === "string"
  );
}

function isValidFrenchPatch(value: unknown): value is Partial<ProxyCardFrenchData> {
  if (!value || typeof value !== "object") return false;
  const patch = value as Record<string, unknown>;
  for (const key of [
    "name",
    "typeLine",
    "rulesText",
    "flavorText",
    "backFaceName",
    "backFaceTypeLine",
    "backFaceRulesText",
  ]) {
    if (key in patch && patch[key] !== undefined && typeof patch[key] !== "string") {
      return false;
    }
  }
  return true;
}

function inferImageExtension(url: string): string {
  const pathname = new URL(url).pathname.toLowerCase();
  if (pathname.endsWith(".png")) return ".png";
  if (pathname.endsWith(".webp")) return ".webp";
  return ".jpg";
}

function contentTypeForExtension(ext: string): string {
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

async function fetchAllScryfallPrints(
  query: string,
  fetchImpl: typeof fetch,
): Promise<readonly ScryfallPrint[]> {
  const collected: ScryfallPrint[] = [];
  let nextUrl: string | undefined =
    `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&unique=prints&include_multilingual=true&include_extras=true`;
  let pageCount = 0;

  while (nextUrl && pageCount < 4) {
    pageCount += 1;
    const res = await fetchImpl(nextUrl, { headers: SCRYFALL_HEADERS });
    if (res.status === 404) {
      break;
    }
    if (!res.ok) {
      throw new Error(`Scryfall a répondu ${String(res.status)}`);
    }
    const payload = (await res.json()) as ScryfallSearchResponse;
    if (payload.data) {
      collected.push(...payload.data);
    }
    nextUrl = payload.has_more && payload.next_page ? payload.next_page : undefined;
  }

  return collected;
}

export function createProxyScansHttpHandler(dependencies: Readonly<ProxyScansHttpDependencies>) {
  const fetchImpl = dependencies.fetchImpl ?? fetch;

  let cachedCatalog: { readonly mtimeMs: number; readonly data: ProxyScansCatalog } | null = null;
  const printsCache = new Map<
    string,
    { readonly fetchedAt: number; readonly result: ReturnType<typeof selectBestProxyVariants> }
  >();

  async function loadCatalog(): Promise<ProxyScansCatalog> {
    try {
      const fileStat = await stat(dependencies.catalogPath);
      if (cachedCatalog?.mtimeMs === fileStat.mtimeMs) {
        return cachedCatalog.data;
      }
      const parsed = JSON.parse(
        await readFile(dependencies.catalogPath, "utf8"),
      ) as ProxyScansCatalog;
      cachedCatalog = { mtimeMs: fileStat.mtimeMs, data: parsed };
      return parsed;
    } catch {
      return emptyCatalog();
    }
  }

  async function saveCatalog(catalog: ProxyScansCatalog): Promise<void> {
    const tmpPath = `${dependencies.catalogPath}.${String(process.pid)}.tmp`;
    await writeFile(tmpPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
    await rename(tmpPath, dependencies.catalogPath);
    const fileStat = await stat(dependencies.catalogPath);
    cachedCatalog = { mtimeMs: fileStat.mtimeMs, data: catalog };
  }

  return async (request: IncomingMessage, response: ServerResponse): Promise<boolean> => {
    const rawUrl = request.url ?? "/";
    const parsedUrl = new URL(rawUrl, "http://draftmaster.local");
    const pathname = parsedUrl.pathname;

    if (!pathname.startsWith("/api/proxy-scans/")) {
      return false;
    }

    // 1. GET /api/proxy-scans/catalog
    if (pathname === "/api/proxy-scans/catalog") {
      if (request.method !== "GET") {
        sendJson(response, 405, { ok: false, error: "Méthode non autorisée." });
        return true;
      }
      const catalog = await loadCatalog();
      sendJson(response, 200, { ok: true, catalog });
      return true;
    }

    // 2. GET /api/proxy-scans/prints?oracleId=<uuid>&name=<cardName>
    if (pathname === "/api/proxy-scans/prints") {
      if (request.method !== "GET") {
        sendJson(response, 405, { ok: false, error: "Méthode non autorisée." });
        return true;
      }

      const oracleIdParam = parsedUrl.searchParams.get("oracleId")?.trim() ?? "";
      const nameParam = parsedUrl.searchParams.get("name")?.trim() ?? "";
      const forceRefresh = parsedUrl.searchParams.get("refresh") === "1";

      const oracleId = UUID_PATTERN.test(oracleIdParam) ? oracleIdParam : null;
      if (!oracleId && !nameParam) {
        sendJson(response, 400, {
          ok: false,
          error: "Fournissez oracleId ou name pour rechercher les impressions.",
        });
        return true;
      }

      const fallbackFromCatalog = dependencies.resolveCardFallback
        ? await dependencies.resolveCardFallback(oracleId, nameParam || null)
        : null;

      const resolvedName = fallbackFromCatalog?.name ?? nameParam;
      const resolvedOracleId = fallbackFromCatalog?.oracleId ?? oracleId ?? "";
      const cacheKey = resolvedOracleId || resolvedName.toLowerCase();
      const existingCached = printsCache.get(cacheKey);
      if (
        !forceRefresh &&
        existingCached &&
        Date.now() - existingCached.fetchedAt < PRINTS_CACHE_TTL_MS
      ) {
        sendJson(response, 200, { ok: true, ...existingCached.result, cached: true });
        return true;
      }

      const query = resolvedOracleId
        ? `oracleid:${resolvedOracleId} (lang:en OR lang:fr)`
        : `!"${resolvedName.split(" // ")[0]?.trim() ?? resolvedName}" (lang:en OR lang:fr)`;

      const fallbackInput: ProxyCardFallbackInput = fallbackFromCatalog ?? {
        oracleId: resolvedOracleId,
        slug: cardNameToSlug(resolvedName),
        name: resolvedName,
        typeLine: "",
        oracleText: "",
      };

      try {
        const prints = await fetchAllScryfallPrints(query, fetchImpl);
        const selection = selectBestProxyVariants(prints, fallbackInput);
        printsCache.set(cacheKey, { fetchedAt: Date.now(), result: selection });
        sendJson(response, 200, { ok: true, ...selection, cached: false });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur Scryfall inconnue.";
        sendJson(response, 502, {
          ok: false,
          error: `Impossible de récupérer les prints Scryfall : ${message}`,
        });
      }
      return true;
    }

    // 3. GET /api/proxy-scans/image?url=<encodedScryfallUrl>
    if (pathname === "/api/proxy-scans/image") {
      if (request.method !== "GET") {
        sendJson(response, 405, { ok: false, error: "Méthode non autorisée." });
        return true;
      }

      const targetUrl = parsedUrl.searchParams.get("url")?.trim() ?? "";
      if (!isAllowedScryfallImageUrl(targetUrl)) {
        sendJson(response, 400, {
          ok: false,
          error:
            "URL d'image refusée : seules les images HTTPS officielles Scryfall sont autorisées.",
        });
        return true;
      }

      const ext = inferImageExtension(targetUrl);
      const hash = createHash("sha256").update(targetUrl).digest("hex").slice(0, 32);
      const cachedFile = join(dependencies.imageCacheDir, `${hash}${ext}`);

      try {
        const bytes = await readFile(cachedFile);
        response.writeHead(200, {
          "Content-Type": contentTypeForExtension(ext),
          "Cache-Control": "public, max-age=604800, immutable",
          "Content-Length": bytes.byteLength,
        });
        response.end(bytes);
        return true;
      } catch {
        // Cache miss: fetch from Scryfall CDN
      }

      try {
        const remote = await fetchImpl(targetUrl, {
          headers: {
            "User-Agent": SCRYFALL_HEADERS["User-Agent"],
            Accept: "image/png,image/jpeg,image/webp,*/*;q=0.8",
          },
        });
        if (!remote.ok) {
          sendJson(response, 502, {
            ok: false,
            error: `Scryfall CDN a répondu ${String(remote.status)}.`,
          });
          return true;
        }
        const buffer = Buffer.from(await remote.arrayBuffer());
        await mkdir(dependencies.imageCacheDir, { recursive: true });
        const tmpFile = `${cachedFile}.${String(process.pid)}.tmp`;
        await writeFile(tmpFile, buffer);
        await rename(tmpFile, cachedFile);

        response.writeHead(200, {
          "Content-Type": contentTypeForExtension(ext),
          "Cache-Control": "public, max-age=604800, immutable",
          "Content-Length": buffer.byteLength,
        });
        response.end(buffer);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur réseau.";
        sendJson(response, 502, {
          ok: false,
          error: `Téléchargement d'image impossible : ${message}`,
        });
      }
      return true;
    }

    // 4. POST /api/proxy-scans/override
    if (pathname === "/api/proxy-scans/override") {
      if (request.method !== "POST") {
        sendJson(response, 405, { ok: false, error: "Méthode non autorisée." });
        return true;
      }

      try {
        const body = (await readJsonBody(request)) as Record<string, unknown>;
        const oracleId = typeof body.oracleId === "string" ? body.oracleId.trim() : "";
        if (!UUID_PATTERN.test(oracleId)) {
          sendJson(response, 400, { ok: false, error: "oracleId UUID invalide." });
          return true;
        }

        const catalog = await loadCatalog();
        const existing = catalog.entries[oracleId];
        const fallback = dependencies.resolveCardFallback
          ? await dependencies.resolveCardFallback(oracleId, null)
          : null;

        const nextClassic =
          body.classic !== undefined
            ? isValidVariant(body.classic)
              ? body.classic
              : null
            : (existing?.classic ?? null);

        if (body.classic !== undefined && !nextClassic) {
          sendJson(response, 400, { ok: false, error: "Variante classique invalide." });
          return true;
        }
        if (!nextClassic) {
          sendJson(response, 400, {
            ok: false,
            error: "Une variante classique valide est requise pour enregistrer cette carte.",
          });
          return true;
        }

        let nextOriginal: ProxyScanVariant | null = existing?.original ?? null;
        if ("original" in body) {
          if (body.original === null) {
            nextOriginal = null;
          } else if (isValidVariant(body.original)) {
            nextOriginal = body.original;
          } else {
            sendJson(response, 400, { ok: false, error: "Variante originale invalide." });
            return true;
          }
        }

        let nextFrench: ProxyCardFrenchData = existing?.french ?? {
          name:
            fallback?.frenchName ??
            fallback?.name ??
            (typeof body.name === "string" ? body.name : "Carte"),
          typeLine: fallback?.typeLine ?? "",
          rulesText: fallback?.frenchText ?? fallback?.oracleText ?? "",
          source: "custom",
          officialFrenchPrintExists: false,
        };

        if ("french" in body && body.french !== undefined) {
          if (!isValidFrenchPatch(body.french)) {
            sendJson(response, 400, { ok: false, error: "Données de texte français invalides." });
            return true;
          }
          const patch = body.french;
          nextFrench = {
            ...nextFrench,
            ...(patch.name !== undefined ? { name: patch.name.trim() || nextFrench.name } : {}),
            ...(patch.typeLine !== undefined ? { typeLine: patch.typeLine.trim() } : {}),
            ...(patch.rulesText !== undefined ? { rulesText: patch.rulesText } : {}),
            ...(patch.flavorText !== undefined ? { flavorText: patch.flavorText } : {}),
            ...(patch.backFaceName !== undefined ? { backFaceName: patch.backFaceName } : {}),
            ...(patch.backFaceTypeLine !== undefined
              ? { backFaceTypeLine: patch.backFaceTypeLine }
              : {}),
            ...(patch.backFaceRulesText !== undefined
              ? { backFaceRulesText: patch.backFaceRulesText }
              : {}),
            source: "custom",
          };
        }

        const resolvedName =
          existing?.name ??
          fallback?.name ??
          (typeof body.name === "string" && body.name.trim() ? body.name.trim() : nextFrench.name);
        const resolvedSlug =
          existing?.slug ??
          fallback?.slug ??
          (typeof body.slug === "string" && body.slug.trim()
            ? body.slug.trim()
            : cardNameToSlug(resolvedName));

        const updatedEntry: ProxyScanEntry = {
          oracleId,
          slug: resolvedSlug,
          name: resolvedName,
          french: nextFrench,
          classic: nextClassic,
          original: nextOriginal,
          curatedAt: new Date().toISOString(),
        };

        const nextEntries = { ...catalog.entries, [oracleId]: updatedEntry };
        const updatedCatalog: ProxyScansCatalog = {
          schemaVersion: 1,
          generatedAt: new Date().toISOString(),
          cardCount: Object.keys(nextEntries).length,
          entries: nextEntries,
        };

        await saveCatalog(updatedCatalog);
        sendJson(response, 200, { ok: true, entry: updatedEntry });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Requête invalide.";
        sendJson(response, 400, { ok: false, error: message });
      }
      return true;
    }

    sendJson(response, 404, { ok: false, error: "Endpoint proxy-scans introuvable." });
    return true;
  };
}
