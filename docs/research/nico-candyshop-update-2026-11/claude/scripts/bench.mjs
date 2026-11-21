import fs from 'node:fs';
const [S, sugPath, outp] = process.argv.slice(2);
const d = JSON.parse(fs.readFileSync(S+'/diff2.json','utf8'));
const s = JSON.parse(fs.readFileSync(sugPath,'utf8'));
const addedO = new Map(d.added.map(c=>[c.oracle,c])), removedO = new Map(d.removed.map(c=>[c.oracle,c]));
const curO = new Set(d.curOracles);
const nico = d.ops.filter(o=>o.op==='swap'||o.op==='edit-swap').map(o=>({...o,out:o.out.split(' // ')[0],in:o.in.split(' // ')[0]}));
const nicoPair = new Set(nico.map(o=>o.out+'=>'+o.in));
const norm0 = n => n.split(' // ')[0]; const addedN = new Set(d.added.map(c=>norm0(c.name))), removedN = new Set(d.removed.map(c=>norm0(c.name)));
const norm = n => n.split(' // ')[0];
const addedNorm = new Set(d.added.map(c=>norm(c.name)));
const mb = s.maybeboard.map(m=>({name:m.card.name, oracle:m.card.oracleId, score:m.card.score, tier:m.card.tier, year:m.card.releaseYear, role:m.role, replaces:(m.replacesCards||[]).map(r=>r.name), added:addedO.has(m.card.oracleId)||addedNorm.has(norm(m.card.name)), replacedCut:(m.replacesCards||[]).map(r=>removedN.has(r.name)), exactSlot:(m.replacesCards||[]).some(r=>nicoPair.has(r.name+'=>'+m.card.name)), nicoReplacement:(m.replacesCards||[]).map(r=>nico.find(o=>o.out===r.name)?.in||null)}));
const up = Object.values(s.upgrades).map(u=>({target:u.targetCard.name, targetTier:u.targetCard.tier, sug:u.suggestedCard.name, sugTier:u.suggestedCard.tier, sugYear:u.suggestedCard.releaseYear, delta:u.scoreDelta, swapType:u.swapType, targetCut:removedN.has(u.targetCard.name), sugAdded:addedO.has(u.suggestedCard.oracleId)||addedNorm.has(norm(u.suggestedCard.name)), exact:nicoPair.has(u.targetCard.name+'=>'+u.suggestedCard.name), nicoReplacement:nico.find(o=>o.out===u.targetCard.name)?.in||null}));
const sum = {
  maybeboard: {n:mb.length, added:mb.filter(x=>x.added).length, exactSlot:mb.filter(x=>x.exactSlot).length, targetCut: mb.filter(x=>x.replacedCut.some(Boolean)).length},
  upgrades: {n:up.length, targetCut:up.filter(x=>x.targetCut).length, sugAdded:up.filter(x=>x.sugAdded).length, exact:up.filter(x=>x.exact).length},
};
// union of AI-suggested cards / AI-flagged cuts
const aiAdds = new Set([...mb.map(x=>x.name), ...up.map(x=>x.sug)].map(norm));
const aiCuts = new Set([...mb.flatMap(x=>x.replaces), ...up.map(x=>x.target)]);
sum.union = {aiAddsDistinct:aiAdds.size, aiAddsTaken:[...aiAdds].filter(n=>addedNorm.has(n)), aiCutsDistinct:aiCuts.size, aiCutsTaken:[...aiCuts].filter(n=>removedN.has(n)).length,
  nicoAdds:d.added.length, nicoAddsPredicted:[...addedNorm].filter(n=>aiAdds.has(n)).length,
  nicoCuts:d.removed.length, nicoCutsPredicted:d.removed.filter(c=>aiCuts.has(norm(c.name))).length,
  nicoCutsNotFlagged:d.removed.filter(c=>!aiCuts.has(norm(c.name))).map(c=>norm(c.name)),
  aiCutsKept:[...aiCuts].filter(n=>!removedN.has(n)) };
fs.writeFileSync(outp, JSON.stringify({sum, mb, up}, null, 1));
console.log(JSON.stringify(sum, null, 1));
