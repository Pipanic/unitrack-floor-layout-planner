function appendViaductDeck(g, type){
  if(!type.viaduct) return;
  // roadHalf: the roadbed's half-width from its centreline: `spacing` for
  // dstraight, radiusInner/radiusOuter for dcurve. Shoulder thickness stays
  // DECK_HALF-ROADBED_HALF.
  let R, roadHalf;
  if(type.cat==='dcurve'){
    R = (type.radiusInner + type.radiusOuter)/2;
    roadHalf = (type.radiusOuter - type.radiusInner)/2 + ROADBED_HALF;
  } else if(type.cat==='curve'){
    R = type.radius;
    roadHalf = ROADBED_HALF;
  } else {
    roadHalf = type.spacing!=null ? type.spacing/2 + ROADBED_HALF : ROADBED_HALF;
  }
  const deckHalf = roadHalf + 2.5;
  if(type.cat==='curve' || type.cat==='dcurve'){
    const {angle, hand} = type;
    [-1, 1].forEach(side=>{
      const rA = R + side*roadHalf, rB = R + side*deckHalf;
      g.appendChild(el('path',{d:annularBandD(R, angle, hand, Math.min(rA,rB), Math.max(rA,rB)),
        fill:VIADUCT_DECK_COLOR}));
    });
    return;
  }
  const L = type.length;
  [-1, 1].forEach(side=>{
    const y0 = side*roadHalf, y1 = side*deckHalf;
    g.appendChild(el('rect',{x:0, y:Math.min(y0,y1), width:L, height:Math.abs(y1-y0),
      fill:VIADUCT_DECK_COLOR}));
    // Incline starter: the pier-mounting wings at the high end.
    if(type.inclineWings){
      const W = 6, D = 4; // along the track, out from the deck
      g.appendChild(el('rect',{x:L-W, y: side>0 ? deckHalf : -deckHalf-D, width:W, height:D,
        fill:VIADUCT_DECK_COLOR}));
    }
  });
}
// Bridges: side chords wider than the roadbed, full length, drawn before the
// rails so rails and ports stay on top. 'truss' adds struts at inner panel
// boundaries plus X lattice (the S248T drawing); the two end panels are bare.
// 'girder' chords are solid plates, 2×BEAM_T, grown inward from the truss's
// outer edge, closed by end caps 2× thicker again.
// `endCaps:false`/`crossBeams:false` drop those (BRG124). Cross-beams
// (appendGirderCrossBeams): 6 full boxes plus a half at each end, from a 186mm
// photo. Colour per type (`structureColor`), falling back to steel. 10 truss
// panels over 248mm.
const BRIDGE_BEAM_T = 2.88, BRIDGE_LINE_T = 1.44; // base chord thickness / lattice stroke
const GIRDER_CAP_THICK = BRIDGE_BEAM_T*4; // chord is 2×, cap 2× the chord
// `railChords` (BRG124): a thin chord just outside each rail, grown outward
// from a fixed inner edge. Drawn before the roadbed so they show through the
// translucent deck.
// `underBeams` (S124T): that many cross-beams under everything else, from 3mm
// in at one end to 3mm in at the other, evenly spaced except the middle gap,
// which is a third wider (as on the real piece). Spanning from the far
// rail chord's outer edge to the side girder's outer edge.
function appendGirderUnderBeams(g, type){
  if(!type.underBeams) return;
  const L = type.length, n = type.underBeams, inset = 3;
  const color = type.structureColor || BRIDGE_STEEL_COLOR;
  const side = type.chordSide || 1, farEdge = -side*(RAIL_OFF + 1.4 + 2*0.7), nearEdge = side*15;
  let d = '';
  const MID_GAP = 4/3, gaps = n-1, gap = (L-2*inset)/(gaps - 1 + MID_GAP), half = Math.floor(n/2);
  for(let i=0;i<n;i++){
    const x = inset + i*gap + (i >= half ? (MID_GAP-1)*gap : 0);
    d += `M${x},${farEdge} L${x},${nearEdge}`;
  }
  g.appendChild(el('path',{d, stroke:color, 'stroke-width':BRIDGE_LINE_T/2, fill:'none'}));
}
function appendGirderRailChords(g, type){
  if(!type.railChords) return;
  const L = type.length, RAIL_CHORD_W = 2*0.7, RAIL_CHORD_INNER = RAIL_OFF + 1.4; // width trimmed 30% off its outer side, then moved 0.6mm in
  const color = type.structureColor || BRIDGE_STEEL_COLOR;
  [-1, 1].forEach(side=>{
    const yInner = side*RAIL_CHORD_INNER, yOuter = yInner + side*RAIL_CHORD_W; // thickness grows outward only
    g.appendChild(el('rect',{x:0, y:Math.min(yInner,yOuter), width:L, height:RAIL_CHORD_W, fill:color}));
  });
}
// Girder cross-beams, drawn before the roadbed to show through the translucent
// deck. 7 evenly spaced beams make 6 full boxes plus a half at each end between
// the caps, scaling with length.
function appendGirderCrossBeams(g, type){
  if(type.bridgeStyle!=='girder' || type.crossBeams===false || type.cat!=='straight') return;
  const L = type.length, H = 15, LINE_T = BRIDGE_LINE_T;
  const color = type.structureColor || BRIDGE_STEEL_COLOR;
  const interior = L - 2*GIRDER_CAP_THICK;
  const fullW = interior/7, halfW = fullW/2;
  for(let i=0;i<7;i++){
    const x = GIRDER_CAP_THICK + halfW + i*fullW;
    g.appendChild(el('path',{d:`M${x},${-H} L${x},${H}`, stroke:color, 'stroke-width':LINE_T, fill:'none'}));
  }
  // `diamondBracing` (S186T): a thin diamond in each full box, from the middle
  // of each cross-beam out to the rails. Not in the half boxes at the ends.
  if(type.diamondBracing){
    const yIn = RAIL_OFF;
    let d = '';
    for(let i=0;i<6;i++){
      const x0 = GIRDER_CAP_THICK + halfW + i*fullW, x1 = x0 + fullW, xm = (x0+x1)/2;
      d += `M${xm},${-yIn} L${x1},0 L${xm},${yIn} L${x0},0 Z`;
    }
    g.appendChild(el('path',{d, stroke:color, 'stroke-width':LINE_T/2, fill:'none', 'stroke-linejoin':'miter'}));
  }
}
// Curved girders (R448/R481-15): the real chord is a straight beam corner to
// corner, inside the curve for R448 (`chordSide:-1`) or outside for R481 (+1).
// Its ends lie on the radius curvedChordRadius gives (from `chordEnd`). A
// chord sags toward the curve's centre, so the outside one comes in over the
// tie ends at mid-piece, as on the real R481. No end caps or boat guide yet;
// the thin chords, cross-beams and zigzag are appendChordFrameUnderChords'.
function curvedChordRadius(type){
  return type.radius + type.chordEnd;
}
function appendCurvedBridgeChord(g, type){
  const {radius:R, angle, hand} = type;
  const color = type.structureColor || BRIDGE_STEEL_COLOR;
  const BEAM_T = BRIDGE_BEAM_T, THICK = BEAM_T*2;
  const Rc = curvedChordRadius(type);
  const p0 = offsetArcPoint(R, hand, 0, Rc);
  const p1 = offsetArcPoint(R, hand, angle, Rc);
  if(type.chordTies){
    // R448-15T: the chord's ends are cut along the piece's own end lines
    // (radial, where the rails end), not square to the chord.
    const len = Math.hypot(p1.x-p0.x, p1.y-p0.y), ux = (p1.x-p0.x)/len, uy = (p1.y-p0.y)/len, nx = -uy, ny = ux;
    const endLine = t=>{ const a = offsetArcPoint(R, hand, t, R-50), b = offsetArcPoint(R, hand, t, R+50); return [a, b]; };
    /** @param {{x:number, y:number}[]} line */
    const meet = ([a, b], o)=>{ // the chord edge offset o from the chord line, meeting the end line a-b
      const cx = p0.x + nx*o, cy = p0.y + ny*o, dx = b.x-a.x, dy = b.y-a.y;
      const den = ux*dy - uy*dx, t = ((a.x-cx)*dy - (a.y-cy)*dx)/den;
      return {x: cx + ux*t, y: cy + uy*t};
    };
    const e0 = endLine(0), e1 = endLine(angle), h = THICK/2;
    if(!type.chordStepEnds){
      const pts = [meet(e0, -h), meet(e1, -h), meet(e1, h), meet(e0, h)];
      g.appendChild(el('path',{d:'M'+pts.map(q=>`${q.x},${q.y}`).join('L')+'Z', fill:color}));
      return;
    }
    // `chordStepEnds` (R481-15T only): each end steps inward (from a photo): the outer edge slants in over
    // SLANT mm to half the chord's width, then runs on as a short tab of TAB mm
    // to the end line. The inner edge, facing the track, runs straight through.
    const Mid = offsetArcPoint(R, hand, angle/2, R);
    const dist = o=>{ const q = {x:(p0.x+p1.x)/2 + nx*o, y:(p0.y+p1.y)/2 + ny*o}; return Math.hypot(q.x-Mid.x, q.y-Mid.y); };
    const outO = dist(h) > dist(-h) ? h : -h, inO = -outO, tabO = inO + (outO-inO)/2;
    const SLANT = 3.7, TAB = 2.4;
    const along = (q, du)=>({x:q.x + ux*du, y:q.y + uy*du});
    const t0 = meet(e0, tabO), t1 = meet(e1, tabO);
    // The tab's edge runs parallel to the track at that end, not to the chord.
    const tan = t=>{ const a = offsetArcPoint(R, hand, t, R), b = offsetArcPoint(R, hand, t+0.01, R), l = Math.hypot(b.x-a.x, b.y-a.y); return {x:(b.x-a.x)/l, y:(b.y-a.y)/l}; };
    const d0 = tan(0), d1 = tan(angle);
    const tab0 = {x:t0.x + d0.x*TAB, y:t0.y + d0.y*TAB}, tab1 = {x:t1.x - d1.x*TAB, y:t1.y - d1.y*TAB};
    const pts = [meet(e0, inO), meet(e1, inO), t1, tab1, along(meet(e1, outO), -(TAB+SLANT)),
                 along(meet(e0, outO), TAB+SLANT), tab0, t0];
    // The slant starts where the tab ends, on the outer edge line.
    const onOuter = (q)=>({x:q.x + nx*(outO-tabO), y:q.y + ny*(outO-tabO)});
    pts[4] = onOuter(along(t1, -(TAB+SLANT))); pts[5] = onOuter(along(t0, TAB+SLANT));
    g.appendChild(el('path',{d:'M'+pts.map(q=>`${q.x},${q.y}`).join('L')+'Z', fill:color}));
    return;
  }
  g.appendChild(el('path',{d:`M${p0.x},${p0.y} L${p1.x},${p1.y}`,
    stroke:color, 'stroke-width':THICK, 'stroke-linecap':'butt', fill:'none'}));
}
// Truss lattice between chord lines yA and yB: a strut at each inner panel
// boundary and an X per panel. `margin` (default one panelLen) is the bare zone
// at each end, as on S248T; the double truss passes half its double-width panel
// and spans the full width in one row.
function appendTrussLatticeBetween(g, L, yA, yB, color, LINE_T, opts){
  const panelLen = (opts && opts.panelLen) || (L / Math.max(3, Math.round(L/24.8)));
  const margin = (opts && opts.margin!=null) ? opts.margin : panelLen;
  const numPanels = Math.round((L - 2*margin)/panelLen);
  for(let i=0;i<=numPanels;i++){ // a vertical strut at each panel boundary — margins and the very edges excluded
    const x = margin + i*panelLen;
    g.appendChild(el('path',{d:`M${x},${yA} L${x},${yB}`, stroke:color, 'stroke-width':LINE_T, fill:'none'}));
  }
  // `inset`: end the diagonals that far inside the chord lines, so a lattice
  // drawn over its chords (latticeOverTrack) doesn't poke its corners past them.
  const ins = (opts && opts.inset) || 0;
  const dA = yA + Math.sign(yB-yA)*ins, dB = yB + Math.sign(yA-yB)*ins;
  for(let i=0;i<numPanels;i++){
    const px0 = margin+i*panelLen, px1 = margin+(i+1)*panelLen;
    g.appendChild(el('path',{d:`M${px0},${dA} L${px1},${dB}`, stroke:color, 'stroke-width':LINE_T, fill:'none'}));
    g.appendChild(el('path',{d:`M${px0},${dB} L${px1},${dA}`, stroke:color, 'stroke-width':LINE_T, fill:'none'}));
  }
}
// Chords in the girder style: outer ones grown inward from a fixed outer edge,
// the centre one (double-track, y=0) symmetric. Also used by the double truss
// so it lines up with the double girder where they join.
function appendGirderStyleChords(g, L, chordYs, color, outerThick, centerThick){
  chordYs.forEach(y=>{
    if(y===0){
      const ct = centerThick ?? outerThick;
      g.appendChild(el('rect',{x:0, y:-ct, width:L, height:ct*2, fill:color}));
      return;
    }
    const side = Math.sign(y), yInner = y - side*outerThick;
    g.appendChild(el('rect',{x:0, y:Math.min(y,yInner), width:L, height:outerThick, fill:color}));
  });
}
function bridgeChordYs(type){
  return type.spacing!=null
    ? (()=>{ const outerH = type.spacing/2 + ROADBED_HALF + 2.5; return [-outerH, 0, outerH]; })()
    : (type.chordSide ? [type.chordSide*15] : [-15, 15]);
}
function appendBridgeStructure(g, type){
  if(!type.bridgeStyle) return;
  if(type.cat==='curve'){ if(!type.chordTies) appendCurvedBridgeChord(g, type); return; }
  const L = type.length;
  const color = type.structureColor || BRIDGE_STEEL_COLOR;
  const BEAM_T = BRIDGE_BEAM_T, LINE_T = BRIDGE_LINE_T;
  // Chord positions: ±15 (ROADBED_HALF+2.5) for single track, or one for
  // BRG124's `chordSide`. Double track pushes the outer two to the wider
  // roadbed's edge and adds one on the centreline.
  const chordYs = bridgeChordYs(type);
  if(type.bridgeStyle==='girder'){
    // `outerChordThickScale` thins the outer chords, still growing inward so
    // the outer edge never moves.
    appendGirderStyleChords(g, L, chordYs, color, BEAM_T*2*(type.outerChordThickScale ?? 1), BEAM_T*2);
    const outerCap = Math.max(...chordYs.map(Math.abs)); // the chords' outer edge IS chordYs, since they grow inward; caps span every chord
    [0, L].forEach(x=>{
      if(type.endCaps===false) return;
      const capX = x===0 ? 0 : L-GIRDER_CAP_THICK;
      g.appendChild(el('rect',{x:capX, y:-outerCap, width:GIRDER_CAP_THICK, height:outerCap*2, fill:color}));
    });
    return;
  }
  // Truss chords grow inward from chordYs too; centred bars would oversail the
  // viaduct shoulder, whose outer edge is chordYs.
  appendGirderStyleChords(g, L, chordYs, color,
    chordYs.length===3 ? BEAM_T*2*(type.outerChordThickScale ?? 1) : BEAM_T,
    chordYs.length===3 ? BEAM_T*2 : undefined);
  if(type.bridgeStyle==='truss' && type.trussEndCaps){
    // End caps like the girders' (S248T).
    const outerCap = Math.max(...chordYs.map(Math.abs));
    [0, L-GIRDER_CAP_THICK].forEach(capX=>g.appendChild(el('rect',{x:capX, y:-outerCap, width:GIRDER_CAP_THICK, height:outerCap*2, fill:color})));
  }
  // `latticeOverTrack` (S248T): the lattice goes on after the rails instead.
  if(type.bridgeStyle==='truss' && !type.latticeOverTrack) appendTrussLattice(g, type, chordYs, color, LINE_T);
}
function appendTrussLattice(g, type, chordYs, color, LINE_T){
  const L = type.length;
  if(type.bridgeStyle==='truss'){
    if(chordYs.length===3){ // double track: one lattice across the full width, half-panel margins
      const baseUnit = L / Math.max(3, Math.round(L/24.8)); // same grid the single truss uses
      appendTrussLatticeBetween(g, L, chordYs[0], chordYs[2], color, LINE_T, {margin: baseUnit, panelLen: baseUnit*2,
        ...(type.latticeOverTrack ? {inset: BRIDGE_BEAM_T*(type.outerChordThickScale ?? 1)} : {})});
    } else {
      for(let i=0;i<chordYs.length-1;i++){
        appendTrussLatticeBetween(g, L, chordYs[i], chordYs[i+1], color, LINE_T,
          type.latticeOverTrack ? {inset: BRIDGE_BEAM_T/2} : undefined);
      }
    }
  }
}
// Turntable pit ring: Φ217 outer, Φ160 inner, 12 segments, drawn under the
// roadbed so the bridge sits inside it. Centred on the piece's midpoint, which
// is the pit centre.
const TURNTABLE_RING_COLOR = '#5a6270';
function appendTurntableRing(g, type){
  if(type.cat!=='turntableBridge') return;
  const cx = type.length/2, cy = 0, outerR = TURNTABLE_OUTER_R, innerR = TURNTABLE_INNER_R;
  const ring = (r,sweep) => `M${cx-r},${cy} A${r},${r} 0 1,${sweep} ${cx+r},${cy} A${r},${r} 0 1,${sweep} ${cx-r},${cy} Z`;
  g.appendChild(el('path',{d:`${ring(outerR,1)} ${ring(innerR,0)}`, fill:TURNTABLE_RING_COLOR, 'fill-rule':'evenodd'}));
  for(let i=0;i<12;i++){
    // Offset half a segment so each cardinal direction is centred in a segment,
    // not on a divider.
    const a = (i*30+15)*Math.PI/180;
    const x0=cx+innerR*Math.cos(a), y0=cy+innerR*Math.sin(a);
    const x1=cx+outerR*Math.cos(a), y1=cy+outerR*Math.sin(a);
    g.appendChild(el('path',{d:`M${x0},${y0} L${x1},${y1}`, stroke:'#33363c', 'stroke-width':0.6, fill:'none'}));
  }
}
// Control cabin geometry, shared so the wing's edge can end exactly at the
// cabin's nearest corner.
const TURNTABLE_CABIN = {cx:10, cy:22, w:10, h:12, angle:-12};
function turntableCabinCorner(){
  const {cx,cy,w,h,angle} = TURNTABLE_CABIN;
  const rad = angle*Math.PI/180;
  const dx = w/2, dy = h/2; // bottom-right corner, before rotation
  return {x: cx + dx*Math.cos(rad) - dy*Math.sin(rad),
          y: cy + dx*Math.sin(rad) + dy*Math.cos(rad)};
}
// Turntable wing, near the left port (not centred on the pivot). Its inner edge
// is an arc on the pit's inner wall; its right edge ends at the cabin's corner.
// Roadbed-coloured. Position and size are estimates from a photo.
function appendTurntableWing(g, type, style){
  if(type.cat!=='turntableBridge') return;
  const roadHalf = ROADBED_HALF;
  const wingLen = turntableCabinCorner().x, wingDrop = 17;
  const y1 = roadHalf + wingDrop;
  const innerR = TURNTABLE_INNER_R, cx = type.length/2;
  const x1 = cx - Math.sqrt(innerR*innerR - y1*y1); // where y=y1 meets the inner ring
  const d = `M0,${roadHalf} L${wingLen},${roadHalf} L${wingLen},${y1} L${x1},${y1} `
          + `A${innerR},${innerR} 0 0,1 0,${roadHalf} Z`;
  g.appendChild(el('path',{d, fill: style.roadbedFill}));
}
// Control cabin on the wing, chord-coloured, slightly rotated as in the photo.
// Estimated, like the wing.
function appendTurntableCabin(g, type){
  if(type.cat!=='turntableBridge') return;
  const color = type.structureColor || BRIDGE_STEEL_COLOR;
  const {cx, cy, w, h, angle} = TURNTABLE_CABIN;
  g.appendChild(el('rect',{x:cx-w/2, y:cy-h/2, width:w, height:h, fill:color,
    transform:`rotate(${angle} ${cx} ${cy})`}));
}
// `boatGuide` (BRG124): a centred rectangle between the rails, tapering over
// the last 5mm at each end, from a photo. Roadbed colour (so elevation-tinted)
// but fully opaque against the reduced-opacity deck, reading as a solid spine.
function appendGirderBoatGuide(g, type, style){
  if(!type.boatGuide) return;
  g.appendChild(el('path',{d:taperedBarD(0, type.length), fill:style.roadbedFill}));
}
// Sleepers (`ties`), drawn on the roadbed under the rails. 'standard': black
// ties across the ballast, measured from S124 (24 full ties and a half tie at
// each end, so a tie centred on every multiple of TIE_PITCH). 'concrete': the same, in light grey
// (tieColor). 'slab': rail fastenings on a slab instead (appendSlab).
const TIE_PITCH = 124/25;
// A closed polygon as path data, to 3dp: a tie, a fastening or a mount.
const polyD = pts=>'M'+pts.map(q=>`${q.x.toFixed(3)} ${q.y.toFixed(3)}`).join('L')+'Z';
const TIE_W = 1.9;        // along the track
const TIE_HALF_LEN = 8.25; // either side of the centreline
const TIE_COLOR = '#24272c'; // dark; the ties toggle hides them when joins need to read from a distance
// Concrete ties (`ties:'concrete'`) are light grey; every other tied piece uses TIE_COLOR.
const CONCRETE_TIE_COLOR = '#a3a7ad';
const PART_LABEL_COLOR = '#ffffff'; // in-piece part-code labels (Limited, Printed), on every tie style
// Brown urethane ties (the single crossovers' turnout and middle ties).
const URETHANE_TIE_COLOR = '#6b4131';
function tieColor(type){ return type.ties==='concrete' ? CONCRETE_TIE_COLOR : TIE_COLOR; }
const ROADBED_EDGE_COLOR = '#2a2e34';
