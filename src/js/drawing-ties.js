const TIED_RAIL_COLOR = '#ffffff'; // rails on the tied-style pieces, every theme
const FEEDER_BOLT_COLOR = '#f2e6a0'; // the feeder bolt on tied-style pieces: a faint yellow
// `ext`: how far the end ties (and rails) run past the piece ends, so they
// reach the outer face of the roadbed's edge line instead of stopping inside it.
// A curve's ties are radial, spaced along its centreline arc.
// A point on a curve's frame: arc angle tDeg, then u along the tangent and v
// out from the centre (as offsetArcPoint's frame).
function curveFramePoint(R, hand, tDeg, u, v){
  const t = tDeg*Math.PI/180, sg = hand==='L' ? -1 : 1;
  return {x: (R+v)*Math.sin(t) + u*Math.cos(t), y: -sg*R + sg*(R+v)*Math.cos(t) - sg*u*Math.sin(t)};
}
// A turnout's diverging centreline at arc length s from the throat, in the
// curve frame used by curveFramePoint (s past the arc runs on along the tail).
function turnoutDivergeFrame(type){
  const {R, angle:A, tail} = turnoutDivergeShape(type);
  const hand = type.hand==='L' ? 'R' : 'L', arcLen = R*A*Math.PI/180;
  const at = (s, u, v)=>{
    const sArc = Math.min(s, arcLen);
    return curveFramePoint(R, hand, sArc/R*180/Math.PI, u + Math.max(0, s-arcLen), v);
  };
  return {R, A, tail, hand, arcLen, total: arcLen + (tail||0), at};
}
// Turnout ties: through the shared part, long ties square to the through
// route span both tracks; after that each route has its own ties. The split is
// `divergeOwnTies` (the diverging route's own full ties, besides its end half
// tie; 4 on the #4, from a photo), or else where the diverging track is a full
// tie length away (2 * TIE_HALF_LEN; the EP718-15 photo).
function appendTurnoutTies(g, type, ext){
  const L = type.throughLength, H = TIE_HALF_LEN, n = Math.round(L/TIE_PITCH), p = L/n;
  const dv = turnoutDivergeFrame(type);
  // Lateral offset of the diverging centreline along x, sampled.
  const samples = [];
  for(let s=0; s<=dv.total+0.01; s+=0.5){ const q = dv.at(s,0,0); samples.push(q); }
  const offsetAt = x=>{
    for(let i=1;i<samples.length;i++){
      const a=samples[i-1], b=samples[i];
      if(b.x>=x){ const f=(x-a.x)/((b.x-a.x)||1); return a.y+f*(b.y-a.y); }
    }
    return samples[samples.length-1].y;
  };
  const own = type.divergeOwnTies;
  const sSplit = own!=null
    ? Math.max(0, dv.total - (own + 0.5)*TIE_PITCH)
    : samples.findIndex(q=>Math.abs(q.y) >= 2*H) * 0.5;
  const xSplit = dv.at(sSplit, 0, 0).x;
  let d = '';
  const rect = (x0,x1,y0,y1)=>{ d += `M${x0.toFixed(3)} ${y0.toFixed(3)}H${x1.toFixed(3)}V${y1.toFixed(3)}H${x0.toFixed(3)}Z`; };
  for(let k=0;k<=n;k++){
    const x0 = Math.max(-ext, k*p - TIE_W/2), x1 = Math.min(L+ext, k*p + TIE_W/2);
    const yd = offsetAt(k*p);
    if(k*p < xSplit) rect(x0, x1, Math.min(-H, yd-H), Math.max(H, yd+H));
    else rect(x0, x1, -H, H);
  }
  g.appendChild(el('path',{d, fill:tieColor(type)}));
  // The diverging route's own ties, back from its end to where it separates.
  // A path of their own: where they overlap the through ties with the opposite
  // winding, one shared path would leave holes.
  d = '';
  const m = own!=null ? own : Math.round((dv.total - sSplit)/TIE_PITCH);
  for(let j=0;j<=m;j++){
    const sC = dv.total - j*TIE_PITCH;
    if(sC < sSplit) break;
    const u0 = -TIE_W/2, u1 = j===0 ? ext : TIE_W/2;
    const pts = [[u0,-H],[u1,-H],[u1,H],[u0,H]].map(([u,v])=>dv.at(sC, u, v));
    d += polyD(pts);
  }
  const own_ = el('path',{d, fill:tieColor(type)});
  if(type.fillBetween){
    // At the compact turnout's 45° the diverging ties are steep enough that
    // where the routes part, one pokes a corner past the through ties' ends
    // (an orphaned speck between the tracks). Stop them at that line.
    const sg = Math.sign(dv.at(dv.total, 0, 0).y), far = 1000;
    g.appendChild(clipTo(own_, `M${-far} ${sg*H}H${far}V${sg*far}H${-far}Z`));
  } else g.appendChild(own_);
}
// A wye branch's centreline frame, like turnoutDivergeFrame but for either hand.
function wyeBranchFrame(type, hand){
  const {R, angle:A, tail} = turnoutDivergeShape(type);
  const arcLen = R*A*Math.PI/180;
  const at = (s, u, v)=>curveFramePoint(R, hand, Math.min(s, arcLen)/R*180/Math.PI, u + Math.max(0, s-arcLen), v);
  return {total: arcLen + (tail||0), at};
}
// Wye ties: long ties square to the centreline span both branches from the
// throat; each branch's last `divergeOwnTies` full ties (9 on the #2, from a
// photo) and its end half tie are its own, square to that branch.
function appendWyeTies(g, type, ext){
  const H = TIE_HALF_LEN, own = type.divergeOwnTies ?? 9;
  const brs = ['L','R'].map(h=>wyeBranchFrame(type, h));
  const sSplit = Math.max(0, brs[0].total - (own + 0.5)*TIE_PITCH);
  const xSplit = brs[0].at(sSplit, 0, 0).x;
  const samples = [];
  for(let s=0; s<=brs[0].total+0.01; s+=0.5) samples.push(brs[0].at(s,0,0));
  const offsetAt = x=>{
    for(let i=1;i<samples.length;i++){
      const a=samples[i-1], b=samples[i];
      if(b.x>=x){ const f=(x-a.x)/((b.x-a.x)||1); return Math.abs(a.y+f*(b.y-a.y)); }
    }
    return Math.abs(samples[samples.length-1].y);
  };
  let d = '';
  for(let k=0; k*TIE_PITCH < xSplit; k++){
    const x = k*TIE_PITCH, x0 = Math.max(-ext, x - TIE_W/2), x1 = x + TIE_W/2, yd = offsetAt(x);
    d += `M${x0.toFixed(3)} ${(-yd-H).toFixed(3)}H${x1.toFixed(3)}V${(yd+H).toFixed(3)}H${x0.toFixed(3)}Z`;
  }
  g.appendChild(el('path',{d, fill:tieColor(type)}));
  // Each branch's own ties in a path of its own (opposite windings would cancel).
  brs.forEach(br=>{
    let dd = '';
    for(let j=0;j<=own;j++){
      const sC = br.total - j*TIE_PITCH;
      const u0 = -TIE_W/2, u1 = j===0 ? ext : TIE_W/2;
      const pts = [[u0,-H],[u1,-H],[u1,H],[u0,H]].map(([u,v])=>br.at(sC, u, v));
      dd += polyD(pts);
    }
    g.appendChild(el('path',{d:dd, fill:tieColor(type)}));
  });
}
// The turntable's fitted connecting tracks (S140D, R678-10L/R): ties square to
// the track at the usual pitch, along the straight or along the curve's
// centreline Bezier. Their roadbed is a tapering wedge, so the ties are masked
// to it, a thick-edge width in from its outline.
function connectorCentreline(type){
  if(type.cat==='turntableConnector'){
    const L = type.length;
    return {len:L, at:s=>({x:s, y:0, tx:1, ty:0})};
  }
  const n = turntableConnectorCurveBezier(type, 0).match(/-?[\d.]+(?:e-?\d+)?/g).map(Number);
  const [x0,y0,x1,y1,x2,y2,x3,y3] = n;
  const B = t=>{ const u=1-t; return {x:u*u*u*x0+3*u*u*t*x1+3*u*t*t*x2+t*t*t*x3, y:u*u*u*y0+3*u*u*t*y1+3*u*t*t*y2+t*t*t*y3}; };
  const N = 200, pts = [B(0)], acc = [0];
  for(let i=1;i<=N;i++){ const q=B(i/N); acc.push(acc[i-1]+Math.hypot(q.x-pts[i-1].x, q.y-pts[i-1].y)); pts.push(q); }
  const len = acc[N];
  const at = s=>{
    let i = 1; while(i<N && acc[i]<s) i++;
    const a=pts[i-1], b=pts[i], f=(s-acc[i-1])/((acc[i]-acc[i-1])||1), dl=Math.hypot(b.x-a.x,b.y-a.y)||1;
    return {x:a.x+f*(b.x-a.x), y:a.y+f*(b.y-a.y), tx:(b.x-a.x)/dl, ty:(b.y-a.y)/dl};
  };
  return {len, at};
}
function appendConnectorTies(g, type){
  const H = TIE_HALF_LEN, c = connectorCentreline(type);
  const n = Math.round(c.len/TIE_PITCH), p = c.len/n;
  // `tieAt` (the turntable bumper): only these, as on the S35B-D.
  const centres = type.tieAt || Array.from({length:n+1}, (_, k)=>k*p);
  let d = '';
  for(const sC of centres){
    const q = c.at(Math.min(sC, c.len-1e-6)), nx = -q.ty, ny = q.tx;
    const pts = [[-TIE_W/2,-H],[TIE_W/2,-H],[TIE_W/2,H],[-TIE_W/2,H]]
      .map(([u,v])=>({x:q.x+u*q.tx+v*nx, y:q.y+u*q.ty+v*ny}));
    d += polyD(pts);
  }
  const rb = pieceGraphics(type)[0].roadbed;
  const id = 'tiedmask' + (++_tiedMaskSeq);
  const m = pieceMask(id);
  m.appendChild(el('path', {d:rb, fill:'#fff'}));
  m.appendChild(el('path', {d:rb, fill:'none', stroke:'#000', 'stroke-width':2*(TIE_W/2 + 0.5)}));
  g.appendChild(m);
  g.appendChild(el('path',{d, fill:tieColor(type), mask:`url(#${id})`}));
}
// Curved girder bridges (`chordTies`, R448-15T): everything is square to the
// straight main chord, not to the curve. In a frame along the chord through
// the centreline's two ends: u along it, v across towards the curve's bulge.
function curveChordFrame(type){
  const {radius:R, angle, hand} = type;
  const P0 = curveFramePoint(R, hand, 0, 0, 0), P1 = curveFramePoint(R, hand, angle, 0, 0);
  const len = Math.hypot(P1.x-P0.x, P1.y-P0.y), ux = (P1.x-P0.x)/len, uy = (P1.y-P0.y)/len;
  const M = curveFramePoint(R, hand, angle/2, 0, 0);
  let nx = -uy, ny = ux;
  if((M.x-P0.x)*nx + (M.y-P0.y)*ny < 0){ nx = -nx; ny = -ny; }
  const sag = (M.x-P0.x)*nx + (M.y-P0.y)*ny; // how far the curve bows off the chord
  const pt = (u, v)=>({x:P0.x + u*ux + v*nx, y:P0.y + u*uy + v*ny});
  const vOf = q=>(q.x-P0.x)*nx + (q.y-P0.y)*ny;
  const uOf = q=>(q.x-P0.x)*ux + (q.y-P0.y)*uy;
  return {len, sag, pt, vOf, uOf};
}
// The thin chords under everything: straight, parallel to the main chord and
// its length. Symmetric about the chord through the centreline's ends, so in
// an S-curve of two joined pieces (a half turn about the join) each piece's
// inner thin chord lines up with the other's outer one.
function appendChordFrameUnderChords(g, type){
  if(!type.chordTies) return;
  const f = curveChordFrame(type), color = type.structureColor || BRIDGE_STEEL_COLOR;
  const W = 2*0.7, off = RAIL_OFF + 1.4 + W/2, mid = f.sag/2;
  // Each ends on the piece's end lines, like the main chord: its two edges
  // run from one end line to the other.
  const {radius:R, angle, hand} = type;
  const along = (v, t)=>{ // where the line at offset v meets the end line at arc angle t
    const a = f.vOf(offsetArcPoint(R, hand, t, R-60)), b = f.vOf(offsetArcPoint(R, hand, t, R+60));
    const ua = f.uOf(offsetArcPoint(R, hand, t, R-60)), ub = f.uOf(offsetArcPoint(R, hand, t, R+60));
    return f.pt(ua + (ub-ua)*(v-a)/(b-a), v);
  };
  let d = '';
  [-(mid + off), mid + off].forEach(v=>{
    const pts = [along(v-W/2, 0), along(v-W/2, angle), along(v+W/2, angle), along(v+W/2, 0)];
    d += 'M'+pts.map(q=>`${q.x},${q.y}`).join('L')+'Z';
  });
  g.appendChild(el('path',{d, fill:color}));
  // 11 thin cross-beams, square to the chords and evenly spaced, from the main
  // chord's line across to the far thin chord's outer edge. The end ones sit
  // as far out as the whole beam stays inside the piece's end lines: on R448
  // that's the main chord's outer corner, not the angled bit that juts out.
  const vMain = f.vOf(offsetArcPoint(R, hand, 0, curvedChordRadius(type))), half = BRIDGE_BEAM_T; // main chord: THICK/2 either side
  const vOuter = vMain + Math.sign(vMain)*half;             // its outer edge, away from the track
  const vFar = -Math.sign(vMain)*(mid + off + W/2);        // far thin chord's outer edge
  const vInnerEdge = vMain - Math.sign(vMain)*half;
  // Where every line a beam crosses is still within the piece's end lines.
  const spanVs = [vOuter, vInnerEdge, vFar];
  const uA = Math.max(...spanVs.map(v=>f.uOf(along(v, 0))));
  const uB = Math.min(...spanVs.map(v=>f.uOf(along(v, angle)))), nB = 11;
  let bd = '';
  for(let i=0;i<nB;i++){
    const u = uA + i*(uB-uA)/(nB-1), a = f.pt(u, vMain), b = f.pt(u, vFar);
    bd += `M${a.x},${a.y} L${b.x},${b.y}`;
  }
  g.appendChild(el('path',{d:bd, stroke:color, 'stroke-width':BRIDGE_LINE_T/2, fill:'none'}));
  // A zigzag between the thin chords: from the middle cross-beam on the
  // outer thin chord, then alternately the inner and outer one at each beam.
  const vOutChord = -Math.sign(vMain)*(mid + off), vInChord = Math.sign(vMain)*(mid + off), midB = (nB-1)/2;
  const zz = [];
  for(let i=0;i<nB;i++){
    const u = uA + i*(uB-uA)/(nB-1);
    zz.push(f.pt(u, (Math.abs(i-midB) % 2 === 0) ? vOutChord : vInChord));
  }
  g.appendChild(el('path',{d:'M'+zz.map(q=>`${q.x},${q.y}`).join('L'), stroke:color, 'stroke-width':BRIDGE_LINE_T/2,
    fill:'none', 'stroke-linejoin':'round'}));
}
function appendChordFrameTies(g, type){
  const f = curveChordFrame(type), H = TIE_HALF_LEN;
  // Across the whole curve: from the main chord's line (the chord covers the
  // ends) to the far side of the track where it bows furthest.
  const {radius:R, angle, hand} = type;
  const vChord = f.vOf(offsetArcPoint(R, hand, 0, curvedChordRadius(type)));
  // ...and at least over both thin chords (on R481 the far one sits past the track's own width).
  const thin = f.sag/2 + RAIL_OFF + 1.4 + 1.4;
  const vLo = Math.min(vChord, -H, -thin), vHi = Math.max(vChord, f.sag + H, thin);
  const m = Math.round(f.len/TIE_PITCH), q = f.len/m;
  let d = '';
  for(let k=0;k<m;k++){
    const u = (k+0.5)*q;
    const pts = [[u-TIE_W/2, vLo],[u+TIE_W/2, vLo],[u+TIE_W/2, vHi],[u-TIE_W/2, vHi]].map(([a,b])=>f.pt(a,b));
    d += polyD(pts);
  }
  // Trimmed to the piece's end lines (where the rails and the chord's ends
  // stop), so the end ties don't reach past the chord.
  const q0a = offsetArcPoint(R, hand, 0, R-60), q0b = offsetArcPoint(R, hand, 0, R+60);
  const q1a = offsetArcPoint(R, hand, angle, R-60), q1b = offsetArcPoint(R, hand, angle, R+60);
  g.appendChild(clipTo(el('path',{d, fill:tieColor(type)}), `M${q0a.x},${q0a.y}L${q0b.x},${q0b.y}L${q1b.x},${q1b.y}L${q1a.x},${q1a.y}Z`));
  appendCurvedBridgeChord(g, type); // the main chord over the tie ends
}
// `shown`: whether ties are drawn; the canvas passes its piece spec's, other
// callers get what the canvas currently shows.
function appendTies(g, type, ext, shown = tiesView.shown){
  if(!type.ties || !shown){ if(type.chordTies) appendCurvedBridgeChord(g, type); return; }
  if(type.chordTies){ appendChordFrameTies(g, type); return; }
  if(type.cat==='curve'){
    const {radius:R, angle, hand} = type;
    const n = Math.round(R*angle*Math.PI/180/TIE_PITCH);
    let d = '';
    for(let k=0;k<=n;k++){
      const t = k*angle/n;
      const u0 = k===0 ? -ext : -TIE_W/2, u1 = k===n ? ext : TIE_W/2;
      const pts = [[u0,-TIE_HALF_LEN],[u1,-TIE_HALF_LEN],[u1,TIE_HALF_LEN],[u0,TIE_HALF_LEN]]
        .map(([u,v])=>curveFramePoint(R, hand, t, u, v));
      d += polyD(pts);
    }
    g.appendChild(el('path',{d, fill:tieColor(type)}));
    return;
  }
  if(type.cat==='dcurve' && type.ties!=='slab'){
    // Double curve: each track's ties square to its own arc, fitted to that
    // arc's length at the usual pitch, a half tie at each end. Both tracks
    // share the centreline's frame, offset out to their radius.
    const {angle, hand} = type, R = (type.radiusInner+type.radiusOuter)/2;
    let d = '';
    [type.radiusInner, type.radiusOuter].forEach(r=>{
      const n = Math.round(r*angle*Math.PI/180/TIE_PITCH), vc = r - R;
      for(let k=0;k<=n;k++){
        const t = k*angle/n;
        const u0 = k===0 ? -ext : -TIE_W/2, u1 = k===n ? ext : TIE_W/2;
        const pts = [[u0,vc-TIE_HALF_LEN],[u1,vc-TIE_HALF_LEN],[u1,vc+TIE_HALF_LEN],[u0,vc+TIE_HALF_LEN]]
          .map(([u,v])=>curveFramePoint(R, hand, t, u, v));
        d += polyD(pts);
      }
    });
    g.appendChild(el('path',{d, fill:tieColor(type)}));
    return;
  }
  if(type.cat==='turnout'){ appendTurnoutTies(g, type, ext); return; }
  if(type.cat==='turntableConnector' || type.cat==='turntableConnectorCurve'){ appendConnectorTies(g, type); return; }
  if(type.cat==='turntableBridge'){
    // The turntable's bridge track: ties at the usual pitch along its length,
    // trimmed to the deck (whose ends are arcs of the pit).
    const L = type.length, H = TIE_HALF_LEN, n = Math.round(L/TIE_PITCH), p = L/n;
    let d = '';
    for(let k=0;k<=n;k++){ const x0 = k*p - TIE_W/2, x1 = k*p + TIE_W/2; d += `M${x0.toFixed(3)} ${-H}H${x1.toFixed(3)}V${H}H${x0.toFixed(3)}Z`; }
    g.appendChild(clipTo(el('path',{d, fill:tieColor(type)}), pieceGraphics(type)[0].roadbed));
    return;
  }
  if(type.cat==='wye'){ appendWyeTies(g, type, ext); return; }
  if(type.cat==='crossing' && type.diagonalOffset===undefined){
    // X90: only `ownEndTies` ties at each end of each route (3, counting the
    // end half tie), square to that route; the busy centre has none. The four
    // innermost sit where their ends meet, framing a square around the centre.
    const L = type.length, H = TIE_HALF_LEN, own = type.ownEndTies ?? 3;
    const P = getPorts(type);
    const routes = [[P[0], P[1]], [P[3], P[2]]];
    routes.forEach(([A, B_])=>{
      const len = Math.hypot(B_.x-A.x, B_.y-A.y), dx = (B_.x-A.x)/len, dy = (B_.y-A.y)/len;
      const n = Math.round(len/TIE_PITCH), p = len/n;
      let d = '';
      for(let j=0;j<=n;j++){
        if(j >= own && j <= n-own) continue;
        const u0 = j===0 ? -ext : -TIE_W/2, u1 = j===n ? ext : TIE_W/2;
        const frame = len/2 - (H - TIE_W/2); // innermost: an outer corner on the next route's tie end
        const c = j===own-1 ? frame : j===n-own+1 ? len - frame : j*p;
        const pts = [[c+u0,-H],[c+u1,-H],[c+u1,H],[c+u0,H]].map(([u,v])=>({x:A.x + u*dx - v*dy, y:A.y + u*dy + v*dx}));
        d += polyD(pts);
      }
      g.appendChild(el('path',{d, fill:tieColor(type)}));
    });
    // The crossing's centre block, in the tie colour, filling the square inside
    // the four innermost ties, under the rails.
    const cx = (P[0].x+P[1].x)/2, cy = (P[0].y+P[1].y)/2, half = H - TIE_W;
    g.appendChild(el('rect',{x:cx-half, y:cy-half, width:2*half, height:2*half, fill:tieColor(type)}));
    return;
  }
  if(type.cat==='crossing' && type.diagonalOffset!==undefined){
    // X15: each route has `ownEndTies` ties of its own at each end (5, from a
    // photo, counting the end half tie), square to that route. Between them,
    // long ties square to the straight route (the shorter one) span both.
    const L = type.length, H = TIE_HALF_LEN, own = type.ownEndTies ?? 5;
    const P = getPorts(type), A = P[3], Bp = P[2];
    const dL = Math.hypot(Bp.x-A.x, Bp.y-A.y), dx = (Bp.x-A.x)/dL, dy = (Bp.y-A.y)/dL;
    const tanT = dy/dx, bandHalf = H/dx; // the diagonal's ties, measured along y
    const n = Math.round(L/TIE_PITCH), p = L/n;
    let d = '';
    for(let k=0;k<=n;k++){
      const x0 = Math.max(-ext, k*p - TIE_W/2), x1 = Math.min(L+ext, k*p + TIE_W/2);
      let y0 = -H, y1 = H;
      if(k >= own && k <= n-own){
        const yd = A.y + (k*p - A.x)*tanT;
        y0 = Math.min(-H, yd - bandHalf); y1 = Math.max(H, yd + bandHalf);
      }
      d += `M${x0.toFixed(3)} ${y0.toFixed(3)}H${x1.toFixed(3)}V${y1.toFixed(3)}H${x0.toFixed(3)}Z`;
    }
    g.appendChild(el('path',{d, fill:tieColor(type)}));
    // The diagonal's own end ties, in their own path (opposite windings).
    const nd = Math.round(dL/TIE_PITCH), pd = dL/nd;
    let dd = '';
    for(let j=0;j<=nd;j++){
      if(j >= own && j <= nd-own) continue;
      const u0 = j===0 ? -ext : -TIE_W/2, u1 = j===nd ? ext : TIE_W/2, c = j*pd;
      const pts = [[c+u0,-H],[c+u1,-H],[c+u1,H],[c+u0,H]].map(([u,v])=>({x:A.x + u*dx - v*dy, y:A.y + u*dy + v*dx}));
      dd += polyD(pts);
    }
    g.appendChild(el('path',{d:dd, fill:tieColor(type)}));
    return;
  }
  if(PIT_STYLES[type.ties]){
    // Pit tracks: the mounts under each rail (PIT_STYLES), in place of ties.
    const s = PIT_STYLES[type.ties], L = type.length, n = s.blocks-1, span = L - 2*s.first;
    let d = '';
    const block = (x, [w, h])=>[-RAIL_OFF, RAIL_OFF].forEach(y=>{
      d += `M${(x-w/2).toFixed(3)} ${y-h/2}H${(x+w/2).toFixed(3)}V${y+h/2}H${(x-w/2).toFixed(3)}Z`;
    });
    block(s.endBlock, s.endSize); block(L-s.endBlock, s.endSize);
    for(let k=0;k<s.blocks;k++) block(s.first + k*span/n, s.block);
    g.appendChild(el('path',{d, fill:s.blockColor, stroke:PIT_BLOCK_EDGE, 'stroke-width':0.3}));
    return;
  }
  if(type.ties==='slab'){
    // Slab track's rail fastenings, in place of ties: a block across each rail
    // every SLAB_FASTENING_PITCH, set so each panel seam falls midway between
    // two, and none within SLAB_FASTENING_END_CLEAR of an end, where the rail
    // joiners sit (all from a photo).
    // Each track spaces its own along its own length (on a curve, the outer
    // track's is longer), square to the track.
    const fr = slabFrame(type), bw = SLAB_FASTENING_W/2, bh = SLAB_FASTENING_ACROSS/2;
    let d = '';
    fr.tracks.forEach(vt=>{
      const L = fr.len(vt), m = Math.round(L/SLAB_FASTENING_PITCH), q = L/m;
      for(let j=0;j<m;j++){
        const x = (j+0.5)*q;
        if(x < SLAB_FASTENING_END_CLEAR || x > L-SLAB_FASTENING_END_CLEAR) continue;
        [vt-RAIL_OFF, vt+RAIL_OFF].forEach(v=>{
          const pts = [[-bw,-bh],[bw,-bh],[bw,bh],[-bw,bh]].map(([du,dv])=>fr.at(x/L, v+dv, du));
          d += polyD(pts);
        });
      }
    });
    g.appendChild(el('path',{d, fill:SLAB_FASTENING_COLOR}));
    return;
  }
  if(type.cat==='dstraight' && !type.tiesBetweenCaps){
    // Double-track straight (WS248PC and the rest, WS186T): each track's ties along the full
    // length at the standard pitch, a half tie at each end, running on to the
    // edge's outer face where there is a tied edge (`ext`).
    const L = type.length, S = type.spacing, H = TIE_HALF_LEN, n = Math.round(L/TIE_PITCH), p = L/n;
    let d = '';
    for(let k=0;k<=n;k++){
      const x0 = Math.max(-ext, k*p - TIE_W/2), x1 = Math.min(L+ext, k*p + TIE_W/2);
      [-S/2, S/2].forEach(y=>{ d += `M${x0.toFixed(3)} ${y-H}H${x1.toFixed(3)}V${y+H}H${x0.toFixed(3)}Z`; });
    }
    g.appendChild(el('path',{d, fill:tieColor(type)}));
    return;
  }
  if(type.cat==='widener'){
    // Widening section: the straight track's ties as a straight's; the
    // curving track's square to its S, evenly along it. A half tie at every
    // end, running on to the edge (`ext`).
    const L = type.length, H = TIE_HALF_LEN, yS = (type.hand==='L' ? -1 : 1)*type.spacingNear/2;
    const n = Math.round(L/TIE_PITCH), p = L/n;
    let d = '';
    for(let k=0;k<=n;k++){
      const x0 = Math.max(-ext, k*p - TIE_W/2), x1 = Math.min(L+ext, k*p + TIE_W/2);
      d += `M${x0.toFixed(3)} ${yS-H}H${x1.toFixed(3)}V${yS+H}H${x0.toFixed(3)}Z`;
    }
    const cf = widenerCurveFrame(type), m = Math.round(cf.total/TIE_PITCH), q = cf.total/m;
    for(let k=0;k<=m;k++){
      const c = cf.at(k*q), h = c.heading*Math.PI/180, dx = Math.cos(h), dy = Math.sin(h);
      const u0 = k===0 ? -ext : -TIE_W/2, u1 = k===m ? ext : TIE_W/2;
      const pts = [[u0,-H],[u1,-H],[u1,H],[u0,H]].map(([u,v])=>({x:c.x + u*dx - v*dy, y:c.y + u*dy + v*dx}));
      d += polyD(pts);
    }
    g.appendChild(el('path',{d, fill:tieColor(type)}));
    return;
  }
  if(type.cat==='taper'){
    // Each track's ties square to it, evenly along its S-curve; a half tie at
    // every end, running on to the edge (`ext`).
    const H = TIE_HALF_LEN;
    let d = '';
    taperTracks(type).forEach(t=>{
      const cf = sCurveFrame(type.length, t.d, t.hand, t.y0), m = Math.round(cf.total/TIE_PITCH), q = cf.total/m;
      for(let k=0;k<=m;k++){
        const c = cf.at(k*q), h = c.heading*Math.PI/180, dx = Math.cos(h), dy = Math.sin(h);
        const u0 = k===0 ? -ext : -TIE_W/2, u1 = k===m ? ext : TIE_W/2;
        d += polyD([[u0,-H],[u1,-H],[u1,H],[u0,H]].map(([u,v])=>({x:c.x + u*dx - v*dy, y:c.y + u*dy + v*dx})));
      }
    });
    g.appendChild(el('path',{d, fill:tieColor(type)}));
    return;
  }
  if(type.cat==='dstraight' && type.tiesBetweenCaps){
    // Double truss (WS248T): both tracks' ties at the standard pitch between
    // the end caps only, half a spacing clear of each.
    const L = type.length, S = type.spacing, H = TIE_HALF_LEN;
    const span = L - 2*GIRDER_CAP_THICK, m = Math.round(span/TIE_PITCH), q = span/m;
    let d = '';
    for(let k=0;k<m;k++){
      const x = GIRDER_CAP_THICK + (k+0.5)*q, x0 = x - TIE_W/2, x1 = x + TIE_W/2;
      [-S/2, S/2].forEach(y=>{ d += `M${x0.toFixed(3)} ${y-H}H${x1.toFixed(3)}V${y+H}H${x0.toFixed(3)}Z`; });
    }
    g.appendChild(el('path',{d, fill:tieColor(type)}));
    return;
  }
  if(type.cat==='crossover'){
    // Double crossover: at each end the two tracks have `ownEndTies` ties each
    // (19 on the WX310, from a photo, counting the end half tie), widening
    // towards the other track as each turnout's diagonal pulls away, like a
    // turnout's; between them, long ties run across both tracks.
    const L = type.length, S = type.spacing, H = TIE_HALF_LEN, n = Math.round(L/TIE_PITCH), p = L/n;
    const own = type.ownEndTies ?? 19;
    // How far a diagonal has moved off its track, x from the nearer end: an
    // S-curve from leadIn over the crossing length (crossoverDiagonalD's).
    const lead = type.leadIn, crossLen = L - 2*lead, {R} = crossoverGeometry(crossLen, S);
    const drift = xEnd=>{
      const u = xEnd - lead;
      if(u <= 0) return 0;
      if(u <= crossLen/2) return R - Math.sqrt(Math.max(0, R*R - u*u));
      return S - (R - Math.sqrt(Math.max(0, R*R - (crossLen-u)*(crossLen-u))));
    };
    let d = '';
    const rect = (x0,x1,y0,y1)=>{ d += `M${x0.toFixed(3)} ${y0}H${x1.toFixed(3)}V${y1}H${x0.toFixed(3)}Z`; };
    if(type.hand){
      // Single crossover (concrete tie), from a photo: at each end the plain
      // track, away from that end's points, has `ownEndTies` concrete ties
      // (19, counting the end half tie, at the standard pitch: the real part's
      // finer concrete pitch isn't modelled); the turnout track's ties are
      // brown urethane (URETHANE_TIE_COLOR) and widen towards the other track
      // as the diagonal pulls away. Between the two runs, urethane ties span
      // both tracks.
      const yStart = (type.hand==='L' ? -1 : 1)*S/2; // the diagonal's track at x=0
      const toward = y=>y<0 ? 1 : -1;                // from a track towards the other
      let dc = '';
      const span = (x0, x1, y, dd, concrete)=>{
        const a = y-H, b = y+H, ext_ = toward(y)*dd;
        const s = `M${x0.toFixed(3)} ${ext_<0 ? a+ext_ : a}H${x1.toFixed(3)}V${ext_>0 ? b+ext_ : b}H${x0.toFixed(3)}Z`;
        if(concrete) dc += s; else d += s;
      };
      for(let k=0;k<=n;k++){
        const x = k*p, x0 = Math.max(-ext, x - TIE_W/2), x1 = Math.min(L+ext, x + TIE_W/2);
        if(k < own){ span(x0, x1, -yStart, 0, true); span(x0, x1, yStart, drift(x), false); }
        else if(k > n-own){ span(x0, x1, yStart, 0, true); span(x0, x1, -yStart, drift(L-x), false); }
        else rect(x0, x1, -S/2-H, S/2+H);
      }
      g.appendChild(el('path',{d, fill:URETHANE_TIE_COLOR}));
      g.appendChild(el('path',{d:dc, fill:tieColor(type)}));
      return;
    }
    for(let k=0;k<=n;k++){
      const x0 = Math.max(-ext, k*p - TIE_W/2), x1 = Math.min(L+ext, k*p + TIE_W/2);
      if(k < own || k > n-own){
        const dd = drift(Math.min(k*p, L - k*p));
        rect(x0, x1, -S/2-H, -S/2+H+dd); rect(x0, x1, S/2-H-dd, S/2+H);
      }
      else rect(x0, x1, -S/2-H, S/2+H);
    }
    g.appendChild(el('path',{d, fill:tieColor(type)}));
    return;
  }
  if(type.cat!=='straight') return;
  const L = type.length;
  if(type.expansion){
    // Each half carries its own ties, fitted like a 39mm straight (a half tie at
    // each of its ends, so collapsed they meet as one full tie); the strip
    // between has none.
    const H = EXPANSION_HALF, n = Math.round(H/TIE_PITCH), p = H/n;
    let d = '';
    [[0, -ext, H], [L-H, L-H, L+ext]].forEach(([s, lo, hi])=>{
      for(let k=0;k<=n;k++){
        const x0 = Math.max(lo, s+k*p-TIE_W/2), x1 = Math.min(hi, s+k*p+TIE_W/2);
        d += `M${x0.toFixed(3)} ${-TIE_HALF_LEN}H${x1.toFixed(3)}V${TIE_HALF_LEN}H${x0.toFixed(3)}Z`;
      }
    });
    g.appendChild(el('path',{d, fill:tieColor(type)}));
    return;
  }
  // A bumper with `tieCount`: that many ties from the port end, at the standard
  // pitch, the first a half tie at the end (8 on the S50B-C, from a photo).
  const n = type.tieCount ? type.tieCount-1 : Math.round(L/TIE_PITCH);
  let p = type.tieCount ? TIE_PITCH : L/n;
  // `tiesToBlock` (S66B-ALT): spread the ties so the last butts against the
  // front of the bumper block.
  if(type.tiesToBlock) p = (bumperBlockStart(type) - TIE_W/2)/n;
  // `tieAt`: ties only at these positions (the S35B-D's: one under each end of
  // its rails, the port-end one a full tie just clear of the edge).
  let centres = type.tieAt || Array.from({length:n+1}, (_, k)=>k*p);
  // `boxTies` (S186T): that many ties evenly in each full box between the
  // girder's cross-beams, the same pitch running on into the half boxes (2
  // each), measured out from the middle cross-beam. None on the end caps.
  // `tiesBetweenCaps` (S248T): ties at the standard pitch between the end caps
  // only, half a spacing clear of each.
  if(type.tiesBetweenCaps){
    const span = L - 2*GIRDER_CAP_THICK, m = Math.round(span/TIE_PITCH), q = span/m;
    centres = Array.from({length:m}, (_, k)=>GIRDER_CAP_THICK + (k+0.5)*q);
  }
  if(type.boxTies){
    const fullW = (L - 2*GIRDER_CAP_THICK)/7, q = fullW/type.boxTies, count = 3*type.boxTies + 2;
    centres = [];
    for(let k=0;k<count;k++){ centres.push(L/2 - (k+0.5)*q, L/2 + (k+0.5)*q); }
  }
  // A cut end (S62J) has bare roadbed where its rails stop short: no ties there,
  // and nothing reaches past that end.
  const lo = type.cutEnd==='near' ? CUT_END_TRIM : -ext;
  const hi = type.cutEnd==='far' ? L-CUT_END_TRIM : L+ext;
  let d = '';
  for(let k=0;k<centres.length;k++){
    const x0 = Math.max(lo, centres[k] - TIE_W/2), x1 = Math.min(hi, centres[k] + TIE_W/2);
    if(x1<=x0) continue;
    d += `M${x0.toFixed(3)} ${-TIE_HALF_LEN}H${x1.toFixed(3)}V${TIE_HALF_LEN}H${x0.toFixed(3)}Z`;
  }
  const ties = el('path',{d, fill:tieColor(type)});
  if(type.wedgeSide){
    // Stop the ties inside the S60's tapered edge, a thick-edge width `w` in
    // from the bevel and the shelf beyond it: clip them outside the region
    // bounded by those two lines moved w inward. The lines meet at `q`, where
    // a mitred stroke of the bevel would put its inner corner (the bevel
    // turns only 15°). Past the bevel's outer end the region runs on beyond
    // the ties' reach.
    const H = ROADBED_HALF, Wn = WEDGE_NARROW_W, Lr = L - WEDGE_END_TRIM, w = TIE_W/2 + 0.5;
    const T = Lr - (ROADBED_W - Wn)/Math.tan(WEDGE_TAPER_ANGLE*Math.PI/180);
    const sg = type.wedgeSide==='L' ? 1 : -1; // the tapered side's y sign
    const p0 = {x:T, y:sg*H}, p1 = {x:Lr, y:sg*(Wn-H)};
    const len = Math.hypot(p1.x-p0.x, p1.y-p0.y), ux = (p1.x-p0.x)/len, uy = (p1.y-p0.y)/len;
    let nx = -uy, ny = ux; // the bevel's normal, turned to point into the piece
    if(ny*sg > 0){ nx = -nx; ny = -ny; }
    const yShelf = sg*(Wn-H-w), t = (yShelf - (p0.y + ny*w))/uy;
    const q = {x: p0.x + nx*w + ux*t, y: yShelf};
    const back = {x: p0.x + nx*w - ux*20, y: p0.y + ny*w - uy*20}, far = L+ext+20, out = sg*(H+50);
    const hidden = `M${back.x} ${back.y}L${q.x} ${q.y}L${far} ${yShelf}L${far} ${out}L${back.x} ${out}Z`;
    g.appendChild(clipTo(ties, `M${-ext-1} ${-H-5}H${L+ext+1}V${H+5}H${-ext-1}Z`, [hidden]));
    return;
  }
  g.appendChild(ties);
}
let _tiedMaskSeq = 0; // unique ids for the masks still used (turntable connector ties)
// A tied turnout's roadbed. On a `trimEnds` turnout, near the far end each route's roadbed pokes past
// the other's end where it has no ties: the through route's corner beyond
// the diverging end, and the diverging route's corner beyond the through end.
// Each is trimmed away: the wedge beyond the other route's end line, on the
// other route's side of this one. Fills, the thin shared outline and the
// thick inward edge (each route's outline stroked inward where no other route
// covers it) are all clipped by it (clipTo).
function appendTrimmedTurnoutRoadbed(g, type, segs, style, baseEdgeW){
  const B = 1000, L = type.throughLength, sd = type.hand==='L' ? -1 : 1; // diverging side
  const wedges = [];
  if(type.trimEnds){ // only where the routes' ends crowd each other (the #4s)
  const dv = turnoutDivergeFrame(type);
  const P2 = dv.at(dv.total, 0, 0), P2f = dv.at(dv.total, 1, 0);
  const h = {x:P2f.x-P2.x, y:P2f.y-P2.y}; // diverging end heading (unit)
  const along = {x:-h.y*sd, y:h.x*sd};     // the end line, toward the diverging side
  // Through: beyond the diverging end line, on the diverging side of y=0.
  // End line meets y=0 at P2 + t*along with P2.y + t*along.y = 0.
  const t0 = -P2.y/along.y, Q0 = {x:P2.x + t0*along.x, y:0};
  const wedgeThrough = [Q0, {x:Q0.x+along.x*B, y:Q0.y+along.y*B}, {x:Q0.x+along.x*B+B, y:Q0.y+along.y*B}, {x:Q0.x+B, y:0}];
  // Diverging: beyond x=L, on the through side of its centreline (as a line at its end).
  const t1 = (L-P2.x)/h.x, Q1 = {x:L, y:P2.y + t1*h.y};
  const wedgeDiverge = [Q1, {x:L, y:Q1.y - sd*B}, {x:L+h.x*B, y:Q1.y - sd*B + h.y*B}, {x:Q1.x+h.x*B, y:Q1.y+h.y*B}];
  const poly = pts=>'M'+pts.map(q=>`${q.x} ${q.y}`).join('L')+'Z';
  wedges.push(poly(wedgeThrough), poly(wedgeDiverge)); // seg 0 through, seg 1 diverging
  }
  const trim = i=>wedges[i] ? [wedges[i]] : [];
  // Thin outline under the fills, so only its outer half shows.
  segs.forEach((seg, i)=>g.appendChild(clipTo(el('path', {d:seg.roadbed, fill:'none', stroke:style.roadbedStroke,
    'stroke-width':baseEdgeW}), null, trim(i))));
  segs.forEach((seg, i)=>g.appendChild(clipTo(el('path', {d:seg.roadbed, fill:style.roadbedFill}), null, trim(i))));
  const inward = TIE_W/2;
  if(type.cat==='crossing'){
    // Crossings: the band may run into the other route within its own width
    // of that route's edge, so the concave inner corners stay filled: it's
    // clipped inside this route and outside the other route's interior shrunk
    // by the band's width (the routes are convex four-sided shapes).
    segs.forEach((seg, i)=>{
      const others = segs.filter((_, j)=>j!==i).map(o=>insetConvexPolygon(o.roadbed, inward));
      g.appendChild(clipTo(el('path', {d:seg.roadbed, fill:'none', stroke:style.roadbedStroke, 'stroke-width':2*inward}),
        seg.roadbed, others));
    });
    return;
  }
  // As on crossings, a route's band is cut only by the other routes shrunk by
  // the band's width, not their whole roadbed: by the throat the diverging
  // route covers the through route's outer edge almost exactly, and cutting by
  // all of it left neither route's band there.
  const insets = turnoutRouteInsets(type, inward);
  segs.forEach((seg, i)=>{
    const others = segs.map((o, j)=>j===i ? null : (insets ? insets[j] : o.roadbed)).filter(Boolean);
    g.appendChild(clipTo(el('path', {d:seg.roadbed, fill:'none', stroke:style.roadbedStroke, 'stroke-width':2*inward}),
      seg.roadbed, [...others, ...trim(i)]));
  });
  if(type.cat==='wye') appendWyeNotchFill(g, type, style, baseEdgeW);
  else if(type.fillBetween) appendTurnoutFill(g, type, style, baseEdgeW);
}
// Each route of a turnout or wye as its roadbed shrunk by `inset` on every
// side, in the same order as its graphics segments (turnout: through, then
// diverging; wye: left, then right branch): sampled along the route's
// centreline frame, since the curved routes aren't convex. Null for others.
function turnoutRouteInsets(type, inset){
  const half = ROADBED_HALF - inset;
  const sweep = (at, total)=>{
    const left = [], right = [];
    for(let s=inset; s<total-inset; s+=1){ left.push(at(s, 0, -half)); right.push(at(s, 0, half)); }
    left.push(at(total-inset, 0, -half)); right.push(at(total-inset, 0, half));
    return 'M' + [...left, ...right.reverse()].map(q=>`${q.x} ${q.y}`).join('L') + 'Z';
  };
  if(type.cat==='turnout'){
    const L = type.throughLength, dv = turnoutDivergeFrame(type);
    return [`M${inset} ${-half}L${L-inset} ${-half}L${L-inset} ${half}L${inset} ${half}Z`, sweep(dv.at, dv.total)];
  }
  if(type.cat==='wye') return ['L', 'R'].map(h=>{ const br = wyeBranchFrame(type, h); return sweep(br.at, br.total); });
  return null;
}
// A compact turnout's roadbed is solid between its routes (`fillBetween`, from
// KATO's drawing and a photo): from where the routes' inner edges meet, along
// the diverging route's inner edge to its end corner, then one straight edge
// across to the through route's end corner, and back along the through route.
// That end edge gets the usual thick edge; the routes' inner edges inside it are
// painted over, as the wye does, from just before where they meet so no corner
// of them is left showing.
function appendTurnoutFill(g, type, style, baseEdgeW){
  const H = ROADBED_HALF, dv = turnoutDivergeFrame(type), total = dv.total, L = type.throughLength;
  const sg = Math.sign(dv.at(total, 0, 0).y); // the side the diverging route goes
  // The diverging route's inner edge is the offset nearer the through route.
  const v = Math.abs(dv.at(total, 0, H).y) < Math.abs(dv.at(total, 0, -H).y) ? H : -H;
  const yIn = sg*H; // the through route's inner edge
  let s0 = total;
  while(s0 > 0 && Math.abs(dv.at(s0, 0, v).y) > H) s0 -= 0.5;
  const arcFrom = s=>{ const q = []; for(let t=s; t<total; t+=1) q.push(dv.at(t, 0, v)); q.push(dv.at(total, 0, v)); return q; };
  const arc = arcFrom(s0), c = arc[arc.length-1], corner = {x:L, y:yIn}, apex = {x:arc[0].x, y:yIn};
  g.appendChild(el('path', {d:'M'+[apex, ...arc, corner].map(q=>`${q.x} ${q.y}`).join('L')+'Z', fill:style.roadbedFill}));
  const line = q=>'M'+q.map(p_=>`${p_.x} ${p_.y}`).join('L');
  const cover = arcFrom(Math.max(0, s0-2));
  g.appendChild(el('path', {d:line(cover)+line([{x:cover[0].x, y:yIn}, corner]), fill:'none',
    stroke:style.roadbedFill, 'stroke-width':TIE_W + baseEdgeW, 'stroke-linejoin':'round', 'stroke-linecap':'butt'}));
  // The end, its outer face on the corner-to-corner line, grown back into the
  // piece (towards where the routes meet).
  const w = baseEdgeW/2 + TIE_W/2, off = w/2 - baseEdgeW/2;
  const dx = corner.x-c.x, dy = corner.y-c.y, len = Math.hypot(dx, dy);
  let nx = -dy/len, ny = dx/len;
  if(nx*(apex.x-c.x) + ny*(apex.y-c.y) < 0){ nx = -nx; ny = -ny; }
  g.appendChild(el('path', {d:`M${c.x+nx*off} ${c.y+ny*off}L${corner.x+nx*off} ${corner.y+ny*off}`,
    stroke:style.roadbedStroke, 'stroke-width':w, fill:'none'}));
  // Both routes' own end edges, drawn again over the corners.
  const o = dv.at(total, -off, -v), i = dv.at(total, -off, v);
  g.appendChild(el('path', {d:`M${o.x} ${o.y}L${i.x} ${i.y}M${L-off} ${-H}L${L-off} ${H}`,
    stroke:style.roadbedStroke, 'stroke-width':w, fill:'none'}));
}
// The #2 wye's far end is filled in between its branches: roadbed from where
// the branches' inner edges cross up to a straight end joining their inner end
// corners, with the usual thick edge along that end.
function appendWyeNotchFill(g, type, style, baseEdgeW){
  const H = ROADBED_HALF, brs = ['L','R'].map(h=>wyeBranchFrame(type, h));
  const total = brs[0].total;
  let s0 = total;
  while(s0 > 0 && Math.sign(brs[0].at(s0, 0, H).y) === Math.sign(brs[0].at(total, 0, H).y)) s0 -= 0.5;
  const edge = br=>{ const pts = []; for(let s=s0; s<total; s+=1) pts.push(br.at(s, 0, H)); pts.push(br.at(total, 0, H)); return pts; };
  const left = edge(brs[0]), right = edge(brs[1]).reverse();
  const pts = [...left, ...right];
  // The sides are stroked in the fill colour too, to cover the branches' inner
  // edges that now sit inside the roadbed.
  g.appendChild(el('path', {d:'M'+pts.map(q=>`${q.x} ${q.y}`).join('L')+'Z', fill:style.roadbedFill}));
  // From just before the apex to the corners; the branch ends' edges are then
  // drawn again over the corners.
  const side = br=>{ const q = []; for(let s=Math.max(0, s0-2); s<total; s+=1) q.push(br.at(s, 0, H)); q.push(br.at(total, 0, H)); return q; };
  const line = q=>'M'+q.map(p_=>`${p_.x} ${p_.y}`).join('L');
  g.appendChild(el('path', {d:line(side(brs[0]))+line(side(brs[1])), fill:'none',
    stroke:style.roadbedFill, 'stroke-width':TIE_W + baseEdgeW, 'stroke-linejoin':'round', 'stroke-linecap':'butt'}));
  // The end: its outer face half a thin edge beyond the corner-to-corner line.
  const a = left[left.length-1], b = right[0], w = baseEdgeW/2 + TIE_W/2, off = w/2 - baseEdgeW/2;
  const dx = b.x-a.x, dy = b.y-a.y, len = Math.hypot(dx, dy);
  let nx = -dy/len, ny = dx/len;                          // unit normal
  if(nx > 0){ nx = -nx; ny = -ny; }                       // pointing back into the piece
  g.appendChild(el('path', {d:`M${a.x+nx*off} ${a.y+ny*off}L${b.x+nx*off} ${b.y+ny*off}`,
    stroke:style.roadbedStroke, 'stroke-width':w, fill:'none'}));
  brs.forEach(br=>{
    const o = br.at(total, -off, -H), i = br.at(total, -off, H);
    g.appendChild(el('path', {d:`M${o.x} ${o.y}L${i.x} ${i.y}`, stroke:style.roadbedStroke, 'stroke-width':w, fill:'none'}));
  });
}
