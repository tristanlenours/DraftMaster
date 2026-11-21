// Builds a data/cards/items/ document from Scryfall facts and CubeCobra strength evidence.
// Scores use the frozen Elo -> power isotonic calibration so existing cards never drift.
import { predictIsotonicScore, roundPowerScore } from "../../src/cards/power-calibration.ts";

/** Below this many CubeCobra picks the Elo is still close to its 1200 start: low confidence. */
export const MIN_RELIABLE_PICK_COUNT = 1_000;
const VALID_COLORS = new Set(["W", "U", "B", "R", "G"]);

export function cardNameToSlug(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function fetchScryfallByOracleId(oracleIds) {
  const byOracleId = new Map();
  for (let index = 0; index < oracleIds.length; index += 75) {
    const response = await fetch("https://api.scryfall.com/cards/collection", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "DraftMaster/0.1 (+https://github.com/tristanlenours/DraftMaster)",
      },
      body: JSON.stringify({
        identifiers: oracleIds.slice(index, index + 75).map((oracle_id) => ({ oracle_id })),
      }),
    });
    if (!response.ok) throw new Error(`Scryfall collection HTTP ${response.status}`);
    const json = await response.json();
    for (const card of json.data ?? []) byOracleId.set(card.oracle_id, card);
    await new Promise((done) => setTimeout(done, 120));
  }
  return byOracleId;
}

function splitTypeLine(typeLine) {
  const [left = "", right = ""] = typeLine.split("—").map((part) => part.trim());
  const types = left
    .split(/\s+/)
    .filter(
      (word) =>
        word && !["Legendary", "Basic", "Snow", "World", "Kindred", "Tribal"].includes(word),
    );
  return { types, subtypes: right ? right.split(/\s+/).filter(Boolean) : [] };
}

function hasAnyTag(tags, prefixes) {
  return tags.some((tag) =>
    prefixes.some((prefix) => tag === prefix || tag.startsWith(`${prefix}-`)),
  );
}

/** Functional roles from Scryfall oracle tags (same vocabulary as the cubes' synergy tags). */
export function classifyRoles({ tags, types, cmc, isLand, producesColors, score }) {
  const roles = [];
  const isSpell = types.includes("Instant") || types.includes("Sorcery");
  if (hasAnyTag(tags, ["removal", "spot-removal", "burn-creature", "sweeper", "board-wipe"])) {
    roles.push(cmc <= 2 || (isSpell && cmc <= 3) ? "premium_removal" : "situational_removal");
  } else if (tags.includes("counterspell")) {
    roles.push(cmc <= 2 ? "premium_removal" : "situational_removal");
  }
  if (hasAnyTag(tags, ["draw-engine", "repeatable-draw", "repeatable-card-advantage"])) {
    roles.push("engine");
  } else if (hasAnyTag(tags, ["card-advantage", "draw", "pure-draw"])) {
    roles.push("card_advantage");
  }
  if (tags.includes("cantrip")) roles.push("cantrip");
  if (!isLand && hasAnyTag(tags, ["ramp", "mana-producer", "mana-rock", "adds-multiple-mana"])) {
    roles.push("mana_ramp");
  }
  if (isLand && producesColors.length > 1) roles.push("mana_fixing");
  if (hasAnyTag(tags, ["tutor", "sacrifice-outlet", "discard-outlet", "reanimate"])) {
    roles.push("synergy_enabler");
  }
  if (types.includes("Creature") || types.includes("Planeswalker")) {
    if (score >= 40) roles.push("bomb");
    else if (cmc >= 6) roles.push("finisher");
    else if (roles.length === 0) roles.push("beater");
  }
  if (roles.length === 0) roles.push(score >= 40 ? "bomb" : "synergy_payoff");
  return [...new Set(roles)];
}

/** Power score of a candidate from its CubeCobra Elo, through the frozen isotonic calibration. */
export function scoreFromElo(calibrationBlocks, elo) {
  return roundPowerScore(predictIsotonicScore(calibrationBlocks, elo));
}

/**
 * Reads the `card` object of `window.reactProps` in a CubeCobra card page. The props are a
 * JavaScript literal (they may hold `undefined`), so only the card object is parsed.
 */
export function extractCubeCobraCard(html) {
  const marker = 'window.reactProps = {"card":';
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) return undefined;
  const start = markerIndex + marker.length;
  let depth = 0;
  let inString = false;
  for (let index = start; index < html.length; index += 1) {
    const char = html[index];
    if (inString) {
      if (char === "\\") index += 1;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        const literal = html.slice(start, index + 1).replace(/:undefined(?=[,}])/g, ":null");
        return JSON.parse(literal);
      }
    }
  }
  return undefined;
}

/**
 * @param evidence {{ name, oracleId, elo, pickCount, oracleTags, summary, capturedAt, imageNormal?, artCrop? }}
 * @param scryfall Scryfall card object for the same oracle id
 * @param calibrationBlocks blocks of data/power-rankings/cubecobra-calibration-v1.json
 */
export function buildCatalogItem(evidence, scryfall, calibrationBlocks) {
  const front = scryfall.card_faces?.[0];
  const isSplit = scryfall.layout === "split";
  const typeLine = scryfall.type_line ?? front?.type_line ?? "Card";
  const frontTypeLine = isSplit ? typeLine.split(" // ")[0] : (front?.type_line ?? typeLine);
  const { types, subtypes } = splitTypeLine(frontTypeLine);
  const isLand = types.includes("Land");
  const colors = (scryfall.colors ?? front?.colors ?? []).filter((c) => VALID_COLORS.has(c));
  const producesColors = (scryfall.produced_mana ?? []).filter((c) => VALID_COLORS.has(c));
  const tags = evidence.oracleTags ?? [];
  const reliable = (evidence.pickCount ?? 0) >= MIN_RELIABLE_PICK_COUNT;
  const score = roundPowerScore(predictIsotonicScore(calibrationBlocks, evidence.elo));
  const imageUris = scryfall.image_uris ?? front?.image_uris ?? {};
  const imageUrl = imageUris.normal ?? evidence.imageNormal;
  const artCropUrl = imageUris.art_crop ?? evidence.artCrop;
  const faces = scryfall.card_faces ?? [];
  const oracleText =
    scryfall.oracle_text ?? faces.map((face) => face.oracle_text ?? "").join("\n//\n");
  const cmc = scryfall.cmc ?? evidence.cmc ?? 0;
  const roles = classifyRoles({ tags, types, cmc, isLand, producesColors, score });
  const rating = score / 5.5;

  return {
    schemaVersion: 1,
    slug: cardNameToSlug(evidence.name),
    name: evidence.name,
    oracleId: evidence.oracleId,
    scryfallId: scryfall.id,
    manaCost: scryfall.mana_cost ?? front?.mana_cost ?? "",
    cmc,
    colors,
    colorIdentity: (scryfall.color_identity ?? []).filter((c) => VALID_COLORS.has(c)),
    typeLine,
    types,
    subtypes,
    oracleText,
    keywords: scryfall.keywords ?? [],
    ...((scryfall.power ?? front?.power) !== undefined && {
      power: String(scryfall.power ?? front?.power),
    }),
    ...((scryfall.toughness ?? front?.toughness) !== undefined && {
      toughness: String(scryfall.toughness ?? front?.toughness),
    }),
    ...((scryfall.loyalty ?? front?.loyalty) !== undefined && {
      loyalty: String(scryfall.loyalty ?? front?.loyalty),
    }),
    isLand,
    producesColors,
    image: { url: imageUrl, ...(artCropUrl && { artCropUrl }) },
    imageUrl,
    powerScore: {
      score,
      source: "expert_heuristic",
      rawSourceScore: score,
      harmonizationDegree: reliable ? "calibrated_medium" : "fallback",
      confidence: reliable ? 0.6 : 0.4,
      updatedAt: evidence.capturedAt ?? new Date().toISOString(),
    },
    presentInCubes: [],
    objectiveAnalysis: {
      summary: evidence.summary,
      roles,
      floorRating: Math.min(9.5, Math.max(1, Math.round(rating * 0.85 * 10) / 10)),
      ceilingRating: Math.min(10, Math.max(2, Math.round(rating * 1.05 * 10) / 10)),
      tempoImpact: score >= 40 ? "high" : score >= 25 ? "medium" : "low",
      quadrantStrengths: {
        opening: Math.min(
          5,
          Math.max(1, Math.round((1.5 + score / 20 + (cmc <= 2 ? 0.5 : 0)) * 10) / 10),
        ),
        developing: Math.min(5, Math.max(1, Math.round((1.5 + score / 18) * 10) / 10)),
        parity: Math.min(5, Math.max(1, Math.round((1.4 + score / 20) * 10) / 10)),
        behind: Math.min(5, Math.max(1, Math.round((1.2 + score / 22) * 10) / 10)),
      },
    },
    cubeAnalyses: {},
  };
}
