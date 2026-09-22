import type { SupabaseClient } from "@supabase/supabase-js";

import { toTournamentSummary } from "./internal/tournament-summary.ts";
import type {
  PersistedTournament,
  TournamentError,
  TournamentErrorCode,
  TournamentEvent,
  TournamentListQuery,
  TournamentProjection,
  TournamentResult,
  TournamentStore,
  TournamentStoreCommitAttempt,
  TournamentStoreCommitResult,
  TournamentSummary,
} from "./types.ts";

export interface TournamentSupabaseGatewayError {
  readonly message: string;
}

export interface TournamentSupabaseGatewayResult<T> {
  readonly data: Readonly<T> | null;
  readonly error: TournamentSupabaseGatewayError | null;
}

export type TournamentSupabaseCommitResponse =
  | Readonly<TournamentStoreCommitResult>
  | {
      readonly code: TournamentErrorCode;
      readonly details: Readonly<Record<string, unknown>>;
    };

export interface TournamentSupabaseGateway {
  listTournaments(
    query: Readonly<TournamentListQuery>,
  ): Promise<TournamentSupabaseGatewayResult<readonly TournamentSummary[]>>;
  loadTournament(
    tournamentId: string,
  ): Promise<TournamentSupabaseGatewayResult<PersistedTournament>>;
  commitTournament(
    attempt: Readonly<TournamentStoreCommitAttempt>,
  ): Promise<TournamentSupabaseGatewayResult<TournamentSupabaseCommitResponse>>;
  checkReadiness(): Promise<TournamentSupabaseGatewayResult<{ readonly ready: true }>>;
}

export interface SupabaseTournamentStoreOptions {
  readonly gateway: TournamentSupabaseGateway;
  readonly timeoutMs?: number;
}

class TournamentStoreTimeoutError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseProjection(value: unknown): TournamentProjection | null {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    typeof value.tournamentId !== "string" ||
    !Number.isInteger(value.revision) ||
    typeof value.name !== "string" ||
    !Array.isArray(value.participants) ||
    !Array.isArray(value.rounds) ||
    !Array.isArray(value.standings)
  ) {
    return null;
  }
  return value as unknown as TournamentProjection;
}

function parseEvent(value: unknown): TournamentEvent | null {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    typeof value.type !== "string" ||
    typeof value.tournamentId !== "string" ||
    !Number.isInteger(value.sequence) ||
    !Number.isInteger(value.revision)
  ) {
    return null;
  }
  return value as unknown as TournamentEvent;
}

function isTournamentErrorCode(value: unknown): value is TournamentErrorCode {
  return (
    typeof value === "string" &&
    [
      "INVALID_INPUT",
      "TOURNAMENT_NOT_FOUND",
      "INVALID_STATE",
      "NAME_TAKEN",
      "INVALID_CUBE",
      "INVALID_PARTICIPANT_COUNT",
      "ROUND_INCOMPLETE",
      "ROUND_LIMIT_REACHED",
      "MATCH_NOT_FOUND",
      "INVALID_RESULT",
      "IDEMPOTENCY_CONFLICT",
      "REVISION_CONFLICT",
      "STORE_UNAVAILABLE",
    ].includes(value)
  );
}

function parseCommitResponse(value: unknown): TournamentSupabaseCommitResponse | null {
  if (!isRecord(value)) return null;
  if (value.ok === true && (value.kind === "committed" || value.kind === "replayed")) {
    const tournament = parseProjection(value.tournament);
    return tournament === null ? null : { kind: value.kind, tournament };
  }
  if (value.ok === false && isTournamentErrorCode(value.code)) {
    return {
      code: value.code,
      details: isRecord(value.details) ? value.details : {},
    };
  }
  return null;
}

function unavailable(reason?: "timeout"): TournamentResult<never> {
  return {
    ok: false,
    error: {
      code: "STORE_UNAVAILABLE",
      message: "Le stockage durable des tournois est momentanément indisponible.",
      details: reason === undefined ? {} : { reason },
    },
  };
}

function rejectedError(
  code: Exclude<TournamentErrorCode, "STORE_UNAVAILABLE">,
  details: Readonly<Record<string, unknown>>,
): TournamentError {
  const messages: Record<Exclude<TournamentErrorCode, "STORE_UNAVAILABLE">, string> = {
    INVALID_INPUT: "La transaction de tournoi est invalide.",
    TOURNAMENT_NOT_FOUND: "Ce tournoi n'existe pas.",
    INVALID_STATE: "L'état du tournoi interdit cette opération.",
    NAME_TAKEN: "Ce nom de participant est déjà utilisé dans le tournoi.",
    INVALID_CUBE: "Le cube demandé est invalide.",
    INVALID_PARTICIPANT_COUNT: "Le nombre de participants est invalide.",
    ROUND_INCOMPLETE: "La ronde actuelle n'est pas terminée.",
    ROUND_LIMIT_REACHED: "Le nombre de rondes prévu est atteint.",
    MATCH_NOT_FOUND: "Ce match n'existe pas.",
    INVALID_RESULT: "Le résultat de match est invalide.",
    IDEMPOTENCY_CONFLICT: "Cette clé d'idempotence est déjà associée à une autre commande.",
    REVISION_CONFLICT: "Le tournoi a changé. Rechargez son état.",
  };
  return { code, message: messages[code], details };
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new TournamentStoreTimeoutError("Tournament store timeout"));
    }, timeoutMs);
    void operation.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

class SupabaseTournamentStore implements TournamentStore {
  private readonly gateway: TournamentSupabaseGateway;
  private readonly timeoutMs: number;

  public constructor(options: Readonly<SupabaseTournamentStoreOptions>) {
    this.gateway = options.gateway;
    this.timeoutMs = options.timeoutMs ?? 5_000;
  }

  private async invoke<T>(
    operation: Promise<TournamentSupabaseGatewayResult<T>>,
  ): Promise<TournamentResult<T>> {
    try {
      const result = await withTimeout(operation, this.timeoutMs);
      if (result.error !== null || result.data === null) return unavailable();
      return { ok: true, value: result.data };
    } catch (error) {
      return unavailable(error instanceof TournamentStoreTimeoutError ? "timeout" : undefined);
    }
  }

  public list(
    query: Readonly<TournamentListQuery>,
  ): Promise<TournamentResult<readonly TournamentSummary[]>> {
    return this.invoke(this.gateway.listTournaments(query));
  }

  public async load(tournamentId: string): Promise<TournamentResult<PersistedTournament | null>> {
    try {
      const result = await withTimeout(this.gateway.loadTournament(tournamentId), this.timeoutMs);
      if (result.error !== null) return unavailable();
      return { ok: true, value: result.data };
    } catch (error) {
      return unavailable(error instanceof TournamentStoreTimeoutError ? "timeout" : undefined);
    }
  }

  public async commit(
    attempt: Readonly<TournamentStoreCommitAttempt>,
  ): Promise<TournamentResult<TournamentStoreCommitResult>> {
    const result = await this.invoke(this.gateway.commitTournament(attempt));
    if (!result.ok) return result;
    if ("code" in result.value) {
      if (result.value.code === "STORE_UNAVAILABLE") return unavailable();
      return {
        ok: false,
        error: rejectedError(result.value.code, result.value.details),
      };
    }
    return { ok: true, value: result.value };
  }

  public checkReadiness(): Promise<TournamentResult<{ readonly ready: true }>> {
    return this.invoke(this.gateway.checkReadiness());
  }
}

class SupabaseClientTournamentGateway implements TournamentSupabaseGateway {
  private readonly client: SupabaseClient;

  public constructor(client: SupabaseClient) {
    this.client = client;
  }

  public async listTournaments(
    query: Readonly<TournamentListQuery>,
  ): Promise<TournamentSupabaseGatewayResult<readonly TournamentSummary[]>> {
    let request = this.client
      .from("tournaments")
      .select("state")
      .order("updated_at", { ascending: false })
      .limit(query.limit ?? 100);
    if (query.status !== undefined && query.status !== "all") {
      request = request.eq("status", query.status);
    }
    const { data, error } = await request;
    if (error !== null) return { data: null, error };
    const summaries: TournamentSummary[] = [];
    for (const row of data) {
      const projection = isRecord(row) ? parseProjection(row.state) : null;
      if (projection === null) {
        return { data: null, error: { message: "Malformed tournament projection" } };
      }
      summaries.push(toTournamentSummary(projection));
    }
    return { data: summaries, error: null };
  }

  public async loadTournament(
    tournamentId: string,
  ): Promise<TournamentSupabaseGatewayResult<PersistedTournament>> {
    const tournamentResult = await this.client
      .from("tournaments")
      .select("state")
      .eq("id", tournamentId)
      .maybeSingle();
    if (tournamentResult.error !== null) {
      return { data: null, error: tournamentResult.error };
    }
    if (tournamentResult.data === null) return { data: null, error: null };
    const checkpoint = isRecord(tournamentResult.data)
      ? parseProjection(tournamentResult.data.state)
      : null;
    if (checkpoint === null) {
      return { data: null, error: { message: "Malformed tournament projection" } };
    }

    const eventsResult = await this.client
      .from("tournament_events")
      .select("payload")
      .eq("tournament_id", tournamentId)
      .order("sequence", { ascending: true });
    if (eventsResult.error !== null) return { data: null, error: eventsResult.error };
    const events: TournamentEvent[] = [];
    for (const row of eventsResult.data) {
      const event = isRecord(row) ? parseEvent(row.payload) : null;
      if (event === null) {
        return { data: null, error: { message: "Malformed tournament event" } };
      }
      events.push(event);
    }
    return { data: { checkpoint, events }, error: null };
  }

  public async commitTournament(
    attempt: Readonly<TournamentStoreCommitAttempt>,
  ): Promise<TournamentSupabaseGatewayResult<TournamentSupabaseCommitResponse>> {
    const rpcResult: unknown = await this.client.rpc("commit_tournament", {
      p_scope_id: attempt.scope,
      p_tournament_id: attempt.tournamentId,
      p_expected_revision: attempt.expectedRevision,
      p_request_id: attempt.requestId,
      p_request_fingerprint: attempt.requestFingerprint,
      p_snapshot_archives: attempt.snapshotArchives,
      p_events: attempt.appendedEvents,
      p_next_state: attempt.nextState,
      p_response: attempt.response,
    });
    if (!isRecord(rpcResult)) {
      return { data: null, error: { message: "Malformed Supabase RPC result" } };
    }
    const rpcError = rpcResult.error;
    if (rpcError !== null) {
      return {
        data: null,
        error: {
          message:
            isRecord(rpcError) && typeof rpcError.message === "string"
              ? rpcError.message
              : "Supabase RPC failure",
        },
      };
    }
    const response = parseCommitResponse(rpcResult.data);
    return response === null
      ? { data: null, error: { message: "Malformed commit_tournament response" } }
      : { data: response, error: null };
  }

  public async checkReadiness(): Promise<
    TournamentSupabaseGatewayResult<{ readonly ready: true }>
  > {
    const { error } = await this.client.from("tournaments").select("id").limit(1);
    return error === null ? { data: { ready: true }, error: null } : { data: null, error };
  }
}

export function createTournamentSupabaseGateway(client: SupabaseClient): TournamentSupabaseGateway {
  return new SupabaseClientTournamentGateway(client);
}

export function createSupabaseTournamentStore(
  options: Readonly<SupabaseTournamentStoreOptions>,
): TournamentStore {
  return new SupabaseTournamentStore(options);
}
