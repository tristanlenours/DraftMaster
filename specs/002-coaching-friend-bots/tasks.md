# Tasks: Coaching Pédagogique et Bots Personnalisés Amis

**Feature Branch**: `002-coaching-friend-bots` | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

---

## Phase 1: Setup (Infrastructure Partagée)

**Purpose**: Initialisation du projet, structure des répertoires et données de calibration.

- [x] T001 Créer la structure de répertoires `src/domain/coaching/` et `src/bots/friends/` conformément au plan dans [plan.md](plan.md)
- [x] T002 [P] Copier et versionner le backup Untapped dans `data/untapped_history/drafts_backup.json` avec `.gitattributes` LFS ou ignore approprié
- [x] T003 [P] Ajouter les barrel exports `src/domain/coaching/index.ts` et `src/bots/friends/index.ts`

---

## Phase 2: Foundational (Prérequis Bloquants)

**Purpose**: Types de domaine et interfaces partagées entre US1 et US2. DOIT être terminée avant toute User Story.

> [!CRITICAL]
> Aucune tâche de User Story ne peut commencer tant que cette phase n'est pas complète.

- [x] T004 Définir le type `MtGColor` et l'interface `CardEvaluationInput` dans `src/domain/coaching/types.ts` — cf. [data-model.md § 1](data-model.md)
- [x] T005 [P] Définir l'interface `CoachingScoreBreakdown` dans `src/domain/coaching/types.ts` — cf. [data-model.md § 2](data-model.md)
- [x] T006 [P] Définir l'interface `CardEvaluation` dans `src/domain/coaching/types.ts` — cf. [data-model.md § 3](data-model.md)
- [x] T007 [P] Définir l'interface `PackEvaluationContext` dans `src/domain/coaching/types.ts` — cf. [data-model.md § 4](data-model.md)
- [x] T008 [P] Définir les types `FriendStyleBiases`, `FriendSkillLevel` et `FriendProfile` dans `src/domain/coaching/types.ts` — cf. [data-model.md § 5-6](data-model.md)

**Checkpoint**: Tous les types de domaine sont en place — l'implémentation des User Stories peut démarrer.

---

## Phase 3: User Story 1 — Coaching Pédagogique en temps réel (Priority: P1) 🎯 MVP

**Goal**: Le joueur reçoit pour chaque carte d'un booster un score dynamique contextuel et une explication pédagogique en français.

**Independent Test**: Évaluer un booster de 15 cartes à P1P1 (scores dynamiques = statiques) puis à P1P5 avec un pool Esper (pénalités hors-couleur et bonus mana fix visibles).

### Tests pour User Story 1

> **NOTE: Écrire ces tests EN PREMIER, vérifier qu'ils ÉCHOUENT avant d'implémenter**

- [x] T009 [P] [US1] Test unitaire : au P1P1, `dynamicScore === staticScore` pour toutes les cartes dans `tests/unit/coaching/dynamic-score.test.ts` — vérifie INV-001
- [x] T010 [P] [US1] Test unitaire : la courbe d'engagement (`commitment`) croît de façon monotone de 0.0 à ~0.95 dans `tests/unit/coaching/dynamic-score.test.ts` — vérifie INV-003, FR-003
- [x] T011 [P] [US1] Test unitaire : les cartes incolores non-terrains ne subissent aucune pénalité de couleur dans `tests/unit/coaching/dynamic-score.test.ts` — vérifie INV-002, FR-004
- [x] T012 [P] [US1] Test unitaire : un terrain bicolore dans les couleurs dominantes reçoit un bonus de fixation +3.5 pts dans `tests/unit/coaching/dynamic-score.test.ts` — vérifie FR-005
- [x] T013 [P] [US1] Test unitaire : une carte verte puissante subit une pénalité hors-couleur dans un pool Esper dans `tests/unit/coaching/dynamic-score.test.ts` — vérifie AS-2 de US1
- [x] T014 [P] [US1] Test unitaire : l'évaluation d'un pack renvoie une liste ordonnée par score dynamique décroissant dans `tests/unit/coaching/dynamic-score.test.ts` — vérifie contrat `evaluatePack`
- [x] T015 [US1] Test d'intégration : benchmark P1P1 contre les 315 cartes réelles de `data/untapped_history/drafts_backup.json` dans `tests/integration/coaching/untapped-benchmark.test.ts` — vérifie SC-001

### Implémentation pour User Story 1

- [x] T016 [US1] Implémenter `computeCommitment(packNumber, pickNumber)` dans `src/domain/coaching/dynamic-score.ts` — cf. [research.md § 1](research.md) (courbe sigmoïde, FR-003)
- [x] T017 [US1] Implémenter `computeColorFrequencies` et `getDominantColors` dans `src/domain/coaching/dynamic-score.ts` — extraction des 2 couleurs dominantes du pool
- [x] T018 [US1] Implémenter `calculateColorOverlap` dans `src/domain/coaching/dynamic-score.ts` — facteur d'affinité multiplicatif [0.05, 1.0]
- [x] T019 [US1] Implémenter `evaluateCard(card, context)` dans `src/domain/coaching/dynamic-score.ts` — agrège commitment × affinité × staticScore + bonus mana + bonus courbe (FR-001, FR-002, FR-006)
- [x] T020 [US1] Implémenter `evaluatePack(context)` dans `src/domain/coaching/dynamic-score.ts` — évalue toutes les cartes et trie par dynamicScore décroissant
- [x] T021 [US1] Implémenter `generateCoachingExplanation(evaluation, context)` dans `src/domain/coaching/coaching-explainer.ts` — texte pédagogique en français (FR-007) : recommandation top, alerte piège, alternative viable
- [x] T022 [US1] Implémenter `createCoachedBotPolicy(options)` dans `src/bots/coached-bot-policy.ts` — politique `PickPolicy` choisissant systématiquement la carte de plus haute note dynamique

**Checkpoint**: Le coaching pédagogique est fonctionnel et testable indépendamment. ✅ MVP livrable.

---

## Phase 4: User Story 2 — Bots Personnalisés incarnant les Amis (Priority: P1)

**Goal**: Sept bots reproduisent les personnalités des amis du groupe Magic avec des styles, températures Softmax et biais distincts.

**Independent Test**: Faire choisir à Nico (Spike, T=0.8) et Ivan (Timmy, T=1.5) dans le même booster contenant un removal à 1 mana et une créature 6+ manas ; vérifier que leurs décisions divergent selon leurs profils.

### Tests pour User Story 2

- [x] T023 [P] [US2] Test unitaire : Nico (Spike) choisit le removal compétitif plutôt que la grosse créature dans `tests/unit/bots/friend-bot-policy.test.ts` — vérifie AS-1 de US2
- [x] T024 [P] [US2] Test unitaire : Ivan (Timmy) favorise la créature colossale avec son biais `highCmcBonus` dans `tests/unit/bots/friend-bot-policy.test.ts` — vérifie AS-2 de US2
- [x] T025 [P] [US2] Test unitaire : Hugues (Johnny osé) privilégie l'artefact synergique atypique avec son biais `weirdEngineBonus` dans `tests/unit/bots/friend-bot-policy.test.ts` — vérifie AS-3 de US2
- [x] T026 [P] [US2] Test unitaire : `createFriendTablePolicies` renvoie `null` au siège 0 (joueur humain) et 7 instances `PickPolicy` aux sièges 1 à 7 dans `tests/unit/bots/friend-bot-policy.test.ts` — vérifie contrat table-setup

### Implémentation pour User Story 2

- [x] T027 [P] [US2] Définir les 7 constantes de profils d'amis (`NICO`, `CEDRIC`, `HUGUES`, `REMI`, `PAPAYOU`, `IVAN`, `TITOU`) dans `src/bots/friends/profiles.ts` — cf. [research.md § 2](research.md) (FR-008, FR-009)
- [x] T028 [US2] Implémenter `createFriendBotPolicy(options)` dans `src/bots/friends/friend-bot-policy.ts` — tirage Softmax pondéré par température et biais de style (FR-010), utilisant `uniformInt(rng, 0, 10_000_000)` de `pure-rand`
- [x] T029 [US2] Implémenter `DEFAULT_FRIEND_SEAT_PROFILES` et `createFriendTablePolicies(options)` dans `src/bots/friends/table-setup.ts` — configuration des 8 sièges avec siège 0 = null (joueur humain)

**Checkpoint**: Les 7 bots amis sont fonctionnels et testables indépendamment. Chaque personnalité est vérifiable.

---

## Phase 5: User Story 3 — Reproductibilité, Déterminisme et Relecture (Priority: P2)

**Goal**: À graine identique, les 7 bots font exactement les mêmes choix d'une exécution à l'autre.

**Independent Test**: Exécuter deux fois la même simulation complète avec la même seed et les 7 bots amis ; vérifier que tous les choix de tous les sièges sont strictement identiques.

### Tests pour User Story 3

- [x] T030 [P] [US3] Test unitaire : un bot ami produit exactement la même séquence de choix sur 2 exécutions avec la même graine dans `tests/unit/bots/friend-bot-policy.test.ts` — vérifie INV-005, AS-1 de US3
- [x] T031 [US3] Test d'intégration : deux simulations complètes de 45 tours avec les 7 bots amis et la même seed produisent des journaux fonctionnellement identiques dans `tests/integration/coaching/determinism.test.ts` — vérifie SC-003, AS-1 de US3

### Implémentation pour User Story 3

- [x] T032 [US3] Vérifier que le tirage Softmax dans `src/bots/friends/friend-bot-policy.ts` consomme exclusivement le flux de graine dérivé `policy:seat:X` via `deriveStreamSeed` — vérifie AS-2 de US3
- [x] T033 [US3] Ajouter la provenance et la version de l'engine dans les métadonnées de chaque policy (`id: 'friend:<name>@1'`, `version: '1'`) dans `src/bots/friends/friend-bot-policy.ts` — vérifie Constitution Principe III

**Checkpoint**: Le déterminisme bit-à-bit est prouvé par les tests.

---

## Phase 6: User Story 4 — Évaluation de Deck & Graphe de Kiviat 5 Axes (Priority: P1)

**Goal**: Évaluer tout deck de 40 cartes sur un Score Global sur 100 et générer le Graphe de Kiviat à 5 Axes contextualisé par l'archétype (Puissance, Synergie, Courbe adaptée, Base de mana avec dorks/cailloux, Interaction).

**Independent Test**: Évaluer le build de 40 cartes issu du draft témoin (`d555b02d-3745-4a4f-b1b6-fdc75c38c5c0`) ; vérifier qu'il est classifié en Esper Control, qu'il obtient un score global > 80/100, et que les 5 axes sont correctement ventilés.

### Tests pour User Story 4

- [x] T034 [P] [US4] Test unitaire : détection et classification automatique d'archétype (`detectArchetype`) sur Esper Control, Boros Aggro, Mono-Green Ramp dans `tests/unit/coaching/deck-evaluation.test.ts` — vérifie FR-012
- [x] T035 [P] [US4] Test unitaire : calcul des 5 axes du radar Kiviat avec prise en compte des mana dorks et cailloux dans la base de mana et calibrage de courbe selon l'archétype dans `tests/unit/coaching/deck-evaluation.test.ts` — vérifie FR-013, FR-014, FR-016
- [x] T036 [US4] Test d'intégration : évaluation du deck témoin complet de 40 cartes dans `tests/integration/coaching/deck-evaluation-witness.test.ts` — vérifie SC-005

### Implémentation pour User Story 4

- [x] T037 [US4] Implémenter la détection d'archétype et de profil de couleurs (`detectArchetype`) dans `src/domain/coaching/deck-archetypes.ts` — vérifie FR-012
- [x] T038 [US4] Implémenter le calcul des 5 axes de Kiviat et du score global (`evaluateDeck`, `computeKiviatRadar`) dans `src/domain/coaching/deck-evaluation.ts` — vérifie FR-013, FR-014, FR-016, INV-006, INV-007
- [x] T039 [US4] Implémenter le générateur de propositions de build automatiques (`recommendDeckBuilds`) dans `src/domain/coaching/deck-recommender.ts` — vérifie FR-015

**Checkpoint**: L'évaluation de deck final sur 5 axes est opérationnelle et validée sur le deck témoin.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Démonstrations, documentation, performance et validation qualité gate complète.

- [x] T040 [P] Créer le script de démo coaching dans `scripts/demo-coaching-pack.ts` — reproduit l'évaluation d'un booster P1P5 avec sortie pédagogique en français
- [x] T041 [P] Créer le script de démo bots amis dans `scripts/demo-friends-draft.ts` — simule les choix P1P1 des 8 sièges avec affichage des personnalités
- [x] T042 [P] Créer le script de démo évaluation de deck dans `scripts/demo-deck-evaluation.ts` — évalue le deck témoin Esper et affiche le radar Kiviat
- [x] T043 [P] Valider la performance : évaluation de 15 cartes en < 1 ms dans `tests/unit/coaching/dynamic-score.test.ts` — vérifie SC-002
- [x] T044 Exécuter la quality gate complète : `npm run check` (Prettier, ESLint, tsc, Vitest, coverage) — vérifie SC-004
- [x] T045 [US4] Versionner et exposer l'audit complet de `evaluateDeck` (formule, contributions, bombes top 5 %, mana rapide, packages, courbe effective, mana et interaction contextualisée) dans le domaine et le rapport HTML — vérifie FR-013, FR-014, FR-021
- [x] T046 [US4] Capturer les cinq decks trophées Powered Cube fournis comme fixtures de calibration qualitatives et documenter les limites de couverture du catalogue dans `data/calibration/powered-cube-trophy-decks-v1.json` et `docs/research/powered-cube-trophy-deck-calibration-2026-09-07.md`
- [x] T047 [US4] Ajouter les tests de non-régression des packages Powered Cube, de la courbe effective, du mana, des interactions adaptées au plan et du témoin Esper ; régénérer les rapports seed 42 et exécuter `npm run check`
- [x] T045 Compléter `specs/002-coaching-friend-bots/quickstart.md` avec les commandes de test et démo à jour
- [x] T046 Rédiger la checklist de vérification des exigences dans `specs/002-coaching-friend-bots/checklists/requirements.md`
- [x] T047 Rédiger la preuve de conformité domaine dans `specs/002-coaching-friend-bots/checklists/domain-qa.md`

---

## Phase 8: User Story 6 — Matrice Visuelle & Référentiel Multi-Cubes Communautaires (Priority: P1)

**Purpose**: Intégration du catalogue unifié multi-cubes (Titou Tribal, Nico Candyshop, Hugues Pauper), de l'importateur CubeCobra, de la matrice visuelle type *Limited Grades* et des bannières de couverture.

- [x] T048 [P] [US6] Définir les schémas JSON et types TypeScript pour le catalogue unifié multi-cubes (`data/schemas/card.schema.json`, `data/schemas/cube.schema.json`, `data/schemas/cube-meta.schema.json`, `src/cards/types.ts`)
- [x] T049 [US6] Développer le catalogue modulaire unifié (`src/cards/card-catalog.ts`) supportant l'indexation par `oracleId`, slug, couleur et `cubeKey`
- [x] T050 [US6] Implémenter l'importateur CubeCobra de Nico's Candyshop (`scripts/import-nico-candyshop.mjs`) : 730 cartes, préservation de la bannière `candyShop.jpg`, mapping des skins alternatives (LotR, Street Fighter) vers cartes canoniques
- [x] T051 [US6] Implémenter l'importateur et traducteur officiel Scryfall français (`scripts/fetch-french-cards.mjs`) pour le support bilingue FR/EN
- [x] T052 [US6] Développer la matrice visuelle web interactive (`src/web/app.js`, `src/web/index.html`, `src/web/styles.css`) : disposition en colonnes par couleur, classement par Tiers S/A/B/C/D, en-têtes collants, badges de Power Ranking numériques, héros de cube avec bannières `TTCC.png` et `candyShop.jpg`
- [x] T053 [US6] Valider la conformité stricte aux schémas JSON de 100% des 1 100+ documents de cartes individuels dans `data/cards/items/` (`tests/unit/cards/card-schema-validation.test.ts`, `tests/unit/cards/card-catalog-directory.test.ts`)
- [x] T054 [US6] Exécuter et valider la suite de tests complète (218 tests) et la quality gate (`npm run check`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Aucune dépendance — peut démarrer immédiatement.
- **Foundational (Phase 2)**: Dépend de Phase 1 — **BLOQUE** toutes les User Stories.
- **User Stories (Phases 3, 4, 5, 6)**: Dépendent de Phase 2.
  - **US1 (Phase 3)** et **US2 (Phase 4)** sont indépendantes et parallélisables.
  - **US3 (Phase 5)** nécessite US2 (car elle teste le déterminisme des bots amis).
  - **US4 (Phase 6)** utilise les métadonnées et la logique des 5 axes de US1.
- **Polish (Phase 7)**: Dépend de toutes les User Stories complétées.

### User Story Dependencies

- **US1 (P1 — Coaching)**: Indépendante après Phase 2. Aucune dépendance sur US2/US3.
- **US2 (P1 — Bots Amis)**: Indépendante après Phase 2. Utilise le moteur de score dynamique de US1 (dépendance faible, les profils appliquent `evaluateCard` mais peuvent fonctionner en isolation avec un stub).
- **US3 (P2 — Déterminisme)**: Dépend de US2 (besoin des 7 bots amis complets pour le test de reproductibilité sur 45 tours).

### Within Each User Story

- Tests DOIVENT être écrits et DOIVENT ÉCHOUER avant l'implémentation.
- Types avant fonctions.
- Fonctions pures avant politiques de bot.
- Implémentation complète avant passage à la story suivante.

### Parallel Opportunities

- **Phase 1** : T001, T002, T003 sont parallélisables.
- **Phase 2** : T004 d'abord (type de base), puis T005–T008 en parallèle.
- **Phase 3** : T009–T015 (tous les tests) en parallèle ; T016–T018 en parallèle ; T021 et T022 en parallèle une fois T019–T020 terminées.
- **Phase 4** : T023–T026 (tests) en parallèle ; T027 et T028/T029 en parallèle.
- **Phase 6** : T034, T035, T036 en parallèle.

---

## Parallel Example: User Story 1

```bash
# Lancer tous les tests US1 ensemble :
Task: "Test P1P1 identité statique" (T009)
Task: "Test monotonie commitment" (T010)
Task: "Test immunité incolore" (T011)
Task: "Test bonus fixation mana" (T012)
Task: "Test pénalité hors-couleur" (T013)
Task: "Test tri décroissant" (T014)

# Lancer les fonctions de calcul en parallèle :
Task: "computeCommitment" (T016)
Task: "computeColorFrequencies + getDominantColors" (T017)
Task: "calculateColorOverlap" (T018)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Compléter Phase 1 : Setup
2. Compléter Phase 2 : Foundational (CRITIQUE — bloque tout)
3. Compléter Phase 3 : User Story 1 (Coaching Pédagogique)
4. **STOP et VALIDER** : Tester US1 indépendamment avec `npx vitest run tests/unit/coaching/ tests/integration/coaching/`
5. Démo avec `npx tsx scripts/demo-coaching-pack.ts`

### Incremental Delivery

1. Setup + Foundational → Types prêts
2. US1 (Coaching) → Tester → Démo (MVP ! 🎯)
3. US2 (Bots Amis) → Tester → Démo (les 7 potes draftent !)
4. US3 (Déterminisme) → Tester → Preuve reproductibilité
5. Polish → Quality gate, documentation, checklists

### Notes

- `[P]` = fichiers différents, aucune dépendance → parallélisable
- `[USx]` = rattache la tâche à la User Story pour traçabilité
- Chaque User Story est indépendamment complétable et testable
- Commiter après chaque tâche ou groupe logique
- Arrêt possible à chaque checkpoint pour valider la story
