# Data Model: Draft multijoueur amical

## GlobalLobby

Represente l'unique Salon de draft global.

| Field                    | Type                       | Rules                                      |
| ------------------------ | -------------------------- | ------------------------------------------ |
| `lobbyId`                | literal `global`           | Unique                                     |
| `generation`             | positive integer           | Incremente lorsque le salon redevient vide |
| `revision`               | non-negative integer       | Incremente a chaque mutation acceptee      |
| `status`                 | `open`, `drafting`         | Un seul groupe en draft a la fois          |
| `cubeKey`                | string or null             | Choisi par le premier humain               |
| `cubeLocked`             | boolean                    | Vrai des le deuxieme humain                |
| `activeSessionId`        | string or null             | Present uniquement pendant le draft        |
| `participants`           | Participant reference list | 0 a 8 humains, ordre d'arrivee stable      |
| `createdAt`, `updatedAt` | timestamps                 | Horodatages serveur                        |

Transitions : `empty -> open(first join) -> locked(second join) -> drafting(all ready) -> empty(draft complete or abandoned)`.

## Participant

| Field                    | Type                                | Rules                                                       |
| ------------------------ | ----------------------------------- | ----------------------------------------------------------- |
| `participantId`          | opaque string                       | Stable dans la session                                      |
| `displayName`            | string                              | Trim, non vide, unicite insensible a la casse dans le salon |
| `normalizedName`         | string                              | Jamais affiche                                              |
| `resumeTokenHash`        | SHA-256 string                      | Le jeton brut n'est jamais persiste                         |
| `seatId`                 | 0..7                                | Unique dans la composition                                  |
| `ready`                  | boolean                             | Remis a faux sur arrivee/depart pre-demarrage               |
| `presence`               | `connected`, `disconnected`, `left` | Informatif, jamais un minuteur de pick                      |
| `joinedAt`, `lastSeenAt` | timestamps                          | Horloge serveur                                             |

Le Participant est relie a une composition de table et peut posseder un DeckWorkspace apres le draft.

## MultiplayerSession

| Field                                     | Type                                    | Rules                                     |
| ----------------------------------------- | --------------------------------------- | ----------------------------------------- |
| `sessionId`                               | opaque string                           | Unique                                    |
| `lobbyGeneration`                         | integer                                 | Lie au groupe qui a demarre               |
| `revision`                                | non-negative integer                    | Controle de concurrence                   |
| `status`                                  | `drafting`, `deckbuilding`, `abandoned` | Terminal pour `abandoned`                 |
| `cubeKey`, `snapshotId`, `snapshotSha256` | strings                                 | Snapshot immuable                         |
| `seed`, `engineVersion`                   | versioned values                        | Relecture deterministe                    |
| `seatAssignments`                         | 8 assignments                           | 2-8 humains, bots pour le reste           |
| `draftEvents`                             | DraftEvent list                         | Journal du moteur existant                |
| `multiplayerEvents`                       | MultiplayerEvent list                   | Faits du lobby et des commandes humaines  |
| `pendingRound`                            | PendingRound or null                    | Picks humains prives avant commit du Tour |
| `startedAt`, `completedAt`, `abandonedAt` | timestamps                              | Selon etat                                |

## SeatAssignment

Union fermee :

- `human`: `seatId`, `participantId`, nom affiche ;
- `bot`: `seatId`, `botId`, `policyId`, `policyVersion`.

L'ordre humain suit l'arrivee. Les bots amis restants sont choisis dans un ordre deterministe et visible avant Pret.

## PendingRound

| Field                      | Type                          | Rules                             |
| -------------------------- | ----------------------------- | --------------------------------- |
| `packNumber`, `pickNumber` | integers                      | Doivent correspondre au DraftView |
| `expectedDraftRevision`    | integer                       | Revision du moteur avant commit   |
| `humanPicks`               | participant -> cardInstanceId | Au plus un pick par humain        |

Les picks restent secrets. Lorsque chaque humain a choisi, les bots choisissent, les huit decisions sont soumises ensemble et `pendingRound` est efface dans le meme commit.

## MultiplayerEvent

Evenement immuable avec `schemaVersion`, `sequence`, `scopeId`, `occurredAt`, `requestId` et `type`.

Types initiaux : `LobbyOpened`, `ParticipantJoined`, `ParticipantLeft`, `ReadyChanged`, `CubeLocked`, `DraftStarted`, `HumanPickSubmitted`, `DraftRoundCommitted`, `DraftCompleted`, `SessionAbandoned`, `DeckRecommended`, `DeckFinalized`.

## CommandReceipt

| Field                             | Type           | Rules                                    |
| --------------------------------- | -------------- | ---------------------------------------- |
| `scopeId`, `requestId`            | strings        | Cle unique composee                      |
| `participantId`                   | string or null | Auteur attendu                           |
| `revisionBefore`, `revisionAfter` | integers       | Preuve de serialisation                  |
| `response`                        | redacted JSON  | Rejoue lors d'un retry identique         |
| `createdAt`                       | timestamp      | Conservation au moins egale a la session |

Un meme `requestId` avec un contenu different est rejete.

## PlayerDraftView

Projection de lecture, jamais persistee comme autorite : revision, etat du salon/session, composition publique, Tour courant, propre booster, propre pool, statut de propre pick et noms des humains encore attendus. Elle exclut boosters, pools, picks et Acces de reprise adverses.

## DeckWorkspace

| Field                        | Type                        | Rules                          |
| ---------------------------- | --------------------------- | ------------------------------ |
| `participantId`, `sessionId` | strings                     | Cle composee                   |
| `poolCardInstanceIds`        | 45 ids                      | Immuable apres le draft        |
| `maindeckCardInstanceIds`    | drafted ids                 | Multiplicites limitees au pool |
| `basicLands`                 | five non-negative counts    | Quantites libres               |
| `sideboardCardInstanceIds`   | drafted ids                 | Complement du maindeck drafte  |
| `recommendation`             | CoachRecommendation or null | Derivee et versionnee          |
| `status`                     | `editing`, `finalized`      | Finalisation personnelle       |
| `revision`                   | integer                     | Edits concurrents              |

Invariant : `maindeck drafted count + sum(basicLands) = 40` a la finalisation.

## CoachRecommendation

Contient la selection de cartes, terrains basiques, plan, couleurs, splash, inclusions/exclusions expliquees, justification de mana, cinq axes, fournisseur, modele, `promptVersion`, `engineVersion` et indicateur `external` ou `fallback`. Une recommandation n'est jamais une Liste finale tant que le joueur ne l'a pas acceptee ou modifiee.

## Liste finale et Export MTGA

La Liste finale est l'instantane legal et immuable du DeckWorkspace finalise. L'Export MTGA est une projection textuelle derivee avec `text`, `compatible`, `warnings` et cartes incompatibles ; il est regenerable depuis la Liste finale et le catalogue versionne.
