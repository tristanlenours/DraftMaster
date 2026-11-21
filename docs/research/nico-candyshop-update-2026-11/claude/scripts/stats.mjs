import fs from 'node:fs';
const S=process.argv[2];
const sc=JSON.parse(fs.readFileSync(S+"/scry.json")); for (const v of Object.values(sc)) { if (v.cmc==null) v.cmc = v.name.startsWith("Ugin")?7:3; if(!v.type||v.type==="undefined") v.type = v.name.startsWith("Ugin")?"Legendary Planeswalker — Ugin":"Creature — Human Soldier"; } const cur=JSON.parse(fs.readFileSync(S+'/cc/current.json')); const old=JSON.parse(fs.readFileSync(S+'/cc/baseline-2024-12-11.json'));
const rel=JSON.parse(fs.readFileSync('data/benchmarks/card-release-metadata.json'));
const det={}; for(const c of [...cur.cards.mainboard,...(old.cards.mainboard||old.cards)]) det[c.cardID]=c.details;
const UB=new Set(['spm','spe','msh','msc','tmt','tmc','hob','hoc','tla','tle','fin','fic','fca','pip','ltr','ltc','who','acr','40k','sld','trk','trc','bot','rex','pza','spg']);
const yr=(id)=>{const s=sc[id]; const r=rel[s.name.toLowerCase()]; return r?.firstPrintYear ?? det[id]?.firstPrintYear ?? +s.released.slice(0,4);};
const isUB=(id)=>{const d=det[id]; const s=sc[id]; return UB.has((s.set||'').toLowerCase()) && (s.flavor==null) ; };
function stats(list){
  const n=list.length; const o={n};
  const col={W:0,U:0,B:0,R:0,G:0,Multi:0,Colorless:0,Land:0};
  let cmcSum=0,nonland=0,crea=0,elo=0,eloN=0, removal=0, counter=0, hate=0, draw=0, ramp=0, y25=0, y24p=0, ub=0, pw=0, art=0, eq=0;
  for(const c of list){ const s=sc[c.cardID]; const t=s.type||''; const tx=(s.text||'');
    if(/Land/.test(t)&&!/Creature/.test(t.split('//')[0])) col.Land++; else if(s.ci.length>1) col.Multi++; else if(s.ci==='C') col.Colorless++; else col[s.ci]++;
    if(!/^Land|— Land|^Legendary Land|Land —/.test(t) || /Creature/.test(t)) { if(!/\bLand\b/.test(t.split(' // ')[0])) {cmcSum+=s.cmc; nonland++;} }
    if(/Creature/.test(t.split(' // ')[0])) crea++;
    if(/Planeswalker/.test(t.split(' // ')[0])) pw++;
    if(/Artifact/.test(t.split(' // ')[0])) art++;
    if(/Equipment/.test(t)) eq++;
    const e=rel[s.name.toLowerCase()]?.elo ?? det[c.cardID]?.elo; if(e){elo+=e;eloN++;}
    if(/(destroy|exile) (target|all|each|up to one target) (creature|permanent|nonland|artifact or creature|artifact, creature|creature or planeswalker|attacking)|deals? \d+ damage to (any target|target creature)|deals X damage|damage equal to .* to (any|target)|destroy target creature|exile target (creature|nonland|artifact, enchantment, or creature|artifact, creature)|return target (creature|nonland permanent|permanent) to its owner|sacrifices? (a|an|all) creature|-\d+\/-\d+|destroy all|exile all creatures/i.test(tx)) removal++;
    if(/counter target (spell|activated|noncreature|creature|instant)|counter up to one target/i.test(tx)) counter++;
    if(/can't cast spells during your turn|enter tapped\.|can't be activated|cost \{\d\} more|can't cast more than/i.test(tx)) hate++;
    const y=yr(c.cardID); if(y>=2025) y25++; if(y>=2024) y24p++;
    if(isUB(c.cardID)) ub++;
  }
  Object.assign(o,{colors:col, avgCmcNonland:+(cmcSum/nonland).toFixed(2), creatures:crea, planeswalkers:pw, artifacts:art, equipment:eq, avgElo:Math.round(elo/eloN), removalHeur:removal, counterHeur:counter, hateHeur:hate, firstPrint2025plus:y25, firstPrint2024plus:y24p, universesBeyondPrinting:ub});
  return o;
}
const out={before:stats(old.cards.mainboard||old.cards), after:stats(cur.cards.mainboard)};
// set distribution of adds
const diff=JSON.parse(fs.readFileSync(S+'/diff2.json'));
const setOf={}; for(const c of diff.added){ const k=(c.firstSet||'?').toUpperCase(); setOf[k]=(setOf[k]||0)+1; }
const yrOf={}; for(const c of diff.added){ yrOf[c.firstYear]=(yrOf[c.firstYear]||0)+1; }
const yrOut={}; for(const c of diff.removed){ yrOut[c.firstYear]=(yrOut[c.firstYear]||0)+1; }
const avg=(a,k)=>Math.round(a.filter(x=>x[k]).reduce((s,x)=>s+x[k],0)/a.filter(x=>x[k]).length);
out.changed={addedSets:Object.entries(setOf).sort((a,b)=>b[1]-a[1]), addedYears:yrOf, removedYears:yrOut, avgEloAdded:avg(diff.added,'elo'), avgEloRemoved:avg(diff.removed,'elo'), avgCubeCountAdded:avg(diff.added,'cubeCount'), avgCubeCountRemoved:avg(diff.removed,'cubeCount'), avgCmcAdded:+(diff.added.reduce((s,c)=>s+(c.cmc??(c.name.startsWith("Ugin")?7:3)),0)/130).toFixed(2), avgCmcRemoved:+(diff.removed.reduce((s,c)=>s+(c.cmc??(c.name.startsWith("Ugin")?7:3)),0)/130).toFixed(2)};
const colOf=a=>{const m={}; for(const c of a){const t=c.type||''; const k=/\bLand\b/.test(t.split(' // ')[0])&&!/Creature/.test(t)?'Land':c.ci.length>1?'Multi':c.ci; m[k]=(m[k]||0)+1;} return m;};
out.changed.addedByColor=colOf(diff.added); out.changed.removedByColor=colOf(diff.removed);
fs.writeFileSync(S+'/stats.json', JSON.stringify(out,null,1)); console.log(JSON.stringify(out,null,1));
