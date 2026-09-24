import { MtgaDeckTextError, parseMtgaDeckText } from "../web/mtga-deck-text.js";
import { MasterCardsIndex } from "./deck-photo-recognition.ts";
import type { DeclaredDeckCard, TournamentResult } from "./types.ts";

export interface PreviewedTournamentMtgaDeck {
  readonly deckName: string | null;
  readonly cards: readonly DeclaredDeckCard[];
  readonly basicLands: Readonly<Record<string, number>>;
  readonly totalCount: number;
  readonly sideboardCount: number;
  readonly unverifiedNames: readonly string[];
  readonly warnings: readonly string[];
}

export function previewTournamentMtgaDeck(
  text: string,
  projectRoot = process.cwd(),
): TournamentResult<PreviewedTournamentMtgaDeck> {
  try {
    const parsed = parseMtgaDeckText(text);
    const catalog = MasterCardsIndex.getInstance(projectRoot);
    const unverifiedNames: string[] = [];
    const cards = parsed.cards.map(({ name, count }) => {
      const exact = catalog.findExactCard(name);
      if (exact !== undefined) return { ...exact, count };
      unverifiedNames.push(name);
      return {
        name,
        count,
        imageUrl: `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}&format=image`,
      };
    });
    const warnings: string[] = [];
    if (parsed.sideboardCount > 0) {
      warnings.push(
        `${String(parsed.sideboardCount)} carte(s) du sideboard ignorée(s) : seul le maindeck entre dans le tournoi.`,
      );
    }
    if (unverifiedNames.length > 0) {
      warnings.push(
        `${String(unverifiedNames.length)} nom(s) absent(s) du catalogue local, conservé(s) sans correction automatique.`,
      );
    }
    return {
      ok: true,
      value: {
        deckName: parsed.deckName,
        cards,
        basicLands: parsed.basicLands,
        totalCount: parsed.totalCount,
        sideboardCount: parsed.sideboardCount,
        unverifiedNames,
        warnings,
      },
    };
  } catch (error: unknown) {
    if (!(error instanceof MtgaDeckTextError)) throw error;
    return {
      ok: false,
      error: {
        code: "INVALID_INPUT",
        message: error.message,
        details: error.line === null ? {} : { line: error.line },
      },
    };
  }
}
