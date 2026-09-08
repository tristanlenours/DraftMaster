# Data Model: Coaching Pédagogique et Bots Personnalisés Amis

**Date**: 2026-09-04

## Entités du Domaine Coaching

### 1. `CardEvaluationInput`
Représente la carte soumise à évaluation dans le contexte d'un booster ou d'un pool.

```typescript
export type MtGColor = "W" | "U" | "B" | "R" | "G";

export interface CardEvaluationInput {
  readonly id: string;
  readonly name: string;
  readonly staticScore: number;
  readonly colors: readonly MtGColor[];
  readonly cmc?: number;
  readonly types?: readonly string[];
  readonly isLand?: boolean;
  readonly producesColors?: readonly MtGColor[];
}
```

### 2. `CoachingScoreBreakdown`
Décomposition détaillée des facteurs ayant influencé la note de la carte.

```typescript
export interface CoachingScoreBreakdown {
  readonly colorAffinityFactor: number; // Multiplicateur d'affinité (0.05 à 1.0)
  readonly colorPenalty: number;        // Points perdus par divergence de couleur
  readonly manaFixingBonus: number;     // Bonus accordé aux terrains de fixation (+1 à +3.5)
  readonly curveBonus: number;          // Bonus de comblement de trou dans la courbe
  readonly rawDynamicScore: number;     // Valeur continue avant arrondi
}
```

### 3. `CardEvaluation`
Résultat complet de l'évaluation d'une carte avec son conseil pédagogique.

```typescript
export interface CardEvaluation {
  readonly id: string;
  readonly name: string;
  readonly staticScore: number;
  readonly dynamicScore: number;
  readonly delta: number;
  readonly breakdown: CoachingScoreBreakdown;
  readonly explanation: string;
}
```

### 4. `PackEvaluationContext`
Contexte d'évaluation d'un booster.

```typescript
export interface PackEvaluationContext {
  readonly packNumber: number; // 1, 2, ou 3
  readonly pickNumber: number; // 1 à 15
  readonly offeredCards: readonly CardEvaluationInput[];
  readonly priorPool: readonly CardEvaluationInput[];
}
```

---

## Entités des Bots Amis

### 5. `FriendStyleBiases`
Pondérations personnalisées de style de jeu pour un ami.

```typescript
export interface FriendStyleBiases {
  readonly cheapInteractionBonus?: number;
  readonly valueEngineBonus?: number;
  readonly lowCurveBonus?: number;
  readonly weirdEngineBonus?: number;
  readonly legendaryBombBonus?: number;
  readonly highCmcBonus?: number;
  readonly greenRampBonus?: number;
  readonly tribalSynergyBonus?: number;
  readonly colorDiscipline?: number;
}
```

### 6. `FriendProfile`
Profil complet d'un ami du groupe.

```typescript
export type FriendSkillLevel = "elite" | "medium" | "ambitious";

export interface FriendProfile {
  readonly id: string;
  readonly name: string;
  readonly title: string;
  readonly quote: string;
  readonly level: FriendSkillLevel;
  readonly temperature: number; // Température Softmax (0.8 à 2.0)
  readonly preferredColors?: readonly MtGColor[];
  readonly biases: Readonly<FriendStyleBiases>;
}
```

---

## Entités d'Évaluation de Deck & Graphe de Kiviat

### 7. `ArchetypeCategory` et `DeckArchetype`
Classification de l'archétype du deck.

```typescript
export type ArchetypeCategory = "aggro" | "midrange" | "control" | "ramp" | "combo";

export interface DeckArchetype {
  readonly category: ArchetypeCategory;
  readonly primaryColors: readonly MtGColor[];
  readonly splashColors: readonly MtGColor[];
  readonly label: string; // Ex: "Esper Control", "Boros Aggro", "Mono-Green Ramp"
  readonly description: string;
}
```

### 8. `KiviatRadarScores`
Notes sur 100 pour chacun des 5 axes mathématiques du graphe de Kiviat.

```typescript
export interface KiviatRadarScores {
  readonly power: number;       // Axe 1 (20%) : Puissance brute intrinsèque
  readonly synergy: number;     // Axe 2 (25%) : Synergies d'archétype & cohérence
  readonly curve: number;       // Axe 3 (20%) : Fluidité de courbe (ajustée à l'archétype)
  readonly mana: number;        // Axe 4 (20%) : Base de mana & sources (terrains + dorks + cailloux)
  readonly interaction: number; // Axe 5 (15%) : qualité, couverture et adéquation des réponses au plan
}
```

### 9. `StrategicDiagnosis` (Théorie Compétitive du Cube)
Diagnostic qualitatif et pédagogique articulé sur les 4 théories fondamentales :

```typescript
export interface QuadrantAnalysis {
  readonly behindActiveCount: number;    // Cartes permettant de stabiliser / revenir
  readonly developmentCount: number;     // Cartes d'action T1-T3
  readonly parityBreakerCount: number;   // Cartes rompant le verrouillage
  readonly winMoreTraps: readonly string[]; // Noms des cartes purement "Ahead" risquées
  readonly summary: string;
}

export interface FundamentalTurnAnalysis {
  readonly targetTurn: number;           // Ex: 2 ou 3 pour Vintage Cube, 4 pour Peasant
  readonly t1t2ActivePlaysCount: number; // Sorts / dorks / cantrips T1-T2
  readonly readinessPercentage: number;  // Probabilité d'avoir une action T1/T2 (0-100)
  readonly isSynchronized: boolean;      // Conforme à l'horloge du format
  readonly summary: string;
}

export type BeatdownPosture = "proactive_beatdown" | "reactive_control" | "modular_pivot" | "unfocused";

export interface BeatdownAnalysis {
  readonly posture: BeatdownPosture;
  readonly roleClarityScore: number;     // 0 à 100
  readonly hasPivotCapacity: boolean;    // Présence d'outils modulaires / modalité
  readonly summary: string;
}

export interface TempoEfficiencyAnalysis {
  readonly cheapSpellsCount: number;     // Spells CMC <= 2
  readonly doubleSpellCapacity: number;  // Score 0 à 100 de double-spelling T3-T4
  readonly positiveTempoAnswers: readonly string[]; // Réponses efficientes (ex: 1-2 mana answers)
  readonly summary: string;
}

export interface StrategicDiagnosis {
  readonly quadrant: QuadrantAnalysis;
  readonly fundamentalTurn: FundamentalTurnAnalysis;
  readonly beatdown: BeatdownAnalysis;
  readonly tempo: TempoEfficiencyAnalysis;
  readonly pedagogicalInsights: readonly string[];
}
```

### 10. `DeckEvaluation`
Résultat complet de l'évaluation d'un deck de 40 cartes.

```typescript
export interface DeckEvaluation {
  readonly deckSize: number; // 40 requis
  readonly spellsCount: number; // typiquement 22 à 24
  readonly landsCount: number;  // typiquement 16 à 18
  readonly archetype: DeckArchetype;
  readonly radar: KiviatRadarScores;
  readonly overallScore: number; // Note globale sur 100
  readonly audit: DeckEvaluationAudit; // Preuve versionnée de chaque axe et contribution
  readonly strengths: readonly string[];
  readonly weaknesses: readonly string[];
  readonly recommendations: readonly string[];
  readonly strategicDiagnosis?: StrategicDiagnosis; // Diagnostic compétitif 4 piliers
}
```

`DeckEvaluationAudit` est défini dans `src/domain/coaching/types.ts`. Il expose la version de
formule et le sens du score, les cinq contributions pondérées, la moyenne/médiane/top 5 de
puissance, le seuil et les cartes « bombes », le mana rapide, les packages stratégiques, les CMC
imprimés/effectifs, les sources et équivalents de mana, puis la qualité, la couverture et la cible
d'interaction propres à l'archétype. Le score reste un indice heuristique de qualité de
construction : ce n'est ni une probabilité de victoire ni un percentile.

### 11. `DeckBuildOption`
Proposition de build automatique à partir du pool de 45 cartes.

```typescript
export interface DeckBuildOption {
  readonly position: number; // 1, 2 ou 3
  readonly title: string;    // Ex: "Option 1 : Esper Control (3 couleurs)", "Option 2 : Azorius pur"
  readonly maindeck: readonly string[]; // 40 IDs de cartes (sorts + terrains de base inclus)
  readonly sideboard: readonly string[];
  readonly evaluation: DeckEvaluation;
}
```

---

## Invariants Métier (INV)

* **INV-001 (P1P1 Identité Statique)** : $\forall c \in \text{Booster}_{P1P1}, \text{DynamicScore}(c) = \text{StaticScore}(c)$.
* **INV-002 (Immunité Incolore)** : Les cartes incolores non-terrains ont un `colorAffinityFactor` de $1.0$ et une `colorPenalty` de $0$.
* **INV-003 (Monotonie de l'Engagement)** : $t_a < t_b \implies \text{Commitment}(t_a) \le \text{Commitment}(t_b)$.
* **INV-004 (Somme des Probabilités)** : Pour tout booster offert à un bot, $\sum_{i=1}^N P(c_i) = 1.0$.
* **INV-005 (Déterminisme des Sièges)** : La graine d'un tirage au siège $s$ à l'étape $(p, k)$ dérive exclusivement de `deriveStreamSeed(publicSeed, "policy:seat:s")` et de $(p, k)$.
* **INV-006 (Bornage du Score de Deck)** : Le `overallScore` et chaque axe de `KiviatRadarScores` sont strictement bornés dans $[0, 100]$.
* **INV-007 (Pondération Normalisée Kiviat)** : La somme des coefficients des 5 axes vaut exactement $1.0$ ($0.20 + 0.25 + 0.20 + 0.20 + 0.15 = 1.0$).
