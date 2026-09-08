export const MAX_POWER_SCORE = 53;

export function toPowerBarPercentage(score) {
  const finiteScore = Number.isFinite(score) ? score : 1;
  return Math.round((Math.max(1, Math.min(MAX_POWER_SCORE, finiteScore)) / MAX_POWER_SCORE) * 100);
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
    rankings[cardKey] = {
      rank,
      total,
      score,
      percentile: Math.max(1, Math.round((rank / total) * 100)),
    };
  });
  return rankings;
}
