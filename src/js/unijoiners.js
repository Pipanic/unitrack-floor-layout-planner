/* ============================================================
   UNIJOINERS
   Parts fitted in a joint (or on an open end), kept in `joiners` by the end
   they're on: the Terminal UniJoiner (TJ, 24-818), a feeder, and the
   Insulated UniJoiner (IJ), which stops power crossing the joint. One per
   joint. Dropped from the palette (Misc.) onto any end within SNAP_RADIUS.
   A TJ's wires are drawn under the track (they run beneath the roadbed to
   the joint) and its bolt over it, beside the track; an IJ is a crossed-out
   bolt on the joint itself. The bolt is what's clicked and dragged.
   ============================================================ */
const JOINER_RUN = 4; // mm a TJ's wires run beside the track after their corner
function joinerEnd(k){
  const i = k.lastIndexOf(':'), pieceId = k.slice(0, i), portIdx = +k.slice(i+1);
  const p = pieces[pieceId];
  return p && portIdx < getPorts(pieceType(pieceId)).length ? {pieceId, portIdx} : null;
}
function moveJoiner(from, to){
  joiners[to] = joiners[from];
  delete joiners[from];
  if(joinerFlip[from]){ joinerFlip[to] = true; delete joinerFlip[from]; }
  if(selectedJoiner===from) selectedJoiner = to;
}
// Drops joiners whose piece or end is gone (deleted, or retyped to fewer
// ends), and any Insulated UniJoiner left on an open end.
function pruneJoiners(){
  Object.keys(joiners).forEach(k=>{
    const end = joinerEnd(k);
    if(!end || (joiners[k]==='IJ' && isOpen(end.pieceId, end.portIdx))) delete joiners[k];
  });
  Object.keys(joinerFlip).forEach(k=>{ if(!isFeeder(joiners[k])) delete joinerFlip[k]; });
  if(selectedJoiner && !joiners[selectedJoiner]) selectedJoiner = null;
}
// The joiner at this end's joint, on either side, or null.
function joinerAt(pieceId, portIdx){
  const k = connKey(pieceId, portIdx);
  if(joiners[k]) return k;
  const nb = getConnectedNeighbor(pieceId, portIdx);
  return nb && joiners[connKey(nb.pieceId, nb.portIdx)] ? connKey(nb.pieceId, nb.portIdx) : null;
}
// How many joiners of a kind touch these pieces' ends (parts list, packs).
function joinersOn(ids, typeId){
  const set = new Set(ids);
  return Object.keys(joiners).filter(k=>{
    const end = joiners[k]===typeId && joinerEnd(k);
    if(!end) return false;
    const nb = getConnectedNeighbor(end.pieceId, end.portIdx);
    return set.has(end.pieceId) || (nb && set.has(nb.pieceId));
  }).length;
}
// Where a joiner at this end draws: the end's world point, and a frame whose
// +x runs along the track and +y out to a TJ's wires' side. Both are chosen
// from the joint's geometry, not which side holds the joiner, so it never
// jumps: the outer side of a double track's two ends, else the side facing
// down the screen; along, whichever way faces right (or up). `flip` puts a TJ
// on the track's other side, except on a double track, whose inner side is the
// other track (`free` says whether the choice is open).
function joinerPose(pieceId, portIdx, flip){
  const piece = pieces[pieceId], type = pieceType(pieceId), ports = getPorts(type), port = ports[portIdx];
  const at = worldPoint(piece, port);
  const h = deg2rad(worldHeading(piece, port.heading));
  let ax = Math.cos(h), ay = Math.sin(h);
  if(ax < -1e-9 || (Math.abs(ax) <= 1e-9 && ay > 0)){ ax = -ax; ay = -ay; }
  let nx = -ay, ny = ax;
  const twin = ports.find((p, i)=>i!==portIdx && headingDiff(p.heading, port.heading) < 1
    && Math.hypot(p.x-port.x, p.y-port.y) < 60);
  const out = twin ? (()=>{ const w = worldPoint(piece, twin); return (at.x-w.x)*nx + (at.y-w.y)*ny; })() : nx*0.6 + ny*0.8;
  if((out < 0) !== (!twin && !!flip)){ nx = -nx; ny = -ny; }
  return {x:at.x, y:at.y, ax, ay, nx, ny, free:!twin};
}
// A TJ's two wires, as the S62F's, each turning to run beside the track:
// nested Ls, so they never cross.
function appendJoinerWires(g, pose){
  const e = ROADBED_HALF - 1, gap = WIRE_GAP, W = WIRE_LEN, R = JOINER_RUN;
  const pt = (a, n)=>`${(pose.x + pose.ax*a + pose.nx*n).toFixed(2)},${(pose.y + pose.ay*a + pose.ny*n).toFixed(2)}`;
  /** @type {[number, number, string][]} */ ([[gap/2, W, '#4fb0ff'], [-gap/2, W+gap, '#e8eaed']]).forEach(([a, out, stroke])=>g.appendChild(el('polyline', {
    points:`${pt(a, e)} ${pt(a, e+out)} ${pt(gap/2+R, e+out)}`,
    fill:'none', stroke, 'stroke-width':1.65, 'stroke-linecap':'round', 'stroke-linejoin':'round'})));
}
// The bolt, upright: a TJ's just past its wires' corner, an IJ's on the joint.
const JOINER_BOLT_H = GAUGE*1.1;
const INSULATED_BOLT_H = ROADBED_W - 3; // an IJ's: across its track, as tall as fits
const boltHeight = typeId=>typeId==='IJ' ? INSULATED_BOLT_H : JOINER_BOLT_H;
// An IJ's bolt turns to lie across its track; a TJ's stays upright.
const joinerAngle = (pose, typeId)=>typeId==='IJ' ? Math.atan2(pose.ny, pose.nx)*180/Math.PI - 90 : 0;
const JOINER_GHOST_PX = 28; // the least on-screen height of a held joiner's bolt
const INSULATED_CROSS_COLOR = '#ff4d4d';
function joinerBoltCentre(pose, typeId){
  if(typeId==='IJ') return {x:pose.x, y:pose.y};
  const a = WIRE_GAP/2 + JOINER_RUN/2, n = ROADBED_HALF - 1 + WIRE_LEN + WIRE_GAP + JOINER_BOLT_H*0.55;
  return {x:pose.x + pose.ax*a + pose.nx*n, y:pose.y + pose.ay*a + pose.ny*n};
}
function appendJoinerBolt(g, c, selected, typeId, angle=0){
  const h = boltHeight(typeId), scale = h / BOLT_BBOX.h;
  if(selected) g.appendChild(el('circle', {cx:c.x, cy:c.y, r:h*0.62, fill:'none', stroke:SELECTION_BLUE, 'stroke-width':1.2}));
  const b = el('g', {transform:`translate(${c.x.toFixed(2)},${c.y.toFixed(2)}) rotate(${angle.toFixed(1)})`, style:'pointer-events:none;'});
  // As the feeder pieces' bolt: no outline.
  b.appendChild(el('path', {d:BOLT_PATH_D, fill:FEEDER_BOLT_COLOR,
    transform:`scale(${scale.toFixed(4)}) translate(${-(BOLT_BBOX.x+BOLT_BBOX.w/2)},${-(BOLT_BBOX.y+BOLT_BBOX.h/2)})`}));
  if(typeId==='IJ'){
    // Corner to corner of the bolt's own box.
    const rx = h*BOLT_BBOX.w/BOLT_BBOX.h/2, ry = h*0.42;
    [[-1, -1, 1, 1], [-1, 1, 1, -1]].forEach(([x1, y1, x2, y2])=>b.appendChild(el('line', {
      x1:x1*rx, y1:y1*ry, x2:x2*rx, y2:y2*ry,
      stroke:INSULATED_CROSS_COLOR, 'stroke-width':h*0.1, 'stroke-linecap':'round'})));
  }
  g.appendChild(b);
}
// A whole joiner at a pose: a TJ's wires and bolt, an IJ's crossed bolt.
function appendJoiner(g, pose, typeId, selected){
  if(isFeeder(typeId)) appendJoinerWires(g, pose);
  appendJoinerBolt(g, joinerBoltCentre(pose, typeId), selected, typeId, joinerAngle(pose, typeId));
}
// The end a joiner held at (x, y) would go on: the nearest end within
// SNAP_RADIUS whose joint has no joiner (but the one being moved). An IJ
// goes only in a joint: on an open end it would do nothing, and it would
// cover the green end.
const isFeeder = typeId=>!!TT[typeId].feeder;
// The Unitram Feeder fits only Unitram track, which includes the conversion track.
function feederFitsTrack(typeId, trackType){
  return !TT[typeId].unitram || isStreetTrack(trackType) || trackType.cat==='taper';
}
function joinerTargetAt(x, y, from, typeId){
  let best = null, bestD = SNAP_RADIUS;
  for(const id in pieces){
    const piece = pieces[id];
    if(pieceType(id).platform || !feederFitsTrack(typeId, pieceType(id))) continue; // a UniJoiner is for track
    getPorts(pieceType(id)).forEach((port, idx)=>{
      const w = worldPoint(piece, port), d = Math.hypot(w.x-x, w.y-y);
      if(d >= bestD) return;
      if(typeId==='IJ' && isOpen(id, idx)) return;
      const taken = joinerAt(id, idx);
      if(taken && taken!==from) return;
      best = connKey(id, idx); bestD = d;
    });
  }
  return best;
}
function drawJoinerWires(frame){
  const moving = joinerDrag && joinerDrag.moved ? joinerDrag.from : null;
  Object.keys(joiners).forEach(k=>{
    const end = isFeeder(joiners[k]) && k!==moving && joinerEnd(k);
    if(end) appendJoinerWires(frame.under, joinerPose(end.pieceId, end.portIdx, joinerFlip[k]));
  });
}
function drawJoinerBolts(frame){
  const moving = joinerDrag && joinerDrag.moved ? joinerDrag.from : null;
  const quiet = !!gradientTool || interactionMode!=='idle';
  Object.keys(joiners).forEach(k=>{
    const end = k!==moving && joinerEnd(k);
    if(!end) return;
    const typeId = joiners[k], pose = joinerPose(end.pieceId, end.portIdx, joinerFlip[k]), c = joinerBoltCentre(pose, typeId);
    const g = el('g', {});
    appendJoinerBolt(g, c, k===selectedJoiner, typeId, joinerAngle(pose, typeId));
    // The click and drag target: the bolt, at least a finger's width on screen.
    const zone = el('circle', {cx:c.x, cy:c.y, r:Math.max(boltHeight(typeId)*0.6, 9/view.scale), fill:'transparent',
      'data-hint':typeId==='IJ' ? 'j2' : 'j1', style:quiet ? 'pointer-events:none;' : 'cursor:grab;'});
    hitAction(zone, {click:()=>{}, down:ev=>startJoinerDrag(k, ev)});
    g.appendChild(zone);
    frame.world.appendChild(g);
  });
  // The one being placed or moved: on the end it would go to, else under the
  // pointer.
  if(joinerDrag && joinerDrag.moved && joinerDrag.worldX!=null){
    const g = el('g', {opacity:'0.8', style:'pointer-events:none;'});
    const typeId = joinerDrag.typeId, end = joinerDrag.target && joinerEnd(joinerDrag.target);
    if(end) appendJoiner(g, joinerPose(end.pieceId, end.portIdx, joinerDrag.flip), typeId, true);
    else {
      // Off any end: the whole joiner, held by its bolt (what's grabbed, and
      // what's dropped on an end), and big enough to see at any zoom.
      const k = Math.max(1, JOINER_GHOST_PX/(boltHeight(typeId)*view.scale));
      const pose = {x:0, y:0, ax:1, ay:0, nx:0, ny:1}, bolt = joinerBoltCentre(pose, typeId);
      const fig = el('g', {transform:`translate(${joinerDrag.worldX - k*bolt.x},${joinerDrag.worldY - k*bolt.y}) scale(${k})`});
      appendJoiner(fig, pose, typeId, false);
      g.appendChild(fig);
    }
    frame.world.appendChild(g);
  }
}
// From the palette (`from` null, `typeId` its kind) or an existing joiner.
function startJoinerDrag(from, ev, typeId){
  if(ev.button!==0 || blocksOtherEditing()) return;
  typeId = from ? joiners[from] : typeId;
  if(!from && limitedMode && stockShortfall([typeId], [])){ ev.preventDefault(); flashStockShort(typeId); return; }
  if(!beginInteraction('joinerDrag')) return;
  ev.preventDefault();
  joinerDrag = {from, typeId, startX:ev.clientX, startY:ev.clientY, moved:false, worldX:null, worldY:null, target:null, flip:from ? !!joinerFlip[from] : false};
}
registerGesture({active:()=>joinerDrag,
  move(e){
    if(!joinerDrag.moved && Math.hypot(e.clientX-joinerDrag.startX, e.clientY-joinerDrag.startY) > 4) joinerDrag.moved = true;
    if(!joinerDrag.moved) return;
    if(isOverCanvas(e.clientX, e.clientY)){
      const {x, y} = screenToWorld(e.clientX, e.clientY);
      joinerDrag.worldX = x; joinerDrag.worldY = y;
      joinerDrag.target = joinerTargetAt(x, y, joinerDrag.from, joinerDrag.typeId);
      // A TJ goes on the side of the track the pointer is on.
      const end = joinerDrag.target && joinerEnd(joinerDrag.target);
      if(end && isFeeder(joinerDrag.typeId)){
        const pose = joinerPose(end.pieceId, end.portIdx);
        joinerDrag.flip = pose.free && (x-pose.x)*pose.nx + (y-pose.y)*pose.ny < 0;
      }
    } else {
      joinerDrag.worldX = joinerDrag.worldY = null;
      joinerDrag.target = null;
    }
    invalidate();
  },
  end(){
    const {from, typeId, moved, target, flip} = joinerDrag;
    joinerDrag = null;
    endInteraction('joinerDrag');
    if(!moved){
      if(from) setSelection({joiner:from});
      // A palette click fits a TJ to the selected open end.
      else if(isFeeder(typeId) && selectedPort && !feederFitsTrack(typeId, pieceType(selectedPort.pieceId))) flashHint(tr('hint.feederWrongTrack', TT[typeId].label));
      else if(isFeeder(typeId) && selectedPort && !pieceType(selectedPort.pieceId).platform && !joinerAt(selectedPort.pieceId, selectedPort.portIdx)){
        pushHistory();
        const k = connKey(selectedPort.pieceId, selectedPort.portIdx);
        joiners[k] = typeId;
        setSelection({joiner:k});
      } else flashHint(tr(typeId==='IJ' ? 'hint.insulatedHow' : 'hint.joinerHow', TT[typeId].label));
    } else if(target && (target!==from || !!flip !== !!joinerFlip[from])){
      pushHistory();
      if(from){ delete joiners[from]; delete joinerFlip[from]; }
      joiners[target] = typeId;
      if(isFeeder(typeId) && flip) joinerFlip[target] = true;
      setSelection({joiner:target});
    }
    invalidate();
  },
});
// Its palette thumbnail: a short straight with the joiner at its joint.
function buildJoinerIcon(t, W=PALETTE_ICON_W, H=PALETTE_ICON_H){
  // A TJ: the track's top edge to the bolt's foot; an IJ: the track. At the
  // icon box's proportions.
  const svg = el('svg', {class:'pbtn-icon', viewBox:t.feeder ? '-32 -14 64 43' : '-28 -18 56 37', width:W, height:H});
  svg.appendChild(el('rect', {x:-30, y:-ROADBED_HALF, width:60, height:ROADBED_HALF*2, fill:'var(--ground)', stroke:'#3b4049'}));
  [-RAIL_OFF, RAIL_OFF].forEach(y=>svg.appendChild(el('line', {x1:-30, y1:y, x2:30, y2:y, stroke:'#e8eaed', 'stroke-width':1.3})));
  svg.appendChild(el('line', {x1:0, y1:-ROADBED_HALF, x2:0, y2:ROADBED_HALF, stroke:'#3b4049', 'stroke-width':1}));
  const pose = {x:0, y:0, ax:1, ay:0, nx:0, ny:1};
  if(t.feeder){
    const wires = el('g', {});
    appendJoinerWires(wires, pose);
    svg.insertBefore(wires, svg.firstChild);
  }
  appendJoinerBolt(svg, joinerBoltCentre(pose, t.id), false, t.id, joinerAngle(pose, t.id));
  return svg;
}
function createJoinerButton(t){
  const b = document.createElement('button');
  b.className = 'pbtn';
  b.dataset.typeId = t.id; // Limited Mode's stock badge
  b.dataset.hint = t.id==='IJ' ? 'p11' : 'p10';
  b.dataset.searchHay = t.id==='IJ' ? 'insulated unijoiner joiner insulator gap block isolate power 24816'
    : t.unitram ? 'unitram feeder joiner power wire 44847' : 'terminal unijoiner joiner feeder power wire 24818';
  const textWrap = document.createElement('span');
  textWrap.className = 'pbtn-text';
  textWrap.innerHTML = `${t.label}<span class="code">${formatPieceCode(t)}</span>`;
  b.appendChild(textWrap);
  const stock = document.createElement('span');
  stock.className = 'stock';
  stock.style.display = 'none';
  b.appendChild(stock);
  b.appendChild(buildJoinerIcon(t));
  b.addEventListener('mousedown', ev=>startJoinerDrag(null, ev, t.id));
  return b;
}
// The PNG's joiner marks, on the exported pieces' joints: a black arrow
// pointing at the joint from the TJ's side, a bolt at its tail; an IJ's
// crossed bolt on the joint. Sized with the labels (`fontMm`), so they read
// at any scale. A TJ's arrow is short, lengthening in steps until its bolt
// is clear of track (`items`' outlines), labels (`avoid`) and other marks,
// and its shaft crosses no track; at each length its own side is tried
// first, then the other. Failing that, the same allowing the shaft to cross
// track (a joiner between close tracks); failing that, the shortest on its
// own side.
// Returns {svg, boxes}.
const PNG_ARROW_OF_FONT = 0.9, PNG_ARROW_STEPS = 8;
function pngJoinerMarks(ids, fontMm, edge, items, avoid){
  let svg = '';
  const boxes = [];
  const polys = items.flatMap(it=>it.polys);
  const boltBox = (c, r)=>({x0:c.x-r, x1:c.x+r, y0:c.y-r, y1:c.y+r});
  const onTrack = pt=>polys.some(q=>pt.x>=q.box.x0 && pt.x<=q.box.x1 && pt.y>=q.box.y0 && pt.y<=q.box.y1 && pointInPoly(pt, q));
  const clear = b=>{
    if([...avoid, ...boxes].some(o=>b.x0<o.x1 && b.x1>o.x0 && b.y0<o.y1 && b.y1>o.y0)) return false;
    // Sampled on a 4×4 grid over the box.
    for(let i=0; i<=3; i++) for(let j=0; j<=3; j++)
      if(onTrack({x:b.x0 + (b.x1-b.x0)*i/3, y:b.y0 + (b.y1-b.y0)*j/3})) return false;
    return true;
  };
  const boltH = fontMm*1.1, s = boltH/BOLT_BBOX.h;
  const bolt = (c, fill)=>`<path d="${BOLT_PATH_D}" fill="${fill}" transform="translate(${c.x.toFixed(2)} ${c.y.toFixed(2)}) scale(${s.toFixed(4)}) translate(${-(BOLT_BBOX.x+BOLT_BBOX.w/2)} ${-(BOLT_BBOX.y+BOLT_BBOX.h/2)})"/>`;
  const box = (c, r)=>boxes.push({x0:c.x-r, x1:c.x+r, y0:c.y-r, y1:c.y+r});
  Object.keys(joiners).forEach(k=>{
    const end = joinerEnd(k);
    if(!end) return;
    const nb = getConnectedNeighbor(end.pieceId, end.portIdx);
    if(!ids.has(end.pieceId) && !(nb && ids.has(nb.pieceId))) return;
    const p = joinerPose(end.pieceId, end.portIdx, joinerFlip[k]);
    if(joiners[k]==='IJ'){
      const r = boltH*0.42;
      svg += bolt(p, '#000') + [[-1, -1, 1, 1], [-1, 1, 1, -1]].map(([x1, y1, x2, y2])=>
        `<line x1="${(p.x+x1*r).toFixed(2)}" y1="${(p.y+y1*r).toFixed(2)}" x2="${(p.x+x2*r).toFixed(2)}" y2="${(p.y+y2*r).toFixed(2)}" stroke="${INSULATED_CROSS_COLOR}" stroke-width="${(boltH*0.13).toFixed(3)}" stroke-linecap="round"/>`).join('');
      box(p, boltH*0.6);
      return;
    }
    const n0 = ROADBED_HALF + edge*2, head = fontMm*0.45;
    // `side` 1 is the TJ's own side (its wires'), -1 the other.
    const at = (n, side)=>({x:p.x + side*p.nx*n, y:p.y + side*p.ny*n});
    const fits = (len, side, crossing)=>{
      if(!crossing) for(let n=n0+head; n<len; n+=fontMm*0.3) if(onTrack(at(n, side))) return false;
      return clear(boltBox(at(len + boltH*0.65, side), boltH*0.6));
    };
    let n1 = n0 + fontMm*PNG_ARROW_OF_FONT, side = 1;
    find: for(const crossing of [false, true]) for(let i=0; i<=PNG_ARROW_STEPS; i++){
      const len = n0 + fontMm*PNG_ARROW_OF_FONT*(1 + i/2);
      for(const sd of [1, -1]) if(fits(len, sd, crossing)){ n1 = len; side = sd; break find; }
    }
    const tip = at(n0, side), tail = at(n1, side), c = at(n1 + boltH*0.65, side);
    const wing = w=>({x:tip.x + side*p.nx*head + p.ax*w*head*0.6, y:tip.y + side*p.ny*head + p.ay*w*head*0.6});
    const w1 = wing(1), w2 = wing(-1);
    svg += `<path d="M${tail.x.toFixed(2)} ${tail.y.toFixed(2)}L${tip.x.toFixed(2)} ${tip.y.toFixed(2)}M${w1.x.toFixed(2)} ${w1.y.toFixed(2)}L${tip.x.toFixed(2)} ${tip.y.toFixed(2)}L${w2.x.toFixed(2)} ${w2.y.toFixed(2)}" fill="none" stroke="#000" stroke-width="${edge.toFixed(3)}" stroke-linecap="round" stroke-linejoin="round"/>`
      + bolt(c, '#000');
    box(c, boltH*0.6); box(tip, head);
  });
  return {svg, boxes};
}

