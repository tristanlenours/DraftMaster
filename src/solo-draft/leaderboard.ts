import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { LeaderboardEntry } from "./solo-draft-types.ts";

const DEFAULT_LEADERBOARD_PATH = "data/leaderboard.json";

export const INITIAL_REFERENCE_RECORDS: readonly LeaderboardEntry[] = [];

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

export async function getLeaderboard(
  customPath: string = DEFAULT_LEADERBOARD_PATH,
): Promise<LeaderboardEntry[]> {
  const fullPath = resolve(process.cwd(), customPath);
  try {
    const raw = await readFile(fullPath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return rankLeaderboardEntries(parsed as LeaderboardEntry[]);
    }
  } catch {
    // If missing or unreadable, initialize with empty array
  }

  await saveLeaderboard([], customPath);
  return [];
}

export async function saveLeaderboard(
  entries: readonly LeaderboardEntry[],
  customPath: string = DEFAULT_LEADERBOARD_PATH,
): Promise<void> {
  const fullPath = resolve(process.cwd(), customPath);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, JSON.stringify(entries, null, 2), "utf8");
}

export async function addLeaderboardEntry(
  entryData: Omit<LeaderboardEntry, "id" | "rank">,
  customPath: string = DEFAULT_LEADERBOARD_PATH,
): Promise<{
  entry: LeaderboardEntry;
  isNewHighScore: boolean;
  allEntries: LeaderboardEntry[];
}> {
  const existing = await getLeaderboard(customPath);
  const newId = `rec-${String(Date.now())}-${Math.random().toString(36).substring(2, 7)}`;
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
