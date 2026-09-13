# Feature Specification: Draft multijoueur amical et Coach de deck

**Feature Branch**: `006-multiplayer-draft`

**Created**: 2026-09-13

**Status**: Clarified - ready for planning

**Input**: User description: "Mettre en place le menu Draft multi : les joueurs rejoignent un salon, attendent au moins une autre personne, se declarent tous prets avant le lancement, draftent sans limite de temps, construisent un deck de 40 cartes avec l'aide d'un Coach IA ameliore et exportent leur liste au format MTGA."

## Alignement Domaine et Perimetre

- **Draft multijoueur** : experience amicale a huit sieges reunissant de deux a huit joueurs humains, avec des bots sur les sieges restants.
- **Salon de draft** : espace d'attente global unique qui rend visibles les participants presents et leur etat pret ou non pret avant un demarrage commun.
- **Tour de draft** : tous les sieges actifs choisissent une carte avant que les boosters restants ne passent ensemble ; aucun participant n'est soumis a un compte a rebours.
- **Coach de deck** : assistance de fin de draft qui propose une selection explicable de 40 cartes, en comptant les terrains draftes et en completant avec des terrains de base. Sa recommandation reste modifiable par le joueur.
- Le Draft multijoueur ouvre un jalon distinct du premier jalon Solo Draft Coach. Il ne remplace pas le Solo Draft Coach et ne modifie pas ses regles d'Homologation.
- Le choix d'un fournisseur de modele externe appartient au plan technique. La legalite du deck, le Score de deck et la conservation de la session ne dependent pas d'une decision opaque de ce modele.
- L'amelioration du Coach porte sur la construction finale des 40 cartes en solo et en multijoueur. Les conseils pendant les 45 picks humains et les politiques de choix des bots ne changent pas dans cette feature.

## Clarifications

### Session 2026-09-13

- Q: Si un joueur disparait pendant le draft et ne revient pas, comment les autres peuvent-ils debloquer la table sans imposer de choix automatique ? → A: Aucun remplacement : la table attend. Si le joueur ne revient pas, le groupe abandonne cette session et recommence integralement sans lui, en se coordonnant sur Discord.
- Q: Le Coach doit-il conserver la regle fixe "23 cartes du pool + 17 terrains de base", ou adapter librement la composition pour obtenir le meilleur deck de 40 cartes ? → A: Composition flexible de 40 cartes ; le Coach vise normalement 16 a 18 terrains au total et justifie tout ecart.
- Q: Comment un joueur doit-il recuperer sa place apres un rechargement, une deconnexion ou un changement d'appareil ? → A: DraftMaster fournit un lien ou code prive de reprise, enregistre automatiquement dans le navigateur et utilisable sur un autre appareil.
- Q: Dans le salon global, qui choisit le cube utilise pour le prochain draft ? → A: Le premier joueur entrant choisit le cube ; le choix est verrouille des qu'un deuxieme humain rejoint le salon.
- Q: Quand le Coach du mode solo est ameliore, faut-il revoir uniquement la construction finale des 40 cartes ou aussi les conseils pendant les 45 picks ? → A: Ameliorer uniquement la construction finale du deck, pour le solo et le multijoueur.

## User Scenarios & Testing

### User Story 1 - Rejoindre un Salon de draft (Priority: P1)

Depuis le menu "Draft multijoueur", un joueur saisit ou confirme son nom puis est invite a rejoindre l'unique Salon de draft global. S'il est le premier entrant, il choisit le cube et peut modifier ce choix tant qu'il reste seul. Son siege recoit un Acces de reprise prive, memorise par son navigateur et affichable pour un transfert vers un autre appareil. Il voit le cube choisi, les huit sieges, les autres participants presents et l'etat pret de chacun. Des qu'un deuxieme humain rejoint le salon, le cube est verrouille pour cette composition. Tant que le premier joueur est seul, l'interface explique qu'au moins un autre joueur humain est necessaire. Si un groupe est deja en train de drafter, le menu indique que le salon est indisponible jusqu'a la fin de sa phase de draft.

**Why this priority**: Sans rassemblement fiable des joueurs, aucune Session de draft partagee ne peut commencer.

**Independent Test**: Deux navigateurs rejoignent le meme salon et observent la meme liste de participants et les memes changements d'etat sans rechargement manuel.

**Acceptance Scenarios**:

1. **Given** un joueur ouvre le menu Draft multijoueur, **When** il renseigne un nom valide et rejoint un salon, **Then** son nom apparait dans le salon et il voit qu'il faut au moins deux joueurs humains pour commencer.
2. **Given** deux joueurs sont dans le meme salon, **When** un troisieme joueur le rejoint, **Then** les trois ecrans affichent la meme composition de table.
3. **Given** un nom vide ou deja utilise dans le salon, **When** le joueur tente de rejoindre, **Then** l'entree est refusee avec une explication et aucune place n'est reservee.
4. **Given** le salon global deja demarre ou ses huit places humaines occupees, **When** un autre joueur tente de le rejoindre, **Then** il ne modifie pas la Session de draft et recoit un message clair sur l'indisponibilite.
5. **Given** un joueur rejoint le salon avec succes, **When** son siege est cree, **Then** son Acces de reprise prive est memorise localement et peut etre copie sans etre revele aux autres participants.
6. **Given** le salon global est vide, **When** le premier joueur le rejoint, **Then** il doit choisir le cube et peut modifier ce choix tant qu'aucun second humain n'est present.
7. **Given** un cube a ete choisi par le premier joueur, **When** un deuxieme humain rejoint le salon, **Then** le cube devient immuable pour cette composition et les deux joueurs voient le meme Snapshot avant de se declarer prets.

---

### User Story 2 - Demarrer uniquement quand tout le monde est pret (Priority: P1)

Des qu'au moins deux joueurs humains sont presents, chacun peut se declarer pret. Les sieges inoccupes sont annonces comme attribues aux bots. La Session de draft commence une seule fois, automatiquement lorsque tous les participants humains affiches sont prets. Un joueur peut annuler son etat pret tant que la session n'a pas commence. Une arrivee ou un depart modifie la composition de table et remet tous les humains a l'etat non pret afin d'eviter un depart subi.

**Why this priority**: Le consentement simultane de tous les amis presents est l'invariant de lancement demande.

**Independent Test**: Trois joueurs alternent les etats pret/non pret ; aucun demarrage ne survient avant le dernier accord, puis les trois recoivent le premier booster de la meme session.

**Acceptance Scenarios**:

1. **Given** un seul joueur dans le salon, **When** il tente de se declarer pret, **Then** aucun draft ne demarre et l'attente d'un second joueur reste visible.
2. **Given** trois joueurs dont deux sont prets, **When** le troisieme n'est pas pret, **Then** la session reste en attente et affiche clairement qui manque.
3. **Given** trois joueurs humains tous prets, **When** le dernier confirme, **Then** le salon est verrouille et une unique Session de draft commence avec ces trois humains et cinq bots.
4. **Given** des joueurs prets, **When** un participant rejoint ou quitte le salon avant le depart, **Then** tous les etats pret sont annules et la nouvelle composition doit etre confirmee.

---

### User Story 3 - Drafter ensemble sans chronometre (Priority: P1)

Chaque humain choisit une carte dans son booster selon le parcours visuel du Solo Draft Coach. Il peut inspecter les cartes et consulter son propre pool. Il n'existe pour lui ni limite de temps ni choix automatique. Les bots completant la table choisissent avec leur politique habituelle. Quand les huit sieges ont choisi, les boosters passent ensemble dans le sens prevu pour le pack et le Tour de draft suivant devient disponible. Les choix, boosters et pools des autres sieges restent caches pendant le draft.

**Why this priority**: Les 45 choix synchronises constituent la valeur centrale du Draft multijoueur amical.

**Independent Test**: Une table complete trois packs de quinze cartes avec un joueur volontairement lent ; aucun choix n'est force et chaque pool final contient exactement 45 cartes distinctes.

**Acceptance Scenarios**:

1. **Given** un Tour de draft actif, **When** un joueur confirme une carte, **Then** la carte rejoint son pool, son choix devient immuable et il attend les autres sans voir leurs choix.
2. **Given** au moins un siege humain n'a pas choisi, **When** les autres humains et les bots ont confirme, **Then** aucun booster ne passe et l'interface indique seulement les participants humains encore attendus.
3. **Given** tous les sieges ont choisi, **When** le dernier choix est confirme, **Then** les boosters restants passent une seule fois et tous les joueurs accedent au Tour de draft suivant.
4. **Given** un joueur reste inactif, **When** n'importe quelle duree s'ecoule, **Then** aucune carte n'est choisie a sa place et la session reste reprenable.
5. **Given** le quinzieme Tour du troisieme pack est termine, **When** tous les derniers choix sont confirmes, **Then** chaque joueur accede independamment a son atelier de deck de 40 cartes.
6. **Given** les huit sieges ne sont pas occupes par des humains, **When** la session commence, **Then** chaque place restante est attribuee a un bot et aucun accord pret n'est demande a ces bots.

---

### User Story 4 - Reprendre apres une deconnexion (Priority: P1)

Un joueur momentanement deconnecte peut retrouver sa place, son pool et son Tour de draft en cours. La table attend son retour sans choisir a sa place et sans le remplacer par un bot. Les autres participants voient qu'il est deconnecte, sans acceder a son booster ni a son pool. Si le groupe convient sur Discord que la personne ne reviendra pas, les joueurs abandonnent la session en cours et recommencent un nouveau draft depuis le Salon de draft global, sans conserver les choix precedents.

**Why this priority**: Sans compte a rebours, la contrepartie necessaire est une reprise fiable plutot qu'une session perdue ou bloquee sans explication.

**Independent Test**: Un joueur ferme son navigateur apres plusieurs choix, se reconnecte avec son acces de session et retrouve exactement le meme etat avant de terminer le draft avec la table.

**Acceptance Scenarios**:

1. **Given** un joueur se deconnecte avant son choix, **When** la table l'attend, **Then** son siege est conserve et aucun choix automatique n'est effectue.
2. **Given** un joueur revient dans une session non terminee, **When** son Acces de reprise est reconnu, **Then** il retrouve son booster courant, son pool complet et son etat de choix confirme ou non.
3. **Given** une commande de choix est repetee apres une coupure reseau, **When** elle correspond a un choix deja confirme, **Then** elle ne retire ni n'ajoute une seconde carte et l'etat confirme est renvoye.
4. **Given** un joueur ne reviendra pas, **When** les autres abandonnent la session pour recommencer sans lui, **Then** la session precedente ne peut plus recevoir de choix, le salon global est libere et le nouveau draft repart du premier Tour sans reutiliser les cartes precedentes.
5. **Given** un joueur ouvre son lien ou saisit son code prive sur un autre appareil, **When** la session est encore reprenable, **Then** ce nouvel appareil retrouve le meme siege sans creer de doublon.
6. **Given** une personne connait seulement le pseudo d'un participant, **When** elle tente de reprendre son siege sans l'Acces de reprise, **Then** l'acces au booster et au pool est refuse sans reveler leur contenu.

---

### User Story 5 - Construire un deck de 40 cartes avec le Coach (Priority: P1)

Apres le draft, le Coach de deck propose a chaque joueur un deck principal legal de 40 cartes en selectionnant les cartes coherentes de son pool, dont les terrains non basiques utiles, puis en ajoutant les terrains de base necessaires. Il adapte le rapport sorts/terrains a la courbe, aux couts colores, aux sources non basiques et aux accelerateurs ; il vise normalement 16 a 18 terrains au total et explique tout ecart. Il decrit le plan de jeu, les couleurs principales et eventuels splashs, les synergies ou paquets retenus, la courbe, l'interaction et les contraintes de mana. Le joueur voit les cartes retenues et ecartees, peut modifier librement la proposition et peut demander une nouvelle analyse de sa selection.

La meme mission de recommandation finale amelioree s'applique au Solo Draft Coach afin que le mode existant beneficie des corrections de pertinence. Elle ne modifie ni les conseils pendant les picks humains ni les choix des bots. Une indisponibilite du Coach externe ne bloque jamais la construction manuelle et donne acces a une recommandation locale de repli clairement identifiee. Lorsqu'il consulte un service externe, le Coach ne lui communique que les informations de cartes et de deck necessaires, jamais le pseudo, l'Acces de reprise ou les donnees des autres joueurs.

**Why this priority**: Le joueur doit transformer son pool en liste jouable, et l'amelioration du Coach existant fait explicitement partie de la demande.

**Independent Test**: Sur plusieurs pools temoins mono-, bi- et tricolores, le Coach produit toujours 40 cartes legales, explique ses choix et gere les terrains selon les couts reels et les sources non basiques disponibles.

**Acceptance Scenarios**:

1. **Given** un pool de 45 cartes, **When** le joueur demande une recommandation, **Then** le Coach propose exactement 40 cartes, terrains de base compris, sans ajouter de carte draftee absente du pool et sans imposer un partage fixe 23/17.
2. **Given** un pool avec terrains non basiques, fixeurs, doubles symboles colores et splash possible, **When** le Coach construit le deck, **Then** il compte toutes les sources retenues et dimensionne la base de mana selon les besoins de lancement des sorts, pas seulement selon un total brut de symboles.
3. **Given** un pool contenant un paquet synergique incomplet, **When** le Coach l'evalue, **Then** il ne sacrifie pas automatiquement courbe, interaction ou jouabilite de la mana pour conserver toutes les cartes du theme.
4. **Given** une proposition affichee, **When** le joueur deplace des cartes entre deck et reserve, **Then** sa selection reste modifiable et la legalite des 40 cartes est mise a jour immediatement.
5. **Given** le Coach externe est indisponible ou sa reponse est invalide, **When** une recommandation est demandee, **Then** le joueur recoit une recommandation de repli legale ou poursuit manuellement, avec une explication non bloquante.
6. **Given** les memes donnees de pool et la meme version de recommandation de repli, **When** elles sont analysees plusieurs fois, **Then** la proposition de repli et ses preuves sont identiques.
7. **Given** une proposition contenant moins de 16 ou plus de 18 terrains au total, **When** le joueur consulte l'analyse, **Then** le Coach explique l'ecart par des caracteristiques concretes du deck telles que la courbe, les accelerateurs ou les couts de lancement.
8. **Given** une Session de Solo Draft encore homologuee, **When** le joueur demande au Coach de construire son deck avant le Resultat verrouille, **Then** l'assistance lui est annoncee et retire irreversiblement l'Homologation avant d'afficher la proposition.
9. **Given** une recommandation fait appel a un Coach externe, **When** la demande est preparee, **Then** elle contient uniquement les cartes et le contexte strategique necessaires, sans pseudo, Acces de reprise, cartes d'un autre joueur ni autre donnee d'identite.

---

### User Story 6 - Exporter la liste au format MTGA (Priority: P1)

Chaque joueur peut copier ou telecharger sa liste finale dans un format importable par Magic Arena. L'export contient le deck principal de 40 cartes et la reserve formee des cartes draftees non retenues. Les noms, quantites et terrains de base sont explicites. Si le Snapshot de cube contient une carte indisponible ou ambigue dans Arena, le joueur est averti avant l'export et les cartes concernees sont identifiees.

**Why this priority**: L'export relie directement le draft amical a la possibilite de jouer ensuite la liste dans Arena.

**Independent Test**: Une liste issue d'un Snapshot compatible Arena est collee dans l'importeur de decks Arena sans correction manuelle et reconstitue le deck principal et la reserve attendus.

**Acceptance Scenarios**:

1. **Given** un deck final legal et compatible Arena, **When** le joueur choisit Copier ou Telecharger, **Then** l'export contient une section Deck de 40 cartes et une section Sideboard avec toutes les cartes draftees non retenues.
2. **Given** plusieurs exemplaires d'une meme carte, **When** la liste est exportee, **Then** ils sont regroupes avec la quantite exacte attendue.
3. **Given** une carte non disponible ou non resolue dans Arena, **When** le joueur prepare l'export, **Then** son nom est signale et la compatibilite partielle de la liste est expliquee.
4. **Given** le joueur modifie la proposition du Coach, **When** il exporte, **Then** seule sa derniere selection validee est utilisee.

### Edge Cases

- Deux joueurs se declarent prets presque simultanement : une seule Session de draft est creee et chaque participant recoit un seul siege.
- Un participant quitte le salon au meme instant que le dernier accord : le draft ne commence qu'avec une composition confirmee par tous.
- Un participant tente d'ouvrir le meme siege dans deux onglets : les deux vues convergent vers le meme etat et ne permettent pas deux choix differents au meme Tour.
- Une personne tente de reprendre le siege d'un autre joueur avec son seul pseudo : aucun etat prive n'est revele et aucun choix n'est autorise.
- Deux commandes de choix concurrentes sont envoyees pour le meme siege : une seule carte est confirmee ; l'autre commande recoit l'etat deja engage sans mutation supplementaire.
- Un joueur se deconnecte apres avoir confirme : son choix reste acquis et secret pendant l'attente.
- Un joueur ne revient pas : aucun bot ne prend son siege ; le groupe abandonne la session puis recommence depuis un nouveau salon sans reprendre les choix deja effectues.
- Le service redemarre pendant le salon, le draft ou le deckbuilding : la session est reconstruite depuis ses faits confirmes et aucun choix confirme n'est perdu.
- Le Coach propose une carte absente, un nombre de cartes incorrect ou une base de mana invalide : la proposition externe est rejetee et le repli legal est utilise.
- Un nom de carte possede plusieurs impressions, une face alternative ou des caracteres particuliers : l'export conserve une designation reconnue par Arena ou signale precisement l'ambiguite.
- Un joueur termine son deck avant les autres : il peut exporter sa liste sans attendre leur deckbuilding et sans voir leurs cartes non publiees.
- Le groupe termine son quarante-cinquieme choix alors que certains joueurs construisent encore leur deck : le salon global redevient disponible pour un nouveau groupe sans supprimer les ateliers en cours.
- Le premier joueur quitte le salon avant toute autre arrivee : le salon redevient vide et son choix de cube est efface ; le prochain entrant effectue un nouveau choix.
- Le premier joueur quitte apres l'arrivee d'un deuxieme humain : le cube reste verrouille pour les participants restants jusqu'au demarrage ou a l'abandon du salon.

## Requirements

### Functional Requirements

- **FR-001**: Le systeme MUST proposer un acces Draft multijoueur distinct depuis la navigation existante.
- **FR-002**: Le systeme MUST proposer un unique Salon de draft global auquel tout joueur est invite depuis le menu Draft multijoueur lorsqu'aucune phase de draft multijoueur n'est deja en cours.
- **FR-003**: Le systeme MUST exiger un nom non vide et unique dans le salon pour chaque participant humain.
- **FR-004**: Le salon MUST afficher a tous ses participants la meme composition, le Snapshot de cube choisi et son etat verrouille ou modifiable, les places disponibles et l'etat pret de chaque joueur.
- **FR-005**: Une Session de draft MUST exiger de deux a huit joueurs humains autour d'une table fixe de huit sieges et MUST attribuer chaque siege restant a un bot.
- **FR-006**: Aucun demarrage MUST etre possible tant qu'un participant present n'est pas pret.
- **FR-007**: Toute arrivee ou tout depart avant le demarrage MUST annuler les confirmations pret existantes.
- **FR-008**: Le passage de la derniere confirmation au demarrage MUST verrouiller atomiquement la composition du salon et creer une seule Session de draft.
- **FR-009**: Le systeme MUST attribuer a chaque humain exactement un siege, un booster courant et un pool prive, puis completer les huit sieges avec les bots amis existants dans un ordre stable et visible avant confirmation.
- **FR-010**: Chaque Tour de draft MUST attendre un choix confirme de chacun des huit sieges avant de faire passer les boosters ensemble ; les bots choisissent selon leur politique sans imposer de delai aux humains.
- **FR-011**: Le systeme MUST appliquer les sens de rotation gauche, droite, gauche aux trois packs successifs.
- **FR-012**: Le systeme MUST permettre 45 choix par siege, repartis en trois packs de quinze cartes, pour les huit sieges humains ou bots.
- **FR-013**: Le systeme MUST n'imposer aucune limite de temps, aucun choix par defaut et aucune prise de controle automatique d'un siege humain.
- **FR-014**: Avant la fin du draft, un participant MUST voir son propre booster et son pool, mais MUST NOT voir les cartes, boosters ou choix secrets des autres participants.
- **FR-015**: Un choix confirme MUST etre immuable, applique une seule fois et conserve avant d'annoncer le Tour suivant.
- **FR-016**: Le systeme MUST conserver et reconstruire le salon, la Session de draft, les choix confirmes, les pools et la phase de deckbuilding apres reconnexion ou redemarrage.
- **FR-017**: Un participant presentant son Acces de reprise valide MUST pouvoir reprendre son siege sur le meme navigateur ou un autre appareil sans creer un second participant ni rejouer ses choix confirmes.
- **FR-018**: A la fin des 45 choix, chaque joueur MUST acceder independamment a un atelier contenant son pool complet, son deck principal, sa reserve et les terrains de base disponibles sans limite de quantite.
- **FR-019**: Le Coach de deck MUST proposer exactement 40 cartes legales composees uniquement de cartes du pool du joueur et de terrains de base autorises, sans imposer une repartition fixe de 23 cartes draftees et 17 terrains de base.
- **FR-020**: Le Coach MUST analyser le plan de jeu, les couleurs, les eventuels splashs, la qualite individuelle, les paquets synergiques complets, la courbe, l'interaction et la jouabilite de la base de mana, en comptant les terrains non basiques et les autres sources retenues.
- **FR-021**: Le Coach MUST expliquer les inclusions et exclusions structurantes avec des cartes concretes et des relations de cause a effet.
- **FR-022**: Le joueur MUST pouvoir accepter, modifier ou ignorer la recommandation et obtenir une nouvelle analyse de sa selection courante.
- **FR-023**: Le contrat de construction finale ameliore MUST etre partage avec le Solo Draft Coach et valide contre ses cas de non-regression.
- **FR-024**: Une recommandation externe invalide, indisponible ou trop lente MUST NOT bloquer le deckbuilding ; une recommandation locale legale et identifiee MUST etre disponible.
- **FR-025**: La validation de legalite, le Score de deck et leurs preuves MUST rester auditable et independante d'un modele externe opaque.
- **FR-026**: Le systeme MUST permettre de copier et telecharger la derniere liste validee au format MTGA.
- **FR-027**: L'export MUST contenir un deck principal de 40 cartes et une reserve regroupant toutes les cartes draftees non retenues, avec des quantites exactes.
- **FR-028**: Le systeme MUST identifier avant l'export toute carte inconnue, ambigue ou indisponible dans Arena et expliquer l'impact sur l'import.
- **FR-029**: Le Draft multijoueur MUST etre utilisable au clavier sur ordinateur et sur une largeur d'ecran de 360 px sans masquer les actions critiques.
- **FR-030**: Le Draft multijoueur MUST NOT alimenter le Mur des Records, attribuer des trophees ou etre presente comme un Draft homologue ; ces regles restent propres au Solo Draft Coach.
- **FR-031**: Le Salon de draft global MUST refuser toute nouvelle participation pendant une phase de draft en cours et MUST redevenir disponible pour un nouveau groupe lorsque les 45 Tours sont termines, sans interrompre les ateliers de deck precedents.
- **FR-032**: Un siege humain deconnecte MUST rester reserve sans remplacement par un bot ; si le groupe abandonne la session, celle-ci MUST etre cloturee sans reutilisation de ses choix et le Salon de draft global MUST redevenir disponible pour un nouveau depart.
- **FR-033**: Le Coach MUST viser normalement 16 a 18 terrains au total et MUST justifier tout nombre inferieur ou superieur par des proprietes concretes du deck recommande.
- **FR-034**: A la creation d'un siege humain, le systeme MUST remettre un Acces de reprise prive propre a ce siege, le memoriser dans le navigateur courant et permettre au joueur de le copier pour un autre appareil sans l'exposer aux autres participants.
- **FR-035**: Le pseudo seul MUST NOT autoriser la reprise d'un siege ni l'acces a son booster, son pool ou ses choix prives.
- **FR-036**: Le premier joueur rejoignant un Salon de draft global vide MUST choisir le cube et MUST pouvoir modifier ce choix uniquement tant qu'il demeure le seul humain present.
- **FR-037**: L'arrivee d'un deuxieme humain MUST verrouiller le cube choisi pour la composition courante ; le depart ulterieur du premier joueur MUST NOT deverrouiller ni modifier ce cube tant que le salon ne redevient pas vide.
- **FR-038**: Cette feature MUST NOT modifier les conseils fournis pendant les picks humains ni les politiques de choix des bots ; son amelioration IA se limite a la construction finale du deck.
- **FR-039**: Toute sollicitation d'un Coach externe MUST limiter ses donnees aux cartes et au contexte strategique necessaires et MUST exclure les pseudos, Acces de reprise, donnees d'identite et cartes privees des autres joueurs.
- **FR-040**: Dans le Solo Draft Coach, demander une construction de deck assistee avant le Resultat verrouille MUST retirer irreversiblement l'Homologation apres avertissement et avant affichage de la recommandation.
- **FR-041**: Le deroulement des 45 Tours de draft MUST rester independant de la disponibilite du Coach externe ; une panne de ce Coach MUST NOT interrompre une Session de draft chargee.

### Key Entities

- **Salon de draft**: Rassemblement global unique avant le depart, identifie par le Snapshot de cube choisi par son premier entrant, l'etat verrouille de ce choix, son propre etat et sa composition courante.
- **Participant multijoueur**: Joueur humain identifie dans un salon, avec un nom affiche, un Acces de reprise prive, un siege eventuel, un etat de presence et un etat pret.
- **Composition de table**: Ensemble ordonne de huit sieges comprenant de deux a huit humains et les bots qui completent les places restantes, affiche avant le demarrage.
- **Session de draft**: Execution verrouillee liee a un Snapshot de cube, une composition de table, une graine et une version de regles.
- **Tour de draft**: Etape commune reliant les boosters courants, les choix confirmes et le passage simultane vers le tour suivant.
- **Choix de joueur**: Attribution immuable et privee d'une carte precise au pool d'un participant pour un Tour de draft donne.
- **Pool de joueur**: Ensemble des cartes obtenues par un participant au fil des 45 choix.
- **Proposition du Coach**: Deck principal recommande de 40 cartes a composition flexible, terrains draftes et de base, reserve, analyse strategique, explications, provenance et version de mission.
- **Liste finale**: Selection de 40 cartes validee par le joueur, distincte de la proposition du Coach et source de l'export.
- **Export MTGA**: Representation copiable ou telechargeable de la Liste finale et de sa reserve, avec son etat de compatibilite Arena.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Dans 100 % des essais, une session ne commence ni avec moins de deux humains ni avant l'accord de tous les participants affiches.
- **SC-002**: Apres la derniere confirmation, tous les participants voient leur premier booster de la meme session en moins de 2 secondes dans 95 % des essais usuels.
- **SC-003**: Sur 100 sessions automatisees incluant des confirmations simultanees, aucune session dupliquee, aucun siege duplique et aucun double choix n'est observe.
- **SC-004**: Apres une reconnexion ou un redemarrage simule a chaque phase critique, 100 % des choix deja confirmes, pools et compositions de table sont reconstruits sans divergence.
- **SC-005**: Une table peut rester au moins 24 heures sur un choix sans choix automatique, perte de session ou corruption, puis reprendre normalement.
- **SC-006**: 100 % des propositions acceptees par l'atelier contiennent exactement 40 cartes legales, aucune carte draftee absente du pool concerne et une justification explicite lorsqu'elles sortent de la plage habituelle de 16 a 18 terrains.
- **SC-007**: Sur le Corpus temoin de ligue et des pools solo de regression, des relecteurs experts jugent la nouvelle recommandation au moins aussi pertinente que l'existante dans 80 % des cas, sans erreur critique de legalite, de couleur principale, de paquet indispensable ou de mana.
- **SC-008**: Pour chaque proposition, un joueur peut identifier en moins de 30 secondes le plan principal, les couleurs, une force et un risque du deck grace aux explications affichees.
- **SC-009**: 100 % des exports issus d'un Snapshot compatible Arena sont importes sans correction manuelle et reproduisent exactement le deck principal de 40 cartes et la reserve attendue.
- **SC-010**: Les parcours rejoindre, se declarer pret, choisir une carte, modifier le deck et exporter restent complets a 360 px et sont entierement realisables au clavier sur ordinateur.
- **SC-011**: Au cours d'un test utilisateur amical avec au moins quatre participants, chacun termine le draft et exporte sa liste sans aide technique exterieure.
- **SC-012**: Dans 100 % des essais, un Acces de reprise valide restaure le siege attendu sans doublon, tandis qu'un pseudo seul ou un acces invalide ne revele aucune carte privee et ne permet aucun choix.

## Assumptions

- Le Draft multijoueur est une experience amicale non homologuee ; chrono competitif, Mur des Records, trophees, tournoi suisse, matchmaking, chat vocal et lancement automatique d'Arena sont hors perimetre.
- L'amelioration du conseil pendant les picks et l'evolution des politiques des bots sont hors perimetre ; elles pourront faire l'objet d'une feature et de criteres de calibration distincts.
- Les participants coordonnent oralement sur Discord toute decision d'abandon et de nouveau depart ; DraftMaster ne fournit ni chat ni vote integre pour cette decision.
- Aucun compte DraftMaster n'est requis pour participer ; l'Acces de reprise prive, et non le pseudo affiche, protege chaque siege.
- Le Snapshot de cube est fixe avant la premiere confirmation pret et ne peut plus changer apres le demarrage.
- Le premier entrant d'un salon vide choisit le cube sans recevoir d'autre pouvoir particulier ; l'arrivee du deuxieme humain verrouille ce choix jusqu'a ce que le salon redevienne vide.
- Le draft suit une table fixe de huit sieges, trois packs de quinze cartes et un passage synchronise par Tour de draft, comme le moteur existant.
- L'acces global unique autorise un seul groupe en phase de draft a la fois ; les ateliers de deck deja ouverts restent independants et ne bloquent pas le groupe suivant.
- Chaque joueur construit et exporte son deck independamment apres les 45 choix ; il n'attend pas la finalisation des autres decks.
- Les terrains de base sont disponibles sans limite pendant le deckbuilding et ne font pas partie des 45 cartes draftees.
- Le nombre de cartes provenant du pool et le nombre de terrains de base ne sont pas fixes ; seuls le total de 40 cartes, la legalite et la justification de la base de mana sont obligatoires.
- Le choix entre Gemini, DeepSeek ou un autre Coach externe sera compare dans le plan selon qualite, confidentialite, cout, latence et disponibilite ; la mission fonctionnelle reste identique.
- Les cartes du Snapshot disposent d'une identite canonique ; une compatibilite Arena incomplete est signalee plutot que masquee.
- Les sessions non terminees sont conservees assez longtemps pour permettre une pause entre amis d'au moins 24 heures ; la politique de retention detaillee sera fixee au plan sans reduire ce minimum.

## Dependencies

- Le parcours visuel et les interactions de carte du Solo Draft Coach servent de reference d'experience.
- Le moteur de draft, le Journal de draft, les Snapshots de cube, l'evaluateur cinq axes et le recommandateur de deck existants doivent rester compatibles ou disposer d'une migration explicite.
- La mise en oeuvre requiert un stockage durable et une synchronisation partagee ; la memoire volatile d'un processus ne suffit pas a tenir les criteres de reprise.
- Un corpus de pools avec avis expert est necessaire pour demontrer que le Coach partage entre solo et multijoueur est reellement plus pertinent.
