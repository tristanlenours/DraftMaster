import { createServer } from "node:http";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, extname, resolve } from "node:path";
import { SoloDraftSession } from "../src/solo-draft/solo-draft-session.ts";
import { getLeaderboard } from "../src/solo-draft/leaderboard.ts";
import {
  getUnifiedLeaderboard,
  getMagiciensProfilesWithStats,
  getDeckShareData,
} from "../src/storage/cloud-leaderboard.ts";
import {
  getPublicSupabaseConfig,
  isSupabaseConfigured,
} from "../src/storage/supabase-client.ts";
import { getAdminDrafts, getAdminDraftById } from "../src/solo-draft/admin-drafts.ts";

try {
  process.loadEnvFile?.();
} catch {
  // .env is optional
}

const rootDir = process.cwd();
const webDir = resolve(rootDir, "src", "web");
const reportsDir = resolve(rootDir, "reports");

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

// In-memory active draft sessions
const activeSessions = new Map();

async function readJsonBody(req) {
  return new Promise((resolveBody, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolveBody(body ? JSON.parse(body) : {});
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
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

export function createRequestHandler() {
  return async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = decodeURIComponent(url.pathname);

    // Permissive CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // ==========================================
    // API ENDPOINTS
    // ==========================================

    // Healthchecks pour Railway et monitoring d'uptime
    if (
      (pathname === "/health" || pathname === "/health/live" || pathname === "/health/ready") &&
      req.method === "GET"
    ) {
      sendJson(res, 200, {
        status: "ok",
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        supabaseConfigured: isSupabaseConfigured(),
      });
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
        const list = await getUnifiedLeaderboard();
        sendJson(res, 200, { ok: true, entries: list });
      } catch (err) {
        sendJson(res, 500, { ok: false, error: err.message });
      }
      return;
    }

    // 2. Draft Reports Directory
    if (pathname === "/api/reports" && req.method === "GET") {
      try {
        const files = await readdir(reportsDir);
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
        const drafts = await getAdminDrafts();
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
        const draft = await getAdminDraftById(draftId);
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

    // 3. Draft Start
    if (pathname === "/api/draft/start" && req.method === "POST") {
      try {
        const body = await readJsonBody(req);
        const playerName = (body.playerName || "").trim();
        if (!playerName) {
          sendJson(res, 400, { ok: false, error: "Le nom du joueur est obligatoire." });
          return;
        }

        const session = await SoloDraftSession.create({
          playerName,
          magicienSlug: body.magicienSlug,
          cubeKey: body.cubeKey || "titou_tribal",
          seed: body.seed,
        });

        activeSessions.set(session.sessionId, session);
        sendJson(res, 200, { ok: true, session: session.getStateDto() });
      } catch (err) {
        sendJson(res, 500, { ok: false, error: err.message });
      }
      return;
    }

    // 4. Draft Pick
    if (pathname === "/api/draft/pick" && req.method === "POST") {
      try {
        const body = await readJsonBody(req);
        if (!body.sessionId || !body.cardInstanceId) {
          sendJson(res, 400, {
            ok: false,
            error: "Les paramètres 'sessionId' et 'cardInstanceId' sont obligatoires.",
          });
          return;
        }

        const session = activeSessions.get(body.sessionId);
        if (!session) {
          sendJson(res, 404, { ok: false, error: "Session de draft introuvable ou expirée." });
          return;
        }

        const nextState = session.makePick(body.cardInstanceId);
        sendJson(res, 200, { ok: true, session: nextState });
      } catch (err) {
        sendJson(res, 400, { ok: false, error: err.message });
      }
      return;
    }

    // 5. Draft Deck Validation & Finalize
    if (pathname === "/api/draft/deck" && req.method === "POST") {
      try {
        const body = await readJsonBody(req);

        if (!body.sessionId || !Array.isArray(body.maindeckCardInstanceIds)) {
          sendJson(res, 400, {
            ok: false,
            error: "Paramètres 'sessionId' et 'maindeckCardInstanceIds' invalides.",
          });
          return;
        }

        const session = activeSessions.get(body.sessionId);
        if (!session) {
          sendJson(res, 404, { ok: false, error: "Session de draft introuvable ou expirée." });
          return;
        }

        const finalResult = await session.buildDeckAndFinalize({
          sessionId: body.sessionId,
          maindeckCardInstanceIds: body.maindeckCardInstanceIds,
          basicLands: body.basicLands,
          publishToLeaderboard: Boolean(body.publishToLeaderboard),
        });

        sendJson(res, 200, { ok: true, result: finalResult });
      } catch (err) {
        sendJson(res, 400, { ok: false, error: err.message });
      }
      return;
    }

    // 5b. Draft Publish (pour inscrire un draft d'entraînement après consultation)
    if (pathname === "/api/draft/publish" && req.method === "POST") {
      try {
        const body = await readJsonBody(req);
        if (!body.sessionId) {
          sendJson(res, 400, { ok: false, error: "Paramètre 'sessionId' manquant." });
          return;
        }

        const session = activeSessions.get(body.sessionId);
        if (!session) {
          sendJson(res, 404, { ok: false, error: "Session de draft introuvable ou expirée." });
          return;
        }

        const publishResult = await session.publishToLeaderboard();
        sendJson(res, 200, { ok: true, result: publishResult });
      } catch (err) {
        sendJson(res, 400, { ok: false, error: err.message });
      }
      return;
    }

    // ==========================================
    // STATIC FILE SERVING
    // ==========================================
    let filePath;
    const ext = extname(pathname).toLowerCase();

    if (pathname.startsWith("/data/")) {
      filePath = join(rootDir, pathname);
    } else if (pathname.startsWith("/reports/")) {
      filePath = join(rootDir, pathname);
    } else if (
      pathname === "/" ||
      pathname === "/index.html" ||
      pathname === "/cards" ||
      pathname === "/cubes" ||
      pathname === "/bots" ||
      pathname === "/home" ||
      pathname === "/draft" ||
      pathname === "/records" ||
      pathname === "/admin" ||
      !ext
    ) {
      filePath = join(webDir, "index.html");
    } else {
      filePath = join(webDir, pathname);
    }

    try {
      const fileStat = await stat(filePath);
      if (fileStat.isDirectory()) {
        filePath = join(filePath, "index.html");
      }

      const content = await readFile(filePath);
      const fileExt = extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[fileExt] || "application/octet-stream";

      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
    }
  };
}

const server = createServer(createRequestHandler());

const PORT = parseInt(process.env.PORT || "3000", 10);

if (process.argv[1] && process.argv[1].endsWith("serve-web.mjs")) {
  server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`  DraftMaster — Serveur Web Mobile-First Actif !`);
    console.log(`  Ouvrez l'application dans votre navigateur :`);
    console.log(`  👉 http://localhost:${PORT}`);
    console.log(`======================================================\n`);
  });
}

export { server };
