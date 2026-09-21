import fs from "node:fs";
import path from "node:path";
import type { CardEvaluationInput } from "../../domain/coaching/types.ts";
import type { CubeMetaDefinition } from "../../cubes/cube-meta-types.ts";
import type { CubeMetaRegistry } from "../../cubes/cube-meta.ts";
import type { FriendProfile } from "../friends/profiles.ts";
import { computeFriendCardBiasContributions } from "../friends/friend-bot-policy.ts";
import { evaluatePack } from "../../domain/coaching/dynamic-score.ts";
import { LlmRouter } from "../../companion/llm-router.ts";

export interface JevCubeCardInfo {
  readonly name: string;
  readonly score?: number | undefined;
  readonly tier?: string | undefined;
}

export interface JevDraftContextOptions {
  readonly cubeMeta?: CubeMetaRegistry | CubeMetaDefinition | undefined;
  readonly cubeCards?: readonly JevCubeCardInfo[] | undefined;
  readonly cubeKey?: string | undefined;
  readonly profile?: FriendProfile | undefined;
  readonly packNumber: number;
  readonly pickNumber: number;
  readonly roundIndex?: number | undefined;
  readonly direction?: "left" | "right" | undefined;
  readonly offeredCards: readonly CardEvaluationInput[];
  readonly priorPool: readonly CardEvaluationInput[];
}

export interface JevBotPickOptions extends JevDraftContextOptions {
  readonly router?: LlmRouter | undefined;
  readonly timeoutMs?: number | undefined;
  readonly model?: string | undefined;
}

export interface JevBotPickResult {
  readonly cardInstanceId: string;
  readonly cardName: string;
  readonly usedJev: boolean;
  readonly choiceProb: number;
  readonly confidence: number;
  readonly probabilities: Record<string, number>;
  readonly latencyMs: number;
  readonly reason?: string | undefined;
}

interface RawCubeCard {
  readonly name: string;
  readonly oracleId: string;
  readonly tier?: string | undefined;
}

interface RawCubeJson {
  readonly cardIndex?: readonly RawCubeCard[] | undefined;
}

interface RawPowerRankingEntry {
  readonly oracleId?: string | undefined;
  readonly name?: string | undefined;
  readonly score?: number | undefined;
}

interface RawPowerRankingJson {
  readonly ranking?: readonly RawPowerRankingEntry[] | undefined;
}

function extractCubeMetaDefinition(
  cubeMeta?: CubeMetaRegistry | CubeMetaDefinition,
): CubeMetaDefinition | undefined {
  if (!cubeMeta) return undefined;
  if ("meta" in cubeMeta) {
    return cubeMeta.meta;
  }
  return cubeMeta;
}

function extractCubeKey(cubeMeta?: CubeMetaRegistry | CubeMetaDefinition): string | undefined {
  return extractCubeMetaDefinition(cubeMeta)?.cubeKey;
}

/**
 * Loads the cube's complete card list and attaches calibrated raw power scores
 * from data/power-rankings/power-ranking-v1.json.
 */
export function loadCubeCardsWithScores(
  cubeKey: string,
  projectRoot = process.cwd(),
): readonly JevCubeCardInfo[] {
  try {
    const cubePath = path.resolve(projectRoot, "data", "cubes", cubeKey, "cube.json");
    if (!fs.existsSync(cubePath)) {
      return [];
    }
    const cubeContent = fs.readFileSync(cubePath, "utf8");
    const parsedCube = JSON.parse(cubeContent) as unknown;
    if (
      typeof parsedCube !== "object" ||
      parsedCube === null ||
      !("cardIndex" in parsedCube) ||
      !Array.isArray((parsedCube as RawCubeJson).cardIndex)
    ) {
      return [];
    }
    const cubeData = parsedCube as RawCubeJson;
    const cardIndex = cubeData.cardIndex ?? [];

    const prPath = path.resolve(projectRoot, "data", "power-rankings", "power-ranking-v1.json");
    let scoresByOracle: Map<string, number> | undefined;
    let scoresByName: Map<string, number> | undefined;
    if (fs.existsSync(prPath)) {
      const prContent = fs.readFileSync(prPath, "utf8");
      const parsedPr = JSON.parse(prContent) as unknown;
      if (
        typeof parsedPr === "object" &&
        parsedPr !== null &&
        "ranking" in parsedPr &&
        Array.isArray((parsedPr as RawPowerRankingJson).ranking)
      ) {
        const prData = parsedPr as RawPowerRankingJson;
        scoresByOracle = new Map();
        scoresByName = new Map();
        for (const r of prData.ranking ?? []) {
          if (r.oracleId && r.score !== undefined) {
            scoresByOracle.set(r.oracleId, r.score);
          }
          if (r.name && r.score !== undefined) {
            scoresByName.set(r.name.toLowerCase(), r.score);
          }
        }
      }
    }

    return cardIndex.map((card: RawCubeCard) => {
      const score =
        scoresByOracle?.get(card.oracleId) ?? scoresByName?.get(card.name.toLowerCase());
      const info: JevCubeCardInfo = {
        name: card.name,
        ...(score !== undefined ? { score } : {}),
        ...(card.tier !== undefined ? { tier: card.tier } : {}),
      };
      return info;
    });
  } catch {
    return [];
  }
}

export const RELATIVE_TIERS = [
  "A+",
  "A",
  "A-",
  "B+",
  "B",
  "B-",
  "C+",
  "C",
  "C-",
  "D+",
  "D",
  "D-",
  "F",
] as const;

export type RelativeTier = (typeof RELATIVE_TIERS)[number];

const RELATIVE_TIER_DESCRIPTIONS: Record<RelativeTier, string> = {
  "A+": "Top Cube Bombs & Format Defining",
  A: "High Impact First Picks",
  "A-": "Premium Staples",
  "B+": "High Synergy & Strong Playables",
  B: "Core Archetype Cards",
  "B-": "Solid Archetype Roleplayers",
  "C+": "Above Average Playables",
  C: "Average Solid Playables",
  "C-": "Lower Curve Fillers",
  "D+": "Marginal Playables",
  D: "Niche / Deep Synergy Only",
  "D-": "Low Priority Fillers",
  F: "Bottom Tier / Late Picks",
};

/**
 * Formats the cube's card roster into relative power tiers (A+ down to F) for JEV.
 * Tiers are relative per cube, representing percentile brackets from format-defining
 * bombs (A+) to bottom-tier fillers (F).
 */
export function formatCubePowerHierarchy(cubeCards: readonly JevCubeCardInfo[]): string {
  if (cubeCards.length === 0) return "";

  const total = cubeCards.length;
  // Sort descending by score for tie-breaking and percentile calculation
  const sorted = [...cubeCards].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const tierGroups = new Map<string, JevCubeCardInfo[]>();
  for (const t of RELATIVE_TIERS) {
    tierGroups.set(t, []);
  }

  for (let i = 0; i < sorted.length; i++) {
    const card = sorted[i];
    if (!card) continue;
    let tier: string | undefined = card.tier;
    if (!tier || !tierGroups.has(tier)) {
      // Calculate relative tier index if not provided or legacy tier
      const tierIndex = Math.min(12, Math.floor((i / total) * 13));
      tier = RELATIVE_TIERS[tierIndex] ?? "F";
    }
    const group = tierGroups.get(tier);
    if (group) {
      group.push(card);
    } else {
      tierGroups.get("C")?.push(card);
    }
  }

  const lines: string[] = [
    `CUBE CARD ROSTER & RELATIVE TIERS (${String(cubeCards.length)} cards in this cube):`,
    `The following are the relative power tiers calibrated specifically for this cube (from Tier A+ down to Tier F). Every card is evaluated relative to this cube format and environment.`,
  ];

  for (const t of RELATIVE_TIERS) {
    const cardsInTier = tierGroups.get(t) ?? [];
    if (cardsInTier.length === 0) continue;
    const desc = RELATIVE_TIER_DESCRIPTIONS[t];
    const cardList = cardsInTier
      .map((c) => (c.score !== undefined ? `${c.name} (${String(c.score)})` : c.name))
      .join(", ");
    lines.push(`• Tier ${t} (${desc}, ${String(cardsInTier.length)} cards):\n  ${cardList}`);
  }

  return lines.join("\n");
}

/**
 * Builds an exhaustive, rich prompt state for JEV (up to 32,000 tokens supported).
 * Integrates cube technical axes, supported archetypes, relative cube power tiers (A+ down to F),
 * bot persona and biases, and current pool analytics (curve, colors, card list).
 */
export function buildJevDraftContext(options: JevDraftContextOptions): {
  state: string;
  criteria: Record<string, string>;
  instanceIdByName: Map<string, string>;
} {
  const {
    cubeMeta,
    cubeCards: explicitCubeCards,
    cubeKey: explicitCubeKey,
    profile,
    packNumber,
    pickNumber,
    direction = "left",
    offeredCards,
    priorPool,
  } = options;

  let cubeCards = explicitCubeCards;
  if (!cubeCards) {
    const inferredKey = explicitCubeKey ?? extractCubeKey(cubeMeta);
    if (inferredKey) {
      cubeCards = loadCubeCardsWithScores(inferredKey);
    }
  }

  const cubeTierByName = new Map<string, string>();
  if (cubeCards) {
    for (const c of cubeCards) {
      if (c.tier) {
        cubeTierByName.set(c.name.toLowerCase(), c.tier);
      }
    }
  }

  const instanceIdByName = new Map<string, string>();
  const criteria: Record<string, string> = {};

  for (const card of offeredCards) {
    instanceIdByName.set(card.name, card.id);
    const cardTypes = (card.types ?? []).join(" ");
    const manaCost = card.manaCost ?? "{0}";
    let desc = `${manaCost} ${cardTypes}`.trim();
    if (card.oracleText) {
      desc += ` | ${card.oracleText.slice(0, 130).replace(/\n/g, " ")}`;
    }
    const tier = card.tier ?? cubeTierByName.get(card.name.toLowerCase());
    if (tier) {
      desc += ` [Tier: ${tier}]`;
    }
    if (card.staticScore) {
      desc += ` [Power: ${String(card.staticScore)}]`;
    }
    criteria[card.name] = desc;
  }

  // 1. CUBE ENVIRONMENT & ARCHETYPES
  let cubeSection = "CUBE ENVIRONMENT: MTG Draft";
  const meta = extractCubeMetaDefinition(cubeMeta);
  if (meta) {
    const powerTier = meta.powerTier;
    const pacing = meta.pacing;
    const criticalWindow = meta.fundamentalTurn?.criticalWindow ?? "T2-T4";
    const pacingDesc = meta.fundamentalTurn?.pacingDescription ?? "Competitive pacing";
    const deckExp =
      meta.fundamentalTurn?.deckExpectation ?? "Proactive gameplan with early interaction.";

    cubeSection =
      `CUBE ENVIRONMENT: ${meta.name} (Key: ${meta.cubeKey}, Tier: ${powerTier})\n` +
      `Pacing: ${pacing} | Fundamental Turn: ${criticalWindow} (${pacingDesc})\n` +
      `Deck Expectations: ${deckExp}\n\n` +
      `SUPPORTED ARCHETYPES IN THIS CUBE:\n` +
      meta.archetypes
        .slice(0, 8)
        .map(
          (a) =>
            `- ${a.name} (${a.primaryColors.join("/")}${a.splashColors?.length ? " splash " + a.splashColors.join("/") : ""}, ${a.category}): ${a.description} | Plan: ${a.gameplan}`,
        )
        .join("\n");
  }

  // 2. CUBE POWER HIERARCHY & CARD ROSTER
  const powerHierarchySection = cubeCards ? formatCubePowerHierarchy(cubeCards) : "";

  // 2. BOT IDENTITY & PERSONALITY BIASES
  let botSection = "";
  if (profile) {
    const biasLines: string[] = [];
    const b = profile.biases;
    if (b.cheapInteractionBonus) {
      biasLines.push(
        `• cheapInteractionBonus (+${String(b.cheapInteractionBonus)}): Heavily prioritize cheap counterspells and removals (CMC <= 2).`,
      );
    }
    if (b.valueEngineBonus) {
      biasLines.push(
        `• valueEngineBonus (+${String(b.valueEngineBonus)}): Heavily prioritize 2-for-1s, engines, and raw card advantage.`,
      );
    }
    if (b.lowCurveBonus) {
      biasLines.push(
        `• lowCurveBonus (+${String(b.lowCurveBonus)}): Strongly favor low mana curve (CMC 1-3) over clunky expensive cards.`,
      );
    }
    if (b.weirdEngineBonus) {
      biasLines.push(
        `• weirdEngineBonus (+${String(b.weirdEngineBonus)}): Strongly favor combo build-arounds, artifact engines, sagas, and creative interactions.`,
      );
    }
    if (b.legendaryBombBonus) {
      biasLines.push(
        `• legendaryBombBonus (+${String(b.legendaryBombBonus)}): Strongly favor high-impact legendary permanents.`,
      );
    }
    if (b.highCmcBonus) {
      biasLines.push(
        `• highCmcBonus (+${String(b.highCmcBonus)}): Prioritize giant finishers and high-CMC bombs (CMC >= 5).`,
      );
    }
    if (b.greenRampBonus) {
      biasLines.push(
        `• greenRampBonus (+${String(b.greenRampBonus)}): Prioritize mana elves, dorks, and explosive ramp spells.`,
      );
    }
    if (b.boardWipeBonus) {
      biasLines.push(
        `• boardWipeBonus (+${String(b.boardWipeBonus)}): Prioritize sweepers, Wraths, and mass reset buttons.`,
      );
    }
    if (b.multiColorFixingBonus) {
      biasLines.push(
        `• multiColorFixingBonus (+${String(b.multiColorFixingBonus)}): Prioritize dual lands, fetches, and multi-color fixing rocks.`,
      );
    }
    if (b.tribalSynergyBonus) {
      biasLines.push(
        `• tribalSynergyBonus (+${String(b.tribalSynergyBonus)}): Prioritize creature types, lords, and tribal synergy payoffs.`,
      );
    }
    if (b.reanimationBonus) {
      biasLines.push(
        `• reanimationBonus (+${String(b.reanimationBonus)}): Prioritize reanimation spells (Animate Dead, Reanimate), giant reanimation targets, and discard outlets.`,
      );
    }
    if (b.colorDiscipline) {
      biasLines.push(
        `• colorDiscipline (${String(b.colorDiscipline)}x): Commitment factor to already drafted colors (higher = stricter, lower = more adventurous).`,
      );
    }

    botSection =
      `DRAFTER IDENTITY (BOT):\n` +
      `You are drafting AS BOT: "${profile.name}" (${profile.title}).\n` +
      `Bot Philosophy: "${profile.quote}"\n` +
      `Skill Level: ${profile.level}\n` +
      (profile.preferredColors?.length
        ? `Preferred Colors: ${profile.preferredColors.join(", ")}\n`
        : "") +
      `ACTIVE PERSONALITY BIASES (YOU MUST APPLY THESE IN YOUR DECISION):\n` +
      (biasLines.length > 0 ? biasLines.join("\n") : "• Balanced playstyle.") +
      `\n`;
  }

  // 3. PRIOR DRAFTED POOL ANALYTICS
  const poolCount = priorPool.length;
  let poolSection = `DRAFT PROGRESSION: Pack ${String(packNumber)}, Pick ${String(pickNumber)} (Passing ${direction}).\n`;

  if (poolCount === 0) {
    poolSection += `CURRENT POOL: Empty (Pack 1 Pick 1). Look for format-defining staples, fast mana, premium bombs, or strong signals.\n`;
  } else {
    // Count colors
    const colorCounts: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, Colorless: 0 };
    const cmcCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let creatureCount = 0;
    let spellCount = 0;
    let landCount = 0;

    for (const c of priorPool) {
      if (c.colors.length === 0) {
        colorCounts.Colorless = (colorCounts.Colorless ?? 0) + 1;
      } else {
        for (const col of c.colors) {
          colorCounts[col] = (colorCounts[col] ?? 0) + 1;
        }
      }
      const cmcVal = c.cmc !== undefined ? Math.floor(c.cmc) : 0;
      const cmcBucket = Math.min(5, Math.max(0, cmcVal));
      cmcCounts[cmcBucket] = (cmcCounts[cmcBucket] ?? 0) + 1;

      if (c.isLand) landCount++;
      else if (c.types?.includes("Creature")) creatureCount++;
      else spellCount++;
    }

    const colorSummary = Object.entries(colorCounts)
      .filter(([, cnt]) => cnt > 0)
      .map(([col, cnt]) => `${col}: ${String(cnt)}`)
      .join(", ");

    const cmcSummary = Object.entries(cmcCounts)
      .map(([cmc, cnt]) => `CMC ${cmc}${cmc === "5" ? "+" : ""}: ${String(cnt)}`)
      .join(" | ");

    poolSection +=
      `CURRENT POOL (${String(poolCount)} cards drafted):\n` +
      `• Colors: ${colorSummary}\n` +
      `• Mana Curve: ${cmcSummary}\n` +
      `• Types: ${String(creatureCount)} Creatures, ${String(spellCount)} Noncreatures, ${String(landCount)} Lands\n` +
      `• Cards drafted so far: ` +
      priorPool.map((c) => `${c.name} (${c.manaCost ?? "{0}"})`).join(", ") +
      `\n`;
  }

  const instructions = profile
    ? `DECISION OBJECTIVE:\n` +
      `Select the single card from the booster that is the best pick for ${profile.name}. ` +
      `You MUST align your pick with ${profile.name}'s personality biases, color affinities, pool curve needs, and the cube's supported archetypes.`
    : `DECISION OBJECTIVE:\n` +
      `Select the single objectively strongest card for this drafter given current pool curve, color commitment, and cube archetypes.`;

  const state = [cubeSection, powerHierarchySection, botSection, poolSection, instructions]
    .filter(Boolean)
    .join("\n\n");

  return { state, criteria, instanceIdByName };
}

/**
 * Chooses a card using JEV System One non-autoregressive decision model.
 * Seamlessly falls back to local heuristic / friend bot policy if JEV is unavailable.
 */
export async function chooseWithJevBot(options: JevBotPickOptions): Promise<JevBotPickResult> {
  const router = options.router ?? new LlmRouter();
  const { offeredCards, priorPool, profile } = options;

  if (offeredCards.length === 0) {
    throw new Error("Cannot choose from an empty booster");
  }

  const fallbackCard = offeredCards[0];
  if (!fallbackCard) {
    throw new Error("Cannot choose from an empty booster");
  }

  const { state, criteria, instanceIdByName } = buildJevDraftContext(options);

  // 1. Attempt JEV Decision if key is available
  if (router.hasJevKey()) {
    const tStart = performance.now();
    try {
      const jevRes = await router.callJevDecision(
        state,
        {
          bot_pick: {
            type: "choice",
            instructions: profile
              ? `Which card does ${profile.name} pick from this booster?`
              : "Which card is the best pick?",
            criteria,
          },
        },
        {
          timeoutMs: options.timeoutMs ?? 5000,
          ...(options.model ? { model: options.model } : {}),
        },
      );

      const latencyMs = Math.round(performance.now() - tStart);

      if (jevRes.success && jevRes.content?.answers.bot_pick?.type === "choice") {
        const answer = jevRes.content.answers.bot_pick;
        const chosenCardName = answer.choice;
        const cardInstanceId = instanceIdByName.get(chosenCardName);

        if (cardInstanceId) {
          const choiceProb = answer.probabilities[chosenCardName] ?? 1.0;
          return {
            cardInstanceId,
            cardName: chosenCardName,
            usedJev: true,
            choiceProb,
            confidence: answer.confidence,
            probabilities: answer.probabilities,
            latencyMs,
            reason: `Choix IA JEV Système 1 (${(choiceProb * 100).toFixed(0)}% probabilité, ${String(latencyMs)}ms)`,
          };
        }
      }
    } catch {
      // Fallback silently to heuristic
    }
  }

  // 2. Fallback Heuristic / Friend Bot Policy
  const evalContext = {
    packNumber: options.packNumber,
    pickNumber: options.pickNumber,
    offeredCards: [...offeredCards],
    priorPool: [...priorPool],
  };

  const baseEvaluations = evaluatePack(evalContext);

  if (profile && Object.keys(profile.biases).length > 0) {
    const scored = baseEvaluations.map((ev) => {
      const originalInput = offeredCards.find((c) => c.id === ev.id);
      const contributions = originalInput
        ? computeFriendCardBiasContributions(
            originalInput,
            profile,
            priorPool,
            ev.breakdown.colorPenalty,
          )
        : [];
      const bonus = contributions.reduce((s, c) => s + c.points, 0);
      return { ev, score: ev.dynamicScore + bonus };
    });
    scored.sort((a, b) => b.score - a.score);
    const top = scored[0]?.ev ?? baseEvaluations[0];
    const topCard = top ? offeredCards.find((c) => c.id === top.id) : fallbackCard;
    const selected = topCard ?? fallbackCard;
    return {
      cardInstanceId: selected.id,
      cardName: selected.name,
      usedJev: false,
      choiceProb: 1.0,
      confidence: 1.0,
      probabilities: { [selected.name]: 1.0 },
      latencyMs: 0,
      reason: "Choix heuristique local (profil bot)",
    };
  }

  const top = baseEvaluations[0];
  const topCard = top ? offeredCards.find((c) => c.id === top.id) : fallbackCard;
  const selected = topCard ?? fallbackCard;
  return {
    cardInstanceId: selected.id,
    cardName: selected.name,
    usedJev: false,
    choiceProb: 1.0,
    confidence: 1.0,
    probabilities: { [selected.name]: 1.0 },
    latencyMs: 0,
    reason: "Choix heuristique local (score dynamique)",
  };
}
