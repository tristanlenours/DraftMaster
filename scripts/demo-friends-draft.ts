import {
  createFriendTablePolicies,
  DEFAULT_FRIEND_SEAT_PROFILES,
} from "../src/bots/friends/index.ts";
import type { CardEvaluationInput } from "../src/domain/coaching/types.ts";
import { deriveStreamSeed, getPolicyStreamName, type SeatNumber } from "../src/random/seeded-random.ts";

const cubePoolCards: readonly CardEvaluationInput[] = [
  { id: "black-lotus", name: "Black Lotus", staticScore: 53, colors: [], cmc: 0 },
  { id: "ancestral-recall", name: "Ancestral Recall", staticScore: 53, colors: ["U"], cmc: 1 },
  { id: "time-walk", name: "Time Walk", staticScore: 53, colors: ["U"], cmc: 2 },
  { id: "swords-to-plowshares", name: "Swords to Plowshares", staticScore: 48, colors: ["W"], cmc: 1, types: ["Instant"] },
  { id: "ocelot-pride", name: "Ocelot Pride", staticScore: 48, colors: ["W"], cmc: 1, types: ["Creature"] },
  { id: "phlage", name: "Phlage, Titan of Fire's Fury", staticScore: 50, colors: ["R", "W"], cmc: 3, types: ["Creature", "Legendary"] },
  { id: "mana-drain", name: "Mana Drain", staticScore: 46, colors: ["U"], cmc: 2, types: ["Instant"] },
  { id: "craterhoof", name: "Craterhoof Behemoth", staticScore: 44, colors: ["G"], cmc: 8, types: ["Creature"] },
  { id: "carnage-tyrant", name: "Carnage Tyrant", staticScore: 38, colors: ["G"], cmc: 6, types: ["Creature"] },
  { id: "urzas-saga", name: "Urza's Saga", staticScore: 44, colors: [], cmc: 0, types: ["Enchantment", "Land", "Saga"], isLand: true },
  { id: "the-one-ring", name: "The One Ring", staticScore: 46, colors: [], cmc: 4, types: ["Artifact", "Legendary"] },
  { id: "reanimate", name: "Reanimate", staticScore: 45, colors: ["B"], cmc: 1, types: ["Sorcery"] },
  { id: "psychic-frog", name: "Psychic Frog", staticScore: 49, colors: ["U", "B"], cmc: 2, types: ["Creature"] },
  { id: "floodfarm-verge", name: "Floodfarm Verge", staticScore: 42, colors: ["W", "U"], isLand: true, producesColors: ["W", "U"] },
  { id: "llanowar-elves", name: "Llanowar Elves", staticScore: 41, colors: ["G"], cmc: 1, types: ["Creature"] },
  { id: "sheoldred", name: "Sheoldred, the Apocalypse", staticScore: 45, colors: ["B"], cmc: 4, types: ["Creature", "Legendary"] },
];

const cardsMap = new Map<string, CardEvaluationInput>(cubePoolCards.map((c) => [c.id, c]));
const resolveCard = (id: string) => cardsMap.get(id);

const SEED = 20260904;
const tablePolicies = createFriendTablePolicies({ resolveCard });

console.log("==========================================================================================");
console.log("       DRAFTMASTER - SIMULATION DU TOUR DE TABLE ENTRE AMIS (PACK 1, PICK 1)");
console.log("==========================================================================================\n");

// Boosters distincts pour chaque joueur
const boosterPools: string[][] = [
  ["ocelot-pride", "floodfarm-verge", "swords-to-plowshares", "reanimate"], // Siège 0 (Toi / Tristan)
  ["mana-drain", "swords-to-plowshares", "carnage-tyrant", "phlage"],       // Siège 1 (Nico)
  ["psychic-frog", "carnage-tyrant", "urzas-saga", "sheoldred"],            // Siège 2 (Rémi)
  ["urzas-saga", "the-one-ring", "ocelot-pride", "swords-to-plowshares"],     // Siège 3 (Hugues)
  ["craterhoof", "carnage-tyrant", "mana-drain", "swords-to-plowshares"],   // Siège 4 (Ivan)
  ["sheoldred", "phlage", "swords-to-plowshares", "mana-drain"],            // Siège 5 (Papayou)
  ["psychic-frog", "the-one-ring", "mana-drain", "craterhoof"],             // Siège 6 (Cédric)
  ["phlage", "floodfarm-verge", "reanimate", "llanowar-elves"],             // Siège 7 (Titou Bot)
];

for (let seatId = 0; seatId < 8; seatId++) {
  const profile = DEFAULT_FRIEND_SEAT_PROFILES[seatId];
  const booster = boosterPools[seatId] ?? [];

  if (seatId === 0) {
    console.log("📍 SIÈGE 0 : TRISTAN (VOUS) - JOUEUR HUMAIN (Mode Coaché)");
    console.log("   Booster ouvert : Ocelot Pride, Floodfarm Verge, Swords to Plowshares, Reanimate");
    console.log("   💡 Conseil du Coach : Swords to Plowshares (48) ou Ocelot Pride (48). Swords est le meilleur removal blanc.");
    console.log("------------------------------------------------------------------------------------------");
    continue;
  }

  if (!profile) continue;

  const policy = tablePolicies[seatId];
  if (!policy) continue;

  const streamName = getPolicyStreamName(seatId as SeatNumber);
  const derivedSeed = deriveStreamSeed(SEED, streamName);

  const context = {
    derivedSeed,
    streamName,
    seatId: seatId as SeatNumber,
    packNumber: 1 as const,
    pickNumber: 1,
    currentBooster: booster,
    priorPool: [],
  };

  const choiceResult = policy.choose(context);
  const pickedCardId = choiceResult.ok ? choiceResult.value : "Inconnu";
  const pickedCard = resolveCard(pickedCardId);

  const seatLabel = `📍 SIÈGE ${seatId} : ${profile.name.toUpperCase()} - « ${profile.title} » (Niveau : ${profile.level}, T=${profile.temperature})`;
  console.log(seatLabel);
  console.log(`   🗯️  ${profile.quote}`);
  console.log(`   👉 Choix P1P1 : [ ${pickedCard?.name ?? pickedCardId} ] (Score brute : ${pickedCard?.staticScore ?? "?"})`);
  console.log("------------------------------------------------------------------------------------------");
}
