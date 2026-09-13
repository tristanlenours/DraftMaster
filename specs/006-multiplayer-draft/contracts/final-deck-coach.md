# Interface Contract: FinalDeckCoach

## Mission versionnee `final-deck-coach@1`

Le Coach recoit un pool complet et doit proposer le meilleur deck jouable de 40 cartes, sans regle fixe 23/17.

Il doit :

1. identifier le plan principal, les couleurs et tout splash ;
2. conserver uniquement les paquets synergiques suffisamment complets ;
3. equilibrer puissance, courbe, interaction et castabilite au tour utile ;
4. compter terrains non basiques, MDFC, fixeurs, cailloux et accelerateurs selon leur fonctionnement reel ;
5. viser normalement 16 a 18 terrains totaux et justifier tout ecart ;
6. expliquer au moins deux inclusions et deux exclusions structurantes lorsque le pool le permet ;
7. referencer uniquement des `cardInstanceId` recus et des terrains basiques autorises ;
8. produire du JSON conforme, sans Markdown libre.

## Input minimal

- `cubeKey`, `snapshotId`, versions moteur/prompt ;
- pour chaque carte du pool : `cardInstanceId`, nom canonique, cout, CMC, type, texte Oracle, couleurs, couleurs produites, score statique, roles et affinites disponibles ;
- options du validateur et evaluation locale de reference.

Interdits : pseudo, Acces de reprise, identite de session publique, cartes ou choix d'un autre joueur.

## Output

- `maindeckCardInstanceIds` avec multiplicites exactes ;
- `basicLands` (`Plains`, `Island`, `Swamp`, `Mountain`, `Forest`) ;
- `strategy`, `primaryColors`, `splashColors` ;
- `includedReasons[]`, `excludedReasons[]` avec cartes concretes ;
- `manaRationale`, `landCountRationale` ;
- provenance ajoutee par DraftMaster : provider, modele, `promptVersion`, `engineVersion`, externe ou repli.

## Validation locale obligatoire

- total exact de 40 ;
- aucune carte draftee absente et aucune multiplicite superieure au pool ;
- comptes basiques entiers et non negatifs ;
- terrains totaux calcules depuis types de cartes + basiques ;
- justification non vide hors plage 16-18 ;
- evaluation cinq axes recalculee localement ;
- toute violation declenche le repli deterministe sans mutation du DeckWorkspace.

## Homologation

Dans le Solo Draft Coach, l'appel pre-Resultat verrouille retire l'Homologation avant l'envoi externe. Dans le Draft multijoueur, aucune session n'est homologuee.
