---
description: "Taches TDD pour le Draft multijoueur amical et le Coach final partage"
---

# Tasks: Draft multijoueur amical et Coach de deck

**Input**: Documents de conception dans `specs/006-multiplayer-draft/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, confirmation humaine des seams de test

**Tests**: Obligatoires. Pour chaque tranche, ajouter un seul comportement rouge, observer l'echec attendu, implementer le minimum vert, puis refactorer avant le comportement suivant.

**Organization**: Les taches suivent les six user stories. Elles preservent les modifications locales preexistantes et ne modifient jamais les marqueurs des checklists reviewer.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: peut etre mene en parallele car le fichier et la responsabilite ne se chevauchent pas.
- **[Story]**: user story couverte.
- Chaque description nomme ses exigences et ses chemins de fichiers.

## Phase 1: Fondations testables partagees

**Purpose**: Etablir les interfaces confirmees, les fixtures et la reconstruction durable sans construire encore un parcours utilisateur.

- [x] T001 [P] Ajouter des builders de salon, participants, Snapshot et commandes avec horloge/crypto injectables dans `tests/helpers/multiplayer-draft-fixtures.ts` [FR-005, FR-009, FR-016]
- [x] T002 Ecrire puis faire echouer le premier comportement du contrat public dans `tests/contract/multiplayer-draft.test.ts` : `getLobby` retourne un Salon global vide, revisionne et sans etat prive [FR-002]
- [x] T003 Definir les types de lecture et l'interface `MultiplayerDraftCoordinator`, puis implementer ce premier comportement dans `src/multiplayer-draft/types.ts`, `src/multiplayer-draft/index.ts` et `src/multiplayer-draft/coordinator.ts` jusqu'au vert de T002 [FR-002]
- [x] T004 Ecrire via le seul `MultiplayerDraftCoordinator` un comportement rouge de reconstruction d'un Salon precharge dans `tests/contract/multiplayer-draft.test.ts` [FR-016; SC-004]
- [x] T005 Implementer le reducer pur append-only interne dans `src/multiplayer-draft/state-reducer.ts` et reconstruire une vue publique sans secret jusqu'au vert de T004 [FR-016, FR-025]
- [x] T006 Ecrire via le `MultiplayerDraftCoordinator` les comportements rouges de revision attendue, retry et deduplication concurrente `(scopeId, requestId)` dans `tests/contract/multiplayer-draft.test.ts`, en simulant uniquement le store systeme [FR-008, FR-015–FR-017; SC-003–SC-004]
- [x] T007 Implementer l'adapter local par fichier temporaire puis renommage atomique dans `src/multiplayer-draft/local-file-store.ts` et le faire passer par les comportements publics de T006 [FR-015, FR-016]
- [x] T008 [P] Ajouter tables, indexes, hash de jeton, contraintes et fonctions transactionnelles du Salon/Session dans `supabase/schema.sql`, sans affaiblir les politiques existantes [FR-008, FR-016, FR-017, FR-034, FR-035]
- [x] T009 Implementer l'adapter PostgreSQL/Supabase conforme a T006 dans `src/multiplayer-draft/supabase-store.ts`, avec erreurs explicites lorsque le stockage durable manque [FR-008, FR-016; SC-003–SC-004]

**Checkpoint**: La seam publique compile, un journal reconstruit l'etat et les deux adapters partagent le meme contrat transactionnel.

---

## Phase 2: User Story 1 - Rejoindre le Salon global (Priority: P1) MVP

**Goal**: Deux navigateurs rejoignent le meme Salon, voient une composition coherente, choisissent/verrouillent le cube et obtiennent chacun un acces prive.

**Independent Test**: Deux contextes navigateur rejoignent successivement ; le premier choisit le cube, le second le verrouille, les noms invalides/dupliques et le Salon occupe ne mutent rien.

### Tests rouges

- [x] T010 [US1] Ecrire un comportement rouge a la fois pour salon vide, nom unique, capacite, choix du cube, verrouillage au deuxieme humain et depart du premier dans `tests/unit/multiplayer-draft/coordinator-lobby.test.ts` [FR-002–FR-005, FR-036, FR-037]
- [x] T011 [US1] Ecrire les contrats HTTP rouges de `GET /lobby`, `POST /lobby/join` et projection sans secret dans `tests/integration/multiplayer-draft-http.test.ts` [FR-002–FR-004, FR-034, FR-035; SC-012]
- [X] T012 [US1] Ecrire le parcours navigateur rouge d'ouverture du menu, saisie du nom, choix du cube, copie locale du code et convergence de deux contextes dans `tests/browser/multiplayer-draft.spec.ts` [FR-001–FR-004, FR-034, FR-036, FR-037]

### Implementation minimale puis refactor

- [x] T013 [US1] Implementer les transitions `joinLobby`, `leaveLobby` et `changeCube` dans `src/multiplayer-draft/coordinator.ts`, en utilisant store, horloge et crypto injectes [FR-002–FR-005, FR-034–FR-037]
- [x] T014 [US1] Implementer le handler HTTP mince et sa redaction dans `src/multiplayer-draft/http-handler.ts` jusqu'au vert de T011 [FR-002–FR-004, FR-034, FR-035]
- [x] T015 [US1] Monter `/api/multiplayer` dans `scripts/serve-web.mjs` sans ecraser les changements locaux Solo existants [FR-001, FR-002]
- [X] T016 [US1] Remplacer le teaser par le Salon, le stockage navigateur du token et le polling revisionne dans `src/web/multiplayer-draft.js`, `src/web/index.html`, `src/web/app.js` et `src/web/styles.css` [FR-001, FR-004, FR-034, FR-036, FR-037; SC-002]
- [x] T017 [US1] Executer les tests T010–T012 et consigner le checkpoint MVP Salon dans `specs/006-multiplayer-draft/qa-evidence.md`

---

## Phase 3: User Story 2 - Demarrer quand tous les humains sont prets (Priority: P1)

**Goal**: La derniere confirmation cree exactement une table de huit, tandis que toute arrivee/depart remet les accords a zero.

**Independent Test**: Trois joueurs alternent pret/non pret, un changement de composition annule tout, puis deux confirmations concurrentes produisent une seule Session et six bots.

### Tests rouges

- [X] T018 [US2] Ecrire les tests rouges de minimum deux humains, reset des prets, ordre stable des sieges/bots et demarrage unique concurrent dans `tests/unit/multiplayer-draft/coordinator-ready.test.ts` [FR-005–FR-009; SC-001, SC-003]
- [x] T019 [US2] Ecrire le test HTTP rouge de `POST /ready` avec `expectedRevision`, `Idempotency-Key` et conflit depart/dernier pret dans `tests/integration/multiplayer-draft-http.test.ts` [FR-006–FR-008]

### Implementation minimale puis refactor

- [X] T020 [US2] Implementer `setReady` et la creation atomique de Session dans `src/multiplayer-draft/coordinator.ts` en appelant `startDraft` une seule fois [FR-005–FR-009]
- [X] T021 [US2] Exposer `POST /ready` et les erreurs stables dans `src/multiplayer-draft/http-handler.ts` jusqu'au vert de T019 [FR-006–FR-008]
- [X] T022 [US2] Afficher et rendre accessibles les huit sieges, bots, etats pret/non pret et l'attente du dernier accord dans `src/web/multiplayer-draft.js`, `src/web/index.html` et `src/web/styles.css` [FR-004–FR-009, FR-029]
- [X] T023 [US2] Ajouter au parcours `tests/browser/multiplayer-draft.spec.ts` la preuve que le premier booster commun apparait sans double session apres le dernier pret [SC-001–SC-003]

---

## Phase 4: User Story 3 - Drafter ensemble sans chronometre (Priority: P1)

**Goal**: Chaque humain choisit en prive ; six a zero bots completent le Tour ; les boosters passent ensemble pendant 45 Tours sans timer ni dependance Coach.

**Independent Test**: Une table de deux humains et six bots termine trois packs ; un humain peut attendre arbitrairement et les huit pools finissent a 45 cartes distinctes.

### Tests rouges

- [x] T024 [US3] Ecrire les tests rouges de choix humain immuable, attente des humains manquants, decisions bots et soumission groupee au moteur dans `tests/unit/multiplayer-draft/coordinator-pick.test.ts` [FR-010, FR-013, FR-015, FR-038, FR-041]
- [x] T025 [US3] Ajouter les proprietes rouges 8 sieges x 45 choix, rotations gauche/droite/gauche et absence de doublon dans `tests/unit/multiplayer-draft/coordinator-pick.property.test.ts` [FR-010–FR-012; SC-003]
- [x] T026 [US3] Ecrire les tests HTTP rouges de secret par token, double onglet, retry identique, second pick conflictuel et liste publique des seuls humains attendus dans `tests/integration/multiplayer-draft-http.test.ts` [FR-014, FR-015, FR-035; SC-012]

### Implementation minimale puis refactor

- [X] T027 [US3] Implementer `submitPick`, la collecte des choix humains, les picks bots existants et l'appel unique a `submitPickRound` dans `src/multiplayer-draft/coordinator.ts` [FR-010–FR-015, FR-038, FR-041]
- [X] T028 [US3] Exposer `POST /pick` et les vues `PlayerDraftView` redigees dans `src/multiplayer-draft/http-handler.ts` jusqu'au vert de T026 [FR-014, FR-015]
- [x] T029 [US3] Reutiliser l'experience de cartes Solo pour le booster prive, le pool et l'attente sans compte a rebours dans `src/web/multiplayer-draft.js`, `src/web/index.html` et `src/web/styles.css` [FR-010, FR-013, FR-014, FR-029]
- [X] T030 [US3] Ajouter et faire passer le parcours automatise de 45 Tours dans `tests/integration/multiplayer-draft-flow.test.ts`, sans aucun appel au Coach [FR-011, FR-012, FR-018, FR-041]
- [ ] T031 [US3] Mesurer 100 sessions avec commandes simultanees et latence de convergence dans `tests/performance/multiplayer-draft-performance.test.ts` [SC-002, SC-003]

---

## Phase 5: User Story 4 - Reprendre ou abandonner (Priority: P1)

**Goal**: Un joueur reprend exactement son siege sur tout appareil ; la table attend sans remplacement ; un abandon terminal libere un Salon neuf.

**Independent Test**: Apres picks et redemarrage serveur, le code prive restaure le bon booster/pool ; le pseudo seul echoue ; l'abandon bloque l'ancienne session et le nouveau groupe repart sans carte heritee.

### Tests rouges

- [x] T032 [US4] Ecrire un test rouge de redemarrage a chaque phase et de reconstruction exacte via la suite de conformite store dans `tests/integration/multiplayer-draft-restart.test.ts` [FR-016, FR-017; SC-004]
- [x] T033 [US4] Ecrire les tests rouges de hash du token, faux token, pseudo seul, meme siege sur deux clients et absence de secret dans erreurs/logs dans `tests/integration/multiplayer-draft-security.test.ts` [FR-017, FR-034, FR-035, FR-039; SC-012]
- [ ] T034 [US4] Ecrire les tests rouges de presence informative, pause, retry de pick, abandon terminal et liberation atomique du Salon dans `tests/unit/multiplayer-draft/coordinator-resume.test.ts` [FR-013, FR-015–FR-017, FR-032]

### Implementation minimale puis refactor

- [ ] T035 [US4] Implementer `resume`, `recordPresence` et `abandon` dans `src/multiplayer-draft/coordinator.ts` sans liberer ni automatiser un siege deconnecte [FR-013, FR-016, FR-017, FR-032]
- [ ] T036 [US4] Exposer `POST /presence`, `POST /abandon` et la reprise par Bearer token dans `src/multiplayer-draft/http-handler.ts` avec logs rediges [FR-016, FR-017, FR-032, FR-035, FR-039]
- [ ] T037 [US4] Implementer reprise automatique locale, copie/import du code, statut deconnexion et abandon confirme dans `src/web/multiplayer-draft.js` et `src/web/index.html` [FR-017, FR-032, FR-034, FR-035]
- [x] T038 [US4] Ajouter au parcours multi-navigateur fermeture, reprise sur nouveau contexte et abandon/redepart dans `tests/browser/multiplayer-draft.spec.ts` [FR-016, FR-017, FR-032; SC-004, SC-012]
- [x] T039 [US4] Ajouter une horloge controlee prouvant une pause de 24 heures sans pick ni corruption dans `tests/integration/multiplayer-draft-restart.test.ts` [FR-013, FR-032; SC-005]

---

## Phase 6: User Story 5 - Construire 40 cartes avec le Coach partage (Priority: P1)

**Goal**: Solo et Multi utilisent le meme constructeur final flexible, legal, explicable et auditable, avec validation stricte de l'externe et repli deterministe.

**Independent Test**: Des pools mono-, bi- et tricolores obtiennent toujours 40 cartes legales ; les nonbasiques/fixeurs sont comptes ; tout ecart a 16–18 terrains est explique ; une sortie externe invalide tombe sur le meme repli local.

### Tests rouges

- [x] T040 [US5] Ecrire un comportement rouge a la fois pour composition flexible, exemplaires, nonbasiques, MDFC, fixeurs, courbe et 16–18 terrains dans `tests/unit/coaching/deck-recommender.test.ts` [FR-019, FR-020, FR-033; SC-006]
- [x] T041 [US5] Ameliorer `src/domain/coaching/deck-recommender.ts` sans perdre les modifications locales existantes, supprimer la contrainte 23/17 et rendre le repli deterministe jusqu'au vert de T040 [FR-019, FR-020, FR-024, FR-025, FR-033]
- [x] T042 [US5] Ecrire les tests rouges du contrat `final-deck-coach@1` : 40 cartes, IDs du pool, multiplicites, raisons, provenance et rejet/fallback dans `tests/unit/multiplayer-draft/final-deck-coach.test.ts` [FR-019–FR-025, FR-033; SC-006]
- [x] T043 [US5] Ecrire les tests rouges de prompt structure et minimisation Gemini/DeepSeek dans `tests/unit/companion/final-deck-prompt.test.ts` [FR-020, FR-021, FR-039]
- [x] T044 [US5] Implementer prompt versionne, schema JSON, normalisation, validation locale et repli dans `src/multiplayer-draft/final-deck-coach.ts` et `src/companion/coach-prompts.ts` [FR-019–FR-025, FR-033, FR-039]
- [x] T045 [US5] Ajouter dans `src/companion/llm-router.ts` un profil `final-deck-coach@1` a sortie JSON, timeout et fournisseurs identifies, tout en preservant le profil et le comportement des conseils de pick [FR-024, FR-038, FR-039, FR-041]
- [x] T046 [US5] Ecrire les tests rouges du partage Solo et du retrait irreversible d'Homologation avant recommandation dans `tests/unit/solo-draft/solo-draft-session.test.ts` [FR-023, FR-040]
- [x] T047 [US5] Brancher le constructeur partage dans `src/solo-draft/solo-draft-session.ts` et ses types sans modifier la politique de pick/bot, jusqu'au vert de T046 [FR-023, FR-038, FR-040]
- [x] T048 [US5] Ecrire les tests rouges de deckbuilding Multi, modification manuelle, nouvelle analyse et independence entre joueurs dans `tests/unit/multiplayer-draft/coordinator-deck.test.ts` [FR-018, FR-022, FR-030, FR-031]
- [x] T049 [US5] Implementer `recommendDeck` et `finalizeDeck` dans `src/multiplayer-draft/coordinator.ts`, avec evaluation cinq axes et provenance auditable [FR-018–FR-025, FR-030, FR-031]
- [x] T050 [US5] Exposer `POST /deck/recommend` et `PUT /deck` dans `src/multiplayer-draft/http-handler.ts` jusqu'au vert des contrats d'integration ajoutes a `tests/integration/multiplayer-draft-http.test.ts` [FR-018, FR-022, FR-024, FR-025]
- [x] T051 [US5] Construire l'atelier modifiable, les explications plan/couleurs/forces/risques et l'etat de legalite dans `src/web/multiplayer-draft.js`, `src/web/index.html` et `src/web/styles.css` [FR-018–FR-022, FR-029, FR-033; SC-008, SC-010]
- [ ] T052 [US5] Versionner au moins vingt pools mono-, bi- et tricolores couvrant aggro, controle et synergie, puis construire le comparateur aveugle ancien/nouveau dans `data/benchmarks/final-deck-coach/`, `scripts/benchmark-final-deck-coach.mjs` et `tests/integration/final-deck-coach-benchmark.test.ts` [FR-023, FR-025; SC-007]
- [ ] T053 [US5] Faire consigner par des relecteurs humains les jugements du corpus et verifier le seuil 80 % sans auto-approuver la checklist dans `specs/006-multiplayer-draft/qa-evidence.md` [SC-007]
- [ ] T054 [US5] Faire mesurer par un reviewer l'identification en 30 secondes du plan, des couleurs, d'une force et d'un risque dans `specs/006-multiplayer-draft/qa-evidence.md` [SC-008]

---

## Phase 7: User Story 6 - Exporter la Liste finale MTGA (Priority: P1)

**Goal**: Copier ou telecharger exactement le Deck 40 et le Sideboard du pool non retenu, ou identifier precisement les incompatibilites Arena.

**Independent Test**: Une fixture Arena compatible est importee sans correction ; quantites, Deck et Sideboard correspondent ; une carte ambigue bloque l'export complet et est nommee.

### Tests rouges

- [x] T055 [US6] Ecrire les tests rouges du generateur pur pour Deck 40, Sideboard exhaustif, quantites, ordre stable, caracteres et incompatibilites dans `tests/unit/multiplayer-draft/mtga-export.test.ts` [FR-026–FR-028; SC-009]

### Implementation minimale puis refactor

- [x] T056 [US6] Implementer la resolution et le generateur pur dans `src/multiplayer-draft/mtga-export.ts` jusqu'au vert de T055 [FR-026–FR-028]
- [x] T057 [US6] Exposer `GET /deck/export.mtga` uniquement depuis la Liste finale dans `src/multiplayer-draft/http-handler.ts` et ajouter son contrat dans `tests/integration/multiplayer-draft-http.test.ts` [FR-026–FR-028]
- [x] T058 [US6] Ajouter Copier, Telecharger et le detail des incompatibilites dans `src/web/multiplayer-draft.js` et `src/web/index.html` [FR-026–FR-029]
- [ ] T059 [US6] Ajouter une fixture d'import dans `tests/integration/mtga-export.test.ts`, puis faire verifier par un reviewer une liste compatible dans le veritable importeur Magic Arena et consigner Deck/Sideboard obtenus dans `specs/006-multiplayer-draft/qa-evidence.md` [FR-027, FR-028; SC-009]

---

## Phase 8: Durcissement transversal et preuves

**Purpose**: Verifier les exclusions, l'accessibilite, la confidentialite, les performances et la livraison complete.

- [x] T060 [P] Verifier par tests que le Multi ne publie ni record ni trophee et que les conseils de pick/politiques bots sont inchanges dans `tests/integration/multiplayer-draft-non-homologated.test.ts` [FR-030, FR-038]
- [ ] T061 Completer `tests/browser/multiplayer-draft.spec.ts` pour tous les parcours critiques au clavier et a 360 px avec deux contextes navigateur [FR-029, FR-034; SC-010]
- [ ] T062 Mesurer le p95 de convergence et le premier booster sous le profil de charge documente, puis consigner environnement et resultats dans `specs/006-multiplayer-draft/qa-evidence.md` [SC-002, SC-003]
- [x] T063 [P] Auditer les logs, erreurs, payloads Coach et projections HTTP pour garantir l'absence de token, pseudo, picks et cartes adverses dans `tests/integration/multiplayer-draft-security.test.ts` [FR-014, FR-035, FR-039; SC-012]
- [x] T064 Executer `npm run format:check`, `npm run lint`, `npm run typecheck`, les suites ciblees, `npm run test`, `npm run test:coverage`, `npm run test:mobile`, `npm run test:performance`, `npm run test:reference`, `npm run test:replay`, `npm run test:audit`, `npm run test:domain-errors`, `npm run test:e2e`, `npm run test:browser` et `npm run check`; consigner les sorties dans `specs/006-multiplayer-draft/qa-evidence.md`
- [ ] T065 Faire executer la recette amicale par au moins quatre participants, consigner Snapshot, appareils, assistance et exports dans `specs/006-multiplayer-draft/qa-evidence.md` sans auto-approuver la checklist [SC-011]
- [x] T066 [P] Documenter configuration Supabase, retention, reprise, limites du Salon global et contrat du Coach dans `docs/multiplayer-draft-operations.md` [FR-016, FR-031, FR-034, FR-039, FR-041]
- [ ] T067 Faire relire `specs/006-multiplayer-draft/checklists/multiplayer-release.md`, puis obtenir Standards + Spec review, CI et approbation humaine avant fusion

---

## Dependencies & Execution Order

### Phase Dependencies

- **Fondations (Phase 1)**: commence apres confirmation humaine des trois seams de test ; T002 precede T003, T004 precede T005 et T006 precede T007–T009. Les internes reducer/store ne constituent jamais de nouvelles seams de test.
- **US1 Salon**: depend des fondations ; constitue le MVP navigable.
- **US2 Pret**: depend du Salon et de la transaction du store.
- **US3 Picks**: depend du demarrage et de l'integration du moteur existant.
- **US4 Reprise**: s'appuie sur le journal et les commandes idempotentes deja exerceses par US1–US3.
- **US5 Coach**: peut commencer apres les fondations de store ; son integration Multi depend de la fin du draft US3. Le partage Solo est independant du Salon.
- **US6 Export**: le generateur pur peut etre developpe apres les types ; l'endpoint et l'UI dependent de la Liste finale US5.
- **Durcissement**: intervient apres les user stories selectionnees ; les validations humaines T053, T054, T065 et T067 ne sont jamais auto-approuvees.

### Traceability Summary

- **Salon et lancement**: FR-001–FR-009, FR-031, FR-034–FR-037 -> T010–T023.
- **Tours et confidentialite**: FR-010–FR-017, FR-032, FR-035, FR-038, FR-041 -> T024–T039, T060, T063.
- **Coach et deckbuilding**: FR-018–FR-025, FR-030, FR-033, FR-038–FR-040 -> T040–T054, T060, T063.
- **Export et UX**: FR-026–FR-029 -> T051, T055–T061.
- **Resultats mesurables SC-001–SC-012**: T018, T023, T031–T033, T038–T040, T042, T052–T065.

## Implementation Strategy

1. Obtenir l'accord explicite sur les trois seams et sur le demarrage avec checklist reviewer ouverte.
2. Livrer un tracer bullet T001–T023 : deux humains rejoignent et demarrent une session reelle.
3. Ajouter un Tour complet puis les 45 Tours T024–T031.
4. Durcir reprise/abandon T032–T039 avant l'interface de deck.
5. Partager le Coach final et mesurer sa pertinence T040–T054.
6. Ajouter l'export T055–T059 puis executer toutes les preuves T060–T067.

## Notes

- Les tests d'une tranche sont ecrits et observes rouges avant son code ; ne jamais ecrire en lot tous les tests de la phase.
- Ne simuler que les frontieres systeme (horloge, crypto, store, LLM). Le moteur `src/draft/index.ts`, le coordinateur et le recommandateur s'exercent par leurs interfaces reelles.
- Les changements locaux deja presents dans `scripts/serve-web.mjs`, `src/domain/coaching/deck-recommender.ts`, `src/solo-draft/` et `src/web/` appartiennent a l'utilisateur et doivent etre preserves.
- Aucun commit ni push automatique ; garder les commits futurs cibles et Conventional Commits.
