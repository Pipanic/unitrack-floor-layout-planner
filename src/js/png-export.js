/* ============================================================
   PNG EXPORT
   A picture of the layout for sharing or printing: each piece as a white
   shape with a black outline (no rails, ties or colour) and its part code
   beside it, not on it. Built as an SVG, drawn to a canvas and shown in a
   preview; Save PNG downloads it.
   ============================================================ */
const PNG_MAX_PX = 4000;       // longest side
const PNG_MAX_PX_PER_MM = 3;   // small layouts stop growing here
const PNG_MARGIN_PX = 40;
// Text and lines are sized in mm against the track: never smaller than the
// minimum here (labels about as tall as the roadbed is wide), so exporting
// part of a layout draws the track smaller rather than the labels; on a large
// layout, a fraction of its longer side, so they still read when the picture
// is shrunk to fit a screen or page.
const PNG_LABEL_OF_SPAN = 1/110, PNG_LABEL_MM = [22, 40];
const PNG_EDGE_OF_SPAN = 1/800, PNG_EDGE_MM = [2.5, 4];
const PNG_LABEL_FAR_STEPS = 8; // how far out (in label heights) a crowded label may go
/** @param {number} v @param {number[]} range */
const clampTo = (v, [lo, hi])=>Math.min(hi, Math.max(lo, v));
let pngOpen = false;
let _pngExport = null; // {blob, url, filename}

// Only the selection when some but not all pieces are selected; else the
// whole layout.
function pngSelectionOnly(){
  const n = [...selectedPieces].filter(id=>pieces[id]).length;
  return n > 0 && n < Object.keys(pieces).length;
}
function pngExportPieces(){
  return pngSelectionOnly() ? [...selectedPieces].filter(id=>pieces[id]).map(id=>pieces[id]) : Object.values(pieces);
}
// A piece's roadbed outlines in world mm, each with its bounding box.
function pngWorldPolys(p){
  const r = deg2rad(p.rot), c = Math.cos(r), s = Math.sin(r);
  return typeFootprint(p.typeId).polys.map(poly=>{
    const w = poly.map(q=>({x:p.ox + q.x*c - q.y*s, y:p.oy + q.x*s + q.y*c}));
    w.box = w.reduce((b, q)=>({x0:Math.min(b.x0,q.x), x1:Math.max(b.x1,q.x), y0:Math.min(b.y0,q.y), y1:Math.max(b.y1,q.y)}),
      {x0:Infinity, x1:-Infinity, y0:Infinity, y1:-Infinity});
    return w;
  });
}
// Where each part code goes: beside its piece, along the normal at the
// piece's centre, trying the side away from the layout's middle first, then
// the other (inside a curve, say); then each side a quarter of the piece
// either way along it; then each side up to four steps further out, with a
// leader; then, for crowded pieces, further out and on the diagonals, nearest
// first. A spot is taken if the label would overlap another label or any
// track. If none is free, the one clear of labels covering the least track is
// used, else the first. Sizes in world mm.
// `avoid`: boxes already taken (text labels).
function pngLabelPlacements(items, fontMm, mid, avoid=[]){
  const gapMm = fontMm*0.3; // between a piece's edge and its label
  const placed = avoid.slice();
  // Track outlines indexed in a coarse grid, so a point is tested only
  // against the outlines near it.
  const CELL = 100, grid = new Map(), key = (cx, cy)=>cx*100003 + cy;
  items.forEach(it=>it.polys.forEach(poly=>{
    const b = poly.box;
    for(let cx=Math.floor(b.x0/CELL); cx<=Math.floor(b.x1/CELL); cx++)
      for(let cy=Math.floor(b.y0/CELL); cy<=Math.floor(b.y1/CELL); cy++){
        const k = key(cx, cy), list = grid.get(k);
        if(list) list.push(poly); else grid.set(k, [poly]);
      }
  }));
  const onTrack = (x, y)=>(grid.get(key(Math.floor(x/CELL), Math.floor(y/CELL)))||[]).some(poly=>{
    const b = poly.box;
    return x>=b.x0 && x<=b.x1 && y>=b.y0 && y<=b.y1 && pointInPoly({x, y}, poly);
  });
  const clearOfLabels = box=>!placed.some(o=>box.x0<o.x1 && box.x1>o.x0 && box.y0<o.y1 && box.y1>o.y0);
  // Clear of track: tested on a grid over the box about a third of its height
  // apart, so a long label can't straddle a track end between samples.
  const samples = box=>{
    const step = (box.y1-box.y0)/3, nx = Math.max(2, Math.ceil((box.x1-box.x0)/step));
    const xs = Array.from({length:nx+1}, (_, i)=>box.x0 + (box.x1-box.x0)*i/nx), ys = [0, 1, 2, 3].map(i=>box.y0 + step*i);
    return xs.flatMap(x=>ys.map(y=>[x, y]));
  };
  const trackFree = box=>!samples(box).some(([x, y])=>onTrack(x, y));
  const trackHits = box=>samples(box).filter(([x, y])=>onTrack(x, y)).length; // how much track a box covers
  const free = box=>clearOfLabels(box) && trackFree(box);
  // Each piece's candidate spots, then the most crowded pieces (fewest spots
  // beside them clear of track) placed first, so they get the near spots.
  const cands = items.map(it=>{
    const type = TT[it.p.typeId], text = shortCode(type), lines = partLabelLines(text);
    const w = longestLine(lines)*PART_LABEL_CHAR_EM*fontMm + 2*gapMm, h = fontMm*1.25*lines.length;
    const c = worldPoint(it.p, pieceCenterLocal(type));
    const a = deg2rad(it.p.rot + partLabelAngle(type) + 90);
    let nx = Math.cos(a), ny = Math.sin(a);
    if((c.x-mid.x)*nx + (c.y-mid.y)*ny < 0){ nx = -nx; ny = -ny; } // outward first
    // Half the track's width: double track, straight or curved, is both tracks wide.
    const half = type.platform ? (type.roofWidth || type.width)/2 : type.spacing ? type.spacing/2 + ROADBED_HALF
      : type.radiusOuter ? (type.radiusOuter-type.radiusInner)/2 + ROADBED_HALF : ROADBED_HALF;
    const reach = (w/2)*Math.abs(nx) + (h/2)*Math.abs(ny); // the box's half-extent along the normal
    const spots = [], along = partLabelReach(type)/4;
    const addSpot = (side, step, shift)=>{
      const d = half + gapMm + reach + step*h, sx = -ny*shift, sy = nx*shift; // shift: along the track
      spots.push({x:c.x + sx + side*nx*d, y:c.y + sy + side*ny*d, step});
    };
    [1, -1].forEach(side=>addSpot(side, 0, 0));
    [1, -1].forEach(side=>[along, -along].forEach(shift=>addSpot(side, 0, shift)));
    [1, 2, 3, 4].forEach(step=>[1, -1].forEach(side=>addSpot(side, step, 0)));
    // Further out, only reached when all of the above are taken (a yard, nested
    // curves): straight out up to PNG_LABEL_FAR_STEPS steps, and the diagonals
    // (the normal turned 45° either way, so towards either end of the piece),
    // nearest first. Each has a leader.
    const extra = [], diag = Math.SQRT1_2;
    for(let step=1; step<=PNG_LABEL_FAR_STEPS; step++) [1, -1].forEach(side=>{
      if(step>4) extra.push({side, step, dx:nx, dy:ny});
      [1, -1].forEach(turn=>extra.push({side, step, dx:(nx - turn*ny)*diag, dy:(ny + turn*nx)*diag}));
    });
    extra.forEach(e=>{
      const r = (w/2)*Math.abs(e.dx) + (h/2)*Math.abs(e.dy), d = half/diag + gapMm + r + e.step*h;
      e.spot = {x:c.x + e.side*e.dx*d, y:c.y + e.side*e.dy*d, step:e.step, d};
    });
    extra.sort((a, b)=>a.spot.d - b.spot.d).forEach(e=>spots.push(e.spot));
    spots.forEach(sp=>{ sp.box = {x0:sp.x-w/2, x1:sp.x+w/2, y0:sp.y-h/2, y1:sp.y+h/2}; });
    return {text, c, spots, room: spots.filter(sp=>sp.step===0 && trackFree(sp.box)).length};
  });
  return cands.slice().sort((a, b)=>a.room - b.room).map(({text, c, spots})=>{
    // Failing a free spot, the one clear of other labels covering the least
    // track (crossing track reads better than overlapping text; the nearest
    // such on a tie), else the first.
    let spot = spots.find(sp=>free(sp.box));
    if(!spot){
      const clear = spots.filter(sp=>clearOfLabels(sp.box)).map(sp=>({sp, hits:trackHits(sp.box)}));
      spot = clear.length ? clear.reduce((a, b)=>b.hits < a.hits ? b : a).sp : spots[0];
    }
    placed.push(spot.box);
    // A label moved away from its piece has a leader from a dot on the
    // piece's centre line, so it can't be taken for a neighbour's.
    return {text, x:spot.x, y:spot.y, box:spot.box, fontMm, leader: spot.step>0 ? c : null};
  });
}
// A gradeable piece's centreline in local coords, from its side 0 to its side
// 1: along the arc on a curve (between the tracks on double track).
function pngCentreline(type){
  const P = getPorts(type), gs = gradeablePortGroups(type);
  const mid = g=>({x:g.reduce((s, i)=>s + P[i].x, 0)/g.length, y:g.reduce((s, i)=>s + P[i].y, 0)/g.length});
  const R = type.cat==='curve' ? type.radius : type.cat==='dcurve' ? (type.radiusInner + type.radiusOuter)/2 : null;
  if(R) return Array.from({length:17}, (_, i)=>curveFramePoint(R, type.hand, type.angle*i/16, 0, 0));
  return [mid(gs[0]), mid(gs[1])];
}
// Each slope in the picture, marked along its middle: a dashed line from its
// foot to its top, its height at each end ("0mm", "50mm") and, halfway, its
// gradient and run as the planner scores them ("Slope 4.2% · 1240mm"). The
// text follows the track, curving with it, upright, sized within its width,
// with a white halo over the line. Only slopes wholly in the picture.
function pngSlopeMarks(items, fontMm, edge){
  const ids = new Set(items.map(it=>it.p.id));
  let out = '', slopeN = 0;
  findAllSlopeGroups().filter(g=>[...g].every(id=>ids.has(id))).forEach(group=>{
    const sides = id=>{ const t = pieceType(id), gs = gradeablePortGroups(t), e = pieces[id].portElev;
      return {t, gs, low: e[gs[0][0]] <= e[gs[1][0]] ? 0 : 1}; };
    const outside = (id, side)=>{ const nb = groupNeighbor(id, sides(id).gs[side]); return !nb || !group.has(nb.pieceId); };
    const start = [...group].find(id=>outside(id, sides(id).low)) || [...group][0];
    // Foot to top: each piece's centreline low side first, then on through its high side.
    const pts = [];
    let cur = start, lowElev = null, highElev = 0;
    for(let n=0; cur && n<=group.size; n++){
      const s = sides(cur), p = pieces[cur], line = pngCentreline(s.t);
      if(lowElev==null) lowElev = p.portElev[s.gs[s.low][0]];
      highElev = p.portElev[s.gs[1-s.low][0]];
      (s.low===0 ? line : line.slice().reverse()).forEach(q=>{
        const w = worldPoint(p, q), last = pts[pts.length-1];
        if(!last || Math.hypot(w.x-last.x, w.y-last.y) > 0.01) pts.push(w);
      });
      const nb = groupNeighbor(cur, s.gs[1-s.low]);
      cur = nb && group.has(nb.pieceId) && nb.pieceId!==start ? nb.pieceId : null;
    }
    if(pts.length<2) return;
    const cum = [0];
    for(let i=1;i<pts.length;i++) cum.push(cum[i-1] + Math.hypot(pts[i].x-pts[i-1].x, pts[i].y-pts[i-1].y));
    const total = cum[cum.length-1];
    // Whether the line runs left to right (so text along it reads upright) at
    // distance d along it.
    const forwardAt = d=>{
      d = Math.max(0, Math.min(total, d));
      let i = 1; while(i<cum.length-1 && cum[i] < d) i++;
      const ang = Math.atan2(pts[i].y-pts[i-1].y, pts[i].x-pts[i-1].x)*180/Math.PI;
      return ang > -90 && ang <= 90;
    };
    const t0 = pieceType(start), half = t0.spacing ? t0.spacing/2 + ROADBED_HALF
      : t0.radiusOuter ? (t0.radiusOuter - t0.radiusInner)/2 + ROADBED_HALF : ROADBED_HALF; // double track is wider
    const fs = Math.min(fontMm*0.85, half*1.3), textW = (s, size)=>s.length*PART_LABEL_CHAR_EM*size;
    const d = q=>q.map(p_=>`${p_.x.toFixed(2)} ${p_.y.toFixed(2)}`).join('L');
    out += `<path d="M${d(pts)}" fill="none" stroke="#555"`
      + ` stroke-width="${(edge*0.8).toFixed(3)}" stroke-dasharray="${(fs*0.5).toFixed(2)} ${(fs*0.35).toFixed(2)}"/>`;
    // The text follows the line round any curve (textPath), on the line run
    // whichever way reads upright where the text sits: forward, or reversed.
    const id = `pngSlope${slopeN++}`;
    out += `<defs><path id="${id}f" d="M${d(pts)}"/><path id="${id}r" d="M${d(pts.slice().reverse())}"/></defs>`;
    const text = (s, at, size)=>{
      const fwd = forwardAt(at);
      out += `<text font-size="${size.toFixed(2)}" text-anchor="middle" dy="0.35em" stroke="#fff"`
        + ` stroke-width="${(size*0.3).toFixed(2)}" stroke-linejoin="round" paint-order="stroke">`
        + `<textPath href="#${id}${fwd ? 'f' : 'r'}" startOffset="${(fwd ? at : total - at).toFixed(2)}">${s}</textPath></text>`;
    };
    const lo = fmtLen(lowElev), hi = fmtLen(highElev);
    text(lo, textW(lo, fs)/2 + edge*2, fs);
    text(hi, total - textW(hi, fs)/2 - edge*2, fs);
    const mid = tr('png.slope', slopeGroupPercent(group).toFixed(1), fmtLen(slopeGroupRun(group)));
    text(mid, total/2, Math.min(fs, total*0.5/(mid.length*PART_LABEL_CHAR_EM)));
  });
  return out;
}
// Track hidden under higher track, drawn dashed over it (the drafting
// convention): each piece's outline again, dashed, clipped to the higher
// pieces that cover it (not ones joined to it, which only meet at an end).
function pngHiddenEdges(items, edge){
  const boxOf = it=>it.polys.reduce((b, q)=>({x0:Math.min(b.x0, q.box.x0), x1:Math.max(b.x1, q.box.x1), y0:Math.min(b.y0, q.box.y0), y1:Math.max(b.y1, q.box.y1)}),
    {x0:Infinity, x1:-Infinity, y0:Infinity, y1:-Infinity});
  const boxes = items.map(boxOf), tf = p=>`translate(${p.ox.toFixed(3)} ${p.oy.toFixed(3)}) rotate(${p.rot.toFixed(3)})`;
  const roadbed = p=>pieceGraphics(TT[p.typeId]).map(seg=>seg.roadbed).join('');
  let out = '';
  items.forEach(({p}, i)=>{
    const a = boxes[i];
    const over = items.filter(({p:q}, j)=>{ const b = boxes[j];
      return meanElev(q) > meanElev(p) + 1 && b.x0<a.x1 && b.x1>a.x0 && b.y0<a.y1 && b.y1>a.y0 && !joinedTo(p.id, q.id); });
    if(!over.length) return;
    out += `<clipPath id="pngHidden${i}">${over.map(({p:q})=>`<path transform="${tf(q)}" d="${roadbed(q)}"/>`).join('')}</clipPath>`
      + `<g clip-path="url(#pngHidden${i})"><path transform="${tf(p)}" d="${roadbed(p)}" fill="none" stroke="#000"`
      + ` stroke-width="${(edge*0.8).toFixed(3)}" stroke-dasharray="${(edge*4).toFixed(2)} ${(edge*3).toFixed(2)}"/></g>`;
  });
  return out;
}
function buildPngSvg(){
  // Lower pieces first, so a higher one's white fill covers what passes under it.
  const items = pngExportPieces().sort((a, b)=>meanElev(a) - meanElev(b)).map(p=>({p, polys:pngWorldPolys(p)}));
  const track = {x0:Infinity, x1:-Infinity, y0:Infinity, y1:-Infinity};
  items.forEach(it=>it.polys.forEach(poly=>{
    track.x0 = Math.min(track.x0, poly.box.x0); track.x1 = Math.max(track.x1, poly.box.x1);
    track.y0 = Math.min(track.y0, poly.box.y0); track.y1 = Math.max(track.y1, poly.box.y1);
  }));
  const span = Math.max(track.x1-track.x0, track.y1-track.y0, 1);
  const fontMm = clampTo(span*PNG_LABEL_OF_SPAN, PNG_LABEL_MM), edge = clampTo(span*PNG_EDGE_OF_SPAN, PNG_EDGE_MM);
  // Text labels, on a whole-layout picture (a selection is only ever track):
  // the part codes keep clear of them.
  const notes = pngSelectionOnly() ? [] : Object.values(tableBoxes).filter(isTextBox);
  const noteBoxes = notes.map(n=>textBoxCorners(n).reduce((b, p)=>({x0:Math.min(b.x0,p.x), x1:Math.max(b.x1,p.x), y0:Math.min(b.y0,p.y), y1:Math.max(b.y1,p.y)}),
    {x0:Infinity, x1:-Infinity, y0:Infinity, y1:-Infinity}));
  const labels = pngLabelPlacements(items, fontMm, {x:(track.x0+track.x1)/2, y:(track.y0+track.y1)/2}, noteBoxes);
  const marks = pngJoinerMarks(new Set(items.map(it=>it.p.id)), fontMm, edge, items, [...noteBoxes, ...labels.map(l=>l.box)]);
  const all = {...track};
  marks.boxes.forEach(b=>{ all.x0 = Math.min(all.x0, b.x0); all.x1 = Math.max(all.x1, b.x1); all.y0 = Math.min(all.y0, b.y0); all.y1 = Math.max(all.y1, b.y1); });
  noteBoxes.forEach(b=>{ all.x0 = Math.min(all.x0, b.x0); all.x1 = Math.max(all.x1, b.x1); all.y0 = Math.min(all.y0, b.y0); all.y1 = Math.max(all.y1, b.y1); });
  labels.forEach(l=>{ all.x0 = Math.min(all.x0, l.box.x0); all.x1 = Math.max(all.x1, l.box.x1);
    all.y0 = Math.min(all.y0, l.box.y0); all.y1 = Math.max(all.y1, l.box.y1); });
  // px per mm: the whole picture, labels included, within PNG_MAX_PX.
  const k = Math.min(PNG_MAX_PX_PER_MM, (PNG_MAX_PX - 2*PNG_MARGIN_PX)/Math.max(all.x1-all.x0, all.y1-all.y0, 1));
  const m = PNG_MARGIN_PX/k;
  const vx = all.x0-m, vy = all.y0-m, vw = all.x1-all.x0+2*m, vh = all.y1-all.y0+2*m;
  const W = Math.round(vw*k), H = Math.round(vh*k);
  // Per piece, the fill and then the outline centred over it, so a joint's line
  // lies on the joint whichever piece was drawn last. Even-odd fill leaves where
  // a piece's routes overlap unfilled, so every route's outline shows (a
  // turnout's diverging route inside its through route), the same for either
  // hand: with nonzero fill it depended on which way each route was drawn.
  let body = '';
  items.forEach(({p})=>{
    const d = pieceGraphics(TT[p.typeId]).map(seg=>seg.roadbed).join('');
    const t = `translate(${p.ox.toFixed(3)} ${p.oy.toFixed(3)}) rotate(${p.rot.toFixed(3)})`;
    body += `<path transform="${t}" d="${d}" fill="#fff" fill-rule="evenodd" stroke="none"/>`
      + `<path transform="${t}" d="${d}" fill="none" stroke="#000" stroke-width="${edge.toFixed(3)}" stroke-linejoin="round"/>`;
  });
  body += pngHiddenEdges(items, edge) + pngSlopeMarks(items, fontMm, edge) + marks.svg;
  const esc = s=>s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  labels.forEach(l=>{
    if(l.leader){
      const tx = Math.max(l.box.x0, Math.min(l.box.x1, l.leader.x)), ty = Math.max(l.box.y0, Math.min(l.box.y1, l.leader.y));
      body += `<line x1="${l.leader.x.toFixed(2)}" y1="${l.leader.y.toFixed(2)}" x2="${tx.toFixed(2)}" y2="${ty.toFixed(2)}" stroke="#888" stroke-width="${(edge/2).toFixed(3)}"/>`
        + `<circle cx="${l.leader.x.toFixed(2)}" cy="${l.leader.y.toFixed(2)}" r="${(edge*1.4).toFixed(3)}" fill="#555"/>`;
    }
    const lines = partLabelLines(l.text);
    body += `<text x="${l.x.toFixed(2)}" y="${l.y.toFixed(2)}" font-size="${l.fontMm.toFixed(3)}" text-anchor="middle" dominant-baseline="central">`
      + (lines.length===1 ? esc(l.text) : lines.map((line, i)=>`<tspan x="${l.x.toFixed(2)}" dy="${i ? '1.1em' : '-0.55em'}">${esc(line)}</tspan>`).join('')) + `</text>`;
  });
  notes.forEach(n=>{
    const lines = textLines(n.text), lh = n.size*TEXT_LINE_EM;
    body += `<g transform="translate(${(n.x+n.w/2).toFixed(2)} ${(n.y+n.h/2).toFixed(2)}) rotate(${(n.rot||0).toFixed(1)})">`
      + `<text font-size="${n.size.toFixed(2)}" text-anchor="middle" dominant-baseline="central" stroke="#fff" stroke-width="${(n.size*0.2).toFixed(2)}" stroke-linejoin="round" paint-order="stroke">`
      + lines.map((line, i)=>`<tspan x="0" y="${((i - (lines.length-1)/2)*lh).toFixed(2)}">${esc(line) || '&#160;'}</tspan>`).join('')
      + `</text></g>`;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${vx} ${vy} ${vw} ${vh}">`
    + `<rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="#fff"/>`
    + `<g font-family="'Segoe UI', Arial, sans-serif" font-weight="600" fill="#000">${body}</g></svg>`;
  return {svg, W, H};
}
function renderPngBlob(){
  const {svg, W, H} = buildPngSvg();
  return new Promise((resolve, reject)=>{
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], {type:'image/svg+xml'}));
    img.onload = ()=>{
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      canvas.getContext('2d').drawImage(img, 0, 0, W, H);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob=>blob ? resolve({blob, W, H}) : reject(new Error('toBlob')), 'image/png');
    };
    img.onerror = ()=>{ URL.revokeObjectURL(url); reject(new Error('svg')); };
    img.src = url;
  });
}
async function openPngExport(){
  if(!Object.keys(pieces).length) return;
  const {blob, W, H} = await renderPngBlob();
  if(_pngExport) URL.revokeObjectURL(_pngExport.url);
  const part = pngSelectionOnly();
  _pngExport = {blob, url:URL.createObjectURL(blob), filename:`kato-${part ? 'selection' : 'layout'}-${fileStamp()}.png`};
  document.getElementById('pngTitle').textContent = tr(part ? 'png.title.selection' : 'png.title');
  const img = document.getElementById('pngImg');
  img.src = _pngExport.url;
  try{ await img.decode(); }catch(err){} // shown once ready, so the dialog opens at its full size
  document.getElementById('pngSize').textContent = tr('png.size', W, H);
  document.getElementById('pngOverlay').style.display = 'flex';
  pngOpen = true;
}
function closePngExport(){
  pngOpen = false;
  document.getElementById('pngOverlay').style.display = 'none';
  document.getElementById('pngImg').removeAttribute('src');
  if(_pngExport){ URL.revokeObjectURL(_pngExport.url); _pngExport = null; }
}
async function savePngExport(){
  if(!_pngExport) return;
  try{ if(!await offerDownload(_pngExport.blob, _pngExport.filename)) return; }
  catch(err){ flashSaveFailed(err); return; }
  closePngExport();
}
// The preview's keys (a dialog layer of onKeyDown).
function pngKeys(e){
  if(e.key==='Escape'){ closePngExport(); e.preventDefault(); }
  else if(e.key==='Enter'){ savePngExport(); e.preventDefault(); }
}
document.getElementById('pngBtn').addEventListener('click', openPngExport);
document.getElementById('pngCloseBtn').addEventListener('click', closePngExport);
document.getElementById('pngSaveBtn').addEventListener('click', savePngExport);
document.getElementById('pngOverlay').addEventListener('click', e=>{
  if(e.target.id==='pngOverlay') closePngExport();
});

