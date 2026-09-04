import { createHash } from "node:crypto";

import { uniformInt } from "pure-rand/distribution/uniformInt";
import { xoroshiro128plus } from "pure-rand/generator/xoroshiro128plus";

export type SeatNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type RandomStreamName = "distribution" | `policy:seat:${SeatNumber}`;

export interface RandomSystemMetadata {
  readonly algorithm: "xoroshiro128plus";
  readonly algorithmVersion: "1";
  readonly implementation: "pure-rand";
  readonly implementationVersion: "8.4.2";
  readonly seedDerivationVersion: "draftmaster-seed-v1";
}

export interface SeededRandom {
  nextInt(minimum: number, maximum: number): number;
  shuffle<T>(values: readonly T[]): readonly T[];
}

export const RANDOM_SYSTEM_METADATA: RandomSystemMetadata = Object.freeze({
  algorithm: "xoroshiro128plus",
  algorithmVersion: "1",
  implementation: "pure-rand",
  implementationVersion: "8.4.2",
  seedDerivationVersion: "draftmaster-seed-v1",
});

function assertInt32(seed: number): void {
  if (!Number.isInteger(seed) || seed < -2_147_483_648 || seed > 2_147_483_647) {
    throw new RangeError("Draft seed must be a signed 32-bit integer.");
  }
}

function assertRange(minimum: number, maximum: number): void {
  if (!Number.isSafeInteger(minimum) || !Number.isSafeInteger(maximum) || minimum > maximum) {
    throw new RangeError("Random bounds must be safe integers in ascending order.");
  }
}

export function deriveStreamSeed(publicSeed: number, streamName: RandomStreamName): number {
  assertInt32(publicSeed);
  const input = `${RANDOM_SYSTEM_METADATA.seedDerivationVersion}\0${String(publicSeed)}\0${streamName}`;
  return createHash("sha256").update(input, "utf8").digest().readInt32BE(0);
}

export function createSeededRandom(
  publicSeed: number,
  streamName: RandomStreamName,
): Readonly<SeededRandom> {
  const generator = xoroshiro128plus(deriveStreamSeed(publicSeed, streamName));

  const source: SeededRandom = {
    nextInt(minimum, maximum) {
      assertRange(minimum, maximum);
      return uniformInt(generator, minimum, maximum);
    },
    shuffle<T>(values: readonly T[]): readonly T[] {
      const shuffled = [...values];
      for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const swapIndex = source.nextInt(0, index);
        const current = shuffled[index];
        const other = shuffled[swapIndex];
        if (current === undefined || other === undefined) {
          throw new Error("Fisher-Yates indexes must address existing values.");
        }
        shuffled[index] = other;
        shuffled[swapIndex] = current;
      }
      return Object.freeze(shuffled);
    },
  };
  return Object.freeze(source);
}
