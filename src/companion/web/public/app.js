// Elements
const modeBadge = document.getElementById("mode-badge");
const providerBadge = document.getElementById("provider-badge");
const contextTitle = document.getElementById("context-title");
const packInfo = document.getElementById("pack-info");
const draftView = document.getElementById("draft-view");
const matchView = document.getElementById("match-view");
const idleView = document.getElementById("idle-view");
const cardsGrid = document.getElementById("cards-grid");
const packCount = document.getElementById("pack-count");
const poolCount = document.getElementById("pool-count");
const poolChips = document.getElementById("pool-chips");
const playerLife = document.getElementById("player-life");
const oppLife = document.getElementById("opp-life");
const matchTurn = document.getElementById("match-turn");
const turnActiveBadge = document.getElementById("turn-active-badge");
const oppName = document.getElementById("opp-name");
const matchEventsList = document.getElementById("match-events-list");
const handCardsGrid = document.getElementById("hand-cards-grid");
const handCount = document.getElementById("hand-count");
const myBoardCount = document.getElementById("my-board-count");
const myBoardChips = document.getElementById("my-board-chips");
const oppBoardCount = document.getElementById("opp-board-count");
const oppBoardChips = document.getElementById("opp-board-chips");
const chatMessages = document.getElementById("chat-messages");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const btnAdvice = document.getElementById("btn-advice");
const btnSummarizeDraft = document.getElementById("btn-summarize-draft");
const btnSummarizeMatch = document.getElementById("btn-summarize-match");
const btnClearChat = document.getElementById("btn-clear-chat");

let currentState = null;
let activeStreamingBubble = null;
let renderedMsgIds = new Set();
let firstRenderedId = null;

// Helper to escape HTML
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Markdown Formatter for chat bubbles
function formatMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^### (.*$)/gim, '<h4 style="margin: 8px 0 4px; color: #e5a93c;">$1</h4>')
    .replace(/^## (.*$)/gim, '<h3 style="margin: 10px 0 4px; color: #58a6ff;">$1</h3>')
    .replace(/^# (.*$)/gim, '<h2 style="margin: 12px 0 6px; color: #e5a93c;">$1</h2>')
    .replace(/^\* (.*$)/gim, '<li style="margin-left: 16px;">$1</li>')
    .replace(/\n/g, "<br/>");
}

// Render Chat Entry
function appendChatMessage(role, content, provider = "") {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.innerHTML = `
    <div class="msg-bubble">${formatMarkdown(content)}</div>
    <div class="msg-meta">${role === "user" ? "Toi" : provider || "Coach IA"} • ${new Date().toLocaleTimeString()}</div>
  `;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div.querySelector(".msg-bubble");
}

function syncChat(chatHistory) {
  if (!chatHistory || activeStreamingBubble) return;
  const firstId = chatHistory[0]?.id;
  if (firstRenderedId && firstId && firstId !== firstRenderedId) {
    chatMessages.innerHTML = "";
    renderedMsgIds.clear();
    firstRenderedId = firstId;
  }
  if (!firstRenderedId && firstId) {
    firstRenderedId = firstId;
  }
  chatHistory.forEach((msg) => {
    if (!renderedMsgIds.has(msg.id)) {
      renderedMsgIds.add(msg.id);
      appendChatMessage(msg.role, msg.content, msg.provider);
    }
  });
}

// Update UI according to current game state
function renderState(state) {
  currentState = state;
  const { mode, draft, match } = state;

  // 1. Mode Badge
  modeBadge.className = "badge";
  if (mode === "draft") {
    modeBadge.classList.add("badge-draft");
    modeBadge.textContent = `● DRAFT (Pack ${draft.pack} Pick ${draft.pick})`;
  } else if (mode === "match") {
    modeBadge.classList.add("badge-match");
    modeBadge.textContent = `● MATCH (Tour ${match.turnNumber})`;
  } else {
    modeBadge.classList.add("badge-idle");
    modeBadge.textContent = "● IDLE (En attente d'Arena)";
  }

  // 2. View Toggle
  draftView.classList.toggle("hidden", mode !== "draft");
  matchView.classList.toggle("hidden", mode !== "match");
  idleView.classList.toggle("hidden", mode !== "idle");

  // 3. Draft Rendering
  if (mode === "draft") {
    contextTitle.textContent = "📦 Session de Draft en Direct";
    packInfo.textContent = `Pack ${draft.pack} | Pick ${draft.pick}`;
    packCount.textContent = draft.packCards.length;
    poolCount.textContent = draft.pool.length;

    // Build map of alternatives
    const advice = draft.advice;
    const topPickName = advice ? advice.topPick.toLowerCase().trim() : "";
    const altMap = new Map();
    if (advice && advice.alternatives) {
      advice.alternatives.forEach((a, idx) => {
        altMap.set(a.name.toLowerCase().trim(), { idx: idx + 1, reason: a.reason });
      });
    }

    // Cards Grid with Badges
    cardsGrid.innerHTML = "";
    draft.packCards.forEach((c) => {
      const cardNameLower = c.name.toLowerCase().trim();
      const isTop = topPickName === cardNameLower;
      const altInfo = altMap.get(cardNameLower);

      let badgeHtml = "";
      let extraClass = "";
      if (isTop) {
        extraClass = "recommended";
        badgeHtml = '<span class="badge-reco top">⭐ Choix 1</span>';
      } else if (altInfo) {
        extraClass = "alternative";
        badgeHtml = `<span class="badge-reco alt">🔄 Option ${altInfo.idx + 1}</span>`;
      }

      const cardEl = document.createElement("div");
      cardEl.className = `card-item ${extraClass}`;
      cardEl.innerHTML = `
        ${badgeHtml}
        <img class="card-image" src="${c.imageUrl}" alt="${escapeHtml(c.name)}" loading="lazy" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'130\' height=\'180\' fill=\'%23222\'><text x=\'50%\' y=\'50%\' fill=\'%23888\' font-size=\'12\' text-anchor=\'middle\'>Image MTG</text></svg>'">
        <div class="card-meta">
          <div class="card-name" title="${escapeHtml(c.name)}">${escapeHtml(c.name)}</div>
          <div class="card-mana">${escapeHtml(c.manaCost || (c.isLand ? "Terrain" : ""))}</div>
        </div>
      `;
      // Click card to ask advice
      cardEl.addEventListener("click", () => {
        chatInput.value = `Que penses-tu de ${c.name} dans ce booster ?`;
        chatForm.dispatchEvent(new Event("submit"));
      });
      cardsGrid.appendChild(cardEl);
    });

    // Pool Chips
    poolChips.innerHTML = "";
    draft.pool.forEach((c) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = c.name;
      poolChips.appendChild(chip);
    });
  }

  // 4. Match Rendering
  if (mode === "match") {
    const gameTurn = match.gameTurn || Math.ceil((match.turnNumber || 1) / 2);
    const isMyTurn = match.isMyTurn ?? match.activePlayer === match.playerSeat;
    contextTitle.textContent = "⚔️ Match en Cours";
    packInfo.textContent = `Tour ${gameTurn} (${isMyTurn ? "Ton tour" : "Tour adverse"} • ${match.phase || "Main1"})`;
    playerLife.textContent = match.playerLife;
    oppLife.textContent = match.opponentLife;
    matchTurn.textContent = gameTurn;
    oppName.textContent = match.opponentName;

    if (turnActiveBadge) {
      turnActiveBadge.textContent = isMyTurn ? "Ton tour" : "Tour adverse";
      turnActiveBadge.className = `turn-active-badge ${isMyTurn ? "you" : "opp"}`;
    }

    // Hand Cards Grid
    const hand = match.playerHand || [];
    handCount.textContent = hand.length;
    handCardsGrid.innerHTML = "";
    if (hand.length === 0) {
      handCardsGrid.innerHTML =
        '<div style="color: #8b949e; font-size: 12px; grid-column: 1 / -1; padding: 10px;">Aucune carte en main détectée</div>';
    } else {
      hand.forEach((c) => {
        const cardEl = document.createElement("div");
        cardEl.className = "card-item";
        cardEl.innerHTML = `
          <img class="card-image" src="${c.imageUrl}" alt="${escapeHtml(c.name)}" loading="lazy" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'130\' height=\'180\' fill=\'%23222\'><text x=\'50%\' y=\'50%\' fill=\'%23888\' font-size=\'12\' text-anchor=\'middle\'>Image MTG</text></svg>'">
          <div class="card-meta">
            <div class="card-name" title="${escapeHtml(c.name)}">${escapeHtml(c.name)}</div>
            <div class="card-mana">${escapeHtml(c.manaCost || (c.isLand ? "Terrain" : ""))}</div>
          </div>
        `;
        cardEl.addEventListener("click", () => {
          chatInput.value = `Devrais-je jouer ${c.name} à ce tour ?`;
          chatForm.dispatchEvent(new Event("submit"));
        });
        handCardsGrid.appendChild(cardEl);
      });
    }

    // Player Battlefield Chips
    const myBoard = match.playerBattlefield || [];
    if (myBoardCount) myBoardCount.textContent = myBoard.length;
    if (myBoardChips) {
      myBoardChips.innerHTML = "";
      if (myBoard.length === 0) {
        myBoardChips.innerHTML =
          '<span style="color: #8b949e; font-size: 11px;">Aucun permanent sur ton champ de bataille</span>';
      } else {
        myBoard.forEach((c) => {
          const chip = document.createElement("span");
          chip.className = "chip";
          chip.textContent = `${c.name} (${c.manaCost || "Terrain"})`;
          myBoardChips.appendChild(chip);
        });
      }
    }

    // Opponent Battlefield Chips
    const oppBoard = match.opponentBattlefield || [];
    if (oppBoardCount) oppBoardCount.textContent = oppBoard.length;
    if (oppBoardChips) {
      oppBoardChips.innerHTML = "";
      if (oppBoard.length === 0) {
        oppBoardChips.innerHTML =
          '<span style="color: #8b949e; font-size: 11px;">Aucun permanent adverse</span>';
      } else {
        oppBoard.forEach((c) => {
          const chip = document.createElement("span");
          chip.className = "chip";
          chip.style.borderColor = "rgba(248, 81, 73, 0.4)";
          chip.textContent = `${c.name} (${c.manaCost || "Terrain"})`;
          oppBoardChips.appendChild(chip);
        });
      }
    }

    matchEventsList.innerHTML = "";
    const events = match.recentEvents.slice(-6);
    if (events.length === 0) {
      events.push("Partie en cours...");
    }
    events.forEach((ev) => {
      const li = document.createElement("li");
      li.textContent = ev;
      matchEventsList.appendChild(li);
    });
  }

  // 5. Idle Rendering
  if (mode === "idle") {
    contextTitle.textContent = "⚡ En Attente d'Arena";
    packInfo.textContent = "Prêt";
    const last = state.lastCompletedMatch;
    if (last && last.opponentName) {
      const lastTurn = last.gameTurn || Math.ceil((last.turnNumber || 1) / 2);
      idleView.innerHTML = `
        <div class="idle-card">
          <div class="idle-icon">⚔️</div>
          <h3>Dernière partie terminée contre <strong>${escapeHtml(last.opponentName)}</strong></h3>
          <p>Résultat : <strong>${escapeHtml(last.winner || "Terminée")}</strong> • Tour ${lastTurn} • PV : Toi ${last.playerLife} / Adv ${last.opponentLife}</p>
          <div style="margin-top: 14px; text-align: left; background: rgba(0,0,0,0.25); padding: 12px; border-radius: 8px;">
            <div style="font-size: 11px; text-transform: uppercase; color: #8b949e; margin-bottom: 6px;">Dernière main (${(last.playerHand || []).length} cartes) :</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${(last.playerHand || []).map((c) => `<span class="chip" style="cursor:pointer;" onclick="document.getElementById('chat-input').value='Que penses-tu de ${escapeHtml(c.name)} dans ma dernière partie ?';document.getElementById('chat-form').dispatchEvent(new Event('submit'))">${escapeHtml(c.name)} (${escapeHtml(c.manaCost || "Land")})</span>`).join("")}
            </div>
          </div>
          <p style="margin-top: 14px; font-size: 13px; color: #58a6ff;">🚀 Lance un nouveau Match ou un Draft sur Arena : l'affichage passera automatiquement en direct !</p>
        </div>
      `;
    } else {
      idleView.innerHTML = `
        <div class="idle-card">
          <div class="idle-icon">🎴</div>
          <h3>Prêt pour MTG Arena</h3>
          <p>Lance un Draft ou démarre un Match sur Arena. Le Companion détecte automatiquement l'activité via <code>Player.log</code> et t'accompagnera en direct !</p>
        </div>
      `;
    }
  }
}

// Initial Fetch
async function init() {
  try {
    const res = await fetch("/api/state");
    const state = await res.json();
    renderState(state);

    chatMessages.innerHTML = "";
    renderedMsgIds.clear();
    syncChat(state.chatHistory);
  } catch (err) {
    console.error("Failed to load initial state:", err);
  }

  // Connect SSE for real-time live events
  const sse = new EventSource("/api/events");

  sse.addEventListener("state_update", (e) => {
    try {
      const state = JSON.parse(e.data);
      renderState(state);
      syncChat(state.chatHistory);
    } catch (err) {
      console.error("SSE state_update parse error:", err);
    }
  });

  sse.addEventListener("chat_reset", () => {
    chatMessages.innerHTML = "";
    renderedMsgIds.clear();
    firstRenderedId = null;
  });

  sse.addEventListener("chat_stream_start", (e) => {
    const { provider } = JSON.parse(e.data);
    activeStreamingBubble = appendChatMessage("assistant", "", provider);
  });

  sse.addEventListener("chat_stream_chunk", (e) => {
    if (activeStreamingBubble) {
      const { chunk } = JSON.parse(e.data);
      activeStreamingBubble.innerHTML += formatMarkdown(chunk);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  });

  sse.addEventListener("chat_stream_end", () => {
    activeStreamingBubble = null;
  });
}

// Chat Form Submit
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = chatInput.value.trim();
  if (!query) return;

  appendChatMessage("user", query);
  chatInput.value = "";

  try {
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: query }),
    });
  } catch (err) {
    appendChatMessage("assistant", `Erreur de communication : ${err.message}`, "Système");
  }
});

// Quick Action Buttons
btnAdvice.addEventListener("click", async () => {
  await fetch("/api/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "advice" }),
  });
});

btnSummarizeDraft.addEventListener("click", async () => {
  await fetch("/api/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "summary" }),
  });
});

btnSummarizeMatch.addEventListener("click", async () => {
  await fetch("/api/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "summary" }),
  });
});

btnClearChat.addEventListener("click", async () => {
  chatMessages.innerHTML = "";
  renderedMsgIds.clear();
  firstRenderedId = null;
  await fetch("/api/clear-chat", { method: "POST" });
  appendChatMessage("assistant", "Historique de chat effacé. Prêt pour la suite !", "Système");
});

// Start app
init();
