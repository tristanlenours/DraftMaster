import type {
  MultiplayerEvent,
  PublicLobbyView,
  PublicParticipantView,
  PublicSeatView,
} from "./types.ts";

export function replayLobbyEvents(
  fallback: Readonly<PublicLobbyView>,
  events: readonly Readonly<MultiplayerEvent>[],
): Readonly<PublicLobbyView> {
  let lobby = fallback;

  for (const event of [...events].sort((left, right) => left.sequence - right.sequence)) {
    if (event.type === "LobbyOpened") {
      lobby = {
        lobbyId: "global",
        generation: event.generation,
        revision: event.revision,
        status: "open",
        cubeKey: event.cubeKey,
        cubeLocked: false,
        activeSessionId: null,
        participants: [],
        seats: [null, null, null, null, null, null, null, null],
      };
      continue;
    }

    if (event.type === "CubeLocked") {
      lobby = { ...lobby, revision: event.revision, cubeLocked: true };
      continue;
    }

    if (event.type === "CubeChanged") {
      lobby = { ...lobby, revision: event.revision, cubeKey: event.cubeKey };
      continue;
    }

    if (event.type === "ParticipantLeft") {
      const participants = lobby.participants
        .filter(({ participantId }) => participantId !== event.participantId)
        .map((participant) => ({ ...participant, ready: false }));
      const seats = lobby.seats.map((seat) => {
        if (seat?.kind === "human" && !participants.some(({ seatId }) => seatId === seat.seatId)) {
          return null;
        }
        return seat?.kind === "human" ? { ...seat, ready: false } : seat;
      });
      lobby = { ...lobby, revision: event.revision, participants, seats };
      continue;
    }

    if (event.type === "LobbyEmptied") {
      lobby = {
        ...lobby,
        revision: event.revision,
        status: "open",
        cubeKey: null,
        cubeLocked: false,
        activeSessionId: null,
        participants: [],
        seats: [null, null, null, null, null, null, null, null],
      };
      continue;
    }

    if (event.type === "ReadyChanged") {
      const participants = lobby.participants.map((participant) =>
        participant.participantId === event.participantId
          ? { ...participant, ready: event.ready }
          : participant,
      );
      const seats = lobby.seats.map((seat) =>
        seat?.kind === "human" && seat.participantId === event.participantId
          ? { ...seat, ready: event.ready }
          : seat,
      );
      lobby = { ...lobby, revision: event.revision, participants, seats };
      continue;
    }

    if (event.type === "DraftStarted") {
      const seats = [...lobby.seats];
      for (const botSeat of event.botSeats) seats[botSeat.seatId] = botSeat;
      lobby = {
        ...lobby,
        revision: event.revision,
        status: "drafting",
        activeSessionId: event.sessionId,
        seats,
      };
      continue;
    }

    if (
      event.type === "HumanPickSubmitted" ||
      event.type === "DraftRoundCommitted" ||
      event.type === "DraftCompleted" ||
      event.type === "SessionAbandoned" ||
      event.type === "DeckRecommendationUpdated" ||
      event.type === "DeckSelectionUpdated"
    ) {
      lobby = { ...lobby, revision: event.revision };
      continue;
    }

    const participant: Readonly<PublicParticipantView> = {
      participantId: event.participantId,
      displayName: event.displayName,
      seatId: event.seatId,
      ready: false,
      presence: "connected",
    };
    const seat: Readonly<PublicSeatView> = {
      seatId: event.seatId,
      kind: "human",
      participantId: event.participantId,
      displayName: event.displayName,
      ready: false,
      presence: "connected",
    };
    const seats = [...lobby.seats];
    seats[event.seatId] = seat;
    const participants = lobby.participants.map((existing) => ({ ...existing, ready: false }));
    const resetSeats = lobby.seats.map((existing) =>
      existing?.kind === "human" ? { ...existing, ready: false } : existing,
    );
    lobby = {
      ...lobby,
      revision: event.revision,
      participants: [...participants, participant],
      seats: seats.map((current, index) => resetSeats[index] ?? current),
    };
  }

  return lobby;
}
