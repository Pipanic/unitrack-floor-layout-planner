/* ============================================================
   PARTS LIST
   Counts the layout (or the selection) by Kato product. A bundle
   (`bundleWith`) is one product that includes its partner piece, so each one
   takes a partner out of the count: what's listed is what to buy, whichever
   pieces happen to be joined. Modal like Help: Escape closes, app shortcuts
   are swallowed, copying still works.
   ============================================================ */
let partsOpen = false;
let partsRows = [];
let partsIds = [];
const partsHeaders = ()=>[tr('parts.col.qty'), tr('parts.col.part'), tr('parts.col.catalogNo'), tr('parts.col.description')];
function partsListRows(ids){
  const byType = new Map();
  ids.forEach(id=>{ const t = catalogTypeId(pieces[id].typeId); byType.set(t, (byType.get(t)||0)+1); });
  JOINER_TYPES.forEach(t=>{ const n = joinersOn(ids, t.id); if(n) byType.set(t.id, n); });
  byType.forEach((n, typeId)=>{
    const partner = TT[typeId].bundleWith;
    if(partner && byType.has(partner)) byType.set(partner, Math.max(0, byType.get(partner)-n));
  });
  // One row per Kato part; the key includes catalogNo so a colour variant
  // sharing a partCode stays separate.
  const rows = new Map();
  byType.forEach((n, typeId)=>{
    if(n===0) return;
    const t = TT[typeId], key = t.partCode || t.catalogNo ? t.partCode+'|'+(t.catalogNo||'') : t.label; // no codes: its name tells it apart
    const row = rows.get(key) || {qty:0, partCode:t.partCode, catalogNo:t.catalogNo||'', label:t.label};
    row.qty += n; rows.set(key, row);
  });
  // Catalogue order, uncatalogued parts last.
  return [...rows.values()].sort((a,b)=>
    // @ts-expect-error: true and false subtract as 1 and 0, so uncatalogued parts sort last
    (!a.catalogNo - !b.catalogNo) || a.catalogNo.localeCompare(b.catalogNo) || a.partCode.localeCompare(b.partCode));
}
// Fills a parts-style table. Cells are HTML (labels hold entities).
function fillPartsTable(table, headers, rows, footer){
  table.innerHTML = '';
  const cell = (tag, cls, html)=>{ const c=document.createElement(tag); if(cls) c.className=cls; c.innerHTML=html; return c; };
  const line = (tag, cells)=>{ const r=document.createElement('tr'); cells.forEach((v,i)=>r.appendChild(cell(tag, i===0?'qty':'', v))); return r; };
  const head = document.createElement('thead'); head.appendChild(line('th', headers)); table.appendChild(head);
  const body = document.createElement('tbody'); rows.forEach(r=>body.appendChild(line('td', r))); table.appendChild(body);
  const foot = document.createElement('tfoot'); foot.appendChild(line('td', footer)); table.appendChild(foot);
}
function csvOf(headers, rows){
  const plain = html=>{ const d=document.createElement('div'); d.innerHTML=String(html); return d.textContent; };
  const q = v=>{ const t=plain(v); return /[",\n]/.test(t) ? '"'+t.replace(/"/g,'""')+'"' : t; };
  // The BOM makes Excel read the file as UTF-8.
  return '\ufeff' + [headers].concat(rows).map(l=>l.map(q).join(',')).join('\r\n') + '\r\n';
}
function offerCsv(text, stem){
  offerDownload(new Blob([text], {type:'text/csv'}), `${stem}-${fileStamp()}.csv`).catch(()=>{});
}
function openPartsList(){
  const useSelection = selectedPieces.size>0;
  const ids = useSelection ? [...selectedPieces].filter(id=>pieces[id]) : Object.keys(pieces);
  if(!ids.length) return;
  partsRows = partsListRows(ids);
  document.getElementById('partsTitle').textContent = tr(useSelection ? 'parts.title.selection' : 'parts.title.layout');
  partsIds = ids;
  const total = partsRows.reduce((n,r)=>n+r.qty, 0);
  fillPartsTable(document.getElementById('partsTable'), partsHeaders(),
    partsRows.map(r=>[String(r.qty), r.partCode || '&mdash;', r.catalogNo || '&mdash;', r.label]),
    [String(total), tr('parts.total'), '', '']);
  document.getElementById('partsOverlay').style.display = 'flex';
  partsOpen = true;
}
function closePartsList(){
  partsOpen = false;
  document.getElementById('partsOverlay').style.display = 'none';
}
document.getElementById('partsBtn').addEventListener('click', openPartsList);
document.getElementById('partsCloseBtn').addEventListener('click', closePartsList);
document.getElementById('partsOverlay').addEventListener('click', e=>{
  if(e.target.id==='partsOverlay') closePartsList();
});
document.getElementById('partsCsvBtn').addEventListener('click', ()=>{
  offerCsv(csvOf(partsHeaders(), partsRows.map(r=>[r.qty, r.partCode, r.catalogNo, r.label])), tr('parts.csv.filename'));
});

// Pack view. Kits (products with `extras`) are bought first, only for their
// main piece; their extras then count towards everything else, and plain
// packs cover the rest. Buying a kit just for its extras never saves a pack
// over the plain pack, so this is the minimum. A piece sold only as an extra
// (an S60 beyond the turnouts') buys the kit carrying the most of it; one no
// product carries at all is listed as not sold. Sets are left out, since they
// would win any count, except where a set is a piece's only source (V12's
// concrete viaducts): that set is bought first, and all it holds counts
// towards the rest.
// `first`: sets to buy before anything else (setSuggestions' what-if).
let packsRows = [];
function packsFor(ids, first = []){
  const packs = PRODUCTS.filter(p=>!p.set && !p.inventoryOnly);
  const sets = PRODUCTS.filter(p=>p.set);

  const need = {};
  ids.forEach(id=>{ const t=catalogTypeId(pieces[id].typeId); need[t]=(need[t]||0)+1; });
  JOINER_TYPES.forEach(t=>{ const n = joinersOn(ids, t.id); if(n) need[t.id] = n; });
  const left = {...need}, supplied = {}, buy = new Map();
  const take = (p, n)=>{
    buy.set(p, (buy.get(p)||0)+n);
    [p.contents, p.extras||{}].forEach(c=>Object.entries(c).forEach(([t,q])=>{
      left[t] = (left[t]||0) - q*n; supplied[t] = (supplied[t]||0) + q*n; }));
  };
  const packsNeeded = (p, types)=>Math.max(0, ...types.map(t=>Math.ceil((left[t]||0)/p.contents[t])));
  const buyFor = group=>group.forEach(p=>{ const n = packsNeeded(p, Object.keys(p.contents)); if(n>0) take(p, n); });
  first.forEach(p=>take(p, 1));
  // Pieces only a set supplies: the set holding the most of each, enough of it.
  // Once one is bought, its contents may already cover the next such piece.
  Object.keys(left).forEach(t=>{
    if(left[t]<=0 || packs.some(p=>p.contents[t] || (p.extras||{})[t])) return;
    let best = null, bestQ = 0;
    sets.forEach(p=>{ const q = p.contents[t]||0; if(q>bestQ){ best=p; bestQ=q; } });
    if(best) take(best, Math.ceil(left[t]/bestQ));
  });
  buyFor(packs.filter(p=>p.extras));
  // Pieces only ever sold as extras, before plain packs: the extra kit's other
  // extras may cover them.
  Object.keys(left).forEach(t=>{
    if(left[t]<=0 || packs.some(p=>p.contents[t])) return;
    let best = null, bestQ = 0;
    packs.forEach(p=>{ const q=(p.extras||{})[t]||0; if(q>bestQ){ best=p; bestQ=q; } });
    if(best) take(best, Math.ceil(left[t]/bestQ));
  });
  // Bulk packs: one for each whole pack's worth still needed; the usual pack
  // takes the rest, unless the usual packs would hold a bulk pack's worth
  // anyway (9 S248s: three 4-packs), when one more bulk pack is fewer boxes
  // and fewer spares.
  packs.filter(p=>p.bulk).forEach(p=>{
    const [t, q] = Object.entries(p.contents)[0];
    let n = Math.floor(Math.max(0, left[t]||0)/q);
    const rest = Math.max(0, (left[t]||0) - n*q);
    const usual = packs.find(u=>!u.bulk && !u.extras && Object.keys(u.contents).length===1 && u.contents[t]);
    if(rest && usual && Math.ceil(rest/usual.contents[t])*usual.contents[t] >= q) n++;
    if(n>0) take(p, n);
  });
  // A box of several kinds of piece is bought first for the pieces only it
  // sells (20-049's WS62FS), so what else it holds counts before another pack
  // is bought for that (20-049's WS62S, before a 20-044).
  const plain = packs.filter(p=>!p.extras && !p.bulk);
  plain.filter(p=>Object.keys(p.contents).length>1).forEach(p=>{
    const own = Object.keys(p.contents).filter(t=>!plain.some(o=>o!==p && o.contents[t]));
    const n = packsNeeded(p, own);
    if(n>0) take(p, n);
  });
  buyFor(plain);
  const notSold = [];
  Object.keys(left).forEach(t=>{
    if(left[t]<=0) return;
    notSold.push([t, left[t]]); supplied[t]=(supplied[t]||0)+left[t]; left[t]=0;
  });
  // A pack's contents by part: a UniJoiner, having no part code, by its name.
  const code = t=>TT[t].joiner ? TT[t].label : shortCode(TT[t]);
  const listOf = c=>Object.entries(c).map(([t,q])=>`${q}&times; ${code(t)}`).join(', ');
  const rows = [...buy.entries()].sort((a,b)=>a[0].no.localeCompare(b[0].no)).map(([p,n])=>({
    qty:n, catalogNo:p.no, contents: listOf(Object.entries(p.extras||{}).reduce((all, [t, q])=>({...all, [t]:(all[t]||0) + q}), p.contents)),
    unconfirmed: !!p.unconfirmed }));
  notSold.forEach(([t,n])=>rows.push({qty:n, catalogNo:'', contents:`${code(t)} (${tr('packs.notSold')})`, unconfirmed:false}));
  const spare = Object.keys(supplied).filter(t=>supplied[t]>(need[t]||0))
    .sort((a,b)=>code(a).localeCompare(code(b))).map(t=>`${supplied[t]-(need[t]||0)}&times; ${code(t)}`);
  const boxes = [...buy.values()].reduce((a,n)=>a+n, 0);
  return {rows, spare, need, boxes, bought:new Set(buy.keys())};
}
// Sets worth a look, since the pack view never buys one on count alone (it
// would always win): any set not already bought whose contents this layout
// uses at least SET_SUGGEST_FIT of. With no prices, how much of the box you'd
// use is the fair measure. Each says how many of the layout's pieces it covers,
// how many it leaves spare, and how many packs it stands in for (the solver
// re-run with the set bought first). Only sets that save a pack are shown.
// Sets overlap (M2 holds most of M1), so they're chosen one at a time: the best
// fit first, then the rest are judged on what's still needed after it.
const SET_SUGGEST_FIT = 0.8;
function setSuggestions(ids, base){
  const out = [], chosen = [], left = {...base.need};
  let boxes = base.boxes;
  for(;;){
    let best = null;
    PRODUCTS.filter(p=>p.set && !base.bought.has(p) && !chosen.includes(p)).forEach(p=>{
      let used = 0, total = 0;
      Object.entries(p.contents).forEach(([t,q])=>{ total += q; used += Math.min(q, Math.max(0, left[t]||0)); });
      if(!total || used/total < SET_SUGGEST_FIT) return;
      const fit = used/total;
      if(best && (fit < best.fit || (fit===best.fit && used <= best.used))) return;
      best = {p, used, total, fit};
    });
    if(!best) break;
    const after = packsFor(ids, [...chosen, best.p]).boxes, replaces = boxes - (after - 1);
    if(replaces < 1) break;
    const set = LAYOUT_SETS.find(s=>s.id===best.p.set);
    out.push({name:set ? set.name : best.p.no, no:best.p.no, used:best.used, spare:best.total-best.used, replaces, fit:best.fit});
    chosen.push(best.p); boxes = after;
    Object.entries(best.p.contents).forEach(([t,q])=>{ left[t] = (left[t]||0) - q; });
  }
  return out;
}
const packsHeaders = ()=>[tr('packs.col.qty'), tr('packs.col.catalogNo'), tr('packs.col.contents'), tr('packs.col.check')];
let packsOpen = false;
function openPacks(){
  const base = packsFor(partsIds), {rows, spare} = base;
  const fits = setSuggestions(partsIds, base);
  const setsEl = document.getElementById('packsSets');
  setsEl.innerHTML = fits.map(f=>tr('packs.setFit', f.name, f.no, f.used, f.spare, f.replaces)).join('<br>');
  setsEl.style.display = fits.length ? '' : 'none';
  packsRows = rows;
  document.getElementById('packsTitle').textContent = tr('packs.title');
  const flag = `<span class="parts-flag" title="${tr('packs.unconfirmed')}">&#9888;</span>`;
  const packs = rows.filter(r=>r.catalogNo).reduce((n,r)=>n+r.qty, 0);
  fillPartsTable(document.getElementById('packsTable'), packsHeaders(),
    rows.map(r=>[String(r.qty), r.catalogNo || '&mdash;', r.contents, r.unconfirmed ? flag : '']),
    [String(packs), tr('parts.total'), '', '']);
  document.getElementById('packsSpare').innerHTML = spare.length ? tr('packs.spare', spare.join(', ')) : tr('packs.noSpare');
  document.getElementById('packsOverlay').style.display = 'flex';
  packsOpen = true;
}
function closePacks(){
  packsOpen = false;
  document.getElementById('packsOverlay').style.display = 'none';
}
document.getElementById('partsPacksBtn').addEventListener('click', openPacks);
// The pack view reads as the parts list's second page: Back (or Escape)
// returns to the list, while the close button and the backdrop close both.
document.getElementById('packsBackBtn').addEventListener('click', closePacks);
document.getElementById('packsCloseBtn').addEventListener('click', ()=>{ closePacks(); closePartsList(); });
document.getElementById('packsOverlay').addEventListener('click', e=>{
  if(e.target.id==='packsOverlay'){ closePacks(); closePartsList(); }
});
document.getElementById('packsCsvBtn').addEventListener('click', ()=>{
  offerCsv(csvOf(packsHeaders(), packsRows.map(r=>[r.qty, r.catalogNo, r.contents, r.unconfirmed ? tr('packs.unconfirmed') : ''])), tr('packs.csv.filename'));
});
// The parts list's keys (a dialog layer of onKeyDown). Escape steps back from
// the pack view, then closes; nothing else is preventDefault()ed, so Ctrl+C
// still copies.
function partsKeys(e){
  if(e.key==='Escape'){ if(packsOpen) closePacks(); else closePartsList(); return; }
  // Ctrl+A selects the table rather than the whole page.
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='a'){
    e.preventDefault();
    const r = document.createRange(); r.selectNodeContents(document.getElementById(packsOpen ? 'packsTable' : 'partsTable'));
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
  }
}

