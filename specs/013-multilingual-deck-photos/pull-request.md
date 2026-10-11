# fix(deck-lab): reconnaître les cartes en anglais et en français

Les titres français des photos du cube de Nico étaient rejetés faute de traductions dans le catalogue local. La reconnaissance utilise désormais les noms anglais du catalogue et 771 noms imprimés français issus de Scryfall, avec Unicode et identité oracle conservés. Les titres ambigus ou incomplets restent à vérifier manuellement.

Les deux JPEG fournis sont conservés byte pour byte comme fixtures, avec leurs empreintes et attentes inspectées. Le chevauchement des six zones est augmenté pour garder le bandeau de Visions nées du sérum entier. Les noms et quantités restent éditables et doivent être confirmés avant analyse.

Suivi de [#88](https://github.com/tristanlenours/DraftMaster/issues/88) et [#86](https://github.com/tristanlenours/DraftMaster/issues/86). [Spécification](https://github.com/tristanlenours/DraftMaster/blob/codex/013-multilingual-deck-photos/specs/013-multilingual-deck-photos/spec.md), [preuves de validation](https://github.com/tristanlenours/DraftMaster/blob/codex/013-multilingual-deck-photos/specs/013-multilingual-deck-photos/qa-evidence.md).

Validation : 726 tests et leur couverture passent sous Node 24, ainsi que le formatage, lint, types, catalogue et rapports de référence. Les deux essais réels Gemini passent et les neuf parcours Deck Lab passent. Le contrôle combiné finit à 46/47 parcours navigateur : le parcours multijoueur dépasse son délai à quatre workers, comme lors de la qualification précédente (réussite isolée en 21,8 secondes avec un worker avant cette réduction de langues). Cet échec du contrôle combiné reste documenté ; aucune dérogation de fusion. Standards et Spec : aucun constat restant. L'audit est sans vulnérabilité après la mise à jour ciblée de source-map-js 1.2.1 vers 1.2.2. CI et approbation humaine restent requises avant fusion.

Limite : la couverture initiale des traductions vise Nico et les cinq terrains de base ; l'importeur peut étendre le cache aux autres cubes. Une photo illisible ou une traduction absente reste une correction manuelle. Les replays automatisés ne constituent pas une mesure exhaustive de précision OCR.

La branche est poussée (commit source 62c2ddbe). La création de la PR via le connecteur a échoué avec 403, « Resource not accessible by integration ». Ce document est une description prête à utiliser ; aucune PR ni réussite CI n'est revendiquée.
