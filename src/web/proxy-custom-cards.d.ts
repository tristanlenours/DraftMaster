export type CustomCardMode = "scan" | "art";

export interface CustomCard {
  readonly id: string;
  readonly mode: CustomCardMode;
  readonly name: string;
  readonly manaCost: string;
  readonly typeLine: string;
  readonly rulesText: string;
  readonly flavorText: string;
  readonly power: string;
  readonly toughness: string;
  readonly artist: string;
  readonly imageHasBleed: boolean;
  readonly quantity: number;
  readonly updatedAt: string;
}

export const CUSTOM_CARD_MODES: readonly CustomCardMode[];
export const MAX_CUSTOM_QUANTITY: number;
export const MPC_BLEED_MM: number;

export function parseManaCostInput(raw: string): string;
export function deriveColorsFromManaCost(manaCost: string): string[];
export function createCustomCardId(now?: number, random?: () => number): string;
export function createCustomCardDraft(id?: string): CustomCard;
export function normalizeCustomCard(
  input: Partial<Record<keyof CustomCard, unknown>>,
  now?: Date,
): { readonly ok: boolean; readonly card: CustomCard; readonly errors: string[] };
export function toRenderCard(customCard: CustomCard): {
  readonly oracleId: string;
  readonly slug: string;
  readonly name: string;
  readonly manaCost: string;
  readonly typeLine: string;
  readonly colors: string[];
  readonly types: string[];
  readonly isLand: boolean;
  readonly power: string | undefined;
  readonly toughness: string | undefined;
};
export function toFrenchText(customCard: CustomCard): {
  readonly name: string;
  readonly typeLine: string;
  readonly rulesText: string;
  readonly flavorText: string;
  readonly source: "custom";
  readonly officialFrenchPrintExists: false;
};
export function computeCardCrop(
  imageWidth: number,
  imageHeight: number,
  options?: { readonly hasBleed?: boolean },
): { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
export function estimatePrintDpi(cropWidthPx: number): number;
export function estimateCustomCardDpi(
  imageWidth: number,
  imageHeight: number,
  options: { readonly mode: CustomCardMode; readonly hasBleed?: boolean },
): number;
