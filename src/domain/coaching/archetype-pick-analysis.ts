import type { CardEvaluationInput, DeckSynergyCardAffinity, DeckSynergyProfile } from "./types.ts";

export interface ArchetypePickMatch {
  readonly archetypeId: string;
  readonly archetypeName: string;
  readonly strength: "key" | "support";
  readonly roles: readonly string[];
  readonly families: readonly string[];
  readonly confidence: "A" | "B" | "C" | "D";
  readonly priorPoints: number;
  readonly completedFamilies: readonly string[];
  readonly missingFamilies: readonly string[];
  readonly bonus: number;
}

export interface ArchetypePickAnalysis {
  readonly bonus: number;
  readonly matches: readonly ArchetypePickMatch[];
}

const CONFIDENCE_WEIGHT = { A: 1, B: 0.8, C: 0.6, D: 0.4 } as const;

function affinityPoints(affinity: DeckSynergyCardAffinity): number {
  return (affinity.strength === "key" ? 3 : 1) * CONFIDENCE_WEIGHT[affinity.confidence];
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export function analyzeArchetypePick(
  card: Readonly<CardEvaluationInput>,
  priorPool: readonly Readonly<CardEvaluationInput>[],
  profile: DeckSynergyProfile | undefined,
): ArchetypePickAnalysis {
  if (!profile || !card.oracleId) return { bonus: 0, matches: [] };

  const priorOracleIds = new Set(
    priorPool.flatMap((prior) => (prior.oracleId ? [prior.oracleId] : [])),
  );
  const matches: ArchetypePickMatch[] = [];

  for (const archetype of profile.archetypes) {
    const affinities = archetype.affinities ?? [];
    const candidate = affinities.find((affinity) => affinity.oracleId === card.oracleId);
    if (!candidate) continue;

    const priorAffinities = affinities.filter((affinity) => priorOracleIds.has(affinity.oracleId));
    const priorPoints = priorAffinities.reduce(
      (total, affinity) => total + affinityPoints(affinity),
      0,
    );
    const engagement = Math.min(1, priorPoints / 9 + priorAffinities.length / 12);
    const completedFamilies: string[] = [];
    const missingFamilies: string[] = [];
    let newlyCompletedFamilyCount = 0;

    for (const family of archetype.requiredFamilies ?? []) {
      const before = new Set(
        priorAffinities
          .filter((affinity) => affinity.families.includes(family.id))
          .map((affinity) => affinity.oracleId),
      ).size;
      const after =
        before +
        (candidate.families.includes(family.id) && !priorOracleIds.has(card.oracleId) ? 1 : 0);
      if (after >= family.minimum) completedFamilies.push(family.id);
      else missingFamilies.push(family.id);
      if (before < family.minimum && after >= family.minimum) newlyCompletedFamilyCount += 1;
    }

    const base = candidate.strength === "key" ? 5 : 2;
    const confidence = CONFIDENCE_WEIGHT[candidate.confidence];
    const bonus = round(
      Math.min(8, (base * (0.4 + engagement * 1.2) + newlyCompletedFamilyCount * 2) * confidence),
    );
    matches.push({
      archetypeId: archetype.id,
      archetypeName: archetype.name,
      strength: candidate.strength,
      roles: candidate.roles,
      families: candidate.families,
      confidence: candidate.confidence,
      priorPoints: round(priorPoints),
      completedFamilies,
      missingFamilies,
      bonus,
    });
  }

  matches.sort(
    (left, right) =>
      right.bonus - left.bonus ||
      right.priorPoints - left.priorPoints ||
      left.archetypeId.localeCompare(right.archetypeId),
  );
  return { bonus: matches[0]?.bonus ?? 0, matches };
}
