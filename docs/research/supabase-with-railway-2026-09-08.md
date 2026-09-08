# Supabase avec Railway pour DraftMaster

**Décision recommandée (8 septembre 2026)** : conserver l'application Node.js
sur Railway et utiliser **Supabase Pro** pour PostgreSQL, Storage et Auth. Cette
cible coûte davantage qu'une pile 100 % Railway, mais retire l'exploitation
quotidienne de PostgreSQL du projet et fournit l'authentification dont les routes
joueur et administration auront besoin. L'offre Supabase Free est adaptée au
développement, pas à une application publique qui promet de conserver les
drafts.

Cette décision ne change pas le contrat de durabilité : PostgreSQL reste la
source de vérité, chaque commande de draft est validée par une transaction, et
les rapports restent des dérivés régénérables.

## Architecture cible

```text
Navigateur
   |-- interface et /api/* ----------------> DraftMaster sur Railway
   |                                           |-- moteur déterministe
   |                                           |-- validation métier
   |                                           |-- logs JSON + Sentry
   |                                           |
   |                                           +--> Supabase PostgreSQL
   |                                           |      sessions
   |                                           |      journal append-only
   |                                           |      résultats/leaderboard
   |                                           |      outbox de rapports
   |                                           |
   |                                           +--> Supabase Storage
   |                                                  rapports privés
   |                                                  assets publics éventuels
   |
   +-- connexion/jeton ----------------------> Supabase Auth
                                               JWT vérifié par Railway
```

Le navigateur ne doit pas écrire directement dans les tables métier au départ.
Il s'authentifie auprès de Supabase, puis présente son JWT à l'API Railway ;
l'API reste l'unique porte d'entrée du moteur et l'unique auteur des événements
de draft. Supabase Auth prend en charge mot de passe, magic link/OTP et OAuth,
émet des JWT et s'intègre à la Row Level Security (RLS).
[Auth](https://supabase.com/docs/guides/auth)

La clé secrète ou `service_role`, qui contourne la RLS, reste exclusivement dans
les variables Railway. Elle ne doit jamais être envoyée au navigateur.
[Clés API](https://supabase.com/docs/guides/getting-started/api-keys)

## Garantie d'enregistrement d'un draft

Pour chaque création, pick et finalisation, l'API doit :

1. ouvrir une transaction PostgreSQL sur une connexion réservée ;
2. verrouiller la session ou vérifier son `expectedRevision` ;
3. refuser ou rejouer un `requestId` déjà vu grâce à une contrainte unique
   `(session_id, request_id)` ;
4. ajouter les événements au journal append-only et mettre à jour le checkpoint
   et la révision ;
5. committer avant d'envoyer une réponse `2xx`.

Un crash après la réponse ne peut ainsi pas effacer le pick. La `Map` Node
actuelle peut subsister comme cache, jamais comme autorité.

PostgreSQL et Storage ne partagent pas une transaction atomique. La finalisation
doit donc enregistrer le résultat et une tâche `report_pending` dans la même
transaction, puis produire le rapport avec une clé idempotente telle que
`reports/<sessionId>/walkthrough.html`. Un échec d'upload est réessayé ; le
journal permet toujours de régénérer le fichier.

## Comparaison des deux cibles

| Sujet | Railway + Railway Postgres/Bucket | Railway + Supabase Pro |
| --- | --- | --- |
| Exploitation de PostgreSQL | Le template est **non géré** : backups, sécurité, réglages et surveillance restent à notre charge. [Bases Railway](https://docs.railway.com/databases) | Supabase opère l'infrastructure et fournit dashboard, sauvegardes et outils ; schéma, migrations, sécurité applicative, index et tests de restauration restent à notre charge. [Responsabilité partagée](https://supabase.com/docs/guides/deployment/shared-responsibility-model) |
| Réseau | Réseau privé chiffré, sans exposition publique ni egress, dans le même projet Railway. [Réseau privé](https://docs.railway.com/networking/private-networking/how-it-works) | Connexion externe TLS entre deux fournisseurs ; elle ajoute un saut réseau et une seconde dépendance de plateforme. |
| Pool de connexions | PgBouncer n'est pas présent par défaut et doit être ajouté/configuré. [Pooling Railway](https://docs.railway.com/guides/connection-pooling-pgbouncer) | Supavisor partagé est fourni ; une connexion directe ou un pool dédié existe selon le plan et le réseau. [Connexions Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres) |
| Sauvegardes DB | Backups/PITR à activer et surveiller. Le PITR conserve environ quatre semaines et ne facture pas d'option dédiée, seulement le stockage Bucket et l'egress d'archivage. La restauration crée un nouveau service, puis impose une bascule manuelle. [PITR Railway](https://docs.railway.com/volumes/point-in-time-recovery) | Backup quotidien automatique, 7 jours de rétention en Pro. Le PITR coûte actuellement environ 100 $/mois pour 7 jours et exige au moins un compute Small. [Backups Supabase](https://supabase.com/docs/guides/platform/backups) |
| Fichiers | Bucket S3 privé uniquement ; URL présignée ou proxy. Pas encore de versioning ni de backup natif. [Buckets Railway](https://docs.railway.com/storage-buckets) | Buckets privés par défaut avec JWT/RLS ou URL signée ; buckets publics et CDN disponibles. [Buckets Supabase](https://supabase.com/docs/guides/storage/buckets/fundamentals) |
| Auth | Composant supplémentaire ou implémentation applicative à choisir. | Auth, utilisateurs, JWT et RLS intégrés. Un SMTP externe est requis pour des emails Auth de production. [SMTP](https://supabase.com/docs/guides/auth/auth-smtp) |
| Observabilité | Logs/métriques Railway ; PostgreSQL restant auto-opéré. | Logs DB, API, Auth et Storage dans Supabase, mais logs métier toujours dans Railway/Sentry. La rétention Pro est de 7 jours. [Logs Supabase](https://supabase.com/docs/guides/observability/logs) |
| Complexité | Un seul fournisseur et latence minimale ; davantage d'exploitation DB et d'auth à construire. | Deux fournisseurs et deux consoles ; moins d'exploitation DB et beaucoup moins d'auth à construire. |

## Tarifs et limites utiles au MVP

Les tarifs ci-dessous ont été vérifiés le 8 septembre 2026 et peuvent évoluer.

- Railway Hobby coûte 5 $/mois minimum et inclut 5 $ d'usage ; CPU, RAM, volume
  et egress dépassant ce crédit sont facturés à l'usage. Les logs sont conservés
  7 jours. [Tarifs Railway](https://railway.com/pricing)
- Supabase Free inclut 500 Mo de base, 1 Go de Storage et 50 000 utilisateurs
  actifs mensuels, mais **aucun backup automatique**. Un projet peu actif peut
  être mis en pause après environ sept jours ; il peut être repris depuis le
  dashboard pendant un an. Cette interruption et l'absence de backup excluent
  Free pour la production.
  [Tarifs Supabase](https://supabase.com/pricing)
  [Mise en pause](https://supabase.com/docs/guides/platform/free-project-pausing)
- Supabase Pro commence à 25 $/mois, ne met pas les projets en pause pour
  inactivité et inclut notamment 8 Go de disque DB, 100 Go de Storage,
  100 000 MAU et les backups DB quotidiens conservés 7 jours.
  [Facturation Supabase](https://supabase.com/docs/guides/platform/billing-on-supabase)

Le minimum prévisible de la cible est donc **environ 30 $/mois** : 25 $ pour
Supabase Pro et 5 $ pour Railway Hobby, avant dépassements, SMTP et Sentry. Le
PITR Supabase est disproportionné pour le premier MVP ; le compromis initial est
backup quotidien Pro + `pg_dump` chiffré hors fournisseur + exercice périodique
de restauration.

Attention : les backups de base Supabase sauvegardent seulement les métadonnées
Storage, pas les objets eux-mêmes. Les rapports doivent rester régénérables et
les fichiers non reproductibles doivent avoir un export séparé.
[Périmètre des backups](https://supabase.com/docs/guides/platform/backups)

## Connexion et région

Le processus Node Railway est durable et long-lived. La cible principale est :

- activer l'IPv6 sortant sur le service Railway, option désactivée par défaut ;
- utiliser la connexion directe Supabase sur le port 5432 avec TLS et un petit
  pool applicatif `pg` ;
- réserver une connexion du pool pendant toute transaction ;
- utiliser aussi la connexion directe pour migrations et `pg_dump`.

Railway prend officiellement en charge l'IPv6 sortant sur activation.
[Réseau sortant Railway](https://docs.railway.com/networking/outbound-networking)
Si cette voie échoue, Supavisor en **mode session** sur le port 5432 est le
fallback IPv4 recommandé par Supabase pour un backend persistant. Le mode
transaction 6543 vise surtout les processus serverless ou éphémères.
[Choisir une connexion](https://supabase.com/docs/guides/database/connecting-to-postgres)

Si une allowlist IP stricte devient nécessaire, Railway ne propose les IP
sortantes IPv4 statiques qu'à partir du plan Pro ; il faut inclure ce coût dans
la décision de sécurité.
[IP sortantes statiques](https://docs.railway.com/networking/static-outbound-ips)

Railway EU West s'exécute à Amsterdam ; Supabase propose notamment Paris et
Francfort, mais pas Amsterdam. Il faut choisir une région Supabase précise,
tester Amsterdam-Paris et Amsterdam-Francfort, puis garder celle qui minimise la
latence des transactions. Une région Supabase ne se change pas en place : il
faut migrer vers un nouveau projet.
[Régions Railway](https://docs.railway.com/deployments/regions)
[Régions Supabase](https://supabase.com/docs/guides/platform/regions)

## Observabilité et exploitation

Supabase complète l'observabilité proposée précédemment, il ne la remplace pas :

- Railway/Pino : requêtes HTTP et événements métier (`pick.committed`,
  `revision.conflict`, `draft.finalized`) ;
- Sentry : exceptions et traces de bout en bout ;
- Supabase : requêtes lentes, erreurs PostgreSQL, Auth et Storage ;
- un même `requestId` et `sessionId` pseudonymisé dans les trois systèmes ;
- monitor externe sur `/health/ready`, qui vérifie PostgreSQL sans exposer de
  donnée sensible.

Le plan de reprise doit être testé, pas seulement configuré : restauration d'un
dump sur un projet isolé, reconstruction complète d'un draft depuis son journal,
retry d'un même `requestId` sans double pick, et régénération d'un rapport absent.

## Conclusion

Supabase Pro est le meilleur choix si DraftMaster doit rapidement avoir des
comptes joueurs, un historique personnel et une administration sécurisée. Il
apporte une économie de travail produit et d'exploitation qui justifie les
environ 25 $/mois supplémentaires pour ce MVP.

Si l'objectif se réduit à une démo anonyme à très bas coût, la pile 100 % Railway
reste plus rationnelle et offre un PITR bien moins cher. Ce n'est toutefois pas
la cible retenue ici : **Railway héberge l'application sans état local ; Supabase
Pro porte l'identité, l'état canonique et les rapports.**
