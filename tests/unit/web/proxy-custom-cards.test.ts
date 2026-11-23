import { describe, expect, it } from "vitest";
import {
  MAX_CUSTOM_QUANTITY,
  computeCardCrop,
  createCustomCardDraft,
  deriveColorsFromManaCost,
  estimateCustomCardDpi,
  estimatePrintDpi,
  normalizeCustomCard,
  parseManaCostInput,
  toFrenchText,
  toRenderCard,
} from "../../../src/web/proxy-custom-cards.js";

describe("parseManaCostInput", () => {
  it("accepts brace and shorthand notations", () => {
    expect(parseManaCostInput("{2}{u}{U}")).toBe("{2}{U}{U}");
    expect(parseManaCostInput("2UU")).toBe("{2}{U}{U}");
    expect(parseManaCostInput("x r r")).toBe("{X}{R}{R}");
    expect(parseManaCostInput("10G")).toBe("{10}{G}");
    expect(parseManaCostInput("{W/U}{2/b}")).toBe("{W/U}{2/B}");
  });

  it("drops characters that are not mana symbols", () => {
    expect(parseManaCostInput("1 + K")).toBe("{1}");
    expect(parseManaCostInput("")).toBe("");
  });
});

describe("deriveColorsFromManaCost", () => {
  it("returns colours in WUBRG order, hybrids counting for both sides", () => {
    expect(deriveColorsFromManaCost("{G}{1}{W}")).toEqual(["W", "G"]);
    expect(deriveColorsFromManaCost("{B/R}{2/U}")).toEqual(["U", "B", "R"]);
    expect(deriveColorsFromManaCost("{3}")).toEqual([]);
  });
});

describe("normalizeCustomCard", () => {
  const now = new Date("2026-11-23T12:00:00.000Z");

  it("canonicalizes a valid creature", () => {
    const result = normalizeCustomCard(
      {
        id: "custom-1",
        mode: "art",
        name: "  Dragon des cimes ",
        manaCost: "4rr",
        typeLine: "Créature : dragon",
        rulesText: "Vol\r\nCélérité  ",
        power: "5",
        toughness: "5",
        quantity: "3",
      },
      now,
    );
    expect(result.ok).toBe(true);
    expect(result.card).toMatchObject({
      id: "custom-1",
      mode: "art",
      name: "Dragon des cimes",
      manaCost: "{4}{R}{R}",
      rulesText: "Vol\nCélérité",
      power: "5",
      toughness: "5",
      quantity: 3,
      updatedAt: "2026-11-23T12:00:00.000Z",
    });
  });

  it("rejects a card without name or type and half-filled P/T", () => {
    const result = normalizeCustomCard({ name: "", typeLine: "", power: "2" }, now);
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(3);
  });

  it("clamps the quantity and falls back to scan mode", () => {
    const high = normalizeCustomCard({ name: "A", typeLine: "Rituel", quantity: 99, mode: "?" });
    expect(high.card.quantity).toBe(MAX_CUSTOM_QUANTITY);
    expect(high.card.mode).toBe("scan");
    expect(normalizeCustomCard({ name: "A", typeLine: "Rituel", quantity: -4 }).card.quantity).toBe(
      0,
    );
  });

  it("ignores malformed power/toughness", () => {
    const result = normalizeCustomCard({
      name: "A",
      typeLine: "Créature",
      power: "<b>",
      toughness: "1",
    });
    expect(result.card.power).toBe("");
    expect(result.ok).toBe(false);
  });
});

describe("render adapters", () => {
  it("maps a custom card to renderer facts and French text", () => {
    const card = {
      ...createCustomCardDraft("custom-9"),
      name: "Golem de verre",
      manaCost: "{3}",
      typeLine: "Créature-artefact : golem",
      rulesText: "Défenseur",
      power: "0",
      toughness: "6",
    };
    expect(toRenderCard(card)).toMatchObject({
      oracleId: "custom-9",
      colors: [],
      types: ["Artifact"],
      isLand: false,
      power: "0",
      toughness: "6",
    });
    expect(toFrenchText(card)).toMatchObject({ name: "Golem de verre", source: "custom" });
  });
});

describe("computeCardCrop", () => {
  it("keeps an exact 63:88 image whole", () => {
    expect(computeCardCrop(745, 1040)).toEqual({ x: 0, y: 0, width: 745, height: 1040 });
  });

  it("centre-crops a landscape illustration to the card ratio", () => {
    const crop = computeCardCrop(1600, 900);
    expect(crop.height).toBe(900);
    expect(crop.width).toBe(Math.round((900 * 63) / 88));
    expect(crop.x).toBe(Math.round((1600 - (900 * 63) / 88) / 2));
  });

  it("trims MPC bleed (1/8 inch) before cropping", () => {
    // MPC 1200 DPI renders are 69.35 x 94.35 mm.
    const width = Math.round((69.35 / 25.4) * 1200);
    const height = Math.round((94.35 / 25.4) * 1200);
    const crop = computeCardCrop(width, height, { hasBleed: true });
    expect(crop.x).toBe(150);
    expect(crop.y).toBe(150);
    expect(estimatePrintDpi(crop.width)).toBeGreaterThanOrEqual(1199);
  });
});

describe("estimateCustomCardDpi", () => {
  it("measures a full card visual over the 63 mm card width", () => {
    expect(estimateCustomCardDpi(745, 1040, { mode: "scan" })).toBe(300);
  });

  it("measures an illustration over the frame's art window, not the whole card", () => {
    // Scryfall art crops are 626x457: ~293 DPI in the 54 mm art window.
    expect(estimateCustomCardDpi(626, 457, { mode: "art" })).toBe(293);
    expect(estimateCustomCardDpi(626, 457, { mode: "art" })).toBeGreaterThan(
      estimatePrintDpi(computeCardCrop(626, 457).width),
    );
  });
});
