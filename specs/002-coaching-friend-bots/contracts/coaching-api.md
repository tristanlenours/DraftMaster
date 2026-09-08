# Contract: Coaching API & Friend Bots

## 1. Moteur de Score Dynamique (`src/domain/coaching/dynamic-score.ts`)

```typescript
export function computeCommitment(packNumber: number, pickNumber: number): number;

export function evaluateCard(
  card: CardEvaluationInput,
  context: PackEvaluationContext,
): CardEvaluation;

export function evaluatePack(
  context: PackEvaluationContext,
): readonly CardEvaluation[];
```

### Invariants du Contrat
* `evaluatePack` renvoie une liste ordonnée par `dynamicScore` décroissant.
* L'opération est une fonction pure, sans effet de bord, sans mutation des objets passés en entrée.
* Au tour $1$ ($P=1, K=1$), `dynamicScore === staticScore` pour $100\%$ des cartes.

---

## 2. Politique de Bot Ami (`src/bots/friends/friend-bot-policy.ts`)

```typescript
export function createFriendBotPolicy(options: FriendBotPolicyOptions): PickPolicy;

export function createFriendTablePolicies(
  options?: FriendTableSetupOptions,
): readonly (PickPolicy | null)[];
```

### Invariants du Contrat
* Le siège 0 renvoie `null` lorsqu'il est contrôlé par le joueur humain.
* Les sièges 1 à 7 renvoient une instance de `PickPolicy` immuable avec un identifiant préfixé `friend:<id>` et une version `1`.
* La sélection d'une carte est strictement déterministe pour un triplet `(derivedSeed, packNumber, pickNumber)` donné.

---

## 3. Évaluation de Deck & Diagnostic Stratégique (`src/domain/coaching/deck-evaluation.ts`)

```typescript
export function evaluateDeck(
  deck: readonly CardEvaluationInput[],
  options?: {
    readonly bombThreshold?: number; // Seuil top 5 % calculé depuis le Snapshot de cube
  },
): DeckEvaluation;

export function computeStrategicDiagnosis(
  deck: readonly CardEvaluationInput[],
  archetype: DeckArchetype,
  targetFundamentalTurn?: number,
): StrategicDiagnosis;
```

### Invariants du Contrat
* `evaluateDeck` accepte un tableau de 40 cartes valides et s'exécute de manière pure, synchrone et sans effet de bord.
* La note `overallScore` et chaque composante du radar de Kiviat sont strictement comprises entre 0 et 100.
* Le résultat contient un audit `deck-evaluation@2` : distribution de puissance, bombes, mana rapide, packages, courbe imprimée/effective, sources de mana, profil d'interaction et contributions pondérées.
* Le score est explicitement présenté comme une heuristique, jamais comme une probabilité de victoire ou un percentile statistique.
* La complexité de l'évaluation complète d'un deck de 40 cartes est bornée à $O(N)$ où $N=40$, avec un temps d'exécution $< 2$ ms.
