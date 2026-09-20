# Audit du moteur de cartes remplaçantes — 2026-09-20

## Périmètre

L'audit couvre `cube-upgrade-advisor` et les artefacts `cube-suggestions.json`, avec un
focus sur `titou_tribal`. L'objectif est double : réduire les suggestions hors contexte
sans diminuer artificiellement le rappel des cartes intéressantes.

Suivi de livraison : [issue GitHub #77](https://github.com/tristanlenours/DraftMaster/issues/77)
et spécification `specs/007-card-replacement-relevance/`.

## Constats avant correction

- Au moins 14 remplacements tribaux incohérents étaient générés pour Titou Tribal. Les cibles
  changelin ou de glue universelle pouvaient notamment être remplacées par une créature
  d'une seule tribu sans rapport. Un contrôle indépendant a aussi détecté un faux ami :
  `Plague Engineer`, qui choisit une tribu adverse pour la pénaliser, était considéré à
  tort comme une glue tribale universelle.
- 15 créatures de la maybeboard n'appartenaient à aucune tribu déclarée du cube. Une
  simple compatibilité de couleur suffisait pour les rattacher à plusieurs archétypes.
- Toutes les cartes de terrain ont `colors: []`. Le filtre de couleur générique pouvait
  donc remplacer un terrain cinq couleurs par un terrain qui ne produit que deux ou
  trois couleurs.
- Le filtre multicolore exigeait par erreur le même nombre de couleurs, malgré le contrat
  annoncé d'accepter une alternative plus facile à lancer. Cela créait des faux négatifs.
- 123 des 128 propositions initiales n'avaient aucun rôle objectif exactement identique
  entre cible et candidate. Les rôles existants restent trop incomplets pour devenir un
  filtre bloquant, mais ils peuvent améliorer le classement.
- Le cube de référence tribal contient 540 cartes, dont seulement 182 sont présentes dans
  le catalogue local : 358 cartes, soit 66 %, ne peuvent actuellement jamais être
  suggérées.

## Décisions appliquées

- Les tribus supportées sont explicites dans les métadonnées d'archétype via
  `creatureTypes`. Pour Titou Tribal, une cible tribale doit conserver au moins une tribu
  pertinente ; une cible changelin ou glue universelle exige une candidate universelle.
- La maybeboard applique la même règle partagée et n'associe plus une créature à tous les
  archétypes compatibles par couleur.
- Les terrains doivent préserver toutes les couleurs de mana produites par la cible.
- Une carte mono-couleur peut remplacer une cible multicolore compatible.
- L'alignement des familles de rôles apporte un bonus de classement, sans exclure les
  cartes lorsque les annotations sont absentes ou trop générales.
- Chaque rapport expose désormais la version du moteur, le snapshot du cube et la
  couverture du catalogue et des benchmarks.

## Extension aux autres cubes

Le même moteur est utilisé par les cinq cubes. L'audit transversal a révélé trois biais
supplémentaires :

- le bonus de récence pouvait faire gagner une carte jusqu'à 17 points plus faible qu'une
  alternative compatible ;
- le paramètre `maxSuggestions = 30` pouvait produire 81 cartes parce que chaque
  remplacement direct était ajouté sans plafond ;
- la compatibilité de type était trop large : une créature-artefact pouvait être remplacée
  par une créature ordinaire, un équipement par une nourriture, et un rituel de mana par
  un removal.

Le moteur `cube-upgrade-advisor@3` applique maintenant un plancher global de 25/55, utilise
la récence comme départage borné à 6 points plutôt que comme substitut à la puissance,
conserve les types de permanent structurants et compare les fonctions explicites du texte
Oracle. La fenêtre de récence est glissante et ancrée sur l'année la plus récente des
métadonnées (2024–2026 pour les données actuelles). La liste est plafonnée à 30 cartes.
Jusqu'à un tiers des places est réservé à des découvertes récentes hors remplacements
directs, uniquement si leur score composite reste à six points du meilleur candidat non
direct : une nouveauté faible ne peut donc plus évincer une référence nettement meilleure.

Chaque proposition expose désormais son score de classement et ses facteurs matériels
(puissance, rôle, efficacité de mana, cohérence tribale, récence, benchmarks et popularité).
Le rapport lie aussi le snapshot à des empreintes SHA-256 du catalogue, des métadonnées de
sortie, des benchmarks et de l'archive CubeCobra propre au cube. Chaque source conserve son
attribution/licence connue et sa méthode de transformation ; une génération sans snapshot ou
provenance est rejetée.

| Cube | Remplacements | Maybeboard | Cartes récentes | Remplacements directs |
| --- | ---: | ---: | ---: | ---: |
| Nico Candyshop | 178 | 30 | 25 | 20 |
| Cédric High-Power | 207 | 30 | 22 | 29 |
| Hugues Pauper | 148 | 30 | 13 | 23 |
| Titou Arena Peasant Plus | 51 | 30 | 1 | 23 |
| Titou Tribal | 117 | 30 | 10 | 30 |

Avant cette passe, les quatre cubes non tribaux exposaient entre 49 et 81 cartes et
contenaient respectivement 14, 11, 7 et 10 suggestions sous 25/55. Il n'en reste aucune.
Le cas le plus répétitif, `Everything Pizza` proposé pour 29 cartes de Nico Candyshop,
disparaît grâce à la conservation des types et sous-types fonctionnels.

## Résultat sur Titou Tribal

Après régénération, le rapport contient 117 remplacements et 30 cartes de maybeboard.
Les contrôles ciblés ne trouvent plus de remplacement tribal incohérent ni de créature
hors des tribus déclarées.

## Limites restantes

Le moteur ne peut pas garantir de ne manquer aucune carte intéressante tant que les 358
cartes de référence absentes ne sont pas ingérées et scorées. La prochaine amélioration
structurante est donc une étape d'enrichissement du catalogue, avec identité Oracle,
légalité, rôles et score vérifiables, avant de modifier davantage les pondérations.

Les terrains qui préservent les mêmes couleurs peuvent encore avoir des usages très
différents (vitesse, types de terrain, sacrifice, conditions d'arrivée engagée). Une
taxonomie de fonctions de mana plus riche serait nécessaire pour les départager de façon
fiable.

La couverture des benchmarks reste inégale : 69 % pour Nico et Cédric, 41 % pour Hugues,
97 % pour Arena Peasant Plus et 34 % pour Titou Tribal. Le faible nombre de nouveautés
Peasant réellement retenues reflète donc les données disponibles et les contraintes du
format, plutôt qu'un remplissage artificiel avec des cartes récentes mais hors contexte.
