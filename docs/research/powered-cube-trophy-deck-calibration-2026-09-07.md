# Étalonnage par cinq trophy decks du Powered Cube Arena

Recherche du 7 septembre 2026. Cette note analyse cinq listes publiques 17Lands proposées comme témoins positifs pour l'évaluation des decks DraftMaster. Les listes, formats et résultats viennent des pages officielles 17Lands. Les plans de jeu et les rôles des cartes sont des **inférences de gameplay**, explicitement séparées des faits observés.

## Conclusion

Ces cinq decks constituent un bon **jeu de tests de diversité**, mais pas encore une échelle statistique permettant de décréter qu'un deck vaut 95/100. Ils montrent au moins cinq chemins très différents vers un trophée : agression équipée, tempo avec combo de pioche, ramp proactif, réanimation-contrôle et triche de grosses menaces.

Le motif commun n'est pas « beaucoup d'interaction » ni « la meilleure moyenne de cartes ». Les cinq listes combinent plutôt :

- du mana gagné très tôt ;
- une forte densité d'actions à un ou deux manas ;
- un package cohérent dont les cartes se renforcent mutuellement ;
- de la sélection, de la pioche ou des tuteurs ;
- assez d'interaction **pour le plan**, avec une quantité très variable ;
- plusieurs menaces ou lignes de jeu, donc moins de dépendance à une seule bombe.

Conséquence pour DraftMaster : la « puissance » ne peut pas rester la moyenne des `staticScore`. Le score doit préserver la distribution de qualité des cartes, la compression de mana, les packages, leur redondance et l'adéquation de l'interaction au plan détecté.

## Provenance et limites des faits

17Lands définit un trophy deck comme un deck ayant atteint le maximum de victoires de son événement, par exemple sept victoires en draft Bo1. Les cinq pages indiquent `Cube - Powered`, `PremierDraft`, un unique `Deck 1`, et les résultats 7–0, 7–1 ou 7–2 : ce sont donc bien cinq runs trophées selon cette définition. [Définition officielle des Trophy Decks](https://www.17lands.com/trophy_decks?expansion=Cube+-+Powered&format=PremierDraft)

Le rang Mythic est un contexte fourni par l'utilisateur. Il n'est pas affiché sur les cinq pages Deck consultées ni sur la page Details vérifiée ; il faut donc le conserver comme **métadonnée déclarée, non vérifiée ici**. Les badges de couleur 17Lands sont visibles, mais leur traduction en noms d'archétypes ci-dessous reste une inférence.

Les pages Deck sont la source de vérité pour la présence et la zone des cartes. Elles ne donnent pas le texte Oracle dans la liste. Les interactions exactes de quelques cartes Arena très récentes (`Emeritus`, `Wan Shi Tong`, `Tersa`, `Quantum Riddler`, etc.) devront être enrichies depuis un référentiel de cartes versionné avant de produire des métriques mécaniques. Les conclusions ci-dessous n'ont pas besoin de leur attribuer un rôle non vérifié pour reconnaître le squelette principal de chaque deck.

### Couverture du catalogue local

Les cinq maindecks contiennent 143 noms de cartes uniques, terrains de base compris. Le catalogue maître actuellement consommé par DraftMaster (`data/cards/master-cards.json`), complété par les cinq terrains de base définis dans le code, en reconnaît 120 (83,9 %). Les caches historiques locaux permettent d'identifier 22 des 23 noms restants : au total, 142/143 (99,3 %) sont donc documentés quelque part dans le dépôt, mais pas encore réunis dans le référentiel de production.

`Keen-Eyed Curator` est le seul nom absent de toutes les sources locales vérifiées. Avant de calculer des scores de référence, il faut récupérer son identité et son texte depuis une source de cartes fiable, puis réconcilier les 23 absences du catalogue maître. Cette distinction est importante : connaître une carte dans un cache de recherche ne signifie pas que l'évaluateur peut déjà la charger et la noter.

## Vue comparative

| Témoin | Résultat observé | Taille / terrains | Plan inféré | Accélération structurante | Posture d'interaction inférée |
| --- | ---: | ---: | --- | --- | --- |
| A — Boros | 7–0 | 40 / 16 | Aggro-équipement avec value et portée | `Mox Ruby` | Nombreuses réponses bon marché, souvent jouables comme pression |
| B — Grixis | 7–1 | 41 / 14 | Tempo/value, artefacts et `Hullbreacher` + `Echo of Eons` | `Mana Crypt`, `Mana Vault` | Dense, polyvalente et portée par des cartes modales |
| C — Temur vert | 7–2 | 40 / 16 | Ramp/créatures, `Gaea's Cradle`, value et sacrifice de terrains | `Mana Vault`, trois accélérateurs à un mana, `Rofellos`, `Fanatic of Rhonas`, `Gaea's Cradle` | Peu de réponses directes ; le deck impose son moteur |
| D — Esper | 7–2 | 40 / 16 | Réanimation, tokens/value et contrôle | `Mox Diamond` | Très dense, puis recyclée par les moteurs |
| E — Grixis | 7–0 | 40 / 16 | `Show and Tell` / `Sneak Attack` avec sélection et gros payoffs | `Mox Sapphire`, trésors potentiels | Petit noyau de réponses très bon marché pour atteindre le tour de combo |

La colonne « taille / terrains » compte les cartes affichées dans le main deck. Elle ne convertit pas les landcyclers, MDFC, trésors ou rochers en terrains équivalents ; ce calcul devra être une métrique distincte.

## Témoin A — Boros aggro-équipement avec portée

**Faits observés.** [Deck 17Lands `eee93…`, 7–0](https://www.17lands.com/deck/eee93f65fb654472918f1d4a273d96dd/0?view=deck) : 40 cartes, 24 non-terrains et 16 terrains. Courbe de mana visible : 1 carte à 0, 6 à 1, 7 à 2, 4 à 3, 3 à 4 et 3 à 5. Companion : `Lutri, the Spellchaser`. La page n'affiche qu'un `Deck 1`, donc aucune autre configuration enregistrée n'est visible.

Main deck :

> Mox Ruby; Figure of Destiny; Grim Lavamancer; Swords to Plowshares; Rabbit Battery; Kellan, Planar Trailblazer; Chain Lightning; Umezawa's Jitte; Unexpectedly Absent; Smuggler's Copter; Stoneforge Mystic; Ivora, Insatiable Heir; Suplex; Emeritus of Conflict; Seasoned Pyromancer; Breya's Apprentice; Lingering Souls; Broadside Bombardiers; Chandra, Torch of Defiance; Mine Collapse; Fiery Confluence; Batterskull; Goldspan Dragon; Fury; 7 Mountain; 4 Plains; Wooded Foothills; Scrubland; Sacred Foundry; Sunbaked Canyon; Sunbillow Verge.

Companion : `Lutri, the Spellchaser`.

Sideboard observé :

> Ancestral Recall; Cut Down; Etherium Pteramander; Phyrexian Revoker; Caustic Bronco; Super Shredder; Improvised Arsenal; Kolaghan's Command; Saheeli, Sublime Artificer; Tireless Tracker; Empty the Warrens; Karn, Legacy Reforged; The Legend of Yangchen; Leyline Binding; Shadowy Backstreet.

**Interprétation.** Ce deck transforme presque chaque dimension en tempo :

- `Mox Ruby` avance la courbe ; treize sorts à un ou deux manas rendent cette avance immédiatement exploitable.
- `Stoneforge Mystic` rend l'accès à `Umezawa's Jitte` ou `Batterskull` plus régulier. Le package n'est donc pas la simple somme de trois bonnes cartes : le tuteur augmente la fréquence du payoff.
- `Seasoned Pyromancer`, `Breya's Apprentice`, `Lingering Souls`, `Chandra` et `Batterskull` évitent que l'aggro ne s'épuise après une première vague.
- `Swords to Plowshares`, `Chain Lightning`, `Unexpectedly Absent`, `Mine Collapse`, `Fiery Confluence` et `Fury` retirent les bloqueurs ou créent de la portée. Ici, interaction et proactivité se recouvrent.
- `Smuggler's Copter` et `Seasoned Pyromancer` réduisent les mauvaises pioches ; `Figure of Destiny` absorbe le mana excédentaire.

Ce témoin doit empêcher un modèle de sous-noter un aggro parce qu'il n'a ni combo spectaculaire ni sept cartes de pioche. Sa force vient de la **densité**, de la compression de mana et de cartes qui restent utiles à plusieurs stades de la partie.

## Témoin B — Grixis tempo/value avec mana explosif

**Faits observés.** [Deck 17Lands `375ec…`, 7–1](https://www.17lands.com/deck/375ecb3e1d434c65bcb88d21541a5ef6/0?view=deck) : 41 cartes, 27 non-terrains et 14 terrains. Courbe imprimée : 1 carte à 0, 5 à 1, 8 à 2, 6 à 3, 1 à 4, 5 à 5 et 1 à 6. `Lórien Revealed` est compté à son mana value imprimé, mais son landcycling réduit le risque de mana en pratique. La page n'affiche qu'un `Deck 1`.

Main deck :

> Mana Crypt; Unholy Heat; Dragon's Rage Channeler; Mana Vault; Reanimate; Burst Lightning; Miscalculation; Magda, Brazen Outlaw; Scrapwork Mutt; Malcolm, Alluring Scoundrel; Generous Plunderer; Floodpits Drowner; Ivora, Insatiable Heir; Wan Shi Tong, Librarian; Dack Fayden; Bonecrusher Giant; Fire Covenant; Hullbreacher; Tishana's Tidebinder; Tersa Lightshatter; Displacer Kitten; Lórien Revealed; Quantum Riddler; Nova Hellkite; Fallen Shinobi; Emeritus of Ideation; Echo of Eons; 4 Mountain; 3 Island; 2 Swamp; Flooded Strand; Polluted Delta; Underground Sea; Spirebluff Canal; Thundering Falls.

Sideboard observé :

> Skullclamp; Voldaren Epicure; Skrelv, Defector Mite; Wishclaw Talisman; Get Lost; Ajani, Nacatl Pariah; Seasoned Pyromancer; Nettlecyst; Touch the Spirit Realm; Karn, Scion of Urza; Kappa Cannoneer; Elegant Parlor; Shadowy Backstreet.

**Interprétation.** Le score doit ici reconnaître plusieurs multiplicateurs :

- `Mana Crypt` et `Mana Vault` peuvent sauter un ou plusieurs tours de développement. Leur contribution n'est pas correctement représentée par leur seule note individuelle.
- `Hullbreacher` avec `Echo of Eons` forme une ligne à plafond extrême : le renouvellement symétrique des mains devient asymétrique. `Dack Fayden` offre une autre interaction de pioche/défausse qui bénéficie du même type de contrainte.
- `Unholy Heat`, `Burst Lightning`, `Miscalculation`, `Bonecrusher Giant`, `Fire Covenant` et `Tishana's Tidebinder` couvrent des menaces différentes sans sacrifier tout le développement.
- `Dragon's Rage Channeler`, `Scrapwork Mutt`, `Malcolm` et `Dack Fayden` sélectionnent ou transforment les cartes ; `Reanimate` peut convertir le cimetière en tempo.
- Le plan secondaire de créatures et de value permet de gagner sans assembler `Hullbreacher` + `Echo`.

Points de vigilance : 41 cartes réduisent légèrement la fréquence des meilleures cartes ; 14 terrains et trois couleurs augmenteraient le risque sans les deux artefacts de mana, le landcycling et le fixing. Un modèle auditable doit afficher ces compensations au lieu de donner séparément un bonus « power » et une pénalité « mana » sans expliquer leur interaction.

## Témoin C — Ramp Temur proactif, faible en réponses directes

**Faits observés.** [Deck 17Lands `af99b…`, 7–2](https://www.17lands.com/deck/af99b1512a8745f3ac7284ff98f37913/0?view=deck) : 40 cartes, 24 non-terrains et 16 terrains. Courbe imprimée : 1 carte à 0, 8 à 1, 5 à 2, 5 à 3, 2 à 4, 1 à 5 et 2 à 6 ou plus. La page n'affiche qu'un `Deck 1`.

Main deck :

> Zuran Orb; Noble Hierarch; Ancestral Recall; Llanowar Elves; Soul-Guide Lantern; Delighted Halfling; Mana Vault; Expedition Map; Currency Converter; Rofellos, Llanowar Emissary; Fanatic of Rhonas; Malevolent Rumble; Keen-Eyed Curator; Sylvan Library; Sentinel of the Nameless City; Eternal Witness; Tezzeret, Cruel Captain; Gut, True Soul Zealot; Emeritus of Abundance; Minsc & Boo, Timeless Heroes; Ouroboroid; Titania, Protector of Argoth; Nissa, Ascended Animist; Generous Ent; 7 Forest; Island; Mountain; Gaea's Cradle; Windswept Heath; Taiga; Tropical Island; Misty Rainforest; Commercial District; Willowrush Verge.

Sideboard observé :

> Mox Opal; Ponder; Unearth; Figure of Fable; Goblin Engineer; Natural Order; Stoke the Flames; Gideon, Ally of Zendikar; Memory Jar; Elspeth, Storm Slayer; Quantum Riddler; Nexus of Becoming; Zagoth Triome; Hushwood Verge.

**Interprétation.** Ce deck est le contre-exemple central à une note récompensant mécaniquement la quantité d'interactions :

- `Noble Hierarch`, `Llanowar Elves`, `Delighted Halfling` et `Mana Vault` accélèrent dès le premier tour. `Rofellos`, `Fanatic of Rhonas` et `Gaea's Cradle` donnent ensuite un plafond de mana très supérieur à un terrain par tour.
- `Expedition Map` augmente l'accès à `Gaea's Cradle`. La densité de créatures alimente la Cradle et les payoffs de board.
- `Ancestral Recall`, `Sylvan Library`, `Currency Converter` et `Eternal Witness` apportent sélection, cartes ou récupération.
- `Titania, Protector of Argoth` et `Zuran Orb` transforment les terrains sacrifiés en vie et en pression ; même sans traiter cette paire comme une victoire automatique, son affinité doit être tracée.
- `Minsc & Boo`, `Nissa` et les créatures de value produisent pression et avantage, ce qui permet au deck d'agir comme le joueur qui pose les questions.

L'interaction directe est relativement faible ; `Soul-Guide Lantern`, `Keen-Eyed Curator`, `Minsc & Boo` ou `Nissa` offrent plutôt de la couverture ciblée ou embarquée. Une pénalité universelle pour « moins de X removals » classerait mal ce trophée. Il faut comparer la réponse disponible au besoin du plan ramp/proactif et mesurer sa capacité à gagner la course.

## Témoin D — Esper réanimation-contrôle

**Faits observés.** [Deck 17Lands `f62f0…`, 7–2](https://www.17lands.com/deck/f62f0aeac9694c2ab33b7bdbd1ca4d94/0?view=deck) : 40 cartes, 24 non-terrains et 16 terrains. Courbe imprimée : 1 carte à 0, 6 à 1, 6 à 2, 7 à 3, 1 à 5 et 3 à 6 ou plus. La page n'affiche qu'un `Deck 1`.

Main deck :

> Mox Diamond; Entomb; Skullclamp; Oust; Bone Shards; Portable Hole; Inquisition of Kozilek; Time Walk; Deep-Cavern Bat; Stoneforge Mystic; Glimmer Lens; Staff of the Storyteller; Sheoldred's Edict; Recurring Nightmare; Teferi, Time Raveler; Lingering Souls; Sage of the Skies; Life // Death; Barrowgoyf; Dismember; Fractured Identity; Woodfall Primus; Grave Titan; Crabomination; 6 Plains; 6 Swamp; Island; Polluted Delta; Scrubland; Raffine's Tower.

Sideboard observé :

> Aether Spellbomb; Duress; Blood Fountain; Retrofitter Foundry; Etherium Pteramander; Talisman of Dominance; Lion Sash; Painter's Servant; Flickerwisp; Lurrus of the Dream-Den; Grist, the Hunger Tide; Leovold, Emissary of Trest; Cosmogrand Zenith; Gut, True Soul Zealot; Grave Researcher; Magmablood Archaic; Elegy Acolyte; Dark Petition.

**Interprétation.** C'est le témoin où quantité et qualité d'interaction doivent toutes deux compter :

- `Oust`, `Bone Shards`, `Portable Hole`, `Inquisition of Kozilek`, `Deep-Cavern Bat`, `Sheoldred's Edict`, `Teferi`, `Dismember` et `Fractured Identity` répondent à la main, au board, à la pile ou au tempo sur plusieurs fenêtres de mana.
- `Entomb`, `Life // Death` et `Recurring Nightmare` forment le noyau réanimation. `Woodfall Primus`, `Grave Titan` et `Crabomination` sont plusieurs payoffs, donc le plan ne repose pas sur une cible unique.
- `Bone Shards` est à la fois interaction et moyen de placer une créature au cimetière ; sa contribution doit apparaître dans plusieurs rôles sans être comptée deux fois dans le total.
- `Lingering Souls`, `Staff of the Storyteller` et `Glimmer Lens` produisent des corps et/ou des cartes. `Skullclamp` et `Stoneforge Mystic` transforment ces petits permanents en moteur et rendent l'équipement plus accessible.
- `Mox Diamond` accélère et peut contribuer au cimetière, au prix d'une carte de terrain ; cette contrepartie doit rester visible.

Le mana est principalement Orzhov avec un splash bleu. Une note de mana devrait publier les sources disponibles par couleur et par tour, pas seulement « trois couleurs » : les coûts bleus et les fetchables ne demandent pas tous la même exigence.

## Témoin E — Grixis Show and Tell / Sneak Attack

**Faits observés.** [Deck 17Lands `fead1…`, 7–0](https://www.17lands.com/deck/fead108d5e2f46fbac1314fcf5b972b7/0?view=deck) : 40 cartes, 24 non-terrains et 16 terrains. Courbe imprimée : 2 cartes à 0, 6 à 1, 4 à 2, 5 à 3, 1 à 4, 1 à 5 et 5 à 7 ou plus. La page n'affiche qu'un `Deck 1`. La [page Details](https://www.17lands.com/details/fead108d5e2f46fbac1314fcf5b972b7) montre sept victoires avec ce même Deck 1 le 22 juin 2026.

Main deck :

> Mox Sapphire; Urza's Bauble; Thoughtseize; Unholy Heat; Dragon's Rage Channeler; Cut Down; Cecil, Dark Knight; Preordain; Demonic Tutor; Generous Plunderer; Psychic Frog; Jace, Vryn's Prodigy; Dack Fayden; Bonecrusher Giant; Laelia, the Blade Reforged; Show and Tell; Stock Up; Sneak Attack; Overlord of the Balemurk; Griselbrand; Worldspine Wurm; Archon of Cruelty; Atraxa, Grand Unifier; Torsten, Founder of Benalia; 4 Swamp; 3 Island; 2 Mountain; Bloodstained Mire; Raugrin Triome; Scalding Tarn; Thundering Falls; Undercity Sewers; Blazemire Verge; Gloomlake Verge.

Sideboard observé :

> Pyrite Spellbomb; Grim Lavamancer; Experimental Synthesizer; Thalia, Guardian of Thraben; Brain Freeze; Seasoned Pyromancer; Graveyard Trespasser; Ob Nixilis, the Adversary; Scrapshooter; Magmatic Hellkite; Emeritus of Woe; Professor Dellian Fel; Bolas's Citadel; Shadowy Backstreet.

**Interprétation.** Le mana value moyen imprimé serait particulièrement trompeur ici :

- `Show and Tell` et `Sneak Attack` convertissent cinq menaces de mana value 7–11 en sorties beaucoup plus précoces. Le score de courbe doit distinguer **coût imprimé** et **tour de déploiement attendu**.
- `Demonic Tutor` augmente la redondance fonctionnelle du bon côté du package. `Preordain`, `Jace`, `Dack Fayden`, `Psychic Frog`, `Dragon's Rage Channeler`, `Urza's Bauble` et `Stock Up` réduisent le risque de piocher la mauvaise moitié du deck.
- `Thoughtseize`, `Unholy Heat`, `Cut Down` et `Bonecrusher Giant` forment un noyau compact d'interaction bon marché : assez pour protéger ou atteindre la fenêtre de combo, sans devoir satisfaire le quota d'un contrôle.
- `Mox Sapphire` et les trésors potentiels accélèrent ; sept non-basiques de fixing soutiennent les trois couleurs. `Atraxa` et `Torsten` sont surtout des payoffs de triche : les compter comme exigences normales de quatre ou deux couleurs surestimerait les défauts de mana.
- Plusieurs payoffs (`Griselbrand`, `Worldspine Wurm`, `Archon of Cruelty`, `Atraxa`, `Torsten`) réduisent la dépendance à une seule cible, mais créent un vrai coût de cartes mortes si aucun enabler n'est trouvé. Les deux termes doivent être exposés.

Ce deck doit obtenir un plafond très élevé sans que le modèle confonde ce plafond avec une garantie : la qualité de la sélection, le nombre d'enablers, le nombre de payoffs et les probabilités d'assembler une main fonctionnelle doivent être visibles.

## Motifs communs à transformer en métriques auditables

### 1. Puissance et plafond

Ne pas résumer 23 ou 24 sorts par leur moyenne. Publier au minimum :

- médiane, moyenne tronquée et quantiles de `staticScore` ;
- top 3/top 5, densité de bombes et nombre de cartes sous un seuil faible ;
- mana gagné par les accélérateurs, tour d'activation et contrepartie ;
- coût imprimé **et** coût/tour de déploiement estimé (`Reanimate`, `Show and Tell`, alternate costs, landcycling) ;
- plafond des packages et probabilité estimée de les assembler.

### 2. Cohésion et synergies

Modéliser un graphe explicable `enabler → payoff → support` plutôt qu'un bonus opaque :

- `Stoneforge Mystic → Jitte/Batterskull` ;
- `Hullbreacher ↔ Echo of Eons` ;
- `Expedition Map → Gaea's Cradle` et `Zuran Orb ↔ Titania` ;
- `Entomb/Bone Shards → Life // Death/Recurring Nightmare → grosses créatures` ;
- `Show and Tell/Sneak Attack → cinq payoffs`, avec tuteur et sélection.

Pour chaque package, afficher : cartes présentes, nombre d'enablers, nombre de payoffs, tuteurs, cartes mortes hors package, contribution positive et pénalité de fragilité.

### 3. Courbe et tempo

Séparer :

- la courbe imprimée ;
- la courbe de déploiement effective ;
- la densité d'actions par tour ;
- la capacité à utiliser le mana excédentaire ;
- le gain ou la perte de tempo créé par les sorts gratuits, Mox, Vault/Crypt, dorks et trésors.

Les cinq decks ont beaucoup d'actions à un ou deux manas, même ceux dont le haut de courbe imprimé est spectaculaire.

### 4. Mana et castabilité

Afficher les nombres bruts avant toute note :

- terrains réels, équivalents-terrain et sources non-terrain ;
- sources de chaque couleur disponibles aux tours 1, 2 et 3 ;
- fetchlands et cibles réellement accessibles ;
- coûts à doubles pips ;
- cartes destinées à être trichées plutôt que lancées ;
- probabilité de lancer les sorts structurants dans les temps ;
- risques et contreparties (`Mana Crypt`, terrain défaussé à `Mox Diamond`, 14 terrains, terrains engagés).

### 5. Adéquation au plan, dont l'interaction

L'interaction doit être décrite par deux objets séparés :

1. **Profil intrinsèque** : coût, vitesse, types de cibles, condition, avantage/désavantage de cartes, polyvalence, tempo et présence sur une menace.
2. **Adéquation au plan** : quantité et couverture requises pour aggro, tempo, ramp, combo, midrange ou contrôle.

Le témoin C doit pouvoir être excellent avec peu de removals directs ; le témoin D doit être récompensé pour quantité **et** couverture. Une interaction embarquée sur une menace (`Bonecrusher Giant`, `Fury`, `Deep-Cavern Bat`) soutient aussi le plan proactif. Le rapport doit montrer les cartes comptées et éviter le double comptage entre « interaction », « menace » et « synergie ».

## Proposition d'utilisation pour l'étalonnage

### Ce que ces cinq decks peuvent déjà imposer

Ils peuvent devenir des tests de non-régression qualitatifs :

- chacun doit être reconnu comme un deck de force élevée ;
- leurs explications dominantes doivent être différentes ;
- le ramp C ne doit pas échouer sur un quota universel d'interaction ;
- l'Esper D doit afficher un besoin et une couverture d'interaction élevés ;
- le Grixis E doit être évalué sur sa courbe effective, pas sur la moyenne des coûts imprimés ;
- les packages nommés doivent être retrouvés et leurs contributions détaillées ;
- les défauts réels (41 cartes, mana tendu, cartes mortes, coûts de l'accélération) doivent rester visibles malgré le trophée.

Une attente provisoire du type `overallStrength ∈ [90, 98]` peut servir de garde-fou manuel, mais elle ne doit pas être présentée comme une calibration statistique ni comme 90–98 % de chances de gagner. Le résultat 7–0 ne suffit pas non plus à classer automatiquement un deck au-dessus d'un 7–2 : sept à neuf parties restent un échantillon très court.

### Ce qu'il faut ajouter avant de définir « 95 »

Le corpus ne contient que des gagnants choisis après observation du résultat : c'est un biais de sélection majeur. Pour donner un sens stable à 95, il faut ajouter :

1. un échantillon représentatif de tous les decks du même run de Powered Cube ;
2. des contrôles négatifs et intermédiaires, idéalement Mythic 0–3, 2–3, 3–3 et 6–3 ;
3. les pools et, si possible, les choix de sideboard/deck par partie ;
4. un découpage apprentissage/holdout par événement ou période ;
5. une mesure séparée du résultat du pilote, du rang, du play/draw et de la variance ;
6. une version du Cube et un référentiel Oracle figés.

17Lands publie des données de draft, de parties et de replay anonymisées. Les données de partie contiennent le deck, la main de départ et les cartes piochées ; les données de draft contiennent une ligne par pick. Elles permettent de construire ce corpus élargi sans confondre une page trophée avec une distribution complète. [Données publiques officielles](https://www.17lands.com/public_datasets)

Les métriques 17Lands sont définies au niveau de la partie et les cartes du maindeck sont celles présentes au début de chaque partie ; ce détail est important si une configuration change pendant un événement. Les taux par carte restent associatifs et contextuels, pas des effets causaux à additionner dans un score de deck. [Définitions officielles des métriques](https://www.17lands.com/metrics_definitions)

### Signification recommandée de 95

À terme, `95` devrait signifier l'une de ces deux choses, jamais les deux :

- **percentile 95** : le deck dépasse 95 % des decks du corpus comparable selon un modèle validé sur holdout ;
- **ancre experte 95/100** : le deck satisfait une convention versionnée avec témoins, tolérances et preuve détaillée.

La première signification est préférable pour l'étalonnage statistique. Dans les deux cas, afficher séparément `score`, `percentile`, `confidence`, `corpusId`, `cubeVersion`, `formulaVersion` et la trace des contributions.

## Limites du corpus

- Cinq observations seulement, toutes sélectionnées parce qu'elles ont gagné.
- Résultats courts : sept victoires avec zéro à deux défaites.
- Rang Mythic fourni par l'utilisateur, mais non visible sur les pages consultées.
- Pas de decks faibles ou moyens pour fixer le bas et le milieu de l'échelle.
- Pas d'estimation indépendante de la qualité du pilote, des pairings ou du play/draw.
- Les pages de listes seules ne prouvent pas quelles synergies ont effectivement gagné les parties.
- Quelques cartes Arena récentes exigent un référentiel de texte Oracle versionné avant extraction automatique de rôles.
- Le Powered Cube et son métagame changent : chaque observation doit conserver date, période et version de liste.

Ces limites n'annulent pas la valeur du corpus. Elles définissent son rôle exact : cinq **ancres positives de structure et d'explicabilité**, à compléter avant toute calibration numérique de la puissance.
