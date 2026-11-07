/* ============================================================
   WASD PAN
   Held keys go in a Set, and a requestAnimationFrame loop pans at a
   constant screen speed while any is held — independent of OS key-repeat
   and of zoom.
   ============================================================ */
const heldPanKeys = new Set();
function isTypingTarget(el_){
  if(!el_) return false;
  const tag = (el_.tagName||'').toLowerCase();
  return tag==='input' || tag==='textarea' || el_.isContentEditable;
}
// An app-shortcut layer of onKeyDown. Release is a plain keyup listener, so a
// key let go while a dialog is open still stops the pan.
function panKeys(e){
  const k = e.key.toLowerCase();
  if(k!=='w' && k!=='a' && k!=='s' && k!=='d') return;
  if(e.ctrlKey || e.metaKey || e.altKey) return; // leave modified keys to their own handlers ('a' is pan and Ctrl+A)
  heldPanKeys.add(k);
  e.preventDefault();
}
window.addEventListener('keyup', e=>{
  heldPanKeys.delete(e.key.toLowerCase());
});
window.addEventListener('blur', ()=>heldPanKeys.clear()); // losing focus mustn't leave a key stuck down
const PAN_SPEED = 9; // screen px per animation frame
// WASD also pans mid-drag (pieces, palette pieces, sets, the marquee,
// tabletops), so a piece can be carried further than the view. Whatever is
// held stays under the still cursor: drags measured from a start point on
// screen have it moved with the view, then every drag re-runs its own
// mousemove at the cursor (panDragFollow). The last real mousemove supplies
// the cursor and its modifier keys.
let lastRealMouseMove = null;
window.addEventListener('mousemove', e=>{ if(e.isTrusted) lastRealMouseMove = e; }, true);
const PAN_DRAG_MODES = new Set(['pieceDrag', 'paletteDrag', 'joinerDrag', 'setDrag', 'marquee', 'boxDrag', 'boxResize']);
function panDragFollow(dx, dy){
  [dragState, boxDragState, boxResizeState].forEach(st=>{ if(st){ st.startX += dx; st.startY += dy; } });
  const e = lastRealMouseMove;
  if(!e) return;
  window.dispatchEvent(new MouseEvent('mousemove', {clientX:e.clientX, clientY:e.clientY, buttons:e.buttons,
    shiftKey:e.shiftKey, ctrlKey:e.ctrlKey, altKey:e.altKey, metaKey:e.metaKey}));
}
// While the crosshair is on, panning starts slow enough to line up the crosshair
// and speeds up the longer a pan key stays down: PAN_SPEED after a second, then
// on to twice that. Letting go of every pan key starts it slow again.
const AIM_PAN_MIN = 1, AIM_PAN_RAMP = PAN_SPEED - AIM_PAN_MIN, AIM_PAN_MAX = PAN_SPEED*2; // px per frame; per frame per second
let aimPanStart = null;
function panSpeed(){
  if(!aiming){ aimPanStart = null; return PAN_SPEED; }
  if(aimPanStart===null) aimPanStart = performance.now();
  return Math.min(AIM_PAN_MAX, AIM_PAN_MIN + AIM_PAN_RAMP*(performance.now() - aimPanStart)/1000);
}
function panLoopStep(){
  requestAnimationFrame(panLoopStep);
  if(!heldPanKeys.size){ aimPanStart = null; return; }
  // Not under a mouse pan, nor in a mode where the keys mean something else
  // (typing a size or a label); Gradient Mode, the Fill Gap preview and drags
  // pan.
  const dragging = PAN_DRAG_MODES.has(interactionMode);
  if(panning || isLayoutEmpty() || !(interactionMode==='idle' || interactionMode==='gradient' || interactionMode==='gapFill' || dragging)) return;
  const speed = panSpeed();
  let dx=0, dy=0;
  if(heldPanKeys.has('w')) dy += speed;
  if(heldPanKeys.has('s')) dy -= speed;
  if(heldPanKeys.has('a')) dx += speed;
  if(heldPanKeys.has('d')) dx -= speed;
  if(dx===0 && dy===0) return;
  if(dx!==0 && dy!==0){ // normalise diagonals so they're not faster
    const norm = speed/Math.hypot(dx,dy);
    dx*=norm; dy*=norm;
  }
  const x0 = view.x, y0 = view.y;
  view.x += dx; view.y += dy;
  clampView();
  if(dragging) panDragFollow(view.x - x0, view.y - y0); // what the clamp allowed
  if(boxSelect && boxSelect.aimed) invalidate(); // the box's corner is the crosshair
  if(_renderRaf) render(); else viewFrame();
  if(aimSweep) aimSweepAlong(view.x - x0, view.y - y0); // the new view's on screen now
}
requestAnimationFrame(panLoopStep);

