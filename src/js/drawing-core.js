/* ============================================================
   DRAWING
   The view transform and pan clamp, SVG path geometry for every piece
   shape, pieceGraphics(), the on-piece markers, and drawPiece() — the one
   function the canvas, the drag ghost and the palette thumbnails all use.
   The per-frame render loop that calls these is further down (RENDER LOOP).
   ============================================================ */
const svg = document.getElementById('stage');
const NS='http://www.w3.org/2000/svg';
let view = {x:400, y:280, scale:1.4}; // screen = view.x + world*scale (world in mm)
let contentBounds = null; // world mm, set by every render(); keeps pan/zoom from losing the layout

// Keeps at least PAN_MARGIN px of the layout (or a default area) on screen. A
// hard stop; the ⟲ button is the escape hatch.
const PAN_MARGIN = 80; // px
function clampView(){
  const wrap = document.getElementById('canvasWrap');
  const w = wrap.clientWidth, h = wrap.clientHeight;
  const b = contentBounds || {minX:-300, maxX:300, minY:-300, maxY:300};
  const s = view.scale;
  const minViewX = PAN_MARGIN - b.maxX*s, maxViewX = w - PAN_MARGIN - b.minX*s;
  const minViewY = PAN_MARGIN - b.maxY*s, maxViewY = h - PAN_MARGIN - b.minY*s;
  view.x = Math.min(Math.max(view.x, Math.min(minViewX,maxViewX)), Math.max(minViewX,maxViewX));
  view.y = Math.min(Math.max(view.y, Math.min(minViewY,maxViewY)), Math.max(minViewY,maxViewY));
}

// Click target for ports and extend arrows: a semicircle bulging outward, so
// neighbouring targets can't overlap when zoomed out, filling to a full circle
// as you zoom in. `desiredR` is counter-scaled; `maxSafeR` is half the distance
// to the nearest sibling target (Infinity for none). +x is the outward heading.
const HIT_ZONE_R_PX = 22;
// fillT: 0 (semicircle) → 1 (circle) as desired/safe slack grows from 1× to
// 2.5×, smoothstepped.
const HIT_FILL_RATIO_START = 1, HIT_FILL_RATIO_FULL = 2.5;
function hitZonePath(desiredR, maxSafeR){
  const semiR = Math.min(desiredR, maxSafeR);
  const slackRatio = maxSafeR/desiredR;
  let fillT = Math.min(Math.max((slackRatio-HIT_FILL_RATIO_START)/(HIT_FILL_RATIO_FULL-HIT_FILL_RATIO_START), 0), 1);
  fillT = fillT*fillT*(3-2*fillT); // smoothstep easing
  const outerArc = `M 0,${-semiR} A ${semiR},${semiR} 0 0 1 0,${semiR}`;
  if(fillT < 0.001) return `${outerArc} Z`;
  const rin = semiR/fillT;
  return `${outerArc} A ${rin},${rin} 0 0 1 0,${-semiR} Z`;
}

// A fill or stroke given as var(--x) goes into the style attribute: presentation
// attributes can't read custom properties. This lets a piece's colours live on
// its <g> (see drawPieceBodies), so selecting it restyles rather than redraws.
function el(tag, attrs){
  const e = document.createElementNS(NS,tag);
  for(const k in attrs){
    const v = attrs[k];
    if((k==='fill' || k==='stroke' || k==='stop-color') && typeof v==='string' && v.includes('var(')) e.style.setProperty(k, v);
    // Added to, not replacing, so a var() colour set above survives.
    else if(k==='style') e.style.cssText += v;
    else e.setAttribute(k, v);
  }
  return e;
}
// A <mask> for one element of a piece, its region the masked element's own
// box plus half again on every side (room for any stroke). Never a fixed
// ±1000mm square: the browser renders the whole region off screen, and those
// cost more than the rest of a 300-piece layout together. Content stays in the
// piece's own coordinates (maskContentUnits defaults to userSpaceOnUse).
function pieceMask(id){
  return el('mask', {id, maskUnits:'objectBoundingBox', x:-0.5, y:-0.5, width:2, height:2});
}
// Clips `node` to the inside of path `inside` (if given) and to the outside of
// each path in `outsides`, with inline CSS clip-paths. Preferred over <mask>
// and <clipPath>: any definition referenced by url(#id) costs the browser
// ~1.3 ms or more to create, rising as more exist, which made 100 #4 turnouts
// take over 2 s to first draw; an inline clip costs nothing measurable.
// `view-box` puts the path in the element's own coordinates. Each clip after
// the first wraps the node in a <g> of its own, so they intersect. Returns the
// outermost node to append. A clip is hard-edged and only a path: a soft fade,
// or a region built from a stroke's width, still needs a mask.
const CLIP_EVERYWHERE = 'M-1000 -1000H2000V2000H-1000Z';
// The convex polygon `d` (straight edges only) shrunk by `dist` on every side,
// as path data: each edge moved inward, each corner where two moved edges
// meet. The same region a mask builds by stroking the outline 2*dist wide,
// so a clip can use it instead.
function insetConvexPolygon(d, dist){
  const v = [];
  pathVertices(d, (x, y)=>v.push({x, y}), ()=>{ throw new Error('insetConvexPolygon: straight edges only'); });
  if(v.length>1 && Math.hypot(v[0].x-v[v.length-1].x, v[0].y-v[v.length-1].y)<1e-9) v.pop();
  const n = v.length;
  let area = 0;
  for(let i=0;i<n;i++){ const a = v[i], b = v[(i+1)%n]; area += a.x*b.y - b.x*a.y; }
  const side = area>0 ? 1 : -1; // which normal points inside
  const lines = v.map((a, i)=>{ // each edge's line, moved inward: point and unit direction
    const b = v[(i+1)%n], len = Math.hypot(b.x-a.x, b.y-a.y), ex = (b.x-a.x)/len, ey = (b.y-a.y)/len;
    return {x: a.x - side*ey*dist, y: a.y + side*ex*dist, ex, ey};
  });
  const pts = lines.map((l, i)=>{ // where the previous edge's line meets this one's
    const p = lines[(i-1+n)%n], den = p.ex*l.ey - p.ey*l.ex;
    const t = ((l.x-p.x)*l.ey - (l.y-p.y)*l.ex)/den;
    return {x: p.x + p.ex*t, y: p.y + p.ey*t};
  });
  return 'M' + pts.map(q=>`${q.x} ${q.y}`).join('L') + 'Z';
}
function clipTo(node, inside, outsides = []){
  const clips = [];
  if(inside) clips.push(`path('${inside}') view-box`);
  outsides.forEach(d=>clips.push(`path(evenodd, '${CLIP_EVERYWHERE}${d}') view-box`));
  let out = node;
  clips.forEach((clip, i)=>{
    if(i>0){ const wrap = el('g',{}); wrap.appendChild(out); out = wrap; }
    out.style.clipPath = clip;
  });
  return out;
}

/* Kato N Unitrack: roadbed 25mm wide, 9mm track gauge. */
// The interface font, as the page's own; text drawn on the canvas uses it too.
const UI_FONT = "'Segoe UI',system-ui,-apple-system,sans-serif";
const ROADBED_W = 25;
const GAUGE = 9;
const RAIL_OFF = GAUGE/2;      // each rail 4.5mm either side of the centreline
const ROADBED_HALF = ROADBED_W/2;

// Turntable pit ring: Φ160 inner, Φ217 outer. Shared by the ring drawing, the
// wedge and ring-snap, which must agree exactly.
const TURNTABLE_INNER_R = 160/2;
const TURNTABLE_OUTER_R = 217/2;
// How far the wedge's outer tracks sit in from its roadbed edges, so their
// rails don't overhang. findRingSnapTarget adds the same margin so the roadbed
// lands flush on the ring.
const TURNTABLE_WEDGE_MARGIN = 5;
// Roundhouse inside radius (Kato's roundhouse diagram, Φ496). The gap from
// TURNTABLE_OUTER_R to here equals S140D's 139.5mm, which confirms it.
const ROUNDHOUSE_INNER_R = 496/2;

// Point at sweep angle tDeg on a circle of radius Rc concentric with a curve of
// centreline radius R. Rc=R gives the centreline (see curveEnd).
function offsetArcPoint(R, hand, tDeg, Rc){
  const t = tDeg*Math.PI/180;
  return hand==='L'
    ? {x:Rc*Math.sin(t), y:R - Rc*Math.cos(t)}
    : {x:Rc*Math.sin(t), y:Rc*Math.cos(t) - R};
}
function offsetArcPathD(R, angle, hand, Rc){
  const s = offsetArcPoint(R,hand,0,Rc);
  const e = offsetArcPoint(R,hand,angle,Rc);
  const sweep = hand==='L' ? 1:0;
  return `M${s.x},${s.y} A${Rc},${Rc} 0 0,${sweep} ${e.x},${e.y}`;
}
// Annular band between two radii (the asymmetric form of wideCurveRoadbedD),
// for viaduct arc shoulders.
function annularBandD(R, angle, hand, rInner, rOuter){
  const sweep = hand==='L' ? 1:0;
  const oOuter = offsetArcPoint(R,hand,0,rOuter);
  const eOuter = offsetArcPoint(R,hand,angle,rOuter);
  const eInner = offsetArcPoint(R,hand,angle,rInner);
  const oInner = offsetArcPoint(R,hand,0,rInner);
  return `M${oOuter.x},${oOuter.y} A${rOuter},${rOuter} 0 0,${sweep} ${eOuter.x},${eOuter.y} `+
         `L${eInner.x},${eInner.y} A${rInner},${rInner} 0 0,${1-sweep} ${oInner.x},${oInner.y} Z`;
}
// Annular-sector roadbed spanning `halfWidth` either side of the centreline
// radius. Double-track curves pass a wider half-width so one roadbed covers
// both tracks.
function wideCurveRoadbedD(R, angle, hand, halfWidth = ROADBED_HALF){
  return annularBandD(R, angle, hand, R-halfWidth, R+halfWidth);
}

// cutEnd recess depth (20-045), proportioned from a photo; the roadbed is
// thinned there and the rails stop.
const CUT_END_TRIM = 9;
const FISHPLATE_LEN = 7.8; // mm, along the rail
const FISHPLATE_W = 3.6;   // mm, across the rail (the rail stroke is 0.9mm)

// S60L/S60R: one roadbed edge tapers to WEDGE_NARROW_W at port 1 so the piece
// can sit against a turnout's other route. Rails run full length. The taper is
// defined by its angle, the one dimension measured reliably.
const WEDGE_TAPER_ANGLE = 15; // degrees, off the roadbed's long axis
// Narrow edge on the rail centreline; the measured 20mm left it visibly proud.
const WEDGE_NARROW_W = ROADBED_HALF + RAIL_OFF; // mm, roadbed width at the narrow end
// Roadbed stops WEDGE_END_TRIM short of the end (checked against the part),
// leaving bare rail.
const WEDGE_END_TRIM = 3.5; // mm
// wedgeSide: 'L' trims the +y edge, 'R' the -y edge (checked against the real
// parts).
function wedgeRoadbedD(L, wedgeSide){
  const H = ROADBED_HALF, Wn = WEDGE_NARROW_W;
  // Only the tapered side is shortened; a shelf under the tapered rail
  // continues to the end.
  const Lr = L - WEDGE_END_TRIM; // end of the taper, start of the shelf
  const lateralDrop = ROADBED_W - Wn;
  const taperRun = lateralDrop / Math.tan(WEDGE_TAPER_ANGLE * Math.PI / 180);
  const T = Lr - taperRun;
  return wedgeSide==='L'
    ? `M0,${-H} L${L},${-H} L${L},${-H+Wn} L${Lr},${-H+Wn} L${T},${H} L0,${H} Z`
    : `M0,${-H} L${T},${-H} L${Lr},${H-Wn} L${L},${H-Wn} L${L},${H} L0,${H} Z`;
}
// Double crossover: 310mm, 33mm spacing, points `leadIn` (31mm) from each end,
// measured from the part. The diagonal's radius isn't published, so it's
// derived: a symmetric reverse curve that starts and ends parallel is fully
// determined by its run and offset.
function crossoverGeometry(crossLen, spacing){
  const halfL = crossLen/2, halfOffset = spacing/2;
  const halfAngle = Math.atan(halfOffset/halfL); // = θ/2, since tan(θ/2) = Y/X for a symmetric reverse curve
  const angle = halfAngle*2*180/Math.PI; // deg
  const R = halfL / Math.sin(halfAngle*2);
  return {R, angle};
}
// One diagonal route's rail path across the crossing zone, mirrored for hand
// 'R'. `side` (±1) picks a rail. Each arc takes its own offset radius, because
// which radius is inner flips at the inflection; one shared offset pinches the
// rails.
function crossoverSideRc(R, hand, side){
  // side=+1 is left of travel, which offsetArcPoint puts at R−RAIL_OFF for 'L'
  // but R+RAIL_OFF for 'R'.
  return hand==='L' ? R - side*RAIL_OFF : R + side*RAIL_OFF;
}
// yShift: non-zero for the widener, whose curving track is off-centre.
function crossoverDiagonalD(crossLen, spacing, hand, side, xOffset, yShift=0){
  const {R, angle} = crossoverGeometry(crossLen, spacing);
  const oppHand = hand==='L' ? 'R' : 'L';
  const Rc1 = crossoverSideRc(R, hand, side);
  const Rc2 = crossoverSideRc(R, oppHand, side);
  const base = {x:xOffset, y: (hand==='L' ? -spacing/2 : spacing/2) + yShift};
  const p0local = offsetArcPoint(R, hand, 0, Rc1);
  const start = {x:base.x+p0local.x, y:base.y+p0local.y};
  const p1local = offsetArcPoint(R, hand, angle, Rc1);
  const p1 = {x:base.x+p1local.x, y:base.y+p1local.y};
  const centerlineP1local = offsetArcPoint(R, hand, angle, R);
  const centerlineP1 = {x:base.x+centerlineP1local.x, y:base.y+centerlineP1local.y};
  const headingAtP1 = hand==='L' ? angle : -angle;
  const p2local = offsetArcPoint(R, oppHand, angle, Rc2);
  const p2 = worldPoint({ox:centerlineP1.x, oy:centerlineP1.y, rot:headingAtP1}, p2local);
  const sweep1 = hand==='L' ? 1 : 0;
  const sweep2 = oppHand==='L' ? 1 : 0;
  return `M${start.x},${start.y} A${Rc1},${Rc1} 0 0,${sweep1} ${p1.x},${p1.y} `+
         `A${Rc2},${Rc2} 0 0,${sweep2} ${p2.x},${p2.y}`;
}
// The widener's curving track as a path: `total` length, and `at(s)`, the
// centreline point and heading `s` along it from port 1. Two arcs of radius R,
// as crossoverDiagonalD draws them.
function widenerCurveFrame(type){
  const delta = type.spacingFar - type.spacingNear, sign = type.hand==='L' ? 1 : -1;
  return sCurveFrame(type.length, delta, type.hand, (type.hand==='L' ? -delta/2 : delta/2) + sign*delta);
}
// A track's S-curve of lateral change `delta` over `L`, starting at y0: `total`
// length, and `at(s)`, the centreline point and heading `s` along it.
function sCurveFrame(L, delta, hand, y0){
  const opp = hand==='L' ? 'R' : 'L';
  const {R, angle} = crossoverGeometry(L, delta);
  const base = {x:0, y:y0};
  const mid = offsetArcPoint(R, hand, angle, R), hMid = hand==='L' ? angle : -angle;
  const frame2 = {ox:base.x+mid.x, oy:base.y+mid.y, rot:hMid};
  const arc = R*angle*Math.PI/180;
  return {total:2*arc, at(s){
    if(s <= arc){
      const t = s/R*180/Math.PI, q = offsetArcPoint(R, hand, t, R);
      return {x:base.x+q.x, y:base.y+q.y, heading: hand==='L' ? t : -t};
    }
    const t = (s-arc)/R*180/Math.PI, q = worldPoint(frame2, offsetArcPoint(R, opp, t, R));
    return {x:q.x, y:q.y, heading: hMid + (opp==='L' ? t : -t)};
  }};
}
// The conversion track's two tracks: each moves `d` towards the centreline,
// the -y one as a hand 'L' S-curve, the +y one as an 'R'. `shift` is
// crossoverDiagonalD's yShift.
function taperTracks(type){
  const d = (type.spacingNear - type.spacingFar)/2, h = type.spacingNear/2;
  return [{hand:'L', y0:-h, d, shift:-h + d/2}, {hand:'R', y0:h, d, shift:h - d/2}];
}
// Widener roadbed: from the straight track's outer edge to the curving track's
// outer edge. Which offset edge is outer flips with hand, so pick by distance
// from the straight track.
function widenerRoadbedD(type){
  const L = type.length, half = type.spacingNear/2;
  const sign = type.hand==='L' ? 1 : -1;
  const yStraight = -sign*half;
  const delta = type.spacingFar - type.spacingNear;
  const yShift = sign*delta;
  const hand = type.hand, oppHand = hand==='L' ? 'R' : 'L';
  const {R, angle} = crossoverGeometry(L, delta);
  const rcOf = (h, off) => h==='L' ? R-off : R+off;
  const base = {x:0, y:(hand==='L' ? -delta/2 : delta/2)+yShift};
  const pt = (h,Rc,t) => { const l=offsetArcPoint(R,h,t,Rc); return {x:base.x+l.x, y:base.y+l.y}; };
  const candA = pt(hand, rcOf(hand, ROADBED_HALF), 0);
  const candB = pt(hand, rcOf(hand, -ROADBED_HALF), 0);
  const farOff = Math.abs(candA.y - yStraight) > Math.abs(candB.y - yStraight) ? ROADBED_HALF : -ROADBED_HALF;
  const RcFar1 = rcOf(hand, farOff), RcFar2 = rcOf(oppHand, farOff);
  const farStart = pt(hand, RcFar1, 0);
  const farMid = pt(hand, RcFar1, angle);
  const centerMid = pt(hand, R, angle);
  const headingAtMid = hand==='L' ? angle : -angle;
  const frame2 = {ox:centerMid.x, oy:centerMid.y, rot:headingAtMid};
  const farEnd = worldPoint(frame2, offsetArcPoint(R, oppHand, angle, RcFar2));
  const sweep1 = hand==='L' ? 1 : 0, sweep2 = oppHand==='L' ? 1 : 0;
  const straightOuterY = yStraight - sign*ROADBED_HALF;
  return `M0,${straightOuterY} L${L},${straightOuterY} L${farEnd.x},${farEnd.y} `+
         `A${RcFar2},${RcFar2} 0 0,${1-sweep2} ${farMid.x},${farMid.y} `+
         `A${RcFar1},${RcFar1} 0 0,${1-sweep1} ${farStart.x},${farStart.y} Z`;
}
// The 15° crossing's angled route: built unrotated, then placed with
// worldPoint.
function rotatedStraightSeg(L, cx, cy, rotDeg){
  const H = ROADBED_HALF, h = L/2;
  const place = (x,y) => worldPoint({ox:cx, oy:cy, rot:rotDeg}, {x,y});
  const c = [place(-h,-H), place(h,-H), place(h,H), place(-h,H)];
  const roadbed = `M${c[0].x},${c[0].y} L${c[1].x},${c[1].y} L${c[2].x},${c[2].y} L${c[3].x},${c[3].y} Z`;
  const r0a = place(-h,-RAIL_OFF), r0b = place(h,-RAIL_OFF);
  const r1a = place(-h,RAIL_OFF), r1b = place(h,RAIL_OFF);
  return {
    roadbed,
    rails: [`M${r0a.x},${r0a.y} L${r0b.x},${r0b.y}`, `M${r1a.x},${r1a.y} L${r1b.x},${r1b.y}`],
  };
}
// Turnout diverging route (or wye branch): an arc then a straight `tail`. With
// divergeEnd, the unique arc-plus-tail that leaves the throat straight and
// meets the port at exactly divergeAngle, so there's no kink (#6: R≈711.2 +
// ≈2.0mm; #4: R≈474.1 + ≈1.3mm). From x = R·sinθ + t·cosθ, y = R(1−cosθ) +
// t·sinθ.
function turnoutDivergeShape(type){
  if(!type.divergeEnd) return {R:type.divergeRadius, angle:type.divergeAngle, tail:0};
  const th = type.divergeAngle*Math.PI/180, c = Math.cos(th), s = Math.sin(th), det = 1-c;
  const {x, y} = type.divergeEnd;
  return {R:(x*s - y*c)/det, angle:type.divergeAngle, tail:(y*s - x*det)/det};
}
// An arc path extended by a straight `tail` along its end heading.
function arcTailRailD(R, angle, hand, Rc, tail){
  const d = offsetArcPathD(R, angle, hand, Rc);
  if(!tail) return d;
  const e = offsetArcPoint(R, hand, angle, Rc), h = (hand==='L'?angle:-angle)*Math.PI/180;
  return `${d} L${e.x+tail*Math.cos(h)},${e.y+tail*Math.sin(h)}`;
}
function arcTailRoadbedD(R, angle, hand, tail){
  if(!tail) return wideCurveRoadbedD(R, angle, hand);
  const sweep = hand==='L' ? 1:0, h = (hand==='L'?angle:-angle)*Math.PI/180;
  const ext = p => ({x:p.x+tail*Math.cos(h), y:p.y+tail*Math.sin(h)});
  const oOuter = offsetArcPoint(R,hand,0,R+ROADBED_HALF), eOuter = offsetArcPoint(R,hand,angle,R+ROADBED_HALF);
  const oInner = offsetArcPoint(R,hand,0,R-ROADBED_HALF), eInner = offsetArcPoint(R,hand,angle,R-ROADBED_HALF);
  const tOuter = ext(eOuter), tInner = ext(eInner);
  return `M${oOuter.x},${oOuter.y} A${R+ROADBED_HALF},${R+ROADBED_HALF} 0 0,${sweep} ${eOuter.x},${eOuter.y} `+
         `L${tOuter.x},${tOuter.y} L${tInner.x},${tInner.y} L${eInner.x},${eInner.y} `+
         `A${R-ROADBED_HALF},${R-ROADBED_HALF} 0 0,${1-sweep} ${oInner.x},${oInner.y} Z`;
}
