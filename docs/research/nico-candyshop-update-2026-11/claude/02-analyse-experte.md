# La mise à jour 2024 → 2026 du cube de Nico : analyse experte

Cube : **Fedor's candyshop IRL** (CubeCobra `1nxrs`), cube Vintage powered de 730 cartes, joué en papier.
Base de comparaison : la liste du 11 décembre 2024, dernière modification avant la session.
Session : 17 novembre 2026, 20:14 → 18 novembre 2026, 10:31 (UTC), 45 versions de changelog.
Le détail carte par carte est dans [01-journal-complet-des-changements.md](01-journal-complet-des-changements.md).

---

## En bref

- **130 cartes changent sur 730 (18 %)**, presque toutes en échange direct (même couleur dans 93 % des cas). Le noyau du cube ne bouge pas : Power 9, fast mana, Force of Will, Show and Tell, Sneak Attack, Tinker, Oath, Twin et Kiki-Jiki, Dark Depths, Natural Order, Yawgmoth's Will, Breach.
- **Nico s'est surtout aligné sur le MTGO Vintage Cube.** 85 des 130 cartes ajoutées sont dans la liste MTGO Vintage que DraftMaster avait relevée le 7 novembre. 6 autres sont dans le Vintage Cube Archive. Les 39 restantes sont des choix personnels, presque tous des légendaires Universes Beyond (Marvel, Tortues Ninja, Le Hobbit, Star Trek, Final Fantasy, Fallout) dans les couleurs et l'or.
- **C'est une mise à jour récente** : 92 des cartes ajoutées sont sorties en 2025 ou 2026. Le set le plus représenté est Reality Fracture (15 cartes, sorti en octobre 2026). Deux cartes Star Trek sont sorties 5 jours avant la mise à jour.
- **La courbe baisse.** Les cartes ajoutées coûtent en moyenne 2,95 mana, contre 3,46 pour les cartes retirées. Les sorts à 7 mana ou plus passent de 33 à 27 : les Eldrazi, Karn Liberated, Inferno Titan et Terastodon sortent.
- **Les petites créatures prennent le pas sur les sorts « fair ».** On passe de 328 à 337 créatures, de 36 à 32 planeswalkers. Les cartes à marqueurs +1/+1 passent de 41 à 55.
- **Le blanc reçoit enfin de vrais outils contre le combo et le fast mana** : Voice of Victory, Jennifer Walters, Spider-Woman et Clarion Conqueror. C'est l'idée la plus forte de la mise à jour.
- **Le principal risque est la perte de removal bon marché.** Infernal Grasp, Heartless Act, Flame Slash, Searing Spear, Arc Trail, Vindicate, Assassin's Trophy et Pernicious Deed sortent. Les remplaçants sont plus lents, plus conditionnels, ou ne sont pas du removal du tout.

---

## 1. Les chiffres

| Indicateur | Avant (déc. 2024) | Après (nov. 2026) | Lecture |
|---|---|---|---|
| Cartes | 730 | 730 | taille conservée |
| Blanc / Bleu / Noir / Rouge / Vert | 89 / 94 / 92 / 87 / 86 | 86 / 96 / 90 / 87 / 87 | équilibre conservé, le blanc perd 3 cartes |
| Multicolore / Incolore / Terrains | 113 / 75 / 94 | 115 / 72 / 97 | +3 terrains (Abandoned Air Temple, Starting Town, Multiversal Passage) |
| CMC moyen hors terrains | 3,07 | 2,98 | courbe plus basse |
| Créatures | 328 | 337 | plus de corps |
| Planeswalkers | 36 | 32 | moins de walkers « fair » à 4-6 mana |
| Artefacts | 133 | 128 | moins de gros artefacts, plus de petits |
| Cartes à marqueurs +1/+1 | 41 | 55 | un axe « marqueurs » émerge en vert-blanc |
| Cartes à 7 mana ou plus | 33 | 27 | moins de gros sorts à lancer à la main |
| Premières impressions en 2025-2026 | 0 | 92 | renouvellement massif |
| Elo CubeCobra moyen | 1 403 | 1 413 | légère hausse (à prendre avec prudence, voir plus bas) |
| Removal (détection heuristique) | 128 | 125 | quantité stable, mais plus lent |
| Contre-sorts | 20 | 21 | stable |
| Pièces de « hate » (taxe, entre engagé, pas de sorts) | 8 | 10 | hausse |

> **Sur l'Elo.** Les cartes entrées ont un Elo moyen de 1 362, contre 1 306 pour les cartes sorties. Mais elles sont présentes dans 5 700 cubes en moyenne, contre 15 100 pour les sorties : l'Elo des cartes 2026 repose sur peu de drafts. Les heuristiques de removal et de « hate » viennent d'une recherche par expressions régulières dans le texte oracle : elles donnent des ordres de grandeur, pas un comptage expert.

---

## 2. La logique d'ensemble : sept principes

### 2.1 Suivre la référence, puis personnaliser
Les 130 entrées se répartissent ainsi :

| Source probable | Cartes |
|---|---|
| Dans les deux listes (MTGO Vintage et Vintage Cube Archive) | 47 |
| Seulement dans MTGO Vintage | 38 |
| Seulement dans le Vintage Cube Archive | 6 |
| Dans aucune des deux (choix personnels) | 39 |

La méthode est claire : Nico a pris la mise à jour récente du MTGO Vintage Cube comme ossature, puis a utilisé son format plus large (730 cartes contre 540) pour ajouter ses choix personnels. Ces 39 cartes sont surtout des légendaires multicolores et des cartes Universes Beyond : Agent Bishop, Captain Marvel, Spectacular Spider-Man, Gollum, Smaug, Salt Vampire, Nog, King T'Challa, Bard, Kellogg, Deadpool, Raph & Mikey, Krang, Memnarch, Aragorn, Loot…

Lecture : le **socle compétitif** vient de la référence MTGO, et la **personnalité du cube** vient des légendaires thématiques. C'est un choix assumé, adapté à un cube papier joué entre amis.

### 2.2 Échanger poste pour poste
Sur 125 échanges directs, 116 gardent exactement la même identité de couleur (93 %). 65 gardent le même coût, et 95 restent à un mana près (76 %). 93 gardent la même famille de carte (créature, sort, walker). Nico a rafraîchi chaque case du cube sans toucher aux équilibres de couleur ni au nombre de cartes par archétype. C'est la bonne méthode pour un cube déjà rodé : elle limite le risque de casser le rythme des drafts.

### 2.3 Baisser la courbe et sortir les cartes « fair » lentes
Les sorties visent un profil précis : des créatures et des walkers de milieu de partie, à 4-7 mana, parus entre 2015 et 2022. Exemples : Angel of Invention, Angel of Sanctions, Serra's Emissary, Inferno Titan, Dragonlord Atarka, Terastodon, The Eternal Wanderer, Garruk Wildspeaker, Vraska Golgari Queen, Hostage Taker, Verdurous Gearhulk. Dans un format où la partie se joue au tour 2, une carte à 5 mana doit gagner la partie ou la stabiliser seule. La plupart de ces cartes ne le faisaient plus.

### 2.4 Mettre l'interaction sur des créatures plutôt que sur des sorts
Le nombre de removal reste stable (128 → 125), mais une partie passe sur des corps : Overlord of the Boilerbilges, Batroc the Leaper, Alpha Deathclaw, Ertai Resurrected, Lich's Relic, Cloak and Dagger, Yuffie, Ajani Unrelenting (−3). C'est la tendance des cubes Vintage récents : un removal sur une créature a de la valeur avec Show and Tell, Sneak Attack, Flash, la réanimation et les effets de blink. La contrepartie : ces cartes coûtent plus cher et sont plus lentes. Voir la section 5.

### 2.5 Donner au blanc des outils contre le combo et le fast mana
- **Voice of Victory** et **Jennifer Walters** : « vos adversaires ne peuvent pas lancer de sorts pendant votre tour ». Elles neutralisent Force of Will, Daze, Mana Drain et le removal instantané pendant vos attaques.
- **Spider-Woman** : les artefacts et créatures adverses arrivent engagés, ce qui retarde d'un tour les Moxen, Sol Ring et Mana Crypt. Elle remplace Imposing Sovereign, qui ne touchait que les créatures : le gain est direct.
- **Clarion Conqueror** : les capacités activées des artefacts, créatures et planeswalkers ne peuvent plus être activées, y compris les capacités de mana. Les Moxen, Sol Ring, Lotus, elfes et Moniteurs sont coupés. L'effet est symétrique : c'est une bombe dans un deck sans artefacts, un piège dans un deck à Moxen.
- **Tishana's Tidebinder** (bleu) : contre les déclencheurs comme Thassa's Oracle, Griselbrand, Archon ou les cartes à évocation.

Pour un cube dont la philosophie dit « proactif dès le tour 1, ou armé d'interactions gratuites », c'est cohérent : on donne aux decks aggro une manière de punir les decks qui ne jouent que du fast mana et des combos.

### 2.6 Refondre l'archétype artefacts
| Sortent | Entrent |
|---|---|
| Kozilek BoT, Ulamog CH, Emrakul PE, Karn Liberated, Ugin Ineffable, Cityscape Leveler, Batterskull, Karn Legacy Reforged, Nexus of Becoming, Lotus Bloom, Worn Powerstone, Reckoner Bankbuster, Circuit Mender, Filigree Familiar | Krang, Memnarch, Lotus Petal, Mox Opal, Manifold Key, Aether Spellbomb, Ghost Vacuum, Skateboard, Iron Man Armor, Tezzeret Cruel Captain, The Fantasticar, The Echoverse Fulcrum, Scrawling Crawler, Sewer-veillance Cam, Cryogen Relic |

Deux idées se combinent :
1. **Plus de petits artefacts pour faire fonctionner Mox Opal.** Lotus Petal, Key, Spellbomb, Skateboard, Ghost Vacuum, Cam et Relic sont des artefacts à 0-1 mana. Tezzeret, Cruel Captain (−3 : chercher un artefact de coût 1 ou moins) trouve toute la base de fast mana.
2. **Des gros finishers qui sont des artefacts.** Les Eldrazi ne pouvaient pas être cherchés par Tinker. Krang (9) et Memnarch (10) le peuvent, tout en restant des cibles pour Sneak Attack, Show and Tell et la réanimation. Krang donne en plus vol, piétinement, indestructible et célérité aux autres créatures-artefacts.

### 2.7 Moderniser les moteurs de pioche bleus
Memory Deluge, Ancestral Vision, Compulsive Research, See the Truth, Thought Monitor, Riftwing Cloudskate et Smirking Spelljacker sortent. À la place : Stock Up, Consult the Star Charts, Winternight Stories, Quantum Riddler, Sphinx of False Conclusions, Emeritus of Ideation (porte une copie d'Ancestral Recall), Wan Shi Tong et The Theorist. Le bleu pioche autant, pour moins cher, avec des cartes qui comptent aussi comme des corps.

---

## 3. Couleur par couleur

### Blanc (17 lignes) : des créatures agressives qui gênent le combo
- **Sortent** : Kytheon, Adanto Vanguard, Imposing Sovereign, Intrepid Adversary, Selfless Spirit, Reidane, Force of Virtue, Steel Seraph, Angel of Sanctions, Angel of Invention, Angel of Indemnity, Serra's Emissary, Elspeth Knight-Errant, The Eternal Wanderer, March of Otherworldly Light, Flare of Fortitude, Farewell.
- **Entrent** : Guide of Souls, Luminarch Aspirant, Spider-Woman, Securitron Squadron, Spectacular Spider-Man, Agent Bishop, Sage of the Skies, Clarion Conqueror, Captain Marvel, Sanguine Evangelist, Voice of Victory, Elspeth Storm Slayer, Erode, Exorcise, Sunfall, Abandoned Air Temple.
- **Logique** : on supprime presque tous les anges à 5-7 mana et on renforce l'axe « marqueurs +1/+1 au début du combat » (Luminarch, Agent Bishop, Guide of Souls, Elspeth Storm Slayer, Abandoned Air Temple). On ajoute les pièces de hate décrites en 2.5.
- **Bonnes idées** : Voice of Victory à la place d'Angel of Indemnity (meilleur choix de l'update pour le blanc) ; Erode, qui tue n'importe quelle créature pour 1 mana instantané ; Elspeth, Storm Slayer, bien meilleure qu'Elspeth, Knight-Errant dans le cube d'aujourd'hui.
- **Doutes** : Selfless Spirit → Spectacular Spider-Man ; Intrepid Adversary → Securitron Squadron (Giver of Runes était l'option évidente). Serra's Emissary → un terrain : le blanc perd une carte de couleur. Angel of Sanctions → Captain Marvel perd un removal.

### Bleu (19 lignes) : du tempo et de la pioche moderne
- **Échanges notables** : Baral → Bilbo · Ledger Shredder → The Wondrous Wasp · Sea Gate Stormcaller → Geist of Saint Thalia · Pestermite → Divining Duelist · Deceiver Exarch → Glamermite · Barrin → Seasoned Cryomancer · Cryptic Coat → Tishana's Tidebinder · Smirking Spelljacker → Emeritus of Ideation · Thought Monitor → Quantum Riddler · Jace, Wielder of Mysteries → The Theorist · Tezzeret, Betrayer of Flesh → **Flash** · Flare of Denial → Occult Epiphany · Ancestral Vision → Stock Up.
- **Lecture experte** :
  - **Twin et Kiki-Jiki restent jouables.** Pestermite et Deceiver Exarch sortent, mais Glamermite et Divining Duelist ont tous les deux le flash et « dégagez la créature ciblée ». La combo infinie avec Splinter Twin et Kiki-Jiki reste en place, avec des cartes plus jouables en dehors de la combo.
  - **Flash** est l'ajout le plus fort du bleu. Il pose une créature avec effet d'arrivée pour 2 mana : Griselbrand (on pioche avant le sacrifice), Archon of Cruelty, Atraxa, les nouvelles Incarnations à évocation (Wistfulness, Vibrance) et les cinq élémentaires de MH2 (Solitude, Fury, Endurance…). Il rejoint Show and Tell et Sneak Attack parmi les façons de mettre en jeu une créature sans payer son coût.
  - **Bilbo** réduit le coût des sorts lancés hors de la main. Il s'accorde avec Flashback, Stingcaster Mage, Yawgmoth's Will, Underworld Breach et les sorts à harmonize. Le storm basé sur le cimetière se renforce.
- **Doutes** : Flare of Denial était un contre-sort gratuit. Il n'en reste que trois (Force of Will, Force of Negation, Daze), alors que la description du cube met en avant les « interactions gratuites ». Ledger Shredder → The Wondrous Wasp est un pari.

### Noir (16 lignes) : plus de réanimation et de discard, moins de removal
- **Échanges notables** : Infernal Grasp → **Chain of Smog** · Heartless Act → **Metamorphosis Fanatic** · Lethal Scheme → Vraska's Final Mercy · Darkstar Augur → Overlord of the Balemurk · Mesmeric Fiend → Salt Vampire · Phyrexian Arena → Lich's Relic · Gonti → Ravenloft Adventurer (une carte Initiative de plus) · Evolved Sleeper → Nethergoyf · Liliana Heretical Healer → Sedgemoor Witch.
- **Logique** : on soutient la réanimation. Chain of Smog se cible soi-même pour défausser deux cibles de réanimation. Metamorphosis Fanatic réanime pour 2 mana en miracle. Overlord of the Balemurk meule et récupère. Le noir devient plus « moteur » et moins « contrôle ».
- **Doute majeur** : Infernal Grasp et Heartless Act étaient les deux meilleurs removal instantanés à 2 mana du noir. Il reste Bitter Triumph, Sheoldred's Edict, Bloodchief's Thirst, Bone Shards et Snuff Out. C'est suffisant, mais plus friable face à Ragavan, Sheoldred, Orcish Bowmasters et les elfes. Vraska's Final Mercy (BB, rituel) est un removal moins bon que les deux cartes sorties.

### Rouge (16 lignes) : de la pression avec célérité et des moteurs de sorts
- **Échanges notables** : Death-Greeter's Champion → **Screaming Nemesis** · Arc Trail → **Cori-Steel Cutter** · Detective's Phoenix → Tersa Lightshatter · Rampaging Raptor → Smaug · Inferno Titan → Overlord of the Boilerbilges · Bloodthirsty Adversary → Samut · Embereth Shieldbreaker → Stingcaster Mage · Demand Answers → Flashback · Flare of Duplication → Ajani Unrelenting · Searing Spear → Sear · Flame Slash → Suplex.
- **Bonnes idées** : Screaming Nemesis, Cori-Steel Cutter et Tersa sont des incontournables récents de cube Vintage. Overlord of the Boilerbilges fait mieux qu'Inferno Titan à son coût, avec une option à 4 mana.
- **Doutes** : le burn efficace s'érode. Flame Slash (1 mana, 4 dégâts) devient Suplex (2 mana, rituel). Searing Spear perd les dégâts au visage avec Sear. Arc Trail disparaît. Le deck Boros aggro perd de la portée, et le rouge perd des réponses bon marché contre les elfes et les créatures à 1 mana. Galvanic Blast reste, alors que l'IA proposait Galvanic Discharge (voir le benchmark).

### Vert (19 lignes) : moins de sorts de rampe, plus de landfall et de marqueurs
- **Sortent** : Explore, Farseek, Rampant Growth, Kodama's Reach, Flare of Cultivation (5 sorts de rampe), Beast Whisperer, Duskwatch Recruiter, Scavenging Ooze, Reclamation Sage, Ramunap Excavator, Terastodon, Verdurous Gearhulk, Ojer Kaslem, Garruk Wildspeaker.
- **Entrent** : Badgermole Cub, Scythecat Cub, Bristly Bill, Icetill Explorer, Mole Man, Ouroboroid, Formidable Speaker, Emeritus of Abundance, Carnivorous Cultivator, Keen-Eyed Curator, Baloth Prime, Worldspine Wurm, Lumbering Worldwagon, Garruk Curse Breaker, Webstrike Elite, Heritage Reclamation, Surrak Elusive Hunter, Bejeweled Warg, Ursine Monstrosity.
- **Lecture experte** :
  - La rampe ne disparaît pas : il reste 36 sources de mana vertes, surtout des elfes, Delighted Halfling, Sakura-Tribe Elder, Oracle of Mul Daya… Elle passe des **rituels** aux **créatures** (Badgermole Cub double le mana des créatures).
  - **Le moteur Lands se renforce nettement.** Mole Man fait tout ce que faisait Ramunap Excavator, en plus. Icetill Explorer permet de jouer des terrains depuis le cimetière avec un terrain supplémentaire. Nog, Carnivorous Cultivator, Scythecat Cub, Bristly Bill et Baloth Prime complètent. Un détail : **Sylvan Safekeeper** (qui remplace Worn Powerstone en v42) sacrifie des terrains. Avec Baloth Prime, chaque sacrifice dégage Baloth et crée un 4/4. Avec Mole Man ou Icetill, les terrains sacrifiés se rejouent. Le paquet est cohérent.
  - Ouroboroid, Bristly Bill, Scythecat Cub et Agent Bishop créent un **axe vert-blanc autour des marqueurs +1/+1**, qui n'existe pas dans les archétypes recensés par DraftMaster.
- **Doutes** : **Worldspine Wurm** remplace Terastodon. C'est une bonne cible pour Natural Order, Sneak Attack et Show and Tell, mais **elle ne peut pas être réanimée** : mise au cimetière, elle se mélange dans la bibliothèque. Un drafteur Reanimator qui la prend tombe dans le piège. Reclamation Sage sort alors que le cube est plein d'artefacts puissants. Heritage Reclamation et Webstrike Elite compensent en partie.

### Multicolore (31 lignes) : la touche personnelle de Nico
- **Bons échanges** : Expressive Iteration → **Vivi Ornitier** (une des meilleures cartes Izzet récentes) · Kaito Shizuki → Kaito, Bane of Nightmares · Saheeli → Traumatic Critique · Raffine → Starting Town (un terrain multicolore vaut mieux qu'une carte tricolore moyenne) · Hostage Taker → Ertai Resurrected · Assimilation Aegis → Aang.
- **Choix discutables** :
  - Vindicate → Cloak and Dagger et Assassin's Trophy → Nog : on perd deux removal universels.
  - **Deadpool, Trading Card** (5/3 pour 4, on perd 3 vies à chaque entretien) : l'échange de textes est amusant, mais la carte est très faible en compétition.
  - Pernicious Deed → Vicious Rivalry : le balai devient un rituel qui coûte des points de vie.
  - Raph & Mikey à la place de Dragonlord Atarka : l'effet d'arrivée de 5 dégâts à répartir disparaît.
  - Aerid Konstrari, Okoye, Bard, King T'Challa, Kellogg, Loot : des choix de saveur, plus faibles que les cartes qu'ils remplacent.
  - Le bloc or a gagné en thème et en fraîcheur, mais il a probablement perdu en puissance moyenne. C'est le prix de la personnalisation.

### Incolore et terrains (17 lignes)
Voir la section 2.6. À noter aussi : **Batterskull → Iron Man Armor** est la plus grosse baisse de puissance de la mise à jour, à mon avis. Stoneforge Mystic garde Kaldra Compleat, Umezawa's Jitte et Nettlecyst comme cibles. Enfin, **Multiversal Passage** et **Starting Town** améliorent la base de mana.

---

## 4. Impact par archétype

Les archétypes sont ceux du profil Tier 1 de DraftMaster (`cube.json`).

| Archétype | Tendance | Pourquoi |
|---|---|---|
| Izzet / Grixis Storm | ⬆️ Renforcé | Vivi Ornitier, Bilbo, Geist of Saint Thalia, Flashback, Stingcaster Mage, Cori-Steel Cutter, Fantasticar, Witherbloom Apprentice, Sedgemoor Witch. Perd Baral, Ral, Third Path Iconoclast, Expressive Iteration |
| Artifacts & Tinker | ⬆️ Recentré | Mox Opal, Lotus Petal, Manifold Key, Tezzeret Cruel Captain, cibles pour Tinker (Krang, Memnarch). Perd Batterskull, Karn, Bankbuster |
| Dimir / Grixis Reanimator | ⬆️ Renforcé | Chain of Smog, Metamorphosis Fanatic, Overlord of the Balemurk, Superior Spider-Man. Attention au piège Worldspine Wurm |
| Sneak Attack / Show and Tell | ↗️ Légèrement renforcé | Flash en plus ; Krang et Memnarch remplacent les Eldrazi |
| Izzet / Jeskai Twin & Kiki | ➡️ Stable | Glamermite et Divining Duelist remplacent Pestermite et Exarch sans perte de fonction |
| Azorius Blink / Value | ↘️ Affaibli | Soulherder, Flickerwisp (gardé), Angel of Sanctions, Shorikai et Barrin sortent ; Aang et Emeritus compensent en partie |
| Gruul / Jund Lands & Dark Depths | ⬆️ Nettement renforcé | Mole Man, Icetill Explorer, Nog, Baloth Prime + Sylvan Safekeeper, Carnivorous Cultivator, terrains utilitaires |
| Mono-Green Ramp & Natural Order | ↘️ Transformé | Moins de rituels de rampe et de gros sorts à lancer à la main ; cibles de Natural Order : Craterhoof, Worldspine Wurm, Woodfall Primus, Primeval Titan |
| Boros / Red Aggro & Initiative | ⬆️ Renforcé | Guide of Souls, Voice of Victory, Screaming Nemesis, Samut, Ravenloft Adventurer, Okoye et Aragorn (monarque). Moins de burn bon marché |
| Dimir / Grixis Tempo | ➡️ Stable | Wasp, Tidebinder, Glamermite et Quantum Riddler compensent la perte de Ledger Shredder et Thief of Sanity ; moins de removal noir |
| *Nouveau : vert-blanc marqueurs +1/+1* | 🆕 Émergent | Luminarch, Agent Bishop, Guide of Souls, Elspeth Storm Slayer, Ouroboroid, Bristly Bill, Scythecat Cub, Okoye, Abandoned Air Temple |

---

## 5. Les dix meilleures idées

1. **Les pièces de hate blanches** (Voice of Victory, Jennifer Walters, Spider-Woman, Clarion Conqueror) : elles corrigent le principal défaut des cubes powered, où l'aggro « fair » n'a pas d'outil contre le combo.
2. **Flash** : un troisième moyen de poser une grosse créature, qui multiplie les synergies avec les créatures à effet d'arrivée et à évocation.
3. **Garder Twin et Kiki** avec des pièces plus jouables (Glamermite, Divining Duelist).
4. **Les cibles de Tinker en artefact** (Krang, Memnarch) à la place d'Eldrazi que Tinker ne pouvait pas chercher.
5. **Mox Opal et ses petits artefacts**, avec Tezzeret, Cruel Captain pour aller les chercher.
6. **Le moteur Lands** (Mole Man, Icetill Explorer, Baloth Prime, Sylvan Safekeeper, Nog).
7. **Vivi Ornitier, Screaming Nemesis, Cori-Steel Cutter, Stock Up, Quantum Riddler** : la crème des sorties 2025.
8. **Starting Town et Multiversal Passage** : une meilleure base de mana sans y consacrer de cases colorées.
9. **L'échange poste pour poste** : aucun équilibre ne casse alors que 18 % du cube change.
10. **Erode, Sage of the Skies et Elspeth, Storm Slayer** : un blanc plus efficace pour moins cher.

## 6. Les choix moins certains

1. **Le removal bon marché recule** (Infernal Grasp, Heartless Act, Flame Slash, Searing Spear, Arc Trail, Vindicate, Assassin's Trophy, Pernicious Deed). La quantité reste, l'efficacité baisse. Dans un format où le tour 2 décide, c'est le risque n°1.
2. **Batterskull → Iron Man Armor** : une grosse perte de puissance pour le paquet Stoneforge Mystic.
3. **Les contre-sorts gratuits** passent de 4 à 3 (Flare of Denial sort), contre la philosophie affichée du cube.
4. **Le bloc or Universes Beyond** : Deadpool, Nog, Aerid Konstrari, Okoye, Kellogg et Loot sont en dessous des cartes qu'ils remplacent. Vindicate et Assassin's Trophy en particulier.
5. **Worldspine Wurm** est un piège pour la réanimation, la stratégie la plus draftée de ce type de cube.
6. **Clarion Conqueror** est symétrique : excellent dans le bon deck, mais un piège pour un drafteur qui a déjà des Moxen.
7. **Des cartes 2026 peu testées** (Salt Vampire, Nog, Gollum, Sanctum Lurker, Garruk Curse Breaker, Ajani Unrelenting) : leur Elo repose sur quelques centaines de cubes. Certaines devront être réévaluées après quelques drafts.
8. **Le blanc perd 3 cartes de couleur** (au profit d'un terrain et d'artefacts bleus). C'est à surveiller si le blanc se draft moins bien.
9. **Les hésitations de la session** (Sire of Seven Deaths, Booster Tutor, Deathrite Shaman, Shifting Woodland) : les allers-retours sont sains, mais l'ancien emplacement de Karn, Legacy Reforged a été comblé indirectement.
10. **Sanctum Lurker et Vraska's Final Mercy** (mécanique « empower Jace ») : des cartes de niche dans un cube sans vrai thème autour de Jace.

## 7. Ce que je suggérerais à Nico

- Rendre au noir **un removal instantané à 2 mana** (Infernal Grasp, Go for the Throat ou Cut Down) à la place de Vraska's Final Mercy ou de Sanctum Lurker.
- Rendre au rouge **un burn à 1 mana** (Galvanic Discharge à la place de Galvanic Blast, ou Flame Slash à la place de Suplex).
- Remettre **Batterskull** ou un équivalent pour Stoneforge Mystic, à la place d'Iron Man Armor.
- Remplacer **Deadpool** par une carte noir-rouge plus solide.
- Signaler aux joueurs le **piège Worldspine Wurm / réanimation**.

---

## 8. Ce que ça implique pour DraftMaster

- Le snapshot `nico_candyshop@2026-03-01.1` est **périmé à 18 %**. Les conseils de draft, les scores de deck et la maybeboard IA reposent aujourd'hui sur une liste qui n'existe plus.
- Il faut **réimporter le cube** et **relancer l'analyse Tier 1** (skill `analyzing-cubes`) pour :
  - ajouter l'axe vert-blanc marqueurs +1/+1, et mettre à jour Lands, Artifacts et Storm ;
  - faire évaluer par un expert les ~47 nouvelles cartes absentes du catalogue (voir le benchmark) ;
  - corriger des niveaux incohérents déjà relevés : Show and Tell, Yawgmoth's Will, Displacer Kitten et Goldspan Dragon sont classés F ; Thassa's Oracle est classée D−.
