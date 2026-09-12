# QA Evidence — Visualiseur HTML du Draft Titou

**Date**: 2026-09-09
**Seed vérifiée**: `42`  
**Statut**: automatisation verte ; validation visuelle humaine encore possible dans le navigateur local choisi par le reviewer.

## Critères prouvés

- Le siège 0 du rapport autonome est `Le Rockeur` (`botId: theo`) ; Tristan reste le siège humain de l'application produit.
- La définition d'une bombe est le top 5 % des identités canoniques classées par `powerScore.score`, égalités au seuil incluses.
- Le snapshot classe 542 identités ; le seuil seed-independent est 44/55 et rend 29 identités éligibles.
- Le tirage seed 42 distribue 21 instances de bombes dans les 24 boosters ; 9 boosters n'en contiennent aucune.
- Le rapport boosters embarque 24 boosters de 15 cartes et aucun champ ni ruban de premier pick.
- Le rapport détaillé embarque 360 décisions. Chaque décision contient le `dynamicScore`, le détail du coaching, les contributions des biais, le `policyScore`, la probabilité, le rang, la température et le tirage déterministe.
- Chaque étape se relie à un événement canonique `CardPicked` par `eventSequence`, `boosterId`, pack, pick, siège et carte ; le rapport canonique expose aussi son digest SHA-256 fonctionnel.
- Les biais `colorDiscipline` et `tribalSynergyBonus`, auparavant déclarés mais inertes, produisent maintenant des contributions chiffrées couvertes par tests.
- Le deck final affiche séparément Puissance, Synergie, Courbe, Mana et Interaction. Son audit `deck-evaluation@4` expose la formule pondérée, la distribution de puissance, les bombes top 5 %, le mana rapide, le référentiel versionné, les cartes clés/support d'archétype, les familles de rôles requises et manquantes, les packages, les CMC imprimés/effectifs, les sources requises, les fixeurs et les interactions reconnues avec leur qualité et leur cible par archétype. La Synergie constate qu'une idée a assemblé ses bonnes briques ; elle ne prédit pas la force de l'archétype.
- Les cinq decks trophées Powered Cube fournis sont conservés comme ancres qualitatives versionnées ; ils ne sont pas présentés comme une calibration numérique complète tant que 23 cartes manquent au catalogue maître de production.

## Commandes et résultats

```text
npm run simulate:html -- --seed 42
  Simulation: 360 décisions en 190 ms
  Artefacts seed 42 régénérés

npm run synergy:profiles:verify
  Profils Titou et Nico identiques à leur génération depuis les archives sources

npm run reports:verify
  Verified schema v2 reports for seed 42: 24 boosters, 21 bombs, 360 traced decisions.

npm run check
  Prettier: OK
  ESLint: OK
  TypeScript: OK
  Vitest: 56 fichiers, 322 tests passés
  V8: 86.56 % statements, 72.43 % branches, 91.33 % functions, 87.68 % lines
  Vérification des rapports: OK
  Playwright: 14 parcours navigateur passés, dont l'ouverture du deck depuis le Mur des Records sans raccourcis 17Lands/Boosters

git diff --check
  Aucune erreur d'espace ; seuls des avertissements de conversion CRLF/LF concernent CONTEXT.md et README.md.
```

## Environnement observé

Le dépôt déclare Node.js 24 et npm 11. La vérification ci-dessus a effectivement tourné avec Node.js `v22.16.0` et npm `10.9.2`. Tous les contrôles passent, mais la validation finale en CI doit conserver l'environnement déclaré pour éviter de masquer une divergence de runtime.

## Limite de validation locale

Le navigateur intégré à Codex bloque les URL `file:///`. L'ouverture interactive du fichier local n'a donc pas été automatisée dans cette session. Les scripts générés compilent, les contrôles HTML ciblés passent et le contrat de navigation est couvert au niveau du générateur ; une revue visuelle manuelle reste le dernier contrôle ergonomique utile.
