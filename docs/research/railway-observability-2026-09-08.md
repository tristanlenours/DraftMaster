# Observabilité cible sur Railway

**Recommandation du 8 septembre 2026** : pour le MVP, utiliser Railway pour
les logs, les métriques d'infrastructure et les événements de déploiement,
ajouter des logs JSON métier dans l'application, Sentry pour les exceptions et
traces utiles, et un contrôle d'uptime extérieur au projet. Ne pas déployer une
stack OpenTelemetry/Prometheus/Grafana complète au lancement.

Cette proposition complète
[`railway-target-architecture-2026-09-08.md`](./railway-target-architecture-2026-09-08.md).
Le journal PostgreSQL reste la preuve canonique des picks ; la télémétrie sert à
détecter et diagnostiquer, jamais à reconstruire un draft.

## Architecture recommandée

```text
Navigateur
    |
    v
draftmaster-web (Node.js)
    |-- logs JSON stdout --------------------> Railway Log Explorer
    |-- erreurs + traces échantillonnées ----> Sentry
    |-- commandes transactionnelles --------> PostgreSQL
    |                                           |-- logs et métriques Railway
    |                                           `-- stats DB via Railway CLI
    `-- /health/ready <----------------------- moniteur d'uptime externe

Railway Dashboard : CPU, RAM, disque, réseau, coût
Railway Webhooks  : deploy failed/crashed ------------> Slack ou Discord
GitHub Actions    : smoke test après déploiement
```

## Ce que Railway fournit réellement

| Capacité    | Couverture vérifiée                                                                                                                                                        | Limite à retenir                                                                                                              |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Logs        | Capture de `stdout`/`stderr`, recherche multi-services, filtres sur les attributs JSON, HTTP et DNS                                                                        | Rétention : Free 3 j, Hobby 7 j, Pro 30 j, Enterprise jusqu'à 90 j ; 500 lignes/s/réplique, puis suppression de lignes        |
| Métriques   | Dashboard CPU, RAM, disque et réseau ; `railway metrics` ajoute totaux HTTP, statuts, taux d'erreur, percentiles de latence et certaines statistiques des bases supportées | Les métriques internes comme durée d'une transaction, replay échoué ou draft abandonné ne sont pas collectées automatiquement |
| Alertes     | Webhooks pour états de déploiement, crashs et alertes ; Monitors sur CPU, RAM, disque et egress                                                                            | Les Monitors exigent le plan Pro et ne couvrent pas les invariants métier                                                     |
| Healthcheck | Attend un `2xx` avant d'activer un nouveau déploiement                                                                                                                     | Appelé au déploiement seulement, pas en continu                                                                               |
| Export      | SDK fournisseur ou OTLP documentés                                                                                                                                         | Aucun réglage de log drain natif ; Vector/Fluent Bit exige un service séparé                                                  |

Sources : [logs Railway](https://docs.railway.com/observability/logs),
[métriques du dashboard](https://docs.railway.com/observability/metrics),
[`railway metrics`](https://docs.railway.com/cli/metrics),
[dashboard et Monitors](https://docs.railway.com/observability),
[healthchecks](https://docs.railway.com/deployments/healthchecks) et
[observabilité tierce](https://docs.railway.com/guides/third-party-observability).

Les webhooks Railway sont **best-effort**, non ordonnés, retentés jusqu'à trois
fois et non signés. Un secret dans l'URL est recommandé, et un webhook ne doit
pas devenir une source de vérité. Railway sait adapter directement les webhooks
Slack et Discord. [Webhooks Railway](https://docs.railway.com/observability/webhooks)

## Socle MVP

### 1. Logs JSON structurés

Émettre une ligne JSON par événement avec des noms de champs stables. Railway
analyse automatiquement les objets JSON sur une seule ligne et rend leurs
attributs filtrables. [Guide Railway des logs structurés](https://docs.railway.com/guides/structured-logging-production)

Champs communs :

- `timestamp`, `level`, `event`, `requestId`, `traceId` ;
- `route`, `method`, `statusCode`, `durationMs` ;
- `environment`, `release`, `replica` à partir de
  `RAILWAY_ENVIRONMENT_NAME`, `RAILWAY_DEPLOYMENT_ID` et
  `RAILWAY_REPLICA_ID` ;
- `sessionRef` opaque ou hachée, jamais un jeton permettant de reprendre la
  session.

Événements métier prioritaires :

- `draft.started`, `draft.resumed`, `pick.committed`, `draft.finalized` ;
- `request.replayed` pour un `requestId` déjà traité ;
- `revision.conflict`, `session.replay_failed`, `persistence.failed` ;
- `report.generated`, `report.generation_failed`.

Pour une commande de draft, ajouter `cubeKey`, `revisionBefore`,
`revisionAfter`, `eventSequence`, `outcome`, `errorCode`, `dbDurationMs` et
`replayedEventCount`. Le log `pick.committed` doit être écrit **après** le commit
PostgreSQL ; aucun message de succès anticipé.

### 2. Métriques et erreurs

- Utiliser le dashboard Railway pour CPU, mémoire, réseau, disque et corrélation
  avec les déploiements.
- Utiliser `railway metrics --http` pour le volume, les 5xx et les percentiles
  par route ; `railway metrics` sur PostgreSQL complète les ressources avec les
  statistiques natives reconnues par la CLI.
- Ajouter Sentry au service Node pour les exceptions non gérées et quelques
  traces des parcours `start -> picks -> finalize`, en renseignant
  environnement et release avec les variables Railway. Railway classe le SDK
  fournisseur comme l'option la moins complexe pour la plupart des projets ;
  OTLP est l'option plus complexe et portable.

Ne pas créer de métriques avec `sessionId`, `playerName` ou `cardInstanceId`
comme labels : leur cardinalité serait non bornée. Les labels autorisés restent
petits et stables, par exemple `route`, `cubeKey`, `outcome` et `errorCode`.

### 3. Santé et alertes

- `GET /health/live` : le processus répond, sans dépendance externe.
- `GET /health/ready` : vérifie au minimum une requête PostgreSQL légère et la
  présence de la version de schéma attendue, sans écriture. Ne renvoyer aucun
  secret ni détail interne.
- Configurer `/health/ready` comme healthcheck Railway de déploiement.
- Interroger aussi cet endpoint toutes les minutes depuis un moniteur extérieur
  au projet ; Railway précise que son healthcheck n'est pas continu.
- Envoyer les webhooks `Deployment.failed` et `Deployment.crashed` vers un canal
  Slack ou Discord. Déclencher un vrai déploiement pour tester la chaîne, car le
  bouton de test peut rencontrer des restrictions CORS.
- Sur Pro, ajouter les Monitors CPU, RAM et disque pour l'application et
  PostgreSQL. Sur Hobby, Sentry et le contrôle d'uptime portent l'alerte
  applicative.

### 4. PostgreSQL et sauvegardes

Pour le MVP, suivre : CPU, RAM, disque, redémarrages, connexions/pool côté
application, durée des transactions, erreurs SQL et conflits de révision.
Railway recommande Prometheus, Grafana et PostgreSQL Exporter pour un suivi plus
riche ; ces templates sont à exploiter et maintenir par le projet, donc ils
restent hors du MVP. [PostgreSQL Railway](https://docs.railway.com/databases/postgresql)

La santé de sauvegarde appartient aussi à l'observabilité : alerter si le
dernier backup dépasse 26 heures, si le PITR n'est plus actif ou si le dernier
`pg_dump`/test de restauration échoue. Les trois couches sont complémentaires ;
un dump extérieur au projet reste nécessaire pour une copie portable.
[Sauvegarde et restauration PostgreSQL](https://docs.railway.com/guides/postgres-backups-restores)

## Objectifs de service initiaux

Ces seuils sont des objectifs de départ à recalibrer après deux à quatre
semaines de trafic :

| Signal        | Objectif                                                                       | Alerte initiale                                                                                           |
| ------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Durabilité    | 100 % des commandes d'écriture ayant répondu `2xx` sont commitée et rejouables | Toute réponse `2xx` sans événement canonique, tout échec de replay ou toute double application : immédiat |
| Disponibilité | 99,5 % sur 30 jours pour `/health/ready`                                       | Deux échecs consécutifs à une minute d'intervalle                                                         |
| Erreurs API   | Moins de 1 % de 5xx sur les routes `/api/draft/*`                              | Au moins 3 erreurs et plus de 5 % sur 5 min, pour éviter le bruit à faible trafic                         |
| Pick          | p95 inférieur à 750 ms                                                         | p95 supérieur à 1,5 s pendant 10 min                                                                      |
| Finalisation  | p95 inférieur à 5 s                                                            | p95 supérieur à 10 s pendant 10 min                                                                       |
| Sauvegarde    | backup quotidien récent et restauration testée mensuellement                   | backup âgé de plus de 26 h ou exercice échoué                                                             |

Les abandons de drafts, la durée médiane, le taux de finalisation, les cubes
joués et les erreurs de validation sont des indicateurs produit à consulter
chaque semaine, pas des pages d'astreinte.

## Vie privée et sécurité

- Ne jamais journaliser `playerName`, corps HTTP, cookies, jetons, en-têtes
  d'autorisation, contenu complet d'un deck ou URL présignée de rapport.
- Ne pas recopier dans les logs applicatifs l'IP ou le user-agent déjà visibles
  dans les logs HTTP Railway.
- Nettoyer les données envoyées à Sentry et échantillonner les traces réussies ;
  conserver toutes les erreurs de persistance et de replay.
- Limiter l'accès au projet Railway et au fournisseur d'observabilité ; séparer
  strictement staging et production.
- Documenter la durée de rétention : sur Hobby, les logs Railway disparaissent
  après sept jours. Les données d'audit durables restent dans PostgreSQL avec
  leur propre politique explicite.

## Évolution ultérieure

Passer à OpenTelemetry seulement lorsqu'il faut corréler plusieurs services,
mesurer finement PostgreSQL et le Bucket, ou changer de backend sans
réinstrumenter. Railway documente l'export OTLP vers un fournisseur ou un
Collector auto-hébergé ; dans ce dernier cas, le client doit supporter le réseau
privé IPv6. Le SDK OTel doit appeler `shutdown()` à la réception de `SIGTERM`
pour ne pas perdre les derniers spans.
[OpenTelemetry sur Railway](https://docs.railway.com/guides/third-party-observability)

À ce stade seulement : OpenTelemetry SDK Node, Collector, backend de traces et
métriques, puis PostgreSQL Exporter + Prometheus/Grafana si les statistiques
natives et l'instrumentation applicative ne suffisent plus.

## Vérification de chaque déploiement

1. Bloquer l'autodeploy tant que `npm run check` n'est pas vert avec **Wait for
   CI**. [GitHub autodeploys](https://docs.railway.com/deployments/github-autodeploys)
2. Lancer les migrations avant activation, puis laisser `/health/ready` valider
   la connectivité et la version du schéma.
3. Sur l'événement GitHub `deployment_status: success`, exécuter un smoke test :
   charger la page, démarrer une session de test, committer un pick avec
   `requestId`, rejouer ce même appel et vérifier qu'il n'existe qu'un événement
   PostgreSQL. Railway documente ce déclencheur post-déploiement.
   [GitHub Actions post-deploy](https://docs.railway.com/guides/github-actions-post-deploy)
4. Vérifier que le nouveau `RAILWAY_DEPLOYMENT_ID` apparaît dans les logs et
   Sentry, puis contrôler le webhook par un déploiement réel.
5. En cas d'échec, garder le déploiement précédent actif ou revenir à la version
   précédente ; ne jamais « corriger » un incident de persistance en supprimant
   son journal canonique.
