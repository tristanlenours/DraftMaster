# DraftMaster

DraftMaster redémarre sur une base greenfield pour construire un moteur de draft Magic déterministe, auditable et testable. Le premier périmètre est un draft headless à huit sièges sur une version figée du cube Tribal Titou.

La spécification et l’implémentation TypeScript sont développées sur la branche `001-simulate-titou-draft`. La branche principale conserve pour l’instant la constitution QA, le vocabulaire métier, la recherche, l’outillage agent et le snapshot historique nécessaire.

## Données préservées

Le snapshot `data/cubes/titou_tribal/2026-02-24.1.json` contient 545 instances du mainboard CubeCobra historique. Sa provenance, ses empreintes et sa méthode de reproduction sont documentées dans `data/cubes/titou_tribal/README.md`.

## Gouvernance

- `CONTEXT.md` définit le vocabulaire métier canonique.
- `.specify/memory/constitution.md` définit les exigences de qualité et de validation humaine.
- `docs/` conserve les décisions, recherches et consignes de contribution.
- `AGENTS.md` décrit les règles de travail applicables au dépôt.

Le runtime legacy reste accessible dans l’historique Git antérieur au reset. Aucun runtime applicatif n’est disponible sur cette base tant que la première feature TypeScript n’a pas été fusionnée.
