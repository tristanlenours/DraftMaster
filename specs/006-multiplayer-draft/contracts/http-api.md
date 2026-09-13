# HTTP Interface Contract: Draft multijoueur

Base path : `/api/multiplayer`. JSON UTF-8 sauf l'export MTGA.

## Regles communes

- Les lectures publiques ne revelent que le salon et la composition publique.
- Les lectures privees et mutations exigent `Authorization: Bearer <resumeToken>`.
- Toute mutation exige `Idempotency-Key: <requestId>` et `expectedRevision` dans le corps.
- Succes JSON : `{ "ok": true, ... }`.
- Echec JSON : `{ "ok": false, "error": { "code": "...", "message": "...", "currentRevision"?: number } }`.
- Codes stables : `INVALID_INPUT`, `LOBBY_BUSY`, `LOBBY_FULL`, `NAME_TAKEN`, `CUBE_LOCKED`, `NOT_ENOUGH_PLAYERS`, `NOT_ALL_READY`, `INVALID_RESUME_TOKEN`, `IDEMPOTENCY_CONFLICT`, `REVISION_CONFLICT`, `PICK_ALREADY_COMMITTED`, `CARD_NOT_IN_BOOSTER`, `SESSION_ABANDONED`, `DECK_NOT_READY`, `INVALID_DECK`.
- Un retry avec le meme `requestId` et le meme contenu renvoie la premiere reponse sans nouvelle mutation. Un contenu different avec le meme identifiant est rejete.

## GET `/lobby`

Renvoie le salon public : `revision`, `status`, cube, huit sieges publics, participants et etats pret/presence. Aucun jeton, booster, pool ou pick.

## POST `/lobby/join`

Input : `playerName`, `cubeKey` requis seulement si le salon est vide, `expectedRevision`.

Output : `resumeToken` retourne une seule fois comme code prive copiable et `state` contient la projection publique du Salon. Le code est memorise dans le navigateur mais n'est place ni dans le chemin ni dans la query string de l'URL. Le premier entrant choisit le cube. A partir du deuxieme, un `cubeKey` different produit `CUBE_LOCKED`.

## POST `/lobby/cube`

Input : `cubeKey`, `expectedRevision`. Seul l'unique participant present peut changer le cube. Le choix est verrouille des l'arrivee du deuxieme humain.

## GET `/state`

Avec token : renvoie `PlayerDraftView`. Sans token : meme projection que `/lobby`. Accepte `If-None-Match` sur la revision et peut repondre `304`.

## POST `/presence`

Commande authentifiee idempotente qui rafraichit `lastSeenAt` pour le siege courant sans modifier son choix ni l'avancement du Tour. Le serveur derive l'etat public `connected` ou `disconnected` a partir de cette activite ; cette information ne declenche jamais un choix automatique et ne libere jamais le siege.

## POST `/ready`

Input : `ready`, `expectedRevision`. L'arrivee/depart d'un humain remet les autres a non pret. La transition du dernier humain vers Pret cree une unique session et renvoie le premier booster prive.

## POST `/lobby/leave`

Requiert le token Bearer et `Idempotency-Key`. Input : `expectedRevision`. Disponible uniquement avant le demarrage ; le depart remet les autres humains a non pret. Un conflit avec le dernier accord Pret est tranche par la revision : une seule des deux commandes peut reussir.

## POST `/pick`

Input : `cardInstanceId`, `expectedRevision`, `packNumber`, `pickNumber`.

Le pick est prive et immuable. Si d'autres humains manquent, la reponse indique uniquement leurs noms. Si le pick clot le Tour, le coordinateur ajoute les decisions bots, appelle le moteur avec huit decisions, persiste les evenements, puis renvoie le Tour suivant.

## POST `/abandon`

Input : `expectedRevision`, `confirmed: true`. Tout participant authentifie de la session peut, apres confirmation explicite dans son navigateur, marquer la session abandonnee et liberer le salon global. La coordination de cette action se fait sur Discord ; aucun choix precedent n'est reutilise.

## POST `/deck/recommend`

Input : `expectedRevision`. Autorise uniquement apres les 45 choix. Renvoie une `CoachRecommendation` validee ou une recommandation locale `fallback`.

## PUT `/deck`

Input : `maindeckCardInstanceIds`, `basicLands`, `expectedRevision`, `finalize` et `landCountRationale` lorsque la liste finalisee sort de 16–18 terrains au total.

Valide les multiplicites du pool et le total de 40 si `finalize=true`. Renvoie le DeckWorkspace et l'evaluation explicable.

## GET `/deck/export.mtga`

Renvoie `text/plain; charset=utf-8` pour une Liste finale compatible. Si la liste contient des incompatibilites, repond JSON `INVALID_DECK` avec les cartes concernees et un texte partiel marque comme non importable ; le client affiche les noms et raisons au lieu de le presenter comme un export valide.

## Redaction et observabilite

Les logs peuvent contenir route, code resultat, revision, duree, cube et nombre de participants. Ils excluent token, pseudo, corps de requete, carte choisie, booster, pool et `sessionId` comme label de metrique.
