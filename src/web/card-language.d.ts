export type CardLanguage = "EN" | "FR";

export interface CardImageLike {
  readonly name?: string;
  readonly frenchName?: string;
  readonly imageUrl?: string;
  readonly frenchImageUrl?: string;
  readonly frenchLargeImageUrl?: string;
  readonly localImagePath?: string;
  readonly localFrenchImagePath?: string;
  readonly localFrenchPath?: string;
  readonly image?: {
    readonly url?: string;
    readonly localPath?: string;
    readonly localFrenchPath?: string;
  };
}

export const CARD_LANGUAGE_STORAGE_KEY: "draftmaster_card_language";
export const DEFAULT_CARD_LANGUAGE: "EN";
export function normalizeCardLanguage(value: unknown): CardLanguage;
export function readCardLanguage(storage?: Pick<Storage, "getItem">): CardLanguage;
export function writeCardLanguage(
  language: unknown,
  storage?: Pick<Storage, "setItem">,
): CardLanguage;
export function getCardDisplayName(card: CardImageLike | null, language: unknown): string;
export function getCardImageUrl(
  card: CardImageLike | null,
  language: unknown,
  isLarge?: boolean,
): string;
export function getCardImageFallbackUrl(card: CardImageLike | null, language: unknown): string;
