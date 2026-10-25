import * as fs from "node:fs";
import * as path from "node:path";
import { BASIC_LAND_IDENTITIES } from "./import-printed-names.ts";

/** A card as resolved from the local catalog (shape shared with declared tournament decks). */
export interface CatalogDeckCard {
  readonly oracleId?: string;
  readonly name: string;
  readonly count?: number;
  readonly cmc?: number;
  readonly manaCost?: string;
  readonly typeLine?: string;
  readonly isLand?: boolean;
  readonly imageUrl?: string;
  readonly frenchName?: string;
}

function normalizeNameKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeNameKey(str1);
  const s2 = normalizeNameKey(str2);
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;

  // Simple bigram Dice coefficient
  const getBigrams = (str: string): Set<string> => {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.slice(i, i + 2));
    }
    return bigrams;
  };

  const b1 = getBigrams(s1);
  const b2 = getBigrams(s2);
  let intersection = 0;
  for (const b of b1) {
    if (b2.has(b)) intersection++;
  }
  return (2 * intersection) / (b1.size + b2.size || 1);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function calculateDiceSimilarity(str1: string, str2: string): number {
  const s1 = normalizeNameKey(str1);
  const s2 = normalizeNameKey(str2);
  if (s1 === s2) return 1.0;
  if (s1.length < 2 || s2.length < 2) return 0.0;

  const getBigrams = (str: string): Set<string> => {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.slice(i, i + 2));
    }
    return bigrams;
  };

  const b1 = getBigrams(s1);
  const b2 = getBigrams(s2);
  let intersection = 0;
  for (const b of b1) {
    if (b2.has(b)) intersection++;
  }
  return (2 * intersection) / (b1.size + b2.size || 1);
}

export class MasterCardsIndex {
  private static instance: MasterCardsIndex | null = null;
  private readonly cardByName = new Map<string, Map<string, CatalogDeckCard>>();
  private readonly cardByNormalized = new Map<string, Map<string, CatalogDeckCard>>();
  private readonly aliasesByCard = new Map<string, Set<string>>();
  private readonly allCards: CatalogDeckCard[] = [];
  private isLoaded = false;

  public static getInstance(projectRoot: string): MasterCardsIndex {
    MasterCardsIndex.instance ??= new MasterCardsIndex(projectRoot);
    return MasterCardsIndex.instance;
  }

  private readonly projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.loadCatalog();
  }

  private loadCatalog(): void {
    if (this.isLoaded) return;
    const frenchBasics: Record<string, string> = {
      Plains: "Plaine",
      Island: "Île",
      Swamp: "Marais",
      Mountain: "Montagne",
      Forest: "Forêt",
    };
    for (const [name, oracleId] of Object.entries(BASIC_LAND_IDENTITIES)) {
      const card: CatalogDeckCard = { name, oracleId, cmc: 0, isLand: true };
      this.addAlias(name, card);
      const frenchName = frenchBasics[name];
      if (frenchName) this.addAlias(frenchName, card);
    }
    try {
      const catalogPath = path.resolve(this.projectRoot, "data", "cards", "master-cards.json");
      if (!fs.existsSync(catalogPath)) return;
      const raw = fs.readFileSync(catalogPath, "utf8");
      const data: unknown = JSON.parse(raw);
      const cardsObj: Record<string, unknown> =
        isRecord(data) && isRecord(data.cards) ? data.cards : {};

      for (const card of Object.values(cardsObj)) {
        if (!isRecord(card) || typeof card.name !== "string" || !card.name) continue;
        const name = card.name;
        const oracleId = typeof card.oracleId === "string" ? card.oracleId : undefined;
        const cmc = typeof card.cmc === "number" ? card.cmc : 0;
        const typeLine = typeof card.typeLine === "string" ? card.typeLine : "";
        const isLand = card.isLand === true;
        const frenchName = typeof card.frenchName === "string" ? card.frenchName : undefined;
        const imageUrl =
          typeof card.imageUrl === "string"
            ? card.imageUrl
            : `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}&format=image`;

        const entry: CatalogDeckCard = {
          name,
          cmc,
          typeLine,
          isLand,
          imageUrl,
          ...(oracleId !== undefined ? { oracleId } : {}),
          ...(frenchName !== undefined ? { frenchName } : {}),
        };

        this.allCards.push(entry);
        this.addAlias(name, entry);
        if (frenchName) {
          this.addAlias(frenchName, entry);
        }
      }
      this.loadPrintedNames();
      this.isLoaded = true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("[MasterCardsIndex] Error loading master cards:", message);
    }
  }

  private addAlias(name: string, card: CatalogDeckCard): void {
    const identity = card.oracleId ?? card.name;
    let aliasSet = this.aliasesByCard.get(card.name);
    if (!aliasSet) {
      aliasSet = new Set<string>();
      this.aliasesByCard.set(card.name, aliasSet);
    }
    aliasSet.add(name.trim());
    for (const [index, key] of [
      [this.cardByName, name.trim().toLowerCase()],
      [this.cardByNormalized, normalizeNameKey(name)],
    ] as const) {
      if (!key) continue;
      const candidates = index.get(key) ?? new Map<string, CatalogDeckCard>();
      candidates.set(identity, card);
      index.set(key, candidates);
    }
  }

  private loadPrintedNames(): void {
    const aliasPath = path.resolve(this.projectRoot, "data", "cards", "printed-names.json");
    if (!fs.existsSync(aliasPath)) return;
    try {
      const data: unknown = JSON.parse(fs.readFileSync(aliasPath, "utf8"));
      if (!isRecord(data) || data.schemaVersion !== 1 || !Array.isArray(data.aliases)) return;
      for (const alias of data.aliases) {
        if (
          !isRecord(alias) ||
          typeof alias.name !== "string" ||
          typeof alias.oracleId !== "string" ||
          typeof alias.printedName !== "string" ||
          alias.lang !== "fr" ||
          typeof alias.scryfallId !== "string"
        )
          continue;
        const card = this.findExactCard(alias.name);
        if (card?.name !== alias.name || card.oracleId !== alias.oracleId) continue;
        this.addAlias(alias.printedName, card);
      }
    } catch {
      // Optional alias data must not disable the existing canonical catalog.
      console.warn("[MasterCardsIndex] Invalid printed-name dataset; using canonical catalog.");
    }
  }

  public resolveCard(inputName: string): CatalogDeckCard {
    const trimmed = inputName.trim();
    const exact = this.findExactCard(trimmed);
    if (exact !== undefined) return exact;

    // Try fuzzy match across English and French aliases
    let bestScore = 0;
    let bestMatch: CatalogDeckCard | null = null;
    for (const card of this.allCards) {
      const aliases = this.aliasesByCard.get(card.name);
      let sim = calculateSimilarity(trimmed, card.name);
      if (aliases) {
        for (const alias of aliases) {
          sim = Math.max(sim, calculateSimilarity(trimmed, alias));
        }
      }
      if (sim > bestScore && sim >= 0.8) {
        bestScore = sim;
        bestMatch = card;
      }
    }

    if (bestMatch) {
      return bestMatch;
    }

    // Fallback if not found in catalog
    const isLand = ["plains", "island", "swamp", "mountain", "forest"].includes(
      trimmed.toLowerCase(),
    );
    return {
      name: trimmed,
      cmc: isLand ? 0 : 1,
      isLand,
      imageUrl: `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(trimmed)}&format=image`,
    };
  }

  public findExactCard(inputName: string): CatalogDeckCard | undefined {
    const trimmed = inputName.trim();
    if (!trimmed) return undefined;
    const literal = this.cardByName.get(trimmed.toLowerCase());
    if (literal) return literal.size === 1 ? literal.values().next().value : undefined;
    if (/…|\.{2,}/u.test(trimmed)) return undefined;
    const candidates = this.cardByNormalized.get(normalizeNameKey(trimmed));
    return candidates?.size === 1 ? candidates.values().next().value : undefined;
  }

  public findPhotoCard(
    inputName: string,
    candidateCardNames?: readonly string[],
  ): CatalogDeckCard | undefined {
    const trimmed = inputName.trim();
    if (!trimmed) return undefined;
    const exact = this.findExactCard(trimmed);
    if (exact !== undefined) return exact;
    if (/…|\.{2,}/u.test(trimmed)) return undefined;

    const pool: CatalogDeckCard[] = [];
    if (candidateCardNames && candidateCardNames.length > 0) {
      for (const candidateName of candidateCardNames) {
        const card = this.findExactCard(candidateName);
        if (card) pool.push(card);
      }
    }
    const searchCards = pool.length > 0 ? pool : this.allCards;

    const commaIndex = trimmed.indexOf(",");
    const leadPrefix = commaIndex >= 3 ? normalizeNameKey(trimmed.slice(0, commaIndex)) : undefined;
    const restTokens =
      commaIndex >= 3
        ? trimmed
            .slice(commaIndex + 1)
            .split(/\s+/u)
            .map((token) => normalizeNameKey(token))
            .filter((token) => token.length >= 4)
        : [];

    let bestScore = 0;
    let bestCard: CatalogDeckCard | undefined;
    for (const card of searchCards) {
      const aliases = this.aliasesByCard.get(card.name) ?? new Set([card.name]);
      for (const alias of aliases) {
        const dice = calculateDiceSimilarity(trimmed, alias);
        if (dice >= 0.78 && dice > bestScore) {
          bestScore = dice;
          bestCard = card;
        }
        if (leadPrefix && restTokens.length > 0) {
          const aliasComma = alias.indexOf(",");
          if (aliasComma >= 3 && normalizeNameKey(alias.slice(0, aliasComma)) === leadPrefix) {
            const aliasRest = normalizeNameKey(alias.slice(aliasComma + 1));
            if (
              (restTokens.some((token) => aliasRest.includes(token)) || dice >= 0.62) &&
              Math.max(dice, 0.79) > bestScore
            ) {
              bestScore = Math.max(dice, 0.79);
              bestCard = card;
            }
          }
        }
      }
    }
    return bestCard;
  }
}
