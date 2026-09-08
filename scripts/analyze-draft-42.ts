/**
 * Quick analysis script: verify 360 cards integrity and count bombs for seed 42.
 */
import { runDetailedDraftSimulation } from "../src/simulation/detailed-simulation.ts";

const result = await runDetailedDraftSimulation({ seed: 42 });
if (!result.ok) {
  console.error("Simulation failed:", result.error);
  process.exit(1);
}

const report = result.value;
const boosters = report.initialBoosters ?? [];
const allCards = boosters.flatMap((b) => b.cards);

// 1. Total card count
console.log(`\n=== DRAFT 42 — INTEGRITY CHECK ===`);
console.log(`Total cards: ${allCards.length}`);
console.log(`Total boosters: ${boosters.length}`);

// 2. All unique?
const instanceIds = allCards.map((c) => c.instanceId);
const uniqueInstances = new Set(instanceIds);
console.log(`Unique instance IDs: ${uniqueInstances.size}`);
console.log(`All unique? ${uniqueInstances.size === allCards.length ? "✅ YES" : "❌ NO — DUPLICATES FOUND"}`);

// 3. Unique oracle IDs (distinct card names)
const oracleIds = new Set(allCards.map((c) => c.oracleId));
const cardNames = new Set(allCards.map((c) => c.name));
console.log(`Distinct oracle IDs: ${oracleIds.size}`);
console.log(`Distinct card names: ${cardNames.size}`);

// 4. Score distribution
const scores = allCards.map((c) => c.staticScore).sort((a, b) => b - a);
const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
console.log(`\n=== SCORE DISTRIBUTION ===`);
console.log(`Score range: ${Math.min(...scores)} — ${Math.max(...scores)}`);
console.log(`Average: ${avg.toFixed(1)}`);

// Tier buckets
const fire = allCards.filter((c) => c.staticScore >= 40);
const gold = allCards.filter((c) => c.staticScore >= 28 && c.staticScore < 40);
const silver = allCards.filter((c) => c.staticScore >= 14 && c.staticScore < 28);
const bronze = allCards.filter((c) => c.staticScore >= 6 && c.staticScore < 14);
const weak = allCards.filter((c) => c.staticScore < 6);

console.log(`\n=== TIER BREAKDOWN ===`);
console.log(`🔥 Fire (≥40):   ${fire.length} cards`);
console.log(`🥇 Gold (28-39):  ${gold.length} cards`);
console.log(`🥈 Silver (14-27): ${silver.length} cards`);
console.log(`🥉 Bronze (6-13):  ${bronze.length} cards`);
console.log(`💀 Weak (<6):     ${weak.length} cards`);

// 5. Top 20 bombs
console.log(`\n=== TOP 20 BOMBS (highest staticScore) ===`);
const sorted = [...allCards].sort((a, b) => b.staticScore - a.staticScore);
for (let i = 0; i < Math.min(20, sorted.length); i++) {
  const c = sorted[i]!;
  const booster = boosters.find((b) => b.cards.some((bc) => bc.instanceId === c.instanceId));
  console.log(
    `  ${String(i + 1).padStart(2)}. ${c.name.padEnd(35)} score=${String(c.staticScore).padStart(4)}  Pack${booster?.packNumber} Seat${booster?.originSeatId} (${booster?.originBotName})`,
  );
}

// 6. Bomb count
console.log(`\n=== BOMB COUNT (score ≥ 40) ===`);
console.log(`Bombs: ${fire.length} / ${allCards.length} cards`);

// 7. Per-seat bomb distribution
console.log(`\n=== BOMBS PER INITIAL SEAT ===`);
for (let s = 0; s < 8; s++) {
  const seatBoosters = boosters.filter((b) => b.originSeatId === s);
  const seatCards = seatBoosters.flatMap((b) => b.cards);
  const seatBombs = seatCards.filter((c) => c.staticScore >= 40);
  const botName = seatBoosters[0]?.originBotName ?? `Seat ${s}`;
  console.log(`  Seat ${s} (${botName.padEnd(10)}): ${seatBombs.length} bombs / ${seatCards.length} cards`);
}

// 8. Verify against cube snapshot
console.log(`\n=== CUBE MEMBERSHIP CHECK ===`);
const snapshotPath = "data/cubes/titou_tribal/snapshot.json";
const fs = await import("node:fs/promises");
const raw = await fs.readFile(snapshotPath, "utf-8");
const snapshot = JSON.parse(raw);
const cubeCardNames = new Set(snapshot.cards.map((c: { name: string }) => c.name));
console.log(`Cube snapshot card count: ${cubeCardNames.size}`);

const notInCube = allCards.filter((c) => !cubeCardNames.has(c.name));
if (notInCube.length === 0) {
  console.log(`All 360 draft cards belong to the cube? ✅ YES`);
} else {
  console.log(`❌ ${notInCube.length} cards NOT in cube:`);
  for (const c of notInCube) {
    console.log(`  - ${c.name}`);
  }
}

// Basic lands check
const basicLands = allCards.filter((c) =>
  ["Plains", "Island", "Swamp", "Mountain", "Forest"].includes(c.name),
);
console.log(`Basic lands in draft: ${basicLands.length}`);
