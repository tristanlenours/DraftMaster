import type { TournamentResult } from "./types.ts";

export type TournamentMetricName =
  | "tournament_operation_latency_ms"
  | "tournament_store_unavailable_total"
  | "tournament_revision_conflict_total"
  | "tournament_forced_rematch_total";

export interface TournamentMetricEvent {
  readonly metric: TournamentMetricName;
  readonly value: number;
  readonly labels: Readonly<{
    operation: string;
    outcome?: "ok" | "error";
    errorCode?: string;
  }>;
}

export interface TournamentObservability {
  record(event: Readonly<TournamentMetricEvent>): void;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function countForcedRematches(value: unknown): number {
  if (!isRecord(value) || !Array.isArray(value.rounds)) return 0;
  let count = 0;
  for (const round of value.rounds) {
    if (!isRecord(round) || !isRecord(round.pairingEvidence)) continue;
    const decisions = round.pairingEvidence.decisions;
    if (!Array.isArray(decisions)) continue;
    for (const decision of decisions) {
      if (
        isRecord(decision) &&
        Array.isArray(decision.reasons) &&
        decision.reasons.includes("forced-rematch")
      ) {
        count += 1;
      }
    }
  }
  return count;
}

export function observeTournamentResult<T>(
  observability: TournamentObservability | undefined,
  operation: string,
  durationMs: number,
  result: TournamentResult<T>,
): void {
  if (observability === undefined) return;
  const outcome = result.ok ? "ok" : "error";
  observability.record({
    metric: "tournament_operation_latency_ms",
    value: Math.max(0, durationMs),
    labels: {
      operation,
      outcome,
      ...(!result.ok ? { errorCode: result.error.code } : {}),
    },
  });
  if (!result.ok && result.error.code === "STORE_UNAVAILABLE") {
    observability.record({
      metric: "tournament_store_unavailable_total",
      value: 1,
      labels: { operation, errorCode: result.error.code },
    });
  }
  if (!result.ok && result.error.code === "REVISION_CONFLICT") {
    observability.record({
      metric: "tournament_revision_conflict_total",
      value: 1,
      labels: { operation, errorCode: result.error.code },
    });
  }
  if (result.ok) {
    const forcedRematchCount = countForcedRematches(result.value);
    if (forcedRematchCount > 0) {
      observability.record({
        metric: "tournament_forced_rematch_total",
        value: forcedRematchCount,
        labels: { operation },
      });
    }
  }
}

export function createJsonLineTournamentObservability(
  write: (line: string) => void = (line) => {
    console.info(line);
  },
): TournamentObservability {
  return {
    record: (event) => {
      write(JSON.stringify({ type: "metric", subsystem: "tournaments", ...event }));
    },
  };
}
