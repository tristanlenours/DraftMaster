// Read-only audit of source data; writes only the research evidence artifact.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const inputs = {};
function read(path) {
  const bytes = readFileSync(path);
  inputs[path] = createHash('sha256').update(bytes).digest('hex');
  return JSON.parse(bytes);
}
const norm = (s) => s.trim().toLowerCase();
const cards = readdirSync('data/cards/items').filter(f => f.endsWith('.json')).sort().map(f => read(`data/cards/items/${f}`));
const master = read('data/cards/master-cards.json');
const metadata = read('data/untapped_history/card-metadata-v1.json');
const drafts = read('data/untapped_history/drafts_backup.json');
const referenceScores = new Map(Object.entries(read('data/power-rankings/untapped-reference-v1.json').scores).map(([name, score]) => [norm(name), score]));
const rankingByOracleId = new Map(read('data/power-rankings/power-ranking-v1.json').ranking.map(entry => [entry.oracleId, entry]));
const observations = new Map();
let numericPositions = 0;
const scoredIds = new Set();
for (const [draftId, d] of Object.entries(drafts)) for (const p of d.picks ?? []) {
  for (const [id, s] of Object.entries(p.PackScores ?? {})) {
    if (!Number.isFinite(s?.staticScore)) continue;
    numericPositions++;
    scoredIds.add(id);
    const name = metadata[id]?.name;
    if (!name) continue;
    const obs = observations.get(norm(name)) ?? [];
    obs.push({ draftId, grpId: id, pack: p.PackNumber, pick: p.PickNumber, score: s.staticScore });
    observations.set(norm(name), obs);
  }
}
const rawCubes = {};
const rawByName = new Map();
for (const key of ['titou_tribal', 'nico_candyshop', 'hugues_pauper']) {
  rawCubes[key] = read(`data/cubes/${key}/cubecobra-raw.json`).cards.mainboard;
  for (const c of rawCubes[key]) if (c.details?.name) rawByName.set(norm(c.details.name), c.details);
}
const issues = {};
function flag(type, detail) { (issues[type] ??= []).push(detail); }
const sourceCounts = {};
let matchedUntapped = 0;
for (const c of cards) {
  const p = c.powerScore;
  sourceCounts[p.source] = (sourceCounts[p.source] ?? 0) + 1;
  const obs = observations.get(norm(c.name));
  if (p.source === 'untapped') {
    const referenceScore = referenceScores.get(norm(c.name));
    if (referenceScore === p.score || obs?.some(o => Math.round(o.score * 10) / 10 === p.score)) matchedUntapped++;
    else if (!obs) flag('untappedNoLocalObservation', { name: c.name, powerScore: p });
    else flag('untappedScoreMismatch', { name: c.name, actual: p.score, observed: [...new Set(obs.map(o => o.score))] });
  } else if (obs) flag('untappedAvailableButUnused', { name: c.name, powerScore: p, observed: [...new Set(obs.map(o => o.score))] });
  if (p.source !== 'expert_heuristic' && !Number.isFinite(p.rawSourceScore)) flag('missingRawScore', { name: c.name, source: p.source });
  const rankingEntry = rankingByOracleId.get(c.oracleId);
  if (!rankingEntry || rankingEntry.score !== p.score || rankingEntry.source !== p.source) {
    flag('rankingArtifactMismatch', { name: c.name, powerScore: p, rankingEntry });
  }
  if (p.source === 'cubecobra_elo') {
    const raw = rawByName.get(norm(c.name));
    if (!raw || Math.abs(raw.elo - p.rawSourceScore) > 0.11) flag('eloRawMismatchOrMissing', { name: c.name, saved: p.rawSourceScore, archived: raw?.elo });
  }
  const raw = rawByName.get(norm(c.name));
  if (raw && raw.oracle_id !== c.oracleId) flag('oracleIdMismatch', { name: c.name, actual: c.oracleId, archived: raw.oracle_id });
  if (raw && raw.oracle_id === c.oracleId) {
    for (const [field, remote] of [['cmc','cmc'], ['colors','colors'], ['colorIdentity','color_identity'], ['power','power'], ['toughness','toughness']]) {
      if (raw[remote] === undefined) continue;
      const a = Array.isArray(c[field]) ? [...c[field]].sort() : c[field];
      const b = Array.isArray(raw[remote]) ? [...raw[remote]].sort() : raw[remote];
      if (JSON.stringify(a) !== JSON.stringify(b)) flag('cardFieldMismatch', { name: c.name, field, actual: a, archived: b });
    }
  }
  if (JSON.stringify(master.cards[c.oracleId]) !== JSON.stringify(c)) flag('bundleMismatch', c.name);
  if (c.typeLine === 'Creature' && c.oracleText === '' && c.manaCost === '{2}') flag('placeholderRules', c.name);
  if (c.manaCost?.includes('o')) flag('arenaManaNotation', {name:c.name, manaCost:c.manaCost});
  for (const [key, a] of Object.entries(c.cubeAnalyses)) {
    if (!c.presentInCubes.includes(key)) flag('analysisOutsideMembership', {name:c.name,key});
    for (const f of a.pedagogy?.archetypeFit ?? []) if (f.winrateOrScore?.includes('%')) {
      flag('percentageClaims', { name: c.name, cube: key, value: f.winrateOrScore });
      if (parseFloat(f.winrateOrScore) > 100 || parseFloat(f.winrateOrScore) < 0) flag('impossiblePercentages', {name:c.name,cube:key,value:f.winrateOrScore});
    }
  }
}
for (const [name, obs] of observations) {
  const unique = [...new Set(obs.map(o => o.score))];
  if (unique.length > 1) flag('variableStaticScores', { name, scores: unique, observations: obs });
}
for (const field of ['oracleId','slug','name']) {
  const groups = new Map();
  for (const c of cards) { const list = groups.get(c[field]) ?? []; list.push(c.slug); groups.set(c[field], list); }
  for (const [key, list] of groups) if (list.length > 1) flag('duplicateIdentity', {field,key,cards:list});
}
const cubes = {};
for (const key of ['titou_tribal', 'nico_candyshop', 'hugues_pauper']) {
  const cube = read(`data/cubes/${key}/cube.json`);
  const members = cards.filter(c => c.presentInCubes.includes(key));
  const ids = new Set(cube.cardIndex.map(c => c.oracleId));
  cubes[key] = {declared: cube.cardCount, index: cube.cardIndex.length, members: members.length, archivedMainboard: rawCubes[key]?.length};
  for (const c of members) {
    if (!ids.has(c.oracleId)) flag('memberMissingFromIndex',{key,name:c.name});
    const a = c.cubeAnalyses[key];
    if (!a) flag('missingCubeAnalysis',{key,name:c.name});
    const defined = new Set(cube.archetypes.map(a => a.id));
    for (const id of a?.archetypes ?? []) if (!defined.has(id)) flag('undefinedArchetype',{key,name:c.name,id});
  }
  if (rawCubes[key]) {
    // Resolve archived flavor names through oracle IDs; name-based differences below
    // remain diagnostic only and must not be treated as missing cards.
    const byName = new Map(rawCubes[key].map(c => [norm(c.details.name), c.details.oracle_id]));
    const sourceIds = new Set(rawCubes[key].map(c => c.details.oracle_id));
    const resolvedIds = new Set(members.map(c => byName.get(norm(c.name)) ?? c.oracleId));
    cubes[key].archivedUniqueOracleIds = sourceIds.size;
    cubes[key].missingAfterIdentityResolution = rawCubes[key].filter(c => !resolvedIds.has(c.details.oracle_id)).map(c => c.details.name);
    cubes[key].extraAfterIdentityResolution = members.filter(c => !sourceIds.has(byName.get(norm(c.name)) ?? c.oracleId)).map(c => c.name);
    const sourceNames = new Set(rawCubes[key].map(c => norm(c.details.name)));
    const names = new Set(members.map(c => norm(c.name)));
    for (const name of sourceNames) if (!names.has(name)) flag('archivedNameMissingFromCube',{key,name});
    for (const name of names) if (!sourceNames.has(name)) flag('cubeNameNotInArchive',{key,name});
  }
}
const variableWithinDraft = (issues.variableStaticScores ?? []).filter(x => Object.values(Object.groupBy(x.observations, o => o.draftId)).some(os => new Set(os.map(o => o.score)).size > 1)).length;
const summary = {cards: cards.length, masterDeclared: master.cardCount, masterActual: Object.keys(master.cards).length, sourceCounts, drafts: Object.keys(drafts).length, numericPositions, uniqueScoredGrpIds:scoredIds.size, uniqueScoredNames:observations.size, matchedUntapped, variableWithinDraft, cubes, issueCounts:Object.fromEntries(Object.entries(issues).map(([k,v])=>[k,v.length]))};
writeFileSync('docs/research/artifacts/card-data-audit-2026-09-06.json', JSON.stringify({summary,issues,inputs}, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
