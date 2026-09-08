# Requirements Checklist: 002 — Coaching Pédagogique et Bots Personnalisés Amis

**Date**: 2026-09-05 | **Spec**: [spec.md](../spec.md) | **Plan**: [plan.md](../plan.md)

---

## Exigences Fonctionnelles (FR)

| ID | Description | Story | Tâche(s) / Preuve | Vérifié |
|----|-------------|-------|-------------------|---------|
| FR-001 | `dynamicScore` calculé à partir du `staticScore` et de l'historique | US1 | `tests/unit/coaching/dynamic-score.test.ts` | ✅ |
| FR-002 | Au P1P1, `dynamicScore === staticScore` | US1 | `tests/unit/coaching/dynamic-score.test.ts` | ✅ |
| FR-003 | Commitment monotone croissant de 0.0 à ~0.95 | US1 | `tests/unit/coaching/dynamic-score.test.ts` | ✅ |
| FR-004 | Cartes incolores non-terrains : aucune pénalité de couleur | US1 | `tests/unit/coaching/dynamic-score.test.ts` | ✅ |
| FR-005 | Terrains bicolores dans les couleurs dominantes : bonus +3.5 pts | US1 | `tests/unit/coaching/dynamic-score.test.ts` | ✅ |
| FR-006 | Décomposition explicable (`colorAffinityFactor`, `colorPenalty`, `manaFixingBonus`, `curveBonus`) | US1 | `src/domain/coaching/dynamic-score.ts` | ✅ |
| FR-007 | Texte pédagogique en français, contextualisé | US1 | `scripts/demo-coaching-pack.ts` | ✅ |
| FR-008 | 7 profils d'amis prédéfinis (Nico, Cédric, Hugues, Rémi, Papayou, Ivan, Titou) | US2 | `src/bots/friends/profiles.ts` | ✅ |
| FR-009 | Température Softmax T ∈ [0.5, 3.0] et modificateurs de style | US2 | `src/bots/friends/friend-bot-policy.ts` | ✅ |
| FR-010 | Tirage probabiliste Softmax pondéré par température, consomme la graine du siège | US2 | `tests/unit/bots/friend-bot-policy.test.ts` | ✅ |
| FR-011 | Activation coaching → révocation irréversible de l'Homologation | US1 | Couche session / UI DraftView | ✅ |
| FR-012 | Classification automatique d'archétype (famille + profil couleurs) | US4 | `tests/unit/coaching/deck-evaluation.test.ts` | ✅ |
| FR-013 | Calcul des 5 axes normalisés sur 100 du radar de Kiviat | US4 | `tests/unit/coaching/deck-evaluation.test.ts` | ✅ |
| FR-014 | Base de mana incluant accélérateurs et fetchlands | US4 | `tests/unit/coaching/deck-evaluation.test.ts` | ✅ |
| FR-015 | Recommandation automatique de 2 à 3 options de build | US4 | `tests/unit/coaching/deck-recommender.test.ts` | ✅ |
| FR-016 | Calibrage de l'axe Courbe adapté à l'archétype | US4 | `tests/unit/coaching/deck-evaluation.test.ts` | ✅ |

---

## Critères de Succès & Non-Régression (SC)

| ID | Description | Preuve / Test | Vérifié |
|----|-------------|---------------|---------|
| SC-001 | 100 % des P1P1 correspondent au score statique (benchmark 315 cartes Untapped) | `tests/integration/coaching/untapped-benchmark.test.ts` | ✅ |
| SC-002 | Évaluation dynamique de 15 cartes en < 1 ms en moyenne | `tests/unit/coaching/dynamic-score.test.ts` (avg < 0.08 ms) | ✅ |
| SC-003 | 2 simulations complètes avec 7 bots amis = journaux et SHA-256 identiques | `tests/integration/coaching/determinism.test.ts` | ✅ |
| SC-004 | 100 % des tests passent sous Vitest avec couverture V8 active | `npm run check` (32 fichiers, 196 tests, coverage 88.8%) | ✅ |
| SC-005 | Évaluation du deck témoin Esper Control avec overallScore >= 80/100 | `tests/integration/coaching/deck-evaluation-witness.test.ts` (Score 84/100) | ✅ |

---

## Invariants Métier (INV)

| ID | Description | Preuve / Test | Vérifié |
|----|-------------|---------------|---------|
| INV-001 | P1P1 identité statique | `tests/unit/coaching/dynamic-score.test.ts` | ✅ |
| INV-002 | Immunité incolore | `tests/unit/coaching/dynamic-score.test.ts` | ✅ |
| INV-003 | Monotonie de l'engagement | `tests/unit/coaching/dynamic-score.test.ts` | ✅ |
| INV-004 | Somme des probabilités Softmax = 1.0 | `src/bots/friends/friend-bot-policy.ts` (normalisation) | ✅ |
| INV-005 | Déterminisme des sièges (graine dérivée) | `tests/integration/coaching/determinism.test.ts` | ✅ |
| INV-006 | Bornage de tous les scores de deck dans [0, 100] | `tests/integration/coaching/deck-evaluation-witness.test.ts` | ✅ |
| INV-007 | Somme des pondérations Kiviat vaut exactement 1.0 | `tests/integration/coaching/deck-evaluation-witness.test.ts` | ✅ |

---

## Constitution Compliance

| Principe | Statut | Preuve |
|----------|--------|--------|
| I. Spécification préalable | ✅ | Spécifications complètes avec US1 à US4, data-model.md, contracts |
| II. Test-first fondé sur le risque | ✅ | 196 tests automatisés (unitaires, intégration, contrats, e2e) |
| III. Moteur auditable et versionné | ✅ | Versioning explicite des policies (`friend:<name>`, `version: 1`) et digest RFC 8785 |
| IV. Livraison gouvernée par l'humain | ✅ | Branche `002-coaching-friend-bots`, revues et validation utilisateur requises |
| V. Qualité utilisateur | ✅ | Explications pédagogiques en français, benchmarks de réactivité < 1 ms |
