# Spécifications Fonctionnelles & Techniques : Solo Draft Challenge, Graphe de Kiviat, PWA Mobile & Admin Studio

Document de référence pour le projet **MTG Cube Draft Simulator & Challenge** dans [`05_projets/mtg_cube_draft_app/`](file:///e:/secondBrain/perso/05_projets/mtg_cube_draft_app/).

---

## 🎯 1. Vision Produit & Objectifs

1. **Expérience Mobile-First (« Toilet Draft en 90s ») :** Permettre aux joueurs de lancer un draft solo instantané sur smartphone face à 7 bots IA, n'importe où et à tout moment.
2. **Pédagogie & Prise en main débutants :** Accompagner les joueurs occasionnels avec des Tiers explicites, des commentaires de méta clairs et un bouton **« Auto-Build Optimal 1-Clic »** qui compose automatiquement le deck de 23 cartes et la base de 17 terrains équilibrée selon les pips de mana.
3. **Double Débouché :**
   * **Digital (MTG Arena) :** Export en 1-clic pour affronter ses amis en Matchs Directs.
   * **Tabletop (IRL / Papier) :** S'entraîner sur les cubes physiques du groupe, enregistrer ses *decks de rêve* et les assembler en session réelle.
4. **Analyse de Deck Multi-Axes (Graphe de Kiviat) :** Évaluer mathématiquement la qualité globale du deck sur 5 axes afin de valoriser les vrais decks synergiques et punir les simples « piles de bombes injouables ».
5. **Gamification & Compétition :** 12 trophées déblocables, progression par niveaux d'XP, Mur des Records (Wall of Fame) et notifications Slack automatiques enrichies via **Papayoubot**.
6. **⚙️ Interface d'Admin & Méta Studio :** Permettre aux organisateurs et administrateurs d'ajuster manuellement les Power Rankings (Tiers S/A/B/C/D) et les commentaires stratégiques si l'analyse automatique initiale nécessite des corrections fines.

---

## 🏛️ 2. Base de Données des 6 Cubes Pré-Analysés

| Cube | Propriétaire | Cartes | Type & Profil de Méta |
| :--- | :--- | :---: | :--- |
| **1. Digital Peasant+ 360** | Tristan | **360** | Optimisé pour MTG Arena. Communes/Uncos modernes + 30 Bilands détap. |
| **2. Titou's Tribal & Chromatic** | Tristan (`@eltitou007`) | **545** | Synergies tribales profondes, seigneurs, changélins, ABUR Duals, Master Guild Challenge. |
| **3. Papayou_Cube** | Papayou (`ID: 1itq2`) | **815** | Format High-Power Vintage très dense, éclectique et explosif. |
| **4. Strobinellus's Vintage** | Cédric N. (`ID: 17`) | **720** | Format Vintage Unpowered de très haute puissance, rapide et interactif. |
| **5. Fedor's Candyshop IRL** | Nico (`ID: 1nxrs`) | **730** | Vintage / Legacy physique : Reanimator, Sneak Attack, Delver Tempo, Contrôle. |
| **6. Huge's Pauper Cube** | Huge | **360** | Format 100% Communes : fondamentaux tactiques, combats au sol et card advantage mesuré. |

---

## 📊 3. Algorithme du Graphe de Kiviat (5 Axes Pondérés)

$$\text{Score Global} = 0.20 \times \text{Puissance} + 0.25 \times \text{Synergie} + 0.20 \times \text{Courbe} + 0.20 \times \text{Mana} + 0.15 \times \text{Interaction}$$

1. **👑 Puissance Brute (20%) :**
   * Moyenne des tiers des cartes du deck actif (Tier S = 100, Tier A = 85, Tier B = 70, Tier C = 55, Tier D = 40).
2. **🧬 Synergies d'Archétypes (25%) :**
   * Détection des clusters et moteurs d'archétypes (*Sacrifice, Blink, Tokens, Spells, Counters +1/+1, Cimetière/Delirium, etc.*).
3. **📈 Fluidité de la Courbe de Mana (20%) :**
   * Densité minimale de T1/T2 (≥ 5 sorts à CMC ≤ 2).
   * Pénalité si le deck manque de jeu précoce ou dépasse 4 sorts lourds à 5+ manas sans accélération.
4. **🏔️ Stabilité de la Base de Mana (20%) :**
   * Vérification des règles de Karsten : au moins 8-9 sources colorées pour chaque couleur principale.
   * Bonus pour les bilands détap et le fixing.
5. **⚔️ Densité d'Interaction (15%) :**
   * Nombre de réponses, antibêtes, contresorts et défausse (idéal : 4 à 7 interactions dans les 23 sorts actifs).

---

## ⚙️ 4. Spécifications de l'Interface d'Admin (Méta Studio)

* **Localisation :** Onglet `⚙️ Admin Studio` dans la navigation desktop et mobile.
* **Fonctionnalités :**
  1. **Filtrage et Recherche :** Recherche instantanée par nom de carte ou mot-clé dans les commentaires.
  2. **Modification du Tier :** Sélecteur déroulant direct (`Tier S`, `Tier A`, `Tier B`, `Tier C`, `Tier D`).
  3. **Édition du Commentaire :** Champ texte éditable pour le conseil stratégique et le rôle de la carte.
  4. **Sauvegarde & Application Directe :** Enregistrement instantané dans `localStorage` avec mise à jour en direct des algorithmes de draft, du deckbuilder et de l'explorateur.
  5. **Indicateur Visuel :** Badge `Custom Admin` violet sur les cartes modifiées.
  6. **Import / Export JSON :**
     * Bouton `💾 Exporter Overrides (JSON)` pour sauvegarder ou partager les réglages fins.
     * Bouton `📂 Importer JSON` pour charger un fichier d'ajustements de méta.
     * Bouton `🔄 Reset` pour restaurer la valeur par défaut pré-calculée.

---

## 🏆 5. Gamification & Niveaux d'XP

* **12 Trophées déblocables :**
  * 🚽 *Speed Draft Toilettes* (< 90s)
  * 💣 *Bombardier Fou* (≥ 5 Tier S)
  * 🧬 *Maître des Synergies* (100% Kiviat)
  * 🦖 *Timmy Suprême* (≥ 4 thons à 6+)
  * 🌈 *5-Color Greedy*
  * ⚡ *Weenie Rocket*
  * 👑 *Grandmaster* (> 95/100)
  * 💀 *Boucher Aristocrat*
  * 🔮 *Spellslinger Frénétique*
  * 🛡️ *Maître du Pauper*
  * 🏆 *Légende du Mur*
  * 🌐 *Explorateur des 5 Cubes*
* **Pluie de confettis** sur Canvas à chaque déblocage.
* **Niveaux de Maîtrise (Niv. 1 à 10) :** d'*Apprenti Drafter* à *Titan Éternel de Magic*.

---

## 📢 6. Intégration Slack (Persona Papayoubot)

* **Relais backend sécurisé :** Endpoint `/api/slack` dans `server.py` lisant `SLACK_WEBHOOK_URL_MTG`.
* **Payload Block Kit enrichi :** Détail du joueur, cube, archétype, chronomètre, scores des 5 axes Kiviat et citation humoristique incisive de **Papayoubot**.
