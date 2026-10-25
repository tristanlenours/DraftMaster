import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Loads `.env.local` then `.env` into `process.env` for entry points (server,
 * Companion, scripts). Existing variables always win, so `.env.local` overrides
 * `.env` and the real environment overrides both. Library code reads
 * `process.env` only and never parses these files itself.
 */
export function loadLocalEnvFiles(directory: string = process.cwd()): void {
  for (const fileName of [".env.local", ".env"]) {
    const filePath = resolve(directory, fileName);
    if (existsSync(filePath)) {
      process.loadEnvFile(filePath);
    }
  }
}
