export interface ExactFraction {
  readonly numerator: number;
  readonly denominator: number;
}

export interface TournamentStanding {
  readonly participantId: string;
  readonly matchesPlayed: number;
  readonly wins: number;
  readonly draws: number;
  readonly losses: number;
  readonly byes: number;
  readonly gamesWon: number;
  readonly gamesDrawn: number;
  readonly gamesLost: number;
  readonly matchPoints: number;
  readonly matchWinPercentage: ExactFraction;
  readonly opponentsMatchWinPercentage: ExactFraction;
  readonly gameWinPercentage: ExactFraction;
  readonly opponentsGameWinPercentage: ExactFraction;
  readonly competitiveRank: number;
  readonly displayOrder: number;
}

export interface PairingCost {
  readonly rematches: number;
  readonly repeatedRematches: number;
  readonly maximumMatchPointGap: number;
  readonly totalMatchPointGap: number;
  readonly totalRankGap: number;
  readonly seededOrderCost: number;
}

export type PairingReason =
  "same-score" | "float" | "forced-rematch" | "swiss-bye" | "round-robin-pause";

export interface PairingDecisionEvidence {
  readonly matchId: string | null;
  readonly participantIds: readonly string[];
  readonly reasons: readonly PairingReason[];
}

export interface PairingEvidence {
  readonly engineVersion: "tournament-pairing@1";
  readonly pairingSeed: number;
  readonly inputSha256: string;
  readonly standingsBefore: readonly Readonly<TournamentStanding>[];
  readonly cost: Readonly<PairingCost>;
  readonly decisions: readonly Readonly<PairingDecisionEvidence>[];
}
