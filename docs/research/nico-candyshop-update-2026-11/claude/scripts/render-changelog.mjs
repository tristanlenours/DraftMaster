// Renders the full slot-by-slot change list (Markdown + CSV) from diff-oracle-level.json and ai-benchmark-v5.json.
import fs from 'node:fs';
const [dir] = process.argv.slice(2);
const d = JSON.parse(fs.readFileSync(dir + '/data/diff-oracle-level.json', 'utf8'));
const b = JSON.parse(fs.readFileSync(dir + '/data/ai-benchmark-v5.json', 'utf8'));
const front = (n) => n.split(' // ')[0];
const by = {}; for (const c of [...d.added, ...d.removed]) by[front(c.name)] = c;
const aiAdd = new Set([...b.mb.map((m) => front(m.name)), ...b.up.map((u) => front(u.sug))]);
const aiCut = new Set([...b.mb.flatMap((m) => m.replaces), ...b.up.map((u) => u.target)].map(front));
const cmc = (c) => c.cmc ?? (c.name.startsWith('Ugin') ? 7 : 3);
const typ = (c) => (c.type && c.type !== 'undefined' ? c.type : c.name.startsWith('Ugin') ? 'Legendary Planeswalker — Ugin' : 'Creature — Human Soldier');
const bucket = (c) => { const t = typ(c).split(' // ')[0]; if (/\bLand\b/.test(t) && !/Creature/.test(t)) return 'Terrains'; if (c.ci === 'C') return 'Incolore'; if (c.ci.length > 1) return 'Multicolore'; return { W: 'Blanc', U: 'Bleu', B: 'Noir', R: 'Rouge', G: 'Vert' }[c.ci]; };
const label = (c) => `${front(c.name)}${c.flavor && c.flavor !== front(c.name) ? ` _(${c.flavor})_` : ''}`;
const meta = (c) => `${cmc(c)} · ${typ(c).split(' // ')[0].replace(/Legendary /, 'Leg. ')} · ${c.firstYear}${c.firstSet ? ' ' + String(c.firstSet).toUpperCase() : ''}`;
const rows = [];
for (const o of d.ops) {
  if (!['swap', 'edit-swap', 'add', 'remove'].includes(o.op)) continue;
  if (o.op === 'edit-swap' && front(o.out) === front(o.in)) continue;
  const a = o.out ? by[front(o.out)] : null, c = o.in ? by[front(o.in)] : null;
  rows.push({ ver: o.ver, op: o.op, out: o.out ? front(o.out) : '', in: o.in ? front(o.in) : '', a, c, transientOut: o.out && !a, transientIn: o.in && !c });
}
const groups = {};
for (const r of rows) { const k = r.a ? bucket(r.a) : r.c ? bucket(r.c) : 'Allers-retours'; (groups[k] = groups[k] || []).push(r); }
const order = ['Blanc', 'Bleu', 'Noir', 'Rouge', 'Vert', 'Multicolore', 'Incolore', 'Terrains', 'Allers-retours'];
let md = `# Journal complet de la mise à jour du cube de Nico (CubeCobra 1nxrs)\n\n`;
md += `Base : ${d.baseline.date.slice(0, 10)} (${d.baseline.count} cartes) → état : ${d.current.date.slice(0, 10)} (${d.current.count} cartes). Session de mise à jour : 2026-11-17 20:14 → 2026-11-18 10:31 UTC, versions v0 à v44 du changelog.\n\n`;
md += `**Bilan net (par oracle)** : ${d.added.length} cartes sorties, ${d.added.length} cartes entrées (≈${Math.round((100 * d.added.length) / d.current.count)} % du cube).\n\n`;
md += `Opérations brutes : ${d.tally.swap} swaps, ${d.tally.add} ajouts, ${d.tally.remove} retraits, ${d.tally['edit-swap']} edits changeant de carte, ${d.tally.printing} changements d'impression (cosmétiques : flavor names Secret Lair/UB, langue, foil), ${d.tally.meta} edits de métadonnées.\n\n`;
md += `Légende IA : 🎯 = carte présente dans la maybeboard IA v5 ou les upgrades (ajout prédit) · ✂️ = carte ciblée comme sortie par l'IA v5. Colonne « v » = numéro de version CubeCobra où la ligne a été faite (0 = premier batch).\n\n`;
md += `Les allers-retours (cartes entrées puis ressorties pendant la session) sont regroupés à la fin.\n\n`;
for (const k of order) {
  const g = groups[k]; if (!g) continue;
  md += `## ${k} (${g.length} lignes)\n\n| v | Sort | Entre | Sort (cmc · type · année) | Entre (cmc · type · année) |\n|---|---|---|---|---|\n`;
  for (const r of g) {
    const o = r.a ? `${aiCut.has(r.out) ? '✂️ ' : ''}${label(r.a)}` : r.out ? `_${r.out}_ (transitoire)` : '—';
    const i = r.c ? `${aiAdd.has(r.in) ? '🎯 ' : ''}${label(r.c)}` : r.in ? `_${r.in}_ (transitoire)` : '—';
    md += `| ${r.ver} | ${o} | ${i} | ${r.a ? meta(r.a) : ''} | ${r.c ? meta(r.c) : ''} |\n`;
  }
  md += '\n';
}
md += `## Notes sur les allers-retours\n\n- **Orcish Lumberjack** : déjà dans le cube ; un 2e exemplaire a remplacé Burning-Tree Emissary (v7) puis a été retiré (v16). Net : Burning-Tree Emissary sort sans remplaçant direct.\n- **Shifting Woodland** : sortie pour Vibrance (v12), remise en ajout (v41). Net : inchangée.\n- **Deathrite Shaman** : sorti pour Brightglass Gearhulk (v19), revenu à la place de Booster Tutor (v41). Net : inchangé ; c'est Phyrexian Fleshgorger qui sort au final.\n- **Booster Tutor** (carte Un-set) : testé v39, retiré v41.\n- **Sire of Seven Deaths** : remplace Karn, Legacy Reforged (v29) puis retiré (v40). Net : Karn sort sans remplaçant direct.\n- **Edits « carte → carte »** : la plupart sont des flavor names (ex. Umezawa's Jitte affiché « Cloud's Buster Sword », Toxic Deluge « Merciless Poisoning », Bristly Bill « Man-Thing », Staff of the Storyteller « Yuna's Sending Staff », Manamorphose « Ororo Borealis », Toski « Sandy Cheeks »). Ce ne sont pas des changements de jeu.\n`;
fs.writeFileSync(dir + '/01-journal-complet-des-changements.md', md);
const csv = ['version;operation;sortie;entree;sortie_cmc;sortie_type;sortie_annee;sortie_elo;entree_cmc;entree_type;entree_annee;entree_set;entree_elo;entree_flavor_name;ia_ajout_predit;ia_sortie_predite'];
for (const r of rows) csv.push([r.ver, r.op, r.out, r.in, r.a ? cmc(r.a) : '', r.a ? typ(r.a) : '', r.a?.firstYear ?? '', r.a?.elo ?? '', r.c ? cmc(r.c) : '', r.c ? typ(r.c) : '', r.c?.firstYear ?? '', r.c?.firstSet ?? '', r.c?.elo ?? '', r.c?.flavor ?? '', r.in && aiAdd.has(r.in) ? 'oui' : 'non', r.out && aiCut.has(r.out) ? 'oui' : 'non'].map((x) => String(x).replace(/;/g, ',')).join(';'));
fs.writeFileSync(dir + '/data/changes.csv', '﻿' + csv.join('\n'));
console.log(rows.length, Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.length])));
