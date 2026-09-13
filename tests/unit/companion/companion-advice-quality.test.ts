import { describe, expect, it } from "vitest";
import { CardResolver } from "../../../src/companion/card-resolver.ts";
import {
  buildDraftAdvicePrompt,
  buildOpeningHandPrompt,
  buildTurnCommentaryPrompt,
} from "../../../src/companion/coach-prompts.ts";

describe("Companion Advice Quality and Resolution (Diagnosing Bugs Loop)", () => {
  const resolver = new CardResolver("non-existent-directory");

  it("resolves Ocelot Pride with oracle text, power score, and lifelink", () => {
    const card = resolver.resolve(90887);
    expect(card.name).toBe("Ocelot Pride");
    expect(card.oracleText).toBeDefined();
    expect(card.oracleText?.toLowerCase()).toContain("lifelink");
    expect(card.oracleText?.toLowerCase()).toContain("cat");
    expect(card.powerScore).toBeGreaterThanOrEqual(40);
  });

  it("resolves Solitude with Flash, Lifelink, and 0-mana Evoke text", () => {
    const card = resolver.resolve(91164);
    expect(card.name).toBe("Solitude");
    expect(card.oracleText).toBeDefined();
    expect(card.oracleText?.toLowerCase()).toContain("flash");
    expect(card.oracleText?.toLowerCase()).toContain("lifelink");
    expect(card.oracleText?.toLowerCase()).toContain("evoke");
    expect(card.oracleText?.toLowerCase()).toContain("exile");
  });

  it("resolves Elegant Parlor as a land producing R and W with basic subtypes", () => {
    const card = resolver.resolve(89182);
    expect(card.name).toBe("Elegant Parlor");
    expect(card.isLand).toBe(true);
    expect(card.producesColors).toBeDefined();
    expect(card.producesColors).toContain("R");
    expect(card.producesColors).toContain("W");
    expect(card.oracleText?.toLowerCase()).toContain("surveil");
  });

  it("includes card text and ratings in the draft advice prompt", () => {
    const ocelot = resolver.resolve(90887);
    const karn = resolver.resolve(67106);

    const { user } = buildDraftAdvicePrompt([ocelot, karn], [], 1, 1);
    expect(user).toContain("Ocelot Pride");
    expect(user.toLowerCase()).toContain("lifelink");
    expect(user).toContain("Score");
  });

  it("correctly identifies land mana colors in engaged deck colors", () => {
    const ocelot = resolver.resolve(90887);
    const parlor = resolver.resolve(89182);

    const { user, system } = buildDraftAdvicePrompt([], [ocelot, parlor], 1, 3);
    expect(user).toContain("R:");
    expect(user).not.toContain("R: 0");
    expect(system).toContain("hors des couleurs");
  });

  it("analyzes opening hand with Black Lotus, Adeline, and detects Red mana deficit", () => {
    const hand = [
      {
        grpId: 1,
        name: "Ancient Tomb",
        manaCost: "",
        cmc: 0,
        rarity: 5,
        colors: [],
        isLand: true,
        imageUrl: "",
      },
      {
        grpId: 2,
        name: "Plains",
        manaCost: "",
        cmc: 0,
        rarity: 1,
        colors: [],
        isLand: true,
        imageUrl: "",
        producesColors: ["W"],
      },
      {
        grpId: 3,
        name: "Black Lotus",
        manaCost: "{0}",
        cmc: 0,
        rarity: 5,
        colors: [],
        isLand: false,
        imageUrl: "",
        producesColors: ["W", "U", "B", "R", "G"],
      },
      {
        grpId: 4,
        name: "Adeline, Resplendent Cathar",
        manaCost: "{1}{W}{W}",
        cmc: 3,
        rarity: 4,
        colors: ["W"],
        isLand: false,
        imageUrl: "",
      },
      {
        grpId: 5,
        name: "Anointed Peacekeeper",
        manaCost: "{2}{W}",
        cmc: 3,
        rarity: 4,
        colors: ["W"],
        isLand: false,
        imageUrl: "",
      },
      {
        grpId: 6,
        name: "Abrade",
        manaCost: "{1}{R}",
        cmc: 2,
        rarity: 2,
        colors: ["R"],
        isLand: false,
        imageUrl: "",
      },
      {
        grpId: 7,
        name: "Lightning Helix",
        manaCost: "{R}{W}",
        cmc: 2,
        rarity: 3,
        colors: ["R", "W"],
        isLand: false,
        imageUrl: "",
      },
    ];

    const { system, user } = buildOpeningHandPrompt(hand, "angel");
    expect(system).toContain("Adeline");
    expect(system).toContain("struggle");
    expect(user).toContain("Ligne explosive détectée");
    expect(user).toContain("Adeline, Resplendent Cathar");
    expect(user).toContain("COULEURS NON COUVERTES PAR LES TERRAINS : R");
    expect(user).toContain("Abrade");
    expect(user).toContain("Lightning Helix");
  });

  it("detects stranded red cards on board without red mana, and unlocks them with Sunbillow Verge", () => {
    const boardWithoutRed = [
      {
        grpId: 1,
        name: "Ancient Tomb",
        manaCost: "",
        cmc: 0,
        rarity: 5,
        colors: [],
        isLand: true,
        imageUrl: "",
      },
      {
        grpId: 2,
        name: "Plains",
        manaCost: "",
        cmc: 0,
        rarity: 1,
        colors: [],
        isLand: true,
        imageUrl: "",
        producesColors: ["W"],
      },
    ];
    const redSpells = [
      {
        grpId: 6,
        name: "Abrade",
        manaCost: "{1}{R}",
        cmc: 2,
        rarity: 2,
        colors: ["R"],
        isLand: false,
        imageUrl: "",
      },
      {
        grpId: 7,
        name: "Lightning Helix",
        manaCost: "{R}{W}",
        cmc: 2,
        rarity: 3,
        colors: ["R", "W"],
        isLand: false,
        imageUrl: "",
      },
      {
        grpId: 8,
        name: "Galvanic Discharge",
        manaCost: "{R}",
        cmc: 1,
        rarity: 1,
        colors: ["R"],
        isLand: false,
        imageUrl: "",
      },
      {
        grpId: 9,
        name: "Fable of the Mirror-Breaker",
        manaCost: "{2}{R}",
        cmc: 3,
        rarity: 4,
        colors: ["R"],
        isLand: false,
        imageUrl: "",
      },
    ];

    const { user: userWithoutRed, system } = buildTurnCommentaryPrompt({
      matchId: "m1",
      eventId: "Cube",
      opponentName: "angel",
      playerLife: 18,
      opponentLife: 17,
      turnNumber: 4,
      gameTurn: 2,
      isMyTurn: true,
      phase: "Main1",
      activePlayer: 1,
      playerSeat: 1,
      playerHand: redSpells,
      playerBattlefield: boardWithoutRed,
      opponentBattlefield: [],
      opponentRecentPlays: ["Fury"],
      playerRecentPlays: ["Plains", "Black Lotus", "Adeline, Resplendent Cathar"],
      recentEvents: [],
      winner: null,
      matchSummary: null,
    });

    expect(system).toContain("struggle");
    expect(system).toContain("Alléluia");
    expect(userWithoutRed).toContain("ALERTE MANA : Couleurs manquantes sur le board : R");
    expect(userWithoutRed).toContain("Abrade");
    expect(userWithoutRed).toContain("BLOWOUT MAJEUR");

    // Now player plays Sunbillow Verge (Alléluia !)
    const boardWithVerge = [
      ...boardWithoutRed,
      {
        grpId: 10,
        name: "Sunbillow Verge",
        manaCost: "",
        cmc: 0,
        rarity: 4,
        colors: [],
        isLand: true,
        imageUrl: "",
      },
    ];
    const { user: userWithRed } = buildTurnCommentaryPrompt({
      matchId: "m1",
      eventId: "Cube",
      opponentName: "angel",
      playerLife: 18,
      opponentLife: 17,
      turnNumber: 6,
      gameTurn: 3,
      isMyTurn: true,
      phase: "Main1",
      activePlayer: 1,
      playerSeat: 1,
      playerHand: redSpells,
      playerBattlefield: boardWithVerge,
      opponentBattlefield: [
        {
          grpId: 11,
          name: "The One Ring",
          manaCost: "{4}",
          cmc: 4,
          rarity: 5,
          colors: [],
          isLand: false,
          imageUrl: "",
        },
      ],
      opponentRecentPlays: ["The One Ring"],
      playerRecentPlays: ["Sunbillow Verge"],
      recentEvents: [],
      winner: null,
      matchSummary: null,
    });

    expect(userWithRed).toContain("The One Ring");
    expect(userWithRed).toContain("Couleurs de mana disponibles : W, R");
    expect(userWithRed).not.toContain("Couleurs manquantes sur le board : R");
    expect(userWithRed).toContain("Abrade ({1}{R}, CMC: 2) [JOUABLE]");
    expect(userWithRed).toContain("Fable of the Mirror-Breaker ({2}{R}, CMC: 3) [JOUABLE]");
  });
});
