import fs from 'node:fs';
const out = process.argv[2];
let lastKey = null, all = [];
for (let i = 0; i < 40; i++) {
  const r = await fetch('https://cubecobra.com/cube/getmorechangelogs', {method:'POST', headers:{'Content-Type':'application/json','User-Agent':'DraftMaster-analysis'}, body: JSON.stringify({lastKey, cubeId:'60d79b473c83f21039c8b72e'})});
  const j = await r.json();
  all.push(...j.posts);
  console.log(i, j.posts.length, j.posts.at(-1) && new Date(j.posts.at(-1).date).toISOString(), JSON.stringify(j.lastKey));
  if (!j.lastKey || !j.posts.length) break;
  lastKey = j.lastKey;
}
fs.writeFileSync(out, JSON.stringify(all, null, 1));
