# 🎴 MTG Cube Draft & Tournament WebApp

Application web locale pour drafter le **Cube Peasant+ 360 cartes MTG Arena** en solo (avec bots) ou à 4 joueurs, construire son deck avec export direct vers MTG Arena, et gérer un tournoi suisse complet avec départages officiels.

---

## 🧙‍♂️ Fonctionnalités Clés

1. **Coach de Draft Débutant (*Draft Helper*) :**
   * **Indicateur de Puissance / Tier List** (Badge S / A / B / C / D).
   * **Commentaires Pédagogiques** (explication du rôle stratégique et des synergies de chaque carte).
   * **Toggles indépendants** activés par défaut (désactivables en un clic pour les joueurs experts).
2. **Simulateur de Draft 4 Joueurs :**
   * 3 boosters de 15 cartes (180 cartes draftées par session).
   * 3 Bots IA intelligents prenant des décisions basées sur la force des cartes et leurs couleurs ouvertes.
3. **Deckbuilder Visuel & Export MTG Arena :**
   * Tri automatique par courbe de mana (CMC 1 à 6+).
   * Calculateur automatique de terrains de base.
   * **Bouton 1-clic : « Copier pour MTG Arena »**.
4. **Gestionnaire de Tournoi Suisse :**
   * 3 rondes générées automatiquement.
   * Saisie des scores de matchs ou simulation rapide.
   * Calcul des tiebreakers officiels : Points (3/1/0), Game Win % (GW%), Opponents' Match Win % (OMW%).
   * Export du compte-rendu de tournoi au format Markdown.
5. **Explorateur du Cube :**
   * Recherche en direct parmi les 360 cartes avec leurs descriptions et notes de puissance.

---

## 🚀 Lancement Rapide

Ouvrez simplement `index.html` dans n'importe quel navigateur moderne, ou lancez le serveur local :

```bash
python server.py
```

L'application s'ouvrira automatiquement à l'adresse : **`http://localhost:8080`**.
