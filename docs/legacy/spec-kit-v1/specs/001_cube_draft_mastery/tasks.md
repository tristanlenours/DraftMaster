# MATRICE DES TÂCHES (TASKS) : Cube Draft Mastery (001)

## 📌 Phase 1 : Données Statiques & Power Rankings
- [x] **T-1.1** Extraire et compiler les 360 cartes du Cube Peasant+ Arena.
- [x] **T-1.2** Parser et structurer les 545 cartes du Cube Titou (CSV CubeCobra).
- [x] **T-1.3** Télécharger et analyser les 815 cartes du Papayou_Cube (`1itq2`).
- [x] **T-1.4** Télécharger et analyser les cubes de Cédric (`17`), Nico (`1nxrs`) et Huge.
- [x] **T-1.5** Intégrer les scores continus depuis `mtg-arena-powered-cube-untapped-ratings.csv`.
- [x] **T-1.6** Générer la base statique unique `cubes_static_db.js`.

## 📌 Phase 2 : Moteur de Draft & Bots IA
- [x] **T-2.1** Développer l'algorithme de distribution en 24 boosters de 15 cartes (360 cartes).
- [x] **T-2.2** Implémenter la rotation officielle L-R-L des packs.
- [x] **T-2.3** Programmer l'IA des 7 bots basée sur les ratings Untapped et le color commitment.
- [x] **T-2.4** Créer le mode « Solo Challenge » (désactivation des aides visuelles).
- [x] **T-2.5** Ajouter le chronomètre de speedrun en direct (`⏱️ 00:00`).

## 📌 Phase 3 : Deckbuilder & Graphe de Kiviat
- [x] **T-3.1** Organiser le Mainboard en 6 colonnes CMC et un panneau Sideboard.
- [x] **T-3.2** Développer l'algorithme d'Auto-Build Optimal selon Frank Karsten (23 sorts + 17 terrains).
- [x] **T-3.3** Calculer les 5 axes mathématiques du Radar Kiviat (Puissance, Synergie, Courbe, Mana, Interaction).
- [x] **T-3.4** Dessiner le radar dynamique sur `<canvas>` HTML5.
- [x] **T-3.5** Générateur de diagnostic et de conseils textuels personnalisés.
- [x] **T-3.6** Fonction d'export 1-clic au format texte MTG Arena.

## 📌 Phase 4 : Gamification & Trophées
- [x] **T-4.1** Définir les 12 trophées universels et spécifiques par Cube.
- [x] **T-4.2** Créer le moteur d'évaluation des règles d'accomplissement.
- [x] **T-4.3** Implémenter le système d'XP et les 10 niveaux de maîtrise.
- [x] **T-4.4** Programmer l'animation de particules de confettis en pur Vanilla JS.
- [x] **T-4.5** Concevoir la pop-up dorée de déblocage avec transition fluide.

## 📌 Phase 5 : Mur des Records & Relais Slack
- [x] **T-5.1** Créer le stockage local du Wall of Fame avec tri par score et filtre par Cube.
- [x] **T-5.2** Structurer les payloads Block Kit riches avec persona Papayoubot.
- [x] **T-5.3** Mettre en place l'endpoint `/api/slack` dans `server.py` pour un envoi sécurisé.

## 📌 Phase 6 : Admin Studio & Personnalisation
- [x] **T-6.1** Interface d'édition des notes Untapped et des commentaires de cartes.
- [x] **T-6.2** Créateur de Trophées spécifiques par Cube avec sélection de règles.
- [x] **T-6.3** Système d'export et d'import JSON pour partager la configuration.
- [x] **T-6.4** Fonction de réinitialisation (Reset) aux valeurs par défaut.

## 📌 Phase 7 : Mobile-First PWA & Finitions
- [x] **T-7.1** Responsive design complet avec Bottom Navigation Bar tactile.
- [x] **T-7.2** Création du manifeste PWA `manifest.json`.
- [x] **T-7.3** Validation sur navigateurs mobiles et desktop.
