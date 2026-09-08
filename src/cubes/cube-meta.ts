import { readFile } from "node:fs/promises";
import { Ajv2020 } from "ajv/dist/2020.js";
import { fullFormats } from "ajv-formats/dist/formats.js";

import cubeMetaSchema from "../../data/schemas/cube-meta.schema.json" with { type: "json" };
import type { CubeArchetypeDefinition, CubeMetaDefinition } from "./cube-meta-types.ts";

export type CubeMetaErrorCode = "INVALID_JSON" | "SCHEMA_VALIDATION_FAILED" | "FILE_READ_ERROR";

export interface CubeMetaError {
  readonly code: CubeMetaErrorCode;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export type CubeMetaResult<T> =
  | { readonly ok: true; readonly value: Readonly<T> }
  | { readonly ok: false; readonly error: CubeMetaError };

const ajv = new Ajv2020({ allErrors: true, strict: true });
ajv.addFormat("date-time", fullFormats["date-time"]);
const validateShape = ajv.compile<CubeMetaDefinition>(cubeMetaSchema);

function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Readonly<Record<string, unknown>>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

export function validateCubeMetaJson(rawJson: string): CubeMetaResult<CubeMetaDefinition> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error: unknown) {
    return {
      ok: false,
      error: {
        code: "INVALID_JSON",
        message: "Invalid JSON format for cube meta.",
        details: { reason: error instanceof Error ? error.message : "Parse error" },
      },
    };
  }

  if (!validateShape(parsed)) {
    return {
      ok: false,
      error: {
        code: "SCHEMA_VALIDATION_FAILED",
        message: "Cube meta failed schema validation.",
        details: { errors: validateShape.errors },
      },
    };
  }

  return { ok: true, value: deepFreeze(parsed) };
}

export class CubeMetaRegistry {
  readonly meta: CubeMetaDefinition;
  private readonly archetypesById: Map<string, CubeArchetypeDefinition>;

  constructor(meta: CubeMetaDefinition) {
    this.meta = meta;
    this.archetypesById = new Map();
    for (const arch of meta.archetypes) {
      this.archetypesById.set(arch.id, arch);
    }
  }

  static async fromFile(filePath: string): Promise<CubeMetaResult<CubeMetaRegistry>> {
    try {
      const content = await readFile(filePath, "utf8");
      const result = validateCubeMetaJson(content);
      if (!result.ok) return result;
      return { ok: true, value: new CubeMetaRegistry(result.value) };
    } catch (error: unknown) {
      return {
        ok: false,
        error: {
          code: "FILE_READ_ERROR",
          message: `Unable to read cube meta file at ${filePath}`,
          details: { reason: error instanceof Error ? error.message : "File error" },
        },
      };
    }
  }

  get cubeKey(): string {
    return this.meta.cubeKey;
  }

  getArchetype(id: string): CubeArchetypeDefinition | undefined {
    return this.archetypesById.get(id);
  }

  isKeyCard(oracleId: string): boolean {
    return this.meta.archetypes.some((arch) => arch.keyCards.includes(oracleId));
  }

  isSupportCard(oracleId: string): boolean {
    return this.meta.archetypes.some((arch) => arch.supportCards.includes(oracleId));
  }

  getArchetypesForCard(oracleId: string): readonly CubeArchetypeDefinition[] {
    return this.meta.archetypes.filter(
      (arch) => arch.keyCards.includes(oracleId) || arch.supportCards.includes(oracleId),
    );
  }
}
