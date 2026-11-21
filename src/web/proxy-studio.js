// Proxy & Scans Studio: dual-variant (Classic + Popular Original) high-res card browser,
// Hybrid French proxy renderer, Scryfall print picker, A4 3x3 print sheet & ZIP exporter.
import { elements, escapeHtml, state } from "./app-state.js";
import { CUBE_CONFIGS } from "./cube-config.js";
import { parseMtgaDeckText } from "./mtga-deck-text.js";
import {
  clearProxyRenderCache,
  renderProxyCardDataUrl,
  renderProxyCardPngBytes,
  shouldUseFrenchCanvasRender,
  toProxiedImageUrl,
} from "./proxy-renderer.js";
import { buildZipArchive } from "./proxy-zip.js";

const OVERRIDES_STORAGE_KEY = "draftmaster_proxy_overrides_v1";
const PAGE_SIZE = 24;

const proxyState = {
  initialized: false,
  catalogLoaded: false,
  catalogLoading: false,
  catalogEntries: {},
  localOverrides: {},
  sourceKey: "titou_tribal",
  customDeckOracleIds: null,
  searchQuery: "",
  colorFilter: "ALL",
  statusFilter: "ALL",
  defaultVariant: "classic", // "classic" | "original"
  renderMode: "hybrid", // "hybrid" | "force_fr" | "raw"
  perCardVariant: new Map(), // oracleId -> "classic" | "original"
  basket: new Map(), // oracleId -> { quantity, variant }
  visibleCount: PAGE_SIZE,
  cropMarks: true,
  gapMm: 0,
  includeBackFaces: true,
  pickerCard: null,
  pickerSlot: "classic",
  pickerTab: "prints",
  pickerCandidates: [],
  pickerLoading: false,
  pickerFilter: "all",
  isExporting: false,
};

function loadLocalOverrides() {
  try {
    const raw = localStorage.getItem(OVERRIDES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveLocalOverrides() {
  try {
    localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(proxyState.localOverrides));
  } catch {
    // Graceful fallback when localStorage is unavailable or full
  }
}

function showToast(message, type = "info") {
  const container = document.getElementById("proxy-studio-feedback");
  if (!container) return;
  container.textContent = message;
  container.dataset.tone = type;
  container.hidden = false;
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    container.hidden = true;
  }, 4500);
}

function buildFallbackEntry(card) {
  const classicUrl = card.frenchImageUrl || card.imageUrl || card.image?.url || "";
  const isOfficialFr = Boolean(card.frenchImageUrl);
  const classic = {
    scryfallId: card.scryfallId || card.oracleId || card.slug,
    lang: isOfficialFr ? "fr" : "en",
    setCode: "MTG",
    setName: "Catalogue DraftMaster",
    collectorNumber: "",
    releasedAt: "",
    artist: "Wizards of the Coast",
    frame: "2015",
    frameEffects: [],
    borderColor: "black",
    promoTypes: [],
    fullArt: false,
    borderless: false,
    highresImage: true,
    imageStatus: "highres_scan",
    treatmentLabel: isOfficialFr ? "Classique FR" : "Classique EN",
    pngUrl: classicUrl,
    largeUrl: classicUrl,
    artCropUrl: card.image?.artCropUrl || "",
    isOfficialFrenchScan: isOfficialFr,
    needsFrenchProxyRender: !isOfficialFr,
    score: 0,
  };

  return {
    oracleId: card.oracleId,
    slug: card.slug,
    name: card.name,
    french: {
      name: card.frenchName || card.name,
      typeLine: card.typeLine || "",
      rulesText: card.frenchText || card.oracleText || "",
      source: card.frenchText ? "catalog_fr" : "translated_fallback",
      officialFrenchPrintExists: isOfficialFr,
    },
    classic,
    original: null,
    curatedAt: "",
    isFallback: true,
  };
}

function getMergedEntry(card) {
  const base = proxyState.catalogEntries[card.oracleId] || buildFallbackEntry(card);
  const override = proxyState.localOverrides[card.oracleId];
  if (!override) return base;
  return {
    ...base,
    classic: override.classic || base.classic,
    original: override.original !== undefined ? override.original : base.original,
    french: override.french ? { ...base.french, ...override.french } : base.french,
  };
}

function getActiveVariantKind(card, entry) {
  const explicit = proxyState.perCardVariant.get(card.oracleId);
  const desired = explicit || proxyState.defaultVariant;
  if (desired === "original" && entry.original) {
    return "original";
  }
  return "classic";
}

function getActiveVariant(card, entry) {
  const kind = getActiveVariantKind(card, entry);
  return {
    kind,
    variant: kind === "original" && entry.original ? entry.original : entry.classic,
  };
}

function getSourceCards() {
  const cards = state.cards || [];
  if (proxyState.sourceKey === "ALL") {
    return cards;
  }
  if (proxyState.sourceKey === "DECK" && proxyState.customDeckOracleIds) {
    const idSet = proxyState.customDeckOracleIds;
    return cards.filter((c) => idSet.has(c.oracleId));
  }
  return cards.filter(
    (card) => Array.isArray(card.presentInCubes) && card.presentInCubes.includes(proxyState.sourceKey),
  );
}

function getFilteredCards() {
  const base = getSourceCards();
  const query = proxyState.searchQuery.trim().toLowerCase();

  return base.filter((card) => {
    const entry = getMergedEntry(card);
    if (query) {
      const matchEn = card.name?.toLowerCase().includes(query);
      const matchFr =
        card.frenchName?.toLowerCase().includes(query) ||
        entry.french?.name?.toLowerCase().includes(query);
      if (!matchEn && !matchFr) return false;
    }

    if (proxyState.colorFilter !== "ALL") {
      const colors = card.colors || [];
      if (proxyState.colorFilter === "MULTI") {
        if (colors.length < 2) return false;
      } else if (proxyState.colorFilter === "COLORLESS") {
        if (!card.isLand && colors.length > 0) return false;
      } else {
        if (colors.length !== 1 || colors[0] !== proxyState.colorFilter) return false;
      }
    }

    if (proxyState.statusFilter !== "ALL") {
      const { variant } = getActiveVariant(card, entry);
      const usesRender = shouldUseFrenchCanvasRender(variant, entry.french, proxyState.renderMode);
      if (proxyState.statusFilter === "selected" && !proxyState.basket.has(card.oracleId)) {
        return false;
      }
      if (proxyState.statusFilter === "has_original" && !entry.original) {
        return false;
      }
      if (proxyState.statusFilter === "official_fr" && usesRender) {
        return false;
      }
      if (proxyState.statusFilter === "proxy_fr" && !usesRender) {
        return false;
      }
    }

    return true;
  });
}

async function ensureProxyCatalogLoaded() {
  if (proxyState.catalogLoaded || proxyState.catalogLoading) return;
  proxyState.catalogLoading = true;
  try {
    const res = await fetch("/api/proxy-scans/catalog");
    if (res.ok) {
      const payload = await res.json();
      if (payload?.ok && payload.catalog?.entries) {
        proxyState.catalogEntries = payload.catalog.entries;
      }
    }
  } catch {
    // Graceful fallback to master-cards.json entries
  } finally {
    proxyState.catalogLoaded = true;
    proxyState.catalogLoading = false;
  }
}

function updateStatsBar(filteredCards) {
  const statsEl = document.getElementById("proxy-studio-stats");
  if (!statsEl) return;

  const sourceCards = getSourceCards();
  let curatedCount = 0;
  let altArtCount = 0;
  let officialFrCount = 0;

  for (const card of sourceCards) {
    const entry = getMergedEntry(card);
    if (!entry.isFallback) curatedCount += 1;
    if (entry.original) altArtCount += 1;
    const { variant } = getActiveVariant(card, entry);
    if (variant?.isOfficialFrenchScan) officialFrCount += 1;
  }

  statsEl.innerHTML = `
    <span class="proxy-stat-pill"><strong>${filteredCards.length}</strong> / ${sourceCards.length} cartes</span>
    <span class="proxy-stat-pill"><strong>${altArtCount}</strong> illustrations originales</span>
    <span class="proxy-stat-pill"><strong>${officialFrCount}</strong> scans FR officiels</span>
    <span class="proxy-stat-pill"><strong>${curatedCount}</strong> fiches HD curatées</span>
  `;
}

function getOrderedBasketSelections() {
  const cardsByOracleId = new Map((state.cards || []).map((c) => [c.oracleId, c]));
  const items = [];
  for (const [oracleId, item] of proxyState.basket.entries()) {
    const card = cardsByOracleId.get(oracleId);
    if (!card) continue;
    const entry = getMergedEntry(card);
    const variantKind =
      item.variant === "original" && entry.original ? "original" : "classic";
    const variant = variantKind === "original" ? entry.original : entry.classic;
    items.push({
      card,
      entry,
      variantKind,
      variant,
      quantity: item.quantity,
      hasBackFace: Boolean(variant?.backFace),
    });
  }
  return items;
}

function computeTotalPrintSlots(selections) {
  let total = 0;
  for (const sel of selections) {
    total += sel.quantity;
    if (proxyState.includeBackFaces && sel.hasBackFace) {
      total += sel.quantity;
    }
  }
  return total;
}

function updateBasketTray() {
  const selections = getOrderedBasketSelections();
  const totalCards = selections.reduce((sum, s) => sum + s.quantity, 0);
  const totalSlots = computeTotalPrintSlots(selections);
  const totalPages = totalSlots > 0 ? Math.ceil(totalSlots / 9) : 0;

  const countEl = document.getElementById("proxy-tray-count");
  const pagesEl = document.getElementById("proxy-tray-pages");
  const printBtn = document.getElementById("proxy-btn-print-sheets");
  const zipBtn = document.getElementById("proxy-btn-download-zip");
  const clearBtn = document.getElementById("proxy-btn-clear-basket");

  if (countEl) {
    countEl.textContent =
      totalCards === 0
        ? "Aucune carte sélectionnée"
        : `${totalCards} carte${totalCards > 1 ? "s" : ""} sélectionnée${totalCards > 1 ? "s" : ""}`;
  }
  if (pagesEl) {
    pagesEl.textContent =
      totalPages === 0
        ? "Sélectionnez des cartes ou importez un deck"
        : `${totalSlots} face${totalSlots > 1 ? "s" : ""} • ${totalPages} page${totalPages > 1 ? "s" : ""} A4 (3×3, 63×88 mm)`;
  }
  if (printBtn) printBtn.disabled = totalCards === 0 || proxyState.isExporting;
  if (zipBtn) zipBtn.disabled = totalCards === 0 || proxyState.isExporting;
  if (clearBtn) clearBtn.disabled = totalCards === 0 || proxyState.isExporting;
}

function renderCardTilePreview(imgEl, card, entry, variant) {
  if (!imgEl || !variant) return;
  const renderToken = `${card.oracleId}:${variant.scryfallId}:${proxyState.renderMode}:${entry.french?.name}:${entry.french?.rulesText}`;
  imgEl.dataset.renderToken = renderToken;

  const needsCanvas = shouldUseFrenchCanvasRender(variant, entry.french, proxyState.renderMode);
  if (!needsCanvas) {
    imgEl.src = toProxiedImageUrl(variant.largeUrl || variant.pngUrl);
    return;
  }

  // Show raw artwork immediately as placeholder while HD French canvas renders
  imgEl.src = toProxiedImageUrl(variant.largeUrl || variant.pngUrl);
  renderProxyCardDataUrl({
    card,
    variant,
    french: entry.french,
    renderMode: proxyState.renderMode,
    face: "front",
  })
    .then((rendered) => {
      if (imgEl.dataset.renderToken === renderToken && rendered?.dataUrl) {
        imgEl.src = rendered.dataUrl;
      }
    })
    .catch(() => {
      // Keep raw fallback image if canvas render fails
    });
}

function renderProxyGrid() {
  const grid = document.getElementById("proxy-cards-grid");
  const loadMoreWrap = document.getElementById("proxy-load-more-wrap");
  const loadMoreBtn = document.getElementById("proxy-btn-load-more");
  if (!grid) return;

  const filtered = getFilteredCards();
  updateStatsBar(filtered);
  updateBasketTray();

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="proxy-empty-state">
        <span class="proxy-empty-icon">🖨️</span>
        <h3>Aucune carte ne correspond à vos filtres</h3>
        <p>Essayez un autre cube, réinitialisez la recherche ou importez une liste de deck.</p>
      </div>
    `;
    if (loadMoreWrap) loadMoreWrap.hidden = true;
    return;
  }

  const slice = filtered.slice(0, proxyState.visibleCount);
  const fragment = document.createDocumentFragment();

  for (const card of slice) {
    const entry = getMergedEntry(card);
    const { kind, variant } = getActiveVariant(card, entry);
    const basketEntry = proxyState.basket.get(card.oracleId);
    const isSelected = Boolean(basketEntry);
    const usesFrRender = shouldUseFrenchCanvasRender(variant, entry.french, proxyState.renderMode);
    const displayNameFr = entry.french?.name || card.frenchName || card.name;
    const hasOriginal = Boolean(entry.original);

    const tile = document.createElement("article");
    tile.className = `proxy-card-tile${isSelected ? " is-selected" : ""}`;
    tile.dataset.oracleId = card.oracleId;

    const statusBadgeHtml = usesFrRender
      ? `<span class="proxy-badge badge-proxy-fr" title="Texte français synthétisé en haute définition sur l'artwork">Proxy FR HD</span>`
      : variant.isOfficialFrenchScan
        ? `<span class="proxy-badge badge-official-fr" title="Scan officiel Wizards en français haute définition">Scan FR Officiel</span>`
        : `<span class="proxy-badge badge-raw-en" title="Scan brut en anglais">Scan VO</span>`;

    const treatmentBadge = variant?.treatmentLabel
      ? `<span class="proxy-badge badge-treatment">${escapeHtml(variant.treatmentLabel)}</span>`
      : "";

    tile.innerHTML = `
      <div class="proxy-card-visual">
        <img
          class="proxy-card-img"
          alt="${escapeHtml(displayNameFr)}"
          loading="lazy"
        />
        <div class="proxy-card-badges">
          ${statusBadgeHtml}
          ${treatmentBadge}
        </div>
        ${
          variant?.backFace
            ? `<span class="proxy-dfc-pill" title="Carte recto-verso (DFC)">↺ DFC</span>`
            : ""
        }
      </div>
      <div class="proxy-card-body">
        <div class="proxy-card-titles">
          <h4 class="proxy-card-name" title="${escapeHtml(displayNameFr)}">${escapeHtml(displayNameFr)}</h4>
          ${
            displayNameFr !== card.name
              ? `<span class="proxy-card-vo">${escapeHtml(card.name)}</span>`
              : `<span class="proxy-card-vo">${escapeHtml(variant?.setName || "")}</span>`
          }
        </div>

        <div class="proxy-variant-switch" role="group" aria-label="Choisir l'illustration">
          <button
            type="button"
            class="proxy-variant-btn${kind === "classic" ? " active" : ""}"
            data-action="variant"
            data-variant="classic"
          >
            Classique
          </button>
          <button
            type="button"
            class="proxy-variant-btn${kind === "original" ? " active" : ""}"
            data-action="variant"
            data-variant="original"
            ${hasOriginal ? "" : 'title="Cliquez sur Prints pour choisir une illustration alternative"'}
          >
            ${hasOriginal ? "Originale ✨" : "Originale +"}
          </button>
        </div>

        <div class="proxy-card-actions">
          ${
            isSelected
              ? `
                <div class="proxy-qty-stepper">
                  <button type="button" class="proxy-qty-btn" data-action="dec" aria-label="Retirer un exemplaire">−</button>
                  <span class="proxy-qty-val">${basketEntry.quantity}×</span>
                  <button type="button" class="proxy-qty-btn" data-action="inc" aria-label="Ajouter un exemplaire">+</button>
                </div>
              `
              : `
                <button type="button" class="proxy-btn-select" data-action="select">
                  + Imprimer
                </button>
              `
          }
          <button
            type="button"
            class="proxy-btn-icon"
            data-action="picker"
            title="Choisir un autre print Scryfall ou éditer le texte français"
          >
            🎨 Prints
          </button>
          <button
            type="button"
            class="proxy-btn-icon"
            data-action="download"
            title="Télécharger ce proxy en PNG haute définition (745×1040)"
          >
            ⬇️ PNG
          </button>
        </div>
      </div>
    `;

    const imgEl = tile.querySelector(".proxy-card-img");
    renderCardTilePreview(imgEl, card, entry, variant);

    tile.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-action]");
      if (!btn) {
        if (event.target.closest(".proxy-card-visual")) {
          void openProxyPickerForCard(card);
        }
        return;
      }
      const action = btn.dataset.action;
      if (action === "variant") {
        const targetVariant = btn.dataset.variant;
        if (targetVariant === "original" && !entry.original) {
          void openProxyPickerForCard(card, "original");
          return;
        }
        proxyState.perCardVariant.set(card.oracleId, targetVariant);
        if (proxyState.basket.has(card.oracleId)) {
          const prev = proxyState.basket.get(card.oracleId);
          proxyState.basket.set(card.oracleId, { ...prev, variant: targetVariant });
        }
        renderProxyGrid();
      } else if (action === "select") {
        proxyState.basket.set(card.oracleId, { quantity: 1, variant: kind });
        renderProxyGrid();
      } else if (action === "inc") {
        const prev = proxyState.basket.get(card.oracleId) || { quantity: 0, variant: kind };
        proxyState.basket.set(card.oracleId, {
          ...prev,
          quantity: Math.min(20, prev.quantity + 1),
        });
        renderProxyGrid();
      } else if (action === "dec") {
        const prev = proxyState.basket.get(card.oracleId);
        if (!prev || prev.quantity <= 1) {
          proxyState.basket.delete(card.oracleId);
        } else {
          proxyState.basket.set(card.oracleId, { ...prev, quantity: prev.quantity - 1 });
        }
        renderProxyGrid();
      } else if (action === "picker") {
        void openProxyPickerForCard(card, kind);
      } else if (action === "download") {
        void downloadSingleCardPng(card, entry, kind, variant);
      }
    });

    fragment.appendChild(tile);
  }

  grid.innerHTML = "";
  grid.appendChild(fragment);

  if (loadMoreWrap && loadMoreBtn) {
    const remaining = filtered.length - slice.length;
    loadMoreWrap.hidden = remaining <= 0;
    loadMoreBtn.textContent = `Afficher plus de cartes (${remaining} restante${remaining > 1 ? "s" : ""})`;
  }
}

async function downloadSingleCardPng(card, entry, kind, variant) {
  try {
    showToast(`Génération HD de ${entry.french?.name || card.name}...`, "info");
    const bytes = await renderProxyCardPngBytes({
      card,
      variant,
      french: entry.french,
      renderMode: proxyState.renderMode,
      face: "front",
    });
    const blob = new Blob([bytes], { type: "image/png" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${card.slug}-${kind}-fr.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    showToast(`PNG HD téléchargé : ${card.slug}-${kind}-fr.png`, "success");
  } catch (err) {
    showToast(`Erreur téléchargement PNG : ${err.message}`, "error");
  }
}

async function downloadSelectedZip() {
  const selections = getOrderedBasketSelections();
  if (selections.length === 0 || proxyState.isExporting) return;

  proxyState.isExporting = true;
  updateBasketTray();
  const progressBar = document.getElementById("proxy-export-progress");
  const progressText = document.getElementById("proxy-export-progress-text");

  try {
    const entries = [];
    const totalSlots = computeTotalPrintSlots(selections);
    let done = 0;

    if (progressBar) progressBar.hidden = false;

    for (const sel of selections) {
      const frontBytes = await renderProxyCardPngBytes({
        card: sel.card,
        variant: sel.variant,
        french: sel.entry.french,
        renderMode: proxyState.renderMode,
        face: "front",
      });
      const backBytes =
        proxyState.includeBackFaces && sel.hasBackFace
          ? await renderProxyCardPngBytes({
              card: sel.card,
              variant: sel.variant,
              french: sel.entry.french,
              renderMode: proxyState.renderMode,
              face: "back",
            })
          : null;

      for (let copy = 1; copy <= sel.quantity; copy++) {
        done += 1;
        const idxPrefix = String(done).padStart(3, "0");
        const copySuffix = sel.quantity > 1 ? `-x${copy}` : "";
        entries.push({
          name: `${idxPrefix}-${sel.card.slug}-${sel.variantKind}${copySuffix}.png`,
          data: frontBytes,
        });
        if (backBytes) {
          done += 1;
          entries.push({
            name: `${String(done).padStart(3, "0")}-${sel.card.slug}-${sel.variantKind}${copySuffix}-verso.png`,
            data: backBytes,
          });
        }
        if (progressText) {
          progressText.textContent = `Rendu HD ${done} / ${totalSlots}...`;
        }
      }
    }

    const zipBytes = buildZipArchive(entries);
    const blob = new Blob([zipBytes], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `draftmaster-proxies-${proxyState.sourceKey.toLowerCase()}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    showToast(`Archive ZIP téléchargée (${entries.length} PNG haute définition) !`, "success");
  } catch (err) {
    showToast(`Erreur export ZIP : ${err.message}`, "error");
  } finally {
    proxyState.isExporting = false;
    if (progressBar) progressBar.hidden = true;
    updateBasketTray();
  }
}

async function openPrintSheetsPreview() {
  const selections = getOrderedBasketSelections();
  if (selections.length === 0 || proxyState.isExporting) return;

  const modal = document.getElementById("proxy-print-modal");
  const sheetsContainer = document.getElementById("proxy-print-sheets-container");
  const summaryEl = document.getElementById("proxy-print-summary");
  const progressBar = document.getElementById("proxy-export-progress");
  const progressText = document.getElementById("proxy-export-progress-text");
  if (!modal || !sheetsContainer) return;

  proxyState.isExporting = true;
  updateBasketTray();
  if (progressBar) progressBar.hidden = false;

  try {
    const slots = [];
    const totalSlots = computeTotalPrintSlots(selections);
    let done = 0;

    for (const sel of selections) {
      const frontRendered = await renderProxyCardDataUrl({
        card: sel.card,
        variant: sel.variant,
        french: sel.entry.french,
        renderMode: proxyState.renderMode,
        face: "front",
      });
      const backRendered =
        proxyState.includeBackFaces && sel.hasBackFace
          ? await renderProxyCardDataUrl({
              card: sel.card,
              variant: sel.variant,
              french: sel.entry.french,
              renderMode: proxyState.renderMode,
              face: "back",
            })
          : null;

      for (let copy = 1; copy <= sel.quantity; copy++) {
        done += 1;
        slots.push({
          label: sel.entry.french?.name || sel.card.name,
          dataUrl: frontRendered.dataUrl,
        });
        if (backRendered) {
          done += 1;
          slots.push({
            label: `${sel.entry.french?.name || sel.card.name} (Verso)`,
            dataUrl: backRendered.dataUrl,
          });
        }
        if (progressText) {
          progressText.textContent = `Préparation planches A4 : ${done} / ${totalSlots}...`;
        }
      }
    }

    const totalPages = Math.ceil(slots.length / 9);
    const gapClass = proxyState.gapMm === 2 ? "gap-2mm" : "gap-0mm";
    const cropClass = proxyState.cropMarks ? "with-crop-marks" : "";

    sheetsContainer.innerHTML = "";
    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      const pageSlots = slots.slice(pageIdx * 9, (pageIdx + 1) * 9);
      const sheet = document.createElement("div");
      sheet.className = `proxy-a4-sheet ${gapClass} ${cropClass}`;
      sheet.innerHTML = `
        <div class="proxy-a4-grid">
          ${pageSlots
            .map(
              (slot) => `
                <div class="proxy-a4-cell">
                  <img src="${slot.dataUrl}" alt="${escapeHtml(slot.label)}" />
                </div>
              `,
            )
            .join("")}
        </div>
        <div class="proxy-a4-page-meta">
          DraftMaster Proxies FR • Page ${pageIdx + 1} / ${totalPages} • Format réel 63×88 mm (imprimer à 100%, sans mise à l'échelle)
        </div>
      `;
      sheetsContainer.appendChild(sheet);
    }

    if (summaryEl) {
      summaryEl.textContent = `${slots.length} carte${slots.length > 1 ? "s" : ""} sur ${totalPages} page${totalPages > 1 ? "s" : ""} A4 (63×88 mm • Échelle 100%)`;
    }

    modal.hidden = false;
    document.body.classList.add("proxy-print-modal-open");
  } catch (err) {
    showToast(`Erreur préparation planches : ${err.message}`, "error");
  } finally {
    proxyState.isExporting = false;
    if (progressBar) progressBar.hidden = true;
    updateBasketTray();
  }
}

function closePrintSheetsPreview() {
  const modal = document.getElementById("proxy-print-modal");
  if (modal) modal.hidden = true;
  document.body.classList.remove("proxy-print-modal-open");
}

function renderPickerPreview() {
  const card = proxyState.pickerCard;
  if (!card) return;
  const entry = getMergedEntry(card);
  const variant =
    proxyState.pickerSlot === "original" && entry.original ? entry.original : entry.classic;

  const previewImg = document.getElementById("proxy-picker-preview-img");
  const metaEl = document.getElementById("proxy-picker-preview-meta");
  const slotClassicBtn = document.getElementById("proxy-picker-slot-classic");
  const slotOrigBtn = document.getElementById("proxy-picker-slot-original");

  slotClassicBtn?.classList.toggle("active", proxyState.pickerSlot === "classic");
  slotOrigBtn?.classList.toggle("active", proxyState.pickerSlot === "original");

  if (metaEl && variant) {
    const usesRender = shouldUseFrenchCanvasRender(variant, entry.french, proxyState.renderMode);
    metaEl.innerHTML = `
      <span><strong>${escapeHtml(variant.treatmentLabel)}</strong> • ${escapeHtml(variant.setName)} (${escapeHtml(variant.setCode.toUpperCase())})</span>
      <span>Illus. ${escapeHtml(variant.artist)} • ${usesRender ? "Rendu Proxy FR HD (745×1040)" : "Scan officiel FR HD"}</span>
    `;
  }

  if (previewImg && variant) {
    renderCardTilePreview(previewImg, card, entry, variant);
  }
}

function renderPickerCandidates() {
  const listEl = document.getElementById("proxy-picker-prints-list");
  if (!listEl) return;

  if (proxyState.pickerLoading) {
    listEl.innerHTML = `<div class="proxy-picker-loading">Recherche des meilleures impressions Scryfall (EN & FR)...</div>`;
    return;
  }

  const card = proxyState.pickerCard;
  if (!card) return;
  const entry = getMergedEntry(card);

  const filtered = proxyState.pickerCandidates.filter((cand) => {
    if (proxyState.pickerFilter === "fr") return cand.lang === "fr";
    if (proxyState.pickerFilter === "alt") {
      return cand.borderless || cand.fullArt || cand.frameEffects?.length > 0 || cand.setCode === "sld" || cand.setCode === "spg" || cand.setCode === "sta";
    }
    return true;
  });

  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="proxy-picker-loading">Aucune impression correspondante trouvée.</div>`;
    return;
  }

  listEl.innerHTML = "";
  for (const cand of filtered) {
    const isClassic = entry.classic?.scryfallId === cand.scryfallId;
    const isOriginal = entry.original?.scryfallId === cand.scryfallId;
    const item = document.createElement("div");
    item.className = `proxy-print-option${isClassic ? " is-classic" : ""}${isOriginal ? " is-original" : ""}`;
    item.innerHTML = `
      <img src="${toProxiedImageUrl(cand.largeUrl || cand.pngUrl)}" alt="${escapeHtml(cand.setName)}" loading="lazy" />
      <div class="proxy-print-option-meta">
        <strong>${escapeHtml(cand.treatmentLabel)}</strong>
        <span>${escapeHtml(cand.setName)} (${escapeHtml(cand.setCode.toUpperCase())} #${escapeHtml(cand.collectorNumber)})</span>
        <span class="proxy-print-artist">Illus. ${escapeHtml(cand.artist)}</span>
      </div>
      <div class="proxy-print-option-actions">
        <button type="button" class="proxy-mini-btn${isClassic ? " active" : ""}" data-assign="classic">
          ${isClassic ? "✓ Classique" : "Classique"}
        </button>
        <button type="button" class="proxy-mini-btn${isOriginal ? " active" : ""}" data-assign="original">
          ${isOriginal ? "✓ Originale" : "Originale"}
        </button>
      </div>
    `;

    item.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-assign]");
      if (!btn) return;
      const slot = btn.dataset.assign;
      void applyPrintOverride(card, slot, cand);
    });
    listEl.appendChild(item);
  }
}

async function persistOverrideToServer(oracleId, payload) {
  try {
    const res = await fetch("/api/proxy-scans/override", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oracleId, ...payload }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.ok && data.entry) {
        proxyState.catalogEntries[oracleId] = data.entry;
      }
    }
  } catch {
    // Local override in localStorage still applies seamlessly
  }
}

async function applyPrintOverride(card, slot, candidate) {
  const currentOverride = proxyState.localOverrides[card.oracleId] || {};
  const nextOverride = {
    ...currentOverride,
    [slot]: candidate,
  };
  proxyState.localOverrides[card.oracleId] = nextOverride;
  saveLocalOverrides();
  proxyState.pickerSlot = slot;
  proxyState.perCardVariant.set(card.oracleId, slot);
  clearProxyRenderCache();

  renderPickerPreview();
  renderPickerCandidates();
  renderProxyGrid();

  const merged = getMergedEntry(card);
  await persistOverrideToServer(card.oracleId, {
    name: card.name,
    slug: card.slug,
    classic: merged.classic,
    original: merged.original,
    french: merged.french,
  });
  showToast(
    `${slot === "classic" ? "Scan classique" : "Illustration originale"} mis à jour pour ${merged.french?.name || card.name} !`,
    "success",
  );
}

function populateFrenchEditor(card) {
  const entry = getMergedEntry(card);
  const nameInput = document.getElementById("proxy-fr-name-input");
  const typeInput = document.getElementById("proxy-fr-type-input");
  const rulesInput = document.getElementById("proxy-fr-rules-input");
  const flavorInput = document.getElementById("proxy-fr-flavor-input");
  const sourceBadge = document.getElementById("proxy-fr-source-badge");

  if (nameInput) nameInput.value = entry.french?.name || card.frenchName || card.name;
  if (typeInput) typeInput.value = entry.french?.typeLine || card.typeLine || "";
  if (rulesInput) rulesInput.value = entry.french?.rulesText || card.frenchText || card.oracleText || "";
  if (flavorInput) flavorInput.value = entry.french?.flavorText || "";
  if (sourceBadge) {
    const labels = {
      official_scryfall_fr: "Source : Traduction officielle Wizards (Scryfall FR)",
      catalog_fr: "Source : Catalogue DraftMaster FR",
      translated_fallback: "Source : Traduction automatique (éditable)",
      custom: "Source : Texte français personnalisé",
    };
    sourceBadge.textContent = labels[entry.french?.source] || "Texte français";
  }
}

export async function openProxyPickerForCard(card, initialSlot = "classic") {
  await ensureProxyCatalogLoaded();
  proxyState.pickerCard = card;
  const entry = getMergedEntry(card);
  proxyState.pickerSlot = initialSlot === "original" && entry.original ? "original" : "classic";
  proxyState.pickerTab = "prints";
  proxyState.pickerFilter = "all";
  proxyState.pickerCandidates = [];
  proxyState.pickerLoading = true;

  const modal = document.getElementById("proxy-picker-modal");
  const titleEl = document.getElementById("proxy-picker-title");
  if (titleEl) {
    titleEl.textContent = `${entry.french?.name || card.name} — Scans & Texte FR`;
  }
  if (modal) modal.hidden = false;

  switchPickerTab("prints");
  populateFrenchEditor(card);
  renderPickerPreview();
  renderPickerCandidates();

  try {
    const res = await fetch(
      `/api/proxy-scans/prints?oracleId=${encodeURIComponent(card.oracleId)}&name=${encodeURIComponent(card.name)}`,
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.ok) {
        proxyState.pickerCandidates = data.candidates || [];
        // Hydrate fallback entry automatically with live Scryfall curation if not yet in proxy-scans.json
        if (!proxyState.catalogEntries[card.oracleId] && data.classic) {
          proxyState.catalogEntries[card.oracleId] = {
            oracleId: card.oracleId,
            slug: card.slug,
            name: card.name,
            french: data.french,
            classic: data.classic,
            original: data.original || null,
            curatedAt: new Date().toISOString(),
          };
          populateFrenchEditor(card);
          renderPickerPreview();
          renderProxyGrid();
        }
      }
    }
  } catch {
    showToast("Impossible de charger les prints Scryfall (mode hors-ligne).", "error");
  } finally {
    proxyState.pickerLoading = false;
    renderPickerCandidates();
  }
}

function closeProxyPickerModal() {
  const modal = document.getElementById("proxy-picker-modal");
  if (modal) modal.hidden = true;
  proxyState.pickerCard = null;
}

function switchPickerTab(tabName) {
  proxyState.pickerTab = tabName;
  document
    .getElementById("proxy-picker-tab-prints")
    ?.classList.toggle("active", tabName === "prints");
  document
    .getElementById("proxy-picker-tab-french")
    ?.classList.toggle("active", tabName === "french");
  const printsPane = document.getElementById("proxy-picker-pane-prints");
  const frenchPane = document.getElementById("proxy-picker-pane-french");
  if (printsPane) printsPane.hidden = tabName !== "prints";
  if (frenchPane) frenchPane.hidden = tabName !== "french";
}

function handleDeckImportSubmit() {
  const textarea = document.getElementById("proxy-deck-import-textarea");
  const statusEl = document.getElementById("proxy-deck-import-status");
  if (!textarea) return;
  const raw = textarea.value.trim();
  if (!raw) {
    if (statusEl) statusEl.textContent = "Collez une liste de cartes (ex. 1 Lightning Bolt).";
    return;
  }

  const parsed = parseMtgaDeckText(raw);
  const allDeckItems = [...parsed.cards, ...parsed.sideboardCards];
  const byLowerName = new Map();
  for (const card of state.cards || []) {
    byLowerName.set(card.name.toLowerCase(), card);
    if (card.frenchName) byLowerName.set(card.frenchName.toLowerCase(), card);
    const front = card.name.split(" // ")[0]?.trim().toLowerCase();
    if (front && !byLowerName.has(front)) byLowerName.set(front, card);
  }

  const matchedIds = new Set();
  const missing = [];

  for (const entry of allDeckItems) {
    const clean = entry.name.trim().toLowerCase();
    const card = byLowerName.get(clean);
    if (card) {
      matchedIds.add(card.oracleId);
      const merged = getMergedEntry(card);
      const { kind } = getActiveVariant(card, merged);
      const existing = proxyState.basket.get(card.oracleId);
      proxyState.basket.set(card.oracleId, {
        quantity: Math.min(20, (existing?.quantity || 0) + entry.quantity),
        variant: existing?.variant || kind,
      });
    } else {
      missing.push(entry.name);
    }
  }

  if (matchedIds.size > 0) {
    proxyState.customDeckOracleIds = matchedIds;
    proxyState.sourceKey = "DECK";
    const sourceSelect = document.getElementById("proxy-source-select");
    if (sourceSelect) {
      let deckOpt = sourceSelect.querySelector('option[value="DECK"]');
      if (!deckOpt) {
        deckOpt = document.createElement("option");
        deckOpt.value = "DECK";
        sourceSelect.appendChild(deckOpt);
      }
      deckOpt.textContent = `Liste importée (${matchedIds.size} cartes)`;
      sourceSelect.value = "DECK";
    }
    const importPanel = document.getElementById("proxy-deck-import-panel");
    if (importPanel) importPanel.hidden = true;
    renderProxyGrid();
    showToast(
      `${matchedIds.size} carte${matchedIds.size > 1 ? "s" : ""} ajoutée${matchedIds.size > 1 ? "s" : ""} au panier d'impression${missing.length > 0 ? ` (${missing.length} hors catalogue)` : ""} !`,
      "success",
    );
  } else if (statusEl) {
    statusEl.textContent = `Aucune carte reconnue dans le catalogue DraftMaster (${missing.slice(0, 3).join(", ")}).`;
  }
}

function populateSourceSelect() {
  const select = document.getElementById("proxy-source-select");
  if (!select) return;
  const current = proxyState.sourceKey;
  select.innerHTML = "";
  for (const cubeKey of Object.keys(CUBE_CONFIGS)) {
    const cfg = CUBE_CONFIGS[cubeKey];
    if (!cfg) continue;
    const opt = document.createElement("option");
    opt.value = cubeKey;
    opt.textContent = cfg.name;
    select.appendChild(opt);
  }
  const allOpt = document.createElement("option");
  allOpt.value = "ALL";
  allOpt.textContent = "Tout le catalogue DraftMaster";
  select.appendChild(allOpt);

  select.value = current;
}

function bindProxyStudioEvents() {
  const sourceSelect = document.getElementById("proxy-source-select");
  sourceSelect?.addEventListener("change", (e) => {
    proxyState.sourceKey = e.target.value;
    proxyState.visibleCount = PAGE_SIZE;
    renderProxyGrid();
  });

  const searchInput = document.getElementById("proxy-search-input");
  searchInput?.addEventListener("input", (e) => {
    proxyState.searchQuery = e.target.value;
    proxyState.visibleCount = PAGE_SIZE;
    renderProxyGrid();
  });

  const colorSelect = document.getElementById("proxy-color-filter");
  colorSelect?.addEventListener("change", (e) => {
    proxyState.colorFilter = e.target.value;
    proxyState.visibleCount = PAGE_SIZE;
    renderProxyGrid();
  });

  const statusSelect = document.getElementById("proxy-status-filter");
  statusSelect?.addEventListener("change", (e) => {
    proxyState.statusFilter = e.target.value;
    proxyState.visibleCount = PAGE_SIZE;
    renderProxyGrid();
  });

  // Global variant toggle (Classique vs Originale populaire)
  document.getElementById("proxy-global-classic")?.addEventListener("click", () => {
    proxyState.defaultVariant = "classic";
    proxyState.perCardVariant.clear();
    document.getElementById("proxy-global-classic")?.classList.add("active");
    document.getElementById("proxy-global-original")?.classList.remove("active");
    renderProxyGrid();
  });

  document.getElementById("proxy-global-original")?.addEventListener("click", () => {
    proxyState.defaultVariant = "original";
    proxyState.perCardVariant.clear();
    document.getElementById("proxy-global-original")?.classList.add("active");
    document.getElementById("proxy-global-classic")?.classList.remove("active");
    renderProxyGrid();
  });

  // Render mode selector (Hybride FR / Proxy FR uniforme / Scan brut)
  document.getElementById("proxy-render-mode-select")?.addEventListener("change", (e) => {
    proxyState.renderMode = e.target.value;
    renderProxyGrid();
    if (proxyState.pickerCard) renderPickerPreview();
  });

  // Load more pagination
  document.getElementById("proxy-btn-load-more")?.addEventListener("click", () => {
    proxyState.visibleCount += PAGE_SIZE;
    renderProxyGrid();
  });

  // Deck import panel toggle
  document.getElementById("proxy-btn-toggle-import")?.addEventListener("click", () => {
    const panel = document.getElementById("proxy-deck-import-panel");
    if (panel) panel.hidden = !panel.hidden;
  });
  document.getElementById("proxy-btn-import-apply")?.addEventListener("click", handleDeckImportSubmit);
  document.getElementById("proxy-btn-import-cancel")?.addEventListener("click", () => {
    const panel = document.getElementById("proxy-deck-import-panel");
    if (panel) panel.hidden = true;
  });

  // Basket bulk controls
  document.getElementById("proxy-btn-select-filtered")?.addEventListener("click", () => {
    const filtered = getFilteredCards();
    for (const card of filtered) {
      if (!proxyState.basket.has(card.oracleId)) {
        const entry = getMergedEntry(card);
        const { kind } = getActiveVariant(card, entry);
        proxyState.basket.set(card.oracleId, { quantity: 1, variant: kind });
      }
    }
    renderProxyGrid();
    showToast(`${filtered.length} carte(s) sélectionnée(s) pour impression.`, "info");
  });

  document.getElementById("proxy-btn-clear-basket")?.addEventListener("click", () => {
    proxyState.basket.clear();
    renderProxyGrid();
  });

  // Print options
  document.getElementById("proxy-opt-crop-marks")?.addEventListener("change", (e) => {
    proxyState.cropMarks = Boolean(e.target.checked);
  });
  document.getElementById("proxy-opt-gap")?.addEventListener("change", (e) => {
    proxyState.gapMm = e.target.checked ? 2 : 0;
  });
  document.getElementById("proxy-opt-back-faces")?.addEventListener("change", (e) => {
    proxyState.includeBackFaces = Boolean(e.target.checked);
    updateBasketTray();
  });

  // Primary Exports
  document.getElementById("proxy-btn-print-sheets")?.addEventListener("click", () => {
    void openPrintSheetsPreview();
  });
  document.getElementById("proxy-btn-download-zip")?.addEventListener("click", () => {
    void downloadSelectedZip();
  });

  // Print Modal actions
  document.getElementById("proxy-print-close-btn")?.addEventListener("click", closePrintSheetsPreview);
  document.getElementById("proxy-print-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "proxy-print-modal") closePrintSheetsPreview();
  });
  document.getElementById("proxy-btn-trigger-print")?.addEventListener("click", () => {
    window.print();
  });

  // Print Picker & FR Editor Modal events
  document.getElementById("proxy-picker-close-btn")?.addEventListener("click", closeProxyPickerModal);
  document.getElementById("proxy-picker-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "proxy-picker-modal") closeProxyPickerModal();
  });
  document.getElementById("proxy-picker-tab-prints")?.addEventListener("click", () => {
    switchPickerTab("prints");
  });
  document.getElementById("proxy-picker-tab-french")?.addEventListener("click", () => {
    switchPickerTab("french");
  });
  document.getElementById("proxy-picker-slot-classic")?.addEventListener("click", () => {
    proxyState.pickerSlot = "classic";
    renderPickerPreview();
  });
  document.getElementById("proxy-picker-slot-original")?.addEventListener("click", () => {
    const card = proxyState.pickerCard;
    if (!card) return;
    const entry = getMergedEntry(card);
    if (!entry.original) {
      showToast("Choisissez une impression ci-contre en cliquant sur « Originale ».", "info");
      return;
    }
    proxyState.pickerSlot = "original";
    renderPickerPreview();
  });
  document.getElementById("proxy-picker-download-btn")?.addEventListener("click", () => {
    const card = proxyState.pickerCard;
    if (!card) return;
    const entry = getMergedEntry(card);
    const variant =
      proxyState.pickerSlot === "original" && entry.original ? entry.original : entry.classic;
    void downloadSingleCardPng(card, entry, proxyState.pickerSlot, variant);
  });
  document.getElementById("proxy-picker-filter-select")?.addEventListener("change", (e) => {
    proxyState.pickerFilter = e.target.value;
    renderPickerCandidates();
  });

  // French Text Editor live save
  document.getElementById("proxy-fr-save-btn")?.addEventListener("click", async () => {
    const card = proxyState.pickerCard;
    if (!card) return;
    const nameVal = document.getElementById("proxy-fr-name-input")?.value.trim() || card.name;
    const typeVal = document.getElementById("proxy-fr-type-input")?.value.trim() || "";
    const rulesVal = document.getElementById("proxy-fr-rules-input")?.value || "";
    const flavorVal = document.getElementById("proxy-fr-flavor-input")?.value.trim() || "";

    const currentOverride = proxyState.localOverrides[card.oracleId] || {};
    const entry = getMergedEntry(card);
    const nextFrench = {
      ...entry.french,
      name: nameVal,
      typeLine: typeVal,
      rulesText: rulesVal,
      flavorText: flavorVal,
      source: "custom",
    };

    proxyState.localOverrides[card.oracleId] = {
      ...currentOverride,
      french: nextFrench,
    };
    saveLocalOverrides();
    clearProxyRenderCache();
    renderPickerPreview();
    renderProxyGrid();
    populateFrenchEditor(card);

    await persistOverrideToServer(card.oracleId, {
      name: card.name,
      slug: card.slug,
      classic: entry.classic,
      original: entry.original,
      french: nextFrench,
    });
    showToast(`Texte français enregistré pour ${nameVal} !`, "success");
  });

  document.getElementById("proxy-fr-reset-btn")?.addEventListener("click", () => {
    const card = proxyState.pickerCard;
    if (!card) return;
    if (proxyState.localOverrides[card.oracleId]?.french) {
      delete proxyState.localOverrides[card.oracleId].french;
      saveLocalOverrides();
    }
    clearProxyRenderCache();
    populateFrenchEditor(card);
    renderPickerPreview();
    renderProxyGrid();
    showToast("Texte français réinitialisé aux données officielles.", "info");
  });
}

export async function initProxyStudioView(preferredCubeKey = null) {
  if (!proxyState.initialized) {
    proxyState.localOverrides = loadLocalOverrides();
    proxyState.sourceKey = preferredCubeKey || state.activeCubeKey || "titou_tribal";
    populateSourceSelect();
    bindProxyStudioEvents();
    proxyState.initialized = true;
  } else if (preferredCubeKey && proxyState.sourceKey !== "DECK") {
    proxyState.sourceKey = preferredCubeKey;
    const select = document.getElementById("proxy-source-select");
    if (select) select.value = preferredCubeKey;
  }

  await ensureProxyCatalogLoaded();
  renderProxyGrid();
}

// Keep elements import referenced cleanly for future hooks
void elements;
