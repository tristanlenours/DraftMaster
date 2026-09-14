import { describe, expect, it } from "vitest";
import {
  loadLimitedGradesData,
  runVintageGradesAudit,
  formatAuditCliReport,
  normalizeCardName,
} from "../../../src/cards/audit-vintage-grades.ts";

describe("Vintage Grades Audit (17lands / limitedgrades vs DraftMaster)", () => {
  it("loads 500+ cards from the cached 17lands powered dataset offline", async () => {
    const data = await loadLimitedGradesData({ offline: true });
    expect(data).toBeDefined();
    expect(data.cardCount).toBeGreaterThanOrEqual(500);
    expect(data.cards.length).toBeGreaterThanOrEqual(500);

    const lotus = data.cards.find((c: { name: string }) => c.name === "Black Lotus");
    expect(lotus).toBeDefined();
    expect(lotus?.grade).toBe("A+");
    expect(lotus?.winrate).toBeGreaterThan(60);
  });

  it("normalizes card names consistently for cross-referencing", () => {
    expect(normalizeCardName("Bolas's Citadel")).toBe("bolasscitadel");
    expect(normalizeCardName("Griselbrand")).toBe("griselbrand");
    expect(normalizeCardName("Orcish Bowmasters")).toBe("orcishbowmasters");
  });

  it("identifies Bolas's Citadel, Griselbrand and Yawgmoth's Will as calibrated draft traps (Grade F with fit: 'trap')", async () => {
    const audit = await runVintageGradesAudit({
      cubeKey: "nico_candyshop",
      offline: true,
    });

    expect(audit.totalCardsCompared).toBeGreaterThan(300);

    // Bolas's Citadel must be flagged in knownCalibratedTraps
    const citadel = audit.knownCalibratedTraps.find(
      (c: { name: string }) => c.name === "Bolas's Citadel",
    );
    expect(citadel, "Bolas's Citadel must be flagged as known calibrated trap").toBeDefined();
    expect(citadel?.grade).toBe("F");
    expect(citadel?.tier).toBe("C");
    expect(citadel?.fit).toBe("trap");
    expect(citadel?.powerScore).toBeLessThanOrEqual(15);

    // Griselbrand must be flagged in knownCalibratedTraps
    const grisel = audit.knownCalibratedTraps.find(
      (c: { name: string }) => c.name === "Griselbrand",
    );
    expect(grisel, "Griselbrand must be flagged as known calibrated trap").toBeDefined();
    expect(grisel?.grade).toBe("F");
    expect(grisel?.tier).toBe("C");
    expect(grisel?.fit).toBe("trap");
    expect(grisel?.powerScore).toBe(25);

    // Yawgmoth's Will must be flagged in knownCalibratedTraps
    const yawg = audit.knownCalibratedTraps.find(
      (c: { name: string }) => c.name === "Yawgmoth's Will",
    );
    expect(yawg, "Yawgmoth's Will must be flagged as known calibrated trap").toBeDefined();
    expect(yawg?.grade).toBe("F");
    expect(yawg?.tier).toBe("C");
    expect(yawg?.fit).toBe("trap");
    expect(yawg?.powerScore).toBeLessThanOrEqual(15);
  });

  it("detects remaining uncalibrated overrated cards like Vaultborn Tyrant (Grade D- in Tier S)", async () => {
    const audit = await runVintageGradesAudit({
      cubeKey: "nico_candyshop",
      offline: true,
    });

    const tyrant = audit.criticalOverrated.find(
      (c: { name: string }) => c.name === "Vaultborn Tyrant",
    );
    expect(tyrant, "Vaultborn Tyrant should be detected as uncalibrated overrated").toBeDefined();
    expect(tyrant?.tier).toBe("S");
    expect(tyrant?.grade).toBe("D-");
  });

  it("confirms Orcish Bowmasters is recognized as an aligned top staple (Grade A+ and Tier S)", async () => {
    const audit = await runVintageGradesAudit({
      cubeKey: "nico_candyshop",
      offline: true,
    });

    const bowmasters = audit.alignedTopStaples.find(
      (c: { name: string }) => c.name === "Orcish Bowmasters",
    );
    expect(bowmasters, "Orcish Bowmasters must be in alignedTopStaples").toBeDefined();
    expect(bowmasters?.grade).toBe("A+");
    expect(bowmasters?.tier).toBe("S");
    expect(bowmasters?.powerScore).toBe(49);
  });

  it("formats a comprehensive and human-readable CLI report with alerts and actions", async () => {
    const audit = await runVintageGradesAudit({
      cubeKey: "nico_candyshop",
      offline: true,
    });

    const report = formatAuditCliReport(audit);
    expect(report).toContain("AUDIT DE COHÉRENCE VINTAGE CUBE");
    expect(report).toContain("PIÈGES DE DRAFT CONFIRMÉS ET CALIBRÉS");
    expect(report).toContain("Bolas's Citadel");
    expect(report).toContain("Griselbrand");
    expect(report).toContain("VAULTBORN TYRANT");
    expect(report).toContain("EXEMPLES DE STAPLES PARFAITEMENT ALIGNÉS");
  });
});
