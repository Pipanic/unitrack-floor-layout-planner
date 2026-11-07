/* ============================================================
   TABLETOP BOX
   Move and resize, each a mousedown (wired where the box is drawn) plus
   window mousemove/mouseup. Unlike piece drags there are no connections
   to break, so history is snapshotted once at gesture start.
   ============================================================ */
registerGesture({active:()=>boxDragState,
  move(e){
    const box = tableBoxes[boxDragState.boxId];
    if(!box) { boxDragState = null; endInteraction('boxDrag'); return; } // deleted during the drag (e.g. by undo)
    if(!boxDragState.moved){
      if(Math.hypot(e.clientX-boxDragState.startX, e.clientY-boxDragState.startY) <= 4) return;
      pushHistory();
      boxDragState.moved = true;
    }
    const dxWorld = (e.clientX-boxDragState.startX)/view.scale;
    const dyWorld = (e.clientY-boxDragState.startY)/view.scale;
    const snapped = snapBoxMove(box, boxDragState.startBoxX + dxWorld, boxDragState.startBoxY + dyWorld);
    box.x = snapped.x;
    box.y = snapped.y;
    invalidate();
  },
  end(){
    if(boxDragState.moved) scheduleAutosave();
    boxDragState = null;
    endInteraction('boxDrag');
  },
});
registerGesture({active:()=>boxResizeState,
  move(e){
    const box = tableBoxes[boxResizeState.boxId];
    if(!box) { boxResizeState = null; endInteraction('boxResize'); return; }
    if(!boxResizeState.moved){
      if(Math.hypot(e.clientX-boxResizeState.startX, e.clientY-boxResizeState.startY) <= 4) return;
      pushHistory();
      boxResizeState.moved = true;
    }
    const {corner, startBox} = boxResizeState;
    const dxWorld = (e.clientX-boxResizeState.startX)/view.scale;
    const dyWorld = (e.clientY-boxResizeState.startY)/view.scale;
    // Each corner moves its own two edges; left/top corners move the origin too.
    let {x,y,w,h} = startBox;
    if(corner==='se'){ w = startBox.w+dxWorld; h = startBox.h+dyWorld; }
    else if(corner==='sw'){ x = startBox.x+dxWorld; w = startBox.w-dxWorld; h = startBox.h+dyWorld; }
    else if(corner==='ne'){ y = startBox.y+dyWorld; w = startBox.w+dxWorld; h = startBox.h-dyWorld; }
    else if(corner==='nw'){ x = startBox.x+dxWorld; y = startBox.y+dyWorld; w = startBox.w-dxWorld; h = startBox.h-dyWorld; }
    ({x, y, w, h} = snapBoxResize(box, corner, {x, y, w, h}));
    // Clamp to the minimum, re-pinning the origin, so the box can't invert.
    if(w<TABLE_BOX_MIN_SIZE){ if(corner==='sw'||corner==='nw') x = startBox.x+startBox.w-TABLE_BOX_MIN_SIZE; w = TABLE_BOX_MIN_SIZE; }
    if(h<TABLE_BOX_MIN_SIZE){ if(corner==='ne'||corner==='nw') y = startBox.y+startBox.h-TABLE_BOX_MIN_SIZE; h = TABLE_BOX_MIN_SIZE; }
    box.x=x; box.y=y; box.w=w; box.h=h;
    invalidate();
  },
  end(){
    if(boxResizeState.moved) scheduleAutosave();
    boxResizeState = null;
    endInteraction('boxResize');
  },
});
// Padlock edge tracking; re-renders only when the edge changes.
registerGesture({active:()=>selectedBoxId && interactionMode==='idle' && !panning,
  move(e){
    const box = tableBoxes[selectedBoxId];
    if(!box || box.locked || isTextBox(box)) return;
    if(!isOverCanvas(e.clientX, e.clientY)) return;
    const {x,y} = screenToWorld(e.clientX, e.clientY);
    const edge = nearestEdgeOfBox(box, x, y);
    if(edge!==boxHoverEdge){
      boxHoverEdge = edge;
      invalidate();
    }
  },
});

