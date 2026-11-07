/* ============================================================
   AUTOSAVE
   Debounced write to localStorage shortly after each change
   (pushHistory, undo/redo, and the end of a drag). A per-browser safety
   net holding only the latest state, separate from Save/Load files.
   ============================================================ */
// Save stamp. Bump SAVE_VERSION when older builds would misread a new file;
// newer files are then refused rather than half-loaded.
const SAVE_SCHEMA = 'kato-unitrack-planner';
const SAVE_VERSION = 1;
const AUTOSAVE_KEY = 'katoUnitrackPlanner.autosave.v1';
const AUTOSAVE_DEBOUNCE_MS = 900;
let autosaveTimer = null;
let autosaveAvailable = true; // false after the first localStorage failure, so it isn't retried and reported on every change
// The user can turn autosave off (Settings), which also deletes the copy.
const AUTOSAVE_ON_KEY = 'katoUnitrackPlanner.autosaveOn.v1';
let autosaveOn = true;
try{ autosaveOn = localStorage.getItem(AUTOSAVE_ON_KEY)!=='0'; }catch(err){}
function scheduleAutosave(){
  if(!autosaveAvailable || !autosaveOn) return;
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(()=>{ autosaveTimer = null; doAutosave(); }, AUTOSAVE_DEBOUNCE_MS);
}
// Closing or leaving the page doesn't wait for the debounce, or the last moment's
// edits would be lost.
window.addEventListener('pagehide', ()=>{
  if(autosaveTimer===null) return;
  clearTimeout(autosaveTimer);
  autosaveTimer = null;
  doAutosave();
});
function flashAutosaveMsg(text, isError){
  const el_ = document.getElementById('autosaveMsg');
  if(!el_) return;
  el_.textContent = text;
  el_.style.color = isError ? 'var(--danger)' : 'var(--text-dim)';
  clearTimeout(flashAutosaveMsg._t);
  flashAutosaveMsg._t = setTimeout(()=>{ el_.textContent=''; }, 2200);
}
function doAutosave(){
  if(!autosaveAvailable || !autosaveOn) return;
  try{
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
      schema:SAVE_SCHEMA, version:SAVE_VERSION,
      savedAt: new Date().toISOString(), nextId, pieces, connections, tableBoxes, joiners, joinerFlip,
    }));
    flashAutosaveMsg(tr('msg.autosaved'));
  }catch(err){
    autosaveAvailable = false;
    flashAutosaveMsg(tr('msg.autosaveUnavailable'), true);
  }
}

