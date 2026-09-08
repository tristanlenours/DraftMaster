# Validité des sources du power ranking

Audit du 6 septembre 2026. Recherche sur les sources officielles et lecture des générateurs locaux ; aucune donnée de carte modifiée. Cette note évalue la signification des métriques et la traçabilité des conversions, pas la qualité intrinsèque de chaque carte.

## Conclusion

Les trois sources peuvent informer un classement, mais ne mesurent pas la même chose. Leur mise sur une échelle commune de 1 à 55 ne démontre ni leur équivalence ni une puissance absolue valable dans tous les cubes. Les conversions locales sont actuellement des conventions sans validation empirique montrée ; les libellés `calibrated_high` et les confiances de 85–95 % vont au-delà des preuves disponibles.

## Ce que mesurent les fournisseurs

| Source | Fait vérifié | Conséquence pour DraftMaster |
| --- | --- | --- |
| Untapped / Draftsmith | Untapped annonce des notes de 1 à 55 calculées à partir de millions de parties Limited. Les notes présentées en draft s'adaptent aux cartes déjà choisies. | Distinguer une observation locale `staticScore` de la note contextuelle affichée ; garder le format, la date et la version de carte associés à l'observation. La page publique ne définit aucune puissance universelle inter-cubes. |
| 17Lands `GIH WR` | Taux de victoire des parties où une instance de la carte a été piochée en main, au départ ou ensuite ; pondération par instances. | Ce n'est ni une probabilité de victoire causée par la carte ni une note Draftsmith. Conserver le nombre d'observations, le format, les dates et les filtres de joueurs/decks. |
| CubeCobra Elo | Le code officiel met à jour l'Elo de la carte sélectionnée face aux cartes du booster ; il maintient des valeurs globales et par cube. | C'est un signal de préférence de sélection. Il ne mesure pas les victoires en partie. Préciser si l'Elo vient de l'ensemble du site ou du cube. |

Sources primaires : [Draftsmith](https://mtga.untapped.gg/draftsmith), [définitions 17Lands](https://www.17lands.com/metrics_definitions), [calcul Elo CubeCobra](https://github.com/dekkerglen/CubeCobra/blob/master/packages/jobs/src/update_draft_history.ts). Le code CubeCobra consulté est celui de la branche publique au jour de l'audit ; il n'établit pas la version exacte ayant produit les archives locales.

17Lands avertit explicitement que les taux dépendent de l'archétype, de la composition du deck et de la durée des parties. Une carte de fin de partie peut présenter un `GIH WR` gonflé parce qu'elle est davantage piochée lors des longues victoires que lors des défaites rapides. Un grand volume réduit l'incertitude d'échantillonnage, mais n'efface pas ces biais. [Analyse méthodologique officielle](https://blog.17lands.com/posts/using-win-rate-data/).

Déduction méthodologique : une normalisation par percentile ou score standardisé peut faciliter la comparaison relative dans un environnement. Elle ne prouve pas qu'une excellente carte d'un format faible équivaut à une excellente carte d'un cube Vintage. La conversion vers les références Untapped nécessite des cartes communes et une validation indépendante.

## Écarts vérifiables dans le dépôt

1. Dans [generate-referential.mjs](../../scripts/generate-referential.mjs), Tinker et Underworld Breach reçoivent une valeur constante `66.2` avec `source: "17lands_normalized"`. Aucun relevé 17Lands ou contexte n'est fourni dans cette branche du générateur. Lion's Eye Diamond reçoit également un Elo constant `1720`. Ce sont des attributions non étayées par ce code, même si une source extérieure pourrait ultérieurement les confirmer.
2. [power-harmonizer.ts](../../src/cards/power-harmonizer.ts) utilise `28 + (GIH_WR - 0.55) × 180` et `1 + 54 × (Elo - 1100) / 800`. Aucun ajustement sur des observations communes, erreur mesurée ou échantillon de validation n'accompagne ces fonctions.
3. [regrade-titou-tribal.mjs](../../scripts/regrade-titou-tribal.mjs) et [import-nico-candyshop.mjs](../../scripts/import-nico-candyshop.mjs) utilisent plutôt `(Elo - 900) / 14`, puis arrondissent et bornent. Pour un même Elo de 1400, le module donne 21,3 et les scripts 35,7 : le classement dépend de la chaîne d'import.
4. Ces deux scripts remplacent un Elo absent par `1200`, puis peuvent enregistrer un score présenté comme provenant de CubeCobra. Une valeur par défaut ne constitue pas une observation.
5. Ils fabriquent des pourcentages `winrateOrScore` depuis l'Elo : `45 + (Elo - 1000) / 25` pour Titou et `50 + (Elo - 1200) / 20` pour Candyshop. Ces pourcentages ne sont pas des win rates observés. À Elo 1400, ils deviennent respectivement 61 % et 60 %.
6. Les confiances sont des constantes : 1 pour Untapped, 0,85 pour 17Lands, et jusqu'à 0,95 pour les imports Elo. Elles ne reposent ici ni sur un effectif ni sur une mesure d'erreur. « Source identifiée » et « score prédictif certain » sont deux propriétés distinctes.

## Socle proposé pour le MVP

Conserver les observations brutes et leur provenance séparément du score calculé. Une observation devrait identifier la carte et sa version, le fournisseur, la métrique, sa valeur, le cube/format, la période, les filtres, l'effectif disponible et l'archive source. Une valeur absente doit rester absente.

Les références Untapped peuvent servir d'ancrage historique si leur identité et leur contexte sont vérifiés. Pour compléter la couverture, afficher d'abord l'Elo ou le `GIH WR` sourcé dans son unité, ou une estimation explicitement provisoire. Ne pas déduire un pourcentage de victoire d'un Elo.

Avant de qualifier une conversion de calibrée, ajuster une méthode sur des cartes réellement communes, réserver des cartes et environnements pour l'évaluation, mesurer les erreurs et les inversions de classement, puis versionner la méthode. Toute carte hors du domaine couvert doit être signalée comme extrapolation. Cela permet un score de base utile à un futur `dynamicScore`, sans lui attribuer une universalité non démontrée.
