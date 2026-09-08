// DraftMaster — Solo Draft Client Controller & State Machine

import { formatDuration, getScoreGrade } from "./leaderboard.js";
import { loadImageWithFallback, isMatchingScryfallPrint, sanitizeFrenchCache } from "./card-image.js";

// Local cache for French card translations & images
const localFrenchCache = new Map();
try {
  const stored = localStorage.getItem("draftmaster_french_cache");
  if (stored) {
    const parsed = JSON.parse(stored);
    for (const [k, v] of Object.entries(parsed)) {
      localFrenchCache.set(k, v);
    }
    if (sanitizeFrenchCache(localFrenchCache)) {
      const cleaned = Object.fromEntries(localFrenchCache.entries());
      localStorage.setItem("draftmaster_french_cache", JSON.stringify(cleaned));
    }
  }
} catch {
  // Graceful fallback if localStorage is unavailable
}

function saveFrenchCache(key, data) {
  const existing = localFrenchCache.get(key) || {};
  const merged = { ...existing, ...data };
  localFrenchCache.set(key, merged);
  try {
    const obj = Object.fromEntries(localFrenchCache.entries());
    localStorage.setItem("draftmaster_french_cache", JSON.stringify(obj));
  } catch {
    // Graceful fallback
  }
}

function getSoloCardImage(card, isLarge = false) {
  if (!card) return "/data/cards/images/default.jpg";
  if (card.localFrenchImagePath) {
    return "/" + card.localFrenchImagePath;
  }
  if (card.image?.localFrenchPath) {
    return "/" + card.image.localFrenchPath;
  }
  if (!card.frenchImageUrl && localFrenchCache.has(card.name)) {
    const cached = localFrenchCache.get(card.name);
    if (cached.frenchName) card.frenchName = cached.frenchName;
    if (cached.frenchImageUrl) card.frenchImageUrl = cached.frenchImageUrl;
    if (cached.frenchLargeImageUrl) card.frenchLargeImageUrl = cached.frenchLargeImageUrl;
  }
  if (isLarge && card.frenchLargeImageUrl) return card.frenchLargeImageUrl;
  if (card.frenchImageUrl) return card.frenchImageUrl;
  if (card.localImagePath) return "/" + card.localImagePath;
  if (card.image?.localPath) return "/" + card.image.localPath;
  return card.imageUrl || "/data/cards/images/default.jpg";
}

function getSoloCardFallbackImage(card) {
  return (
    card?.frenchImageUrl ||
    card?.imageUrl ||
    `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card?.name || "")}&format=image`
  );
}

async function fetchFrenchCard(card, onUpdate) {
  if (!card || !card.name) return;
  if (card.frenchImageUrl) return;

  if (localFrenchCache.has(card.name)) {
    const cached = localFrenchCache.get(card.name);
    if (cached.hasNoFrenchPrint) return;
    if (cached.frenchName && !card.frenchName) card.frenchName = cached.frenchName;
    if (cached.frenchText && !card.frenchText) card.frenchText = cached.frenchText;
    if (cached.frenchImageUrl && !card.frenchImageUrl) card.frenchImageUrl = cached.frenchImageUrl;
    if (cached.frenchLargeImageUrl && !card.frenchLargeImageUrl) card.frenchLargeImageUrl = cached.frenchLargeImageUrl;
    if (onUpdate) onUpdate(card);
    if (card.frenchImageUrl) return;
  }

  const cleanName = card.name.split(" // ")[0].trim();
  const searchUrl = `https://api.scryfall.com/cards/search?q=%21%22${encodeURIComponent(cleanName)}%22+lang%3Afr`;
  try {
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent": "DraftMaster/1.0 (local-french-cache; github.com/tristanlenours/DraftMaster)",
        Accept: "application/json",
      },
    });
    if (res.ok) {
      const data = await res.json();
      const prints = data.data || [];
      const match = prints.find(
        (p) => isMatchingScryfallPrint(p, card.name) && (p.image_uris || p.card_faces?.[0]?.image_uris)
      );

      if (match) {
        let fName = match.printed_name || card.name;
        let fText = match.printed_text || match.oracle_text || card.oracleText;
        const fImg = match.image_uris?.normal || match.card_faces?.[0]?.image_uris?.normal || null;
        const fLargeImg = match.image_uris?.large || match.card_faces?.[0]?.image_uris?.large || fImg;

        if (match.card_faces && match.card_faces.length > 0) {
          fName =
            match.printed_name ||
            match.card_faces.map((f) => f.printed_name || f.name).join(" // ");
          fText = match.card_faces
            .map((f) => `${f.printed_name || f.name}\n${f.printed_text || f.oracle_text || ""}`.trim())
            .join("\n\n---\n\n");
        }
        card.frenchName = fName;
        card.frenchText = fText;
        if (fImg) card.frenchImageUrl = fImg;
        if (fLargeImg) card.frenchLargeImageUrl = fLargeImg;

        saveFrenchCache(card.name, {
          frenchName: fName,
          frenchText: fText,
          frenchImageUrl: fImg,
          frenchLargeImageUrl: fLargeImg,
        });
        if (onUpdate) onUpdate(card);
      } else {
        saveFrenchCache(card.name, {
          hasNoFrenchPrint: true,
        });
      }
    } else {
      saveFrenchCache(card.name, {
        hasNoFrenchPrint: true,
      });
    }
  } catch {
    // Offline mode: gracefully ignore
  }
}

export class SoloDraftController {
  constructor(domElements, callbacks = {}) {
    this.dom = domElements;
    this.callbacks = callbacks;
    this.activeHoveredCard = null;

    this.sessionId = null;
    this.seed = null;
    this.playerName = "";
    this.status = "lobby"; // lobby | drafting | deckbuilding | completed
    this.currentBooster = [];
    this.playerPool = [];
    this.selectedCardToPick = null;

    // Deckbuilder State
    this.maindeckSpellIds = new Set();
    this.basicLands = { Plains: 4, Island: 4, Swamp: 3, Mountain: 3, Forest: 3 };

    // Timer
    this.timerInterval = null;
    this.startTimestamp = 0;
    this.draftDuration = 0;
    this.totalDuration = 0;

    // Magicien Identity & Last Result
    this.magicienSlug = "titou";
    this.lastResult = null;

    this.bindEvents();
  }

  bindEvents() {
    // 0. Player Name input sanitization (16 chars max, no special characters)
    if (this.dom.playerNameInput) {
      this.dom.playerNameInput.addEventListener("input", (e) => {
        const cleaned = e.target.value.replace(/[^a-zA-Z0-9À-ÿ _-]/g, "").slice(0, 16);
        if (e.target.value !== cleaned) {
          e.target.value = cleaned;
        }
      });
    }

    // 1. Start button in lobby
    this.dom.startBtn?.addEventListener("click", () => this.handleStartDraft());

    // 2. Confirm Pick button
    this.dom.confirmPickBtn?.addEventListener("click", () => this.handleConfirmPick());

    // 4. Validate Deck button
    this.dom.validateDeckBtn?.addEventListener("click", () => this.handleValidateDeck());

    // 5. Basic Lands +/- buttons
    ["Plains", "Island", "Swamp", "Mountain", "Forest"].forEach((land) => {
      const plusBtn = document.getElementById(`land-plus-${land.toLowerCase()}`);
      const minusBtn = document.getElementById(`land-minus-${land.toLowerCase()}`);

      plusBtn?.addEventListener("click", () => this.adjustLand(land, 1));
      minusBtn?.addEventListener("click", () => this.adjustLand(land, -1));
    });

    // 6. Auto lands button
    this.dom.autoLandsBtn?.addEventListener("click", () => this.autoCalculateLands());

    // 7. Restart button
    this.dom.restartBtn?.addEventListener("click", () => this.resetToLobby());

    // 8. Go to Records button
    this.dom.goToRecordsBtn?.addEventListener("click", () => {
      if (this.callbacks.onNavigateToRecords) {
        this.callbacks.onNavigateToRecords();
      }
    });

    // 9. Share Deck Showcase button
    const shareBtn = document.getElementById("btn-share-deck-showcase");
    shareBtn?.addEventListener("click", () => {
      if (this.lastResult) {
        this.openDeckShowcaseModal(this.lastResult);
      }
    });

    // 10. Publish to Leaderboard toggle change
    const publishToggle = document.getElementById("publish-to-leaderboard-toggle");
    publishToggle?.addEventListener("change", () => {
      this.renderDeckbuilder();
    });

    document.getElementById("card-hover-close-btn")?.addEventListener("click", (event) => {
      event.stopPropagation();
      this.hideCardHoverPreview();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") this.hideCardHoverPreview();
    });
  }

  startTimer() {
    this.startTimestamp = Date.now();
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      const elapsed = Math.round((Date.now() - this.startTimestamp) / 1000);
      const text = `⏱️ ${formatDuration(elapsed)}`;
      if (this.dom.arenaTimer) this.dom.arenaTimer.textContent = text;
      if (this.dom.deckTimer) this.dom.deckTimer.textContent = text;
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  resetToLobby() {
    this.stopTimer();
    this.status = "lobby";
    this.sessionId = null;
    this.selectedCardToPick = null;
    this.maindeckSpellIds.clear();

    const publishToggle = document.getElementById("publish-to-leaderboard-toggle");
    if (publishToggle) publishToggle.checked = false;

    this.showStage("lobby");
  }

  showStage(stageName) {
    this.hideCardHoverPreview();
    if (this.dom.lobbyStage) this.dom.lobbyStage.hidden = stageName !== "lobby";
    if (this.dom.arenaStage) this.dom.arenaStage.hidden = stageName !== "arena";
    if (this.dom.deckStage) this.dom.deckStage.hidden = stageName !== "deck";
    if (this.dom.resultStage) this.dom.resultStage.hidden = stageName !== "result";

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async handleStartDraft() {
    let rawName = this.dom.playerNameInput?.value?.trim() || "";
    // Sanitize: max 16 chars, alphanumeric, french accented letters, spaces, hyphens, underscores
    rawName = rawName.replace(/[^a-zA-Z0-9À-ÿ _-]/g, "").slice(0, 16).trim();
    if (!rawName) {
      rawName = "Joueur";
    }

    this.playerName = rawName;
    const slugInput = document.getElementById("draft-magicien-slug");
    const magicienSlug = slugInput?.value || undefined;

    // Seed is generated randomly in the background and completely masked from the player
    const seed = Math.floor(Math.random() * 2147483647) + 1;

    this.dom.startBtn.disabled = true;
    this.dom.startBtn.textContent = "Préparation du Cube...";

    try {
      const res = await fetch("/api/draft/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName: this.playerName,
          magicienSlug,
          seed,
        }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Impossible de démarrer le draft.");

      const s = data.session;
      this.sessionId = s.sessionId;
      this.seed = s.seed;
      this.status = s.status;
      this.currentBooster = s.currentBooster;
      this.playerPool = s.playerPool;

      this.startTimer();
      this.renderArena(s);
      this.showStage("arena");
    } catch (err) {
      alert(`Erreur : ${err.message}`);
    } finally {
      this.dom.startBtn.disabled = false;
      this.dom.startBtn.textContent = "Lancer le Draft Solo 🚀";
    }
  }

  renderArena(session) {
    // 1. Header HUD
    if (this.dom.hudPackNumber) this.dom.hudPackNumber.textContent = `Pack ${String(session.packNumber)} / 3`;
    if (this.dom.hudPickNumber) this.dom.hudPickNumber.textContent = `Pick ${String(session.pickNumber)} / 15`;
    if (this.dom.hudDirection) {
      const feederName =
        session.nextBoosterFromBotName ||
        (session.direction === "right" ? "Voisin de Droite" : "Voisin de Gauche") ||
        "TitouBot";
      this.dom.hudDirection.textContent = `🥛 Nourri au bon lait de : ${feederName}`;
    }
    if (this.dom.hudPlayerBadge) this.dom.hudPlayerBadge.textContent = session.playerName;

    const progressPct = Math.round((session.roundIndex / 45) * 100);
    if (this.dom.hudProgressBar) this.dom.hudProgressBar.style.width = `${String(progressPct)}%`;

    // Prefetch French cards & images for all cards in the booster in background
    for (const card of session.currentBooster) {
      if (localFrenchCache.has(card.name)) {
        const cached = localFrenchCache.get(card.name);
        if (cached.frenchName) card.frenchName = cached.frenchName;
        if (cached.frenchImageUrl) card.frenchImageUrl = cached.frenchImageUrl;
        if (cached.frenchLargeImageUrl) card.frenchLargeImageUrl = cached.frenchLargeImageUrl;
      }
      if (!card.frenchImageUrl) {
        fetchFrenchCard(card, (updatedCard) => {
          const itemEl = this.dom.boosterGrid?.querySelector(
            `.booster-card-item[data-instance-id="${updatedCard.instanceId}"]`
          );
          if (itemEl) {
            const img = itemEl.querySelector(".booster-card-img");
            if (img && updatedCard.frenchImageUrl) {
              img.src = updatedCard.frenchImageUrl;
            }
          }
          if (this.activeHoveredCard?.instanceId === updatedCard.instanceId) {
            const popoverImg = document.getElementById("popover-img");
            if (popoverImg && updatedCard.frenchLargeImageUrl) {
              popoverImg.src = updatedCard.frenchLargeImageUrl;
            }
          }
        });
      }
    }

    // 2. Booster Cards Grid (No power level, no bomb ribbons — pure unassisted draft)
    this.selectedCardToPick = null;
    if (this.dom.confirmPickBtn) {
      this.dom.confirmPickBtn.disabled = true;
      this.dom.confirmPickBtn.innerHTML = "<span>Sélectionnez une carte</span>";
    }

    if (!this.dom.boosterGrid) return;
    this.dom.boosterGrid.innerHTML = session.currentBooster
      .map((card) => {
        const displayName = card.frenchName || card.name;

        return `
          <div class="booster-card-item" data-instance-id="${card.instanceId}" role="button" tabindex="0">
            <div class="card-art-wrap">
              <img alt="${escapeHtml(displayName)}" loading="lazy" class="booster-card-img" />
              <button
                type="button"
                class="card-zoom-btn"
                aria-label="Agrandir ${escapeHtml(displayName)}"
                title="Agrandir la carte"
              >🔍</button>
            </div>
          </div>
        `;
      })
      .join("");

    // Attach click and hover listeners to cards
    this.dom.boosterGrid.querySelectorAll(".booster-card-item").forEach((el) => {
      const id = el.dataset.instanceId;
      const card = session.currentBooster.find((c) => c.instanceId === id);

      const image = el.querySelector(".booster-card-img");
      if (card && image) {
        loadImageWithFallback(image, getSoloCardImage(card), getSoloCardFallbackImage(card));
      }

      el.addEventListener("click", () => {
        this.hideCardHoverPreview();
        this.selectCardForPick(id);
      });
      el.addEventListener("dblclick", () => {
        this.selectCardForPick(id);
        this.handleConfirmPick();
      });

      if (card) {
        const zoomButton = el.querySelector(".card-zoom-btn");
        zoomButton?.addEventListener("click", (event) => {
          event.stopPropagation();
          this.showCardHoverPreview(card, event);
        });
        zoomButton?.addEventListener("dblclick", (event) => event.stopPropagation());
      }
    });

    // 3. Pool Drawer
    this.renderPoolDrawer(session.playerPool);
  }

  selectCardForPick(instanceId) {
    this.selectedCardToPick = instanceId;
    this.dom.boosterGrid.querySelectorAll(".booster-card-item").forEach((el) => {
      el.classList.toggle("selected-pick", el.dataset.instanceId === instanceId);
    });

    const chosen = this.currentBooster.find((c) => c.instanceId === instanceId);
    if (this.dom.confirmPickBtn && chosen) {
      const chosenName = chosen.frenchName || chosen.name;
      this.dom.confirmPickBtn.disabled = false;
      this.dom.confirmPickBtn.innerHTML = `<span>Choisir <strong>${escapeHtml(chosenName)}</strong> ✨</span>`;
    }
  }

  async handleConfirmPick() {
    if (!this.selectedCardToPick) return;

    this.hideCardHoverPreview();
    const cardId = this.selectedCardToPick;
    this.dom.confirmPickBtn.disabled = true;
    this.dom.confirmPickBtn.textContent = "Traitement des 7 bots...";

    try {
      const res = await fetch("/api/draft/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: this.sessionId,
          cardInstanceId: cardId,
        }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Erreur lors de la validation du pick.");

      const s = data.session;
      this.currentBooster = s.currentBooster;
      this.playerPool = s.playerPool;
      this.status = s.status;

      if (s.status === "deckbuilding" || s.roundIndex >= 45) {
        this.draftDuration = s.elapsedSeconds;
        this.setupDeckbuilder(s.playerPool);
        this.showStage("deck");
      } else {
        this.renderArena(s);
      }
    } catch (err) {
      alert(`Erreur : ${err.message}`);
      this.dom.confirmPickBtn.disabled = false;
    }
  }

  renderPoolDrawer(pool) {
    if (!this.dom.poolContainer) return;
    if (this.dom.poolCountBadge) this.dom.poolCountBadge.textContent = `${String(pool.length)} / 45`;

    this.dom.poolContainer.innerHTML = pool
      .map((card) => {
        if (!card.frenchImageUrl && localFrenchCache.has(card.name)) {
          const cached = localFrenchCache.get(card.name);
          if (cached.frenchName) card.frenchName = cached.frenchName;
          if (cached.frenchImageUrl) card.frenchImageUrl = cached.frenchImageUrl;
          if (cached.frenchLargeImageUrl) card.frenchLargeImageUrl = cached.frenchLargeImageUrl;
        }
        const displayName = card.frenchName || card.name;
        return `
          <div class="pool-mini-card" data-instance-id="${card.instanceId}" role="button" tabindex="0" title="${escapeHtml(displayName)}">
            <img alt="${escapeHtml(displayName)}" loading="lazy" />
          </div>
        `;
      })
      .join("");

    this.dom.poolContainer.querySelectorAll(".pool-mini-card").forEach((el) => {
      const id = el.dataset.instanceId;
      const card = pool.find((c) => c.instanceId === id);
      if (card) {
        const image = el.querySelector("img");
        if (image) {
          loadImageWithFallback(image, getSoloCardImage(card), getSoloCardFallbackImage(card));
        }
        el.addEventListener("mouseenter", (e) => this.showCardHoverPreview(card, e));
        el.addEventListener("mousemove", (e) => this.positionCardHoverPreview(e));
        el.addEventListener("mouseleave", () => this.hideCardHoverPreview());
      }
    });
  }

  showCardHoverPreview(card, e) {
    const popover = document.getElementById("card-hover-popover");
    const popoverImg = document.getElementById("popover-img");
    if (!popover || !popoverImg || !card) return;
    this.activeHoveredCard = card;

    const targetSrc = getSoloCardImage(card, true);
    const fallbackSrc = getSoloCardFallbackImage(card);

    popoverImg.alt = card.frenchName || card.name;
    popoverImg.onerror = () => {
      if (fallbackSrc && popoverImg.src !== fallbackSrc) {
        popoverImg.src = fallbackSrc;
      }
    };
    popoverImg.src = targetSrc;

    popover.hidden = false;
    popover.style.display = "block";
    popover.setAttribute("aria-hidden", "false");
    this.positionCardHoverPreview(e);

    if (!card.frenchImageUrl) {
      fetchFrenchCard(card, (updated) => {
        if (this.activeHoveredCard?.instanceId === updated.instanceId) {
          const newSrc = updated.frenchLargeImageUrl || updated.frenchImageUrl;
          if (newSrc) {
            popoverImg.src = newSrc;
          }
        }
      });
    }
  }

  positionCardHoverPreview(e) {
    const el = document.getElementById("card-hover-popover");
    if (!el || el.hidden) return;

    let clientX = e?.clientX;
    let clientY = e?.clientY;

    if (clientX === undefined && e?.target) {
      const r = e.target.getBoundingClientRect();
      clientX = r.right;
      clientY = r.top;
    }

    const offset = 20;
    const width = el.offsetWidth || 320;
    const height = el.offsetHeight || 445;

    let left = (clientX || 0) + offset;
    let top = (clientY || 0) - height / 3;

    // Clamping to screen boundaries
    if (left + width > window.innerWidth - 16) {
      left = (clientX || 0) - width - offset;
    }
    if (left < 16) left = 16;

    if (top + height > window.innerHeight - 16) {
      top = window.innerHeight - height - 16;
    }
    if (top < 16) top = 16;

    el.style.left = `${String(Math.round(left))}px`;
    el.style.top = `${String(Math.round(top))}px`;
  }

  hideCardHoverPreview() {
    this.activeHoveredCard = null;
    const el = document.getElementById("card-hover-popover");
    if (!el) return;
    el.hidden = true;
    el.style.display = "none";
    el.setAttribute("aria-hidden", "true");
  }

  setupDeckbuilder(pool) {
    // Default 23 spells: take top 23 non-land cards by static score
    const nonLands = pool.filter((c) => !c.isLand);
    const sortedNonLands = [...nonLands].sort((a, b) => b.staticScore - a.staticScore);
    const initialMaindeck = sortedNonLands.slice(0, 23);

    this.maindeckSpellIds = new Set(initialMaindeck.map((c) => c.instanceId));
    this.autoCalculateLands();
    this.renderDeckbuilder();
  }

  autoCalculateLands() {
    const counts = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    for (const id of this.maindeckSpellIds) {
      const card = this.playerPool.find((c) => c.instanceId === id);
      if (!card || card.isLand) continue;
      for (const col of card.colors || []) {
        if (counts[col] !== undefined) counts[col]++;
      }
    }

    const totalPips = counts.W + counts.U + counts.B + counts.R + counts.G;
    if (totalPips === 0) {
      this.basicLands = { Plains: 4, Island: 4, Swamp: 3, Mountain: 3, Forest: 3 };
    } else {
      const TARGET = 17;
      const lands = { Plains: 0, Island: 0, Swamp: 0, Mountain: 0, Forest: 0 };
      const map = { W: "Plains", U: "Island", B: "Swamp", R: "Mountain", G: "Forest" };
      let allocated = 0;

      for (const [col, landName] of Object.entries(map)) {
        if (counts[col] > 0) {
          const share = Math.max(1, Math.round((counts[col] / totalPips) * TARGET));
          lands[landName] = share;
          allocated += share;
        }
      }

      // Adjust to 17
      while (allocated < TARGET) {
        lands.Plains++;
        allocated++;
      }
      while (allocated > TARGET) {
        const canDecrease = Object.keys(lands).find((k) => lands[k] > 1);
        if (canDecrease) {
          lands[canDecrease]--;
          allocated--;
        } else {
          break;
        }
      }
      this.basicLands = lands;
    }

    this.updateLandsDisplay();
  }

  adjustLand(land, delta) {
    const current = this.basicLands[land] || 0;
    const next = Math.max(0, current + delta);
    this.basicLands[land] = next;
    this.updateLandsDisplay();
  }

  updateLandsDisplay() {
    let total = 0;
    ["Plains", "Island", "Swamp", "Mountain", "Forest"].forEach((land) => {
      const count = this.basicLands[land] || 0;
      total += count;
      const countEl = document.getElementById(`land-count-${land.toLowerCase()}`);
      if (countEl) countEl.textContent = String(count);
    });

    if (this.dom.totalLandsBadge) {
      this.dom.totalLandsBadge.textContent = `${String(total)} / 17 terrains`;
      this.dom.totalLandsBadge.classList.toggle("valid-count", total === 17);
    }
  }

  renderDeckbuilder() {
    const maindeckCards = this.playerPool.filter((c) => this.maindeckSpellIds.has(c.instanceId));
    const sideboardCards = this.playerPool.filter((c) => !this.maindeckSpellIds.has(c.instanceId));

    // Sort by CMC then name
    maindeckCards.sort((a, b) => a.cmc - b.cmc || a.name.localeCompare(b.name));
    sideboardCards.sort((a, b) => a.cmc - b.cmc || a.name.localeCompare(b.name));

    // Counter badge
    const spellCount = maindeckCards.length;
    if (this.dom.deckSpellsCounter) {
      this.dom.deckSpellsCounter.textContent = `${String(spellCount)} / 23 cartes actives`;
      this.dom.deckSpellsCounter.classList.toggle("valid-count", spellCount === 23);
    }

    if (this.dom.validateDeckBtn) {
      this.dom.validateDeckBtn.disabled = spellCount !== 23;
      const isPublish = Boolean(document.getElementById("publish-to-leaderboard-toggle")?.checked);
      if (spellCount === 23) {
        this.dom.validateDeckBtn.innerHTML = isPublish
          ? "<span>🏆 Valider et Inscrire au Mur des Records (23/23)</span>"
          : "<span>⚡ Évaluer mon Deck (Mode Entraînement) (23/23)</span>";
      } else if (spellCount < 23) {
        this.dom.validateDeckBtn.innerHTML = `<span>Ajoutez ${String(23 - spellCount)} carte(s) pour valider</span>`;
      } else {
        this.dom.validateDeckBtn.innerHTML = `<span>Retirez ${String(spellCount - 23)} carte(s) pour valider</span>`;
      }
    }

    // Render Maindeck Container
    if (this.dom.maindeckContainer) {
      this.dom.maindeckContainer.innerHTML = maindeckCards
        .map((c) => this.createDeckCardItem(c, "remove", "Retirer du Deck"))
        .join("");

      this.dom.maindeckContainer.querySelectorAll(".deck-card-item").forEach((el) => {
        const id = el.dataset.instanceId;
        const card = this.playerPool.find((c) => c.instanceId === id);
        if (card) {
          const image = el.querySelector(".deck-card-img");
          if (image) {
            loadImageWithFallback(image, getSoloCardImage(card), getSoloCardFallbackImage(card));
          }
          el.addEventListener("mouseenter", (e) => this.showCardHoverPreview(card, e));
          el.addEventListener("mousemove", (e) => this.positionCardHoverPreview(e));
          el.addEventListener("mouseleave", () => this.hideCardHoverPreview());
        }

        el.addEventListener("click", () => {
          this.hideCardHoverPreview();
          this.maindeckSpellIds.delete(id);
          this.renderDeckbuilder();
        });
      });
    }

    // Render Sideboard Container
    if (this.dom.sideboardContainer) {
      this.dom.sideboardContainer.innerHTML = sideboardCards
        .map((c) => this.createDeckCardItem(c, "add", "Ajouter au Deck"))
        .join("");

      this.dom.sideboardContainer.querySelectorAll(".deck-card-item").forEach((el) => {
        const id = el.dataset.instanceId;
        const card = this.playerPool.find((c) => c.instanceId === id);
        if (card) {
          const image = el.querySelector(".deck-card-img");
          if (image) {
            loadImageWithFallback(image, getSoloCardImage(card), getSoloCardFallbackImage(card));
          }
          el.addEventListener("mouseenter", (e) => this.showCardHoverPreview(card, e));
          el.addEventListener("mousemove", (e) => this.positionCardHoverPreview(e));
          el.addEventListener("mouseleave", () => this.hideCardHoverPreview());
        }

        el.addEventListener("click", () => {
          this.hideCardHoverPreview();
          this.maindeckSpellIds.add(id);
          this.renderDeckbuilder();
        });
      });
    }

    this.updateLandsDisplay();
  }

  createDeckCardItem(card, actionType, tooltip) {
    const actionIcon = actionType === "remove" ? "➖" : "➕";
    const badgeClass = actionType === "remove" ? "btn-remove-card" : "btn-add-card";
    const displayName = card.frenchName || card.name;

    return `
      <div class="deck-card-item" data-instance-id="${card.instanceId}" title="${tooltip}">
        <img alt="${escapeHtml(displayName)}" loading="lazy" class="deck-card-img" />
        <button class="deck-action-overlay ${badgeClass}" aria-label="${tooltip}">
          ${actionIcon}
        </button>
        <div class="deck-card-footer">
          <span class="deck-card-name">${escapeHtml(displayName)}</span>
          <span class="deck-card-cmc">${String(card.cmc)}</span>
        </div>
      </div>
    `;
  }

  async handleValidateDeck() {
    if (this.maindeckSpellIds.size !== 23) {
      alert("Votre deck doit comporter exactement 23 cartes actives avant validation.");
      return;
    }

    const publishToggle = document.getElementById("publish-to-leaderboard-toggle");
    const isPublish = Boolean(publishToggle?.checked);

    this.stopTimer();
    this.dom.validateDeckBtn.disabled = true;
    this.dom.validateDeckBtn.textContent = isPublish
      ? "Évaluation du Deck & Inscription au Mur des Records..."
      : "Évaluation du Deck (Entraînement)...";

    try {
      const res = await fetch("/api/draft/deck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: this.sessionId,
          maindeckCardInstanceIds: Array.from(this.maindeckSpellIds),
          basicLands: this.basicLands,
          publishToLeaderboard: isPublish,
        }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Échec de l'évaluation du deck.");

      this.renderResult(data.result);
      this.showStage("result");
    } catch (err) {
      alert(`Erreur : ${err.message}`);
      this.dom.validateDeckBtn.disabled = false;
    }
  }

  renderResult(result) {
    const d = result.evaluation;
    const rec = result.leaderboardEntry;

    // High Score Banner
    if (this.dom.resultHighScoreBanner) {
      this.dom.resultHighScoreBanner.hidden = !result.isNewHighScore;
    }

    // Overall Score & Grade
    const { grade, css } = getScoreGrade(d.overallScore);
    if (this.dom.resultScoreVal) this.dom.resultScoreVal.textContent = String(d.overallScore);
    if (this.dom.resultScoreGrade) {
      this.dom.resultScoreGrade.textContent = `TIER ${grade}`;
      this.dom.resultScoreGrade.className = `result-grade-badge ${css}`;
    }

    // Archetype
    if (this.dom.resultArchetypeLabel) {
      this.dom.resultArchetypeLabel.textContent = d.archetype?.label || "Libre";
    }
    if (this.dom.resultArchetypeDesc) {
      this.dom.resultArchetypeDesc.textContent = d.archetype?.description || "";
    }

    // Radar 5 Axes
    const axes = [
      { id: "power", label: "Puissance", val: d.radar.power },
      { id: "synergy", label: "Synergie", val: d.radar.synergy },
      { id: "curve", label: "Courbe", val: d.radar.curve },
      { id: "mana", label: "Mana", val: d.radar.mana },
      { id: "interaction", label: "Interaction", val: d.radar.interaction },
    ];

    axes.forEach((axis) => {
      const bar = document.getElementById(`result-radar-bar-${axis.id}`);
      const val = document.getElementById(`result-radar-val-${axis.id}`);
      if (bar) bar.style.width = `${String(axis.val)}%`;
      if (val) val.textContent = `${String(axis.val)} / 100`;
    });

    // Time & Rank
    const draftSec = rec?.draftDurationSeconds ?? this.draftDuration;
    const totalSec = rec?.totalDurationSeconds ?? this.totalDuration;
    if (this.dom.resultChronoText) {
      this.dom.resultChronoText.textContent = `Temps de draft : ${formatDuration(draftSec)} • Temps total : ${formatDuration(totalSec)}`;
    }

    const rankBadge = document.getElementById("result-rank-badge");
    const trainingBadge = document.getElementById("result-training-badge");
    const publishTrainingBtn = document.getElementById("btn-publish-training-draft");

    if (result.isPublished && rec) {
      if (rankBadge) {
        rankBadge.hidden = false;
        rankBadge.textContent = rec.rank ? `Rang #${String(rec.rank)} au Mur des Records` : "Inscrit au Mur des Records";
      }
      if (trainingBadge) trainingBadge.hidden = true;
      if (publishTrainingBtn) publishTrainingBtn.style.display = "none";
    } else {
      if (rankBadge) rankBadge.hidden = true;
      if (trainingBadge) trainingBadge.hidden = false;
      if (publishTrainingBtn) {
        publishTrainingBtn.style.display = "inline-flex";
        publishTrainingBtn.disabled = false;
        publishTrainingBtn.innerHTML = "<span>🏆 Inscrire ce score au Mur des Records !</span>";
        publishTrainingBtn.onclick = async () => {
          publishTrainingBtn.disabled = true;
          publishTrainingBtn.textContent = "Inscription en cours...";
          try {
            const pubRes = await fetch("/api/draft/publish", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId: this.sessionId }),
            });
            const pubData = await pubRes.json();
            if (!pubData.ok) throw new Error(pubData.error || "Erreur lors de l'inscription.");

            publishTrainingBtn.style.display = "none";
            if (trainingBadge) trainingBadge.hidden = true;
            if (rankBadge) {
              rankBadge.hidden = false;
              rankBadge.textContent = pubData.result.entry.rank
                ? `Rang #${String(pubData.result.entry.rank)} au Mur des Records`
                : "Inscrit au Mur des Records";
            }
            if (this.dom.resultHighScoreBanner && pubData.result.isNewHighScore) {
              this.dom.resultHighScoreBanner.hidden = false;
            }
            alert("🏆 Félicitations ! Votre score est officiellement inscrit au Mur des Records.");
          } catch (pubErr) {
            alert(`Erreur : ${pubErr.message}`);
            publishTrainingBtn.disabled = false;
            publishTrainingBtn.innerHTML = "<span>🏆 Inscrire ce score au Mur des Records !</span>";
          }
        };
      }
    }

    // Strengths & Weaknesses
    if (this.dom.resultStrengthsList) {
      this.dom.resultStrengthsList.innerHTML = (d.strengths || [])
        .map((s) => `<li>✅ ${escapeHtml(s)}</li>`)
        .join("");
    }
    if (this.dom.resultWeaknessesList) {
      this.dom.resultWeaknessesList.innerHTML = (d.weaknesses || [])
        .map((w) => `<li>⚠️ ${escapeHtml(w)}</li>`)
        .join("");
    }

    // Report Links
    if (this.dom.openWalkthroughBtn) {
      this.dom.openWalkthroughBtn.href = result.reports.walkthroughUrl;
    }
    if (this.dom.openBoostersBtn) {
      this.dom.openBoostersBtn.href = result.reports.boostersUrl;
    }

    // Store for sharing
    this.lastResult = result;
  }

  openDeckShowcaseModal(result) {
    openDeckShowcaseModal(result);
  }
}

export function openDeckShowcaseModal(resultOrDeck) {
  const modal = document.getElementById("deck-showcase-modal");
  const body = document.getElementById("deck-modal-body");
  const titleEl = document.getElementById("deck-modal-player-title");
  const subEl = document.getElementById("deck-modal-subtitle");
  const closeBtn = document.getElementById("deck-modal-close-btn");

  if (!modal || !body) return;

  const evaluation = resultOrDeck.evaluation || resultOrDeck;
  const overallScore = evaluation.overallScore ?? resultOrDeck.overallScore ?? 75;
  const archetype = evaluation.archetype || resultOrDeck.archetype || { label: "Deck Libre" };
  const playerName = resultOrDeck.playerName || "Magicien";
  const { grade, css } = getScoreGrade(overallScore);

  if (titleEl) titleEl.textContent = `${playerName} • Deck Showcase`;
  if (subEl) subEl.textContent = `${archetype.label || "Libre"} • Score ${String(overallScore)} (Tier ${grade})`;

  const deckId = resultOrDeck.leaderboardEntry?.id || resultOrDeck.sessionId || resultOrDeck.id;
  const shareUrl = `${window.location.origin}/?deck=${deckId}`;
  const shareText = `🔥 Regarde le deck ${archetype.label || "Magic"} que je viens de drafter sur LMCDEU ! Score : ${String(overallScore)}/100 (Tier ${grade}) 🏆\n${shareUrl}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

  const maindeckCards =
    evaluation.allMaindeck ||
    resultOrDeck.maindeckCards ||
    resultOrDeck.maindeck_cards ||
    [];

  const cardsHtml = maindeckCards
    .map((c) => {
      const name = c.frenchName || c.name || "Carte";
      return `
        <div class="deck-card-item" title="${escapeHtml(name)}">
          <img alt="${escapeHtml(name)}" loading="lazy" class="deck-card-img" />
          <div class="deck-card-footer">
            <span class="deck-card-name">${escapeHtml(name)}</span>
            <span class="deck-card-cmc">${String(c.cmc ?? 0)}</span>
          </div>
        </div>
      `;
    })
    .join("");

  body.innerHTML = `
    <div class="deck-showcase-score-row">
      <div>
        <span style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Score Global du Deck</span>
        <div class="dssr-score">${String(overallScore)} <span style="font-size: 1rem; color: #94a3b8;">/ 100</span></div>
      </div>
      <div class="score-grade-pill ${css}" style="font-size: 1.4rem; padding: 6px 18px;">
        TIER ${grade}
      </div>
    </div>

    <div class="deck-share-actions">
      <a href="${whatsappUrl}" target="_blank" rel="noopener" class="btn-share-social btn-share-whatsapp">
        <span>💬 Partager sur WhatsApp</span>
      </a>
      <button type="button" class="btn-share-social btn-share-copy" id="btn-copy-deck-link">
        <span>📋 Copier le Lien Unique</span>
      </button>
    </div>

    <div style="font-size: 0.82rem; color: #cbd5e1; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px;">
      <strong>Archétype :</strong> ${escapeHtml(archetype.label || "Libre")}<br>
      <strong>Deck 40 cartes :</strong> Prêt pour le duel !
    </div>

    <div>
      <h4 style="font-size: 0.95rem; color: #f8fafc; margin-bottom: 10px;">Cartes du Deck</h4>
      <div class="deck-cards-list-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px;">
        ${cardsHtml}
      </div>
    </div>
  `;

  body.querySelectorAll(".deck-card-img").forEach((image, index) => {
    const card = maindeckCards[index];
    if (card) {
      loadImageWithFallback(image, getSoloCardImage(card), getSoloCardFallbackImage(card));
    }
  });

  const copyBtn = document.getElementById("btn-copy-deck-link");
  copyBtn?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      copyBtn.innerHTML = "<span>✅ Lien Copié !</span>";
      setTimeout(() => {
        if (copyBtn) copyBtn.innerHTML = "<span>📋 Copier le Lien Unique</span>";
      }, 3000);
    } catch {
      prompt("Copiez ce lien pour partager :", shareUrl);
    }
  });

  closeBtn.onclick = () => {
    modal.hidden = true;
  };
  modal.onclick = (e) => {
    if (e.target === modal) modal.hidden = true;
  };

  modal.hidden = false;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
