import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createRequestHandler } from "../../scripts/serve-web.mjs";
import type { CubeSuggestionsReport } from "../../src/cards/cube-upgrade-advisor.ts";

describe("Cube Upgrade Advisor & AI Maybeboard Integration", () => {
  const rootDir = process.cwd();
  const htmlPath = resolve(rootDir, "src", "web", "index.html");
  const cssPath = resolve(rootDir, "src", "web", "styles.css");
  const jsPath = resolve(rootDir, "src", "web", "app.js");

  let htmlContent: string;
  let cssContent: string;
  let jsContent: string;

  let server: Server;
  let baseUrl: string;

  const cubeKeys = [
    "titou_tribal",
    "nico_candyshop",
    "hugues_pauper",
    "cedric_cube",
    "titou_arena_peasant_plus",
  ];

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

  describe("Precomputed Artifacts & Data Integrity", () => {
    for (const cubeKey of cubeKeys) {
      it(`has a precomputed cube-suggestions.json for ${cubeKey}`, async () => {
        const filePath = resolve(rootDir, "data", "cubes", cubeKey, "cube-suggestions.json");
        expect(existsSync(filePath)).toBe(true);

        const raw = await readFile(filePath, "utf-8");
        const data = JSON.parse(raw) as CubeSuggestionsReport;
        expect(data.schemaVersion).toBe(1);
        expect(data.cubeKey).toBe(cubeKey);
        expect(data.stats.totalUpgrades).toBeGreaterThan(0);
        expect(data.stats.totalMaybeboard).toBeGreaterThan(0);
        expect(typeof data.upgrades).toBe("object");
        expect(Array.isArray(data.maybeboard)).toBe(true);
      });
    }

    it("verifies quality of 1-to-1 upgrades in titou_tribal", async () => {
      const filePath = resolve(rootDir, "data", "cubes", "titou_tribal", "cube-suggestions.json");
      const raw = await readFile(filePath, "utf-8");
      const data = JSON.parse(raw) as CubeSuggestionsReport;

      // Verify at least one proposal
      const upgradeNames = Object.keys(data.upgrades);
      expect(upgradeNames.length).toBeGreaterThan(50);

      const sampleKey = upgradeNames[0];
      expect(sampleKey).toBeDefined();
      if (!sampleKey) throw new Error("Expected at least one upgrade key");
      const sample = data.upgrades[sampleKey];
      expect(sample).toBeDefined();
      if (!sample) throw new Error("Expected sample to be defined");
      expect(sample.targetCard.name).toBeDefined();
      expect(sample.suggestedCard.name).toBeDefined();
      expect(sample.scoreDelta).toBeGreaterThanOrEqual(5.0);
      expect(sample.reason).toBeTruthy();
      expect(sample.metaAddedValue).toBeDefined();
      expect(sample.metaAddedValue.strategicRole).toBeTruthy();
      expect(sample.metaAddedValue.summary).toBeTruthy();
      expect(Array.isArray(sample.metaAddedValue.affectedArchetypes)).toBe(true);
      expect(data.stats.recentUpgradesCount).toBeGreaterThan(0);
      expect(data.stats.benchmarkMatchesCount).toBeGreaterThanOrEqual(0);
    });

    it("verifies quality of AI maybeboard in titou_tribal", async () => {
      const filePath = resolve(rootDir, "data", "cubes", "titou_tribal", "cube-suggestions.json");
      const raw = await readFile(filePath, "utf-8");
      const data = JSON.parse(raw) as CubeSuggestionsReport;

      expect(data.maybeboard.length).toBeGreaterThanOrEqual(20);
      const first = data.maybeboard[0];
      expect(first).toBeDefined();
      if (!first) throw new Error("Expected first maybeboard item");
      expect(first.card.name).toBeDefined();
      expect(first.card.score).toBeGreaterThanOrEqual(25);
      expect(first.role).toMatch(/staple|archetype_payoff|engine|premium_interaction/);
      expect(first.rationale).toBeTruthy();
      expect(first.metaAddedValue).toBeDefined();
      expect(first.metaAddedValue.strategicRole).toBeTruthy();
      expect(first.metaAddedValue.summary).toBeTruthy();
    });

    it("verifies tier alignment between cube and maybeboard for hugues_pauper (Malevolent Rumble is A+)", async () => {
      const filePath = resolve(rootDir, "data", "cubes", "hugues_pauper", "cube-suggestions.json");
      const raw = await readFile(filePath, "utf-8");
      const data = JSON.parse(raw) as CubeSuggestionsReport;

      const rumble = data.maybeboard.find((m) => m.card.name === "Malevolent Rumble");
      expect(rumble).toBeDefined();
      expect(rumble?.card.score).toBe(42);
      expect(rumble?.card.tier).toBe("A+");

      const troll = data.maybeboard.find((m) => m.card.name === "Troll of Khazad-dûm");
      expect(troll).toBeDefined();
      expect(troll?.card.score).toBe(36);
      expect(troll?.card.tier).toBe("A+");
    });
  });

  describe("HTTP Static Server Delivery", () => {
    it("serves cube-suggestions.json via HTTP with 200 OK and application/json", async () => {
      const res = await fetch(`${baseUrl}/data/cubes/titou_tribal/cube-suggestions.json`);
      expect(res.status).toBe(200);
      const contentType = res.headers.get("content-type");
      expect(contentType).toContain("application/json");

      const body = (await res.json()) as CubeSuggestionsReport;
      expect(body.cubeKey).toBe("titou_tribal");
      expect(body.stats.totalUpgrades).toBeGreaterThan(0);
      expect(body.stats.recentUpgradesCount).toBeGreaterThan(0);
    });
  });

  describe("Web UI DOM Structure & Controls", () => {
    it("declares the upgrade filter button with accessible markup", () => {
      expect(htmlContent).toContain('id="upgrade-filter-btn"');
      expect(htmlContent).toContain('class="action-btn pill-btn"');
      expect(htmlContent).toContain("Mises à niveau");
    });

    it("declares the view mode toggle buttons for Cube vs Maybeboard", () => {
      expect(htmlContent).toContain('id="cards-view-mode-group"');
      expect(htmlContent).toContain('id="btn-view-cube-cards"');
      expect(htmlContent).toContain('id="btn-view-maybeboard"');
      expect(htmlContent).toContain("Maybeboard IA & Tendances");
    });

    it("declares the educational upgrade proposal comparison section in card modal", () => {
      expect(htmlContent).toContain('id="modal-upgrade-section"');
      expect(htmlContent).toContain('id="modal-upgrade-card"');
      expect(htmlContent).toContain('id="modal-upgrade-badges-row"');
      expect(htmlContent).toContain('id="modal-upgrade-recency-pill"');
      expect(htmlContent).toContain('id="modal-upgrade-benchmark-pill"');
      expect(htmlContent).toContain('id="modal-upgrade-curr-pane"');
      expect(htmlContent).toContain('id="modal-upgrade-curr-status"');
      expect(htmlContent).toContain('id="modal-upgrade-curr-name"');
      expect(htmlContent).toContain('id="modal-upgrade-curr-score"');
      expect(htmlContent).toContain('id="modal-btn-swap-arrow"');
      expect(htmlContent).toContain('id="modal-upgrade-sugg-pane"');
      expect(htmlContent).toContain('id="modal-upgrade-sugg-status"');
      expect(htmlContent).toContain('id="modal-upgrade-sugg-name"');
      expect(htmlContent).toContain('id="modal-upgrade-sugg-score"');
      expect(htmlContent).toContain('id="modal-upgrade-multi-targets-wrap"');
      expect(htmlContent).toContain('id="modal-upgrade-multi-targets-chips"');
      expect(htmlContent).toContain('id="modal-upgrade-delta"');
      expect(htmlContent).toContain('id="modal-upgrade-reason"');
      expect(htmlContent).toContain('id="modal-upgrade-meta-box"');
      expect(htmlContent).toContain('id="modal-upgrade-strategic-role"');
      expect(htmlContent).toContain('id="modal-upgrade-meta-summary"');
      expect(htmlContent).toContain('id="modal-upgrade-archetypes-chips"');
      expect(htmlContent).toContain('id="modal-btn-inspect-upgrade"');
    });

    it("declares styles for the upgrade badge, button active state, and modal card", () => {
      expect(cssContent).toContain(".card-upgrade-badge");
      expect(cssContent).toContain("#upgrade-filter-btn.active");
      expect(cssContent).toContain(".view-mode-toggle");
      expect(cssContent).toContain(".view-mode-btn.active");
      expect(cssContent).toContain(".upgrade-advisor-section");
      expect(cssContent).toContain(".upgrade-badges-row");
      expect(cssContent).toContain(".upgrade-recency-pill");
      expect(cssContent).toContain(".upgrade-benchmark-pill");
      expect(cssContent).toContain(".upgrade-proposal-grid");
      expect(cssContent).toContain(".upgrade-current-pane");
      expect(cssContent).toContain(".upgrade-target-pane");
      expect(cssContent).toContain(".btn-swap-arrow");
      expect(cssContent).toContain(".pane-status-pill");
      expect(cssContent).toContain(".upgrade-multi-targets-wrap");
      expect(cssContent).toContain(".btn-target-chip");
      expect(cssContent).toContain(".upgrade-delta-badge");
      expect(cssContent).toContain(".upgrade-meta-added-value-box");
      expect(cssContent).toContain(".meta-box-role");
      expect(cssContent).toContain(".meta-box-summary");
      expect(cssContent).toContain(".meta-arch-chip");
      expect(cssContent).toContain(".btn-inspect-upgrade");
    });

    it("wires up suggestions data loading and badge rendering in app.js", () => {
      expect(jsContent).toContain("cube-suggestions.json");
      expect(jsContent).toContain("cubesSuggestions");
      expect(jsContent).toContain("card-upgrade-badge");
      expect(jsContent).toContain("onlyUpgrades");
      expect(jsContent).toContain("modalUpgradeSection");
      expect(jsContent).toContain("modalUpgradeRecencyPill");
      expect(jsContent).toContain("modalUpgradeBenchmarkPill");
      expect(jsContent).toContain("modalUpgradeMetaBox");
      expect(jsContent).toContain("modalUpgradeStrategicRole");
      expect(jsContent).toContain("modalBtnInspectUpgrade");
      expect(jsContent).toContain("modalUpgradeCurrPane");
      expect(jsContent).toContain("modalUpgradeSuggPane");
      expect(jsContent).toContain("modalBtnSwapArrow");
      expect(jsContent).toContain("modalUpgradeMultiTargetsChips");
      expect(jsContent).toContain("getOrBuildCardObject");
    });

    it("guarantees every upgrade card in titou_tribal is present in maybeboard with replacesCards", async () => {
      const filePath = resolve(rootDir, "data", "cubes", "titou_tribal", "cube-suggestions.json");
      const raw = await readFile(filePath, "utf-8");
      const data = JSON.parse(raw) as CubeSuggestionsReport;

      const upgradeSuggestedNames = new Set(
        Object.values(data.upgrades).map((u) => u.suggestedCard.name),
      );
      const maybeNames = new Set(data.maybeboard.map((m) => m.card.name));

      for (const name of upgradeSuggestedNames) {
        expect(maybeNames.has(name)).toBe(true);
        const maybeItem = data.maybeboard.find((m) => m.card.name === name);
        expect(maybeItem?.replacesCards).toBeDefined();
        expect(maybeItem?.replacesCards?.length).toBeGreaterThan(0);
      }
    });

    for (const cubeKey of cubeKeys) {
      it(`guarantees complete mutual exclusion between main cube list and AI maybeboard for ${cubeKey}`, async () => {
        const cubeJsonPath = resolve(rootDir, "data", "cubes", cubeKey, "cube.json");
        const suggestionsPath = resolve(rootDir, "data", "cubes", cubeKey, "cube-suggestions.json");

        const [cubeRaw, suggRaw] = await Promise.all([
          readFile(cubeJsonPath, "utf-8"),
          readFile(suggestionsPath, "utf-8"),
        ]);

        const cubeData = JSON.parse(cubeRaw) as {
          cardIndex: { name: string; oracleId: string }[];
        };
        const suggData = JSON.parse(suggRaw) as CubeSuggestionsReport;

        const mainNames = new Set(cubeData.cardIndex.map((c) => c.name.toLowerCase().trim()));
        const mainOracleIds = new Set(
          cubeData.cardIndex.map((c) => c.oracleId.toLowerCase().trim()),
        );

        const maybeNames = new Set(
          suggData.maybeboard.map((m) => m.card.name.toLowerCase().trim()),
        );
        const maybeOracleIds = new Set(
          suggData.maybeboard.map((m) => m.card.oracleId.toLowerCase().trim()),
        );

        // 1. Check intersection by card name: must be strictly empty
        const nameOverlap: string[] = [];
        for (const name of maybeNames) {
          if (mainNames.has(name)) {
            nameOverlap.push(name);
          }
        }
        expect(nameOverlap).toEqual([]);

        // 2. Check intersection by oracleId: must be strictly empty
        const oracleOverlap: string[] = [];
        for (const oid of maybeOracleIds) {
          if (mainOracleIds.has(oid)) {
            oracleOverlap.push(oid);
          }
        }
        expect(oracleOverlap).toEqual([]);

        // 3. Vice versa: no card in main list is present in AI maybeboard
        const reverseOverlap: string[] = [];
        for (const name of mainNames) {
          if (maybeNames.has(name)) {
            reverseOverlap.push(name);
          }
        }
        expect(reverseOverlap).toEqual([]);

        // 4. Verify 1-to-1 upgrades: targetCard MUST be in main, suggestedCard MUST NOT be in main
        for (const proposal of Object.values(suggData.upgrades)) {
          const targetName = proposal.targetCard.name.toLowerCase().trim();
          const suggName = proposal.suggestedCard.name.toLowerCase().trim();
          const targetOid = proposal.targetCard.oracleId.toLowerCase().trim();
          const suggOid = proposal.suggestedCard.oracleId.toLowerCase().trim();

          expect(mainNames.has(targetName)).toBe(true);
          expect(mainOracleIds.has(targetOid)).toBe(true);

          expect(mainNames.has(suggName)).toBe(false);
          expect(mainOracleIds.has(suggOid)).toBe(false);
        }
      });
    }
  });
});
