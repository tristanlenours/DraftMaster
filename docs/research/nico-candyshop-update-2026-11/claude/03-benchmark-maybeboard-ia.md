# Benchmark : la maybeboard IA de DraftMaster face à la vraie mise à jour de Nico

## En bref

- **Les choix de cartes sont bons.** Sur les 50 cartes de la maybeboard IA v5, **21 ont été ajoutées par Nico (42 %)**, alors qu'il ne l'a pas lue. En comptant aussi les 96 propositions d'upgrade, **24 des 97 cartes proposées** ont été prises.
- **Les choix d'emplacement sont mauvais.** Une seule paire « sort X, entre Y » correspond exactement (Baral → Bilbo). Les cartes que l'IA propose de retirer ne sont coupées que dans **25 %** des cas, à peine mieux que le hasard (17,8 %).
- **De graves faux positifs.** L'IA propose de retirer des pièces maîtresses d'archétype : Show and Tell, Griselbrand (remplacé par… Gurmag Angler), Yawgmoth's Will, Thassa's Oracle, Displacer Kitten, Stoneforge Mystic. Nico les a toutes gardées.
- **Une baseline naïve fait mieux que l'IA.** Proposer simplement « les cartes du MTGO Vintage Cube absentes du cube » donne **51 % de précision et 65 % de rappel**, contre 25 % et 18,5 % pour l'IA. Et l'IA avait cette liste en entrée.
- **La v4 du moteur a été un vrai saut** (PR #112, cartes récentes des cubes pairs et garde-fous poste pour poste). La maybeboard passe de 3 cartes prises sur 30 à 17 sur 30. **L'extension à 50 cartes (v5, #113) a dilué la précision** : 20 cartes de plus pour seulement 4 prises de plus.

---

## 1. Protocole

| Élément | Valeur |
|---|---|
| Liste de départ de l'IA | `cube.json` / snapshot `nico_candyshop@2026-03-01.1`. Je l'ai vérifié : c'est **exactement** la liste CubeCobra du 11 décembre 2024 (730 cartes, même oracle_id). |
| Version IA évaluée | `cube-upgrade-advisor@5`, générée le 2026-11-07 (10 jours avant la mise à jour de Nico) : 50 cartes en maybeboard et 96 upgrades poste pour poste. |
| Vérité terrain | Différence nette par `oracle_id` entre le 11/12/2024 et le 18/11/2026 : 130 sorties, 130 entrées. Les allers-retours, changements d'impression et flavor names sont exclus. |
| Indépendance | D'après toi, Nico n'a pas lu la recommandation. Mais il a probablement suivi le MTGO Vintage Cube, qui est aussi une **entrée** du moteur IA. Le benchmark mesure donc à la fois le « goût » et la façon dont l'IA exploite ses sources. |
| Comparaison | Noms normalisés à la face avant (les cartes double face et les flavor names sont ramenés à la même carte). |

Limite importante : une recommandation non retenue n'est pas forcément mauvaise. La précision mesurée ici est une **borne basse**, avec un seul propriétaire de cube comme juge.

---

## 2. Résultats globaux (IA v5)

| Mesure | Valeur | Commentaire |
|---|---|---|
| Maybeboard : cartes ajoutées par Nico | **21 / 50 (42 %)** | très bon pour 2 ans d'écart |
| Maybeboard + upgrades : ajouts prédits | 24 / 97 cartes distinctes (24,7 %) | les upgrades tirent la précision vers le bas |
| Part des 130 ajouts de Nico prédite (rappel) | 24 / 130 (18,5 %) | limité par la taille de la liste et le catalogue |
| Sorties prédites, précision | 24 / 96 (25 %) | à comparer au hasard : 130/730 = 17,8 %, soit 1,4 fois mieux |
| Sorties prédites, rappel | 24 / 130 (18,5 %) | |
| Paire exacte (bonne carte, bon emplacement) | **1** (Baral → Bilbo) | |
| Bonne carte, et emplacement visé aussi coupé par Nico | 5 de plus | Screaming Nemesis, Theorist, Elspeth Storm Slayer, Icetill Explorer, Fantasticar |

### Les 24 prises

| Carte | Source | Tier IA | Emplacement proposé par l'IA | Carte réellement remplacée par Nico | Paire exacte |
|---|---|---|---|---|---|
| Stock Up | maybeboard | A | Frantic Search | Ancestral Vision | — |
| Screaming Nemesis | maybeboard | B+ | Rampaging Raptor | Death-Greeter's Champion | — |
| The Theorist, Jace Beleren | maybeboard | B+ | Tezzeret, Betrayer of Flesh | Jace, Wielder of Mysteries | — |
| Bilbo, Thief in the Night | maybeboard | B+ | Baral, Chief of Compliance | Baral, Chief of Compliance | ✅ |
| Guide of Souls | maybeboard | A+ | Soulfire Grand Master | Kytheon, Hero of Akros | — |
| Elspeth, Storm Slayer | maybeboard | A | The Eternal Wanderer | Elspeth, Knight-Errant | — |
| Traumatic Critique | maybeboard | B+ | Invert Polarity | Saheeli, Sublime Artificer | — |
| Icetill Explorer | maybeboard | A | Reclamation Sage | Beast Whisperer | — |
| Sage of the Skies | maybeboard | A | Loran of the Third Path | Force of Virtue | — |
| Ouroboroid | maybeboard | A | Ulvenwald Oddity | Verdurous Gearhulk | — |
| Scythecat Cub | maybeboard | A | Tireless Provisioner | Farseek | — |
| Vivi Ornitier | maybeboard | B+ | Goblin Electromancer | Expressive Iteration | — |
| Bristly Bill, Spine Sower | maybeboard | A- | Endurance (!) | Tough Cookie | — |
| Mole Man, Moloid Master | maybeboard | B+ | Sandstorm Salvager | Ramunap Excavator | — |
| Erode | maybeboard | B+ | Winds of Abandon | March of Otherworldly Light | — |
| Jennifer Walters | maybeboard | B+ | Flickerwisp | Selvala, Eager Trailblazer | — |
| Emeritus of Abundance | maybeboard | B+ | Eternal Witness | Surrak, the Hunt Caller | — |
| Kaito, Bane of Nightmares | maybeboard | B+ | Tezzeret, Agent of Bolas | Kaito Shizuki | — |
| Voice of Victory | maybeboard | B+ | Blade Splicer | Angel of Indemnity | — |
| Cori-Steel Cutter | maybeboard | A | (ajout pur) | Arc Trail | — |
| The Fantasticar | maybeboard | B+ | Reckoner Bankbuster | Filigree Familiar | — |
| The Echoverse Fulcrum | upgrade | B- | Crucible of Worlds | Reckoner Bankbuster | — |
| Cloak and Dagger, Entwined | upgrade | B+ | Lurrus of the Dream-Den | Vindicate | — |
| Aether Spellbomb | upgrade | B- | Soul-Guide Lantern | Mishra's Research Desk | — |

**Ce qu'on en retient** : l'IA trouve les bonnes nouveautés, mais les place mal. Nico remplace presque toujours **la carte « équivalente fonctionnelle »** : Elspeth par Elspeth, Kaito par Kaito, Ramunap par Mole Man, une rampe verte à 2 mana par une créature verte à 2 mana. L'IA, elle, vise la carte **qui a le score le plus bas** dans la couleur. Exemple : Bristly Bill pour remplacer Endurance.

---

## 3. Comparaison avec des baselines naïves

| Méthode | Cartes proposées | Bonnes | Précision | Rappel |
|---|---|---|---|---|
| **AJOUTS : MTGO Vintage absentes du cube** | 167 | 85 | **50,9 %** | **65,4 %** |
| AJOUTS : présentes dans MTGO et l'Archive, absentes du cube | 86 | 47 | 54,7 % | 36,2 % |
| AJOUTS : présentes dans MTGO ou l'Archive, absentes du cube | 250 | 91 | 36,4 % | 70,0 % |
| AJOUTS : Vintage Cube Archive absentes du cube | 169 | 53 | 31,4 % | 40,8 % |
| AJOUTS : **IA v5, maybeboard seule** | 50 | 21 | 42,0 % | 16,2 % |
| AJOUTS : **IA v5, maybeboard + upgrades** | 97 | 24 | 24,7 % | 18,5 % |
| SORTIES : cartes du cube absentes de MTGO **et** de l'Archive | 311 | 107 | 34,4 % | 82,3 % |
| SORTIES : cartes du cube absentes de MTGO **ou** de l'Archive | 405 | 121 | 29,9 % | 93,1 % |
| SORTIES : **IA v5** | 96 | 24 | 25,0 % | 18,5 % |

Pour un cube Vintage, **la présence dans le MTGO Vintage Cube actuel est de loin le meilleur indicateur** de ce qu'un propriétaire va ajouter. L'absence des cubes de référence est de même le meilleur indicateur de ce qu'il va couper. L'IA utilise ces listes seulement comme un petit bonus (`peer_benchmark`, environ 14 points de classement), alors qu'elles devraient être le premier critère pour trier les cartes, dans cette ligue de cube.

---

## 4. Évolution selon les versions du moteur

Chaque version historique de `cube-suggestions.json` (git) est rejouée contre la même vérité terrain.

| Commit | Date | Moteur | Maybeboard prise | Ajouts distincts pris | Sorties : précision |
|---|---|---|---|---|---|
| f1dc2c51 | 2026-09-18 | v1 (création) | 6 / 77 (7,8 %) | 6 / 77 | 52 / 220 (23,6 %) |
| 0b9c6930 → 9d2545da | 2026-09-20 → 10-25 | advisor@3 | 3 / 30 (10 %) | 4 / 66 | 43 / 178 (24,2 %) |
| 0c6ad93a / ba51a562 | 2026-10-28 | advisor@3 (tiers recalibrés) | 3 / 30 (10 %) | 4 / 67 | 44 / 174 (25,3 %) |
| **aa4222c3 (#112)** | 2026-11-07 | **advisor@4** : poste pour poste + cartes récentes des pairs | **17 / 30 (56,7 %)** | 25 / 100 | 25 / 98 (25,5 %) |
| 39434280 (#113) / a78cb658 (#115) | 2026-11-15/16 | advisor@5 : maybeboard dimensionnée | 21 / 50 (42 %) | 24 / 97 | 24 / 96 (25 %) |

Ce que montre l'historique :
- **L'import des cartes récentes des cubes pairs (#112) a été décisif** : la précision de la maybeboard est multipliée par 5,7.
- **Agrandir la maybeboard à 50 cartes (#113) a ajouté 4 prises pour 20 cartes**. Les cartes classées au-delà de la 30e place sont surtout du bruit.
- **La prédiction des sorties n'a jamais progressé** (23-25 % sur toutes les versions). C'est le point faible structurel du moteur.

---

## 5. Les faux positifs graves : des pièces maîtresses proposées à la coupe

Nico a gardé toutes ces cartes. Pour un joueur de cube Vintage, ces propositions décrédibilisent l'outil.

| Carte que l'IA veut retirer | Tier IA | Rôle dans `cube.json` | Proposée à la place |
|---|---|---|---|
| Show and Tell | F | **staple / key** | Deduce |
| Griselbrand | B | **staple / key** | Gurmag Angler |
| Displacer Kitten | F | **staple / key** | Victor Timely |
| Yawgmoth's Will | F | trap | Shallow Grave |
| Thassa's Oracle | D− | filler | Gran-Gran |
| Stoneforge Mystic | D+ | support | Nurturing Pixie |
| Imperial Recruiter | D | support | Weftstalker Ardent |
| Crucible of Worlds | F | support | The Echoverse Fulcrum |
| Armageddon | F | filler | Rally the Monastery |
| Mindslaver | D− | support | Coat of Arms |
| Goldspan Dragon | F | filler | Pinnacle Monk |
| Cryptic Command | D− | support | Swallowed by Leviathan |
| Lurrus of the Dream-Den | D− | support | Cloak and Dagger |

Deux causes se cumulent :
1. **Le moteur ignore `metaRole: key`.** Show and Tell, Griselbrand et Displacer Kitten sont marqués comme pièces clés dans le profil Tier 1, et sont quand même proposés à la coupe. C'est une règle simple à ajouter : ne jamais cibler une carte « key » d'un archétype, ni une pièce de combo.
2. **Les scores de puissance sont mal calibrés pour les cartes de combo et de moteur.** Le tier F de Yawgmoth's Will (« trap »), de Show and Tell ou de Goldspan Dragon vient de signaux pensés pour du Limité (Untapped, Elo), qui pénalisent les cartes étroites mais décisives. C'est un **problème de données Tier 1**, pas seulement de classement.

---

## 6. Recommandations IA non retenues mais défendables

Nico ne les a pas prises. À mon avis, plusieurs méritent quand même sa considération :

- **Galvanic Discharge** à la place de Galvanic Blast : nettement meilleur, et standard dans les cubes Vintage récents.
- **Giver of Runes** : meilleure qu'Intrepid Adversary et que Securitron Squadron (le choix de Nico).
- **Fell** à la place de Damn : un removal noir à 2 mana inconditionnel, alors que le noir en a perdu deux.
- **Lier, Disciple of the Drowned** : un bon choix pour le storm basé sur le cimetière qu'il renforce.
- **Flametongue Kavu** : un removal sur un corps, dans la logique de Nico (même si Glorybringer, la cible proposée, n'était pas le bon emplacement).

---

## 7. Ce que l'IA ne pouvait pas voir

| Catégorie | Cartes | Accessible à l'IA ? |
|---|---|---|
| Ajouts de Nico présents dans le catalogue DraftMaster | 83 / 130 | oui |
| Ajouts absents du catalogue | 47 / 130 | non : surtout Universes Beyond 2026, des légendaires d'or, et Flash, Lotus Petal et Mox Opal (classiques absents du catalogue) |
| Ajouts présents dans les cubes pairs relevés | 91 / 130 | oui, ils étaient en entrée |
| Sortis après la génération de l'IA (Star Trek, 13/11) | 2 (Salt Vampire, Nog) | non |

**Rappel atteignable** : parmi les 83 ajouts présents au catalogue, l'IA en a proposé 24 (29 %). La couverture du catalogue n'explique donc qu'une partie du manque. Le reste vient du classement.

---

## 8. Diagnostic et pistes pour la feature (par priorité)

1. **Ne jamais proposer de couper une pièce clé.** Exclure des cibles les cartes `metaRole ∈ {key}` et les pièces de combo listées dans `archetype-synergy-v1.json`. C'est le meilleur gain de crédibilité pour le moins d'effort.
2. **Faire du MTGO Vintage Cube le premier critère dans la ligue Vintage.** Une carte présente dans le cube de référence et absente du cube cible doit être fortement favorisée. Une carte du cube cible absente des deux références doit devenir candidate à la coupe. Les baselines montrent un gain de ×2 à ×3,5 en précision et en rappel.
3. **Choisir l'emplacement par équivalence fonctionnelle**, et non par score le plus bas. Même couleur (93 % des cas chez Nico), même coût à un près (76 %), même famille de carte, même nom ou même type de personnage quand c'est possible (Elspeth → Elspeth, Kaito → Kaito, Ugin → Ugin, Garruk → Garruk).
4. **Revenir à 30 cartes** de maybeboard, ou afficher deux niveaux : 30 recommandations, puis le reste « à explorer ».
5. **Recalibrer les tiers des cartes de combo et de moteur** dans le Tier 1 (Show and Tell, Yawgmoth's Will, Thassa's Oracle, Displacer Kitten, Goldspan Dragon…) avant toute nouvelle génération.
6. **Ajouter au catalogue** les classiques manquants (Flash, Lotus Petal, Mox Opal, Manifold Key, Ghost Vacuum…) et importer en continu les nouveautés des cubes pairs.
7. **Garder ce benchmark comme test de non-régression** : la mise à jour de Nico donne une vérité terrain indépendante, à rejouer sur chaque nouvelle version du moteur (les scripts sont dans `scripts/`).

---

## 9. Limites de ce benchmark

- Un seul propriétaire de cube, avec ses goûts (Universes Beyond, légendaires thématiques) : n = 1.
- Nico a vraisemblablement suivi le MTGO Vintage Cube. Les baselines « pairs » sont donc avantagées par construction. Elles restent la bonne référence pour **ce type de cube**, mais il faut le vérifier sur un autre cube (Cédric, Titou) avant d'en faire une règle générale.
- Une recommandation non prise n'est pas une erreur : la précision est une borne basse.
