import { arch, cpus, platform } from "node:os";
import { performance } from "node:perf_hooks";

import { describe, expect, it } from "vitest";

import {
  createInMemoryTournamentStore,
  createTournamentCoordinator,
  type TournamentCoordinator,
  type TournamentCubeCatalog,
} from "../../src/tournaments/index.ts";
import {
  buildTournamentCubeSnapshot,
  createTournamentSequence,
  createTournamentTestClock,
} from "../helpers/tournament-fixtures.ts";

const PAIRING_LIMIT_MS = 100;
const STORAGE_OPERATION_LIMIT_MS = 2_000;
const WARMUP_RUNS = 3;
const MEASURED_RUNS = 20;
const PAIRING_SEED = 42;

function p95(durations: readonly number[]): number {
  if (durations.length === 0) throw new Error("A p95 requires at least one sample.");
  const ordered = [...durations].sort((left, right) => left - right);
  return ordered[Math.ceil(ordered.length * 0.95) - 1] ?? Number.POSITIVE_INFINITY;
}

function cubeCatalog(): TournamentCubeCatalog {
  const snapshot = buildTournamentCubeSnapshot();
  return {
    listCubes: () => Promise.resolve({ ok: true, value: [] }),
    loadSnapshot: () => Promise.resolve({ ok: true, value: snapshot }),
  };
}

function createCoordinator(prefix: string): TournamentCoordinator {
  return createTournamentCoordinator({
    store: createInMemoryTournamentStore(),
    cubeCatalog: cubeCatalog(),
    now: createTournamentTestClock().now,
    createId: createTournamentSequence(prefix),
    createSeed: () => PAIRING_SEED,
  });
}

async function createReadySwiss(
  coordinator: TournamentCoordinator,
  name: string,
  participantCount: number,
): Promise<{ readonly tournamentId: string; readonly revision: number }> {
  const created = await coordinator.createTournament({ requestId: `create-${name}`, name });
  if (!created.ok) throw new Error(created.error.message);
  const configured = await coordinator.execute({
    type: "replace-setup",
    requestId: `setup-${name}`,
    tournamentId: created.value.tournamentId,
    expectedRevision: created.value.revision,
    name,
    cubeKey: "titou_tribal",
    format: "swiss",
    plannedRoundCount: 5,
    participants: Array.from({ length: participantCount }, (_, index) => ({
      participantId: null,
      displayName: `Player ${String(index + 1)}`,
      deckName: `Deck ${String(index + 1)}`,
    })),
  });
  if (!configured.ok) throw new Error(configured.error.message);
  return {
    tournamentId: configured.value.tournamentId,
    revision: configured.value.revision,
  };
}

async function measure(operation: (index: number) => Promise<void>): Promise<number[]> {
  for (let index = 0; index < WARMUP_RUNS; index += 1) await operation(index);
  const durations: number[] = [];
  for (let index = 0; index < MEASURED_RUNS; index += 1) {
    const startedAt = performance.now();
    await operation(index + WARMUP_RUNS);
    durations.push(performance.now() - startedAt);
  }
  return durations;
}

function logBenchmark(name: string, durations: readonly number[]): void {
  console.log(
    `[Tournament benchmark] ${name}: p95=${p95(durations).toFixed(2)}ms, samples=${String(durations.length)}, seed=${String(PAIRING_SEED)}, node=${process.version}, platform=${platform()}-${arch()}, cpu=${cpus()[0]?.model ?? "unknown"}`,
  );
}

describe("Tournament management performance", () => {
  it("pairs 32 participants below 100 ms p95 with a reproducible seed", async () => {
    const durations = await measure(async (index) => {
      const coordinator = createCoordinator(`pairing-${String(index)}`);
      const ready = await createReadySwiss(coordinator, `Swiss ${String(index)}`, 32);
      const startedAt = performance.now();
      const result = await coordinator.execute({
        type: "start",
        requestId: `start-${String(index)}`,
        tournamentId: ready.tournamentId,
        expectedRevision: ready.revision,
      });
      durationsForPairing.push(performance.now() - startedAt);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.rounds[0]?.matches).toHaveLength(16);
    });
    const pairingDurations = durationsForPairing.splice(WARMUP_RUNS);
    expect(durations).toHaveLength(MEASURED_RUNS);
    logBenchmark("pairing-32", pairingDurations);
    expect(p95(pairingDurations)).toBeLessThan(PAIRING_LIMIT_MS);
  });

  it("keeps create, mutate and read operations below 2 s p95 with 100 historical tournaments", async () => {
    const coordinator = createCoordinator("history");
    for (let index = 0; index < 100; index += 1) {
      const created = await coordinator.createTournament({
        requestId: `seed-create-${String(index)}`,
        name: `Archived tournament ${String(index + 1)}`,
      });
      if (!created.ok) throw new Error(created.error.message);
    }

    const creationDurations = await measure(async (index) => {
      const created = await coordinator.createTournament({
        requestId: `measure-create-${String(index)}`,
        name: `Measured tournament ${String(index + 1)}`,
      });
      expect(created.ok).toBe(true);
    });
    const mutationTargets = await Promise.all(
      Array.from({ length: WARMUP_RUNS + MEASURED_RUNS }, async (_, index) => {
        const created = await coordinator.createTournament({
          requestId: `mutation-target-${String(index)}`,
          name: `Mutation target ${String(index + 1)}`,
        });
        if (!created.ok) throw new Error(created.error.message);
        return created.value;
      }),
    );
    const mutationDurations = await measure(async (index) => {
      const target = mutationTargets[index];
      if (target === undefined) throw new Error("Missing mutation target.");
      const configured = await coordinator.execute({
        type: "replace-setup",
        requestId: `measure-setup-${String(index)}`,
        tournamentId: target.tournamentId,
        expectedRevision: target.revision,
        name: target.name,
        cubeKey: "titou_tribal",
        format: "swiss",
        plannedRoundCount: 3,
        participants: [
          { participantId: null, displayName: "Alice", deckName: "Aggro Boros" },
          { participantId: null, displayName: "Bob", deckName: "Izzet Wizards" },
        ],
      });
      expect(configured.ok).toBe(true);
    });
    const readDurations = await measure(async () => {
      const listed = await coordinator.listTournaments({ status: "all", limit: 100 });
      expect(listed.ok).toBe(true);
      if (listed.ok) expect(listed.value).toHaveLength(100);
    });

    logBenchmark("create-with-100-history", creationDurations);
    logBenchmark("mutate-with-100-history", mutationDurations);
    logBenchmark("list-100-history", readDurations);
    expect(p95(creationDurations)).toBeLessThan(STORAGE_OPERATION_LIMIT_MS);
    expect(p95(mutationDurations)).toBeLessThan(STORAGE_OPERATION_LIMIT_MS);
    expect(p95(readDurations)).toBeLessThan(STORAGE_OPERATION_LIMIT_MS);
  });
});

const durationsForPairing: number[] = [];
