import { EventEmitter } from "node:events";
import type { ClientRequest, IncomingMessage } from "node:http";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fakeGemini = vi.hoisted(() => ({
  responses: [] as number[],
  paths: [] as string[],
  defaultStatus: 503,
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
        write: vi.fn(),
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
                              text: JSON.stringify({
                                archetype: "Azorius Tempo",
                                cards: [{ name: "Karakas", count: 1 }],
                                basicLands: {},
                              }),
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
});
