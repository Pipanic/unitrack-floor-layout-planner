/* ============================================================
   TEST HOOK
   The release build (build.ps1 -Release) wraps the whole planner in one
   function, so none of its names are globals there. The test suites read
   these (and set the variables) by name through window.__planner; their
   bridge copies each one onto window, so tests written against the plain
   build still work. A
   test that needs another name needs it added here. Nothing in the planner
   uses this.
   ============================================================ */
window.__planner = {
  get LAYOUT_SETS(){ return LAYOUT_SETS; },
  get RAIL_OFF(){ return RAIL_OFF; },
  get TRACK_CATEGORIES(){ return TRACK_CATEGORIES; },
  get TRACK_TYPES(){ return TRACK_TYPES; },
  get TT(){ return TT; },
  get connections(){ return connections; }, set connections(v){ connections = v; },
  get focusedLevel(){ return focusedLevel; }, set focusedLevel(v){ focusedLevel = v; },
  get gapFill(){ return gapFill; }, set gapFill(v){ gapFill = v; },
  get gradientTool(){ return gradientTool; }, set gradientTool(v){ gradientTool = v; },
  get nextId(){ return nextId; }, set nextId(v){ nextId = v; },
  get pieces(){ return pieces; }, set pieces(v){ pieces = v; },
  get pngOpen(){ return pngOpen; }, set pngOpen(v){ pngOpen = v; },
  get redoStack(){ return redoStack; }, set redoStack(v){ redoStack = v; },
  get selectedBoxId(){ return selectedBoxId; }, set selectedBoxId(v){ selectedBoxId = v; },
  get selectedPieces(){ return selectedPieces; }, set selectedPieces(v){ selectedPieces = v; },
  get selectedPort(){ return selectedPort; }, set selectedPort(v){ selectedPort = v; },
  get tableBoxes(){ return tableBoxes; }, set tableBoxes(v){ tableBoxes = v; },
  get undoStack(){ return undoStack; }, set undoStack(v){ undoStack = v; },
  get view(){ return view; }, set view(v){ view = v; },
  get applyLayoutData(){ return applyLayoutData; },
  get clampView(){ return clampView; },
  get computePorts(){ return computePorts; },
  get crossoverGeometry(){ return crossoverGeometry; },
  get curveEnd(){ return curveEnd; },
  get deleteSelected(){ return deleteSelected; },
  get getPorts(){ return getPorts; },
  get gradeablePortGroups(){ return gradeablePortGroups; },
  get invalidate(){ return invalidate; },
  get isOpen(){ return isOpen; },
  get pieceCenterLocal(){ return pieceCenterLocal; },
  get pieceGraphics(){ return pieceGraphics; },
  get placeAttached(){ return placeAttached; },
  get placeSet(){ return placeSet; },
  get powerDistances(){ return powerDistances; },
  get pushHistory(){ return pushHistory; },
  get recentreView(){ return recentreView; },
  get redo(){ return redo; },
  get render(){ return render; },
  get selectOnlyBox(){ return selectOnlyBox; },
  get spawnAttached(){ return spawnAttached; },
  get spawnFree(){ return spawnFree; },
  get spawnTableBox(){ return spawnTableBox; },
  get undo(){ return undo; },
  get updateHistoryButtons(){ return updateHistoryButtons; },
  get worldHeading(){ return worldHeading; },
  get worldPoint(){ return worldPoint; },
};
