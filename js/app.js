// Application Controller & Event Listeners avec SPA URL Routing & Filtres Avancés (100% Hors-Ligne)
const ROUTES_MAP = {
  "/": "explorer",
  "/cartes": "explorer",
  "/draft": "draft",
  "/deck": "deckbuilder",
  "/trophees": "trophies",
  "/records": "leaderboard",
  "/tournoi": "tournament"
};

const TAB_TO_ROUTE = {
  "explorer": "/cartes",
  "draft": "/draft",
  "deckbuilder": "/deck",
  "trophies": "/trophees",
  "leaderboard": "/records",
  "tournament": "/tournoi"
};

class App {
  constructor() {
    this.currentTab = "explorer";
    this.isAdminMode = false;
    this.searchQuery = "";
    this.filterColor = "ALL";
    this.filterType = "ALL";
    this.filterTier = "ALL";
    this.pendingCubeChange = null;
  }

  init() {
    this.setupEventListeners();
    draftEngine.initDraft();
    leaderboard.render();
    achievements.render();
    
    // Détection de la route initiale
    const path = window.location.pathname.toLowerCase().replace(/\/$/, "");
    const initialTab = ROUTES_MAP[path] || "explorer";
    this.switchTab(initialTab, false);
  }

  setupEventListeners() {
    // Navigation par onglets (Desktop & Mobile Bottom Nav)
    document.querySelectorAll(".nav-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const targetTab = btn.getAttribute("data-tab");
        if (targetTab) {
          this.switchTab(targetTab, true);
        }
      });
    });

    // Écouteur de retour/avant navigateur (SPA History)
    window.addEventListener("popstate", () => {
      const path = window.location.pathname.toLowerCase().replace(/\/$/, "");
      const targetTab = ROUTES_MAP[path] || "explorer";
      this.switchTab(targetTab, false);
    });

    // Sélecteur des 6 Cubes Fixes (avec modal de confirmation si draft en cours)
    const selectCube = document.getElementById("select-cube-preset");
    if (selectCube) {
      selectCube.addEventListener("change", (e) => {
        const newCubeId = e.target.value;
        if (draftEngine.state === "drafting") {
          this.pendingCubeChange = newCubeId;
          selectCube.value = draftEngine.currentCubeId; // Conserver l'ancien tant que non confirmé
          const modal = document.getElementById("modal-change-cube");
          if (modal) modal.style.display = "flex";
        } else {
          draftEngine.loadCube(newCubeId);
          this.renderCubeExplorer(this.searchQuery);
        }
      });
    }

    // Toggle Mode Admin (Édition Méta dans l'Explorateur)
    const toggleAdmin = document.getElementById("toggle-admin-mode");
    if (toggleAdmin) {
      toggleAdmin.addEventListener("change", (e) => {
        this.isAdminMode = e.target.checked;
        const exportTools = document.getElementById("admin-export-tools");
        const modifiedBadge = document.getElementById("admin-modified-badge");
        if (exportTools) exportTools.style.display = this.isAdminMode ? "flex" : "none";
        if (modifiedBadge) modifiedBadge.style.display = this.isAdminMode ? "inline-block" : "none";
        this.renderCubeExplorer(this.searchQuery);
        showToast(this.isAdminMode ? "⚙️ Mode Admin activé : Éditez les Tiers & Commentaires" : "Mode Lecture activé");
      });
    }

    // Filtre du Mur des Records par Cube
    const filterLeaderboard = document.getElementById("leaderboard-cube-filter");
    if (filterLeaderboard) {
      filterLeaderboard.addEventListener("change", (e) => {
        leaderboard.filterCube = e.target.value;
        leaderboard.render();
      });
    }

    // Filtre couleur Draft
    const colorFilter = document.getElementById("draft-color-filter");
    if (colorFilter) {
      colorFilter.addEventListener("change", (e) => {
        draftEngine.filterColor = e.target.value;
        draftEngine.render();
      });
    }

    // Recherche dans l'explorateur de Cube
    const searchInput = document.getElementById("cube-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value;
        this.renderCubeExplorer(this.searchQuery);
      });
    }

    // Filtres Rapides Explorateur : Couleurs
    document.querySelectorAll("#filter-color-group .filter-pill").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#filter-color-group .filter-pill").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.filterColor = btn.getAttribute("data-filter-color") || "ALL";
        this.renderCubeExplorer(this.searchQuery);
      });
    });

    // Filtres Rapides Explorateur : Types de Cartes
    document.querySelectorAll("#filter-type-group .filter-pill").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#filter-type-group .filter-pill").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.filterType = btn.getAttribute("data-filter-type") || "ALL";
        this.renderCubeExplorer(this.searchQuery);
      });
    });

    // Filtres Rapides Explorateur : Tiers de Puissance
    document.querySelectorAll("#filter-tier-group .filter-pill").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#filter-tier-group .filter-pill").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.filterTier = btn.getAttribute("data-filter-tier") || "ALL";
        this.renderCubeExplorer(this.searchQuery);
      });
    });

    // Raccourcis clavier (Entrée pour confirmer pick, 1-9 pour sélectionner)
    window.addEventListener("keydown", (e) => {
      if (this.currentTab === "draft" && draftEngine.state === "drafting") {
        if (e.key === "Enter" || e.key === " ") {
          if (draftEngine.selectedCardIndex !== null && draftEngine.selectedCardIndex !== undefined) {
            e.preventDefault();
            draftEngine.confirmPick();
          }
        } else if (e.key >= "1" && e.key <= "9") {
          const idx = parseInt(e.key) - 1;
          const currentPack = draftEngine.activePacks[0] || [];
          if (idx < currentPack.length) {
            draftEngine.selectCard(idx);
          }
        }
      }
    });
  }

  resetExplorerFilters() {
    this.searchQuery = "";
    this.filterColor = "ALL";
    this.filterType = "ALL";
    this.filterTier = "ALL";

    // Réinitialiser les classes actives des boutons de filtres
    document.querySelectorAll("#filter-color-group .filter-pill").forEach((b, i) => b.classList.toggle("active", i === 0));
    document.querySelectorAll("#filter-type-group .filter-pill").forEach((b, i) => b.classList.toggle("active", i === 0));
    document.querySelectorAll("#filter-tier-group .filter-pill").forEach((b, i) => b.classList.toggle("active", i === 0));

    const searchInput = document.getElementById("cube-search-input");
    if (searchInput) searchInput.value = "";

    this.renderCubeExplorer("");
  }

  cancelChangeCube() {
    const modal = document.getElementById("modal-change-cube");
    if (modal) modal.style.display = "none";
    this.pendingCubeChange = null;
  }

  confirmChangeCube() {
    const modal = document.getElementById("modal-change-cube");
    if (modal) modal.style.display = "none";

    if (this.pendingCubeChange) {
      const selectCube = document.getElementById("select-cube-preset");
      if (selectCube) selectCube.value = this.pendingCubeChange;
      
      draftEngine.resetToLobby();
      draftEngine.loadCube(this.pendingCubeChange);
      this.renderCubeExplorer(this.searchQuery);
      showToast("🔄 Session réinitialisée sur le nouveau Cube");
      this.pendingCubeChange = null;
    }
  }

  switchTab(tabId, updateHistory = true) {
    this.currentTab = tabId;
    document.querySelectorAll(".nav-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
    });
    document.querySelectorAll(".tab-content").forEach(content => {
      content.classList.toggle("active", content.id === `tab-${tabId}`);
    });

    if (updateHistory) {
      const routePath = TAB_TO_ROUTE[tabId] || "/cartes";
      if (tabId === "draft") {
        const fullUrl = `${routePath}?session=${draftEngine.sessionId}`;
        window.history.pushState(null, "", fullUrl);
      } else {
        window.history.pushState(null, "", routePath);
      }
    }

    if (tabId === "explorer") {
      this.renderCubeExplorer(this.searchQuery);
    } else if (tabId === "draft") {
      draftEngine.render();
    } else if (tabId === "tournament") {
      tournament.render();
    } else if (tabId === "leaderboard") {
      leaderboard.render();
    } else if (tabId === "deckbuilder") {
      deckbuilder.render();
    } else if (tabId === "trophies") {
      achievements.render();
    }
  }

  saveCardFromExplorer(cubeId, cardName, cleanId) {
    const tierEl = document.getElementById(`exp-tier-${cleanId}`);
    const commEl = document.getElementById(`exp-comm-${cleanId}`);
    if (tierEl && commEl && adminStudio) {
      adminStudio.saveCardOverride(cubeId, cardName, tierEl.value, commEl.value);
      this.renderCubeExplorer(this.searchQuery);
    }
  }

  resetCardFromExplorer(cubeId, cardName) {
    if (adminStudio) {
      adminStudio.resetCardOverride(cubeId, cardName);
      this.renderCubeExplorer(this.searchQuery);
    }
  }

  renderCubeExplorer(query = "") {
    const explorerGrid = document.getElementById("explorer-grid");
    if (!explorerGrid) return;

    const currentCubeId = draftEngine.currentCubeId;
    const currentCubeEntry = CUBES_STATIC_DB[currentCubeId] || CUBES_STATIC_DB.peasant_360;
    const currentPool = currentCubeEntry.cards;
    const q = query.toLowerCase().trim();

    const filtered = currentPool.filter(c => {
      const eff = adminStudio ? adminStudio.getEffectiveCard(c, currentCubeId) : c;

      // 1. Filtre Texte de recherche (Nom, Commentaire, Type, Couleur)
      if (q) {
        const matchName = eff.name.toLowerCase().includes(q);
        const matchComment = eff.comment && eff.comment.toLowerCase().includes(q);
        const matchType = eff.type && eff.type.toLowerCase().includes(q);
        const matchColor = eff.color && eff.color.toLowerCase().includes(q);
        if (!matchName && !matchComment && !matchType && !matchColor) return false;
      }

      // 2. Filtre Couleur
      if (this.filterColor !== "ALL") {
        if (this.filterColor === "Terrain") {
          const isLand = eff.color === "Terrain" || (eff.type && eff.type.toLowerCase().includes("land"));
          if (!isLand) return false;
        } else if (eff.color !== this.filterColor) {
          return false;
        }
      }

      // 3. Filtre Type de Carte
      if (this.filterType !== "ALL") {
        const typeLow = (eff.type || "").toLowerCase();
        const targetLow = this.filterType.toLowerCase();
        if (!typeLow.includes(targetLow)) return false;
      }

      // 4. Filtre Tier de Puissance
      if (this.filterTier !== "ALL") {
        if (eff.tier !== this.filterTier) return false;
      }

      return true;
    });

    const hasActiveFilters = q || this.filterColor !== "ALL" || this.filterType !== "ALL" || this.filterTier !== "ALL";
    const resetBtn = document.getElementById("btn-reset-filters");
    if (resetBtn) resetBtn.style.display = hasActiveFilters ? "inline-block" : "none";

    const overrideCount = Object.keys(adminStudio ? adminStudio.overrides : {}).filter(k => k.startsWith(currentCubeId + ":")).length;
    const modBadge = document.getElementById("admin-modified-badge");
    if (modBadge) {
      modBadge.textContent = `${overrideCount} modifiée(s) manuellement`;
      modBadge.style.display = this.isAdminMode ? "inline-block" : (overrideCount > 0 ? "inline-block" : "none");
    }

    const countEl = document.getElementById("explorer-count");
    if (countEl) {
      countEl.textContent = `${filtered.length} / ${currentPool.length} cartes (${currentCubeEntry.name})`;
    }

    if (filtered.length === 0) {
      explorerGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align:center; padding:40px 20px; background:var(--bg-secondary); border-radius:var(--radius-lg); border:1px solid var(--border-color)">
          <div style="font-size:36px; margin-bottom:10px">🔍</div>
          <h3 style="font-size:16px; margin-bottom:6px">Aucune carte ne correspond à ces critères</h3>
          <p style="color:var(--text-muted); font-size:12px; margin-bottom:14px">Essayez de modifier vos filtres de couleur, de type ou de tier.</p>
          <button onclick="app.resetExplorerFilters()" class="btn-primary" style="padding:6px 14px; font-size:12px">
            ✕ Réinitialiser les filtres
          </button>
        </div>
      `;
      return;
    }

    explorerGrid.innerHTML = filtered.map((c, idx) => {
      const eff = adminStudio ? adminStudio.getEffectiveCard(c, currentCubeId) : c;
      const isOverridden = adminStudio ? !!adminStudio.overrides[`${currentCubeId}:${c.name}`] : false;
      const safeName = eff.name.replace(/'/g, "\\'");
      const cleanId = eff.name.replace(/[^a-zA-Z0-9]/g, '_');

      return `
        <div class="draft-card ${isOverridden ? 'is-custom-card' : ''}" style="cursor:default">
          <div class="card-img-wrapper" id="exp-wrap-${idx}">
            <div class="card-tier-badge tier-${eff.tier}">Tier ${eff.tier}</div>
            <img src="${eff.image}" alt="${eff.name}" class="card-img" loading="lazy" onerror="this.onerror=null; this.src='https://api.scryfall.com/cards/named?fuzzy=' + encodeURIComponent('${safeName}') + '&format=image'; document.getElementById('exp-wrap-${idx}')?.classList.add('fallback-frame');" />
          </div>
          <div class="card-info">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div class="card-name">${eff.name}</div>
            </div>
            
            <div class="card-meta" style="margin-bottom:4px">
              <span>${eff.color || 'Carte'} • CMC ${eff.cmc}</span>
              ${isOverridden ? `<span style="font-size:10px;background:#8b5cf6;color:#fff;padding:1px 5px;border-radius:4px;font-weight:700">✏️ Modifié</span>` : ''}
            </div>

            ${this.isAdminMode ? `
              <!-- Mode Admin : Contrôles d'Édition Inline -->
              <div style="background:rgba(139, 92, 246, 0.1);border:1px solid rgba(139, 92, 246, 0.3);padding:6px;border-radius:4px;margin-top:6px">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:4px">
                  <select id="exp-tier-${cleanId}" style="background:var(--bg-primary);color:var(--text-main);border:1px solid var(--border-color);padding:3px 6px;border-radius:4px;font-size:11px;font-weight:700">
                    <option value="S" ${eff.tier === 'S' ? 'selected' : ''}>Tier S (Bombe)</option>
                    <option value="A" ${eff.tier === 'A' ? 'selected' : ''}>Tier A (Staple)</option>
                    <option value="B" ${eff.tier === 'B' ? 'selected' : ''}>Tier B (Solide)</option>
                    <option value="C" ${eff.tier === 'C' ? 'selected' : ''}>Tier C (Soutien)</option>
                    <option value="D" ${eff.tier === 'D' ? 'selected' : ''}>Tier D (Filler/Niche)</option>
                  </select>
                  <div style="display:flex;gap:4px">
                    <button onclick="app.saveCardFromExplorer('${currentCubeId}', '${safeName}', '${cleanId}')" title="Sauvegarder" style="background:#8b5cf6;color:#fff;border:none;padding:3px 8px;border-radius:4px;font-size:11px;cursor:pointer;font-weight:700">💾</button>
                    ${isOverridden ? `<button onclick="app.resetCardFromExplorer('${currentCubeId}', '${safeName}')" title="Réinitialiser" style="background:#374151;color:#f87171;border:none;padding:3px 6px;border-radius:4px;font-size:11px;cursor:pointer">🔄</button>` : ''}
                  </div>
                </div>
                <input type="text" id="exp-comm-${cleanId}" value="${eff.comment ? eff.comment.replace(/"/g, '&quot;') : ''}" placeholder="Conseil stratégique & synergie..." style="width:100%;margin-top:4px;background:var(--bg-primary);color:var(--text-main);border:1px solid var(--border-color);padding:4px 6px;border-radius:4px;font-size:11px" />
              </div>
            ` : `
              <!-- Mode Lecture : Commentaire -->
              ${eff.comment ? `<div class="card-comment" style="font-size:11px;margin-top:4px">${eff.comment}</div>` : ''}
            `}
          </div>
        </div>
      `;
    }).join("");
  }
}

function showToast(message) {
  const toast = document.getElementById("toast-notification");
  if (toast) {
    toast.textContent = message;
    toast.style.display = "flex";
    setTimeout(() => {
      toast.style.display = "none";
    }, 3000);
  }
}

const app = new App();
window.addEventListener("DOMContentLoaded", () => app.init());
