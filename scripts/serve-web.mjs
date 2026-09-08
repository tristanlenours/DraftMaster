import { createServer } from "node:http";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, extname, resolve } from "node:path";
import { createHmac, timingSafeEqual } from "node:crypto";
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
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
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
  const adminDraftsPath = options.adminDraftsPath;
  const leaderboardPath = options.leaderboardPath;

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
    // EXEMPT PUBLIC ENDPOINTS (Health & Auth)
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
            "Access-Control-Allow-Origin": "*",
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
        "Access-Control-Allow-Origin": "*",
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
        }, {
          customReportsDir: handlerReportsDir,
          reportsUrlPrefix: "/reports",
          customAdminDraftsPath: adminDraftsPath,
          customLeaderboardPath: leaderboardPath,
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

        const publishResult = await session.publishToLeaderboard(leaderboardPath);
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
      filePath = join(handlerReportsDir, pathname.slice("/reports/".length));
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
