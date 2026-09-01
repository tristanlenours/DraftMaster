# SPECKIT SPECIFICATION (/speckit-specify) : Cube Draft Mastery (001)

**Feature Name :** MTG Cube Draft Simulator & Challenge (Draftmancer-Style PWA)  
**Target Delivery :** PWA Mobile-First / Tabletop & Arena Bridge  
**Status :** RATIFIÉ & À JOUR  
**Date de dernière mise à jour :** 2026-08-29

---

## 🎯 1. Contexte & Vision Produit

* **Problème :** Réunir 8 joueurs pour drafter un Cube physique est une contrainte logistique majeure. Les outils actuels (CubeCobra) manquent d'immersion solo, de retour analytique sur la qualité du deck, de gamification et d'une ergonomie mobile fluide.
* **Solution :** Une application web PWA autonome inspirée de **Draftmancer** :
  1. Routing SPA avec URLs propres (`/cartes`, `/draft?session=...`, `/deck`, `/trophees`, `/records`, `/tournoi`).
  2. Sessions uniques et salon de pré-draft avec bouton explicite `🚀 START DRAFT`.
  3. Table de draft solo stricte (1 Humain + 7 Bots IA).
  4. Algorithme des bots IA en 3 phases heuristiques (Exploration ➔ Commitment ➔ Curve & Fixing).
  5. Explorateur de cartes en page d'accueil avec **Mode Admin inline** (Tiers S/A/B/C/D & Commentaires) et flag de modification manuelle.
  6. Évaluation multi-axes sur Graphe de Kiviat, auto-build 1-clic (Karsten), trophées déblocables et relais Slack.

---

## 🌐 2. Architecture de Navigation & Routing SPA

L'application dispose d'un routing client HTML5 (avec support côté serveur Python) sans rechargement de page :

| URL | Onglet / Vue | Rôle |
| :--- | :--- | :--- |
| `http://localhost:8080/` ou `/cartes` | **Explorateur de Cartes** (Accueil) | Parcours visuel des cartes, recherche, Tiers (S/A/B/C/D), conseils et Mode Admin inline. |
| `http://localhost:8080/draft` ou `/draft?session=...` | **Lobby & Salle de Draft** | Salon de pré-draft Draftmancer avec session unique, nom du joueur et bouton `START`. |
| `http://localhost:8080/deck` | **Deckbuilder & Kiviat** | Mainboard 6 colonnes, Sideboard, Auto-Build Karsten et Radar Kiviat Canvas. |
| `http://localhost:8080/trophees` | **Salle des Trophées** | 12+ Trophées Universels et Spécifiques par Cube, progression XP et confettis. |
| `http://localhost:8080/records` | **Mur des Records** | Wall of Fame filtré par Cube et bouton d'envoi vers Slack (Papayoubot). |
| `http://localhost:8080/tournoi` | **Tournoi Suisse** | Simulateur de ronde suisse 3 rondes avec départages OMW% et GW%. |

---

## 📋 3. Spécifications Fonctionnelles Détaillées

### [FR-01] Salon de Pré-Draft & Sessions Uniques (Style Draftmancer)
* **Session ID :** Chaque session de draft génère un identifiant hexadécimal unique de 12 caractères (ex: `f5be0bbec5a3`), injectable via l'URL (`/draft?session=f5be0bbec5a3`).
* **Boutons de Session :** Bouton `📋 Copier` pour copier le lien direct et bouton `🔄` pour générer une nouvelle session.
* **Nom du Joueur :** Champ éditable mémorisé dans le navigateur (`localStorage` / défaut `titou`).
* **Table de Draft :** Strictement configurée pour **1 Joueur Humain (`👑 titou`) + 7 Bots IA**.
* **Déclenchement :** Le draft ne démarre qu'au clic explicite sur le bouton **`🚀 START DRAFT`**, qui ouvre le Pack 1/3 et déclenche le chronomètre de speedrun.

### [FR-01b] Pick en 2 Étapes & Visualiseur de Deck en Direct (Style Draftmancer)
* **Sélection en 2 Étapes :**
  1. Clic / Tap sur une carte du booster ➔ Liseré vert néon (`outline: 3px solid #22c55e`), activation du bouton `[ CONFIRM PICK ]`.
  2. Clic sur `[ CONFIRM PICK ]`, double-clic sur la carte ou touche `Entrée` / `Espace` ➔ Validation et rotation du booster.
* **Visualiseur de Deck en Direct (Live Deck Columns) :**
  * Situé directement sous les boosters de draft.
  * Répartition en 7 colonnes CMC (`0`, `1`, `2`, `3`, `4`, `5`, `6+`) avec compteur dynamique.
  * Cartes visuelles empilées en cascade avec effet de survol/zoom pour surveiller sa courbe de mana en temps réel.
  * Compteurs de répartition instantanés : `⚔️ Créatures`, `✨ Sorts`, `🏔️ Terrains`.

### [FR-01c] Timer Officiel de Draft MTR (Proportionnel aux Cartes Restantes)
* **Barème Officiel MTR (Appendix B - Booster Draft Timing) :**
  * Temps décroissant par pick : de **75 secondes** (Pick 1 / 15 cartes) jusqu'à **5 secondes** (Pick 15 / 1 carte) :
    $$T(\text{pick}) = \max(5, (16 - \text{pick}) \times 5)$$
* **Options de Configuration dans le Lobby :**
  1. `🏛️ Officiel MTR (75s ➔ 5s)` (par défaut)
  2. `⚡ Blitz (40s ➔ 5s)`
  3. `🧘 Relax / Illimité` (chronomètre libre)
* **Indicateurs Visuels & Auto-Pick :**
  * Badge de compte à rebours (`⏱️ 75s`) et barre de progression animée (Verte ➔ Orange sous 15s ➔ Rouge clignotante sous 5s).
  * **Auto-Pick à expiration ($T=0$) :** Valide automatiquement la carte sélectionnée ou, à défaut, le meilleur pick heuristique de l'IA sans bloquer la table.

### [FR-02] Algorithme des Bots IA (Heuristique Draftmancer à 3 Phases)
Lors du draft, les 7 bots IA évaluent dynamiquement les cartes selon 3 phases temporelles :
1. **Phase 1 — Pack 1 (Picks 1 à 8 / Exploration) :**  
   Le bot privilégie la force brute des cartes (*Power Level / Tier S = 98, Tier A = 85, etc.*) sans pénalité de couleur pour rester ouvert aux bombes et aux signaux.
2. **Phase 2 — Fin Pack 1 & Pack 2 (Picks 9 à 30 / Commitment) :**  
   L'algorithme calcule un *vecteur de préférences de couleurs* (somme pondérée des tiers des cartes déjà pickées).  
   * Bonus significatif sur les 2 couleurs dominantes ($+16$).  
   * Malus sur les cartes hors-couleurs ($-22$).  
   * Léger bonus sur les T2/T3 ($+4$).
3. **Phase 3 — Pack 3 (Picks 31 à 45 / Fixing & Courbe) :**  
   * Sanction maximale pour les hors-couleurs ($-45$).  
   * Priorité absolue aux bilands et terrains de fixing ($+18$).  
   * Comblement des trous de courbe : bonus fort si manque de T2 ($+12$) ou de T3 ($+8$), et pénalité en cas d'excès de sorts à 5+ CMC ($-15$).

### [FR-03] Explorateur de Cartes en Page d'Accueil & Filtres Multi-Critères
* **Vue par Défaut :** L'Explorateur s'affiche dès l'ouverture du site avec les cartes du Cube sélectionné.
* **Barre de Filtres Multi-Critères Intégrée :**
  1. **Filtre Couleurs (Pills dynamiques) :** `Toutes`, `🤍 Blanc`, `💙 Bleu`, `🖤 Noir`, `❤️ Rouge`, `💚 Vert`, `🌈 Multi`, `🏔️ Terrains`, `⚙️ Incolore`.
  2. **Filtre Types de Cartes :** `Tous types`, `⚔️ Créatures`, `⚡ Éphémères`, `📜 Rituels`, `🏺 Artefacts`, `✨ Enchantements`, `👑 Planeswalkers`, `🏔️ Terrains`.
  3. **Filtre Tiers de Puissance :** `Tous Tiers`, `💣 Tier S (Bombe)`, `🌟 Tier A (Staple)`, `⚔️ Tier B (Solide)`, `🛡️ Tier C (Soutien)`, `🔍 Tier D (Filler)`.
  4. **Recherche Instantanée & Bouton Réinitialiser :** Recherche par nom, texte de commentaire ou type.
* **Échelle de Tiers Simplifiée :**
  * **Tier S :** 💣 Bombe absolue (First pick incontournable / Game changer).
  * **Tier A :** 🌟 Staple de premier plan / Pilier d'archétype.
  * **Tier B :** ⚔️ Bonne carte solide & efficace.
  * **Tier C :** 🛡️ Soutien de courbe & carte de rôle.
  * **Tier D :** 🔍 Filler passable / Carte très particulière ou de niche.
* **Mode Admin Inline :**
  * Activé via le switch `⚙️ Mode Admin (Édition Méta)`.
  * Affiche directement sous chaque carte un menu déroulant de sélection de Tier, un champ de commentaire, et des boutons `💾 Sauvegarder` et `🔄 Réinitialiser`.
  * Badge violet **`✏️ Modifié`** et liseré distinctif sur toute carte personnalisée manuellement.
  * Outils d'export (`💾 Exporter JSON`) et d'import (`📂 Importer JSON`) intégrés.

### [FR-04] Deckbuilder & Auto-Build 1-Clic (Frank Karsten)
* Répartition automatique des 23 meilleurs sorts actifs et calcul des 17 terrains de base selon les pips de mana colorés.
* Bouton d'export 1-clic compatible avec MTG Arena.

### [FR-05] Évaluation de Deck (Graphe de Kiviat 5 Axes)
* Évaluation sur 100 points : Puissance Brute (Tiers S/A/B/C/D - 20%), Synergie d'Archétype (25%), Fluidité de Courbe (20%), Base de Mana (20%), Densité d'Interaction (15%).

### [FR-06] Gamification, Trophées & Relais Slack
* Trophées Universels et Spécifiques par Cube, 10 niveaux d'XP, confettis et notifications Block Kit via **Papayoubot**.

---

## 🧪 4. Critères d'Acceptation (Given / When / Then)

### US-01 : Démarrage d'un Draft via le Lobby Draftmancer
* **Given :** Un utilisateur naviguant sur `http://localhost:8080/draft`.
* **When :** Il voit son nom `titou`, la table de 8 sièges (1 Humain + 7 Bots), et clique sur `🚀 START DRAFT`.
* **Then :** Le lobby se replie, la salle active s'affiche avec le Pack 1/3, le chronomètre démarre à `⏱️ 00:00` et les 15 premières cartes sont interactives.

### US-02 : Comportement des Bots en Phase 3
* **Given :** Un bot IA au Pack 3 ayant pické une dominante Rouge/Vert.
* **When :** Il évalue un biland Gruul vs une bombe hors-couleur (Bleue).
* **Then :** Grâce au bonus de fixing ($+18$) et à la pénalité hors-couleur ($-45$), le bot choisit le biland pour consolider sa base de mana.

### US-03 : Édition Inline en Mode Admin
* **Given :** L'utilisateur sur la page d'accueil `/cartes` activant le `⚙️ Mode Admin`.
* **When :** Il change le Tier d'une carte de `B` à `S` et clique sur `💾`.
* **Then :** La carte affiche immédiatement le badge `Tier S` et le flag `✏️ Modifié`, et la modification est persistée dans `localStorage`.
