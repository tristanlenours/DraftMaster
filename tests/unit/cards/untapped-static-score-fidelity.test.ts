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

const rootDir = process.cwd();
const normalizeName = (name: string): string => name.trim().toLowerCase();

describe("Untapped Static Score Fidelity Contract", () => {
  it("guarantees that 100% of cards known in Untapped drafts with a static score take that exact score in the catalog", async () => {
    // 1. Load compiled master catalog
    const catalogResult = await CardCatalog.fromFile(
      resolve(rootDir, "data/cards/master-cards.json"),
    );
    expect(catalogResult.ok).toBe(true);
    if (!catalogResult.ok) return;

    const catalog = catalogResult.value;

    // 2. Load historical drafts and card metadata
    const drafts = JSON.parse(
      readFileSync(resolve(rootDir, "data/untapped_history/drafts_backup.json"), "utf8"),
    ) as Record<string, DraftRecord>;

    const metadata = JSON.parse(
      readFileSync(resolve(rootDir, "data/untapped_history/card-metadata-v1.json"), "utf8"),
    ) as Record<string, CardMetadata>;

    // 3. Aggregate all Untapped static observations per normalized card name
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

    // 4. Determine expected target score directly from Untapped data
    const expectedScoresByName = new Map<string, number>();
    for (const [name, observations] of observationsByName) {
      const rep = selectRepresentativeScore(observations);
      if (rep !== undefined) {
        expectedScoresByName.set(name, rep);
      }
    }

    expect(expectedScoresByName.size).toBeGreaterThanOrEqual(400);

    // 5. Verify that every card in the master catalog matching an Untapped card takes that exact score
    const discrepancies: {
      name: string;
      catalogScore: number;
      expectedScore: number;
      source: string;
    }[] = [];

    let verifiedCount = 0;
    for (const card of Object.values(catalog.catalog.cards)) {
      const key = normalizeName(card.name);
      const expectedScore = expectedScoresByName.get(key);
      if (expectedScore !== undefined) {
        verifiedCount++;
        const catalogScore = card.powerScore.score;
        if (
          Math.abs(catalogScore - expectedScore) > 0.05 ||
          card.powerScore.source !== "untapped"
        ) {
          discrepancies.push({
            name: card.name,
            catalogScore,
            expectedScore,
            source: card.powerScore.source,
          });
        }
      }
    }

    expect(verifiedCount).toBeGreaterThanOrEqual(400);
    expect(
      discrepancies,
      `Found ${String(discrepancies.length)} cards diverging from empirical Untapped static scores: ${JSON.stringify(discrepancies, null, 2)}`,
    ).toEqual([]);

    // 6. Explicit contract verification for Channel
    const channel = catalog.getCardByName("Channel");
    expect(channel, "Channel must exist in catalog").toBeDefined();
    expect(channel?.powerScore.score).toBe(18);
    expect(channel?.powerScore.source).toBe("untapped");
    expect(channel?.powerScore.rawSourceScore).toBe(18);

    // Channel must NOT be classified as Tier S when its empirical powerScore is 18
    const nicoAnalysis = channel?.cubeAnalyses.nico_candyshop;
    if (nicoAnalysis) {
      expect(nicoAnalysis.tier).not.toBe("S");
      expect(nicoAnalysis.tier).toBe("B");
      expect(nicoAnalysis.fit).toBe("support");
    }
  });
});
