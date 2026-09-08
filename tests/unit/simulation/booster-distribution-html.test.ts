import { describe, expect, it } from "vitest";
import { runDetailedDraftSimulation } from "../../../src/simulation/detailed-simulation.ts";
import { generateBoosterDistributionHtml } from "../../../src/simulation/booster-distribution-html.ts";

describe("Booster Distribution HTML Report Generator", () => {
  it("produces a valid standalone HTML document showing all 360 cards in 24 boosters across 3 rounds", async () => {
    const result = await runDetailedDraftSimulation({ seed: 42 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const html = generateBoosterDistributionHtml(result.value);

    // Basic document structure
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Titou&#039;s Tribal and Chromatic Cube");
    expect(html).toContain("Seed: 42");
    expect(html).toContain("24 Boosters");
    expect(html).toContain("360 Cartes");

    // Link back to 17Lands report
    expect(html).toContain("Voir le Parcours 17Lands & Decks");
    expect(html).toContain("draft-titou-seed-42.html");

    // Embedded JSON data
    expect(html).toContain('<script id="draft-data" type="application/json">');
    expect(html).toContain("initialBoosters");

    // Interactive filter controls
    expect(html).toContain("Tous les 24 Paquets");
    expect(html).toContain("Tour 1 (Packs 1 à 8)");
    expect(html).toContain("Tour 2 (Packs 9 à 16)");
    expect(html).toContain("Tour 3 (Packs 17 à 24)");
    expect(html).toContain("search-input");
    expect(html).toContain("seat-filter-chips");
    expect(html).toContain("👑 Titou");

    // Global Stats summary
    expect(html).toContain("Total des Cartes Dealt");
    expect(html).toContain("360");
    expect(html).toContain("Répartition par Couleur");
    expect(html).toContain("Courbe de Mana (CMC)");
    expect(html).toContain("Bombes — Top 5 % du Cube");
    expect(html).toContain("21 bombes distribuées");
    expect(html).toContain("0,88 par booster");
    expect(html).toContain("9 boosters sans bombe");
    expect(html).toContain("bomb-ribbon");
    expect(html).toContain("Le Rockeur");
    expect(html).not.toContain(">Tristan</button>");

    // This report describes the opening only. Decisions belong to the draft timeline.
    expect(html).not.toContain("P1 PICK");
    expect(html).not.toContain("p1PickCardInstanceId");
    expect(html).not.toContain("p1PickCardName");

    // Booster elements rendered by client script
    expect(html).toContain("ALL_BOOSTERS = DRAFT_DATA.initialBoosters");
    expect(html).toContain("setRoundFilter");
    expect(html).toContain("setSeatFilter");
    expect(html).toContain("onSearchInput");
  }, 15000);
});
