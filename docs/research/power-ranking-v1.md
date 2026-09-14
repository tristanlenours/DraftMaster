# Power Ranking v1

État vérifié au 14 septembre 2026. Cette version attribue aux 1 948 cartes du catalogue un score de puissance sur l'échelle produit DraftMaster de 1 à 55, alignée sur l'échelle historique d'Untapped. Le score absolu reste séparé des tiers et bonus propres à chaque cube. La valeur 55 reste théoriquement possible ; Black Lotus, Ancestral Recall, Time Walk et Minsc & Boo sont actuellement les cartes les mieux notées du catalogue avec 53.

## Référentiel

Le classement utilise trois niveaux de preuve :

1. **438 scores Untapped directs.** Pour chaque carte observée dans plusieurs drafts, la valeur la plus fréquente est retenue ; une égalité est résolue par l'observation chronologiquement la plus ancienne. Les valeurs confirmées dans [`untapped-reference-v1.json`](../../data/power-rankings/untapped-reference-v1.json) priment sur cet agrégat.
2. **1 223 estimations CubeCobra calibrées.** La calibration courante utilise 426 cartes de recouvrement et combine les signaux CubeCobra avec les caractéristiques fonctionnelles des cartes.
3. **287 fallbacks explicites.** Ils restent identifiés comme tels dans l'artefact ; ils ne doivent pas être présentés comme des observations Untapped.

Le résultat complet, la méthode utilisée par carte et la provenance des entrées sont conservés dans [`power-ranking-v1.json`](../../data/power-rankings/power-ranking-v1.json). Le modèle et ses paramètres sont dans [`cubecobra-calibration-v1.json`](../../data/power-rankings/cubecobra-calibration-v1.json). La reconstruction se fait avec `npm run power:rebuild:apply`, puis `npm run data:sync`.

## Validation

Sur cinq plis déterministes, la calibration enrichie courante obtient une erreur absolue moyenne de **7,43 points** sur les cartes Untapped réservées à la validation. La variante isotone obtient **8,51 points**. Une estimation CubeCobra reste moins sûre qu'une note Untapped directe.

Le test de référence verrouille les valeurs communiquées, dont : Black Lotus, Ancestral Recall, Time Walk et Minsc & Boo à 53 ; les cinq Mox et Sol Ring à 51 ; et Ancient Tomb à 31. Le maximum du catalogue est 53, ce qui empêche l'ancien amas de cartes bornées artificiellement à 55.

Les identités Oracle du catalogue et les scores de cet artefact sont désormais vérifiés par `npm run coach:data:verify`. Ce contrôle refuse les doublons, les cartes absentes et toute divergence entre `powerScore.score` et le ranking. Les fallbacks restent de bonnes cibles pour une future validation humaine.

## Utilisation dans l'explorateur

Le `Power Ranking` affiché reprend désormais directement `powerScore.score` sur 55. Son rang compare ce score aux autres cartes du cube. Le tier, le `scoreModifier` et le plafond éditorial restent visibles comme informations contextuelles mais ne changent plus le Power Ranking.

Le `dynamicScore` utilise ce score comme point de départ versionné et conserve séparément les ajustements de couleur, courbe, mana et synergie afin qu'un changement de contexte ne réécrive jamais la valeur absolue v1.
