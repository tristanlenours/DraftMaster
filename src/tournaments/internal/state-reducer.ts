import type { TournamentEvent, TournamentProjection } from "../types.ts";
import { calculateTournamentStandings } from "./standings.ts";

export function reduceTournamentEvent(
  state: Readonly<TournamentProjection> | null,
  event: Readonly<TournamentEvent>,
): Readonly<TournamentProjection> {
  if (event.type === "TournamentCreated") {
    if (state !== null) {
      throw new Error("TournamentCreated can only initialize an empty tournament.");
    }
    return {
      schemaVersion: 1,
      tournamentId: event.tournamentId,
      revision: event.revision,
      name: event.name,
      status: "preparation",
      format: null,
      plannedRoundCount: null,
      pairingSeed: event.pairingSeed,
      pairingEngineVersion: "tournament-pairing@1",
      cube: null,
      participants: [],
      rounds: [],
      standings: [],
      createdAt: event.occurredAt,
      updatedAt: event.occurredAt,
      startedAt: null,
      completedAt: null,
    };
  }
  if (event.type === "TournamentSetupReplaced") {
    if (state?.status !== "preparation") {
      throw new Error("TournamentSetupReplaced requires a tournament in preparation.");
    }
    return {
      ...state,
      revision: event.revision,
      name: event.name,
      format: event.format,
      plannedRoundCount: event.plannedRoundCount,
      cube: event.cube,
      participants: event.participants,
      updatedAt: event.occurredAt,
    };
  }
  if (event.type === "TournamentStarted") {
    if (state?.status !== "preparation") {
      throw new Error("TournamentStarted requires a tournament in preparation.");
    }
    return {
      ...state,
      revision: event.revision,
      status: "active",
      startedAt: event.startedAt,
      updatedAt: event.occurredAt,
    };
  }
  if (event.type === "RoundPublished") {
    if (state?.status !== "active") {
      throw new Error("RoundPublished requires an active tournament.");
    }
    const rounds = [...state.rounds, event.round];
    return {
      ...state,
      revision: event.revision,
      rounds,
      standings: calculateTournamentStandings({
        participants: state.participants,
        rounds,
        pairingSeed: state.pairingSeed,
      }),
      updatedAt: event.occurredAt,
    };
  }
  if (event.type === "MatchResultRecorded" || event.type === "MatchResultCorrected") {
    if (
      state === null ||
      (event.type === "MatchResultRecorded" && state.status !== "active") ||
      (event.type === "MatchResultCorrected" &&
        state.status !== "active" &&
        state.status !== "completed")
    ) {
      throw new Error(`${event.type} is not allowed for this tournament state.`);
    }
    if (
      !state.rounds.some((round) => round.matches.some(({ matchId }) => matchId === event.matchId))
    ) {
      throw new Error(`${event.type} requires an existing match.`);
    }
    const rounds = state.rounds.map((round) => {
      const matches = round.matches.map((match) => {
        if (match.matchId !== event.matchId) return match;
        if (event.type === "MatchResultRecorded" && match.currentResultVersion !== null) {
          throw new Error("MatchResultRecorded requires a pending match.");
        }
        if (event.type === "MatchResultCorrected" && match.currentResultVersion === null) {
          throw new Error("MatchResultCorrected requires a confirmed match.");
        }
        return {
          ...match,
          status: "confirmed" as const,
          resultVersions: [...match.resultVersions, event.result],
          currentResultVersion: event.result.version,
        };
      });
      const completed = matches.every(({ status }) => status === "confirmed");
      return {
        ...round,
        status: completed ? ("completed" as const) : round.status,
        completedAt: completed ? (round.completedAt ?? event.occurredAt) : round.completedAt,
        matches,
      };
    });
    return {
      ...state,
      revision: event.revision,
      rounds,
      standings: calculateTournamentStandings({
        participants: state.participants,
        rounds,
        pairingSeed: state.pairingSeed,
      }),
      updatedAt: event.occurredAt,
    };
  }
  if (event.type === "ParticipantDropped") {
    if (state?.status !== "active") {
      throw new Error("ParticipantDropped requires an active tournament.");
    }
    const target = state.participants.find(
      ({ participantId }) => participantId === event.participantId,
    );
    if (target === undefined) {
      throw new Error("ParticipantDropped requires an existing participant.");
    }
    if (target.status !== "active") {
      throw new Error("ParticipantDropped requires an active participant.");
    }
    const participants = state.participants.map((participant) => {
      if (participant.participantId !== event.participantId) return participant;
      return { ...participant, status: "dropped" as const };
    });
    return {
      ...state,
      revision: event.revision,
      participants,
      updatedAt: event.occurredAt,
    };
  }
  if (event.type === "TournamentCompleted") {
    if (state?.status !== "active") {
      throw new Error("TournamentCompleted requires an active tournament.");
    }
    return {
      ...state,
      revision: event.revision,
      status: "completed",
      completedAt: event.completedAt,
      updatedAt: event.occurredAt,
    };
  }
  if (event.type === "ParticipantDeckUpdated") {
    if (state === null) {
      throw new Error("ParticipantDeckUpdated requires an existing tournament.");
    }
    const participant = state.participants.find(
      ({ participantId }) => participantId === event.participantId,
    );
    if (participant === undefined) {
      throw new Error("ParticipantDeckUpdated requires an existing participant.");
    }
    return {
      ...state,
      revision: event.revision,
      participants: state.participants.map((candidate) =>
        candidate.participantId === event.participantId
          ? {
              ...candidate,
              deck: {
                ...candidate.deck,
                name: event.deckName,
                cards: event.cards,
                basicLands: event.basicLands,
              },
            }
          : candidate,
      ),
      updatedAt: event.occurredAt,
    };
  }
  if (state === null) {
    throw new Error("DeckKeyCardsUpdated requires an existing tournament.");
  }
  const participant = state.participants.find(
    ({ participantId }) => participantId === event.participantId,
  );
  if (participant === undefined) {
    throw new Error("DeckKeyCardsUpdated requires an existing participant.");
  }
  return {
    ...state,
    revision: event.revision,
    participants: state.participants.map((candidate) =>
      candidate.participantId === event.participantId
        ? { ...candidate, deck: { ...candidate.deck, keyCards: event.keyCards } }
        : candidate,
    ),
    updatedAt: event.occurredAt,
  };
}

export function replayTournamentEvents(
  events: readonly Readonly<TournamentEvent>[],
): Readonly<TournamentProjection> | null {
  return events.reduce<Readonly<TournamentProjection> | null>(reduceTournamentEvent, null);
}
