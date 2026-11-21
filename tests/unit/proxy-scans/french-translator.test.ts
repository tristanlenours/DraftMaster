import { describe, expect, it } from "vitest";
import {
  extractBestFrenchData,
  translateFallbackRulesText,
  translateTypeLineToFrench,
} from "../../../src/proxy-scans/french-translator.ts";
import type { ScryfallPrint } from "../../../src/proxy-scans/types.ts";

describe("proxy-scans French translator", () => {
  it("translates standard, compound, legendary, and split MTG type lines accurately", () => {
    expect(translateTypeLineToFrench("Instant")).toBe("Éphémère");
    expect(translateTypeLineToFrench("Sorcery")).toBe("Rituel");
    expect(translateTypeLineToFrench("Legendary Creature — Human Wizard")).toBe(
      "Créature légendaire : humain et sorcier",
    );
    expect(translateTypeLineToFrench("Artifact Creature — Construct")).toBe(
      "Créature-artefact : construction",
    );
    expect(translateTypeLineToFrench("Basic Land — Mountain")).toBe("Terrain de base : montagne");
    expect(translateTypeLineToFrench("Snow Creature — Wolf")).toBe("Créature neigeuse : loup");
    expect(translateTypeLineToFrench("Enchantment — Aura")).toBe("Enchantement : aura");
    expect(translateTypeLineToFrench("Creature — Human Wizard // Instant — Adventure")).toBe(
      "Créature : humain et sorcier // Éphémère : aventure",
    );
  });

  it("translates keyword-only lines and canonical short phrases for EN-only cards", () => {
    expect(translateFallbackRulesText("Flying, vigilance, lifelink")).toBe(
      "Vol, Vigilance, Lien de vie",
    );
    expect(translateFallbackRulesText("Target player draws three cards.")).toBe(
      "Le joueur ciblé pioche trois cartes.",
    );
    expect(translateFallbackRulesText("{T}: Add {U}.")).toBe("{T} : Ajoutez {U}.");
  });

  it("extracts the richest official French fields across multiple FR prints and fills missing printed_type_line", () => {
    const prints: ScryfallPrint[] = [
      {
        id: "fr-1",
        lang: "fr",
        name: "Lightning Bolt",
        printed_name: "Foudre",
        type_line: "Instant",
        printed_text: "La Foudre inflige 3 blessures à n'importe quelle cible.",
        set: "msc",
        released_at: "2024-01-01",
        highres_image: true,
      },
      {
        id: "fr-2",
        lang: "fr",
        name: "Lightning Bolt",
        printed_name: "Foudre",
        printed_type_line: "Éphémère",
        printed_text: "La Foudre inflige 3 blessures à n'importe quelle cible.",
        flavor_text: "L'étincelle qui embrase le ciel.",
        set: "m11",
        released_at: "2010-07-16",
        highres_image: false,
      },
    ];

    const result = extractBestFrenchData(prints, {
      oracleId: "4457ed35-7c10-48c8-9776-456485fdf070",
      slug: "lightning-bolt",
      name: "Lightning Bolt",
      typeLine: "Instant",
      oracleText: "Lightning Bolt deals 3 damage to any target.",
    });

    expect(result.source).toBe("official_scryfall_fr");
    expect(result.officialFrenchPrintExists).toBe(true);
    expect(result.name).toBe("Foudre");
    expect(result.typeLine).toBe("Éphémère");
    expect(result.rulesText).toBe("La Foudre inflige 3 blessures à n'importe quelle cible.");
    expect(result.flavorText).toBe("L'étincelle qui embrase le ciel.");
  });

  it("falls back cleanly to translated French type/rules when no French print exists (e.g. Ancestral Recall)", () => {
    const result = extractBestFrenchData([], {
      oracleId: "550c74d4-1fcb-406a-b02a-639a760a4380",
      slug: "ancestral-recall",
      name: "Ancestral Recall",
      typeLine: "Instant",
      oracleText: "Target player draws three cards.",
    });

    expect(result.source).toBe("translated_fallback");
    expect(result.officialFrenchPrintExists).toBe(false);
    expect(result.name).toBe("Ancestral Recall");
    expect(result.typeLine).toBe("Éphémère");
    expect(result.rulesText).toBe("Le joueur ciblé pioche trois cartes.");
  });
});
