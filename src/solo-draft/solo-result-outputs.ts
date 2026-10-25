import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { DetailedDraftReport } from "../simulation/detailed-simulation.ts";
import { generateDetailedDraftHtml } from "../simulation/html-report-generator.ts";
import { generateBoosterDistributionHtml } from "../simulation/booster-distribution-html.ts";
import { saveUnifiedLeaderboardEntry } from "../storage/cloud-leaderboard.ts";
import { saveAdminDraft } from "./admin-drafts.ts";
import type {
  AdminDraftEntry,
  LeaderboardEntry,
  SoloLeaderboardPayload,
} from "./solo-draft-types.ts";

export interface SoloReportLocations {
  readonly walkthroughPath: string;
  readonly boostersPath: string;
  readonly walkthroughUrl: string;
  readonly boostersUrl: string;
}

export interface SoloLeaderboardPublication {
  readonly entry: LeaderboardEntry;
  readonly isNewHighScore: boolean;
}

/**
 * Outputs derived from a Résultat verrouillé. Every operation must be
 * idempotent: a retry after a partial failure repeats it with the same inputs.
 */
export interface SoloResultOutputs {
  /** Overwrites the HTML reports named after `baseName`. */
  writeReports(report: DetailedDraftReport, baseName: string): Promise<SoloReportLocations>;
  /** Upserts the admin archive entry by its id and session. */
  recordAdminDraft(entry: AdminDraftEntry): Promise<void>;
  /** Upserts the Wall of Records entry identified by `entryId`. */
  publishLeaderboard(
    entryId: string,
    payload: SoloLeaderboardPayload,
  ): Promise<SoloLeaderboardPublication>;
}

export interface FileSoloResultOutputsOptions {
  readonly reportsDirectory?: string | undefined;
  readonly reportsUrlPrefix?: string | undefined;
  readonly adminDraftsPath?: string | undefined;
  readonly leaderboardPath?: string | undefined;
}

export function createFileSoloResultOutputs(
  options: Readonly<FileSoloResultOutputsOptions> = {},
): SoloResultOutputs {
  const reportsDirectory = options.reportsDirectory ?? "reports";
  const reportsUrlPrefix = options.reportsUrlPrefix ?? `/${reportsDirectory}`;

  return {
    async writeReports(report, baseName) {
      const walkthroughFilename = `${baseName}.html`;
      const boostersFilename = `${baseName}-boosters.html`;
      const walkthroughPath = resolve(process.cwd(), reportsDirectory, walkthroughFilename);
      const boostersPath = resolve(process.cwd(), reportsDirectory, boostersFilename);
      await mkdir(dirname(walkthroughPath), { recursive: true });
      await writeFile(walkthroughPath, generateDetailedDraftHtml(report), "utf8");
      await writeFile(boostersPath, generateBoosterDistributionHtml(report), "utf8");
      return {
        walkthroughPath,
        boostersPath,
        walkthroughUrl: `${reportsUrlPrefix}/${walkthroughFilename}`,
        boostersUrl: `${reportsUrlPrefix}/${boostersFilename}`,
      };
    },

    recordAdminDraft(entry) {
      return saveAdminDraft(entry, options.adminDraftsPath);
    },

    publishLeaderboard(entryId, payload) {
      return saveUnifiedLeaderboardEntry(payload, options.leaderboardPath, entryId);
    },
  };
}
