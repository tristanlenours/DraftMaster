import type { ArchetypeFitItem, CubeSpecificCardAnalysis } from "./types.ts";

// The cube tier and the power score each have one owner: `cubeAnalyses[cube].tier` and
// `powerScore.score`. The importers also wrote both values into prose and into the
// generic archetype rows, where they went stale as soon as a score or a tier moved.
// These functions re-derive every such copy, so `npm run data:sync` keeps them aligned.

const SCORE_MENTION = /\(Score : \d+(?:\.\d+)?\)/gu;
const RANK_MENTION = /^Carte de rang (?:S|[A-D][+-]?|F) /u;
const ROW_SCORE = /^Score \d+(?:\.\d+)?/u;
const TIER_IN_COMMENT = /^(Alignement au métagame Titou Tribal) \((?:S|[A-D][+-]?|F)\)\.$/u;

export function formatScoreMention(score: number): string {
  return score.toFixed(1);
}

/** Rewrites every `(Score : N)` mention so that it quotes the current power score. */
export function refreshScoreMentions(text: string, score: number): string {
  return text.replace(SCORE_MENTION, `(Score : ${formatScoreMention(score)})`);
}

/**
 * Importer-generated rows are labelled with the upper-cased archetype id ("VINTAGE STAPLE");
 * they carry no judgement of their own and mirror the cube tier. Hand-written rows
 * ("Boros Synth & Burn") grade the card inside one archetype and are left alone.
 */
export function isGeneratedArchetypeFitRow(row: Pick<ArchetypeFitItem, "archetype">): boolean {
  return row.archetype === row.archetype.toUpperCase();
}

function refreshArchetypeFitRow(
  row: ArchetypeFitItem,
  tier: string | undefined,
  score: number,
): ArchetypeFitItem {
  const generated = isGeneratedArchetypeFitRow(row) && tier !== undefined;
  return {
    ...row,
    ...(generated ? { grade: tier } : {}),
    ...(row.winrateOrScore !== undefined
      ? {
          winrateOrScore: row.winrateOrScore.replace(
            ROW_SCORE,
            `Score ${formatScoreMention(score)}`,
          ),
        }
      : {}),
    ...(row.comment !== undefined && tier !== undefined
      ? { comment: row.comment.replace(TIER_IN_COMMENT, `$1 (${tier}).`) }
      : {}),
  };
}

/**
 * Returns the analysis with every copy of the tier and of the power score re-derived,
 * and without the redundant `relativeTier` alias (`tier` is the single tier field).
 */
export function refreshDerivedTierText<
  T extends CubeSpecificCardAnalysis & { readonly relativeTier?: unknown },
>(analysis: T, score: number): Omit<T, "relativeTier"> {
  const rest: Omit<T, "relativeTier"> & { relativeTier?: unknown } = { ...analysis };
  delete rest.relativeTier;
  const tier = analysis.tier;
  const withRank =
    tier === undefined
      ? analysis.analysis
      : analysis.analysis.replace(RANK_MENTION, `Carte de rang ${tier} `);
  const archetypeFit = analysis.pedagogy?.archetypeFit;
  return {
    ...rest,
    analysis: refreshScoreMentions(withRank, score),
    ...(analysis.pedagogy !== undefined
      ? {
          pedagogy: {
            ...analysis.pedagogy,
            ...(archetypeFit !== undefined
              ? {
                  archetypeFit: archetypeFit.map((row) => refreshArchetypeFitRow(row, tier, score)),
                }
              : {}),
          },
        }
      : {}),
  };
}
