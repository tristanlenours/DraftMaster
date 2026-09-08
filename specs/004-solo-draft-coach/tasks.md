# Tasks: Solo Draft Coach, Mur des Records Rétro et Rapports Admin

- [x] 1. Moteur de Domaine & Types (`src/solo-draft/`)
  - [x] 1.1 Définir les types TypeScript stricts dans `src/solo-draft/solo-draft-types.ts`
  - [x] 1.2 Implémenter le gestionnaire de Mur des Records dans `src/solo-draft/leaderboard.ts` et créer `data/leaderboard.json`
  - [x] 1.3 Écrire les tests unitaires pour `leaderboard.ts` dans `tests/unit/solo-draft/leaderboard.test.ts`
  - [x] 1.4 Implémenter le moteur de session interactive `SoloDraftSession` dans `src/solo-draft/solo-draft-session.ts`
  - [x] 1.5 Écrire les tests unitaires pour `solo-draft-session.ts` dans `tests/unit/solo-draft/solo-draft-session.test.ts`
- [x] 2. Serveur Web & Endpoints API (`scripts/serve-web.mjs`)
  - [x] 2.1 Intégrer la prise en charge des routes `/reports/*` pour servir les fichiers de rapport statiques
  - [x] 2.2 Implémenter les routes REST `/api/draft/start`, `/api/draft/pick`, `/api/draft/deck`, `/api/leaderboard`, `/api/reports`
  - [x] 2.3 Écrire un test d'intégration de flux complet dans `tests/integration/solo-draft-flow.test.ts`
- [x] 3. Interface Utilisateur & Expérience Rétro (`src/web/`)
  - [x] 3.1 Ajouter les onglets et conteneurs HTML dans `src/web/index.html` (Lobby, Draft, Deckbuilder, Résultat, Mur des Records, Admin Reports)
  - [x] 3.2 Créer le script client `src/web/leaderboard.js` pour le rendu rétro arcade
  - [x] 3.3 Créer le script client `src/web/solo-draft.js` pour le pilotage du draft, du chronomètre et du deckbuilder
  - [x] 3.4 Mettre à jour `src/web/app.js` pour intégrer les routes SPA `/draft` et `/records`
  - [x] 3.5 Styliser l'ensemble dans `src/web/styles.css` (arène de draft, deckbuilder, leaderboard arcade)
- [x] 4. Validation & Assurance Qualité
  - [x] 4.1 Exécuter la suite de tests complète (`npm run test`)
  - [x] 4.2 Exécuter le quality gate complet (`npm run check`)
  - [x] 4.3 Vérifier manuellement le parcours complet et l'enregistrement des rapports
- [x] 5. Supabase Cloud, Effet Whaou & Télémétrie d'Exploitation
  - [x] 5.1 Schéma PostgreSQL `supabase/schema.sql` (RLS, tables, profils seed et Realtime)
  - [x] 5.2 Adaptateur `src/storage/cloud-leaderboard.ts` et client `src/storage/supabase-client.ts` avec résilience hors-ligne
  - [x] 5.3 Sélecteur d'identité des 8 Magiciens, partage WhatsApp 1-clic et onglet Panthéon dans la web app
  - [x] 5.4 Endpoints de santé et télémétrie (`GET /health`, `/health/live`, `/health/ready`) dans `scripts/serve-web.mjs`
  - [x] 5.5 Configuration de déploiement et point d'entrée `start` dans `package.json` pour Railway

