/* ============================================================
   SETTINGS
   The header's ⚙ Settings: a small dialog holding the theme and language
   selects, which keep their own wiring above. Each change applies at once.
   ============================================================ */
let settingsOpen = false;
function openSettings(){
  settingsOpen = true;
  document.getElementById('settingsOverlay').style.display = 'flex';
  document.getElementById('settingsBtn').setAttribute('aria-expanded','true');
  document.getElementById('themeSelect').focus();
}
function closeSettings(){
  settingsOpen = false;
  document.getElementById('settingsOverlay').style.display = 'none';
  const btn = document.getElementById('settingsBtn');
  btn.setAttribute('aria-expanded','false');
  btn.focus();
}
// The dialog's keys (a dialog layer of onKeyDown); the selects keep their own.
function settingsKeys(e){
  if(e.key==='Escape'){ closeSettings(); e.preventDefault(); }
}
// Track colours the user can pick: each a custom property in :root, whose
// value there is the default. Only picks are stored, so a changed default
// still reaches everyone who kept it.
const USER_COLOURS = ['ground', 'elev-flat', 'slope-low', 'slope-high', 'power-near', 'power-far', 'sel'];
const COLOURS_KEY = 'katoUnitrackPlanner.colours.v1';
let userColours = {};
function setUserColour(name, hex){
  const root = document.documentElement.style;
  if(hex) userColours[name] = hex; else delete userColours[name];
  if(hex) root.setProperty('--'+name, hex); else root.removeProperty('--'+name);
  // The selected fill and the part-code pill are dark shades of a picked
  // selection colour; unpicked, the stylesheet's own.
  if(name==='sel'){
    if(hex){
      root.setProperty('--sel-fill', `color-mix(in srgb, ${hex} 40%, #10141a)`);
      root.setProperty('--sel-pill', `color-mix(in srgb, ${hex} 12%, #10141a)`);
    } else { root.removeProperty('--sel-fill'); root.removeProperty('--sel-pill'); }
  }
  try{ localStorage.setItem(COLOURS_KEY, JSON.stringify(userColours)); }catch(err){}
}
(function initUserColours(){
  let saved = {};
  try{ saved = JSON.parse(localStorage.getItem(COLOURS_KEY)) || {}; }catch(err){}
  const body = document.querySelector('#settingsModal .settings-body');
  const current = name=>getComputedStyle(document.documentElement).getPropertyValue('--'+name).trim();
  USER_COLOURS.forEach(name=>{
    if(/^#[0-9a-f]{6}$/i.test(saved[name] || '')) setUserColour(name, saved[name]);
    const label = document.createElement('label');
    label.htmlFor = 'colour-'+name;
    label.dataset.str = 'settings.colour.'+name;
    label.textContent = tr(label.dataset.str);
    const row = document.createElement('span');
    row.className = 'settings-colour';
    const input = document.createElement('input');
    input.type = 'color';
    input.id = 'colour-'+name;
    input.value = current(name);
    input.addEventListener('input', ()=>setUserColour(name, input.value));
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'hdrbtn';
    reset.textContent = '\u21ba';
    reset.dataset.strTitle = 'settings.reset.title';
    reset.title = tr('settings.reset.title');
    reset.addEventListener('click', ()=>{ setUserColour(name, null); input.value = current(name); });
    row.append(input, reset);
    body.append(label, row);
  });
})();
// Units, slope limit, detail hiding and autosave: each applies at once and is
// remembered in this browser.
(function initPlanningSettings(){
  const store = (key, value)=>{ try{ localStorage.setItem(key, value); }catch(err){} };
  const units = document.getElementById('unitsSelect');
  units.value = lengthUnit;
  units.addEventListener('change', ()=>{
    lengthUnit = units.value;
    store(UNITS_KEY, lengthUnit);
    showArrowSteps();
    renderPalette(); // the tabletop's size
    if(gradientTool) updateGradientUI();
    invalidate();
  });
  const slope = document.getElementById('slopeSelect');
  slope.value = String(gradientTargetPct);
  slope.addEventListener('change', ()=>{
    setSlopeLimit(+slope.value);
    store(SLOPE_LIMIT_KEY, slope.value);
    sizeHintBox();
    if(gradientTool) updateGradientUI();
    invalidate();
  });
  const detail = document.getElementById('detailSelect');
  let saved = null;
  try{ saved = localStorage.getItem(DETAIL_HIDE_KEY); }catch(err){}
  detail.value = Object.hasOwn(DETAIL_HIDE, saved) ? saved : 'default';
  setDetailHide(detail.value);
  detail.addEventListener('change', ()=>{
    setDetailHide(detail.value);
    store(DETAIL_HIDE_KEY, detail.value);
    sizeHintBox();
    invalidate();
  });
  // Arrow key steps: typed in the chosen unit, kept in mm. Each applies as it's
  // typed; leaving the box shows the stored value again, so a bad entry reverts.
  const stepRows = document.getElementById('arrowStepRows');
  const stepShown = {};
  const showStep = key=>{
    stepShown[key].input.value = lenValue(arrowSteps[key], true);
    stepShown[key].unit.textContent = tr('unit.'+lengthUnit);
  };
  function showArrowSteps(){ Object.keys(arrowSteps).forEach(showStep); }
  const storeSteps = ()=>store(ARROW_STEPS_KEY, JSON.stringify(arrowSteps));
  Object.keys(arrowSteps).forEach(key=>{
    const label = document.createElement('label');
    label.htmlFor = 'arrowStep-'+key;
    label.dataset.str = 'settings.step.'+key;
    label.textContent = tr(label.dataset.str);
    const row = document.createElement('span');
    row.className = 'settings-colour';
    const input = document.createElement('input');
    input.type = 'number';
    input.id = 'arrowStep-'+key;
    input.min = '0';
    input.step = 'any';
    input.dataset.strTitle = 'settings.step.title';
    input.title = tr('settings.step.title');
    const unit = document.createElement('span');
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'hdrbtn';
    reset.textContent = '↺';
    reset.dataset.strTitle = 'settings.step.reset.title';
    reset.title = tr('settings.step.reset.title');
    stepShown[key] = {input, unit};
    input.addEventListener('input', ()=>{
      const n = parseFloat(input.value), mm = lengthUnit==='in' ? n*MM_PER_IN : n;
      if(!(mm>=ARROW_STEP_MIN)) return;
      arrowSteps[key] = mm;
      storeSteps();
    });
    input.addEventListener('change', ()=>showStep(key));
    reset.addEventListener('click', ()=>{
      arrowSteps[key] = ARROW_STEP_DEFAULTS[key];
      storeSteps();
      showStep(key);
    });
    row.append(input, unit, reset);
    stepRows.append(label, row);
    showStep(key);
  });
  const autosave = document.getElementById('autosaveCheck');
  autosave.checked = autosaveOn;
  autosave.addEventListener('change', ()=>{
    autosaveOn = autosave.checked;
    store(AUTOSAVE_ON_KEY, autosaveOn ? '1' : '0');
    if(autosaveOn) doAutosave();
    else {
      clearTimeout(autosaveTimer);
      try{ localStorage.removeItem(AUTOSAVE_KEY); }catch(err){}
    }
  });
  // Everything the planner keeps in this browser, then a fresh start.
  document.getElementById('forgetBtn').addEventListener('click', async ()=>{
    if(!await askConfirm(tr('settings.forget.confirm'), tr('settings.forget'))) return;
    autosaveOn = false;
    clearTimeout(autosaveTimer);
    try{
      Object.keys(localStorage).filter(k=>k.startsWith('katoUnitrackPlanner.') || k===LANG_KEY)
        .forEach(k=>localStorage.removeItem(k));
    }catch(err){}
    location.reload();
  });
})();
document.getElementById('settingsBtn').addEventListener('click', openSettings);
document.getElementById('settingsCloseBtn').addEventListener('click', closeSettings);
document.getElementById('settingsOverlay').addEventListener('click', e=>{
  if(e.target.id==='settingsOverlay') closeSettings();
});

