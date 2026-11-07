/* ============================================================
   PALETTE DRAG-AND-DROP
   A ghost follows the cursor and shows the snapped placement near an open
   port. Release to attach or drop free; off the canvas cancels; releasing
   without moving attaches to the selected port. Also coordinate and
   placement helpers shared with drawing.
   ============================================================ */
function isOverCanvas(clientX, clientY){
  const r = document.getElementById('canvasWrap').getBoundingClientRect();
  return clientX>=r.left && clientX<=r.right && clientY>=r.top && clientY<=r.bottom;
}
// The world point at the middle of the canvas.
// Where a palette click with no end to attach to puts its piece: the middle of
// the view, and, for clicks repeated without the view moving or zooming, a step
// further (PASTE_OFFSET, down and right) each time, as repeated pastes do.
let clickSpawn = null; // {x, y, scale, n}: the view at the last such click
function clickSpawnPoint(){
  const c = viewCentreWorld(), same = clickSpawn && clickSpawn.x===view.x && clickSpawn.y===view.y && clickSpawn.scale===view.scale;
  const n = same ? clickSpawn.n+1 : 0;
  clickSpawn = {x:view.x, y:view.y, scale:view.scale, n};
  return {x:c.x + PASTE_OFFSET*n, y:c.y + PASTE_OFFSET*n};
}
function viewCentreWorld(){
  const wrap = document.getElementById('canvasWrap');
  return {x:(wrap.clientWidth/2 - view.x)/view.scale, y:(wrap.clientHeight/2 - view.y)/view.scale};
}
function screenToWorld(clientX, clientY){
  const r = document.getElementById('canvasWrap').getBoundingClientRect();
  return {
    x: (clientX - r.left - view.x)/view.scale,
    y: (clientY - r.top  - view.y)/view.scale,
  };
}
// Pieces with their origin or a port inside the rect. One function so marquee
// preview and commit agree.
function piecesInWorldRect(minX, minY, maxX, maxY){
  return Object.values(pieces).filter(piece=>{
    const pts = [{x:piece.ox,y:piece.oy}, ...getPorts(TT[piece.typeId]).map(p=>worldPoint(piece,p))];
    return pts.some(pt=>pt.x>=minX && pt.x<=maxX && pt.y>=minY && pt.y<=maxY);
  }).map(p=>p.id);
}
// Origin placing `type`'s visual centre at (worldX, worldY), so a dragged piece
// is held by the point it rotates about. Shared by ghost and drop.
function freePlacementAt(type, worldX, worldY, rot){
  const c = pieceCenterLocal(type);
  const rc = rotateAround(c.x, c.y, 0, 0, rot);
  return {ox: worldX-rc.x, oy: worldY-rc.y, rot};
}
// Bundles: the ghost and snap search treat the S62+bumper as one straight of
// combined length, held by its middle.
function bundleVirtualPlacement(typeId, worldX, worldY, rot){
  const type = TT[typeId];
  const partnerType = TT[type.bundleWith];
  const combinedLen = partnerType.length + type.length;
  const rc = rotateAround(combinedLen/2, 0, 0, 0, rot||0);
  return {ox: worldX-rc.x, oy: worldY-rc.y, rot: rot||0};
}
// Nearest snap within SNAP_RADIUS for a not-yet-placed piece; the palette
// counterpart of findSnapTarget. Ports are taken where the ghost is drawn. A
// bundle snaps by its partner's port 0 (port 1 holds the bumper), the two
// placed as one straight, held by its middle.
function findPaletteSnapTarget(typeId, atX, atY, atRot){
  const type = TT[typeId];
  // A wedge tries the ring first, then ordinary port snapping.
  const ring = findRingSnapTarget(type, atX, atY);
  if(ring) return ring;
  const snapType = type.bundleWith ? TT[type.bundleWith] : type;
  const virtual = type.bundleWith ? bundleVirtualPlacement(typeId, atX, atY, atRot) : freePlacementAt(type, atX, atY, atRot||0);
  const ports = getPorts(snapType).slice(0, type.bundleWith ? 1 : undefined);
  let best=null, bestDist=Infinity;
  ports.forEach((port, sourcePortIdx)=>{
    const wp = worldPoint(virtual, port);
    Object.values(pieces).forEach(p=>{
      getPorts(TT[p.typeId]).forEach((oport,idx)=>{
        if(!isOpen(p.id,idx)) return;
        if(!portsCompatible(snapType, sourcePortIdx, TT[p.typeId], idx)) return;
        const owp = worldPoint(p,oport);
        const d = Math.hypot(wp.x-owp.x, wp.y-owp.y);
        if(d<bestDist){
          bestDist = d;
          best = {sourcePortIdx, pieceId:p.id, portIdx:idx, pos:owp, heading:worldHeading(p,oport.heading)};
        }
      });
    });
  });
  if(best && bestDist<=SNAP_RADIUS) return best;
  // No platform end near: beside a straight instead.
  return snapsByPose(type) ? findPlatformSnapTarget(type, atX, atY, atRot||0, null) : null;
}

// A type's outline in its own coordinates: the convex hull of its true shape,
// measured once, so a piece's extent is known without drawing it (culling, the
// layout's bounds and the footprint stat need it for every piece). A piece's
// world extent is its hull's points rotated into place. Rotating a bounding
// box and boxing it again would overstate curves: M1's eight 45° curves came
// out 136 mm too big each way.
// The true shape is the piece drawn `nonScaling`, like a palette icon, which
// leaves off the end ties' and rails' 0.5 mm run-on past each end (the
// deliberate overlap that hides the seam at a join), so an S248 measures 248.
// Every drawn shape contributes (strokes excluded, as getBBox does): its
// corners exactly, from the path data, and each arc or Bézier sampled on its
// own, which stays within ~0.01 mm of the curve. (Sampling a whole path
// evenly isn't enough: one path often holds many shapes, such as all of a
// piece's ties, and even samples skip whole ties.)
const _localHullCache = new Map();
const HULL_SAMPLES_PER_CURVE = 48;
function localPieceHull(typeId){
  let hull = _localHullCache.get(typeId);
  if(hull) return hull;
  const g = el('g',{});
  drawPiece(g, TT[typeId], {roadbedFill:'#000', roadbedStroke:'#000', railColor:'#000', worldRot:0, ties:true, nonScaling:true});
  const measureSvg = getIconMeasureSvg();
  measureSvg.appendChild(g);
  const toPiece = g.getCTM().inverse();
  const probe = el('path',{}); // untransformed, for sampling one curve at a time
  measureSvg.appendChild(probe);
  const pts = [];
  g.querySelectorAll('path,rect,line,polyline,polygon,circle,ellipse').forEach(shape=>{
    if(shape.closest('mask,defs')) return; // mask content isn't drawn
    const m = toPiece.multiply(shape.getCTM());
    const add = (x, y)=>pts.push({x:m.a*x + m.c*y + m.e, y:m.b*x + m.d*y + m.f});
    const sample = d=>{
      probe.setAttribute('d', d);
      // At least one sample per mm, so a long sweep (the turntable pit's
      // half circles) stays as close as a short one.
      const len = probe.getTotalLength(), n = Math.max(HULL_SAMPLES_PER_CURVE, Math.ceil(len));
      for(let i=0;i<=n;i++){ const q = probe.getPointAtLength(len*i/n); add(q.x, q.y); }
    };
    const num = a=>parseFloat(shape.getAttribute(a))||0;
    switch(shape.tagName){
      case 'rect': { const x=num('x'), y=num('y'), w=num('width'), h=num('height'); add(x,y); add(x+w,y); add(x,y+h); add(x+w,y+h); break; }
      case 'line': add(num('x1'), num('y1')); add(num('x2'), num('y2')); break;
      case 'polyline': case 'polygon': for(const p of shape.points) add(p.x, p.y); break;
      case 'circle': case 'ellipse': { const cx=num('cx'), cy=num('cy'), rx=num(shape.tagName==='circle'?'r':'rx'), ry=num(shape.tagName==='circle'?'r':'ry');
        for(let i=0;i<360;i++){ const a = i/360*2*Math.PI; add(cx+rx*Math.cos(a), cy+ry*Math.sin(a)); } break; }
      case 'path': pathVertices(shape.getAttribute('d')||'', add, sample); break;
    }
  });
  measureSvg.removeChild(probe);
  measureSvg.removeChild(g);
  hull = convexHull(pts);
  _localHullCache.set(typeId, hull);
  return hull;
}
// Walks SVG path data: calls add(x, y) for every vertex and sample(d) with a
// stand-alone path for every arc or Bézier, so straight edges are exact and
// only curves are sampled. Handles absolute and relative commands.
function pathVertices(d, add, sample){
  const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) || [];
  const ARGS = {m:2, l:2, h:1, v:1, c:6, s:4, q:4, t:2, a:7, z:0};
  let i = 0, cmd = null, x = 0, y = 0, sx = 0, sy = 0;
  while(i < tokens.length){
    if(/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
    const lc = cmd.toLowerCase(), rel = cmd!==cmd.toUpperCase(), n = ARGS[lc];
    if(lc==='z'){ x = sx; y = sy; continue; }
    const a = tokens.slice(i, i+n).map(Number); i += n;
    const X = v=>rel ? x+v : v, Y = v=>rel ? y+v : v;
    let nx = x, ny = y;
    if(lc==='h') nx = rel ? x+a[0] : a[0];
    else if(lc==='v') ny = rel ? y+a[0] : a[0];
    else { nx = X(a[n-2]); ny = Y(a[n-1]); }
    if(lc==='a') sample(`M${x} ${y}A${a[0]} ${a[1]} ${a[2]} ${a[3]} ${a[4]} ${nx} ${ny}`);
    else if(lc==='c') sample(`M${x} ${y}C${X(a[0])} ${Y(a[1])} ${X(a[2])} ${Y(a[3])} ${nx} ${ny}`);
    else if(lc==='q') sample(`M${x} ${y}Q${X(a[0])} ${Y(a[1])} ${nx} ${ny}`);
    else if(lc==='s' || lc==='t') sample(`M${x} ${y}L${nx} ${ny}`); // smooth curves: not drawn by the planner; endpoints only
    add(nx, ny);
    x = nx; y = ny;
    if(lc==='m'){ sx = x; sy = y; cmd = rel ? 'l' : 'L'; } // further pairs after M are line-tos
  }
}
// Monotone chain: the convex hull of `pts`, counter-clockwise.
function convexHull(pts){
  const p = pts.slice().sort((a,b)=>a.x-b.x || a.y-b.y);
  if(p.length<3) return p;
  const cross = (o,a,b)=>(a.x-o.x)*(b.y-o.y) - (a.y-o.y)*(b.x-o.x);
  const lower = [], upper = [];
  for(const q of p){ while(lower.length>=2 && cross(lower[lower.length-2], lower[lower.length-1], q)<=0) lower.pop(); lower.push(q); }
  for(let i=p.length-1;i>=0;i--){ const q = p[i]; while(upper.length>=2 && cross(upper[upper.length-2], upper[upper.length-1], q)<=0) upper.pop(); upper.push(q); }
  return lower.slice(0,-1).concat(upper.slice(0,-1));
}

// Anything that changes what the canvas shows calls invalidate(): the frame
// renders once, however many changes it had. Call render() directly only when
// the next line needs its result: recentreView reads contentBounds, and the
// tabletop dimension editor relies on the re-render removing its focused
// input. The render loop's own machinery (this frame, viewFrame's fallback,
// the zoom settle and the frame-synced WASD loop) renders directly too.
let _renderRaf = 0;
function invalidate(){
  if(_renderRaf) return; // a frame is already queued
  _renderRaf = requestAnimationFrame(()=>{ _renderRaf = 0; render(); });
}
// A view frame: only the world <g>'s transform and the zoom readout change,
// instead of a render. Exact for a pan, which nothing inside the world depends
// on. A wheel zoom uses it too, and a render follows once the wheel settles
// (see zoomAt); until then the overlay's constant-screen-size parts (port
// dots, hit zones, arrows, labels) scale with the view. A queued full render
// wins: it reads the same view.
let _worldG = null, _viewRaf = 0;
let _zoomSettleTimer = 0;
// The retained piece layer (see drawPieceBodies): id -> {wrap, g, key, transform, hint}.
let _pieceLayer = null;
const _pieceNodes = new Map();
function viewFrame(){
  if(!_worldG || !_worldG.isConnected){ render(); return; }
  _worldG.setAttribute('transform', `translate(${view.x},${view.y}) scale(${view.scale})`);
  updateZoomReadout();
  if(viewNearCoverEdge()) invalidate(); // about to show what the last render culled
  // The element under a still pointer changes as the layout slides past it.
  refreshHoverAfterRender();
  updateHint();
}
function requestViewFrame(){
  if(_renderRaf || _viewRaf) return;
  _viewRaf = requestAnimationFrame(()=>{ _viewRaf = 0; if(!_renderRaf) viewFrame(); });
}

