export const MAX_POWER_SCORE = 55;

export function toPowerBarPercentage(score) {
  const finiteScore = Number.isFinite(score) ? score : 1;
  return Math.round((Math.max(1, Math.min(MAX_POWER_SCORE, finiteScore)) / MAX_POWER_SCORE) * 100);
}

export function scoreToPowerTier(score) {
  const finiteScore = Number.isFinite(score) ? score : 1;
  if (finiteScore >= 38) return "S";
  if (finiteScore >= 26) return "A";
  if (finiteScore >= 17) return "B";
  if (finiteScore >= 10) return "C";
  return "D";
}

export const RELATIVE_TIERS = [
  "A+", "A", "A-",
  "B+", "B", "B-",
  "C+", "C", "C-",
  "D+", "D", "D-",
  "F",
];

export function rankToRelativeTier(rankIndex, totalCards) {
  if (!totalCards || totalCards <= 0) return "C";
  const tierIndex = Math.min(12, Math.floor((rankIndex / totalCards) * 13));
  return RELATIVE_TIERS[tierIndex];
}

export function computePowerRankings(cards) {
  const ranked = cards
    .map((card) => ({
      card,
      score: Number.isFinite(card.powerScore?.score) ? card.powerScore.score : 1,
    }))
    .sort(
      (left, right) => right.score - left.score || left.card.name.localeCompare(right.card.name),
    );

  const rankings = {};
  const total = ranked.length;
  ranked.forEach(({ card, score }, index) => {
    const rank = index + 1;
    const cardKey = card.oracleId || card.slug || card.name;
    const relativeTier = rankToRelativeTier(index, total);
    rankings[cardKey] = {
      rank,
      total,
      score,
      tier: relativeTier,
      relativeTier,
      percentile: Math.max(1, Math.round((rank / total) * 100)),
    };
  });
  return rankings;
}
