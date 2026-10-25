// Card explorer: tier matrix, list views, filtering and the hover popover.
import { COLOR_COLUMNS, MANA_SVGS, TIERS, elements, escapeHtml, hydrateCardFromFrenchCache, localFrenchCache, state, toTierCssClass } from "./app-state.js";
import { getCardDisplayName, getCardImageFallbackUrl, getCardImageUrl as resolveCardImageUrl } from "./card-language.js";
import { fetchFrenchCardOnDemand, getOrBuildCardObject, openCardModal, updateModalCardText } from "./card-modal.js";
import { CUBE_CONFIGS } from "./cube-config.js";
import { computeCubeTierThresholds, computePowerRankings, scoreToRelativeTierWithThresholds } from "./power-ranking.js";

// Cache of cube tier thresholds: { [cubeKey]: CubeTierThreshold[] }
const cubeTierThresholdsCache = {};

function getCubeTierThresholds(cubeKey) {
  if (!cubeKey) return null;
  if (cubeTierThresholdsCache[cubeKey]) {
    return cubeTierThresholdsCache[cubeKey];
  }
  const cubeCards = state.cards.filter(
    (c) => c.presentInCubes && c.presentInCubes.includes(cubeKey),
  );
  if (cubeCards.length === 0) return null;
  const thresholds = computeCubeTierThresholds(cubeCards);
  cubeTierThresholdsCache[cubeKey] = thresholds;
  return thresholds;
}

// Determine Tier from active Cube analysis or ranking if available, otherwise from Power Ranking score
export function getCardTier(card, cubeKey = state.activeCubeKey) {
  if (cubeKey) {
    const rankings = computeCubeRankings(cubeKey);
    const cardKey = card.oracleId || card.slug || card.name;
    if (rankings && rankings[cardKey]?.relativeTier) {
      return rankings[cardKey].relativeTier;
    }
    const cubeTier = card.cubeAnalyses && card.cubeAnalyses[cubeKey]?.tier;
    if (cubeTier && TIERS.includes(cubeTier)) {
      return cubeTier;
    }
    // For cards not in the cube (e.g. Maybeboard IA or upgrade candidates),
    // compute the tier using the exact same score thresholds (paliers) as this cube
    const thresholds = getCubeTierThresholds(cubeKey);
    if (thresholds && thresholds.length > 0) {
      const score = Number.isFinite(card.powerScore?.score) ? card.powerScore.score : 1;
      return scoreToRelativeTierWithThresholds(score, thresholds);
    }
  }
  const score = Number.isFinite(card.powerScore?.score) ? card.powerScore.score : 1;
  return scoreToCardTier(score);
}

function scoreToCardTier(score) {
  if (score >= 50) return "A+";
  if (score >= 45) return "A";
  if (score >= 40) return "A-";
  if (score >= 35) return "B+";
  if (score >= 30) return "B";
  if (score >= 25) return "B-";
  if (score >= 20) return "C+";
  if (score >= 15) return "C";
  if (score >= 11) return "C-";
  if (score >= 8) return "D+";
  if (score >= 5) return "D";
  if (score >= 3) return "D-";
  return "F";
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

  let baseCards = [];
  if (state.cardsViewMode === "maybeboard") {
    const suggestions = state.cubesSuggestions[cubeKey]?.maybeboard || [];
    baseCards = suggestions.map((item) => getOrBuildCardObject(item.card, cubeKey));
  } else {
    baseCards = state.cards.filter((card) => {
      return card.presentInCubes && card.presentInCubes.includes(cubeKey);
    });
  }

  return baseCards.filter((card) => {
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

    // 6. Only cards with upgrade proposals
    if (state.onlyUpgrades) {
      const hasUpgrade = Boolean(state.cubesSuggestions[cubeKey]?.upgrades?.[card.name]);
      if (!hasUpgrade) return false;
    }

    return true;
  });
}

// Render Limited Grades Matrix
export function renderMatrix() {
  const filteredCards = getFilteredCards();
  const cubeKey = state.activeCubeKey;
  const cubeName = CUBE_CONFIGS[cubeKey]?.name || "Cube";

  const totalInCube = state.cards.filter(
    (c) => c.presentInCubes && c.presentInCubes.includes(cubeKey),
  ).length;

  if (state.onlyUpgrades) {
    elements.resultsStats.innerHTML = `
      <span class="stats-count">${filteredCards.length} carte${filteredCards.length > 1 ? "s" : ""} avec mise à niveau</span>
      <span class="stats-filter-tag" style="background: rgba(234, 179, 8, 0.15); border-color: rgba(250, 204, 21, 0.4); color: #facc15;">
        Filtre actif : ⚡ Mises à niveau (${filteredCards.length} sur ${totalInCube})
        <button type="button" id="clear-upgrades-filter-btn" class="btn-clear-inline" title="Afficher toutes les cartes du cube">
          ✕ Afficher tout le cube
        </button>
      </span>
    `;
    const clearBtn = document.getElementById("clear-upgrades-filter-btn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        state.onlyUpgrades = false;
        elements.upgradeFilterBtn?.classList.remove("active");
        renderMatrix();
      });
    }
  } else if (state.cardsViewMode === "maybeboard") {
    elements.resultsStats.innerHTML = `<span class="stats-count">${filteredCards.length} carte${filteredCards.length > 1 ? "s" : ""} suggérée${filteredCards.length > 1 ? "s" : ""}</span>`;
  } else if (state.onlyShared) {
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
  const buckets = {};
  TIERS.forEach((t) => {
    buckets[t] = {};
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

  // 1. Build Desktop Rows (13 Relative Tiers)
  TIERS.forEach((tier) => {
    const tr = document.createElement("tr");
    tr.className = `tier-${toTierCssClass(tier)}-row`;

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

    // 2. Build Mobile LimitedGrades Section
    if (tierTotalCount > 0) {
      const mobileSection = createLimitedGradesMobileTierSection(
        tier,
        tierTotalCount,
        buckets[tier],
      );
      elements.mobileTierList.appendChild(mobileSection);
    }
  });

  if (filteredCards.length === 0) {
    elements.mobileTierList.innerHTML = `
      <div style="text-align: center; padding: 40px 16px; color: var(--text-muted);">
        <p style="font-size: 1.05rem; font-weight: 600; color: var(--text-secondary);">Aucune carte ne correspond aux filtres</p>
        <p style="font-size: 0.8rem; margin-top: 6px;">Essayez d'ajuster votre recherche ou vos critères.</p>
      </div>
    `;
  }
}

function getCardListPresentation(card) {
  hydrateCardFromFrenchCache(card);
  const isFr = state.cardLanguage === "FR";
  const displayName = getCardDisplayName(card, state.cardLanguage);
  const isShared = (card.presentInCubes || []).length > 1;
  const rawScore = Number.isFinite(card.powerScore?.score) ? card.powerScore.score : 1;
  const score = Math.round(rawScore * 10) / 10;
  const upgrade = state.cubesSuggestions[state.activeCubeKey]?.upgrades?.[card.name];
  const maybeItem = state.cubesSuggestions[state.activeCubeKey]?.maybeboard?.find(
    (m) => m.card.name === card.name,
  );
  let suggestionBadge = null;
  if (upgrade) {
    const isRecent = Boolean(
      upgrade.isRecent || (upgrade.releaseYear && upgrade.releaseYear >= 2023),
    );
    const suggestedName = getCardDisplayName(upgrade.suggestedCard, state.cardLanguage);
    suggestionBadge = {
      icon: isRecent ? "✨" : "⚡",
      title: `Mise à niveau disponible (poste pour poste) : ${suggestedName} (+${upgrade.scoreDelta})${isRecent ? " (Nouveauté)" : ""}`,
    };
  } else if (maybeItem) {
    const isRecent = Boolean(
      maybeItem.isRecent || (maybeItem.releaseYear && maybeItem.releaseYear >= 2023),
    );
    suggestionBadge = {
      icon: isRecent ? "✨" : "💡",
      title: `Suggestion Maybeboard${isRecent ? ` (Nouveauté ${maybeItem.releaseYear || "Veille"})` : ""}`,
    };
  }

  const title =
    card.frenchName && card.frenchName !== card.name
      ? isFr
        ? `${card.frenchName} (VO: ${card.name})`
        : `${card.name} (FR: ${card.frenchName})`
      : card.name;

  return { displayName, isShared, score, suggestionBadge, title };
}

function refreshCardListLocalization(element, card, nameSelector) {
  const { displayName, title } = getCardListPresentation(card);
  element.setAttribute("aria-label", displayName);
  element.title = title;
  const nameElement = element.querySelector(nameSelector);
  if (nameElement) nameElement.textContent = displayName;
}

function observeVisibleFrenchCard(element, card, nameSelector) {
  if (state.cardLanguage !== "FR" || card.frenchName) return;

  const loadTranslation = () => {
    void fetchFrenchCardOnDemand(card, (updated) => {
      if (element.isConnected && state.cardLanguage === "FR") {
        refreshCardListLocalization(element, updated, nameSelector);
      }
      if (state.selectedCard?.name === updated.name) updateModalCardText(updated);
    });
  };

  if (typeof IntersectionObserver !== "function") {
    loadTranslation();
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    loadTranslation();
  });
  observer.observe(element);
}

function attachCardListInteractions(element, card, nameSelector, withPopover) {
  if (!(element instanceof HTMLButtonElement)) {
    element.setAttribute("tabindex", "0");
    element.setAttribute("role", "button");
  }
  refreshCardListLocalization(element, card, nameSelector);

  element.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    hideCardPopover();
    openCardModal(card);
  });
  element.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    hideCardPopover();
    openCardModal(card);
  });

  if (withPopover) {
    attachHoverCardPreview(element, card);
  }
  observeVisibleFrenchCard(element, card, nameSelector);
}

export function attachHoverCardPreview(element, card) {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  element.addEventListener("mouseenter", () => showCardPopover(card, element));
  element.addEventListener("mouseleave", hideCardPopover);
}

function renderSuggestionBadge(suggestionBadge) {
  if (!suggestionBadge) return "";
  return `<span class="card-upgrade-badge" title="${escapeHtml(suggestionBadge.title)}">${suggestionBadge.icon}</span>`;
}

// Create Card Matrix Item (Interactive, with hover popover and click modal)
function createCardMatrixItem(card, colClass) {
  const item = document.createElement("div");
  item.className = `card-matrix-item ${colClass}`;
  const presentation = getCardListPresentation(card);

  item.innerHTML = `
    <span class="card-item-name">${escapeHtml(presentation.displayName)}</span>
    <span class="card-item-score" title="Power score : ${presentation.score}">${presentation.score}</span>
    ${renderSuggestionBadge(presentation.suggestionBadge)}
    ${presentation.isShared ? '<span class="card-shared-pip" title="Présente dans plusieurs cubes">🔄</span>' : ""}
  `;
  attachCardListInteractions(item, card, ".card-item-name", true);

  return item;
}

// Format Mana Cost into clean compact pip string
export function formatCostPip(manaCost, cmc) {
  if (!manaCost) return cmc ? String(cmc) : "0";
  // Replace '{1}{U}' with '1U' or cleaner symbols
  return manaCost.replace(/[{}]/g, "");
}

// Build Mobile LimitedGrades Tier Section
function createLimitedGradesMobileTierSection(tier, count, colorBuckets) {
  const section = document.createElement("div");
  section.className = "lg-tier-section";
  section.dataset.tier = tier;

  // Prominent Tier Header
  const header = document.createElement("div");
  header.className = "lg-tier-header";
  header.innerHTML = `
    <span class="lg-tier-title">${tier}</span>
    <span class="lg-tier-count-pill">${count} carte${count > 1 ? "s" : ""}</span>
  `;
  section.appendChild(header);

  const groupsContainer = document.createElement("div");
  groupsContainer.className = "lg-tier-groups";

  COLOR_COLUMNS.forEach((col) => {
    const cards = colorBuckets[col.key];
    if (!cards || cards.length === 0) return;

    const colorGroup = document.createElement("div");
    colorGroup.className = `lg-color-group ${col.cssClass}`;

    // Left Column: Badge with Mana SVG
    const badgeCol = document.createElement("div");
    badgeCol.className = "lg-color-badge-col";
    badgeCol.title = col.label;

    const symbolWrap = document.createElement("div");
    symbolWrap.className = "lg-mana-symbol-wrap";
    symbolWrap.innerHTML = MANA_SVGS[col.key] || "";
    badgeCol.appendChild(symbolWrap);
    colorGroup.appendChild(badgeCol);

    // Right Column: Stack of Cards
    const cardsList = document.createElement("div");
    cardsList.className = "lg-cards-list";

    cards.forEach((card) => {
      const cardRow = createLimitedGradesCardRow(card);
      cardsList.appendChild(cardRow);
    });

    colorGroup.appendChild(cardsList);
    groupsContainer.appendChild(colorGroup);
  });

  section.appendChild(groupsContainer);
  return section;
}

// Create LimitedGrades Card Row (Compact, Interactive, with localized name & score)
function createLimitedGradesCardRow(card) {
  const row = document.createElement("button");
  row.type = "button";
  row.className = "lg-card-row";
  const presentation = getCardListPresentation(card);

  row.innerHTML = `
    <span class="lg-card-tick"></span>
    <span class="lg-card-name">${escapeHtml(presentation.displayName)}</span>
    ${renderSuggestionBadge(presentation.suggestionBadge)}
    ${presentation.isShared ? '<span class="lg-card-shared" title="Présente dans plusieurs cubes">🔄</span>' : ""}
    <span class="lg-card-score" title="Power score : ${presentation.score}">${presentation.score}</span>
  `;
  attachCardListInteractions(row, card, ".lg-card-name", true);

  return row;
}

// Hover Card Popover Functions
let activePopoverCard = null;

function showCardPopover(card, anchorElement) {
  activePopoverCard = card;

  if (localFrenchCache.has(card.name)) {
    const cached = localFrenchCache.get(card.name);
    if (cached.frenchName && !card.frenchName) card.frenchName = cached.frenchName;
    if (cached.frenchText && !card.frenchText) card.frenchText = cached.frenchText;
    if (cached.frenchImageUrl && !card.frenchImageUrl) card.frenchImageUrl = cached.frenchImageUrl;
    if (cached.frenchLargeImageUrl && !card.frenchLargeImageUrl)
      card.frenchLargeImageUrl = cached.frenchLargeImageUrl;
  }

  const isFr = state.cardLanguage === "FR";
  const primarySrc = resolveCardImageUrl(card, state.cardLanguage, true);
  const fallbackSrc = getCardImageFallbackUrl(card, state.cardLanguage);

  elements.popoverImg.alt = isFr && card.frenchName ? card.frenchName : card.name;
  elements.popoverImg.onerror = () => {
    if (elements.popoverImg.src !== fallbackSrc) {
      elements.popoverImg.src = fallbackSrc;
    }
  };
  elements.popoverImg.src = primarySrc;
  elements.cardHoverPopover.classList.add("is-hover-preview");
  elements.cardHoverPopover.hidden = false;
  elements.cardHoverPopover.style.display = "block";
  positionCardPopover(anchorElement);

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

function positionCardPopover(anchorElement) {
  if (elements.cardHoverPopover.hidden) return;
  const anchorRect = anchorElement.getBoundingClientRect();
  const popoverWidth = 320;
  const popoverHeight = 445;
  const offset = 12;

  let left = anchorRect.right + offset;
  let top = anchorRect.top + anchorRect.height / 2 - popoverHeight / 2;

  // Viewport clamping
  if (left + popoverWidth > window.innerWidth - 16) {
    left = anchorRect.left - popoverWidth - offset;
  }
  if (left < 16) left = 16;
  if (top + popoverHeight > window.innerHeight - 16) {
    top = window.innerHeight - popoverHeight - 16;
  }
  if (top < 16) top = 16;

  elements.cardHoverPopover.style.left = `${Math.round(left)}px`;
  elements.cardHoverPopover.style.top = `${Math.round(top)}px`;
}

export function hideCardPopover() {
  activePopoverCard = null;
  elements.cardHoverPopover.classList.remove("is-hover-preview");
  elements.cardHoverPopover.hidden = true;
  elements.cardHoverPopover.style.display = "none";
}

// Compute Ranking & Power Scores for the active cube
export function computeCubeRankings(cubeKey) {
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
