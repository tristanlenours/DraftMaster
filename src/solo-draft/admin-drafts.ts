import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { AdminDraftEntry } from "./solo-draft-types.ts";

const DEFAULT_ADMIN_DRAFTS_PATH = "data/admin-drafts.json";
const MAX_STORED_ADMIN_DRAFTS = 50;

export async function getAdminDrafts(
  customPath: string = DEFAULT_ADMIN_DRAFTS_PATH,
): Promise<AdminDraftEntry[]> {
  const fullPath = resolve(process.cwd(), customPath);
  try {
    const raw = await readFile(fullPath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return (parsed as AdminDraftEntry[]).sort(
        (a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt),
      );
    }
  } catch {
    // If file missing or unreadable, return empty
  }
  return [];
}

export async function getAdminDraftById(
  id: string,
  customPath: string = DEFAULT_ADMIN_DRAFTS_PATH,
): Promise<AdminDraftEntry | null> {
  const drafts = await getAdminDrafts(customPath);
  return drafts.find((d) => d.id === id || d.sessionId === id) ?? null;
}

export async function saveAdminDraft(
  entry: AdminDraftEntry,
  customPath: string = DEFAULT_ADMIN_DRAFTS_PATH,
): Promise<void> {
  const drafts = await getAdminDrafts(customPath);
  const filtered = drafts.filter((d) => d.id !== entry.id && d.sessionId !== entry.sessionId);
  const updated = [entry, ...filtered].slice(0, MAX_STORED_ADMIN_DRAFTS);

  const fullPath = resolve(process.cwd(), customPath);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, JSON.stringify(updated, null, 2), "utf8");
}
