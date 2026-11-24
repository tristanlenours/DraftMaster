/**
 * MPC Autofill (mpcfill.com) integration: community card renders at up to
 * 1200 DPI hosted on public Google Drive folders.
 *
 * - Search: POST https://mpcfill.com/2/editorSearch/ (identifiers) then
 *   POST /2/cards/ (metadata). The search must list the sources to query.
 * - Images: https://lh4.googleusercontent.com/d/<driveId>=h<height>, the
 *   same public endpoint the official MPC Autofill image CDN uses.
 *
 * Every remote URL is built here from a strictly validated identifier, so the
 * local proxy routes cannot be used to reach any other host.
 */

export const MPC_AUTOFILL_ORIGIN = "https://mpcfill.com";
export const MPC_IMAGE_ORIGIN = "https://lh4.googleusercontent.com";
/** Google Drive file ids are URL-safe base64-ish strings. */
const MPC_IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]{20,100}$/u;
const MPC_LANGUAGE_PATTERN = /^[A-Z]{2}$/u;
export const MPC_MAX_RESULTS = 60;
/** MPC renders are 1110 px tall at 300 DPI (63x88 mm card + 1/8" bleed). */
const MPC_HEIGHT_PER_300_DPI = 1110;
/** Full renders are fetched at 600 DPI: the studio's highest export resolution. */
export const MPC_FULL_DPI = 600;

export type MpcImageSize = "thumb" | "full";

export interface MpcCandidate {
  readonly identifier: string;
  readonly name: string;
  readonly dpi: number;
  readonly sizeBytes: number;
  readonly sourceName: string;
  readonly language: string;
  readonly tags: readonly string[];
  readonly extension: string;
}

export interface MpcSourceRecord {
  readonly pk: number;
}

export function isValidMpcIdentifier(value: unknown): value is string {
  return typeof value === "string" && MPC_IDENTIFIER_PATTERN.test(value);
}

/** Normalizes a user query the way MPC Autofill indexes names (lower case, no punctuation noise). */
export function normalizeMpcQuery(raw: string): string {
  const [frontFace = ""] = raw.split(" // ");
  return frontFace
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}' ,-]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 120);
}

export function buildMpcSearchBody(
  query: string,
  sourcePks: readonly number[],
  languages: readonly string[] = [],
): Record<string, unknown> {
  return {
    queries: [{ query, cardType: "CARD" }],
    searchSettings: {
      filterSettings: {
        excludesTags: [],
        includesTags: [],
        languages: languages.filter((code) => MPC_LANGUAGE_PATTERN.test(code)),
        maximumDPI: 1500,
        maximumSize: 30,
        minimumDPI: 0,
      },
      searchTypeSettings: { filterCardbacks: false, fuzzySearch: false },
      sourceSettings: { sources: sourcePks.map((pk) => [pk, true]) },
    },
  };
}

/** Extracts the identifiers of a `/2/editorSearch/` response for one query. */
export function readMpcSearchIdentifiers(payload: unknown, query: string): string[] {
  const results = (payload as { results?: Record<string, { CARD?: unknown }> } | null)?.results;
  const ids = results?.[query]?.CARD;
  if (!Array.isArray(ids)) return [];
  return ids.filter(isValidMpcIdentifier).slice(0, MPC_MAX_RESULTS);
}

/** Keeps the useful, validated fields of `/2/cards/` results, in search order. */
export function normalizeMpcCards(payload: unknown, orderedIds: readonly string[]): MpcCandidate[] {
  const results = (payload as { results?: Record<string, Record<string, unknown>> } | null)
    ?.results;
  if (!results || typeof results !== "object") return [];
  const candidates: MpcCandidate[] = [];
  for (const id of orderedIds) {
    const raw = results[id];
    if (raw?.identifier !== id) continue;
    const dpi = Number(raw.dpi);
    candidates.push({
      identifier: id,
      name: typeof raw.name === "string" ? raw.name.slice(0, 160) : "",
      dpi: Number.isFinite(dpi) && dpi > 0 ? Math.round(dpi) : 0,
      sizeBytes: Number(raw.size) || 0,
      sourceName: typeof raw.sourceName === "string" ? raw.sourceName.slice(0, 80) : "",
      language:
        typeof raw.language === "string" && MPC_LANGUAGE_PATTERN.test(raw.language)
          ? raw.language
          : "EN",
      tags: Array.isArray(raw.tags)
        ? raw.tags.filter((tag): tag is string => typeof tag === "string").slice(0, 12)
        : [],
      extension: typeof raw.extension === "string" ? raw.extension.slice(0, 8) : "jpg",
    });
  }
  return candidates;
}

/** Public Google image URL for a validated MPC identifier. */
export function buildMpcImageUrl(
  identifier: string,
  size: MpcImageSize,
  dpi = MPC_FULL_DPI,
): string {
  if (!isValidMpcIdentifier(identifier)) throw new Error("Identifiant MPC invalide.");
  if (size === "thumb") return `${MPC_IMAGE_ORIGIN}/d/${identifier}=w400-h400`;
  const effectiveDpi = Math.max(150, Math.min(MPC_FULL_DPI, Math.round(dpi) || MPC_FULL_DPI));
  const height = Math.round((effectiveDpi * MPC_HEIGHT_PER_300_DPI) / 300);
  return `${MPC_IMAGE_ORIGIN}/d/${identifier}=h${String(height)}`;
}

/** Local same-origin route the browser uses for an MPC image. */
export function localMpcImagePath(identifier: string, size: MpcImageSize): string {
  return `/api/proxy-scans/mpc/image/${identifier}?size=${size}`;
}

const LOCAL_MPC_IMAGE_PATTERN =
  /^\/api\/proxy-scans\/mpc\/image\/[A-Za-z0-9_-]{20,100}\?size=(thumb|full)$/u;

/** True for the local MPC image routes stored in curated variants. */
export function isLocalMpcImagePath(value: unknown): boolean {
  return typeof value === "string" && LOCAL_MPC_IMAGE_PATTERN.test(value);
}
