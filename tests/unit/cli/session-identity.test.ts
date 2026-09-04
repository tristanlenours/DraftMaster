import { describe, expect, it } from "vitest";

import {
  type SecureRandomBytes,
  createSessionIdentityGenerator,
} from "../../../src/cli/session-identity.ts";

function queuedEntropy(chunks: readonly Uint8Array[]): {
  readonly randomBytes: SecureRandomBytes;
  readonly requestedSizes: number[];
} {
  const queue = [...chunks];
  const requestedSizes: number[] = [];
  return {
    requestedSizes,
    randomBytes(size) {
      requestedSizes.push(size);
      const value = queue.shift();
      if (value === undefined) {
        throw new Error("test entropy exhausted");
      }
      expect(value).toHaveLength(size);
      return value;
    },
  };
}

describe("session identity generator", () => {
  it("creates the approved 12-character lowercase hexadecimal form", () => {
    const entropy = queuedEntropy([Uint8Array.from([0x0c, 0x0e, 0x1a, 0x78, 0xc4, 0xcf])]);
    const generator = createSessionIdentityGenerator(entropy.randomBytes);

    const identity = generator.create(42);

    expect(identity).toEqual({ sessionId: "0c0e1a78c4cf", seed: 42 });
    expect(identity.sessionId).toMatch(/^[0-9a-f]{12}$/u);
    expect(Object.isFrozen(identity)).toBe(true);
  });

  it("regenerates a detected collision within the current execution", () => {
    const repeated = Uint8Array.from([0, 0, 0, 0, 0, 1]);
    const entropy = queuedEntropy([repeated, repeated, Uint8Array.from([0, 0, 0, 0, 0, 2])]);
    const generator = createSessionIdentityGenerator(entropy.randomBytes);

    expect(generator.create(1).sessionId).toBe("000000000001");
    expect(generator.create(2).sessionId).toBe("000000000002");
    expect(entropy.requestedSizes).toEqual([6, 6, 6]);
  });

  it("does not persist collisions beyond one generator execution", () => {
    const bytes = Uint8Array.from([0, 0, 0, 0, 0, 1]);
    const first = createSessionIdentityGenerator(queuedEntropy([bytes]).randomBytes);
    const second = createSessionIdentityGenerator(queuedEntropy([bytes]).randomBytes);

    expect(first.create(1).sessionId).toBe(second.create(2).sessionId);
  });

  it("keeps an explicit seed independent from session ID generation", () => {
    const bytes = Uint8Array.from([0xab, 0xcd, 0xef, 0x12, 0x34, 0x56]);
    const first = createSessionIdentityGenerator(queuedEntropy([bytes]).randomBytes).create(-1);
    const second = createSessionIdentityGenerator(queuedEntropy([bytes]).randomBytes).create(42);

    expect(first.sessionId).toBe(second.sessionId);
    expect(first.seed).toBe(-1);
    expect(second.seed).toBe(42);
  });

  it("generates a missing seed as an independent signed int32", () => {
    const entropy = queuedEntropy([
      Uint8Array.from([0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff]),
      Uint8Array.from([0xff, 0x00, 0x00, 0x01]),
    ]);
    const generator = createSessionIdentityGenerator(entropy.randomBytes);

    expect(generator.create()).toEqual({
      sessionId: "aabbccddeeff",
      seed: -16_777_215,
    });
    expect(entropy.requestedSizes).toEqual([6, 4]);
  });

  it.each([-2_147_483_649, 2_147_483_648, 1.5, Number.NaN])(
    "rejects an explicit seed outside signed int32 (%s)",
    (seed) => {
      const generator = createSessionIdentityGenerator(() => Uint8Array.from([0, 0, 0, 0, 0, 1]));

      expect(() => generator.create(seed)).toThrow(RangeError);
    },
  );
});
