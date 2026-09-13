import { validateSnapshot, type CubeSnapshot } from "../../src/cubes/validate-snapshot.ts";
import type {
  MultiplayerDraftStore,
  PersistedMultiplayerState,
} from "../../src/multiplayer-draft/index.ts";
import { buildSyntheticSnapshot } from "../fixtures/cube-fixtures.ts";

export interface TestClock {
  readonly now: () => string;
  readonly advanceBy: (milliseconds: number) => void;
}

export function createTestClock(initial = "2026-09-13T12:00:00.000Z"): TestClock {
  let current = Date.parse(initial);
  return {
    now: () => new Date(current).toISOString(),
    advanceBy: (milliseconds) => {
      current += milliseconds;
    },
  };
}

export function createSequenceFactory(prefix: string): () => string {
  let sequence = 0;
  return () => `${prefix}-${String(++sequence).padStart(3, "0")}`;
}

export function buildMultiplayerSnapshot(): Readonly<CubeSnapshot> {
  const result = validateSnapshot(buildSyntheticSnapshot(360, "2026-09-13.1"));
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.value;
}

export const EMPTY_SEATS = Object.freeze([null, null, null, null, null, null, null, null] as const);

export function createMemoryMultiplayerDraftStore(
  initialState: Readonly<PersistedMultiplayerState> | null = null,
): MultiplayerDraftStore {
  let state = initialState;
  return {
    load: () => Promise.resolve(state),
    commit: (command) => {
      const currentRevision = state?.lobby.revision ?? 0;
      if (currentRevision !== command.expectedRevision) {
        return Promise.resolve({
          ok: false,
          error: {
            code: "REVISION_CONFLICT",
            message: "Le Salon de draft a change. Rechargez son etat.",
            details: { currentRevision },
          },
        } as const);
      }
      state = command.nextState;
      return Promise.resolve({ ok: true as const, value: state });
    },
  };
}
