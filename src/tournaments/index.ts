export { createTournamentCubeCatalog } from "./cube-catalog.ts";
export { createTournamentCoordinator } from "./coordinator.ts";
export { createTournamentHttpHandler } from "./http-handler.ts";
export {
  createDeckPhotoRecognizer,
  GeminiDeckPhotoRecognizer,
  MasterCardsIndex,
} from "./deck-photo-recognition.ts";
export { createInMemoryTournamentStore } from "./in-memory-store.ts";
export { createJsonLineTournamentObservability, observeTournamentResult } from "./observability.ts";
export { isRoundRobinFormat } from "./types.ts";
export {
  createSupabaseTournamentStore,
  createTournamentSupabaseGateway,
} from "./supabase-store.ts";

export type {
  CompleteTournamentCommand,
  CreateTournamentCommand,
  DeclaredDeck,
  DeclaredDeckCard,
  DeckKeyCard,
  DropParticipantCommand,
  MatchResultKind,
  MatchResultVersion,
  ParticipantDeckUpdatedEvent,
  PersistedTournament,
  PublishNextRoundCommand,
  RecordMatchResultCommand,
  ReplaceTournamentSetupCommand,
  RoundPublishedEvent,
  SetupParticipantInput,
  StartTournamentCommand,
  TournamentCommand,
  TournamentCompletedEvent,
  TournamentCoordinator,
  TournamentCoordinatorDependencies,
  TournamentCubeCatalog,
  TournamentCubeSnapshot,
  TournamentCubeSummary,
  TournamentError,
  TournamentErrorCode,
  TournamentEvent,
  TournamentFormat,
  TournamentListQuery,
  TournamentMatch,
  TournamentParticipant,
  TournamentProjection,
  TournamentResult,
  TournamentRound,
  TournamentStatus,
  TournamentStore,
  TournamentStoreCommitAttempt,
  TournamentStoreCommitResult,
  TournamentSummary,
  UpdateDeckKeyCardsCommand,
  UpdateParticipantDeckCommand,
} from "./types.ts";

export type {
  DeckPhotoRecognizer,
  DeckPhotoRecognizerOptions,
  RecognizedDeckResult,
} from "./deck-photo-recognition.ts";

export type { TournamentCubeCatalogOptions } from "./cube-catalog.ts";
export type {
  TournamentMetricEvent,
  TournamentMetricName,
  TournamentObservability,
} from "./observability.ts";
export type { TournamentHttpHandler, TournamentHttpHandlerDependencies } from "./http-handler.ts";
export type {
  SupabaseTournamentStoreOptions,
  TournamentSupabaseCommitResponse,
  TournamentSupabaseGateway,
  TournamentSupabaseGatewayError,
  TournamentSupabaseGatewayResult,
} from "./supabase-store.ts";
export type {
  ExactFraction,
  PairingCost,
  PairingDecisionEvidence,
  PairingEvidence,
  PairingReason,
  TournamentStanding,
} from "./internal/types.ts";
