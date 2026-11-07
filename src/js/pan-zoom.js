/* ============================================================
   PAN, ZOOM, MARQUEE, WHEEL & LEVEL SELECT
   Canvas panning and zoom, right-drag marquee select, the wheel handler (rotate / mutate / zoom), level-select buttons.
   ============================================================ */
// Zoom keeping the world point under (screenX, screenY) fixed. `continuous`
// (the wheel, where notches arrive in bursts): view frames while it moves,
// and one render ZOOM_SETTLE_MS after the last notch. A button click renders.
const ZOOM_SETTLE_MS = 120;
const clampScale = s=>Math.min(6, Math.max(0.15, s));
function zoomAt(screenX, screenY, factor, continuous){
  const worldX = (screenX - view.x)/view.scale;
  const worldY = (screenY - view.y)/view.scale;
  view.scale = clampScale(view.scale*factor);
  view.x = screenX - worldX*view.scale;
  view.y = screenY - worldY*view.scale;
  clampView();
  if(!continuous){ invalidate(); return; }
  requestViewFrame();
  clearTimeout(_zoomSettleTimer);
  _zoomSettleTimer = setTimeout(()=>{ _zoomSettleTimer = 0; render(); }, ZOOM_SETTLE_MS);
}

let panning=false, last=null, panMoved=false;
// Right-drag marquee, in world coordinates so it survives a view change
// mid-drag.
let boxSelect = null;
let aiming = false; // the Shift crosshair is on (setAiming)
let aimSweep = null; // while Space is down with it on: 'add' or 'remove' (startAimSweep)
svg.addEventListener('contextmenu', e=>e.preventDefault()); // no browser context menu over the canvas
svg.addEventListener('mousedown', e=>{
  if(e.button===2){
    e.preventDefault();
    // Needs no other mode active. In Gradient Mode it would reopen a way to
    // delete pieces the chain names.
    if(!beginInteraction('marquee')) return;
    const {x,y} = screenToWorld(e.clientX, e.clientY);
    // Shift adds the box to the selection. baseSelection is shared by preview
    // and commit. A right-click without a drag does nothing.
    boxSelect = {x0:x, y0:y, x1:x, y1:y, additive:e.shiftKey, baseSelection:new Set(selectedPieces)};
    invalidate();
    return;
  }
  if(e.button!==0) return; // ignore middle click etc.
  panning=true; panMoved=false; last={x:e.clientX,y:e.clientY};
  if(!isLayoutEmpty()) svg.classList.add('panning');
});
function finishMarquee(){
  const minX=Math.min(boxSelect.x0,boxSelect.x1), maxX=Math.max(boxSelect.x0,boxSelect.x1);
  const minY=Math.min(boxSelect.y0,boxSelect.y1), maxY=Math.max(boxSelect.y0,boxSelect.y1);
  const isRealBox = (maxX-minX)>2 || (maxY-minY)>2;
  if(isRealBox){
    // Shift: union with the starting selection, not a toggle.
    const base = boxSelect.additive ? [...boxSelect.baseSelection].filter(id=>pieces[id]) : [];
    setSelection({ids:[...base, ...piecesInWorldRect(minX, minY, maxX, maxY)]});
  }
  boxSelect = null;
  endInteraction('marquee');
  invalidate();
}
// Always consulted: a mouseup ends a pan even if it never moved. The crosshair's
// marquee (`aimed`) follows the crosshair, not the mouse, and ends by key.
registerGesture({active:()=>true,
  move(e){
    if(boxSelect && !boxSelect.aimed){
      const {x,y} = screenToWorld(e.clientX, e.clientY);
      boxSelect.x1 = x; boxSelect.y1 = y;
      invalidate();
      return;
    }
    if(!panning || dragState || isLayoutEmpty()) return; // nothing to pan to on an empty layout
    if(Math.abs(e.clientX-last.x)>2 || Math.abs(e.clientY-last.y)>2) panMoved=true;
    view.x += (e.clientX-last.x); view.y += (e.clientY-last.y);
    last={x:e.clientX,y:e.clientY};
    clampView();
    requestViewFrame();
  },
  end(){
    if(boxSelect && !boxSelect.aimed){
      finishMarquee();
      return;
    }
    if(panning && !panMoved && !dragState){
      // plain click on empty canvas deselects, including a selected slope
      setSelection();
      if(gradientSelectedGroup){ gradientSelectedGroup = null; updateGradientUI(); }
      invalidate();
    }
    panning=false; svg.classList.remove('panning');
  },
});
// Wheel while holding a piece rotates it 15° per notch. On window so it works
// before the cursor reaches the canvas.
window.addEventListener('wheel', e=>{
  const step = e.deltaY<0 ? 15 : -15; // wheel up = clockwise
  const mutateStep = e.deltaY<0 ? 1 : -1; // wheel up = forward through the group
  if(dragState){
    e.preventDefault();
    // Shift+wheel mutates (MUTATION_GROUPS); single piece only.
    if(e.shiftKey){
      if(dragState.group.size===1){
        const piece = pieces[dragState.primaryId];
        // An expansion track steps from the length the user set, not a fit.
        const current = dragState.expansionTypeId || piece.typeId;
        const nextType = mutateTypeId(current, mutateStep, dragState);
        if(nextType!==current && !stockBlocks([nextType], [piece.typeId])){
          ensureDragBroken();
          piece.typeId = nextType;
          if(dragState.expansionTypeId){ dragState.expansionTypeId = nextType; dragState.manualLength = true; }
          applyDragTransform();
          invalidate();
        }
      }
      return;
    }
    ensureDragBroken();
    dragState.rotDelta = norm360(dragState.rotDelta + step);
    applyDragTransform();
    invalidate();
    return;
  }
  if(paletteDrag){
    e.preventDefault();
    if(e.shiftKey){
      const current = paletteDrag.expansionTypeId || paletteDrag.typeId;
      const nextType = mutateTypeId(current, mutateStep, paletteDrag);
      if(nextType!==current){
        paletteDrag.typeId = nextType;
        if(paletteDrag.expansionTypeId){ paletteDrag.expansionTypeId = nextType; paletteDrag.manualLength = true; }
        updatePaletteSnap();
        invalidate();
      }
      return;
    }
    paletteDrag.rot = norm360(paletteDrag.rot + step);
    updatePaletteSnap();
    invalidate();
    return;
  }
  if(!isOverCanvas(e.clientX, e.clientY)) return;
  e.preventDefault();
  const r = document.getElementById('canvasWrap').getBoundingClientRect();
  zoomAt(e.clientX-r.left, e.clientY-r.top, e.deltaY<0 ? 1.08 : 0.92, true);
},{passive:false});
function zoomAtCenter(factor){
  const wrap = document.getElementById('canvasWrap');
  zoomAt(wrap.clientWidth/2, wrap.clientHeight/2, factor);
}
document.getElementById('zoomIn').addEventListener('click',()=>zoomAtCenter(1.2));
document.getElementById('zoomOut').addEventListener('click',()=>zoomAtCenter(1/1.2));
// Level select: which storey the opacity fade foregrounds. View state only.
function setFocusedLevel(level){
  focusedLevel = level;
  document.getElementById('levelGround').classList.toggle('active', level==='ground');
  document.getElementById('levelElevated').classList.toggle('active', level==='elevated');
  document.getElementById('levelAll').classList.toggle('active', level==='all');
  invalidate();
}
document.getElementById('levelGround').addEventListener('click', ()=>setFocusedLevel('ground'));
document.getElementById('levelElevated').addEventListener('click', ()=>setFocusedLevel('elevated'));
document.getElementById('levelAll').addEventListener('click', ()=>setFocusedLevel('all'));

