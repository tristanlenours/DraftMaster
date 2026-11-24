/**
 * "Cartes inédites" editor of the proxy studio: upload a visual, write the
 * French text, preview live, save to the local library and print with the
 * rest of the selection.
 */
import { escapeHtml } from "./app-state.js";
import {
  createCustomCardDraft,
  estimateCustomCardDpi,
  normalizeCustomCard,
} from "./proxy-custom-cards.js";
import {
  deleteCustomCard,
  isCustomLibraryPersistent,
  listCustomCards,
  saveCustomCard,
} from "./proxy-custom-store.js";
import { canvasToPngBytes, renderCustomCardCanvas } from "./proxy-renderer.js";

const ACCEPTED_IMAGE_TYPES = /^image\/(png|jpeg|webp|avif|gif|bmp|tiff)$/u;
const MAX_IMAGE_BYTES = 40 * 1024 * 1024;

const editorState = {
  initialized: false,
  records: [],
  editingId: null,
  imageBlob: null,
  image: null,
  previewUrl: null,
  previewTimer: null,
  previewToken: 0,
  onLibraryChange: () => {},
  notify: () => {},
};

const thumbnailCache = new Map();

/** Decodes a Blob into a drawable image (ImageBitmap when available). */
export async function loadBlobImage(blob) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob);
    } catch {
      // Fall back to <img> decoding below (e.g. formats ImageBitmap refuses).
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/** Renders a saved record `{ card, image }` at the requested scale. */
export async function renderCustomRecord(record, outputScale = 1) {
  const image = await loadBlobImage(record.image);
  return renderCustomCardCanvas({ customCard: record.card, image, outputScale });
}

/** Saved custom cards that should be printed (quantity > 0). */
export function getCustomPrintRecords() {
  return editorState.records.filter((record) => record.card.quantity > 0 && record.image);
}

function field(id) {
  return document.getElementById(id);
}

function readForm() {
  const mode = document.querySelector('input[name="proxy-custom-mode"]:checked')?.value ?? "scan";
  return {
    id: editorState.editingId ?? undefined,
    mode,
    name: field("proxy-custom-name")?.value,
    manaCost: field("proxy-custom-mana")?.value,
    typeLine: field("proxy-custom-type")?.value,
    rulesText: field("proxy-custom-rules")?.value,
    flavorText: field("proxy-custom-flavor")?.value,
    power: field("proxy-custom-power")?.value,
    toughness: field("proxy-custom-toughness")?.value,
    artist: field("proxy-custom-artist")?.value,
    imageHasBleed: Boolean(field("proxy-custom-bleed")?.checked),
    quantity: field("proxy-custom-quantity")?.value,
  };
}

function fillForm(card) {
  const set = (id, value) => {
    const el = field(id);
    if (el) el.value = value ?? "";
  };
  set("proxy-custom-name", card.name);
  set("proxy-custom-mana", card.manaCost);
  set("proxy-custom-type", card.typeLine);
  set("proxy-custom-rules", card.rulesText);
  set("proxy-custom-flavor", card.flavorText);
  set("proxy-custom-power", card.power);
  set("proxy-custom-toughness", card.toughness);
  set("proxy-custom-artist", card.artist);
  set("proxy-custom-quantity", String(card.quantity));
  const bleed = field("proxy-custom-bleed");
  if (bleed) bleed.checked = Boolean(card.imageHasBleed);
  for (const radio of document.querySelectorAll('input[name="proxy-custom-mode"]')) {
    radio.checked = radio.value === card.mode;
  }
}

function showErrors(errors) {
  const box = field("proxy-custom-errors");
  if (!box) return;
  box.hidden = errors.length === 0;
  box.innerHTML = errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("");
}

function updateModeHints() {
  const mode = document.querySelector('input[name="proxy-custom-mode"]:checked')?.value ?? "scan";
  const bleedRow = field("proxy-custom-bleed-row");
  if (bleedRow) bleedRow.hidden = mode !== "scan";
}

function schedulePreview() {
  clearTimeout(editorState.previewTimer);
  editorState.previewTimer = setTimeout(() => {
    void renderPreview();
  }, 250);
}

async function renderPreview() {
  const previewImg = field("proxy-custom-preview");
  const meta = field("proxy-custom-preview-meta");
  if (!previewImg) return;
  const token = ++editorState.previewToken;
  if (!editorState.image) {
    previewImg.removeAttribute("src");
    previewImg.hidden = true;
    if (meta) meta.textContent = "Importez un visuel pour voir l'aperçu.";
    return;
  }
  const { card } = normalizeCustomCard(readForm());
  try {
    const canvas = await renderCustomCardCanvas({
      customCard: { ...card, name: card.name || "Nom de la carte" },
      image: editorState.image,
      outputScale: 1,
    });
    if (token !== editorState.previewToken) return;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob || token !== editorState.previewToken) return;
    if (editorState.previewUrl) URL.revokeObjectURL(editorState.previewUrl);
    editorState.previewUrl = URL.createObjectURL(blob);
    previewImg.src = editorState.previewUrl;
    previewImg.hidden = false;
    if (meta) {
      const width = editorState.image.naturalWidth || editorState.image.width;
      const height = editorState.image.naturalHeight || editorState.image.height;
      const dpi = estimateCustomCardDpi(width, height, {
        mode: card.mode,
        hasBleed: card.imageHasBleed,
      });
      const quality =
        dpi >= 600 ? "excellente" : dpi >= 300 ? "bonne" : "faible (image floue à l'impression)";
      meta.textContent = `Source ${width}×${height} px • ≈ ${dpi} DPI à 63 mm • qualité ${quality}${
        card.mode === "scan" ? " • texte FR incrusté sur le visuel" : " • cadre DraftMaster"
      }`;
    }
  } catch (err) {
    if (meta) meta.textContent = `Aperçu impossible : ${err.message}`;
  }
}

async function acceptImageFile(file) {
  if (!file) return;
  if (!ACCEPTED_IMAGE_TYPES.test(file.type)) {
    showErrors(["Format non pris en charge : utilisez PNG, JPEG, WebP ou AVIF."]);
    return;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    showErrors(["Image trop lourde (40 Mo maximum)."]);
    return;
  }
  try {
    editorState.image = await loadBlobImage(file);
    editorState.imageBlob = file;
    const name = field("proxy-custom-file-name");
    if (name) name.textContent = file.name;
    showErrors([]);
    schedulePreview();
  } catch {
    showErrors(["Image illisible."]);
  }
}

export function openCustomCardEditor(record = null) {
  const modal = field("proxy-custom-modal");
  if (!modal) return;
  editorState.editingId = record?.card.id ?? null;
  editorState.imageBlob = record?.image ?? null;
  editorState.image = null;
  fillForm(record?.card ?? createCustomCardDraft());
  const fileName = field("proxy-custom-file-name");
  if (fileName) fileName.textContent = record ? "Visuel enregistré" : "Aucun fichier choisi";
  const deleteBtn = field("proxy-custom-delete-btn");
  if (deleteBtn) deleteBtn.hidden = !record;
  const title = field("proxy-custom-title");
  if (title)
    title.textContent = record ? `Modifier « ${record.card.name} »` : "Créer une carte inédite";
  showErrors([]);
  updateModeHints();
  modal.hidden = false;
  document.body.classList.add("proxy-modal-open");
  if (record?.image) {
    void loadBlobImage(record.image).then((image) => {
      editorState.image = image;
      schedulePreview();
    });
  } else {
    void renderPreview();
  }
  field("proxy-custom-name")?.focus();
}

function closeEditor() {
  const modal = field("proxy-custom-modal");
  if (modal) modal.hidden = true;
  document.body.classList.remove("proxy-modal-open");
  clearTimeout(editorState.previewTimer);
}

let saving = false;

async function saveFromEditor() {
  if (saving) return;
  saving = true;
  try {
    await saveFromEditorOnce();
  } finally {
    saving = false;
  }
}

async function saveFromEditorOnce() {
  const result = normalizeCustomCard(readForm());
  const errors = [...result.errors];
  if (!editorState.imageBlob) errors.push("Importez un visuel (illustration ou carte complète).");
  if (errors.length) {
    showErrors(errors);
    return;
  }
  await saveCustomCard(result.card, editorState.imageBlob);
  editorState.editingId = result.card.id;
  thumbnailCache.delete(result.card.id);
  await refreshLibrary();
  closeEditor();
  editorState.notify(
    `Carte « ${result.card.name} » enregistrée dans vos cartes inédites.`,
    "success",
  );
}

async function downloadPng(record) {
  try {
    editorState.notify(`Rendu 600 DPI de « ${record.card.name} »...`, "info");
    const canvas = await renderCustomRecord(record, 2);
    const bytes = await canvasToPngBytes(canvas);
    const url = URL.createObjectURL(new Blob([bytes], { type: "image/png" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${record.card.id}-${record.card.name.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (err) {
    editorState.notify(`Erreur PNG : ${err.message}`, "error");
  }
}

async function thumbnailFor(record) {
  const key = `${record.card.id}|${record.card.updatedAt}`;
  if (!thumbnailCache.has(record.card.id) || thumbnailCache.get(record.card.id).key !== key) {
    const promise = renderCustomRecord(record, 1).then(
      (canvas) =>
        new Promise((resolve) =>
          canvas.toBlob(
            (blob) => resolve(blob ? URL.createObjectURL(blob) : ""),
            "image/jpeg",
            0.85,
          ),
        ),
    );
    thumbnailCache.set(record.card.id, { key, promise });
  }
  return thumbnailCache.get(record.card.id).promise;
}

function renderLibrary() {
  const section = field("proxy-custom-section");
  const list = field("proxy-custom-list");
  if (!section || !list) return;
  section.hidden = editorState.records.length === 0;
  list.innerHTML = editorState.records
    .map(
      (record) => `
      <article class="proxy-custom-tile" data-custom-id="${escapeHtml(record.card.id)}">
        <div class="proxy-custom-thumb"><img alt="${escapeHtml(record.card.name)}" loading="lazy" /></div>
        <div class="proxy-custom-tile-body">
          <strong>${escapeHtml(record.card.name)}</strong>
          <span>${escapeHtml(record.card.typeLine)}</span>
          <span class="proxy-custom-mode-badge">${record.card.mode === "scan" ? "Visuel retexturé" : "Cadre DraftMaster"}</span>
          <label class="proxy-custom-qty">
            <span>À imprimer</span>
            <input type="number" min="0" max="20" value="${String(record.card.quantity)}" data-action="qty" aria-label="Quantité à imprimer pour ${escapeHtml(record.card.name)}" />
          </label>
          <div class="proxy-custom-tile-actions">
            <button type="button" class="proxy-btn-secondary" data-action="edit">Modifier</button>
            <button type="button" class="proxy-btn-secondary" data-action="png">PNG 600 DPI</button>
          </div>
        </div>
      </article>`,
    )
    .join("");
  for (const record of editorState.records) {
    const img = list.querySelector(
      `[data-custom-id="${CSS.escape(record.card.id)}"] .proxy-custom-thumb img`,
    );
    void thumbnailFor(record).then((url) => {
      if (img && url) img.src = url;
    });
  }
}

export async function refreshLibrary() {
  try {
    editorState.records = await listCustomCards();
  } catch {
    editorState.records = [];
  }
  renderLibrary();
  editorState.onLibraryChange();
}

/**
 * Wires the editor once. `onLibraryChange` lets the studio refresh its print
 * tray; `notify(message, tone)` reuses the studio's feedback banner.
 */
export async function initCustomCardsUi({ onLibraryChange, notify } = {}) {
  if (onLibraryChange) editorState.onLibraryChange = onLibraryChange;
  if (notify) editorState.notify = notify;
  if (editorState.initialized) return;
  editorState.initialized = true;

  field("proxy-btn-new-custom")?.addEventListener("click", () => openCustomCardEditor());
  field("proxy-custom-close-btn")?.addEventListener("click", closeEditor);
  field("proxy-custom-cancel-btn")?.addEventListener("click", closeEditor);
  field("proxy-custom-modal")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeEditor();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !field("proxy-custom-modal")?.hidden) closeEditor();
  });
  // The save button is type="submit": the form's submit handler below saves once.
  field("proxy-custom-delete-btn")?.addEventListener("click", async () => {
    const id = editorState.editingId;
    if (!id) return;
    const record = editorState.records.find((candidate) => candidate.card.id === id);
    if (!window.confirm(`Supprimer définitivement « ${record?.card.name ?? "cette carte"} » ?`)) {
      return;
    }
    await deleteCustomCard(id);
    thumbnailCache.delete(id);
    await refreshLibrary();
    closeEditor();
  });
  field("proxy-custom-file")?.addEventListener("change", (event) => {
    void acceptImageFile(event.target.files?.[0]);
  });
  const dropZone = field("proxy-custom-dropzone");
  dropZone?.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("is-dragover");
  });
  dropZone?.addEventListener("dragleave", () => dropZone.classList.remove("is-dragover"));
  dropZone?.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("is-dragover");
    void acceptImageFile(event.dataTransfer?.files?.[0]);
  });
  field("proxy-custom-form")?.addEventListener("input", () => {
    updateModeHints();
    schedulePreview();
  });
  field("proxy-custom-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void saveFromEditor();
  });

  field("proxy-custom-list")?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    const tile = event.target.closest("[data-custom-id]");
    if (!button || !tile) return;
    const record = editorState.records.find((r) => r.card.id === tile.dataset.customId);
    if (!record) return;
    if (button.dataset.action === "edit") openCustomCardEditor(record);
    if (button.dataset.action === "png") void downloadPng(record);
  });
  field("proxy-custom-list")?.addEventListener("change", async (event) => {
    const input = event.target.closest('input[data-action="qty"]');
    const tile = event.target.closest("[data-custom-id]");
    if (!input || !tile) return;
    const record = editorState.records.find((r) => r.card.id === tile.dataset.customId);
    if (!record) return;
    const { card } = normalizeCustomCard({ ...record.card, quantity: input.value });
    await saveCustomCard({ ...card, updatedAt: record.card.updatedAt }, record.image);
    await refreshLibrary();
  });

  if (!(await isCustomLibraryPersistent())) {
    editorState.notify(
      "Stockage local indisponible : les cartes inédites ne seront conservées que pendant cette session.",
      "warning",
    );
  }
  await refreshLibrary();
}
