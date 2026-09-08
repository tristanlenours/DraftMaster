# Implementation Plan: Solo Draft Coach, Mur des Records Rétro et Rapports Admin

**Feature Branch**: `004-solo-draft-coach`
**Spec**: `specs/004-solo-draft-coach/spec.md`

## Architecture & Responsabilités

### 1. Domaine & Moteur de Session (`src/solo-draft/`)
- `solo-draft-types.ts` : Structures de données de la session, requêtes/réponses d'API, modèle d'entrée au Mur des Records (`LeaderboardEntry`).
- `solo-draft-session.ts` : Gestionnaire autonome de session de draft interactif.
  - S'appuie sur le moteur immuable `src/draft/` (`startDraft`, `getDraftView`, `submitPickRound`, `buildDraftReport`).
  - Configure le Siège 0 (Joueur humain) et les Sièges 1 à 7 (Politiques d'IA des 7 amis `createFriendTablePolicies`).
  - Gère les 45 tours de sélection en exécutant les bots et en intégrant le choix humain.
  - Valide la composition du deck (23 cartes actives parmi le pool de 45).
  - Construit et évalue les decks des bots via `recommendDeckBuilds` et `evaluateDeck`.
  - Compile le rapport complet `DetailedDraftReport`.
  - Génère et écrit sur disque les 2 fichiers HTML dans `reports/` via `generateDetailedDraftHtml` et `generateBoosterDistributionHtml`.
- `leaderboard.ts` : Gestionnaire de records du Cube.
  - Stockage persistant dans `data/leaderboard.json`.
  - Tri : score décroissant, temps croissant, date décroissante.
  - Palmarès de base convivial avec les scores des créateurs/amis.

### 2. API REST & Serveur Web (`scripts/serve-web.mjs`)
- Extension du serveur Node.js avec les endpoints :
  - `GET /reports/*` : Accès direct aux fichiers HTML de rapports.
  - `POST /api/draft/start` : Démarre la session et retourne le P1P1 du joueur.
  - `POST /api/draft/pick` : Exécute le choix humain, simule les 7 bots, applique la rotation et retourne le booster suivant.
  - `POST /api/draft/deck` : Valide les 23 cartes et les terrains, calcule l'évaluation 5-axes, génère les fichiers de rapport, enregistre le record et renvoie le bilan.
  - `GET /api/leaderboard` : Fournit les entrées du Mur des Records.
  - `GET /api/reports` : Liste des rapports disponibles.

### 3. Interface Utilisateur & Expérience Rétro (`src/web/`)
- `index.html` :
  - Nouveaux onglets `⚔️ Draft Solo` et `🏆 Mur des Records` dans `site-nav`.
  - Vue `#view-draft` avec 4 étapes séquentielles : Lobby (saisie pseudo et table 8 sièges), Arène de Draft (booster avec zoom et rubans, chrono, indicateurs de rotation), Atelier de Deckbuilding (23 cartes, 17 terrains optimisés, compteurs dynamiques), Écran de Résultat (animation, 5 axes radar, archétype, accès rapports).
  - Vue `#view-records` : Mur des Records style arcade années 80-90 (typographie dorée, néons, tableau Top 10 avec badges #1/#2/#3, chrono et modale de revue de deck).
  - Vue `#view-admin` : Dashboard des rapports de draft générés.
- `solo-draft.js` : Contrôleur client gérant la machine à états du draft et l'atelier de deckbuilding.
- `leaderboard.js` : Rendu et animations du Mur des Records arcade.
- `styles.css` : Styles responsive desktop et mobile (360px), effets de glow néon et polices arcade/cinzel.
