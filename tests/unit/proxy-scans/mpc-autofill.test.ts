import { describe, expect, it } from "vitest";
import {
  MPC_MAX_RESULTS,
  buildMpcImageUrl,
  buildMpcSearchBody,
  isLocalMpcImagePath,
  isValidMpcIdentifier,
  localMpcImagePath,
  normalizeMpcCards,
  normalizeMpcQuery,
  readMpcSearchIdentifiers,
} from "../../../src/proxy-scans/mpc-autofill.ts";

const ID = "1AA85Rfe_Rg5hozPMOcHBJLxpwSgO4xUA";

describe("MPC identifiers and URLs", () => {
  it("accepts Google Drive file ids only", () => {
    expect(isValidMpcIdentifier(ID)).toBe(true);
    expect(isValidMpcIdentifier("short")).toBe(false);
    expect(isValidMpcIdentifier(`${ID}/../evil`)).toBe(false);
    expect(isValidMpcIdentifier(`${ID}?x=1`)).toBe(false);
    expect(isValidMpcIdentifier(42)).toBe(false);
  });

  it("builds Google image URLs at thumbnail size or 600 DPI", () => {
    expect(buildMpcImageUrl(ID, "thumb")).toBe(
      `https://lh4.googleusercontent.com/d/${ID}=w400-h400`,
    );
    expect(buildMpcImageUrl(ID, "full")).toBe(`https://lh4.googleusercontent.com/d/${ID}=h2220`);
    expect(buildMpcImageUrl(ID, "full", 1200)).toBe(
      `https://lh4.googleusercontent.com/d/${ID}=h2220`,
    );
    expect(buildMpcImageUrl(ID, "full", 300)).toBe(
      `https://lh4.googleusercontent.com/d/${ID}=h1110`,
    );
    expect(() => buildMpcImageUrl("../etc/passwd", "full")).toThrow();
  });

  it("recognizes only the local MPC image routes", () => {
    expect(isLocalMpcImagePath(localMpcImagePath(ID, "full"))).toBe(true);
    expect(isLocalMpcImagePath(localMpcImagePath(ID, "thumb"))).toBe(true);
    expect(isLocalMpcImagePath(`/api/proxy-scans/mpc/image/${ID}?size=huge`)).toBe(false);
    expect(isLocalMpcImagePath(`https://evil.example/api/proxy-scans/mpc/image/${ID}`)).toBe(false);
  });
});

describe("MPC search", () => {
  it("normalizes queries like MPC Autofill indexes names", () => {
    expect(normalizeMpcQuery("  Fire // Ice ")).toBe("fire");
    expect(normalizeMpcQuery("Jace, the Mind Sculptor!")).toBe("jace, the mind sculptor");
  });

  it("queries every source and keeps only valid language filters", () => {
    const body = buildMpcSearchBody("brainstorm", [1, 2], ["FR", "fr", "XXX"]);
    expect(body).toMatchObject({
      queries: [{ query: "brainstorm", cardType: "CARD" }],
      searchSettings: {
        filterSettings: { languages: ["FR"], maximumDPI: 1500 },
        sourceSettings: {
          sources: [
            [1, true],
            [2, true],
          ],
        },
      },
    });
  });

  it("reads and caps the identifiers of one query", () => {
    const ids = Array.from(
      { length: 80 },
      (_, i) => `${ID.slice(0, 30)}${String(i).padStart(3, "0")}`,
    );
    const payload = { results: { brainstorm: { CARD: [...ids, "bad id"] } } };
    const read = readMpcSearchIdentifiers(payload, "brainstorm");
    expect(read).toHaveLength(MPC_MAX_RESULTS);
    expect(readMpcSearchIdentifiers({ results: {} }, "brainstorm")).toEqual([]);
    expect(readMpcSearchIdentifiers(null, "brainstorm")).toEqual([]);
  });

  it("normalizes card metadata in search order and drops mismatches", () => {
    const other = "1IS77TWnANnx6tViJ9BGb93gKa6ZjEwRz";
    const cards = normalizeMpcCards(
      {
        results: {
          [other]: {
            identifier: other,
            name: "Brainstorm (Borderless)",
            dpi: 1200,
            language: "FR",
          },
          [ID]: {
            identifier: ID,
            name: "Brainstorm",
            dpi: "800",
            size: 1391227,
            sourceName: "JohnPrime",
            language: "<script>",
            tags: ["Full Art", 3],
          },
          spoofed: { identifier: "different" },
        },
      },
      [ID, other, "spoofed"],
    );
    expect(cards.map((card) => card.identifier)).toEqual([ID, other]);
    expect(cards[0]).toMatchObject({ dpi: 800, language: "EN", tags: ["Full Art"] });
    expect(cards[1]).toMatchObject({ dpi: 1200, language: "FR" });
  });
});
