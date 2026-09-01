# SPECKIT CONSTITUTION : Cube Draft Mastery

**Document Version :** 1.0.0  
**Statut :** RATIFIÉ  
**Projet :** MTG Cube Draft Mastery (`05_projets/mtg_cube_draft_app/`)  
**Méthodologie :** Spec-Driven Development (SpecKit)

---

## 🏛️ 1. Principes Directeurs Fondamentaux (Non-Négociables)

### Article I — Expérience Mobile-First (« Le Toilet Draft en 90s »)
1. **Ergonomie pouce unique :** L'interface primaire est optimisée pour une utilisation sur smartphone à une main.
2. **Vitesse d'exécution :** Un joueur doit pouvoir enchaîner 45 picks et obtenir un deck prêt à jouer en moins de 90 secondes.
3. **Affichage PWA autonome :** L'application est installable sur écran d'accueil sans dépendance à un app store propriétaire (`manifest.json`).

### Article II — Autonomie Hors-Ligne & Intelligence « À Froid »
1. **Zéro dépendance réseau en live :** Aucune requête API IA ou réseau externe n'est requise pendant le draft ou le deckbuilding.
2. **Déterminisme instantané :** Tous les calculs de puissance, synergies, courbe de mana et attribution de trophées s'exécutent en mémoire dans le navigateur en < 16ms (60 FPS).
3. **Pré-compilation statique :** Les bases de cartes des 6 Cubes sont compilées à froid et embarquées localement.

### Article III — Rigueur Mathématique & Fidélité au Domaine MTG
1. **Scoring Continu Untapped :** L'évaluation de puissance s'aligne sur l'échelle numérique fine **Untapped (1.0 à 53.0+)** issue de données empiriques.
2. **Heuristiques de Frank Karsten :** La base de mana automatique garantit au moins 8 à 9 sources colorées pour chaque couleur principale d'un deck de 40 cartes.
3. **Graphe de Kiviat 5 Axes :** L'évaluation pondère Puissance (20%), Synergies (25%), Courbe CMC (20%), Base de Mana (20%) et Interaction (15%). Une pile de bonnes cartes sans synergie ou sans mana stable est sévèrement pénalisée.

### Article IV — Pédagogie & Démystification du Cube
1. **Accessibilité immédiate :** Un joueur débutant ou occasionnel est guidé par le Coach (Tiers et conseils) sans se sentir submergé.
2. **Auto-Build 1-Clic :** Calcul automatique des 23 meilleurs sorts et des 17 terrains pour démarrer une partie immédiatement.

### Article V — Gamification, Trophées & Émulation Communautaire
1. **Trophées Spécifiques :** Les archétypes emblématiques de chaque Cube disposent de trophées dédiés (ex: *Stormeur Fou*, *Pro de l'Artefact* pour Nico ; *Seigneur Tribal* pour Titou ; *Apocalypse* pour Papayou).
2. **Partage & Slack :** Relais sécurisé vers le canal Slack du groupe via le persona **Papayoubot** sans exposer de secrets ou de jetons.
3. **Admin Studio :** Capacité d'ajuster manuellement n'importe quel score de carte ou de forger de nouveaux trophées exportables en JSON.

---

## 🔒 2. Charte de Sécurité & Confidentialité

1. **Zéro Secret Versionné :** Aucun webhook, jeton ou cookie dans les fichiers commités.
2. **Variables d'environnement :** `SLACK_WEBHOOK_URL_MTG` est chargée exclusivement depuis un fichier `.env` local ignoré par Git.
3. **Stockage Utilisateur :** Les scores, trophées débloqués et modifications manuelles résident dans le `localStorage` local du client.
