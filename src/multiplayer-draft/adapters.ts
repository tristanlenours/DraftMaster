// Composition-only exports: HTTP, storage and provider adapters of this module.
// Import them from composition roots (server, scripts, tests), not from domain code.
export { createMultiplayerDraftHttpHandler } from "./http-handler.ts";
export { createLocalFileMultiplayerDraftStore } from "./local-file-store.ts";
export { createSupabaseMultiplayerDraftStore } from "./supabase-store.ts";
export type {
  MultiplayerDraftHttpHandler,
  MultiplayerDraftHttpHandlerDependencies,
} from "./http-handler.ts";
export type {
  SupabaseCommitInput,
  SupabaseCommitResponse,
  SupabaseMultiplayerDraftStoreOptions,
  SupabaseMultiplayerGateway,
} from "./supabase-store.ts";
