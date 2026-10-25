import type { CardEvaluationInput } from "../domain/coaching/types.ts";
import type { MasterCatalogCard } from "./types.ts";

/** Catalog facts shared by draft and imported deck evaluation. */
export function toCardEvaluationInput(
  card: Readonly<MasterCatalogCard>,
  instanceId: string,
): CardEvaluationInput {
  const isColorlessManaSource =
    card.colors.length === 0 &&
    !card.isLand &&
    card.producesColors.length > 0 &&
    !/[WUBRG]/i.test(card.manaCost ?? "");
  const colors =
    card.colors.length === 0 &&
    !isColorlessManaSource &&
    (!card.isLand || card.typeLine.includes("//"))
      ? card.colorIdentity
      : card.colors;
  return {
    id: instanceId,
    name: card.name,
    oracleId: card.oracleId,
    staticScore: card.powerScore.score,
    colors,
    cmc: card.cmc,
    types: card.types,
    subtypes: card.subtypes,
    typeLine: card.typeLine,
    isLand: card.isLand,
    producesColors: card.producesColors,
    oracleText: card.oracleText.length > 0 ? card.oracleText : (card.frenchText ?? ""),
    manaCost: card.manaCost,
    roles: card.objectiveAnalysis.roles,
  };
}
