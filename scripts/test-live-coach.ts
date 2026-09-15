import { LlmRouter } from "../src/companion/llm-router.ts";
import { getUnifiedDraftAdvice } from "../src/domain/coaching/draft-coach-service.ts";
import type { CardEvaluationInput } from "../src/domain/coaching/types.ts";
import { loadCoachContext } from "../src/cubes/coach-context.ts";

try {
  process.loadEnvFile?.();
} catch {
  // .env is optional
}
try {
  process.loadEnvFile?.(".env.local");
} catch {
  // .env.local is optional
}

async function runLiveCoachSmokeTest(): Promise<void> {
  console.log("\n============================================================");
  console.log("  🧙 DRAFTMASTER - LIVE AI COACH DIAGNOSTIC SMOKE TEST");
  console.log("============================================================\n");

  const router = new LlmRouter();
  const hasKeys = router.hasConfiguredKeys();
  const geminiCount = router.getGeminiKeyCount();
  const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_PREMIUM_API_KEY);

  console.log(`🔑 Clés détectées :`);
  console.log(`   - OpenRouter (DeepSeek V3) : ${hasOpenRouter ? "✅ Configuré" : "❌ Non configuré"}`);
  console.log(`   - Gemini Flash (Free Tier) : ${geminiCount > 0 ? `✅ ${String(geminiCount)} clé(s) configurée(s)` : "❌ Aucune clé"}`);

  if (!hasKeys) {
    console.warn("\n⚠️ Aucune clé API configurée. Ce test nécessite une clé OpenRouter ou Gemini dans .env ou .env.local.");
    console.log("Exécution interrompue sans erreur (mode hors-ligne actif).\n");
    return;
  }

  console.log("\n📦 Chargement du contexte de cube (titou_tribal)...");
  const ctxResult = await loadCoachContext(process.cwd(), "titou_tribal");
  if (!ctxResult.ok) {
    throw new Error(`Impossible de charger CoachContext : ${ctxResult.error.message}`);
  }
  const coachContext = ctxResult.value;

  // Build a realistic 15-card pack from catalog
  const sampleCards: CardEvaluationInput[] = [
    { id: "c1", name: "Sol Ring", colors: [], staticScore: 50, cmc: 1, types: ["Artifact"], oracleText: "{T}: Add {C}{C}." },
    { id: "c2", name: "Lightning Bolt", colors: ["R"], staticScore: 45, cmc: 1, types: ["Instant"], oracleText: "Lightning Bolt deals 3 damage to any target." },
    { id: "c3", name: "Ocelot Pride", colors: ["W"], staticScore: 48, cmc: 1, types: ["Creature"], oracleText: "First strike, lifelink." },
    { id: "c4", name: "Counterspell", colors: ["U"], staticScore: 42, cmc: 2, types: ["Instant"], oracleText: "Counter target spell." },
    { id: "c5", name: "Dark Ritual", colors: ["B"], staticScore: 40, cmc: 1, types: ["Instant"], oracleText: "Add {B}{B}{B}." },
    { id: "c6", name: "Birds of Paradise", colors: ["G"], staticScore: 42, cmc: 1, types: ["Creature"], oracleText: "Flying. {T}: Add one mana of any color." },
    { id: "c7", name: "Goblin Guide", colors: ["R"], staticScore: 38, cmc: 1, types: ["Creature"], oracleText: "Haste." },
    { id: "c8", name: "Swords to Plowshares", colors: ["W"], staticScore: 47, cmc: 1, types: ["Instant"], oracleText: "Exile target creature." },
    { id: "c9", name: "Brainstorm", colors: ["U"], staticScore: 39, cmc: 1, types: ["Instant"], oracleText: "Draw three cards, then put two cards from your hand on top of your library in any order." },
    { id: "c10", name: "Thoughtseize", colors: ["B"], staticScore: 44, cmc: 1, types: ["Sorcery"], oracleText: "Target player reveals their hand. You choose a nonland card from it." },
    { id: "c11", name: "Wrath of God", colors: ["W"], staticScore: 43, cmc: 4, types: ["Sorcery"], oracleText: "Destroy all creatures. They can't be regenerated." },
    { id: "c12", name: "Demonic Tutor", colors: ["B"], staticScore: 49, cmc: 2, types: ["Sorcery"], oracleText: "Search your library for a card, put that card into your hand, then shuffle." },
    { id: "c13", name: "Monastery Swiftspear", colors: ["R"], staticScore: 35, cmc: 1, types: ["Creature"], oracleText: "Haste, prowess." },
    { id: "c14", name: "Eternal Witness", colors: ["G"], staticScore: 37, cmc: 3, types: ["Creature"], oracleText: "When Eternal Witness enters the battlefield, return target card from your graveyard to your hand." },
    { id: "c15", name: "Snapcaster Mage", colors: ["U"], staticScore: 45, cmc: 2, types: ["Creature"], oracleText: "Flash. When Snapcaster Mage enters, target instant or sorcery card in your graveyard gains flashback." },
  ];

  // -------------------------------------------------------------------------
  // TEST 1: Pack 1 Pick 1 Advice
  // -------------------------------------------------------------------------
  console.log("\n🧪 TEST 1 : Requête live Conseil P1P1 (Pack de 15 cartes)...");
  const t1Start = performance.now();
  const adviceP1P1 = await getUnifiedDraftAdvice({
    packCards: sampleCards,
    priorPool: [],
    packNumber: 1,
    pickNumber: 1,
    evaluationContext: {
      cubeKey: "titou_tribal",
      cubeMeta: coachContext.cubeMeta,
      synergyProfile: coachContext.synergyProfile,
    },
    llmRouter: router,
  });
  const t1Duration = Math.round(performance.now() - t1Start);

  console.log(`   ⏱️  Latence : ${String(t1Duration)} ms`);
  console.log(`   🏷️  Fournisseur actif : ${adviceP1P1.provider}`);
  console.log(`   ⭐ Choix Recommandé : ${adviceP1P1.topPickName} (ID: ${adviceP1P1.topPickId})`);
  console.log(`   💬 Justification : ${adviceP1P1.reason}`);
  console.log(`   🔄 Alternatives (${String(adviceP1P1.alternatives.length)}) : ${adviceP1P1.alternatives.map((a) => a.name).join(", ")}`);

  if (!sampleCards.some((c) => c.id === adviceP1P1.topPickId)) {
    throw new Error(`VIOLATION UX : Le topPickId '${adviceP1P1.topPickId}' n'appartient pas au booster !`);
  }
  if (adviceP1P1.reason.length < 10) {
    throw new Error("VIOLATION UX : La justification du coach est trop courte ou vide.");
  }

  // -------------------------------------------------------------------------
  // TEST 2: Pack 1 Pick 9 Wheel Signal Advice
  // -------------------------------------------------------------------------
  console.log("\n🧪 TEST 2 : Requête live Conseil P1P9 avec Analyse de la Roue...");
  const wheeledPack = sampleCards.slice(0, 7);
  const t2Start = performance.now();
  const adviceP1P9 = await getUnifiedDraftAdvice({
    packCards: wheeledPack,
    priorPool: [sampleCards[0]!, sampleCards[1]!],
    packNumber: 1,
    pickNumber: 9,
    evaluationContext: {
      cubeKey: "titou_tribal",
      cubeMeta: coachContext.cubeMeta,
      synergyProfile: coachContext.synergyProfile,
    },
    llmRouter: router,
    wheelSignals: {
      originalPickNumber: 1,
      currentPickNumber: 9,
      pickedCardAtInitialPass: sampleCards[1],
      cardsWheeled: wheeledPack,
      cardsTakenByTable: sampleCards.slice(7),
      takenColorCounts: { W: 3, U: 2, B: 2, R: 0, G: 1 },
      wheeledColorCounts: { W: 1, U: 1, B: 1, R: 2, G: 1 },
      openColors: ["R"],
      contestedColors: ["W"],
      wheeledBombs: [sampleCards[1]!],
      signalSummary: "🔥 Bombe ayant fait le tour : Lightning Bolt. Couleur ouverte : R. Couleur contestée : W.",
    },
  });
  const t2Duration = Math.round(performance.now() - t2Start);

  console.log(`   ⏱️  Latence : ${String(t2Duration)} ms`);
  console.log(`   🏷️  Fournisseur actif : ${adviceP1P9.provider}`);
  console.log(`   ⭐ Choix Recommandé : ${adviceP1P9.topPickName} (ID: ${adviceP1P9.topPickId})`);
  console.log(`   💬 Justification : ${adviceP1P9.reason}`);
  console.log(`   📊 Signal Roue attaché : ${adviceP1P9.wheelSignals ? "✅ Oui" : "❌ Non"}`);

  if (!wheeledPack.some((c) => c.id === adviceP1P9.topPickId)) {
    throw new Error(`VIOLATION UX : Le topPickId '${adviceP1P9.topPickId}' n'appartient pas au booster revenu !`);
  }

  console.log("\n============================================================");
  console.log("  ✅ TOUS LES TESTS LIVE SONT CONFORMES ET OPÉRATIONNELS !");
  console.log("============================================================\n");
}

runLiveCoachSmokeTest().catch((err) => {
  console.error("\n❌ ÉCHEC DU TEST LIVE COACH :", err);
  process.exit(1);
});
