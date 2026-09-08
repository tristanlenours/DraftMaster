import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createRequestHandler } from "../../scripts/serve-web.mjs";

describe("Web Navigation & Mobile Target QA", () => {
  const rootDir = process.cwd();
  const htmlPath = resolve(rootDir, "src", "web", "index.html");
  const cssPath = resolve(rootDir, "src", "web", "styles.css");
  const jsPath = resolve(rootDir, "src", "web", "app.js");

  let htmlContent: string;
  let cssContent: string;
  let jsContent: string;

  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    [htmlContent, cssContent, jsContent] = await Promise.all([
      readFile(htmlPath, "utf-8"),
      readFile(cssPath, "utf-8"),
      readFile(jsPath, "utf-8"),
    ]);

    const handler = createRequestHandler();
    server = createServer(handler);
    await new Promise<void>((resolvePromise) => {
      server.listen(0, () => {
        resolvePromise();
      });
    });
    const addr = server.address() as AddressInfo;
    baseUrl = `http://localhost:${String(addr.port)}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolvePromise, rejectPromise) => {
      server.close((err) => {
        if (err) rejectPromise(err);
        else resolvePromise();
      });
    });
  });

  describe("HTML Structure & Mobile Navigation Accessibility", () => {
    it("configures responsive viewport meta tag with viewport-fit=cover", () => {
      expect(htmlContent).toMatch(
        /<meta[^>]*name=["']viewport["'][^>]*content=["'][^"']*width=device-width[^"']*viewport-fit=cover/i,
      );
    });

    it("declares the site header and brand element with accessible home link", () => {
      expect(htmlContent).toContain('class="site-header"');
      expect(htmlContent).toContain('id="brand-home-btn"');
      expect(htmlContent).toContain('class="brand-badge"');
      expect(htmlContent).toContain('class="brand-title"');
      expect(htmlContent).toContain('class="brand-tagline"');
    });

    it("declares desktop navigation tabs for all 8 SPA views (including multi and tournaments teasers)", () => {
      const views = ["home", "cubes", "cards", "bots", "draft", "records", "multi", "tournaments"];
      for (const view of views) {
        expect(htmlContent).toContain(`id="nav-btn-${view}"`);
        expect(htmlContent).toContain(`data-view="${view}"`);
      }
      expect(htmlContent).toContain('class="nav-badge-soon"');
    });

    it("declares mobile hamburger button with accessible ARIA contract and bars", () => {
      expect(htmlContent).toContain('id="mobile-menu-btn"');
      expect(htmlContent).toContain('aria-controls="mobile-nav-drawer"');
      expect(htmlContent).toContain('aria-expanded="false"');
      expect(htmlContent).toContain('aria-label="Ouvrir le menu de navigation"');

      const barMatches = htmlContent.match(/class=["']hamburger-bar["']/g);
      expect(barMatches).not.toBeNull();
      expect(barMatches?.length).toBe(3);
    });

    it("declares mobile navigation drawer with touch targets for all 8 views", () => {
      expect(htmlContent).toContain('id="mobile-nav-drawer"');
      expect(htmlContent).toContain('class="mobile-nav-drawer"');
      expect(htmlContent).toContain('aria-label="Navigation mobile"');

      const mobileViews = [
        "home",
        "cubes",
        "cards",
        "bots",
        "draft",
        "records",
        "multi",
        "tournaments",
      ];
      for (const view of mobileViews) {
        expect(htmlContent).toContain(`id="mobile-nav-${view}"`);
        expect(htmlContent).toContain(`data-view="${view}"`);
      }

      expect(htmlContent).toContain('id="mobile-nav-backdrop"');
    });

    it("declares dedicated teaser presentation views and home teaser cards for multi and tournaments", () => {
      expect(htmlContent).toContain('id="view-multi"');
      expect(htmlContent).toContain('id="view-tournaments"');
      expect(htmlContent).toContain('class="home-teaser-section"');
      expect(htmlContent).toContain('id="home-cta-multi"');
      expect(htmlContent).toContain('id="home-cta-tournaments"');
      expect(htmlContent).toContain('class="mystery-coming-soon-banner"');
    });

    it("declares both desktop tier matrix and mobile LimitedGrades tier container in view-cards", () => {
      expect(htmlContent).toContain('id="tier-matrix"');
      expect(htmlContent).toContain('id="mobile-tier-list"');
      expect(htmlContent).toContain('id="matrix-tbody"');
    });

    it("declares mobile view controls (mode toggle, cube selector pills) and mobile synthetic cube cards in view-cubes", () => {
      expect(htmlContent).toContain('id="cubes-mobile-controls"');
      expect(htmlContent).toContain('id="btn-cubes-mode-cards"');
      expect(htmlContent).toContain('id="btn-cubes-mode-table"');
      expect(htmlContent).toContain('id="cubes-mobile-pill-bar"');
      expect(htmlContent).toContain('id="cubes-mobile-cards-view"');
      expect(htmlContent).toContain('data-pill-cube="titou_tribal"');
      expect(htmlContent).toContain('data-pill-cube="nico_candyshop"');
      expect(htmlContent).toContain('data-pill-cube="hugues_pauper"');
      expect(htmlContent).toContain('data-pill-cube="cedric_cube"');
      expect(htmlContent).toContain('data-pill-cube="titou_arena_peasant_plus"');
    });
  });

  describe("CSS Responsiveness & Mobile Target Guarantees", () => {
    it("enforces overflow containment on site-header to prevent horizontal cutoff", () => {
      expect(cssContent).toContain(".site-header");
      expect(cssContent).toMatch(/overflow-x:\s*clip/);
    });

    it("hides verbose brand tagline on mobile to keep header compact", () => {
      expect(cssContent).toMatch(
        /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.brand-tagline\s*\{[\s\S]*?display:\s*none;/,
      );
    });

    it("hides desktop horizontal tabs and displays mobile menu button on mobile", () => {
      expect(cssContent).toMatch(
        /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.site-nav\s*\{[\s\S]*?display:\s*none;/,
      );
      expect(cssContent).toMatch(
        /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.mobile-menu-btn\s*\{[\s\S]*?display:\s*flex;/,
      );
    });

    it("switches from desktop table matrix to mobile LimitedGrades list on mobile", () => {
      expect(cssContent).toMatch(
        /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.matrix-table-wrapper\s*\{[\s\S]*?display:\s*none;/,
      );
      expect(cssContent).toMatch(
        /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.mobile-tier-list\s*\{[\s\S]*?display:\s*flex;/,
      );
    });

    it("styles LimitedGrades mobile components (tier header, color groups, left badge, card rows)", () => {
      expect(cssContent).toContain(".lg-tier-section");
      expect(cssContent).toContain(".lg-tier-header");
      expect(cssContent).toContain(".lg-tier-title");
      expect(cssContent).toContain(".lg-color-group");
      expect(cssContent).toContain(".lg-color-badge-col");
      expect(cssContent).toContain(".lg-mana-symbol-wrap");
      expect(cssContent).toContain(".lg-cards-list");
      expect(cssContent).toContain(".lg-card-row");
      expect(cssContent).toContain(".lg-card-tick");
      expect(cssContent).toContain(".lg-card-name");
      expect(cssContent).toContain(".lg-card-score");
    });

    it("defines left border accent stripes for all 7 MTG identities in LimitedGrades mobile view", () => {
      const colorKeys = ["w", "u", "b", "r", "g", "multi", "c"];
      for (const color of colorKeys) {
        expect(cssContent).toContain(`.lg-color-group.color-${color} .lg-color-badge-col`);
      }
    });

    it("arranges the card explorer controls bar into a responsive grid on mobile", () => {
      expect(cssContent).toMatch(
        /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.controls-bar-inner\s*\{[\s\S]*?display:\s*grid;/,
      );
    });

    it("styles coming soon teaser elements (nav-badge-soon, home teasers, mystery banner)", () => {
      expect(cssContent).toContain(".nav-badge-soon");
      expect(cssContent).toContain(".home-teaser-section");
      expect(cssContent).toContain(".home-teaser-card");
      expect(cssContent).toContain(".mystery-coming-soon-banner");
      expect(cssContent).toContain(".teaser-feature-card");
    });

    it("enforces responsive styles for cubes view: mobile pill bar, card view, sticky table column, and 1fr grids on mobile", () => {
      expect(cssContent).toContain(".cubes-mobile-controls");
      expect(cssContent).toContain(".cubes-mobile-pill-bar");
      expect(cssContent).toContain(".cube-mobile-synth-card");
      expect(cssContent).toContain(".cubes-table-scroll-hint");
      expect(cssContent).toMatch(
        /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.cubes-comparison-table\s+th\.col-cube-feature[\s\S]*?position:\s*sticky/,
      );
      expect(cssContent).toMatch(
        /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.archetypes-cards-grid\s*\{[\s\S]*?grid-template-columns:\s*1fr/,
      );
    });
  });

  describe("Client Logic & Mobile Invariants", () => {
    it("defines inline SVGs for all 7 mana identities", () => {
      const expectedIdentities = ["W", "U", "B", "R", "G", "MULTI", "COLORLESS"];
      for (const identity of expectedIdentities) {
        expect(jsContent).toMatch(new RegExp(`${identity}:\\s*\`<svg`));
      }
    });

    it("implements mobile cube selector synchronization and cards/table mode toggle in cubes view", () => {
      expect(jsContent).toContain("btnCubesModeCards");
      expect(jsContent).toContain("btnCubesModeTable");
      expect(jsContent).toContain("pillCube");
      expect(jsContent).toContain("cube-mobile-synth-card");
    });

    it("implements mobile nav drawer toggling and closing functions", () => {
      expect(jsContent).toContain("function toggleMobileNav");
      expect(jsContent).toContain("function closeMobileNav");
      expect(jsContent).toContain("aria-expanded");
      expect(jsContent).toContain("Escape");
    });

    it("synchronizes active navigation state on both desktop tabs and mobile drawer items for all 8 views", () => {
      const navKeys = [
        "Home",
        "Cubes",
        "Cards",
        "Bots",
        "Draft",
        "Records",
        "Multi",
        "Tournaments",
      ];
      for (const key of navKeys) {
        expect(jsContent).toContain(`elements.navBtn${key}?.classList.toggle("active"`);
        expect(jsContent).toContain(`elements.mobileNav${key}?.classList.toggle("active"`);
      }
    });

    it("implements LimitedGrades mobile rendering functions in renderMatrix", () => {
      expect(jsContent).toContain("createLimitedGradesMobileTierSection");
      expect(jsContent).toContain("createLimitedGradesCardRow");
      expect(jsContent).toContain("lg-color-group");
      expect(jsContent).toContain("lg-color-badge-col");
      expect(jsContent).toContain("lg-cards-list");
      expect(jsContent).toContain("lg-card-row");
    });
  });

  describe("HTTP Web Server Asset Delivery", () => {
    it("serves HTML root / with 200 OK and includes mobile navigation elements", async () => {
      const res = await fetch(`${baseUrl}/`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/html");
      const text = await res.text();
      expect(text).toContain('id="mobile-menu-btn"');
      expect(text).toContain('id="mobile-nav-drawer"');
    });

    it("serves styles.css with 200 OK and includes mobile media queries", async () => {
      const res = await fetch(`${baseUrl}/styles.css`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/css");
      const text = await res.text();
      expect(text).toContain(".mobile-menu-btn");
      expect(text).toContain(".mobile-nav-drawer");
      expect(text).toContain(".lg-color-group");
    });

    it("serves app.js with 200 OK and includes mobile drawer management", async () => {
      const res = await fetch(`${baseUrl}/app.js`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/javascript");
      const text = await res.text();
      expect(text).toContain("toggleMobileNav");
      expect(text).toContain("createLimitedGradesMobileTierSection");
    });
  });
});
