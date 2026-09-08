import { MAX_POWER_SCORE, MIN_POWER_SCORE } from "./power-harmonizer.ts";

export interface ScoreObservation {
  readonly score: number;
  readonly observedAt: number;
}

export interface CalibrationSample {
  readonly input: number;
  readonly target: number;
  readonly weight?: number;
}

export interface IsotonicBlock {
  readonly inputMin: number;
  readonly inputMax: number;
  readonly score: number;
}

interface MutableBlock {
  inputMin: number;
  inputMax: number;
  weightedScore: number;
  weight: number;
}

export function selectRepresentativeScore(
  observations: readonly ScoreObservation[],
): number | undefined {
  if (observations.length === 0) return undefined;

  const ordered = [...observations].sort((left, right) => left.observedAt - right.observedAt);
  const frequencies = new Map<number, { count: number; firstSeen: number }>();

  ordered.forEach((observation, index) => {
    const current = frequencies.get(observation.score);
    frequencies.set(observation.score, {
      count: (current?.count ?? 0) + 1,
      firstSeen: current?.firstSeen ?? index,
    });
  });

  return [...frequencies.entries()].sort(
    (left, right) => right[1].count - left[1].count || left[1].firstSeen - right[1].firstSeen,
  )[0]?.[0];
}

export function fitIsotonicCalibration(
  samples: readonly CalibrationSample[],
): readonly IsotonicBlock[] {
  if (samples.length === 0) return [];

  const sorted = [...samples].sort((left, right) => left.input - right.input);
  const grouped: MutableBlock[] = [];

  for (const sample of sorted) {
    if (!Number.isFinite(sample.input) || !Number.isFinite(sample.target)) {
      throw new TypeError("Calibration samples must contain finite numbers.");
    }
    const weight = sample.weight ?? 1;
    if (!(weight > 0) || !Number.isFinite(weight)) {
      throw new RangeError("Calibration sample weights must be finite and positive.");
    }

    const previous = grouped.at(-1);
    if (previous?.inputMax === sample.input) {
      previous.weightedScore += sample.target * weight;
      previous.weight += weight;
      continue;
    }
    grouped.push({
      inputMin: sample.input,
      inputMax: sample.input,
      weightedScore: sample.target * weight,
      weight,
    });
  }

  const blocks: MutableBlock[] = [];
  for (const group of grouped) {
    blocks.push({ ...group });
    while (blocks.length >= 2) {
      const right = blocks.at(-1);
      const left = blocks.at(-2);
      if (!left || !right) throw new Error("Isotonic block invariant failed.");
      if (left.weightedScore / left.weight <= right.weightedScore / right.weight) break;
      blocks.splice(-2, 2, {
        inputMin: left.inputMin,
        inputMax: right.inputMax,
        weightedScore: left.weightedScore + right.weightedScore,
        weight: left.weight + right.weight,
      });
    }
  }

  return blocks.map((block) => ({
    inputMin: block.inputMin,
    inputMax: block.inputMax,
    score: block.weightedScore / block.weight,
  }));
}

export function predictIsotonicScore(blocks: readonly IsotonicBlock[], input: number): number {
  if (blocks.length === 0) throw new RangeError("At least one isotonic block is required.");
  if (!Number.isFinite(input)) throw new TypeError("The score input must be finite.");

  const first = blocks[0];
  if (!first) throw new Error("Isotonic block invariant failed.");
  if (input <= first.inputMax) return first.score;

  for (let index = 1; index < blocks.length; index += 1) {
    const left = blocks[index - 1];
    const right = blocks[index];
    if (!left || !right) throw new Error("Isotonic block invariant failed.");
    if (input <= right.inputMin) {
      const span = right.inputMin - left.inputMax;
      if (span <= 0) return right.score;
      const progress = (input - left.inputMax) / span;
      return left.score + (right.score - left.score) * progress;
    }
    if (input <= right.inputMax) return right.score;
  }

  const last = blocks.at(-1);
  if (!last) throw new Error("Isotonic block invariant failed.");
  return last.score;
}

export function roundPowerScore(score: number): number {
  return Math.round(Math.max(MIN_POWER_SCORE, Math.min(MAX_POWER_SCORE, score)) * 10) / 10;
}

export function fitRidgeRegression(
  features: readonly (readonly number[])[],
  targets: readonly number[],
  lambda: number,
): readonly number[] {
  if (features.length === 0 || features.length !== targets.length) {
    throw new RangeError("Ridge regression requires matching non-empty features and targets.");
  }
  const dimensions = features[0]?.length ?? 0;
  if (features.some((row) => row.length !== dimensions)) {
    throw new RangeError("Every feature row must have the same length.");
  }
  const matrix = Array.from({ length: dimensions }, () => Array(dimensions).fill(0) as number[]);
  const vector = Array(dimensions).fill(0) as number[];
  for (let sample = 0; sample < features.length; sample += 1) {
    const row = features[sample];
    const target = targets[sample];
    if (!row || target === undefined) throw new Error("Ridge sample invariant failed.");
    for (let left = 0; left < dimensions; left += 1) {
      vector[left] = (vector[left] ?? 0) + (row[left] ?? 0) * target;
      const matrixRow = matrix[left];
      if (!matrixRow) throw new Error("Ridge matrix invariant failed.");
      for (let right = 0; right < dimensions; right += 1) {
        matrixRow[right] = (matrixRow[right] ?? 0) + (row[left] ?? 0) * (row[right] ?? 0);
      }
    }
  }
  for (let dimension = 1; dimension < dimensions; dimension += 1) {
    const row = matrix[dimension];
    if (!row) throw new Error("Ridge matrix invariant failed.");
    row[dimension] = (row[dimension] ?? 0) + lambda;
  }

  const augmented = matrix.map((row, index) => [...row, vector[index] ?? 0]);
  for (let pivot = 0; pivot < dimensions; pivot += 1) {
    let best = pivot;
    for (let row = pivot + 1; row < dimensions; row += 1) {
      if (Math.abs(augmented[row]?.[pivot] ?? 0) > Math.abs(augmented[best]?.[pivot] ?? 0)) {
        best = row;
      }
    }
    const pivotRow = augmented[pivot];
    const bestRow = augmented[best];
    if (!pivotRow || !bestRow) throw new Error("Ridge matrix invariant failed.");
    augmented[pivot] = bestRow;
    augmented[best] = pivotRow;
    const normalizedPivotRow = augmented[pivot];
    if (!normalizedPivotRow) throw new Error("Ridge matrix invariant failed.");
    const divisor = normalizedPivotRow[pivot] ?? 0;
    if (Math.abs(divisor) < 1e-10) continue;
    for (let column = pivot; column <= dimensions; column += 1) {
      normalizedPivotRow[column] = (normalizedPivotRow[column] ?? 0) / divisor;
    }
    for (let row = 0; row < dimensions; row += 1) {
      if (row === pivot) continue;
      const currentRow = augmented[row];
      if (!currentRow) throw new Error("Ridge matrix invariant failed.");
      const factor = currentRow[pivot] ?? 0;
      if (factor === 0) continue;
      for (let column = pivot; column <= dimensions; column += 1) {
        currentRow[column] = (currentRow[column] ?? 0) - factor * (normalizedPivotRow[column] ?? 0);
      }
    }
  }
  return augmented.map((row) => row[dimensions] ?? 0);
}

export function predictRidgeScore(weights: readonly number[], features: readonly number[]): number {
  if (weights.length !== features.length) {
    throw new RangeError("Ridge weights and features must have the same length.");
  }
  return weights.reduce((total, weight, index) => total + weight * (features[index] ?? 0), 0);
}

export interface KnnLayout {
  readonly eloIndex: number;
  readonly numericStart: number;
  readonly numericEnd: number;
  readonly structureStart: number;
  readonly structureEnd: number;
  readonly tagStart: number;
}

export interface KnnConfiguration {
  readonly neighbors: number;
  readonly eloWeight: number;
  readonly tagWeight: number;
  readonly structureWeight: number;
}

export function powerFeatureDistance(
  left: readonly number[],
  right: readonly number[],
  layout: KnnLayout,
  configuration: KnnConfiguration,
): number {
  const eloDistance = Math.abs((left[layout.eloIndex] ?? 0) - (right[layout.eloIndex] ?? 0));
  let numericDistance = 0;
  for (let index = layout.numericStart; index < layout.numericEnd; index += 1) {
    numericDistance += Math.abs((left[index] ?? 0) - (right[index] ?? 0));
  }
  numericDistance /= Math.max(1, layout.numericEnd - layout.numericStart);

  let structureDistance = 0;
  for (let index = layout.structureStart; index < layout.structureEnd; index += 1) {
    structureDistance += Number(left[index] !== right[index]);
  }
  structureDistance /= Math.max(1, layout.structureEnd - layout.structureStart);

  let intersection = 0;
  let union = 0;
  for (let index = layout.tagStart; index < left.length; index += 1) {
    intersection += Number(left[index] === 1 && right[index] === 1);
    union += Number(left[index] === 1 || right[index] === 1);
  }
  const tagDistance = union === 0 ? 0 : 1 - intersection / union;
  return (
    configuration.eloWeight * eloDistance +
    numericDistance +
    configuration.structureWeight * structureDistance +
    configuration.tagWeight * tagDistance
  );
}

export function predictKnnScore(
  trainingFeatures: readonly (readonly number[])[],
  targets: readonly number[],
  features: readonly number[],
  layout: KnnLayout,
  configuration: KnnConfiguration,
): number {
  if (trainingFeatures.length === 0 || trainingFeatures.length !== targets.length) {
    throw new RangeError("KNN requires matching non-empty training features and targets.");
  }
  const nearest = trainingFeatures
    .map((row, index) => ({
      index,
      distance: powerFeatureDistance(features, row, layout, configuration),
    }))
    .sort((left, right) => left.distance - right.distance)
    .slice(0, configuration.neighbors);
  let weightedTotal = 0;
  let totalWeight = 0;
  for (const neighbor of nearest) {
    const weight = 1 / (neighbor.distance + 0.25) ** 2;
    const target = targets[neighbor.index];
    if (target === undefined) throw new Error("KNN target invariant failed.");
    weightedTotal += weight * target;
    totalWeight += weight;
  }
  return weightedTotal / totalWeight;
}
