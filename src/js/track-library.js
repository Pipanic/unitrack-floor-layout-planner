/* ============================================================
   TRACK LIBRARY — Kato N-scale Unitrack
   The catalogue's code: lookups by id (TT), expansion-track lengths,
   labels and the Shift+scroll walk. The catalogue itself is data, in
   src/catalog/.
   ============================================================ */
// Expansion track (S78S, `expansion`): one part the user sets anywhere from
// 78 to 108mm. Two EXPANSION_HALF halves of tied straight that pull apart
// over a narrower strip, under a fixed guide vane.
const EXPANSION_MIN = 78, EXPANSION_MAX = 108, EXPANSION_HALF = 39;
// A length other than its catalog one is a type of its own, id `S78S@93.5`
// (0.1mm steps), made on first lookup: an object inheriting from the catalog
// entry with its own `id`, `length` and `variantOf`. So per-type geometry,
// caches, drawing, snapping and save files all work unchanged, and only
// counting stock or packs needs catalogTypeId. Variants never join
// TRACK_TYPES, so they're in no palette or list.
/** @type {Object<string, any>} */
const TT_BY_ID = Object.fromEntries(TRACK_TYPES.map(t=>[t.id,t]));
// The UniJoiners by name (their entries are in catalog/joiners.js).
const [TERMINAL_JOINER, INSULATED_JOINER, UNITRAM_FEEDER] = JOINER_TYPES;
// A piece with no codes goes by its name, and so does every road plate.
const shortCode = t=>t.partCode || (!t.roadPlate && t.catalogNo) || t.label;
JOINER_TYPES.forEach(t=>{ TT_BY_ID[t.id] = t; });
function expansionVariant(id){
  const m = typeof id==='string' && /^(.+)@(\d+(?:\.\d)?)$/.exec(id);
  const base = m && TT_BY_ID[m[1]];
  if(!base || !base.expansion) return undefined;
  const len = +m[2];
  if(len<EXPANSION_MIN || len>EXPANSION_MAX || len===base.length) return undefined;
  return TT_BY_ID[id] = Object.assign(Object.create(base), {id, length:len, variantOf:base.id});
}
const TT = new Proxy(TT_BY_ID, {
  get: (t, /** @type {string} */ id)=> t[id] ?? expansionVariant(id),
  has: (t, id)=> id in t || !!expansionVariant(id),
});
// The type id for an expansion track `len` long, clamped to its range.
function expansionTypeId(baseId, len){
  const r = Math.round(Math.min(EXPANSION_MAX, Math.max(EXPANSION_MIN, len))*10)/10;
  return r===TT[baseId].length ? baseId : `${baseId}@${r}`;
}
// The catalog entry a type id counts as, for stock and packs.
const catalogTypeId = id=>TT[id].variantOf || id;
// Attaches STRINGS labels to catalog entries, so `type.label` reads work
// unchanged. Re-run (then renderPalette()) on a language change.
function applyCatalogLabels(){
  TRACK_TYPES.forEach(type=>{ type.label = catalogLabel(type); });
  JOINER_TYPES.forEach(t=>{ t.label = catalogLabel(t); });
}
applyCatalogLabels();
applyStaticStrings();
document.title = tr('app.pageTitle');

LAYOUT_SETS.forEach(set=>{
  const counts = {};
  set.pieces.forEach(([t])=>{ counts[t] = (counts[t]||0) + 1; });
  // A bumper's own S62 is part of the bumper, as everywhere else.
  const contents = {};
  Object.entries(stockUsage(counts)).forEach(([t,n])=>{ if(n>0) contents[t] = n; });
  PRODUCTS.push({no:set.no, contents, extras:set.extras, set:set.id, aliases:set.aliases||[]});
});

const MUTATION_GROUP_BY_ID = {};
MUTATION_GROUPS.forEach(group=>group.forEach(id=>{ MUTATION_GROUP_BY_ID[id] = group; }));
// The typeId one wheel notch (`step`, ±1) along from `typeId` in its group,
// or `typeId` itself if it isn't in one. The walk bounces off either end
// rather than wrapping (S186 > S248 > S186, never S248 > S29), and keeps
// going back after a bounce: `holder.mutateDir` (±1, kept on the drag)
// remembers the flip for the rest of that drag; callers only asking whether a
// piece can morph pass no holder.
function mutateTypeId(typeId, step, holder = {}){
  // An expansion track steps its length to the next whole mm instead, and
  // stops at either end of its range.
  const type = TT[typeId];
  if(type.expansion){
    const L = type.length;
    return expansionTypeId(type.variantOf || type.id, step>0 ? Math.floor(L)+1 : Math.ceil(L)-1);
  }
  const group = MUTATION_GROUP_BY_ID[typeId];
  if(!group) return typeId;
  const idx = group.indexOf(typeId);
  let s = step * (holder.mutateDir || 1);
  if(idx+s < 0 || idx+s >= group.length){ holder.mutateDir = -(holder.mutateDir || 1); s = -s; }
  return group[idx+s];
}
// The F key's mirror pairs, both ways round (catalog/flip-pairs.js).
const FLIP_OPPOSITE = {};
FLIP_PAIRS.forEach(([a,b])=>{ FLIP_OPPOSITE[a]=b; FLIP_OPPOSITE[b]=a; });

