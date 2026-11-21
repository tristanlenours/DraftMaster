import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

describe("data/cards/proxy-scans.json schema validation", () => {
  it("conforms to data/schemas/proxy-scans.schema.json when present", () => {
    const schemaPath = resolve(process.cwd(), "data", "schemas", "proxy-scans.schema.json");
    const catalogPath = resolve(process.cwd(), "data", "cards", "proxy-scans.json");

    const schema = JSON.parse(readFileSync(schemaPath, "utf8")) as Record<string, unknown>;
    const ajv = new Ajv2020.default({ allErrors: false, strict: false });
    addFormats.default(ajv);
    const validate = ajv.compile(schema);

    if (!existsSync(catalogPath)) {
      expect(
        validate({
          schemaVersion: 1,
          generatedAt: new Date().toISOString(),
          cardCount: 0,
          entries: {},
        }),
      ).toBe(true);
      return;
    }

    const catalog = JSON.parse(readFileSync(catalogPath, "utf8")) as {
      cardCount: number;
      entries: Record<string, unknown>;
    };
    const valid = validate(catalog);
    expect(validate.errors).toBeNull();
    expect(valid).toBe(true);
    expect(catalog.cardCount).toBe(Object.keys(catalog.entries).length);
  });
});
