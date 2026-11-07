/* ============================================================
   STATE
   `connections` (symmetric, port <-> port) is the only record of what's
   linked; there is no parent/child field. Selection is a flat set of
   piece ids.
   ============================================================ */
let pieces = {};      // id -> {id, typeId, ox, oy, rot, portElev:[one elevation per port]}
let connections = {}; // "pieceId:portIdx" -> "otherId:otherPortIdx"  (both directions stored)
// UniJoiners by the end they're fitted to, "pieceId:portIdx" -> 'TJ' (a
// feeder) or 'IJ' (insulated). At a joint it's on one side's end;
// disconnectPort leaves it with the piece that stays (UNIJOINERS).
let joiners = {};
// The Terminal UniJoiners set on the far side of their track from the default
// (joinerPose), by the same key: true. Absent means the default side.
let joinerFlip = {};
let nextId = 1;
let selectedPort = null;     // {pieceId, portIdx} — for palette attach flow
let selectedPieces = new Set(); // piece ids — for select/drag/delete

// Tabletop: a reference rectangle for the real benchtop or floor, no ports.
// {id, x, y, w, h, locked}, top-left, mm.
let tableBoxes = {};
// Mutually exclusive with selectedPieces and selectedPort: a piece group, an
// open port, or a tabletop — never two at once. Anything that sets one clears
// the others.
let selectedBoxId = null;
let selectedJoiner = null; // a joiners key
// Nearest edge of the selected unlocked tabletop to the cursor; its padlock
// sits there. Only re-renders when the edge changes.
let boxHoverEdge = null;
// Tabletop move and resize are separate gestures with different maths, so each
// has its own state.
let boxDragState = null;   // {boxId, startX, startY, startBoxX, startBoxY, moved}
let boxResizeState = null; // {boxId, corner, startX, startY, startBox:{x,y,w,h}, moved}
// The tabletop dimension label currently showing an input instead of text.
// Cleared with the selection, so an edit can't carry over to another tabletop.
let editingBoxDimension = null; // {boxId, dim:'w'|'h'}
// Replaces the whole selection with one kind (or none). Every selection change
// goes through here, so the kinds stay exclusive.
function setSelection({ids = [], port = null, box = null, joiner = null} = {}){
  selectedPieces = new Set(ids);
  selectedPort = port;
  selectedBoxId = box;
  selectedJoiner = joiner;
  boxHoverEdge = null;
}
// Double-click is detected manually: render() rebuilds the port hit zones on
// every click (and a piece whose drawing changes), so the second click may not
// land on the same DOM node and Chromium won't synthesise a native dblclick.
let lastPieceClick = null; // {pieceId, time}
let lastPortClick = null;  // {pieceId, portIdx, time}
const DOUBLE_CLICK_MS = 400;
// Palette press: mouseup decides between click-to-attach and a free or snapped
// drop. snapTarget is recomputed per mousemove so the ghost shows exactly where
// it lands.
let paletteDrag = null; // {typeId, startX, startY, moved, worldX, worldY, rot, snapTarget}
let joinerDrag = null; // {from (a joiners key, or null from the palette), startX, startY, moved, worldX, worldY, target}

