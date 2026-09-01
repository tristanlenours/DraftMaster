// Moteur de Draft 100% Autonome avec Session Unique, Lobby & Timer Officiel MTR
class DraftEngine {
  constructor() {
    this.totalSeats = 8;
    this.humanPlayersCount = 1; // Strictement 1 Humain + 7 Bots IA
    this.packsPerPlayer = 3;
    this.cardsPerPack = 15;
    this.currentPackNum = 1;
    this.currentPickNum = 1;
    this.currentCubeId = "peasant_360";
    this.currentCubeName = "Digital Peasant+ 360";
    this.humanPicks = [];
    this.allSeatPicks = [];
    this.activePacks = [];
    this.allPacks = [];
    this.filterColor = "ALL";
    this.startTime = null;
    this.timerInterval = null;
    this.draftDurationSec = 0;
    this.state = "lobby"; // "lobby" | "drafting"
    this.userName = localStorage.getItem("mtg_user_name") || "titou";
    this.sessionId = this.getOrGenerateSessionId();
    this.selectedCardIndex = null;

    // Timer Officiel MTR (Proportionnel aux cartes restantes)
    this.timerMode = "official"; // "official" | "blitz" | "unlimited"
    this.pickTimeRemaining = 75;
    this.maxPickTime = 75;
  }

  getOrGenerateSessionId() {
    const urlParams = new URLSearchParams(window.location.search);
    const fromUrl = urlParams.get("session");
    if (fromUrl && /^[a-f0-9]{8,16}$/i.test(fromUrl)) {
      return fromUrl.toLowerCase();
    }
    return this.generateSessionId();
  }

  generateSessionId() {
    const chars = "0123456789abcdef";
    let res = "";
    for (let i = 0; i < 12; i++) {
      res += chars[Math.floor(Math.random() * chars.length)];
    }
    return res;
  }

  generateNewSession() {
    this.sessionId = this.generateSessionId();
    this.updateUrlWithSession();
    this.render();
    showToast(`🔄 Nouvelle Session générée : ${this.sessionId}`);
  }

  updateUrlWithSession() {
    if (app.currentTab === "draft") {
      const url = new URL(window.location.href);
      url.pathname = "/draft";
      url.searchParams.set("session", this.sessionId);
      window.history.replaceState(null, "", url.toString());
    }
  }

  setUserName(name) {
    this.userName = (name || "titou").trim();
    localStorage.setItem("mtg_user_name", this.userName);
    this.render();
  }

  setTimerMode(mode) {
    this.timerMode = mode;
    if (this.state === "drafting") {
      this.startPickTimer();
    }
  }

  getPickDuration(pickNum) {
    // Barème Officiel MTR (Appendix B : Booster Draft Timing)
    // Pick 1 (15 cartes): 75s, Pick 2 (14): 70s, ..., Pick 14 (2): 10s, Pick 15 (1): 5s
    if (this.timerMode === "official") {
      return Math.max(5, (16 - pickNum) * 5);
    } else if (this.timerMode === "blitz") {
      return Math.max(5, Math.round((16 - pickNum) * 2.8)); // 42s down to 5s
    } else {
      return 99999; // Illimité
    }
  }

  startPickTimer() {
    this.maxPickTime = this.getPickDuration(this.currentPickNum);
    this.pickTimeRemaining = this.maxPickTime;
    this.updateTimerUI();
  }

  updateTimerUI() {
    const countdownEl = document.getElementById("pick-countdown-timer");
    const fillEl = document.getElementById("pick-timer-bar-fill");
    const trackEl = document.getElementById("pick-timer-track");

    if (this.timerMode === "unlimited") {
      if (countdownEl) {
        countdownEl.textContent = "⏱️ Illimité";
        countdownEl.className = "pick-timer-badge";
      }
      if (trackEl) trackEl.style.display = "none";
      return;
    }

    if (trackEl) trackEl.style.display = "block";
    if (countdownEl) {
      countdownEl.textContent = `⏱️ ${this.pickTimeRemaining}s`;
      countdownEl.classList.toggle("warning", this.pickTimeRemaining <= 15 && this.pickTimeRemaining > 5);
      countdownEl.classList.toggle("danger", this.pickTimeRemaining <= 5);
    }

    if (fillEl) {
      const pct = Math.max(0, Math.min(100, (this.pickTimeRemaining / this.maxPickTime) * 100));
      fillEl.style.width = `${pct}%`;
      fillEl.classList.toggle("warning", this.pickTimeRemaining <= 15 && this.pickTimeRemaining > 5);
      fillEl.classList.toggle("danger", this.pickTimeRemaining <= 5);
    }
  }

  copySessionLink() {
    const directUrl = `${window.location.origin}/draft?session=${this.sessionId}`;
    navigator.clipboard.writeText(directUrl).then(() => {
      showToast("📋 Lien direct de session copié !");
    }).catch(() => {
      showToast(`Lien : ${directUrl}`);
    });
  }

  loadCube(cubeId) {
    const cubeEntry = CUBES_STATIC_DB[cubeId] || CUBES_STATIC_DB.peasant_360;
    this.currentCubeId = cubeEntry.id;
    this.currentCubeName = cubeEntry.name;

    showToast(`🎴 Cube : ${this.currentCubeName} (${cubeEntry.cards.length} cartes)`);
    this.initDraft(cubeEntry.cards);
  }

  initDraft(cardsPool) {
    const pool = cardsPool ? [...cardsPool] : [...(CUBES_STATIC_DB[this.currentCubeId] || CUBES_STATIC_DB.peasant_360).cards];
    this.shuffle(pool);

    const requiredCards = this.totalSeats * this.packsPerPlayer * this.cardsPerPack; // 8 * 3 * 15 = 360 cartes
    const selectedPool = pool.slice(0, requiredCards);

    this.allPacks = [];
    for (let i = 0; i < this.totalSeats * this.packsPerPlayer; i++) {
      this.allPacks.push(selectedPool.slice(i * this.cardsPerPack, (i + 1) * this.cardsPerPack));
    }

    this.currentPackNum = 1;
    this.currentPickNum = 1;
    this.humanPicks = [];
    this.allSeatPicks = Array.from({ length: this.totalSeats }, () => []);
    this.loadRoundPacks();

    if (this.state === "drafting") {
      this.startTimer();
    }
    this.render();
  }

  startDraftSession() {
    this.state = "drafting";
    this.initDraft();
    this.startTimer();
    this.updateUrlWithSession();
    this.render();
    showToast("🚀 Draft lancé ! Pack 1/3 ouvert.");
  }

  resetToLobby() {
    this.state = "lobby";
    this.stopSpeedrunTimer();
    this.render();
  }

  loadRoundPacks() {
    const startIdx = (this.currentPackNum - 1) * this.totalSeats;
    this.activePacks = [];
    for (let s = 0; s < this.totalSeats; s++) {
      this.activePacks.push(this.allPacks[startIdx + s]);
    }
  }

  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // Algorithme des Bots IA (Heuristique Draftmancer à 3 Phases : Exploration ➔ Commitment ➔ Curve & Fixing)
  calculateDynamicPickScore(card, currentPicks) {
    const effCard = adminStudio ? adminStudio.getEffectiveCard(card, this.currentCubeId) : card;
    const tierMap = { "S": 98, "A": 85, "B": 72, "C": 56, "D": 40 };
    let baseScore = tierMap[effCard.tier] || 60;
    const pickCount = currentPicks.length; // 0 à 44

    // PHASE 1 : PACK 1 (Picks 0 à 8 — Exploration & Pure Power Level)
    if (pickCount < 8) {
      if (effCard.color === "Terrain" || effCard.color === "Incolore") baseScore += 3;
      return Math.max(15, Math.min(99, Math.round(baseScore)));
    }

    // Calcul du vecteur de préférences de couleurs (somme pondérée des tiers)
    const colorWeights = { "Blanc": 0, "Bleu": 0, "Noir": 0, "Rouge": 0, "Vert": 0 };
    currentPicks.forEach(c => {
      if (c.color in colorWeights) {
        const weight = tierMap[c.tier] || 50;
        colorWeights[c.color] += weight;
      }
    });
    const dominantColors = Object.keys(colorWeights).sort((a, b) => colorWeights[b] - colorWeights[a]).slice(0, 2);
    const cardCol = effCard.color;

    // PHASE 2 : FIN DU PACK 1 & PACK 2 (Picks 8 à 30 — Commitment aux Couleurs)
    if (pickCount >= 8 && pickCount < 30) {
      if (cardCol === "Terrain" || cardCol === "Incolore") {
        baseScore += 6;
      } else if (dominantColors.includes(cardCol)) {
        baseScore += 16; // Bonus fort sur les couleurs de base
      } else if (cardCol === "Multicolore") {
        baseScore += 5;
      } else {
        baseScore -= 22; // Malus sur les cartes hors-couleurs
      }

      // Léger bonus de courbe T2/T3
      const cmcCounts = this.getCmcDistribution(currentPicks);
      const cmc = Math.min(Math.max(effCard.cmc || 1, 1), 6);
      if ((cmc === 2 || cmc === 3) && (cmcCounts[cmc] || 0) < 4) {
        baseScore += 4;
      }

      return Math.max(15, Math.min(99, Math.round(baseScore)));
    }

    // PHASE 3 : PACK 3 (Picks 30 à 45 — Fixing & Optimisation de la Courbe)
    if (cardCol === "Terrain" || cardCol === "Incolore") {
      baseScore += 18; // Priorité absolue aux bilands et fixing dans le pack 3
    } else if (dominantColors.includes(cardCol)) {
      baseScore += 24; // Verrouillage total sur les 2 couleurs
    } else if (cardCol === "Multicolore") {
      baseScore -= 10;
    } else {
      baseScore -= 45; // Sanction maximale pour les hors-couleurs au pack 3
    }

    // Comblement strict des manques de courbe
    const cmcCounts = this.getCmcDistribution(currentPicks);
    const cmc = Math.min(Math.max(effCard.cmc || 1, 1), 6);
    if (cmc === 2 && (cmcCounts[2] || 0) < 4) {
      baseScore += 12; // Manque de T2
    } else if (cmc === 3 && (cmcCounts[3] || 0) < 4) {
      baseScore += 8; // Manque de T3
    } else if ((cmc === 5 || cmc === 6) && ((cmcCounts[5] || 0) + (cmcCounts[6] || 0)) >= 5) {
      baseScore -= 15; // Pénalité surcharge de thons à 5+ CMC
    }

    return Math.max(15, Math.min(99, Math.round(baseScore)));
  }

  getColorDistribution(picks) {
    const counts = {};
    picks.forEach(c => {
      if (c.color && c.color !== "Terrain" && c.color !== "Incolore") {
        counts[c.color] = (counts[c.color] || 0) + 1;
      }
    });
    return counts;
  }

  getCmcDistribution(picks) {
    const counts = {};
    picks.forEach(c => {
      const cmc = Math.min(Math.max(c.cmc || 1, 1), 6);
      counts[cmc] = (counts[cmc] || 0) + 1;
    });
    return counts;
  }

  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.startTime = Date.now();
    this.draftDurationSec = 0;
    this.startPickTimer();

    this.timerInterval = setInterval(() => {
      this.draftDurationSec = Math.floor((Date.now() - this.startTime) / 1000);
      const mins = String(Math.floor(this.draftDurationSec / 60)).padStart(2, "0");
      const secs = String(this.draftDurationSec % 60).padStart(2, "0");
      
      const totalEl = document.getElementById("speedrun-timer");
      if (totalEl) totalEl.textContent = `Total: ${mins}:${secs}`;

      if (this.timerMode !== "unlimited") {
        this.pickTimeRemaining--;
        this.updateTimerUI();

        if (this.pickTimeRemaining <= 0) {
          // Auto-Pick déclenché à l'expiration du temps imparti
          if (this.selectedCardIndex !== null && this.selectedCardIndex !== undefined) {
            this.confirmPick();
          } else {
            const humanPack = this.activePacks[0] || [];
            if (humanPack.length > 0) {
              const autoPickIdx = this.chooseBotCard(humanPack, this.humanPicks);
              this.pickCard(autoPickIdx);
              showToast("⏰ Temps écoulé ! Carte auto-sélectionnée.");
            }
          }
        }
      }
    }, 1000);
  }

  stopSpeedrunTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  selectCard(cardIndex) {
    if (this.selectedCardIndex === cardIndex) {
      // Double clic / double tap confirme directement le pick
      this.confirmPick();
      return;
    }

    this.selectedCardIndex = cardIndex;
    
    // Mettre à jour visuellement les cartes
    document.querySelectorAll(".draft-card").forEach((el, idx) => {
      el.classList.toggle("is-selected", idx === cardIndex);
    });

    const confirmBtn = document.getElementById("btn-confirm-pick");
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.classList.add("ready");
    }
  }

  confirmPick() {
    if (this.selectedCardIndex === null || this.selectedCardIndex === undefined) return;
    const cardIdx = this.selectedCardIndex;
    this.selectedCardIndex = null;
    this.pickCard(cardIdx);
  }

  pickCard(cardIndex) {
    this.selectedCardIndex = null;
    const confirmBtn = document.getElementById("btn-confirm-pick");
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.classList.remove("ready");
    }

    const humanPack = this.activePacks[0];
    const pickedCard = humanPack.splice(cardIndex, 1)[0];
    this.humanPicks.push(pickedCard);
    this.allSeatPicks[0].push(pickedCard);

    for (let s = 1; s < this.totalSeats; s++) {
      const botPack = this.activePacks[s];
      if (botPack && botPack.length > 0) {
        const botPickIdx = this.chooseBotCard(botPack, this.allSeatPicks[s]);
        const botCard = botPack.splice(botPickIdx, 1)[0];
        this.allSeatPicks[s].push(botCard);
      }
    }

    if (humanPack.length > 0) {
      this.rotatePacks();
      this.currentPickNum++;
      this.startPickTimer();
    } else {
      if (this.currentPackNum < this.packsPerPlayer) {
        this.currentPackNum++;
        this.currentPickNum = 1;
        this.loadRoundPacks();
        this.startPickTimer();
        showToast(`Booster ${this.currentPackNum}/3 ouvert !`);
      } else {
        this.stopSpeedrunTimer();
        this.finishDraft();
        return;
      }
    }
    this.render();
  }

  rotatePacks() {
    if (this.currentPackNum === 2) {
      const last = this.activePacks.pop();
      this.activePacks.unshift(last);
    } else {
      const first = this.activePacks.shift();
      this.activePacks.push(first);
    }
  }

  chooseBotCard(pack, botHistory) {
    let bestIdx = 0;
    let bestScore = -1;
    pack.forEach((card, idx) => {
      const score = this.calculateDynamicPickScore(card, botHistory);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
    });
    return bestIdx;
  }

  finishDraft() {
    const mins = Math.floor(this.draftDurationSec / 60);
    const secs = this.draftDurationSec % 60;
    showToast(`🎉 Draft terminé en ${mins}m ${secs}s !`);
    app.switchTab("deckbuilder");
    deckbuilder.init(this.humanPicks);
  }

  render() {
    const lobbyScreen = document.getElementById("draft-lobby-screen");
    const activeScreen = document.getElementById("draft-active-screen");

    if (this.state === "lobby") {
      if (lobbyScreen) lobbyScreen.style.display = "block";
      if (activeScreen) activeScreen.style.display = "none";

      const sessionInput = document.getElementById("lobby-session-id");
      if (sessionInput) sessionInput.value = this.sessionId;

      const userInput = document.getElementById("lobby-username");
      if (userInput) userInput.value = this.userName;

      const timerSelect = document.getElementById("lobby-timer-mode");
      if (timerSelect) timerSelect.value = this.timerMode;

      const cubeLabel = document.getElementById("lobby-cube-name");
      if (cubeLabel) cubeLabel.textContent = `${this.currentCubeName} (${(CUBES_STATIC_DB[this.currentCubeId] || {}).cards?.length || 360} cartes)`;

      const seatsGrid = document.getElementById("lobby-seats-grid");
      if (seatsGrid) {
        seatsGrid.innerHTML = `
          <div style="background:#1e293b;border:1px solid var(--accent-gold);padding:10px 12px;border-radius:6px;display:flex;align-items:center;gap:8px">
            <span style="font-size:16px">👑</span>
            <div>
              <div style="font-weight:800;font-size:12px;color:var(--accent-gold)">${this.userName} (Vous)</div>
              <div style="font-size:10px;color:#cbd5e1">Siège 1 • Joueur Humain</div>
            </div>
          </div>
          ${Array.from({ length: 7 }, (_, i) => `
            <div style="background:var(--bg-card);border:1px solid var(--border-color);padding:10px 12px;border-radius:6px;display:flex;align-items:center;gap:8px;opacity:0.85">
              <span style="font-size:16px">🤖</span>
              <div>
                <div style="font-weight:700;font-size:12px;color:var(--text-main)">Bot ${i + 2}</div>
                <div style="font-size:10px;color:var(--text-muted)">Siège ${i + 2} • IA Déterministe</div>
              </div>
            </div>
          `).join("")}
        `;
      }
      return;
    }

    // Mode Drafting Actif
    if (lobbyScreen) lobbyScreen.style.display = "none";
    if (activeScreen) activeScreen.style.display = "block";

    const packStatus = document.getElementById("pack-status");
    const packRotation = document.getElementById("pack-rotation");
    const cardsGrid = document.getElementById("cards-grid");
    const tableSeatsInfo = document.getElementById("table-seats-info");

    if (tableSeatsInfo) {
      tableSeatsInfo.textContent = `${this.currentCubeName} (Session ${this.sessionId})`;
    }
    if (packStatus) {
      packStatus.textContent = `Pack ${this.currentPackNum}/3 — Pick ${this.currentPickNum}/15`;
    }
    if (packRotation) {
      packRotation.textContent = this.currentPackNum === 2 ? "➔ Droite" : "➔ Gauche";
    }

    this.updateTimerUI();

    const humanPack = this.activePacks[0] || [];
    if (cardsGrid) {
      cardsGrid.innerHTML = "";

      humanPack.forEach((card, idx) => {
        const eff = adminStudio ? adminStudio.getEffectiveCard(card, this.currentCubeId) : card;

        if (this.filterColor !== "ALL" && eff.color !== this.filterColor) {
          return;
        }

        const isSelected = idx === this.selectedCardIndex;
        const cardEl = document.createElement("div");
        cardEl.className = `draft-card ${isSelected ? 'is-selected' : ''}`;
        cardEl.onclick = () => this.selectCard(idx);

        const safeName = eff.name.replace(/'/g, "\\'");
        cardEl.innerHTML = `
          <div class="card-img-wrapper" id="img-wrap-${idx}">
            <img src="${eff.image}" alt="${eff.name}" class="card-img" loading="eager" onerror="this.onerror=null; this.src='https://api.scryfall.com/cards/named?fuzzy=' + encodeURIComponent('${safeName}') + '&format=image'; document.getElementById('img-wrap-${idx}')?.classList.add('fallback-frame');" />
          </div>
          <div class="card-info">
            <div class="card-name">${eff.name}</div>
            <div class="card-meta">
              <span>${eff.type}</span>
              <span>CMC ${eff.cmc}</span>
            </div>
          </div>
        `;

        cardsGrid.appendChild(cardEl);
      });

      const confirmBtn = document.getElementById("btn-confirm-pick");
      if (confirmBtn) {
        confirmBtn.disabled = (this.selectedCardIndex === null || this.selectedCardIndex === undefined);
        confirmBtn.classList.toggle("ready", !confirmBtn.disabled);
      }
    }

    // Rendu du visualiseur de Deck en direct sous le draft (Style Draftmancer)
    const liveTitle = document.getElementById("live-deck-title");
    const liveCreatures = document.getElementById("live-creatures-count");
    const liveNoncreatures = document.getElementById("live-noncreatures-count");
    const liveLands = document.getElementById("live-lands-count");
    const liveColsContainer = document.getElementById("live-deck-columns");

    if (liveTitle) liveTitle.textContent = `DECK (${this.humanPicks.length})`;

    const creatures = this.humanPicks.filter(c => (c.type && (c.type.includes("Créature") || c.type.includes("Creature"))));
    const lands = this.humanPicks.filter(c => (c.type && (c.type.includes("Terrain") || c.type.includes("Land"))) || c.color === "Terrain");
    const noncreatures = this.humanPicks.filter(c => !creatures.includes(c) && !lands.includes(c));

    if (liveCreatures) liveCreatures.textContent = `⚔️ ${creatures.length} Créature${creatures.length > 1 ? 's' : ''}`;
    if (liveNoncreatures) liveNoncreatures.textContent = `✨ ${noncreatures.length} Sort${noncreatures.length > 1 ? 's' : ''}`;
    if (liveLands) liveLands.textContent = `🏔️ ${lands.length} Terrain${lands.length > 1 ? 's' : ''}`;

    if (liveColsContainer) {
      // Regrouper les picks par CMC (0, 1, 2, 3, 4, 5, 6+)
      const cmcBuckets = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
      this.humanPicks.forEach(card => {
        const eff = adminStudio ? adminStudio.getEffectiveCard(card, this.currentCubeId) : card;
        let cmc = Math.floor(eff.cmc || 0);
        if (cmc < 0) cmc = 0;
        if (cmc > 6) cmc = 6;
        cmcBuckets[cmc].push(eff);
      });

      const cmcLabels = { 0: "0", 1: "1", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6+" };
      liveColsContainer.innerHTML = [0, 1, 2, 3, 4, 5, 6].map(cmc => {
        const bucket = cmcBuckets[cmc] || [];
        return `
          <div class="live-cmc-col">
            <div class="live-cmc-header">
              <span class="live-cmc-badge">${cmcLabels[cmc]}</span>
              <span>${bucket.length}</span>
            </div>
            <div class="live-column-stack">
              ${bucket.map((c, cIdx) => {
                const safeName = c.name.replace(/'/g, "\\'");
                const offset = cIdx === 0 ? '0' : '-65%';
                return `
                  <div class="live-card-item" style="margin-top:${offset}; z-index:${cIdx + 1};" title="${c.name} (${c.type} • CMC ${c.cmc})">
                    <img src="${c.image}" alt="${c.name}" class="live-card-img" loading="lazy" onerror="this.onerror=null; this.src='https://api.scryfall.com/cards/named?fuzzy=' + encodeURIComponent('${safeName}') + '&format=image';" />
                  </div>
                `;
              }).join("")}
            </div>
          </div>
        `;
      }).join("");
    }
  }
}

const draftEngine = new DraftEngine();
