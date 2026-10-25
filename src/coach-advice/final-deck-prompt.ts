import type { CardEvaluationInput } from "../domain/coaching/types.ts";

export interface FinalDeckCoachPromptInput {
  readonly cubeKey: string;
  readonly snapshotId: string;
  readonly pool: readonly CardEvaluationInput[];
}

export function buildFinalDeckCoachPrompt(input: FinalDeckCoachPromptInput): {
  readonly system: string;
  readonly user: string;
} {
  const system = `Mission final-deck-coach@1.
Tu es le Coach de construction finale de DraftMaster. Construis la liste la plus jouable possible a partir du seul pool fourni.

Contraintes absolues :
- Rends uniquement un objet JSON valide, sans Markdown ni commentaire autour.
- Le deck doit contenir exactement 40 cartes : IDs d'instances draftees plus terrains basiques.
- N'invente aucun ID et ne depasse jamais la multiplicite d'une instance recue.
- Ne force pas une repartition fixe sorts/terrains. Vise normalement 16 a 18 terrains au total, en comptant terrains non basiques et MDFC retenus, et explique tout ecart.
- Evalue le plan principal, les couleurs, les splashs, les paquets synergiques complets, la courbe, l'interaction et la mana permettant de lancer les cartes au tour utile.
- Explique avec des cartes concretes au moins deux inclusions et deux exclusions structurantes lorsque le pool le permet.
- Les cinq axes et la legalite seront recalcules localement : ne fournis aucun score opaque.

Schema JSON exact :
{
  "maindeckCardInstanceIds": ["instance-id"],
  "basicLands": { "Plains": 0, "Island": 0, "Swamp": 0, "Mountain": 0, "Forest": 0 },
  "strategy": "plan de jeu concret",
  "primaryColors": ["W", "U", "B", "R", "G"],
  "splashColors": [],
  "includedReasons": [{ "cardInstanceIds": ["instance-id"], "reason": "cause et effet" }],
  "excludedReasons": [{ "cardInstanceIds": ["instance-id"], "reason": "cause et effet" }],
  "manaRationale": "sources, fixeurs et contraintes de couleurs",
  "landCountRationale": "raison du nombre total de terrains"
}`;

  const payload = {
    promptVersion: "final-deck-coach@1",
    cubeKey: input.cubeKey,
    snapshotId: input.snapshotId,
    pool: input.pool.map((card) => ({
      cardInstanceId: card.id,
      name: card.name,
      manaCost: card.manaCost ?? "",
      cmc: card.cmc ?? 0,
      typeLine: card.typeLine ?? "",
      oracleText: card.oracleText ?? "",
      colors: card.colors,
      producesColors: card.producesColors ?? [],
      staticScore: card.staticScore,
      roles: card.roles ?? [],
      isLand: card.isLand ?? false,
    })),
  };

  return { system, user: JSON.stringify(payload) };
}
