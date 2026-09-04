import { vi } from "vitest";

import type { RawCubeFixture, SnapshotFixture } from "../fixtures/cube-fixtures.js";

export type CubeOperationResult<T> =
  | { readonly ok: true; readonly value: T }
  | {
      readonly ok: false;
      readonly error: {
        readonly code: string;
        readonly message: string;
        readonly details: Readonly<Record<string, unknown>>;
      };
    };

interface SnapshotValidationApi {
  readonly validateSnapshot: (input: unknown) => CubeOperationResult<Readonly<SnapshotFixture>>;
  readonly validateSnapshotJson: (raw: string) => CubeOperationResult<Readonly<SnapshotFixture>>;
}

interface NormalizeSnapshotInput {
  readonly cube: Readonly<RawCubeFixture>;
  readonly version: string;
  readonly sourceUrl: string;
  readonly retrievedAt: string;
  readonly importerVersion: string;
  readonly rawSha256: string;
  readonly existingSnapshot?: Readonly<SnapshotFixture>;
}

interface SnapshotNormalizationApi {
  readonly normalizeSnapshot: (
    input: Readonly<NormalizeSnapshotInput>,
  ) => CubeOperationResult<Readonly<SnapshotFixture>>;
}

export function loadSnapshotValidationApi(): Promise<SnapshotValidationApi> {
  return vi.importActual<SnapshotValidationApi>("../../src/cubes/validate-snapshot.js");
}

export function loadSnapshotNormalizationApi(): Promise<SnapshotNormalizationApi> {
  return vi.importActual<SnapshotNormalizationApi>("../../src/cubes/normalize-snapshot.js");
}
