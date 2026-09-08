import { describe, expect, it } from "vitest";
import {
  loadImageWithFallback,
  isMatchingScryfallPrint,
  sanitizeFrenchCache,
} from "../../../src/web/card-image.js";

describe("card image fallback", () => {
  it("replaces a missing local image with the remote card image", () => {
    const image = {
      src: "",
      onerror: null as null | (() => void),
    };
    const localImage = "/data/cards/images/fr/cards/force-of-will.jpg";
    const remoteImage = "https://cards.scryfall.io/normal/front/example.jpg";

    loadImageWithFallback(image, localImage, remoteImage);

    expect(image.src).toBe(localImage);
    expect(image.onerror).toBeTypeOf("function");

    image.onerror?.();

    expect(image.src).toBe(remoteImage);
    expect(image.onerror).toBeNull();
  });

  it("does not retry forever when the fallback image also fails", () => {
    const image = {
      src: "",
      onerror: null as null | (() => void),
    };

    loadImageWithFallback(image, "/missing-local.jpg", "https://example.test/missing-remote.jpg");
    image.onerror?.();
    const fallbackHandler = image.onerror;

    expect(fallbackHandler).toBeNull();
  });
});

describe("isMatchingScryfallPrint", () => {
  it("matches an exact standalone card name", () => {
    const print = { name: "Ancestral Recall" };
    expect(isMatchingScryfallPrint(print, "Ancestral Recall")).toBe(true);
    expect(isMatchingScryfallPrint(print, "ancestral recall")).toBe(true);
  });

  it("rejects when an iconic single-card name only matches a secondary adventure face", () => {
    // "Emeritus of Ideation // Ancestral Recall" has Ancestral Recall on face 1, but face 0 is Emeritus
    const print = {
      name: "Emeritus of Ideation // Ancestral Recall",
      card_faces: [
        { name: "Emeritus of Ideation", printed_name: "Émérite de l'idéation" },
        { name: "Ancestral Recall", printed_name: "Rappel ancestral" },
      ],
    };
    expect(isMatchingScryfallPrint(print, "Ancestral Recall")).toBe(false);
  });

  it("rejects Swords to Plowshares against Emeritus of Truce", () => {
    const print = {
      name: "Emeritus of Truce // Swords to Plowshares",
      card_faces: [
        { name: "Emeritus of Truce", printed_name: "Émérite de trêve" },
        { name: "Swords to Plowshares", printed_name: "Retour au pays" },
      ],
    };
    expect(isMatchingScryfallPrint(print, "Swords to Plowshares")).toBe(false);
  });

  it("matches when cardName corresponds to the primary front face of an adventure card", () => {
    const print = {
      name: "Brazen Borrower // Petty Theft",
      card_faces: [
        { name: "Brazen Borrower", printed_name: "Emprunteur d'airain" },
        { name: "Petty Theft", printed_name: "Larcin mineur" },
      ],
    };
    expect(isMatchingScryfallPrint(print, "Brazen Borrower")).toBe(true);
    expect(isMatchingScryfallPrint(print, "Brazen Borrower // Petty Theft")).toBe(true);
  });

  it("handles null or undefined safely", () => {
    expect(isMatchingScryfallPrint(null, "Ancestral Recall")).toBe(false);
    expect(isMatchingScryfallPrint({ name: "Ancestral Recall" }, "")).toBe(false);
  });
});

describe("sanitizeFrenchCache", () => {
  it("purges corrupted Ancestral Recall and Emeritus mismatch entries", () => {
    const cache = new Map<string, Record<string, unknown>>([
      [
        "Ancestral Recall",
        {
          frenchName: "Émérite de l'idéation // Rappel ancestral",
          frenchImageUrl: "https://cards.scryfall.io/fake.jpg",
        },
      ],
      [
        "Swords to Plowshares",
        {
          frenchName: "Retour au pays",
          frenchImageUrl: "https://cards.scryfall.io/swords.jpg",
        },
      ],
      [
        "Archmage Emeritus",
        {
          frenchName: "Archimage émérite",
          frenchImageUrl: "https://cards.scryfall.io/archmage.jpg",
        },
      ],
    ]);

    const mutated = sanitizeFrenchCache(cache);

    expect(mutated).toBe(true);
    expect(cache.has("Ancestral Recall")).toBe(false);
    expect(cache.has("Swords to Plowshares")).toBe(true);
    expect(cache.has("Archmage Emeritus")).toBe(true);
  });

  it("returns false when cache has no corrupted entries", () => {
    const cache = new Map<string, Record<string, unknown>>([
      ["Black Lotus", { frenchName: "Black Lotus" }],
      ["Swords to Plowshares", { frenchName: "Retour au pays" }],
    ]);

    const mutated = sanitizeFrenchCache(cache);
    expect(mutated).toBe(false);
  });
});
