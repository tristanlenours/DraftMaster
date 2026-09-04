# DraftMaster

DraftMaster redémarre sur une base greenfield pour construire un moteur de draft Magic déterministe, auditable et testable. Le premier périmètre est un draft headless à huit sièges sur une version figée du cube Tribal Titou.

La spécification et l’implémentation TypeScript sont développées sur la branche `001-simulate-titou-draft`.

## Données préservées

Le snapshot `data/cubes/titou_tribal/2026-02-24.1.json` contient 545 instances du mainboard CubeCobra historique. Sa provenance, ses empreintes et sa méthode de reproduction sont documentées dans `data/cubes/titou_tribal/README.md`.

## Utilisation CLI (MVP US1)

Le simulateur de draft s'exécute directement via npm avec Node.js 24 LTS :

```bash
# Simulation avec snapshot par défaut et seed générée aléatoirement
npm --silent run simulate --

# Simulation reproductible avec seed explicite
npm --silent run simulate -- --seed 42

# Simulation avec cube explicite et seed explicite
npm --silent run simulate -- --cube data/cubes/titou_tribal/2026-02-24.1.json --seed 42
```

### Format de sortie et flux
- **stdout** : un unique flux JSON UTF-8 pur contenant le `DraftReport` complet, suivi d'un saut de ligne terminal.
- **stderr** : réservé aux erreurs applicatives formatées en JSON (`{ "code": "...", "message": "..." }`).
- **Codes de retour** :
  - `0` : simulation terminée avec succès et rapport produit.
  - `2` : syntaxe de commande invalide (arguments non reconnus, format de seed non entier int32).
  - `3` : snapshot absent, illisible ou invalide selon le contrat de schéma / intégrité.
  - `4` : erreur d'exécution applicative (échec de politique, configuration invalide).
  - `5` : violation d'invariant détectée lors de la construction du rapport terminal.

## Exemple d'utilisation programmatique (API publique)

L'orchestration de draft et le moteur de domaine exposent des fonctions pures et immuables. Voici un exemple d'exécution où le siège 0 effectue un choix explicite au tour 1 :

```typescript
import { readFileSync } from "node:fs";
import {
  validateSnapshot,
  startDraft,
  submitPickRound,
  getDraftView,
  DRAFT_CONFIGURATION,
  RANDOM_SYSTEM_METADATA,
  createSeededRandomPolicy,
  type SeatId,
} from "./src/index.ts";

// 1. Charger et valider le snapshot
const raw = JSON.parse(readFileSync("data/cubes/titou_tribal/2026-02-24.1.json", "utf8"));
const validation = validateSnapshot(raw);
if (!validation.ok) throw new Error(validation.error.message);
const snapshot = validation.value;

// 2. Initialiser la session de draft
const startResult = startDraft({
  snapshot,
  sessionId: "0c0e1a78c4cf",
  seed: 42,
  startedAt: new Date().toISOString(),
  engineVersion: "draft-engine@1.0.0",
  randomSystem: RANDOM_SYSTEM_METADATA,
  seatPolicies: Array.from({ length: 8 }, (_, i) => ({
    seatId: i as SeatId,
    policyId: "seeded-random",
    policyVersion: "1",
  })),
  configuration: DRAFT_CONFIGURATION,
});
if (!startResult.ok) throw new Error(startResult.error.message);
let draft = startResult.value.draft;

// 3. Examiner la vue du siège 0 et faire un choix explicite
const view = getDraftView(draft);
const seat0Booster = view.seats[0].currentBooster!;
const chosenCardId = seat0Booster.remainingCardInstanceIds[0]; // Choix explicite

// 4. Préparer les 8 décisions du tour (siège 0 explicite, sièges 1 à 7 par politique)
const decisions = [
  {
    seatId: 0 as SeatId,
    cardInstanceId: chosenCardId,
    source: { kind: "explicit" as const },
  },
  ...Array.from({ length: 7 }, (_, idx) => {
    const seatId = (idx + 1) as SeatId;
    const policy = createSeededRandomPolicy({ seed: 42, streamName: `seat-${seatId}` });
    const seatBooster = view.seats[seatId].currentBooster!;
    const cardId = policy.pickCard({
      remainingCardInstanceIds: seatBooster.remainingCardInstanceIds,
      priorPicks: view.seats[seatId].priorPool,
    });
    return {
      seatId,
      cardInstanceId: cardId,
      source: { kind: "policy" as const, policyId: "seeded-random" as const, policyVersion: "1" as const },
    };
  }),
];

// 5. Soumettre le tour atomique
const roundResult = submitPickRound(draft, {
  sessionId: "0c0e1a78c4cf",
  expectedRevision: view.revision,
  packNumber: view.packNumber,
  pickNumber: view.pickNumber,
  occurredAt: new Date().toISOString(),
  decisions,
});
if (!roundResult.ok) throw new Error(roundResult.error.message);
draft = roundResult.value.draft;
// 6. Rejouer une simulation à partir de son journal d'événements (US2)
import { replayDraft } from "./src/index.ts";

const replayResult = replayDraft(draft.journal);
if (!replayResult.ok) throw new Error(replayResult.error.message);
const replayedDraft = replayResult.value.draft;
```

Pour simuler automatiquement l'intégralité des 45 tours à 8 sièges en une seule invocation :

```typescript
import { simulateDraft } from "./src/simulation/simulate-draft.ts";

const result = simulateDraft({
  snapshot,
  seed: 42,
  sessionId: "0c0e1a78c4cf",
});
```

## Limites actuelles (US1–US3)

Cette première version se concentre exclusivement sur les fondations déterministes, la relecture et l'auditabilité du moteur de draft :
- **Bots aléatoires uniquement** : la sélection automatisée repose sur `seeded-random` (pure-rand xoroshiro128plus). Aucun bot intelligent, aucune évaluation heuristique ni synergie tribale n'est inclus.
- **Pas de scoring ou deckbuilding** : aucun calcul de score de deck, courbe de mana, base de mana automatique ni construction de deck 40 cartes.
- **Pas de reprise interactive ni persistance** : les sessions sont éphémères en mémoire ; une session interrompue ne peut pas être reprise (mais un journal complet peut être rejoué à l'identique).
- **Pas d'interface graphique (GUI) ni multijoueur** : le moteur fonctionne en mode headless par CLI ou par API de domaine TypeScript.

## Commandes de vérification

- `npm run check` : vérification complète de la qualité (Prettier, ESLint, `tsc --noEmit`, Vitest, couverture V8).
- `npm run test` : exécution de l'ensemble des suites de tests Vitest.
- `npm run test:reference` : test de non-régression sur le tirage de référence figé seed 42 (US2).
- `npm run test:replay` : tests de déterminisme, validation de flux d'événements et équivalence de replay (US2).
- `npm run test:audit` : audit indépendant d'un rapport de draft sans helpers internes (US3).
- `npm run test:domain-errors` : vérification des contrats d'erreur du domaine et atomicité des tours (US1/US3).
- `npm run test:e2e` : tests de bout en bout de la CLI (modes offline, flux de sortie et codes 0 à 5).
- `npm run test:performance` : protocole de performance SC-006 isolé (3 warmups + 5 runs mesurés < 2 000 ms).
- `npm run cube:validate -- --file <chemin>` : validation de schéma (Draft 2020-12) et intégrité canonique SHA-256 d'un snapshot.
- `npm --silent run simulate -- --seed 42` : simulation CLI d'un draft complet.

## Gouvernance

- `CONTEXT.md` définit le vocabulaire métier canonique.
- `.specify/memory/constitution.md` définit les exigences de qualité et de validation humaine.
- `docs/` conserve les décisions, recherches et consignes de contribution.
- `AGENTS.md` décrit les règles de travail applicables au dépôt.
