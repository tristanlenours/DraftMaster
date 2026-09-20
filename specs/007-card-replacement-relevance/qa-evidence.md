# Preuves QA — Pertinence des cartes remplaçantes

**Date**: 2026-09-20

**Branche**: `codex/audit-card-replacement-relevance`

**Base**: `origin/main` à `0c6c42872995e6154d3c9e284f200631f3d28163`

## Preuves obtenues

- Audit durable : `docs/research/card-replacement-advisor-audit-2026-09-20.md`.
- `npx vitest run tests/unit/cards/cube-upgrade-advisor.test.ts tests/integration/web-upgrade-advisor.test.ts` :
  72 tests passés.
- `npm run typecheck` : passé.
- `npm run data:sync` : cinq rapports régénérés avec snapshot et empreintes SHA-256.
- Revue Standards + Spec : effectuée avant push ; ses constats bloquants ont déclenché la fenêtre
  glissante, la récence bornée, les facteurs de score, la provenance et les matrices de tests.
- `npm run check` : passé ; 93 fichiers et 608 tests Vitest, couverture V8 à 85,92 % statements,
  74,09 % branches, 92,93 % fonctions et 87,19 % lignes, puis 27 parcours Chromium passés.

## Gate final

Le résultat de la CI de pull request est ajouté à la livraison après exécution. Aucune approbation
de la checklist reviewer n'est revendiquée ici.

## Limites ouvertes

- 358/540 cartes du benchmark Titou sont absentes du catalogue et ne peuvent être classées ;
  l'enrichissement est suivi dans l'issue #78.
- La classification Oracle est déterministe et testée sur les familles prises en charge, mais ne
  remplace pas une ontologie exhaustive de toutes les capacités Magic.
