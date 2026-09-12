import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CardResolver } from "./card-resolver.ts";
import { LlmRouter } from "./llm-router.ts";
import { CompanionState, type MatchState } from "./companion-state.ts";
import { LogWatcher } from "./log-watcher.ts";
import {
  buildDraftAdvicePrompt,
  buildDraftSummaryPrompt,
  buildMatchAdvicePrompt,
  buildTurnCommentaryPrompt,
} from "./coach-prompts.ts";
import { getUnifiedDraftAdvice } from "../domain/coaching/draft-coach-service.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.COMPANION_PORT ?? "3333", 10);
const PUBLIC_DIR = path.join(__dirname, "web", "public");
const HISTORY_FILE = path.resolve(process.cwd(), "data", "match-history.json");

// 1. Initialize Subsystems
const resolver = new CardResolver();
const llm = new LlmRouter();
const state = new CompanionState();

// Commentary tracking guards
const commentedGameTurns = new Set<number>();
let openingHandCommented = false;

// SSE Clients List
const sseClients = new Set<http.ServerResponse>();

function broadcastEvent(eventName: string, data: unknown) {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

function broadcastState() {
  broadcastEvent("state_update", state.getSnapshot());
}

function resetChatForNewGame(initialMessage: string) {
  state.chatHistory = [];
  broadcastEvent("chat_reset", {});
  state.addChatMessage("assistant", initialMessage, "Coach IA");
  broadcastState();
}

function formatHandList(hand: readonly ReturnType<typeof resolver.resolve>[]): string {
  if (hand.length === 0) return "Aucune carte en main";
  return hand.map((c) => `- ${c.name} (${c.manaCost || "Terrain"}, CMC: ${c.cmc})`).join("\n");
}

export function saveMatchRecord(match: MatchState, aiDebrief?: string) {
  if (!match.matchId) return;
  try {
    let history: any[] = [];
    if (fs.existsSync(HISTORY_FILE)) {
      try {
        history = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
      } catch {}
    }

    const record = {
      matchId: match.matchId,
      eventId: match.eventId || "Historic BO1",
      date: new Date().toISOString(),
      opponentName: match.opponentName,
      winner: match.winner ?? "Inconnu",
      playerLife: match.playerLife,
      opponentLife: match.opponentLife,
      turns: match.gameTurn || Math.ceil((match.turnNumber || 1) / 2),
      cardsInHandAtEnd: match.playerHand.map((c) => c.name),
      recentEvents: match.recentEvents,
      aiSummary: aiDebrief ?? match.matchSummary ?? null,
    };

    const existingIdx = history.findIndex((h) => h.matchId === match.matchId);
    if (existingIdx >= 0) {
      history[existingIdx] = record;
    } else {
      history.unshift(record);
    }

    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), "utf8");
    console.log(
      `[Companion] Match sauvegardé dans data/match-history.json (Total: ${history.length} parties).`,
    );
  } catch (err: any) {
    console.error("[Companion] Erreur sauvegarde match history:", err.message);
  }
}

// 2. Initialize LogWatcher
const watcher = new LogWatcher(undefined, {
  onSceneChange: (_from, to) => {
    state.currentScene = to;
    if (to.includes("Draft")) {
      state.mode = "draft";
    } else if (to.includes("Match") && !to.includes("MatchEnd")) {
      state.mode = "match";
    } else if (to.includes("Home") || to.includes("EventLanding") || to.includes("MatchEnd")) {
      if (state.mode === "match") {
        state.lastCompletedMatch = { ...state.match };
        saveMatchRecord({ ...state.match });
        state.mode = "idle";
      }
    }
    broadcastState();
  },

  onDraftPack: async (pack, pick, cardIds) => {
    state.mode = "draft";
    state.draft.pack = pack;
    state.draft.pick = pick;
    state.draft.packCards = resolver.resolveMultiple(cardIds);

    // Reset chat at the start of a new draft (P1P1)
    if (pack === 1 && pick === 1) {
      resetChatForNewGame(
        "📦 **Nouveau Draft commencé !**\n\nJe vais analyser chaque booster et te conseiller le meilleur choix ainsi que les alternatives valides.",
      );
    }

    broadcastState();

    // Auto-ask Unified AI Coach for draft advice (Primary + Secondary Choices)
    try {
      const advice = await getUnifiedDraftAdvice({
        packCards: state.draft.packCards,
        priorPool: state.draft.pool,
        packNumber: pack,
        pickNumber: pick,
        llmRouter: llm,
      });

      const alts = advice.alternatives.map((a) => ({ name: a.name, reason: a.reason }));
      state.draft.advice = {
        topPick: advice.topPickName,
        reason: advice.reason,
        alternatives: alts,
        provider: advice.provider,
      };

      let coachMsg = `💡 **Pack ${pack} Pick ${pick}**\n\n⭐ **Recommandation Principale** : **${advice.topPickName}**\n*${advice.reason}*`;
      if (alts.length > 0) {
        coachMsg +=
          `\n\n🔄 **Choix Secondaires Valides** :\n` +
          alts.map((a) => `- **${a.name}** : ${a.reason}`).join("\n");
      }

      if (advice.packReview) {
        let reviewMsg = `📊 **Bilan Début de Pack ${pack} — ${advice.packReview.archetypeLabel}**\n\n`;
        reviewMsg += `${advice.packReview.poolSummary}\n\n`;
        reviewMsg += `📉 **Courbe de Mana** : ${advice.packReview.curveAnalysis}\n`;
        reviewMsg += `⚡ **Fixeurs de Mana** : ${advice.packReview.fixingAnalysis}\n\n`;
        reviewMsg += `🎯 **Priorités pour ce Pack** :\n`;
        for (const p of advice.packReview.priorities) {
          reviewMsg += `- ${p}\n`;
        }
        reviewMsg += `\n💡 *${advice.packReview.signalTip}*`;
        state.addChatMessage("assistant", reviewMsg, advice.provider);
      }

      state.addChatMessage("assistant", coachMsg, advice.provider);
      broadcastState();
    } catch (err: any) {
      console.error("[Companion] Auto-coach draft error:", err.message);
    }
  },

  onDraftPick: (grpId) => {
    const pickedCard = resolver.resolve(grpId);
    state.draft.lastPick = pickedCard;
    state.draft.pool.push(pickedCard);
    broadcastState();
  },

  onMatchStart: (matchId, opp, playerSeat, eventId) => {
    state.mode = "match";
    state.resetMatch();
    state.match.matchId = matchId;
    state.match.eventId = eventId;
    state.match.opponentName = opp;
    state.match.playerSeat = playerSeat;
    state.match.recentEvents.push(`Début du match (${eventId}) contre ${opp}`);

    commentedGameTurns.clear();
    openingHandCommented = false;
    resetChatForNewGame(
      `⚔️ **Nouveau match commencé contre ${opp} (${eventId}) !**\n\nJ'observe tes cartes, le champ de bataille et je vais commenter tes tours en direct. Bonne chance !`,
    );
  },

  onCardPlayed: (seatId, grpId, isLand) => {
    const card = resolver.resolve(grpId);
    const isPlayer = seatId === state.match.playerSeat;
    if (isPlayer) {
      state.match.playerRecentPlays.push(card.name);
      state.match.recentEvents.push(`Tu as joué ${card.name}`);
    } else {
      state.match.opponentRecentPlays.push(card.name);
      state.match.recentEvents.push(`${state.match.opponentName} a joué ${card.name}`);
      // Live alert if opponent casts a non-land spell
      if (!isLand && state.mode === "match") {
        state.addChatMessage(
          "assistant",
          `⚡ **${state.match.opponentName} a joué** : **${card.name}** (${card.manaCost || "Sort"})`,
          "Live Observer",
        );
      }
    }
    broadcastState();
  },

  onBattlefieldUpdate: (playerGrpIds, oppGrpIds) => {
    state.match.playerBattlefield = resolver.resolveMultiple(playerGrpIds);
    state.match.opponentBattlefield = resolver.resolveMultiple(oppGrpIds);
    broadcastState();
  },

  onMatchTurn: (turn, phase, activePlayer) => {
    const gameTurn = Math.ceil(turn / 2);
    const isMyTurn = activePlayer === state.match.playerSeat;
    state.match.turnNumber = turn;
    state.match.gameTurn = gameTurn;
    state.match.isMyTurn = isMyTurn;
    state.match.phase = phase;
    state.match.activePlayer = activePlayer;
    broadcastState();

    // Proactive Match Commentary: Player's Turn Start (once per human MTG game turn)
    if (
      state.mode === "match" &&
      isMyTurn &&
      !commentedGameTurns.has(gameTurn) &&
      state.match.playerHand.length > 0
    ) {
      commentedGameTurns.add(gameTurn);
      const { system, user } = buildTurnCommentaryPrompt(state.match);

      void (async () => {
        try {
          const res = await llm.generateText(system, user);
          if (res.success && res.content) {
            state.addChatMessage(
              "assistant",
              `🎯 **Tour ${gameTurn}** : ${res.content}`,
              res.provider,
            );
            // Clear recent opponent plays now that they've been incorporated into this turn's commentary
            state.match.opponentRecentPlays = [];
            broadcastState();
          }
        } catch (err: any) {
          console.error("[Companion] Turn commentary error:", err.message);
        }
      })();
    }
  },

  onLifeChange: (playerLife, oppLife) => {
    state.match.playerLife = playerLife;
    state.match.opponentLife = oppLife;
    broadcastState();
  },

  onHandUpdate: (handGrpIds) => {
    state.match.playerHand = resolver.resolveMultiple(handGrpIds);
    broadcastState();

    // Proactive Match Commentary: Opening Hand Analysis
    if (state.mode === "match" && !openingHandCommented && state.match.playerHand.length >= 7) {
      openingHandCommented = true;
      const opp = state.match.opponentName;
      const handText = formatHandList(state.match.playerHand);

      const system = `Tu es un coach Pro Tour MTG assistant le joueur lors de la phase de mulligan.
Règles strictes :
- Réponds en 2 phrases concises.
- 1. Évalue la main de départ (Keep ou Mulligan).
- 2. Donne la stratégie d'ouverture pour les tours 1 et 2.`;

      const user = `Match contre ${opp}.
Voici ma main de départ de 7 cartes :
${handText}

Donne ton évaluation d'ouverture.`;

      void (async () => {
        try {
          const res = await llm.generateText(system, user);
          if (res.success && res.content) {
            state.addChatMessage(
              "assistant",
              `🃏 **Analyse de la main de départ** :\n${res.content}`,
              res.provider,
            );
            broadcastState();
          }
        } catch (err: any) {
          console.error("[Companion] Opening hand commentary error:", err.message);
        }
      })();
    }
  },

  onMatchEnd: (winningTeam, reason) => {
    const isWin = winningTeam === state.match.playerSeat;
    state.match.winner = isWin ? "Victoire" : "Défaite";
    state.match.recentEvents.push(`Fin de partie : ${state.match.winner} (${reason})`);
    state.lastCompletedMatch = { ...state.match };

    const opp = state.match.opponentName;
    const result = state.match.winner;
    const pLife = state.match.playerLife;
    const oLife = state.match.opponentLife;
    const finalTurn = state.match.gameTurn || Math.ceil((state.match.turnNumber || 1) / 2);

    // Immediately save match result to disk
    saveMatchRecord({ ...state.match });

    void (async () => {
      try {
        const system = "Tu es un coach MTG analysant une fin de partie.";
        const user = `Le match contre ${opp} vient de se terminer sur une ${result} au Tour ${finalTurn} (${pLife} à ${oLife} PV). Fais un court commentaire de conclusion encourageant et tactique en 2 phrases.`;
        const res = await llm.generateText(system, user);
        const commentary = res.success && res.content ? `\n\n*${res.content}*` : "";
        state.addChatMessage(
          "assistant",
          `🏁 **Fin de partie : ${result} au Tour ${finalTurn}** (${pLife} à ${oLife} PV).${commentary}`,
          res.provider,
        );
        if (res.success && res.content) {
          saveMatchRecord({ ...state.match }, res.content);
        }
        broadcastState();
      } catch {
        state.addChatMessage(
          "assistant",
          `🏁 Match terminé ! Résultat : **${result} au Tour ${finalTurn}** (${pLife} à ${oLife} PV).`,
          "Système",
        );
        broadcastState();
      }
    })();

    state.mode = "idle";
    broadcastState();
  },
});

watcher.start();

// 3. HTTP Server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // SSE Stream
  if (pathname === "/api/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    res.write("retry: 2000\n\n");
    sseClients.add(res);
    req.on("close", () => {
      sseClients.delete(res);
    });
    return;
  }

  // Get State
  if (pathname === "/api/state" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(state.getSnapshot()));
    return;
  }

  // Get Match History API
  if (pathname === "/api/history" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    if (fs.existsSync(HISTORY_FILE)) {
      try {
        const historyData = fs.readFileSync(HISTORY_FILE, "utf8");
        return res.end(historyData);
      } catch {}
    }
    return res.end(JSON.stringify([]));
  }

  // Clear Chat API
  if (pathname === "/api/clear-chat" && req.method === "POST") {
    state.chatHistory = [];
    broadcastEvent("chat_reset", {});
    broadcastState();
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true }));
  }

  // Chat API (with streaming)
  if (pathname === "/api/chat" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => {
      body += c;
    });
    req.on("end", async () => {
      try {
        const { message } = JSON.parse(body || "{}");
        if (!message) {
          res.writeHead(400);
          return res.end("Missing message");
        }

        state.addChatMessage("user", message);
        broadcastState();

        let system = `Tu es un Coach de haut niveau Magic: The Gathering (Format Cube et Construit).
Tu analyses en direct la partie du joueur et réponds de façon concise, tactique et encourageante.`;

        let userPrompt = message;

        if (state.mode === "match" || (state.mode === "idle" && state.lastCompletedMatch)) {
          const activeMatch =
            state.mode === "match" ? state.match : (state.lastCompletedMatch ?? state.match);
          const promptData = buildMatchAdvicePrompt(activeMatch, message);
          system = promptData.system;
          userPrompt = promptData.user;
        } else if (state.mode === "draft") {
          system += `\nÉtat actuel : DRAFT en cours (Pack ${state.draft.pack} Pick ${state.draft.pick}). Pool actuel (${state.draft.pool.length} cartes) : ${state.draft.pool.map((c) => c.name).join(", ")}`;
          if (state.draft.packCards.length > 0) {
            system += `\nCartes dans le pack actuel : ${state.draft.packCards.map((c) => c.name).join(", ")}`;
          }
        } else {
          system += `\nÉtat actuel : Magic Arena est actuellement hors match ou entre deux parties.`;
        }

        const messages = [
          { role: "system" as const, content: system },
          ...state.chatHistory.slice(-6).map((m) => ({ role: m.role, content: m.content })),
          { role: "user" as const, content: userPrompt },
        ];

        broadcastEvent("chat_stream_start", { provider: "Gemini Flash" });

        const { success, fullText, provider } = await llm.streamChat(messages, (token) => {
          broadcastEvent("chat_stream_chunk", { chunk: token });
        });

        broadcastEvent("chat_stream_end", {});

        if (success && fullText) {
          state.addChatMessage("assistant", fullText, provider);
        } else {
          const staticRes = await llm.generateText(system, userPrompt);
          if (staticRes.success && staticRes.content) {
            state.addChatMessage("assistant", staticRes.content, staticRes.provider);
          }
        }

        broadcastState();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (err: any) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Action API (Buttons)
  if (pathname === "/api/action" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => {
      body += c;
    });
    req.on("end", async () => {
      try {
        const { action } = JSON.parse(body || "{}");

        if (action === "advice") {
          if (state.mode === "draft" && state.draft.packCards.length > 0) {
            const { system, user } = buildDraftAdvicePrompt(
              state.draft.packCards,
              state.draft.pool,
              state.draft.pack,
              state.draft.pick,
            );
            const res = await llm.generateJson<{
              topPick: string;
              reason: string;
              alternatives?: { name: string; reason: string }[];
            }>(system, user);

            if (res.success && res.content) {
              const alts = res.content.alternatives ?? [];
              let msg = `💡 Conseil : Choisis **${res.content.topPick}**.\n\n*${res.content.reason}*`;
              if (alts.length > 0) {
                msg +=
                  `\n\n🔄 **Alternatives** :\n` +
                  alts.map((a) => `- **${a.name}** : ${a.reason}`).join("\n");
              }
              state.addChatMessage("assistant", msg, res.provider);
            }
          } else if (state.mode === "match") {
            const { system, user } = buildMatchAdvicePrompt(
              state.match,
              "Quelle est la meilleure ligne de jeu à ce tour ?",
            );
            const res = await llm.generateText(system, user);
            if (res.success && res.content) {
              state.addChatMessage("assistant", res.content, res.provider);
            }
          }
        } else if (action === "summary") {
          if (state.draft.pool.length > 0) {
            const { system, user } = buildDraftSummaryPrompt(state.draft.pool);
            const res = await llm.generateText(system, user);
            if (res.success && res.content) {
              state.addChatMessage("assistant", res.content, res.provider);
            }
          } else if (state.match.matchId || state.lastCompletedMatch) {
            const m =
              state.mode === "match" ? state.match : (state.lastCompletedMatch ?? state.match);
            const summaryPrompt = `Fais un débriefing tactique de cette partie contre ${m.opponentName}. Résultat : ${m.winner || "Inconnu"}. PV final : ${m.playerLife} à ${m.opponentLife}. Événements : ${m.recentEvents.join(", ")}.`;
            const res = await llm.generateText(
              "Tu es un coach MTG analysant une partie terminée.",
              summaryPrompt,
            );
            if (res.success && res.content) {
              state.addChatMessage("assistant", res.content, res.provider);
              saveMatchRecord({ ...m }, res.content);
            }
          }
        }

        broadcastState();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (err: any) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Static File Serving
  const filePath = path.join(PUBLIC_DIR, pathname === "/" ? "index.html" : pathname);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const mimeTypes: Record<string, string> = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css",
      ".js": "application/javascript",
      ".json": "application/json",
      ".png": "image/png",
      ".svg": "image/svg+xml",
    };
    res.writeHead(200, { "Content-Type": mimeTypes[ext] ?? "text/plain" });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log("=======================================================");
  console.log("⚡ DraftMaster Companion démarré avec succès !");
  console.log(`🌐 Accède à l'interface de chat sur : http://localhost:${PORT}`);
  console.log("📡 Log MTGA surveillé en direct.");
  console.log("🤖 IA : Gemini Flash (Priorité Gratuite) + DeepSeek V3 (Secours).");
  console.log("💾 Historique des Matchs enregistré dans data/match-history.json.");
  console.log("=======================================================");
});
