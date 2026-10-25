import { mkdir, readdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SoloDraftPersistenceSnapshot } from "./solo-draft-types.ts";

const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/u;

/** Session ids become file names: only a flat, bounded alphabet is accepted. */
export function isValidSoloSessionId(sessionId: unknown): sessionId is string {
  return typeof sessionId === "string" && SESSION_ID_PATTERN.test(sessionId);
}

export type SoloDraftLoadResult =
  | { readonly ok: true; readonly value: SoloDraftPersistenceSnapshot }
  | { readonly ok: false; readonly code: "NOT_FOUND" | "INVALID_ID" }
  | { readonly ok: false; readonly code: "CORRUPT"; readonly message: string };

/**
 * Durable storage for in-progress Solo sessions. `save` and `remove` throw when
 * storage fails so callers never report a success that was not persisted.
 */
export interface SoloDraftStore {
  load(sessionId: string): Promise<SoloDraftLoadResult>;
  save(snapshot: Readonly<SoloDraftPersistenceSnapshot>): Promise<void>;
  remove(sessionId: string): Promise<void>;
  /**
   * Deletes sessions whose last save happened before `cutoff` (abandoned drafts and
   * training results never published); returns how many entries were removed.
   */
  removeExpired(cutoff: Date): Promise<number>;
}

function assertValidId(sessionId: string): void {
  if (!isValidSoloSessionId(sessionId)) {
    throw new Error("Identifiant de session invalide.");
  }
}

function isSnapshot(value: unknown): value is SoloDraftPersistenceSnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    isValidSoloSessionId(candidate.sessionId) &&
    typeof candidate.seed === "number" &&
    typeof candidate.playerName === "string" &&
    Array.isArray(candidate.humanPicks) &&
    candidate.humanPicks.every((pick) => typeof pick === "string")
  );
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

export function createFileSoloDraftStore(directory: string): SoloDraftStore {
  const pathFor = (sessionId: string) => join(directory, `${sessionId}.json`);

  return {
    async load(sessionId) {
      if (!isValidSoloSessionId(sessionId)) return { ok: false, code: "INVALID_ID" };
      let content: string;
      try {
        content = await readFile(pathFor(sessionId), "utf8");
      } catch (error: unknown) {
        if (isMissingFile(error)) return { ok: false, code: "NOT_FOUND" };
        throw error;
      }
      try {
        const parsed: unknown = JSON.parse(content);
        if (!isSnapshot(parsed) || parsed.sessionId !== sessionId) {
          return { ok: false, code: "CORRUPT", message: "Snapshot de session incomplet." };
        }
        return { ok: true, value: parsed };
      } catch (error: unknown) {
        return {
          ok: false,
          code: "CORRUPT",
          message: error instanceof Error ? error.message : "JSON invalide.",
        };
      }
    },

    async save(snapshot) {
      assertValidId(snapshot.sessionId);
      await mkdir(directory, { recursive: true });
      const target = pathFor(snapshot.sessionId);
      // Write then rename so a crash never leaves a half-written snapshot behind.
      const temporary = `${target}.${String(process.pid)}.tmp`;
      await writeFile(temporary, JSON.stringify(snapshot, null, 2), "utf8");
      await rename(temporary, target);
    },

    async remove(sessionId) {
      assertValidId(sessionId);
      try {
        await unlink(pathFor(sessionId));
      } catch (error: unknown) {
        if (!isMissingFile(error)) throw error;
      }
    },

    async removeExpired(cutoff) {
      let names: string[];
      try {
        names = await readdir(directory);
      } catch (error: unknown) {
        if (isMissingFile(error)) return 0;
        throw error;
      }
      let removed = 0;
      for (const name of names) {
        // Snapshots and temp files left by an interrupted save; nothing else is touched.
        if (!name.endsWith(".json") && !name.endsWith(".tmp")) continue;
        const path = join(directory, name);
        try {
          if ((await stat(path)).mtimeMs >= cutoff.getTime()) continue;
          await unlink(path);
          removed++;
        } catch (error: unknown) {
          if (!isMissingFile(error)) throw error;
        }
      }
      return removed;
    },
  };
}

export function createInMemorySoloDraftStore(
  options: { readonly now?: () => number } = {},
): SoloDraftStore {
  const now = options.now ?? Date.now;
  const documents = new Map<string, string>();
  const savedAt = new Map<string, number>();
  return {
    load(sessionId) {
      if (!isValidSoloSessionId(sessionId))
        return Promise.resolve({ ok: false, code: "INVALID_ID" });
      const document = documents.get(sessionId);
      if (document === undefined) return Promise.resolve({ ok: false, code: "NOT_FOUND" });
      return Promise.resolve({
        ok: true,
        value: JSON.parse(document) as SoloDraftPersistenceSnapshot,
      });
    },
    save(snapshot) {
      try {
        assertValidId(snapshot.sessionId);
      } catch (error: unknown) {
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }
      documents.set(snapshot.sessionId, JSON.stringify(snapshot));
      savedAt.set(snapshot.sessionId, now());
      return Promise.resolve();
    },
    remove(sessionId) {
      try {
        assertValidId(sessionId);
      } catch (error: unknown) {
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }
      documents.delete(sessionId);
      savedAt.delete(sessionId);
      return Promise.resolve();
    },
    removeExpired(cutoff) {
      let removed = 0;
      for (const [sessionId, time] of savedAt) {
        if (time >= cutoff.getTime()) continue;
        documents.delete(sessionId);
        savedAt.delete(sessionId);
        removed++;
      }
      return Promise.resolve(removed);
    },
  };
}
