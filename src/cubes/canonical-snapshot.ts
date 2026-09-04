import { createHash } from "node:crypto";

import type { CubeSnapshot } from "./validate-snapshot.ts";

function serializePrimitive(value: null | boolean | number | string): string {
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new TypeError("Canonical JSON does not support non-finite numbers.");
  }
  return JSON.stringify(value);
}

export function canonicalizeJson(value: unknown): string {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return serializePrimitive(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalizeJson).join(",")}]`;
  }

  if (typeof value !== "object") {
    throw new TypeError("Canonical JSON supports only JSON values.");
  }

  const record = value as Readonly<Record<string, unknown>>;
  const entries = Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalizeJson(record[key])}`);
  return `{${entries.join(",")}}`;
}

export function snapshotFunctionalProjection(snapshot: Readonly<CubeSnapshot>): unknown {
  const source = Object.fromEntries(
    Object.entries(snapshot.source).filter(([key]) => key !== "retrievedAt"),
  );
  const integrity = Object.fromEntries(
    Object.entries(snapshot.integrity).filter(([key]) => key !== "canonicalSha256"),
  );
  return { ...snapshot, source, integrity };
}

export function calculateSnapshotDigest(snapshot: Readonly<CubeSnapshot>): string {
  const canonical = canonicalizeJson(snapshotFunctionalProjection(snapshot));
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
