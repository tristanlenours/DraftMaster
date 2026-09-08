# Architecture cible Railway — persistance durable des drafts

**Décision recommandée (8 septembre 2026)** : déployer DraftMaster comme un
service web Node.js **sans état local**, conserver l'état canonique des sessions,
leurs événements et leurs résultats dans **PostgreSQL**, et déposer les rapports
HTML générés dans un **Railway Bucket** privé compatible S3. Redis et un volume
attaché à l'application ne sont pas nécessaires au lancement.

Cette cible demande plus de travail que monter simplement un volume sous le
serveur actuel, mais elle répond au besoin « un draft ne doit pas être perdu » :
chaque création, pick et finalisation devient une écriture transactionnelle avant
la réponse HTTP. Elle évite aussi deux limites Railway structurantes : un service
avec volume ne peut pas avoir de réplicas et subit une courte interruption à
chaque redéploiement. [Volumes Railway](https://docs.railway.com/volumes/reference)
[Healthchecks Railway](https://docs.railway.com/deployments/healthchecks)

## Architecture actuellement en place

Le dépôt contient une application full-stack simple, exécutée dans un seul
processus :

| Couche | Stack et responsabilité actuelles |
| --- | --- |
| Runtime | Node.js 24, npm 11, ESM strict ; TypeScript 6 est exécuté avec le type stripping natif de Node |
| Serveur HTTP | `node:http` dans `scripts/serve-web.mjs`, routage API et fichiers statiques dans le même handler |
| Interface | HTML, CSS et JavaScript navigateur sans framework sous `src/web/` |
| Domaine | Moteur TypeScript déterministe, données de cubes/cartes JSON locales, validation AJV |
| Sessions actives | Instances `SoloDraftSession` conservées dans une `Map` du processus |
| Résultats | Deux rapports HTML sous `reports/`, leaderboard dans `data/leaderboard.json`, index admin dans `data/admin-drafts.json` |
| QA | ESLint, Prettier, `tsc --noEmit`, Vitest et couverture via `npm run check` |

Les éléments de preuve locaux sont le
[`package.json`](../../package.json), le
[`serve-web.mjs`](../../scripts/serve-web.mjs),
[`solo-draft-session.ts`](../../src/solo-draft/solo-draft-session.ts),
[`leaderboard.ts`](../../src/solo-draft/leaderboard.ts) et
[`admin-drafts.ts`](../../src/solo-draft/admin-drafts.ts).

### Risques actuels à corriger

- Un redémarrage, crash ou déploiement détruit la `Map` et donc tout draft en
  cours. Railway peut par ailleurs initier des redéploiements de plateforme ;
  l'état du conteneur ne doit jamais être considéré comme durable.
  [Cycle des déploiements](https://docs.railway.com/deployments/reference)
- Les fichiers JSON sont modifiés par lecture puis réécriture complète, sans
  transaction ni verrou inter-requête. Deux finalisations concurrentes peuvent
  perdre une entrée.
- La finalisation enchaîne plusieurs écritures indépendantes (rapports,
  leaderboard, index admin). Une panne intermédiaire produit un résultat partiel.
- Les noms de rapports reposent sur `seed + playerName`, donc deux drafts peuvent
  écraser le même fichier. L'index admin supprime en outre volontairement les
  entrées au-delà des 50 plus récentes ; ce n'est pas un archivage durable.
- L'administration est exposée en lecture sans authentification et le CORS est
  ouvert à toutes les origines.
- Le dépôt n'a pas de script `start` ; Railway ne trouvera pas automatiquement
  `npm run web` comme commande standard. Railpack détecte bien Node grâce au
  `package.json` et résout sa version d'abord depuis `engines.node`, mais il faut
  fournir une commande de démarrage explicite.
  [Node.js dans Railpack](https://railpack.com/languages/node/)
  [Commande de démarrage](https://docs.railway.com/deployments/start-command)

## Topologie Railway cible

```text
Internet
   |
   v
draftmaster-web (Node.js 24, 1+ réplicas possibles, aucun volume)
   |-- sert l'interface et /api/*
   |-- écrit une transaction par commande de draft
   |
   +--> PostgreSQL privé
   |      sessions + journal de picks + résultats + leaderboard + index admin
   |
   +--> Railway Bucket privé (S3)
          rapports HTML dérivés, clés basées sur sessionId
```

PostgreSQL et le Bucket restent accessibles par références de variables ; la
base n'a pas besoin de TCP public. Railway recommande le réseau privé entre
services du même projet et fournit `DATABASE_URL` avec son template PostgreSQL.
[Réseau privé](https://docs.railway.com/overview/best-practices)
[PostgreSQL Railway](https://docs.railway.com/databases/postgresql)

### Stack technique cible

| Élément | Choix | Motif |
| --- | --- | --- |
| Application | Node.js 24 + TypeScript ESM | Conserve le moteur et le serveur existants ; Railpack lit déjà `engines.node` |
| HTTP/frontend | Serveur Node actuel + interface vanilla, dans un service | Migration minimale et appels `/api/*` de même origine |
| Persistance canonique | PostgreSQL Railway | Transactions, concurrence contrôlée, requêtes admin/leaderboard et future réplication applicative |
| Modèle de session | Snapshot versionné + journal append-only des commandes/picks | Reprise exacte après redémarrage et traçabilité/audit |
| Rapports | Railway Bucket S3 privé | Objets volumineux séparés de la base ; accès par proxy ou URL présignée |
| Cache/coordination | Aucun au lancement | Redis ne résout aucun besoin que PostgreSQL ne couvre déjà à cette échelle |
| Déploiement | Railpack depuis GitHub, commande Node directe | Réutilise `package.json`; le processus reçoit correctement `SIGTERM` |
| Exploitation | `/health`, logs structurés, sauvegardes PostgreSQL, test de restauration | Rend le déploiement et la reprise vérifiables |

Les Buckets Railway sont privés et S3-compatibles ; les fichiers sont servis par
URL présignée ou via le backend. Ils n'ont actuellement ni versioning, ni object
lock, ni lifecycle, ni sauvegardes/snapshots natifs. Les rapports doivent donc
rester **reproductibles depuis le journal PostgreSQL**, et ne jamais être la seule
preuve d'un draft. [Railway Buckets](https://docs.railway.com/storage-buckets)

## Contrat de durabilité recommandé

Le détail du schéma appartient au plan d'implémentation, mais ces invariants
doivent être contraignants :

1. `draft_sessions` conserve l'identité, la seed, la version du moteur et du
   snapshot de cube, le statut, la version optimiste et le dernier état utile.
2. `draft_events` est append-only, ordonné par `(session_id, sequence)` et stocke
   chaque commande acceptée. Un `request_id` unique rend un retry idempotent.
3. Un pick est validé puis journalisé avec la nouvelle version de session dans
   **une transaction** ; la réponse HTTP n'est envoyée qu'après commit.
4. Une session absente de la mémoire est reconstruite depuis PostgreSQL. La
   mémoire devient un cache jetable et non une source de vérité.
5. La finalisation est idempotente : un second appel retourne le résultat déjà
   enregistré. Résultat, statut final, entrée de classement et index admin sont
   commités ensemble.
6. Les rapports utilisent une clé immuable comme
   `reports/<sessionId>/walkthrough.html`. Un état `report_status` permet de
   reprendre leur génération après une panne ; le contenu reste régénérable.
7. Aucun draft terminé n'est supprimé implicitement. Toute future rétention est
   une décision produit explicite avec export et audit.

PostgreSQL et Redis proposés par Railway sont des services **non managés** au
sens opérationnel : sauvegardes, reprise, sécurité, surveillance et maintenance
restent sous la responsabilité du projet. [Bases de données Railway](https://docs.railway.com/databases)

## Ajustements applicatifs requis

### Bloquants avant mise en ligne

1. Extraire derrière des ports explicites la persistance de session, des
   résultats et des rapports ; supprimer toute dépendance métier directe aux
   chemins `data/*.json` et `reports/`.
2. Ajouter les migrations PostgreSQL et remplacer la `Map` comme autorité par le
   chargement/rejeu depuis la base à chaque cache miss.
3. Persister chaque pick et tester la reprise au milieu des 45 picks, après un
   arrêt brutal et après un redéploiement.
4. Rendre la finalisation atomique/idempotente et supprimer la limite silencieuse
   des 50 drafts archivés.
5. Stocker les rapports dans le Bucket, puis adapter `/reports/*` à un proxy ou à
   une redirection présignée contrôlée.
6. Ajouter `GET /health` : il doit vérifier que le processus est prêt et que la
   base accepte une requête légère, sans modifier de données.
7. Écouter explicitement sur `0.0.0.0` et `process.env.PORT`. Railway injecte le
   port ; ne pas le coder en dur.
   [Dépannage réseau Railway](https://docs.railway.com/networking/troubleshooting/application-failed-to-respond)
8. Fournir une commande directe du type
   `node --no-warnings --experimental-strip-types scripts/serve-web.mjs`.
   Railway avertit qu'un lancement via npm peut intercepter `SIGTERM` ; ajouter
   un handler qui arrête d'accepter des requêtes et ferme le pool PostgreSQL.
   [SIGTERM Node.js sur Railway](https://docs.railway.com/deployments/troubleshooting/nodejs-sigterm-handling)
9. Protéger `/api/admin/*`, valider la taille et le schéma des requêtes, limiter
   le CORS au domaine de l'application, ajouter des en-têtes de sécurité et une
   limitation de débit sur les routes d'écriture.

### Configuration Railway minimale

- Un service `draftmaster-web` public en région Europe, sans volume, lié à la
  branche de production.
- Un service PostgreSQL privé ; injecter `DATABASE_URL` par référence de
  variable et ne pas activer de TCP public.
- Un Bucket dans la même région ; injecter ses identifiants S3 par références de
  variables. Un Bucket public n'est pas disponible.
- Healthcheck `/health`. Railway attend un statut `2xx` avant de rendre le
  nouveau déploiement actif, mais ce contrôle n'est effectué qu'au déploiement,
  pas en continu. [Healthchecks Railway](https://docs.railway.com/deployments/healthchecks)
- Politique de redémarrage `Always` sur un plan payant et durée de drainage non
  nulle. Railway utilise `On Failure` avec au plus 10 redémarrages par défaut ;
  l'ancien déploiement reçoit `SIGTERM`, puis `SIGKILL` après le délai de
  drainage. [Restart policy](https://docs.railway.com/deployments/restart-policy)
  [Deployment teardown](https://docs.railway.com/deployments/deployment-teardown)
- Déploiement bloqué sur la réussite des checks GitHub et environnement de
  staging séparé. C'est cohérent avec la checklist de production Railway.
  [Production readiness](https://docs.railway.com/overview/production-readiness-checklist)

## Sauvegarde et reprise

Pour PostgreSQL en production, la documentation Railway décrit trois couches :
sauvegardes du volume, restauration point-in-time (PITR) et exports portables
`pg_dump`. La cible DraftMaster doit activer les sauvegardes quotidiennes,
hebdomadaires et mensuelles, activer PITR, produire périodiquement un dump hors
du projet, puis effectuer un test de restauration documenté.
[Sauvegarder et restaurer PostgreSQL](https://docs.railway.com/guides/postgres-backups-restores)

Les sauvegardes de volume quotidiennes sont conservées 6 jours, les
hebdomadaires 27 jours et les mensuelles 89 jours. Elles ne se restaurent que
dans le même projet et environnement ; effacer le volume efface aussi ses
sauvegardes. Ce sont donc des moyens de reprise rapide, pas une copie hors site.
[Sauvegardes de volumes](https://docs.railway.com/volumes/backups)

Le test de reprise minimal doit prouver : restauration d'une session interrompue,
absence de double pick après retry, absence de double score après retry de
finalisation, régénération d'un rapport supprimé, puis restauration de la base
dans une instance sœur et comparaison des comptes/digests.

## Pourquoi pas un volume SQLite sur l'application ?

C'est un palier de lancement possible : monter un volume à `/app/var`, y placer
une base SQLite et les rapports, puis programmer ses sauvegardes. Railway confirme
que les sauvegardes couvrent aussi SQLite.
[Sauvegardes de volumes](https://docs.railway.com/volumes/backups)

Ce palier reste moins adapté au besoin exprimé : un seul volume par service,
aucun réplica possible, courte coupure à chaque redéploiement et reprise limitée
au même projet/environnement. Si la priorité absolue devient « publier avec le
moins de changements possible », il peut servir de phase transitoire clairement
bornée. Sinon, PostgreSQL évite une seconde migration de persistance peu après le
lancement.

## Seuils d'évolution

- Ajouter Redis seulement si des mesures montrent un besoin de cache partagé,
  de pub/sub ou de coordination à forte fréquence. Railway propose Redis et Redis
  HA, mais ces templates restent non managés et demandent sauvegardes et
  surveillance. [Redis Railway](https://docs.railway.com/databases/redis)
- Ajouter des réplicas web lorsque le trafic ou la disponibilité le justifie.
  Railway répartit les requêtes aléatoirement et ne fournit pas de sticky
  sessions : cette évolution n'est sûre que parce que toute session est déjà en
  PostgreSQL. [Scaling Railway](https://docs.railway.com/deployments/scaling)
- Séparer frontend/CDN, API et génération asynchrone de rapports uniquement si
  les métriques montrent un gain. Ce découpage n'est pas requis pour le MVP.

## Sources primaires consultées

- Railway : volumes, sauvegardes, cycle des déploiements, healthchecks,
  redémarrages, scaling, PostgreSQL, Redis, Buckets, réseau privé et checklist de
  production.
- Railpack : détection Node.js, résolution de version et gestionnaire de paquets.

