// Zoom as the readout shows it (2dp), so a zoom toggle's rule agrees with the
// number on screen: a view at 0.999 reads "1.00×" and keeps its ties.
function displayedZoom(){ return Math.round(view.scale*100)/100; }
function formatZoom(scale){ return scale.toFixed(2)+'×'; }
// A zoom toggle's hover text on hiding itself, which Settings can turn off.
const zoomHideText = t=>t.below
  ? `They hide themselves when zoomed out below ${formatZoom(t.below)}; turn them on here to keep them until you next zoom back in.`
  : 'They stay at every zoom (Settings).';
// Lengths of the user's layout, in mm or in inches (Settings). Product names
// and KATO's fixed standards (the 50 mm height) stay in mm; save files are
// always mm. `fine` is for small amounts: mm to 0.1, inches to 0.01.
const UNITS_KEY = 'katoUnitrackPlanner.units.v1';
// How far the arrow keys move the selection, in mm whatever the units shown: by
// default Kato's 33 mm track spacing, five of those with Shift, 3 mm with Ctrl.
const ARROW_STEPS_KEY = 'katoUnitrackPlanner.arrowSteps.v1';
const ARROW_STEP_DEFAULTS = {plain:33, shift:165, ctrl:3};
const ARROW_STEP_MIN = 0.1;
const arrowSteps = {...ARROW_STEP_DEFAULTS};
try{
  const saved = JSON.parse(localStorage.getItem(ARROW_STEPS_KEY)) || {};
  Object.keys(arrowSteps).forEach(k=>{ if(Number.isFinite(saved[k]) && saved[k]>=ARROW_STEP_MIN) arrowSteps[k] = saved[k]; });
}catch(err){}
const MM_PER_IN = 25.4;
let lengthUnit = 'mm';
try{ if(localStorage.getItem(UNITS_KEY)==='in') lengthUnit = 'in'; }catch(err){}
function lenValue(mm, fine){
  if(lengthUnit==='in') return +(mm/MM_PER_IN).toFixed(fine ? 2 : 1);
  return fine ? Math.round(mm*10)/10 : Math.round(mm);
}
const fmtLen = (mm, fine)=>`${lenValue(mm, fine)} ${tr('unit.'+lengthUnit)}`;
// A zoom toggle: detail the user shows or hides with a button (remembered in
// localStorage), which also hides itself when zoomed out below `below`, where
// it's too small to use and costs paint. `user` is the user's choice, which
// zoom never changes; `shown` is what the canvas draws, set by sync() at the
// start of each render. Clicking flips what's on screen and records it as the
// user's choice; turning it on below the threshold also sets `override`,
// which keeps it on until the view next reaches the threshold, re-arming the
// rule for the next zoom-out. The button is dashed while the user has it on
// but zoom has hidden it.
function zoomToggle({storageKey, below, buttonId, icon}){
  const t = {below, buttonId, icon, user:true, override:false, shown:true, _sig:null};
  try{ t.user = localStorage.getItem(storageKey)!=='0'; }catch(err){}
  t.shown = t.user;
  t.isBelow = ()=>displayedZoom() < t.below;
  t.autoHidden = ()=>t.user && !t.shown;
  t.sync = ()=>{
    if(!t.isBelow()) t.override = false;
    t.shown = t.user && (!t.isBelow() || t.override);
  };
  t.click = ()=>{
    if(t.shown){ t.user = false; t.override = false; }
    else { t.user = true; t.override = t.isBelow(); }
    try{ localStorage.setItem(storageKey, t.user ? '1' : '0'); }catch(err){}
  };
  // The button shows its state, touching the DOM only when that changes. Its
  // icon shows what's on screen now, as the part-labels button's does.
  t.syncButton = ()=>{
    const sig = `${t.shown}|${t.autoHidden()}`;
    if(sig===t._sig) return;
    t._sig = sig;
    const btn = document.getElementById(t.buttonId);
    btn.classList.toggle('active', t.shown);
    btn.classList.toggle('auto-hidden', t.autoHidden());
    btn.innerHTML = t.icon(t.shown);
  };
  return t;
}
const toggleLine = (x1,y1,x2,y2)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`;
const toggleIconSvg = inner=>`<svg viewBox="0 0 20 20" width="18" height="18" style="display:block;margin:auto;" aria-hidden="true">${inner}</svg>`;
// Ties: below 1.00× each is a pixel or two wide, and together they're most of
// the paint. `tiesView.shown` is what appendTies and each piece's spec read.
const TIES_AUTO_HIDE_BELOW = 1.0;
const tiesView = zoomToggle({storageKey:'katoUnitrackPlanner.showTies.v1', below:TIES_AUTO_HIDE_BELOW, buttonId:'tiesToggle',
  // Two rails at 45°; with ties, three ties across them.
  icon: withTies=>toggleIconSvg((withTies ? [-4, 0, 4].map(t=>toggleLine(10+t-3.5, 10-t-3.5, 10+t+3.5, 10-t+3.5)).join('') : '')
    + toggleLine(4.2, 13.2, 13.2, 4.2) + toggleLine(6.8, 15.8, 15.8, 6.8))});
// Open ports (the green dots and their click targets) and the orange flood
// arrows on a selection's connected ends: below 0.30× they're clutter, one
// element pair per port or arrow. The selected port and snap highlights still
// show; they're feedback, and never more than a few.
const PORTS_AUTO_HIDE_BELOW = 0.30;
const portsView = zoomToggle({storageKey:'katoUnitrackPlanner.showPorts.v1', below:PORTS_AUTO_HIDE_BELOW, buttonId:'portsToggle',
  // A track end at 45°; with ports, the open-port dot at its end.
  icon: withPorts=>toggleIconSvg(toggleLine(4.2, 15.8, 11, 9)
    + (withPorts ? `<circle cx="14.2" cy="5.8" r="3.2" fill="currentColor"/>` : `<circle cx="14.2" cy="5.8" r="3.2" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 1.6"/>`))});
const ZOOM_TOGGLES = [tiesView, portsView];
// How soon the zoom toggles hide themselves (Settings): a multiple of their
// thresholds, 0 for never.
const DETAIL_HIDE_KEY = 'katoUnitrackPlanner.detailHide.v1';
const DETAIL_HIDE = {sooner:2, default:1, later:0.5, never:0};
function setDetailHide(key){
  const f = DETAIL_HIDE[key] ?? 1;
  tiesView.below = TIES_AUTO_HIDE_BELOW*f;
  portsView.below = PORTS_AUTO_HIDE_BELOW*f;
}
// Part-code labels, four modes, cycled by one button: off; limited, the
// in-piece labels on pieces easily taken for a neighbour (`labelLength`: S64,
// the S60s); printed, the same in-piece label on every piece
// (appendPrintedLabel); all, every piece's part code at a readable screen size
// (drawPartLabels). Not a zoom toggle: labels matter most zoomed out. The icon
// shows the current mode.
const PART_LABEL_MODES = ['off', 'limited', 'printed', 'all'];
const PART_LABELS_KEY = 'katoUnitrackPlanner.partLabels.v1';
let partLabelMode = 'limited';
try{ const m = localStorage.getItem(PART_LABELS_KEY); if(PART_LABEL_MODES.includes(m)) partLabelMode = m; }catch(err){}
// Two rails with labels over them: dashed (off), one small (limited), three
// small (printed), full width (all).
function partLabelsIcon(mode){
  const chip = mode==='off' ? `<rect x="6" y="3" width="8" height="5" rx="1" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 1.5"/>`
    : mode==='limited' ? `<rect x="7.5" y="3.5" width="5" height="4" rx="1" fill="currentColor"/>`
    : mode==='printed' ? `<rect x="2.5" y="4" width="4" height="3.5" rx="0.8" fill="currentColor"/><rect x="8" y="4" width="4" height="3.5" rx="0.8" fill="currentColor"/><rect x="13.5" y="4" width="4" height="3.5" rx="0.8" fill="currentColor"/>`
    : `<rect x="3" y="2.5" width="14" height="6" rx="1" fill="currentColor"/>`;
  return toggleIconSvg(toggleLine(3, 11.5, 17, 11.5) + toggleLine(3, 15.5, 17, 15.5) + chip);
}
let _partLabelsSig = null;
function syncPartLabelsButton(){
  const sig = `${partLabelMode}|${currentLang}`;
  if(sig===_partLabelsSig) return;
  _partLabelsSig = sig;
  const btn = document.getElementById('partLabelsToggle');
  btn.classList.toggle('active', partLabelMode!=='off');
  btn.innerHTML = partLabelsIcon(partLabelMode);
  btn.title = tr('canvas.partLabels.title', partLabelMode);
}
document.getElementById('partLabelsToggle').addEventListener('click', ()=>{
  partLabelMode = PART_LABEL_MODES[(PART_LABEL_MODES.indexOf(partLabelMode)+1) % PART_LABEL_MODES.length];
  try{ localStorage.setItem(PART_LABELS_KEY, partLabelMode); }catch(err){}
  invalidate();
});
// Called by render(): applies the zoom toggles' rules, then updates their
// buttons and the zoom readout. The rules wait for a render; view frames
// (viewFrame) update only the readout.
function syncViewControls(){
  ZOOM_TOGGLES.forEach(t=>{ t.sync(); t.syncButton(); });
  syncPartLabelsButton();
  updateZoomReadout();
}
function updateZoomReadout(){
  const label = document.getElementById('zoomLevel'), text = formatZoom(displayedZoom());
  if(label.textContent!==text) label.textContent = text;
}
