/* ============================================================
   COPY / CUT / PASTE
   An in-app clipboard (a group of connected track has no sensible OS
   clipboard form): piece types, positions and rotations plus connections
   INTERNAL to the group. A paste is always a detached copy.
   ============================================================ */
let clipboard = null; // {pieces:[{typeId,ox,oy,rot}], connections:[[i,portIdx,j,portIdx2]], box:{w,h,ox,oy}|null}; pieces or a box, never both
let pasteGeneration = 0; // reset by copy/cut; each further paste offsets once more so repeats don't stack
// A selected tabletop copies/cuts/pastes like pieces; the clipboard holds one
// or the other.
function copySelection(){
  if(selectedBoxId && tableBoxes[selectedBoxId]){
    const box = tableBoxes[selectedBoxId];
    // centre plus size, so paste shares the pieces' offset maths
    clipboard = {pieces:[], connections:[], box:{w:box.w, h:box.h, ox:box.x+box.w/2, oy:box.y+box.h/2,
      ...(isTextBox(box) ? {kind:'text', text:box.text, size:box.size, rot:box.rot||0} : {})}};
    pasteGeneration = 0;
    return;
  }
  if(selectedPieces.size===0) return;
  const ids = [...selectedPieces];
  const indexOf = new Map(ids.map((id,i)=>[id,i]));
  const clipPieces = ids.map(id=>{
    const p = pieces[id];
    return {typeId:p.typeId, ox:p.ox, oy:p.oy, rot:p.rot, portElev:p.portElev.slice()};
  });
  const clipConnections = [];
  ids.forEach(id=>{
    const type = pieceType(id);
    getPorts(type).forEach((_,idx)=>{
      const other = getConnectedNeighbor(id, idx);
      if(!other || !indexOf.has(other.pieceId)) return;
      const iA = indexOf.get(id), iB = indexOf.get(other.pieceId);
      if(iA < iB) clipConnections.push([iA, idx, iB, other.portIdx]); // each internal connection recorded once
    });
  });
  // UniJoiners on the copied ends, a joint's once, with their kind.
  const clipJoiners = [];
  ids.forEach(id=>getPorts(pieceType(id)).forEach((_, idx)=>{
    const nb = getConnectedNeighbor(id, idx);
    const kind = joiners[connKey(id, idx)] || (nb && !indexOf.has(nb.pieceId) && joiners[connKey(nb.pieceId, nb.portIdx)]);
    if(kind && !(kind==='IJ' && !(nb && indexOf.has(nb.pieceId)))){
      const held = joiners[connKey(id, idx)] ? connKey(id, idx) : connKey(nb.pieceId, nb.portIdx);
      clipJoiners.push([indexOf.get(id), idx, kind, !!joinerFlip[held]]);
    }
  }));
  clipboard = {pieces:clipPieces, connections:clipConnections, joiners:clipJoiners, box:null};
  pasteGeneration = 0;
}
function cutSelection(){
  if(selectedPieces.size===0 && !selectedBoxId) return;
  copySelection();
  pushHistory();
  deleteSelected();
  invalidate();
}
const PASTE_OFFSET = 30; // mm per paste, so a copy is visibly separate from the original
function pasteClipboard(){
  if(!clipboard) return;
  const hasPieces = clipboard.pieces && clipboard.pieces.length>0;
  const hasBox = !!clipboard.box;
  if(!hasPieces && !hasBox) return;
  if(hasPieces && stockBlocks(clipboard.pieces.map(cp=>cp.typeId).concat((clipboard.joiners||[]).map(j=>j[2])), [])){ invalidate(); return; }
  pushHistory();
  pasteGeneration++;
  const shift = PASTE_OFFSET*pasteGeneration;
  let newIds = [];
  if(hasPieces){
    newIds = clipboard.pieces.map(cp=>{
      const newId = 'p'+(nextId++);
      pieces[newId] = {id:newId, typeId:cp.typeId, ox:cp.ox+shift, oy:cp.oy+shift, rot:cp.rot, portElev:cp.portElev.slice()};
      return newId;
    });
    clipboard.connections.forEach(([iA,idxA,iB,idxB])=>{
      connectPorts({sourcePieceId:newIds[iA], sourcePortIdx:idxA, pieceId:newIds[iB], portIdx:idxB});
    });
    (clipboard.joiners||[]).forEach(([i, idx, kind, flip])=>{
      joiners[connKey(newIds[i], idx)] = kind;
      if(flip) joinerFlip[connKey(newIds[i], idx)] = true;
    });
  }
  let newBoxId = null;
  if(hasBox){
    const cb = clipboard.box;
    if(cb.kind==='text') newBoxId = spawnTextBox(cb.ox+shift, cb.oy+shift, cb);
    else {
      newBoxId = 'box'+(nextId++);
      tableBoxes[newBoxId] = {id:newBoxId, x:(cb.ox+shift)-cb.w/2, y:(cb.oy+shift)-cb.h/2, w:cb.w, h:cb.h, locked:false};
    }
  }
  setSelection(hasPieces ? {ids:newIds} : {box:newBoxId});
  invalidate();
}
// Ctrl/Cmd shortcuts (an app-shortcut layer of onKeyDown).
function clipboardKeys(e){
  if(!(e.ctrlKey || e.metaKey)) return; // metaKey: Cmd on a Mac
  const k = e.key.toLowerCase();
  // Undo/Redo work in every mode: clearTransientState() exits it first.
  if(k==='z'){ e.shiftKey ? redo() : undo(); e.preventDefault(); return; }
  if(k==='y'){ redo(); e.preventDefault(); return; }
  if(interactionMode!=='idle') return; // no copy/cut/paste/select-all mid-mode
  if(k==='c'){ if(selectedPieces.size || selectedBoxId){ copySelection(); e.preventDefault(); } }
  else if(k==='x'){ if(selectedPieces.size || selectedBoxId){ cutSelection(); e.preventDefault(); } }
  else if(k==='v'){ if(clipboard){ pasteClipboard(); e.preventDefault(); } }
  else if(k==='a'){ if(Object.keys(pieces).length){ selectAllPieces(); } e.preventDefault(); } // always preventDefault, so the browser's own select-all never happens
}

