import { createServer } from "node:http";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, extname, resolve, relative, isAbsolute } from "node:path";
import { promisify } from "node:util";
import {
  brotliCompress as brotliCompressCallback,
  gzip as gzipCallback,
  constants as zlibConstants,
} from "node:zlib";
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { loadLocalEnvFiles } from "../src/config/env-files.ts";
import { createSoloDraftHttpHandler } from "../src/solo-draft/http-handler.ts";
import { createFileSoloDraftStore } from "../src/solo-draft/solo-draft-store.ts";
import { soloSessionTtlMs, startSoloSessionExpiry } from "../src/solo-draft/session-expiry.ts";
import {
  getUnifiedLeaderboard,
  getMagiciensProfilesWithStats,
  getDeckShareData,
} from "../src/storage/cloud-leaderboard.ts";
import {
  getPublicSupabaseConfig,
  isSupabaseConfigured,
  getCleanUrl,
  getCleanKey,
  getSupabaseServiceRoleClient,
} from "../src/storage/supabase-client.ts";
import { getAdminDrafts, getAdminDraftById } from "../src/solo-draft/admin-drafts.ts";
import { loadActiveCubeSnapshot } from "../src/cubes/load-active-snapshot.ts";
import { loadCoachContext } from "../src/cubes/coach-context.ts";
import { CardCatalog } from "../src/cards/card-catalog.ts";
import { toCardEvaluationInput } from "../src/cards/evaluation-input.ts";
import { createDeckLabHttpHandler } from "../src/deck-lab/http-handler.ts";
import { LlmRouter } from "../src/companion/llm-router.ts";
import { createMultiplayerDraftCoordinator } from "../src/multiplayer-draft/index.ts";
import {
  createLocalFileMultiplayerDraftStore,
  createMultiplayerDraftHttpHandler,
} from "../src/multiplayer-draft/adapters.ts";
import { createFinalDeckCoach } from "../src/coach-advice/final-deck-coach.ts";
import { createTournamentCoordinator } from "../src/tournaments/index.ts";
import {
  createJsonLineTournamentObservability,
  createSupabaseTournamentStore,
  createTournamentCubeCatalog,
  createTournamentHttpHandler,
  createTournamentSupabaseGateway,
} from "../src/tournaments/adapters.ts";

loadLocalEnvFiles();

const rootDir = process.cwd();
const webDir = resolve(rootDir, "src", "web");
const reportsDir = resolve(rootDir, "reports");
const draftSessionsDir = resolve(rootDir, "data", "draft-sessions");
const multiplayerDraftPath = resolve(rootDir, "data", "multiplayer-draft", "global.json");
const fallbackMultiplayerResumeSecret = randomBytes(32);
const brotliCompress = promisify(brotliCompressCallback);
const gzip = promisify(gzipCallback);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

// Only these subtrees of data/ are public; sessions, records and archives stay private.
const PUBLIC_DATA_PREFIXES = ["cubes/", "cards/master-cards.json", "cards/images/"];

const COMPRESSIBLE_EXTENSIONS = new Set([".html", ".css", ".js", ".mjs", ".json", ".svg"]);
const compressedAssetCache = new Map();

function isInside(root, candidate) {
  const rel = relative(root, candidate);
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

/**
 * Maps a decoded URL pathname to a file under an allowed root, or null.
 * Rejects any traversal segment after decoding (%2F, %5C, ..).
 */
function resolveStaticFile(pathname, roots) {
  if (pathname.includes("\0")) return null;
  const segments = pathname.split(/[/\\]+/);
  if (segments.some((segment) => segment === "..")) return null;

  let root;
  let relativePath;
  if (pathname.startsWith("/data/")) {
    relativePath = pathname.slice("/data/".length);
    if (!PUBLIC_DATA_PREFIXES.some((prefix) => relativePath.startsWith(prefix))) return null;
    root = roots.dataDir;
  } else if (pathname.startsWith("/reports/")) {
    relativePath = pathname.slice("/reports/".length);
    root = roots.reportsDir;
  } else {
    relativePath = pathname.slice(1);
    root = roots.webDir;
  }

  const filePath = resolve(root, relativePath);
  return isInside(root, filePath) ? filePath : null;
}

function pickEncoding(acceptEncoding) {
  const accepted = String(acceptEncoding ?? "");
  if (/\bbr\b/.test(accepted)) return "br";
  if (/\bgzip\b/.test(accepted)) return "gzip";
  return null;
}

async function getEncodedAsset(filePath, fileStat, encoding, content) {
  const key = `${filePath}:${encoding}`;
  const cached = compressedAssetCache.get(key);
  if (cached && cached.mtimeMs === fileStat.mtimeMs && cached.size === fileStat.size) {
    return cached.body;
  }
  const body =
    encoding === "br"
      ? await brotliCompress(content, {
          params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 9 },
        })
      : await gzip(content, { level: 9 });
  compressedAssetCache.set(key, { mtimeMs: fileStat.mtimeMs, size: fileStat.size, body });
  return body;
}

function parseAllowedOrigins(value) {
  return new Set(
    String(value ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

function computeAuthToken(password) {
  return createHmac("sha256", "draftmaster_guild_passcode_salt_2026")
    .update(password)
    .digest("hex");
}

function verifyAuthToken(candidateToken, password) {
  if (!candidateToken || typeof candidateToken !== "string" || !password) return false;
  const expectedToken = computeAuthToken(password);
  if (candidateToken.length !== expectedToken.length) return false;
  try {
    return timingSafeEqual(Buffer.from(candidateToken), Buffer.from(expectedToken));
  } catch {
    return false;
  }
}

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  for (const pair of header.split(";")) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (key) {
      cookies[key] = decodeURIComponent(val);
    }
  }
  return cookies;
}

function getGatekeeperHtml() {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>DraftMaster — Accès Réservé</title>
  <style>
    :root {
      --bg-primary: #0a0d14;
      --bg-card: #131926;
      --border-color: #242f45;
      --accent-gold: #d4af37;
      --accent-glow: rgba(212, 175, 55, 0.2);
      --text-main: #f0f4f8;
      --text-muted: #8c9cb0;
      --danger: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body {
      background: radial-gradient(circle at 50% 25%, #162035 0%, var(--bg-primary) 80%);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .gate-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      max-width: 420px;
      width: 100%;
      padding: 2.5rem 2rem;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.6), 0 0 35px var(--accent-glow);
      text-align: center;
    }
    .gate-icon {
      font-size: 3rem;
      margin-bottom: 0.75rem;
      display: inline-block;
      filter: drop-shadow(0 0 10px var(--accent-gold));
    }
    .magic-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: rgba(212, 175, 55, 0.12);
      color: var(--accent-gold);
      border: 1px solid rgba(212, 175, 55, 0.3);
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 1.25rem;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #fff;
      margin-bottom: 0.5rem;
      letter-spacing: -0.02em;
    }
    .tagline {
      color: var(--text-muted);
      font-size: 0.9rem;
      margin-bottom: 1.75rem;
      line-height: 1.45;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      text-align: left;
    }
    label {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    input[type="password"] {
      width: 100%;
      padding: 0.85rem 1rem;
      background: #090c12;
      border: 1px solid var(--border-color);
      border-radius: 10px;
      color: #fff;
      font-size: 1rem;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    input[type="password"]:focus {
      border-color: var(--accent-gold);
      box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.2);
    }
    button[type="submit"] {
      background: linear-gradient(135deg, #d4af37, #b88e14);
      color: #0b0e14;
      font-weight: 700;
      font-size: 0.95rem;
      border: none;
      border-radius: 10px;
      padding: 0.85rem;
      cursor: pointer;
      transition: transform 0.1s, filter 0.2s;
      margin-top: 0.25rem;
    }
    button[type="submit"]:hover {
      filter: brightness(1.1);
    }
    button[type="submit"]:active {
      transform: scale(0.98);
    }
    .error-box {
      display: none;
      color: var(--danger);
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      padding: 0.75rem;
      border-radius: 8px;
      font-size: 0.85rem;
      text-align: center;
    }
    .footer-note {
      margin-top: 1.75rem;
      font-size: 0.75rem;
      color: #52627a;
    }
  </style>
</head>
<body>
  <div class="gate-card">
    <div class="gate-icon">⚔️</div>
    <div><span class="magic-badge">✨ Cube des 8 Magiciens</span></div>
    <h1>Accès Réservé</h1>
    <p class="tagline">Ce cube et ses drafts sont réservés aux membres de la guilde. Veuillez saisir votre clé d'accès.</p>

    <form id="gate-form" method="POST" action="/api/auth/login">
      <label for="password">Mot de passe de guilde</label>
      <input type="password" id="password" name="password" required autofocus placeholder="••••••••••••" autocomplete="current-password" />
      <button type="submit" id="btn-unlock">Déverrouiller le Cube 🔓</button>
      <div class="error-box" id="error-msg"></div>
    </form>

    <p class="footer-note">DraftMaster &bull; Privé & Sécurisé</p>
  </div>

  <script>
    const form = document.getElementById("gate-form");
    const pwdInput = document.getElementById("password");
    const errorMsg = document.getElementById("error-msg");
    const btn = document.getElementById("btn-unlock");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorMsg.style.display = "none";
      btn.disabled = true;
      btn.textContent = "Vérification...";

      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: pwdInput.value })
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          window.location.reload();
        } else {
          errorMsg.textContent = data.error || "Mot de passe de guilde incorrect.";
          errorMsg.style.display = "block";
          btn.disabled = false;
          btn.textContent = "Déverrouiller le Cube 🔓";
          pwdInput.select();
        }
      } catch (err) {
        errorMsg.textContent = "Erreur de communication avec le serveur.";
        errorMsg.style.display = "block";
        btn.disabled = false;
        btn.textContent = "Déverrouiller le Cube 🔓";
      }
    });
  </script>
</body>
</html>`;
}

async function readJsonBody(req) {
  return new Promise((resolveBody, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      if (!body) {
        resolveBody({});
        return;
      }
      const ctype = req.headers["content-type"] || "";
      if (ctype.includes("application/x-www-form-urlencoded")) {
        const params = new URLSearchParams(body);
        resolveBody(Object.fromEntries(params.entries()));
        return;
      }
      try {
        resolveBody(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(data));
}

function createUnavailableTournamentStore() {
  const unavailable = () =>
    Promise.resolve({
      ok: false,
      error: {
        code: "STORE_UNAVAILABLE",
        message: "Le stockage durable des tournois n'est pas configuré.",
        details: {},
      },
    });
  return {
    list: unavailable,
    load: unavailable,
    commit: unavailable,
    delete: unavailable,
    checkReadiness: unavailable,
  };
}

export function createRequestHandler(options = {}) {
  const sitePassword =
    options.sitePassword !== undefined ? options.sitePassword : process.env.SITE_PASSWORD;
  const isTestEnv =
    options.isTestEnv !== undefined
      ? options.isTestEnv
      : Boolean(process.env.VITEST || process.env.NODE_ENV === "test");
  const authRequired =
    options.authEnabled !== undefined
      ? Boolean(options.authEnabled && sitePassword)
      : Boolean(sitePassword && !isTestEnv);
  const handlerReportsDir = resolve(options.reportsDirectory ?? reportsDir);
  const staticRoots = { dataDir: resolve(rootDir, "data"), reportsDir: handlerReportsDir, webDir };
  const allowedOrigins = parseAllowedOrigins(
    options.corsAllowedOrigins ?? process.env.CORS_ALLOWED_ORIGINS,
  );
  const adminDraftsPath = options.adminDraftsPath;
  const leaderboardPath = options.leaderboardPath;
  const multiplayerResumeSecret =
    options.multiplayerResumeSecret ??
    process.env.MULTIPLAYER_RESUME_SECRET ??
    fallbackMultiplayerResumeSecret;
  let multiplayerCatalogPromise;
  const loadMultiplayerCatalog = async () => {
    multiplayerCatalogPromise ??= CardCatalog.fromFileCached(
      resolve(rootDir, "data", "cards", "master-cards.json"),
    );
    const result = await multiplayerCatalogPromise;
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
  };
  const multiplayerArenaMetadata = new Map();
  const multiplayerCoachContexts = new Map();
  const loadMultiplayerCoachContext = async (cubeKey) => {
    if (!multiplayerCoachContexts.has(cubeKey)) {
      multiplayerCoachContexts.set(
        cubeKey,
        loadCoachContext(rootDir, cubeKey).then((result) => {
          if (!result.ok) {
            multiplayerCoachContexts.delete(cubeKey);
            throw new Error(`${result.error.code}: ${result.error.message}`);
          }
          return result.value;
        }),
      );
    }
    return multiplayerCoachContexts.get(cubeKey);
  };
  const loadArenaMetadata = async (cubeKey) => {
    if (!multiplayerArenaMetadata.has(cubeKey)) {
      multiplayerArenaMetadata.set(
        cubeKey,
        readFile(resolve(rootDir, "data", "cubes", cubeKey, "cubecobra-raw.json"), "utf8").then(
          (text) => {
            const raw = JSON.parse(text);
            return new Map(
              (raw.cards?.mainboard ?? []).flatMap((entry) => {
                const details = entry.details;
                return details?.oracle_id ? [[details.oracle_id, details]] : [];
              }),
            );
          },
        ),
      );
    }
    return multiplayerArenaMetadata.get(cubeKey);
  };
  const multiplayerLlm = new LlmRouter();
  const finalDeckCoach =
    options.finalDeckCoach ??
    createFinalDeckCoach({
      generateJson: (systemPrompt, userPrompt, profile) =>
        multiplayerLlm.generateJson(systemPrompt, userPrompt, profile),
    });
  // Solo advice provider is chosen here, at the composition root. Tests get the
  // deterministic engine unless they inject one explicitly.
  const soloLanguageModel =
    options.soloLanguageModel !== undefined
      ? (options.soloLanguageModel ?? undefined)
      : isTestEnv
        ? undefined
        : multiplayerLlm;
  const soloDraftHandler = createSoloDraftHttpHandler({
    store:
      options.soloDraftStore ??
      createFileSoloDraftStore(options.soloSessionsDirectory ?? draftSessionsDir),
    finalDeckCoach,
    languageModel: soloLanguageModel,
    reportsDirectory: handlerReportsDir,
    reportsUrlPrefix: "/reports",
    adminDraftsPath,
    leaderboardPath,
  });
  const multiplayerCoordinator =
    options.multiplayerCoordinator ??
    createMultiplayerDraftCoordinator({
      store: createLocalFileMultiplayerDraftStore({
        filePath: resolve(options.multiplayerDraftPath ?? multiplayerDraftPath),
      }),
      now: () => new Date().toISOString(),
      createId: randomUUID,
      createSessionId: () => randomBytes(6).toString("hex"),
      createSeed: () => randomBytes(4).readInt32BE(0),
      createResumeToken: (requestId) =>
        createHmac("sha256", multiplayerResumeSecret).update(requestId).digest("base64url"),
      finalDeckCoach,
      loadCoachContext: loadMultiplayerCoachContext,
      loadCardPool: async (_cubeKey, cards) => {
        const catalog = await loadMultiplayerCatalog();
        return cards.map((card) => {
          const document =
            catalog.getCardByOracleId(card.oracleId) ?? catalog.getCardByName(card.name);
          if (!document) throw new Error(`Missing catalog card: ${card.oracleId}`);
          return toCardEvaluationInput(document, card.instanceId);
        });
      },
      loadMtgaPool: async (cubeKey, cards) => {
        const [catalog, metadata] = await Promise.all([
          loadMultiplayerCatalog(),
          loadArenaMetadata(cubeKey),
        ]);
        return cards.map((card) => {
          const details = metadata.get(card.oracleId);
          const games = details?.gamesEverAvailable ?? details?.games ?? [];
          const document =
            catalog.getCardByOracleId(card.oracleId) ?? catalog.getCardByName(card.name);
          const hasArena = games.includes("arena");
          return {
            instanceId: card.instanceId,
            name: card.name,
            arenaName: details?.name ?? card.name,
            arenaAvailability: details?.hasFlavorName
              ? "ambiguous"
              : details
                ? hasArena
                  ? "available"
                  : "unavailable"
                : "unknown",
            cmc: document?.cmc ?? details?.cmc ?? 0,
            isLand: document?.isLand ?? String(details?.type ?? "").includes("Land"),
          };
        });
      },
      loadSnapshot: async (cubeKey) => {
        const result = await loadActiveCubeSnapshot(rootDir, cubeKey);
        if (!result.ok) throw new Error(result.error.message);
        return result.value;
      },
    });
  const multiplayerHandler = createMultiplayerDraftHttpHandler({
    coordinator: multiplayerCoordinator,
  });
  const tournamentCoordinator =
    options.tournamentCoordinator ??
    createTournamentCoordinator({
      store: (() => {
        const client = getSupabaseServiceRoleClient();
        return client === null
          ? createUnavailableTournamentStore()
          : createSupabaseTournamentStore({
              gateway: createTournamentSupabaseGateway(client),
            });
      })(),
      cubeCatalog: createTournamentCubeCatalog({ projectRoot: rootDir }),
      now: () => new Date().toISOString(),
      createId: randomUUID,
      createSeed: () => randomBytes(4).readInt32BE(0),
    });
  const tournamentHandler = createTournamentHttpHandler({
    coordinator: tournamentCoordinator,
    observability:
      options.tournamentObservability ??
      (isTestEnv ? undefined : createJsonLineTournamentObservability()),
    deckRecognizer: options.deckRecognizer,
    loadCubeSnapshot: async (cubeKey) => {
      try {
        const snap = await loadActiveCubeSnapshot(rootDir, cubeKey);
        if (snap.ok) {
          return snap.value.cards.map((c) => c.name);
        }
      } catch {
        // Fallback
      }
      return [];
    },
  });
  const deckLabHandler = createDeckLabHttpHandler({
    projectRoot: rootDir,
    loadContext: async (cubeKey) => {
      const context = await loadCoachContext(rootDir, cubeKey);
      if (context.ok) {
        return {
          ...context.value,
          coverage: "full",
          provenance: {
            source: "coach-context@1",
            ...context.value.provenance,
            catalogGeneratedAt: context.value.catalog.catalog.generatedAt,
          },
        };
      }
      if (context.error.code !== "CONTEXT_NOT_READY") {
        throw new Error(context.error.message);
      }
      const snapshot = await loadActiveCubeSnapshot(rootDir, cubeKey);
      if (!snapshot.ok && snapshot.error.code !== "INSUFFICIENT_CARDS") {
        throw new Error(snapshot.error.message);
      }
      const catalog = await loadMultiplayerCatalog();
      return {
        cubeKey,
        snapshotId: snapshot.ok ? snapshot.value.snapshotId : null,
        ...(snapshot.ok ? { snapshot: snapshot.value } : {}),
        catalog,
        deckEvaluationOptions: {},
        coverage: snapshot.ok ? "basic" : "catalog_only",
        provenance: {
          source: snapshot.ok ? "snapshot-catalog" : "catalog-only",
          catalogCardCount: catalog.totalCards,
          catalogGeneratedAt: catalog.catalog.generatedAt,
          ...(snapshot.ok
            ? {
                snapshotSha256: snapshot.value.integrity.canonicalSha256,
                snapshotSourceSha256: snapshot.value.source.rawSha256,
              }
            : {}),
        },
      };
    },
  });

  return async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("400 Bad Request");
      return;
    }

    // CORS only for explicitly allowed origins; the web app itself is same-origin.
    const origin = req.headers.origin;
    if (origin && allowedOrigins.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Idempotency-Key");
    }

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // ==========================================
    // EXEMPT PUBLIC ENDPOINTS (Health & Auth)
    // ==========================================

    // Healthchecks pour Railway et monitoring d'uptime
    if ((pathname === "/health" || pathname === "/health/live") && req.method === "GET") {
      sendJson(res, 200, {
        status: "ok",
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        supabaseConfigured: isSupabaseConfigured(),
        supabaseDiagnostics: {
          hasRawUrl: Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
          hasRawKey: Boolean(
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
            process.env.SUPABASE_ANON_KEY ||
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
            process.env.SUPABASE_KEY,
          ),
          urlResolved: Boolean(getCleanUrl()),
          keyResolved: Boolean(getCleanKey()),
        },
      });
      return;
    }

    if (pathname === "/health/ready" && req.method === "GET") {
      const tournamentReadiness = await tournamentCoordinator.checkReadiness();
      sendJson(res, tournamentReadiness.ok ? 200 : 503, {
        status: tournamentReadiness.ok ? "ready" : "unavailable",
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        tournaments: tournamentReadiness.ok
          ? { ready: true }
          : { ready: false, errorCode: tournamentReadiness.error.code },
      });
      return;
    }

    // Auth status
    if (pathname === "/api/auth/status" && req.method === "GET") {
      const cookies = parseCookies(req.headers.cookie);
      const isAuthed = !authRequired || verifyAuthToken(cookies.dm_auth, sitePassword);
      sendJson(res, 200, {
        ok: true,
        protectionEnabled: authRequired,
        authenticated: isAuthed,
      });
      return;
    }

    // Auth login
    if (pathname === "/api/auth/login" && req.method === "POST") {
      try {
        const body = await readJsonBody(req);
        const submitted = typeof body.password === "string" ? body.password.trim() : "";
        if (!authRequired) {
          sendJson(res, 200, { ok: true, message: "Protection inactive." });
          return;
        }

        if (submitted && submitted === sitePassword) {
          const token = computeAuthToken(sitePassword);
          const maxAge = 30 * 24 * 60 * 60; // 30 jours
          const cookieHeader = `dm_auth=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`;

          if (req.headers.accept?.includes("text/html") && !req.headers["x-requested-with"]) {
            res.writeHead(302, {
              Location: "/",
              "Set-Cookie": cookieHeader,
            });
            res.end();
            return;
          }

          res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
            "Set-Cookie": cookieHeader,
          });
          res.end(JSON.stringify({ ok: true, message: "Accès déverrouillé avec succès." }));
          return;
        } else {
          sendJson(res, 401, { ok: false, error: "Mot de passe de guilde incorrect." });
          return;
        }
      } catch {
        sendJson(res, 400, { ok: false, error: "Requête invalide." });
        return;
      }
    }

    // Auth logout
    if (pathname === "/api/auth/logout" && (req.method === "POST" || req.method === "GET")) {
      const clearCookie = "dm_auth=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax";
      if (req.method === "GET") {
        res.writeHead(302, {
          Location: "/",
          "Set-Cookie": clearCookie,
        });
        res.end();
        return;
      }
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Set-Cookie": clearCookie,
      });
      res.end(JSON.stringify({ ok: true, message: "Déconnexion effectuée." }));
      return;
    }

    // ==========================================
    // GATEKEEPER PASSCODE ENFORCEMENT
    // ==========================================
    if (authRequired) {
      const cookies = parseCookies(req.headers.cookie);
      const isAuthed = verifyAuthToken(cookies.dm_auth, sitePassword);
      if (!isAuthed) {
        if (pathname.startsWith("/api/")) {
          sendJson(res, 401, {
            ok: false,
            error: "Accès refusé : mot de passe de guilde requis.",
          });
          return;
        }

        // Navigation web HTML
        if (req.method === "GET") {
          const ext = extname(pathname).toLowerCase();
          const isPageRequest =
            !ext ||
            ext === ".html" ||
            pathname === "/" ||
            pathname === "/index.html" ||
            req.headers.accept?.includes("text/html");

          if (isPageRequest) {
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(getGatekeeperHtml());
            return;
          }
        }

        // Fichiers statiques et autres requêtes non autorisées
        res.writeHead(401, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("401 Unauthorized - Accès réservé aux membres de la guilde");
        return;
      }
    }

    // ==========================================
    // API ENDPOINTS
    // ==========================================

    if (await multiplayerHandler(req, res)) {
      return;
    }

    if (await tournamentHandler(req, res)) {
      return;
    }
    if (await deckLabHandler(req, res)) {
      return;
    }

    // 0. Configuration Supabase pour le frontend (Client Realtime)
    if (pathname === "/api/config/supabase" && req.method === "GET") {
      sendJson(res, 200, { ok: true, config: getPublicSupabaseConfig() });
      return;
    }

    // 0b. Panthéon & Profils des 8 Magiciens
    if (pathname === "/api/magiciens" && req.method === "GET") {
      try {
        const magiciens = await getMagiciensProfilesWithStats();
        sendJson(res, 200, { ok: true, magiciens });
      } catch (err) {
        sendJson(res, 500, { ok: false, error: err.message });
      }
      return;
    }

    // 0c. Consultation / Partage d'un Deck par ID
    if (pathname.startsWith("/api/deck/") && req.method === "GET") {
      const deckId = pathname.slice("/api/deck/".length);
      try {
        const deck = await getDeckShareData(deckId);
        if (!deck) {
          sendJson(res, 404, { ok: false, error: "Deck introuvable." });
          return;
        }
        sendJson(res, 200, { ok: true, deck });
      } catch (err) {
        sendJson(res, 500, { ok: false, error: err.message });
      }
      return;
    }

    // 1. Leaderboard (Cloud Supabase + Local Sync)
    if (pathname === "/api/leaderboard" && req.method === "GET") {
      try {
        const list = await getUnifiedLeaderboard(leaderboardPath);
        sendJson(res, 200, { ok: true, entries: list });
      } catch (err) {
        sendJson(res, 500, { ok: false, error: err.message });
      }
      return;
    }

    // 2. Draft Reports Directory
    if (pathname === "/api/reports" && req.method === "GET") {
      try {
        const files = await readdir(handlerReportsDir);
        const htmlReports = files
          .filter((f) => f.endsWith(".html"))
          .map((filename) => ({
            filename,
            url: `/reports/${filename}`,
            isBoosters: filename.endsWith("-boosters.html"),
          }));
        sendJson(res, 200, { ok: true, reports: htmlReports });
      } catch {
        sendJson(res, 200, { ok: true, reports: [] });
      }
      return;
    }

    // 2b. Admin Drafts List
    if (pathname === "/api/admin/drafts" && req.method === "GET") {
      try {
        const drafts = await getAdminDrafts(adminDraftsPath);
        sendJson(res, 200, { ok: true, drafts });
      } catch (err) {
        sendJson(res, 500, { ok: false, error: err.message });
      }
      return;
    }

    // 2c. Admin Draft Details by ID
    if (pathname.startsWith("/api/admin/drafts/") && req.method === "GET") {
      const draftId = pathname.slice("/api/admin/drafts/".length);
      try {
        const draft = await getAdminDraftById(draftId, adminDraftsPath);
        if (!draft) {
          sendJson(res, 404, { ok: false, error: "Draft non trouvé" });
          return;
        }
        sendJson(res, 200, { ok: true, draft });
      } catch (err) {
        sendJson(res, 500, { ok: false, error: err.message });
      }
      return;
    }

    if (await soloDraftHandler(req, res)) {
      return;
    }

    // ==========================================
    // STATIC FILE SERVING
    // ==========================================
    const ext = extname(pathname).toLowerCase();
    const isAppRoute = !pathname.startsWith("/data/") && !pathname.startsWith("/reports/") && !ext;
    let filePath =
      isAppRoute || pathname === "/index.html"
        ? join(webDir, "index.html")
        : resolveStaticFile(pathname, staticRoots);

    const sendNotFound = () => {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
    };
    if (!filePath) {
      sendNotFound();
      return;
    }

    try {
      let fileStat = await stat(filePath);
      if (fileStat.isDirectory()) {
        filePath = join(filePath, "index.html");
        fileStat = await stat(filePath);
      }

      const fileExt = extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[fileExt] || "application/octet-stream";
      const isDynamicAsset = fileExt === ".html" || fileExt === ".js" || fileExt === ".css";
      // Revalidate app code on each load (cheap 304 via ETag) instead of re-downloading it.
      const cacheControl = isDynamicAsset ? "no-cache" : "public, max-age=3600";
      const encoding = COMPRESSIBLE_EXTENSIONS.has(fileExt)
        ? pickEncoding(req.headers["accept-encoding"])
        : null;
      const etag = `W/"${fileStat.size.toString(16)}-${Math.trunc(fileStat.mtimeMs).toString(16)}${encoding ? `-${encoding}` : ""}"`;
      const headers = {
        "Content-Type": contentType,
        "Cache-Control": cacheControl,
        ETag: etag,
        ...(COMPRESSIBLE_EXTENSIONS.has(fileExt) ? { Vary: "Accept-Encoding" } : {}),
      };

      if (req.headers["if-none-match"] === etag) {
        res.writeHead(304, headers);
        res.end();
        return;
      }

      const content = await readFile(filePath);
      const body = encoding
        ? await getEncodedAsset(filePath, fileStat, encoding, content)
        : content;
      res.writeHead(200, {
        ...headers,
        ...(encoding ? { "Content-Encoding": encoding } : {}),
        "Content-Length": body.length,
      });
      res.end(req.method === "HEAD" ? undefined : body);
    } catch {
      sendNotFound();
    }
  };
}

const server = createServer(createRequestHandler());

const PORT = parseInt(process.env.PORT || "3000", 10);

if (process.argv[1] && process.argv[1].endsWith("serve-web.mjs")) {
  // Abandoned drafts and unpublished training results are dropped after the TTL.
  startSoloSessionExpiry(createFileSoloDraftStore(draftSessionsDir), {
    maxAgeMs: soloSessionTtlMs(process.env),
    intervalMs: 6 * 60 * 60 * 1000,
  });
  server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`  DraftMaster — Serveur Web Mobile-First Actif !`);
    if (process.env.SITE_PASSWORD) {
      console.log(`  🔒 Authentification de Guilde active (Passcode requis)`);
    } else {
      console.log(`  🔓 Mode libre (SITE_PASSWORD non défini)`);
    }
    console.log(`  Ouvrez l'application dans votre navigateur :`);
    console.log(`  👉 http://localhost:${PORT}`);
    console.log(`======================================================\n`);
  });
}

export { server };
