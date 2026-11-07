/* ============================================================
   HELP MODAL
   Plain show/hide rather than <dialog>, so closing (backdrop, Escape)
   and swallowing the app's own shortcuts while open are fully under our
   control — otherwise trying a key while reading about it would act on
   the layout underneath.
   ============================================================ */
let helpOpen = false;
function openHelp(){
  helpOpen = true;
  document.getElementById('helpOverlay').style.display = 'flex';
  document.getElementById('helpBtn').setAttribute('aria-expanded','true');
  const search = document.getElementById('helpSearch');
  search.value = '';
  filterHelp();
  search.focus();
}
// The guide's search, as the Gestures window's: a block (a control row, a
// paragraph, a list item) stays if every word typed is in it, a section whose
// title matches stays whole, and a section with nothing left hides, with its
// link in the section list.
function filterHelp(){
  const body = document.getElementById('helpBody');
  const words = searchKey(document.getElementById('helpSearch').value).split(/\s+/).filter(Boolean);
  const has = e=>{ const text = searchKey(e.textContent); return words.every(w=>text.includes(w)); };
  let any = false;
  body.querySelectorAll('.help-content section').forEach(section=>{
    const whole = !words.length || has(section.querySelector('h3'));
    let shown = 0;
    /** @type {HTMLElement[]} */ ([...section.children]).forEach(block=>{
      if(block.tagName==='H3') return;
      if(block.tagName==='UL' || block.tagName==='OL'){
        let items = 0;
        /** @type {HTMLElement[]} */ ([...block.children]).forEach(li=>{ li.hidden = !(whole || has(li)); if(!li.hidden) items++; });
        block.hidden = !items;
        shown += items;
      } else {
        block.hidden = !(whole || has(block));
        if(!block.hidden) shown++;
      }
    });
    section.hidden = !shown;
    const link = body.querySelector(`.help-nav a[href="#${section.id}"]`);
    if(link) link.hidden = !shown;
    any = any || shown>0;
  });
  document.getElementById('helpNone').hidden = any;
  body.scrollTop = 0;
}
document.getElementById('helpSearch').addEventListener('input', filterHelp);
function closeHelp(){
  helpOpen = false;
  document.getElementById('helpOverlay').style.display = 'none';
  document.getElementById('helpBtn').setAttribute('aria-expanded','false');
}
document.getElementById('helpBtn').addEventListener('click', openHelp);
// The guide's section list scrolls the guide itself, rather than following
// the link, which would change the page's URL.
document.getElementById('helpBody').addEventListener('click', e=>{
  const link = e.target.closest('a[href^="#help-"]');
  if(!link) return;
  e.preventDefault();
  const section = document.getElementById(link.getAttribute('href').slice(1));
  if(section) section.scrollIntoView({block:'start', behavior:'smooth'});
});
// A button in the guide ({button …} in help-guide.md) swaps Help for the
// window it names.
const HELP_OPENS = {gestures:()=>openGestures()};
document.getElementById('helpBody').addEventListener('click', e=>{
  const open = HELP_OPENS[e.target.closest('[data-help-open]')?.dataset.helpOpen];
  if(!open) return;
  closeHelp();
  open();
});
document.getElementById('helpCloseBtn').addEventListener('click', closeHelp);
// backdrop click closes; a click inside the panel doesn't
document.getElementById('helpOverlay').addEventListener('click', e=>{
  if(e.target.id==='helpOverlay') closeHelp();
});
// Help's keys. As a dialog layer of onKeyDown, it swallows
// every other shortcut while open.
// Escape clears a search first, then closes.
function helpKeys(e){
  if(e.key!=='Escape') return;
  const search = document.getElementById('helpSearch');
  if(search.value){ search.value = ''; filterHelp(); }
  else closeHelp();
}

