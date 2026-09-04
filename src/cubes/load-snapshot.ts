import { readFile } from "node:fs/promises";

import {
  type CubeSnapshot,
  type SnapshotResult,
  validateSnapshotJson,
} from "./validate-snapshot.ts";

export async function loadSnapshot(file: string): Promise<SnapshotResult<CubeSnapshot>> {
  try {
    return validateSnapshotJson(await readFile(file, "utf8"));
  } catch (error: unknown) {
    return {
      ok: false,
      error: {
        code: "INVALID_SNAPSHOT",
        message: "Snapshot file could not be read.",
        details: {
          file,
          reason: error instanceof Error ? error.message : "Unknown file error",
        },
      },
    };
  }
}
