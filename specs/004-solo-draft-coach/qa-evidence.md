# QA Evidence — Socle transversal et Solo Draft Coach

**Date**: 2026-09-08  
**Statut**: gate automatisé vert ; couverture navigateur minimale sur toutes les surfaces produit.

## Couverture produit minimale

| Module | Preuve automatisée | Niveau actuel |
| --- | --- | --- |
| Accueil | Ouverture de `/` dans Chromium, vue visible, aucune erreur navigateur | Smoke |
| Les Cubes | Ouverture de `/cubes`, vue visible, aucune erreur navigateur | Smoke |
| Card Explorer | Ouverture de `/cards`, filtre `Ancient Tomb`, score 31, modale et fallback image Scryfall après 404 local | Parcours critique |
| Les 8 Bots | Ouverture de `/bots`, vue visible, aucune erreur navigateur | Smoke |
| Draft Solo | Ouverture de `/draft`, lancement, 15 images françaises chargées après 404 local, voisin qui fournit le prochain booster, zoom mobile refermable, sélection et validation du premier pick | Parcours critique |
| Mur des Records | Ouverture de `/records`, vue visible, aucune erreur navigateur | Smoke |
| Administration | Ouverture de `/admin`, vue visible, aucune erreur navigateur | Smoke |
| Draft Multi | Ouverture de `/multi`, vue visible, aucune erreur navigateur | Smoke |
| Tournois | Ouverture de `/tournaments`, vue visible, aucune erreur navigateur | Smoke |
| Moteur, bots, coaching, cubes, CLI, rapports, stockage | 299 tests unitaires, contractuels, intégration et E2E Vitest | Comportemental |

## Garde-fous ajoutés

- `npm run check` exécute désormais les tests navigateur après le formatage, le lint, le typage, Vitest, la couverture et l'audit des rapports.
- La CI exécute les parcours navigateur dans Chromium sur Ubuntu et vérifie explicitement les rapports générés.
- Les seuils globaux bloquent une régression sous 80 % de statements, 65 % de branches, 85 % de fonctions ou 80 % de lignes.
- Le flux d'intégration Draft Solo injecte des chemins temporaires pour les rapports, les drafts admin et le leaderboard. Il prouve aussi que `data/admin-drafts.json` reste inchangé.
- Les artefacts Playwright locaux sont ignorés par Git.

## Commandes et résultats

```text
npm run check
  Prettier: OK
  ESLint: OK
  TypeScript: OK
  Vitest: 54 fichiers, 299 tests passés
  V8: 86.36 % statements, 72.07 % branches, 90.76 % functions, 87.54 % lines
  Rapports seed 42: 24 boosters, 21 bombes, 360 décisions tracées
  Playwright Chromium: 12 tests passés

npm run test:performance
  1 fichier, 2 tests passés

git diff --check
  Aucune erreur
```

## Limites restantes assumées

- Accueil, Cubes, Bots, Records, Admin, Multi et Tournois n'ont pour l'instant qu'un smoke navigateur ; leurs interactions détaillées ne sont pas encore couvertes de bout en bout.
- Les fichiers JavaScript client sont exercés par Playwright mais ne contribuent pas au pourcentage V8, qui mesure actuellement `src/**/*.ts`.
- Le fallback hors-ligne Supabase est testé, mais aucun environnement Supabase distant n'est sollicité par cette QA locale.
- L'installation initiale de Chromium reste nécessaire avec `npx playwright install chromium`; la CI l'installe automatiquement avec ses dépendances système.
