import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { LeaderboardEntry } from "../solo-draft/solo-draft-types.ts";

const DEFAULT_LEADERBOARD_PATH = "data/leaderboard.json";
/** Versioned reference records; the runtime file above is local state, not versioned. */
const DEFAULT_LEADERBOARD_SEED_PATH = "data/seeds/leaderboard.json";

export function rankLeaderboardEntries(entries: readonly LeaderboardEntry[]): LeaderboardEntry[] {
  const sorted = [...entries].sort((a, b) => {
    // 1. Overall Score descending
    if (b.overallScore !== a.overallScore) {
      return b.overallScore - a.overallScore;
    }
    // 2. Total Duration ascending (speedrun tiebreaker)
    if (a.totalDurationSeconds !== b.totalDurationSeconds) {
      return a.totalDurationSeconds - b.totalDurationSeconds;
    }
    // 3. Most recent date first
    return Date.parse(b.occurredAt) - Date.parse(a.occurredAt);
  });

  return sorted.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}

async function readEntries(path: string): Promise<LeaderboardEntry[] | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(resolve(process.cwd(), path), "utf8"));
    return Array.isArray(parsed) ? (parsed as LeaderboardEntry[]) : null;
  } catch {
    return null;
  }
}

/**
 * Reads the local leaderboard. When the runtime file does not exist yet (fresh clone
 * or deployment), it starts from the seed: the default one for the default path,
 * none for custom paths unless `seedPath` is given.
 */
export async function getLeaderboard(
  customPath: string = DEFAULT_LEADERBOARD_PATH,
  options: { readonly seedPath?: string | undefined } = {},
): Promise<LeaderboardEntry[]> {
  const existing = await readEntries(customPath);
  if (existing) return rankLeaderboardEntries(existing);

  const seedPath =
    options.seedPath ??
    (customPath === DEFAULT_LEADERBOARD_PATH ? DEFAULT_LEADERBOARD_SEED_PATH : undefined);
  const seeded = seedPath ? ((await readEntries(seedPath)) ?? []) : [];
  const ranked = rankLeaderboardEntries(seeded);
  await saveLeaderboard(ranked, customPath);
  return ranked;
}

export async function saveLeaderboard(
  entries: readonly LeaderboardEntry[],
  customPath: string = DEFAULT_LEADERBOARD_PATH,
): Promise<void> {
  const fullPath = resolve(process.cwd(), customPath);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, JSON.stringify(entries, null, 2), "utf8");
}

/**
 * Adds an entry, or replaces the one with the same `entryId`: publishing the same
 * Résultat verrouillé twice never duplicates it on the Wall of Records.
 */
export async function addLeaderboardEntry(
  entryData: Omit<LeaderboardEntry, "id" | "rank">,
  customPath: string = DEFAULT_LEADERBOARD_PATH,
  entryId?: string,
): Promise<{
  entry: LeaderboardEntry;
  isNewHighScore: boolean;
  allEntries: LeaderboardEntry[];
}> {
  const newId =
    entryId ?? `rec-${String(Date.now())}-${Math.random().toString(36).substring(2, 7)}`;
  const existing = (await getLeaderboard(customPath)).filter((entry) => entry.id !== newId);
  const newEntry: LeaderboardEntry = {
    ...entryData,
    id: newId,
  };

  const combined = [...existing, newEntry];
  const ranked = rankLeaderboardEntries(combined);
  const rankedEntry = ranked.find((e) => e.id === newId) ?? { ...newEntry, rank: ranked.length };
  const isNewHighScore = ranked[0]?.id === newId;

  await saveLeaderboard(ranked, customPath);

  return {
    entry: rankedEntry,
    isNewHighScore,
    allEntries: ranked,
  };
}
