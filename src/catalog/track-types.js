// Every modelled KATO part, one entry each. Dimensions are KATO's published
// figures (catalogue, turnout plan PDFs, katounitrackschema.pdf), cross-
// checked against retailers; entries say where a figure was measured from
// the real part. Labels come from STRINGS (applyCatalogLabels).
//
// A platform roof's `cutout`, measured from KATO's top-view diagrams: x0..x1
// along the piece, `y` its back edge from the slab's centre line, `h` its
// width, and the divider's x (its full height).
const TRACK_TYPES = [
  // --- Straights ---
  {id:'S248', ties:'standard', cat:'straight', catalogNo:'20-000', partCode:'S248', length:248},
  {id:'S186', ties:'standard', cat:'straight', catalogNo:'20-010', partCode:'S186', length:186},
  {id:'S124', ties:'standard', cat:'straight', catalogNo:'20-020', partCode:'S124', length:124},
  // Concrete-tie straights: the plain pieces with light grey ties (tieColor).
  {id:'S248PC', ties:'concrete', cat:'straight', catalogNo:'20-007', partCode:'S248PC', length:248},
  {id:'S186PC', ties:'concrete', cat:'straight', catalogNo:'20-017', partCode:'S186PC', length:186},
  {id:'S124PC', ties:'concrete', cat:'straight', catalogNo:'20-028', partCode:'S124PC', length:124},
  {id:'S64PC', ties:'concrete', cat:'straight', catalogNo:'20-038', partCode:'S64PC', length:64, labelLength:true},
  {id:'S62PC', ties:'concrete', cat:'straight', catalogNo:'20-054', partCode:'S62PC', length:62},
  {id:'S62FPC', ties:'concrete', cat:'straight', catalogNo:'20-055', partCode:'S62FPC', length:62, feeder:true},
  {id:'S78SPC', ties:'concrete', cat:'straight', catalogNo:'20-058', partCode:'S78SPC', length:78, expansion:true},
  // 20-026 rerailer: geometrically an ordinary S124, plus a moulded guide ramp
  // between the rails (drawn by appendRerailerMarker). Dark rails (`railColor`)
  // keep it legible against the marker.
  {id:'S124R', cat:'straight', catalogNo:'20-026', partCode:'S124C', length:124, rerailer:true, railColor:'#2a2e35'},
  // labelLength prints the id on the roadbed: 64mm vs the neighbouring 62mm
  // pieces isn't visible at normal zoom.
  {id:'S64', ties:'standard',  cat:'straight', catalogNo:'20-030', partCode:'S64', length:64, labelLength:true},
  {id:'S62', ties:'standard',  cat:'straight', catalogNo:'20-040', partCode:'S62', length:62},
  // Special-purpose 62mm straights (feeder, snap-track conversion): plain S62
  // geometry, listed separately because a layout may need them specifically.
  {id:'S62F', ties:'standard', cat:'straight', catalogNo:'20-041', partCode:'S62F', length:62, feeder:true},
  // cutEnd:'far' trims the roadbed at port 1, exposing bare rail for joining
  // another brand's track. Which end is cut comes from a photo; it doesn't
  // matter for planning.
  {id:'S62C', ties:'standard', cat:'straight', catalogNo:'20-045', partCode:'S62J', length:62, cutEnd:'far'},
  // Pit tracks, drawn by appendPitSlab and their mounts for ties (PIT_STYLES).
  // Both are part code S186P; the catalogue number and label tell them apart.
  {id:'S186AP', ties:'ashpit', cat:'straight', catalogNo:'20-015', partCode:'S186P', length:186},
  {id:'S186P', ties:'pit', cat:'straight', catalogNo:'20-016', partCode:'S186P', length:186},

  // Expansion track: 78mm as sold, set anywhere up to 108mm (see EXPANSION_MIN).
  {id:'S78S', ties:'standard', cat:'straight', catalogNo:'20-050', partCode:'S78S', length:78, expansion:true},

  // Fine-adjustment straights. Kato sells them in pairs: 20-091 is S45 + S29,
  // 20-092 is S38 + S33. Id S45H is historical; the part is S45.
  {id:'S45H', ties:'standard', cat:'straight', catalogNo:'20-091', partCode:'S45', length:45.5},
  {id:'S38', ties:'standard',  cat:'straight', catalogNo:'20-092', partCode:'S38',  length:38},
  {id:'S33', ties:'standard',  cat:'straight', catalogNo:'20-092', partCode:'S33',  length:33},
  {id:'S29', ties:'standard',  cat:'straight', catalogNo:'20-091', partCode:'S29',  length:29},

  // S60L/S60R compensating straights, stop #4 turnout routes overlapping. Only
  // sold inside the #4 turnout boxes, so no catalogNo. Measured from the real
  // part (no published drawing): 60mm long, full width to 21.5mm, tapering to
  // 20mm, stopping WEDGE_END_TRIM short of the far end. Verified against the part.
  {id:'S60L', ties:'standard', cat:'straight', partCode:'S60L', length:60, wedgeSide:'R', labelLength:true, paletteOrder:5},
  {id:'S60R', ties:'standard', cat:'straight', partCode:'S60R', length:60, wedgeSide:'L', labelLength:true, paletteOrder:6},

  // Bumpers Type A/B: a 33mm stop sold clipped to an S62. `bundleWith` places
  // both as separate pieces. No rails of its own; `deadEnd` removes the far
  // port. Type A is a concrete block, Type B a wooden bracket
  // (appendBumperStop).
  {id:'BUMPA', cat:'straight', catalogNo:'20-046', partCode:'S62B-A', length:33, deadEnd:true, bumperType:'A', bundleWith:'S62', paletteOrder:1},
  {id:'BUMPB', cat:'straight', catalogNo:'20-047', partCode:'S62B-B', length:33, deadEnd:true, bumperType:'B', bundleWith:'S62', paletteOrder:2},
  // Concrete-tie Type A/B: the same stops, sold clipped to an S62PC.
  {id:'BUMPAPC', cat:'straight', catalogNo:'20-066', partCode:'S62B-APC', length:33, deadEnd:true, bumperType:'A', bundleWith:'S62PC', paletteOrder:1},
  {id:'BUMPBPC', cat:'straight', catalogNo:'20-067', partCode:'S62B-BPC', length:33, deadEnd:true, bumperType:'B', bundleWith:'S62PC', paletteOrder:2},

  // Bumper Type C: one 50mm piece with 35mm of rail (`railLength`);
  // `bumperType:'C'` draws only the sign.
  {id:'BUMPC', ties:'standard', tieCount:8, cat:'straight', catalogNo:'20-048', partCode:'S50B-C', length:50, deadEnd:true, railLength:35, bumperType:'C', paletteOrder:3},

  // Illuminated bumpers: 66mm pieces, 50mm of rail. Type A reuses the Type A
  // block, flush with the rail ends (`bumperFlush`). Type B has no block, so no
  // `bumperType`.
  {id:'BUMPAI', ties:'standard', tieCount:7, tiesToBlock:true, cat:'straight', catalogNo:'20-063', partCode:'S66B-ALT', length:66, deadEnd:true, railLength:50, bumperType:'A', bumperFlush:true, paletteOrder:5},
  // Type B's rails stop at the outer edge of its 10th (last) tie, as on the real piece.
  {id:'BUMPBI', ties:'standard', tieCount:10, xTies:[5,9], cat:'straight', catalogNo:'20-064', partCode:'S66B-CLT', length:66, deadEnd:true, railLength:9*(124/25)+1.9/2, paletteOrder:6},

  // Buffer Type D: 35mm, rails about half-length, no block or X (`noXMark`).
  // `railColor`/`railWidth` are optional overrides honoured by every rail path.
  {id:'BUMPD', ties:'standard', tieAt:[2.5, 17.5], cat:'straight', catalogNo:'20-060', partCode:'S35B-D', length:35, deadEnd:true, railLength:17.5, railColor:'#111214', railWidth:1.35, noXMark:true, paletteOrder:4},

  // --- Viaduct & bridge straights. Same geometry as plain straights;
  // `viaduct`/`bridgeStyle` only change the drawing. One canonical colour per
  // shape: the colour IS the catalogNo, so another colour needs its own entry.
  // Sources: katousa.com, katomodeltrains.com, railsofsheffield.com.
  {id:'V248', ties:'standard', cat:'straight', catalogNo:'20-400', partCode:'S248V', length:248, viaduct:true},
  {id:'V186', ties:'standard', cat:'straight', catalogNo:'20-410', partCode:'S186V', length:186, viaduct:true},
  {id:'V124', ties:'standard', cat:'straight', catalogNo:'20-420', partCode:'S124V', length:124, viaduct:true},
  {id:'V62', ties:'standard', cat:'straight', catalogNo:'20-440', partCode:'S62V',  length:62,  viaduct:true},
  // Double-track bridges: 248mm truss and 186mm girder, Light Blue only.
  // `spacing:33` makes appendBridgeStructure add a centre chord. No `viaduct`
  // flag; they use the girder's `roadbedOpacity` treatment.
  {id:'BRT248D', ties:'standard', noRoadbed:true, trussEndCaps:true, tiesBetweenCaps:true, latticeOverTrack:true, cat:'dstraight', catalogNo:'20-436', partCode:'WS248T', length:248, spacing:33, bridgeStyle:'truss', structureColor:'#7ba7d1', outerChordThickScale:0.75},
  {id:'BRG186D', ties:'standard', cat:'dstraight', catalogNo:'20-455', partCode:'WS186T', length:186, spacing:33, bridgeStyle:'girder', structureColor:'#7ba7d1', endCaps:false, roadbedOpacity:1, outerChordThickScale:0.75},
  // Truss bridge: 248mm only. 20-429 Red/Brown is canonical; other colours are
  // separate catalogNos.
  {id:'BRT248', ties:'standard', noRoadbed:true, trussEndCaps:true, tiesBetweenCaps:true, latticeOverTrack:true, cat:'straight', catalogNo:'20-429', partCode:'S248T', length:248, bridgeStyle:'truss', structureColor:'#8a4a38'},
  // Girder bridge: 124 and 186mm (no single-track 248mm girder). Light Green
  // canonical; other colours are separate catalogNos.
  {id:'BRG124', ties:'standard', noRoadbed:true, underBeams:14, cat:'straight', catalogNo:'20-459', partCode:'S124T', length:124, bridgeStyle:'girder', structureColor:'#78c4a1', chordSide:1, endCaps:false, crossBeams:false, railChords:true, boatGuide:true},
  {id:'BRG186', ties:'standard', noRoadbed:true, diamondBracing:true, boxTies:5, cat:'straight', catalogNo:'20-449', partCode:'S186T', length:186, bridgeStyle:'girder', structureColor:'#78c4a1'},

  // --- Viaduct curves: every radius/angle matches an existing plain curve, so
  // `cat:'curve'` plus `viaduct`. Sources: Kato USA, railsofsheffield.com.
  {id:'VR249-45', ties:'standard', cat:'curve', catalogNo:'20-505', partCode:'R249-45V', radius:249, angle:45, hand:'R', viaduct:true},
  {id:'VR282-45', ties:'standard', cat:'curve', catalogNo:'20-510', partCode:'R282-45V', radius:282, angle:45, hand:'R', viaduct:true},
  {id:'VR315-45', ties:'standard', cat:'curve', catalogNo:'20-520', partCode:'R315-45V', radius:315, angle:45, hand:'R', viaduct:true},
  {id:'VR348-45', ties:'standard', cat:'curve', catalogNo:'20-530', partCode:'R348-45V', radius:348, angle:45, hand:'R', viaduct:true},
  {id:'VR348-30', ties:'standard', cat:'curve', catalogNo:'20-531', partCode:'R348-30V', radius:348, angle:30, hand:'R', viaduct:true},
  {id:'VR381-30', ties:'standard', cat:'curve', catalogNo:'20-540', partCode:'R381-30V', radius:381, angle:30, hand:'R', viaduct:true},
  // Double-track viaduct straights (WS###V), checked against the real boxes.
  {id:'DV248', ties:'slab', cat:'dstraight', catalogNo:'20-401', partCode:'WS248V', length:248, spacing:33, viaduct:true},
  {id:'DV186', ties:'slab', cat:'dstraight', catalogNo:'20-411', partCode:'WS186V', length:186, spacing:33, viaduct:true},
  {id:'DV124', ties:'slab', cat:'dstraight', catalogNo:'20-422', partCode:'WS124V', length:124, spacing:33, viaduct:true},

  // Girder bridge curves R448/R481-15, Light Green. Radii exist nowhere else in
  // the catalog (not the 447/480 double-track pair). `chordSide`: the single
  // straight chord sits inside (-1, R448) or outside (+1, R481); see
  // appendCurvedBridgeChord. `chordEnd`: the chord's centre line where it meets
  // the piece's ends, mm out from the track centre (inside negative), measured
  // off Kato's drawing of the pair on a 15° arc. Joined to a straight girder
  // (S124T), each chord overlaps its girder at the joint.
  {id:'BRG448-15', ties:'standard', noRoadbed:true, chordTies:true, cat:'curve', catalogNo:'20-468', partCode:'R448-15T', radius:448, angle:15, hand:'R', bridgeStyle:'girder', structureColor:'#78c4a1', chordSide:-1, chordEnd:-14.5},
  {id:'BRG481-15', ties:'standard', noRoadbed:true, chordTies:true, chordStepEnds:true, cat:'curve', catalogNo:'20-473', partCode:'R481-15T', radius:481, angle:15, hand:'R', bridgeStyle:'girder', structureColor:'#78c4a1', chordSide:1, chordEnd:16.9},

  // --- Curves (radius/angle as catalogued). Right-hand only: a curve joined by
  // its other end curves the other way. The 22.5° double-track easements are
  // the exception.
  {id:'R216-45R', ties:'standard', cat:'curve', catalogNo:'20-170', partCode:'R216-45', radius:216, angle:45, hand:'R'},
  {id:'R216-15R', ties:'standard', cat:'curve', catalogNo:'20-171', partCode:'R216-15', radius:216, angle:15, hand:'R'},

  {id:'R249-45R', ties:'standard', cat:'curve', catalogNo:'20-100', partCode:'R249-45', radius:249, angle:45, hand:'R'},
  {id:'R249-15R', ties:'standard', cat:'curve', catalogNo:'20-101', partCode:'R249-15', radius:249, angle:15, hand:'R'},

  {id:'R282-45R', ties:'standard', cat:'curve', catalogNo:'20-110', partCode:'R282-45', radius:282, angle:45, hand:'R'},
  {id:'R282-15R', ties:'standard', cat:'curve', catalogNo:'20-111', partCode:'R282-15', radius:282, angle:15, hand:'R'},

  {id:'R315-45R', ties:'standard', cat:'curve', catalogNo:'20-120', partCode:'R315-45', radius:315, angle:45, hand:'R'},
  {id:'R315-15R', ties:'standard', cat:'curve', catalogNo:'20-121', partCode:'R315-15', radius:315, angle:15, hand:'R'},

  {id:'R348-45R', ties:'standard', cat:'curve', catalogNo:'20-132', partCode:'R348-45', radius:348, angle:45, hand:'R'},
  {id:'R348-30R', ties:'standard', cat:'curve', catalogNo:'20-130', partCode:'R348-30', radius:348, angle:30, hand:'R'},

  {id:'R381-30R', ties:'standard', cat:'curve', catalogNo:'20-140', partCode:'R381-30', radius:381, angle:30, hand:'R'},

  {id:'R481-15R', ties:'standard', cat:'curve', catalogNo:'20-160', partCode:'R481-15', radius:481, angle:15, hand:'R'},

  {id:'R718-15R', ties:'standard', cat:'curve', catalogNo:'20-150', partCode:'R718-15', radius:718, angle:15, hand:'R'},

  // Concrete-tie curves: the plain curves with light grey ties (tieColor).
  {id:'R282-45PC', ties:'concrete', cat:'curve', catalogNo:'20-114', partCode:'R282-45PC', radius:282, angle:45, hand:'R'},
  {id:'R315-45PC', ties:'concrete', cat:'curve', catalogNo:'20-124', partCode:'R315-45PC', radius:315, angle:45, hand:'R'},
  {id:'R348-45PC', ties:'concrete', cat:'curve', catalogNo:'20-135', partCode:'R348-45PC', radius:348, angle:45, hand:'R'},
  {id:'R718-15PC', ties:'concrete', cat:'curve', catalogNo:'20-152', partCode:'R718-15PC', radius:718, angle:15, hand:'R'},

  // Compact curves, 45° only.
  {id:'R183-45R', ties:'standard', cat:'curve', catalogNo:'20-172', partCode:'R183-45', radius:183, angle:45, hand:'R'},
  {id:'R150-45R', ties:'standard', cat:'curve', catalogNo:'20-174', partCode:'R150-45', radius:150, angle:45, hand:'R'},
  {id:'R117-45R', ties:'standard', cat:'curve', catalogNo:'20-176', partCode:'R117-45', radius:117, angle:45, hand:'R'},

  // --- Turnouts. Sources: Kato USA turnout plan PDFs, katounitrackschema.pdf.
  // throughLength is Kato's planning length (#4 = 126, so #4 + S60 = S186; #6 =
  // 186). Diverging ends sit on Kato's planning grid via `divergeEnd` rather
  // than a true arc: #4 at (124, 16.5), #6 at (186, 24.75), so published
  // spacings (33, 49.5) are exact. Cost: a loop made only of turnout legs
  // misses by up to 0.52mm, inside LOOP_CLOSE_RADIUS.
  {id:'T4-L', ties:'standard', divergeOwnTies:4, trimEnds:true, cat:'turnout', catalogNo:'20-220', partCode:'EP481-15L',
    throughLength:126, divergeRadius:481, divergeAngle:15, divergeEnd:{x:124, y:16.5}, hand:'L', paletteOrder:3},
  {id:'T4-R', ties:'standard', divergeOwnTies:4, trimEnds:true, cat:'turnout', catalogNo:'20-221', partCode:'EP481-15R',
    throughLength:126, divergeRadius:481, divergeAngle:15, divergeEnd:{x:124, y:16.5}, hand:'R', paletteOrder:4},
  {id:'T6-L', ties:'standard', cat:'turnout', catalogNo:'20-202', partCode:'EP718-15L',
    throughLength:186, divergeRadius:718, divergeAngle:15, divergeEnd:{x:186, y:24.75}, hand:'L', paletteOrder:1},
  {id:'T6-R', ties:'standard', cat:'turnout', catalogNo:'20-203', partCode:'EP718-15R',
    throughLength:186, divergeRadius:718, divergeAngle:15, divergeEnd:{x:186, y:24.75}, hand:'R', paletteOrder:2},

  // #2 Wye: two 481mm/15° branches from one throat, ends on the #4 grid (124,
  // ±16.5) so the schema's #4-wye-wye-#4 junction closes.
  {id:'TY2', ties:'standard', divergeOwnTies:9, cat:'wye', catalogNo:'20-222', partCode:'EP481-15Y',
    divergeRadius:481, divergeAngle:15, divergeEnd:{x:124, y:16.5}, paletteOrder:7},

  // Compact turnouts: a 124mm straight route and a true R150/45° diverging
  // route (the compact curve R150-45), so no planning-grid `divergeEnd`.
  // `divergeOwnTies` from a photo: the long shared ties run about 59mm from the throat.
  {id:'TC-L', ties:'standard', divergeOwnTies:11, fillBetween:true, cat:'turnout', catalogNo:'20-240', partCode:'EP150-45L',
    throughLength:124, divergeRadius:150, divergeAngle:45, hand:'L', paletteOrder:8},
  {id:'TC-R', ties:'standard', divergeOwnTies:11, fillBetween:true, cat:'turnout', catalogNo:'20-241', partCode:'EP150-45R',
    throughLength:124, divergeRadius:150, divergeAngle:45, hand:'R', paletteOrder:9},

  // Double Crossover: length 310, spacing 33, points 31mm in from each end, all
  // measured from the real part (a Kato PDF's 49.5mm is for hand-built
  // crossovers). Diagonal curve: see crossoverGeometry.
  // `powerBlock`: its insulated centre gap passes no power through (Power View).
  {id:'DX6', ties:'standard', ownEndTies:19, cat:'crossover', catalogNo:'20-210', partCode:'WX310',
    length:310, spacing:33, leadIn:31, powerBlock:true},

  // #4 Single Crossover: 248mm, 33mm spacing, leadIn:0. The derived diagonal
  // (R≈473.8 at ≈15.16°) is close to the #4's 481/15°, which supports the
  // model. Kato's L/R is the opposite of `hand` here (checked against
  // katounitrackschema.pdf); `labelHand` drives the palette.
  {id:'SX4L', ties:'concrete', ownEndTies:19, cat:'crossover', catalogNo:'20-231', partCode:'SX248R',
    length:248, spacing:33, leadIn:0, hand:'L', labelHand:'R'},
  {id:'SX4R', ties:'concrete', ownEndTies:19, cat:'crossover', catalogNo:'20-230', partCode:'SX248L',
    length:248, spacing:33, leadIn:0, hand:'R', labelHand:'L'},

  // Double-track straights, 33mm spacing. Four corner ports and no diagonals.
  {id:'D248', ties:'concrete', cat:'dstraight', catalogNo:'20-004', partCode:'WS248PC', length:248, spacing:33},
  {id:'D186', ties:'concrete', cat:'dstraight', catalogNo:'20-012', partCode:'WS186PC', length:186, spacing:33},
  {id:'D124', ties:'concrete', cat:'dstraight', catalogNo:'20-023', partCode:'WS124PC', length:124, spacing:33},
  {id:'D62', ties:'concrete', cat:'dstraight', catalogNo:'20-042', partCode:'WS62PC', length:62, spacing:33},
  // Dual feeder: wires on both outer edges.
  {id:'D62F', ties:'concrete', cat:'dstraight', catalogNo:'20-043', partCode:'WS62FPC', length:62, spacing:33, dualFeeder:true},
  // Slab track: the same double straight on a concrete slab, no ballast or
  // ties (`ties:'slab'`: appendSlab, and fastenings for ties).
  {id:'D248S', ties:'slab', cat:'dstraight', catalogNo:'20-006', partCode:'WS248S', length:248, spacing:33},
  {id:'D186S', ties:'slab', cat:'dstraight', catalogNo:'20-014', partCode:'WS186S', length:186, spacing:33},
  {id:'D124S', ties:'slab', cat:'dstraight', catalogNo:'20-025', partCode:'WS124S', length:124, spacing:33},
  {id:'D62S', ties:'slab', cat:'dstraight', catalogNo:'20-044', partCode:'WS62S', length:62, spacing:33},
  {id:'D62FS', ties:'slab', cat:'dstraight', catalogNo:'20-049', partCode:'WS62FS', length:62, spacing:33, dualFeeder:true},

  // Widening sections: 310mm, 33 to 66mm spacing; one track straight, the other
  // reverse-curves 33mm across the full length. Curve derived from that
  // envelope (not published). Kato's L/R is the opposite of `hand` (checked
  // against katounitrackschema.pdf); `labelHand` drives the palette.
  {id:'DW51L', ties:'concrete', cat:'widener', catalogNo:'20-052', partCode:'WA310PC-R', length:310, spacingNear:33, spacingFar:66, hand:'L', labelHand:'R'},
  {id:'DW51R', ties:'concrete', cat:'widener', catalogNo:'20-051', partCode:'WA310PC-L', length:310, spacingNear:33, spacingFar:66, hand:'R', labelHand:'L'},
  // Unitram street track's 25mm double-track spacing to Unitrack's 33: both tracks
  // S-curve 4mm each, symmetric. Two to a pack.
  {id:'TWA124', ties:'concrete', cat:'taper', catalogNo:'40-025', partCode:'TWA124PC', length:124, spacingNear:33, spacingFar:25},
  // Unitram street-track double straights: the double-track roadbed's width, the
  // tracks 25mm apart.
  {id:'TWS186', cat:'tram', catalogNo:'40-014', partCode:'TWS186', length:186, spacing:25},
  {id:'TWS124', cat:'tram', catalogNo:'40-024', partCode:'TWS124', length:124, spacing:25},
  {id:'TWS62', cat:'tram', catalogNo:'40-033', partCode:'TWS62', length:62, spacing:25},
  // Unitram street-track curves: a left and a right meet at their 45° ends to
  // turn the street through 90°, inside KATO's 248mm square.
  {id:'TWR180L', cat:'tramcurve', catalogNo:'40-103', partCode:'TWR180L', spacing:25, hand:'L'},
  {id:'TWR180R', cat:'tramcurve', catalogNo:'40-104', partCode:'TWR180R', spacing:25, hand:'R'},
  // Unitram street turnout: the street straight and the street curve in one plate.
  {id:'TWEP180L', cat:'tramturnout', catalogNo:'40-212', partCode:'TWEP180L', length:186, spacing:25, hand:'L'},
  {id:'TWEP180R', cat:'tramturnout', catalogNo:'40-213', partCode:'TWEP180R', length:186, spacing:25, hand:'R'},
  // Unitram 90° crossing: double street track across double street track.
  {id:'TW-X90', cat:'tramcross', catalogNo:'40-301', partCode:'TW-X90', length:62, spacing:25},
  // Unitram road plate: no track, it fills the inside of a 90° street corner.
  {id:'ROADPLATE_INNER', cat:'roadplate', catalogNo:'41-101', partCode:'', roadPlate:true},
  // Only sold inside sets, with no number of its own. It fills between quarter plates.
  {id:'ROADPLATE_STRAIGHT', cat:'roadplate', partCode:'', length:124, depth:186, roadPlate:true},
  // Comes with each street curve, with no number of its own. It fills the
  // notch at the outside of the corner two curves make.
  {id:'ROADPLATE_CENTER', cat:'roadplate', partCode:'', length:62, depth:62, roadPlate:true, centerPlate:true},
  // The quarter plate's printing on a full square, for the corner between
  // straight street tracks. Only sold inside sets.
  {id:'ROADPLATE_CORNER', cat:'roadplate', partCode:'', length:186, depth:186, roadPlate:true, cornerPlate:true},
  // A road's width with a crossing and a median.
  {id:'ROADPLATE_CENTERLINE', cat:'roadplate', partCode:'', length:186, depth:62, roadPlate:true, centerlinePlate:true},
  {id:'ROADPLATE_CENTERLINE_62', cat:'roadplate', partCode:'', length:62, depth:62, roadPlate:true, centerlinePlate:true},

  // Double-track curves: concentric arcs 33mm apart. `superelevation`: a banked
  // port only mates with a banked port (isBankedPort/portsCompatible). 'full'
  // (45°) is banked throughout; 'easement' (22.5°) has the same radius but
  // eases the tilt, ports 0/1 flat and 2/3 banked, so it's a true L/R pair.
  // appendSuperelevationDot marks the flat end.
  {id:'D282-45', ties:'concrete', cat:'dcurve', catalogNo:'20-183', partCode:'WR315/282-45PC', radiusInner:282, radiusOuter:315, angle:45, hand:'R', superelevation:'full', paletteOrder:1},
  {id:'D381-45', ties:'concrete', cat:'dcurve', catalogNo:'20-181', partCode:'WR414/381-45PC', radiusInner:381, radiusOuter:414, angle:45, hand:'R', superelevation:'full', paletteOrder:4},
  {id:'D447-45', ties:'concrete', cat:'dcurve', catalogNo:'20-185', partCode:'WR480/447-45PC', radiusInner:447, radiusOuter:480, angle:45, hand:'R', superelevation:'full', paletteOrder:7},
  {id:'D282-22', ties:'concrete', cat:'dcurve', catalogNo:'20-184', partCode:'WR315/282PCAR', radiusInner:282, radiusOuter:315, angle:22.5, hand:'R', superelevation:'easement', showHandSuffix:true, paletteOrder:2},
  {id:'D282-22L', ties:'concrete', cat:'dcurve', catalogNo:'20-184', partCode:'WR315/282PCAL', radiusInner:282, radiusOuter:315, angle:22.5, hand:'L', superelevation:'easement', showHandSuffix:true, paletteOrder:3},
  {id:'D381-22', ties:'concrete', cat:'dcurve', catalogNo:'20-182', partCode:'WR414/381PCAR', radiusInner:381, radiusOuter:414, angle:22.5, hand:'R', superelevation:'easement', showHandSuffix:true, paletteOrder:5},
  {id:'D381-22L', ties:'concrete', cat:'dcurve', catalogNo:'20-182', partCode:'WR414/381PCAL', radiusInner:381, radiusOuter:414, angle:22.5, hand:'L', superelevation:'easement', showHandSuffix:true, paletteOrder:6},
  // Slab double curves: the R381/414 concrete curves' geometry on a slab.
  {id:'DS381-45', ties:'slab', cat:'dcurve', catalogNo:'20-187', partCode:'WR414/381-45S', radiusInner:381, radiusOuter:414, angle:45, hand:'R', superelevation:'full'},
  {id:'DS381-22', ties:'slab', cat:'dcurve', catalogNo:'20-188', partCode:'WR414/381SAR', radiusInner:381, radiusOuter:414, angle:22.5, hand:'R', superelevation:'easement', showHandSuffix:true},
  {id:'DS381-22L', ties:'slab', cat:'dcurve', catalogNo:'20-188', partCode:'WR414/381SAL', radiusInner:381, radiusOuter:414, angle:22.5, hand:'L', superelevation:'easement', showHandSuffix:true},
  {id:'D447-22', ties:'concrete', cat:'dcurve', catalogNo:'20-186', partCode:'WR480/447PCAR', radiusInner:447, radiusOuter:480, angle:22.5, hand:'R', superelevation:'easement', showHandSuffix:true, paletteOrder:8},
  {id:'D447-22L', ties:'concrete', cat:'dcurve', catalogNo:'20-186', partCode:'WR480/447PCAL', radiusInner:447, radiusOuter:480, angle:22.5, hand:'L', superelevation:'easement', showHandSuffix:true, paletteOrder:9},

  // Double-track viaduct curves: only made at 381/414 and always superelevated.
  // 20-545 covers both hands.
  {id:'DV381-45', ties:'slab', cat:'dcurve', catalogNo:'20-544', partCode:'WR414/381-45VS', radiusInner:381, radiusOuter:414, angle:45, hand:'R', superelevation:'full', viaduct:true},
  {id:'DV381-22', ties:'slab', cat:'dcurve', catalogNo:'20-545', partCode:'WR414/381VSAR', radiusInner:381, radiusOuter:414, angle:22.5, hand:'R', superelevation:'easement', showHandSuffix:true, viaduct:true},
  {id:'DV381-22L', ties:'slab', cat:'dcurve', catalogNo:'20-545', partCode:'WR414/381VSAL', radiusInner:381, radiusOuter:414, angle:22.5, hand:'L', superelevation:'easement', showHandSuffix:true, viaduct:true},

  // Concrete-tie double viaducts: only in the V12 set, so their catalogNo is
  // the set's (20-871).
  // The 22.5° pieces are the fully banked WR414/381-22.5VPC and an easement
  // pair, both hands.
  {id:'DV248PC', ties:'concrete', cat:'dstraight', catalogNo:'20-871', partCode:'WS248VPC', length:248, spacing:33, viaduct:true},
  {id:'DV186PC', ties:'concrete', cat:'dstraight', catalogNo:'20-871', partCode:'WS186VPC', length:186, spacing:33, viaduct:true},
  {id:'DV124PC', ties:'concrete', cat:'dstraight', catalogNo:'20-871', partCode:'WS124VPC', length:124, spacing:33, viaduct:true},
  {id:'DV381-225', ties:'concrete', cat:'dcurve', catalogNo:'20-871', partCode:'WR414/381-22.5VPC', radiusInner:381, radiusOuter:414, angle:22.5, hand:'R', superelevation:'full', viaduct:true},
  {id:'DV381-22PC', ties:'concrete', cat:'dcurve', catalogNo:'20-871', partCode:'WR414/381-22.5VPCAR', radiusInner:381, radiusOuter:414, angle:22.5, hand:'R', superelevation:'easement', showHandSuffix:true, viaduct:true},
  {id:'DV381-22PCL', ties:'concrete', cat:'dcurve', catalogNo:'20-871', partCode:'WR414/381-22.5VPCAL', radiusInner:381, radiusOuter:414, angle:22.5, hand:'L', superelevation:'easement', showHandSuffix:true, viaduct:true},

  // 15° Crossings: a 186mm straight crossed at 15° by a diagonal whose ends are
  // flush with the straight's, offset `diagonalOffset` either side (as
  // katounitrackschema.pdf draws it between #6 turnouts). That asymmetry makes
  // L and R different parts; an R's diagonal descends to the right of travel.
  {id:'X15L', ties:'standard', ownEndTies:5, cat:'crossing', catalogNo:'20-300', partCode:'X15L',
    length:186, crossAngle:15, diagonalOffset:24.75, hand:'L'},
  {id:'X15R', ties:'standard', ownEndTies:5, cat:'crossing', catalogNo:'20-301', partCode:'X15R',
    length:186, crossAngle:15, diagonalOffset:24.75, hand:'R'},

  // 90° Crossing: the 33mm cross piece only (124 - 2×45.5). Its four S45s are
  // ordinary pieces and aren't spawned with it. No `hand`: both mirror images
  // are identical.
  {id:'X90', ties:'standard', ownEndTies:3, cat:'crossing', catalogNo:'20-320', partCode:'X90',
    length:33, crossAngle:90},

  // Turntable: a Misc. entry (`misc:true`). Length 160 matches the pit's Φ160,
  // which is why the bridge ends are arced. Reuses the girder chord rendering
  // (`bridgeStyle:'girder'`, no end caps). partCode is descriptive; no official
  // one is published.
  // Double-track incline starter (WS186PCINC): a WS186V-style deck with pier
  // wings at its high end (ports 2/3), sold in pairs in the 23-048 incline pier
  // set, and two come in set V12. Never flat, so it's placed already rising
  // `inclineRise` mm (4% over its length) for the user to adjust in Gradient
  // Mode. In Misc., not Viaducts or Double Track.
  {id:'DS186INC', ties:'concrete', cat:'dstraight', catalogNo:'23-048', partCode:'WS186PCINC', length:186, spacing:33,
    viaduct:true, inclineWings:true, inclineRise:186*0.04, misc:true},
  {id:'TURNTABLE', ties:'standard', cat:'turntableBridge', catalogNo:'20-283', partCode:'Turntable',
    length:160, bridgeStyle:'girder', structureColor:'#8a4a38', endCaps:false,
    roadbedOpacity:1, misc:true},

  // Turntable wedge: one 30° segment of the pit ring carrying three tracks 10°
  // apart. Ring-snaps (findRingSnapTarget), so only the outer ends have ports.
  // Not a real part.
  {id:'TURNTABLE_WEDGE', cat:'turntableWedge', partCode:'Track Turntable Section',
    misc:true},

  // Fitted Connecting Straight Track (S140D); geometry at the
  // `turntableConnector` category.
  {id:'TURNTABLE_CONNECTOR', ties:'standard', cat:'turntableConnector', catalogNo:'20-285',
    partCode:'S140D', length:139.5, misc:true},

  // Fitted Connecting Curved Track, R678-10L/R; geometry at the
  // `turntableConnectorCurve` category. Both hands stored, since a layout needs
  // one of each either side of S140D.
  {id:'R678-10R', ties:'standard', cat:'turntableConnectorCurve', catalogNo:'20-286',
    partCode:'R678-10L', radius:678, angle:10, hand:'R', misc:true},
  {id:'R678-10L', ties:'standard', cat:'turntableConnectorCurve', catalogNo:'20-286',
    partCode:'R678-10R', radius:678, angle:10, hand:'L', misc:true},

  // Roundhouse throat: R381 cut to 10°. Not a real part.
  {id:'R381-10R', ties:'standard', cat:'curve', partCode:'R381-10', radius:381, angle:10, hand:'R'},

  // Turntable bumper: an S140D shape 16.5mm long with `deadEnd:true`; the rail
  // and sign drawing come from the generic bumper paths. Not a real part.
  {id:'TURNTABLE_BUMPER', ties:'standard', tieAt:[2.5, 16.5-2.5], cat:'turntableConnector', partCode:'Turntable Bumper Track',
    length:16.5, deadEnd:true, railColor:'#111214', misc:true},

  // One-sided Platform, Type A (23-178): a 248 x 41 mm slab with an end port each side,
  // under a 46 mm roof whose extra 5 mm overhangs on its +y side, the side
  // that faces the track. It snaps by the slab, flush to a straight's roadbed
  // edge, and slides along it
  // (findPlatformSnapTarget). KATO's plan symbol PS-A (plan 06-6's parts list).
  {id:'PLATFORM_A', cat:'platform', catalogNo:'23-178', partCode:'PS-A', length:248, width:41, roofWidth:46, platform:true, sided:true, cutout:{x0:40, x1:208, y:-10.4, h:21.2, div:112}, labelLength:true, labelDx:10},
  // Type B (23-179): a staff office and stairs instead of the kiosk; drawn the same.
  {id:'PLATFORM_B', cat:'platform', catalogNo:'23-179', partCode:'PS-B', length:248, width:41, roofWidth:46, platform:true, sided:true, cutout:{x0:40, x1:208, y:-10.4, h:21.2, div:112}, labelLength:true, labelDx:10},
  // Platform ends PSE-1 (left) and PSE-2 (right), sold as the pair 23-180: 200 mm
  // of plain 41 mm slab, no roof (no `roofWidth`), so no overhang. Their Limited
  // label sits 30 mm from the inner end, clear of the post and slot (`labelDx`).
  {id:'PLATFORM_E1', cat:'platform', catalogNo:'23-180', partCode:'PSE-1', length:200, width:41, platform:true, sided:true, endAt:'start', labelLength:true, labelDx:70},
  {id:'PLATFORM_E2', cat:'platform', catalogNo:'23-180', partCode:'PSE-2', length:200, width:41, platform:true, sided:true, endAt:'end', labelLength:true, labelDx:-70},

  // Island platforms, 41 mm wide so one fits between two tracks (as in set V1).
  // A and B have a 49 mm roof overhanging both tracks, with the same cutout;
  // C has no roof and is the full width its whole length; End A (two to a pack)
  // is a PSE without the back fence. `island`: no front or back, so it snaps to
  // a track on either side at any angle and joins platforms either way round.
  // C's code is KATO's PI-D (the roofless one in its parts name list).
  {id:'ISLAND_A', cat:'platform', catalogNo:'23-171', partCode:'PI-A', length:248, width:41, roofWidth:49, platform:true, island:true,
    cutout:{x0:39.5, x1:137, y:-10.85, h:21.7, div:89.8}, labelLength:true, labelDx:60},
  {id:'ISLAND_B', cat:'platform', catalogNo:'23-172', partCode:'PI-B', length:248, width:41, roofWidth:49, platform:true, island:true,
    cutout:{x0:39.5, x1:137, y:-10.85, h:21.7, div:89.8}, labelLength:true, labelDx:60},
  {id:'ISLAND_C', cat:'platform', catalogNo:'23-173', partCode:'PI-D', length:248, width:41, platform:true, island:true},
  {id:'ISLAND_END_A', cat:'platform', catalogNo:'23-174', partCode:'PIE-1', length:200, width:41, platform:true, island:true, endAt:'start'},
  // Curved island ends PIE-2 and PIE-3 (a left and a right, one pack): one edge
  // straight, against a straight track; the other follows the roadbed edge of an
  // R718-15° curve (EP718-15R) that meets the straight at the inner end and
  // pulls away towards the free end. `curveEdge` is the side (+1 or -1 in y) the
  // curve is on; `trackSide` the side that must face the straight track.
  {id:'ISLAND_END_B1', cat:'platform', catalogNo:'23-175', partCode:'PIE-2', length:200, width:41, platform:true, island:true, endAt:'start',
    curveEdge:1, trackSide:-1, curveR:718-12.5, curveFrom:200, detail:{slot:108, slotY:-3.4, postX:138, postY:0.6}, labelLength:true, labelDx:70},
  {id:'ISLAND_END_B2', cat:'platform', catalogNo:'23-175', partCode:'PIE-3', length:200, width:41, platform:true, island:true, endAt:'start',
    curveEdge:-1, trackSide:1, curveR:718-12.5, curveFrom:200, detail:{slot:108, slotY:-3.4, postX:138, postY:0.6}, labelLength:true, labelDx:70},
  // Curved island ends PIE-4L and PIE-4R (23-176): 248 mm, a straight half at
  // full width, then the taper of an R481-15° curve (its chord, 124.5 mm, is
  // the other half); detail positions measured from KATO's view.
  {id:'ISLAND_END_C1', cat:'platform', catalogNo:'23-176', partCode:'PIE-4L', length:248, width:41, platform:true, island:true, endAt:'start',
    curveEdge:1, trackSide:-1, curveR:481-12.5, curveFrom:124.5, detail:{slot:162, slotY:-1.4, postX:195.6, postY:0}, labelLength:true, labelDx:102},
  {id:'ISLAND_END_C2', cat:'platform', catalogNo:'23-176', partCode:'PIE-4R', length:248, width:41, platform:true, island:true, endAt:'start',
    curveEdge:-1, trackSide:1, curveR:481-12.5, curveFrom:124.5, detail:{slot:162, slotY:-1.4, postX:195.6, postY:0}, labelLength:true, labelDx:102},
];
