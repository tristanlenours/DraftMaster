import { describe, expect, it } from "vitest";

import {
  getDraftView,
  startDraft,
  type SeatPolicyDescriptor,
  type StartDraftInput,
} from "../../src/draft/index.ts";
import { RANDOM_SYSTEM_METADATA } from "../../src/random/seeded-random.ts";
import { validateSnapshot } from "../../src/cubes/validate-snapshot.ts";
import { buildSyntheticSnapshot, loadInitialSnapshotFixture } from "../fixtures/cube-fixtures.ts";

const seatPolicies: readonly SeatPolicyDescriptor[] = [
  { seatId: 0, policyId: "seeded-random", policyVersion: "1" },
  { seatId: 1, policyId: "seeded-random", policyVersion: "1" },
  { seatId: 2, policyId: "seeded-random", policyVersion: "1" },
  { seatId: 3, policyId: "seeded-random", policyVersion: "1" },
  { seatId: 4, policyId: "seeded-random", policyVersion: "1" },
  { seatId: 5, policyId: "seeded-random", policyVersion: "1" },
  { seatId: 6, policyId: "seeded-random", policyVersion: "1" },
  { seatId: 7, policyId: "seeded-random", policyVersion: "1" },
];

function validStartInput(snapshot: unknown = loadInitialSnapshotFixture()): StartDraftInput {
  const validated = validateSnapshot(snapshot);
  if (!validated.ok) {
    throw new Error(validated.error.message);
  }
  return {
    snapshot: validated.value,
    sessionId: "0c0e1a78c4cf",
    seed: 42,
    startedAt: "2026-09-04T12:00:00.000Z",
    engineVersion: "draft-engine@1.0.0",
    randomSystem: RANDOM_SYSTEM_METADATA,
    seatPolicies,
    configuration: {
      seatCount: 8,
      packCount: 3,
      cardsPerBooster: 15,
      directions: ["left", "right", "left"],
      controlledSeatId: 0,
    },
  };
}

describe("draft engine creation", () => {
  it("starts a 545-instance draft with 24 boosters and 185 unused instances", () => {
    const result = startDraft(validStartInput());

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.appendedEvents.map(({ type }) => type)).toEqual([
      "DraftStarted",
      "BoostersDealt",
    ]);
    const dealt = result.value.appendedEvents[1];
    expect(dealt?.type).toBe("BoostersDealt");
    if (dealt?.type === "BoostersDealt") {
      expect(dealt.boosters).toHaveLength(24);
      expect(new Set(dealt.boosters.map(({ boosterId }) => boosterId)).size).toBe(24);
      expect(
        dealt.boosters.every(
          ({ remainingCardInstanceIds }) => remainingCardInstanceIds.length === 15,
        ),
      ).toBe(true);
      expect(dealt.unusedCardInstanceIds).toHaveLength(185);
    }

    const view = getDraftView(result.value.draft);
    expect(view).toMatchObject({
      sessionId: "0c0e1a78c4cf",
      status: "active",
      revision: 0,
      packNumber: 1,
      pickNumber: 1,
    });
    expect(view.seats).toHaveLength(8);
    expect(
      view.seats.every(
        ({ currentBooster }) => currentBooster?.remainingCardInstanceIds.length === 15,
      ),
    ).toBe(true);
    expect(Object.keys(view.cardsByInstanceId)).toHaveLength(545);
  });

  it("rejects random-system metadata with an unknown field", () => {
    const input = validStartInput();
    const result = startDraft({
      ...input,
      randomSystem: {
        ...input.randomSystem,
        unversionedBehavior: "forbidden",
      } as unknown as StartDraftInput["randomSystem"],
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "INVALID_CONFIG",
        message: "Draft metadata or fixed configuration is invalid.",
        details: {},
      },
    });
  });

  it.each([
    { count: 540, version: "2026-03-02.1", unused: 180 },
    { count: 360, version: "2026-03-03.1", unused: 0 },
  ])(
    "distributes 360 distinct instances from a $count-instance snapshot",
    ({ count, version, unused }) => {
      const result = startDraft(validStartInput(buildSyntheticSnapshot(count, version)));

      expect(result.ok).toBe(true);
      if (!result.ok) {
        return;
      }
      const dealt = result.value.appendedEvents[1];
      if (dealt?.type !== "BoostersDealt") {
        throw new Error("Expected BoostersDealt as the second event.");
      }
      const distributed = dealt.boosters.flatMap(
        ({ remainingCardInstanceIds }) => remainingCardInstanceIds,
      );
      const accountedFor = [...distributed, ...dealt.unusedCardInstanceIds];
      expect(distributed).toHaveLength(360);
      expect(dealt.unusedCardInstanceIds).toHaveLength(unused);
      expect(new Set(accountedFor).size).toBe(count);
    },
  );

  it("rejects a snapshot containing fewer than 360 instances", () => {
    const input = validStartInput();
    const result = startDraft({
      ...input,
      snapshot: buildSyntheticSnapshot(
        359,
        "2026-03-04.1",
      ) as unknown as StartDraftInput["snapshot"],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INSUFFICIENT_CARDS");
      expect(result.error.details).toEqual({ actual: 359, minimum: 360 });
    }
  });

  it.each([
    {
      name: "missing seat",
      policies: seatPolicies.slice(0, 7),
    },
    {
      name: "duplicate seat",
      policies: [...seatPolicies.slice(0, 7), seatPolicies[0]],
    },
    {
      name: "unknown seat",
      policies: [...seatPolicies.slice(0, 7), { ...seatPolicies[7], seatId: 8 }],
    },
    {
      name: "empty policy ID",
      policies: [{ ...seatPolicies[0], policyId: "" }, ...seatPolicies.slice(1)],
    },
    {
      name: "empty policy version",
      policies: [{ ...seatPolicies[0], policyVersion: " " }, ...seatPolicies.slice(1)],
    },
  ])("rejects an invalid policy registration: $name", ({ policies }) => {
    const result = startDraft({
      ...validStartInput(),
      policies,
      seatPolicies: policies as readonly SeatPolicyDescriptor[],
    } as StartDraftInput & { readonly policies: unknown });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_CONFIG");
    }
  });

  it("orders policy descriptors and isolates state from caller-owned and returned values", () => {
    const input = validStartInput();
    const mutableSnapshot = structuredClone(input.snapshot);
    const mutablePolicies = structuredClone([...input.seatPolicies].reverse());
    const result = startDraft({
      ...input,
      snapshot: mutableSnapshot,
      seatPolicies: mutablePolicies,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const started = result.value.appendedEvents[0];
    if (started?.type !== "DraftStarted") {
      throw new Error("Expected DraftStarted as the first event.");
    }
    const originalName = started.snapshot.cards[0]?.name;
    Reflect.set(mutableSnapshot.cards[0] ?? {}, "name", "Caller mutation");
    Reflect.set(mutablePolicies[0] ?? {}, "policyId", "Caller mutation");

    expect(started.seatPolicies.map(({ seatId }) => seatId)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(started.snapshot.cards[0]?.name).toBe(originalName);
    expect(result.value.appendedEvents.filter((event) => "snapshot" in event)).toHaveLength(1);
    expect(Object.isFrozen(started.snapshot.cards)).toBe(true);
    expect(Reflect.set(started, "engineVersion", "mutated")).toBe(false);

    const firstView = getDraftView(result.value.draft);
    expect(Object.isFrozen(firstView)).toBe(true);
    expect(Object.isFrozen(firstView.seats)).toBe(true);
    expect(Reflect.set(firstView, "revision", 99)).toBe(false);
    expect(getDraftView(result.value.draft).revision).toBe(0);
  });

  it.each([
    { field: "sessionId", value: "ABC" },
    { field: "seed", value: 2_147_483_648 },
    { field: "startedAt", value: "yesterday" },
    { field: "engineVersion", value: " " },
  ])("rejects invalid $field metadata", ({ field, value }) => {
    const input: StartDraftInput = { ...validStartInput(), [field]: value };
    const result = startDraft(input);

    expect(result.ok).toBe(false);
  });
});
