# Draftsmith / Untapped.gg comme référence produit

_Recherche effectuée le 1er septembre 2026. Sources primaires uniquement : pages et aide officielles Untapped.gg/HearthSim ; documentation officielle 17Lands pour l'alternative de données. Les formulations marketing (« meilleur », « optimal ») sont rapportées comme telles, sans les transformer en résultats démontrés._

## Synthèse

Draftsmith est un assistant de draft et de construction de deck intégré au Companion MTG Arena. Untapped publie trois propriétés centrales : ses notes sont calculées à partir de millions de parties Limited, utilisent une échelle **de 1 à 55**, et **s'adaptent aux cartes déjà choisies**. Après un draft ou l'ouverture d'un pool scellé, le produit recommande un deck à partir des cartes disponibles. ([Draftsmith officiel](https://mtga.untapped.gg/draftsmith), [FAQ officielle](https://help.hearthsim.net/en/articles/5415743-what-is-draftsmith))

La documentation publique ne permet toutefois pas de reproduire Draftsmith. Dans les sources officielles examinées, Untapped ne donne ni formule, ni variables exactes, ni poids, ni modèle statistique, ni objectif d'optimisation du deck. DraftMaster peut reprendre les **principes UX** et construire un modèle ouvert à partir de données autorisées, mais ne doit pas présenter ses propres heuristiques comme « l'algorithme Untapped ».

## 1. Faits publiés par Untapped

### Échelle et catégories UX

Untapped publie les cinq tranches suivantes :

| Score Draftsmith | Catégorie affichée |
|---:|---|
| 1–5 | Weak |
| 6–11 | Bronze |
| 12–22 | Silver |
| 23–40 | Gold |
| 41–55 | Fire |

Source : [page officielle Draftsmith](https://mtga.untapped.gg/draftsmith) ; confirmation sur la [page Premium](https://mtga.untapped.gg/premium).

Il s'agit des catégories de l'overlay Draftsmith, pas de grades `S/A/B/C/D`, ni d'une échelle plafonnée à 53.

### Contexte des picks

Untapped affirme explicitement que les notes « adapt based on the cards you have already chosen ». La conclusion sûre est donc qu'une carte peut recevoir une note différente selon le pool du joueur. La source ne précise pas si l'ajustement vient des couleurs, de la courbe, des archétypes, des synergies par paire, du fixing, des signaux de table ou d'autres variables. ([Draftsmith officiel](https://mtga.untapped.gg/draftsmith))

### Recommandation de deck

Après le draft ou l'ouverture des boosters de scellé, Draftsmith recommande ce qu'Untapped appelle un « optimal deck » construit à partir des cartes choisies/ouvertes. C'est une **promesse produit**, pas une définition mathématique de l'optimalité. ([Draftsmith officiel](https://mtga.untapped.gg/draftsmith), [Companion officiel](https://mtga.untapped.gg/companion))

Les modes officiellement annoncés comprennent Quick Draft, Premier Draft, Cube Draft, certains formats spéciaux lorsqu'ils sont disponibles, ainsi que les deux modes Sealed. Les fonctions exactes peuvent dépendre du format et sont indiquées dans l'overlay. ([FAQ des modes supportés](https://help.hearthsim.net/en/articles/5431554-what-games-modes-does-draftsmith-support))

### Dépendance aux données

Untapped indique devoir réunir assez de données avant de fournir notes et recommandations sur un nouveau set ; son aide annonce un délai typique de **1 à 2 jours**. Cela documente un problème de démarrage à froid, sans révéler de seuil d'échantillon. ([FAQ nouveaux sets](https://help.hearthsim.net/en/articles/5579638-is-draftsmith-available-in-the-first-hours-of-a-new-set))

## 2. Comportements observables dans les supports officiels

Ces éléments sont visibles dans les illustrations propriétaires ; ils ne constituent pas une spécification de l'algorithme :

- les scores apparaissent sous les cartes dans l'écran de draft de MTGA ;
- l'illustration `Pack 1 / Pick 1` versus `Pack 1 / Pick 9` montre des notes qui changent : par exemple Witherbloom Apprentice passe de 21 à 28 et Maelstrom Muse de 32 à 19 ;
- un écran de recommandation présente un deck assemblé depuis le pool après draft/scellé.

Sources : [Draftsmith officiel](https://mtga.untapped.gg/draftsmith) et [Companion officiel](https://mtga.untapped.gg/companion).

L'observation démontre une sortie contextuelle et immédiatement lisible. Elle ne démontre ni pourquoi une note monte ou baisse, ni la façon dont les cartes du deck recommandé sont sélectionnées.

## 3. Données accessibles et données d'entrée connues

Le Companion observe en temps réel le fichier `Player.log` généré par MTGA. L'aide officielle cite notamment les débuts/fins de match, le deck engagé et les cartes piochées ; elle précise que le journal ne contient que ce que le client connaît déjà. Cela explique une partie de la télémétrie disponible à Untapped, mais pas la construction du modèle Draftsmith. ([fonctionnement du Companion](https://help.hearthsim.net/en/articles/5020719-how-does-the-untapped-gg-companion-work))

Sur le site Limited, les surfaces officielles donnent accès à des données agrégées distinctes des scores contextuels de l'overlay :

- filtres par set, format, période, rang, couleur, valeur de mana, rareté, type, carte et archétype du joueur ;
- colonnes `Avg Last Offered`, `In Hand WR`, `In Hand WR Difference`, `In Opening Hand WR`, `Played WR`, `Included WR`, `Total Games` ;
- pick order par grades, tier list des couleurs, trophy decks, listes de deck et relecture de l'ordre des picks ;
- export CSV des données Limited listé dans l'offre Premium.

Sources : [exemple officiel Limited Card Data](https://mtga.untapped.gg/limited/draft/final-fantasy/card-data), [exemple officiel Trophy Decks](https://mtga.untapped.gg/limited/draft/final-fantasy/trophy-decks), [offre Premium](https://mtga.untapped.gg/premium).

La documentation examinée ne décrit pas d'API publique stable ni d'export des **notes Draftsmith contextuelles pick par pick**. Les statistiques web visibles ne doivent donc pas être assimilées aux entrées, poids ou sorties internes exactes de Draftsmith.

## 4. Ce qui n'est pas public dans l'algorithme

Dans les pages Draftsmith, Companion, Premium et FAQ consultées, Untapped ne publie pas :

- la formule qui transforme les parties en score 1–55 ;
- la métrique cible (win rate brut, in-hand, valeur ajoutée, probabilité de trophée, etc.) ;
- les variables et poids de contextualisation du pool ;
- la gestion de la couleur, de la courbe, des synergies, des doublons, du fixing et des signaux ;
- les fenêtres temporelles, filtres de rang, corrections de biais, régularisation et intervalles de confiance ;
- les seuils minimaux de données ou la stratégie de repli pour les cartes rares ;
- l'architecture du modèle, son entraînement ou sa validation ;
- la fonction objectif et les contraintes utilisées pour recommander un deck ou sa base de mana.

Il est donc possible de vérifier **les catégories et le comportement de haut niveau**, pas de reconstituer fidèlement le moteur.

## 5. 17Lands : alternative ouverte, pas source prouvée de Draftsmith

17Lands définit publiquement ses métriques. Le `GIH WR` est le taux de victoire des parties où une instance de la carte a été piochée en main, à l'ouverture ou plus tard ; chaque instance est comptée. `IIH` est la différence entre `GIH WR` et le win rate lorsque la carte n'a pas été vue, avec des limites documentées. ([définitions officielles](https://www.17lands.com/metrics_definitions))

17Lands publie aussi, sous CC BY 4.0 sauf indication contraire, des jeux de données anonymisés de draft, partie et replay. Les données de draft contiennent une ligne par pick avec les picks précédents et les résultats ; les données de partie décrivent notamment deck, main de départ et cartes piochées. ([datasets officiels](https://www.17lands.com/public_datasets))

Ces données permettent de prototyper et valider un score ouvert. Elles ne prouvent nullement qu'Untapped utilise 17Lands. 17Lands avertit en outre que le win rate brut est dépendant du deck et de l'archétype, et que plus le draft avance, plus le plan de jeu et les besoins du pool doivent primer sur la seule puissance moyenne. ([article méthodologique officiel](https://blog.17lands.com/posts/using-win-rate-data/))

## 6. Écart avec les anciennes specs DraftMaster

| Affirmation historique | Évaluation après vérification |
|---|---|
| « Untapped 1.0 à 53.0+ » dans la [constitution](../legacy/spec-kit-v1/constitution.md) | **Contredit par la source officielle** : l'échelle publiée est 1–55. |
| Tiers `S/A/B/C/D` et seuils internes (`48`, `43`, `36`, `26`) | **Heuristique DraftMaster**, pas catégories Untapped. Les catégories publiées sont Weak/Bronze/Silver/Gold/Fire avec les bornes ci-dessus. |
| `361 Ratings Untapped` et CSV `mtg-arena-powered-cube-untapped-ratings.csv` dans le [plan](../legacy/spec-kit-v1/specs/001_cube_draft_mastery/plan.md) et les [tâches](../legacy/spec-kit-v1/specs/001_cube_draft_mastery/tasks.md) | **Provenance non démontrée par les artefacts actuels** : aucun fichier correspondant n'est présent dans le dépôt examiné et les sources officielles ne documentent pas ce corpus comme un export de référence. |
| Phases des bots, bonus on-color `+16`, malus off-color `-22` dans la [recherche historique](../legacy/spec-kit-v1/specs/001_cube_draft_mastery/research.md) | **Modèle propre au projet** ; aucun support trouvé dans la documentation Untapped. |
| Conversion de seuils `GIH WR` en tiers `S–D` | **Convention DraftMaster**, pas définition 17Lands ni conversion officielle vers Draftsmith. 17Lands définit les métriques et leurs biais, pas ces seuils fixes. |

Conséquence : les valeurs locales peuvent rester utiles comme données de jeu internes, mais doivent être renommées et documentées comme **scores DraftMaster** tant que leur provenance Untapped n'est pas vérifiable.

## 7. Principes transposables à DraftMaster

1. Reprendre l'UX à deux niveaux : un score fin et une catégorie immédiatement compréhensible.
2. Séparer un score de puissance initial d'un ajustement contextuel explicable (`couleurs`, `courbe`, `archétype`, `fixing`, `besoin de créatures/interactions`).
3. Afficher les facteurs principaux de chaque recommandation au lieu de prétendre reproduire une boîte noire propriétaire.
4. Versionner la provenance, la période, le format, la taille d'échantillon et la confiance de chaque score.
5. Prévoir un mode « données insuffisantes » et une stratégie de repli pour le démarrage à froid.
6. Évaluer séparément la recommandation de pick et la construction finale du deck ; ce sont deux problèmes et deux critères de succès différents.
7. Si 17Lands est utilisé, respecter sa licence et ses consignes d'usage, citer clairement la source, et ne jamais appeler le résultat « score Untapped ».

## Sources primaires

- Untapped.gg : [Draftsmith](https://mtga.untapped.gg/draftsmith), [Companion](https://mtga.untapped.gg/companion), [Premium](https://mtga.untapped.gg/premium), [Limited Card Data](https://mtga.untapped.gg/limited/draft/final-fantasy/card-data), [Trophy Decks](https://mtga.untapped.gg/limited/draft/final-fantasy/trophy-decks).
- HearthSim Help Center (aide propriétaire Untapped) : [définition](https://help.hearthsim.net/en/articles/5415743-what-is-draftsmith), [modes](https://help.hearthsim.net/en/articles/5431554-what-games-modes-does-draftsmith-support), [nouveaux sets](https://help.hearthsim.net/en/articles/5579638-is-draftsmith-available-in-the-first-hours-of-a-new-set), [collecte via Player.log](https://help.hearthsim.net/en/articles/5020719-how-does-the-untapped-gg-companion-work).
- 17Lands : [définitions des métriques](https://www.17lands.com/metrics_definitions), [datasets publics](https://www.17lands.com/public_datasets), [prudence d'interprétation](https://blog.17lands.com/posts/using-win-rate-data/).
