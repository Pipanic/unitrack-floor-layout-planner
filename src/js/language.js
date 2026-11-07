/* ============================================================
   LANGUAGE SELECT
   Language names in their own script, never translated, so kept apart from
   STRINGS. A new language is STRINGS.<code> plus an entry here.
   ============================================================ */
const LANGUAGES = { en: 'English' };
const LANG_KEY = 'katoLang';
// Re-applies translated UI after a language switch: catalog labels and palette
// rebuild, static data-str elements, theme option text, tab title, then
// render() for the dynamic text.
function applyLanguage(lang){
  if(!STRINGS[lang]) return;
  currentLang = lang;
  try{ localStorage.setItem(LANG_KEY, lang); }catch(err){ }
  applyCatalogLabels();
  applyStaticStrings();
  document.title = tr('app.pageTitle');
  populateModeSelect();
  sizeHintBox();
  fillThemeSelect();
  renderPalette();
  invalidate();
}
(function initLangSelect(){
  const sel = document.getElementById('langSelect');
  Object.entries(LANGUAGES).forEach(([key,name])=>{
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = name;
    sel.appendChild(opt);
  });
  sel.value = STRINGS[currentLang] ? currentLang : 'en';
  sel.addEventListener('change', ()=>applyLanguage(sel.value));
})();

