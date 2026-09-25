import { EventEmitter } from "node:events";
import type { ClientRequest, IncomingMessage } from "node:http";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fakeGemini = vi.hoisted(() => ({
  responses: [] as number[],
  paths: [] as string[],
  defaultStatus: 503,
  responseData: undefined as Record<string, unknown> | undefined,
  payloads: [] as string[],
}));

vi.mock("node:https", () => ({
  Agent: class {
    readonly keepAlive = true;
  },
  request: vi.fn(
    (options: { path: string }, onResponse: (response: IncomingMessage) => void): ClientRequest => {
      fakeGemini.paths.push(options.path.replace(/key=[^&]+/u, "key=<redacted>"));
      const statusCode = fakeGemini.responses.shift() ?? fakeGemini.defaultStatus;
      const request = Object.assign(new EventEmitter(), {
        setTimeout: vi.fn(),
        write: vi.fn((payload: string) => {
          fakeGemini.payloads.push(payload);
        }),
        destroy: vi.fn(),
        end: () => {
          queueMicrotask(() => {
            const response = Object.assign(new EventEmitter(), { statusCode });
            onResponse(response as IncomingMessage);
            response.emit(
              "data",
              statusCode === 200
                ? JSON.stringify({
                    candidates: [
                      {
                        content: {
                          parts: [
                            {
                              text: JSON.stringify(
                                fakeGemini.responseData ?? {
                                  archetype: "Azorius Tempo",
                                  cards: [{ name: "Karakas", count: 1 }],
                                  basicLands: {},
                                },
                              ),
                            },
                          ],
                        },
                      },
                    ],
                  })
                : JSON.stringify({ error: { status: "UNAVAILABLE" } }),
            );
            response.emit("end");
          });
        },
      });
      return request as unknown as ClientRequest;
    },
  ),
}));

import { GeminiDeckPhotoRecognizer } from "../../../src/tournaments/deck-photo-recognition.ts";

describe("Gemini deck photo service fallback", () => {
  beforeEach(() => {
    fakeGemini.responses.length = 0;
    fakeGemini.paths.length = 0;
    fakeGemini.payloads.length = 0;
    fakeGemini.responseData = undefined;
    fakeGemini.defaultStatus = 503;
  });

  it("uses the configured model first and changes model after a 503", async () => {
    fakeGemini.responses.push(503, 200);
    const recognizer = new GeminiDeckPhotoRecognizer({
      projectRoot: process.cwd(),
      geminiKeys: ["key-one", "key-two"],
      model: "gemini-3.6-flash",
    });

    const result = await recognizer.recognizeDeck(Buffer.from("photo"), "image/jpeg");

    expect(result.ok).toBe(true);
    expect(fakeGemini.paths).toHaveLength(2);
    expect(fakeGemini.paths[0]).toContain("/gemini-3.6-flash:");
    expect(fakeGemini.paths[1]).not.toContain("/gemini-3.6-flash:");
  });

  it("reports provider unavailability when all models return 503", async () => {
    const recognizer = new GeminiDeckPhotoRecognizer({
      projectRoot: process.cwd(),
      geminiKeys: ["key-one"],
      model: "gemini-3.6-flash",
    });

    const result = await recognizer.recognizeDeck(Buffer.from("photo"), "image/jpeg");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("STORE_UNAVAILABLE");
    expect(result.error.message).toMatch(/indisponible|503/iu);
    expect(result.error.message).not.toContain("Reconnaissance impossible");
  });

  it("reports a quota error after a 429 instead of generic recognition failure", async () => {
    fakeGemini.defaultStatus = 429;
    const recognizer = new GeminiDeckPhotoRecognizer({
      projectRoot: process.cwd(),
      geminiKeys: ["key-one"],
    });

    const result = await recognizer.recognizeDeck(Buffer.from("photo"), "image/jpeg");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("STORE_UNAVAILABLE");
    expect(result.error.message).toMatch(/quota|limite|429/iu);
    expect(fakeGemini.paths).toHaveLength(1);
  });

  it("transcribes regions without cube suggestions and keeps uncertain names out of the MTGA list", async () => {
    fakeGemini.responses.push(200);
    fakeGemini.responseData = {
      tiles: [
        {
          tile: 1,
          titles: [
            "Mana Vault",
            "Mana Vault",
            "Swords to Plowshares",
            "Réduire au s",
            "Ruisseau éclat…",
            "Jwari Ruin…",
            "Plains",
            "Plains",
          ],
        },
        { tile: 2, titles: ["Mana Vault", "Swords to Plowshares", "Plains"] },
      ],
      basicLands: { Island: 17 },
      cards: [{ name: "Giant Killer", count: 1 }],
      confidence: 0.99,
    };
    const recognizer = new GeminiDeckPhotoRecognizer({
      projectRoot: process.cwd(),
      geminiKeys: ["key-one"],
      model: "gemini-3.5-flash-lite",
    });
    const result = await recognizer.recognizeDeck(
      [Buffer.from("region-one"), Buffer.from("region-two")],
      "image/jpeg",
      {
        candidateCardNames: ["Giant Killer"],
      },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.cards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Mana Vault", count: 1 }),
        expect.objectContaining({ name: "Swords to Plowshares", count: 1 }),
      ]),
    );
    expect(
      result.value.cards.some(
        (card) => card.name === "Giant Killer" || card.name === "Render Silent",
      ),
    ).toBe(false);
    expect(result.value.basicLands).toMatchObject({ Plains: 2, Island: 0 });
    expect(result.value.unverifiedTitles).toEqual([
      "Réduire au s",
      "Ruisseau éclat…",
      "Jwari Ruin…",
    ]);
    expect(
      result.value.cards.some((card) => ["Vivid Creek", "Jwari Disruption"].includes(card.name)),
    ).toBe(false);
    expect(result.value.confidence).toBeUndefined();
    const requestPayload = fakeGemini.payloads[0];
    expect(requestPayload).toBeDefined();
    const payload = JSON.parse(requestPayload ?? "") as {
      contents: { parts: { inlineData?: unknown; text?: string }[] }[];
    };
    expect(payload.contents[0]?.parts.filter((part) => part.inlineData)).toHaveLength(2);
    expect(payload.contents[0]?.parts.at(-1)?.text).not.toContain("Giant Killer");
    expect(payload.contents[0]?.parts.at(-1)?.text).not.toMatch(/estime leurs quantités/iu);
  });

  it("rejects a tiled response with no readable titles", async () => {
    fakeGemini.responses.push(200);
    fakeGemini.responseData = { tiles: [{ tile: 1, titles: [] }] };
    const recognizer = new GeminiDeckPhotoRecognizer({
      projectRoot: process.cwd(),
      geminiKeys: ["key-one"],
    });
    const result = await recognizer.recognizeDeck([Buffer.from("region")], "image/jpeg");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INVALID_INPUT");
    expect(result.error.message).toMatch(/aucun titre/iu);
  });
});
