# Plan — Pertinence des cartes remplaçantes

## Architecture

- Conserver `src/cards/cube-upgrade-advisor.ts` comme module déterministe : toutes les décisions
  dépendent du catalogue, des métadonnées du cube, des sorties et des benchmarks fournis.
- Centraliser les politiques de légalité, le seuil minimal, la fenêtre récente et l'addition des
  facteurs de classement afin que upgrades et maybeboard partagent les mêmes règles.
- Déclarer les tribus dans les métadonnées d'archétype ; le moteur ne déduit pas la politique du
  nom du cube au-delà de la sélection de politique existante.
- Sérialiser un score et une liste de facteurs plutôt qu'une note opaque.
- Refuser un rapport sans snapshot ou empreintes de sources ; l'outil de synchronisation calcule
  les SHA-256 des trois entrées et fournit un horodatage stable du catalogue.

## Validation

- Tests unitaires en matrice pour huit fonctions Oracle et neuf sous-types spécialisés.
- Régressions dédiées pour tribus, changelins, terrains, couleurs, seuil 25, plafond 30, réserve
  récente compétitive et fenêtre glissante.
- Contrôle d'intégration sur les cinq artefacts, y compris les cibles tribales non-créature.
- Parcours navigateur de la vue upgrade/maybeboard et qualité complète via `npm run check`.

## Budgets

- Aucun appel réseau au runtime web : les suggestions restent pré-calculées.
- Maximum 30 entrées de maybeboard par cube.
- Aucun changement d'interface mobile ou d'accessibilité dans ce périmètre ; les parcours web
  existants restent la preuve de non-régression.
