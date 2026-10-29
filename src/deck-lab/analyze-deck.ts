import type { MasterCatalogCard } from "../cards/types.ts";
import { toCardEvaluationInput } from "../cards/evaluation-input.ts";
import {
  DEFAULT_BASIC_LANDS,
  MIN_BUILD_NONLAND_CARDS,
  PROPOSAL_LOCAL_SEARCH,
  allocateBasicLands,
  evaluateDeck,
  optimizeDeck,
  recommendDeckBuilds,
  type CardEvaluationInput,
  type DeckEvaluation,
  type DeckEvaluationOptions,
} from "../domain/coaching/index.ts";
import { MtgaDeckTextError, parseMtgaDeckText } from "../web/mtga-deck-text.js";

export type DeckLabMode = "rate" | "pimp";

export interface DeckLabCatalog {
  resolveCard(name: string): MasterCatalogCard | undefined;
}

export class DeckLabInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeckLabInputError";
  }
}

interface NamedCount {
  readonly name: string;
  readonly count: number;
}

const BASIC_NAMES = ["Plains", "Island", "Swamp", "Mountain", "Forest"] as const;
/** Rate completes a short list with virtual basics only up to this many lands. */
const MAX_RATE_LAND_COUNT = 18;
/** Pimp lists at most this many swaps from the submitted deck. */
const RETOUCH_MAX_SWAPS = 3;
const BASIC_INPUTS = {
  Plains: DEFAULT_BASIC_LANDS.W,
  Island: DEFAULT_BASIC_LANDS.U,
  Swamp: DEFAULT_BASIC_LANDS.B,
  Mountain: DEFAULT_BASIC_LANDS.R,
  Forest: DEFAULT_BASIC_LANDS.G,
};

function countCards(cards: readonly NamedCount[]): number {
  return cards.reduce((sum, card) => sum + card.count, 0);
}

function expandCards(
  cards: readonly NamedCount[],
  catalog: DeckLabCatalog,
  offset: number,
): CardEvaluationInput[] {
  let index = offset;
  return cards.flatMap(({ name, count }) => {
    const document = catalog.resolveCard(name);
    if (!document) return [];
    return Array.from({ length: count }, () =>
      toCardEvaluationInput(document, `uploaded-${String(index++)}`),
    );
  });
}

function expandBasics(counts: Readonly<Record<string, number>>): CardEvaluationInput[] {
  return BASIC_NAMES.flatMap((name) =>
    Array.from({ length: counts[name] ?? 0 }, () => BASIC_INPUTS[name]),
  );
}

function virtualBasicsForRate(
  cards: readonly CardEvaluationInput[],
  supplied: Readonly<Record<string, number>>,
  missing: number,
): NamedCount[] {
  const colors = ["W", "U", "B", "R", "G"] as const;
  const allocation = allocateBasicLands(
    cards.filter((card) => !card.isLand),
    [...cards.filter((card) => card.isLand), ...expandBasics(supplied)],
    colors,
    missing,
  );
  return colors.flatMap((color, index) => {
    const name = BASIC_NAMES[index];
    return name && allocation[color] > 0 ? [{ name, count: allocation[color] }] : [];
  });
}

function summarize(
  ids: readonly string[],
  cards: ReadonlyMap<string, CardEvaluationInput>,
): NamedCount[] {
  const counts = new Map<string, number>();
  for (const id of ids) {
    const name = cards.get(id)?.name;
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts].map(([name, count]) => ({ name, count }));
}

function compactEvaluation(evaluation: DeckEvaluation, deck: readonly CardEvaluationInput[]) {
  const synergy = evaluation.audit.synergy.bestArchetype;
  const strongest = [...deck]
    .filter((card) => !card.isLand)
    .sort((left, right) => right.staticScore - left.staticScore)
    .slice(0, 3)
    .map((card) => card.name);
  return {
    score: evaluation.overallScore,
    tier: evaluation.overallTier,
    axes: evaluation.radar,
    archetype: evaluation.archetype.label,
    strengths: evaluation.strengths,
    weaknesses: evaluation.weaknesses,
    recommendations: evaluation.recommendations,
    evidence: {
      power: { average: evaluation.audit.power.meanStaticScore, examples: strongest },
      synergy: {
        archetype: synergy?.name ?? null,
        alignedCount: synergy?.alignedCardCount ?? 0,
        examples: synergy?.families.flatMap((family) => family.matchedCards).slice(0, 3) ?? [],
      },
      curve: {
        earlyActions: evaluation.audit.curve.earlyActionCount,
        averageCost: evaluation.audit.curve.effectiveAverageCmc,
      },
      mana: {
        lands: evaluation.audit.mana.landCount,
        colors: evaluation.audit.mana.usedColors.map((color) => ({
          color,
          sources: evaluation.audit.mana.sourcesByColor[color],
          target: evaluation.audit.mana.targetSourcesByColor[color],
        })),
      },
      interaction: {
        count: evaluation.audit.interaction.cards.length,
        examples: evaluation.audit.interaction.cards.slice(0, 3).map((card) => card.name),
      },
    },
    formulaVersion: evaluation.audit.formulaVersion,
    scoreMeaning: evaluation.audit.scoreMeaning,
    audit: evaluation.audit,
  };
}

export function analyzeDeckText(
  text: string,
  mode: DeckLabMode,
  catalog: DeckLabCatalog,
  options: DeckEvaluationOptions = {},
  cubeOracleIds?: ReadonlySet<string>,
) {
  let parsed: ReturnType<typeof parseMtgaDeckText>;
  try {
    parsed = parseMtgaDeckText(text);
  } catch (error: unknown) {
    if (error instanceof MtgaDeckTextError) throw new DeckLabInputError(error.message);
    throw error;
  }

  const totalPoolCount = parsed.totalCount + parsed.sideboardCount;
  const nonbasicPoolCount = countCards([...parsed.cards, ...parsed.sideboardCards]);
  if (mode === "rate" && parsed.totalCount > 40) {
    throw new DeckLabInputError("Rate my deck accepte au maximum 40 cartes dans le maindeck.");
  }
  if (mode === "pimp" && nonbasicPoolCount > 45) {
    throw new DeckLabInputError(
      "Pimp my deck accepte au maximum 45 cartes non basiques, réserve comprise.",
    );
  }

  const analyzedCards =
    mode === "rate" ? parsed.cards : [...parsed.cards, ...parsed.sideboardCards];
  const unknownNames = analyzedCards
    .filter(({ name }) => !catalog.resolveCard(name))
    .map(({ name }) => name);
  if (unknownNames.length > 0) {
    throw new DeckLabInputError(
      `Cartes absentes du catalogue local : ${[...new Set(unknownNames)].join(", ")}. Corrigez les noms avant l'analyse.`,
    );
  }
  const seenOracleIds = new Set<string>();
  for (const { name, count } of [...parsed.cards, ...parsed.sideboardCards]) {
    const oracleId = catalog.resolveCard(name)?.oracleId;
    if (!oracleId) continue;
    if (count !== 1 || seenOracleIds.has(oracleId)) {
      throw new DeckLabInputError(
        `En cube, un seul exemplaire de chaque carte non basique est autorisé : ${name}.`,
      );
    }
    seenOracleIds.add(oracleId);
  }
  const outsideCube = cubeOracleIds
    ? analyzedCards
        .filter(({ name }) => {
          const card = catalog.resolveCard(name);
          return card !== undefined && !cubeOracleIds.has(card.oracleId);
        })
        .map(({ name }) => name)
    : [];
  const contextWarnings =
    outsideCube.length > 0
      ? [
          `${String(outsideCube.length)} carte(s) absente(s) du snapshot de cube choisi : ${[...new Set(outsideCube)].join(", ")}. Le profil de synergie couvre imparfaitement ce deck.`,
        ]
      : [];

  const main = expandCards(parsed.cards, catalog, 0);
  const reserve = expandCards(parsed.sideboardCards, catalog, main.length);
  if (
    mode === "pimp" &&
    [...main, ...reserve].filter((card) => !card.isLand).length < MIN_BUILD_NONLAND_CARDS
  ) {
    throw new DeckLabInputError(
      `Pimp my deck demande au moins ${String(MIN_BUILD_NONLAND_CARDS)} cartes hors terrain distinctes. Les cartes recto sort, verso terrain comptent comme terrains.`,
    );
  }
  if (mode === "rate" && parsed.totalCount < 40) {
    const landCount =
      main.filter((card) => card.isLand).length +
      BASIC_NAMES.reduce((sum, name) => sum + parsed.basicLands[name], 0);
    const missingSpells = 40 - parsed.totalCount - Math.max(0, MAX_RATE_LAND_COUNT - landCount);
    if (missingSpells > 0) {
      throw new DeckLabInputError(
        `Liste incomplète : ${String(parsed.totalCount - landCount)} sorts et ${String(landCount)} terrains. Il manque au moins ${String(missingSpells)} sort(s) pour un deck de 40 cartes ; des terrains virtuels ne peuvent pas les remplacer. Complétez la liste ou analysez votre pool avec Pimp my deck.`,
      );
    }
  }
  const virtualBasicLands =
    mode === "rate" ? virtualBasicsForRate(main, parsed.basicLands, 40 - parsed.totalCount) : [];
  const currentDeck = [
    ...main,
    ...expandBasics(parsed.basicLands),
    ...virtualBasicLands.flatMap(({ name, count }) =>
      Array.from({ length: count }, () => BASIC_INPUTS[name as (typeof BASIC_NAMES)[number]]),
    ),
  ];
  const input = {
    deckName: parsed.deckName,
    maindeckCount: parsed.totalCount,
    sideboardCount: parsed.sideboardCount,
    poolCount: totalPoolCount,
    nonbasicPoolCount,
    virtualBasicLands,
  };

  if (mode === "rate") {
    return {
      mode,
      input,
      rating: compactEvaluation(evaluateDeck(currentDeck, options), currentDeck),
      warnings: [
        ...contextWarnings,
        ...(virtualBasicLands.length > 0
          ? [
              `${String(40 - parsed.totalCount)} terrain(s) de base virtuel(s) ajouté(s) pour atteindre 40 cartes : ${virtualBasicLands.map(({ name, count }) => `${String(count)} ${name}`).join(", ")}. Vérifiez la répartition avant de jouer.`,
            ]
          : []),
        ...(parsed.sideboardCount > 0
          ? [`${String(parsed.sideboardCount)} carte(s) de réserve ignorée(s) dans la note.`]
          : []),
      ],
    };
  }

  const pool = [...main, ...reserve];
  const byId = new Map(pool.map((card) => [card.id, card]));
  const previous =
    parsed.totalCount === 40
      ? compactEvaluation(evaluateDeck(currentDeck, options), currentDeck)
      : null;
  const proposal = recommendDeckBuilds(pool, DEFAULT_BASIC_LANDS, options, {
    localSearch: PROPOSAL_LOCAL_SEARCH,
  })[0];
  if (!proposal) throw new DeckLabInputError("Aucune construction de deck n'a été trouvée.");
  const basicsById = new Map(Object.values(BASIC_INPUTS).map((card) => [card.id, card]));
  const proposedDeck = proposal.maindeck.flatMap((id) => {
    const card = byId.get(id) ?? basicsById.get(id);
    return card ? [card] : [];
  });
  // Swaps from the submitted deck come first: they keep the player's plan and explain each gain.
  const retouched =
    previous === null
      ? null
      : optimizeDeck(currentDeck, reserve, options, {
          maxSwaps: RETOUCH_MAX_SWAPS,
          basics: DEFAULT_BASIC_LANDS,
        });
  const useCurrent =
    retouched !== null && retouched.evaluation.overallScore >= proposal.evaluation.overallScore;
  const chosenDeck = useCurrent ? retouched.maindeck : proposedDeck;
  const chosenIds = chosenDeck.filter((card) => byId.has(card.id)).map((card) => card.id);
  const chosen = new Set(chosenIds);
  const mainIds = new Set(main.map((card) => card.id));
  const basicLands = Object.fromEntries(
    BASIC_NAMES.map((name) => [
      name,
      chosenDeck.filter((card) => card === BASIC_INPUTS[name]).length,
    ]),
  );
  const addedBasics = BASIC_NAMES.flatMap((name) => {
    const count = (basicLands[name] ?? 0) - parsed.basicLands[name];
    return count > 0 ? [{ name, count }] : [];
  });
  const removedBasics = BASIC_NAMES.flatMap((name) => {
    const count = parsed.basicLands[name] - (basicLands[name] ?? 0);
    return count > 0 ? [{ name, count }] : [];
  });
  const keptBasics = BASIC_NAMES.flatMap((name) => {
    const count = Math.min(parsed.basicLands[name], basicLands[name] ?? 0);
    return count > 0 ? [{ name, count }] : [];
  });
  const unusedBasics = BASIC_NAMES.flatMap((name) => {
    const count = Math.max(
      0,
      parsed.basicLands[name] + parsed.sideboardBasicLands[name] - (basicLands[name] ?? 0),
    );
    return count > 0 ? [{ name, count }] : [];
  });
  return {
    mode,
    input,
    before: previous,
    rating: useCurrent
      ? compactEvaluation(retouched.evaluation, retouched.maindeck)
      : compactEvaluation(proposal.evaluation, proposedDeck),
    retouch:
      retouched === null || previous === null
        ? null
        : {
            scoreBefore: previous.score,
            scoreAfter: retouched.evaluation.overallScore,
            swaps: retouched.swaps.map((swap) => ({
              remove: swap.removed.name,
              add: swap.added.name,
              scoreBefore: swap.scoreBefore,
              scoreAfter: swap.scoreAfter,
              axes: swap.axisDeltas,
            })),
          },
    build: {
      title: useCurrent
        ? retouched.swaps.length > 0
          ? "Deck actuel retouché"
          : "Deck actuel conservé"
        : proposal.title,
      final: summarize(chosenIds, byId),
      keep: [
        ...summarize(
          chosenIds.filter((id) => mainIds.has(id)),
          byId,
        ),
        ...keptBasics,
      ],
      add: [
        ...summarize(
          chosenIds.filter((id) => !mainIds.has(id)),
          byId,
        ),
        ...addedBasics,
      ],
      remove: [
        ...summarize(
          main.filter((card) => !chosen.has(card.id)).map((card) => card.id),
          byId,
        ),
        ...removedBasics,
      ],
      reserve: [
        ...summarize(
          pool.filter((card) => !chosen.has(card.id)).map((card) => card.id),
          byId,
        ),
        ...unusedBasics,
      ],
      basicLands,
      improved:
        previous === null
          ? null
          : (useCurrent ? retouched.evaluation : proposal.evaluation).overallScore > previous.score,
    },
    warnings: [
      ...contextWarnings,
      ...(previous === null
        ? ["La liste initiale ne contient pas 40 cartes : aucune note avant modification."]
        : useCurrent && retouched.swaps.length === 0
          ? [
              "Aucun échange ni aucune construction du pool ne dépasse la note du deck actuel selon cette heuristique.",
            ]
          : []),
    ],
  };
}
