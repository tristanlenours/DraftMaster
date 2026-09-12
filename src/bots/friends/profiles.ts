import type { MtGColor } from "../../domain/coaching/types.ts";

export type FriendSkillLevel = "elite" | "medium" | "ambitious";

export interface FriendStyleBiases {
  readonly cheapInteractionBonus?: number; // Nico: counterspells, removals CMC <= 2
  readonly valueEngineBonus?: number; // Cédric: card advantage, 2-for-1s
  readonly lowCurveBonus?: number; // Cédric: focus on CMC 1-3
  readonly weirdEngineBonus?: number; // Hugues: artifacts, sagas, build-around combo
  readonly legendaryBombBonus?: number; // Papayou: high static legendaries
  readonly highCmcBonus?: number; // Ivan: big creatures CMC >= 5
  readonly greenRampBonus?: number; // Ivan: mana dorks & ramp
  readonly boardWipeBonus?: number; // Ivan: Wraths, destroy all, sweepers
  readonly multiColorFixingBonus?: number; // Ivan: Chromatic Lantern, multi-color rocks
  readonly tribalSynergyBonus?: number; // Titou: creature types & lords
  readonly reanimationBonus?: number; // Théo: reanimation spells, big reanimation targets & discard enablers
  readonly colorDiscipline?: number; // Multiplier on commitment (0.7 for adventurous, 1.2 for strict)
}

export interface FriendProfile {
  readonly id: string;
  readonly name: string;
  readonly botName?: string;
  readonly title: string;
  readonly quote: string;
  readonly level: FriendSkillLevel;
  readonly temperature: number; // Softmax temperature (0.8 = spike, 2.0 = rouxelette)
  readonly preferredColors?: readonly MtGColor[];
  readonly biases: Readonly<FriendStyleBiases>;
}

export const NICO_PROFILE: Readonly<FriendProfile> = Object.freeze({
  id: "nico",
  name: "Nico",
  botName: "Big Nixos",
  title: "Le Spike Impitoyable",
  quote: "Je prends ce qui gagne. Pas de sentiments en draft.",
  level: "elite",
  temperature: 0.8,
  preferredColors: ["U", "B", "W"] as const,
  biases: {
    cheapInteractionBonus: 3.0,
    lowCurveBonus: 1.5,
    colorDiscipline: 1.25,
  },
});

export const CEDRIC_PROFILE: Readonly<FriendProfile> = Object.freeze({
  id: "cedric",
  name: "Cédric",
  botName: "Jakko",
  title: "Meilleur Joueur de sa Génération",
  quote: "Un play propre, de la value, et la courbe parfaite. La base du beau jeu.",
  level: "elite",
  temperature: 0.9,
  preferredColors: ["U", "R", "W"] as const,
  biases: {
    valueEngineBonus: 3.0,
    lowCurveBonus: 2.5,
    colorDiscipline: 1.15,
  },
});

export const HUGUES_PROFILE: Readonly<FriendProfile> = Object.freeze({
  id: "hugues",
  name: "Hugues",
  botName: "Hugo",
  title: "Turbo Rien / Le Johnny Osé",
  quote: "J'ai vu une combo avec cette saga et ce caillou. Si ça passe, c'est du génie !",
  level: "ambitious",
  temperature: 1.6,
  biases: {
    weirdEngineBonus: 4.0,
    colorDiscipline: 0.75, // Stays open longer, loves wild splashes
  },
});

export const REMI_PROFILE: Readonly<FriendProfile> = Object.freeze({
  id: "remi",
  name: "Rémi",
  botName: "Le Rouxeleur",
  title: "Le Maître des Rouxelettes",
  quote: "Attends, je peux vraiment jouer ça ? C'est légal ? Bon, je prends quand même !",
  level: "medium",
  temperature: 2.0,
  biases: {
    colorDiscipline: 0.8, // Can pivot unexpectedly
  },
});

export const PAPAYOU_PROFILE: Readonly<FriendProfile> = Object.freeze({
  id: "papayou",
  name: "Papayou",
  botName: "LaPapapaie",
  title: "L'Amateur de High-Power & Triathlète",
  quote: "Une bombe légendaire 6/6 qui rase la table ? Donne-moi ça tout de suite !",
  level: "medium",
  temperature: 1.7,
  preferredColors: ["U", "W", "R"] as const,
  biases: {
    legendaryBombBonus: 3.5,
  },
});

export const IVAN_PROFILE: Readonly<FriendProfile> = Object.freeze({
  id: "ivan",
  name: "Ivan",
  botName: "Le Gourmand",
  title: "Le Maître 4-Couleurs Ramp & Wrath (Non-Rouge)",
  quote:
    "J'accélère la mana, une bonne Wrath pour nettoyer la table, et après je pose les monstres. Jamais de rouge !",
  level: "medium",
  temperature: 1.2,
  preferredColors: ["G", "W", "U", "B"] as const,
  biases: {
    highCmcBonus: 4.5,
    greenRampBonus: 3.5,
    boardWipeBonus: 5.0,
    multiColorFixingBonus: 4.5,
    colorDiscipline: 0.75, // Joue volontiers 4 couleurs sans se brider
  },
});

export const TITOU_PROFILE: Readonly<FriendProfile> = Object.freeze({
  id: "titou",
  name: "Titou",
  botName: "TitouBot",
  title: "L'Architecte Tribal & Chromatique",
  quote: "Une tribu bien huilée et un bon seigneur, et la guilde roule sur le format.",
  level: "elite",
  temperature: 1.0,
  biases: {
    tribalSynergyBonus: 3.5,
    colorDiscipline: 1.1,
  },
});

export const THEO_PROFILE: Readonly<FriendProfile> = Object.freeze({
  id: "theo",
  name: "Théo",
  botName: "Le Rockeur",
  title: "Le Virtuose Reanimator & Riffs Rakdos",
  quote:
    "Tu croyais que ma bête était morte ? Monte les amplis à 11, elle revient direct du cimetière !",
  level: "ambitious",
  temperature: 1.2,
  preferredColors: ["B"] as const,
  biases: {
    reanimationBonus: 5.0,
    colorDiscipline: 0.9,
  },
});

export const ALL_FRIEND_PROFILES: readonly Readonly<FriendProfile>[] = Object.freeze([
  NICO_PROFILE,
  CEDRIC_PROFILE,
  HUGUES_PROFILE,
  REMI_PROFILE,
  PAPAYOU_PROFILE,
  IVAN_PROFILE,
  TITOU_PROFILE,
  THEO_PROFILE,
]);
