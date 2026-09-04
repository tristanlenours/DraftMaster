# Preuves QA — Simuler un draft Titou reproductible

Ce registre relie la [spécification](./spec.md), les [tâches](./tasks.md) et les preuves observées. Une exigence n'est déclarée validée que si la commande indiquée a réussi sur la révision citée. Les checklists de spécification évaluent la qualité des exigences ; elles ne prouvent pas l'implémentation.

## Règles de décision

- **Gate bloquant** : formatage, lint, types, tests concernés, invariants, contrôles de sécurité et analyse Spec Kit doivent réussir. Un échec interdit la livraison.
- **Couverture diagnostique** : le rapport V8 révèle les zones non exercées, mais aucun pourcentage ne remplace un test intentionnel de chaque invariant, limite et régression.
- **Approbation humaine** : un humain vérifie les données importées, les attentes de référence, la lisibilité du rapport et la PR finale. L'agent ne s'auto-approuve pas.
- Toute preuve consigne au minimum date, commit, environnement, commande et résultat. Un statut « prévu » ou « non exécuté » n'est jamais un succès.

## État du socle

| Date       | Révision  | Environnement             | Preuve                                                                                                                                   | Résultat                  |
| ---------- | --------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 2026-09-04 | `28a35d9` | Script d'import explicite | Snapshot initial : 545 instances, 543 impressions, 542 identités oracle ; empreintes consignées dans `data/cubes/titou_tribal/README.md` | Réussi                    |
| 2026-09-04 | `5bee7f0` | Git                       | PR de reset #67 fusionnée et réconciliation documentée                                                                                   | Réussi                    |
| 2026-09-04 | `3798886` | Node 24.19.0, npm 11.19.0 | dépendances exactes, `tsc --noEmit`, exécution TypeScript native                                                                         | Réussi                    |
| 2026-09-04 | `3e357d8` | Node 24.19.0              | Prettier, ESLint typé, Vitest/V8 et fast-check ; 2 tests de fondation                                                                    | Réussi — socle uniquement |
| 2026-09-04 | `36381ac` | Node 24.19.0, npm 11.19.0 | `npm ci --dry-run --ignore-scripts --offline` puis `npm run check`                                                                       | Réussi — socle uniquement |
| 2026-09-04 | `5b55beb` | Node 24.19.0, npm 11.19.0 | Validation Ajv, canonicalisation SHA-256 et normalisation ; `npm run check`, 24 tests, couverture V8 lignes 88,8 %                       | Réussi — snapshot local   |
| 2026-09-04 | `3c2a890` | Node 24.19.0, npm 11.19.0 | Import CLI TDD ; `npm run check`, 30 tests, couverture V8 lignes 82,23 % ; reproduction exacte de l’empreinte bootstrap                    | Réussi — import local     |
| 2026-09-04 | `9bfd2f4` | Node 24.19.0, pure-rand 8.4.2 | RNG TDD ; 10 cas dédiés, vecteurs SHA-256/xoroshiro128plus, flux indépendants et Fisher–Yates ; `npm run check`, 40 tests             | Réussi — hasard versionné |
| 2026-09-04 | `5ae37cc` | Node 24.19.0, crypto natif | Identité CLI TDD ; 9 cas dédiés, format 12 hex, collision, portée d’exécution et seed int32 indépendante ; `npm run check`, 49 tests | Réussi — identité locale  |
| 2026-09-04 | `82a6369` | TypeScript 6 strict | Contrats du domaine : valeurs readonly, événements versionnés, configuration fixe, 22 erreurs stables et seam des politiques ; `npm run check`, 52 tests | Réussi — contrats internes |
| 2026-09-04 | `3d4a7b9` | Node 24.19.0, npm 11.19.0 | Création de session et distribution : 15 tests de contrat, N = 545/540/360, 24 boosters de 15, gel immuable ; `npm run check`, 67 tests | Réussi — création et distribution |
| 2026-09-04 | `2d0c4c5` | Node 24.19.0, npm 11.19.0 | Tours atomiques et rotation : 12 tests unitaires, validation atomique des 8 décisions, rotation 45 tours gauche/droite/gauche, fin de session ; `npm run check`, 79 tests | Réussi — tours et rotation |
| 2026-09-04 | `4c4571b` | Node 24.19.0, npm 11.19.0 | Politiques et orchestration : politiques seeded-random et scripted, simulation complète de draft à 8 sièges, 13 tests ajoutés (8 unitaires + 5 intégration) ; `npm run check`, 92 tests | Réussi — politiques et simulation |
| 2026-09-04 | `60725a0` | Node 24.19.0, npm 11.19.0 | Rapport terminal et invariants : 6 tests de contrat (`tests/contract/draft-report.test.ts`), projection RFC 8785, digest SHA-256 ; `npm run check`, 98 tests | Réussi — rapport et invariants |
| 2026-09-04 | `80c0c95` | Node 24.19.0, npm 11.19.0 | CLI simulate-draft et gestion d'erreurs : 6 tests E2E (`tests/e2e/simulate-cli.test.ts`), commande `npm --silent run simulate --`, codes 0, 2, 3 ; `npm run check`, 104 tests | Réussi — CLI headless |
| 2026-09-04 | `f2fee09` | Node 24.19.0, fast-check 4.5.3 | Propriétés fast-check et tests matriciels N = 545/540/360 : conservation des instances, absence de doublons, refus sans mutation, directions ; `npm run check`, 109 tests | Réussi — propriétés et matrix |
| 2026-09-04 | `f2fee09` | Node 24.19.0, npm 11.19.0 | Validation MVP US1 sur snapshot réel : `npm --silent run simulate -- --seed 42` ; exit code 0, stdout JSON pur, 4/4 invariants True, digest déterministe `67a8f0521c3ec5684f8ee55cdf271a801649322621057dbae61ca95a6da845d5` | Réussi — MVP US1 validé |
| 2026-09-04 | `130d51b` | Node 24.19.0, npm 11.19.0 | Déterminisme et projection fonctionnelle : 7 tests d'intégration (`tests/integration/determinism.test.ts`), 5 tests unitaires (`tests/unit/draft/functional-projection.test.ts`) ; `npm run check`, 121 tests | Réussi — déterminisme et projection |
| 2026-09-04 | `0d5b20a` | Node 24.19.0, pure-rand 8.4.2 | Relecture autonome et fixture dorée : `replayDraft` pur sans RNG/I/O, contrat de relecture (13 tests), équivalence et frontières N = 545/540/360 (5 tests), non-régression référence seed 42 (2 tests), propriétés fast-check (2 tests) ; `npm run test:reference`, `npm run test:replay`, `npm run check`, 143 tests sur 21 suites | Réussi — US2 validée |

## Matrice exigences, tests et preuves

| Exigences                                                                                             | Preuves automatisées prévues                                                      | Tâches de validation                  | Statut                                |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------- |
| FR-001, FR-002, FR-003 — snapshot, provenance, validation                                             | Contrat de schéma, normalisation, import simulé, validation CLI                   | T007–T013, T031, T047                 | T007–T013 et T031 réussis (snapshot validé avant création, CLI refuse snapshot absent/invalide) |
| FR-004, FR-005 — identité et entrées séparées                                                         | Tests d'identité, création de session et rapport                                  | T016–T020, T028–T031                  | T016–T020 et T028–T031 réussis (identifiant 12 hex, conservation séparée, pas de fuite de seed) |
| FR-006, FR-007, FR-008, FR-009, FR-010 — sièges, distribution, rotations et choix légaux sans scoring | Contrats moteur, tests de tours/rotation/politiques, propriétés de conservation   | T014–T015, T018–T027, T032–T034       | T014–T015, T018–T027, T032–T034 réussis (8 sièges, 24 boosters de 15, gauche/droite/gauche, choix légaux, bots seeded-random) |
| FR-011 — déterminisme                                                                                 | Vecteurs RNG, doubles simulations, projection fonctionnelle, fixture de référence | T014–T015, T036, T038, T041–T043      | Validé (doubles simulations, digests strictement identiques, projection RFC 8785, fixture dorée seed 42) |
| FR-012, FR-013 — journal autonome, ordonné et détaillé                                                | Contrats moteur/rapport/relecture et audit indépendant                            | T018–T023, T028–T029, T037–T040, T044 | T018–T023, T028–T029, T037–T040 validés (journal complet autonome et ordonné, snapshot embarqué, relecture exacte sans source externe) ; audit US3 prévu |
| FR-014, FR-015, FR-016 — rapport, fin exacte et refus après fin                                       | Tests de rapport, intégration complète, altérations et invariants                 | T021–T023, T026–T034, T044–T051       | T021–T023, T026–T034 réussis (45 tours, 360 choix, pools de 45, N − 360 inutilisées, refus après fin, digest RFC 8785) |
| FR-017 — fonctionnement hors ligne                                                                    | Réseau interdit en import local, simulation et E2E                                | T011–T012, T031, T047                 | Import local et simulation CLI réussis hors ligne |
| FR-018 — exclusions du MVP                                                                            | Tests de politiques, documentation et revue de périmètre                          | T024, T035, T050, T054, T056–T057     | T024 et T035 réussis (politiques sans heuristiques, README documentant les limites du MVP) |
| FR-019 — versions moteur/politiques immuables                                                         | Refus des registres ou décisions incohérents, rapport et replay                   | T018, T024–T029, T037, T041, T044     | T018, T024–T029, T037, T041 validés (versions fixées à la création, refus de POLICY_MISMATCH en live et replay) |
| SC-001, SC-002, SC-003, SC-004, SC-005 — résultat, conservation, atomicité et audit                   | Suites US1/US2/US3, tailles 545/540/360, rapport altéré                           | T019–T046, T050–T051                  | SC-001, SC-002, SC-003, SC-004 validés pour US1/US2 ; SC-005 en cours (US3) |
| SC-006 — cinq mesures strictement sous 2 000 ms                                                       | Suite isolée suivant `performance-protocol.md`                                    | T048–T049, T051–T052                  | Non exécuté (Phase 5 / US3)            |

## Matrice des invariants bloquants

| Invariant                                                                    | Tests attendus                                                               | Preuve à conserver                        | Statut                                           |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------ |
| Snapshot valide, instances uniques, index contigus et compteurs exacts       | `cube-snapshot.test.ts`, `normalize-snapshot.test.ts`, `import-cube.test.ts` | sorties des suites et digest du snapshot  | Validation, normalisation et import réussis      |
| 24 boosters de 15 sans remplacement ; N − 360 inutilisées                    | contrats moteur et intégration pour N = 545, 540 et 360                      | résultats par taille et seed              | Validé (tests moteur, matrix N = 545/540/360 et CLI réelle seed 42) |
| 45 tours, 360 choix, huit pools de 45                                        | rotation, simulation complète et propriétés                                  | compteurs et journal final                | Validé (cycle 45 tours, simulation complète, CLI réelle) |
| Chaque instance apparaît exactement une fois dans un pool ou les inutilisées | propriétés et audit indépendant                                              | seed/chemin de réduction en cas d'échec   | Validé (propriétés fast-check conservation.test.ts et matrix) |
| Choix légal et tour atomique ; refus sans mutation                           | erreurs de domaine et propriété de conservation                              | code d'erreur, états avant/après          | Validé (submit-pick-round.test.ts, fast-check conservation.test.ts) |
| Passages gauche/droite/gauche et séquences d'événements continues            | tests rotation, replay et audit                                              | événements attendus/observés              | Validé (rotation.test.ts, simulate-draft.test.ts, replay-equivalence.test.ts) |
| Même entrée fonctionnelle, même résultat ; flux RNG indépendants             | vecteurs dorés, déterminisme et référence seed 42                            | versions, seed et digest fonctionnel      | Validé (determinism.test.ts, reference-draft.test.ts, seed 42 dorée) |
| Snapshot embarqué et replay autonome sans réseau, RNG ni politique           | contrat et équivalence de replay                                             | journal sérialisé et résultat reconstruit | Validé (replay-draft.test.ts, replay-equivalence.test.ts, replay-properties.test.ts) |
| Versions moteur/politiques fixées et cohérentes                              | contrats de session, choix, replay et rapport                                | descripteurs des huit sièges              | Validé (contrats de session, simulate-draft, draft-report, replay-draft) |
| Empreinte SHA-256 recalculable et corruption détectée                        | projection, intégrité et mutations ciblées                                   | digest attendu et recalculé               | Validé pour US1/US2 (RFC 8785 canonique sur projection) ; corruption approfondie en US3 |

## Commandes de validation

| Commande                                                                    | Objet                                                             | État actuel                                       |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------- |
| `npm ci`                                                                    | Installation propre depuis le lockfile                            | Exécution propre reportée à T055 ; dry-run réussi |
| `npm run check`                                                             | Format, lint, types, tests fonctionnels disponibles et couverture | Réussi : 21 suites, 143 tests passés, 0 erreur lint/typecheck, couverture V8 lignes 85,09 % |
| `npm run cube:validate -- --file data/cubes/titou_tribal/2026-02-24.1.json` | Contrat et intégrité du snapshot                                  | Réussi : 545 / 543 / 542                          |
| `npm --silent run simulate -- --seed 42`                                    | Simulation CLI et JSON sans bruit                                 | Réussi : exit code 0, JSON pur sur stdout, 4 invariants True, digest `67a8f0521c3ec5684f8ee55cdf271a801649322621057dbae61ca95a6da845d5` |
| `npm run test:reference`                                                    | Non-régression sur fixture dorée seed 42                          | Réussi : 1 suite, 2 tests passés                  |
| `npm run test:replay`                                                       | Déterminisme, contrat et équivalence de replay                    | Réussi : 4 suites, 27 tests passés                |
| `npm run test:domain-errors` / `npm run test:e2e`                           | Atomicité, erreurs et parcours CLI                                | À raccorder (US3)                                 |
| `npm run test:performance`                                                  | Protocole SC-006 isolé                                            | À raccorder (US3) ; aucune mesure revendiquée     |

## Approbations humaines requises

| Élément                    | Critère                                                                       | Statut                                            |
| -------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------- |
| Snapshot initial           | Composition, provenance, attribution et manifeste du reset                    | Historique consigné                               |
| Draft de référence seed 42 | Attentes relues sans régénération automatique                                 | Fixture créée en T041 ; en attente de revue humaine |
| Rapport autonome           | Un contributeur explique un choix et retrouve sa carte depuis le rapport seul | À faire en T051                                   |
| Livraison                  | Revue Standards + Spec, CI verte et approbation de la PR                      | À faire en T057                                   |

## Limites et risques connus

- Les jalons MVP US1 et US2 (rejouer une simulation déterministe et relecture autonome du journal) sont désormais entièrement complétés, validés et testés avec 143 tests passants sur 21 suites.
- La couverture V8 actuelle est diagnostique : 85,49 % des instructions, 76,98 % des branches, 94,52 % des fonctions et 85,09 % des lignes sur l'ensemble du projet. Le module de relecture `src/draft/internal/replay-draft.ts` atteint 81,32 % des lignes et couvre l'intégralité des transitions valides et cas d'altération du contrat.
- Le 2026-09-04, une collecte live de l’URL historique a renvoyé exactement les mêmes 545 cartes normalisées, mais des octets bruts différents (`db187a0e…54b70c9` au lieu de `7810d999…16ee6`). L’empreinte brute reste donc une preuve de transport ponctuelle : la reproduction canonique automatisée utilise la provenance historique enregistrée, tandis que toute nouvelle collecte doit être revue avant création d’une version.
- Le test local a utilisé Node 24.19.0 alors que `.node-version` cible 24.20.0. La validation propre et la CI doivent consigner leur version exacte.
- Aucun résultat du workflow GitHub, audit de dépendances/secrets, benchmark ou test multiplateforme n'est encore enregistré (reportés aux phases 5 et 6).
- Lighthouse et QA visuelle ne s'appliquent pas à cette feature CLI ; accessibilité et interface graphique restent hors périmètre.
