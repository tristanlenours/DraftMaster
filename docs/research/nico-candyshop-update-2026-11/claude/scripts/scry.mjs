import fs from 'node:fs';
const [res, cc, raw, outp] = process.argv.slice(2);
const {recent} = JSON.parse(fs.readFileSync(res,'utf8'));
const cur = JSON.parse(fs.readFileSync(cc+'/current.json','utf8'));
const old = JSON.parse(fs.readFileSync(raw,'utf8'));
const ids = new Set([...cur.cards.mainboard, ...(old.cards.mainboard||old.cards)].map(c=>c.cardID));
for (const p of recent) { const v=p.changelog.mainboard||{};
  for (const x of v.adds||[]) ids.add(x.cardID); for (const x of v.removes||[]) ids.add(x.oldCard.cardID);
  for (const x of v.swaps||[]) { ids.add(x.card.cardID); ids.add(x.oldCard.cardID); }
  for (const x of v.edits||[]) { ids.add(x.newCard.cardID); ids.add(x.oldCard.cardID); } }
const all=[...ids]; const out={};
for (let i=0;i<all.length;i+=75) {
  const r = await fetch('https://api.scryfall.com/cards/collection',{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'DraftMaster-analysis/1.0','Accept':'application/json'},body:JSON.stringify({identifiers:all.slice(i,i+75).map(id=>({id}))})});
  const j = await r.json();
  for (const d of j.data) { const f=d.card_faces?.[0];
    out[d.id] = {name:d.name, flavor:d.flavor_name||f?.flavor_name||null, printed:d.printed_name||null, oracle:d.oracle_id||f?.oracle_id, cmc:d.cmc, mana:d.mana_cost??d.card_faces?.map(x=>x.mana_cost).join(' // '), type:d.type_line, ci:d.color_identity.join('')||'C', set:d.set, released:d.released_at, text:d.oracle_text??d.card_faces?.map(x=>x.name+': '+x.oracle_text).join(' // '), pt:d.power!=null?d.power+'/'+d.toughness:(f?.power!=null?f.power+'/'+f.toughness:null), loyalty:d.loyalty??f?.loyalty??null, rarity:d.rarity}; }
  if (j.not_found?.length) console.log('not found', JSON.stringify(j.not_found));
  await new Promise(r=>setTimeout(r,120));
}
fs.writeFileSync(outp, JSON.stringify(out));
console.log(all.length, Object.keys(out).length);
