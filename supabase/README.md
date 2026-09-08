# Configuration de Supabase pour DraftMaster (LMCDEU)

Pour activer le cloud PostgreSQL et les notifications temps réel (Realtime) du Mur des Records, suivez ces 3 étapes simples :

---

### Étape 1 : Créer votre projet Supabase (Gratuit)

1. Rendez-vous sur [https://supabase.com](https://supabase.com) et connectez-vous (via GitHub par exemple).
2. Cliquez sur **"New project"**.
3. Donnez-lui un nom (ex: `draftmaster-lmcdeu`), un mot de passe de base de données fort, et choisissez une région proche (ex: `eu-west-3` Paris ou `eu-central-1` Francfort).
4. Cliquez sur **"Create new project"** (le provisionnement prend environ 1 minute).

---

### Étape 2 : Exécuter le script SQL

1. Dans le menu latéral de votre projet Supabase, cliquez sur **"SQL Editor"** (icône `>_`).
2. Cliquez sur **"New query"**.
3. Copiez l'intégralité du contenu du fichier [`schema.sql`](./schema.sql) et collez-le dans l'éditeur.
4. Cliquez sur le bouton vert **"Run"** (en bas à droite).
5. Vous verrez les tables créées (`magiciens_profiles`, `draft_records`, `admin_drafts`) et les 8 profils des Magiciens insérés !

---

### Étape 3 : Configurer vos variables d'environnement

1. Dans le menu latéral de Supabase, cliquez sur **"Project Settings"** (l'icône d'engrenage en bas), puis sur **"API"**.
2. Récupérez :
   * **Project URL** (ex: `https://xyzcompany.supabase.co`)
   * **Project API keys** -> clé **`anon` `public`** (ex: `eyJhbGci...`)
   * (Optionnel) clé **`service_role`** pour les droits d'écriture complets côté serveur.
3. Définissez les variables d'environnement dans votre fichier `.env` ou sur votre hébergeur (Railway/Render) :

```bash
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre_cle_anon_publique
# Optionnel mais recommandé pour le serveur :
SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_role
```

---

### Résilience Offline / Local-First

Si ces variables ne sont pas définies ou si la connexion internet est indisponible, **DraftMaster bascule automatiquement et silencieusement sur le stockage JSON local** (`data/leaderboard.json` et `data/admin-drafts.json`). Rien ne plante !
