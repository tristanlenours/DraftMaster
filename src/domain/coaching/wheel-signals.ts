import type { CardEvaluationInput, MtGColor } from "./types.ts";

export interface WheelSignalAnalysis {
  readonly originalPickNumber: number;
  readonly currentPickNumber: number;
  readonly pickedCardAtInitialPass?: CardEvaluationInput | undefined;
  readonly cardsWheeled: readonly CardEvaluationInput[];
  readonly cardsTakenByTable: readonly CardEvaluationInput[];
  readonly takenColorCounts: Readonly<Record<MtGColor, number>>;
  readonly wheeledColorCounts: Readonly<Record<MtGColor, number>>;
  readonly openColors: readonly MtGColor[];
  readonly contestedColors: readonly MtGColor[];
  readonly wheeledBombs: readonly CardEvaluationInput[];
  readonly signalSummary: string;
}

export interface ComputeWheelSignalsOptions {
  readonly originalPickNumber: number;
  readonly currentPickNumber: number;
  readonly pickedCardAtInitialPass?: CardEvaluationInput | undefined;
  readonly passedCards: readonly CardEvaluationInput[];
  readonly currentBoosterCards: readonly CardEvaluationInput[];
}

const ALL_COLORS: readonly MtGColor[] = ["W", "U", "B", "R", "G"];

/**
 * Computes deterministic wheel signals by comparing the cards passed to the table
 * at an earlier pick (picks 1–7) with the cards that returned to the seat at picks 9–15.
 */
export function computeWheelSignals(options: ComputeWheelSignalsOptions): WheelSignalAnalysis {
  const {
    originalPickNumber,
    currentPickNumber,
    pickedCardAtInitialPass,
    passedCards,
    currentBoosterCards,
  } = options;

  const currentBoosterCardIds = new Set(currentBoosterCards.map((c) => c.id));
  const cardsWheeled = [...currentBoosterCards];
  const cardsTakenByTable = passedCards.filter((c) => !currentBoosterCardIds.has(c.id));

  const takenColorCounts: Record<MtGColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  const wheeledColorCounts: Record<MtGColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  const passedColorCounts: Record<MtGColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };

  for (const card of cardsTakenByTable) {
    for (const col of card.colors) {
      takenColorCounts[col]++;
    }
  }

  for (const card of cardsWheeled) {
    for (const col of card.colors) {
      wheeledColorCounts[col]++;
    }
  }

  for (const card of passedCards) {
    for (const col of card.colors) {
      passedColorCounts[col]++;
    }
  }

  const openColors: MtGColor[] = [];
  const contestedColors: MtGColor[] = [];

  for (const col of ALL_COLORS) {
    const passed = passedColorCounts[col];
    const taken = takenColorCounts[col];
    const wheeled = wheeledColorCounts[col];

    if (passed >= 2) {
      if (taken === 0 || (wheeled >= 2 && wheeled >= taken)) {
        openColors.push(col);
      } else if (wheeled === 0 || (taken >= 3 && wheeled <= 1)) {
        contestedColors.push(col);
      }
    } else if (passed === 1) {
      if (wheeled === 1) {
        // A single passed card that returned can indicate openness if it's high quality
        const wheeledCard = cardsWheeled.find((c) => c.colors.includes(col));
        if (wheeledCard && (wheeledCard.powerScore ?? wheeledCard.staticScore) >= 30) {
          openColors.push(col);
        }
      }
    }
  }

  const wheeledBombs = cardsWheeled.filter((c) => {
    const score = c.powerScore ?? c.staticScore;
    const isHighTier = c.tier ? ["S", "A", "A+"].includes(c.tier) : false;
    return score >= 32 || isHighTier;
  });

  // Construct tactical summary
  const summaryParts: string[] = [];
  if (wheeledBombs.length > 0) {
    summaryParts.push(
      `🔥 Bombe(s) ayant fait le tour : ${wheeledBombs.map((b) => b.name).join(", ")}.`,
    );
  }

  if (openColors.length > 0) {
    summaryParts.push(`Couleur(s) ouverte(s) : ${openColors.join(", ")}.`);
  }

  if (contestedColors.length > 0) {
    summaryParts.push(`Couleur(s) contestée(s) : ${contestedColors.join(", ")}.`);
  }

  summaryParts.push(
    `${String(cardsTakenByTable.length)} carte(s) prise(s) par la table, ${String(cardsWheeled.length)} revenue(s).`,
  );

  return {
    originalPickNumber,
    currentPickNumber,
    pickedCardAtInitialPass,
    cardsWheeled,
    cardsTakenByTable,
    takenColorCounts,
    wheeledColorCounts,
    openColors,
    contestedColors,
    wheeledBombs,
    signalSummary: summaryParts.join(" "),
  };
}
