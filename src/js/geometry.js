/* ============================================================
   GEOMETRY
   Local port model: each port is {x, y, heading}, heading pointing AWAY
   from the piece — the direction a piece attached there continues. Every
   piece's port 0 is at (0,0), heading 180.
   ============================================================ */
function curveEnd(R, angleDeg, hand){
  const a = angleDeg*Math.PI/180;
  const x = R*Math.sin(a);
  const y = R*(1-Math.cos(a));
  return hand==='L' ? {x, y, heading:angleDeg} : {x, y:-y, heading:-angleDeg};
}

// Level-select focus aid: 'ground' fades track as it rises (to 20% at
// ELEV_MAX_MM), 'elevated' fades ground track, 'all' fades nothing.
let focusedLevel = 'all'; // 'ground' | 'elevated' | 'all'
// Ceiling of the legal elevation range. Kept separate from GRADIENT_TARGET_MM
// (one gradient's climb).
const ELEV_MAX_MM = 50;
function elevOpacity(elev, level = focusedLevel){
  if(level==='all') return 1;
  const clamped = Math.max(0,Math.min(ELEV_MAX_MM,elev));
  const distanceFromFocus = level==='elevated' ? (ELEV_MAX_MM-clamped) : clamped;
  return 1 - 0.8*(distanceFromFocus/ELEV_MAX_MM);
}
// Elevation opacity for a piece's <g>. A sloped piece needs the fade to run
// within it, so it gets a per-piece gradient mask. Sides come from
// gradeablePortGroups (for double track, ports 0 and 1 share a side).
function applyElevationOpacity(g, piece, type, defs, level = focusedLevel){
  const ports = getPorts(type);
  const groups = gradeablePortGroups(type);
  const nearIdx = groups ? groups[0][0] : 0, farIdx = groups ? groups[1][0] : 0;
  const op0 = elevOpacity(piece.portElev[nearIdx]||0, level), op1 = elevOpacity(piece.portElev[farIdx]||0, level);
  if(op0===op1){
    g.setAttribute('opacity', op0);
    return;
  }
  const gradId = 'elevGrad-'+piece.id, maskId = 'elevMask-'+piece.id;
  // White stops with stop-opacity: luminance masking turns alpha into mask
  // visibility.
  const grad = el('linearGradient',{id:gradId, gradientUnits:'userSpaceOnUse',
    x1:ports[nearIdx].x, y1:ports[nearIdx].y, x2:ports[farIdx].x, y2:ports[farIdx].y});
  grad.appendChild(el('stop',{offset:'0', 'stop-color':'#ffffff', 'stop-opacity':op0}));
  grad.appendChild(el('stop',{offset:'1', 'stop-color':'#ffffff', 'stop-opacity':op1}));
  defs.appendChild(grad);
  // The <mask>'s own region must be set explicitly: the SVG default resolves
  // against the viewport and clips piece ends as the window shrinks.
  const mask = pieceMask(maskId);
  mask.appendChild(el('rect',{x:-1000, y:-1000, width:2000, height:2000, fill:`url(#${gradId})`}));
  defs.appendChild(mask);
  g.setAttribute('mask', `url(#${maskId})`);
}
// The ports sharing one elevation, as two sides (low, high), or null if the
// category can't be graded (turnouts, wyes, crossovers, crossings, wideners).
function gradeablePortGroups(type){
  // Dead-end bumpers are straights with ONE port; treating them as two-sided
  // makes them read as sloped and crashes the slope fill.
  const portCount = getPorts(type).length;
  if((type.cat==='straight' || type.cat==='curve') && portCount===2) return [[0],[1]];
  if((type.cat==='dstraight' || type.cat==='dcurve') && portCount===4) return [[0,1],[2,3]];
  return null;
}
// Sloped = its two sides differ. A flat-elevated piece is level even when it's
// above 0mm; non-gradeable pieces are never sloped.
function isSlopedPiece(piece, type){
  const groups = gradeablePortGroups(type);
  if(!groups) return false;
  return piece.portElev[groups[0][0]] !== piece.portElev[groups[1][0]];
}
// Slope fill: --slope-low at the bottom to --slope-high at the top (purple to
// pink unless the user picks others), mixed in CSS so a new pick repaints
// without a redraw.
// Colour against the whole slope group's range: per piece would stripe a climb,
// and the absolute scale would make fragments indistinguishable.
function slopeColorForElev(elev, range){
  const span = range ? (range.max-range.min) : GRADIENT_TARGET_MM;
  const base = range ? range.min : 0;
  const t = span>0 ? Math.max(0, Math.min(1, (elev-base)/span)) : 0;
  return `color-mix(in srgb, var(--slope-high) ${(t*100).toFixed(1)}%, var(--slope-low))`;
}
function buildSlopeFillGradient(piece, type, defs, range){
  const groups = gradeablePortGroups(type);
  const ports = getPorts(type);
  const sideAIdx = groups[0][0], sideBIdx = groups[1][0];
  const gradId = 'slopeFill-'+piece.id;
  const grad = el('linearGradient',{id:gradId, gradientUnits:'userSpaceOnUse',
    x1:ports[sideAIdx].x, y1:ports[sideAIdx].y, x2:ports[sideBIdx].x, y2:ports[sideBIdx].y});
  grad.appendChild(el('stop',{offset:'0', 'stop-color':slopeColorForElev(piece.portElev[sideAIdx], range)}));
  grad.appendChild(el('stop',{offset:'1', 'stop-color':slopeColorForElev(piece.portElev[sideBIdx], range)}));
  defs.appendChild(grad);
  return `url(#${gradId})`;
}
// The average of a piece's port heights: where it sits in the draw order and
// the PNG's.
const meanElev = p=>p.portElev.length ? p.portElev.reduce((s, e)=>s+e, 0)/p.portElev.length : 0; // a piece without ports is on the ground
// Above 0mm but level. A level piece has one elevation, so port 0 is
// representative.
function isFlatElevatedPiece(piece, type){
  if(isSlopedPiece(piece, type)) return false;
  return (piece.portElev[0]||0) > 0;
}
// Level and above ground: orange unless the user picks another (Settings).
// A custom property, so a new pick repaints without a redraw.
const ROADBED_FILL_ELEVATED_FLAT = 'var(--elev-flat)';
// Viaduct/bridge structure colours: an overlay, so the elevation colouring
// underneath still shows.
const VIADUCT_DECK_COLOR = '#9aa2ad';
const BRIDGE_STEEL_COLOR = '#33363c'; // overridden per type by `structureColor`
// Port 0 to port 1 path length, for the length stat and gradient maths:
// `length` or `throughLength` from the catalog, else radius × angle for arcs (a
// double-track curve's centreline).
function pieceNominalLength(type){
  return trackCategory(type, 'pieceNominalLength').nominalLength(type);
}
// Ports and graphics depend only on the type, so each is computed once. Frozen,
// so an accidental mutation throws instead of corrupting every piece of that
// type.
const _portsCache = new Map();
const _graphicsCache = new Map();
function deepFreeze(o){
  Object.values(o).forEach(v=>{ if(v && typeof v==='object') deepFreeze(v); });
  return Object.freeze(o);
}
function getPorts(type){
  let ports = _portsCache.get(type);
  if(!ports){ ports = deepFreeze(computePorts(type)); _portsCache.set(type, ports); }
  return ports;
}
function computePorts(type){
  return trackCategory(type, 'computePorts').ports(type);
}

// Rotation centre: half-sweep point for curves, middle of the through leg for
// turnouts.
function pieceCenterLocal(type){
  return trackCategory(type, 'pieceCenterLocal').center(type);
}

function deg2rad(d){return d*Math.PI/180;}
function worldPoint(piece, local){
  const r = deg2rad(piece.rot);
  const cos=Math.cos(r), sin=Math.sin(r);
  return {
    x: piece.ox + local.x*cos - local.y*sin,
    y: piece.oy + local.x*sin + local.y*cos,
  };
}
// Always [0, 360); a bare `% 360` keeps negatives negative.
function norm360(deg){
  return (deg % 360 + 360) % 360;
}
function worldHeading(piece, localHeading){
  return norm360(piece.rot + localHeading);
}

/*
   Placement (ox, oy, rot) for a new piece attached by its port `newPortIdx`
   onto an open world port {pos, heading pointing away}.
*/
function placeAttached(newType, newPortIdx, openWorldPort){
  const ports = getPorts(newType);
  const p = ports[newPortIdx];
  // rotate so the new piece's body extends along the open port's heading
  const rot = norm360(openWorldPort.heading + 180 - p.heading);
  const r = deg2rad(rot);
  const cos=Math.cos(r), sin=Math.sin(r);
  // then place the origin so the rotated port lands on the open port
  const rx = p.x*cos - p.y*sin;
  const ry = p.x*sin + p.y*cos;
  return { ox: openWorldPort.pos.x - rx, oy: openWorldPort.pos.y - ry, rot };
}

