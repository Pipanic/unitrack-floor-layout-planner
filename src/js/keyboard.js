/* ============================================================
   KEYBOARD
   The one keydown listener. Layers in priority order: the topmost open
   dialog takes every key; else, outside text fields, Gradient Mode or the
   gap-fill preview takes every key; else the app shortcuts (each checks its
   own keys). Only one
   layer ever acts on a key, except Ctrl+S / Ctrl+O (fileKeys), which come
   first so the browser's own Save page and Open never appear. Capture phase, so a dialog or mode swallows
   keys before any element's own handler sees them.
   ============================================================ */
// Ctrl+S saves the layout and Ctrl+O loads one, in any mode, even mid-typing
// (the typed text isn't committed yet). With a window open they only block the
// browser's own dialog: Inventory has a Save of its own. True if taken.
function fileKeys(e){
  if(!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return false;
  const k = e.key.toLowerCase();
  if(k!=='s' && k!=='o') return false;
  e.preventDefault(); e.stopPropagation();
  if(openDialogKeys()) return true;
  document.getElementById(k==='s' ? 'saveBtn' : 'loadBtn').click();
  return true;
}
// The topmost open dialog's key handler, or null when none is open.
function openDialogKeys(){
  return confirmOpen ? confirmKeys
    : invOpen ? inventoryKeys
    : partsOpen ? partsKeys
    : pngOpen ? pngKeys
    : settingsOpen ? settingsKeys
    : helpOpen ? helpKeys
    : gestOpen ? gestKeys
    : null;
}
function onKeyDown(e){
  if(fileKeys(e)) return;
  const dialogKeys = openDialogKeys();
  if(dialogKeys){ e.stopPropagation(); dialogKeys(e); return; }
  if(isTypingTarget(document.activeElement)) return; // typing never reaches a shortcut
  // Panning works in Gradient Mode too (panLoopStep allows it); every other
  // key is the mode's.
  if(gradientTool){ e.stopPropagation(); panKeys(e); if(!viewKeys(e) && !searchKeys(e)) gradientKeys(e); return; }
  if(gapFill){ e.stopPropagation(); panKeys(e); if(!viewKeys(e) && !searchKeys(e)){ gapFillKeys(e); clipboardKeys(e); } return; }
  if(aimKeys(e) || viewKeys(e) || searchKeys(e)) return;
  floodArrowKeys(e);
  panKeys(e);
  clipboardKeys(e);
  arrowKeys(e);
  editKeys(e);
}
window.addEventListener('keydown', onKeyDown, true);
// An open dialog takes the wheel too, or it would zoom the layout behind it.
// stopPropagation only, so the dialog itself still scrolls.
window.addEventListener('wheel', e=>{ if(openDialogKeys()) e.stopPropagation(); }, true);

