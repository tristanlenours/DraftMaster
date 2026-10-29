# Audit Deck Lab — Rate my deck & Pimp my deck (2026-10-29)

Périmètre : `src/deck-lab/analyze-deck.ts`, `src/deck-lab/http-handler.ts`,
`src/domain/coaching/deck-evaluation.ts` (`deck-evaluation@5`),
`src/domain/coaching/deck-recommender.ts`, `src/domain/coaching/deck-archetypes.ts`,
`src/web/deck-lab.js`.

Méthode : lecture du code, puis sondes empiriques sur les contextes de cube réels
(`loadCoachContext`) de `titou_tribal`, `cedric_cube` et `nico_candyshop`, avec 75 pools
pseudo-aléatoires de 45 cartes (32 cartes d'une paire de couleurs + 13 cartes aléatoires,
graine fixe). Les 46 tests existants du périmètre passent ; aucun ne couvre les défauts
ci-dessous.

## Synthèse

| # | Gravité | Constat | Effet visible |
|---|---------|---------|---------------|
| 1 | P0 | Les packages stratégiques s'affichent comme « +X en synergie » mais ne comptent plus dans la note | L'explication affirme un calcul qui n'a pas lieu |
| 2 | P0 | Le classifieur d'interaction compte des pump, protections et équipements comme réponses | Axe interaction et catégorie d'archétype faussés |
| 3 | P0 | Rate complète toute liste courte avec des terrains de base virtuels | 20 sorts → 20 terrains virtuels, note 71/100 |
| 4 | P0 | Pimp ne maximise pas la note qu'affiche Rate | En moyenne +3,7 à +4,5 points (max +16) laissés en 2 échanges |
| 5 | P1 | Couverture dégradée : synergie = 0 au lieu de « non évaluée » | −8 à −15 points ; 2 cubes entiers concernés |
| 6 | P1 | Base de mana bicolore propre en basiques plafonnée vers 79 | Fausse « tension sur les sources » |
| 7 | P1 | Pimp reconstruit tout au lieu de proposer des retouches | Proposition peu actionnable, sans justification par échange |
| 8 | P1 | Recommandations de Rate génériques | Conseils identiques quel que soit le problème réel |
| 9 | P1 | Axe courbe en paliers, sans pénalité de haut de courbe | Plateaux ; Pimp ne départage pas les courbes |
| 10 | P2 | Hygiène et performance | Voir détails |

## P0 — Fiabilité

### 1. Explication mensongère des packages stratégiques

`analyzeStrategicPackages` calcule `contribution` et `fragilityPenalty` (réanimation, triche,
rampe…), mais `analyzeArchetypeSynergy` ne s'en sert plus depuis `05ecdc96` (la ligne
`sum + strategicPackage.contribution - strategicPackage.fragilityPenalty` a été retirée).
L'interface affiche pourtant `Réanimation : +X en synergie` et `−Y pour fragilité du plan`
(`src/web/deck-lab.js:157-165`). Seul l'effet sur le coût effectif de la courbe subsiste.

Correctif : décider explicitement. Option recommandée : réintégrer un bonus borné quand le
profil de cube ne reconnaît pas le plan (`bestArchetype` faible). Sinon, afficher « plan
détecté (non noté) ». Ajouter un test qui verrouille la cohérence affichage ↔ calcul.

### 2. Faux positifs d'interaction

`classifyInteraction` (`deck-evaluation.ts:63`) range en « créatures » tout texte contenant
`target creature` ou `sacrifice … creature`. Cela inclut les pump, les protections et les
coûts de sacrifice. Cartes comptées comme réponses sans verbe de removal : 9 à 12 par cube.
Exemples : Mother of Runes, Giver of Runes, Embercleave, Luminarch Aspirant,
Elspeth, Knight-Errant, Rabbit Battery, Reckless Stormseeker, Witch's Oven.

Deux classifieurs divergents coexistent : `isInteractionSpell` dans `deck-archetypes.ts`
(il décide la catégorie *control*) et `classifyInteraction` (axe noté).

Le Tier 1 fournit déjà la bonne réponse : `CardEvaluationInput.roles` porte
`premium_removal` (Swords, Counterspell ✓ ; Mother of Runes = `bomb, beater` ✓). Ce rôle
n'est pas utilisé. C'est contraire à l'invariant d'AGENTS.md (« ne pas inférer la théorie du
cube depuis les chaînes brutes »).

Correctif : `roles.includes("premium_removal")` décide si la carte compte. La regex ne sert
plus qu'à qualifier la couverture (créatures/pile/main…). Un seul classifieur, partagé par
les deux modules.

### 3. Rate gonfle les listes incomplètes

`virtualBasicsForRate` ajoute `40 - totalCount` terrains, quel que soit le nombre de sorts.
Sonde : 20 sorts collés → 20 basiques virtuels, note **71/100**, avec un simple
avertissement. Une liste de 23 sorts sans terrain est le cas légitime. Une liste de
20 sorts est un deck incomplet.

Correctif : ne compléter qu'en terrains jusqu'à ~17. Si les sorts restent en dessous de
`MIN_BUILD_NONLAND_CARDS`, refuser la note avec un message clair, ou la marquer
« incomplète » sans palier.

### 4. Pimp ne maximise pas la note de Rate

Le constructeur choisit les couleurs et les cartes au `staticScore` seul. La synergie du
cube, la courbe, l'interaction et la base de mana ne sont évaluées *qu'après*, sur au plus
3 options. Une recherche locale gloutonne sur la proposition retenue a donné ces gains :

| Cube | Note moyenne proposée | Gain moyen | Gain max | Échanges moyens |
|------|----------------------|------------|----------|-----------------|
| titou_tribal | 72,0 | +4,5 | +16 | 1,9 |
| cedric_cube | 65,8 | +3,8 | +9 | 1,9 |
| nico_candyshop | 71,4 | +3,7 | +15 | 1,6 |

Les échanges trouvés montrent les causes :

- **Bi-lands hors couleurs joués d'office** : `compatibleLands` garde tout terrain qui
  produit *une* couleur du chemin, et tous passent avant les basiques. Stomping Ground,
  Overgrown Tomb et Bayou ont été remplacés par une basique avec un gain à chaque fois.
- **Basiques mal réparties** : la dernière couleur reçoit le reliquat même sans aucun pip
  (`assembleDeckOption`, boucle `isLast`). La répartition ignore aussi les sources déjà
  fournies par les non-basiques.
- **Artefacts incolores à fort `staticScore`** (Grim/Basalt Monolith) retenus hors plan.
- **Aucune notion de splash** : un trio est soit absent, soit joué à part entière.

Correctif : après l'assemblage, une phase de recherche locale déterministe et bornée.
Elle échange maindeck ↔ réserve et ajuste les basiques pour maximiser `evaluateDeck`, avec
départage stable par identifiant. Filtrer les terrains qui n'apportent pas ≥ 2 couleurs du
chemin (sauf terrains utilitaires). Répartir les basiques selon les sources manquantes par
couleur. **Prérequis : corriger 1, 2, 5 et 6 avant**, sinon l'optimiseur amplifie les biais
de l'évaluateur (il chercherait les faux removals).

## P1 — Pertinence

### 5. Couverture dégradée comptée comme zéro

Sans profil de synergie, l'axe synergie vaut 0, soit 25 % de la note perdus. La note baisse
de 8 à 15 points en moyenne. `hugues_pauper` et `titou_arena_peasant_plus` renvoient
`CONTEXT_NOT_READY` : toutes leurs notes Rate sont donc sous-évaluées et leur palier faux.

Correctif : en couverture `basic` ou `catalog_only`, renormaliser les poids sur les 4 axes
restants et afficher « synergie non évaluée ». La parité reste garantie à contexte
identique.

### 6. Base de mana : pénalité de fixing trop dure en bicolore

Avec 23 sorts W/U de qualité et 17 basiques :

- 9 Plains + 8 Islands : mana = 79.
- 8 + 9 : même résultat. La cible compte des *cartes* par couleur, pas des pips, et l'arrondi
  `ceil` exige 9/9 sur 17 terrains.
- 10 + 7 : mana = 69, avec « Tension sur les sources de mana coloré ».

`requiredFixerUnits = (couleurs − 1) × 2` retire jusqu'à 25 % de l'axe à tout deck bicolore
sans bi-land.

Correctif : des cibles de sources par intensité de pips, à la manière de Karsten (1 pip vs
CC vs CCC, tour visé). Exiger du fixing seulement à partir de 3 couleurs ou d'un splash.

### 7. Pimp : retouches plutôt que reconstruction

Pimp renvoie `recommendDeckBuilds(...)[0]`, une reconstruction complète qui peut changer
de couleurs. L'attente « pimp » est plutôt : « voici les 3 meilleurs échanges depuis ton
deck ». Chaque échange viendrait avec son delta de note et sa raison (axe gagné, famille
complétée, source ajoutée).

Correctif : réutiliser la recherche locale du point 4, en partant du deck soumis. Exposer
les échanges triés par gain, puis la reconstruction et les options alternatives (déjà
calculées, jusqu'à 3) en second plan.

### 8. Recommandations Rate génériques

Les messages sont fixes, par exemple « Ajuster le ratio de créatures à 2 manas » même pour
un deck aggro trop lourd. L'audit contient pourtant de quoi être précis :

- sources manquantes par couleur (`sourcesByColor` vs `targetSourcesByColor`) → « passer
  1 Island en Plains » ;
- nombre de réponses vs `targetRange` de l'archétype ;
- familles requises manquantes avec les cartes du cube qui les remplissent (`requiredFamilies[].cardIds`
  du profil) → « cherchez en réserve : X, Y » ;
- cartes candidates à couper : `staticScore` faible et hors archétype.

### 9. Axe courbe en paliers

Le score midrange/control vaut 92, 82 ou 68 selon trois seuils. Il n'y a pas de pénalité
pour un haut de courbe chargé : 9 cartes à 6+ peuvent obtenir 92. Les coûts ≥ 8 sont
ignorés. La rampe ne regarde pas la courbe, et l'aggro ne regarde que la moyenne. Ces
plateaux empêchent l'optimiseur de départager deux builds.

Correctif : un score continu (distance à une distribution cible par archétype), en gardant
les ajustements de coût effectif existants.

## P2 — Robustesse et hygiène

- **10a.** `evaluateDeck` recalcule chaque analyse deux fois (dans `computeKiviatRadar`
  puis à nouveau). C'est à factoriser avant d'ajouter la recherche locale, qui multiplie
  les appels. Budget à mesurer, comme SC-006.
- **10b.** Identifiants de basiques codés en dur `["90790", …]` dans `assembleDeckOption`.
- **10c.** `toCardEvaluationInput` bascule silencieusement sur le texte français si l'oracle
  anglais est vide (1 carte dans cedric_cube : Isamaru). Toutes les regex anglaises échouent
  alors en silence.
- **10d.** Rate refuse les maindecks de 41 à 45 cartes. C'est discutable en cube, où 40 est
  un minimum.
- **10e.** Pas de coaching Tier 2 dans Deck Lab, alors que `final-deck-coach` existe pour le
  draft. C'est une option une fois les points 1 à 8 fiabilisés.

## Lot 1 — réalisé (`deck-evaluation@6`)

- **1** : les packages sont présentés comme « plan détecté, non compté dans la note » (Deck Lab
  et rapport HTML). Un plan fragile devient un point à surveiller nommant ses pièces.
- **2** : un classifieur partagé (`interaction-classifier.ts`) sert à la fois au radar et à la
  détection *control*. Il se fonde sur des verbes de removal visant l'adversaire. Les rôles du
  Tier 1 ont été écartés comme filtre : Pacifism est étiqueté `beater`, Doom Blade et
  Oblivion Ring `synergy_enabler`, Pyroclasm `beater`. Ils manqueraient des removals réels.
  C'est un constat de qualité des données Tier 1 à traiter séparément.
- **3** : Rate ne complète plus qu'en terrains, jusqu'à 18. Au-delà, la liste est refusée
  comme incomplète, avec le nombre de sorts manquants.
- **5** : sans profil de cube, l'axe synergie est « non évalué ». Les quatre autres axes se
  partagent la note. Sur le témoin Arena Powered du 11 septembre, le palier passe de C à A,
  le palier attendu par l'annotation experte.
- **6** : jouabilité par carte selon l'intensité des pips (tables de Karsten, 40 cartes). Le
  fixing n'est exigé qu'à partir de 3 couleurs.

## Lot 2 — réalisé (Pimp optimisé)

- **4** : l'assemblage commun (draft, simulation, Deck Lab) ne garde plus que les bi-lands qui
  produisent deux couleurs du chemin. Un trio dont les meilleurs sorts n'utilisent que deux
  couleurs n'est plus proposé, et le bonus de fixing ne compte que les terrains utiles. Les
  basiques sont réparties terrain par terrain là où elles améliorent le plus la jouabilité de
  Karsten, après les sources non basiques. Rate utilise la même répartition pour ses basiques
  virtuelles. Une recherche locale bornée (`optimizeDeck`, 4 échanges, déterministe) affine
  ensuite les propositions destinées à un joueur : Pimp et la recommandation Solo, qui restent
  identiques (test de parité). Les bots et la simulation n'en ont pas besoin et gardent le
  coût d'avant. Sur 25 pools par cube (même méthode que l'audit), la note moyenne proposée passe
  de 73,8 à 75,3 (titou_tribal), de 66,6 à 70,1 (cedric_cube) et de 72,1 à 74,6
  (nico_candyshop). Une recherche à 10 échanges ne trouve ensuite plus aucun gain d'au moins
  un point.
- **7** : pour un deck de 40 cartes, Pimp liste d'abord jusqu'à 3 échanges avec la réserve ou
  les basiques, chacun avec sa note avant/après et les axes gagnés, sans changer de couleurs
  ni de nombre de terrains. Le deck retouché est retenu s'il vaut au moins la reconstruction.
- **10a** : `evaluateDeck` calcule chaque analyse une seule fois. Les analyses de texte par
  carte et les ensembles d'identifiants des profils sont mis en cache : 1,8 ms → 0,23 ms par
  évaluation sur titou_tribal. Une proposition affinée coûte environ 0,3 à 0,7 s par pool sur
  une machine chargée. La recommandation Solo est mise en cache pendant le deckbuilding.
- **10b** : les basiques sont reconnues par identité d'objet, plus par identifiants codés en dur.
  Une carte draftée d'identifiant `90790` restait sinon aussi en réserve.
- Reste hors lot : le repli local de `final-deck-coach` (partagé avec les bots) n'utilise pas la
  recherche locale, et aucun splash n'est exploré.

## Ordre de mise en œuvre proposé

1. **Fiabiliser l'évaluateur** (1, 2, 3, 5, 6) : tests rouges d'abord, puis passage
   `deck-evaluation@6` et revalidation des témoins et de la calibration de ligue.
2. **Optimiser Pimp** (4, 7, 10a, 10b) : recherche locale bornée, retouches avec deltas,
   test de parité draft ↔ Deck Lab conservé.
3. **Pertinence des conseils** (8, 9) : recommandations dérivées de l'audit, courbe continue.
