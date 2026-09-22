import { describe, expect, it } from "vitest";

import {
  createJsonLineTournamentObservability,
  observeTournamentResult,
  type TournamentMetricEvent,
  type TournamentObservability,
} from "../../../src/tournaments/index.ts";

describe("Tournament observability", () => {
  it("records latency, technical failures and forced rematches without sensitive payloads", () => {
    const events: TournamentMetricEvent[] = [];
    const observability: TournamentObservability = {
      record: (event) => events.push(event),
    };
    observeTournamentResult(observability, "publish-round", 12.5, {
      ok: false,
      error: {
        code: "REVISION_CONFLICT",
        message: "sensitive free-form message",
        details: { tournamentId: "secret-id", playerName: "Alice" },
      },
    });
    observeTournamentResult(observability, "start", 20, {
      ok: true,
      value: {
        rounds: [
          {
            pairingEvidence: {
              decisions: [{ reasons: ["forced-rematch"], participantIds: ["secret-player"] }],
            },
          },
        ],
      },
    });

    expect(events).toEqual([
      {
        metric: "tournament_operation_latency_ms",
        value: 12.5,
        labels: { operation: "publish-round", outcome: "error", errorCode: "REVISION_CONFLICT" },
      },
      {
        metric: "tournament_revision_conflict_total",
        value: 1,
        labels: { operation: "publish-round", errorCode: "REVISION_CONFLICT" },
      },
      {
        metric: "tournament_operation_latency_ms",
        value: 20,
        labels: { operation: "start", outcome: "ok" },
      },
      {
        metric: "tournament_forced_rematch_total",
        value: 1,
        labels: { operation: "start" },
      },
    ]);
    expect(JSON.stringify(events)).not.toContain("secret");
    expect(JSON.stringify(events)).not.toContain("Alice");
  });

  it("emits structured JSON lines", () => {
    const lines: string[] = [];
    const observability = createJsonLineTournamentObservability((line) => lines.push(line));
    observability.record({
      metric: "tournament_store_unavailable_total",
      value: 1,
      labels: { operation: "list", errorCode: "STORE_UNAVAILABLE" },
    });
    expect(JSON.parse(lines[0] ?? "{}")).toEqual({
      type: "metric",
      subsystem: "tournaments",
      metric: "tournament_store_unavailable_total",
      value: 1,
      labels: { operation: "list", errorCode: "STORE_UNAVAILABLE" },
    });
  });
});
