import { computePowerRankings, toPowerBarPercentage } from "./power-ranking.js";
import { SoloDraftController, openDeckShowcaseModal } from "./solo-draft.js";
import {
  fetchLeaderboard,
  fetchReports,
  renderLeaderboardTable,
  renderAdminReportsTable,
  initSupabaseRealtime,
  fetchMagiciens,
  renderPantheonGrid,
} from "./leaderboard.js";
import { initAdminView } from "./admin.js";

const CUBE_KEYS = {
  NICO: "nico_candyshop",
  HUGUES: "hugues_pauper",
  TITOU: "titou_tribal",
  CEDRIC: "cedric_cube",
};

const CUBE_CONFIGS = {
  [CUBE_KEYS.NICO]: {
    key: CUBE_KEYS.NICO,
    name: "Nico's Vintage Candyshop Cube",
    author: "Nico (@Fedor007)",
    metaPath: "/data/cubes/nico_candyshop/cube-meta.json",
  },
  [CUBE_KEYS.HUGUES]: {
    key: CUBE_KEYS.HUGUES,
    name: "Huge's Pauper Cube",
    author: "Huge / Hugues",
    metaPath: "/data/cubes/hugues_pauper/cube-meta.json",
  },
  [CUBE_KEYS.TITOU]: {
    key: CUBE_KEYS.TITOU,
    name: "Titou's Tribal & Chromatic Cube",
    author: "Tristan (@eltitou007)",
    metaPath: "/data/cubes/titou_tribal/cube-meta.json",
  },
  [CUBE_KEYS.CEDRIC]: {
    key: CUBE_KEYS.CEDRIC,
    name: "Cédric's High-Power Cube",
    author: "Cédric (@Strobinellus)",
    metaPath: "/data/cubes/cedric_cube/cube-meta.json",
  },
};

const CUBE_FORMAT_DETAILS = {
  [CUBE_KEYS.TITOU]: {
    name: "Titou's Master Guild Challenge®",
    inventedYear: 2016,
    description:
      "Format hybride scellé & draft inventé par Titou pour créer des decks d'un niveau de puissance et d'une fluidité proches du format Construit.",
    phases: [
      {
        phaseNumber: 1,
        title: "La Sélection Secrète de Guilde",
        description:
          "Chaque joueur note secrètement sa guilde de prédilection (combinaison de 2 couleurs). Les choix sont révélés simultanément. En cas de conflit (plusieurs joueurs sur la même guilde), un jet de dé départage les joueurs ; les perdants choisissent une guilde restante.",
      },
      {
        phaseNumber: 2,
        title: "La Distribution (Base Scellée 60 cartes)",
        description:
          "Chaque joueur reçoit son 'Guild Kit' tribal formant le cœur de son pool de 60 cartes : 14 cartes de guilde (dont 5 bilands/terrains), 15 cartes de la couleur primaire, 15 cartes de la couleur secondaire, et 6 cartes incolores/artéfacts.",
      },
      {
        phaseNumber: 3,
        title: "Le Draft de Précision (Packs de 5)",
        description:
          "10 cartes supplémentaires sont draftées sous forme de 2 packs de 5 cartes pour ajuster la curve et les réponses. Mécanique de rattrapage : les joueurs ayant perdu le jet de dé en phase 1 ont priorité. Option Tricolore : possibilité d'échanger un pack contre un pack tricolore dédié (Dragons, Vampires Mardu, etc.).",
      },
    ],
  },
};

const TIERS = ["S", "A", "B", "C", "D"];

const COLOR_COLUMNS = [
  { key: "W", label: "Blanc", symbol: "W", cssClass: "color-w" },
  { key: "U", label: "Bleu", symbol: "U", cssClass: "color-u" },
  { key: "B", label: "Noir", symbol: "B", cssClass: "color-b" },
  { key: "R", label: "Rouge", symbol: "R", cssClass: "color-r" },
  { key: "G", label: "Vert", symbol: "G", cssClass: "color-g" },
  { key: "MULTI", label: "Multi", symbol: "M", cssClass: "color-multi" },
  { key: "COLORLESS", label: "Incolore", symbol: "C", cssClass: "color-c" },
];

// Local cache for French card translations & images (shared across app and solo draft)
const localFrenchCache = new Map();
try {
  const stored = localStorage.getItem("draftmaster_french_cache");
  if (stored) {
    const parsed = JSON.parse(stored);
    for (const [k, v] of Object.entries(parsed)) {
      localFrenchCache.set(k, v);
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

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// App State
const state = {
  activeCubeKey: CUBE_KEYS.TITOU,
  cubesMeta: {},
  cards: [],
  selectedType: "ALL",
  selectedCmc: "ALL",
  searchQuery: "",
  onlyShared: false,
  selectedCard: null,
  modalCardLang: "FR",
  cardExplorerLang: "FR",
  cubeRankings: {},
  currentView: "home",
  detailCubeKey: CUBE_KEYS.TITOU,
};

// DOM References
const elements = {
  // SPA Views
  viewHome: document.getElementById("view-home"),
  viewCubes: document.getElementById("view-cubes"),
  viewCards: document.getElementById("view-cards"),
  viewBots: document.getElementById("view-bots"),
  viewDraft: document.getElementById("view-draft"),
  viewRecords: document.getElementById("view-records"),
  viewAdmin: document.getElementById("view-admin"),

  // Navigation Links
  brandHomeBtn: document.getElementById("brand-home-btn"),
  navBtnHome: document.getElementById("nav-btn-home"),
  navBtnCubes: document.getElementById("nav-btn-cubes"),
  navBtnCards: document.getElementById("nav-btn-cards"),
  navBtnBots: document.getElementById("nav-btn-bots"),
  navBtnDraft: document.getElementById("nav-btn-draft"),
  navBtnRecords: document.getElementById("nav-btn-records"),

  // Home CTA Buttons
  homeCtaDraft: document.getElementById("home-cta-draft"),
  homeCtaCubes: document.getElementById("home-cta-cubes"),
  homeCtaCards: document.getElementById("home-cta-cards"),
  homeCtaBots: document.getElementById("home-cta-bots"),

  // Deck Review Modal
  deckReviewBackdrop: document.getElementById("deck-review-backdrop"),
  deckReviewCloseBtn: document.getElementById("deck-review-close-btn"),
  deckReviewRank: document.getElementById("deck-review-rank"),
  deckReviewTitle: document.getElementById("deck-review-modal-title"),
  deckReviewMeta: document.getElementById("deck-review-meta"),
  deckReviewCardsGrid: document.getElementById("deck-review-cards-grid"),

  // Leaderboard & Reports tbodies
  leaderboardTbody: document.getElementById("leaderboard-tbody"),
  reportsTbody: document.getElementById("reports-tbody"),

  // Cubes Detailed Panel
  cubeDetailPanel: document.getElementById("cube-detail-panel"),

  // Controls Bar
  cubeSelect: document.getElementById("cube-select"),
  typeSelect: document.getElementById("type-select"),
  cmcChipsGroup: document.getElementById("cmc-chips-group"),
  cardSearchInput: document.getElementById("card-search-input"),
  sharedFilterBtn: document.getElementById("shared-filter-btn"),
  langChipFr: document.getElementById("lang-chip-fr"),
  langChipEn: document.getElementById("lang-chip-en"),
  resultsStats: document.getElementById("results-stats"),

  // Matrix Layout
  matrixTbody: document.getElementById("matrix-tbody"),
  mobileTierList: document.getElementById("mobile-tier-list"),

  // Floating Popover
  cardHoverPopover: document.getElementById("card-hover-popover"),
  popoverImg: document.getElementById("popover-img"),

  // Modal Dialog
  modalBackdrop: document.getElementById("card-modal-backdrop"),
  modalCloseBtn: document.getElementById("modal-close-btn"),
  modalCardImage: document.getElementById("modal-card-image"),
  modalCardTitle: document.getElementById("modal-card-title"),
  modalCardSubtitleFr: document.getElementById("modal-card-subtitle-fr"),
  modalCardTypeline: document.getElementById("modal-card-typeline"),
  modalActiveCubeBadge: document.getElementById("modal-active-cube-badge"),
  modalRankingHero: document.getElementById("modal-ranking-hero"),
  modalHeroTierCard: document.getElementById("modal-hero-tier-card"),
  modalHeroTierLetter: document.getElementById("modal-hero-tier-letter"),
  modalHeroTierLabel: document.getElementById("modal-hero-tier-label"),
  modalHeroPowerScore: document.getElementById("modal-hero-power-score"),
  modalHeroPowerBar: document.getElementById("modal-hero-power-bar"),
  modalHeroCubeRank: document.getElementById("modal-hero-cube-rank"),
  modalHeroCubeTotal: document.getElementById("modal-hero-cube-total"),
  modalHeroPercentile: document.getElementById("modal-hero-percentile"),
  modalHeroCubeRole: document.getElementById("modal-hero-cube-role"),
  modalHeroTempoImpact: document.getElementById("modal-hero-tempo-impact"),
  langBtnFr: document.getElementById("lang-btn-fr"),
  langBtnEn: document.getElementById("lang-btn-en"),
  modalOracleText: document.getElementById("modal-oracle-text"),
  modalPedagogyPlay: document.getElementById("modal-pedagogy-play"),
  modalArchetypeRows: document.getElementById("modal-archetype-rows"),
  modalSynergiesGrid: document.getElementById("modal-synergies-grid"),
  modalCrossCubeSection: document.getElementById("modal-cross-cube-section"),
  modalCrossCubeCards: document.getElementById("modal-cross-cube-cards"),
  qValOpening: document.getElementById("q-val-opening"),
  qValDeveloping: document.getElementById("q-val-developing"),
  qValParity: document.getElementById("q-val-parity"),
  qValBehind: document.getElementById("q-val-behind"),
};

// Solo Draft & Leaderboard State
let soloDraftCtrl = null;

async function loadAndRenderLeaderboard() {
  if (elements.leaderboardTbody) {
    elements.leaderboardTbody.innerHTML = `<tr><td colspan="8" class="arcade-empty-cell">Chargement du Mur des Records...</td></tr>`;
  }
  const entries = await fetchLeaderboard();
  renderLeaderboardTable(entries, elements.leaderboardTbody, (entry) => {
    openDeckReviewModal(entry);
  });
}

function openDeckReviewModal(entry) {
  if (!elements.deckReviewBackdrop) return;
  if (elements.deckReviewRank) elements.deckReviewRank.textContent = `#${entry.rank || 1}`;
  if (elements.deckReviewTitle) elements.deckReviewTitle.textContent = `Deck de ${entry.playerName}`;
  if (elements.deckReviewMeta) {
    const mins = Math.floor(entry.totalDurationSeconds / 60);
    const secs = entry.totalDurationSeconds % 60;
    elements.deckReviewMeta.textContent = `Score : ${entry.overallScore}/100 • ${entry.archetype?.label || "Archétype Libre"} • Durée : ${String(mins)}m ${String(secs)}s`;
  }

  if (elements.deckReviewCardsGrid) {
    const cards = entry.maindeckCards || [];
    if (cards.length === 0) {
      elements.deckReviewCardsGrid.innerHTML = `<p class="arcade-empty-cell">Composition des 23 cartes non détaillée pour ce record historique.</p>`;
    } else {
      elements.deckReviewCardsGrid.innerHTML = cards
        .map(
          (c) => `
            <div class="review-card-item">
              <img src="${c.frenchImageUrl || c.imageUrl || '/data/cards/images/default.jpg'}" alt="${escapeHtml(c.frenchName || c.name)}" loading="lazy" />
              <div class="review-card-name">${escapeHtml(c.frenchName || c.name)}</div>
            </div>
          `,
        )
        .join("");
    }
  }

  elements.deckReviewBackdrop.hidden = false;
}

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

      deckSpellsCounter: document.getElementById("deck-spells-counter"),
      totalLandsBadge: document.getElementById("total-lands-badge"),
      deckTimer: document.getElementById("deck-timer"),
      maindeckContainer: document.getElementById("deck-maindeck-container"),
      sideboardContainer: document.getElementById("deck-sideboard-container"),
      autoLandsBtn: document.getElementById("auto-calculate-lands-btn"),
      validateDeckBtn: document.getElementById("draft-validate-deck-btn"),

      resultHighScoreBanner: document.getElementById("result-highscore-banner"),
      resultScoreVal: document.getElementById("result-score-val"),
      resultScoreGrade: document.getElementById("result-score-grade"),
      resultArchetypeLabel: document.getElementById("result-archetype-label"),
      resultArchetypeDesc: document.getElementById("result-archetype-desc"),
      resultRankBadge: document.getElementById("result-rank-badge"),
      resultChronoText: document.getElementById("result-chrono-text"),
      resultStrengthsList: document.getElementById("result-strengths-list"),
      resultWeaknessesList: document.getElementById("result-weaknesses-list"),
      openWalkthroughBtn: document.getElementById("btn-open-walkthrough-report"),
      openBoostersBtn: document.getElementById("btn-open-boosters-report"),
      goToRecordsBtn: document.getElementById("btn-go-to-records"),
      restartBtn: document.getElementById("btn-restart-draft"),
    },
    {
      onNavigateToRecords: () => navigateTo("records"),
    },
  );
}

// Initialize Application
async function initApp() {
  if (elements.cubeSelect) {
    elements.cubeSelect.value = state.activeCubeKey;
  }
  setupEventListeners();
  initSoloDraft();
  initWhaouFeatures();
  await loadData();
  renderMatrix();
  renderCubesPage();
  initRouter();
}

function initWhaouFeatures() {
  // 1. Abonnement Supabase Realtime
  initSupabaseRealtime(() => {
    if (state.currentView === "records") {
      loadAndRenderLeaderboard();
    }
  });

  // 2. Subnav Records : Général vs Panthéon
  const tabGeneral = document.getElementById("tab-btn-records-general");
  const tabPantheon = document.getElementById("tab-btn-records-pantheon");
  const cardGeneral = document.getElementById("general-records-table-card");
  const cardPantheon = document.getElementById("pantheon-table-card");
  const pantheonGrid = document.getElementById("pantheon-cards-grid");

  tabGeneral?.addEventListener("click", () => {
    tabGeneral.classList.add("active");
    tabPantheon?.classList.remove("active");
    if (cardGeneral) cardGeneral.hidden = false;
    if (cardPantheon) cardPantheon.hidden = true;
  });

  tabPantheon?.addEventListener("click", async () => {
    tabPantheon.classList.add("active");
    tabGeneral?.classList.remove("active");
    if (cardGeneral) cardGeneral.hidden = true;
    if (cardPantheon) cardPantheon.hidden = false;
    const magiciens = await fetchMagiciens();
    renderPantheonGrid(magiciens, pantheonGrid);
  });

  // 3. Consultation d'un deck via lien partagé ?deck=<id>
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
function navigateTo(viewName, cubeKey = null) {
  if (cubeKey) {
    state.activeCubeKey = cubeKey;
    state.detailCubeKey = cubeKey;
    if (elements.cubeSelect) elements.cubeSelect.value = cubeKey;
  }

  state.currentView = viewName;

  // Header active tabs
  elements.navBtnHome?.classList.toggle("active", viewName === "home");
  elements.navBtnCubes?.classList.toggle("active", viewName === "cubes");
  elements.navBtnCards?.classList.toggle("active", viewName === "cards");
  elements.navBtnBots?.classList.toggle("active", viewName === "bots");
  elements.navBtnDraft?.classList.toggle("active", viewName === "draft");
  elements.navBtnRecords?.classList.toggle("active", viewName === "records");

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

  // URL routing
  let targetPath = "/";
  if (viewName === "cards") targetPath = "/cards";
  else if (viewName === "cubes") targetPath = "/cubes";
  else if (viewName === "bots") targetPath = "/bots";
  else if (viewName === "draft") targetPath = "/draft";
  else if (viewName === "records") targetPath = "/records";
  else if (viewName === "admin") targetPath = "/admin";

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
  }

  navigateTo(initialView, state.activeCubeKey);

  window.addEventListener("popstate", (e) => {
    const p = window.location.pathname;
    if (p === "/cards") navigateTo("cards");
    else if (p === "/cubes") navigateTo("cubes");
    else if (p === "/bots") navigateTo("bots");
    else if (p === "/draft") navigateTo("draft");
    else if (p === "/records") navigateTo("records");
    else if (p === "/admin") navigateTo("admin");
    else navigateTo("home");
  });
}

// Event Listeners Setup
function setupEventListeners() {
  // SPA Navigation handlers
  elements.brandHomeBtn?.addEventListener("click", () => navigateTo("home"));
  elements.navBtnHome?.addEventListener("click", () => navigateTo("home"));
  elements.navBtnCubes?.addEventListener("click", () => navigateTo("cubes"));
  elements.navBtnCards?.addEventListener("click", () => navigateTo("cards"));
  elements.navBtnBots?.addEventListener("click", () => navigateTo("bots"));
  elements.navBtnDraft?.addEventListener("click", () => navigateTo("draft"));
  elements.navBtnRecords?.addEventListener("click", () => navigateTo("records"));

  elements.homeCtaDraft?.addEventListener("click", () => navigateTo("draft"));
  elements.homeCtaCubes?.addEventListener("click", () => navigateTo("cubes"));
  elements.homeCtaCards?.addEventListener("click", () => navigateTo("cards"));
  elements.homeCtaBots?.addEventListener("click", () => navigateTo("bots"));

  elements.deckReviewCloseBtn?.addEventListener("click", () => {
    if (elements.deckReviewBackdrop) elements.deckReviewBackdrop.hidden = true;
  });
  elements.deckReviewBackdrop?.addEventListener("click", (e) => {
    if (e.target === elements.deckReviewBackdrop) elements.deckReviewBackdrop.hidden = true;
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
      document.querySelectorAll("#bots-style-filter .bot-filter-btn").forEach((b) => b.classList.remove("active"));
      e.currentTarget.classList.add("active");
      activeBotStyle = e.currentTarget.dataset.style;
      applyBotFilters();
    });
  });

  document.querySelectorAll("#bots-level-filter .bot-filter-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll("#bots-level-filter .bot-filter-btn").forEach((b) => b.classList.remove("active"));
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

  // Comparison table tab clicks
  document.querySelectorAll(".btn-select-cube-tab").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const targetCube = e.currentTarget.dataset.tabCube;
      document.querySelectorAll(".btn-select-cube-tab").forEach((b) => b.classList.remove("active"));
      e.currentTarget.classList.add("active");
      renderCubeDetail(targetCube);
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

  // Modal close handlers
  elements.modalCloseBtn.addEventListener("click", closeModal);
  elements.modalBackdrop.addEventListener("click", (e) => {
    if (e.target === elements.modalBackdrop) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && elements.modalBackdrop.classList.contains("is-open")) closeModal();
  });

  // Card Explorer Language Switchers
  if (elements.langChipFr) {
    elements.langChipFr.addEventListener("click", () => {
      state.cardExplorerLang = "FR";
      state.modalCardLang = "FR";
      elements.langChipFr.classList.add("active");
      elements.langChipEn?.classList.remove("active");
      renderMatrix();
    });
  }

  if (elements.langChipEn) {
    elements.langChipEn.addEventListener("click", () => {
      state.cardExplorerLang = "EN";
      state.modalCardLang = "EN";
      elements.langChipEn.classList.add("active");
      elements.langChipFr?.classList.remove("active");
      renderMatrix();
    });
  }

  // Modal Language Switchers
  if (elements.langBtnFr) {
    elements.langBtnFr.addEventListener("click", () => {
      state.modalCardLang = "FR";
      if (state.selectedCard) {
        updateModalCardText(state.selectedCard);
      }
    });
  }

  if (elements.langBtnEn) {
    elements.langBtnEn.addEventListener("click", () => {
      state.modalCardLang = "EN";
      if (state.selectedCard) {
        updateModalCardText(state.selectedCard);
      }
    });
  }
}

// Load Cube Metadata & Master Catalog Data
async function loadData() {
  try {
    const [nicoRes, huguesRes, titouRes, cardsRes] = await Promise.all([
      fetch(CUBE_CONFIGS[CUBE_KEYS.NICO].metaPath),
      fetch(CUBE_CONFIGS[CUBE_KEYS.HUGUES].metaPath),
      fetch(CUBE_CONFIGS[CUBE_KEYS.TITOU].metaPath),
      fetch("/data/cards/master-cards.json"),
    ]);

    if (nicoRes.ok) state.cubesMeta[CUBE_KEYS.NICO] = await nicoRes.json();
    if (huguesRes.ok) state.cubesMeta[CUBE_KEYS.HUGUES] = await huguesRes.json();
    if (titouRes.ok) state.cubesMeta[CUBE_KEYS.TITOU] = await titouRes.json();

    if (cardsRes.ok) {
      const data = await cardsRes.json();
      state.cards = Object.values(data.cards || {});
      // Hydrate state.cards from localFrenchCache
      state.cards.forEach((card) => {
        if (localFrenchCache.has(card.name)) {
          const cached = localFrenchCache.get(card.name);
          if (cached.frenchName && !card.frenchName) card.frenchName = cached.frenchName;
          if (cached.frenchText && !card.frenchText) card.frenchText = cached.frenchText;
          if (cached.frenchImageUrl && !card.frenchImageUrl) card.frenchImageUrl = cached.frenchImageUrl;
          if (cached.frenchLargeImageUrl && !card.frenchLargeImageUrl) card.frenchLargeImageUrl = cached.frenchLargeImageUrl;
        }
      });
    }
  } catch (err) {
    console.warn("Network load failed; fallback to local data structure.", err);
  }
}

// Render Cubes Synthetic Page & Detailed Deep Dive
function renderCubesPage() {
  const selectedCube = state.detailCubeKey || state.activeCubeKey || CUBE_KEYS.TITOU;

  // Update tabs in comparison table
  document.querySelectorAll(".btn-select-cube-tab").forEach((btn) => {
    const cube = btn.dataset.tabCube;
    btn.classList.toggle("active", cube === selectedCube);
  });

  renderCubeDetail(selectedCube);
}

function findCardByRef(ref) {
  if (!ref) return null;
  const target = ref.toLowerCase().trim();
  return (
    state.cards.find(
      (c) =>
        (c.oracleId && c.oracleId.toLowerCase() === target) ||
        (c.name && c.name.toLowerCase() === target),
    ) || null
  );
}

function renderCubeDetail(cubeKey) {
  state.detailCubeKey = cubeKey;
  if (!elements.cubeDetailPanel) return;

  const meta = state.cubesMeta[cubeKey];
  if (!meta) {
    elements.cubeDetailPanel.innerHTML = '<p class="loading-state">Chargement des analyses du Cube...</p>';
    return;
  }

  const ft = meta.fundamentalTurn || {
    targetTurn: 3.0,
    criticalWindow: "T2-T4",
    pacingDescription: "Format équilibré.",
    deckExpectation: "Développement régulier.",
  };

  const axes = meta.technicalAxes || {
    speedIndex: 6.0,
    interactionDensityPercentage: 20.0,
    averageCmcEstimate: 2.5,
    fixingQuality: "custom",
  };

  const cardCount = meta.cardCount || (cubeKey === CUBE_KEYS.TITOU ? 545 : cubeKey === CUBE_KEYS.NICO ? 730 : 450);

  // Format details box (e.g. Titou's Master Guild Challenge)
  let formatBoxHtml = "";
  const fd = meta.formatDetails || CUBE_FORMAT_DETAILS[cubeKey];
  if (fd) {
    const phasesHtml = (fd.phases || [])
      .map(
        (p) => `
        <div class="format-phase-card">
          <div class="phase-number-badge">Phase ${p.phaseNumber}</div>
          <div class="phase-body">
            <h4 class="phase-title">${p.title}</h4>
            <p class="phase-desc">${p.description}</p>
          </div>
        </div>
      `,
      )
      .join("");

    formatBoxHtml = `
      <div class="cube-format-box">
        <div class="format-box-header">
          <div class="format-badge-icon">🏆</div>
          <div>
            <span class="format-badge-label">Format Exclusif Créé par Titou</span>
            <h3 class="format-title">${fd.name}</h3>
            <p class="format-intro">${fd.description}</p>
          </div>
        </div>
        <div class="format-phases-grid">
          ${phasesHtml}
        </div>
      </div>
    `;
  }

  // Archetypes Cards
  const archetypes = meta.archetypes || [];
  const archetypesHtml = archetypes
    .map((arch) => {
      // Find key cards
      const keyCardsHtml = (arch.keyCards || [])
        .map((ref) => {
          const card = findCardByRef(ref);
          if (!card) return "";
          const score = Number.isFinite(card.powerScore?.score)
            ? Math.round(card.powerScore.score * 10) / 10
            : "";
          const pip = formatCostPip(card.manaCost, card.cmc);
          return `
            <button type="button" class="archetype-card-chip" data-oracle="${card.oracleId || ''}" data-name="${card.name}">
              <span class="chip-name">${card.name}</span>
              ${pip ? `<span class="chip-cost">${pip}</span>` : ""}
              ${score ? `<span class="chip-score">${score}</span>` : ""}
            </button>
          `;
        })
        .join("");

      // Find support cards
      const supportCardsHtml = (arch.supportCards || [])
        .map((ref) => {
          const card = findCardByRef(ref);
          if (!card) return "";
          const score = Number.isFinite(card.powerScore?.score)
            ? Math.round(card.powerScore.score * 10) / 10
            : "";
          const pip = formatCostPip(card.manaCost, card.cmc);
          return `
            <button type="button" class="archetype-card-chip support-chip" data-oracle="${card.oracleId || ''}" data-name="${card.name}">
              <span class="chip-name">${card.name}</span>
              ${pip ? `<span class="chip-cost">${pip}</span>` : ""}
              ${score ? `<span class="chip-score">${score}</span>` : ""}
            </button>
          `;
        })
        .join("");

      const colorBadges = (arch.primaryColors || [])
        .map((c) => `<span class="color-dot dot-${c.toLowerCase()}">${c}</span>`)
        .join("");

      const splashBadges = (arch.splashColors || [])
        .map((c) => `<span class="color-dot dot-splash dot-${c.toLowerCase()}">+${c}</span>`)
        .join("");

      return `
        <div class="archetype-card-item">
          <div class="arch-card-header">
            <div>
              <div class="arch-color-row">${colorBadges} ${splashBadges}</div>
              <h3 class="arch-card-title">${arch.name}</h3>
            </div>
            <span class="arch-cat-badge badge-${arch.category}">${arch.category}</span>
          </div>

          <p class="arch-description">${arch.description}</p>

          <div class="arch-gameplan-box">
            <strong>🎯 Plan de jeu :</strong>
            <p>${arch.gameplan}</p>
          </div>

          <div class="arch-cards-section">
            <div class="arch-cards-heading">⭐ Cartes Clés de l'Archétype</div>
            <div class="arch-chips-wrap">
              ${keyCardsHtml || '<span class="empty-note">Cartes en cours d\'alignement</span>'}
            </div>
          </div>

          ${
            supportCardsHtml
              ? `
          <div class="arch-cards-section">
            <div class="arch-cards-heading">🛡️ Cartes de Support</div>
            <div class="arch-chips-wrap">
              ${supportCardsHtml}
            </div>
          </div>
          `
              : ""
          }

          ${
            arch.recommendedCreatureCount
              ? `
          <div class="arch-meta-footer">
            <span>👾 Créatures suggérées : ${arch.recommendedCreatureCount[0]}-${arch.recommendedCreatureCount[1]}</span>
            <span>⚡ Removals : ${arch.recommendedRemovalCount ? `${arch.recommendedRemovalCount[0]}-${arch.recommendedRemovalCount[1]}` : "3-5"}</span>
          </div>
          `
              : ""
          }
        </div>
      `;
    })
    .join("");

  elements.cubeDetailPanel.innerHTML = `
    <div class="cube-detail-hero">
      ${
        meta.coverImage
          ? `<div class="cube-detail-cover"><img src="/${meta.coverImage}" alt="${meta.name}" class="cube-detail-img" /></div>`
          : ""
      }
      <div class="cube-detail-hero-content">
        <div class="hero-tag-row">
          <span class="badge badge-accent">${formatPowerTier(meta.powerTier)}</span>
          <span class="badge badge-subtle">Tour Fondamental T${ft.targetTurn}</span>
        </div>
        <h2 class="cube-detail-name">${meta.name}</h2>
        <span class="cube-detail-owner">Architecte : ${meta.owner} • ${cardCount} cartes répertoriées</span>
        <p class="cube-detail-desc">${meta.description || meta.philosophy || ""}</p>
        <div class="cube-detail-actions">
          <button type="button" class="btn-primary-action" id="btn-open-cube-matrix" data-cube-target="${cubeKey}">
            🎴 Consulter les ${cardCount} cartes de ce Cube dans la Matrice ➔
          </button>
        </div>
      </div>
    </div>

    ${formatBoxHtml}

    <div class="cube-tempo-axes-card">
      <div class="tempo-clock-column">
        <div class="tempo-clock-dial">
          <span class="tempo-clock-sub">Tour Fondamental</span>
          <span class="tempo-clock-turn">T${ft.targetTurn}</span>
          <span class="tempo-clock-window">Critique : ${ft.criticalWindow}</span>
        </div>
        <div class="tempo-clock-text">
          <h4>Le Tour Pivot (Zvi Mowshowitz)</h4>
          <p>${ft.pacingDescription}</p>
          <div class="tempo-expectation-callout">
            <strong>Exigence de construction :</strong> ${ft.deckExpectation}
          </div>
        </div>
      </div>

      <div class="tempo-metrics-column">
        <h4>Axes Techniques & Métriques</h4>
        <div class="axes-bars-grid">
          <div class="axis-bar-item">
            <span class="axis-lbl">Indice de Vitesse : <strong>${axes.speedIndex} / 10</strong></span>
            <div class="axis-track"><div class="axis-fill" style="width: ${axes.speedIndex * 10}%"></div></div>
          </div>
          <div class="axis-bar-item">
            <span class="axis-lbl">Densité d'Interaction : <strong>${axes.interactionDensityPercentage} %</strong></span>
            <div class="axis-track"><div class="axis-fill" style="width: ${axes.interactionDensityPercentage}%"></div></div>
          </div>
          <div class="axis-bar-item">
            <span class="axis-lbl">Coût Moyen Estimé (CMC) : <strong>${axes.averageCmcEstimate}</strong></span>
            <div class="axis-track"><div class="axis-fill" style="width: ${Math.min(100, (axes.averageCmcEstimate / 5) * 100)}%"></div></div>
          </div>
          <div class="axis-bar-item">
            <span class="axis-lbl">Qualité de Fixation : <strong>${formatFixing(axes.fixingQuality)}</strong></span>
          </div>
        </div>
      </div>
    </div>

    <div class="cube-archetypes-section">
      <div class="arch-section-header">
        <h3 class="arch-section-title">Principaux Archétypes du Cube (${archetypes.length})</h3>
        <p class="arch-section-subtitle">
          Survolez une carte pour visualiser son illustration Scryfall, cliquez pour accéder à son analyse pédagogique et ses synergies.
        </p>
      </div>
      <div class="archetypes-cards-grid">
        ${archetypesHtml}
      </div>
    </div>
  `;

  // Attach interactive events to archetype cards chips
  elements.cubeDetailPanel.querySelectorAll(".archetype-card-chip").forEach((chip) => {
    const oracleId = chip.dataset.oracle;
    const name = chip.dataset.name;
    const card = findCardByRef(oracleId) || findCardByRef(name);
    if (!card) return;

    chip.addEventListener("mouseenter", (e) => showCardPopover(card, e));
    chip.addEventListener("mousemove", (e) => positionCardPopover(e));
    chip.addEventListener("mouseleave", hideCardPopover);
    chip.addEventListener("click", (e) => {
      e.preventDefault();
      hideCardPopover();
      openCardModal(card);
    });
  });

  // Attach button to open matrix for this cube
  const openMatrixBtn = elements.cubeDetailPanel.querySelector("#btn-open-cube-matrix");
  if (openMatrixBtn) {
    openMatrixBtn.addEventListener("click", () => {
      navigateTo("cards", cubeKey);
    });
  }
}

// Determine Tier strictly from Power Ranking score
function getCardTier(card) {
  const score = Number.isFinite(card.powerScore?.score) ? card.powerScore.score : 1;
  if (score >= 38) return "S";
  if (score >= 26) return "A";
  if (score >= 17) return "B";
  if (score >= 10) return "C";
  return "D";
}

// Determine Column for a card
function getCardColumn(card) {
  if (card.isLand || !card.colors || card.colors.length === 0) {
    return "COLORLESS";
  }
  if (card.colors.length > 1) {
    return "MULTI";
  }
  return card.colors[0];
}

// Filter Cards
function getFilteredCards() {
  const cubeKey = state.activeCubeKey;

  return state.cards.filter((card) => {
    // 1. Must be in active cube
    if (!card.presentInCubes || !card.presentInCubes.includes(cubeKey)) {
      return false;
    }

    // 2. Search query filter (matches English or French names)
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      const matchEn = card.name && card.name.toLowerCase().includes(q);
      const matchFr = card.frenchName && card.frenchName.toLowerCase().includes(q);
      if (!matchEn && !matchFr) return false;
    }

    // 3. Type filter
    if (state.selectedType !== "ALL") {
      const typeMatches =
        card.types?.some((t) => t.toLowerCase() === state.selectedType.toLowerCase()) ||
        card.typeLine?.toLowerCase().includes(state.selectedType.toLowerCase());
      if (!typeMatches) return false;
    }

    // 4. CMC filter
    if (state.selectedCmc !== "ALL") {
      const cmc = card.cmc ?? 0;
      if (state.selectedCmc === "6+") {
        if (cmc < 6) return false;
      } else {
        if (cmc !== parseInt(state.selectedCmc, 10)) return false;
      }
    }

    // 5. Only shared cards across >= 2 cubes
    if (state.onlyShared) {
      if ((card.presentInCubes || []).length < 2) return false;
    }

    return true;
  });
}

// Render Limited Grades Matrix
function renderMatrix() {
  const filteredCards = getFilteredCards();
  const cubeKey = state.activeCubeKey;
  const cubeName = CUBE_CONFIGS[cubeKey]?.name || "Cube";

  const totalInCube = state.cards.filter(
    (c) => c.presentInCubes && c.presentInCubes.includes(cubeKey),
  ).length;

  if (state.onlyShared) {
    elements.resultsStats.innerHTML = `
      <span class="stats-count">${filteredCards.length} cartes affichées</span>
      <span class="stats-filter-tag">
        Filtre actif : 🔄 Communes aux Cubes (${filteredCards.length} sur ${totalInCube})
        <button type="button" id="clear-shared-filter-btn" class="btn-clear-inline" title="Afficher toutes les cartes du cube">
          ✕ Afficher tout le cube
        </button>
      </span>
    `;
    const clearBtn = document.getElementById("clear-shared-filter-btn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        state.onlyShared = false;
        elements.sharedFilterBtn?.classList.remove("active");
        renderMatrix();
      });
    }
  } else {
    elements.resultsStats.textContent = `${filteredCards.length} carte${filteredCards.length > 1 ? "s" : ""} répertoriée${filteredCards.length > 1 ? "s" : ""} dans ${cubeName}`;
  }

  // Clear desktop table
  elements.matrixTbody.innerHTML = "";
  // Clear mobile list
  elements.mobileTierList.innerHTML = "";

  // Bucket cards by Tier -> Color
  const buckets = { S: {}, A: {}, B: {}, C: {}, D: {} };
  TIERS.forEach((t) => {
    COLOR_COLUMNS.forEach((c) => {
      buckets[t][c.key] = [];
    });
  });

  filteredCards.forEach((card) => {
    const tier = getCardTier(card);
    const col = getCardColumn(card);
    if (buckets[tier] && buckets[tier][col]) {
      buckets[tier][col].push(card);
    }
  });

  // Sort cards inside each cell strictly by Power Score descending, then Name
  // The first row presents the most powerful cards; the further down, the weaker the cards.
  TIERS.forEach((t) => {
    COLOR_COLUMNS.forEach((c) => {
      buckets[t][c.key].sort((a, b) => {
        const scoreA = Number.isFinite(a.powerScore?.score) ? a.powerScore.score : 1;
        const scoreB = Number.isFinite(b.powerScore?.score) ? b.powerScore.score : 1;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return a.name.localeCompare(b.name);
      });
    });
  });

  // 1. Build Desktop Rows (Strictly S, A, B, C, D)
  TIERS.forEach((tier) => {
    const tr = document.createElement("tr");
    tr.className = `tier-${tier.toLowerCase()}-row`;

    // Calculate total count in this tier
    let tierTotalCount = 0;
    COLOR_COLUMNS.forEach((col) => {
      tierTotalCount += buckets[tier][col.key].length;
    });

    // Row Header Cell (Tier Badge)
    const th = document.createElement("th");
    th.className = "tier-cell-header";
    th.innerHTML = `
      <div class="tier-row-badge">
        <span class="tier-letter">${tier}</span>
        <span class="tier-count">${tierTotalCount}</span>
      </div>
    `;
    tr.appendChild(th);

    // Color Columns Cells
    COLOR_COLUMNS.forEach((col) => {
      const td = document.createElement("td");
      td.className = "matrix-cell";

      const stack = document.createElement("div");
      stack.className = "cards-col-stack";

      const cardsInCell = buckets[tier][col.key];
      cardsInCell.forEach((card) => {
        const item = createCardMatrixItem(card, col.cssClass);
        stack.appendChild(item);
      });

      td.appendChild(stack);
      tr.appendChild(td);
    });

    elements.matrixTbody.appendChild(tr);

    // 2. Build Mobile Tier Accordion Section
    const mobileSection = createMobileTierSection(tier, tierTotalCount, buckets[tier]);
    elements.mobileTierList.appendChild(mobileSection);
  });
}

// Create Card Matrix Item (Interactive, with hover popover and click modal)
function createCardMatrixItem(card, colClass) {
  const item = document.createElement("div");
  item.className = `card-matrix-item ${colClass}`;
  item.setAttribute("tabindex", "0");
  item.setAttribute("role", "button");

  if (localFrenchCache.has(card.name)) {
    const cached = localFrenchCache.get(card.name);
    if (cached.frenchName && !card.frenchName) card.frenchName = cached.frenchName;
    if (cached.frenchImageUrl && !card.frenchImageUrl) card.frenchImageUrl = cached.frenchImageUrl;
    if (cached.frenchLargeImageUrl && !card.frenchLargeImageUrl) card.frenchLargeImageUrl = cached.frenchLargeImageUrl;
  }

  const isFr = (state.cardExplorerLang || "FR") === "FR";
  const displayName = isFr && card.frenchName ? card.frenchName : card.name;
  item.setAttribute("aria-label", displayName);

  if (isFr && card.frenchName && card.frenchName !== card.name) {
    item.title = `${card.frenchName} (VO: ${card.name})`;
  } else if (!isFr && card.frenchName && card.frenchName !== card.name) {
    item.title = `${card.name} (FR: ${card.frenchName})`;
  } else {
    item.title = card.name;
  }

  const isShared = (card.presentInCubes || []).length > 1;
  const rawScore = Number.isFinite(card.powerScore?.score) ? card.powerScore.score : 1;
  const score = Math.round(rawScore * 10) / 10;

  item.innerHTML = `
    <span class="card-item-name">${escapeHtml(displayName)}</span>
    <span class="card-item-score" title="Power score : ${score}">${score}</span>
    ${isShared ? '<span class="card-shared-pip" title="Présente dans plusieurs cubes">🔄</span>' : ""}
  `;

  // Hover Popover Listeners
  item.addEventListener("mouseenter", (e) => showCardPopover(card, e));
  item.addEventListener("mousemove", (e) => positionCardPopover(e));
  item.addEventListener("mouseleave", hideCardPopover);

  // Click / Keydown opens Educational Modal
  item.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    hideCardPopover();
    openCardModal(card);
  });

  item.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      hideCardPopover();
      openCardModal(card);
    }
  });

  return item;
}

// Format Mana Cost into clean compact pip string
function formatCostPip(manaCost, cmc) {
  if (!manaCost) return cmc ? String(cmc) : "0";
  // Replace '{1}{U}' with '1U' or cleaner symbols
  return manaCost.replace(/[{}]/g, "");
}

// Mobile Accordion Section
function createMobileTierSection(tier, count, colorBuckets) {
  const section = document.createElement("div");
  section.className = "mobile-tier-section";

  const toggleBtn = document.createElement("button");
  toggleBtn.className = "mobile-tier-toggle";
  toggleBtn.innerHTML = `
    <span>
      <span class="mobile-tier-badge tier-${tier.toLowerCase()}-row">${tier}</span>
      ${tier}-Tier
    </span>
    <span style="font-size: 0.8rem; color: var(--text-secondary);">${count} cartes ▾</span>
  `;

  const cardsContainer = document.createElement("div");
  cardsContainer.className = "mobile-cards-grid";
  // Start expanded for S and A, collapsed for others if many
  const isExpanded = tier === "S" || tier === "A";
  cardsContainer.hidden = !isExpanded;

  COLOR_COLUMNS.forEach((col) => {
    colorBuckets[col.key].forEach((card) => {
      const item = createCardMatrixItem(card, col.cssClass);
      cardsContainer.appendChild(item);
    });
  });

  toggleBtn.addEventListener("click", () => {
    cardsContainer.hidden = !cardsContainer.hidden;
    toggleBtn.querySelector("span:last-child").textContent =
      `${count} cartes ${cardsContainer.hidden ? "▸" : "▾"}`;
  });

  section.appendChild(toggleBtn);
  section.appendChild(cardsContainer);
  return section;
}

// Image URL Resolvers (Local First with CDN Fallback)
function getCardImageUrl(card, preferLang = null) {
  const lang = preferLang || state.cardExplorerLang || state.modalCardLang || "FR";
  if (lang === "FR") {
    if (card.frenchLargeImageUrl) {
      return card.frenchLargeImageUrl;
    }
    if (card.frenchImageUrl) {
      return card.frenchImageUrl;
    }
    if (card.image?.localFrenchPath) {
      return "/" + card.image.localFrenchPath;
    }
    if (card.localFrenchPath) {
      return "/" + card.localFrenchPath;
    }
  }
  if (card.image?.localPath) {
    return "/" + card.image.localPath;
  }
  return (
    card.imageUrl ||
    `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}&format=image`
  );
}

function getCardFallbackImageUrl(card) {
  return (
    card.imageUrl ||
    `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}&format=image`
  );
}

// Hover Card Popover Functions
let activePopoverCard = null;

function showCardPopover(card, e) {
  activePopoverCard = card;

  if (localFrenchCache.has(card.name)) {
    const cached = localFrenchCache.get(card.name);
    if (cached.frenchName && !card.frenchName) card.frenchName = cached.frenchName;
    if (cached.frenchText && !card.frenchText) card.frenchText = cached.frenchText;
    if (cached.frenchImageUrl && !card.frenchImageUrl) card.frenchImageUrl = cached.frenchImageUrl;
    if (cached.frenchLargeImageUrl && !card.frenchLargeImageUrl) card.frenchLargeImageUrl = cached.frenchLargeImageUrl;
  }

  const isFr = (state.cardExplorerLang || "FR") === "FR";
  const primarySrc = getCardImageUrl(card, isFr ? "FR" : "EN");
  const fallbackSrc = getCardFallbackImageUrl(card);

  elements.popoverImg.alt = isFr && card.frenchName ? card.frenchName : card.name;
  elements.popoverImg.onerror = () => {
    if (elements.popoverImg.src !== fallbackSrc) {
      elements.popoverImg.src = fallbackSrc;
    }
  };
  elements.popoverImg.src = primarySrc;
  elements.cardHoverPopover.hidden = false;
  elements.cardHoverPopover.style.display = "block";
  positionCardPopover(e);

  if (isFr && !card.frenchImageUrl) {
    fetchFrenchCardOnDemand(card, (updated) => {
      if (activePopoverCard?.name === updated.name) {
        const newSrc = updated.frenchLargeImageUrl || updated.frenchImageUrl;
        if (newSrc) {
          elements.popoverImg.src = newSrc;
        }
      }
    });
  }
}

function positionCardPopover(e) {
  if (elements.cardHoverPopover.hidden) return;
  const popoverWidth = 320;
  const popoverHeight = 445;
  const offset = 20;

  let left = e.clientX + offset;
  let top = e.clientY - popoverHeight / 3;

  // Viewport clamping
  if (left + popoverWidth > window.innerWidth - 16) {
    left = e.clientX - popoverWidth - offset;
  }
  if (left < 16) left = 16;
  if (top + popoverHeight > window.innerHeight - 16) {
    top = window.innerHeight - popoverHeight - 16;
  }
  if (top < 16) top = 16;

  elements.cardHoverPopover.style.left = `${Math.round(left)}px`;
  elements.cardHoverPopover.style.top = `${Math.round(top)}px`;
}

function hideCardPopover() {
  activePopoverCard = null;
  elements.cardHoverPopover.hidden = true;
  elements.cardHoverPopover.style.display = "none";
}

// Compute Ranking & Power Scores for the active cube
function computeCubeRankings(cubeKey) {
  if (state.cubeRankings && state.cubeRankings[cubeKey]) {
    return state.cubeRankings[cubeKey];
  }
  if (!state.cubeRankings) state.cubeRankings = {};

  const cubeCards = state.cards.filter(
    (c) => c.presentInCubes && c.presentInCubes.includes(cubeKey),
  );

  const rankings = computePowerRankings(cubeCards);

  state.cubeRankings[cubeKey] = rankings;
  return rankings;
}

// Update Modal Rules Text (French / English toggle)
function updateModalCardText(card) {
  if (!card) return;
  const isFr = state.modalCardLang === "FR";

  if (elements.langBtnFr) elements.langBtnFr.classList.toggle("active", isFr);
  if (elements.langBtnEn) elements.langBtnEn.classList.toggle("active", !isFr);

  // French Subtitle & Title
  if (isFr) {
    elements.modalCardTitle.textContent = card.frenchName || card.name;
    if (elements.modalCardSubtitleFr) {
      if (card.frenchName && card.frenchName !== card.name) {
        elements.modalCardSubtitleFr.textContent = `(VO : ${card.name})`;
        elements.modalCardSubtitleFr.hidden = false;
        elements.modalCardSubtitleFr.style.display = "block";
      } else {
        elements.modalCardSubtitleFr.hidden = true;
        elements.modalCardSubtitleFr.style.display = "none";
      }
    }
  } else {
    elements.modalCardTitle.textContent = card.name;
    if (elements.modalCardSubtitleFr) {
      if (card.frenchName && card.frenchName !== card.name) {
        elements.modalCardSubtitleFr.textContent = `(FR : ${card.frenchName})`;
        elements.modalCardSubtitleFr.hidden = false;
        elements.modalCardSubtitleFr.style.display = "block";
      } else {
        elements.modalCardSubtitleFr.hidden = true;
        elements.modalCardSubtitleFr.style.display = "none";
      }
    }
  }

  // Card Image
  if (elements.modalCardImage) {
    const primary = getCardImageUrl(card, isFr ? "FR" : "EN");
    const fallback = getCardFallbackImageUrl(card);
    elements.modalCardImage.onerror = () => {
      if (elements.modalCardImage.src !== fallback) {
        elements.modalCardImage.src = fallback;
      }
    };
    elements.modalCardImage.src = primary;
    elements.modalCardImage.alt = isFr && card.frenchName ? card.frenchName : card.name;
  }

  // Rules text
  if (elements.modalOracleText) {
    if (isFr) {
      elements.modalOracleText.textContent =
        card.frenchText || card.oracleText || "Aucun texte de règle spécifique.";
    } else {
      elements.modalOracleText.textContent = card.oracleText || "Aucun texte de règle spécifique.";
    }
  }
}

// Fetch official French card info (text and image) on-demand if missing and user is online
async function fetchFrenchCardOnDemand(card, onUpdate) {
  if (!card || !card.name) return;

  // 1. Check local cache
  if (localFrenchCache.has(card.name)) {
    const cached = localFrenchCache.get(card.name);
    if (cached.frenchName && !card.frenchName) card.frenchName = cached.frenchName;
    if (cached.frenchText && !card.frenchText) card.frenchText = cached.frenchText;
    if (cached.frenchImageUrl && !card.frenchImageUrl) card.frenchImageUrl = cached.frenchImageUrl;
    if (cached.frenchLargeImageUrl && !card.frenchLargeImageUrl) card.frenchLargeImageUrl = cached.frenchLargeImageUrl;
    if (onUpdate) onUpdate(card);
    if (card.frenchImageUrl) return;
  }

  // 2. Fetch from Scryfall
  try {
    const cleanName = card.name.split(" // ")[0].trim();
    const searchUrl = `https://api.scryfall.com/cards/search?q=%21%22${encodeURIComponent(cleanName)}%22+lang%3Afr`;
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent": "DraftMaster/1.0 (local-french-cache; github.com/tristanlenours/DraftMaster)",
        Accept: "application/json",
      },
    });

    if (res.ok) {
      const data = await res.json();
      const prints = data.data || [];
      const match =
        prints.find((p) => p.name === card.name && (p.image_uris || p.card_faces?.[0]?.image_uris)) ||
        prints.find((p) => p.image_uris || p.card_faces?.[0]?.image_uris) ||
        prints[0];

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
      }
    }
  } catch {
    // Offline mode: gracefully keeps fallback
  }
}

// Open Educational Card Detail Modal (Screenshot 3)
function openCardModal(card) {
  state.selectedCard = card;
  const cubeKey = state.activeCubeKey;
  const analysis = card.cubeAnalyses?.[cubeKey];
  const pedagogy = analysis?.pedagogy;

  // Left Column : Image & Quadrants
  const isFr = (state.cardExplorerLang || "FR") === "FR";
  state.modalCardLang = isFr ? "FR" : "EN";

  const primaryModalSrc = getCardImageUrl(card, state.modalCardLang);
  const fallbackModalSrc = getCardFallbackImageUrl(card);

  elements.modalCardImage.onerror = () => {
    if (elements.modalCardImage.src !== fallbackModalSrc) {
      elements.modalCardImage.src = fallbackModalSrc;
    }
  };
  elements.modalCardImage.src = primaryModalSrc;
  elements.modalCardImage.alt = isFr && card.frenchName ? card.frenchName : card.name;

  const q = card.objectiveAnalysis?.quadrantStrengths || {
    opening: 4.0,
    developing: 4.0,
    parity: 4.0,
    behind: 4.0,
  };
  elements.qValOpening.textContent = q.opening.toFixed(1);
  elements.qValDeveloping.textContent = q.developing.toFixed(1);
  elements.qValParity.textContent = q.parity.toFixed(1);
  elements.qValBehind.textContent = q.behind.toFixed(1);

  // Right Column : Header Info
  elements.modalCardTitle.textContent = isFr && card.frenchName ? card.frenchName : card.name;
  elements.modalCardTypeline.textContent = card.typeLine || "Carte";
  elements.modalActiveCubeBadge.textContent = CUBE_CONFIGS[cubeKey]?.name || cubeKey;

  // Tier & Power Ranking Showcase Box
  const tier = getCardTier(card);
  const tierLower = tier.toLowerCase();
  const rankings = computeCubeRankings(cubeKey);
  const cardKey = card.oracleId || card.slug || card.name;
  const rankInfo = rankings[cardKey] || {
    rank: 1,
    total: 541,
    score: card.powerScore?.score || 1,
    percentile: 10,
  };

  if (elements.modalRankingHero) {
    elements.modalRankingHero.className = `modal-ranking-hero tier-${tierLower}`;
  }
  if (elements.modalHeroTierCard) {
    elements.modalHeroTierCard.className = `hero-tier-card tier-${tierLower}`;
  }
  if (elements.modalHeroTierLetter) {
    elements.modalHeroTierLetter.textContent = tier;
  }
  if (elements.modalHeroTierLabel) {
    elements.modalHeroTierLabel.textContent = `TIER ${tier}`;
  }
  if (elements.modalHeroPowerScore) {
    elements.modalHeroPowerScore.textContent = Math.round(rankInfo.score);
  }
  if (elements.modalHeroPowerBar) {
    elements.modalHeroPowerBar.style.width = `${toPowerBarPercentage(rankInfo.score)}%`;
  }
  if (elements.modalHeroCubeRank) {
    elements.modalHeroCubeRank.textContent = `#${rankInfo.rank}`;
  }
  if (elements.modalHeroCubeTotal) {
    elements.modalHeroCubeTotal.textContent = `/ ${rankInfo.total}`;
  }
  if (elements.modalHeroPercentile) {
    elements.modalHeroPercentile.textContent = `Top ${rankInfo.percentile}% du Cube`;
  }
  if (elements.modalHeroCubeRole) {
    elements.modalHeroCubeRole.textContent = formatFit(analysis?.fit);
  }
  if (elements.modalHeroTempoImpact) {
    const tempoImp = card.objectiveAnalysis?.tempoImpact || "medium";
    const tempoLabel = tempoImp === "high" ? "Élevé" : tempoImp === "low" ? "Faible" : "Modéré";
    elements.modalHeroTempoImpact.textContent = `Impact : ${tempoLabel}`;
  }

  // Rules text (French default with toggle)
  updateModalCardText(card);

  // Background fetch French text & image if not locally present
  fetchFrenchCardOnDemand(card, (updated) => {
    if (state.selectedCard?.name === updated.name) {
      updateModalCardText(updated);
    }
  });

  // "Comment la jouer"
  elements.modalPedagogyPlay.textContent =
    pedagogy?.howToPlay ||
    analysis?.analysis ||
    `Dans ce cube, ${card.name} joue un rôle tactique essentiel sur courbe de mana.`;

  // Archetypes breakdown table
  renderModalArchetypeRows(card, analysis);

  // Key synergies
  renderModalSynergies(card, analysis);

  // Cross-cube perspective
  renderModalCrossCube(card);

  // Show Modal
  elements.modalBackdrop.classList.add("is-open");
  elements.modalBackdrop.style.display = "flex";
  document.body.style.overflow = "hidden";
}

// Render Modal Archetype breakdown table
function renderModalArchetypeRows(card, analysis) {
  elements.modalArchetypeRows.innerHTML = "";
  const rows = analysis?.pedagogy?.archetypeFit;

  if (rows && rows.length > 0) {
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      const pipsHtml = renderGuildPips(row.colors);
      tr.innerHTML = `
        <td class="deck-cell">
          <span class="guild-mana-pips">${pipsHtml}</span>
          <span>${row.archetype}</span>
        </td>
        <td><span class="table-grade-badge tier-${(row.grade || "B").toLowerCase()}-row">${row.grade || "B"}</span></td>
        <td style="font-weight: 700; color: var(--tier-s);">${row.winrateOrScore || "—"}</td>
        <td style="color: var(--text-secondary); font-size: 0.8rem;">${row.comment || ""}</td>
      `;
      elements.modalArchetypeRows.appendChild(tr);
    });
  } else {
    // Default fallback row based on current cube analysis
    const tr = document.createElement("tr");
    const pipsHtml = renderGuildPips(card.colors || []);
    const tier = analysis?.tier || "B";
    tr.innerHTML = `
      <td class="deck-cell">
        <span class="guild-mana-pips">${pipsHtml}</span>
        <span>${(analysis?.archetypes && analysis.archetypes[0]) || "Archétype Principal"}</span>
      </td>
      <td><span class="table-grade-badge tier-${tier.toLowerCase()}-row">${tier}</span></td>
      <td style="font-weight: 700; color: var(--tier-s);">Score +${analysis?.scoreModifier || 0}</td>
      <td style="color: var(--text-secondary); font-size: 0.8rem;">${formatFit(analysis?.fit)}</td>
    `;
    elements.modalArchetypeRows.appendChild(tr);
  }
}

// Render Guild Mana Pips
function renderGuildPips(colors) {
  if (!colors || colors.length === 0) {
    return '<span class="mana-symbol mana-c" style="width:16px;height:16px;font-size:0.6rem;margin-right:2px;">C</span>';
  }
  return colors
    .map((c) => {
      const cls = `mana-${c.toLowerCase()}`;
      return `<span class="mana-symbol ${cls}" style="width:16px;height:16px;font-size:0.6rem;margin-right:2px;">${c}</span>`;
    })
    .join("");
}

// Render Key Synergies
function renderModalSynergies(card, analysis) {
  elements.modalSynergiesGrid.innerHTML = "";
  const synergies = analysis?.pedagogy?.keySynergies || [];

  if (synergies.length > 0) {
    synergies.forEach((syn) => {
      const cardEl = document.createElement("div");
      cardEl.className = "synergy-card";
      cardEl.innerHTML = `
        <div class="synergy-card-header">
          <span class="synergy-partner-name">🔗 ${syn.cardName}</span>
          <span class="synergy-type-tag">${syn.synergyType || "Synergie"}</span>
        </div>
        <p class="synergy-card-desc">${syn.description}</p>
      `;

      // Click on synergy searches for partner card
      cardEl.addEventListener("click", () => {
        closeModal();
        elements.cardSearchInput.value = syn.cardName;
        state.searchQuery = syn.cardName.toLowerCase();
        renderMatrix();
      });

      elements.modalSynergiesGrid.appendChild(cardEl);
    });
  } else if (analysis?.keyPairs && analysis.keyPairs.length > 0) {
    analysis.keyPairs.forEach((pairName) => {
      const cardEl = document.createElement("div");
      cardEl.className = "synergy-card";
      cardEl.innerHTML = `
        <div class="synergy-card-header">
          <span class="synergy-partner-name">🔗 ${pairName}</span>
          <span class="synergy-type-tag">Association Clé</span>
        </div>
        <p class="synergy-card-desc">Carte clé synergisant naturellement avec ${card.name} dans les parties de ce format.</p>
      `;

      cardEl.addEventListener("click", () => {
        closeModal();
        elements.cardSearchInput.value = pairName;
        state.searchQuery = pairName.toLowerCase();
        renderMatrix();
      });

      elements.modalSynergiesGrid.appendChild(cardEl);
    });
  } else {
    elements.modalSynergiesGrid.innerHTML =
      '<p style="color: var(--text-muted); font-size: 0.8rem;">Aucune synergie spécifique renseignée pour ce format.</p>';
  }
}

// Render Cross Cube Comparative Section
function renderModalCrossCube(card) {
  elements.modalCrossCubeCards.innerHTML = "";
  const allAnalyses = card.cubeAnalyses || {};
  const cubeKeys = Object.keys(allAnalyses);

  if (cubeKeys.length <= 1) {
    elements.modalCrossCubeSection.hidden = true;
    return;
  }

  elements.modalCrossCubeSection.hidden = false;

  cubeKeys.forEach((k) => {
    const ana = allAnalyses[k];
    const isCurrent = k === state.activeCubeKey;
    const tier = ana.tier || "B";

    const cardEl = document.createElement("div");
    cardEl.className = `cross-cube-card ${isCurrent ? "is-active-cube" : ""}`;
    cardEl.innerHTML = `
      <div class="cross-card-header">
        <span class="cross-cube-name">${CUBE_CONFIGS[k]?.name || k}</span>
        <span class="cross-tier-pill tier-${tier.toLowerCase()}-row">${tier} Tier</span>
      </div>
      <p class="cross-card-text">${ana.analysis || formatFit(ana.fit)}</p>
      ${isCurrent ? '<span style="font-size:0.65rem; color:var(--tier-s); font-weight:700; margin-top:4px; display:block;">[Cube Actuel]</span>' : ""}
    `;

    // Click to switch cube
    if (!isCurrent) {
      cardEl.style.cursor = "pointer";
      cardEl.title = `Basculer sur ${CUBE_CONFIGS[k]?.name}`;
      cardEl.addEventListener("click", () => {
        elements.cubeSelect.value = k;
        state.activeCubeKey = k;
        renderMatrix();
        openCardModal(card);
      });
    }

    elements.modalCrossCubeCards.appendChild(cardEl);
  });
}

// Close Modal
function closeModal() {
  elements.modalBackdrop.classList.remove("is-open");
  elements.modalBackdrop.style.display = "none";
  document.body.style.overflow = "";
  state.selectedCard = null;
}

// Helpers
function formatPowerTier(tier) {
  switch (tier) {
    case "powered_vintage":
      return "⚡ Powered Vintage";
    case "pauper":
      return "🛡️ Pauper (100% Communes)";
    case "synergy_unpowered":
      return "👑 Synergie Unpowered";
    default:
      return tier;
  }
}

function formatFixing(fixing) {
  switch (fixing) {
    case "fast_fetches_duals":
      return "10 Fetches & ABUR Duals";
    case "bouncelands_taplands":
      return "Bouncelands & Taplands";
    case "rainbow_tribal":
      return "Fixing Chromatique & Changélins";
    default:
      return "Fixing Standard";
  }
}

function formatFit(fit) {
  switch (fit) {
    case "staple":
      return "Staple Incontournable";
    case "build_around":
      return "Build-Around / Payoff";
    case "support":
      return "Support Polyvalent";
    case "filler":
      return "Rôle-Player / Filler";
    case "trap":
      return "Piège de Tempo";
    default:
      return fit || "Rôle Standard";
  }
}

// Initialize on DOM ready
if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

