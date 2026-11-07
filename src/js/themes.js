/* ============================================================
   SKIN / THEME
   Themes are data: CSS custom properties per theme, applied by one
   function, listed in a <select> from THEMES' keys. Themes change the
   planner's chrome only: track looks the same in every theme, as the real
   parts do.
   ============================================================ */
// Default and Colourblind use the page's own colours (the :root rule); Light
// sets every one of them, and must list the same properties as :root.
// Colourblind changes only the gradient validity scale (currentGradientColors).
const THEMES = {
  default: null,
  light: {
    '--bg':'#eef1f5', '--panel':'#ffffff', '--panel-border':'#dbe0e6',
    '--text':'#1c222b', '--text-dim':'#6b7480',
    '--accent':'#2f78c9', '--accent-dim':'#7fb0e0',
    '--roadbed':'#c3c9d1', '--roadbed-dark':'#a7adb7',
    '--open-port':'#189a5c', '--danger':'#c8372f',
    '--surface':'#eef0f4', '--surface-hover':'#e3e7ee', '--surface-sunken':'#e2e6ec',
    '--canvas-grid':'#d7dce3',
    '--hint-ok-bg':'#e7f6ec', '--hint-ok-border':'#a9dfc0', '--hint-ok-text':'#1f7a46',
    '--hint-warn-bg':'#fcf0df', '--hint-warn-border':'#eecb96', '--hint-warn-text':'#8a5a12',
    '--start-bg':'#e7f6ec', '--start-border':'#a9dfc0', '--start-text':'#1f7a46',
    '--danger-bg':'#fbe9e9', '--danger-border':'#eab3b3', '--danger-text':'#a33232',
  },
  colourblind: null,
};
const THEME_KEY = 'katoUnitrackPlanner.theme.v1';
function applyTheme(key){
  currentTheme = Object.hasOwn(THEMES, key) ? key : 'default';
  const vars = THEMES[currentTheme], root = document.documentElement.style;
  Object.keys(THEMES.light).forEach(prop=>{ if(vars) root.setProperty(prop, vars[prop]); else root.removeProperty(prop); });
  try{ localStorage.setItem(THEME_KEY, key); }catch(err){ /* private browsing etc.: won't persist */ }
}
const fillThemeSelect = ()=>document.querySelectorAll('#themeSelect option').forEach(opt=>{ opt.textContent = tr('theme.'+opt.value); });
(function initThemeSelect(){
  const sel = document.getElementById('themeSelect');
  Object.keys(THEMES).forEach(key=>{
    const opt = document.createElement('option');
    opt.value = key;
    sel.appendChild(opt);
  });
  fillThemeSelect();
  let saved = null;
  try{ saved = localStorage.getItem(THEME_KEY); }catch(err){}
  const startKey = Object.hasOwn(THEMES, saved) ? saved : 'default';
  sel.value = startKey;
  applyTheme(startKey);
  sel.addEventListener('change', ()=>{
    applyTheme(sel.value);
    // Validity colours are baked into SVG attributes, so a live switch needs an
    // explicit render (CSS vars repaint the chrome on their own). At startup
    // the first render hasn't happened yet.
    if(gradientTool) updateGradientUI();
    invalidate();
  });
})();

