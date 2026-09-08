import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  fitIsotonicCalibration,
  fitRidgeRegression,
  predictKnnScore,
  predictIsotonicScore,
  predictRidgeScore,
  roundPowerScore,
  selectRepresentativeScore,
  type CalibrationSample,
  type KnnConfiguration,
  type KnnLayout,
  type ScoreObservation,
} from "../src/cards/power-calibration.ts";

interface CardDocument {
  name: string;
  oracleId: string;
  powerScore: {
    score: number;
    source: string;
    rawSourceScore?: number;
    harmonizationDegree: string;
    confidence: number;
    updatedAt: string;
  };
}

interface DraftRecord {
  startTime: number;
  picks?: Array<{ PackScores?: Record<string, { staticScore?: number | null }> }>;
}

interface CardMetadata {
  name?: string;
}

interface CubeCardDetails {
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

interface CubeCard {
  details?: CubeCardDetails;
}

const rootDir = process.cwd();
const apply = process.argv.includes("--apply");
const generatedAt = "2026-09-06T00:00:00.000Z";
const normalizeName = (name: string): string => name.trim().toLowerCase();

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(rootDir, path), "utf8")) as T;
}

const metadata = readJson<Record<string, CardMetadata>>(
  "data/untapped_history/card-metadata-v1.json",
);
const drafts = readJson<Record<string, DraftRecord>>("data/untapped_history/drafts_backup.json");
const reference = readJson<{ referenceId: string; scores: Record<string, number> }>(
  "data/power-rankings/untapped-reference-v1.json",
);

const observationsByName = new Map<string, ScoreObservation[]>();
for (const draft of Object.values(drafts)) {
  for (const pick of draft.picks ?? []) {
    for (const [grpId, scorePair] of Object.entries(pick.PackScores ?? {})) {
      if (!Number.isFinite(scorePair.staticScore)) continue;
      const name = metadata[grpId]?.name;
      if (!name) continue;
      const key = normalizeName(name);
      const observations = observationsByName.get(key) ?? [];
      observations.push({ score: scorePair.staticScore!, observedAt: draft.startTime });
      observationsByName.set(key, observations);
    }
  }
}

const referenceScores = new Map(
  Object.entries(reference.scores).map(([name, score]) => [normalizeName(name), score]),
);
const directScores = new Map<
  string,
  { score: number; evidenceCount: number; observedMin?: number; observedMax?: number }
>();
for (const [name, observations] of observationsByName) {
  const score = selectRepresentativeScore(observations);
  if (score === undefined) continue;
  const values = observations.map((observation) => observation.score);
  directScores.set(name, {
    score,
    evidenceCount: observations.length,
    observedMin: Math.min(...values),
    observedMax: Math.max(...values),
  });
}
for (const [name, score] of referenceScores) {
  const observed = directScores.get(name);
  directScores.set(name, {
    score,
    evidenceCount: observed?.evidenceCount ?? 1,
    observedMin: observed?.observedMin,
    observedMax: observed?.observedMax,
  });
}

const detailsByOracleId = new Map<string, CubeCardDetails>();
const detailsByName = new Map<string, CubeCardDetails>();
for (const cubeKey of ["titou_tribal", "nico_candyshop", "hugues_pauper", "cedric_cube"]) {
  const raw = readJson<{ cards?: { mainboard?: CubeCard[] } }>(
    `data/cubes/${cubeKey}/cubecobra-raw.json`,
  );
  for (const cubeCard of raw.cards?.mainboard ?? []) {
    const details = cubeCard.details;
    if (!details?.name || !Number.isFinite(details.elo)) continue;
    detailsByName.set(normalizeName(details.name), details);
    if (details.oracle_id) detailsByOracleId.set(details.oracle_id, details);
  }
}

const itemPaths = readdirSync(resolve(rootDir, "data/cards/items"))
  .filter((file) => file.endsWith(".json"))
  .sort()
  .map((file) => resolve(rootDir, "data/cards/items", file));
const cards = itemPaths.map((path) => ({ path, card: readJson<CardDocument>(path) }));
const getDetails = (card: CardDocument): CubeCardDetails | undefined =>
  detailsByOracleId.get(card.oracleId) ?? detailsByName.get(normalizeName(card.name));

const calibrationEntries = cards
  .map(({ card }) => {
    const direct = directScores.get(normalizeName(card.name));
    const details = getDetails(card);
    return direct && details
      ? { name: card.name, input: details.elo, target: direct.score, details }
      : undefined;
  })
  .filter(
    (entry): entry is { name: string; input: number; target: number; details: CubeCardDetails } =>
      entry !== undefined,
  )
  .sort((left, right) => left.name.localeCompare(right.name));
const calibrationSamples: CalibrationSample[] = calibrationEntries.map(({ input, target }) => ({
  input,
  target,
}));
const calibration = fitIsotonicCalibration(calibrationSamples);
const numericValues = (details: CubeCardDetails): number[] => [
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
];
const numericRows = calibrationEntries.map(({ details }) => numericValues(details));
const numericMeans = numericRows[0]!.map(
  (_, column) => numericRows.reduce((total, row) => total + row[column]!, 0) / numericRows.length,
);
const numericDeviations = numericMeans.map((mean, column) =>
  Math.sqrt(
    numericRows.reduce((total, row) => total + (row[column]! - mean) ** 2, 0) / numericRows.length,
  ),
);
const typeFeatures = [
  "Land",
  "Creature",
  "Artifact",
  "Instant",
  "Sorcery",
  "Enchantment",
  "Planeswalker",
];
const colorFeatures = ["W", "U", "B", "R", "G"];
const tagFrequency = new Map<string, number>();
for (const { details } of calibrationEntries) {
  for (const tag of new Set(details.oracle_tags ?? [])) {
    tagFrequency.set(tag, (tagFrequency.get(tag) ?? 0) + 1);
  }
}
const tagFeatures = [...tagFrequency.entries()]
  .filter(([, count]) => count >= 5)
  .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
  .slice(0, 100)
  .map(([tag]) => tag);

function encodeFeatures(details: CubeCardDetails): number[] {
  const numerics = numericValues(details);
  const typeLine = details.type ?? "";
  const colors = new Set(details.colors ?? []);
  const tags = new Set(details.oracle_tags ?? []);
  return [
    1,
    ...numerics.map(
      (value, column) => (value - numericMeans[column]!) / (numericDeviations[column] || 1),
    ),
    ...typeFeatures.map((type) => Number(typeLine.includes(type))),
    ...colorFeatures.map((color) => Number(colors.has(color))),
    Number(colors.size === 0),
    Number(colors.size > 1),
    ...tagFeatures.map((tag) => Number(tags.has(tag))),
  ];
}

const encodedCalibration = calibrationEntries.map(({ details }) => encodeFeatures(details));
const targets = calibrationEntries.map(({ target }) => target);
const ridgeLambda = 3;
const ridgeWeight = 0.4;
const ridgeWeights = fitRidgeRegression(encodedCalibration, targets, ridgeLambda);
const knnConfiguration: KnnConfiguration = {
  neighbors: 3,
  eloWeight: 1,
  tagWeight: 0.5,
  structureWeight: 2,
};
const knnLayout: KnnLayout = {
  eloIndex: 1,
  numericStart: 3,
  numericEnd: 1 + numericRows[0]!.length,
  structureStart: 1 + numericRows[0]!.length,
  structureEnd: 1 + numericRows[0]!.length + typeFeatures.length + colorFeatures.length + 2,
  tagStart: 1 + numericRows[0]!.length + typeFeatures.length + colorFeatures.length + 2,
};

function predictCalibratedScore(
  details: CubeCardDetails,
  trainingFeatures = encodedCalibration,
  trainingTargets = targets,
  weights = ridgeWeights,
): number {
  const encoded = encodeFeatures(details);
  const ridge = predictRidgeScore(weights, encoded);
  const knn = predictKnnScore(
    trainingFeatures,
    trainingTargets,
    encoded,
    knnLayout,
    knnConfiguration,
  );
  return roundPowerScore(ridgeWeight * ridge + (1 - ridgeWeight) * knn);
}

function meanAbsoluteError(predictions: readonly number[], targets: readonly number[]): number {
  return (
    predictions.reduce(
      (total, prediction, index) => total + Math.abs(prediction - targets[index]!),
      0,
    ) / predictions.length
  );
}

function pearsonCorrelation(left: readonly number[], right: readonly number[]): number {
  const leftMean = left.reduce((total, value) => total + value, 0) / left.length;
  const rightMean = right.reduce((total, value) => total + value, 0) / right.length;
  let covariance = 0;
  let leftVariance = 0;
  let rightVariance = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftDelta = left[index]! - leftMean;
    const rightDelta = right[index]! - rightMean;
    covariance += leftDelta * rightDelta;
    leftVariance += leftDelta ** 2;
    rightVariance += rightDelta ** 2;
  }
  return covariance / Math.sqrt(leftVariance * rightVariance);
}

const fittedPredictions = calibrationEntries.map(({ input }) =>
  predictIsotonicScore(calibration, input),
);
const isotonicInSampleMae = meanAbsoluteError(fittedPredictions, targets);
const eloTargetCorrelation = pearsonCorrelation(
  calibrationEntries.map(({ input }) => input),
  targets,
);

const isotonicFoldErrors: number[] = [];
const ensembleFoldErrors: number[] = [];
const sortedForFolds = calibrationEntries;
for (let fold = 0; fold < 5; fold += 1) {
  const trainingIndices = sortedForFolds
    .map((_, index) => index)
    .filter((index) => index % 5 !== fold);
  const validationIndices = sortedForFolds
    .map((_, index) => index)
    .filter((index) => index % 5 === fold);
  const foldIsotonic = fitIsotonicCalibration(
    trainingIndices.map((index) => ({
      input: sortedForFolds[index]!.input,
      target: targets[index]!,
    })),
  );
  const foldFeatures = trainingIndices.map((index) => encodedCalibration[index]!);
  const foldTargets = trainingIndices.map((index) => targets[index]!);
  const foldRidge = fitRidgeRegression(foldFeatures, foldTargets, ridgeLambda);
  for (const index of validationIndices) {
    const sample = sortedForFolds[index]!;
    isotonicFoldErrors.push(
      Math.abs(predictIsotonicScore(foldIsotonic, sample.input) - sample.target),
    );
    ensembleFoldErrors.push(
      Math.abs(
        predictCalibratedScore(sample.details, foldFeatures, foldTargets, foldRidge) -
          sample.target,
      ),
    );
  }
}
const isotonicCrossValidatedMae =
  isotonicFoldErrors.reduce((total, error) => total + error, 0) / isotonicFoldErrors.length;
const ensembleCrossValidatedMae =
  ensembleFoldErrors.reduce((total, error) => total + error, 0) / ensembleFoldErrors.length;

let directCount = 0;
let calibratedCount = 0;
let fallbackCount = 0;
const ranking: Array<Record<string, unknown>> = [];
const updates: Array<{ path: string; card: CardDocument }> = [];

for (const { path, card } of cards) {
  const nameKey = normalizeName(card.name);
  const direct = directScores.get(nameKey);
  const details = getDetails(card);
  let powerScore: CardDocument["powerScore"];
  let method: string;

  if (direct) {
    directCount += 1;
    method = referenceScores.has(nameKey) ? "verified_reference" : "historical_mode";
    powerScore = {
      score: direct.score,
      source: "untapped",
      rawSourceScore: direct.score,
      harmonizationDegree: "native",
      confidence: 1,
      updatedAt: generatedAt,
    };
  } else if (details) {
    calibratedCount += 1;
    method = "cubecobra_feature_calibration_v1";
    powerScore = {
      score: predictCalibratedScore(details),
      source: "cubecobra_elo",
      rawSourceScore: Math.round(details.elo * 10) / 10,
      harmonizationDegree: "calibrated_medium",
      confidence: 0.6,
      updatedAt: generatedAt,
    };
  } else {
    fallbackCount += 1;
    method = "existing_fallback";
    powerScore = {
      ...card.powerScore,
      source: "expert_heuristic",
      harmonizationDegree: "fallback",
      confidence: Math.min(card.powerScore.confidence, 0.5),
      updatedAt: generatedAt,
    };
  }

  updates.push({ path, card: { ...card, powerScore } });
  ranking.push({
    oracleId: card.oracleId,
    name: card.name,
    score: powerScore.score,
    source: powerScore.source,
    rawSourceScore: powerScore.rawSourceScore,
    method,
    evidenceCount: direct?.evidenceCount,
    observedMin: direct?.observedMin,
    observedMax: direct?.observedMax,
  });
}

ranking.sort(
  (left, right) =>
    (right.score as number) - (left.score as number) ||
    (left.name as string).localeCompare(right.name as string),
);

const calibrationArtifact = {
  schemaVersion: 1,
  calibrationId: "cubecobra-features-to-untapped-v1",
  generatedAt,
  referenceId: reference.referenceId,
  sampleCount: calibrationSamples.length,
  method: {
    type: "ridge-knn-ensemble",
    ridgeLambda,
    ridgeWeight,
    knnWeight: 1 - ridgeWeight,
    knn: knnConfiguration,
    numericFeatures: [
      "elo",
      "eloSquared",
      "popularity",
      "logCubeCount",
      "logPickCount",
      "cmc",
      "firstPrintYear",
      "power",
      "toughness",
      "oracleTextLength",
    ],
    typeFeatures,
    colorFeatures,
    tagFeatures,
  },
  inputRange: {
    min: Math.min(...calibrationSamples.map((sample) => sample.input)),
    max: Math.max(...calibrationSamples.map((sample) => sample.input)),
  },
  isotonicInSampleMae: Math.round(isotonicInSampleMae * 100) / 100,
  isotonicFiveFoldCrossValidatedMae: Math.round(isotonicCrossValidatedMae * 100) / 100,
  fiveFoldCrossValidatedMae: Math.round(ensembleCrossValidatedMae * 100) / 100,
  eloTargetCorrelation: Math.round(eloTargetCorrelation * 1000) / 1000,
  blocks: calibration.map((block) => ({
    inputMin: Math.round(block.inputMin * 10) / 10,
    inputMax: Math.round(block.inputMax * 10) / 10,
    score: Math.round(block.score * 1000) / 1000,
  })),
};
const rankingArtifact = {
  schemaVersion: 1,
  rankingId: "power-ranking-v1",
  generatedAt,
  referenceId: reference.referenceId,
  calibrationId: calibrationArtifact.calibrationId,
  coverage: {
    total: cards.length,
    directUntapped: directCount,
    calibratedCubeCobra: calibratedCount,
    fallback: fallbackCount,
  },
  ranking,
  inputs: {
    untappedDraftsSha256: createHash("sha256")
      .update(readFileSync(resolve(rootDir, "data/untapped_history/drafts_backup.json")))
      .digest("hex"),
    untappedMetadataSha256: createHash("sha256")
      .update(readFileSync(resolve(rootDir, "data/untapped_history/card-metadata-v1.json")))
      .digest("hex"),
  },
};

console.log(
  JSON.stringify(
    {
      mode: apply ? "apply" : "dry-run",
      coverage: rankingArtifact.coverage,
      calibration: {
        samples: calibrationArtifact.sampleCount,
        blocks: calibrationArtifact.blocks.length,
        isotonicInSampleMae: calibrationArtifact.isotonicInSampleMae,
        isotonicFiveFoldCrossValidatedMae: calibrationArtifact.isotonicFiveFoldCrossValidatedMae,
        fiveFoldCrossValidatedMae: calibrationArtifact.fiveFoldCrossValidatedMae,
        eloTargetCorrelation: calibrationArtifact.eloTargetCorrelation,
      },
      top: ranking.slice(0, 30).map(({ name, score, source }) => ({ name, score, source })),
      ancientTomb: ranking.find((entry) => entry.name === "Ancient Tomb"),
    },
    null,
    2,
  ),
);

if (apply) {
  for (const update of updates) {
    writeFileSync(update.path, `${JSON.stringify(update.card, null, 2)}\n`, "utf8");
  }
  const outputDir = resolve(rootDir, "data/power-rankings");
  if (!existsSync(outputDir)) throw new Error(`Missing output directory: ${outputDir}`);
  writeFileSync(
    join(outputDir, "cubecobra-calibration-v1.json"),
    `${JSON.stringify(calibrationArtifact, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    join(outputDir, "power-ranking-v1.json"),
    `${JSON.stringify(rankingArtifact, null, 2)}\n`,
    "utf8",
  );
}
