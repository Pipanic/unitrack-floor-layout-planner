// UniJoiners fitted in a joint (UNIJOINERS), not pieces of track: the
// Terminal UniJoiner (24-818), a feeder, and the Insulated UniJoiner
// (24-816). In TT for their names, stock, parts list and packs; kept out of
// TRACK_TYPES, so no palette group, geometry or piece drawing expects them.
// An IJ counts per joint: it takes a pair, so a pack of 20 fits ten. Neither
// has an official part code, so `shortCode` stands in the catalogue number.
// The Unitram Feeder (44-847) looks and works as the Terminal UniJoiner does, but
// fits only Unitram track (feederFitsTrack); the UniJoiners fit either kind.
const JOINER_TYPES = [
  {id:'TJ', cat:'joiner', joiner:true, feeder:true, catalogNo:'24-818', partCode:''},
  {id:'IJ', cat:'joiner', joiner:true, insulated:true, catalogNo:'24-816', partCode:''},
  {id:'UF', cat:'joiner', joiner:true, feeder:true, unitram:true, catalogNo:'44-847', partCode:''},
];
