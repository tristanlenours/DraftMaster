# Domain QA Evidence: 002 — Coaching Pédagogique et Bots Personnalisés Amis

**Date**: 2026-09-05 | **Branch**: `002-coaching-friend-bots` | **Reviewer**: *(human approval required)*

---

## 1. Terminologie CONTEXT.md

| Terme | Définition attendue | Utilisé correctement dans spec.md | Vérifié |
|-------|--------------------|------------------------------------|---------|
| Solo Draft Coach | Session solo, 1 humain + 7 bots | ✅ spec.md § Alignement | ✅ |
| Coaching | Assistance en direct par évaluation dynamique | ✅ spec.md § Alignement | ✅ |
| Draft accompagné | Session avec coaching activé, inéligible trophées | ✅ spec.md § Alignement, AS-4 US1 | ✅ |
| Draft homologué | Session sans coaching, éligible trophées | ✅ spec.md § Alignement | ✅ |
| Homologation | Statut d'éligibilité, révoqué irréversiblement | ✅ spec.md § Alignement, FR-011 | ✅ |
| Axes de deck | 5 dimensions (Puissance, Synergie, Courbe, Mana, Interaction) | ✅ spec.md § Alignement, US4 | ✅ |

---

## 2. Invariants Mathématiques et Preuves

| Invariant | Preuve (test ou données) | Résultat | Vérifié |
|-----------|-------------------------|----------|---------|
| INV-001 P1P1 = StaticScore | Benchmark 315 cartes réelles Untapped (`untapped-benchmark.test.ts`) | 315/315 correspondances exactes | ✅ |
| INV-002 Immunité incolore | Test `colorAffinityFactor === 1.0` pour cartes incolores (`dynamic-score.test.ts`) | Passed | ✅ |
| INV-003 Monotonie commitment | Sigmoïde monotone sur 45 picks (`dynamic-score.test.ts`) | Passed | ✅ |
| INV-004 Σ Softmax = 1.0 | Normalisation stricte sur les probabilités de tirage (`friend-bot-policy.ts`) | Passed | ✅ |
| INV-005 Déterminisme des sièges | 2 simulations complètes avec 7 bots amis et même seed (`determinism.test.ts`) | 100% picks et digest identiques | ✅ |
| INV-006 Bornage score deck | Scores radar et overall strictement dans [0, 100] (`deck-evaluation-witness.test.ts`) | Passed | ✅ |
| INV-007 Normalisation Kiviat | Somme des pondérations des 5 axes = 1.0 (20% + 25% + 20% + 20% + 15%) | Passed | ✅ |

---

## 3. Conformité Constitution

### Principe I — Spécification préalable
- [x] spec.md rédigée avec 4 user stories, 16 FRs et 5 SCs
- [x] plan.md rédigé avec constitution check
- [x] data-model.md rédigé avec 10 entités et 7 invariants
- [x] research.md rédigé avec traçabilité et benchmarking
- [x] contracts/coaching-api.md rédigé avec invariants de contrat
- [x] tasks.md ordonné avec dépendances et checkpoints
- [x] checklists/requirements.md rédigé et vérifié
- [x] checklists/domain-qa.md rédigé (ce document)

### Principe II — Test-first fondé sur le risque
- [x] Tests unitaires pour tous les invariants critiques (`tests/unit/coaching/`)
- [x] Tests de personnalité des bots amis (`tests/unit/bots/friend-bot-policy.test.ts`)
- [x] Test d'intégration témoin Untapped (`tests/integration/coaching/untapped-benchmark.test.ts`)
- [x] Test d'intégration évaluation de deck témoin Esper (`tests/integration/coaching/deck-evaluation-witness.test.ts`)
- [x] Test de déterminisme bit-à-bit (`tests/integration/coaching/determinism.test.ts`)
- [x] Benchmark de réactivité < 1 ms (`dynamic-score.test.ts`, SC-002)

### Principe III — Moteur auditable et versionné
- [x] Policies versionnées explicitement (`friend:nico`, `version: "1"`)
- [x] Tirage dérivé exclusivement du flux de siège (`policy:seat:X`)
- [x] Décomposition des scores (`CoachingScoreBreakdown`) traçable et pédagogique
- [x] Digest canonique RFC 8785 conservé à l'identique

### Principe IV — Livraison gouvernée par l'humain
- [x] Branche dédiée `002-coaching-friend-bots`
- [x] Tous les tests passent (196/196, 32 fichiers)
- [x] Revue de code et validation humaine requises avant fusion

### Principe V — Qualité utilisateur
- [x] Explications en français pédagogiques et contextualisées
- [x] Recommandation automatique de 2 à 3 builds de 40 cartes optimisés
- [x] Radar Kiviat à 5 axes avec adaptation par archétype
- [x] Temps de calcul par booster < 0.1 ms (SC-002 largement dépassé)
