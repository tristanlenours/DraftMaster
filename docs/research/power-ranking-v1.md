# Power Ranking v1

État au 6 septembre 2026. Cette version attribue un score de puissance sur l'échelle Untapped de 1 à 55 aux 1 105 cartes du catalogue et sépare le score absolu des tiers et bonus propres à chaque cube. La valeur maximale observée dans cette version est 53.

## Référentiel

Le classement utilise trois niveaux de preuve :

1. **378 scores Untapped directs.** Pour chaque carte observée dans plusieurs drafts, la valeur la plus fréquente est retenue ; une égalité est résolue par l'observation chronologiquement la plus ancienne. Les 26 valeurs confirmées par le propriétaire dans [`untapped-reference-v1.json`](../../data/power-rankings/untapped-reference-v1.json) priment sur cet agrégat.
2. **724 estimations CubeCobra.** Une calibration apprend la relation avec 377 cartes qui ont à la fois une note Untapped et des détails CubeCobra. Elle combine une régression régularisée et les trois cartes fonctionnellement les plus proches à partir de l'Elo, la popularité, le coût, les types, les couleurs, le texte et les tags Oracle.
3. **3 secours éditoriaux.** Gurmag Angler, Ninja of the Deep Hours et Mulldrifter n'ont pas de détails exploitables dans les deux archives CubeCobra locales ; leur ancienne estimation est conservée avec une confiance limitée.

Le résultat complet, la méthode utilisée par carte et la provenance des entrées sont conservés dans [`power-ranking-v1.json`](../../data/power-rankings/power-ranking-v1.json). Le modèle et ses paramètres sont dans [`cubecobra-calibration-v1.json`](../../data/power-rankings/cubecobra-calibration-v1.json). La reconstruction se fait avec `npm run power:rebuild:apply`, puis `npm run data:sync`.

## Validation

Sur cinq plis déterministes, la calibration enrichie obtient une erreur absolue moyenne de **5,20 points** sur les cartes Untapped réservées à la validation. La conversion monotone de l'Elo seul obtenait **9,42 points**. L'amélioration est nette, mais une estimation CubeCobra reste moins sûre qu'une note Untapped directe.

Le test de référence verrouille les valeurs communiquées, dont : Black Lotus, Ancestral Recall, Time Walk et Minsc & Boo à 53 ; les cinq Mox et Sol Ring à 51 ; et Ancient Tomb à 31. Le maximum du catalogue est 53, ce qui empêche l'ancien amas de cartes bornées artificiellement à 55.

Dans le cube Nico, les premières cartes suivent globalement le classement fourni. Deux cartes sans observation Untapped s'y intercalent sur estimation : Forth Eorlingas! à 50,2 et Comet, Stellar Pup à 49,4. Elles sont de bonnes candidates pour la prochaine vérification humaine. Ancient Tomb est classée 229e sur 733 dans Nico et 94e sur 541 dans Titou ; son score absolu est 31 dans les deux cas.

## Utilisation dans l'explorateur

Le `Power Ranking` affiché reprend désormais directement `powerScore.score` sur 55. Son rang compare ce score aux autres cartes du cube. Le tier, le `scoreModifier` et le plafond éditorial restent visibles comme informations contextuelles mais ne changent plus le Power Ranking.

Le futur `dynamicScore` peut utiliser ce score comme point de départ versionné. Il doit conserver séparément les ajustements de couleur, courbe et synergie afin qu'un changement de contexte ne réécrive jamais la valeur absolue v1.
