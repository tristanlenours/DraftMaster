import { createHash } from "node:crypto";

import { createRoundRobinThreeRounds, createSwissRound } from "./internal/pairing.ts";
import { reduceTournamentEvent } from "./internal/state-reducer.ts";
import type {
  CreateTournamentCommand,
  MatchOutcome,
  TournamentCommand,
  TournamentCoordinator,
  TournamentCoordinatorDependencies,
  TournamentCubeSummary,
  TournamentError,
  TournamentListQuery,
  TournamentParticipant,
  TournamentProjection,
  TournamentResult,
  TournamentSummary,
} from "./types.ts";

function failure(error: TournamentError): TournamentResult<never> {
  return { ok: false, error };
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase("fr-FR").replace(/\s+/gu, " ");
}

function deriveOutcome(gamesWonA: number, gamesWonB: number): MatchOutcome {
  if (gamesWonA > gamesWonB) return "a-win";
  if (gamesWonB > gamesWonA) return "b-win";
  return "draw";
}

class DefaultTournamentCoordinator implements TournamentCoordinator {
  private readonly dependencies: Readonly<TournamentCoordinatorDependencies>;

  public constructor(dependencies: Readonly<TournamentCoordinatorDependencies>) {
    this.dependencies = dependencies;
  }

  public checkReadiness(): Promise<TournamentResult<{ readonly ready: true }>> {
    return this.dependencies.store.checkReadiness();
  }

  public listCubes(): Promise<TournamentResult<readonly TournamentCubeSummary[]>> {
    return this.dependencies.cubeCatalog.listCubes();
  }

  public async createTournament(
    command: Readonly<CreateTournamentCommand>,
  ): Promise<TournamentResult<TournamentProjection>> {
    const name = command.name.trim();
    if (command.requestId.trim() === "" || name === "") {
      return failure({
        code: "INVALID_INPUT",
        message: "Le nom du tournoi et la clé d'idempotence sont obligatoires.",
        details: { field: name === "" ? "name" : "requestId" },
      });
    }

    const tournamentId = this.dependencies.createId();
    const occurredAt = this.dependencies.now();
    const event = {
      schemaVersion: 1,
      sequence: 1,
      tournamentId,
      revision: 0,
      requestId: command.requestId,
      occurredAt,
      type: "TournamentCreated",
      name,
      pairingSeed: this.dependencies.createSeed(),
    } as const;
    const tournament = reduceTournamentEvent(null, event);
    const committed = await this.dependencies.store.commit({
      scope: "tournaments",
      tournamentId,
      expectedRevision: null,
      requestId: command.requestId,
      requestFingerprint: fingerprint({ type: "create-tournament", name }),
      snapshotArchives: [],
      appendedEvents: [event],
      nextState: tournament,
      response: tournament,
    });
    return committed.ok ? { ok: true, value: committed.value.tournament } : committed;
  }

  public async execute(
    command: Readonly<TournamentCommand>,
  ): Promise<TournamentResult<TournamentProjection>> {
    if (command.type === "start") return this.startTournament(command);
    if (command.type === "publish-next-round") return this.publishNextRound(command);
    if (command.type === "record-result") return this.recordMatchResult(command);
    if (command.type === "drop-participant") return this.dropParticipant(command);
    if (command.type === "complete") return this.completeTournament(command);
    if (command.type === "update-key-cards") return this.updateDeckKeyCards(command);

    const loaded = await this.dependencies.store.load(command.tournamentId);
    if (!loaded.ok) return loaded;
    if (loaded.value === null) {
      return failure({
        code: "TOURNAMENT_NOT_FOUND",
        message: "Ce tournoi n'existe pas.",
        details: { tournamentId: command.tournamentId },
      });
    }
    const current = loaded.value.checkpoint;
    const staleResult = await this.resolveStaleMutation(command, current);
    if (staleResult !== null) return staleResult;
    if (current.status !== "preparation") {
      return failure({
        code: "INVALID_STATE",
        message: "La configuration est verrouillée après le démarrage du tournoi.",
        details: { status: current.status },
      });
    }

    const validation = this.validateSetup(command, current);
    if (!validation.ok) return validation;
    const snapshot = await this.dependencies.cubeCatalog.loadSnapshot(command.cubeKey);
    if (!snapshot.ok) return snapshot;

    const occurredAt = this.dependencies.now();
    const event = {
      schemaVersion: 1,
      sequence: loaded.value.events.length + 1,
      tournamentId: current.tournamentId,
      revision: current.revision + 1,
      requestId: command.requestId,
      occurredAt,
      type: "TournamentSetupReplaced",
      name: command.name.trim(),
      format: command.format,
      plannedRoundCount: command.plannedRoundCount,
      cube: snapshot.value,
      participants: validation.value,
    } as const;
    const nextState = reduceTournamentEvent(current, event);
    const committed = await this.dependencies.store.commit({
      scope: current.tournamentId,
      tournamentId: current.tournamentId,
      expectedRevision: command.expectedRevision,
      requestId: command.requestId,
      requestFingerprint: fingerprint(command),
      snapshotArchives: [snapshot.value],
      appendedEvents: [event],
      nextState,
      response: nextState,
    });
    return committed.ok ? { ok: true, value: committed.value.tournament } : committed;
  }

  private async startTournament(
    command: Extract<Readonly<TournamentCommand>, { readonly type: "start" }>,
  ): Promise<TournamentResult<TournamentProjection>> {
    const loaded = await this.dependencies.store.load(command.tournamentId);
    if (!loaded.ok) return loaded;
    if (loaded.value === null) {
      return failure({
        code: "TOURNAMENT_NOT_FOUND",
        message: "Ce tournoi n'existe pas.",
        details: { tournamentId: command.tournamentId },
      });
    }
    const current = loaded.value.checkpoint;
    const staleResult = await this.resolveStaleMutation(command, current);
    if (staleResult !== null) return staleResult;
    if (
      current.status !== "preparation" ||
      current.cube === null ||
      current.format === null ||
      current.plannedRoundCount === null ||
      current.participants.length < 2
    ) {
      return failure({
        code: "INVALID_STATE",
        message: "La configuration doit être complète avant le démarrage du tournoi.",
        details: { status: current.status },
      });
    }
    if (command.requestId.trim() === "") {
      return failure({
        code: "INVALID_INPUT",
        message: "La clé d'idempotence est obligatoire.",
        details: { field: "requestId" },
      });
    }

    const occurredAt = this.dependencies.now();
    const revision = current.revision + 1;
    const startedEvent = {
      schemaVersion: 1,
      sequence: loaded.value.events.length + 1,
      tournamentId: current.tournamentId,
      revision,
      requestId: command.requestId,
      occurredAt,
      type: "TournamentStarted",
      startedAt: occurredAt,
    } as const;
    const rounds =
      current.format === "swiss"
        ? [
            createSwissRound({
              tournamentId: current.tournamentId,
              roundNumber: 1,
              sourceRevision: current.revision,
              pairingSeed: current.pairingSeed,
              participants: current.participants,
              standings: current.standings,
              priorRounds: current.rounds,
              publishedAt: occurredAt,
              requestId: command.requestId,
              createMatchId: this.dependencies.createId,
            }),
          ]
        : createRoundRobinThreeRounds({
            tournamentId: current.tournamentId,
            sourceRevision: current.revision,
            pairingSeed: current.pairingSeed,
            participants: current.participants,
            publishedAt: occurredAt,
            requestId: command.requestId,
            createMatchId: this.dependencies.createId,
          });
    const roundEvents = rounds.map(
      (round, index) =>
        ({
          schemaVersion: 1,
          sequence: startedEvent.sequence + index + 1,
          tournamentId: current.tournamentId,
          revision,
          requestId: command.requestId,
          occurredAt,
          type: "RoundPublished",
          round,
        }) as const,
    );
    const started = reduceTournamentEvent(current, startedEvent);
    const nextState = roundEvents.reduce(reduceTournamentEvent, started);
    const committed = await this.dependencies.store.commit({
      scope: current.tournamentId,
      tournamentId: current.tournamentId,
      expectedRevision: command.expectedRevision,
      requestId: command.requestId,
      requestFingerprint: fingerprint(command),
      snapshotArchives: [],
      appendedEvents: [startedEvent, ...roundEvents],
      nextState,
      response: nextState,
    });
    return committed.ok ? { ok: true, value: committed.value.tournament } : committed;
  }

  private async publishNextRound(
    command: Extract<Readonly<TournamentCommand>, { readonly type: "publish-next-round" }>,
  ): Promise<TournamentResult<TournamentProjection>> {
    const loaded = await this.dependencies.store.load(command.tournamentId);
    if (!loaded.ok) return loaded;
    if (loaded.value === null) {
      return failure({
        code: "TOURNAMENT_NOT_FOUND",
        message: "Ce tournoi n'existe pas.",
        details: { tournamentId: command.tournamentId },
      });
    }
    const current = loaded.value.checkpoint;
    const staleResult = await this.resolveStaleMutation(command, current);
    if (staleResult !== null) return staleResult;
    if (current.status !== "active" || current.format !== "swiss") {
      return failure({
        code: "INVALID_STATE",
        message: "Une nouvelle ronde suisse exige un tournoi actif.",
        details: { status: current.status, format: current.format },
      });
    }
    const previousRound = current.rounds.at(-1);
    if (previousRound?.status !== "completed") {
      return failure({
        code: "ROUND_INCOMPLETE",
        message: "La ronde actuelle doit être terminée avant de publier la suivante.",
        details: { roundNumber: previousRound?.roundNumber ?? null },
      });
    }
    if (current.plannedRoundCount === null || current.rounds.length >= current.plannedRoundCount) {
      return failure({
        code: "ROUND_LIMIT_REACHED",
        message: "Le nombre de rondes prévu est déjà atteint.",
        details: { plannedRoundCount: current.plannedRoundCount },
      });
    }
    if (command.requestId.trim() === "") {
      return failure({
        code: "INVALID_INPUT",
        message: "La clé d'idempotence est obligatoire.",
        details: { field: "requestId" },
      });
    }

    const occurredAt = this.dependencies.now();
    const revision = current.revision + 1;
    const round = createSwissRound({
      tournamentId: current.tournamentId,
      roundNumber: current.rounds.length + 1,
      sourceRevision: current.revision,
      pairingSeed: current.pairingSeed,
      participants: current.participants,
      standings: current.standings,
      priorRounds: current.rounds,
      publishedAt: occurredAt,
      requestId: command.requestId,
      createMatchId: this.dependencies.createId,
    });
    const event = {
      schemaVersion: 1,
      sequence: loaded.value.events.length + 1,
      tournamentId: current.tournamentId,
      revision,
      requestId: command.requestId,
      occurredAt,
      type: "RoundPublished",
      round,
    } as const;
    const nextState = reduceTournamentEvent(current, event);
    const committed = await this.dependencies.store.commit({
      scope: current.tournamentId,
      tournamentId: current.tournamentId,
      expectedRevision: command.expectedRevision,
      requestId: command.requestId,
      requestFingerprint: fingerprint(command),
      snapshotArchives: [],
      appendedEvents: [event],
      nextState,
      response: nextState,
    });
    return committed.ok ? { ok: true, value: committed.value.tournament } : committed;
  }

  private async resolveStaleMutation(
    command: Readonly<TournamentCommand>,
    current: Readonly<TournamentProjection>,
  ): Promise<TournamentResult<TournamentProjection> | null> {
    if (command.expectedRevision === current.revision) return null;

    const committed = await this.dependencies.store.commit({
      scope: current.tournamentId,
      tournamentId: current.tournamentId,
      expectedRevision: command.expectedRevision,
      requestId: command.requestId,
      requestFingerprint: fingerprint(command),
      snapshotArchives: [],
      appendedEvents: [],
      nextState: current,
      response: current,
    });
    return committed.ok ? { ok: true, value: committed.value.tournament } : committed;
  }

  private async recordMatchResult(
    command: Extract<Readonly<TournamentCommand>, { readonly type: "record-result" }>,
  ): Promise<TournamentResult<TournamentProjection>> {
    const loaded = await this.dependencies.store.load(command.tournamentId);
    if (!loaded.ok) return loaded;
    if (loaded.value === null) {
      return failure({
        code: "TOURNAMENT_NOT_FOUND",
        message: "Ce tournoi n'existe pas.",
        details: { tournamentId: command.tournamentId },
      });
    }
    const current = loaded.value.checkpoint;
    const staleResult = await this.resolveStaleMutation(command, current);
    if (staleResult !== null) return staleResult;
    if (current.status !== "active" && current.status !== "completed") {
      return failure({
        code: "INVALID_STATE",
        message: "Un résultat exige un tournoi lancé.",
        details: { status: current.status },
      });
    }
    const match = current.rounds
      .flatMap(({ matches }) => matches)
      .find(({ matchId }) => matchId === command.matchId);
    if (match?.participantBId == null) {
      return failure({
        code: "MATCH_NOT_FOUND",
        message: "Ce match jouable n'existe pas dans le tournoi.",
        details: { matchId: command.matchId },
      });
    }
    if (current.status === "completed" && match.currentResultVersion === null) {
      return failure({
        code: "INVALID_STATE",
        message: "Seule une correction est autorisée après finalisation.",
        details: { matchId: command.matchId },
      });
    }
    const scoreValues = [command.gamesWonA, command.gamesWonB, command.drawnGames];
    const hasValidCounters = scoreValues.every(
      (value) => Number.isInteger(value) && value >= 0 && value <= 9,
    );
    const isValidPlayed =
      command.kind === "played" &&
      hasValidCounters &&
      command.gamesWonA + command.gamesWonB + command.drawnGames > 0;
    const isValidForfeit =
      command.kind === "forfeit" &&
      hasValidCounters &&
      command.drawnGames === 0 &&
      ((command.gamesWonA === 2 && command.gamesWonB === 0) ||
        (command.gamesWonA === 0 && command.gamesWonB === 2));
    if (!isValidPlayed && !isValidForfeit) {
      return failure({
        code: "INVALID_RESULT",
        message: "Le score du match est invalide.",
        details: { matchId: command.matchId },
      });
    }
    const correctionReason = command.reason?.trim() ?? "";
    if (match.currentResultVersion !== null && correctionReason === "") {
      return failure({
        code: "INVALID_RESULT",
        message: "Une correction de résultat exige un motif.",
        details: { matchId: command.matchId, field: "reason" },
      });
    }
    if (command.requestId.trim() === "") {
      return failure({
        code: "INVALID_INPUT",
        message: "La clé d'idempotence est obligatoire.",
        details: { field: "requestId" },
      });
    }

    const occurredAt = this.dependencies.now();
    const result = {
      version: (match.currentResultVersion ?? 0) + 1,
      kind: command.kind,
      gamesWonA: command.gamesWonA,
      gamesWonB: command.gamesWonB,
      drawnGames: command.drawnGames,
      outcome: deriveOutcome(command.gamesWonA, command.gamesWonB),
      recordedAt: occurredAt,
      requestId: command.requestId,
      replacesVersion: match.currentResultVersion,
      reason: correctionReason || null,
    } as const;
    const eventBase = {
      schemaVersion: 1,
      sequence: loaded.value.events.length + 1,
      tournamentId: current.tournamentId,
      revision: current.revision + 1,
      requestId: command.requestId,
      occurredAt,
      matchId: match.matchId,
    } as const;
    const event =
      match.currentResultVersion === null
        ? ({ ...eventBase, type: "MatchResultRecorded", result } as const)
        : ({ ...eventBase, type: "MatchResultCorrected", result } as const);
    const nextState = reduceTournamentEvent(current, event);
    const committed = await this.dependencies.store.commit({
      scope: current.tournamentId,
      tournamentId: current.tournamentId,
      expectedRevision: command.expectedRevision,
      requestId: command.requestId,
      requestFingerprint: fingerprint(command),
      snapshotArchives: [],
      appendedEvents: [event],
      nextState,
      response: nextState,
    });
    return committed.ok ? { ok: true, value: committed.value.tournament } : committed;
  }

  private async dropParticipant(
    command: Extract<Readonly<TournamentCommand>, { readonly type: "drop-participant" }>,
  ): Promise<TournamentResult<TournamentProjection>> {
    const loaded = await this.dependencies.store.load(command.tournamentId);
    if (!loaded.ok) return loaded;
    if (loaded.value === null) {
      return failure({
        code: "TOURNAMENT_NOT_FOUND",
        message: "Ce tournoi n'existe pas.",
        details: { tournamentId: command.tournamentId },
      });
    }
    const current = loaded.value.checkpoint;
    const staleResult = await this.resolveStaleMutation(command, current);
    if (staleResult !== null) return staleResult;
    if (current.status !== "active") {
      return failure({
        code: "INVALID_STATE",
        message: "Un abandon exige un tournoi actif.",
        details: { status: current.status },
      });
    }
    const participant = current.participants.find(
      ({ participantId }) => participantId === command.participantId,
    );
    if (participant?.status !== "active") {
      return failure({
        code: "INVALID_INPUT",
        message: "Ce participant actif n'existe pas dans le tournoi.",
        details: { participantId: command.participantId },
      });
    }
    const reason = command.reason.trim();
    if (command.requestId.trim() === "" || reason === "") {
      return failure({
        code: "INVALID_INPUT",
        message: "La clé d'idempotence et le motif d'abandon sont obligatoires.",
        details: { field: command.requestId.trim() === "" ? "requestId" : "reason" },
      });
    }

    const occurredAt = this.dependencies.now();
    const event = {
      schemaVersion: 1,
      sequence: loaded.value.events.length + 1,
      tournamentId: current.tournamentId,
      revision: current.revision + 1,
      requestId: command.requestId,
      occurredAt,
      type: "ParticipantDropped",
      participantId: participant.participantId,
      reason,
    } as const;
    const nextState = reduceTournamentEvent(current, event);
    const committed = await this.dependencies.store.commit({
      scope: current.tournamentId,
      tournamentId: current.tournamentId,
      expectedRevision: command.expectedRevision,
      requestId: command.requestId,
      requestFingerprint: fingerprint(command),
      snapshotArchives: [],
      appendedEvents: [event],
      nextState,
      response: nextState,
    });
    return committed.ok ? { ok: true, value: committed.value.tournament } : committed;
  }

  private async completeTournament(
    command: Extract<Readonly<TournamentCommand>, { readonly type: "complete" }>,
  ): Promise<TournamentResult<TournamentProjection>> {
    const loaded = await this.dependencies.store.load(command.tournamentId);
    if (!loaded.ok) return loaded;
    if (loaded.value === null) {
      return failure({
        code: "TOURNAMENT_NOT_FOUND",
        message: "Ce tournoi n'existe pas.",
        details: { tournamentId: command.tournamentId },
      });
    }
    const current = loaded.value.checkpoint;
    const staleResult = await this.resolveStaleMutation(command, current);
    if (staleResult !== null) return staleResult;
    if (current.status !== "active") {
      return failure({
        code: "INVALID_STATE",
        message: "Seul un tournoi actif peut être finalisé.",
        details: { status: current.status },
      });
    }
    const scheduleComplete =
      current.plannedRoundCount !== null &&
      current.rounds.length === current.plannedRoundCount &&
      current.rounds.every(({ status }) => status === "completed");
    if (!scheduleComplete) {
      return failure({
        code: "ROUND_INCOMPLETE",
        message: "Toutes les rondes prévues doivent être terminées avant la finalisation.",
        details: {
          plannedRoundCount: current.plannedRoundCount,
          publishedRoundCount: current.rounds.length,
          incompleteRoundNumbers: current.rounds
            .filter(({ status }) => status !== "completed")
            .map(({ roundNumber }) => roundNumber),
        },
      });
    }
    if (command.requestId.trim() === "") {
      return failure({
        code: "INVALID_INPUT",
        message: "La clé d'idempotence est obligatoire.",
        details: { field: "requestId" },
      });
    }

    const occurredAt = this.dependencies.now();
    const event = {
      schemaVersion: 1,
      sequence: loaded.value.events.length + 1,
      tournamentId: current.tournamentId,
      revision: current.revision + 1,
      requestId: command.requestId,
      occurredAt,
      type: "TournamentCompleted",
      completedAt: occurredAt,
    } as const;
    const nextState = reduceTournamentEvent(current, event);
    const committed = await this.dependencies.store.commit({
      scope: current.tournamentId,
      tournamentId: current.tournamentId,
      expectedRevision: command.expectedRevision,
      requestId: command.requestId,
      requestFingerprint: fingerprint(command),
      snapshotArchives: [],
      appendedEvents: [event],
      nextState,
      response: nextState,
    });
    return committed.ok ? { ok: true, value: committed.value.tournament } : committed;
  }

  private async updateDeckKeyCards(
    command: Extract<Readonly<TournamentCommand>, { readonly type: "update-key-cards" }>,
  ): Promise<TournamentResult<TournamentProjection>> {
    const loaded = await this.dependencies.store.load(command.tournamentId);
    if (!loaded.ok) return loaded;
    if (loaded.value === null) {
      return failure({
        code: "TOURNAMENT_NOT_FOUND",
        message: "Ce tournoi n'existe pas.",
        details: { tournamentId: command.tournamentId },
      });
    }
    const current = loaded.value.checkpoint;
    const staleResult = await this.resolveStaleMutation(command, current);
    if (staleResult !== null) return staleResult;
    const participant = current.participants.find(
      ({ participantId }) => participantId === command.participantId,
    );
    if (participant === undefined || current.cube === null) {
      return failure({
        code: "INVALID_INPUT",
        message: "Le participant et le Snapshot verrouillé sont obligatoires.",
        details: { participantId: command.participantId },
      });
    }
    if (command.requestId.trim() === "") {
      return failure({
        code: "INVALID_INPUT",
        message: "La clé d'idempotence est obligatoire.",
        details: { field: "requestId" },
      });
    }
    const cardsByOracleId = new Map<string, { readonly oracleId: string; readonly name: string }>();
    for (const card of current.cube.payload.cards) {
      if (!cardsByOracleId.has(card.oracleId)) {
        cardsByOracleId.set(card.oracleId, { oracleId: card.oracleId, name: card.name });
      }
    }
    const uniqueOracleIds = [...new Set(command.oracleIds)];
    const unknownOracleIds = uniqueOracleIds.filter((oracleId) => !cardsByOracleId.has(oracleId));
    if (unknownOracleIds.length > 0) {
      return failure({
        code: "INVALID_INPUT",
        message: "Une ou plusieurs cartes n'appartiennent pas au Snapshot verrouillé.",
        details: { unknownOracleIds },
      });
    }
    const keyCards = uniqueOracleIds.flatMap((oracleId) => {
      const card = cardsByOracleId.get(oracleId);
      return card === undefined ? [] : [card];
    });
    const occurredAt = this.dependencies.now();
    const event = {
      schemaVersion: 1,
      sequence: loaded.value.events.length + 1,
      tournamentId: current.tournamentId,
      revision: current.revision + 1,
      requestId: command.requestId,
      occurredAt,
      type: "DeckKeyCardsUpdated",
      participantId: participant.participantId,
      keyCards,
    } as const;
    const nextState = reduceTournamentEvent(current, event);
    const committed = await this.dependencies.store.commit({
      scope: current.tournamentId,
      tournamentId: current.tournamentId,
      expectedRevision: command.expectedRevision,
      requestId: command.requestId,
      requestFingerprint: fingerprint(command),
      snapshotArchives: [],
      appendedEvents: [event],
      nextState,
      response: nextState,
    });
    return committed.ok ? { ok: true, value: committed.value.tournament } : committed;
  }

  private validateSetup(
    command: Extract<Readonly<TournamentCommand>, { readonly type: "replace-setup" }>,
    current: Readonly<TournamentProjection>,
  ): TournamentResult<readonly TournamentParticipant[]> {
    if (
      command.requestId.trim() === "" ||
      command.name.trim() === "" ||
      command.cubeKey.trim() === "" ||
      !Number.isInteger(command.plannedRoundCount) ||
      command.plannedRoundCount < 1 ||
      command.plannedRoundCount > 5
    ) {
      return failure({
        code: "INVALID_INPUT",
        message: "La configuration du tournoi est incomplète ou invalide.",
        details: {},
      });
    }
    if (command.participants.length < 2 || command.participants.length > 32) {
      return failure({
        code: "INVALID_PARTICIPANT_COUNT",
        message: "Un tournoi doit contenir entre 2 et 32 participants.",
        details: { actual: command.participants.length, maximum: 32, minimum: 2 },
      });
    }
    if (command.format === "round-robin-three" && command.participants.length !== 3) {
      return failure({
        code: "INVALID_PARTICIPANT_COUNT",
        message: "Le format toutes-rondes à trois exige exactement trois participants.",
        details: { actual: command.participants.length, expected: 3 },
      });
    }
    if (command.format === "round-robin-three" && command.plannedRoundCount !== 3) {
      return failure({
        code: "INVALID_INPUT",
        message: "Le format toutes-rondes à trois contient exactement trois rondes.",
        details: { plannedRoundCount: command.plannedRoundCount, expected: 3 },
      });
    }

    const existingById = new Map(
      current.participants.map((participant) => [participant.participantId, participant] as const),
    );
    const usedIds = new Set<string>();
    const usedNames = new Set<string>();
    let nextRegistrationOrder =
      Math.max(-1, ...current.participants.map(({ registrationOrder }) => registrationOrder)) + 1;
    const participants: TournamentParticipant[] = [];
    for (const input of command.participants) {
      const displayName = input.displayName.trim();
      const deckName = input.deckName.trim();
      const normalizedName = normalizeName(displayName);
      if (displayName === "" || deckName === "") {
        return failure({
          code: "INVALID_INPUT",
          message: "Chaque participant doit avoir un nom et un Deck déclaré.",
          details: { field: displayName === "" ? "displayName" : "deckName" },
        });
      }
      if (usedNames.has(normalizedName)) {
        return failure({
          code: "NAME_TAKEN",
          message: "Ce nom de participant est déjà utilisé dans le tournoi.",
          details: { displayName },
        });
      }

      const existing =
        input.participantId === null ? undefined : existingById.get(input.participantId);
      if (
        input.participantId !== null &&
        (existing === undefined || usedIds.has(input.participantId))
      ) {
        return failure({
          code: "INVALID_INPUT",
          message: "L'identité du participant n'appartient pas à ce tournoi.",
          details: { participantId: input.participantId },
        });
      }
      const participantId = existing?.participantId ?? this.dependencies.createId();
      const registrationOrder = existing?.registrationOrder ?? nextRegistrationOrder++;
      participants.push({
        participantId,
        displayName,
        normalizedName,
        registrationOrder,
        status: "active",
        deck: { name: deckName, keyCards: existing?.deck.keyCards ?? [] },
      });
      usedIds.add(participantId);
      usedNames.add(normalizedName);
    }
    return { ok: true, value: participants };
  }

  public async getTournament(
    tournamentId: string,
  ): Promise<TournamentResult<TournamentProjection>> {
    const loaded = await this.dependencies.store.load(tournamentId);
    if (!loaded.ok) return loaded;
    if (loaded.value === null) {
      return failure({
        code: "TOURNAMENT_NOT_FOUND",
        message: "Ce tournoi n'existe pas.",
        details: { tournamentId },
      });
    }
    return { ok: true, value: loaded.value.checkpoint };
  }

  public listTournaments(
    query: Readonly<TournamentListQuery> = {},
  ): Promise<TournamentResult<readonly TournamentSummary[]>> {
    return this.dependencies.store.list(query);
  }

  public deleteTournament(
    tournamentId: string,
  ): Promise<TournamentResult<{ readonly deleted: true }>> {
    return this.dependencies.store.delete(tournamentId);
  }
}

export function createTournamentCoordinator(
  dependencies: Readonly<TournamentCoordinatorDependencies>,
): TournamentCoordinator {
  return new DefaultTournamentCoordinator(dependencies);
}
