# Dossier d'Analyse Experte — Mise à Jour Majeure du Cube de Nico (`1nxrs` — *Fedor's candyshop IRL*) & Benchmark de la Maybeboard IA

> [!IMPORTANT]
> **Synthèse Exécutive (Répertoire `gemini/`)**
> Après **23 mois sans mise à jour** (depuis le 11 décembre 2024), Nico (`Fedor007`) a réalisé dans la nuit du **17 au 18 novembre 2026** une refonte massive de son Vintage Cube de **730 cartes** :
> - **45 commits** successifs sur CubeCobra (**139 opérations** d'ajout/retrait/swap et **48 éditions** cosmétiques/catégories).
> - **130 cartes retirées et 130 cartes ajoutées en net (17,8 % du cube renouvelé)**, maintenant le total exact à **730 cartes** (`0` doublon).
> - **Compression drastique de la courbe de mana** : les 130 cartes sortantes affichaient un CMC moyen de **`3,46`** (score moyen DraftMaster **`20,26`**) contre **`2,95`** pour les 130 cartes entrantes (**`-0,51 CMC`** par carte ; score moyen **`26,20`**, soit **`+5,94 pts`**). La courbe globale hors terrains du cube passe sous la barre des 3 manas (**`3,064` $\rightarrow$ `2,973` CMC**).
> - **Validation spectaculaire de la Maybeboard IA (`cube-upgrade-advisor@5`) en double aveugle** : sans avoir lu nos recommandations, Nico a intégré **13 des 15 premières cartes de la Maybeboard IA (`Precision@15 = 86,7 %`)**, dont une **série parfaite de 10 sur 10 (`100 %`) entre les rangs `#6` et `#15`**, ainsi que **21 des 50 cartes** de la Maybeboard complète (**`42,0 %`**) et **24 recommandations uniques** au total (**`47,1 %` de Rappel** sur les candidats éligibles du catalogue !).

---

## 📂 Sommaire des Artefacts Générés dans `gemini/`

1. **[01-changelog-exhaustif-et-inventaire.md](01-changelog-exhaustif-et-inventaire.md)**
   - Tableau synthétique par section (`White`, `Blue`, `Black`, `Red`, `Green`, `Multicolored`, `Lands`, `Colorless`).
   - **Liste intégrale des 130 remplacements nets** commentés un par un (CMC, édition, score DraftMaster, Elo CubeCobra, présence *MTGO Vintage Cube*, badges IA).
   - Analyse des **5 mouvements transitoires / hésitations en direct** (`Orcish Lumberjack`, `Shifting Woodland`, `Deathrite Shaman`, `Sire of Seven Deaths`, `Booster Tutor`).
   - Table de résolution des **6 nouveaux skins *Secret Lair / Universes Beyond*** (`Cloud's Buster Sword` = *Umezawa's Jitte*, `Yuna's Sending Staff` = *Staff of the Storyteller*, `Man-Thing, Marsh Protector` = *Bristly Bill, Spine Sower*, `Sandy Cheeks, Martial Astronaut` = *Toski, Bearer of Secrets*, `Ororo Borealis` = *Manamorphose*, `Merciless Poisoning` = *Toxic Deluge*).
   - Journal chronologique brut des **48 commits CubeCobra** (du 11 déc. 2024 au 18 nov. 2026 à 11h31).

2. **[02-analyse-experte-arcanes-et-strategie.md](02-analyse-experte-arcanes-et-strategie.md)**
   - **La Thèse Macro de Nico** : compression de courbe (`-0,51 CMC`), chasse aux coûts réduits (*Impending*, *Warp*, *Miracle*, *Ninjutsu*, *Harmonize*), et convergence à **70,0 % (`91/130`)** avec le *MTGO Vintage Cube*.
   - **Les 5 Révolutions d'Arcanes & Combos Cachées** :
     1. Le package **`Flash` + `Worldspine Wurm`** (la combo T1/T2 reine du Vintage Cube).
     2. La combo infinie Magecraft en 2 cartes **`Chain of Smog` + `Witherbloom Apprentice` / `Sedgemoor Witch`**.
     3. L'hyper-densification de **`Time Vault`** via **`Manifold Key` + `Tezzeret, Cruel Captain` + `Mox Opal` + `Lotus Petal`** (et les babioles à 1 mana pour *Urza's Saga*).
     4. La mutation du Vert : suppression des sorts de ramp en rituel (`Farseek`, `Rampant Growth`, `Kodama's Reach`, `Explore`) au profit du moteur **Lands / Earthbend / Dorks Explosifs** (`Icetill Explorer`, `Badgermole Cub`, `Scythecat Cub`, `Bristly Bill`, `Formidable Speaker`, `Sylvan Safekeeper`, `Ouroboroid`).
     5. La mutation de **`Splinter Twin / Kiki-Jiki`** (`Deceiver Exarch` & `Pestermite` remplacés par `Glamermite` & `Divining Duelist`).
   - **Impact sur les 9 Archétypes de DraftMaster (`cube-meta.json`)**.
   - **Le Verdict de l'Expert** : **Top 10 des Coups de Génie** vs. **Top 10 des Choix Discutables / Pièges** (avec contre-propositions concrètes).

3. **[03-benchmark-maybeboard-ia.md](03-benchmark-maybeboard-ia.md)**
   - Courbe complète de **`Precision@K`** (`P@5 = 60 %`, `P@10 = 80 %`, **`P@15 = 86,7 %`**, `P@30 = 53,3 %`, `P@50 = 42,0 %`) et analyse du **`Recall`** (**`47,1 %`** sur les candidats éligibles du catalogue).
   - Comparaison historique prouvant le bond de performance de **`cube-upgrade-advisor@3` (`10,0 %`) $\rightarrow$ `@4` (`56,7 %`) $\rightarrow$ `@5` (`86,7 %` sur le Top 15)**.
   - Détail des **6 "Double Hits"** (où Nico a à la fois coupé la cible pointée par l'IA et ajouté la carte recommandée par l'IA) et des **24 cibles faibles coupées**.
   - **Audit ligne par ligne des 50 cartes de la Maybeboard IA** (`#1` à `#50`).
   - **Diagnostic Code-Level de [src/cards/cube-upgrade-advisor.ts](../../../../src/cards/cube-upgrade-advisor.ts)** expliquant mathématiquement pourquoi `Badgermole Cub` (43), `Aang, Swift Savior` (42), `Quantum Riddler` (40) et `Abandoned Air Temple` (39) ont été filtrés à tort, et feuille de route pour **`cube-upgrade-advisor@6`** (qui porte la précision à **`93,3 %` sur le Top 15** et **`64,0 %` sur le Top 50**).

4. **[04-donnees-structurees-update-et-benchmark.json](04-donnees-structurees-update-et-benchmark.json)**
   - Dataset JSON structuré complet contenant les métadonnées, les statistiques de courbe/score, les 130 paires de swaps enrichies et les résultats du benchmark IA.

---

## ⚡ Tableau Récapitulatif Express

| Indicateur Clé | Valeur Mesurée | Interprétation |
| :--- | :---: | :--- |
| **Cartes modifiées (Bilan Net)** | **130 / 730 (17,8 %)** | Refonte majeure équivalente à 2 ans d'éditions (2024–2026) |
| **Delta de Courbe sur les 130 Swaps** | **`3,46` $\rightarrow$ `2,95` (-0,51 CMC)** | Accélération massive du Tempo (Blanc `-0,76`, Incolore `-1,57`) |
| **Delta de Puissance DraftMaster** | **`20,26` $\rightarrow$ `26,20` (+5,94 pts)** | Purge des Tiers D/F au profit de staples Tiers A/B+ |
| **Alignement *MTGO Vintage Cube*** | **91 / 130 (70,0 %)** | Forte convergence avec la méta Vintage Cube compétitive |
| **Maybeboard IA — `Precision@10`** | **8 / 10 (80,0 %)** | Excellente prédictivité en tête de classement |
| **Maybeboard IA — `Precision@15`** | **13 / 15 (86,7 %)** | **10 / 10 (100 %)** entre les rangs `#6` et `#15` ! |
| **Maybeboard IA — `Precision@50`** | **21 / 50 (42,0 %)** | +3 hits dans `upgrades` = **24 recommandations IA adoptées** |
| **Rappel IA sur Candidats Éligibles** | **24 / 51 (47,1 %)** | Près d'un candidat éligible (`score >= 25`) sur deux anticipé |
| **Cibles Faibles IA Coupées par Nico** | **24 / 96 (25,0 %)** | 1,4x au-dessus du taux de coupe moyen du cube (17,8 %) |
