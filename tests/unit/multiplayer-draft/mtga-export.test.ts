import { describe, expect, it } from "vitest";

import { generateMtgaExport } from "../../../src/multiplayer-draft/mtga-export.ts";

describe("generateMtgaExport", () => {
  it("genere un Deck 40 et le Sideboard exhaustif avec quantites et ordre stables", () => {
    const pool = [
      { instanceId: "bolt-1", name: "Lightning Bolt", cmc: 1, isLand: false },
      { instanceId: "bolt-2", name: "Lightning Bolt", cmc: 1, isLand: false },
      { instanceId: "eclair", name: "Éclair perforant", cmc: 2, isLand: false },
      ...Array.from({ length: 21 }, (_, index) => ({
        instanceId: `spell-${String(index)}`,
        name: `Spell ${String(index).padStart(2, "0")}`,
        cmc: 3,
        isLand: false,
      })),
      { instanceId: "den", name: "Den of the Bugbear", cmc: 0, isLand: true },
      ...Array.from({ length: 20 }, (_, index) => ({
        instanceId: `side-${String(index)}`,
        name: `Sideboard ${String(index).padStart(2, "0")}`,
        cmc: 4,
        isLand: false,
      })),
    ];
    const selected = pool.slice(0, 25).map(({ instanceId }) => instanceId);

    const result = generateMtgaExport({
      status: "finalized",
      pool,
      maindeckCardInstanceIds: selected,
      basicLands: { Plains: 0, Island: 0, Swamp: 0, Mountain: 15, Forest: 0 },
    });

    expect(result.compatible).toBe(true);
    expect(result.incompatibleCards).toEqual([]);
    expect(result.text).toContain("Deck\n2 Lightning Bolt\n1 Éclair perforant");
    expect(result.text).toContain("1 Den of the Bugbear\n15 Mountain\n\nSideboard\n");
    expect(result.text).toContain("1 Sideboard 19\n");
    expect(result.text.endsWith("\n")).toBe(true);
    expect(result.deckCount).toBe(40);
    expect(result.sideboardCount).toBe(20);
  });

  it("bloque une liste inconnue ou ambigue et nomme chaque incompatibilite", () => {
    const pool = [
      ...Array.from({ length: 24 }, (_, index) => ({
        instanceId: `known-${String(index)}`,
        name: `Known ${String(index)}`,
        cmc: 2,
        isLand: false,
      })),
      {
        instanceId: "mystery",
        name: "Mystery Card",
        cmc: 3,
        isLand: false,
        arenaAvailability: "unknown" as const,
      },
      ...Array.from({ length: 20 }, (_, index) => ({
        instanceId: `side-${String(index)}`,
        name: `Side ${String(index)}`,
        cmc: 4,
        isLand: false,
      })),
    ];

    const result = generateMtgaExport({
      status: "finalized",
      pool,
      maindeckCardInstanceIds: pool.slice(0, 25).map(({ instanceId }) => instanceId),
      basicLands: { Plains: 0, Island: 0, Swamp: 0, Mountain: 15, Forest: 0 },
    });

    expect(result.compatible).toBe(false);
    expect(result.incompatibleCards).toEqual([
      {
        cardInstanceId: "mystery",
        name: "Mystery Card",
        reason: "Disponibilite Arena inconnue.",
      },
    ]);
    expect(result.warnings[0]).toContain("ne peut pas etre presente comme importable");
    expect(result.text).toContain("# Export MTGA partiel non importable");
  });

  it("refuse une liste qui n'a pas exactement 40 cartes", () => {
    expect(() =>
      generateMtgaExport({
        status: "finalized",
        pool: [{ instanceId: "one", name: "One", cmc: 1, isLand: false }],
        maindeckCardInstanceIds: ["one"],
        basicLands: { Plains: 0, Island: 0, Swamp: 0, Mountain: 0, Forest: 0 },
      }),
    ).toThrow("exactement 40 cartes");
  });
});
