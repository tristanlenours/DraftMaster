import type { CardInstance, CubeSnapshot } from "../cubes/validate-snapshot.ts";
import type { CoachContext } from "../cubes/coach-context.ts";
import type { DraftEvent } from "../draft/index.ts";
import type { CardEvaluationInput, DeckEvaluation } from "../domain/coaching/types.ts";
import type {
  FinalDeckBasicLands,
  FinalDeckCoach,
  FinalDeckRecommendation,
} from "./final-deck-coach.ts";
import type { MtgaExportCard, MtgaExportResult } from "./mtga-export.ts";

export type MultiplayerResult<T> =
  | { readonly ok: true; readonly value: Readonly<T> }
  | { readonly ok: false; readonly error: MultiplayerDraftError };

export type MultiplayerDraftErrorCode =
  | "INVALID_INPUT"
  | "IDEMPOTENCY_CONFLICT"
  | "CUBE_LOCKED"
  | "CARD_NOT_IN_BOOSTER"
  | "DECK_NOT_READY"
  | "INVALID_DECK"
  | "INVALID_RESUME_TOKEN"
  | "LOBBY_BUSY"
  | "LOBBY_FULL"
  | "NAME_TAKEN"
  | "NOT_ENOUGH_PLAYERS"
  | "PICK_ALREADY_COMMITTED"
  | "REVISION_CONFLICT"
  | "SESSION_ABANDONED"
  | "STORE_UNAVAILABLE";

export interface MultiplayerDraftError {
  readonly code: MultiplayerDraftErrorCode;
  readonly message: string;
  readonly details: Readonly<Record<string, unknown>>;
}

export type MultiplayerSeatId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface PublicParticipantView {
  readonly participantId: string;
  readonly displayName: string;
  readonly seatId: MultiplayerSeatId;
  readonly ready: boolean;
  readonly presence: "connected" | "disconnected";
}

export interface PublicHumanSeatView {
  readonly seatId: MultiplayerSeatId;
  readonly kind: "human";
  readonly participantId: string;
  readonly displayName: string;
  readonly ready: boolean;
  readonly presence: "connected" | "disconnected";
}

export interface PublicBotSeatView {
  readonly seatId: MultiplayerSeatId;
  readonly kind: "bot";
  readonly botId: string;
  readonly policyId: string;
  readonly policyVersion: string;
  readonly displayName: string;
  readonly ready: null;
  readonly presence: null;
}

export type PublicSeatView = PublicBotSeatView | PublicHumanSeatView;

export interface PublicLobbyView {
  readonly lobbyId: "global";
  readonly generation: number;
  readonly revision: number;
  readonly status: "open" | "drafting";
  readonly cubeKey: string | null;
  readonly cubeLocked: boolean;
  readonly activeSessionId: string | null;
  readonly participants: readonly Readonly<PublicParticipantView>[];
  readonly seats: readonly (Readonly<PublicSeatView> | null)[];
}

export interface MultiplayerEventBase {
  readonly schemaVersion: 1;
  readonly sequence: number;
  readonly revision: number;
  readonly scopeId: string;
  readonly requestId: string;
  readonly occurredAt: string;
}

export interface LobbyOpenedEvent extends MultiplayerEventBase {
  readonly type: "LobbyOpened";
  readonly generation: number;
  readonly cubeKey: string;
}

export interface ParticipantJoinedEvent extends MultiplayerEventBase {
  readonly type: "ParticipantJoined";
  readonly participantId: string;
  readonly displayName: string;
  readonly normalizedName: string;
  readonly resumeTokenHash: string;
  readonly seatId: MultiplayerSeatId;
}

export interface CubeChangedEvent extends MultiplayerEventBase {
  readonly type: "CubeChanged";
  readonly cubeKey: string;
  readonly participantId: string;
}

export interface CubeLockedEvent extends MultiplayerEventBase {
  readonly type: "CubeLocked";
}

export interface ParticipantLeftEvent extends MultiplayerEventBase {
  readonly type: "ParticipantLeft";
  readonly participantId: string;
}

export interface LobbyEmptiedEvent extends MultiplayerEventBase {
  readonly type: "LobbyEmptied";
}

export interface ReadyChangedEvent extends MultiplayerEventBase {
  readonly type: "ReadyChanged";
  readonly participantId: string;
  readonly ready: boolean;
}

export interface MultiplayerSessionStartedEvent extends MultiplayerEventBase {
  readonly type: "DraftStarted";
  readonly sessionId: string;
  readonly botSeats: readonly Readonly<PublicBotSeatView>[];
}

export interface HumanPickSubmittedEvent extends MultiplayerEventBase {
  readonly type: "HumanPickSubmitted";
  readonly participantId: string;
  readonly cardInstanceId: string;
  readonly packNumber: number;
  readonly pickNumber: number;
}

export interface MultiplayerDraftRoundCommittedEvent extends MultiplayerEventBase {
  readonly type: "DraftRoundCommitted";
  readonly packNumber: number;
  readonly pickNumber: number;
  readonly draftRevision: number;
}

export interface MultiplayerDraftCompletedEvent extends MultiplayerEventBase {
  readonly type: "DraftCompleted";
  readonly sessionId: string;
}

export interface MultiplayerSessionAbandonedEvent extends MultiplayerEventBase {
  readonly type: "SessionAbandoned";
  readonly sessionId: string;
  readonly participantId: string;
}

export interface DeckRecommendationUpdatedEvent extends MultiplayerEventBase {
  readonly type: "DeckRecommendationUpdated";
  readonly sessionId: string;
  readonly participantId: string;
}

export interface DeckSelectionUpdatedEvent extends MultiplayerEventBase {
  readonly type: "DeckSelectionUpdated";
  readonly sessionId: string;
  readonly participantId: string;
  readonly finalized: boolean;
}

export type MultiplayerEvent =
  | CubeChangedEvent
  | CubeLockedEvent
  | DeckRecommendationUpdatedEvent
  | DeckSelectionUpdatedEvent
  | LobbyEmptiedEvent
  | LobbyOpenedEvent
  | MultiplayerSessionStartedEvent
  | HumanPickSubmittedEvent
  | MultiplayerDraftRoundCommittedEvent
  | MultiplayerDraftCompletedEvent
  | MultiplayerSessionAbandonedEvent
  | ParticipantJoinedEvent
  | ParticipantLeftEvent
  | ReadyChangedEvent;

export interface PersistedMultiplayerState {
  readonly lobby: Readonly<PublicLobbyView>;
  readonly events: readonly Readonly<MultiplayerEvent>[];
  readonly session?: Readonly<PersistedMultiplayerSession> | null;
  readonly sessions?: Readonly<Record<string, Readonly<PersistedMultiplayerSession>>>;
}

export interface PersistedMultiplayerSession {
  readonly sessionId: string;
  readonly lobbyGeneration: number;
  readonly revision: number;
  readonly status: "drafting" | "deckbuilding" | "abandoned";
  readonly cubeKey: string;
  readonly snapshotId: string;
  readonly snapshotSha256: string;
  readonly seed: number;
  readonly engineVersion: string;
  readonly seatAssignments: readonly Readonly<PublicSeatView>[];
  readonly draftEvents: readonly Readonly<DraftEvent>[];
  readonly pendingRound: Readonly<PendingRound> | null;
  readonly deckWorkspaces?: Readonly<Record<string, Readonly<DeckWorkspace>>>;
  readonly startedAt: string;
}

export interface DeckWorkspace {
  readonly participantId: string;
  readonly sessionId: string;
  readonly revision: number;
  readonly status: "editing" | "finalized";
  readonly poolCardInstanceIds: readonly string[];
  readonly maindeckCardInstanceIds: readonly string[];
  readonly basicLands: FinalDeckBasicLands;
  readonly sideboardCardInstanceIds: readonly string[];
  readonly recommendation: FinalDeckRecommendation | null;
  readonly evaluation: DeckEvaluation;
}

export interface RecommendedDeckWorkspace extends DeckWorkspace {
  readonly recommendation: FinalDeckRecommendation;
}

export interface PendingRound {
  readonly packNumber: number;
  readonly pickNumber: number;
  readonly expectedDraftRevision: number;
  readonly humanPicks: Readonly<Record<string, string>>;
}

export interface MultiplayerStoreCommit {
  readonly expectedRevision: number;
  readonly requestId: string;
  readonly requestFingerprint: string;
  readonly participantId: string | null;
  readonly appendedEvents: readonly Readonly<MultiplayerEvent>[];
  readonly nextState: Readonly<PersistedMultiplayerState>;
}

export interface MultiplayerDraftStore {
  load(): Promise<Readonly<PersistedMultiplayerState> | null>;
  commit(
    command: Readonly<MultiplayerStoreCommit>,
  ): Promise<MultiplayerResult<Readonly<PersistedMultiplayerState>>>;
}

export interface MultiplayerDraftCoordinatorDependencies {
  readonly store: MultiplayerDraftStore;
  readonly now: () => string;
  readonly createId: () => string;
  readonly createResumeToken: (requestId: string) => string;
  readonly createSessionId?: () => string;
  readonly createSeed?: () => number;
  readonly loadSnapshot?: (cubeKey: string) => Promise<Readonly<CubeSnapshot>>;
  readonly loadCoachContext?: (cubeKey: string) => Promise<Readonly<CoachContext>>;
  readonly loadCardPool?: (
    cubeKey: string,
    cards: readonly Readonly<CardInstance>[],
  ) => Promise<readonly CardEvaluationInput[]>;
  readonly finalDeckCoach?: FinalDeckCoach;
  readonly loadMtgaPool?: (
    cubeKey: string,
    cards: readonly Readonly<CardInstance>[],
  ) => Promise<readonly MtgaExportCard[]>;
}

export interface JoinLobbyCommand {
  readonly requestId: string;
  readonly expectedRevision: number;
  readonly playerName: string;
  readonly cubeKey?: string;
}

export interface JoinLobbyResult {
  readonly participantId: string;
  readonly resumeToken: string;
  readonly state: Readonly<PublicLobbyView>;
}

export interface ChangeCubeCommand {
  readonly requestId: string;
  readonly expectedRevision: number;
  readonly resumeToken: string;
  readonly cubeKey: string;
}

export interface LeaveLobbyCommand {
  readonly requestId: string;
  readonly expectedRevision: number;
  readonly resumeToken: string;
}

export interface SetReadyCommand {
  readonly requestId: string;
  readonly expectedRevision: number;
  readonly resumeToken: string;
  readonly ready: boolean;
}

export interface SubmitMultiplayerPickCommand {
  readonly requestId: string;
  readonly expectedRevision: number;
  readonly resumeToken: string;
  readonly packNumber: number;
  readonly pickNumber: number;
  readonly cardInstanceId: string;
}

export interface AbandonMultiplayerSessionCommand {
  readonly requestId: string;
  readonly expectedRevision: number;
  readonly resumeToken: string;
  readonly confirmed: boolean;
}

export interface RecommendMultiplayerDeckCommand {
  readonly requestId: string;
  readonly expectedRevision: number;
  readonly resumeToken: string;
}

export interface FinalizeMultiplayerDeckCommand {
  readonly requestId: string;
  readonly expectedRevision: number;
  readonly resumeToken: string;
  readonly maindeckCardInstanceIds: readonly string[];
  readonly basicLands: FinalDeckBasicLands;
  readonly finalize: boolean;
  readonly landCountRationale?: string | undefined;
}

export interface PlayerDraftView {
  readonly revision: number;
  readonly sessionId: string;
  readonly status: "drafting" | "deckbuilding" | "abandoned";
  readonly participantId: string;
  readonly seatId: MultiplayerSeatId;
  readonly packNumber: number;
  readonly pickNumber: number;
  readonly currentBooster: readonly Readonly<CardInstance>[];
  readonly pool: readonly Readonly<CardInstance>[];
  readonly pickSubmitted: boolean;
  readonly waitingFor: readonly string[];
  readonly deckWorkspace?: Readonly<DeckWorkspace> | undefined;
}

export interface MultiplayerDraftCoordinator {
  getLobby(): Promise<MultiplayerResult<PublicLobbyView>>;
  join(command: Readonly<JoinLobbyCommand>): Promise<MultiplayerResult<JoinLobbyResult>>;
  changeCube(command: Readonly<ChangeCubeCommand>): Promise<MultiplayerResult<PublicLobbyView>>;
  leave(command: Readonly<LeaveLobbyCommand>): Promise<MultiplayerResult<PublicLobbyView>>;
  setReady(command: Readonly<SetReadyCommand>): Promise<MultiplayerResult<PublicLobbyView>>;
  getPlayerState(resumeToken: string): Promise<MultiplayerResult<PlayerDraftView>>;
  submitPick(
    command: Readonly<SubmitMultiplayerPickCommand>,
  ): Promise<MultiplayerResult<PlayerDraftView>>;
  abandon(
    command: Readonly<AbandonMultiplayerSessionCommand>,
  ): Promise<MultiplayerResult<PublicLobbyView>>;
  recommendDeck(
    command: Readonly<RecommendMultiplayerDeckCommand>,
  ): Promise<MultiplayerResult<RecommendedDeckWorkspace>>;
  finalizeDeck(
    command: Readonly<FinalizeMultiplayerDeckCommand>,
  ): Promise<MultiplayerResult<DeckWorkspace>>;
  getDeckExport(resumeToken: string): Promise<MultiplayerResult<MtgaExportResult>>;
}
