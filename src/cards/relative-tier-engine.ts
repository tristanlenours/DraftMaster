import { RELATIVE_TIERS, type RelativeTier } from "./types.ts";

export interface CardWithScore {
  readonly name: string;
  readonly slug?: string;
  readonly oracleId?: string;
  readonly powerScore?: { readonly score?: number };
  readonly score?: number;
}

export interface ArchetypeCardLists {
  readonly keyCards?: readonly string[];
  readonly supportCards?: readonly string[];
  readonly trapCards?: readonly string[];
}

export interface CubeMetaForTiers {
  readonly archetypes?: readonly ArchetypeCardLists[];
}

export interface RelativeTierOptions {
  readonly keyCardBonus?: number;
  readonly supportCardBonus?: number;
  readonly trapCardPenalty?: number;
}

export interface AssignedRelativeTier<T extends CardWithScore> {
  readonly card: T;
  readonly universalScore: number;
  readonly tier: RelativeTier;
  readonly tierIndex: number;
  readonly rank: number;
  readonly metaRole: "key" | "support" | "neutral" | "trap";
  readonly metaBonus: number;
  readonly scoreModifier: number;
}

export function getUniversalScore(card: CardWithScore): number {
  const powerScore = card.powerScore?.score;
  if (typeof powerScore === "number" && Number.isFinite(powerScore)) {
    return powerScore;
  }
  const directScore = card.score;
  if (typeof directScore === "number" && Number.isFinite(directScore)) {
    return directScore;
  }
  return 1;
}

export function assignRelativeTiers<T extends CardWithScore>(
  cards: readonly T[],
  cubeMeta?: CubeMetaForTiers,
  options: RelativeTierOptions = {},
): AssignedRelativeTier<T>[] {
  if (cards.length === 0) return [];

  const keyCardBonus = options.keyCardBonus ?? 8;
  const supportCardBonus = options.supportCardBonus ?? 4;
  const trapCardPenalty = options.trapCardPenalty ?? -5;

  // Build lookup sets for archetype meta roles
  const keyCards = new Set<string>();
  const supportCards = new Set<string>();
  const trapCards = new Set<string>();

  for (const arch of cubeMeta?.archetypes ?? []) {
    for (const id of arch.keyCards ?? []) keyCards.add(id.toLowerCase());
    for (const id of arch.supportCards ?? []) supportCards.add(id.toLowerCase());
    for (const id of arch.trapCards ?? []) trapCards.add(id.toLowerCase());
  }

  // Sort cards descending by universalScore, then by name for stable tie-breaking
  const decorated = cards.map((card) => ({
    card,
    universalScore: getUniversalScore(card),
  }));

  decorated.sort((left, right) => {
    if (right.universalScore !== left.universalScore) {
      return right.universalScore - left.universalScore;
    }
    return left.card.name.localeCompare(right.card.name);
  });

  const total = decorated.length;

  return decorated.map((item, index) => {
    const tierIndex = Math.min(12, Math.floor((index / total) * 13));
    const tier = RELATIVE_TIERS[tierIndex] ?? "F";

    const oracleIdLower = (item.card.oracleId ?? "").toLowerCase();
    const nameLower = item.card.name.toLowerCase();

    let metaRole: "key" | "support" | "neutral" | "trap" = "neutral";
    let metaBonus = 0;

    if (keyCards.has(oracleIdLower) || keyCards.has(nameLower)) {
      metaRole = "key";
      metaBonus = keyCardBonus;
    } else if (supportCards.has(oracleIdLower) || supportCards.has(nameLower)) {
      metaRole = "support";
      metaBonus = supportCardBonus;
    } else if (trapCards.has(oracleIdLower) || trapCards.has(nameLower)) {
      metaRole = "trap";
      metaBonus = trapCardPenalty;
    }

    return {
      card: item.card,
      universalScore: item.universalScore,
      tier,
      tierIndex,
      rank: index + 1,
      metaRole,
      metaBonus,
      scoreModifier: metaBonus,
    };
  });
}
