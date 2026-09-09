# Analyse cartes / archétypes — Titou Tribal et Nico Candyshop

Date d'observation : 9 septembre 2026. Cette note est un audit et une proposition de modèle ; elle ne modifie ni les cartes, ni les cubes, ni les imports.

## Verdict

**[Confirmé]** Titou possède une architecture explicite et lisible : sept tribus plus un paquet de liants. Le texte du propriétaire, les tags CubeCobra et les cartes convergent. Son score de synergie peut donc partir d'une **densité linéaire** — corps/supports du bon sous-type, puis seigneurs/payoffs — avec des bonus de pont pour les changelins et les cartes multitribales.

**[Confirmé + inférence forte]** Nico contient bien Storm et artefacts, mais son fichier ne déclare que ces deux archétypes alors que sa propre liste contient aussi Reanimator, Sneak/Show, Twin/Kiki, Blink, Lands et Natural Order. Ces decks ne se mesurent pas par une simple somme de cartes « compatibles » : ils exigent des **familles de sous-rôles complémentaires**. Reanimator a besoin d'un outlet, d'un effet de réanimation et d'une cible ; Twin d'un enchanteur et d'une créature qui détape ; Storm de mana, de vélocité et d'un payoff.

**[Conclusion de scoring]** Une bombe ou un staple générique augmente la **Puissance**, jamais la **Synergie** sans lien mécanique démontré. Si une famille obligatoire manque, le score de Synergie de l'archétype doit être plafonné, même si le deck contient Black Lotus, Sol Ring ou plusieurs cartes de rang S.

## Sources, méthode et confiance

Sources primaires locales, par ordre d'autorité pour cette analyse :

1. les archives CubeCobra, qui portent la liste observée, le nom, le type, le texte Oracle, les identifiants et les tags : [Titou](../../data/cubes/titou_tribal/cubecobra-raw.json) et [Nico](../../data/cubes/nico_candyshop/cubecobra-raw.json) ;
2. les déclarations d'archétypes : [Titou, lignes 34–207](../../data/cubes/titou_tribal/cube-meta.json#L34-L207) et [Nico, lignes 25–84](../../data/cubes/nico_candyshop/cube-meta.json#L25-L84) ;
3. le catalogue dénormalisé [master-cards.json](../../data/cards/master-cards.json) et les documents de [data/cards/items](../../data/cards/items), utilisés pour constater les affectations actuelles, mais pas pour remplacer l'archive ;
4. l'[import Nico, lignes 94–207](../../scripts/import-nico-candyshop.mjs#L94-L207), utilisé pour expliquer les affectations générées.

Le comptage a été fait sur `cards.mainboard`. Une identité est distincte par `details.oracle_id`. Pour Titou, la densité tribale ci-dessous est l'union de deux signaux : tag CubeCobra exact et sous-type présent dans `details.type`. Les listes de cartes sont volontairement substantielles mais non exhaustives : au moins trois clés et un support par archétype, sélectionnés pour montrer les sous-rôles nécessaires.

Niveaux de confiance :

- **A — confirmé** : déclaration du propriétaire/tag explicite ou relation inscrite directement dans le texte Oracle ;
- **B — inférence forte** : toutes les familles indispensables d'un deck connu sont présentes, sans déclaration d'archétype complète ;
- **C — proposition de shell** : densité et recouvrements plausibles, mais intention du propriétaire ou redondance encore à valider ;
- **D — signal isolé** : micro-combo ou quelques cartes, insuffisant pour annoncer un archétype draftable.

Les justifications de cartes sont des lectures fonctionnelles de leur texte Oracle, pas des statistiques de victoire. Aucun accès web n'a été nécessaire.

## Inventaire quantitatif

| Mesure                                              | Titou Tribal | Nico Candyshop |
| --------------------------------------------------- | -----------: | -------------: |
| Entrées `mainboard` de l'archive                    |          545 |            730 |
| Identités Oracle uniques dans l'archive             |          542 |            730 |
| `cardCount` déclaré dans `cube-meta.json`           |          545 |            730 |
| Entrées `cardIndex` / membres du catalogue          |    541 / 541 |      733 / 733 |
| Archétypes déclarés                                 |            8 |              2 |
| Clés / supports déclarés                            |      33 / 26 |          5 / 2 |
| Clés / supports dont l'Oracle ID est dans l'archive |      33 / 22 |          0 / 1 |
| Cartes sans archétype dans `master-cards`           |          526 |              2 |

Les 545 entrées de Titou représentent 542 identités car Steam Vents, Verdant Catacombs et Arid Mesa sont chacun présents deux fois. Ce n'est pas une disparition de trois cartes. La différence archive/catalogue doit néanmoins être réconciliée par identité, impression et multiplicité.

### Densité observable de Titou

| Famille        | Tag explicite | Sous-type | Union tag/sous-type | Lecture                                                           |
| -------------- | ------------: | --------: | ------------------: | ----------------------------------------------------------------- |
| Humains        |            20 |        73 |                  73 | très profonde, mais beaucoup d'humains sont des cartes génériques |
| Gobelins       |            17 |        31 |                  33 | noyau aggro et plusieurs supports non-créature                    |
| Dragons        |            11 |        26 |                  29 | cibles + accélérateurs/payoffs tagués                             |
| Elfes          |            10 |        29 |                  29 | forte densité de corps et mana                                    |
| Vampires       |             6 |        25 |                  25 | le sous-type est dense, le plan aristocrates l'est moins          |
| Anges          |             9 |        22 |                  23 | densité plus chère, soutenue par le lifegain                      |
| Loups/garous   |             6 |        23 |                  24 | peu taguée, mais renforcée par les sous-types                     |
| Liants `multi` |            16 |         — |                  16 | changelins, copies et terrains transversaux                       |

### Affectations observées dans le catalogue

**Titou :** 526 cartes sans affectation, 6 affectées à Humains et 9 à Anges. Les six autres archétypes déclarés n'ont aucune carte affectée. Le modèle actuel ne peut donc pas évaluer les decks tribaux à partir de `cubeAnalyses.archetypes`.

**Nico :** 132 cartes seulement Storm, 168 seulement artefacts, 56 dans les deux, 375 dans `nico:vintage_staple`, et 2 sans affectation. `nico:vintage_staple` n'est pas déclaré dans `cube-meta.json`. Les 375 cartes ne sont pas 375 cartes synergiques : c'est le fallback de l'import quand ses deux recherches de mots ne trouvent rien ([lignes 153–176](../../scripts/import-nico-candyshop.mjs#L153-L176)).

## Titou Tribal — archétypes réels

Les huit entrées sont **A — confirmées** par la description CubeCobra du propriétaire et par `cube-meta.json`. Les cartes ci-dessous sont présentes dans l'archive, sauf anomalies explicitement isolées plus bas.

### Gobelins Rakdos — aggro, go-wide, burn

| Statut  | Carte                 | Sous-rôle        | Justification                                                    |
| ------- | --------------------- | ---------------- | ---------------------------------------------------------------- |
| clé     | Muxus, Goblin Grandee | payoff / enabler | transforme une forte densité de gobelins en déploiement explosif |
| clé     | Goblin Rabblemaster   | body / enabler   | fournit immédiatement puis continuellement des corps             |
| clé     | Goblin Grenade        | payoff           | convertit un gobelin en dégâts de clôture                        |
| support | Goblin Matron         | enabler          | cherche le payoff ou le corps précis manquant                    |
| support | Sling-Gang Lieutenant | bridge / payoff  | apporte plusieurs corps et convertit le board en drain           |

Le deck demande deux familles : densité de gobelins et payoffs qui récompensent cette densité. Une Grenade seule n'est pas une synergie si le deck n'a pas de corps sacrifiables.

### Vampires Mardu — midrange, sacrifice, drain

| Statut  | Carte                      | Sous-rôle        | Justification                                        |
| ------- | -------------------------- | ---------------- | ---------------------------------------------------- |
| clé     | Sorin, Imperious Bloodlord | enabler / payoff | récompense et met en jeu les vampires                |
| clé     | Kalitas, Traitor of Ghet   | payoff / body    | transforme les morts adverses en présence et menace  |
| clé     | Olivia Voldaren            | payoff / body    | contrôle le board tout en restant une menace tribale |
| support | Immersturm Predator        | bridge / body    | relie sacrifice, cimetière et menace volante         |
| support | Bloodtithe Harvester       | enabler / body   | fournit matière, interaction et sous-type            |

Le nom « Aristocrates & Drain » est plus ambitieux que la seule densité de vampires. Il faut distinguer corps, fodder, outlet et payoff de mort/drain ; sans outlet ou payoff, le deck est seulement Vampire midrange.

### Elfes Golgari — ramp et swarm

| Statut  | Carte                  | Sous-rôle        | Justification                                         |
| ------- | ---------------------- | ---------------- | ----------------------------------------------------- |
| clé     | Elvish Archdruid       | enabler / payoff | produit du mana selon la densité et renforce la tribu |
| clé     | Ezuri, Renegade Leader | payoff           | convertit mana et largeur de board en fin de partie   |
| clé     | Elvish Warmaster       | enabler / payoff | crée des corps et offre une sortie de mana            |
| support | Llanowar Elves         | body / enabler   | corps typé et accélérateur tour 1                     |
| support | Reclamation Sage       | body / bridge    | interaction jouable qui conserve le sous-type         |

Ici la densité linéaire fonctionne particulièrement bien : les dorks sont simultanément corps, mana et carburant des payoffs.

### Loups et garous Gruul — midrange / transformation

| Statut  | Carte                   | Sous-rôle        | Justification                                         |
| ------- | ----------------------- | ---------------- | ----------------------------------------------------- |
| clé     | Tovolar, Dire Overlord  | enabler / payoff | récompense les attaques et pilote jour/nuit           |
| clé     | Immerwolf               | payoff / body    | lord et stabilisateur des transformations             |
| clé     | Huntmaster of the Fells | body / payoff    | valeur à chaque transformation et contrôle du board   |
| support | Mayor of Avabruck       | body / payoff    | lord humain puis moteur de loups                      |
| support | Arlinn Kord             | bridge / enabler | produit/renforce des corps et soutient le plan combat |

C'est l'un des signaux curatoriaux les moins explicites (6 tags), malgré 24 cartes dans l'union tags/sous-types. Le plan doit bénéficier des vrais ponts, mais pas de toute créature verte ou rouge générique.

### Anges / Clercs — lifegain et midrange volant

| Statut  | Carte              | Sous-rôle        | Justification                                          |
| ------- | ------------------ | ---------------- | ------------------------------------------------------ |
| clé     | Righteous Valkyrie | payoff / body    | lie densité Clerc/Ange, gain de vie et boost collectif |
| clé     | Lyra Dawnbringer   | payoff / body    | lord et stabilisation par lien de vie                  |
| clé     | Errant and Giada   | bridge / enabler | facilite le jeu des menaces volantes depuis le dessus  |
| support | Youthful Valkyrie  | body / payoff    | corps tôt qui grossit avec les anges suivants          |
| support | Soul Warden        | enabler          | active les seuils de points de vie à faible coût       |

Avacyn, Angel of Hope est une puissante cible finale, mais apporte moins de synergie marginale qu'un payoff de densité. Restoration Angel est plutôt un pont Ange/Blink qu'un lord.

### Dragons Temur / cinq couleurs — ramp et grosses menaces

| Statut  | Carte                 | Sous-rôle        | Justification                                              |
| ------- | --------------------- | ---------------- | ---------------------------------------------------------- |
| clé     | Tiamat                | payoff / enabler | récompense cinq couleurs en rechargeant la main de dragons |
| clé     | Miirym, Sentinel Wyrm | payoff           | multiplie chaque dragon joué ensuite                       |
| clé     | Dragon Tempest        | enabler / payoff | accélère les attaques et convertit les arrivées en dégâts  |
| support | Dragonlord Atarka     | body / payoff    | cible de ramp qui stabilise immédiatement le board         |
| support | Dragon's Hoard        | fixer / bridge   | fixe, accélère et devient pioche dans le bon deck          |
| support | Sarkhan, Fireblood    | enabler / fixer  | filtre la main et accélère spécifiquement les dragons      |

Les gros dragons génériques comptent comme cibles/corps ; ils ne remplacent ni le fixing, ni l'accélération, ni les payoffs.

### Humains blanc / Selesnya — aggro et compteurs

| Statut  | Carte                       | Sous-rôle        | Justification                                              |
| ------- | --------------------------- | ---------------- | ---------------------------------------------------------- |
| clé     | Champion of the Parish      | payoff / body    | grossit avec chaque autre humain                           |
| clé     | Thalia's Lieutenant         | payoff / body    | renforce le board et grandit avec les humains suivants     |
| clé     | Adeline, Resplendent Cathar | enabler / payoff | produit des attaquants et récompense la largeur du board   |
| support | Thalia, Guardian of Thraben | body / bridge    | pression typée et disruption contre les decks non-créature |
| support | Mother of Runes             | body / enabler   | protège les payoffs tout en conservant le sous-type        |

Les 73 humains de type ne valent pas automatiquement 73 supports : Snapcaster Mage ou Nekrataal portent le type mais ne servent pas nécessairement le plan aggro. Il faut une affinité de rôle, pas seulement le sous-type.

### Liant universel — infrastructure, pas deck autonome

| Statut  | Carte              | Sous-rôle        | Justification                                                     |
| ------- | ------------------ | ---------------- | ----------------------------------------------------------------- |
| clé     | Mirror Entity      | bridge / payoff  | appartient à toutes les tribus et transforme le board en finisher |
| clé     | Realmwalker        | bridge / enabler | choisit une tribu puis fournit de la vélocité                     |
| clé     | Maskwood Nexus     | bridge / enabler | donne tous les types et produit des corps                         |
| support | Metallic Mimic     | bridge / payoff  | corps adaptable et payoff de compteurs                            |
| support | Adaptive Automaton | bridge / payoff  | lord générique choisi à l'arrivée                                 |
| support | Cavern of Souls    | fixer / bridge   | fixe la tribu choisie et sécurise ses sorts                       |

Le liant ne doit pas recevoir un score d'archétype autonome. Il contribue uniquement à l'archétype effectivement choisi par le deck.

## Nico Candyshop — archétypes confirmés et proposés

### Storm Izzet/Grixis — A, déclaré mais mal référencé

| Statut  | Carte                          | Sous-rôle              | Justification                                         |
| ------- | ------------------------------ | ---------------------- | ----------------------------------------------------- |
| clé     | Underworld Breach              | combo piece / velocity | rejoue les ressources du cimetière et boucle avec LED |
| clé     | Lion's Eye Diamond             | combo piece / mana     | fournit le mana explosif et alimente le cimetière     |
| clé     | Brain Freeze                   | payoff / combo piece   | payoff Storm et composant de la boucle Breach         |
| support | Dark Ritual / Cabal Ritual     | mana                   | densité de mana positif pour le tour de combo         |
| support | Wheel of Fortune / Timetwister | velocity               | renouvelle la main et augmente le nombre de sorts     |
| support | Tendrils of Agony              | payoff                 | seconde condition de victoire Storm                   |

Familles obligatoires : **mana + velocity + payoff**. Bolas's Citadel ou Yawgmoth's Will peuvent faire pont, mais aucun staple isolé ne remplit les trois familles.

### Artefacts / Tinker — A, déclaré mais trop large dans le catalogue

| Statut  | Carte                                  | Sous-rôle             | Justification                                       |
| ------- | -------------------------------------- | --------------------- | --------------------------------------------------- |
| clé     | Tinker                                 | enabler / combo piece | transforme un artefact sacrifiable en cible majeure |
| clé     | Urza, Lord High Artificer              | payoff / mana         | convertit les artefacts en mana et menace           |
| clé     | Tolarian Academy                       | payoff / mana         | récompense directement la densité d'artefacts       |
| support | Sol Ring / Mana Vault                  | mana / enabler        | accélération et fodder éventuel pour Tinker         |
| support | Blightsteel Colossus / Bolas's Citadel | payoff / body         | cibles de cheat, pas accélérateurs                  |
| support | Goblin Welder / Goblin Engineer        | enabler / bridge      | recursion et échange d'artefacts entre zones        |

Familles : **fodder + enabler/ramp + cible/payoff**. La recherche actuelle du mot `artifact` classe 224 cartes dans le paquet, y compris des réponses adverses ; « mentionne artefact » n'est pas « soutient artefacts ».

### Reanimator — A pour la présence, B pour l'intention détaillée

| Statut  | Carte                           | Sous-rôle         | Justification                                              |
| ------- | ------------------------------- | ----------------- | ---------------------------------------------------------- |
| clé     | Entomb                          | enabler / outlet  | place la cible exacte au cimetière                         |
| clé     | Reanimate / Animate Dead        | combo piece       | remet une créature en jeu à très bas coût                  |
| clé     | Griselbrand / Archon of Cruelty | body / payoff     | cibles dont l'arrivée ou l'activation rembourse le montage |
| support | Faithless Looting               | outlet / velocity | sélectionne et défausse les cibles                         |
| support | Exhume / Necromancy             | combo piece       | redondance indispensable des effets de réanimation         |

Familles obligatoires : **outlet + effet de réanimation + cible**. C'est le meilleur exemple où compter six « cartes Reanimator » sans distinguer les rôles peut surévaluer un deck injouable.

### Sneak/Show — B, paquet complet proposé

| Statut  | Carte                               | Sous-rôle             | Justification                                          |
| ------- | ----------------------------------- | --------------------- | ------------------------------------------------------ |
| clé     | Show and Tell                       | enabler / combo piece | contourne le coût d'une cible en main                  |
| clé     | Sneak Attack                        | enabler / combo piece | transforme les grosses créatures en menaces immédiates |
| clé     | Emrakul, the Aeons Torn             | body / payoff         | cible à impact létal                                   |
| support | Through the Breach                  | combo piece           | redondance instantanée de Sneak Attack                 |
| support | Atraxa, Grand Unifier / Griselbrand | body / bridge         | cibles partagées avec Reanimator                       |

Familles : **enabler + cible**. Les cibles partagées sont des bridges réels, mais ne rendent pas un deck cohérent sans au moins deux enablers.

### Twin / Kiki — B, combo explicite proposée

| Statut  | Carte                                  | Sous-rôle             | Justification                                           |
| ------- | -------------------------------------- | --------------------- | ------------------------------------------------------- |
| clé     | Splinter Twin                          | combo piece           | enchanteur qui copie une créature capable de se détaper |
| clé     | Pestermite                             | combo piece / body    | détape le permanent qui le copie                        |
| clé     | Deceiver Exarch                        | combo piece / body    | seconde créature de détapage                            |
| support | Kiki-Jiki, Mirror Breaker              | combo piece / enabler | seconde moitié « enchanteur » sous forme de créature    |
| support | Restoration Angel / Zealous Conscripts | bridge / combo piece  | partenaires de Kiki et cartes ETB jouables hors combo   |

Familles obligatoires : **copieur/enchanteur + créature de détapage**. Restoration Angel appartient ici et à Blink ; la déclarer support de Storm est factuellement incohérent avec son texte.

### Blink / valeur ETB — A comme mécanique déclarée, B comme archétype

| Statut  | Carte                    | Sous-rôle             | Justification                                         |
| ------- | ------------------------ | --------------------- | ----------------------------------------------------- |
| clé     | Ephemerate               | enabler / combo piece | répète à bas coût une capacité d'arrivée              |
| clé     | Soulherder               | enabler / payoff      | blink récurrent et croissance avec les exils          |
| clé     | Flickerwisp              | body / enabler        | effet de blink attaché à un corps                     |
| support | Restoration Angel        | bridge / enabler      | blink instantané, également pièce Kiki                |
| support | Solitude / Palace Jailer | payoff / interaction  | ETB à forte valeur qui justifient le blink            |
| support | Recruiter of the Guard   | enabler / bridge      | trouve plusieurs corps utilitaires ou pièces de combo |

Familles : **effet de blink + cible ETB**. Un Ephemerate sans cible n'a presque pas de synergie ; une bonne créature ETB seule reste surtout de la puissance/valeur.

### Lands / ressources — B pour les micro-combos, C comme deck unifié

| Statut  | Carte                          | Sous-rôle             | Justification                                             |
| ------- | ------------------------------ | --------------------- | --------------------------------------------------------- |
| clé     | Fastbond                       | enabler / combo piece | permet de convertir les terrains supplémentaires en tempo |
| clé     | Crucible of Worlds             | enabler / bridge      | rejoue les terrains sacrifiés ou défaussés                |
| clé     | Dark Depths + Thespian's Stage | combo piece / payoff  | paire autonome qui crée une menace majeure                |
| support | Strip Mine                     | payoff / interaction  | devient répétable avec Crucible/Ramunap                   |
| support | Ramunap Excavator              | body / enabler        | redondance de Crucible attachée à une créature            |
| support | Zuran Orb                      | outlet / bridge       | sacrifie les terrains et interagit avec Fastbond/Crucible |

Deux sous-paquets sont confirmés, mais leur réunion en un seul deck demande validation par drafts : récursion de terrains et Depths/Stage ne partagent pas tous leurs supports.

### Green ramp / Natural Order — B, paquet complet proposé

| Statut  | Carte                                | Sous-rôle             | Justification                                          |
| ------- | ------------------------------------ | --------------------- | ------------------------------------------------------ |
| clé     | Natural Order                        | enabler / combo piece | convertit un petit corps vert en cible majeure         |
| clé     | Channel                              | enabler / mana        | produit le saut de mana le plus brutal du paquet       |
| clé     | Craterhoof Behemoth / Primeval Titan | payoff / body         | cibles qui récompensent respectivement largeur ou ramp |
| support | Gaea's Cradle                        | payoff / mana         | convertit la densité de créatures en mana              |
| support | Llanowar Elves / Elvish Mystic       | body / enabler        | accélération, fodder de Natural Order et bridge        |

Familles : **accélération/fodder + enabler + cible**. Channel plus une main de cartes chères n'est pas la même structure que Natural Order ; les deux sous-plans doivent être visibles.

### UR tempo / spells — C, shell proposé

| Statut  | Carte                    | Sous-rôle         | Justification                                         |
| ------- | ------------------------ | ----------------- | ----------------------------------------------------- |
| clé     | Ledger Shredder          | body / payoff     | récompense les tours à plusieurs sorts et filtre      |
| clé     | Young Pyromancer         | payoff / body     | transforme les éphémères/rituels en présence          |
| clé     | Snapcaster Mage          | bridge / velocity | réutilise l'interaction et garde un corps             |
| support | Force of Will / Daze     | interaction       | protège le tempo sans monopoliser le mana             |
| support | Ragavan, Nimble Pilferer | body / enabler    | pression et mana, sans être lui-même un payoff spells |

Ce shell est cohérent, mais il ne faut pas confondre « bonnes cartes bleues » et synergie spells. Force of Will contribue surtout à Interaction ; Ragavan surtout à Puissance/Tempo.

### White aggro / Stoneforge — C, shell proposé

| Statut  | Carte                               | Sous-rôle            | Justification                                        |
| ------- | ----------------------------------- | -------------------- | ---------------------------------------------------- |
| clé     | Stoneforge Mystic                   | enabler / payoff     | cherche et met en jeu le paquet équipement           |
| clé     | Adeline, Resplendent Cathar         | payoff / body        | menace proactive qui élargit le board                |
| clé     | Esper Sentinel                      | body / velocity      | pression précoce et avantage de cartes conditionnel  |
| support | Batterskull / Umezawa's Jitte       | payoff / combo piece | cibles de Stoneforge et récompenses du plan créature |
| support | Mother of Runes / Elite Spellbinder | body / interaction   | protège ou ralentit tout en maintenant la pression   |

Familles : **densité proactive + disruption bon marché**, avec sous-paquet **tuteur + équipement**. Les équipements seuls ne prouvent pas un deck white aggro.

### Signaux à ne pas promouvoir sans preuve supplémentaire

- **D — sacrifice noir/rouge :** Goblin Bombardment, Yawgmoth, Ophiomancer et Recurring Nightmare sont de vrais signaux, mais la liste testée ne contient pas Blood Artist, Carrion Feeder, Gravecrawler, Mayhem Devil, Zulaport Cutthroat ou Viscera Seer. Le paquet manque de redondance claire en outlets et payoffs de mort.
- **D — Devoted Druid :** Devoted Druid, Vizier of Remedies et Walking Ballista forment un micro-paquet plausible. Trois cartes dans 730 ne suffisent pas à garantir un archétype draftable sans tuteurs/densité explicitement mesurés.
- **Thassa's Oracle** est présente, mais ni Demonic Consultation ni Doomsday n'ont été retrouvés dans l'archive ; elle ne doit pas créer artificiellement un archétype Oracle combo.

## Anomalies factuelles à corriger avant toute automatisation

### 1. Six faux Oracle IDs dans `cube-meta` Nico

Les six identifiants déclarés ne sont pas ceux de l'archive CubeCobra. Ils résolvent aujourd'hui vers des documents historiques du catalogue, sans `scryfallId`, ce qui masque l'erreur.

| Carte                     | ID déclaré/catalogue                   | Oracle ID dans l'archive               |
| ------------------------- | -------------------------------------- | -------------------------------------- |
| Brain Freeze              | `3d76e3cc-a9e9-4e78-be7f-a63e26bb5b3c` | `464c0150-3dbc-403b-9ada-fef25ab1f29d` |
| Underworld Breach         | `018595a8-ef01-4475-8025-a1c1d81b94e3` | `27e0948b-9916-473b-8d8c-a51bdfbc7457` |
| Lion's Eye Diamond        | `006d9972-e1c0-4f51-b844-0b1d3ef1ec7b` | `ee6099b0-fb1f-42f1-b862-7708c6e36d05` |
| Tinker                    | `b3208538-8924-4ab2-b258-29ceeead2a99` | `254878f0-be90-4653-a395-0c41258fceaf` |
| Urza, Lord High Artificer | `44444444-5555-4666-8777-888888888888` | `e87906d2-db1a-4e19-b910-adb4eb339945` |
| Sol Ring                  | `99999999-aaaa-4bbb-8ccc-dddddddddddd` | `6ad8011d-3471-4369-9d68-b264cc027487` |

Cause probable confirmée dans le code : l'import indexe d'abord les fichiers existants par Oracle ID, mais retombe ensuite sur le chemin dérivé du slug et, si le fichier existe, ne met à jour que l'analyse Nico sans corriger l'identité ([lignes 22–33, 98–107 et 209–218](../../scripts/import-nico-candyshop.mjs#L22-L33)).

### 2. Restoration Angel n'est pas un support Storm

`cube-meta.json` la place comme unique support de Storm. Son texte Oracle fait blink d'une créature non-Ange ; elle est un enabler Blink et une pièce/bridge Kiki-Jiki. Le catalogue généré la place d'ailleurs dans le fallback `nico:vintage_staple`, pas dans Storm. Les deux représentations se contredisent.

### 3. `nico:vintage_staple` est un surtag, pas un archétype

L'import ajoute Storm si le texte contient `storm`, `add ` ou `instant or sorcery`, artefacts si le type/texte contient `artifact` ou `tinker`, puis `vintage_staple` à tout le reste. Résultat : 375 cartes génériques deviennent membres d'un identifiant absent de la déclaration. De plus, `add ` fait entrer de nombreuses cartes de mana dans Storm, et `artifact` fait entrer les anti-artefacts dans le plan artefacts. Ce sont des heuristiques lexicales à faible précision, pas des rôles de deck.

### 4. Quatre supports Titou sont absents de l'archive Titou

| Archétype    | Support déclaré absent | Présence observée                 |
| ------------ | ---------------------- | --------------------------------- |
| Loups/garous | Outland Liberator      | catalogue/Nico, pas archive Titou |
| Dragons      | Goldspan Dragon        | catalogue/Nico, pas archive Titou |
| Humains      | Esper Sentinel         | catalogue/Nico, pas archive Titou |
| Humains      | Ranger-Captain of Eos  | catalogue/Nico, pas archive Titou |

Les 33 clés Titou sont toutes présentes ; 22 des 26 supports seulement le sont. Ces quatre références doivent être soit retirées/remplacées, soit ajoutées explicitement à la source du cube — jamais « réparées » silencieusement dans un artefact généré.

## Modèle versionné proposé

Séparer la vérité de carte, la présence dans un snapshot et l'interprétation de synergie :

```text
CardIdentity (oracleId, faces, oracleText)
  -> CubePrintingMembership (cubeKey, snapshotId, entryId, oracleId, multiplicity, tags)
  -> ArchetypeDefinition@version (families obligatoires, cibles, seuils)
  -> CardArchetypeRole@version (archetypeId, oracleId, role, strength, evidence, confidence)
  -> DeckArchetypeEvaluation@version (coverage par famille, bridges, caps, explication)
```

Champs minimaux d'une affectation :

- `modelVersion`, `cubeSnapshotId`, `archetypeId`, `oracleId` ;
- `role`: `payoff | enabler | body | bridge | fixer | combo_piece | outlet | target | mana | velocity | interaction` ;
- `strength`: `key | support | incidental` ;
- `evidence`: `owner_tag | owner_description | oracle_rule | curated_inference` avec pointeur vers la source ;
- `confidence`: A/B/C/D et une justification courte ;
- `requiredFamily`, quand la carte remplit une famille obligatoire.

### Calcul de Synergie et caps

1. **Titou, modèle linéaire plafonné.** Mesurer séparément densité de corps/supports typés, nombre de payoffs/lords et qualité des bridges. Par défaut à calibrer sur des decks réels : cible de 12 corps/bridges et 2 payoffs dans 40 cartes. Si aucun payoff : cap de Synergie à 45/100 ; si la densité minimale propre à la tribu n'est pas atteinte : cap à 55/100. Le seuil exact appartient à `ArchetypeDefinition@version`, pas au code générique.
2. **Nico, modèle par couverture de familles.** Le score brut combine qualité et redondance à l'intérieur de chaque famille, puis applique `coverage = min(familyScores)` : la famille la plus faible borne le plan. Une famille obligatoire absente plafonne à 45/100 ; deux familles absentes à 25/100. Une seule copie d'une famille critique réduit aussi le plafond selon sa redondance/tuteurs.
3. **Bridges.** Une carte peut contribuer à deux plans seulement avec deux relations explicites : Restoration Angel à Blink et Kiki, Griselbrand à Reanimator et Sneak/Show, Llanowar Elves à Elves et Natural Order. Le bonus est attribué après choix du deck, pas globalement.
4. **Staples/bombes.** `generic_staple` est un tag de puissance/flexibilité, jamais un archétype et jamais un apport positif à Synergie. Interaction, mana et fixing ne contribuent à une synergie que lorsqu'ils remplissent une famille définie du plan.

## QA et règle d'exhaustivité future

### Gates bloquants à ajouter

- chaque `archetypeId` affecté à une carte existe dans le `cube-meta` versionné ;
- chaque Oracle ID clé/support/role appartient au snapshot actif, sauf `status: proposed_addition` explicite ;
- l'identité `oracleId + name` du catalogue correspond à l'archive canonique ; aucun placeholder UUID ne passe sur sa seule forme ;
- aucune carte absente du snapshot ne compte dans le score d'un deck ;
- tout archétype combo déclare ses familles obligatoires et au moins un test de deck incomplet vérifie le cap ;
- `generic_staple` ne modifie jamais l'axe Synergie ;
- les tags dérivés d'un texte sont conservés comme suggestions à revoir, pas promus automatiquement en vérité.

### Matrice minimale de tests

- Titou : pour chacune des sept tribus, un deck dense avec payoffs score plus haut qu'un deck de mêmes couleurs rempli de bombes ; retirer tous les lords/payoffs déclenche le cap ; le liant améliore seulement une tribu réellement représentée.
- Nico : trois fixtures Reanimator auxquelles manque successivement outlet, réanimation ou cible ; deux fixtures Twin auxquelles manque une moitié ; trois fixtures Storm auxquelles manque mana, velocity ou payoff ; un deck Power Nine sans package doit avoir Puissance haute et Synergie basse.
- Tests de bridges : Restoration Angel compte dans Blink, compte dans Kiki si Kiki est présent, et ne compte jamais dans Storm ; Griselbrand ne double pas artificiellement sa valeur quand deux archétypes sont détectés.

### Passage à l'exhaustif

La prochaine itération ne doit pas demander une rédaction manuelle de 1 275 lignes. Elle doit :

1. importer toutes les identités du snapshot ;
2. générer des **candidats** par sous-type, tags propriétaire et règles Oracle déterministes ;
3. produire une file de revue par archétype, triée par confiance et sous-rôle manquant ;
4. faire valider humainement les `key`, `support`, `incidental` et les bridges ;
5. figer le résultat dans un artefact versionné avec couverture attendue de 100 % : chaque carte est soit affectée avec preuve, soit explicitement `generic/unassigned` ;
6. rejouer les fixtures de decks et comparer les scores à la version précédente avant activation.

## Limites

- Cette analyse confirme les cartes et relations présentes, pas la fréquence à laquelle ces decks sont réellement draftés ni leur taux de victoire.
- Les seuils numériques proposés sont des garde-fous initiaux à calibrer sur des decks humains et simulations ; ils ne sont pas des résultats empiriques.
- L'archive Nico n'a ni description d'archétypes ni tags fonctionnels riches (`french` et `proxy` dominent). Les archétypes non déclarés sont donc des inférences de composition, même quand les combos sont textuellement certains.
- Les cartes multirôles rendent les effectifs bruts non additifs. Une carte bridge ne doit pas être comptée deux fois dans le score total du deck.
- Les noms « archetype » et « shell » sont distingués ici : un combo complet peut être certain au niveau des cartes, mais sa draftabilité dépend de la redondance, des tuteurs et de la taille effective des packs.
