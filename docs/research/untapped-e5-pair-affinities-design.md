# E5 — Affinités ordonnées carte-à-carte, design hors échantillon

_Date : 4 septembre 2026. Cette note propose l'expérience E5 ; elle ne rapporte
aucune amélioration observée et ne modifie pas le moteur._

## Question falsifiable

Après le modèle E2 à cinq axes, un effet appris pour le couple ordonné
**carte offerte → carte déjà choisie** améliore-t-il les recommandations sur le
draft témoin, sans avoir utilisé aucune de ses cibles pour construire ou régler
l'effet ?

La prédiction E5 d'une carte offerte (c), au pick (t), est :

```text
scoreE5(c, Pt) = scoreE2(c, Pt) + clamp(Σj∈unique(Pt) w[c,j] × g(t), −cap, cap)
```

- (P_t) est seulement la liste `PickedCards` disponible avant le pick ;
- (w[c,j]) est un coefficient régularisé, spécifique au candidat (c) et à
  une carte déjà dans le pool (j) ; l'ordre a un sens ;
- (g(t)) est une porte de progression fixée avant l'expérience (par exemple
  (0) en P1P1 et croissante ensuite) ;
- `cap` limite la somme des effets de paires pour qu'une carte rarement vue ne
  reçoive pas un bonus arbitraire.

La cible d'apprentissage est le résidu
`dynamicScore - predictionE2`, jamais le choix humain `PickedCard`.
Ainsi E5 cherche à expliquer l'écart restant du score, non à imiter le pick
effectué.

## Données et unité d'observation

Le corpus versionné contient, à chaque pick, `PickedCards`, `DraftPack`,
`PickedCard` et `PackScores`, dont les deux scores numériques sont la cible
utilisable. C'est visible dans
[`drafts_backup.json`](../../data/untapped_history/drafts_backup.json) et dans
l'interface locale reprise par le
[benchmark actuel](../../tests/integration/coaching/untapped-benchmark.test.ts).
Le contrat E4 fixe le corpus, le témoin
`d555b02d-3745-4a4f-b1b6-fdc75c38c5c0`, les 360 cibles numériques des 45 picks
et les métriques de comparaison dans le
[rapport de calibration](./untapped-random-draft-calibration.md).

Une observation E5 est donc le triplet `(draftId, candidat c, pool antérieur
Pt)` pour toute entrée de `PackScores` ayant deux scores finis, enrichi avec
les métadonnées versionnées
[`card-metadata-v1.json`](../../data/untapped_history/card-metadata-v1.json).
Le modèle E2 versionné fournit le score de base et ses prédictions dans
[l'artefact E4](./artifacts/untapped-axis-benchmark-v1.json).

## Split et protections contre la fuite

Le draft témoin est un test final fermé. Toutes ses 360 cibles, ses 45
`PickedCard`, son deck recommandé, son chemin de couleur et ses métadonnées
dérivées sont exclus de :

- la sélection du vocabulaire de paires et des seuils de fréquence ;
- l'apprentissage des coefficients, du cap et de la régularisation ;
- la sélection de (g(t)), des transformations et de tout hyperparamètre ;
- tout exemple, tableau de cas, ou inspection servant à choisir une règle.

Sur les 20 autres drafts scorés, la sélection des hyperparamètres est une
validation croisée **leave-one-draft-out** imbriquée. Pour chaque pli, E2 et le
modèle de paires sont réentraînés sur les autres drafts du pli ; le draft de
validation ne sert qu'à choisir les hyperparamètres. Après ce choix, les deux
modèles sont entraînés une dernière fois sur les 20 drafts, puis évalués une
seule fois sur le témoin.

Les entrées de chaque contexte doivent être temporelles :

1. construire (P_t) exclusivement depuis le `PickedCards` de ce pick ;
2. pour une carte déjà prise, conserver son `staticScore` tel qu'il était
   observable quand elle a été choisie ; ne pas scanner des boosters futurs
   pour le récupérer ;
3. ne jamais utiliser `dynamicScore`, `PickedCard`, `recommendedDeck` ou
   `recommendedDeckColorPath` comme feature, ni les cartes non choisies de
   boosters futurs ;
4. dédupliquer (P_t) pour le premier essai : il mesure une affinité de
   présence, non une prime de doublon ; les doublons formeront une expérience
   distincte ;
5. pour une paire absente du train, retourner strictement zéro, donc la
   prédiction E2.

Les paires dont la fréquence est inférieure au seuil choisi dans le sous-train
sont exclues avant le fit. Les coefficients sont ajustés par ridge (un
coefficient zéro est donc la référence), avec un cap de somme et sans effet
d'interaction E5 en P1P1. Ces protections empêchent le modèle de transformer
l'identifiant d'un draft, un futur pick ou une observation unique en mémoire.

## Comparaison et critères

E5 est comparé au même artefact E4, pas à une mesure recalculée avec un split
différent. Enregistrer pour E2 et E5 :

| Mesure     | Définition                                                                                                              |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| MAE        | moyenne de `abs(prédiction − dynamicScore)` sur les 360 cartes                                                          |
| ±1 / ±3    | part des mêmes 360 cartes avec erreur absolue ≤ 1 / ≤ 3                                                                 |
| Top 1      | part des 45 picks dont le candidat avec la plus haute prédiction est le même que celui avec le plus haut `dynamicScore` |
| Par pack   | les quatre mesures précédentes ventilées P1, P2 et P3                                                                   |
| Couverture | nombre de paires candidates, retenues, observées au test et inconnues ; nombre de cartes ramenées à E2                  |
| Stabilité  | moyenne et écart des métriques sur les plis internes, plus signe et amplitude des principaux coefficients               |

La prédiction est acceptée uniquement si, sur le témoin fermé, E5 améliore à la
fois la MAE **et** le top 1 contre E2, sans dégrader P1P1. Le seuil de fréquence,
la pénalité, le cap et (g(t)) doivent être enregistrés avant le test final.
Une amélioration seulement sur les données d'entraînement, ou seulement après
avoir regardé le témoin, est classée « rejetée/surajustée ».

## Limites connues

- Il n'y a que 20 drafts d'apprentissage : le nombre de couples possibles est
  très supérieur au nombre de contextes. La régularisation et le repli E2 sont
  donc nécessaires, mais ne créent pas de preuve causale.
- Une carte peut n'apparaître qu'une fois ou ne jamais coexister avec une autre.
  E5 ne peut pas apprendre une affinité inédite ; son score doit alors rester
  celui d'E2.
- Une corrélation de paire peut absorber la couleur, la force d'une carte, la
  phase du draft ou une stratégie du joueur. Elle ne prouve pas une synergie
  Magic ni une règle interne d'Untapped.
- Le score contextuel observé ne révèle pas l'intention d'Untapped. La présente
  expérience produit une heuristique DraftMaster mesurée, jamais une
  rétro-ingénierie certifiée de Draftsmith.
- Le benchmark versionné actuel ne teste que P1P1 et ne peut pas, seul, valider
  E5 ; l'artefact E4 et le test de benchmark étendu à construire sont les
  sources de vérité nécessaires.

## Artefact requis

Une exécution E5 doit versionner un JSON distinct contenant les empreintes des
deux entrées, la version du harness, le split, les hyperparamètres choisis dans
les plis, la liste des paires retenues et leurs fréquences, les coefficients,
les prédictions E2/E5 par carte, toutes les métriques ci-dessus et les cinq
pires erreurs. Cela permet de conserver E2 comme baseline et d'ajouter E5 au
journal sans recommencer l'investigation.
