import { loadImageWithFallback } from "./card-image.js";
import {
  getCardDisplayName,
  getCardImageFallbackUrl,
  getCardImageUrl,
  readCardLanguage,
} from "./card-language.js";

const RESUME_TOKEN_KEY = "draftmaster_multiplayer_resume_token";
const PARTICIPANT_ID_KEY = "draftmaster_multiplayer_participant_id";
const POLL_INTERVAL_MS = 1_000;

const cubeLabels = {
  titou_tribal: "Titou — Tribal & Chromatic",
  nico_candyshop: "Nico — Vintage Candyshop",
  hugues_pauper: "Hugues — Pauper",
  cedric_cube: "Cédric — High Power",
  titou_arena_peasant_plus: "Titou — Arena Peasant+",
};

const friendBotNames = [
  "Big Nixos",
  "Cédric Bot",
  "Hugues Bot",
  "Rémi Bot",
  "Papayou Bot",
  "Ivan Bot",
  "Titou Bot",
  "Le Rockeur",
];

let initialized = false;
let currentLobby = null;
let currentPlayerState = null;
let selectedCardInstanceId = null;
let pollTimer = null;
let editingDeckIds = new Set();
let editingBasicLands = { Plains: 0, Island: 0, Swamp: 0, Mountain: 0, Forest: 0 };
let editingWorkspaceRevision = null;

function getElements() {
  return {
    joinPanel: document.getElementById("multi-join-panel"),
    playerName: document.getElementById("multi-player-name"),
    cubeSelect: document.getElementById("multi-cube-select"),
    joinButton: document.getElementById("multi-join-btn"),
    feedback: document.getElementById("multi-feedback"),
    status: document.getElementById("multi-lobby-status"),
    cubeName: document.getElementById("multi-cube-name"),
    cubeLock: document.getElementById("multi-cube-lock"),
    participants: document.getElementById("multi-participants"),
    waiting: document.getElementById("multi-waiting-message"),
    resumePanel: document.getElementById("multi-resume-panel"),
    resumeCode: document.getElementById("multi-resume-code"),
    copyResume: document.getElementById("multi-copy-resume"),
    readyButton: document.getElementById("multi-ready-btn"),
    leaveButton: document.getElementById("multi-leave-btn"),
    draftPanel: document.getElementById("multi-draft-panel"),
    roundTitle: document.getElementById("multi-round-title"),
    poolCount: document.getElementById("multi-pool-count"),
    roundWaiting: document.getElementById("multi-round-waiting"),
    booster: document.getElementById("multi-current-booster"),
    draftedPool: document.getElementById("multi-drafted-pool"),
    confirmPick: document.getElementById("multi-confirm-pick"),
    abandonDraft: document.getElementById("multi-abandon-draft"),
    importCode: document.getElementById("multi-import-code"),
    importResume: document.getElementById("multi-import-resume"),
    deckWorkshop: document.getElementById("multi-deck-workshop"),
    deckCount: document.getElementById("multi-deck-count"),
    deckLegality: document.getElementById("multi-deck-legality"),
    recommendDeck: document.getElementById("multi-recommend-deck"),
    coachSummary: document.getElementById("multi-coach-summary"),
    coachStrategy: document.getElementById("multi-coach-strategy"),
    coachMana: document.getElementById("multi-coach-mana"),
    coachRadar: document.getElementById("multi-coach-radar"),
    includedReasons: document.getElementById("multi-included-reasons"),
    excludedReasons: document.getElementById("multi-excluded-reasons"),
    deckCards: document.getElementById("multi-deck-cards"),
    sideboardCards: document.getElementById("multi-sideboard-cards"),
    landRationale: document.getElementById("multi-land-rationale"),
    analyzeDeck: document.getElementById("multi-analyze-deck"),
    finalizeDeck: document.getElementById("multi-finalize-deck"),
    exportActions: document.getElementById("multi-export-actions"),
    copyExport: document.getElementById("multi-copy-export"),
    downloadExport: document.getElementById("multi-download-export"),
  };
}

function showFeedback(message, isError = false) {
  const { feedback } = getElements();
  if (!feedback) return;
  feedback.textContent = message;
  feedback.classList.toggle("is-error", isError);
  feedback.hidden = message.length === 0;
}

function renderSeats(container, lobby) {
  container.replaceChildren();
  let pendingBotIndex = 0;
  lobby.seats.forEach((seat, index) => {
    const item = document.createElement("li");
    const seatKind = seat?.kind ?? "pending-bot";
    item.className = `multi-seat is-${seatKind}`;
    const seatNumber = document.createElement("span");
    seatNumber.className = "multi-seat-number";
    seatNumber.textContent = String(index + 1);
    const label = document.createElement("span");
    label.className = "multi-seat-label";
    if (seat?.kind === "human") {
      label.textContent = `${seat.displayName} • ${seat.ready ? "prêt" : "pas prêt"}`;
    } else if (seat?.kind === "bot") {
      label.textContent = `${seat.displayName} • bot prêt`;
    } else {
      label.textContent = `${friendBotNames[pendingBotIndex++] ?? "Friend-Bot"} • rejoint au départ`;
    }
    item.append(seatNumber, label);
    container.append(item);
  });
}

function renderLobby(lobby) {
  currentLobby = lobby;
  const elements = getElements();
  const storedToken = localStorage.getItem(RESUME_TOKEN_KEY);
  const storedParticipantId = localStorage.getItem(PARTICIPANT_ID_KEY);
  const isParticipant = lobby.participants.some(
    (participant) => participant.participantId === storedParticipantId,
  );
  const currentParticipant = lobby.participants.find(
    (participant) => participant.participantId === storedParticipantId,
  );
  const isEmpty = lobby.participants.length === 0;
  const canChangeCube = isParticipant && lobby.participants.length === 1 && !lobby.cubeLocked;

  if (elements.status) {
    elements.status.textContent =
      lobby.status === "drafting"
        ? "Draft en cours"
        : `${String(lobby.participants.length)}/8 amis`;
    elements.status.classList.toggle("is-busy", lobby.status === "drafting");
  }
  if (elements.cubeName) {
    elements.cubeName.textContent = lobby.cubeKey
      ? (cubeLabels[lobby.cubeKey] ?? lobby.cubeKey)
      : "À choisir par le premier joueur";
  }
  if (elements.cubeLock) {
    elements.cubeLock.textContent = lobby.cubeLocked
      ? "Cube verrouillé pour ce groupe"
      : isEmpty
        ? "Le premier joueur choisit le cube"
        : "Modifiable tant que vous restez seul";
  }
  if (elements.participants) renderSeats(elements.participants, lobby);
  if (elements.waiting) {
    elements.waiting.textContent =
      lobby.status === "drafting"
        ? "Une partie est en cours. Le prochain Salon ouvrira après les 45 choix."
        : lobby.participants.length < 2
          ? "En attente d'au moins un autre ami. Aucun chrono : retrouvez-vous sur Discord."
          : "Le groupe est formé. La confirmation Prêt arrive à l'étape suivante.";
  }
  if (elements.cubeSelect) {
    if (!canChangeCube) delete elements.cubeSelect.dataset.userSelected;
    if (lobby.cubeKey && elements.cubeSelect.dataset.userSelected !== "true") {
      elements.cubeSelect.value = lobby.cubeKey;
    }
    elements.cubeSelect.disabled = (!isEmpty && !canChangeCube) || lobby.status !== "open";
  }
  if (elements.joinButton) {
    elements.joinButton.textContent = canChangeCube ? "Changer le cube" : "Rejoindre le draft";
    elements.joinButton.disabled =
      lobby.status !== "open" || (!canChangeCube && lobby.participants.length >= 8);
  }
  if (elements.playerName) {
    if (currentParticipant) elements.playerName.value = currentParticipant.displayName;
    elements.playerName.disabled = isParticipant;
  }
  if (elements.joinPanel) {
    elements.joinPanel.hidden = isParticipant && !canChangeCube;
  }
  if (elements.resumePanel && elements.resumeCode) {
    elements.resumePanel.hidden = !(isParticipant && storedToken);
    elements.resumeCode.value = isParticipant && storedToken ? storedToken : "";
  }
  if (elements.readyButton) {
    elements.readyButton.hidden = !isParticipant || lobby.status !== "open";
    elements.readyButton.disabled = lobby.participants.length < 2;
    elements.readyButton.textContent = currentParticipant?.ready
      ? "Annuler mon accord"
      : "Je suis prêt";
  }
  if (elements.leaveButton) {
    elements.leaveButton.hidden = !isParticipant || lobby.status !== "open";
  }
  if (isParticipant && lobby.status === "drafting") {
    void refreshPlayerState();
  } else if (currentPlayerState?.status === "deckbuilding") {
    void refreshPlayerState();
  } else if (elements.draftPanel) {
    elements.draftPanel.hidden = true;
  }
}

function getBasicLandInputs() {
  return Object.fromEntries(
    ["Plains", "Island", "Swamp", "Mountain", "Forest"].map((name) => [
      name,
      document.getElementById(`multi-basic-${name}`),
    ]),
  );
}

function renderReasonList(container, reasons, cardsById) {
  if (!container) return;
  container.replaceChildren();
  for (const entry of reasons ?? []) {
    const item = document.createElement("li");
    const names = entry.cardInstanceIds.map((id) => cardsById.get(id)?.name ?? id);
    item.textContent = `${names.join(" + ")} — ${entry.reason}`;
    container.append(item);
  }
}

function makeDeckCardButton(card, selected) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "multi-deck-card";
  button.textContent = card.name;
  button.setAttribute(
    "aria-label",
    selected ? `Retirer ${card.name} du deck` : `Ajouter ${card.name} au deck`,
  );
  button.addEventListener("click", () => {
    if (selected) editingDeckIds.delete(card.instanceId);
    else editingDeckIds.add(card.instanceId);
    renderDeckWorkshop(currentPlayerState);
  });
  return button;
}

function renderDeckWorkshop(playerState) {
  const elements = getElements();
  const workspace = playerState?.deckWorkspace;
  if (elements.deckWorkshop) elements.deckWorkshop.hidden = playerState?.status !== "deckbuilding";
  if (playerState?.status !== "deckbuilding") return;

  if (workspace && editingWorkspaceRevision !== workspace.revision) {
    editingDeckIds = new Set(workspace.maindeckCardInstanceIds);
    editingBasicLands = { ...workspace.basicLands };
    editingWorkspaceRevision = workspace.revision;
  }
  const basicInputs = getBasicLandInputs();
  for (const [name, input] of Object.entries(basicInputs)) {
    if (input) input.value = String(editingBasicLands[name] ?? 0);
  }
  const basicCount = Object.values(editingBasicLands).reduce((sum, count) => sum + count, 0);
  const totalCount = editingDeckIds.size + basicCount;
  if (elements.deckCount) elements.deckCount.textContent = `${String(totalCount)} / 40`;
  if (elements.deckLegality) {
    elements.deckLegality.textContent =
      totalCount === 40
        ? "Liste de 40 cartes prête pour la validation locale."
        : `Ajoutez ou retirez ${String(Math.abs(40 - totalCount))} carte${Math.abs(40 - totalCount) > 1 ? "s" : ""}.`;
  }
  if (elements.finalizeDeck) elements.finalizeDeck.disabled = totalCount !== 40;
  if (elements.analyzeDeck) elements.analyzeDeck.disabled = totalCount > 40;
  if (elements.exportActions) elements.exportActions.hidden = workspace?.status !== "finalized";

  const cardsById = new Map(playerState.pool.map((card) => [card.instanceId, card]));
  if (elements.deckCards && elements.sideboardCards) {
    elements.deckCards.replaceChildren();
    elements.sideboardCards.replaceChildren();
    for (const card of playerState.pool) {
      const selected = editingDeckIds.has(card.instanceId);
      (selected ? elements.deckCards : elements.sideboardCards).append(
        makeDeckCardButton(card, selected),
      );
    }
  }

  const recommendation = workspace?.recommendation;
  if (elements.coachSummary) elements.coachSummary.hidden = !recommendation;
  if (recommendation) {
    if (elements.coachStrategy) {
      elements.coachStrategy.textContent = `${recommendation.strategy} • ${recommendation.primaryColors.join("/") || "Incolore"}${recommendation.splashColors.length ? ` • Splash ${recommendation.splashColors.join("/")}` : ""}`;
    }
    if (elements.coachMana) {
      elements.coachMana.textContent = `${recommendation.manaRationale} ${recommendation.landCountRationale} Source : ${recommendation.provider} (${recommendation.source}).`;
    }
    if (elements.coachRadar) {
      elements.coachRadar.replaceChildren();
      for (const [axis, score] of Object.entries(workspace.evaluation.radar)) {
        const term = document.createElement("dt");
        term.textContent = axis;
        const value = document.createElement("dd");
        value.textContent = String(Math.round(score));
        elements.coachRadar.append(term, value);
      }
    }
    renderReasonList(elements.includedReasons, recommendation.includedReasons, cardsById);
    renderReasonList(elements.excludedReasons, recommendation.excludedReasons, cardsById);
  }
}

function renderPlayerState(playerState) {
  const elements = getElements();
  const roundKey = `${String(playerState.packNumber)}:${String(playerState.pickNumber)}`;
  const previousRoundKey = currentPlayerState
    ? `${String(currentPlayerState.packNumber)}:${String(currentPlayerState.pickNumber)}`
    : null;
  if (roundKey !== previousRoundKey) selectedCardInstanceId = null;
  currentPlayerState = playerState;
  if (elements.draftPanel) elements.draftPanel.hidden = false;
  if (elements.roundTitle) {
    elements.roundTitle.textContent =
      playerState.status === "deckbuilding"
        ? "Draft terminé • Construction du deck"
        : `Pack ${String(playerState.packNumber)} • Choix ${String(playerState.pickNumber)}`;
  }
  if (elements.poolCount) {
    elements.poolCount.textContent = `${String(playerState.pool.length)} carte${playerState.pool.length > 1 ? "s" : ""}`;
  }
  if (elements.roundWaiting) {
    elements.roundWaiting.textContent =
      playerState.status === "deckbuilding"
        ? "Vos 45 cartes sont prêtes pour la construction du deck."
        : playerState.pickSubmitted
          ? `Choix confirmé. En attente de : ${playerState.waitingFor.join(", ") || "personne"}.`
          : "Prenez votre temps : aucun chrono et aucun choix automatique.";
  }
  if (elements.booster) {
    const language = readCardLanguage();
    const boosterSignature = `${language}:${String(playerState.pickSubmitted)}:${selectedCardInstanceId ?? ""}:${playerState.currentBooster.map(({ instanceId }) => instanceId).join(",")}`;
    if (elements.booster.dataset.signature !== boosterSignature) {
      elements.booster.dataset.signature = boosterSignature;
      elements.booster.replaceChildren();
      for (const card of playerState.currentBooster) {
        const displayName = getCardDisplayName(card, language);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "multi-booster-card";
        button.dataset.instanceId = card.instanceId;
        button.title = displayName;
        button.setAttribute("aria-label", `Choisir ${displayName}`);
        button.disabled = playerState.pickSubmitted;
        button.classList.toggle("is-selected", card.instanceId === selectedCardInstanceId);
        const image = document.createElement("img");
        image.alt = displayName;
        image.loading = "lazy";
        loadImageWithFallback(
          image,
          getCardImageUrl(card, language),
          getCardImageFallbackUrl(card, language),
        );
        const name = document.createElement("span");
        name.textContent = displayName;
        button.append(image, name);
        button.addEventListener("click", () => {
          selectedCardInstanceId = card.instanceId;
          renderPlayerState(currentPlayerState);
        });
        elements.booster.append(button);
      }
    }
  }
  if (elements.draftedPool) {
    const language = readCardLanguage();
    const poolSignature = `${language}:${playerState.pool.map(({ instanceId }) => instanceId).join(",")}`;
    if (elements.draftedPool.dataset.signature !== poolSignature) {
      elements.draftedPool.dataset.signature = poolSignature;
      elements.draftedPool.replaceChildren();
      for (const card of playerState.pool) {
        const displayName = getCardDisplayName(card, language);
        const item = document.createElement("div");
        item.className = "multi-pool-card";
        item.title = displayName;
        const image = document.createElement("img");
        image.alt = displayName;
        image.loading = "lazy";
        loadImageWithFallback(
          image,
          getCardImageUrl(card, language),
          getCardImageFallbackUrl(card, language),
        );
        item.append(image);
        elements.draftedPool.append(item);
      }
    }
  }
  if (elements.confirmPick) {
    elements.confirmPick.hidden = playerState.status !== "drafting";
    elements.confirmPick.disabled = playerState.pickSubmitted || !selectedCardInstanceId;
  }
  if (elements.abandonDraft) {
    elements.abandonDraft.hidden = playerState.status !== "drafting";
  }
  renderDeckWorkshop(playerState);
}

async function refreshPlayerState(silent = false) {
  const resumeToken = localStorage.getItem(RESUME_TOKEN_KEY);
  if (!resumeToken) return;
  try {
    const response = await fetch("/api/multiplayer/state", {
      cache: "no-store",
      headers: { Authorization: `Bearer ${resumeToken}` },
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error?.message ?? "Session indisponible.");
    }
    renderPlayerState(payload.state);
  } catch (error) {
    if (!silent) {
      showFeedback(error instanceof Error ? error.message : "Session indisponible.", true);
    }
  }
}

async function refreshLobby() {
  try {
    const response = await fetch("/api/multiplayer/lobby", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error?.message ?? "Salon indisponible");
    }
    renderLobby(payload.state);
  } catch (error) {
    showFeedback(error instanceof Error ? error.message : "Salon indisponible", true);
  }
}

async function joinLobby() {
  const elements = getElements();
  const participantId = localStorage.getItem(PARTICIPANT_ID_KEY);
  const isParticipant = currentLobby?.participants.some(
    (participant) => participant.participantId === participantId,
  );
  if (isParticipant) {
    await changeCube();
    return;
  }
  const playerName = elements.playerName?.value.trim() ?? "";
  if (!playerName || !currentLobby) {
    showFeedback("Choisissez un nom avant de rejoindre le Salon.", true);
    return;
  }
  elements.joinButton.disabled = true;
  showFeedback("");
  try {
    const response = await fetch("/api/multiplayer/lobby/join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        playerName,
        expectedRevision: currentLobby.revision,
        ...(currentLobby.participants.length === 0 ? { cubeKey: elements.cubeSelect?.value } : {}),
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error?.message ?? "Impossible de rejoindre le Salon.");
    }
    localStorage.setItem(RESUME_TOKEN_KEY, payload.resumeToken);
    localStorage.setItem(PARTICIPANT_ID_KEY, payload.participantId);
    renderLobby(payload.state);
    showFeedback("Vous avez rejoint le Salon.");
  } catch (error) {
    showFeedback(
      error instanceof Error ? error.message : "Impossible de rejoindre le Salon.",
      true,
    );
    await refreshLobby();
  } finally {
    if (elements.joinButton) elements.joinButton.disabled = false;
  }
}

async function changeCube() {
  const elements = getElements();
  const resumeToken = localStorage.getItem(RESUME_TOKEN_KEY);
  const cubeKey = elements.cubeSelect?.value;
  if (!resumeToken || !cubeKey || !currentLobby) return;
  elements.joinButton.disabled = true;
  showFeedback("");
  try {
    const response = await fetch("/api/multiplayer/lobby/cube", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resumeToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({ cubeKey, expectedRevision: currentLobby.revision }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error?.message ?? "Impossible de changer le cube.");
    }
    renderLobby(payload.state);
    delete elements.cubeSelect.dataset.userSelected;
    showFeedback("Le cube du Salon a été mis à jour.");
  } catch (error) {
    showFeedback(error instanceof Error ? error.message : "Impossible de changer le cube.", true);
    await refreshLobby();
  } finally {
    if (elements.joinButton) elements.joinButton.disabled = false;
  }
}

async function copyResumeCode() {
  const { resumeCode, copyResume } = getElements();
  if (!resumeCode?.value) return;
  await navigator.clipboard.writeText(resumeCode.value);
  if (copyResume) {
    copyResume.textContent = "Copié ✓";
    window.setTimeout(() => {
      copyResume.textContent = "Copier le code";
    }, 1_500);
  }
}

async function setReady() {
  const elements = getElements();
  const resumeToken = localStorage.getItem(RESUME_TOKEN_KEY);
  const participantId = localStorage.getItem(PARTICIPANT_ID_KEY);
  const participant = currentLobby?.participants.find(
    (candidate) => candidate.participantId === participantId,
  );
  if (!resumeToken || !participant || !currentLobby) return;
  elements.readyButton.disabled = true;
  showFeedback("");
  try {
    const response = await fetch("/api/multiplayer/ready", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resumeToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        ready: !participant.ready,
        expectedRevision: currentLobby.revision,
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error?.message ?? "Impossible de confirmer votre accord.");
    }
    renderLobby(payload.state);
  } catch (error) {
    showFeedback(
      error instanceof Error ? error.message : "Impossible de confirmer votre accord.",
      true,
    );
    await refreshLobby();
  }
}

async function leaveLobby() {
  const elements = getElements();
  const resumeToken = localStorage.getItem(RESUME_TOKEN_KEY);
  if (!resumeToken || !currentLobby) return;
  elements.leaveButton.disabled = true;
  showFeedback("");
  try {
    const response = await fetch("/api/multiplayer/lobby/leave", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resumeToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({ expectedRevision: currentLobby.revision }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error?.message ?? "Impossible de quitter le Salon.");
    }
    localStorage.removeItem(RESUME_TOKEN_KEY);
    localStorage.removeItem(PARTICIPANT_ID_KEY);
    currentPlayerState = null;
    selectedCardInstanceId = null;
    renderLobby(payload.state);
    showFeedback("Vous avez quitté le Salon.");
  } catch (error) {
    showFeedback(error instanceof Error ? error.message : "Impossible de quitter le Salon.", true);
    await refreshLobby();
  } finally {
    if (elements.leaveButton) elements.leaveButton.disabled = false;
  }
}

async function confirmPick() {
  const resumeToken = localStorage.getItem(RESUME_TOKEN_KEY);
  if (!resumeToken || !currentPlayerState || !selectedCardInstanceId) return;
  const elements = getElements();
  elements.confirmPick.disabled = true;
  try {
    const response = await fetch("/api/multiplayer/pick", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resumeToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        cardInstanceId: selectedCardInstanceId,
        expectedRevision: currentPlayerState.revision,
        packNumber: currentPlayerState.packNumber,
        pickNumber: currentPlayerState.pickNumber,
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error?.message ?? "Impossible de confirmer ce choix.");
    }
    renderPlayerState(payload.state);
    await refreshLobby();
  } catch (error) {
    showFeedback(
      error instanceof Error ? error.message : "Impossible de confirmer ce choix.",
      true,
    );
    await refreshPlayerState();
  }
}

async function recommendDeck() {
  const resumeToken = localStorage.getItem(RESUME_TOKEN_KEY);
  const elements = getElements();
  if (!resumeToken || !currentPlayerState) return;
  elements.recommendDeck.disabled = true;
  showFeedback("Le Coach analyse les 45 cartes…");
  try {
    const response = await fetch("/api/multiplayer/deck/recommend", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resumeToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({ expectedRevision: currentPlayerState.revision }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error?.message ?? "Le Coach n'a pas pu proposer de liste.");
    }
    editingWorkspaceRevision = null;
    await refreshPlayerState();
    showFeedback(
      payload.workspace.recommendation.source === "external"
        ? "Recommandation Gemini/DeepSeek validée localement."
        : "Recommandation locale prête : le Coach externe était indisponible ou invalide.",
    );
  } catch (error) {
    showFeedback(error instanceof Error ? error.message : "Coach indisponible.", true);
    await refreshPlayerState(true);
  } finally {
    if (elements.recommendDeck) elements.recommendDeck.disabled = false;
  }
}

function updateBasicLand(name, value) {
  editingBasicLands = {
    ...editingBasicLands,
    [name]: Math.max(0, Number.parseInt(value, 10) || 0),
  };
  renderDeckWorkshop(currentPlayerState);
}

async function saveDeck(finalize) {
  const resumeToken = localStorage.getItem(RESUME_TOKEN_KEY);
  const elements = getElements();
  if (!resumeToken || !currentPlayerState) return;
  const button = finalize ? elements.finalizeDeck : elements.analyzeDeck;
  if (button) button.disabled = true;
  try {
    const response = await fetch("/api/multiplayer/deck", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${resumeToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        expectedRevision: currentPlayerState.revision,
        maindeckCardInstanceIds: [...editingDeckIds],
        basicLands: editingBasicLands,
        finalize,
        landCountRationale: elements.landRationale?.value.trim() || undefined,
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error?.message ?? "La Liste n'a pas pu être validée.");
    }
    editingWorkspaceRevision = null;
    await refreshPlayerState();
    showFeedback(finalize ? "Liste finale verrouillée et prête pour MTGA." : "Analyse recalculée.");
  } catch (error) {
    showFeedback(error instanceof Error ? error.message : "Validation impossible.", true);
    await refreshPlayerState(true);
  } finally {
    renderDeckWorkshop(currentPlayerState);
  }
}

async function fetchMtgaExport() {
  const resumeToken = localStorage.getItem(RESUME_TOKEN_KEY);
  if (!resumeToken) throw new Error("Code de reprise manquant.");
  const response = await fetch("/api/multiplayer/deck/export.mtga", {
    cache: "no-store",
    headers: { Authorization: `Bearer ${resumeToken}` },
  });
  if (!response.ok) {
    const payload = await response.json();
    const incompatibleCards = payload.error?.details?.incompatibleCards;
    const detail = Array.isArray(incompatibleCards)
      ? incompatibleCards
          .map((card) => `${card.name ?? card.cardInstanceId}: ${card.reason ?? "incompatible"}`)
          .join(" ; ")
      : "";
    throw new Error(
      `${payload.error?.message ?? "Export MTGA incompatible."}${detail ? ` ${detail}` : ""}`,
    );
  }
  return response.text();
}

async function copyMtgaExport() {
  try {
    await navigator.clipboard.writeText(await fetchMtgaExport());
    showFeedback("Liste MTGA copiée.");
  } catch (error) {
    showFeedback(error instanceof Error ? error.message : "Copie impossible.", true);
  }
}

async function downloadMtgaExport() {
  try {
    const text = await fetchMtgaExport();
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "draftmaster-deck.mtga.txt";
    anchor.click();
    URL.revokeObjectURL(url);
    showFeedback("Liste MTGA téléchargée.");
  } catch (error) {
    showFeedback(error instanceof Error ? error.message : "Téléchargement impossible.", true);
  }
}

async function resumeWithCode() {
  const elements = getElements();
  const resumeToken = elements.importCode?.value.trim();
  if (!resumeToken) {
    showFeedback("Collez votre code privé pour reprendre le siège.", true);
    return;
  }
  try {
    const response = await fetch("/api/multiplayer/state", {
      cache: "no-store",
      headers: { Authorization: `Bearer ${resumeToken}` },
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error?.message ?? "Ce code de reprise est invalide.");
    }
    localStorage.setItem(RESUME_TOKEN_KEY, resumeToken);
    localStorage.setItem(PARTICIPANT_ID_KEY, payload.state.participantId);
    renderPlayerState(payload.state);
    await refreshLobby();
    showFeedback("Siège repris sur cet appareil.");
  } catch (error) {
    showFeedback(error instanceof Error ? error.message : "Ce code de reprise est invalide.", true);
  }
}

async function abandonDraft() {
  const resumeToken = localStorage.getItem(RESUME_TOKEN_KEY);
  if (
    !resumeToken ||
    !currentPlayerState ||
    !window.confirm(
      "Abandonner ce draft pour tout le groupe ? Les choix ne seront pas réutilisés et le Salon sera libéré.",
    )
  ) {
    return;
  }
  try {
    const response = await fetch("/api/multiplayer/abandon", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resumeToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({ expectedRevision: currentPlayerState.revision, confirmed: true }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error?.message ?? "Impossible d'abandonner cette Session.");
    }
    localStorage.removeItem(RESUME_TOKEN_KEY);
    localStorage.removeItem(PARTICIPANT_ID_KEY);
    currentPlayerState = null;
    selectedCardInstanceId = null;
    renderLobby(payload.state);
    showFeedback("Draft abandonné. Le Salon est prêt pour un nouveau groupe.");
  } catch (error) {
    showFeedback(error instanceof Error ? error.message : "Impossible d'abandonner.", true);
  }
}

export function initMultiplayerDraftView() {
  if (!initialized) {
    initialized = true;
    getElements().joinButton?.addEventListener("click", () => void joinLobby());
    getElements().cubeSelect?.addEventListener("change", (event) => {
      event.currentTarget.dataset.userSelected = "true";
    });
    getElements().copyResume?.addEventListener("click", () => void copyResumeCode());
    getElements().readyButton?.addEventListener("click", () => void setReady());
    getElements().leaveButton?.addEventListener("click", () => void leaveLobby());
    getElements().confirmPick?.addEventListener("click", () => void confirmPick());
    getElements().importResume?.addEventListener("click", () => void resumeWithCode());
    getElements().abandonDraft?.addEventListener("click", () => void abandonDraft());
    getElements().recommendDeck?.addEventListener("click", () => void recommendDeck());
    getElements().analyzeDeck?.addEventListener("click", () => void saveDeck(false));
    getElements().finalizeDeck?.addEventListener("click", () => void saveDeck(true));
    getElements().copyExport?.addEventListener("click", () => void copyMtgaExport());
    getElements().downloadExport?.addEventListener("click", () => void downloadMtgaExport());
    for (const [name, input] of Object.entries(getBasicLandInputs())) {
      input?.addEventListener("input", (event) => updateBasicLand(name, event.target.value));
    }
  }
  void refreshLobby();
  if (localStorage.getItem(RESUME_TOKEN_KEY)) void refreshPlayerState(true);
  if (pollTimer === null) {
    pollTimer = window.setInterval(() => void refreshLobby(), POLL_INTERVAL_MS);
  }
}
