import { Ajv2020 } from "ajv/dist/2020.js";
import { fullFormats } from "ajv-formats/dist/formats.js";

import snapshotSchema from "./cube-snapshot.schema.json" with { type: "json" };
import { calculateSnapshotDigest } from "./canonical-snapshot.ts";

export interface CardInstance {
  readonly instanceId: string;
  readonly sourceIndex: number;
  readonly printingId: string;
  readonly oracleId: string;
  readonly name: string;
  readonly setCode: string;
  readonly collectorNumber: string;
  readonly finish?: string;
}

export interface CubeSnapshotSource {
  readonly provider: "CubeCobra";
  readonly cubeId: "5e1c13b67c22a016c25ff019";
  readonly shortId: "6ht";
  readonly cubeName: string;
  readonly owner: "eltitou007";
  readonly board: "mainboard";
  readonly url: string;
  readonly cubeRevision: number;
  readonly cubeUpdatedAt: string;
  readonly retrievedAt: string;
  readonly importerVersion: string;
  readonly rawSha256: string;
  readonly attribution: string;
}

export interface CubeSnapshotIntegrity {
  readonly cardCount: number;
  readonly uniqueInstanceCount: number;
  readonly uniquePrintingCount: number;
  readonly uniqueOracleCount: number;
  readonly canonicalSha256: string;
}

export interface CubeSnapshot {
  readonly schemaVersion: 1;
  readonly snapshotId: string;
  readonly cubeKey: "titou_tribal";
  readonly version: string;
  readonly source: CubeSnapshotSource;
  readonly cards: readonly CardInstance[];
  readonly integrity: CubeSnapshotIntegrity;
}

export type SnapshotErrorCode =
  | "INVALID_SNAPSHOT"
  | "INVALID_CUBE_VERSION"
  | "DUPLICATE_INSTANCE_ID"
  | "INSUFFICIENT_CARDS"
  | "INTEGRITY_MISMATCH";

export interface SnapshotError {
  readonly code: SnapshotErrorCode;
  readonly message: string;
  readonly details: Readonly<Record<string, unknown>>;
}

export type SnapshotResult<T> =
  | { readonly ok: true; readonly value: Readonly<T> }
  | { readonly ok: false; readonly error: SnapshotError };

const initialSnapshotVersion = "2026-02-24.1";
const versionPattern = /^[0-9]{4}-[0-9]{2}-[0-9]{2}\.[1-9][0-9]*$/u;

const ajv = new Ajv2020({ allErrors: true, strict: true });
ajv.addFormat("date-time", fullFormats["date-time"]);
ajv.addFormat("uri", fullFormats.uri);
const validateShape = ajv.compile<CubeSnapshot>(snapshotSchema);

function failure(
  code: SnapshotErrorCode,
  message: string,
  details: Readonly<Record<string, unknown>> = {},
): SnapshotResult<never> {
  return { ok: false, error: { code, message, details } };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Readonly<Record<string, unknown>>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

function preflightFailure(input: unknown): SnapshotResult<never> | undefined {
  if (!isRecord(input)) {
    return failure("INVALID_SNAPSHOT", "Snapshot must be a JSON object.");
  }

  if (typeof input.version !== "string" || !versionPattern.test(input.version)) {
    return failure("INVALID_CUBE_VERSION", "Cube version must use the YYYY-MM-DD.N format.", {
      field: "version",
    });
  }

  if (Array.isArray(input.cards) && input.cards.length < 360) {
    return failure("INSUFFICIENT_CARDS", "A Titou snapshot must contain at least 360 instances.", {
      actual: input.cards.length,
      minimum: 360,
    });
  }

  if (Array.isArray(input.cards)) {
    const instanceIds = input.cards.flatMap((card) =>
      isRecord(card) && typeof card.instanceId === "string" ? [card.instanceId] : [],
    );
    if (new Set(instanceIds).size !== instanceIds.length) {
      return failure("DUPLICATE_INSTANCE_ID", "Every card instance ID must be unique.", {
        cardCount: input.cards.length,
        uniqueInstanceCount: new Set(instanceIds).size,
      });
    }
  }
}

function validateSemantics(snapshot: CubeSnapshot): SnapshotResult<never> | undefined {
  const expectedSnapshotId = `${snapshot.cubeKey}@${snapshot.version}`;
  if (snapshot.snapshotId !== expectedSnapshotId) {
    return failure("INVALID_CUBE_VERSION", "Snapshot identity does not match its cube version.", {
      actual: snapshot.snapshotId,
      expected: expectedSnapshotId,
    });
  }

  const instanceIds = new Set(snapshot.cards.map(({ instanceId }) => instanceId));
  if (instanceIds.size !== snapshot.cards.length) {
    return failure("DUPLICATE_INSTANCE_ID", "Every card instance ID must be unique.", {
      cardCount: snapshot.cards.length,
      uniqueInstanceCount: instanceIds.size,
    });
  }

  const invalidIndex = snapshot.cards.findIndex(
    ({ instanceId, sourceIndex }, index) =>
      sourceIndex !== index ||
      instanceId !== `${snapshot.snapshotId}/mainboard/${String(index).padStart(3, "0")}`,
  );
  if (invalidIndex !== -1) {
    return failure("INVALID_SNAPSHOT", "Source indexes and instance IDs must be contiguous.", {
      cardIndex: invalidIndex,
    });
  }

  const actualIntegrity = {
    cardCount: snapshot.cards.length,
    uniqueInstanceCount: instanceIds.size,
    uniquePrintingCount: new Set(snapshot.cards.map(({ printingId }) => printingId)).size,
    uniqueOracleCount: new Set(snapshot.cards.map(({ oracleId }) => oracleId)).size,
  };

  if (
    snapshot.version === initialSnapshotVersion &&
    (actualIntegrity.cardCount !== 545 ||
      actualIntegrity.uniquePrintingCount !== 543 ||
      actualIntegrity.uniqueOracleCount !== 542)
  ) {
    return failure(
      "INTEGRITY_MISMATCH",
      "Initial Titou snapshot counts do not match the contract.",
      {
        actual: actualIntegrity,
        expected: { cardCount: 545, uniquePrintingCount: 543, uniqueOracleCount: 542 },
      },
    );
  }

  const countersMatch = Object.entries(actualIntegrity).every(
    ([key, value]) => snapshot.integrity[key as keyof typeof actualIntegrity] === value,
  );
  if (!countersMatch) {
    return failure("INTEGRITY_MISMATCH", "Snapshot integrity counters do not match its cards.", {
      actual: actualIntegrity,
    });
  }

  const canonicalSha256 = calculateSnapshotDigest(snapshot);
  if (snapshot.integrity.canonicalSha256 !== canonicalSha256) {
    return failure("INTEGRITY_MISMATCH", "Snapshot canonical digest does not match its content.", {
      actual: snapshot.integrity.canonicalSha256,
      expected: canonicalSha256,
    });
  }
}

export function validateSnapshot(input: unknown): SnapshotResult<CubeSnapshot> {
  const invalidPreflight = preflightFailure(input);
  if (invalidPreflight !== undefined) {
    return invalidPreflight;
  }

  if (!validateShape(input)) {
    return failure("INVALID_SNAPSHOT", "Snapshot does not satisfy the strict schema.", {
      issues: (validateShape.errors ?? []).map(({ instancePath, keyword, message }) => ({
        path: instancePath,
        keyword,
        message,
      })),
    });
  }

  const invalidSemantics = validateSemantics(input);
  if (invalidSemantics !== undefined) {
    return invalidSemantics;
  }

  return { ok: true, value: deepFreeze(structuredClone(input)) };
}

export function validateSnapshotJson(raw: string): SnapshotResult<CubeSnapshot> {
  try {
    return validateSnapshot(JSON.parse(raw));
  } catch (error: unknown) {
    return failure("INVALID_SNAPSHOT", "Snapshot file is not valid JSON.", {
      reason: error instanceof Error ? error.message : "Unknown JSON parsing error",
    });
  }
}
