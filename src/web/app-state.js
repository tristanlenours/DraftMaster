// Shared UI state, DOM element registry and small helpers used by every view.
import { sanitizeFrenchCache } from "./card-image.js";
import { readCardLanguage } from "./card-language.js";
import { CUBE_KEYS } from "./cube-config.js";

export const TIERS = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"];

export function toTierCssClass(tier) {
  const normalized = String(tier).toLowerCase();
  if (normalized.endsWith("+")) return `${normalized.slice(0, -1)}-plus`;
  if (normalized.endsWith("-")) return `${normalized.slice(0, -1)}-minus`;
  return normalized;
}

export const COLOR_COLUMNS = [
  { key: "W", label: "Blanc", symbol: "W", cssClass: "color-w" },
  { key: "U", label: "Bleu", symbol: "U", cssClass: "color-u" },
  { key: "B", label: "Noir", symbol: "B", cssClass: "color-b" },
  { key: "R", label: "Rouge", symbol: "R", cssClass: "color-r" },
  { key: "G", label: "Vert", symbol: "G", cssClass: "color-g" },
  { key: "MULTI", label: "Multi", symbol: "M", cssClass: "color-multi" },
  { key: "COLORLESS", label: "Incolore", symbol: "C", cssClass: "color-c" },
];

export const MANA_SVGS = {
  W: `<svg viewBox="0 0 100 100" class="mana-svg" aria-label="Blanc"><circle cx="50" cy="50" r="46" fill="#f8fafc" stroke="#cbd5e1" stroke-width="4"/><path d="M50 22 L54 36 L68 26 L63 40 L78 44 L66 52 L76 64 L62 65 L64 80 L51 72 L47 86 L41 72 L28 80 L30 65 L16 64 L26 52 L14 44 L29 40 L24 26 L38 36 Z" fill="#ca8a04"/><circle cx="50" cy="50" r="13" fill="#ca8a04"/></svg>`,
  U: `<svg viewBox="0 0 100 100" class="mana-svg" aria-label="Bleu"><circle cx="50" cy="50" r="46" fill="#0284c7" stroke="#38bdf8" stroke-width="4"/><path d="M50 20 C42 34 26 54 26 68 C26 81 37 88 50 88 C63 88 74 81 74 68 C74 54 58 34 50 20 Z" fill="#ffffff"/></svg>`,
  B: `<svg viewBox="0 0 100 100" class="mana-svg" aria-label="Noir"><circle cx="50" cy="50" r="46" fill="#334155" stroke="#64748b" stroke-width="4"/><path d="M50 22 C35 22 27 34 27 48 C27 58 33 66 37 70 L37 80 L44 80 L44 74 L56 74 L56 80 L63 80 L63 70 C67 66 73 58 73 48 C73 34 65 22 50 22 Z M40 48 A6 8 0 1 1 40 47.9 Z M60 48 A6 8 0 1 1 60 47.9 Z M50 64 L46 68 L54 68 Z" fill="#0f172a"/></svg>`,
  R: `<svg viewBox="0 0 100 100" class="mana-svg" aria-label="Rouge"><circle cx="50" cy="50" r="46" fill="#dc2626" stroke="#f87171" stroke-width="4"/><path d="M48 18 C52 30 64 36 62 48 C68 42 70 34 68 28 C76 38 78 54 70 68 C62 82 46 86 38 78 C28 68 30 52 38 42 C38 52 44 58 48 54 C46 44 42 34 48 18 Z" fill="#ffffff"/></svg>`,
  G: `<svg viewBox="0 0 100 100" class="mana-svg" aria-label="Vert"><circle cx="50" cy="50" r="46" fill="#16a34a" stroke="#4ade80" stroke-width="4"/><path d="M50 18 C38 28 32 42 38 54 C30 56 26 64 30 72 C34 80 44 82 46 84 L46 88 L54 88 L54 84 C56 82 66 80 70 72 C74 64 70 56 62 54 C68 42 62 28 50 18 Z" fill="#ffffff"/></svg>`,
  MULTI: `<svg viewBox="0 0 100 100" class="mana-svg" aria-label="Multicolore"><circle cx="50" cy="50" r="46" fill="#d97706" stroke="#fbbf24" stroke-width="4"/><circle cx="50" cy="50" r="26" fill="none" stroke="#ffffff" stroke-width="5"/><polygon points="50,18 58,40 82,50 58,60 50,82 42,60 18,50 42,40" fill="#ffffff"/></svg>`,
  COLORLESS: `<svg viewBox="0 0 100 100" class="mana-svg" aria-label="Incolore"><circle cx="50" cy="50" r="46" fill="#475569" stroke="#94a3b8" stroke-width="4"/><polygon points="50,18 78,50 50,82 22,50" fill="#ffffff"/></svg>`,
};

// Local cache for French card translations & images (shared across app and solo draft)
export const localFrenchCache = new Map();
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

export function saveFrenchCache(key, data) {
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

export function hydrateCardFromFrenchCache(card) {
  const cached = card?.name ? localFrenchCache.get(card.name) : null;
  if (!cached) return card;

  if (cached.frenchName && !card.frenchName) card.frenchName = cached.frenchName;
  if (cached.frenchText && !card.frenchText) card.frenchText = cached.frenchText;
  if (cached.frenchImageUrl && !card.frenchImageUrl) card.frenchImageUrl = cached.frenchImageUrl;
  if (cached.frenchLargeImageUrl && !card.frenchLargeImageUrl) {
    card.frenchLargeImageUrl = cached.frenchLargeImageUrl;
  }
  return card;
}

export function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// App State
export const state = {
  activeCubeKey: CUBE_KEYS.TITOU,
  cubesMeta: {},
  cards: [],
  selectedType: "ALL",
  selectedCmc: "ALL",
  searchQuery: "",
  onlyShared: false,
  onlyUpgrades: false,
  cardsViewMode: "cube",
  cubesSuggestions: {},
  selectedCard: null,
  selectedCardComparison: null,
  selectedDeckReview: null,
  cardLanguage: readCardLanguage(),
  cubeRankings: {},
  currentView: "home",
  detailCubeKey: CUBE_KEYS.TITOU,
};

// DOM References
export const elements = {
  // SPA Views
  viewHome: document.getElementById("view-home"),
  viewCubes: document.getElementById("view-cubes"),
  viewCards: document.getElementById("view-cards"),
  viewBots: document.getElementById("view-bots"),
  viewDraft: document.getElementById("view-draft"),
  viewRecords: document.getElementById("view-records"),
  viewAdmin: document.getElementById("view-admin"),
  viewMulti: document.getElementById("view-multi"),
  viewTournaments: document.getElementById("view-tournaments"),
  viewDeckLab: document.getElementById("view-deck-lab"),

  // Navigation Links (Desktop)
  brandHomeBtn: document.getElementById("brand-home-btn"),
  navBtnHome: document.getElementById("nav-btn-home"),
  navBtnCubes: document.getElementById("nav-btn-cubes"),
  navBtnCards: document.getElementById("nav-btn-cards"),
  navBtnBots: document.getElementById("nav-btn-bots"),
  navBtnDraft: document.getElementById("nav-btn-draft"),
  navBtnRecords: document.getElementById("nav-btn-records"),
  navBtnMulti: document.getElementById("nav-btn-multi"),
  navBtnTournaments: document.getElementById("nav-btn-tournaments"),
  navBtnDeckLab: document.getElementById("nav-btn-deck-lab"),
  globalLangFr: document.getElementById("global-lang-fr"),
  globalLangEn: document.getElementById("global-lang-en"),

  // Navigation Links (Mobile Drawer)
  mobileMenuBtn: document.getElementById("mobile-menu-btn"),
  mobileNavDrawer: document.getElementById("mobile-nav-drawer"),
  mobileNavBackdrop: document.getElementById("mobile-nav-backdrop"),
  mobileNavHome: document.getElementById("mobile-nav-home"),
  mobileNavCubes: document.getElementById("mobile-nav-cubes"),
  mobileNavCards: document.getElementById("mobile-nav-cards"),
  mobileNavBots: document.getElementById("mobile-nav-bots"),
  mobileNavDraft: document.getElementById("mobile-nav-draft"),
  mobileNavRecords: document.getElementById("mobile-nav-records"),
  mobileNavMulti: document.getElementById("mobile-nav-multi"),
  mobileNavTournaments: document.getElementById("mobile-nav-tournaments"),
  mobileNavDeckLab: document.getElementById("mobile-nav-deck-lab"),

  // Home CTA Buttons
  homeCtaDraft: document.getElementById("home-cta-draft"),
  homeCtaCubes: document.getElementById("home-cta-cubes"),
  homeCtaCards: document.getElementById("home-cta-cards"),
  homeCtaBots: document.getElementById("home-cta-bots"),
  homeCtaMulti: document.getElementById("home-cta-multi"),

  // Multiplayer teaser interactive elements
  btnMultiVip: document.getElementById("btn-multi-vip"),
  multiVipEmail: document.getElementById("multi-vip-email"),
  multiVipFeedback: document.getElementById("multi-vip-feedback"),

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

  // Cubes Detailed Panel & Mobile Controls
  cubeDetailPanel: document.getElementById("cube-detail-panel"),
  btnCubesModeCards: document.getElementById("btn-cubes-mode-cards"),
  btnCubesModeTable: document.getElementById("btn-cubes-mode-table"),
  cubesMobilePillBar: document.getElementById("cubes-mobile-pill-bar"),
  cubesMobileCardsView: document.getElementById("cubes-mobile-cards-view"),

  // Controls Bar
  cubeSelect: document.getElementById("cube-select"),
  typeSelect: document.getElementById("type-select"),
  cmcChipsGroup: document.getElementById("cmc-chips-group"),
  cardSearchInput: document.getElementById("card-search-input"),
  sharedFilterBtn: document.getElementById("shared-filter-btn"),
  upgradeFilterBtn: document.getElementById("upgrade-filter-btn"),
  btnViewCubeCards: document.getElementById("btn-view-cube-cards"),
  btnViewMaybeboard: document.getElementById("btn-view-maybeboard"),
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
  modalUpgradeSection: document.getElementById("modal-upgrade-section"),
  modalUpgradeSectionTitle: document.getElementById("modal-upgrade-section-title"),
  modalUpgradeBadgesRow: document.getElementById("modal-upgrade-badges-row"),
  modalUpgradeRecencyPill: document.getElementById("modal-upgrade-recency-pill"),
  modalUpgradeBenchmarkPill: document.getElementById("modal-upgrade-benchmark-pill"),
  modalUpgradeCurrPane: document.getElementById("modal-upgrade-curr-pane"),
  modalUpgradeCurrPaneLabel: document.getElementById("modal-upgrade-curr-pane-label"),
  modalUpgradeCurrStatus: document.getElementById("modal-upgrade-curr-status"),
  modalUpgradeCurrName: document.getElementById("modal-upgrade-curr-name"),
  modalUpgradeCurrScore: document.getElementById("modal-upgrade-curr-score"),
  modalUpgradeSuggPane: document.getElementById("modal-upgrade-sugg-pane"),
  modalUpgradeSuggPaneLabel: document.getElementById("modal-upgrade-sugg-pane-label"),
  modalUpgradeSuggStatus: document.getElementById("modal-upgrade-sugg-status"),
  modalUpgradeSuggName: document.getElementById("modal-upgrade-sugg-name"),
  modalUpgradeSuggScore: document.getElementById("modal-upgrade-sugg-score"),
  modalBtnSwapArrow: document.getElementById("modal-btn-swap-arrow"),
  modalUpgradeDelta: document.getElementById("modal-upgrade-delta"),
  modalUpgradeMultiTargetsWrap: document.getElementById("modal-upgrade-multi-targets-wrap"),
  modalUpgradeMultiTargetsChips: document.getElementById("modal-upgrade-multi-targets-chips"),
  modalUpgradeReason: document.getElementById("modal-upgrade-reason"),
  modalUpgradeMetaBox: document.getElementById("modal-upgrade-meta-box"),
  modalUpgradeStrategicRole: document.getElementById("modal-upgrade-strategic-role"),
  modalUpgradeMetaSummary: document.getElementById("modal-upgrade-meta-summary"),
  modalUpgradeArchetypesWrap: document.getElementById("modal-upgrade-archetypes-wrap"),
  modalUpgradeArchetypesChips: document.getElementById("modal-upgrade-archetypes-chips"),
  modalBtnInspectUpgrade: document.getElementById("modal-btn-inspect-upgrade"),
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
