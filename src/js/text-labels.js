/* ============================================================
   TEXT LABELS
   Free text on the canvas: a Misc. palette item. Kept in `tableBoxes` with
   `kind:'text'`, so selection, Delete, undo, copy/paste, autosave and
   Save/Load are the tabletop's; unlike a tabletop it's drawn over the track,
   rotates, and scales its text from a corner. `size` is the text height in
   mm, `rot` degrees about the centre; x/y/w/h are the unrotated box, fitted
   to the text around a fixed centre (fitTextBox).
   ============================================================ */
const TEXT_DEFAULT_SIZE = 30, TEXT_MIN_SIZE = 6, TEXT_MAX_SIZE = 400; // mm
const TEXT_LINE_EM = 1.25, TEXT_PAD_EM = 0.3;
const TEXT_FONT = "'Segoe UI', system-ui, -apple-system, sans-serif";
let editingTextId = null; // the label being typed into, while interactionMode is 'textEdit'
let textResizeState = null; // {boxId, startDist, startSize, moved}
let lastTextClick = null; // {id, time}: double-click detection across re-renders
const isTextBox = b=>!!b && b.kind==='text';
const textLines = text=>(text || '').split('\n');
let _textMeasure = null;
function textWidthEm(line){
  if(!_textMeasure){ _textMeasure = document.createElement('canvas').getContext('2d'); _textMeasure.font = `600 100px ${TEXT_FONT}`; }
  return _textMeasure.measureText(line).width/100;
}
// The box around the text, kept centred where it was. An empty label keeps
// room for a few letters, so it can still be found and clicked.
function fitTextBox(box){
  const cx = box.x + box.w/2, cy = box.y + box.h/2, lines = textLines(box.text);
  const wEm = Math.max(2, ...lines.map(textWidthEm));
  box.w = (wEm + 2*TEXT_PAD_EM)*box.size;
  box.h = (lines.length*TEXT_LINE_EM + 2*TEXT_PAD_EM)*box.size;
  box.x = cx - box.w/2; box.y = cy - box.h/2;
}
function spawnTextBox(atX, atY, props={}){
  const id = 'box'+(nextId++);
  const box = {id, kind:'text', text:props.text ?? '', size:props.size ?? TEXT_DEFAULT_SIZE, rot:props.rot ?? 0,
    x:atX, y:atY, w:0, h:0, locked:false};
  fitTextBox(box);
  tableBoxes[id] = box;
  return id;
}
// World position of a point given in the label's own frame (from its centre).
function textBoxPoint(box, lx, ly){
  const r = deg2rad(box.rot||0), c = Math.cos(r), s = Math.sin(r);
  const cx = box.x + box.w/2, cy = box.y + box.h/2;
  return {x:cx + lx*c - ly*s, y:cy + lx*s + ly*c};
}
function textBoxCorners(box){
  return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([a, b])=>textBoxPoint(box, a*box.w/2, b*box.h/2));
}
// The text itself, centred on (0,0) in the label's frame: one tspan a line.
function appendTextLines(g, box, attrs){
  const lines = textLines(box.text), lh = box.size*TEXT_LINE_EM;
  const t = el('text', {'text-anchor':'middle', 'dominant-baseline':'central', 'font-size':box.size.toFixed(2),
    'font-weight':'600', 'font-family':TEXT_FONT, ...attrs});
  lines.forEach((line, i)=>{
    const ts = el('tspan', {x:0, y:((i - (lines.length-1)/2)*lh).toFixed(2)});
    ts.textContent = line || ' ';
    t.appendChild(ts);
  });
  g.appendChild(t);
}
// Over the track, so a label on it can be read and grabbed; a locked one lets
// the pointer through to the track.
function drawTextBoxes(frame){
  const world = frame.world, b = frame.bounds;
  Object.values(tableBoxes).filter(isTextBox).forEach(box=>{
    textBoxCorners(box).forEach(p=>{
      b.minX = Math.min(b.minX, p.x); b.maxX = Math.max(b.maxX, p.x);
      b.minY = Math.min(b.minY, p.y); b.maxY = Math.max(b.maxY, p.y);
    });
    if(editingTextId===box.id){ placeTextEditor(); return; } // the editor shows it
    const cx = box.x + box.w/2, cy = box.y + box.h/2;
    const g = el('g', {transform:`translate(${cx.toFixed(2)},${cy.toFixed(2)}) rotate(${(box.rot||0).toFixed(1)})`});
    const selected = selectedBoxId===box.id;
    const rect = el('rect', {x:-box.w/2, y:-box.h/2, width:box.w, height:box.h, fill:'transparent',
      stroke: selected ? SELECTION_BLUE : 'none', 'stroke-width':1.5/view.scale,
      'stroke-dasharray': box.locked ? 'none' : `${5/view.scale} ${4/view.scale}`});
    g.appendChild(rect);
    appendTextLines(g, box, {fill:'var(--text)', stroke:'var(--bg)', 'stroke-width':(box.size*0.16).toFixed(2),
      'stroke-linejoin':'round', 'paint-order':'stroke', 'pointer-events':'none'});
    if(box.locked) rect.style.pointerEvents = 'none';
    else {
      rect.style.cursor = 'move';
      rect.dataset.hint = 'x1';
      rect.addEventListener('mousedown', ev=>{
        if(ev.button!==0) return;
        ev.stopPropagation(); ev.preventDefault();
        const now = Date.now();
        if(lastTextClick && lastTextClick.id===box.id && now-lastTextClick.time < DOUBLE_CLICK_MS){
          lastTextClick = null;
          startTextEdit(box.id);
          return;
        }
        lastTextClick = {id:box.id, time:now};
        if(!beginInteraction('boxDrag')) return;
        if(selectedBoxId!==box.id) selectOnlyBox(box.id);
        boxDragState = {boxId:box.id, startX:ev.clientX, startY:ev.clientY, startBoxX:box.x, startBoxY:box.y, moved:false};
      });
    }
    world.appendChild(g);
  });
}
// A selected label's corner handles (scale the text) and padlock; a locked
// label's padlock, which unlocks it. From drawTableBoxOverlays.
function drawTextBoxOverlay(world, box){
  if(editingTextId===box.id) return;
  const lockAt = textBoxPoint(box, -box.w/2, -box.h/2);
  if(box.locked){
    appendPadlockIcon(world, lockAt.x, lockAt.y, true, ()=>{
      if(blocksOtherEditing()) return;
      pushHistory(); box.locked = false; selectOnlyBox(box.id); scheduleAutosave();
    }, 'x4');
    return;
  }
  if(selectedBoxId!==box.id) return;
  const HANDLE_R = 5/view.scale, c = textBoxPoint(box, 0, 0);
  textBoxCorners(box).forEach(p=>{
    const handle = el('rect', {x:p.x-HANDLE_R, y:p.y-HANDLE_R, width:HANDLE_R*2, height:HANDLE_R*2,
      fill:SELECTION_BLUE, stroke:'#0d1a12', 'stroke-width':1/view.scale, 'data-hint':'x2'});
    handle.style.cursor = 'nwse-resize';
    handle.addEventListener('mousedown', ev=>{
      if(ev.button!==0) return;
      if(!beginInteraction('boxResize')) return;
      ev.stopPropagation(); ev.preventDefault();
      const w = screenToWorld(ev.clientX, ev.clientY);
      textResizeState = {boxId:box.id, startDist:Math.max(1, Math.hypot(w.x-c.x, w.y-c.y)), startSize:box.size, moved:false};
    });
    world.appendChild(handle);
  });
  const top = textBoxPoint(box, 0, -box.h/2 - 16/view.scale); // clear of the label, which can be small on screen
  appendPadlockIcon(world, top.x, top.y, false, ()=>{
    pushHistory(); box.locked = true; selectedBoxId = null; invalidate(); scheduleAutosave();
  }, 'x3');
}
// Corner drag: the text scales with the pointer's distance from the centre.
registerGesture({active:()=>textResizeState,
  move(e){
    const box = tableBoxes[textResizeState.boxId];
    if(!box){ textResizeState = null; endInteraction('boxResize'); return; }
    if(!textResizeState.moved){ pushHistory(); textResizeState.moved = true; }
    const c = textBoxPoint(box, 0, 0), w = screenToWorld(e.clientX, e.clientY);
    const size = textResizeState.startSize * Math.hypot(w.x-c.x, w.y-c.y)/textResizeState.startDist;
    box.size = Math.min(TEXT_MAX_SIZE, Math.max(TEXT_MIN_SIZE, size));
    fitTextBox(box);
    invalidate();
  },
  end(){
    if(textResizeState.moved) scheduleAutosave();
    textResizeState = null;
    endInteraction('boxResize');
  },
});
// Scrolling while dragging a label turns it 15° a notch, as with pieces.
window.addEventListener('wheel', e=>{
  const box = boxDragState && tableBoxes[boxDragState.boxId];
  if(!isTextBox(box)) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if(!boxDragState.moved){ pushHistory(); boxDragState.moved = true; }
  box.rot = norm360((box.rot||0) + (e.deltaY<0 ? 15 : -15));
  invalidate();
}, {passive:false, capture:true});

// Typing in place: an HTML textarea floating over the canvas (outside the
// SVG, so redraws leave it alone), placed and turned to match the label and
// re-placed after each render. Enter finishes (Shift+Enter is a new line),
// Escape cancels, clicking away finishes. A label left empty is removed.
// `snap`: the undo point, taken before a new label was made.
let _textEditor = null; // {ta, box}
function placeTextEditor(){
  if(!_textEditor) return;
  const {ta, box} = _textEditor, s = view.scale;
  const probe = {...box, text:ta.value + (ta.value.endsWith('\n') ? ' ' : '')};
  fitTextBox(probe);
  // Plus room for the caret and the editor's own border (3px a side).
  const w = Math.max(probe.w, box.size*4) + box.size*0.5, h = probe.h;
  const cx = view.x + (box.x + box.w/2)*s, cy = view.y + (box.y + box.h/2)*s;
  Object.assign(ta.style, {left:`${cx}px`, top:`${cy}px`, width:`${w*s + 6}px`, height:`${h*s + 6}px`,
    fontSize:`${box.size*s}px`, padding:`${TEXT_PAD_EM*box.size*s}px`,
    transform:`translate(-50%,-50%) rotate(${box.rot||0}deg)`});
}
function startTextEdit(id, snap){
  const box = tableBoxes[id];
  if(!isTextBox(box) || box.locked || _textEditor) return;
  if(!beginInteraction('textEdit')) return;
  editingTextId = id;
  selectOnlyBox(id);
  const before = box.text, beforeSnap = snap || snapshotState();
  const ta = document.createElement('textarea');
  ta.className = 'text-editor';
  ta.value = box.text;
  ta.spellcheck = false;
  ta.style.fontFamily = TEXT_FONT;
  document.getElementById('canvasWrap').appendChild(ta);
  _textEditor = {ta, box};
  let done = false;
  const finish = keep=>{
    if(done) return;
    done = true;
    _textEditor = null;
    ta.remove();
    editingTextId = null;
    endInteraction('textEdit');
    const text = ta.value.replace(/\s+$/, '');
    if(keep && text){
      if(text!==before || snap){ pushHistory(beforeSnap); box.text = text; fitTextBox(box); scheduleAutosave(); }
    } else if(keep || !before){
      // Emptied, or a new label abandoned: remove it (a new one leaves no undo step).
      if(before) pushHistory(beforeSnap);
      delete tableBoxes[id];
      selectedBoxId = null;
      scheduleAutosave();
    }
    invalidate();
  };
  ta.addEventListener('input', placeTextEditor);
  ta.addEventListener('keydown', ev=>{
    ev.stopPropagation(); // typing never reaches the app shortcuts
    if(ev.key==='Enter' && !ev.shiftKey){ ev.preventDefault(); finish(true); }
    else if(ev.key==='Escape'){ ev.preventDefault(); finish(false); }
  });
  ta.addEventListener('blur', ()=>finish(true));
  invalidate();
  placeTextEditor();
  setTimeout(()=>{ ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }, 0); // caret at the end, to add to the text
}
// Palette: a click places an empty label mid-view, ready to type into.
function createTextLabelButton(){
  const b = document.createElement('button');
  b.className = 'pbtn';
  b.dataset.searchHay = 'text label note title comment caption annotation words';
  b.dataset.hint = 'p8';
  const textWrap = document.createElement('span');
  textWrap.className = 'pbtn-text';
  textWrap.innerHTML = tr('palette.textLabel.label');
  b.appendChild(textWrap);
  const icon = document.createElement('span');
  icon.className = 'pbtn-icon';
  icon.style.cssText = 'display:flex;align-items:center;justify-content:center;font:700 20px Georgia,serif;color:var(--text);';
  icon.textContent = 'T';
  b.appendChild(icon);
  b.addEventListener('click', ()=>{
    if(blocksOtherEditing() || interactionMode!=='idle') return;
    const stagger = TABLE_BOX_SPAWN_STAGGER * Object.values(tableBoxes).filter(isTextBox).length, c = viewCentreWorld();
    const snap = snapshotState(); // undo goes back to before the label existed
    const id = spawnTextBox(c.x + stagger, c.y + stagger);
    startTextEdit(id, snap);
  });
  return b;
}

