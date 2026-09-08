import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";

import cubeSchema from "../../data/schemas/cube.schema.json" with { type: "json" };
import type { CubeDocument } from "./cube-meta-types.ts";

export type CubeRegistryErrorCode =
  "INVALID_JSON" | "SCHEMA_VALIDATION_FAILED" | "FILE_READ_ERROR" | "DIRECTORY_READ_ERROR";

export interface CubeRegistryError {
  readonly code: CubeRegistryErrorCode;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export type CubeRegistryResult<T> =
  | { readonly ok: true; readonly value: Readonly<T> }
  | { readonly ok: false; readonly error: CubeRegistryError };

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateCubeShape = ajv.compile<CubeDocument>(cubeSchema);

function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Readonly<Record<string, unknown>>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

export function validateCubeDocumentJson(rawJson: string): CubeRegistryResult<CubeDocument> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error: unknown) {
    return {
      ok: false,
      error: {
        code: "INVALID_JSON",
        message: "Invalid JSON format for cube document.",
        details: { reason: error instanceof Error ? error.message : "Parse error" },
      },
    };
  }

  if (!validateCubeShape(parsed)) {
    return {
      ok: false,
      error: {
        code: "SCHEMA_VALIDATION_FAILED",
        message: "Cube document failed schema validation.",
        details: { errors: validateCubeShape.errors },
      },
    };
  }

  return { ok: true, value: deepFreeze(parsed) };
}

export class CubeRegistry {
  private readonly cubes: Map<string, CubeDocument>;

  constructor(cubes: Map<string, CubeDocument>) {
    this.cubes = cubes;
  }

  static async loadCubeFile(filePath: string): Promise<CubeRegistryResult<CubeDocument>> {
    try {
      const content = await readFile(filePath, "utf8");
      return validateCubeDocumentJson(content);
    } catch (error: unknown) {
      return {
        ok: false,
        error: {
          code: "FILE_READ_ERROR",
          message: `Unable to read cube file at ${filePath}`,
          details: { reason: error instanceof Error ? error.message : "File error" },
        },
      };
    }
  }

  static async loadAllCubes(cubesBaseDir: string): Promise<CubeRegistryResult<CubeRegistry>> {
    try {
      const entries = await readdir(cubesBaseDir, { withFileTypes: true });
      const dirNames = entries.filter((e) => e.isDirectory()).map((e) => e.name);

      const map = new Map<string, CubeDocument>();

      for (const dirName of dirNames) {
        const cubeJsonPath = join(cubesBaseDir, dirName, "cube.json");
        try {
          const res = await CubeRegistry.loadCubeFile(cubeJsonPath);
          if (res.ok) {
            map.set(res.value.cubeKey, res.value);
          }
        } catch {
          // ignore directories without cube.json
        }
      }

      return { ok: true, value: new CubeRegistry(map) };
    } catch (error: unknown) {
      return {
        ok: false,
        error: {
          code: "DIRECTORY_READ_ERROR",
          message: `Unable to read cubes directory at ${cubesBaseDir}`,
          details: { reason: error instanceof Error ? error.message : "Directory error" },
        },
      };
    }
  }

  getCube(cubeKey: string): CubeDocument | undefined {
    return this.cubes.get(cubeKey);
  }

  getAllCubes(): readonly CubeDocument[] {
    return [...this.cubes.values()];
  }

  get size(): number {
    return this.cubes.size;
  }
}
