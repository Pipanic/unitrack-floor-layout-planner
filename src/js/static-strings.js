// Populates every element carrying a data-str/data-str-title/data-str-placeholder
// attribute from STRINGS, plus the Help modal body (its own key, not an
// attribute, since it's set once as a block — see the STRINGS comment).
// Called once at startup and again if the language ever changes.
function applyStaticStrings(){
  document.querySelectorAll('[data-str]').forEach(el=>{ el.innerHTML = tr(el.dataset.str); });
  document.querySelectorAll('[data-str-title]').forEach(el=>{ el.title = tr(el.dataset.strTitle); });
  document.querySelectorAll('[data-str-placeholder]').forEach(el=>{ el.placeholder = tr(el.dataset.strPlaceholder); });
  document.getElementById('helpBody').innerHTML = tr('help.body.html');
}
