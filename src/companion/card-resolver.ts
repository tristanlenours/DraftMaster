import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

export interface CompanionCard {
  readonly grpId: number;
  readonly name: string;
  readonly manaCost: string;
  readonly cmc: number;
  readonly rarity: number;
  readonly colors: readonly string[];
  readonly isLand: boolean;
  readonly imageUrl: string;
  readonly oracleText?: string | undefined;
  readonly typeLine?: string | undefined;
  readonly producesColors?: readonly string[] | undefined;
  readonly powerScore?: number | undefined;
  readonly tier?: string | undefined;
  readonly roles?: readonly string[] | undefined;
}

const COLOR_ENUM_MAP: Record<number, string> = {
  1: "W",
  2: "U",
  3: "B",
  4: "R",
  5: "G",
};

function parseOldSchoolMana(raw: string | null | undefined): {
  manaCost: string;
  cmc: number;
  colors: string[];
} {
  if (!raw) return { manaCost: "", cmc: 0, colors: [] };
  const matches = raw.match(/o[0-9XWUBRG]+/g) || [];
  let cmc = 0;
  const colors = new Set<string>();
  const parts: string[] = [];

  for (const m of matches) {
    const symbol = m.substring(1);
    parts.push(`{${symbol}}`);
    const num = parseInt(symbol, 10);
    if (!isNaN(num)) {
      cmc += num;
    } else if (["W", "U", "B", "R", "G"].includes(symbol)) {
      cmc += 1;
      colors.add(symbol);
    }
  }

  return {
    manaCost: parts.join(""),
    cmc,
    colors: Array.from(colors),
  };
}

interface UntappedCardMeta {
  readonly name?: string | undefined;
  readonly mana_cost?: string | undefined;
  readonly cmc?: number | undefined;
  readonly type_line?: string | undefined;
  readonly oracle_text?: string | undefined;
  readonly colors?: readonly string[] | undefined;
  readonly color_identity?: readonly string[] | undefined;
  readonly produced_mana?: readonly string[] | undefined;
  readonly keywords?: readonly string[] | undefined;
  readonly subtypes?: readonly string[] | undefined;
}

export class CardResolver {
  private db: DatabaseSync | null = null;
  private cache = new Map<number, CompanionCard>();
  private stmt: any = null;
  private locStmt: any = null;
  private itemCatalog = new Map<string, any>();
  private grpIdMetadata = new Map<number, UntappedCardMeta>();

  constructor(customPath?: string) {
    this.initCatalog();
    this.initDb(customPath);
  }

  private initCatalog() {
    try {
      const itemsDir = path.resolve(process.cwd(), "data", "cards", "items");
      if (fs.existsSync(itemsDir)) {
        const files = fs.readdirSync(itemsDir);
        for (const file of files) {
          if (file.endsWith(".json")) {
            try {
              const content = fs.readFileSync(path.join(itemsDir, file), "utf8");
              const cardDoc = JSON.parse(content);
              if (cardDoc.name) {
                this.itemCatalog.set(cardDoc.name.toLowerCase().trim(), cardDoc);
              }
            } catch {}
          }
        }
      }
    } catch (e: any) {
      console.warn("[CardResolver] Could not load item catalog:", e.message);
    }

    try {
      const metadataPath = path.resolve(
        process.cwd(),
        "data",
        "untapped_history",
        "card-metadata-v1.json",
      );
      if (fs.existsSync(metadataPath)) {
        const content = fs.readFileSync(metadataPath, "utf8");
        const metadataObj = JSON.parse(content) as Record<string, UntappedCardMeta>;
        for (const [key, val] of Object.entries(metadataObj)) {
          const id = Number(key);
          if (!isNaN(id)) {
            this.grpIdMetadata.set(id, val);
          }
        }
      }
    } catch (e: any) {
      console.warn("[CardResolver] Could not load untapped metadata:", e.message);
    }
  }

  private buildCardFromMetadata(grpId: number, meta: UntappedCardMeta): CompanionCard {
    const { manaCost, cmc, colors } = parseOldSchoolMana(meta.mana_cost);
    const cleanName = (meta.name ?? "").trim();
    const lower = cleanName.toLowerCase();
    const isLand = (meta.type_line ?? "").includes("Land") || !manaCost;
    const imageUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cleanName)}&format=image&version=normal`;

    const item = this.itemCatalog.get(lower);
    const oracleText = item?.oracleText || meta.oracle_text || "";

    const producesColors: string[] = item?.producesColors
      ? [...item.producesColors]
      : Array.isArray(meta.produced_mana)
        ? [...meta.produced_mana]
        : [];

    const powerScore = item?.powerScore?.score ?? item?.staticScore;
    const tier =
      item?.cubeAnalyses?.nico_candyshop?.tier ??
      (powerScore && powerScore >= 45 ? "S" : powerScore && powerScore >= 35 ? "A" : undefined);
    const roles = item?.objectiveAnalysis?.roles;
    const typeLine = item?.typeLine ?? meta.type_line ?? (isLand ? "Land" : "Spell");

    const card: CompanionCard = {
      grpId,
      name: cleanName,
      manaCost: manaCost || (meta.mana_cost ? parseOldSchoolMana(meta.mana_cost).manaCost : ""),
      cmc: item?.cmc ?? (typeof meta.cmc === "number" ? meta.cmc : cmc),
      rarity: typeof item?.rarity === "number" ? item.rarity : 3,
      colors:
        Array.isArray(meta.colors) && meta.colors.length > 0
          ? meta.colors
          : (item?.colors ?? colors),
      isLand: item?.isLand ?? isLand,
      imageUrl,
      oracleText,
      typeLine,
      producesColors: producesColors.length > 0 ? producesColors : undefined,
      powerScore,
      tier,
      roles,
    };

    this.cache.set(grpId, card);
    return card;
  }

  private initDb(customPath?: string) {
    const rawDir =
      customPath || "C:\\Program Files\\Wizards of the Coast\\MTGA\\MTGA_Data\\Downloads\\Raw";
    if (!fs.existsSync(rawDir)) {
      console.warn("[CardResolver] MTGA Raw directory not found at:", rawDir);
      return;
    }

    try {
      const files = fs.readdirSync(rawDir);
      const cardFile = files.find((f) => f.startsWith("Raw_CardDatabase_") && f.endsWith(".mtga"));
      if (!cardFile) {
        console.warn("[CardResolver] No Raw_CardDatabase file found in:", rawDir);
        return;
      }

      const fullPath = path.join(rawDir, cardFile);
      this.db = new DatabaseSync(fullPath, { readOnly: true });
      this.stmt = (this.db as any).prepare(`
        SELECT c.GrpId, l.Loc as Name, c.OldSchoolManaText, c.Rarity, c.Types, c.Subtypes, c.AbilityIds, c.ColorIdentity
        FROM Cards c
        LEFT JOIN Localizations_enUS l ON c.TitleId = l.LocId
        WHERE c.GrpId = ?
      `);
      this.locStmt = (this.db as any).prepare(`
        SELECT Loc FROM Localizations_enUS WHERE LocId = ?
      `);
    } catch (e: any) {
      console.error("[CardResolver] Failed to initialize CardResolver SQLite:", e.message);
    }
  }

  public resolve(grpId: number): CompanionCard {
    const cached = this.cache.get(grpId);
    if (cached) return cached;

    const meta = this.grpIdMetadata.get(grpId);

    if (!this.stmt) {
      if (meta?.name) {
        return this.buildCardFromMetadata(grpId, meta);
      }
      const fallback: CompanionCard = {
        grpId,
        name: `Card #${grpId}`,
        manaCost: "",
        cmc: 0,
        rarity: 1,
        colors: [],
        isLand: false,
        imageUrl: "",
      };
      return fallback;
    }

    try {
      const row: any = this.stmt.get(grpId);
      if (!row || !row.Name) {
        if (meta?.name) {
          return this.buildCardFromMetadata(grpId, meta);
        }
        const unknown: CompanionCard = {
          grpId,
          name: `Card #${grpId}`,
          manaCost: "",
          cmc: 0,
          rarity: 1,
          colors: [],
          isLand: false,
          imageUrl: "",
        };
        this.cache.set(grpId, unknown);
        return unknown;
      }

      const { manaCost, cmc, colors } = parseOldSchoolMana(row.OldSchoolManaText);
      const isLand = String(row.Types || "").includes("5") || !manaCost;
      const cleanName = String(row.Name).trim();
      const lower = cleanName.toLowerCase();
      const imageUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cleanName)}&format=image&version=normal`;

      // 1. Catalog enrichment
      const item = this.itemCatalog.get(lower);

      // 2. Oracle Text & Abilities extraction from SQLite if not in catalog
      let oracleText = item?.oracleText || "";
      if (!oracleText && row.AbilityIds && this.locStmt) {
        const abilityPairs = String(row.AbilityIds).split(",").filter(Boolean);
        const abilityTexts: string[] = [];
        for (const pair of abilityPairs) {
          const [, textIdStr] = pair.split(":");
          const textId = Number(textIdStr);
          if (!isNaN(textId) && textId > 0) {
            const locRow: any = this.locStmt.get(textId);
            if (locRow?.Loc) {
              abilityTexts.push(String(locRow.Loc).trim());
            }
          }
        }
        oracleText = abilityTexts.join("\n");
      }

      // 3. Produced colors (especially for lands)
      const producesColors: string[] = item?.producesColors ? [...item.producesColors] : [];
      if (producesColors.length === 0 && row.ColorIdentity) {
        const idParts = String(row.ColorIdentity)
          .split(",")
          .map((x) => parseInt(x.trim(), 10));
        for (const idNum of idParts) {
          const col = COLOR_ENUM_MAP[idNum];
          if (col && !producesColors.includes(col)) {
            producesColors.push(col);
          }
        }
      }

      // 4. Power score & tier
      const powerScore = item?.powerScore?.score ?? item?.staticScore;
      const tier =
        item?.cubeAnalyses?.nico_candyshop?.tier ??
        (powerScore && powerScore >= 45 ? "S" : powerScore && powerScore >= 35 ? "A" : undefined);
      const roles = item?.objectiveAnalysis?.roles;
      const typeLine = item?.typeLine ?? (isLand ? "Land" : "Spell");

      const card: CompanionCard = {
        grpId,
        name: cleanName,
        manaCost,
        cmc: item?.cmc ?? cmc,
        rarity: Number(row.Rarity || 1),
        colors: colors.length > 0 ? colors : (item?.colors ?? []),
        isLand: item?.isLand ?? isLand,
        imageUrl,
        oracleText,
        typeLine,
        producesColors: producesColors.length > 0 ? producesColors : undefined,
        powerScore,
        tier,
        roles,
      };

      this.cache.set(grpId, card);
      return card;
    } catch (e: any) {
      if (meta?.name) {
        return this.buildCardFromMetadata(grpId, meta);
      }
      console.error(`[CardResolver] Error resolving card ${grpId}:`, e.message);
      return {
        grpId,
        name: `Card #${grpId}`,
        manaCost: "",
        cmc: 0,
        rarity: 1,
        colors: [],
        isLand: false,
        imageUrl: "",
      };
    }
  }

  public resolveMultiple(grpIds: readonly number[]): CompanionCard[] {
    return grpIds.map((id) => this.resolve(id));
  }

  public close() {
    if (this.db) {
      (this.db as any).close();
      this.db = null;
    }
  }
}
