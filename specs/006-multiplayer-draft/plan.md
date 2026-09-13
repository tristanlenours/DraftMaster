# Implementation Plan: Draft multijoueur amical et Coach de deck

**Branch**: `006-multiplayer-draft` | **Date**: 2026-09-13 | **Spec**: [spec.md](spec.md) | **Issue**: [#71](https://github.com/tristanlenours/DraftMaster/issues/71)

**Input**: Feature specification from `specs/006-multiplayer-draft/spec.md`

## Summary

Construire un module profond `MultiplayerDraftCoordinator` qui orchestre le Salon de draft global, les participants humains, les bots et le moteur `src/draft/index.ts` sans exposer les boosters adverses. Chaque commande mutable porte un `requestId` et une revision attendue ; elle est journalisee avant reponse. L'interface web interroge un etat redige par participant via polling HTTP revisionne. La production utilise PostgreSQL/Supabase comme source canonique, tandis qu'un adapter fichier atomique permet le developpement local et les tests hors ligne.

Le constructeur final devient un module partage entre Solo Draft Coach et Draft multijoueur. Il produit un deck legal de 40 cartes a composition flexible, sollicite le routeur Gemini/DeepSeek existant lorsque configure, valide strictement toute sortie externe, puis se replie sur le recommandateur local deterministe. L'export MTGA est genere uniquement depuis la Liste finale validee.

## Technical Context

**Language/Version**: TypeScript 6 strict ESM et JavaScript ESM sous Node.js 24 LTS

**Primary Dependencies**: moteur deterministe `src/draft/index.ts`, `pure-rand`, `@supabase/supabase-js`, AJV/JSON Schema, routeur `LlmRouter`, interface web HTML/CSS/JavaScript sans framework

**Storage**: PostgreSQL Supabase canonique en production via fonctions transactionnelles ; journal JSON atomique local pour developpement et tests, jamais presente comme garantie de production

**Testing**: Vitest 4, fast-check, tests de contrat et d'integration HTTP, Playwright 1.63 pour les parcours multi-navigateur et mobile

**Target Platform**: service web Node.js sur Railway et navigateurs desktop/mobile modernes

**Project Type**: application web monolithique avec domaine TypeScript, serveur HTTP Node natif et client statique

**Performance Goals**: nouvel etat visible par tous les participants en moins de 2 secondes au p95 ; premier booster visible en moins de 2 secondes au p95 apres le dernier pret ; reponse locale du Coach en moins de 1 seconde hors chargement initial. Le profil reproductible utilise huit clients logiques, dont deux navigateurs reels, un aller-retour reseau simule de 100 ms, 100 sessions fraiches et la machine CI de reference documentee dans les preuves QA.

**Constraints**: table fixe de huit sieges ; un seul salon global en phase de draft ; aucun minuteur de pick ; commandes idempotentes ; code de reprise hors chemin, query string, referrer et journaux ; 360 px et clavier ; aucune dependance LLM ou source de cartes externe pendant les 45 Tours

**Scale/Scope**: 2 a 8 humains, jusqu'a 6 bots, 45 Tours, 360 cartes distribuees, un groupe en draft et plusieurs ateliers de deck termines simultanement

## Constitution Check

_GATE initial et post-design : PASS._

- **Specification Before Implementation**: Issue #71 creee et marquee `ready-for-agent`; spec et clarifications terminees. Le plan, la checklist reviewer, les taches et l'analyse sont produits avant le premier test.
- **Risk-Based Test-First**: les seams confirmees seront le coordinateur de domaine, le contrat HTTP redige et le constructeur final partage. Chaque invariant concurrent commence par un test rouge ; Playwright couvre deux contextes navigateur et 360 px.
- **Auditable and Versioned Domain Engine**: `src/draft/index.ts` reste la seule autorite des rotations et invariants. Les commandes et evenements conservent revision, `requestId`, version moteur et provenance. Une sortie LLM n'est jamais acceptee sans validation locale.
- **Human-Governed AI Delivery**: travail sur `006-multiplayer-draft`; PR, Standards + Spec review et approbation humaine restent requis avant fusion.
- **User Quality**: le draft charge n'appelle ni fournisseur IA ni source de cartes externe. La connexion au serveur DraftMaster demeure necessaire a la synchronisation multi, mais une panne du Coach n'interrompt jamais les picks. Les parcours critiques restent clavier et mobile 360 px.
- **Homologation**: le multi est non homologue. Dans le solo, demander le constructeur assiste avant le Resultat verrouille retire l'Homologation avant l'appel externe.

## Architecture et seams de test proposes

### 1. Coordinateur multijoueur

`MultiplayerDraftCoordinator` presente une interface compacte : consulter le salon, rejoindre, reprendre, changer l'etat pret, soumettre un pick, abandonner, recommander/finaliser/exporter un deck. Il masque les transitions de lobby, la generation des decisions bots, le regroupement d'un Tour et la redaction des vues.

Le coordinateur depend de deux adapters reels :

- `MultiplayerDraftStore` pour charger et committer atomiquement une commande avec revision et idempotence ;
- `FinalDeckCoach` pour proposer un deck externe ou local deja normalise.

Le moteur `Draft` n'est pas simule dans les tests du coordinateur : il est exerce par son interface publique.

### 2. Persistance

Chaque mutation produit un ou plusieurs evenements append-only et un instantane courant dans la meme transaction. L'adapter PostgreSQL invoque une fonction transactionnelle qui verrouille le salon global ou la session, verifie la revision, deduplique `(scope_id, request_id)`, ajoute les evenements et publie la nouvelle revision avant de repondre. Le jeton brut de reprise n'est jamais stocke ; seul son SHA-256 est persiste.

L'adapter local utilise un fichier par salon/session et un remplacement atomique `temporaire -> rename`. Il sert a la CI et au developpement hors ligne ; Railway exige Supabase configure pour annoncer une disponibilite de production.

Une session non terminee et son Acces de reprise restent valides pendant au moins sept jours apres la derniere activite. Une session abandonnee devient terminale immediatement et refuse toute nouvelle mutation ; son journal auditable suit ensuite la retention operationnelle documentee. Le nettoyage ne peut jamais liberer un siege ou choisir une carte dans une session encore active.

### 3. Synchronisation web

Le client appelle `GET /api/multiplayer/state` toutes les secondes lorsqu'il attend une modification et immediatement apres une action. La revision permet une reponse `304` ou une vue inchangee legere. Cette cadence satisfait la cible de deux secondes sans ajouter WebSocket, broker ni serveur collant. Les mutations utilisent `Authorization: Bearer <resumeToken>`, `Idempotency-Key` et `expectedRevision`.

### 4. Construction finale partagee

`FinalDeckCoach` recoit exclusivement le pool et les metadonnees de cartes necessaires. Le prompt versionne demande : plan, couleurs principales/splash, inclusions/exclusions structurantes, paquets complets, courbe, interaction, sources de mana et justification hors 16-18 terrains. La sortie structuree reference les `cardInstanceId` et un compte de terrains basiques.

Un validateur local rejette les cartes absentes, doublons excessifs, listes autres que 40, terrains incoherents ou justification manquante. Le repli appelle le recommandateur deterministe ameliore. Chaque proposition conserve fournisseur, modele, `promptVersion`, `engineVersion`, evaluation cinq axes et raisons materielles.

La pertinence est comparee en aveugle sur un corpus versionne d'au moins vingt pools couvrant decks mono-, bi- et tricolores ainsi que plans agressif, controle et synergique. Deux relecteurs evaluent independamment ancien et nouveau constructeurs sur legalite, couleurs, paquets indispensables, courbe, interaction et mana. Un cas ne compte comme au moins aussi pertinent que si la majorite des avis ne prefere pas l'ancien ; toute erreur critique fait echouer le gate, quel que soit le taux global.

### 5. Export MTGA

Le generateur pur recoit une Liste finale et la resolution canonique des cartes. Il groupe les quantites, ecrit `Deck`, puis `Sideboard`, utilise les noms Arena resolus et renvoie separement les incompatibilites. Aucun export ne part directement d'une reponse LLM.

Le parseur de fixture protege le format en CI, mais la preuve de compatibilite SC-009 exige aussi une importation manuelle dans le client Magic Arena courant, avec le deck et la reserve obtenus consignes dans `qa-evidence.md`.

## Project Structure

### Documentation (this feature)

```text
specs/006-multiplayer-draft/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── http-api.md
│   ├── final-deck-coach.md
│   └── mtga-export.md
├── checklists/
│   ├── requirements.md
│   └── multiplayer-release.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── draft/                              # moteur huit sieges existant, inchange dans son interface
├── multiplayer-draft/
│   ├── index.ts                        # interface du module coordinateur
│   ├── types.ts                        # commandes, evenements et vues redigees
│   ├── coordinator.ts                  # orchestration salon/session/Tours
│   ├── state-reducer.ts                # reconstruction depuis le journal
│   ├── local-file-store.ts             # adapter local atomique
│   ├── supabase-store.ts               # adapter production
│   ├── final-deck-coach.ts             # orchestration externe + repli + validation
│   └── mtga-export.ts                  # generateur pur
├── domain/coaching/
│   └── deck-recommender.ts             # composition flexible partagee
└── web/
    ├── multiplayer-draft.js            # controleur client et polling
    ├── index.html                       # salon, draft, deckbuilder, export
    ├── app.js                           # activation de la vue
    └── styles.css                       # responsive et etats accessibles

scripts/
└── serve-web.mjs                        # montage du handler HTTP multijoueur

supabase/
└── schema.sql                           # tables, indexes, RLS et fonctions transactionnelles

tests/
├── contract/
│   └── multiplayer-draft.test.ts
├── unit/
│   ├── multiplayer-draft/
│   │   ├── coordinator.test.ts
│   │   ├── final-deck-coach.test.ts
│   │   └── mtga-export.test.ts
│   └── coaching/deck-recommender.test.ts
├── integration/
│   └── multiplayer-draft-flow.test.ts
└── browser/
    └── multiplayer-draft.spec.ts
```

**Structure Decision**: conserver le monolithe actuel et ajouter un module profond `src/multiplayer-draft/`. Le serveur et le navigateur restent des adapters minces ; ils ne reimplementent ni les regles du lobby ni celles du moteur de draft.

## Sequence de livraison acceleree

1. **Tracer bullet domaine** : salon vide -> deux humains -> tous prets -> table de huit -> premier Tour.
2. **Tour complet** : deux picks humains, six bots, commit atomique, passage du booster et reprise idempotente.
3. **Persistance et HTTP** : adapters local/Supabase, redaction par jeton, polling et abandon.
4. **Interface** : remplacement du teaser Multi, deux navigateurs, mobile/clavier.
5. **Coach et export** : composition flexible partagee, prompt structure, validation/repli, MTGA.
6. **Durcissement** : reprise/redemarrage, conflits de revision, charge/p95, observabilite et full gate.

## Complexity Tracking

Aucune violation constitutionnelle n'est acceptee. Le stockage a deux adapters est justifie par deux environnements reels : PostgreSQL transactionnel en production et execution locale/CI hors ligne. Aucun bus, WebSocket, framework client ou microservice n'est ajoute.
