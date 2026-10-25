export const BASIC_LAND_IDENTITIES: Readonly<Record<string, string>> = {
  Plains: "bc71ebf6-2056-41f7-be35-b2e5c34afa99",
  Island: "b2c6aa39-2d2a-459c-a555-fb48ba993373",
  Swamp: "56719f6a-1a6c-4c0a-8d21-18f7d7350b68",
  Mountain: "a3fb7228-e76b-4e96-a40e-20b5fed75685",
  Forest: "b34bb2dc-c1af-4d77-b0b3-a0fb342a5fc6",
};

export interface PrintedNameAlias {
  readonly name: string;
  readonly oracleId: string;
  readonly lang: string;
  readonly printedName: string;
  readonly scryfallId: string;
}

export interface PrintedNameCard {
  readonly name: string;
  readonly oracleId: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Explicit maintenance operation. No source lookup happens during photo recognition.
export async function importPrintedNames(
  cards: readonly PrintedNameCard[],
  options: {
    readonly request?: (url: string) => Promise<Response>;
    readonly pause?: () => Promise<void>;
    readonly onProgress?: (completed: number, total: number) => void;
  } = {},
): Promise<readonly PrintedNameAlias[]> {
  const request =
    options.request ??
    ((url: string) =>
      fetch(url, {
        signal: AbortSignal.timeout(30_000),
        headers: {
          "User-Agent":
            "DraftMaster/1.0 (printed-name-cache; github.com/tristanlenours/DraftMaster)",
          Accept: "application/json",
        },
      }));
  const pause = options.pause ?? (() => new Promise<void>((resolve) => setTimeout(resolve, 550)));
  const identities = new Map(cards.map((card) => [card.oracleId, card]));
  const uniqueCards = [...identities.values()].sort((a, b) => a.oracleId.localeCompare(b.oracleId));
  const aliases = new Map<string, PrintedNameAlias>();
  for (let offset = 0; offset < uniqueCards.length; offset += 10) {
    const batch = uniqueCards.slice(offset, offset + 10);
    const query = `(${batch.map((card) => `oracleid:${card.oracleId}`).join(" or ")}) lang:fr unique:prints`;
    let next: string | undefined =
      `https://api.scryfall.com/cards/search?${new URLSearchParams({ q: query, include_multilingual: "true" })}`;
    const visited = new Set<string>();
    while (next) {
      const url = new URL(next);
      if (
        url.origin !== "https://api.scryfall.com" ||
        url.pathname !== "/cards/search" ||
        visited.has(next)
      ) {
        throw new Error("Invalid Scryfall pagination URL.");
      }
      visited.add(next);
      await pause();
      const response = await request(next);
      if (response.status === 404 && visited.size === 1) break;
      if (!response.ok)
        throw new Error(`Scryfall printed-name import failed: HTTP ${String(response.status)}.`);
      const page: unknown = await response.json();
      if (!isRecord(page) || !Array.isArray(page.data) || typeof page.has_more !== "boolean") {
        throw new Error("Invalid Scryfall printed-name page.");
      }
      for (const print of page.data) {
        if (!isRecord(print) || typeof print.oracle_id !== "string")
          throw new Error("Invalid Scryfall printing identity.");
        const card = identities.get(print.oracle_id);
        if (!card || !batch.some((entry) => entry.oracleId === print.oracle_id))
          throw new Error("Unexpected Scryfall printing identity.");
        if (typeof print.id !== "string" || print.lang !== "fr")
          throw new Error("Invalid Scryfall printing provenance.");
        const titles: string[] = [];
        if (typeof print.printed_name === "string") titles.push(print.printed_name);
        if (Array.isArray(print.card_faces)) {
          for (const face of print.card_faces) {
            if (isRecord(face) && typeof face.printed_name === "string")
              titles.push(face.printed_name);
          }
        }
        for (const printedName of titles) {
          if (!printedName.trim()) continue;
          const alias: PrintedNameAlias = {
            name: card.name,
            oracleId: card.oracleId,
            lang: print.lang,
            printedName: printedName.trim(),
            scryfallId: print.id,
          };
          const key = JSON.stringify([alias.oracleId, alias.lang, alias.printedName]);
          const existing = aliases.get(key);
          if (!existing || alias.scryfallId < existing.scryfallId) aliases.set(key, alias);
        }
      }
      if (page.has_more && typeof page.next_page !== "string")
        throw new Error("Missing Scryfall pagination URL.");
      next = page.has_more ? String(page.next_page) : undefined;
    }
    options.onProgress?.(Math.min(offset + 10, uniqueCards.length), uniqueCards.length);
  }
  return [...aliases.values()].sort(
    (a, b) =>
      a.name.localeCompare(b.name, "en") ||
      a.lang.localeCompare(b.lang, "en") ||
      a.printedName.localeCompare(b.printedName, "en"),
  );
}
