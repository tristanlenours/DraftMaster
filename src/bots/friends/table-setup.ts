import type { PickPolicy } from "../pick-policy.ts";
import type { CardMetadataResolver } from "../coached-bot-policy.ts";
import type { PackEvaluationContext } from "../../domain/coaching/types.ts";
import { createFriendBotPolicy } from "./friend-bot-policy.ts";
import {
  ALL_FRIEND_PROFILES,
  CEDRIC_PROFILE,
  HUGUES_PROFILE,
  IVAN_PROFILE,
  NICO_PROFILE,
  PAPAYOU_PROFILE,
  REMI_PROFILE,
  THEO_PROFILE,
  TITOU_PROFILE,
  type FriendProfile,
} from "./profiles.ts";

export interface FriendTableSetupOptions {
  readonly resolveCard?: CardMetadataResolver;
  readonly evaluationContext?: Pick<PackEvaluationContext, "cubeKey" | "catalog" | "cubeMeta">;
  readonly seatAssignments?: readonly (FriendProfile | null)[];
}

/**
 * Standard default seat configuration matching the friends' table dynamics:
 * - Seat 0: Human Player (Tristan / Titou)
 * - Seat 1 (left): Nico (Spike)
 * - Seat 2: Rémi (Rouxelettes)
 * - Seat 3: Hugues (Johnny osé)
 * - Seat 4 (opposite): Ivan (Timmy Big Mana)
 * - Seat 5: Papayou (High-Power Legendaries)
 * - Seat 6: Cédric (Meilleur joueur de sa génération)
 * - Seat 7 (right / passing pack 1 & 3): Titou Bot (tribal/chromatic expert)
 */
export const DEFAULT_FRIEND_SEAT_PROFILES: readonly (FriendProfile | null)[] = Object.freeze([
  null, // Seat 0 is the controlled human player
  NICO_PROFILE, // Seat 1
  REMI_PROFILE, // Seat 2
  HUGUES_PROFILE, // Seat 3
  IVAN_PROFILE, // Seat 4
  PAPAYOU_PROFILE, // Seat 5
  CEDRIC_PROFILE, // Seat 6
  TITOU_PROFILE, // Seat 7
]);

export interface TableSeatOptions {
  readonly seed?: number | undefined;
  readonly randomize?: boolean | undefined;
}

export function shuffleProfiles<T>(items: readonly T[], seed?: number): T[] {
  const copy = [...items];
  if (seed !== undefined && Number.isInteger(seed)) {
    let s = (seed ^ 0x9e3779b9) >>> 0;
    for (let i = copy.length - 1; i > 0; i--) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      const j = s % (i + 1);
      const itemI = copy[i];
      const itemJ = copy[j];
      if (itemI !== undefined && itemJ !== undefined) {
        copy[i] = itemJ;
        copy[j] = itemI;
      }
    }
  } else {
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const itemI = copy[i];
      const itemJ = copy[j];
      if (itemI !== undefined && itemJ !== undefined) {
        copy[i] = itemJ;
        copy[j] = itemI;
      }
    }
  }
  return copy;
}

/**
 * Builds the 8 seat assignments (Seat 0: human, Seats 1-7: 7 distinct bots from ALL_FRIEND_PROFILES).
 * If humanIdentifier is provided (e.g. "titou", "tristan", "theo", etc.), the matching magicien
 * is assigned to Seat 0 and excluded from the bot pool, ensuring all 8 Magiciens are represented without duplicates.
 * If options.randomize is true, the 7 bots are shuffled randomly (or deterministically if options.seed is provided).
 */
export function buildTableSeatAssignments(
  humanIdentifier?: string,
  options?: TableSeatOptions,
): readonly (FriendProfile | null)[] {
  const norm = (humanIdentifier ?? "").toLowerCase().trim();
  const isTitou = norm === "titou" || norm === "tristan" || norm === "";

  let bots: FriendProfile[];
  if (isTitou) {
    bots = [
      NICO_PROFILE,
      REMI_PROFILE,
      HUGUES_PROFILE,
      IVAN_PROFILE,
      PAPAYOU_PROFILE,
      CEDRIC_PROFILE,
      THEO_PROFILE,
    ];
  } else {
    const matching = ALL_FRIEND_PROFILES.find(
      (p) => p.id === norm || p.name.toLowerCase() === norm,
    );
    if (matching) {
      bots = ALL_FRIEND_PROFILES.filter((p) => p.id !== matching.id);
    } else {
      bots = [
        NICO_PROFILE,
        REMI_PROFILE,
        HUGUES_PROFILE,
        IVAN_PROFILE,
        PAPAYOU_PROFILE,
        CEDRIC_PROFILE,
        THEO_PROFILE,
      ];
    }
  }

  const selectedBots = bots.slice(0, 7);
  const orderedBots = options?.randomize
    ? shuffleProfiles(selectedBots, options.seed)
    : selectedBots;

  return [null, ...orderedBots];
}

/**
 * Builds the 8 PickPolicy instances for an 8-player draft table populated by friends.
 */
export function createFriendTablePolicies(
  options: FriendTableSetupOptions = {},
): readonly (PickPolicy | null)[] {
  const assignments = options.seatAssignments ?? DEFAULT_FRIEND_SEAT_PROFILES;
  const resolveCard = options.resolveCard;
  const evaluationContext = options.evaluationContext;

  return assignments.map((profile) => {
    if (!profile) {
      return null; // Controlled by human player
    }
    return createFriendBotPolicy({
      profile,
      ...(resolveCard ? { resolveCard } : {}),
      ...(evaluationContext ? { evaluationContext } : {}),
    });
  });
}
