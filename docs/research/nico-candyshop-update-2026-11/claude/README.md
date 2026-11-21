# Mise à jour du cube de Nico (nov. 2026) : analyse Claude

Analyse de la grosse mise à jour du cube **Fedor's candyshop IRL** (CubeCobra [`1nxrs`](https://cubecobra.com/cube/about/1nxrs?view=changelog)) faite le 17-18/11/2026, première modification depuis le 11/12/2024. On la compare aussi à la maybeboard IA de DraftMaster.

Produit par Claude (Opus 5.5) le 2026-11-18, pour comparaison avec une analyse Gemini.

## Livrables

| Fichier | Contenu |
|---|---|
| [01-journal-complet-des-changements.md](01-journal-complet-des-changements.md) | Les 130 échanges, ajouts, retraits et allers-retours, par couleur, avec coût, type, année et marqueurs IA |
| [02-analyse-experte.md](02-analyse-experte.md) | Logique de la mise à jour, analyse par couleur et par archétype, bonnes idées, choix discutables, suggestions |
| [03-benchmark-maybeboard-ia.md](03-benchmark-maybeboard-ia.md) | Comparaison de la maybeboard IA avec les choix de Nico : précision, rappel, baselines, historique des versions, faux positifs, pistes |

## Données (`data/`)

| Fichier | Contenu |
|---|---|
| `changes.csv` | Une ligne par opération (séparateur `;`, UTF-8 avec BOM pour Excel) avec les marqueurs IA |
| `cubecobra-changelog-raw.json` | Changelog CubeCobra complet depuis 2021 (endpoint `POST /cube/getmorechangelogs`) |
| `cubecobra-cube-2026-11-18.json` | Liste du cube après mise à jour (`/cube/api/cubeJSON/1nxrs`) |
| `diff-oracle-level.json` | Différence nette par oracle_id, entre la base 2024-12-11 et l'état 2026-11-18, avec le journal ordonné des opérations |
| `ai-benchmark-v5.json` | Chaque recommandation IA v5 (maybeboard et upgrades), avec ce qu'en a fait Nico |
| `ai-history/bench-<commit>.json` | Même évaluation pour chaque version historique de `cube-suggestions.json` |
| `benchmark-baselines.json` | Précision et rappel des baselines naïves (cubes pairs) |
| `composition-stats.json` | Statistiques de composition avant/après (couleurs, courbe, types, années, heuristiques) |

## Méthode

1. Changelog et liste actuelle récupérés sur CubeCobra. Base = `data/cubes/nico_candyshop/cubecobra-raw.json` (11/12/2024), dont j'ai vérifié qu'elle est identique au `cube.json` utilisé par l'IA.
2. Tous les `cardID` (933 impressions) résolus via l'API Scryfall `/cards/collection`, pour obtenir le vrai nom oracle. CubeCobra affiche les **flavor names** (ex. Umezawa's Jitte affiché « Cloud's Buster Sword »), qui faussent une comparaison par nom.
3. Différence par `oracle_id` ; changements d'impression et métadonnées exclus ; allers-retours de la session documentés.
4. Benchmark IA : comparaison des noms normalisés à la face avant, contre `data/cubes/nico_candyshop/cube-suggestions.json` (v5) et toutes ses versions git.
5. Baselines : listes MTGO Vintage Cube et Vintage Cube Archive de `data/benchmarks/cubecobra-benchmarks.json` (le même fichier que l'IA avait en entrée, sha256 `ffdccfac…`).

Scripts dans `scripts/`. Ils ont été lancés depuis un répertoire temporaire, donc les chemins sont à adapter pour les rejouer. `render-changelog.mjs` régénère le journal et le CSV : `node scripts/render-changelog.mjs .`

## Pour une comparaison équitable avec Gemini

Donner à Gemini les mêmes entrées : `01-journal-complet-des-changements.md` (ou `data/changes.csv`), `data/composition-stats.json`, et `data/cubes/nico_candyshop/cube.json` (archétypes Tier 1). Pour la partie benchmark, ajouter `data/cubes/nico_candyshop/cube-suggestions.json`. Ainsi, les deux analyses partent des mêmes faits, et l'écart porte sur le raisonnement.
