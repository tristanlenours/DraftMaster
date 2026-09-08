# Feature Specification: Coaching Pédagogique et Bots Personnalisés Amis

**Feature Branch**: `002-coaching-friend-bots`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Offrir un coaching pédagogique en temps réel basé sur la décomposition en 5 axes de deck et la distillation de la note dynamique, couplé à une table de sept bots personnalisés incarnant les amis du groupe de jeu (Nico, Cédric, Hugues, Rémi, Papayou, Ivan, Titou) avec leurs styles de jeu, niveaux et tirages probabilistes déterministes."

---

## Alignement Domaine & Terminologie (CONTEXT.md)

* **Solo Draft Coach** : Session de draft solo où un joueur humain (Siège 0) drafte contre sept bots autour de la table.
* **Coaching** : Assistance en direct pour chaque choix (évaluation dynamique de la force relative et explication pédagogique).
* **Draft accompagné** : Session de draft avec Coaching activé. Elle reste dans l'historique personnel avec un marqueur assisté, mais est inéligible aux trophées et au Wall of Records.
* **Draft homologué** : Session de draft réalisée sans aucun Coaching. Éligible aux trophées et au Wall of Records.
* **Homologation** : Statut d'éligibilité. L'activation du Coaching à n'importe quel moment supprime irréversiblement l'Homologation.
* **Axes de deck** : Les cinq dimensions d'évaluation (Puissance, Synergie, Courbe, Mana, Interaction).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Coaching Pédagogique en temps réel (Priority: P1)

Lors d'un tour de draft, un joueur qui apprend le cube ou hésite entre plusieurs cartes active le Coaching. Le système lui présente pour chaque carte du booster une note dynamique contextuelle (ajustée à ses cartes déjà draftées) accompagnée d'une explication pédagogique en français lui indiquant la meilleure recommandation, les pièces de fixation de mana, et les pièges (bombes hors-couleur).

**Why this priority**: C'est le cœur de la promesse de DraftMaster : rendre le draft accessible et pédagogique pour les amis qui hésitent à venir aux soirées par manque de maîtrise des cartes.

**Independent Test**: Évaluer un booster de 15 cartes à l'étape P1P1 puis à l'étape P1P5 avec un pool partiel (ex: Esper) ; vérifier que les notes dynamiques et les explications reflètent fidèlement l'orientation du joueur.

**Acceptance Scenarios**:
1. **Given** un booster de premier tour (Pack 1, Pick 1) sans aucune carte préalable, **When** le coaching évalue le booster, **Then** le score dynamique de chaque carte est strictement égal à sa puissance brute intrinsèque, sans pénalité de couleur, et la carte de plus haute note est recommandée comme point de départ.
2. **Given** un pool contenant des cartes Blanches, Bleues et Noires au Pack 1 Pick 5, **When** le booster contient une carte verte puissante (ex: *Noble Hierarch* ou *Six*), **Then** le coaching applique une pénalité hors-couleur explicite (ex: -13 à -15 pts) et génère une alerte pédagogique signalant le piège de la carte hors-couleur.
3. **Given** ce même pool au Pack 1 Pick 5, **When** le booster contient un terrain bicolore Blanc/Bleu (ex: *Floodfarm Verge*), **Then** le coaching accorde un bonus de fixation de mana (+3.5 pts) et recommande le terrain pour stabiliser la base de mana.
4. **Given** une session où le Coaching est activé par le joueur, **When** le premier conseil est sollicité ou affiché, **Then** la session perd immédiatement et irréversiblement son statut d'Homologation et devient un « Draft accompagné ».

---

### User Story 2 - Bots Personnalisés incarnant les Amis (Priority: P1)

Le joueur drafte contre sept bots qui incarnent ses amis réels du groupe de jeu (Nico, Cédric, Hugues, Rémi, Papayou, Ivan, Titou). Chaque bot possède un niveau de jeu, une température de décision probabiliste et des biais de style de jeu fidèles à son profil documenté.

**Why this priority**: Élimine l'effet « robot clone » des drafts artificiels, recrée l'ambiance complice des soirées Cube hebdomadaires, et produit des signaux de draft réalistes et variés.

**Independent Test**: Faire choisir à Nico (Spike) et à Ivan (Timmy) un choix dans un même booster contenant un removal compétitif à 1 mana et une créature colossale à 6 manas ; vérifier que leurs décisions reflètent leurs personnalités distinctes.

**Acceptance Scenarios**:
1. **Given** le bot **Nico** (Spike impitoyable, $T=0.8$) devant un booster contenant un removal à bas coût de haut rang (ex: *Swords to Plowshares*) et une grosse créature lente, **When** Nico effectue son choix, **Then** il sélectionne le removal compétitif avec une discipline de couleur stricte.
2. **Given** le bot **Ivan** (Timmy archétypal, $T=1.5$) devant un booster contenant une créature à 6+ manas (ex: *Carnage Tyrant*) et une créature modeste à 2 manas, **When** Ivan effectue son choix, **Then** son biais de taille de créature (+4.5 pts) favorise le monstre colossal.
3. **Given** le bot **Hugues** (Johnny osé / Turbo Rien, $T=1.6$) devant un booster contenant un artefact ou une saga synergique atypique (ex: *Urza's Saga*), **When** Hugues effectue son choix, **Then** son biais de moteur atypique (+4.0 pts) lui fait privilégier la pièce de combo ambitieuse.
4. **Given** le bot **Rémi** (Maître des rouxelettes, $T=2.0$), **When** il drafte sur plusieurs tours, **Then** sa dispersion de choix est plus élevée que celle de Nico et Cédric, autorisant des opportunismes ou des bifurcations de couleur.

---

### User Story 3 - Reproductibilité, Déterminisme et Relecture (Priority: P2)

Un draft mené avec des bots personnalisés amis doit rester **strictement déterministe** : à graine identique (`seed`), les 7 bots font exactement les mêmes choix d'une exécution à l'autre.

**Why this priority**: Exigence constitutionnelle absolue (Principe III). Indispensable pour auditer les parties, rejouer un draft pour comprendre les erreurs d'un ami, et tester la non-régression.

**Independent Test**: Exécuter deux fois la même simulation complète avec les 7 bots amis et la même seed ; vérifier que tous les choix de tous les sièges sont strictement identiques.

**Acceptance Scenarios**:
1. **Given** une même graine de draft (`seed`) et les mêmes attributions de profils aux sièges 1 à 7, **When** le draft est simulé à deux reprises, **Then** chaque siège choisit exactement la même carte à chaque tour.
2. **Given** un choix probabiliste utilisant la loi Softmax, **When** le tirage aléatoire est opéré, **Then** il consomme exclusivement le flux de nombres pseudo-aléatoires dédié au siège (`policy:seat:X`) dérivé de manière cryptographique et déterministe.

---

### User Story 4 - Évaluation de Deck & Graphe de Kiviat 5 Axes contextualisé (Priority: P1)

Une fois le draft achevé (ou pendant la phase de deckbuilding), le joueur soumet son deck de 40 cartes (ou visualise 2 à 3 propositions de construction automatiques générées à partir de son pool, ex: Azorius, Orzhov, Esper). Le système évalue le deck sur un **Score Global sur 100** et génère la décomposition sur le **Graphe de Kiviat à 5 Axes**, dont les critères s'adaptent dynamiquement à l'archétype détecté.

**Why this priority**: C'est l'aboutissement du draft pour le joueur : savoir si son deck est compétitif, comprendre ses forces et faiblesses sur les 5 axes (Puissance, Synergie, Courbe, Mana, Interaction) et obtenir des recommandations concrètes d'optimisation avant de lancer ses parties.

**Independent Test**: Évaluer le build Esper de 40 cartes issu du draft témoin (`d555b02d-3745-4a4f-b1b6-fdc75c38c5c0`) ; vérifier qu'il est reconnu comme Contrôle/Combo Esper, que sa courbe basse de contrôle est valorisée, que ses 7 fixeurs de mana et fetchlands stabilisent la note de mana, et que ses 8 interactions lui confèrent un score d'interaction optimal.

**Acceptance Scenarios**:
1. **Given** un deck de 40 cartes axé sur l'archétype Contrôle (ex: le deck témoin Esper), **When** l'évaluation 5 axes est exécutée, **Then** la fluidité de courbe est évaluée selon un profil de contrôle (forte densité T1-T3, présence de finish T5+), et la note d'interaction reflète les 8 réponses (removals ciblés, contresorts, sweepers).
2. **Given** un deck de 40 cartes axé sur l'archétype Aggro (ex: Boros Aggro), **When** l'évaluation 5 axes est exécutée, **Then** la note de courbe exige une forte concentration de créatures CMC 1 et 2 (moyenne CMC $\le 2.3$), pénalisant l'excès de cartes à 4+ manas.
3. **Given** un deck comportant des accélérateurs de mana non-terrains (ex: créatures mana dorks comme *Birds of Paradise* / *Noble Hierarch*, ou cailloux d'artefact comme *Talismans* / *Moxes*), **When** la base de mana est évaluée, **Then** ces cartes sont comptabilisées comme de véritables sources de mana dans l'analyse de stabilité couleur selon les règles de Karsten.
4. **Given** un pool complet de 45 cartes draftées, **When** le joueur demande les suggestions de construction, **Then** le système identifie et présente les 2 ou 3 configurations viables du pool (ex: Option 1 Esper 3 couleurs, Option 2 Azorius bicolore) avec leurs scores comparatifs respectifs.

---

### User Story 5 - Diagnostic Stratégique Compétitif & Pédagogie de Cube (Priority: P2)

Après l'évaluation chiffrée du deck (Graphe de Kiviat 5 axes), le joueur consulte une analyse pédagogique approfondie articulée autour des quatre piliers de la théorie du jeu compétitif appliqués au Cube :
1. **Quadrant Theory** (*Limited Resources* : Marshall Sutcliffe & Brian Wong) : analyse de la répartition des sorts entre Développement (T1-T3), Parité (*board stall*), Retard (*Behind* — stabilisateurs, sweepers, anti-bêtes efficients) et Avance (*Ahead* — détection et alerte sur les pièges *win-more*).
2. **Tour Fondamental** (*Fundamental Turn* : Zvi Mowshowitz) : mesure de la capacité du deck à agir, stabiliser ou verrouiller le plateau au tour pivot du format (T2-T3 en Vintage/Arena Powered Cube).
3. **Posture & Posture Pivot** (*« Who's the Beatdown? »* : Mike Flores) : clarté de l'attribution du rôle (agresseur proactif dédié, contrôle réactif ou plan modulaire capable de pivoter selon l'adversaire).
4. **Efficience de Mana & Tempo** : calcul du potentiel de « double-spelling » précoce (sorts à bas CMC) et différentiel de tempo généré par des réponses à 1-2 manas neutralisant des menaces à coût supérieur.

**Why this priority**: Permet aux joueurs du groupe d'amis de ne pas simplement recevoir une note brute, mais de comprendre *pourquoi* un deck gagne ou perd en Cube, avec des explications pédagogiques illustrées par les cartes réelles de leur deck.

**Independent Test**: Évaluer le deck témoin Esper ; vérifier que le diagnostic identifie zéro carte *win-more*, une forte conformité au tour fondamental T2-T3 via *Path to Exile* et *Counterspell*, une posture de contrôle avec flexibilité de pivot, et un indice de *double-spelling* élevé.

**Acceptance Scenarios**:
1. **Given** un deck contenant des cartes coûteuses n'ayant d'impact qu'en position dominante (ex: cartes *win-more*), **When** l'audit Quadrant est calculé, **Then** une alerte explicite signale le risque de cartes mortes en situation de retard (*Behind*) et suggère des stabilisateurs plus efficients.
2. **Given** un deck de Cube sans interaction ni action proactive avant le tour 3, **When** l'horloge du Tour Fondamental est évaluée, **Then** le diagnostic signale un décalage critique face au rythme du format (T2-T3) avec une recommandation de baisser la courbe.
3. **Given** un deck équilibré avec 10+ sorts à CMC $\le 2$, **When** l'efficience de mana est calculée, **Then** l'indicateur de *Double-Spelling* confirme une haute capacité à générer des différentiels de tempo favorables dès le T3-T4.
4. **Given** le rapport de diagnostic stratégique, **When** il est restitué au joueur, **Then** chaque pilier théorique comporte une synthèse pédagogique en français et cite nommément les cartes exemplaires du deck illustrant le principe.

---

### User Story 6 - Matrice Visuelle & Référentiel Multi-Cubes Communautaires (Priority: P1)

Le joueur consulte la composition intégrale des cubes de sa communauté locale (Titou Tribal, Nico's Vintage Candyshop, Hugues Pauper) à travers une matrice inspirée de *Limited Grades*. Les cartes sont réparties par colonnes de couleurs (Blanc, Bleu, Noir, Rouge, Vert, Multicolore, Incolore, Terrains) et ordonnées par rangs de puissance (Tiers S, A, B, C, D). Pour chaque carte, le système met en avant son rang de Tier, son Power Ranking numérique harmonisé, ses analyses pédagogiques contextuelles et son texte de règles officiel en français.

**Why this priority**: Permet aux joueurs d'étudier le métagame d'un cube avant de drafter, de comparer la force relative des cartes entre différents environnements (ex: un *Counterspell* Tier S en Pauper mais Tier B en Vintage), et de s'approprier le cube via des visuels et explications clairs dans leur langue maternelle.

**Independent Test**: Charger le catalogue unifié de 1 100+ cartes et afficher successivement le cube de Titou (545 cartes, bannière `TTCC.png`) et celui de Nico (730 cartes, bannière `candyShop.jpg`) ; vérifier que la matrice affiche les cartes dans leurs colonnes respectives avec leur Tier, leur Power Ranking chiffré et la modale bilingue FR/EN.

**Acceptance Scenarios**:
1. **Given** le catalogue de cartes, **When** l'utilisateur sélectionne le cube « Titou — Tribal Cube », **Then** l'interface affiche l'illustration `TTCC.png` en en-tête de cube, charge les 541 cartes uniques et les dispose par couleur et par Tier.
2. **Given** ce même catalogue, **When** l'utilisateur bascule sur « Nico — Vintage Candyshop », **Then** l'interface affiche l'illustration `candyShop.jpg`, charge les 730 cartes du candyshop de Fedor et actualise les colonnes avec les notes et rôles spécifiques au Vintage.
3. **Given** une carte affichée dans la matrice, **When** l'utilisateur consulte la carte ou clique pour ouvrir la modale, **Then** le rang de Tier (S, A, B, C, D) et le Power Ranking numérique (ex: `PR 52`) sont clairement mis en valeur en tête de fiche.
4. **Given** la modale de carte, **When** la carte possède une traduction officielle française, **Then** le texte de règles et le nom français sont affichés avec un commutateur permettant d'alterner entre français et anglais.

---

## Exigences Fonctionnelles (FR)

* **FR-001** : Le moteur de coaching DOIT calculer pour chaque carte d'un booster un `dynamicScore` déterminé à partir du `staticScore` et de l'historique des cartes draftées du siège.
* **FR-002** : Au tour Pack 1 Pick 1, le `dynamicScore` DOIT être strictement égal au `staticScore` pour toutes les cartes offertes.
* **FR-003** : Le facteur d'engagement (*commitment*) DOIT croître de façon monotone entre le tour 1 ($0.0$) et le tour 45 ($\approx 0.95$).
* **FR-004** : Les cartes incolores non-terrains NE DOIVENT subir aucune pénalité d'affinité de couleur.
* **FR-005** : Les terrains bicolores et fetchlands correspondants aux couleurs du pool DOIVENT être reconnus par analyse sémantique et recevoir une pondération positive de fixation de mana, tandis que les terrains hors-couleurs subissent une pénalité.
* **FR-006** : Chaque évaluation de carte DOIT comporter une décomposition explicable (`colorAffinityFactor`, `colorPenalty`, `manaFixingBonus`, `curveBonus`).
* **FR-007** : Le module d'explications DOIT produire un texte pédagogique en français, contextualisé selon le rang de la carte et ses caractéristiques.
* **FR-008** : Sept profils d'amis DOIVENT être prédéfinis : Nico, Cédric, Hugues, Rémi, Papayou, Ivan et Titou.
* **FR-009** : Chaque profil d'ami DOIT définir une température Softmax $T \in [0.5, 3.0]$ et des modificateurs de style documentés.
* **FR-010** : Le tirage de carte d'un bot DOIT être probabiliste selon la loi Softmax pondérée par la température de son profil et consommer la graine du siège.
* **FR-011** : L'activation du coaching DOIT irréversiblement révoquer l'Homologation de la session courante.
* **FR-012** : Le moteur d'évaluation de deck DOIT classifier automatiquement tout deck de 40 cartes selon sa famille d'archétype (`Aggro`, `Midrange`, `Control`, `Ramp`, `Combo`) et ses couleurs principales/splashs.
* **FR-013** : Le système DOIT calculer pour tout deck les scores sur les 5 Axes de deck et publier les faits ayant produit chaque note :
  - **Axe 1 — Puissance (20%)** : distribution des puissances intrinsèques (`staticScore`) des cartes actives du deck (moyenne, médiane, top 5), densité de bombes selon le seuil top 5 % du Snapshot de cube, et contribution explicite du mana rapide. La moyenne seule ne peut pas déterminer cet axe.
  - **Axe 2 — Synergies d'Archétype (25%)** : cohésion thématique, cohérence du plan de jeu et discipline de couleur.
  - **Axe 3 — Courbe (20%)** : adéquation de la distribution de CMC au profil cible de l'archétype détecté, en séparant coût imprimé et coût de déploiement effectif des packages de réanimation ou de triche.
  - **Axe 4 — Mana (20%)** : ratio terrains/sorts, équivalents-terrain, accélérateurs et nombre de sources colorées effectives (terrains, fetchlands, créatures mana dorks, cailloux/artefacts) selon les formules de Karsten.
  - **Axe 5 — Interaction (15%)** : qualité intrinsèque des réponses (coût, vitesse, couverture) puis adéquation de leur quantité et de leur couverture au plan détecté ; aucun quota universel ne s'applique à tous les archétypes.
* **FR-021** : Chaque `Score de deck` DOIT indiquer sa version de formule, préciser qu'il ne représente ni une probabilité de victoire ni un percentile, lister les packages détectés (`enablers → payoffs → support`) et exposer les cinq contributions pondérées dont la somme arrondie produit exactement le score final.
* **FR-014** : Le Score Global du deck DOIT être la somme pondérée des 5 axes normalisée sur 100.
* **FR-015** : Le système DOIT pouvoir générer automatiquement 2 à 3 propositions de decks optimisés à partir d'un pool de 45 cartes draftées.
* **FR-016** : Le système d'évaluation DOIT intégrer un module de **Diagnostic Stratégique Compétitif** articulé sur les 4 théories fondamentales du Cube :
  - **Quadrant Theory** : ratio de sorts actifs en Retard (*Behind*), Développement (*Development*), Parité (*Parity*), et détection des cartes pièges d'Avance (*Win-More*).
  - **Tour Fondamental (Fundamental Turn)** : taux d'engagement et probabilité de jeu actif aux tours 1 et 2 face à l'horloge de référence du format.
  - **Attribution de Rôle (Who's the Beatdown?)** : qualification de la polarité stratégique (Proactif Beatdown, Contrôle Réactif, ou Modulaire Pivot).
  - **Efficience de Mana & Tempo** : densité de sorts $\le 2$ manas permettant le double-spelling précoce et estimation du différentiel de tempo des interactions.
* **FR-017** : Les métriques des théories compétitives DOIVENT enrichir de façon cohérente les 5 axes du Graphe de Kiviat (notamment Courbe, Interaction et Synergie) sans altérer la normalisation globale sur 100.
* **FR-018** : Le diagnostic stratégique DOIT être présenté sous forme pédagogique et explicative en français, citant directement des exemples concrets de cartes du deck illustrant chaque concept.
* **FR-019** : Le système DOIT supporter un catalogue unifié multi-cubes (`MasterCardCatalog`) associant à chaque carte son identité canonique (`oracleId`), ses analyses spécifiques par cube (`cubeAnalyses`), ses tags de synergie et ses modificateurs contextuels.
* **FR-020** : L'interface web DOIT présenter la matrice des cartes découpée par colonne de couleur (W, U, B, R, G, Multi, Incolore, Terrains) et ordonnée par Tier de puissance (S, A, B, C, D) avec défilement fluide et en-têtes collants (sticky).
* **FR-021** : Chaque fiche de carte DOIT afficher le rang de Tier et le score de Power Ranking numérique harmonisé, ainsi que les textes de règles en français lorsque disponibles.
* **FR-022** : Le système DOIT associer à chaque cube une image de couverture officielle (`coverImage`), notamment `TTCC.png` pour Titou Tribal et `candyShop.jpg` pour Nico Candyshop.

---

## Critères de Succès & Non-Régression (SC)

* **SC-001** : Le benchmark automatisé contre les 10 080 données réelles d'Untapped ([drafts_backup.json](file:///e:/SecondBrain/DraftMaster/data/untapped_history/drafts_backup.json)) DOIT valider que 100 % des cartes au P1P1 correspondent exactement au score statique.
* **SC-002** : L'évaluation d'un pack complet de 15 cartes par le moteur de score et d'explication DOIT s'exécuter en moins de 1 milliseconde.
* **SC-003** : Deux simulations complètes de 45 tours avec les 7 bots amis DOIVENT produire des journaux de draft fonctionnellement identiques bit-à-bit.
* **SC-004** : 100 % des tests unitaires et d'intégration du module coaching, bots amis et évaluation de deck DOIVENT passer avec succès sous Vitest.
* **SC-005** : L'évaluation du deck témoin Esper (40 cartes) sans profil d'archétype de cube DOIT laisser la Synergie à 0, produire un score global cohérent avec les quatre autres axes et conserver leurs notes détaillées. Aucune synergie ne peut être présumée à partir des seules couleurs ou interactions.
* **SC-006** : Le diagnostic stratégique compétitif (Quadrant, Tour Fondamental, Beatdown, Tempo) d'un deck de 40 cartes DOIT s'exécuter de manière synchrone en moins de 2 millisecondes sans régression sur le temps global d'évaluation.
* **SC-007** : 100 % des documents de cartes individuels dans `data/cards/items/` DOIVENT satisfaire la validation de schéma JSON `card.schema.json` sans aucune exception.
