export interface ScryfallImageUris {
  readonly small?: string;
  readonly normal?: string;
  readonly large?: string;
  readonly png?: string;
  readonly art_crop?: string;
  readonly border_crop?: string;
}

export interface ScryfallCardFace {
  readonly name: string;
  readonly printed_name?: string;
  readonly mana_cost?: string;
  readonly type_line?: string;
  readonly printed_type_line?: string;
  readonly oracle_text?: string;
  readonly printed_text?: string;
  readonly flavor_text?: string;
  readonly power?: string;
  readonly toughness?: string;
  readonly loyalty?: string;
  readonly artist?: string;
  readonly illustration_id?: string;
  readonly image_uris?: ScryfallImageUris;
}

export interface ScryfallPrint {
  readonly id: string;
  readonly oracle_id?: string;
  readonly lang: string;
  readonly name: string;
  readonly printed_name?: string;
  readonly mana_cost?: string;
  readonly type_line?: string;
  readonly printed_type_line?: string;
  readonly oracle_text?: string;
  readonly printed_text?: string;
  readonly flavor_text?: string;
  readonly power?: string;
  readonly toughness?: string;
  readonly loyalty?: string;
  readonly layout?: string;
  readonly set: string;
  readonly set_name?: string;
  readonly set_type?: string;
  readonly collector_number?: string;
  readonly released_at?: string;
  readonly artist?: string;
  readonly illustration_id?: string;
  readonly frame?: string;
  readonly frame_effects?: readonly string[];
  readonly border_color?: string;
  readonly promo?: boolean;
  readonly promo_types?: readonly string[];
  readonly full_art?: boolean;
  readonly textless?: boolean;
  readonly digital?: boolean;
  readonly oversized?: boolean;
  readonly booster?: boolean;
  readonly highres_image?: boolean;
  readonly image_status?: string;
  readonly image_uris?: ScryfallImageUris;
  readonly card_faces?: readonly ScryfallCardFace[];
}

export interface ProxyScanBackFace {
  readonly name: string;
  readonly printedName?: string;
  readonly manaCost?: string;
  readonly typeLine: string;
  readonly printedTypeLine?: string;
  readonly oracleText: string;
  readonly printedText?: string;
  readonly power?: string;
  readonly toughness?: string;
  readonly loyalty?: string;
  readonly pngUrl: string;
  readonly largeUrl: string;
  readonly artCropUrl?: string;
}

export interface ProxyScanVariant {
  readonly scryfallId: string;
  readonly illustrationId?: string;
  readonly lang: string;
  readonly setCode: string;
  readonly setName: string;
  readonly collectorNumber: string;
  readonly releasedAt: string;
  readonly artist: string;
  readonly frame: string;
  readonly frameEffects: readonly string[];
  readonly borderColor: string;
  readonly promoTypes: readonly string[];
  readonly fullArt: boolean;
  readonly borderless: boolean;
  readonly highresImage: boolean;
  readonly imageStatus: string;
  readonly treatmentLabel: string;
  readonly pngUrl: string;
  readonly largeUrl: string;
  readonly borderCropUrl?: string;
  readonly artCropUrl?: string;
  readonly localPngPath?: string;
  readonly localArtPath?: string;
  readonly backFace?: ProxyScanBackFace;
  readonly isOfficialFrenchScan: boolean;
  readonly needsFrenchProxyRender: boolean;
  readonly score: number;
}

export type ProxyFrenchTextSource =
  "official_scryfall_fr" | "catalog_fr" | "translated_fallback" | "custom";

export interface ProxyCardFrenchData {
  readonly name: string;
  readonly typeLine: string;
  readonly rulesText: string;
  readonly flavorText?: string;
  readonly backFaceName?: string;
  readonly backFaceTypeLine?: string;
  readonly backFaceRulesText?: string;
  readonly source: ProxyFrenchTextSource;
  readonly officialFrenchPrintExists: boolean;
}

export interface ProxyCardFallbackInput {
  readonly oracleId: string;
  readonly slug: string;
  readonly name: string;
  readonly typeLine: string;
  readonly oracleText: string;
  readonly frenchName?: string;
  readonly frenchText?: string;
}

export interface ProxyScanEntry {
  readonly oracleId: string;
  readonly slug: string;
  readonly name: string;
  readonly french: ProxyCardFrenchData;
  readonly classic: ProxyScanVariant;
  readonly original: ProxyScanVariant | null;
  readonly curatedAt: string;
}

export interface ProxyScansCatalog {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly cardCount: number;
  readonly entries: Record<string, ProxyScanEntry>;
}

export type ProxyVariantKind = "classic" | "original";

export type ProxyRenderMode = "hybrid" | "force_fr" | "raw";

export interface ProxyPrintSelection {
  readonly oracleId: string;
  readonly slug: string;
  readonly name: string;
  readonly variant: ProxyVariantKind;
  readonly quantity: number;
  readonly hasBackFace?: boolean;
}

export interface ProxySheetLayoutOptions {
  readonly cropMarks: boolean;
  readonly gapMm: 0 | 2;
  readonly includeBackFaces: boolean;
}

export interface ProxyPrintSlot {
  readonly oracleId: string;
  readonly slug: string;
  readonly name: string;
  readonly variant: ProxyVariantKind;
  readonly face: "front" | "back";
  readonly copyIndex: number;
}

export interface ProxySheetPage {
  readonly pageNumber: number;
  readonly totalPages: number;
  readonly slots: readonly ProxyPrintSlot[];
}
