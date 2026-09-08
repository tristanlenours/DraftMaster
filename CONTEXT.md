# DraftMaster & LMCDEU Domain

Canonical vocabulary for DraftMaster and the LMCDEU (*Les Magiciens : Cube Digital Extended Universe*) product and drafting domain.

## Product Scope

**LMCDEU**:
*Les Magiciens : Cube Digital Extended Universe*. The official universe umbrella encompassing the community cubes (Titou Tribal, Nico's Candyshop, Hugues Pauper), the friend bots table, and the interactive Limited Grades matrix.

**Solo Draft Coach**:
The first product milestone: one player completes a 45-pick cube draft against bots, understands recommendations, builds a deck, and records scores and trophies.
_Avoid_: Solo Challenge, solo mode, draft mode

**Coaching**:
Pick-time assistance for players who know Magic and drafting but need guidance about unfamiliar cards, relative power, and the cube metagame. A session that uses Coaching is ineligible for the Wall of Records and trophies.
_Avoid_: Draft Helper, hints

**Draft accompagné**:
A Solo Draft Coach session with Coaching enabled. Its result remains in personal history with an assisted marker but cannot unlock trophies or enter the Wall of Records.
_Avoid_: Training draft, beginner draft, Assisted Draft

**Draft homologué**:
A Solo Draft Coach session completed without Coaching. It is eligible for trophies and the Wall of Records.
_Avoid_: Expert draft, competitive draft, Certified Draft

**Homologation**:
The eligibility state of a Draft homologué. Enabling Coaching at any point irreversibly removes Homologation and converts the session into a Draft accompagné.
_Avoid_: Ranked status, validation, Certification

**Résultat verrouillé**:
The immutable record created after all picks and unaided deck construction are complete. Homologation rewards are calculated before any retrospective assistance becomes available.
_Avoid_: Saved deck, final screen

**Analyse rétrospective**:
Post-result Coaching that explains picks, color or archetype development, missed cards, and the final deck. It is available only after the Résultat verrouillé and does not affect Homologation.
_Avoid_: Live Coaching, deckbuilding help

**Score de deck**:
The explainable evaluation of a Résultat verrouillé across five Axes de deck. For the first milestone, it is the only score used by the Wall of Records.
_Avoid_: Draft score, match score, global score

**Axes de deck**:
The five dimensions of a Score de deck: Puissance, Synergie, Courbe, Mana, and Interaction.
_Avoid_: Kiviat metrics, performance stats

## Draft Sessions

**Snapshot de cube**:
An immutable, versioned copy of a cube list. Every Session de draft is tied to exactly one snapshot so its card pool remains reproducible.
_Avoid_: Live cube, current cube list

**Session de draft**:
One identified execution of a draft using a fixed Snapshot de cube, seed, rules version, and participant configuration.
_Avoid_: Game, run

**Tour de draft**:
The step in which every active seat chooses one card from its current booster before the remaining cards pass together.
_Avoid_: Player turn, pick when referring to all seats

**Journal de draft**:
The self-contained, immutable record of a Session de draft, including its Snapshot de cube and ordered facts, sufficient to explain and reconstruct its functional state without an external source.
_Avoid_: Debug log, activity log

**Relecture de draft**:
Reconstruction of a Session de draft from its Journal de draft using recorded choices, without asking participants to choose again.
_Avoid_: Re-simulation when referring to recorded choices, session resume

**Re-simulation de draft**:
A new execution using the same functional inputs and versions to check that distribution and participant decisions are reproducible.
_Avoid_: Relecture de draft when referring to recalculated choices
