# Tâches : Simuler un draft Titou reproductible

**Entrées** : `specs/001-simulate-titou-draft/` — `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/` et `quickstart.md`.

**Prérequis** : checklist métier/QA approuvée par l’utilisateur le 2026-09-03 ; analyse Spec Kit sans problème bloquant avant toute implémentation. Suivi : [GitHub #9](https://github.com/tristanlenours/DraftMaster/issues/9).

**Tests** : obligatoires pour les règles métier conformément à la constitution. Pour chaque tranche, écrire le test, constater son échec pour la raison attendue, implémenter le minimum, puis refactoriser. Les cases ci-dessous restent décochées tant que le travail et sa vérification ne sont pas terminés.

**Organisation** : préservation des données et reset, fondations communes, puis trois parcours utilisateur par priorité. Les chemins sont relatifs à la racine du dépôt. Ce document planifie le travail ; il ne déclenche ni suppression, ni installation, ni publication.

## Format et garde-fous

- `T###` : identifiant stable attribué séquentiellement ; l’ordre d’exécution suit les dépendances, pas la valeur numérique.
- `[P]` : travail possible en parallèle avec les tâches explicitement associées plus bas, après leurs prérequis ; fichiers distincts.
- `[US1]`, `[US2]`, `[US3]` : rattachement au scénario de la spécification.
- Aucun scoring, bot intelligent, écran, persistance, reprise ou multijoueur dans cette feature.
- La suppression du runtime historique exige une PR de reset séparée, avec manifeste revu par un humain. Ne pas transformer une tâche de configuration en suppression implicite.
- Une ambiguïté de contrat doit être résolue dans les documents sources avant de coder la règle concernée. L’approbation de la checklist ne remplace pas l’analyse de cohérence.

## Phase 0 — Préserver les données puis réconcilier le reset

**Objectif** : conserver la seule donnée historique requise avant de retirer le runtime legacy dans une PR séparée et récupérable.

- [x] T013 Importer explicitement la révision historique documentée dans `data/cubes/titou_tribal/2026-02-24.1.json` et écrire `data/cubes/titou_tribal/README.md` : provenance, méthode, version, attribution et droits connus ; vérifier 545 instances, 543 impressions et 542 identités oracle, sans committer réponse brute ni images. Preuve : commit `28a35d9`, import explicite verrouillé par `scripts/import-historical-titou-snapshot.mjs`, empreinte brute `7810d999d8c349a7fba56ea61dc0e479950d952bd3134337ffb07b983b616ee6` et empreinte canonique `289f6c4a27b39bc4f6f1816827ab2cca1198bbb88e495063dedcb176c18aba39`.
- [x] T001 Consigner dans `specs/001-simulate-titou-draft/reset-readiness.md` la référence de la PR de reset, son manifeste et la preuve de fusion ou de réconciliation ; arrêter avant T002 si ce prérequis du plan n’est pas satisfait, sans supprimer de fichier dans cette tâche. Preuve : PR #67 fusionnée dans `main` au commit `8abe088cadc4929c5c3c61a032408ca2e3d1ef6c`, branche réconciliée par fast-forward et contrôles post-fusion consignés.

**Point de contrôle** : le snapshot normalisé est publié avant la suppression ; la PR de reset est revue puis fusionnée ou explicitement réconciliée avec la branche de feature.

## Phase 1 — Installation du socle

**Objectif** : préparer un package TypeScript unique, des contrôles reproductibles et une traçabilité explicite.

- [x] T002 Configurer Node 24 LTS, ESM et TypeScript 6 strict à syntaxe effaçable dans `.node-version`, `package.json`, `package-lock.json` et `tsconfig.json` ; verrouiller les dépendances du plan, prévoir les formats Ajv requis et utiliser `tsc --noEmit` sans étape de build. Preuve : dépendances exactes résolues dans un lockfile v3, arbre contrôlé sous Node 24.19.0/npm 11.19.0, `tsc --noEmit` et exécution native de `src/index.ts` réussis ; `.node-version` cible Node 24.20.0 LTS et `.npmrc` refuse les moteurs incompatibles.
- [ ] T003 [P] Configurer ESLint/typescript-eslint et Prettier dans `eslint.config.js`, `.prettierrc.json` et `.prettierignore`, avec imports ESM et formatage cohérent à deux espaces pour TypeScript.
- [ ] T004 [P] Configurer Vitest, V8 et fast-check dans `vitest.config.ts`, avec suites unitaires/contrat/intégration/E2E, couverture incluant les sources non exercées et performance isolée des tests fonctionnels.
- [ ] T005 Ajouter dans `package.json` les commandes de formatage, lint, types, tests, couverture et `check`, puis créer `.github/workflows/quality.yml` pour les exécuter avec `npm ci` sur Node 24 ; ne pas laisser une suite vide passer comme preuve de validation métier.
- [ ] T006 Créer `specs/001-simulate-titou-draft/qa-evidence.md` avec une matrice exigences/invariants/tests/preuves, les commandes attendues et les limites connues ; distinguer couverture diagnostique, gates bloquants et approbation humaine.

**Point de contrôle** : configuration exécutable sur Node 24 ; reset réconcilié ; aucune règle métier encore déclarée validée.

## Phase 2 — Fondations communes

**Objectif** : fournir des données validées, un hasard reproductible et des identifiants indépendants de la seed. Cette phase bloque les trois parcours.

### Snapshot : contrat et outillage de production

- [ ] T007 [P] Écrire dans `tests/contract/cube-snapshot.test.ts` les cas de schéma strict et de validation sémantique : fichier vide/malformé, version/provenance invalides, refus à 359 instances, IDs dupliqués, indices incohérents, compteurs et digest altérés ; autoriser les impressions et cartes répétées, ainsi que des versions synthétiques Titou de 540 et 360 instances, sans leur imposer les comptes exacts du snapshot initial de 545.
- [ ] T008 [P] Écrire dans `tests/unit/cubes/normalize-snapshot.test.ts` les cas de sélection du mainboard, exclusion des collections séparées, maintien des terrains de base présents, identité d’impression/illustration et IDs ordonnés ; couvrir réimport inchangé et révisions datées avec suffixe `.N`.
- [ ] T009 Implémenter `src/cubes/validate-snapshot.ts`, `src/cubes/canonical-snapshot.ts` et `src/cubes/cube-snapshot.schema.json` depuis le contrat : Ajv strict 2020-12, formats, contrôles sémantiques et SHA-256 de la projection canonique RFC 8785, sans inclure date de récupération ni digest lui-même ; faire passer T007.
- [ ] T010 Implémenter `src/cubes/normalize-snapshot.ts` pour produire le snapshot immuable et sa provenance sans réseau, sans dédupliquer les cartes ni injecter de terrains ; faire passer T008 et refuser la réécriture silencieuse d’une version différente.
- [ ] T011 Écrire dans `tests/integration/import-cube.test.ts` les cas fetch/normalize/validate : une seule requête explicite avec user-agent, URL/date/hash conservés, erreurs d’entrée et absence de réseau pour normalisation/validation ; utiliser des réponses réseau simulées.
- [ ] T012 Implémenter `src/cli/import-cube.ts` et `src/cubes/load-snapshot.ts`, puis raccorder `cube:fetch`, `cube:normalize` et `cube:validate` dans `package.json` ; respecter les codes de sortie de `contracts/cli.md`, faire passer T011 et vérifier que l’outillage de production reproduit le contenu fonctionnel et l’empreinte canonique du snapshot bootstrap T013.

### Hasard et identité : tests puis implémentation

- [ ] T014 [P] Écrire dans `tests/unit/random/seeded-random.test.ts` des vecteurs attendus pour seed int32, dérivation SHA-256 `draftmaster-seed-v1`, flux `distribution` et `policy:seat:0` à `policy:seat:7`, tirage entier et Fisher–Yates ; vérifier l’indépendance des flux sans produire les attentes par la fonction testée.
- [ ] T015 Implémenter `src/random/seeded-random.ts` avec `pure-rand` verrouillé, xoroshiro128plus, échantillonnage uniforme et métadonnées de version ; faire passer les vecteurs T014 et rendre explicite tout changement de convention.
- [ ] T016 [P] Écrire dans `tests/unit/cli/session-identity.test.ts` les cas ID de 12 hexadécimaux minuscules, collision détectée puis régénération, seed indépendante et seed absente générée en int32 ; injecter la source d’aléa pour rendre les collisions testables.
- [ ] T017 Implémenter `src/cli/session-identity.ts` avec aléa cryptographique et registre limité à l’exécution courante ; faire passer T016 sans introduire registre persistant ni génération d’ID dans le moteur.
- [ ] T018 Définir dans `src/draft/internal/types.ts`, `src/draft/internal/errors.ts` et `src/bots/pick-policy.ts` les valeurs readonly, `Result`, erreurs stables dont `POLICY_MISMATCH`, configuration fixe, événements versionnés et contexte de politique ; inclure les huit descripteurs `seatPolicies` et les sources de décision identifiées/versionnées ; garder l’état interne opaque et exclure identité de session/horodatages du contexte de décision.

**Point de contrôle** : snapshot validé et versionné ; jeux de tests données/RNG/identité verts ; aucune simulation ne nécessite CubeCobra.

## Phase 3 — US1 : Simuler un draft complet (P1, MVP)

**Objectif** : lancer le draft automatisé en CLI, tout en permettant au moteur d’accepter un choix explicite au siège 0.

**Test indépendant** : avec le snapshot figé et une seed connue, exécuter la commande et vérifier 24 boosters initiaux de 15 instances, 45 tours, 360 choix légaux, huit pools de 45 et 185 instances inutilisées.

### Tranche 1 : création et distribution

- [ ] T019 [P] [US1] Écrire dans `tests/contract/draft-engine.test.ts` les tests de `startDraft` et `getDraftView` : entrées invalides, métadonnées séparées, configuration fixe, 24 boosters uniques et N − 360 inutilisées pour N = 545, 540 et 360 (185, 180 et zéro), avec refus sous 360 ; vérifier le snapshot normalisé complet embarqué une seule fois dans `DraftStarted.snapshot` et qu’une modification des entrées, vues ou événements retournés ne modifie pas la session. Vérifier aussi `INVALID_CONFIG` pour un enregistrement de politiques incomplet/dupliqué/hors sièges ou à ID/version vide, et la copie immuable ordonnée de `seatPolicies` dans l'événement initial.
- [ ] T020 [US1] Implémenter `src/draft/internal/start-draft.ts`, `src/draft/internal/draft-view.ts` et l’interface `src/draft/index.ts` pour exposer création/vue et état opaque immuable, sans I/O, réseau ou horloge implicite ; calculer les N − 360 inutilisées depuis la taille du snapshot, puis faire passer T019 avec `DraftStarted` contenant une copie du snapshot normalisé complet et `BoostersDealt`.

### Tranche 2 : transitions atomiques et fin de session

- [ ] T021 [P] [US1] Écrire dans `tests/unit/draft/submit-pick-round.test.ts` les tests du tour atomique à huit décisions : session/révision incorrectes, siège inconnu/manquant/dupliqué, appelant hors siège 0, carte hors booster, tour rejoué et politique ou version différente de l'enregistrement initial (`POLICY_MISMATCH`) ; comparer état et journal avant/après chaque refus, même si l’erreur concerne le dernier siège, et vérifier qu'un choix explicite au siège 0 conserve son enregistrement.
- [ ] T022 [P] [US1] Écrire dans `tests/unit/draft/rotation.test.ts` les passages gauche/droite/gauche, identités des boosters conservées, frontières de paquet et fin après exactement 45 tours ; couvrir refus après fin et ordre des événements par siège de 0 à 7.
- [ ] T023 [US1] Implémenter `src/draft/internal/submit-pick-round.ts` et `src/draft/internal/rotation.ts`, puis exposer `submitPickRound` dans `src/draft/index.ts` ; valider toutes les décisions avant transition et produire choix, passages, fins de paquet et fin de draft selon le contrat ; faire passer T021–T022.

### Tranche 3 : participants automatisés et orchestration

- [ ] T024 [P] [US1] Écrire dans `tests/unit/bots/pick-policy.test.ts` les tests communs des politiques aléatoire seedée et scriptée : choix légal/reproductible, ID/version immuables et non vides, contexte sans identité de session ni heure, script incomplet et réponse illégale ; aucun critère de puissance ou de tribu.
- [ ] T025 [US1] Implémenter `src/bots/seeded-random-policy.ts` et `src/bots/scripted-policy.ts` en respectant `PickPolicy` et les flux dédiés ; faire passer T024 sans importer les détails internes du moteur.
- [ ] T026 [US1] Écrire dans `tests/integration/simulate-draft.test.ts` une simulation complète, un parcours avec choix explicites du siège 0 et des échecs de politique ; vérifier l'enregistrement initial des huit ID/versions et le refus d'un adaptateur remplacé ou annoncé sous une autre version, sans tour partiel ni faux succès ; vérifier que l'état et les versions d'une ancienne session ne changent pas quand une nouvelle session utilise d'autres versions.
- [ ] T027 [US1] Implémenter `src/simulation/simulate-draft.ts` : fixer moteur/adaptateurs et transmettre leurs huit descripteurs avant création, assembler les huit décisions avec leurs vraies sources ID/version, injecter temps/identité, arrêter sur erreur et retourner la session finale ; faire passer T026 en utilisant uniquement l’interface publique du moteur, sans remplacement d'adaptateur en cours de session.

### Tranche 4 : sortie utilisable depuis la CLI

Le rapport est nécessaire dès US1 pour respecter le contrat CLI. US3 ajoutera sa vérification indépendante et les scénarios d’audit approfondis, sans créer de seconde implémentation du rapport.

- [ ] T028 [P] [US1] Écrire dans `tests/contract/draft-report.test.ts` les tests du rapport terminal : refus avant fin, identité/seed/provenance/configuration/versions, journal, pools, inutilisées et invariants ; vérifier `functionalDigest` sur un vecteur canonique attendu indépendant, son format SHA-256 hexadécimal minuscule et l'exclusion de son propre champ du calcul ; vérifier l’absence de références modifiables vers la session. Vérifier que la version moteur et les huit descripteurs ID/version du rapport sont exactement ceux de `DraftStarted`.
- [ ] T029 [US1] Implémenter `src/draft/internal/build-draft-report.ts`, `src/draft/internal/check-invariants.ts` et `src/draft/internal/functional-projection.ts`, puis exposer `buildDraftReport` dans `src/draft/index.ts` ; calculer SHA-256 sur la projection canonique RFC 8785 encodée UTF-8, avant d'attacher `functionalDigest`, selon les exclusions du modèle de données ; faire passer T028 sans rapport de succès si un invariant échoue et sans placer le digest du rapport dans son journal ou ses invariants.
- [ ] T030 [P] [US1] Écrire dans `tests/e2e/simulate-cli.test.ts` les tests de la commande documentée `npm --silent run simulate --` : cube par défaut/explicite, seed explicite/générée, un seul JSON UTF-8 et saut de ligne sur stdout sans bannière npm, erreurs applicatives toujours présentes sur stderr et codes 0 à 5 propagés ; contrôler cette invocation exacte via npm, pas uniquement le fichier TypeScript.
- [ ] T031 [US1] Implémenter `src/cli/simulate-draft.ts` et `src/cli/errors.ts`, puis raccorder `simulate` dans `package.json` ; charger/valider le snapshot avant création de session, automatiser les huit sièges et faire passer T030 sans sortie parasite ni accès réseau.
- [ ] T032 [US1] Ajouter dans `tests/unit/draft/conservation.test.ts` les propriétés fast-check : conservation de toutes les instances après chaque tour légal, absence de double attribution, tailles attendues et refus sans mutation ; conserver les seeds et chemins de réduction des contre-exemples.
- [ ] T033 [US1] Compléter dans `tests/integration/simulate-draft.test.ts` les assertions reliant distribution initiale, cartes légales de chaque tour, directions, 360 choix et répartition finale pour N = 545, 540 et 360, dont une collection inutilisée vide à N = 360 ; vérifier que les terrains du mainboard restent ordinaires et qu’aucune instance supplémentaire n’apparaît.
- [ ] T034 [US1] Exécuter les suites US1 et la commande sur le snapshot réel, puis consigner leurs résultats dans `specs/001-simulate-titou-draft/qa-evidence.md` ; ne déclarer le MVP validé que si chaque scénario d’acceptation US1 passe.
- [ ] T035 [US1] Documenter dans `README.md` le lancement CLI et un exemple d’appel de l’interface publique avec choix explicite au siège 0, ainsi que les limites du MVP : bots aléatoires, pas de scoring, pas de reprise ni interface graphique.

**Point de contrôle** : MVP démontrable en CLI et par l’interface du moteur ; ne pas présenter ses choix aléatoires comme une évaluation des cartes.

## Phase 4 — US2 : Rejouer une simulation (P2)

**Objectif** : garantir l’identité fonctionnelle à entrées égales et reconstruire les transitions à partir du journal, sans relancer les bots.

**Test indépendant** : exécuter deux sessions avec les mêmes entrées mais des IDs/heures différents, comparer distribution/choix/rotations/pools, puis reconstruire chaque état observable depuis le journal.

### Tests de reproductibilité et de replay

- [ ] T036 [P] [US2] Écrire dans `tests/integration/determinism.test.ts` les comparaisons de contenu et de digest à seed/snapshot/versions/politiques/choix explicites égaux, en variant ID et temps d'exécution, y compris dans le journal imbriqué ; vérifier que changer la consommation du flux d’un siège ne change pas la distribution initiale.
- [ ] T037 [P] [US2] Écrire dans `tests/contract/replay-draft.test.ts` les cas de replay valide et de journal altéré : séquence lacunaire/dupliquée, mauvaise session, événement manquant/inconnu/hors ordre, choix illégal, mauvaise rotation et fausse fin ; tester aussi snapshot embarqué absent/invalide, référence ou digest incohérent et instance distribuée étrangère, avec `INVALID_EVENT_STREAM` ; interdire I/O, horloge, RNG et exécution de politique pendant la relecture. Vérifier aussi `INVALID_EVENT_STREAM` pour enregistrement initial de politiques invalide ou source automatisée d'un choix en désaccord avec l'ID/version de son siège.
- [ ] T038 [US2] Écrire d'abord dans `tests/unit/draft/functional-projection.test.ts` les cas d'exclusion par emplacement des IDs de session, horodatages déclarés et seul champ `functionalDigest` du rapport, sans mutation de l'original ; vérifier ordre des clés indifférent, ordre des listes conservé, versions datées et digests du snapshot inclus, puis des mutations détectables de cartes, seed, configuration, versions, ordre et choix ; compléter si nécessaire `src/draft/internal/functional-projection.ts` pour faire passer ces cas et T036.
- [ ] T039 [US2] Implémenter `src/draft/internal/replay-draft.ts` et exposer `replayDraft` dans `src/draft/index.ts` ; valider le snapshot embarqué et les événements au lieu de faire confiance aux états déclarés, reconstruire les informations de cartes et la provenance depuis `DraftStarted.snapshot`, et faire passer T037 sans re-simuler les décisions ni consulter de source externe.
- [ ] T040 [US2] Ajouter dans `tests/integration/replay-equivalence.test.ts` la comparaison de chaque état original/reconstruit, des informations d’impression et de provenance, et des rapports terminaux sur plusieurs seeds, parcours scriptés et tailles N = 545, 540 et 360 ; relire un journal sérialisé/désérialisé sans accès au fichier snapshot initial, au réseau ou aux politiques. Tester les préfixes après chaque transition complète selon le contrat : après `BoostersDealt`, puis après chaque tour accepté, jusqu’à `DraftCompleted` inclus. Vérifier `INVALID_EVENT_STREAM` pour le journal vide et toute coupure interne à une transition, notamment après `DraftStarted`, entre les choix, avant l’événement de fin de tour ou entre le dernier `PackCompleted` et `DraftCompleted` ; vérifier `DRAFT_NOT_COMPLETED` lors de la demande de rapport sur un préfixe valide non terminal, sans proposer une reprise de session.
- [ ] T041 [US2] Créer `tests/fixtures/reference-drafts/titou-2026-02-24.1-seed-42.json` et `tests/fixtures/reference-drafts/README.md` avec seed, snapshot/digest, versions et résultat attendu ; vérifier manuellement les invariants et documenter la procédure de changement sans régénération automatique des attentes lors des tests.
- [ ] T042 [US2] Ajouter dans `tests/integration/reference-draft.test.ts` la non-régression sur cette référence et dans `tests/integration/replay-properties.test.ts` les propriétés replay/conservation/reproductibilité ; toute divergence doit expliquer si elle est un bug ou un changement versionné intentionnel.
- [ ] T043 [US2] Raccorder `test:reference` et `test:replay` dans `package.json`, exécuter les suites US2 et enregistrer les résultats et versions dans `specs/001-simulate-titou-draft/qa-evidence.md`.

**Point de contrôle** : les différences d’identité/temps sont tolérées ; les différences de comportement ne sont ni ignorées ni masquées par une fixture régénérée.

## Phase 5 — US3 : Auditer le résultat (P3)

**Objectif** : prouver qu’un contributeur peut expliquer chaque choix et retrouver chacune des N instances avec le seul rapport (545 pour le snapshot initial).

**Test indépendant** : charger uniquement un rapport sérialisé, établir la correspondance origine → booster → choix → pool ou inutilisées pour toutes les instances, puis détecter des rapports volontairement corrompus.

- [ ] T044 [P] [US3] Écrire dans `tests/integration/report-audit.test.ts` un contrôle indépendant du producteur, à partir du seul rapport sérialisé et du snapshot embarqué dans son journal : traçabilité et impressions des N instances, détail des 360 choix, ordre, rotations, provenance, métadonnées et répartition 360/(N − 360) pour N = 545, 540 et 360 ; ne pas importer `check-invariants.ts` pour calculer les résultats attendus ni consulter le snapshot externe.
- [ ] T045 [P] [US3] Écrire dans `tests/unit/draft/report-integrity.test.ts` des mutations ciblées du rapport et du journal : instance perdue/dupliquée/étrangère, mauvaise destination, version manquante, séquence incohérente et digest absent/malformé/altéré ; recalculer le digest pour détecter sa corruption même si les projections sont égales, indépendamment des contrôles du snapshot ; vérifier que les résultats d’invariants ne sont pas des constantes de succès.
- [ ] T046 [US3] Compléter `src/draft/internal/check-invariants.ts` et `src/draft/internal/build-draft-report.ts` à partir de T044–T045 pour garantir conservation, légalité, complétude et diagnostics stables du contrat ; réutiliser la projection canonique et le replay lorsqu’ils apportent une vérification nécessaire, sans ajouter de nouvelle API publique.
- [ ] T047 [P] [US3] Ajouter dans `tests/e2e/offline-and-errors.test.ts` les cas CLI avec réseau interdit, fichier absent/illisible/JSON invalide, erreur de politique et invariants en échec ; vérifier codes de sortie et diagnostics exploitables sans données complètes, variables d’environnement ou chemins sans rapport avec l’erreur.
- [ ] T048 [US3] Implémenter dans `tests/integration/performance.test.ts` le protocole approuvé de `specs/001-simulate-titou-draft/performance-protocol.md` : snapshot initial chargé/validé, seed 42, trois échauffements puis cinq sessions neuves mesurées jusqu'au rapport/empreinte/JSON UTF-8 prêt à écrire, chacune strictement sous 2 000 ms ; tester la décision de seuil à 1 999/2 000/2 001 ms, exclure démarrage et disque du chronométrage sans retirer leur couverture E2E, et consigner les cinq durées, maximum, versions et environnement dans `specs/001-simulate-titou-draft/qa-evidence.md`.
- [ ] T049 [US3] Raccorder `test:domain-errors`, `test:performance` et `test:e2e` dans `package.json`, puis exécuter les suites d’audit et les commandes de `specs/001-simulate-titou-draft/quickstart.md` ; confirmer que le rapport redirigé peut être parsé tel quel.
- [ ] T050 [US3] Ajouter dans `specs/001-simulate-titou-draft/quickstart.md` un exemple d’audit d’une instance et d’un choix à partir du rapport seul, avec interprétation des versions, invariants et digest ; ne pas présenter les contrôles techniques comme une mesure de qualité du deck.
- [ ] T051 [US3] Compléter la matrice `specs/001-simulate-titou-draft/qa-evidence.md` avec les preuves SC-001 à SC-006, résultats des cas altérés et limites de performance ; solliciter une lecture humaine du rapport avant de déclarer l’audit terminé.

**Point de contrôle** : conservation et historique vérifiables indépendamment ; aucune validation humaine cochée par l’agent à la place de l’utilisateur.

## Phase 6 — Qualité transversale et livraison

- [ ] T052 Compléter `.github/workflows/quality.yml` pour Node 24 sur Windows/macOS/Linux : format, lint, types, tests unitaires/contrat/propriétés/intégration/E2E/référence/replay et artefacts de couverture ; isoler le job de performance selon `specs/001-simulate-titou-draft/performance-protocol.md`, publier les cinq durées sans masquer les échecs, et distinguer les résultats du runner de la preuve sur le poste de référence dans `specs/001-simulate-titou-draft/qa-evidence.md`.
- [ ] T053 Ajouter `.github/workflows/security.yml` pour détection de secrets et audit des dépendances, avec permissions minimales et échecs explicités ; vérifier dans `data/cubes/titou_tribal/README.md` que seules les données normalisées nécessaires et leur attribution sont publiées.
- [ ] T054 Mettre à jour `README.md` et `AGENTS.md` pour refléter le runtime TypeScript réellement livré, les commandes disponibles et les conventions de test ; conserver les consignes de gouvernance et ne plus documenter le runtime supprimé comme runtime actif.
- [ ] T055 Refaire le parcours depuis une installation propre avec `npm ci` et les commandes de `specs/001-simulate-titou-draft/quickstart.md`, puis enregistrer résultats, couverture diagnostique et risques résiduels dans `specs/001-simulate-titou-draft/qa-evidence.md` ; Lighthouse et QA visuelle restent non applicables à cette CLI.
- [ ] T056 Exécuter `speckit-converge` sur `specs/001-simulate-titou-draft/tasks.md`, traiter les écarts restants puis relancer l’analyse Spec Kit ; enregistrer les conclusions dans `specs/001-simulate-titou-draft/qa-evidence.md` sans auto-approuver la checklist humaine.
- [ ] T057 Préparer la revue Standards + Spec et une PR liée aux issues dans `specs/001-simulate-titou-draft/pr-summary.md` : périmètre, preuves QA, données générées, versions et limites ; obtenir CI verte et approbation humaine avant fusion, sans auto-merge.

## Dépendances et ordre d’exécution

```text
T013 : snapshot historique préservé
  → T001 : reset séparé fusionné ou réconcilié
  → Analyse Spec Kit sans blocage
  → Phase 1 : configuration
  → Phase 2 : snapshot + RNG + identité + contrats
  → US1 : moteur + politiques + simulation + rapport/CLI
  → US2 : comparaison + replay + référence
  → US3 : audit indépendant + erreurs/offline + performance
  → Phase 6 : vérifications complètes + revue + approbation humaine
```

US2 dépend du moteur/journal US1. US3 vérifie le rapport livré en US1 et exploite le replay US2. Les tests d’acceptation sont isolables, mais ces dépendances ne permettent pas de livrer les trois parcours en parallèle.

- Phase 0 : T013 → T001 ; ne pas commencer T002 avant la preuve de fusion ou de réconciliation du reset.
- Phase 1 : T002 → T003/T004 → T005 → T006.
- Phase 2 : T007/T008 → T009 → T010 → T011 → T012 ; T014 → T015 et T016 → T017 sont deux chaînes indépendantes de l’import ; terminer par T018.
- US1 : T019 → T020 → T021/T022 → T023 ; T024 → T025 peut avancer séparément des transitions ; T023 et T025 → T026 → T027 ; T028 → T029 ; T030 → T031 attend T027 et T029 ; T032–T035 terminent la validation.
- US2 : T036/T037 → T038 → T039 → T040 → T041 → T042 → T043.
- US3 : T044/T045 → T046 ; T047 peut avancer séparément de ces tests ; T046 et T047 → T048 → T049 → T050 → T051.
- Phase 6 : T052 → T053 → T054 → T055 → T056 → T057 ; toute correction doit être retestée avant livraison.

Les tâches ajoutant des tests sur un comportement déjà construit doivent d’abord rechercher un contre-exemple ou établir le besoin de couverture ; ne pas modifier artificiellement le moteur pour provoquer un échec. Ne pas commencer toutes les implémentations après un unique lot massif de tests : suivre les tranches décrites.

## Exemples de travail parallèle par parcours

- **US1** : après T020, écrire T021 (validation des tours) et T022 (rotation) dans leurs fichiers distincts ; T024 (contrat des bots) n’exige que les fondations. Attendre leurs tests avant les implémentations associées.
- **US2** : après US1, écrire T036 (déterminisme) et T037 (replay) séparément ; ne pas modifier simultanément l’interface publique partagée.
- **US3** : après US2, écrire T044 (audit indépendant), T045 (corruption) et T047 (CLI offline/erreurs) dans leurs fichiers distincts ; rassembler ensuite les résultats avant T046/T048.

Ces possibilités décrivent l’ordonnancement du travail, pas une autorisation de lancer des agents ou des tâches supplémentaires.

## Traçabilité des exigences et critères de succès

| Exigence | Tâches principales |
|---|---|
| FR-001, FR-002 — snapshot figé, provenance et instances | T007–T013 |
| FR-003 — validation avant utilisation | T007, T009, T011–T013, T031, T047 |
| FR-004, FR-005 — identité et entrées séparées | T016–T020, T028–T031 |
| FR-006, FR-009 — sièges, choix explicites, légalité | T018, T021–T027, T032–T034 |
| FR-007, FR-008 — distribution et rotation | T014–T015, T019–T023, T033 |
| FR-010 — politiques aléatoires sans scoring | T024–T027, T031 |
| FR-011 — déterminisme | T014–T015, T036, T038, T041–T043 |
| FR-012, FR-013 — journal ordonné et détaillé | T018–T023, T028–T029, T037–T040, T044 |
| FR-014 — rapport et invariants | T028–T029, T032–T034, T044–T051 |
| FR-015, FR-016 — fin exacte et refus après fin | T021–T023, T026–T027, T032–T033 |
| FR-017 — simulation hors ligne | T011–T012, T031, T047 |
| FR-018 — limites du périmètre | T024, T035, T050, T054, T056–T057 |
| FR-019 — versions du moteur et de la politique | T018, T024–T025, T028–T029, T041, T044 |
| SC-001 — 360 choix, huit pools de 45, N − 360 inutilisées | T019–T023, T026, T032–T034, T044 |
| SC-002 — mêmes entrées, même contenu fonctionnel | T036, T038, T041–T043 |
| SC-003 — N instances conservées exactement une fois | T032–T033, T040, T044–T046 |
| SC-004 — refus sans mutation | T021–T023, T026–T027, T032 |
| SC-005 — audit de chaque choix depuis le rapport | T037–T040, T044–T046, T050–T051 |
| SC-006 — simulation et rapport en moins de deux secondes | T048–T049, T051–T052 |

## Stratégie de livraison

1. Exécuter l’analyse de cohérence sur spec/plan/tasks. Corriger les sources des problèmes bloquants avant de passer à l’implémentation ou de convertir les tâches en issues GitHub.
2. Livrer le **MVP US1** après les fondations : draft complet utilisable en CLI, règles testées et rapport conforme. Ce jalon ne remplace pas les exigences de replay et d’audit de la feature complète.
3. Ajouter US2, puis US3, en conservant les tests précédents verts. Valider chaque point de contrôle avant de passer au suivant.
4. Terminer les gates transversaux, la convergence, les revues et l’approbation humaine. Ne marquer une tâche terminée qu’avec une preuve ; ne jamais remplacer une décision humaine par une case cochée automatiquement.
