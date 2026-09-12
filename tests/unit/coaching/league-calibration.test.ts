import { describe, expect, it } from "vitest";
import {
  assertCubeLeagueMembership,
  calculateLeagueReadiness,
  classifyLeagueTier,
  countLeagueWitnessEvidence,
  validateLeagueCalibration,
  type CubeEvaluationContext,
  type LeagueCalibration,
  type LeagueWitnessEvidenceCounts,
} from "../../../src/domain/coaching/index.ts";

describe("League Calibration Unit Tests", () => {
  const validProvisionalCalibration: LeagueCalibration = {
    leagueId: "powered_vintage",
    calibrationVersion: "1.0.0",
    status: "provisional",
    memberCubes: ["arena_powered", "candyshop"],
    tierThresholds: {
      S: 90,
      A: 80,
      B: 70,
      C: 60,
    },
    readinessPolicy: {
      minWitnessesPerTier: 3,
      minDraftWitnessesPerCube: 10,
      minDeckWitnessesPerCube: 15,
    },
    evidenceCounts: {
      tierCoverage: { S: 0, A: 1, B: 0, C: 0, D: 0 },
      draftsByCube: { arena_powered: 1, candyshop: 0 },
      decksByCube: { arena_powered: 1, candyshop: 0 },
    },
  };

  describe("validateLeagueCalibration", () => {
    it("accepts a well-formed provisional calibration", () => {
      expect(() => {
        validateLeagueCalibration(validProvisionalCalibration);
      }).not.toThrow();
    });

    it("rejects thresholds that are not strictly descending S > A > B > C", () => {
      const invalidThresholds: LeagueCalibration = {
        ...validProvisionalCalibration,
        tierThresholds: {
          S: 80,
          A: 85, // S < A
          B: 70,
          C: 60,
        },
      };
      expect(() => {
        validateLeagueCalibration(invalidThresholds);
      }).toThrow(/strictly descending/i);
    });

    it("rejects non-finite or out-of-bounds thresholds", () => {
      const outOfBounds: LeagueCalibration = {
        ...validProvisionalCalibration,
        tierThresholds: {
          S: 105,
          A: 80,
          B: 70,
          C: 60,
        },
      };
      expect(() => {
        validateLeagueCalibration(outOfBounds);
      }).toThrow(/between 0 and 100/i);
    });

    it("rejects ready status when readiness policy conditions are not met", () => {
      const falseReady: LeagueCalibration = {
        ...validProvisionalCalibration,
        status: "ready", // But counts are 1 draft / 1 deck
      };
      expect(() => {
        validateLeagueCalibration(falseReady);
      }).toThrow(/readiness policy/i);
    });
  });

  describe("classifyLeagueTier", () => {
    it("correctly classifies scores on exact boundaries and intermediate values", () => {
      expect(classifyLeagueTier(90, validProvisionalCalibration)).toBe("S");
      expect(classifyLeagueTier(95.5, validProvisionalCalibration)).toBe("S");
      expect(classifyLeagueTier(89.99, validProvisionalCalibration)).toBe("A");
      expect(classifyLeagueTier(80, validProvisionalCalibration)).toBe("A");
      expect(classifyLeagueTier(79.9, validProvisionalCalibration)).toBe("B");
      expect(classifyLeagueTier(70, validProvisionalCalibration)).toBe("B");
      expect(classifyLeagueTier(69.9, validProvisionalCalibration)).toBe("C");
      expect(classifyLeagueTier(60, validProvisionalCalibration)).toBe("C");
      expect(classifyLeagueTier(59.9, validProvisionalCalibration)).toBe("D");
      expect(classifyLeagueTier(0, validProvisionalCalibration)).toBe("D");
    });
  });

  describe("assertCubeLeagueMembership", () => {
    it("accepts a context whose league and cube match the calibration", () => {
      const context: CubeEvaluationContext = {
        cubeKey: "arena_powered",
        cubeSnapshotId: "2026-09-08",
        leagueId: "powered_vintage",
      };
      expect(() => {
        assertCubeLeagueMembership(context, validProvisionalCalibration);
      }).not.toThrow();
    });

    it("rejects a context with mismatched leagueId", () => {
      const context: CubeEvaluationContext = {
        cubeKey: "arena_powered",
        cubeSnapshotId: "2026-09-08",
        leagueId: "peasant_league",
      };
      expect(() => {
        assertCubeLeagueMembership(context, validProvisionalCalibration);
      }).toThrow(/mismatched league/i);
    });

    it("rejects a context whose cubeKey is not in memberCubes", () => {
      const context: CubeEvaluationContext = {
        cubeKey: "titou_tribal",
        cubeSnapshotId: "2026-02-24.1",
        leagueId: "powered_vintage",
      };
      expect(() => {
        assertCubeLeagueMembership(context, validProvisionalCalibration);
      }).toThrow(/not a member/i);
    });
  });

  describe("calculateLeagueReadiness", () => {
    const policy = validProvisionalCalibration.readinessPolicy;
    const memberCubes = validProvisionalCalibration.memberCubes;

    it("returns provisional when evidenceCounts is missing", () => {
      expect(calculateLeagueReadiness(undefined, policy, memberCubes)).toBe("provisional");
    });

    it("returns provisional when each individual tier coverage is insufficient (< 3)", () => {
      const tiers: ("S" | "A" | "B" | "C" | "D")[] = ["S", "A", "B", "C", "D"];
      for (const deficientTier of tiers) {
        const tierCoverage = { S: 3, A: 3, B: 3, C: 3, D: 3 };
        tierCoverage[deficientTier] = 2; // only 2
        const counts: LeagueWitnessEvidenceCounts = {
          tierCoverage,
          draftsByCube: { arena_powered: 10, candyshop: 10 },
          decksByCube: { arena_powered: 15, candyshop: 15 },
        };
        expect(
          calculateLeagueReadiness(counts, policy, memberCubes),
          `Expected tier ${deficientTier} with count 2 to be provisional`,
        ).toBe("provisional");
      }
    });

    it("returns provisional when member cube draft counts are insufficient (< 10)", () => {
      for (const cubeKey of memberCubes) {
        const draftsByCube: Record<string, number> = { arena_powered: 10, candyshop: 10 };
        draftsByCube[cubeKey] = 9;
        const counts: LeagueWitnessEvidenceCounts = {
          tierCoverage: { S: 3, A: 3, B: 3, C: 3, D: 3 },
          draftsByCube,
          decksByCube: { arena_powered: 15, candyshop: 15 },
        };
        expect(
          calculateLeagueReadiness(counts, policy, memberCubes),
          `Expected cube ${cubeKey} with 9 drafts to be provisional`,
        ).toBe("provisional");
      }
    });

    it("returns provisional when member cube deck counts are insufficient (< 15)", () => {
      for (const cubeKey of memberCubes) {
        const decksByCube: Record<string, number> = { arena_powered: 15, candyshop: 15 };
        decksByCube[cubeKey] = 14;
        const counts: LeagueWitnessEvidenceCounts = {
          tierCoverage: { S: 3, A: 3, B: 3, C: 3, D: 3 },
          draftsByCube: { arena_powered: 10, candyshop: 10 },
          decksByCube,
        };
        expect(
          calculateLeagueReadiness(counts, policy, memberCubes),
          `Expected cube ${cubeKey} with 14 decks to be provisional`,
        ).toBe("provisional");
      }
    });

    it("returns ready when all tier minimums and all member cube minimums are satisfied", () => {
      const fullCounts: LeagueWitnessEvidenceCounts = {
        tierCoverage: { S: 3, A: 5, B: 4, C: 3, D: 3 },
        draftsByCube: { arena_powered: 12, candyshop: 10 },
        decksByCube: { arena_powered: 15, candyshop: 18 },
      };
      expect(calculateLeagueReadiness(fullCounts, policy, memberCubes)).toBe("ready");
    });
  });

  describe("countLeagueWitnessEvidence", () => {
    it("accurately counts tier coverage, drafts by cube, and decks by cube", () => {
      const mockCorpus = {
        leagueCalibration: {
          memberCubes: ["arena_powered", "candyshop"],
        },
        draftWitnesses: [
          { cubeKey: "arena_powered" },
          { cubeKey: "arena_powered" },
          { cubeKey: "candyshop" },
        ],
        deckWitnesses: [
          { expectedTier: "S" as const, cubeKey: "arena_powered" },
          { expectedTier: "A" as const, cubeKey: "arena_powered" },
          { expectedTier: "A" as const, cubeKey: "candyshop" },
          { expectedTier: "B" as const, cubeKey: "candyshop" },
          { expectedTier: "C" as const, cubeKey: "candyshop" },
          { expectedTier: "D" as const, cubeKey: "arena_powered" },
        ],
      };

      const counts = countLeagueWitnessEvidence(mockCorpus);

      expect(counts.tierCoverage).toEqual({
        S: 1,
        A: 2,
        B: 1,
        C: 1,
        D: 1,
      });
      expect(counts.draftsByCube).toEqual({
        arena_powered: 2,
        candyshop: 1,
      });
      expect(counts.decksByCube).toEqual({
        arena_powered: 3,
        candyshop: 3,
      });
    });
  });
});
