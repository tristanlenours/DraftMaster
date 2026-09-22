import { toTournamentSummary } from "./internal/tournament-summary.ts";
import type {
  PersistedTournament,
  TournamentCubeSnapshot,
  TournamentError,
  TournamentListQuery,
  TournamentProjection,
  TournamentResult,
  TournamentStore,
  TournamentStoreCommitAttempt,
  TournamentStoreCommitResult,
  TournamentSummary,
} from "./types.ts";

interface StoredReceipt {
  readonly requestFingerprint: string;
  readonly response: Readonly<TournamentProjection>;
}

function success<T>(value: Readonly<T>): TournamentResult<T> {
  return { ok: true, value };
}

function failure(error: TournamentError): TournamentResult<never> {
  return { ok: false, error };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

class InMemoryTournamentStore implements TournamentStore {
  private readonly records = new Map<string, PersistedTournament>();
  private readonly receipts = new Map<string, StoredReceipt>();
  private readonly snapshotArchives = new Map<string, TournamentCubeSnapshot>();

  public list(
    query: Readonly<TournamentListQuery>,
  ): Promise<TournamentResult<readonly TournamentSummary[]>> {
    const limit = query.limit ?? 100;
    const tournaments = [...this.records.values()]
      .map(({ checkpoint }) => checkpoint)
      .filter(
        ({ status }) =>
          query.status === undefined || query.status === "all" || status === query.status,
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, limit)
      .map(toTournamentSummary);
    return Promise.resolve(success(clone(tournaments)));
  }

  public load(tournamentId: string): Promise<TournamentResult<PersistedTournament | null>> {
    const record = this.records.get(tournamentId);
    return Promise.resolve(
      success<PersistedTournament | null>(record === undefined ? null : clone(record)),
    );
  }

  public commit(
    attempt: Readonly<TournamentStoreCommitAttempt>,
  ): Promise<TournamentResult<TournamentStoreCommitResult>> {
    const receiptKey = `${attempt.scope}\0${attempt.requestId}`;
    const receipt = this.receipts.get(receiptKey);
    if (receipt !== undefined) {
      if (receipt.requestFingerprint !== attempt.requestFingerprint) {
        return Promise.resolve(
          failure({
            code: "IDEMPOTENCY_CONFLICT",
            message: "Cette clé d'idempotence est déjà associée à une autre commande.",
            details: { requestId: attempt.requestId },
          }),
        );
      }
      return Promise.resolve(
        success({ kind: "replayed", tournament: clone(receipt.response) } as const),
      );
    }

    const current = this.records.get(attempt.tournamentId);
    const currentRevision = current?.checkpoint.revision ?? null;
    if (currentRevision !== attempt.expectedRevision) {
      return Promise.resolve(
        failure({
          code: "REVISION_CONFLICT",
          message: "Le tournoi a changé. Rechargez son état.",
          details: { currentRevision },
        }),
      );
    }

    const expectedNextRevision = currentRevision === null ? 0 : currentRevision + 1;
    if (attempt.nextState.revision !== expectedNextRevision) {
      return Promise.resolve(
        failure({
          code: "INVALID_INPUT",
          message: "La prochaine révision du tournoi n'est pas contiguë.",
          details: {
            actualRevision: attempt.nextState.revision,
            expectedRevision: expectedNextRevision,
          },
        }),
      );
    }

    const nextRecord: PersistedTournament = {
      checkpoint: clone(attempt.nextState),
      events: clone([...(current?.events ?? []), ...attempt.appendedEvents]),
    };
    const nextReceipt: StoredReceipt = {
      requestFingerprint: attempt.requestFingerprint,
      response: clone(attempt.response),
    };
    const nextSnapshots = attempt.snapshotArchives.map(
      (snapshot) =>
        [`${snapshot.snapshotId}\0${snapshot.canonicalSha256}`, clone(snapshot)] as const,
    );

    this.records.set(attempt.tournamentId, nextRecord);
    this.receipts.set(receiptKey, nextReceipt);
    for (const [key, snapshot] of nextSnapshots) {
      this.snapshotArchives.set(key, snapshot);
    }

    return Promise.resolve(
      success({ kind: "committed", tournament: clone(attempt.response) } as const),
    );
  }

  public checkReadiness(): Promise<TournamentResult<{ readonly ready: true }>> {
    return Promise.resolve(success({ ready: true } as const));
  }
}

export function createInMemoryTournamentStore(): TournamentStore {
  return new InMemoryTournamentStore();
}
