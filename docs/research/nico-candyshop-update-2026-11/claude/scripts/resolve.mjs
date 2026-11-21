import fs from 'node:fs';
const [cc, raw, outp] = process.argv.slice(2);
const cur = JSON.parse(fs.readFileSync(cc+'/current.json','utf8'));
const old = JSON.parse(fs.readFileSync(raw,'utf8'));
const log = JSON.parse(fs.readFileSync(cc+'/changelog-all.json','utf8'));
const map = {};
const put = (id, d) => { if (id && d) map[id] = {name:d.name, oracle:d.oracle_id, cmc:d.cmc, type:d.type||d.type_line, ci:d.color_identity, colors:d.colors, set:d.set, year:d.firstPrintYear||(d.released_at||'').slice(0,4), elo:d.elo, oracle_text:d.oracle_text, rarity:d.rarity}; };
for (const c of [...cur.cards.mainboard, ...(old.cards.mainboard||old.cards)]) put(c.cardID, c.details);
const since = Date.parse('2024-12-12');
const recent = log.filter(p => p.date > since).sort((a,b)=>a.date-b.date);
const ids = new Set();
for (const p of recent) for (const [b,v] of Object.entries(p.changelog)) { if (b==='version') continue;
  for (const x of v.adds||[]) ids.add(x.cardID); for (const x of v.removes||[]) ids.add(x.oldCard?.cardID);
  for (const x of v.swaps||[]) { ids.add(x.card.cardID); ids.add(x.oldCard.cardID); }
  for (const x of v.edits||[]) { ids.add(x.newCard.cardID); ids.add(x.oldCard.cardID); } }
const missing = [...ids].filter(i => i && !map[i]);
console.log('ids', ids.size, 'missing', missing.length);
for (let i=0;i<missing.length;i+=75) {
  const r = await fetch('https://api.scryfall.com/cards/collection',{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'DraftMaster-analysis/1.0','Accept':'application/json'},body:JSON.stringify({identifiers:missing.slice(i,i+75).map(id=>({id}))})});
  const j = await r.json();
  for (const d of j.data) put(d.id, {...d, type:d.type_line, firstPrintYear:null});
  if (j.not_found?.length) console.log('not found', j.not_found);
  await new Promise(r=>setTimeout(r,150));
}
fs.writeFileSync(outp, JSON.stringify({map, recent}, null, 1));
