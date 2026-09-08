# Provenance et périmètre de l'exploration `dynamicScore`

_Date de l'audit : 4 septembre 2026. Ce document est un appendice de
[`untapped-random-draft-calibration.md`](./untapped-random-draft-calibration.md). Il
enregistre ce que les artefacts locaux permettent de vérifier, sans attribuer à
Untapped une formule qui n'est pas publique._

## Objet et chaîne de preuve

| Élément                                                                                                                | Rôle dans l'expérience                        | Statut de provenance                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`data/untapped_history/drafts_backup.json`](../../data/untapped_history/drafts_backup.json)                           | Corpus local de picks et de `PackScores`      | Sauvegarde locale attribuée au Companion par le rapport ; son mode d'export, son compte, sa licence et son exhaustivité ne sont pas documentés dans le dépôt. |
| [`src/domain/coaching/dynamic-score.ts`](../../src/domain/coaching/dynamic-score.ts)                                   | Heuristique DraftMaster actuellement exécutée | Code local vérifiable ; ce n'est pas une implémentation fournie par Untapped.                                                                                 |
| [`tests/integration/coaching/untapped-benchmark.test.ts`](../../tests/integration/coaching/untapped-benchmark.test.ts) | Régression sur P1P1                           | Test local vérifiable, mais il ne couvre pas l'adaptation contextuelle.                                                                                       |
| [`untapped-random-draft-calibration.md`](./untapped-random-draft-calibration.md)                                       | Résultats et hypothèses de calibration        | Note de recherche locale ; les résultats avancés doivent être associés à un script/version de modèle avant de servir de preuve de régression.                 |

L'empreinte SHA-256 du corpus à la date de l'audit est :

```text
7BE9C9DE89ACDD096E984F4816AE45802071721A4D40F2BAC1D3F41621A7C270
```

Elle identifie les octets du fichier audité, pas leur origine ni leur
autorisation d'usage. Les affirmations publiques connues sur Draftsmith sont
traitées séparément dans [`untapped-draftsmith.md`](./untapped-draftsmith.md) ;
elles ne spécifient pas l'algorithme propriétaire.

## Commandes de reproduction

Exécuter depuis la racine du dépôt, avec Node 24 et les dépendances npm
installées :

```powershell
Get-FileHash data/untapped_history/drafts_backup.json -Algorithm SHA256

node -e "const fs=require('fs');const raw=JSON.parse(fs.readFileSync('data/untapped_history/drafts_backup.json','utf8'));const ds=Object.values(raw);let picks=0,positions=0,numeric=0,nullPairs=0,p1p1=0,p1p1eq=0,fully=0,partial=0,none=0;for(const d of ds){let dnum=0,dtot=0;for(const p of d.picks??[]){picks++;for(const s of Object.values(p.PackScores??{})){positions++;dtot++;if(Number.isFinite(s.staticScore)&&Number.isFinite(s.dynamicScore)){numeric++;dnum++;if(p.PackNumber===1&&p.PickNumber===1){p1p1++;if(s.staticScore===s.dynamicScore)p1p1eq++;}}else if(s.staticScore===null&&s.dynamicScore===null)nullPairs++;}}if(dnum===0)none++;else if(dnum===dtot)fully++;else partial++;}console.log(JSON.stringify({drafts:ds.length,picks,positions,numeric,nullPairs,fully,partial,none,p1p1,p1p1eq},null,2));"

npm run test -- tests/integration/coaching/untapped-benchmark.test.ts
```

Résultat observé pour l'empreinte ci-dessus : 28 drafts, 1 260 picks, 10 080
positions de `PackScores`, 7 553 paires numériques, 2 520 paires où les deux
scores sont `null`, 18 drafts entièrement scorés, 3 partiels et 7 sans valeur
numérique. Sur 315 positions P1P1 numériques, les deux scores sont égaux.

Les sept positions restantes par rapport à `10 080 - 7 553 - 2 520` ont au
moins une valeur non numérique sans être une paire exactement `null`/`null`.
Elles doivent être inspectées avant de présenter le corpus comme complètement
normalisé. Cette ventilation est plus précise que le chiffre de 2 527 paires
`null` figurant dans le rapport principal ; elle révèle un écart de 7 à
résoudre, non une nouvelle observation du modèle.

Le test passe sur ce poste. Son contrat est délibérément restreint : il cherche
le premier pick du premier booster de chaque draft et construit chaque carte
avec `colors: []` et un `priorPool` vide. Il vérifie donc la branche P1P1 de
`evaluateCard`, où le code retourne exactement `staticScore` comme
`dynamicScore`; il ne vérifie ni couleur, ni terrains, ni ordre des picks, ni
score après P1P1.

## Ce que le code courant fait réellement

Pour P1P1, `evaluateCard` renvoie le score statique sans ajustement. Pour les
picks suivants, il applique :

1. une progression de `commitment` déterministe issue de `packNumber` et
   `pickNumber` ;
2. l'identité des deux couleurs les plus fréquentes du pool ;
3. une affinité de couleur, avec une décroissance générale de 0,92 en pack 1
   après le premier pick, et de 0,95 ailleurs pour une carte parfaitement
   compatible ;
4. un bonus fixe de fixing de 1,0, 2,0 ou 3,5 pour certains terrains ;
5. un bonus de courbe fixé à zéro, puis un plancher à 1 et un arrondi à une
   décimale.

La synergie, les textes de règle, la courbe effective, la valeur de mana, les
archétypes, le deck recommandé et les signaux de table ne sont pas des entrées
de cette fonction. Les commentaires qui parlent de « distillation » dans le
test désignent donc une intention locale, pas une preuve de rétro-ingénierie.

## Registre des affirmations

| Affirmation                                                                                         | Évaluation                                                      | Justification / limite                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Le fichier audité contient des valeurs appelées `staticScore` et `dynamicScore`.                    | Confirmée localement                                            | Ce sont des champs présents dans `PackScores`; le dépôt ne prouve pas comment ils ont été produits.                                                                        |
| P1P1 est parfaitement reproduit par le test actuel.                                                 | Confirmée, mais triviale                                        | À P1P1, le moteur assigne explicitement `dynamicScore = staticScore`; les 315 cibles numériques observées sont elles-mêmes égales.                                         |
| Le moteur actuel reproduit le `dynamicScore` Untapped au-delà de P1P1.                              | Non confirmée                                                   | Le test ne l'évalue pas ; le rapport décrit une expérience plus large mais aucun script exécutable correspondant n'est versionné parmi les artefacts audités.              |
| MAE 6,25 du moteur, puis 4,72 du modèle à cinq axes sur le draft témoin.                            | Résultats rapportés, non rejouables depuis le dépôt             | Les chiffres, le split et le modèle apparaissent dans la note, mais pas le code, les features, les poids, la graine ou une sortie versionnée permettant de les recalculer. |
| Le mana explique « l'essentiel » du gain.                                                           | Hypothèse compatible avec les ablations rapportées, non établie | Les ablations dépendent des encodages annoncés dans le rapport et ne démontrent pas le mécanisme interne d'Untapped.                                                       |
| Untapped utilise des malus de couleur, une courbe, des synergies ou un modèle non séparable précis. | Non confirmé                                                    | Les scores observés montrent une variation contextuelle, pas la causalité ni l'architecture du système propriétaire.                                                       |
| Le fichier est un export autorisé et représentatif de Draftsmith.                                   | Non confirmé                                                    | Absence de manifeste de collecte, de licence, de date d'extraction, de format/cube et de chaîne de conservation dans les artefacts audités.                                |

## Limites à conserver lors des prochaines itérations

- Le corpus est petit, local et partiellement non scoré : il ne justifie pas à
  lui seul une généralisation à d'autres formats, époques ou comptes.
- Les scores sont des observations corrélées dans une même trajectoire de draft,
  pas des interventions contrôlées. Modifier plusieurs caractéristiques du
  pool à la fois ne permet pas d'isoler un « malus » causal.
- Un score cible seul ne montre pas pourquoi il a changé. Il ne permet pas de
  départager, par exemple, fixing, rareté, archétype, carte précise ou politique
  de construction de deck.
- Le rapport principal mélange des faits de corpus, des sorties expérimentales
  et des interprétations. Toute nouvelle itération doit garder ces trois niveaux
  explicitement distincts et ajouter ici la version des données, le split par
  draft, la graine, les features, les poids et les métriques par pack.
- Aucun résultat local ne doit être présenté comme la formule ou le modèle
  d'Untapped/Draftsmith. La cible convenable est une heuristique DraftMaster
  mesurée sur un jeu de test tenu à l'écart.

## Minimum de preuve pour une itération durable

Chaque expérience devrait déposer un artefact exécutable ou sérialisé qui
permet de reconstruire les métriques à partir de l'empreinte du corpus : liste
des drafts entraînement/test, graine de sélection, définition exacte des
features, paramètres appris, prédictions par carte, version du code et commande
unique de recalcul. Une métrique globale doit être accompagnée d'une ventilation
par pack et d'un contrôle P1P1 séparé pour que le cas trivial ne masque pas les
erreurs contextuelles.

## Contrat E4 de reproductibilité (satisfait le 4 septembre 2026)

Le harness durable est [`scripts/research/untapped-axis-benchmark.mjs`](../../scripts/research/untapped-axis-benchmark.mjs). Il effectue le split par draft, la validation croisée des valeurs de régularisation, les ablations et les métriques hors échantillon. Ses deux entrées sont versionnées : le corpus et [`card-metadata-v1.json`](../../data/untapped_history/card-metadata-v1.json). L'artefact produit conserve leurs empreintes SHA-256, le split, les paramètres, les prédictions par carte et leurs contributions par axe.

La commande durable est :

```powershell
npm run research:untapped-axis-benchmark
```

Elle écrit [`untapped-axis-benchmark-v1.json`](./artifacts/untapped-axis-benchmark-v1.json). Cette sortie contient 360 échantillons de test pour les 45 picks du draft témoin. L'ancienne sortie temporaire qui n'en contenait que 306 était incomplète ; elle ne doit pas servir de référence.

E4 rend les résultats de l'encodage à cinq axes vérifiables, pas la formule d'Untapped. Tout nouveau modèle doit conserver ce split, enregistrer son propre artefact et comparer ses résultats à E2 avant toute interprétation.

### Archive de la dette E4 résolue

Le texte qui suit documente l'état du harness exploratoire avant sa promotion. Il est conservé pour expliquer l'origine du décalage 306/360, pas comme commande active.

Le harness exploratoire [`.scratch/heldout-axis-model.mjs`](../../.scratch/heldout-axis-model.mjs)
est la seule chaîne locale inspectée qui effectue le split par draft, la
validation croisée des valeurs de régularisation, les ablations et les métriques
tenues à l'écart décrites dans le rapport principal. Il accepte un identifiant de
draft et un chemin de métadonnées, lit toujours
`data/untapped_history/drafts_backup.json`, puis écrit un objet JSON sur stdout
avec notamment `trainingDrafts`, `trainingSamples`, `heldOutSamples`,
`heldOutPicks`, `validation`, `selectedLambda`, `ablations`,
`heldOutMae`, `withinOne`, `withinThree`, `topOneAccuracy` et les
`coefficients`. Avec `DRAFTMASTER_PROTOTYPE_DATA`, il écrit en plus les
lignes de contribution destinées au prototype.

Avant E4, ce script était dans `.scratch/` et sa métadonnée par défaut était
`$env:TEMP/draftmaster-scryfall-full.json`. Cette variante produisait 306
échantillons de test pour le draft témoin, au lieu des 360 annoncés. E4 a
résolu l'écart en versionnant le jeu complet de métadonnées et son artefact ;
la variante temporaire reste uniquement un témoin de cette dette.

Le contrat minimal qui a motivé E4 était :

- versionner (ou référencer par URI, licence, taille et SHA-256) le corpus de
  drafts, le JSON de métadonnées carte et le script/harness ; enregistrer aussi
  l'identifiant du draft témoin et la version de Node ;
- fixer la règle qui exclut les cartes sans métadonnée, et exiger dans la sortie
  les comptes de positions source, paires numériques, cartes enrichies et cartes
  exclues, afin d'expliquer les 306/360 ;
- conserver l'objet JSON complet produit par l'exécution : split, sélection de
  `lambda` et de `k`, coefficients, ablations, prédictions par carte,
  métriques globales et par pack ; une sortie tronquée de terminal ne suffit pas ;
- ajouter ensuite une commande npm et un test de non-régression qui relisent ces
  entrées figées, plutôt que de dépendre de `TEMP` ou de `.scratch/`.

Ancienne commande provisoire, conservée à titre historique :

```powershell
Get-FileHash data/untapped_history/drafts_backup.json -Algorithm SHA256
Get-FileHash <metadata-json> -Algorithm SHA256
node .scratch/heldout-axis-model.mjs d555b02d-3745-4a4f-b1b6-fdc75c38c5c0 <metadata-json> > <resultat-json>
```

La sortie attendue est d'abord un JSON machine-readable contenant les champs
ci-dessus, puis les décompositions des cartes choisies ; il faut donc soit
séparer ces deux flux, soit sérialiser la seconde partie dans un artefact dédié
avant d'en faire une commande de CI. Cette commande est une proposition de
reproduction E4, pas un script packageé ni une interface de production.
