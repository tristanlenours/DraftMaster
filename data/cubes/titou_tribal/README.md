# Snapshot Titou Tribal

`2026-02-24.1.json` est la copie normalisée et immuable du mainboard du cube CubeCobra [`5e1c13b67c22a016c25ff019`](https://cubecobra.com/cube/list/5e1c13b67c22a016c25ff019), révision 64 du 24 février 2026. Elle constitue la source locale du premier moteur DraftMaster ; le runtime ne consulte pas CubeCobra ou Scryfall.

## Contenu vérifié

- 545 instances ordonnées du mainboard ;
- 543 identifiants d'impression Scryfall distincts ;
- 542 identifiants Oracle distincts ;
- maybeboard vide et cinq terrains de base séparés exclus ;
- aucune image, donnée de prix, note ou texte de carte conservé.

Chaque `instanceId` est propre à cette version et chaque `sourceIndex` correspond à l'ordre du tableau `mainboard` reçu. Les doublons physiques restent donc distincts.

## Provenance et reproduction

Exécuter explicitement depuis la racine :

```powershell
node scripts/import-historical-titou-snapshot.mjs
```

Le script refuse une autre révision, d'autres comptes ou une réponse brute dont le SHA-256 diffère de `7810d999d8c349a7fba56ea61dc0e479950d952bd3134337ffb07b983b616ee6`. Le fichier normalisé porte l'empreinte canonique `289f6c4a27b39bc4f6f1816827ab2cca1198bbb88e495063dedcb176c18aba39` ; `retrievedAt` et cette empreinte elle-même sont exclus de son calcul.

## Attribution

La composition vient de CubeCobra et les identifiants d'impression proviennent de Scryfall. Magic: The Gathering appartient à Wizards of the Coast ; DraftMaster est un projet non officiel de fan. Seules les données nécessaires à l'identité et à la reproductibilité sont redistribuées. Consulter les conditions de [CubeCobra](https://cubecobra.com/info/terms), de [Scryfall](https://scryfall.com/docs/terms) et la [Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy).
