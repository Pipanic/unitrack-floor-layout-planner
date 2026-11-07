/* ============================================================
   GESTURE DISPATCH
   The one place mouse moves and releases come in. Each gesture registers what
   it does with them, in the order they run: `active` says whether it's under
   way now, and is asked again for each one, since an earlier gesture's end can
   change that. Presses start gestures where they land (the piece, the palette
   button, the canvas), so they stay with their targets.
   ============================================================ */
const GESTURES = [];
function registerGesture(gesture){ GESTURES.push(gesture); }
window.addEventListener('mousemove', e=>{ GESTURES.forEach(g=>{ if(g.move && g.active()) g.move(e); }); });
window.addEventListener('mouseup', e=>{ GESTURES.forEach(g=>{ if(g.end && g.active()) g.end(e); }); });

