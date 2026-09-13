# Research: Draft multijoueur amical et Coach de deck

## Decision 1 - Polling HTTP revisionne pour le MVP

**Decision**: interroger l'etat toutes les secondes et apres chaque commande, avec revision/ETag et vues redigees par participant.

**Rationale**: les Tours n'ont pas de chronometre et le besoin p95 est de deux secondes. Le serveur Node natif et le client sans framework savent deja gerer HTTP ; le polling evite WebSocket, sessions collantes et reconnexion temps reel dans le premier increment.

**Alternatives considered**: WebSocket direct, Supabase Realtime et Server-Sent Events. Ces options restent possibles derriere la meme interface d'etat si le polling devient couteux, mais n'apportent pas de valeur fonctionnelle au MVP a huit joueurs.

## Decision 2 - Coordinateur au-dessus du moteur de draft existant

**Decision**: accumuler un choix prive par humain pour le Tour courant, produire les decisions des bots, puis appeler une seule fois `submitPickRound` avec les huit decisions.

**Rationale**: le moteur existant possede deja les invariants de conservation, rotation gauche/droite/gauche, revision et Journal de draft. Le coordinateur ajoute l'attente multi sans dupliquer ces regles.

**Alternatives considered**: modifier le moteur pour accepter un pick individuel, ou maintenir un moteur separe. Les deux disperseraient les invariants et fragiliseraient relecture et non-regression seed 42.

## Decision 3 - PostgreSQL transactionnel en production, fichier atomique en local

**Decision**: utiliser une fonction PostgreSQL/Supabase pour serialiser chaque commande par revision et `requestId`, avec evenements append-only et instantane courant dans la meme transaction. Utiliser un adapter fichier atomique uniquement en local/CI.

**Rationale**: le salon global et le dernier clic Pret sont des courses concurrentes. Un `Map` processus ou un JSON read-modify-write ne peut garantir ni unicite ni reprise apres redeploiement. Le fichier local preserve le workflow hors ligne sans etre annonce comme stockage de production.

**Alternatives considered**: `activeSessions` seul, JSON partage sur Railway, volume attache au service. Rejetes pour absence de transaction inter-requetes ou incompatibilite avec une evolution a plusieurs replicas.

## Decision 4 - Acces de reprise opaque et hache

**Decision**: generer 32 octets aleatoires, remettre le jeton brut une fois au client et ne stocker que son SHA-256. Le navigateur le conserve localement, l'envoie dans l'en-tete Authorization et permet de copier ce code prive pour un autre appareil ; il n'est place dans aucune URL.

**Rationale**: le pseudo est public et non authentifiant. Le jeton protege booster/pool sans imposer de compte, tandis que le code copie evite les fuites par chemins, query strings, journaux et referers.

**Alternatives considered**: pseudo seul, cookie lie a un appareil, compte DraftMaster. Rejetes respectivement pour usurpation, absence de transfert et complexite hors perimetre.

## Decision 5 - Reutiliser `LlmRouter` avec sortie structuree validee

**Decision**: etendre le routeur existant et ajouter un prompt de deck final versionne. Gemini est tente en premier, DeepSeek en repli si configure, puis le recommandateur local. La reponse externe doit correspondre au schema du Coach et passe toujours par le validateur local.

**Rationale**: Gemini `generateContent` accepte une sortie JSON structuree avec schema ; DeepSeek accepte JSON Output et demande d'ordonner explicitement une reponse JSON dans le prompt. Les deux peuvent echouer, etre tronques ou renvoyer un contenu vide, donc la validation et le repli sont obligatoires. Sources officielles : [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output?lang=rest), [Gemini generateContent](https://ai.google.dev/api/generate-content), [DeepSeek Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion/), [DeepSeek JSON Output](https://api-docs.deepseek.com/guides/json_mode/).

**Alternatives considered**: faire confiance au texte Markdown de `buildDraftSummaryPrompt`, appeler un fournisseur depuis le navigateur, ou supprimer le repli local. Rejetes pour sortie non verifiable, exposition des secrets et blocage du deckbuilding.

## Decision 6 - Deck flexible, comparaison expert et non auto-evaluation seule

**Decision**: explorer plusieurs comptes de terrains autour de 16-18, compter les non-basiques et sources conditionnelles, puis evaluer chaque liste complete. Les regressions comparent aussi les propositions a des pools/decks temoins revus par un humain.

**Rationale**: le code actuel force 23 sorts et 17 terrains, puis trie les options par le meme score qu'il contribue a optimiser. Une amelioration ne peut donc pas etre prouvee uniquement par une hausse de `overallScore` ; les erreurs de couleurs, paquets incomplets et mana doivent etre jugees sur des fixtures independantes.

**Alternatives considered**: conserver 23/17, laisser le LLM decider sans garde-fou, ou valider uniquement par score global. Rejetes par la clarification produit et le besoin d'explicabilite.

## Decision 7 - Seams TDD

**Decision**: tester par les interfaces publiques du coordinateur, du handler HTTP redige et du constructeur/exporteur final. Utiliser les vrais modules internes et ne simuler que l'horloge, l'aleatoire cryptographique, le stockage et le fournisseur LLM.

**Rationale**: ces seams couvrent les comportements observes par les appelants tout en laissant l'implementation evoluer. Elles concentrent les courses, secrets et validations a trois endroits.

**Alternatives considered**: tester les reducers/privees ou moquer le moteur de draft. Rejetes car ces tests seraient couples a l'implementation et pourraient passer malgre une integration brisee.
