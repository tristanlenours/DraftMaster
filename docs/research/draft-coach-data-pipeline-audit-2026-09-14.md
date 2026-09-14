# Audit de la chaîne de données pour un coach de draft — cas Titou Tribal

**Date de l'audit :** 14 septembre 2026  
**Périmètre :** données locales, schémas, générateurs, moteur de picks, bots, évaluation et construction de deck, Solo, multijoueur et Companion/LLM.  
**Méthode :** lecture du dépôt courant, calculs locaux sans réseau et contrôles ciblés. Aucune source secondaire n'est utilisée. Les modifications concurrentes observées dans `src/companion/llm-router.ts` et `tests/unit/companion/llm-router.test.ts` sont hors périmètre : elles n'ont été ni produites ni utilisées comme preuve par cet audit.

## Mise à jour corrective du 14 septembre 2026

Les constats ci-dessous décrivent l'état observé au début de l'audit. La remédiation a ensuite livré les éléments suivants :

- `coach-context@1` charge et vérifie ensemble snapshot, catalogue, méta de cube, classement de puissance et profil d'archétypes ; il refuse les identités non résolues, les CMC aberrants, le ranking désynchronisé, les références hors snapshot et les profils liés à une autre source ;
- `archetype-synergy@2` consomme les cartes clés **et** supports, lit les types au bon emplacement, sépare bodies, payoffs et supports, porte confiance et preuves, et verrouille le SHA-256 de sa source ainsi que la version du générateur ;
- le score de pick mobilise le même profil key/support/families que l'évaluation finale, une vraie correction de courbe, les priorités de fixing du cube et seulement des tags de synergie namespacés ;
- Solo, simulation, bots multijoueurs, coach final multijoueur et Companion partagent désormais ce contexte. Le LLM de pick ne peut choisir que dans le top 3 déterministe et le résumé Companion repasse par le coach final local à cinq axes ;
- les identités Oracle synthétiques repérées, le CMC/coût de Green Sun's Zenith, les faits de cartes réparables et le ranking ont été corrigés ; les doublons Oracle sont refusés ;
- `npm run coach:data:verify`, `npm run cards:facts:verify` et `npm run synergy:profiles:verify` sont intégrés au quality gate.

La maturité est maintenant déclarée et appliquée en fail-closed : Titou Tribal et Nico sont `ready`, Cédric est `partial` faute de profil d'affinités versionné, Hugues est `blocked` avec seulement 354 cartes brutes, et Titou Arena Peasant Plus est `blocked` tant que ses douze substitutions de terrains ne disposent pas d'un snapshot immuable. Aucun témoin expert ou résultat de ligue n'a été inventé pour masquer ces deux limites de données externes.

## Verdict

Le dépôt contient **un bon noyau déterministe et auditable pour analyser un deck terminé**, mais **pas encore un contexte unique, cohérent et suffisamment complet pour guider tout un draft**.

- Pour l'analyse finale d'un deck Titou, le chemin `snapshot + catalogue + profil d'archétypes + evaluateDeck` est réellement livré. Il produit cinq axes explicables, expose les cartes key/support reconnues, les familles manquantes, les contributions pondérées et la provenance du profil. Le score sur 100 est explicitement une heuristique, pas une probabilité de victoire. Sources : `src/simulation/detailed-simulation.ts:L191-L242,L647-L683`, `src/domain/coaching/deck-evaluation.ts:L364-L437,L688-L707,L768-L894`.
- Pour les picks, les bots et le deckbuilder, plusieurs modèles concurrents coexistent : tags de cartes, règles tribales codées en dur, sous-types Oracle, bonus de personnalité et profil key/support. Ils ne sont pas réconciliés dans un même état d'archétype. Sources : `src/domain/coaching/dynamic-score.ts:L352-L405,L495-L558`, `src/domain/coaching/tribal-compatibility.ts:L14-L42,L149-L241`, `src/domain/coaching/deck-recommender.ts:L143-L247,L416-L559`.
- Pour le Companion, le contexte Titou n'arrive pratiquement pas au LLM : ni `cubeKey`, ni `cubeMeta`, ni snapshot, ni profil key/support/families ne sont fournis par le serveur. Le prompt de pick affirme au contraire un environnement Powered/Arena/MH3 centré T1-T3, alors que Titou est déclaré un cube non-powered à tour pivot T4. Sources : `src/companion/server.ts:L133-L143,L541-L552`, `src/companion/coach-prompts.ts:L25-L40`, `data/cubes/titou_tribal/cube-meta.json:L7-L22`.
- Le profil Titou est versionné et passe ses validations actuelles, mais son générateur omet des créatures tribales réelles à cause de deux formes différentes dans l'archive CubeCobra (`entry.type_line` contre `entry.details.type`). Les contrôles vérifient la forme et la reproductibilité, pas la complétude sémantique. Sources : `scripts/build-archetype-synergy-profiles.mjs:L10-L23,L68-L156`, `data/cubes/titou_tribal/cubecobra-raw.json:cards.mainboard[*]`, `tests/unit/cubes/archetype-synergy-profile.test.ts:L13-L56`.

La conclusion pratique est donc : **oui, les données peuvent prémâcher un diagnostic de deck ; non, elles ne constituent pas encore la “mémoire de travail” fiable d'un coach de draft humain ou bot de bout en bout**. Les deux P0 sont de réparer la vérité archétypale et de construire un seul `CoachContext` versionné, utilisé par toutes les surfaces.

## 1. Carte du système observé

| Couche                        | Source de vérité visée                                     | Consommateurs réels                                                  | État                                                   |
| ----------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------ |
| Liste du cube                 | Snapshot immuable `titou_tribal@2026-02-24.1`              | moteur de draft, Solo, simulation                                    | **Livré et robuste**                                   |
| Métagame du cube              | `cube-meta.json`                                           | génération du profil ; dynamique seulement si `cubeMeta` est injecté | **Livré, partiellement branché**                       |
| Cartes                        | `data/cards/items/*.json`, bundle `master-cards.json`      | picks, bots, rapports, prompts, deckbuilder                          | **Livré, qualité éditoriale inégale**                  |
| Profil d'archétypes           | `archetype-synergy-v1.json` généré                         | évaluation/construction finale Solo et simulation                    | **Livré, incomplet, non utilisé au pick**              |
| Règles tribales de pick/build | constantes TypeScript et sous-types de cartes              | moteur de picks, bots, deckbuilder                                   | **Livré, parallèle au profil**                         |
| Évaluation finale             | `deck-evaluation@5`                                        | Solo, simulation, coach final                                        | **Livré et auditable**                                 |
| Coach final LLM               | payload pool + `cubeKey` + `snapshotId`, validation locale | Solo assisté ; seam multijoueur                                      | **Livré, mais le multijoueur n'injecte pas le profil** |
| Companion pick LLM            | `CompanionCard` joint par nom                              | conseils Arena en direct                                             | **Livré mais sans contexte cube/profil**               |
| Calibration de ligue          | corpus Powered Vintage                                     | `evaluateDeck` si options explicites                                 | **Livré, provisional, hors Titou**                     |

Sources de la carte : `data/cubes/titou_tribal/README.md:L3-L27`, `data/README.md:L47-L61`, `src/domain/coaching/dynamic-score.ts:L352-L405`, `src/domain/coaching/deck-evaluation.ts:L768-L894`, `src/companion/server.ts:L133-L143`, `src/multiplayer-draft/coordinator.ts:L1335-L1360`.

Le modèle cible implicite devrait être beaucoup plus simple :

```text
snapshot immuable ─┐
cube-meta ─────────┼─> CoachContext versionné ─> pick humain
catalogue cartes ──┤                         ├─> bots
profil archétypes ─┤                         ├─> deckbuilder
état du draft ─────┘                         └─> payload LLM borné
                                               │
                                 décision/scoring local auditable
```

Aujourd'hui, les quatre branches reconstruisent une partie de ce contexte séparément.

### 1.1 Tous les cubes ne sont pas au même niveau de maturité

Une comparaison des cinq répertoires montre que Titou est le meilleur cas d'étude, mais qu'il ne faut pas généraliser sa maturité à tout le catalogue :

| Cube                 | Entrées brutes / identités uniques | Membres catalogue | Archétypes meta | Profil calculable | Snapshot versionné présent |
| -------------------- | ---------------------------------: | ----------------: | --------------: | ----------------- | -------------------------- |
| Cedric               |                          720 / 720 |               720 |              10 | non               | non                        |
| Hugues Pauper        |      354 / 354, pour 356 déclarées |               356 |              11 | non               | non                        |
| Nico Candyshop       |                          730 / 730 |               733 |               8 | oui               | non                        |
| Titou Arena Peasant+ |                          360 / 360 |               360 |              10 | non               | non                        |
| Titou Tribal         |                          545 / 542 |               541 |    9, dont glue | oui               | **oui**                    |

Sources et méthode : comptage local de `data/cubes/*/cubecobra-raw.json`, `cube.json`, `cube-meta.json` et présence de `archetype-synergy-v1.json` / snapshot `*.1.json`.

Il en résulte trois limites systémiques :

- seuls Titou et Nico peuvent utiliser l'évaluation de synergie mature ; les trois autres retombent sur des heuristiques génériques ;
- hors Titou, le chargeur multijoueur normalise l'archive brute à la volée sous l'`activeSnapshotId`, de sorte qu'un même identifiant de snapshot peut désigner un contenu modifié si l'archive change sans changement de version ;
- Hugues ne fournit que 354 cartes brutes, sous le minimum de 360 imposé pour un draft à huit joueurs de 45 picks. Son méta-profil en annonce pourtant 356 : cette configuration n'est pas chargeable telle quelle par le validateur de snapshot.

Sources : `src/multiplayer-draft/coordinator.ts` et `src/cubes/load-active-snapshot.ts` ; `src/cubes/validate-snapshot.ts` ; `data/cubes/hugues_pauper/cube-meta.json`; `data/cubes/hugues_pauper/cubecobra-raw.json`.

## 2. Exemple concret : Titou Tribal, puis Gobelins

### 2.1 Snapshot et identité du cube

Le snapshot est la couche la plus solide du système : 545 instances, 543 impressions et 542 identités Oracle, avec CubeCobra, révision, dates, empreinte brute, version d'importeur et SHA-256 canonique. Les doublons physiques gardent des `instanceId` distincts. Sources : `data/cubes/titou_tribal/2026-02-24.1.json:L1-L21,L5474-L5478`, `data/cubes/titou_tribal/README.md:L3-L15`, `scripts/import-historical-titou-snapshot.mjs:L68-L96,L108-L146`.

Le contexte éditorial dit explicitement : `synergy_unpowered`, rythme `midrange_attrition`, tour cible 4, fenêtre T3-T5, masse critique tribale et 3 à 5 removals. Les coefficients annoncés sont 2,2 pour le tribal, 0,6 pour le combo, 1,5 pour le fixing et 1,8 pour la courbe. Sources : `data/cubes/titou_tribal/cube-meta.json:L7-L30,L234-L238`.

Un écart d'identité existe pourtant entre le snapshot et l'index dérivé du cube : le snapshot contient les Oracle IDs réels de **Counterspell** et **Preordain**, tandis que `cube.json` omet les deux et contient un Oracle ID artificiel pour Counterspell. Le calcul local donne 542 identités dans le snapshot contre 541 dans `cardIndex`, soit deux manquantes et une extra. La cause structurelle est que `sync-data-models` reconstruit `cardIndex` à partir de `presentInCubes`, pas à partir du snapshot actif. Sources : `data/cubes/titou_tribal/2026-02-24.1.json:L1087-L1096,L1267-L1276`, `scripts/sync-data-models.mjs:L113-L127,L138-L160`, `data/cards/items/counterspell.json:L1-L6`.

Le runtime masque cet écart en résolvant par Oracle ID puis par nom, et réécrit ensuite l'Oracle ID de l'instance avec celui du catalogue. Le draft fonctionne, mais sa preuve d'identité n'est plus strictement la preuve du snapshot. Sources : `src/simulation/detailed-simulation.ts:L246-L264,L274-L288`, `src/solo-draft/solo-draft-session.ts:L225-L269`.

### 2.2 Le modèle d'archétypes déclaré

`cube-meta.json` décrit huit tribus jouables — Gobelins, Vampires, Elfes, Loups/Garous, Anges, Dragons, Humains et Sorciers — plus un archétype de liant universel. Chaque entrée porte couleurs, catégorie, description, gameplan, cartes clés, supports et cibles de créatures/removals. Sources : `data/cubes/titou_tribal/cube-meta.json:L32-L232`.

Pour Gobelins, l'intention est lisible : Rakdos aggro/burn, masse de jetons, Goblin Grenade/Muxus comme conclusion, 18–22 créatures et 4–6 removals. C'est exactement le niveau de connaissance qui aide une IA à expliquer le “pourquoi” d'un pick. Sources : `data/cubes/titou_tribal/cube-meta.json:L33-L54`.

Le profil généré transforme cette intention en contrat calculable :

- 1 point par support et 3 par key card ; cible de 18 points ;
- famille `payoff` minimale 1 ; famille `density` minimale 6 à 8 selon la tribu ;
- les sept cartes “glue” sont ajoutées à chaque tribu comme bridges ;
- `modelVersion`, `cubeKey` et `cubeSnapshotId` sont conservés dans l'audit.

Sources : `scripts/build-archetype-synergy-profiles.mjs:L68-L156`, `data/cubes/titou_tribal/archetype-synergy-v1.json:L1-L23`, `src/cubes/archetype-synergy-profile.ts:L128-L155`, `src/domain/coaching/deck-evaluation.ts:L364-L437`.

### 2.3 Mesure du profil produit

Le profil courant contient 8 archétypes, 258 appartenances carte↔archétype, 171 identités uniques, 34 cartes `key` et 224 `support`. Cela couvre seulement 171 des 542 identités du snapshot, soit 31,5 %. Une couverture partielle n'est pas en soi incorrecte — une carte générique n'a pas besoin d'être tribale — mais toutes les 258 appartenances portent une confiance `A`, y compris des inférences mécaniques automatiques. Sources : `data/cubes/titou_tribal/archetype-synergy-v1.json:L1-L40` et agrégation locale de ses huit entrées ; règles de confiance fixes dans `scripts/build-archetype-synergy-profiles.mjs:L96-L140`.

Le défaut le plus important est reproductible : le générateur lit `entry.type_line` et `entry.tags`, tandis qu'une partie des entrées brutes ne porte le type que sous `entry.details.type`. Ainsi, **Skirk Prospector**, **Pashalik Mons**, **Windrider Wizard**, **Spellseeker** ou **Youthful Valkyrie** sont des corps tribaux/supports présents dans le snapshot, mais absents du profil correspondant. Sources : `scripts/build-archetype-synergy-profiles.mjs:L10-L23,L94-L128`, `data/cubes/titou_tribal/cubecobra-raw.json:cards.mainboard[*].details`, `data/cubes/titou_tribal/2026-02-24.1.json:L187-L196,L847-L866,L2267-L2276`.

Comptage local des corps typés dans `details.type` mais absents du profil :

| Archétype    | Omissions | Exemples structurants                               |
| ------------ | --------: | --------------------------------------------------- |
| Gobelins     |         7 | Skirk Prospector, Pashalik Mons, Murderous Redcap   |
| Vampires     |         9 | Vein Ripper, Edgar, Charmed Groom                   |
| Elfes        |         6 | Allosaurus Shepherd, Leaf-Crowned Visionary         |
| Loups/Garous |         7 | Avabruck Caretaker, Kessig Naturalist               |
| Anges/Clercs |        11 | Youthful Valkyrie, Inspiring Overseer               |
| Dragons      |         6 | Shivan Devastator, The Ur-Dragon                    |
| Humains      |        23 | Spellseeker, Windrider Wizard, Katilda and Lier     |
| Sorciers     |         9 | Spellseeker, Windrider Wizard, Jace, Vryn's Prodigy |

Source et méthode : jointure locale par `details.oracle_id` entre `data/cubes/titou_tribal/cubecobra-raw.json:cards.mainboard` et `data/cubes/titou_tribal/archetype-synergy-v1.json:archetypes[*].cards`, avec le même motif de types que `scripts/build-archetype-synergy-profiles.mjs:L77-L85,L94-L118`.

Autre incohérence : quatre IDs déclarés comme supports par le méta-profil ne figurent pas dans le snapshot Titou : Outland Liberator, Goldspan Dragon, Esper Sentinel et Ranger-Captain of Eos. Le catalogue les rattache uniquement à `nico_candyshop`. Le générateur ne consomme pas les `supportCards` des huit archétypes ; il ne peut donc ni les inclure ni signaler cette dérive. Sources : `data/cubes/titou_tribal/cube-meta.json:L102-L120,L146-L164,L167-L186`, `data/cards/items/outland-liberator.json:L1-L5,L47-L49`, `data/cards/items/goldspan-dragon.json:L1-L5,L52-L54`, `data/cards/items/esper-sentinel.json:L1-L5,L44-L46`, `data/cards/items/ranger-captain-of-eos.json:L1-L5,L44-L46`, `scripts/build-archetype-synergy-profiles.mjs:L96-L142`.

Les validateurs actuels détectent doublons, familles inconnues et minima impossibles, puis vérifient que chaque carte du profil existe dans l'archive brute. Ils ne vérifient ni la complétude des types, ni la présence des supports déclarés par `cube-meta`, ni l'égalité snapshot/catalogue/index. Sources : `src/cubes/archetype-synergy-profile.ts:L35-L96`, `tests/unit/cubes/archetype-synergy-profile.test.ts:L13-L56`.

La génération produit aussi des **faux positifs sémantiques**, pas seulement des omissions :

- **Goblin Grenade**, un rituel, est `key/payoff` mais aussi `body/density`, parce que son tag suffit à le faire compter comme corps tribal ;
- **Cabal Slaver**, un Humain et Clerc qui récompense les dégâts de Gobelins, est enregistré comme `support/body/density` Gobelins, alors qu'il s'agit d'un payoff conditionnel externe à la densité de créatures Gobelin ;
- **Angelic Destiny**, une aura, est comptée comme `support/body/density` Anges au lieu d'un effet qui crée temporairement le type/plan Ange.

Enfin, le registre runtime réduit le document détaillé à `keyCards`, `supportCards`, `targetPoints` et familles requises. Les rôles fins, preuves et confiances existent dans le JSON mais sont perdus avant l'évaluation et ne sont jamais présentés au LLM. Sources : `src/cubes/archetype-synergy-profile.ts:L120-L158`, `src/cubes/archetype-synergy-profile-types.ts:L1-L58`, `src/domain/coaching/deck-evaluation.ts:L364-L437`.

### 2.4 Témoin concret : les mêmes cartes Gobelins, quatre verdicts différents

Un témoin local contrôlé au début de P2P1, avec sept Gobelins déjà dans le pool et un pack composé de Counterspell, Muxus, Goblin Grenade et Cabal Slaver, expose la divergence entre les modèles :

| Carte          | Connaissance archétype      | Score dynamique observé | Diagnostic                                                            |
| -------------- | --------------------------- | ----------------------: | --------------------------------------------------------------------- |
| Counterspell   | hors plan Gobelins          |    **24,1**, classé n°1 | la puissance générique domine ; l'explication devient hate-pick       |
| Muxus          | key card Gobelins           |                **23,9** | bonus obtenu grâce au sous-type codé en dur, pas grâce au profil      |
| Goblin Grenade | key/payoff Gobelins         |                **16,7** | aucun bonus d'archétype au pick malgré son statut de payoff central   |
| Cabal Slaver   | support/body dans le profil |                 **1,0** | pénalité `Humain incompatible` de -15 dans le modèle tribal parallèle |

Sources : exécution locale de `evaluatePack` avec le catalogue courant et le contexte réellement fourni par Solo ; règles dans `src/domain/coaching/dynamic-score.ts` et `src/domain/coaching/tribal-compatibility.ts`; memberships dans `data/cubes/titou_tribal/archetype-synergy-v1.json`.

Ce témoin est le cœur du problème produit : la donnée n'est pas seulement incomplète, elle peut donner **deux causalités opposées** à deux composants du coach. Le profil dit que Cabal Slaver renforce la densité Gobelins ; le moteur de pick le considère incompatible. Inversement, Goblin Grenade est un payoff déclaré mais n'est pas reconnu comme tel pendant le draft.

### 2.5 Provenance du profil encore insuffisante

L'empreinte `source.rawSha256` du snapshot verrouillé diffère de l'empreinte du `cubecobra-raw.json` courant, alors que la séquence des identités de cartes est restée identique. Le profil est reconstruit depuis les tags de l'archive courante mais se déclare lié à l'ancien `snapshotId` lu dans le meta. Des tags peuvent donc évoluer sans changement de snapshot ni de version de profil. Il faut inclure dans le profil l'empreinte exacte de son archive d'entrée et la version du générateur, puis refuser un mélange. Sources : `data/cubes/titou_tribal/2026-02-24.1.json`, `data/cubes/titou_tribal/cubecobra-raw.json`, `scripts/build-archetype-synergy-profiles.mjs`.

## 3. Données cartes : richesse du contrat, faiblesse du contenu éditorial

### 3.1 Contrat et provenance

Le contrat carte v1 est utile : identité Oracle, coût/CMC, couleurs, types, sous-types, texte Oracle, production de mana, score de puissance avec source et confiance, rôles, analyse objective, analyse par cube, tags, paires et pédagogie. Le schéma est fermé (`additionalProperties: false`) et chaque fichier est validé individuellement. Sources : `data/schemas/card.schema.json:L1-L44,L84-L151,L163-L230`, `src/cards/card-catalog.ts:L30-L100`, `tests/unit/cards/card-schema-validation.test.ts:L8-L43`.

Les fichiers unitaires sont annoncés comme source de vérité et `master-cards.json` comme bundle. Le bundle courant déclare 1 948 cartes. `sync-data-models` valide cependant seulement le JSON par parsing lors de la compilation, compte les fichiers plutôt que les Oracle IDs uniques et écrase silencieusement une collision d'ID dans son objet. Le chargeur applicatif valide chaque document, mais lui aussi remplace une collision par la dernière carte. Sources : `data/README.md:L47-L61`, `data/cards/master-cards.json:L1-L5`, `scripts/sync-data-models.mjs:L27-L47`, `src/cards/card-catalog.ts:L169-L188`.

Le classement de puissance est mieux tracé que le reste de l'analyse : version, référence, calibration et couverture sont explicites. Sur 1 948 cartes : 438 directes Untapped, 1 223 calibrées CubeCobra et 287 fallbacks. Pour les 541 cartes cataloguées Titou, la jointure locale retrouve 133 mesures Untapped et 408 calibrations CubeCobra ; aucune n'est absente du ranking. Source : en-tête et jointure locale de `data/power-rankings/power-ranking-v1.json` avec le catalogue courant. La documentation historique n'est plus à jour, comme détaillé plus bas.

En revanche, le schéma ne porte pas une provenance par champ pour le nom, le type, les faces, le texte Oracle ou l'analyse éditoriale. `scryfallId` est optionnel. Un coach ne peut donc pas distinguer dans le payload une règle officielle fraîche d'un fallback généré ou d'une annotation humaine. Sources : `data/schemas/card.schema.json:L28-L44,L84-L102,L107-L151`.

### 3.2 Qualité observée sur les 541 cartes Titou du catalogue

Agrégation locale de `data/cards/master-cards.json` filtrée par `presentInCubes.includes("titou_tribal")` :

| Signal                                          | Observation | Conséquence coach                                     |
| ----------------------------------------------- | ----------: | ----------------------------------------------------- |
| `scryfallId` renseigné                          |     0 / 541 | jointures externes/printing fragiles                  |
| texte Oracle anglais vide                       |    33 / 541 | règles invisibles, surtout DFC/MDFC/adventures/splits |
| cartes créature sans P/T                        |         247 | simulation tactique et comparaison de bodies limitées |
| coûts au format `{2}{R}`                        |         410 | format dominant                                       |
| coûts au format historique `o2oR`               |          64 | parsing hétérogène                                    |
| coût absent                                     |          67 | terrain ou donnée lacunaire à distinguer              |
| `cubeAnalyses.titou_tribal.archetypes` non vide |    16 / 541 | profil carte très peu mobilisable                     |
| `synergyTags` non vide                          |    21 / 541 | bonus de synergie de pick presque toujours nul        |
| `keyPairs` non vide                             |    15 / 541 | explication carte-à-carte rare                        |
| `pedagogy.keySynergies` non vide                |     0 / 541 | aucune synergie structurée exploitable par prompt     |
| quadrants identiques                            |   536 / 541 | métrique essentiellement template                     |

Sources de structure : `data/cards/master-cards.json:L1-L5`, `data/schemas/card.schema.json:L107-L147,L163-L230`. Méthode : comptage direct des champs du bundle courant ; exemples de texte vide vérifiés sur les cartes bifaces comme `data/cards/items/archangel-avacyn.json`, `data/cards/items/arlinn-kord.json`, `data/cards/items/brutal-cathar.json` et `data/cards/items/huntmaster-of-the-fells.json`.

La distribution des rôles confirme une génération trop générique : 433 cartes sont `synergy_enabler`, contre seulement 2 `synergy_payoff`; 59 sont `bomb`, 53 `mana_fixing`, 28 `premium_removal`, 27 `beater` et 2 `finisher`. Le générateur met par défaut toute carte non reconnue dans `synergy_enabler` et fixe quatre quadrants constants. Sources : `scripts/generate-referential.mjs:L319-L343` et agrégation locale de `objectiveAnalysis.roles`.

Pour Titou, ce générateur ne reconnaît explicitement que quelques Anges et Humains par motif dans le **nom** de la carte. Le script de regrading reproduit cette logique et réécrit analyses/pédagogie avec des phrases de tier. Cela explique les 16 appartenances seulement et l'écart avec les 171 cartes du profil spécialisé. Sources : `scripts/generate-referential.mjs:L348-L408`, `scripts/regrade-titou-tribal.mjs:L63-L125,L131-L170`.

Ce contenu peut servir de texte d'interface, mais il ne doit pas être injecté comme “expertise” au LLM sans indiquer sa provenance et sa confiance. Le meilleur contexte est aujourd'hui le trio **faits Oracle + power ranking + profil archétype versionné**, pas les summaries/quadrants générés.

Trois anomalies concrètes doivent être traitées comme des erreurs de données, pas comme du bruit éditorial :

- **Green Sun's Zenith** a un `cmc` de **1001** et un coût `oXoG`. Avec cette valeur, le CMC moyen calculé des sorts Titou monte à environ 5,32 ; sans cette carte, il est proche de 3,06, cohérent avec les 3,1 annoncés par `cube-meta`. Toute heuristique de courbe ou d'archétype peut être contaminée par cet outlier.
- Parmi les cartes Titou, 33 textes Oracle sont vides et 22 non-terrains n'ont pas de coût de mana. Beaucoup sont des DFC, MDFC ou cartes à plusieurs faces : le modèle carte ne canonise pas correctement leurs faces.
- Le bundle et les fichiers unitaires sont synchrones, mais `power-ranking-v1.json` ne l'est pas : **Bolas's Citadel** et **Griselbrand** valent 10 dans le catalogue courant et 46 dans l'artefact de ranking. Les tests ciblés passent malgré cette dérive. Le document `docs/research/power-ranking-v1.md` décrit lui aussi une ancienne couverture (1 105 cartes), alors que l'artefact courant en contient 1 948.

Sources : `data/cards/items/green-sun-s-zenith.json`, `data/cards/items/bolas-s-citadel.json`, `data/cards/items/griselbrand.json`, `data/power-rankings/power-ranking-v1.json`, `docs/research/power-ranking-v1.md` et agrégations locales du bundle.

Enfin, `synergyTags` mélange deux natures de vocabulaire. Titou en a trop peu ; à l'inverse, les imports Nico/Cedric/Hugues/Peasant copient de nombreux tags Oracle génériques tels que `triggered-ability`, `single-target-instant-sorcery` ou `card-names`. Le score dynamique interprète tout tag commun comme de la synergie et peut accorder jusqu'à +15 à des cartes seulement reliées par une propriété de règles banale. Les `oracleTags` descriptifs et les `synergyTags` d'archétype doivent être séparés et namespacés. Sources : `src/domain/coaching/dynamic-score.ts:L377-L405`, données `cubeAnalyses.*.synergyTags` du catalogue et scripts d'import.

## 4. Mobilisation réelle par cas d'usage

### 4.1 Picks humains et bots Solo/simulation

Le moteur reçoit bien des cartes enrichies (score, couleurs, CMC, types, sous-types, texte, mana, Oracle ID). Les bots coachés et amis appellent le même `evaluatePack`, puis les bots amis ajoutent des biais de personnalité audités. Sources : `src/simulation/detailed-simulation.ts:L246-L335,L420-L452`, `src/bots/coached-bot-policy.ts:L41-L104,L180-L192`, `src/bots/friends/friend-bot-policy.ts:L251-L350`.

Au pick, le score dynamique utilise réellement : puissance, couleur, fixing, `cubeAnalyses.scoreModifier`, recouvrement de `synergyTags`, compatibilité tribale par sous-type, et source/confiance du power score. La courbe est encore un placeholder à zéro. Sources : `src/domain/coaching/dynamic-score.ts:L352-L431,L466-L558`.

Trois déconnexions réduisent fortement sa valeur :

1. Le profil key/support/required families n'est jamais donné à `evaluatePack`; un payoff clé et un support ordinaire ne sont donc pas distingués par ce savoir. Source : contrat d'entrée et lecture réelle dans `src/domain/coaching/dynamic-score.ts:L352-L405,L495-L558`, à comparer avec le profil utilisé seulement par `src/domain/coaching/deck-evaluation.ts:L364-L437`.
2. Les tags Titou ne sont renseignés que sur 21/541 cartes, donc la boucle de recouvrement des tags est presque toujours inactive. Sources : `src/domain/coaching/dynamic-score.ts:L377-L402`, comptage du bundle courant.
3. Simulation et Solo injectent `{ cubeKey, catalog }`, jamais `cubeMeta`. Le multiplicateur tribal utilise donc la valeur par défaut 1,5 au lieu du 2,2 déclaré ; `fixingPriorityBonus` et `curveStrictness` du méta-profil ne sont pas lus ici. Sources : `src/simulation/detailed-simulation.ts:L323-L335`, `src/solo-draft/solo-draft-session.ts:L303-L320,L533-L640`, `src/domain/coaching/dynamic-score.ts:L397-L401`, `data/cubes/titou_tribal/cube-meta.json:L234-L238`.

Le bot ami ajoute des préférences simples — sous-types communs, gros spells, wipes, réanimation — et désactive explicitement le plan réanimation pour Titou. C'est auditable, mais ce modèle de personnalité ne connaît pas les familles nécessaires d'un archétype. Sources : `src/bots/friends/friend-bot-policy.ts:L48-L75,L83-L232`.

Le chemin multijoueur est plus faible encore au moment des picks : le coordinateur instancie les bots amis sans `resolveCard` ni `evaluationContext`. Le resolver par défaut ne connaît alors que l'ID/nom d'instance, attribue un score 25 et aucune couleur ; la majorité des signaux de puissance, mana et personnalité est neutralisée. La surface multijoueur ne bénéficie donc pas aujourd'hui de la même intelligence déterministe que Solo. Source : `src/multiplayer-draft/coordinator.ts` lors de `createFriendBotPolicy`, et fallback de `src/bots/friends/friend-bot-policy.ts`.

### 4.2 Construction et évaluation finale Solo

Ici la donnée spécialisée est vraiment mobilisée. Le Solo exige que le profil corresponde au cube et au snapshot, calcule le seuil de bombe sur le top 5 % du cube avec égalités, appelle `recommendDeckBuilds` avec ce profil puis `evaluateDeck`. Sources : `src/solo-draft/solo-draft-session.ts:L185-L220,L1333-L1369`, `src/simulation/detailed-simulation.ts:L745-L780`.

L'évaluation est particulièrement adaptée à un coach explicable : Power 20 %, Synergy 25 %, Curve 20 %, Mana 20 %, Interaction 15 %. Pour la synergie, elle expose toutes les cartes key/support trouvées, le score 3/1, les familles et minima, les cartes témoins et les plafonds d'incomplétude. Sources : `src/domain/coaching/deck-evaluation.ts:L32-L38,L364-L437,L794-L845,L858-L890`.

Ses limites viennent surtout des données : l'interaction est reconnue par regex sur le texte Oracle, donc les 33 textes vides génèrent des faux négatifs ; le profil archétype incomplet sous-évalue les familles ; et l'étiquette aggro/midrange/control est détectée par heuristiques génériques indépendantes du profil de cube. Sources : `src/domain/coaching/deck-evaluation.ts:L63-L92,L782-L792`, `src/domain/coaching/deck-archetypes.ts:L124-L207`.

Le recommender possède en parallèle sa propre notion de tribu : seuil de six bodies, alliances codées en dur, +8 sur-tribu et -30 hors-tribu hors bombe. Il trie ensuite les builds avec `evaluateDeck`. Cette combinaison marche pour produire des options, mais peut sélectionner avec une heuristique puis expliquer avec un autre modèle. Sources : `src/domain/coaching/deck-recommender.ts:L143-L247,L416-L559`.

### 4.3 Coach final LLM : Solo et multijoueur

Le contrat `final-deck-coach@1` est sain : le LLM reçoit `cubeKey`, `snapshotId` et les cartes avec IDs d'instance, texte, couleurs, production, score et rôles ; il doit renvoyer des IDs du pool, et les cinq axes sont recalculés localement. Une réponse invalide retombe sur le recommender déterministe. Sources : `src/companion/coach-prompts.ts:L221-L275`, `src/multiplayer-draft/final-deck-coach.ts:L241-L310,L325-L351`.

Le Solo lui passe en plus `bombThreshold` et `synergyProfile`, donc sa recommandation externe est finalement évaluée avec les bonnes contraintes locales. Sources : `src/solo-draft/solo-draft-session.ts:L1373-L1394`, `src/multiplayer-draft/final-deck-coach.ts:L251-L253`.

Le coordinateur multijoueur ne passe en revanche aucun `evaluationOptions`. Son seam `loadCardPool` peut enrichir les cartes, mais le fallback par défaut donne score 25, CMC 3 et type `Card`, et l'appel au coach contient seulement cube, snapshot et pool. La synergie structurée vaut donc zéro dans la composition multijoueur courante à moins qu'une dépendance externe spécifique ne compense ce manque ; aucune composition de production qui le fasse n'a été trouvée dans `src/`. Sources : `src/multiplayer-draft/coordinator.ts:L130-L145,L1335-L1360`, `src/multiplayer-draft/types.ts:L255-L268`.

### 4.4 Companion de draft en direct

Le `CardResolver` fusionne les IDs Arena avec le catalogue par **nom normalisé**, ajoute texte, score et rôles, mais son type `CompanionCard` ne conserve ni Oracle ID, ni cube, ni profil, ni famille. Les erreurs de parsing des fichiers carte sont silencieusement ignorées. Le tier est lu en dur dans `cubeAnalyses.nico_candyshop`, quel que soit le contexte. Sources : `src/companion/card-resolver.ts:L5-L20,L73-L105,L129-L170,L292-L315`.

Le service unifié calcule d'abord un classement déterministe puis appelle le LLM et valide le nom renvoyé ; il sait accepter un `evaluationContext` optionnel et construire un contexte tribal si celui-ci existe. Cette frontière est bonne. Sources : `src/domain/coaching/draft-coach-service.ts:L250-L340,L347-L387`.

Mais le serveur Companion n'envoie jamais cet `evaluationContext`, ni lors du conseil automatique ni lors du bouton manuel. En conséquence, pas de score modifier par cube, pas de tags par cube, pas de règle tribale Titou et pas de méta-profil. Sources : `src/companion/server.ts:L133-L143,L541-L552`, `src/domain/coaching/draft-coach-service.ts:L267-L280`.

Même lorsque l'appel LLM réussit, la validation vérifie essentiellement que le nom choisi appartient au pack. Elle ne limite pas le modèle au top-k déterministe ; hors garde tribale, le LLM peut donc remplacer le classement local par n'importe quelle carte légale. Pour conserver une autorité déterministe et auditable, le modèle devrait expliquer un choix déjà contraint, ou ne pouvoir déroger qu'avec une exception locale validée et tracée. Source : `src/domain/coaching/draft-coach-service.ts:L250-L387`.

Le prompt ajoute ses propres présupposés : Powered/Arena/MH3, impact T1-T3, bombes tardives comme signal “indiscutable”, et seulement le texte Oracle des six premières cartes, tronqué à 200 caractères. Il n'envoie pas les rôles, la confiance, les memberships key/support, les familles manquantes ni la provenance. Sources : `src/companion/coach-prompts.ts:L25-L52,L171-L195`.

Enfin, le bouton de résumé du Companion utilise encore un ancien prompt qui ne transmet que nom, coût et CMC, exige 23 sorts + 17 terrains et ne fait ni validation locale ni recalcul des cinq axes. Ce chemin est distinct du coach final structuré. Sources : `src/companion/server.ts:L600-L606`, `src/companion/coach-prompts.ts:L200-L218`.

## 5. Livré, non branché, prévu

| Capacité                | Livré                                               | Non branché / limite actuelle                                              | Prévu ou conditionnel                                                                          |
| ----------------------- | --------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Snapshot reproductible  | import, validation et empreintes                    | catalogue/index peuvent dériver                                            | nouveau snapshot à chaque évolution                                                            |
| Profil Titou            | document v1, validation, génération déterministe    | bug `details.type`; supports meta ignorés                                  | revue éditoriale et nouveau modèle nécessaires                                                 |
| Pick scoring            | couleurs, mana, modifiers, tags, tribal hardcodé    | profil key/support/families absent ; courbe = 0 ; `cubeMeta` non injecté   | benchmarks de nouvelles métriques présents sous `scripts/research/`, pas dans le score courant |
| Bots                    | même score de base + biais audités                  | même ignorance du profil ; règles personnalité simplifiées                 | enrichissement possible sans changer le moteur de draft                                        |
| Deck evaluation         | cinq axes, audit détaillé, profil snapshot-bound    | qualité limitée par textes/profil ; deux détecteurs d'archétype            | calibration par ligue si fournie                                                               |
| Solo coach final        | LLM borné + validation/fallback + évaluation locale | payload LLM n'expose pas encore le profil lui-même                         | utilisable après correction du profil                                                          |
| Multijoueur coach final | contrat/fallback/validation                         | coordinateur n'injecte ni catalogue de prod garanti ni `evaluationOptions` | seam `loadCardPool` existe                                                                     |
| Companion pick          | résolution Arena, classement local, LLM fallback    | contexte cube absent, prompt global faux pour Titou                        | le service accepte déjà `evaluationContext`                                                    |
| Calibration ligue       | code, corpus, tests et audit                        | seulement Powered Vintage ; 1 draft/1 deck ; statut provisional            | passage `ready` à 3 témoins/tier, 10 drafts et 15 decks par cube                               |

Sources : `specs/002-coaching-friend-bots/checklists/requirements.md:L11-L38`, `specs/005-league-deck-calibration/tasks.md:L45-L100`, `tests/fixtures/golden-datasets/powered-vintage/league.json:L1-L36`, `specs/005-league-deck-calibration/qa-evidence.md:L8-L13,L68-L68`.

La calibration de ligue n'est donc plus seulement une intention : elle est implémentée dans `evaluateDeck`. Elle reste volontairement provisoire et **Titou en est explicitement exclu** ; le moteur rejette Titou si on tente de lui appliquer la ligue `powered_vintage`. Sources : `src/domain/coaching/league-calibration.ts:L12-L41,L42-L108`, `tests/integration/coaching/league-deck-calibration.test.ts:L48-L95,L150-L162`, `tests/fixtures/golden-datasets/powered-vintage/league.json:L1-L36`.

## 6. Risques et recommandations

### P0 — bloquants avant de faire confiance au coach

1. **Réparer et verrouiller la vérité archétypale.** Normaliser chaque entrée CubeCobra vers une représentation canonique avant de générer le profil (`details.type`, `details.oracle_id`, tags). Consommer et valider aussi les `supportCards` déclarées. Faire échouer le build si une key/support n'est pas dans le snapshot actif, si un corps tribal canonique attendu disparaît ou si la couverture change sans revue. Les confiances automatiques ne doivent pas être toutes `A`. Preuve du risque : `scripts/build-archetype-synergy-profiles.mjs:L10-L23,L94-L156`.

2. **Créer un unique `CoachContext` snapshot-bound et l'injecter partout.** Il doit contenir au minimum `cubeKey`, `snapshotId`, empreinte, `cubeMeta`, catalogue/version, power ranking/version, profil/version et état de draft. Solo, simulation, bots, multijoueur et Companion doivent recevoir la même instance logique. Rejeter toute incompatibilité au chargement. Preuve du manque : `src/simulation/detailed-simulation.ts:L209-L235,L323-L335`, `src/companion/server.ts:L133-L143`, `src/multiplayer-draft/coordinator.ts:L1335-L1360`.

3. **Supprimer les présupposés globaux du prompt Companion.** Générer les instructions à partir de `powerTier`, `fundamentalTurn`, `pacing`, axes et archetypes du contexte ; une bombe tardive est un indice, jamais une preuve indiscutable. Le ranking local doit rester l'autorité et le LLM l'explicateur. Preuve de contradiction : `src/companion/coach-prompts.ts:L25-L40` contre `data/cubes/titou_tribal/cube-meta.json:L9-L22`.

### P1 — nécessaires pour un coach réellement utile

4. **Unifier l'inférence d'archétype au pick et au build.** À chaque pick, maintenir pour chaque archétype : points key/support, familles remplies/manquantes, densité, couleurs, fixing requis, coût de pivot et incertitude. Les règles `COMPATIBLE_TRIBE_MAP`, les tags et le profil ne doivent pas rendre trois verdicts différents. Sources de duplication : `src/domain/coaching/tribal-compatibility.ts:L34-L42,L149-L241`, `src/domain/coaching/deck-recommender.ts:L168-L247`, `src/domain/coaching/deck-evaluation.ts:L364-L437`.

5. **Rendre le catalogue exact avant de l'enrichir davantage.** Réconcilier snapshot, `presentInCubes`, `cube.json` et Oracle IDs ; interdire les collisions au build ; garder le nom-fallback seulement comme erreur auditable. Compléter les 33 textes Oracle multi-face, normaliser les coûts et ajouter l'identité de source/fraîcheur. Sources : `scripts/sync-data-models.mjs:L27-L47,L113-L127`, `src/cards/card-catalog.ts:L169-L188`, `data/schemas/card.schema.json:L28-L44`.

6. **Remplacer les champs éditoriaux templates par des données utiles et sourcées.** Priorité aux rôles réellement consommés : removal scope, card advantage, ramp/fixing, enabler/payoff, token/sacrifice, typeline par face, contraintes de mana. Versionner l'annotation et distinguer `human_curated`, `rule_derived`, `model_suggested`, `observed`. Sources du contenu template : `scripts/generate-referential.mjs:L319-L408`, `scripts/regrade-titou-tribal.mjs:L131-L170`.

7. **Envoyer au LLM une vue calculée, pas le catalogue brut.** Pour chaque candidat : score local et breakdown, rôle dans les 2–3 archétypes probables, key/support, familles qu'il complète, cartes témoins du pool, tension mana/courbe, provenance/confiance. Pour le pool : état d'engagement et options de pivot. Le LLM doit expliquer/adapter le ton, jamais recalculer la légalité ni inventer le modèle. Source de la frontière déjà saine : `src/domain/coaching/draft-coach-service.ts:L250-L340,L347-L387`; manque du prompt : `src/companion/coach-prompts.ts:L171-L195`.

8. **Brancher le même contexte au multijoueur et remplacer le résumé Companion ancien.** Le multijoueur doit charger le catalogue réel et passer `bombThreshold + synergyProfile`; le bouton Summary doit appeler `final-deck-coach@1` ou le fallback local, pas un prompt libre 23/17. Sources : `src/multiplayer-draft/coordinator.ts:L130-L145,L1335-L1360`, `src/companion/server.ts:L600-L606`, `src/companion/coach-prompts.ts:L200-L218`.

### P2 — calibration et amélioration continue

9. **Créer des witnesses Titou avant toute promesse de tier relatif.** Jeux de données attendus : drafts complets experts, choix alternatifs annotés, pools/builds, résultats seulement comme contexte, et exemples négatifs de faux archétypes. Ne jamais réutiliser `powered_vintage`. Le contrat de corpus et l'isolation evaluation-only existent déjà. Sources : `data/schemas/league-witness-corpus.schema.json`, `src/domain/coaching/witness-corpus.ts:L20-L49,L65-L241`, `tests/fixtures/golden-datasets/powered-vintage/league.json:L1-L36`.

10. **Mesurer séparément humains et bots.** Pour l'humain : taux d'acceptation, compréhension, regret de pick annoté, capacité à pivoter. Pour les bots : force, diversité, exploitabilité, cohérence de table et stabilité seed-to-seed. Le même contexte peut alimenter les deux, mais la politique d'action et l'explication ne doivent pas être confondues.

11. **Ajouter des tests de bout en bout sur les raccordements, pas seulement les modules.** Minimum : P1P1 Titou, engagement Gobelins, key card tardive, bridge, payoff sans densité, carte hors tribu, deck final incomplet, Companion recevant le contexte Titou, et multijoueur reproduisant exactement l'audit Solo. Les tests actuels prouvent Gobelins/Sorciers sur des listes construites depuis le profil lui-même, ce qui ne détecte pas une omission du générateur. Sources : `tests/integration/coaching/cube-archetype-synergy-witness.test.ts:L42-L89`, `tests/unit/cubes/archetype-synergy-profile.test.ts:L13-L56`.

12. **Corriger la documentation de données.** Elle mentionne `data/schemas/cube-snapshot.schema.json`, absent du répertoire, annonce “560+” cartes alors que le bundle en porte 1 948, et qualifie `cube.json` de source de vérité alors que `sync-data-models` le génère depuis `cube-meta` et les cartes. Sources : `data/README.md:L9-L42,L47-L61,L162-L205`, `scripts/sync-data-models.mjs:L104-L161`.

## 7. Contrat de contexte recommandé

Sans imposer encore une nouvelle API, le contexte prémâché devrait fournir cette projection minimale à l'IA et aux bots :

```ts
interface CoachContext {
  provenance: {
    cubeKey: string;
    snapshotId: string;
    snapshotSha256: string;
    catalogVersion: string;
    powerRankingId: string;
    archetypeModelVersion: string;
  };
  environment: {
    powerTier: string;
    pacing: string;
    fundamentalTurn: number;
    criticalWindow: string;
    scoringProfile: unknown;
  };
  cardsByInstanceId: Record<string, CanonicalCardFacts>;
  archetypes: readonly ArchetypeProfile[];
  draftState: {
    pack: number;
    pick: number;
    pool: readonly string[];
    candidateArchetypes: readonly {
      id: string;
      score: number;
      keyCards: readonly string[];
      supportCards: readonly string[];
      completeFamilies: readonly string[];
      missingFamilies: readonly string[];
      confidence: number;
      pivotCost: number;
    }[];
  };
}
```

La projection envoyée au LLM peut être beaucoup plus petite : top candidats, preuves concrètes, contraintes et provenance. Le contexte complet reste local pour le scoring et l'audit.

## 8. Critères d'acceptation proposés

Le chantier peut être considéré prêt pour un coach Titou quand :

1. 100 % des IDs du snapshot actif se résolvent par Oracle ID exact ; aucun fallback par nom n'est nécessaire.
2. Chaque key/support de `cube-meta` appartient au snapshot ou est explicitement rejetée.
3. Les corps tribaux canoniques comme Skirk Prospector, Youthful Valkyrie, Spellseeker et Windrider Wizard figurent dans les profils attendus.
4. Le pick engine, les bots, Solo, multijoueur et Companion publient le même `snapshotId` et `archetypeModelVersion` dans leur audit.
5. Un pick peut expliquer : puissance, engagement couleur, effet mana/courbe, archétype probable, statut key/support et famille complétée/manquante.
6. Le Companion Titou ne contient plus les hypothèses Powered/MH3/T1-T3.
7. Une même liste finale évaluée via Solo et multijoueur produit les mêmes cinq axes et le même audit de synergie.
8. Les sorties LLM invalides, contradictoires ou sans preuves retombent toujours sur le résultat déterministe local.

## 9. Preuves QA exécutées pendant l'audit

| Commande                                                                                                                                                                                                                                         | Résultat                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `npm run synergy:profiles:verify`                                                                                                                                                                                                                | succès ; le profil commité est reproductible par le générateur courant                                                             |
| `npx vitest run tests/unit/cubes/archetype-synergy-profile.test.ts tests/integration/coaching/cube-archetype-synergy-witness.test.ts tests/unit/cards/card-schema-validation.test.ts tests/integration/coaching/league-deck-calibration.test.ts` | 4 fichiers, 16 tests, tous réussis, 856 ms                                                                                         |
| `node --no-warnings --experimental-strip-types src/cli/import-cube.ts validate --file data/cubes/titou_tribal/2026-02-24.1.json`                                                                                                                 | valide ; 545 instances, 543 impressions, 542 identités Oracle                                                                      |
| `npm run cube:validate -- --file data/cubes/titou_tribal/2026-02-24.1.json`                                                                                                                                                                      | échec `INVALID_ARGUMENTS` : le wrapper npm observé n'a pas transmis `--file`; la commande directe ci-dessus valide le même fichier |

Le succès de `synergy:profiles:verify` prouve l'absence de drift **par rapport au générateur**, pas l'exactitude du générateur. C'est précisément pourquoi le bug `details.type` reste invisible. Le script fait partie du gate global `npm run check`. Sources : `package.json:L14,L35-L36`, `scripts/build-archetype-synergy-profiles.mjs:L526-L545`.

## Conclusion opérationnelle

DraftMaster possède déjà les bons invariants d'architecture : snapshot immuable, décisions locales déterministes, profils versionnés, score explicable, fallback LLM et traces. Le travail prioritaire n'est pas d'ajouter davantage de prose “IA” aux cartes. Il est de **réparer les jointures et d'unifier la mobilisation des données existantes**.

Après les P0, le coach disposera d'une base cohérente pour dire à un humain « cette carte complète ton payoff Gobelins mais ta densité reste faible » et à un bot « ce pick augmente l'espérance de cohérence de l'archétype sans verrouiller trop tôt les couleurs ». Avant cela, le système peut produire un excellent rapport de deck tout en ayant conseillé les picks avec un modèle différent — et c'est le principal risque produit actuel.
