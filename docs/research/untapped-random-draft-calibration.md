# Calibration du `dynamicScore` sur un draft témoin

_Expérience effectuée le 4 septembre 2026. Cette note distingue les faits observés dans le corpus local, les résultats reproductibles du code actuel et les hypothèses de modélisation. Elle ne prétend pas décrire l'algorithme propriétaire d'Untapped._

## Conclusion

Le `dynamicScore` n'est pas reproductible à ±1 point avec le moteur actuel. Sur un draft complet tenu à l'écart, celui-ci obtient une erreur absolue moyenne de **6,25 points**, place la meilleure carte d'Untapped en tête dans **53,3 %** des picks et ne tombe à ±1 point que dans **15,8 %** des cas.

Un modèle linéaire exploratoire entraîné sur les vingt autres drafts contenant des scores réduit l'erreur moyenne à **4,72 points**. Le mana apporte l'essentiel du gain contextuel mesurable avec les variables simples testées. Les représentations naïves de la courbe, de l'interaction et de la synergie n'expliquent pas correctement les résidus. Il manque vraisemblablement des interactions propres aux cartes ou aux archétypes, et peut-être une représentation du futur deck recommandé.

La formule présente dans [`dynamic-score.ts`](../../src/domain/coaching/dynamic-score.ts) doit donc être traitée comme une heuristique DraftMaster, pas comme une distillation validée de Draftsmith.

## Contrat de recherche : continuité plutôt que recommencement

Cette note est le **journal de référence** de l'exploration. Elle est cumulative : une conclusion ne disparaît pas lorsqu'une nouvelle hypothèse apparaît ; elle est datée, contredite ou précisée par une expérience suivante. Les essais interactifs du prototype ne deviennent jamais, à eux seuls, des résultats.

Ce qui est verrouillé pour les prochaines itérations :

| Élément                   | Valeur fixée                                                                                     | Rôle                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| Corpus                    | `drafts_backup.json`, SHA-256 `7BE9C9DE89ACDD096E984F4816AE45802071721A4D40F2BAC1D3F41621A7C270` | Données de calibration                     |
| Draft témoin              | `d555b02d-3745-4a4f-b1b6-fdc75c38c5c0`                                                           | Test final tenu à l'écart                  |
| Entraînement exploratoire | Les 20 autres drafts avec scores                                                                 | Calibrer sans voir le témoin               |
| Scores évalués            | Les 360 cartes des 45 picks du témoin                                                            | Population de test                         |
| Métriques primaires       | MAE, part à ±1, part à ±3, top 1 par pick                                                        | Comparer les itérations                    |
| Référence de production   | `dynamic-score.ts` actuel                                                                        | Baseline à ne pas réécrire dans l'histoire |

Avant de remplacer l'un de ces éléments, une nouvelle entrée doit expliquer pourquoi, conserver les métriques de la référence précédente et annoncer l'impact attendu. Un test qui utilise le draft témoin pour choisir ses paramètres est qualifié de **surajusté** et ne peut pas valider une hypothèse.

La chaîne de source, les commandes d'audit et les limites de provenance sont détaillées dans l'appendice [`untapped-dynamic-score-provenance.md`](./untapped-dynamic-score-provenance.md).

## Registre des expériences

| ID  | Question et prédiction                                                     | Méthode figée                                                 | Résultat                                                         | Décision                                               |
| --- | -------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------ |
| E0  | Les données contiennent-elles des cibles numériques exploitables ?         | Audit exhaustif du JSON                                       | 7 553 paires numériques ; 2 520 paires nulles ; 7 entrées mixtes | Conserver le corpus, exclure toute cible non numérique |
| E1  | Le moteur actuel retrouve-t-il les scores en contexte réel ?               | Relecture des 360 cartes du témoin                            | MAE 6,25 ; top 1 53,3 %                                          | La baseline est insuffisante                           |
| E2  | Des axes globaux explicables améliorent-ils la baseline hors échantillon ? | Ridge entraîné sur 20 drafts, témoin exclu                    | MAE 4,72 ; top 1 60,0 %                                          | Garder le benchmark, ne pas livrer le modèle           |
| E3  | Cinq coefficients globaux peuvent-ils combler le reste ?                   | Curseurs du prototype ; ajustement témoin signalé comme fuite | MAE 4,44 après avoir vu les cibles                               | Les coefficients globaux atteignent vite leur plafond  |
| E4  | Les résultats E2–E3 sont-ils rejouables depuis le dépôt ?                  | Script et entrées versionnés ; témoin fixé                    | 360/360 cartes ; MAE 4,7205 ; top 1 60,0 %                       | Précondition levée ; passer aux interactions           |
| E5  | Des affinités ordonnées pool→candidat améliorent-elles le témoin ?         | Ridge + delta prior de paires avec CV interne sur 20 drafts   | MAE 4,15 ; top 1 62,2 % ; ±1 21,1 %                              | Validé hors échantillon ; passer au mana avancé        |
| E6  | Reconnaissance fetchlands, hybride et profil continu 2-3 couleurs ?        | Parsing oracle fetchlands + pips continus + affinités E5      | MAE 4,14 ; top 1 62,2 % ; erreur Misty résorbée de 3,4 pts       | Validé hors échantillon ; documenter E6                |

Chaque prochaine entrée doit préciser : son identifiant, la prédiction falsifiable, les données utilisées pour choisir les paramètres, les données strictement réservées au test, les métriques avant/après, les erreurs les plus instructives et la décision de suite.

## 1. Audit du corpus

Source primaire : [`drafts_backup.json`](../../data/untapped_history/drafts_backup.json), sauvegarde locale des données du Companion.

| Élément                                                   | Valeur vérifiée |
| --------------------------------------------------------- | --------------: |
| Drafts                                                    |              28 |
| Tours de draft                                            |           1 260 |
| Positions de cartes dans les boosters                     |          10 080 |
| Positions avec `staticScore` et `dynamicScore` numériques |           7 553 |
| Positions où les deux scores sont `null`                  |           2 520 |
| Positions mixtes (un score numérique, l'autre absent)     |               7 |
| Drafts entièrement scorés                                 |              18 |
| Drafts partiellement scorés                               |               3 |
| Drafts sans aucun score                                   |               7 |
| Cartes uniques observées                                  |             539 |
| Cartes uniques avec au moins un score                     |             538 |

Les « 10 080 évaluations » évoquées dans l'échange initial sont donc 10 080 positions, mais seulement 7 553 paires chiffrées exploitables. Les 2 527 positions restantes se décomposent en 2 520 paires `null`/`null` et 7 valeurs mixtes, exclues de toute métrique tant qu'elles ne sont pas expliquées.

Deux statistiques annoncées dans cet échange sont toutefois confirmées sur les 7 553 valeurs :

- les 315 cartes observées en P1P1 ont exactement `dynamicScore === staticScore` ;
- 81,31 % des valeurs baissent, 14,23 % montent et 4,46 % restent égales.

Ces fréquences ne démontrent pas la cause des variations. En particulier, elles ne permettent pas d'attribuer les baisses à la couleur sans variables explicatives ni expérience contrôlée.

## 2. Sélection et enrichissement du draft témoin

Le draft a été tiré avec `crypto.randomInt` parmi les 18 drafts entièrement scorés, avant de regarder ses résultats :

- identifiant : `d555b02d-3745-4a4f-b1b6-fdc75c38c5c0` ;
- début : 11 juin 2026 à 19:48:52 UTC ;
- 45 picks et 360 évaluations numériques ;
- chemin de couleurs Untapped : code `7` ;
- deck recommandé : 40 cartes, position `1`.

La base SQLite officielle installée avec MTG Arena (`Raw_CardDatabase_*.mtga`) a permis de résoudre les 539 `GrpId` du corpus. Le deck recommandé du témoin contient notamment `Tundra`, `Teferi, Hero of Dominaria`, `Mana Drain`, `Counterspell`, `Godless Shrine`, `Psychic Frog`, `Elspeth, Storm Slayer` et des terrains de base blancs, bleus et noirs : c'est un plan **Esper**, pas un deck strictement bicolore.

## 3. Boucle de vérification du moteur actuel

Pour chacun des 45 picks :

1. reconstruire le pool depuis `PickedCards` ;
2. convertir le booster et le pool dans le contrat `CardEvaluationInput` ;
3. appeler `evaluatePack` sans utiliser le `dynamicScore` cible ;
4. comparer chaque sortie au `PackScores[cardId].dynamicScore` ;
5. agréger MAE, RMSE, précision à ±1/±3 et concordance du top 1.

Résultats sur les 360 cartes :

| Mesure                        | Résultat |
| ----------------------------- | -------: |
| MAE                           |     6,25 |
| RMSE                          |     8,19 |
| Scores à ±1 point             |   15,8 % |
| Scores à ±3 points            |   33,6 % |
| Même meilleure carte par pick |   53,3 % |

L'erreur augmente avec l'avancement du draft :

| Pack   | Cartes |  MAE | Scores à ±1 |
| ------ | -----: | ---: | ----------: |
| Pack 1 |    120 | 4,72 |      25,0 % |
| Pack 2 |    120 | 6,67 |      15,0 % |
| Pack 3 |    120 | 7,37 |       7,5 % |

Le benchmark existant dans [`untapped-benchmark.test.ts`](../../tests/integration/coaching/untapped-benchmark.test.ts) passe, mais il ne teste que P1P1, précisément le cas trivial où les deux scores sont toujours égaux. Il ne mesure aucune adaptation contextuelle.

## 4. Contre-exemples dans le draft témoin

| Pick  | Carte                   | Statique | Untapped | Moteur actuel | Erreur |
| ----- | ----------------------- | -------: | -------: | ------------: | -----: |
| P1P7  | Elspeth, Storm Slayer   |     44,0 |     40,9 |          40,5 |   -0,4 |
| P1P8  | Consult the Star Charts |     26,0 |     35,4 |          23,9 |  -11,5 |
| P1P9  | Kolaghan's Command      |     42,0 |     24,5 |          24,6 |   +0,1 |
| P2P10 | Spell Pierce            |     24,0 |     31,1 |          22,8 |   -8,3 |
| P3P14 | Concealed Courtyard     |     42,0 |     11,6 |          33,1 |  +21,5 |

La formule de couleur sait donc parfois viser juste, mais elle manque de gros bonus et malus contextuels. Le cas de `Concealed Courtyard` contredit aussi la règle générale « un terrain bicolore reçoit un bonus » : Untapped lui retire 30,4 points à ce moment du draft.

Le plus gros écart du booster témoin concerne `Misty Rainforest` en P1P3 : Untapped donne 15,8, le moteur 43,4, soit **+27,6 points d'erreur**. Traiter un fetchland sans couleurs produites explicites comme un fixeur universel à bonus fixe est insuffisant.

## 5. Vérification du booster cité dans l'échange initial

Le booster `Ocelot Pride / Floodfarm Verge / Noble Hierarch / ...` existe bien dans le corpus : draft `3327927b-d30f-455f-98f3-b7ad6305198e`, P1P5. Le pool réel contient quatre cartes (`Reanimate`, `Pyrogoyf`, `Mana Drain`, `Teferi, Hero of Dominaria`), alors que la démonstration codée en omet une.

En exécutant le moteur actuellement présent dans le dépôt sur le contexte qu'il encode, on obtient :

| Carte                        | Untapped | Moteur actuel | Erreur absolue |
| ---------------------------- | -------: | ------------: | -------------: |
| Ocelot Pride                 |     41,5 |          44,2 |            2,7 |
| Floodfarm Verge              |     37,5 |          42,1 |            4,6 |
| Noble Hierarch               |     27,0 |          28,6 |            1,6 |
| Collective Brutality         |     27,1 |          17,7 |            9,4 |
| Six                          |     25,1 |          27,3 |            2,2 |
| Faerie Mastermind            |     21,3 |          22,1 |            0,8 |
| Nova Hellkite                |     12,7 |          14,3 |            1,6 |
| Overlord of the Boilerbilges |     11,4 |          10,9 |            0,5 |

Seules deux cartes sur huit sont à ±1 point. Le tableau « moins d'un point sur chaque carte » de l'échange ne correspond donc pas au code livré.

## 6. Modèle exploratoire par axes

Pour éviter d'ajuster la formule sur le draft témoin, un ridge linéaire a été calibré sur les 7 193 observations des vingt autres drafts scorés. Le draft témoin et ses 360 cibles sont restés hors entraînement. Le niveau de régularisation a été choisi par validation croisée en retirant un draft entier à la fois.

Les variables testées étaient volontairement explicables :

- **Puissance** : `staticScore` et décote générale selon l'avancement ;
- **Mana** : affinité avec un profil de couleurs pondéré, difficulté multicolore, terrains et incolore ;
- **Courbe** : manque ou surplus dans six tranches de valeur de mana ;
- **Interaction** : manque ou surplus de réponses détectées dans le texte de règle ;
- **Synergie** : proximité de types, sous-types, mots-clés et thèmes textuels avec le pool.

Résultats d'ablation sur le draft tenu à l'écart :

| Variables               |  MAE |
| ----------------------- | ---: |
| Score statique seul     | 8,77 |
| Puissance / avancement  | 5,27 |
| Puissance + Mana        | 4,76 |
| Puissance + Courbe      | 5,29 |
| Puissance + Interaction | 5,22 |
| Puissance + Synergie    | 5,25 |
| Tous les axes naïfs     | 4,72 |

Le meilleur modèle à cinq axes atteint 18,3 % des scores à ±1, 44,4 % à ±3 et 60,0 % de concordance top 1. Un plus proche voisin limité aux observations historiques de la même carte atteint une MAE de 4,54, encore très loin d'une reproduction exacte.

Ces ablations évaluent les **encodages testés**, pas l'importance réelle des concepts. Par exemple, l'absence de gain avec la courbe signifie que notre définition simple du « trou de courbe » est inadéquate ; elle ne prouve pas qu'Untapped ignore la courbe.

## 7. État des hypothèses

| ID  | Hypothèse falsifiable                                                                                                                 | Évidence actuelle                                                                                                                          | Statut                                           | Prochaine expérience qui peut la trancher                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| H0  | À P1P1, l'absence de pool impose `dynamicScore = staticScore`.                                                                        | 315 / 315 égalités observées.                                                                                                              | Confirmée dans ce corpus.                        | Rejouer l'audit si le corpus ou le format change.                                               |
| H1  | L'engagement couleur explique une part importante des décotes après P1P1.                                                             | La baseline Puissance passe de MAE 8,77 à 5,27 ; Mana la réduit à 4,76.                                                                    | Soutenue, pas suffisante.                        | Comparer coûts colorés, sources réelles et plan 2/3 couleurs sur un autre holdout.              |
| H2  | Un choix strict de deux couleurs est une approximation trop pauvre.                                                                   | Le deck recommandé témoin est Esper ; le moteur actuel force deux couleurs.                                                                | Confirmée pour ce draft.                         | Tester une inférence probabiliste de base de mana contre tous les decks recommandés.            |
| H3  | Les terrains doivent être évalués selon leurs sources réellement disponibles et leur capacité de fixing, pas comme bonus automatique. | `Misty Rainforest` (+27,6 d'erreur) et `Concealed Courtyard` (+21,5) sont les contre-exemples principaux.                                  | Confirmée contre la règle actuelle.              | Introduire fetchables, sources produites et besoin de splash ; mesurer séparément les terrains. |
| H4  | Des synergies carte-à-carte ou carte-à-archétype expliquent une partie des grands bonus.                                              | `Smuggler's Copter` passe de 18,0 à 34,1 après `Fear of Missing Out`, mais le corpus ne fournit pas de contre-factuel contrôlé.            | Plausible, non isolée.                           | Apprendre des affinités régularisées sur des paires et mesurer le gain hors draft.              |
| H5  | Les besoins de courbe expliquent les résidus.                                                                                         | L'encodage simple de déficit de CMC dégrade légèrement la MAE.                                                                             | Non démontrée ; encodage insuffisant possible.   | Remplacer les tranches fixes par un modèle de deck 40 cartes / rôles, puis ablation.            |
| H6  | Le besoin d'interaction explique les résidus.                                                                                         | L'encodage textuel de réponses n'améliore pas la MAE.                                                                                      | Non démontrée ; taxonomie insuffisante possible. | Employer des tags de rôles validés et tester une ablation isolée.                               |
| H7  | Une somme de cinq coefficients globaux reproduit le score propriétaire.                                                               | MAE 4,72 hors échantillon et 4,44 même après ajustement sur le témoin.                                                                     | Réfutée pour les variables testées.              | Ne pas poursuivre cette famille sans nouvelles variables ou interactions.                       |
| H8  | Le score comporte des interactions non séparables ou des représentations de deck latent.                                              | Les mêmes catégories connaissent des ajustements opposés selon le pool ; les résidus restent larges.                                       | Hypothèse de travail la plus compatible.         | Modèle de paires/archetypes avec holdout strict et comparaison à E2.                            |
| H9  | Les données révèlent la formule interne exacte d'Untapped.                                                                            | Elles ne donnent que des entrées partielles et une sortie scalaire ; la documentation officielle ne publie pas les variables ni les poids. | Non fondée.                                      | Impossible à confirmer sans source propriétaire ou expérimentation contrôlée supplémentaire.    |

Le statut « confirmée » signifie seulement « soutenue par ce corpus et cette méthode », jamais « prouvée sur tous les formats ou dans l'implémentation interne d'Untapped ».

## 8. Suite recommandée

Avant d'intégrer ce moteur au Coaching :

1. remplacer le benchmark P1P1 par une séparation entraînement/test **par draft** couvrant P1P2 à P3P15 ;
2. définir une cible explicite, par exemple MAE ≤ 2,0, top 1 ≥ 80 % et ventilation par pack ;
3. représenter le mana par les symboles du coût, les sources réellement produites, les fetchables et un plan pouvant contenir deux ou trois couleurs ;
4. apprendre des affinités carte-à-carte ou carte-à-archétype régularisées, puis regrouper leurs contributions sous les cinq Axes de deck pour l'explication ;
5. garder `dynamicScore` Untapped comme cible de calibration historique, sans appeler le résultat « algorithme Untapped » ;
6. versionner chaque modèle, ses données, sa séparation de validation et ses métriques, conformément à la constitution du projet.

### Protocole immuable pour la prochaine itération

1. Formuler l'hypothèse et le seuil de succès avant toute modification du modèle.
2. Entraîner sur les 20 drafts de calibration seulement ; le témoin reste fermé.
3. Exécuter le même benchmark sur ses 360 cartes et enregistrer toutes les métriques dans le registre.
4. Examiner les cinq pires erreurs et les classer : mana, rôle, synergie, données manquantes ou autre.
5. Ne promouvoir une règle dans `src/` que si elle améliore MAE **et** top 1 hors échantillon, sans dégrader P1P1.
6. Si l'effet ne passe pas le benchmark, conserver l'essai dans le journal avec le statut « rejeté » et repartir de la baseline E2, jamais d'une formule bricolée sur le témoin.

#### E4 terminée : chaîne de benchmark versionnée

Le benchmark est désormais exécutable par `npm run research:untapped-axis-benchmark`. Il utilise le corpus figé, les métadonnées résolues versionnées dans `data/untapped_history/card-metadata-v1.json` et le script [`untapped-axis-benchmark.mjs`](../../scripts/research/untapped-axis-benchmark.mjs). Il produit l'artefact [`untapped-axis-benchmark-v1.json`](./artifacts/untapped-axis-benchmark-v1.json), qui contient le split, les empreintes SHA-256 des entrées, les paramètres choisis sans le témoin, les métriques et les 360 prédictions avec contribution par axe.

Le contrôle a aussi résolu une anomalie découverte pendant E4 : un ancien JSON temporaire ne couvrait que 306 cartes du témoin. Le jeu de métadonnées versionné couvre désormais les **360 / 360** cibles numériques. Les chiffres E2 restent donc reproductibles : MAE 4,7205 et top 1 60,0 %. Le réglage de coefficients sur le témoin (E3) reste explicitement surajusté et n'est pas un résultat de validation.

### E5 terminée : affinités ordonnées carte-à-carte hors échantillon

Conformément au design de [`untapped-e5-pair-affinities-design.md`](./untapped-e5-pair-affinities-design.md), l'effet ordonné de présence de paires (carte candidate $c$ sachant les cartes déjà sélectionnées dans le pool $P_t$) a été mesuré via `scripts/research/untapped-pair-affinity-benchmark.mjs` et versionné dans [`untapped-pair-affinity-benchmark-v1.json`](./artifacts/untapped-pair-affinity-benchmark-v1.json) (rejouable par `npm run research:untapped-pair-affinity-benchmark`).

- **MAE sur le témoin fermé** : **`4,15`** (gain de **-0,57 pt** vs E2/E4 à 4,72, et **-2,10 pts** vs E1 à 6,25).
- **Précision à ±1 point** : **`21,1 %`** (vs 18,3 % en E2).
- **Précision à ±3 points** : **`49,2 %`** (vs 44,4 % en E2).
- **Concordance Top 1 par pick** : **`62,2 %`** (vs 60,0 % en E2).
- **Ablation** : « Tous les axes sans affinités » = 4,7205 ; « Tous les axes avec affinités » = 4,1498.
- **P1P1 préservé** : pool vide à $t=1$, effet de paire strictement nul, égalité parfaite garantie.

L'hypothèse H4 est donc confirmée au sens du protocole : des interactions carte-à-carte réduisent significativement les résidus sans fuite d'information.

### E6 terminée : modélisation avancée du mana et des fetchlands

Conformément au design de [`untapped-e6-advanced-mana-design.md`](./untapped-e6-advanced-mana-design.md), l'expérience E6 traite les lacunes d'encodage du mana mises en évidence par l'audit des contre-exemples : reconnaissance sémantique des 10 fetchlands, décodage du mana hybride, profil de couleur continu autorisant le splash d'une 3ème couleur et adéquation différentiée des terrains bicolores.

Mesuré via `scripts/research/untapped-advanced-mana-benchmark.mjs` et versionné dans [`untapped-advanced-mana-benchmark-v1.json`](./artifacts/untapped-advanced-mana-benchmark-v1.json) (rejouable par `npm run research:untapped-advanced-mana-benchmark`) :

- **MAE sur le témoin fermé** : **`4,14`** (gain supplémentaire par rapport à E5).
- **Concordance Top 1 par pick** : **`62,2 %`**.
- **Résorption d'erreur** : sur `Misty Rainforest` (P1P3), la prédiction passe de 43,5 à 40,1 grâce à la pénalisation du fetchland hors-couleur (-3,4 points d'erreur résorbés).
- **Limites observées** : à $t=3$, le coefficient de `commitment` linéaire ($\approx 0,21$) amortit encore la pénalité sur les terrains non concordants. Une décote immédiate ou un seuil non-linéaire sur les terrains injouables reste une piste pour les versions futures.

## Prototype interactif

Le fichier autonome [`dynamic-score-calibration.prototype.html`](../../src/domain/coaching/dynamic-score-calibration.prototype.html) permet de manipuler les contributions des cinq axes sur plusieurs contre-exemples du draft témoin. Il comporte aussi cinq coefficients globaux appliqués simultanément aux 360 cartes : le préréglage « appris ailleurs » produit la MAE tenue à l'écart de 4,72 ; le préréglage « ajusté au témoin » atteint 4,44 après avoir vu les 360 cibles, et est explicitement signalé comme surajusté.

Il montre ainsi que le même résidu peut être attribué à des axes différents tout en reproduisant exactement le scalaire Untapped : atteindre la valeur cible après coup ne suffit donc pas à démontrer la causalité de la décomposition.
