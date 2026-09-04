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
  - `4` : erreur d'exécution applicative ou violation d'invariant.

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

## Limites du MVP (US1)

Le MVP actuel se concentre exclusivement sur les fondations déterministes et la validation du moteur de draft :
- **Bots aléatoires uniquement** : la sélection automatisée repose sur `seeded-random` (pure-rand xoroshiro128plus). Aucun bot intelligent, aucune évaluation de force de carte, ni heuristique de synergie tribale n'est inclus.
- **Pas de scoring ou deckbuilding** : aucun calcul de score, courbe de mana, base de mana automatique ni construction de deck 40 cartes.
- **Pas de reprise de session ni persistance** : les sessions sont éphémères en mémoire ; une session interrompue ne peut pas être reprise.
- **Pas d'interface graphique (GUI) ni multijoueur** : le moteur fonctionne en mode headless par CLI ou par API de domaine.

## Commandes de vérification

- `npm run check` : vérification complète (Prettier, ESLint, `tsc --noEmit`, Vitest, couverture V8).
- `npm run cube:validate` : validation d'un fichier snapshot selon le schéma JSON Schema Draft 2020-12 et intégrité canonique SHA-256.
- `npm run cube:import` : import et reproduction d'un snapshot à partir de CubeCobra.
- `npm --silent run simulate -- --seed 42` : exécution du simulateur de draft en CLI.

## Gouvernance

- `CONTEXT.md` définit le vocabulaire métier canonique.
- `.specify/memory/constitution.md` définit les exigences de qualité et de validation humaine.
- `docs/` conserve les décisions, recherches et consignes de contribution.
- `AGENTS.md` décrit les règles de travail applicables au dépôt.
