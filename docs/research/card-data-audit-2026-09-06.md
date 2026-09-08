# Audit du catalogue de cartes — 6 septembre 2026

> Cet audit décrit l'état trouvé avant correction. Le nouveau classement et sa validation sont documentés dans [`power-ranking-v1.md`](power-ranking-v1.md). Les anomalies factuelles qui ne concernent pas directement le score restent ouvertes.

## Verdict

Le catalogue contient 1 105 cartes et des données brutes utiles, mais ses scores harmonisés et analyses ne constituent pas encore une base fiable pour le MVP explorateur ou un futur `dynamicScore`. Les problèmes sont reproductibles : attribution de source incorrecte, conversions incompatibles, pourcentages synthétiques, identités erronées et informations de cartes incomplètes.

Audit sans modification des cartes, imports, moteur ou règles de gouvernance. Le nouveau périmètre demandé est un explorateur de cubes/cartes ; les documents actuels décrivent encore le Solo Draft Coach. La préférence exprimée pour un travail progressif sur `main` est prise en compte, sans imposer un nouveau parcours Spec Kit. La branche observée est `002-coaching-friend-bots`, avec beaucoup de modifications préexistantes ; aucune bascule, fusion ou publication n'a été faite pendant cet audit.

## Preuves et reproduction

- [Script d'audit](../../scripts/research/audit-card-data.mjs), à exécuter depuis la racine : `node scripts/research/audit-card-data.mjs`.
- [Résultats détaillés et empreintes SHA-256 des entrées](artifacts/card-data-audit-2026-09-06.json). Les listes identifient les cartes affectées, valeurs et observations historiques. Les catégories peuvent se recouper.
- [Recherche sur les sources officielles](power-ranking-source-validity.md).
- Validation existante : `npm run test -- tests/unit/cards/card-schema-validation.test.ts tests/unit/cards/card-catalog-directory.test.ts tests/unit/cubes/cube-schema-validation.test.ts` : **3 fichiers, 6 tests réussis**. Cela prouve la conformité structurelle testée, pas la véracité des données.

## 1. Répartition réelle des scores

| Source déclarée | Cartes |
| --- | ---: |
| Untapped | 128 |
| CubeCobra Elo | 969 |
| Heuristique experte | 8 |
| 17Lands | 0 |

Le bundle contient bien les mêmes 1 105 documents que les fichiers unitaires, sans collision d'identifiant, de nom ou de slug détectée. Aucun des anciens placeholders stricts `Creature` / texte vide / `{2}` n'a été retrouvé. Ce sont des points positifs, sans constituer une validation des identités externes.

## 2. Untapped : références présentes, sélection et provenance défectueuses

Le fichier `drafts_backup.json` contient 28 drafts, 7 560 positions avec `staticScore` numérique, 538 identifiants Arena scorés et 538 noms résolus dans les métadonnées. Les 538 références annoncées sont donc confirmées localement. Ces observations ne sont pas 7 560 résultats de parties indépendants.

Parmi les 128 cartes déclarées Untapped :

- 122 notes correspondent à au moins une observation historique du même nom, après arrondi à une décimale. Cela n'établit ni le bon choix de période ni une calibration inter-cubes.
- 4 notes ne correspondent à aucune observation locale :

| Carte | Catalogue | Historique `staticScore` |
| --- | ---: | ---: |
| Ancestral Recall | 55 | 52 |
| Black Lotus | 55 | 53 |
| Elspeth, Storm Slayer | 46 | 44 |
| Orcish Bowmasters | 48 | 49 |

- Champion of the Parish (38) et Time Walk (55) sont étiquetées Untapped sans observation numérique retrouvée dans ce corpus. Cela signifie « non étayé ici », pas « aucune note extérieure possible ».
- 250 autres cartes du catalogue ont une observation Untapped mais utilisent une autre source. L'ordre de priorité annoncé n'est donc pas effectivement appliqué à toute la couverture disponible.
- 6 cartes déclarées comme issues d'une source externe n'ont pas de `rawSourceScore`.

**457 des 538 références changent de `staticScore` entre drafts.** Aucune variation au sein d'un même draft n'a été détectée. Exemples : Mind Twist 29–36, Sentinel of the Nameless City 31–38. Les archives ne suffisent pas à attribuer ces changements à un format, une version du modèle ou une date précise de recalcul.

`generate-referential.mjs` écrase les notes précédentes dans une Map au fil des parcours : le dernier élément rencontré gagne, sans tri chronologique explicite ni règle documentée de sélection. Une note « statique » n'est donc pas une constante universelle de carte. La bonne unité à conserver est l'observation accompagnée de son contexte.

## 3. Harmonisation non validée et contradictoire

Le module `src/cards/power-harmonizer.ts` convertit l'Elo par `1 + 54 × (Elo - 1100) / 800`. Les scripts d'import et de reclassement utilisent `(Elo - 900) / 14`. Les deux bornent ensuite à 1–55 et arrondissent.

Pour **Elo 1400**, cela donne **21,3** ou **35,7**. **962 des 969** scores CubeCobra du catalogue diffèrent de la sortie du module central sur leur valeur brute enregistrée. Ce n'est pas la preuve que l'une des deux conversions serait correcte : aucune n'est calibrée empiriquement dans ces fichiers.

Les 969 Elo bruts enregistrés correspondent à l'arrondi des archives CubeCobra disponibles, après rapprochement par nom. Le problème principal est donc ici leur interprétation et leur transformation, pas une invention généralisée des Elo bruts.

Les niveaux `calibrated_high`, `calibrated_medium` et les confiances jusqu'à 0,95 sont assignés par constantes. Aucun effectif, intervalle, erreur de validation ou modèle versionné ne les justifie. Les scripts peuvent aussi substituer 1200 à un Elo absent ; cette branche est risquée même si aucun écart brut n'a été détecté sur les 969 scores actuels.

Le générateur ancien code en dur une prétendue valeur 17Lands de 66,2 pour Tinker et Underworld Breach. **Le catalogue actuel ne contient cependant aucune carte étiquetée 17Lands** : il faut distinguer ce risque de régénération de l'état présent.

Untapped annonce des notes alimentées par des millions de parties Limited ; ce volume ne démontre pas leur transférabilité à tous les cubes. CubeCobra Elo mesure des choix de draft ; le GIH WR de 17Lands mesure des victoires conditionnées par la présence de la carte en main. Une simple mise à l'échelle ne rend pas ces mesures équivalentes. Sources officielles et limites dans la [note dédiée](power-ranking-source-validity.md).

## 4. Pourcentages et analyses générés

**1 284 entrées en pourcentage couvrent les 1 105 cartes.** Les scripts fabriquent ces pourcentages depuis l'Elo ou un score, sans résultats de matchs associés. Le champ `winrateOrScore` et le signe `%` leur donnent une apparence de statistique observée.

**9 entrées dépassent 100 %**, dont Black Lotus 113,7 %, Time Walk 105,2 % et Ancestral Recall 103 %. Les valeurs inférieures à 100 % issues des mêmes formules ne deviennent pas valides pour autant.

Les évaluations de quadrants, plancher/plafond, conseils et étiquettes sont en grande partie générées par gabarits et règles grossières. Par exemple, `generate-referential.mjs` déduit certaines tribus du nom de la carte et répète des valeurs de quadrants ; `import-nico-candyshop.mjs` attribue des rôles par recherche de mots dans le texte. Il faut les présenter comme analyses heuristiques à relire, pas comme données objectives mesurées.

375 références carte/cube/archétype pointent vers un identifiant absent des archétypes déclarés du cube. Ce nombre compte des références, pas des cartes distinctes.

## 5. Identité et caractéristiques des cartes

Comparaison avec les détails archivés CubeCobra, sans prétendre remplacer une validation complète contre Scryfall :

- **15 `oracleId` différents pour le même nom**, dont Black Lotus, Lightning Bolt, Orcish Bowmasters, Tinker et Sol Ring. Plusieurs identifiants sont manifestement des placeholders saisis dans les générateurs. Un UUID syntaxiquement valide ne prouve pas une identité Oracle valide.
- **252 cartes sans force ni endurance**, alors que ces valeurs existent dans les détails archivés (504 champs manquants). Adeline et Adaptive Automaton en font partie.
- **29 différences de couleur** concernent des cartes à plusieurs faces enregistrées avec `colors: []`, notamment Delver of Secrets et Fable of the Mirror-Breaker. Le modèle doit représenter les faces et définir explicitement la couleur utilisée pour l'affichage et les filtres.
- **Green Sun's Zenith : `cmc: 1001`**, contre 1 dans l'archive. Le coût est également stocké en notation Arena `oXoG`.
- **68 coûts en notation Arena `o...`**, mélangés aux coûts `{...}`. Normaliser l'encodage avant de l'exploiter.

Les 534 écarts de champs de l'artefact sont ces 504 valeurs force/endurance, 29 couleurs et 1 valeur de mana. Les textes Oracle, traductions et conseils n'ont pas été vérifiés carte par carte contre une source actuelle. Les tentatives de lecture Scryfall via le navigateur de recherche ont échoué ; les constats d'identité et de caractéristiques reposent donc sur les archives locales, pas sur un téléchargement frais de Scryfall.

## 6. Contenu des cubes

| Cube | Nombre déclaré | Cartes indexées | Archive disponible |
| --- | ---: | ---: | --- |
| Titou | 545 | 541 | 545 entrées / 542 identités Oracle distinctes |
| Nico | 730 | 733 | 730 identités distinctes |
| Hugues | 450 | 7 | Pas de liste brute complète trouvée dans les entrées auditées |

Après rapprochement des identités et des noms alternatifs : Preordain manque chez Titou ; Elspeth, Storm Slayer, Lightning Bolt et Mulldrifter sont ajoutées chez Nico par rapport à son archive. Vérifier ces ajouts avec la liste souhaitée : l'archive n'établit pas qu'ils sont indésirables.

La différence 545/542 chez Titou vient de la distinction entre exemplaires et identités : ce n'est pas trois cartes manquantes. Les noms alternatifs de Nico (Balin's Tomb, The Party Tree, etc.) expliquent plusieurs écarts nominaux sans constituer des absences. L'artefact conserve les diagnostics de noms, mais ils ne doivent pas être comptés comme erreurs confirmées.

## 7. Ordre de travail proposé pour le MVP

1. **Fiabiliser le catalogue factuel** : identifiants Oracle, faces, coûts, couleurs, force/endurance et listes de cubes. Conserver séparément l'identité de carte et les exemplaires du cube.
2. **Conserver les observations brutes** : fournisseur, métrique, valeur, carte/version, format/cube, période, effectif lorsqu'il existe, fichier source et empreinte. Garder une valeur absente comme absente ; préserver toutes les observations Untapped.
3. **Retirer les statistiques inventées de l'affichage** : pourcentages synthétiques, confiance numérique non justifiée et étiquette « calibré » non prouvée. Distinguer explicitement faits, observations et analyses éditoriales.
4. **Construire une seule calibration versionnée** sur les cartes communes entre sources. Réserver des cartes et contextes hors entraînement ; mesurer erreurs, inversions de classement et extrapolations. Les 538 références ne sont pas toutes nécessairement présentes dans les cubes ou représentatives du Pauper.
5. **Définir un score de base de référence**, avec contexte cible et incertitude, puis seulement un ajustement dynamique. Un score stable pour une version de DraftMaster est possible ; sa validité universelle ne découle pas de cette stabilité.

Pour avancer progressivement, le premier incrément utile est un explorateur de données factuelles avec scores sources traçables. Il peut fonctionner avec des notes inconnues ou provisoires pendant la calibration. Le socle solide vient de la provenance et de la mesure d'erreur, pas de l'obligation d'attribuer immédiatement un nombre à chaque carte.
