/* ============================================================
   POWER VIEW
   A rule of thumb for where feeders belong, not a voltage reading. Each
   piece is coloured by how many joints lie between it and the nearest
   feeder, counted along the track either way, so a loop fed once is fed
   from both sides. Joints rather than distance, since on sectional track
   most of the loss is at the joiners. Blue at a feeder, shading to red at
   powerJointsLimit (the user's own, remembered per browser); leaving a
   turnout counts POWER_TURNOUT_JOINTS for its internal contacts. A view, not
   a mode: editing carries on, and Gradient Mode's colours take over while
   it's open.
   ============================================================ */
let powerView = false;
// Red at 20 by default: Kato's M2 set, fed once, runs fine with its farthest
// piece (in the passing loop) 11.3 joints out, so 10 would mark a layout Kato
// sells as working as poor.
const POWER_JOINTS_DEFAULT = 20, POWER_JOINTS_MAX = 999;
const POWER_LIMIT_KEY = 'katoUnitrackPlanner.powerLimit.v1';
let powerJointsLimit = POWER_JOINTS_DEFAULT;
try{
  const saved = Math.round(Number(localStorage.getItem(POWER_LIMIT_KEY)));
  if(saved>=1 && saved<=POWER_JOINTS_MAX) powerJointsLimit = saved;
}catch(err){ /* private browsing etc.: the default */ }
const POWER_TURNOUT_JOINTS = 1.3;
const POWER_TURNOUT_CATS = new Set(['turnout', 'wye', 'crossover', 'tramturnout']);
// At a feeder --power-near (deep blue, apart from the selection blue), at the
// limit --power-far (the steep red), unless the user picks others (Settings).
const POWER_COLOR_NONE = '#2a2d33';           // no feeder reaches it
// A piece's ports joined electrically inside it, as groups. Double track is
// two separate tracks (ports 0↔2 and 1↔3, as every four-port double piece
// numbers them); a crossover joins them. `powerBlock` (WX310): its insulated
// centre gap cuts both tracks and both diagonals, so each end of each track
// (each port) is a quarter of its own.
function powerNets(type){
  const n = getPorts(type).length, all = Array.from({length:n}, (_, i)=>i);
  if(type.powerBlock) return all.map(i=>[i]);
  if(type.cat==='tramturnout') return [[0, 2, 4], [1, 3, 5]];
  if(type.cat==='tramcross') return [[0, 2], [1, 3], [4, 6], [5, 7]];
  if(n===4 && (type.cat==='dstraight' || type.cat==='dcurve' || type.cat==='widener' || type.cat==='taper' || isStreetTrack(type))) return [[0, 2], [1, 3]];
  return [all];
}
// Turnouts and wyes are power-routing: power fed in at the throat (each net's
// first port) reaches both routes, but power fed in at a route's end only flows
// back to the throat, never across to the other route. (Which way the points
// are set isn't modelled: the throat is taken to feed whichever route is wanted.)
const powerRouting = type=>type.cat==='turnout' || type.cat==='wye' || type.cat==='tramturnout';
// Joints from the nearest feeder, by piece id (Infinity where none reaches).
// A shortest-path search over each piece's nets, starting at every feeder,
// that knows which port power came in by on each piece. A
// piece reads as its worst track (double track can be fed on one side only),
// a powerBlock piece as its best. Kept until the layout's pieces or joins
// change.
let _power = {sig:null, byPiece:new Map(), split:new Map()};
function powerDistances(){
  let sig = '';
  for(const id in pieces) sig += id + ':' + pieces[id].typeId + ';';
  sig += '|' + Object.keys(connections).join(',') + '|' + Object.entries(joiners).join(',');
  if(sig===_power.sig) return _power.byPiece;
  // `dist`: 'id|net|entry' → joints, entry being the port power came in by
  // (-1 on a feeder); `best`: 'id|net' → the least of those.
  const nets = new Map(), dist = new Map(), best = new Map();
  const netsOf = id=>{ let v = nets.get(id); if(!v){ v = powerNets(pieceType(id)); nets.set(id, v); } return v; };
  // A binary heap of [joints, pieceId, netIdx, entry].
  const heap = [];
  const push = item=>{
    heap.push(item);
    for(let i=heap.length-1; i>0;){ const p = (i-1)>>1; if(heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; }
  };
  const pop = ()=>{
    const top = heap[0], last = heap.pop();
    if(heap.length){
      heap[0] = last;
      for(let i=0;;){
        const l = 2*i+1, r = l+1; let m = i;
        if(l<heap.length && heap[l][0] < heap[m][0]) m = l;
        if(r<heap.length && heap[r][0] < heap[m][0]) m = r;
        if(m===i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]]; i = m;
      }
    }
    return top;
  };
  const reach = (d, id, net, entry)=>{
    const k = id + '|' + net + '|' + entry;
    if(dist.has(k) && dist.get(k) <= d) return;
    dist.set(k, d);
    const nk = id + '|' + net;
    if(!best.has(nk) || d < best.get(nk)) best.set(nk, d);
    push([d, id, net, entry]);
  };
  for(const id in pieces){
    const type = pieceType(id);
    if(type.feeder || type.dualFeeder) netsOf(id).forEach((_, net)=>reach(0, id, net, -1));
  }
  // A Terminal UniJoiner feeds the joint: both pieces' tracks there start at
  // nought, entered by that end, so a turnout fed at a route's end still
  // reaches only its throat.
  for(const k in joiners){
    const end = isFeeder(joiners[k]) && joinerEnd(k);
    if(!end) continue;
    const nb = getConnectedNeighbor(end.pieceId, end.portIdx);
    [end, ...(nb && pieces[nb.pieceId] ? [nb] : [])].forEach(({pieceId, portIdx})=>{
      const net = netsOf(pieceId).findIndex(g=>g.includes(portIdx));
      if(net>=0) reach(0, pieceId, net, portIdx);
    });
  }
  while(heap.length){
    const [d, id, net, entry] = pop();
    if(dist.get(id + '|' + net + '|' + entry) < d) continue; // a stale entry
    const type = pieceType(id), step = POWER_TURNOUT_CATS.has(type.cat) ? POWER_TURNOUT_JOINTS : 1;
    // Never back out the way it came, or the piece beyond a turnout's throat
    // would hand power from one route straight back in to feed the other. In
    // at a power-routing piece's throat, out by either route; in at a route's
    // end, out by the throat only.
    const ports = netsOf(id)[net];
    const exits = (powerRouting(type) && entry!==ports[0] ? [ports[0]] : ports).filter(i=>i!==entry);
    exits.forEach(portIdx=>{
      const nb = getConnectedNeighbor(id, portIdx);
      if(!nb || !pieces[nb.pieceId]) return;
      const fitted = joinerAt(id, portIdx);
      if(fitted && joiners[fitted]==='IJ') return; // insulated: no power across
      const nbNet = netsOf(nb.pieceId).findIndex(g=>g.includes(nb.portIdx));
      if(nbNet>=0) reach(d + step, nb.pieceId, nbNet, nb.portIdx);
    });
  }
  // `split`: a piece with more than one net (double track's two tracks, a
  // powerBlock piece's four quarters), each counted and coloured on its own.
  // `byPiece` is the worse track, or a powerBlock piece's best quarter.
  const byPiece = new Map(), split = new Map();
  for(const id in pieces){
    const ds = netsOf(id).map((_, net)=>best.has(id + '|' + net) ? best.get(id + '|' + net) : Infinity);
    if(!ds.length) continue; // no ports (a turntable wedge)
    const block = pieceType(id).powerBlock;
    byPiece.set(id, block ? Math.min(...ds) : Math.max(...ds));
    if(ds.length>1) split.set(id, ds);
  }
  _power = {sig, byPiece, split};
  return byPiece;
}
// A split piece's fill, in the frame's defs and the piece's own coordinates;
// one colour when every net agrees. A powerBlock piece is four quarters, a
// pattern tile of four rects split at the gap (x) and the centre line (y):
// port i's quarter at its own end and track. Double track is two colours
// split by a hard-stop gradient: along the centre line on straight double
// track (and a widener), net 0's track being at negative y; along the mid
// radius on a double curve, with a radial gradient about the curve's centre.
function powerSplitFill(piece, type, frame){
  const ds = _power.split.get(piece.id);
  if(ds.every(d=>d===ds[0])) return powerColor(ds[0]);
  const id = 'powerSplit-' + piece.id;
  if(type.powerBlock){
    const P = getPorts(type), L = type.length, H = 100; // H: past the roadbed's edge
    const pat = el('pattern',{id, patternUnits:'userSpaceOnUse', x:0, y:-H, width:L, height:2*H});
    P.forEach((p, i)=>pat.appendChild(el('rect',{x:p.x < L/2 ? 0 : L/2, y:p.y < 0 ? 0 : H, width:L/2, height:H, fill:powerColor(ds[i])})));
    frame.defs.appendChild(pat);
    return `url(#${id})`;
  }
  if(type.cat==='tramcurve'){
    // The tracks have their own centres, so the split follows the centreline
    // between them: a tile of the inner track's colour, and the outer's beyond
    // the centreline's straight run and arc.
    const sign = twrSign(type), spine = twrArc(0), e = twrEnd(spine), X = -50, Y = -400, far = 200*Math.SQRT1_2;
    const [outer, inner] = sign>0 ? ds : [ds[1], ds[0]];
    const pat = el('pattern', {id, patternUnits:'userSpaceOnUse', x:X, y:Y, width:500, height:800});
    const tile = el('g', {transform:`translate(${-X} ${-Y})`});
    tile.appendChild(el('rect', {x:X, y:Y, width:500, height:800, fill:powerColor(inner)}));
    tile.appendChild(el('path', {fill:powerColor(outer), d:
      `M${X} 0${twrArcD(spine, sign).replace('M0 0', 'L0 0')}L${e.u + far} ${sign*(e.v + far)}L${X + 499} ${-sign*399}L${X} ${-sign*399}Z`}));
    pat.appendChild(tile);
    frame.defs.appendChild(pat);
    return `url(#${id})`;
  }
  let [a, b] = ds;
  const U = {id, gradientUnits:'userSpaceOnUse'};
  let grad;
  if(type.cat==='dcurve'){
    // The centre is on the line through ports 0 and 1 (x = 0), as far from
    // port 0 as from port 2, the same track's other end.
    const P = getPorts(type), y0 = P[0].y;
    const cy = (P[2].x*P[2].x + P[2].y*P[2].y - y0*y0) / (2*(P[2].y - y0));
    const r0 = Math.abs(cy - P[0].y), r1 = Math.abs(cy - P[1].y), mid = (r0 + r1)/2;
    grad = el('radialGradient',{...U, cx:0, cy, fx:0, fy:cy, r:2*mid});
    if(r0 > r1) [a, b] = [b, a]; // the inner track's colour first
  }
  else {
    grad = el('linearGradient',{...U, x1:0, y1:-1, x2:0, y2:1});
    // The -y half takes the first track's colour, so swap when that track is
    // on the +y side (a DW51R, the DW51L mirrored).
    if(getPorts(type)[powerNets(type)[0][0]].y > 0) [a, b] = [b, a];
  }
  [[0, a], [0.5, a], [0.5, b], [1, b]].forEach(([offset, joints])=>
    grad.appendChild(el('stop',{offset, 'stop-color':powerColor(joints)})));
  frame.defs.appendChild(grad);
  return `url(#${id})`;
}
function powerColor(joints){
  if(joints==null || !isFinite(joints)) return POWER_COLOR_NONE;
  return `color-mix(in srgb, var(--power-far) ${(Math.min(1, joints/powerJointsLimit)*100).toFixed(1)}%, var(--power-near))`;
}
function formatJoints(joints){
  return String(Math.round(joints*10)/10);
}
function togglePowerView(){
  powerView = !powerView;
  invalidate();
}
document.getElementById('powerBtn').addEventListener('click', togglePowerView);
// The legend's joints box: a whole number of joints, 1–999, taken as it's
// typed; anything else is left alone until it's valid, and put back on leaving.
document.getElementById('powerInfo').addEventListener('input', e=>{
  if(e.target.id!=='powerLimit') return;
  const n = Math.round(Number(e.target.value));
  if(!(n>=1 && n<=POWER_JOINTS_MAX)) return;
  powerJointsLimit = n;
  try{ localStorage.setItem(POWER_LIMIT_KEY, String(n)); }catch(err){ /* won't persist */ }
  invalidate();
});
document.getElementById('powerInfo').addEventListener('focusout', e=>{
  if(e.target.id==='powerLimit') e.target.value = powerJointsLimit;
});

