// Exploratory held-out model for Untapped dynamic scores with advanced mana modeling.
// Features include:
// - Semantic fetchland parsing (oracle text)
// - Hybrid and phyrexian mana cost handling
// - Continuous color profile with 2-color + splash support
// - Differentiated dual land and off-color land fit/miss
// - Directional card-pair priors
//
// This is deliberately a research harness, not production domain logic.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const defaultHeldOutDraftId = "d555b02d-3745-4a4f-b1b6-fdc75c38c5c0";
const draftsPath = path.join(repoRoot, "data/untapped_history/drafts_backup.json");
const metadataPath = path.join(repoRoot, "data/untapped_history/card-metadata-v1.json");
const outputFlagIndex = process.argv.indexOf("--output");
const outputPath =
  outputFlagIndex === -1
    ? undefined
    : path.resolve(repoRoot, process.argv[outputFlagIndex + 1] ?? "");
if (outputFlagIndex !== -1 && !process.argv[outputFlagIndex + 1]) {
  throw new Error("--output requires a repository-relative path");
}
if (
  process.argv.some((argument) => argument.startsWith("--") && argument !== "--output") ||
  process.argv.filter((argument) => argument === "--output").length > 1
) {
  throw new Error("Usage: node scripts/research/untapped-advanced-mana-benchmark.mjs [--output <path>]");
}
const heldOutDraftId = defaultHeldOutDraftId;
const drafts = JSON.parse(fs.readFileSync(draftsPath, "utf8"));
const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
const colors = ["W", "U", "B", "R", "G"];
const basicLandTypeColors = {
  Plains: "W",
  Island: "U",
  Swamp: "B",
  Mountain: "R",
  Forest: "G",
};

function sha256(pathname) {
  return crypto.createHash("sha256").update(fs.readFileSync(pathname)).digest("hex").toUpperCase();
}

const featureDefinitions = [
  ["power.linearDecay", "Puissance"],
  ["power.lateDecay", "Puissance"],
  ["mana.spellMiss", "Mana"],
  ["mana.spellMissConfident", "Mana"],
  ["mana.goldTax", "Mana"],
  ["mana.landMiss", "Mana"],
  ["mana.landFit", "Mana"],
  ["mana.landDualFit", "Mana"],
  ["mana.colorless", "Mana"],
  ["curve.shortage", "Courbe"],
  ["curve.glut", "Courbe"],
  ["interaction.shortage", "Interaction"],
  ["interaction.glut", "Interaction"],
  ["synergy.bestPair", "Synergie"],
  ["synergy.poolFit", "Synergie"],
  ["synergy.tribe", "Synergie"],
  ["pair.priorDelta", "Affinités"],
];

const featureNames = featureDefinitions.map(([name]) => name);
const axisByFeature = new Map(featureDefinitions);

function cardMetadata(cardId) {
  return metadata[cardId];
}

function isLand(card) {
  return String(card?.type_line ?? "").includes("Land");
}

function fetchedColors(card) {
  if (!isLand(card)) return [];
  const text = String(card?.oracle_text ?? "");
  if (/search your library for a basic land card/i.test(text)) {
    return [...colors];
  }
  const match = /search your library for an? (Plains|Island|Swamp|Mountain|Forest) or (?:an? )?(Plains|Island|Swamp|Mountain|Forest)/i.exec(text);
  if (match) {
    const c1 = basicLandTypeColors[match[1]];
    const c2 = basicLandTypeColors[match[2]];
    return [c1, c2].filter(Boolean);
  }
  return [];
}

function effectiveLandColors(card) {
  if (!isLand(card)) return [];
  const fetched = fetchedColors(card);
  if (fetched.length > 0) return fetched;
  const produced = (card?.produced_mana ?? []).filter((color) => colors.includes(color));
  if (produced.length > 0) return produced;
  return (card?.color_identity ?? []).filter((color) => colors.includes(color));
}

function cardColors(card) {
  return (card?.colors ?? []).filter((color) => colors.includes(color));
}

function isInteraction(card) {
  const text = String(card?.oracle_text ?? "").toLowerCase();
  return /counter target|destroy target|exile target|deals? \w+ damage to (any|target)|target .* gets? -\d|return target .* to (its|their) owner's hand|fight target/.test(
    text,
  );
}

function curveBucket(card) {
  if (isLand(card)) return undefined;
  const cmc = Number(card?.cmc);
  if (!Number.isFinite(cmc)) return undefined;
  if (cmc <= 1) return 1;
  if (cmc >= 6) return 6;
  return Math.round(cmc);
}

function cardTags(card) {
  const tags = new Set();
  const type = String(card?.type_line ?? "").toLowerCase();
  const text = String(card?.oracle_text ?? "").toLowerCase();
  for (const token of [
    "artifact",
    "creature",
    "enchantment",
    "instant",
    "sorcery",
    "planeswalker",
    "equipment",
    "vehicle",
  ]) {
    if (type.includes(token)) tags.add(`type:${token}`);
  }
  const patterns = [
    ["draw", /draw a card|draw two|draw three|draw x/],
    ["discard", /discard/],
    ["graveyard", /graveyard|mill |delirium|escape|flashback|unearth|threshold/],
    ["token", /create .* token|tokens? you control/],
    ["sacrifice", /sacrifice/],
    ["counterspell", /counter target/],
    ["removal", /destroy target|exile target|deals? \w+ damage to (any|target)|gets? -\d/],
    ["lifegain", /gain \w+ life|lifelink/],
    ["land", /landfall|lands? you control|land card|additional land/],
    ["blink", /exile .* return .* battlefield/],
    ["reanimate", /return .* from .* graveyard .* battlefield/],
    ["spells", /instant or sorcery|noncreature spell|cast a spell/],
    ["counters", /\+1\/\+1 counter|counter on/],
  ];
  for (const [tag, pattern] of patterns) {
    if (pattern.test(text)) tags.add(`theme:${tag}`);
  }
  for (const keyword of card?.keywords ?? []) {
    tags.add(`keyword:${String(keyword).toLowerCase()}`);
  }
  return tags;
}

function creatureSubtypes(card) {
  const type = String(card?.type_line ?? "");
  const separator = type.indexOf("—");
  if (separator < 0 || !type.toLowerCase().includes("creature")) return [];
  return type
    .slice(separator + 1)
    .trim()
    .toLowerCase()
    .split(/\s+/u)
    .filter(Boolean);
}

function overlapCount(left, right) {
  let count = 0;
  for (const value of left) if (right.has(value)) count++;
  return count;
}

function buildPool(pick, staticById) {
  return pick.PickedCards.map((id) => ({
    id,
    card: cardMetadata(id),
    staticScore: staticById.get(id) ?? 25,
  })).filter(({ card }) => card);
}

function colorProfile(pool) {
  const weights = Object.fromEntries(colors.map((color) => [color, 0]));
  for (const item of pool) {
    const itemColors = isLand(item.card) ? effectiveLandColors(item.card) : cardColors(item.card);
    if (itemColors.length === 0) continue;
    const weight = Math.max(5, item.staticScore) / itemColors.length;
    for (const color of itemColors) weights[color] += weight;
  }
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  const ranked = colors.toSorted((left, right) => weights[right] - weights[left]);
  const shares = Object.fromEntries(
    colors.map((color) => [color, total === 0 ? 0.2 : weights[color] / total]),
  );
  const dominant = new Set(ranked.slice(0, Math.min(2, pool.length)));
  const confidence = total === 0 ? 0 : (weights[ranked[0]] + weights[ranked[1]]) / total;
  const splashColor = ranked[2] && shares[ranked[2]] >= 0.12 ? ranked[2] : undefined;
  return { weights, shares, ranked, dominant, confidence, splashColor, total };
}

function parseCardPips(card) {
  const cost = String(card?.mana_cost ?? "");
  const pips = [];
  // regular colored pips: oW, oU, oB, oR, oG (not followed by /)
  for (const match of cost.matchAll(/o([WUBRG])(?!\/)/g)) {
    pips.push([match[1]]);
  }
  // hybrid pips: o(X/Y)
  for (const match of cost.matchAll(/o\(([WUBRG])\/([WUBRG])\)/g)) {
    pips.push([match[1], match[2]]);
  }
  return pips;
}

function cardManaEvaluation(card, profile) {
  if (isLand(card)) {
    const landColors = effectiveLandColors(card);
    if (landColors.length === 0) {
      // Colorless utility land
      return { affinity: 1.0, isDualFit: 0, landMiss: 0 };
    }
    if (landColors.length >= 5) {
      // Universal rainbow / prismatic
      return { affinity: 1.0, isDualFit: 0.5, landMiss: 0 };
    }
    const [c1, c2] = profile.ranked;
    let matchCount = 0;
    let splashMatch = false;
    for (const color of landColors) {
      if (color === c1 || color === c2) matchCount++;
      else if (color === profile.splashColor) splashMatch = true;
    }
    if (matchCount === 2) {
      return { affinity: 1.0, isDualFit: 1.0, landMiss: 0 };
    }
    if (matchCount === 1 && splashMatch) {
      return { affinity: 0.85, isDualFit: 0.4, landMiss: 0 };
    }
    if (matchCount === 1) {
      return { affinity: 0.50, isDualFit: 0, landMiss: 0.2 };
    }
    if (splashMatch) {
      return { affinity: 0.35, isDualFit: 0, landMiss: 0.5 };
    }
    // Completely off-color land
    return { affinity: 0.0, isDualFit: 0, landMiss: 1.0 };
  }

  // Spells
  const pips = parseCardPips(card);
  if (pips.length === 0) {
    // Colorless or phyrexian-only
    return { affinity: 1.0, isDualFit: 0, landMiss: 0 };
  }
  let totalScore = 0;
  const [c1, c2] = profile.ranked;
  for (const options of pips) {
    let best = 0;
    for (const color of options) {
      let score = 0;
      if (color === c1 || color === c2) {
        score = 1.0;
      } else if (color === profile.splashColor) {
        score = Math.min(1.0, 0.4 + 2 * profile.shares[color]);
      } else {
        score = Math.min(0.2, 2 * profile.shares[color]);
      }
      best = Math.max(best, score);
    }
    totalScore += best;
  }
  const affinity = totalScore / pips.length;
  return { affinity, isDualFit: 0, landMiss: 0 };
}

function curveNeed(card, pool) {
  const bucket = curveBucket(card);
  if (bucket === undefined) return 0;
  const targets = { 1: 0.12, 2: 0.28, 3: 0.25, 4: 0.15, 5: 0.12, 6: 0.08 };
  const bucketed = pool.map(({ card: poolCard }) => curveBucket(poolCard)).filter(Boolean);
  if (bucketed.length === 0) return targets[bucket];
  const share = bucketed.filter((value) => value === bucket).length / bucketed.length;
  return targets[bucket] - share;
}

function interactionNeed(card, pool) {
  if (!isInteraction(card)) return 0;
  const spells = pool.filter(({ card: poolCard }) => !isLand(poolCard));
  const share =
    spells.length === 0
      ? 0
      : spells.filter(({ card: poolCard }) => isInteraction(poolCard)).length / spells.length;
  return 0.22 - share;
}

function synergy(card, pool) {
  const tags = cardTags(card);
  const subtypes = new Set(creatureSubtypes(card));
  let bestPair = 0;
  let total = 0;
  let tribe = 0;
  for (const { card: poolCard } of pool) {
    const shared = overlapCount(tags, cardTags(poolCard));
    bestPair = Math.max(bestPair, shared);
    total += shared;
    if (subtypes.size > 0 && creatureSubtypes(poolCard).some((subtype) => subtypes.has(subtype))) {
      tribe++;
    }
  }
  return {
    bestPair,
    poolFit: pool.length === 0 ? 0 : total / Math.sqrt(pool.length),
    tribe,
  };
}

function features(card, staticScore, pick, pool) {
  const t = (pick.PackNumber - 1) * 15 + pick.PickNumber;
  const progress = (t - 1) / 44;
  const commitment = Math.sqrt(progress);
  const profile = colorProfile(pool);
  const manaEval = cardManaEvaluation(card, profile);
  const identity = isLand(card) ? effectiveLandColors(card) : cardColors(card);
  const manaMiss = 1 - manaEval.affinity;
  const need = curveNeed(card, pool);
  const interaction = interactionNeed(card, pool);
  const fit = synergy(card, pool);

  return [
    -staticScore * progress,
    -staticScore * progress * progress,
    isLand(card) ? 0 : -staticScore * commitment * manaMiss,
    isLand(card) ? 0 : -staticScore * commitment * manaMiss * profile.confidence,
    isLand(card) ? 0 : -staticScore * commitment * Math.max(0, identity.length - 1),
    isLand(card) ? -staticScore * commitment * manaEval.landMiss : 0,
    isLand(card) ? staticScore * commitment * manaEval.affinity : 0,
    isLand(card) ? staticScore * commitment * manaEval.isDualFit : 0,
    !isLand(card) && identity.length === 0 ? staticScore * commitment : 0,
    Math.max(0, need) * 20 * commitment,
    Math.min(0, need) * 20 * commitment,
    Math.max(0, interaction) * 20 * commitment,
    Math.min(0, interaction) * 20 * commitment,
    fit.bestPair * 5 * commitment,
    fit.poolFit * 5 * commitment,
    fit.tribe * 3 * commitment,
    0, // placeholder for pair prior
  ];
}

function pairStatistics(samples) {
  const statistics = new Map();
  for (const sample of samples) {
    for (const pickedId of sample.pick.PickedCards ?? []) {
      const key = `${sample.id}:${pickedId}`;
      const existing = statistics.get(key) ?? { count: 0, targetSum: 0 };
      existing.count++;
      existing.targetSum += sample.target;
      statistics.set(key, existing);
    }
  }
  return statistics;
}

function pairPriorDelta(sample, statistics, shrinkage = 5) {
  const deltas = [];
  for (const pickedId of sample.pick.PickedCards ?? []) {
    const observation = statistics.get(`${sample.id}:${pickedId}`);
    if (observation) {
      deltas.push(observation.targetSum / (observation.count + shrinkage));
    }
  }
  return deltas.length === 0
    ? 0
    : deltas.reduce((sum, value) => sum + value, 0) / deltas.length;
}

function withPairFeature(samples, referenceSamples) {
  const statistics = pairStatistics(referenceSamples);
  return samples.map((sample) => ({
    ...sample,
    x: [...sample.x.slice(0, -1), pairPriorDelta(sample, statistics)],
  }));
}

function enrichTrainingDrafts(baseDrafts) {
  return baseDrafts.map(([draftId, samples]) => [
    draftId,
    withPairFeature(
      samples,
      baseDrafts
        .filter(([otherDraftId]) => otherDraftId !== draftId)
        .flatMap(([, otherSamples]) => otherSamples),
    ),
  ]);
}

function numericScoreCount(draft) {
  let count = 0;
  for (const pick of draft.picks ?? []) {
    for (const score of Object.values(pick.PackScores ?? {})) {
      if (Number.isFinite(score.staticScore) && Number.isFinite(score.dynamicScore)) {
        count++;
      }
    }
  }
  return count;
}

function samplesForDraft(draftId, draft) {
  const staticById = new Map();
  for (const pick of draft.picks ?? []) {
    for (const [id, score] of Object.entries(pick.PackScores ?? {})) {
      if (Number.isFinite(score.staticScore) && !staticById.has(id)) {
        staticById.set(id, score.staticScore);
      }
    }
  }
  const samples = [];
  for (const pick of draft.picks ?? []) {
    const pool = buildPool(pick, staticById);
    for (const [id, score] of Object.entries(pick.PackScores ?? {})) {
      const card = cardMetadata(id);
      if (!card || !Number.isFinite(score.staticScore) || !Number.isFinite(score.dynamicScore)) {
        continue;
      }
      samples.push({
        draftId,
        pick,
        id,
        card,
        staticScore: score.staticScore,
        dynamicScore: score.dynamicScore,
        target: score.dynamicScore - score.staticScore,
        x: features(card, score.staticScore, pick, pool),
      });
    }
  }
  return samples;
}

function solve(matrix, vector) {
  const size = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);
  for (let column = 0; column < size; column++) {
    let pivot = column;
    for (let row = column + 1; row < size; row++) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) {
        pivot = row;
      }
    }
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    if (Math.abs(divisor) < 1e-12) continue;
    for (let j = column; j <= size; j++) augmented[column][j] /= divisor;
    for (let row = 0; row < size; row++) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let j = column; j <= size; j++) {
        augmented[row][j] -= factor * augmented[column][j];
      }
    }
  }
  return augmented.map((row) => row[size]);
}

function fit(samples, lambda) {
  const scale = featureNames.map((_, index) => {
    const meanSquare =
      samples.reduce((sum, sample) => sum + sample.x[index] ** 2, 0) / samples.length;
    return Math.sqrt(meanSquare) || 1;
  });
  const size = featureNames.length;
  const matrix = Array.from({ length: size }, () => Array(size).fill(0));
  const vector = Array(size).fill(0);
  for (const sample of samples) {
    const scaled = sample.x.map((value, index) => value / scale[index]);
    for (let row = 0; row < size; row++) {
      vector[row] += scaled[row] * sample.target;
      for (let column = 0; column < size; column++) {
        matrix[row][column] += scaled[row] * scaled[column];
      }
    }
  }
  for (let index = 0; index < size; index++) matrix[index][index] += lambda;
  return { beta: solve(matrix, vector), scale };
}

function predict(sample, model) {
  const contributions = sample.x.map(
    (value, index) => (value / model.scale[index]) * model.beta[index],
  );
  return {
    prediction: sample.staticScore + contributions.reduce((sum, value) => sum + value, 0),
    contributions,
  };
}

function axisContributions(sample, model) {
  const result = predict(sample, model);
  const totals = Object.fromEntries([...new Set(axisByFeature.values())].map((axis) => [axis, 0]));
  result.contributions.forEach((value, index) => {
    totals[axisByFeature.get(featureNames[index])] += value;
  });
  return totals;
}

function mae(samples, model) {
  return (
    samples.reduce(
      (sum, sample) => sum + Math.abs(predict(sample, model).prediction - sample.dynamicScore),
      0,
    ) / samples.length
  );
}

const baseSamplesByDraft = new Map(
  Object.entries(drafts).map(([draftId, draft]) => [draftId, samplesForDraft(draftId, draft)]),
);
const trainingBaseDrafts = [...baseSamplesByDraft.entries()].filter(
  ([draftId, samples]) => draftId !== heldOutDraftId && samples.length > 0,
);
const heldOutBase = baseSamplesByDraft.get(heldOutDraftId) ?? [];
const heldOut = withPairFeature(
  heldOutBase,
  trainingBaseDrafts.flatMap(([, samples]) => samples),
);
if (heldOut.length === 0) throw new Error(`No held-out samples for ${heldOutDraftId}`);
const heldOutNumericScoreCount = numericScoreCount(drafts[heldOutDraftId]);
if (heldOut.length !== heldOutNumericScoreCount) {
  throw new Error(
    `Incomplete card metadata for held-out draft: expected ${heldOutNumericScoreCount} numeric scores, enriched ${heldOut.length}`,
  );
}

const lambdas = [0.01, 0.1, 1, 10, 100, 1000];
const validation = lambdas.map((lambda) => {
  let error = 0;
  let count = 0;
  for (const [validationId, validationBaseSamples] of trainingBaseDrafts) {
    const trainBaseDrafts = trainingBaseDrafts.filter(([draftId]) => draftId !== validationId);
    const train = enrichTrainingDrafts(trainBaseDrafts).flatMap(([, samples]) => samples);
    const validationSamples = withPairFeature(
      validationBaseSamples,
      trainBaseDrafts.flatMap(([, samples]) => samples),
    );
    const model = fit(train, lambda);
    error += mae(validationSamples, model) * validationSamples.length;
    count += validationSamples.length;
  }
  return { lambda, mae: error / count };
});
const selectedLambda = validation.toSorted((left, right) => left.mae - right.mae)[0].lambda;
const trainingDrafts = enrichTrainingDrafts(trainingBaseDrafts);
const training = trainingDrafts.flatMap(([, samples]) => samples);
const model = fit(training, selectedLambda);

function maskedSamples(samples, allowedAxes) {
  return samples.map((sample) => ({
    ...sample,
    x: sample.x.map((value, index) =>
      allowedAxes.has(axisByFeature.get(featureNames[index])) ? value : 0,
    ),
  }));
}

const ablations = [
  ["Puissance", ["Puissance"]],
  ["Puissance + Mana", ["Puissance", "Mana"]],
  ["Puissance + Courbe", ["Puissance", "Courbe"]],
  ["Puissance + Interaction", ["Puissance", "Interaction"]],
  ["Puissance + Synergie", ["Puissance", "Synergie"]],
  [
    "Tous les axes sans affinités",
    ["Puissance", "Mana", "Courbe", "Interaction", "Synergie"],
  ],
  [
    "Tous les axes avec affinités",
    ["Puissance", "Mana", "Courbe", "Interaction", "Synergie", "Affinités"],
  ],
].map(([label, axes]) => {
  const allowed = new Set(axes);
  const maskedTraining = maskedSamples(training, allowed);
  const maskedHeldOut = maskedSamples(heldOut, allowed);
  const maskedModel = fit(maskedTraining, selectedLambda);
  return { label, mae: mae(maskedHeldOut, maskedModel) };
});

const baselineMae =
  heldOut.reduce((sum, sample) => sum + Math.abs(sample.staticScore - sample.dynamicScore), 0) /
  heldOut.length;
const heldOutMae = mae(heldOut, model);
const withinOne =
  heldOut.filter((sample) => Math.abs(predict(sample, model).prediction - sample.dynamicScore) <= 1)
    .length / heldOut.length;
const withinThree =
  heldOut.filter((sample) => Math.abs(predict(sample, model).prediction - sample.dynamicScore) <= 3)
    .length / heldOut.length;

let topOneMatches = 0;
const pickGroups = Map.groupBy(
  heldOut,
  (sample) => `${sample.pick.PackNumber}-${sample.pick.PickNumber}`,
);
for (const samples of pickGroups.values()) {
  const actual = samples.toSorted((left, right) => right.dynamicScore - left.dynamicScore)[0];
  const predicted = samples.toSorted(
    (left, right) => predict(right, model).prediction - predict(left, model).prediction,
  )[0];
  if (actual.id === predicted.id) topOneMatches++;
}

const axes = [...new Set(axisByFeature.values())];
const rows = heldOut.map((sample) => {
  const result = predict(sample, model);
  return {
    pick: `P${sample.pick.PackNumber}P${sample.pick.PickNumber}`,
    cardId: sample.id,
    card: sample.card.name,
    staticScore: sample.staticScore,
    dynamicScore: sample.dynamicScore,
    predictedScore: result.prediction,
    absoluteError: Math.abs(result.prediction - sample.dynamicScore),
    picked: sample.pick.PickedCard === sample.id,
    contributions: axisContributions(sample, model),
  };
});

const report = {
  schemaVersion: "untapped-advanced-mana-benchmark/v1",
  purpose:
    "Exploratory held-out calibration benchmark with advanced mana modeling (fetchlands, hybrid mana, continuous color profile, land dual fit). This does not reproduce Untapped's proprietary algorithm.",
  split: {
    heldOutDraftId,
    trainingDrafts: trainingDrafts.map(([draftId]) => draftId).toSorted(),
    trainingSamples: training.length,
    heldOutSamples: heldOut.length,
    heldOutPicks: pickGroups.size,
  },
  inputs: {
    drafts: {
      path: "data/untapped_history/drafts_backup.json",
      sha256: sha256(draftsPath),
    },
    cardMetadata: {
      path: "data/untapped_history/card-metadata-v1.json",
      sha256: sha256(metadataPath),
    },
    heldOutCoverage: {
      numericScores: heldOutNumericScoreCount,
      enrichedScores: heldOut.length,
    },
  },
  model: {
    featureDefinitions: Object.fromEntries(featureDefinitions),
    validation,
    selectedLambda,
    coefficients: Object.fromEntries(
      featureNames.map((name, index) => [name, model.beta[index] / model.scale[index]]),
    ),
    pairPrior: {
      direction: "candidate card -> already picked card",
      target: "mean dynamicScore - staticScore",
      shrinkage: 5,
      trainingEncoding: "leave-one-draft-out within the training split",
      heldOutEncoding: "training split only",
    },
  },
  metrics: {
    baselineStaticMae: baselineMae,
    ablations,
    heldOutMae,
    withinOne,
    withinThree,
    topOneAccuracy: topOneMatches / pickGroups.size,
  },
  axes,
  rows,
};

if (outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

console.log(
  JSON.stringify(
    {
      schemaVersion: report.schemaVersion,
      outputPath: outputPath ? path.relative(repoRoot, outputPath) : null,
      split: report.split,
      metrics: report.metrics,
    },
    null,
    2,
  ),
);
