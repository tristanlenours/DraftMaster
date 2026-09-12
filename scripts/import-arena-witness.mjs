import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const DRAFT_ID = "bc4cdb9d-6412-43a1-84a2-d66b5dbed559";
const LEAGUE_ID = "powered_vintage";
const CUBE_KEY = "arena_powered";
const SNAPSHOT_ID = "2026-09-08";

const P9_NAMES = new Set([
  "Black Lotus",
  "Ancestral Recall",
  "Time Walk",
  "Timetwister",
  "Mox Pearl",
  "Mox Sapphire",
  "Mox Jet",
  "Mox Ruby",
  "Mox Emerald",
]);

function hashFile(filePath) {
  if (!fs.existsSync(filePath)) return "sha256:unknown";
  const buffer = fs.readFileSync(filePath);
  return `sha256:${crypto.createHash("sha256").update(buffer).digest("hex")}`;
}

function parseOldSchoolMana(raw) {
  if (!raw) return { manaCost: "", cmc: 0, colors: [] };
  const matches = raw.match(/o[0-9XWUBRG]+/g) || [];
  let cmc = 0;
  const colors = new Set();
  const parts = [];

  for (const m of matches) {
    const symbol = m.substring(1);
    parts.push(`{${symbol}}`);
    const num = parseInt(symbol, 10);
    if (!isNaN(num)) {
      cmc += num;
    } else if (["W", "U", "B", "R", "G"].includes(symbol)) {
      cmc += 1;
      colors.add(symbol);
    }
  }

  return {
    manaCost: parts.join(""),
    cmc,
    colors: Array.from(colors),
  };
}

const CARD_OVERRIDES = {
  "abhorrent oculus": {
    oracleText:
      "As an additional cost to cast this spell, exile six cards from your graveyard.\nFlying\nAt the beginning of each opponent's upkeep, manifest dread.",
    types: ["Creature"],
    staticScore: 42,
    cmc: 3,
    manaCost: "{2}{U}",
    colors: ["U"],
  },
  erode: {
    oracleText: "Destroy target tapped creature or enchantment.",
    types: ["Instant"],
    staticScore: 36,
    cmc: 1,
    manaCost: "{W}",
    colors: ["W"],
  },
  "floodfarm verge": {
    oracleText:
      "{T}: Add {C}.\n{T}: Add {W} or {U}. Activate only if you control a Plains or an Island.",
    types: ["Land"],
    isLand: true,
    producesColors: ["W", "U"],
    staticScore: 35,
    cmc: 0,
    colors: [],
  },
};

export async function importArenaWitness(options = {}) {
  const untappedPath =
    options.untappedPath ||
    path.join(
      process.env.USERPROFILE || "C:\\Users\\trist",
      "AppData",
      "Roaming",
      "untapped-companion",
      "drafts.json",
    );

  const playerLogPath =
    options.playerLogPath ||
    path.join(
      process.env.USERPROFILE || "C:\\Users\\trist",
      "AppData",
      "LocalLow",
      "Wizards Of The Coast",
      "MTGA",
      "Player-prev.log",
    );

  const rawDir =
    options.rawDir ||
    "C:\\Program Files\\Wizards of the Coast\\MTGA\\MTGA_Data\\Downloads\\Raw";

  if (!fs.existsSync(untappedPath)) {
    throw new Error(`Untapped drafts file not found at: ${untappedPath}`);
  }
  if (!fs.existsSync(playerLogPath)) {
    throw new Error(`Player log file not found at: ${playerLogPath}`);
  }

  // 1. Hashes for provenance
  const untappedHash = hashFile(untappedPath);
  const playerLogHash = hashFile(playerLogPath);

  // 2. Read Untapped Draft
  const rawDrafts = JSON.parse(fs.readFileSync(untappedPath, "utf8"));
  const draftData = rawDrafts[DRAFT_ID];
  if (!draftData) {
    throw new Error(`Draft ID ${DRAFT_ID} not found in ${untappedPath}`);
  }

  // 3. Read Player log for Course deck summary
  const logContent = fs.readFileSync(playerLogPath, "utf8");
  const courseRegex = new RegExp(
    `\\{"Courses":\\[\\{"CourseId":"${DRAFT_ID}"[^\\r\\n]+`,
  );
  const match = courseRegex.exec(logContent);
  if (!match) {
    throw new Error(`Course ${DRAFT_ID} not found in ${playerLogPath}`);
  }
  const courseJson = JSON.parse(match[0]);
  const course = courseJson.Courses[0];
  const courseDeck = course.CourseDeck;
  const currentLosses = Number(course.CurrentLosses ?? 3);

  // 4. Initialize SQLite MTGA Card database
  const rawFiles = fs.readdirSync(rawDir);
  const cardDbFile = rawFiles.find(
    (f) => f.startsWith("Raw_CardDatabase_") && f.endsWith(".mtga"),
  );
  if (!cardDbFile) {
    throw new Error(`No Raw_CardDatabase file found in ${rawDir}`);
  }
  const db = new DatabaseSync(path.join(rawDir, cardDbFile), { readOnly: true });
  const stmt = db.prepare(`
    SELECT c.GrpId, l.Loc as Name, c.OldSchoolManaText, c.Rarity, c.Types
    FROM Cards c
    LEFT JOIN Localizations_enUS l ON c.TitleId = l.LocId
    WHERE c.GrpId = ?
  `);

  // 5. Load item card catalog from data/cards/items
  const itemsDir = path.resolve("data/cards/items");
  const itemByName = new Map();
  if (fs.existsSync(itemsDir)) {
    for (const f of fs.readdirSync(itemsDir)) {
      if (f.endsWith(".json")) {
        try {
          const doc = JSON.parse(fs.readFileSync(path.join(itemsDir, f), "utf8"));
          if (doc.name) {
            itemByName.set(doc.name.toLowerCase().trim(), doc);
          }
        } catch {}
      }
    }
  }

  // Helper to resolve card info
  function resolveCard(grpId) {
    const row = stmt.get(Number(grpId));
    const name = row?.Name ? String(row.Name).trim() : `Card #${grpId}`;
    const lower = name.toLowerCase();
    const item = itemByName.get(lower) || CARD_OVERRIDES[lower];
    const { manaCost, cmc, colors } = parseOldSchoolMana(row?.OldSchoolManaText);

    const isLand =
      item?.isLand ??
      (name === "Island" ||
        name === "Plains" ||
        String(row?.Types || "").includes("5"));

    const resolvedColors =
      item?.colors ??
      (colors.length > 0
        ? colors
        : isLand
          ? name === "Island"
            ? ["U"]
            : name === "Plains"
              ? ["W"]
              : []
          : []);

    const producesColors =
      item?.producesColors ??
      (isLand ? (name === "Island" ? ["U"] : name === "Plains" ? ["W"] : []) : undefined);

    const staticScore =
      item?.powerScore?.score ?? item?.staticScore ?? (isLand ? 25 : 36);
    const resolvedCmc = item?.cmc ?? cmc;
    const types = item?.types ?? (isLand ? ["Land"] : ["Spell"]);
    const typeLine = item?.typeLine ?? (isLand ? "Land" : "Spell");
    const oracleText = item?.oracleText ?? "";
    const resolvedManaCost = item?.manaCost ?? manaCost;
    const oracleId = item?.oracleId;

    return {
      identity: {
        id: String(grpId),
        name,
        manaCost: resolvedManaCost,
        cmc: resolvedCmc,
        colors: resolvedColors,
        types,
        isLand,
      },
      evaluation: {
        id: String(grpId),
        name,
        staticScore,
        colors: resolvedColors,
        cmc: resolvedCmc,
        types,
        typeLine,
        isLand,
        ...(producesColors ? { producesColors } : {}),
        oracleText,
        manaCost: resolvedManaCost,
        ...(oracleId ? { oracleId } : {}),
      },
    };
  }

  // 6. Build picks
  const picks = [];
  const cardIdentities = {};
  const poolCardIds = [];

  for (let i = 0; i < draftData.picks.length; i++) {
    const p = draftData.picks[i];
    const pickedId = String(p.PickedCard);
    poolCardIds.push(pickedId);

    const offeredCardIds = p.DraftPack.map(String);
    for (const cardId of offeredCardIds) {
      if (!cardIdentities[cardId]) {
        cardIdentities[cardId] = resolveCard(cardId).identity;
      }
    }

    const staticScore = p.PackScores?.[p.PickedCard]?.staticScore;
    const dynamicScore = p.PackScores?.[p.PickedCard]?.dynamicScore;

    picks.push({
      packNumber: Number(p.PackNumber),
      pickNumber: Number(p.PickNumber),
      offeredCardIds,
      pickedCardId: pickedId,
      ...(staticScore !== undefined ? { staticScore } : {}),
      ...(dynamicScore !== undefined ? { dynamicScore } : {}),
    });
  }

  // 7. Build Main Deck & Sideboard
  const finalDeckCardIds = [];
  const deckEvaluationCards = [];

  for (const entry of courseDeck.MainDeck) {
    const cardId = String(entry.cardId);
    const qty = Number(entry.quantity);
    const { identity, evaluation } = resolveCard(cardId);
    cardIdentities[cardId] = identity;

    for (let q = 0; q < qty; q++) {
      finalDeckCardIds.push(cardId);
      deckEvaluationCards.push(evaluation);
    }
  }

  const sideboardCardIds = [];
  for (const entry of courseDeck.Sideboard) {
    const cardId = String(entry.cardId);
    const qty = Number(entry.quantity);
    const { identity } = resolveCard(cardId);
    cardIdentities[cardId] = identity;
    for (let q = 0; q < qty; q++) {
      sideboardCardIds.push(cardId);
    }
  }

  db.close();

  // 8. Check Power Nine
  const hasPowerNine = deckEvaluationCards.some((c) => P9_NAMES.has(c.name));

  // 9. Construct DraftWitness
  const draftWitness = {
    draftId: DRAFT_ID,
    source: "mtga_untapped",
    startedAt: draftData.startTime
      ? new Date(draftData.startTime).toISOString()
      : "2026-09-11T20:00:00.000Z",
    leagueId: LEAGUE_ID,
    cubeKey: CUBE_KEY,
    cubeSnapshotId: SNAPSHOT_ID,
    picks,
    poolCardIds,
    finalDeckCardIds,
    sideboardCardIds,
    cardIdentities,
    deckEvaluationCards,
    observedResults: {
      wins: 0,
      losses: currentLosses,
      matchCount: currentLosses,
      context: "Arena Powered Cube draft match record 0-3",
    },
    provenance: {
      extractedAt: new Date().toISOString(),
      method: "scripts/import-arena-witness.mjs",
      sourceHashes: {
        untappedDrafts: untappedHash,
        playerLog: playerLogHash,
      },
    },
  };

  // 10. Construct DeckWitness
  const deckWitness = {
    deckWitnessId: `deck-${DRAFT_ID}`,
    draftId: DRAFT_ID,
    leagueId: LEAGUE_ID,
    cubeKey: CUBE_KEY,
    cubeSnapshotId: SNAPSHOT_ID,
    expectedTier: "A",
    tierPlacement: "upper",
    annotation: {
      author: "Tristan",
      role: "expert_curator",
      reviewedAt: "2026-09-12T10:00:00.000Z",
      rationale:
        "High-quality Azorius control/tempo deck built on 11 September 2026 without any Power Nine cards. Coherent proactive curve and disruption package. The observed 0-3 match record is contextual variance and does not define the deck's intrinsic tier.",
      strengths: [
        "Proactive tempo curve with Tamiyo, Inquisitive Student and cheap disruption",
        "Strong card selection and interaction package",
        "Clean Azorius mana base",
      ],
      weaknesses: [
        "Absence of Power Nine artifacts or fast mana",
        "High vulnerability to aggressive early starts",
      ],
      confidence: "high",
    },
    hasPowerNine,
    observedResult: {
      wins: 0,
      losses: currentLosses,
      matchCount: currentLosses,
      context: "CubeDraft_Powered_20260908 0-3 run",
    },
    usagePolicy: "evaluation_only",
    finalDeckCardIds,
    deckEvaluationCards,
  };

  // 11. Construct LeagueWitnessCorpus
  const corpus = {
    schemaVersion: 1,
    corpusId: "arena-powered-2026-09-08-corpus",
    corpusVersion: "1.0.0",
    leagueCalibration: {
      leagueId: LEAGUE_ID,
      calibrationVersion: "1.0.0",
      status: "provisional",
      memberCubes: ["arena_powered", "candyshop"],
      tierThresholds: { S: 90, A: 80, B: 70, C: 60 },
      readinessPolicy: {
        minWitnessesPerTier: 3,
        minDraftWitnessesPerCube: 10,
        minDeckWitnessesPerCube: 15,
      },
      evidenceCounts: {
        tierCoverage: { S: 0, A: 1, B: 0, C: 0, D: 0 },
        draftsByCube: { arena_powered: 1, candyshop: 0 },
        decksByCube: { arena_powered: 1, candyshop: 0 },
      },
    },
    cubes: [
      {
        cubeKey: CUBE_KEY,
        snapshotId: SNAPSHOT_ID,
        name: "Arena Powered Cube",
      },
      {
        cubeKey: "candyshop",
        snapshotId: "2026-08-30",
        name: "Nico's Vintage Candyshop",
      },
    ],
    draftWitnesses: [draftWitness],
    deckWitnesses: [deckWitness],
    provenance: {
      extractedAt: new Date().toISOString(),
      method: "scripts/import-arena-witness.mjs",
      sourceHashes: {
        untappedDrafts: untappedHash,
        playerLog: playerLogHash,
      },
    },
    usagePolicy: "evaluation_only",
  };

  // 12. Write output files
  const outputDir = path.resolve(
    "tests/fixtures/golden-datasets/powered-vintage/arena-powered/2026-09-08",
  );
  const draftsDir = path.join(outputDir, "drafts");

  fs.mkdirSync(draftsDir, { recursive: true });

  const corpusFile = path.join(outputDir, "corpus.json");
  const draftFile = path.join(draftsDir, `${DRAFT_ID}.json`);

  fs.writeFileSync(corpusFile, JSON.stringify(corpus, null, 2) + "\n", "utf8");
  fs.writeFileSync(draftFile, JSON.stringify(draftWitness, null, 2) + "\n", "utf8");

  console.log(`Successfully generated witness corpus at: ${corpusFile}`);
  console.log(`Successfully generated draft witness at: ${draftFile}`);

  return { corpusFile, draftFile };
}

// CLI execution
if (
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))
) {
  importArenaWitness().catch((err) => {
    console.error("Extraction error:", err);
    process.exit(1);
  });
}
