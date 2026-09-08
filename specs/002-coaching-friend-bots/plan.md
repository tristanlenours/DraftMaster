# Implementation Plan: Coaching Pédagogique et Bots Personnalisés Amis

**Branch**: `002-coaching-friend-bots` | **Date**: 2026-09-04 | **Spec**: [spec.md](spec.md)

**Input**: Spécification formelle dans `specs/002-coaching-friend-bots/spec.md`.

---

## Summary

Cette fonctionnalité apporte à **DraftMaster** :
1. Un **Moteur de Coaching Pédagogique** en temps réel qui évalue la force relative de chaque carte dans un booster selon les cartes déjà accumulées par le joueur, et génère des explications stratégiques en français pour apprendre le draft sans stress.
2. Une **Table de Sept Bots Personnalisés** incarnant les amis du groupe Magic (Nico, Cédric, Hugues, Rémi, Papayou, Ivan, Titou) avec leurs personnalités, biais de jeu et tirages probabilistes déterministes.

---

## Technical Context

**Language/Version**: Node.js 24 LTS, TypeScript 6.0, ESM strict (`nodenext`).  
**Primary Dependencies**: `pure-rand` 8.4.2 (générateurs pseudo-aléatoires déterministes `xoroshiro128plus` et `uniformInt`).  
**Testing**: Vitest 4.x (V8 code coverage).  
**Performance Goals**: Évaluation complète d'un booster de 15 cartes en $< 1 \text{ ms}$ ; draft complet de 45 tours avec les 8 sièges en $< 500 \text{ ms}$.  
**Constraints**: 100 % hors-ligne, zéro dépendance réseau, reproductibilité déterministe bit-à-bit garantie par les graines de flux.

---

## Constitution Check

*GATE: Must pass before implementation starts.*

* **Principe I (Spécification préalable)** : ✅ La spec (`spec.md`), la recherche (`research.md`), le modèle de données (`data-model.md`) et ce plan (`plan.md`) sont rédigés et alignés sur le vocabulaire de `CONTEXT.md`.
* **Principe II (Test-first fondé sur le risque)** : ✅ Couverture de tous les invariants (P1P1, incolore, pénalités de couleur, bonus de biland, déterminisme des tirages, benchmark Untapped).
* **Principe III (Moteur auditable et versionné)** : ✅ Chaque profil et chaque politique dispose d'un identifiant et d'une version déclarée (`friend:nico@1`, `coached-bot@1`). Les graines dérivent de `deriveStreamSeed` avec le schéma cryptographique verrouillé.
* **Principe IV (Livraison gouvernée par l'humain)** : ✅ Développement sur branche dédiée `002-coaching-friend-bots`, sans fusion automatique sur `main`.
* **Principe V (Qualité utilisateur & Homologation)** : ✅ L'activation du coaching révoque irréversiblement l'Homologation pour préserver l'intégrité du futur Wall of Records.

---

## Project Structure

### Documentation de la Feature

```text
specs/002-coaching-friend-bots/
├── spec.md              # Spécification fonctionnelle et critères d'acceptation
├── research.md          # Analyse des 10 080 données Untapped et des profils d'amis
├── data-model.md        # Entités, typages et invariants métier
├── quickstart.md        # Guide de prise en main et démonstrations
├── plan.md              # Ce plan d'implémentation
├── contracts/           # Contrats d'interfaces
│   └── coaching-api.md  # Contrats publics du domaine coaching
├── checklists/
│   ├── requirements.md  # Liste de vérification des exigences
│   └── domain-qa.md     # Preuves de conformité domaine
└── tasks.md             # Tâches détaillées d'implémentation ordonnancées
```

### Code Source (Racine du Dépôt)

```text
src/
├── domain/
│   └── coaching/
│       ├── types.ts              # Types de cartes, contextes et breakdowns
│       ├── dynamic-score.ts      # Mathématiques du commitment et des scores dynamiques
│       ├── coaching-explainer.ts # Générateur d'explications en français
│       └── index.ts              # Barrel export
├── bots/
    ├── coached-bot-policy.ts     # Bot basé sur le score dynamique pur
    └── friends/
        ├── profiles.ts           # Fiches complètes des 7 amis (Nico, Cédric...)
        ├── friend-bot-policy.ts  # Politique intégrant biais de style et tirage Softmax
        ├── table-setup.ts        # Configuration des 8 sièges de la table
        └── index.ts              # Barrel export
├── cards/
│   ├── card-catalog.ts           # Cartothèque unifiée et indexation multi-cubes
│   ├── power-harmonizer.ts       # Harmonisation ELO, 17Lands GIH et Untapped
│   └── types.ts                  # Modèle documentaire unifié MasterCatalogCard
└── web/
    ├── index.html                # Interface matrice Limited Grades & modalité de draft
    ├── styles.css                # Grille CSS, sticky headers, thèmes et badges Tiers
    └── app.js                    # Orchestration client, filtres couleur/tier, bascule FR/EN

tests/
├── unit/
│   ├── coaching/
│   │   └── dynamic-score.test.ts # Tests des invariants mathématiques
│   ├── cards/
│   │   ├── card-schema-validation.test.ts  # Validation stricte schema JSON
│   │   └── card-catalog-directory.test.ts # Chargement et indexation 1100+ cartes
│   └── bots/
│       ├── coached-bot-policy.test.ts # Tests du bot coaché
│       └── friend-bot-policy.test.ts  # Tests des comportements de chaque ami
└── integration/
    └── coaching/
        └── untapped-benchmark.test.ts # Benchmark contre 10 080 données Untapped
```
