# HTTP Contract: Gestion de tournois de cube

Base path: `/api/tournaments`

Toutes les routes se trouvent derrière le gate de guilde existant. Les réponses JSON portent `Cache-Control: no-store`. Les mutations exigent `Idempotency-Key`; celles qui visent un tournoi existant exigent aussi `expectedRevision` dans le corps.

## Envelope

Succès :

```json
{
  "ok": true,
  "tournament": {}
}
```

Erreur :

```json
{
  "ok": false,
  "error": {
    "code": "REVISION_CONFLICT",
    "message": "Le tournoi a changé. Rechargez son état.",
    "details": { "currentRevision": 4 }
  }
}
```

Codes stables initiaux : `INVALID_INPUT`, `TOURNAMENT_NOT_FOUND`, `INVALID_STATE`, `NAME_TAKEN`, `INVALID_CUBE`, `INVALID_PARTICIPANT_COUNT`, `ROUND_INCOMPLETE`, `ROUND_LIMIT_REACHED`, `MATCH_NOT_FOUND`, `INVALID_RESULT`, `IDEMPOTENCY_CONFLICT`, `REVISION_CONFLICT`, `STORE_UNAVAILABLE`.

Mapping : `400` entrée invalide, `401` gate de site, `404` ressource absente, `409` état/révision/idempotence, `503` stockage.

## Cube catalog

### `GET /api/tournaments/cubes`

Retourne les cubes sélectionnables depuis le registre serveur, sans imposer les contraintes de taille d'une Session de draft.

```json
{
  "ok": true,
  "cubes": [
    {
      "cubeKey": "titou_tribal",
      "cubeName": "Titou Tribal",
      "activeSnapshotId": "..."
    }
  ]
}
```

## History

### `GET /api/tournaments?status=all&limit=100`

Retourne des résumés triés par mise à jour décroissante : identifiant, nom, statut, format, cube figé, nombre de participants, ronde courante, dates et leader(s) éventuel(s). `limit` est borné à `1..100`.

### `GET /api/tournaments/{tournamentId}`

Retourne la projection complète : configuration, participants/decks, rondes, résultats courants avec historique de versions, classement et preuves d'Appariement.

## Creation and setup

### `POST /api/tournaments`

Headers : `Idempotency-Key` obligatoire.

```json
{
  "name": "Cube de septembre"
}
```

Crée un tournoi `preparation`, révision `0`, sans ronde. Retourne `201` et la projection complète.

### `PUT /api/tournaments/{tournamentId}/setup`

Remplace atomiquement toute la configuration mutable de préparation.

```json
{
  "expectedRevision": 0,
  "name": "Cube de septembre",
  "cubeKey": "titou_tribal",
  "format": "swiss",
  "plannedRoundCount": 3,
  "participants": [
    {
      "participantId": null,
      "displayName": "Alice",
      "deckName": "Aggro Boros"
    },
    {
      "participantId": null,
      "displayName": "Bob",
      "deckName": "Izzet Wizards"
    }
  ]
}
```

`participantId: null` demande un nouvel identifiant. Un identifiant déjà retourné conserve l'identité, l'ordre d'inscription et les Cartes clés. Un identifiant absent de la nouvelle liste retire le participant uniquement en préparation.

Le serveur résout `cubeKey` vers le Snapshot courant, calcule son empreinte canonique, archive ce payload dans la même transaction et renvoie la référence exacte qui sera verrouillée au démarrage. Un changement ultérieur du snapshot actif ne modifie donc pas le tournoi en préparation.

## Start and rounds

### `POST /api/tournaments/{tournamentId}/start`

```json
{
  "expectedRevision": 3
}
```

Valide et verrouille la configuration ainsi que la référence de Snapshot déjà archivée, puis publie :

- la première ronde en `swiss` ;
- les trois rondes et Pauses toutes-rondes en `round-robin-three`.

Deux commandes concurrentes avec des request ids différents produisent un succès et un `409 REVISION_CONFLICT`. Un retry identique rejoue la première réponse.

### `POST /api/tournaments/{tournamentId}/rounds`

```json
{
  "expectedRevision": 8
}
```

Publie la prochaine ronde suisse seulement si la précédente est complète et si `plannedRoundCount` n'est pas atteint. Retourne la projection incluant `pairingEvidence`.

## Match results

### `PUT /api/tournaments/{tournamentId}/matches/{matchId}/result`

Premier résultat :

```json
{
  "expectedRevision": 5,
  "kind": "played",
  "gamesWonA": 2,
  "gamesWonB": 1,
  "drawnGames": 0
}
```

Correction :

```json
{
  "expectedRevision": 9,
  "kind": "played",
  "gamesWonA": 1,
  "gamesWonB": 1,
  "drawnGames": 1,
  "reason": "Score inversé sur la feuille"
}
```

`outcome` et les points sont dérivés : chaque compteur est un entier de `0` à `9`,
la somme doit être strictement positive, le plus grand nombre de manches gagnées désigne
le vainqueur et une égalité désigne un match nul. `reason` est obligatoire si le match
possède déjà une version. Le serveur ajoute une version, recalcule le classement et ne
modifie aucune ronde publiée.

Pour un forfait, `kind: "forfeit"` doit porter exactement le score `2-0-0` ou `0-2-0`.
Une Exemption suisse est enregistrée automatiquement et n'accepte pas de saisie manuelle.

## Participant status

### `POST /api/tournaments/{tournamentId}/participants/{participantId}/drop`

```json
{
  "expectedRevision": 10,
  "reason": "Départ anticipé"
}
```

Marque le participant `dropped`. Les rondes passées restent intactes ; les matchs déjà publiés sans résultat doivent recevoir un forfait explicite. Les rondes futures n'apparient plus ce participant.

## Deck key cards

### `PUT /api/tournaments/{tournamentId}/participants/{participantId}/key-cards`

```json
{
  "expectedRevision": 4,
  "oracleIds": ["...", "..."]
}
```

Remplace la liste manuelle par des identités présentes dans le Snapshot figé. L'opération est autorisée pendant les trois états du tournoi et n'altère ni le classement ni les rondes.

## Completion

### `POST /api/tournaments/{tournamentId}/complete`

```json
{
  "expectedRevision": 14
}
```

Réussit uniquement lorsque toutes les rondes prévues et tous leurs matchs sont complets. Fige `completedAt`. Une correction de résultat ou une mise à jour de Cartes clés reste possible et ajoute une révision auditée ; aucune nouvelle ronde ne peut être créée.

## Idempotency and revisions

- Un `Idempotency-Key` est unique dans un tournoi ; pour la création, il est unique dans le scope `tournaments`.
- Même clé et même empreinte : rejouer la réponse enregistrée sans nouvelle révision.
- Même clé et autre empreinte : `409 IDEMPOTENCY_CONFLICT`.
- Mauvaise `expectedRevision` : `409 REVISION_CONFLICT` avec la révision courante, sans événement ni mutation.
- La réponse `2xx` n'est envoyée qu'après le commit durable de l'événement, du checkpoint et du reçu.
