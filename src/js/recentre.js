/* ============================================================
   VIEW RECENTRE
   Fit the view to the layout (the ⟲ button, and after Load/New/restore).
   ============================================================ */
const FIT_PADDING = 24; // px
function recentreView(){
  const wrap = document.getElementById('canvasWrap');
  const w = wrap.clientWidth, h = wrap.clientHeight;
  const cx = w/2, cy = h/2;
  const b = contentBounds; // empty layout: centre the origin
  if(!b){
    view.scale = 1.4;
    view.x = cx;
    view.y = cy;
    clampView();
    invalidate();
    return;
  }
  const worldCx = (b.minX+b.maxX)/2, worldCy = (b.minY+b.maxY)/2;
  const boundsW = Math.max(b.maxX-b.minX, 1e-6), boundsH = Math.max(b.maxY-b.minY, 1e-6);
  const fitScale = Math.min((w-FIT_PADDING*2)/boundsW, (h-FIT_PADDING*2)/boundsH);
  view.scale = clampScale(fitScale);
  view.x = cx - worldCx*view.scale;
  view.y = cy - worldCy*view.scale;
  clampView();
  invalidate();
}
document.getElementById('zoomReset').addEventListener('click', recentreView);

