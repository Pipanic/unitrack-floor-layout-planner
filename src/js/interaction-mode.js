/* ============================================================
   INTERACTION MODE
   One value for what the app is doing: gradient, piece drag, palette drag,
   marquee, box drag, box resize or box dimension edit. Starting and ending
   go through beginInteraction()/endInteraction(), so two can't run at once.
   Each mode keeps its own payload variable. Panning isn't a mode (it must
   work during Gradient Mode); dialogs stack above modes.
   ============================================================ */
let interactionMode = 'idle';
// Starts `mode` if idle; refuses (returns false, changes nothing) if
// something else is already active. Callers still hold their own payload
// variable — this only gates entry.
function beginInteraction(mode){
  if(interactionMode!=='idle') return false;
  interactionMode = mode;
  return true;
}
// Ends `mode` only if still current, so a late end call can't clobber a newer
// mode.
function endInteraction(mode){
  if(interactionMode===mode) interactionMode = 'idle';
}

