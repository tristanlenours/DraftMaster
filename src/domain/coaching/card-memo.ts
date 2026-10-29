import type { CardEvaluationInput } from "./types.ts";

/**
 * Caches a pure per-card analysis by card object. Deck searches evaluate the same cards many
 * times; their oracle-text parsing never depends on the surrounding deck.
 */
export function memoizeByCard<T>(
  compute: (card: CardEvaluationInput) => T,
): (card: CardEvaluationInput) => T {
  const cache = new WeakMap<CardEvaluationInput, T>();
  return (card) => {
    if (cache.has(card)) return cache.get(card) as T;
    const value = compute(card);
    cache.set(card, value);
    return value;
  };
}
