import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { loadSnapshot } from "../cubes/load-snapshot.ts";
import { ArchetypeSynergyProfileRegistry } from "../cubes/archetype-synergy-profile.ts";
import { CardCatalog } from "../cards/card-catalog.ts";
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
  createFriendTablePolicies,
  DEFAULT_FRIEND_SEAT_PROFILES,
  type FriendProfile,
} from "../bots/friends/index.ts";
import { evaluatePack } from "../domain/coaching/dynamic-score.ts";
import { generateCoachingExplanation } from "../domain/coaching/coaching-explainer.ts";
import { recommendDeckBuilds } from "../domain/coaching/deck-recommender.ts";
import { evaluateDeck } from "../domain/coaching/deck-evaluation.ts";
import type {
  CardEvaluationInput,
  DeckEvaluation,
  DeckEvaluationOptions,
  DeckSynergyProfile,
  MtGColor,
  PackEvaluationContext,
} from "../domain/coaching/types.ts";
import { createSessionIdentityGenerator } from "../cli/session-identity.ts";
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
import { generateDetailedDraftHtml } from "../simulation/html-report-generator.ts";
import { generateBoosterDistributionHtml } from "../simulation/booster-distribution-html.ts";
import { saveUnifiedLeaderboardEntry } from "../storage/cloud-leaderboard.ts";
import { saveAdminDraft } from "./admin-drafts.ts";
import type {
  AdminDraftEntry,
  AdminDraftSeatSummary,
  BasicLandCounts,
  LeaderboardEntry,
  SoloDeckBuildInput,
  SoloDraftFinalResult,
  SoloDraftStartInput,
  SoloDraftStateDto,
  SoloDraftStatus,
} from "./solo-draft-types.ts";

export class SoloDraftSession {
  public readonly sessionId: string;
  public readonly seed: number;
  public readonly cubeKey: string;
  public readonly cubeName: string;
  public readonly playerName: string;
  public readonly magicienSlug?: string | undefined;
  public status: SoloDraftStatus = "drafting";
  public isHomologated = true;

  private currentDraft: Draft;
  private readonly snapshot: CubeSnapshot;
  private readonly catalog: Readonly<CardCatalog>;
  private readonly bombDefinition: CubeBombDefinition;
  private readonly synergyProfile: DeckSynergyProfile;
  private readonly bombOracleIds: ReadonlySet<string>;
  private readonly instanceToInputMap = new Map<string, CardEvaluationInput>();
  private readonly instanceToEnrichedMap = new Map<string, EnrichedCard>();
  private readonly policies: PickPolicy[];
  private readonly seatProfiles: readonly FriendProfile[];
  private readonly initialBoosters: InitialDealtBooster[] = [];
  private readonly seatStepsMap = new Map<SeatId, PickWalkthroughStep[]>();
  private lastLeaderboardPayload: Omit<LeaderboardEntry, "id" | "rank"> | null = null;
  private lastCustomLeaderboardPath?: string | undefined;

  public roundIndex = 0;
  public readonly startedAtTimestamp: number;
  public draftDurationSeconds = 0;
  public totalDurationSeconds = 0;

  private constructor(params: {
    sessionId: string;
    seed: number;
    playerName: string;
    magicienSlug?: string | undefined;
    snapshot: CubeSnapshot;
    catalog: Readonly<CardCatalog>;
    currentDraft: Draft;
    bombDefinition: CubeBombDefinition;
    synergyProfile: DeckSynergyProfile;
    bombOracleIds: ReadonlySet<string>;
    instanceToInputMap: Map<string, CardEvaluationInput>;
    instanceToEnrichedMap: Map<string, EnrichedCard>;
    policies: PickPolicy[];
    seatProfiles: readonly FriendProfile[];
    initialBoosters: InitialDealtBooster[];
  }) {
    this.sessionId = params.sessionId;
    this.seed = params.seed;
    this.playerName = params.playerName;
    this.magicienSlug = params.magicienSlug;
    this.snapshot = params.snapshot;
    this.catalog = params.catalog;
    this.currentDraft = params.currentDraft;
    this.bombDefinition = params.bombDefinition;
    this.synergyProfile = params.synergyProfile;
    this.bombOracleIds = params.bombOracleIds;
    this.instanceToInputMap = params.instanceToInputMap;
    this.instanceToEnrichedMap = params.instanceToEnrichedMap;
    this.policies = params.policies;
    this.seatProfiles = params.seatProfiles;
    this.initialBoosters = params.initialBoosters;
    this.cubeKey = params.snapshot.cubeKey;
    this.cubeName = "Titou's Tribal and Chromatic Cube";
    this.startedAtTimestamp = Date.now();

    for (let s = 0; s < 8; s++) {
      this.seatStepsMap.set(s as SeatId, []);
    }
  }

  public static async create(input: SoloDraftStartInput): Promise<SoloDraftSession> {
    const playerName = input.playerName.trim() || "Joueur";
    const seed =
      input.seed !== undefined && Number.isInteger(input.seed)
        ? input.seed
        : Math.floor(Math.random() * 2147483647);
    const cubeKey = input.cubeKey ?? "titou_tribal";
    const cubePath = `data/cubes/${cubeKey}/2026-02-24.1.json`;
    const catalogPath = "data/cards/master-cards.json";

    const snapshotResult = await loadSnapshot(cubePath);
    if (!snapshotResult.ok) {
      throw new Error(`Failed to load snapshot: ${snapshotResult.error.message}`);
    }
    const snapshot: CubeSnapshot = snapshotResult.value;

    const synergyProfileResult = await ArchetypeSynergyProfileRegistry.fromFile(
      `data/cubes/${cubeKey}/archetype-synergy-v1.json`,
    );
    if (!synergyProfileResult.ok) {
      throw new Error(`Failed to load synergy profile: ${synergyProfileResult.error.message}`);
    }
    if (
      synergyProfileResult.value.document.cubeKey !== snapshot.cubeKey ||
      synergyProfileResult.value.document.cubeSnapshotId !== snapshot.snapshotId
    ) {
      throw new Error("Archetype synergy profile does not match the cube snapshot.");
    }

    const catalogResult = await CardCatalog.fromFile(catalogPath);
    if (!catalogResult.ok) {
      throw new Error(`Failed to load catalog: ${catalogResult.error.message}`);
    }
    const catalog: Readonly<CardCatalog> = catalogResult.value;

    const bombClassification = classifyCubeBombs(snapshot, catalog);

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
        doc?.cubeAnalyses[snapshot.cubeKey] ??
        (doc ? Object.values(doc.cubeAnalyses)[0] : undefined);
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
    const evaluationContext = { cubeKey: snapshot.cubeKey, catalog } as const;
    const friendTable = createFriendTablePolicies({ resolveCard, evaluationContext });

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

    const identityGenerator = createSessionIdentityGenerator();
    const identity = identityGenerator.create(seed);
    const sessionId = identity.sessionId;
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

    return new SoloDraftSession({
      sessionId,
      seed,
      playerName,
      magicienSlug: input.magicienSlug,
      snapshot,
      catalog,
      currentDraft: startResult.value.draft,
      bombDefinition: bombClassification.definition,
      synergyProfile: synergyProfileResult.value.evaluationProfile,
      bombOracleIds: bombClassification.oracleIds,
      instanceToInputMap,
      instanceToEnrichedMap,
      policies,
      seatProfiles,
      initialBoosters,
    });
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
      this.status === "completed"
        ? this.totalDurationSeconds
        : Math.round((Date.now() - this.startedAtTimestamp) / 1000);

    return {
      sessionId: this.sessionId,
      seed: this.seed,
      cubeKey: this.cubeKey,
      cubeName: this.cubeName,
      playerName: this.playerName,
      magicienSlug: this.magicienSlug,
      status: this.status,
      roundIndex: this.roundIndex,
      packNumber: view.packNumber,
      pickNumber: view.pickNumber,
      totalRounds: 45,
      direction,
      nextBoosterFromBotName,
      currentBooster,
      playerPool,
      elapsedSeconds,
      isHomologated: this.isHomologated,
      lastPickedCard,
    };
  }

  public makePick(cardInstanceId: string): SoloDraftStateDto {
    if (this.status !== "drafting") {
      throw new Error(`Cannot make pick: draft status is '${this.status}'`);
    }

    const view = getDraftView(this.currentDraft);
    if (view.status === "completed" || this.roundIndex >= 45) {
      this.status = "deckbuilding";
      this.draftDurationSeconds = Math.round((Date.now() - this.startedAtTimestamp) / 1000);
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

    const round = this.roundIndex;
    const packNumber = view.packNumber;
    const pickNumber = view.pickNumber;
    const occurredAt = new Date(this.startedAtTimestamp + (round + 1) * 1000).toISOString();
    const evaluationContext = { cubeKey: this.snapshot.cubeKey, catalog: this.catalog } as const;

    const decisions: SeatDecision[] = [];
    const roundSteps = new Map<SeatId, Omit<PickWalkthroughStep, "eventSequence">>();

    // 1. Human Decision (Seat 0)
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

      roundSteps.set(sId, {
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
    this.roundIndex++;

    if (this.roundIndex >= 45) {
      this.status = "deckbuilding";
      this.draftDurationSeconds = Math.round((Date.now() - this.startedAtTimestamp) / 1000);
    }

    return this.getStateDto(humanEnriched);
  }

  public calculateOptimalBasicLands(maindeckCardInstanceIds: readonly string[]): BasicLandCounts {
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
      return { Plains: 4, Island: 4, Swamp: 3, Mountain: 3, Forest: 3 };
    }

    const TARGET_LANDS = 17;
    const lands: Record<MtGColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    let allocated = 0;

    const colors: MtGColor[] = ["W", "U", "B", "R", "G"];
    for (const col of colors) {
      if (counts[col] > 0) {
        const share = Math.max(1, Math.round((counts[col] / totalPips) * TARGET_LANDS));
        lands[col] = share;
        allocated += share;
      }
    }

    // Adjust to reach exactly TARGET_LANDS
    while (allocated < TARGET_LANDS) {
      const highestColor = colors.reduce((best, c) => (counts[c] > counts[best] ? c : best), "W");
      lands[highestColor]++;
      allocated++;
    }

    while (allocated > TARGET_LANDS) {
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
      customReportsDir?: string;
      reportsUrlPrefix?: string;
      customLeaderboardPath?: string;
      customAdminDraftsPath?: string;
    } = {},
  ): Promise<SoloDraftFinalResult> {
    if (this.status !== "deckbuilding") {
      throw new Error(`Cannot finalize deck: status is '${this.status}'`);
    }

    if (input.maindeckCardInstanceIds.length !== 23) {
      throw new Error(
        `Main deck must contain exactly 23 cards (received ${String(input.maindeckCardInstanceIds.length)})`,
      );
    }

    const finalDraftView = getDraftView(this.currentDraft);
    const humanPool = finalDraftView.seats[0]?.priorPool ?? [];

    for (const id of input.maindeckCardInstanceIds) {
      if (!humanPool.includes(id)) {
        throw new Error(`Card '${id}' is not in player pool`);
      }
    }

    this.totalDurationSeconds = Math.round((Date.now() - this.startedAtTimestamp) / 1000);

    // 1. Basic Lands
    const basicLands: BasicLandCounts = {
      ...this.calculateOptimalBasicLands(input.maindeckCardInstanceIds),
      ...(input.basicLands ?? {}),
    };

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

    const evaluationOptions: DeckEvaluationOptions = {
      bombThreshold: this.bombDefinition.cutoffScore,
      synergyProfile: this.synergyProfile,
    };
    const humanEvaluation: DeckEvaluation = evaluateDeck(humanDeckInputs, evaluationOptions);

    const humanDeckSummary: FinalDeckSummary = {
      maindeckSpells,
      maindeckLands,
      allMaindeck,
      sideboard,
      archetype: humanEvaluation.archetype,
      overallScore: humanEvaluation.overallScore,
      radar: humanEvaluation.radar,
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

    for (let s = 1; s < 8; s++) {
      const sId = s as SeatId;
      const poolIds = finalDraftView.seats[sId]?.priorPool ?? [];
      const poolInputs = poolIds.map(
        (id) => this.instanceToInputMap.get(id) ?? { id, name: id, staticScore: 25, colors: [] },
      );

      const botOptions = recommendDeckBuilds(poolInputs, undefined, evaluationOptions);
      const bestBotOption = botOptions[0];

      const botSummary = buildFinalDeckSummary(
        bestBotOption,
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
      seed: this.seed,
      startedAt: new Date(this.startedAtTimestamp).toISOString(),
      completedAt,
      bombDefinition: this.bombDefinition,
      draftReport: draftReportResult.value,
      seats: seatsSummary,
      initialBoosters: this.initialBoosters,
    };

    // 5. Save HTML Reports
    const safePlayerName = this.playerName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const reportsDir = options.customReportsDir ?? "reports";
    const walkthroughFilename = `draft-${String(this.seed)}-${safePlayerName}.html`;
    const boostersFilename = `draft-${String(this.seed)}-${safePlayerName}-boosters.html`;

    const fullWalkthroughPath = resolve(process.cwd(), reportsDir, walkthroughFilename);
    const fullBoostersPath = resolve(process.cwd(), reportsDir, boostersFilename);

    await mkdir(dirname(fullWalkthroughPath), { recursive: true });

    const walkthroughHtml = generateDetailedDraftHtml(fullReport);
    const boostersHtml = generateBoosterDistributionHtml(fullReport);

    await writeFile(fullWalkthroughPath, walkthroughHtml, "utf8");
    await writeFile(fullBoostersPath, boostersHtml, "utf8");

    const reportsUrlPrefix = options.reportsUrlPrefix ?? `/${reportsDir}`;
    const walkthroughUrl = `${reportsUrlPrefix}/${walkthroughFilename}`;
    const boostersUrl = `${reportsUrlPrefix}/${boostersFilename}`;

    // 6. Add to Leaderboard (Cloud Supabase + Local JSON Sync) ONLY if publishToLeaderboard is true
    const payload: Omit<LeaderboardEntry, "id" | "rank"> = {
      playerName: this.playerName,
      magicienSlug: this.magicienSlug,
      overallScore: humanDeckSummary.overallScore,
      macroAxes: humanDeckSummary.macroAxes,
      radar: humanDeckSummary.radar,
      archetype: humanDeckSummary.archetype,
      draftDurationSeconds: this.draftDurationSeconds,
      totalDurationSeconds: this.totalDurationSeconds,
      seed: this.seed,
      cubeKey: this.cubeKey,
      occurredAt: completedAt,
      isHomologated: this.isHomologated,
      reports: {
        walkthroughUrl,
        boostersUrl,
      },
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

    this.lastLeaderboardPayload = payload;
    this.lastCustomLeaderboardPath = options.customLeaderboardPath;

    const shouldPublish = Boolean(input.publishToLeaderboard);
    let leaderboardEntry: LeaderboardEntry | undefined;
    let isNewHighScore = false;

    if (shouldPublish) {
      const leaderboardResult = await saveUnifiedLeaderboardEntry(
        payload,
        options.customLeaderboardPath,
      );
      leaderboardEntry = leaderboardResult.entry;
      isNewHighScore = leaderboardResult.isNewHighScore;
    }

    // 7. Save Admin Draft with all 8 seats (human + 7 bots)
    const adminSeats: AdminDraftSeatSummary[] = seatsSummary.map((s) => ({
      seatId: s.seatId,
      isBot: s.seatId !== 0,
      botId: s.botId,
      botName: s.botName,
      title: s.title,
      quote: s.quote,
      level: s.level,
      preferredColors: s.preferredColors ?? [],
      deck: s.finalDeck,
    }));

    const adminEntry: AdminDraftEntry = {
      id: `draft-${String(this.seed)}-${safePlayerName}-${String(Date.now())}`,
      sessionId: this.sessionId,
      seed: this.seed,
      cubeKey: this.cubeKey,
      cubeName: this.cubeName,
      playerName: this.playerName,
      startedAt: new Date(this.startedAtTimestamp).toISOString(),
      completedAt,
      draftDurationSeconds: this.draftDurationSeconds,
      totalDurationSeconds: this.totalDurationSeconds,
      reports: {
        walkthroughUrl,
        boostersUrl,
      },
      seats: adminSeats,
    };

    await saveAdminDraft(adminEntry, options.customAdminDraftsPath);

    this.status = "completed";

    return {
      sessionId: this.sessionId,
      playerName: this.playerName,
      seed: this.seed,
      evaluation: humanDeckSummary,
      leaderboardEntry,
      isPublished: shouldPublish,
      isNewHighScore,
      reports: {
        walkthroughPath: fullWalkthroughPath,
        boostersPath: fullBoostersPath,
        walkthroughUrl,
        boostersUrl,
      },
    };
  }

  public async publishToLeaderboard(customPath?: string): Promise<{
    readonly entry: LeaderboardEntry;
    readonly isNewHighScore: boolean;
  }> {
    if (!this.lastLeaderboardPayload) {
      throw new Error("Aucun résultat de draft disponible pour publication.");
    }
    const result = await saveUnifiedLeaderboardEntry(
      this.lastLeaderboardPayload,
      customPath ?? this.lastCustomLeaderboardPath,
    );
    return result;
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
