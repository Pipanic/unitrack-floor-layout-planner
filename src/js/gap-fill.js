/* ============================================================
   GAP FILL
   Joins two open single-track ends with up to GAP_FILL_MAX plain pieces.
   The search runs out from both ends, up to GAP_FILL_HALF pieces each, and
   meets in the middle: two chain ends facing each other within the
   loop-closure tolerance (the play in real joiners), or an expansion track's
   reach apart on one line. The route is found flat; between ends at
   different heights it is then graded evenly from one to the other
   (`gapFillGrade`), and the steep warning flags it if it's too steep. Fills
   that cross other track at their height are dropped; the rest are ranked
   (fewest pieces, commonest parts, tightest fit), previewed one at a time,
   and placed as one undo step.
   ============================================================ */
const GAP_FILL_MAX = 6, GAP_FILL_HALF = 3;
const GAP_FILL_KEEP = 30; // results offered
// A fit this close counts as exact (floating-point error on Kato's own geometry).
const GAP_FILL_EXACT_MM = 0.05;
// With one end selected, the nearest ends within reach are tried in turn.
const GAP_FILL_REACH_MM = 1500, GAP_FILL_TARGETS = 10;
// The plain pieces a fill may use, and how uncommon each is: 0 in the basic
// packs, 1 the usual extras, 2 the odd adjusters. A fill's cost is its piece
// count first, then the sum of these.
const GAP_FILL_PARTS = {
  S248:0, S186:0, S124:0, S62:0, S64:1, S45H:1, S38:2, S33:2, S29:2,
  'R249-45R':0, 'R282-45R':0, 'R315-45R':0, 'R348-45R':0, 'R481-15R':0, 'R718-15R':0,
  'R216-45R':1, 'R216-15R':1, 'R249-15R':1, 'R282-15R':1, 'R315-15R':1, 'R348-30R':1, 'R381-30R':1, 'R183-45R':1,
  'R150-45R':2, 'R117-45R':2, 'R381-10R':2,
};
const GAP_FILL_EXPANSION = 'S78S', GAP_FILL_EXPANSION_COST = 1;
// Ends a fill can start or finish on: single track (no double track or
// turntable parts), and not a banked curve's end.
const GAP_FILL_END_CATS = new Set(['straight', 'curve', 'turnout', 'wye', 'crossing']);
let gapFill = null; // {a, b, results, idx}: the preview, while interactionMode is 'gapFill'

function gapFillEnd(end){
  const p = end && pieces[end.pieceId];
  if(!p || !isOpen(end.pieceId, end.portIdx)) return null;
  const type = TT[p.typeId], port = getPorts(type)[end.portIdx];
  if(!GAP_FILL_END_CATS.has(type.cat) || isBankedPort(type, end.portIdx)) return null;
  return {pieceId:p.id, portIdx:end.portIdx, pos:worldPoint(p, port), heading:worldHeading(p, port.heading),
    elev:p.portElev[end.portIdx], onSlope:isSlopedPiece(p, type)};
}
// A fill between different heights is a gradient, so, as in Gradient Mode,
// it can't join straight onto a slope: at least one flat piece must lie
// between two gradients.
function gapFillSlopeClash(A, B){
  return Math.abs(A.elev - B.elev) > LOOP_CLOSE_ELEV_MM && (A.onSlope || B.onSlope);
}
// Each usable piece once per way it can be entered: a straight one way, a
// curve from either end (turning left or right). `limited` keeps only
// pieces with stock left.
function gapFillMoves(limited){
  const ok = t=>TT[t] && (!limited || !stockShortfall([t], []));
  const moves = [];
  Object.entries(GAP_FILL_PARTS).forEach(([t, cost])=>{
    if(!ok(t)) return;
    const type = TT[t], P = getPorts(type), curve = type.cat==='curve';
    moves.push({t, type, P, entry:0, exit:1, cost, curve});
    if(curve) moves.push({t, type, P, entry:1, exit:0, cost, curve});
  });
  return moves;
}
// Every chain of up to `depth` moves out from an end {pos, heading}, as nodes
// {pos, heading, k, cost, move, place, parent}; the end itself is k 0. Each
// also carries its piece sequence, each curve with the way it turns, read
// outward (`out`) and inward (`back`): an A→B fill is a forward chain's `out`
// then a backward chain's `back`, the same however the fill was split.
function gapFillChains(start, moves, depth){
  const root = {pos:start.pos, heading:start.heading, k:0, cost:0, parent:null, out:'', back:''};
  const out = [root];
  let frontier = [root];
  for(let k=1;k<=depth;k++){
    const next = [];
    frontier.forEach(n=>moves.forEach(m=>{
      const place = placeAttached(m.type, m.entry, n);
      next.push({pos:worldPoint(place, m.P[m.exit]), heading:worldHeading(place, m.P[m.exit].heading),
        k, cost:n.cost+m.cost, move:m, place, parent:n,
        out:n.out + m.t + (m.curve ? ':'+m.entry : '') + ' ', back:m.t + (m.curve ? ':'+m.exit : '') + ' ' + n.back});
    }));
    out.push(...next);
    frontier = next;
  }
  return out;
}
// The fill as pieces from end A to end B, each {typeId, ox, oy, rot, aPort,
// bPort}: the port facing A's side and the one facing B's. A forward chain
// runs A to the meeting point; a backward one is walked from the meeting
// point back to B, so each of its pieces is turned round.
function gapFillParts(f, r, expansion){
  const parts = [];
  for(let n=f;n.parent;n=n.parent) parts.unshift({typeId:n.move.t, ...n.place, aPort:n.move.entry, bPort:n.move.exit});
  if(expansion) parts.push({typeId:expansion.typeId, ...expansion.place, aPort:0, bPort:1});
  for(let n=r;n.parent;n=n.parent) parts.push({typeId:n.move.t, ...n.place, aPort:n.move.exit, bPort:n.move.entry});
  return parts;
}
// Gives each part its port heights (`portElev`, as a piece has), rising or
// falling evenly by length from A's height to B's, as Gradient Mode grades a
// run; flat at A's height when the ends are level. Returns the slope in
// percent, 0 when flat.
function gapFillGrade(parts, A, B){
  const rise = Math.abs(B.elev - A.elev) > LOOP_CLOSE_ELEV_MM ? B.elev - A.elev : 0;
  const run = parts.reduce((sum, p)=>sum + pieceNominalLength(TT[p.typeId]), 0);
  let cum = 0;
  parts.forEach((p, i)=>{
    const before = A.elev + rise*cum/run;
    cum += pieceNominalLength(TT[p.typeId]);
    const after = rise && i===parts.length-1 ? B.elev : A.elev + rise*cum/run; // B's height exactly, so it joins
    p.portElev = [];
    p.portElev[p.aPort] = before;
    p.portElev[p.bPort] = after;
  });
  return Math.abs(rise)/run*100;
}
// The fills joining A to B, best first, given A's chains (reused across
// targets). `useExpansion`: whether an expansion track may close a straight
// gap.
function gapFillBetween(A, B, fwd, moves, useExpansion, limited){
  const back = gapFillChains(B, moves, GAP_FILL_HALF);
  // Backward chain ends by position (LOOP_CLOSE_RADIUS cells) and by the
  // heading a forward end must have to meet them (whole degrees).
  const cell = LOOP_CLOSE_RADIUS, grid = new Map(), K = 1<<20;
  const cellKey = (cx, cy, deg)=>(cx*K + cy)*360 + (deg + 360) % 360;
  const degOf = h=>Math.round(norm360(h)) % 360;
  back.forEach(n=>{
    const k = cellKey(Math.floor(n.pos.x/cell), Math.floor(n.pos.y/cell), degOf(n.heading + 180));
    const list = grid.get(k);
    if(list) list.push(n); else grid.set(k, [n]);
  });
  const found = new Map(); // by the fill's piece sequence, keeping its best version
  // Least joiner play first (exact fits all count as none), then fewest
  // pieces, then commonest parts. Of one sequence, the version with least play.
  const offer = (f, r, gap, expansion)=>{
    const play = gap < GAP_FILL_EXACT_MM ? 0 : gap;
    const count = f.k + r.k + (expansion ? 1 : 0), rarity = f.cost + r.cost + (expansion ? GAP_FILL_EXPANSION_COST : 0);
    const seq = f.out + (expansion ? expansion.typeId + ' ' : '') + r.back;
    const had = found.get(seq);
    if(!had || gap < had.gap) found.set(seq, {f, r, gap, play, count, rarity, expansion, seq});
  };
  fwd.forEach(f=>{
    const cx = Math.floor(f.pos.x/cell), cy = Math.floor(f.pos.y/cell), deg = degOf(f.heading);
    for(let dx=-1;dx<=1;dx++) for(let dy=-1;dy<=1;dy++) for(let dd=-1;dd<=1;dd++){
      const list = grid.get(cellKey(cx+dx, cy+dy, deg+dd));
      if(!list) continue;
      for(const r of list){
        if(f.k + r.k < 1) continue;
        const gap = Math.hypot(f.pos.x-r.pos.x, f.pos.y-r.pos.y);
        if(gap > LOOP_CLOSE_RADIUS) continue;
        if(Math.abs(headingDiff(f.heading, r.heading) - 180) > LOOP_CLOSE_HEADING) continue;
        offer(f, r, gap, null);
      }
    }
  });
  // An expansion track between two chain ends facing each other on one line,
  // 78–108mm apart. Backward ends are indexed by the line they'd continue
  // along: its direction (whole degrees) and sideways offset (whole mm).
  if(useExpansion){
    const lines = new Map(), lineKey = (deg, off)=>deg*K + off;
    const lineOf = (pos, heading)=>{
      const h = deg2rad(heading);
      return {deg:Math.round(norm360(heading)) % 360, off:Math.round(pos.y*Math.cos(h) - pos.x*Math.sin(h)),
        along:pos.x*Math.cos(h) + pos.y*Math.sin(h)};
    };
    back.forEach(r=>{
      if(r.k >= GAP_FILL_MAX) return;
      // Seen from a forward end, which faces the opposite way.
      const l = lineOf(r.pos, r.heading + 180), k = lineKey(l.deg, l.off);
      const list = lines.get(k);
      if(list) list.push(r); else lines.set(k, [r]);
    });
    const exp = TT[GAP_FILL_EXPANSION];
    fwd.forEach(f=>{
      const l = lineOf(f.pos, f.heading), h = deg2rad(f.heading), ux = Math.cos(h), uy = Math.sin(h);
      for(let dd=-1;dd<=1;dd++) for(let doff=-1;doff<=1;doff++){
        const list = lines.get(lineKey((l.deg + dd + 360) % 360, l.off + doff));
        if(!list) continue;
        for(const r of list){
          if(f.k + r.k + 1 > GAP_FILL_MAX) continue;
          if(Math.abs(headingDiff(f.heading, r.heading) - 180) > LOOP_CLOSE_HEADING) continue;
          const vx = r.pos.x-f.pos.x, vy = r.pos.y-f.pos.y, along = vx*ux + vy*uy;
          if(Math.abs(vx*uy - vy*ux) > EXPANSION_FIT_ACROSS || along < EXPANSION_MIN - 0.05 || along > EXPANSION_MAX + 0.05) continue;
          const typeId = expansionTypeId(exp.id, along);
          offer(f, r, Math.abs(along - TT[typeId].length), {typeId, f});
        }
      }
    });
  }
  const ranked = [...found.values()].sort((x, y)=>x.play - y.play || x.count - y.count || x.rarity - y.rarity || x.gap - y.gap);
  // One fill per set of pieces: reorderings of the same parts take one slot,
  // the best that fits. An expansion track counts as one whatever its length.
  /** @type {any} out: the fills, and `reason` when there are none */
  const out = [], sets = new Set();
  let crossed = 0;
  for(const m of ranked){
    const set = m.seq.split(' ').filter(Boolean).map(tok=>catalogTypeId(tok.split(':')[0])).sort().join(' ');
    if(sets.has(set)) continue;
    const expansion = m.expansion && {typeId:m.expansion.typeId, place:placeAttached(TT[m.expansion.typeId], 0, m.f)};
    const fill = {parts:gapFillParts(m.f, m.r, expansion), gap:m.gap};
    fill.pct = gapFillGrade(fill.parts, A, B);
    if(limited && stockShortfall(fill.parts.map(p=>p.typeId), [])) continue;
    if(gapFillCrosses(fill.parts, A, B)){ crossed++; continue; }
    sets.add(set);
    out.push(fill);
    if(out.length >= GAP_FILL_KEEP) break;
  }
  // Why there are none (gapFillSearch).
  if(!out.length) out.reason = !ranked.length ? 'reach' : crossed ? 'cross' : 'stock';
  return out;
}
// Whether a fill runs through other track at its height, or through itself: a
// rail point of one inside the other's roadbed, as the clearance check tests,
// with the heights read at that point (a graded fill's from its `portElev`).
// The two ends' pieces are skipped, and rail points near either end, where a
// fill leaving a turnout meets its neighbours by design.
const GAP_FILL_END_SKIP_MM = 20;
function gapFillCrosses(parts, A, B){
  const nearEnd = w=>Math.hypot(w.x-A.pos.x, w.y-A.pos.y) < GAP_FILL_END_SKIP_MM
    || Math.hypot(w.x-B.pos.x, w.y-B.pos.y) < GAP_FILL_END_SKIP_MM;
  const railWorld = p=>{
    const r = deg2rad(p.rot), c = Math.cos(r), s = Math.sin(r);
    return typeFootprint(p.typeId).railPts.map(q=>({x:p.ox + q.x*c - q.y*s, y:p.oy + q.x*s + q.y*c}));
  };
  const inside = (w, p)=>typeFootprint(p.typeId).polys.some(poly=>pointInPoly(toLocal(p, w), poly));
  const partRails = parts.map(railWorld);
  // Within the fill: pieces that aren't neighbours.
  for(let i=0;i<parts.length;i++) for(let j=i+2;j<parts.length;j++){
    if(partRails[i].some(w=>!nearEnd(w) && inside(w, parts[j]))) return true;
  }
  const box = pts=>pts.reduce((b, w)=>({x0:Math.min(b.x0,w.x), x1:Math.max(b.x1,w.x), y0:Math.min(b.y0,w.y), y1:Math.max(b.y1,w.y)}),
    {x0:Infinity, x1:-Infinity, y0:Infinity, y1:-Infinity});
  const fillBox = box(partRails.flat());
  const pad = 2*ROADBED_HALF;
  return Object.values(pieces).some(p=>{
    if(p.id===A.pieceId || p.id===B.pieceId) return false;
    const pr = railWorld(p), pb = box(pr);
    if(pb.x1 < fillBox.x0-pad || pb.x0 > fillBox.x1+pad || pb.y1 < fillBox.y0-pad || pb.y0 > fillBox.y1+pad) return false;
    const elevAt = (piece, w)=>pieceElevAt(piece, TT[piece.typeId], toLocal(piece, w));
    const sameLevel = (w, q)=>Math.abs(elevAt(p, w) - elevAt(q, w)) < GRADIENT_TARGET_MM - CLEARANCE_EPS_MM;
    if(partRails.some((rails, i)=>rails.some(w=>!nearEnd(w) && inside(w, p) && sameLevel(w, parts[i])))) return true;
    return pr.some(w=>!nearEnd(w) && parts.some(q=>inside(w, q) && sameLevel(w, q)));
  });
}
// Searches from A to each of `targets` in turn, stopping at the first with
// fills. `limited`: only pieces with stock left. Returns {B, results}, or
// {reason} for why nothing fits: 'cross' if some fill reached an end but every
// one crossed existing track, 'stock' if every one needed more of a piece than
// is spare, else 'reach' (no run of pieces lands on an end at all).
function gapFillSearch(A, targets, limited){
  const moves = gapFillMoves(limited), useExpansion = !limited || !stockShortfall([GAP_FILL_EXPANSION], []);
  const fwd = gapFillChains(A, moves, GAP_FILL_HALF);
  let reason = 'reach';
  for(const B of targets){
    const results = gapFillBetween(A, B, fwd, moves, useExpansion, limited);
    if(results.length) return {B, results};
    if(results.reason==='cross' || (results.reason==='stock' && reason==='reach')) reason = results.reason;
  }
  return {reason};
}
// Says why no fill was found. In Limited Mode the whole catalogue is tried
// too: if it has a fill, stock is the reason; if not, the reason holds
// whatever you own. `near`: the ends were the nearest to A, not chosen.
// `slopeSkipped`: ends left out because the fill would join a slope, the
// reason when nothing else came close.
function gapFillFailed(A, targets, reason, near, slopeSkipped){
  if(limitedMode && targets.length){
    const full = gapFillSearch(A, targets, false);
    reason = full.results ? 'stock' : full.reason;
  }
  if(reason==='reach' && slopeSkipped) reason = 'slope';
  flashHint(tr('gapfill.failed') + ' ' + tr('gapfill.why.'+reason, GAP_FILL_MAX, near));
  renderSelection();
}
// Starts the preview between two ends, or says why not.
function startGapFill(a, b){
  const A = gapFillEnd(a), B = gapFillEnd(b);
  if(!A || !B){ flashHint(tr('gapfill.badEnd')); renderSelection(); return; }
  if(gapFillSlopeClash(A, B)){ flashHint(tr('gapfill.slopeEnd')); renderSelection(); return; }
  const found = gapFillSearch(A, [B], limitedMode);
  if(found.results) openGapFill(A, B, found.results);
  else gapFillFailed(A, [B], found.reason, false);
}
// With one end selected (J or the button): the nearest ends it can reach,
// tried nearest first, and the first with any fill is offered. Ends at its
// own height come before any at another, so an elevated end isn't joined by a
// steep slope to ground track just below it when a level join is in reach.
// Ends a fill would join to a slope (gapFillSlopeClash) are left out.
function gapFillFromSelection(){
  if(gapFill){ endGapFill(); return; }
  if(!selectedPort){ flashHint(tr('gapfill.needEnd')); renderSelection(); return; }
  const A = gapFillEnd(selectedPort);
  if(!A){ flashHint(tr('gapfill.badEnd')); renderSelection(); return; }
  const targets = [];
  let slopeSkipped = false;
  Object.values(pieces).forEach(p=>getPorts(TT[p.typeId]).forEach((_, idx)=>{
    if(p.id===A.pieceId && idx===A.portIdx) return;
    const B = gapFillEnd({pieceId:p.id, portIdx:idx});
    if(!B) return;
    const d = Math.hypot(B.pos.x-A.pos.x, B.pos.y-A.pos.y);
    if(d > GAP_FILL_REACH_MM) return;
    if(gapFillSlopeClash(A, B)){ slopeSkipped = true; return; }
    targets.push({B, d, other:Math.abs(B.elev - A.elev) > LOOP_CLOSE_ELEV_MM});
  }));
  const nearest = targets.sort((x, y)=>x.other - y.other || x.d - y.d).slice(0, GAP_FILL_TARGETS).map(t=>t.B);
  const found = gapFillSearch(A, nearest, limitedMode);
  if(found.results) openGapFill(A, found.B, found.results);
  else gapFillFailed(A, nearest, found.reason, true, slopeSkipped);
}
function openGapFill(A, B, results){
  if(!beginInteraction('gapFill')) return;
  gapFill = {a:A, b:B, results, idx:0};
  invalidate();
}
function endGapFill(){
  gapFill = null;
  endInteraction('gapFill');
  invalidate();
}
function stepGapFill(step){
  const n = gapFill.results.length;
  gapFill.idx = (gapFill.idx + step + n) % n;
  invalidate();
}
// Places the previewed fill: its pieces at their graded heights, joined in a
// line from end A to end B, then selected.
function acceptGapFill(){
  const {a, b, results, idx} = gapFill;
  const fill = results[idx];
  if(stockBlocks(fill.parts.map(p=>p.typeId), [])) return;
  const before = snapshotState();
  let prev = {pieceId:a.pieceId, portIdx:a.portIdx};
  const ids = fill.parts.map(p=>{
    const id = 'p'+(nextId++);
    pieces[id] = makePieceObj(id, p.typeId, p.ox, p.oy, p.rot);
    pieces[id].portElev = p.portElev.slice();
    connectPorts({sourcePieceId:id, sourcePortIdx:p.aPort, pieceId:prev.pieceId, portIdx:prev.portIdx});
    prev = {pieceId:id, portIdx:p.bPort};
    return id;
  });
  connectPorts({sourcePieceId:prev.pieceId, sourcePortIdx:prev.portIdx, pieceId:b.pieceId, portIdx:b.portIdx});
  pushHistory(before);
  setSelection({ids});
  endGapFill();
  scheduleAutosave();
}
// A world point on the previewed fill.
function onGapFill(w){
  return gapFill.results[gapFill.idx].parts.some(p=>typeFootprint(p.typeId).polys.some(poly=>pointInPoly(toLocal(p, w), poly)));
}
function drawGapFillGhost(frame){
  if(!gapFill) return;
  const fill = gapFill.results[gapFill.idx];
  const ghost = keptGhost(gapFill, 'fill', String(gapFill.idx), ()=>{
    const g = el('g',{opacity:'0.85', style:'pointer-events:none;'});
    fill.parts.forEach(p=>{
      const pg = el('g',{transform:`translate(${p.ox},${p.oy}) rotate(${p.rot})`});
      drawPiece(pg, TT[p.typeId], {roadbedFill:ROADBED_FILL_SELECTED, roadbedStroke:SELECTION_BLUE, selected:true, railColor:'#e8eaed', worldRot:p.rot});
      g.appendChild(pg);
    });
    return g;
  });
  frame.world.appendChild(ghost);
}
// The hint while previewing: which fill, its parts, and how well it fits.
function gapFillHintText(){
  const fill = gapFill.results[gapFill.idx];
  const counts = new Map();
  fill.parts.forEach(p=>{
    const t = TT[p.typeId], code = t.variantOf ? `${t.partCode} (${t.length} mm)` : t.partCode;
    counts.set(code, (counts.get(code)||0) + 1);
  });
  const parts = [...counts].map(([code, n])=>`${code} ×${n}`).join(', ');
  return tr('hover.gapFill', gapFill.idx+1, gapFill.results.length, parts, fill.gap < GAP_FILL_EXACT_MM ? null : fmtLen(fill.gap, true),
    fill.pct ? fill.pct.toFixed(1) : null);
}
// The preview's keys: , and . (or < and >) step back and on through the
// fills, Enter places, Escape cancels. WASD still pans.
function gapFillKeys(e){
  if(e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key;
  if(STEP_KEY_SIGN[k]!=null){ stepGapFill(STEP_KEY_SIGN[k]); e.preventDefault(); }
  else if(k==='Enter'){ acceptGapFill(); e.preventDefault(); }
  else if(k==='Escape' || k.toLowerCase()==='j'){ endGapFill(); e.preventDefault(); }
}
// Scrolling steps through the fills; a click on the preview places it and
// anywhere else on the canvas cancels.
window.addEventListener('wheel', e=>{
  if(!gapFill || !isOverCanvas(e.clientX, e.clientY)) return;
  e.preventDefault(); e.stopImmediatePropagation();
  stepGapFill(e.deltaY<0 ? -1 : 1);
}, {passive:false, capture:true});
svg.addEventListener('mousedown', e=>{
  if(!gapFill) return;
  e.preventDefault(); e.stopPropagation();
  _gapFillSwallowClick = true;
  if(e.button===0 && onGapFill(screenToWorld(e.clientX, e.clientY))) acceptGapFill();
  else endGapFill();
}, true);
// The click that follows a handled mousedown mustn't reach a port or piece
// under the preview.
let _gapFillSwallowClick = false;
svg.addEventListener('click', e=>{
  if(!_gapFillSwallowClick) return;
  _gapFillSwallowClick = false;
  e.preventDefault(); e.stopPropagation();
}, true);
document.getElementById('gapFillBtn').addEventListener('click', gapFillFromSelection);

