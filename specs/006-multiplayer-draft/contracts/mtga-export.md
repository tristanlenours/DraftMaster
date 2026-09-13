# Contract: Export MTGA

## Grammar

```text
Deck
<quantity> <canonical Arena card name>
...

Sideboard
<quantity> <canonical Arena card name>
...
```

- Une ligne par nom canonique, quantites agregees.
- Le Deck contient exactement 40 cartes, terrains basiques inclus.
- Le Sideboard contient chaque carte draftee non retenue, avec sa multiplicite.
- L'ordre est stable : terrains apres les sorts dans Deck, puis noms par cout/type/nom selon les metadonnees disponibles.
- Les fins de ligne sont `\n`; le texte se termine par une nouvelle ligne.

## Compatibilite

Une carte doit posseder un nom Arena canonique non ambigu. Les faces alternatives exportent le nom reconnu par Arena. Si au moins une carte n'est pas resolue, le resultat contient `compatible=false`, la liste exacte des incompatibilites et un texte partiel explicitement marque ; il n'est jamais presente comme importable sans correction.

## Source

Le generateur accepte uniquement une Liste finale validee et le catalogue lie au Snapshot. Une proposition brute du Coach ne peut pas etre exportee.
