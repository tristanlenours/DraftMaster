# Feature Specification: Solo Draft Coach, Mur des Records Rétro et Rapports Admin

**Feature Branch**: `004-solo-draft-coach`

**Created**: 2026-09-07

**Status**: In Progress

**Input**: User description :
"j'aimerais m'attaquer à l'une des deux feature star. Le draft solo (nouveau menu). Cette feature doit permettre à un joueur dont le nom est demandé au début du process de faire un draft classique avec 7 autres bots. A la fin, le temps est mémorisé, le joeur doit faire son deck avec les 23 cartes. Le deck est analysé avec le score. ça vient alimenter le mur des records façon jeu videos à l'ancienne. le but étant d'inscire son nom tout en haut. On va aussi coté admin enregistrer les infos qu'on a dans la partie reports. Les boosters (Les 360 cartes ouvertes réparties en 45 packs sur 3 tours) et le rapport de qui a drafté quoi (le joueur humain et les 7 bots)"

---

## Alignement Domaine & Terminologie (CONTEXT.md & Constitution)

- **Solo Draft Coach** : Premier jalon produit dans lequel un joueur humain accomplit un draft de 45 picks contre 7 bots, construit son deck et enregistre ses scores et trophées.
- **Draft homologué** : Session de Solo Draft accomplie sans Coaching d'assistance au pick. Seules ces sessions sont éligibles au Mur des Records officiel.
- **Draft accompagné** : Session de draft ayant bénéficié d'assistance ou coaching au pick ; non éligible au Mur des Records.
- **Résultat verrouillé** : Enregistrement immuable produit après la fin des 45 picks et la finalisation de la sélection des 23 cartes.
- **Score de deck** : Évaluation explicable sur 100 du deck final selon les cinq Axes de deck : **Puissance**, **Synergie**, **Courbe**, **Mana** et **Interaction**.
- **Mur des Records** : Tableau de bord des meilleurs scores (High Scores) dans une esthétique rétro jeu vidéo d'arcade.
- **Rapports Admin** : Persistance automatique sur disque des fichiers HTML autonomes (parcours 17Lands des 360 choix et distribution des 360 cartes en 24 boosters).

---

## User Scenarios & Testing

### User Story 1 - Configuration et Lancement du Draft Solo (Priority: P1)
Le joueur accède au nouvel onglet "Draft Solo" de la barre de navigation. Il saisit son nom (obligatoire, ex: "Tristan"). L'interface affiche la table des 8 sièges : le joueur au Siège 0 et les 7 bots amis (Nico, Rémi, Hugues, Ivan, Papayou, Cédric, TitouBot). Le joueur clique sur "Lancer le Draft Solo 🚀" : le chronomètre démarre et le premier booster de 15 cartes lui est présenté.

**Acceptance Scenarios**:
1. **Given** l'application web, **When** l'utilisateur clique sur "Draft Solo", **Then** l'écran de configuration s'affiche avec un champ pour saisir son nom.
2. **Given** un nom vide ou composé uniquement d'espaces, **When** l'utilisateur clique sur lancer, **Then** le draft ne démarre pas et un message invite à renseigner un pseudo valide.
3. **Given** un nom valide renseigné, **When** le draft est lancé, **Then** une session est créée côté serveur, le chronomètre démarre et les 15 cartes du Pack 1 Pick 1 sont affichées au joueur.

---

### User Story 2 - Déroulement Interactif des 45 Picks (Priority: P1)
Le joueur accomplit 45 choix successifs (3 packs de 15 cartes). À chaque tour :
- Le joueur voit son booster actuel, peut zoomer/inspecter chaque carte, voir son coût, type, power score et ruban Bombe.
- En cliquant sur une carte et en confirmant son choix, la carte est ajoutée à son pool.
- Simultanément, les 7 bots sélectionnent leur carte via leur politique d'IA respective.
- Les boosters tournent selon le sens officiel (Pack 1 à gauche, Pack 2 à droite, Pack 3 à gauche).
- Un drawer ou panneau inférieur permet de consulter à tout moment son pool de cartes déjà draftées et sa courbe de mana.

**Acceptance Scenarios**:
1. **Given** un booster de 15 cartes au P1P1, **When** le joueur sélectionne une carte, **Then** son pool passe à 1 carte et le booster suivant (P1P2) contient 14 cartes transmises par son voisin.
2. **Given** la fin du Pack 1 (Pick 15), **When** le 15ème choix est validé, **Then** le Pack 2 démarre avec 15 nouvelles cartes et la rotation s'inverse vers la droite.
3. **Given** le 45ème choix effectué (Pack 3 Pick 15), **When** le choix est validé, **Then** la phase de draft se conclut et l'interface bascule immédiatement sur l'atelier de deckbuilding.

---

### User Story 3 - Atelier de Deckbuilding 23 Cartes (Priority: P1)
À la fin du draft, le joueur doit composer son deck compétitif de 23 cartes actives parmi les 45 cartes de son pool.
- L'interface propose deux zones : "Main Deck (23 cibles)" et "Réserve (22 cartes)".
- Un compteur interactif affiche `X / 23 cartes`.
- Un gestionnaire de base de mana propose automatiquement 17 terrains de base répartis selon les symboles de mana des 23 cartes retenues, avec boutons (+ / -) pour ajuster le nombre de Plaines, Îles, Marais, Montagnes et Forêts.
- Le bouton de validation n'est actif que si exactement 23 cartes sont placées dans le deck principal.

**Acceptance Scenarios**:
1. **Given** le pool de 45 cartes, **When** le joueur clique sur une carte, **Then** elle bascule fluidement entre le Main Deck et la Réserve, et le compteur s'ajuste.
2. **Given** un total de cartes différent de 23 (ex: 22 ou 24), **When** l'utilisateur regarde le bouton de validation, **Then** il est désactivé avec indication du nombre de cartes manquantes ou en excès.
3. **Given** exactement 23 cartes dans le Main Deck, **When** le joueur valide, **Then** le chronomètre est figé et le résultat est verrouillé.

---

### User Story 4 - Évaluation du Deck et Calcul du Score 5 Axes (Priority: P1)
Dès le deck validé :
- Le moteur `evaluateDeck` calcule le Score de deck (0 à 100), l'archétype détecté et les 5 axes Kiviat (Puissance, Synergie, Courbe, Mana, Interaction).
- L'écran de résultat présente ces scores avec une jauge animée, les forces et faiblesses du build, le temps total écoulé et le rang atteint.

**Acceptance Scenarios**:
1. **Given** un deck de 23 cartes + 17 terrains, **When** le moteur d'évaluation le traite, **Then** il produit un score global sur 100 et cinq notes d'axe normalisées.
2. **Given** le résultat calculé, **When** le joueur consulte la synthèse, **Then** le temps total chronométré est affiché de façon lisible (mm:ss).

---

### User Story 5 - Le Mur des Records Rétro Style Arcade (Priority: P1)
Les scores des sessions homologuées alimentent le "Mur des Records" au look arcade rétro (High Scores) :
- Classement ordonné : Score global décroissant, puis temps écoulé croissant (départage à la rapidité).
- Affiche le rang (#1 doré 👑, #2 argent 🥈, #3 bronze 🥉), le nom du joueur, le score, l'archétype, le chrono, la date et le statut homologué.
- Si le score du joueur dépasse le record actuel, une bannière "NEW HIGH SCORE!" s'anime.
- Possibilité de revoir la composition du deck dans une modale dédiée.

**Acceptance Scenarios**:
1. **Given** une session homologuée terminée, **When** son score est enregistré, **Then** le Mur des Records est mis à jour et persistant.
2. **Given** deux scores identiques, **When** le classement est établi, **Then** le joueur ayant réalisé le draft le plus rapidement est classé devant.

---

### User Story 6 - Persistance et Rapports Admin (Priority: P1)
À la validation du résultat, le serveur enregistre automatiquement sur disque dans `reports/` :
1. `reports/draft-[seed]-[joueur].html` : Visualiseur 17Lands des 45 écrans et 360 décisions.
2. `reports/draft-[seed]-[joueur]-boosters.html` : Répartition des 360 cartes en 24 boosters.
Un écran ou panneau Admin permet de consulter l'historique de tous les drafts joués et d'ouvrir directement ces rapports.

**Acceptance Scenarios**:
1. **Given** un draft terminé, **When** le serveur génère les rapports, **Then** les deux fichiers HTML existent sur le système de fichiers dans `reports/` et sont consultables sans erreur.
2. **Given** le visualiseur 17Lands généré, **When** il est ouvert, **Then** le Siège 0 porte le nom saisi par le joueur humain.
