# Proposed PR #90 description

Title: Unifier les moteurs de deck du draft et de Deck Lab

Rate my Deck, Pimp my Deck, Solo et multijoueur utilisent les mêmes faits catalogue et options d'évaluation du cube. Pimp reprend la construction adaptative du draft (minimum 22 sorts), et la finalisation multijoueur refuse un contexte d'un autre snapshot.

Le suivi de validation préserve le focus des cartes pendant le polling, isole les ressources externes des scénarios navigateur aux API simulées et corrige les deux dépendances transitives vulnérables du lockfile.

Suivi de [#86](https://github.com/tristanlenours/DraftMaster/issues/86). [Spécification](https://github.com/tristanlenours/DraftMaster/blob/codex/012-shared-deck-engine/specs/012-shared-deck-engine/spec.md) et [preuves de validation](https://github.com/tristanlenours/DraftMaster/blob/codex/012-shared-deck-engine/specs/012-shared-deck-engine/qa-evidence.md).

Validation locale : 45 parcours navigateur passent ; régression du focus rouge avant correction puis verte ; npm audit sans vulnérabilité ; revues Standards et Spec sans constat actionable. Consulter les preuves pour le résultat final du gate local et de la CI, les limites et l'historique des échecs. Approbation humaine requise avant fusion.

Sur la version du code 016721ad, la CI Qualité et Sécurité est verte, notamment sur trois OS, les parcours navigateur et la performance isolée. Localement, les 711 tests passent avec couverture et un seul worker, sans augmenter les délais. Le lancement local à sept workers échoue sur des contrôles de temps ; cette limite est documentée dans les preuves. Les commits de documentation suivants doivent aussi avoir leurs checks verts avant fusion.

Le connecteur refuse la mise à jour du titre et du corps (403). Ce fichier est une proposition et ne représente pas les métadonnées actuelles sur GitHub.
