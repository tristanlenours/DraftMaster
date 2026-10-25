# Audit architectural de DraftMaster

Date : 30 septembre 2026. Branche : `codex/011-photo-ocr-grounding`.
HEAD : `828bcf9b7479c88cedd95620e211ee3338bc48de`.

## Verdict

La forme adaptée au projet est un **monolithe modulaire**, avec des modules par capacité métier et une séparation entre calculs, orchestration et adaptateurs à l'intérieur des modules qui en ont besoin. La base actuelle permet cette évolution sans réécriture.

L'architecture est toutefois inégale : le noyau de draft est bien encapsulé ; les tournois et le multijoueur disposent de contrats de stockage et de dépendances explicites ; le Solo, le coaching réseau et le shell web mélangent encore des responsabilités. Ajouter des couches générales ne résoudrait pas ces couplages. La priorité est de déplacer les effets de bord et de réduire ce que chaque consommateur doit connaître.

Cet audit porte sur le code actuel, ses imports, sa configuration et quelques contrats exécutés. Il s'appuie aussi sur les plans des fonctionnalités et sur l'audit du site du 28 septembre, dont les constats architecturaux ont été vérifiés dans les fichiers actuels. Les sondes de sécurité et de reprise de cet audit précédent n'ont pas été réexécutées ici. Aucune modification fonctionnelle n'a été faite.

## Ce qui mérite d'être conservé

- `src/draft/index.ts` fournit un état `Draft` opaque et une petite interface de création, lecture, transition, rapport et relecture. Les wrappers y ont une responsabilité réelle : cacher l'état interne. Les transitions, les erreurs typées et le journal constituent un module profond.
- La séparation entre moteur de draft, politiques de bots et orchestration permet de changer les décisions sans réécrire la rotation des boosters. Les seeds par flux et la relecture protègent l'auditabilité.
- `TournamentCoordinatorDependencies` injecte store, catalogue, temps, identités et seed. `TournamentStore.commit` exprime révision, idempotence, événements et état. Il existe des adaptateurs mémoire et Supabase : cette interface répond à une variation réelle.
- Le multijoueur dispose aussi d'un store injectable, avec adaptateurs fichier et Supabase, et de fonctions explicites pour charger ses entrées.
- `FinalDeckCoach` expose une méthode `recommend` et permet d'injecter la génération externe. La validation de la proposition et le repli local sont regroupés. Sa localisation est discutable, mais son interface est une bonne base.
- Les contrats, propriétés et témoins existants fournissent une protection utile aux extractions. Il faut préserver les comparaisons de résultats, les rejets sans mutation et la relecture.

## Constats prioritaires

### 1. Le Solo concentre trop de responsabilités — priorité haute

`src/solo-draft/solo-draft-session.ts` importe le disque, le chargement du contexte, le routeur LLM, les rapports HTML, le classement cloud et les archives admin. Il pilote aussi les picks, l'Homologation, la construction de deck et les DTO, jusqu'aux avatars. `scripts/serve-web.mjs` ajoute son propre cache et son stockage de session.

Références : imports lignes 1–98 ; construction de dépendances lignes 213–239 ; finalisation à partir de 1277 ; écriture des rapports 1509 ; publication 1549 ; persistence snapshot 1781 ; restauration 1803 ; sauvegarde HTTP dans `serve-web.mjs:80`.

Conséquence : un changement de publication ou de fournisseur touche le gestionnaire de session. La finalisation chaîne plusieurs écritures sans contrat commun de reprise. La sauvegarde HTTP absorbe les erreurs. La restauration recharge une session et rejoue les choix humains au lieu de consommer le journal verrouillé ; son contrat ne reprend pas l'heure pourtant sérialisée.

**Évolution proportionnée :** conserver un coordinateur Solo comme interface pour HTTP. Lui fournir les entrées chargées et les dépendances réellement variables : store, horloge/identité, conseil externe et publication du résultat. Garder les transitions et l'éligibilité dans des fonctions métier. Définir un résultat canonique durable ; traiter rapports et classement comme sorties dérivées avec retry/idempotence explicites. Aucune transaction distribuée n'est nécessaire par défaut : un résultat durable et un statut de publication peuvent suffire selon le contrat retenu.

Le plan Solo actuel prévoit explicitement l'écriture des rapports dans la session. Cette évolution exige donc une mise à jour du plan, et pas seulement un déplacement mécanique de fichiers.

### 2. Les calculs et le coaching réseau ne sont pas clairement séparés — priorité haute

`src/domain/coaching/draft-coach-service.ts:10` importe `LlmRouter` depuis Companion. L'interface accepte sa classe concrète et des cartes Companion. Le module crée un routeur partagé et change de comportement selon `process.env.VITEST` / `NODE_ENV` (ligne 356). `src/bots/jev/jev-bot-decision.ts` combine calculs, lecture du disque et choix externe, avec création implicite de routeur (ligne 470).

Conséquence : la politique d'orchestration réseau est dans un dossier de domaine ; tests et production peuvent sélectionner des chemins différents sans entrée métier explicite. Les fournisseurs et formats Companion deviennent des connaissances imposées aux autres produits.

**Évolution proportionnée :** distinguer calcul déterministe, orchestration du conseil, et adaptateur fournisseur. L'orchestration reçoit une petite fonction ou interface de conseil ; elle ne reçoit pas la classe complète du routeur. Charger les données des bots avant le calcul et convertir les cartes Companion à leur entrée. Le mode local ou externe doit venir de la composition, pas d'une détection du runner de tests.

La présence d'IA ne prouve pas ici un défaut d'Homologation : il faut examiner séparément les chemins autorisés. Le découplage doit néanmoins rendre cette politique explicite et testable.

### 3. Certaines capacités partagées sont hébergées dans une fonctionnalité consommatrice — priorité moyenne

- Le parser MTGA sous `src/web/mtga-deck-text.js` est utilisé par Deck Lab et les tournois.
- `src/deck-lab/http-handler.ts:5` importe `MasterCardsIndex` du module OCR des tournois et obtient son singleton dans le handler.
- Solo utilise le coach de deck sous `multiplayer-draft`, les identités sous `cli` et les structures de rapports sous `simulation`.
- Plusieurs produits utilisent les prompts et le routeur de `companion`.

Le problème est l'appartenance des responsabilités et la dépendance induite ; le parser partagé ne doit surtout pas être recopié. Déplacer progressivement ces capacités vers des modules nommés pour leur rôle : import de deck, résolution de cartes, conseil de deck, génération de rapports. Extraire uniquement ce qui a plusieurs consommateurs ou une responsabilité propre ; éviter un dossier `shared` fourre-tout et un framework de plugins.

### 4. L'encapsulation est partiellement contournée — priorité moyenne

Les politiques de bots importent des types depuis `draft/internal`. Simulation importe en exécution les helpers d'erreurs internes. `PackNumber`, nécessaire au contrat des bots, n'est pas exporté par l'interface publique actuelle du draft.

Le Solo expose également `status`, `isHomologated` et `roundIndex` modifiables ; `readonly humanPicks: string[]` empêche de remplacer la référence, mais pas de modifier son contenu.

**Évolution proportionnée :** exposer les types réellement contractuels depuis l'interface du draft, garder les helpers d'implémentation privés et empêcher les consommateurs de modifier directement les invariants Solo. Interdire les imports de `internal` entre modules, en conservant une exception ciblée pour les tests internes pertinents.

### 5. Un cycle et des exports trop larges rendent le graphe moins lisible — priorité moyenne

Cycle d'exécution confirmé : `dynamic-score.ts:11` appelle les explications ; `coaching-explainer.ts:8` réimporte les helpers de couleur et de mana du scoring. Aucun échec d'initialisation n'est démontré par cet audit.

Extraire ces helpers dans un module pur interne suffit. Il n'est pas nécessaire d'introduire un moteur d'explications extensible.

`domain/coaching/index.ts` réexporte presque tous ses fichiers, y compris `witness-corpus.ts`, qui charge le disque et les schémas. Les index tournois/multijoueur réexportent aussi adaptateurs HTTP et stockage. Cela élargit l'interface et entraîne le chargement de dépendances au-delà des fonctions consommées.

Exposer les opérations usuelles du module ; distinguer explicitement les imports de composition des imports métier. L'existence d'un `index.ts` ne suffit pas à définir une interface restreinte. Ne pas interdire tous les imports directs ni ajouter un wrapper à chaque fonction.

### 6. Le shell web et le serveur ont besoin d'extractions ciblées — priorité moyenne

`src/web/app.js` cumule navigation, données de cubes, exploration de cartes, langue, modales et initialisation des vues. `scripts/serve-web.mjs` cumule composition, authentification, statiques, persistence Solo et routes Solo.

Les tailles observées sont 3 768 lignes pour `app.js`, 1 948 pour la session Solo, 1 843 pour le coordinateur multijoueur et 1 174 pour le serveur. Ces tailles ne sont pas des violations en elles-mêmes. Le coordinateur multijoueur conserve une responsabilité métier plus cohérente que le serveur malgré sa longueur ; ne pas lui imposer un découpage arbitraire par nombre de lignes.

Extractions utiles : handler HTTP Solo, store Solo, shell/navigation et exploration de cartes. Le multijoueur expose une initialisation qui démarre un polling (`src/web/multiplayer-draft.js:894`) sans interface de désactivation à la sortie de la vue. Un petit contrat activation/désactivation par vue rendrait le cycle de vie explicite, avec une seule requête en vol et protection contre les réponses obsolètes.

### 7. Les règles de dépendance et les gates ne protègent pas toute l'architecture — priorité moyenne

`eslint.config.js` n'impose pas de sens de dépendance. TypeScript et les gates de formatage ciblent surtout les `.ts` ; le serveur MJS et le navigateur ne reçoivent pas les mêmes vérifications. Companion dispose de nombreuses exemptions de règles et est exclu de la couverture.

Commencer par trois règles vérifiables : pas d'import vers les adaptateurs HTTP/stockage/fournisseur depuis les calculs ; pas d'import intermodule de `internal` ; pas de cycle d'exécution. Appliquer progressivement lint/format et vérification de contrats au code navigateur/serveur. Ne pas ajouter un gros outil architectural si la configuration existante et un petit contrôle du graphe suffisent.

Les types de carte sont répartis entre catalogue, coaching, Companion et web. Plusieurs représentations peuvent être légitimes : préférer des conversions explicites aux entrées des modules, et extraire seulement les concepts stables réellement communs. Il n'est pas nécessaire d'unifier tous les DTO dans un modèle géant.

## Cible minimale

Conserver les modules métier actuels : draft, coaching, bots, Solo, multijoueur, tournois, cartes/cubes et Deck Lab. Organiser chaque module au niveau nécessaire :

```text
HTTP / CLI / navigateur
          ↓
coordinateurs de cas d'usage
          ↓
calculs et transitions métier

coordinateur → contrat de stockage ou de conseil
                         ↑
              adaptateur fichier / Supabase / LLM

composition du serveur : construit et relie les adaptateurs
```

La flèche désigne une dépendance du code. Les contrats d'effets de bord appartiennent au module qui les consomme ; leurs adaptateurs les implémentent. Les calculs reçoivent des valeurs et produisent des résultats. Une capacité pure peut rester un fichier : pas d'obligation de créer `domain/application/infrastructure` pour chaque dossier.

Une dépendance de hashing à `node:crypto` n'est pas une I/O réseau/disque et n'exige pas un port à elle seule. La supprimer ne devient utile que si exécuter ce calcul dans un navigateur est un besoin concret. De même, accepter un catalogue en lecture dans le scoring est légitime ; une interface minimale devient utile si le consommateur est réellement lié à ses méthodes de chargement.

## Ordre recommandé et preuve de réussite

1. **Sécuriser le contrat Solo.** Tests de reprise sur journal/snapshot verrouillés, erreur disque sans faux succès, résultat durable après interruption, publication répétée sans doublon, éligibilité et version des records. Puis store injectable et finalisation séparée des sorties dérivées.
2. **Séparer calcul et conseil réseau.** Conserver scores/témoins ; tests d'orchestration avec adaptateurs local, externe et erreur. Même chemin d'orchestration en test et en production, dépendances différentes.
3. **Rétablir les interfaces et l'appartenance.** Supprimer cycle et imports externes d'internals ; extraire parser/résolution/conseil réellement communs. Tester au contrat utilisé par les consommateurs.
4. **Alléger les points d'entrée.** Extraire HTTP Solo et shell web ; vérifier entrée/sortie/réentrée des vues et absence de polling inutile. Ajouter les règles de dépendance aux gates.

Faire ces changements par petits lots reliés à des Issues et aux plans. Ne pas profiter du refactoring pour modifier les règles de score, les versions ou les algorithmes de bots. Les contrats de durabilité peuvent nécessiter une migration explicite des fichiers historiques.

## Ce qui serait prématuré

Microservices, multi-packages imposés, conteneur d'injection, repository générique, classes de cas d'usage qui ne font que déléguer, bus d'événements général et réécriture du frontend ne répondent pas aux problèmes constatés. Les journaux existants ont une utilité démontrée pour l'audit et la reprise ; cela ne justifie pas d'étendre un framework d'event sourcing à toutes les capacités du produit.

Créer une interface lorsqu'elle protège un invariant, isole une I/O concrète ou permet une variation/test utile. Extraire un module lorsque cela concentre une connaissance aujourd'hui répétée ou donne une responsabilité claire. Un simple déplacement de fichiers ne constitue pas une amélioration de modularité.

## Vérification réalisée

Analyse des imports statiques TS/JS/MJS dans `src` et `scripts` via l'AST TypeScript ; recherche de groupes cycliques et d'imports intermodules. Les imports dynamiques et le graphe runtime complet des dépendances npm ne sont pas couverts. Les imports mixtes type/valeur sont traités de façon conservatrice ; le cycle scoring/explications a été confirmé à la lecture.

Sept fichiers Vitest, 81 tests réussis, deux workers : contrats du moteur et de relecture, conseil de draft, fallback Jev, coordinateur tournoi, picks multijoueur et analyse Deck Lab. Runtime utilisé : Node 24.19.0 fourni par Codex ; le pin exact du dépôt n'a pas été reproduit.

Pas d'exécution du gate complet, du navigateur, d'une base Supabase réelle ou d'un déploiement. Ces tests attestent le comportement du périmètre exécuté, pas la sûreté globale du système. Le dépôt comportait déjà des fichiers non suivis ; cet audit ajoute uniquement ce rapport et ne les modifie pas.
