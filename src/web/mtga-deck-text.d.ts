export interface MtgaDeckTextCard {
  readonly name: string;
  readonly count: number;
}

export type MtgaBasicLandName = "Plains" | "Island" | "Swamp" | "Mountain" | "Forest";

export interface ParsedMtgaDeckText {
  readonly deckName: string | null;
  readonly cards: readonly MtgaDeckTextCard[];
  readonly basicLands: Readonly<Record<MtgaBasicLandName, number>>;
  readonly sideboardCards: readonly MtgaDeckTextCard[];
  readonly sideboardBasicLands: Readonly<Record<MtgaBasicLandName, number>>;
  readonly sideboardCount: number;
  readonly totalCount: number;
}

export class MtgaDeckTextError extends Error {
  readonly line: number | null;
  constructor(message: string, line?: number | null);
}

export function parseMtgaDeckText(text: string): ParsedMtgaDeckText;

export function formatMtgaDeckText(input: {
  readonly deckName?: string | null;
  readonly cards?: readonly { readonly name: string; readonly count?: number }[];
  readonly basicLands?: Readonly<Partial<Record<MtgaBasicLandName, number>>>;
}): string;
