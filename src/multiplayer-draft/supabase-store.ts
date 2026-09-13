import type {
  MultiplayerDraftErrorCode,
  MultiplayerDraftStore,
  MultiplayerResult,
  MultiplayerStoreCommit,
  PersistedMultiplayerState,
} from "./types.ts";

export interface SupabaseGatewayError {
  readonly message: string;
}

export interface SupabaseCommitInput {
  readonly expectedRevision: number;
  readonly requestId: string;
  readonly requestFingerprint: string;
  readonly participantId: string | null;
  readonly nextState: Readonly<PersistedMultiplayerState>;
  readonly events: readonly Readonly<Record<string, unknown>>[];
}

export type SupabaseCommitResponse =
  | { readonly ok: true; readonly state: Readonly<PersistedMultiplayerState> }
  | {
      readonly ok: false;
      readonly code: MultiplayerDraftErrorCode;
      readonly currentRevision?: number;
    };

export interface SupabaseMultiplayerGateway {
  loadLobby(): Promise<{
    readonly data: Readonly<PersistedMultiplayerState> | null;
    readonly error: SupabaseGatewayError | null;
  }>;
  commitLobby(input: Readonly<SupabaseCommitInput>): Promise<{
    readonly data: Readonly<SupabaseCommitResponse> | null;
    readonly error: SupabaseGatewayError | null;
  }>;
}

export interface SupabaseMultiplayerDraftStoreOptions {
  readonly gateway: SupabaseMultiplayerGateway;
}

function unavailable(): MultiplayerResult<never> {
  return {
    ok: false,
    error: {
      code: "STORE_UNAVAILABLE",
      message: "Le stockage durable du Salon de draft est momentanement indisponible.",
      details: {},
    },
  };
}

class SupabaseMultiplayerDraftStore implements MultiplayerDraftStore {
  private readonly gateway: SupabaseMultiplayerGateway;

  public constructor(options: SupabaseMultiplayerDraftStoreOptions) {
    this.gateway = options.gateway;
  }

  public async load(): Promise<Readonly<PersistedMultiplayerState> | null> {
    const result = await this.gateway.loadLobby();
    if (result.error !== null) {
      throw new Error(result.error.message);
    }
    return result.data;
  }

  public async commit(
    command: Readonly<MultiplayerStoreCommit>,
  ): Promise<MultiplayerResult<Readonly<PersistedMultiplayerState>>> {
    try {
      const result = await this.gateway.commitLobby({
        expectedRevision: command.expectedRevision,
        requestId: command.requestId,
        requestFingerprint: command.requestFingerprint,
        participantId: command.participantId,
        nextState: command.nextState,
        events: command.appendedEvents,
      });
      if (result.error !== null || result.data === null) {
        return unavailable();
      }
      if (!result.data.ok) {
        return {
          ok: false,
          error: {
            code: result.data.code,
            message:
              result.data.code === "REVISION_CONFLICT"
                ? "Le Salon de draft a change. Rechargez son etat."
                : "La commande multijoueur a ete rejetee.",
            details:
              result.data.currentRevision === undefined
                ? {}
                : { currentRevision: result.data.currentRevision },
          },
        };
      }
      return { ok: true, value: result.data.state };
    } catch {
      return unavailable();
    }
  }
}

export function createSupabaseMultiplayerDraftStore(
  options: SupabaseMultiplayerDraftStoreOptions,
): MultiplayerDraftStore {
  return new SupabaseMultiplayerDraftStore(options);
}
