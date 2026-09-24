# Feature Specification: Listes MTGA des Decks déclarés

**Feature Branch**: `codex/009-mtga-tournament-decks`
**Created**: 2026-09-24
**Status**: Implementation
**Issue**: [#82](https://github.com/tristanlenours/DraftMaster/issues/82), related photo follow-up [#81](https://github.com/tristanlenours/DraftMaster/issues/81)

## User Scenarios & Testing

### User Story 1 - Corriger une photo en texte (P1)

Après la reconnaissance d'une photo, l'Organisateur de tournoi voit une liste au format MTGA dans l'éditeur du Deck déclaré. Il peut ajouter une ligne pour une carte manquée, modifier une quantité, appliquer la liste et vérifier la vue du deck avant de la valider.

**Independent Test**: Scanner la photo témoin, ajouter une carte manquée au texte et constater qu'elle apparaît dans la vue du deck puis dans le tournoi après confirmation.

1. **Given** un résultat photo contenant 39 cartes, **When** une ligne `1 Maul of the Skyclaves` est ajoutée puis appliquée, **Then** la vue contient cette carte et 40 cartes au total.
2. **Given** un texte modifié mais non appliqué, **When** l'organisateur valide le deck, **Then** il est invité à appliquer et vérifier la liste avant l'enregistrement ; le deck courant reste intact.

### User Story 2 - Coller un export Arena ou DraftMaster (P1)

L'Organisateur colle une liste MTGA d'un draft en ligne ou copie l'export MTGA déjà disponible dans le draft multijoueur DraftMaster. Le maindeck devient le Deck déclaré du participant après prévisualisation et confirmation.

**Independent Test**: Coller un export comportant `Deck` et `Sideboard`, vérifier le maindeck et le nombre de cartes ignorées du sideboard, puis enregistrer et rouvrir le participant.

1. **Given** une liste MTGA valide, **When** elle est appliquée, **Then** les noms et quantités du maindeck sont conservés, les terrains de base sont séparés, et le sideboard n'est pas ajouté.
2. **Given** l'export pour tournoi du draft multijoueur, **When** il est collé dans un tournoi, **Then** toutes les cartes du maindeck apparaissent sans ressaisie, même si certaines sont indisponibles dans Arena.
3. **Given** un export partiel signalé non importable, **When** il est collé, **Then** l'import est refusé avec une explication ; le deck courant reste intact.

### User Story 3 - Copier ou télécharger le deck du tournoi (P2)

L'Organisateur peut copier ou télécharger le texte du Deck déclaré pour le corriger ailleurs ou tenter de l'importer dans Arena.

**Independent Test**: Copier/télécharger une liste puis la recoller dans l'éditeur ; cartes et quantités restent identiques.

1. **Given** un Deck déclaré visible dans un tournoi, **When** son texte est exporté, **Then** il contient `Deck` et une ligne par carte avec quantité.

### Edge Cases & Clarifications

- Un nom absent du catalogue local est conservé tel quel et présenté comme non vérifié ; il n'est jamais remplacé par une correspondance approximative sans confirmation.
- Les lignes mal formées, quantités nulles/négatives, sections inconnues et listes vides empêchent l'application ; aucune mise à jour partielle n'a lieu.
- Les noms avec suffixe d'édition `(SET) 123` sont acceptés ; leur nom de carte canonique est conservé.
- Le sideboard est annoncé et ignoré pour le Deck déclaré, qui représente le maindeck. L'export MTGA du draft multijoueur existant refuse les cartes indisponibles dans Arena ; un export séparé « pour tournoi » fournit la liste complète. Le transfert entre vues utilise le presse-papiers ou le fichier texte, sans accès aux tokens privés d'un autre joueur.
- La photo et le texte brut ne sont pas conservés dans le tournoi. L'enregistrement humain reste obligatoire.
- Une liste de cartes physiques peut être syntaxiquement au format MTGA sans être importable dans Arena si certaines cartes n'y existent pas. L'interface ne promet pas cette disponibilité.

## Requirements

### Functional Requirements

- **FR-001**: L'éditeur du Deck déclaré MUST afficher une liste texte MTGA correspondant aux cartes et terrains actuellement prévisualisés, y compris après une reconnaissance photo.
- **FR-002**: L'organisateur MUST pouvoir coller ou modifier une liste MTGA, appliquer le maindeck en une opération atomique et confirmer avant persistance.
- **FR-003**: L'import MUST accepter les lignes de quantité et nom, les sections `Deck` et `Sideboard`, les métadonnées `About`/`Name`, et les suffixes d'édition courants.
- **FR-004**: Le sideboard MUST être compté et signalé sans entrer dans le Deck déclaré.
- **FR-005**: Les erreurs de syntaxe, export partiel et liste vide MUST bloquer l'application sans changer la prévisualisation existante.
- **FR-006**: Les noms exacts connus du catalogue MUST être enrichis ; les autres noms MUST rester visibles et signalés comme non vérifiés.
- **FR-007**: L'export du Deck déclaré MUST fournir un texte copiable et téléchargeable que le même import peut relire sans perte de quantités.
- **FR-008**: Le parcours MUST fonctionner pour la préparation et pour un participant d'un tournoi actif, sans modifier les appariements ni le classement.
- **FR-009**: Le texte brut et la photo MUST rester hors de l'état persistant du tournoi ; seules les cartes structurées et le nom du deck y entrent après confirmation.
- **FR-010**: Le draft multijoueur MUST pouvoir copier ou télécharger une liste complète pour tournoi depuis le deck finalisé, y compris les cartes incompatibles avec Arena, sous le même accès privé que son export MTGA.

### Key Entities

- **Deck déclaré** : nom public et liste structurée de cartes du participant du tournoi.
- **Liste MTGA** : représentation texte provisoire du maindeck, éventuellement accompagnée d'un sideboard et d'un nom.
- **Carte non vérifiée** : ligne de maindeck syntaxiquement valide dont le nom n'a pas été trouvé exactement dans le catalogue local.

## Success Criteria

- **SC-001**: Une carte manquée par la photo témoin peut être ajoutée avec une seule ligne de texte et apparaît après confirmation.
- **SC-002**: Un export MTGA de 40 cartes du draft multijoueur peut être collé et enregistré sans retaper aucun nom.
- **SC-003**: Import puis export puis import conserve exactement les noms et quantités du maindeck dans les cas de test.
- **SC-004**: À 360 px et au clavier, l'organisateur peut coller, appliquer, lire les erreurs et valider le deck.

## Assumptions

- L'import remplace le maindeck prévisualisé ; ajouter une carte après photo consiste à modifier le texte prérempli.
- Les cartes hors Snapshot peuvent faire partie d'un draft Arena ; elles ne sont pas rejetées pour cette seule raison.
- Le sideboard ne fait pas encore partie du modèle persistant du Deck déclaré.
