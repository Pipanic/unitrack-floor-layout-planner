/* ============================================================
   SNAPPING & PIECE DRAG
   A drag breaks every connection crossing the group boundary, so either side
   can be grabbed. Snapping, loop closure, elevation reconciliation, and the
   drag/drop listeners.
   ============================================================ */
const SNAP_RADIUS = 20; // mm
// After the main snap, any other open port this close to another counts as an
// exact fit and connects too, so a piece dropped into a gap joins both ends.
const LOOP_CLOSE_RADIUS = 3; // mm
// …and facing each other within this much, so crossing tracks (or a viaduct
// over a ground line) aren't joined. Kato's plans need no angular slack.
const LOOP_CLOSE_HEADING = 1; // degrees
// …and at the same elevation. Only the primary snap pair gets elevation
// reconciled, so without this a drop could join an unrelated port at a
// different height.
const LOOP_CLOSE_ELEV_MM = 0.01;
// An expansion track's ends join only where they really meet (self-fit lands
// within EXPANSION_FIT_ACROSS), so one left short of a gap isn't joined across it.
const EXPANSION_JOIN_TOL = 1.1; // mm
const closeRadius = (a, b)=>(a.expansion || b.expansion) ? EXPANSION_JOIN_TOL : LOOP_CLOSE_RADIUS;

function rotateAround(x,y,px,py,deg){
  const r = deg2rad(deg);
  const dx=x-px, dy=y-py;
  return { x: px + dx*Math.cos(r) - dy*Math.sin(r), y: py + dx*Math.sin(r) + dy*Math.cos(r) };
}

// A platform's snap: long side flush against the roadbed edge of a straight
// (single or double track, not a buffer or an open-deck bridge), on whichever
// side its centre is, and free to slide along it. Parallel either way round
// within PLATFORM_SNAP_ANGLE, and the edge gap within SNAP_RADIUS, with the
// platform overlapping the straight's length at all. (cx, cy) is its centre.
// Returns the pose in the same {ring:true, ox, oy, rot} shape as the wedge's,
// so nothing is joined; `skip`: pieces to ignore (the dragged group).
const PLATFORM_SNAP_ANGLE = 30; // degrees off parallel
// Platforms and road plates are placed against track, by pose, not by port.
function snapsByPose(type){ return !!(type.platform || type.roadPlate); }
// Road plates fit together by their straight edges, so any plate lies flush
// against any straight edge it meets (roadPlateEdges): level with either end of
// that edge, at the quarter turn nearest how it's held. A quarter plate's two
// straight sides are its only ones, so it only offers those, and only to other
// plates, since track goes round its curve. Three fits are the plates' own: a
// quarter plate inside a street curve or turnout, a center plate in the notch at
// its outer corner, and a straight plate against a Unitram straight, its road
// towards the track. Its centre has to be within this of where it would sit.
const ROAD_PLATE_SNAP_RADIUS = 30; // mm
// The straight edges a plate can lie against, as [x1, y1, x2, y2, nx, ny] in the
// piece's own frame, (nx, ny) pointing out of the piece.
function roadPlateEdges(t){
  const box = (L, y0, y1)=>[[0, y1, L, y1, 0, 1], [L, y1, L, y0, 1, 0], [L, y0, 0, y0, 0, -1], [0, y0, 0, y1, -1, 0]];
  if(t.roadPlate){
    if(t.length) return box(t.length, -t.depth, 0);
    return [[0, 0, TWR_PLATE_LEN, 0, 0, 1], [0, -TWR_PLATE_LEN, 0, 0, -1, 0]];
  }
  if(t.cat==='tram' || t.cat==='taper' || t.cat==='tramcross') return box(t.length, -TRAM_HALF, TRAM_HALF);
  if(t.cat!=='tramcurve' && t.cat!=='tramturnout') return [];
  // A curve's long straight edge, its outer one, and its two square ends.
  const H = TWR_PLATE_HALF, L = TWR_PLATE_LEN, out = -twrSign(t);
  return [[0, out*H, L, out*H, 0, out], [L, -H, L, H, 1, 0], [0, -H, 0, H, -1, 0]];
}
function findRoadPlateSnapTarget(type, cx, cy, rot, skip){
  let best = null, bestDist = ROAD_PLATE_SNAP_RADIUS;
  const c = pieceCenterLocal(type), quarterPlate = !type.length;
  const length = type.length || TWR_PLATE_LEN, depth = type.depth || TWR_PLATE_LEN;
  const offer = (origin, plateRot)=>{
    const rc = rotateAround(c.x, c.y, 0, 0, plateRot);
    const dist = Math.hypot(cx - origin.x - rc.x, cy - origin.y - rc.y);
    if(dist>=bestDist - 1e-6) return; // a tie keeps the first, whatever the rounding
    bestDist = dist;
    best = {ring:true, ox:origin.x, oy:origin.y, rot:plateRot};
  };
  // Whether a plate at this turn meets an edge facing out along n with a straight side.
  const faces = (plateRot, n)=>!quarterPlate || [[-1, 0], [0, 1]].some(([sx, sy])=>{
    const s = rotateAround(sx, sy, 0, 0, plateRot);
    return s.x*n.x + s.y*n.y < -0.99;
  });
  /** @param {any} p @param {number[]} edge */
  const flushAgainst = (p, [x1, y1, x2, y2, nx, ny])=>{
    const a = worldPoint(p, {x:x1, y:y1}), b = worldPoint(p, {x:x2, y:y2}), n = rotateAround(nx, ny, 0, 0, p.rot);
    const len = Math.hypot(b.x - a.x, b.y - a.y), dx = (b.x - a.x)/len, dy = (b.y - a.y)/len;
    const edgeRot = Math.atan2(dy, dx)*180/Math.PI;
    const held = Math.round(((rot - edgeRot + 540) % 360 - 180)/90);
    const quarters = [held, held + 1, held - 1, held + 2].find(q=>faces(norm360(edgeRot + 90*q), n));
    const turned = norm360(edgeRot + 90*quarters), rc = rotateAround(c.x, c.y, 0, 0, turned);
    const lengthways = quarters%2===0, along = lengthways ? length : depth, across = lengthways ? depth : length;
    [along/2, len - along/2].forEach(s=>{
      offer({x:a.x + dx*s + n.x*across/2 - rc.x, y:a.y + dy*s + n.y*across/2 - rc.y}, turned);
    });
  };
  Object.values(pieces).forEach(p=>{
    if(skip && skip.has(p.id)) return;
    const t = TT[p.typeId], streetCurve = t.cat==='tramcurve' || t.cat==='tramturnout';
    if(streetCurve && type.centerPlate){
      // The same whichever of the corner's two curves it finds.
      const plateRot = norm360(p.rot + (twrSign(t)>0 ? 0 : 90)), rc = rotateAround(c.x, c.y, 0, 0, plateRot);
      const mid = worldPoint(p, {x:TWR_PLATE_LEN + TWR_PLATE_HALF, y:0});
      offer({x:mid.x - rc.x, y:mid.y - rc.y}, plateRot);
    }
    if(streetCurve && quarterPlate){
      const sign = twrSign(t);
      offer(worldPoint(p, {x:0, y:sign*(TWR_PLATE_LEN + TWR_PLATE_HALF)}), norm360(p.rot + (sign>0 ? 0 : 90)));
    }
    if(quarterPlate && !t.roadPlate) return;
    if(t.cat==='tram' && type.length && !type.cornerPlate && !type.centerPlate && !type.centerlinePlate){
      const off = TRAM_HALF + TWR_PLATE_LEN;
      [0, t.length - type.length].forEach(along=>{
        offer(worldPoint(p, {x:along, y:off}), norm360(p.rot));
        offer(worldPoint(p, {x:along + type.length, y:-off}), norm360(p.rot + 180));
      });
      return;
    }
    roadPlateEdges(t).forEach(edge=>flushAgainst(p, edge));
  });
  return best;
}
function findPlatformSnapTarget(type, cx, cy, rot, skip){
  if(type.roadPlate) return findRoadPlateSnapTarget(type, cx, cy, rot, skip);
  if(!type.platform) return null;
  let best = null, bestScore = Infinity;
  Object.values(pieces).forEach(p=>{
    if(skip && skip.has(p.id)) return;
    const t = TT[p.typeId];
    if((t.cat!=='straight' && t.cat!=='dstraight') || t.deadEnd || t.noRoadbed) return;
    const r = deg2rad(p.rot), ux = Math.cos(r), uy = Math.sin(r);
    const vx = cx-p.ox, vy = cy-p.oy;
    const along = vx*ux + vy*uy, across = -vx*uy + vy*ux; // in the straight's frame
    const turn = norm360(rot - p.rot), off = turn>180 ? 360-turn : turn; // 0..180
    if(!type.island && Math.min(off, 180-off) > PLATFORM_SNAP_ANGLE) return; // an island snaps at any angle
    if(along <= -type.length/2 || along >= t.length + type.length/2) return;
    const hw = t.cat==='dstraight' ? t.spacing/2 + ROADBED_HALF : ROADBED_HALF;
    const want = (across<0 ? -1 : 1) * (hw + type.width/2);
    const gap = Math.abs(across - want);
    if(gap > SNAP_RADIUS) return;
    const score = gap + Math.max(0, -along, along - t.length)/1000; // nearer the piece's own length on a tie
    if(score >= bestScore) return;
    bestScore = score;
    best = {ring:true, ...freePlacementAt(type, p.ox + ux*along - uy*want, p.oy + uy*along + ux*want,
      // +y (the roof's overhang) faces the track; an island has no front, so the nearer way round.
      type.trackSide ? (type.trackSide === (across<0 ? 1 : -1) ? p.rot : norm360(p.rot+180))
        : type.island ? (off<=90 ? p.rot : norm360(p.rot+180)) : (across<0 ? p.rot : norm360(p.rot+180)))};
  });
  return best;
}
// Wedge ring-snap: onto one of the pit ring's 12 divisions, not port-to-port.
// Returns {ring:true, ox, oy, rot} or null; never creates a connection. (atX,
// atY) is the dragged piece's origin or the ghost position.
function findRingSnapTarget(type, atX, atY){
  if(type.cat!=='turntableWedge') return null;
  let best=null, bestDist=Infinity;
  Object.values(pieces).forEach(tt=>{
    if(TT[tt.typeId].cat!=='turntableBridge') return;
    const pit = worldPoint(tt, {x:TT[tt.typeId].length/2, y:0});
    const dx=atX-pit.x, dy=atY-pit.y, radius=Math.hypot(dx,dy);
    // Only near the ring band.
    if(radius<TURNTABLE_INNER_R-15 || radius>TURNTABLE_OUTER_R+15) return;
    const angle = norm360(Math.atan2(dy,dx)*180/Math.PI);
    // Dividers sit at rot+15+30k. floor, not round, picks the segment
    // containing the cursor; round picks the nearest divider.
    const rel = norm360(angle - tt.rot - 15);
    const slotIndex = Math.floor(rel/30) % 12;
    const segStart = norm360(tt.rot + 15 + 30*slotIndex);
    const segCenter = segStart + 15;
    let angErr = norm360(angle - segCenter);
    if(angErr>180) angErr = 360-angErr;
    // Angular error as mm at the ring's mean radius, comparable to SNAP_RADIUS.
    const dist = angErr*Math.PI/180*((TURNTABLE_INNER_R+TURNTABLE_OUTER_R)/2);
    if(dist>=bestDist) return;
    // A wedge's local angle `deg` sits at world angle rot+180-deg: deg
    // increases as world angle decreases. Solve for the middle (10°) track
    // landing on the segment centre.
    const rot = norm360(segCenter - 170);
    const r = deg2rad(rot), cos=Math.cos(r), sin=Math.sin(r);
    // The wedge's pit anchor (TURNTABLE_OUTER_R, 0 local) lands on the pit
    // centre.
    const ox = pit.x - TURNTABLE_OUTER_R*cos, oy = pit.y - TURNTABLE_OUTER_R*sin;
    bestDist = dist; best = {ring:true, ox, oy, rot};
  });
  return (best && bestDist<=SNAP_RADIUS) ? best : null;
}

// Open ports of every piece outside `group`, bucketed on a SNAP_RADIUS grid, so
// a search reads the 3×3 cells around a point instead of every port. Only
// valid while those pieces and their connections stay put, which holds for
// the length of a drag: ensureDragBroken builds one per drag (other callers
// build their own). `ord` is the visiting order, which breaks distance ties.
const PORT_GRID_MM = SNAP_RADIUS; // ≥ both search radii
function buildOpenPortIndex(group){
  const cells = new Map();
  let ord = 0;
  Object.values(pieces).forEach(p=>{
    if(group.has(p.id)) return;
    const type = TT[p.typeId];
    getPorts(type).forEach((port, idx)=>{
      if(!isOpen(p.id, idx)) return;
      const pos = worldPoint(p, port);
      const k = Math.floor(pos.x/PORT_GRID_MM)+','+Math.floor(pos.y/PORT_GRID_MM);
      let list = cells.get(k);
      if(!list) cells.set(k, list = []);
      list.push({pieceId:p.id, portIdx:idx, type, pos, heading:worldHeading(p, port.heading), ord:ord++});
    });
  });
  return cells;
}
function openPortsNear(index, pos, visit){
  const cx = Math.floor(pos.x/PORT_GRID_MM), cy = Math.floor(pos.y/PORT_GRID_MM);
  for(let i=cx-1;i<=cx+1;i++) for(let j=cy-1;j<=cy+1;j++){
    const list = index.get(i+','+j);
    if(list) list.forEach(visit);
  }
}

// Nearest pair within SNAP_RADIUS between the dragged group's open ports and
// any outside it (`index`, the drag's buildOpenPortIndex), so a connection can
// re-snap from either side. No elevation check: applyElevationShift moves the
// group instead. Distance ties go to the outside port first in piece order,
// then the group's port.
function findSnapTarget(group, index){
  let best=null, bestDist=Infinity, bestOrd = Infinity, bestSrc = Infinity;
  const sources=[];
  group.forEach(pid=>{
    const p = pieces[pid];
    getPorts(TT[p.typeId]).forEach((port,idx)=>{
      if(isOpen(pid,idx)) sources.push({pieceId:pid, portIdx:idx, pos:worldPoint(p,port)});
    });
  });
  sources.forEach((src, s)=>{
    const srcType = pieceType(src.pieceId);
    openPortsNear(index, src.pos, o=>{
      if(!portsCompatible(srcType, src.portIdx, o.type, o.portIdx)) return;
      const d = Math.hypot(o.pos.x-src.pos.x, o.pos.y-src.pos.y);
      if(d<bestDist || (d===bestDist && (o.ord<bestOrd || (o.ord===bestOrd && s<bestSrc)))){
        bestDist=d; bestOrd=o.ord; bestSrc=s;
        best={sourcePieceId:src.pieceId, sourcePortIdx:src.portIdx,
              pieceId:o.pieceId, portIdx:o.portIdx, pos:{x:o.pos.x, y:o.pos.y}, heading:o.heading};
      }
    });
  });
  return (best && bestDist<=SNAP_RADIUS) ? best : null;
}

// Expansion track self-fit: with one end snapped to `target`, the type id at
// the length that brings its far end onto an open port facing it along the
// track's line, EXPANSION_MIN–EXPANSION_MAX away, or null (the piece keeps its
// length, and the far end doesn't join). The nearest such port wins. `skip`:
// pieces to ignore (the dragged group). Scans every port, since the far end can
// be further off than the drag's port grid reaches.
const EXPANSION_FIT_ACROSS = 1; // mm off the line; the halves can't bend
function expansionFitTypeId(typeId, target, skip){
  const type = TT[typeId];
  if(!type.expansion || !target || target.ring) return null;
  // The target port faces the piece, so its heading runs along the track.
  const h = deg2rad(target.heading), ux = Math.cos(h), uy = Math.sin(h);
  const elev = pieces[target.pieceId].portElev[target.portIdx];
  const farIdx = 1 - target.sourcePortIdx;
  let bestLen = null;
  Object.values(pieces).forEach(p=>{
    if(skip && skip.has(p.id)) return;
    const pType = TT[p.typeId];
    getPorts(pType).forEach((port, idx)=>{
      if(!isOpen(p.id, idx) || (p.id===target.pieceId && idx===target.portIdx)) return;
      if(!portsCompatible(type, farIdx, pType, idx)) return;
      if(Math.abs(headingDiff(worldHeading(p, port.heading), target.heading) - 180) > LOOP_CLOSE_HEADING) return;
      if(Math.abs(p.portElev[idx] - elev) > LOOP_CLOSE_ELEV_MM) return;
      const q = worldPoint(p, port), vx = q.x-target.pos.x, vy = q.y-target.pos.y;
      const along = vx*ux + vy*uy, across = Math.abs(vx*uy - vy*ux);
      if(across > EXPANSION_FIT_ACROSS || along < EXPANSION_MIN - 0.05 || along > EXPANSION_MAX + 0.05) return;
      if(bestLen===null || along < bestLen) bestLen = along;
    });
  });
  return bestLen===null ? null : expansionTypeId(type.variantOf || type.id, bestLen);
}
// Where each piece would land if snapped, without mutating anything; for the
// commit and the live closure preview.
function computeSnappedGroupPositions(group, target){
  const srcPiece = pieces[target.sourcePieceId];
  const srcLocalPort = getPorts(TT[srcPiece.typeId])[target.sourcePortIdx];
  const pivot = worldPoint(srcPiece, srcLocalPort);
  const desired = placeAttached(TT[srcPiece.typeId], target.sourcePortIdx, {pos:target.pos, heading:target.heading});
  const rotDelta = norm360(desired.rot - srcPiece.rot);
  const result = new Map();
  group.forEach(pid=>{
    const p = pieces[pid];
    const rp = rotateAround(p.ox, p.oy, pivot.x, pivot.y, rotDelta);
    result.set(pid, {
      ox: rp.x + (target.pos.x - pivot.x),
      oy: rp.y + (target.pos.y - pivot.y),
      rot: norm360(p.rot + rotDelta),
    });
  });
  return result;
}
// Every pair other than `primary` between the group's open ports and outside
// open ports that meet: within closeRadius, facing (LOOP_CLOSE_HEADING) and at
// one height (LOOP_CLOSE_ELEV_MM). `poseOf` and `elevOf` give the group's pose
// and heights, live by default or hypothetical for the drag's preview;
// `index` is the drag's buildOpenPortIndex, built here otherwise.
function findLoopClosures(group, primary = {}, {poseOf = pid=>pieces[pid], elevOf = pid=>pieces[pid].portElev, index = buildOpenPortIndex(group)} = {}){
  const extra = [];
  group.forEach(pid=>{
    const type = pieceType(pid);
    getPorts(type).forEach((port,idx)=>{
      if(pid===primary.sourcePieceId && idx===primary.sourcePortIdx) return;
      if(!isOpen(pid,idx)) return;
      const wp = worldPoint(poseOf(pid), port), heading = worldHeading(poseOf(pid), port.heading), elev = elevOf(pid)[idx];
      let best=null, bestDist=Infinity, bestOrd = Infinity;
      openPortsNear(index, wp, o=>{
        if(o.pieceId===primary.pieceId && o.portIdx===primary.portIdx) return;
        if(!portsCompatible(type, idx, o.type, o.portIdx)) return;
        // Ports face away from their piece, so a real joint has them 180° apart.
        if(Math.abs(headingDiff(heading, o.heading) - 180) > LOOP_CLOSE_HEADING) return;
        if(Math.abs(elev - elevOf(o.pieceId)[o.portIdx]) > LOOP_CLOSE_ELEV_MM) return;
        const d = Math.hypot(wp.x-o.pos.x, wp.y-o.pos.y);
        if(d<bestDist || (d===bestDist && o.ord<bestOrd)){ bestDist=d; bestOrd=o.ord; best={pieceId:o.pieceId, portIdx:o.portIdx, type:o.type}; }
      });
      if(best && bestDist<=closeRadius(type, best.type)){
        extra.push({sourcePieceId:pid, sourcePortIdx:idx, pieceId:best.pieceId, portIdx:best.portIdx});
      }
    });
  });
  return extra;
}
// After an in-place type change (F flip) ports may move. Break connections
// whose ports no longer coincide and join any that now do, with the same
// LOOP_CLOSE_RADIUS as a drop.
function reconcileConnectionsAfterRetype(pieceId){
  const piece = pieces[pieceId];
  const type = TT[piece.typeId];
  getPorts(type).forEach((port, idx)=>{
    const nb = getConnectedNeighbor(pieceId, idx);
    if(!nb) return;
    const nbPiece = pieces[nb.pieceId], nbType = TT[nbPiece.typeId];
    const a = worldPoint(piece, port), b = worldPoint(nbPiece, getPorts(nbType)[nb.portIdx]);
    if(Math.hypot(a.x-b.x, a.y-b.y) > LOOP_CLOSE_RADIUS || !portsCompatible(type, idx, nbType, nb.portIdx)){
      disconnectPort(pieceId, idx);
    }
  });
  findLoopClosures(new Set([pieceId])).forEach(connectPorts);
  pruneJoiners(); // a type with fewer ends
}
function connectPorts(c){
  connections[connKey(c.sourcePieceId,c.sourcePortIdx)] = connKey(c.pieceId,c.portIdx);
  connections[connKey(c.pieceId,c.portIdx)] = connKey(c.sourcePieceId,c.sourcePortIdx);
}
// Shift the whole group by one delta (target port minus source port), keeping
// its tilt, which is how track extends off the top of a slope. Clamped
// defensively.
function applyElevationShift(group, target){
  const targetElev = pieces[target.pieceId].portElev[target.portIdx];
  const srcElev = pieces[target.sourcePieceId].portElev[target.sourcePortIdx];
  const delta = targetElev - srcElev;
  if(delta===0) return;
  group.forEach(pid=>{
    const p = pieces[pid];
    if(TT[p.typeId].platform) return; // platforms stay on the ground
    p.portElev = p.portElev.map(e=>Math.max(0, Math.min(ELEV_MAX_MM, e+delta)));
  });
}
// Commit a snap: move the group, connect the pair, then any other coincident
// pairs. A ring-snap just places the piece; no connections or elevation.
function finalizeSnap(ds){
  const target = ds.snapTarget;
  if(target.ring){
    Object.assign(pieces[ds.primaryId], {ox:target.ox, oy:target.oy, rot:target.rot});
    return;
  }
  const positions = computeSnappedGroupPositions(ds.group, target);
  positions.forEach((pos,pid)=>Object.assign(pieces[pid], pos));
  applyElevationShift(ds.group, target);
  connectPorts(target);
  dropManualExpansionJoins(findLoopClosures(ds.group, target), ds.primaryId, ds.manualLength)
    .forEach(connectPorts);
}

let dragState = null;
function startPieceDrag(id, ev){
  if(!beginInteraction('pieceDrag')) return;
  // Dragging a piece that's part of the selection moves the selection; anything
  // else replaces it.
  if(!selectedPieces.has(id) || selectedPieces.size===0){
    selectOnlyPiece(id);
  }
  const group = new Set(selectedPieces);
  const startPositions = new Map();
  group.forEach(pid=>{
    startPositions.set(pid, {ox:pieces[pid].ox, oy:pieces[pid].oy, rot:pieces[pid].rot});
  });
  dragState = { group, primaryId:id, startX:ev.clientX, startY:ev.clientY, startPositions,
    dxScreen:0, dyScreen:0, rotDelta:0, moved:false, snapTarget:null, loopClosures:[] };
  // A lone expansion track: `expansionTypeId` is the length the user set,
  // which self-fit may stretch per move; `manualLength` once they Shift+scroll.
  if(group.size===1 && pieceType(id).expansion) dragState.expansionTypeId = pieces[id].typeId;
}
// After Shift+scroll sets an expansion track's length, its free end stays
// free: drop any join but the snap itself, which the old length might have met.
function dropManualExpansionJoins(closures, pieceId, manual){
  return manual ? closures.filter(c=>c.sourcePieceId!==pieceId && c.pieceId!==pieceId) : closures;
}
// Break every connection crossing the group boundary, the first time the drag
// actually changes something.
function ensureDragBroken(){
  if(dragState.moved) return;
  pushHistory();
  breakDragJoins();
  svg.classList.add('panning');
}
function breakDragJoins(){
  dragState.moved = true;
  const toBreak = [];
  dragState.group.forEach(pid=>{
    getPorts(pieceType(pid)).forEach((_,idx)=>{
      const other = getConnectedNeighbor(pid, idx);
      if(other && !dragState.group.has(other.pieceId)) toBreak.push([pid,idx,other.pieceId,other.portIdx]);
    });
  });
  toBreak.forEach(([pid,idx])=>disconnectPort(pid, idx));
  // Nothing outside the group moves until the drop, so index its open ports
  // (including the ones just freed) once for the per-move snap search.
  dragState.portIndex = buildOpenPortIndex(dragState.group);
}
// Rotate the group rigidly about the grabbed piece, then translate. For one
// piece, that spins it under the cursor.
function applyDragTransform(){
  const ds = dragState;
  // Back to the user's length; self-fit below may stretch it again.
  if(ds.expansionTypeId) pieces[ds.primaryId].typeId = ds.expansionTypeId;
  const primary = ds.startPositions.get(ds.primaryId);
  // pivot on the grabbed piece's visual centre at drag start, so a lone piece
  // spins about its middle
  const primaryType = pieceType(ds.primaryId);
  const pivot = worldPoint({ox:primary.ox, oy:primary.oy, rot:primary.rot}, pieceCenterLocal(primaryType));
  const dxWorld = ds.dxScreen/view.scale;
  const dyWorld = ds.dyScreen/view.scale;
  ds.startPositions.forEach((pos,pid)=>{
    const rotated = rotateAround(pos.ox, pos.oy, pivot.x, pivot.y, ds.rotDelta);
    pieces[pid].ox = rotated.x + dxWorld;
    pieces[pid].oy = rotated.y + dyWorld;
    pieces[pid].rot = norm360(pos.rot + ds.rotDelta);
  });
  ds.snapTarget = (ds.group.size===1 && primaryType.cat==='turntableWedge')
    ? (findRingSnapTarget(primaryType, pieces[ds.primaryId].ox, pieces[ds.primaryId].oy) || findSnapTarget(ds.group, ds.portIndex))
    : [...ds.group].every(id=>snapsByPose(pieceType(id)))
    ? (findSnapTarget(ds.group, ds.portIndex) || (()=>{
        // Else beside a straight, shown snapped as it's dragged, since it slides along the track.
        // Only the grabbed piece looks for the track; the rest of a selection
        // moves rigidly with it.
        const pp = pieces[ds.primaryId], c = worldPoint(pp, pieceCenterLocal(primaryType));
        const snap = findPlatformSnapTarget(primaryType, c.x, c.y, pp.rot, ds.group);
        if(snap){
          const dRot = norm360(snap.rot - pp.rot), from = {x:pp.ox, y:pp.oy};
          ds.group.forEach(pid=>{
            const q = pieces[pid], r = rotateAround(q.ox, q.oy, from.x, from.y, dRot);
            Object.assign(q, {ox: r.x + snap.ox - from.x, oy: r.y + snap.oy - from.y, rot: norm360(q.rot + dRot)});
          });
        }
        return snap;
      })())
    : findSnapTarget(ds.group, ds.portIndex);
  if(ds.expansionTypeId && !ds.manualLength){
    const fit = expansionFitTypeId(ds.expansionTypeId, ds.snapTarget, ds.group);
    if(fit) pieces[ds.primaryId].typeId = fit;
  }
  // Preview loop closures at the hypothetical snapped pose, including
  // applyElevationShift's delta, so the preview matches the commit. Ring snaps
  // skip this.
  if(ds.snapTarget && ds.snapTarget.ring){
    ds.loopClosures = [];
  } else if(ds.snapTarget){
    const previewPositions = computeSnappedGroupPositions(ds.group, ds.snapTarget);
    const targetElev = pieces[ds.snapTarget.pieceId].portElev[ds.snapTarget.portIdx];
    const srcElev = pieces[ds.snapTarget.sourcePieceId].portElev[ds.snapTarget.sourcePortIdx];
    const elevDelta = targetElev - srcElev;
    const previewElevOf = pid => ds.group.has(pid) && !pieceType(pid).platform
      ? pieces[pid].portElev.map(e=>Math.max(0, Math.min(ELEV_MAX_MM, e+elevDelta)))
      : pieces[pid].portElev;
    ds.loopClosures = dropManualExpansionJoins(
      findLoopClosures(ds.group, ds.snapTarget, {poseOf:pid=>previewPositions.get(pid) || pieces[pid], elevOf:previewElevOf, index:ds.portIndex}),
      ds.primaryId, ds.manualLength);
  } else {
    ds.loopClosures = [];
  }
}
registerGesture({active:()=>dragState,
  move(e){
    dragState.dxScreen = e.clientX - dragState.startX;
    dragState.dyScreen = e.clientY - dragState.startY;
    if(!dragState.moved && Math.hypot(dragState.dxScreen,dragState.dyScreen) > 4){
      ensureDragBroken();
    }
    if(dragState.moved){
      applyDragTransform();
      invalidate();
    }
  },
  end(){
    if(dragState.moved){
      if(dragState.snapTarget) finalizeSnap(dragState);
      // The drag can outlast the autosave debounce, so re-arm it.
      scheduleAutosave();
    }
    dragState=null; endInteraction('pieceDrag'); svg.classList.remove('panning');
    // Always, moved or not: frames drawn while the button was down left out
    // the flood arrows (none mid-drag), so a plain click must redraw them.
    invalidate();
  },
});

// The palette drag's snap for its current pose (none while it's off the
// canvas). An expansion track starts from the length the user set, then
// self-fits a gap the snap offers, unless they've set the length this drag.
function updatePaletteSnap(){
  const pd = paletteDrag;
  if(pd.expansionTypeId) pd.typeId = pd.expansionTypeId;
  pd.snapTarget = (pd.moved && pd.worldX!=null) ? findPaletteSnapTarget(pd.typeId, pd.worldX, pd.worldY, pd.rot) : null;
  if(pd.expansionTypeId && !pd.manualLength){
    const fit = expansionFitTypeId(pd.expansionTypeId, pd.snapTarget, null);
    if(fit) pd.typeId = fit;
  }
}
registerGesture({active:()=>paletteDrag,
  move(e){
    if(!paletteDrag.moved && Math.hypot(e.clientX-paletteDrag.startX, e.clientY-paletteDrag.startY) > 4){
      paletteDrag.moved = true;
    }
    if(!paletteDrag.moved) return;
    if(isOverCanvas(e.clientX, e.clientY)){
      const {x,y} = screenToWorld(e.clientX, e.clientY);
      paletteDrag.worldX = x; paletteDrag.worldY = y;
    } else {
      paletteDrag.worldX = paletteDrag.worldY = null;
    }
    updatePaletteSnap();
    invalidate();
  },
  end(e){
    const {typeId, moved, snapTarget, rot, manualLength} = paletteDrag;
    paletteDrag = null;
    endInteraction('paletteDrag');
    // Shift+wheel or F mid-drag can swap to a type that isn't in stock.
    if(stockBlocks(withPartner(typeId), [])){ invalidate(); return; }
    if(!moved){
      // Plain click on a palette button: attach if a port is selected (a platform
      // only to a platform end it can join). Otherwise it goes in the middle of
      // the view, selected, staggered by clickSpawnPoint, and a platform snaps
      // against a straight if one is near.
      const platformFits = snapsByPose(TT[typeId]) && selectedPort && getPorts(TT[typeId]).some((_, i)=>portsCompatible(TT[typeId], i, pieceType(selectedPort.pieceId), selectedPort.portIdx));
      if(selectedPort && (!snapsByPose(TT[typeId]) || platformFits)){
        const type = TT[typeId];
        const before = snapshotState();
        let placed;
        if(type.bundleWith){
          // A bundle ends in a stop, so nothing is left to chain onto.
          placed = !!spawnBundledAt(typeId, selectedPort.pieceId, selectedPort.portIdx);
          selectedPort = null;
        } else {
          const {newId, openPortIdx} = attachPieceAt(typeId, selectedPort.pieceId, selectedPort.portIdx);
          // Select whichever new port is still open; null for a dead end.
          selectedPort = newId ? {pieceId:newId, portIdx: openPortIdx} : null;
          placed = !!newId;
        }
        if(placed) pushHistory(before);
        invalidate();
      } else {
        const type = TT[typeId], {x, y} = clickSpawnPoint();
        const before = snapshotState();
        let id;
        if(type.bundleWith) id = spawnBundledFree(typeId, x, y, 0)?.partnerId;
        else {
          const pose = (snapsByPose(type) && findPlatformSnapTarget(type, x, y, 0, null)) || freePlacementAt(type, x, y, 0);
          id = spawnFree(typeId, pose.ox, pose.oy, pose.rot ?? 0);
        }
        if(!id){ invalidate(); return; }
        pushHistory(before);
        selectOnlyPiece(id);
      }
      return;
    }
    if(!isOverCanvas(e.clientX, e.clientY)){
      invalidate();
      return;
    }
    const before = snapshotState();
    const dropType = TT[typeId];
    if(dropType.bundleWith){
      // A bundle drop selects the partner. The stop can't close a loop.
      const result = snapTarget
        ? spawnBundledAt(typeId, snapTarget.pieceId, snapTarget.portIdx)
        : (()=>{
            const {x,y} = screenToWorld(e.clientX,e.clientY);
            return spawnBundledFree(typeId, x, y, rot);
          })();
      if(!result){ invalidate(); return; }
      pushHistory(before);
      selectOnlyPiece(result.partnerId);
      return;
    }
    const newId = !snapTarget
      ? (()=>{
          const {x,y} = screenToWorld(e.clientX,e.clientY);
          const {ox,oy} = freePlacementAt(TT[typeId], x, y, rot);
          return spawnFree(typeId, ox, oy, rot);
        })()
      : snapTarget.ring
        ? spawnFree(typeId, snapTarget.ox, snapTarget.oy, snapTarget.rot)
        : spawnAttached(typeId, snapTarget.sourcePortIdx, snapTarget.pieceId, snapTarget.portIdx);
    if(!newId){ invalidate(); return; } // target port closed between hover and drop
    pushHistory(before);
    if(snapTarget && !snapTarget.ring){
      dropManualExpansionJoins(findLoopClosures(new Set([newId]),
        {sourcePieceId:newId, sourcePortIdx:snapTarget.sourcePortIdx, pieceId:snapTarget.pieceId, portIdx:snapTarget.portIdx}),
        newId, manualLength).forEach(connectPorts);
    }
    selectOnlyPiece(newId);
  },
});

