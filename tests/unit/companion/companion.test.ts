import { describe, expect, it } from "vitest";
import { CardResolver } from "../../../src/companion/card-resolver.ts";
import { CompanionState } from "../../../src/companion/companion-state.ts";
import {
  buildDraftAdvicePrompt,
  buildDraftSummaryPrompt,
  buildMatchAdvicePrompt,
  buildTurnCommentaryPrompt,
} from "../../../src/companion/coach-prompts.ts";

describe("Companion - CardResolver", () => {
  it("falls back gracefully to fallback card object when DB is not present", () => {
    const resolver = new CardResolver("non-existent-directory");
    const card = resolver.resolve(99999);
    expect(card.grpId).toBe(99999);
    expect(card.name).toBe("Card #99999");
    expect(card.imageUrl).toBe("");
    expect(card.isLand).toBe(false);
  });
});

describe("Companion - CompanionState", () => {
  it("manages draft and match states correctly", () => {
    const state = new CompanionState();
    expect(state.mode).toBe("idle");

    state.mode = "draft";
    state.draft.pack = 1;
    state.draft.pick = 1;
    state.addChatMessage("user", "Que dois-je pick ?");

    const snap = state.getSnapshot();
    expect(snap.mode).toBe("draft");
    expect(snap.draft.pack).toBe(1);
    expect(snap.chatHistory.length).toBeGreaterThanOrEqual(2); // Welcome msg + user msg
  });

  it("resets match state properly", () => {
    const state = new CompanionState();
    state.mode = "match";
    state.match.opponentName = "TestOpponent";
    state.match.playerLife = 15;
    state.match.opponentLife = 8;

    state.resetMatch();
    expect(state.match.playerLife).toBe(20);
    expect(state.match.opponentLife).toBe(20);
    expect(state.match.opponentName).toBe("Adversaire");
  });
});

describe("Companion - Coach Prompts", () => {
  const dummyCard = {
    grpId: 1,
    name: "Tamiyo, Inquisitive Student",
    manaCost: "{U}",
    cmc: 1,
    rarity: 4,
    colors: ["U"],
    isLand: false,
    imageUrl: "",
  };

  it("builds draft advice prompts with pack and pool details", () => {
    const { system, user } = buildDraftAdvicePrompt([dummyCard], [dummyCard], 1, 2);
    expect(system).toContain("Tu es un Coach de Draft Cube Magic");
    expect(user).toContain("Tamiyo, Inquisitive Student");
    expect(user).toContain("Pack 1, Pick 2");
  });

  it("builds draft summary prompts for optimal deckbuilding", () => {
    const { system, user } = buildDraftSummaryPrompt([dummyCard]);
    expect(system).toContain("Tu es un expert deckbuilder");
    expect(user).toContain("Tamiyo, Inquisitive Student");
  });

  it("builds match advice prompts for in-game assistance", () => {
    const state = new CompanionState();
    state.match.opponentName = "Opponent42";
    state.match.playerHand = [dummyCard];

    const { system, user } = buildMatchAdvicePrompt(state.match, "Devrais-je attaquer ?");
    expect(system).toContain("Tu es un arbitre et coach");
    expect(user).toContain("Opponent42");
    expect(user).toContain("Devrais-je attaquer ?");
  });

  it("builds rich turn commentary prompts with battlefield and MTG game turn", () => {
    const state = new CompanionState();
    state.match.opponentName = "Opponent42";
    state.match.gameTurn = 2;
    state.match.opponentRecentPlays = ["Founding the Third Path"];
    state.match.playerHand = [dummyCard];

    const { system, user } = buildTurnCommentaryPrompt(state.match);
    expect(system).toContain("Tu es un commentateur et coach Magic: The Gathering");
    expect(user).toContain("Tour 2 du joueur");
    expect(user).toContain("Founding the Third Path");
    expect(user).toContain("Tamiyo, Inquisitive Student");
  });
});
