// A type's drawable geometry in local coords: segments of roadbed path plus
// rail paths, optionally a cut-end overlay and fishplate. Multi-route pieces
// return one segment per route; appendRoadbed draws overlaps seamlessly.
function pieceGraphics(type){
  let segs = _graphicsCache.get(type);
  if(!segs){ segs = deepFreeze(computePieceGraphics(type)); _graphicsCache.set(type, segs); }
  return segs;
}
// ==== Per-category geometry ====
// Everything that depends on a piece's `cat` lives in one entry here, so a new
// category is one self-contained addition:
//   ports(type)          local ports: {x, y, heading}, heading pointing away
//                        from the body; port 0 at x=0 heading 180
//   graphics(type)       drawable segments: roadbed fill path plus rail stroke
//                        paths (9mm gauge), optionally cutOverlay/fishplate.
//                        Multi-route pieces (turnouts, the wye, crossings)
//                        return one segment per route; appendRoadbed draws
//                        overlapping segments without seams
//   center(type)         the local point the piece rotates about
//   nominalLength(type)  port 0 → port 1 rail length (see pieceNominalLength)
// computePorts, computePieceGraphics, pieceCenterLocal and pieceNominalLength
// look entries up through trackCategory. The geometry suite checks every
// catalog `cat` has a complete entry.

// Four ports, one per corner, all straight ahead, `spacing` apart: the
// crossover and the double-track straight.
function fourCornerPorts(type){
  const h = type.spacing/2;
  return [
    {x:0,y:-h,heading:180},          // 0: near, near-side track
    {x:0,y:h,heading:180},           // 1: near, far-side track
    {x:type.length,y:-h,heading:0},  // 2: far, near-side track
    {x:type.length,y:h,heading:0},   // 3: far, far-side track
  ];
}
// Expansion track outline: two full-width halves joined by a narrower strip
// (measured from a photo), which shows once the halves pull apart.
const EXPANSION_STRIP_HALF = 8.75;
function expansionRoadbedD(L){
  const R = ROADBED_HALF, S = EXPANSION_STRIP_HALF, a = EXPANSION_HALF, b = L-EXPANSION_HALF;
  return `M0,${-R} L${a},${-R} L${a},${-S} L${b},${-S} L${b},${-R} L${L},${-R} L${L},${R} `
       + `L${b},${R} L${b},${S} L${a},${S} L${a},${R} L0,${R} Z`;
}
// A straight run's segment, also the through leg of a turnout.
function straightTrackSegment(type){
  const L = type.length!==undefined ? type.length : type.throughLength;
  // cutEnd 'far' recesses port 1, 'near' port 0. Visual only.
  const railX0 = type.cutEnd==='near' ? CUT_END_TRIM : 0;
  const railX1 = type.railLength!==undefined ? type.railLength : (type.cutEnd==='far' ? L-CUT_END_TRIM : L);
  const seg = {
    roadbed: type.wedgeSide
      ? wedgeRoadbedD(L, type.wedgeSide)
      : type.expansion ? expansionRoadbedD(L)
      : `M0,${-ROADBED_HALF} L${L},${-ROADBED_HALF} L${L},${ROADBED_HALF} L0,${ROADBED_HALF} Z`,
    // BUMPA/BUMPB have no rails (the bundled S62 carries them).
    rails: (type.deadEnd && type.railLength===undefined) ? [] : [`M${railX0},${-RAIL_OFF} L${railX1},${-RAIL_OFF}`, `M${railX0},${RAIL_OFF} L${railX1},${RAIL_OFF}`],
  };
  if(type.cutEnd){
    const x0 = type.cutEnd==='far' ? L-CUT_END_TRIM : 0;
    const x1 = type.cutEnd==='far' ? L : CUT_END_TRIM;
    seg.cutOverlay = `M${x0},${-ROADBED_HALF} L${x1},${-ROADBED_HALF} L${x1},${ROADBED_HALF} L${x0},${ROADBED_HALF} Z`;
    // on the +y rail, where it stops
    const fx = type.cutEnd==='far' ? railX1 : railX0;
    seg.fishplate = `M${fx-FISHPLATE_LEN/2},${RAIL_OFF-FISHPLATE_W/2} L${fx+FISHPLATE_LEN/2},${RAIL_OFF-FISHPLATE_W/2} L${fx+FISHPLATE_LEN/2},${RAIL_OFF+FISHPLATE_W/2} L${fx-FISHPLATE_LEN/2},${RAIL_OFF+FISHPLATE_W/2} Z`;
  }
  return seg;
}
// One curved route: arc of radius R through `angle`, then a straight `tail`.
function arcTrackSegment(R, A, hand, tail){
  return {
    roadbed: arcTailRoadbedD(R,A,hand,tail),
    rails:[arcTailRailD(R,A,hand,R-RAIL_OFF,tail), arcTailRailD(R,A,hand,R+RAIL_OFF,tail)],
  };
}
const midLengthCenter = type => ({x:type.length/2, y:0});

// R678-10L/R: the roadbed is fixed (S140D's trapezoid, out to
// ROUNDHOUSE_INNER_R) and the rails are built to reach it. The wide end's inner
// facet continues S140D's own straight wide edge, from the corner the two
// pieces share; the kink is where that line crosses this piece's centreline.
function turntableConnectorCurveKinkPoint(hand){
  const pit = {x:-TURNTABLE_OUTER_R, y:0};
  const m = TURNTABLE_WEDGE_MARGIN;
  const pt = (r,deg)=>{ const a=deg*Math.PI/180; return {x:pit.x+r*Math.cos(a), y:pit.y+r*Math.sin(a)}; };
  const sign = hand==='R' ? -1 : 1;
  const shared = pt(ROUNDHOUSE_INNER_R, sign*m);        // this piece's corner shared with S140D
  const otherFar = pt(ROUNDHOUSE_INNER_R, sign*(m+10)); // S140D's OTHER (far) corner
  const segx = otherFar.x-shared.x, segy = otherFar.y-shared.y;
  const t = -shared.y/segy; // where that line crosses y=0
  return {x: shared.x + t*segx, y: 0};
}
// R678-10L/R rails: a cubic Bezier, because an arc can't hit a given point AND
// heading at once. Target: the point on the fixed edge exactly TARGET_SPACING
// (33mm) from S140D's centreline, interpolated between the two distances below.
// Those were measured on attached pieces in the live app; don't re-derive them
// by hand (S140D sits at 170°, and hand derivations have been wrong twice).
const TURNTABLE_CONNECTOR_CURVE_EDGE_PERP_SHARED = 21.614624201419204;
const TURNTABLE_CONNECTOR_CURVE_EDGE_PERP_KINK = 43.56268882144995;
const TURNTABLE_CONNECTOR_CURVE_TARGET_SPACING = 33;
function turntableConnectorCurveTarget(hand, spacing){
  const pit = {x:-TURNTABLE_OUTER_R, y:0};
  const m = TURNTABLE_WEDGE_MARGIN;
  const sign = hand==='R' ? -1 : 1;
  const shared = (() => { const a=sign*m*Math.PI/180; return {x:pit.x+ROUNDHOUSE_INNER_R*Math.cos(a), y:pit.y+ROUNDHOUSE_INNER_R*Math.sin(a)}; })();
  const M = turntableConnectorCurveKinkPoint(hand);
  const sharedPerp = sign*TURNTABLE_CONNECTOR_CURVE_EDGE_PERP_SHARED;
  const kinkPerp = sign*TURNTABLE_CONNECTOR_CURVE_EDGE_PERP_KINK;
  const targetPerp = sign*spacing;
  const t = (targetPerp - sharedPerp) / (kinkPerp - sharedPerp);
  return {x: shared.x + t*(M.x-shared.x), y: shared.y + t*(M.y-shared.y)};
}
// Bezier for one rail (`off` = ±RAIL_OFF, 0 for centreline). Starts at the port
// heading 0°; ends parallel to S140D at this rail's own point on the fixed
// edge, found via turntableConnectorCurveTarget with spacing
// TARGET_SPACING∓RAIL_OFF. (A perpendicular offset from the centre target
// drifts off the edge, because the edge isn't perpendicular to travel.) Handles
// at a third of the chord: just a smooth curve, not a fitted arc.
function turntableConnectorCurveBezier(type, off){
  const spacing = TURNTABLE_CONNECTOR_CURVE_TARGET_SPACING + off*(type.hand==='R' ? 1 : -1);
  const target = turntableConnectorCurveTarget(type.hand, spacing);
  const endDeg = type.hand==='R' ? -type.angle : type.angle;
  const endR = endDeg*Math.PI/180;
  const P0 = {x:0, y:off};
  const P3 = {x:target.x, y:target.y};
  const hLen = Math.hypot(P3.x-P0.x, P3.y-P0.y)/3;
  const P1 = {x:P0.x+hLen, y:P0.y};
  const P2 = {x:P3.x-hLen*Math.cos(endR), y:P3.y-hLen*Math.sin(endR)};
  return `M${P0.x},${P0.y} C${P1.x},${P1.y} ${P2.x},${P2.y} ${P3.x},${P3.y}`;
}

// Where a platform's roof runs across it, back to front (y from the slab's
// centre line): an island's overhangs both sides, a one-sided piece's only +y,
// the side facing its track.
function platformRoofY(type){
  const h = type.width/2, over = (type.roofWidth || type.width) - type.width;
  return type.island ? [-h-over/2, h+over/2] : [-h, h+over];
}
// A curved island end's curved edge (PIE-2/3, PIE-4L/R), measured from KATO's
// views: the roadbed edge of a curve on the platform's side (`curveR`: the
// track's radius less the roadbed's half width), tangent to the straight edge's
// parallel at x = `curveFrom` and diverging towards the free end (x = 0); full
// width from there to the inner end. y at x, in the piece's own frame.
function platformCurveY(type, x){
  const R = type.curveR, s = Math.max(0, type.curveFrom - x);
  return type.curveEdge * (type.width/2 - (R - Math.sqrt(R*R - s*s)));
}
// The curved end's outline: the free end's last PLATFORM_END_LEN mm 1 mm in
// all round, as on the other ends.
function platformCurvedOutline(type){
  const L = type.length, h = type.width/2, f = type.curveEdge, n = PLATFORM_END_INSET, e = PLATFORM_END_LEN, yt = -f*h;
  const pts = [[0, yt+f*n], [e, yt+f*n], [e, yt], [L, yt], [L, f*h]];
  for(let x=L-4; x>e; x-=4) if(x < type.curveFrom + 4) pts.push([x, platformCurveY(type, x)]);
  pts.push([e, platformCurveY(type, e)]);
  for(let x=e; x>=0; x-=5) pts.push([x, platformCurveY(type, x) - f*n]);
  pts.push([0, platformCurveY(type, 0) - f*n]);
  return pts;
}
// Unitram plates are 62mm wide, from KATO's drawings: wider than double track.
const TRAM_HALF = 31;
const TRAM_KERB_W = 5; // its outer strips, from KATO's photos
const TRAM_PANEL = 7.75; // the paving panels' length, about; a piece holds a whole number
const TRAM_SEAM_COLOR = 'rgba(40,46,56,0.35)';
// The Unitram street curves' centreline is R180: a run straight on, then 45° on
// the arc. The tracks sit 25mm apart about it at the straight end and 33mm
// (Unitrack's spacing) at the 45° end, each a straight run and one arc that
// fits those two ends. Coordinates here: u along the straight end's direction,
// v across it towards the inside of the curve (+v is +y on a right-hand piece,
// which on screen turns right, the way KATO's name means it). KATO's drawings
// give the plate: 62mm wide about the centreline, 186mm long on the outside and
// square-cornered there. An `arc` is {c, vc, r, R}: straight along v = vc-r up
// to u = c, then radius r about (c, vc), ending on u+v = c+vc; R is its track's.
const TWR_RADIUS = 180, TWR_PLATE_HALF = TRAM_HALF, TWR_PLATE_LEN = 186, TWR_SPACING_FAR = 33;
const TWR_SPINE_RUN = TWR_PLATE_LEN + TWR_PLATE_HALF - TWR_RADIUS;
const TWR_PLATE_INNER = {c:TWR_SPINE_RUN, vc:TWR_RADIUS, r:TWR_RADIUS - TWR_PLATE_HALF};
const twrSign = type=>type.hand==='R' ? 1 : -1;
// The arc `d` outside (+) or inside (-) the track starting at v = v0 (0: the centreline).
function twrArc(v0, d = 0){
  const S = Math.SQRT1_2, off = Math.sign(v0)*TWR_SPACING_FAR/2*S;
  const eu = TWR_SPINE_RUN + TWR_RADIUS*S - off, ev = TWR_RADIUS*(1 - S) + off;
  const R = (ev - v0)/(1 - S);
  return {c:eu - R*S, vc:v0 + R, r:R + d, R};
}
const twrEnd = a=>({u:a.c + a.r*Math.SQRT1_2, v:a.vc - a.r*Math.SQRT1_2});
// The point `s` along an arc's own track, measured on the track's radius.
function twrPoint(a, s){
  const t = Math.max(0, s - a.c)/a.R;
  return {u:Math.min(s, a.c) + a.r*Math.sin(t), v:a.vc - a.r*Math.cos(t)};
}
const twrTrackLen = a=>a.c + a.R*Math.PI/4;
// Path pieces along an arc from the straight end to the 45° end (`back`: the
// reverse, to close an outline).
function twrArcD(a, sign, back){
  const y0 = sign*(a.vc - a.r), e = twrEnd(a), sweep = sign>0 ? 1 : 0;
  return back
    ? `L${e.u} ${sign*e.v}A${a.r} ${a.r} 0 0 ${1-sweep} ${a.c} ${y0}L0 ${y0}`
    : `M0 ${y0}L${a.c} ${y0}A${a.r} ${a.r} 0 0 ${sweep} ${e.u} ${sign*e.v}`;
}
// The road plate's outline: a square corner, and the street curves' inner edge.
function roadPlateD(){
  const L = TWR_PLATE_LEN, c = TWR_PLATE_INNER.c, r = TWR_PLATE_INNER.r;
  return `M0 0H${L}V${-c}A${r} ${r} 0 0 0 ${c} ${-L}H0Z`;
}
// The plate's outline, the street curves' and street turnouts' alike.
const twrPlateD = sign=>`M0 ${-sign*TWR_PLATE_HALF}L${TWR_PLATE_LEN} ${-sign*TWR_PLATE_HALF}L${TWR_PLATE_LEN} ${sign*TWR_PLATE_HALF}${twrArcD(TWR_PLATE_INNER, sign, true)}Z`;
const TRACK_CATEGORIES = {
  straight: {
    // A dead end has no far port. Everything iterates getPorts(), so one-port
    // pieces need no special cases.
    ports: type => type.deadEnd
      ? [{x:0,y:0,heading:180}]
      : [{x:0,y:0,heading:180}, {x:type.length,y:0,heading:0}],
    graphics: type => [straightTrackSegment(type)],
    center: midLengthCenter,
    nominalLength: type => type.length,
  },

  curve: {
    ports: type => {
      const e = curveEnd(type.radius,type.angle,type.hand);
      return [
        {x:0,y:0,heading:180},
        {x:e.x,y:e.y,heading:e.heading},
      ];
    },
    graphics: type => [arcTrackSegment(type.radius, type.angle, type.hand, 0)],
    // The half-sweep point.
    center: type => { const e = curveEnd(type.radius, type.angle/2, type.hand); return {x:e.x, y:e.y}; },
    nominalLength: type => type.radius * type.angle * Math.PI/180,
  },

  turnout: {
    // Turnout hand is inverted relative to curveEnd so an R turnout diverges
    // right of travel (+y), as the real parts do. `hand` is internal geometry;
    // Kato's L/R comes from partCode/labelHand. The same inversion is in
    // `graphics` below: keep them in lock-step.
    ports: type => {
      const e = type.divergeEnd
        ? {x:type.divergeEnd.x, y:(type.hand==='R'?1:-1)*type.divergeEnd.y, heading:(type.hand==='R'?1:-1)*type.divergeAngle}
        : curveEnd(type.divergeRadius,type.divergeAngle, type.hand==='L'?'R':'L');
      return [
        {x:0,y:0,heading:180},                 // 0: throat
        {x:type.throughLength,y:0,heading:0},  // 1: through
        {x:e.x,y:e.y,heading:e.heading},       // 2: diverging
      ];
    },
    graphics: type => {
      const {R, angle:A, tail} = turnoutDivergeShape(type);
      return [straightTrackSegment(type), arcTrackSegment(R, A, type.hand==='L'?'R':'L', tail)];
    },
    // The middle of the through leg.
    center: type => ({x:type.throughLength/2, y:0}),
    // The through route, which wins over the longer diverging leg.
    nominalLength: type => type.throughLength,
  },

  wye: {
    // Wye: two identical curves diverging from one throat. Port 1 left branch,
    // port 2 right (curveEnd's convention). Branch ends from `divergeEnd` when
    // present.
    ports: type => {
      const g = type.divergeEnd;
      const eL = g ? {x:g.x, y:g.y, heading:type.divergeAngle} : curveEnd(type.divergeRadius,type.divergeAngle,'L');
      const eR = g ? {x:g.x, y:-g.y, heading:-type.divergeAngle} : curveEnd(type.divergeRadius,type.divergeAngle,'R');
      return [
        {x:0,y:0,heading:180},           // 0: throat
        {x:eL.x,y:eL.y,heading:eL.heading}, // 1: left branch
        {x:eR.x,y:eR.y,heading:eR.heading}, // 2: right branch
      ];
    },
    // One segment per branch from a shared throat; appendRoadbed handles the
    // overlap.
    graphics: type => {
      const {R, angle:A, tail} = turnoutDivergeShape(type);
      return ['L','R'].map(hand=>arcTrackSegment(R, A, hand, tail));
    },
    // The two half-sweep points mirror, so their average is on the centreline.
    center: type => { const e = curveEnd(type.divergeRadius, type.divergeAngle/2, 'L'); return {x:e.x, y:0}; },
    nominalLength: type => type.divergeRadius * type.divergeAngle * Math.PI/180,
  },

  crossover: {
    // Ports come from the length/spacing envelope only; the diagonal shape
    // affects drawing only.
    ports: fourCornerPorts,
    // One roadbed for both tracks (one moulding). Through rails full length,
    // diagonals across the middle zone only.
    graphics: type => {
      const L = type.length, S = type.spacing, H = S/2 + ROADBED_HALF;
      const leadIn = type.leadIn, crossLen = L - 2*leadIn;
      return [{
        roadbed: `M0,${-H} L${L},${-H} L${L},${H} L0,${H} Z`,
        rails:[
          // near-side through route (y=-S/2)
          `M0,${-S/2-RAIL_OFF} L${L},${-S/2-RAIL_OFF}`,
          `M0,${-S/2+RAIL_OFF} L${L},${-S/2+RAIL_OFF}`,
          // far-side through route (y=+S/2)
          `M0,${S/2-RAIL_OFF} L${L},${S/2-RAIL_OFF}`,
          `M0,${S/2+RAIL_OFF} L${L},${S/2+RAIL_OFF}`,
          // Diagonals: a single crossover has `hand` and one, the double
          // crossover both.
          ...(type.hand
            ? [crossoverDiagonalD(crossLen,S,type.hand,1,leadIn),
               crossoverDiagonalD(crossLen,S,type.hand,-1,leadIn)]
            : [crossoverDiagonalD(crossLen,S,'L',1,leadIn),
               crossoverDiagonalD(crossLen,S,'L',-1,leadIn),
               crossoverDiagonalD(crossLen,S,'R',1,leadIn),
               crossoverDiagonalD(crossLen,S,'R',-1,leadIn)]),
        ],
      }];
    },
    center: midLengthCenter,
    nominalLength: type => type.length,
  },

  crossing: {
    ports: type => {
      if(type.diagonalOffset!==undefined){
        // X15: ports 0/1 straight route, 2/3 diagonal, ends flush with the
        // straight's and ±diagonalOffset from it (+y for R). Ports keep 15°;
        // the chord is 0.1° shallower, Kato's rounding in 49.5mm.
        const s = type.hand==='R' ? 1 : -1;
        return [
          {x:0,y:0,heading:180},
          {x:type.length,y:0,heading:0},
          {x:type.length, y:s*type.diagonalOffset, heading:s*type.crossAngle},
          {x:0, y:-s*type.diagonalOffset, heading:s*type.crossAngle+180},
        ];
      }
      // X90: two equal straight routes through the centre, the second rotated
      // by `crossAngle`. Ports 0/1 first route, 2/3 second.
      const half = type.length/2;
      const a = (type.hand==='L' ? type.crossAngle : -type.crossAngle) * Math.PI/180;
      return [
        {x:0,y:0,heading:180},
        {x:type.length,y:0,heading:0},
        {x:half+half*Math.cos(a), y:half*Math.sin(a), heading:(type.hand==='L'?type.crossAngle:-type.crossAngle)},
        {x:half-half*Math.cos(a), y:-half*Math.sin(a), heading:(type.hand==='L'?type.crossAngle:-type.crossAngle)+180},
      ];
    },
    // Two straights through the centre; appendRoadbed handles the seam. The X15
    // diagonal follows its port-to-port chord so the drawing ends at the ports.
    graphics: type => {
      const L = type.length;
      const P = getPorts(type);
      const angle = type.diagonalOffset!==undefined
        ? Math.atan2(P[2].y-P[3].y, P[2].x-P[3].x)*180/Math.PI
        : (type.hand==='L' ? type.crossAngle : -type.crossAngle);
      const diagLen = Math.hypot(P[2].x-P[3].x, P[2].y-P[3].y);
      return [
        {
          roadbed: `M0,${-ROADBED_HALF} L${L},${-ROADBED_HALF} L${L},${ROADBED_HALF} L0,${ROADBED_HALF} Z`,
          rails: [`M0,${-RAIL_OFF} L${L},${-RAIL_OFF}`, `M0,${RAIL_OFF} L${L},${RAIL_OFF}`],
        },
        rotatedStraightSeg(diagLen, L/2, 0, angle),
      ];
    },
    center: midLengthCenter,
    nominalLength: type => type.length,
  },

  widener: {
    // Ports 0/2 straight track, 1/3 the track reverse-curving from spacingNear
    // to spacingFar. hand 'L' puts the straight track at -y.
    ports: type => {
      const half = type.spacingNear/2;
      const sign = type.hand==='L' ? 1 : -1;
      const yStraight = -sign*half;
      const yCurveNear = sign*half;
      const yCurveFar = sign*(type.spacingFar - half);
      return [
        {x:0,y:yStraight,heading:180},           // 0: straight track, near
        {x:0,y:yCurveNear,heading:180},          // 1: curving track, near
        {x:type.length,y:yStraight,heading:0},   // 2: straight track, far
        {x:type.length,y:yCurveFar,heading:0},   // 3: curving track, far
      ];
    },
    graphics: type => {
      const L = type.length, half = type.spacingNear/2;
      const sign = type.hand==='L' ? 1 : -1;
      const yStraight = -sign*half;
      const delta = type.spacingFar - type.spacingNear; // total lateral growth
      const yShift = sign*delta;
      const curveHand = type.hand;
      return [{
        roadbed: widenerRoadbedD(type),
        rails: [
          `M0,${yStraight-RAIL_OFF} L${L},${yStraight-RAIL_OFF}`, `M0,${yStraight+RAIL_OFF} L${L},${yStraight+RAIL_OFF}`,
          crossoverDiagonalD(L, delta, curveHand, 1, 0, yShift), crossoverDiagonalD(L, delta, curveHand, -1, 0, yShift),
        ],
      }];
    },
    center: midLengthCenter,
    nominalLength: type => type.length,
  },

  taper: {
    // Unitram conversion: ports as a double straight's, the tracks 33mm apart
    // at x=0 and 25mm at x=L, each an S-curve square to both ends.
    ports: type => {
      const n = type.spacingNear/2, f = type.spacingFar/2;
      return [
        {x:0,y:-n,heading:180}, {x:0,y:n,heading:180},
        {x:type.length,y:-f,heading:0}, {x:type.length,y:f,heading:0},
      ];
    },
    graphics: type => {
      const L = type.length, H = TRAM_HALF;
      return [{
        roadbed: `M0,${-H} L${L},${-H} L${L},${H} L0,${H} Z`,
        rails: taperTracks(type).flatMap(t=>[1, -1].map(side=>crossoverDiagonalD(L, t.d, t.hand, side, 0, t.shift))),
      }];
    },
    center: midLengthCenter,
    nominalLength: type => type.length,
  },

  tram: {
    // Unitram street-track double straight: ports as a double straight's, the
    // tracks 25mm apart in a 62mm plate.
    ports: fourCornerPorts,
    graphics: type => {
      const L = type.length, S = type.spacing, H = TRAM_HALF;
      return [{
        roadbed: `M0,${-H} L${L},${-H} L${L},${H} L0,${H} Z`,
        rails: [-S/2, S/2].flatMap(c=>[c-RAIL_OFF, c+RAIL_OFF].map(y=>`M0,${y} L${L},${y}`)),
      }];
    },
    center: midLengthCenter,
    nominalLength: type => type.length,
  },

  tramcurve: {
    // Unitram street curve (see TWR_RADIUS). Port order as a double curve's:
    // near ends at -y and +y, then the same tracks' far ends.
    ports: type => {
      const sign = twrSign(type), h = type.spacing/2, tracks = [-sign*h, sign*h];
      return [
        ...tracks.map(v0=>({x:0, y:sign*v0, heading:180})),
        ...tracks.map(v0=>{ const e = twrEnd(twrArc(v0)); return {x:e.u, y:sign*e.v, heading:sign*45}; }),
      ];
    },
    graphics: type => {
      const sign = twrSign(type), h = type.spacing/2;
      return [{
        roadbed: twrPlateD(sign),
        rails: [-h, h].flatMap(v0=>[-RAIL_OFF, RAIL_OFF].map(d=>twrArcD(twrArc(v0, d), sign))),
      }];
    },
    // The spine's half-way point.
    center: type => {
      const p = twrPoint(twrArc(0), twrTrackLen(twrArc(0))/2);
      return {x:p.u, y:twrSign(type)*p.v};
    },
    // The spine's length: the mean of the two tracks'.
    nominalLength: () => twrTrackLen(twrArc(0)),
  },

  roadplate: {
    // Unitram road plates: the origin is the street corner's square corner, and
    // the plate runs to +x and -y, up to the street curves' inner edge. With a
    // `length` and `depth`, a plain rectangle.
    ports: () => [],
    graphics: type => [{roadbed: type.length ? `M0 0H${type.length}V${-type.depth}H0Z` : roadPlateD(), rails: []}],
    center: type => ({x:(type.length || TWR_PLATE_LEN)/2, y:-(type.depth || TWR_PLATE_LEN)/2}),
    nominalLength: () => 0,
  },

  tramcross: {
    // Unitram 90° crossing: ports 0-3 as a double straight's, 4-7 the same turned
    // 90° about the middle of the square, each track running straight through.
    ports: type => {
      const L = type.length, m = L/2, h = type.spacing/2;
      return [
        ...fourCornerPorts(type),
        {x:m-h, y:-m, heading:-90}, {x:m+h, y:-m, heading:-90},
        {x:m-h, y:m, heading:90}, {x:m+h, y:m, heading:90},
      ];
    },
    graphics: type => {
      const L = type.length, m = L/2, h = type.spacing/2;
      return [{
        roadbed: `M0 ${-m}H${L}V${m}H0Z`,
        rails: [-h, h].flatMap(c=>[c-RAIL_OFF, c+RAIL_OFF]).flatMap(o=>[`M0 ${o}H${L}`, `M${m+o} ${-m}V${m}`]),
      }];
    },
    center: midLengthCenter,
    nominalLength: type => type.length,
  },

  tramturnout: {
    // Unitram street turnout: both tracks carry straight on, 25mm apart, for the
    // plate's length, and each also leaves on its street curve's route. In the
    // street curve's plate. Ports 0/1 the throats, 2/3 the straight ends, 4/5
    // the diverging ends, each pair in track order (powerNets).
    ports: type => {
      const sign = twrSign(type), h = type.spacing/2, tracks = [-sign*h, sign*h];
      return [
        ...tracks.map(v0=>({x:0, y:sign*v0, heading:180})),
        ...tracks.map(v0=>({x:type.length, y:sign*v0, heading:0})),
        ...tracks.map(v0=>{ const e = twrEnd(twrArc(v0)); return {x:e.u, y:sign*e.v, heading:sign*45}; }),
      ];
    },
    graphics: type => {
      const sign = twrSign(type), h = type.spacing/2, L = type.length;
      return [{
        roadbed: twrPlateD(sign),
        rails: [-h, h].flatMap(v0=>[-RAIL_OFF, RAIL_OFF].flatMap(d=>[`M0 ${v0+d}H${L}`, twrArcD(twrArc(v0, d), sign)])),
      }];
    },
    center: midLengthCenter,
    nominalLength: type => type.length,
  },

  dcurve: {
    // Concentric arcs, each track ± half the radius gap from the centreline.
    // Banking isn't drawn; it only gates mating (isBankedPort).
    ports: type => {
      const Rcenter = (type.radiusInner + type.radiusOuter)/2;
      const pIn0 = offsetArcPoint(Rcenter, type.hand, 0, type.radiusInner);
      const pOut0 = offsetArcPoint(Rcenter, type.hand, 0, type.radiusOuter);
      const pInE = offsetArcPoint(Rcenter, type.hand, type.angle, type.radiusInner);
      const pOutE = offsetArcPoint(Rcenter, type.hand, type.angle, type.radiusOuter);
      const headingE = type.hand==='L' ? type.angle : -type.angle;
      return [
        {x:pIn0.x, y:pIn0.y, heading:180},     // 0: inner track, near
        {x:pOut0.x, y:pOut0.y, heading:180},   // 1: outer track, near
        {x:pInE.x, y:pInE.y, heading:headingE},   // 2: inner track, far
        {x:pOutE.x, y:pOutE.y, heading:headingE}, // 3: outer track, far
      ];
    },
    graphics: type => {
      const Rcenter = (type.radiusInner + type.radiusOuter)/2;
      const half = (type.radiusOuter - type.radiusInner)/2;
      return [{
        roadbed: wideCurveRoadbedD(Rcenter, type.angle, type.hand, half+ROADBED_HALF),
        rails: [
          offsetArcPathD(Rcenter, type.angle, type.hand, type.radiusInner-RAIL_OFF),
          offsetArcPathD(Rcenter, type.angle, type.hand, type.radiusInner+RAIL_OFF),
          offsetArcPathD(Rcenter, type.angle, type.hand, type.radiusOuter-RAIL_OFF),
          offsetArcPathD(Rcenter, type.angle, type.hand, type.radiusOuter+RAIL_OFF),
        ],
      }];
    },
    // The centreline's half-sweep point.
    center: type => {
      const Rcenter = (type.radiusInner + type.radiusOuter)/2;
      const e = curveEnd(Rcenter, type.angle/2, type.hand);
      return {x:e.x, y:e.y};
    },
    // Centreline arc length.
    nominalLength: type => (type.radiusInner+type.radiusOuter)/2 * type.angle * Math.PI/180,
  },

  // Turntable bridge: straight rails, roadbed ends arced at radius = half the
  // length so it rotates within the pit without catching. No ports; track joins
  // via the wedge's ring-snap. The pit and cabin wing are drawn by
  // appendTurntableRing/Wing.
  turntableBridge: {
    ports: type => [],
    graphics: type => {
      const L = type.length, half = L/2, R = half, roadHalf = ROADBED_HALF;
      const dx = Math.sqrt(Math.max(0, R*R - roadHalf*roadHalf));
      const leftX = half - dx, rightX = half + dx;
      const roadbed = `M0,0 A${R},${R} 0 0,0 ${leftX},${-roadHalf} L${rightX},${-roadHalf} `
        + `A${R},${R} 0 0,0 ${L},0 A${R},${R} 0 0,0 ${rightX},${roadHalf} `
        + `L${leftX},${roadHalf} A${R},${R} 0 0,0 0,0 Z`;
      return [{
        roadbed,
        rails: [`M0,${-RAIL_OFF} L${L},${-RAIL_OFF}`, `M0,${RAIL_OFF} L${L},${RAIL_OFF}`],
      }];
    },
    center: midLengthCenter,
    nominalLength: type => type.length,
  },

  // Turntable wedge: a 30° annular sector between the pit ring's radii, so it
  // tiles the ring's 12 divisions, carrying three tracks 10° apart. Ring-snaps
  // (findRingSnapTarget), so only the tracks' outer ends have ports. Local
  // frame: pit centre at (TURNTABLE_OUTER_R, 0), the 0° track's outer end at
  // the origin (port 0).
  turntableWedge: {
    ports: type => {
      const outerR = TURNTABLE_OUTER_R, pc = {x:outerR, y:0};
      return [0,10,20].map(deg=>{
        const a = deg*Math.PI/180;
        return {x: pc.x-outerR*Math.cos(a), y: pc.y+outerR*Math.sin(a), heading: (180-deg+360)%360};
      });
    },
    graphics: type => {
      const innerR = TURNTABLE_INNER_R, outerR = TURNTABLE_OUTER_R, pc = {x:outerR, y:0};
      const pt = (r,deg)=>{ const a=deg*Math.PI/180; return {x:pc.x-r*Math.cos(a), y:pc.y+r*Math.sin(a)}; };
      // The roadbed spans the ring's 30° division, extended
      // TURNTABLE_WEDGE_MARGIN either side so the 0°–20° tracks sit centred;
      // findRingSnapTarget adds the margin back.
      const m = TURNTABLE_WEDGE_MARGIN;
      const A=pt(outerR,-m), B=pt(outerR,20+m), C=pt(innerR,20+m), D=pt(innerR,-m);
      const roadbed = `M${A.x},${A.y} A${outerR},${outerR} 0 0,0 ${B.x},${B.y} `
        + `L${C.x},${C.y} A${innerR},${innerR} 0 0,1 ${D.x},${D.y} Z`;
      const rails = [];
      [0,10,20].forEach(deg=>{
        const a = deg*Math.PI/180, ox = Math.sin(a)*RAIL_OFF, oy = Math.cos(a)*RAIL_OFF;
        const inP = pt(innerR,deg), outP = pt(outerR,deg);
        rails.push(`M${inP.x+ox},${inP.y+oy} L${outP.x+ox},${outP.y+oy}`);
        rails.push(`M${inP.x-ox},${inP.y-oy} L${outP.x-ox},${outP.y-oy}`);
      });
      return [{roadbed, rails}];
    },
    // The 10° track's half-sweep point.
    center: type => {
      const outerR = TURNTABLE_OUTER_R, pc = {x:outerR, y:0};
      const a = 10*Math.PI/180, r = (TURNTABLE_INNER_R+outerR)/2;
      return {x: pc.x-r*Math.cos(a), y: pc.y+r*Math.sin(a)};
    },
    nominalLength: type => TURNTABLE_OUTER_R - TURNTABLE_INNER_R,
  },

  // S140D: a plain 2-port straight joined port-to-port to a wedge's outer port
  // (which already faces radially). Its roadbed is a trapezoid about the pit
  // centre, from TURNTABLE_OUTER_R to ROUNDHOUSE_INNER_R,
  // TURNTABLE_WEDGE_MARGIN either side of the track, so three fan out at 10°
  // and tile without gaps.
  turntableConnector: {
    // `deadEnd` removes the far port (the turntable bumper).
    ports: type => type.deadEnd
      ? [{x:0,y:0,heading:180}]
      : [{x:0,y:0,heading:180}, {x:type.length,y:0,heading:0}],
    graphics: type => {
      // Pit centre sits TURNTABLE_OUTER_R behind port 0.
      const pc = {x:-TURNTABLE_OUTER_R, y:0};
      const outerR = TURNTABLE_OUTER_R + type.length; // == ROUNDHOUSE_INNER_R
      const pt = (r,deg)=>{ const a=deg*Math.PI/180; return {x:pc.x+r*Math.cos(a), y:pc.y+r*Math.sin(a)}; };
      const m = TURNTABLE_WEDGE_MARGIN;
      // Wide end is a straight cut; C and D share an x, so it's perpendicular
      // to the track.
      const A=pt(TURNTABLE_OUTER_R,-m), B=pt(TURNTABLE_OUTER_R,m), C=pt(outerR,m), D=pt(outerR,-m);
      const roadbed = `M${A.x},${A.y} A${TURNTABLE_OUTER_R},${TURNTABLE_OUTER_R} 0 0,1 ${B.x},${B.y} `
        + `L${C.x},${C.y} L${D.x},${D.y} Z`;
      return [{
        roadbed,
        rails: [`M0,${-RAIL_OFF} L${type.length},${-RAIL_OFF}`, `M0,${RAIL_OFF} L${type.length},${RAIL_OFF}`],
      }];
    },
    center: midLengthCenter,
    nominalLength: type => type.length,
  },

  // R678-10L/R: roadbed is S140D's trapezoid except the wide end, faceted at
  // turntableConnectorCurveKinkPoint (Kato's box art). Rails:
  // turntableConnectorCurveBezier.
  turntableConnectorCurve: {
    ports: type => {
      const target = turntableConnectorCurveTarget(type.hand, TURNTABLE_CONNECTOR_CURVE_TARGET_SPACING);
      const endHeading = ((type.hand==='R' ? -type.angle : type.angle)+360)%360;
      return [{x:0,y:0,heading:180}, {x:target.x,y:target.y,heading:endHeading}];
    },
    graphics: type => {
      const pit = {x:-TURNTABLE_OUTER_R, y:0};
      const m = TURNTABLE_WEDGE_MARGIN;
      const pt = (r,deg)=>{ const a=deg*Math.PI/180; return {x:pit.x+r*Math.cos(a), y:pit.y+r*Math.sin(a)}; };
      const A=pt(TURNTABLE_OUTER_R,-m), B=pt(TURNTABLE_OUTER_R,m);
      const C=pt(ROUNDHOUSE_INNER_R,m), D=pt(ROUNDHOUSE_INNER_R,-m), M=turntableConnectorCurveKinkPoint(type.hand);
      const roadbed = `M${A.x},${A.y} A${TURNTABLE_OUTER_R},${TURNTABLE_OUTER_R} 0 0,1 ${B.x},${B.y} `
        + `L${C.x},${C.y} L${M.x},${M.y} L${D.x},${D.y} Z`;
      return [{
        roadbed,
        rails: [turntableConnectorCurveBezier(type, -RAIL_OFF),
                turntableConnectorCurveBezier(type, RAIL_OFF)],
      }];
    },
    center: type => { const target = turntableConnectorCurveTarget(type.hand, TURNTABLE_CONNECTOR_CURVE_TARGET_SPACING); return {x:target.x/2, y:target.y/2}; },
    nominalLength: type => { const target = turntableConnectorCurveTarget(type.hand, TURNTABLE_CONNECTOR_CURVE_TARGET_SPACING); return Math.hypot(target.x, target.y); },
  },

  // Platform: a plain slab, `length` along x and `width` across, centred on y=0.
  // No rails or track length; it joins platforms by its ports and sits beside
  // a straight by findPlatformSnapTarget.
  platform: {
    // End ports on the centre line, so only platforms join (portsCompatible). An
    // end piece has just its inner end: PSE-1's free end is at x=0, so its port
    // is at the far end, and PSE-2's the other way.
    ports: type => {
      const L = type.length, left = {x:0, y:0, heading:180}, right = {x:L, y:0, heading:0};
      return type.endAt==='start' ? [right] : type.endAt==='end' ? [left] : [left, right];
    },
    graphics: type => {
      // The roof's outline: the slab (centred on y=0) plus its overhang.
      const L = type.length, h = type.width/2, [h1, h2] = platformRoofY(type);
      if(type.curveEdge) return [{roadbed: 'M' + platformCurvedOutline(type).map(([x, y])=>`${x.toFixed(2)},${y.toFixed(2)}`).join(' L') + ' Z', rails: []}];
      if(type.endAt){
        // An end piece: its free end (`endAt`) steps in PLATFORM_END_INSET a side.
        const m = x=>type.endAt==='end' ? L-x : x, n = PLATFORM_END_INSET, e = PLATFORM_END_LEN;
        const pts = [[0,-(h-n)],[e,-(h-n)],[e,-h],[L,-h],[L,h],[e,h],[e,h-n],[0,h-n]];
        return [{roadbed: 'M' + pts.map(([x, y])=>`${m(x)},${y}`).join(' L') + ' Z', rails: []}];
      }
      return [{roadbed: `M0,${h1} L${L},${h1} L${L},${h2} L0,${h2} Z`, rails: []}];
    },
    center: midLengthCenter,
    nominalLength: type => 0,
  },

  dstraight: {
    ports: fourCornerPorts,
    graphics: type => {
      const L = type.length, S = type.spacing, H = S/2 + ROADBED_HALF;
      return [{
        roadbed: `M0,${-H} L${L},${-H} L${L},${H} L0,${H} Z`,
        rails:[
          `M0,${-S/2-RAIL_OFF} L${L},${-S/2-RAIL_OFF}`,
          `M0,${-S/2+RAIL_OFF} L${L},${-S/2+RAIL_OFF}`,
          `M0,${S/2-RAIL_OFF} L${L},${S/2-RAIL_OFF}`,
          `M0,${S/2+RAIL_OFF} L${L},${S/2+RAIL_OFF}`,
        ],
      }];
    },
    center: midLengthCenter,
    nominalLength: type => type.length,
  },
};

// An unknown `cat` is a programmer error: fail immediately, naming the piece
// and caller.
function trackCategory(type, caller){
  if(!Object.prototype.hasOwnProperty.call(TRACK_CATEGORIES, type.cat))
    throw new Error(`${caller}: unhandled cat '${type.cat}' on track type '${type.id}'`);
  return TRACK_CATEGORIES[type.cat];
}
function computePieceGraphics(type){
  // Logs rather than throws: this runs inside render, and the rest of the frame
  // should still draw.
  if(!Object.prototype.hasOwnProperty.call(TRACK_CATEGORIES, type.cat)){
    console.error(`computePieceGraphics: unhandled cat '${type.cat}' on track type '${type.id}' — piece will draw as nothing`);
    return [];
  }
  return TRACK_CATEGORIES[type.cat].graphics(type);
}

