/* ============================================================
   GESTURES WINDOW
   Opened from the empty layout's start screen: looping demos of the gestures
   that aren't obvious at first. Each demo is a small scene of real pieces,
   drawn by drawPiece as on the canvas, and a timeline of steps: what the
   pointer, mouse buttons, wheel and keys do, and what that changes. Green dots
   and orange arrows follow from the scene by the canvas's rules (an end is
   open unless another piece's end meets it), so a step only says what
   changes. The animation runs only while the window is open. Modal like Help.
   ============================================================ */
let gestOpen = false;
let gestCards = []; // rebuilt on each open, so the language and theme colours are current
let gestUid = 0;    // keeps each card's slope gradient ids apart
let gestRaf = 0, gestStart = 0;
let gestObserver = null; // which cards are scrolled into view: only those are drawn
const GEST_W = 264;        // a card's nominal stage width (px): sizes the screen-sized marks
const GEST_REST_MS = 1400; // the finished scene's pause before the loop restarts

// Scene helpers. A pose is {typeId, ox, oy, rot}, placed by port 0 as on the canvas.
function gestAttach(typeId, onto, ontoPort, port=0){
  const p = getPorts(TT[onto.typeId])[ontoPort];
  return {typeId, ...placeAttached(TT[typeId], port, {pos:worldPoint(onto, p), heading:worldHeading(onto, p.heading)})};
}
const gestEnd = (pose, idx)=>worldPoint(pose, getPorts(TT[pose.typeId])[idx]);
const gestCentre = pose=>worldPoint(pose, pieceCenterLocal(TT[pose.typeId]));
const gestShift = (pose, dx, dy)=>({...pose, ox:pose.ox+dx, oy:pose.oy+dy});
// A held piece turned by the wheel: about its centre, as applyDragTransform
// does; a held group turns about the centre of the piece being held.
function gestTurn(pose, d, c=gestCentre(pose)){
  const r = rotateAround(pose.ox, pose.oy, c.x, c.y, d);
  return {...pose, ox:r.x, oy:r.y, rot:norm360(pose.rot+d)};
}
// Steps are `ms` long. `move` glides the pointer, the box and any moved piece
// there over the step; anything else changes at once. What a step sets lasts
// until changed, except `wheel` (±1: one notch, up or down). A piece set to
// null is removed; `cam` pans the view (mm) and `zoom` scales it. The view
// keys' settings: `ties`, `labels` (partLabelMode's values), `ports`, `level`
// (focusedLevel's), and `tag`, tr() arguments naming the setting. A pointer
// target can also name
// part of the demo's palette: 'h:<group>', 'b:<typeId>' or 'x' (clear search).
const gestMove = (at, ms=650, also={})=>({ms, move:true, cur:typeof at==='string' ? at : [at.x, at.y], ...also});
const gestClick = (then={}, btn='l')=>[{ms:130, [btn]:true}, {ms:550, [btn]:false, ...then}];
const gestDoubleClick = (first, then)=>[{ms:100, l:true}, {ms:90, l:false, ...first}, {ms:100, l:true}, {ms:700, l:false, ...then}];
const gestNotch = (wheel, pieces)=>({ms:420, wheel, pieces});
const gestSel = (ids, sel=true)=>Object.fromEntries(ids.map(id=>[id, {sel}]));

// The demos, in sections, in the window's order. `view` is the scene's viewBox
// (mm, about 264:150), `keys` the keys shown under it, `cur` and `pieces` the
// start; `palette` adds a palette (its groups, scale and search box) on the left.
function gestDemos(){
  const S = (typeId, ox, oy, rot=0)=>({typeId, ox, oy, rot});
  // A palette piece being dragged and not yet snapped: centred on the pointer.
  const loose = (typeId, x, y)=>{ const c = pieceCenterLocal(TT[typeId]); return {...S(typeId, x-c.x, y-c.y), ghost:'loose'}; };
  // Pick up, change, put back where it was: the loop runs on without a jump.
  const held = (id, typeId, keys, change, grab={x:34, y:3})=>{
    const home = S(typeId, 0, 0), rest = {x:250, y:72};
    const lifted = gestShift(home, 10, 8);
    const steps = [gestMove(grab), {ms:150, l:true, drag:true},
      gestMove({x:grab.x+10, y:grab.y+8}, 400, {pieces:{a:lifted}}), ...change(lifted),
      gestMove(grab, 400, {pieces:{a:home}}), {ms:150, l:false, drag:false}, gestMove(rest)];
    return {id, keys, view:[-66,-106,380,216], cur:rest, pieces:{a:home}, steps};
  };
  const rotate = held('rotate', 'S248', [], a=>{
    const steps = [];
    for(let n=0; n<3; n++){ a = gestTurn(a, 15); steps.push(gestNotch(1, {a})); } // wheel up turns clockwise
    steps.push({ms:500});
    for(let n=0; n<3; n++){ a = gestTurn(a, -15); steps.push(gestNotch(-1, {a})); }
    return steps;
  }, {x:124, y:3});
  // Port 0 stays put, as the type changes under the same pose.
  const morph = held('morph', 'S248', ['Shift'], ()=>[{ms:300, keys:['Shift']},
    ...['S186','S124','S64'].map(t=>gestNotch(1, {a:{typeId:t}})), {ms:500},
    ...['S124','S186','S248'].map(t=>gestNotch(-1, {a:{typeId:t}})), {ms:300, keys:[]}]);
  const flip = held('flip', 'T4-L', ['F'], ()=>[{ms:400},
    {ms:200, keys:['F'], pieces:{a:{typeId:'T4-R'}}}, {ms:900, keys:[]},
    {ms:200, keys:['F'], pieces:{a:{typeId:'T4-L'}}}, {ms:700, keys:[]}]);

  const chain = (()=>{
    const tiles = [{typeId:'S124', x:8, y:12, w:110, h:68}, {typeId:'R249-45R', x:8, y:88, w:110, h:68}];
    const tile = i=>({x:tiles[i].x+tiles[i].w/2, y:tiles[i].y+tiles[i].h/2}), rest = {x:330, y:220};
    const a = S('S64', 76, 300), b = gestAttach('S124', a, 1), c = gestAttach('R249-45R', b, 1), d = gestAttach('R249-45R', c, 1);
    return {id:'chain', keys:[], view:[0,0,590,335], tiles, cur:rest, pieces:{a}, steps:[
      gestMove(gestEnd(a, 1)), ...gestClick({marks:{'a:1':'sel'}}),
      gestMove(tile(0)), ...gestClick({pieces:{b}, marks:{'b:1':'sel'}}),
      gestMove(tile(1)), ...gestClick({pieces:{c}, marks:{'c:1':'sel'}}),
      {ms:150}, ...gestClick({pieces:{d}, marks:{'d:1':'sel'}}),
      {ms:400}, gestMove(rest)]};
  })();

  const dup = (()=>{
    const a = S('S124', 16, 0), b = gestAttach('S124', a, 1), c = gestAttach('S124', b, 1), rest = {x:200, y:80};
    return {id:'dup', keys:[], view:[0,-110,400,227], cur:rest, pieces:{a}, steps:[
      gestMove(gestEnd(a, 1)), ...gestDoubleClick({marks:{'a:1':'sel'}}, {pieces:{b}, marks:{'b:1':'sel'}}),
      gestMove(gestEnd(b, 1), 500), ...gestDoubleClick({}, {pieces:{c}, marks:{'c:1':'sel'}}),
      {ms:300}, gestMove(rest)]};
  })();

  // A click selects one piece; Shift+click adds another, or takes one out.
  const shiftClick = (()=>{
    const a = S('S124', 30, 60), b = S('R249-45R', 200, 120), c = S('S124', 40, 185), d = S('S186', 220, 205);
    const rest = {x:gestCentre(a).x, y:115}; // just below a, the last piece clicked: empty canvas
    const shiftClickOn = (pose, sel)=>[gestMove(gestCentre(pose), 600), {ms:200, keys:['Shift']}, ...gestClick({pieces:sel}), {ms:150, keys:[]}];
    return {id:'shiftClick', keys:['Shift'], view:[0,0,440,250], cur:rest, pieces:{a, b, c, d}, steps:[
      gestMove(gestCentre(a)), ...gestClick({pieces:gestSel(['a'])}),
      ...shiftClickOn(b, gestSel(['b'])), ...shiftClickOn(d, gestSel(['d'])), ...shiftClickOn(a, gestSel(['a'], false)),
      {ms:600}, gestMove(rest, 400), ...gestClick({pieces:gestSel(['a','b','c','d'], false)})]};
  })();

  const connected = (()=>{
    const a = S('S124', 20, 210), b = gestAttach('R249-45R', a, 1), c = gestAttach('S124', b, 1), d = S('S124', 30, 60);
    const rest = {x:300, y:225};
    return {id:'connected', keys:[], view:[0,0,440,250], cur:rest, pieces:{a, b, c, d}, steps:[
      gestMove(gestCentre(b)), ...gestDoubleClick({pieces:gestSel(['b'])}, {pieces:gestSel(['a','c'])}),
      {ms:700}, gestMove(rest), ...gestClick({pieces:gestSel(['a','b','c'], false)})]};
  })();

  const extend = (()=>{
    const a = S('S124', 12, 0), b = gestAttach('S64', a, 1), c = gestAttach('S64', b, 1), d = gestAttach('S124', c, 1);
    const arrow = idx=>{ const q = arrowAnchor(c, getPorts(TT[c.typeId])[idx]); return {x:q.ax, y:q.ay}; };
    const rest = {x:200, y:80};
    return {id:'extend', keys:[], view:[0,-110,400,227], cur:rest, pieces:{a, b, c, d}, steps:[
      gestMove(gestCentre(c)), ...gestClick({pieces:gestSel(['c'])}),
      gestMove(arrow(1), 600), ...gestClick({pieces:gestSel(['d'])}),
      gestMove(arrow(0), 700), ...gestClick({pieces:gestSel(['a','b'])}),
      {ms:400}, gestMove(rest), ...gestClick({pieces:gestSel(['a','b','c','d'], false)})]};
  })();

  // While the box is out, a piece with an end inside it shows selected.
  const marquee = (()=>{
    const a = S('S124', 20, 210), b = gestAttach('R249-45R', a, 1), c = S('S64', 40, 90), d = S('S124', 190, 60);
    const rest = {x:330, y:200};
    const box = (x0, y0, x1, y1, also)=>[gestMove({x:x0, y:y0}), {ms:120, r:true, box:[x0,y0,x0,y0]},
      gestMove({x:x1, y:y1}, 800, {box:[x0,y0,x1,y1]}), {ms:600, r:false, box:null, ...also}];
    return {id:'marquee', keys:['Shift'], view:[0,0,440,250], cur:rest, pieces:{a, b, c, d}, steps:[
      ...box(20, 40, 230, 120, {pieces:gestSel(['c','d'])}),
      {ms:300, keys:['Shift']}, ...box(8, 180, 64, 232, {pieces:gestSel(['a'])}), {ms:100, keys:[]},
      {ms:600}, gestMove(rest)]};
  })();

  // The S-bend's fill is two R249-45s, the second joined by its far end so it
  // turns back: the fill Fill Gap offers first between these ends.
  const gapFill = (()=>{
    const a = S('S64', 10, 250), g1 = gestAttach('R249-45R', a, 1), g2 = gestAttach('R249-45R', g1, 1, 1), b = gestAttach('S64', g2, 0);
    const rest = {x:250, y:250};
    return {id:'gapFill', keys:['Shift','Enter'], view:[0,0,500,284], cur:rest, pieces:{a, b}, steps:[
      gestMove(gestEnd(a, 1)), ...gestClick({marks:{'a:1':'sel'}}),
      gestMove(gestEnd(b, 0), 800), {ms:250, keys:['Shift']},
      ...gestClick({pieces:{g1:{...g1, ghost:true}, g2:{...g2, ghost:true}}}), {ms:1000, keys:[]},
      {ms:250, keys:['Enter'], marks:{}, pieces:{g1:{ghost:false, sel:true}, g2:{ghost:false, sel:true}}},
      {ms:600, keys:[]}, gestMove(rest)]};
  })();

  // The same ends: the planner's first three fills for them, in its order.
  // . or scrolling down steps on, , steps back; Enter places the one shown.
  const fills = (()=>{
    const a = S('S64', 10, 250), g1 = gestAttach('R249-45R', a, 1), g2 = gestAttach('R249-45R', g1, 1, 1), b = gestAttach('S64', g2, 0);
    const fill = (near, far)=>({g1:{...gestAttach(near, a, 1), ghost:true}, g2:{...gestAttach(far, b, 0), ghost:true}});
    const options = [fill('R249-45R', 'R249-45R'), fill('R183-45R', 'R315-45R'), fill('R216-45R', 'R282-45R')];
    const key = (k, pieces)=>[{ms:200, keys:[k], pieces}, {ms:700, keys:[]}];
    const rest = {x:250, y:250};
    return {id:'fills', keys:['Shift',',','.','Enter'], view:[0,0,500,284], cur:rest, pieces:{a, b}, steps:[
      gestMove(gestEnd(a, 1)), ...gestClick({marks:{'a:1':'sel'}}),
      gestMove(gestEnd(b, 0), 700), {ms:200, keys:['Shift']}, ...gestClick({pieces:options[0]}), {ms:200, keys:[]},
      gestMove(rest, 500), {ms:400},
      ...key('.', options[1]), gestNotch(-1, options[2]), {ms:700},
      ...key(',', options[1]),
      {ms:200, keys:['Enter'], marks:{}, pieces:{g1:{ghost:false, sel:true}, g2:{ghost:false, sel:true}}}, {ms:900, keys:[]}]};
  })();

  // Select the run, then turn it as one about the piece held.
  const groupTurn = (()=>{
    const a = S('S124', 30, 175), b = gestAttach('R249-45R', a, 1), c = gestAttach('S64', b, 1);
    const grab = gestCentre(b), rest = {x:330, y:225}, ids = ['a','b','c'];
    /** @type {Object<string, any>} */
    let run = {a:gestShift(a, 10, 8), b:gestShift(b, 10, 8), c:gestShift(c, 10, 8)};
    const pivot = gestCentre(run.b);
    const turn = d=>{ run = Object.fromEntries(ids.map(id=>[id, gestTurn(run[id], d, pivot)])); return run; };
    return {id:'groupTurn', keys:[], view:[0,0,440,250], cur:rest, pieces:{a, b, c}, steps:[
      gestMove(grab), ...gestDoubleClick({pieces:gestSel(['b'])}, {pieces:gestSel(['a','c'])}),
      {ms:150, l:true, drag:true}, gestMove({x:grab.x+10, y:grab.y+8}, 400, {pieces:run}),
      gestNotch(1, turn(15)), gestNotch(1, turn(15)), {ms:500},
      gestNotch(-1, turn(-15)), gestNotch(-1, turn(-15)),
      gestMove(grab, 400, {pieces:{a, b, c}}), {ms:150, l:false, drag:false},
      gestMove(rest), ...gestClick({pieces:gestSel(ids, false)})]};
  })();

  // Hold D: the view pans and the held piece rides along under the pointer,
  // out to the open end beyond the edge, where it snaps on.
  const carry = (()=>{
    const e1 = S('S248', 40, 40), e2 = gestAttach('S248', e1, 1), h = S('S124', 60, -60);
    const at = (pose, dx, dy)=>gestShift(pose, dx, dy), grip = pose=>({x:pose.ox+62, y:pose.oy});
    const h1 = at(h, 40, 30), h2 = at(h1, 250, 0), h3 = S('S124', 548, 52);
    const rest = {x:300, y:80};
    return {id:'carry', keys:['W','A','S','D'], view:[0,-110,400,227], cur:rest, pieces:{e1, e2, h}, steps:[
      gestMove(grip(h)), {ms:150, l:true, drag:true},
      gestMove(grip(h1), 500, {pieces:{h:h1}}), {ms:200, keys:['D']},
      gestMove(grip(h2), 1700, {pieces:{h:h2}, cam:[250, 0]}), {ms:200, keys:[]},
      gestMove(grip(h3), 700, {pieces:{h:h3}}), {ms:500, marks:{'h:0':'src', 'e2:1':'tgt'}},
      {ms:900, l:false, drag:false, marks:{}, pieces:{h:gestAttach('S124', e2, 1)}},
      gestMove({x:rest.x+250, y:rest.y})]};
  })();

  // From the palette into a gap: snapped, the ghost stretches to the far end.
  const expansion = (()=>{
    const tiles = [{typeId:'S78S', x:8, y:12, w:110, h:68}];
    const a = S('S124', 140, 190), b = S('S124', 359, 190);
    const loose = (x, y)=>({...S('S78S', x-39, y), ghost:'loose'});
    const fit = {...gestAttach('S78S@95', a, 1), ghost:true}, rest = {x:300, y:80};
    return {id:'expansion', keys:[], view:[0,0,500,284], tiles, cur:rest, pieces:{a, b}, steps:[
      gestMove({x:63, y:46}), {ms:150, l:true}, gestMove({x:126, y:60}, 300),
      {ms:1, pieces:{g:loose(126, 60)}}, gestMove({x:240, y:150}, 700, {pieces:{g:loose(240, 150)}}),
      gestMove({x:300, y:186}, 500, {pieces:{g:loose(300, 186)}}),
      {ms:1200, pieces:{g:fit}, marks:{'a:1':'tgt'}},
      {ms:900, l:false, marks:{}, pieces:{g:{ghost:false}}}, gestMove(rest)]};
  })();

  // Ctrl+Z puts a dragged piece back; a palette piece dropped back on the
  // palette is cancelled.
  const cancel = (()=>{
    const tiles = [{typeId:'R249-45R', x:8, y:12, w:110, h:68}];
    const b = S('S124', 180, 120), moved = gestShift(b, 130, 70), grip = pose=>({x:pose.ox+62, y:pose.oy});
    const loose = (x, y)=>({...S('R249-45R', x-90, y+20), ghost:'loose'}), rest = {x:330, y:60};
    return {id:'cancel', keys:['Ctrl','Z'], view:[0,0,500,284], tiles, cur:rest, pieces:{b}, steps:[
      gestMove(grip(b)), {ms:150, l:true, drag:true}, gestMove(grip(moved), 800, {pieces:{b:moved}}),
      {ms:250, keys:['Ctrl']}, {ms:250, keys:['Ctrl','Z'], pieces:{b}, drag:false},
      {ms:500, keys:[], l:false}, {ms:400},
      gestMove({x:63, y:46}), {ms:150, l:true}, gestMove({x:126, y:60}, 300),
      {ms:1, pieces:{g:loose(126, 60)}}, gestMove({x:250, y:170}, 700, {pieces:{g:loose(250, 170)}}), {ms:300},
      gestMove({x:126, y:60}, 600, {pieces:{g:loose(126, 60)}}), {ms:1, pieces:{g:null}},
      gestMove({x:63, y:46}, 300), {ms:500, l:false}, gestMove(rest)]};
  })();

  // The search box takes digits typed anywhere; the list narrows with each.
  const search = (()=>{
    const palette = {scale:0.6, search:true, groups:[
      {key:'straights', ids:['S248','S186','S124']},
      {key:'curves', ids:['R216-45R','R249-45R','R249-15R','R282-45R']},
      {key:'viaducts', ids:['V248','VR249-45']}]};
    const rest = {x:410, y:210}, type = (key, text)=>[{ms:220, keys:[key], search:text}, {ms:280, keys:[]}];
    return {id:'search', keys:['2','4','9'], view:[0,0,528,300], palette, cur:rest, pieces:{}, steps:[
      {ms:500}, ...type('2', '2'), ...type('4', '24'), ...type('9', '249'), {ms:500},
      gestMove('b:R249-45R', 700), {ms:150, l:true}, gestMove({x:300, y:150}, 350),
      {ms:1, pieces:{g:loose('R249-45R', 300, 150)}}, gestMove({x:400, y:190}, 600, {pieces:{g:loose('R249-45R', 400, 190)}}),
      {ms:500, l:false, pieces:{g:{ghost:false}}}, gestMove('x', 800), ...gestClick({search:''}), {ms:400}, gestMove(rest)]};
  })();

  // Right-click folds every group if any is open, else opens them all.
  const headings = (()=>{
    const palette = {scale:0.66, groups:[
      {key:'straights', ids:['S248','S186']}, {key:'curves', ids:['R249-45R','R282-45R']}, {key:'turnouts', ids:['T4-L','T4-R']}]};
    const all = open=>({open:{straights:open, curves:open, turnouts:open}}), rest = {x:400, y:150};
    return {id:'headings', keys:[], view:[0,0,528,300], palette, cur:rest, pieces:{}, open:all(true).open, steps:[
      gestMove('h:curves'), ...gestClick({open:{straights:true, curves:false, turnouts:true}}), {ms:400},
      gestMove('h:straights', 500), ...gestClick(all(false), 'r'), {ms:700},
      ...gestClick(all(true), 'r'), {ms:500}, gestMove(rest)]};
  })();

  // Gradient Mode's demos share one run: a ground lead-in, then an S64, four
  // R216-45s and two S248s, which climb 50 mm at 4.04%. chain(n) is the mode's
  // look with the first n pieces chosen: coloured by their own steepness, the
  // purple arrows at the tip (both ways from a lone first piece), the tick by
  // the tip and the cross by the first piece.
  const slopeScene = ()=>{
    const types = ['S64','R216-45R','R216-45R','R216-45R','R216-45R','S248','S248'];
    const lead = S('S124', 0, 0), ids = types.map((_, i)=>'c'+i), pieces = {lead};
    let prev = lead;
    types.forEach((t, i)=>{ prev = pieces[ids[i]] = gestAttach(t, prev, 1); });
    const len = id=>pieceNominalLength(TT[pieces[id].typeId]), sum = list=>list.reduce((total, id)=>total+len(id), 0);
    let climbed = 0;
    const heights = Object.fromEntries(ids.map(id=>{ const from = climbed; climbed += len(id);
      return [id, {elev:[GRADIENT_TARGET_MM*from/sum(ids), GRADIENT_TARGET_MM*climbed/sum(ids)]}]; }));
    const chain = n=>{
      const list = ids.slice(0, n), tip = list[n-1];
      return {pieces:Object.fromEntries(ids.map((id, i)=>[id, {tone:i<n ? 100*GRADIENT_TARGET_MM/sum(list) : null}])),
        garrows:n===1 ? [[tip, 0, 'f'], [tip, 1, 'f']] : [...(n<ids.length ? [[tip, 1, 'f']] : []), [tip, 0, 'b']],
        buttons:[[tip, -24, 'tick'], [ids[0], 24, 'cross']]};
    };
    const beside = (id, dy)=>{ const c = pieceCenterLocal(TT[pieces[id].typeId]); return worldPoint(pieces[id], {x:c.x, y:c.y+dy}); };
    // Confirm with the tick, then G leaves the mode: purple to pink up the climb.
    const finish = ()=>[gestMove(beside(ids[ids.length-1], -24), 600), ...gestClick({garrows:[], buttons:[], pieces:heights}),
      {ms:900}, {ms:250, keys:['G'], pieces:Object.fromEntries(ids.map(id=>[id, {tone:null}]))}, {ms:300, keys:[]}, {ms:900}];
    return {pieces, ids, chain, finish};
  };
  const slopeView = [-356,-466,880,500], slopeRest = {x:250, y:-120};

  // The first piece alone is far too steep (red); clicking the last brings the
  // run to 4% (green).
  const slope = (()=>{
    const {pieces, ids, chain, finish} = slopeScene(), last = ids[ids.length-1];
    return {id:'slope', keys:['G'], view:slopeView, cur:slopeRest, pieces, steps:[
      {ms:500}, {ms:250, keys:['G']}, {ms:300, keys:[]},
      gestMove(gestCentre(pieces[ids[0]])), ...gestClick(chain(1)),
      {ms:500}, gestMove(gestCentre(pieces[last]), 1000), ...gestClick(chain(ids.length)),
      {ms:800}, ...finish(), gestMove(slopeRest)]};
  })();

  // One piece at a time: a purple arrow, then , and . The key for each is the
  // one pickStepCandidateForKey gives the forward arrow, so it changes as the
  // climb turns back on itself; the darker arrow's key takes a piece off.
  const slopeSteps = (()=>{
    const {pieces, ids, chain, finish} = slopeScene(), n = ids.length;
    const keyFor = (count, kind)=>{
      const tip = pieces[ids[count-1]], P = getPorts(TT[tip.typeId]);
      const cands = [...(count<n ? [{kind:'f', heading:worldHeading(tip, P[1].heading)}] : []), {kind:'b', heading:worldHeading(tip, P[0].heading)}];
      return [',', '.'].find(key=>pickStepCandidateForKey(cands, key)?.kind===kind);
    };
    const keyStep = (key, state)=>[{ms:250, keys:[key], ...state}, {ms:650, keys:[]}];
    const arrow = idx=>{ const q = arrowAnchor(pieces[ids[0]], getPorts(TT[pieces[ids[0]].typeId])[idx]); return {x:q.ax, y:q.ay}; };
    const steps = [{ms:500}, {ms:250, keys:['G']}, {ms:300, keys:[]},
      gestMove(gestCentre(pieces[ids[0]])), ...gestClick(chain(1)),
      gestMove(arrow(1), 500), ...gestClick(chain(2)), gestMove(slopeRest, 500)];
    for(let count=2; count<n; count++) steps.push(...keyStep(keyFor(count, 'f'), chain(count+1)));
    steps.push({ms:300}, ...keyStep(keyFor(n, 'b'), chain(n-1)), ...keyStep(keyFor(n-1, 'f'), chain(n)), {ms:400}, ...finish(), gestMove(slopeRest));
    return {id:'slopeSteps', keys:[',', '.', 'G'], view:slopeView, cur:slopeRest, pieces, steps};
  })();

  // The view keys: no pointer, only the key and what it changes.
  const press = (key, also)=>[{ms:250, keys:[key], ...also}, {ms:1300, keys:[]}];
  // An oval of S248s and R315s, and the view that fits it.
  const ovalView = [-368,-665,1232,700];
  const oval = ()=>{
    const types = ['S248','R315-45R','R315-45R','R315-45R','R315-45R','S248','S248','R315-45R','R315-45R','R315-45R','R315-45R'];
    let prev = S('S248', 0, 0);
    const pieces = {p0:prev};
    types.forEach((t, i)=>{ prev = pieces['p'+(i+1)] = gestAttach(t, prev, 1); });
    return pieces;
  };
  const fit = {id:'fit', keys:['Space'], view:ovalView, zoom:3, cam:[863, 398], cur:null, pieces:oval(), steps:[
    {ms:1300}, ...press('Space', {zoom:1, cam:[0, 0]}), {ms:600}]};
  // KATO's CV1 compact oval, as the set lays it out, and a view that fits it.
  const cv1View = [-350,-200,700,398];
  const cv1 = ()=>Object.fromEntries(LAYOUT_SETS.find(set=>set.id==='CV1').pieces.map(([t, x, y, r], i)=>['v'+i, S(t, x, y, r)]));
  // Dragging empty canvas keeps the point grabbed under the pointer, so the
  // pointer's world position stays put while the view moves; WASD moves the
  // view under a still pointer, so its world position moves with the view.
  const pan = (()=>{
    // Zoomed in on the oval's right; the grab point is inside it, on empty canvas.
    const cam0 = [221, 116], grab = {x:150, y:60}, dx = 140, dy = 70;
    const hold = (key, cam, cur)=>[{ms:200, keys:[key]}, gestMove(cur, 900, {cam}), {ms:250, keys:[]}];
    return {id:'pan', keys:['W','A','S','D'], view:cv1View, zoom:1.6, cam:cam0, cur:grab, pieces:cv1(), steps:[
      {ms:500}, {ms:150, l:true}, gestMove(grab, 1000, {cam:[cam0[0]+dx, cam0[1]+dy]}), {ms:300, l:false}, {ms:400},
      ...hold('A', [cam0[0], cam0[1]+dy], {x:grab.x-dx, y:grab.y}),
      ...hold('W', cam0, {x:grab.x-dx, y:grab.y-dy}),
      {ms:300}, gestMove(grab, 600)]};
  })();
  // Each notch zooms by zoomAt's factor (1.08 in, 0.92 out) about the point
  // under the pointer, which stays put on screen and in the layout.
  const zoom = (()=>{
    const at = {x:120, y:75}, [vx, vy, vw, vh] = cv1View; // inside the loop, clear of the track, towards its lower right
    let z = 1, cam = [0, 0];
    const notch = (wheel, factor)=>{
      const ox = vx+cam[0], oy = vy+cam[1], u = (at.x-ox)/(vw/z), v = (at.y-oy)/(vh/z);
      z *= factor;
      cam = [at.x - u*vw/z - vx, at.y - v*vh/z - vy];
      return gestMove(at, 170, {zoom:z, cam, wheel});
    };
    const steps = [{ms:600}];
    for(let n=0; n<8; n++) steps.push(notch(1, 1.08));
    steps.push({ms:800});
    for(let n=0; n<7; n++) steps.push(notch(-1, 0.92));
    steps.push({ms:500});
    return {id:'zoom', keys:[], view:cv1View, cur:at, pieces:cv1(), steps};
  })();
  const ties = (()=>{
    const a = S('S64', 10, 40), b = gestAttach('R249-45R', a, 1);
    return {id:'ties', keys:['T'], view:[0,-60,264,150], ties:true, cur:null, pieces:{a, b}, steps:[
      {ms:1200}, ...press('T', {ties:false}), ...press('T', {ties:true})]};
  })();
  const labels = (()=>{
    const a = S('S186', 20, 140), b = gestAttach('S64', a, 1), c = gestAttach('R249-45R', b, 1), d = S('S124', 40, 245), e = S('S62', 230, 245);
    const mode = m=>press('L', {labels:m, tag:['canvas.partLabels.title', m]});
    return {id:'labels', keys:['L'], view:[0,0,500,284], tag:['canvas.partLabels.title', 'limited'], cur:null, pieces:{a, b, c, d, e}, steps:[
      {ms:1300}, ...mode('printed'), ...mode('all'), ...mode('off'), ...mode('limited')]};
  })();
  const ports = (()=>{
    const a = S('S124', 20, 60), b = gestAttach('S64', a, 1), c = gestAttach('S124', b, 1);
    return {id:'ports', keys:['P'], view:[-4,-42,360,204], cur:null, pieces:{a, b:{...b, sel:true}, c}, steps:[
      {ms:1300}, ...press('P', {ports:false}), ...press('P', {ports:true})]};
  })();
  // Elevated track crossing over the ground: the other level fades to 20%.
  const level = (()=>{
    const a1 = S('S186', 20, 120), a2 = gestAttach('S186', a1, 1), up = {elev:[50, 50]};
    const b = {...S('S186', 206, 213, 270), ...up};
    const focus = (lv, title)=>press('V', {level:lv, tag:[title]});
    return {id:'level', keys:['V'], view:[0,-10,440,250], tag:['canvas.viewAllLevels.title'], cur:null, pieces:{a1, a2, b}, steps:[
      {ms:1300}, ...focus('ground', 'canvas.focusGround.title'), ...focus('elevated', 'canvas.focusElevated.title'),
      ...focus('all', 'canvas.viewAllLevels.title')]};
  })();

  return [
    {key:'view', demos:[pan, zoom, fit, ties, labels, ports, level]},
    {key:'find', demos:[search, headings]},
    {key:'build', demos:[chain, dup, gapFill, fills, expansion]},
    {key:'select', demos:[shiftClick, connected, extend, marquee]},
    {key:'drag', demos:[rotate, morph, flip, groupTurn, carry, cancel]},
    {key:'slopes', demos:[slope, slopeSteps]},
  ];
}

// Radius (px) and colour: an open end, the selected end, and while dragging
// the end held and the end it will join.
const GEST_DOT = {open:[6.5,'#3ddc84'], sel:[9,SELECTION_BLUE], src:[10,'#ffb347'], tgt:[10,'#ff5a5a']};
// Gradient Mode's arrows (forward, back) and its buttons beside a slope (as drawGradientChainOverlay).
const GEST_SLOPE_ARROW = {f:'#b967ff', b:'#8a4fd1'};
const GEST_SLOPE_BUTTON = {tick:['#3ddc84', 'M -5,0 L -1.5,4 L 5,-4'], cross:['#e05a5a', 'M -4,-4 L 4,4 M 4,-4 L -4,4']};
// One demo's card: the scene, the mouse and keys under it, and the caption.
// tick(now) draws the frame for that moment; reset() redraws from the start.
function buildGestCard(demo){
  const steps = demo.steps.flat();
  const first = {cur:demo.cur && [demo.cur.x, demo.cur.y], l:false, r:false, wheel:0, keys:[], pieces:demo.pieces, marks:{}, box:null, drag:false,
    cam:demo.cam||[0,0], zoom:demo.zoom||1, garrows:[], buttons:[], open:demo.open||{}, search:'',
    ties:!!demo.ties, labels:'limited', ports:true, level:'all', tag:demo.tag||null};
  const uid = ++gestUid;
  const states = [], ends = [];
  steps.reduce((s, step, i)=>{
    const pieces = {...s.pieces};
    Object.entries(step.pieces||{}).forEach(([id, v])=>{ if(v===null) delete pieces[id]; else pieces[id] = {...pieces[id], ...v}; });
    states.push({...s, ...step, pieces, wheel:step.wheel||0});
    ends.push((ends[i-1]||0) + step.ms);
    return states[i];
  }, first);
  const total = ends[ends.length-1] + GEST_REST_MS;
  const k = GEST_W/demo.view[2]; // px per mm

  const card = document.createElement('figure');
  card.className = 'gest-card';
  const stage = document.createElement('div');
  stage.className = 'gest-stage';
  const svg = el('svg', {viewBox:demo.view.join(' ')});
  const defs = el('defs',{}), tilesG = el('g',{}), layer = el('g',{}), over = el('g',{});
  svg.append(defs, tilesG, layer, over);
  // The palette, as real palette markup (shared CSS), under the scene's SVG
  // so the pointer stays on top. Not interactive: nothing is wired to it.
  const pal = demo.palette && document.createElement('div');
  const palGroups = [];
  let searchBox = null, searchX = null;
  if(pal){
    pal.className = 'gest-palette';
    pal.style.height = `${(GEST_W*demo.view[3]/demo.view[2])/demo.palette.scale}px`;
    if(demo.palette.search){
      const wrap = document.createElement('div');
      wrap.className = 'searchbox';
      searchBox = document.createElement('div');
      searchBox.className = 'gest-search';
      searchBox.dataset.placeholder = tr('palette.search.placeholder');
      searchX = document.createElement('span');
      searchX.className = 'gest-search-x';
      searchX.dataset.ref = 'x';
      searchX.textContent = '\u00d7';
      wrap.append(searchBox, searchX);
      pal.appendChild(wrap);
    }
    demo.palette.groups.forEach(({key, ids})=>{
      const group = document.createElement('div'), h = document.createElement('h2'), label = tr('palette.group.'+key);
      group.className = 'pgroup';
      group.dataset.ref = 'h:'+key;
      h.innerHTML = `<span class="chev">&#9660;</span>${label}`;
      group.appendChild(h);
      const buttons = ids.map(id=>{
        const t = TT[id], b = document.createElement('div');
        b.className = 'pbtn';
        b.dataset.ref = 'b:'+id;
        b.innerHTML = `<span class="pbtn-text">${paletteLabel(t)}<span class="code">${formatPieceCode(t)}</span></span>`;
        b.appendChild(buildPieceIcon(t));
        group.appendChild(b);
        // What the palette's own search matches on (applyPaletteFilter).
        return {b, hay:searchKey(`${t.label} ${t.catalogNo||''} ${t.partCode} ${label}`)};
      });
      palGroups.push({key, group, h, buttons});
      pal.appendChild(group);
    });
    stage.appendChild(pal);
  }
  const tiles = (demo.tiles||[]).map(t=>{
    const bg = el('rect', {x:t.x, y:t.y, width:t.w, height:t.h, rx:6, fill:'var(--surface)', stroke:'var(--panel-border)', 'stroke-width':1/k});
    const icon = buildPieceIcon(TT[t.typeId], t.w, t.h);
    icon.removeAttribute('class'); // its palette size would override the tile's
    icon.setAttribute('x', t.x); icon.setAttribute('y', t.y);
    tilesG.append(bg, icon);
    return {...t, bg};
  });
  // The mouse (buttons and wheel) and the demo's keys, lit while in use.
  const input = document.createElement('div');
  input.className = 'gest-input';
  const mouse = el('svg', {class:'gest-mouse', viewBox:'0 0 18 28'});
  const btnL = el('path', {d:'M1 11V9a8 8 0 0 1 8-8v10z'}), btnR = el('path', {d:'M17 11V9a8 8 0 0 0-8-8v10z'});
  mouse.append(el('rect', {x:1, y:1, width:16, height:26, rx:8}), btnL, btnR);
  const wheelBtn = el('rect', {x:7, y:4, width:4, height:6, rx:2});
  mouse.appendChild(wheelBtn);
  const wheelMark = document.createElement('span');
  wheelMark.className = 'gest-wheel';
  const kbds = demo.keys.map(key=>{ const kb = document.createElement('kbd'); kb.textContent = key; return kb; });
  input.append(mouse, wheelMark, ...kbds);
  const tagEl = document.createElement('div');
  tagEl.className = 'gest-tag';
  stage.append(svg, tagEl);
  const cap = document.createElement('figcaption');
  cap.innerHTML = `<strong>${tr(`gest.${demo.id}.title`)}</strong>${tr(`gest.${demo.id}.desc`)}`;
  card.append(stage, input, cap);

  const nodes = new Map(); // piece id -> {key, g}
  function showPalette(s){
    pal.style.transform = `scale(${stage.clientWidth/GEST_W*demo.palette.scale})`;
    const q = searchKey(s.search.trim());
    if(searchBox){ searchBox.textContent = s.search; searchX.style.display = q ? 'block' : 'none'; }
    // As in the palette: a search opens every group with a match and hides the rest.
    palGroups.forEach(({key, group, h, buttons})=>{
      let any = false;
      buttons.forEach(({b, hay})=>{ const match = !q || hay.includes(q); b.style.display = match ? '' : 'none'; any = any || match; });
      group.style.display = any ? '' : 'none';
      const collapsed = !q && s.open[key]===false;
      group.classList.toggle('collapsed', collapsed);
      h.classList.toggle('collapsed', collapsed);
    });
  }
  // Screen px in the stage to scene mm, and back.
  const mmPerPx = ()=>demo.view[2]/(stage.clientWidth || GEST_W);
  // Where a palette target was last seen stands in once it's hidden (the
  // search's × after clearing).
  const refSeen = {};
  function refPoint(ref){
    const target = pal.querySelector(`[data-ref="${ref}"]`);
    const e = ref[0]==='h' ? /** @type {HTMLElement} */ (target.firstChild) : target; // a group's heading
    const r = e.getBoundingClientRect(), sr = stage.getBoundingClientRect(), m = mmPerPx();
    if(!r.width) return refSeen[ref] || [demo.view[0], demo.view[1]];
    return refSeen[ref] = [demo.view[0] + (r.left + r.width*(ref[0]==='h' ? 0.35 : 0.5) - sr.left)*m, demo.view[1] + (r.top + r.height/2 - sr.top)*m];
  }
  function show(prev, s, f){
    const lerp = (a, b)=>a+(b-a)*f;
    if(pal) showPalette(s);
    const camX = lerp(prev.cam[0], s.cam[0]), camY = lerp(prev.cam[1], s.cam[1]);
    const zoom = lerp(prev.zoom, s.zoom), kz = k*zoom; // px per mm at this zoom
    svg.setAttribute('viewBox', `${demo.view[0]+camX} ${demo.view[1]+camY} ${demo.view[2]/zoom} ${demo.view[3]/zoom}`);
    // A piece glides only while its type and angle stay; a turn or a swap is
    // one notch, so it jumps, as on the canvas.
    const poses = Object.entries(s.pieces).map(([id, p])=>{
      const q = prev.pieces[id];
      return [id, (f<1 && q && q.typeId===p.typeId && q.rot===p.rot) ? {...p, ox:lerp(q.ox, p.ox), oy:lerp(q.oy, p.oy)} : p];
    });
    const box = s.box && prev.box && f<1 ? s.box.map((v, i)=>lerp(prev.box[i], v)) : s.box;
    const inBox = w=>box && w.x>=Math.min(box[0],box[2]) && w.x<=Math.max(box[0],box[2]) && w.y>=Math.min(box[1],box[3]) && w.y<=Math.max(box[1],box[3]);
    const portEnds = [];
    poses.forEach(([id, p])=>{
      if(!p.ghost) getPorts(TT[p.typeId]).forEach((port, i)=>portEnds.push({id, i, p, port, w:worldPoint(p, port)}));
    });
    const sel = new Set(poses.filter(([id, p])=>!p.ghost && (p.sel || portEnds.some(e=>e.id===id && inBox(e.w)))).map(([id])=>id));

    nodes.forEach((n, id)=>{ if(!s.pieces[id]){ n.g.remove(); nodes.delete(id); } });
    poses.forEach(([id, p])=>{
      const type = TT[p.typeId], on = sel.has(id);
      // Gradient Mode colours a slope by its steepness; out of it, a sloped
      // piece shades purple to pink up its height.
      const tone = p.tone!=null ? gradientToneColor(p.tone) : null;
      const key = `${p.typeId}|${on}|${p.ghost}|${markerFlipped(p.rot)}|${tone}|${p.elev}|${s.ties}|${s.labels}`;
      let n = nodes.get(id);
      if(!n || n.key!==key){
        // Ghosts as drawGapFillGhost and drawPaletteGhost draw them: 'loose'
        // is a palette piece not yet snapped.
        const loose = p.ghost==='loose';
        const g = el('g', {});
        let fill = tone;
        if(!fill && p.elev && p.elev[0]===p.elev[1]) fill = p.elev[0]>0 ? ROADBED_FILL_ELEVATED_FLAT : null;
        else if(!fill && p.elev){
          const gradId = `gest${uid}-${id}`;
          defs.querySelector(`#slopeFill-${gradId}`)?.remove();
          fill = buildSlopeFillGradient({id:gradId, portElev:p.elev}, type, defs, {min:0, max:GRADIENT_TARGET_MM});
        }
        drawPiece(g, type, p.ghost
          ? {roadbedFill:loose ? SELECTION_BLUE : ROADBED_FILL_SELECTED, roadbedStroke:SELECTION_BLUE, selected:true, railColor:'#e8eaed', worldRot:p.rot}
          : {roadbedFill:on ? ROADBED_FILL_SELECTED : fill || roadbedFillFor(type, false), roadbedStroke:on ? SELECTION_BLUE : ROADBED_EDGE_COLOR,
             railColor:type.ties || isStreetTrack(type) ? TIED_RAIL_COLOR : '#c7cdd6', worldRot:markerFlipped(p.rot) ? 180 : 0,
             selected:!!type.noRoadbed && on, ties:s.ties, lengthLabel:s.labels==='limited',
             printedFlip:s.labels==='printed' ? markerFlipped(p.rot + partLabelAngle(type)) : null});
        if(n) n.g.replaceWith(g); else layer.appendChild(g);
        n = {key, g};
        nodes.set(id, n);
      }
      n.g.setAttribute('transform', `translate(${p.ox},${p.oy}) rotate(${p.rot})`);
      n.g.setAttribute('opacity', p.ghost ? (p.ghost==='loose' ? 0.55 : 0.85) : elevOpacity(p.elev ? (p.elev[0]+p.elev[1])/2 : 0, s.level));
    });

    over.replaceChildren();
    // Labels: All, as drawPartLabels sizes them (without its crowding rule).
    if(s.labels==='all') poses.forEach(([id, p])=>{
      const type = TT[p.typeId], text = shortCode(type), reach = partLabelReach(type);
      const px = Math.min(PART_LABEL_PX*Math.max(1, kz), reach*kz*0.85/(text.length*PART_LABEL_CHAR_EM));
      if(p.ghost || px<PART_LABEL_MIN_PX) return;
      const at = worldPoint(p, pieceCenterLocal(type)), t = el('text', {x:0, y:0, 'text-anchor':'middle', 'dominant-baseline':'central',
        transform:`translate(${at.x},${at.y}) scale(${px/10/kz})`, fill:'#ffffff', stroke:'#000000', 'stroke-width':3, 'stroke-linejoin':'round',
        'paint-order':'stroke', 'font-size':10, 'font-weight':'700', 'font-family':UI_FONT});
      t.textContent = text;
      over.appendChild(t);
    });
    portEnds.forEach(e=>{
      const nb = portEnds.find(o=>o.id!==e.id && Math.hypot(o.w.x-e.w.x, o.w.y-e.w.y)<1);
      const mark = s.marks[`${e.id}:${e.i}`];
      if(!nb){
        if(!mark && !s.ports) return; // P hides the open ends, not the marked ones
        const [r, fill] = GEST_DOT[mark || 'open'];
        over.appendChild(el('circle', {cx:e.w.x, cy:e.w.y, r:r/kz, fill, stroke:'#0d1a12', 'stroke-width':1.5/kz}));
      } else if(s.ports && !s.drag && sel.has(e.id) && !sel.has(nb.id)){
        const {ax, ay, heading} = arrowAnchor(e.p, e.port);
        over.appendChild(el('polygon', {points:'-6,-7 8,0 -6,7', fill:'#ffb347', stroke:'#0d1a12', 'stroke-width':1,
          transform:`translate(${ax},${ay}) rotate(${heading}) scale(${1/kz})`}));
      }
    });
    const poseOf = Object.fromEntries(poses);
    s.garrows.forEach(([id, idx, kind])=>{
      const {ax, ay, heading} = arrowAnchor(poseOf[id], getPorts(TT[poseOf[id].typeId])[idx]);
      over.appendChild(el('polygon', {points:'-6,-7 8,0 -6,7', fill:GEST_SLOPE_ARROW[kind], stroke:'#0d1a12', 'stroke-width':1,
        transform:`translate(${ax},${ay}) rotate(${heading}) scale(${1/kz})`}));
    });
    s.buttons.forEach(([id, dy, kind])=>{
      const c = pieceCenterLocal(TT[poseOf[id].typeId]), at = worldPoint(poseOf[id], {x:c.x, y:c.y+dy});
      const [fill, d] = GEST_SLOPE_BUTTON[kind], g = el('g', {transform:`translate(${at.x},${at.y}) scale(${1/kz})`});
      g.append(el('circle', {r:12, fill, stroke:'#0d1a12', 'stroke-width':1.5}),
        el('path', {d, stroke:'#0d1a12', 'stroke-width':2.2, fill:'none', 'stroke-linecap':'round', 'stroke-linejoin':'round'}));
      over.appendChild(g);
    });
    if(box){
      over.appendChild(el('rect', {x:Math.min(box[0],box[2]), y:Math.min(box[1],box[3]), width:Math.abs(box[2]-box[0]), height:Math.abs(box[3]-box[1]),
        fill:SELECTION_BLUE, 'fill-opacity':'0.12', stroke:SELECTION_BLUE, 'stroke-width':1/kz, 'stroke-dasharray':`${4/kz} ${3/kz}`}));
    }
    tagEl.textContent = s.tag ? tr(...s.tag) : '';
    if(s.cur) showPointer();
    btnL.classList.toggle('on', s.l);
    btnR.classList.toggle('on', s.r);
    wheelBtn.classList.toggle('on', !!s.wheel);
    wheelMark.textContent = s.wheel>0 ? '\u25B2' : s.wheel<0 ? '\u25BC' : '';
    kbds.forEach(kb=>kb.classList.toggle('on', s.keys.includes(kb.textContent)));

    // The pointer, and what it's over in the palette.
    function showPointer(){
      const from = typeof prev.cur==='string' ? refPoint(prev.cur) : prev.cur, to = typeof s.cur==='string' ? refPoint(s.cur) : s.cur;
      const cx = lerp(from[0], to[0]), cy = lerp(from[1], to[1]);
      if(pal){
        const sr = stage.getBoundingClientRect(), m = mmPerPx(), px = sr.left + (cx-demo.view[0])/m, py = sr.top + (cy-demo.view[1])/m;
        pal.querySelectorAll('h2, .pbtn').forEach(e=>{ const r = e.getBoundingClientRect();
          e.classList.toggle('hover', px>=r.left && px<=r.right && py>=r.top && py<=r.bottom); });
      }
      tiles.forEach(t=>t.bg.setAttribute('fill', cx>=t.x && cx<=t.x+t.w && cy>=t.y && cy<=t.y+t.h ? 'var(--surface-hover)' : 'var(--surface)'));
      const pointer = el('g', {transform:`translate(${cx},${cy}) scale(${1/kz})`});
      if(s.l || s.r) pointer.appendChild(el('circle', {r:9, fill:'var(--accent)', 'fill-opacity':'0.3', stroke:'var(--accent)', 'stroke-width':1.5}));
      pointer.appendChild(el('path', {d:'M0 0V17l4.2-4 3 6.6 2.6-1.2-3-6.4H13z', fill:'#ffffff', stroke:'#111111', 'stroke-width':1.2, 'stroke-linejoin':'round'}));
      over.appendChild(pointer);
    }
  }
  // A held step is drawn once; a moving one every frame.
  /** @type {number|string} */
  let drawn = -1;
  const ease = f=>f<0.5 ? 2*f*f : 1-2*(1-f)*(1-f);
  return {card, text:searchKey(`${cap.textContent} ${demo.keys.join(' ')}`),
    reset(){ drawn = -1; },
    tick(now){
      const t = (now-gestStart) % total;
      const i = ends.findIndex(e=>t<e);
      if(i<0){ if(drawn!=='rest'){ show(states[states.length-1], states[states.length-1], 1); drawn = 'rest'; } return; }
      const step = steps[i];
      if(!step.move && drawn===i) return;
      show(i ? states[i-1] : first, states[i], step.move ? ease((t-(ends[i]-step.ms))/step.ms) : 1);
      drawn = i;
    }};
}
function openGestures(){
  gestOpen = true;
  document.getElementById('gestOverlay').style.display = 'flex';
  document.getElementById('gestBtn').setAttribute('aria-expanded','true');
  hidePreview();
  gestCards = [];
  const none = document.createElement('p');
  none.id = 'gestNone';
  none.textContent = tr('gest.search.none');
  document.getElementById('gestBody').replaceChildren(...gestDemos().flatMap(({key, demos})=>{
    const h = document.createElement('h3'), grid = document.createElement('div');
    h.textContent = tr(`gest.section.${key}`);
    grid.className = 'gest-grid';
    demos.forEach(demo=>{ const c = buildGestCard(demo); c.text += ' '+searchKey(h.textContent); gestCards.push(c); grid.appendChild(c.card); });
    return [h, grid];
  }), none);
  const search = document.getElementById('gestSearch');
  search.value = '';
  filterGestures();
  search.focus();
  gestStart = performance.now();
  // A card scrolled out of view (or filtered out) isn't drawn; back in view,
  // it redraws at once at the loop's current moment.
  const byCard = new Map(gestCards.map(c=>[c.card, c]));
  gestObserver = new IntersectionObserver(entries=>entries.forEach(en=>{
    const c = byCard.get(en.target);
    c.onScreen = en.isIntersecting;
    if(c.onScreen) c.reset();
  }), {root:document.getElementById('gestBody')});
  gestCards.forEach(c=>gestObserver.observe(c.card));
  const frame = now=>{ gestCards.forEach(c=>{ if(c.onScreen) c.tick(now); }); gestRaf = requestAnimationFrame(frame); };
  gestRaf = requestAnimationFrame(frame);
}
function closeGestures(){
  gestOpen = false;
  cancelAnimationFrame(gestRaf);
  if(gestObserver){ gestObserver.disconnect(); gestObserver = null; }
  document.getElementById('gestOverlay').style.display = 'none';
  document.getElementById('gestBtn').setAttribute('aria-expanded','false');
}
document.getElementById('gestBtn').addEventListener('click', openGestures);
document.getElementById('gestCloseBtn').addEventListener('click', closeGestures);
document.getElementById('gestOverlay').addEventListener('click', e=>{
  if(e.target.id==='gestOverlay') closeGestures();
});
// The footer's link (inside a string, so delegated) swaps to the User guide.
document.getElementById('gestFoot').addEventListener('click', e=>{
  if(!e.target.closest('#gestHelpLink')) return;
  e.preventDefault();
  closeGestures();
  openHelp();
});
// Every word typed must appear in a card's title, caption, keys or section;
// a section with no card left hides its heading too.
function filterGestures(){
  const words = searchKey(document.getElementById('gestSearch').value).split(/\s+/).filter(Boolean);
  let any = false;
  document.querySelectorAll('#gestBody .gest-grid').forEach(grid=>{
    let shown = 0;
    gestCards.forEach(c=>{
      if(c.card.parentNode!==grid) return;
      const match = words.every(w=>c.text.includes(w));
      c.card.hidden = !match;
      if(match) shown++;
    });
    grid.hidden = /** @type {HTMLElement} */ (grid.previousElementSibling).hidden = !shown;
    any = any || shown>0;
  });
  document.getElementById('gestNone').hidden = any;
}
document.getElementById('gestSearch').addEventListener('input', filterGestures);
// Escape clears a search first, then closes.
function gestKeys(e){
  if(e.key!=='Escape') return;
  const search = document.getElementById('gestSearch');
  if(search.value){ search.value = ''; filterGestures(); }
  else closeGestures();
}

