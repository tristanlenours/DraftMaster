import type { MasterCatalogCard } from "../cards/types.ts";
import {
  DEFAULT_BASIC_LANDS,
  evaluateDeck,
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
    return Array.from({ length: count }, () => ({
      id: `uploaded-${String(index++)}`,
      name: document.name,
      oracleId: document.oracleId,
      staticScore: document.powerScore.score,
      colors: document.colors,
      cmc: document.cmc,
      types: document.types,
      subtypes: document.subtypes,
      typeLine: document.typeLine,
      isLand: document.isLand,
      producesColors: document.producesColors,
      oracleText: document.oracleText,
      manaCost: document.manaCost,
      roles: document.objectiveAnalysis.roles,
    }));
  });
}

function expandBasics(counts: Readonly<Record<string, number>>): CardEvaluationInput[] {
  return BASIC_NAMES.flatMap((name) =>
    Array.from({ length: counts[name] ?? 0 }, () => BASIC_INPUTS[name]),
  );
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
  if (mode === "rate" && parsed.totalCount !== 40) {
    throw new DeckLabInputError("Rate my deck attend un maindeck de 40 cartes, terrains compris.");
  }
  if (mode === "pimp" && totalPoolCount > 45) {
    throw new DeckLabInputError("Pimp my deck accepte au maximum 45 cartes, réserve comprise.");
  }
  const sparsePool = countCards([...parsed.cards, ...parsed.sideboardCards]) < 20;

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
  const currentDeck = [...main, ...expandBasics(parsed.basicLands)];
  const input = {
    deckName: parsed.deckName,
    maindeckCount: parsed.totalCount,
    sideboardCount: parsed.sideboardCount,
    poolCount: totalPoolCount,
  };

  if (mode === "rate") {
    return {
      mode,
      input,
      rating: compactEvaluation(evaluateDeck(currentDeck, options), currentDeck),
      warnings:
        parsed.sideboardCount > 0
          ? [
              ...contextWarnings,
              `${String(parsed.sideboardCount)} carte(s) de réserve ignorée(s) dans la note.`,
            ]
          : contextWarnings,
    };
  }

  const pool = [...main, ...reserve];
  const byId = new Map(pool.map((card) => [card.id, card]));
  const previous =
    parsed.totalCount === 40
      ? compactEvaluation(evaluateDeck(currentDeck, options), currentDeck)
      : null;
  const proposal = recommendDeckBuilds(pool, DEFAULT_BASIC_LANDS, options)[0];
  if (!proposal) throw new DeckLabInputError("Aucune construction de deck n'a été trouvée.");
  const basicsById = new Map(Object.values(BASIC_INPUTS).map((card) => [card.id, card]));
  const proposedDeck = proposal.maindeck.flatMap((id) => {
    const card = byId.get(id) ?? basicsById.get(id);
    return card ? [card] : [];
  });
  const useCurrent = previous !== null && previous.score >= proposal.evaluation.overallScore;
  const chosenIds = useCurrent
    ? main.map((card) => card.id)
    : proposal.maindeck.filter((id) => byId.has(id));
  const chosen = new Set(chosenIds);
  const mainIds = new Set(main.map((card) => card.id));
  const basicLands = Object.fromEntries(
    BASIC_NAMES.map((name) => [
      name,
      useCurrent
        ? parsed.basicLands[name]
        : proposal.maindeck.filter((id) => id === BASIC_INPUTS[name].id).length,
    ]),
  );
  return {
    mode,
    input,
    before: previous,
    rating: useCurrent ? previous : compactEvaluation(proposal.evaluation, proposedDeck),
    build: {
      title: useCurrent ? "Deck actuel conservé" : proposal.title,
      keep: summarize(chosenIds, byId),
      add: summarize(
        chosenIds.filter((id) => !mainIds.has(id)),
        byId,
      ),
      remove: summarize(
        main.filter((card) => !chosen.has(card.id)).map((card) => card.id),
        byId,
      ),
      reserve: summarize(
        pool.filter((card) => !chosen.has(card.id)).map((card) => card.id),
        byId,
      ),
      basicLands,
      improved: previous === null ? null : !useCurrent,
    },
    warnings: [
      ...contextWarnings,
      ...(sparsePool
        ? ["Moins de 20 cartes hors terrains de base : la construction proposée est préliminaire."]
        : []),
      ...(previous === null
        ? ["La liste initiale ne contient pas 40 cartes : aucune note avant modification."]
        : useCurrent
          ? [
              "Aucune construction du pool ne dépasse la note du deck actuel selon cette heuristique.",
            ]
          : []),
    ],
  };
}
