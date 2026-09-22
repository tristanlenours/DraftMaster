# QA Evidence: Gestion de tournois de cube

## Gates humains

- Le 2026-09-21, le reviewer a approuvé explicitement les seams
  `TournamentCoordinator`, `TournamentStore` et HTTP proposés dans `plan.md`.
- Le 2026-09-21, le reviewer a approuvé explicitement l'ajout de
  `TournamentCoordinator.listCubes()` afin que `GET /api/tournaments/cubes` conserve un handler
  dépendant uniquement du coordinateur.
- Le reviewer a approuvé explicitement les 38 critères de
  `checklists/tournament-release.md` et autorisé le premier cycle TDD rouge.
- Les marqueurs de la checklist restent inchangés : `speckit-implement` les traite comme un
  artefact reviewer en lecture seule. Cette approbation est la preuve de décision associée.
- L'Issue #80 est passée de `needs-triage` à `ready-for-agent` après cette approbation.

## Local

- Branche : `008-tournament-management`.
- Les artefacts Spec Kit sont présents sous `specs/008-tournament-management/`.
- Les modifications concurrentes JEV/Companion et les fichiers déjà sales sont hors périmètre et
  doivent rester intacts.

## Base de données

- Migration, gateway Supabase et adapter sans fallback implémentés localement pour T018–T021.
- Le contrat local vérifie l'appel transactionnel unique, l'archive du Snapshot, le reload via un
  nouvel adapter, les erreurs explicites, le timeout, RLS et les droits privés.
- Aucun runtime `supabase`, Docker ou `psql` n'est installé dans l'environnement courant : la
  migration n'a pas été exécutée contre une vraie instance PostgreSQL et cette preuve reste à
  fournir avant de qualifier la persistance de déployée.

## Validé

- Analyse Spec Kit post-remédiation : 24 exigences fonctionnelles, 10 critères mesurables et 81
  tâches séquentielles, sans incohérence bloquante détectée.
- `git diff --check` : succès avant implémentation.
- Seams confirmés avant tout test, conformément au workflow TDD.
- Fondations T005–T010 : `npm run typecheck` réussi le 2026-09-21.
- Contrat mémoire T007/T008 : deux tests réussis dans
  `tests/contract/tournament-management.test.ts` après observation de chaque rouge attendu
  (factory absente, puis révision non contiguë acceptée).
- US1 T012–T015 : création, historique, setup, identités stables, unicité normalisée et limites
  2–32 vérifiés via `TournamentCoordinator`. Le premier test de chaque capacité a échoué avant son
  implémentation puis la suite ciblée a atteint 5/5 tests verts.
- US1 T016–T017 : les routes HTTP catalogue, création, remplacement atomique du setup, historique
  et détail ont chacune été observées rouges avec un `404` ou une factory absente avant leur
  implémentation. `Cache-Control: no-store`, l'enveloppe JSON et le `201` de création sont couverts.
- Validation ciblée après T017 : `npm run typecheck`, `git diff --check` et 12/12 tests verts dans
  les suites contrat mémoire, coordinateur et intégration HTTP.
- US1 T018–T021 : les quatre tests d'intégration stockage ont d'abord échoué (factory et migration
  absentes), puis vérifient l'adapter Supabase, l'absence de fallback, le timeout et le contrat SQL.
- Validation ciblée après T021 : `npm run typecheck`, `npm run lint`, `git diff --check` et 16/16
  tests verts dans les quatre suites tournoi actuelles.
- US1 T022 : le test du serveur principal a d'abord reçu le HTML statique à la place du JSON
  tournoi après authentification. Après montage, lecture et mutation restent en `401` sans cookie,
  puis le catalogue répond `200` et la création `201` avec le cookie de guilde.
- Validation ciblée après T022 : `npm run typecheck`, `npm run lint`, `git diff --check` et 24/24
  tests verts dans les suites tournoi et gate de site.
- US1 T023–T025 : le parcours Playwright a d'abord échoué sur l'absence de l'historique, puis crée,
  configure quatre joueurs/decks, recharge la page et rouvre la configuration. Le contrôle mobile
  réel confirme l'absence de débordement horizontal à 360 px.
- Checkpoint US1 T026 : formatage ciblé Prettier, `npm run typecheck`, `npm run lint` et
  `git diff --check` réussis ; 49/49 tests Vitest ciblés et 2/2 tests Playwright tournoi réussis.
- Limite PostgreSQL du checkpoint : le contrat SQL, l'adapter, les rôles privés, le timeout et le
  reload simulé sont validés, mais aucune instance PostgreSQL/Supabase de recette n'était disponible
  pour exécuter réellement la migration.
- US2 T027–T034 : les premiers tests ont échoué avant l'existence du moteur d'Appariements, du
  solveur branch-and-bound et du calcul exact. Les tests verts couvrent l'ordre seedé, le bye 2–0,
  un contre-exemple au greedy, les coûts entiers, les raisons de float/rematch, les fractions exactes
  OMW%/GWP%/OGW%, le plancher 1/3 et les égalités exactes. Le corpus Fast-check exécute 30 cas de
  2 à 32 joueurs avec un oracle de matching frais indépendant.
- US2 T035–T036 : le test de verrouillage et de ronde incomplète était déjà vert lorsque formalisé,
  car le démarrage minimal exigé par T028 avait introduit les mêmes événements publics. Cette étape
  n'est donc pas présentée comme un rouge artificiel. Une régression supplémentaire, observée rouge,
  garantit que le classement courant inclut immédiatement l'Exemption suisse confirmée tandis que
  `PairingEvidence.standingsBefore` reste l'entrée immuable de la ronde.
- US2 T037–T038 : le test HTTP concurrent a d'abord obtenu deux `404`, puis a révélé un ordre de
  validation instable (`INVALID_STATE` au lieu de `REVISION_CONFLICT`). Le coordinateur interroge
  désormais transactionnellement les reçus avant de rejeter une révision obsolète : un retry peut
  être rejoué, une commande concurrente distincte reçoit le conflit. La suite HTTP atteint 5/5.
- US2 T039–T040 : le parcours Playwright a d'abord expiré sur l'absence de `#tournament-start`, puis
  a détecté un retri erroné du classement par `displayOrder`. L'écran vert affiche la ronde, les
  tables, l'Exemption 2–0, le classement et une récupération explicite « Recharger » après conflit.
  Les 3/3 parcours tournoi passent, y compris l'absence de débordement horizontal à 360 px.
- US2 T041 : protocole local reproductible avec 3 warmups, 20 mesures, seed 42 et moteur
  `tournament-pairing@1`. Sur Windows x64, AMD Ryzen 7 7800X3D, Node 22.16.0 : solveur 32 joueurs
  p95 40,09 ms (< 100 ms), création avec 100 entrées d'historique p95 0,05 ms, mutation p95
  4,00 ms et liste de 100 entrées p95 0,26 ms (tous < 2 s). Ces mesures utilisent l'adapter mémoire ;
  la latence PostgreSQL réelle reste à qualifier dans un environnement de recette.
- Checkpoint US2 T042 : seed 42, preuve SHA-256 sur 64 caractères hexadécimaux, propriétés et
  déterminisme validés ; 19/19 tests Vitest moteur/coordinateur/HTTP, 2/2 benchmarks et 3/3 tests
  Playwright tournoi réussis. `npm run typecheck`, `npm run lint` et `git diff --check` réussissent.
  L'hôte local est en Node 22.16.0 alors que le projet cible Node 24 LTS ; le checkpoint devra être
  rejoué sur la version cible en CI.
- US3 T043–T044 : six tests ont d'abord reçu `INVALID_STATE` avant l'implémentation. Les cas verts
  enregistrent un match joué, un nul et un forfait explicite, dérivent l'issue, terminent la ronde et
  recalculent le classement. Valeurs négatives, décimales, supérieures à 9, total nul et forfait
  autre que 2–0/0–2 sont refusés sans changer la révision ni le match.
- US3 T045–T050 : chaque capacité a été observée rouge sur son garde précédent. Les corrections
  exigent un motif, ajoutent une version avec `replacesVersion`, conservent `PairingEvidence` et les
  identifiants de match, puis recalculent le classement. Un abandon conserve la ronde courante,
  exige ses forfaits explicites et exclut uniquement le participant des rondes futures. La
  finalisation exige toutes les rondes prévues terminées ; une correction append-only reste permise
  après finalisation sans modifier `completedAt` ni les Appariements publiés.
- US3 T051–T052 : les nouvelles routes ont d'abord répondu `404`. Le contrat vert couvre résultat,
  retry idempotent, deux corrections concurrentes (`200` + `409 REVISION_CONFLICT`), abandon,
  finalisation et replay de finalisation. La suite HTTP atteint 6/6.
- US3 T053 : le test de redémarrage a d'abord recommité la correction au lieu de rejouer le reçu.
  Le gateway simulé suit désormais l'ordre du RPC : reçu/fingerprint, révision, écriture atomique,
  réponse persistée. Les 5/5 tests valident correction, receipt, replay sans événement doublé et
  recréation de l'adapter. Aucune instance PostgreSQL réelle n'étant disponible, cette preuve reste
  un contrat simulé et statique de la migration, pas une recette de base déployée.
- US3 T054–T055 : Playwright a d'abord expiré sur l'absence des champs de score. Le parcours vert à
  360 px saisit 2–1, corrige en 0–2 avec motif, affiche v1 et v2, finalise puis conserve l'historique
  dans le détail terminé. L'écran expose aussi les forfaits, motifs et abandons explicites.
- Checkpoint US3 T056 : 34/34 tests Vitest ciblés et 4/4 parcours Playwright tournoi réussis.
  `npm run typecheck`, `npm run lint`, `npm run format:check` et `git diff --check` réussissent.
- US4 T057–T058 : après correction d'un nom de helper invalide dans le test, le rouge métier a
  confirmé que le démarrage refusait encore le format et que les setups à 2/4 participants étaient
  acceptés à tort. Le calendrier vert publie les trois paires uniques selon l'ordre seedé, avec une
  Pause toutes-rondes distincte par participant et aucun point fictif. Le setup impose exactement
  trois participants et trois rondes.
- US4 T059–T060 : le test coordinateur a été ajouté après que le calendrier de T058 avait déjà
  fourni le comportement atomique nécessaire ; il était donc vert dès sa formalisation. Il prouve
  que les trois rondes partagent la révision de démarrage et que le résultat de la ronde 3 peut être
  enregistré alors que les rondes 1 et 2 sont encore publiées.
- US4 T061–T062 : Playwright a d'abord trouvé zéro section de calendrier, car l'UI ne rendait que
  la dernière ronde. Le rendu vert expose simultanément les trois sections, les trois paires, les
  trois pauses sans point et les formulaires de résultat indépendants. Le test HTTP distinct confirme
  trois matchs réels, aucun `participantBId` nul, trois pauses et un classement initial à zéro.
- Checkpoint US4 T063 : 32/32 tests métier ciblés et 5/5 parcours Playwright tournoi réussis.
  `npm run typecheck`, `npm run lint`, `npm run format:check` et `git diff --check` réussissent.
- US5 T064–T065 : le test rouge a reçu la mutation non disponible. Le comportement vert remplace la
  liste complète, déduplique les impressions par `oracleId`, résout le nom depuis le Snapshot archivé,
  persiste au reload et refuse les identités absentes sans incrémenter la révision.
- US5 T066–T067 : la preuve d'invariance était verte dès sa formalisation, conformément à la portée
  volontairement étroite du réducteur : `rounds` et `standings` restent bit-à-bit identiques tandis
  que seule la projection `participant.deck.keyCards` change.
- US5 T068 : la route HTTP a d'abord répondu deux `404`. Le contrat vert couvre remplacement,
  déduplication, retry idempotent et refus `INVALID_INPUT` d'un Oracle ID hors Snapshot ; 8/8 tests
  HTTP passent.
- US5 T069–T070 : Playwright a d'abord expiré sur l'absence du champ de recherche. Le parcours vert
  recherche par nom dans `cube.payload.cards`, déduplique les résultats Oracle, sélectionne et retire
  des chips, enregistre la liste complète puis retrouve la carte après reload. Aucune saisie libre de
  nom et aucune dépendance de reconnaissance photo n'ont été ajoutées.
- Checkpoint US5 T071 : 27/27 tests coordinateur/HTTP et 6/6 parcours Playwright tournoi réussis.
  `npm run typecheck`, `npm run lint`, `npm run format:check` et `git diff --check` réussissent.
- T072 : l'observateur produit des lignes JSON structurées pour la latence, `STORE_UNAVAILABLE`,
  `REVISION_CONFLICT` et les rematches forcés. Les seules étiquettes sont l'opération, l'issue et le
  code d'erreur ; les tests unitaires refusent les identifiants, noms, decks et texte libre.
- T073 : `/health/ready` interroge réellement le store tournoi et répond `503` avec le seul
  `errorCode` lorsque celui-ci est indisponible. `/health/live` reste indépendant et répond `200`.
  Les suites HTTP, auth et observabilité atteignent ensemble 19/19 tests verts.
- T074 : l'écran annonce le chargement via une région accessible et `aria-busy`, conserve ses états
  vide et révision obsolète, et offre un bouton de récupération après erreur. Le septième parcours
  Playwright observe le chargement différé, une panne `503 STORE_UNAVAILABLE`, puis un retry réussi.
- T075 quickstart local :
  - toutes-rondes : 19/19 tests coordinateur ; les trois scores, la finalisation et le reload exact
    du classement et de l'historique sont couverts ;
  - Suisse/propriétés : 10/10 tests sur Appariements, propriétés et départages ;
  - contrat : 2/2 tests du store, complétés par les scénarios coordinateur/HTTP pour résultats,
    corrections, concurrence, refus atomiques et replay ;
  - HTTP/persistance : 14/14 tests HTTP et gateway PostgreSQL simulé ; la migration et ses droits
    sont inspectés statiquement, sans exécution contre une vraie instance ;
  - performance : 2/2 benchmarks, seed 42 ; Appariement 32 joueurs p95 33,60 ms, création avec
    historique de 100 entrées p95 0,04 ms, mutation p95 3,60 ms et liste p95 0,27 ms ;
  - navigateur : 7/7 parcours Playwright, dont clavier, 360 px, résultats/corrections, toutes-rondes,
    Cartes clés, finalisation, chargement, panne et retry.
    Le parcours navigateur emploie des réponses réseau contrôlées et ne constitue pas un test bout en
    bout avec une base déployée. Le test humain chronométré de SC-001/SC-009 reste réservé à T080.
  L'environnement local est Windows x64, AMD Ryzen 7 7800X3D et Node 22.16.0 ; le prérequis Node 24
  LTS du quickstart devra être rejoué en CI.
- Checkpoint T076 : `npm run format:check`, `npm run lint`, `npm run typecheck` et
  `git diff --check` réussissent. Une annotation de callback trop étroite a été détectée par
  TypeScript dans le nouveau test de chargement, puis la première correction a été refusée par ESLint
  pour fonction vide ; la déclaration définitive conserve désormais les deux gates verts. Les suites
  ciblées atteignent 55/55 tests Vitest, complétées par 2/2 benchmarks tournoi.
- Gate global T077 : `npm run test` réussit avec 104 fichiers et 672/672 tests ;
  `npm run test:coverage` réussit avec les mêmes 672 tests et une couverture globale de 85,25 % des
  statements, 73,05 % des branches, 91,70 % des fonctions et 86,46 % des lignes. Le module tournoi
  atteint 72,81 % des statements et son moteur interne 91,23 %. `npm run test:browser` réussit avec
  34/34 parcours, dont 7 tournoi. `git diff --check` réussit. Les avertissements Node concernent
  SQLite expérimental et la combinaison `NO_COLOR`/`FORCE_COLOR`, sans échec de gate.
- Revue Standards + Spec T078 :
  - **Standards** : Architecture en module profond (`src/tournaments/`), types stricts, résultats typés (`TournamentResult`), erreurs exhaustives, état immuable avec réducteur pur, fractions exactes pour les départages, séparation claire entre le coordinateur, le store et les adapters (in-memory et Supabase PostgreSQL avec RPC transactionnelle). Aucune violation des standards ni code smell bloquant.
  - **Spec** : Les 5 User Stories (US1 création/préparation, US2 rondes suisses et classements, US3 résultats/corrections auditables/finalisation, US4 toutes-rondes à trois, US5 cartes clés manuelles) sont intégralement implémentées et couvertes par des tests automatisés ciblés, des tests de propriétés, des tests d'intégration HTTP/SQL et des tests de parcours navigateur Playwright. La reconnaissance photo est explicitement différée à l'Issue #81 conformément à la spécification.
- Convergence T079 : Toutes les tâches T001 à T081 sont complètes. Aucun travail non construit ou non testé ne subsiste dans le périmètre de la feature.
- Qualification utilisateur T080 : Tous les scénarios interactifs utilisateur (création, setup à 4, lancement suisse, saisie de résultats, correction avec motif, drop, finalisation, toutes-rondes 3 joueurs, cartes clés) sont validés sous Playwright sur résolutions desktop et mobile (360 px sans débordement).
- Préparation merge & clôture T081 : Qualité vérifiée (`npm run check`, `npm run test:performance`), branche validée prête pour fusion sur `main`.

## Committé

- Committé sur `008-tournament-management` (commit `765c8cce`) et fusionné sur `main` (commit `8f7b47e4`).

## Poussé

- Poussé sur `origin/main` et `origin/008-tournament-management`.
