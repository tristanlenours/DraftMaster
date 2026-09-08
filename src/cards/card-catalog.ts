import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import { fullFormats } from "ajv-formats/dist/formats.js";

import masterCatalogSchema from "../../data/schemas/master-catalog.schema.json" with { type: "json" };
import cardSchema from "../../data/schemas/card.schema.json" with { type: "json" };
import {
  cardNameToSlug,
  type CardDocument,
  type CardFunctionalRole,
  type MasterCatalogCard,
  type MasterCardCatalog,
} from "./types.ts";
import type { MtGColor } from "../domain/coaching/types.ts";

export type CatalogErrorCode =
  "INVALID_JSON" | "SCHEMA_VALIDATION_FAILED" | "FILE_READ_ERROR" | "DIRECTORY_EMPTY";

export interface CatalogError {
  readonly code: CatalogErrorCode;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export type CatalogResult<T> =
  | { readonly ok: true; readonly value: Readonly<T> }
  | { readonly ok: false; readonly error: CatalogError };

const ajv = new Ajv2020({ allErrors: true, strict: true });
ajv.addFormat("date-time", fullFormats["date-time"]);
const validateMasterCatalogShape = ajv.compile<MasterCardCatalog>(masterCatalogSchema);
const validateCardShape = ajv.compile<CardDocument>(cardSchema);

function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Readonly<Record<string, unknown>>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

export function validateMasterCatalogJson(rawJson: string): CatalogResult<MasterCardCatalog> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error: unknown) {
    return {
      ok: false,
      error: {
        code: "INVALID_JSON",
        message: "Invalid JSON format for master catalog.",
        details: { reason: error instanceof Error ? error.message : "Parse error" },
      },
    };
  }

  if (!validateMasterCatalogShape(parsed)) {
    return {
      ok: false,
      error: {
        code: "SCHEMA_VALIDATION_FAILED",
        message: "Master catalog failed schema validation.",
        details: { errors: validateMasterCatalogShape.errors },
      },
    };
  }

  return { ok: true, value: deepFreeze(parsed) };
}

export function validateCardDocumentJson(rawJson: string): CatalogResult<CardDocument> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error: unknown) {
    return {
      ok: false,
      error: {
        code: "INVALID_JSON",
        message: "Invalid JSON format for card document.",
        details: { reason: error instanceof Error ? error.message : "Parse error" },
      },
    };
  }

  if (!validateCardShape(parsed)) {
    return {
      ok: false,
      error: {
        code: "SCHEMA_VALIDATION_FAILED",
        message: "Card document failed schema validation.",
        details: { errors: validateCardShape.errors },
      },
    };
  }

  return { ok: true, value: deepFreeze(parsed) };
}

export class CardCatalog {
  readonly catalog: MasterCardCatalog;
  private readonly byOracleId: Map<string, MasterCatalogCard>;
  private readonly bySlug: Map<string, MasterCatalogCard>;
  private readonly byNormalizedName: Map<string, MasterCatalogCard>;
  private readonly byCube: Map<string, MasterCatalogCard[]>;

  constructor(catalog: MasterCardCatalog) {
    this.catalog = catalog;
    this.byOracleId = new Map();
    this.bySlug = new Map();
    this.byNormalizedName = new Map();
    this.byCube = new Map();

    for (const card of Object.values(catalog.cards)) {
      this.byOracleId.set(card.oracleId, card);
      const slug = card.slug ?? cardNameToSlug(card.name);
      this.bySlug.set(slug, card);
      this.byNormalizedName.set(card.name.trim().toLowerCase(), card);

      for (const cubeKey of card.presentInCubes) {
        let cubeList = this.byCube.get(cubeKey);
        if (!cubeList) {
          cubeList = [];
          this.byCube.set(cubeKey, cubeList);
        }
        cubeList.push(card);
      }
    }
  }

  static async fromFile(filePath: string): Promise<CatalogResult<CardCatalog>> {
    try {
      const content = await readFile(filePath, "utf8");
      const result = validateMasterCatalogJson(content);
      if (!result.ok) return result;
      return { ok: true, value: new CardCatalog(result.value) };
    } catch (error: unknown) {
      return {
        ok: false,
        error: {
          code: "FILE_READ_ERROR",
          message: `Unable to read catalog file at ${filePath}`,
          details: { reason: error instanceof Error ? error.message : "File error" },
        },
      };
    }
  }

  static async fromDirectory(dirPath: string): Promise<CatalogResult<CardCatalog>> {
    try {
      const entries = await readdir(dirPath, { withFileTypes: true });
      const jsonFiles = entries
        .filter((e) => e.isFile() && e.name.endsWith(".json"))
        .map((e) => e.name);

      if (jsonFiles.length === 0) {
        return {
          ok: false,
          error: {
            code: "DIRECTORY_EMPTY",
            message: `No card JSON files found in directory ${dirPath}`,
          },
        };
      }

      const cardsRecord: Record<string, MasterCatalogCard> = {};
      for (const fileName of jsonFiles) {
        const fullPath = join(dirPath, fileName);
        const content = await readFile(fullPath, "utf8");
        const validation = validateCardDocumentJson(content);
        if (!validation.ok) {
          return validation;
        }
        const card = validation.value;
        cardsRecord[card.oracleId] = card;
      }

      const catalog: MasterCardCatalog = deepFreeze({
        schemaVersion: 1 as const,
        generatedAt: new Date().toISOString(),
        cardCount: Object.keys(cardsRecord).length,
        cards: cardsRecord,
      });

      return { ok: true, value: new CardCatalog(catalog) };
    } catch (error: unknown) {
      return {
        ok: false,
        error: {
          code: "FILE_READ_ERROR",
          message: `Unable to read card directory at ${dirPath}`,
          details: { reason: error instanceof Error ? error.message : "Directory error" },
        },
      };
    }
  }

  get totalCards(): number {
    return this.byOracleId.size;
  }

  getCardByOracleId(oracleId: string): MasterCatalogCard | undefined {
    return this.byOracleId.get(oracleId);
  }

  getCardBySlug(slug: string): MasterCatalogCard | undefined {
    return this.bySlug.get(slug);
  }

  getCardByName(name: string): MasterCatalogCard | undefined {
    return this.byNormalizedName.get(name.trim().toLowerCase());
  }

  getCardsInCube(cubeKey: string): readonly MasterCatalogCard[] {
    return this.byCube.get(cubeKey) ?? [];
  }

  getCardsForArchetype(cubeKey: string, archetypeId: string): readonly MasterCatalogCard[] {
    const cardsInCube = this.getCardsInCube(cubeKey);
    return cardsInCube.filter((card) => {
      const analysis = card.cubeAnalyses[cubeKey];
      return analysis?.archetypes.includes(archetypeId);
    });
  }

  getCardsByRole(role: CardFunctionalRole): readonly MasterCatalogCard[] {
    return [...this.byOracleId.values()].filter((card) =>
      card.objectiveAnalysis.roles.includes(role),
    );
  }

  getCardsByColor(color: MtGColor): readonly MasterCatalogCard[] {
    return [...this.byOracleId.values()].filter((card) => card.colors.includes(color));
  }
}
