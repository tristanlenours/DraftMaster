import * as fs from "node:fs";
import * as https from "node:https";
import * as path from "node:path";

import type { DeclaredDeckCard, TournamentResult } from "./types.ts";

export interface RecognizedDeckResult {
  readonly archetype: string;
  readonly cards: readonly DeclaredDeckCard[];
  readonly basicLands: Record<string, number>;
  readonly totalCount: number;
  readonly confidence?: number;
}

export interface DeckPhotoRecognizerOptions {
  readonly projectRoot?: string;
  readonly geminiKeys?: readonly string[];
  readonly model?: string;
  readonly cardsIndex?: MasterCardsIndex;
}

export interface DeckPhotoRecognizer {
  recognizeDeck(
    imageBuffer: Buffer,
    mimeType: string,
    options?: {
      readonly cubeKey?: string;
      readonly cubeName?: string;
      readonly candidateCardNames?: readonly string[];
    },
  ): Promise<TournamentResult<RecognizedDeckResult>>;
}

const httpsKeepAliveAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30_000,
  maxSockets: 20,
  maxFreeSockets: 10,
});

function normalizeNameKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
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

interface GeminiApiResponse {
  readonly candidates?: readonly {
    readonly content?: {
      readonly parts?: readonly {
        readonly text?: string;
      }[];
    };
  }[];
}

export class MasterCardsIndex {
  private static instance: MasterCardsIndex | null = null;
  private readonly cardByName = new Map<string, DeclaredDeckCard>();
  private readonly cardByNormalized = new Map<string, DeclaredDeckCard>();
  private readonly allCards: DeclaredDeckCard[] = [];
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

        const entry: DeclaredDeckCard = {
          name,
          cmc,
          typeLine,
          isLand,
          imageUrl,
          ...(oracleId !== undefined ? { oracleId } : {}),
          ...(frenchName !== undefined ? { frenchName } : {}),
        };

        this.allCards.push(entry);
        this.cardByName.set(name.toLowerCase(), entry);
        this.cardByNormalized.set(normalizeNameKey(name), entry);
        if (frenchName) {
          this.cardByName.set(frenchName.toLowerCase(), entry);
          this.cardByNormalized.set(normalizeNameKey(frenchName), entry);
        }
      }
      this.isLoaded = true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("[MasterCardsIndex] Error loading master cards:", message);
    }
  }

  public resolveCard(inputName: string): DeclaredDeckCard {
    const trimmed = inputName.trim();
    const exact = this.findExactCard(trimmed);
    if (exact !== undefined) return exact;

    // Try fuzzy match
    let bestScore = 0;
    let bestMatch: DeclaredDeckCard | null = null;
    for (const card of this.allCards) {
      const sim = Math.max(
        calculateSimilarity(trimmed, card.name),
        card.frenchName ? calculateSimilarity(trimmed, card.frenchName) : 0,
      );
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

  public findExactCard(inputName: string): DeclaredDeckCard | undefined {
    const trimmed = inputName.trim();
    return (
      this.cardByName.get(trimmed.toLowerCase()) ??
      this.cardByNormalized.get(normalizeNameKey(trimmed))
    );
  }
}

export class GeminiDeckPhotoRecognizer implements DeckPhotoRecognizer {
  private readonly projectRoot: string;
  private readonly geminiKeys: string[];
  private readonly keyCooldowns = new Map<string, number>();
  private currentKeyIndex = 0;
  private readonly configuredModel: string;
  private readonly cardsIndex: MasterCardsIndex;

  constructor(options?: {
    readonly projectRoot?: string;
    readonly geminiKeys?: readonly string[];
    readonly model?: string;
    readonly cardsIndex?: MasterCardsIndex;
  }) {
    this.projectRoot = options?.projectRoot ?? process.cwd();
    this.cardsIndex = options?.cardsIndex ?? MasterCardsIndex.getInstance(this.projectRoot);
    this.configuredModel = options?.model ?? process.env.GEMINI_MODEL ?? "gemini-3.5-flash";

    if (options?.geminiKeys !== undefined) {
      this.geminiKeys = [...options.geminiKeys];
    } else {
      const splitKeys: string[] = [];
      for (const [envKey, val] of Object.entries(process.env)) {
        if (envKey.startsWith("GEMINI_API_KEY") && val) {
          for (const k of val.split(/[,\s]+/)) {
            const trimmed = k.trim();
            if (trimmed && !splitKeys.includes(trimmed)) splitKeys.push(trimmed);
          }
        }
      }

      // If still empty, check .env.local and .env
      if (splitKeys.length === 0) {
        for (const envFile of [".env.local", ".env"]) {
          const envPath = path.resolve(this.projectRoot, envFile);
          if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, "utf8");
            for (const line of content.split("\n")) {
              const trimmed = line.trim();
              if (trimmed.startsWith("GEMINI_API_KEY")) {
                const eq = trimmed.indexOf("=");
                if (eq > 0) {
                  const val = trimmed.slice(eq + 1).trim();
                  for (const k of val.split(/[,\s]+/)) {
                    const clean = k.trim();
                    if (clean && !splitKeys.includes(clean)) splitKeys.push(clean);
                  }
                }
              }
            }
          }
        }
      }

      this.geminiKeys = splitKeys;
    }
  }

  private getAvailableKeys(): string[] {
    const now = Date.now();
    return this.geminiKeys.filter((key) => {
      const cooldownUntil = this.keyCooldowns.get(key);
      return cooldownUntil === undefined || cooldownUntil < now;
    });
  }

  public async recognizeDeck(
    imageBuffer: Buffer,
    mimeType: string,
    options?: {
      readonly cubeKey?: string;
      readonly cubeName?: string;
      readonly candidateCardNames?: readonly string[];
    },
  ): Promise<TournamentResult<RecognizedDeckResult>> {
    const keys = this.getAvailableKeys();
    if (keys.length === 0) {
      return {
        ok: false,
        error: {
          code: "STORE_UNAVAILABLE",
          message: "Aucune clé Gemini active ou disponible pour la reconnaissance visuelle.",
          details: {},
        },
      };
    }

    const base64Image = imageBuffer.toString("base64");
    const formattedCandidates: string[] = [];
    if (options?.candidateCardNames && options.candidateCardNames.length > 0) {
      for (const name of options.candidateCardNames.slice(0, 900)) {
        const resolved = this.cardsIndex.resolveCard(name);
        if (resolved.frenchName && resolved.frenchName !== resolved.name) {
          formattedCandidates.push(`${resolved.name} (${resolved.frenchName})`);
        } else {
          formattedCandidates.push(resolved.name);
        }
      }
    }

    const candidateListStr =
      formattedCandidates.length > 0
        ? `\nListe des cartes candidates du Cube (${options?.cubeName ?? options?.cubeKey ?? "Cube"}) avec nom anglais et traduction française :\n${JSON.stringify(formattedCandidates)}`
        : "";

    const systemPrompt = `Tu es un expert en analyse visuelle de decks de Magic: The Gathering (MTG).
On te fournit une photo d'un deck physique de Magic posé sur une table ou un tapis de jeu.${candidateListStr}

Consignes :
1. Détecte et identifie minutieusement chaque carte visible dans la photo (qu'elle soit en version anglaise ou française).
2. Si une liste de cartes du Cube est fournie ci-dessus, fais correspondre chaque carte reconnue à son nom anglais officiel exact de la liste.
3. Attention aux cartes empilées en colonnes / cascade (très fréquent en MTG) où seul le haut ou le bandeau de titre d'une carte dépasse sous la suivante : examine chaque carte visible dans chaque colonne de haut en bas sans en omettre !
4. Attention à l'orientation : la photo peut être pivotée (ex: 90° à l'horizontale ou verticale). Lis le texte selon l'orientation naturelle des cartes.
5. Identifie les terrains de base visibles (Plains, Island, Swamp, Mountain, Forest) et déduis ou estime leurs quantités.
6. Détermine l'archétype général ou les couleurs du deck (ex: "Azorius Contrôle", "Aggro Boros", "Dimir Tempo", etc.).
7. Réponds UNIQUEMENT avec un objet JSON valide respectant cette structure exacte :
{
  "archetype": "string",
  "cards": [
    { "name": "Exact Card Name in English", "count": 1 }
  ],
  "basicLands": {
    "Plains": 0,
    "Island": 0,
    "Swamp": 0,
    "Mountain": 0,
    "Forest": 0
  },
  "confidence": 0.95
}`;

    const modelsToTry = [
      this.configuredModel,
      "gemini-3.5-flash-lite",
      "gemini-3.5-flash",
      "gemini-3.6-flash",
      "gemini-flash-latest",
    ];
    const uniqueModels = Array.from(new Set(modelsToTry));

    let lastError = "Aucun modèle Gemini n'a pu analyser la photo.";
    let providerUnavailable = false;

    for (const model of uniqueModels) {
      for (const key of keys) {
        const cooldownUntil = this.keyCooldowns.get(key);
        if (cooldownUntil !== undefined && cooldownUntil >= Date.now()) continue;
        try {
          const outcome = await this.callGeminiVision(
            key,
            model,
            base64Image,
            mimeType,
            systemPrompt,
          );
          if (outcome.status === "success") {
            return {
              ok: true,
              value: this.enrichDeckResult(outcome.data),
            };
          }
          if (outcome.status === "quota_exceeded") {
            this.keyCooldowns.set(key, Date.now() + 600_000);
            lastError = "Limite ou quota Gemini atteint (HTTP 429). Réessayez plus tard.";
            providerUnavailable = true;
            continue;
          }
          if (outcome.status === "service_unavailable") {
            lastError = `Le modèle ${model} est temporairement indisponible (HTTP ${String(outcome.httpStatus)}). Réessayez plus tard.`;
            providerUnavailable = true;
            // A capacity error is model-wide; another key does not help.
            break;
          }
          lastError = outcome.error;
          providerUnavailable = false;
        } catch (err: unknown) {
          lastError = err instanceof Error ? err.message : String(err);
          providerUnavailable = false;
        }
      }
    }

    return {
      ok: false,
      error: {
        code: providerUnavailable ? "STORE_UNAVAILABLE" : "INVALID_INPUT",
        message: `La reconnaissance visuelle du deck a échoué : ${lastError}`,
        details: {},
      },
    };
  }

  private callGeminiVision(
    key: string,
    model: string,
    base64Image: string,
    mimeType: string,
    prompt: string,
  ): Promise<
    | { readonly status: "success"; readonly data: unknown }
    | { readonly status: "quota_exceeded" }
    | { readonly status: "service_unavailable"; readonly httpStatus: number }
    | { readonly status: "error"; readonly error: string }
  > {
    return new Promise((resolve) => {
      const payload = JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType || "image/jpeg",
                  data: base64Image,
                },
              },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
          maxOutputTokens: 3000,
        },
      });

      const req = https.request(
        {
          hostname: "generativelanguage.googleapis.com",
          port: 443,
          path: `/v1beta/models/${model}:generateContent?key=${key}`,
          method: "POST",
          agent: httpsKeepAliveAgent,
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
          },
        },
        (res) => {
          let body = "";
          res.on("data", (chunk: Buffer | string) => {
            body += chunk.toString();
          });
          res.on("end", () => {
            if (res.statusCode === 200) {
              try {
                const parsed = JSON.parse(body) as GeminiApiResponse;
                const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!text) {
                  resolve({ status: "error", error: "Réponse Gemini vide" });
                  return;
                }
                const cleaned = text
                  .trim()
                  .replace(/^```(?:json)?\s*/i, "")
                  .replace(/\s*```$/, "");
                const json: unknown = JSON.parse(cleaned);
                resolve({ status: "success", data: json });
              } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                resolve({ status: "error", error: `Erreur parse JSON: ${msg}` });
              }
            } else if (res.statusCode === 429) {
              resolve({ status: "quota_exceeded" });
            } else if (
              res.statusCode === 500 ||
              res.statusCode === 502 ||
              res.statusCode === 503 ||
              res.statusCode === 504
            ) {
              resolve({ status: "service_unavailable", httpStatus: res.statusCode });
            } else {
              resolve({
                status: "error",
                error: `HTTP ${String(res.statusCode)}: ${body.slice(0, 150)}`,
              });
            }
          });
        },
      );

      req.on("error", (err) => {
        resolve({ status: "error", error: err.message });
      });

      req.setTimeout(65000, () => {
        req.destroy();
        resolve({ status: "error", error: "Délai d'attente dépassé (65s)" });
      });

      req.write(payload);
      req.end();
    });
  }

  public enrichDeckResult(raw: unknown): RecognizedDeckResult {
    const rawCards: { name: string; count?: number }[] = [];
    if (isRecord(raw) && Array.isArray(raw.cards)) {
      for (const item of raw.cards) {
        if (isRecord(item) && typeof item.name === "string" && item.name.trim()) {
          rawCards.push({
            name: item.name.trim(),
            count: typeof item.count === "number" ? item.count : 1,
          });
        }
      }
    }

    type BasicLandKey = "Plains" | "Island" | "Swamp" | "Mountain" | "Forest";
    const basicLands: Record<BasicLandKey, number> = {
      Plains: 0,
      Island: 0,
      Swamp: 0,
      Mountain: 0,
      Forest: 0,
    };

    if (isRecord(raw) && isRecord(raw.basicLands)) {
      for (const [land, count] of Object.entries(raw.basicLands)) {
        const titleLand = (land.charAt(0).toUpperCase() +
          land.slice(1).toLowerCase()) as BasicLandKey;
        if (typeof count === "number" && titleLand in basicLands) {
          basicLands[titleLand] = Math.max(0, count);
        }
      }
    }

    const cardsMap = new Map<string, DeclaredDeckCard & { count: number }>();

    for (const item of rawCards) {
      const count = typeof item.count === "number" && item.count > 0 ? item.count : 1;
      const resolved = this.cardsIndex.resolveCard(item.name);

      // Check if it's a basic land that ended up in cards list
      const lower = resolved.name.toLowerCase();
      if (lower === "plains") basicLands.Plains += count;
      else if (lower === "island") basicLands.Island += count;
      else if (lower === "swamp") basicLands.Swamp += count;
      else if (lower === "mountain") basicLands.Mountain += count;
      else if (lower === "forest") basicLands.Forest += count;
      else {
        const existing = cardsMap.get(resolved.name);
        if (existing) {
          existing.count += count;
        } else {
          cardsMap.set(resolved.name, { ...resolved, count });
        }
      }
    }

    const cards = Array.from(cardsMap.values()).sort((a, b) => {
      const cmcA = a.cmc ?? 0;
      const cmcB = b.cmc ?? 0;
      if (cmcA !== cmcB) return cmcA - cmcB;
      return a.name.localeCompare(b.name);
    });

    const totalSpells = cards.reduce((sum, c) => sum + c.count, 0);
    const totalLands = Object.values(basicLands).reduce((sum, c) => sum + c, 0);

    const archetype =
      isRecord(raw) && typeof raw.archetype === "string" && raw.archetype.trim()
        ? raw.archetype.trim()
        : "Autre";

    const confidence = isRecord(raw) && typeof raw.confidence === "number" ? raw.confidence : 0.9;

    return {
      archetype,
      cards,
      basicLands,
      totalCount: totalSpells + totalLands,
      confidence,
    };
  }
}

export function createDeckPhotoRecognizer(options?: {
  readonly projectRoot?: string;
  readonly geminiKeys?: readonly string[];
  readonly model?: string;
}): DeckPhotoRecognizer {
  return new GeminiDeckPhotoRecognizer(options);
}
