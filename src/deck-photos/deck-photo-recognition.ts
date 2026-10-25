import * as https from "node:https";
import { type CatalogDeckCard, MasterCardsIndex } from "../cards/master-cards-index.ts";
import { BASIC_LAND_IDENTITIES } from "../cards/import-printed-names.ts";

/** Error codes match the tournament API so the recognize-deck route answers unchanged. */
export type DeckPhotoErrorCode = "INVALID_INPUT" | "STORE_UNAVAILABLE";

export interface DeckPhotoError {
  readonly code: DeckPhotoErrorCode;
  readonly message: string;
  readonly details: Readonly<Record<string, unknown>>;
}

export type DeckPhotoResult<T> =
  | { readonly ok: true; readonly value: Readonly<T> }
  | { readonly ok: false; readonly error: DeckPhotoError };

export interface RecognizedDeckResult {
  readonly archetype: string;
  readonly cards: readonly CatalogDeckCard[];
  readonly basicLands: Record<string, number>;
  readonly totalCount: number;
  readonly confidence?: number;
  readonly unverifiedTitles?: readonly string[];
}

export interface DeckPhotoRecognizerOptions {
  readonly projectRoot?: string;
  readonly geminiKeys?: readonly string[];
  readonly model?: string;
  readonly cardsIndex?: MasterCardsIndex;
}

export interface DeckPhotoRecognizer {
  recognizeDeck(
    imageBuffer: Buffer | readonly Buffer[],
    mimeType: string,
    options?: {
      readonly cubeKey?: string;
      readonly cubeName?: string;
      readonly candidateCardNames?: readonly string[];
    },
  ): Promise<DeckPhotoResult<RecognizedDeckResult>>;
}

const httpsKeepAliveAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30_000,
  maxSockets: 20,
  maxFreeSockets: 10,
});

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
    imageBuffer: Buffer | readonly Buffer[],
    mimeType: string,
    options?: {
      readonly cubeKey?: string;
      readonly cubeName?: string;
      readonly candidateCardNames?: readonly string[];
    },
  ): Promise<DeckPhotoResult<RecognizedDeckResult>> {
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

    const tiled = Array.isArray(imageBuffer);
    const base64Images = (tiled ? (imageBuffer as readonly Buffer[]) : [imageBuffer as Buffer]).map(
      (image) => image.toString("base64"),
    );
    const formattedCandidates: string[] = [];
    if (!tiled && options?.candidateCardNames && options.candidateCardNames.length > 0) {
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

    const systemPrompt = tiled
      ? `Transcris uniquement les titres imprimés en anglais ou en français et lisibles des cartes Magic dans chacune des ${String(base64Images.length)} régions de la même photo. Si un reflet masque le bandeau de titre d'une carte mais que son illustration, son coût ou son texte imprimé permet d'identifier avec certitude la carte Magic, indique son titre officiel. Les régions se chevauchent. Oriente mentalement chaque région pour lire les titres. Ne complète jamais un titre tronqué, ne devine aucune carte cachée et n'estime aucun nombre de terrains. Ne déduis aucun titre d'après le contexte du deck. Garde les titres dans leur langue imprimée. Réponds uniquement en JSON : {"tiles":[{"tile":1,"titles":["titre imprimé", "autre titre"]}]}. Inclus une entrée par région, numérotée de 1 à ${String(base64Images.length)}, avec une liste vide si rien n'est lisible. Chaque carte non basique apparaît au plus une fois par région. Répète un nom de terrain de base seulement si plusieurs cartes physiques distinctes portent ce titre lisible dans cette région.`
      : `Tu es un expert en analyse visuelle de decks de Magic: The Gathering (MTG).
On te fournit une photo d'un deck physique de Magic posé sur une table ou un tapis de jeu.${candidateListStr}

Consignes :
1. Détecte et identifie minutieusement chaque carte visible imprimée en anglais ou en français dans la photo.
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
            base64Images,
            mimeType,
            systemPrompt,
          );
          if (outcome.status === "success") {
            const value = tiled
              ? this.enrichTiledResult(
                  outcome.data,
                  base64Images.length,
                  options?.candidateCardNames,
                )
              : this.enrichDeckResult(outcome.data);
            if (value === undefined) {
              return {
                ok: false,
                error: {
                  code: "INVALID_INPUT",
                  message: "Aucun titre de carte lisible dans la photo.",
                  details: {},
                },
              };
            }
            return {
              ok: true,
              value,
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
    base64Images: readonly string[],
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
              ...base64Images.map((data) => ({
                inlineData: { mimeType: mimeType || "image/jpeg", data },
              })),
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
          maxOutputTokens: base64Images.length > 1 ? 4500 : 3000,
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
                } else {
                  const cleaned = text
                    .trim()
                    .replace(/^```(?:json)?\s*/i, "")
                    .replace(/\s*```$/, "");
                  const json: unknown = JSON.parse(cleaned);
                  resolve({ status: "success", data: json });
                }
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

  private enrichTiledResult(
    raw: unknown,
    regionCount: number,
    candidateCardNames?: readonly string[],
  ): RecognizedDeckResult | undefined {
    if (!isRecord(raw) || !Array.isArray(raw.tiles)) return undefined;
    const counts = new Map<string, { card: CatalogDeckCard; count: number }>();
    const basicLands: Record<string, number> = {
      Plains: 0,
      Island: 0,
      Swamp: 0,
      Mountain: 0,
      Forest: 0,
    };
    const unverifiedTitles = new Set<string>();
    let readableTitles = 0;
    const seenRegions = new Set<number>();
    for (const tile of raw.tiles) {
      if (
        !isRecord(tile) ||
        !Number.isInteger(tile.tile) ||
        !Array.isArray(tile.titles) ||
        (tile.tile as number) < 1 ||
        (tile.tile as number) > regionCount ||
        seenRegions.has(tile.tile as number)
      )
        continue;
      seenRegions.add(tile.tile as number);
      const regionCounts = new Map<string, number>();
      const regionCards = new Map<string, CatalogDeckCard>();
      for (const title of tile.titles) {
        if (typeof title !== "string" || !title.trim()) continue;
        readableTitles++;
        const trimmed = title.trim();
        const resolved = this.cardsIndex.findPhotoCard(trimmed, candidateCardNames);
        const basic =
          resolved && Object.hasOwn(BASIC_LAND_IDENTITIES, resolved.name)
            ? resolved.name
            : undefined;
        const card = basic ? undefined : resolved;
        if (!basic && !card) {
          unverifiedTitles.add(trimmed);
          continue;
        }
        const name = basic ?? card?.name;
        if (!name) continue;
        // Regions overlap. Keep singleton nonbasics and the largest visible basic count
        // from one region; the player verifies quantities in the editable list.
        regionCounts.set(name, basic ? (regionCounts.get(name) ?? 0) + 1 : 1);
        if (card) regionCards.set(name, card);
      }
      for (const [name, count] of regionCounts) {
        if (name in basicLands) basicLands[name] = Math.max(basicLands[name] ?? 0, count);
        else {
          const card = regionCards.get(name);
          if (!card) continue;
          counts.set(name, { card, count: Math.max(counts.get(name)?.count ?? 0, count) });
        }
      }
    }
    if (readableTitles === 0) return undefined;
    const cards = [...counts.values()]
      .map(({ card, count }) => ({ ...card, count }))
      .sort((a, b) => (a.cmc ?? 0) - (b.cmc ?? 0) || a.name.localeCompare(b.name));
    return {
      archetype: "Liste photo à vérifier",
      cards,
      basicLands,
      totalCount:
        cards.reduce((sum, card) => sum + card.count, 0) +
        Object.values(basicLands).reduce((sum, count) => sum + count, 0),
      unverifiedTitles: [...unverifiedTitles],
    };
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
        const resolved = this.cardsIndex.findExactCard(land);
        if (typeof count === "number" && resolved && Object.hasOwn(basicLands, resolved.name)) {
          basicLands[resolved.name as BasicLandKey] = Math.max(0, count);
        }
      }
    }

    const cardsMap = new Map<string, CatalogDeckCard & { count: number }>();

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
