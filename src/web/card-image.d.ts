export interface ImageTarget {
  src: string;
  onerror: null | (() => void);
}

export function loadImageWithFallback(
  image: ImageTarget,
  primarySrc: string,
  fallbackSrc: string,
): void;

export interface ScryfallPrintLike {
  name?: string;
  card_faces?: {
    name?: string;
    printed_name?: string;
  }[];
  [key: string]: unknown;
}

export function isMatchingScryfallPrint(
  print: ScryfallPrintLike | null | undefined,
  cardName: string,
): boolean;

export function sanitizeFrenchCache(cacheMap: Map<string, Record<string, unknown>>): boolean;
