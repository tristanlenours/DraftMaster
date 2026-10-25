// Cubes page: cube selector, comparison and cube detail panel.
import { elements, escapeHtml, state } from "./app-state.js";
import { navigateTo } from "./app.js";
import { attachHoverCardPreview, formatCostPip, hideCardPopover } from "./card-explorer.js";
import { formatFixing, formatPowerTier, openCardModal } from "./card-modal.js";
import { CUBE_FORMAT_DETAILS, CUBE_KEYS, CUBE_STRATEGIC_ADVICE } from "./cube-config.js";

// Synchronize and select active cube across Desktop table, Mobile pills, and Mobile cards
export function selectCube(cubeKey) {
  state.detailCubeKey = cubeKey;
  state.activeCubeKey = cubeKey;
  if (elements.cubeSelect) elements.cubeSelect.value = cubeKey;

  // Sync desktop comparison table tabs
  document.querySelectorAll(".btn-select-cube-tab").forEach((btn) => {
    const cube = btn.dataset.tabCube;
    btn.classList.toggle("active", cube === cubeKey);
  });

  // Sync mobile pill selector
  document.querySelectorAll(".cube-pill").forEach((pill) => {
    const cube = pill.dataset.pillCube;
    const isActive = cube === cubeKey;
    pill.classList.toggle("active", isActive);
    pill.setAttribute("aria-selected", String(isActive));
  });

  // Sync mobile synthetic cards
  document.querySelectorAll(".cube-mobile-synth-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.cubeKey === cubeKey);
  });

  renderCubeDetail(cubeKey);
}

// Render Cubes Synthetic Page & Detailed Deep Dive
export function renderCubesPage() {
  const selectedCube = state.detailCubeKey || state.activeCubeKey || CUBE_KEYS.TITOU;
  selectCube(selectedCube);
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

function buildCubeStrategicAdviceHtml(cubeKey, meta) {
  const customAdvice = CUBE_STRATEGIC_ADVICE[cubeKey];
  const advice = customAdvice || {
    title: "Présentation du Cube & Conseils Stratégiques",
    subtitle: `${meta.name || "Cube"} • Conseils d'experts pour réussir vos drafts`,
    presentation:
      meta.philosophy ||
      meta.description ||
      "Un environnement de draft optimisé où la lecture des signaux, le respect de la courbe et la synergie guident chaque décision.",
    keyFacts: [
      { label: "Taille du Cube", value: `${meta.cardCount || 360} cartes` },
      { label: "Niveau de Puissance", value: formatPowerTier(meta.powerTier) },
      {
        label: "Tour Pivot",
        value: `T${meta.fundamentalTurn?.targetTurn || 3.5} (${meta.fundamentalTurn?.criticalWindow || "T3-T4"})`,
      },
      {
        label: "Fixation de Mana",
        value: formatFixing(meta.technicalAxes?.fixingQuality || "custom"),
      },
    ],
    rulesOfDraft: [
      {
        icon: "🎯",
        title: "Identifier un Thème Porteur Dès le Pack 1",
        description:
          "Observez les cartes uncos et gold de grande valeur pour identifier rapidement la guilde ou l'archétype le plus ouvert à votre table.",
      },
      {
        icon: "💎",
        title: "Sécuriser les Terrains Bicolores Tôt",
        description:
          "Ne sous-estimez jamais les fixers de mana : ils garantissent la régularité de vos sorties et permettent d'intégrer des cartes puissantes en splash.",
      },
      {
        icon: "⚡",
        title: "Construire une Courbe Proactive",
        description:
          "Assurez-vous d'avoir des jeux percutants aux tours 2 et 3 pour ne pas vous laisser déborder lors du tour pivot du format.",
      },
      {
        icon: "🛡️",
        title: "Conserver un Quota de Gestion Réactive",
        description:
          "Gardez toujours 4 à 7 sorts d'interaction (removals, contres) pour neutraliser les moteurs et menaces décisives de vos adversaires.",
      },
    ],
    keyPackages: [],
  };

  const factsHtml = (advice.keyFacts || [])
    .map(
      (f) => `
      <div class="key-fact-pill">
        <span class="fact-label">${escapeHtml(f.label)} :</span>
        <span class="fact-val">${escapeHtml(f.value)}</span>
      </div>
    `,
    )
    .join("");

  const rulesHtml = (advice.rulesOfDraft || [])
    .map(
      (r) => `
      <div class="rule-card-item">
        <div class="rule-icon-wrap">${r.icon}</div>
        <div class="rule-content">
          <h5 class="rule-title">${escapeHtml(r.title)}</h5>
          <p class="rule-desc">${escapeHtml(r.description)}</p>
        </div>
      </div>
    `,
    )
    .join("");

  let packagesHtml = "";
  if (advice.keyPackages && advice.keyPackages.length > 0) {
    const pkgsCardsHtml = advice.keyPackages
      .map((pkg) => {
        const chipsHtml = (pkg.cards || [])
          .map((ref) => {
            const card = findCardByRef(ref);
            if (!card) {
              return `<span class="package-raw-chip">${escapeHtml(ref)}</span>`;
            }
            const score = Number.isFinite(card.powerScore?.score)
              ? Math.round(card.powerScore.score * 10) / 10
              : "";
            const pip = formatCostPip(card.manaCost, card.cmc);
            return `
              <button type="button" class="archetype-card-chip strategic-chip" data-oracle="${card.oracleId || ""}" data-name="${escapeHtml(card.name)}">
                <span class="chip-name">${escapeHtml(card.name)}</span>
                ${pip ? `<span class="chip-cost">${pip}</span>` : ""}
                ${score ? `<span class="chip-score">${score}</span>` : ""}
              </button>
            `;
          })
          .join("");

        return `
          <div class="package-card">
            <div class="package-header">
              <span class="package-tag">${escapeHtml(pkg.category || "Synergie Transversale")}</span>
              <h5 class="package-title">${escapeHtml(pkg.name)}</h5>
            </div>
            <p class="package-desc">${escapeHtml(pkg.description)}</p>
            <div class="package-chips-wrap">
              ${chipsHtml}
            </div>
          </div>
        `;
      })
      .join("");

    packagesHtml = `
      <div class="strategic-packages-wrap">
        <div class="packages-heading">
          <h4>⚡ Packages Transversaux & Moteurs Incontournables</h4>
          <p class="packages-sub">Des synergies transversales qui transcendent les couleurs uniques et définissent les parties.</p>
        </div>
        <div class="packages-grid">
          ${pkgsCardsHtml}
        </div>
      </div>
    `;
  }

  return `
    <div class="cube-strategic-section">
      <div class="strategic-section-header">
        <div class="strategic-badge-pill">📖 Présentation & Guide de Draft</div>
        <h3 class="strategic-section-title">${escapeHtml(advice.title)}</h3>
        <p class="strategic-section-subtitle">${escapeHtml(advice.subtitle)}</p>
      </div>

      <div class="strategic-overview-card">
        <div class="strategic-overview-content">
          <h4>🏛️ Présentation & Philosophie de l'Environnement</h4>
          <p class="strategic-intro-text">${escapeHtml(advice.presentation)}</p>
          <div class="strategic-key-facts">
            ${factsHtml}
          </div>
        </div>
      </div>

      <div class="strategic-rules-grid">
        <div class="strategic-rules-heading">
          <h4>🎯 Les 4 Piliers Stratégiques pour Réussir votre Draft</h4>
          <p class="rules-sub">Principes fondamentaux à garder en tête de la première pioche du Pack 1 jusqu'à la construction finale.</p>
        </div>
        <div class="rules-cards-grid">
          ${rulesHtml}
        </div>
      </div>

      ${packagesHtml}
    </div>
  `;
}

function renderCubeDetail(cubeKey) {
  state.detailCubeKey = cubeKey;
  if (!elements.cubeDetailPanel) return;

  const meta = state.cubesMeta[cubeKey];
  if (!meta) {
    elements.cubeDetailPanel.innerHTML =
      '<p class="loading-state">Chargement des analyses du Cube...</p>';
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

  const cardCount =
    meta.cardCount || (cubeKey === CUBE_KEYS.TITOU ? 545 : cubeKey === CUBE_KEYS.NICO ? 730 : 450);

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
            <button type="button" class="archetype-card-chip" data-oracle="${card.oracleId || ""}" data-name="${card.name}">
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
            <button type="button" class="archetype-card-chip support-chip" data-oracle="${card.oracleId || ""}" data-name="${card.name}">
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

  const strategicAdviceHtml = buildCubeStrategicAdviceHtml(cubeKey, meta);

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

    ${strategicAdviceHtml}

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

    attachHoverCardPreview(chip, card);
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
