import {
  evaluatePack,
  type CardEvaluationInput,
  type PackEvaluationContext,
} from "../src/domain/coaching/index.ts";

const priorPoolEsper: readonly CardEvaluationInput[] = [
  { id: "98032", name: "Reanimate", staticScore: 45, colors: ["B"], cmc: 1 },
  { id: "90709", name: "Mana Drain", staticScore: 46, colors: ["U"], cmc: 2 },
  { id: "67518", name: "Teferi, Hero of Dominaria", staticScore: 45, colors: ["W", "U"], cmc: 5 },
];

const offeredPack: readonly CardEvaluationInput[] = [
  { id: "90887", name: "Ocelot Pride", staticScore: 48, colors: ["W"], cmc: 1 },
  { id: "92359", name: "Floodfarm Verge", staticScore: 42, colors: ["W", "U"], isLand: true, producesColors: ["W", "U"] },
  { id: "86146", name: "Collective Brutality", staticScore: 26, colors: ["B"], cmc: 2 },
  { id: "84315", name: "Faerie Mastermind", staticScore: 24, colors: ["U"], cmc: 2 },
  { id: "47035", name: "Noble Hierarch", staticScore: 42, colors: ["G"], cmc: 1 },
  { id: "91019", name: "Six", staticScore: 40, colors: ["G"], cmc: 3 },
  { id: "71320", name: "Nova Hellkite", staticScore: 21, colors: ["R"], cmc: 4 },
  { id: "92230", name: "Overlord of the Boilerbilges", staticScore: 16, colors: ["R"], cmc: 6 },
  { id: "80411", name: "Xander's Lounge", staticScore: 23, colors: ["U", "B", "R"], isLand: true, producesColors: ["U", "B", "R"] },
  { id: "96722", name: "Savai Triome", staticScore: 21, colors: ["W", "B", "R"], isLand: true, producesColors: ["W", "B", "R"] },
  { id: "90941", name: "Etherium Pteramander", staticScore: 6, colors: ["U"], cmc: 1 },
];

const context: PackEvaluationContext = {
  packNumber: 1,
  pickNumber: 5,
  offeredCards: offeredPack,
  priorPool: priorPoolEsper,
};

const results = evaluatePack(context);

console.log("==========================================================================================");
console.log("       DRAFTMASTER - ASSISTANT DE COACHING PÉDAGOGIQUE (PACK 1, PICK 5)");
console.log("==========================================================================================");
console.log("Pool actuel : Reanimate (B), Mana Drain (U), Teferi (W/U) -> Couleurs : Esper (W/U/B)\n");

results.forEach((card, index) => {
  const rank = `#${index + 1}`.padEnd(4);
  const name = card.name.padEnd(30);
  const scores = `Score: ${card.dynamicScore.toFixed(1)} (Brute: ${card.staticScore})`.padEnd(26);
  console.log(`${rank} ${name} ${scores}`);
  console.log(`     💡 ${card.explanation}`);
  console.log("------------------------------------------------------------------------------------------");
});
