// DraftMaster — Solo Draft Client Controller & State Machine

import { formatDuration, getScoreGrade } from "./leaderboard.js";
import { loadImageWithFallback, isMatchingScryfallPrint, sanitizeFrenchCache } from "./card-image.js";
import {
  getCardDisplayName,
  getCardImageFallbackUrl,
  getCardImageUrl,
  readCardLanguage,
} from "./card-language.js";

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

function getSoloCardImage(card, language, isLarge = false) {
  if (language === "FR" && !card?.frenchImageUrl && localFrenchCache.has(card?.name)) {
    const cached = localFrenchCache.get(card.name);
    if (cached.frenchName) card.frenchName = cached.frenchName;
    if (cached.frenchImageUrl) card.frenchImageUrl = cached.frenchImageUrl;
    if (cached.frenchLargeImageUrl) card.frenchLargeImageUrl = cached.frenchLargeImageUrl;
  }
  return getCardImageUrl(card, language, isLarge);
}

function getSoloCardFallbackImage(card, language) {
  return getCardImageFallbackUrl(card, language);
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
    this.isCoachAdviceEnabled = false;
    this.adviceRequestId = 0;
    this.adviceAbortController = null;
    this.isConfirmingPick = false;

    this.bindEvents();
  }

  get cardLanguage() {
    return this.callbacks.getCardLanguage?.() || readCardLanguage();
  }

  setCardLanguage() {
    this.hideCardHoverPreview();
    if (this.status === "deckbuilding") {
      this.renderDeckbuilder();
    } else if (this.status !== "lobby" && this.status !== "completed" && this.currentBooster.length > 0) {
      this.refreshRenderedCardLanguage();
    }

    if (this.cardLanguage === "FR") {
      for (const card of [...this.currentBooster, ...this.playerPool]) {
        if (!card.frenchImageUrl) {
          fetchFrenchCard(card, () => this.refreshRenderedCardLanguage());
        }
      }
    }
  }

  refreshRenderedCardLanguage() {
    const language = this.cardLanguage;
    const cards = [...this.currentBooster, ...this.playerPool];
    for (const element of document.querySelectorAll("[data-instance-id]")) {
      const card = cards.find((candidate) => candidate.instanceId === element.dataset.instanceId);
      if (!card) continue;
      const name = getCardDisplayName(card, language);
      element.setAttribute("title", name);
      const image = element.querySelector("img");
      if (image) {
        image.alt = name;
        loadImageWithFallback(
          image,
          getSoloCardImage(card, language),
          getSoloCardFallbackImage(card, language),
        );
      }
    }
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

    // 11. AI Coach Advice button
    this.dom.coachAdviceBtn?.addEventListener("click", () => this.handleRequestAdvice());
    this.dom.coachAdviceCloseBtn?.addEventListener("click", () => this.handleCloseCoachAdvice());

    // 12. AI Deck Recommendation button
    this.dom.deckAiRecommendBtn?.addEventListener("click", () => this.handleRequestDeckRecommendation());

    // 13. Abandon / Quit Draft buttons
    this.dom.abandonBtn?.addEventListener("click", () => this.handleAbandonDraft());
    this.dom.deckAbandonBtn?.addEventListener("click", () => this.handleAbandonDraft());

    document.getElementById("card-hover-close-btn")?.addEventListener("click", (event) => {
      event.stopPropagation();
      this.hideCardHoverPreview();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") this.hideCardHoverPreview();
    });

    this.checkActiveSession();
  }

  async checkActiveSession() {
    try {
      const storedId = localStorage.getItem("draftmaster_active_session_id");
      if (!storedId) return;

      const res = await fetch(`/api/draft/session?sessionId=${encodeURIComponent(storedId)}`);
      if (!res.ok) {
        localStorage.removeItem("draftmaster_active_session_id");
        return;
      }

      const data = await res.json();
      if (!data.ok || !data.session) {
        localStorage.removeItem("draftmaster_active_session_id");
        return;
      }

      const s = data.session;
      this.sessionId = s.sessionId;
      this.seed = s.seed;
      this.status = s.status;
      this.playerName = s.playerName;
      this.magicienSlug = s.magicienSlug || "titou";
      this.currentBooster = s.currentBooster || [];
      this.playerPool = s.playerPool || [];

      if (s.status === "deckbuilding" || s.roundIndex >= 45) {
        this.draftDuration = s.elapsedSeconds;
        this.setupDeckbuilder(s.playerPool, s.deckRecommendation);
        this.showStage("deck");
      } else if (s.status === "drafting") {
        const resumeTime = Date.now() - (s.elapsedSeconds || 0) * 1000;
        this.startTimer(resumeTime);
        this.renderArena(s);
        this.showStage("arena");
      }
    } catch {
      // Graceful fallback if background check fails
    }
  }

  startTimer(resumeTimestamp) {
    this.startTimestamp = resumeTimestamp || Date.now();
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
    this.isCoachAdviceEnabled = false;
    this.hideCoachAdvice();
    try {
      localStorage.removeItem("draftmaster_active_session_id");
    } catch {}

    if (this.dom.deckAiBanner) {
      this.dom.deckAiBanner.hidden = true;
    }

    if (this.dom.arenaHomologatedBadge) {
      this.dom.arenaHomologatedBadge.textContent = "🛡️ Homologué";
      this.dom.arenaHomologatedBadge.className = "hud-pill pill-homologated";
    }

    const publishToggle = document.getElementById("publish-to-leaderboard-toggle");
    if (publishToggle) publishToggle.checked = false;

    this.showStage("lobby");
  }

  async handleAbandonDraft() {
    const confirmed = window.confirm(
      "Voulez-vous vraiment quitter ce draft ? Votre progression sera annulée et réinitialisée."
    );
    if (!confirmed) return;
    await this.abandonDraft();
  }

  async abandonDraft() {
    const sessionId = this.sessionId;
    this.resetToLobby();

    if (sessionId) {
      try {
        await fetch("/api/draft/abandon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
      } catch (err) {
        console.warn("Erreur abandon draft:", err?.message || err);
      }
    }
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
      try {
        localStorage.setItem("draftmaster_active_session_id", this.sessionId);
      } catch {}

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
    if (this.adviceAbortController) {
      this.adviceAbortController.abort();
      this.adviceAbortController = null;
    }
    this.packNumber = session.packNumber;
    this.pickNumber = session.pickNumber;
    this.currentBooster = session.currentBooster || [];
    this.playerPool = session.playerPool || [];

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

    if (this.dom.coachAdviceBtn) {
      if (session.packNumber >= 2 && session.pickNumber === 1) {
        this.dom.coachAdviceBtn.innerHTML = `<span>📊 Bilan Pack ${session.packNumber} & Conseil IA ✨</span>`;
        this.dom.coachAdviceBtn.classList.add("btn-coach-review-highlight");
      } else {
        this.dom.coachAdviceBtn.innerHTML = "<span>💡 Conseil IA</span>";
        this.dom.coachAdviceBtn.classList.remove("btn-coach-review-highlight");
      }
    }

    // French assets are fetched only when the global preference asks for them.
    for (const card of this.cardLanguage === "FR" ? session.currentBooster : []) {
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
            if (this.cardLanguage === "FR" && img && updatedCard.frenchImageUrl) {
              img.src = updatedCard.frenchImageUrl;
            }
          }
          if (
            this.cardLanguage === "FR" &&
            this.activeHoveredCard?.instanceId === updatedCard.instanceId
          ) {
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
    if (!this.isCoachAdviceEnabled) {
      this.hideCoachAdvice();
    }
    if (this.dom.arenaHomologatedBadge) {
      if (session.isHomologated === false) {
        this.dom.arenaHomologatedBadge.textContent = "🎓 Entraînement (Conseil IA)";
        this.dom.arenaHomologatedBadge.className = "hud-pill pill-training";
      } else {
        this.dom.arenaHomologatedBadge.textContent = "🛡️ Homologué";
        this.dom.arenaHomologatedBadge.className = "hud-pill pill-homologated";
      }
    }

    if (this.dom.confirmPickBtn) {
      this.dom.confirmPickBtn.disabled = true;
      this.dom.confirmPickBtn.innerHTML = "<span>Sélectionnez une carte</span>";
    }

    if (!this.dom.boosterGrid) return;
    this.dom.boosterGrid.innerHTML = session.currentBooster
      .map((card) => {
        const displayName = getCardDisplayName(card, this.cardLanguage);

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
        loadImageWithFallback(
          image,
          getSoloCardImage(card, this.cardLanguage),
          getSoloCardFallbackImage(card, this.cardLanguage),
        );
      }

      el.addEventListener("click", () => {
        this.hideCardHoverPreview();
        this.selectCardForPick(id);
      });
      el.addEventListener("dblclick", () => {
        if (this.isConfirmingPick) return;
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

    // 4. Auto-trigger Coach Advice if user has activated it and not closed it
    if (this.isCoachAdviceEnabled) {
      if (this.dom.coachAdviceBox) {
        this.dom.coachAdviceBox.hidden = false;
        if (this.dom.coachAdviceContent) {
          this.dom.coachAdviceContent.innerHTML = `
            <div class="coach-advice-loading" style="padding: 1.25rem; color: #94a3b8; text-align: center; font-style: italic;">
              🧠 Analyse du nouveau booster par le coach IA en cours...
            </div>
          `;
        }
      }
      this.handleRequestAdvice();
    }
  }

  async handleRequestAdvice() {
    if (!this.sessionId || this.status !== "drafting") return;

    this.isCoachAdviceEnabled = true;

    const btn = this.dom.coachAdviceBtn;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = "<span>Analyse en cours... 🧠</span>";
    }

    if (this.adviceAbortController) {
      this.adviceAbortController.abort();
    }
    this.adviceAbortController = new AbortController();
    const signal = this.adviceAbortController.signal;
    const currentReqId = ++this.adviceRequestId;
    const currentPack = this.packNumber;
    const currentPick = this.pickNumber;

    try {
      const res = await fetch("/api/draft/advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: this.sessionId }),
        signal,
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Impossible d'obtenir le conseil de l'IA.");

      if (currentReqId !== this.adviceRequestId) return;
      if (!this.isCoachAdviceEnabled || this.status !== "drafting") return;
      if (this.packNumber !== currentPack || this.pickNumber !== currentPick) return;

      if (this.dom.arenaHomologatedBadge) {
        this.dom.arenaHomologatedBadge.textContent = "🎓 Entraînement (Conseil IA)";
        this.dom.arenaHomologatedBadge.className = "hud-pill pill-training";
      }

      this.displayCoachAdvice(data.advice);
    } catch (err) {
      if (err?.name === "AbortError") {
        return;
      }
      if (this.isCoachAdviceEnabled) {
        console.warn("Erreur conseil IA:", err?.message || err);
      }
    } finally {
      if (currentReqId === this.adviceRequestId && btn) {
        btn.disabled = false;
        if (this.packNumber >= 2 && this.pickNumber === 1) {
          btn.innerHTML = `<span>📊 Bilan Pack ${this.packNumber} & Conseil IA ✨</span>`;
        } else {
          btn.innerHTML = "<span>💡 Conseil IA</span>";
        }
      }
    }
  }

  displayCoachAdvice(advice) {
    if (!this.dom.coachAdviceBox || !this.dom.coachAdviceContent) return;
    if (!advice || !this.currentBooster || this.currentBooster.length === 0) return;

    const topId = advice.topPickId;
    const topName = (advice.topPickName || "").trim().toLowerCase();
    const boosterHasTopPick = this.currentBooster.some(
      (c) => c.instanceId === topId || (c.name && c.name.trim().toLowerCase() === topName),
    );

    if (!boosterHasTopPick) {
      console.warn("Conseil IA ignoré : la carte recommandée n'est pas dans le booster actuel.", advice.topPickName);
      return;
    }

    const altIds = new Set((advice.alternatives || []).map((a) => a.id));

    this.dom.boosterGrid?.querySelectorAll(".booster-card-item").forEach((el) => {
      const id = el.dataset.instanceId;
      el.classList.remove("ai-top-pick", "ai-alt-pick");
      if (id === topId) {
        el.classList.add("ai-top-pick");
      } else if (altIds.has(id)) {
        el.classList.add("ai-alt-pick");
      }
    });

    const altsHtml = (advice.alternatives || [])
      .map(
        (alt) => `
        <div class="coach-alt-item">
          <span class="coach-alt-name">🔄 ${escapeHtml(alt.name)}</span>
          <span class="coach-alt-reason">— ${escapeHtml(alt.reason)}</span>
        </div>
      `
      )
      .join("");

    let packReviewHtml = "";
    if (advice.packReview) {
      const pr = advice.packReview;
      const prioritiesList = (pr.priorities || [])
        .map((p) => `<li class="coach-review-p-item">${escapeHtml(p)}</li>`)
        .join("");

      packReviewHtml = `
        <div class="coach-pack-review">
          <div class="coach-review-header">
            <span class="coach-review-badge">📊 Bilan Début de Tour (Pack ${pr.packNumber})</span>
            <span class="coach-review-archetype">${escapeHtml(pr.archetypeLabel)}</span>
          </div>
          <div class="coach-review-summary">${escapeHtml(pr.poolSummary)}</div>

          <div class="coach-review-grid">
            <div class="coach-review-card">
              <div class="coach-review-card-title">📉 Courbe de Mana</div>
              <div class="coach-review-card-text">${escapeHtml(pr.curveAnalysis)}</div>
              <div class="coach-curve-pills">
                <span class="curve-pill">1: <strong>${pr.curveStats.oneDrops}</strong></span>
                <span class="curve-pill">2: <strong>${pr.curveStats.twoDrops}</strong></span>
                <span class="curve-pill">3: <strong>${pr.curveStats.threeDrops}</strong></span>
                <span class="curve-pill">4+: <strong>${pr.curveStats.fourPlusDrops}</strong></span>
                <span class="curve-pill">CMC: <strong>${pr.curveStats.avgCmc}</strong></span>
              </div>
            </div>

            <div class="coach-review-card">
              <div class="coach-review-card-title">⚡ Fixeurs & Terrains</div>
              <div class="coach-review-card-text">${escapeHtml(pr.fixingAnalysis)}</div>
              <div class="coach-fixing-pill ${pr.fixingStats?.isProportionGood ? "fixing-good" : "fixing-warning"}">
                ${pr.fixingStats?.isProportionGood ? "✅ Manabase saine" : "⚠️ Manabase à surveiller"} (${pr.fixingStats?.fixersCount || 0} fixeur(s) — Cible : ${escapeHtml(pr.fixingStats?.targetRecommendation || "")})
              </div>
            </div>
          </div>

          <div class="coach-review-priorities">
            <div class="coach-review-subtitle">🎯 Ce qu'il faut prioriser dans ce pack :</div>
            <ul class="coach-review-priorities-list">
              ${prioritiesList}
            </ul>
          </div>

          <div class="coach-review-signals">
            <span class="coach-review-signals-icon">💡</span>
            <em>${escapeHtml(pr.signalTip)}</em>
          </div>
        </div>
      `;
    }

    this.dom.coachAdviceContent.innerHTML = `
      ${packReviewHtml}
      <div class="coach-advice-top-pick">
        <div class="coach-top-pick-title">⭐ Recommandation Prioritaire : <strong>${escapeHtml(advice.topPickName)}</strong></div>
        <div class="coach-top-pick-reason">${escapeHtml(advice.reason)}</div>
      </div>
      ${
        advice.alternatives && advice.alternatives.length > 0
          ? `<div class="coach-advice-alts">
               <div style="font-weight: 700; color: #94a3b8; margin-bottom: 2px;">Alternatives viables :</div>
               ${altsHtml}
             </div>`
          : ""
      }
    `;

    this.dom.coachAdviceBox.hidden = false;
  }

  handleCloseCoachAdvice() {
    this.isCoachAdviceEnabled = false;
    this.hideCoachAdvice();
  }

  hideCoachAdvice() {
    if (this.dom.coachAdviceBox) {
      this.dom.coachAdviceBox.hidden = true;
    }
    this.dom.boosterGrid?.querySelectorAll(".booster-card-item").forEach((el) => {
      el.classList.remove("ai-top-pick", "ai-alt-pick");
    });
  }

  selectCardForPick(instanceId) {
    if (this.isConfirmingPick) return;
    this.selectedCardToPick = instanceId;
    this.dom.boosterGrid.querySelectorAll(".booster-card-item").forEach((el) => {
      el.classList.toggle("selected-pick", el.dataset.instanceId === instanceId);
    });

    const chosen = this.currentBooster.find((c) => c.instanceId === instanceId);
    if (this.dom.confirmPickBtn && chosen) {
      const chosenName = getCardDisplayName(chosen, this.cardLanguage);
      this.dom.confirmPickBtn.disabled = false;
      this.dom.confirmPickBtn.innerHTML = `<span>Choisir <strong>${escapeHtml(chosenName)}</strong> ✨</span>`;
    }
  }

  async handleConfirmPick() {
    if (this.isConfirmingPick || !this.selectedCardToPick) return;
    this.isConfirmingPick = true;

    if (this.adviceAbortController) {
      this.adviceAbortController.abort();
      this.adviceAbortController = null;
    }

    this.hideCardHoverPreview();
    if (!this.isCoachAdviceEnabled) {
      this.hideCoachAdvice();
    }
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
        this.isCoachAdviceEnabled = false;
        this.hideCoachAdvice();
        this.setupDeckbuilder(s.playerPool, s.deckRecommendation);
        this.showStage("deck");
      } else {
        this.renderArena(s);
      }
    } catch (err) {
      console.error("Erreur lors du pick:", err);
      alert(`Erreur : ${err.message}`);
      if (this.dom.confirmPickBtn) {
        this.dom.confirmPickBtn.disabled = false;
        this.dom.confirmPickBtn.innerHTML = "<span>Sélectionnez une carte</span>";
      }
      await this.resyncSession();
    } finally {
      this.isConfirmingPick = false;
    }
  }

  async resyncSession() {
    if (!this.sessionId) return;
    try {
      const res = await fetch(`/api/draft/session?sessionId=${encodeURIComponent(this.sessionId)}`);
      const data = await res.json();
      if (data.ok && data.session) {
        const s = data.session;
        this.currentBooster = s.currentBooster;
        this.playerPool = s.playerPool;
        this.status = s.status;
        if (s.status === "deckbuilding" || s.roundIndex >= 45) {
          this.draftDuration = s.elapsedSeconds;
          this.isCoachAdviceEnabled = false;
          this.hideCoachAdvice();
          this.setupDeckbuilder(s.playerPool, s.deckRecommendation);
          this.showStage("deck");
        } else {
          this.renderArena(s);
        }
      }
    } catch (e) {
      console.warn("Échec resynchronisation session:", e);
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
        const displayName = getCardDisplayName(card, this.cardLanguage);
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
          loadImageWithFallback(
            image,
            getSoloCardImage(card, this.cardLanguage),
            getSoloCardFallbackImage(card, this.cardLanguage),
          );
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

    const targetSrc = getSoloCardImage(card, this.cardLanguage, true);
    const fallbackSrc = getSoloCardFallbackImage(card, this.cardLanguage);

    popoverImg.alt = getCardDisplayName(card, this.cardLanguage);
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

    if (this.cardLanguage === "FR" && !card.frenchImageUrl) {
      fetchFrenchCard(card, (updated) => {
        if (this.cardLanguage === "FR" && this.activeHoveredCard?.instanceId === updated.instanceId) {
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

  setupDeckbuilder(pool, recommendation) {
    if (
      recommendation &&
      Array.isArray(recommendation.maindeckCardInstanceIds) &&
      recommendation.maindeckCardInstanceIds.length > 0
    ) {
      this.applyDeckRecommendation(recommendation);
      return;
    }

    // Attempt fetching recommendation asynchronously if not provided
    this.handleRequestDeckRecommendation(true).catch(() => {
      // Fallback: top 23 non-land cards by static score
      const nonLands = pool.filter((c) => !c.isLand);
      const sortedNonLands = [...nonLands].sort((a, b) => b.staticScore - a.staticScore);
      const initialMaindeck = sortedNonLands.slice(0, 23);

      this.maindeckSpellIds = new Set(initialMaindeck.map((c) => c.instanceId));
      this.autoCalculateLands();
      this.renderDeckbuilder();
    });
  }

  applyDeckRecommendation(recommendation) {
    this.maindeckSpellIds = new Set(recommendation.maindeckCardInstanceIds);
    if (recommendation.basicLands) {
      this.basicLands = { ...recommendation.basicLands };
    } else {
      this.autoCalculateLands();
    }

    if (this.dom.deckAiBanner && this.dom.deckAiBannerText) {
      const arch = recommendation.archetype?.label || "Synergique";
      const tier = recommendation.overallTier ? ` • TIER ${recommendation.overallTier}` : "";
      this.dom.deckAiBannerText.textContent = `✨ Pré-construction IA appliquée : Archétype ${arch}${tier}`;
      this.dom.deckAiBanner.hidden = false;
    }

    this.updateLandsDisplay();
    this.renderDeckbuilder();
  }

  async handleRequestDeckRecommendation(silent = false) {
    if (!this.sessionId) return;
    const btn = this.dom.deckAiRecommendBtn;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = "<span>Analyse en cours... 🧠</span>";
    }

    try {
      const res = await fetch("/api/draft/recommend-deck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: this.sessionId }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Impossible d'obtenir la pré-construction IA.");

      this.applyDeckRecommendation(data.recommendation);
    } catch (err) {
      if (!silent) {
        alert(`Erreur IA : ${err.message}`);
      }
      throw err;
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = "<span>🧙 Pré-construire avec l'IA</span>";
      }
    }
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
            loadImageWithFallback(
              image,
              getSoloCardImage(card, this.cardLanguage),
              getSoloCardFallbackImage(card, this.cardLanguage),
            );
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
            loadImageWithFallback(
              image,
              getSoloCardImage(card, this.cardLanguage),
              getSoloCardFallbackImage(card, this.cardLanguage),
            );
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
    const displayName = getCardDisplayName(card, this.cardLanguage);

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

      try {
        localStorage.removeItem("draftmaster_active_session_id");
      } catch {}

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

    // Overall Tier (Tiers only)
    const { grade, css } = getScoreGrade(d.overallScore);
    const overallTier = d.overallTier || grade;
    if (this.dom.resultScoreGrade) {
      this.dom.resultScoreGrade.textContent = `TIER ${overallTier}`;
      this.dom.resultScoreGrade.className = `result-grade-badge ${css}`;
    }
    if (this.dom.resultScoreVal) {
      this.dom.resultScoreVal.textContent = `TIER ${overallTier}`;
    }

    // Archetype
    if (this.dom.resultArchetypeLabel) {
      this.dom.resultArchetypeLabel.textContent = d.archetype?.label || "Libre";
    }
    if (this.dom.resultArchetypeDesc) {
      this.dom.resultArchetypeDesc.textContent = d.archetype?.description || "";
    }

    // Radar 5 Axes - Tiers only
    const radarTiers = d.radarTiers || {
      power: getScoreGrade(d.radar.power).grade,
      synergy: getScoreGrade(d.radar.synergy).grade,
      curve: getScoreGrade(d.radar.curve).grade,
      mana: getScoreGrade(d.radar.mana).grade,
      interaction: getScoreGrade(d.radar.interaction).grade,
    };

    const axes = [
      { id: "power", label: "Puissance", val: d.radar.power, tier: radarTiers.power },
      { id: "synergy", label: "Synergie", val: d.radar.synergy, tier: radarTiers.synergy },
      { id: "curve", label: "Courbe", val: d.radar.curve, tier: radarTiers.curve },
      { id: "mana", label: "Mana", val: d.radar.mana, tier: radarTiers.mana },
      { id: "interaction", label: "Interaction", val: d.radar.interaction, tier: radarTiers.interaction },
    ];

    axes.forEach((axis) => {
      const bar = document.getElementById(`result-radar-bar-${axis.id}`);
      const val = document.getElementById(`result-radar-val-${axis.id}`);
      if (bar) bar.style.width = `${String(axis.val)}%`;
      if (val) {
        val.textContent = `TIER ${axis.tier}`;
        val.className = `axis-tier-badge grade-${axis.tier.toLowerCase()}`;
      }
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

    // 8-Seat Final Decks Comparison
    if (this.dom.resultSeatsGrid && Array.isArray(result.seats)) {
      const SEAT_AVATARS = ["🧙", "🤖", "🤖", "🤖", "🤖", "👑", "🏆", "📜"];
      const SEAT_LABELS = [
        "Vous (Siège 0)",
        "Bot 1 (Gauche)",
        "Bot 2 (Face)",
        "Bot 3 (Face)",
        "Bot 4 (Face)",
        "Bot 5 (Face)",
        "Bot 6 (Face)",
        "Bot 7 (Droite)",
      ];

      this.dom.resultSeatsGrid.innerHTML = result.seats
        .map((seat) => {
          const deck = seat.deck;
          const seatTier = deck?.overallTier || (deck?.overallScore ? getScoreGrade(deck.overallScore).grade : "B");
          const tierCss = `grade-${seatTier.toLowerCase()}`;
          const isHuman = seat.seatId === 0;
          const avatar = SEAT_AVATARS[seat.seatId] || (isHuman ? "🧙" : "🤖");
          const label = SEAT_LABELS[seat.seatId] || `Siège ${seat.seatId}`;
          const name = seat.botName || (isHuman ? this.playerName : `Bot ${seat.seatId}`);
          const arch = deck?.archetype?.label || "Libre";

          const sRadar = deck?.radarTiers || {
            power: getScoreGrade(deck?.radar?.power ?? 70).grade,
            synergy: getScoreGrade(deck?.radar?.synergy ?? 70).grade,
            curve: getScoreGrade(deck?.radar?.curve ?? 70).grade,
            mana: getScoreGrade(deck?.radar?.mana ?? 70).grade,
            interaction: getScoreGrade(deck?.radar?.interaction ?? 70).grade,
          };

          return `
            <div class="seat-comparison-card ${isHuman ? "is-human" : ""}">
              <div class="seat-card-header">
                <div class="seat-card-identity">
                  <span class="seat-card-avatar">${avatar}</span>
                  <div class="seat-card-name-wrap">
                    <span class="seat-card-name">${escapeHtml(name)}</span>
                    <span class="seat-card-label">${escapeHtml(label)}</span>
                  </div>
                </div>
                <span class="seat-card-tier-pill ${tierCss}">TIER ${seatTier}</span>
              </div>
              <div class="seat-card-archetype">🎭 ${escapeHtml(arch)}</div>
              <div class="seat-card-axes-mini">
                <div class="mini-axis-col" title="Puissance">
                  <span class="mini-axis-label">PWR</span>
                  <span class="mini-axis-tier grade-${sRadar.power.toLowerCase()}">${sRadar.power}</span>
                </div>
                <div class="mini-axis-col" title="Synergie">
                  <span class="mini-axis-label">SYN</span>
                  <span class="mini-axis-tier grade-${sRadar.synergy.toLowerCase()}">${sRadar.synergy}</span>
                </div>
                <div class="mini-axis-col" title="Courbe">
                  <span class="mini-axis-label">CRV</span>
                  <span class="mini-axis-tier grade-${sRadar.curve.toLowerCase()}">${sRadar.curve}</span>
                </div>
                <div class="mini-axis-col" title="Mana">
                  <span class="mini-axis-label">MAN</span>
                  <span class="mini-axis-tier grade-${sRadar.mana.toLowerCase()}">${sRadar.mana}</span>
                </div>
                <div class="mini-axis-col" title="Interaction">
                  <span class="mini-axis-label">INT</span>
                  <span class="mini-axis-tier grade-${sRadar.interaction.toLowerCase()}">${sRadar.interaction}</span>
                </div>
              </div>
              <button type="button" class="btn-inspect-deck" data-seat-id="${seat.seatId}">
                <span>🔍 Inspecter le Deck (40 Cartes)</span>
              </button>
            </div>
          `;
        })
        .join("");

      this.dom.resultSeatsGrid.querySelectorAll(".btn-inspect-deck").forEach((btn) => {
        btn.addEventListener("click", () => {
          const seatId = Number(btn.dataset.seatId);
          const targetSeat = result.seats.find((s) => s.seatId === seatId);
          if (targetSeat && targetSeat.deck) {
            const displayName = targetSeat.botName || (seatId === 0 ? this.playerName : `Bot ${seatId}`);
            openDeckShowcaseModal({
              playerName: displayName,
              evaluation: targetSeat.deck,
            });
          }
        });
      });
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
  const cardLanguage = readCardLanguage();
  const overallScore = evaluation.overallScore ?? resultOrDeck.overallScore ?? 75;
  const archetype = evaluation.archetype || resultOrDeck.archetype || { label: "Deck Libre" };
  const playerName = resultOrDeck.playerName || "Magicien";
  const { grade, css } = getScoreGrade(overallScore);

  const tier = evaluation.overallTier || grade;

  if (titleEl) titleEl.textContent = `${playerName} • Deck Showcase`;
  if (subEl) subEl.textContent = `${archetype.label || "Libre"} • TIER ${tier}`;

  const deckId = resultOrDeck.leaderboardEntry?.id || resultOrDeck.sessionId || resultOrDeck.id;
  const shareUrl = `${window.location.origin}/?deck=${deckId}`;
  const shareText = `🔥 Regarde le deck ${archetype.label || "Magic"} que je viens de drafter sur LMCDEU ! TIER ${tier} 🏆\n${shareUrl}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

  const maindeckCards =
    evaluation.allMaindeck ||
    resultOrDeck.maindeckCards ||
    resultOrDeck.maindeck_cards ||
    [];

  const cardsHtml = maindeckCards
    .map((c) => {
      const name = getCardDisplayName(c, cardLanguage);
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
        <span style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Évaluation Globale</span>
        <div class="score-grade-pill ${css}" style="font-size: 1.4rem; padding: 6px 18px; margin-top: 4px; display: inline-block;">
          TIER ${tier}
        </div>
      </div>
      <div style="text-align: right;">
        <span style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Archétype</span>
        <div style="font-size: 1rem; color: #93c5fd; font-weight: 700; margin-top: 4px;">
          ${escapeHtml(archetype.label || "Libre")}
        </div>
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
      loadImageWithFallback(
        image,
        getSoloCardImage(card, cardLanguage),
        getSoloCardFallbackImage(card, cardLanguage),
      );
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
