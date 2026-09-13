import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CardCatalog } from "../../../src/cards/card-catalog.ts";
import { selectRepresentativeScore } from "../../../src/cards/power-calibration.ts";

interface DraftRecord {
  readonly startTime: number;
  readonly picks?: readonly {
    readonly PackScores?: Readonly<Record<string, { readonly staticScore?: number | null }>>;
  }[];
}

interface CardMetadata {
  readonly name?: string;
}

interface ReferenceArtifact {
  readonly scores: Record<string, number>;
}

const rootDir = process.cwd();
const normalizeName = (name: string): string => name.trim().toLowerCase();

describe("untapped static score fidelity", () => {
  it("guarantees that all cards with known Untapped static scores match within 3 points", async () => {
    // 1. Load compiled master catalog
    const catalogResult = await CardCatalog.fromFile(
      resolve(rootDir, "data/cards/master-cards.json"),
    );
    expect(catalogResult.ok).toBe(true);
    if (!catalogResult.ok) return;

    const catalog = catalogResult.value;

    // 2. Load historical drafts, card metadata and product-owner reference
    const drafts = JSON.parse(
      readFileSync(resolve(rootDir, "data/untapped_history/drafts_backup.json"), "utf8"),
    ) as Record<string, DraftRecord>;

    const metadata = JSON.parse(
      readFileSync(resolve(rootDir, "data/untapped_history/card-metadata-v1.json"), "utf8"),
    ) as Record<string, CardMetadata>;

    const reference = JSON.parse(
      readFileSync(resolve(rootDir, "data/power-rankings/untapped-reference-v1.json"), "utf8"),
    ) as ReferenceArtifact;

    // 3. Aggregate all Untapped observations per normalized card name
    const observationsByName = new Map<string, { score: number; observedAt: number }[]>();
    for (const draft of Object.values(drafts)) {
      for (const pick of draft.picks ?? []) {
        for (const [grpId, scorePair] of Object.entries(pick.PackScores ?? {})) {
          const staticScore = scorePair.staticScore;
          if (typeof staticScore !== "number" || !Number.isFinite(staticScore)) continue;
          const name = metadata[grpId]?.name;
          if (!name) continue;
          const key = normalizeName(name);
          const list = observationsByName.get(key) ?? [];
          list.push({ score: staticScore, observedAt: draft.startTime });
          observationsByName.set(key, list);
        }
      }
    }

    // 4. Determine expected target score (reference overrides historical mode)
    const expectedScoresByName = new Map<string, number>();
    for (const [name, observations] of observationsByName) {
      const rep = selectRepresentativeScore(observations);
      if (rep !== undefined) {
        expectedScoresByName.set(name, rep);
      }
    }
    for (const [name, refScore] of Object.entries(reference.scores)) {
      expectedScoresByName.set(normalizeName(name), refScore);
    }

    // 5. Match against catalog cards
    const verifiedCards: {
      name: string;
      catalogScore: number;
      expectedScore: number;
      delta: number;
    }[] = [];
    for (const card of Object.values(catalog.catalog.cards)) {
      const key = normalizeName(card.name);
      const expectedScore = expectedScoresByName.get(key);
      if (expectedScore !== undefined) {
        const catalogScore = card.powerScore.score;
        const delta = Math.abs(catalogScore - expectedScore);
        verifiedCards.push({ name: card.name, catalogScore, expectedScore, delta });
      }
    }

    // Must cover at least 400 distinct cards from the Untapped empirical corpus
    expect(verifiedCards.length).toBeGreaterThanOrEqual(400);

    // Every single card with an Untapped static score must be respected within 3 points
    const violations = verifiedCards.filter((c) => c.delta > 3);
    expect(
      violations,
      `Cards violating the 3-point delta tolerance: ${JSON.stringify(violations, null, 2)}`,
    ).toEqual([]);

    // Specific regression invariants on Fabled Passage
    const fabledPassage = catalog.getCardByName("Fabled Passage");
    expect(fabledPassage).toBeDefined();
    expect(fabledPassage?.powerScore.source).toBe("untapped");
    expect(fabledPassage?.powerScore.score).toBe(15);
    expect(fabledPassage?.powerScore.score).not.toBe(41);
    expect(Math.abs((fabledPassage?.powerScore.score ?? 0) - 15)).toBeLessThanOrEqual(3);
  });
});
