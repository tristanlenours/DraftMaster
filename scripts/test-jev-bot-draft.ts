import fs from "node:fs";
import path from "node:path";
import { LlmRouter } from "../src/companion/llm-router.ts";
import {
  CEDRIC_PROFILE,
  HUGUES_PROFILE,
  IVAN_PROFILE,
  NICO_PROFILE,
  PAPAYOU_PROFILE,
  THEO_PROFILE,
  TITOU_PROFILE,
} from "../src/bots/friends/profiles.ts";
import {
  buildJevDraftContext,
  chooseWithJevBot,
  loadCubeCardsWithScores,
} from "../src/bots/jev/jev-bot-decision.ts";
import type { CardEvaluationInput } from "../src/domain/coaching/types.ts";

try {
  process.loadEnvFile?.();
} catch {}
try {
  process.loadEnvFile?.(".env.local");
} catch {}

async function runJevBotDraftDemo(): Promise<void> {
  console.log("\n=========================================================================================");
  console.log("  🤖 DRAFTMASTER - JEV 'SYSTEM ONE' MULTI-BOT PERSONALITY TEST");
  console.log("=========================================================================================");

  const router = new LlmRouter();
  if (!router.hasJevKey()) {
    console.error("❌ ERREUR : Aucune clé JEV/OpenRouter active.");
    process.exit(1);
  }

  // Load Nico's Candyshop Cube Meta
  const cubeMetaPath = path.resolve("data/cubes/nico_candyshop/cube-meta.json");
  const cubeMeta = JSON.parse(fs.readFileSync(cubeMetaPath, "utf8"));
  const cubeCards = loadCubeCardsWithScores("nico_candyshop");

  console.log(`📦 Cube : ${cubeMeta.name} (Tier: ${cubeMeta.powerTier}, Rythme: ${cubeMeta.pacing})`);
  console.log(`⚡ Fenêtre critique : ${cubeMeta.fundamentalTurn.criticalWindow}`);
  console.log(`🎯 Nombre d'archétypes configurés : ${String(cubeMeta.archetypes.length)}`);
  console.log(`💎 Cartes du cube chargées avec puissance brute : ${String(cubeCards.length)} cartes injectées`);

  // Sample check on prompt size
  const sampleContext = buildJevDraftContext({
    cubeMeta,
    cubeCards,
    profile: THEO_PROFILE,
    packNumber: 1,
    pickNumber: 1,
    offeredCards: [
      { id: "b1", name: "Mana Drain", manaCost: "{U}{U}", cmc: 2, colors: ["U"], types: ["Instant"], isLand: false, staticScore: 45 },
    ],
    priorPool: [],
  });
  const approxTokens = Math.round(sampleContext.state.length / 4);
  console.log(`📊 Taille du contexte d'entrée : ~${String(approxTokens)} tokens (${String(sampleContext.state.length)} caractères)\n`);

  // Realistic Vintage Booster with divergent archetypes
  const sampleBooster: CardEvaluationInput[] = [
    {
      id: "b1",
      name: "Mana Drain",
      manaCost: "{U}{U}",
      cmc: 2,
      colors: ["U"],
      types: ["Instant"],
      isLand: false,
      oracleText: "Counter target spell. At the beginning of your next main phase, add mana equal to that spell's mana value.",
      staticScore: 45,
    },
    {
      id: "b2",
      name: "Griselbrand",
      manaCost: "{4}{B}{B}{B}{B}",
      cmc: 8,
      colors: ["B"],
      types: ["Creature"],
      isLand: false,
      oracleText: "Flying, lifelink. Pay 7 life: Draw seven cards.",
      staticScore: 48,
    },
    {
      id: "b3",
      name: "Primeval Titan",
      manaCost: "{4}{G}{G}",
      cmc: 6,
      colors: ["G"],
      types: ["Creature"],
      isLand: false,
      oracleText: "Trample. Whenever this creature enters or attacks, search your library for up to two land cards.",
      staticScore: 44,
    },
    {
      id: "b4",
      name: "Tinker",
      manaCost: "{2}{U}",
      cmc: 3,
      colors: ["U"],
      types: ["Sorcery"],
      isLand: false,
      oracleText: "As an additional cost, sacrifice an artifact. Search your library for an artifact card and put it onto the battlefield.",
      staticScore: 47,
    },
    {
      id: "b5",
      name: "Swords to Plowshares",
      manaCost: "{W}",
      cmc: 1,
      colors: ["W"],
      types: ["Instant"],
      isLand: false,
      oracleText: "Exile target creature. Its controller gains life equal to its power.",
      staticScore: 46,
    },
    {
      id: "b6",
      name: "Mox Diamond",
      manaCost: "{0}",
      cmc: 0,
      colors: [],
      types: ["Artifact"],
      isLand: false,
      oracleText: "Discard a land card: Add one mana of any color.",
      staticScore: 49,
    },
    {
      id: "b7",
      name: "Muxus, Goblin Grandee",
      manaCost: "{4}{R}{R}",
      cmc: 6,
      colors: ["R"],
      types: ["Creature"],
      isLand: false,
      oracleText: "When Muxus enters, reveal the top six cards of your library. Put all Goblin creature cards with mana value 5 or less onto the battlefield.",
      staticScore: 41,
    },
  ];

  // Test 7 different Bot Personalities drafting the EXACT SAME booster concurrently
  const botsToTest = [
    { profile: NICO_PROFILE, desc: "Nico (Big Nixos) - Le Spike : cheap interaction & low curve" },
    { profile: CEDRIC_PROFILE, desc: "Cédric (Jakko) - Propreté & Value : low curve, Moxen, 2-for-1s" },
    { profile: THEO_PROFILE, desc: "Théo - Spécialiste Réanimation : Griselbrand, Atraxa, cheat" },
    { profile: HUGUES_PROFILE, desc: "Hugues - Weird Engines : Tinker, artefacts & combos non-linéaires" },
    { profile: IVAN_PROFILE, desc: "Ivan - Gros Ramp & Finisseurs : Primeval Titan, grosses créatures" },
    { profile: TITOU_PROFILE, desc: "Titou - Tribal Lord : Seigneurs de créatures, gobelins & synergies" },
    { profile: PAPAYOU_PROFILE, desc: "Papayou - Légendes & Bombs : Menaces légendaires & flexibilité" },
  ];

  console.log("⚡ Exécution des 7 bots JEV EN PARALLÈLE sur le même booster...");
  const tGlobalStart = performance.now();

  const botPromises = botsToTest.map(async (bot) => {
    const res = await chooseWithJevBot({
      router,
      cubeMeta,
      profile: bot.profile,
      packNumber: 1,
      pickNumber: 1,
      offeredCards: sampleBooster,
      priorPool: [],
    });
    return { ...bot, res };
  });

  const allBotResults = await Promise.all(botPromises);
  const totalDuration = Math.round(performance.now() - tGlobalStart);

  console.log(`⏱️  Temps total pour résoudre les 7 bots en simultané : ${String(totalDuration)} ms !\n`);

  console.log("-----------------------------------------------------------------------------------------");
  console.log("  RÉSULTATS DES CHOIX DES BOTS (AVEC INJECTION DES BIAIS & ARCHÉTYPES DANS JEV)");
  console.log("-----------------------------------------------------------------------------------------");

  for (const { desc, res } of allBotResults) {
    const probStr = `${(res.choiceProb * 100).toFixed(0)}%`.padStart(4);
    const latencyStr = `${String(res.latencyMs)} ms`.padStart(7);
    console.log(`🤖 ${desc.padEnd(68)}`);
    console.log(`   👉 Choix JEV : ${res.cardName.padEnd(25)} (Probabilité: ${probStr} | Latence: ${latencyStr})`);
  }

  // -------------------------------------------------------------------------------------
  // TEST DE CONTEXTE ÉTENDU : Bot en milieu de draft (P2P3) avec historique de pool
  // -------------------------------------------------------------------------------------
  console.log("\n-----------------------------------------------------------------------------------------");
  console.log("  TEST CONTEXTE ÉTENDU (P2P3) : Bot Réanimateur avec 15 cartes déjà draftées");
  console.log("-----------------------------------------------------------------------------------------");

  const reanimatorPool: CardEvaluationInput[] = [
    { id: "p1", name: "Entomb", manaCost: "{B}", cmc: 1, colors: ["B"], types: ["Instant"], isLand: false, staticScore: 47 },
    { id: "p2", name: "Animate Dead", manaCost: "{1}{B}", cmc: 2, colors: ["B"], types: ["Enchantment"], isLand: false, staticScore: 45 },
    { id: "p3", name: "Reanimate", manaCost: "{B}", cmc: 1, colors: ["B"], types: ["Sorcery"], isLand: false, staticScore: 46 },
    { id: "p4", name: "Thoughtseize", manaCost: "{B}", cmc: 1, colors: ["B"], types: ["Sorcery"], isLand: false, staticScore: 44 },
    { id: "p5", name: "Underground Sea", manaCost: "", cmc: 0, colors: ["U", "B"], types: ["Land"], isLand: true, staticScore: 48 },
    { id: "p6", name: "Polluted Delta", manaCost: "", cmc: 0, colors: [], types: ["Land"], isLand: true, staticScore: 49 },
    { id: "p7", name: "Brainstorm", manaCost: "{U}", cmc: 1, colors: ["U"], types: ["Instant"], isLand: false, staticScore: 39 },
    { id: "p8", name: "Careful Study", manaCost: "{U}", cmc: 1, colors: ["U"], types: ["Sorcery"], isLand: false, staticScore: 36 },
    { id: "p9", name: "Force of Will", manaCost: "{3}{U}{U}", cmc: 5, colors: ["U"], types: ["Instant"], isLand: false, staticScore: 50 },
    { id: "p10", name: "Daze", manaCost: "{1}{U}", cmc: 2, colors: ["U"], types: ["Instant"], isLand: false, staticScore: 40 },
    { id: "p11", name: "Watery Grave", manaCost: "", cmc: 0, colors: ["U", "B"], types: ["Land"], isLand: true, staticScore: 42 },
    { id: "p12", name: "Lotus Petal", manaCost: "{0}", cmc: 0, colors: [], types: ["Artifact"], isLand: false, staticScore: 41 },
    { id: "p13", name: "Dark Ritual", manaCost: "{B}", cmc: 1, colors: ["B"], types: ["Instant"], isLand: false, staticScore: 40 },
    { id: "p14", name: "Vampiric Tutor", manaCost: "{B}", cmc: 1, colors: ["B"], types: ["Instant"], isLand: false, staticScore: 46 },
    { id: "p15", name: "Fatal Push", manaCost: "{B}", cmc: 1, colors: ["B"], types: ["Instant"], isLand: false, staticScore: 38 },
  ];

  const midDraftBooster: CardEvaluationInput[] = [
    {
      id: "mb1",
      name: "Atraxa, Grand Unifier",
      manaCost: "{3}{G}{W}{U}{B}",
      cmc: 7,
      colors: ["G", "W", "U", "B"],
      types: ["Creature"],
      isLand: false,
      oracleText: "Flying, vigilance, deathtouch, lifelink. When Atraxa enters, look at the top ten cards of your library. Put one card of each card type into your hand.",
      staticScore: 49,
    },
    {
      id: "mb2",
      name: "Wrath of God",
      manaCost: "{2}{W}{W}",
      cmc: 4,
      colors: ["W"],
      types: ["Sorcery"],
      isLand: false,
      oracleText: "Destroy all creatures.",
      staticScore: 40,
    },
    {
      id: "mb3",
      name: "Lightning Bolt",
      manaCost: "{R}",
      cmc: 1,
      colors: ["R"],
      types: ["Instant"],
      isLand: false,
      oracleText: "Lightning Bolt deals 3 damage to any target.",
      staticScore: 43,
    },
    {
      id: "mb4",
      name: "Llanowar Elves",
      manaCost: "{G}",
      cmc: 1,
      colors: ["G"],
      types: ["Creature"],
      isLand: false,
      oracleText: "{T}: Add {G}.",
      staticScore: 38,
    },
  ];

  const midRes = await chooseWithJevBot({
    router,
    cubeMeta,
    profile: THEO_PROFILE,
    packNumber: 2,
    pickNumber: 3,
    offeredCards: midDraftBooster,
    priorPool: reanimatorPool,
  });

  console.log(`🤖 Bot : Théo (Pool Dimir Reanimator, 15 cartes en poche)`);
  console.log(`   Booster offert : Atraxa, Grand Unifier | Wrath of God | Lightning Bolt | Llanowar Elves`);
  console.log(`   👉 Choix JEV : ${midRes.cardName} (${(midRes.choiceProb * 100).toFixed(0)}% probabilité, ${String(midRes.latencyMs)}ms)`);
  console.log(`   💡 Distribution complète : ${JSON.stringify(midRes.probabilities)}`);

  console.log("\n=========================================================================================");
  console.log("  🎉 SUCCÈS TOTAL DU SYSTÈME MULTI-BOTS JEV AVEC INJECTION DES BIAIS !");
  console.log("=========================================================================================\n");
}

runJevBotDraftDemo().catch((err) => {
  console.error("❌ Erreur :", err);
  process.exit(1);
});
