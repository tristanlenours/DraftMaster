import { loadSnapshot } from "../cubes/load-snapshot.ts";
import { CardCatalog } from "../cards/card-catalog.ts";
import type { CubeSnapshot } from "../cubes/validate-snapshot.ts";
import {
  getDraftView,
  buildDraftReport,
  startDraft,
  submitPickRound,
  type BoostersDealtEvent,
  type CardPickedEvent,
  type DraftConfiguration,
  type DraftError,
  type DraftReport,
  type Result,
  type SeatDecision,
  type SeatId,
  type SeatPolicyDescriptor,
  type StartDraftInput,
  type SubmitPickRound,
} from "../draft/index.ts";
import { failure, success } from "../draft/internal/errors.ts";
import {
  deriveStreamSeed,
  getPolicyStreamName,
  RANDOM_SYSTEM_METADATA,
} from "../random/seeded-random.ts";
import type {
  PickBiasContribution,
  PickContext,
  PickDecisionTrace,
  PickPolicy,
} from "../bots/pick-policy.ts";
import { createCoachedBotPolicy } from "../bots/coached-bot-policy.ts";
import {
  createFriendBotPolicy,
  createFriendTablePolicies,
  DEFAULT_FRIEND_SEAT_PROFILES,
  THEO_PROFILE,
  type FriendProfile,
} from "../bots/friends/index.ts";
import { evaluatePack } from "../domain/coaching/dynamic-score.ts";
import { generateCoachingExplanation } from "../domain/coaching/coaching-explainer.ts";
import { recommendDeckBuilds } from "../domain/coaching/deck-recommender.ts";
import { evaluateDeck } from "../domain/coaching/deck-evaluation.ts";
import type {
  CardEvaluationInput,
  CoachingScoreBreakdown,
  DeckArchetype,
  DeckEvaluationAudit,
  KiviatRadarScores,
  MtGColor,
  PackEvaluationContext,
} from "../domain/coaching/types.ts";
import { createSessionIdentityGenerator } from "../cli/session-identity.ts";

export interface EnrichedCard {
  readonly instanceId: string;
  readonly oracleId: string;
  readonly name: string;
  readonly manaCost?: string | undefined;
  readonly cmc: number;
  readonly typeLine: string;
  readonly types: readonly string[];
  readonly colors: readonly MtGColor[];
  readonly isLand: boolean;
  readonly staticScore: number;
  readonly isBomb?: boolean | undefined;
  readonly imageUrl?: string | undefined;
  readonly localImagePath?: string | undefined;
  readonly slug?: string | undefined;
  readonly frenchName?: string | undefined;
  readonly frenchText?: string | undefined;
  readonly frenchImageUrl?: string | undefined;
  readonly localFrenchImagePath?: string | undefined;
  readonly oracleText?: string | undefined;
  readonly howToPlay?: string | undefined;
}

export interface DetailedBoosterCard extends EnrichedCard {
  readonly dynamicScore: number;
  readonly rankInPack: number;
  readonly isPicked: boolean;
  readonly delta: number;
  readonly justification: string;
  readonly coachingBreakdown: Readonly<CoachingScoreBreakdown>;
  readonly biasContributions: readonly Readonly<PickBiasContribution>[];
  readonly personalityBonus: number;
  readonly friendBonus: number;
  readonly policyScore: number;
  readonly selectionProbability: number;
  readonly policyRank: number;
}

export interface PickWalkthroughStep {
  readonly roundIndex: number; // 0..44
  readonly packNumber: 1 | 2 | 3;
  readonly pickNumber: number; // 1..15
  readonly seatId: SeatId;
  readonly boosterId: string;
  readonly eventSequence: number;
  readonly decisionTrace: Readonly<PickDecisionTrace>;
  readonly boosterCards: readonly DetailedBoosterCard[];
  readonly pickedCardInstanceId: string;
  readonly pickedCardName: string;
  readonly justification: string;
  readonly poolSoFar: readonly EnrichedCard[];
}

export interface FinalDeckSummary {
  readonly maindeckSpells: readonly EnrichedCard[]; // ~23 non-land spells
  readonly maindeckLands: readonly EnrichedCard[]; // ~17 lands
  readonly allMaindeck: readonly EnrichedCard[]; // 40 cards total
  readonly sideboard: readonly EnrichedCard[]; // ~22 cards
  readonly archetype: DeckArchetype;
  readonly overallScore: number;
  readonly radar: KiviatRadarScores;
  readonly audit: DeckEvaluationAudit;
  readonly macroAxes: {
    readonly power: number;
    readonly synergy: number;
    readonly consistency: number; // Courbe + Mana
  };
  readonly strengths: readonly string[];
  readonly weaknesses: readonly string[];
  readonly recommendations: readonly string[];
}

export interface SeatDraftSummary {
  readonly seatId: SeatId;
  readonly botId: string;
  readonly botName: string;
  readonly title: string;
  readonly quote: string;
  readonly level: string;
  readonly preferredColors?: readonly MtGColor[] | undefined;
  readonly steps: readonly PickWalkthroughStep[];
  readonly finalDeck: FinalDeckSummary;
}

export interface InitialDealtBooster {
  readonly boosterId: string;
  readonly packNumber: 1 | 2 | 3;
  readonly originSeatId: SeatId;
  readonly originBotName: string;
  readonly cards: readonly EnrichedCard[];
}

export interface DetailedDraftReport {
  readonly schemaVersion: 2;
  readonly cubeKey: string;
  readonly cubeName: string;
  readonly seed: number;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly bombDefinition: CubeBombDefinition;
  readonly draftReport: Readonly<DraftReport>;
  readonly seats: readonly SeatDraftSummary[];
  readonly initialBoosters?: readonly InitialDealtBooster[] | undefined;
}

export interface CubeBombDefinition {
  readonly kind: "top-percentile";
  readonly percentile: 0.05;
  readonly scoreField: "powerScore.score";
  readonly includeCutoffTies: true;
  readonly rankedUniqueCards: number;
  readonly cutoffScore: number;
  readonly bombCardCount: number;
}

interface CubeBombClassification {
  readonly definition: CubeBombDefinition;
  readonly oracleIds: ReadonlySet<string>;
}

export interface RunDetailedSimulationOptions {
  readonly cubePath?: string;
  readonly masterCatalogPath?: string;
  readonly seed?: number;
  readonly sessionId?: string;
}

export async function runDetailedDraftSimulation(
  options: RunDetailedSimulationOptions = {},
): Promise<Result<DetailedDraftReport, DraftError>> {
  const cubePath = options.cubePath ?? "data/cubes/titou_tribal/2026-02-24.1.json";
  const catalogPath = options.masterCatalogPath ?? "data/cards/master-cards.json";
  const seed = options.seed ?? 42;
  const identityGenerator = createSessionIdentityGenerator();
  const identity = identityGenerator.create(seed);
  const sessionId = options.sessionId ?? identity.sessionId;
  const startedAt = new Date().toISOString();

  // 1. Load snapshot
  const snapshotResult = await loadSnapshot(cubePath);
  if (!snapshotResult.ok) {
    return failure("INVALID_SNAPSHOT", snapshotResult.error.message, { ...snapshotResult.error });
  }
  const snapshot: CubeSnapshot = snapshotResult.value;

  // 2. Load master catalog
  const catalogResult = await CardCatalog.fromFile(catalogPath);
  if (!catalogResult.ok) {
    return failure("INVALID_SNAPSHOT", catalogResult.error.message, { ...catalogResult.error });
  }
  const catalog = catalogResult.value;

  const bombClassification = classifyCubeBombs(snapshot, catalog);

  // 3. Build instance to card resolver
  const instanceToInputMap = new Map<string, CardEvaluationInput>();
  const instanceToEnrichedMap = new Map<string, EnrichedCard>();

  for (const card of snapshot.cards) {
    const doc = catalog.getCardByOracleId(card.oracleId) ?? catalog.getCardByName(card.name);
    const name = doc?.name ?? card.name;
    const staticScore = doc ? doc.powerScore.score : 28;
    const colors = (doc?.colors ?? []) as MtGColor[];
    const cmc = doc?.cmc ?? 0;
    const types = doc?.types ?? [];
    const subtypes = doc?.subtypes ?? [];
    const typeLine = doc?.typeLine ?? "Card";
    const isLand = doc?.isLand ?? false;
    const producesColors = (doc?.producesColors ?? []) as MtGColor[];
    const oracleText = doc?.oracleText ?? "";
    const manaCost = doc?.manaCost ?? "";
    const oracleId = doc?.oracleId ?? card.oracleId;
    const slug = doc?.slug;
    const imageUrl =
      doc?.image?.url ??
      `https://api.scryfall.com/cards/named?format=image&exact=${encodeURIComponent(name)}`;
    const localImagePath = doc?.image?.localPath ?? `data/cards/images/${slug ?? "unknown"}.jpg`;

    const evalInput: CardEvaluationInput = {
      id: card.instanceId,
      name,
      staticScore,
      colors,
      cmc,
      types,
      subtypes,
      typeLine,
      isLand,
      producesColors,
      oracleText,
      manaCost,
      oracleId,
    };
    instanceToInputMap.set(card.instanceId, evalInput);

    const analysis =
      doc?.cubeAnalyses[snapshot.cubeKey] ?? (doc ? Object.values(doc.cubeAnalyses)[0] : undefined);
    const howToPlay =
      analysis?.pedagogy?.howToPlay ?? analysis?.analysis ?? doc?.objectiveAnalysis.summary;

    const enriched: EnrichedCard = {
      instanceId: card.instanceId,
      oracleId,
      name,
      manaCost,
      cmc,
      typeLine,
      types,
      colors,
      isLand,
      staticScore,
      isBomb: bombClassification.oracleIds.has(oracleId),
      imageUrl,
      localImagePath,
      slug,
      frenchName: doc?.frenchName,
      frenchText: doc?.frenchText,
      frenchImageUrl: doc?.frenchImageUrl,
      localFrenchImagePath: doc?.image?.localFrenchPath ?? doc?.localFrenchPath,
      oracleText,
      howToPlay,
    };
    instanceToEnrichedMap.set(card.instanceId, enriched);
  }

  const resolveCard = (id: string): CardEvaluationInput | undefined => instanceToInputMap.get(id);

  // 4. Configure 8 seats & policies
  const evaluationContext = { cubeKey: snapshot.cubeKey, catalog } as const;
  const friendTable = createFriendTablePolicies({ resolveCard, evaluationContext });
  const policies: PickPolicy[] = [
    createFriendBotPolicy({ profile: THEO_PROFILE, resolveCard, evaluationContext }),
    ...friendTable.slice(1).map((p, i) => {
      if (!p) {
        return createCoachedBotPolicy({
          resolveCard,
          id: `fallback-bot-${String(i + 1)}`,
          version: "1.0.0",
        });
      }
      return p;
    }),
  ];

  const seatProfiles: readonly FriendProfile[] = [
    THEO_PROFILE,
    ...DEFAULT_FRIEND_SEAT_PROFILES.slice(1).map(
      (p, i) =>
        p ?? {
          id: `seat-${String(i + 1)}`,
          name: `Bot ${String(i + 1)}`,
          title: "Bot Invité",
          quote: "Prêt à drafter.",
          level: "medium" as const,
          temperature: 1.0,
          biases: {},
        },
    ),
  ];

  const seatPolicies: readonly SeatPolicyDescriptor[] = policies.map((policy, index) => ({
    seatId: index as SeatId,
    policyId: policy.id,
    policyVersion: policy.version,
  }));

  const configuration: DraftConfiguration = {
    seatCount: 8,
    packCount: 3,
    cardsPerBooster: 15,
    directions: ["left", "right", "left"],
    controlledSeatId: 0,
  };

  const startInput: StartDraftInput = {
    snapshot,
    sessionId,
    seed,
    startedAt,
    engineVersion: "draft-engine@1.0.0",
    randomSystem: RANDOM_SYSTEM_METADATA,
    seatPolicies,
    configuration,
  };

  const startResult = startDraft(startInput);
  if (!startResult.ok) {
    return startResult;
  }

  const dealtEvent = startResult.value.appendedEvents.find(
    (e): e is BoostersDealtEvent => e.type === "BoostersDealt",
  );

  let currentDraft = startResult.value.draft;

  // Initialize per-seat history containers
  const seatStepsMap = new Map<SeatId, PickWalkthroughStep[]>();
  for (let s = 0; s < 8; s++) {
    seatStepsMap.set(s as SeatId, []);
  }

  // 5. Run all 45 rounds, capturing complete booster states and justifications
  for (let round = 0; round < 45; round++) {
    const view = getDraftView(currentDraft);
    if (view.status === "completed") {
      break;
    }

    const packNumber = view.packNumber;
    const pickNumber = view.pickNumber;
    const occurredAt = new Date(Date.parse(startedAt) + (round + 1) * 1000).toISOString();
    const decisions: SeatDecision[] = [];
    const roundSteps = new Map<SeatId, Omit<PickWalkthroughStep, "eventSequence">>();

    for (let seatIdx = 0; seatIdx < 8; seatIdx++) {
      const sId = seatIdx as SeatId;
      const seatView = view.seats[sId];
      const currentBooster = seatView?.currentBooster;
      if (!currentBooster) {
        return failure("INVARIANT_VIOLATION", "A drafting seat has no current booster", {
          seatId: sId,
          round,
        });
      }
      const boosterInstanceIds = currentBooster.remainingCardInstanceIds;
      const priorPoolInstanceIds = seatView.priorPool;

      const offeredInputs: CardEvaluationInput[] = boosterInstanceIds.map(
        (id) =>
          resolveCard(id) ?? {
            id,
            name: id,
            staticScore: 25,
            colors: [],
          },
      );

      const priorInputs: CardEvaluationInput[] = priorPoolInstanceIds.map(
        (id) =>
          resolveCard(id) ?? {
            id,
            name: id,
            staticScore: 25,
            colors: [],
          },
      );

      // Evaluate pack dynamically
      const evalContext: PackEvaluationContext = {
        ...evaluationContext,
        packNumber,
        pickNumber,
        offeredCards: offeredInputs,
        priorPool: priorInputs,
      };
      const evaluatedCards = evaluatePack(evalContext);
      const evalMap = new Map<string, (typeof evaluatedCards)[number]>(
        evaluatedCards.map((c) => [c.id, c]),
      );

      // Let the seat's policy choose
      const policy = policies[sId];
      if (!policy) {
        return failure("UNKNOWN_SEAT", `Missing policy for seat ${String(sId)}`);
      }

      const streamName = getPolicyStreamName(sId);
      const derivedSeed = deriveStreamSeed(seed, streamName);
      const context: PickContext = {
        derivedSeed,
        streamName,
        seatId: sId,
        packNumber,
        pickNumber,
        currentBooster: boosterInstanceIds,
        priorPool: priorPoolInstanceIds,
      };

      const choiceResult = policy.choose(context);
      if (!choiceResult.ok) {
        return failure("POLICY_FAILED", choiceResult.error.message, {
          seatId: sId,
          round,
          ...choiceResult.error.details,
        });
      }

      const chosenInstanceId = choiceResult.value.cardInstanceId;
      const decisionTrace = choiceResult.value.trace;
      if (!decisionTrace) {
        return failure("POLICY_FAILED", "Detailed simulation policy returned no decision trace", {
          seatId: sId,
          round,
          policyId: policy.id,
        });
      }
      decisions.push({
        seatId: sId,
        cardInstanceId: chosenInstanceId,
        source: {
          kind: "policy",
          policyId: policy.id,
          policyVersion: policy.version,
        },
      });

      // Project the exact policy trace onto the enriched report cards.
      const profile = seatProfiles[sId] ?? THEO_PROFILE;
      const boosterDetailed: DetailedBoosterCard[] = boosterInstanceIds.map((instanceId, idx) => {
        const enriched = instanceToEnrichedMap.get(instanceId) ?? {
          instanceId,
          oracleId: instanceId,
          name: instanceId,
          cmc: 0,
          typeLine: "Card",
          types: [],
          colors: [],
          isLand: false,
          staticScore: 25,
        };

        const ev = evalMap.get(instanceId);
        const candidateTrace = decisionTrace.candidates.find(
          (candidate) => candidate.cardInstanceId === instanceId,
        );
        const dynamicScore =
          candidateTrace?.dynamicScore ?? ev?.dynamicScore ?? enriched.staticScore;
        const rankInPack = evaluatedCards.findIndex((c) => c.id === instanceId) + 1;
        const delta = ev?.delta ?? 0;
        const isPicked = instanceId === chosenInstanceId;
        const coachingBreakdown = candidateTrace?.coachingBreakdown ??
          ev?.breakdown ?? {
            colorAffinityFactor: 1,
            colorPenalty: 0,
            manaFixingBonus: 0,
            curveBonus: 0,
            rawDynamicScore: dynamicScore,
          };

        let justification = ev?.explanation ?? "";
        if (justification === "" && ev) {
          justification = generateCoachingExplanation(
            ev,
            ev.breakdown,
            rankInPack > 0 ? rankInPack : idx + 1,
            boosterInstanceIds.length,
            evalContext,
          );
        }

        return {
          ...enriched,
          dynamicScore,
          rankInPack: rankInPack > 0 ? rankInPack : idx + 1,
          isPicked,
          delta,
          justification,
          coachingBreakdown,
          biasContributions: candidateTrace?.biasContributions ?? [],
          personalityBonus: candidateTrace?.personalityBonus ?? 0,
          friendBonus: candidateTrace?.personalityBonus ?? 0,
          policyScore: candidateTrace?.policyScore ?? dynamicScore,
          selectionProbability: candidateTrace?.selectionProbability ?? 0,
          policyRank: candidateTrace?.policyRank ?? rankInPack,
        };
      });

      // Sort boosterDetailed by dynamicScore descending
      boosterDetailed.sort((a, b) => b.dynamicScore - a.dynamicScore);

      // Create rich explanation for the picked card
      const pickedDetailed = boosterDetailed.find((c) => c.instanceId === chosenInstanceId);
      const chosenName = pickedDetailed?.name ?? chosenInstanceId;

      let finalJustification = pickedDetailed?.justification ?? "";
      const biasSummary = pickedDetailed?.biasContributions
        .map(
          (contribution) =>
            `${contribution.label} ${contribution.points >= 0 ? "+" : ""}${String(contribution.points)}`,
        )
        .join(", ");
      if (biasSummary) {
        finalJustification += ` (Biais ${profile.name} : ${biasSummary} pts)`;
      }

      // Prior pool enriched objects
      const poolSoFar: EnrichedCard[] = priorPoolInstanceIds.map(
        (id) =>
          instanceToEnrichedMap.get(id) ?? {
            instanceId: id,
            oracleId: id,
            name: id,
            cmc: 0,
            typeLine: "Card",
            types: [],
            colors: [],
            isLand: false,
            staticScore: 25,
          },
      );

      // Record step for this seat
      const step: Omit<PickWalkthroughStep, "eventSequence"> = {
        roundIndex: round,
        packNumber,
        pickNumber,
        seatId: sId,
        boosterId: currentBooster.boosterId,
        decisionTrace,
        boosterCards: boosterDetailed,
        pickedCardInstanceId: chosenInstanceId,
        pickedCardName: chosenName,
        justification: finalJustification,
        poolSoFar,
      };

      roundSteps.set(sId, step);
    }

    const roundCommand: SubmitPickRound = {
      sessionId,
      expectedRevision: view.revision,
      packNumber,
      pickNumber,
      occurredAt,
      decisions,
    };

    const roundResult = submitPickRound(currentDraft, roundCommand);
    if (!roundResult.ok) {
      return roundResult;
    }

    const pickedEvents = roundResult.value.appendedEvents.filter(
      (event): event is CardPickedEvent => event.type === "CardPicked",
    );
    for (const [seatId, step] of roundSteps) {
      const pickedEvent = pickedEvents.find((event) => event.seatId === seatId);
      if (!pickedEvent) {
        return failure("INVARIANT_VIOLATION", "Canonical journal is missing a pick event", {
          seatId,
          round,
        });
      }
      seatStepsMap.get(seatId)?.push({ ...step, eventSequence: pickedEvent.sequence });
    }

    currentDraft = roundResult.value.draft;
  }

  // 6. Build final decks (23 cards + 17 lands) and evaluate for all 8 seats
  const completedAt = new Date().toISOString();
  const seatsSummary: SeatDraftSummary[] = [];
  const finalDraftView = getDraftView(currentDraft);
  const draftReportResult = buildDraftReport(currentDraft);
  if (!draftReportResult.ok) {
    return draftReportResult;
  }

  for (let s = 0; s < 8; s++) {
    const sId = s as SeatId;
    const poolInstanceIds: readonly string[] = finalDraftView.seats[sId]?.priorPool ?? [];
    const poolInputs: CardEvaluationInput[] = poolInstanceIds.map(
      (id: string) =>
        instanceToInputMap.get(id) ?? {
          id,
          name: id,
          staticScore: 25,
          colors: [],
        },
    );

    // Recommend deck build (23 playables + 17 lands)
    const deckOptions = recommendDeckBuilds(poolInputs, undefined, {
      bombThreshold: bombClassification.definition.cutoffScore,
    });
    const bestOption = deckOptions[0];

    // Build final deck summary
    const finalDeckSummary = buildFinalDeckSummary(
      bestOption,
      poolInstanceIds,
      instanceToEnrichedMap,
      bombClassification.definition.cutoffScore,
    );

    const profile = seatProfiles[sId] ?? THEO_PROFILE;
    const steps = seatStepsMap.get(sId) ?? [];

    seatsSummary.push({
      seatId: sId,
      botId: profile.id,
      botName: profile.botName ?? profile.name,
      title: profile.title,
      quote: profile.quote,
      level: profile.level,
      preferredColors: profile.preferredColors,
      steps,
      finalDeck: finalDeckSummary,
    });
  }

  const initialBoosters: InitialDealtBooster[] = (dealtEvent?.boosters ?? []).map((booster) => {
    const originBot = seatProfiles[booster.originSeatId];
    const originBotName =
      originBot?.botName ?? originBot?.name ?? `Bot ${String(booster.originSeatId)}`;
    const cards = booster.remainingCardInstanceIds.map(
      (id) =>
        instanceToEnrichedMap.get(id) ?? {
          instanceId: id,
          oracleId: id,
          name: id,
          cmc: 0,
          typeLine: "Card",
          types: [],
          colors: [],
          isLand: false,
          staticScore: 25,
        },
    );

    return {
      boosterId: booster.boosterId,
      packNumber: booster.packNumber,
      originSeatId: booster.originSeatId,
      originBotName,
      cards,
    };
  });

  const report: DetailedDraftReport = {
    schemaVersion: 2,
    cubeKey: snapshot.cubeKey,
    cubeName: "Titou's Tribal and Chromatic Cube",
    seed,
    startedAt,
    completedAt,
    bombDefinition: bombClassification.definition,
    draftReport: draftReportResult.value,
    seats: seatsSummary,
    initialBoosters,
  };

  return success(report);
}

export function classifyCubeBombs(
  snapshot: Readonly<CubeSnapshot>,
  catalog: Readonly<CardCatalog>,
): CubeBombClassification {
  const uniqueScores = new Map<string, number>();

  for (const card of snapshot.cards) {
    const document = catalog.getCardByOracleId(card.oracleId) ?? catalog.getCardByName(card.name);
    const canonicalOracleId = document?.oracleId ?? card.oracleId;
    if (!uniqueScores.has(canonicalOracleId)) {
      uniqueScores.set(canonicalOracleId, document?.powerScore.score ?? 28);
    }
  }

  const ranked = [...uniqueScores.entries()].sort(
    ([oracleIdA, scoreA], [oracleIdB, scoreB]) =>
      scoreB - scoreA || oracleIdA.localeCompare(oracleIdB),
  );
  const targetCount = Math.max(1, Math.ceil(ranked.length * 0.05));
  const cutoffScore = ranked[targetCount - 1]?.[1] ?? 55;
  const oracleIds = new Set(
    ranked.filter(([, score]) => score >= cutoffScore).map(([oracleId]) => oracleId),
  );

  return {
    definition: {
      kind: "top-percentile",
      percentile: 0.05,
      scoreField: "powerScore.score",
      includeCutoffTies: true,
      rankedUniqueCards: ranked.length,
      cutoffScore,
      bombCardCount: oracleIds.size,
    },
    oracleIds,
  };
}

const DEFAULT_PLAINS: EnrichedCard = {
  instanceId: "basic-plains",
  oracleId: "basic-plains",
  name: "Plains",
  cmc: 0,
  typeLine: "Basic Land — Plains",
  types: ["Land", "Basic"],
  colors: [],
  isLand: true,
  staticScore: 5,
  imageUrl: "https://cards.scryfall.io/normal/front/f/5/f5915d31-f1eb-4752-944f-d023f03b4ac6.jpg",
  slug: "plains",
  frenchName: "Plaine",
  frenchText: "{T} : Ajoutez {W}.",
  frenchImageUrl:
    "https://cards.scryfall.io/normal/front/6/b/6b51446a-1150-4b03-939c-7d94b5cc7c26.jpg?1786556047",
  oracleText: "{T}: Add {W}.",
};

export const BASIC_LAND_ENRICHED: Record<string, EnrichedCard> = {
  Plains: DEFAULT_PLAINS,
  Island: {
    instanceId: "basic-island",
    oracleId: "basic-island",
    name: "Island",
    cmc: 0,
    typeLine: "Basic Land — Island",
    types: ["Land", "Basic"],
    colors: [],
    isLand: true,
    staticScore: 5,
    imageUrl: "https://cards.scryfall.io/normal/front/f/a/fa65f377-f273-455a-939e-e022dfa66601.jpg",
    slug: "island",
    frenchName: "Île",
    frenchText: "{T} : Ajoutez {U}.",
    frenchImageUrl:
      "https://cards.scryfall.io/normal/front/3/2/3223912b-07ee-4eea-a836-a3429ec627eb.jpg?1786556085",
    oracleText: "{T}: Add {U}.",
  },
  Swamp: {
    instanceId: "basic-swamp",
    oracleId: "basic-swamp",
    name: "Swamp",
    cmc: 0,
    typeLine: "Basic Land — Swamp",
    types: ["Land", "Basic"],
    colors: [],
    isLand: true,
    staticScore: 5,
    imageUrl: "https://cards.scryfall.io/normal/front/0/c/0c8297b8-3f8d-4ad1-94d0-40e8354c0cfb.jpg",
    slug: "swamp",
    frenchName: "Marais",
    frenchText: "{T} : Ajoutez {B}.",
    frenchImageUrl:
      "https://cards.scryfall.io/normal/front/d/c/dcd5b59c-76b2-4a1b-a6ea-e768fa5578f2.jpg?1786556126",
    oracleText: "{T}: Add {B}.",
  },
  Mountain: {
    instanceId: "basic-mountain",
    oracleId: "basic-mountain",
    name: "Mountain",
    cmc: 0,
    typeLine: "Basic Land — Mountain",
    types: ["Land", "Basic"],
    colors: [],
    isLand: true,
    staticScore: 5,
    imageUrl: "https://cards.scryfall.io/normal/front/b/f/bf94cba8-0382-4113-91c9-5989201f8d4f.jpg",
    slug: "mountain",
    frenchName: "Montagne",
    frenchText: "{T} : Ajoutez {R}.",
    frenchImageUrl:
      "https://cards.scryfall.io/normal/front/0/f/0f956e84-9cc5-4247-98d2-ee39fda49e87.jpg?1786556161",
    oracleText: "{T}: Add {R}.",
  },
  Forest: {
    instanceId: "basic-forest",
    oracleId: "basic-forest",
    name: "Forest",
    cmc: 0,
    typeLine: "Basic Land — Forest",
    types: ["Land", "Basic"],
    colors: [],
    isLand: true,
    staticScore: 5,
    imageUrl: "https://cards.scryfall.io/normal/front/8/e/8e7f8f90-1c57-4183-a44c-353d2d790d97.jpg",
    slug: "forest",
    frenchName: "Forêt",
    frenchText: "{T} : Ajoutez {G}.",
    frenchImageUrl:
      "https://cards.scryfall.io/normal/front/c/e/ce3aed67-3860-4243-a6a4-fc3e88ad2ede.jpg?1786556203",
    oracleText: "{T}: Add {G}.",
  },
};

export function buildFinalDeckSummary(
  bestOption: ReturnType<typeof recommendDeckBuilds>[number] | undefined,
  allPoolInstanceIds: readonly string[],
  instanceToEnrichedMap: Map<string, EnrichedCard>,
  bombThreshold: number,
): FinalDeckSummary {
  if (!bestOption) {
    const allEnriched = allPoolInstanceIds.map(
      (id) =>
        instanceToEnrichedMap.get(id) ?? {
          instanceId: id,
          oracleId: id,
          name: id,
          cmc: 0,
          typeLine: "Card",
          types: [],
          colors: [],
          isLand: false,
          staticScore: 25,
        },
    );
    const maindeckSpells = allEnriched.filter((c) => !c.isLand).slice(0, 23);
    const maindeckLands = allEnriched.filter((c) => c.isLand).slice(0, 17);
    const allMaindeck = [...maindeckSpells, ...maindeckLands];
    const sideboard = allEnriched.filter(
      (c) => !allMaindeck.some((m) => m.instanceId === c.instanceId),
    );

    const defaultEval = evaluateDeck(
      allMaindeck.map((c) => ({
        id: c.instanceId,
        name: c.name,
        staticScore: c.staticScore,
        colors: c.colors,
        cmc: c.cmc,
        isLand: c.isLand,
      })),
      { bombThreshold },
    );

    return {
      maindeckSpells,
      maindeckLands,
      allMaindeck,
      sideboard,
      archetype: defaultEval.archetype,
      overallScore: defaultEval.overallScore,
      radar: defaultEval.radar,
      audit: defaultEval.audit,
      macroAxes: {
        power: defaultEval.radar.power,
        synergy: defaultEval.radar.synergy,
        consistency: Math.round(defaultEval.radar.curve * 0.5 + defaultEval.radar.mana * 0.5),
      },
      strengths: defaultEval.strengths,
      weaknesses: defaultEval.weaknesses,
      recommendations: defaultEval.recommendations,
    };
  }

  const allMaindeck: EnrichedCard[] = bestOption.maindeck.map((id) => {
    if (id.startsWith("basic-")) {
      const basicKey = id.replace("basic-", "");
      const capKey = basicKey.charAt(0).toUpperCase() + basicKey.slice(1);
      return BASIC_LAND_ENRICHED[capKey] ?? DEFAULT_PLAINS;
    }
    return (
      instanceToEnrichedMap.get(id) ?? {
        instanceId: id,
        oracleId: id,
        name: id,
        cmc: 0,
        typeLine: "Card",
        types: [],
        colors: [],
        isLand: false,
        staticScore: 25,
      }
    );
  });

  while (allMaindeck.length < 40) {
    const primaryColor = bestOption.evaluation.archetype.primaryColors[0] ?? "W";
    const basicName =
      primaryColor === "U"
        ? "Island"
        : primaryColor === "B"
          ? "Swamp"
          : primaryColor === "R"
            ? "Mountain"
            : primaryColor === "G"
              ? "Forest"
              : "Plains";
    allMaindeck.push(BASIC_LAND_ENRICHED[basicName] ?? DEFAULT_PLAINS);
  }

  const maindeckSpells = allMaindeck.filter((c) => !c.isLand);
  const maindeckLands = allMaindeck.filter((c) => c.isLand);

  const maindeckInstanceIds = new Set(allMaindeck.map((c) => c.instanceId));
  const sideboard: EnrichedCard[] = allPoolInstanceIds
    .filter((id) => !maindeckInstanceIds.has(id))
    .map(
      (id) =>
        instanceToEnrichedMap.get(id) ?? {
          instanceId: id,
          oracleId: id,
          name: id,
          cmc: 0,
          typeLine: "Card",
          types: [],
          colors: [],
          isLand: false,
          staticScore: 25,
        },
    );

  const radar = bestOption.evaluation.radar;
  const macroAxes = {
    power: radar.power,
    synergy: radar.synergy,
    consistency: Math.round(radar.curve * 0.5 + radar.mana * 0.5),
  };

  return {
    maindeckSpells,
    maindeckLands,
    allMaindeck,
    sideboard,
    archetype: bestOption.evaluation.archetype,
    overallScore: bestOption.evaluation.overallScore,
    radar,
    audit: bestOption.evaluation.audit,
    macroAxes,
    strengths: bestOption.evaluation.strengths,
    weaknesses: bestOption.evaluation.weaknesses,
    recommendations: bestOption.evaluation.recommendations,
  };
}
