import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type {
  MultiplayerDraftStore,
  MultiplayerResult,
  MultiplayerStoreCommit,
  PersistedMultiplayerState,
} from "./types.ts";

export interface LocalFileMultiplayerDraftStoreOptions {
  readonly filePath: string;
}

const fileLocks = new Map<string, Promise<void>>();

async function withFileLock<T>(filePath: string, action: () => Promise<T>): Promise<T> {
  const previous = fileLocks.get(filePath) ?? Promise.resolve();
  let release = (): void => undefined;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const queued = previous.then(() => current);
  fileLocks.set(filePath, queued);
  await previous;
  try {
    return await action();
  } finally {
    release();
    if (fileLocks.get(filePath) === queued) {
      fileLocks.delete(filePath);
    }
  }
}

class LocalFileMultiplayerDraftStore implements MultiplayerDraftStore {
  private readonly filePath: string;

  public constructor(options: LocalFileMultiplayerDraftStoreOptions) {
    this.filePath = options.filePath;
  }

  public async load(): Promise<Readonly<PersistedMultiplayerState> | null> {
    try {
      const payload = await readFile(this.filePath, "utf8");
      return JSON.parse(payload) as PersistedMultiplayerState;
    } catch (error) {
      if (
        error !== null &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return null;
      }
      throw error;
    }
  }

  public async commit(
    command: Readonly<MultiplayerStoreCommit>,
  ): Promise<MultiplayerResult<Readonly<PersistedMultiplayerState>>> {
    return withFileLock(this.filePath, async () => {
      try {
        const current = await this.load();
        const currentRevision = current?.lobby.revision ?? 0;
        if (currentRevision !== command.expectedRevision) {
          return {
            ok: false,
            error: {
              code: "REVISION_CONFLICT",
              message: "Le Salon de draft a change. Rechargez son etat.",
              details: { currentRevision },
            },
          };
        }
        await mkdir(dirname(this.filePath), { recursive: true });
        const temporaryPath = `${this.filePath}.${String(process.pid)}.${String(Date.now())}.tmp`;
        await writeFile(temporaryPath, `${JSON.stringify(command.nextState)}\n`, {
          encoding: "utf8",
          mode: 0o600,
        });
        await rename(temporaryPath, this.filePath);
        return { ok: true, value: command.nextState };
      } catch {
        return {
          ok: false,
          error: {
            code: "STORE_UNAVAILABLE",
            message: "Le stockage du Salon de draft est momentanement indisponible.",
            details: {},
          },
        };
      }
    });
  }
}

export function createLocalFileMultiplayerDraftStore(
  options: LocalFileMultiplayerDraftStoreOptions,
): MultiplayerDraftStore {
  return new LocalFileMultiplayerDraftStore(options);
}
