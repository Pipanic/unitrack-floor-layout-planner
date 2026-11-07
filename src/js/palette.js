/* ============================================================
   PALETTE
   Built once at startup: collapsible groups, search filter, piece
   thumbnails, part-code formatting, and the palette-drag start handler.
   ============================================================ */
const PALETTE_COLLAPSE_KEY = 'katoUnitrackPlanner.paletteCollapsed.v1';
function loadPaletteCollapsed(){
  try{
    const raw = localStorage.getItem(PALETTE_COLLAPSE_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return (obj && typeof obj==='object') ? obj : {};
  }catch(err){ return {}; } // corrupt or unavailable storage: all expanded
}
let paletteCollapsed = loadPaletteCollapsed(); // {[groupLabel]: true} for collapsed sections
function savePaletteCollapsed(){
  try{ localStorage.setItem(PALETTE_COLLAPSE_KEY, JSON.stringify(paletteCollapsed)); }
  catch(err){ /* best effort */ }
}
// Groups are predicates, not `cat` lookups, because display grouping differs
// from geometry (S60L/S60R are straights shown with turnouts; every dead end
// goes in Buffers). Display order; mutually exclusive. `misc:true` entries go
// in Misc. with the tabletop button. A `parent` makes a subcategory: an
// indented group inside that one, holding reskins and recolours of its pieces.
// It stays visible when its parent collapses (it has its own collapse), and
// right-click's expand-all leaves it be.
// A Type A/B stop has no ties of its own: it's concrete-tie if its bundled
// S62 is.
const isConcreteBuffer = t=>t.ties==='concrete' || (!!t.bundleWith && TT[t.bundleWith].ties==='concrete');
const PALETTE_GROUPS = [
  {key:'straights', match:t=>t.cat==='straight' && !t.deadEnd && t.wedgeSide==null && !t.viaduct && !t.bridgeStyle && t.ties!=='concrete'},
  {key:'straightsConcrete', parent:'straights', match:t=>t.cat==='straight' && !t.deadEnd && t.ties==='concrete'},
  {key:'curves', match:t=>t.cat==='curve' && !t.viaduct && !t.bridgeStyle && !t.misc && t.ties!=='concrete'},
  {key:'curvesConcrete', parent:'curves', match:t=>t.cat==='curve' && t.ties==='concrete'},
  {key:'turnouts', match:t=>t.cat==='turnout' || t.cat==='wye' || t.wedgeSide!=null},
  {key:'crossings', match:t=>t.cat==='crossover' || t.cat==='crossing'},
  {key:'dstraights', match:t=>(t.cat==='dstraight' || t.cat==='widener') && !t.viaduct && !t.bridgeStyle && t.ties!=='slab'},
  {key:'dstraightsSlab', parent:'dstraights', match:t=>t.cat==='dstraight' && t.ties==='slab' && !t.viaduct},
  {key:'dcurves', match:t=>t.cat==='dcurve' && !t.viaduct && t.ties!=='slab'},
  {key:'dcurvesSlab', parent:'dcurves', match:t=>t.cat==='dcurve' && t.ties==='slab' && !t.viaduct},
  {key:'viaducts', match:t=>t.viaduct===true && !t.misc && t.ties!=='concrete'},
  {key:'viaductsConcrete', parent:'viaducts', match:t=>t.viaduct===true && !t.misc && t.ties==='concrete'},
  {key:'bridges', match:t=>t.bridgeStyle!=null && !t.misc},
  {key:'buffers', match:t=>t.deadEnd===true && !t.misc && !isConcreteBuffer(t)},
  {key:'buffersConcrete', parent:'buffers', match:t=>t.deadEnd===true && isConcreteBuffer(t)},
  {key:'unitram', match:t=>t.cat==='taper' || isStreetTrack(t) || t.roadPlate},
  {key:'structures', match:t=>t.platform===true},
];
function renderPalette(){
  const el_ = document.getElementById('palette');
  // Rebuilds the panel (startup only today). Wiping innerHTML resets scroll, so
  // restore it.
  const scrollTop = el_.scrollTop;
  el_.innerHTML='';
  const groups = PALETTE_GROUPS, byKey = {};
  groups.forEach(({key,parent,match})=>{
    const group = createPaletteGroupShell(key, tr('palette.group.'+key), !!parent);

    // Catalog order unless `paletteOrder` says otherwise.
    const entries = TRACK_TYPES.filter(match).sort((a,b)=>(a.paletteOrder||0)-(b.paletteOrder||0));
    entries.forEach(t=> group.appendChild(createPaletteButton(t)) );

    (parent ? byKey[parent] : el_).appendChild(group);
    byKey[key] = group;
  });

  // Misc.: the tabletop button, plus `misc:true` catalog entries (turntable
  // pieces).
  const miscGroup = createPaletteGroupShell('misc', tr('palette.group.misc'));
  miscGroup.appendChild(createTabletopButton());
  miscGroup.appendChild(createTextLabelButton());
  JOINER_TYPES.filter(t=>!t.unitram).forEach(t=>miscGroup.appendChild(createJoinerButton(t)));
  byKey.unitram.appendChild(createJoinerButton(UNITRAM_FEEDER));
  TRACK_TYPES.filter(t=>t.misc).forEach(t=> miscGroup.appendChild(createPaletteButton(t)) );
  el_.appendChild(miscGroup);

  const setsGroup = createPaletteGroupShell('sets', tr('palette.group.sets'));
  LAYOUT_SETS.forEach(set=> setsGroup.appendChild(createSetButton(set)) );
  el_.appendChild(setsGroup);
  // Ready-made layouts, apart from KATO's sets. None yet.
  el_.appendChild(createPaletteGroupShell('layouts', tr('palette.group.layouts')));

  const noMatches = document.createElement('div');
  noMatches.id = 'paletteNoMatches';
  noMatches.textContent = tr('palette.noMatches');
  el_.appendChild(noMatches);

  // a rebuild produces unfiltered buttons, so reapply any active search
  applyPaletteFilter();

  el_.scrollTop = scrollTop;
}

// Shows a group collapsed or expanded; `remember` also stores it (only
// collapsed groups are stored, so new ones start expanded).
function setGroupCollapsed(group, collapsed, remember){
  const h = group.querySelector(':scope > h2');
  group.classList.toggle('collapsed', collapsed);
  h.classList.toggle('collapsed', collapsed);
  h.title = tr(collapsed ? 'palette.group.collapseHint.expand' : 'palette.group.collapseHint.collapse');
  if(!remember) return;
  if(collapsed) paletteCollapsed[group.dataset.groupKey] = true; else delete paletteCollapsed[group.dataset.groupKey];
}
// During a search every matching group is force-expanded, so header clicks
// do nothing.
const paletteSearching = ()=>!!document.getElementById('paletteSearch').value.trim();
function createPaletteGroupShell(key, label, sub = false){
  const group = document.createElement('div');
  group.className = 'pgroup' + (sub ? ' sub' : '');
  group.dataset.groupKey = key;   // stable across languages — used for collapse persistence
  group.dataset.label = label;    // current display text — read by applyPaletteFilter() for search

  const h = document.createElement('h2');
  h.dataset.hint = 'p5';
  h.innerHTML = `<span class="chev">&#9660;</span>${label}`;
  group.appendChild(h);
  setGroupCollapsed(group, !!paletteCollapsed[key]);
  h.addEventListener('click', ()=>{
    if(paletteSearching()) return;
    setGroupCollapsed(group, !group.classList.contains('collapsed'), true);
    savePaletteCollapsed();
  });
  // Right-click collapses every group, subcategories included; if the main
  // groups are all collapsed already, it expands them, leaving subcategories
  // collapsed.
  h.addEventListener('contextmenu', e=>{
    e.preventDefault();
    if(paletteSearching()) return;
    const groups = [...document.querySelectorAll('#palette .pgroup')];
    const collapse = groups.some(g_=>!g_.classList.contains('sub') && !g_.classList.contains('collapsed'));
    groups.forEach(g_=>{ if(collapse || !g_.classList.contains('sub')) setGroupCollapsed(g_, collapse, true); });
    savePaletteCollapsed();
  });
  return group;
}
// Tabletop button: a click spawns a box at the viewport centre, staggered per
// existing box so repeat clicks don't stack.
const TABLE_BOX_SPAWN_STAGGER = 30;
function createTabletopButton(){
  const b = document.createElement('button');
  b.className = 'pbtn';
  b.dataset.searchHay = 'tabletop floorspace table workspace benchtop surface size boundary';
  b.dataset.hint = 'p4';
  const textWrap = document.createElement('span');
  textWrap.className = 'pbtn-text';
  textWrap.innerHTML = tr('palette.tabletop.label', lenValue(TABLE_BOX_DEFAULT_SIZE), fmtLen(TABLE_BOX_DEFAULT_SIZE));
  b.appendChild(textWrap);
  b.addEventListener('click', ()=>{
    if(blocksOtherEditing()) return;
    const stagger = TABLE_BOX_SPAWN_STAGGER * Object.keys(tableBoxes).length, c = viewCentreWorld();
    pushHistory();
    const id = spawnTableBox(c.x + stagger, c.y + stagger);
    selectOnlyBox(id);
  });
  return b;
}

// SETS: a palette button places a whole LAYOUT_SETS entry. Drag it onto the
// canvas (scroll rotates it) or click to drop it mid-view; it lands as one
// selected group. It doesn't snap to existing track.
function appendSetShape(g, set){
  set.pieces.forEach(([t, x, y, rot])=>{
    const pg = el('g',{transform:`translate(${x},${y}) rotate(${rot})`});
    appendIconShape(pg, TT[t]);
    g.appendChild(pg);
  });
}
function buildSetIcon(set, W=PALETTE_ICON_W, H=PALETTE_ICON_H){
  const measureG = el('g',{});
  appendSetShape(measureG, set);
  const measureSvg = getIconMeasureSvg();
  measureSvg.appendChild(measureG);
  const bbox = measureG.getBBox();
  measureSvg.removeChild(measureG);
  const svg = el('svg', {class:'pbtn-icon', viewBox:`0 0 ${W} ${H}`, width:W, height:H});
  const g = el('g',{});
  const PAD = 0.86;
  const scale = Math.min((W*PAD)/bbox.width, (H*PAD)/bbox.height);
  g.setAttribute('transform', `translate(${W/2},${H/2}) scale(${scale}) translate(${-(bbox.x+bbox.width/2)},${-(bbox.y+bbox.height/2)})`);
  appendSetShape(g, set);
  svg.appendChild(g);
  return svg;
}
let setDrag = null; // {set, startX, startY, moved, worldX, worldY, rot}
function setTypeIds(set){ return set.pieces.map(([t])=>t); }
function createSetButton(set){
  const b = document.createElement('button');
  b.className = 'pbtn';
  b.dataset.setId = set.id;
  b.dataset.hint = 'p6';
  b.dataset.searchHay = `${set.name} ${set.no} ${(set.aliases||[]).join(' ')} ${set.id} set layout oval`;
  const textWrap = document.createElement('span');
  textWrap.className = 'pbtn-text';
  textWrap.innerHTML = `${set.name}<span class="code">${set.no}</span>`;
  b.appendChild(textWrap);
  b.appendChild(buildSetIcon(set));
  b.addEventListener('mousedown', ev=>{
    if(ev.button!==0) return;
    ev.preventDefault();
    if(stockBlocks(setTypeIds(set), [])){ renderSelection(); return; }
    if(!beginInteraction('setDrag')) return;
    setDrag = {set, startX:ev.clientX, startY:ev.clientY, moved:false, worldX:null, worldY:null, rot:0};
  });
  return b;
}
// Places the set centred on (wx, wy), turned by rot degrees (clockwise, as
// the piece rot is), and selects it.
function placeSet(set, wx, wy, rot){
  if(stockBlocks(setTypeIds(set), [])){ invalidate(); return; }
  pushHistory();
  const c = Math.cos(rot*Math.PI/180), s_ = Math.sin(rot*Math.PI/180);
  const ids = set.pieces.map(([t, x, y, r, elev])=>{
    const id = 'p'+(nextId++);
    pieces[id] = {id, typeId:t, ox: wx + x*c - y*s_, oy: wy + x*s_ + y*c,
      rot: norm360(r+rot), portElev: elev ? elev.slice() : getPorts(TT[t]).map(()=>0)};
    return id;
  });
  set.joins.forEach(([a, pa, b_, pb])=>connectPorts({sourcePieceId:ids[a], sourcePortIdx:pa, pieceId:ids[b_], portIdx:pb}));
  setSelection({ids});
  invalidate();
  scheduleAutosave();
}

// The empty layout's start screen: a message and a button for every Unitrack
// Set over the canvas. Shown while there's nothing on it (no track, no tabletop);
// panning is off meanwhile, since there's nothing to pan to.
function isLayoutEmpty(){
  return Object.keys(pieces).length===0 && Object.keys(tableBoxes).length===0;
}
function updateEmptyStart(){
  const show = isLayoutEmpty() && !setDrag && !paletteDrag;
  const box = document.getElementById('emptyStart');
  if(box.classList.contains('show')===show) return;
  box.classList.toggle('show', show);
  if(!show) hidePreview();
}
// Click only: the set lands in the middle, then the view fits it, since the
// empty layout's zoom rarely shows a whole layout.
function buildEmptyStart(){
  const row = document.getElementById('emptyStartSets');
  LAYOUT_SETS.forEach(set=>{
    const b = document.createElement('button');
    b.className = 'pbtn';
    b.dataset.hint = 'p7';
    b.textContent = set.id;
    let icon = null;
    b.addEventListener('mouseenter', ()=>{
      if(!icon){ icon = buildSetIcon(set, PALETTE_ICON_W*4, PALETTE_ICON_H*4); icon.classList.add('set-preview'); }
      // Below the whole block of buttons, under this one: above would cover the
      // message, and just below it would cover the next row.
      const rb = row.getBoundingClientRect(), bb = b.getBoundingClientRect();
      showPreview([icon, previewCaption(`${set.name} (${set.no})`)],
        {getBoundingClientRect:()=>({top:rb.top, bottom:rb.bottom, left:bb.left, width:bb.width})}, true);
    });
    b.addEventListener('mouseleave', hidePreview);
    b.addEventListener('click', ()=>{
      const c = viewCentreWorld();
      placeSet(set, c.x, c.y, 0);
      if(isLayoutEmpty()) return; // refused (Limited Mode); the hint says why
      render();
      recentreView();
    });
    row.appendChild(b);
  });
}
registerGesture({active:()=>setDrag,
  move(e){
    if(!setDrag.moved){
      if(Math.hypot(e.clientX-setDrag.startX, e.clientY-setDrag.startY) <= 4) return;
      setDrag.moved = true;
    }
    if(isOverCanvas(e.clientX, e.clientY)){
      const w = screenToWorld(e.clientX, e.clientY);
      setDrag.worldX = w.x; setDrag.worldY = w.y;
    } else { setDrag.worldX = null; setDrag.worldY = null; }
    invalidate();
  },
  end(e){
    const d = setDrag;
    setDrag = null;
    endInteraction('setDrag');
    if(!d.moved){
      const c = viewCentreWorld();
      placeSet(d.set, c.x, c.y, 0);
    } else if(d.worldX!=null){
      placeSet(d.set, d.worldX, d.worldY, d.rot);
    } else invalidate();
  },
});
window.addEventListener('wheel', e=>{
  if(!setDrag) return;
  e.preventDefault(); e.stopImmediatePropagation();
  setDrag.rot = norm360(setDrag.rot + (e.deltaY<0 ? 15 : -15));
  invalidate();
}, {passive:false, capture:true});
function drawSetGhost(frame){
  if(!setDrag || !setDrag.moved || setDrag.worldX==null) return;
  // Kept between frames (keptGhost); rotating only redraws it when a piece's
  // label flips to stay upright.
  const pieces_ = setDrag.set.pieces;
  const flips = pieces_.map(([, , , r])=>markerFlipped(r+setDrag.rot) ? 1 : 0).join('');
  const ghost = keptGhost(setDrag, 'set', flips, ()=>{
    const g = el('g',{opacity:'0.55', style:'pointer-events:none;'});
    pieces_.forEach(([t, x, y, r])=>{
      const pg = el('g',{transform:`translate(${x},${y}) rotate(${r})`});
      drawPiece(pg, TT[t], {roadbedFill:SELECTION_BLUE, roadbedStroke:SELECTION_BLUE, selected:true, railColor:'#e8eaed', worldRot:r+setDrag.rot});
      g.appendChild(pg);
    });
    return g;
  });
  ghost.setAttribute('transform', `translate(${setDrag.worldX},${setDrag.worldY}) rotate(${setDrag.rot})`);
  frame.world.appendChild(ghost);
}

// Applies the search: hides non-matching buttons and empty groups, expands
// groups with matches. An empty query restores the saved collapse state.
function applyPaletteFilter(){
  const input = document.getElementById('paletteSearch');
  const clearBtn = document.getElementById('paletteSearchClear');
  const noMatches = document.getElementById('paletteNoMatches');
  if(!input) return;
  const query = searchKey((input.value||'').trim());
  if(clearBtn) clearBtn.style.display = query ? 'block' : 'none';

  const el_ = document.getElementById('palette');
  const groups = el_.querySelectorAll('.pgroup');
  let anyMatchOverall = false;

  groups.forEach(group=>{
    const h = group.querySelector(':scope > h2');
    const buttons = group.querySelectorAll(':scope > .pbtn');
    if(!query){
      buttons.forEach(btn=> btn.style.display = '');
      group.style.display = '';
      setGroupCollapsed(group, !!paletteCollapsed[group.dataset.groupKey]);
      return;
    }
    let groupMatch = false;
    buttons.forEach(btn=>{
      const t = TT[btn.dataset.typeId];
      // Matches label, group, catalogue number and part code, so "20-000" and
      // "S248" find the same piece.
      const hay = searchKey(t
        ? `${t.label} ${t.catalogNo||''} ${t.partCode} ${group.dataset.label}`
        : `${btn.dataset.searchHay||''} ${group.dataset.label}`);
      const match = hay.includes(query);
      btn.style.display = match ? '' : 'none';
      if(match) groupMatch = true;
    });
    group.style.display = groupMatch ? '' : 'none';
    group.classList.remove('collapsed');
    h.classList.remove('collapsed');
    if(groupMatch) anyMatchOverall = true;
    // A subcategory comes after its parent, so a match here re-shows the parent.
    if(groupMatch && group.classList.contains('sub')) group.parentElement.style.display = '';
  });

  if(noMatches) noMatches.style.display = (query && !anyMatchOverall) ? 'block' : 'none';
}
document.getElementById('paletteSearch').addEventListener('input', applyPaletteFilter);
// Esc hands the keys back to the layout, keeping the search; so does a press
// anywhere else, before anything acts on it. Palette drags and the canvas
// cancel the press's default, which would otherwise leave the box focused
// and WASD typing into it. Its clear button (×) refocuses it anyway. Once the
// keys are back, Esc with nothing else to do clears the search (editKeys).
document.getElementById('paletteSearch').addEventListener('keydown', e=>{
  if(e.key==='Escape') e.target.blur();
});
// Empties the search; false if there was none.
function clearPaletteSearch(){
  const input = document.getElementById('paletteSearch');
  if(!input.value) return false;
  input.value = '';
  applyPaletteFilter();
  return true;
}
window.addEventListener('mousedown', e=>{
  const input = document.getElementById('paletteSearch');
  if(document.activeElement===input && !e.target.closest('#paletteSearchWrap')) input.blur();
}, true);
document.getElementById('paletteSearchClear').addEventListener('click', ()=>{
  clearPaletteSearch();
  document.getElementById('paletteSearch').focus();
});

function paletteDragStartHandler(typeId){
  return (ev)=>{
    if(ev.button!==0) return;
    if(limitedMode && stockShortfall(withPartner(typeId), [])){
      ev.preventDefault(); flashStockShort(typeId); return;
    }
    if(!beginInteraction('paletteDrag')) return;
    ev.preventDefault();
    paletteDrag = {typeId, startX:ev.clientX, startY:ev.clientY, moved:false, rot:0};
    if(TT[typeId].expansion) paletteDrag.expansionTypeId = typeId;
  };
}
// Palette thumbnails draw through drawPiece(), so they always match the canvas
// (a separate copy kept drifting). Icon box must match the .pbtn-icon CSS rule.
const PALETTE_ICON_W = 55, PALETTE_ICON_H = 36;

// Measurement needs an attached <svg>; a detached one can't report getBBox().
let _iconMeasureSvg = null;
function getIconMeasureSvg(){
  if(_iconMeasureSvg) return _iconMeasureSvg;
  _iconMeasureSvg = el('svg', {style:'position:absolute;left:-99999px;top:-99999px;width:10px;height:10px;overflow:hidden;'});
  document.body.appendChild(_iconMeasureSvg);
  return _iconMeasureSvg;
}

// Thumbnail presentation only: constant-width strokes (vector-effect) under the
// fit-to-box scaling, slightly heavier rails, unselected colours.
const ICON_PIECE_STYLE = {
  roadbedStroke: '#3b4049',
  roadbedStrokeW: 1.1,
  railColor: '#e8eaed',
  railWidth: 1.3,
  nonScaling: true,
};
// A bundle's thumbnail shows only the bumper.
function appendIconShape(g, type){
  drawPiece(g, type, {...ICON_PIECE_STYLE, roadbedFill: roadbedFillFor(type, false)});
}

function buildPieceIcon(type, W=PALETTE_ICON_W, H=PALETTE_ICON_H){
  const measureG = el('g',{});
  appendIconShape(measureG, type);
  const measureSvg = getIconMeasureSvg();
  measureSvg.appendChild(measureG);
  const bbox = measureG.getBBox();
  measureSvg.removeChild(measureG);

  const svg = el('svg', {class:'pbtn-icon', viewBox:`0 0 ${W} ${H}`, width:W, height:H});
  const g = el('g',{});
  if(bbox.width>0 && bbox.height>0){
    const PAD = 0.82; // small margin so the shape doesn't touch the edges
    const scale = Math.min((W*PAD)/bbox.width, (H*PAD)/bbox.height);
    const cx = bbox.x+bbox.width/2, cy = bbox.y+bbox.height/2;
    g.setAttribute('transform', `translate(${W/2},${H/2}) scale(${scale}) translate(${-cx},${-cy})`);
  }
  appendIconShape(g, type);
  svg.appendChild(g);
  return svg;
}

// Search text with hyphens dropped, so "20-000" and "20000" (or "R249-45"
// and "R24945") find the same piece. Used on both the query and the text.
function searchKey(text){ return String(text).toLowerCase().replace(/-/g,''); }
// Catalogue number · part code, or the part code alone.
function formatPieceCode(t){
  return t.catalogNo && t.partCode ? `${t.catalogNo} &middot; ${t.partCode}` : t.partCode || t.catalogNo || '';
}

// The palette's name for a piece. (Left)/(Right) only where both hands are in
// the palette. Easement curves (showHandSuffix) say "(Right Approach)": their
// hand says which end leads into the banking.
function paletteLabel(t){
  let handSuffix = '';
  if(t.hand && (t.cat==='turnout'||t.cat==='crossing'||t.cat==='crossover'||t.cat==='widener')){
    handSuffix = ` (${(t.labelHand||t.hand)==='L'?'Left':'Right'})`;
  } else if(t.hand && t.showHandSuffix){
    handSuffix = ` (${t.hand==='L'?'Left':'Right'} Approach)`;
  }
  return t.label + handSuffix;
}
function createPaletteButton(t){
  const b = document.createElement('button');
  b.className='pbtn';
  b.dataset.typeId = t.id;
  b.dataset.hint = 'palette';
  const codeText = formatPieceCode(t);
  const textWrap = document.createElement('span');
  textWrap.className = 'pbtn-text';
  textWrap.innerHTML = `${paletteLabel(t)}${t.flagged?' <span class="flag">⚠</span>':''}<span class="code">${codeText}</span>`;
  b.appendChild(textWrap);
  const stock = document.createElement('span');
  stock.className = 'stock';
  stock.style.display = 'none';
  b.appendChild(stock);
  b.appendChild(buildPieceIcon(t));
  // Drag onto the canvas to place freely; a plain click attaches to the
  // selected port.
  b.addEventListener('mousedown', paletteDragStartHandler(t.id));
  return b;
}
document.getElementById('deleteBtn').addEventListener('click',()=>{
  if(selectedPieces.size>0 || selectedBoxId || selectedJoiner){ pushHistory(); deleteSelected(); invalidate(); }
});
document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('redoBtn').addEventListener('click', redo);

