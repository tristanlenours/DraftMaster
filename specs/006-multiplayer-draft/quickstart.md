# Quickstart QA: Draft multijoueur

## Prerequis

- Node.js 24 et npm 11.
- Donnees de cube deja presentes.
- Pour le parcours production : Supabase configure avec le schema a jour.
- Les cles Gemini/OpenRouter sont optionnelles ; sans elles, le Coach local doit fonctionner.

## 1. Gate locale ciblee

```powershell
npm run typecheck
npx vitest run tests/contract/multiplayer-draft.test.ts tests/unit/multiplayer-draft tests/unit/coaching/deck-recommender.test.ts
```

Attendu : invariants de salon, idempotence, redaction, composition huit sieges, 45 Tours, Coach legal et export MTGA passent.

## 2. Integration HTTP

```powershell
npx vitest run tests/integration/multiplayer-draft-flow.test.ts
```

Le scenario lance un serveur isole, fait rejoindre Alice puis Bob, verifie le verrouillage du cube, le double Pret, un Tour complet avec six bots, un retry idempotent, une reprise par token et l'absence de cartes adverses dans les reponses.

## 3. Parcours navigateur

```powershell
npx playwright test tests/browser/multiplayer-draft.spec.ts
```

Deux contextes navigateur distincts ouvrent `/multi`, rejoignent le salon, se declarent prets, choisissent chacun une carte et observent le Tour suivant. Rejouer a 360 px et au clavier.

## 4. Coach et export

Terminer une session fixture, demander une recommandation avec LLM desactive, puis avec un faux provider renvoyant successivement : liste valide, carte hallucinee, 39 cartes et justification manquante. Seule la liste valide est acceptee ; les autres utilisent le repli. Modifier la liste, finaliser et importer le texte produit selon [mtga-export.md](contracts/mtga-export.md).

## 5. Reprise et abandon

Redemarrer le serveur entre deux picks. Le token doit restaurer le meme booster, le meme pool et la meme revision. Abandonner ensuite : l'ancienne session refuse tout pick et un nouveau premier entrant peut choisir un cube dans le salon global vide.

## 6. Gate complete

```powershell
npm run check
npm run test:performance
git diff --check
```

Conserver les resultats dans `qa-evidence.md`, avec preuves mobile/desktop et limitations du fournisseur IA eventuelles.
