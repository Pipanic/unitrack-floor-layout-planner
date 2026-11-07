// Shift+wheel cycles: realistic in-place swaps, not whole categories. Special
// straights (rerailer, feeder, conversion) are excluded; curves cycle within
// one radius.
const MUTATION_GROUPS = [
  ['S248','S186','S124','S64','S62','S45H','S38','S33','S29'], // general straights
  ['S60L','S60R'], // turnout-compensating pair
  ['S248PC','S186PC','S124PC','S64PC','S62PC'], // concrete-tie straights, excl. feeder
  ['BUMPA','BUMPB','BUMPC','BUMPD','BUMPAI','BUMPBI'], // all buffers
  ['BUMPAPC','BUMPBPC'], // concrete-tie buffers
  ['R216-45R','R216-15R'],
  ['R249-45R','R249-15R'],
  ['R282-45R','R282-15R'],
  ['R315-45R','R315-15R'],
  ['R348-45R','R348-30R'],
  ['R381-30R','R381-10R'],
  ['T4-L','T4-R'], // #4 turnout opposite hand
  ['TC-L','TC-R'], // compact turnout opposite hand
  ['T6-L','T6-R'], // #6 turnout opposite hand
  ['SX4L','SX4R'], // single crossover opposite hand
  ['X15L','X15R'], // 15° crossing opposite hand
  ['D248','D186','D124','D62'], // double track straights, excl. Dual Feeder
  ['TWS186','TWS124','TWS62'], // Unitram double track straights
  ['TWR180L','TWR180R'], // Unitram street curve opposite hand
  ['TWEP180L','TWEP180R'], // Unitram street turnout opposite hand
  ['DW51L','DW51R'], // widening section opposite hand
  ['D282-45','D282-22','D282-22L'], // double track curve, R282/315
  ['D381-45','D381-22','D381-22L'], // double track curve, R381/414
  ['D248S','D186S','D124S','D62S'], // slab double track straights, excl. Dual Feeder
  ['DS381-45','DS381-22','DS381-22L'], // slab double track curve, R381/414
  ['D447-45','D447-22','D447-22L'], // double track curve, R447/480
  ['V248','V186','V124','V62'], // viaduct straights
  ['VR348-45','VR348-30'], // viaduct curve, R348
  ['DV248','DV186','DV124'], // double track viaduct straights (slab)
  ['DV381-45','DV381-22','DV381-22L'], // double track viaduct curve (slab), R381/414
  ['DV248PC','DV186PC','DV124PC'], // double track viaduct straights (concrete, V12)
  ['DV381-225','DV381-22PC','DV381-22PCL'], // double track viaduct curve (concrete, V12), R381/414
  ['BRG186','BRG124'], // girder bridges, Light Green
  ['R678-10L','R678-10R'], // fitted connecting curve opposite hand
];
