# Mise à jour du cube de Nico (novembre 2026)

Les 17 et 18/11/2026, Nico a fait la première mise à jour de son cube **Fedor's candyshop IRL** (CubeCobra `1nxrs`) depuis le 11/12/2024 : 130 cartes sur 730 ont changé. Deux analyses indépendantes, faites à partir des mêmes faits, la décrivent et la comparent à la maybeboard IA de DraftMaster.

| Dossier | Auteur | Contenu |
|---|---|---|
| [claude/](claude/README.md) | Claude (Opus 5.5) | Journal des changements, analyse experte, benchmark de la maybeboard, avec les données et les scripts pour le rejouer |
| [gemini/](gemini/README.md) | Gemini | Changelog et inventaire, analyse experte, benchmark de la maybeboard, avec un jeu de données JSON |

## Suites données

- Le cube a été ré-importé sur le snapshot `nico_candyshop@2026-11-18.1`, avec 11 archétypes curatés.
- Le moteur d'upgrade est passé en `cube-upgrade-advisor@6` pour tenir compte de trois défauts relevés ici :
  - il ne propose plus de couper une pièce clé d'archétype ;
  - il ignore le texte de rappel et reconnaît « add an additional {G} » comme une source de mana ;
  - il plafonne le bonus d'archétype de la maybeboard.

Les deux benchmarks portent sur `cube-upgrade-advisor@5`, et les numéros de ligne qu'ils citent renvoient au code de cette version.

## Pistes non retenues à ce stade

- Abaisser au tier A- le seuil d'entrée des cartes jouées dans les cubes pairs et sans emplacement à remplacer.
- Donner plus de poids au MTGO Vintage Cube dans le classement.
- Ramener la maybeboard à 30 cartes.
- Recalibrer dans le Tier 1 les scores des cartes de combo et des moteurs.
- Ajouter au catalogue les classiques qui manquent (Flash, Lotus Petal, Mox Opal…).
