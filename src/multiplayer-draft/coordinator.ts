import { createHash } from "node:crypto";

import { ALL_FRIEND_PROFILES } from "../bots/friends/profiles.ts";
import { createFriendBotPolicy } from "../bots/friends/friend-bot-policy.ts";
import {
  DRAFT_CONFIGURATION,
  getDraftView,
  replayDraft,
  startDraft,
  submitPickRound,
  type SeatDecision,
  type SeatPolicyDescriptor,
} from "../draft/index.ts";
import {
  RANDOM_SYSTEM_METADATA,
  deriveStreamSeed,
  getPolicyStreamName,
} from "../random/seeded-random.ts";
import {
  DEFAULT_BASIC_LANDS,
  evaluateDeck,
  type CardEvaluationInput,
  type MtGColor,
} from "../domain/coaching/index.ts";
import { createFinalDeckCoach } from "./final-deck-coach.ts";
import { generateMtgaExport } from "./mtga-export.ts";
import type {
  AbandonMultiplayerSessionCommand,
  ChangeCubeCommand,
  DeckWorkspace,
  FinalizeMultiplayerDeckCommand,
  JoinLobbyCommand,
  JoinLobbyResult,
  LeaveLobbyCommand,
  MultiplayerEvent,
  MultiplayerDraftCoordinator,
  MultiplayerDraftCoordinatorDependencies,
  MultiplayerResult,
  MultiplayerSeatId,
  PersistedMultiplayerSession,
  PersistedMultiplayerState,
  PlayerDraftView,
  PublicBotSeatView,
  PublicLobbyView,
  RecommendMultiplayerDeckCommand,
  RecommendedDeckWorkspace,
  SetReadyCommand,
  SubmitMultiplayerPickCommand,
} from "./types.ts";
import { replayLobbyEvents } from "./state-reducer.ts";

const EMPTY_SEATS: PublicLobbyView["seats"] = Object.freeze([
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
]);

const EMPTY_LOBBY: Readonly<PublicLobbyView> = Object.freeze({
  lobbyId: "global",
  generation: 0,
  revision: 0,
  status: "open",
  cubeKey: null,
  cubeLocked: false,
  activeSessionId: null,
  participants: Object.freeze([]),
  seats: EMPTY_SEATS,
});

const BASIC_LAND_NAMES = ["Plains", "Island", "Swamp", "Mountain", "Forest"] as const;
const BASIC_LAND_COLORS: Readonly<Record<(typeof BASIC_LAND_NAMES)[number], MtGColor>> = {
  Plains: "W",
  Island: "U",
  Swamp: "B",
  Mountain: "R",
  Forest: "G",
};

function findParticipantSession(
  persisted: Readonly<PersistedMultiplayerState>,
  participantId: string,
): Readonly<PersistedMultiplayerSession> | undefined {
  const sessions = Object.values(persisted.sessions ?? {});
  if (
    persisted.session &&
    !sessions.some(({ sessionId }) => sessionId === persisted.session?.sessionId)
  ) {
    sessions.push(persisted.session);
  }
  return sessions.find((session) =>
    session.seatAssignments.some(
      (seat) => seat.kind === "human" && seat.participantId === participantId,
    ),
  );
}

function getPoolSideboard(
  poolCardInstanceIds: readonly string[],
  maindeckCardInstanceIds: readonly string[],
): readonly string[] {
  const remaining = new Map<string, number>();
  for (const id of maindeckCardInstanceIds) {
    remaining.set(id, (remaining.get(id) ?? 0) + 1);
  }
  return poolCardInstanceIds.flatMap((id) => {
    const count = remaining.get(id) ?? 0;
    if (count > 0) {
      remaining.set(id, count - 1);
      return [];
    }
    return [id];
  });
}

function isModalLand(card: CardEvaluationInput): boolean {
  return (
    !card.isLand &&
    (/\/\/\s*(?:basic\s+)?land\b/i.test(card.typeLine ?? "") ||
      /\b(?:as|when) (?:this|that) land enters\b/i.test(card.oracleText ?? ""))
  );
}

function defaultCard(card: PlayerDraftView["pool"][number]): CardEvaluationInput {
  return {
    id: card.instanceId,
    name: card.name,
    colors: [],
    staticScore: 25,
    cmc: 3,
    typeLine: "Card",
    isLand: false,
    oracleId: card.oracleId,
  };
}

function defaultCardPool(
  cards: readonly PlayerDraftView["pool"][number][],
): readonly CardEvaluationInput[] {
  return cards.map(defaultCard);
}

function findParticipantByToken(
  persisted: Readonly<PersistedMultiplayerState> | null,
  resumeToken: string,
) {
  const tokenHash = createHash("sha256").update(resumeToken, "utf8").digest("hex");
  const joined = persisted?.events.find(
    (event) => event.type === "ParticipantJoined" && event.resumeTokenHash === tokenHash,
  );
  if (joined?.type !== "ParticipantJoined") return undefined;
  const lobbyParticipant = persisted?.lobby.participants.find(
    ({ participantId }) => participantId === joined.participantId,
  );
  if (lobbyParticipant) return { joined, participant: lobbyParticipant };
  const sessionSeat = Object.values(persisted?.sessions ?? {})
    .flatMap(({ seatAssignments }) => seatAssignments)
    .find((seat) => seat.kind === "human" && seat.participantId === joined.participantId);
  if (sessionSeat?.kind !== "human") return undefined;
  return {
    joined,
    participant: {
      participantId: sessionSeat.participantId,
      displayName: sessionSeat.displayName,
      seatId: sessionSeat.seatId,
      ready: true,
      presence: "connected" as const,
    },
  };
}

function buildPlayerDraftView(
  persisted: Readonly<PersistedMultiplayerState>,
  participantId: string,
): MultiplayerResult<PlayerDraftView> {
  const session = findParticipantSession(persisted, participantId);
  const participant = session?.seatAssignments.find(
    (seat) => seat.kind === "human" && seat.participantId === participantId,
  );
  if (!session || participant?.kind !== "human") {
    return {
      ok: false,
      error: {
        code: "INVALID_INPUT",
        message: "Aucune Session de draft active n'est associee a cet acces.",
        details: {},
      },
    };
  }
  const replayed = replayDraft(session.draftEvents);
  if (!replayed.ok) {
    return {
      ok: false,
      error: {
        code: "STORE_UNAVAILABLE",
        message: "La Session de draft ne peut pas etre reconstruite.",
        details: { engineCode: replayed.error.code },
      },
    };
  }
  const draftView = getDraftView(replayed.value);
  const seat = draftView.seats[participant.seatId];
  const pendingPicks = session.pendingRound?.humanPicks ?? {};
  const toCards = (ids: readonly string[]) =>
    ids.flatMap((instanceId) => {
      const card = draftView.cardsByInstanceId[instanceId];
      return card ? [card] : [];
    });
  return {
    ok: true,
    value: {
      revision: persisted.lobby.revision,
      sessionId: session.sessionId,
      status: session.status,
      participantId,
      seatId: participant.seatId,
      packNumber: draftView.packNumber,
      pickNumber: draftView.pickNumber,
      currentBooster: toCards(seat?.currentBooster?.remainingCardInstanceIds ?? []),
      pool: toCards(seat?.priorPool ?? []),
      pickSubmitted: pendingPicks[participantId] !== undefined,
      waitingFor: session.seatAssignments
        .filter(
          (candidate) =>
            candidate.kind === "human" && pendingPicks[candidate.participantId] === undefined,
        )
        .map(({ displayName }) => displayName),
      ...(session.deckWorkspaces?.[participantId]
        ? { deckWorkspace: session.deckWorkspaces[participantId] }
        : {}),
    },
  };
}

class DefaultMultiplayerDraftCoordinator implements MultiplayerDraftCoordinator {
  private readonly dependencies: MultiplayerDraftCoordinatorDependencies;

  public constructor(dependencies: MultiplayerDraftCoordinatorDependencies) {
    this.dependencies = dependencies;
  }

  public async getLobby(): Promise<MultiplayerResult<PublicLobbyView>> {
    try {
      const state = await this.dependencies.store.load();
      if (state === null) {
        return { ok: true, value: EMPTY_LOBBY };
      }
      return { ok: true, value: replayLobbyEvents(state.lobby, state.events) };
    } catch {
      return {
        ok: false,
        error: {
          code: "STORE_UNAVAILABLE",
          message: "Le Salon de draft est momentanement indisponible.",
          details: {},
        },
      };
    }
  }

  public async join(
    command: Readonly<JoinLobbyCommand>,
  ): Promise<MultiplayerResult<JoinLobbyResult>> {
    try {
      const persisted = await this.dependencies.store.load();
      const currentLobby =
        persisted === null ? EMPTY_LOBBY : replayLobbyEvents(persisted.lobby, persisted.events);
      const displayName = command.playerName.trim();
      const normalizedName = displayName.toLocaleLowerCase("fr");
      const priorJoin = persisted?.events.find(
        (event) => event.type === "ParticipantJoined" && event.requestId === command.requestId,
      );
      if (priorJoin?.type === "ParticipantJoined") {
        const firstLobbyEvent = persisted?.events.find(
          (event) => event.type === "LobbyOpened" && event.requestId === command.requestId,
        );
        const sameCommand =
          command.expectedRevision === priorJoin.revision - 1 &&
          normalizedName === priorJoin.normalizedName &&
          (firstLobbyEvent?.type !== "LobbyOpened" || firstLobbyEvent.cubeKey === command.cubeKey);
        if (!sameCommand) {
          return {
            ok: false,
            error: {
              code: "IDEMPOTENCY_CONFLICT",
              message: "Cet identifiant de commande a deja ete utilise avec un autre contenu.",
              details: { requestId: command.requestId },
            },
          };
        }
        return {
          ok: true,
          value: {
            participantId: priorJoin.participantId,
            resumeToken: this.dependencies.createResumeToken(command.requestId),
            state: currentLobby,
          },
        };
      }
      if (command.expectedRevision !== currentLobby.revision) {
        return {
          ok: false,
          error: {
            code: "REVISION_CONFLICT",
            message: "Le Salon de draft a change. Rechargez son etat.",
            details: { currentRevision: currentLobby.revision },
          },
        };
      }
      if (currentLobby.status !== "open") {
        return {
          ok: false,
          error: {
            code: "LOBBY_BUSY",
            message: "Un draft est deja en cours.",
            details: {},
          },
        };
      }
      if (currentLobby.participants.length >= 8) {
        return {
          ok: false,
          error: {
            code: "LOBBY_FULL",
            message: "Les huit sieges humains sont deja occupes.",
            details: { capacity: 8 },
          },
        };
      }
      if (displayName === "") {
        return {
          ok: false,
          error: {
            code: "INVALID_INPUT",
            message: "Le nom du participant est obligatoire.",
            details: { field: "playerName" },
          },
        };
      }
      if (currentLobby.participants.length === 0 && (command.cubeKey?.trim() ?? "") === "") {
        return {
          ok: false,
          error: {
            code: "INVALID_INPUT",
            message: "Le premier participant doit choisir un cube.",
            details: { field: "cubeKey" },
          },
        };
      }
      if (
        currentLobby.participants.length > 0 &&
        command.cubeKey !== undefined &&
        command.cubeKey !== currentLobby.cubeKey
      ) {
        return {
          ok: false,
          error: {
            code: "CUBE_LOCKED",
            message: "Le cube est verrouille pour ce Salon de draft.",
            details: { cubeKey: currentLobby.cubeKey },
          },
        };
      }
      if (
        currentLobby.participants.some(
          (participant) => participant.displayName.toLocaleLowerCase("fr") === normalizedName,
        )
      ) {
        return {
          ok: false,
          error: {
            code: "NAME_TAKEN",
            message: "Ce nom est deja utilise dans le Salon de draft.",
            details: { field: "playerName" },
          },
        };
      }
      const revision = currentLobby.revision + 1;
      const occurredAt = this.dependencies.now();
      const participantId = this.dependencies.createId();
      const resumeToken = this.dependencies.createResumeToken(command.requestId);
      const priorEvents = persisted?.events ?? [];
      const nextSequence = priorEvents.length + 1;
      const seatId = currentLobby.seats.findIndex((seat) => seat === null) as
        0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
      const common = {
        schemaVersion: 1 as const,
        revision,
        scopeId: "global",
        requestId: command.requestId,
        occurredAt,
      };
      const events: Readonly<MultiplayerEvent>[] = [];
      if (currentLobby.participants.length === 0) {
        events.push({
          ...common,
          sequence: nextSequence,
          type: "LobbyOpened",
          generation: currentLobby.generation + 1,
          cubeKey: command.cubeKey ?? "",
        });
      }
      events.push({
        ...common,
        sequence: nextSequence + events.length,
        type: "ParticipantJoined",
        participantId,
        displayName,
        normalizedName,
        resumeTokenHash: createHash("sha256").update(resumeToken, "utf8").digest("hex"),
        seatId,
      });
      if (currentLobby.participants.length === 1) {
        events.push({
          ...common,
          sequence: nextSequence + events.length,
          type: "CubeLocked",
        });
      }
      const allEvents = [...priorEvents, ...events];
      const nextLobby = replayLobbyEvents(currentLobby, events);
      const requestFingerprint = createHash("sha256")
        .update(
          JSON.stringify({
            expectedRevision: command.expectedRevision,
            playerName: normalizedName,
            cubeKey: command.cubeKey ?? null,
          }),
          "utf8",
        )
        .digest("hex");
      const commit = await this.dependencies.store.commit({
        expectedRevision: command.expectedRevision,
        requestId: command.requestId,
        requestFingerprint,
        participantId,
        appendedEvents: events,
        nextState: { ...(persisted ?? {}), lobby: nextLobby, events: allEvents },
      });
      if (!commit.ok) {
        if (commit.error.code === "REVISION_CONFLICT") {
          const latest = await this.dependencies.store.load();
          const committedJoin = latest?.events.find(
            (event) => event.type === "ParticipantJoined" && event.requestId === command.requestId,
          );
          const committedOpen = latest?.events.find(
            (event) => event.type === "LobbyOpened" && event.requestId === command.requestId,
          );
          if (
            latest !== null &&
            committedJoin?.type === "ParticipantJoined" &&
            committedJoin.normalizedName === normalizedName &&
            command.expectedRevision === committedJoin.revision - 1 &&
            (committedOpen?.type !== "LobbyOpened" || committedOpen.cubeKey === command.cubeKey)
          ) {
            return {
              ok: true,
              value: {
                participantId: committedJoin.participantId,
                resumeToken: this.dependencies.createResumeToken(command.requestId),
                state: replayLobbyEvents(latest.lobby, latest.events),
              },
            };
          }
        }
        return commit;
      }
      return {
        ok: true,
        value: {
          participantId,
          resumeToken,
          state: replayLobbyEvents(commit.value.lobby, commit.value.events),
        },
      };
    } catch {
      return {
        ok: false,
        error: {
          code: "STORE_UNAVAILABLE",
          message: "Le Salon de draft est momentanement indisponible.",
          details: {},
        },
      };
    }
  }

  public async changeCube(
    command: Readonly<ChangeCubeCommand>,
  ): Promise<MultiplayerResult<PublicLobbyView>> {
    try {
      const persisted = await this.dependencies.store.load();
      const lobby =
        persisted === null ? EMPTY_LOBBY : replayLobbyEvents(persisted.lobby, persisted.events);
      const tokenHash = createHash("sha256").update(command.resumeToken, "utf8").digest("hex");
      const participant = persisted?.events.find(
        (event) => event.type === "ParticipantJoined" && event.resumeTokenHash === tokenHash,
      );
      if (participant?.type !== "ParticipantJoined") {
        return {
          ok: false,
          error: {
            code: "INVALID_RESUME_TOKEN",
            message: "L'Acces de reprise est invalide.",
            details: {},
          },
        };
      }
      if (command.expectedRevision !== lobby.revision) {
        return {
          ok: false,
          error: {
            code: "REVISION_CONFLICT",
            message: "Le Salon de draft a change. Rechargez son etat.",
            details: { currentRevision: lobby.revision },
          },
        };
      }
      if (lobby.cubeLocked || lobby.participants.length !== 1) {
        return {
          ok: false,
          error: {
            code: "CUBE_LOCKED",
            message: "Le cube est verrouille pour ce Salon de draft.",
            details: { cubeKey: lobby.cubeKey },
          },
        };
      }
      const cubeKey = command.cubeKey.trim();
      if (cubeKey === "") {
        return {
          ok: false,
          error: {
            code: "INVALID_INPUT",
            message: "Le cube est obligatoire.",
            details: { field: "cubeKey" },
          },
        };
      }
      const event: Readonly<MultiplayerEvent> = {
        schemaVersion: 1,
        sequence: (persisted?.events.length ?? 0) + 1,
        revision: lobby.revision + 1,
        scopeId: "global",
        requestId: command.requestId,
        occurredAt: this.dependencies.now(),
        type: "CubeChanged",
        cubeKey,
        participantId: participant.participantId,
      };
      const nextLobby = replayLobbyEvents(lobby, [event]);
      const requestFingerprint = createHash("sha256")
        .update(JSON.stringify({ expectedRevision: command.expectedRevision, cubeKey }), "utf8")
        .digest("hex");
      const commit = await this.dependencies.store.commit({
        expectedRevision: command.expectedRevision,
        requestId: command.requestId,
        requestFingerprint,
        participantId: participant.participantId,
        appendedEvents: [event],
        nextState: {
          ...(persisted ?? {}),
          lobby: nextLobby,
          events: [...(persisted?.events ?? []), event],
        },
      });
      if (!commit.ok) {
        return commit;
      }
      return { ok: true, value: replayLobbyEvents(commit.value.lobby, commit.value.events) };
    } catch {
      return {
        ok: false,
        error: {
          code: "STORE_UNAVAILABLE",
          message: "Le Salon de draft est momentanement indisponible.",
          details: {},
        },
      };
    }
  }

  public async leave(
    command: Readonly<LeaveLobbyCommand>,
  ): Promise<MultiplayerResult<PublicLobbyView>> {
    try {
      const persisted = await this.dependencies.store.load();
      const lobby =
        persisted === null ? EMPTY_LOBBY : replayLobbyEvents(persisted.lobby, persisted.events);
      const tokenHash = createHash("sha256").update(command.resumeToken, "utf8").digest("hex");
      const participant = persisted?.events.find(
        (event) => event.type === "ParticipantJoined" && event.resumeTokenHash === tokenHash,
      );
      if (participant?.type !== "ParticipantJoined") {
        return {
          ok: false,
          error: {
            code: "INVALID_RESUME_TOKEN",
            message: "L'Acces de reprise est invalide.",
            details: {},
          },
        };
      }
      const priorLeave = persisted?.events.find(
        (event) => event.type === "ParticipantLeft" && event.requestId === command.requestId,
      );
      if (priorLeave?.type === "ParticipantLeft") {
        if (
          priorLeave.participantId !== participant.participantId ||
          priorLeave.revision - 1 !== command.expectedRevision
        ) {
          return {
            ok: false,
            error: {
              code: "IDEMPOTENCY_CONFLICT",
              message: "Cet identifiant de commande a deja ete utilise avec un autre contenu.",
              details: { requestId: command.requestId },
            },
          };
        }
        return { ok: true, value: lobby };
      }
      if (command.expectedRevision !== lobby.revision) {
        return {
          ok: false,
          error: {
            code: "REVISION_CONFLICT",
            message: "Le Salon de draft a change. Rechargez son etat.",
            details: { currentRevision: lobby.revision },
          },
        };
      }
      if (lobby.status !== "open") {
        return {
          ok: false,
          error: {
            code: "LOBBY_BUSY",
            message: "Le draft a deja commence ; le siege reste reserve.",
            details: {},
          },
        };
      }
      if (
        !lobby.participants.some(({ participantId }) => participantId === participant.participantId)
      ) {
        return {
          ok: false,
          error: {
            code: "INVALID_RESUME_TOKEN",
            message: "L'Acces de reprise est invalide.",
            details: {},
          },
        };
      }
      const revision = lobby.revision + 1;
      const baseSequence = (persisted?.events.length ?? 0) + 1;
      const common = {
        schemaVersion: 1 as const,
        revision,
        scopeId: "global",
        requestId: command.requestId,
        occurredAt: this.dependencies.now(),
      };
      const events: Readonly<MultiplayerEvent>[] = [
        {
          ...common,
          sequence: baseSequence,
          type: "ParticipantLeft",
          participantId: participant.participantId,
        },
      ];
      if (lobby.participants.length === 1) {
        events.push({
          ...common,
          sequence: baseSequence + 1,
          type: "LobbyEmptied",
        });
      }
      const nextLobby = replayLobbyEvents(lobby, events);
      const requestFingerprint = createHash("sha256")
        .update(JSON.stringify({ expectedRevision: command.expectedRevision }), "utf8")
        .digest("hex");
      const commit = await this.dependencies.store.commit({
        expectedRevision: command.expectedRevision,
        requestId: command.requestId,
        requestFingerprint,
        participantId: participant.participantId,
        appendedEvents: events,
        nextState: {
          ...(persisted ?? {}),
          lobby: nextLobby,
          events: [...(persisted?.events ?? []), ...events],
        },
      });
      if (!commit.ok) {
        return commit;
      }
      return { ok: true, value: replayLobbyEvents(commit.value.lobby, commit.value.events) };
    } catch {
      return {
        ok: false,
        error: {
          code: "STORE_UNAVAILABLE",
          message: "Le Salon de draft est momentanement indisponible.",
          details: {},
        },
      };
    }
  }

  public async setReady(
    command: Readonly<SetReadyCommand>,
  ): Promise<MultiplayerResult<PublicLobbyView>> {
    try {
      const persisted = await this.dependencies.store.load();
      const lobby =
        persisted === null ? EMPTY_LOBBY : replayLobbyEvents(persisted.lobby, persisted.events);
      const tokenHash = createHash("sha256").update(command.resumeToken, "utf8").digest("hex");
      const participant = persisted?.events.find(
        (event) => event.type === "ParticipantJoined" && event.resumeTokenHash === tokenHash,
      );
      if (
        participant?.type !== "ParticipantJoined" ||
        !lobby.participants.some(({ participantId }) => participantId === participant.participantId)
      ) {
        return {
          ok: false,
          error: {
            code: "INVALID_RESUME_TOKEN",
            message: "L'Acces de reprise est invalide.",
            details: {},
          },
        };
      }
      const priorReady = persisted?.events.find(
        (event) => event.type === "ReadyChanged" && event.requestId === command.requestId,
      );
      if (priorReady?.type === "ReadyChanged") {
        if (
          priorReady.participantId !== participant.participantId ||
          priorReady.ready !== command.ready ||
          priorReady.revision - 1 !== command.expectedRevision
        ) {
          return {
            ok: false,
            error: {
              code: "IDEMPOTENCY_CONFLICT",
              message: "Cet identifiant de commande a deja ete utilise avec un autre contenu.",
              details: { requestId: command.requestId },
            },
          };
        }
        return { ok: true, value: lobby };
      }
      if (command.expectedRevision !== lobby.revision) {
        return {
          ok: false,
          error: {
            code: "REVISION_CONFLICT",
            message: "Le Salon de draft a change. Rechargez son etat.",
            details: { currentRevision: lobby.revision },
          },
        };
      }
      if (command.ready && lobby.participants.length < 2) {
        return {
          ok: false,
          error: {
            code: "NOT_ENOUGH_PLAYERS",
            message: "Au moins deux amis sont necessaires pour demarrer le draft.",
            details: { participantCount: lobby.participants.length },
          },
        };
      }
      const readyEvent: Readonly<MultiplayerEvent> = {
        schemaVersion: 1,
        sequence: (persisted?.events.length ?? 0) + 1,
        revision: lobby.revision + 1,
        scopeId: "global",
        requestId: command.requestId,
        occurredAt: this.dependencies.now(),
        type: "ReadyChanged",
        participantId: participant.participantId,
        ready: command.ready,
      };
      let appendedEvents: readonly Readonly<MultiplayerEvent>[] = [readyEvent];
      let nextLobby = replayLobbyEvents(lobby, appendedEvents);
      let session = persisted?.session ?? null;
      if (
        command.ready &&
        nextLobby.participants.length >= 2 &&
        nextLobby.participants.every(({ ready }) => ready)
      ) {
        if (!this.dependencies.loadSnapshot || !nextLobby.cubeKey) {
          return {
            ok: false,
            error: {
              code: "STORE_UNAVAILABLE",
              message: "Le Snapshot du cube est momentanement indisponible.",
              details: {},
            },
          };
        }
        const snapshot = await this.dependencies.loadSnapshot(nextLobby.cubeKey);
        const sessionEntropy = `${String(nextLobby.generation)}:${readyEvent.occurredAt}:${command.requestId}`;
        const sessionId =
          this.dependencies.createSessionId?.() ??
          createHash("sha256").update(sessionEntropy, "utf8").digest("hex").slice(0, 12);
        const seed =
          this.dependencies.createSeed?.() ??
          createHash("sha256").update(sessionEntropy, "utf8").digest().readInt32BE(0);
        let botIndex = 0;
        const botSeats: Readonly<PublicBotSeatView>[] = nextLobby.seats.flatMap(
          (seat, seatIndex) => {
            if (seat !== null) return [];
            const profile = ALL_FRIEND_PROFILES[botIndex++];
            if (!profile) return [];
            return [
              {
                seatId: seatIndex as MultiplayerSeatId,
                kind: "bot" as const,
                botId: profile.id,
                policyId: `friend:${profile.id}`,
                policyVersion: "1",
                displayName: profile.botName ?? profile.name,
                ready: null,
                presence: null,
              },
            ];
          },
        );
        const seatAssignments = nextLobby.seats.map(
          (seat, seatIndex) => seat ?? botSeats.find(({ seatId }) => seatId === seatIndex) ?? null,
        );
        if (seatAssignments.some((seat) => seat === null)) {
          return {
            ok: false,
            error: {
              code: "INVALID_INPUT",
              message: "La composition de table ne peut pas etre completee.",
              details: {},
            },
          };
        }
        const seatPolicies: Readonly<SeatPolicyDescriptor>[] = seatAssignments.map(
          (seat, seatIndex) => ({
            seatId: seatIndex as MultiplayerSeatId,
            policyId:
              seat?.kind === "bot" ? seat.policyId : `human:${seat?.participantId ?? "unknown"}`,
            policyVersion: seat?.kind === "bot" ? seat.policyVersion : "1",
          }),
        );
        const engineVersion = "draft-engine@1.0.0";
        const draftStart = startDraft({
          snapshot,
          sessionId,
          seed,
          startedAt: readyEvent.occurredAt,
          engineVersion,
          randomSystem: RANDOM_SYSTEM_METADATA,
          seatPolicies,
          configuration: DRAFT_CONFIGURATION,
        });
        if (!draftStart.ok) {
          return {
            ok: false,
            error: {
              code: "INVALID_INPUT",
              message: "Le moteur de draft a refuse le demarrage.",
              details: { engineCode: draftStart.error.code },
            },
          };
        }
        const startedEvent: Readonly<MultiplayerEvent> = {
          schemaVersion: 1,
          sequence: readyEvent.sequence + 1,
          revision: readyEvent.revision,
          scopeId: "global",
          requestId: command.requestId,
          occurredAt: readyEvent.occurredAt,
          type: "DraftStarted",
          sessionId,
          botSeats,
        };
        appendedEvents = [readyEvent, startedEvent];
        nextLobby = replayLobbyEvents(lobby, appendedEvents);
        session = {
          sessionId,
          lobbyGeneration: nextLobby.generation,
          revision: 0,
          status: "drafting",
          cubeKey: nextLobby.cubeKey ?? snapshot.cubeKey,
          snapshotId: snapshot.snapshotId,
          snapshotSha256: snapshot.integrity.canonicalSha256,
          seed,
          engineVersion,
          seatAssignments: seatAssignments as PersistedMultiplayerSession["seatAssignments"],
          draftEvents: draftStart.value.appendedEvents,
          pendingRound: null,
          startedAt: readyEvent.occurredAt,
        };
      }
      const requestFingerprint = createHash("sha256")
        .update(
          JSON.stringify({ expectedRevision: command.expectedRevision, ready: command.ready }),
          "utf8",
        )
        .digest("hex");
      const commit = await this.dependencies.store.commit({
        expectedRevision: command.expectedRevision,
        requestId: command.requestId,
        requestFingerprint,
        participantId: participant.participantId,
        appendedEvents,
        nextState: {
          ...(persisted ?? {}),
          lobby: nextLobby,
          events: [...(persisted?.events ?? []), ...appendedEvents],
          session,
          ...(session
            ? { sessions: { ...(persisted?.sessions ?? {}), [session.sessionId]: session } }
            : {}),
        },
      });
      if (!commit.ok) {
        if (commit.error.code === "REVISION_CONFLICT") {
          const latest = await this.dependencies.store.load();
          const committedReady = latest?.events.find(
            (candidate) =>
              candidate.type === "ReadyChanged" && candidate.requestId === command.requestId,
          );
          if (
            committedReady?.type === "ReadyChanged" &&
            committedReady.participantId === participant.participantId &&
            committedReady.ready === command.ready &&
            committedReady.revision - 1 === command.expectedRevision
          ) {
            return {
              ok: true,
              value: replayLobbyEvents(latest?.lobby ?? lobby, latest?.events ?? []),
            };
          }
        }
        return commit;
      }
      return { ok: true, value: replayLobbyEvents(commit.value.lobby, commit.value.events) };
    } catch {
      return {
        ok: false,
        error: {
          code: "STORE_UNAVAILABLE",
          message: "Le Salon de draft est momentanement indisponible.",
          details: {},
        },
      };
    }
  }

  public async getPlayerState(resumeToken: string): Promise<MultiplayerResult<PlayerDraftView>> {
    try {
      const persisted = await this.dependencies.store.load();
      const authenticated = findParticipantByToken(persisted, resumeToken);
      if (!persisted || !authenticated) {
        return {
          ok: false,
          error: {
            code: "INVALID_RESUME_TOKEN",
            message: "L'Acces de reprise est invalide.",
            details: {},
          },
        };
      }
      return buildPlayerDraftView(persisted, authenticated.participant.participantId);
    } catch {
      return {
        ok: false,
        error: {
          code: "STORE_UNAVAILABLE",
          message: "La Session de draft est momentanement indisponible.",
          details: {},
        },
      };
    }
  }

  public async submitPick(
    command: Readonly<SubmitMultiplayerPickCommand>,
  ): Promise<MultiplayerResult<PlayerDraftView>> {
    try {
      const persisted = await this.dependencies.store.load();
      const authenticated = findParticipantByToken(persisted, command.resumeToken);
      if (!persisted || !authenticated) {
        return {
          ok: false,
          error: {
            code: "INVALID_RESUME_TOKEN",
            message: "L'Acces de reprise est invalide.",
            details: {},
          },
        };
      }
      const lobby = replayLobbyEvents(persisted.lobby, persisted.events);
      const priorPickEvent = persisted.events.find(
        (event) => event.type === "HumanPickSubmitted" && event.requestId === command.requestId,
      );
      if (priorPickEvent?.type === "HumanPickSubmitted") {
        if (
          priorPickEvent.participantId !== authenticated.participant.participantId ||
          priorPickEvent.cardInstanceId !== command.cardInstanceId ||
          priorPickEvent.packNumber !== command.packNumber ||
          priorPickEvent.pickNumber !== command.pickNumber ||
          priorPickEvent.revision - 1 !== command.expectedRevision
        ) {
          return {
            ok: false,
            error: {
              code: "IDEMPOTENCY_CONFLICT",
              message: "Cet identifiant de commande a deja ete utilise avec un autre contenu.",
              details: { requestId: command.requestId },
            },
          };
        }
        return buildPlayerDraftView(persisted, authenticated.participant.participantId);
      }
      if (command.expectedRevision !== lobby.revision) {
        return {
          ok: false,
          error: {
            code: "REVISION_CONFLICT",
            message: "La Session de draft a change. Rechargez son etat.",
            details: { currentRevision: lobby.revision },
          },
        };
      }
      const session =
        (lobby.activeSessionId ? persisted.sessions?.[lobby.activeSessionId] : undefined) ??
        persisted.session;
      if (session?.status === "abandoned") {
        return {
          ok: false,
          error: {
            code: "SESSION_ABANDONED",
            message: "Cette Session a ete abandonnee et ne peut plus recevoir de choix.",
            details: {},
          },
        };
      }
      if (!session || lobby.status !== "drafting") {
        return {
          ok: false,
          error: {
            code: "LOBBY_BUSY",
            message: "Aucune Session de draft n'est disponible pour ce choix.",
            details: {},
          },
        };
      }
      const replayed = replayDraft(session.draftEvents);
      if (!replayed.ok) {
        return {
          ok: false,
          error: {
            code: "STORE_UNAVAILABLE",
            message: "La Session de draft ne peut pas etre reconstruite.",
            details: { engineCode: replayed.error.code },
          },
        };
      }
      const draftView = getDraftView(replayed.value);
      if (
        draftView.packNumber !== command.packNumber ||
        draftView.pickNumber !== command.pickNumber
      ) {
        return {
          ok: false,
          error: {
            code: "REVISION_CONFLICT",
            message: "Ce Tour de draft n'est plus actif.",
            details: { packNumber: draftView.packNumber, pickNumber: draftView.pickNumber },
          },
        };
      }
      const participantId = authenticated.participant.participantId;
      const priorPick = session.pendingRound?.humanPicks[participantId];
      if (priorPick !== undefined) {
        return {
          ok: false,
          error: {
            code: "PICK_ALREADY_COMMITTED",
            message: "Votre choix pour ce Tour est deja confirme.",
            details: {},
          },
        };
      }
      const seatView = draftView.seats[authenticated.participant.seatId];
      if (!seatView?.currentBooster?.remainingCardInstanceIds.includes(command.cardInstanceId)) {
        return {
          ok: false,
          error: {
            code: "CARD_NOT_IN_BOOSTER",
            message: "Cette carte n'appartient pas a votre booster courant.",
            details: {},
          },
        };
      }
      const event: Readonly<MultiplayerEvent> = {
        schemaVersion: 1,
        sequence: persisted.events.length + 1,
        revision: lobby.revision + 1,
        scopeId: session.sessionId,
        requestId: command.requestId,
        occurredAt: this.dependencies.now(),
        type: "HumanPickSubmitted",
        participantId,
        cardInstanceId: command.cardInstanceId,
        packNumber: command.packNumber,
        pickNumber: command.pickNumber,
      };
      const humanPicks = {
        ...(session.pendingRound?.humanPicks ?? {}),
        [participantId]: command.cardInstanceId,
      };
      const pendingRound = {
        packNumber: command.packNumber,
        pickNumber: command.pickNumber,
        expectedDraftRevision: draftView.revision,
        humanPicks,
      };
      let appendedEvents: readonly Readonly<MultiplayerEvent>[] = [event];
      let nextSession: Readonly<PersistedMultiplayerSession> = { ...session, pendingRound };
      if (lobby.participants.every((participant) => humanPicks[participant.participantId])) {
        const coachContext = this.dependencies.loadCoachContext
          ? await this.dependencies.loadCoachContext(session.cubeKey)
          : undefined;
        if (coachContext && coachContext.snapshotId !== session.snapshotId) {
          throw new Error("COACH_CONTEXT_SNAPSHOT_MISMATCH");
        }
        const draftCards = Object.values(draftView.cardsByInstanceId);
        const resolvedCards = this.dependencies.loadCardPool
          ? await this.dependencies.loadCardPool(session.cubeKey, draftCards)
          : defaultCardPool(draftCards);
        const resolvedById = new Map(resolvedCards.map((card) => [card.id, card]));
        const resolveCard = (instanceId: string): CardEvaluationInput | undefined =>
          resolvedById.get(instanceId);
        const evaluationContext = coachContext
          ? {
              cubeKey: coachContext.cubeKey,
              catalog: coachContext.catalog,
              cubeMeta: coachContext.cubeMeta,
              synergyProfile: coachContext.synergyProfile,
            }
          : undefined;
        const decisions: Readonly<SeatDecision>[] = session.seatAssignments.map((seat) => {
          if (seat.kind === "human") {
            const cardInstanceId = humanPicks[seat.participantId];
            if (!cardInstanceId) throw new Error("MISSING_HUMAN_PICK");
            return {
              seatId: seat.seatId,
              cardInstanceId,
              source:
                seat.seatId === 0
                  ? { kind: "caller" as const }
                  : {
                      kind: "policy" as const,
                      policyId: `human:${seat.participantId}`,
                      policyVersion: "1",
                    },
            };
          }
          const profile = ALL_FRIEND_PROFILES.find(({ id }) => id === seat.botId);
          if (!profile) throw new Error("MISSING_BOT_PROFILE");
          const policy = createFriendBotPolicy({
            profile,
            resolveCard,
            ...(evaluationContext ? { evaluationContext } : {}),
          });
          const botDraftSeat = draftView.seats[seat.seatId];
          if (!botDraftSeat?.currentBooster) throw new Error("MISSING_BOT_BOOSTER");
          const streamName = getPolicyStreamName(seat.seatId);
          const choice = policy.choose({
            derivedSeed: deriveStreamSeed(session.seed, streamName),
            streamName,
            seatId: seat.seatId,
            packNumber: draftView.packNumber,
            pickNumber: draftView.pickNumber,
            currentBooster: botDraftSeat.currentBooster.remainingCardInstanceIds,
            priorPool: botDraftSeat.priorPool,
          });
          if (!choice.ok) throw new Error("BOT_POLICY_FAILED");
          return {
            seatId: seat.seatId,
            cardInstanceId: choice.value.cardInstanceId,
            source: {
              kind: "policy" as const,
              policyId: policy.id,
              policyVersion: policy.version,
            },
          };
        });
        const round = submitPickRound(replayed.value, {
          sessionId: session.sessionId,
          expectedRevision: draftView.revision,
          packNumber: draftView.packNumber,
          pickNumber: draftView.pickNumber,
          occurredAt: event.occurredAt,
          decisions,
        });
        if (!round.ok) {
          return {
            ok: false,
            error: {
              code: "INVALID_INPUT",
              message: "Le moteur de draft a refuse les choix du Tour.",
              details: { engineCode: round.error.code },
            },
          };
        }
        const committedDraftView = getDraftView(round.value.draft);
        const roundEvent: Readonly<MultiplayerEvent> = {
          schemaVersion: 1,
          sequence: event.sequence + 1,
          revision: event.revision,
          scopeId: session.sessionId,
          requestId: command.requestId,
          occurredAt: event.occurredAt,
          type: "DraftRoundCommitted",
          packNumber: command.packNumber,
          pickNumber: command.pickNumber,
          draftRevision: committedDraftView.revision,
        };
        appendedEvents = [event, roundEvent];
        nextSession = {
          ...session,
          revision: committedDraftView.revision,
          status: committedDraftView.status === "completed" ? "deckbuilding" : "drafting",
          draftEvents: [...session.draftEvents, ...round.value.appendedEvents],
          pendingRound: null,
        };
        if (committedDraftView.status === "completed") {
          const completedEvent: Readonly<MultiplayerEvent> = {
            schemaVersion: 1,
            sequence: roundEvent.sequence + 1,
            revision: event.revision,
            scopeId: session.sessionId,
            requestId: command.requestId,
            occurredAt: event.occurredAt,
            type: "DraftCompleted",
            sessionId: session.sessionId,
          };
          const emptiedEvent: Readonly<MultiplayerEvent> = {
            schemaVersion: 1,
            sequence: roundEvent.sequence + 2,
            revision: event.revision,
            scopeId: "global",
            requestId: command.requestId,
            occurredAt: event.occurredAt,
            type: "LobbyEmptied",
          };
          appendedEvents = [event, roundEvent, completedEvent, emptiedEvent];
        }
      }
      const nextLobby = replayLobbyEvents(lobby, appendedEvents);
      const nextState: Readonly<PersistedMultiplayerState> = {
        lobby: nextLobby,
        events: [...persisted.events, ...appendedEvents],
        session: nextSession,
        sessions: { ...(persisted.sessions ?? {}), [nextSession.sessionId]: nextSession },
      };
      const requestFingerprint = createHash("sha256")
        .update(
          JSON.stringify({
            expectedRevision: command.expectedRevision,
            packNumber: command.packNumber,
            pickNumber: command.pickNumber,
            cardInstanceId: command.cardInstanceId,
          }),
          "utf8",
        )
        .digest("hex");
      const commit = await this.dependencies.store.commit({
        expectedRevision: command.expectedRevision,
        requestId: command.requestId,
        requestFingerprint,
        participantId,
        appendedEvents,
        nextState,
      });
      if (!commit.ok) return commit;
      return buildPlayerDraftView(commit.value, participantId);
    } catch {
      return {
        ok: false,
        error: {
          code: "STORE_UNAVAILABLE",
          message: "La Session de draft est momentanement indisponible.",
          details: {},
        },
      };
    }
  }

  public async recommendDeck(
    command: Readonly<RecommendMultiplayerDeckCommand>,
  ): Promise<MultiplayerResult<RecommendedDeckWorkspace>> {
    try {
      const persisted = await this.dependencies.store.load();
      const authenticated = findParticipantByToken(persisted, command.resumeToken);
      if (!persisted || !authenticated) {
        return {
          ok: false,
          error: {
            code: "INVALID_RESUME_TOKEN",
            message: "L'Acces de reprise est invalide.",
            details: {},
          },
        };
      }
      const lobby = replayLobbyEvents(persisted.lobby, persisted.events);
      if (command.expectedRevision !== lobby.revision) {
        return {
          ok: false,
          error: {
            code: "REVISION_CONFLICT",
            message: "Le deckbuilding a change. Rechargez son etat.",
            details: { currentRevision: lobby.revision },
          },
        };
      }
      const participantId = authenticated.participant.participantId;
      const session = findParticipantSession(persisted, participantId);
      if (session?.status !== "deckbuilding") {
        return {
          ok: false,
          error: {
            code: "DECK_NOT_READY",
            message: "Le Coach final est disponible apres les 45 choix.",
            details: {},
          },
        };
      }
      const replayed = replayDraft(session.draftEvents);
      if (!replayed.ok) {
        return {
          ok: false,
          error: {
            code: "STORE_UNAVAILABLE",
            message: "La Session de draft ne peut pas etre reconstruite.",
            details: { engineCode: replayed.error.code },
          },
        };
      }
      const draftView = getDraftView(replayed.value);
      const seat = draftView.seats[authenticated.participant.seatId];
      const poolCardInstanceIds = seat?.priorPool ?? [];
      const poolCards = poolCardInstanceIds.flatMap((id) => {
        const card = draftView.cardsByInstanceId[id];
        return card ? [card] : [];
      });
      const loadedPool = this.dependencies.loadCardPool
        ? await this.dependencies.loadCardPool(session.cubeKey, poolCards)
        : defaultCardPool(poolCards);
      const loadedById = new Map(loadedPool.map((card) => [card.id, card]));
      const pool = poolCards.map(
        (card) =>
          loadedById.get(card.instanceId) ?? {
            id: card.instanceId,
            name: card.name,
            colors: [],
            staticScore: 25,
            cmc: 3,
            typeLine: "Card",
            isLand: false,
            oracleId: card.oracleId,
          },
      );
      const coach = this.dependencies.finalDeckCoach ?? createFinalDeckCoach();
      const coachContext = this.dependencies.loadCoachContext
        ? await this.dependencies.loadCoachContext(session.cubeKey)
        : undefined;
      if (coachContext && coachContext.snapshotId !== session.snapshotId) {
        throw new Error("COACH_CONTEXT_SNAPSHOT_MISMATCH");
      }
      const recommendation = await coach.recommend({
        cubeKey: session.cubeKey,
        snapshotId: session.snapshotId,
        pool,
        ...(coachContext ? { evaluationOptions: coachContext.deckEvaluationOptions } : {}),
      });
      const existing = session.deckWorkspaces?.[participantId];
      const workspace: Readonly<RecommendedDeckWorkspace> = {
        participantId,
        sessionId: session.sessionId,
        revision: (existing?.revision ?? 0) + 1,
        status: "editing",
        poolCardInstanceIds,
        maindeckCardInstanceIds: recommendation.maindeckCardInstanceIds,
        basicLands: recommendation.basicLands,
        sideboardCardInstanceIds: recommendation.sideboardCardInstanceIds,
        recommendation,
        evaluation: recommendation.evaluation,
      };
      const event: Readonly<MultiplayerEvent> = {
        schemaVersion: 1,
        sequence: persisted.events.length + 1,
        revision: lobby.revision + 1,
        scopeId: session.sessionId,
        requestId: command.requestId,
        occurredAt: this.dependencies.now(),
        type: "DeckRecommendationUpdated",
        sessionId: session.sessionId,
        participantId,
      };
      const nextSession: Readonly<PersistedMultiplayerSession> = {
        ...session,
        deckWorkspaces: {
          ...(session.deckWorkspaces ?? {}),
          [participantId]: workspace,
        },
      };
      const nextState: Readonly<PersistedMultiplayerState> = {
        ...persisted,
        lobby: replayLobbyEvents(lobby, [event]),
        events: [...persisted.events, event],
        ...(persisted.session?.sessionId === session.sessionId ? { session: nextSession } : {}),
        sessions: { ...(persisted.sessions ?? {}), [session.sessionId]: nextSession },
      };
      const commit = await this.dependencies.store.commit({
        expectedRevision: command.expectedRevision,
        requestId: command.requestId,
        requestFingerprint: createHash("sha256")
          .update(JSON.stringify({ expectedRevision: command.expectedRevision }), "utf8")
          .digest("hex"),
        participantId,
        appendedEvents: [event],
        nextState,
      });
      if (!commit.ok) return commit;
      return { ok: true, value: workspace };
    } catch {
      return {
        ok: false,
        error: {
          code: "STORE_UNAVAILABLE",
          message: "Le Coach final est momentanement indisponible.",
          details: {},
        },
      };
    }
  }

  public async finalizeDeck(
    command: Readonly<FinalizeMultiplayerDeckCommand>,
  ): Promise<MultiplayerResult<DeckWorkspace>> {
    try {
      const persisted = await this.dependencies.store.load();
      const authenticated = findParticipantByToken(persisted, command.resumeToken);
      if (!persisted || !authenticated) {
        return {
          ok: false,
          error: {
            code: "INVALID_RESUME_TOKEN",
            message: "L'Acces de reprise est invalide.",
            details: {},
          },
        };
      }
      const lobby = replayLobbyEvents(persisted.lobby, persisted.events);
      if (command.expectedRevision !== lobby.revision) {
        return {
          ok: false,
          error: {
            code: "REVISION_CONFLICT",
            message: "Le deckbuilding a change. Rechargez son etat.",
            details: { currentRevision: lobby.revision },
          },
        };
      }
      const participantId = authenticated.participant.participantId;
      const session = findParticipantSession(persisted, participantId);
      if (session?.status !== "deckbuilding") {
        return {
          ok: false,
          error: {
            code: "DECK_NOT_READY",
            message: "Le deckbuilding est disponible apres les 45 choix.",
            details: {},
          },
        };
      }
      const replayed = replayDraft(session.draftEvents);
      if (!replayed.ok) throw new Error(replayed.error.message);
      const draftView = getDraftView(replayed.value);
      const seat = draftView.seats[authenticated.participant.seatId];
      const poolCardInstanceIds = seat?.priorPool ?? [];
      const available = new Map<string, number>();
      for (const id of poolCardInstanceIds) available.set(id, (available.get(id) ?? 0) + 1);
      for (const id of command.maindeckCardInstanceIds) {
        const count = available.get(id) ?? 0;
        if (count <= 0) {
          return {
            ok: false,
            error: {
              code: "INVALID_DECK",
              message: "La selection contient une carte absente du pool ou en trop d'exemplaires.",
              details: { cardInstanceId: id },
            },
          };
        }
        available.set(id, count - 1);
      }
      if (
        BASIC_LAND_NAMES.some(
          (name) => !Number.isInteger(command.basicLands[name]) || command.basicLands[name] < 0,
        )
      ) {
        return {
          ok: false,
          error: {
            code: "INVALID_DECK",
            message: "Les quantites de terrains basiques sont invalides.",
            details: {},
          },
        };
      }
      const basicCount = BASIC_LAND_NAMES.reduce((sum, name) => sum + command.basicLands[name], 0);
      const totalCount = command.maindeckCardInstanceIds.length + basicCount;
      if ((command.finalize && totalCount !== 40) || totalCount > 40) {
        return {
          ok: false,
          error: {
            code: "INVALID_DECK",
            message: "Une Liste finale doit contenir exactement 40 cartes.",
            details: { totalCount },
          },
        };
      }
      const poolCards = poolCardInstanceIds.flatMap((id) => {
        const card = draftView.cardsByInstanceId[id];
        return card ? [card] : [];
      });
      const loadedPool = this.dependencies.loadCardPool
        ? await this.dependencies.loadCardPool(session.cubeKey, poolCards)
        : defaultCardPool(poolCards);
      const loadedById = new Map(loadedPool.map((card) => [card.id, card]));
      const pool = poolCards.map((card) => loadedById.get(card.instanceId) ?? defaultCard(card));
      const selectedCards = command.maindeckCardInstanceIds.flatMap((id) => {
        const card = pool.find((candidate) => candidate.id === id);
        return card ? [card] : [];
      });
      const landCount =
        basicCount +
        selectedCards.filter((card) => (card.isLand ?? false) || isModalLand(card)).length;
      if (
        command.finalize &&
        (landCount < 16 || landCount > 18) &&
        !command.landCountRationale?.trim()
      ) {
        return {
          ok: false,
          error: {
            code: "INVALID_DECK",
            message: "Un ecart a 16-18 terrains doit etre explique.",
            details: { landCount },
          },
        };
      }
      const evaluationDeck = [
        ...selectedCards,
        ...BASIC_LAND_NAMES.flatMap((name) =>
          Array.from(
            { length: command.basicLands[name] },
            () => DEFAULT_BASIC_LANDS[BASIC_LAND_COLORS[name]],
          ),
        ),
      ];
      const evaluation = evaluateDeck(evaluationDeck);
      const existing = session.deckWorkspaces?.[participantId];
      const workspace: Readonly<DeckWorkspace> = {
        participantId,
        sessionId: session.sessionId,
        revision: (existing?.revision ?? 0) + 1,
        status: command.finalize ? "finalized" : "editing",
        poolCardInstanceIds,
        maindeckCardInstanceIds: command.maindeckCardInstanceIds,
        basicLands: command.basicLands,
        sideboardCardInstanceIds: getPoolSideboard(
          poolCardInstanceIds,
          command.maindeckCardInstanceIds,
        ),
        recommendation: existing?.recommendation ?? null,
        evaluation,
      };
      const event: Readonly<MultiplayerEvent> = {
        schemaVersion: 1,
        sequence: persisted.events.length + 1,
        revision: lobby.revision + 1,
        scopeId: session.sessionId,
        requestId: command.requestId,
        occurredAt: this.dependencies.now(),
        type: "DeckSelectionUpdated",
        sessionId: session.sessionId,
        participantId,
        finalized: command.finalize,
      };
      const nextSession: Readonly<PersistedMultiplayerSession> = {
        ...session,
        deckWorkspaces: { ...(session.deckWorkspaces ?? {}), [participantId]: workspace },
      };
      const nextState: Readonly<PersistedMultiplayerState> = {
        ...persisted,
        lobby: replayLobbyEvents(lobby, [event]),
        events: [...persisted.events, event],
        ...(persisted.session?.sessionId === session.sessionId ? { session: nextSession } : {}),
        sessions: { ...(persisted.sessions ?? {}), [session.sessionId]: nextSession },
      };
      const commit = await this.dependencies.store.commit({
        expectedRevision: command.expectedRevision,
        requestId: command.requestId,
        requestFingerprint: createHash("sha256")
          .update(
            JSON.stringify({
              expectedRevision: command.expectedRevision,
              maindeckCardInstanceIds: command.maindeckCardInstanceIds,
              basicLands: command.basicLands,
              finalize: command.finalize,
            }),
            "utf8",
          )
          .digest("hex"),
        participantId,
        appendedEvents: [event],
        nextState,
      });
      if (!commit.ok) return commit;
      return { ok: true, value: workspace };
    } catch {
      return {
        ok: false,
        error: {
          code: "STORE_UNAVAILABLE",
          message: "Le deckbuilding est momentanement indisponible.",
          details: {},
        },
      };
    }
  }

  public async getDeckExport(
    resumeToken: string,
  ): Promise<MultiplayerResult<ReturnType<typeof generateMtgaExport>>> {
    try {
      const persisted = await this.dependencies.store.load();
      const authenticated = findParticipantByToken(persisted, resumeToken);
      if (!persisted || !authenticated) {
        return {
          ok: false,
          error: {
            code: "INVALID_RESUME_TOKEN",
            message: "L'Acces de reprise est invalide.",
            details: {},
          },
        };
      }
      const participantId = authenticated.participant.participantId;
      const session = findParticipantSession(persisted, participantId);
      const workspace = session?.deckWorkspaces?.[participantId];
      if (!session || workspace?.status !== "finalized") {
        return {
          ok: false,
          error: {
            code: "DECK_NOT_READY",
            message: "Finalisez votre Liste de 40 cartes avant de l'exporter.",
            details: {},
          },
        };
      }
      const replayed = replayDraft(session.draftEvents);
      if (!replayed.ok) throw new Error(replayed.error.message);
      const draftView = getDraftView(replayed.value);
      const poolCards = workspace.poolCardInstanceIds.flatMap((id) => {
        const card = draftView.cardsByInstanceId[id];
        return card ? [card] : [];
      });
      const pool = this.dependencies.loadMtgaPool
        ? await this.dependencies.loadMtgaPool(session.cubeKey, poolCards)
        : poolCards.map((card) => ({
            instanceId: card.instanceId,
            name: card.name,
            cmc: 0,
            isLand: false,
            arenaAvailability: "available" as const,
          }));
      return {
        ok: true,
        value: generateMtgaExport({
          status: "finalized",
          pool,
          maindeckCardInstanceIds: workspace.maindeckCardInstanceIds,
          basicLands: workspace.basicLands,
        }),
      };
    } catch {
      return {
        ok: false,
        error: {
          code: "STORE_UNAVAILABLE",
          message: "L'export MTGA est momentanement indisponible.",
          details: {},
        },
      };
    }
  }

  public async abandon(
    command: Readonly<AbandonMultiplayerSessionCommand>,
  ): Promise<MultiplayerResult<PublicLobbyView>> {
    try {
      if (!command.confirmed) {
        return {
          ok: false,
          error: {
            code: "INVALID_INPUT",
            message: "L'abandon doit etre confirme explicitement.",
            details: { field: "confirmed" },
          },
        };
      }
      const persisted = await this.dependencies.store.load();
      const authenticated = findParticipantByToken(persisted, command.resumeToken);
      if (!persisted || !authenticated) {
        return {
          ok: false,
          error: {
            code: "INVALID_RESUME_TOKEN",
            message: "L'Acces de reprise est invalide.",
            details: {},
          },
        };
      }
      const lobby = replayLobbyEvents(persisted.lobby, persisted.events);
      if (command.expectedRevision !== lobby.revision) {
        return {
          ok: false,
          error: {
            code: "REVISION_CONFLICT",
            message: "La Session de draft a change. Rechargez son etat.",
            details: { currentRevision: lobby.revision },
          },
        };
      }
      const sessionId = lobby.activeSessionId;
      const session = sessionId
        ? (persisted.sessions?.[sessionId] ?? persisted.session)
        : undefined;
      if (
        session?.status !== "drafting" ||
        !session.seatAssignments.some(
          (seat) =>
            seat.kind === "human" && seat.participantId === authenticated.participant.participantId,
        )
      ) {
        return {
          ok: false,
          error: {
            code: "SESSION_ABANDONED",
            message: "Cette Session n'est plus active.",
            details: {},
          },
        };
      }
      const revision = lobby.revision + 1;
      const common = {
        schemaVersion: 1 as const,
        revision,
        requestId: command.requestId,
        occurredAt: this.dependencies.now(),
      };
      const abandonedEvent: Readonly<MultiplayerEvent> = {
        ...common,
        sequence: persisted.events.length + 1,
        scopeId: session.sessionId,
        type: "SessionAbandoned",
        sessionId: session.sessionId,
        participantId: authenticated.participant.participantId,
      };
      const emptiedEvent: Readonly<MultiplayerEvent> = {
        ...common,
        sequence: persisted.events.length + 2,
        scopeId: "global",
        type: "LobbyEmptied",
      };
      const appendedEvents = [abandonedEvent, emptiedEvent];
      const nextLobby = replayLobbyEvents(lobby, appendedEvents);
      const nextSession: Readonly<PersistedMultiplayerSession> = {
        ...session,
        status: "abandoned",
      };
      const nextState: Readonly<PersistedMultiplayerState> = {
        ...persisted,
        lobby: nextLobby,
        events: [...persisted.events, ...appendedEvents],
        session: nextSession,
        sessions: { ...(persisted.sessions ?? {}), [session.sessionId]: nextSession },
      };
      const requestFingerprint = createHash("sha256")
        .update(
          JSON.stringify({ expectedRevision: command.expectedRevision, confirmed: true }),
          "utf8",
        )
        .digest("hex");
      const commit = await this.dependencies.store.commit({
        expectedRevision: command.expectedRevision,
        requestId: command.requestId,
        requestFingerprint,
        participantId: authenticated.participant.participantId,
        appendedEvents,
        nextState,
      });
      if (!commit.ok) return commit;
      return { ok: true, value: replayLobbyEvents(commit.value.lobby, commit.value.events) };
    } catch {
      return {
        ok: false,
        error: {
          code: "STORE_UNAVAILABLE",
          message: "La Session de draft est momentanement indisponible.",
          details: {},
        },
      };
    }
  }
}

export function createMultiplayerDraftCoordinator(
  dependencies: MultiplayerDraftCoordinatorDependencies,
): MultiplayerDraftCoordinator {
  return new DefaultMultiplayerDraftCoordinator(dependencies);
}
