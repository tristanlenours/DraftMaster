// DraftMaster — 17Lands Style Mana Curve Deck Viewer
// Displays 40-card decks in mana-curve columns with cascading stacks and hover preview popovers.

import { loadImageWithFallback } from "./card-image.js";
import {
  getCardDisplayName,
  getCardImageFallbackUrl,
  getCardImageUrl,
  readCardLanguage,
} from "./card-language.js";

const DEFAULT_BASIC_LAND_DEFS = {
  Plains: {
    id: "basic-plains",
    name: "Plains",
    frenchName: "Plaine",
    typeLine: "Basic Land — Plains",
    isLand: true,
    cmc: 0,
  },
  Island: {
    id: "basic-island",
    name: "Island",
    frenchName: "Île",
    typeLine: "Basic Land — Island",
    isLand: true,
    cmc: 0,
  },
  Swamp: {
    id: "basic-swamp",
    name: "Swamp",
    frenchName: "Marais",
    typeLine: "Basic Land — Swamp",
    isLand: true,
    cmc: 0,
  },
  Mountain: {
    id: "basic-mountain",
    name: "Mountain",
    frenchName: "Montagne",
    typeLine: "Basic Land — Mountain",
    isLand: true,
    cmc: 0,
  },
  Forest: {
    id: "basic-forest",
    name: "Forest",
    frenchName: "Forêt",
    typeLine: "Basic Land — Forest",
    isLand: true,
    cmc: 0,
  },
};

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isBasicLand(card) {
  const name = card?.name || "";
  return ["Plains", "Island", "Swamp", "Mountain", "Forest"].includes(name);
}

function isLandCard(card) {
  if (!card) return false;
  if (card.isLand === true) return true;
  const tl = (card.typeLine || "").toLowerCase();
  return (
    tl.includes("land") ||
    card.id?.startsWith("basic-") ||
    isBasicLand(card) ||
    card.types?.includes("Land")
  );
}

/**
 * Normalizes a deck list into structured mana curve columns.
 */
export function groupDeckByManaCurve(cards = [], basicLands = {}) {
  const columns = {
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    "6+": [],
    lands: [],
  };

  const basicCounts = { Plains: 0, Island: 0, Swamp: 0, Mountain: 0, Forest: 0 };
  const nonBasicsAndSpells = [];

  for (const c of cards) {
    if (!c) continue;
    if (isBasicLand(c)) {
      basicCounts[c.name] = (basicCounts[c.name] || 0) + 1;
    } else {
      nonBasicsAndSpells.push(c);
    }
  }

  // Add explicit basicLands from params if provided and not already tallied
  if (basicLands && typeof basicLands === "object") {
    for (const [landName, count] of Object.entries(basicLands)) {
      if (typeof count === "number" && count > 0 && basicCounts[landName] === 0) {
        basicCounts[landName] = count;
      }
    }
  }

  // Separate non-basic lands and spells
  for (const card of nonBasicsAndSpells) {
    if (isLandCard(card)) {
      columns.lands.push({ card, qty: 1 });
    } else {
      const cmc = Math.max(0, Math.floor(card.cmc ?? 0));
      const colKey = cmc >= 6 ? "6+" : String(cmc);
      if (columns[colKey]) {
        columns[colKey].push({ card, qty: 1 });
      } else {
        columns["6+"].push({ card, qty: 1 });
      }
    }
  }

  // Sort spells in each CMC column alphabetically
  for (const key of ["0", "1", "2", "3", "4", "5", "6+"]) {
    columns[key].sort((a, b) => (a.card.name || "").localeCompare(b.card.name || ""));
  }

  // In lands column, sort non-basics first, then add basic lands grouped with counts
  columns.lands.sort((a, b) => (a.card.name || "").localeCompare(b.card.name || ""));

  for (const [basicName, count] of Object.entries(basicCounts)) {
    if (count > 0) {
      const baseDef = DEFAULT_BASIC_LAND_DEFS[basicName] || {
        id: `basic-${basicName.toLowerCase()}`,
        name: basicName,
        typeLine: `Basic Land — ${basicName}`,
        isLand: true,
        cmc: 0,
      };
      columns.lands.push({ card: baseDef, qty: count });
    }
  }

  return columns;
}

/**
 * Renders a full 17Lands-style Mana Curve Deck View into containerEl.
 */
export function render17LandsDeckView(containerEl, cards = [], options = {}) {
  if (!containerEl) return;
  const cardLanguage = options.language || readCardLanguage();
  const columns = groupDeckByManaCurve(cards, options.basicLands);

  const COLUMN_DEFS = [
    { key: "0", label: "0" },
    { key: "1", label: "1" },
    { key: "2", label: "2" },
    { key: "3", label: "3" },
    { key: "4", label: "4" },
    { key: "5", label: "5" },
    { key: "6+", label: "6+" },
    { key: "lands", label: "🏔️ Terrains" },
  ];

  const CARD_OFFSET = 34; // Vertical cascade offset in px
  const CARD_HEIGHT = 165; // Base height of visible card slot

  let boardHtml = `<div class="deck-17lands-board">`;

  COLUMN_DEFS.forEach((colDef) => {
    const colCards = columns[colDef.key] || [];
    const totalCount = colCards.reduce((sum, item) => sum + item.qty, 0);
    const stackHeight = colCards.length > 0 ? (colCards.length - 1) * CARD_OFFSET + CARD_HEIGHT : CARD_HEIGHT;

    let stackHtml = "";
    colCards.forEach((item, index) => {
      const { card, qty } = item;
      const displayName = getCardDisplayName(card, cardLanguage);
      const topOffset = index * CARD_OFFSET;
      const zIndex = index + 1;

      stackHtml += `
        <div class="curve-card-slot"
             data-card-id="${card.id || ""}"
             data-col-key="${colDef.key}"
             data-card-idx="${index}"
             style="top: ${topOffset}px; z-index: ${zIndex};"
             title="${escapeHtml(displayName)}">
          <img class="curve-card-img"
               alt="${escapeHtml(displayName)}"
               loading="lazy" />
          ${qty > 1 ? `<span class="curve-card-qty-badge">x${qty}</span>` : ""}
        </div>
      `;
    });

    boardHtml += `
      <div class="curve-col" data-col="${colDef.key}">
        <div class="curve-col-header">
          <span class="curve-col-cmc-badge">${colDef.label}</span>
          <span class="curve-col-count">(${totalCount})</span>
        </div>
        <div class="curve-col-stack" style="height: ${stackHeight}px;">
          ${stackHtml}
        </div>
      </div>
    `;
  });

  boardHtml += `</div>`;

  // Hover Card Popover element
  const popoverHtml = `
    <div class="deck-card-hover-popover" id="deck-card-hover-popover">
      <img id="deck-card-hover-popover-img" alt="Card Preview" />
    </div>
  `;

  containerEl.innerHTML = `
    <div class="deck-17lands-container">
      ${boardHtml}
      ${popoverHtml}
    </div>
  `;

  // Attach images with fallback
  COLUMN_DEFS.forEach((colDef) => {
    const colCards = columns[colDef.key] || [];
    const colEl = containerEl.querySelector(`.curve-col[data-col="${colDef.key}"]`);
    if (!colEl) return;

    colEl.querySelectorAll(".curve-card-img").forEach((img, idx) => {
      const item = colCards[idx];
      if (item && item.card) {
        const src = getCardImageUrl(item.card, cardLanguage, false);
        const fallback = getCardImageFallbackUrl(item.card, cardLanguage);
        loadImageWithFallback(img, src, fallback);
      }
    });
  });

  // Setup interactive card hover preview popover
  const popover = containerEl.querySelector("#deck-card-hover-popover");
  const popoverImg = containerEl.querySelector("#deck-card-hover-popover-img");

  if (popover && popoverImg) {
    const showPopover = (card, targetSlot) => {
      if (!card) return;
      const largeSrc = getCardImageUrl(card, cardLanguage, true);
      const fallback = getCardImageFallbackUrl(card, cardLanguage);
      loadImageWithFallback(popoverImg, largeSrc, fallback);

      const rect = targetSlot.getBoundingClientRect();
      const popoverWidth = 260;
      const popoverHeight = 360;

      // Position to right or left of slot based on viewport room
      let left = rect.right + 12;
      if (left + popoverWidth > window.innerWidth - 16) {
        left = rect.left - popoverWidth - 12;
      }
      if (left < 16) {
        left = Math.max(16, (window.innerWidth - popoverWidth) / 2);
      }

      let top = rect.top - 20;
      if (top + popoverHeight > window.innerHeight - 16) {
        top = Math.max(16, window.innerHeight - popoverHeight - 16);
      }
      if (top < 16) top = 16;

      popover.style.left = `${left}px`;
      popover.style.top = `${top}px`;
      popover.style.display = "block";
    };

    const hidePopover = () => {
      popover.style.display = "none";
    };

    containerEl.querySelectorAll(".curve-card-slot").forEach((slot) => {
      const colKey = slot.dataset.colKey;
      const idx = Number(slot.dataset.cardIdx);
      const cardItem = columns[colKey]?.[idx];

      if (cardItem && cardItem.card) {
        slot.addEventListener("mouseenter", () => showPopover(cardItem.card, slot));
        slot.addEventListener("mouseleave", hidePopover);

        // Click / Touch toggle for mobile
        slot.addEventListener("click", (e) => {
          if (window.innerWidth <= 768) {
            e.stopPropagation();
            if (popover.style.display === "block") {
              hidePopover();
            } else {
              showPopover(cardItem.card, slot);
            }
          }
        });
      }
    });

    document.addEventListener("click", (e) => {
      if (!popover.contains(e.target) && !e.target.closest(".curve-card-slot")) {
        hidePopover();
      }
    });
  }
}
