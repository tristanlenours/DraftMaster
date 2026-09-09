import { readFile } from "node:fs/promises";
import { Ajv2020 } from "ajv/dist/2020.js";

import profileSchema from "../../data/schemas/archetype-synergy-profile.schema.json" with { type: "json" };
import type {
  ArchetypeSynergyProfileDocument,
  LoadedArchetypeSynergyProfile,
} from "./archetype-synergy-profile-types.ts";

export type ArchetypeSynergyProfileErrorCode =
  "INVALID_JSON" | "SCHEMA_VALIDATION_FAILED" | "SEMANTIC_VALIDATION_FAILED" | "FILE_READ_ERROR";

export interface ArchetypeSynergyProfileError {
  readonly code: ArchetypeSynergyProfileErrorCode;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export type ArchetypeSynergyProfileResult<T> =
  | { readonly ok: true; readonly value: Readonly<T> }
  | { readonly ok: false; readonly error: ArchetypeSynergyProfileError };

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateShape = ajv.compile<ArchetypeSynergyProfileDocument>(profileSchema);

function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Readonly<Record<string, unknown>>))
      deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function validateSemantics(
  document: ArchetypeSynergyProfileDocument,
): ArchetypeSynergyProfileResult<ArchetypeSynergyProfileDocument> {
  const archetypeIds = new Set<string>();
  for (const archetype of document.archetypes) {
    if (archetypeIds.has(archetype.id)) {
      return {
        ok: false,
        error: {
          code: "SEMANTIC_VALIDATION_FAILED",
          message: `Duplicate archetype id: ${archetype.id}`,
        },
      };
    }
    archetypeIds.add(archetype.id);
    const familyIds = new Set(archetype.requiredFamilies.map((family) => family.id));
    if (familyIds.size !== archetype.requiredFamilies.length) {
      return {
        ok: false,
        error: {
          code: "SEMANTIC_VALIDATION_FAILED",
          message: `Duplicate required family in ${archetype.id}.`,
        },
      };
    }
    const cardIds = new Set<string>();
    for (const card of archetype.cards) {
      if (cardIds.has(card.oracleId)) {
        return {
          ok: false,
          error: {
            code: "SEMANTIC_VALIDATION_FAILED",
            message: `Duplicate card ${card.oracleId} in ${archetype.id}.`,
          },
        };
      }
      cardIds.add(card.oracleId);
      const unknownFamily = card.families.find((family) => !familyIds.has(family));
      if (unknownFamily) {
        return {
          ok: false,
          error: {
            code: "SEMANTIC_VALIDATION_FAILED",
            message: `Unknown family ${unknownFamily} on ${card.name} in ${archetype.id}.`,
          },
        };
      }
    }
    for (const family of archetype.requiredFamilies) {
      const candidates = archetype.cards.filter((card) => card.families.includes(family.id));
      if (candidates.length < family.minimum) {
        return {
          ok: false,
          error: {
            code: "SEMANTIC_VALIDATION_FAILED",
            message: `Family ${family.id} cannot reach its minimum in ${archetype.id}.`,
          },
        };
      }
    }
  }
  return { ok: true, value: document };
}

export function validateArchetypeSynergyProfileJson(
  rawJson: string,
): ArchetypeSynergyProfileResult<ArchetypeSynergyProfileDocument> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error: unknown) {
    return {
      ok: false,
      error: {
        code: "INVALID_JSON",
        message: "Invalid JSON format for archetype synergy profile.",
        details: { reason: error instanceof Error ? error.message : "Parse error" },
      },
    };
  }
  if (!validateShape(parsed)) {
    return {
      ok: false,
      error: {
        code: "SCHEMA_VALIDATION_FAILED",
        message: "Archetype synergy profile failed schema validation.",
        details: { errors: validateShape.errors },
      },
    };
  }
  return validateSemantics(parsed);
}

export class ArchetypeSynergyProfileRegistry implements LoadedArchetypeSynergyProfile {
  readonly document: ArchetypeSynergyProfileDocument;
  readonly evaluationProfile: LoadedArchetypeSynergyProfile["evaluationProfile"];

  constructor(document: ArchetypeSynergyProfileDocument) {
    this.document = deepFreeze(document);
    this.evaluationProfile = deepFreeze({
      modelVersion: document.modelVersion,
      cubeKey: document.cubeKey,
      cubeSnapshotId: document.cubeSnapshotId,
      archetypes: document.archetypes.map((archetype) => ({
        id: archetype.id,
        name: archetype.name,
        keyCards: archetype.cards
          .filter((card) => card.strength === "key")
          .map((card) => card.oracleId),
        supportCards: archetype.cards
          .filter((card) => card.strength === "support")
          .map((card) => card.oracleId),
        targetPoints: archetype.targetPoints,
        requiredFamilies: archetype.requiredFamilies.map((family) => ({
          ...family,
          cardIds: archetype.cards
            .filter((card) => card.families.includes(family.id))
            .map((card) => card.oracleId),
        })),
      })),
    });
  }

  static async fromFile(
    filePath: string,
  ): Promise<ArchetypeSynergyProfileResult<ArchetypeSynergyProfileRegistry>> {
    try {
      const result = validateArchetypeSynergyProfileJson(await readFile(filePath, "utf8"));
      if (!result.ok) return result;
      return { ok: true, value: new ArchetypeSynergyProfileRegistry(result.value) };
    } catch (error: unknown) {
      return {
        ok: false,
        error: {
          code: "FILE_READ_ERROR",
          message: `Unable to read archetype synergy profile at ${filePath}`,
          details: { reason: error instanceof Error ? error.message : "File error" },
        },
      };
    }
  }
}
