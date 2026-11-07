// One track piece. Canvas, drag ghost and palette thumbnail all draw through
// here, so a piece looks the same everywhere. Paint order: roadbed; markings
// printed on it (length label, bolt, superelevation dot, rerailer) so rails lie
// over them; bridge structure; rails and fishplates; things on top (wires,
// crossover gap, buffer, sign). `style` carries what differs by context:
// roadbed fill/stroke (selection, preview), default rail colour/width (a
// piece's own overrides win; railWidth is a ratio), and the thumbnail's stroke
// settings.
const RAIL_WIDTH_DEFAULT = 0.9;
// Viaducts: a standard piece in a wider concrete deck, drawn as lighter
// shoulders flanking the roadbed (straight rect, or annularBandD on curves).
// Look only; no pier object. DECK_HALF is an estimate matching the bridges'
// envelope.
// A Unitram straight's street surface: the roadbed fill is the paving (as the
// rerailer's grey), with a strip of ordinary roadbed along each edge and the
// panel joints, from KATO's close-up: a seam along each side's paving and a
// pair along the middle (three columns between the tracks), and a joint across
// every panel but the middle column's, all in line.
// The columns against the rails' outer sides are as wide as the one beside the
// outer rail (seam to rail), so the middle column is what's left.
function tramColumns(spacing){
  const out = TRAM_HALF - TRAM_KERB_W, seamOut = out - 2.8, railOut = spacing/2 + RAIL_OFF, railIn = spacing/2 - RAIL_OFF;
  return {out, seamOut, mid:railIn - (seamOut - railOut)};
}
// Toggle Detail hides it all, down to the bare roadbed (roadbedFillFor) and rails.
// Power View keeps the plain edges with the detail off, so its colour stays on
// the roadbed and tracks rather than the whole plate.
function appendStreetSurface(g, type, style, shown = tiesView.shown){
  if(!shown && !style.powerView) return;
  const edgesOnly = !shown;
  if(type.cat==='tramcurve' || type.cat==='tramturnout') appendCurvedStreetSurface(g, type, style, edgesOnly);
  if(type.cat==='tramcross') appendCrossingStreetSurface(g, type, style, edgesOnly);
  if(type.cat==='roadplate') (type.centerPlate ? appendCenterPlateSurface : type.centerlinePlate ? appendCenterlinePlateSurface : type.length && !type.cornerPlate ? appendStraightRoadPlateSurface : appendRoadPlateSurface)(g, style, type);
  if(type.cat!=='tram') return;
  const L = type.length, H = TRAM_HALF, K = TRAM_KERB_W, edge = style.selected ? ROADBED_FILL_SELECTED : ROADBED_FILL_DEFAULT;
  [-H, H - K].forEach(y=>g.appendChild(el('rect', {x:0, y, width:L, height:K, fill:edge})));
  if(edgesOnly) return;
  appendStraightStreetLines(g, L, type.spacing);
  appendRailBed(g, type);
}
// The road plate's printing, measured off KATO's pack photo: a kerbed pavement
// round a car park, with its tactile line and parking bays, and the road beyond
// with its crossings, cycle lane and lane lines. The road arrows and small
// symbols aren't drawn.
const ROAD_PLATE_LOT = '#4c525d', ROAD_PLATE_PAVEMENT = '#8d8f98', ROAD_PLATE_TACTILE = '#c9a93b';
// Every row of bays runs the same distance from the corner, so plates side by
// side line up. A bay across the x axis, between x = a and x = b.
const ROAD_PLATE_BAY_FOOT = 85, ROAD_PLATE_BAY_TIP = 107;
const roadPlateBay = ([a, b])=>{ const r = (b-a)/2;
  return `M${a} ${-ROAD_PLATE_BAY_FOOT}V${r-ROAD_PLATE_BAY_TIP}A${r} ${r} 0 0 1 ${b} ${r-ROAD_PLATE_BAY_TIP}V${-ROAD_PLATE_BAY_FOOT}`; };
// The straight plate's printing, from a photo of one: the quarter plate's
// bands carried straight on, so they meet it at both ends.
function appendStraightRoadPlateSurface(g, style, type){
  const L = type.length, printing = el('g', {});
  const paint = (d, attrs)=>el('path', {d, fill:'none', ...attrs});
  const zebra = [85.5, 90.7, 96, 101.2, 106.5].map(y=>`M58.7 ${-y}H71.7`).join('');
  const bays = [[5.6, 8.7], [21.7, 25], [37.8, 41], [81.7, 85], [97.8, 101], [115, 119]].map(roadPlateBay).join('');
  [
    el('path', {d:`M0 -137H${L}V0H0Z`, fill:ROADBED_FILL_RERAILER}),
    el('path', {d:`M0 -135.5H${L}V0H0Z`, fill:ROAD_PLATE_PAVEMENT}),
    el('path', {d:`M0 -112H${L}V0H0Z`, fill:style.selected ? ROADBED_FILL_SELECTED : ROAD_PLATE_LOT}),
    paint(`M0 -117.5H${L}`, {stroke:ROAD_PLATE_TACTILE, 'stroke-width':1.3}),
    paint(`M0 -138.5H${L}M15 -162H45M77 -162H107M53.5 -85V-107${bays}`, {stroke:TWR_MARK_COLOR, 'stroke-width':0.9}),
    paint(zebra, {stroke:TWR_MARK_COLOR, 'stroke-width':2.2}),
  ].forEach(n=>printing.appendChild(n));
  g.appendChild(printing);
}
// The centerline plate's printing, measured off KATO's photo: a crossing with a
// cycle lane beside it (the corner plate's, the same distance from the far end),
// a hatched median each side of it, rounded at one end and with the yellow
// centreline along the other, then a stop line and a lane arrow.
function appendCenterlinePlateSurface(g, style, type){
  const white = {fill:'none', stroke:TWR_MARK_COLOR, 'stroke-width':0.9};
  // The hatching repeats six times in 62mm, so it carries on from plate to plate.
  const pitch = 62/6, hatching = (from, to)=>{
    let d = '';
    for(let k=Math.floor((from - 22 - to)/pitch);to + k*pitch<=to;k++) d += `M${to + k*pitch} -20.4L${to + k*pitch + 21.2} -41.6`;
    return d;
  };
  if(type.length===62){
    // Just the median and centreline, running edge to edge.
    g.appendChild(clipTo(el('path', {d:hatching(0, 62), fill:'none', stroke:TWR_MARK_COLOR, 'stroke-width':3.6}), 'M0 -41.6H62V-20.4H0Z'));
    g.appendChild(el('path', {d:'M0 -41.6H62M0 -20.4H62', ...white}));
    g.appendChild(el('path', {d:'M0 -31H62', fill:'none', stroke:ROAD_PLATE_TACTILE, 'stroke-width':1.2}));
    return;
  }
  const median = 'M109 -41.6H186V-20.4H109ZM60.3 -41.6H75.6V-20.4H60.3A10.6 10.6 0 0 1 60.3 -41.6Z';
  const hatch = hatching(50, 186);
  let zebra = '';
  for(let k=0;k<=10;k++) zebra += `M87 ${3.7 + 5.4*k - type.depth}H109`;
  g.appendChild(clipTo(el('path', {d:hatch, fill:'none', stroke:TWR_MARK_COLOR, 'stroke-width':3.6}), median));
  g.appendChild(el('path', {d:median, ...white}));
  g.appendChild(el('path', {d:'M109 -31H186', fill:'none', stroke:ROAD_PLATE_TACTILE, 'stroke-width':1.2}));
  g.appendChild(el('path', {d:`M79.5 0V${-type.depth}M87.7 0V${-type.depth}M124.4 0V-20.4M155 -11H184`, ...white}));
  g.appendChild(el('path', {d:zebra, fill:'none', stroke:TWR_MARK_COLOR, 'stroke-width':2.6}));
  g.appendChild(el('path', {d:'M150 -11L158 -13.2V-8.8Z', fill:TWR_MARK_COLOR}));
}
// The centre plate's printing, measured off KATO's photo: a diamond whose sides
// curve slightly inward, five lines across it, and four slim arrows round it,
// each beside a side and all circling the same way. Drawn as it sits on the
// plate with the street curves at the lower left.
function appendCenterPlateSurface(g, style, type){
  const m = type.length/2, R = 13.5, sag = 0.6;
  const side = (fromX, fromY, toX, toY)=>{
    const cx = (fromX + toX)/2, cy = (fromY + toY)/2;
    return `Q${cx - Math.sign(cx)*sag + m} ${cy - Math.sign(cy)*sag - m} ${toX + m} ${toY - m}`;
  };
  const diamond = `M${m-R} ${-m}${side(-R, 0, 0, -R)}${side(0, -R, R, 0)}${side(R, 0, 0, R)}${side(0, R, -R, 0)}Z`;
  const lines = [-8.4, -4.2, 0, 4.2, 8.4].map(o=>`M${m + o - 5} ${-m + 20}L${m + o + 5} ${-m - 20}`).join('');
  const line = {fill:'none', stroke:TWR_MARK_COLOR, 'stroke-width':0.9};
  g.appendChild(clipTo(el('path', {d:lines, ...line}), diamond));
  g.appendChild(el('path', {d:diamond, ...line}));
  // Each arrow's tail and tip from the middle, turned a quarter each time.
  let shafts = '', heads = '';
  [[-4.6, -23.5, -11.4, -15.5], [23.5, -4.6, 15.5, -11.4], [4.6, 23.5, 11.4, 15.5], [-23.5, 4.6, -15.5, 11.4]].forEach(([tx, ty, hx, hy])=>{
    const len = Math.hypot(hx - tx, hy - ty), ux = (hx - tx)/len, uy = (hy - ty)/len, bx = hx - 3.6*ux, by = hy - 3.6*uy;
    shafts += `M${m + tx} ${-m + ty}L${m + bx} ${-m + by}`;
    heads += `M${m + hx} ${-m + hy}L${m + bx - 1.1*uy} ${-m + by + 1.1*ux}L${m + bx + 1.1*uy} ${-m + by - 1.1*ux}Z`;
  });
  g.appendChild(el('path', {d:shafts, fill:'none', stroke:TWR_MARK_COLOR, 'stroke-width':0.6}));
  g.appendChild(el('path', {d:heads, fill:TWR_MARK_COLOR}));
}
function appendRoadPlateSurface(g, style, type){
  const paint = (d, attrs)=>el('path', {d, fill:'none', ...attrs});
  const white = {stroke:TWR_MARK_COLOR, 'stroke-width':0.9};
  const yellow = {stroke:ROAD_PLATE_TACTILE};
  // A corner plate's square has room for one more stripe in each crossing.
  const stripesAcross = [...(type.cornerPlate ? [180.5] : []), 175, 169.6, 164, 158.7, 153, 147.8, 142.4].map(y=>`M77 ${-y}H99`).join('');
  const stripesDown = [142.8, 148.5, 153.9, 159.3, 164.8, 170.2, 175.6, ...(type.cornerPlate ? [181] : [])].map(x=>`M${x} -77V-99`).join('');
  const bayFoot = ROAD_PLATE_BAY_FOOT, bayTip = ROAD_PLATE_BAY_TIP;
  const bays = [[6.7, 10.9], [22.8, 26.5]].map(roadPlateBay).join('')
    + [[54, 57.6], [38.5, 42.4], [23, 26.5], [6.5, 10.4]].map(([a, b])=>{ const r = (b-a)/2;
      return `M${bayFoot} ${-b}H${bayTip-r}A${r} ${r} 0 0 1 ${bayTip-r} ${-a}H${bayFoot}`; }).join('');
  const hatched = [39, 58.7].map(x=>`M${x} ${-bayFoot}V${-bayTip}H${x+7}V${-bayFoot}Z`
    + [-89, -96, -103].map(y=>`M${x} ${y+3}L${x+7} ${y-3}`).join('')).join('');
  const printing = el('g', {});
  [
    el('path', {d:'M0 -137H108A29 29 0 0 1 137 -108V0H0Z', fill:ROADBED_FILL_RERAILER}),
    el('path', {d:'M0 -135.5H108A27.5 27.5 0 0 1 135.5 -108V0H0Z', fill:ROAD_PLATE_PAVEMENT}),
    el('path', {d:'M0 -112H112V0H0Z', fill:style.selected ? ROADBED_FILL_SELECTED : ROAD_PLATE_LOT}),
    // The same distance out on both sides, so plates side by side line up.
    paint('M0 -117.5H117.5V0M87 -117.5V-131.5M117.5 -87H131.5', {...yellow, 'stroke-width':1.3}),
    paint('M76 -131.5H98M131.5 -76V-98', {...yellow, 'stroke-width':3}),
    paint(`M0 -138.5H77M98.3 -138.5V-186M106.5 -138.5V-186M138.5 -98.3H186M138.5 -106.5H186`
      + `M106.5 -138.5A32 32 0 0 1 138.5 -106.5M138.5 -76V0M138.5 -61H184M162 -59V-4M15 -162H45${bays}${hatched}`, white),
    paint(stripesAcross + stripesDown, {stroke:TWR_MARK_COLOR, 'stroke-width':2.6}),
  ].forEach(n=>printing.appendChild(n));
  g.appendChild(clipTo(printing, TRACK_CATEGORIES.roadplate.graphics(type)[0].roadbed));
}
// The crossing's surface, from KATO's photo: all paving, with a triangle of
// ordinary roadbed at each corner where the neighbouring straights' edge strips
// run out. It has eightfold symmetry, so one set of joints and dots (from the
// middle of the square) is repeated for every turn and mirror.
const TRAM_CROSS_JOINTS = [[0, 0, 8, 0], [0, -21, 0, -8], [1.8, -31, 1.8, -21], [0, -21, 17, -21], [21, -21, 21, -17]];
const TRAM_CROSS_DOTS = [[0, -25], [24, -24]];
function appendCrossingStreetSurface(g, type, style, edgesOnly){
  const m = type.length/2, K = TRAM_KERB_W, edge = style.selected ? ROADBED_FILL_SELECTED : ROADBED_FILL_DEFAULT;
  const turns = [-1, 1].flatMap(a=>[-1, 1].flatMap(b=>[(x, y)=>[m + a*x, b*y], (x, y)=>[m + a*y, b*x]]));
  let corners = '';
  [-1, 1].forEach(a=>[-1, 1].forEach(b=>{ corners += `M${m + a*m} ${b*m}H${m + a*(m - K)}L${m + a*m} ${b*(m - K)}Z`; }));
  g.appendChild(el('path', {d:corners, fill:edge}));
  if(edgesOnly) return;
  let d = '';
  TRAM_CROSS_JOINTS.forEach(([x0, y0, x1, y1])=>turns.forEach(t=>{ d += `M${t(x0, y0)}L${t(x1, y1)}`; }));
  const dots = new Set(TRAM_CROSS_DOTS.flatMap(([x, y])=>turns.map(t=>`M${t(x, y)}h0`)));
  g.appendChild(el('path', {d, fill:'none', stroke:TRAM_SEAM_COLOR, 'stroke-width':0.3}));
  g.appendChild(el('path', {d:[...dots].join(''), fill:'none', stroke:TRAM_SEAM_COLOR, 'stroke-width':0.7, 'stroke-linecap':'round'}));
  appendRailBed(g, type);
}
function appendStraightStreetLines(g, L, spacing){
  const {out, seamOut, mid} = tramColumns(spacing), n = Math.round(L/TRAM_PANEL), p = L/n;
  let d = '', dots = '';
  [-1, 1].forEach(sd=>{
    d += `M0 ${sd*seamOut}H${L}M0 ${sd*mid}H${L}`;
    for(let k=1;k<n;k++) d += `M${k*p} ${sd*mid}V${sd*out}`;
    // A dot at the middle of each panel in the outermost column.
    for(let k=0;k<n;k++) dots += `M${(k+0.5)*p} ${sd*(out + seamOut)/2}h0`;
  });
  for(let k=0;k<n;k++) dots += `M${(k+0.5)*p} 0h0`; // and in the middle column
  g.appendChild(el('path', {d, fill:'none', stroke:TRAM_SEAM_COLOR, 'stroke-width':0.3}));
  g.appendChild(el('path', {d:dots, fill:'none', stroke:TRAM_SEAM_COLOR, 'stroke-width':0.7, 'stroke-linecap':'round'}));
}
// A street curve's surface, the straights' columns following each track: the
// paving lines up with a straight's at the near end, the plate round it is
// ordinary roadbed, and the middle column takes up the tracks' spread, with a
// joint across it after every two of its dots. The road markings on the outer
// plate are placed from KATO's photo. A street turnout (`tramturnout`) is the
// same plate holding a straight's paving and lines as well, the curve's lines
// showing only outside the straight's paving.
const TWR_MARK_COLOR = '#e6e9ee';
const TWR_PANELS_OUTER = 21, TWR_PANELS_INNER = 19, TWR_DOTS_MIDDLE = 24;
// Street track's rail bed, from KATO's photo: a darker strip under every rail, so
// on a turnout they merge into one where the rails draw together and the paving
// shows as islands between them.
const TRAM_BED_COLOR = '#7c828c', TRAM_BED_W = 2.8;
function appendRailBed(g, type){
  const d = pieceGraphics(type).flatMap(seg=>seg.rails).join('');
  g.appendChild(el('path', {d, fill:'none', stroke:TRAM_BED_COLOR, 'stroke-width':TRAM_BED_W}));
}
// A street turnout's trackwork over that: a black frog where a diverging rail
// crosses a straight one, and a tie bar across each track at its points.
const TWEP_FROG_COLOR = '#1d2025', TWEP_TIE_COLOR = '#646a74';
function appendTurnoutTrackbed(g, h, sign){
  const tracks = [-h, h], offs = [-RAIL_OFF, RAIL_OFF];
  const straightRails = tracks.flatMap(v0=>offs.map(o=>v0 + o));
  const arcs = tracks.flatMap(v0=>offs.map(d=>twrArc(v0, d)));
  const y = v=>sign*v;
  let frogs = '';
  arcs.forEach(a=>straightRails.forEach(v=>{
    if(v<=a.vc - a.r + 1e-6) return; // only ahead of where this rail starts
    const t = Math.acos((a.vc - v)/a.r);
    if(t>Math.PI/4) return;
    const u = a.c + a.r*Math.sin(t), du = 2.5*Math.cos(t), dv = 2.5*Math.sin(t);
    // One block along each rail, the two making one shape.
    frogs += `M${u - du} ${y(v - dv)}L${u + du} ${y(v + dv)}M${u - 2.5} ${y(v)}H${u + 2.5}`;
  }));
  g.appendChild(el('path', {d:frogs, fill:'none', stroke:TWEP_FROG_COLOR, 'stroke-width':3.5}));
  // The bars sit just ahead of each track's own arc starting.
  const ties = tracks.map(v0=>{ const u = twrArc(v0).c + 9; return `M${u} ${y(v0 - RAIL_OFF)}L${u} ${y(v0 + RAIL_OFF)}`; }).join('');
  g.appendChild(el('path', {d:ties, fill:'none', stroke:TWEP_TIE_COLOR, 'stroke-width':3}));
}
function appendCurvedStreetSurface(g, type, style, edgesOnly){
  const sign = twrSign(type), h = type.spacing/2, H = TWR_PLATE_HALF, L = TWR_PLATE_LEN, turnout = type.cat==='tramturnout';
  const {out, seamOut, mid} = tramColumns(type.spacing);
  const edge = style.selected ? ROADBED_FILL_SELECTED : ROADBED_FILL_DEFAULT;
  // Each column edge, as a distance |v| at the near end, on its own side's track.
  const arcAt = (v0, x)=>twrArc(v0, (v0<0 ? 1 : -1)*(x - h));
  const y = v=>sign*v, line = (a, b)=>`M${a.u} ${y(a.v)}L${b.u} ${y(b.v)}`, dot = p=>`M${p.u} ${y(p.v)}h0`;
  const paveOut = arcAt(-h, out), paveIn = arcAt(h, out), paveOutEnd = twrEnd(paveOut);
  const straightPave = `M0 ${-out}H${L}V${out}H0Z`;
  if(turnout){
    g.appendChild(el('path', {fill:edge, d:twrPlateD(sign)}));
    [straightPave, `${twrArcD(paveOut, sign)}${twrArcD(paveIn, sign, true)}Z`].forEach(pave=>g.appendChild(el('path', {fill:style.roadbedFill, d:pave})));
    if(!edgesOnly) appendStraightStreetLines(g, L, type.spacing);
  } else g.appendChild(el('path', {fill:edge, d:
    `M0 ${y(-H)}L${L} ${y(-H)}L${L} ${y(H)}L${paveOutEnd.u} ${y(paveOutEnd.v)}${twrArcD(paveOut, sign, true)}Z`
    + `${twrArcD(paveIn, sign)}${twrArcD(TWR_PLATE_INNER, sign, true)}Z`}));
  if(edgesOnly) return;
  let d = '', dots = '';
  [-h, h].forEach(v0=>{
    const seam = arcAt(v0, seamOut), inner = arcAt(v0, mid), n = v0<0 ? TWR_PANELS_OUTER : TWR_PANELS_INNER, p = twrTrackLen(twrArc(v0))/n;
    const outer = arcAt(v0, out), dotted = arcAt(v0, (out + seamOut)/2);
    d += twrArcD(seam, sign) + twrArcD(inner, sign);
    for(let k=1;k<n;k++) d += line(twrPoint(inner, k*p), twrPoint(outer, k*p));
    for(let k=0;k<n;k++) dots += dot(twrPoint(dotted, (k+0.5)*p));
  });
  // Across the middle column, square to the spine at `s` along it: where the
  // spine's normal there meets each of the column's edges, on its arc or its
  // straight run.
  const spine = twrArc(0), pMid = twrTrackLen(spine)/TWR_DOTS_MIDDLE;
  const meet = (a, s)=>{
    const t = Math.max(0, s - spine.c)/spine.R, ou = Math.min(s, spine.c), nu = Math.sin(t), nv = -Math.cos(t);
    const du = ou - a.c, dv = spine.vc - a.vc, b = du*nu + dv*nv;
    let r = -b + Math.sqrt(b*b - (du*du + dv*dv - a.r*a.r));
    if(ou + r*nu < a.c) r = (spine.vc - (a.vc - a.r))/Math.cos(t);
    return {u:ou + r*nu, v:spine.vc + r*nv};
  };
  for(let k=2;k<TWR_DOTS_MIDDLE;k+=2) d += line(meet(arcAt(-h, mid), k*pMid), meet(arcAt(h, mid), k*pMid));
  for(let k=0;k<TWR_DOTS_MIDDLE;k++) dots += dot(twrPoint(spine, (k+0.5)*pMid));
  const lines = el('g', {});
  lines.appendChild(el('path', {d, fill:'none', stroke:TRAM_SEAM_COLOR, 'stroke-width':0.3}));
  lines.appendChild(el('path', {d:dots, fill:'none', stroke:TRAM_SEAM_COLOR, 'stroke-width':0.7, 'stroke-linecap':'round'}));
  g.appendChild(turnout ? clipTo(lines, null, [straightPave]) : lines);
  if(turnout){
    // The paving beside each route's rails merges as the rail bed does: one
    // shape over the lines beneath, its seam only round the outside of the
    // union, and each route's joints only where no other route's paving lies.
    const bandOf = route=>route.arc
      ? `${twrArcD(arcAt(route.v0, mid), sign)}${twrArcD(arcAt(route.v0, seamOut), sign, true)}Z`
      : `M0 ${y(Math.sign(route.v0)*mid)}H${L}V${y(Math.sign(route.v0)*seamOut)}H0Z`;
    const routes = [-h, h].flatMap(v0=>[{v0, arc:false}, {v0, arc:true}]), bands = routes.map(bandOf);
    const merged = el('g', {});
    merged.appendChild(el('path', {d:bands.join(''), fill:'none', stroke:TRAM_SEAM_COLOR, 'stroke-width':0.6}));
    bands.forEach(d=>merged.appendChild(el('path', {d, fill:style.roadbedFill})));
    g.appendChild(clipTo(merged, twrPlateD(sign)));
    routes.forEach((route, i)=>{
      let joints = '';
      if(route.arc){
        const a0 = arcAt(route.v0, mid), a1 = arcAt(route.v0, seamOut), n = route.v0<0 ? TWR_PANELS_OUTER : TWR_PANELS_INNER, p = twrTrackLen(twrArc(route.v0))/n;
        for(let k=1;k<n;k++) joints += line(twrPoint(a0, k*p), twrPoint(a1, k*p));
      } else {
        const n = Math.round(L/TRAM_PANEL), p = L/n, s = Math.sign(route.v0);
        for(let k=1;k<n;k++) joints += `M${k*p} ${y(s*mid)}V${y(s*seamOut)}`;
      }
      g.appendChild(clipTo(el('path', {d:joints, fill:'none', stroke:TRAM_SEAM_COLOR, 'stroke-width':0.3}), null, bands.filter((_, j)=>j!==i)));
    });
  }
  appendRailBed(g, type);
  if(turnout) appendTurnoutTrackbed(g, h, sign);
  // Road markings: an edge line, two stripes, and two bars from the edge to the
  // paving, as [u0, u1, v0, v1] (v1 null: up to the paving), level with the road
  // plates' crossing and cycle lane so they carry on across a join. On a turnout the
  // straight's paving leaves room for one stripe and the bars, and no edge line.
  const paveEdge = u=>turnout ? -out : paveOut.vc - Math.sqrt(paveOut.r*paveOut.r - (u - paveOut.c)*(u - paveOut.c));
  let marks = '';
  (turnout
    ? [[77, 99, -30.2, -27.9], [97.85, 98.75, -31, null], [106.05, 106.95, -31, null]]
    : [[1.5, 77, -30.6, -29.4], [77, 99, -30.2, -27.9], [77, 99, -26.2, -23.7], [97.85, 98.75, -31, null], [106.05, 106.95, -31, null]]).forEach(([u0, u1, v0, v1])=>{
    marks += `M${u0} ${y(v0)}L${u1} ${y(v0)}L${u1} ${y(v1 ?? paveEdge(u1))}L${u0} ${y(v1 ?? paveEdge(u0))}Z`;
  });
  g.appendChild(el('path', {d:marks, fill:TWR_MARK_COLOR}));
}
