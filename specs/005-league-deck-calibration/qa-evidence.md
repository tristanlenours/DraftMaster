# QA Evidence — Étalonnage de Decks par Ligue & Témoin Expert Hors-Ligne

**Date**: 2026-09-12  
**Statut**: Gate automatisé vert ; validation hors-ligne, schéma Draft 2020-12, immutabilité et conformité stricte aux exigences de la constitution.

## Couverture des récits utilisateurs & Invariants

| Sujet / Récit | Preuve automatisée | Niveau actuel |
| --- | --- | --- |
| **US1 — Comparaison par ligue** | `tests/unit/coaching/league-calibration.test.ts`, `tests/integration/coaching/league-deck-calibration.test.ts` | Seuils ordonnés S/A/B/C/D, classification, statut provisional, rejet de disparités de ligue / cube membre, rétro-compatibilité sans ligue |
| **US2 — Préservation témoin expert** | `tests/unit/coaching/witness-corpus.test.ts`, `tests/integration/coaching/league-deck-calibration.test.ts`, `data/schemas/league-witness-corpus.schema.json` | 45 picks ordonnés P1P1..P3P15, 40 cartes résolues hors-ligne, absence de Power Nine, annotation expert A/upper, résultat match 0-3 contextuel |
| **US3 — Audit & Confidentialité** | `tests/unit/coaching/witness-corpus.test.ts`, `tests/integration/reference-draft.test.ts` | Interdiction stricte de champs identifiants (`playerId`, `opponentName`), étanchéité de politique d'usage (`evaluation_only`), isolation stricte du draft de référence seed 42 |
| **Performance (Plan & SC-006)** | `tests/unit/coaching/witness-corpus.test.ts`, `tests/integration/performance.test.ts` | Chargement et validation corpus < 500 ms (réel ~30 ms) ; simulations complètes SC-006 à ~24 ms (< 2 000 ms) |
| **Intégrité globale du dépôt** | 379 tests Vitest, 15 tests Playwright, 4 audits de rapports, TypeScript, ESLint, Prettier | Gate complet sans régression |

## Garde-fous et Invariants vérifiés

- **Schéma Draft 2020-12 strict**: Validation via `Ajv2020` de `data/schemas/league-witness-corpus.schema.json` avec rejet immédiat des structures non conformes.
- **Séparation de l'évaluation et du label curator**: Le deck témoin déclare `expectedTier: "A"` (label expert curator pour l'analyse comparée) et évalue en l'absence de profil de synergie à Tier C (score 66). L'évaluation ne fabrique aucune synergie artificielle sans profil d'archétype cube dédié (invariant de la feature 004 préservé).
- **Zéro fuite d'identité**: Aucun identifiant joueur ou adversaire (`playerId`, `opponentName`, etc.) n'est conservé dans les corpus témoins.
- **Référence seed 42 inchangée**: Le draft de référence historique `reference-drafts/titou-2026-02-24.1-seed-42.json` n'est pas contaminé ni altéré ; il reste strictement en dehors des manifestes golden-datasets.
- **Checklist intacte**: Le fichier de revue humaine `checklists/league-calibration.md` demeure non coché conformément à la règle de gouvernance.

## Commandes et résultats

```powershell
npm run check
  Prettier: OK (tous les fichiers conformes)
  ESLint: OK (0 erreur, 0 avertissement)
  TypeScript: OK (tsc --noEmit sans erreur)
  Synergy profiles check: OK
  Vitest: 61 fichiers, 379 tests passés (100 %)
  V8 Coverage:
    - Statements: 86.22 % (seuil min 80 %)
    - Branches:   72.39 % (seuil min 65 %)
    - Functions:  91.06 % (seuil min 85 %)
    - Lines:      87.42 % (seuil min 80 %)
  Rapports seed 42: 24 boosters, 21 bombes, 360 décisions tracées
  Playwright Chromium: 15 tests passés

npm run test:reference
  1 fichier, 3 tests passés

npm run test:replay
  4 fichiers, 27 tests passés

npm run test:audit
  1 fichier, 4 tests passés

npm run test:domain-errors
  3 fichiers, 43 tests passés

npm run test:mobile
  1 fichier, 25 tests passés

npm run test:e2e
  2 fichiers, 12 tests passés

npm run test:performance
  1 fichier, 2 tests passés ([SC-006 Benchmark Result] Durations: ~24 ms, max 24.32 ms < 2 000 ms)

git diff --check
  Aucune erreur d'espaces
```

## Limites restantes assumées

- Le statut de la ligue `powered_vintage` demeure intentionnellement `"provisional"` car le nombre de témoins actuels (1 draft / 1 deck) est inférieur aux exigences de passage en statut `"ready"` (>= 3 par tier, >= 10 drafts / 15 decks par cube membre).
- L'importateur `scripts/import-arena-witness.mjs` est réservé aux curators disposant d'un environnement MTGA local ; l'ensemble du cycle de développement et de CI fonctionne de manière 100 % autonome et hors-ligne à partir des fixtures versionnées dans `tests/fixtures/golden-datasets/`.
