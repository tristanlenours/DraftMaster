# Hébergement MVP — explorateur statique puis API TypeScript

**Décision recommandée (8 septembre 2026)** : publier d'abord le périmètre
lecture seule (« explorateur de cubes, cartes et rapports ») sur **Cloudflare
Pages Free**, connecté à GitHub. Lorsqu'une API sera nécessaire, garder le
même fournisseur mais la concevoir explicitement pour **Cloudflare Workers /
Pages Functions**. Ne pas essayer de déposer le serveur Node actuel tel quel
sur un hébergeur statique.

Cette proposition privilégie une première URL publique gratuite, des
prévisualisations par branche/PR, et une migration sans changement de
fournisseur. Elle ne constitue pas une mise en production : aucun fichier de
déploiement ni code applicatif n'est modifié par cette note.

## État constaté dans ce dépôt

Le serveur lancé par `npm run web` (`scripts/serve-web.mjs`) sert les fichiers
web et `data/`, mais il expose aussi `POST /api/draft/start`,
`POST /api/draft/pick` et `POST /api/draft/deck`. Il maintient les sessions de
draft en mémoire et lit/écrit des données et rapports via `node:fs`.

Par conséquent, **seul le périmètre lecture seule** est candidat à un premier
déploiement statique. Le solo draft, le leaderboard, l'administration et les
rapports créés à l'exécution ne le sont pas, sans travail de séparation et de
persistance.

L'inventaire local du 8 septembre 2026 pour un artefact qui réunirait
`src/web`, `data` et `reports` est de 6 998 fichiers, 494 Mio, avec un plus
gros fichier à 16,86 Mio. Il entre donc dans les plafonds Pages Free de 20 000
fichiers et 25 Mio par fichier ; cette vérification devra être rejouée à chaque
évolution importante des images ou rapports. [Limites Cloudflare Pages](https://developers.cloudflare.com/pages/platform/limits/)

## Pourquoi Cloudflare Pages Free maintenant

- Les requêtes sur les assets statiques sont gratuites et illimitées. Le plan
  Free autorise notamment 500 builds par mois et un build concurrent ; Pages
  impose en contrepartie les limites de fichiers rappelées ci-dessus. [Tarification Pages Functions](https://developers.cloudflare.com/pages/functions/pricing/)
  [Limites Cloudflare Pages](https://developers.cloudflare.com/pages/platform/limits/)
- L'intégration GitHub déclenche le déploiement à chaque push et fournit des
  URLs de prévisualisation, statuts de déploiement et prévisualisations de PR.
  C'est adapté au workflow actuel sur `main`. [Intégration Git Cloudflare Pages](https://developers.cloudflare.com/pages/configuration/git-integration/)
- Une mise en ligne exige néanmoins un **artefact statique explicite** :
  `index.html`, les JS/CSS à sa racine, puis `data/` (et, si voulu,
  `reports/`). Il faudra ajouter plus tard une petite étape de packaging et la
  tester ; pointer Pages directement sur `src/web` casserait les requêtes
  `/data/...`.

### Configuration cible, volontairement limitée

| Élément | Choix MVP |
| --- | --- |
| Produit | Cloudflare Pages Free, intégration GitHub |
| Contenu publié | Explorateur et données/version de rapports préparés au build |
| URL initiale | sous-domaine `*.pages.dev`, puis domaine propre si désiré |
| Déploiement | push sur `main` vers production ; branches/PR en prévisualisation |
| Hors périmètre | endpoints `/api/*`, écriture de score/rapport, sessions de draft |

GitHub Pages reste une alternative acceptable pour un simple site vitrine
statique, mais est moins intéressante ici : GitHub indique une taille publiée
maximale de 1 Go, une limite souple de 100 Go/mois et ne fournit pas un chemin
API intégré. [Limites GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)

## Trajectoire API TypeScript

Quand les parcours dynamiques seront prioritaires, ajouter une couche HTTP
adaptée au runtime Workers plutôt que de déplacer `createServer()` et
`node:fs` : les Pages Functions s'exécutent sur Cloudflare Workers et
n'offrent qu'un sous-ensemble des API Node.js. [Pages Functions](https://developers.cloudflare.com/pages/functions/)
[Compatibilité Node.js de Workers](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)

La cible est une API TypeScript sans état local : `/api/*` dans un Worker ou
des Pages Functions, sessions et résultats dans un stockage explicite, et
assets servis sans invoquer l'API. Workers Static Assets documente ce routage
(`run_worker_first` sur `/api/*`) ainsi que le fallback d'une SPA ; il permet
donc de réunir interface statique et API dans un unique déploiement lorsque la
refonte est justifiée. [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)

Le quota gratuit est partagé entre Workers et Pages Functions : 100 000
requêtes par jour, avec 10 ms de CPU par invocation. Le plan Workers Standard
est au minimum de 5 USD/mois, inclut 10 millions de requêtes/mois et 30
millions de CPU-ms, sans frais de sortie réseau. Il convient à une API légère,
mais pas à des calculs lourds synchrones dans le quota gratuit. [Tarification Workers](https://developers.cloudflare.com/workers/platform/pricing/)
[Limites Workers](https://developers.cloudflare.com/workers/platform/limits/)

### Étapes de décision avant de rendre le draft interactif

1. Extraire un build statique reproductible et vérifier que l'explorateur
   n'appelle aucun `/api/*`.
2. Définir la persistance des drafts, scores et rapports, avec une politique de
   reprise après redéploiement : une Map en mémoire ne survit ni aux redémarrages
   ni à la montée en charge.
3. Écrire des contrats HTTP et des tests d'intégration hors de l'adaptateur
   Workers, puis porter les routes vers Functions/Worker.
4. Mesurer le CPU réel des routes et décider si le gratuit reste suffisant ou
   si le plan Standard est justifié.

## Si l'objectif est l'application complète avant la refonte

Le raccourci est un service Node avec volume persistant, pas Pages. Railway
documente le déploiement d'une application Express depuis Git/CLI/Docker et
des volumes montés comme répertoires inscriptibles ; son plan Hobby coûte 5
USD/mois et inclut 5 USD de consommation. Cela peut faire tourner le serveur
actuel car il respecte déjà `PORT`, mais le volume ne rend pas les sessions
stockées dans la Map durables : une stratégie de persistance reste nécessaire.
[Guide Express Railway](https://docs.railway.com/guides/express)
[Volumes Railway](https://docs.railway.com/volumes)
[Plans Railway](https://docs.railway.com/pricing/plans)

## Sources primaires consultées

- Cloudflare Pages : intégration Git, limites et facturation des assets/
  Functions.
- Cloudflare Workers : Static Assets, compatibilité Node.js, limites et
  tarification.
- GitHub Pages : limites officielles, uniquement pour comparer l'option
  statique.
- Railway : guide Express, volumes et plan Hobby, uniquement pour le cas où
  l'application Node complète doit être publique avant la refonte.
