# DraftMaster & LMCDEU Domain

Canonical vocabulary for DraftMaster and the LMCDEU (_Les Magiciens : Cube Digital Extended Universe_) product and drafting domain.

## Product Scope

**LMCDEU**:
_Les Magiciens : Cube Digital Extended Universe_. The official universe umbrella encompassing the community cubes (Titou Tribal, Nico's Candyshop, Hugues Pauper), the friend bots table, and the interactive Limited Grades matrix.

**Solo Draft Coach**:
The first product milestone: one player completes a 45-pick cube draft against bots, understands recommendations, builds a deck, and records scores and trophies.
_Avoid_: Solo Challenge, solo mode, draft mode

**Draft multijoueur**:
Une Session de draft amicale a huit sieges dans laquelle deux a huit joueurs humains choisissent leurs cartes sans limite de temps, les sieges restants etant occupes par des bots, puis construisent chacun leur deck.
_Avoid_: Draft multi, Multiplayer Draft, Draft entre amis

**Salon de draft**:
L'espace d'attente global unique d'un Draft multijoueur dans lequel les participants se rassemblent et confirment qu'ils sont prets avant le demarrage commun.
_Avoid_: Lobby, file d'attente, salle

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

**Ligue de cubes**:
A named family of cubes whose drafted decks share comparable power expectations and Tier de deck calibration. Cubes in the same league may have different card lists and archetypes; cubes in different leagues are not tier-comparable.
_Avoid_: Cube category, format, power tier

**Tier de deck**:
The ordinal evaluation of a deck as S, A, B, C, or D relative to its Ligue de cubes. Decks from different cubes are tier-comparable when their snapshots belong to the same league; the tier does not redefine the intrinsic power evaluation of individual cards.
_Avoid_: Universal deck grade, card tier

**Deck témoin**:
An expert-reviewed final deck tied to one Snapshot de cube and its Ligue de cubes, with an expected Tier de deck and evidence describing its build, strengths, weaknesses, and relevant draft context. It calibrates and tests deck evaluation; it is not training data by default.
_Avoid_: Golden deck, benchmark deck

**Corpus témoin de ligue**:
A versioned collection of Decks témoins from one or more cubes in the same Ligue de cubes and, when available, their source Journaux de draft. It preserves each cube and snapshot provenance while providing shared expected outcomes for regression and model comparison.
_Avoid_: Golden dataset, generic fixture folder

**Affinité d'archétype**:
The cube-specific association between a card and a supported game plan. A card may have several affinities, but raw power alone never creates one.
_Avoid_: Card archetype when referring to a universal property of the card

**Rôle d'archétype**:
The function a card serves inside one Affinité d'archétype. A Carte clé is a build-around, major payoff, or combo piece worth three Synergy points; a Carte support is an enabler, tribal body, bridge, or required resource worth one point.
_Avoid_: Objective card role, tier, power role

## Draft Sessions

**Snapshot de cube**:
An immutable, versioned copy of a cube list. Every Session de draft is tied to exactly one snapshot so its card pool remains reproducible.
_Avoid_: Live cube, current cube list

**Session de draft**:
One identified execution of a draft using a fixed Snapshot de cube, seed, rules version, and participant configuration.
_Avoid_: Game, run

**Joueur pret**:
Un participant present dans un Salon de draft qui a confirme vouloir commencer avec la composition de table actuellement affichee. Toute modification de cette composition annule cette confirmation.
_Avoid_: Joueur demarre, joueur valide

**Acces de reprise**:
Le secret personnel remis a un participant humain pour retrouver son siege et son etat prive sans compte DraftMaster apres une deconnexion ou sur un autre appareil.
_Avoid_: Pseudo de connexion, compte joueur, mot de passe du salon

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

## Tournament Management

**Tournoi de cube**:
Une compétition organisée autour d'un Snapshot de cube verrouillé, d'un ensemble de Participants de tournoi, de Rondes de tournoi et d'un classement historisé.
_Avoid_: Session de draft, ligue, événement

**Organisateur de tournoi**:
La personne qui configure un Tournoi de cube, inscrit ses participants, lance ses rondes et confirme ou corrige ses Résultats de match.
_Avoid_: Admin, arbitre when no rules adjudication is implied

**Participant de tournoi**:
Un joueur inscrit à un Tournoi de cube avec un nom affiché et un Deck déclaré.
_Avoid_: siège, compte, utilisateur

**Deck déclaré**:
L'identité publique du deck joué par un Participant de tournoi, composée au minimum de son nom d'archétype et, facultativement, de Cartes clés de deck.
_Avoid_: Liste finale, pool, proposition du Coach

**Carte clé de deck**:
Une carte du Snapshot de cube que l'Organisateur de tournoi associe au Deck déclaré pour en décrire les pièces marquantes ; elle n'affecte ni les appariements ni le classement.
_Avoid_: Carte clé when referring to an archetype-synergy role

**Ronde de tournoi**:
Une étape ordonnée d'un Tournoi de cube qui regroupe des Matchs de tournoi simultanés et, selon le format, au plus une Exemption suisse ou une Pause toutes-rondes.
_Avoid_: Tour de draft, manche

**Match de tournoi**:
La confrontation planifiée entre deux Participants de tournoi au cours d'une Ronde de tournoi, ou l'exemption attribuée à un seul participant.
_Avoid_: partie when referring to the whole match

**Appariement**:
L'affectation auditable des Participants de tournoi aux Matchs de tournoi d'une ronde selon le format et les résultats déjà confirmés.
_Avoid_: matchmaking

**Exemption suisse**:
Une victoire de match automatique attribuée à un Participant de tournoi sans adversaire dans une ronde suisse impaire.
_Avoid_: Pause toutes-rondes, match fantôme

**Pause toutes-rondes**:
La ronde sans match d'un Participant de tournoi dans le format toutes-rondes à trois ; elle n'accorde aucun point et ne crée aucune partie fictive.
_Avoid_: Exemption suisse, bye

**Résultat de match**:
Le relevé confirmé des parties gagnées et nulles d'un Match de tournoi, dont sont dérivés le vainqueur éventuel, les points et le classement.
_Avoid_: Score de deck, résultat de draft
