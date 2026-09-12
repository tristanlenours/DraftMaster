# Golden Datasets & Witness Corpora (Corpus Témoins de Ligue)

Ce répertoire conserve les corpus témoins de ligues de cubes, les drafts témoins réels et les decks témoins annotés par des experts. Ces données servent d'étalons de comparaison et de bancs de régression indépendants pour l'évaluation de deck.

## Distinction stricte avec `tests/fixtures/reference-drafts`

- **`reference-drafts/` (`titou-2026-02-24.1-seed-42.json`)** : Fixture de validation de bas niveau du moteur de simulation. Elle garantit l'équivalence fonctionnelle, la reproductibilité déterministe pseudo-aléatoire (seed 42) et la conservation des cartes. Elle **ne constitue pas** un témoin de qualité de deck expert.
- **`golden-datasets/`** : Corpus témoins versionnés d'évaluation de decks par ligue, intégrant des parties réelles jouées (MTGA / Untapped) ou annotées par des experts.

## Structure du Répertoire

```text
tests/fixtures/golden-datasets/
├── README.md
└── <league-id>/                         # ex. powered-vintage
    ├── league.json                      # Étalonnage de ligue et seuils
    └── <cube-key>/                      # ex. arena-powered, candyshop
        └── <snapshot-date-or-id>/       # ex. 2026-09-08
            ├── corpus.json              # Manifeste du corpus témoin
            └── drafts/                  # Drafts complets individuels
                └── <draft-id>.json      # ex. bc4cdb9d-6412-43a1-84a2-d66b5dbed559.json
```

## Règles de Curation et Invariants

### 1. Autonomie Hors-Ligne Stricte (FR-008)
Chaque corpus et draft témoin doit être complètement auto-suffisant. Les tests exécutant l'évaluation ou le chargement ne doivent nécessiter aucun accès réseau, aucune base de données locale mutable (logs Arena ou SQLite MTGA) et aucun catalogue externe au moment du test. Les cartes sont résolues directement à partir des identités et descripteurs embarqués.

### 2. Anonymisation et Confidentialité (FR-009, SC-004)
Aucun identifiant personnel n'est toléré :
- Pas de `userId`, `playerId`, `screenName`, `seatId` nominatif, `matchId` privé ou nom d'adversaire.
- Les logs bruts et communications réseau ne sont pas stockés.
- Seule l'empreinte SHA-256 des fichiers sources originaux est conservée pour la traçabilité.

### 3. Découplage Résultat Observé / Tier Expert (FR-010, SC-002)
- Le résultat de match observé (ex. 0-3) est consigné comme un fait contextuel indépendant.
- Il ne détermine en aucun cas le tier de deck expert (ex. Tier A avec note `tierPlacement: "upper"` pour un deck de haute qualité sans Power Nine).
- Les tiers canoniques sont strictement limités à `S`, `A`, `B`, `C`, `D` (pas de tier A+ syntaxique dans le modèle de scoring).

### 4. Politiques d'Usage et Fuite de Données (FR-012)
Chaque témoin déclare sa politique d'usage (`usagePolicy`) :
- `evaluation_only` : Réservé exclusivement à la validation et à la détection de régression. Strictement exclu de tout pipeline d'entraînement ou d'ajustement de prompts (prompt tuning).
- `calibration_eligible` : Éligible pour le calcul d'étalonnage de seuils de ligue.
- `training_allowed` : Données ouvertes utilisables pour l'apprentissage.

Tout corpus marqué `evaluation_only` interdit formellement la présence de témoins de type `training_allowed` afin d'éviter toute contamination ou apprentissage par cœur (test set leakage).

### 5. Cycle de Vie et Promotion des Témoins (Witness Promotion Workflow)
Les témoins traversent trois états formels :
1. **`candidate`** : Données de draft ou deck extraites d'une source (MTGA, Untapped, ou export 17Lands) mais sans validation par un expert humain ni consensus de notation.
2. **`reviewed`** : Le deck a fait l'objet d'une analyse experte formalisée (`annotation`), incluant l'auteur, la date de revue, le tier attendu (S/A/B/C/D), le placement (`lower`/`middle`/`upper`), un rationnel explicatif et la mention de forces/faiblesses.
3. **`locked`** : Validation structurelle (schéma Ajv + règles sémantiques) validée, hachages de sources scellés. Un témoin verrouillé est immuable.

### 6. Immutabilité et Versionnage de Corpus (FR-013)
Un témoin verrouillé (`locked`) ne doit JAMAIS être réécrit ou régénéré pour masquer une régression de l'évaluateur.
- Toute correction d'annotation ou ajout de témoins impose d'incrémenter la version du corpus (`corpusVersion`, ex. `1.0.0` -> `1.1.0`).
- Les identifiants de témoins (`deckWitnessId`, `draftId`) sont permanents et stables.
- Les empreintes cryptographiques des fichiers sources d'extraction (`sourceHashes`) sont scellées dans l'objet `provenance`.

### 7. Statut des Candidats Historiques 17Lands (FR-012, FR-015)
Les historiques de drafts publics ou semi-publics issus de 17Lands sont admis au stade de candidats (`candidate`) sous les conditions suivantes :
- Vérification préalable de la conformité du cube et du snapshot de référence.
- Retrait absolu de tout identifiant d'utilisateur, d'adversaire ou de nom de compte dans l'export.
- Attribution obligatoire d'un statut initial `candidate` ; ils ne deviennent éligibles à l'étalonnage (`calibration_eligible`) qu'après une revue experte explicite.
- Les données 17Lands annotées pour l'évaluation restent assignées à `usagePolicy: "evaluation_only"` et ne doivent pas être ingérées dans les jeux de données d'apprentissage des bots ou des heuristiques.

