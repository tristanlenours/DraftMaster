import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  fitIsotonicCalibration,
  predictIsotonicScore,
  selectRepresentativeScore,
  type ScoreObservation,
} from "../../src/cards/power-calibration.ts";

const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8")) as T;
const normalize = (value: string): string => value.trim().toLowerCase();
const metadata = readJson<Record<string, { name?: string }>>(
  "data/untapped_history/card-metadata-v1.json",
);
const drafts = readJson<
  Record<
    string,
    {
      startTime: number;
      picks?: Array<{ PackScores?: Record<string, { staticScore?: number | null }> }>;
    }
  >
>("data/untapped_history/drafts_backup.json");
const overrides = readJson<{ scores: Record<string, number> }>(
  "data/power-rankings/untapped-reference-v1.json",
).scores;

const observations = new Map<string, ScoreObservation[]>();
for (const draft of Object.values(drafts)) {
  for (const pick of draft.picks ?? []) {
    for (const [id, pair] of Object.entries(pick.PackScores ?? {})) {
      if (!Number.isFinite(pair.staticScore) || !metadata[id]?.name) continue;
      const key = normalize(metadata[id].name!);
      const values = observations.get(key) ?? [];
      values.push({ score: pair.staticScore!, observedAt: draft.startTime });
      observations.set(key, values);
    }
  }
}
const targets = new Map<string, number>();
for (const [name, values] of observations) {
  const score = selectRepresentativeScore(values);
  if (score !== undefined) targets.set(name, score);
}
for (const [name, score] of Object.entries(overrides)) targets.set(normalize(name), score);

interface Details {
  name: string;
  oracle_id?: string;
  elo: number;
  popularity?: number;
  cubeCount?: number;
  pickCount?: number;
  cmc?: number;
  firstPrintYear?: number;
  colors?: string[];
  type?: string;
  power?: string;
  toughness?: string;
  oracle_text?: string;
  oracle_tags?: string[];
}
const detailsByName = new Map<string, Details>();
for (const cubeKey of ["titou_tribal", "nico_candyshop"]) {
  const raw = readJson<{ cards: { mainboard: Array<{ details: Details }> } }>(
    `data/cubes/${cubeKey}/cubecobra-raw.json`,
  );
  for (const { details } of raw.cards.mainboard)
    detailsByName.set(normalize(details.name), details);
}

const cardNames = readdirSync(resolve(process.cwd(), "data/cards/items"))
  .filter((file) => file.endsWith(".json"))
  .map((file) => readJson<{ name: string }>(`data/cards/items/${file}`).name);
const samples = cardNames
  .map((name) => {
    const details = detailsByName.get(normalize(name));
    const target = targets.get(normalize(name));
    return details && target !== undefined ? { name, details, target } : undefined;
  })
  .filter(
    (sample): sample is { name: string; details: Details; target: number } => sample !== undefined,
  )
  .sort((left, right) => left.name.localeCompare(right.name));

const tagFrequency = new Map<string, number>();
for (const sample of samples) {
  for (const tag of new Set(sample.details.oracle_tags ?? [])) {
    tagFrequency.set(tag, (tagFrequency.get(tag) ?? 0) + 1);
  }
}
const tags = [...tagFrequency.entries()]
  .filter(([, count]) => count >= 5)
  .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
  .slice(0, 100)
  .map(([tag]) => tag);

const numericRows = samples.map(({ details }) => [
  details.elo,
  details.elo ** 2,
  details.popularity ?? 0,
  Math.log1p(details.cubeCount ?? 0),
  Math.log1p(details.pickCount ?? 0),
  details.cmc ?? 0,
  details.firstPrintYear ?? 1993,
  Number.parseFloat(details.power ?? "0") || 0,
  Number.parseFloat(details.toughness ?? "0") || 0,
  details.oracle_text?.length ?? 0,
]);
const means = numericRows[0]!.map(
  (_, column) => numericRows.reduce((total, row) => total + row[column]!, 0) / numericRows.length,
);
const deviations = means.map((mean, column) =>
  Math.sqrt(
    numericRows.reduce((total, row) => total + (row[column]! - mean) ** 2, 0) / numericRows.length,
  ),
);
const types = ["Land", "Creature", "Artifact", "Instant", "Sorcery", "Enchantment", "Planeswalker"];
const colors = ["W", "U", "B", "R", "G"];

function features(details: Details, rowIndex: number): number[] {
  const typeLine = details.type ?? "";
  const cardTags = new Set(details.oracle_tags ?? []);
  const cardColors = new Set(details.colors ?? []);
  return [
    1,
    ...numericRows[rowIndex]!.map(
      (value, column) => (value - means[column]!) / (deviations[column] || 1),
    ),
    ...types.map((type) => Number(typeLine.includes(type))),
    ...colors.map((color) => Number(cardColors.has(color))),
    Number(cardColors.size === 0),
    Number(cardColors.size > 1),
    ...tags.map((tag) => Number(cardTags.has(tag))),
  ];
}
const x = samples.map(({ details }, index) => features(details, index));
const y = samples.map(({ target }) => target);

function solve(matrix: number[][], vector: number[]): number[] {
  const size = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]!]);
  for (let pivot = 0; pivot < size; pivot += 1) {
    let best = pivot;
    for (let row = pivot + 1; row < size; row += 1) {
      if (Math.abs(augmented[row]![pivot]!) > Math.abs(augmented[best]![pivot]!)) best = row;
    }
    [augmented[pivot], augmented[best]] = [augmented[best]!, augmented[pivot]!];
    const divisor = augmented[pivot]![pivot]!;
    if (Math.abs(divisor) < 1e-10) continue;
    for (let column = pivot; column <= size; column += 1) augmented[pivot]![column]! /= divisor;
    for (let row = 0; row < size; row += 1) {
      if (row === pivot) continue;
      const factor = augmented[row]![pivot]!;
      if (factor === 0) continue;
      for (let column = pivot; column <= size; column += 1) {
        augmented[row]![column]! -= factor * augmented[pivot]![column]!;
      }
    }
  }
  return augmented.map((row) => row[size]!);
}

function fitRidge(indices: readonly number[], lambda: number): number[] {
  const dimensions = x[0]!.length;
  const matrix = Array.from({ length: dimensions }, () => Array(dimensions).fill(0) as number[]);
  const vector = Array(dimensions).fill(0) as number[];
  for (const index of indices) {
    for (let left = 0; left < dimensions; left += 1) {
      vector[left]! += x[index]![left]! * y[index]!;
      for (let right = 0; right < dimensions; right += 1) {
        matrix[left]![right]! += x[index]![left]! * x[index]![right]!;
      }
    }
  }
  for (let dimension = 1; dimension < dimensions; dimension += 1) {
    matrix[dimension]![dimension]! += lambda;
  }
  return solve(matrix, vector);
}

const predictLinear = (weights: readonly number[], row: readonly number[]): number =>
  weights.reduce((total, weight, index) => total + weight * row[index]!, 0);
const folds = 5;
const candidates: Array<{ lambda: number; blend: number; errors: number[] }> = [];
for (const lambda of [0.1, 1, 3, 10, 30, 100, 300, 1000]) {
  for (const blend of [0, 0.25, 0.5, 0.75, 1]) candidates.push({ lambda, blend, errors: [] });
}
for (let fold = 0; fold < folds; fold += 1) {
  const training = samples.map((_, index) => index).filter((index) => index % folds !== fold);
  const validation = samples.map((_, index) => index).filter((index) => index % folds === fold);
  const isotonic = fitIsotonicCalibration(
    training.map((index) => ({ input: samples[index]!.details.elo, target: y[index]! })),
  );
  for (const lambda of new Set(candidates.map(({ lambda: value }) => value))) {
    const weights = fitRidge(training, lambda);
    for (const index of validation) {
      const linear = predictLinear(weights, x[index]!);
      const monotonic = predictIsotonicScore(isotonic, samples[index]!.details.elo);
      for (const candidate of candidates.filter((entry) => entry.lambda === lambda)) {
        const prediction = Math.max(
          1,
          Math.min(53, candidate.blend * linear + (1 - candidate.blend) * monotonic),
        );
        candidate.errors.push(Math.abs(prediction - y[index]!));
      }
    }
  }
}
const ranked = candidates
  .map((candidate) => ({
    lambda: candidate.lambda,
    linearBlend: candidate.blend,
    mae: candidate.errors.reduce((total, error) => total + error, 0) / candidate.errors.length,
  }))
  .sort((left, right) => left.mae - right.mae);

interface KnnCandidate {
  readonly neighbors: number;
  readonly eloWeight: number;
  readonly tagWeight: number;
  readonly structureWeight: number;
  readonly errors: number[];
}
const knnCandidates: KnnCandidate[] = [];
for (const neighbors of [3, 5, 8, 12, 20, 32]) {
  for (const eloWeight of [0.5, 1, 2, 4]) {
    for (const tagWeight of [0, 0.5, 1, 2]) {
      for (const structureWeight of [0.5, 1, 2]) {
        knnCandidates.push({ neighbors, eloWeight, tagWeight, structureWeight, errors: [] });
      }
    }
  }
}
const tagOffset = 1 + numericRows[0]!.length + types.length + colors.length + 2;
function groupedDistance(left: number, right: number, candidate: KnnCandidate): number {
  const eloDistance = Math.abs(x[left]![1]! - x[right]![1]!);
  let numericDistance = 0;
  for (let index = 3; index <= numericRows[0]!.length; index += 1) {
    numericDistance += Math.abs(x[left]![index]! - x[right]![index]!);
  }
  numericDistance /= numericRows[0]!.length - 2;
  let structureDistance = 0;
  for (let index = 1 + numericRows[0]!.length; index < tagOffset; index += 1) {
    structureDistance += Number(x[left]![index] !== x[right]![index]);
  }
  structureDistance /= tagOffset - (1 + numericRows[0]!.length);
  let intersection = 0;
  let union = 0;
  for (let index = tagOffset; index < x[0]!.length; index += 1) {
    intersection += Number(x[left]![index] === 1 && x[right]![index] === 1);
    union += Number(x[left]![index] === 1 || x[right]![index] === 1);
  }
  const tagDistance = union === 0 ? 0 : 1 - intersection / union;
  return (
    candidate.eloWeight * eloDistance +
    numericDistance +
    candidate.structureWeight * structureDistance +
    candidate.tagWeight * tagDistance
  );
}
for (let fold = 0; fold < folds; fold += 1) {
  const training = samples.map((_, index) => index).filter((index) => index % folds !== fold);
  const validation = samples.map((_, index) => index).filter((index) => index % folds === fold);
  for (const candidate of knnCandidates) {
    for (const index of validation) {
      const nearest = training
        .map((other) => ({ other, distance: groupedDistance(index, other, candidate) }))
        .sort((left, right) => left.distance - right.distance)
        .slice(0, candidate.neighbors);
      let weightedTotal = 0;
      let totalWeight = 0;
      for (const neighbor of nearest) {
        const weight = 1 / (neighbor.distance + 0.25) ** 2;
        weightedTotal += weight * y[neighbor.other]!;
        totalWeight += weight;
      }
      candidate.errors.push(Math.abs(weightedTotal / totalWeight - y[index]!));
    }
  }
}
const rankedKnn = knnCandidates
  .map((candidate) => ({
    neighbors: candidate.neighbors,
    eloWeight: candidate.eloWeight,
    tagWeight: candidate.tagWeight,
    structureWeight: candidate.structureWeight,
    mae: candidate.errors.reduce((total, error) => total + error, 0) / candidate.errors.length,
  }))
  .sort((left, right) => left.mae - right.mae);

const outOfFoldLinear = Array(samples.length).fill(0) as number[];
const outOfFoldKnn = Array(samples.length).fill(0) as number[];
const bestKnnConfiguration: KnnCandidate = {
  neighbors: 3,
  eloWeight: 1,
  tagWeight: 0.5,
  structureWeight: 2,
  errors: [],
};
for (let fold = 0; fold < folds; fold += 1) {
  const training = samples.map((_, index) => index).filter((index) => index % folds !== fold);
  const validation = samples.map((_, index) => index).filter((index) => index % folds === fold);
  const weights = fitRidge(training, 3);
  for (const index of validation) {
    outOfFoldLinear[index] = Math.max(1, Math.min(53, predictLinear(weights, x[index]!)));
    const nearest = training
      .map((other) => ({ other, distance: groupedDistance(index, other, bestKnnConfiguration) }))
      .sort((left, right) => left.distance - right.distance)
      .slice(0, bestKnnConfiguration.neighbors);
    let weightedTotal = 0;
    let totalWeight = 0;
    for (const neighbor of nearest) {
      const weight = 1 / (neighbor.distance + 0.25) ** 2;
      weightedTotal += weight * y[neighbor.other]!;
      totalWeight += weight;
    }
    outOfFoldKnn[index] = weightedTotal / totalWeight;
  }
}
const ensembles = Array.from({ length: 11 }, (_, index) => index / 10).map((linearWeight) => ({
  linearWeight,
  mae:
    y.reduce(
      (total, target, index) =>
        total +
        Math.abs(
          linearWeight * outOfFoldLinear[index]! +
            (1 - linearWeight) * outOfFoldKnn[index]! -
            target,
        ),
      0,
    ) / y.length,
}));
ensembles.sort((left, right) => left.mae - right.mae);

console.log(
  JSON.stringify(
    {
      samples: samples.length,
      dimensions: x[0]?.length,
      tags: tags.length,
      bestModels: ranked
        .slice(0, 12)
        .map((model) => ({ ...model, mae: Math.round(model.mae * 100) / 100 })),
      bestKnnModels: rankedKnn
        .slice(0, 12)
        .map((model) => ({ ...model, mae: Math.round(model.mae * 100) / 100 })),
      bestEnsembles: ensembles
        .slice(0, 5)
        .map((model) => ({ ...model, mae: Math.round(model.mae * 100) / 100 })),
    },
    null,
    2,
  ),
);
