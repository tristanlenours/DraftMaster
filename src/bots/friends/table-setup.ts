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

/**
 * Builds the 8 seat assignments (Seat 0: human, Seats 1-7: 7 distinct bots from ALL_FRIEND_PROFILES).
 * If humanIdentifier is provided (e.g. "titou", "tristan", "theo", etc.), the matching magicien
 * is assigned to Seat 0 and excluded from the bot pool, ensuring all 8 Magiciens are represented without duplicates.
 */
export function buildTableSeatAssignments(
  humanIdentifier?: string,
): readonly (FriendProfile | null)[] {
  const norm = (humanIdentifier ?? "").toLowerCase().trim();
  const isTitou = norm === "titou" || norm === "tristan" || norm === "";

  if (isTitou) {
    return [
      null,
      NICO_PROFILE,
      REMI_PROFILE,
      HUGUES_PROFILE,
      IVAN_PROFILE,
      PAPAYOU_PROFILE,
      CEDRIC_PROFILE,
      THEO_PROFILE,
    ];
  }

  const matching = ALL_FRIEND_PROFILES.find((p) => p.id === norm || p.name.toLowerCase() === norm);
  if (matching) {
    const bots = ALL_FRIEND_PROFILES.filter((p) => p.id !== matching.id);
    return [null, ...bots.slice(0, 7)];
  }

  return [
    null,
    NICO_PROFILE,
    REMI_PROFILE,
    HUGUES_PROFILE,
    IVAN_PROFILE,
    PAPAYOU_PROFILE,
    CEDRIC_PROFILE,
    THEO_PROFILE,
  ];
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
