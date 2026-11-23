# Audit — Cube Upgrade Advisor (slot-for-slot swaps), 2026-11-07

## Trigger

A user was offered to replace a two-color card with a mono-color card. Slot-for-slot ("poste pour
poste") swaps must preserve the slot: its color pair, its curve position and its archetype.

## Findings on `cube-upgrade-advisor@3` reports (generated 2026-10-28)

| Cube                     | Swaps | Color count changed | +1 mana | −2 mana | Same card proposed for several slots |
| ------------------------ | ----: | ------------------: | ------: | ------: | ------------------------------------ |
| cedric_cube              |   204 |                  17 |      49 |      21 | 39 cards (Ajani, Nacatl Pariah ×12)  |
| hugues_pauper            |   150 |                  15 |      29 |       8 | 20 cards (Accursed Marauder ×20)     |
| nico_candyshop           |   174 |                  21 |      43 |      17 | 35 cards (Relic of Legends ×11)      |
| titou_arena_peasant_plus |    56 |                  23 |      13 |       4 | 12 cards (Prismatic Vista ×8)        |
| titou_tribal             |   116 |                  23 |      28 |       7 | 25 cards (Gut, True Soul Zealot ×10) |

Root causes in `src/cards/cube-upgrade-advisor.ts`:

1. `areColorsCompatible` explicitly let a multicolor slot be filled by any subset of its colors
   (gold → mono), and a unit test asserted that behavior.
2. Noncreature slots accepted −2 mana; a +1 mana swap needed the same +5 gain as a same-cost swap,
   and its reason text claimed "Même coût de mana".
3. Each slot picked its best candidate independently, so one strong card was proposed for up to 20
   slots: not a slot-for-slot plan.
4. The slot's curated archetypes (`cubeAnalyses[cube].archetypes`) and synergy tags were ignored
   when ranking replacements.

## Guardrails in `cube-upgrade-advisor@4`

- Exact color identity of the slot (gold ↔ same pair only; mono ↔ same color; colorless ↔ colorless).
- At most one mana of difference; required power gain: +5 same cost, +8 for −1 mana, +12 for +1
  mana; a +1 mana swap also takes a −4 ranking penalty and states the trade-off in its reason.
- The candidate must still fit at least one archetype the slot serves; shared archetypes
  (`archetype_match`) and shared synergy tags (`synergy_overlap`) raise its ranking.
- One-to-one assignment: best pairings first, each candidate fills a single slot.

Result after regeneration: 0 color changes, 0 shifts above one mana, every +1 mana swap gains
≥ 12 points, 0 reused suggestions. Swap counts: cedric 150, hugues 39, nico 108, peasant 26,
tribal 56.

## Freshness

- Peer CubeCobra lists refreshed on 2026-11-07: The Pauper Cube ±22, MTGO Vintage ±51, JDGP ±35,
  Vintage archive +22/−1. "Tribal Synergy Cube" (`tribal`) did not change at all: check that it is
  still a maintained, relevant peer for `titou_tribal`.
- The advisor can only propose cards present in the master catalog. Before the import below, 868
  peer-cube cards were absent, including 47 Reality Fracture (FRA, October 2026) cards and recent
  Hobbit, Secrets of Strixhaven and Star Trek cards.
- `card-release-metadata.json` is extracted only from local cube archives, so recency is unknown for
  cards outside the cubes, and the `Elspeth, Storm Slayer` fallback is labelled MH3 2024 whereas the
  card comes from Tarkir: Dragonstorm (2025).

## Import of recent peer-cube cards (same day)

Refresh pipeline, in order:

1. `node scripts/fetch-cubecobra-benchmarks.mjs`: peer plaintext lists, plus a compact extract of
   the peer cubes' CubeCobra card details (`data/benchmarks/cubecobra-peer-card-details.json`:
   Elo, picks, oracle tags, first print year, rarity, Pauper legality). It also completes
   `card-release-metadata.json` for cards outside our cubes (855 added; lowest known rarity, so a
   Pauper-legal card counts as common) and fixes the Elspeth, Storm Slayer fallback (TDM 2025).
2. `node scripts/import-peer-cube-candidates.mjs --since 2024 --apply`: adds a card document for
   every peer-cube card first printed since 2024 that is missing from the catalog (246 cards).
   Card facts come from Scryfall; the power score comes from the frozen Elo → power isotonic
   calibration (`cubecobra-calibration-v1.json`, cross-validated MAE 9.4), with confidence 0.4 and
   `fallback` when the card has fewer than 1,000 CubeCobra picks. Roles come from oracle tags.
   `presentInCubes` stays empty: these are candidates, not cube cards.
3. `npm run data:sync`: applies Untapped v2 scores when they exist (67 of the imported cards),
   appends the new cards to `power-ranking-v1.json` (methods `untapped_reference_v2`,
   `peer_cubecobra_elo_isotonic`, `peer_cubecobra_elo_isotonic_low_sample`) and regenerates the
   suggestion reports. The advisor uses the peer oracle tags as synergy tags for cards analysed in
   none of our cubes, so recent cards are not handicapped on `synergy_overlap`.

`npm run power:rebuild:apply` was not used: on the current data it rewrites 1,640 existing items
(it predates the Untapped v2 reference), which would move every cube's tiers.

Two more guardrail fixes surfaced while reviewing the new swaps: "exile target creature you
control" (blink) is no longer read as removal, and when only one card of a pair has a recognised
Oracle function, their curated roles must align (Ephemerate is no longer replaced by Oust).

Final reports: cedric 139 swaps (21 to new cards), hugues 33 (8), nico 98 (24), peasant 19 (1),
tribal 48 (9); every maybeboard now features recent cards (e.g. Galvanic Discharge, Quantum
Riddler, Sage of the Skies, Cori-Steel Cutter). 618 older peer-cube cards remain outside the catalog
(`artifacts/cube-upgrade-watchlist-2026-11-07.json`), mostly vintage staples.

## Value-driven maybeboard in `cube-upgrade-advisor@5` (2026-11-15)

The maybeboard no longer fills a fixed list of 30 cards. It lists every card with a real added
value, and only those:

- a direct replacement is kept when it gains at least 12 points on the slot it takes;
- a card without an identified slot is kept only when a peer cube already plays it and its score
  would place it in the cube's relative tier A or better;
- a ceiling of 50 keeps the largest cubes reviewable (best ranking scores first).

Two rules-function gaps were closed on the way: a `-X/-X` shrink on a target creature is removal
(Tragic Slip is no longer replaced by Imperial Seal or Duress), and "that player discards" is
discard.

Maybeboard sizes after regeneration: tribal 39 (34 replacements, 5 peer-cube cards), hugues 25,
peasant 14, cedric 50 and nico 50 (both capped). The slot-for-slot `upgrades` map is unchanged
apart from the two rules-function fixes.

## Cross-cube awareness in `cube-upgrade-advisor@7` (2026-11-21)

After Nico's update, 25 of Titou Tribal's 41 swaps came from Nico's cube, but mostly as vintage
combo pieces (Lion's Eye Diamond, Brain Freeze, Underworld Breach, Wheel of Fortune), while Nico's
genuine tribal cards (Palace Jailer, Elite Spellbinder, White Plume Adventurer, Vivi Ornitier)
never surfaced. Changes:

- **Tribe reading.** A card's tribes are its own creature types plus every tribe its rules text
  names, including irregular plurals ("Elves", "Wolves"); reminder text is ignored (the party
  reminder no longer makes a Rogue a Cleric).
- **Combo pieces.** A card that our curated cubes play only in `combo` archetypes, or tag `combo`,
  `engine:storm` or `alternate-win-condition`, is not proposed to a cube without a combo archetype.
  Exceptions: a peer benchmark of the cube plays it, or in a tribal cube it belongs to one of the
  cube's tribes. The sync script passes the combo archetype ids of every cube
  (`peerComboArchetypeIds`). This applies to every cube: Brain Freeze and Reanimate also left the
  Peasant suggestions.
- **Tribal discoveries.** In Titou Tribal, a card without a slot that belongs to one of the
  cube's tribes, fits that archetype's colors and reaches tier A is kept when another of our
  curated cubes plays it, even without a peer benchmark. It earns `tribal_coherence` (+20), so it
  ranks ahead of a generic peer-cube staple.
- **Payoff label.** Sharing an archetype's colors no longer makes a card an `archetype_payoff`:
  the label needs a tribe of the archetype or a curated `synergy_payoff`/`synergy_enabler` role
  (this relabels some cards `staple` in every cube, without changing their rank).

Titou Tribal after regeneration: 39 swaps, maybeboard 50 (capped; Celestial Colonnade, Creeping
Tar Pit and Urza fall below the cap), with 19 tribal discoveries: 13 from Nico's cube, the rest
from Cédric's and Titou's Peasant cubes. Nico, Cédric and Hugues keep the same cards.

## Protected archetype pieces in `cube-upgrade-advisor@8` (2026-11-23)

The benchmark against Nico's update showed that the advisor aims at the lowest power score of a
color, and the score undervalues narrow archetype pieces. Key pieces were already never targeted
since `@6`. Changes:

- **Support pieces.** A card listed in an archetype's `supportCards`, or curated with
  `metaRole: "support"`, is cut only for a gain of at least 15 points (instead of 5 to 12 by
  curve shift). Seething Song, Frantic Search, Goblin Guide, Monastery Swiftspear or Imperial
  Recruiter are no longer proposed for small gains.
- **Maybeboard.** Upgrades handed over to `generateCubeMaybeboard` are filtered again, so an
  entry can never list a key piece in `replacesCards`.

After regeneration, no upgrade or maybeboard entry of any cube targets a key piece, and every
remaining support cut gains at least 15 points. Swaps: Nico 84 → 76 (support cuts 15 → 4),
Cédric 131 → 120, Titou Tribal 42 → 38, Hugues 36 → 32, Peasant 19 → 14.

## Known limits

- The isotonic calibration saturates near 37 points, so a recent bomb is under-rated until
  Untapped or the next power rebuild scores it natively.
- Imported cards have no French name yet (`scripts/fetch-french-cards.mjs` not run).
- "Tribal Synergy Cube" did not change since September; its relevance as the peer of
  `titou_tribal` should be checked.
