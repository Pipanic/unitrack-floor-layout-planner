/* ============================================================
   UNDO / REDO
   Whole-state snapshots rather than diffs: the state is small even for a
   large layout. pushHistory() once per user-perceived action, at the
   moment it commits to a change — never per mousemove.
   ============================================================ */
const MAX_HISTORY = 50;
let undoStack = [];
let redoStack = [];
function snapshotState(){
  return JSON.parse(JSON.stringify({pieces, connections, nextId, tableBoxes, joiners, joinerFlip}));
}
// `snapshot` is optional: for an action that might change nothing (say, an
// attach the superelevation gate refuses), take it BEFORE the action and call
// this only on success, so a refused action leaves no empty undo step.
function pushHistory(snapshot){
  undoStack.push(snapshot || snapshotState());
  if(undoStack.length>MAX_HISTORY) undoStack.shift();
  redoStack.length = 0;
  updateHistoryButtons();
  scheduleAutosave();
}
// Everything an in-progress interaction holds. Whole-layout replacement must
// clear it all, or it may name a piece that no longer exists (Gradient Mode's
// chain crashes the render).
function clearTransientState(){
  setSelection();
  editingBoxDimension = null;
  dragState = null;
  paletteDrag = null;
  joinerDrag = null;
  setDrag = null;
  boxSelect = null;
  boxDragState = null;
  boxResizeState = null;
  textResizeState = null;
  editingTextId = null;
  if(_textEditor){ _textEditor.ta.remove(); _textEditor = null; }
  gapFill = null;
  interactionMode = 'idle'; // forced reset regardless of which mode was active
  if(gradientTool || gradientSelectedGroup) resetGradientTool();
}
function restoreState(snap){
  pieces = snap.pieces;
  connections = snap.connections;
  nextId = snap.nextId;
  tableBoxes = snap.tableBoxes;
  joiners = snap.joiners || {};
  joinerFlip = snap.joinerFlip || {};
  clearTransientState();
  invalidate();
  updateHistoryButtons();
}
function undo(){
  if(!undoStack.length) return;
  redoStack.push(snapshotState());
  restoreState(undoStack.pop());
  scheduleAutosave();
}
function redo(){
  if(!redoStack.length) return;
  undoStack.push(snapshotState());
  restoreState(redoStack.pop());
  scheduleAutosave();
}
function updateHistoryButtons(){
  const u = document.getElementById('undoBtn'), r = document.getElementById('redoBtn');
  if(u) u.disabled = !undoStack.length;
  if(r) r.disabled = !redoStack.length;
}

