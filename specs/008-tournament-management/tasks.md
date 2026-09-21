---

description: "Dependency-ordered implementation tasks for tournament management"
---

# Tasks: Gestion de tournois de cube

**Input**: Design documents from `specs/008-tournament-management/`

**Prerequisites**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/http-api.md`, reviewer checklist

**Tests**: Obligatoires. Chaque règle de domaine suit un cycle rouge → vert via l'interface publique confirmée. Aucun refactoring n'est inclus dans le cycle ; il appartient à la revue.

**Organization**: Les phases suivent les cinq User Stories du périmètre. La reconnaissance photo est suivie séparément par l'Issue #81 et ne fait pas partie de cette feature.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: exécutable en parallèle sans modifier le même fichier ni dépendre d'une tâche inachevée
- **[Story]**: User Story correspondante de `spec.md`
- Chaque description contient le chemin exact de livraison

## Phase 1: Setup et gates humains

**Purpose**: Valider les seams et préparer les emplacements sans modifier le comportement produit.

- [ ] T001 Faire confirmer par le reviewer les seams `TournamentCoordinator`, `TournamentStore` et HTTP dans `specs/008-tournament-management/plan.md`, puis consigner la décision dans `specs/008-tournament-management/qa-evidence.md`
- [ ] T002 Faire examiner la checklist requirements-quality et laisser le reviewer marquer ses décisions dans `specs/008-tournament-management/checklists/tournament-release.md`
- [ ] T003 [P] Créer le squelette d'export `src/tournaments/index.ts` et les dossiers `src/tournaments/internal/`, `tests/unit/tournaments/` sans ajouter de règle métier
- [ ] T004 [P] Créer le squelette de preuves avec sections local/base/validé/committé/poussé dans `specs/008-tournament-management/qa-evidence.md`

**Checkpoint**: Les seams sont explicitement acceptés et la checklist reviewer ne contient aucun blocage non traité.

---

## Phase 2: Fondations partagées

**Purpose**: Interfaces et fixtures nécessaires à toutes les stories.

**CRITICAL**: Cette phase bloque toute implémentation de User Story.

- [ ] T005 [P] Définir résultats typés, erreurs, commandes, événements, projections, `TournamentCoordinator`, `TournamentStore` et `TournamentCubeCatalog` dans `src/tournaments/types.ts`
- [ ] T006 [P] Ajouter les builders de tournoi, participants, snapshots et horloge contrôlée dans `tests/helpers/tournament-fixtures.ts`
- [ ] T007 Écrire un test rouge du contrat révision/idempotence de store dans `tests/contract/tournament-management.test.ts`
- [ ] T008 Implémenter uniquement le contrat rouge dans `src/tournaments/in-memory-store.ts` et exporter l'adapter depuis `src/tournaments/index.ts`
- [ ] T009 [P] Définir la projection snapshot-bound des cubes sélectionnables et l'adapter de registre dans `src/tournaments/cube-catalog.ts`
- [ ] T010 [P] Définir les types de fractions exactes, standings et preuves d'Appariement dans `src/tournaments/internal/types.ts`
- [ ] T011 Valider les fondations avec `npm run typecheck` et le test ciblé `tests/contract/tournament-management.test.ts`, puis consigner le résultat dans `specs/008-tournament-management/qa-evidence.md`

**Checkpoint**: Les interfaces sont stables, l'adapter mémoire respecte la révision/idempotence et aucune règle de tournoi n'est encore anticipée.

---

## Phase 3: User Story 1 — Créer et préparer un tournoi (Priority: P1)

**Goal**: Créer, configurer, persister et rouvrir un tournoi en préparation avec cube, participants et Decks déclarés.

**Independent Test**: Créer quatre participants et leurs decks, quitter puis recharger par l'interface publique et retrouver exactement la configuration.

### Cycles TDD et implémentation

- [ ] T012 [US1] Écrire le test rouge de création et liste historique via `TournamentCoordinator` dans `tests/unit/tournaments/coordinator.test.ts`
- [ ] T013 [US1] Implémenter la création minimale et `TournamentCreated` dans `src/tournaments/coordinator.ts` et `src/tournaments/internal/state-reducer.ts`
- [ ] T014 [US1] Écrire le test rouge de remplacement de setup, unicité normalisée, limites 2–32 et refus sans mutation dans `tests/unit/tournaments/coordinator.test.ts`
- [ ] T015 [US1] Implémenter `TournamentSetupReplaced`, validation du cube et conservation des identités participant dans `src/tournaments/coordinator.ts` et `src/tournaments/internal/state-reducer.ts`
- [ ] T016 [P] [US1] Écrire les tests HTTP rouges de catalogue, création, setup, liste et détail dans `tests/integration/tournament-management-http.test.ts`
- [ ] T017 [US1] Implémenter les routes de préparation du contrat dans `src/tournaments/http-handler.ts`
- [ ] T018 [US1] Écrire le test d'intégration rouge de transaction atomique, archive snapshot, rôles privés, indisponibilité, timeout et reload sans fallback dans `tests/integration/tournament-management-postgres.test.ts`
- [ ] T019 [US1] Créer tables, indexes, contraintes, RLS et RPC transactionnelle dans `supabase/migrations/202609210001_tournament_management.sql`
- [ ] T020 [US1] Implémenter le gateway réel et l'adapter PostgreSQL sans fallback silencieux dans `src/tournaments/supabase-store.ts`
- [ ] T021 [US1] Documenter l'application de migration et la clé serveur obligatoire dans `supabase/README.md`
- [ ] T022 [US1] Monter le coordinateur et le handler injectables dans `scripts/serve-web.mjs` et `scripts/serve-web.d.mts`, puis couvrir GET et mutation protégés par le gate partagé dans `tests/integration/site-auth-gate.test.ts`
- [ ] T023 [US1] Écrire le parcours navigateur rouge historique → création → setup → réouverture dans `tests/browser/tournament-management.spec.ts`
- [ ] T024 [US1] Remplacer le teaser par historique et formulaire de préparation dans `src/web/index.html`, `src/web/tournaments.js`, `src/web/app.js` et `src/web/styles.css`
- [ ] T025 [US1] Mettre à jour les assertions qui qualifient encore Tournois de teaser dans `tests/integration/web-navigation-mobile-qa.test.ts`
- [ ] T026 [US1] Exécuter les tests US1 ciblés et consigner la preuve locale et PostgreSQL dans `specs/008-tournament-management/qa-evidence.md`

**Checkpoint**: US1 est démontrable seule, y compris après reload PostgreSQL. Aucun Appariement n'est encore publié.

---

## Phase 4: User Story 2 — Lancer et suivre des rondes suisses (Priority: P1)

**Goal**: Verrouiller un tournoi valide, publier des Appariements suisses déterministes, équitables et auditables, puis créer les rondes suivantes.

**Independent Test**: Un tournoi de cinq participants déroule trois rondes sans doublon interne ni deuxième bye prématuré, avec les mêmes Appariements après replay.

### Cycles TDD et implémentation

- [ ] T027 [US2] Écrire via `TournamentCoordinator` le test rouge de première ronde seedée et Exemption suisse 2-0 dans `tests/unit/tournaments/pairing.test.ts`
- [ ] T028 [US2] Implémenter l'ordre seedé, la sélection du bye et la preuve de première ronde dans `src/tournaments/internal/pairing.ts`
- [ ] T029 [US2] Écrire via `TournamentCoordinator` le test rouge d'un cas où un greedy crée un rematch évitable dans `tests/unit/tournaments/pairing.test.ts`
- [ ] T030 [US2] Implémenter le matching branch-and-bound à coûts entiers et raisons float/rematch dans `src/tournaments/internal/pairing.ts`
- [ ] T031 [US2] Écrire via `TournamentCoordinator` les propriétés rouges 2–32 joueurs : unicité, absence d'auto-match, bye unique, déterminisme et absence de rematch évitable vérifiée par un oracle de faisabilité indépendant dans `tests/unit/tournaments/pairing.property.test.ts`
- [ ] T032 [US2] Étendre l'implémentation du solveur jusqu'à rendre vert le corpus de propriétés dans `src/tournaments/internal/pairing.ts`
- [ ] T033 [US2] Écrire via `TournamentCoordinator` les tests rouges points, OMW%, GWP%, OGW%, moyenne sans adversaire, plancher 1/3 et égalité exacte dans `tests/unit/tournaments/standings.test.ts`
- [ ] T034 [US2] Implémenter les fractions exactes et le classement dérivé dans `src/tournaments/internal/standings.ts`
- [ ] T035 [US2] Écrire les tests rouges de démarrage atomique, verrouillage et ronde suivante refusée si incomplète dans `tests/unit/tournaments/coordinator.test.ts`
- [ ] T036 [US2] Implémenter `TournamentStarted` et `RoundPublished` dans `src/tournaments/coordinator.ts` et `src/tournaments/internal/state-reducer.ts`
- [ ] T037 [US2] Écrire les tests HTTP rouges de démarrage concurrent et prochaine ronde dans `tests/integration/tournament-management-http.test.ts`
- [ ] T038 [US2] Ajouter les routes start/rounds et le mapping des conflits dans `src/tournaments/http-handler.ts`
- [ ] T039 [US2] Écrire le parcours navigateur rouge ronde suisse, tables, bye, classement et conflit de révision dans `tests/browser/tournament-management.spec.ts`
- [ ] T040 [US2] Implémenter l'écran ronde/classement et les annonces accessibles dans `src/web/tournaments.js`, `src/web/index.html` et `src/web/styles.css`
- [ ] T041 [US2] Ajouter dans `tests/integration/tournament-management-performance.test.ts` les benchmarks reproductibles du solveur à 32 participants sous 100 ms p95 et, avec 100 tournois archivés, des créations, mutations et consultations sous 2 s p95 dans l'environnement documenté
- [ ] T042 [US2] Exécuter les tests US2 ciblés et consigner seed, version, hash, propriétés et mesure p95 dans `specs/008-tournament-management/qa-evidence.md`

**Checkpoint**: Le suisse peut être démontré avec des Appariements reproductibles et un classement auditable, même sans saisie web complète des résultats.

---

## Phase 5: User Story 3 — Enregistrer résultats et classement (Priority: P1)

**Goal**: Saisir, corriger et historiser les scores, recalculer le classement et finaliser un tournoi sans réécrire les rondes publiées.

**Independent Test**: Un résultat saisi puis corrigé conserve les deux versions ; le classement courant change et les Appariements publiés restent identiques.

### Cycles TDD et implémentation

- [ ] T043 [US3] Écrire le test rouge de score joué, nul, forfait et refus de score invalide sans mutation dans `tests/unit/tournaments/coordinator.test.ts`
- [ ] T044 [US3] Implémenter `MatchResultRecorded`, dérivation d'issue et complétion de ronde dans `src/tournaments/coordinator.ts` et `src/tournaments/internal/state-reducer.ts`
- [ ] T045 [US3] Écrire le test rouge de correction append-only avec motif et classement recalculé dans `tests/unit/tournaments/coordinator.test.ts`
- [ ] T046 [US3] Implémenter `MatchResultCorrected` sans modifier `PairingEvidence` ni ronde publiée dans `src/tournaments/coordinator.ts` et `src/tournaments/internal/state-reducer.ts`
- [ ] T047 [US3] Écrire le test rouge de drop et forfaits explicites dans `tests/unit/tournaments/coordinator.test.ts`
- [ ] T048 [US3] Implémenter `ParticipantDropped` et l'exclusion des rondes futures dans `src/tournaments/coordinator.ts`
- [ ] T049 [US3] Écrire le test rouge de finalisation complète et correction post-finalisation dans `tests/unit/tournaments/coordinator.test.ts`
- [ ] T050 [US3] Implémenter `TournamentCompleted` et mutations auditables autorisées après completion dans `src/tournaments/coordinator.ts`
- [ ] T051 [US3] Écrire les tests HTTP rouges result/drop/complete, retry et concurrence dans `tests/integration/tournament-management-http.test.ts`
- [ ] T052 [US3] Ajouter les routes result/drop/complete dans `src/tournaments/http-handler.ts`
- [ ] T053 [US3] Étendre le test PostgreSQL aux corrections, receipts, replay et redémarrage dans `tests/integration/tournament-management-postgres.test.ts`
- [ ] T054 [US3] Écrire le parcours navigateur rouge saisie, correction, historique de versions et finalisation dans `tests/browser/tournament-management.spec.ts`
- [ ] T055 [US3] Implémenter formulaires de résultat, correction, abandon et détail terminé dans `src/web/tournaments.js`, `src/web/index.html` et `src/web/styles.css`
- [ ] T056 [US3] Exécuter les tests US3 ciblés et consigner concurrence, correction et replay dans `specs/008-tournament-management/qa-evidence.md`

**Checkpoint**: Le MVP manuel utile US1+US2+US3 est complet : créer, jouer un suisse, historiser et rouvrir.

---

## Phase 6: User Story 4 — Toutes-rondes à trois (Priority: P2)

**Goal**: Planifier les trois paires uniques et une Pause toutes-rondes sans point par participant.

**Independent Test**: Alice-Bob, Alice-Chloé et Bob-Chloé apparaissent une fois, sans match fictif ni point de pause.

- [ ] T057 [US4] Écrire via `TournamentCoordinator` le test rouge du calendrier trois joueurs, pauses et refus avec un autre effectif dans `tests/unit/tournaments/pairing.test.ts`
- [ ] T058 [US4] Implémenter le calendrier versionné `round-robin-three` dans `src/tournaments/internal/pairing.ts`
- [ ] T059 [US4] Écrire le test rouge de démarrage publiant les trois rondes indépendantes des résultats dans `tests/unit/tournaments/coordinator.test.ts`
- [ ] T060 [US4] Implémenter la publication atomique des trois rondes dans `src/tournaments/coordinator.ts`
- [ ] T061 [US4] Étendre le parcours HTTP et navigateur au choix de format, pauses et classement dans `tests/integration/tournament-management-http.test.ts` et `tests/browser/tournament-management.spec.ts`
- [ ] T062 [US4] Afficher les trois rondes et les pauses sans libellé de bye dans `src/web/tournaments.js` et `src/web/index.html`
- [ ] T063 [US4] Exécuter les tests US4 ciblés et consigner les trois paires et l'absence de points de pause dans `specs/008-tournament-management/qa-evidence.md`

**Checkpoint**: Le cas amical à trois est indépendant du solveur suisse et respecte les mêmes résultats/classements pour les matchs joués.

---

## Phase 7: User Story 5 — Cartes clés manuelles (Priority: P2)

**Goal**: Associer des Cartes clés du Snapshot archivé aux Decks déclarés sans effet sur classement ou Appariements.

**Independent Test**: Une carte du cube réapparaît après reload ; une carte absente est refusée ; les standings et pairings sont bit-à-bit inchangés.

- [ ] T064 [US5] Écrire le test rouge d'ajout/remplacement/déduplication et refus hors Snapshot dans `tests/unit/tournaments/coordinator.test.ts`
- [ ] T065 [US5] Implémenter `DeckKeyCardsUpdated` et validation par `oracleId` dans `src/tournaments/coordinator.ts` et `src/tournaments/internal/state-reducer.ts`
- [ ] T066 [US5] Écrire le test rouge d'invariance classement/Appariements avant-après Cartes clés dans `tests/unit/tournaments/coordinator.test.ts`
- [ ] T067 [US5] Rendre vert le test d'invariance et exposer la projection du deck dans `src/tournaments/coordinator.ts`
- [ ] T068 [US5] Ajouter le test HTTP rouge puis la route key-cards dans `tests/integration/tournament-management-http.test.ts` et `src/tournaments/http-handler.ts`
- [ ] T069 [US5] Écrire le parcours navigateur rouge de recherche et sélection manuelle dans `tests/browser/tournament-management.spec.ts`
- [ ] T070 [US5] Implémenter la recherche dans le Snapshot et les Cartes clés dans `src/web/tournaments.js`, `src/web/index.html` et `src/web/styles.css`
- [ ] T071 [US5] Exécuter les tests US5 ciblés et consigner identité Oracle, reload et invariance dans `specs/008-tournament-management/qa-evidence.md`

**Checkpoint**: Le parcours manuel complet demandé est fonctionnel sans dépendance de vision.

---

## Phase 8: Polish et gates transverses

**Purpose**: Vérifier l'ensemble sans élargir le périmètre.

- [ ] T072 [P] Ajouter métriques structurées pour store indisponible, conflits, rematches forcés et latence sans données sensibles dans `src/tournaments/observability.ts`
- [ ] T073 [P] Relier `/health/ready` à la disponibilité réelle du store tournoi dans `scripts/serve-web.mjs` et couvrir le contrat dans `tests/integration/tournament-management-http.test.ts`
- [ ] T074 [P] Ajouter états vide, chargement, erreur et révision stale accessibles dans `src/web/tournaments.js`, `src/web/index.html` et `src/web/styles.css`
- [ ] T075 Exécuter les scénarios de `specs/008-tournament-management/quickstart.md` et consigner chaque résultat dans `specs/008-tournament-management/qa-evidence.md`
- [ ] T076 Exécuter `npm run format:check`, `npm run lint`, `npm run typecheck` et les tests ciblés tournoi, puis consigner sorties et éventuels écarts dans `specs/008-tournament-management/qa-evidence.md`
- [ ] T077 Exécuter `npm run test`, `npm run test:coverage`, `npm run test:browser` et `git diff --check`, puis consigner résultats complets dans `specs/008-tournament-management/qa-evidence.md`
- [ ] T078 Réaliser la revue Standards + Spec depuis le point fixe de la branche et consigner les findings dans `specs/008-tournament-management/qa-evidence.md`
- [ ] T079 Exécuter `$speckit-converge` et ajouter tout travail manquant dans `specs/008-tournament-management/tasks.md`
- [ ] T080 Réaliser avec un organisateur et quatre participants le test utilisateur chronométré SC-001/SC-009, puis consigner réussites, aides nécessaires et durée dans `specs/008-tournament-management/qa-evidence.md`
- [ ] T081 Mettre à jour l'Issue #80 avec liens d'artefacts, preuves et risques restants, puis préparer la PR sans fusion automatique dans `specs/008-tournament-management/qa-evidence.md`

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1**: aucun prérequis technique ; T001 et T002 sont des gates humains bloquants avant tout test.
- **Phase 2**: dépend de la confirmation des seams ; bloque toutes les User Stories.
- **US1**: dépend des fondations et livre la préparation persistée.
- **US2**: dépend des interfaces fondatrices ; utilise des fixtures et reste testable sans UI US1.
- **US3**: dépend de US2 pour disposer de Matchs de tournoi publiés.
- **US4**: dépend du coordinateur et des résultats de US3, mais pas du solveur suisse interne.
- **US5**: dépend de US1 et du Snapshot archivé ; n'a aucune dépendance sur les règles de pairings.
- **Polish**: dépend de toutes les stories retenues pour la release.

### User Story graph

```text
Setup -> Foundations -> US1 -> US2 -> US3 -> Manual MVP
                           \          \
                            -> US5     -> US4
Manual MVP -> Polish
```

### Within each story

- Écrire un seul test rouge observable via le seam confirmé.
- Exécuter ce test et constater l'échec attendu avant l'implémentation associée.
- Ajouter uniquement le code nécessaire pour le rendre vert.
- Passer au cycle suivant ; réserver le refactoring à T078.
- Ne jamais annoncer la persistance en base avant T018–T022 verts.

## Parallel Opportunities

- T003 et T004 peuvent avancer ensemble après accord humain.
- T005, T006, T009 et T010 touchent des fichiers distincts ; T007/T008 restent séquentiels.
- Dans US1, le test HTTP T016 peut être préparé pendant les cycles coordinateur, mais son implémentation attend T015 ; le test PostgreSQL T018 peut être préparé en parallèle.
- Les fixtures de propriété US2 et les cas de standings peuvent être préparés en parallèle après types stables ; chaque test reste suivi immédiatement de son implémentation.
- US5 peut démarrer après US1 en parallèle de US2/US3, car les Cartes clés n'affectent aucun résultat.
- La reconnaissance photo est entièrement reportée dans l'Issue #81.
- T072, T073 et T074 peuvent être préparés en parallèle après les stories retenues.

## Parallel Example: User Story 2

```text
Task A: préparer le cas rouge de rematch évitable dans tests/unit/tournaments/pairing.test.ts
Task B: préparer les cas de fractions exactes dans tests/unit/tournaments/standings.test.ts
Task C: préparer le contrat HTTP start/rounds dans tests/integration/tournament-management-http.test.ts
```

Chaque préparation est suivie de son cycle rouge → vert avant d'étendre le même seam.

## Implementation Strategy

### First independently testable increment

1. Obtenir T001/T002.
2. Terminer Setup + Foundations.
3. Livrer US1 et démontrer une préparation durable rechargée depuis PostgreSQL.
4. Stopper et valider avant d'ajouter les règles suisses.

### Minimum useful manual release

1. US1 : création et préparation.
2. US2 : rondes suisses et classement.
3. US3 : résultats, corrections et historique.
4. US4 : format trois joueurs.
5. US5 : Cartes clés manuelles.
6. Garder la reconnaissance photo hors périmètre et la tracer dans l'Issue #81.

### Delivery truth

- **Planned**: tâche écrite seulement.
- **Implemented locally**: code présent dans le worktree.
- **Wired**: adapter réellement composé dans le serveur et le navigateur.
- **Validated**: preuves ciblées et gate complet consignés.
- **Committed/Pushed**: états Git rapportés séparément.

## Notes

- Préserver `package.json`, Companion et les scripts JEV déjà modifiés hors feature.
- Les fichiers UI monolithiques sont à fort risque de collision ; relire leur diff avant chaque patch.
- Ne jamais cocher `checklists/tournament-release.md` à la place du reviewer.
- Ne pas créer d'interface photo dans cette feature ; son cadrage appartient à l'Issue #81.
- Commits éventuels : Conventional Commits focalisés, sans inclure de fichiers concurrents.
