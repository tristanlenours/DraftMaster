import type { TournamentProjection, TournamentSummary } from "../types.ts";

export function toTournamentSummary(tournament: Readonly<TournamentProjection>): TournamentSummary {
  const leaders = tournament.standings
    .filter(({ competitiveRank }) => competitiveRank === 1)
    .flatMap(({ participantId }) => {
      const participant = tournament.participants.find(
        (candidate) => candidate.participantId === participantId,
      );
      return participant === undefined ? [] : [participant.displayName];
    });
  return {
    tournamentId: tournament.tournamentId,
    name: tournament.name,
    status: tournament.status,
    format: tournament.format,
    cube:
      tournament.cube === null
        ? null
        : {
            cubeKey: tournament.cube.cubeKey,
            cubeName: tournament.cube.cubeName,
            activeSnapshotId: tournament.cube.snapshotId,
          },
    participantCount: tournament.participants.length,
    currentRoundNumber: tournament.rounds.at(-1)?.roundNumber ?? null,
    leaders,
    revision: tournament.revision,
    createdAt: tournament.createdAt,
    updatedAt: tournament.updatedAt,
  };
}
