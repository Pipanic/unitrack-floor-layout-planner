// Feeder wires: two stubs out of one side, short enough to fit between
// 33mm-spaced roadbeds.
const WIRE_LEN = 5; // mm
const WIRE_GAP = 1.6; // mm between the two stubs
// A dual feeder has a pair on each outer edge.
function appendFeederWires(g, type){
  if(!type.feeder && !type.dualFeeder) return;
  const xMid = type.length/2;
  const edges = type.dualFeeder ? [-1, 1].map(side=>side*(type.spacing/2 + ROADBED_HALF)) : [ROADBED_HALF];
  edges.forEach(yEdge=>{
    const yOut = yEdge + Math.sign(yEdge)*WIRE_LEN;
    /** @type {[number, string][]} */ ([[-1, '#e8eaed'], [1, '#4fb0ff']]).forEach(([s, stroke])=>g.appendChild(el('line',{
      x1:xMid+s*WIRE_GAP/2, y1:yEdge, x2:xMid+s*WIRE_GAP/2, y2:yOut, stroke, 'stroke-width':1.65, 'stroke-linecap':'round'})));
  });
}

// Double crossover's insulated centre gap: a short black line across the two
// inner rails.
function appendCrossoverGap(g, type, railW){
  // Only confirmed on the double crossover.
  if(type.cat!=='crossover' || type.hand) return;
  const xMid = type.length/2;
  // To the rails' outer faces, not their centrelines, so it crosses them fully.
  const yInner = type.spacing/2 - RAIL_OFF + (railW||RAIL_WIDTH_DEFAULT)/2;
  g.appendChild(el('line',{x1:xMid, y1:-yInner, x2:xMid, y2:yInner,
    stroke:'#000', 'stroke-width':0.9}));
}

// Multi-segment pieces are drawn in two passes (all outlines, then all fills)
// so one segment's stroke can't seam across another's fill. Single segments
// stay one pass. `opts` is for the thumbnail's constant screen strokes.
function appendRoadbed(g, segs, roadbedFill, roadbedStroke, opts){
  const sw = (opts && opts.strokeWidth!==undefined) ? opts.strokeWidth : 1;
  const ve = (opts && opts.nonScaling) ? {'vector-effect':'non-scaling-stroke'} : {};
  const fo = (opts && opts.fillOpacity!==undefined) ? {'fill-opacity':opts.fillOpacity} : {};
  if(segs.length>1){
    segs.forEach(seg=>{
      g.appendChild(el('path',{d:seg.roadbed, fill:'none', stroke:roadbedStroke, 'stroke-width':sw, ...ve}));
    });
    segs.forEach(seg=>{
      g.appendChild(el('path',{d:seg.roadbed, fill:roadbedFill, ...fo}));
      if(seg.cutOverlay){
        g.appendChild(el('path',{d:seg.cutOverlay, fill:'#000', 'fill-opacity':'0.35'}));
      }
    });
  } else {
    segs.forEach(seg=>{
      g.appendChild(el('path',{d:seg.roadbed, fill:roadbedFill,
        stroke:roadbedStroke, 'stroke-width':sw, ...ve, ...fo}));
      if(seg.cutOverlay){
        g.appendChild(el('path',{d:seg.cutOverlay, fill:'#000', 'fill-opacity':'0.35'}));
      }
    });
  }
}

// Shared by canvas, ghost and thumbnail so a distinct roadbed (the rerailer)
// shows everywhere.
// Roadbed on the ground: Kato's grey unless the user picks another (Settings).
const ROADBED_FILL_DEFAULT = 'var(--ground)';
const ROADBED_FILL_RERAILER = '#aab0ba';
// A platform canopy's corrugated metal: light grey, in every theme. Its ribs
// run across the width, 80 to the length, and go with the ties toggle.
const PLATFORM_FILL = '#c6c8cb';
const PLATFORM_RIBS = 80, PLATFORM_RIB_COLOR = 'rgba(40,46,56,0.22)';
// The roof's cutout, measured from KATO's top-view diagram of PS-A (about
// 4.84 px/mm): a framed opening 21.2 mm wide, 40 mm in from each end, its back
// edge 10.1 mm in from the roof's back edge (y=-10.4 from the slab's centre
// line), with a divider 112 mm from the left end. Always drawn; only the ribs
// go with the toggle.
const PLATFORM_CUTOUT_COLOR = 'rgba(30,34,42,0.8)', PLATFORM_CUTOUT_LINE_W = 0.8;
// An end piece (PSE-1/2), measured from KATO's planning view of PSE-1 (about
// 4.8 px/mm), in the piece's frame with its free end (`endAt`) at x=0 and the
// track on the +y side: a 20 mm end section, 1 mm narrower a side and lighter,
// holding a small ribbed staircase; then the surface, inset from a light rim,
// with a fence across its end, a fence with five posts along the back, a round
// post and a bench-like slot. Structure always; the small furniture goes with
// the detail toggle.
const PLATFORM_END_LEN = 20, PLATFORM_END_INSET = 1;
const PLATFORM_STAIR_X = 8, PLATFORM_STAIR_LEN = 12, PLATFORM_STAIR_W = 5, PLATFORM_STAIRS = 8;
// A curved end's detail: the same as the straight ends', following the curve.
// Written in the piece's frame with y multiplied by `f`, so the mirror image
// is the same code. Positions measured from KATO's view of PIE-2: the staircase
// and the slot are centred in the surface where they sit, the post a little off.
function appendPlatformCurvedEnd(g, type, showDetail){
  if(!type.curveEdge) return;
  const L = type.length, h = type.width/2, f = type.curveEdge, none = 'pointer-events:none;';
  const ink = 'rgba(30,34,42,0.8)', thin = {fill:'none', stroke:ink, style:none};
  const yb = x=>platformCurveY(type, x), n = PLATFORM_END_INSET, e = PLATFORM_END_LEN;
  const rect = (xa, xb, ya, yb_, attrs)=>g.appendChild(el('rect',{x:Math.min(xa, xb), y:Math.min(ya, yb_),
    width:Math.abs(xb-xa), height:Math.abs(yb_-ya), ...attrs}));
  const poly = (pts, attrs)=>g.appendChild(el('path',{d:'M' + pts.map(([x, y])=>`${x.toFixed(2)},${y.toFixed(2)}`).join(' L') + ' Z', ...attrs}));
  // The end section, lighter, then the surface, darker, both translucent.
  poly([[0, -f*(h-n)], [e, -f*(h-n)], [e, yb(e) - f*n], [0, yb(0) - f*n]], {fill:'rgba(255,255,255,0.35)', style:none});
  const surf = [[24, -f*17], [L, -f*17]];
  for(let x=L; x>=24; x-=4) surf.push([x, yb(x) - f*3.5]);
  surf.push([24, yb(24) - f*3.5]);
  poly(surf, {fill:'rgba(20,24,32,0.18)', stroke:ink, 'stroke-width':0.4, style:none});
  // The staircase, centred across the narrow end.
  const sx0 = PLATFORM_STAIR_X, sy = PLATFORM_STAIR_W/2, cy = (-f*h + yb(sx0 + PLATFORM_STAIR_LEN/2))/2;
  rect(sx0, sx0 + PLATFORM_STAIR_LEN, cy - sy, cy + sy, {...thin, 'stroke-width':0.8});
  let d = '';
  for(let i=1; i<PLATFORM_STAIRS; i++){ const x = sx0 + PLATFORM_STAIR_LEN*i/PLATFORM_STAIRS; d += `M${x} ${cy-sy}V${cy+sy}`; }
  g.appendChild(el('path',{d, ...thin, 'stroke-width':0.5}));
  // The fence across the end of the surface.
  rect(21.1, 23, -f*17, yb(22) - f*3.5, {...thin, 'stroke-width':0.5});
  if(showDetail===false) return;
  const fy0 = -f*17, fy1 = yb(22) - f*3.5;
  [0.2, 0.5, 0.8].forEach(t=>{ const y = fy0 + (fy1-fy0)*t; rect(21, 23.2, y-1.1, y+1.1, {...thin, 'stroke-width':0.4}); });
  const dt = type.detail;
  g.appendChild(el('circle',{cx:dt.postX, cy:f*dt.postY, r:2, ...thin, 'stroke-width':0.4}));
  rect(dt.slot - 18, dt.slot + 18, f*dt.slotY - 1.65, f*dt.slotY + 1.65, {...thin, 'stroke-width':0.4});
  rect(dt.slot - 6.2, dt.slot + 6.2, f*dt.slotY - 0.6, f*dt.slotY + 0.6, {...thin, 'stroke-width':0.4});
}
function appendPlatformEnd(g, type, showDetail){
  if(!type.endAt || type.curveEdge) return;
  const L = type.length, h = type.width/2, none = 'pointer-events:none;';
  const ink = 'rgba(30,34,42,0.8)', thin = {fill:'none', stroke:ink, style:none};
  const m = x=>type.endAt==='end' ? L-x : x;
  // Rects and posts from their near/far x in the piece's frame.
  const rect = (xa, xb, ya, yb, attrs)=>g.appendChild(el('rect',{x:Math.min(m(xa), m(xb)), y:Math.min(ya, yb),
    width:Math.abs(xb-xa), height:Math.abs(yb-ya), ...attrs}));
  const lines = (d, w)=>g.appendChild(el('path',{d, ...thin, 'stroke-width':w}));
  const SURF_X = 24, SURF_TOP = 17, SURF_BACK = type.island ? -17 : -16.5;
  // The end section, lighter, then the surface, darker, both translucent so
  // a selection's tint still shows.
  rect(0, PLATFORM_END_LEN, -(h-PLATFORM_END_INSET), h-PLATFORM_END_INSET, {fill:'rgba(255,255,255,0.35)', style:none});
  rect(SURF_X, L, SURF_BACK, SURF_TOP, {fill:'rgba(20,24,32,0.18)', stroke:ink, 'stroke-width':0.4, style:none});
  // The staircase.
  const sx0 = PLATFORM_STAIR_X, sy = PLATFORM_STAIR_W/2;
  rect(sx0, sx0 + PLATFORM_STAIR_LEN, -sy, sy, {...thin, 'stroke-width':0.8});
  let d = '';
  for(let i=1; i<PLATFORM_STAIRS; i++){ const x = m(sx0 + PLATFORM_STAIR_LEN*i/PLATFORM_STAIRS); d += `M${x} ${-sy}V${sy}`; }
  lines(d, 0.5);
  // The fence across the end of the surface.
  rect(21.1, 23, SURF_BACK, SURF_TOP, {...thin, 'stroke-width':0.5});
  if(showDetail===false) return;
  [9.3, 3.1, -2.5, -9.3].forEach(y=>rect(21, 23.2, y-1.1, y+1.1, {...thin, 'stroke-width':0.4}));
  // The fence along the back, with a post every 42.4 mm (not on an island's).
  if(!type.island){
    rect(SURF_X, L, -19, -15.9, {...thin, 'stroke-width':0.4});
    [27, 69.4, 111.8, 154.2, 196.6].forEach(x=>rect(x-1.15, x+1.15, -17.75, -15.05, {...thin, 'stroke-width':0.4}));
  }
  // A round post, and the bench-like slot with its inner slot.
  g.appendChild(el('circle',{cx:m(138), cy:0, r:2, ...thin, 'stroke-width':0.4}));
  rect(90, 126, -1.65, 1.65, {...thin, 'stroke-width':0.4});
  rect(101.8, 114.2, -0.6, 0.6, {...thin, 'stroke-width':0.4});
}
function appendPlatformRoof(g, type, showDetail){
  if(!type.roofWidth) return; // the ends and C have no roof
  const L = type.length, [h1, h2] = platformRoofY(type), pitch = L/PLATFORM_RIBS, c = type.cutout;
  const none = 'pointer-events:none;';
  if(showDetail!==false){
    let d = '';
    for(let i=0; i<PLATFORM_RIBS; i++){ const x = (i+0.5)*pitch; d += `M${x} ${h1}V${h2}`; }
    g.appendChild(el('path',{d, fill:'none', stroke:PLATFORM_RIB_COLOR, 'stroke-width':1.1, style:none}));
  }
  g.appendChild(el('rect',{x:c.x0, y:c.y, width:c.x1-c.x0, height:c.h,
    fill:'none', stroke:PLATFORM_CUTOUT_COLOR, 'stroke-width':PLATFORM_CUTOUT_LINE_W, style:none}));
  g.appendChild(el('path',{d:`M${c.div} ${c.y}V${c.y+c.h}`, fill:'none', stroke:PLATFORM_CUTOUT_COLOR, 'stroke-width':PLATFORM_CUTOUT_LINE_W, style:none}));
}
// Island C: no roof, the full width its whole length. The surface is darker
// inside a light rim along its sides, with the round post and bench-like slot of
// the end pieces, two sets spaced evenly along it, but no fence or stairs.
function appendPlatformSlab(g, type, showDetail){
  if(!type.platform || type.roofWidth || type.endAt) return;
  const L = type.length, none = 'pointer-events:none;', ink = 'rgba(30,34,42,0.8)', thin = {fill:'none', stroke:ink, style:none};
  g.appendChild(el('rect',{x:0, y:-17, width:L, height:34, fill:'rgba(20,24,32,0.18)', style:none}));
  g.appendChild(el('path',{d:`M0 -17H${L}M0 17H${L}`, ...thin, 'stroke-width':0.4}));
  if(showDetail===false) return;
  // Two sets, a quarter and three quarters along, so equally spaced.
  [L/4, 3*L/4].forEach(cx=>{
    g.appendChild(el('circle',{cx:cx+30, cy:0, r:2, ...thin, 'stroke-width':0.4}));
    g.appendChild(el('rect',{x:cx-18, y:-1.65, width:36, height:3.3, ...thin, 'stroke-width':0.4}));
    g.appendChild(el('rect',{x:cx-6.2, y:-0.6, width:12.4, height:1.2, ...thin, 'stroke-width':0.4}));
  });
}
const ROADBED_FILL_SELECTED = 'var(--sel-fill)';
// The app's selection colour (outlines, handles, the selected port, a
// selected slope); the gradient validity scale never uses it. Blue unless the
// user picks another (Settings).
const SELECTION_BLUE = 'var(--sel)';
function isStreetTrack(type){ return type.cat==='tram' || type.cat==='tramcurve' || type.cat==='tramturnout' || type.cat==='tramcross'; }
function roadbedFillFor(type, isSelected){
  if(isSelected) return ROADBED_FILL_SELECTED;
  if(type.platform) return PLATFORM_FILL;
  // A street piece's fill is its paving, which goes with the rest of its detail.
  return type.rerailer || (isStreetTrack(type) && tiesView.shown) ? ROADBED_FILL_RERAILER : ROADBED_FILL_DEFAULT;
}

// Whether text on a piece drawn at world rotation `rot` would read upside
// down, so it should turn 180° about its own centre. Straight up and down
// both read top to bottom.
function markerFlipped(rot){
  const a = (rot||0)*Math.PI/180, c = Math.cos(a), s_ = Math.sin(a);
  return c < -1e-6 || (Math.abs(c) <= 1e-6 && s_ < 0);
}
// In-piece labels' thin black outline, in proportion to the text, for
// legibility over rails and light slab; drawn behind the fill.
function partLabelOutline(fontSize){
  return {stroke:'#000000', 'stroke-width':(fontSize*0.16).toFixed(2), 'stroke-linejoin':'round', 'paint-order':'stroke'};
}
// An in-piece part-code label (Limited, Printed) at local x, on y=0 unless
// `transform` moves it. Sized to fit between the rails: the smaller of a
// gauge-based cap and `room` over the label's approximate width (~0.62em a
// character).
// A long name (a road plate's) goes on two lines, split at the space nearest its
// middle; a part code has no spaces, so it stays whole.
const PART_LABEL_WRAP_CHARS = 18;
function partLabelLines(text){
  if(text.length<PART_LABEL_WRAP_CHARS || !text.includes(' ')) return [text];
  let at = -1;
  for(let i=0;i<text.length;i++) if(text[i]===' ' && (at<0 || Math.abs(i - text.length/2)<Math.abs(at - text.length/2))) at = i;
  return [text.slice(0, at), text.slice(at + 1)];
}
const longestLine = lines=>Math.max(...lines.map(l=>l.length));
// Fills a label's <text> with its lines, centred about its y.
function setPartLabelText(t, lines, x){
  if(lines.length===1){ t.textContent = lines[0]; return; }
  lines.forEach((line, i)=>{
    const span = el('tspan', {x, dy:i ? '1.1em' : '-0.55em'});
    span.textContent = line;
    t.appendChild(span);
  });
}
function appendPartLabel(g, label, room, x, transform, y = 0){
  const lines = partLabelLines(label);
  const fontSize = Math.max(2, Math.min(GAUGE*0.82, (room*0.88)/(longestLine(lines)*0.62)));
  const t = el('text',{x, y, 'text-anchor':'middle', 'dominant-baseline':'central',
    ...(transform ? {transform} : {}),
    fill: PART_LABEL_COLOR, 'font-size':fontSize.toFixed(2), 'font-weight':'700',
    ...partLabelOutline(fontSize),
    'font-family':UI_FONT,
    style:'pointer-events:none;user-select:none;'});
  setPartLabelText(t, lines, x);
  g.appendChild(t);
}
// Part-label mode "limited": the label on pieces nearly identical to a
// neighbour (`labelLength`: S64, S60L/R, the platforms), mid-piece.
function appendLengthLabel(g, type, worldRot){
  if(!type.labelLength) return;
  // A platform's label: `labelDx` along, clear of the roof's cutout, and
  // across the middle of the roof rather than of the slab under it.
  const L = type.length, x = L/2 + (type.labelDx || 0), y = type.roofWidth ? platformRoofY(type).reduce((a, b)=>a+b)/2 : 0;
  appendPartLabel(g, shortCode(type), L, x, markerFlipped(worldRot) ? `rotate(180 ${x} ${y})` : null, y);
}
// Part-label mode "printed": every piece's part code in the S64's style, sized
// the same way, fixed to the track. At pieceCenterLocal (on the track; between
// double tracks), along partLabelAngle, turned 180° when `flip` so it reads
// upright.
function appendPrintedLabel(g, type, flip){
  const c = pieceCenterLocal(type), ang = partLabelAngle(type) + (flip ? 180 : 0);
  appendPartLabel(g, shortCode(type), partLabelReach(type), 0,
    `translate(${c.x.toFixed(2)},${c.y.toFixed(2)}) rotate(${ang.toFixed(2)})`);
}

// Expansion track: the guide vane between the rails, fixed at the middle
// (the halves' ties slide out from under it as the track stretches), carrying
// the length it's set to, like the S64's label. Sizes from photos.
const EXPANSION_VANE_LEN = 76, EXPANSION_VANE_COLOR = '#8e9188', EXPANSION_VANE_TEXT = '#2a2e34';
// A bar between the rails from x0 to x3, 6mm wide, tapering to 3mm over its
// last 5mm at each end: the expansion track's vane, the girder's boat guide.
const TAPERED_BAR_HW = 3;
function taperedBarD(x0, x3){
  const TAPER = 5, HW = TAPERED_BAR_HW, HW_TIP = 1.5, x1 = x0+TAPER, x2 = x3-TAPER;
  return `M${x0},${-HW_TIP} L${x1},${-HW} L${x2},${-HW} L${x3},${-HW_TIP} `
    + `L${x3},${HW_TIP} L${x2},${HW} L${x1},${HW} L${x0},${HW_TIP} Z`;
}
function appendExpansionVane(g, type, worldRot){
  if(!type.expansion) return;
  const L = type.length, x0 = (L-EXPANSION_VANE_LEN)/2;
  g.appendChild(el('path',{d:taperedBarD(x0, x0+EXPANSION_VANE_LEN), fill:EXPANSION_VANE_COLOR}));
  const t = el('text',{x:L/2, y:0, 'text-anchor':'middle', 'dominant-baseline':'central',
    ...(markerFlipped(worldRot) ? {transform:`rotate(180 ${L/2} 0)`} : {}),
    fill:EXPANSION_VANE_TEXT, 'font-size':(TAPERED_BAR_HW*1.45).toFixed(2), 'font-weight':'700',
    'font-family':UI_FONT,
    style:'pointer-events:none;user-select:none;'});
  t.textContent = `${Math.round(L*10)/10}mm`;
  g.appendChild(t);
}

// Slab track (`ties:'slab'`), from a photo of a WS62S: each track on a
// concrete slab of SLAB_PANEL_LEN panels, with a narrower strip between the
// tracks. The slab is a translucent light layer over the roadbed, so the
// roadbed's selection, elevation and slope colours still show through. Its
// rail fastenings stand in for ties (appendTies).
const SLAB_PANEL_LEN = 31, SLAB_HALF_W = 10.4, SLAB_CENTRE_HALF = 4.85;
const SLAB_COLOR = '#c3c8cd', SLAB_OPACITY = 0.45, SLAB_LINE_COLOR = '#4a5058';
const SLAB_FASTENING_PITCH = SLAB_PANEL_LEN/7, SLAB_FASTENING_W = 1.9, SLAB_FASTENING_ACROSS = 4.4;
const SLAB_FASTENING_END_CLEAR = 9, SLAB_FASTENING_COLOR = '#6c7278';
// A slab piece's frame, straight (dstraight) or curved (dcurve): the two
// tracks' offsets from the centreline, `len(v)` (length along the line offset
// v), `at(f, v, du)` (the point a fraction f along, offset v across, moved du
// along), `band(v0, v1)` (the strip between two offsets) and `line(v)`.
function slabFrame(type){
  if(type.cat==='dcurve'){
    const {angle, hand} = type, R = (type.radiusInner+type.radiusOuter)/2;
    return {tracks:[type.radiusInner-R, type.radiusOuter-R],
      len: v=>(R+v)*angle*Math.PI/180,
      at: (f, v, du=0)=>curveFramePoint(R, hand, f*angle, du, v),
      band: (v0, v1)=>annularBandD(R, angle, hand, R+Math.min(v0,v1), R+Math.max(v0,v1)),
      line: v=>offsetArcPathD(R, angle, hand, R+v)};
  }
  const L = type.length, S = type.spacing;
  return {tracks:[-S/2, S/2], len: ()=>L,
    at: (f, v, du=0)=>({x:f*L+du, y:v}),
    band: (v0, v1)=>`M0 ${v0}H${L}V${v1}H0Z`,
    line: v=>`M0 ${v}H${L}`};
}
function appendSlab(g, type, shown = tiesView.shown){
  if(type.ties!=='slab' || !shown) return;
  const fr = slabFrame(type), W = SLAB_HALF_W, C = SLAB_CENTRE_HALF;
  let d = fr.band(-C, C), lines = fr.line(-C) + fr.line(C), seams = '';
  fr.tracks.forEach(v=>{
    d += fr.band(v-W, v+W);
    // The slabs' long edges, as moulded lines, and a seam between panels,
    // square across the track.
    lines += fr.line(v-W) + fr.line(v+W);
    const np = Math.max(1, Math.round(fr.len(v)/SLAB_PANEL_LEN));
    for(let k=1;k<np;k++){
      const a = fr.at(k/np, v-W), b = fr.at(k/np, v+W);
      seams += `M${a.x.toFixed(3)} ${a.y.toFixed(3)}L${b.x.toFixed(3)} ${b.y.toFixed(3)}`;
    }
  });
  g.appendChild(el('path',{d, fill:SLAB_COLOR, 'fill-opacity':SLAB_OPACITY}));
  g.appendChild(el('path',{d:lines+seams, fill:'none', stroke:SLAB_LINE_COLOR, 'stroke-width':0.35}));
}

// Pit tracks (`ties:'pit'` open pit, `'ashpit'` ash pit; both part code
// S186P), from photos: a plain concrete base across the whole piece,
// translucent like the slab so the roadbed's colours show through, the pit
// between the rails darker, and raised mounts under the rails standing in for
// ties (appendTies): `blocks` of them evenly between `first` mm from each
// end, plus a larger one `endBlock` mm in, beside each rail joiner. Sizes are
// along × across the rail. The ash pit is darker concrete with a deeper,
// narrower channel and many finer mounts.
const PIT_STYLES = {
  pit:    {base:SLAB_COLOR, floor:'#2f343b', floorOpacity:0.35, floorHalf:RAIL_OFF, floorEnd:9,
           blocks:20, first:16, block:[3.2, 5.3], endBlock:9, endSize:[3.2, 5.3], blockColor:'#c9ced3'},
  ashpit: {base:'#8e9296', floor:'#15181c', floorOpacity:0.6, floorHalf:3.2, floorEnd:14,
           blocks:33, first:15, block:[1.4, 2.8], endBlock:9.2, endSize:[3, 4.2], blockColor:'#a4a9ae'},
};
const PIT_BLOCK_EDGE = '#4a5058';
function appendPitSlab(g, type){
  const s = PIT_STYLES[type.ties];
  if(!s) return;
  const L = type.length;
  g.appendChild(el('path',{d:`M0 ${-ROADBED_HALF}H${L}V${ROADBED_HALF}H0Z`, fill:s.base, 'fill-opacity':SLAB_OPACITY}));
  g.appendChild(el('path',{d:`M${s.floorEnd} ${-s.floorHalf}H${L-s.floorEnd}V${s.floorHalf}H${s.floorEnd}Z`,
    fill:s.floor, 'fill-opacity':s.floorOpacity}));
}

// Feeder bolt: faint, between and under the rails. A path, not ⚡, which some
// platforms render as colour emoji.
const BOLT_PATH_D = 'M7 2v11h3v9l7-12h-4l4-8z';
const BOLT_BBOX = {x:3, y:0, w:14, h:22}; // the path's own bounding box
function appendFeederSymbol(g, type, worldRot){
  if(!type.feeder && !type.dualFeeder) return;
  const L = type.length;
  // On a dual feeder it can use the wider gap between the tracks.
  // Drawn over everything (rails included). The tied-style feeder's bolt (twice
  // the gauge gap it once fitted, solid yellow) is also the double feeder's.
  const newBolt = !!type.ties || !!type.dualFeeder;
  const targetH = newBolt ? 2*GAUGE*0.82 : GAUGE*0.82;
  const scale = targetH / BOLT_BBOX.h;
  const cx = BOLT_BBOX.x + BOLT_BBOX.w/2, cy = BOLT_BBOX.y + BOLT_BBOX.h/2;
  const p = el('path',{
    d: BOLT_PATH_D,
    transform:`translate(${(L/2).toFixed(2)},0)${markerFlipped(worldRot) ? ' rotate(180)' : ''} scale(${scale.toFixed(4)}) translate(${-cx},${-cy})`,
    fill: newBolt ? FEEDER_BOLT_COLOR : '#c7cdd6', 'fill-opacity': newBolt ? '1' : '0.4',
    style:'pointer-events:none;user-select:none;',
  });
  g.appendChild(p);
}

// Easement curves: a small square at the flat end (ports 0/1), between the
// tracks.
const SUPERELEV_MARK_SIZE = 4; // mm square
const SUPERELEV_MARK_INSET = 5; // mm in from the flat end
function appendSuperelevationDot(g, type){
  if(type.superelevation!=='easement') return;
  const s = SUPERELEV_MARK_SIZE;
  g.appendChild(el('rect',{
    x:SUPERELEV_MARK_INSET-s/2, y:-s/2, width:s, height:s,
    fill:'#c7cdd6', 'fill-opacity':'0.55',
    style:'pointer-events:none;user-select:none;',
  }));
}

// Rerailer guide ramp, from a photo: an elongated hexagon between the rails,
// under them.
const RERAILER_HALF_LEN_FRAC = 0.28; // half-length, as a fraction of piece length
const RERAILER_TAPER_FRAC = 0.32; // fraction of the half-length taken by each pointed end
const RERAILER_HALF_WIDTH = RAIL_OFF*0.55; // well inside the gap between the rails
// Guide-flare lines: a short diagonal beside each rail at each end, funnelling
// a wheel back on.
const RERAILER_FLARE_OUTER_Y = ROADBED_HALF - 2;
const RERAILER_MARK_COLOR = '#2a2e35';
const RERAILER_FLARE_STROKE_W = 0.8; // 2× the default 0.4
function appendRerailerMarker(g, type){
  if(!type.rerailer) return;
  const L = type.length;
  const cx = L/2;
  const hl = L*RERAILER_HALF_LEN_FRAC, hw = RERAILER_HALF_WIDTH;
  const taper = hl*RERAILER_TAPER_FRAC;
  const x0 = cx-hl, xa = x0+taper, xb = cx+hl-taper, x1 = cx+hl;
  const strokeAttrs = {stroke:RERAILER_MARK_COLOR, 'stroke-opacity':'0.7', 'stroke-width':RERAILER_FLARE_STROKE_W, fill:'none',
    style:'pointer-events:none;user-select:none;'};
  const flareOuter = RERAILER_FLARE_OUTER_Y;
  [
    `M${x0},${-flareOuter} L${xa},${-RAIL_OFF}`, // left end, top rail
    `M${x0},${flareOuter} L${xa},${RAIL_OFF}`,   // left end, bottom rail
    `M${x1},${-flareOuter} L${xb},${-RAIL_OFF}`, // right end, top rail
    `M${x1},${flareOuter} L${xb},${RAIL_OFF}`,   // right end, bottom rail
  ].forEach(d=> g.appendChild(el('path',{d, ...strokeAttrs})));
  const d = `M${x0},0 L${xa},${-hw} L${xb},${-hw} L${x1},0 L${xb},${hw} L${xa},${hw} Z`;
  g.appendChild(el('path',{
    d, fill:RERAILER_MARK_COLOR, 'fill-opacity':'0.5', stroke:RERAILER_MARK_COLOR, 'stroke-opacity':'0.7', 'stroke-width':0.4,
    style:'pointer-events:none;user-select:none;',
  }));
}

// Buffer stop (A/B): a block across the rails, drawn after them, BUMPER_GAP
// past the rail end. Type A: square concrete block. Type B: open wooden
// bracket, cap plus two side walls about two-thirds the length.
const BUMPER_GAP = 2; // mm back from the rail end
const BUMPER_B_WING_FRAC = 2/3; // Type B wing length, as a fraction of the stop's own length
// Tuned against the real parts.
const BUMPER_SIZE_SCALE = 0.85;
const BUMPER_B_STROKE_SCALE = 1.4;
// Where a flush bumper block (`bumperFlush`) starts along the piece.
function bumperBlockStart(type){
  const hw = (ROADBED_HALF-1.5) * BUMPER_SIZE_SCALE;
  return type.railLength - hw*2;
}
// A tied bumper's X frame, from tie `xTies[0]` to tie `xTies[1]` (1-based,
// the end half tie first); by default the third to the second-to-last.
function bumperXSpan(type){
  const [a, b] = type.xTies || [3, type.tieCount-1];
  return [(a-1)*TIE_PITCH, (b-1)*TIE_PITCH];
}
function appendBumperStop(g, type){
  if(!type.deadEnd) return;
  const L = type.length;
  const hw = (ROADBED_HALF-1.5) * BUMPER_SIZE_SCALE; // half-width, inset slightly from the roadbed edge
  const railEnd = type.railLength!==undefined ? type.railLength : 0;
  // The illuminated Type A (`bumperFlush`) sits over the last stretch of rail;
  // plain bumpers start past it.
  const x0 = type.bumperFlush ? (railEnd - hw*2) : (railEnd + BUMPER_GAP);
  // Only bumperType 'A' and 'B' get a block; the others show just the sign.
  if(type.bumperType==='B'){
    // From the stop's bare length (L − railEnd).
    const bumperLen = L - railEnd;
    const x1 = x0 + bumperLen*BUMPER_B_WING_FRAC*BUMPER_SIZE_SCALE;
    const d = `M${x0},${-hw} L${x1},${-hw} M${x0},${hw} L${x1},${hw} M${x0},${-hw} L${x0},${hw}`;
    g.appendChild(el('path',{
      d, fill:'none', stroke:'#a9793f', 'stroke-width':1.1*BUMPER_B_STROKE_SCALE, 'stroke-linecap':'square',
      style:'pointer-events:none;user-select:none;',
    }));
  } else if(type.bumperType==='A'){
    const side = hw*2; // square: side matches the inset width
    g.appendChild(el('rect',{
      x:x0, y:-side/2, width:side, height:side,
      fill:'#9a9fa8', stroke:'#5a5f68', 'stroke-width':0.5,
      style:'pointer-events:none;user-select:none;',
    }));
  } else if(type.railLength!==undefined && !type.noXMark){
    // Blockless bumpers (BUMPC, BUMPBI) get a small X from the sign to the rail
    // end, under the sign.
    // On a tied bumper (`tieCount`) the X is the stop's frame: from the third
    // tie in from the port to the second-to-last.
    const xNear = type.tieCount ? bumperXSpan(type)[0] : L/2 - BUMPER_SIGN_SIZE/2;
    const xFar = type.tieCount ? bumperXSpan(type)[1] : railEnd;
    if(xFar > xNear){
      const d = `M${xNear},${-RAIL_OFF} L${xFar},${RAIL_OFF} M${xNear},${RAIL_OFF} L${xFar},${-RAIL_OFF}`;
      g.appendChild(el('path',{
        d, stroke:'#111214', 'stroke-width':1.5, 'stroke-linecap':'round',
        style:'pointer-events:none;user-select:none;',
      }));
    }
  }
  // A tied bumper's sign sits on its X's crossing point; others mid-piece.
  appendBumperSign(g, type, (type.tieCount && !type.tiesToBlock) ? bumperXSpan(type).reduce((a, b)=>(a+b)/2) : L/2);
}

// 車止標識, the end-of-track sign: white square, thin black frame, four-pointed
// black star with one point per edge. One point shape rotated four times. Drawn
// last.
const BUMPER_SIGN_SIZE = 7.5; // mm, side of the sign
const BUMPER_SIGN_POINT_FRAC = 0.37; // each point's base, as a fraction of the half-edge
function appendBumperSign(g, type, cx){
  const s = BUMPER_SIGN_SIZE, hs = s/2;
  const sign = el('g', {transform:`translate(${cx},0)`, style:'pointer-events:none;user-select:none;'});
  sign.appendChild(el('rect',{x:-hs, y:-hs, width:s, height:s, fill:'#f2f3f5', stroke:'#111214', 'stroke-width':0.3}));
  const baseHalf = hs*BUMPER_SIGN_POINT_FRAC;
  const pointD = `M0,0 L${-baseHalf},${-hs} L${baseHalf},${-hs} Z`;
  [0,90,180,270].forEach(rot=>{
    sign.appendChild(el('path',{d:pointD, fill:'#111214', transform:`rotate(${rot})`}));
  });
  g.appendChild(sign);
}

