import type { ExactFraction, TournamentStanding } from "./types.ts";
import { buildTournamentSeededDisplayOrder } from "./seeded-order.ts";
import type { TournamentParticipant, TournamentRound } from "../types.ts";

export interface TournamentStandingsInput {
  readonly participants: readonly Readonly<TournamentParticipant>[];
  readonly rounds: readonly Readonly<TournamentRound>[];
  readonly pairingSeed: number;
}

interface StandingAccumulator {
  readonly participantId: string;
  readonly displayOrder: number;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  byes: number;
  gamesWon: number;
  gamesDrawn: number;
  gamesLost: number;
  matchPoints: number;
  gamePoints: number;
  possibleGamePoints: number;
  readonly opponents: string[];
}

function greatestCommonDivisor(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a === 0 ? 1 : a;
}

function fraction(numerator: number, denominator: number): ExactFraction {
  if (denominator === 0 || numerator === 0) return { numerator: 0, denominator: 1 };
  const divisor = greatestCommonDivisor(numerator, denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}

function addFractions(
  left: Readonly<ExactFraction>,
  right: Readonly<ExactFraction>,
): ExactFraction {
  return fraction(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator,
  );
}

function averageFractions(values: readonly Readonly<ExactFraction>[]): ExactFraction {
  if (values.length === 0) return fraction(0, 1);
  const sum = values.reduce<ExactFraction>(addFractions, fraction(0, 1));
  return fraction(sum.numerator, sum.denominator * values.length);
}

function compareFractions(left: Readonly<ExactFraction>, right: Readonly<ExactFraction>): number {
  return left.numerator * right.denominator - right.numerator * left.denominator;
}

function floorForOpponentAverage(value: Readonly<ExactFraction>): ExactFraction {
  const floor = fraction(1, 3);
  return compareFractions(value, floor) < 0 ? floor : value;
}

function currentResult(round: Readonly<TournamentRound>, matchId: string) {
  const match = round.matches.find((candidate) => candidate.matchId === matchId);
  if (match?.currentResultVersion === null || match?.currentResultVersion === undefined)
    return null;
  return match.resultVersions.find(({ version }) => version === match.currentResultVersion) ?? null;
}

function compareCompetitiveCriteria(
  left: Readonly<Omit<TournamentStanding, "competitiveRank">>,
  right: Readonly<Omit<TournamentStanding, "competitiveRank">>,
): number {
  if (left.matchPoints !== right.matchPoints) return right.matchPoints - left.matchPoints;
  for (const [leftFraction, rightFraction] of [
    [left.opponentsMatchWinPercentage, right.opponentsMatchWinPercentage],
    [left.gameWinPercentage, right.gameWinPercentage],
    [left.opponentsGameWinPercentage, right.opponentsGameWinPercentage],
  ] as const) {
    const difference = compareFractions(leftFraction, rightFraction);
    if (difference !== 0) return -difference;
  }
  return 0;
}

export function calculateTournamentStandings(
  input: Readonly<TournamentStandingsInput>,
): readonly TournamentStanding[] {
  const displayOrderById = buildTournamentSeededDisplayOrder(
    input.participants.map(({ participantId }) => participantId),
    input.pairingSeed,
  );
  const accumulators = new Map<string, StandingAccumulator>(
    input.participants.map(({ participantId }) => [
      participantId,
      {
        participantId,
        displayOrder: displayOrderById.get(participantId) ?? 1,
        matchesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        byes: 0,
        gamesWon: 0,
        gamesDrawn: 0,
        gamesLost: 0,
        matchPoints: 0,
        gamePoints: 0,
        possibleGamePoints: 0,
        opponents: [],
      },
    ]),
  );

  for (const round of input.rounds) {
    for (const match of round.matches) {
      const result = currentResult(round, match.matchId);
      if (result === null) continue;
      const participantA = accumulators.get(match.participantAId);
      if (participantA === undefined) continue;
      participantA.matchesPlayed += 1;
      participantA.gamesWon += result.gamesWonA;
      participantA.gamesLost += result.gamesWonB;
      participantA.gamesDrawn += result.drawnGames;
      participantA.gamePoints += result.gamesWonA * 3 + result.drawnGames;
      participantA.possibleGamePoints +=
        (result.gamesWonA + result.gamesWonB + result.drawnGames) * 3;

      if (match.participantBId === null) {
        participantA.wins += 1;
        participantA.byes += 1;
        participantA.matchPoints += 3;
        continue;
      }

      const participantB = accumulators.get(match.participantBId);
      if (participantB === undefined) continue;
      participantB.matchesPlayed += 1;
      participantB.gamesWon += result.gamesWonB;
      participantB.gamesLost += result.gamesWonA;
      participantB.gamesDrawn += result.drawnGames;
      participantB.gamePoints += result.gamesWonB * 3 + result.drawnGames;
      participantB.possibleGamePoints +=
        (result.gamesWonA + result.gamesWonB + result.drawnGames) * 3;
      participantA.opponents.push(participantB.participantId);
      participantB.opponents.push(participantA.participantId);

      if (result.outcome === "a-win") {
        participantA.wins += 1;
        participantA.matchPoints += 3;
        participantB.losses += 1;
      } else if (result.outcome === "b-win") {
        participantB.wins += 1;
        participantB.matchPoints += 3;
        participantA.losses += 1;
      } else {
        participantA.draws += 1;
        participantB.draws += 1;
        participantA.matchPoints += 1;
        participantB.matchPoints += 1;
      }
    }
  }

  const baseById = new Map(
    [...accumulators.values()].map((standing) => {
      const matchWinPercentage = fraction(standing.matchPoints, standing.matchesPlayed * 3);
      const gameWinPercentage = fraction(standing.gamePoints, standing.possibleGamePoints);
      return [standing.participantId, { standing, matchWinPercentage, gameWinPercentage }] as const;
    }),
  );
  const withoutRanks = [...baseById.values()].map(
    ({ standing, matchWinPercentage, gameWinPercentage }) => ({
      participantId: standing.participantId,
      matchesPlayed: standing.matchesPlayed,
      wins: standing.wins,
      draws: standing.draws,
      losses: standing.losses,
      byes: standing.byes,
      gamesWon: standing.gamesWon,
      gamesDrawn: standing.gamesDrawn,
      gamesLost: standing.gamesLost,
      matchPoints: standing.matchPoints,
      matchWinPercentage,
      opponentsMatchWinPercentage: averageFractions(
        standing.opponents.flatMap((opponentId) => {
          const opponent = baseById.get(opponentId);
          return opponent === undefined
            ? []
            : [floorForOpponentAverage(opponent.matchWinPercentage)];
        }),
      ),
      gameWinPercentage,
      opponentsGameWinPercentage: averageFractions(
        standing.opponents.flatMap((opponentId) => {
          const opponent = baseById.get(opponentId);
          return opponent === undefined
            ? []
            : [floorForOpponentAverage(opponent.gameWinPercentage)];
        }),
      ),
      displayOrder: standing.displayOrder,
    }),
  );
  withoutRanks.sort(
    (left, right) =>
      compareCompetitiveCriteria(left, right) || left.displayOrder - right.displayOrder,
  );

  let previous: (typeof withoutRanks)[number] | undefined;
  let competitiveRank = 0;
  return withoutRanks.map((standing, index) => {
    if (previous === undefined || compareCompetitiveCriteria(previous, standing) !== 0) {
      competitiveRank = index + 1;
    }
    previous = standing;
    return { ...standing, competitiveRank };
  });
}
