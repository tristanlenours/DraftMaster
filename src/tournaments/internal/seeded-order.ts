import { createHash } from "node:crypto";

export function tournamentSeededKey(pairingSeed: number, participantId: string): string {
  return createHash("sha256")
    .update(`tournament-pairing@1\0${String(pairingSeed)}\0${participantId}`, "utf8")
    .digest("hex");
}

export function buildTournamentSeededDisplayOrder(
  participantIds: readonly string[],
  pairingSeed: number,
): ReadonlyMap<string, number> {
  return new Map(
    [...participantIds]
      .sort((left, right) =>
        tournamentSeededKey(pairingSeed, left).localeCompare(
          tournamentSeededKey(pairingSeed, right),
        ),
      )
      .map((participantId, index) => [participantId, index + 1] as const),
  );
}
