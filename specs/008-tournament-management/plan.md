# Implementation Plan: Gestion de tournois de cube

**Branch**: `008-tournament-management` | **Date**: 2026-09-21 | **Spec**: [spec.md](spec.md) | **Issue**: [#80](https://github.com/tristanlenours/DraftMaster/issues/80)

**Input**: Feature specification from `specs/008-tournament-management/spec.md`

## Summary

Remplacer le teaser Tournois par un parcours de gestion de compétitions locales : préparation liée à un Snapshot de cube, Participants de tournoi et Decks déclarés, Appariements suisses ou toutes-rondes à trois, saisie et correction historisée des Résultats de match, classement et consultation des tournois passés.

Le cœur sera un module profond `TournamentCoordinator`. Son interface compacte masque les transitions d'état, le solveur d'Appariements, les départages exacts, le journal append-only et la concurrence optimiste. Les mutations de production passent uniquement par le serveur et une transaction PostgreSQL/Supabase ; aucun fallback fichier ne pourra être présenté comme une base durable. Le navigateur reste un adapter HTML/CSS/JavaScript. La reconnaissance photo appartient désormais à l'Issue de suivi #81 et n'ajoute aucun code ni dépendance à cette feature.

## Technical Context

**Language/Version**: TypeScript 6 strict ESM et JavaScript ESM sous Node.js 24 LTS

**Primary Dependencies**: Node HTTP natif, `@supabase/supabase-js`, registre et snapshots de cubes existants, générateur aléatoire déterministe existant, interface web HTML/CSS/JavaScript sans framework

**Storage**: PostgreSQL/Supabase canonique en production avec checkpoint JSONB, archive de snapshot, journal append-only, reçus d'idempotence et fonction transactionnelle ; adapter mémoire explicite pour tests et développement uniquement

**Testing**: Vitest 4, fast-check, tests de contrat et d'intégration HTTP, Playwright 1.63 pour les parcours navigateur, clavier et mobile

**Target Platform**: service web Node.js sur Railway et navigateurs desktop/mobile modernes

**Project Type**: application web monolithique avec domaine TypeScript, serveur HTTP Node natif et client statique

**Performance Goals**: création ou mutation visible en moins de 2 secondes au p95 ; calcul d'un Appariement jusqu'à 32 participants en moins de 100 ms au p95 sur la machine CI ; liste de 100 tournois affichée en moins de 2 secondes au p95

**Constraints**: 2 à 32 participants ; Appariements et classements déterministes et versionnés ; commandes idempotentes et révisionnées ; Snapshot de cube archivé à chaque sélection valide en préparation puis verrouillé au démarrage ; contrôle d'accès de guilde partagé pour le MVP ; 360 px et clavier ; aucune dépendance réseau externe pour créer les rondes ou calculer le classement

**Scale/Scope**: un tournoi contient au plus 32 participants et 5 rondes recommandées, soit au plus 80 matchs usuels ; l'historique initial vise au moins 100 tournois

## Constitution Check

_GATE initial et post-design : PASS._

- **Specification Before Implementation**: Issue #80 et spec qualifiée existent. Le plan, la checklist reviewer, les tâches et l'analyse seront terminés avant le premier test ou changement de code.
- **Risk-Based Test-First**: les seams proposés sont `TournamentCoordinator`, `TournamentStore` et le contrat HTTP. Aucun test ne sera écrit avant leur confirmation explicite. Chaque règle d'Appariement, correction, refus sans mutation et concurrence commencera par un test rouge ; les parcours critiques auront des tests HTTP et navigateur.
- **Auditable and Versioned Domain Engine**: le moteur `tournament-pairing@1`, son seed, le hash de ses entrées, ses raisons de float/rematch, la révision source et le Snapshot de cube complet sont conservés. Les classements sont dérivés avec fractions exactes et les corrections ajoutent une version.
- **Human-Governed AI Delivery**: travail sur `008-tournament-management`, lié à l'Issue #80. PR, Standards + Spec review, CI et approbation humaine resteront requis avant fusion.
- **User Quality**: création, lancement, résultat, historique et états de récupération seront couverts à 360 px et au clavier.
- **Jalon produit**: la feature ouvre le jalon Tournois explicitement laissé hors du premier jalon Solo Draft Coach. Elle ne modifie ni l'Homologation, ni le Mur des Records, ni les moteurs de draft existants.

## Architecture et seams proposés

### 1. Module `TournamentCoordinator`

Interface publique proposée :

- `createTournament(command)` crée un agrégat en préparation ; la première sélection de cube et chaque remplacement ultérieur archivent le Snapshot exact référencé ;
- `execute(command)` applique les mutations typées de configuration, démarrage, résultat, correction, ronde suivante, carte clé et finalisation ;
- `getTournament(tournamentId)` retourne la projection complète révisionnée ;
- `listTournaments()` retourne les résumés historiques.

Le coordinateur dépend uniquement de `TournamentStore`, `TournamentCubeCatalog`, d'une horloge et de générateurs d'identifiants/seed injectés. Le solveur d'Appariement, les calculs de classement et le réducteur d'événements restent internes. L'interface publique renvoie un résultat typé ; un refus ne produit aucune mutation.

### 2. Appariements et classement

La première ronde suisse utilise un ordre pseudo-aléatoire reproductible produit depuis le `pairingSeed` persisté. Les rondes suivantes cherchent un matching parfait en minimisant lexicographiquement : rematches, multiplicité des rematches forcés, écart maximal de points, somme des écarts de points, écart de rang, puis ordre seedé. La recherche déterministe emploie des coûts entiers et une stratégie branch-and-bound adaptée à la limite de 32 participants.

Pour un effectif impair, l'Exemption suisse va d'abord à un participant ayant reçu le moins d'exemptions, puis au moins bien classé, puis à l'ordre seedé. Elle vaut 2-0 et trois points. Le toutes-rondes à trois publie les trois paires uniques sur trois rondes ; le troisième participant est en Pause toutes-rondes sans point.

Le classement suit points de match, OMW%, GWP% puis OGW%, avec plancher de 33,33 % et aucune valeur flottante arrondie avant affichage. Les ex æquo restent ex æquo ; l'ordre seedé ne sert qu'à stabiliser l'affichage et les choix techniques.

Chaque `RoundPublished` conserve la version du moteur, le seed, le hash des entrées, le classement source et les raisons de chaque choix. Une correction tardive recalcule le classement courant et les rondes futures mais ne réécrit jamais un Appariement publié.

### 3. Persistance et concurrence

Interface d'adapter proposée pour `TournamentStore` :

- `list(query)` charge les résumés historiques bornés ;
- `load(tournamentId)` charge checkpoint, événements et reçus nécessaires au replay ;
- `commit(attempt)` traite création et mutations avec scope, request id, empreinte,
  révision attendue éventuelle, archives de Snapshot, événements ordonnés, prochain checkpoint
  et réponse ; il retourne soit le commit, soit le replay idempotent déjà enregistré ;
- `checkReadiness()` vérifie explicitement la disponibilité du stockage d'autorité.

`commit` est la seule primitive d'écriture. Elle est atomique et ses deux adapters réels pour la
feature sont l'implémentation mémoire injectée en tests/développement et PostgreSQL/Supabase en
production. Les mêmes tests de contrat s'exécutent contre les deux.

Le stockage de production contient :

- une archive immutable du Snapshot de cube complet dès sa sélection en préparation, nécessaire car tous les cubes n'ont pas encore un artefact snapshot durable ;
- une ligne `tournaments` avec colonnes de liste et checkpoint JSONB révisionné ;
- un journal `tournament_events` append-only ;
- des reçus `tournament_command_receipts` pour l'idempotence.

Une fonction PostgreSQL unique vérifie le reçu, verrouille le tournoi `FOR UPDATE`, compare `expectedRevision`, insère strictement les événements, met à jour le checkpoint puis enregistre le reçu avant réponse. Les tables ne sont accessibles qu'au rôle serveur. La production exige `SUPABASE_SERVICE_ROLE_KEY`; une configuration absente ou une base indisponible renvoie `STORE_UNAVAILABLE` et ne bascule pas silencieusement vers du JSON local.

L'adapter mémoire satisfait la même interface pour le TDD et les tests HTTP. Les tests de contrat sont exécutés contre l'adapter mémoire et contre la fonction PostgreSQL dans un environnement d'intégration dédié.

### 4. HTTP et contrôle d'accès

`createTournamentHttpHandler({ coordinator })` produit, comme les handlers existants, une fonction
`(request, response) => Promise<boolean>` : `false` signifie que la route ne lui appartient pas.
`TournamentHttpHandler` est monté après le gate de guilde existant. Toute mutation exige
`Idempotency-Key` et `expectedRevision`, sauf la création initiale. La première version est
collaborative : tout membre admis par le gate peut consulter et administrer les tournois. Il n'y a
ni écriture Supabase directe depuis le navigateur, ni compte participant, ni identité propriétaire
inventée.

Les erreurs métier deviennent des statuts stables : entrée invalide `400`, conflit de révision/idempotence `409`, tournoi absent `404`, accès de site refusé `401`, stockage indisponible `503`. Le handler ne calcule ni classement ni Appariement.

### 5. Interface web

Le teaser `#view-tournaments` est remplacé par quatre états : historique, formulaire de préparation, ronde active/classement et détail terminé. Un nouveau contrôleur `src/web/tournaments.js` appelle le contrat HTTP et rend les erreurs et conflits. `app.js` ne conserve que le montage et la navigation.

Le cube provient du registre serveur ; aucune nouvelle liste codée en dur n'est ajoutée au client. Les formulaires utilisent des libellés explicites, une annonce accessible après mutation, une table lisible au clavier et une présentation en cartes à 360 px.

### 6. Cartes clés manuelles

La saisie manuelle valide chaque `oracleId` contre le Snapshot archivé et ne touche jamais au classement. La reconnaissance photo est explicitement exclue et suivie par l'Issue #81 ; son futur design repartira d'une spec distincte afin de ne créer ici ni seam hypothétique, ni dépendance de vision, ni colonne anticipée.

## Project Structure

### Documentation (this feature)

```text
specs/008-tournament-management/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── http-api.md
├── checklists/
│   ├── requirements.md
│   └── tournament-release.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── tournaments/
│   ├── index.ts                       # interface publique du module
│   ├── types.ts                       # commandes, événements, projections, erreurs
│   ├── coordinator.ts                 # orchestration de l'agrégat
│   ├── http-handler.ts                # adapter HTTP mince
│   ├── in-memory-store.ts             # adapter tests/développement explicite
│   ├── supabase-store.ts              # adapter production et gateway RPC réel
│   └── internal/
│       ├── pairing.ts                 # Appariements versionnés
│       ├── standings.ts               # points et départages exacts
│       └── state-reducer.ts           # reconstruction depuis événements
└── web/
    ├── tournaments.js                 # contrôleur de vue
    ├── index.html                     # écrans tournoi
    ├── app.js                         # montage/navigation
    └── styles.css                     # responsive et accessibilité

scripts/
├── serve-web.mjs                      # composition du handler
└── serve-web.d.mts                    # options d'injection typées

supabase/
├── migrations/
│   └── 202609210001_tournament_management.sql
└── README.md                           # application et variables requises

tests/
├── contract/
│   └── tournament-management.test.ts
├── unit/tournaments/
│   ├── coordinator.test.ts
│   ├── pairing.test.ts
│   ├── pairing.property.test.ts
│   └── standings.test.ts
├── integration/
│   ├── tournament-management-http.test.ts
│   ├── tournament-management-performance.test.ts
│   ├── tournament-management-postgres.test.ts
│   └── site-auth-gate.test.ts           # étendu avec les routes tournoi
└── browser/
    └── tournament-management.spec.ts
```

**Structure Decision**: conserver le monolithe actuel et ajouter un module profond `src/tournaments/`. Le serveur, le navigateur, l'adapter mémoire et l'adapter Supabase traversent la même interface ; aucun ne réimplémente les règles de tournoi.

## Sequence de livraison

1. **Seams et fondations** : confirmer l'interface publique, le contrat de store et le contrat HTTP, puis rendre vert le contrat révision/idempotence en mémoire.
2. **Préparation durable** : création, setup, archive de Snapshot, migration/RPC, gateway réel, HTTP et premier parcours navigateur rechargé depuis PostgreSQL. Aucun statut « livré en base » avant ce gate.
3. **Suisse déterministe** : première ronde seedée, matching sans rematch lorsque possible, Exemption suisse, départages et propriétés 2–32.
4. **Résultats auditables** : versions, corrections, refus sans mutation, idempotence, révisions et finalisation.
5. **Toutes-rondes à trois** : trois paires et trois pauses sans point via la même interface publique.
6. **Cartes clés et interface manuelle** : sélection dans le Snapshot, invariance des résultats, états accessibles, clavier et 360 px.
7. **Durcissement** : redémarrage, conflits concurrents, charge, health readiness, audit indépendant et full gate.

## Complexity Tracking

Aucune violation constitutionnelle n'est acceptée. Le journal et le checkpoint ne sont pas deux autorités concurrentes : le journal constitue la preuve append-only et le checkpoint est une projection transactionnelle reconstruisible. L'archive de Snapshot est requise parce que les sources actives peuvent évoluer. L'adapter mémoire et l'adapter PostgreSQL représentent deux environnements réels ; aucun fallback production silencieux, microservice, framework client ou bus d'événements n'est ajouté.
