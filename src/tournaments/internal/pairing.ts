import { createHash } from "node:crypto";

import { buildTournamentSeededDisplayOrder } from "./seeded-order.ts";
import { calculateTournamentStandings } from "./standings.ts";
import type {
  PairingCost,
  PairingDecisionEvidence,
  PairingEvidence,
  TournamentStanding,
} from "./types.ts";
import type { TournamentMatch, TournamentParticipant, TournamentRound } from "../types.ts";

export interface SwissPairingInput {
  readonly tournamentId: string;
  readonly roundNumber: number;
  readonly sourceRevision: number;
  readonly pairingSeed: number;
  readonly participants: readonly Readonly<TournamentParticipant>[];
  readonly standings: readonly Readonly<TournamentStanding>[];
  readonly priorRounds: readonly Readonly<TournamentRound>[];
  readonly publishedAt: string;
  readonly requestId: string;
  readonly createMatchId: () => string;
}

export type RoundRobinThreeInput = Omit<
  SwissPairingInput,
  "roundNumber" | "standings" | "priorRounds"
>;

function initialStandings(
  participants: readonly Readonly<TournamentParticipant>[],
  pairingSeed: number,
): readonly TournamentStanding[] {
  const displayOrderById = buildTournamentSeededDisplayOrder(
    participants.map(({ participantId }) => participantId),
    pairingSeed,
  );
  return participants.map(({ participantId }) => ({
    participantId,
    matchesPlayed: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    byes: 0,
    gamesWon: 0,
    gamesDrawn: 0,
    gamesLost: 0,
    matchPoints: 0,
    matchWinPercentage: { numerator: 0, denominator: 1 },
    opponentsMatchWinPercentage: { numerator: 0, denominator: 1 },
    gameWinPercentage: { numerator: 0, denominator: 1 },
    opponentsGameWinPercentage: { numerator: 0, denominator: 1 },
    competitiveRank: 1,
    displayOrder: displayOrderById.get(participantId) ?? 1,
  }));
}

function buildInputSha256(
  input: Readonly<SwissPairingInput>,
  standingsBefore: readonly Readonly<TournamentStanding>[],
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        engineVersion: "tournament-pairing@1",
        tournamentId: input.tournamentId,
        roundNumber: input.roundNumber,
        sourceRevision: input.sourceRevision,
        pairingSeed: input.pairingSeed,
        participants: input.participants.map(({ participantId, status }) => ({
          participantId,
          status,
        })),
        standingsBefore,
        priorPairings: input.priorRounds.map(({ roundNumber, matches }) => ({
          roundNumber,
          matches: matches.map(({ participantAId, participantBId }) => ({
            participantAId,
            participantBId,
          })),
        })),
      }),
      "utf8",
    )
    .digest("hex");
}

interface PairCandidate {
  readonly participantAId: string;
  readonly participantBId: string;
  readonly cost: Readonly<PairingCost>;
  readonly reasons: readonly ("same-score" | "float" | "forced-rematch")[];
}

interface PairingSolution {
  readonly pairs: readonly Readonly<PairCandidate>[];
  readonly cost: Readonly<PairingCost>;
}

const ZERO_COST: PairingCost = {
  rematches: 0,
  repeatedRematches: 0,
  maximumMatchPointGap: 0,
  totalMatchPointGap: 0,
  totalRankGap: 0,
  seededOrderCost: 0,
};

function pairKey(left: string, right: string): string {
  return left < right ? `${left}\0${right}` : `${right}\0${left}`;
}

function compareCost(left: Readonly<PairingCost>, right: Readonly<PairingCost>): number {
  for (const key of [
    "rematches",
    "repeatedRematches",
    "maximumMatchPointGap",
    "totalMatchPointGap",
    "totalRankGap",
    "seededOrderCost",
  ] as const) {
    const difference = left[key] - right[key];
    if (difference !== 0) return difference;
  }
  return 0;
}

function addCost(left: Readonly<PairingCost>, right: Readonly<PairingCost>): PairingCost {
  return {
    rematches: left.rematches + right.rematches,
    repeatedRematches: left.repeatedRematches + right.repeatedRematches,
    maximumMatchPointGap: Math.max(left.maximumMatchPointGap, right.maximumMatchPointGap),
    totalMatchPointGap: left.totalMatchPointGap + right.totalMatchPointGap,
    totalRankGap: left.totalRankGap + right.totalRankGap,
    seededOrderCost: left.seededOrderCost + right.seededOrderCost,
  };
}

function buildMeetingCounts(
  rounds: readonly Readonly<TournamentRound>[],
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const round of rounds) {
    for (const match of round.matches) {
      if (match.participantBId === null) continue;
      const key = pairKey(match.participantAId, match.participantBId);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

function createPairCandidate(
  participantAId: string,
  participantBId: string,
  standingsById: ReadonlyMap<string, Readonly<TournamentStanding>>,
  meetingCounts: ReadonlyMap<string, number>,
): PairCandidate {
  const standingA = standingsById.get(participantAId);
  const standingB = standingsById.get(participantBId);
  if (standingA === undefined || standingB === undefined) {
    throw new Error("Every paired participant must have a standing row.");
  }
  const priorMeetings = meetingCounts.get(pairKey(participantAId, participantBId)) ?? 0;
  const matchPointGap = Math.abs(standingA.matchPoints - standingB.matchPoints);
  return {
    participantAId,
    participantBId,
    cost: {
      rematches: priorMeetings > 0 ? 1 : 0,
      repeatedRematches: priorMeetings,
      maximumMatchPointGap: matchPointGap,
      totalMatchPointGap: matchPointGap,
      totalRankGap: Math.abs(standingA.competitiveRank - standingB.competitiveRank),
      seededOrderCost: Math.abs(standingA.displayOrder - standingB.displayOrder),
    },
    reasons: [
      matchPointGap === 0 ? "same-score" : "float",
      ...(priorMeetings > 0 ? (["forced-rematch"] as const) : []),
    ],
  };
}

function optimisticCost(
  current: Readonly<PairingCost>,
  remaining: readonly string[],
  candidateByPair: ReadonlyMap<string, Readonly<PairCandidate>>,
): PairingCost {
  if (remaining.length === 0) return current;
  const minimums = remaining.map((participantId) => {
    const candidates = remaining
      .filter((otherId) => otherId !== participantId)
      .map((otherId) => candidateByPair.get(pairKey(participantId, otherId)))
      .filter((candidate): candidate is Readonly<PairCandidate> => candidate !== undefined);
    if (candidates.length === 0) return ZERO_COST;
    return {
      rematches: Math.min(...candidates.map(({ cost }) => cost.rematches)),
      repeatedRematches: Math.min(...candidates.map(({ cost }) => cost.repeatedRematches)),
      maximumMatchPointGap: Math.min(...candidates.map(({ cost }) => cost.maximumMatchPointGap)),
      totalMatchPointGap: Math.min(...candidates.map(({ cost }) => cost.totalMatchPointGap)),
      totalRankGap: Math.min(...candidates.map(({ cost }) => cost.totalRankGap)),
      seededOrderCost: Math.min(...candidates.map(({ cost }) => cost.seededOrderCost)),
    };
  });
  const halfSum = (key: keyof PairingCost): number =>
    Math.ceil(minimums.reduce((sum, cost) => sum + cost[key], 0) / 2);
  return {
    rematches: current.rematches + halfSum("rematches"),
    repeatedRematches: current.repeatedRematches + halfSum("repeatedRematches"),
    maximumMatchPointGap: Math.max(
      current.maximumMatchPointGap,
      ...minimums.map(({ maximumMatchPointGap }) => maximumMatchPointGap),
    ),
    totalMatchPointGap: current.totalMatchPointGap + halfSum("totalMatchPointGap"),
    totalRankGap: current.totalRankGap + halfSum("totalRankGap"),
    seededOrderCost: current.seededOrderCost + halfSum("seededOrderCost"),
  };
}

function solvePairing(
  participantIds: readonly string[],
  standingsById: ReadonlyMap<string, Readonly<TournamentStanding>>,
  meetingCounts: ReadonlyMap<string, number>,
): PairingSolution {
  const candidateByPair = new Map<string, PairCandidate>();
  for (let leftIndex = 0; leftIndex < participantIds.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < participantIds.length; rightIndex += 1) {
      const left = participantIds[leftIndex];
      const right = participantIds[rightIndex];
      if (left !== undefined && right !== undefined) {
        candidateByPair.set(
          pairKey(left, right),
          createPairCandidate(left, right, standingsById, meetingCounts),
        );
      }
    }
  }

  const result: { best: PairingSolution | null } = { best: null };
  const search = (
    remaining: readonly string[],
    pairs: readonly Readonly<PairCandidate>[],
    cost: Readonly<PairingCost>,
  ): void => {
    if (
      result.best !== null &&
      compareCost(optimisticCost(cost, remaining, candidateByPair), result.best.cost) >= 0
    ) {
      return;
    }
    if (remaining.length === 0) {
      if (result.best === null || compareCost(cost, result.best.cost) < 0) {
        result.best = { pairs, cost };
      }
      return;
    }

    const participantAId = [...remaining].sort((left, right) => {
      const availableWithoutRematch = (participantId: string): number =>
        remaining.filter((otherId) => {
          if (otherId === participantId) return false;
          return candidateByPair.get(pairKey(participantId, otherId))?.cost.rematches === 0;
        }).length;
      const difference = availableWithoutRematch(left) - availableWithoutRematch(right);
      if (difference !== 0) return difference;
      return (
        (standingsById.get(left)?.displayOrder ?? 0) - (standingsById.get(right)?.displayOrder ?? 0)
      );
    })[0];
    if (participantAId === undefined) return;
    const candidates = remaining
      .filter((participantId) => participantId !== participantAId)
      .map((participantBId) => candidateByPair.get(pairKey(participantAId, participantBId)))
      .filter((candidate): candidate is Readonly<PairCandidate> => candidate !== undefined)
      .sort((left, right) => {
        const difference = compareCost(left.cost, right.cost);
        if (difference !== 0) return difference;
        return (
          (standingsById.get(left.participantBId)?.displayOrder ?? 0) -
          (standingsById.get(right.participantBId)?.displayOrder ?? 0)
        );
      });
    for (const candidate of candidates) {
      search(
        remaining.filter(
          (participantId) =>
            participantId !== candidate.participantAId &&
            participantId !== candidate.participantBId,
        ),
        [...pairs, candidate],
        addCost(cost, candidate.cost),
      );
    }
  };

  search(participantIds, [], ZERO_COST);
  if (result.best === null) throw new Error("No complete Swiss pairing exists.");
  return result.best;
}

function pendingMatch(
  input: Readonly<SwissPairingInput>,
  tableNumber: number,
  participantAId: string,
  participantBId: string,
): TournamentMatch {
  return {
    matchId: input.createMatchId(),
    roundNumber: input.roundNumber,
    tableNumber,
    participantAId,
    participantBId,
    status: "pending",
    resultVersions: [],
    currentResultVersion: null,
  };
}

function byeMatch(
  input: Readonly<SwissPairingInput>,
  tableNumber: number,
  participantId: string,
): TournamentMatch {
  return {
    matchId: input.createMatchId(),
    roundNumber: input.roundNumber,
    tableNumber,
    participantAId: participantId,
    participantBId: null,
    status: "confirmed",
    resultVersions: [
      {
        version: 1,
        kind: "swiss-bye",
        gamesWonA: 2,
        gamesWonB: 0,
        drawnGames: 0,
        outcome: "a-win",
        recordedAt: input.publishedAt,
        requestId: input.requestId,
        replacesVersion: null,
        reason: null,
      },
    ],
    currentResultVersion: 1,
  };
}

export function createSwissRound(input: Readonly<SwissPairingInput>): TournamentRound {
  const activeParticipants = input.participants.filter(({ status }) => status === "active");
  const unsortedStandings =
    input.standings.length === 0
      ? input.priorRounds.length === 0
        ? initialStandings(activeParticipants, input.pairingSeed)
        : calculateTournamentStandings({
            participants: input.participants,
            rounds: input.priorRounds,
            pairingSeed: input.pairingSeed,
          })
      : [...input.standings];
  const standingsBefore = [...unsortedStandings].sort(
    (left, right) =>
      left.competitiveRank - right.competitiveRank || left.displayOrder - right.displayOrder,
  );
  const standingsById = new Map(
    standingsBefore.map((standing) => [standing.participantId, standing] as const),
  );
  const ordered = [...activeParticipants].sort((left, right) => {
    const leftStanding = standingsById.get(left.participantId);
    const rightStanding = standingsById.get(right.participantId);
    const pointDifference = (rightStanding?.matchPoints ?? 0) - (leftStanding?.matchPoints ?? 0);
    if (pointDifference !== 0) return pointDifference;
    const rankDifference =
      (leftStanding?.competitiveRank ?? 1) - (rightStanding?.competitiveRank ?? 1);
    if (rankDifference !== 0) return rankDifference;
    return (leftStanding?.displayOrder ?? 1) - (rightStanding?.displayOrder ?? 1);
  });

  const byeParticipant =
    ordered.length % 2 === 1
      ? [...ordered].sort((left, right) => {
          const leftStanding = standingsById.get(left.participantId);
          const rightStanding = standingsById.get(right.participantId);
          const byeDifference = (leftStanding?.byes ?? 0) - (rightStanding?.byes ?? 0);
          if (byeDifference !== 0) return byeDifference;
          const rankDifference =
            (rightStanding?.competitiveRank ?? 1) - (leftStanding?.competitiveRank ?? 1);
          if (rankDifference !== 0) return rankDifference;
          return (leftStanding?.displayOrder ?? 1) - (rightStanding?.displayOrder ?? 1);
        })[0]
      : undefined;
  const pairedParticipants =
    byeParticipant === undefined
      ? ordered
      : ordered.filter(({ participantId }) => participantId !== byeParticipant.participantId);
  const solution = solvePairing(
    pairedParticipants.map(({ participantId }) => participantId),
    standingsById,
    buildMeetingCounts(input.priorRounds),
  );
  const sortedPairs = [...solution.pairs].sort((left, right) => {
    const leftOrder = Math.min(
      standingsById.get(left.participantAId)?.displayOrder ?? 0,
      standingsById.get(left.participantBId)?.displayOrder ?? 0,
    );
    const rightOrder = Math.min(
      standingsById.get(right.participantAId)?.displayOrder ?? 0,
      standingsById.get(right.participantBId)?.displayOrder ?? 0,
    );
    return leftOrder - rightOrder;
  });
  const matches: TournamentMatch[] = [];
  const decisions: PairingDecisionEvidence[] = [];
  for (const pair of sortedPairs) {
    const match = pendingMatch(input, matches.length + 1, pair.participantAId, pair.participantBId);
    matches.push(match);
    decisions.push({
      matchId: match.matchId,
      participantIds: [pair.participantAId, pair.participantBId],
      reasons: pair.reasons,
    });
  }
  if (byeParticipant !== undefined) {
    const match = byeMatch(input, matches.length + 1, byeParticipant.participantId);
    matches.push(match);
    decisions.push({
      matchId: match.matchId,
      participantIds: [byeParticipant.participantId],
      reasons: ["swiss-bye"],
    });
  }

  const pairingEvidence: PairingEvidence = {
    engineVersion: "tournament-pairing@1",
    pairingSeed: input.pairingSeed,
    inputSha256: buildInputSha256(input, standingsBefore),
    standingsBefore,
    cost: solution.cost,
    decisions,
  };
  return {
    roundNumber: input.roundNumber,
    status: "published",
    sourceRevision: input.sourceRevision,
    publishedAt: input.publishedAt,
    completedAt: null,
    pairingEvidence,
    matches,
    pauses: [],
  };
}

export function createRoundRobinThreeRounds(
  input: Readonly<RoundRobinThreeInput>,
): readonly TournamentRound[] {
  const activeParticipants = input.participants.filter(({ status }) => status === "active");
  if (activeParticipants.length !== 3) {
    throw new Error("round-robin-three requires exactly three active participants.");
  }
  const standingsBefore = [...initialStandings(activeParticipants, input.pairingSeed)].sort(
    (left, right) => left.displayOrder - right.displayOrder,
  );
  const ordered = standingsBefore.map(({ participantId }) => participantId);
  const schedules = [
    { participantAId: ordered[0], participantBId: ordered[1], pausedParticipantId: ordered[2] },
    { participantAId: ordered[0], participantBId: ordered[2], pausedParticipantId: ordered[1] },
    { participantAId: ordered[1], participantBId: ordered[2], pausedParticipantId: ordered[0] },
  ];
  return schedules.map((schedule, index) => {
    if (
      schedule.participantAId === undefined ||
      schedule.participantBId === undefined ||
      schedule.pausedParticipantId === undefined
    ) {
      throw new Error("Incomplete round-robin-three schedule.");
    }
    const roundNumber = index + 1;
    const roundInput: SwissPairingInput = {
      ...input,
      roundNumber,
      standings: standingsBefore,
      priorRounds: [],
    };
    const match = pendingMatch(roundInput, 1, schedule.participantAId, schedule.participantBId);
    return {
      roundNumber,
      status: "published" as const,
      sourceRevision: input.sourceRevision,
      publishedAt: input.publishedAt,
      completedAt: null,
      pairingEvidence: {
        engineVersion: "tournament-pairing@1" as const,
        pairingSeed: input.pairingSeed,
        inputSha256: buildInputSha256(roundInput, standingsBefore),
        standingsBefore,
        cost: ZERO_COST,
        decisions: [
          {
            matchId: match.matchId,
            participantIds: [schedule.participantAId, schedule.participantBId],
            reasons: ["same-score" as const],
          },
          {
            matchId: null,
            participantIds: [schedule.pausedParticipantId],
            reasons: ["round-robin-pause" as const],
          },
        ],
      },
      matches: [match],
      pauses: [
        {
          participantId: schedule.pausedParticipantId,
          reason: "round-robin-pause" as const,
        },
      ],
    };
  });
}
