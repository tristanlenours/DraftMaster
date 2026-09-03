# Feature Specification: Simuler un draft Titou reproductible

**Feature Branch**: `001-simulate-titou-draft`

**Created**: 2026-09-02

**Status**: Draft

**Input**: User description: "Simuler un draft complet et reproductible sur une version figée du cube Titou, avec un participant contrôlé, sept bots déterministes, un journal auditable et un rapport final, sans interface graphique ni scoring."

## Clarifications

### Session 2026-09-02

- Q: Pour le premier livrable en ligne de commande, comment le siège piloté doit-il effectuer ses 45 choix ? → A: La commande automatise les huit sièges avec une politique aléatoire seedée ; le moteur accepte aussi des choix explicites pour le siège pilotable.

### Session 2026-09-03

- Q: Le journal doit-il être autonome pour permettre la relecture sans fichier externe ? → A: Oui. Il embarque dès son événement initial le snapshot normalisé complet utilisé, avec ses 545 instances initiales, sa provenance et ses versions, sans images ni données superflues. La relecture utilise les choix enregistrés sans recalculer les bots ; la re-simulation vérifie séparément leur reproductibilité. Le surcoût de taille de chaque rapport est accepté.
- Q: Le nombre de cartes inutilisées doit-il s'adapter aux futures versions du cube Titou ? → A: Oui. Le snapshot initial conserve 545 instances. Pour toute version valide du même cube contenant N instances, avec N ≥ 360, le draft distribue toujours 360 instances et en conserve N − 360 inutilisées : 185 pour N = 545, 180 pour N = 540 et aucune pour N = 360. Un snapshot de moins de 360 instances est refusé ; les huit sièges et les trois boosters de quinze cartes par siège ne changent pas.
- Q: Quels éléments exclure du calcul de l'empreinte fonctionnelle du rapport ? → A: L'identifiant de session, les horodatages et l'empreinte elle-même. Le calcul conserve les cartes, les choix et leur ordre, la configuration, la seed et les versions. Deux drafts aux mêmes entrées et contenu fonctionnels doivent avoir la même empreinte, même lancés à des moments différents ; une empreinte enregistrée doit être vérifiée par recalcul, et non incluse dans son propre calcul.
- Q: Comment mesurer le budget de deux secondes ? → A: Sur le poste de l'utilisateur documenté comme référence, avec le snapshot initial déjà chargé et validé. Mesurer un draft complet, son rapport et son empreinte jusqu'au JSON prêt à être écrit. Effectuer trois passages d'échauffement puis cinq mesures, chacune strictement sous deux secondes. Exclure le démarrage du runtime et l'écriture disque, vérifiés séparément par les tests fonctionnels.
- Q: Les versions du moteur et des politiques automatisées doivent-elles être verrouillées pendant le draft ? → A: Oui. La version du moteur et, pour chaque siège automatisé, l'identifiant et la version de sa politique sont fixés dès la création et inscrits dans l'événement initial. Aucun changement de politique ou de version n'est autorisé dans cette session ; une nouvelle version s'applique aux nouvelles sessions. Les choix explicites du siège pilotable restent possibles sans changer sa politique automatisée déclarée.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Simuler un draft complet (Priority: P1)

Un contributeur lance une simulation automatisée sur le cube Titou. La commande pilote les huit sièges avec une politique aléatoire seedée et produit un draft complet conforme aux règles retenues, utilisable comme fondation des futures interfaces.

**Why this priority**: Sans simulation complète et correcte, aucune logique de coaching, de bot intelligent ou d'interface ne peut être construite avec confiance.

**Independent Test**: Démarrer une simulation automatisée avec un snapshot valide, la laisser aller à son terme, puis vérifier que les huit participants possèdent chacun 45 cartes.

**Acceptance Scenarios**:

1. **Given** le snapshot validé du cube Titou, **When** une nouvelle session est lancée, **Then** 24 boosters de 15 cartes sont constitués sans réutiliser une même instance de carte.
2. **Given** une session automatisée en cours, **When** un tour est traité, **Then** chaque participant choisit une carte légale et les boosters avancent selon le sens du paquet courant.
3. **Given** une session comportant un siège pilotable, **When** l'appelant soumet un choix explicite légal pour ce siège, **Then** ce choix remplace la décision automatisée attendue pour ce tour sans modifier les règles des autres sièges.
4. **Given** 45 tours valides, **When** le dernier tour se termine, **Then** la session est terminée et chacun des huit participants possède exactement 45 cartes.

---

### User Story 2 - Rejouer une simulation (Priority: P2)

Un contributeur peut relancer un draft avec la même version de cube, la même seed, la même politique automatisée et, le cas échéant, les mêmes choix explicites afin de reproduire la distribution et le résultat.

**Why this priority**: La reproductibilité permet de diagnostiquer les erreurs, d'écrire des tests de non-régression et de comparer de futures versions du moteur.

**Independent Test**: Exécuter deux sessions automatisées avec les mêmes entrées et vérifier que leur contenu fonctionnel et l'ordre de leurs événements sont identiques, hors identifiant public et horodatages.

**Acceptance Scenarios**:

1. **Given** une version de cube, une seed, une politique automatisée et des choix explicites identiques, **When** deux simulations sont exécutées, **Then** elles produisent les mêmes boosters, choix automatisés, rotations et pools finaux.
2. **Given** une simulation terminée dont le fichier snapshot externe n'est plus disponible, **When** son journal autonome est relu dans l'ordre sans réseau, **Then** chaque état observable, y compris l'identité et les informations d'impression des cartes, est reconstruit depuis les données embarquées et les événements antérieurs, sans recalculer les décisions des bots.
3. **Given** une session commencée avec une politique identifiée et versionnée pour chaque siège, **When** un choix automatisé annonce une autre politique ou version pour son siège, **Then** le tour est refusé sans modifier l'état ni le journal ; les versions initiales restent celles du rapport et de la relecture.

---

### User Story 3 - Auditer le résultat (Priority: P3)

Un contributeur consulte un rapport final qui identifie la session, ses données d'entrée et chaque choix, puis confirme automatiquement les invariants de conservation des cartes.

**Why this priority**: Un rapport explicite rend le moteur contrôlable avant de lui confier des décisions de scoring plus complexes.

**Independent Test**: Terminer une simulation et utiliser uniquement son rapport pour retrouver l'origine et la destination de chacune des N instances du snapshot, dont 545 pour le snapshot initial.

**Acceptance Scenarios**:

1. **Given** une session terminée, **When** son rapport est consulté, **Then** il expose l'identifiant de session, la seed, la version du cube, la configuration, les 360 choix ordonnés et les pools finaux.
2. **Given** une session terminée sur un snapshot valide de N instances, **When** les invariants sont contrôlés, **Then** 360 instances sont attribuées aux participants, N − 360 restent inutilisées et aucune instance n'est perdue ou dupliquée ; vérifier notamment 185 inutilisées pour N = 545, 180 pour N = 540 et zéro pour N = 360.

### Edge Cases

- Un snapshot absent, illisible, vide, mal versionné ou contenant moins de 360 instances est refusé avant la création de la session.
- Un snapshot valide de exactement 360 instances est accepté : toutes sont distribuées, la collection inutilisée est vide et chaque siège termine toujours avec 45 cartes.
- Deux entrées représentant la même carte Magic restent deux instances distinctes si elles figurent toutes deux dans le mainboard source.
- Une collision d'identifiant de session détectée parmi les sessions connues provoque la génération d'un nouvel identifiant.
- Un choix visant une carte absente du booster courant, un mauvais siège, un tour déjà joué ou une session terminée est refusé sans modifier l'état.
- Une erreur d'un participant automatisé est signalée sans produire de choix illégal ni de rapport de session terminée.
- Les cartes du mainboard qui sont des terrains de base restent des instances ordinaires du cube ; aucune copie supplémentaire n'est injectée.
- Un journal dont le snapshot embarqué est absent, invalide ou incohérent avec les instances distribuées est refusé ; aucun fichier ou service externe ne peut compléter ou remplacer les données manquantes.
- Une empreinte de rapport absente ou différente de celle recalculée ne permet pas de déclarer le rapport valide, même si la comparaison de son contenu fonctionnel réussit.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le système MUST utiliser un snapshot immuable du mainboard du cube CubeCobra `5e1c13b67c22a016c25ff019`, identifié par `titou_tribal` et une version au format `AAAA-MM-JJ.N`.
- **FR-002**: Le snapshot initial MUST contenir les 545 entrées du mainboard source, conserver les doublons comme instances distinctes et enregistrer la provenance, la date d'import et l'identité d'impression disponible.
- **FR-003**: Le système MUST valider le snapshot avant son utilisation et fournir les raisons précises d'un refus.
- **FR-004**: Chaque nouvelle session MUST recevoir un `sessionId` opaque de 12 caractères hexadécimaux minuscules, distinct des autres sessions connues.
- **FR-005**: Chaque session MUST conserver séparément son `sessionId`, sa seed, son identifiant de cube, sa version de cube et sa configuration de draft.
- **FR-006**: Une session MUST comporter huit sièges, dont un capable de recevoir les choix explicites de l'appelant et sept confiés exclusivement à des participants automatisés.
- **FR-007**: Le système MUST constituer trois boosters de 15 cartes par siège, soit 360 instances choisies sans remplacement parmi les N instances du snapshot valide du cube Titou, avec N ≥ 360. Les N − 360 autres instances restent inutilisées ; le snapshot initial conserve N = 545.
- **FR-008**: Les boosters MUST passer à gauche au premier paquet, à droite au deuxième et à gauche au troisième.
- **FR-009**: Le système MUST accepter uniquement une carte présente dans le booster courant du siège piloté et refuser toute action illégale sans modifier l'état.
- **FR-010**: Chaque participant automatisé MUST choisir une carte légale à l'aide de la seed, sans classement de puissance, scoring ni logique tribale ; la commande de simulation MUST appliquer cette même politique au siège pilotable.
- **FR-011**: À entrées fonctionnelles identiques, le système MUST reproduire la même distribution, les mêmes choix automatisés, les mêmes rotations et les mêmes pools finaux. L'empreinte fonctionnelle du rapport MUST être calculée sur son contenu en excluant uniquement l'identifiant de session, les horodatages et cette empreinte elle-même ; les cartes, les choix, leur ordre, la configuration, la seed et les versions restent inclus.
- **FR-012**: Le système MUST produire un journal autonome, immuable et ordonné couvrant la création de session, la distribution, chaque choix, chaque passage et la fin du draft. Son événement initial MUST embarquer le snapshot normalisé complet utilisé, sa provenance et ses versions, sans images ni données superflues ; la relecture MUST reconstruire les états et les informations des cartes sans source externe ni recalcul des décisions automatisées.
- **FR-013**: Chaque événement de choix MUST identifier au minimum son ordre, le paquet, le tour, le siège, le booster, l'instance choisie et son horodatage.
- **FR-014**: Le rapport final MUST exposer la configuration, le journal, les 45 cartes de chaque siège, les N − 360 cartes inutilisées, le résultat des contrôles d'invariants et l'empreinte fonctionnelle recalculable, où N est le nombre d'instances du snapshot utilisé ; la collection inutilisée est vide lorsque N = 360.
- **FR-015**: La session MUST être marquée terminée uniquement après 360 choix légaux, avec exactement 45 cartes par siège.
- **FR-016**: Une session terminée MUST refuser tout choix supplémentaire.
- **FR-017**: La simulation MUST fonctionner à partir du snapshot local validé sans dépendre d'une connexion réseau.
- **FR-018**: La première version MUST exclure l'interface graphique, le coaching, l'évaluation des cartes, les bots intelligents, la construction de deck, les scores, trophées, résultats, multijoueur et reprise d'une session interrompue.
- **FR-019**: La version du moteur et, pour chaque siège automatisé, l'identifiant et la version de sa politique MUST être fixés dès la création, inscrits dans l'événement initial et conservés dans le rapport final. Aucun changement de moteur, de politique ou de version n'est autorisé pendant la session. Un choix automatisé annonçant une politique ou version différente de celle déclarée pour son siège MUST être refusé sans mutation. Le siège 0 conserve la possibilité de choix explicites sans modifier la politique déclarée pour ses choix automatisés.

### Key Entities

- **Snapshot de cube**: Version immuable d'une liste de cartes importée, avec identité, provenance et instances distinctes.
- **Instance de carte**: Exemplaire unique d'une entrée du cube, même lorsqu'une autre entrée représente la même carte Magic.
- **Session de draft**: Exécution identifiée d'un draft, liée à une seed, un snapshot et une configuration immuables.
- **Siège**: Position d'un participant dans la rotation, pilotée par l'appelant ou par une politique automatisée.
- **Booster**: Ensemble ordonné d'instances qui circule entre les sièges pendant un paquet.
- **Choix**: Attribution irréversible d'une instance disponible à un siège pour un tour donné.
- **Événement de draft**: Fait ordonné et immuable expliquant l'évolution de la session.
- **Rapport de session**: Vue finale rassemblant entrées, journal, pools et contrôles d'invariants.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100 % des simulations exécutées avec un snapshot valide de N instances et des choix valides se terminent avec 360 choix, 45 cartes par siège et N − 360 cartes inutilisées.
- **SC-002**: Deux simulations utilisant le même snapshot, les mêmes versions du moteur et des politiques, la même seed et les mêmes choix explicites produisent 100 % des mêmes distributions, choix automatisés, rotations, pools finaux et empreintes fonctionnelles, même avec des identifiants de session et des horodatages d'exécution différents.
- **SC-003**: Pour toute simulation terminée, 100 % des N instances du snapshot sont retrouvables exactement une fois dans un pool final ou parmi les cartes inutilisées, y compris lorsque cette dernière collection est vide.
- **SC-004**: 100 % des actions illégales couvertes par les cas limites sont refusées sans changement de l'état fonctionnel de la session.
- **SC-005**: Un contributeur peut expliquer chacun des 360 choix, retrouver les informations des cartes et reconstruire l'ordre complet du draft à partir du seul rapport de session, même sans fichier snapshot externe ni réseau et sans réexécuter les politiques automatisées.
- **SC-006**: Sur le poste de référence documenté, après chargement et validation du snapshot initial et trois simulations d'échauffement, chacune des cinq simulations mesurées MUST produire un draft complet, son rapport et son empreinte jusqu'au JSON prêt à être écrit en strictement moins de deux secondes. Le démarrage du runtime, le chargement/validation préalable du snapshot et l'écriture disque sont hors chronométrage ; le parcours complet reste couvert par les tests fonctionnels. Le [protocole de performance](./performance-protocol.md) définit l'environnement et les conditions reproductibles de mesure.

## Assumptions

- CubeCobra est la provenance externe de la liste, mais une session utilise exclusivement le snapshot local et versionné qui lui est associé.
- Le snapshot initial contient 545 entrées de mainboard et aucun maybeboard ; les futures modifications créeront une nouvelle version sans altérer les anciennes.
- Les N − 360 instances non distribuées sont choisies par le même processus reproductible que la constitution des boosters ; 185 est uniquement le compte du snapshot initial.
- Le `sessionId` sert d'identifiant public et ne révèle ni ne remplace la seed.
- La commande de démonstration automatise le siège pilotable ; une future interface pourra fournir des choix explicites au même rythme sans modifier les règles du draft.
- Les horodatages et le `sessionId` peuvent différer entre deux relectures ; ils n'entrent pas dans la comparaison de reproductibilité fonctionnelle.
- La première version ne garantit l'absence de collision d'identifiant que parmi les sessions connues par l'exécution courante, faute de registre persistant.
- La persistance et la reprise pourront être ajoutées ultérieurement sans modifier les règles fonctionnelles du draft.
