# Research: Gestion de tournois de cube

## 1. Positionnement réglementaire

**Decision**: présenter DraftMaster comme un gestionnaire de tournois Cube locaux et non comme un logiciel d'homologation Wizards. Utiliser les points et départages Magic connus, mais nommer et versionner l'algorithme d'Appariement propre à DraftMaster.

**Rationale**: les [Magic Tournament Rules, sections 3 et 10 et annexes C/E](https://media.wizards.com/ContentResources/WPN/MTG_MTR_2026_Feb27_EN.pdf) décrivent points, départages, nombre annoncé de rondes et principes généraux du suisse, sans publier l'algorithme détaillé d'EventLink. Le [guide officiel EventLink](https://wpn.wizards.com/en/news/definitive-guide-wizards-eventlink) confirme l'appariement de résultats similaires et les opérations de correction, mais pas un solveur reproductible.

**Alternatives considered**:

- prétendre reproduire EventLink : rejeté faute de contrat algorithmique public ;
- inventer uniquement un classement maison : rejeté car les points et départages Magic sont simples, familiers et auditables ;
- ajouter un preset Premier homologué : différé, car le MVP vise des soirées Cube de 2 à 32 personnes.

## 2. Points, pauses et départages

**Decision**: victoire 3 points, nul 1, défaite 0 ; Exemption suisse 2-0 et 3 points ; Pause toutes-rondes sans point. Classer par points, OMW%, GWP%, OGW%, en conservant des fractions exactes et le plancher de 33,33 % jusqu'à l'affichage.

**Rationale**: ces valeurs et formules viennent de l'annexe C des MTR. Les Exemptions suisses sont exclues des moyennes d'adversaires. Une Pause toutes-rondes n'est pas un bye compétitif : elle représente simplement l'absence de match dans une rotation à trois.

**Alternatives considered**:

- traiter la pause à trois comme une victoire : rejeté, car elle avantagerait artificiellement chaque joueur selon un résultat non joué ;
- utiliser l'ordre d'inscription comme dernier départage : conservé uniquement comme ordre technique stable, jamais comme critère compétitif ;
- enregistrer seulement victoire/défaite : rejeté, car cela empêche GWP%/OGW% et masque les scores 2-0/2-1.

## 3. Appariement suisse déterministe

**Decision**: persister un `pairingSeed` et utiliser un matching parfait déterministe qui minimise lexicographiquement rematches, multiplicité des rematches, écarts de points et écarts de rang. Une recherche branch-and-bound spécialisée pour au plus 32 participants utilise uniquement des coûts entiers et produit une preuve par match.

**Rationale**: un greedy dépend de l'ordre de parcours et peut produire un rematch ou un float évitable. La faible taille et le faible nombre de rondes gardent le graphe de candidats dense ; sélectionner d'abord le participant ayant le moins de candidats et borner par le meilleur coût connu rend la recherche vérifiable et adaptée au MVP.

**Alternatives considered**:

- greedy avec échanges locaux : rejeté comme règle d'autorité, car il ne garantit pas l'absence de rematch lorsqu'une solution existe ;
- dépendance externe de matching : rejetée pour la première version afin de conserver un moteur réduit, versionné et auditable ;
- appariements manuels : différés, car ils créeraient une seconde source de vérité et compliqueraient la reproductibilité.

## 4. Corrections tardives

**Decision**: toute correction ajoute un événement et une nouvelle version du Résultat de match. Elle recalcule le classement courant et influence les rondes futures, sans jamais réécrire une ronde déjà publiée.

**Rationale**: les adversaires annoncés sont des faits historiques. La politique est plus simple et plus auditable qu'une annulation/régénération de ronde. Elle reste compatible avec l'objectif MTR de corriger les scores tout en assumant que DraftMaster n'est pas un outil d'homologation.

**Alternatives considered**:

- annuler la dernière ronde si elle n'a pas commencé : utile mais différé, car cela introduit un nouvel état et un parcours de confirmation ;
- refuser toute correction après la ronde suivante : rejeté, car l'historique final resterait faux ;
- modifier la valeur en place : rejeté, car la correction deviendrait indétectable.

## 5. Stockage durable

**Decision**: utiliser PostgreSQL/Supabase comme autorité de production avec un checkpoint JSONB revisionné, un journal append-only, des reçus d'idempotence et une fonction transactionnelle. Utiliser un adapter mémoire uniquement lorsqu'il est explicitement injecté en test ou développement.

**Rationale**: `src/multiplayer-draft/local-file-store.ts` fournit une atomicité mono-processus mais pas multi-réplicas. `src/storage/cloud-leaderboard.ts` synchronise en best effort et ne convient pas à des rondes concurrentes. `supabase/schema.sql` contient déjà un précédent de révision, journal et RPC, mais le gateway multijoueur n'est pas réellement monté ; la feature tournoi doit livrer la chaîne complète avant de revendiquer une historisation en base.

**Alternatives considered**:

- JSON local avec synchronisation ultérieure : rejeté, car un crash ou deux instances pourraient perdre ou écraser un résultat ;
- tables relationnelles pour chaque participant/match/résultat : différées ; l'agrégat reste petit et le JSONB réduit le nombre de transactions coordonnées ;
- accès direct Supabase depuis le navigateur : rejeté, car il exposerait l'autorité d'écriture et disperserait les invariants.

## 6. Archive du Snapshot de cube

**Decision**: archiver le Snapshot de cube canonique complet dans la transaction de chaque sélection valide en préparation, puis verrouiller cette référence au démarrage ; référencer l'archive par `snapshotId` plus SHA-256.

**Rationale**: `src/cubes/load-active-snapshot.ts` reconstruit plusieurs cubes depuis des sources actives ; conserver seulement `cubeKey` ou un identifiant déclaré ne suffit pas à garantir l'identité future des Cartes clés de deck. L'archive permet aussi une validation sans dépendre de l'état courant du dépôt.

**Alternatives considered**:

- ne garder que `cubeKey` : rejeté, car la liste peut dériver ;
- copier uniquement les Cartes clés confirmées : rejeté, car une correction ultérieure ne pourrait plus être validée contre la liste complète ;
- exiger d'abord des fichiers snapshot pour tous les cubes : utile mais bloquerait inutilement le premier tournoi.

## 7. Contrôle d'accès MVP

**Decision**: réutiliser le gate de guilde existant et autoriser tout membre admis à administrer un tournoi. Les tables tournoi restent privées au rôle serveur. Aucun `organizerId` fictif n'est enregistré.

**Rationale**: `scripts/serve-web.mjs` utilise un mot de passe partagé et un cookie commun ; il ne fournit aucune identité individuelle. Le besoin utilisateur demande un outil simple, pas des comptes. La spec rend donc explicite ce mode collaboratif.

**Alternatives considered**:

- secret d'édition par tournoi : meilleure séparation sans comptes, mais ajoute gestion, transfert et récupération d'un secret ; différé tant que le besoin n'est pas exprimé ;
- Supabase Auth/JWT : rejeté pour le MVP, car il élargirait fortement le périmètre ;
- politiques RLS publiques analogues aux anciennes tables : rejetées ; les écritures passent par le serveur et la clé de service.

## 8. Interface web et cubes

**Decision**: conserver la SPA actuelle, remplacer le teaser et isoler le contrôleur dans `src/web/tournaments.js`. Fournir les cubes depuis le registre serveur au lieu d'ajouter une liste codée en dur.

**Rationale**: `src/web/index.html` et `src/web/app.js` ont déjà les routes et le teaser ; un nouveau projet client serait disproportionné. Plusieurs listes de cubes existent déjà et risquent de dériver.

**Alternatives considered**:

- nouveau framework client : rejeté, sans valeur proportionnée ;
- logique tournoi ajoutée directement dans `app.js` : rejetée, car ce fichier est déjà monolithique ;
- utiliser `loadActiveCubeSnapshot` comme filtre d'éligibilité : rejeté, car ses contraintes de draft à 360 cartes ne sont pas nécessaires pour historiser un tournoi.

## 9. Reconnaissance photo séparée

**Decision**: exclure entièrement la reconnaissance photo de la feature 008 et la suivre dans l'Issue #81. La future feature devra refaire `specify`, `clarify`, `plan`, `checklist`, `tasks` et `analyze` après le choix d'un provider réel.

**Rationale**: le lecteur JSON HTTP actuel est limité à 64 Kio et n'est pas adapté aux images. La reconnaissance n'affecte aucun invariant du tournoi. La conserver ici laisserait des exigences de confidentialité et un choix de provider non résolus avant implémentation, en conflit avec la constitution.

**Alternatives considered**:

- base64 dans le JSON existant : rejeté pour la mémoire, les limites de taille et l'observabilité ;
- conserver une tranche P3 partiellement spécifiée dans 008 : rejeté, car elle bloquerait inutilement le tournoi manuel ;
- créer dès maintenant une interface de vision : rejeté comme seam hypothétique sans provider ni second adapter réel.
