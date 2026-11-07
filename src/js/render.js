/* ============================================================
   RENDER LOOP
   render(), beginFrame() and the draw passes, plus their shared helpers
   (arrow anchors and targets, group centroids).
   ============================================================ */
const ARROW_OFFSET_MM = 15;
function arrowAnchor(piece, port){
  const heading = worldHeading(piece, port.heading);
  const hr = deg2rad(heading);
  const wp = worldPoint(piece, port);
  return {ax: wp.x+ARROW_OFFSET_MM*Math.cos(hr), ay: wp.y+ARROW_OFFSET_MM*Math.sin(hr), heading};
}
// A clickable arrow: triangle at constant screen size inside a hitZonePath()
// target, growing 1.5× on hover. `maxSafeR` clamps against a sibling. Hit zone
// first so the triangle paints over it.
function appendArrowTarget(parent, anchor, fill, maxSafeR, onClick, hintKey){
  const {ax, ay, heading} = anchor;
  const arrowScale = 1/view.scale;
  const arrow = el('g',{transform:`translate(${ax},${ay}) rotate(${heading})`, style:'cursor:pointer;'});
  const poly = el('polygon',{points:'-6,-7 8,0 -6,7', fill,
    stroke:'#0d1a12','stroke-width':1, transform:`scale(${arrowScale})`,
    style:'pointer-events:none;'});
  arrow.appendChild(poly);
  const hitZone = el('path',{d: hitZonePath(HIT_ZONE_R_PX/view.scale, maxSafeR),
    transform:`translate(${ax},${ay}) rotate(${heading})`, fill:'transparent', style:'cursor:pointer;'});
  if(hintKey) hitZone.dataset.hint = hintKey;
  hitAction(hitZone, {click:onClick,
    hover:on=>poly.setAttribute('transform', `scale(${arrowScale*(on ? 1.5 : 1)})`)});
  parent.appendChild(hitZone);
  parent.appendChild(arrow);
}
// Mean centre of a group's surviving pieces; anchors the delete icon and steep
// warning so they don't jump.
function groupCentroid(group){
  let cx=0, cy=0, n=0;
  group.forEach(pid=>{
    const p = pieces[pid]; if(!p) return;
    const c = worldPoint(p, pieceCenterLocal(TT[p.typeId]));
    cx += c.x; cy += c.y; n++;
  });
  return n>0 ? {x:cx/n, y:cy/n} : null;
}

// Redraws the canvas. The pass order IS the z-order. Passes share one `frame`
// from beginFrame().
function render(){
  // A direct render makes any queued frame redundant.
  if(_renderRaf){ cancelAnimationFrame(_renderRaf); _renderRaf = 0; }
  if(_viewRaf){ cancelAnimationFrame(_viewRaf); _viewRaf = 0; }
  // This render settles any wheel zoom in progress.
  if(_zoomSettleTimer){ clearTimeout(_zoomSettleTimer); _zoomSettleTimer = 0; }
  // selectedPort goes stale if its port closes elsewhere; an attach would then
  // overwrite a connection.
  if(selectedPort && (!pieces[selectedPort.pieceId] || !isOpen(selectedPort.pieceId, selectedPort.portIdx))){
    selectedPort = null;
  }
  if(selectedBoxId && !tableBoxes[selectedBoxId]){
    selectedBoxId = null;
  }
  // Every zoom change arrives through here, so the ties rule and the zoom
  // readout are settled before anything draws.
  syncViewControls();
  const frame = beginFrame();
  drawTableBoxBodies(frame);
  drawJoinerWires(frame);
  drawPieceBodies(frame);
  drawTextBoxes(frame);
  drawPartLabels(frame);
  drawPortsAndArrows(frame);
  drawJoinerBolts(frame);
  drawGradientChainOverlay(frame);
  drawGradientDeleteAffordance(frame);
  drawSteepWarnings(frame);
  drawClearanceWarnings(frame);
  drawTableBoxOverlays(frame);
  drawPaletteGhost(frame);
  drawSetGhost(frame);
  drawGapFillGhost(frame);
  drawMarquee(frame);
  drawSelectedPartLabel(frame);
  updateLayoutStats(frame);
  updatePaletteStock();
  updateEmptyStart();
  refreshHoverAfterRender();
  // The palette is NOT rebuilt here: it never depends on the layout, and
  // rebuilding was ~25ms of a ~27ms frame. Anything that changes which buttons
  // exist calls renderPalette().
  renderSelection();
}

// The canvas scene, built once: <defs>, then the world <g> holding the
// tabletop underlay, the retained piece layer and the overlay (ports, arrows,
// markers, ghosts). A render refills only the underlay and overlay; the piece
// layer never leaves the DOM, since re-parenting it re-styles every piece
// (~4ms a frame at 300 pieces). The world also holds the one set of listeners
// for the per-frame hit zones (see hitAction).
let _scene = null; // {defs, world, under, over}
function getScene(){
  if(_scene && _scene.world.isConnected) return _scene;
  const defs = el('defs',{}), world = el('g',{}), under = el('g',{}), over = el('g',{});
  world.append(under, getPieceLayer(), over);
  svg.replaceChildren(defs, world);
  world.addEventListener('mousedown', ev=>{ const a = hitActionOf(ev); if(a){ ev.stopPropagation(); if(a.down) a.down(ev); } });
  world.addEventListener('click', ev=>{
    const a = hitActionOf(ev);
    if(!a) return;
    ev.stopPropagation();
    a.click(ev);
  });
  world.addEventListener('mouseover', ev=>{ const a = hitActionOf(ev); if(a && a.hover) a.hover(true); });
  world.addEventListener('mouseout', ev=>{ const a = hitActionOf(ev); if(a && a.hover) a.hover(false); });
  _scene = {defs, world, under, over};
  _worldG = world;
  return _scene;
}
// Port and arrow hit zones are rebuilt every frame, one per open port or arrow,
// so they carry no listeners of their own: data-act indexes this frame's
// actions, {click, hover(on)}, and the scene's listeners dispatch.
let _hitActions = [];
function hitAction(zone, action){
  zone.dataset.act = _hitActions.push(action) - 1;
}
function hitActionOf(ev){
  const zone = ev.target instanceof Element && ev.target.closest('[data-act]');
  return zone ? _hitActions[zone.dataset.act] : null;
}

// Culling. A render draws only what's in the covered area: the visible canvas
// plus CULL_MARGIN of its size on every side (pieces, and their ports and
// arrows). A view frame (pan, wheel zoom) doesn't redraw, so it re-renders
// once the view comes within half that margin of the covered area's edge.
const CULL_MARGIN = 0.5;
let _cover = null, _coverCanvas = {w:0, h:0}; // the last render's covered area, and the canvas size it used
function coveredRect(margin, w, h){
  if(!w || !h) return {minX:-Infinity, maxX:Infinity, minY:-Infinity, maxY:Infinity}; // not laid out yet: cull nothing
  const s = view.scale, mx = w*margin, my = h*margin;
  return {minX:(-mx-view.x)/s, maxX:(w+mx-view.x)/s, minY:(-my-view.y)/s, maxY:(h+my-view.y)/s};
}
// Uses the last render's canvas size: reading it here would force a layout on
// every view frame.
function viewNearCoverEdge(){
  if(!_cover) return true;
  const r = coveredRect(CULL_MARGIN/2, _coverCanvas.w, _coverCanvas.h);
  return r.minX<_cover.minX || r.maxX>_cover.maxX || r.minY<_cover.minY || r.maxY>_cover.maxY;
}

function beginFrame(){
  const {defs, world, under, over} = getScene();
  world.setAttribute('transform', `translate(${view.x},${view.y}) scale(${view.scale})`);
  const wrap = document.getElementById('canvasWrap');
  _coverCanvas = {w:wrap.clientWidth, h:wrap.clientHeight};
  _cover = coveredRect(CULL_MARGIN, _coverCanvas.w, _coverCanvas.h);
  defs.replaceChildren();
  under.replaceChildren();
  over.replaceChildren();
  _hitActions = [];

  // Gradient Mode: the chain's pieces, all painted with the run's average tone.
  const gradientChainIds = gradientTool ? new Set(gradientTool.chain.map(c=>c.pieceId)) : null;
  const liveGradientToneColor = (gradientTool && gradientTool.chain.length>0)
    ? gradientToneColor(gradientPercentFor(gradientChainRun())) : null;
  // Every confirmed slope is coloured too; groups overlapping the chain are
  // skipped. The slope graph is walked once per frame.
  const slopeGroups = findAllSlopeGroups();
  const existingSlopeToneById = new Map();
  if(gradientTool){
    slopeGroups.forEach(group=>{
      if(gradientChainIds && [...group].some(id=>gradientChainIds.has(id))) return;
      const color = gradientToneColor(slopeGroupPercent(group));
      group.forEach(id=>existingSlopeToneById.set(id, color));
    });
  }
  // Normal view: only a warning marker on groups at or past gradientRedPct.
  const overSteepGroups = gradientTool ? [] : slopeGroups.filter(g=>slopeGroupPercent(g)>=gradientRedPct);
  const slopeRangeById = slopeGroupRanges(slopeGroups);

  // Marquee preview: what WOULD be selected, using the commit's own test.
  // selectedPieces only changes at mouseup.
  let previewSelected = null;
  if(aiming && (gradientTool || gapFill)) setAiming(false); // their keys mean other things
  if(aiming) aimCrosshair.classList.toggle('marquee', !!(boxSelect && boxSelect.aimed));
  if(boxSelect){
    if(boxSelect.aimed) aimMarqueeFollow();
    const pminX=Math.min(boxSelect.x0,boxSelect.x1), pmaxX=Math.max(boxSelect.x0,boxSelect.x1);
    const pminY=Math.min(boxSelect.y0,boxSelect.y1), pmaxY=Math.max(boxSelect.y0,boxSelect.y1);
    previewSelected = new Set(piecesInWorldRect(pminX, pminY, pmaxX, pmaxY));
    if(boxSelect.additive) boxSelect.baseSelection.forEach(id=>{
      if(pieces[id]) previewSelected.add(id);
    });
  }

  return {
    // `world` is the overlay every pass after the pieces draws into; `under`
    // is below the pieces, for tabletop bodies.
    defs, world:over, under, previewSelected,
    // Culling: the covered area, and the pieces drawn in it (drawPieceBodies
    // fills this; later passes draw only for these).
    cover:_cover, drawnIds:new Set(),
    // Every piece's world box {x0, x1, y0, y1}, drawn or not (drawPieceBodies).
    extents:new Map(),
    overLimit: limitedMode ? overLimitPieceIds() : new Set(),
    gradientChainIds, liveGradientToneColor, existingSlopeToneById, overSteepGroups, slopeRangeById,
    // Power View's joints from a feeder by piece; null when it's off or
    // Gradient Mode is colouring the track.
    powerById: powerView && !gradientTool ? powerDistances() : null,
    gradientReach: gradientTool && gradientTool.chain.length ? gradientReach() : null,
    totalLen: 0,
    // Everything drawn, tabletops included (panning limits, fitting the view),
    // and the track alone (the footprint stat).
    bounds: {minX:Infinity, maxX:-Infinity, minY:Infinity, maxY:-Infinity},
    trackBounds: {minX:Infinity, maxX:-Infinity, minY:Infinity, maxY:-Infinity},
    // The single selected piece's world box, for the part-code label; the ports
    // pass may raise its top.
    selectedPieceBox: null,
  };
}

// Tabletops first, so track on them paints and hit-tests on top.
// The outline of the union of every tabletop, so touching or overlapping ones
// read as one surface (looks only: each box still moves, resizes and locks on
// its own). Box edges within TABLE_MERGE_MM of each other count as the same
// line, so a near-miss joins instead of leaving a hairline. Coordinates are
// compressed to a grid of cells; an outline edge is wherever a covered cell
// meets an uncovered one. Returns {solid, dashed} SVG path data: dashed where
// the inside cell has an unlocked box, solid where only locked ones.
const TABLE_MERGE_MM = 1;
// Tabletop snapping, within TABLE_SNAP_PX on screen. A moved box first snaps
// flush against a neighbour's facing edge (the two touch); then, against that
// same neighbour, its other axis snaps so the corners meet (edges aligned, or
// corner to corner). A resized box snaps each edge it moves to any
// neighbour's edge on that axis, so a corner drag can meet a corner exactly.
const TABLE_SNAP_PX = 10;
function rangesNear(a0, a1, b0, b1, tol){ return Math.max(b0-a1, a0-b1) <= tol; }
function nearestSnap(value, candidates, tol){
  let best = null;
  candidates.forEach(c=>{ const d = c-value; if(Math.abs(d)<=tol && (best===null || Math.abs(d)<Math.abs(best))) best = d; });
  return best; // offset to add, or null
}
function snapBoxMove(box, x, y){
  if(isTextBox(box)) return {x, y}; // labels go anywhere
  const tol = TABLE_SNAP_PX/view.scale, w = box.w, h = box.h;
  const others = tableOnly().filter(b=>b.id!==box.id);
  let primary = null; // {axis, d, other}
  others.forEach(o=>{
    if(rangesNear(y, y+h, o.y, o.y+o.h, tol)){
      const d = nearestSnap(x, [o.x+o.w, o.x-w], tol);
      if(d!==null && (!primary || Math.abs(d)<Math.abs(primary.d))) primary = {axis:'x', d, other:o};
    }
    if(rangesNear(x, x+w, o.x, o.x+o.w, tol)){
      const d = nearestSnap(y, [o.y+o.h, o.y-h], tol);
      if(d!==null && (!primary || Math.abs(d)<Math.abs(primary.d))) primary = {axis:'y', d, other:o};
    }
  });
  if(!primary) return {x, y};
  const o = primary.other;
  if(primary.axis==='x'){
    x += primary.d;
    const d = nearestSnap(y, [o.y, o.y+o.h-h, o.y+o.h, o.y-h], tol);
    if(d!==null) y += d;
  } else {
    y += primary.d;
    const d = nearestSnap(x, [o.x, o.x+o.w-w, o.x+o.w, o.x-w], tol);
    if(d!==null) x += d;
  }
  return {x, y};
}
function snapBoxResize(box, corner, r){
  const tol = TABLE_SNAP_PX/view.scale;
  const others = tableOnly().filter(b=>b.id!==box.id);
  let {x, y, w, h} = r;
  const east = corner.includes('e'), south = corner.includes('s');
  const xEdge = east ? x+w : x, yEdge = south ? y+h : y;
  const xs = others.filter(o=>rangesNear(y, y+h, o.y, o.y+o.h, tol)).flatMap(o=>[o.x, o.x+o.w]);
  const ys = others.filter(o=>rangesNear(x, x+w, o.x, o.x+o.w, tol)).flatMap(o=>[o.y, o.y+o.h]);
  const dx = nearestSnap(xEdge, xs, tol), dy = nearestSnap(yEdge, ys, tol);
  if(dx!==null){ if(east) w += dx; else { x += dx; w -= dx; } }
  if(dy!==null){ if(south) h += dy; else { y += dy; h -= dy; } }
  return {x, y, w, h};
}
function tableUnionOutline(boxes){
  if(!boxes.length) return {solid:'', dashed:''};
  const axis = vals=>{
    const sorted = [...new Set(vals)].sort((a,b)=>a-b), out = [];
    sorted.forEach(v=>{ if(!out.length || v-out[out.length-1] > TABLE_MERGE_MM) out.push(v); });
    const idx = v=>{ let best=0; out.forEach((u,i)=>{ if(Math.abs(u-v) < Math.abs(out[best]-v)) best=i; }); return best; };
    return {vals:out, idx};
  };
  const X = axis(boxes.flatMap(b=>[b.x, b.x+b.w])), Y = axis(boxes.flatMap(b=>[b.y, b.y+b.h]));
  const nx = X.vals.length-1, ny = Y.vals.length-1;
  // 0 uncovered, 1 locked boxes only, 2 an unlocked box
  const cell = Array.from({length:nx}, ()=>new Array(ny).fill(0));
  boxes.forEach(b=>{
    const i0=X.idx(b.x), i1=X.idx(b.x+b.w), j0=Y.idx(b.y), j1=Y.idx(b.y+b.h);
    for(let i=i0;i<i1;i++) for(let j=j0;j<j1;j++) cell[i][j] = Math.max(cell[i][j], b.locked ? 1 : 2);
  });
  const at = (i,j)=>(i<0||j<0||i>=nx||j>=ny) ? 0 : cell[i][j];
  const paths = {solid:[], dashed:[]};
  const emit = (style, x1,y1,x2,y2)=>paths[style].push(`M${x1} ${y1}L${x2} ${y2}`);
  // Vertical edges at each x line, merged along y while the style holds.
  for(let i=0;i<=nx;i++){
    let run = null;
    for(let j=0;j<=ny;j++){
      const a = j<ny ? at(i-1,j) : 0, c = j<ny ? at(i,j) : 0;
      const style = (a>0) !== (c>0) ? (Math.max(a,c)===2 ? 'dashed' : 'solid') : null;
      if(run && style!==run.style){ emit(run.style, X.vals[i], Y.vals[run.j], X.vals[i], Y.vals[j]); run = null; }
      if(style && !run) run = {style, j};
    }
  }
  for(let j=0;j<=ny;j++){
    let run = null;
    for(let i=0;i<=nx;i++){
      const a = i<nx ? at(i,j-1) : 0, c = i<nx ? at(i,j) : 0;
      const style = (a>0) !== (c>0) ? (Math.max(a,c)===2 ? 'dashed' : 'solid') : null;
      if(run && style!==run.style){ emit(run.style, X.vals[run.i], Y.vals[j], X.vals[i], Y.vals[j]); run = null; }
      if(style && !run) run = {style, i};
    }
  }
  return {solid: paths.solid.join(''), dashed: paths.dashed.join('')};
}
function drawTableBoxBodies(frame){
  const world = frame.under, b = frame.bounds;
  const strokeW = 1.5/view.scale; // constant screen width
  const union = tableUnionOutline(tableOnly());
  if(union.dashed) world.appendChild(el('path',{d:union.dashed, fill:'none', stroke:'#e8eaed', 'stroke-width':strokeW,
    'stroke-dasharray':`${5/view.scale} ${4/view.scale}`, style:'pointer-events:none;'}));
  if(union.solid) world.appendChild(el('path',{d:union.solid, fill:'none', stroke:'#e8eaed', 'stroke-width':strokeW,
    style:'pointer-events:none;'}));
  tableOnly().forEach(box=>{
    // counts toward bounds, so a box stays reachable when panning
    b.minX=Math.min(b.minX,box.x); b.maxX=Math.max(b.maxX,box.x+box.w);
    b.minY=Math.min(b.minY,box.y); b.maxY=Math.max(b.maxY,box.y+box.h);

    // Only the selected box draws its own outline (over the union's), so you
    // can see which part of a merged table it is.
    const isSelected = selectedBoxId===box.id;
    const rect = el('rect',{
      x:box.x, y:box.y, width:box.w, height:box.h,
      fill:'transparent', // 'transparent', not 'none', so the interior hit-tests
      stroke: isSelected ? SELECTION_BLUE : 'none',
      'stroke-width': strokeW,
      'stroke-dasharray': box.locked ? 'none' : `${5/view.scale} ${4/view.scale}`,
    });
    if(box.locked){
      // A locked box ignores the pointer; its padlock is the way back in.
      rect.style.pointerEvents = 'none';
    } else {
      rect.style.cursor = 'move';
      rect.dataset.hint = 't1';
      rect.addEventListener('mousedown', (ev)=>{
        if(ev.button!==0) return; // let right-drag through to the marquee
        if(!beginInteraction('boxDrag')) return;
        ev.stopPropagation(); ev.preventDefault();
        if(selectedBoxId!==box.id) selectOnlyBox(box.id);
        boxDragState = {boxId:box.id, startX:ev.clientX, startY:ev.clientY,
          startBoxX:box.x, startBoxY:box.y, moved:false};
      });
    }
    world.appendChild(rect);
  });
}

// Pieces are retained between renders: each keeps its DOM, and is redrawn
// only when its `key` (everything drawPiece and the fills read) changes. A move
// only rewrites the transform. One delegated mousedown on the layer replaces a
// listener per piece. Each piece sits in a wrapper beside its own <defs>, which
// holds its slope gradient and elevation mask.
function getPieceLayer(){
  if(!_pieceLayer){
    _pieceLayer = el('g',{});
    _pieceLayer.addEventListener('mousedown', onPieceMouseDown);
  }
  return _pieceLayer;
}
function onPieceMouseDown(ev){
  if(ev.button!==0) return;
  const g = ev.target.closest('.piece');
  const piece = g && pieces[g.dataset.id];
  if(!piece) return;
  ev.stopPropagation(); ev.preventDefault();
  if(gradientTool){
    handleGradientPieceClick(piece.id);
    return;
  }
  const now = Date.now();
  const isDoubleClick = lastPieceClick && lastPieceClick.pieceId===piece.id
    && (now-lastPieceClick.time)<DOUBLE_CLICK_MS;
  lastPieceClick = isDoubleClick ? null : {pieceId:piece.id, time:now};
  if(ev.shiftKey && !isDoubleClick){
    // Shift-click toggles; a plain click replaces the selection.
    selectedPort = null;
    if(selectedPieces.has(piece.id)){
      selectedPieces.delete(piece.id);
      invalidate();
    } else {
      // Select it, then a drag picks up the whole group.
      selectedPieces.add(piece.id);
      invalidate();
      startPieceDrag(piece.id, ev);
    }
    return;
  }
  if(isDoubleClick){
    // Flood first, so a continuing drag moves the whole flooded group.
    extendBothWays(piece.id);
  }
  startPieceDrag(piece.id, ev);
}
// How one piece looks this frame, in two parts. `fill` and `stroke` are the
// roadbed colours, set as custom properties on the piece's <g>: selection,
// Limited Mode and slope tones restyle without a redraw. `spec` is every input
// the drawing reads (buildPieceDrawing takes nothing else), and the retained
// layer's cache key is spec serialised, so a new input can't be left out of
// the key.
function pieceLook(piece, type, isSelected, frame){
  const inGradientChain = frame.gradientChainIds && frame.gradientChainIds.has(piece.id);
  const existingSlopeTone = frame.existingSlopeToneById.get(piece.id);
  const isSelectedSlope = gradientSelectedGroup && gradientSelectedGroup.has(piece.id);
  const sloped = isSlopedPiece(piece, type);
  let fill;
  if(isSelectedSlope) fill = SELECTION_BLUE;
  else if(inGradientChain) fill = frame.liveGradientToneColor;
  else if(existingSlopeTone) fill = existingSlopeTone;
  else if(!isSelected && frame.powerById && !snapsByPose(type)) fill = _power.split.has(piece.id)
    ? powerSplitFill(piece, type, frame) : powerColor(frame.powerById.get(piece.id));
  else if(!isSelected && sloped) fill = `url(#slopeFill-${piece.id})`;
  else if(!isSelected && isFlatElevatedPiece(piece, type)) fill = ROADBED_FILL_ELEVATED_FLAT;
  else fill = roadbedFillFor(type, isSelected);
  let stroke = isSelected ? SELECTION_BLUE : ROADBED_EDGE_COLOR;
  // Limited Mode: a piece beyond what's owned. Selection, Gradient Mode's and
  // Power View's colouring take precedence.
  if(frame.overLimit.has(piece.id) && !isSelected && !gradientTool && !frame.powerById){
    fill = '#6b2424'; stroke = '#ff5a5a';
  }
  const spec = {
    typeId: piece.typeId,
    portElev: piece.portElev,
    flipped: markerFlipped(piece.rot), // all drawPiece reads of the rotation: labels read upright
    ties: tiesView.shown,
    powerView: isStreetTrack(type) && !!frame.powerById, // keeps its plate's edges plain, so the colour is the track's
    lengthLabel: partLabelMode==='limited', // Printed and All draw their own labels
    // Printed: whether the label turns 180° to read upright; null when off.
    printedFlip: partLabelMode==='printed' ? markerFlipped(piece.rot + partLabelAngle(type)) : null,
    tint: !!type.noRoadbed && isSelected, // a roadbed-less piece draws its selection tint
    // A sloped piece always carries its slope gradient, whether or not this
    // frame's fill uses it. No range means the default scale.
    sloped,
    slopeRange: sloped ? frame.slopeRangeById.get(piece.id) : undefined,
    // Elevation fade, unless Gradient Mode is colouring the piece.
    fadeLevel: (inGradientChain || existingSlopeTone || isSelectedSlope) ? null : focusedLevel,
  };
  return {spec, fill, stroke};
}
// A piece's retained DOM, built from its spec alone: a wrapper holding its own
// <defs> (slope gradient, elevation mask) and then the .piece <g>, whose
// colours are the --rb-fill/--rb-stroke custom properties.
function buildPieceDrawing(id, spec){
  const type = TT[spec.typeId];
  const asPiece = {id, portElev: spec.portElev}; // what the gradient and mask helpers read
  const wrap = el('g',{}), defs = el('defs',{});
  const g = el('g',{class:'piece', 'data-id':id});
  wrap.append(defs, g);
  if(spec.sloped) buildSlopeFillGradient(asPiece, type, defs, spec.slopeRange);
  drawPiece(g, type, {roadbedFill:'var(--rb-fill)', roadbedStroke:'var(--rb-stroke)',
    railColor: type.ties || isStreetTrack(type) ? TIED_RAIL_COLOR : '#c7cdd6', worldRot: spec.flipped ? 180 : 0,
    selected: spec.tint, ties: spec.ties, powerView: spec.powerView, lengthLabel: spec.lengthLabel, printedFlip: spec.printedFlip});
  if(spec.fadeLevel===null) g.setAttribute('opacity', 1);
  else applyElevationOpacity(g, asPiece, type, defs, spec.fadeLevel);
  return wrap;
}
function drawPieceBodies(frame){
  const {previewSelected} = frame;
  const b = frame.bounds;
  const layerEl = getPieceLayer();
  _pieceNodes.forEach((node, id)=>{
    if(!pieces[id]){ node.wrap.remove(); _pieceNodes.delete(id); }
  });
  let prevWrap = null;
  // Draw order is by height: each piece's average port elevation, so slopes
  // stack by how high they are and flat elevated track (the full 50mm) is
  // always on top. At the same height, S60s go over the rest (their tapered
  // edge sits over the turnout beside them); otherwise the order placed (a
  // stable sort).
  const height = new Map(Object.values(pieces).map(p=>[p.id, meanElev(p)]));
  const cover = frame.cover;
  // A platform's roof goes over all track, whatever was placed last.
  Object.values(pieces).sort((a,b_)=>((TT[a.typeId].platform ? 1 : 0) - (TT[b_.typeId].platform ? 1 : 0))
    || (height.get(a.id)-height.get(b_.id))
    || ((TT[a.typeId].wedgeSide ? 1 : 0) - (TT[b_.typeId].wedgeSide ? 1 : 0))).forEach(piece=>{
    const type = TT[piece.typeId];
    frame.totalLen += pieceNominalLength(type);
    const isSelected = previewSelected ? previewSelected.has(piece.id) : selectedPieces.has(piece.id);

    // World extent: the type's hull, rotated into place (ports alone give
    // zero width). Every piece counts toward the bounds, drawn or not.
    const r = deg2rad(piece.rot), cos = Math.cos(r), sin = Math.sin(r);
    let pMinX=Infinity, pMaxX=-Infinity, pMinY=Infinity, pMaxY=-Infinity;
    for(const q of localPieceHull(piece.typeId)){
      const wx = piece.ox + q.x*cos - q.y*sin, wy = piece.oy + q.x*sin + q.y*cos;
      if(wx<pMinX) pMinX=wx; if(wx>pMaxX) pMaxX=wx;
      if(wy<pMinY) pMinY=wy; if(wy>pMaxY) pMaxY=wy;
    }
    frame.extents.set(piece.id, {x0:pMinX, x1:pMaxX, y0:pMinY, y1:pMaxY});
    // Not during a marquee preview, where `isSelected` follows the preview.
    if(isSelected && selectedPieces.size===1 && !previewSelected){
      frame.selectedPieceBox = {minX:pMinX, maxX:pMaxX, minY:pMinY, maxY:pMaxY};
    }
    [b, frame.trackBounds].forEach(t=>{
      t.minX=Math.min(t.minX,pMinX); t.maxX=Math.max(t.maxX,pMaxX);
      t.minY=Math.min(t.minY,pMinY); t.maxY=Math.max(t.maxY,pMaxY);
    });

    // Off the covered area: out of the DOM (its drawing kept, if it has one),
    // and no drawing work at all.
    let node = _pieceNodes.get(piece.id);
    if(pMaxX<cover.minX || pMinX>cover.maxX || pMaxY<cover.minY || pMinY>cover.maxY){
      if(node && node.wrap.isConnected) node.wrap.remove();
      return;
    }
    frame.drawnIds.add(piece.id);

    const {spec, fill, stroke} = pieceLook(piece, type, isSelected, frame);
    const key = JSON.stringify(spec);
    if(!node || node.key!==key){
      const wrap = buildPieceDrawing(piece.id, spec);
      if(node && node.wrap.isConnected) node.wrap.replaceWith(wrap);
      node = {wrap, g:wrap.lastChild, key, transform:null, hint:null, colours:null};
      _pieceNodes.set(piece.id, node);
    }
    const colours = fill+'|'+stroke;
    if(node.colours!==colours){
      node.g.style.setProperty('--rb-fill', fill);
      node.g.style.setProperty('--rb-stroke', stroke);
      node.colours = colours;
    }
    const transform = `translate(${piece.ox},${piece.oy}) rotate(${piece.rot})`;
    if(node.transform!==transform){ node.g.setAttribute('transform', transform); node.transform = transform; }
    const hint = pieceHintKey(piece, type, isSelected, frame);
    if(node.hint!==hint){ node.g.dataset.hint = hint; node.hint = hint; }
    // Keep the drawn pieces' DOM order equal to draw order, moving (or
    // re-inserting) only what's out of place.
    const expected = prevWrap ? prevWrap.nextSibling : layerEl.firstChild;
    if(node.wrap!==expected) layerEl.insertBefore(node.wrap, expected);
    prevWrap = node.wrap;
  });

}

// Drawn after every body so no neighbour buries them.
function drawPortsAndArrows(frame){
  const {world, previewSelected, selectedPieceBox, drawnIds} = frame;
  Object.values(pieces).forEach(piece=>{
    if(!drawnIds.has(piece.id)) return; // culled
    const isSelected = previewSelected ? previewSelected.has(piece.id) : selectedPieces.has(piece.id);
    const ports = getPorts(TT[piece.typeId]);
    // Arrows this piece will show, computed first so each target can clamp
    // against the others. None mid-drag, and none while ports are hidden
    // (portsView covers the flood arrows too; , and . still flood).
    const arrowCandidates = (dragState || !portsView.shown) ? [] : ports.map((pp,idx)=>{
      const nb = getConnectedNeighbor(piece.id, idx);
      if(!(isSelected && nb && !selectedPieces.has(nb.pieceId))) return null;
      return {idx, nb, ...arrowAnchor(piece, pp)};
    }).filter(Boolean);
    // The part-code label sits where an upward arrow lands, so raise the box's
    // top to clear it.
    if(selectedPieces.size===1 && selectedPieces.has(piece.id) && !previewSelected && selectedPieceBox){
      const ARROW_CLEARANCE_PX = 26;
      const clearance = ARROW_CLEARANCE_PX/view.scale;
      arrowCandidates.forEach(c=>{
        selectedPieceBox.minY = Math.min(selectedPieceBox.minY, c.ay-clearance);
      });
    }
    ports.forEach((p, idx)=>{
      if(isOpen(piece.id, idx)){
        appendOpenPort(world, piece, ports, idx);
        return;
      }
      const cand = arrowCandidates.find(c=>c.idx===idx);
      if(!cand) return;
      let nearestOtherArrowDist = Infinity;
      arrowCandidates.forEach(oc=>{
        if(oc.idx===idx) return;
        const d = Math.hypot(oc.ax-cand.ax, oc.ay-cand.ay);
        if(d<nearestOtherArrowDist) nearestOtherArrowDist = d;
      });
      const maxSafeR = isFinite(nearestOtherArrowDist) ? nearestOtherArrowDist/2 : Infinity;
      appendArrowTarget(world, cand, '#ffb347', maxSafeR, ()=>{ selectBeyond(cand.nb.pieceId); invalidate(); }, 'c7');
    });
  });
}
function appendOpenPort(world, piece, ports, idx){
  const p = ports[idx];
  const wp = worldPoint(piece,p);
  const isSel = selectedPort && selectedPort.pieceId===piece.id && selectedPort.portIdx===idx;
  const isSnapSource = (dragState && dragState.snapTarget && dragState.snapTarget.sourcePieceId===piece.id
      && dragState.snapTarget.sourcePortIdx===idx)
    || (dragState && dragState.loopClosures && dragState.loopClosures.some(c=>c.sourcePieceId===piece.id && c.sourcePortIdx===idx));
  const isSnapTarget = (dragState && dragState.snapTarget && dragState.snapTarget.pieceId===piece.id
      && dragState.snapTarget.portIdx===idx)
    || (dragState && dragState.loopClosures && dragState.loopClosures.some(c=>c.pieceId===piece.id && c.portIdx===idx))
    || (paletteDrag && paletteDrag.snapTarget && paletteDrag.snapTarget.pieceId===piece.id
      && paletteDrag.snapTarget.portIdx===idx);
  // Hidden ports (portsView) keep only the feedback: the selected port and
  // snap highlights.
  if(!portsView.shown && !isSel && !isSnapSource && !isSnapTarget) return;
  const baseR = ((isSnapTarget||isSnapSource)?10:(isSel?9:6.5))/view.scale;
  const c = el('circle',{cx:wp.x, cy:wp.y, r: baseR,
    fill: isSnapTarget?'#ff5a5a':(isSnapSource?'#ffb347':(isSel?SELECTION_BLUE:'#3ddc84')),
    stroke:'#0d1a12', 'stroke-width':1.5/view.scale, style:'cursor:pointer;pointer-events:none;'});
  world.appendChild(c);
  // Fixed-screen-size target; the dot grows 1.5× on entering it. Clamped to
  // half the distance to the nearest other port so targets never overlap.
  let nearestOtherPortDist = Infinity;
  ports.forEach((op, oidx)=>{
    if(oidx===idx) return;
    const owp = worldPoint(piece, op);
    const d = Math.hypot(owp.x-wp.x, owp.y-wp.y);
    if(d<nearestOtherPortDist) nearestOtherPortDist = d;
  });
  const maxSafeR = isFinite(nearestOtherPortDist) ? nearestOtherPortDist/2 : Infinity;
  const heading = worldHeading(piece, p.heading);
  // rotate(heading) aligns the hit zone's +x with the port's outward heading
  const hitZone = el('path',{
    d: hitZonePath(HIT_ZONE_R_PX/view.scale, maxSafeR),
    transform:`translate(${wp.x},${wp.y}) rotate(${heading})`,
    fill:'transparent', style:'cursor:pointer;', 'data-hint': isSel ? 'c6' : 'c5'});
  hitAction(hitZone, {
    hover:on=>c.setAttribute('r', baseR*(on ? 1.5 : 1)),
    click:ev=>{
      if(blocksOtherEditing()) return;
      // Shift+click a second end: fill the gap between it and the selected one.
      if(ev && ev.shiftKey && selectedPort && !(selectedPort.pieceId===piece.id && selectedPort.portIdx===idx)){
        startGapFill(selectedPort, {pieceId:piece.id, portIdx:idx});
        return;
      }
      const now = Date.now();
      const isDoubleClick = lastPortClick && lastPortClick.pieceId===piece.id && lastPortClick.portIdx===idx
        && (now-lastPortClick.time)<DOUBLE_CLICK_MS;
      lastPortClick = isDoubleClick ? null : {pieceId:piece.id, portIdx:idx, time:now};
      if(isDoubleClick){
        duplicateAtPort(piece.id, idx);
      } else {
        selectPort(piece.id, idx);
      }
    },
  });
  world.appendChild(hitZone);
}
// Chain in progress: forward and backward (darker) arrows at the tip, plus the
// confirm tick.
function drawGradientChainOverlay(frame){
  const {world} = frame;
  if(!(gradientTool && gradientTool.chain.length>0)) return;
  gradientArrowCandidates().forEach(cand=>{
    const piece = pieces[cand.pieceId];
    const port = getPorts(TT[piece.typeId])[cand.portIdx];
    appendArrowTarget(world, arrowAnchor(piece, port), cand.kind==='backward' ? '#8a4fd1' : '#b967ff',
      Infinity, ()=>handleGradientArrowClick(cand), cand.kind==='backward' ? 'g5' : 'g4');
  });
  // The confirm tick beside the tip; the cancel cross, which drops the chain
  // but stays in Gradient Mode (Delete does the same), on the start piece,
  // marking where the slope begins, on the other side of the track.
  const besidePiece = (id, dy)=>{ const p = pieces[id], c = pieceCenterLocal(TT[p.typeId]); return worldPoint(p, {x:c.x, y:c.y+dy}); };
  appendIconButton(world, besidePiece(gradientTool.chain[gradientTool.chain.length-1].pieceId, -24), 12, '#3ddc84',
    {d:'M -5,0 L -1.5,4 L 5,-4', w:2.2, join:true}, 'g6', confirmGradient);
  appendIconButton(world, besidePiece(gradientTool.chain[0].pieceId, 24), 12, '#e05a5a',
    {d:'M -4,-4 L 4,4 M 4,-4 L -4,4', w:2.2}, 'g11', clearGradientChain);
}
// A round button at world point `at`, constant on screen: radius `r`, `fill`,
// and a glyph stroked over it (`d`, its width `w`, round joins if `join`).
function appendIconButton(world, at, r, fill, glyph, hint, onClick){
  const g = el('g',{transform:`translate(${at.x},${at.y}) scale(${1/view.scale})`, style:'cursor:pointer;', 'data-hint':hint});
  g.appendChild(el('circle',{cx:0,cy:0,r, fill, stroke:'#0d1a12','stroke-width':1.5}));
  g.appendChild(el('path',{d:glyph.d, stroke:'#0d1a12','stroke-width':glyph.w,
    fill:'none','stroke-linecap':'round', ...(glyph.join ? {'stroke-linejoin':'round'} : {}), style:'pointer-events:none;'}));
  g.addEventListener('mousedown', ev=>{ ev.stopPropagation(); });
  g.addEventListener('click', ev=>{ ev.stopPropagation(); onClick(); });
  world.appendChild(g);
}
// Idle Gradient Mode: a delete button (a bin) at the selected slope's centroid.
function drawGradientDeleteAffordance(frame){
  if(!(gradientTool && gradientTool.chain.length===0 && gradientSelectedGroup && gradientSelectedGroup.size>0)) return;
  const centre = groupCentroid(gradientSelectedGroup);
  if(!centre) return;
  appendIconButton(frame.world, centre, 14, '#e05a5a',
    {d:'M -5,-5 L 5,-5 M -3,-5 L -3,-7 L 3,-7 L 3,-5 M -4,-5 L -3.3,5 L 3.3,5 L 4,-5', w:1.4, join:true},
    'g7', ()=>deleteSlopeGroup(gradientSelectedGroup));
}
// Clearance: where one track passes over another, the gap between them must be
// the full GRADIENT_TARGET_MM (a train fits under), or they're at the same
// height (a crossing). Anything between is flagged with a warning triangle;
// nothing is refused.
//
// A type's footprint, measured once: its roadbed outlines as polygons, and
// points every CLEARANCE_SAMPLE_MM along its rails. Two pieces overlap where a
// rail point of one lies inside the other's roadbed. The true outline is used,
// not the convex hull, which would claim the inside of every curve.
const CLEARANCE_SAMPLE_MM = 4;
const CLEARANCE_EPS_MM = 0.5; // gaps this small count as the same height
const _footprintCache = new Map();
function typeFootprint(typeId){
  let fp = _footprintCache.get(typeId);
  if(fp) return fp;
  const probe = el('path',{}), measureSvg = getIconMeasureSvg();
  measureSvg.appendChild(probe);
  const polys = [], railPts = [];
  pieceGraphics(TT[typeId]).forEach(seg=>{
    /** @type {any} the outline's points, and its `box` */
    const poly = [];
    pathVertices(seg.roadbed, (x,y)=>poly.push({x,y}), d=>{
      probe.setAttribute('d', d);
      const len = probe.getTotalLength(), n = Math.max(8, Math.ceil(len));
      for(let i=0;i<=n;i++){ const q = probe.getPointAtLength(len*i/n); poly.push({x:q.x, y:q.y}); }
    });
    if(poly.length>=3){
      poly.box = poly.reduce((b,p)=>({x0:Math.min(b.x0,p.x), x1:Math.max(b.x1,p.x), y0:Math.min(b.y0,p.y), y1:Math.max(b.y1,p.y)}),
        {x0:Infinity, x1:-Infinity, y0:Infinity, y1:-Infinity});
      polys.push(poly);
    }
    (seg.rails||[]).forEach(d=>{
      probe.setAttribute('d', d);
      const len = probe.getTotalLength(), n = Math.max(1, Math.round(len/CLEARANCE_SAMPLE_MM));
      for(let i=0;i<=n;i++){ const q = probe.getPointAtLength(len*i/n); railPts.push({x:q.x, y:q.y}); }
    });
  });
  measureSvg.removeChild(probe);
  fp = {polys, railPts};
  _footprintCache.set(typeId, fp);
  return fp;
}
function pointInPoly(p, poly){
  const b = poly.box;
  if(b && (p.x<b.x0 || p.x>b.x1 || p.y<b.y0 || p.y>b.y1)) return false;
  let inside = false;
  for(let i=0, j=poly.length-1; i<poly.length; j=i++){
    const a = poly[i], b = poly[j];
    if((a.y>p.y)!==(b.y>p.y) && p.x < (b.x-a.x)*(p.y-a.y)/(b.y-a.y) + a.x) inside = !inside;
  }
  return inside;
}
const toLocal = (piece, w)=>{
  const r = deg2rad(piece.rot), dx = w.x-piece.ox, dy = w.y-piece.oy;
  return {x: dx*Math.cos(r) + dy*Math.sin(r), y: -dx*Math.sin(r) + dy*Math.cos(r)};
};
// A piece's height at a local point: flat pieces are one height; a sloped
// one is interpolated between its two sides by how far along it the point is.
function pieceElevAt(piece, type, lp){
  const e = piece.portElev, groups = gradeablePortGroups(type);
  if(!groups || e.every(v=>v===e[0])) return e.reduce((s,v)=>s+v, 0)/e.length;
  const ports = getPorts(type), mid = g=>({x:g.reduce((s,i)=>s+ports[i].x,0)/g.length, y:g.reduce((s,i)=>s+ports[i].y,0)/g.length});
  const A = mid(groups[0]), B = mid(groups[1]), ab = {x:B.x-A.x, y:B.y-A.y};
  const t = Math.max(0, Math.min(1, ((lp.x-A.x)*ab.x + (lp.y-A.y)*ab.y) / (ab.x*ab.x + ab.y*ab.y)));
  const eA = e[groups[0][0]], eB = e[groups[1][0]];
  return eA + t*(eB-eA);
}
// Every pair of drawn pieces where one crosses the other with too little
// clearance: {x, y} (the middle of the offending overlap) and the smallest gap.
// Pieces joined to each other only meet end to end, so they're skipped; the
// result is kept until a piece moves, changes height or joins (`_clearance`).
// `extents`: each piece's world box, from the frame.
let _clearance = {sig:null, out:[]};
function clearanceConflicts(ids, extents){
  let sig = '';
  ids.forEach(id=>{ const p = pieces[id]; sig += `${id}:${p.typeId}:${p.ox}:${p.oy}:${p.rot}:${p.portElev.join(',')};`; });
  sig += Object.keys(connections).length;
  if(sig===_clearance.sig) return _clearance.out;
  _clearance = {sig, out:computeClearanceConflicts(ids, extents)};
  return _clearance.out;
}
const joinedTo = (a, b)=>getPorts(pieceType(a)).some((_,i)=>{ const nb = getConnectedNeighbor(a, i); return nb && nb.pieceId===b; });
function computeClearanceConflicts(ids, extents){
  const list = [...ids], box = list.map(id=>{
    const e = pieces[id].portElev;
    return {...extents.get(id), lo:Math.min(...e), hi:Math.max(...e)};
  });
  // Two pieces on the ground can't clash, so every pair checked has a raised
  // piece: a ground piece is paired only with the raised ones after it.
  const raised = list.map((_, i)=>i).filter(i=>box[i].hi>CLEARANCE_EPS_MM);
  const out = [];
  list.forEach((a, i)=>{
    const ba = box[i];
    const later = ba.hi>CLEARANCE_EPS_MM ? Array.from({length:list.length-i-1}, (_, k)=>i+1+k) : raised.filter(j=>j>i);
    for(const j of later){
      const b = list[j], bb = box[j];
      if(ba.x1<bb.x0 || bb.x1<ba.x0 || ba.y1<bb.y0 || bb.y1<ba.y0) continue;
      // Heights that can't come within the danger band anywhere.
      if(ba.lo-bb.hi >= GRADIENT_TARGET_MM || bb.lo-ba.hi >= GRADIENT_TARGET_MM) continue;
      if(joinedTo(a, b)) continue;
      const pa = pieces[a], pb = pieces[b], ta = TT[pa.typeId], tb = TT[pb.typeId];
      let sx = 0, sy = 0, n = 0, gap = Infinity;
      const check = (src, srcT, dst, dstT, db)=>{
        const r = deg2rad(src.rot), c = Math.cos(r), s = Math.sin(r), polys = typeFootprint(dst.typeId).polys;
        typeFootprint(src.typeId).railPts.forEach(q=>{
          const w = {x:src.ox + q.x*c - q.y*s, y:src.oy + q.x*s + q.y*c};
          if(w.x<db.x0 || w.x>db.x1 || w.y<db.y0 || w.y>db.y1) return;
          const ld = toLocal(dst, w);
          if(!polys.some(poly=>pointInPoly(ld, poly))) return;
          const d = Math.abs(pieceElevAt(src, srcT, q) - pieceElevAt(dst, dstT, ld));
          if(d<=CLEARANCE_EPS_MM || d>=GRADIENT_TARGET_MM-CLEARANCE_EPS_MM) return;
          sx += w.x; sy += w.y; n++; gap = Math.min(gap, d);
        });
      };
      check(pa, ta, pb, tb, bb); check(pb, tb, pa, ta, ba);
      if(n) out.push({x:sx/n, y:sy/n, gap});
    }
  });
  return out;
}
// A yellow warning triangle at world (x, y), constant on screen, with a
// tooltip. It takes the pointer, for its hover hint and tooltip.
function appendWarningTriangle(world, x, y, hint, title){
  const warnG = el('g',{transform:`translate(${x},${y}) scale(${1/view.scale})`, style:'pointer-events:auto;', 'data-hint':hint});
  warnG.appendChild(el('path',{d:'M 0,-13 L 11,9 L -11,9 Z',
    fill:'#f0c04a', stroke:'#0d1a12','stroke-width':1.5,'stroke-linejoin':'round'}));
  warnG.appendChild(el('path',{d:'M 0,-4.5 L 0,2', stroke:'#0d1a12','stroke-width':2,'stroke-linecap':'round'}));
  warnG.appendChild(el('circle',{cx:0,cy:5.5,r:1.1,fill:'#0d1a12'}));
  const titleEl = el('title',{});
  titleEl.textContent = title;
  warnG.appendChild(titleEl);
  world.appendChild(warnG);
}
function drawClearanceWarnings(frame){
  clearanceConflicts(frame.drawnIds, frame.extents).forEach(({x, y, gap})=>appendWarningTriangle(frame.world, x, y, 'c11',
    tr('clearance.warning.title', fmtLen(gap), fmtLen(GRADIENT_TARGET_MM))));
}
// On steep slope groups, above the centroid, clear of the track: the
// triangle takes the pointer, which would block dragging the track under it.
function drawSteepWarnings(frame){
  frame.overSteepGroups.forEach(group=>{
    const centre = groupCentroid(group);
    if(centre) appendWarningTriangle(frame.world, centre.x, centre.y - 22, 'c9', tr('gradient.steepWarning.title', gradientRedPct));
  });
}
function drawTableBoxOverlays(frame){
  const {world} = frame;
  Object.values(tableBoxes).forEach(box=>{
    if(isTextBox(box)){ drawTextBoxOverlay(world, box); return; }
    const isSelected = selectedBoxId===box.id;
    if(box.locked){
      // A locked box's padlock sits at its top-left corner; clicking unlocks
      // and selects.
      appendPadlockIcon(world, box.x, box.y, true, ()=>{
        if(blocksOtherEditing()) return;
        pushHistory();
        box.locked = false;
        selectOnlyBox(box.id);
        scheduleAutosave();
      });
    } else if(isSelected){
      appendDimensionLabel(world, box, 'w');
      appendDimensionLabel(world, box, 'h');
      const HANDLE_R = 5/view.scale;
      const corners = [
        {corner:'nw', x:box.x,       y:box.y},
        {corner:'ne', x:box.x+box.w, y:box.y},
        {corner:'sw', x:box.x,       y:box.y+box.h},
        {corner:'se', x:box.x+box.w, y:box.y+box.h},
      ];
      const CURSOR_FOR_CORNER = {nw:'nwse-resize', se:'nwse-resize', ne:'nesw-resize', sw:'nesw-resize'};
      corners.forEach(({corner,x,y})=>{
        const handle = el('rect',{
          x:x-HANDLE_R, y:y-HANDLE_R, width:HANDLE_R*2, height:HANDLE_R*2,
          fill:SELECTION_BLUE, stroke:'#0d1a12', 'stroke-width':1/view.scale, 'data-hint':'t2',
        });
        handle.style.cursor = CURSOR_FOR_CORNER[corner];
        handle.addEventListener('mousedown',(ev)=>{
          if(ev.button!==0) return;
          if(!beginInteraction('boxResize')) return;
          ev.stopPropagation(); ev.preventDefault();
          boxResizeState = {boxId:box.id, corner, startX:ev.clientX, startY:ev.clientY,
            startBox:{x:box.x,y:box.y,w:box.w,h:box.h}, moved:false};
        });
        world.appendChild(handle);
      });
      const edge = boxHoverEdge || 'top';
      const lockPos = {
        top:    {x:box.x+box.w/2, y:box.y},
        bottom: {x:box.x+box.w/2, y:box.y+box.h},
        left:   {x:box.x,         y:box.y+box.h/2},
        right:  {x:box.x+box.w,   y:box.y+box.h/2},
      }[edge];
      appendPadlockIcon(world, lockPos.x, lockPos.y, false, ()=>{
        pushHistory();
        box.locked = true;
        selectedBoxId = null;
        boxHoverEdge = null;
        invalidate();
        scheduleAutosave();
      });
    }
  });
}

// Palette ghost: shown already snapped when it has a target, exactly where the
// drop lands.
// Drag previews (palette piece, set) are built once and then only moved: each
// render re-appends the kept drawing with a new transform. It's rebuilt only
// when `key` (what the drawing itself shows) changes. Building anew each
// frame cost ~1.7 ms per mask (a #4 turnout has several), so a V4 set dragged
// at ~20 ms a frame. The drawing lives on the drag's own state object, so it
// goes when the drag ends.
function keptGhost(holder, slot, key, build){
  const kept = holder._ghosts || (holder._ghosts = {});
  if(!kept[slot] || kept[slot].key!==key) kept[slot] = {key, node:build()};
  return kept[slot].node;
}
function drawPaletteGhost(frame){
  const {world} = frame;
  if(paletteDrag && paletteDrag.moved && paletteDrag.worldX!=null){
    const type = TT[paletteDrag.typeId];
    const attached = !!paletteDrag.snapTarget;
    const opacity = attached ? '0.85' : '0.55';
    // `slot`: a bundle shows two ghosts (partner, then bumper), each kept apart.
    const drawGhostAt = (pieceType, placement, slot)=>{
      const ghost = keptGhost(paletteDrag, slot, `${pieceType.id}|${attached}|${markerFlipped(placement.rot)}`, ()=>{
        const g = el('g',{opacity, style:'pointer-events:none;'});
        drawPiece(g, pieceType, {
          roadbedFill: attached ? ROADBED_FILL_SELECTED : SELECTION_BLUE,
          roadbedStroke: SELECTION_BLUE, selected: true,
          railColor: '#e8eaed',
          worldRot: placement.rot,
        });
        return g;
      });
      ghost.setAttribute('transform', `translate(${placement.ox},${placement.oy}) rotate(${placement.rot})`);
      world.appendChild(ghost);
    };
    if(type.bundleWith){
      const partnerType = TT[type.bundleWith];
      const partnerPlacement = attached
        ? placeAttached(partnerType, 0,
            {pos:paletteDrag.snapTarget.pos, heading:paletteDrag.snapTarget.heading})
        : bundleVirtualPlacement(paletteDrag.typeId, paletteDrag.worldX, paletteDrag.worldY, paletteDrag.rot);
      const partnerPorts = getPorts(partnerType);
      const farWorld = {
        pos: worldPoint(partnerPlacement, partnerPorts[1]),
        heading: worldHeading(partnerPlacement, partnerPorts[1].heading),
      };
      const bumperPlacement = placeAttached(type, 0, farWorld);
      drawGhostAt(partnerType, partnerPlacement, 'partner');
      drawGhostAt(type, bumperPlacement, 'piece');
    } else {
      const placement = !paletteDrag.snapTarget ? freePlacementAt(type, paletteDrag.worldX, paletteDrag.worldY, paletteDrag.rot)
        : paletteDrag.snapTarget.ring ? {ox:paletteDrag.snapTarget.ox, oy:paletteDrag.snapTarget.oy, rot:paletteDrag.snapTarget.rot}
        : placeAttached(type, paletteDrag.snapTarget.sourcePortIdx,
            {pos:paletteDrag.snapTarget.pos, heading:paletteDrag.snapTarget.heading});
      drawGhostAt(type, placement, 'piece');
    }
  }
}

function drawMarquee(frame){
  const {world} = frame;
  if(boxSelect){
    const bx=Math.min(boxSelect.x0,boxSelect.x1), by=Math.min(boxSelect.y0,boxSelect.y1);
    const bw=Math.abs(boxSelect.x1-boxSelect.x0), bh=Math.abs(boxSelect.y1-boxSelect.y0);
    world.appendChild(el('rect',{x:bx, y:by, width:bw, height:bh,
      fill:SELECTION_BLUE, 'fill-opacity':'0.12', stroke:SELECTION_BLUE, 'stroke-width':1/view.scale,
      'stroke-dasharray':`${4/view.scale} ${3/view.scale}`, style:'pointer-events:none;'}));
  }
}

// Part-label mode "all": each drawn piece's part code, white with a black
// outline, horizontal on screen for readability, centred on the piece
// (pieceCenterLocal: on the track). A constant screen size up to 1.00× zoom,
// growing with the track above it; shrunk on short pieces, and left out once
// too small to read.
const PART_LABEL_PX = 14, PART_LABEL_MIN_PX = 7;
const PART_LABEL_CHAR_EM = 0.62; // approximate bold character width
// How far the piece runs from port 0, into the piece: the size its label is
// fitted to, so short pieces get smaller labels. A piece without ports (the
// turntable's pit) uses its length.
function partLabelReach(type){
  const P = getPorts(type);
  if(!P.length) return type.length || (type.roadPlate ? TWR_PLATE_LEN : 40);
  const t = deg2rad(P[0].heading + 180), ux = Math.cos(t), uy = Math.sin(t);
  const reach = Math.max(...P.map(p=>(p.x-P[0].x)*ux + (p.y-P[0].y)*uy));
  return reach >= 1 ? reach : (type.length || 40);
}
// The direction a printed label runs (local degrees): into the piece from
// port 0, averaged with the ports at the far end, so a curve's label follows
// its middle, double track runs along both tracks and a wye's sits between its
// branches. A turnout keeps to its through route (port 1). Without ports (the
// turntable's pit), level. Per type, cached.
const _partLabelAngles = new Map();
function partLabelAngle(type){
  if(_partLabelAngles.has(type.id)) return _partLabelAngles.get(type.id);
  const P = getPorts(type);
  if(!P.length) return 0;
  const inward = P[0].heading + 180, t = deg2rad(inward), ux = Math.cos(t), uy = Math.sin(t);
  const along = P.map(p=>(p.x-P[0].x)*ux + (p.y-P[0].y)*uy);
  const reach = Math.max(...along);
  let ang = inward;
  if(P.length>=2 && reach>=1){
    const far = type.cat==='turnout' ? [P[1]] : P.filter((p, i)=>along[i] > reach-5);
    let vx = ux, vy = uy;
    far.forEach(p=>{ vx += Math.cos(deg2rad(p.heading))/far.length; vy += Math.sin(deg2rad(p.heading))/far.length; });
    ang = Math.atan2(vy, vx)*180/Math.PI;
  }
  _partLabelAngles.set(type.id, ang);
  return ang;
}
// Where a piece's label may sit, best first (local coords): its centre, then
// further along the piece, a third of the way from each end and then nearer
// the ends, so a label crowded out of the middle (a curve inside a concentric
// one, whose labels sit on the same radial line) can still show. On the
// track: along the arc on a curve, otherwise along port 0 → centre → the
// farthest port.
const PART_LABEL_SPOTS = [0.5, 1/3, 2/3, 0.2, 0.8];
function partLabelSpots(type){
  const c = pieceCenterLocal(type);
  if(type.cat==='curve' && type.radius) return PART_LABEL_SPOTS.map(f=>f===0.5 ? c : curveFramePoint(type.radius, type.hand, type.angle*f, 0, 0));
  const P = getPorts(type);
  if(P.length<2) return [c];
  const far = P.reduce((a, b)=>Math.hypot(b.x-P[0].x, b.y-P[0].y) > Math.hypot(a.x-P[0].x, a.y-P[0].y) ? b : a);
  const lerp = (a, b, t)=>({x:a.x + (b.x-a.x)*t, y:a.y + (b.y-a.y)*t});
  return PART_LABEL_SPOTS.map(f=>f===0.5 ? c : f<0.5 ? lerp(P[0], c, f*2) : lerp(c, far, f*2-1));
}
// Placed longest piece first. A label that would overlap one already placed
// tries its piece's other spots (partLabelSpots), and is left out only if
// every one overlaps, so parallel tracks zoomed out don't pile up.
function drawPartLabels(frame){
  if(partLabelMode!=='all') return;
  const s = view.scale;
  const cands = [];
  frame.drawnIds.forEach(id=>{
    const piece = pieces[id], type = piece && TT[piece.typeId];
    const text = type && shortCode(type);
    if(!text) return;
    const len = partLabelReach(type), lines = partLabelLines(text), chars = longestLine(lines);
    const px = Math.min(PART_LABEL_PX*Math.max(1, s), len*s*0.85/(chars*PART_LABEL_CHAR_EM));
    if(px < PART_LABEL_MIN_PX) return;
    const k = px/10/s; // drawn at 10 units and scaled, since browsers round tiny font sizes
    cands.push({lines, len, spots:partLabelSpots(type).map(q=>worldPoint(piece, q)), k,
      hw:(chars*PART_LABEL_CHAR_EM*5 + 2)*k, hh:7*lines.length*k}); // half-extents, outline included
  });
  cands.sort((a, b)=>b.len-a.len);
  const placed = [];
  cands.forEach(c=>{
    c.at = c.spots.find(at=>!placed.some(p=>Math.abs(p.at.x-at.x) < p.hw+c.hw && Math.abs(p.at.y-at.y) < p.hh+c.hh));
    if(!c.at) return;
    placed.push(c);
    const t = el('text',{x:0, y:0, 'text-anchor':'middle', 'dominant-baseline':'central',
      transform:`translate(${c.at.x.toFixed(2)},${c.at.y.toFixed(2)}) scale(${c.k.toFixed(5)})`,
      fill:'#ffffff', stroke:'#000000', 'stroke-width':3, 'stroke-linejoin':'round', 'paint-order':'stroke',
      'font-size':10, 'font-weight':'700', 'font-family':UI_FONT,
      style:'pointer-events:none;'});
    setPartLabelText(t, c.lines, 0);
    frame.world.appendChild(t);
  });
}

// Part-code label above the single selected piece, constant screen size, drawn
// last.
function drawSelectedPartLabel(frame){
  const {world, selectedPieceBox} = frame;
  if(selectedPieces.size===1 && selectedPieceBox){
    const type = pieceType([...selectedPieces][0]);
    const labelText = shortCode(type);
    const cx =(selectedPieceBox.minX + selectedPieceBox.maxX)/2;
    const LABEL_GAP_PX = 16;
    const topWorldY = selectedPieceBox.minY;
    const labelGroup = el('g',{
      transform:`translate(${cx},${topWorldY}) scale(${1/view.scale}) translate(0,${-LABEL_GAP_PX})`,
      style:'pointer-events:none;'});
    const textEl = el('text',{x:0,y:0,'text-anchor':'middle','dominant-baseline':'middle',
      fill:'#e8eaed','font-size':'11','font-weight':'600',
      'font-family':UI_FONT});
    textEl.textContent = labelText;
    labelGroup.appendChild(textEl);
    world.appendChild(labelGroup);
    // The pill is sized to the text, so it's built after the text but inserted
    // before it.
    const bb = textEl.getBBox();
    const padX=6, padY=3;
    const rect = el('rect',{x:bb.x-padX, y:bb.y-padY, width:bb.width+padX*2, height:bb.height+padY*2,
      rx:5, ry:5, fill:'var(--sel-pill)', stroke:SELECTION_BLUE, 'stroke-width':1, 'fill-opacity':'0.92'});
    labelGroup.insertBefore(rect, textEl);
  }
}

function updateLayoutStats(frame){
  const {totalLen} = frame, {minX,maxX,minY,maxY} = frame.bounds, t = frame.trackBounds;
  document.getElementById('statPieces').textContent = /** @type {any} */ (Object.keys(pieces).length);
  document.getElementById('statLength').textContent = fmtLen(totalLen);
  // The footprint is the track's; a tabletop shows its own size.
  document.getElementById('statFootprint').innerHTML = isFinite(t.minX)
    ? `${lenValue(t.maxX-t.minX)}×${fmtLen(t.maxY-t.minY)}` : tr('stat.footprint.empty');
  contentBounds = isFinite(minX) ? {minX,maxX,minY,maxY} : null; // null: empty layout
}

// A selected tabletop's dimension label, or an input in its place while
// editing. A commit keeps the top-left corner fixed. Drawn in screen pixels,
// all of it (tag, text, input, gap from the edge) scaled by DIM_LABEL_SCALE.
const DIM_LABEL_SCALE = 1.5;
// Text width in px for a CSS font, measured on a canvas.
let _pxMeasure = null;
function measurePx(text, font){
  if(!_pxMeasure) _pxMeasure = document.createElement('canvas').getContext('2d');
  _pxMeasure.font = font;
  return _pxMeasure.measureText(text).width;
}
const DIM_LABEL_FONT = '11px system-ui,sans-serif', DIM_INPUT_FONT = '12px system-ui,sans-serif';
function appendDimensionLabel(world, box, dim){
  const value = lenValue(dim==='w' ? box.w : box.h);
  const cx = dim==='w' ? box.x+box.w/2 : box.x+box.w;
  const cy = dim==='w' ? box.y : box.y+box.h/2;
  const scale = DIM_LABEL_SCALE/view.scale;
  const editing = editingBoxDimension && editingBoxDimension.boxId===box.id && editingBoxDimension.dim===dim;
  const g = el('g', {transform:`translate(${cx},${cy}) scale(${scale})`});
  // Wide enough for the text: four digits fit the minimum, five widen it.
  const boxW = Math.max(52, Math.ceil(measurePx(fmtLen(dim==='w' ? box.w : box.h), DIM_LABEL_FONT)) + 14), boxH = 18;
  const localX = dim==='w' ? -boxW/2 : 10; // width label centred; height label offset clear of the right edge
  const localY = dim==='w' ? -boxH-8 : -boxH/2; // width label offset clear of the top edge; height label centred

  if(editing){
    // The number, then a fixed unit, in one bordered box a little wider than
    // the label, so what's being typed always shows its unit. It widens as
    // the number grows (`fit`), staying centred on a width label.
    const fo = el('foreignObject', {y:localY, height:boxH});
    const fit = ()=>{
      const need = measurePx(input.value || '0', DIM_INPUT_FONT) + measurePx(unit.textContent, DIM_INPUT_FONT) + 20; // gap, padding, border, caret
      const w = Math.max(boxW + 10, Math.ceil(need));
      fo.setAttribute('width', w);
      fo.setAttribute('x', dim==='w' ? -w/2 : localX);
    };
    const wrap = document.createElement('div');
    wrap.style.cssText = 'width:100%;height:100%;box-sizing:border-box;display:flex;align-items:center;gap:2px;padding:0 5px 0 3px;'
      +'background:var(--panel);border:1px solid var(--accent);border-radius:4px;font:'+DIM_INPUT_FONT+';';
    const input = document.createElement('input');
    input.type = 'number';
    input.min = String(lenValue(TABLE_BOX_MIN_SIZE));
    input.value = String(value);
    input.style.cssText = 'flex:1;min-width:0;height:100%;box-sizing:border-box;font:inherit;padding:0;border:none;outline:none;'
      +'appearance:textfield;-moz-appearance:textfield;' // no spinner, so four or five digits fit
      +'background:transparent;color:var(--text);text-align:right;';
    const unit = document.createElement('span');
    unit.textContent = tr('unit.'+lengthUnit);
    unit.style.cssText = 'color:var(--text-dim);user-select:none;';
    fit();
    input.addEventListener('input', fit);
    let cancelled = false;
    const commit = ()=>{
      if(cancelled) return; // Escape already cancelled; the re-render removes this focused input, which fires a blur that must not commit
      // Typed in the chosen unit, kept in mm. In inches, a change is judged at
      // the shown precision, so re-typing the shown value changes nothing.
      const n = parseFloat(input.value);
      const clamped = Number.isFinite(n) ? Math.max(TABLE_BOX_MIN_SIZE, lengthUnit==='in' ? n*MM_PER_IN : n) : null;
      if(clamped!=null && (lengthUnit==='in' ? lenValue(clamped) : clamped) !== value){
        pushHistory();
        if(dim==='w') box.w = clamped; else box.h = clamped;
        scheduleAutosave();
      }
      editingBoxDimension = null;
      endInteraction('boxDimensionEdit');
      render();
    };
    input.addEventListener('keydown', ev=>{
      ev.stopPropagation(); // keep digits, Enter and Escape away from app shortcuts
      if(ev.key==='Enter') input.blur(); // blur does the commit, so Enter and losing focus share one path
      else if(ev.key==='Escape'){ cancelled = true; editingBoxDimension = null; endInteraction('boxDimensionEdit'); render(); }
    });
    input.addEventListener('blur', commit);
    wrap.addEventListener('mousedown', ev=>{ ev.stopPropagation(); if(ev.target!==input){ ev.preventDefault(); input.focus(); } });
    wrap.append(input, unit);
    fo.appendChild(wrap);
    g.appendChild(fo);
    world.appendChild(g);
    // focus and select-all once the input is in the DOM, so typing replaces the
    // value
    setTimeout(()=>{ input.focus(); input.select(); }, 0);
    return;
  }

  const hit = el('g', {style:'cursor:pointer;', 'data-hint':'t3'});
  hit.appendChild(el('rect', {x:localX, y:localY, width:boxW, height:boxH, rx:3,
    fill:'var(--panel)', stroke:'var(--panel-border)', 'stroke-width':1}));
  const label = el('text', {x:localX+boxW/2, y:localY+boxH/2, 'text-anchor':'middle', 'dominant-baseline':'middle',
    fill:'var(--text)', 'font-size':'11', style:'user-select:none;'});
  label.textContent = fmtLen(dim==='w' ? box.w : box.h);
  hit.appendChild(label);
  hit.addEventListener('mousedown', ev=>ev.stopPropagation());
  hit.addEventListener('click', ev=>{
    ev.stopPropagation();
    if(!beginInteraction('boxDimensionEdit')) return;
    editingBoxDimension = {boxId:box.id, dim};
    render();
  });
  g.appendChild(hit);
  world.appendChild(g);
}

