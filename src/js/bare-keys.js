/* ============================================================
   BARE-KEY BINDINGS: F (flip), G (Gradient Mode), J (Fill Gap), Q/E
   (rotate), Enter (edit a text label), Delete or Backspace, Esc; and the
   view keys (viewKeys), which work in every mode.
   Keys taken elsewhere: W/A/S/D (pan), , and . (flood-select beyond the
   selection's left/up or right/down end), the digits (palette search),
   Ctrl/Cmd+A/C/X/V/Z/Y, the arrow keys (arrowKeys). Backspace is Delete (Mac keyboards have
   no Delete key); its default is prevented, though no current browser
   navigates back with it. Inside Gradient Mode, G, Enter and Delete are
   gradientKeys' instead (see onKeyDown).
   ============================================================ */
// Q / E: turn what's held (as the scroll wheel does mid-drag), else the
// selection. `step` in degrees, clockwise positive (E +15, Q −15).
function rotateHeld(step){
  if(dragState){
    ensureDragBroken();
    dragState.rotDelta = norm360(dragState.rotDelta + step);
    applyDragTransform();
    invalidate();
    return true;
  }
  if(paletteDrag){ paletteDrag.rot = norm360(paletteDrag.rot + step); updatePaletteSnap(); invalidate(); return true; }
  if(setDrag){ setDrag.rot = norm360(setDrag.rot + step); invalidate(); return true; }
  const box = boxDragState && tableBoxes[boxDragState.boxId];
  if(isTextBox(box)){
    if(!boxDragState.moved){ pushHistory(); boxDragState.moved = true; }
    box.rot = norm360((box.rot||0) + step);
    invalidate();
    return true;
  }
  return false;
}
// The selection turns about its centre (the average of its pieces' centres),
// as one rigid group. Joins to pieces outside it break, as a drag breaks them;
// any open end that then meets another exactly joins it.
function rotateSelection(step){
  const label = tableBoxes[selectedBoxId];
  if(isTextBox(label)){
    pushHistory();
    label.rot = norm360((label.rot||0) + step);
    scheduleAutosave();
    invalidate();
    return true;
  }
  const ids = [...selectedPieces].filter(id=>pieces[id]);
  if(!ids.length) return false;
  const group = new Set(ids);
  pushHistory();
  ids.forEach(id=>getPorts(pieceType(id)).forEach((_, i)=>{
    const nb = getConnectedNeighbor(id, i);
    if(nb && !group.has(nb.pieceId)) disconnectPort(id, i);
  }));
  let cx = 0, cy = 0;
  ids.forEach(id=>{ const c = worldPoint(pieces[id], pieceCenterLocal(pieceType(id))); cx += c.x; cy += c.y; });
  cx /= ids.length; cy /= ids.length;
  const r = deg2rad(step), c = Math.cos(r), s = Math.sin(r);
  ids.forEach(id=>{
    const p = pieces[id], dx = p.ox - cx, dy = p.oy - cy;
    p.ox = cx + dx*c - dy*s; p.oy = cy + dx*s + dy*c;
    p.rot = norm360(p.rot + step);
  });
  findLoopClosures(group).forEach(connectPorts);
  scheduleAutosave();
  invalidate();
  return true;
}
// Arrow keys: step the selection by arrowSteps (⚙️ Settings), with Shift or Ctrl/Cmd
// its other two sizes; Ctrl wins if both are down. It's one tiny drag: joins to unselected pieces break, and
// an end the step brings within SNAP_RADIUS snaps, whichever kind of snap a drag
// would make. A snap that would cancel the step is refused, or a short step
// could never leave the join it started on. A held key is one undo step.
const ARROW_DIRECTIONS = {ArrowLeft:[-1,0], ArrowRight:[1,0], ArrowUp:[0,-1], ArrowDown:[0,1]};
function moveSelection(ux, uy, mm, newUndoStep){
  const ids = [...selectedPieces].filter(id=>pieces[id]);
  if(!ids.length) return false;
  const primaryId = ids[0], primary = pieces[primaryId];
  const startPositions = new Map(ids.map(id=>[id, {ox:pieces[id].ox, oy:pieces[id].oy, rot:pieces[id].rot}]));
  const centreOf = pose=>worldPoint(pose, pieceCenterLocal(pieceType(primaryId)));
  const start = centreOf(primary);
  dragState = {group:new Set(ids), primaryId, startPositions, rotDelta:0, moved:false,
    dxScreen:ux*mm*view.scale, dyScreen:uy*mm*view.scale, snapTarget:null, loopClosures:[]};
  if(ids.length===1 && pieceType(primaryId).expansion) dragState.expansionTypeId = primary.typeId;
  if(newUndoStep) pushHistory();
  breakDragJoins();
  applyDragTransform();
  const target = dragState.snapTarget;
  if(target){
    // The centre, as a snap can flip a platform or plate about its middle.
    const landed = centreOf(target.ring ? target : computeSnappedGroupPositions(dragState.group, target).get(primaryId));
    if((landed.x-start.x)*ux + (landed.y-start.y)*uy > 0.01){
      finalizeSnap(dragState);
    } else {
      startPositions.forEach((pos, id)=>Object.assign(pieces[id], {ox:pos.ox + ux*mm, oy:pos.oy + uy*mm, rot:pos.rot}));
      if(dragState.expansionTypeId) primary.typeId = dragState.expansionTypeId;
    }
  }
  dragState = null;
  scheduleAutosave();
  invalidate();
  return true;
}
function arrowKeys(e){
  const dir = ARROW_DIRECTIONS[e.key];
  if(!dir || e.altKey || interactionMode!=='idle') return;
  const mm = (e.ctrlKey || e.metaKey) ? arrowSteps.ctrl : e.shiftKey ? arrowSteps.shift : arrowSteps.plain;
  if(moveSelection(dir[0], dir[1], mm, !e.repeat)) e.preventDefault();
}
// Selecting without a mouse. A page can't move the pointer, so the crosshair is
// drawn at the middle of the canvas and WASD pans the layout beneath it. A tap
// of Shift turns it on and off; it stays on until then. While it's on, a tap of
// Space selects the piece under it, or deselects one already selected, so a
// selection builds up piece by piece; holding Space and panning does the same to
// everything it crosses. With it off, Space fits the layout.
// A tap of Ctrl/Cmd starts a marquee from the crosshair, which its corner then
// follows, adding to the selection; another tap ends it. A tap and not a hold,
// because WASD with Ctrl down is Ctrl+W, which closes the browser tab and can't
// be blocked. Esc cancels the marquee, or else turns the crosshair off.
const aimCrosshair = document.getElementById('aimCrosshair');
const aimedMarquee = ()=>boxSelect && boxSelect.aimed;
function aimPoint(){
  const r = svg.getBoundingClientRect();
  return {x:r.left + r.width/2, y:r.top + r.height/2};
}
function aimMarqueeFollow(){
  const p = aimPoint(), {x, y} = screenToWorld(p.x, p.y);
  boxSelect.x1 = x; boxSelect.y1 = y;
}
function endAimMarquee(){
  aimMarqueeFollow();
  finishMarquee();
}
function setAiming(on){
  if(!on && aimedMarquee()) endAimMarquee();
  aiming = on;
  aimSweep = null;
  aimCrosshair.hidden = !on;
  aimCrosshair.classList.remove('marquee');
}
function startAimMarquee(){
  if(!beginInteraction('marquee')) return;
  aimSweep = null;
  const p = aimPoint(), {x, y} = screenToWorld(p.x, p.y);
  boxSelect = {aimed:true, x0:x, y0:y, x1:x, y1:y, additive:true, baseSelection:new Set(selectedPieces)};
  invalidate();
}
function pieceIdAtPoint(x, y){
  // All the elements there, as a green dot or an arrow can lie over the piece.
  const hit = document.elementsFromPoint(x, y)
    .find(node=>node.closest('.piece') && pieces[node.closest('.piece').dataset.id]);
  return hit ? hit.closest('.piece').dataset.id : null;
}
function aimSweepPiece(id){
  if(!id || selectedPieces.has(id)===(aimSweep==='add')) return;
  selectedPort = null;
  if(aimSweep==='add') selectedPieces.add(id); else selectedPieces.delete(id);
  invalidate();
}
// Space down: the piece under the crosshair flips, and while Space stays down the
// pan carries on the same way, adding or removing. So one sweep can't flip a piece
// back, and a tap is simply a sweep that never moved.
function startAimSweep(){
  const p = aimPoint(), id = pieceIdAtPoint(p.x, p.y);
  aimSweep = id && selectedPieces.has(id) ? 'remove' : 'add';
  aimSweepPiece(id);
}
// Everything the crosshair crossed in this pan step: the view moved (dx, dy), so
// it was that far along on screen. Sampled, as a fast step can jump a whole track.
function aimSweepAlong(dx, dy){
  const p = aimPoint(), steps = Math.ceil(Math.hypot(dx, dy)/4);
  for(let i = steps; i>=0; i--){
    const t = steps ? i/steps : 0;
    aimSweepPiece(pieceIdAtPoint(p.x + dx*t, p.y + dy*t));
  }
}
function aimKeys(e){
  if(!aiming) return false;
  if(e.key==='Escape'){
    if(aimedMarquee()){ boxSelect = null; endInteraction('marquee'); invalidate(); }
    else setAiming(false);
    e.preventDefault();
    return true;
  }
  if(!aimedMarquee() && interactionMode!=='idle') return false; // mid-drag, Space still fits
  if(e.key===' '){
    e.preventDefault();
    if(!e.repeat && !aimedMarquee()) startAimSweep();
    return true;
  }
  if(!e.repeat && (e.key==='Control' || e.key==='Meta')){
    if(aimedMarquee()) endAimMarquee(); else startAimMarquee();
    return true;
  }
  return false;
}
window.addEventListener('keyup', e=>{ if(e.key===' ') aimSweep = null; });
window.addEventListener('blur', ()=>{ aimSweep = null; }); // its keyup won't come
// Shift is a modifier for much else, so only a tap counts: down and up with no
// other key, mouse press or wheel between them, and not held long enough to
// have been meant as a modifier.
const SHIFT_TAP_MS = 500;
let shiftTapAt = null;
window.addEventListener('keydown', e=>{
  if(e.key!=='Shift') shiftTapAt = null;
  else if(!e.repeat) shiftTapAt = performance.now();
}, true);
['mousedown', 'wheel'].forEach(type=>window.addEventListener(type, ()=>{ shiftTapAt = null; }, true));
window.addEventListener('keyup', e=>{
  if(e.key!=='Shift') return;
  const tapped = shiftTapAt!==null && performance.now() - shiftTapAt < SHIFT_TAP_MS;
  shiftTapAt = null;
  if(!tapped || openDialogKeys() || isTypingTarget(document.activeElement) || gradientTool || gapFill || panning) return;
  if(interactionMode!=='idle' && !aimedMarquee()) return;
  if(aiming || !isLayoutEmpty()) setAiming(!aiming);
});
// View keys: they change only what's shown, so they work in every mode.
// + / − zoom about the middle, Space fits the layout (the ↺ button), T Toggle
// detail, L part labels, P open ends, V the next level focus (all, ground,
// elevated, round again). The digits search the palette (searchKeys).
const clickButton = id=>()=>document.getElementById(id).click();
const LEVEL_CYCLE = {all:'levelGround', ground:'levelElevated', elevated:'levelAll'};
const VIEW_KEYS = {
  '+':()=>zoomAtCenter(1.2), '=':()=>zoomAtCenter(1.2),
  '-':()=>zoomAtCenter(1/1.2), '_':()=>zoomAtCenter(1/1.2),
  ' ':()=>recentreView(),
  t:clickButton('tiesToggle'), l:clickButton('partLabelsToggle'), p:clickButton('portsToggle'),
  v:()=>document.getElementById(LEVEL_CYCLE[focusedLevel]).click(),
};
function viewKeys(e){
  if(e.ctrlKey || e.metaKey || e.altKey) return false;
  const f = VIEW_KEYS[e.key.length===1 ? e.key.toLowerCase() : e.key];
  if(!f) return false;
  f();
  e.preventDefault(); // Space also mustn't press a focused button or scroll
  return true;
}
// A digit typed anywhere but a text field starts a new palette search with
// it, since part codes and catalogue numbers are mostly numbers (249 finds
// the R249 curves). The search box then has the keys, so the rest of the
// number types normally; Esc, or a click on the layout, hands them back.
function searchKeys(e){
  if(e.ctrlKey || e.metaKey || e.altKey || !/^[0-9]$/.test(e.key)) return false;
  const input = document.getElementById('paletteSearch');
  input.value = e.key;
  input.focus();
  applyPaletteFilter();
  e.preventDefault();
  return true;
}
function editKeys(e){
  if(e.ctrlKey || e.metaKey || e.altKey) return; // leave modified keys alone
  const lower = e.key.toLowerCase();
  if(lower==='q' || lower==='e'){
    const step = lower==='e' ? 15 : -15;
    if(rotateHeld(step) || (interactionMode==='idle' && rotateSelection(step))) e.preventDefault();
    return;
  }
  if(e.key.toLowerCase()==='f'){
    // F while dragging flips the held piece (single piece, FLIP_OPPOSITE
    // pairs), like Shift+wheel.
    if(dragState){
      if(dragState.group.size===1){
        const piece = pieces[dragState.primaryId];
        const opp = FLIP_OPPOSITE[piece.typeId];
        if(opp && !stockBlocks([opp], [piece.typeId])){
          ensureDragBroken();
          piece.typeId = opp;
          applyDragTransform();
          invalidate();
          e.preventDefault();
        }
      }
      return;
    }
    if(paletteDrag){
      const opp = FLIP_OPPOSITE[paletteDrag.typeId];
      if(opp){
        paletteDrag.typeId = opp;
        updatePaletteSnap();
        invalidate();
        e.preventDefault();
      }
      return;
    }
    // Otherwise a single selected piece with a mirror pair.
    if(selectedPieces.size===1){
      const id = [...selectedPieces][0];
      const piece = pieces[id];
      const opp = FLIP_OPPOSITE[piece.typeId];
      if(opp && !stockBlocks([opp], [piece.typeId])){
        pushHistory();
        piece.typeId = opp;
        reconcileConnectionsAfterRetype(id);
        invalidate();
        e.preventDefault();
      }
    }
    return;
  }
  if(interactionMode!=='idle') return; // no Delete (or starting Gradient Mode) mid-mode
  // Esc deselects; with nothing selected, it clears the palette search.
  if(e.key==='Escape'){
    if(selectedPort || selectedPieces.size || selectedBoxId){
      setSelection();
      invalidate(); e.preventDefault();
    } else if(clearPaletteSearch()) e.preventDefault();
    return;
  }
  // Enter edits a selected text label.
  if(e.key==='Enter' && isTextBox(tableBoxes[selectedBoxId])){
    startTextEdit(selectedBoxId);
    e.preventDefault();
    return;
  }
  if(e.key.toLowerCase()==='j'){
    gapFillFromSelection();
    e.preventDefault();
    return;
  }
  if(e.key.toLowerCase()==='g'){
    // gradientKeys takes G while Gradient Mode is active, so this only starts
    // it.
    startGradientTool();
    e.preventDefault();
    return;
  }
  if(e.key==='Delete' || e.key==='Backspace'){
    e.preventDefault(); // Backspace: no browser default, whatever is selected
    if(selectedPieces.size>0 || selectedBoxId || selectedJoiner){
      pushHistory();
      deleteSelected();
      invalidate();
      e.preventDefault();
    }
  }
}

