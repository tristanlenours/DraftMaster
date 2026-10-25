// Composition-only exports: HTTP, storage and provider adapters of this module.
// Import them from composition roots (server, scripts, tests), not from domain code.
export { createTournamentCubeCatalog } from "./cube-catalog.ts";
export { createTournamentHttpHandler } from "./http-handler.ts";
export {
  createDeckPhotoRecognizer,
  GeminiDeckPhotoRecognizer,
  MasterCardsIndex,
} from "./deck-photo-recognition.ts";
export { createInMemoryTournamentStore } from "./in-memory-store.ts";
export { createJsonLineTournamentObservability } from "./observability.ts";
export {
  createSupabaseTournamentStore,
  createTournamentSupabaseGateway,
} from "./supabase-store.ts";
export type {
  DeckPhotoRecognizer,
  DeckPhotoRecognizerOptions,
  RecognizedDeckResult,
} from "./deck-photo-recognition.ts";
export type { TournamentCubeCatalogOptions } from "./cube-catalog.ts";
export type { TournamentHttpHandler, TournamentHttpHandlerDependencies } from "./http-handler.ts";
export type {
  SupabaseTournamentStoreOptions,
  TournamentSupabaseCommitResponse,
  TournamentSupabaseGateway,
  TournamentSupabaseGatewayError,
  TournamentSupabaseGatewayResult,
} from "./supabase-store.ts";
