import type { FinalDeckBasicLands } from "./final-deck-coach.ts";

export interface MtgaExportCard {
  readonly instanceId: string;
  readonly name: string;
  readonly arenaName?: string | null | undefined;
  readonly arenaAvailability?: "available" | "unknown" | "unavailable" | "ambiguous" | undefined;
  readonly cmc?: number | undefined;
  readonly isLand?: boolean | undefined;
}

export interface FinalizedDeckForMtga {
  readonly status: "finalized";
  readonly pool: readonly MtgaExportCard[];
  readonly maindeckCardInstanceIds: readonly string[];
  readonly basicLands: FinalDeckBasicLands;
}

export interface MtgaIncompatibleCard {
  readonly cardInstanceId: string;
  readonly name: string;
  readonly reason: string;
}

export interface MtgaExportResult {
  readonly compatible: boolean;
  readonly text: string;
  readonly tournamentText: string;
  readonly warnings: readonly string[];
  readonly incompatibleCards: readonly MtgaIncompatibleCard[];
  readonly deckCount: number;
  readonly sideboardCount: number;
}

const BASIC_LANDS = ["Plains", "Island", "Swamp", "Mountain", "Forest"] as const;

interface ExportLine {
  readonly name: string;
  readonly quantity: number;
  readonly cmc: number;
  readonly isLand: boolean;
  readonly isBasic: boolean;
}

function sumBasics(basics: FinalDeckBasicLands): number {
  return BASIC_LANDS.reduce((sum, name) => sum + basics[name], 0);
}

function validateBasics(basics: FinalDeckBasicLands): void {
  if (BASIC_LANDS.some((name) => !Number.isInteger(basics[name]) || basics[name] < 0)) {
    throw new Error(
      "Les quantites de terrains basiques doivent etre des entiers positifs ou nuls.",
    );
  }
}

function complementPool(
  pool: readonly MtgaExportCard[],
  selectedIds: readonly string[],
): readonly MtgaExportCard[] {
  const remaining = new Map<string, number>();
  for (const id of selectedIds) remaining.set(id, (remaining.get(id) ?? 0) + 1);
  return pool.flatMap((card) => {
    const count = remaining.get(card.instanceId) ?? 0;
    if (count > 0) {
      remaining.set(card.instanceId, count - 1);
      return [];
    }
    return [card];
  });
}

function getIncompatibility(card: MtgaExportCard): MtgaIncompatibleCard | undefined {
  if (card.arenaAvailability === "unknown") {
    return {
      cardInstanceId: card.instanceId,
      name: card.name,
      reason: "Disponibilite Arena inconnue.",
    };
  }
  if (card.arenaAvailability === "unavailable") {
    return {
      cardInstanceId: card.instanceId,
      name: card.name,
      reason: "Carte indisponible dans Magic Arena.",
    };
  }
  if (card.arenaAvailability === "ambiguous" || card.arenaName === null) {
    return {
      cardInstanceId: card.instanceId,
      name: card.name,
      reason: "Nom Arena ambigu.",
    };
  }
  if ((card.arenaName ?? card.name).trim() === "") {
    return {
      cardInstanceId: card.instanceId,
      name: card.name,
      reason: "Nom Arena manquant.",
    };
  }
  return undefined;
}

function aggregate(
  cards: readonly MtgaExportCard[],
  naming: "arena" | "printed" = "arena",
): readonly ExportLine[] {
  const lines = new Map<string, ExportLine>();
  for (const card of cards) {
    if (naming === "arena" && getIncompatibility(card)) continue;
    const name = (naming === "arena" ? (card.arenaName ?? card.name) : card.name).trim();
    if (!name) throw new Error("Une carte du deck n'a pas de nom exportable.");
    const current = lines.get(name);
    lines.set(name, {
      name,
      quantity: (current?.quantity ?? 0) + 1,
      cmc: Math.min(current?.cmc ?? Number.POSITIVE_INFINITY, card.cmc ?? 0),
      isLand: current?.isLand ?? Boolean(card.isLand),
      isBasic: false,
    });
  }
  return [...lines.values()];
}

function compareLines(left: ExportLine, right: ExportLine): number {
  if (left.isLand !== right.isLand) return left.isLand ? 1 : -1;
  if (left.isBasic !== right.isBasic) return left.isBasic ? 1 : -1;
  if (left.cmc !== right.cmc) return left.cmc - right.cmc;
  return left.name.localeCompare(right.name, "en", { sensitivity: "base" });
}

function renderSection(title: "Deck" | "Sideboard", lines: readonly ExportLine[]): string {
  return `${title}\n${[...lines]
    .sort(compareLines)
    .map(({ quantity, name }) => `${String(quantity)} ${name}`)
    .join("\n")}`;
}

export function generateMtgaExport(input: Readonly<FinalizedDeckForMtga>): MtgaExportResult {
  validateBasics(input.basicLands);
  const deckCount = input.maindeckCardInstanceIds.length + sumBasics(input.basicLands);
  if (deckCount !== 40) {
    throw new Error("Une Liste finale MTGA doit contenir exactement 40 cartes.");
  }

  const poolById = new Map(input.pool.map((card) => [card.instanceId, card]));
  const selectedCards = input.maindeckCardInstanceIds.map((id) => {
    const card = poolById.get(id);
    if (!card) throw new Error(`La carte selectionnee ${id} n'appartient pas au pool.`);
    return card;
  });
  const sideboardCards = complementPool(input.pool, input.maindeckCardInstanceIds);
  const basicLines: ExportLine[] = BASIC_LANDS.flatMap((name) =>
    input.basicLands[name] > 0
      ? [
          {
            name,
            quantity: input.basicLands[name],
            cmc: 0,
            isLand: true,
            isBasic: true,
          },
        ]
      : [],
  );
  const allDraftedCards = [...selectedCards, ...sideboardCards];
  const incompatibleCards = allDraftedCards.flatMap((card) => {
    const issue = getIncompatibility(card);
    return issue ? [issue] : [];
  });
  const compatible = incompatibleCards.length === 0;
  const deckText = renderSection("Deck", [...aggregate(selectedCards), ...basicLines]);
  const sideboardText = renderSection("Sideboard", aggregate(sideboardCards));
  const tournamentDeckText = renderSection("Deck", [
    ...aggregate(selectedCards, "printed"),
    ...basicLines,
  ]);
  const tournamentSideboardText = renderSection("Sideboard", aggregate(sideboardCards, "printed"));
  const marker = compatible ? "" : "# Export MTGA partiel non importable\n";
  const warnings = compatible
    ? []
    : [
        "Cette liste contient des cartes incompatibles et ne peut pas etre presente comme importable sans correction.",
      ];

  return {
    compatible,
    text: `${marker}${deckText}\n\n${sideboardText}\n`,
    tournamentText: `${tournamentDeckText}\n\n${tournamentSideboardText}\n`,
    warnings,
    incompatibleCards,
    deckCount,
    sideboardCount: sideboardCards.length,
  };
}
