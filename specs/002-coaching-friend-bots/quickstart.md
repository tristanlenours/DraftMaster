# Quickstart: Coaching Pédagogique et Bots Personnalisés Amis

Ce guide présente comment exécuter et vérifier les nouveaux modules de coaching et de bots amis.

## 1. Exécuter les tests unitaires et d'intégration

```bash
# Lancer l'intégralité de la suite coaching et bots
npx vitest run tests/unit/coaching/ tests/unit/bots/ tests/integration/coaching/

# Quality gate complet (format, lint, tsc, tests, coverage)
npm run check
```

## 2. Lancer la démonstration du Booster Coaché (Pack 1, Pick 5)

Simule l'évaluation pédagogique détaillée du booster réel avec vos cartes Esper préalables (*Reanimate*, *Mana Drain*, *Teferi*) :

```bash
npm run demo:coaching
```

## 3. Lancer la démonstration de la Table de Draft entre Amis (Pack 1, Pick 1)

Simule les 8 sièges autour de la table avec vos amis (Nico, Rémi, Hugues, Ivan, Papayou, Cédric, Titou) :

```bash
npm run demo:friends
```

## 4. Lancer la démonstration de l'Évaluation de Deck & Radar Kiviat 5 Axes

Évalue le deck de 40 cartes témoin en Esper Control, affiche le graphe de Kiviat (Puissance, Synergie, Courbe, Mana avec fixeurs/dorks, Interaction) et génère 2 à 3 propositions de builds automatiques à partir du pool de 45 cartes :

```bash
npm run demo:evaluation
```

