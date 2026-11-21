import fs from 'node:fs';
const [S, raw, outp] = process.argv.slice(2);
const sc = JSON.parse(fs.readFileSync(S+'/scry.json','utf8'));
const {recent} = JSON.parse(fs.readFileSync(S+'/resolved.json','utf8'));
const cur = JSON.parse(fs.readFileSync(S+'/cc/current.json','utf8'));
const old = JSON.parse(fs.readFileSync(raw,'utf8'));
const rel = JSON.parse(fs.readFileSync('data/benchmarks/card-release-metadata.json','utf8'));
const cat = JSON.parse(fs.readFileSync('data/cards/master-cards.json','utf8')).cards;
const catByOracle = {}; for (const c of Object.values(cat)) catByOracle[c.oracleId]=c;
const curDet = {}; for (const c of [...cur.cards.mainboard, ...(old.cards.mainboard||old.cards)]) curDet[c.cardID]=c.details;
const card = id => { const s=sc[id]; const d=curDet[id]; const r=rel[s.name.toLowerCase()]; const k=catByOracle[s.oracle];
  return {name:s.name, flavor:s.flavor||(d&&d.name!==s.name?d.name:null), oracle:s.oracle, mana:s.mana, cmc:s.cmc, type:s.type, ci:s.ci, pt:s.pt, loyalty:s.loyalty, text:s.text,
    firstYear: r?.firstPrintYear ?? d?.firstPrintYear ?? (s.released||'').slice(0,4)*1, firstSet: r?.set ?? s.set, elo: Math.round(r?.elo ?? d?.elo ?? 0) || null, cubeCount: r?.cubeCount ?? d?.cubeCount ?? null,
    dmScore: k?.powerScore?.score ?? null, inCatalog: !!k }; };
const nm = id => { const s=sc[id]; return s.name; };
const ops=[];
for (const p of recent) { const v=p.changelog.mainboard||{}; const t=new Date(p.date).toISOString(); const ver=p.changelog.version??0;
  for (const x of v.adds||[]) ops.push({ver,t,op:'add',in:nm(x.cardID)});
  for (const x of v.removes||[]) ops.push({ver,t,op:'remove',out:nm(x.oldCard.cardID)});
  for (const x of v.swaps||[]) { const a=nm(x.oldCard.cardID), b=nm(x.card.cardID); ops.push({ver,t,op:a===b?'printing':'swap',out:a,in:b}); }
  for (const x of v.edits||[]) { const a=nm(x.oldCard.cardID), b=nm(x.newCard.cardID); if(a!==b) ops.push({ver,t,op:'edit-swap',out:a,in:b}); else if (x.oldCard.cardID!==x.newCard.cardID) ops.push({ver,t,op:'printing',out:a,in:b}); else ops.push({ver,t,op:'meta',card:a}); } }
const oldCards=(old.cards.mainboard||old.cards), curCards=cur.cards.mainboard;
const byO = arr => { const m={}; for (const c of arr) { const o=sc[c.cardID].oracle; (m[o]=m[o]||[]).push(c.cardID);} return m; };
const oO=byO(oldCards), cO=byO(curCards);
const removed=[], added=[];
for (const o of new Set([...Object.keys(oO),...Object.keys(cO)])) { const a=oO[o]||[], b=cO[o]||[]; for(let i=b.length;i<a.length;i++) removed.push(card(a[i])); for(let i=a.length;i<b.length;i++) added.push(card(b[i])); }
const tally=ops.reduce((m,o)=>(m[o.op]=(m[o.op]||0)+1,m),{});
const curNames=new Set(curCards.map(c=>sc[c.cardID].name));
const transient=[...new Set(ops.filter(o=>o.in&&!curNames.has(o.in)).map(o=>o.in))];
const reverted=[...new Set(ops.filter(o=>o.out&&curNames.has(o.out)).map(o=>o.out))];
fs.writeFileSync(outp, JSON.stringify({baseline:{date:new Date(old.dateLastUpdated).toISOString(),count:oldCards.length}, current:{date:new Date(cur.dateLastUpdated).toISOString(),count:curCards.length}, tally, removed, added, transient, reverted, ops, curOracles:Object.keys(cO), oldOracles:Object.keys(oO)}, null, 1));
console.log(tally, 'removed', removed.length, 'added', added.length, '\ntransient', transient, '\nreverted', reverted);
console.log('ADDED:', added.map(c=>c.name+(c.flavor?' ['+c.flavor+']':'')).join(' | '));
