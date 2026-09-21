import { LlmRouter } from "../src/companion/llm-router.ts";

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

async function runJevSmokeTest(): Promise<void> {
  console.log("\n============================================================");
  console.log("  ⚡ DRAFTMASTER - JEV 'SYSTEM ONE' DECISION ENGINE TEST");
  console.log("============================================================\n");

  const router = new LlmRouter();
  const hasJev = router.hasJevKey();

  console.log("🔑 Statut des clés :");
  console.log(`   - JEV / OpenRouter Key : ${hasJev ? "✅ Configurée et active" : "❌ Non configurée"}`);

  if (!hasJev) {
    console.error("\n❌ ERREUR : Aucune clé JEV ou OpenRouter trouvée dans .env ou .env.local.");
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // TEST 1 : Choix catégoriel P1P1 (Vintage Cube Power 9)
  // -------------------------------------------------------------------------
  console.log("\n🧪 TEST 1 : Décision Catégorielle (Choice) - P1P1 Vintage Cube");
  console.log("------------------------------------------------------------");
  const p1State = "Drafting MTG Vintage Cube. Pick 1 Pack 1. Current pool is empty.";
  const p1Questions = {
    first_pick: {
      type: "choice" as const,
      instructions: "Which card is the absolute highest priority first pick in Vintage Cube?",
      criteria: {
        "Black Lotus": "The single most powerful acceleration card in Magic, +3 mana of any color for 0 mana.",
        "Sol Ring": "Colorless fast mana artifact, gives 2 mana every turn for 1 initial mana.",
        "Lightning Bolt": "3 damage for 1 red mana, efficient removal or burn.",
        "Birds of Paradise": "1-drop mana dork fixing all 5 colors.",
        "Counterspell": "2-mana hard counter spell, double blue requirement.",
      },
    },
  };

  const t1Start = performance.now();
  const res1 = await router.callJevDecision(p1State, p1Questions);
  const t1Duration = Math.round(performance.now() - t1Start);

  if (!res1.success || !res1.content) {
    console.error("   ❌ Échec Test 1 :", res1.error);
    process.exit(1);
  }

  const p1Answer = res1.content.answers.first_pick;
  if (p1Answer?.type === "choice") {
    console.log(`   ⏱️  Latence : ${String(t1Duration)} ms`);
    console.log(`   🏷️  Modèle : ${res1.model} (${res1.provider})`);
    console.log(`   ⭐ Choix Retenu : ${p1Answer.choice}`);
    console.log(`   🎯 Confiance : ${(p1Answer.confidence * 100).toFixed(1)}%`);
    console.log("   📊 Probabilités par option :");
    for (const [card, prob] of Object.entries(p1Answer.probabilities)) {
      const bar = "█".repeat(Math.round(prob * 25)).padEnd(25, "░");
      console.log(`      • ${card.padEnd(20)} : ${(prob * 100).toFixed(1).padStart(5)}% [${bar}]`);
    }
    console.log(`   💰 Coût de la décision : $${res1.content.usage.cost.toFixed(6)} (${res1.content.usage.input_tokens} tokens entrée)`);
  }

  // -------------------------------------------------------------------------
  // TEST 2 : Évaluation d'Archétype & Rubrique ordonnée (Score)
  // -------------------------------------------------------------------------
  console.log("\n🧪 TEST 2 : Évaluation sur Rubrique Ordonnée (Score) - Sneak & Show");
  console.log("------------------------------------------------------------");
  const p2State =
    "Vintage Cube Draft. Drafter pool: [Sneak Attack, Through the Breach, Woodfall Primus, Griselbrand]. Looking for game-ending reanimation/cheat targets.";
  const p2Questions = {
    emrakul_fit: {
      type: "score" as const,
      instructions: "How well does Emrakul, the Aeons Torn fit this Sneak & Show deck?",
      criteria: [
        "Unplayable / useless for this strategy",
        "Marginal inclusion / filler",
        "Strong synergy piece",
        "Peak archetype enabler / ultimate bomb",
      ],
    },
    wrath_fit: {
      type: "score" as const,
      instructions: "How well does Wrath of God fit this Sneak & Show deck?",
      criteria: [
        "Unplayable / useless for this strategy",
        "Marginal inclusion / filler",
        "Strong synergy piece",
        "Peak archetype enabler / ultimate bomb",
      ],
    },
  };

  const t2Start = performance.now();
  const res2 = await router.callJevDecision(p2State, p2Questions);
  const t2Duration = Math.round(performance.now() - t2Start);

  if (!res2.success || !res2.content) {
    console.error("   ❌ Échec Test 2 :", res2.error);
    process.exit(1);
  }

  console.log(`   ⏱️  Latence : ${String(t2Duration)} ms`);
  const emrakul = res2.content.answers.emrakul_fit;
  const wrath = res2.content.answers.wrath_fit;

  if (emrakul?.type === "score") {
    console.log(`   🐲 Emrakul, the Aeons Torn : Score ${emrakul.score.toFixed(2)}/3 (Confiance: ${(emrakul.confidence * 100).toFixed(1)}%)`);
    console.log(`      Distribution : ${JSON.stringify(emrakul.probabilities)}`);
  }
  if (wrath?.type === "score") {
    console.log(`   ☀️ Wrath of God             : Score ${wrath.score.toFixed(2)}/3 (Confiance: ${(wrath.confidence * 100).toFixed(1)}%)`);
    console.log(`      Distribution : ${JSON.stringify(wrath.probabilities)}`);
  }
  console.log(`   💰 Coût de la décision : $${res2.content.usage.cost.toFixed(6)}`);

  // -------------------------------------------------------------------------
  // TEST 3 : Détection de Signal & Pivot de Couleur (Noul - Vrai/Faux probabiliste)
  // -------------------------------------------------------------------------
  console.log("\n🧪 TEST 3 : Détection de Pivot (Noul - Probabilité Binaire)");
  console.log("------------------------------------------------------------");
  const p3State =
    "Pack 1 Pick 9. The drafter started mono-Green stompy (picked 4 green ramp cards). However, a high-tier Blue bomb (Mana Drain) unexpectedly wheeled back in Pick 9.";
  const p3Questions = {
    should_pivot_to_blue: {
      type: "noul" as const,
      instructions: "Should the drafter branch or pivot into Blue given that Mana Drain wheeled?",
      criteria: {
        false: "Ignore the signal, stay strictly mono-green ramp.",
        true: "Wheel signal indicates Blue is wide open at the table; draft Mana Drain and pivot/branch Simic.",
      },
    },
  };

  const t3Start = performance.now();
  const res3 = await router.callJevDecision(p3State, p3Questions);
  const t3Duration = Math.round(performance.now() - t3Start);

  if (!res3.success || !res3.content) {
    console.error("   ❌ Échec Test 3 :", res3.error);
    process.exit(1);
  }

  const p3Answer = res3.content.answers.should_pivot_to_blue;
  if (p3Answer?.type === "noul") {
    console.log(`   ⏱️  Latence : ${String(t3Duration)} ms`);
    console.log(`   🔄 Probabilité de Pivot vers le Bleu : ${(p3Answer.noul * 100).toFixed(1)}%`);
    const recommendation = p3Answer.noul > 0.5 ? "✅ OUI, pivoter / ouvrir Simic !" : "❌ NON, rester dans le plan initial.";
    console.log(`   💡 Recommandation JEV : ${recommendation}`);
    console.log(`   💰 Coût de la décision : $${res3.content.usage.cost.toFixed(6)}`);
  }

  console.log("\n============================================================");
  console.log("  🎉 TOUS LES TESTS DU MODÈLE JEV SONT VALIDÉS AVEC SUCCÈS !");
  console.log("============================================================\n");
}

runJevSmokeTest().catch((err) => {
  console.error("\n❌ ERREUR LORS DU TEST JEV :", err);
  process.exit(1);
});
