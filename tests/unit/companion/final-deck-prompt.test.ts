import { describe, expect, it } from "vitest";

import { buildFinalDeckCoachPrompt } from "../../../src/companion/coach-prompts.ts";

describe("prompt final-deck-coach@1", () => {
  it("decrit une mission JSON flexible et ne transmet que le contexte utile", () => {
    const prompt = buildFinalDeckCoachPrompt({
      cubeKey: "titou_tribal",
      snapshotId: "titou_tribal@test",
      pool: [
        {
          id: "card-1",
          name: "Lightning Bolt",
          colors: ["R"],
          staticScore: 50,
          cmc: 1,
          manaCost: "{R}",
          typeLine: "Instant",
          oracleText: "Lightning Bolt deals 3 damage to any target.",
        },
      ],
    });

    expect(prompt.system).toContain("final-deck-coach@1");
    expect(prompt.system).toContain("exactement 40 cartes");
    expect(prompt.system).toContain("16 a 18 terrains au total");
    expect(prompt.system).toContain("JSON");
    expect(prompt.system).not.toContain("23 sorts + 17 terrains");
    expect(prompt.user).toContain('"cardInstanceId":"card-1"');
    expect(prompt.user).toContain('"snapshotId":"titou_tribal@test"');
    expect(prompt.user).not.toContain("resumeToken");
    expect(prompt.user).not.toContain("playerName");
  });
});
