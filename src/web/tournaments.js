import { render17LandsDeckView } from "./deck-viewer-17lands.js";
import { readCardLanguage } from "./card-language.js";
import { formatMtgaDeckText, parseMtgaDeckText } from "./mtga-deck-text.js";

const tournamentUi = {
  initialized: false,
  cubes: [],
  tournaments: [],
  selectedTournament: null,
};

class TournamentRequestError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "TournamentRequestError";
    this.code = code;
  }
}

function element(id) {
  return document.getElementById(id);
}

function createRequestId(prefix) {
  const suffix = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `${prefix}-${suffix}`;
}

async function readResponse(response) {
  const body = await response.json();
  if (!response.ok || body.ok !== true) {
    throw new TournamentRequestError(
      body.error?.message ?? "Le serveur n'a pas pu traiter la demande.",
      body.error?.code,
    );
  }
  return body;
}

function showFeedback(message, kind = "success", reload = false) {
  const feedback = element("tournament-feedback");
  const feedbackMessage = element("tournament-feedback-message");
  const reloadButton = element("tournament-reload");
  if (!feedback) return;
  feedback.hidden = false;
  feedback.dataset.kind = kind;
  if (feedbackMessage) feedbackMessage.textContent = message;
  if (reloadButton instanceof HTMLButtonElement) reloadButton.hidden = !reload;
}

function clearFeedback() {
  const feedback = element("tournament-feedback");
  const feedbackMessage = element("tournament-feedback-message");
  const reloadButton = element("tournament-reload");
  if (!feedback) return;
  feedback.hidden = true;
  if (feedbackMessage) feedbackMessage.textContent = "";
  if (reloadButton instanceof HTMLButtonElement) reloadButton.hidden = true;
  delete feedback.dataset.kind;
}

function setLoading(loading) {
  const indicator = element("tournament-loading");
  const workspace = element("tournament-workspace");
  if (indicator) indicator.hidden = !loading;
  workspace?.setAttribute("aria-busy", String(loading));
}

function setBusy(button, busy, busyLabel) {
  if (!(button instanceof HTMLButtonElement)) return;
  if (busy) {
    button.dataset.idleLabel = button.textContent ?? "";
    button.textContent = busyLabel;
  } else if (button.dataset.idleLabel) {
    button.textContent = button.dataset.idleLabel;
    delete button.dataset.idleLabel;
  }
  button.disabled = busy;
}

function statusLabel(status) {
  if (status === "active") return "En cours";
  if (status === "completed") return "Terminé";
  return "Préparation";
}

function formatLabel(format) {
  if (format === "round-robin" || format === "round-robin-three") return "Toutes rondes";
  if (format === "swiss") return "Rondes suisses";
  return "Format à choisir";
}

export function formatTournamentDate(dateIso) {
  if (!dateIso) return "";
  const d = new Date(dateIso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatShortDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

export function generateTournamentName(cubeKey, cubeName, date = new Date()) {
  const dateStr = formatShortDate(date);
  if (!cubeKey) return `Tournoi du ${dateStr}`;
  let baseName = cubeName || "";
  if (cubeKey === "titou_tribal") {
    baseName = "titou's tribal";
  } else {
    baseName = baseName
      .replace(/^(cube\s+de\s+|cube\s+d'|cube\s+)/i, "")
      .replace(/\s+cube$/i, "")
      .trim();
  }
  return `Cube ${baseName} du ${dateStr}`;
}

export const DEFAULT_MAGICIENS = [
  "Tristan",
  "Cédric",
  "Hugues",
  "Ivan",
  "Nico",
  "Papayou",
  "Rémi",
  "Théo",
];
const OCCASIONAL_MAGICIENS_KEY = "draftmaster_occasional_magiciens";

export function getStoredOccasionalMagiciens() {
  try {
    const raw = localStorage.getItem(OCCASIONAL_MAGICIENS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOccasionalMagicien(name) {
  const trimmed = name?.trim();
  if (!trimmed) return;
  if (DEFAULT_MAGICIENS.some((m) => m.toLowerCase() === trimmed.toLowerCase())) return;
  const list = getStoredOccasionalMagiciens();
  if (!list.some((m) => m.toLowerCase() === trimmed.toLowerCase())) {
    list.push(trimmed);
    try {
      localStorage.setItem(OCCASIONAL_MAGICIENS_KEY, JSON.stringify(list));
    } catch {
      // Ignore storage errors
    }
  }
}

function updateRoundRobinRoundCount() {
  const format = element("tournament-format");
  const roundCount = element("tournament-round-count");
  if (!(format instanceof HTMLSelectElement) || !(roundCount instanceof HTMLInputElement)) return;
  if (format.value === "round-robin" || format.value === "round-robin-three") {
    const players = document.querySelectorAll("[data-tournament-player-row]");
    const count = players.length;
    if (count >= 2) {
      const expected = count % 2 === 0 ? count - 1 : count;
      roundCount.value = String(expected);
      roundCount.title = `Toutes rondes : ${count} participants = ${expected} rondes`;
    }
  }
}

function renderHistory() {
  const list = element("tournament-history-list");
  const empty = element("tournament-empty-state");
  if (!list || !empty) return;
  list.replaceChildren();
  empty.hidden = tournamentUi.tournaments.length > 0;
  for (const tournament of tournamentUi.tournaments) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tournament-history-item";
    button.dataset.tournamentId = tournament.tournamentId;
    button.setAttribute("aria-label", `Ouvrir le tournoi ${tournament.name}`);

    const dateBadge = document.createElement("span");
    dateBadge.className = "tournament-history-date";
    dateBadge.textContent = `📅 ${formatTournamentDate(tournament.createdAt)}`;

    const status = document.createElement("span");
    status.className = `tournament-status tournament-status-${tournament.status}`;
    status.textContent = statusLabel(tournament.status);

    const heading = document.createElement("span");
    heading.className = "tournament-history-name";
    heading.textContent = tournament.name;

    const meta = document.createElement("span");
    meta.className = "tournament-history-meta";
    meta.textContent = `${String(tournament.participantCount)} joueurs · ${formatLabel(tournament.format)}`;

    button.append(dateBadge, status, heading, meta);
    button.addEventListener("click", () => void openTournament(tournament.tournamentId));
    list.append(button);
  }
}

async function refreshHistory() {
  const body = await readResponse(await fetch("/api/tournaments?status=all&limit=100"));
  tournamentUi.tournaments = Array.isArray(body.tournaments) ? body.tournaments : [];
  renderHistory();
}

function populateCubeSelect() {
  const selects = [element("tournament-cube"), element("tournament-create-cube")];
  for (const select of selects) {
    if (!(select instanceof HTMLSelectElement)) continue;
    const current = select.value;
    select.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Choisir un cube";
    select.append(placeholder);
    for (const cube of tournamentUi.cubes) {
      const option = document.createElement("option");
      option.value = cube.cubeKey;
      option.textContent = cube.cubeName;
      select.append(option);
    }
    select.value = current;
  }
}

async function loadCubes() {
  const body = await readResponse(await fetch("/api/tournaments/cubes"));
  tournamentUi.cubes = Array.isArray(body.cubes) ? body.cubes : [];
  populateCubeSelect();
}

let activeDeckModal = {
  isOpen: false,
  targetRow: null,
  participant: null,
  participantId: null,
  displayName: "",
  archetype: "",
  cards: [],
  basicLands: { Plains: 0, Island: 0, Swamp: 0, Mountain: 0, Forest: 0 },
  isReadOnly: false,
  cubeCards: [],
  mtgaTextDirty: false,
};

async function loadCubeCards(cubeKey) {
  if (!cubeKey) return [];
  if (
    tournamentUi.selectedTournament?.cube?.cubeKey === cubeKey &&
    Array.isArray(tournamentUi.selectedTournament.cube.payload?.cards)
  ) {
    return tournamentUi.selectedTournament.cube.payload.cards;
  }
  try {
    const cubeMetaRes = await fetch(`/data/cubes/${cubeKey}/cube.json`);
    if (cubeMetaRes.ok) {
      const cubeData = await cubeMetaRes.json();
      if (cubeData.activeSnapshotId) {
        const snapRes = await fetch(`/data/cubes/${cubeKey}/${cubeData.activeSnapshotId}.json`);
        if (snapRes.ok) {
          const snapData = await snapRes.json();
          if (Array.isArray(snapData.cards)) return snapData.cards;
        }
      }
    }
  } catch {
    // fallback gracefully
  }
  return [];
}

function computeDeckTotalCards(cards, basicLands) {
  const spells = (cards || []).reduce((sum, c) => sum + (c.count || 1), 0);
  const lands = Object.values(basicLands || {}).reduce(
    (sum, qty) => sum + (typeof qty === "number" ? qty : 0),
    0,
  );
  return { spells, lands, total: spells + lands };
}

function updateViewDeckButton(row) {
  const viewBtn = row.querySelector("[data-view-deck-btn]");
  if (!viewBtn) return;
  const cards = row._deckData?.cards || [];
  const basicLands = row._deckData?.basicLands || {};
  const { total } = computeDeckTotalCards(cards, basicLands);
  if (total > 0) {
    viewBtn.textContent = `🃏 Deck (${total})`;
    viewBtn.classList.add("has-cards");
  } else {
    viewBtn.textContent = "🃏 Deck";
    viewBtn.classList.remove("has-cards");
  }
}

async function optimizeImageForUpload(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1400;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = () => reject(new Error("Impossible de charger l'image sélectionnée."));
      img.src = e.target?.result;
    };
    reader.onerror = () => reject(new Error("Impossible de lire le fichier image."));
    reader.readAsDataURL(file);
  });
}

async function triggerDeckPhotoRecognition(file, row, photoBtn, fileInput) {
  const cubeSelect = element("tournament-cube");
  const cubeKey =
    (cubeSelect instanceof HTMLSelectElement ? cubeSelect.value : "") ||
    tournamentUi.selectedTournament?.cube?.cubeKey ||
    "";
  if (!cubeKey) {
    showFeedback("Veuillez d'abord sélectionner un cube pour ce tournoi.", "error");
    return;
  }

  const prevText = photoBtn.textContent;
  photoBtn.disabled = true;
  photoBtn.textContent = "⏳ Analyse IA…";
  showFeedback("Analyse du deck en cours avec Gemini (15 à 30s)…", "info");

  try {
    const dataUrl = await optimizeImageForUpload(file);
    const response = await fetch("/api/tournaments/recognize-deck", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataUrl, cubeKey }),
    });
    const body = await response.json();
    if (!response.ok || !body.ok) {
      throw new Error(body.error?.message || "Échec de la reconnaissance visuelle du deck.");
    }

    const deckInput = row.querySelector("[data-deck-name]");
    if (deckInput instanceof HTMLInputElement && body.archetype && !deckInput.value.trim()) {
      deckInput.value = body.archetype;
    }

    row._deckData = {
      cards: Array.isArray(body.cards) ? body.cards : [],
      basicLands: body.basicLands || { Plains: 0, Island: 0, Swamp: 0, Mountain: 0, Forest: 0 },
      archetype:
        body.archetype || (deckInput instanceof HTMLInputElement ? deckInput.value.trim() : ""),
    };

    updateViewDeckButton(row);
    showFeedback(
      `Deck reconnu avec succès ! ${body.totalCount ?? row._deckData.cards.length} cartes identifiées (${body.archetype || "Archétype détecté"}).`,
      "success",
    );

    void openTournamentDeckModal({ row });
  } catch (error) {
    showFeedback(
      error instanceof Error ? error.message : "Erreur lors de la reconnaissance du deck.",
      "error",
    );
  } finally {
    photoBtn.disabled = false;
    photoBtn.textContent = prevText;
    fileInput.value = "";
  }
}

async function openTournamentDeckModal({
  row = null,
  participant = null,
  isReadOnly = false,
  proposedDeck = null,
} = {}) {
  const modalBackdrop = element("tournament-deck-modal-backdrop");
  if (!modalBackdrop) return;

  const cubeSelect = element("tournament-cube");
  const cubeKey =
    (cubeSelect instanceof HTMLSelectElement ? cubeSelect.value : "") ||
    tournamentUi.selectedTournament?.cube?.cubeKey ||
    "";

  let displayName = "Joueur";
  let archetype = "";
  let cards = [];
  let basicLands = { Plains: 0, Island: 0, Swamp: 0, Mountain: 0, Forest: 0 };
  let participantId = null;

  if (row) {
    const playerInput = row.querySelector("[data-player-name]");
    const deckInput = row.querySelector("[data-deck-name]");
    displayName =
      (playerInput instanceof HTMLInputElement ? playerInput.value.trim() : "") || "Joueur";
    archetype =
      (deckInput instanceof HTMLInputElement ? deckInput.value.trim() : "") ||
      row._deckData?.archetype ||
      "";
    cards = row._deckData?.cards ? JSON.parse(JSON.stringify(row._deckData.cards)) : [];
    basicLands = {
      Plains: row._deckData?.basicLands?.Plains ?? 0,
      Island: row._deckData?.basicLands?.Island ?? 0,
      Swamp: row._deckData?.basicLands?.Swamp ?? 0,
      Mountain: row._deckData?.basicLands?.Mountain ?? 0,
      Forest: row._deckData?.basicLands?.Forest ?? 0,
    };
    participantId = row.dataset.participantId || null;
  } else if (participant) {
    displayName = participant.displayName || "Joueur";
    archetype = proposedDeck?.archetype || participant.deck?.name || "";
    const sourceCards = proposedDeck?.cards ?? participant.deck?.cards;
    cards = sourceCards ? JSON.parse(JSON.stringify(sourceCards)) : [];
    basicLands = {
      Plains: proposedDeck?.basicLands?.Plains ?? participant.deck?.basicLands?.Plains ?? 0,
      Island: proposedDeck?.basicLands?.Island ?? participant.deck?.basicLands?.Island ?? 0,
      Swamp: proposedDeck?.basicLands?.Swamp ?? participant.deck?.basicLands?.Swamp ?? 0,
      Mountain: proposedDeck?.basicLands?.Mountain ?? participant.deck?.basicLands?.Mountain ?? 0,
      Forest: proposedDeck?.basicLands?.Forest ?? participant.deck?.basicLands?.Forest ?? 0,
    };
    participantId = participant.participantId;
  }

  activeDeckModal = {
    isOpen: true,
    targetRow: row,
    participant,
    participantId,
    displayName,
    archetype,
    cards,
    basicLands,
    isReadOnly,
    cubeCards: [],
    mtgaTextDirty: false,
  };

  const playerNameEl = element("tournament-deck-player-name");
  const modalTitleEl = element("tournament-deck-modal-title");
  const archetypeInput = element("tournament-deck-archetype-input");
  const editorToolbar = element("tournament-deck-editor-toolbar");
  const landsPanel = element("tournament-deck-lands-panel");
  const saveBtn = element("tournament-deck-save-btn");
  const mtgaText = element("tournament-deck-mtga-text");
  const mtgaApply = element("tournament-deck-mtga-apply");

  if (playerNameEl) playerNameEl.textContent = displayName;
  if (modalTitleEl) modalTitleEl.textContent = `Deck de ${displayName}`;
  if (archetypeInput instanceof HTMLInputElement) {
    archetypeInput.value = archetype;
    archetypeInput.disabled = isReadOnly;
  }
  if (editorToolbar) editorToolbar.hidden = isReadOnly;
  if (landsPanel) {
    landsPanel.querySelectorAll(".tournament-land-btn").forEach((btn) => {
      if (btn instanceof HTMLButtonElement) btn.disabled = isReadOnly;
    });
  }
  if (saveBtn) saveBtn.hidden = isReadOnly;
  if (mtgaText instanceof HTMLTextAreaElement) mtgaText.readOnly = isReadOnly;
  if (mtgaApply instanceof HTMLButtonElement) mtgaApply.hidden = isReadOnly;
  setBusy(mtgaApply, false, "");
  setMtgaDeckStatus("");

  refreshModalDeckView();
  modalBackdrop.hidden = false;
  modalBackdrop.classList.add("is-open");

  void loadCubeCards(cubeKey).then((cards) => {
    activeDeckModal.cubeCards = cards;
  });
}

function refreshModalDeckView() {
  const target17Lands = element("tournament-deck-17lands-target");
  const statsBadge = element("tournament-deck-total-count");
  if (!target17Lands) return;

  const { cards, basicLands, isReadOnly } = activeDeckModal;
  const { spells, lands, total } = computeDeckTotalCards(cards, basicLands);

  if (statsBadge) {
    statsBadge.textContent = `${total} cartes (${spells} sorts + ${lands} terrains)`;
  }

  for (const land of ["Plains", "Island", "Swamp", "Mountain", "Forest"]) {
    const qtyEl = document.querySelector(`[data-land-qty="${land}"]`);
    if (qtyEl) {
      qtyEl.textContent = String(basicLands[land] ?? 0);
    }
  }

  const flatCards = [];
  for (const card of cards) {
    const count = card.count || 1;
    for (let i = 0; i < count; i++) {
      flatCards.push(card);
    }
  }

  const cardLanguage = readCardLanguage();
  render17LandsDeckView(target17Lands, flatCards, {
    basicLands,
    language: cardLanguage,
  });

  if (!isReadOnly) {
    target17Lands.querySelectorAll(".curve-card-slot").forEach((slot) => {
      const colKey = slot.getAttribute("data-col-key");
      const title = slot.getAttribute("title") || "";
      if (colKey === "lands") {
        const isBasic =
          /^(plains|island|swamp|mountain|forest|plaine|île|marais|montagne|forêt)/i.test(title);
        if (isBasic) return;
      }

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "tournament-deck-card-remove-btn";
      removeBtn.textContent = "✕";
      removeBtn.title = `Retirer ${title} du deck`;
      removeBtn.setAttribute("aria-label", `Retirer ${title}`);
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        removeCardFromActiveDeck(title);
      });
      slot.append(removeBtn);
    });
  }
  syncMtgaTextFromDeck();
}

function setMtgaDeckStatus(message, kind = "info") {
  const status = element("tournament-deck-mtga-status");
  if (!status) return;
  status.textContent = message;
  status.dataset.kind = kind;
  status.setAttribute("role", kind === "error" ? "alert" : "status");
}

function syncMtgaTextFromDeck() {
  const text = element("tournament-deck-mtga-text");
  if (!(text instanceof HTMLTextAreaElement) || activeDeckModal.mtgaTextDirty) return;
  const archetypeInput = element("tournament-deck-archetype-input");
  const deckName =
    archetypeInput instanceof HTMLInputElement
      ? archetypeInput.value.trim()
      : activeDeckModal.archetype;
  text.value = formatMtgaDeckText({
    deckName,
    cards: activeDeckModal.cards,
    basicLands: activeDeckModal.basicLands,
  });
}

async function applyActiveMtgaText() {
  if (activeDeckModal.isReadOnly) return false;
  const text = element("tournament-deck-mtga-text");
  const applyButton = element("tournament-deck-mtga-apply");
  if (!(text instanceof HTMLTextAreaElement)) return false;
  const submittedText = text.value;
  const modalState = activeDeckModal;
  setBusy(applyButton, true, "Analyse…");
  try {
    const body = await readResponse(
      await fetch("/api/tournaments/parse-deck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: submittedText }),
      }),
    );
    if (activeDeckModal !== modalState) return false;
    if (text.value !== submittedText) {
      setMtgaDeckStatus("La liste a changé pendant l'analyse. Appliquez-la de nouveau.", "warning");
      return false;
    }
    activeDeckModal.cards = body.cards;
    activeDeckModal.basicLands = body.basicLands;
    activeDeckModal.mtgaTextDirty = false;
    const archetypeInput = element("tournament-deck-archetype-input");
    if (body.deckName && archetypeInput instanceof HTMLInputElement) {
      archetypeInput.value = body.deckName;
    }
    refreshModalDeckView();
    setMtgaDeckStatus(
      body.warnings?.length
        ? `${body.totalCount} cartes appliquées. ${body.warnings.join(" ")}`
        : `${body.totalCount} cartes appliquées. Vérifiez le deck avant de valider.`,
      body.warnings?.length ? "warning" : "success",
    );
    return true;
  } catch (error) {
    if (activeDeckModal !== modalState) return false;
    setMtgaDeckStatus(
      error instanceof Error ? error.message : "Impossible de lire la liste MTGA.",
      "error",
    );
    return false;
  } finally {
    if (activeDeckModal === modalState) setBusy(applyButton, false, "");
  }
}

function getExportableMtgaText() {
  const text = element("tournament-deck-mtga-text");
  if (!(text instanceof HTMLTextAreaElement)) return null;
  try {
    parseMtgaDeckText(text.value);
    return text.value;
  } catch (error) {
    setMtgaDeckStatus(
      error instanceof Error ? error.message : "La liste MTGA est invalide.",
      "error",
    );
    return null;
  }
}

async function copyActiveMtgaText() {
  const text = getExportableMtgaText();
  if (text === null) return;
  try {
    await navigator.clipboard.writeText(text);
    setMtgaDeckStatus("Liste MTGA copiée.", "success");
  } catch {
    setMtgaDeckStatus("Copie impossible. Sélectionnez le texte pour le copier.", "error");
  }
}

function downloadActiveMtgaText() {
  const text = getExportableMtgaText();
  if (text === null) return;
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "draftmaster-tournoi-deck.mtga.txt";
  anchor.click();
  URL.revokeObjectURL(url);
  setMtgaDeckStatus("Liste MTGA téléchargée.", "success");
}

function removeCardFromActiveDeck(cardTitleOrName) {
  if (activeDeckModal.mtgaTextDirty) {
    setMtgaDeckStatus("Appliquez d'abord les modifications du texte MTGA.", "warning");
    return;
  }
  if (!cardTitleOrName) return;
  const targetName = cardTitleOrName.toLowerCase().trim();
  const cardIndex = activeDeckModal.cards.findIndex(
    (c) =>
      (c.name || "").toLowerCase().trim() === targetName ||
      (c.frenchName || "").toLowerCase().trim() === targetName,
  );
  if (cardIndex !== -1) {
    const card = activeDeckModal.cards[cardIndex];
    if (card.count > 1) {
      card.count -= 1;
    } else {
      activeDeckModal.cards.splice(cardIndex, 1);
    }
    refreshModalDeckView();
  }
}

function addCardToActiveDeck(card) {
  if (activeDeckModal.mtgaTextDirty) {
    setMtgaDeckStatus("Appliquez d'abord les modifications du texte MTGA.", "warning");
    return;
  }
  if (!card || !card.name) return;
  const existing = activeDeckModal.cards.find(
    (c) =>
      (c.name || "").toLowerCase() === card.name.toLowerCase() ||
      (card.oracleId && c.oracleId === card.oracleId),
  );
  if (existing) {
    existing.count = (existing.count || 1) + 1;
  } else {
    activeDeckModal.cards.push({
      name: card.name,
      oracleId: card.oracleId,
      count: 1,
      cmc: typeof card.cmc === "number" ? card.cmc : 0,
      typeLine: card.typeLine || "",
      isLand:
        card.isLand === true ||
        Boolean(card.typeLine && card.typeLine.toLowerCase().includes("land")),
      imageUrl: card.imageUrl || card.image?.url,
      frenchName: card.frenchName,
    });
  }
  refreshModalDeckView();
}

function setupBasicLandSteppers() {
  document.querySelectorAll("[data-land-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (activeDeckModal.isReadOnly) return;
      if (activeDeckModal.mtgaTextDirty) {
        setMtgaDeckStatus("Appliquez d'abord les modifications du texte MTGA.", "warning");
        return;
      }
      const stepper = btn.closest(".tournament-land-stepper");
      const land = stepper instanceof HTMLElement ? stepper.dataset.land : null;
      const action = btn instanceof HTMLElement ? btn.dataset.landAction : null;
      if (!land || !action) return;

      const current = activeDeckModal.basicLands[land] ?? 0;
      if (action === "plus") {
        activeDeckModal.basicLands[land] = current + 1;
      } else if (action === "minus") {
        activeDeckModal.basicLands[land] = Math.max(0, current - 1);
      }
      refreshModalDeckView();
    });
  });
}

function setupDeckCardSearch() {
  const searchInput = element("tournament-deck-add-search");
  const resultsDropdown = element("tournament-deck-search-results");
  if (!searchInput || !resultsDropdown) return;

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();
    if (!query || activeDeckModal.isReadOnly) {
      resultsDropdown.hidden = true;
      resultsDropdown.replaceChildren();
      return;
    }

    const matches = (activeDeckModal.cubeCards || [])
      .filter((c) => {
        const nameMatch = (c.name || "").toLowerCase().includes(query);
        const frMatch = (c.frenchName || "").toLowerCase().includes(query);
        return nameMatch || frMatch;
      })
      .slice(0, 10);

    resultsDropdown.replaceChildren();
    if (matches.length === 0) {
      const emptyItem = document.createElement("div");
      emptyItem.className = "tournament-deck-search-empty";
      emptyItem.textContent = "Aucune carte trouvée dans le cube.";
      resultsDropdown.append(emptyItem);
      resultsDropdown.hidden = false;
      return;
    }

    for (const card of matches) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "tournament-deck-search-item";
      item.textContent = `${card.name} (CMC ${card.cmc ?? 0})`;
      item.addEventListener("click", () => {
        addCardToActiveDeck(card);
        searchInput.value = "";
        resultsDropdown.hidden = true;
        resultsDropdown.replaceChildren();
      });
      resultsDropdown.append(item);
    }
    resultsDropdown.hidden = false;
  });

  document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !resultsDropdown.contains(e.target)) {
      resultsDropdown.hidden = true;
    }
  });
}

async function saveActiveDeckModal() {
  if (activeDeckModal.isReadOnly) {
    closeActiveDeckModal();
    return;
  }

  if (activeDeckModal.mtgaTextDirty) {
    setMtgaDeckStatus("Appliquez la liste puis vérifiez le deck avant de valider.", "warning");
    element("tournament-deck-mtga-apply")?.focus();
    return;
  }

  const archetypeInput = element("tournament-deck-archetype-input");
  const newArchetype =
    archetypeInput instanceof HTMLInputElement ? archetypeInput.value.trim() : "";

  // 1. Setup view (before tournament starts)
  if (activeDeckModal.targetRow) {
    const row = activeDeckModal.targetRow;
    row._deckData = {
      cards: activeDeckModal.cards,
      basicLands: activeDeckModal.basicLands,
      archetype: newArchetype,
    };
    if (newArchetype) {
      const deckInput = row.querySelector("[data-deck-name]");
      if (deckInput instanceof HTMLInputElement) {
        deckInput.value = newArchetype;
      }
    }
    updateViewDeckButton(row);
    closeActiveDeckModal();
    return;
  }

  // 2. Active tournament participant update
  const tournament = tournamentUi.selectedTournament;
  if (tournament && activeDeckModal.participantId) {
    const saveBtn = element("tournament-deck-save-btn");
    setBusy(saveBtn, true, "Enregistrement…");
    try {
      const res = await fetch(
        `/api/tournaments/${encodeURIComponent(tournament.tournamentId)}/participants/${encodeURIComponent(activeDeckModal.participantId)}/deck`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": createRequestId("update-participant-deck"),
          },
          body: JSON.stringify({
            expectedRevision: tournament.revision,
            deckName: newArchetype || undefined,
            cards: activeDeckModal.cards,
            basicLands: activeDeckModal.basicLands,
          }),
        },
      );
      const data = await readResponse(res);
      renderTournament(data.tournament);
      showFeedback("Deck du joueur mis à jour avec succès !", "success");
      closeActiveDeckModal();
    } catch (err) {
      showFeedback(
        err instanceof Error ? err.message : "Impossible de mettre à jour le deck.",
        "error",
      );
    } finally {
      setBusy(saveBtn, false, "");
    }
  } else {
    closeActiveDeckModal();
  }
}

function closeActiveDeckModal() {
  const modalBackdrop = element("tournament-deck-modal-backdrop");
  if (modalBackdrop) {
    modalBackdrop.hidden = true;
    modalBackdrop.classList.remove("is-open");
  }
  activeDeckModal.isOpen = false;
  activeDeckModal.targetRow = null;
  activeDeckModal.participant = null;
  activeDeckModal.cards = [];
  activeDeckModal.mtgaTextDirty = false;
}

function createPlayerRow(participant = null) {
  const row = document.createElement("div");
  row.className = "tournament-player-row";
  row.dataset.tournamentPlayerRow = "";
  if (participant?.participantId) row.dataset.participantId = participant.participantId;

  const playerLabel = document.createElement("label");
  playerLabel.className = "tournament-field tournament-player-field";
  const playerCaption = document.createElement("span");
  playerCaption.textContent = "Joueur";

  const initialName = participant?.displayName ?? "";
  const occasionalList = getStoredOccasionalMagiciens();

  const select = document.createElement("select");
  select.className = "tournament-player-select";
  select.dataset.playerSelect = "";
  select.setAttribute("aria-label", "Sélectionner un magicien");

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "-- Choisir un magicien --";
  select.append(placeholder);

  const habituelsGroup = document.createElement("optgroup");
  habituelsGroup.label = "Magiciens habituels";
  for (const name of DEFAULT_MAGICIENS) {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    habituelsGroup.append(opt);
  }
  select.append(habituelsGroup);

  if (occasionalList.length > 0) {
    const occGroup = document.createElement("optgroup");
    occGroup.label = "Magiciens occasionnels";
    for (const name of occasionalList) {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      occGroup.append(opt);
    }
    select.append(occGroup);
  }

  const customOpt = document.createElement("option");
  customOpt.value = "__custom__";
  customOpt.textContent = "➕ Nouveau magicien…";
  select.append(customOpt);

  const playerInput = document.createElement("input");
  playerInput.type = "text";
  playerInput.required = true;
  playerInput.maxLength = 80;
  playerInput.placeholder = "Alice ou choisir ci-dessus";
  playerInput.dataset.playerName = "";
  playerInput.value = initialName;

  if (initialName) {
    if (DEFAULT_MAGICIENS.includes(initialName) || occasionalList.includes(initialName)) {
      select.value = initialName;
    } else {
      select.value = "__custom__";
    }
  }

  select.addEventListener("change", () => {
    if (select.value && select.value !== "__custom__") {
      playerInput.value = select.value;
      playerInput.dispatchEvent(new Event("input", { bubbles: true }));
    } else if (select.value === "__custom__") {
      playerInput.value = "";
      playerInput.focus();
    }
  });

  playerInput.addEventListener("input", () => {
    const val = playerInput.value.trim();
    if (DEFAULT_MAGICIENS.includes(val) || occasionalList.includes(val)) {
      select.value = val;
    } else if (val) {
      select.value = "__custom__";
    } else {
      select.value = "";
    }
  });

  playerLabel.append(playerCaption, select, playerInput);

  const deckLabel = document.createElement("label");
  deckLabel.className = "tournament-field tournament-deck-field";
  const deckCaption = document.createElement("span");
  deckCaption.textContent = "Deck / archétype";
  const deckInput = document.createElement("input");
  deckInput.type = "text";
  deckInput.required = true;
  deckInput.maxLength = 120;
  deckInput.placeholder = "Aggro Boros";
  deckInput.dataset.deckName = "";
  deckInput.value = participant?.deck?.name ?? "";

  const deckActions = document.createElement("div");
  deckActions.className = "tournament-deck-row-actions";

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.style.display = "none";
  fileInput.setAttribute("aria-label", "Fichier photo du deck");

  const photoBtn = document.createElement("button");
  photoBtn.type = "button";
  photoBtn.className = "tournament-deck-photo-btn";
  photoBtn.textContent = "📷 Photo";
  photoBtn.title = "Scanner une photo du deck avec reconnaissance Gemini";
  photoBtn.setAttribute("aria-label", "Scanner la photo du deck avec l'IA");
  photoBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (file) {
      void triggerDeckPhotoRecognition(file, row, photoBtn, fileInput);
    }
  });

  const viewBtn = document.createElement("button");
  viewBtn.type = "button";
  viewBtn.className = "tournament-deck-view-btn";
  viewBtn.dataset.viewDeckBtn = "";
  viewBtn.textContent = "🃏 Deck";
  viewBtn.title = "Consulter et ajuster le deck (vue 17Lands)";
  viewBtn.setAttribute("aria-label", "Voir le deck dans la vue 17Lands");
  viewBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    void openTournamentDeckModal({ row });
  });

  deckActions.append(fileInput, photoBtn, viewBtn);
  deckLabel.append(deckCaption, deckInput, deckActions);

  row._deckData = {
    cards: participant?.deck?.cards ? JSON.parse(JSON.stringify(participant.deck.cards)) : [],
    basicLands: participant?.deck?.basicLands ? { ...participant.deck.basicLands } : {},
    archetype: participant?.deck?.name ?? "",
  };

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "tournament-remove-player";
  remove.textContent = "Retirer";
  remove.setAttribute("aria-label", "Retirer ce joueur");
  remove.addEventListener("click", () => {
    const container = element("tournament-player-list");
    if (container?.children.length > 2) {
      row.remove();
      updateRoundRobinRoundCount();
    }
  });

  row.append(playerLabel, deckLabel, remove);
  updateViewDeckButton(row);
  return row;
}

function appendPlayer(participant = null) {
  const list = element("tournament-player-list");
  if (!list || list.children.length >= 32) return;
  list.append(createPlayerRow(participant));
  updateRoundRobinRoundCount();
}

function participantById(tournament, participantId) {
  return tournament.participants?.find(
    (participant) => participant.participantId === participantId,
  );
}

function formatPercentage(fraction) {
  if (!fraction || !Number.isFinite(fraction.numerator) || !Number.isFinite(fraction.denominator)) {
    return "0 %";
  }
  if (fraction.denominator === 0) return "0 %";
  return `${((fraction.numerator / fraction.denominator) * 100).toFixed(1)} %`;
}

function currentMatchResult(match) {
  if (match.currentResultVersion === null) return null;
  return match.resultVersions.find(({ version }) => version === match.currentResultVersion) ?? null;
}

function createScoreField(caption, dataName, value) {
  const label = document.createElement("label");
  label.className = "tournament-score-field";
  const text = document.createElement("span");
  text.textContent = caption;
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.max = "9";
  input.step = "1";
  input.required = true;
  input.value = String(value);
  input.dataset[dataName] = "";
  label.append(text, input);
  return label;
}

function renderResultControls(table, tournament, match) {
  if (match.participantBId === null) return;
  const currentResult = currentMatchResult(match);
  const history = document.createElement("ol");
  history.className = "tournament-result-history";
  history.dataset.resultHistory = "";
  for (const version of match.resultVersions) {
    const item = document.createElement("li");
    const drawnLabel = version.drawnGames > 0 ? ` · ${String(version.drawnGames)} nulle(s)` : "";
    const reasonLabel = version.reason ? ` · ${version.reason}` : "";
    item.textContent = `v${String(version.version)} · ${String(version.gamesWonA)}–${String(version.gamesWonB)}${drawnLabel}${reasonLabel}`;
    history.append(item);
  }
  if (history.children.length === 0) {
    const pending = document.createElement("li");
    pending.textContent = "Résultat à confirmer";
    history.append(pending);
  }

  const form = document.createElement("form");
  form.className = "tournament-result-form";
  const kindLabel = document.createElement("label");
  kindLabel.className = "tournament-score-field";
  const kindCaption = document.createElement("span");
  kindCaption.textContent = "Type";
  const kind = document.createElement("select");
  kind.dataset.resultKind = "";
  for (const [value, label] of [
    ["played", "Joué"],
    ["forfeit", "Forfait"],
  ]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    kind.append(option);
  }
  kind.value = currentResult?.kind === "forfeit" ? "forfeit" : "played";
  kindLabel.append(kindCaption, kind);
  form.append(
    kindLabel,
    createScoreField("Victoires A", "gamesWonA", currentResult?.gamesWonA ?? 0),
    createScoreField("Victoires B", "gamesWonB", currentResult?.gamesWonB ?? 0),
    createScoreField("Nulles", "drawnGames", currentResult?.drawnGames ?? 0),
  );

  const reasonLabel = document.createElement("label");
  reasonLabel.className = "tournament-score-field tournament-result-reason";
  const reasonCaption = document.createElement("span");
  reasonCaption.textContent = currentResult ? "Motif de correction" : "Note facultative";
  const reason = document.createElement("input");
  reason.type = "text";
  reason.maxLength = 240;
  reason.required = currentResult !== null;
  reason.placeholder = currentResult ? "Pourquoi corriger ce résultat ?" : "Facultatif";
  reason.dataset.resultReason = "";
  reasonLabel.append(reasonCaption, reason);
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "tournament-primary-button";
  submit.dataset.saveResult = "";
  submit.textContent = currentResult ? "Corriger le résultat" : "Confirmer le résultat";
  form.append(reasonLabel, submit);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitMatchResult(tournament.tournamentId, match.matchId, form, submit);
  });
  table.append(history, form);
}

function snapshotCardsByOracleId(tournament) {
  const cards = Array.isArray(tournament.cube?.payload?.cards) ? tournament.cube.payload.cards : [];
  const uniqueCards = new Map();
  for (const card of cards) {
    if (
      typeof card?.oracleId === "string" &&
      typeof card?.name === "string" &&
      !uniqueCards.has(card.oracleId)
    ) {
      uniqueCards.set(card.oracleId, { oracleId: card.oracleId, name: card.name });
    }
  }
  return uniqueCards;
}

function hideCardHoverPreview() {
  const popover = document.getElementById("card-hover-popover");
  if (popover) {
    popover.hidden = true;
    popover.style.display = "none";
    popover.classList.remove("is-hover-preview");
  }
}

function attachCardHoverPreview(element, cardName) {
  if (!element || !cardName) return;
  element.addEventListener("mouseenter", () => {
    const popover = document.getElementById("card-hover-popover");
    const img = document.getElementById("popover-img");
    if (!popover || !img) return;

    img.src = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&format=image`;
    img.alt = cardName;
    popover.hidden = false;
    popover.style.display = "block";
    popover.classList.add("is-hover-preview");

    const rect = element.getBoundingClientRect();
    const popoverWidth = 260;
    const popoverHeight = 362;
    const offset = 12;

    let left = rect.right + offset;
    let top = rect.top + rect.height / 2 - popoverHeight / 2;

    if (left + popoverWidth > window.innerWidth - 16) {
      left = rect.left - popoverWidth - offset;
    }
    if (left < 16) left = 16;
    if (top + popoverHeight > window.innerHeight - 16) {
      top = window.innerHeight - popoverHeight - 16;
    }
    if (top < 16) top = 16;

    popover.style.position = "fixed";
    popover.style.left = `${Math.round(left)}px`;
    popover.style.top = `${Math.round(top)}px`;
    popover.style.zIndex = "9999";
  });

  element.addEventListener("mouseleave", () => {
    hideCardHoverPreview();
  });
}

function renderKeyCardEditors(tournament) {
  const container = element("tournament-key-card-list");
  if (!container) return;
  container.replaceChildren();
  const cardsByOracleId = snapshotCardsByOracleId(tournament);
  for (const participant of tournament.participants ?? []) {
    const panel = document.createElement("section");
    panel.className = "tournament-key-card-panel";
    panel.dataset.keyCardsParticipant = participant.participantId;
    const title = document.createElement("h4");
    title.textContent = `${participant.displayName} · ${participant.deck.name}`;

    const deckBar = document.createElement("div");
    deckBar.className = "tournament-key-card-deck-bar";

    const cardCount = participant.deck?.cards?.length ?? 0;
    const viewDeckBtn = document.createElement("button");
    viewDeckBtn.type = "button";
    viewDeckBtn.className = "tournament-secondary-button tournament-panel-deck-btn";
    viewDeckBtn.textContent =
      cardCount > 0 ? `🃏 Voir le deck (${cardCount})` : "🃏 Voir / modifier deck";
    viewDeckBtn.addEventListener("click", () => {
      void openTournamentDeckModal({
        participant,
        isReadOnly: tournament.status === "completed",
      });
    });

    const photoInput = document.createElement("input");
    photoInput.type = "file";
    photoInput.accept = "image/*";
    photoInput.style.display = "none";
    photoInput.setAttribute("aria-label", `Photo du deck de ${participant.displayName}`);

    const photoBtn = document.createElement("button");
    photoBtn.type = "button";
    photoBtn.className = "tournament-secondary-button tournament-panel-photo-btn";
    photoBtn.textContent = "📷 Scanner photo";
    photoBtn.title = "Scanner une photo du deck avec reconnaissance Gemini";
    photoBtn.hidden = tournament.status === "completed";
    photoBtn.addEventListener("click", () => photoInput.click());

    photoInput.addEventListener("change", async () => {
      const file = photoInput.files?.[0];
      if (!file) return;
      const cubeKey = tournament.cube?.cubeKey;
      if (!cubeKey) {
        showFeedback("Aucun cube associé à ce tournoi.", "error");
        return;
      }
      photoBtn.disabled = true;
      photoBtn.textContent = "⏳ Analyse IA…";
      clearFeedback();
      try {
        const dataUrl = await optimizeImageForUpload(file);
        const res = await fetch("/api/tournaments/recognize-deck", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: dataUrl, cubeKey }),
        });
        const body = await readResponse(res);
        void openTournamentDeckModal({
          participant,
          proposedDeck: {
            archetype: body.archetype || participant.deck?.name,
            cards: body.cards,
            basicLands: body.basicLands,
          },
        });
        showFeedback(
          `Deck de ${participant.displayName} reconnu (${body.totalCount ?? body.cards.length} cartes). Vérifiez la liste avant de valider.`,
          "info",
        );
      } catch (err) {
        showFeedback(
          err instanceof Error ? err.message : "Erreur de reconnaissance du deck.",
          "error",
        );
      } finally {
        photoBtn.disabled = false;
        photoBtn.textContent = "📷 Scanner photo";
        photoInput.value = "";
      }
    });

    deckBar.append(viewDeckBtn, photoInput, photoBtn);

    const selectedOracleIds = new Set(
      (participant.deck.keyCards ?? []).map(({ oracleId }) => oracleId),
    );
    const chips = document.createElement("div");
    chips.className = "tournament-key-card-chips";
    const search = document.createElement("input");
    search.type = "search";
    search.placeholder = "Nom de carte";
    search.setAttribute("aria-label", `Rechercher une carte clé pour ${participant.displayName}`);
    search.dataset.keyCardSearch = "";
    const options = document.createElement("div");
    options.className = "tournament-key-card-options";
    const save = document.createElement("button");
    save.type = "button";
    save.className = "tournament-primary-button";
    save.dataset.saveKeyCards = "";
    save.textContent = "Enregistrer les cartes clés";

    const renderChips = () => {
      chips.replaceChildren();
      for (const oracleId of selectedOracleIds) {
        const card =
          cardsByOracleId.get(oracleId) ??
          participant.deck.keyCards.find((candidate) => candidate.oracleId === oracleId);
        if (!card) continue;
        const chip = document.createElement("span");
        chip.className = "tournament-key-card-chip";
        chip.dataset.keyCardChip = "";
        const name = document.createElement("span");
        name.textContent = card.name;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "Retirer";
        remove.setAttribute("aria-label", `Retirer ${card.name}`);
        remove.addEventListener("click", () => {
          hideCardHoverPreview();
          selectedOracleIds.delete(oracleId);
          renderChips();
          renderOptions();
        });
        chip.append(name, remove);
        chips.append(chip);
        attachCardHoverPreview(chip, card.name);
      }
    };
    const renderOptions = () => {
      options.replaceChildren();
      const query = search.value.trim().toLocaleLowerCase("fr-FR");
      if (!query) return;
      const matches = [...cardsByOracleId.values()]
        .filter(
          ({ oracleId, name }) =>
            !selectedOracleIds.has(oracleId) && name.toLocaleLowerCase("fr-FR").includes(query),
        )
        .slice(0, 8);
      for (const card of matches) {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "tournament-key-card-option";
        option.dataset.keyCardOption = card.oracleId;
        option.textContent = card.name;
        option.addEventListener("click", () => {
          hideCardHoverPreview();
          selectedOracleIds.add(card.oracleId);
          search.value = "";
          renderChips();
          renderOptions();
        });
        attachCardHoverPreview(option, card.name);
        options.append(option);
      }
    };
    search.addEventListener("input", renderOptions);
    save.addEventListener("click", () => {
      void submitKeyCards(
        tournament.tournamentId,
        participant.participantId,
        [...selectedOracleIds],
        save,
      );
    });
    renderChips();
    panel.append(title, deckBar, chips, search, options, save);
    container.append(panel);
  }
}

function renderRound(tournament) {
  const round = tournament.rounds?.at(-1);
  const isRoundRobin =
    tournament.format === "round-robin" || tournament.format === "round-robin-three";
  const roundsToRender = isRoundRobin ? (tournament.rounds ?? []) : round ? [round] : [];
  const title = element("tournament-round-title");
  const tableList = element("tournament-table-list");
  const standingsBody = element("tournament-standings-body");
  const nextRound = element("tournament-next-round");
  const complete = element("tournament-complete");
  const dropList = element("tournament-drop-list");
  const participantActions = element("tournament-participant-actions");
  if (title) {
    title.textContent =
      tournament.format === "round-robin-three"
        ? "Calendrier · 3 rondes"
        : round
          ? `Ronde ${String(round.roundNumber)}`
          : "Aucune ronde";
  }
  tableList?.replaceChildren();
  standingsBody?.replaceChildren();
  dropList?.replaceChildren();

  for (const displayedRound of roundsToRender) {
    const roundSection = document.createElement("section");
    roundSection.className = "tournament-round-section";
    roundSection.dataset.tournamentRound = String(displayedRound.roundNumber);
    const roundTitle = document.createElement("h4");
    roundTitle.textContent = `Ronde ${String(displayedRound.roundNumber)}`;
    roundSection.append(roundTitle);
    for (const match of displayedRound.matches ?? []) {
      const participantA = participantById(tournament, match.participantAId);
      const participantB =
        match.participantBId === null ? null : participantById(tournament, match.participantBId);
      const table = document.createElement("article");
      table.className = "tournament-table-card";
      table.dataset.tournamentTable = "";
      table.dataset.matchId = match.matchId;

      const label = document.createElement("span");
      label.className = "tournament-table-number";
      label.textContent =
        participantB === null ? "Exemption · victoire 2–0" : `Table ${String(match.tableNumber)}`;
      const matchup = document.createElement("strong");
      matchup.textContent =
        participantB === null
          ? (participantA?.displayName ?? "Joueur inconnu")
          : `${participantA?.displayName ?? "Joueur inconnu"} — ${participantB.displayName}`;
      const decks = document.createElement("span");
      decks.className = "tournament-table-decks";
      decks.textContent =
        participantB === null
          ? (participantA?.deck?.name ?? "Deck non renseigné")
          : `${participantA?.deck?.name ?? "Deck non renseigné"} · ${participantB.deck?.name ?? "Deck non renseigné"}`;
      table.append(label, matchup, decks);
      renderResultControls(table, tournament, match);
      roundSection.append(table);
    }
    for (const pause of displayedRound.pauses ?? []) {
      const participant = participantById(tournament, pause.participantId);
      const pauseRow = document.createElement("p");
      pauseRow.className = "tournament-round-robin-pause";
      pauseRow.dataset.roundRobinPause = "";
      pauseRow.textContent = `Pause sans point · ${participant?.displayName ?? "Joueur inconnu"}`;
      roundSection.append(pauseRow);
    }
    tableList?.append(roundSection);
  }

  for (const participant of tournament.participants ?? []) {
    if (participant.status !== "active" || tournament.status !== "active") continue;
    const row = document.createElement("div");
    row.className = "tournament-drop-row";
    row.dataset.activeParticipant = participant.participantId;
    const identity = document.createElement("span");
    identity.textContent = `${participant.displayName} · ${participant.deck.name}`;
    const reason = document.createElement("input");
    reason.type = "text";
    reason.maxLength = 240;
    reason.placeholder = "Motif de l'abandon";
    reason.setAttribute("aria-label", `Motif de l'abandon de ${participant.displayName}`);
    reason.dataset.dropReason = "";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tournament-secondary-button";
    button.dataset.dropParticipant = participant.participantId;
    button.textContent = "Enregistrer l'abandon";
    button.addEventListener("click", () => {
      void submitDropParticipant(
        tournament.tournamentId,
        participant.participantId,
        reason,
        button,
      );
    });
    row.append(identity, reason, button);
    dropList?.append(row);
  }
  if (participantActions) participantActions.hidden = tournament.status !== "active";
  renderKeyCardEditors(tournament);

  for (const standing of tournament.standings ?? []) {
    const participant = participantById(tournament, standing.participantId);
    const row = document.createElement("tr");
    row.dataset.tournamentStanding = "";

    const rankCell = document.createElement("td");
    rankCell.textContent = String(standing.competitiveRank);

    const playerCell = document.createElement("td");
    playerCell.textContent = participant?.displayName ?? "Joueur inconnu";

    const deckCell = document.createElement("td");
    const hasDeckCards = (participant?.deck?.cards?.length ?? 0) > 0;
    if (hasDeckCards) {
      const deckBtn = document.createElement("button");
      deckBtn.type = "button";
      deckBtn.className = "tournament-standing-deck-btn";
      deckBtn.textContent = `🃏 ${participant?.deck?.name ?? "Deck"}`;
      deckBtn.title = "Consulter le deck (vue mana curve 17Lands)";
      deckBtn.setAttribute("aria-label", `Voir le deck de ${participant?.displayName}`);
      deckBtn.addEventListener("click", () => {
        void openTournamentDeckModal({
          participant,
          isReadOnly: tournament.status === "completed",
        });
      });
      deckCell.append(deckBtn);
    } else {
      deckCell.textContent = participant?.deck?.name ?? "Deck non renseigné";
    }

    const matchPointsCell = document.createElement("td");
    matchPointsCell.textContent = String(standing.matchPoints);

    const omwCell = document.createElement("td");
    omwCell.textContent = formatPercentage(standing.opponentsMatchWinPercentage);

    const gwpCell = document.createElement("td");
    gwpCell.textContent = formatPercentage(standing.gameWinPercentage);

    const ogwCell = document.createElement("td");
    ogwCell.textContent = formatPercentage(standing.opponentsGameWinPercentage);

    row.append(rankCell, playerCell, deckCell, matchPointsCell, omwCell, gwpCell, ogwCell);
    standingsBody?.append(row);
  }

  if (nextRound instanceof HTMLButtonElement) {
    nextRound.hidden =
      tournament.status !== "active" ||
      tournament.rounds.length >= (tournament.plannedRoundCount ?? Number.POSITIVE_INFINITY);
  }
  if (complete instanceof HTMLButtonElement) {
    complete.hidden =
      tournament.status !== "active" ||
      !tournament.rounds.every(({ status }) => status === "completed") ||
      tournament.rounds.length !== tournament.plannedRoundCount;
  }
}

function renderTournament(tournament) {
  tournamentUi.selectedTournament = tournament;
  const editor = element("tournament-editor");
  const createPanel = element("tournament-create-panel");
  const welcome = element("tournament-welcome");
  if (editor) editor.hidden = false;
  if (createPanel) createPanel.hidden = true;
  if (welcome) welcome.hidden = true;

  const title = element("tournament-editor-title");
  if (title) title.textContent = tournament.name;
  const dateEl = element("tournament-editor-date");
  if (dateEl) {
    const formatted = formatTournamentDate(tournament.createdAt);
    dateEl.textContent = formatted ? `📅 ${formatted}` : "";
  }
  const status = element("tournament-current-status");
  if (status) {
    status.textContent = statusLabel(tournament.status);
    status.className = `tournament-status tournament-status-${tournament.status}`;
  }
  const setupForm = element("tournament-setup-form");
  const roundView = element("tournament-round-view");
  if (setupForm) setupForm.hidden = tournament.status !== "preparation";
  if (roundView) roundView.hidden = tournament.status === "preparation";
  const name = element("tournament-name");
  if (name instanceof HTMLInputElement) {
    name.value = tournament.name;
    const isAutoName =
      tournamentUi.cubes.some(
        (c) =>
          generateTournamentName(c.cubeKey, c.cubeName, tournament.createdAt) === tournament.name ||
          generateTournamentName(c.cubeKey, c.cubeName) === tournament.name,
      ) ||
      tournament.name === generateTournamentName(null, null, tournament.createdAt) ||
      tournament.name === generateTournamentName(null, null);
    name.dataset.autoGenerated = isAutoName ? "true" : "false";
  }
  const cube = element("tournament-cube");
  if (cube instanceof HTMLSelectElement) cube.value = tournament.cube?.cubeKey ?? "";
  const format = element("tournament-format");
  if (format instanceof HTMLSelectElement) format.value = tournament.format ?? "swiss";
  const roundCount = element("tournament-round-count");
  if (roundCount instanceof HTMLInputElement) {
    roundCount.value = String(tournament.plannedRoundCount ?? 3);
  }

  const list = element("tournament-player-list");
  list?.replaceChildren();
  for (const participant of tournament.participants ?? []) appendPlayer(participant);
  while ((list?.children.length ?? 0) < 2) appendPlayer();
  const start = element("tournament-start");
  if (start instanceof HTMLButtonElement) {
    start.hidden =
      tournament.status !== "preparation" ||
      tournament.cube === null ||
      tournament.participants.length < 2;
  }
  const cancelBtn = element("tournament-cancel-btn");
  if (cancelBtn instanceof HTMLButtonElement) {
    cancelBtn.hidden = tournament.status === "completed";
  }
  updateRoundRobinRoundCount();
  if (tournament.status !== "preparation") renderRound(tournament);
}

async function openTournament(tournamentId) {
  clearFeedback();
  setLoading(true);
  try {
    const body = await readResponse(
      await fetch(`/api/tournaments/${encodeURIComponent(tournamentId)}`),
    );
    renderTournament(body.tournament);
  } catch (error) {
    showFeedback(
      error instanceof Error ? error.message : "Tournoi inaccessible.",
      "error",
      error instanceof TournamentRequestError,
    );
  } finally {
    setLoading(false);
  }
}

function readParticipantRows() {
  return [...document.querySelectorAll("[data-tournament-player-row]")].map((row) => {
    const playerInput = row.querySelector("[data-player-name]");
    const deckInput = row.querySelector("[data-deck-name]");
    const displayName = playerInput instanceof HTMLInputElement ? playerInput.value.trim() : "";
    if (displayName) {
      saveOccasionalMagicien(displayName);
    }
    const deckCards = row._deckData?.cards ?? [];
    const basicLands = row._deckData?.basicLands ?? {};
    return {
      participantId: row.dataset.participantId || null,
      displayName,
      deckName: deckInput instanceof HTMLInputElement ? deckInput.value.trim() : "",
      deckCards,
      basicLands,
    };
  });
}

async function submitCreation(event) {
  event.preventDefault();
  clearFeedback();
  const input = element("tournament-create-name");
  const createCubeSelect = element("tournament-create-cube");
  const submit = element("tournament-create-submit");
  if (!(input instanceof HTMLInputElement) || !input.value.trim()) return;
  const chosenCubeKey = createCubeSelect instanceof HTMLSelectElement ? createCubeSelect.value : "";
  setBusy(submit, true, "Création…");
  try {
    const body = await readResponse(
      await fetch("/api/tournaments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": createRequestId("create-tournament"),
        },
        body: JSON.stringify({ name: input.value.trim() }),
      }),
    );
    renderTournament(body.tournament);
    if (chosenCubeKey) {
      const editorCubeSelect = element("tournament-cube");
      if (editorCubeSelect instanceof HTMLSelectElement) {
        editorCubeSelect.value = chosenCubeKey;
      }
    }
    if (createCubeSelect instanceof HTMLSelectElement) {
      createCubeSelect.value = "";
    }
    input.value = "";
    await refreshHistory();
    showFeedback("Tournoi créé. Ajoutez les joueurs et choisissez le cube.");
  } catch (error) {
    showFeedback(error instanceof Error ? error.message : "Création impossible.", "error");
  } finally {
    setBusy(submit, false, "");
  }
}

async function submitSetup(event) {
  event.preventDefault();
  clearFeedback();
  const tournament = tournamentUi.selectedTournament;
  const name = element("tournament-name");
  const cube = element("tournament-cube");
  const format = element("tournament-format");
  const roundCount = element("tournament-round-count");
  const submit = element("tournament-setup-submit");
  if (
    !tournament ||
    !(name instanceof HTMLInputElement) ||
    !(cube instanceof HTMLSelectElement) ||
    !(format instanceof HTMLSelectElement) ||
    !(roundCount instanceof HTMLInputElement)
  ) {
    return;
  }
  setBusy(submit, true, "Enregistrement…");
  try {
    const body = await readResponse(
      await fetch(`/api/tournaments/${encodeURIComponent(tournament.tournamentId)}/setup`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": createRequestId("setup-tournament"),
        },
        body: JSON.stringify({
          expectedRevision: tournament.revision,
          name: name.value.trim(),
          cubeKey: cube.value,
          format: format.value,
          plannedRoundCount: Number(roundCount.value),
          participants: readParticipantRows(),
        }),
      }),
    );
    renderTournament(body.tournament);
    await refreshHistory();
    showFeedback("Configuration enregistrée. Le tournoi est prêt à être lancé.");
  } catch (error) {
    showFeedback(error instanceof Error ? error.message : "Enregistrement impossible.", "error");
  } finally {
    setBusy(submit, false, "");
  }
}

async function submitMatchResult(tournamentId, matchId, form, submit) {
  clearFeedback();
  const tournament = tournamentUi.selectedTournament;
  const kind = form.querySelector("[data-result-kind]");
  const gamesWonA = form.querySelector("[data-games-won-a]");
  const gamesWonB = form.querySelector("[data-games-won-b]");
  const drawnGames = form.querySelector("[data-drawn-games]");
  const reason = form.querySelector("[data-result-reason]");
  if (
    !tournament ||
    tournament.tournamentId !== tournamentId ||
    !(kind instanceof HTMLSelectElement) ||
    !(gamesWonA instanceof HTMLInputElement) ||
    !(gamesWonB instanceof HTMLInputElement) ||
    !(drawnGames instanceof HTMLInputElement) ||
    !(reason instanceof HTMLInputElement)
  ) {
    return;
  }
  setBusy(submit, true, "Confirmation…");
  try {
    const body = await readResponse(
      await fetch(
        `/api/tournaments/${encodeURIComponent(tournamentId)}/matches/${encodeURIComponent(matchId)}/result`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": createRequestId("record-match-result"),
          },
          body: JSON.stringify({
            expectedRevision: tournament.revision,
            kind: kind.value,
            gamesWonA: Number(gamesWonA.value),
            gamesWonB: Number(gamesWonB.value),
            drawnGames: Number(drawnGames.value),
            ...(reason.value.trim() ? { reason: reason.value.trim() } : {}),
          }),
        },
      ),
    );
    renderTournament(body.tournament);
    await refreshHistory();
    showFeedback("Résultat enregistré et classement recalculé.");
  } catch (error) {
    const isRevisionConflict =
      error instanceof TournamentRequestError && error.code === "REVISION_CONFLICT";
    showFeedback(
      error instanceof Error ? error.message : "Le résultat n'a pas pu être enregistré.",
      "error",
      isRevisionConflict,
    );
  } finally {
    setBusy(submit, false, "");
  }
}

async function submitDropParticipant(tournamentId, participantId, reason, button) {
  clearFeedback();
  const tournament = tournamentUi.selectedTournament;
  if (!tournament || tournament.tournamentId !== tournamentId || !reason.value.trim()) {
    showFeedback("Le motif de l'abandon est obligatoire.", "error");
    return;
  }
  setBusy(button, true, "Enregistrement…");
  try {
    const body = await readResponse(
      await fetch(
        `/api/tournaments/${encodeURIComponent(tournamentId)}/participants/${encodeURIComponent(participantId)}/drop`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": createRequestId("drop-participant"),
          },
          body: JSON.stringify({
            expectedRevision: tournament.revision,
            reason: reason.value.trim(),
          }),
        },
      ),
    );
    renderTournament(body.tournament);
    await refreshHistory();
    showFeedback("Abandon enregistré. Les appariements publiés sont conservés.");
  } catch (error) {
    const isRevisionConflict =
      error instanceof TournamentRequestError && error.code === "REVISION_CONFLICT";
    showFeedback(
      error instanceof Error ? error.message : "L'abandon n'a pas pu être enregistré.",
      "error",
      isRevisionConflict,
    );
  } finally {
    setBusy(button, false, "");
  }
}

async function submitKeyCards(tournamentId, participantId, oracleIds, button) {
  clearFeedback();
  const tournament = tournamentUi.selectedTournament;
  if (!tournament || tournament.tournamentId !== tournamentId) return;
  setBusy(button, true, "Enregistrement…");
  try {
    const body = await readResponse(
      await fetch(
        `/api/tournaments/${encodeURIComponent(tournamentId)}/participants/${encodeURIComponent(participantId)}/key-cards`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": createRequestId("update-key-cards"),
          },
          body: JSON.stringify({ expectedRevision: tournament.revision, oracleIds }),
        },
      ),
    );
    renderTournament(body.tournament);
    await refreshHistory();
    showFeedback("Cartes clés enregistrées depuis le Snapshot du tournoi.");
  } catch (error) {
    const isRevisionConflict =
      error instanceof TournamentRequestError && error.code === "REVISION_CONFLICT";
    showFeedback(
      error instanceof Error ? error.message : "Les Cartes clés n'ont pas pu être enregistrées.",
      "error",
      isRevisionConflict,
    );
  } finally {
    setBusy(button, false, "");
  }
}

async function completeTournament() {
  clearFeedback();
  const tournament = tournamentUi.selectedTournament;
  const button = element("tournament-complete");
  if (!tournament) return;
  setBusy(button, true, "Finalisation…");
  try {
    const body = await readResponse(
      await fetch(`/api/tournaments/${encodeURIComponent(tournament.tournamentId)}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": createRequestId("complete-tournament"),
        },
        body: JSON.stringify({ expectedRevision: tournament.revision }),
      }),
    );
    renderTournament(body.tournament);
    await refreshHistory();
    showFeedback("Tournoi finalisé. Les résultats restent consultables et corrigeables.");
  } catch (error) {
    const isRevisionConflict =
      error instanceof TournamentRequestError && error.code === "REVISION_CONFLICT";
    showFeedback(
      error instanceof Error ? error.message : "Le tournoi n'a pas pu être finalisé.",
      "error",
      isRevisionConflict,
    );
  } finally {
    setBusy(button, false, "");
  }
}

async function mutateRound(action) {
  clearFeedback();
  const tournament = tournamentUi.selectedTournament;
  const button = element(action === "start" ? "tournament-start" : "tournament-next-round");
  if (!tournament) return;
  setBusy(button, true, action === "start" ? "Démarrage…" : "Publication…");
  try {
    const body = await readResponse(
      await fetch(
        `/api/tournaments/${encodeURIComponent(tournament.tournamentId)}/${action === "start" ? "start" : "rounds"}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": createRequestId(
              action === "start" ? "start-tournament" : "publish-round",
            ),
          },
          body: JSON.stringify({ expectedRevision: tournament.revision }),
        },
      ),
    );
    renderTournament(body.tournament);
    await refreshHistory();
    showFeedback(
      action === "start"
        ? "Le tournoi est lancé. La ronde 1 est publiée."
        : "Nouvelle ronde publiée.",
    );
  } catch (error) {
    const isRevisionConflict =
      error instanceof TournamentRequestError && error.code === "REVISION_CONFLICT";
    showFeedback(
      error instanceof Error ? error.message : "La ronde n'a pas pu être publiée.",
      "error",
      isRevisionConflict,
    );
  } finally {
    setBusy(button, false, "");
  }
}

function bindTournamentEvents() {
  element("tournament-new-btn")?.addEventListener("click", () => {
    clearFeedback();
    const createPanel = element("tournament-create-panel");
    const editor = element("tournament-editor");
    const welcome = element("tournament-welcome");
    if (createPanel) createPanel.hidden = false;
    if (editor) editor.hidden = true;
    if (welcome) welcome.hidden = true;
    const createCube = element("tournament-create-cube");
    const createName = element("tournament-create-name");
    if (createCube instanceof HTMLSelectElement) createCube.value = "";
    if (createName instanceof HTMLInputElement) {
      createName.value = "";
      createName.dataset.autoGenerated = "false";
    }
    createCube?.focus();
  });
  element("tournament-create-cancel")?.addEventListener("click", () => {
    const createPanel = element("tournament-create-panel");
    const welcome = element("tournament-welcome");
    if (createPanel) createPanel.hidden = true;
    if (welcome) welcome.hidden = false;
  });
  element("tournament-create-cube")?.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    const cube = tournamentUi.cubes.find((c) => c.cubeKey === target.value);
    const nameInput = element("tournament-create-name");
    if (nameInput instanceof HTMLInputElement) {
      if (cube) {
        if (!nameInput.value.trim() || nameInput.dataset.autoGenerated === "true") {
          nameInput.value = generateTournamentName(cube.cubeKey, cube.cubeName);
          nameInput.dataset.autoGenerated = "true";
        }
      } else if (nameInput.dataset.autoGenerated === "true") {
        nameInput.value = "";
        nameInput.dataset.autoGenerated = "false";
      }
    }
  });
  element("tournament-create-name")?.addEventListener("input", () => {
    const nameInput = element("tournament-create-name");
    if (nameInput instanceof HTMLInputElement) {
      nameInput.dataset.autoGenerated = "false";
    }
  });
  element("tournament-cube")?.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    const cube = tournamentUi.cubes.find((c) => c.cubeKey === target.value);
    const nameInput = element("tournament-name");
    if (nameInput instanceof HTMLInputElement && cube) {
      if (!nameInput.value.trim() || nameInput.dataset.autoGenerated === "true") {
        nameInput.value = generateTournamentName(cube.cubeKey, cube.cubeName);
        nameInput.dataset.autoGenerated = "true";
      }
    }
  });
  element("tournament-name")?.addEventListener("input", () => {
    const nameInput = element("tournament-name");
    if (nameInput instanceof HTMLInputElement) {
      nameInput.dataset.autoGenerated = "false";
    }
  });
  element("tournament-format")?.addEventListener("change", () => {
    updateRoundRobinRoundCount();
  });
  element("tournament-cancel-btn")?.addEventListener("click", async () => {
    const tournament = tournamentUi.selectedTournament;
    if (!tournament) return;
    const confirmed = window.confirm(
      `Voulez-vous vraiment annuler et supprimer le tournoi "${tournament.name}" ? Cette action est irréversible.`,
    );
    if (!confirmed) return;
    const cancelBtn = element("tournament-cancel-btn");
    if (cancelBtn instanceof HTMLButtonElement) setBusy(cancelBtn, true, "Annulation…");
    try {
      const response = await fetch(
        `/api/tournaments/${encodeURIComponent(tournament.tournamentId)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error("Impossible d'annuler le tournoi.");
      }
      tournamentUi.selectedTournament = null;
      const editor = element("tournament-editor");
      const welcome = element("tournament-welcome");
      if (editor) editor.hidden = true;
      if (welcome) welcome.hidden = false;
      await refreshHistory();
      showFeedback(`Le tournoi "${tournament.name}" a été annulé avec succès.`);
    } catch (error) {
      showFeedback(
        error instanceof Error ? error.message : "Erreur lors de l'annulation.",
        "error",
      );
    } finally {
      if (cancelBtn instanceof HTMLButtonElement)
        setBusy(cancelBtn, false, "🗑️ Annuler le tournoi");
    }
  });
  element("tournament-create-form")?.addEventListener("submit", (event) => {
    void submitCreation(event);
  });
  element("tournament-setup-form")?.addEventListener("submit", (event) => {
    void submitSetup(event);
  });
  element("tournament-add-player")?.addEventListener("click", () => appendPlayer());
  element("tournament-start")?.addEventListener("click", () => void mutateRound("start"));
  element("tournament-next-round")?.addEventListener("click", () => void mutateRound("round"));
  element("tournament-complete")?.addEventListener("click", () => void completeTournament());
  element("tournament-reload")?.addEventListener("click", () => {
    const tournamentId = tournamentUi.selectedTournament?.tournamentId;
    if (tournamentId) void openTournament(tournamentId);
    else void initTournamentManagementView();
  });
  element("tournament-deck-close-btn")?.addEventListener("click", () => closeActiveDeckModal());
  element("tournament-deck-cancel-btn")?.addEventListener("click", () => closeActiveDeckModal());
  element("tournament-deck-save-btn")?.addEventListener("click", () => void saveActiveDeckModal());
  element("tournament-deck-mtga-text")?.addEventListener("input", () => {
    activeDeckModal.mtgaTextDirty = true;
    setMtgaDeckStatus("Texte modifié : appliquez la liste pour mettre à jour la vue.", "info");
  });
  element("tournament-deck-mtga-apply")?.addEventListener("click", () => {
    void applyActiveMtgaText();
  });
  element("tournament-deck-mtga-copy")?.addEventListener("click", () => {
    void copyActiveMtgaText();
  });
  element("tournament-deck-mtga-download")?.addEventListener("click", downloadActiveMtgaText);
  element("tournament-deck-archetype-input")?.addEventListener("input", syncMtgaTextFromDeck);
  element("tournament-deck-modal-backdrop")?.addEventListener("click", (e) => {
    if (e.target === element("tournament-deck-modal-backdrop")) {
      closeActiveDeckModal();
    }
  });
  setupBasicLandSteppers();
  setupDeckCardSearch();
}

export async function initTournamentManagementView() {
  if (!tournamentUi.initialized) {
    tournamentUi.initialized = true;
    bindTournamentEvents();
  }
  clearFeedback();
  setLoading(true);
  try {
    await Promise.all([loadCubes(), refreshHistory()]);
  } catch (error) {
    showFeedback(
      error instanceof Error ? error.message : "Les tournois sont momentanément indisponibles.",
      "error",
      error instanceof TournamentRequestError,
    );
  } finally {
    setLoading(false);
  }
}
