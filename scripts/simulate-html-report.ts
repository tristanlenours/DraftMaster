import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { runDetailedDraftSimulation } from "../src/simulation/detailed-simulation.ts";
import { generateDetailedDraftHtml } from "../src/simulation/html-report-generator.ts";
import { generateBoosterDistributionHtml } from "../src/simulation/booster-distribution-html.ts";

function parseCliArgs(args: readonly string[]): {
  readonly seed: number;
  readonly cubePath: string;
  readonly outPath: string;
} {
  let seed = 42;
  let cubePath = "data/cubes/titou_tribal/2026-02-24.1.json";
  let outPath: string | undefined;

  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];
    if (!flag || !flag.startsWith("--") || !value) {
      continue;
    }

    if (flag === "--seed") {
      const parsed = Number(value);
      if (Number.isInteger(parsed)) {
        seed = parsed;
      }
    } else if (flag === "--cube") {
      cubePath = value;
    } else if (flag === "--out" || flag === "--output") {
      outPath = value;
    }
  }

  if (!outPath) {
    outPath = `reports/draft-titou-seed-${String(seed)}.html`;
  }

  return { seed, cubePath, outPath };
}

export async function main(): Promise<void> {
  const { seed, cubePath, outPath } = parseCliArgs(process.argv.slice(2));

  console.log("==========================================================================================");
  console.log("       DRAFTMASTER — SIMULATION DÉTAILLÉE DU TITOU TRIBAL CUBE & RAPPORT 17LANDS");
  console.log("==========================================================================================");
  console.log(`📍 Cube Snapshot : ${cubePath}`);
  console.log(`🎲 Graine (Seed) : ${String(seed)}`);
  console.log(`📄 Sortie HTML   : ${outPath}`);
  console.log("------------------------------------------------------------------------------------------");
  console.log("⏳ Lancement de la simulation (8 bots x 3 packs x 15 picks = 360 décisions)...");

  const startTime = Date.now();
  const simResult = await runDetailedDraftSimulation({
    cubePath,
    seed,
  });

  if (!simResult.ok) {
    console.error("❌ Erreur lors de la simulation :", simResult.error);
    process.exit(1);
  }

  const report = simResult.value;
  const elapsed = Date.now() - startTime;
  console.log(`✅ Simulation terminée avec succès en ${String(elapsed)} ms !`);
  console.log("------------------------------------------------------------------------------------------");
  console.log("📊 Résumé des 8 Decks finaux construits (23 cartes sorts + 17 terrains) :");

  for (const seat of report.seats) {
    const d = seat.finalDeck;
    console.log(
      `   • Siège ${String(seat.seatId)} [${seat.botName.padEnd(16, " ")}] : ${d.archetype.label.padEnd(30, " ")} | Score: ${String(d.overallScore).padStart(3, " ")}/100 (P:${String(d.macroAxes.power)} S:${String(d.macroAxes.synergy)} R:${String(d.macroAxes.consistency)})`,
    );
  }

  console.log("------------------------------------------------------------------------------------------");
  console.log("🎨 Génération des fichiers HTML interactifs...");

  // 1. Rapport 17Lands (Walkthrough 45 écrans & Decks finaux)
  const html = generateDetailedDraftHtml(report);
  const fullOutPath = resolve(process.cwd(), outPath);
  await mkdir(dirname(fullOutPath), { recursive: true });
  await writeFile(fullOutPath, html, "utf8");

  // 2. Rapport Répartition des 360 cartes en 24 boosters
  const boostersHtml = generateBoosterDistributionHtml(report);
  const boostersOutPath = outPath.replace(/\.html$/i, "-boosters.html");
  const fullBoostersOutPath = resolve(process.cwd(), boostersOutPath);
  await writeFile(fullBoostersOutPath, boostersHtml, "utf8");

  const fileUrl = pathToFileURL(fullOutPath).href;
  const boostersFileUrl = pathToFileURL(fullBoostersOutPath).href;
  console.log(`🎉 1. Rapport 17Lands (Walkthrough & Decks) :`);
  console.log(`   🔗 Fichier : ${fullOutPath}`);
  console.log(`   🌐 Ouvrir  : ${fileUrl}`);
  console.log(`🎉 2. Rapport 360 Cartes (24 Boosters) :`);
  console.log(`   🔗 Fichier : ${fullBoostersOutPath}`);
  console.log(`   🌐 Ouvrir  : ${boostersFileUrl}`);
  console.log("==========================================================================================");
}

const isMainModule =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  await main();
}
