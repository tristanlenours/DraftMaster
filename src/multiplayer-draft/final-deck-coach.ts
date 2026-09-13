import { buildFinalDeckCoachPrompt } from "../companion/coach-prompts.ts";
import {
  DEFAULT_BASIC_LANDS,
  evaluateDeck,
  recommendDeckBuilds,
  type CardEvaluationInput,
  type DeckEvaluation,
  type DeckEvaluationOptions,
  type MtGColor,
} from "../domain/coaching/index.ts";

export const FINAL_DECK_COACH_PROMPT_VERSION = "final-deck-coach@1" as const;

export interface FinalDeckBasicLands {
  readonly Plains: number;
  readonly Island: number;
  readonly Swamp: number;
  readonly Mountain: number;
  readonly Forest: number;
}

export interface FinalDeckCardReason {
  readonly cardInstanceIds: readonly string[];
  readonly reason: string;
}

export interface ExternalFinalDeckProposal {
  readonly maindeckCardInstanceIds: readonly string[];
  readonly basicLands: FinalDeckBasicLands;
  readonly strategy: string;
  readonly primaryColors: readonly MtGColor[];
  readonly splashColors: readonly MtGColor[];
  readonly includedReasons: readonly FinalDeckCardReason[];
  readonly excludedReasons: readonly FinalDeckCardReason[];
  readonly manaRationale: string;
  readonly landCountRationale: string;
}

export interface FinalDeckRecommendation extends ExternalFinalDeckProposal {
  readonly sideboardCardInstanceIds: readonly string[];
  readonly totalCardCount: 40;
  readonly landCount: number;
  readonly evaluation: DeckEvaluation;
  readonly source: "external" | "fallback";
  readonly provider: string;
  readonly model: string | null;
  readonly promptVersion: typeof FINAL_DECK_COACH_PROMPT_VERSION;
  readonly engineVersion: string;
  readonly fallbackReason?: "COACH_UNAVAILABLE" | "INVALID_EXTERNAL_RECOMMENDATION" | undefined;
}

export interface FinalDeckCoachRequest {
  readonly cubeKey: string;
  readonly snapshotId: string;
  readonly pool: readonly CardEvaluationInput[];
  readonly evaluationOptions?: DeckEvaluationOptions | undefined;
}

export interface FinalDeckJsonResult {
  readonly success: boolean;
  readonly content: unknown;
  readonly provider: string;
  readonly model?: string | undefined;
}

export interface FinalDeckCoachDependencies {
  readonly generateJson?:
    | ((
        systemPrompt: string,
        userPrompt: string,
        options: Readonly<{
          profile: typeof FINAL_DECK_COACH_PROMPT_VERSION;
          preferBaseTier: true;
          maxTokens: number;
        }>,
      ) => Promise<FinalDeckJsonResult>)
    | undefined;
}

export interface FinalDeckCoach {
  recommend(request: Readonly<FinalDeckCoachRequest>): Promise<FinalDeckRecommendation>;
}

const BASIC_NAMES = ["Plains", "Island", "Swamp", "Mountain", "Forest"] as const;
const BASIC_COLORS: Readonly<Record<(typeof BASIC_NAMES)[number], MtGColor>> = {
  Plains: "W",
  Island: "U",
  Swamp: "B",
  Mountain: "R",
  Forest: "G",
};

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isColor(value: unknown): value is MtGColor {
  return value === "W" || value === "U" || value === "B" || value === "R" || value === "G";
}

function isModalLand(card: CardEvaluationInput): boolean {
  return (
    !card.isLand &&
    (/\/\/\s*(?:basic\s+)?land\b/i.test(card.typeLine ?? "") ||
      /\b(?:as|when) (?:this|that) land enters\b/i.test(card.oracleText ?? ""))
  );
}

function getSideboard(
  pool: readonly CardEvaluationInput[],
  selectedIds: readonly string[],
): readonly string[] {
  const remainingSelected = new Map<string, number>();
  for (const id of selectedIds) {
    remainingSelected.set(id, (remainingSelected.get(id) ?? 0) + 1);
  }
  return pool.flatMap((card) => {
    const remaining = remainingSelected.get(card.id) ?? 0;
    if (remaining > 0) {
      remainingSelected.set(card.id, remaining - 1);
      return [];
    }
    return [card.id];
  });
}

function buildEvaluationDeck(
  poolById: ReadonlyMap<string, CardEvaluationInput>,
  selectedIds: readonly string[],
  basics: FinalDeckBasicLands,
): readonly CardEvaluationInput[] {
  const drafted = selectedIds.flatMap((id) => {
    const card = poolById.get(id);
    return card ? [card] : [];
  });
  const basicCards = BASIC_NAMES.flatMap((name) =>
    Array.from({ length: basics[name] }, () => DEFAULT_BASIC_LANDS[BASIC_COLORS[name]]),
  );
  return [...drafted, ...basicCards];
}

function parseBasicLands(value: unknown): FinalDeckBasicLands | undefined {
  if (!isRecord(value)) return undefined;
  const counts = Object.fromEntries(BASIC_NAMES.map((name) => [name, value[name]])) as unknown as
    FinalDeckBasicLands | undefined;
  return counts && BASIC_NAMES.every((name) => Number.isInteger(counts[name]) && counts[name] >= 0)
    ? counts
    : undefined;
}

function parseReasons(value: unknown): readonly FinalDeckCardReason[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const reasons: FinalDeckCardReason[] = [];
  for (const item of value) {
    if (
      !isRecord(item) ||
      !Array.isArray(item.cardInstanceIds) ||
      !item.cardInstanceIds.every((id) => typeof id === "string") ||
      typeof item.reason !== "string" ||
      item.reason.trim() === ""
    ) {
      return undefined;
    }
    reasons.push({ cardInstanceIds: item.cardInstanceIds, reason: item.reason.trim() });
  }
  return reasons;
}

function parseExternalProposal(
  value: unknown,
  pool: readonly CardEvaluationInput[],
): ExternalFinalDeckProposal | undefined {
  if (!isRecord(value)) return undefined;
  const ids = value.maindeckCardInstanceIds;
  const basicLands = parseBasicLands(value.basicLands);
  const includedReasons = parseReasons(value.includedReasons);
  const excludedReasons = parseReasons(value.excludedReasons);
  if (
    !Array.isArray(ids) ||
    !ids.every((id) => typeof id === "string") ||
    !basicLands ||
    typeof value.strategy !== "string" ||
    value.strategy.trim() === "" ||
    !Array.isArray(value.primaryColors) ||
    !value.primaryColors.every(isColor) ||
    !Array.isArray(value.splashColors) ||
    !value.splashColors.every(isColor) ||
    !includedReasons ||
    !excludedReasons ||
    typeof value.manaRationale !== "string" ||
    value.manaRationale.trim() === "" ||
    typeof value.landCountRationale !== "string" ||
    value.landCountRationale.trim() === ""
  ) {
    return undefined;
  }

  const available = new Map<string, number>();
  for (const card of pool) available.set(card.id, (available.get(card.id) ?? 0) + 1);
  for (const id of ids) {
    const count = available.get(id) ?? 0;
    if (count <= 0) return undefined;
    available.set(id, count - 1);
  }
  const selected = new Set(ids);
  const sideboard = new Set(getSideboard(pool, ids));
  if (
    includedReasons.some(({ cardInstanceIds }) =>
      cardInstanceIds.some((id) => !selected.has(id)),
    ) ||
    excludedReasons.some(({ cardInstanceIds }) => cardInstanceIds.some((id) => !sideboard.has(id)))
  ) {
    return undefined;
  }
  const basicsCount = BASIC_NAMES.reduce((sum, name) => sum + basicLands[name], 0);
  if (ids.length + basicsCount !== 40) return undefined;

  return {
    maindeckCardInstanceIds: ids,
    basicLands,
    strategy: value.strategy.trim(),
    primaryColors: value.primaryColors,
    splashColors: value.splashColors,
    includedReasons,
    excludedReasons,
    manaRationale: value.manaRationale.trim(),
    landCountRationale: value.landCountRationale.trim(),
  };
}

function countBasicLands(ids: readonly string[]): FinalDeckBasicLands {
  return {
    Plains: ids.filter((id) => id === "basic-plains").length,
    Island: ids.filter((id) => id === "basic-island").length,
    Swamp: ids.filter((id) => id === "basic-swamp").length,
    Mountain: ids.filter((id) => id === "basic-mountain").length,
    Forest: ids.filter((id) => id === "basic-forest").length,
  };
}

function finalizeRecommendation(
  request: Readonly<FinalDeckCoachRequest>,
  proposal: ExternalFinalDeckProposal,
  provenance: Readonly<{
    source: "external" | "fallback";
    provider: string;
    model: string | null;
    fallbackReason?: FinalDeckRecommendation["fallbackReason"];
  }>,
): FinalDeckRecommendation {
  const poolById = new Map(request.pool.map((card) => [card.id, card]));
  const deck = buildEvaluationDeck(poolById, proposal.maindeckCardInstanceIds, proposal.basicLands);
  const evaluation = evaluateDeck(deck, request.evaluationOptions);
  const landCount =
    BASIC_NAMES.reduce((sum, name) => sum + proposal.basicLands[name], 0) +
    proposal.maindeckCardInstanceIds.filter((id) => {
      const card = poolById.get(id);
      return (card?.isLand ?? false) || (card ? isModalLand(card) : false);
    }).length;
  return {
    ...proposal,
    sideboardCardInstanceIds: getSideboard(request.pool, proposal.maindeckCardInstanceIds),
    totalCardCount: 40,
    landCount,
    evaluation,
    source: provenance.source,
    provider: provenance.provider,
    model: provenance.model,
    promptVersion: FINAL_DECK_COACH_PROMPT_VERSION,
    engineVersion: evaluation.audit.formulaVersion,
    ...(provenance.fallbackReason ? { fallbackReason: provenance.fallbackReason } : {}),
  };
}

function buildFallback(
  request: Readonly<FinalDeckCoachRequest>,
  fallbackReason: NonNullable<FinalDeckRecommendation["fallbackReason"]>,
): FinalDeckRecommendation {
  const option = recommendDeckBuilds(request.pool, undefined, request.evaluationOptions)[0];
  if (option?.maindeck.length !== 40) {
    throw new Error("Aucune recommandation locale legale n'est disponible.");
  }
  const basicLands = countBasicLands(option.maindeck);
  const maindeckCardInstanceIds = option.maindeck.filter((id) => !id.startsWith("basic-"));
  const included = maindeckCardInstanceIds.slice(0, 2);
  const excluded = option.sideboard.slice(0, 2);
  const landCount =
    option.evaluation.landsCount +
    maindeckCardInstanceIds.filter((id) => {
      const card = request.pool.find((candidate) => candidate.id === id);
      return card ? isModalLand(card) : false;
    }).length;
  const proposal: ExternalFinalDeckProposal = {
    maindeckCardInstanceIds,
    basicLands,
    strategy: option.evaluation.archetype.description,
    primaryColors: option.evaluation.archetype.primaryColors,
    splashColors: option.evaluation.archetype.splashColors,
    includedReasons: included.map((id) => ({
      cardInstanceIds: [id],
      reason: `${request.pool.find((card) => card.id === id)?.name ?? id} soutient directement le plan principal.`,
    })),
    excludedReasons: excluded.map((id) => ({
      cardInstanceIds: [id],
      reason: `${request.pool.find((card) => card.id === id)?.name ?? id} est moins coherent avec les couleurs, la courbe ou les synergies retenues.`,
    })),
    manaRationale: `La base locale compte les terrains draftes, les fixeurs et les terrains basiques necessaires aux couleurs ${option.evaluation.archetype.primaryColors.join("/") || "incolores"}.`,
    landCountRationale: `La recommandation locale retient ${String(landCount)} sources de terrain pour cette courbe.`,
  };
  return finalizeRecommendation(request, proposal, {
    source: "fallback",
    provider: "DraftMaster local",
    model: null,
    fallbackReason,
  });
}

class DefaultFinalDeckCoach implements FinalDeckCoach {
  private readonly dependencies: Readonly<FinalDeckCoachDependencies>;

  public constructor(dependencies: Readonly<FinalDeckCoachDependencies>) {
    this.dependencies = dependencies;
  }

  public async recommend(
    request: Readonly<FinalDeckCoachRequest>,
  ): Promise<FinalDeckRecommendation> {
    if (!this.dependencies.generateJson) {
      return buildFallback(request, "COACH_UNAVAILABLE");
    }
    const prompt = buildFinalDeckCoachPrompt(request);
    let generated: FinalDeckJsonResult;
    try {
      generated = await this.dependencies.generateJson(prompt.system, prompt.user, {
        profile: FINAL_DECK_COACH_PROMPT_VERSION,
        preferBaseTier: true,
        maxTokens: 2400,
      });
    } catch {
      return buildFallback(request, "COACH_UNAVAILABLE");
    }
    const proposal = generated.success
      ? parseExternalProposal(generated.content, request.pool)
      : undefined;
    if (!proposal) {
      return buildFallback(
        request,
        generated.success ? "INVALID_EXTERNAL_RECOMMENDATION" : "COACH_UNAVAILABLE",
      );
    }
    return finalizeRecommendation(request, proposal, {
      source: "external",
      provider: generated.provider,
      model: generated.model ?? null,
    });
  }
}

export function createFinalDeckCoach(
  dependencies: Readonly<FinalDeckCoachDependencies> = {},
): FinalDeckCoach {
  return new DefaultFinalDeckCoach(dependencies);
}
