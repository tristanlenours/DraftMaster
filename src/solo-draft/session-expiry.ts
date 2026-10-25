import type { SoloDraftStore } from "./solo-draft-store.ts";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TTL_DAYS = 7;

/** How long an untouched Solo session (abandoned draft, unpublished result) is kept. */
export function soloSessionTtlMs(env: Readonly<Record<string, string | undefined>>): number {
  const days = Number(env.SOLO_SESSION_TTL_DAYS);
  return (Number.isFinite(days) && days > 0 ? days : DEFAULT_TTL_DAYS) * DAY_MS;
}

export interface SoloSessionExpiryOptions {
  readonly maxAgeMs: number;
  readonly intervalMs: number;
  readonly now?: (() => number) | undefined;
  readonly log?: ((message: string) => void) | undefined;
}

/**
 * Purges expired Solo sessions now and then on every interval. A failed purge is
 * logged and retried at the next tick. Returns a function that stops the schedule.
 */
export function startSoloSessionExpiry(
  store: Pick<SoloDraftStore, "removeExpired">,
  options: Readonly<SoloSessionExpiryOptions>,
): () => void {
  const now = options.now ?? Date.now;
  const log =
    options.log ??
    ((message: string) => {
      console.log(message);
    });

  const purge = async () => {
    try {
      const removed = await store.removeExpired(new Date(now() - options.maxAgeMs));
      if (removed > 0)
        log(`[Persistence] ${String(removed)} session(s) Solo expirée(s) supprimée(s).`);
    } catch (error: unknown) {
      log(
        `[Persistence] Purge des sessions Solo impossible : ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  void purge();
  const timer = setInterval(() => void purge(), options.intervalMs);
  // Never keep the process alive just for housekeeping.
  timer.unref();
  return () => {
    clearInterval(timer);
  };
}
