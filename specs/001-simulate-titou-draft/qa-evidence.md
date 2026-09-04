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

## Matrice exigences, tests et preuves

| Exigences                                                                                             | Preuves automatisées prévues                                                      | Tâches de validation                  | Statut      |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------- | ----------- |
| FR-001, FR-002, FR-003 — snapshot, provenance, validation                                             | Contrat de schéma, normalisation, import simulé, validation CLI                   | T007–T013, T031, T047                 | Prévu       |
| FR-004, FR-005 — identité et entrées séparées                                                         | Tests d'identité, création de session et rapport                                  | T016–T020, T028–T031                  | Prévu       |
| FR-006, FR-007, FR-008, FR-009, FR-010 — sièges, distribution, rotations et choix légaux sans scoring | Contrats moteur, tests de tours/rotation/politiques, propriétés de conservation   | T014–T015, T018–T027, T032–T034       | Prévu       |
| FR-011 — déterminisme                                                                                 | Vecteurs RNG, doubles simulations, projection fonctionnelle, fixture de référence | T014–T015, T036, T038, T041–T043      | Prévu       |
| FR-012, FR-013 — journal autonome, ordonné et détaillé                                                | Contrats moteur/rapport/relecture et audit indépendant                            | T018–T023, T028–T029, T037–T040, T044 | Prévu       |
| FR-014, FR-015, FR-016 — rapport, fin exacte et refus après fin                                       | Tests de rapport, intégration complète, altérations et invariants                 | T021–T023, T026–T034, T044–T051       | Prévu       |
| FR-017 — fonctionnement hors ligne                                                                    | Réseau interdit en import local, simulation et E2E                                | T011–T012, T031, T047                 | Prévu       |
| FR-018 — exclusions du MVP                                                                            | Tests de politiques, documentation et revue de périmètre                          | T024, T035, T050, T054, T056–T057     | Prévu       |
| FR-019 — versions moteur/politiques immuables                                                         | Refus des registres ou décisions incohérents, rapport et replay                   | T018, T024–T029, T037, T041, T044     | Prévu       |
| SC-001, SC-002, SC-003, SC-004, SC-005 — résultat, conservation, atomicité et audit                   | Suites US1/US2/US3, tailles 545/540/360, rapport altéré                           | T019–T046, T050–T051                  | Non exécuté |
| SC-006 — cinq mesures strictement sous 2 000 ms                                                       | Suite isolée suivant `performance-protocol.md`                                    | T048–T049, T051–T052                  | Non exécuté |

## Matrice des invariants bloquants

| Invariant                                                                    | Tests attendus                                                               | Preuve à conserver                        | Statut |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------- | ------ |
| Snapshot valide, instances uniques, index contigus et compteurs exacts       | `cube-snapshot.test.ts`, `normalize-snapshot.test.ts`, `import-cube.test.ts` | sorties des suites et digest du snapshot  | Prévu  |
| 24 boosters de 15 sans remplacement ; N − 360 inutilisées                    | contrats moteur et intégration pour N = 545, 540 et 360                      | résultats par taille et seed              | Prévu  |
| 45 tours, 360 choix, huit pools de 45                                        | rotation, simulation complète et propriétés                                  | compteurs et journal final                | Prévu  |
| Chaque instance apparaît exactement une fois dans un pool ou les inutilisées | propriétés et audit indépendant                                              | seed/chemin de réduction en cas d'échec   | Prévu  |
| Choix légal et tour atomique ; refus sans mutation                           | erreurs de domaine et propriété de conservation                              | code d'erreur, états avant/après          | Prévu  |
| Passages gauche/droite/gauche et séquences d'événements continues            | tests rotation, replay et audit                                              | événements attendus/observés              | Prévu  |
| Même entrée fonctionnelle, même résultat ; flux RNG indépendants             | vecteurs dorés, déterminisme et référence seed 42                            | versions, seed et digest fonctionnel      | Prévu  |
| Snapshot embarqué et replay autonome sans réseau, RNG ni politique           | contrat et équivalence de replay                                             | journal sérialisé et résultat reconstruit | Prévu  |
| Versions moteur/politiques fixées et cohérentes                              | contrats de session, choix, replay et rapport                                | descripteurs des huit sièges              | Prévu  |
| Empreinte SHA-256 recalculable et corruption détectée                        | projection, intégrité et mutations ciblées                                   | digest attendu et recalculé               | Prévu  |

## Commandes de validation

| Commande                                                                    | Objet                                                             | État actuel                                       |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------- |
| `npm ci`                                                                    | Installation propre depuis le lockfile                            | Exécution propre reportée à T055 ; dry-run réussi |
| `npm run check`                                                             | Format, lint, types, tests fonctionnels disponibles et couverture | Réussi sur le socle ; aucun verdict métier        |
| `npm run cube:validate -- --file data/cubes/titou_tribal/2026-02-24.1.json` | Contrat et intégrité du snapshot                                  | À raccorder                                       |
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

- Le moteur, la CLI et les contrôles métier ne sont pas encore implémentés ; aucune exigence FR-001–FR-019 ni SC-001–SC-006 n'est déclarée validée ici.
- La couverture actuelle affiche `0/0` car `src/` ne contient encore aucune instruction exécutable. Elle deviendra informative à mesure que le moteur sera ajouté.
- Le test local a utilisé Node 24.19.0 alors que `.node-version` cible 24.20.0. La validation propre et la CI doivent consigner leur version exacte.
- Aucun résultat du workflow GitHub, audit de dépendances/secrets, benchmark ou test multiplateforme n'est encore enregistré.
- Lighthouse et QA visuelle ne s'appliquent pas à cette feature CLI ; accessibilité et interface graphique restent hors périmètre.
