import type { CardCatalog } from "../cards/card-catalog.ts";
import { toCardEvaluationInput } from "../cards/evaluation-input.ts";
import { loadCoachContext, type CoachContext } from "../cubes/coach-context.ts";
import type { CubeSnapshot } from "../cubes/validate-snapshot.ts";
import {
  getDraftView,
  buildDraftReport,
  startDraft,
  submitPickRound,
  type BoostersDealtEvent,
  type CardPickedEvent,
  type Draft,
  type DraftConfiguration,
  type SeatDecision,
  type SeatId,
  type SeatPolicyDescriptor,
  type StartDraftInput,
} from "../draft/index.ts";
import {
  deriveStreamSeed,
  getPolicyStreamName,
  RANDOM_SYSTEM_METADATA,
} from "../random/seeded-random.ts";
import type {
  PickCandidateTrace,
  PickContext,
  PickDecisionTrace,
  PickPolicy,
} from "../bots/pick-policy.ts";
import { createCoachedBotPolicy } from "../bots/coached-bot-policy.ts";
import {
  ALL_FRIEND_PROFILES,
  buildTableSeatAssignments,
  createFriendTablePolicies,
  DEFAULT_FRIEND_SEAT_PROFILES,
  type FriendProfile,
} from "../bots/friends/index.ts";
import { chooseWithJevBot } from "../bots/jev/jev-bot-decision.ts";
import { getUnifiedDraftAdvice } from "../coach-advice/draft-coach-service.ts";
import { computeWheelSignals, type WheelSignalAnalysis } from "../domain/coaching/wheel-signals.ts";
import { evaluatePack } from "../domain/coaching/dynamic-score.ts";
import { generateCoachingExplanation } from "../domain/coaching/coaching-explainer.ts";
import { recommendDeckBuilds } from "../domain/coaching/deck-recommender.ts";
import { evaluateDeck } from "../domain/coaching/deck-evaluation.ts";
import type {
  CardEvaluationInput,
  DeckBuildOption,
  DeckEvaluation,
  DeckEvaluationOptions,
  MtGColor,
  PackEvaluationContext,
} from "../domain/coaching/types.ts";
import { createSessionIdentityGenerator } from "../random/session-identity.ts";
import {
  classifyCubeBombs,
  BASIC_LAND_ENRICHED,
  buildFinalDeckSummary,
  type CubeBombDefinition,
  type DetailedBoosterCard,
  type DetailedDraftReport,
  type EnrichedCard,
  type FinalDeckSummary,
  type InitialDealtBooster,
  type PickWalkthroughStep,
  type SeatDraftSummary,
} from "../simulation/detailed-simulation.ts";
import {
  createFileSoloResultOutputs,
  type SoloLeaderboardPublication,
  type SoloResultOutputs,
} from "./solo-result-outputs.ts";
import {
  createFinalDeckCoach,
  type FinalDeckCoach,
  type FinalDeckRecommendation,
} from "../multiplayer-draft/final-deck-coach.ts";
import type { CoachLanguageModel } from "../coach-advice/coach-language-model.ts";
import type {
  AdminDraftEntry,
  AdminDraftSeatSummary,
  BasicLandCounts,
  SoloDeckBuildInput,
  SoloDraftDeckRecommendation,
  SoloDraftFinalResult,
  SoloDraftPickAdvice,
  SoloDraftSeatDto,
  SoloDraftStartInput,
  SoloDraftStateDto,
  SoloDraftStatus,
  SoloDraftPersistenceSnapshot,
  SoloLeaderboardPayload,
  SoloLockedResult,
} from "./solo-draft-types.ts";

function getBotAvatar(profileId?: string): string {
  switch (profileId) {
    case "human":
      return "🧙‍♂️";
    case "nico":
      return "⚡";
    case "cedric":
      return "🏆";
    case "hugues":
      return "🎭";
    case "remi":
      return "🎲";
    case "papayou":
      return "👑";
    case "ivan":
      return "🌲";
    case "titou":
      return "📜";
    case "theo":
      return "🎸";
    default:
      return "🤖";
  }
}

function recommendationToDeckBuildOption(reco: FinalDeckRecommendation): DeckBuildOption {
  const basicIds: string[] = [];
  for (const [landName, count] of Object.entries(reco.basicLands)) {
    const slug = `basic-${landName.toLowerCase()}`;
    for (let i = 0; i < count; i++) {
      basicIds.push(slug);
    }
  }
  return {
    position: 1,
    title: reco.strategy || "Option IA",
    maindeck: [...reco.maindeckCardInstanceIds, ...basicIds],
    sideboard: [...reco.sideboardCardInstanceIds],
    evaluation: reco.evaluation,
  };
}

export class SoloDraftSession {
  public readonly sessionId: string;
  public readonly seed: number;
  public readonly cubeKey: string;
  public readonly cubeName: string;
  public readonly playerName: string;
  public readonly magicienSlug?: string | undefined;
  private lifecycleStatus: SoloDraftStatus = "drafting";
  private homologated = true;

  private currentDraft: Draft;
  private readonly snapshot: CubeSnapshot;
  private readonly catalog: Readonly<CardCatalog>;
  private readonly bombDefinition: CubeBombDefinition;
  private readonly coachContext: Readonly<CoachContext>;
  private readonly bombOracleIds: ReadonlySet<string>;
  private readonly instanceToInputMap = new Map<string, CardEvaluationInput>();
  private readonly instanceToEnrichedMap = new Map<string, EnrichedCard>();
  private readonly policies: PickPolicy[];
  private readonly seatProfiles: readonly FriendProfile[];
  private readonly seatAssignments: readonly (FriendProfile | null)[];
  private readonly initialBoosters: InitialDealtBooster[] = [];
  private readonly seatStepsMap = new Map<SeatId, PickWalkthroughStep[]>();
  private lockedResult: SoloLockedResult | null = null;
  private resultOutputs: SoloResultOutputs | null = null;

  private readonly recordedPicks: string[] = [];
  private readonly humanSeenBoosters = new Map<
    string,
    {
      readonly pickNumber: number;
      readonly pickedCardId: string;
      readonly passedCardIds: readonly string[];
    }
  >();
  private cachedAdvicePromise: Promise<SoloDraftPickAdvice> | null = null;
  private readonly finalDeckCoach: FinalDeckCoach;
  private readonly languageModel: CoachLanguageModel | undefined;
  private botDecksPromise: Promise<Map<SeatId, FinalDeckSummary>> | null = null;
  private completedRounds = 0;
  private readonly startedAt: number;
  private draftSeconds = 0;
  private totalSeconds = 0;

  private constructor(params: {
    sessionId: string;
    seed: number;
    playerName: string;
    magicienSlug?: string | undefined;
    coachContext: Readonly<CoachContext>;
    currentDraft: Draft;
    bombDefinition: CubeBombDefinition;
    bombOracleIds: ReadonlySet<string>;
    instanceToInputMap: Map<string, CardEvaluationInput>;
    instanceToEnrichedMap: Map<string, EnrichedCard>;
    policies: PickPolicy[];
    seatProfiles: readonly FriendProfile[];
    seatAssignments: readonly (FriendProfile | null)[];
    initialBoosters: InitialDealtBooster[];
    finalDeckCoach?: FinalDeckCoach | undefined;
    languageModel?: CoachLanguageModel | undefined;
    startedAtTimestamp?: number | undefined;
  }) {
    this.sessionId = params.sessionId;
    this.seed = params.seed;
    this.playerName = params.playerName;
    this.magicienSlug = params.magicienSlug;
    this.coachContext = params.coachContext;
    this.snapshot = params.coachContext.snapshot;
    this.catalog = params.coachContext.catalog;
    this.currentDraft = params.currentDraft;
    this.bombDefinition = params.bombDefinition;
    this.bombOracleIds = params.bombOracleIds;
    this.instanceToInputMap = params.instanceToInputMap;
    this.instanceToEnrichedMap = params.instanceToEnrichedMap;
    this.policies = params.policies;
    this.seatProfiles = params.seatProfiles;
    this.seatAssignments = params.seatAssignments;
    this.initialBoosters = params.initialBoosters;
    this.cubeKey = params.coachContext.cubeKey;
    this.cubeName = params.coachContext.cubeMeta.meta.name;
    this.startedAt = params.startedAtTimestamp ?? Date.now();

    this.languageModel = params.languageModel;
    const languageModel = params.languageModel;
    this.finalDeckCoach =
      params.finalDeckCoach ??
      (languageModel
        ? createFinalDeckCoach({
            generateJson: (systemPrompt, userPrompt, options) =>
              languageModel.generateJson(systemPrompt, userPrompt, options),
          })
        : createFinalDeckCoach());

    for (let s = 0; s < 8; s++) {
      this.seatStepsMap.set(s as SeatId, []);
    }
  }

  /** Lifecycle owned by the session: drafting → deckbuilding → completed. */
  public get status(): SoloDraftStatus {
    return this.lifecycleStatus;
  }

  /** Lost irreversibly as soon as Coaching is used. */
  public get isHomologated(): boolean {
    return this.homologated;
  }

  public get roundIndex(): number {
    return this.completedRounds;
  }

  public get humanPicks(): readonly string[] {
    return Object.freeze([...this.recordedPicks]);
  }

  public get startedAtTimestamp(): number {
    return this.startedAt;
  }

  public get draftDurationSeconds(): number {
    return this.draftSeconds;
  }

  public get totalDurationSeconds(): number {
    return this.totalSeconds;
  }

  public static async create(
    input: SoloDraftStartInput,
    restoring: { readonly startedAtTimestamp?: number | undefined } = {},
  ): Promise<SoloDraftSession> {
    const playerName = input.playerName.trim() || "Joueur";
    const seed =
      input.seed !== undefined && Number.isInteger(input.seed)
        ? input.seed
        : Math.floor(Math.random() * 2147483647);
    const cubeKey = input.cubeKey ?? "titou_tribal";
    const coachContextResult = await loadCoachContext(process.cwd(), cubeKey);
    if (!coachContextResult.ok) {
      throw new Error(
        `Failed to load CoachContext: ${coachContextResult.error.code}: ${coachContextResult.error.message}`,
      );
    }
    const coachContext = coachContextResult.value;
    const snapshot: CubeSnapshot = coachContext.snapshot;
    const catalog: Readonly<CardCatalog> = coachContext.catalog;

    const bombClassification = classifyCubeBombs(snapshot, catalog);

    const instanceToInputMap = new Map<string, CardEvaluationInput>();
    const instanceToEnrichedMap = new Map<string, EnrichedCard>();

    for (const card of snapshot.cards) {
      const doc = catalog.getCardByOracleId(card.oracleId) ?? catalog.getCardByName(card.name);
      if (!doc) throw new Error("Missing verified catalog card: " + card.oracleId);
      const evalInput = toCardEvaluationInput(doc, card.instanceId);
      instanceToInputMap.set(card.instanceId, evalInput);
      const { name, staticScore, colors, oracleText, manaCost } = evalInput;
      const { isLand, oracleId } = doc;
      const cmc = doc.cmc;
      const types = doc.types;
      const typeLine = doc.typeLine;
      const slug = doc.slug;
      const imageUrl =
        doc.image?.url ??
        "https://api.scryfall.com/cards/named?format=image&exact=" + encodeURIComponent(name);
      const localImagePath =
        doc.image?.localPath ?? "data/cards/images/" + (slug ?? "unknown") + ".jpg";

      const analysis = doc.cubeAnalyses[snapshot.cubeKey] ?? Object.values(doc.cubeAnalyses)[0];
      const howToPlay =
        analysis?.pedagogy?.howToPlay ?? analysis?.analysis ?? doc.objectiveAnalysis.summary;

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
        frenchName: doc.frenchName,
        frenchText: doc.frenchText,
        frenchImageUrl: doc.frenchImageUrl,
        localFrenchImagePath: doc.image?.localFrenchPath ?? doc.localFrenchPath,
        oracleText,
        howToPlay,
      };
      instanceToEnrichedMap.set(card.instanceId, enriched);
    }

    const resolveCard = (id: string): CardEvaluationInput | undefined => instanceToInputMap.get(id);
    const evaluationContext = {
      cubeKey: snapshot.cubeKey,
      catalog,
      cubeMeta: coachContext.cubeMeta,
      synergyProfile: coachContext.synergyProfile,
    } as const;
    let seatAssignments: readonly (FriendProfile | null)[];
    if (input.seatAssignments) {
      seatAssignments = input.seatAssignments;
    } else if (input.botIds?.length === 7) {
      const profileMap = new Map(ALL_FRIEND_PROFILES.map((p) => [p.id, p]));
      seatAssignments = [null, ...input.botIds.map((id) => profileMap.get(id) ?? null)];
    } else if (input.randomizeSeats) {
      seatAssignments = buildTableSeatAssignments(input.magicienSlug, { seed, randomize: true });
    } else if (input.magicienSlug) {
      seatAssignments = buildTableSeatAssignments(input.magicienSlug);
    } else {
      seatAssignments = DEFAULT_FRIEND_SEAT_PROFILES;
    }
    const friendTable = createFriendTablePolicies({
      resolveCard,
      evaluationContext,
      seatAssignments,
    });

    // Seat 0: Human Player (represented as fallback Coached bot for policy descriptor)
    const policies: PickPolicy[] = [
      createCoachedBotPolicy({ resolveCard, id: "human-player-seat-0", version: "1.0.0" }),
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
      {
        id: "human",
        name: playerName,
        botName: playerName,
        title: "Challenger Solo",
        quote: "Prêt à conquérir le Mur des Records !",
        level: "elite",
        temperature: 1.0,
        biases: {},
      },
      ...seatAssignments.slice(1).map(
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

    const identityGenerator = createSessionIdentityGenerator();
    const identity = identityGenerator.create(seed);
    const sessionId = input.explicitSessionId ?? identity.sessionId;
    const startedAt = new Date().toISOString();

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
      throw new Error(`Failed to start draft: ${startResult.error.message}`);
    }

    const dealtEvent = startResult.value.appendedEvents.find(
      (e): e is BoostersDealtEvent => e.type === "BoostersDealt",
    );

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

    const session = new SoloDraftSession({
      sessionId,
      seed,
      playerName,
      magicienSlug: input.magicienSlug,
      coachContext,
      currentDraft: startResult.value.draft,
      bombDefinition: bombClassification.definition,
      bombOracleIds: bombClassification.oracleIds,
      instanceToInputMap,
      instanceToEnrichedMap,
      policies,
      seatProfiles,
      seatAssignments,
      initialBoosters,
      languageModel: input.languageModel,
      startedAtTimestamp: restoring.startedAtTimestamp,
    });
    session.prefetchPickAdvice();
    return session;
  }

  public getStateDto(lastPickedCard?: EnrichedCard): SoloDraftStateDto {
    const view = getDraftView(this.currentDraft);
    const seat0 = view.seats[0];
    const currentBoosterIds = seat0?.currentBooster?.remainingCardInstanceIds ?? [];
    const poolIds = seat0?.priorPool ?? [];

    const currentBooster = currentBoosterIds.map((id) => this.getEnrichedCard(id));
    const playerPool = poolIds.map((id) => this.getEnrichedCard(id));

    const direction: "left" | "right" = view.packNumber === 2 ? "right" : "left";
    const incomingSeatId = direction === "left" ? 7 : 1;
    const incomingProfile = this.seatProfiles[incomingSeatId];
    const nextBoosterFromBotName =
      incomingProfile?.botName ?? incomingProfile?.name ?? `Bot ${String(incomingSeatId)}`;
    const elapsedSeconds =
      this.lifecycleStatus === "completed"
        ? this.totalSeconds
        : Math.round((Date.now() - this.startedAt) / 1000);
    const seats: readonly SoloDraftSeatDto[] = this.seatProfiles.map((p, idx) => ({
      seatNumber: idx,
      id: p.id,
      name: idx === 0 ? this.playerName : (p.botName ?? p.name),
      botName: p.botName,
      title: p.title,
      quote: p.quote,
      role: p.title,
      avatar: idx === 0 ? "🧙‍♂️" : getBotAvatar(p.id),
      isHuman: idx === 0,
      level: p.level,
    }));

    return {
      sessionId: this.sessionId,
      seed: this.seed,
      cubeKey: this.cubeKey,
      cubeName: this.cubeName,
      coachContext: {
        contextVersion: this.coachContext.contextVersion,
        snapshotId: this.coachContext.snapshotId,
        archetypeModelVersion: this.coachContext.provenance.archetypeModelVersion,
      },
      playerName: this.playerName,
      magicienSlug: this.magicienSlug,
      status: this.lifecycleStatus,
      roundIndex: this.completedRounds,
      packNumber: view.packNumber,
      pickNumber: view.pickNumber,
      totalRounds: 45,
      direction,
      nextBoosterFromBotName,
      currentBooster,
      playerPool,
      elapsedSeconds,
      isHomologated: this.homologated,
      lastPickedCard,
      deckRecommendation:
        this.lifecycleStatus === "deckbuilding" ? this.getDeckRecommendation() : undefined,
      seats,
    };
  }

  public getSeatSteps(seatId: SeatId): readonly PickWalkthroughStep[] {
    return this.seatStepsMap.get(seatId) ?? [];
  }

  public makePick(
    cardInstanceId: string,
    options: { prefetchAdvice?: boolean } = {},
  ): SoloDraftStateDto {
    if (this.lifecycleStatus !== "drafting") {
      throw new Error(`Cannot make pick: draft status is '${this.lifecycleStatus}'`);
    }

    const view = getDraftView(this.currentDraft);
    if (view.status === "completed" || this.completedRounds >= 45) {
      this.lifecycleStatus = "deckbuilding";
      this.draftSeconds = Math.round((Date.now() - this.startedAt) / 1000);
      return this.getStateDto();
    }

    const seat0View = view.seats[0];
    const booster0 = seat0View?.currentBooster;
    if (!booster0) {
      throw new Error("Human seat has no booster available for this round");
    }

    if (!booster0.remainingCardInstanceIds.includes(cardInstanceId)) {
      throw new Error(`Card instance '${cardInstanceId}' is not in current booster`);
    }

    const round = this.completedRounds;
    const packNumber = view.packNumber;
    const pickNumber = view.pickNumber;
    const occurredAt = new Date(this.startedAt + (round + 1) * 1000).toISOString();
    const evaluationContext = {
      cubeKey: this.snapshot.cubeKey,
      catalog: this.catalog,
      cubeMeta: this.coachContext.cubeMeta,
      synergyProfile: this.coachContext.synergyProfile,
    } as const;

    const decisions: SeatDecision[] = [];
    const roundSteps = new Map<SeatId, Omit<PickWalkthroughStep, "eventSequence">>();

    // 1. Human Decision (Seat 0)
    this.recordedPicks.push(cardInstanceId);
    if (pickNumber <= 7) {
      const passedCardIds = booster0.remainingCardInstanceIds.filter((id) => id !== cardInstanceId);
      this.humanSeenBoosters.set(booster0.boosterId, {
        pickNumber,
        pickedCardId: cardInstanceId,
        passedCardIds,
      });
    }
    const humanEnriched = this.getEnrichedCard(cardInstanceId);
    decisions.push({
      seatId: 0,
      cardInstanceId,
      source: { kind: "caller" },
    });

    // Record human walkthrough step
    const boosterCardsForHuman = booster0.remainingCardInstanceIds.map((id, idx) => {
      const card = this.getEnrichedCard(id);
      return {
        ...card,
        dynamicScore: card.staticScore,
        rankInPack: idx + 1,
        isPicked: id === cardInstanceId,
        delta: 0,
        justification: "Choix du joueur humain",
        coachingBreakdown: {
          colorAffinityFactor: 1,
          colorPenalty: 0,
          manaFixingBonus: 0,
          curveBonus: 0,
          rawDynamicScore: card.staticScore,
        },
        biasContributions: [],
        personalityBonus: 0,
        friendBonus: 0,
        policyScore: card.staticScore,
        selectionProbability: id === cardInstanceId ? 1 : 0,
        policyRank: 1,
      };
    });

    const humanCandidate: PickCandidateTrace = {
      cardInstanceId,
      staticScore: humanEnriched.staticScore,
      dynamicScore: humanEnriched.staticScore,
      coachingBreakdown: {
        colorAffinityFactor: 1,
        colorPenalty: 0,
        manaFixingBonus: 0,
        curveBonus: 0,
        rawDynamicScore: humanEnriched.staticScore,
      },
      biasContributions: [],
      personalityBonus: 0,
      policyScore: humanEnriched.staticScore,
      selectionProbability: 1,
      policyRank: 1,
    };

    const humanDecisionTrace: PickDecisionTrace = {
      schemaVersion: 1,
      method: "highest-score",
      temperature: null,
      randomRoll: null,
      selectedProbability: 1,
      candidates: [humanCandidate],
    };

    roundSteps.set(0, {
      roundIndex: round,
      packNumber,
      pickNumber,
      seatId: 0,
      boosterId: booster0.boosterId,
      decisionTrace: humanDecisionTrace,
      boosterCards: boosterCardsForHuman,
      pickedCardInstanceId: cardInstanceId,
      pickedCardName: humanEnriched.name,
      justification: `Choix manuel de ${this.playerName}`,
      poolSoFar: seat0View.priorPool.map((id) => this.getEnrichedCard(id)),
    });

    // 2. Bot Decisions (Seats 1 to 7)
    for (let seatIdx = 1; seatIdx < 8; seatIdx++) {
      const sId = seatIdx as SeatId;
      const seatView = view.seats[sId];
      const currentBooster = seatView?.currentBooster;
      if (!currentBooster) {
        throw new Error(`Bot seat ${String(sId)} has no booster`);
      }

      const boosterInstanceIds = currentBooster.remainingCardInstanceIds;
      const priorPoolInstanceIds = seatView.priorPool;

      const offeredInputs: CardEvaluationInput[] = boosterInstanceIds.map(
        (id) => this.instanceToInputMap.get(id) ?? { id, name: id, staticScore: 25, colors: [] },
      );
      const priorInputs: CardEvaluationInput[] = priorPoolInstanceIds.map(
        (id) => this.instanceToInputMap.get(id) ?? { id, name: id, staticScore: 25, colors: [] },
      );

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

      const policy = this.policies[sId];
      const profile = this.seatProfiles[sId] ?? {
        id: `seat-${String(sId)}`,
        name: `Bot ${String(sId)}`,
        title: "Bot Invité",
        quote: "Prêt à drafter.",
        level: "medium" as const,
        temperature: 1.0,
        biases: {},
      };

      const streamName = getPolicyStreamName(sId);
      const derivedSeed = deriveStreamSeed(this.seed, streamName);

      const pickContext: PickContext = {
        derivedSeed,
        streamName,
        seatId: sId,
        packNumber,
        pickNumber,
        currentBooster: boosterInstanceIds,
        priorPool: priorPoolInstanceIds,
      };

      if (!policy) {
        throw new Error(`Missing policy for bot seat ${String(sId)}`);
      }

      const choiceResult = policy.choose(pickContext);
      if (!choiceResult.ok) {
        throw new Error(`Policy failed for seat ${String(sId)}: ${choiceResult.error.message}`);
      }

      const chosenInstanceId = choiceResult.value.cardInstanceId;
      const decisionTrace = choiceResult.value.trace;
      if (!decisionTrace) {
        throw new Error(`Policy for seat ${String(sId)} returned no decision trace`);
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

      const boosterDetailed: DetailedBoosterCard[] = boosterInstanceIds.map((instanceId, idx) => {
        const enriched = this.getEnrichedCard(instanceId);
        const ev = evalMap.get(instanceId);
        const candidateTrace = decisionTrace.candidates.find(
          (candidate: PickCandidateTrace) => candidate.cardInstanceId === instanceId,
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

      boosterDetailed.sort((a, b) => b.dynamicScore - a.dynamicScore);

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

      const engineTag = "[Moteur Déterministe]";
      const botJustification = `${engineTag} ${finalJustification}`;

      roundSteps.set(sId, {
        roundIndex: round,
        packNumber,
        pickNumber,
        seatId: sId,
        boosterId: currentBooster.boosterId,
        decisionTrace: {
          ...decisionTrace,
          decisionEngine: "deterministic",
        },
        decisionEngine: "deterministic",
        boosterCards: boosterDetailed,
        pickedCardInstanceId: chosenInstanceId,
        pickedCardName: chosenName,
        justification: botJustification,
        poolSoFar: priorPoolInstanceIds.map((id) => this.getEnrichedCard(id)),
      });
    }

    // 3. Submit Round to Engine
    const roundResult = submitPickRound(this.currentDraft, {
      sessionId: this.sessionId,
      expectedRevision: round,
      packNumber,
      pickNumber,
      occurredAt,
      decisions,
    });

    if (!roundResult.ok) {
      throw new Error(`Round ${String(round)} failed: ${roundResult.error.message}`);
    }

    // Associate sequence numbers with walkthrough steps
    for (let s = 0; s < 8; s++) {
      const sId = s as SeatId;
      const step = roundSteps.get(sId);
      if (!step) continue;
      const pickedEvent = roundResult.value.appendedEvents.find(
        (e): e is CardPickedEvent => e.type === "CardPicked" && e.seatId === sId,
      );
      if (pickedEvent) {
        this.seatStepsMap.get(sId)?.push({ ...step, eventSequence: pickedEvent.sequence });
      }
    }

    this.currentDraft = roundResult.value.draft;
    this.completedRounds++;
    this.cachedAdvicePromise = null;

    if (this.completedRounds >= 45) {
      this.lifecycleStatus = "deckbuilding";
      this.draftSeconds = Math.round((Date.now() - this.startedAt) / 1000);
      this.startBotDeckbuilding();
    } else if (options.prefetchAdvice !== false) {
      this.prefetchPickAdvice();
    }

    return this.getStateDto(humanEnriched);
  }

  public async makePickAsync(
    cardInstanceId: string,
    options: { prefetchAdvice?: boolean; botEngine?: "deterministic" | "jev" } = {},
  ): Promise<SoloDraftStateDto> {
    const botEngine = options.botEngine ?? "deterministic";
    const router = this.languageModel;
    if (botEngine !== "jev" || !router?.hasJevKey()) {
      return this.makePick(cardInstanceId, options);
    }

    if (this.lifecycleStatus !== "drafting") {
      throw new Error(`Cannot make pick: draft status is '${this.lifecycleStatus}'`);
    }

    const view = getDraftView(this.currentDraft);
    if (view.status === "completed" || this.completedRounds >= 45) {
      this.lifecycleStatus = "deckbuilding";
      this.draftSeconds = Math.round((Date.now() - this.startedAt) / 1000);
      return this.getStateDto();
    }

    const seat0View = view.seats[0];
    const booster0 = seat0View?.currentBooster;
    if (!booster0) {
      throw new Error("Human seat has no booster available for this round");
    }

    if (!booster0.remainingCardInstanceIds.includes(cardInstanceId)) {
      throw new Error(`Card instance '${cardInstanceId}' is not in current booster`);
    }

    const round = this.completedRounds;
    const packNumber = view.packNumber;
    const pickNumber = view.pickNumber;
    const occurredAt = new Date(this.startedAt + (round + 1) * 1000).toISOString();
    const evaluationContext = {
      cubeKey: this.snapshot.cubeKey,
      catalog: this.catalog,
      cubeMeta: this.coachContext.cubeMeta,
      synergyProfile: this.coachContext.synergyProfile,
    } as const;

    const decisions: SeatDecision[] = [];
    const roundSteps = new Map<SeatId, Omit<PickWalkthroughStep, "eventSequence">>();

    // 1. Human Decision (Seat 0)
    this.recordedPicks.push(cardInstanceId);
    if (pickNumber <= 7) {
      const passedCardIds = booster0.remainingCardInstanceIds.filter((id) => id !== cardInstanceId);
      this.humanSeenBoosters.set(booster0.boosterId, {
        pickNumber,
        pickedCardId: cardInstanceId,
        passedCardIds,
      });
    }
    const humanEnriched = this.getEnrichedCard(cardInstanceId);
    decisions.push({
      seatId: 0,
      cardInstanceId,
      source: { kind: "caller" },
    });

    const boosterCardsForHuman = booster0.remainingCardInstanceIds.map((id, idx) => {
      const card = this.getEnrichedCard(id);
      return {
        ...card,
        dynamicScore: card.staticScore,
        rankInPack: idx + 1,
        isPicked: id === cardInstanceId,
        delta: 0,
        justification: "Choix du joueur humain",
        coachingBreakdown: {
          colorAffinityFactor: 1,
          colorPenalty: 0,
          manaFixingBonus: 0,
          curveBonus: 0,
          rawDynamicScore: card.staticScore,
        },
        biasContributions: [],
        personalityBonus: 0,
        friendBonus: 0,
        policyScore: card.staticScore,
        selectionProbability: id === cardInstanceId ? 1 : 0,
        policyRank: 1,
      };
    });

    const humanCandidate: PickCandidateTrace = {
      cardInstanceId,
      staticScore: humanEnriched.staticScore,
      dynamicScore: humanEnriched.staticScore,
      coachingBreakdown: {
        colorAffinityFactor: 1,
        colorPenalty: 0,
        manaFixingBonus: 0,
        curveBonus: 0,
        rawDynamicScore: humanEnriched.staticScore,
      },
      biasContributions: [],
      personalityBonus: 0,
      policyScore: humanEnriched.staticScore,
      selectionProbability: 1,
      policyRank: 1,
    };

    const humanDecisionTrace: PickDecisionTrace = {
      schemaVersion: 1,
      method: "highest-score",
      temperature: null,
      randomRoll: null,
      selectedProbability: 1,
      candidates: [humanCandidate],
    };

    roundSteps.set(0, {
      roundIndex: round,
      packNumber,
      pickNumber,
      seatId: 0,
      boosterId: booster0.boosterId,
      decisionTrace: humanDecisionTrace,
      boosterCards: boosterCardsForHuman,
      pickedCardInstanceId: cardInstanceId,
      pickedCardName: humanEnriched.name,
      justification: `Choix manuel de ${this.playerName}`,
      poolSoFar: seat0View.priorPool.map((id) => this.getEnrichedCard(id)),
    });

    // 2. Bot Decisions (Seats 1 to 7) in Parallel with JEV
    const botTasks = Array.from({ length: 7 }, async (_, i) => {
      const seatIdx = i + 1;
      const sId = seatIdx as SeatId;
      const seatView = view.seats[sId];
      const currentBooster = seatView?.currentBooster;
      if (!currentBooster) {
        throw new Error(`Bot seat ${String(sId)} has no booster`);
      }

      const boosterInstanceIds = currentBooster.remainingCardInstanceIds;
      const priorPoolInstanceIds = seatView.priorPool;

      const offeredInputs: CardEvaluationInput[] = boosterInstanceIds.map(
        (id) => this.instanceToInputMap.get(id) ?? { id, name: id, staticScore: 25, colors: [] },
      );
      const priorInputs: CardEvaluationInput[] = priorPoolInstanceIds.map(
        (id) => this.instanceToInputMap.get(id) ?? { id, name: id, staticScore: 25, colors: [] },
      );

      const profile = this.seatProfiles[sId] ?? {
        id: `seat-${String(sId)}`,
        name: `Bot ${String(sId)}`,
        title: "Bot Invité",
        quote: "Prêt à drafter.",
        level: "medium" as const,
        temperature: 1.0,
        biases: {},
      };

      const jevResult = await chooseWithJevBot({
        router,
        cubeMeta: this.coachContext.cubeMeta.meta,
        cubeKey: this.cubeKey,
        profile,
        packNumber,
        pickNumber,
        offeredCards: offeredInputs,
        priorPool: priorInputs,
        timeoutMs: 2000,
      });

      return {
        sId,
        currentBooster,
        boosterInstanceIds,
        priorPoolInstanceIds,
        offeredInputs,
        priorInputs,
        jevResult,
      };
    });

    const botResults = await Promise.all(botTasks);

    for (const b of botResults) {
      const {
        sId,
        currentBooster,
        boosterInstanceIds,
        priorPoolInstanceIds,
        offeredInputs,
        priorInputs,
        jevResult,
      } = b;

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

      const chosenInstanceId = jevResult.cardInstanceId;
      const isJev = jevResult.usedJev;
      const decisionEngine: "jev" | "deterministic" = isJev ? "jev" : "deterministic";

      const policy = this.policies[sId];
      decisions.push({
        seatId: sId,
        cardInstanceId: chosenInstanceId,
        source: {
          kind: "policy",
          policyId: policy?.id ?? (isJev ? "jev-bot-decision" : "coached-bot"),
          policyVersion: policy?.version ?? "1.0.0",
        },
      });

      const boosterDetailed: DetailedBoosterCard[] = boosterInstanceIds.map((instanceId, idx) => {
        const enriched = this.getEnrichedCard(instanceId);
        const ev = evalMap.get(instanceId);
        const prob =
          jevResult.probabilities[enriched.name] ?? (instanceId === chosenInstanceId ? 1 : 0);
        const rankInPack = evaluatedCards.findIndex((c) => c.id === instanceId) + 1;
        const isPicked = instanceId === chosenInstanceId;
        return {
          ...enriched,
          dynamicScore: ev?.dynamicScore ?? enriched.staticScore,
          rankInPack: rankInPack > 0 ? rankInPack : idx + 1,
          isPicked,
          delta: ev?.delta ?? 0,
          justification: ev?.explanation ?? "",
          coachingBreakdown: ev?.breakdown ?? {
            colorAffinityFactor: 1,
            colorPenalty: 0,
            manaFixingBonus: 0,
            curveBonus: 0,
            rawDynamicScore: enriched.staticScore,
          },
          biasContributions: [],
          personalityBonus: 0,
          friendBonus: 0,
          policyScore: ev?.dynamicScore ?? enriched.staticScore,
          selectionProbability: prob,
          policyRank: rankInPack > 0 ? rankInPack : idx + 1,
        };
      });

      boosterDetailed.sort((a, b) => b.dynamicScore - a.dynamicScore);

      const pickedDetailed = boosterDetailed.find((c) => c.instanceId === chosenInstanceId);
      const chosenName = pickedDetailed?.name ?? chosenInstanceId;
      const enginePrefix = isJev ? "[JEV]" : "[Moteur Déterministe]";
      const botJustification = `${enginePrefix} ${jevResult.reason ?? (isJev ? "Choix IA JEV Système 1" : "Choix heuristique")}`;

      const decisionTrace: PickDecisionTrace = {
        schemaVersion: 1,
        method: "highest-score",
        temperature: null,
        randomRoll: null,
        selectedProbability: jevResult.choiceProb,
        decisionEngine,
        candidates: boosterDetailed.map((c) => ({
          cardInstanceId: c.instanceId,
          staticScore: c.staticScore,
          dynamicScore: c.dynamicScore,
          coachingBreakdown: c.coachingBreakdown,
          biasContributions: c.biasContributions,
          personalityBonus: c.personalityBonus,
          policyScore: c.policyScore,
          selectionProbability: c.selectionProbability,
          policyRank: c.policyRank,
        })),
      };

      roundSteps.set(sId, {
        roundIndex: round,
        packNumber,
        pickNumber,
        seatId: sId,
        boosterId: currentBooster.boosterId,
        decisionTrace,
        decisionEngine,
        boosterCards: boosterDetailed,
        pickedCardInstanceId: chosenInstanceId,
        pickedCardName: chosenName,
        justification: botJustification,
        poolSoFar: priorPoolInstanceIds.map((id) => this.getEnrichedCard(id)),
      });
    }

    // 3. Submit Round to Engine
    const roundResult = submitPickRound(this.currentDraft, {
      sessionId: this.sessionId,
      expectedRevision: round,
      packNumber,
      pickNumber,
      occurredAt,
      decisions,
    });

    if (!roundResult.ok) {
      throw new Error(`Round ${String(round)} failed: ${roundResult.error.message}`);
    }

    for (let s = 0; s < 8; s++) {
      const sId = s as SeatId;
      const step = roundSteps.get(sId);
      if (!step) continue;
      const pickedEvent = roundResult.value.appendedEvents.find(
        (e): e is CardPickedEvent => e.type === "CardPicked" && e.seatId === sId,
      );
      if (pickedEvent) {
        this.seatStepsMap.get(sId)?.push({ ...step, eventSequence: pickedEvent.sequence });
      }
    }

    this.currentDraft = roundResult.value.draft;
    this.completedRounds++;
    this.cachedAdvicePromise = null;

    if (this.completedRounds >= 45) {
      this.lifecycleStatus = "deckbuilding";
      this.draftSeconds = Math.round((Date.now() - this.startedAt) / 1000);
      this.startBotDeckbuilding();
    } else if (options.prefetchAdvice !== false) {
      this.prefetchPickAdvice();
    }

    return this.getStateDto(humanEnriched);
  }

  public calculateOptimalBasicLands(
    maindeckCardInstanceIds: readonly string[],
    targetLands = 17,
  ): BasicLandCounts {
    const counts: Record<MtGColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    for (const id of maindeckCardInstanceIds) {
      const card = this.instanceToInputMap.get(id);
      if (!card || card.isLand) continue;
      for (const col of card.colors) {
        counts[col]++;
      }
    }

    const totalPips = counts.W + counts.U + counts.B + counts.R + counts.G;
    if (totalPips === 0) {
      const evenShare = Math.floor(targetLands / 5);
      const remainder = targetLands % 5;
      return {
        Plains: evenShare + (remainder > 0 ? 1 : 0),
        Island: evenShare + (remainder > 1 ? 1 : 0),
        Swamp: evenShare + (remainder > 2 ? 1 : 0),
        Mountain: evenShare + (remainder > 3 ? 1 : 0),
        Forest: evenShare,
      };
    }

    const lands: Record<MtGColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    let allocated = 0;

    const colors: MtGColor[] = ["W", "U", "B", "R", "G"];
    for (const col of colors) {
      if (counts[col] > 0) {
        const share = Math.max(1, Math.round((counts[col] / totalPips) * targetLands));
        lands[col] = share;
        allocated += share;
      }
    }

    while (allocated < targetLands) {
      const highestColor = colors.reduce((best, c) => (counts[c] > counts[best] ? c : best), "W");
      lands[highestColor]++;
      allocated++;
    }

    while (allocated > targetLands) {
      const candidates = colors.filter((c) => lands[c] > 1);
      if (candidates.length === 0) break;
      const lowestColor = candidates.reduce(
        (worst, c) => (counts[c] < counts[worst] ? c : worst),
        candidates[0] ?? "W",
      );
      lands[lowestColor]--;
      allocated--;
    }

    return {
      Plains: lands.W,
      Island: lands.U,
      Swamp: lands.B,
      Mountain: lands.R,
      Forest: lands.G,
    };
  }

  public async buildDeckAndFinalize(
    input: SoloDeckBuildInput,
    options: {
      /** Where derived outputs go; defaults to files built from the paths below. */
      outputs?: SoloResultOutputs;
      customReportsDir?: string;
      reportsUrlPrefix?: string;
      customLeaderboardPath?: string;
      customAdminDraftsPath?: string;
    } = {},
  ): Promise<SoloDraftFinalResult> {
    const outputs =
      options.outputs ??
      createFileSoloResultOutputs({
        reportsDirectory: options.customReportsDir,
        reportsUrlPrefix: options.reportsUrlPrefix,
        adminDraftsPath: options.customAdminDraftsPath,
        leaderboardPath: options.customLeaderboardPath,
      });
    this.resultOutputs = outputs;

    // A locked result is final: a retry only finishes the outputs that failed.
    if (this.lockedResult) {
      return this.completeOutputs(this.lockedResult, outputs);
    }

    if (this.lifecycleStatus !== "deckbuilding") {
      throw new Error(`Cannot finalize deck: status is '${this.lifecycleStatus}'`);
    }

    const finalDraftView = getDraftView(this.currentDraft);
    const humanPool = finalDraftView.seats[0]?.priorPool ?? [];

    for (const id of input.maindeckCardInstanceIds) {
      if (!humanPool.includes(id)) {
        throw new Error(`Card '${id}' is not in player pool`);
      }
    }

    this.totalSeconds = Math.round((Date.now() - this.startedAt) / 1000);

    // 1. Basic Lands
    const targetBasicLands = 40 - input.maindeckCardInstanceIds.length;
    const basicLands: BasicLandCounts = {
      ...this.calculateOptimalBasicLands(input.maindeckCardInstanceIds, targetBasicLands),
      ...(input.basicLands ?? {}),
    };
    const basicLandValues = [
      basicLands.Plains,
      basicLands.Island,
      basicLands.Swamp,
      basicLands.Mountain,
      basicLands.Forest,
    ];
    const basicLandCount = basicLandValues.reduce((sum, count) => sum + count, 0);
    if (
      basicLandValues.some((count) => !Number.isInteger(count) || count < 0) ||
      input.maindeckCardInstanceIds.length + basicLandCount !== 40
    ) {
      throw new Error("Main deck and basic lands must contain exactly 40 cards");
    }
    const draftedLandCount = input.maindeckCardInstanceIds.filter((id) => {
      const card = this.instanceToInputMap.get(id);
      return (
        (card?.isLand ?? false) ||
        /\/\/\s*(?:basic\s+)?land\b/i.test(card?.typeLine ?? "") ||
        /\b(?:as|when) (?:this|that) land enters\b/i.test(card?.oracleText ?? "")
      );
    }).length;
    const totalLandCount = basicLandCount + draftedLandCount;
    if ((totalLandCount < 16 || totalLandCount > 18) && !input.landCountRationale?.trim()) {
      throw new Error(
        `A ${String(totalLandCount)}-land deck requires a concrete landCountRationale outside the normal 16 to 18 range`,
      );
    }

    // 2. Build Seat 0 Deck Summary
    const maindeckSpells: EnrichedCard[] = input.maindeckCardInstanceIds.map((id) =>
      this.getEnrichedCard(id),
    );

    const maindeckLands: EnrichedCard[] = [];
    const landTypes: (keyof BasicLandCounts)[] = [
      "Plains",
      "Island",
      "Swamp",
      "Mountain",
      "Forest",
    ];
    for (const lt of landTypes) {
      const qty = basicLands[lt];
      for (let i = 0; i < qty; i++) {
        const baseLand = BASIC_LAND_ENRICHED[lt];
        if (baseLand) {
          maindeckLands.push({
            ...baseLand,
            instanceId: `${baseLand.instanceId}-${lt.toLowerCase()}-${String(i + 1)}`,
          });
        }
      }
    }

    const allMaindeck: EnrichedCard[] = [...maindeckSpells, ...maindeckLands];
    const sideboard: EnrichedCard[] = humanPool
      .filter((id) => !input.maindeckCardInstanceIds.includes(id))
      .map((id) => this.getEnrichedCard(id));

    const humanDeckInputs: CardEvaluationInput[] = allMaindeck.map((c) => {
      const orig = this.instanceToInputMap.get(c.instanceId);
      if (orig) return orig;
      return {
        id: c.instanceId,
        name: c.name,
        staticScore: c.staticScore,
        colors: c.colors,
        cmc: c.cmc,
        typeLine: c.typeLine,
        types: c.types,
        isLand: c.isLand,
      };
    });

    const evaluationOptions = this.coachContext.deckEvaluationOptions;
    const humanEvaluation: DeckEvaluation = evaluateDeck(humanDeckInputs, evaluationOptions);

    const humanDeckSummary: FinalDeckSummary = {
      maindeckSpells,
      maindeckLands,
      allMaindeck,
      sideboard,
      archetype: humanEvaluation.archetype,
      overallScore: humanEvaluation.overallScore,
      overallTier: humanEvaluation.overallTier,
      radar: humanEvaluation.radar,
      radarTiers: humanEvaluation.radarTiers,
      audit: humanEvaluation.audit,
      macroAxes: {
        power: humanEvaluation.radar.power,
        synergy: humanEvaluation.radar.synergy,
        consistency: Math.round(
          humanEvaluation.radar.curve * 0.5 + humanEvaluation.radar.mana * 0.5,
        ),
      },
      strengths: humanEvaluation.strengths,
      weaknesses: humanEvaluation.weaknesses,
      recommendations: humanEvaluation.recommendations,
    };

    // 3. Build Decks for Bots 1 to 7
    const seatsSummary: SeatDraftSummary[] = [
      {
        seatId: 0,
        botId: "human",
        botName: this.playerName,
        title: "Challenger Solo",
        quote: "Deck construit et validé.",
        level: "elite",
        preferredColors: humanEvaluation.archetype.primaryColors,
        steps: this.seatStepsMap.get(0) ?? [],
        finalDeck: humanDeckSummary,
      },
    ];

    const botDecksMap = await (this.botDecksPromise ??
      this.computeAllBotDecks(finalDraftView, evaluationOptions));

    for (let s = 1; s < 8; s++) {
      const sId = s as SeatId;
      const poolIds = finalDraftView.seats[sId]?.priorPool ?? [];
      const poolInputs = poolIds.map(
        (id) => this.instanceToInputMap.get(id) ?? { id, name: id, staticScore: 25, colors: [] },
      );

      const botSummary =
        botDecksMap.get(sId) ??
        buildFinalDeckSummary(
          recommendDeckBuilds(poolInputs, undefined, evaluationOptions)[0],
          poolIds,
          this.instanceToEnrichedMap,
          evaluationOptions,
        );

      const profile = this.seatProfiles[sId] ??
        DEFAULT_FRIEND_SEAT_PROFILES[sId] ?? {
          id: `seat-${String(sId)}`,
          name: `Bot ${String(sId)}`,
          title: "Bot Invité",
          quote: "Prêt à drafter.",
          level: "medium" as const,
          temperature: 1.0,
          biases: {},
        };

      seatsSummary.push({
        seatId: sId,
        botId: profile.id,
        botName: profile.botName ?? profile.name,
        title: profile.title,
        quote: profile.quote,
        level: profile.level,
        preferredColors: profile.preferredColors,
        steps: this.seatStepsMap.get(sId) ?? [],
        finalDeck: botSummary,
      });
    }

    // 4. Generate Detailed Draft Report
    const completedAt = new Date().toISOString();
    const draftReportResult = buildDraftReport(this.currentDraft);
    if (!draftReportResult.ok) {
      throw new Error(`Failed to build draft report: ${draftReportResult.error.message}`);
    }

    const fullReport: DetailedDraftReport = {
      schemaVersion: 2,
      cubeKey: this.snapshot.cubeKey,
      cubeName: this.cubeName,
      coachContext: {
        contextVersion: this.coachContext.contextVersion,
        snapshotId: this.coachContext.snapshotId,
        archetypeModelVersion: this.coachContext.provenance.archetypeModelVersion ?? "unavailable",
        powerRankingId: this.coachContext.provenance.powerRankingId,
      },
      seed: this.seed,
      startedAt: new Date(this.startedAt).toISOString(),
      completedAt,
      bombDefinition: this.bombDefinition,
      draftReport: draftReportResult.value,
      seats: seatsSummary,
      initialBoosters: this.initialBoosters,
    };

    // 5. Reports first: they are idempotent and the result is locked only once they exist.
    const safePlayerName = this.playerName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const reports = await outputs.writeReports(
      fullReport,
      `draft-${String(this.seed)}-${safePlayerName}`,
    );

    const leaderboardPayload: SoloLeaderboardPayload = {
      sessionId: this.sessionId,
      playerName: this.playerName,
      magicienSlug: this.magicienSlug,
      overallScore: humanDeckSummary.overallScore,
      macroAxes: humanDeckSummary.macroAxes,
      radar: humanDeckSummary.radar,
      archetype: humanDeckSummary.archetype,
      draftDurationSeconds: this.draftSeconds,
      totalDurationSeconds: this.totalSeconds,
      seed: this.seed,
      cubeKey: this.cubeKey,
      occurredAt: completedAt,
      isHomologated: this.homologated,
      reports: { walkthroughUrl: reports.walkthroughUrl, boostersUrl: reports.boostersUrl },
      maindeckCards: maindeckSpells.map((c) => ({
        instanceId: c.instanceId,
        name: c.name,
        cmc: c.cmc,
        typeLine: c.typeLine,
        colors: c.colors,
        isLand: c.isLand,
        imageUrl: c.imageUrl,
      })),
      basicLands,
    };

    const adminSeats: AdminDraftSeatSummary[] = seatsSummary.map((seat) => ({
      seatId: seat.seatId,
      isBot: seat.seatId !== 0,
      botId: seat.botId,
      botName: seat.botName,
      title: seat.title,
      quote: seat.quote,
      level: seat.level,
      preferredColors: seat.preferredColors ?? [],
      deck: seat.finalDeck,
    }));

    const adminEntry: AdminDraftEntry = {
      id: `draft-${String(this.seed)}-${safePlayerName}-${this.sessionId}`,
      sessionId: this.sessionId,
      seed: this.seed,
      cubeKey: this.cubeKey,
      cubeName: this.cubeName,
      playerName: this.playerName,
      startedAt: new Date(this.startedAt).toISOString(),
      completedAt,
      draftDurationSeconds: this.draftSeconds,
      totalDurationSeconds: this.totalSeconds,
      reports: { walkthroughUrl: reports.walkthroughUrl, boostersUrl: reports.boostersUrl },
      seats: adminSeats,
    };

    // 6. Lock the result: from here on it is never recomputed.
    this.lockedResult = {
      result: {
        sessionId: this.sessionId,
        playerName: this.playerName,
        seed: this.seed,
        evaluation: humanDeckSummary,
        isPublished: Boolean(input.publishToLeaderboard),
        isNewHighScore: false,
        reports,
        seats: adminSeats,
      },
      leaderboardEntryId: `rec-${this.sessionId}`,
      leaderboardPayload,
      adminEntry,
      publication: { adminRecorded: false, leaderboardPublished: false },
    };
    this.lifecycleStatus = "completed";

    return this.completeOutputs(this.lockedResult, outputs);
  }

  /** Runs the outputs still pending for a locked result, recording each success. */
  private async completeOutputs(
    locked: SoloLockedResult,
    outputs: SoloResultOutputs,
  ): Promise<SoloDraftFinalResult> {
    if (!locked.publication.adminRecorded) {
      await outputs.recordAdminDraft(locked.adminEntry);
      this.lockedResult = {
        ...locked,
        publication: { ...locked.publication, adminRecorded: true },
      };
    }
    const current = this.lockedResult ?? locked;
    if (current.result.isPublished && !current.publication.leaderboardPublished) {
      await this.publishLocked(current, outputs);
    }
    return (this.lockedResult ?? current).result;
  }

  private async publishLocked(
    locked: SoloLockedResult,
    outputs: SoloResultOutputs,
  ): Promise<SoloLeaderboardPublication> {
    const publication = await outputs.publishLeaderboard(
      locked.leaderboardEntryId,
      locked.leaderboardPayload,
    );
    this.lockedResult = {
      ...locked,
      result: {
        ...locked.result,
        isPublished: true,
        leaderboardEntry: publication.entry,
        isNewHighScore: publication.isNewHighScore,
      },
      publication: { ...locked.publication, leaderboardPublished: true },
    };
    return publication;
  }

  public startBotDeckbuilding(): void {
    if (this.botDecksPromise) return;
    const finalDraftView = getDraftView(this.currentDraft);
    const evaluationOptions = this.coachContext.deckEvaluationOptions;
    this.botDecksPromise = this.computeAllBotDecks(finalDraftView, evaluationOptions);
  }

  private async computeAllBotDecks(
    finalDraftView: ReturnType<typeof getDraftView>,
    evaluationOptions: DeckEvaluationOptions,
  ): Promise<Map<SeatId, FinalDeckSummary>> {
    const map = new Map<SeatId, FinalDeckSummary>();
    const botSeats: SeatId[] = [1, 2, 3, 4, 5, 6, 7];

    const results = await Promise.all(
      botSeats.map(async (sId) => {
        const poolIds = finalDraftView.seats[sId]?.priorPool ?? [];
        const poolInputs = poolIds.map(
          (id) => this.instanceToInputMap.get(id) ?? { id, name: id, staticScore: 25, colors: [] },
        );

        let option: DeckBuildOption;
        try {
          const recommendation = await this.finalDeckCoach.recommend({
            cubeKey: this.snapshot.cubeKey,
            snapshotId: this.snapshot.snapshotId,
            pool: poolInputs,
            evaluationOptions,
          });
          option = recommendationToDeckBuildOption(recommendation);
        } catch {
          const botOptions = recommendDeckBuilds(poolInputs, undefined, evaluationOptions);
          option = botOptions[0] ?? {
            position: 1,
            title: "Option Locale",
            maindeck: poolIds.slice(0, 40),
            sideboard: poolIds.slice(40),
            evaluation: evaluateDeck(poolInputs.slice(0, 40), evaluationOptions),
          };
        }

        const summary = buildFinalDeckSummary(
          option,
          poolIds,
          this.instanceToEnrichedMap,
          evaluationOptions,
        );
        return { sId, summary };
      }),
    );

    for (const { sId, summary } of results) {
      map.set(sId, summary);
    }
    return map;
  }

  public prefetchPickAdvice(): void {
    if (this.lifecycleStatus !== "drafting") return;
    const view = getDraftView(this.currentDraft);
    const seat0 = view.seats[0];
    const booster0 = seat0?.currentBooster;
    if (!booster0 || booster0.remainingCardInstanceIds.length === 0) return;

    // Start advice computation in the background
    this.cachedAdvicePromise = this.computePickAdvice({ isPrefetch: true });
  }

  private async computePickAdvice(
    options: { skipLlm?: boolean; isPrefetch?: boolean } = {},
  ): Promise<SoloDraftPickAdvice> {
    const view = getDraftView(this.currentDraft);
    const seat0 = view.seats[0];
    const booster0 = seat0?.currentBooster;
    if (!booster0 || booster0.remainingCardInstanceIds.length === 0) {
      throw new Error("No booster available for pick advice");
    }

    const offeredInputs: CardEvaluationInput[] = booster0.remainingCardInstanceIds.map(
      (id) => this.instanceToInputMap.get(id) ?? { id, name: id, staticScore: 25, colors: [] },
    );
    const priorInputs: CardEvaluationInput[] = seat0.priorPool.map(
      (id) => this.instanceToInputMap.get(id) ?? { id, name: id, staticScore: 25, colors: [] },
    );

    const seenPrevious = this.humanSeenBoosters.get(booster0.boosterId);
    let wheelSignals: WheelSignalAnalysis | undefined;
    if (seenPrevious && view.pickNumber >= 9) {
      const passedCards: CardEvaluationInput[] = seenPrevious.passedCardIds.map(
        (id) => this.instanceToInputMap.get(id) ?? { id, name: id, staticScore: 25, colors: [] },
      );
      const pickedCard = this.instanceToInputMap.get(seenPrevious.pickedCardId);

      wheelSignals = computeWheelSignals({
        originalPickNumber: seenPrevious.pickNumber,
        currentPickNumber: view.pickNumber,
        pickedCardAtInitialPass: pickedCard,
        passedCards,
        currentBoosterCards: offeredInputs,
      });
    }

    const advice = await getUnifiedDraftAdvice({
      packCards: offeredInputs,
      priorPool: priorInputs,
      packNumber: view.packNumber,
      pickNumber: view.pickNumber,
      evaluationContext: {
        cubeKey: this.snapshot.cubeKey,
        catalog: this.catalog,
        cubeMeta: this.coachContext.cubeMeta,
        synergyProfile: this.coachContext.synergyProfile,
      },
      skipLlm: options.skipLlm,
      llmRouter: this.languageModel,
      wheelSignals,
      isPrefetch: options.isPrefetch,
    });

    return {
      topPickId: advice.topPickId,
      topPickName: advice.topPickName,
      reason: advice.reason,
      alternatives: advice.alternatives.map((alt) => ({
        id: alt.id,
        name: alt.name,
        reason: alt.reason,
      })),
      provider: advice.provider,
      packReview: advice.packReview,
      wheelSignals: advice.wheelSignals,
    };
  }

  public async getPickAdvice(options: { skipLlm?: boolean } = {}): Promise<SoloDraftPickAdvice> {
    if (this.lifecycleStatus !== "drafting") {
      throw new Error(`Cannot get pick advice: draft status is '${this.lifecycleStatus}'`);
    }

    this.homologated = false;

    // If advice was pre-calculated in the background, return it immediately (0ms wait)
    if (this.cachedAdvicePromise && !options.skipLlm) {
      try {
        let timeoutId: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error("Cached advice wait timeout"));
          }, 2500);
        });
        try {
          const cached = await Promise.race([this.cachedAdvicePromise, timeoutPromise]);
          return cached;
        } finally {
          clearTimeout(timeoutId);
        }
      } catch {
        // Fall back to on-demand computation if background promise threw or timed out
      }
    }

    return this.computePickAdvice(options);
  }

  public getPersistenceSnapshot(): SoloDraftPersistenceSnapshot & {
    readonly cubeKey: string;
    readonly isHomologated: boolean;
    readonly startedAtTimestamp: number;
  } {
    return {
      sessionId: this.sessionId,
      seed: this.seed,
      playerName: this.playerName,
      magicienSlug: this.magicienSlug,
      cubeKey: this.snapshot.cubeKey,
      humanPicks: [...this.recordedPicks],
      isHomologated: this.homologated,
      startedAtTimestamp: this.startedAt,
      draftDurationSeconds: this.draftSeconds,
      totalDurationSeconds: this.totalSeconds,
      seatAssignments: this.seatAssignments,
      ...(this.lockedResult ? { lockedResult: this.lockedResult } : {}),
    };
  }

  public static async restore(
    saved: SoloDraftPersistenceSnapshot,
    dependencies: { readonly languageModel?: CoachLanguageModel | undefined } = {},
  ): Promise<SoloDraftSession> {
    const session = await SoloDraftSession.create(
      {
        languageModel: dependencies.languageModel,
        playerName: saved.playerName,
        magicienSlug: saved.magicienSlug,
        cubeKey: saved.cubeKey ?? "titou_tribal",
        seed: saved.seed,
        explicitSessionId: saved.sessionId,
        seatAssignments: saved.seatAssignments,
      },
      { startedAtTimestamp: saved.startedAtTimestamp },
    );

    for (const pickId of saved.humanPicks) {
      if (session.status === "drafting") {
        session.makePick(pickId, { prefetchAdvice: false });
      }
    }

    // Replayed picks recompute durations from "now"; the saved ones are authoritative.
    if (saved.draftDurationSeconds !== undefined) session.draftSeconds = saved.draftDurationSeconds;
    if (saved.totalDurationSeconds !== undefined) session.totalSeconds = saved.totalDurationSeconds;
    if (saved.isHomologated !== undefined) session.homologated = saved.isHomologated;

    if (saved.lockedResult) {
      session.lockedResult = saved.lockedResult;
      session.lifecycleStatus = "completed";
    } else if (session.status === "drafting") {
      session.prefetchPickAdvice();
    } else if (session.status === "deckbuilding") {
      session.startBotDeckbuilding();
    }

    return session;
  }

  public getDeckRecommendation(): SoloDraftDeckRecommendation {
    const view = getDraftView(this.currentDraft);
    const seat0 = view.seats[0];
    const poolIds = seat0?.priorPool ?? [];
    const poolInputs = poolIds.map(
      (id) => this.instanceToInputMap.get(id) ?? { id, name: id, staticScore: 25, colors: [] },
    );

    const evaluationOptions = this.coachContext.deckEvaluationOptions;

    const options = recommendDeckBuilds(poolInputs, undefined, evaluationOptions);
    const bestOption = options[0];
    if (!bestOption) {
      throw new Error("No deck recommendation available");
    }

    const maindeckCardInstanceIds = bestOption.maindeck.filter((id) => !id.startsWith("basic-"));
    const basicLands: BasicLandCounts = {
      Plains: bestOption.maindeck.filter((id) => id === "basic-plains").length,
      Island: bestOption.maindeck.filter((id) => id === "basic-island").length,
      Swamp: bestOption.maindeck.filter((id) => id === "basic-swamp").length,
      Mountain: bestOption.maindeck.filter((id) => id === "basic-mountain").length,
      Forest: bestOption.maindeck.filter((id) => id === "basic-forest").length,
    };

    return {
      maindeckCardInstanceIds,
      basicLands,
      archetype: bestOption.evaluation.archetype,
      overallTier: bestOption.evaluation.overallTier,
      radarTiers: bestOption.evaluation.radarTiers,
      source: "local",
      provider: "DraftMaster local",
      justification: `Recommandation locale auditable basee sur l'archetype ${bestOption.evaluation.archetype.label} (${bestOption.evaluation.overallTier})`,
    };
  }

  public async getAssistedDeckRecommendation(
    coach: FinalDeckCoach,
  ): Promise<SoloDraftDeckRecommendation> {
    if (this.lifecycleStatus !== "deckbuilding") {
      throw new Error(`Cannot recommend deck: status is '${this.lifecycleStatus}'`);
    }

    // The homologation is removed before any external request or fallback can resolve.
    this.homologated = false;
    const view = getDraftView(this.currentDraft);
    const pool = (view.seats[0]?.priorPool ?? []).map(
      (id) => this.instanceToInputMap.get(id) ?? { id, name: id, staticScore: 25, colors: [] },
    );
    const recommendation = await coach.recommend({
      cubeKey: this.snapshot.cubeKey,
      snapshotId: this.snapshot.snapshotId,
      pool,
      evaluationOptions: this.coachContext.deckEvaluationOptions,
    });

    return {
      maindeckCardInstanceIds: recommendation.maindeckCardInstanceIds,
      basicLands: recommendation.basicLands,
      archetype: recommendation.evaluation.archetype,
      overallTier: recommendation.evaluation.overallTier,
      radarTiers: recommendation.evaluation.radarTiers,
      source: recommendation.source,
      provider: recommendation.provider,
      model: recommendation.model,
      strategy: recommendation.strategy,
      manaRationale: recommendation.manaRationale,
      landCountRationale: recommendation.landCountRationale,
      justification: `${recommendation.strategy} ${recommendation.manaRationale}`,
    };
  }

  /** Publishes a locked training result to the Wall of Records; repeated calls are no-ops. */
  public async publishToLeaderboard(
    outputs: SoloResultOutputs | undefined = this.resultOutputs ?? undefined,
  ): Promise<SoloLeaderboardPublication> {
    const locked = this.lockedResult;
    if (!locked) {
      throw new Error("Aucun résultat de draft disponible pour publication.");
    }
    const already = locked.result.leaderboardEntry;
    if (locked.publication.leaderboardPublished && already) {
      return { entry: already, isNewHighScore: locked.result.isNewHighScore };
    }
    return this.publishLocked(locked, outputs ?? createFileSoloResultOutputs());
  }

  private getEnrichedCard(instanceId: string): EnrichedCard {
    return (
      this.instanceToEnrichedMap.get(instanceId) ?? {
        instanceId,
        oracleId: instanceId,
        name: instanceId,
        cmc: 0,
        typeLine: "Card",
        types: [],
        colors: [],
        isLand: false,
        staticScore: 25,
      }
    );
  }
}
