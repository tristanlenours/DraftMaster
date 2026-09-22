# Configuration de Supabase pour DraftMaster (LMCDEU)

## Gestion de tournois

La gestion de tournois utilise PostgreSQL/Supabase comme autorité de production. Elle ne bascule
jamais silencieusement vers un fichier ou une mémoire locale si la base est absente ou
indisponible.

1. Appliquer d'abord [`schema.sql`](./schema.sql) pour le schéma historique de DraftMaster.
2. Appliquer ensuite, dans l'ordre, les fichiers de [`migrations/`](./migrations/), notamment
   `202609210001_tournament_management.sql`.
3. Configurer le processus serveur avec `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`.

La clé `service_role` est obligatoire pour les routes de tournoi et doit rester exclusivement côté
serveur. La clé anonyme ne donne aucun droit sur les tables `tournaments`, `tournament_events`,
`tournament_command_receipts` et `cube_snapshot_archive`. Toutes les mutations passent par la RPC
transactionnelle `commit_tournament`; une configuration absente, un timeout ou une erreur de base
doit être exposé comme `STORE_UNAVAILABLE`/HTTP 503.

Exemple de variables serveur :

```bash
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_role
```

Après application, vérifier dans l'éditeur SQL que la fonction et les quatre tables existent, que
RLS est activé et que seuls les appels serveur peuvent lire les tables ou exécuter la RPC. Le test
local `tests/integration/tournament-management-postgres.test.ts` vérifie le contrat de migration et
l'adapter, mais ne remplace pas une exécution de la migration dans un projet Supabase de recette.

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
   - **Project URL** (ex: `https://xyzcompany.supabase.co`)
   - **Project API keys** -> clé **`anon` `public`** (ex: `eyJhbGci...`)
   - Clé **`service_role`** pour les droits d'écriture complets côté serveur. Elle est obligatoire
     pour la gestion de tournois, mais ne doit jamais être exposée au navigateur.
3. Définissez les variables d'environnement dans votre fichier `.env` ou sur votre hébergeur (Railway/Render) :

```bash
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre_cle_anon_publique
# Obligatoire pour les routes de tournoi :
SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_role
```

---

### Résilience Offline / Local-First

Le Mur des Records historique peut encore utiliser son comportement local-first. Ce comportement ne
s'applique pas aux tournois : sans stockage PostgreSQL prêt, leurs routes d'écriture échouent
explicitement et aucune donnée de tournoi n'est annoncée comme persistée.
