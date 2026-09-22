import type { CubeSnapshot } from "../cubes/validate-snapshot.ts";
import type { PairingEvidence, TournamentStanding } from "./internal/types.ts";

export type TournamentResult<T> =
  | { readonly ok: true; readonly value: Readonly<T> }
  | { readonly ok: false; readonly error: TournamentError };

export type TournamentErrorCode =
  | "INVALID_INPUT"
  | "TOURNAMENT_NOT_FOUND"
  | "INVALID_STATE"
  | "NAME_TAKEN"
  | "INVALID_CUBE"
  | "INVALID_PARTICIPANT_COUNT"
  | "ROUND_INCOMPLETE"
  | "ROUND_LIMIT_REACHED"
  | "MATCH_NOT_FOUND"
  | "INVALID_RESULT"
  | "IDEMPOTENCY_CONFLICT"
  | "REVISION_CONFLICT"
  | "STORE_UNAVAILABLE";

export interface TournamentError {
  readonly code: TournamentErrorCode;
  readonly message: string;
  readonly details: Readonly<Record<string, unknown>>;
}

export type TournamentStatus = "preparation" | "active" | "completed";
export type TournamentFormat = "swiss" | "round-robin-three";

export interface TournamentCubeSummary {
  readonly cubeKey: string;
  readonly cubeName: string;
  readonly activeSnapshotId: string;
}

export interface TournamentCubeSnapshot {
  readonly cubeKey: string;
  readonly cubeName: string;
  readonly snapshotId: string;
  readonly canonicalSha256: string;
  readonly payload: Readonly<CubeSnapshot>;
}

export interface DeckKeyCard {
  readonly oracleId: string;
  readonly name: string;
}

export interface DeclaredDeck {
  readonly name: string;
  readonly keyCards: readonly Readonly<DeckKeyCard>[];
}

export interface TournamentParticipant {
  readonly participantId: string;
  readonly displayName: string;
  readonly normalizedName: string;
  readonly registrationOrder: number;
  readonly status: "active" | "dropped";
  readonly deck: Readonly<DeclaredDeck>;
}

export type MatchResultKind = "played" | "forfeit" | "swiss-bye";
export type MatchOutcome = "a-win" | "b-win" | "draw";

export interface MatchResultVersion {
  readonly version: number;
  readonly kind: MatchResultKind;
  readonly gamesWonA: number;
  readonly gamesWonB: number;
  readonly drawnGames: number;
  readonly outcome: MatchOutcome;
  readonly recordedAt: string;
  readonly requestId: string;
  readonly replacesVersion: number | null;
  readonly reason: string | null;
}

export interface TournamentMatch {
  readonly matchId: string;
  readonly roundNumber: number;
  readonly tableNumber: number;
  readonly participantAId: string;
  readonly participantBId: string | null;
  readonly status: "pending" | "confirmed";
  readonly resultVersions: readonly Readonly<MatchResultVersion>[];
  readonly currentResultVersion: number | null;
}

export interface TournamentPause {
  readonly participantId: string;
  readonly reason: "round-robin-pause";
}

export interface TournamentRound {
  readonly roundNumber: number;
  readonly status: "published" | "completed";
  readonly sourceRevision: number;
  readonly publishedAt: string;
  readonly completedAt: string | null;
  readonly pairingEvidence: Readonly<PairingEvidence>;
  readonly matches: readonly Readonly<TournamentMatch>[];
  readonly pauses: readonly Readonly<TournamentPause>[];
}

export interface TournamentProjection {
  readonly schemaVersion: 1;
  readonly tournamentId: string;
  readonly revision: number;
  readonly name: string;
  readonly status: TournamentStatus;
  readonly format: TournamentFormat | null;
  readonly plannedRoundCount: number | null;
  readonly pairingSeed: number;
  readonly pairingEngineVersion: "tournament-pairing@1";
  readonly cube: Readonly<TournamentCubeSnapshot> | null;
  readonly participants: readonly Readonly<TournamentParticipant>[];
  readonly rounds: readonly Readonly<TournamentRound>[];
  readonly standings: readonly Readonly<TournamentStanding>[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
}

export interface TournamentSummary {
  readonly tournamentId: string;
  readonly name: string;
  readonly status: TournamentStatus;
  readonly format: TournamentFormat | null;
  readonly cube: Readonly<TournamentCubeSummary> | null;
  readonly participantCount: number;
  readonly currentRoundNumber: number | null;
  readonly leaders: readonly string[];
  readonly revision: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface TournamentEventBase {
  readonly schemaVersion: 1;
  readonly sequence: number;
  readonly tournamentId: string;
  readonly revision: number;
  readonly requestId: string;
  readonly occurredAt: string;
}

export interface TournamentCreatedEvent extends TournamentEventBase {
  readonly type: "TournamentCreated";
  readonly name: string;
  readonly pairingSeed: number;
}

export interface TournamentSetupReplacedEvent extends TournamentEventBase {
  readonly type: "TournamentSetupReplaced";
  readonly name: string;
  readonly format: TournamentFormat;
  readonly plannedRoundCount: number;
  readonly cube: Readonly<TournamentCubeSnapshot>;
  readonly participants: readonly Readonly<TournamentParticipant>[];
}

export interface TournamentStartedEvent extends TournamentEventBase {
  readonly type: "TournamentStarted";
  readonly startedAt: string;
}

export interface RoundPublishedEvent extends TournamentEventBase {
  readonly type: "RoundPublished";
  readonly round: Readonly<TournamentRound>;
}

export interface MatchResultRecordedEvent extends TournamentEventBase {
  readonly type: "MatchResultRecorded";
  readonly matchId: string;
  readonly result: Readonly<MatchResultVersion>;
}

export interface MatchResultCorrectedEvent extends TournamentEventBase {
  readonly type: "MatchResultCorrected";
  readonly matchId: string;
  readonly result: Readonly<MatchResultVersion>;
}

export interface ParticipantDroppedEvent extends TournamentEventBase {
  readonly type: "ParticipantDropped";
  readonly participantId: string;
  readonly reason: string;
}

export interface DeckKeyCardsUpdatedEvent extends TournamentEventBase {
  readonly type: "DeckKeyCardsUpdated";
  readonly participantId: string;
  readonly keyCards: readonly Readonly<DeckKeyCard>[];
}

export interface TournamentCompletedEvent extends TournamentEventBase {
  readonly type: "TournamentCompleted";
  readonly completedAt: string;
}

export type TournamentEvent =
  | TournamentCreatedEvent
  | TournamentSetupReplacedEvent
  | TournamentStartedEvent
  | RoundPublishedEvent
  | MatchResultRecordedEvent
  | MatchResultCorrectedEvent
  | ParticipantDroppedEvent
  | DeckKeyCardsUpdatedEvent
  | TournamentCompletedEvent;

export interface CreateTournamentCommand {
  readonly requestId: string;
  readonly name: string;
}

export interface SetupParticipantInput {
  readonly participantId: string | null;
  readonly displayName: string;
  readonly deckName: string;
}

interface TournamentMutationCommandBase {
  readonly requestId: string;
  readonly tournamentId: string;
  readonly expectedRevision: number;
}

export interface ReplaceTournamentSetupCommand extends TournamentMutationCommandBase {
  readonly type: "replace-setup";
  readonly name: string;
  readonly cubeKey: string;
  readonly format: TournamentFormat;
  readonly plannedRoundCount: number;
  readonly participants: readonly Readonly<SetupParticipantInput>[];
}

export interface StartTournamentCommand extends TournamentMutationCommandBase {
  readonly type: "start";
}

export interface PublishNextRoundCommand extends TournamentMutationCommandBase {
  readonly type: "publish-next-round";
}

export interface RecordMatchResultCommand extends TournamentMutationCommandBase {
  readonly type: "record-result";
  readonly matchId: string;
  readonly kind: Exclude<MatchResultKind, "swiss-bye">;
  readonly gamesWonA: number;
  readonly gamesWonB: number;
  readonly drawnGames: number;
  readonly reason?: string;
}

export interface DropParticipantCommand extends TournamentMutationCommandBase {
  readonly type: "drop-participant";
  readonly participantId: string;
  readonly reason: string;
}

export interface UpdateDeckKeyCardsCommand extends TournamentMutationCommandBase {
  readonly type: "update-key-cards";
  readonly participantId: string;
  readonly oracleIds: readonly string[];
}

export interface CompleteTournamentCommand extends TournamentMutationCommandBase {
  readonly type: "complete";
}

export type TournamentCommand =
  | ReplaceTournamentSetupCommand
  | StartTournamentCommand
  | PublishNextRoundCommand
  | RecordMatchResultCommand
  | DropParticipantCommand
  | UpdateDeckKeyCardsCommand
  | CompleteTournamentCommand;

export interface TournamentListQuery {
  readonly status?: TournamentStatus | "all";
  readonly limit?: number;
}

export interface PersistedTournament {
  readonly checkpoint: Readonly<TournamentProjection>;
  readonly events: readonly Readonly<TournamentEvent>[];
}

export interface TournamentStoreCommitAttempt {
  readonly scope: string;
  readonly tournamentId: string;
  readonly expectedRevision: number | null;
  readonly requestId: string;
  readonly requestFingerprint: string;
  readonly snapshotArchives: readonly Readonly<TournamentCubeSnapshot>[];
  readonly appendedEvents: readonly Readonly<TournamentEvent>[];
  readonly nextState: Readonly<TournamentProjection>;
  readonly response: Readonly<TournamentProjection>;
}

export interface TournamentStoreCommitResult {
  readonly kind: "committed" | "replayed";
  readonly tournament: Readonly<TournamentProjection>;
}

export interface TournamentStore {
  list(
    query: Readonly<TournamentListQuery>,
  ): Promise<TournamentResult<readonly TournamentSummary[]>>;
  load(tournamentId: string): Promise<TournamentResult<PersistedTournament | null>>;
  commit(
    attempt: Readonly<TournamentStoreCommitAttempt>,
  ): Promise<TournamentResult<TournamentStoreCommitResult>>;
  checkReadiness(): Promise<TournamentResult<{ readonly ready: true }>>;
}

export interface TournamentCubeCatalog {
  listCubes(): Promise<TournamentResult<readonly TournamentCubeSummary[]>>;
  loadSnapshot(cubeKey: string): Promise<TournamentResult<TournamentCubeSnapshot>>;
}

export interface TournamentCoordinatorDependencies {
  readonly store: TournamentStore;
  readonly cubeCatalog: TournamentCubeCatalog;
  readonly now: () => string;
  readonly createId: () => string;
  readonly createSeed: () => number;
}

export interface TournamentCoordinator {
  checkReadiness(): Promise<TournamentResult<{ readonly ready: true }>>;
  listCubes(): Promise<TournamentResult<readonly TournamentCubeSummary[]>>;
  createTournament(
    command: Readonly<CreateTournamentCommand>,
  ): Promise<TournamentResult<TournamentProjection>>;
  execute(command: Readonly<TournamentCommand>): Promise<TournamentResult<TournamentProjection>>;
  getTournament(tournamentId: string): Promise<TournamentResult<TournamentProjection>>;
  listTournaments(
    query?: Readonly<TournamentListQuery>,
  ): Promise<TournamentResult<readonly TournamentSummary[]>>;
}
