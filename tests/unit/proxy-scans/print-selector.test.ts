import { describe, expect, it } from "vitest";
import {
  classifyTreatmentLabel,
  isAllowedScryfallImageUrl,
  isEligiblePaperPrint,
  isMatchingCardPrint,
  selectBestProxyVariants,
} from "../../../src/proxy-scans/print-selector.ts";
import type { ScryfallPrint } from "../../../src/proxy-scans/types.ts";

function makePrint(overrides: Partial<ScryfallPrint>): ScryfallPrint {
  return {
    id: overrides.id ?? "print-1",
    lang: overrides.lang ?? "en",
    name: overrides.name ?? "Lightning Bolt",
    set: overrides.set ?? "m11",
    set_name: overrides.set_name ?? "Magic 2011",
    collector_number: overrides.collector_number ?? "149",
    released_at: overrides.released_at ?? "2022-07-08",
    artist: overrides.artist ?? "Christopher Moeller",
    illustration_id: overrides.illustration_id ?? "illus-classic",
    frame: overrides.frame ?? "2015",
    border_color: overrides.border_color ?? "black",
    highres_image: overrides.highres_image ?? true,
    image_status: overrides.image_status ?? "highres_scan",
    booster: overrides.booster ?? true,
    image_uris: overrides.image_uris ?? {
      png: `https://cards.scryfall.io/png/front/a/b/${overrides.id ?? "print-1"}.png`,
      large: `https://cards.scryfall.io/large/front/a/b/${overrides.id ?? "print-1"}.jpg`,
      art_crop: `https://cards.scryfall.io/art_crop/front/a/b/${overrides.id ?? "print-1"}.jpg`,
    },
    ...overrides,
  };
}

describe("proxy-scans print selector", () => {
  it("selects a high-res official French classic print and a distinct popular alt-art original", () => {
    const prints: ScryfallPrint[] = [
      makePrint({
        id: "en-classic",
        lang: "en",
        set: "2x2",
        illustration_id: "illus-classic",
      }),
      makePrint({
        id: "fr-classic",
        lang: "fr",
        printed_name: "Foudre",
        printed_type_line: "Éphémère",
        printed_text: "La Foudre inflige 3 blessures à n'importe quelle cible.",
        set: "2x2",
        illustration_id: "illus-classic",
      }),
      makePrint({
        id: "en-sld-alt",
        lang: "en",
        set: "sld",
        set_name: "Secret Lair Drop",
        illustration_id: "illus-sld-cool",
        border_color: "borderless",
        full_art: true,
        frame_effects: ["borderless"],
        artist: "Noah Bradley",
      }),
      makePrint({
        id: "en-digital-only",
        lang: "en",
        set: "y24",
        digital: true,
        illustration_id: "illus-digital",
      }),
    ];

    const selection = selectBestProxyVariants(prints, {
      oracleId: "4457ed35-7c10-48c8-9776-456485fdf070",
      slug: "lightning-bolt",
      name: "Lightning Bolt",
      typeLine: "Instant",
      oracleText: "Lightning Bolt deals 3 damage to any target.",
    });

    expect(selection.classic?.scryfallId).toBe("fr-classic");
    expect(selection.classic?.isOfficialFrenchScan).toBe(true);
    expect(selection.classic?.needsFrenchProxyRender).toBe(false);

    expect(selection.original?.scryfallId).toBe("en-sld-alt");
    expect(selection.original?.borderless).toBe(true);
    expect(selection.original?.needsFrenchProxyRender).toBe(true);
    expect(selection.original?.treatmentLabel).toBe("Secret Lair (EN)");

    expect(selection.french.name).toBe("Foudre");
    expect(selection.candidates.some((c) => c.scryfallId === "en-digital-only")).toBe(false);
  });

  it("prefers a sharp high-res EN classic scan over a blurry lowres FR scan while keeping official FR text", () => {
    const prints: ScryfallPrint[] = [
      makePrint({
        id: "fr-lowres",
        name: "Abrupt Decay",
        lang: "fr",
        printed_name: "Décomposition abrupte",
        printed_type_line: "Éphémère",
        printed_text: "Ce sort ne peut pas être contrecarré.",
        highres_image: false,
        image_status: "lowres",
        illustration_id: "illus-a",
      }),
      makePrint({
        id: "en-highres",
        name: "Abrupt Decay",
        lang: "en",
        highres_image: true,
        image_status: "highres_scan",
        illustration_id: "illus-a",
      }),
    ];

    const selection = selectBestProxyVariants(prints, {
      oracleId: "1c747fe2-289e-492a-a846-aa77707e2dc3",
      slug: "abrupt-decay",
      name: "Abrupt Decay",
      typeLine: "Instant",
      oracleText: "This spell can't be countered.",
    });

    expect(selection.classic?.scryfallId).toBe("en-highres");
    expect(selection.classic?.needsFrenchProxyRender).toBe(true);
    expect(selection.french.name).toBe("Décomposition abrupte");
    expect(selection.french.source).toBe("official_scryfall_fr");
  });

  it("never lets a secondary adventure/split face hijack an iconic single card", () => {
    const fakeAdventure = makePrint({
      id: "hijack-1",
      name: "Emeritus of Ideation // Ancestral Recall",
      card_faces: [{ name: "Emeritus of Ideation" }, { name: "Ancestral Recall" }],
    });
    expect(isMatchingCardPrint(fakeAdventure, "Ancestral Recall")).toBe(false);
    expect(isMatchingCardPrint(fakeAdventure, "Emeritus of Ideation")).toBe(true);
  });

  it("rejects digital, oversized, and placeholder prints as ineligible paper scans", () => {
    expect(isEligiblePaperPrint(makePrint({ digital: true }))).toBe(false);
    expect(isEligiblePaperPrint(makePrint({ oversized: true }))).toBe(false);
    expect(isEligiblePaperPrint(makePrint({ image_status: "placeholder" }))).toBe(false);
    expect(isEligiblePaperPrint(makePrint({ layout: "art_series" }))).toBe(false);
    expect(isEligiblePaperPrint(makePrint({}))).toBe(true);
  });

  it("classifies collector treatments cleanly", () => {
    expect(classifyTreatmentLabel(makePrint({ set: "sta", lang: "fr" }), false)).toBe(
      "Archives Mystiques (FR)",
    );
    expect(
      classifyTreatmentLabel(makePrint({ border_color: "borderless", lang: "en" }), false),
    ).toBe("Borderless (EN)");
    expect(
      classifyTreatmentLabel(makePrint({ frame_effects: ["showcase"], lang: "fr" }), false),
    ).toBe("Showcase (FR)");
  });

  it("enforces strict Scryfall HTTPS allowlist for proxied images to prevent SSRF", () => {
    expect(
      isAllowedScryfallImageUrl(
        "https://cards.scryfall.io/png/front/1/f/1f93e813-516d-43c6-a2f3-4196c18620a5.png",
      ),
    ).toBe(true);
    expect(isAllowedScryfallImageUrl("http://cards.scryfall.io/png/a.png")).toBe(false);
    expect(isAllowedScryfallImageUrl("https://evil.example.com/a.png")).toBe(false);
    expect(isAllowedScryfallImageUrl("http://127.0.0.1:3000/secret.png")).toBe(false);
    expect(isAllowedScryfallImageUrl("file:///etc/passwd.png")).toBe(false);
    expect(isAllowedScryfallImageUrl("https://cards.scryfall.io/cards/named")).toBe(false);
  });
});
