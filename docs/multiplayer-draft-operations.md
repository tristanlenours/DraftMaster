# Exploitation du Draft multijoueur

## Contrat d'execution

Le serveur expose un Salon global unique sous `/api/multiplayer`. Un seul groupe peut etre en phase de draft ; le Salon redevient disponible des la fin du 45e choix, tandis que les anciens ateliers de deck restent accessibles par leur Acces de reprise.

Chaque mutation exige :

- `Authorization: Bearer <resumeToken>` sauf pour rejoindre le Salon ;
- `Idempotency-Key` pour identifier la commande ;
- `expectedRevision` pour refuser une ecriture sur un etat stale.

Le token est prive, stocke localement dans le navigateur et persiste uniquement sous forme de SHA-256 dans l'etat durable. Il ne doit jamais apparaitre dans une URL, un log ou une reponse publique. `MULTIPLAYER_RESUME_SECRET` doit etre une valeur aleatoire stable et secrete en production ; si elle change, les tokens derives ne sont plus reproductibles pour les nouvelles commandes de jointure.

## Stockage et reconstruction

Le runtime web actuel utilise par defaut `data/multiplayer-draft/global.json`. L'adapter ecrit un fichier temporaire en mode `0600`, puis le renomme atomiquement. Le journal d'evenements et les Sessions permettent de reconstruire Salon, Tour, choix, pools et ateliers apres redemarrage sur une instance unique avec disque persistant.

Pour une production multi-instance, appliquer la section multijoueur de `supabase/schema.sql` et brancher `createSupabaseMultiplayerDraftStore` sur un gateway service-role qui appelle `commit_multiplayer_lobby`. Les tables sont protegees par RLS et leurs droits `anon`/`authenticated` sont revoques ; seul le backend service-role doit pouvoir executer la transaction.

Le schema prepare :

- `multiplayer_lobbies` pour l'autorite revisionnee du Salon ;
- `multiplayer_sessions` et `multiplayer_events` pour les faits de draft ;
- `multiplayer_command_receipts` pour la deduplication transactionnelle ;
- `multiplayer_resume_access` pour les hashes de tokens ;
- `multiplayer_deck_workspaces` pour les listes individuelles.

Le gateway Supabase n'est pas encore monte par `scripts/serve-web.mjs`. Tant que ce raccordement et sa recette distante ne sont pas faits, le deploiement doit rester mono-instance avec volume durable. Aucune politique de purge automatique n'est livree : conserver les Sessions au moins 24 heures, puis definir explicitement la retention avant production.

## Reprise, absence et abandon

Le pseudo n'autorise jamais une reprise. Le joueur colle son Acces de reprise sur un nouvel appareil, ou le navigateur reutilise sa copie locale. Un humain absent n'est ni remplace par un bot ni choisi automatiquement et aucun timeout ne confirme sa carte.

La presence reseau n'est actuellement pas detectee. Les joueurs se coordonnent sur Discord. Si l'un d'eux ne revient pas, un participant confirme l'abandon du draft pour tout le groupe ; l'ancienne Session devient terminale et un Salon neuf est ouvert sans reutiliser ses cartes.

Sauvegarder le fichier durable avant toute maintenance. Ne pas modifier manuellement sa revision ni son journal.

## Coach final Gemini/DeepSeek

Le profil `final-deck-coach@1` envoie uniquement le Snapshot et les metadonnees des 45 cartes du joueur. Pseudo, token, identite de Session et cartes adverses sont exclus. Le routeur essaie Gemini, puis DeepSeek via OpenRouter ; les cles reconnues sont `GEMINI_API_KEY`, `OPENROUTER_PREMIUM_API_KEY` et `OPENROUTER_API_KEY`.

Les delais du profil final sont de 8 secondes pour Gemini et 12 secondes pour DeepSeek, avec 2 400 tokens maximum. Sans cle, sur timeout ou sur JSON invalide, le recommandateur local deterministe prend le relais.

Toute proposition externe est revalidee localement : 40 cartes exactes, IDs et multiplicites du pool, basiques non negatifs, raisons coherentes et evaluation cinq axes. Le modele ne decide ni de la legalite ni du Score final.

Dans le Solo, le clic d'assistance est annonce et retire irreversiblement l'Homologation avant l'appel externe. Le Multi n'est jamais homologue. Les politiques de picks et de bots n'utilisent pas ce profil.

## Export Arena

L'export `/api/multiplayer/deck/export.mtga` est disponible uniquement apres finalisation. Il produit `Deck` avec 40 cartes et `Sideboard` avec toutes les cartes draftees non retenues. La compatibilite est resolue depuis les metadonnees locales CubeCobra et le catalogue lie au Snapshot.

Une carte absente, non disponible ou ambigue bloque la presentation comme liste importable et renvoie son detail. La validation automate ne remplace pas la recette manuelle dans la version courante de Magic Arena.

## Controle avant deploiement

```powershell
npm run check
npm run test:mobile
npm run test:performance
npm run test:reference
npm run test:replay
npm run test:audit
npm run test:domain-errors
npm run test:e2e
git diff --check
```

Verifier ensuite sur l'environnement cible : redemarrage avec volume durable, deux navigateurs reels, conservation des tokens, import Arena, logs sans secret, cles LLM absentes puis configurees, et abandon d'une Session interrompue.
