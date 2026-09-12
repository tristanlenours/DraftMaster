import { describe, expect, it } from "vitest";
import { CardResolver } from "../../../src/companion/card-resolver.ts";
import { buildDraftAdvicePrompt } from "../../../src/companion/coach-prompts.ts";

describe("Companion Advice Quality and Resolution (Diagnosing Bugs Loop)", () => {
  const resolver = new CardResolver();

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
});
