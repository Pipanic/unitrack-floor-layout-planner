/* ============================================================
   LIMITED MODE
   The user's owned inventory (pieces by type id) and the mode switch.
   Remaining stock is always owned minus what's placed, worked out from the
   layout, so undo, delete, paste and load need no bookkeeping. Counting
   follows the parts list: a bundle uses its own stock, not its partner's.
   Actions that would take a type past what's owned are refused; pieces
   already past it (after switching modes or loading) are drawn red.
   ============================================================ */
const INVENTORY_KEY = 'katoUnitrackPlanner.inventory.v1';
const MODE_KEY = 'katoUnitrackPlanner.mode.v1';
const INVENTORY_SCHEMA = 'kato-unitrack-inventory';
const INVENTORY_VERSION = 1;
let inventory = {};
let limitedMode = false;
let transientHint = null; // {text, until}
// Only known types with whole, positive counts; drops the rest.
function cleanInventory(obj){
  const out = {}; let skipped = 0;
  if(obj && typeof obj==='object') Object.entries(obj).forEach(([t,n])=>{
    const k = Math.floor(Number(n));
    if(!TT[t]){ skipped++; return; }
    if(Number.isFinite(k) && k>0) out[t] = Math.min(k, 9999);
  });
  return {pieces: out, skipped};
}
try{ inventory = cleanInventory(JSON.parse(localStorage.getItem(INVENTORY_KEY)||'{}')).pieces; }catch(err){ inventory = {}; }
try{ limitedMode = localStorage.getItem(MODE_KEY)==='limited'; }catch(err){}
function inventorySize(inv){ return Object.values(inv).reduce((n,k)=>n+k, 0); }
// Stock used, by type: placed counts with each bundle taking its partner off.
function stockUsage(counts){
  const u = {...counts};
  Object.keys(counts).forEach(t=>{
    const partner = TT[t].bundleWith;
    if(partner && u[partner]!=null) u[partner] = Math.max(0, u[partner] - counts[t]);
  });
  return u;
}
function placedCounts(){
  const c = {};
  Object.values(pieces).forEach(p=>{ const t = catalogTypeId(p.typeId); c[t]=(c[t]||0)+1; });
  Object.values(joiners).forEach(t=>{ c[t] = (c[t]||0)+1; });
  return c;
}
// The first type that adding `add` and removing `remove` (type ids) would take
// past what's owned, or null. A type already over only blocks if it grows.
function stockShortfall(add, remove){
  const now = placedCounts(), next = {...now};
  add.map(catalogTypeId).forEach(t=>{ next[t]=(next[t]||0)+1; });
  remove.map(catalogTypeId).forEach(t=>{ next[t]=(next[t]||0)-1; });
  const before = stockUsage(now), after = stockUsage(next);
  return Object.keys(after).find(t=>after[t] > (inventory[t]||0) && after[t] > (before[t]||0)) || null;
}
function flashHint(text){
  transientHint = {text, until: Date.now()+3500};
  clearTimeout(flashHint._t);
  flashHint._t = setTimeout(()=>{ transientHint = null; renderSelection(); }, 3600);
}
function flashStockShort(typeId){ flashHint(tr('limited.short', shortCode(TT[typeId]))); renderSelection(); }
// Limited Mode gate for an action: true (and says why) if it must not happen.
function stockBlocks(add, remove){
  if(!limitedMode) return false;
  const t = stockShortfall(add, remove);
  if(!t) return false;
  flashHint(tr('limited.short', shortCode(TT[t])));
  return true;
}
// Pieces beyond what's owned: for each type over, the most recently placed.
function overLimitPieceIds(){
  const byType = {};
  Object.values(pieces).forEach(p=>{ const t = catalogTypeId(p.typeId); (byType[t] = byType[t]||[]).push(p.id); });
  const counts = Object.fromEntries(Object.entries(byType).map(([t,ids])=>[t, ids.length]));
  const usage = stockUsage(counts), over = new Set();
  const idNum = id=>parseInt(id.slice(1), 10) || 0;
  Object.keys(usage).forEach(t=>{
    const excess = usage[t] - (inventory[t]||0);
    if(excess<=0) return;
    byType[t].slice().sort((a,b)=>idNum(b)-idNum(a)).slice(0, excess).forEach(id=>over.add(id));
  });
  return over;
}
// Palette badges: remaining stock, greyed at zero or unowned. Skips the DOM
// when nothing has changed.
let _paletteStockSig = null;
function updatePaletteStock(){
  const usage = limitedMode ? stockUsage(placedCounts()) : {};
  const sig = limitedMode ? JSON.stringify([usage, inventory]) : 'free';
  if(sig===_paletteStockSig) return;
  _paletteStockSig = sig;
  document.querySelectorAll('#palette .pbtn[data-type-id]').forEach(b=>{
    const t = b.dataset.typeId, badge = b.querySelector('.stock');
    if(!limitedMode){ b.classList.remove('unowned'); badge.style.display='none'; return; }
    const owned = inventory[t]||0, left = owned - (usage[t]||0);
    b.classList.toggle('unowned', left<=0);
    badge.style.display = owned>0 || left<0 ? '' : 'none';
    badge.textContent = left<0 ? '\u2212'+(-left) : String(left);
    badge.classList.toggle('short', left<0);
  });
}
function setLimitedMode(on){
  limitedMode = on;
  try{ localStorage.setItem(MODE_KEY, on ? 'limited' : 'free'); }catch(err){}
  document.getElementById('modeSelect').value = on ? 'limited' : 'free';
  _paletteStockSig = null;
  invalidate();
  if(on && inventorySize(inventory)===0) openInventory();
}
function populateModeSelect(){
  const sel = document.getElementById('modeSelect');
  sel.innerHTML = '';
  [['free','header.mode.free'],['limited','header.mode.limited']].forEach(([v,k])=>{
    const o = document.createElement('option'); o.value=v; o.textContent=tr(k); sel.appendChild(o);
  });
  sel.value = limitedMode ? 'limited' : 'free';
}
populateModeSelect();
document.getElementById('modeSelect').addEventListener('change', e=>{
  setLimitedMode(e.target.value==='limited');
  e.target.blur();
});

// Inventory window: edits a draft; Confirm applies and autosaves it, the close
// button discards it. Save/Load move the draft to and from a JSON file.
let invOpen = false;
let invDraft = {};
// The window's own undo history (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y), separate from
// the layout's. One step per click or pack; typing into one field is one step.
let invUndo = [], invRedo = [], invLastTyped = null;
function invCheckpoint(typedType){
  if(typedType && typedType===invLastTyped) return; // still typing in the same field
  invLastTyped = typedType || null;
  invUndo.push({...invDraft});
  if(invUndo.length>200) invUndo.shift();
  invRedo = [];
}
function invStep(from, to){
  if(!from.length) return;
  to.push({...invDraft});
  invDraft = from.pop();
  invLastTyped = null;
  document.querySelectorAll('#invList .inv-item').forEach(row=>{
    const k = invDraft[row.dataset.typeId]||0;
    row.querySelector('input').value = String(k);
    row.classList.toggle('owned', k>0);
  });
  updateInvTotal();
}
function openInventory(){
  invDraft = {...inventory};
  invUndo = []; invRedo = []; invLastTyped = null;
  buildInventoryList();
  document.getElementById('invSearch').value = '';
  document.getElementById('invPackMsg').textContent = '';
  document.getElementById('invOverlay').style.display = 'flex';
  invOpen = true;
  updateInvTotal();
}
function closeInventory(commit){
  if(commit){
    inventory = cleanInventory(invDraft).pieces;
    try{ localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory)); }catch(err){}
  }
  invOpen = false;
  hideInvPreview();
  document.getElementById('invOverlay').style.display = 'none';
  // Limited Mode with nothing owned would grey the whole palette.
  if(limitedMode && inventorySize(inventory)===0) setLimitedMode(false);
  _paletteStockSig = null;
  invalidate();
}
function updateInvTotal(){
  document.getElementById('invTotal').textContent = tr('inv.total', inventorySize(cleanInventory(invDraft).pieces));
}
function setDraft(t, n){
  const k = Math.max(0, Math.min(9999, Math.floor(Number(n))||0));
  if(k>0) invDraft[t] = k; else delete invDraft[t];
  const row = document.querySelector(`#invList .inv-item[data-type-id="${CSS.escape(t)}"]`);
  if(row){
    const input = row.querySelector('input');
    if(document.activeElement!==input || input.value!=='') input.value = String(k);
    row.classList.toggle('owned', k>0);
  }
  updateInvTotal();
}
function buildInventoryList(){
  const list = document.getElementById('invList');
  list.innerHTML = '';
  const section = (title, types)=>{
    if(!types.length) return;
    const h = document.createElement('h3'); h.innerHTML = title; list.appendChild(h);
    types.forEach(t=>{
      const row = document.createElement('div');
      row.className = 'inv-item' + (invDraft[t.id] ? ' owned' : '');
      row.dataset.typeId = t.id;
      row.dataset.hay = searchKey(`${t.label} ${paletteLabel(t)} ${t.catalogNo||''} ${t.partCode} ${title}`);
      row.innerHTML = `<span class="inv-name"><span class="inv-part">${shortCode(t)}</span>${shortCode(t)===t.label ? '' : `<span class="code inv-label">${paletteLabel(t)}</span>`}${t.catalogNo && (t.partCode || t.roadPlate) ? `<span class="code">&middot; ${t.catalogNo}</span>` : ''}</span>`
        + `<span class="inv-step"><button type="button" data-d="-1" aria-label="&minus;">&minus;</button>`
        + `<input type="text" inputmode="numeric" value="${invDraft[t.id]||0}" aria-label="${shortCode(t)}">`
        + `<button type="button" data-d="1" aria-label="+">+</button></span>`;
      // The whole name shows the preview; the part code is also a quick
      // stepper: left click adds one, right click takes one away.
      const name = row.querySelector('.inv-name'), part = row.querySelector('.inv-part');
      name.addEventListener('mouseenter', ()=>showInvPreview(t, name));
      name.addEventListener('mouseleave', hideInvPreview);
      part.addEventListener('click', ()=>{ invCheckpoint(); setDraft(t.id, (invDraft[t.id]||0) + 1); });
      part.addEventListener('contextmenu', e=>{ e.preventDefault(); if(!invDraft[t.id]) return; invCheckpoint(); setDraft(t.id, invDraft[t.id] - 1); });
      row.querySelectorAll('button').forEach(b=>b.addEventListener('click', ()=>{
        const next = (invDraft[t.id]||0) + Number(b.dataset.d);
        if(next<0) return;
        invCheckpoint(); setDraft(t.id, next);
      }));
      const input = row.querySelector('input');
      input.addEventListener('input', ()=>{ input.value = input.value.replace(/[^0-9]/g,''); invCheckpoint(t.id); setDraft(t.id, input.value); });
      input.addEventListener('focus', ()=>input.select());
      input.addEventListener('blur', ()=>{ input.value = String(invDraft[t.id]||0); });
      list.appendChild(row);
    });
  };
  PALETTE_GROUPS.forEach(({key, match})=>section(tr('palette.group.'+key),
    [...TRACK_TYPES.filter(match).sort((a,b)=>(a.paletteOrder||0)-(b.paletteOrder||0)), ...(key==='unitram' ? [UNITRAM_FEEDER] : [])]));
  section(tr('palette.group.misc'), [...TRACK_TYPES.filter(t=>t.misc), ...JOINER_TYPES.filter(t=>!t.unitram)]);
}
// Hovering a part code shows the piece, drawn like the palette icon at twice
// the size; built once per type.
const _invPreviewIcons = {};
function showInvPreview(t, anchor){
  if(!_invPreviewIcons[t.id]) _invPreviewIcons[t.id] = (t.joiner ? buildJoinerIcon : buildPieceIcon)(t, PALETTE_ICON_W*2, PALETTE_ICON_H*2);
  // Over the text, not the whole row-wide name box.
  const range = document.createRange(); range.selectNodeContents(anchor);
  showPreview([_invPreviewIcons[t.id]], range);
}
function hideInvPreview(){ hidePreview(); }
// The hover preview box (Inventory part codes, the start screen's layouts):
// shows `nodes` above `anchor` (an element or a Range), or below it when
// there's no room above; `below` prefers below.
function showPreview(nodes, anchor, below=false){
  const box = document.getElementById('invPreview');
  box.replaceChildren(...nodes);
  box.style.display = 'block';
  const r = anchor.getBoundingClientRect(), bw = box.offsetWidth, bh = box.offsetHeight;
  const above = r.top - bh - 8, under = r.bottom + 8;
  const top = below ? (under + bh <= window.innerHeight - 8 ? under : above) : (above >= 8 ? above : under);
  const left = below ? r.left + r.width/2 - bw/2 : r.left; // below: centred under the button
  box.style.left = Math.max(8, Math.min(window.innerWidth - bw - 8, left)) + 'px';
  box.style.top = top + 'px';
}
function hidePreview(){ document.getElementById('invPreview').style.display = 'none'; }
function previewCaption(text){
  const d = document.createElement('div');
  d.className = 'preview-caption';
  d.textContent = text;
  return d;
}
function applyInvFilter(){
  const q = searchKey(document.getElementById('invSearch').value.trim());
  const list = document.getElementById('invList');
  let heading = null, any = false;
  /** @type {HTMLElement[]} */ ([...list.children]).forEach(n=>{
    if(n.tagName==='H3'){ if(heading) heading.style.display = any ? '' : 'none'; heading = n; any = false; return; }
    const show = !q || n.dataset.hay.includes(q);
    n.style.display = show ? '' : 'none';
    if(show) any = true;
  });
  if(heading) heading.style.display = any ? '' : 'none';
}
// Adds a box's contents. Extras that are a bundle's own partner (a bumper's
// S62) aren't added: the bundle's stock already covers them.
function addPackToDraft(){
  const field = document.getElementById('invPackNo'), msg = document.getElementById('invPackMsg');
  const no = field.value.trim();
  if(!no) return;
  const p = findProduct(no);
  if(!p){ msg.textContent = tr('inv.pack.unknown', no); return; }
  const add = {...p.contents};
  Object.entries(p.extras||{}).forEach(([t,q])=>{
    const bundled = Object.keys(p.contents).filter(c=>TT[c].bundleWith===t).reduce((n,c)=>n+p.contents[c], 0);
    if(q-bundled>0) add[t] = (add[t]||0) + q - bundled;
  });
  invCheckpoint();
  Object.entries(add).forEach(([t,q])=>setDraft(t, (invDraft[t]||0)+q));
  msg.innerHTML = tr('inv.pack.added', p.no, Object.entries(add).map(([t,q])=>`${q}&times; ${shortCode(TT[t])}`).join(', '));
  field.value = '';
  validatePackField();
}
document.getElementById('inventoryBtn').addEventListener('click', openInventory);
document.getElementById('invCloseBtn').addEventListener('click', ()=>closeInventory(false));
document.getElementById('invConfirmBtn').addEventListener('click', ()=>closeInventory(true));
document.getElementById('invOverlay').addEventListener('click', e=>{
  if(e.target.id==='invOverlay') closeInventory(false);
});
document.getElementById('invSearch').addEventListener('input', applyInvFilter);
document.getElementById('invPackBtn').addEventListener('click', addPackToDraft);
function findProduct(no){
  const q = searchKey(no.trim());
  return PRODUCTS.find(x=>searchKey(x.no)===q || (x.set && searchKey(x.set)===q)
    || (x.aliases||[]).some(a=>searchKey(a)===q));
}
// Live check once all five digits are in: green for a known pack, red if not.
function validatePackField(){
  const field = document.getElementById('invPackNo');
  const digits = field.value.replace(/[^0-9]/g,'');
  const found = !!findProduct(field.value);
  field.classList.toggle('valid', found);
  field.classList.toggle('invalid', !found && digits.length>=5);
}
document.getElementById('invPackNo').addEventListener('input', validatePackField);
document.getElementById('invSaveBtn').addEventListener('click', ()=>{
  const data = JSON.stringify({schema: INVENTORY_SCHEMA, version: INVENTORY_VERSION, pieces: cleanInventory(invDraft).pieces}, null, 2);
  offerDownload(new Blob([data], {type:'application/json'}), `${tr('inv.filename')}.json`).catch(()=>{});
});
document.getElementById('invLoadBtn').addEventListener('click', ()=>document.getElementById('invLoadInput').click());
document.getElementById('invLoadInput').addEventListener('change', e=>{
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if(!file) return;
  const msg = document.getElementById('invPackMsg');
  const reader = new FileReader();
  reader.onload = ()=>{
    let data = null;
    try{ data = JSON.parse(/** @type {string} */ (reader.result)); }catch(err){}
    if(!data || data.schema!==INVENTORY_SCHEMA || typeof data.version!=='number' || data.version>INVENTORY_VERSION){
      msg.textContent = tr('inv.loadFailed'); return;
    }
    const {pieces: loaded, skipped} = cleanInventory(data.pieces);
    invCheckpoint();
    invDraft = loaded;
    buildInventoryList(); applyInvFilter(); updateInvTotal();
    const n = inventorySize(loaded);
    msg.textContent = skipped ? tr('inv.loadedSkipped', n, skipped) : tr('inv.loaded', n);
  };
  reader.readAsText(file);
});
// The inventory's keys (a dialog layer of onKeyDown: app shortcuts are
// swallowed, typing still works). Escape closes without saving, Enter in the
// pack field adds the pack.
function inventoryKeys(e){
  if(e.key==='Escape'){ closeInventory(false); return; }
  if((e.ctrlKey||e.metaKey) && !e.altKey){
    const k = e.key.toLowerCase();
    // Also inside a count field, whose own browser undo would bypass the draft.
    if(k==='z' && !e.shiftKey){ invStep(invUndo, invRedo); e.preventDefault(); return; }
    if((k==='z' && e.shiftKey) || k==='y'){ invStep(invRedo, invUndo); e.preventDefault(); return; }
  }
  if(e.key==='Enter' && document.activeElement && document.activeElement.id==='invPackNo'){ addPackToDraft(); e.preventDefault(); }
}

