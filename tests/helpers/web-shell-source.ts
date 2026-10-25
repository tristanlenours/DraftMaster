import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

/** ES modules that make up the main web shell (formerly a single src/web/app.js). */
export const WEB_SHELL_MODULES = [
  "app.js",
  "app-state.js",
  "cube-config.js",
  "cubes-view.js",
  "card-explorer.js",
  "card-modal.js",
  "records-view.js",
] as const;

/** Source of every web shell module, concatenated, for content assertions. */
export async function readWebShellSource(rootDir: string = process.cwd()): Promise<string> {
  const sources = await Promise.all(
    WEB_SHELL_MODULES.map((file) => readFile(resolve(rootDir, "src", "web", file), "utf-8")),
  );
  return sources.join("\n");
}
