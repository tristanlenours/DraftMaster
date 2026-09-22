import { resolve } from "node:path";

import { CubeRegistry } from "../cubes/cube-registry.ts";
import { loadActiveCubeSnapshot } from "../cubes/load-active-snapshot.ts";
import type {
  TournamentCubeCatalog,
  TournamentCubeSnapshot,
  TournamentCubeSummary,
  TournamentResult,
} from "./types.ts";

export interface TournamentCubeCatalogOptions {
  readonly projectRoot: string;
}

function failure(message: string, cubeKey?: string): TournamentResult<never> {
  return {
    ok: false,
    error: {
      code: "INVALID_CUBE",
      message,
      details: cubeKey === undefined ? {} : { cubeKey },
    },
  };
}

class RegistryTournamentCubeCatalog implements TournamentCubeCatalog {
  private readonly projectRoot: string;

  public constructor(options: Readonly<TournamentCubeCatalogOptions>) {
    this.projectRoot = options.projectRoot;
  }

  public async listCubes(): Promise<TournamentResult<readonly TournamentCubeSummary[]>> {
    const result = await CubeRegistry.loadAllCubes(resolve(this.projectRoot, "data", "cubes"));
    if (!result.ok) {
      return failure("Le registre des cubes ne peut pas être chargé.");
    }
    const cubes = result.value
      .getAllCubes()
      .map(({ cubeKey, name, activeSnapshotId }) => ({
        cubeKey,
        cubeName: name,
        activeSnapshotId,
      }))
      .sort((left, right) => left.cubeName.localeCompare(right.cubeName, "fr"));
    return { ok: true, value: cubes };
  }

  public async loadSnapshot(cubeKey: string): Promise<TournamentResult<TournamentCubeSnapshot>> {
    const result = await loadActiveCubeSnapshot(this.projectRoot, cubeKey);
    if (!result.ok) {
      return failure("Le Snapshot actif du cube demandé est indisponible.", cubeKey);
    }
    const payload = result.value;
    return {
      ok: true,
      value: {
        cubeKey: payload.cubeKey,
        cubeName: payload.source.cubeName,
        snapshotId: payload.snapshotId,
        canonicalSha256: payload.integrity.canonicalSha256,
        payload,
      },
    };
  }
}

export function createTournamentCubeCatalog(
  options: Readonly<TournamentCubeCatalogOptions>,
): TournamentCubeCatalog {
  return new RegistryTournamentCubeCatalog(options);
}
