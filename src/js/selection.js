/* ============================================================
   SELECTION
   Selection setters (each clears the other selection kinds), double-click
   duplicate/attach, flood extension, and the side panel's selection text.
   ============================================================ */
function selectPort(pieceId, portIdx){
  setSelection({port:{pieceId, portIdx}});
  invalidate();
}
// Which of a new double-track piece's ports mates with the clicked port. It
// depends on which corner was clicked, so try each and keep the one where a
// second port also lands on the existing piece's open, compatible port: both
// rails must connect.
function findDoubleTrackSourcePort(newType, existingType, clickedPortIdx, existingPiece){
  const existingLocalPorts = getPorts(existingType);
  const newLocalPorts = getPorts(newType);
  const target = {pos: worldPoint(existingPiece, existingLocalPorts[clickedPortIdx]),
    heading: worldHeading(existingPiece, existingLocalPorts[clickedPortIdx].heading)};
  for(let srcPort=0; srcPort<newLocalPorts.length; srcPort++){
    const candidate = placeAttached(newType, srcPort, target);
    for(let np=0; np<newLocalPorts.length; np++){
      if(np===srcPort) continue;
      const npWorld = worldPoint(candidate, newLocalPorts[np]);
      for(let op=0; op<existingLocalPorts.length; op++){
        if(op===clickedPortIdx || !isOpen(existingPiece.id, op)) continue;
        if(!portsCompatible(newType, np, existingType, op)) continue;
        const opWorld = worldPoint(existingPiece, existingLocalPorts[op]);
        if(Math.hypot(npWorld.x-opWorld.x, npWorld.y-opWorld.y)<0.01) return srcPort;
      }
    }
  }
  return 0; // defensive fallback; a well-formed double-track type never gets here
}
// Attach newTypeId to an open port. Shared by palette click-to-attach and
// duplicate-at-port. Also connects any other port pair that coincides, so a
// double-track piece's second rail joins too. Returns the new id and whichever
// of its ports is still open.
function attachPieceAt(newTypeId, atPieceId, atPortIdx){
  const newType = TT[newTypeId];
  const atPiece = pieces[atPieceId];
  const existingType = TT[atPiece.typeId];
  const newPorts = getPorts(newType);
  // Which new port mates. For a 2-port piece, the opposite end to the one
  // clicked: attaching port 0 onto an existing port 0 would land it turned into
  // an S-kink. If that guess isn't compatible (a connector's narrow end only
  // fits a wedge), try the other end.
  let sourcePortIdx;
  if(newPorts.length===2){
    const guess = atPortIdx===0 ? 1 : 0;
    sourcePortIdx = portsCompatible(newType, guess, existingType, atPortIdx) ? guess : 1-guess;
  }
  else if(newPorts.length===4 && gradeablePortGroups(newType)) sourcePortIdx = findDoubleTrackSourcePort(newType, existingType, atPortIdx, atPiece);
  else sourcePortIdx = 0;
  const newId = spawnAttached(newTypeId, sourcePortIdx, atPieceId, atPortIdx);
  if(!newId) return {newId:null, sourcePortIdx:null, openPortIdx:null};
  const primary = {sourcePieceId:newId, sourcePortIdx, pieceId:atPieceId, portIdx:atPortIdx};
  findLoopClosures(new Set([newId]), primary).forEach(connectPorts);
  const openIdx = newPorts.findIndex((p,idx)=>isOpen(newId, idx));
  return {newId, sourcePortIdx, openPortIdx: openIdx>=0 ? openIdx : null};
}
function duplicateAtPort(pieceId, portIdx){
  const type = pieceType(pieceId);
  if(stockBlocks([type.id], [])){ invalidate(); return; }
  const before = snapshotState();
  const {newId, openPortIdx} = attachPieceAt(type.id, pieceId, portIdx);
  if(newId){
    pushHistory(before);
    selectedPort = openPortIdx!=null ? {pieceId:newId, portIdx:openPortIdx} : null;
  }
  invalidate();
}
// Wedges ring-snapped onto this turntable, found geometrically (ring-snap
// leaves no connection). Clicking the turntable selects them too, so the
// assembly moves as one.
function attachedWedgeIds(turntableId){
  const tt = pieces[turntableId];
  if(!tt || TT[tt.typeId].cat!=='turntableBridge') return [];
  const pit = worldPoint(tt, {x:TT[tt.typeId].length/2, y:0});
  return Object.values(pieces)
    .filter(p=>TT[p.typeId].cat==='turntableWedge'
      && Math.hypot(worldPoint(p,{x:TURNTABLE_OUTER_R,y:0}).x-pit.x,
                    worldPoint(p,{x:TURNTABLE_OUTER_R,y:0}).y-pit.y) < 0.5)
    .map(p=>p.id);
}
function selectOnlyPiece(id){
  const type = pieces[id] && pieceType(id);
  setSelection({ids: type && type.cat==='turntableBridge' ? [id, ...attachedWedgeIds(id)] : [id]});
  invalidate();
}
// A locked box only gets here via its padlock, which unlocks it first.
function selectOnlyBox(id){
  setSelection({box:id});
  invalidate();
}
function selectAllPieces(){
  setSelection({ids:Object.keys(pieces)});
  invalidate();
}
// Double-click: extend through every port whose neighbour isn't selected, as if
// clicking every arrow.
function extendBothWays(id){
  getPorts(pieceType(id)).forEach((_,idx)=>{
    const neighbor = getConnectedNeighbor(id, idx);
    if(neighbor && !selectedPieces.has(neighbor.pieceId)) selectBeyond(neighbor.pieceId);
  });
  invalidate();
}
// Adds everything joined beyond `pieceId` to the selection, as far as the
// selection itself (an extend arrow).
function selectBeyond(pieceId){
  floodBeyond(pieceId, selectedPieces).forEach(id=>selectedPieces.add(id));
}

function renderSelection(){
  const del = document.getElementById('deleteBtn');
  const selInfo = document.getElementById('selInfo');
  const empty = Object.keys(pieces).length===0;
  const partsBtn = document.getElementById('partsBtn');
  partsBtn.textContent = tr(selectedPieces.size>0 ? 'parts.btn.selection' : 'parts.btn.layout');
  partsBtn.disabled = empty;
  const pngBtn = document.getElementById('pngBtn');
  pngBtn.disabled = empty;
  pngBtn.textContent = tr(pngSelectionOnly() ? 'png.btn.selection' : 'png.btn');
  if(selectedPort){
    setStateHint('', tr('hover.c6'));
    // Never the internal typeId; some (S45H, T4-L) are on no real part.
    const pt = pieceType(selectedPort.pieceId);
    selInfo.innerHTML = tr('selection.openPort', pt.label, formatPieceCode(pt));
    del.disabled = true;
  } else if(selectedPieces.size>0){
    // Same wording as hovering the selection, so each situation has one message.
    const only = selectedPieces.size===1 && pieces[[...selectedPieces][0]];
    setStateHint('', only ? tr('hover.c3', canMutate(only.typeId), canFlip(only.typeId)) : tr('hover.c4'));
    // Its track length, measured as the Layout section's is, in a row like
    // the Layout section's.
    let len = 0;
    selectedPieces.forEach(id=>{ if(pieces[id]) len += pieceNominalLength(pieceType(id)); });
    const lengthRow = tr('selection.length', tr('stat.length.label'), fmtLen(len));
    if(selectedPieces.size===1){
      const type = pieceType([...selectedPieces][0]);
      selInfo.innerHTML = tr('selection.piece', type.label, formatPieceCode(type)) + lengthRow;
    } else {
      // Multi-selection: parts grouped by partCode, most numerous first, then
      // alphabetical.
      const counts = new Map();
      selectedPieces.forEach(id=>{
        const type = pieceType(id);
        counts.set(shortCode(type), (counts.get(shortCode(type))||0)+1);
      });
      const rows = [...counts.entries()]
        .sort((a,b)=> b[1]-a[1] || a[0].localeCompare(b[0]))
        .map(([code,count])=> tr('selection.groupCount', code, count))
        .join('');
      selInfo.innerHTML = tr('selection.piecesCount', selectedPieces.size, lengthRow, rows);
    }
    del.disabled = false;
  } else if(selectedJoiner && joiners[selectedJoiner]){
    const t = TT[joiners[selectedJoiner]];
    setStateHint('', tr(t.insulated ? 'hover.j2' : 'hover.j1'));
    selInfo.innerHTML = tr('selection.piece', t.label, formatPieceCode(t));
    del.disabled = false;
  } else if(selectedBoxId && tableBoxes[selectedBoxId]){
    const box = tableBoxes[selectedBoxId];
    if(isTextBox(box)){
      setStateHint('', tr('hint.textSelected'));
      selInfo.innerHTML = tr('selection.textLabel', fmtLen(box.size, true));
    } else {
      setStateHint('', tr('hint.tabletopSelected'));
      selInfo.innerHTML = tr('selection.tabletop', lenValue(box.w), fmtLen(box.h));
    }
    del.disabled = false;
  } else {
    setStateHint('', tr('hint.default'));
    selInfo.textContent=tr('selection.none');
    del.disabled = true;
  }
  // Fill Gap needs a selected end it can use (single track, not a banked
  // curve's or a turntable part's: gapFillEnd); during its preview it cancels.
  const gapBtn = document.getElementById('gapFillBtn');
  gapBtn.textContent = tr(gapFill ? 'gapfill.btn.cancel' : 'gapfill.btn');
  gapBtn.classList.toggle('neutral', !gapFill); // red while it cancels, as the other exit buttons
  gapBtn.disabled = !gapFill && (!gapFillEnd(selectedPort) || !!gradientTool);
  // Elevate Selection, or Lower Selection when everything selected is already
  // elevated (toggleSelectionElevation).
  const elevateBtn = document.getElementById('elevateBtn');
  elevateBtn.textContent = tr(selectionAllElevated() ? 'elevate.btn.lower' : 'elevate.btn');
  elevateBtn.disabled = !selectedPieces.size || interactionMode!=='idle';
  // Power View: the button's label, and the scale under it while it's on.
  // Off in Gradient Mode, whose colours would hide it.
  const powerBtn = document.getElementById('powerBtn'), powerInfo = document.getElementById('powerInfo');
  powerBtn.textContent = tr(powerView ? 'power.btn.exit' : 'power.btn');
  powerBtn.classList.toggle('neutral', !powerView); // red while it's the way out, as Gradient Mode's
  powerBtn.disabled = !!gradientTool;
  // And the other way round: the two colour the track differently.
  document.getElementById('gradientBtn').disabled = powerView && !gradientTool;
  if(powerView && !gradientTool){
    const ramp = 'linear-gradient(to right, var(--power-near), var(--power-far))';
    const html = tr('power.legend', ramp, POWER_COLOR_NONE, POWER_TURNOUT_JOINTS);
    if(powerInfo.dataset.html!==html){ powerInfo.innerHTML = html; powerInfo.dataset.html = html; }
    const box = document.getElementById('powerLimit');
    if(document.activeElement!==box) box.value = powerJointsLimit; // never under the user's typing
    powerInfo.style.display = '';
  } else powerInfo.style.display = 'none';
  // In Gradient Mode the hint states the mode's purpose; its status and
  // instructions are in #gradientInfo.
  if(gradientTool) setStateHint('', tr('gradient.info.default'));
  updateHint();
}

