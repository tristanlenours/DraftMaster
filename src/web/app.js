import { initAdminView } from "./admin.js";
import { elements, hydrateCardFromFrenchCache, state } from "./app-state.js";
import { hideCardPopover, renderMatrix } from "./card-explorer.js";
import { writeCardLanguage } from "./card-language.js";
import { closeModal, updateModalCardText, updateModalComparisonCardNames } from "./card-modal.js";
import { CUBE_CONFIGS } from "./cube-config.js";
import { renderCubesPage, selectCube } from "./cubes-view.js";
import { initDeckLabView } from "./deck-lab.js";
import { initSupabaseRealtime } from "./leaderboard.js";
import { deactivateMultiplayerDraftView, initMultiplayerDraftView } from "./multiplayer-draft.js";
import { loadAndRenderLeaderboard, openDeckReviewModal } from "./records-view.js";
import { SoloDraftController, openDeckShowcaseModal } from "./solo-draft.js";
import { initTournamentManagementView } from "./tournaments.js";

// Solo Draft & Leaderboard State
let soloDraftCtrl = null;

function initSoloDraft() {
  soloDraftCtrl = new SoloDraftController(
    {
      lobbyStage: document.getElementById("draft-lobby-stage"),
      arenaStage: document.getElementById("draft-arena-stage"),
      deckStage: document.getElementById("draft-deckbuilder-stage"),
      resultStage: document.getElementById("draft-result-stage"),

      playerNameInput: document.getElementById("draft-player-name"),
      startBtn: document.getElementById("start-solo-draft-btn"),

      hudPlayerBadge: document.getElementById("hud-player-badge"),
      hudPackNumber: document.getElementById("hud-pack-num"),
      hudPickNumber: document.getElementById("hud-pick-num"),
      hudDirection: document.getElementById("hud-direction"),
      hudProgressBar: document.getElementById("hud-progress-fill"),
      arenaTimer: document.getElementById("arena-timer"),
      confirmPickBtn: document.getElementById("draft-confirm-pick-btn"),
      boosterGrid: document.getElementById("draft-booster-grid"),
      poolContainer: document.getElementById("draft-pool-container"),
      poolCountBadge: document.getElementById("pool-count-badge"),
      coachAdviceBtn: document.getElementById("draft-coach-advice-btn"),
      coachAdviceBox: document.getElementById("arena-coach-advice-box"),
      coachAdviceContent: document.getElementById("coach-advice-content"),
      coachAdviceCloseBtn: document.getElementById("coach-advice-close-btn"),
      arenaHomologatedBadge: document.getElementById("arena-homologated-badge"),

      deckSpellsCounter: document.getElementById("deck-spells-counter"),
      totalLandsBadge: document.getElementById("total-lands-badge"),
      deckTimer: document.getElementById("deck-timer"),
      deckAiRecommendBtn: document.getElementById("deck-ai-recommend-btn"),
      deckAiBanner: document.getElementById("deckbuilder-ai-banner"),
      deckAiBannerText: document.getElementById("deckbuilder-ai-banner-text"),
      maindeckContainer: document.getElementById("deck-maindeck-container"),
      sideboardContainer: document.getElementById("deck-sideboard-container"),
      autoLandsBtn: document.getElementById("auto-calculate-lands-btn"),
      landRationale: document.getElementById("solo-land-rationale"),
      validateDeckBtn: document.getElementById("draft-validate-deck-btn"),

      abandonBtn: document.getElementById("draft-abandon-btn"),
      deckAbandonBtn: document.getElementById("deck-abandon-btn"),

      resultHighScoreBanner: document.getElementById("result-highscore-banner"),
      resultScoreVal: document.getElementById("result-score-val"),
      resultScoreGrade: document.getElementById("result-score-grade"),
      resultArchetypeLabel: document.getElementById("result-archetype-label"),
      resultArchetypeDesc: document.getElementById("result-archetype-desc"),
      resultRankBadge: document.getElementById("result-rank-badge"),
      resultChronoText: document.getElementById("result-chrono-text"),
      resultStrengthsList: document.getElementById("result-strengths-list"),
      resultWeaknessesList: document.getElementById("result-weaknesses-list"),
      resultSeatsGrid: document.getElementById("result-seats-comparison-grid"),
      openWalkthroughBtn: document.getElementById("btn-open-walkthrough-report"),
      openBoostersBtn: document.getElementById("btn-open-boosters-report"),
      goToRecordsBtn: document.getElementById("btn-go-to-records"),
      restartBtn: document.getElementById("btn-restart-draft"),
    },
    {
      onNavigateToRecords: () => navigateTo("records"),
      getCardLanguage: () => state.cardLanguage,
    },
  );
}

function syncLanguageControls() {
  const isFr = state.cardLanguage === "FR";
  [elements.globalLangFr, elements.langChipFr, elements.langBtnFr].forEach((button) => {
    button?.classList.toggle("active", isFr);
    button?.setAttribute("aria-pressed", String(isFr));
  });
  [elements.globalLangEn, elements.langChipEn, elements.langBtnEn].forEach((button) => {
    button?.classList.toggle("active", !isFr);
    button?.setAttribute("aria-pressed", String(!isFr));
  });
}

function setGlobalCardLanguage(language) {
  state.cardLanguage = writeCardLanguage(language);
  window.dispatchEvent(new Event("draftmaster:card-language-change"));
  syncLanguageControls();
  hideCardPopover();
  renderMatrix();
  soloDraftCtrl?.setCardLanguage(state.cardLanguage);
  if (state.selectedDeckReview && elements.deckReviewBackdrop?.classList.contains("is-open")) {
    openDeckReviewModal(state.selectedDeckReview);
  }
  if (state.selectedCard && elements.modalBackdrop?.classList.contains("is-open")) {
    updateModalCardText(state.selectedCard);
    updateModalComparisonCardNames(state.selectedCardComparison, state.selectedCard);
  }
}

// Initialize Application
async function initApp() {
  if (elements.cubeSelect) {
    elements.cubeSelect.value = state.activeCubeKey;
  }
  syncLanguageControls();
  setupEventListeners();
  initSoloDraft();
  initAuthControls();
  initWhaouFeatures();
  initColibriPopin();
  await loadData();
  renderMatrix();
  renderCubesPage();
  initRouter();
}

function dismissColibriPopin() {
  const modal = document.getElementById("colibri-ad-modal");
  if (!modal || modal.hasAttribute("hidden") || modal.classList.contains("is-closing")) {
    return;
  }
  try {
    localStorage.setItem("lmcdeu_colibri_pub_seen", "true");
  } catch {
    // Mode privé ou sans localStorage
  }
  modal.classList.add("is-closing");
  setTimeout(() => {
    modal.setAttribute("hidden", "");
    modal.classList.remove("is-closing");
  }, 220);
}

function initColibriPopin() {
  const STORAGE_KEY = "lmcdeu_colibri_pub_seen";
  const modal = document.getElementById("colibri-ad-modal");
  if (!modal) return;

  // Helpers globaux exposés pour tester, déboguer ou relancer le gag
  window.showColibriPopin = (force = true) => {
    if (force) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
    modal.removeAttribute("hidden");
    modal.classList.remove("is-closing");
  };

  window.resetColibriPopin = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  // Fermeture immédiate dès le moindre clic n'importe où
  modal.addEventListener("click", () => {
    dismissColibriPopin();
  });

  // Touche Échap pour l'accessibilité
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hasAttribute("hidden")) {
      dismissColibriPopin();
    }
  });

  // Éviter l'affichage automatique dans les tests headless Playwright
  if (navigator.webdriver) {
    return;
  }

  // Ne l'afficher qu'une seule fois
  try {
    if (localStorage.getItem(STORAGE_KEY) === "true") {
      return;
    }
  } catch {
    // Continue si indisponible
  }

  // Déclenchement naturel après 750ms
  setTimeout(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "true") {
        return;
      }
    } catch {}
    modal.removeAttribute("hidden");
  }, 750);
}

async function initAuthControls() {
  const btnLogout = document.getElementById("nav-btn-logout");
  const btnLogoutMobile = document.getElementById("mobile-nav-logout");

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.reload();
    }
  }

  btnLogout?.addEventListener("click", handleLogout);
  btnLogoutMobile?.addEventListener("click", handleLogout);

  try {
    const res = await fetch("/api/auth/status");
    if (res.ok) {
      const data = await res.json();
      if (data.protectionEnabled && data.authenticated) {
        if (btnLogout) btnLogout.style.display = "inline-flex";
        if (btnLogoutMobile) btnLogoutMobile.style.display = "flex";
      }
    }
  } catch {
    // Mode hors-ligne ou test
  }
}

function initWhaouFeatures() {
  // 1. Abonnement Supabase Realtime
  initSupabaseRealtime(() => {
    if (state.currentView === "records") {
      loadAndRenderLeaderboard();
    }
  });

  // 2. Consultation d'un deck via lien partagé ?deck=<id>
  const urlParams = new URLSearchParams(window.location.search);
  const deckParam = urlParams.get("deck");
  if (deckParam) {
    fetch(`/api/deck/${encodeURIComponent(deckParam)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ok && data.deck) {
          openDeckShowcaseModal(data.deck);
        }
      })
      .catch((err) => console.warn("Erreur ouverture deck partagé :", err));
  }
}

// Router & SPA View Management
export function navigateTo(viewName, cubeKey = null) {
  if (cubeKey) {
    state.activeCubeKey = cubeKey;
    state.detailCubeKey = cubeKey;
    if (elements.cubeSelect) elements.cubeSelect.value = cubeKey;
  }

  // Si l'utilisateur quitte le draft vers une autre section du menu (ex: les cubes, home, records...), on termine et réinitialise le draft
  if (
    soloDraftCtrl &&
    viewName !== "draft" &&
    (soloDraftCtrl.status === "drafting" || soloDraftCtrl.status === "deckbuilding")
  ) {
    soloDraftCtrl.abandonDraft();
  }

  if (state.currentView === "multi" && viewName !== "multi") {
    deactivateMultiplayerDraftView();
  }
  state.currentView = viewName;

  // Header active tabs (Desktop)
  elements.navBtnCubes?.classList.toggle("active", viewName === "cubes");
  elements.navBtnCards?.classList.toggle("active", viewName === "cards");
  elements.navBtnBots?.classList.toggle("active", viewName === "bots");
  elements.navBtnDraft?.classList.toggle("active", viewName === "draft");
  elements.navBtnRecords?.classList.toggle("active", viewName === "records");
  elements.navBtnMulti?.classList.toggle("active", viewName === "multi");
  elements.navBtnTournaments?.classList.toggle("active", viewName === "tournaments");
  elements.navBtnDeckLab?.classList.toggle("active", viewName === "deck-lab");

  // Header active tabs (Mobile Drawer)
  elements.mobileNavCubes?.classList.toggle("active", viewName === "cubes");
  elements.mobileNavCards?.classList.toggle("active", viewName === "cards");
  elements.mobileNavBots?.classList.toggle("active", viewName === "bots");
  elements.mobileNavDraft?.classList.toggle("active", viewName === "draft");
  elements.mobileNavRecords?.classList.toggle("active", viewName === "records");
  elements.mobileNavMulti?.classList.toggle("active", viewName === "multi");
  elements.mobileNavTournaments?.classList.toggle("active", viewName === "tournaments");
  elements.mobileNavDeckLab?.classList.toggle("active", viewName === "deck-lab");

  // Show/Hide Views
  if (elements.viewHome) {
    elements.viewHome.hidden = viewName !== "home";
    elements.viewHome.style.display = viewName === "home" ? "block" : "none";
  }
  if (elements.viewCubes) {
    elements.viewCubes.hidden = viewName !== "cubes";
    elements.viewCubes.style.display = viewName === "cubes" ? "block" : "none";
  }
  if (elements.viewCards) {
    elements.viewCards.hidden = viewName !== "cards";
    elements.viewCards.style.display = viewName === "cards" ? "block" : "none";
  }
  if (elements.viewBots) {
    elements.viewBots.hidden = viewName !== "bots";
    elements.viewBots.style.display = viewName === "bots" ? "block" : "none";
  }
  if (elements.viewDraft) {
    elements.viewDraft.hidden = viewName !== "draft";
    elements.viewDraft.style.display = viewName === "draft" ? "block" : "none";
  }
  if (elements.viewRecords) {
    elements.viewRecords.hidden = viewName !== "records";
    elements.viewRecords.style.display = viewName === "records" ? "block" : "none";
  }
  if (elements.viewAdmin) {
    elements.viewAdmin.hidden = viewName !== "admin";
    elements.viewAdmin.style.display = viewName === "admin" ? "block" : "none";
  }
  if (elements.viewMulti) {
    elements.viewMulti.hidden = viewName !== "multi";
    elements.viewMulti.style.display = viewName === "multi" ? "block" : "none";
  }
  if (elements.viewTournaments) {
    elements.viewTournaments.hidden = viewName !== "tournaments";
    elements.viewTournaments.style.display = viewName === "tournaments" ? "block" : "none";
  }
  if (elements.viewDeckLab) {
    elements.viewDeckLab.hidden = viewName !== "deck-lab";
    elements.viewDeckLab.style.display = viewName === "deck-lab" ? "block" : "none";
  }

  // URL routing
  let targetPath = "/";
  if (viewName === "cards") targetPath = "/cards";
  else if (viewName === "cubes") targetPath = "/cubes";
  else if (viewName === "bots") targetPath = "/bots";
  else if (viewName === "draft") targetPath = "/draft";
  else if (viewName === "records") targetPath = "/records";
  else if (viewName === "admin") targetPath = "/admin";
  else if (viewName === "multi") targetPath = "/multi";
  else if (viewName === "tournaments") targetPath = "/tournaments";
  else if (viewName === "deck-lab") targetPath = "/deck-lab";

  if (window.location.pathname !== targetPath) {
    window.history.pushState({ view: viewName, cube: cubeKey }, "", targetPath);
  }

  if (viewName === "cubes") {
    renderCubesPage();
  } else if (viewName === "cards") {
    renderMatrix();
  } else if (viewName === "records") {
    loadAndRenderLeaderboard();
  } else if (viewName === "admin") {
    initAdminView();
  } else if (viewName === "multi") {
    initMultiplayerDraftView();
  } else if (viewName === "tournaments") {
    void initTournamentManagementView();
  } else if (viewName === "deck-lab") {
    void initDeckLabView(state.activeCubeKey);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function initRouter() {
  const path = window.location.pathname;
  const hash = window.location.hash.toLowerCase();

  let initialView = "home";
  if (path === "/cards" || hash === "#cards") {
    initialView = "cards";
  } else if (path === "/cubes" || hash === "#cubes") {
    initialView = "cubes";
  } else if (path === "/bots" || hash === "#bots") {
    initialView = "bots";
  } else if (path === "/draft" || hash === "#draft") {
    initialView = "draft";
  } else if (path === "/records" || hash === "#records") {
    initialView = "records";
  } else if (path === "/admin" || hash === "#admin") {
    initialView = "admin";
  } else if (path === "/multi" || hash === "#multi") {
    initialView = "multi";
  } else if (path === "/tournaments" || hash === "#tournaments") {
    initialView = "tournaments";
  } else if (path === "/deck-lab" || hash === "#deck-lab") {
    initialView = "deck-lab";
  }

  navigateTo(initialView, state.activeCubeKey);

  window.addEventListener("popstate", () => {
    const p = window.location.pathname;
    if (p === "/cards") navigateTo("cards");
    else if (p === "/cubes") navigateTo("cubes");
    else if (p === "/bots") navigateTo("bots");
    else if (p === "/draft") navigateTo("draft");
    else if (p === "/records") navigateTo("records");
    else if (p === "/admin") navigateTo("admin");
    else if (p === "/multi") navigateTo("multi");
    else if (p === "/tournaments") navigateTo("tournaments");
    else if (p === "/deck-lab") navigateTo("deck-lab");
    else navigateTo("home");
  });
}

// Mobile Navigation Drawer Helpers
function toggleMobileNav(forceOpen = null) {
  if (!elements.mobileNavDrawer) return;
  const isCurrentlyOpen = elements.mobileMenuBtn?.classList.contains("open");
  const shouldOpen = forceOpen !== null ? forceOpen : !isCurrentlyOpen;

  elements.mobileMenuBtn?.classList.toggle("open", shouldOpen);
  elements.mobileMenuBtn?.setAttribute("aria-expanded", String(shouldOpen));
  elements.mobileNavDrawer.hidden = !shouldOpen;
  if (elements.mobileNavBackdrop) {
    elements.mobileNavBackdrop.hidden = !shouldOpen;
  }
}

function closeMobileNav() {
  toggleMobileNav(false);
}

// Event Listeners Setup
function setupEventListeners() {
  // SPA Navigation handlers (Desktop)
  elements.brandHomeBtn?.addEventListener("click", () => navigateTo("home"));
  elements.brandHomeBtn?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    navigateTo("home");
  });
  elements.navBtnCubes?.addEventListener("click", () => navigateTo("cubes"));
  elements.navBtnCards?.addEventListener("click", () => navigateTo("cards"));
  elements.navBtnBots?.addEventListener("click", () => navigateTo("bots"));
  elements.navBtnDraft?.addEventListener("click", () => navigateTo("draft"));
  elements.navBtnRecords?.addEventListener("click", () => navigateTo("records"));
  elements.navBtnMulti?.addEventListener("click", () => navigateTo("multi"));
  elements.navBtnTournaments?.addEventListener("click", () => navigateTo("tournaments"));
  elements.navBtnDeckLab?.addEventListener("click", () => navigateTo("deck-lab"));

  // SPA Navigation handlers (Mobile Drawer)
  elements.mobileMenuBtn?.addEventListener("click", () => toggleMobileNav());
  elements.mobileNavBackdrop?.addEventListener("click", () => closeMobileNav());
  elements.mobileNavCubes?.addEventListener("click", () => {
    navigateTo("cubes");
    closeMobileNav();
  });
  elements.mobileNavCards?.addEventListener("click", () => {
    navigateTo("cards");
    closeMobileNav();
  });
  elements.mobileNavBots?.addEventListener("click", () => {
    navigateTo("bots");
    closeMobileNav();
  });
  elements.mobileNavDraft?.addEventListener("click", () => {
    navigateTo("draft");
    closeMobileNav();
  });
  elements.mobileNavRecords?.addEventListener("click", () => {
    navigateTo("records");
    closeMobileNav();
  });
  elements.mobileNavMulti?.addEventListener("click", () => {
    navigateTo("multi");
    closeMobileNav();
  });
  elements.mobileNavTournaments?.addEventListener("click", () => {
    navigateTo("tournaments");
    closeMobileNav();
  });
  elements.mobileNavDeckLab?.addEventListener("click", () => {
    navigateTo("deck-lab");
    closeMobileNav();
  });

  // Close mobile drawer on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMobileNav();
    }
  });

  elements.homeCtaDraft?.addEventListener("click", () => navigateTo("draft"));
  elements.homeCtaCubes?.addEventListener("click", () => navigateTo("cubes"));
  elements.homeCtaCards?.addEventListener("click", () => navigateTo("cards"));
  elements.homeCtaBots?.addEventListener("click", () => navigateTo("bots"));
  elements.homeCtaMulti?.addEventListener("click", () => navigateTo("multi"));
  elements.homeCtaTournaments?.addEventListener("click", () => navigateTo("tournaments"));

  // Teaser VIP / Pilot Submissions
  elements.btnMultiVip?.addEventListener("click", () => {
    const val = elements.multiVipEmail?.value?.trim();
    if (!val) {
      if (elements.multiVipFeedback) {
        elements.multiVipFeedback.textContent = "Veuillez saisir votre pseudo Discord ou e-mail.";
        elements.multiVipFeedback.style.color = "var(--accent-coral)";
      }
      return;
    }
    if (elements.multiVipFeedback) {
      elements.multiVipFeedback.textContent =
        "✨ Inscription enregistrée ! Vous serez averti en priorité dès l'ouverture des pods alpha.";
      elements.multiVipFeedback.style.color = "var(--accent-gold)";
    }
    if (typeof confetti === "function") {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    }
  });

  elements.deckReviewCloseBtn?.addEventListener("click", () => {
    if (elements.deckReviewBackdrop) {
      elements.deckReviewBackdrop.classList.remove("is-open");
      elements.deckReviewBackdrop.hidden = true;
    }
  });
  elements.deckReviewBackdrop?.addEventListener("click", (e) => {
    if (e.target === elements.deckReviewBackdrop) {
      elements.deckReviewBackdrop.classList.remove("is-open");
      elements.deckReviewBackdrop.hidden = true;
    }
  });

  // Bots Filters (Style & Level)
  let activeBotStyle = "ALL";
  let activeBotLevel = "ALL";

  function applyBotFilters() {
    const cards = document.querySelectorAll(".bot-card");
    cards.forEach((card) => {
      const cardStyle = card.dataset.style;
      const cardLevel = card.dataset.level;

      const matchesStyle = activeBotStyle === "ALL" || cardStyle === activeBotStyle;
      const matchesLevel = activeBotLevel === "ALL" || cardLevel === activeBotLevel;

      if (matchesStyle && matchesLevel) {
        card.style.display = "flex";
      } else {
        card.style.display = "none";
      }
    });
  }

  document.querySelectorAll("#bots-style-filter .bot-filter-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document
        .querySelectorAll("#bots-style-filter .bot-filter-btn")
        .forEach((b) => b.classList.remove("active"));
      e.currentTarget.classList.add("active");
      activeBotStyle = e.currentTarget.dataset.style;
      applyBotFilters();
    });
  });

  document.querySelectorAll("#bots-level-filter .bot-filter-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document
        .querySelectorAll("#bots-level-filter .bot-filter-btn")
        .forEach((b) => b.classList.remove("active"));
      e.currentTarget.classList.add("active");
      activeBotLevel = e.currentTarget.dataset.level;
      applyBotFilters();
    });
  });

  // Signature card chip click -> go to cards view with search query
  document.querySelectorAll(".sig-card-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const cardName = chip.dataset.search || chip.textContent.trim();
      navigateTo("cards");
      if (elements.cardSearchInput) {
        elements.cardSearchInput.value = cardName;
        state.searchQuery = cardName.toLowerCase();
        renderMatrix();
      }
    });
  });

  // Home cube teaser clicks
  document.querySelectorAll(".btn-explore-cube").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const targetCube = e.currentTarget.dataset.cubeTarget;
      navigateTo("cubes", targetCube);
    });
  });

  // Comparison table tab clicks & mobile card deep-dive triggers
  document.querySelectorAll(".btn-select-cube-tab").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const targetCube = e.currentTarget.dataset.tabCube;
      if (targetCube) {
        selectCube(targetCube);
      }
      if (e.currentTarget.classList.contains("btn-mobile-card-action")) {
        elements.cubeDetailPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // Cubes Mobile Mode Toggle (Cards vs Table)
  elements.btnCubesModeCards?.addEventListener("click", () => {
    elements.btnCubesModeCards?.classList.add("active");
    elements.btnCubesModeTable?.classList.remove("active");
    elements.viewCubes?.classList.remove("table-mode");
  });
  elements.btnCubesModeTable?.addEventListener("click", () => {
    elements.btnCubesModeTable?.classList.add("active");
    elements.btnCubesModeCards?.classList.remove("active");
    elements.viewCubes?.classList.add("table-mode");
  });

  // Mobile Cube Selector Pills
  document.querySelectorAll(".cube-pill").forEach((pill) => {
    pill.addEventListener("click", (e) => {
      const targetCube = e.currentTarget.dataset.pillCube;
      if (targetCube) {
        selectCube(targetCube);
      }
    });
  });

  // Cube selector change in matrix controls
  elements.cubeSelect.addEventListener("change", (e) => {
    state.activeCubeKey = e.target.value;
    state.detailCubeKey = e.target.value;
    renderMatrix();
  });

  // Filter controls
  elements.typeSelect.addEventListener("change", (e) => {
    state.selectedType = e.target.value;
    renderMatrix();
  });

  elements.cmcChipsGroup.addEventListener("click", (e) => {
    const btn = e.target.closest(".cmc-chip");
    if (!btn) return;
    elements.cmcChipsGroup
      .querySelectorAll(".cmc-chip")
      .forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    state.selectedCmc = btn.dataset.cmc;
    renderMatrix();
  });

  elements.cardSearchInput.addEventListener("input", (e) => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    renderMatrix();
  });

  elements.sharedFilterBtn.addEventListener("click", () => {
    state.onlyShared = !state.onlyShared;
    elements.sharedFilterBtn.classList.toggle("active", state.onlyShared);
    renderMatrix();
  });

  elements.upgradeFilterBtn?.addEventListener("click", () => {
    if (state.cardsViewMode !== "cube") {
      state.cardsViewMode = "cube";
      elements.btnViewCubeCards?.classList.add("active");
      elements.btnViewMaybeboard?.classList.remove("active");
    }
    state.onlyUpgrades = !state.onlyUpgrades;
    elements.upgradeFilterBtn.classList.toggle("active", state.onlyUpgrades);
    renderMatrix();
  });

  elements.btnViewCubeCards?.addEventListener("click", () => {
    state.cardsViewMode = "cube";
    elements.btnViewCubeCards.classList.add("active");
    elements.btnViewMaybeboard?.classList.remove("active");
    renderMatrix();
  });

  elements.btnViewMaybeboard?.addEventListener("click", () => {
    state.cardsViewMode = "maybeboard";
    if (state.onlyUpgrades) {
      state.onlyUpgrades = false;
      elements.upgradeFilterBtn?.classList.remove("active");
    }
    elements.btnViewMaybeboard.classList.add("active");
    elements.btnViewCubeCards?.classList.remove("active");
    renderMatrix();
  });

  // Modal close handlers
  elements.modalCloseBtn.addEventListener("click", closeModal);
  elements.modalBackdrop.addEventListener("click", (e) => {
    if (e.target === elements.modalBackdrop) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && elements.modalBackdrop.classList.contains("is-open")) closeModal();
  });

  // Every language control updates the same persisted application-wide preference.
  elements.globalLangFr?.addEventListener("click", () => setGlobalCardLanguage("FR"));
  elements.globalLangEn?.addEventListener("click", () => setGlobalCardLanguage("EN"));

  if (elements.langChipFr) {
    elements.langChipFr.addEventListener("click", () => setGlobalCardLanguage("FR"));
  }

  if (elements.langChipEn) {
    elements.langChipEn.addEventListener("click", () => setGlobalCardLanguage("EN"));
  }

  // Modal Language Switchers
  if (elements.langBtnFr) {
    elements.langBtnFr.addEventListener("click", () => setGlobalCardLanguage("FR"));
  }

  if (elements.langBtnEn) {
    elements.langBtnEn.addEventListener("click", () => setGlobalCardLanguage("EN"));
  }
}

// Load Cube Metadata & Master Catalog Data
async function loadData() {
  try {
    const metaFetches = Object.values(CUBE_CONFIGS).map(async (cfg) => {
      try {
        const res = await fetch(cfg.metaPath);
        if (res.ok) state.cubesMeta[cfg.key] = await res.json();
      } catch (err) {
        console.warn(`Failed loading meta for ${cfg.key}:`, err);
      }
    });

    const cardsFetch = (async () => {
      try {
        const cardsRes = await fetch("/data/cards/master-cards.json");
        if (cardsRes.ok) {
          const data = await cardsRes.json();
          state.cards = Object.values(data.cards || {});
          state.cards.forEach(hydrateCardFromFrenchCache);
        }
      } catch (err) {
        console.warn("Failed loading master cards:", err);
      }
    })();

    const suggestionsFetches = Object.values(CUBE_CONFIGS).map(async (cfg) => {
      try {
        const res = await fetch(`/data/cubes/${cfg.key}/cube-suggestions.json`);
        if (res.ok) state.cubesSuggestions[cfg.key] = await res.json();
      } catch (err) {
        console.warn(`Failed loading suggestions for ${cfg.key}:`, err);
      }
    });

    await Promise.all([...metaFetches, ...suggestionsFetches, cardsFetch]);
  } catch (err) {
    console.warn("Network load failed; fallback to local data structure.", err);
  }
}

// Initialize on DOM ready
if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
