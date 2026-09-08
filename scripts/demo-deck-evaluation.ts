import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  evaluateDeck,
  recommendDeckBuilds,
  type CardEvaluationInput,
  type KiviatRadarScores,
} from "../src/domain/coaching/index.ts";

interface RawCardMeta {
  readonly name: string;
  readonly colors: string[];
  readonly type_line: string;
  readonly mana_cost?: string;
  readonly cmc?: number;
  readonly oracle_text?: string;
  readonly produced_mana?: string[];
}

interface WitnessDraft {
  readonly recommendedDeck?: readonly string[];
  readonly picks?: readonly {
    readonly PickedCard?: string;
    readonly PackScores?: Record<string, { staticScore: number; dynamicScore: number }>;
  }[];
}

const BASIC_LAND_MAP: Record<string, { name: string; color: "W" | "U" | "B" | "R" | "G" }> = {
  // W - Plains
  "70400": { name: "Plains", color: "W" },
  "90783": { name: "Plains", color: "W" },
  "90789": { name: "Plains", color: "W" },
  "90790": { name: "Plains", color: "W" },
  "67604": { name: "Plains", color: "W" },
  "96836": { name: "Plains", color: "W" },

  // U - Island
  "70404": { name: "Island", color: "U" },
  "90784": { name: "Island", color: "U" },
  "90791": { name: "Island", color: "U" },
  "90792": { name: "Island", color: "U" },
  "87590": { name: "Island", color: "U" },
  "67612": { name: "Island", color: "U" },

  // B - Swamp
  "90785": { name: "Swamp", color: "B" },
  "90793": { name: "Swamp", color: "B" },
  "90794": { name: "Swamp", color: "B" },
  "87592": { name: "Swamp", color: "B" },

  // R - Mountain
  "70411": { name: "Mountain", color: "R" },
  "90786": { name: "Mountain", color: "R" },
  "90796": { name: "Mountain", color: "R" },
  "67628": { name: "Mountain", color: "R" },
  "96842": { name: "Mountain", color: "R" },
  "83970": { name: "Mountain", color: "R" },
  "92379": { name: "Mountain", color: "R" },

  // G - Forest
  "70415": { name: "Forest", color: "G" },
  "70416": { name: "Forest", color: "G" },
  "90787": { name: "Forest", color: "G" },
  "90797": { name: "Forest", color: "G" },
  "90798": { name: "Forest", color: "G" },
  "87596": { name: "Forest", color: "G" },
  "83971": { name: "Forest", color: "G" },
  "92381": { name: "Forest", color: "G" },
};

function renderBar(score: number, width = 20): string {
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

function runDemo(): void {
  const historyPath = resolve("data/untapped_history/drafts_backup.json");
  const metaPath = resolve("data/untapped_history/card-metadata-v1.json");

  if (!existsSync(historyPath) || !existsSync(metaPath)) {
    console.error("Fichiers de données historiques introuvables.");
    return;
  }

  const drafts = JSON.parse(readFileSync(historyPath, "utf-8")) as Record<string, WitnessDraft>;
  const meta = JSON.parse(readFileSync(metaPath, "utf-8")) as Record<string, RawCardMeta>;

  const validDraftIds = Object.keys(drafts).filter(
    (id) => drafts[id]?.recommendedDeck && Object.keys(drafts[id].recommendedDeck).length === 40,
  );

  const arg = process.argv[2];
  let selectedDraftId: string;
  if (arg && arg !== "--random" && drafts[arg]) {
    selectedDraftId = arg;
  } else if (arg === "--witness") {
    selectedDraftId = "d555b02d-3745-4a4f-b1b6-fdc75c38c5c0";
  } else {
    // Pick random draft among valid ones
    const randIdx = Math.floor(Math.random() * validDraftIds.length);
    selectedDraftId = validDraftIds[randIdx];
  }

  const witness = drafts[selectedDraftId];
  if (!witness?.recommendedDeck) {
    console.error("Draft introuvable :", selectedDraftId);
    return;
  }
  console.log(`\n🎲 Draft sélectionné : ${selectedDraftId} (${validDraftIds.indexOf(selectedDraftId) + 1}/${validDraftIds.length})`);

  // Extract static scores from picks
  const staticScoresMap = new Map<string, number>();
  const pickedCardIds: string[] = [];
  for (const pick of witness.picks ?? []) {
    if (pick.PickedCard) {
      pickedCardIds.push(pick.PickedCard);
    }
    if (pick.PackScores) {
      for (const [id, scoreObj] of Object.entries(pick.PackScores)) {
        staticScoresMap.set(id, scoreObj.staticScore);
      }
    }
  }

  const parseCard = (id: string): CardEvaluationInput => {
    if (BASIC_LAND_MAP[id]) {
      const b = BASIC_LAND_MAP[id];
      return {
        id,
        name: b.name,
        colors: [],
        typeLine: `Basic Land — ${b.name}`,
        isLand: true,
        manaCost: "",
        cmc: 0,
        staticScore: 5,
        producesColors: [b.color],
        oracleText: `{T}: Add {${b.color}}.`,
      };
    }
    const m = meta[id];
    if (!m) throw new Error(`Missing card ${id}`);
    const isLand = m.type_line.toLowerCase().includes("land");
    const staticScore = staticScoresMap.get(id) ?? (isLand ? 5 : 25);
    let cmc = m.cmc ?? 0;
    if (cmc > 100) cmc = 2; // Sanitize {X}{X} anomalies in Arena metadata
    return {
      id,
      name: m.name,
      colors: (m.colors ?? []) as ("W" | "U" | "B" | "R" | "G")[],
      typeLine: m.type_line,
      manaCost: m.mana_cost ?? "",
      cmc,
      isLand,
      producesColors: (m.produced_mana ?? []) as ("W" | "U" | "B" | "R" | "G")[],
      staticScore,
      oracleText: m.oracle_text ?? "",
    };
  };

  const deckCards = witness.recommendedDeck.map(parseCard);
  const evaluation = evaluateDeck(deckCards);

  console.log("==========================================================================================");
  console.log("       DRAFTMASTER - ÉVALUATION FINALE DU DECK & RADAR KIVIAT 5 AXES");
  console.log("==========================================================================================\n");

  console.log(`📌 Archétype identifié : ${evaluation.archetype.label}`);
  console.log(`   ${evaluation.archetype.description}`);
  console.log(`\n🏆 SCORE GLOBAL : ${evaluation.overallScore} / 100\n`);

  console.log("🃏 COMPOSITION DU DECK (40 CARTES) :");
  console.log("------------------------------------------------------------------------------------------");
  const spells = deckCards.filter((c) => !c.isLand).sort((a, b) => (a.cmc ?? 0) - (b.cmc ?? 0));
  const lands = deckCards.filter((c) => c.isLand);
  console.log(`Sorts (${spells.length}) :`);
  for (const s of spells) {
    const cost = s.manaCost || (s.cmc === 0 ? "{0}" : `{${s.cmc}}`);
    console.log(`  • ${s.name.padEnd(28)} ${cost.padEnd(10)} [Score Untapped : ${s.staticScore}] (${s.typeLine})`);
  }
  console.log(`\nTerrains (${lands.length}) :`);
  const landCounts: Record<string, number> = {};
  for (const l of lands) landCounts[l.name] = (landCounts[l.name] || 0) + 1;
  for (const [name, count] of Object.entries(landCounts)) {
    console.log(`  • ${count}x ${name}`);
  }
  console.log("------------------------------------------------------------------------------------------\n");

  console.log("📊 GRAPHE DE KIVIAT (RADAR 5 AXES NORMALISÉ) :");
  console.log("------------------------------------------------------------------------------------------");
  const axes: { name: string; key: keyof KiviatRadarScores; weight: string }[] = [
    { name: "Puissance Brute", key: "power", weight: "20%" },
    { name: "Synergie & Cohérence", key: "synergy", weight: "25%" },
    { name: "Fluidité de Courbe", key: "curve", weight: "20%" },
    { name: "Base de Mana & Sources", key: "mana", weight: "20%" },
    { name: "Densité d'Interaction", key: "interaction", weight: "15%" },
  ];

  for (const axis of axes) {
    const val = evaluation.radar[axis.key];
    const bar = renderBar(val);
    console.log(`  ${axis.name.padEnd(25)} [${bar}] ${String(val).padStart(3)}/100 (Poids: ${axis.weight})`);
  }
  console.log("------------------------------------------------------------------------------------------\n");

  if (evaluation.strengths.length > 0) {
    console.log("💪 Points forts :");
    for (const s of evaluation.strengths) console.log(`   ✓ ${s}`);
    console.log();
  }

  if (evaluation.weaknesses.length > 0) {
    console.log("⚠️ Points d'attention :");
    for (const w of evaluation.weaknesses) console.log(`   ! ${w}`);
    console.log();
  }

  // Also test automatic build recommendations on the 45-card pool
  const poolCards = pickedCardIds.map(parseCard);
  const buildOptions = recommendDeckBuilds(poolCards);

  console.log("==========================================================================================");
  console.log("       PROPOSITIONS DE BUILDS RECOMMANDÉES PAR L'ASSISTANT");
  console.log("==========================================================================================\n");

  for (const opt of buildOptions) {
    console.log(`🌟 ${opt.title}`);
    console.log(`   Score Global : ${opt.evaluation.overallScore}/100 | Sorts : ${opt.evaluation.spellsCount} | Terrains : ${opt.evaluation.landsCount}`);
    console.log(`   Radar : Puissance ${opt.evaluation.radar.power} | Synergie ${opt.evaluation.radar.synergy} | Courbe ${opt.evaluation.radar.curve} | Mana ${opt.evaluation.radar.mana} | Interaction ${opt.evaluation.radar.interaction}`);
    console.log("------------------------------------------------------------------------------------------");
  }
}

runDemo();
