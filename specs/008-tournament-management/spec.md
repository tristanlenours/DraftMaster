# Feature Specification: Gestion de tournois de cube

**Feature Branch**: `008-tournament-management`

**Created**: 2026-09-21

**Status**: Planned - awaiting reviewer gate before implementation

**Issue**: [#80](https://github.com/tristanlenours/DraftMaster/issues/80)

**Input**: User description: "Créer un tournoi MTG simple à la MTGMelee : ajouter les joueurs et le nom de leur deck, choisir un cube, lancer des rondes suisses ou, à trois, faire jouer tout le monde contre tout le monde, enregistrer les résultats dans le temps et pouvoir ajouter des cartes clés manuellement ou par reconnaissance d'une photo."

## Scope

Cette feature remplace le teaser Tournois existant par un parcours opérationnel pour un Organisateur de tournoi. La première livraison couvre la création, les Appariements, les Résultats de match, l'historique et la saisie manuelle de Cartes clés de deck descriptives. La reconnaissance depuis une photo est sortie de ce périmètre et suivie séparément par l'Issue [#81](https://github.com/tristanlenours/DraftMaster/issues/81), afin de ne pas bloquer le tournoi manuel sur un choix de fournisseur de vision.

Le Tournoi de cube ouvre un jalon distinct du premier jalon Solo Draft Coach. Il ne modifie ni les règles d'Homologation, ni le Mur des Records, ni les Sessions de draft déjà existantes.

## User Scenarios & Testing

### User Story 1 - Créer et préparer un tournoi (Priority: P1)

Depuis la vue Tournois, un Organisateur de tournoi crée un tournoi nommé, choisit un Snapshot de cube, sélectionne son format et inscrit les participants. Pour chaque Participant de tournoi, il renseigne un nom unique et le nom du Deck déclaré, généralement son archétype. Il peut corriger la composition tant que le tournoi n'a pas commencé.

**Why this priority**: Sans configuration complète et compréhensible, aucun Appariement fiable ne peut être créé.

**Independent Test**: Un organisateur crée un tournoi, sélectionne un cube, ajoute quatre participants avec leurs decks et retrouve exactement cette préparation après avoir quitté puis rouvert la vue.

**Acceptance Scenarios**:

1. **Given** la vue Tournois, **When** l'organisateur crée un tournoi avec un nom, un format et un Snapshot de cube valides, **Then** le tournoi préparé est enregistré et apparaît dans son historique.
2. **Given** un tournoi en préparation, **When** l'organisateur ajoute un participant avec un nom et un nom de deck non vides, **Then** le participant apparaît dans la liste avec son Deck déclaré.
3. **Given** un nom de participant déjà utilisé dans ce tournoi, **When** l'organisateur tente de l'ajouter à nouveau, **Then** l'ajout est refusé sans modifier les inscriptions existantes.
4. **Given** un tournoi qui n'a pas commencé, **When** l'organisateur modifie le cube, le format ou un participant, **Then** la préparation enregistrée reflète la dernière configuration valide.
5. **Given** un tournoi déjà commencé, **When** l'organisateur tente de modifier le Snapshot de cube, le format ou la liste des participants, **Then** la modification est refusée et la composition de départ reste inchangée.
6. **Given** aucun tournoi enregistré, **When** l'organisateur ouvre la vue, **Then** un état vide explique la situation et propose directement de créer le premier tournoi.
7. **Given** une sauvegarde en cours ou indisponible, **When** l'organisateur consulte le formulaire, **Then** l'état attente ou erreur est annoncé, les données déjà saisies restent présentes et une nouvelle soumission contrôlée est possible.

---

### User Story 2 - Lancer et suivre des rondes suisses (Priority: P1)

Lorsque la préparation est complète, l'Organisateur de tournoi lance le tournoi. La première Ronde de tournoi est publiée immédiatement. Après confirmation de tous ses Résultats de match, la ronde suivante apparie en priorité des participants ayant des résultats proches, évite les rencontres déjà jouées lorsque cela reste possible et répartit équitablement les exemptions.

**Why this priority**: Les Appariements suisses constituent le cœur opérationnel du tournoi demandé.

**Independent Test**: Un tournoi suisse de cinq participants déroule trois rondes complètes sans qu'un participant joue deux matchs dans la même ronde et sans seconde exemption tant que tous n'en ont pas reçu une.

**Acceptance Scenarios**:

1. **Given** un tournoi suisse valide avec au moins deux participants, **When** l'organisateur le lance, **Then** le Snapshot de cube et les inscriptions sont verrouillés et chaque participant reçoit exactement un match ou une exemption dans la première ronde.
2. **Given** une ronde comportant des résultats manquants, **When** l'organisateur demande la ronde suivante, **Then** la création est refusée et les matchs à compléter sont indiqués.
3. **Given** une ronde entièrement confirmée, **When** la ronde suivante est créée, **Then** ses Appariements tiennent compte du classement courant, évitent les rematches lorsque possible et sont reproductibles à partir du même historique.
4. **Given** un nombre impair de participants, **When** une ronde est créée, **Then** un seul participant reçoit une exemption et aucun participant n'en reçoit une deuxième avant que tous les autres éligibles en aient reçu une.
5. **Given** la dernière ronde prévue entièrement confirmée, **When** le tournoi est finalisé, **Then** le classement final et tous les Appariements deviennent consultables dans l'historique.

---

### User Story 3 - Enregistrer les résultats et le classement (Priority: P1)

Pour chaque Match de tournoi, l'organisateur saisit les parties gagnées par chaque participant et les éventuelles parties nulles. Le résultat confirmé met à jour le classement. Une correction ultérieure reste possible, mais l'ancienne valeur, la nouvelle valeur et leur ordre sont conservés afin que l'historique ne soit jamais réécrit silencieusement.

**Why this priority**: Les rondes suivantes et la valeur historique du tournoi dépendent de résultats fiables et auditables.

**Independent Test**: Après la saisie puis la correction d'un résultat, le classement correspond à la valeur corrigée tandis que les deux versions restent consultables dans l'ordre.

**Acceptance Scenarios**:

1. **Given** un match publié entre deux participants, **When** l'organisateur confirme des nombres entiers de victoires A, victoires B et parties nulles compris entre 0 et 9, dont le total est supérieur à zéro, **Then** le côté ayant le plus de victoires gagne ou, à égalité de victoires, le match est nul ; les points et le classement sont recalculés.
2. **Given** une valeur négative, non entière, supérieure à 9, un total nul ou un forfait autre que 2-0 ou 0-2 sans partie nulle, **When** l'organisateur tente de confirmer ce score, **Then** le résultat est refusé sans changer le classement.
3. **Given** un résultat déjà confirmé, **When** l'organisateur le corrige, **Then** le classement reflète la correction et les deux versions du Résultat de match restent historisées.
4. **Given** un tournoi passé, **When** il est rouvert depuis l'historique, **Then** son cube, ses participants, leurs decks, ses rondes, ses résultats et son classement final sont disponibles.

---

### User Story 4 - Jouer toutes les rencontres à trois (Priority: P2)

Avec exactement trois participants, l'organisateur peut choisir le format toutes-rondes à trois. Trois matchs sont alors répartis sur trois rondes : chaque paire se rencontre une fois et chaque participant bénéficie d'une Pause toutes-rondes sans point.

**Why this priority**: Ce format évite un classement suisse artificiel pour le cas amical très courant de trois joueurs.

**Independent Test**: Pour Alice, Bob et Chloé, le tournoi produit exactement Alice-Bob, Alice-Chloé et Bob-Chloé, sans doublon, avec une rencontre par ronde.

**Acceptance Scenarios**:

1. **Given** exactement trois participants et le format toutes-rondes à trois, **When** le tournoi commence, **Then** les trois rencontres uniques sont planifiées sur trois rondes et chacun est en pause une fois sans recevoir de point.
2. **Given** un nombre de participants différent de trois, **When** l'organisateur sélectionne ce format, **Then** le démarrage est refusé avec une explication et aucune ronde n'est créée.
3. **Given** les trois résultats confirmés, **When** le tournoi est finalisé, **Then** le classement utilise les mêmes points et départages que le format suisse en ne comptant que les matchs réellement joués.

---

### User Story 5 - Décrire les decks avec des cartes clés (Priority: P2)

L'organisateur peut enrichir le Deck déclaré d'un participant en recherchant puis confirmant des Cartes clés de deck présentes dans le Snapshot de cube sélectionné. Ces cartes aident à raconter le métagame du tournoi sans influencer les Appariements ni les points.

**Why this priority**: Les cartes clés donnent du contexte aux archétypes tout en gardant la première version simple.

**Independent Test**: Une carte du cube est ajoutée manuellement au deck d'un participant, réapparaît dans l'historique et ne modifie ni son score ni ses adversaires.

**Acceptance Scenarios**:

1. **Given** un Deck déclaré, **When** l'organisateur recherche une carte du Snapshot de cube et la confirme, **Then** elle est associée au deck et visible dans le tournoi courant comme dans l'historique.
2. **Given** une carte absente du Snapshot de cube, **When** l'organisateur tente de l'ajouter, **Then** l'ajout est refusé sans créer de carte ambiguë.
3. **Given** une Carte clé de deck enregistrée, **When** le classement ou les Appariements sont recalculés, **Then** cette carte n'a aucun effet sur le résultat.

### Edge Cases

- Deux commandes de démarrage arrivent presque simultanément : une seule première ronde est créée.
- Deux résultats sont soumis presque simultanément pour le même match : une seule version est courante et toute correction acceptée reste ordonnée dans l'historique.
- Un participant se retire après le démarrage : sa suppression est refusée ; l'organisateur peut enregistrer ses matchs restants comme abandons sans réécrire les rondes passées.
- Un tournoi impair doit attribuer une exemption alors que plusieurs participants sont à égalité : la décision est stable, explicable et favorise ceux qui n'en ont jamais reçu.
- Éviter à la fois un rematch et un écart de classement est impossible : le système choisit un Appariement valide, signale le rematch inévitable et ne laisse personne sans match ni exemption.
- Une correction de résultat après la création de la ronde suivante changerait le classement source : la correction est conservée, le classement courant est recalculé, mais les Appariements déjà publiés ne sont pas réécrits.
- Plusieurs impressions, faces ou langues représentent la même carte : la Carte clé de deck conserve une identité de carte unique et un libellé non ambigu.
- Le Snapshot de cube utilisé lors d'un ancien tournoi n'est plus le snapshot actif : l'historique continue de référencer la version verrouillée au démarrage.
- Une réponse arrive après qu'une autre personne a modifié le tournoi : l'interface conserve la saisie locale, affiche le conflit de révision et demande de recharger avant une nouvelle confirmation.

## Requirements

### Functional Requirements

- **FR-001**: Le système MUST remplacer le teaser Tournois par un accès permettant de créer un Tournoi de cube et de consulter les tournois précédents.
- **FR-002**: Un Tournoi de cube MUST avoir un nom non vide, un format, un nombre de rondes prévu et exactement un Snapshot de cube sélectionné avant son démarrage.
- **FR-003**: L'organisateur MUST pouvoir ajouter, modifier et retirer des Participants de tournoi avant le démarrage.
- **FR-004**: Chaque Participant de tournoi MUST avoir un nom non vide et unique dans le tournoi ainsi qu'un nom de Deck déclaré non vide.
- **FR-005**: Le Snapshot de cube, le format, le nombre de rondes et les participants MUST devenir immuables au démarrage.
- **FR-006**: La première version du format suisse MUST accepter de deux à trente-deux participants et créer pour chaque ronde un match ou une exemption par participant.
- **FR-007**: Les Appariements suisses après la première ronde MUST privilégier des scores proches, éviter les rencontres déjà jouées lorsque possible et attribuer équitablement les exemptions.
- **FR-008**: Un Appariement MUST être déterministe et explicable à partir de la configuration verrouillée et des Résultats de match confirmés avant la publication de sa ronde.
- **FR-009**: Le format toutes-rondes à trois MUST être disponible uniquement pour exactement trois participants, MUST produire chaque paire exactement une fois sur trois rondes et MUST donner à chacun une Pause toutes-rondes sans point ni partie fictive.
- **FR-010**: La ronde suivante MUST NOT être publiée tant que chaque match non exempt de la ronde courante ne possède pas un Résultat de match confirmé.
- **FR-011**: Un Résultat de match joué MUST enregistrer trois entiers compris entre 0 et 9 pour les victoires A, victoires B et parties nulles, avec un total supérieur à zéro ; le participant ayant le plus de victoires gagne et une égalité de victoires produit un match nul. Un forfait MUST être exactement 2-0 ou 0-2 sans partie nulle. L'issue et les points MUST être dérivés sans saisie redondante.
- **FR-012**: Le classement MUST attribuer trois points pour une victoire de match ou une Exemption suisse, un point pour un match nul et zéro point pour une défaite ; une Exemption suisse MUST compter comme une victoire 2-0 mais MUST être exclue des moyennes calculées à partir des adversaires.
- **FR-013**: Les égalités de points MUST être départagées dans cet ordre par le pourcentage de victoires de match des adversaires, le pourcentage personnel de parties gagnées puis le pourcentage de parties gagnées des adversaires ; une égalité complète MUST rester affichée comme ex æquo.
- **FR-014**: Une correction de Résultat de match, y compris après finalisation, MUST conserver les versions précédentes, identifier l'ordre des corrections et recalculer le classement courant sans modifier les Appariements déjà publiés.
- **FR-015**: Le système MUST conserver durablement et sans expiration automatique la configuration, le Snapshot archivé, les Decks déclarés, les Appariements, les résultats, les corrections, le classement et les preuves d'idempotence de chaque tournoi.
- **FR-016**: L'historique MUST permettre d'ouvrir un tournoi en préparation, en cours ou terminé et d'en reconstruire l'état sans dépendre du Snapshot de cube actuellement actif.
- **FR-017**: L'organisateur MUST pouvoir ajouter ou retirer manuellement, avant ou après finalisation, des Cartes clés de deck choisies uniquement dans le Snapshot de cube du tournoi.
- **FR-018**: Les Cartes clés de deck MUST NOT influencer les Appariements, les résultats ni le classement.
- **FR-019**: Les actions critiques de création, démarrage, saisie de résultat et consultation MUST rester complètes à 360 px et réalisables au clavier sur ordinateur.
- **FR-020**: Le système MUST appliquer les contrôles d'accès existants à toute consultation ou mutation d'un tournoi ; la première version MUST NOT ajouter de compte individuel ni de propriété technique par organisateur.
- **FR-021**: Le Tournoi de cube MUST rester distinct d'une Session de draft, d'un Draft homologué, du Mur des Records et du Score de deck.
- **FR-022**: La vue Tournois MUST définir des états accessibles pour historique vide, chargement, stockage indisponible et conflit de révision ; une erreur MUST préserver la saisie non confirmée et proposer une récupération explicite.
- **FR-023**: Le système MUST mesurer de façon structurée les indisponibilités du stockage, conflits de révision, rematches forcés et latences, sans journaliser de secret ni le contenu libre des formulaires.
- **FR-024**: Une mutation MUST être annoncée comme réussie uniquement après sa transaction durable ; une indisponibilité, un timeout ou un redémarrage MUST produire soit la mutation atomique complète, soit une erreur exploitable sans mutation partielle ni fallback local silencieux.

### Key Entities

- **Tournoi de cube**: Agrégat identifié par son nom, son état, son format, son nombre de rondes, son Snapshot de cube verrouillé et son Organisateur de tournoi.
- **Organisateur de tournoi**: Personne autorisée à préparer le tournoi, publier les rondes et confirmer ou corriger les résultats.
- **Participant de tournoi**: Joueur inscrit, identifié dans le tournoi par un nom unique et associé à un Deck déclaré.
- **Deck déclaré**: Nom d'archétype public et collection facultative de Cartes clés de deck confirmées.
- **Ronde de tournoi**: Étape ordonnée contenant les Matchs de tournoi publiés à partir de l'état connu avant sa création.
- **Match de tournoi**: Rencontre entre deux participants, ou exemption, avec un état et un Résultat de match éventuel.
- **Résultat de match**: Version ordonnée d'un score confirmé, source des points et du classement courant.
- **Classement de tournoi**: Vue ordonnée dérivée des résultats courants selon les points et départages annoncés.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Depuis l'ouverture de la vue Tournois vide jusqu'à l'affichage de la première ronde, un organisateur peut créer un tournoi de quatre participants, sélectionner un cube et le lancer en moins de 3 minutes sans aide technique.
- **SC-002**: Dans 100 % des simulations de 2 à 32 participants, chaque ronde suisse assigne exactement un match ou une exemption à chaque participant, sans doublon dans la ronde et sans rematch lorsqu'un oracle de faisabilité indépendant établit qu'un Appariement sans rematch existe.
- **SC-003**: Dans 100 % des simulations impaires, aucun participant ne reçoit une seconde exemption tant qu'un autre participant éligible n'en a jamais reçu.
- **SC-004**: Pour trois participants en toutes-rondes, les trois paires possibles apparaissent exactement une fois et chacun est en Pause toutes-rondes exactement une fois sans point ajouté.
- **SC-005**: Deux reconstructions du même tournoi à partir du même historique produisent les mêmes rondes publiées, les mêmes résultats courants et le même classement.
- **SC-006**: Après toute correction acceptée, 100 % des anciennes versions restent consultables et le classement courant correspond à la dernière version.
- **SC-007**: Après fermeture puis réouverture de l'application, 100 % des tournois de contrôle conservent leur cube versionné, leurs participants, decks, rondes, résultats et classement.
- **SC-008**: Les parcours créer, lancer, saisir un résultat et consulter l'historique restent complets à 360 px et sont entièrement réalisables au clavier sur ordinateur.
- **SC-009**: Lors d'un test utilisateur avec au moins un organisateur et quatre participants, toutes les rondes sont terminées et le classement final est retrouvé sans recours à une feuille de calcul externe.
- **SC-010**: Pour un historique de 100 tournois et un tournoi actif de 32 participants, 95 % des créations, mutations et consultations affichent leur nouvel état ou une erreur exploitable en moins de 2 secondes dans l'environnement de mesure documenté.

## Assumptions

- La première version est collaborative entre les membres admis par les contrôles d'accès de guilde existants : tout membre admis peut administrer un tournoi. L'Organisateur de tournoi est un rôle fonctionnel, pas un compte propriétaire. La feature ne fournit ni inscription publique ni compte individuel de participant.
- Le nombre de rondes suisses proposé par défaut est le plus petit entier permettant de distinguer le nombre de participants par éliminations successives, soit une ronde à deux participants, deux rondes de trois à quatre, trois de cinq à huit, quatre de neuf à seize et cinq de dix-sept à trente-deux. L'organisateur peut le modifier avant le démarrage.
- L'OMW% est la moyenne des MWP% des adversaires effectivement rencontrés, chacun ramené au minimum à `1/3`. Le GWP% personnel est le rapport exact entre points de partie gagnés et points de partie possibles. L'OGW% est la moyenne des GWP% adverses, chacun ramené au minimum à `1/3`. Une moyenne sans adversaire éligible vaut zéro, les Exemptions suisses sont exclues des moyennes adverses et aucun arrondi intermédiaire n'est appliqué. L'ordre seedé stabilise l'affichage des ex æquo et les Appariements sans être présenté comme un départage compétitif supplémentaire.
- Une Exemption suisse vaut une victoire 2-0 et trois points de match ; une Pause toutes-rondes ne vaut aucun point et ne crée aucune partie gagnée fictive.
- Les matchs sont généralement joués au meilleur de trois parties ; la borne de 9 par compteur permet de consigner les rares parties supplémentaires tout en rejetant les valeurs manifestement accidentelles.
- La correction d'un résultat ne régénère jamais une ronde déjà publiée ; elle peut donc modifier le classement courant sans réécrire les adversaires réellement annoncés.
- Les Cartes clés de deck décrivent le deck et ne constituent pas une liste complète ni une validation de légalité.
- La reconnaissance photo est hors périmètre de cette feature et suivie dans l'Issue #81 ; aucune interface, dépendance ou colonne dédiée à la vision n'est ajoutée ici.
- La première version ne fournit aucune suppression ni expiration automatique des tournois, Snapshots archivés, événements ou reçus d'idempotence ; une politique d'archivage ou de suppression devra être spécifiée avant d'ajouter cette capacité.
- Chronomètre, tours additionnels, playoffs, QR code, auto-inscription, paiement, import ou export MTGMelee, validation complète de deck et arbitrage de règles sont hors périmètre.

## Dependencies

- Le registre des cubes et les Snapshots de cube existants fournissent les cubes sélectionnables et l'identité canonique des cartes.
- Les contrôles d'accès de guilde existants admettent les membres autorisés sans les distinguer individuellement ; tout membre admis peut administrer un tournoi dans cette première version collaborative.
- Un stockage durable est requis avant que l'historique puisse être considéré comme livré ; une conservation uniquement en mémoire ou dans le navigateur ne satisfait pas cette feature.
