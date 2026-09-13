import type { CompanionCard } from "./card-resolver.ts";
import type { MidDraftReview } from "../domain/coaching/types.ts";

export type GameMode = "idle" | "draft" | "match";

export interface DraftAlternative {
  name: string;
  reason: string;
}

export interface DraftState {
  draftId: string;
  pack: number;
  pick: number;
  packCards: CompanionCard[];
  pool: CompanionCard[];
  lastPick: CompanionCard | null;
  advice: {
    topPick: string;
    reason: string;
    alternatives: DraftAlternative[];
    provider: string;
    packReview?: MidDraftReview | undefined;
  } | null;
}

export interface MatchState {
  matchId: string;
  eventId: string;
  opponentName: string;
  playerLife: number;
  opponentLife: number;
  turnNumber: number;
  gameTurn: number;
  isMyTurn: boolean;
  phase: string;
  activePlayer: number;
  playerSeat: number;
  playerHand: CompanionCard[];
  playerBattlefield: CompanionCard[];
  opponentBattlefield: CompanionCard[];
  opponentRecentPlays: string[];
  playerRecentPlays: string[];
  recentEvents: string[];
  winner: string | null;
  matchSummary: string | null;
}

export interface ChatEntry {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  provider?: string | undefined;
}

export class CompanionState {
  public mode: GameMode = "idle";
  public currentScene = "Home";
  public draft: DraftState = {
    draftId: "",
    pack: 1,
    pick: 1,
    packCards: [],
    pool: [],
    lastPick: null,
    advice: null,
  };
  public match: MatchState = {
    matchId: "",
    eventId: "Constructed",
    opponentName: "Adversaire",
    playerLife: 20,
    opponentLife: 20,
    turnNumber: 1,
    gameTurn: 1,
    isMyTurn: true,
    phase: "Main1",
    activePlayer: 1,
    playerSeat: 1,
    playerHand: [],
    playerBattlefield: [],
    opponentBattlefield: [],
    opponentRecentPlays: [],
    playerRecentPlays: [],
    recentEvents: [],
    winner: null,
    matchSummary: null,
  };
  public lastCompletedMatch: MatchState | null = null;
  public chatHistory: ChatEntry[] = [
    {
      id: "welcome",
      role: "assistant",
      content:
        "Bonjour ! Je suis ton Coach IA DraftMaster. Je surveille MTG Arena en direct. Dès que tu es en draft ou en match, je verrai tes cartes et te guiderai coup par coup !",
      timestamp: Date.now(),
      provider: "System",
    },
  ];

  public getSnapshot() {
    return {
      mode: this.mode,
      currentScene: this.currentScene,
      draft: this.draft,
      match: this.match,
      lastCompletedMatch: this.lastCompletedMatch,
      chatHistory: this.chatHistory.slice(-50),
    };
  }

  public addChatMessage(role: "user" | "assistant", content: string, provider?: string): ChatEntry {
    const entry: ChatEntry = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      role,
      content,
      timestamp: Date.now(),
      ...(provider ? { provider } : {}),
    };
    this.chatHistory.push(entry);
    return entry;
  }

  public resetDraft() {
    this.draft = {
      draftId: "",
      pack: 1,
      pick: 1,
      packCards: [],
      pool: [],
      lastPick: null,
      advice: null,
    };
  }

  public resetMatch() {
    this.match = {
      matchId: "",
      eventId: "Constructed",
      opponentName: "Adversaire",
      playerLife: 20,
      opponentLife: 20,
      turnNumber: 1,
      gameTurn: 1,
      isMyTurn: true,
      phase: "Main1",
      activePlayer: 1,
      playerSeat: 1,
      playerHand: [],
      playerBattlefield: [],
      opponentBattlefield: [],
      opponentRecentPlays: [],
      playerRecentPlays: [],
      recentEvents: [],
      winner: null,
      matchSummary: null,
    };
  }
}
