import { randomBytes as systemRandomBytes } from "node:crypto";

export type SecureRandomBytes = (size: number) => Uint8Array;

export interface SessionIdentity {
  readonly sessionId: string;
  readonly seed: number;
}

export interface SessionIdentityGenerator {
  create(seed?: number): Readonly<SessionIdentity>;
}

function assertInt32(seed: number): void {
  if (!Number.isInteger(seed) || seed < -2_147_483_648 || seed > 2_147_483_647) {
    throw new RangeError("Draft seed must be a signed 32-bit integer.");
  }
}

function takeBytes(randomBytes: SecureRandomBytes, size: number): Uint8Array {
  const bytes = randomBytes(size);
  if (bytes.length !== size) {
    throw new RangeError(`Secure random source must return exactly ${String(size)} bytes.`);
  }
  return bytes;
}

function generateSessionId(randomBytes: SecureRandomBytes): string {
  return Buffer.from(takeBytes(randomBytes, 6)).toString("hex");
}

function generateSeed(randomBytes: SecureRandomBytes): number {
  return Buffer.from(takeBytes(randomBytes, 4)).readInt32BE(0);
}

export function createSessionIdentityGenerator(
  randomBytes: SecureRandomBytes = systemRandomBytes,
): Readonly<SessionIdentityGenerator> {
  const knownSessionIds = new Set<string>();
  const generator: SessionIdentityGenerator = {
    create(seed) {
      if (seed !== undefined) {
        assertInt32(seed);
      }

      let sessionId: string;
      do {
        sessionId = generateSessionId(randomBytes);
      } while (knownSessionIds.has(sessionId));
      knownSessionIds.add(sessionId);

      return Object.freeze({
        sessionId,
        seed: seed ?? generateSeed(randomBytes),
      });
    },
  };
  return Object.freeze(generator);
}
