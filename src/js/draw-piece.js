function drawPiece(g, type, style){
  const segs = pieceGraphics(type);
  // Pit ring first, as a background.
  appendTurntableRing(g, type);
  // Before the translucent roadbed, so they show through.
  appendGirderUnderBeams(g, type); // first: under every other part
  appendChordFrameUnderChords(g, type);
  appendGirderCrossBeams(g, type);
  appendGirderRailChords(g, type);
  // A tied straight's edge is as thick as its end half tie and grows inward:
  // its outer face stays where the usual edge line's is.
  const connectorCat = type.cat==='turntableConnector' || type.cat==='turntableConnectorCurve';
  // Roadbed double straights and curves (viaducts included, not the bridges)
  // take the single piece's tied edge and run-on, both tracks at once, as the
  // crossover does. Only once tied: tiedEdge and endExt also need `ties`.
  const tiedDouble = type.cat==='dstraight' && !type.bridgeStyle;
  const tiedDoubleCurve = type.cat==='dcurve';
  const tiedEdge = type.ties && !type.noRoadbed && (type.cat==='straight' || type.cat==='curve' || type.cat==='crossover' || connectorCat || tiedDouble || tiedDoubleCurve || type.cat==='widener' || type.cat==='taper') && !style.nonScaling;
  const maskedEdge = !!type.wedgeSide || connectorCat || type.cat==='widener'; // non-rectangular outlines: thin outline plus a clipped inward band
  const tiedMultiEdge = type.ties && (type.cat==='turnout' || type.cat==='wye' || type.cat==='crossing') && !style.nonScaling;
  const baseEdgeW = style.roadbedStrokeW!==undefined ? style.roadbedStrokeW : 1;
  if(type.noRoadbed){
    // No roadbed (S186T: open deck, ties on the girders). An invisible fill
    // keeps the piece clickable; selection shows as an outline.
    appendRoadbed(g, segs, 'transparent', 'none', {strokeWidth: style.roadbedStrokeW, nonScaling: style.nonScaling});
  } else if(tiedMultiEdge) appendTrimmedTurnoutRoadbed(g, type, segs, style, baseEdgeW);
  else appendRoadbed(g, segs, style.roadbedFill, (tiedEdge && !maskedEdge) ? 'none' : style.roadbedStroke,
    {strokeWidth: style.roadbedStrokeW, nonScaling: style.nonScaling,
      fillOpacity: type.bridgeStyle==='girder' ? (type.roadbedOpacity ?? 0.5) : undefined});
  // Under the edge band, so joins still show. The ties toggle hides it with
  // the ties, leaving the bare roadbed and rails.
  appendSlab(g, type, style.ties);
  appendPitSlab(g, type);
  appendPlatformRoof(g, type, style.ties);
  appendPlatformEnd(g, type, style.ties);
  appendPlatformCurvedEnd(g, type, style.ties);
  appendPlatformSlab(g, type, style.ties);
  if(tiedEdge && maskedEdge){
    // The S60's tapered outline: its thin outline stays, and the rest of the
    // thick edge is the same outline stroked, clipped to inside the roadbed.
    const rb = segs[0].roadbed;
    g.appendChild(clipTo(el('path', {d:rb, fill:'none', stroke:style.roadbedStroke, 'stroke-width':TIE_W}), rb));
  } else if(tiedEdge){
    const w = baseEdgeW/2 + TIE_W/2, inset = w/2 - baseEdgeW/2;
    if(type.cat==='curve' || tiedDoubleCurve){
      // The roadbed band offset inward by `inset`: arcs pulled in, and each
      // end line moved along its tangent (so it meets each arc a little further in).
      // A double curve's band is both tracks wide about its centreline.
      const {angle, hand} = type, R = tiedDoubleCurve ? (type.radiusInner+type.radiusOuter)/2 : type.radius;
      const hw = tiedDoubleCurve ? (type.radiusOuter-type.radiusInner)/2 + ROADBED_HALF : ROADBED_HALF;
      const ro = R+hw-inset, ri = R-hw+inset;
      const a = r=>Math.asin(inset/r)*180/Math.PI, sweep = hand==='L' ? 1 : 0;
      const P = (t, r)=>offsetArcPoint(R, hand, t, r);
      const os = P(a(ro), ro), oe = P(angle-a(ro), ro), ie = P(angle-a(ri), ri), is = P(a(ri), ri);
      g.appendChild(el('path',{d:`M${os.x},${os.y} A${ro},${ro} 0 0,${sweep} ${oe.x},${oe.y} L${ie.x},${ie.y} A${ri},${ri} 0 0,${1-sweep} ${is.x},${is.y} Z`,
        fill:'none', stroke:style.roadbedStroke, 'stroke-width':w}));
    } else if(type.expansion){
      // Each half gets the usual tied edge all round, so their inner ends show
      // as a seam, or as the ends of the halves once apart; the strip between
      // has a plain edge along each side.
      const L = type.length, H = EXPANSION_HALF, hh = ROADBED_HALF, S = EXPANSION_STRIP_HALF;
      [0, L-H].forEach(x=>g.appendChild(el('rect',{x:x+inset, y:-hh+inset, width:H-2*inset, height:2*(hh-inset),
        fill:'none', stroke:style.roadbedStroke, 'stroke-width':w})));
      if(L > 2*H) g.appendChild(el('path',{d:`M${H},${-S}H${L-H}M${H},${S}H${L-H}`,
        fill:'none', stroke:style.roadbedStroke, 'stroke-width':baseEdgeW}));
    } else {
      const L = type.length, hh = type.cat==='taper' ? TRAM_HALF : (type.cat==='crossover' || tiedDouble) ? type.spacing/2 + ROADBED_HALF : ROADBED_HALF;
      g.appendChild(el('rect',{x:inset, y:-hh+inset, width:L-2*inset, height:2*(hh-inset),
        fill:'none', stroke:style.roadbedStroke, 'stroke-width':w}));
    }
  }
  appendStreetSurface(g, type, style, style.ties);
  // Its outline again, over the surface: printing up to the edge would cover the
  // inner half of it, and which half of a join's line survives would depend on
  // which piece was drawn last, so the same join could sit a little to either side.
  if(isStreetTrack(type) || type.roadPlate) g.appendChild(el('path', {d:segs[0].roadbed, fill:'none', stroke:style.roadbedStroke, 'stroke-width':baseEdgeW,
    ...(style.nonScaling ? {'vector-effect':'non-scaling-stroke'} : {})}));
  appendViaductDeck(g, type);
  // Before the chords, which sit over it.
  appendTurntableWing(g, type, style);
  appendTurntableCabin(g, type);
  // Before the rails: end caps would otherwise paint over the rail tips and
  // read as a break.
  appendBridgeStructure(g, type);
  // Half the roadbed edge's width: what the end ties and rails extend by.
  const endExt = type.ties && !type.noRoadbed && (type.cat==='straight' || type.cat==='curve' || type.cat==='turnout' || type.cat==='wye' || type.cat==='crossover' || type.cat==='crossing' || tiedDouble || tiedDoubleCurve || type.cat==='widener' || type.cat==='taper')
    ? (style.nonScaling ? 0 : (style.roadbedStrokeW!==undefined ? style.roadbedStrokeW : 1)/2) : 0;
  appendTies(g, type, endExt, style.ties);
  appendSuperelevationDot(g, type);
  appendRerailerMarker(g, type);
  appendGirderBoatGuide(g, type, style);
  appendExpansionVane(g, type, style.worldRot);
  // A ratio of the context's base width.
  const railW = (style.railWidth || RAIL_WIDTH_DEFAULT)
    * ((type.railWidth || RAIL_WIDTH_DEFAULT) / RAIL_WIDTH_DEFAULT);
  const railVE = style.nonScaling ? {'vector-effect':'non-scaling-stroke'} : {};
  // The rails' run-on past each end, to the edge's outer face (`endExt`).
  let runOn = '';
  if(endExt && type.cat==='crossing'){
    const L = type.length, P = getPorts(type), A = P[3], B_ = P[2];
    const dl = Math.hypot(B_.x-A.x, B_.y-A.y), dx = (B_.x-A.x)/dl, dy = (B_.y-A.y)/dl;
    runOn = `M${-endExt} ${-RAIL_OFF}H0M${-endExt} ${RAIL_OFF}H0M${L} ${-RAIL_OFF}H${L+endExt}M${L} ${RAIL_OFF}H${L+endExt}`;
    [-RAIL_OFF, RAIL_OFF].forEach(v=>{
      const ox = -v*dy, oy = v*dx;
      runOn += `M${A.x+ox-endExt*dx} ${A.y+oy-endExt*dy}L${A.x+ox} ${A.y+oy}M${B_.x+ox} ${B_.y+oy}L${B_.x+ox+endExt*dx} ${B_.y+oy+endExt*dy}`;
    });
  } else if(endExt && (type.cat==='widener' || type.cat==='taper')){
    // Every end meets its port square on, so each rail runs straight on.
    getPorts(type).forEach(pt=>{ const e = pt.heading===0 ? endExt : -endExt;
      [-RAIL_OFF, RAIL_OFF].forEach(v=>{ runOn += `M${pt.x} ${pt.y+v}H${pt.x+e}`; }); });
  } else if(endExt && (type.cat==='crossover' || tiedDouble)){
    const L = type.length, S = type.spacing;
    [-S/2-RAIL_OFF, -S/2+RAIL_OFF, S/2-RAIL_OFF, S/2+RAIL_OFF].forEach(y=>{ runOn += `M${-endExt} ${y}H0M${L} ${y}H${L+endExt}`; });
  } else if(endExt && (type.cat==='wye' || type.cat==='turnout')){
    // The throat (and a turnout's through end) straight on; each curved route
    // along its own end heading.
    runOn = `M${-endExt} ${-RAIL_OFF}H0M${-endExt} ${RAIL_OFF}H0`;
    const routes = type.cat==='wye' ? ['L','R'].map(h=>wyeBranchFrame(type, h)) : [turnoutDivergeFrame(type)];
    if(type.cat==='turnout'){ const L = type.throughLength; runOn += `M${L} ${-RAIL_OFF}H${L+endExt}M${L} ${RAIL_OFF}H${L+endExt}`; }
    routes.forEach(br=>[-RAIL_OFF, RAIL_OFF].forEach(v=>{
      const a = br.at(br.total, 0, v), b = br.at(br.total, endExt, v);
      runOn += `M${a.x} ${a.y}L${b.x} ${b.y}`;
    }));
  } else if(endExt && (type.cat==='curve' || tiedDoubleCurve)){
    // Each rail along its own arc's tangent; a double curve's tracks sit either
    // side of the centreline.
    const {angle, hand} = type, R = tiedDoubleCurve ? (type.radiusInner+type.radiusOuter)/2 : type.radius;
    const tracks = tiedDoubleCurve ? [type.radiusInner - R, type.radiusOuter - R] : [0];
    tracks.flatMap(c=>[c-RAIL_OFF, c+RAIL_OFF]).forEach(v=>{
      const a0 = curveFramePoint(R, hand, 0, -endExt, v), a1 = curveFramePoint(R, hand, 0, 0, v);
      const b0 = curveFramePoint(R, hand, angle, 0, v), b1 = curveFramePoint(R, hand, angle, endExt, v);
      runOn += `M${a0.x} ${a0.y}L${a1.x} ${a1.y}M${b0.x} ${b0.y}L${b1.x} ${b1.y}`;
    });
  } else if(endExt){
    const L = type.length;
    const nearD = type.cutEnd==='near' ? '' : `M${-endExt} ${-RAIL_OFF}H0M${-endExt} ${RAIL_OFF}H0`;
    const farD = (type.cutEnd==='far' || type.deadEnd) ? '' : `M${L} ${-RAIL_OFF}H${L+endExt}M${L} ${RAIL_OFF}H${L+endExt}`;
    runOn = nearD+farD;
  }
  const railStroke = {stroke:type.railColor || style.railColor, 'stroke-width':railW, fill:'none', ...railVE};
  if(endExt) g.appendChild(el('path',{d:runOn, ...railStroke}));
  segs.forEach(seg=>{
    seg.rails.forEach(rd=>g.appendChild(el('path',{d:rd, ...railStroke})));
    if(seg.fishplate){
      g.appendChild(el('path',{d:seg.fishplate, fill:'#b5824a', stroke:'#7a5628',
        'stroke-width':0.4, ...railVE}));
    }
  });
  if(type.latticeOverTrack) appendTrussLattice(g, type, bridgeChordYs(type),
    type.structureColor || BRIDGE_STEEL_COLOR, BRIDGE_LINE_T);
  appendFeederWires(g, type);
  appendCrossoverGap(g, type, railW);
  appendBumperStop(g, type);
  appendFeederSymbol(g, type, style.worldRot);
  // The part-code label last, on top of everything in the piece (the feeder
  // bolt, a bumper stop). style.worldRot: the piece's rotation on the canvas,
  // so text reads upright. Left out when the part-label mode says so; palette
  // icons and ghosts always have it.
  if(style.printedFlip!=null) appendPrintedLabel(g, type, style.printedFlip);
  else if(style.lengthLabel!==false) appendLengthLabel(g, type, style.worldRot);
  // A roadbed-less piece shows selection as a tint over its whole structure
  // (`selected`: a selected canvas piece, or a drag preview).
  if(type.noRoadbed && style.selected){
    segs.forEach(seg=>g.appendChild(el('path',{d:seg.roadbed, fill:SELECTION_BLUE, 'fill-opacity':0.3,
      stroke:SELECTION_BLUE, 'stroke-width':1, style:'pointer-events:none;'})));
  }
  return segs;
}

