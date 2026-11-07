/* ============================================================
   HOVER HINTS
   The green panel explains what the pointer is over. Canvas elements
   carry data-hint when drawn, header and panel buttons in the markup; one
   delegated mouseover reads it. Priority: a refusal message, then the action
   under way (dragging, marquee), then the hover hint, then the state hint
   renderSelection sets. The box keeps the height of its longest message so
   the panel below doesn't jump as the pointer moves.
   ============================================================ */
let stateHint = {cls:'', text:''};
let hoverHintEl = null; // element under the pointer carrying data-hint, or the stage
let lastPointer = null; // {x, y} client coords, for re-checking after a render
function setStateHint(cls, text){ stateHint = {cls, text}; }
const canMutate = t=>!!TT[t].expansion || mutateTypeId(t, 1)!==t;
const canFlip = t=>!!FLIP_OPPOSITE[t];
// Pieces get their hint when drawn, from the state that draw already knows.
function pieceHintKey(piece, type, isSelected, frame){
  if(gradientTool){
    if(gradientTool.chain.length>0){
      // Building a chain: a click extends it to a piece further along, or
      // shortens it to one already in it (gradientChainTo).
      const chain = gradientTool.chain, at = chain.findIndex(c=>c.pieceId===piece.id);
      if(at>=0) return at===chain.length-1 ? '' : 'g9';
      const r = frame.gradientReach && frame.gradientReach.get(piece.id);
      return !r ? '' : r.ambiguous ? 'g10' : 'g8';
    }
    if(frame.existingSlopeToneById.has(piece.id) || isSlopedPiece(piece, type)) return 'g2';
    return gradeablePortGroups(type) ? 'g1' : 'g3';
  }
  if(frame.powerById) return 'w1'; // its joints from a feeder (hoverHintText)
  if(frame.overLimit.has(piece.id)) return 'c10';
  if(type.cat==='turntableBridge') return 'c8';
  if(isSelected) return selectedPieces.size>1 ? 'c4' : 'c3';
  return 'c2';
}
function hoverHintText(){
  if(hoverHintEl && !hoverHintEl.isConnected && lastPointer){
    hoverHintEl = hintTargetOf(document.elementFromPoint(lastPointer.x, lastPointer.y));
  }
  const el_ = hoverHintEl;
  if(!el_ || !el_.isConnected) return null;
  if(el_.id==='stage') return (!gradientTool && selectedPieces.size===0 && !selectedPort && !selectedBoxId
    && Object.keys(pieces).length>0) ? tr('hover.c1') : null;
  const key = el_.dataset.hint;
  if(!key) return null;
  if(key==='palette'){
    const t = el_.dataset.typeId;
    if(limitedMode && stockShortfall(withPartner(t), [])) return tr('hover.p3');
    return selectedPort ? tr('hover.p2') : tr('hover.p1', canMutate(t), canFlip(t));
  }
  if(key==='b11') return tr('hover.b11', partLabelMode);
  if(key==='b14') return tr('hover.b14', selectionAllElevated());
  if(key==='w1'){
    const p = pieces[el_.dataset.id];
    const t = p && pieceType(p.id);
    return p ? tr('hover.w1', _power.byPiece.get(p.id), powerJointsLimit, !!(t.feeder || t.dualFeeder),
      _power.split.get(p.id), !!t.powerBlock) : null;
  }
  if(key==='b15') return tr('hover.b15', powerJointsLimit);
  if(key==='w2') return tr('hover.w2', POWER_JOINTS_DEFAULT);
  if(key==='c3'){
    const p = pieces[el_.dataset.id];
    return p ? tr('hover.c3', canMutate(p.typeId), canFlip(p.typeId)) : null;
  }
  return tr('hover.'+key);
}
function actionHintText(){
  if(gapFill) return gapFillHintText();
  if(dragState && dragState.moved){
    const single = dragState.group.size===1 ? pieces[dragState.primaryId].typeId : null;
    return tr('hover.a1', !!single && canMutate(single), !!single && canFlip(single));
  }
  if(paletteDrag && paletteDrag.moved) return tr('hover.a2', canMutate(paletteDrag.typeId), canFlip(paletteDrag.typeId));
  if(setDrag && setDrag.moved) return tr('hover.a4');
  if(boxSelect) return tr('hover.a3');
  return null;
}
function updateHint(){
  const hint = document.getElementById('hint');
  let cls = stateHint.cls, text = stateHint.text;
  const busy = interactionMode!=='idle' && interactionMode!=='gradient';
  const hover = busy ? null : hoverHintText();
  const action = actionHintText();
  if(hover){ cls = ''; text = hover; }
  if(action){ cls = ''; text = action; }
  if(transientHint && Date.now()<transientHint.until){ cls = 'warn'; text = transientHint.text; }
  if(hint.className!==cls) hint.className = cls;
  if(hint.textContent!==text) hint.textContent = text;
}
function hintTargetOf(node){
  if(!(node instanceof Element)) return null;
  return node.closest('[data-hint]') || (node.closest('#stage') ? document.getElementById('stage') : null);
}
// mousemove, not mouseover: after a render the element under a still pointer
// is replaced, and the first small move must pick up its successor.
document.addEventListener('mousemove', e=>{
  lastPointer = {x:e.clientX, y:e.clientY};
  const t = hintTargetOf(e.target);
  if(t===hoverHintEl) return;
  hoverHintEl = t;
  updateHint();
});
document.documentElement.addEventListener('mouseleave', ()=>{ hoverHintEl = null; lastPointer = null; updateHint(); });
// render() replaces the canvas, so a still pointer's element is gone; look
// again at the same spot.
function refreshHoverAfterRender(){
  if(!lastPointer || (interactionMode!=='idle' && interactionMode!=='gradient')) return;
  hoverHintEl = hintTargetOf(document.elementFromPoint(lastPointer.x, lastPointer.y));
}
// Tallest message, so the box never changes height. Re-run on resize and on a
// language change.
function sizeHintBox(){
  const hint = document.getElementById('hint');
  const keep = {cls: hint.className, text: hint.textContent};
  hint.style.minHeight = '';
  const table = STRINGS[currentLang] || STRINGS.en;
  const texts = [];
  Object.keys(table).forEach(k=>{
    if(!(k.startsWith('hover.') || k.startsWith('hint.') || k==='gradient.info.default')) return;
    const v = tr(k, true, true);
    if(typeof v==='string') texts.push(v);
  });
  texts.push(tr('limited.short', 'WR414/381VSAR'));
  let max = 0;
  hint.className = '';
  texts.forEach(t=>{ hint.textContent = t; max = Math.max(max, hint.offsetHeight); });
  hint.className = keep.cls; hint.textContent = keep.text;
  hint.style.minHeight = max + 'px';
}
window.addEventListener('resize', ()=>sizeHintBox());

