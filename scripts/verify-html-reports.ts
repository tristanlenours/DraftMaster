import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

const seed = 42;
const detailedPath = `reports/draft-titou-seed-${String(seed)}.html`;
const boostersPath = `reports/draft-titou-seed-${String(seed)}-boosters.html`;

interface EmbeddedReport {
  readonly schemaVersion?: number;
  readonly bombDefinition?: { readonly percentile?: number };
  readonly seats?: readonly {
    readonly botName?: string;
    readonly steps?: readonly {
      readonly eventSequence?: number;
      readonly boosterId?: string;
      readonly decisionTrace?: { readonly candidates?: readonly unknown[] };
    }[];
  }[];
  readonly initialBoosters?: readonly {
    readonly cards?: readonly { readonly isBomb?: boolean }[];
    readonly p1PickCardInstanceId?: string;
    readonly p1PickCardName?: string;
  }[];
  readonly draftReport?: {
    readonly events?: readonly { readonly type?: string }[];
    readonly functionalDigest?: string;
  };
}

function requireCondition(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`HTML report verification failed: ${message}`);
  }
}

function parseEmbeddedReport(html: string): EmbeddedReport {
  const match = /<script id="draft-data" type="application\/json">\s*([\s\S]*?)\s*<\/script>/.exec(
    html,
  );
  requireCondition(match?.[1], "embedded draft-data JSON is missing");
  return JSON.parse(match[1]) as EmbeddedReport;
}

const [detailedHtml, boostersHtml] = await Promise.all([
  readFile(detailedPath, "utf8"),
  readFile(boostersPath, "utf8"),
]);

const detailedReport = parseEmbeddedReport(detailedHtml);
const boostersReport = parseEmbeddedReport(boostersHtml);
const executableScripts = [
  ...detailedHtml.matchAll(/<script(?![^>]*application\/json)[^>]*>([\s\S]*?)<\/script>/g),
];
requireCondition(executableScripts.length > 0, "detailed report client script is missing");
for (const [, source] of executableScripts) {
  requireCondition(source, "detailed report client script is empty");
  new Script(source, { filename: detailedPath });
}
const allSteps = detailedReport.seats?.flatMap((seat) => seat.steps ?? []) ?? [];
const pickedEvents =
  detailedReport.draftReport?.events?.filter((event) => event.type === "CardPicked") ?? [];
const bombCount =
  boostersReport.initialBoosters
    ?.flatMap((booster) => booster.cards ?? [])
    .filter((card) => card.isBomb).length ?? 0;

requireCondition(detailedReport.schemaVersion === 2, "detailed report schemaVersion must be 2");
requireCondition(boostersReport.schemaVersion === 2, "booster report schemaVersion must be 2");
requireCondition(detailedReport.seats?.length === 8, "the detailed report must contain 8 bots");
requireCondition(detailedReport.seats?.[0]?.botName === "Le Rockeur", "seat 0 must be Le Rockeur");
requireCondition(allSteps.length === 360, "the detailed report must contain 360 decisions");
requireCondition(pickedEvents.length === 360, "the canonical report must contain 360 pick events");
requireCondition(
  allSteps.every(
    (step) =>
      typeof step.eventSequence === "number" &&
      typeof step.boosterId === "string" &&
      (step.decisionTrace?.candidates?.length ?? 0) > 0,
  ),
  "every decision must contain its journal link, booster and candidate trace",
);
requireCondition(
  /^[a-f0-9]{64}$/.test(detailedReport.draftReport?.functionalDigest ?? ""),
  "the canonical report digest is missing",
);
requireCondition(
  boostersReport.initialBoosters?.length === 24,
  "the booster report must contain 24 boosters",
);
requireCondition(
  boostersReport.bombDefinition?.percentile === 0.05,
  "the bomb threshold must be top 5%",
);
requireCondition(bombCount === 21, "seed 42 must distribute 21 bomb instances");
requireCondition(
  boostersReport.initialBoosters?.every(
    (booster) => booster.p1PickCardInstanceId === undefined && booster.p1PickCardName === undefined,
  ),
  "booster data must not expose pick choices",
);
requireCondition(!boostersHtml.includes("P1 PICK"), "booster HTML must not render pick choices");
requireCondition(
  detailedHtml.includes("Fil du draft (45 Tours)"),
  "the global draft timeline is missing",
);
requireCondition(detailedHtml.includes("Le Rockeur"), "Le Rockeur is missing from detailed HTML");
requireCondition(boostersHtml.includes("Le Rockeur"), "Le Rockeur is missing from booster HTML");

console.log(
  `Verified schema v2 reports for seed ${String(seed)}: 24 boosters, ${String(bombCount)} bombs, 360 traced decisions.`,
);
