/* ============================================================
   PIECE CREATION, TABLETOP HELPERS & CONNECTIONS
   makePieceObj and the spawn functions, the tabletop box's spawn/edge/
   padlock helpers, port-connection queries and superelevation
   compatibility, the bundled-piece spawners, flood-fill, and delete.
   ============================================================ */
// One elevation per port, mm (0..ELEV_MAX_MM). A gradeable piece's two sides
// can differ: that difference is its tilt. Only Gradient Mode and
// applyElevationShift change it after creation. All creation goes through here.
function makePieceObj(id, typeId, ox, oy, rot, elev){
  const portCount = getPorts(TT[typeId]).length;
  let portElev = new Array(portCount).fill(elev||0);
  // An incline piece starts rising from ports 0/1 to ports 2/3.
  const rise = TT[typeId].inclineRise;
  if(rise) portElev = portElev.map((e,i)=> i<2 ? e : Math.min(ELEV_MAX_MM, e + rise));
  return {id, typeId, ox:ox||0, oy:oy||0, rot:rot||0, portElev};
}
function spawnFree(typeId, atX, atY, rot){
  const id = 'p'+(nextId++);
  pieces[id] = makePieceObj(id, typeId, atX, atY, rot);
  return id;
}

const TABLE_BOX_DEFAULT_SIZE = 250;
const TABLE_BOX_MIN_SIZE = 50; // minimum, so a corner drag can't invert the box
// Tabletops only (text labels share `tableBoxes`).
const tableOnly = ()=>Object.values(tableBoxes).filter(b=>!isTextBox(b));
function spawnTableBox(atX, atY){
  const id = 'box'+(nextId++);
  const size = TABLE_BOX_DEFAULT_SIZE;
  tableBoxes[id] = {id, x:atX-size/2, y:atY-size/2, w:size, h:size, locked:false};
  return id;
}
// Edge whose midpoint is nearest the point: where the open padlock sits.
function nearestEdgeOfBox(box, wx, wy){
  const cx = box.x+box.w/2, cy = box.y+box.h/2;
  const candidates = [
    {edge:'top',    x:cx,       y:box.y},
    {edge:'bottom', x:cx,       y:box.y+box.h},
    {edge:'left',   x:box.x,    y:cy},
    {edge:'right',  x:box.x+box.w, y:cy},
  ];
  let best = candidates[0], bestDist = Infinity;
  candidates.forEach(c=>{
    const d = Math.hypot(wx-c.x, wy-c.y);
    if(d<bestDist){ bestDist=d; best=c; }
  });
  return best.edge;
}
// A padlock at world (wx, wy), held at constant screen size by
// scale(1/view.scale). `locked` chooses closed and grey or open and blue.
// Swallows mousedown so a click never starts a box drag or reaches the canvas.
// `hint`: the hover key, a tabletop's by default.
function appendPadlockIcon(parent, wx, wy, locked, onClick, hint){
  const g = el('g',{transform:`translate(${wx},${wy}) scale(${1/view.scale})`, style:'cursor:pointer;', 'data-hint': hint || (locked ? 't5' : 't4')});
  const shackle = locked
    ? el('path',{d:'M -4,-2 A 4,5 0 0 1 4,-2', fill:'none', stroke:'#c7cdd6', 'stroke-width':1.8})
    : el('path',{d:'M -4,-2 A 4,5 0 0 1 4,-6', fill:'none', stroke:'#4fb0ff', 'stroke-width':1.8});
  g.appendChild(shackle);
  g.appendChild(el('rect',{x:-6,y:-2,width:12,height:9,rx:1.5,ry:1.5,
    fill: locked?'#3a4048':'#1a2530', stroke: locked?'#7a838d':'#4fb0ff', 'stroke-width':1}));
  // invisible hit zone, already in counter-scaled units
  g.appendChild(el('circle',{cx:0, cy:3, r:14, fill:'transparent'}));
  g.addEventListener('mousedown', ev=>{ ev.stopPropagation(); ev.preventDefault(); });
  g.addEventListener('click', ev=>{ ev.stopPropagation(); onClick(); });
  parent.appendChild(g);
}

function connKey(id,idx){return id+':'+idx;}
function pieceType(id){ return TT[pieces[id].typeId]; }
function isOpen(id,idx){return !(connKey(id,idx) in connections);}
// Superelevation: a banked port may only mate with another banked port, a flat
// port only with a flat one. Every port of a 'full' piece is banked; on an
// 'easement' piece only the far ports (2/3). All other pieces are flat.
function isBankedPort(type, portIdx){
  if(type.superelevation==='full') return true;
  if(type.superelevation==='easement') return portIdx>=2;
  return false;
}
// Which side of this port's heading the curvature centre lies on. Two banked
// ports on the same side would form an S-bend, whose banking would flip at the
// joint.
function curveJointSide(type, portIdx){
  const isNear = (type.cat==='dcurve') ? portIdx<2 : portIdx===0;
  const nearSide = type.hand==='R' ? 'left' : 'right';
  return isNear ? nearSide : (nearSide==='left' ? 'right' : 'left');
}
function portsCompatible(typeA, idxA, typeB, idxB){
  // A platform's ends meet only another platform's, and only right end to left
  // end, so they run on the same way round (the track stays on one side).
  const platA = typeA.cat==='platform', platB = typeB.cat==='platform';
  if(platA !== platB) return false;
  // One-sided and island platforms don't join each other. Two one-sided pieces must
  // meet right end to left end; an island piece has no front or back, so it joins either way round.
  if(platA){
    if(!!typeA.island !== !!typeB.island) return false;
    return !(typeA.sided && typeB.sided) || getPorts(typeA)[idxA].heading !== getPorts(typeB)[idxB].heading;
  }
  const bankedA = isBankedPort(typeA, idxA), bankedB = isBankedPort(typeB, idxB);
  if(bankedA !== bankedB) return false;
  if(bankedA && bankedB){
    // Two banked ports: only a continuing curve is possible, never an S-bend.
    if(curveJointSide(typeA, idxA) === curveJointSide(typeB, idxB)) return false;
  }
  // A connector's narrow end (port 0) fits only a wedge port; a wedge port
  // takes only that narrow end or another wedge.
  const CONNECTOR_CATS = ['turntableConnector','turntableConnectorCurve'];
  const narrowA = CONNECTOR_CATS.includes(typeA.cat) && idxA===0;
  const narrowB = CONNECTOR_CATS.includes(typeB.cat) && idxB===0;
  const wedgeA = typeA.cat==='turntableWedge', wedgeB = typeB.cat==='turntableWedge';
  if(narrowA && !wedgeB) return false;
  if(narrowB && !wedgeA) return false;
  if(wedgeA && !(wedgeB || narrowB)) return false;
  if(wedgeB && !(wedgeA || narrowA)) return false;
  return true;
}
function getConnectedNeighbor(id,idx){
  const k = connections[connKey(id,idx)];
  if(!k) return null;
  const i = k.lastIndexOf(':');
  return { pieceId:k.slice(0,i), portIdx:parseInt(k.slice(i+1),10) };
}
// Breaks the connection at a port from both ends (connectPorts' inverse). A
// no-op on an open port.
function disconnectPort(id, idx){
  const other = getConnectedNeighbor(id, idx);
  const fitted = other && joinerAt(id, idx);
  delete connections[connKey(id, idx)];
  if(other) delete connections[connKey(other.pieceId, other.portIdx)];
  if(!fitted) return;
  // An Insulated UniJoiner needs its joint, so it goes with it. A Terminal
  // UniJoiner stays with the other piece: every caller names the piece
  // that's moving, changing or going first.
  if(joiners[fitted]==='IJ'){ delete joiners[fitted]; if(selectedJoiner===fitted) selectedJoiner = null; }
  else if(fitted===connKey(id, idx) && feederFitsTrack(joiners[fitted], pieceType(other.pieceId))) moveJoiner(fitted, connKey(other.pieceId, other.portIdx));
}

// Spawn a `typeId` piece attached by its port `sourcePortIdx` onto the open
// port `atPortIdx` of an existing piece. Returns the new id, or null if
// refused.
function spawnAttached(typeId, sourcePortIdx, atPieceId, atPortIdx){
  // Never mate onto a connected port: it would make the graph asymmetric.
  if(!isOpen(atPieceId, atPortIdx)) return null;
  const type = TT[typeId];
  const atPiece = pieces[atPieceId];
  const atPorts = getPorts(TT[atPiece.typeId]);
  if(!portsCompatible(type, sourcePortIdx, TT[atPiece.typeId], atPortIdx)) return null;
  const openWorld = {
    pos: worldPoint(atPiece, atPorts[atPortIdx]),
    heading: worldHeading(atPiece, atPorts[atPortIdx].heading),
  };
  const newId = 'p'+(nextId++);
  const {ox,oy,rot} = placeAttached(type, sourcePortIdx, openWorld);
  // The new piece starts level at the elevation of the port it attaches to.
  pieces[newId] = makePieceObj(newId, typeId, ox, oy, rot, atPiece.portElev[atPortIdx]);
  connections[connKey(atPieceId,atPortIdx)] = connKey(newId,sourcePortIdx);
  connections[connKey(newId,sourcePortIdx)] = connKey(atPieceId,atPortIdx);
  return newId;
}

// A type id and its bundled partner's, if it has one: what placing it uses.
const withPartner = t=>TT[t].bundleWith ? [t, TT[t].bundleWith] : [t];
// Bundles (`bundleWith:'S62'`) place two connected pieces: the S62 joins the
// layout and the bumper hangs off its far port. Returns {partnerId, bumperId}.
function spawnBundledAt(typeId, atPieceId, atPortIdx){
  const type = TT[typeId];
  const partnerType = TT[type.bundleWith];
  if(!isOpen(atPieceId, atPortIdx)) return null;
  const atPiece = pieces[atPieceId];
  const atPorts = getPorts(TT[atPiece.typeId]);
  // Gated on the partner's port, since that's the one joining the layout.
  if(!portsCompatible(partnerType, 0, TT[atPiece.typeId], atPortIdx)) return null;
  const openWorld = {
    pos: worldPoint(atPiece, atPorts[atPortIdx]),
    heading: worldHeading(atPiece, atPorts[atPortIdx].heading),
  };
  const partnerPlacement = placeAttached(partnerType, 0, openWorld);
  const partnerId = 'p'+(nextId++);
  pieces[partnerId] = makePieceObj(partnerId, type.bundleWith, partnerPlacement.ox, partnerPlacement.oy, partnerPlacement.rot, atPiece.portElev[atPortIdx]);
  connections[connKey(atPieceId,atPortIdx)] = connKey(partnerId,0);
  connections[connKey(partnerId,0)] = connKey(atPieceId,atPortIdx);
  return attachBumperToPartner(typeId, partnerId);
}
function spawnBundledFree(typeId, worldX, worldY, rot){
  const type = TT[typeId];
  // Centred on the whole assembly, matching the drag ghost
  // (bundleVirtualPlacement).
  const at = bundleVirtualPlacement(typeId, worldX, worldY, rot);
  const partnerId = 'p'+(nextId++);
  pieces[partnerId] = makePieceObj(partnerId, type.bundleWith, at.ox, at.oy, rot);
  return attachBumperToPartner(typeId, partnerId);
}
// Shared tail of both bundle spawners: hang the bumper off the already-placed
// partner's far port and connect them.
function attachBumperToPartner(typeId, partnerId){
  const type = TT[typeId];
  const partnerPorts = getPorts(TT[type.bundleWith]);
  const farWorld = {
    pos: worldPoint(pieces[partnerId], partnerPorts[1]),
    heading: worldHeading(pieces[partnerId], partnerPorts[1].heading),
  };
  const bumperPlacement = placeAttached(type, 0, farWorld);
  const bumperId = 'p'+(nextId++);
  pieces[bumperId] = makePieceObj(bumperId, typeId, bumperPlacement.ox, bumperPlacement.oy, bumperPlacement.rot, pieces[partnerId].portElev[1]);
  connections[connKey(partnerId,1)] = connKey(bumperId,0);
  connections[connKey(bumperId,0)] = connKey(partnerId,1);
  return {partnerId, bumperId};
}

// Flood-fill along connections, never entering `stopSet`. Powers
// extend-selection.
function floodBeyond(startId, stopSet){
  const result = new Set();
  const stack = [startId];
  while(stack.length){
    const cur = stack.pop();
    if(stopSet.has(cur) || result.has(cur)) continue;
    result.add(cur);
    const type = pieceType(cur);
    getPorts(type).forEach((_,idx)=>{
      const other = getConnectedNeighbor(cur, idx);
      if(other) stack.push(other.pieceId);
    });
  }
  return result;
}

function deleteSelected(){
  selectedPieces.forEach(id=>{
    const pc = pieces[id];
    if(!pc) return;
    const type = TT[pc.typeId];
    getPorts(type).forEach((_,idx)=>{
      disconnectPort(id, idx);
    });
    delete pieces[id];
  });
  if(selectedBoxId) delete tableBoxes[selectedBoxId];
  if(selectedJoiner) delete joiners[selectedJoiner];
  pruneJoiners();
  setSelection();
}

