import fs from "node:fs";
import path from "node:path";
import { LlmRouter } from "../src/companion/llm-router.ts";
import { evaluatePack } from "../src/domain/coaching/dynamic-score.ts";
import type { CardEvaluationInput } from "../src/domain/coaching/types.ts";

try {
  process.loadEnvFile?.();
} catch {}
try {
  process.loadEnvFile?.(".env.local");
} catch {}

interface WitnessPick {
  packNumber: number;
  pickNumber: number;
  offeredCardIds: string[];
  pickedCardId: string;
  staticScore?: number;
  dynamicScore?: number;
}

interface CardIdentity {
  id: string;
  name: string;
  manaCost: string;
  cmc: number;
  colors: string[];
  types: string[];
  isLand: boolean;
}

interface WitnessDraft {
  draftId: string;
  source: string;
  leagueId: string;
  cubeKey: string;
  picks: WitnessPick[];
  cardIdentities: Record<string, CardIdentity>;
}

interface CardMeta {
  name: string;
  oracle_text?: string;
  type_line?: string;
  mana_cost?: string;
}

export interface PickComparisonResult {
  packNumber: number;
  pickNumber: number;
  humanPick: string;
  jevPick: string;
  jevProb: number;
  jevConfidence: number;
  jevLatencyMs: number;
  dynamicPick?: string;
  dynamicScore?: number;
  geminiPick?: string;
  geminiLatencyMs?: number;
  offeredCount: number;
  matchHuman: boolean;
  matchDynamic?: boolean;
  matchGemini?: boolean;
}

export async function runWitnessPickSimulation(options: {
  maxPicks?: number;
  includeGemini?: boolean;
  draftPath?: string;
}): Promise<void> {
  const maxPicks = options.maxPicks ?? 15;
  const includeGemini = options.includeGemini ?? false;
  const draftPath =
    options.draftPath ??
    path.resolve(
      "tests/fixtures/golden-datasets/powered-vintage/arena-powered/2026-09-08/drafts/bc4cdb9d-6412-43a1-84a2-d66b5dbed559.json",
    );

  if (!fs.existsSync(draftPath)) {
    throw new Error(`Fichier draft témoin introuvable : ${draftPath}`);
  }

  const draftData = JSON.parse(fs.readFileSync(draftPath, "utf8")) as WitnessDraft;
  const metaPath = path.resolve("data/untapped_history/card-metadata-v1.json");
  const metaData: Record<string, CardMeta> = fs.existsSync(metaPath)
    ? (JSON.parse(fs.readFileSync(metaPath, "utf8")) as Record<string, CardMeta>)
    : {};

  const router = new LlmRouter();
  console.log("\n=========================================================================================");
  console.log("  🎯 DRAFTMASTER - BENCHMARK COMPARATIF SUR DRAFT TÉMOIN (VINTAGE CUBE)");
  console.log("=========================================================================================");
  console.log(`📦 Draft source       : ${draftData.draftId} (${draftData.cubeKey})`);
  console.log(`📊 Décisions testées  : ${String(Math.min(maxPicks, draftData.picks.length))} picks`);
  console.log(`🤖 Moteurs comparés   : Humain (Joueur) | JEV (System One) | DynamicScore Coach${includeGemini ? " | Gemini Flash" : ""}\n`);

  const results: PickComparisonResult[] = [];
  const draftedPoolCards: CardEvaluationInput[] = [];
  const draftedPoolNames: string[] = [];

  for (let i = 0; i < Math.min(maxPicks, draftData.picks.length); i++) {
    const pick = draftData.picks[i]!;
    const humanCard = draftData.cardIdentities[pick.pickedCardId];
    const humanPickName = humanCard ? humanCard.name : pick.pickedCardId;

    // Convert offered cards to CardEvaluationInput & descriptions
    const offeredInputs: CardEvaluationInput[] = [];
    const jevCriteria: Record<string, string> = {};

    for (const cid of pick.offeredCardIds) {
      const card = draftData.cardIdentities[cid];
      if (!card) continue;
      const meta = metaData[cid];
      let desc = `${card.manaCost || "{0}"} ${card.types.join(" ")}`;
      if (meta?.oracle_text) {
        desc += ` | ${meta.oracle_text.slice(0, 100).replace(/\n/g, " ")}`;
      }
      jevCriteria[card.name] = desc;

      offeredInputs.push({
        id: cid,
        name: card.name,
        cmc: card.cmc,
        colors: card.colors as any,
        types: card.types,
        isLand: card.isLand,
        oracleText: meta?.oracle_text,
        staticScore: 35, // baseline
      });
    }

    // 1. Moteur Algorithmique (DynamicScore Coach)
    let dynamicPick: string | undefined;
    let dynamicScore: number | undefined;
    try {
      const evaluated = evaluatePack({
        packNumber: pick.packNumber,
        pickNumber: pick.pickNumber,
        offeredCards: offeredInputs,
        priorPool: draftedPoolCards,
      });
      if (evaluated.length > 0 && evaluated[0]) {
        dynamicPick = evaluated[0].name;
        dynamicScore = evaluated[0].dynamicScore;
      }
    } catch {
      // Dynamic score optional fallback
    }

    // 2. Moteur JEV (System One)
    const stateDesc =
      `Drafting MTG Vintage Cube on Arena. Pack ${String(pick.packNumber)} Pick ${String(pick.pickNumber)}. ` +
      (draftedPoolNames.length > 0
        ? `Current drafted pool (${String(draftedPoolNames.length)} cards): [${draftedPoolNames.join(", ")}]. Current strategy: maximize deck synergy and power curve.`
        : "Current pool is empty (P1P1). Pick the single best card / format staple.");

    const tJevStart = performance.now();
    const jevRes = await router.callJevDecision(stateDesc, {
      best_pick: {
        type: "choice",
        instructions:
          "Select the objectively best card to pick from this pack given the current pool and archetype fit.",
        criteria: jevCriteria,
      },
    });
    const jevLatency = Math.round(performance.now() - tJevStart);

    let jevPick = "Erreur";
    let jevProb = 0;
    let jevConfidence = 0;
    if (jevRes.success && jevRes.content?.answers?.best_pick?.type === "choice") {
      const ans = jevRes.content.answers.best_pick;
      jevPick = ans.choice;
      jevProb = ans.probabilities[ans.choice] ?? 0;
      jevConfidence = ans.confidence ?? 0;
    }

    // 3. Appel Gemini optionnel
    let geminiPick: string | undefined;
    let geminiLatency: number | undefined;

    if (includeGemini) {
      const tGeminiStart = performance.now();
      const geminiPrompt =
        `You are drafting MTG Vintage Cube. ${stateDesc}\n\n` +
        `Offered booster cards:\n` +
        offeredInputs.map((c) => `- ${c.name}: ${jevCriteria[c.name] ?? ""}`).join("\n") +
        `\n\nReturn JSON: { "pick": "<exact card name from the list>", "reason": "<one sentence explanation>" }`;

      try {
        const gemRes = await router.generateJson<{ pick: string; reason?: string }>(
          "You are an expert MTG drafter. Respond strictly with JSON.",
          geminiPrompt,
          { preferBaseTier: true },
        );
        geminiLatency = Math.round(performance.now() - tGeminiStart);
        if (gemRes.success && gemRes.content?.pick) {
          const matched = offeredInputs.find(
            (c) => c.name.toLowerCase() === gemRes.content!.pick.toLowerCase().trim(),
          );
          geminiPick = matched ? matched.name : gemRes.content.pick;
        }
      } catch (err: any) {
        console.warn(`[Benchmark] Gemini error pick P${String(pick.packNumber)}P${String(pick.pickNumber)}:`, err?.message);
      }
    }

    const matchHuman = jevPick.toLowerCase() === humanPickName.toLowerCase();
    const matchDynamic = dynamicPick
      ? jevPick.toLowerCase() === dynamicPick.toLowerCase()
      : undefined;
    const matchGemini = geminiPick ? jevPick.toLowerCase() === geminiPick.toLowerCase() : undefined;

    results.push({
      packNumber: pick.packNumber,
      pickNumber: pick.pickNumber,
      humanPick: humanPickName,
      jevPick,
      jevProb,
      jevConfidence,
      jevLatencyMs: jevLatency,
      dynamicPick,
      dynamicScore,
      geminiPick,
      geminiLatencyMs: geminiLatency,
      offeredCount: pick.offeredCardIds.length,
      matchHuman,
      matchDynamic,
      matchGemini,
    });

    const statusHuman = matchHuman ? "🎯 MATCH" : "⚡ DIFF ";
    const statusCoach = matchDynamic ? "🧠 COACH" : "        ";

    const pStr = `P${String(pick.packNumber)}P${String(pick.pickNumber).padStart(2, "0")}`;
    console.log(
      `[${pStr}] ` +
        `Humain: ${humanPickName.padEnd(25)} | ` +
        `JEV: ${jevPick.padEnd(25)} (${(jevProb * 100).toFixed(0)}%, ${String(jevLatency)}ms) | ` +
        `Coach: ${(dynamicPick || "N/A").padEnd(23)} | ` +
        `${statusHuman} ${statusCoach}`,
    );

    // Human continuation
    draftedPoolNames.push(humanPickName);
    const chosenInput = offeredInputs.find((c) => c.id === pick.pickedCardId);
    if (chosenInput) draftedPoolCards.push(chosenInput);
  }

  // Synthesis
  const total = results.length;
  const humanMatches = results.filter((r) => r.matchHuman).length;
  const dynamicMatches = results.filter((r) => r.matchDynamic === true).length;
  const avgJevLatency = Math.round(
    results.reduce((sum, r) => sum + r.jevLatencyMs, 0) / Math.max(1, total),
  );

  console.log("\n=========================================================================================");
  console.log("  📈 SYNTHÈSE STATISTIQUE & PERTINENCE");
  console.log("=========================================================================================");
  console.log(`Nombre total de picks simulés      : ${String(total)}`);
  console.log(
    `🎯 Taux d'accord JEV vs Humain (Joueur) : ${String(humanMatches)}/${String(total)} (${((humanMatches / total) * 100).toFixed(1)}%)`,
  );
  console.log(
    `🧠 Taux d'accord JEV vs DynamicScore    : ${String(dynamicMatches)}/${String(total)} (${((dynamicMatches / total) * 100).toFixed(1)}%)`,
  );
  console.log(`⏱️  Latence moyenne JEV                : ${String(avgJevLatency)} ms`);
  console.log(
    `💰 Coût total d'inférence JEV         : ~$${(total * 0.000018).toFixed(5)} USD (moins de 2 centièmes de centimes !)`,
  );
  console.log("=========================================================================================\n");
}

const args = process.argv.slice(2);
const maxPicksArg = args.find((a) => a.startsWith("--picks="));
const maxPicks = maxPicksArg ? parseInt(maxPicksArg.split("=")[1]!, 10) : 15;
const includeGemini = args.includes("--gemini");

runWitnessPickSimulation({ maxPicks, includeGemini }).catch((err) => {
  console.error("\n❌ ERREUR SIMULATION :", err);
  process.exit(1);
});
