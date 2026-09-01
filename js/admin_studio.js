// Module Admin Studio : Personnalisation manuelle des Tiers (S/A/B/C/D) & Trophées Spécifiques
class AdminStudio {
  constructor() {
    this.storageKey = "mtg_card_overrides_v1";
    this.overrides = this.loadOverrides();
    this.searchQuery = "";
    this.activeAdminSubTab = "cards"; // "cards" ou "trophies"
  }

  loadOverrides() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  }

  saveOverrides() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.overrides));
  }

  getEffectiveCard(card, cubeId) {
    const key = `${cubeId}:${card.name}`;
    const globalKey = `ALL:${card.name}`;
    const custom = this.overrides[key] || this.overrides[globalKey];
    if (custom) {
      return {
        ...card,
        tier: custom.tier || card.tier,
        comment: custom.comment !== undefined ? custom.comment : card.comment,
        isCustomized: true
      };
    }
    return card;
  }

  saveCardOverride(cubeId, cardName, newTier, newComment) {
    const key = `${cubeId}:${cardName}`;

    this.overrides[key] = {
      tier: newTier,
      comment: newComment.trim(),
      updatedAt: new Date().toISOString()
    };
    this.saveOverrides();

    const cubeEntry = CUBES_STATIC_DB[cubeId];
    if (cubeEntry) {
      const card = cubeEntry.cards.find(c => c.name === cardName);
      if (card) {
        card.tier = newTier;
        card.comment = newComment.trim();
        card.isCustomized = true;
      }
    }

    showToast(`✓ ${cardName} mis à jour : Tier ${newTier}`);
    this.render();
    if (app.currentTab === "explorer") app.renderCubeExplorer();
  }

  resetCardOverride(cubeId, cardName) {
    const key = `${cubeId}:${cardName}`;
    delete this.overrides[key];
    this.saveOverrides();

    showToast(`🔄 Carte réinitialisée : ${cardName}`);
    this.render();
  }

  exportOverridesJSON() {
    const exportData = {
      cardOverrides: this.overrides,
      customTrophies: achievements.customTrophies,
      exportedAt: new Date().toISOString()
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `mtg_cube_meta_and_trophies_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("💾 Configuration Admin exportée en JSON !");
  }

  importOverridesJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (imported.cardOverrides) {
          this.overrides = { ...this.overrides, ...imported.cardOverrides };
          this.saveOverrides();
        }
        if (imported.customTrophies) {
          achievements.customTrophies = [...achievements.customTrophies, ...imported.customTrophies];
          achievements.saveCustomTrophies();
        }
        showToast("✓ Données Admin importées avec succès !");
        this.render();
      } catch (err) {
        alert("Erreur lors de l'import JSON : " + err);
      }
    };
    reader.readAsText(file);
  }

  switchSubTab(subTab) {
    this.activeAdminSubTab = subTab;
    document.querySelectorAll(".admin-subnav-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-admin-tab") === subTab);
    });
    const cardsSection = document.getElementById("admin-section-cards");
    const trophiesSection = document.getElementById("admin-section-trophies");

    if (cardsSection) cardsSection.style.display = subTab === "cards" ? "block" : "none";
    if (trophiesSection) trophiesSection.style.display = subTab === "trophies" ? "block" : "none";

    this.render();
  }

  render() {
    if (this.activeAdminSubTab === "cards") {
      this.renderCardsTab();
    } else {
      this.renderTrophiesTab();
    }
  }

  renderCardsTab() {
    const container = document.getElementById("admin-cards-list");
    if (!container) return;

    const currentCubeId = draftEngine.currentCubeId;
    const cubeEntry = CUBES_STATIC_DB[currentCubeId] || CUBES_STATIC_DB.peasant_360;
    const cards = cubeEntry.cards;
    const q = this.searchQuery.toLowerCase().trim();

    const filtered = cards.filter(c => 
      !q || c.name.toLowerCase().includes(q) || (c.comment && c.comment.toLowerCase().includes(q))
    );

    const overrideCount = Object.keys(this.overrides).filter(k => k.startsWith(currentCubeId + ":")).length;
    const countEl = document.getElementById("admin-overrides-count");
    if (countEl) countEl.textContent = `${overrideCount} carte(s) personnalisée(s) sur ce Cube`;

    container.innerHTML = filtered.slice(0, 50).map(c => {
      const eff = this.getEffectiveCard(c, currentCubeId);
      const isOverridden = !!this.overrides[`${currentCubeId}:${c.name}`];
      const safeName = eff.name.replace(/'/g, "\\'");
      const cleanId = eff.name.replace(/[^a-zA-Z0-9]/g, '_');

      return `
        <div class="admin-card-row ${isOverridden ? 'is-custom' : ''}">
          <div style="display:flex;align-items:center;gap:12px;width:240px">
            <img src="${eff.image}" alt="${eff.name}" style="width:40px;height:56px;object-fit:cover;border-radius:4px" loading="lazy" />
            <div>
              <div style="font-weight:700;font-size:13px">${eff.name}</div>
              <div style="font-size:11px;color:var(--text-muted)">${eff.type} • CMC ${eff.cmc}</div>
              ${isOverridden ? `<span style="font-size:10px;background:#8b5cf6;color:#fff;padding:1px 4px;border-radius:3px">Custom Tier</span>` : ''}
            </div>
          </div>

          <div style="display:flex;align-items:center;gap:8px">
            <label style="font-size:12px;font-weight:700;color:var(--text-muted)">Tier :</label>
            <select id="admin-tier-${cleanId}" style="background:var(--bg-primary);color:var(--text-main);border:1px solid var(--border-color);padding:5px 8px;border-radius:4px;font-size:12px;font-weight:700">
              <option value="S" ${eff.tier === 'S' ? 'selected' : ''}>Tier S (Bombe)</option>
              <option value="A" ${eff.tier === 'A' ? 'selected' : ''}>Tier A (Staple)</option>
              <option value="B" ${eff.tier === 'B' ? 'selected' : ''}>Tier B (Solide)</option>
              <option value="C" ${eff.tier === 'C' ? 'selected' : ''}>Tier C (Soutien)</option>
              <option value="D" ${eff.tier === 'D' ? 'selected' : ''}>Tier D (Filler/Niche)</option>
            </select>
          </div>

          <div style="flex:1;min-width:200px">
            <input type="text" id="admin-comment-${cleanId}" value="${eff.comment ? eff.comment.replace(/"/g, '&quot;') : ''}" placeholder="Conseil tactique / synergie..." style="width:100%;background:var(--bg-primary);color:var(--text-main);border:1px solid var(--border-color);padding:6px 10px;border-radius:4px;font-size:12px" />
          </div>

          <div style="display:flex;gap:6px">
            <button class="btn-primary" onclick="adminStudio.saveFromRow('${currentCubeId}', '${safeName}')" style="padding:6px 12px;font-size:11px">
              💾 Sauver
            </button>
            ${isOverridden ? `
              <button onclick="adminStudio.resetCardOverride('${currentCubeId}', '${safeName}')" style="background:#374151;color:#f87171;border:none;padding:6px 8px;border-radius:4px;font-size:11px;cursor:pointer">
                🔄 Reset
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join("") || `<div style="padding:20px;text-align:center;color:var(--text-muted)">Aucune carte trouvée.</div>`;
  }

  renderTrophiesTab() {
    const container = document.getElementById("admin-trophies-list");
    if (!container) return;

    const all = achievements.getAllTrophies();

    container.innerHTML = all.map(t => `
      <div class="admin-card-row ${t.isCustom ? 'is-custom' : ''}">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:26px">${t.icon}</span>
          <div>
            <div style="font-weight:700;font-size:13px">${t.title} ${t.isCustom ? '<span style="font-size:10px;background:#8b5cf6;color:#fff;padding:1px 4px;border-radius:3px">Custom</span>' : ''}</div>
            <div style="font-size:11px;color:var(--text-muted)">${t.desc}</div>
            <div style="font-size:10px;color:var(--accent-gold);font-weight:700">Scope : ${t.scope === 'ALL' ? '🌟 Universel' : `🎴 ${t.scope}`} • +${t.xp} XP</div>
          </div>
        </div>

        <div>
          ${t.isCustom ? `
            <button onclick="achievements.deleteCustomTrophy('${t.id}')" style="background:#374151;color:#f87171;border:none;padding:6px 10px;border-radius:4px;font-size:11px;cursor:pointer">
              🗑️ Supprimer
            </button>
          ` : `
            <span style="font-size:11px;color:var(--text-muted)">🔒 Trophée Système</span>
          `}
        </div>
      </div>
    `).join("");
  }

  saveFromRow(cubeId, cardName) {
    const cleanId = cardName.replace(/[^a-zA-Z0-9]/g, '_');
    const tierEl = document.getElementById(`admin-tier-${cleanId}`);
    const commentEl = document.getElementById(`admin-comment-${cleanId}`);

    if (tierEl && commentEl) {
      this.saveCardOverride(cubeId, cardName, tierEl.value, commentEl.value);
    }
  }

  handleCreateTrophyForm(e) {
    e.preventDefault();
    const title = document.getElementById("new-trophy-title").value;
    const icon = document.getElementById("new-trophy-icon").value;
    const scope = document.getElementById("new-trophy-scope").value;
    const desc = document.getElementById("new-trophy-desc").value;
    const xp = document.getElementById("new-trophy-xp").value;
    const ruleType = document.getElementById("new-trophy-ruletype").value;
    const threshold = document.getElementById("new-trophy-threshold").value;
    const keywords = document.getElementById("new-trophy-keywords").value;

    achievements.addCustomTrophy({
      title,
      icon,
      scope,
      desc,
      xp,
      ruleType,
      threshold,
      keywords,
      targetType: ruleType === "type_count" ? keywords : ""
    });

    document.getElementById("form-create-trophy").reset();
  }
}

const adminStudio = new AdminStudio();
