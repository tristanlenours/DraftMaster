import type { CardEvaluationInput, InteractionCoverage } from "./types.ts";

export const INTERACTION_COVERAGE_ORDER: readonly InteractionCoverage[] = [
  "créatures",
  "permanents",
  "pile",
  "main",
  "cimetières",
  "sweeper",
];

// Removal verbs aimed at opposing objects. Protection, pump, counters and attachments that only
// "target creature you control", reanimation of creature cards and sacrifice costs are not
// interaction.
const TARGET = String.raw`(?:up to (?:one|two|three) |any number of )?(?:another |other )?target (?:[\w-]+,? )*?`;
const MINUS = String.raw`[-−](?:\d|x)`;
const NOT_OWN = String.raw`(?! cards?)(?! spells?)(?! you control)`;

const COVERAGE_PATTERNS: Readonly<Record<InteractionCoverage, readonly RegExp[]>> = {
  créatures: [
    new RegExp(String.raw`(?:destroy|exile) ${TARGET}creatures?${NOT_OWN}`),
    new RegExp(
      String.raw`deals? (?:x|\d+|that much) damage to (?:any target|${TARGET}creatures?(?! you control))`,
    ),
    /damage equal to [^.]* to (?:any target|target creature)/,
    /damage divided as you choose among/,
    /fights? (?:up to one )?(?:another )?target creature/,
    new RegExp(
      String.raw`target creature (?:an opponent controls |you don't control )?gets? ${MINUS}`,
    ),
    new RegExp(String.raw`${MINUS}/${MINUS} counters? on ${TARGET}creature`),
    new RegExp(
      String.raw`(?:return|put) ${TARGET}creatures?(?: or [\w-]+)?${NOT_OWN} (?:to|on top of|into|on the bottom of) (?:its|their) owners?'s?`,
    ),
    /enchanted creature can't attack or block/,
    /tap target creature[^.]*\. (?:it|that creature) doesn't untap/,
    /target (?:artifact or )?creature[^.]* loses all abilities/,
    /(?:target player|target opponent|each opponent|each player|that player) sacrifices? (?:a|an|one|two|three|x|that many) (?:[\w-]+ )?creatures?/,
    /players[^.]*sacrifice creatures/,
    /(?:gain|exchange) control of [^.]*target creature/,
    new RegExp(
      String.raw`(?:destroy|exile) all (?:[\w-]+ )*?creatures|all (?:other )?creatures get ${MINUS}`,
    ),
    /damage to each (?:other )?(?:[\w-]+ )*?creature(?! you control)/,
  ],
  permanents: [
    new RegExp(
      String.raw`(?:destroy|exile) ${TARGET}(?:artifact|enchantment|planeswalker|permanent)s?${NOT_OWN}`,
    ),
    new RegExp(
      String.raw`(?:return|put) ${TARGET}(?:artifact|enchantment|planeswalker|permanent)s?(?: or [\w-]+)?${NOT_OWN} (?:to|on top of|into|on the bottom of) (?:its|their) owners?'s?`,
    ),
    /(?:return|put) (?:another )?target (?:nonland )?permanent/,
    /(?:gain|exchange) control of [^.]*target (?:[\w-]+,? )*?(?:artifact|enchantment|planeswalker|permanent)/,
  ],
  pile: [
    /counter target|return target spell/,
    /target (?:[\w-]+ )*?spell[^.]*\. its owner puts it/,
  ],
  main: [
    /target player[^.]*discard|opponent[^.]*discard|players discard|reveals? (?:their|his|her) hand|look at target opponent's hand/,
    /target (?:opponent|player) or planeswalker\. that player[^.]*discards/,
  ],
  cimetières: [
    /exile (?:up to (?:one|two|three) )?target (?:[\w-]+ )*?cards? from (?:a|a single|target player's) graveyard/,
    /exile (?:target player's|each opponent's|all) graveyards?|exile all cards from (?:all graveyards|target player's graveyard)/,
  ],
  sweeper: [
    /(?:destroy|exile) all (?:[\w-]+ )*?(?:creatures|permanents|artifacts|enchantments|planeswalkers)/,
    new RegExp(
      String.raw`all (?:other )?creatures get ${MINUS}|creatures your opponents control get ${MINUS}`,
    ),
    /(?:put|return) all (?:[\w-]+ )*?creatures/,
    /damage to each (?:other )?(?:[\w-]+ )*?creature(?! you control)/,
    /players[^.]*sacrifice creatures/,
  ],
};

/** Shared interaction classifier for the radar audit and archetype detection. */
export function classifyInteraction(card: CardEvaluationInput): readonly InteractionCoverage[] {
  const text = (card.oracleText ?? "").replace(/<[^>]+>/gu, "").toLowerCase();
  if (text.length === 0) return [];
  return INTERACTION_COVERAGE_ORDER.filter((category) =>
    COVERAGE_PATTERNS[category].some((pattern) => pattern.test(text)),
  );
}

export function isInteractionCard(card: CardEvaluationInput): boolean {
  return classifyInteraction(card).length > 0;
}
