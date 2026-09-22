# Data Model: Gestion de tournois de cube

## Tournament

Agrégat d'autorité d'un Tournoi de cube.

| Field | Type | Rules |
| --- | --- | --- |
| `tournamentId` | opaque string | Unique et stable |
| `schemaVersion` | literal `1` | Version de sérialisation |
| `revision` | non-negative integer | Incrémentée une fois par commande acceptée |
| `name` | string | Trim, non vide |
| `status` | `preparation`, `active`, `completed` | Transition uniquement vers la droite |
| `format` | `swiss`, `round-robin-three` | Verrouillé au démarrage |
| `plannedRoundCount` | positive integer | 1..5 pour suisse, exactement 3 pour toutes-rondes |
| `pairingSeed` | signed 32-bit integer | Créé une fois, jamais changé |
| `pairingEngineVersion` | literal `tournament-pairing@1` | Conservé dans l'historique |
| `cube` | `TournamentCubeSnapshot` | Obligatoire avant démarrage, verrouillé ensuite |
| `participants` | ordered `TournamentParticipant[]` | 2..32 au démarrage, noms normalisés uniques |
| `rounds` | ordered `TournamentRound[]` | Numéros contigus, immuables après publication hors résultats versionnés |
| `createdAt`, `updatedAt` | timestamps | Horloge serveur |
| `startedAt`, `completedAt` | timestamp or null | Cohérents avec `status` |

Transitions : `preparation -> active -> completed`. Toute commande invalide ou conflit de révision laisse l'agrégat et son journal inchangés.

## TournamentCubeSnapshot

| Field | Type | Rules |
| --- | --- | --- |
| `cubeKey` | string | Identité produit du cube |
| `cubeName` | string | Libellé figé pour l'historique |
| `snapshotId` | string | Identité déclarée de la version |
| `canonicalSha256` | lowercase hex string | Empreinte RFC 8785 du payload archivé |
| `cards` | `SnapshotCardIdentity[]` | Copie complète nécessaire aux Cartes clés |

`SnapshotCardIdentity` contient au minimum `oracleId`, nom canonique et identifiants de faces/impressions nécessaires à une sélection non ambiguë. Le payload canonique complet est archivé dans la même transaction que sa sélection en préparation, puis dédupliqué par `(snapshotId, canonicalSha256)`. Le démarrage verrouille cette référence déjà archivée.

## TournamentParticipant

| Field | Type | Rules |
| --- | --- | --- |
| `participantId` | opaque string | Stable dans le tournoi |
| `displayName` | string | Trim, non vide |
| `normalizedName` | string | Unicité insensible à la casse et aux espaces |
| `registrationOrder` | non-negative integer | Unique et stable |
| `status` | `active`, `dropped` | `dropped` seulement après démarrage |
| `deck` | `DeclaredDeck` | Obligatoire avant démarrage |

Un participant retiré en préparation disparaît avant le verrouillage. Après démarrage, un abandon conserve le participant et ses matchs ; les résultats restants sont saisis comme forfaits explicites.

## DeclaredDeck

| Field | Type | Rules |
| --- | --- | --- |
| `name` | string | Trim, non vide au démarrage |
| `keyCards` | ordered `DeckKeyCard[]` | Sans doublon d'`oracleId` |

`DeckKeyCard` contient `oracleId` et nom canonique. Toute carte doit appartenir au `TournamentCubeSnapshot`. Aucune provenance ou donnée de reconnaissance photo n'est anticipée dans cette feature.

## TournamentRound

| Field | Type | Rules |
| --- | --- | --- |
| `roundNumber` | positive integer | Contigu à partir de 1 |
| `status` | `published`, `completed` | Complète quand tous les matchs requis ont un résultat courant |
| `sourceRevision` | non-negative integer | Révision utilisée pour calculer la ronde |
| `publishedAt`, `completedAt` | timestamps | `completedAt` null tant que la ronde est ouverte |
| `pairingEvidence` | `PairingEvidence` | Obligatoire et immutable |
| `matches` | ordered `TournamentMatch[]` | Chaque participant apparaît exactement une fois ou est en Pause toutes-rondes |

En `round-robin-three`, les trois rondes sont calculées et publiées ensemble au démarrage. En `swiss`, seule la première ronde est publiée au démarrage ; chaque suivante exige la précédente complète.

## PairingEvidence

| Field | Type | Rules |
| --- | --- | --- |
| `engineVersion` | string | `tournament-pairing@1` initialement |
| `pairingSeed` | integer | Seed du tournoi |
| `inputSha256` | hex string | Hash du classement, des adversaires et des byes source |
| `standingsBefore` | ordered `StandingRow[]` | Projection ayant guidé la ronde |
| `cost` | integer tuple | Rematchs, écarts de points/rang, ordre seedé |
| `reasons` | match -> reason list | `same-score`, `float`, `forced-rematch`, `swiss-bye`, `round-robin-pause` |

Une correction ultérieure ne modifie jamais cette preuve.

## TournamentMatch

| Field | Type | Rules |
| --- | --- | --- |
| `matchId` | opaque string | Unique dans le tournoi |
| `roundNumber`, `tableNumber` | positive integers | Table unique dans la ronde |
| `participantAId` | participant id | Toujours présent |
| `participantBId` | participant id or null | Null uniquement pour Exemption suisse |
| `status` | `pending`, `confirmed` | Une correction conserve `confirmed` |
| `resultVersions` | ordered `MatchResultVersion[]` | Vide avant résultat, append-only ensuite |
| `currentResultVersion` | positive integer or null | Dernière version acceptée |

Une Pause toutes-rondes n'est pas un `TournamentMatch`; elle apparaît uniquement dans la preuve de ronde.

## MatchResultVersion

| Field | Type | Rules |
| --- | --- | --- |
| `version` | positive integer | Contigu à partir de 1 pour le match |
| `kind` | `played`, `forfeit`, `swiss-bye` | Le bye est créé automatiquement |
| `gamesWonA`, `gamesWonB`, `drawnGames` | Entiers de 0 à 9 | Somme strictement positive ; forfait exactement `2-0-0` ou `0-2-0` |
| `outcome` | `a-win`, `b-win`, `draw` | Dérivé des games, jamais saisi séparément |
| `recordedAt` | timestamp | Horloge serveur |
| `requestId` | string | Lien vers le reçu de commande |
| `replacesVersion` | integer or null | Null pour la première version |
| `reason` | string or null | Obligatoire lors d'une correction |

L'issue d'un match joué est dérivée des manches gagnées : le plus grand total désigne le
vainqueur et une égalité désigne un match nul. Une Exemption suisse produit `2-0-0`, trois
points de match et six points de game, mais n'ajoute aucun adversaire aux moyennes. Un
forfait est limité à `2-0-0` ou `0-2-0` et conserve le participant adverse.

## StandingRow

Projection dérivée, jamais source d'autorité.

| Field | Type | Rules |
| --- | --- | --- |
| `participantId` | participant id | Une ligne par participant verrouillé |
| `matchesPlayed`, `wins`, `draws`, `losses`, `byes` | non-negative integers | Dérivés des résultats courants |
| `gamesWon`, `gamesDrawn`, `gamesLost` | non-negative integers | Le bye est affichable mais exclu des moyennes d'adversaires |
| `matchPoints` | non-negative integer | 3/1/0 |
| `matchWinPercentage` | exact fraction | Plancher `1/3` pour les calculs d'adversaires |
| `opponentsMatchWinPercentage` | exact fraction or null | Moyenne sans byes |
| `gameWinPercentage` | exact fraction or null | Points de game / maximum possible, plancher `1/3` pour OGW |
| `opponentsGameWinPercentage` | exact fraction or null | Moyenne sans byes |
| `competitiveRank` | positive integer | Même rang pour des critères totalement égaux |
| `displayOrder` | positive integer | Stable via seed, sans valeur compétitive |

Les fractions sont conservées comme numérateur/dénominateur réduits ou comparées par produit croisé. L'arrondi est une projection d'affichage uniquement.

## TournamentEvent

Événement immuable avec `schemaVersion`, `sequence`, `tournamentId`, `revision`, `requestId`, `type`, `occurredAt` et `payload`.

Types initiaux :

- `TournamentCreated`
- `TournamentSetupReplaced`
- `TournamentStarted`
- `RoundPublished`
- `MatchResultRecorded`
- `MatchResultCorrected`
- `ParticipantDropped`
- `DeckKeyCardsUpdated`
- `TournamentCompleted`

Le checkpoint doit pouvoir être reconstruit en rejouant les événements dans l'ordre de `sequence`.

## CommandReceipt

| Field | Type | Rules |
| --- | --- | --- |
| `tournamentId`, `requestId` | strings | Clé composée unique |
| `requestFingerprint` | SHA-256 | Rejet si le même id porte une commande différente |
| `revisionBefore`, `revisionAfter` | integers | Preuve de sérialisation |
| `response` | redacted JSON | Réponse rejouée lors d'un retry identique |
| `createdAt` | timestamp | Conservation au moins égale au tournoi |

## PostgreSQL projections

### `cube_snapshot_archive`

Clé `(snapshot_id, canonical_sha256)`, colonnes `cube_key`, `cube_name`, `payload`, `archived_at`. Aucune mise à jour ni suppression applicative.

### `tournaments`

Colonnes de liste : `id`, `name`, `status`, `format`, `planned_round_count`, `cube_key`, `snapshot_id`, `snapshot_sha256`, `revision`, `schema_version`, `pairing_engine_version`, timestamps et `state jsonb`.

### `tournament_events`

Clé `(tournament_id, sequence)`, avec révision, request id, type, date et payload. Append-only.

### `tournament_command_receipts`

Clé `(tournament_id, request_id)`, fingerprint, révisions, réponse et date. Toutes les écritures passent par la fonction transactionnelle du rôle serveur.
