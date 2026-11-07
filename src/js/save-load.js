/* ============================================================
   SAVE / LOAD
   The layout is `pieces` + `connections` + `nextId` + `tableBoxes`, so a
   JSON dump of those is a complete save. View and selection aren't
   saved; a load reframes on the layout.
   ============================================================ */
function serializeLayout(){
  return JSON.stringify({
    schema: SAVE_SCHEMA,
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    nextId,
    pieces,
    connections,
    tableBoxes,
    joiners,
    joinerFlip,
  }, null, 2);
}
function flashSaveLoadMsg(text, isError){
  const el_ = document.getElementById('saveLoadMsg');
  if(!el_) return; // a missing status element mustn't break Save/Load
  el_.textContent = text;
  el_.style.color = isError ? 'var(--danger)' : 'var(--text-dim)';
  clearTimeout(flashSaveLoadMsg._t);
  flashSaveLoadMsg._t = setTimeout(()=>{ el_.textContent=''; }, 4000);
}
// Saving: the `downloads` capability inside a Claude artifact (where <a
// download> silently does nothing), <a download> standalone. Resolved once at
// startup.
let downloadsCapability = null;
if(window.claude && typeof window.claude.use==='function'){
  window.claude.use('downloads').then(ns=>{ downloadsCapability = ns; }).catch(()=>{});
}
// Every download (layout, inventory, CSV, PNG) goes through here. Resolves
// false if the user declined, rejects if saving failed.
async function offerDownload(blob, filename){
  if(downloadsCapability){
    try{ await downloadsCapability.save({filename, data:blob}); return true; }
    catch(err){ if(err && err.code==='declined') return false; throw err; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return true;
}
// Date and time for a file name: 2026-10-04-09-15.
const fileStamp = ()=>new Date().toISOString().slice(0,16).replace(/[:T]/g,'-');
function flashSaveFailed(err){
  flashSaveLoadMsg(tr('msg.saveFailed', err && err.message ? err.message : tr('msg.saveFailed.unknown')), true);
}
// In-app dialog instead of window.confirm(), which the artifact sandbox
// silently suppresses. Promise-based: `if(!await askConfirm(...)) return;`.
// Swallows shortcuts while open (confirmKeys, via onKeyDown).
let confirmOpen = false;
let confirmResolver = null;
function askConfirm(message, confirmLabel){
  document.getElementById('confirmText').textContent = message;
  const okBtn = document.getElementById('confirmOkBtn');
  okBtn.textContent = confirmLabel || tr('dialog.ok.default');
  document.getElementById('confirmOverlay').style.display = 'flex';
  confirmOpen = true;
  okBtn.focus();
  return new Promise(resolve=>{ confirmResolver = resolve; });
}
function closeConfirm(result){
  if(!confirmOpen) return;
  confirmOpen = false;
  document.getElementById('confirmOverlay').style.display = 'none';
  const resolve = confirmResolver;
  confirmResolver = null;
  if(resolve) resolve(result);
}
document.getElementById('confirmOkBtn').addEventListener('click', ()=>closeConfirm(true));
document.getElementById('confirmCancelBtn').addEventListener('click', ()=>closeConfirm(false));
// backdrop click cancels, like the Help modal
document.getElementById('confirmOverlay').addEventListener('click', e=>{
  if(e.target.id==='confirmOverlay') closeConfirm(false);
});
// The confirmation's keys (the topmost dialog layer of onKeyDown).
function confirmKeys(e){
  if(e.key==='Escape'){ closeConfirm(false); e.preventDefault(); return; }
  if(e.key==='Enter'){ closeConfirm(true); e.preventDefault(); }
}

// New: applyLayoutData() with an empty layout, so everything clears as on
// Load, leaving the start screen. Confirmed first, since it can't be undone
// once autosaved.
document.getElementById('newBtn').addEventListener('click', async ()=>{
  if(!isLayoutEmpty() && !await askConfirm(
      tr('confirm.newLayout.message'),
      tr('confirm.newLayout.confirmLabel'))) return;
  applyLayoutData({pieces:{}, connections:{}, tableBoxes:{}, nextId:1});
  render();
  recentreView();
  doAutosave(); // the empty layout becomes the autosave baseline, as after Load
  flashSaveLoadMsg(tr('msg.newLayoutStarted'));
});
document.getElementById('saveBtn').addEventListener('click', async ()=>{
  try{
    if(await offerDownload(new Blob([serializeLayout()], {type:'application/json'}), `kato-layout-${fileStamp()}.json`))
      flashSaveLoadMsg(tr('msg.saved', Object.keys(pieces).length));
  }catch(err){ flashSaveFailed(err); }
});
document.getElementById('loadBtn').addEventListener('click', ()=>{
  document.getElementById('loadInput').click();
});
// Installs a serialized layout, for Load and autosave restore. Unknown types
// are dropped; history starts fresh.
function applyLayoutData(data){
  const loadedPieces = {};
  let skipped = 0;
  Object.values(data.pieces).forEach(p=>{
    if(p && typeof p==='object' && p.id && TT[p.typeId]
      && Number.isFinite(p.ox) && Number.isFinite(p.oy) && Number.isFinite(p.rot)){
      // portElev may be missing or malformed: pad with ground.
      const wantLen = getPorts(TT[p.typeId]).length;
      const validElev = Array.isArray(p.portElev) && p.portElev.length===wantLen
        && p.portElev.every(e=>Number.isFinite(e) && e>=0 && e<=ELEV_MAX_MM);
      loadedPieces[p.id] = {id:p.id, typeId:p.typeId, ox:p.ox, oy:p.oy, rot:p.rot,
        portElev: validElev ? p.portElev.slice() : new Array(wantLen).fill(0)};
    } else {
      skipped++;
    }
  });
  // Keep a connection only if valid from both ends.
  const parsePortKey = key=>{
    const s = String(key), i = s.lastIndexOf(':');
    if(i<1) return null;
    const pieceId = s.slice(0,i), portIdx = Number(s.slice(i+1));
    const p = loadedPieces[pieceId];
    return (p && Number.isInteger(portIdx) && portIdx>=0 && portIdx<p.portElev.length) ? {pieceId, portIdx} : null;
  };
  const loadedConnections = {};
  Object.entries(data.connections).forEach(([k,v])=>{
    const a = parsePortKey(k), b = parsePortKey(v);
    if(!a || !b || String(data.connections[String(v)])!==k) return;
    if(a.pieceId===b.pieceId && a.portIdx===b.portIdx) return;
    loadedConnections[connKey(a.pieceId,a.portIdx)] = connKey(b.pieceId,b.portIdx);
  });
  // file's nextId, but never below an id in use
  let maxIdNum = 0;
  Object.keys(loadedPieces).forEach(id=>{
    const m = /^p(\d+)$/.exec(id);
    if(m) maxIdNum = Math.max(maxIdNum, parseInt(m[1],10));
  });
  const loadedTableBoxes = {};
  let maxBoxIdNum = 0;
  if(data.tableBoxes && typeof data.tableBoxes==='object'){
    Object.values(data.tableBoxes).forEach(b=>{
      if(b && typeof b==='object' && b.id
        && Number.isFinite(b.x) && Number.isFinite(b.y)
        && Number.isFinite(b.w) && Number.isFinite(b.h) && b.w>0 && b.h>0){
        const box = {id:b.id, x:b.x, y:b.y, w:b.w, h:b.h, locked:!!b.locked};
        // A text label: refitted to its text, about its saved centre.
        if(b.kind==='text' && typeof b.text==='string' && Number.isFinite(b.size)){
          Object.assign(box, {kind:'text', text:b.text, size:Math.min(TEXT_MAX_SIZE, Math.max(TEXT_MIN_SIZE, b.size)), rot:Number.isFinite(b.rot) ? b.rot : 0});
          fitTextBox(box);
        }
        loadedTableBoxes[b.id] = box;
        const m = /^box(\d+)$/.exec(b.id);
        if(m) maxBoxIdNum = Math.max(maxBoxIdNum, parseInt(m[1],10));
      }
    });
  }
  // UniJoiners: on a loaded piece's end, one per joint. Saves before the
  // insulated kind list the ends alone, all Terminal UniJoiners.
  const loadedJoiners = {}, loadedJoinerFlip = {};
  const savedJoiners = Array.isArray(data.joiners) ? data.joiners.map(k=>[k, 'TJ'])
    : data.joiners && typeof data.joiners==='object' ? Object.entries(data.joiners) : [];
  savedJoiners.forEach(([k, kind])=>{
    const a = parsePortKey(k);
    if(!a || !JOINER_TYPES.some(t=>t.id===kind)) return;
    const key = connKey(a.pieceId, a.portIdx), other = loadedConnections[key];
    if(kind==='IJ' && !other) return; // an IJ needs its joint
    if(!loadedJoiners[key] && !(other && loadedJoiners[other])){
      loadedJoiners[key] = kind;
      if(isFeeder(kind) && data.joinerFlip && data.joinerFlip[k] === true) loadedJoinerFlip[key] = true;
    }
  });
  pieces = loadedPieces;
  connections = loadedConnections;
  tableBoxes = loadedTableBoxes;
  joiners = loadedJoiners;
  joinerFlip = loadedJoinerFlip;
  nextId = Math.max(Number.isFinite(data.nextId)?data.nextId:0, maxIdNum+1, maxBoxIdNum+1);
  clearTransientState();
  undoStack = [];
  redoStack = [];
  updateHistoryButtons();
  return {pieceCount: Object.keys(loadedPieces).length, skipped};
}
// Why a parsed file can't be loaded, or null. Unstamped files predate
// versioning and are accepted.
function layoutFileProblem(data){
  if(!data || typeof data.pieces!=='object' || typeof data.connections!=='object') return tr('msg.layoutProblem.unrecognised');
  if(data.schema!==undefined && data.schema!==SAVE_SCHEMA) return tr('msg.layoutProblem.foreignSchema');
  if(Number.isFinite(data.version) && data.version>SAVE_VERSION) return tr('msg.layoutProblem.newerVersion');
  return null;
}
// Restore the last autosave. Returns false, changing nothing, on no save, bad
// JSON or blocked storage.
function tryRestoreAutosave(){
  let raw = null;
  try{
    raw = localStorage.getItem(AUTOSAVE_KEY);
  }catch(err){
    autosaveAvailable = false; // storage blocked entirely: stop trying this session
    return false;
  }
  if(!raw) return false;
  let data;
  try{ data = JSON.parse(raw); }catch(err){ return false; }
  if(layoutFileProblem(data)) return false;
  applyLayoutData(data);
  const when = data.savedAt ? new Date(data.savedAt) : null;
  flashSaveLoadMsg(when ? tr('msg.restoredAutosaveFrom', when.toLocaleString()) : tr('msg.restoredAutosave'));
  return true;
}
document.getElementById('loadInput').addEventListener('change', (e)=>{
  const file = e.target.files[0];
  e.target.value = ''; // so choosing the same file again still fires 'change'
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    let data;
    try{
      data = JSON.parse(/** @type {string} */ (reader.result));
    }catch(err){
      flashSaveLoadMsg(tr('msg.loadFailed.badJson'), true);
      return;
    }
    const problem = layoutFileProblem(data);
    if(problem){
      flashSaveLoadMsg(tr('msg.loadFailed.reason', problem), true);
      return;
    }
    const {pieceCount, skipped} = applyLayoutData(data);
    render();
    recentreView();
    flashSaveLoadMsg(skipped
      ? tr('msg.loadedWithSkipped', pieceCount, skipped)
      : tr('msg.loaded', pieceCount));
    // the loaded layout becomes the autosave baseline, so closing the tab
    // straight after doesn't revert it
    doAutosave();
  };
  reader.onerror = ()=>flashSaveLoadMsg(tr('msg.loadFailed.readError'), true);
  reader.readAsText(file);
});

function fitViewBox(){
  const wrap = document.getElementById('canvasWrap');
  svg.setAttribute('viewBox',`0 0 ${wrap.clientWidth} ${wrap.clientHeight}`);
  clampView();
  invalidate();
}
window.addEventListener('resize', fitViewBox);

// Startup, last: applyLayoutData() and tryRestoreAutosave() need every
// declaration above. The palette is built once, first.
renderPalette();
buildEmptyStart();

tryRestoreAutosave(); // nothing saved: an empty layout, showing the start screen
render();
recentreView();
// The zoom toggles' buttons (ties, ports); see zoomToggle.
ZOOM_TOGGLES.forEach(t=>document.getElementById(t.buttonId).addEventListener('click', ()=>{ t.click(); invalidate(); }));
sizeHintBox();
fitViewBox();
