import { describe, expect, it } from "vitest";
import { runDetailedDraftSimulation } from "../../../src/simulation/detailed-simulation.ts";
import { generateDetailedDraftHtml } from "../../../src/simulation/html-report-generator.ts";

describe("HTML Report Generator (Option A)", () => {
  it("produces a valid standalone HTML document containing the embedded report data and interactive controls", async () => {
    const result = await runDetailedDraftSimulation({ seed: 42 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const html = generateDetailedDraftHtml(result.value);

    // Basic document structure
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('<html lang="fr">');
    expect(html).toContain("Titou's Tribal and Chromatic Cube");
    expect(html).toContain("Seed: 42");

    // Embedded JSON script tag
    expect(html).toContain('<script id="draft-data" type="application/json">');
    expect(html).toContain("schemaVersion");

    // Navigation and tabs
    expect(html).toContain("Table des 8 Bots");
    expect(html).toContain("Parcours 17Lands (45 Écrans)");
    expect(html).toContain("Fil du draft (45 Tours)");
    expect(html).toContain("Deck Final (23 Cartes)");
    expect(html).toContain("360 Cartes (24 Boosters)");

    // Interactive elements & sticky/floating navigation
    expect(html).toContain("stepper-sticky-bar");
    expect(html).toContain("floating-nav-pill");
    expect(html).toContain("side-nav-btn");
    expect(html).toContain("btn-pack-1");
    expect(html).toContain("btn-pack-2");
    expect(html).toContain("btn-pack-3");
    expect(html).toContain("banner-justification");
    expect(html).toContain("banner-policy-score");
    expect(html).toContain("banner-probability");
    expect(html).toContain("decision-proof");
    expect(html).toContain("Biais appliqués");
    expect(html).toContain("Tirage déterministe");
    expect(html).toContain("renderTimeline");
    expect(html).toContain("timeline-decisions-grid");
    expect(html).toContain("Séquence journal");
    expect(html).toContain("deck-curve-columns");
    expect(html).toContain("Audit du Score de deck");
    expect(html).toContain("Contributions pondérées");
    expect(html).toContain('id="deck-axe-curve"');
    expect(html).toContain('id="deck-axe-mana"');
    expect(html).toContain('id="deck-axe-interaction"');
    expect(html).toContain("deck-audit-power");
    expect(html).toContain("deck-audit-synergy");
    expect(html).toContain("deck-audit-mana");
    expect(html).toContain("deck-audit-interaction");
    expect(html).toContain("Cartes clés × 3");
    expect(html).toContain("Familles de rôles :");
    expect(html).toContain("Référentiel :");
    expect(html).toContain("Fixeurs :");
    expect(html).toContain("Sources requises :");
    expect(html).toContain("selectedSeatId: 7");

    // All 8 bots present in the report
    for (const seat of result.value.seats) {
      expect(html).toContain(seat.botName);
    }
    for (const seat of result.value.seats) {
      expect(seat.finalDeck.audit.formulaVersion).toBe("deck-evaluation@5");
      expect(seat.finalDeck.audit.power.bombThreshold).toBe(
        result.value.bombDefinition.cutoffScore,
      );
      expect(seat.finalDeck.audit.contributions).toHaveLength(5);
    }
    expect(html).toContain("Le Rockeur");
    expect(html).not.toContain('botName":"Tristan"');
  }, 15000);
});
