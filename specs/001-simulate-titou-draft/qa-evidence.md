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

## Matrice exigences, tests et preuves

| Exigences                                                                                             | Preuves automatisées prévues                                                      | Tâches de validation                  | Statut                                |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------- |
| FR-001, FR-002, FR-003 — snapshot, provenance, validation                                             | Contrat de schéma, normalisation, import simulé, validation CLI                   | T007–T013, T031, T047                 | T007–T013 réussis                     |
| FR-004, FR-005 — identité et entrées séparées                                                         | Tests d'identité, création de session et rapport                                  | T016–T020, T028–T031                  | Identité CLI réussie ; moteur prévu   |
| FR-006, FR-007, FR-008, FR-009, FR-010 — sièges, distribution, rotations et choix légaux sans scoring | Contrats moteur, tests de tours/rotation/politiques, propriétés de conservation   | T014–T015, T018–T027, T032–T034       | Prévu                                 |
| FR-011 — déterminisme                                                                                 | Vecteurs RNG, doubles simulations, projection fonctionnelle, fixture de référence | T014–T015, T036, T038, T041–T043      | Prévu                                 |
| FR-012, FR-013 — journal autonome, ordonné et détaillé                                                | Contrats moteur/rapport/relecture et audit indépendant                            | T018–T023, T028–T029, T037–T040, T044 | Prévu                                 |
| FR-014, FR-015, FR-016 — rapport, fin exacte et refus après fin                                       | Tests de rapport, intégration complète, altérations et invariants                 | T021–T023, T026–T034, T044–T051       | Prévu                                 |
| FR-017 — fonctionnement hors ligne                                                                    | Réseau interdit en import local, simulation et E2E                                | T011–T012, T031, T047                 | Import local réussi ; simulation prévue |
| FR-018 — exclusions du MVP                                                                            | Tests de politiques, documentation et revue de périmètre                          | T024, T035, T050, T054, T056–T057     | Prévu                                 |
| FR-019 — versions moteur/politiques immuables                                                         | Refus des registres ou décisions incohérents, rapport et replay                   | T018, T024–T029, T037, T041, T044     | Prévu                                 |
| SC-001, SC-002, SC-003, SC-004, SC-005 — résultat, conservation, atomicité et audit                   | Suites US1/US2/US3, tailles 545/540/360, rapport altéré                           | T019–T046, T050–T051                  | Non exécuté                           |
| SC-006 — cinq mesures strictement sous 2 000 ms                                                       | Suite isolée suivant `performance-protocol.md`                                    | T048–T049, T051–T052                  | Non exécuté                           |

## Matrice des invariants bloquants

| Invariant                                                                    | Tests attendus                                                               | Preuve à conserver                        | Statut                                           |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------ |
| Snapshot valide, instances uniques, index contigus et compteurs exacts       | `cube-snapshot.test.ts`, `normalize-snapshot.test.ts`, `import-cube.test.ts` | sorties des suites et digest du snapshot  | Validation, normalisation et import réussis      |
| 24 boosters de 15 sans remplacement ; N − 360 inutilisées                    | contrats moteur et intégration pour N = 545, 540 et 360                      | résultats par taille et seed              | Prévu                                            |
| 45 tours, 360 choix, huit pools de 45                                        | rotation, simulation complète et propriétés                                  | compteurs et journal final                | Prévu                                            |
| Chaque instance apparaît exactement une fois dans un pool ou les inutilisées | propriétés et audit indépendant                                              | seed/chemin de réduction en cas d'échec   | Prévu                                            |
| Choix légal et tour atomique ; refus sans mutation                           | erreurs de domaine et propriété de conservation                              | code d'erreur, états avant/après          | Prévu                                            |
| Passages gauche/droite/gauche et séquences d'événements continues            | tests rotation, replay et audit                                              | événements attendus/observés              | Prévu                                            |
| Même entrée fonctionnelle, même résultat ; flux RNG indépendants             | vecteurs dorés, déterminisme et référence seed 42                            | versions, seed et digest fonctionnel      | Prévu                                            |
| Snapshot embarqué et replay autonome sans réseau, RNG ni politique           | contrat et équivalence de replay                                             | journal sérialisé et résultat reconstruit | Prévu                                            |
| Versions moteur/politiques fixées et cohérentes                              | contrats de session, choix, replay et rapport                                | descripteurs des huit sièges              | Prévu                                            |
| Empreinte SHA-256 recalculable et corruption détectée                        | projection, intégrité et mutations ciblées                                   | digest attendu et recalculé               | Prévu                                            |

## Commandes de validation

| Commande                                                                    | Objet                                                             | État actuel                                       |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------- |
| `npm ci`                                                                    | Installation propre depuis le lockfile                            | Exécution propre reportée à T055 ; dry-run réussi |
| `npm run check`                                                             | Format, lint, types, tests fonctionnels disponibles et couverture | Réussi sur le socle ; aucun verdict métier        |
| `npm run cube:validate -- --file data/cubes/titou_tribal/2026-02-24.1.json` | Contrat et intégrité du snapshot                                  | Réussi : 545 / 543 / 542                          |
| `npm --silent run simulate -- --seed 42`                                    | Simulation CLI et JSON sans bruit                                 | À raccorder                                       |
| `npm run test:reference` / `npm run test:replay`                            | Déterminisme et relecture                                         | À raccorder                                       |
| `npm run test:domain-errors` / `npm run test:e2e`                           | Atomicité, erreurs et parcours CLI                                | À raccorder                                       |
| `npm run test:performance`                                                  | Protocole SC-006 isolé                                            | À raccorder ; aucune mesure revendiquée           |

## Approbations humaines requises

| Élément                    | Critère                                                                       | Statut              |
| -------------------------- | ----------------------------------------------------------------------------- | ------------------- |
| Snapshot initial           | Composition, provenance, attribution et manifeste du reset                    | Historique consigné |
| Draft de référence seed 42 | Attentes relues sans régénération automatique                                 | À faire en T041     |
| Rapport autonome           | Un contributeur explique un choix et retrouve sa carte depuis le rapport seul | À faire en T051     |
| Livraison                  | Revue Standards + Spec, CI verte et approbation de la PR                      | À faire en T057     |

## Limites et risques connus

- Le moteur de draft et les contrôles de simulation ne sont pas encore implémentés ; aucun critère SC-001–SC-006 n'est déclaré validé ici.
- La couverture V8 actuelle est diagnostique : 84,26 % des instructions, 78,27 % des branches, 93,22 % des fonctions et 84,04 % des lignes. Les modules RNG et identité atteignent respectivement 95,65 % et 94,11 % des lignes ; les branches restantes seront exercées selon le risque, pas pour atteindre un quota arbitraire.
- Le 2026-09-04, une collecte live de l’URL historique a renvoyé exactement les mêmes 545 cartes normalisées, mais des octets bruts différents (`db187a0e…54b70c9` au lieu de `7810d999…16ee6`). L’empreinte brute reste donc une preuve de transport ponctuelle : la reproduction canonique automatisée utilise la provenance historique enregistrée, tandis que toute nouvelle collecte doit être revue avant création d’une version.
- Le test local a utilisé Node 24.19.0 alors que `.node-version` cible 24.20.0. La validation propre et la CI doivent consigner leur version exacte.
- Aucun résultat du workflow GitHub, audit de dépendances/secrets, benchmark ou test multiplateforme n'est encore enregistré.
- Lighthouse et QA visuelle ne s'appliquent pas à cette feature CLI ; accessibilité et interface graphique restent hors périmètre.
