/* ============================================================
   GRADIENT MODE
   Grades an existing connected run of gradeable pieces from ground to
   GRADIENT_TARGET_MM (or back down), judged against Kato's 4% standard.
   Never creates, moves or connects track: it walks an existing run and
   assigns elevations.
   ============================================================ */
let gradientTool = null; // null when inactive, else {chain:[{pieceId, entrySide}]}; entrySide is the downhill side, null on chain[0] until a direction is chosen
// Gradient Mode is fully modal: every action that can edit the layout or spawn
// a piece checks this (palette drop and click-attach, port click/double-click,
// tabletop drag and unlock, add tabletop). Piece drags and the marquee are
// blocked elsewhere. Panning and zooming stay live.
function blocksOtherEditing(){
  return interactionMode==='gradient';
}
let gradientSelectedGroup = null; // clicked existing slope's piece ids (idle), for the delete icon and panel detail
const GRADIENT_TARGET_MM = 50; // Kato's standard elevated height: one gradient's climb. The ceiling is ELEV_MAX_MM.
// The user's slope limit (Settings; KATO's standard 4% unless changed). The
// scale is solid red at or past 1.5× it, solid deep at or under half of it,
// and interpolates between; the steep warning shows from 1.5×.
const SLOPE_LIMIT_KEY = 'katoUnitrackPlanner.slopeLimit.v1';
const SLOPE_LIMITS = [2, 3, 4, 5];
let gradientTargetPct, gradientRedPct, gradientDeepPct;
function setSlopeLimit(pct){
  gradientTargetPct = pct; gradientRedPct = pct*1.5; gradientDeepPct = pct/2;
}
setSlopeLimit(4);
try{ const saved = +localStorage.getItem(SLOPE_LIMIT_KEY); if(SLOPE_LIMITS.includes(saved)) setSlopeLimit(saved); }catch(err){}
const slopeLimitText = ()=>gradientTargetPct===4 ? 'Kato\'s 4% standard' : `your ${gradientTargetPct}% limit`;
function gradientChainRun(){
  if(!gradientTool) return 0;
  return gradientTool.chain.reduce((sum,c)=>sum + pieceNominalLength(pieceType(c.pieceId)), 0);
}
// The start piece's elevation on its low side; only used to decide direction.
// confirmGradient always writes a clean 0↔GRADIENT_TARGET_MM run.
function gradientChainStartElev(){
  const start = gradientTool.chain[0];
  const startPiece = pieces[start.pieceId];
  const startGroups = gradeablePortGroups(TT[startPiece.typeId]);
  const startSide = start.entrySide==null ? 0 : start.entrySide;
  return startPiece.portElev[startGroups[startSide][0]];
}
function gradientPercentFor(run){
  return run<=0 ? Infinity : GRADIENT_TARGET_MM/run*100;
}
function lerpRGB(c1, c2, t){
  const lerp=(a,b)=>Math.round(a+(b-a)*t);
  return `rgb(${lerp(c1[0],c2[0])},${lerp(c1[1],c2[1])},${lerp(c1[2],c2[2])})`;
}
let currentTheme = 'default';
const GRADIENT_COLOR_RED = [255,107,107];  // --danger
const GRADIENT_COLOR_GREEN = [61,220,132];  // --open-port
const GRADIENT_COLOR_DEEP = [16,66,40]; // dark, but still reads as green
// Colourblind theme's mid/deep points. Steep stays red in every theme: red
// alone, unpaired with green, carries no risk.
const GRADIENT_COLOR_CB_MID = [240,228,66];  // Okabe-Ito yellow
const GRADIENT_COLOR_CB_DEEP = [20,40,80]; // dark navy, distinct from the selection blue by lightness too
function currentGradientColors(){
  if(currentTheme==='colourblind') return {red:GRADIENT_COLOR_RED, mid:GRADIENT_COLOR_CB_MID, deep:GRADIENT_COLOR_CB_DEEP};
  return {red:GRADIENT_COLOR_RED, mid:GRADIENT_COLOR_GREEN, deep:GRADIENT_COLOR_DEEP};
}
function gradientToneColor(pct){
  // At KATO's 4%: ≥6% solid red; 6→4% red→mid; 4→2% mid→deep; ≤2% solid deep.
  // Colours depend on the theme.
  const {red, mid, deep} = currentGradientColors();
  if(pct>=gradientRedPct) return `rgb(${red.join(',')})`;
  if(pct>=gradientTargetPct){
    const t = (gradientRedPct-pct)/(gradientRedPct-gradientTargetPct);
    return lerpRGB(red, mid, t);
  }
  if(pct>=gradientDeepPct){
    const t = (gradientTargetPct-pct)/(gradientTargetPct-gradientDeepPct);
    return lerpRGB(mid, deep, t);
  }
  return `rgb(${deep.join(',')})`;
}
// Walks out through connected, sloped, gradeable pieces; flat pieces bound the
// group. A confirmed gradient re-scans as exactly one group.
function findSlopeGroup(startPieceId){
  const group = new Set();
  const stack = [startPieceId];
  while(stack.length){
    const pid = stack.pop();
    if(group.has(pid)) continue;
    const piece = pieces[pid];
    if(!piece) continue;
    const type = TT[piece.typeId];
    if(!isSlopedPiece(piece, type)) continue;
    group.add(pid);
    getPorts(type).forEach((p,idx)=>{
      const nb = getConnectedNeighbor(pid, idx);
      if(nb && !group.has(nb.pieceId)) stack.push(nb.pieceId);
    });
  }
  return group;
}
function findAllSlopeGroups(){
  const seen = new Set();
  const groups = [];
  Object.keys(pieces).forEach(pid=>{
    if(seen.has(pid)) return;
    const type = pieceType(pid);
    if(!isSlopedPiece(pieces[pid], type)) return;
    const group = findSlopeGroup(pid);
    group.forEach(id=>seen.add(id));
    groups.push(group);
  });
  return groups;
}
// Each group is scored as a standalone gradient, as if it must climb the full
// GRADIENT_TARGET_MM over its own run: a fragment of a climb reads as steep,
// which is the useful answer. slopeGroupRun is the run alone, for the side
// panel.
function slopeGroupRun(group){
  return [...group].reduce((sum,pid)=>sum+pieceNominalLength(pieceType(pid)), 0);
}
function slopeGroupPercent(group){
  return gradientPercentFor(slopeGroupRun(group));
}
// Per-group elevation spans, so the slope fill is normalised per group.
function slopeGroupRanges(groups){
  const byPiece = new Map();
  groups.forEach(group=>{
    let mn=Infinity, mx=-Infinity;
    group.forEach(pid=>pieces[pid].portElev.forEach(e=>{
      if(e<mn) mn=e;
      if(e>mx) mx=e;
    }));
    group.forEach(pid=>byPiece.set(pid, {min:mn, max:mx}));
  });
  return byPiece;
}
function deleteSlopeGroup(group){
  if(!group || group.size===0) return;
  pushHistory();
  group.forEach(pid=>{
    const piece = pieces[pid];
    if(!piece) return;
    piece.portElev = piece.portElev.map(()=>0);
  });
  // Break external connections now at mismatched heights; internal ones all
  // dropped together.
  group.forEach(pid=>{
    const piece = pieces[pid];
    if(!piece) return;
    const type = TT[piece.typeId];
    getPorts(type).forEach((port,idx)=>{
      const nb = getConnectedNeighbor(pid, idx);
      if(!nb || group.has(nb.pieceId)) return;
      if(pieces[nb.pieceId].portElev[nb.portIdx] !== 0){
        disconnectPort(pid, idx);
      }
    });
  });
  joinMeetingEnds([...group]);
  gradientSelectedGroup = null;
  updateGradientUI(); // the panel was showing this slope's details
  invalidate();
  scheduleAutosave();
}
function updateGradientUI(){
  const btn = document.getElementById('gradientBtn');
  const info = document.getElementById('gradientInfo');
  const heading = document.getElementById('gradientHeading');
  if(!gradientTool){
    btn.innerHTML = tr('gradient.modeBtn.start');
    btn.classList.add('neutral'); // neutral to start; the red default while it's the way out
    info.textContent = '';
    info.style.display = 'none';
    heading.style.display = 'none';
    return;
  }
  btn.innerHTML = tr('gradient.modeBtn.exit');
  btn.classList.remove('neutral');
  info.style.display = '';
  heading.style.display = '';
  const chain = gradientTool.chain;
  if(chain.length>0){
    const run = gradientChainRun();
    const pct = gradientPercentFor(run);
    const pctText = isFinite(pct) ? pct.toFixed(1)+'%' : '\u2014';
    info.innerHTML = tr('gradient.info.chain', chain.length, fmtLen(run), pctText);
  } else if(gradientSelectedGroup && gradientSelectedGroup.size>0){
    // A selected slope: same summary as a chain in progress, but the
    // instruction is delete or deselect.
    const run = slopeGroupRun(gradientSelectedGroup);
    const pct = gradientPercentFor(run);
    const pctText = isFinite(pct) ? pct.toFixed(1)+'%' : '\u2014';
    info.innerHTML = tr('gradient.info.selected', gradientSelectedGroup.size, fmtLen(run), pctText);
  } else {
    info.textContent = tr(currentTheme==='colourblind' ? 'gradient.info.idleExisting.colourblind' : 'gradient.info.idleExisting');
  }
}
function startGradientTool(){
  // Off while Power View colours the track (its button is greyed); G says why.
  if(powerView){ flashHint(tr('gradient.blockedByPower')); renderSelection(); return; }
  if(!beginInteraction('gradient')) return;
  gradientTool = {chain: []};
  setSelection();
  document.getElementById('canvasWrap').style.cursor = 'crosshair';
  updateGradientUI();
  invalidate();
}
// Leaves Gradient Mode without rendering, for callers about to render anyway.
function resetGradientTool(){
  gradientTool = null;
  endInteraction('gradient');
  gradientSelectedGroup = null;
  document.getElementById('canvasWrap').style.cursor = '';
  updateGradientUI();
}
function cancelGradientTool(){
  resetGradientTool();
  invalidate();
}
// Gradeable and not already sloped, so a gradient can't be laid over an
// existing one.
function isGradeableForChain(pieceId){
  const piece = pieces[pieceId];
  if(!piece) return false;
  const type = TT[piece.typeId];
  if(!gradeablePortGroups(type)) return false;
  return !isSlopedPiece(piece, type);
}
// True if a connected neighbour other than `excludePieceId` (normally the chain
// tip) belongs to a different confirmed slope. Keeps a flat piece between any
// two gradients.
function hasForeignSlopedNeighbor(pieceId, excludePieceId){
  const piece = pieces[pieceId];
  if(!piece) return false;
  const type = TT[piece.typeId];
  return getPorts(type).some((port,idx)=>{
    const nb = getConnectedNeighbor(pieceId, idx);
    if(!nb || nb.pieceId===excludePieceId) return false;
    const nbPiece = pieces[nb.pieceId];
    return nbPiece && isSlopedPiece(nbPiece, TT[nbPiece.typeId]);
  });
}
// Before a chain exists: a gradeable flat piece starts one; a sloped piece is
// selected (details in the panel, delete icon on canvas); anything else
// explains why it can't be graded. Every branch clears the previous selection.
function handleGradientPieceClick(pieceId){
  if(gradientTool.chain.length>0){ gradientChainTo(pieceId); return; }
  gradientSelectedGroup = null;
  const type = pieceType(pieceId);
  if(!gradeablePortGroups(type)){
    document.getElementById('gradientInfo').textContent = tr('gradient.info.notGradeable');
    return;
  }
  if(isSlopedPiece(pieces[pieceId], type)){
    gradientSelectedGroup = findSlopeGroup(pieceId);
    updateGradientUI();
    invalidate();
    return;
  }
  if(hasForeignSlopedNeighbor(pieceId, null)){
    document.getElementById('gradientInfo').textContent = tr('gradient.info.adjacentToExisting');
    return;
  }
  gradientTool.chain.push({pieceId, entrySide:null});
  updateGradientUI();
  invalidate();
}
// Where a click on a piece could take the chain: from the tip, each piece the
// arrows could reach one step at a time, with those steps. A gradeable piece
// has two ends and a step needs a single neighbour, so each direction is one
// straight walk under the arrows' rules. A lone start piece has no direction
// yet, so both are walked; a piece reachable both ways (round a loop) is
// `ambiguous`, and the arrows must choose.
function gradientReach(){
  const chain = gradientTool.chain, tip = chain[chain.length-1];
  const inChain = new Set(chain.map(c=>c.pieceId)), reach = new Map();
  (tip.entrySide==null ? [0, 1] : [1-tip.entrySide]).forEach(side=>{
    let cur = tip.pieceId, exit = side;
    const steps = [], seen = new Set(inChain);
    for(;;){
      const nb = groupNeighbor(cur, gradeablePortGroups(pieceType(cur))[exit]);
      if(!nb || seen.has(nb.pieceId) || !isGradeableForChain(nb.pieceId) || hasForeignSlopedNeighbor(nb.pieceId, cur)) break;
      const entry = gradeablePortGroups(pieceType(nb.pieceId)).findIndex(g=>g.includes(nb.portIdx));
      steps.push({pieceId:nb.pieceId, entrySide:entry});
      seen.add(nb.pieceId);
      reach.set(nb.pieceId, reach.has(nb.pieceId) ? {ambiguous:true} : {side, steps:steps.slice()});
      cur = nb.pieceId; exit = 1-entry;
    }
  });
  return reach;
}
// A click on a piece once a chain is started: one further along extends the
// chain to it, one already in it shortens the chain to end there. Anything
// else says why not.
function gradientChainTo(pieceId){
  const chain = gradientTool.chain, at = chain.findIndex(c=>c.pieceId===pieceId);
  const info = document.getElementById('gradientInfo');
  if(at>=0){
    if(at===chain.length-1) return;
    chain.length = at+1;
    if(chain.length===1) chain[0].entrySide = null; // a lone start piece again: both directions open
  } else {
    const r = gradientReach().get(pieceId);
    if(!r){ info.textContent = tr('gradient.info.noPath'); return; }
    if(r.ambiguous){ info.textContent = tr('gradient.info.bothWays'); return; }
    const tip = chain[chain.length-1];
    if(tip.entrySide==null) tip.entrySide = 1-r.side; // as an arrow click locks it
    chain.push(...r.steps);
  }
  updateGradientUI();
  invalidate();
}
// The one neighbouring piece on a side; null if none, or if two different
// pieces (ambiguous).
function groupNeighbor(pieceId, group){
  let found = null;
  for(const portIdx of group){
    const nb = getConnectedNeighbor(pieceId, portIdx);
    if(!nb) continue;
    if(found && found.pieceId!==nb.pieceId) return null;
    if(!found) found = nb;
  }
  return found;
}
// Arrows at the chain tip: forward, plus backward once the direction is fixed.
function gradientArrowCandidates(){
  if(!gradientTool || gradientTool.chain.length===0) return [];
  const tip = gradientTool.chain[gradientTool.chain.length-1];
  const tipPiece = pieces[tip.pieceId];
  const type = TT[tipPiece.typeId];
  const ports = getPorts(type);
  const groups = gradeablePortGroups(type);
  const headingOf = idx => worldHeading(tipPiece, ports[idx].heading);
  // Never offer a piece already in the chain, or a closed loop lets the chain
  // circle forever.
  const chainIds = new Set(gradientTool.chain.map(c=>c.pieceId));
  const result = [];
  if(tip.entrySide==null){
    // direction not chosen yet: offer every connected, gradeable side
    groups.forEach((group,side)=>{
      const nb = groupNeighbor(tip.pieceId, group);
      if(!nb) return;
      if(!isGradeableForChain(nb.pieceId) || chainIds.has(nb.pieceId) || hasForeignSlopedNeighbor(nb.pieceId, tip.pieceId)) return;
      const reprPort = group.find(idx=>getConnectedNeighbor(tip.pieceId, idx));
      result.push({pieceId:tip.pieceId, portIdx:reprPort, side, kind:'forward', heading:headingOf(reprPort)});
    });
  } else {
    const forwardSide = 1-tip.entrySide;
    const forwardGroup = groups[forwardSide];
    const nb = groupNeighbor(tip.pieceId, forwardGroup);
    if(nb && isGradeableForChain(nb.pieceId) && !chainIds.has(nb.pieceId) && !hasForeignSlopedNeighbor(nb.pieceId, tip.pieceId)){
      const reprPort = forwardGroup.find(idx=>getConnectedNeighbor(tip.pieceId, idx));
      result.push({pieceId:tip.pieceId, portIdx:reprPort, side:forwardSide, kind:'forward', heading:headingOf(reprPort)});
    }
    const entryGroup = groups[tip.entrySide];
    const reprEntryPort = entryGroup.find(idx=>getConnectedNeighbor(tip.pieceId, idx));
    if(reprEntryPort!=null){
      result.push({pieceId:tip.pieceId, portIdx:reprEntryPort, side:tip.entrySide, kind:'backward', heading:headingOf(reprEntryPort)});
    }
  }
  return result;
}
function handleGradientArrowClick(cand){
  if(cand.kind==='backward'){ popGradientChain(); return; }
  const tip = gradientTool.chain[gradientTool.chain.length-1];
  const type = pieceType(tip.pieceId);
  const group = gradeablePortGroups(type)[cand.side];
  const nb = groupNeighbor(tip.pieceId, group);
  if(!nb) return; // defensive: the layout changed since this arrow was drawn
  if(tip.entrySide==null){
    tip.entrySide = 1-cand.side; // lock direction: the other side is now this piece's low side
  }
  const nbType = pieceType(nb.pieceId);
  const nbSide = gradeablePortGroups(nbType).findIndex(g=>g.includes(nb.portIdx));
  gradientTool.chain.push({pieceId:nb.pieceId, entrySide:nbSide});
  updateGradientUI();
  invalidate();
}
// Drops the whole chain, staying in Gradient Mode (the cancel cross, Delete).
function clearGradientChain(){
  if(!gradientTool || gradientTool.chain.length===0) return;
  gradientTool.chain = [];
  updateGradientUI();
  invalidate();
}
function popGradientChain(){
  if(!gradientTool || gradientTool.chain.length===0) return;
  gradientTool.chain.pop();
  if(gradientTool.chain.length===1) gradientTool.chain[0].entrySide = null; // back to a lone start piece: reopen both directions
  updateGradientUI();
  invalidate();
}
// After pieces change height (a confirmed or deleted slope, Elevate / Lower
// Selection): their open ends that now meet another end at the same height
// join it, as a drop's loop closure would. One piece at a time, so pieces in
// `ids` that meet each other join too (findLoopClosures only looks outside
// its group).
function joinMeetingEnds(ids){
  ids.forEach(id=>findLoopClosures(new Set([id]))
    .forEach(c=>{ if(isOpen(c.sourcePieceId, c.sourcePortIdx) && isOpen(c.pieceId, c.portIdx)) connectPorts(c); }));
}
// Direction is inferred: a piece off the floor got there by a prior gradient,
// so a chain starting there goes back down.
function confirmGradient(){
  if(!gradientTool || gradientTool.chain.length===0) return;
  const chain = gradientTool.chain;
  const totalRun = gradientChainRun();
  const descending = gradientChainStartElev()>0;
  pushHistory();
  let cum = 0;
  chain.forEach(c=>{
    const piece = pieces[c.pieceId];
    const type = TT[piece.typeId];
    const groups = gradeablePortGroups(type);
    const entrySide = c.entrySide==null ? 0 : c.entrySide; // a single-piece run never chose a direction: side 0 low, side 1 high
    const exitSide = 1-entrySide;
    const len = pieceNominalLength(type);
    const fracBefore = cum/totalRun;
    cum += len;
    const fracAfter = cum/totalRun;
    const elevEntry = descending ? GRADIENT_TARGET_MM*(1-fracBefore) : GRADIENT_TARGET_MM*fracBefore;
    const elevExit = descending ? GRADIENT_TARGET_MM*(1-fracAfter) : GRADIENT_TARGET_MM*fracAfter;
    groups[entrySide].forEach(idx=>{ piece.portElev[idx] = elevEntry; });
    groups[exitSide].forEach(idx=>{ piece.portElev[idx] = elevExit; });
  });
  joinMeetingEnds(chain.map(c=>c.pieceId));
  resetGradientTool();
  invalidate();
  scheduleAutosave();
}
document.getElementById('gradientBtn').addEventListener('click', ()=>{
  gradientTool ? cancelGradientTool() : startGradientTool();
});
// Elevate / Lower Selection: every selected piece flat at GRADIENT_TARGET_MM,
// the top of a gradient, without building one; or, when all of them are
// already there, flat on the ground. A mixed selection goes up. Joins to
// unselected track now at another height are broken, as deleting a slope
// breaks them; open ends that now meet track at their new height join it
// (joinMeetingEnds), so raising and lowering again rejoins what it broke.
function selectionAllElevated(){
  const ids = [...selectedPieces].filter(id=>pieces[id] && !snapsByPose(pieceType(id)));
  return ids.length>0 && ids.every(id=>pieces[id].portElev.every(e=>e===GRADIENT_TARGET_MM));
}
function toggleSelectionElevation(){
  if(interactionMode!=='idle') return;
  const ids = [...selectedPieces].filter(id=>pieces[id] && !snapsByPose(pieceType(id))); // platforms and road plates stay on the ground
  if(!ids.length) return;
  const elev = selectionAllElevated() ? 0 : GRADIENT_TARGET_MM;
  pushHistory();
  ids.forEach(id=>{ pieces[id].portElev = pieces[id].portElev.map(()=>elev); });
  ids.forEach(id=>getPorts(pieceType(id)).forEach((_, idx)=>{
    const nb = getConnectedNeighbor(id, idx);
    if(nb && !selectedPieces.has(nb.pieceId) && Math.abs(pieces[nb.pieceId].portElev[nb.portIdx] - elev) > LOOP_CLOSE_ELEV_MM){
      disconnectPort(id, idx);
    }
  }));
  joinMeetingEnds(ids);
  invalidate();
  scheduleAutosave();
}
document.getElementById('elevateBtn').addEventListener('click', toggleSelectionElevation);
function headingDiff(a,b){
  const d = Math.abs(a-b) % 360;
  return d>180 ? 360-d : d;
}
// , and . (or < and >, the same keys shifted) trigger an extend arrow, leaving
// the arrow keys free. Two keys can't name a direction, so they rank the
// arrows along one screen axis: , takes the one facing furthest left/up, .
// the one facing furthest right/down. Left counts over up (and right over
// down), so a run across the screen and one down it both split cleanly.
// A lone arrow answers only the key on its own side.
const STEP_KEY_SIGN = {',':-1, '<':-1, '.':1, '>':1};
function pickStepCandidateForKey(candidates, key){
  const sign = STEP_KEY_SIGN[key];
  if(sign==null || candidates.length===0) return null;
  const score = c=>{ const h = deg2rad(c.heading); return Math.cos(h) + 0.5*Math.sin(h); };
  if(candidates.length===1) return Math.sign(score(candidates[0]))===sign ? candidates[0] : null;
  return candidates.reduce((best, c)=>sign*score(c) > sign*score(best) ? c : best);
}
function getFloodArrowCandidates(){
  if(interactionMode!=='idle') return [];
  const result = [];
  selectedPieces.forEach(pieceId=>{
    const piece = pieces[pieceId];
    if(!piece) return;
    const type = TT[piece.typeId];
    getPorts(type).forEach((pp,idx)=>{
      const neighbor = getConnectedNeighbor(pieceId, idx);
      if(!(neighbor && !selectedPieces.has(neighbor.pieceId))) return;
      result.push({pieceId, idx, neighborPieceId:neighbor.pieceId, heading:worldHeading(piece, pp.heading)});
    });
  });
  return result;
}
function triggerFloodArrow(cand){
  selectBeyond(cand.neighborPieceId);
  invalidate();
}
// Gradient Mode's keys (a layer of onKeyDown, which swallows every other
// shortcut but WASD panning while it's active): Escape/G exit, Enter confirms, Delete removes
// the selected slope (idle), Ctrl+Z removes the last chain piece, , and .
// trigger the purple arrow facing left/up or right/down (pickStepCandidateForKey),
// adding or removing as it points. Wheel isn't blocked.
function gradientKeys(e){
  if(e.key==='Escape' || e.key.toLowerCase()==='g'){ cancelGradientTool(); return; }
  if(e.key==='Enter'){
    if(gradientTool.chain.length>0) confirmGradient(); // same as the tick; nothing to confirm on an empty chain
    e.preventDefault();
    return;
  }
  if(e.key==='Delete' || e.key==='Backspace'){
    // same as the cancel cross while building a chain; idle with a slope
    // selected, the same as the trash icon
    if(gradientTool.chain.length>0) clearGradientChain();
    else if(gradientSelectedGroup) deleteSlopeGroup(gradientSelectedGroup);
    e.preventDefault();
    return;
  }
  const k = e.key.toLowerCase();
  if((e.ctrlKey||e.metaKey) && !e.shiftKey && k==='z'){
    popGradientChain();
    e.preventDefault();
    return;
  }
  if(STEP_KEY_SIGN[e.key]!=null && !e.ctrlKey && !e.metaKey && !e.altKey){
    const cand = pickStepCandidateForKey(gradientArrowCandidates(), e.key);
    if(cand) handleGradientArrowClick(cand);
    e.preventDefault();
  }
}
// , and . flood-select beyond the selection's end facing left/up or
// right/down (an app-shortcut layer of onKeyDown).
function floodArrowKeys(e){
  if(e.ctrlKey || e.metaKey || e.altKey) return;
  if(STEP_KEY_SIGN[e.key]==null) return;
  const cand = pickStepCandidateForKey(getFloodArrowCandidates(), e.key);
  if(cand){ triggerFloodArrow(cand); e.preventDefault(); }
}

