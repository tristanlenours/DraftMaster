# Plan: Listes MTGA des Decks déclarés

**Issue**: #82
**Branch**: `codex/009-mtga-tournament-decks`
**Runtime**: Node 24, TypeScript strict ESM, navigateur HTML/JavaScript, Vitest et Playwright.

## Constitution Check

- Issue #82 et spécification créées avant le code de la feature ; #81 reste le suivi du provider photo.
- Parser/formatteur déterministes et testés avant le branchement UI ; aucune décision de vision ne persiste sans confirmation.
- Branche dédiée et futur PR ; validation humaine requise avant merge.
- Parcours clavier et viewport 360 px couverts par un test navigateur ciblé.

## Design

- Un module pur de syntaxe MTGA partagé entre navigateur et serveur lit les sections, quantités et métadonnées, puis produit une liste canonique. Il formate les cartes structurées du tournoi en texte `Deck`.
- Un adaptateur HTTP de prévisualisation résout exactement les noms via le catalogue local des cartes, garde les inconnues inchangées avec avertissement et renvoie un résultat structuré. Le texte est traité en mémoire et n'est pas journalisé ni stocké.
- L'éditeur modal du tournoi montre un `textarea` prérempli depuis le Deck déclaré ou le résultat photo. Appliquer remplace uniquement la prévisualisation locale ; Valider sauvegarde ensuite via les chemins de préparation/participant existants. Un texte modifié bloque Valider jusqu'à application et vérification de la prévisualisation.
- Copier et télécharger utilisent le même formatteur dans le tournoi. Le draft multijoueur expose aussi un texte complet « pour tournoi », distinct de son export Arena limité aux cartes compatibles ; le même token privé protège les deux routes et aucun token n'est transmis au tournoi.
- Le sideboard est ignoré avec un décompte visible. Les lignes non vérifiées restent dans le deck après confirmation explicite.

## Acceptance & QA

- Tests unitaires : syntaxe, agrégation, noms avec apostrophes/accents, suffixes d'édition, sideboard, erreur sans mutation, aller-retour.
- Intégration HTTP : prévisualisation, absence de persistance et erreurs.
- Navigateur : photo simulée puis correction MTGA, collage d'export multijoueur, validation et présence après réouverture, viewport 360 px et clavier.
- Accessibilité : les contrôles Appliquer/Valider restent accessibles au clavier, les erreurs sont annoncées par `role="alert"`, et aucun débordement horizontal n'apparaît à 360 px.
- Performance : le parseur local d'une liste de 40 cartes termine en moins de 100 ms au p95 sur 1 000 itérations Node 24 ; la latence Gemini dépend du fournisseur et n'entre pas dans ce budget.
- Vérifier `npm run lint`, `npm run typecheck`, tests ciblés, `git diff --check`; test live photo témoin seulement pour la chaîne Gemini déjà existante.

## Risk & Limits

- Le catalogue local est incomplet : un nom inconnu est conservé et explicitement marqué non vérifié. L'export texte ne garantit pas la disponibilité de chaque carte dans Arena.
- Le tournoi ne stocke pas de sideboard ; celui de l'export multijoueur ne peut être transféré comme tel dans cette version.
